import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {recipeInstance,disposeObject} from '../src/render/asset-cache.js';
import {prepareRockSculpt,applyRockStamp,rockBrushStamp,sculptRockInstance,sculptFootprint} from '../src/render/rock-sculpt.js';
import {rockDefaults} from '../src/domain/rocks.js';
import {assertRockSculpt,ROCK_SCULPT_TRIANGLES} from '../src/domain/rock-sculpt.js';
import {createScene,createEntity,validateDocument,duplicateDocument,createMapFromScene,createSceneFromMap} from '../src/domain/documents.js';
import {createSceneStore} from '../src/state/scene-store.js';
import {projectPresentation} from '../src/app/presentation.js';
const load=async()=>JSON.parse(await readFile('public/assets/models/mountain-cliff-face.json','utf8'));
const entity=()=>createEntity('prop',{assetRef:{id:'builtin-mountain-cliff-face',revision:1},rockShape:rockDefaults('builtin-mountain-cliff-face')});
const positions=meshes=>meshes.map(m=>m.geometry.attributes.position.array.slice());

test('surface brushes deform vertical faces and peaks locally, remain closed, and replay the same geometry',async()=>{
  const recipe=await load(),record=entity(),instance=recipeInstance(recipe,record.rockShape),root=new THREE.Group();root.add(instance);
  const meshes=prepareRockSculpt(root);assert.ok(meshes.reduce((n,m)=>n+m.geometry.index.count/3,0)<=ROCK_SCULPT_TRIANGLES);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,3,10),new THREE.Vector3(0,0,-1));root.updateMatrixWorld(true);const hit=ray.intersectObject(root,true)[0];assert.ok(hit);
  const stamp=rockBrushStamp(record,hit.point.toArray(),[0,0,1],{mode:'push',radius:1.2,strength:.3,hardness:0}),before=positions(meshes);
  assert.ok(applyRockStamp(meshes,stamp));const after=positions(meshes);assert.notDeepEqual(before,after);
  let changed=0,unchanged=0;for(let m=0;m<meshes.length;m++)for(let i=0;i<after[m].length;i+=3){if(Math.abs(after[m][i+2]-before[m][i+2])>1e-5)changed++;else unchanged++;assert.ok(Number.isFinite(after[m][i]));}
  assert.ok(changed>5&&unchanged>changed,'local brush changes some vertices, not the whole cliff');
  const replay=sculptRockInstance(recipeInstance(recipe,record.rockShape),{stamps:[stamp]});assert.deepEqual(positions(prepareRockSculpt(replay)),after);
  for(const mesh of meshes){const edges=new Map(),idx=mesh.geometry.index.array;for(let i=0;i<idx.length;i+=3)for(let j=0;j<3;j++){const a=idx[i+j],b=idx[i+(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)??0)+1);}assert.ok([...edges.values()].every(n=>n===2));}
  // Raising a chosen peak uses world height instead of changing the global seed.
  const top=new THREE.Raycaster(new THREE.Vector3(0,12,0),new THREE.Vector3(0,-1,0)).intersectObject(root,true)[0];
  const lower=rockBrushStamp(record,top.point.toArray(),[0,1,0],{mode:'lower',radius:2,strength:.3});const yBefore=positions(meshes);assert.ok(applyRockStamp(meshes,lower));assert.ok(meshes.some((m,j)=>m.geometry.attributes.position.array.some((v,i)=>i%3===1&&v<yBefore[j][i]-1e-5)));
  assert.equal(record.rockShape.seed,137);assert.ok(sculptFootprint(root).every(Number.isFinite));disposeObject(root);disposeObject(replay);
});

