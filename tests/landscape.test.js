import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createEntity, createScene, createToken, validateDocument, duplicateDocument, createMapFromScene, createSceneFromMap } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { projectPresentation } from '../src/app/presentation.js';
import { VEGETATION_ASSETS } from '../src/domain/landscape.js';
import { surfacePatch, coverageDefaults } from '../src/domain/materials.js';
import { terrainSnow, snowWeight } from '../src/domain/snow.js';
import { supportHeightAt, worldFootprint, footprintsOverlap, isSupport } from '../src/domain/geometry.js';
import { resampleTerrain, resizeTerrain } from '../src/authoring/terrain.js';
import { proposeVegetation } from '../src/authoring/vegetation.js';
import { createArchGeometry, createFoliageGeometry } from '../src/render/landscape-geometry.js';
import { createWater, updateWater } from '../src/render/water.js';
import { createTerrain, createFloor } from '../src/render/scene-objects.js';
import { recipeInstance, disposeObject } from '../src/render/asset-cache.js';
import { addPhysicalSnow, clearPhysicalSnow, createExposureTest, snowOccluders } from '../src/render/physical-snow.js';
import { createSurfaceLibrary, applySurfaceTextures } from '../src/render/surface-materials.js';
const catalog=JSON.parse(await readFile(new URL('../public/assets/catalog.json',import.meta.url),'utf8')).assets;
const ray=(object,origin,direction)=> {object.updateMatrixWorld(true);return new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction)).intersectObject(object,true);};
const snowy=()=>({...coverageDefaults(),physicalThickness:.3,variation:0});

test('curved arches have a real passage, botanical blades vary deterministically, and new recipes retain metric bounds with few draw calls',async()=>{
  const arch=new THREE.Mesh(createArchGeometry(),new THREE.MeshStandardMaterial({side:THREE.DoubleSide}));
  try {assert.equal(ray(arch,[0,.5,3],[0,0,-1]).length,0);assert.ok(ray(arch,[0,1.2,3],[0,0,-1]).length);}finally{disposeObject(arch);}
  for(const style of ['needles','fern','grass']) {const a=createFoliageGeometry({style,seed:23}),b=createFoliageGeometry({style,seed:23}),c=createFoliageGeometry({style,seed:24});assert.deepEqual(a.attributes.position.array,b.attributes.position.array);assert.notDeepEqual(a.attributes.position.array,c.attributes.position.array);assert.ok(a.attributes.position.array.every(Number.isFinite));for(const g of [a,b,c])g.dispose();}
  for(const id of VEGETATION_ASSETS) {
    const asset=catalog.find(a=>a.id===id),recipe=JSON.parse(await readFile(new URL(`../public${asset.url}`,import.meta.url),'utf8'));
    const a=recipeInstance(recipe,null,asset.bounds,11),b=recipeInstance(recipe,null,asset.bounds,12);
    try {assert.ok(a.children.length<=2);assert.notDeepEqual(a.children[0].geometry.attributes.position.array,b.children[0].geometry.attributes.position.array);const box=new THREE.Box3().setFromObject(a),size=box.getSize(new THREE.Vector3()).toArray();assert.ok(Math.abs(box.min.y)<1e-6);size.forEach((v,i)=>assert.ok(Math.abs(v-asset.bounds[i])<1e-5));}finally{disposeObject(a);disposeObject(b);}
  }
});

test('vegetation proposals avoid constructions/water and neighbours, remain deterministic and individually editable after one undoable acceptance',()=>{
  const scene=createScene(),terrain=createEntity('terrain',{width:35,length:35,segments:8}),floor=createEntity('floor',{width:10,length:10}),water=createEntity('water',{position:[12,0,0],width:6,length:25});
  for(const e of [terrain,floor,water])scene.layout.entities[e.id]=e;const store=createSceneStore(scene),before=structuredClone(store.document),options={terrainId:terrain.id,count:12,seed:43};
  const a=proposeVegetation(scene,options,store.editVersion,catalog),b=proposeVegetation(scene,options,store.editVersion,catalog);
  assert.deepEqual(a.entities.map(e=>[e.transform,e.vegetationSeed]),b.entities.map(e=>[e.transform,e.vegetationSeed]));assert.deepEqual(store.document,before);assert.equal(a.entities.length,12);
  for(const [i,e] of a.entities.entries()) {const footprint=worldFootprint(e);assert.ok(!footprintsOverlap(footprint,worldFootprint(floor)));assert.ok(!footprintsOverlap(footprint,worldFootprint(water)));assert.ok(a.entities.slice(0,i).every(p=>!footprintsOverlap(footprint,worldFootprint(p))));assert.equal(e.transform.position[1],supportHeightAt(terrain,e.transform.position));}
  store.execute('proposal.accept',{proposal:a});store.undo();assert.deepEqual(store.document,before);store.redo();store.execute('entity.update',{id:a.entities[0].id,patch:{vegetationSeed:132}});validateDocument(store.document);
  const current=structuredClone(store.document);assert.throws(()=>store.execute('entity.update',{id:floor.id,patch:{vegetationSeed:12}}));assert.deepEqual(store.document,current);
});

