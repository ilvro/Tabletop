import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntity, createScene, createToken, validateDocument, createMapFromScene, createSceneFromMap } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { worldPoint, supportHeightAt, pointInPolygon, polygonIsSimple } from '../src/domain/geometry.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { coverageDefaults, surfacePatch } from '../src/domain/materials.js';
import { sculptTerrain } from '../src/authoring/terrain.js';
import { proposeWaterBrush, proposeWaterBed } from '../src/authoring/water.js';

function setup(options={}) {
  const terrain=createEntity('terrain',{width:16,length:16,segments:32,heights:Array(33**2).fill(1),...options});
  const scene=createScene();scene.layout.entities[terrain.id]=terrain;return {scene,terrain};
}
test('water brush carves every supporting triangle below waves and snow, preserves masks, and undoes water and bed together',()=>{
  const {scene,terrain}=setup({position:[3,2,-4],rotation:quaternionFromYaw(37),material:{...surfacePatch('rock'),coverage:{...coverageDefaults(),physicalThickness:.35}}});
  const store=createSceneStore(scene),pair=createToken({position:worldPoint(terrain,[0,1,0]),surfaceId:terrain.id});store.execute('token.add',{...pair,snap:false});
  const before=structuredClone(store.document),points=[[-4,0,-2],[0,0,0],[4,0,2]].map(p=>worldPoint(terrain,p)),proposal=proposeWaterBrush(store.document,terrain.id,points,{radius:1.8,waterLevel:3,waterDepth:.6},store.editVersion);
  assert.deepEqual(store.document,before);assert.ok(proposal.entities.every(e=>polygonIsSimple(e.vertices)));assert.equal(proposal.updates.length,1);
  store.execute('proposal.accept',{proposal});const after=structuredClone(store.document),edited=after.layout.entities[terrain.id];
  for(const water of proposal.entities) for(let z=-7;z<=7;z+=.2)for(let x=-7;x<=7;x+=.2) if(pointInPolygon([x,z],water.vertices)) {
    const p=worldPoint(terrain,[x,0,z]);assert.ok(supportHeightAt(edited,p)<water.transform.position[1]-water.water.waveHeight-.59);
  }
  assert.deepEqual(edited.paintLayers,terrain.paintLayers);assert.equal(edited.heights[0],terrain.heights[0]);assert.equal(after.tokens[pair.token.id].transform.position[1],supportHeightAt(edited,pair.token.transform.position));
  validateDocument(createSceneFromMap(createMapFromScene(after)));store.undo();assert.deepEqual(store.document,before);store.redo();assert.deepEqual(store.document,after);
});
test('water brush avoids floors and rejects enclosed constructions, tiny brushes and intricate contours without mutation',()=>{
  const {scene,terrain}=setup(),floor=createEntity('floor',{width:3,length:3,position:[0,0,0]});scene.layout.entities[floor.id]=floor;
  assert.throws(()=>sculptTerrain(terrain,[0,0,0],{mode:'water'}),/Ferramenta de relevo inválida/);
  const before=structuredClone(scene),proposal=proposeWaterBrush(scene,terrain.id,[[-6,1,-5],[6,1,-5]],{radius:1.4,waterLevel:1,waterDepth:.6},0);
  assert.ok(proposal.entities.length);assert.deepEqual(scene,before);
  assert.throws(()=>proposeWaterBrush(scene,terrain.id,[[0,1,0]],{radius:1,waterLevel:1,waterDepth:.6},0),/área livre/);
  assert.throws(()=>proposeWaterBrush(scene,terrain.id,[[0,1,0]],{radius:.1},0),/menor que a malha/);
  const water=createEntity('water',{width:10,length:10,position:[0,1,0]});scene.layout.entities[water.id]=water;
  assert.throws(()=>proposeWaterBed(scene,terrain.id,water.id,0),/construção/);
  floor.transform.position=[7,0,7];water.transform.position=[-3,1,-3];water.width=4;water.length=4;
  assert.ok(proposeWaterBed(scene,terrain.id,water.id,0).updates[0].patch.heights.some(h=>h<1));
  water.transform.position=[-7,1,-7];assert.throws(()=>proposeWaterBed(scene,terrain.id,water.id,0),/dentro do terreno/);
  terrain.locked=true;assert.throws(()=>proposeWaterBed(scene,terrain.id,water.id,0),/desbloqueados/);
});
test('water adjustment follows linked supports and preserves atomic validation for locked dependents',()=>{
  const {scene,terrain}=setup(),water=createEntity('water',{width:4,length:4,position:[0,1,0]});scene.layout.entities[water.id]=water;
  const pair=createToken({position:[0,1,0],surfaceId:terrain.id});pair.token.locked=true;scene.tokens[pair.token.id]=pair.token;scene.actors[pair.actor.id]=pair.actor;
  const store=createSceneStore(scene),proposal=proposeWaterBed(scene,terrain.id,water.id,store.editVersion);
  assert.throws(()=>store.execute('proposal.accept',{proposal}),/bloquead/);assert.deepEqual(store.document,scene);
});
