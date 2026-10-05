import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEntity, createScene, createToken, validateDocument, createMapFromScene, createSceneFromMap } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { worldPoint, pointInPolygon, supportHeightAt } from '../src/domain/geometry.js';
import { sculptTerrain, resizeTerrain, protectTerrainFloors } from '../src/authoring/terrain.js';
import { createTerrain } from '../src/render/scene-objects.js';
import { disposeObject } from '../src/render/asset-cache.js';

const ground=options=>createEntity('terrain',{width:8,length:8,segments:8,...options});
const at=(entity,x,z)=>Math.round((z/entity.length+.5)*entity.segments)*(entity.segments+1)+Math.round((x/entity.width+.5)*entity.segments);

test('rock sculpting uses a coherent world field, changes physical support, preserves masks and rejects invalid settings',()=>{
  const terrain=ground(),settings={mode:'rock',radius:100,hardness:1,strength:3,rockSize:3,rockSeed:43};
  const heights=sculptTerrain(terrain,[0,0,0],settings);
  assert.deepEqual(heights,sculptTerrain(terrain,[0,0,0],settings));
  assert.ok(heights.every(Number.isFinite));assert.ok(Math.max(...heights)-Math.min(...heights)>1);
  const moved=ground({position:[4,0,0]}),shifted=sculptTerrain(moved,[4,0,0],settings);
  for(let z=-4;z<=4;z++) for(let x=0;x<=4;x++) assert.equal(heights[at(terrain,x,z)],shifted[at(moved,x-4,z)]);
  for(const rockPattern of ['strata','granite']) assert.notDeepEqual(sculptTerrain(terrain,[0,0,0],{...settings,rockPattern}),heights);
  assert.notDeepEqual(sculptTerrain(terrain,[0,0,0],{...settings,rockSeed:44}),heights);
  const before=structuredClone(terrain),store=createSceneStore(createScene());store.execute('entity.add',{entity:terrain,snap:false});
  const pair=createToken({surfaceId:terrain.id,position:[0,0,0]});store.execute('token.add',{...pair,snap:false});
  store.execute('entity.update',{id:terrain.id,patch:{heights},snap:false});const result=store.document.layout.entities[terrain.id];
  assert.deepEqual(result.paintLayers,before.paintLayers);assert.equal(store.document.tokens[pair.token.id].transform.position[1],supportHeightAt(result,[0,0,0]));
  const view=createTerrain(result);view.updateMatrixWorld(true);
  const hit=new THREE.Raycaster(new THREE.Vector3(.3,20,.4),new THREE.Vector3(0,-1,0)).intersectObject(view,true)[0];
  assert.ok(Math.abs(hit.point.y-supportHeightAt(result,[.3,0,.4]))<1e-5);disposeObject(view);
  const edited=structuredClone(store.document);store.undo();assert.deepEqual(store.document.layout.entities[terrain.id],terrain);store.redo();assert.deepEqual(store.document,edited);
  validateDocument(createSceneFromMap(createMapFromScene(edited)));
  for(const bad of [{rockSeed:1.5},{rockSeed:-1},{rockSize:0},{rockSize:NaN},{rockPattern:'brick'}]) assert.throws(()=>sculptTerrain(terrain,[0,0,0],{...settings,...bad}),/inválido/);
});

