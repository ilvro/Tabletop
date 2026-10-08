import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import * as THREE from 'three';
import {createHouseScene} from '../scripts/generate-house-scene.js';
import {EXAMPLE_SCENES,loadExampleScene} from '../src/data/example-scenes.js';
import {validateDocument,createMapFromScene,createSceneFromMap} from '../src/domain/documents.js';
import {createSceneStore} from '../src/state/scene-store.js';
import {projectPresentation} from '../src/app/presentation.js';
import {recipeInstance,disposeObject} from '../src/render/asset-cache.js';
import {createWall,createDoor,createFloor,applyTransform} from '../src/render/scene-objects.js';

const {assets}=JSON.parse(await readFile('public/assets/catalog.json','utf8'));
const original=JSON.parse(await readFile('public/scenes/casa-de-bairro.json','utf8'));
const records=Object.values(original.layout.entities);

test('gallery replaces retired demos with a reproducible, self-contained residential scene',async()=>{
  assert.deepEqual(EXAMPLE_SCENES.map(e=>e.id).sort(),['backrooms','casa-de-bairro','igreja-antiga','snowy-mountain-pass']);
  assert.deepEqual((await readdir('public/scenes')).filter(f=>f.endsWith('.json')).sort(),EXAMPLE_SCENES.map(e=>e.id+'.json').sort());
  assert.deepEqual(createHouseScene(assets),original);validateDocument(original);
  assert.equal(Object.keys(original.cameraPresets).length,5);assert.equal(records.filter(e=>e.illumination).length,8);
  for(const e of records){assert.equal(e.locked,false);assert.equal(e.audience,'all');if(e.assetRef)assert.equal(assets.find(a=>a.id===e.assetRef.id)?.revision,e.assetRef.revision);}
  assert.equal(original.look.bloom.enabled,false);assert.equal(original.look.volumetricFog.enabled,false);
  assert.equal(Object.keys(original.tokens).length,0);
});

test('residential recipes have finite metric bounds and usable counter tops',async()=>{
  for(const a of assets.filter(a=>a.id.startsWith('builtin-house-'))){
    const object=recipeInstance(JSON.parse(await readFile('public'+a.url,'utf8')));object.updateMatrixWorld(true);
    try{
      const bounds=new THREE.Box3().setFromObject(object);assert.ok(Math.abs(bounds.min.y)<1e-5,a.id);
      assert.ok(bounds.getSize(new THREE.Vector3()).toArray().every((v,i)=>Number.isFinite(v)&&v>0&&Math.abs(v-a.bounds[i])<.002),a.id);
      if(a.supportHeight){const hit=new THREE.Raycaster(new THREE.Vector3(.1,3,.1),new THREE.Vector3(0,-1,0)).intersectObject(object,true)[0];assert.ok(Math.abs(hit.point.y-a.supportHeight)<.002,a.id);}
      if(a.id.endsWith('-plant'))assert.ok(bounds.max.y<1.6,'indoor plant fits below windows/ceiling');
    }finally{disposeObject(object);}
  }
});

test('door openings and furnished routes connect all rooms without solid walls or props across passages',async()=>{
  const walls=records.filter(e=>e.kind==='wall'),openings=records.filter(e=>['door','window'].includes(e.kind)),objects=[];
  for(const e of records){let object;
    if(e.kind==='wall')object=createWall(e,openings.filter(o=>o.wallId===e.id),walls);
    else if(e.kind==='door')object=createDoor(e,original.layout.entities[e.wallId],e.initialAngle);
    else if(e.kind==='floor')object=createFloor(e);
    else if(e.kind==='prop'){const asset=assets.find(a=>a.id===e.assetRef.id);object=recipeInstance(JSON.parse(await readFile('public'+asset.url,'utf8')));applyTransform(object,e.transform);}
    if(object){object.userData.name=e.name;object.updateMatrixWorld(true);objects.push(object);}
  }
  try{
    const cast=(from,to)=>{const start=new THREE.Vector3(...from),end=new THREE.Vector3(...to),delta=end.sub(start);return new THREE.Raycaster(start,delta.clone().normalize(),.001,delta.length()-.001).intersectObjects(objects,true);};
    for(const d of openings.filter(o=>o.kind==='door')){
      const w=original.layout.entities[d.wallId],m=new THREE.Matrix4().compose(new THREE.Vector3(...w.transform.position),new THREE.Quaternion(...w.transform.rotation),new THREE.Vector3(...w.transform.scale));
      for(const dx of [-.3,0,.3]){const a=new THREE.Vector3(d.offset+dx,.55,-.22).applyMatrix4(m),b=new THREE.Vector3(d.offset+dx,.55,.22).applyMatrix4(m);const hits=cast(a.toArray(),b.toArray());assert.equal(hits.length,0,d.name+' '+dx+' '+hits.map(h=>{let o=h.object;while(o.parent)o=o.parent;return o.userData.name+' at '+h.point.toArray();}).join('; '));}
    }
    // 70 cm wide token lanes through the center hall and into every functional room.
    const routes=[
      [[-2,9.3],[-2,6]], [[-2,6],[-2,-8.3]],
      [[-2,-4.75],[-4.6,-4.75]], [[-2,-.35],[-5.3,-.35]],
      [[-2,-4.9],[.2,-4.9]], [[-2,-.4],[1.5,-.4]],
      [[2.8,-.4],[2.8,-4.5]], [[2.8,-4.5],[2.8,-8.3]],
      [[3,3.4],[5.3,3.4]], [[5.3,3.4],[5.3,6.7]], [[5.3,6.7],[7,6.7]], [[7,6.7],[7,10.5]],
    ];
    for(const [a,b]of routes)for(const side of [-.35,0,.35])for(const y of [.8,1.4]){
      const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),offset=[-dz/length*side,dx/length*side];
      const hits=cast([a[0]+offset[0],y,a[1]+offset[1]],[b[0]+offset[0],y,b[1]+offset[1]]);
      const label=hit=>{let o=hit.object;while(o.parent)o=o.parent;return o.userData.name;};
      assert.equal(hits.length,0,JSON.stringify({a,b,side,y,obstacles:hits.map(label)}));
    }
    for(const e of records.filter(e=>e.surfaceId&&e.kind==='prop'&&original.layout.entities[e.surfaceId].supportHeight)){
      const host=original.layout.entities[e.surfaceId];assert.ok(Math.abs(e.transform.position[1]-host.transform.position[1]-host.supportHeight*host.transform.scale[1])<.001,e.name+' rests on its support');
    }
  }finally{objects.forEach(o=>disposeObject(o));}
});

test('house copies, door history, map conversion and projection preserve editable content',async()=>{
  const copy=await loadExampleScene('casa-de-bairro',{fetcher:async()=>({ok:true,json:async()=>structuredClone(original)})});
  assert.notEqual(copy.id,original.id);assert.equal(copy.revision,0);
  const store=createSceneStore(copy),door=Object.values(copy.layout.entities).find(e=>e.kind==='door');
  store.execute('door.setAngle',{id:door.id,angle:0});assert.equal(store.document.sessionState.doors[door.id],0);store.undo();assert.deepEqual(store.document,copy);store.redo();
  for(const doc of [JSON.parse(JSON.stringify(store.document)),createSceneFromMap(createMapFromScene(store.document)),projectPresentation(store.document)]){
    validateDocument(doc);assert.equal(Object.keys(doc.layout.entities).length,records.length);assert.ok(Object.values(doc.layout.layers).some(l=>l.name.startsWith('Coberturas')));
  }
  assert.ok(Object.keys(copy.layout.entities).every(id=>!original.layout.entities[id]));
});
