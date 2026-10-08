import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createBackroomsScene,backroomsPlan,cellCenter,SECTORS} from '../scripts/generate-backrooms-scene.js';
import {validateDocument,duplicateDocument,createMapFromScene,createSceneFromMap} from '../src/domain/documents.js';
import {createWall,createFloor} from '../src/render/scene-objects.js';
import {disposeObject,recipeInstance} from '../src/render/asset-cache.js';
import {createSceneStore} from '../src/state/scene-store.js';
import {projectPresentation} from '../src/app/presentation.js';

const {assets}=JSON.parse(await readFile('public/assets/catalog.json','utf8'));
const scene=JSON.parse(await readFile('public/scenes/backrooms.json','utf8')),entities=Object.values(scene.layout.entities);

test('Backrooms are deterministic, editable and contain eight distinct connected sectors',()=>{
  assert.deepEqual(createBackroomsScene(assets),scene);validateDocument(scene);
  assert.equal(SECTORS.length,8);assert.equal(Object.keys(scene.cameraPresets).length,5);
  assert.equal(entities.filter(e=>e.illumination).length,8);assert.equal(scene.look.bloom.enabled,false);
  for(const e of entities){assert.equal(e.audience,'all');assert.equal(e.locked,false);if(e.assetRef)assert.ok(assets.some(a=>a.id===e.assetRef.id&&a.revision===e.assetRef.revision));}
  const {open}=backroomsPlan(),visited=new Set([0]),queue=[0];
  while(queue.length){const a=queue.shift();for(const edge of open){const [u,v]=edge.split(':').map(Number),b=u===a?v:v===a?u:null;if(b!==null&&!visited.has(b)){visited.add(b);queue.push(b);}}}
  assert.equal(visited.size,120,'every cell is reachable from every room');assert.ok(open.size>119,'alternative routes form loops');
  const area=entities.filter(e=>e.kind==='floor').reduce((sum,e)=>sum+e.width*e.length,0);assert.equal(area,36*30);
});

test('authored passages are physically open and every cell has a supporting floor',()=>{
  const walls=entities.filter(e=>e.kind==='wall'),wallObjects=walls.map(w=>createWall(w,[],walls)),floorObjects=entities.filter(e=>e.kind==='floor').map(createFloor);
  [...wallObjects,...floorObjects].forEach(o=>o.updateMatrixWorld(true));
  try{
    for(const edge of backroomsPlan().open){
      const [a,b]=edge.split(':').map(Number),[ax,az]=cellCenter(a%12,Math.floor(a/12)),[bx,bz]=cellCenter(b%12,Math.floor(b/12));
      // Cross the complete border with a 90 cm lane, including jamb clearance.
      const dx=(bx-ax)/3,dz=(bz-az)/3,mx=(ax+bx)/2,mz=(az+bz)/2;
      for(const side of [-.45,0,.45])for(const y of [.35,1.65]){
        const ray=new THREE.Raycaster(new THREE.Vector3(mx-dx*.5-dz*side,y,mz-dz*.5+dx*side),new THREE.Vector3(dx,0,dz),0,1);
        assert.equal(ray.intersectObjects(wallObjects,true).length,0,'blocked border '+edge);
      }
    }
    for(let z=0;z<10;z++)for(let x=0;x<12;x++){
      const [cx,cz]=cellCenter(x,z),hits=new THREE.Raycaster(new THREE.Vector3(cx,1,cz),new THREE.Vector3(0,-1,0),0,2).intersectObjects(floorObjects,true);
      assert.ok(hits.length&&Math.abs(hits[0].point.y)<1e-6,'floor '+x+','+z);
    }
  }finally{[...wallObjects,...floorObjects].forEach(o=>disposeObject(o));}
});

test('modular wall decoration, ceiling and fluorescent recipes have valid bounded geometry',async()=>{
  const kit=assets.filter(a=>a.id.startsWith('builtin-backrooms-'));assert.equal(kit.length,3);
  for(const a of kit){const recipe=JSON.parse(await readFile('public'+a.url,'utf8')),object=recipeInstance(recipe);object.updateMatrixWorld(true);
    try{const box=new THREE.Box3().setFromObject(object);assert.ok(Math.abs(box.min.y)<1e-6);assert.ok(box.getSize(new THREE.Vector3()).toArray().every((v,i)=>v>0&&Math.abs(v-a.bounds[i])<.002));assert.ok(object.children.length<=3,'merged material batches');}finally{disposeObject(object);}
  }
});

test('roof visibility, source editing, independent copies and map conversion preserve the labyrinth',()=>{
  const store=createSceneStore(scene),layer=Object.values(scene.layout.layers)[0],source=entities.find(e=>e.illumination);
  store.execute('layer.update',{id:layer.id,patch:{visible:false}});store.undo();assert.deepEqual(store.document,scene);store.redo();
  store.execute('entity.update',{id:source.id,patch:{illumination:{...source.illumination,intensity:60}}});
  for(const doc of [duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document))]){validateDocument(doc);assert.equal(Object.keys(doc.layout.entities).length,entities.length);assert.ok(Object.values(doc.layout.layers).some(l=>l.visible===false));}
  const projected=projectPresentation(store.document);validateDocument(projected);
  assert.equal(Object.keys(projected.layout.entities).length,entities.filter(e=>e.layerId!==layer.id).length);
  assert.ok(Object.values(projected.layout.entities).every(e=>e.layerId!==layer.id),'hidden ceiling is excluded from the projector');
  assert.equal(scene.layout.layers[layer.id].visible,true);assert.equal(source.illumination.intensity,45);
});