test('terrain expansion preserves metric detail and masks, continues edges, and differs from explicit stretching',()=>{
  const terrain=ground({position:[3,2,1],rotation:quaternionFromYaw(30)});
  terrain.heights=terrain.heights.map((_,i)=>i%9+Math.floor(i/9)*2);
  terrain.paintLayers[0].weights=terrain.heights.map((_,i)=>(i%9)/8);
  const expanded={...terrain,...resizeTerrain(terrain,{width:16,length:16})};
  assert.equal(expanded.segments,16);
  for(let z=-4;z<=4;z++) for(let x=-4;x<=4;x++) {
    assert.equal(expanded.heights[at(expanded,x,z)],terrain.heights[at(terrain,x,z)]);
    assert.equal(expanded.paintLayers[0].weights[at(expanded,x,z)],terrain.paintLayers[0].weights[at(terrain,x,z)]);
  }
  assert.equal(expanded.heights[at(expanded,8,8)],terrain.heights.at(-1));
  assert.deepEqual(expanded.transform,terrain.transform);
  assert.equal(supportHeightAt(expanded,worldPoint(terrain,[1,0,1])),supportHeightAt(terrain,worldPoint(terrain,[1,0,1])));
  const stretched={...terrain,...resizeTerrain(terrain,{width:16,length:16,mode:'stretch'})};
  assert.deepEqual(stretched.heights,terrain.heights);assert.deepEqual(stretched.paintLayers,terrain.paintLayers);
  assert.notEqual(supportHeightAt(stretched,worldPoint(terrain,[1,0,1])),supportHeightAt(terrain,worldPoint(terrain,[1,0,1])));
  const cropped={...expanded,...resizeTerrain(expanded,{width:8,length:8})};
  assert.equal(cropped.heights[at(cropped,1,1)],terrain.heights[at(terrain,1,1)]);
  assert.equal(resizeTerrain(terrain,{width:1000,length:1000}).segments,64);
  for(const bad of [{width:NaN},{length:0},{width:1001},{mode:'other'}]) assert.throws(()=>resizeTerrain(terrain,bad),/inválidas/);
  const scene=createScene();scene.layout.entities[expanded.id]=expanded;validateDocument(scene);
  const store=createSceneStore(scene),before=structuredClone(store.document);
  store.execute('entity.update',{id:expanded.id,patch:resizeTerrain(expanded,{width:20}),snap:false});store.undo();assert.deepEqual(store.document,before);
});

test('floor protection caps crossing triangles for rotated concave floors, preserves large holes and independent construction',()=>{
  const terrain=ground({width:40,length:40,segments:40,position:[2,1,3],rotation:quaternionFromYaw(15),heights:Array(41**2).fill(10)});
  const floor=createEntity('floor',{position:[2,6,3],rotation:quaternionFromYaw(40),thickness:.2,vertices:[[-10,-10],[10,-10],[10,10],[4,10],[4,8],[-10,8]],holes:[[[-5,-5],[-5,5],[2,5],[2,-5]]]});
  const before=structuredClone({terrain,floor}),heights=protectTerrainFloors(terrain,{[floor.id]:floor});
  const protectedTerrain={...terrain,heights};assert.deepEqual({terrain,floor},before);
  assert.deepEqual(protectTerrainFloors(protectedTerrain,{[floor.id]:floor}),heights,'repeated protection does not excavate the transition again');
  let checked=0;
  for(let z=-9.5;z<9.5;z+=.5) for(let x=-9.5;x<9.5;x+=.5) {
    if(!pointInPolygon([x,z],floor.vertices)||floor.holes.some(ring=>pointInPolygon([x,z],ring))) continue;
    const p=worldPoint(floor,[x,0,z]);assert.ok(supportHeightAt(protectedTerrain,p)<=5.76+1e-6,`${x},${z}`);checked++;
  }
  assert.ok(checked>700);
  assert.ok(supportHeightAt(protectedTerrain,worldPoint(floor,[-1.5,0,0]))>10,'interior of a large hole remains untouched');
  assert.equal(heights[0],10);assert.deepEqual(protectedTerrain.paintLayers,terrain.paintLayers);
  const scene=createScene();for(const e of [floor,protectedTerrain]) scene.layout.entities[e.id]=e;validateDocument(scene);
  const lowerFloor=createEntity('floor',{width:20,length:20,position:[2,4,3]});
  const twice=protectTerrainFloors(terrain,{[floor.id]:floor,[lowerFloor.id]:lowerFloor});
  assert.ok(supportHeightAt({...terrain,heights:twice},[2,0,3])<=4-lowerFloor.thickness-.04+1e-6,'lowest solid floor wins');
});