test('polygonal water retains its contour, animates bounded waves and freezes as a solid support; invalid thaw is atomic',()=>{
  const scene=createScene(),water=createEntity('water',{vertices:[[-3,-3],[3,-3],[3,-1],[-1,-1],[-1,3],[-3,3]],position:[0,2,0]});scene.layout.entities[water.id]=water;validateDocument(scene);const store=createSceneStore(scene);
  const view=createWater(water);try {assert.ok(ray(view,[-2,5,0],[0,-1,0]).length);assert.equal(ray(view,[2,5,2],[0,-1,0]).length,0);assert.ok(updateWater(view,2,false));assert.equal(updateWater(view,2,true),false);assert.equal(view.children[0].userData.waterUniforms.waterTime.value,2*water.water.speed);}finally{disposeObject(view);}
  assert.equal(isSupport(water),false);store.execute('entity.update',{id:water.id,patch:{water:{state:'ice'},material:surfacePatch('ice')}});const ice=store.document.layout.entities[water.id];assert.ok(isSupport(ice));assert.equal(supportHeightAt(ice,[-2,0,0]),2);
  const solid=createWater(ice);try {assert.ok(Math.abs(new THREE.Box3().setFromObject(solid).min.y-(2-ice.depth))<1e-5);}finally{disposeObject(solid);}
  const pair=createToken({surfaceId:ice.id,position:[-2,2,0]});store.execute('token.add',pair);const before=structuredClone(store.document);assert.throws(()=>store.execute('entity.update',{id:ice.id,patch:{water:{state:'water'}}}));assert.deepEqual(store.document,before);
  for(const patch of [{water:{waveHeight:9}},{water:{state:'lava'}},{depth:0},{water:{speed:NaN}}])assert.throws(()=>store.execute('entity.update',{id:ice.id,patch}));
  store.execute('entity.update',{id:ice.id,patch:{transform:{position:[1,4,0]},depth:.7},snap:false});assert.equal(store.document.tokens[pair.token.id].transform.position[1],4);
});

test('physical terrain snow matches rendered triangles/supports, preserves base heights and carries supported tokens through history and mask resizing',()=>{
  const terrain=createEntity('terrain',{width:8,length:8,segments:4,material:{...surfacePatch('rock'),coverage:snowy()}}),scene=createScene();scene.layout.entities[terrain.id]=terrain;
  terrain.snowMask=terrain.heights.map((_,i)=>i===12?0:1);const base=[...terrain.heights],view=createTerrain(terrain),samples=[[-2,4,-2],[0,4,0],[.3,4,-.2]];
  try {assert.equal(terrainSnow(terrain).heights[12],0);assert.equal(terrainSnow(terrain).heights[0],.3);assert.ok(view.children.some(c=>c.userData.terrainSnowEdge));for(const p of samples){const hits=ray(view,p,[0,-1,0]);assert.ok(hits.length);assert.ok(Math.abs(hits[0].point.y-supportHeightAt(terrain,p))<1e-6);}assert.deepEqual(terrain.heights,base);}finally{disposeObject(view);}
  const store=createSceneStore(scene),pair=createToken({surfaceId:terrain.id,position:[-2,.3,-2]});store.execute('token.add',pair);const before=structuredClone(store.document);store.execute('entity.update',{id:terrain.id,patch:{material:{coverage:{...snowy(),physicalThickness:.6}}}});assert.equal(store.document.tokens[pair.token.id].transform.position[1],.6);store.undo();assert.deepEqual(store.document,before);
  for(const patch of [resampleTerrain(terrain,8),resizeTerrain(terrain,{width:16})]){assert.equal(patch.snowMask.length,patch.heights.length);const doc=structuredClone(scene);doc.layout.entities[terrain.id]={...terrain,...patch};validateDocument(doc);}
  assert.equal(snowWeight([0,0,0],-1,snowy()),0);assert.equal(snowWeight([0,0,0],1,snowy()),1);
});

