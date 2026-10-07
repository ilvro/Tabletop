import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createChurchScene,CHURCH,CHURCH_APPROACH,churchApproachAt} from '../scripts/generate-church-scene.js';
import {validateDocument,duplicateDocument,createMapFromScene,createSceneFromMap} from '../src/domain/documents.js';
import {terrainHeightAt,isVisible,worldFootprint,pointInPolygon} from '../src/domain/geometry.js';
import {createSceneStore} from '../src/state/scene-store.js';
import {projectPresentation} from '../src/app/presentation.js';
import {EXAMPLE_SCENES,loadExampleScene} from '../src/data/example-scenes.js';
import {recipeInstance,disposeObject} from '../src/render/asset-cache.js';
import {createWall,createFloor,createDoor,applyTransform} from '../src/render/scene-objects.js';

const catalog=JSON.parse(await readFile('public/assets/catalog.json','utf8')).assets;
const scene=JSON.parse(await readFile('public/scenes/igreja-antiga.json','utf8'));
const entities=Object.values(scene.layout.entities),find=name=>entities.find(e=>e.name===name);
const ray=(object,p,d,far=100)=>{object.updateMatrixWorld(true);return new THREE.Raycaster(new THREE.Vector3(...p),new THREE.Vector3(...d),0,far).intersectObject(object,true);};

test('complete church is reproducible, self-contained and loads as independent editable gallery drafts',async()=>{
  assert.deepEqual(createChurchScene(catalog),scene);validateDocument(scene);
  assert.equal(Object.keys(scene.cameraPresets).length,10);assert.equal(Object.keys(scene.layout.groups).length,12);
  for(const e of entities){assert.equal(e.locked,false);assert.equal(e.audience,'all');if(e.assetRef)assert.equal(catalog.find(a=>a.id===e.assetRef.id)?.revision,e.assetRef.revision);}
  const card=EXAMPLE_SCENES.find(e=>e.id===CHURCH.id);assert.ok(card);
  assert.equal(card.preview,undefined,'cover is generated from the scene rather than a distributed image');
  const fetcher=async()=>({ok:true,json:async()=>structuredClone(scene)}),a=await loadExampleScene(CHURCH.id,{fetcher}),b=await loadExampleScene(CHURCH.id,{fetcher});
  assert.notEqual(a.id,b.id);assert.notEqual(a.id,scene.id);assert.equal(a.revision,0);
  assert.equal(Object.keys(a.layout.entities).length,entities.length);
  for(const doc of [a,b,duplicateDocument(scene),createSceneFromMap(createMapFromScene(scene)),projectPresentation(scene)]){
    validateDocument(doc);const records=Object.values(doc.layout.entities);
    assert.equal(records.filter(e=>e.illumination).length,11);assert.equal(records.filter(e=>e.lightingZone).length,6);
    for(const e of records)if(e.surfaceId)assert.ok(doc.layout.entities[e.surfaceId],e.name);
  }
});

test('valley route rises to the forecourt, has clear tree margins and leaves the temple above the ravine',()=>{
  const terrain=find('Vale rochoso · caminho ascendente esculpido');let previous=-Infinity;
  for(let i=1;i<CHURCH_APPROACH.length;i++)for(let step=0;step<=12;step++){
    const a=CHURCH_APPROACH[i-1],b=CHURCH_APPROACH[i],t=step/12,x=a[0]+t*(b[0]-a[0]),z=a[2]+t*(b[2]-a[2]),h=terrainHeightAt(terrain,[x,0,z]);
    assert.ok(Math.abs(h-(a[1]+t*(b[1]-a[1])))<.8,`route height at ${x},${z}: ${h}`);
    assert.ok(h>previous-.22,'no abrupt downward step in the ascent');previous=h;
  }
  for(const tree of entities.filter(e=>e.name==='Árvore seca do vale')){const [x,,z]=tree.transform.position;assert.ok(churchApproachAt(x,z).distance>=4.5);assert.ok(!entities.filter(e=>e.kind==='floor').some(f=>pointInPolygon([x,z],worldFootprint(f,.5))),'no tree inside buildings or on circulation slabs');}
  assert.ok(terrainHeightAt(terrain,[-12,0,-10])-terrainHeightAt(terrain,[22,0,23])>16);
  for(const x of [-20,-12,-4])for(const z of [-24,-10,4])assert.ok(terrainHeightAt(terrain,[x,0,z])<CHURCH.center[1]-.5);
});

