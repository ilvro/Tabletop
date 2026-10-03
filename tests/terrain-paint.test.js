import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEntity, createScene, createToken, clone, duplicateDocument, validateDocument } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { worldPoint } from '../src/domain/geometry.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { sculptTerrain, paintTerrain, terrainBrushCenter, terrainBrushOutline, resampleTerrain } from '../src/authoring/terrain.js';
import { createTerrain } from '../src/render/scene-objects.js';
import { disposeObject } from '../src/render/asset-cache.js';

const terrain = options => createEntity('terrain', { width: 8, length: 8, segments: 8, ...options });
const index = (x,z) => (z + 4) * 9 + x + 4;
const snow = ground => ({ id: 'snow', name: 'Neve', color: '#ffffff', opacity: 1, visible: true, weights: Array(ground.heights.length).fill(0) });

test('square/hard brushes make flat plateaus and match rotated outline and actual triangle heights', () => {
  const ground = terrain({ position: [2,3,1], rotation: quaternionFromYaw(45) });
  const center = worldPoint(ground, [0,0,0]);
  const square = sculptTerrain(ground, center, { mode: 'flatten', radius: 2, strength: 1, target: 7, shape: 'square', hardness: 1 });
  const circle = sculptTerrain(ground, center, { mode: 'flatten', radius: 2, strength: 1, target: 7, hardness: 1 });
  assert.equal(square[index(1,1)], 4); assert.equal(square[index(2,2)], 4); assert.equal(circle[index(2,2)], 0);
  assert.equal(square[index(3,0)], 0);
  const outline = terrainBrushOutline(ground, center, { shape: 'square', radius: 2 });
  assert.ok(Math.abs(outline[6][0] - worldPoint(ground, [2,0,2])[0]) < 1e-8);
  const view = createTerrain({ ...ground, heights: square }); view.updateMatrixWorld(true);
  const p = worldPoint(ground, [1,0,1]);
  const hit = new THREE.Raycaster(new THREE.Vector3(p[0],20,p[2]), new THREE.Vector3(0,-1,0)).intersectObject(view,true)[0];
  assert.ok(Math.abs(hit.point.y - 7) < 1e-5); disposeObject(view);
});

test('hardness and snapped center have distinct effects and reject invalid settings', () => {
  const ground = terrain(), soft = sculptTerrain(ground, [0,0,0], { radius: 2, strength: 1 }), hard = sculptTerrain(ground, [0,0,0], { radius: 2, strength: 1, hardness: 1 });
  assert.equal(soft[index(1,0)], .5); assert.equal(hard[index(1,0)], 1);
  assert.deepEqual(terrainBrushCenter(ground, [.4,0,.4], { snap: true }), [0,0,0]);
  const snapped = sculptTerrain(ground, [.4,0,.4], { snap: true, radius: .2, strength: 1 }); assert.equal(snapped[index(0,0)],1);
  assert.ok(sculptTerrain(ground, [.4,0,.4], { radius: .2, strength: 1 }).every(value => value === 0));
  for (const settings of [{ hardness: NaN }, { hardness: 2 }, { shape: 'triangle' }, { snap: 'yes' }]) assert.throws(() => sculptTerrain(ground,[0,0,0],settings), /inválido/);
});

test('painting and erasing affect only the active mask without changing heights or lower layers', () => {
  const ground = terrain(); ground.paintLayers.push(snow(ground)); const before = clone(ground);
  ground.paintLayers = paintTerrain(ground,[0,0,0],{ mode:'paint', layerId:'snow', radius:2, strength:1, shape:'square', hardness:1 });
  assert.deepEqual(ground.heights, before.heights); assert.deepEqual(ground.paintLayers[0], before.paintLayers[0]);
  assert.equal(ground.paintLayers[1].weights[index(1,1)],1); assert.equal(before.paintLayers[1].weights[index(1,1)],0);
  const erased = paintTerrain(ground,[0,0,0],{ mode:'erase', layerId:'snow', radius:.5, strength:1 });
  assert.equal(erased[1].weights[index(0,0)],0); assert.equal(erased[1].weights[index(1,1)],1);
  ground.paintLayers[1].visible = false;
  assert.throws(() => paintTerrain(ground,[0,0,0],{ mode:'paint', layerId:'snow' }), /visível/);
});