test('snow coats have real volume, shelter under actual roof geometry, respect slots and release per-instance resources',()=>{
  const c=snowy(),host=createEntity('floor',{width:2,length:2,position:[0,0,0],material:{...surfacePatch('wood'),coverage:c}}),roof=createEntity('floor',{width:2.5,length:2.5,position:[0,2,0]});
  const a=createFloor(host),b=createFloor(roof),surfaces=createSurfaceLibrary();a.updateMatrixWorld(true);b.updateMatrixWorld(true);
  try {const exposure=createExposureTest(snowOccluders([a,b]));assert.equal(exposure([0,0,0]),0);assert.equal(exposure([4,0,0]),1);assert.equal(addPhysicalSnow(a,host,surfaces,exposure).triangles,0);
    b.position.x=6;b.updateMatrixWorld(true);const open=createExposureTest(snowOccluders([a,b]));assert.ok(addPhysicalSnow(a,host,surfaces,open).triangles>0);assert.ok(Math.abs(new THREE.Box3().setFromObject(a).max.y-.303)<1e-5);assert.ok(ray(a,[0,3,0],[0,-1,0])[0].object.userData.physicalSnow);
    let disposed=0;a.children.find(c=>c.userData.physicalSnow).geometry.addEventListener('dispose',()=>disposed++);clearPhysicalSnow(a);assert.equal(disposed,1);assert.equal(a.children.length,1);
    host.material.coverage.exposedOnly=false;b.position.x=0;b.updateMatrixWorld(true);assert.ok(addPhysicalSnow(a,host,surfaces,createExposureTest(snowOccluders([a,b]))).triangles>0);
  }finally {disposeObject(a);disposeObject(b);surfaces.dispose();}
});

test('landscape fields persist through JSON, maps, duplication and presentation without affecting unrelated fields',()=>{
  const scene=createScene(),terrain=createEntity('terrain',{segments:4,material:{coverage:snowy()},snowMask:Array(25).fill(.5)}),water=createEntity('water',{water:{state:'ice',waveHeight:.2,direction:90}}),tree=createEntity('prop',{assetRef:{id:VEGETATION_ASSETS[0],revision:1},vegetationSeed:155});
  for(const e of [terrain,water,tree])scene.layout.entities[e.id]=e;
  for(const doc of [JSON.parse(JSON.stringify(scene)),duplicateDocument(scene),createSceneFromMap(createMapFromScene(scene)),projectPresentation(scene)]){validateDocument(doc);const es=Object.values(doc.layout.entities);assert.equal(es.find(e=>e.kind==='terrain').snowMask[0],.5);assert.equal(es.find(e=>e.kind==='water').water.direction,90);assert.equal(es.find(e=>e.kind==='prop').vegetationSeed,155);}
  const store=createSceneStore(scene),before=structuredClone(store.document);for(const coverage of [{...snowy(),physicalThickness:3},{...coverageDefaults('grass'),physicalThickness:.2},{...snowy(),exposedOnly:'yes'}])assert.throws(()=>store.execute('entity.update',{id:terrain.id,patch:{material:{coverage}}}));assert.deepEqual(store.document,before);
});


test('snow sky tests preserve actual roof holes and coats target only the selected material slot',()=>{
  const roof=createFloor(createEntity('floor',{width:4,length:4,position:[0,3,0],holes:[[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]]}));roof.updateMatrixWorld(true);
  const view=new THREE.Group(),record=createEntity('prop',{material:{coverage:snowy(),textureSlot:'wood'}}),library=createSurfaceLibrary();
  for(const [x,slot] of [[-1,'wood'],[1,'metal']]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,.2,1),new THREE.MeshStandardMaterial());mesh.userData.materialSlot=slot;mesh.position.set(x,.1,0);view.add(mesh);}view.updateMatrixWorld(true);
  try {const sky=createExposureTest(snowOccluders([roof]));assert.equal(sky([0,0,0]),1);assert.equal(sky([1,0,0]),0);
    assert.ok(addPhysicalSnow(view,record,library,()=>1).triangles);assert.ok(ray(view,[-1,2,0],[0,-1,0])[0].object.userData.physicalSnow);assert.ok(!ray(view,[1,2,0],[0,-1,0])[0].object.userData.physicalSnow);
  }finally{disposeObject(view);disposeObject(roof);library.dispose();}
});