test('stairs connect real levels and all door centers are voids in their actual host walls',()=>{
  const stairs=entities.filter(e=>e.kind==='stairs'&&e.fromLevelId);assert.equal(stairs.length,4);
  for(const stair of stairs){const base=scene.layout.levels[stair.fromLevelId].elevation,top=scene.layout.levels[stair.toLevelId].elevation;assert.equal(stair.transform.position[1],base);assert.ok(Math.abs(base+stair.height-top)<1e-8);}
  const doors=entities.filter(e=>e.kind==='door');assert.ok(doors.length>=10);
  for(const door of doors){
    const wall=scene.layout.entities[door.wallId],object=createWall(wall,doors.filter(d=>d.wallId===wall.id));applyTransform(object,wall.transform);
    try{const q=new THREE.Quaternion(...wall.transform.rotation),p=new THREE.Vector3(door.offset,1.4,2).applyQuaternion(q).add(new THREE.Vector3(...wall.transform.position)),d=new THREE.Vector3(0,0,-1).applyQuaternion(q);assert.equal(ray(object,p.toArray(),d.toArray(),4).length,0,door.name);}finally{disposeObject(object);}
  }
});

test('a one metre footprint can pass beside the raised altar through the sacristy door',async()=>{
  const altar=find('Presbitério · patamar do ritual'),wall=find('Cabeceira · parede do altar'),door=find('Passagem para a sacristia');
  const obstacles=[createFloor(altar),createWall(wall,[door]),createDoor(door,wall)];
  const asset=catalog.find(a=>a.id==='builtin-church-clustered-pier'),recipe=JSON.parse(await readFile('public'+asset.url,'utf8'));
  for(const record of entities.filter(e=>e.assetRef?.id===asset.id)){const o=recipeInstance(recipe);applyTransform(o,record.transform);obstacles.push(o);}
  try{for(const x of [5.6,6.1,6.6])for(const height of [.1,.8,1.7])for(const object of obstacles)assert.equal(ray(object,[CHURCH.center[0]+x,CHURCH.center[1]+height,CHURCH.center[2]-14.5],[0,0,-1],4).length,0,'one metre route clears raised slab, piers, host wall and open leaf');}
  finally{obstacles.forEach(disposeObject);}
});

test('balcony supports coincide with curved slabs and infills retain true pointed window openings',async()=>{
  const balconies=entities.filter(e=>e.assetRef?.id==='builtin-church-curved-balcony'),supports=entities.filter(e=>e.name==='Balcão curvo · apoio no contorno real');assert.equal(balconies.length,6);
  const asset=catalog.find(a=>a.id==='builtin-church-curved-balcony'),recipe=JSON.parse(await readFile('public'+asset.url,'utf8'));
  for(let i=0;i<6;i++){
    const balcony=recipeInstance(recipe),support=createFloor(supports[i]);applyTransform(balcony,balconies[i].transform);applyTransform(support,supports[i].transform);support.updateMatrixWorld(true);
    try{for(const [x,z]of [[0,.2],[0,1.1],[1,.6],[-1,.6]]){const p=new THREE.Vector3(x,1,z).applyMatrix4(support.matrixWorld).toArray(),hits=ray(balcony,p,[0,-1,0],2);assert.ok(hits.length>0);assert.ok(Math.abs(hits[0].point.y-(supports[i].transform.position[1]-.005))<1e-4,'support matches curved top');}
      const outside=new THREE.Vector3(2,1,1.5).applyMatrix4(support.matrixWorld).toArray();assert.equal(ray(support,outside,[0,-1,0],2).length,0,'no fictitious rectangular support');
    }finally{disposeObject(balcony);disposeObject(support);}
  }
  const spandrel=catalog.find(a=>a.id==='builtin-church-window-spandrel'),object=recipeInstance(JSON.parse(await readFile('public'+spandrel.url,'utf8')));
  try{assert.equal(ray(object,[0,1,2],[0,0,-1],4).length,0);assert.equal(ray(object,[0,3,2],[0,0,-1],4).length,0);assert.ok(ray(object,[1.1,3,2],[0,0,-1],4).length);assert.ok(ray(object,[0,4.4,2],[0,0,-1],4).length);}finally{disposeObject(object);}
});

test('roof hiding and light edits are ordinary undoable changes and preserve public camera presets',()=>{
  const store=createSceneStore(scene),layer=Object.values(scene.layout.layers).find(l=>l.name.startsWith('Coberturas')),source=entities.find(e=>e.illumination),cameras=structuredClone(scene.cameraPresets);
  store.execute('layer.update',{id:layer.id,patch:{visible:false}});
  const roof=entities.filter(e=>e.layerId===layer.id);assert.ok(roof.length>=18);assert.ok(roof.every(e=>!isVisible(store.document,e)));
  assert.ok(isVisible(store.document,find('Nave · piso de combate')));store.undo();assert.deepEqual(store.document,scene);
  store.execute('entity.update',{id:source.id,patch:{illumination:{...source.illumination,intensity:90}},snap:false});store.undo();assert.deepEqual(store.document,scene);store.redo();
  assert.deepEqual(store.document.cameraPresets,cameras);assert.equal(store.document.layout.entities[source.id].illumination.intensity,90);
});