test('vertex color composition supports recoloring, opacity, hiding and reordering without repaints', () => {
  const ground = terrain(); ground.paintLayers[0].color='#008000'; ground.paintLayers.push(snow(ground)); ground.paintLayers[1].weights[index(0,0)]=1;
  function vertex(entity, i) { const view = createTerrain(entity), color = view.children[0].geometry.getAttribute('color'); const result = [color.getX(i),color.getY(i),color.getZ(i)]; disposeObject(view); return result; }
  const close = (actual, expected) => actual.forEach((value,i) => assert.ok(Math.abs(value-expected[i])<1e-6));
  close(vertex(ground,index(0,0)),new THREE.Color('#ffffff').toArray()); close(vertex(ground,index(3,3)),new THREE.Color('#008000').toArray());
  ground.paintLayers[1].color='#804000'; close(vertex(ground,index(0,0)),new THREE.Color('#804000').toArray());
  ground.paintLayers[1].opacity=.5; close(vertex(ground,index(0,0)),new THREE.Color('#008000').lerp(new THREE.Color('#804000'),.5).toArray());
  ground.paintLayers[1].visible=false; close(vertex(ground,index(0,0)),new THREE.Color('#008000').toArray());
  ground.paintLayers[1].visible=true; ground.paintLayers.reverse(); close(vertex(ground,index(0,0)),new THREE.Color('#008000').toArray());
});

test('faceted shading changes surface lighting without changing support geometry', () => {
  const ground = terrain(); ground.heights[index(0,0)]=2;
  const smooth = createTerrain(ground), faceted = createTerrain({ ...ground, flatShading:true });
  assert.equal(smooth.children[0].material.flatShading,false); assert.equal(faceted.children[0].material.flatShading,true);
  assert.deepEqual(faceted.children[0].geometry.getAttribute('position').array,smooth.children[0].geometry.getAttribute('position').array);
  disposeObject(smooth); disposeObject(faceted);
});

test('resampling preserves linear heights, masks and exact endpoints; undo restores lost detail', () => {
  const ground = terrain(); ground.heights=ground.heights.map((_,i) => (i%9) + Math.floor(i/9)); ground.paintLayers[0].weights=ground.paintLayers[0].weights.map((_,i) => (i%9)/8);
  const store = createSceneStore(createScene()); store.execute('entity.add',{ entity:ground, snap:false }); const before=clone(store.document);
  const patch=resampleTerrain(ground,16); assert.equal(patch.heights[8*17+8],8); assert.equal(patch.paintLayers[0].weights[8*17+8],.5);
  store.execute('entity.update',{ id:ground.id, patch, snap:false }); validateDocument(store.document); store.undo(); assert.deepEqual(store.document,before);
  assert.deepEqual(resampleTerrain({ ...ground,...patch },8),{ segments:ground.segments, heights:ground.heights, paintLayers:ground.paintLayers });
  assert.throws(() => resampleTerrain(ground,65), /divisões/);
});

test('painting, recoloring and JSON duplication preserve positions of supported tokens and independent masks', () => {
  const store=createSceneStore(createScene()), ground=terrain(); ground.paintLayers.push(snow(ground)); store.execute('entity.add',{ entity:ground, snap:false });
  const pair=createToken({ surfaceId:ground.id, position:[0,0,0] }); store.execute('token.add',{ ...pair, snap:false }); const before=clone(store.document);
  store.execute('entity.update',{ id:ground.id, patch:{ paintLayers:paintTerrain(ground,[0,0,0],{ mode:'paint',layerId:'snow',strength:1 }) },snap:false });
  assert.deepEqual(store.document.tokens,before.tokens); const painted=clone(store.document); store.undo(); assert.deepEqual(store.document,before); store.redo(); assert.deepEqual(store.document,painted);
  const restored=createSceneStore(JSON.parse(JSON.stringify(painted))).document; assert.deepEqual(restored,painted);
  const copy=duplicateDocument(restored); validateDocument(copy); const copiedGround=Object.values(copy.layout.entities).find(e => e.kind==='terrain'); copiedGround.paintLayers[1].weights[0]=1;
  assert.equal(restored.layout.entities[ground.id].paintLayers[1].weights[0],0);
});

test('legacy terrains without paint layers render and load; invalid masks fail atomically', () => {
  const ground=terrain(); delete ground.paintLayers; delete ground.flatShading;
  const store=createSceneStore(createScene()); store.execute('entity.add',{ entity:ground,snap:false }); const view=createTerrain(ground); assert.equal(view.children[0].material.vertexColors,false); disposeObject(view);
  const layer=snow(ground), before=clone(store.document);
  for (const paintLayers of [[{ ...layer,weights:[0] }],[{ ...layer,color:'white' }],[{ ...layer,opacity:2 }],[layer,layer],[{ ...layer,weights:Array(ground.heights.length).fill(-1) }],Array(9).fill(layer)]) {
    assert.throws(() => store.execute('entity.update',{ id:ground.id,patch:{ paintLayers } })); assert.deepEqual(store.document,before);
  }
});