test('brush metrics respect rotated nonuniform scale; smoothing/flattening stay finite and preserve material/transform',async()=>{
  const record=entity();record.transform={position:[4,2,-3],rotation:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2).toArray(),scale:[2,3,.5]};
  const local=new THREE.Vector3(0,3,1),world=local.clone().multiply(new THREE.Vector3(...record.transform.scale)).applyQuaternion(new THREE.Quaternion(...record.transform.rotation)).add(new THREE.Vector3(...record.transform.position));
  const normal=[1,0,0],stamp=rockBrushStamp(record,world.toArray(),normal,{mode:'push',radius:1,strength:.1});
  assert.ok(new THREE.Vector3(...stamp.center).distanceTo(local)<1e-6);assert.deepEqual(stamp.radius,[.5,1/3,2]);
  const displacement=new THREE.Vector3(...stamp.delta).multiply(new THREE.Vector3(...record.transform.scale)).applyQuaternion(new THREE.Quaternion(...record.transform.rotation));assert.ok(displacement.distanceTo(new THREE.Vector3(.1,0,0))<1e-6);
  const root=new THREE.Group();root.add(recipeInstance(await load()));const meshes=prepareRockSculpt(root),originalMaterial=meshes[0].material;
  for(const mode of ['push','pull','raise','lower','smooth','flatten']){const s=rockBrushStamp(entity(),[0,3,1],[0,0,1],{mode,radius:2,strength:.5,hardness:.5});applyRockStamp(meshes,s);assert.ok(meshes.every(m=>m.geometry.attributes.position.array.every(Number.isFinite)));}
  assert.equal(meshes[0].material,originalMaterial);disposeObject(root);
});

test('sculpt edits are atomic, survive history/maps/JSON/projection and leave parameters/material/transform unchanged',()=>{
  const record=entity(),stamp=rockBrushStamp(record,[0,3,1],[0,0,1],{mode:'push',radius:1,strength:.1}),scene=createScene();scene.layout.entities[record.id]=record;const store=createSceneStore(scene),before=structuredClone(scene);
  store.execute('entity.update',{id:record.id,patch:{rockSculpt:{stamps:[stamp]}}});assert.deepEqual(store.document.layout.entities[record.id].rockShape,record.rockShape);assert.deepEqual(store.document.layout.entities[record.id].transform,record.transform);assert.deepEqual(store.document.layout.entities[record.id].material,record.material);
  store.undo();assert.deepEqual(store.document,before);store.redo();
  for(const doc of [JSON.parse(JSON.stringify(store.document)),duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document)),projectPresentation(store.document)]){validateDocument(doc);assert.deepEqual(Object.values(doc.layout.entities)[0].rockSculpt.stamps,[stamp]);}
  for(const sculpt of [{stamps:[{...stamp,delta:[NaN,0,0]}]},{stamps:[{...stamp,normal:[0,0,0]}]},{stamps:[{...stamp,radius:[-1,1,1]}]},{stamps:Array(513).fill(stamp)},{stamps:[{...stamp,untrusted:'x'}]}]) {const before=structuredClone(store.document);assert.throws(()=>store.execute('entity.update',{id:record.id,patch:{rockSculpt:sculpt}}));assert.deepEqual(store.document,before);}
  assert.throws(()=>assertRockSculpt({stamps:[{...stamp,hardness:2}]}));assert.throws(()=>store.execute('entity.update',{id:record.id,patch:{assetRef:{id:'builtin-crate',revision:1}}}));
  store.execute('entity.update',{id:record.id,patch:{rockSculpt:{stamps:[]}}});store.undo();assert.equal(store.document.layout.entities[record.id].rockSculpt.stamps.length,1);
});

test('cached sculpt templates return independent geometry/materials and prune without damaging live instances',async()=>{
  const {createAssetCache}=await import('../src/render/asset-cache.js'),recipe=await load(),cache=createAssetCache(),record={id:'sculpt-test',revision:1,type:'recipe',url:'data:application/json,'+encodeURIComponent(JSON.stringify(recipe))};
  const stamp=rockBrushStamp(entity(),[0,3,1],[0,0,1],{mode:'push',radius:2,strength:.2}),sculpt={stamps:[stamp]};
  const a=await cache.createInstance(record,rockDefaults('builtin-mountain-cliff-face'),null,sculpt),b=await cache.createInstance(record,rockDefaults('builtin-mountain-cliff-face'),null,sculpt);
  const am=prepareRockSculpt(a),bm=prepareRockSculpt(b);assert.deepEqual(positions(am),positions(bm));assert.notEqual(am[0].geometry,bm[0].geometry);assert.notEqual(am[0].material,bm[0].material);
  const before=positions(bm);applyRockStamp(am,{...stamp,mode:'pull',delta:stamp.delta.map(v=>-v)});assert.deepEqual(positions(bm),before);
  cache.prune([]);assert.deepEqual(positions(bm),before);disposeObject(a);disposeObject(b);cache.destroy();
});
