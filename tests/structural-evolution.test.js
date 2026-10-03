import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createScene, createEntity, createToken, createLight, createLevel, createLayer, clone, validateDocument, duplicateDocument, createMapFromScene, createSceneFromMap } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { supportHeightAt, worldPoint, footprintOnFloor, worldFootprint, isVisible, isLocked } from '../src/domain/geometry.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { sculptTerrain } from '../src/authoring/terrain.js';
import { proposeContourWalls, wallJoinProfile } from '../src/authoring/structures.js';
import { proposePolish, passageZones } from '../src/authoring/polish.js';
import { proposeFurnishing } from '../src/authoring/furnishing.js';
import { createTerrain, createFloor, createWall } from '../src/render/scene-objects.js';
import { disposeObject } from '../src/render/asset-cache.js';
import { projectPresentation } from '../src/app/presentation.js';
import { readFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const add = (store, entity) => { store.execute('entity.add', { entity, snap: false }); return store.document.layout.entities[entity.id]; };
const accept = (store, proposal) => store.execute('proposal.accept', { proposal });
const fresh = () => createSceneStore(createScene());
const ray = (view, point, direction = [0,-1,0]) => { view.updateMatrixWorld(true); return new THREE.Raycaster(new THREE.Vector3(...point), new THREE.Vector3(...direction)).intersectObject(view, true); };

test('terrain triangle heights match raycast at rotated, raised supports; grid validation is atomic', () => {
  const store = fresh(), terrain = add(store, createEntity('terrain', { width: 4, length: 4, segments: 2, position: [3,2,-1], rotation: quaternionFromYaw(37), heights: [0,1,3,2,6,1,4,0,3] }));
  const view = createTerrain(terrain);
  for (const [x,z] of [[-.6,-.8],[-.2,-.1],[.8,.4],[1.8,1.7]]) {
    const point = worldPoint(terrain, [x,0,z]), hit = ray(view, [point[0], 30, point[2]])[0];
    assert.ok(hit); assert.ok(Math.abs(hit.point.y - supportHeightAt(terrain, point)) < 1e-5);
  }
  assert.throws(() => createEntity('terrain', { segments: 100000 }), /divisões/);
  const before = store.document;
  assert.throws(() => store.execute('entity.update', { id: terrain.id, patch: { heights: [Infinity] } }), /Heightmap|altura|tamanho|Número/);
  assert.throws(() => store.execute('entity.update', { id: terrain.id, patch: { segments: 65 } }), /limites/);
  assert.deepEqual(store.document, before); disposeObject(view);
});

test('sculpt stamps support elevation, nested furniture, lights, undo and persisted materialized heights', () => {
  const store = fresh(), terrain = add(store, createEntity('terrain', { width: 8, length: 8, segments: 8 }));
  const desk = add(store, createEntity('prop', { surfaceId: terrain.id, supportHeight: .8 }));
  const pair = createToken({ surfaceId: desk.id, position: [0,.8,0] }); store.execute('token.add', { ...pair, snap: false });
  const light = createLight({ surfaceId: terrain.id, position: [0,2,0] }); store.execute('light.add', { light });
  const before = clone(store.document), heights = sculptTerrain(terrain, [0,0,0], { radius: 2, strength: 1 });
  assert.equal(terrain.heights[40], 0); assert.equal(heights[40], 1);
  store.execute('entity.update', { id: terrain.id, patch: { heights } });
  assert.equal(store.document.layout.entities[desk.id].transform.position[1], 1);
  assert.equal(store.document.tokens[pair.token.id].transform.position[1], 1.8);
  assert.equal(store.document.look.lights[light.id].position[1], 3);
  const after = clone(store.document); store.undo(); assert.deepEqual(store.document, before); store.redo(); assert.deepEqual(store.document, after);
  assert.deepEqual(createSceneStore(JSON.parse(JSON.stringify(after))).document, after);
  const raised = store.document.layout.entities[terrain.id];
  assert.ok(sculptTerrain(raised, [0,0,0], { mode: 'lower', radius: 2, strength: .2 })[40] < 1);
  assert.ok(sculptTerrain(raised, [0,0,0], { mode: 'smooth', radius: 2, strength: 1 })[40] < 1);
  assert.equal(sculptTerrain(raised, [0,0,0], { mode: 'flatten', radius: 2, strength: 1, target: 3 })[40], 3);
});

test('floor holes are physical openings and reject crossing, touching, nested or outside rings', () => {
  const store = fresh(), hole = [[-1,-1],[1,-1],[1,1],[-1,1]];
  const floor = add(store, createEntity('floor', { width: 8, length: 8, position: [0,3,0], holes: [hole] }));
  const view = createFloor(floor); assert.equal(ray(view, [0,10,0]).length, 0); assert.equal(ray(view, [2,10,2])[0].point.y, 3); disposeObject(view);
  assert.equal(footprintOnFloor(floor, worldFootprint(createEntity('prop', { position: [0,3,0] }))), false);
  assert.equal(footprintOnFloor(floor, [[-2,-2],[2,-2],[2,2],[-2,2]]), false, 'surrounding a hole is also unsupported');
  const before = clone(store.document);
  for (const holes of [[hole,hole], [[[3,3],[5,3],[5,5],[3,5]]], [[[3,-1],[4,-1],[4,1],[3,1]]], [hole,[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]]]) assert.throws(() => store.execute('entity.update', { id: floor.id, patch: { holes } }), /Furos/);
  assert.deepEqual(store.document, before);
  store.execute('entity.update', { id: floor.id, patch: { width: 16 } }); assert.equal(store.document.layout.entities[floor.id].holes[0][0][0], -2);
  const proposal = proposeFurnishing(store.document, { floorId: floor.id }, store.editVersion, catalog);
  assert.ok(proposal.entities.every(e => footprintOnFloor(store.document.layout.entities[floor.id], worldFootprint(e))));
});

test('contours reuse partial shared segments and keep openings and protected walls intact', () => {
  const store = fresh(), a = add(store, createEntity('floor', { width: 4, length: 4 }));
  accept(store, proposeContourWalls(store.document, { floorId: a.id }, store.editVersion));
  assert.equal(Object.values(store.document.layout.entities).filter(e => e.kind === 'wall').length, 4);
  const wall = Object.values(store.document.layout.entities).find(e => e.kind === 'wall' && e.transform.position[0] === 2 && e.transform.position[2] === -2);
  const door = add(store, createEntity('door', { wallId: wall.id, offset: 1, width: .8 }));
  const b = add(store, createEntity('floor', { width: 4, length: 2, position: [4,0,0] }));
  const before = clone(store.document), proposal = proposeContourWalls(store.document, { floorId: b.id }, store.editVersion);
  assert.equal(proposal.entities.length, 3); assert.ok(proposal.report.kept.includes(wall.id)); assert.deepEqual(store.document, before);
  accept(store, proposal); assert.deepEqual(store.document.layout.entities[wall.id].floorIds, [a.id,b.id]); assert.deepEqual(store.document.layout.entities[door.id], door);
  assert.equal(proposeContourWalls(store.document, { floorId: b.id }).entities.length, 0);
  store.undo(); assert.deepEqual(store.document, before);
  store.execute('entity.update', { id: wall.id, patch: { locked: true } });
  const locked = proposeContourWalls(store.document, { floorId: b.id }); assert.ok(locked.report.conflicts.length); assert.equal(locked.updates.some(u => u.id === wall.id), false);
});

test('angled mitres and T joints meet without extending openings into their hosts', () => {
  const a = createEntity('wall', { length: 4, thickness: .2 });
  const b = createEntity('wall', { position: [4,0,0], rotation: quaternionFromYaw(-90), length: 3, thickness: .2 });
  const profile = wallJoinProfile(a, [a,b]);
  assert.ok(profile[1][0] > 4); assert.ok(profile[2][0] < 4);
  const t = createEntity('wall', { position: [4,0,-2], rotation: quaternionFromYaw(-90), length: 4, thickness: .2 });
  assert.ok(wallJoinProfile(a, [a,t]).slice(1,3).every(p => Math.abs(p[0] - 3.9) < 1e-6));
  const view = createWall(a, [createEntity('door', { wallId: a.id, offset: 2, width: 1, height: 2 })], [a,b]);
  assert.equal(ray(view, [2,1,2], [0,0,-1]).length, 0); assert.ok(ray(view, [4.02,1,-1], [0,0,1]).length); disposeObject(view);
});

test('levels move world transforms once and linked accesses follow both elevations with nested supports', () => {
  const store = fresh(), lower = createLevel({ name: 'Térreo', elevation: 0 }), upper = createLevel({ name: 'Andar 1', elevation: 3 });
  store.execute('level.add', { level: lower }); store.execute('level.add', { level: upper });
  const floor = add(store, createEntity('floor', { levelId: lower.id })), top = add(store, createEntity('floor', { levelId: upper.id, position: [0,3,0] }));
  const ramp = add(store, createEntity('ramp', { surfaceId: floor.id, height: 3 })); assert.equal(ramp.fromLevelId, lower.id); assert.equal(ramp.toLevelId, upper.id);
  const pair = createToken({ surfaceId: ramp.id, position: [0,0,0] }); store.execute('token.add', { ...pair, snap: false });
  const desk = add(store, createEntity('prop', { levelId: upper.id, position: [0,3,0], surfaceId: top.id }));
  store.execute('level.move', { id: upper.id, elevation: 5 });
  assert.equal(store.document.layout.entities[top.id].transform.position[1], 5); assert.equal(store.document.layout.entities[desk.id].transform.position[1], 5);
  assert.equal(store.document.layout.entities[ramp.id].height, 5); assert.equal(store.document.tokens[pair.token.id].transform.position[1], 2.5);
  store.execute('level.move', { id: lower.id, elevation: 1 });
  assert.equal(store.document.layout.entities[ramp.id].transform.position[1], 1); assert.equal(store.document.layout.entities[ramp.id].height, 4);
  assert.equal(store.document.tokens[pair.token.id].transform.position[1], 3);
  const before = clone(store.document); assert.throws(() => store.execute('level.move', { id: lower.id, elevation: 6 })); assert.deepEqual(store.document, before);
  const terrain = add(store, createEntity('terrain', { segments: 2, levelId: lower.id, heights: Array(9).fill(2) }));
  const onHill = add(store, createEntity('stairs', { surfaceId: terrain.id, position: [0,2,0] }));
  assert.equal(onHill.transform.position[1], 2); assert.equal(onHill.fromLevelId, null, 'an elevated terrain point must not snap down to a storey reference');
});

test('copying a level remaps its construction, windows, sockets and lights without multiplying session tokens', () => {
  const store = fresh(), level = createLevel(); store.execute('level.add', { level });
  const floor = add(store, createEntity('floor', { levelId: level.id, holes: [[[-1,-1],[1,-1],[1,1],[-1,1]]] }));
  const wall = add(store, createEntity('wall', { levelId: level.id, floorIds: [floor.id] }));
  add(store, createEntity('window', { wallId: wall.id, offset: 2 }));
  const lamp = createLight({ anchor: { hostId: wall.id, socket: 'wall', offset: [1,2,.2] } }); store.execute('light.add', { light: lamp });
  store.execute('token.add', createToken({ surfaceId: floor.id }));
  store.execute('level.duplicate', { id: level.id });
  const copy = Object.values(store.document.layout.levels).find(l => l.id !== level.id);
  const entities = Object.values(store.document.layout.entities).filter(e => e.levelId === copy.id);
  assert.equal(entities.length, 3); const wallCopy = entities.find(e => e.kind === 'wall'), floorCopy = entities.find(e => e.kind === 'floor');
  assert.deepEqual(wallCopy.floorIds, [floorCopy.id]); assert.equal(entities.find(e => e.kind === 'window').wallId, wallCopy.id);
  assert.equal(Object.keys(store.document.tokens).length, 1); assert.ok(Object.values(store.document.look.lights).some(l => l.anchor?.hostId === wallCopy.id));
  validateDocument(duplicateDocument(store.document)); assert.deepEqual(createSceneFromMap(createMapFromScene(store.document)).layout, store.document.layout);
});

test('level/layer visibility and locks protect descendants and filter the public projection', () => {
  const store = fresh(), level = createLevel(), layer = createLayer(); store.execute('level.add', { level }); store.execute('layer.add', { layer });
  const floor = add(store, createEntity('floor', { levelId: level.id, layerId: layer.id }));
  const pair = createToken({ surfaceId: floor.id }); store.execute('token.add', pair);
  store.execute('token.update', { id: pair.token.id, patch: { levelId: null } });
  store.execute('token.update', { id: pair.token.id, patch: { visualOverride: { color: '#445566' } } });
  assert.equal(store.document.tokens[pair.token.id].levelId,null, 'a manual level detach survives unrelated edits');
  store.execute('layer.update', { id: layer.id, patch: { locked: true } }); assert.ok(isLocked(store.document, store.document.layout.entities[floor.id]));
  assert.throws(() => store.execute('entity.update', { id: floor.id, patch: { width: 9 } }), /bloqueado/);
  store.execute('layer.update', { id: layer.id, patch: { locked: false, visible: false } });
  assert.equal(isVisible(store.document, store.document.layout.entities[floor.id]), false);
  const publicDoc = projectPresentation(store.document); assert.equal(publicDoc.layout.entities[floor.id], undefined); assert.equal(publicDoc.tokens[pair.token.id], undefined); validateDocument(publicDoc);
  store.execute('layer.update', { id: layer.id, patch: { visible: true } }); store.execute('level.update', { id: level.id, patch: { audience: 'gm' } });
  const secret = projectPresentation(store.document); assert.equal(secret.layout.levels[level.id], undefined); assert.equal(secret.layout.entities[floor.id], undefined); validateDocument(secret);
});

test('wall and ceiling anchors follow transforms and removal, reject invalid offsets, and restore with undo', () => {
  const store = fresh(), wall = add(store, createEntity('wall'));
  const prop = add(store, createEntity('prop', { anchor: { hostId: wall.id, socket: 'wall', offset: [1,2,.2] } }));
  store.execute('entity.update', { id: wall.id, patch: { transform: { position: [3,1,2], rotation: quaternionFromYaw(90) } }, snap: false });
  const host = store.document.layout.entities[wall.id]; assert.deepEqual(store.document.layout.entities[prop.id].transform.position, worldPoint(host, [1,2,.2]));
  const before = clone(store.document); assert.throws(() => store.execute('entity.update', { id: prop.id, patch: { anchor: { ...prop.anchor, offset: [10,1,0] } } }), /limites/); assert.deepEqual(store.document, before);
  store.execute('entity.remove', { id: wall.id }); assert.equal(store.document.layout.entities[prop.id], undefined); store.undo(); assert.deepEqual(store.document, before);
  const floor = add(store, createEntity('floor', { position: [0,4,0], thickness: .2 }));
  const light = createLight({ anchor: { hostId: floor.id, socket: 'ceiling', offset: [0,-.1,0] } }); store.execute('light.add', { light }); assert.equal(store.document.look.lights[light.id].position[1], 3.7);
  store.execute('entity.update', { id: floor.id, patch: { thickness: .4 } }); assert.equal(store.document.look.lights[light.id].position[1], 3.5);
  store.execute('entity.update', { id: floor.id, patch: { locked: true } }); store.execute('entity.update', { id: floor.id, patch: { locked: false } });
});

test('material variants and facing polish are scoped, deterministic, protected and transactional', () => {
  const store = fresh(), desk = add(store, createEntity('prop')), chair = add(store, createEntity('prop', { position: [0,0,2] }));
  const locked = add(store, createEntity('prop', { locked: true, position: [3,0,0] }));
  const before = clone(store.document), proposal = proposePolish(store.document, { ids: [desk.id,chair.id,locked.id], mode: 'material', palette: 'industrial', seed: 23 }, store.editVersion);
  assert.equal(proposal.updates.length, 2); assert.ok(proposal.report.kept.includes(locked.id)); assert.deepEqual(store.document, before);
  assert.deepEqual(proposal.updates, proposePolish(store.document, { ids: [desk.id,chair.id,locked.id], mode: 'material', palette: 'industrial', seed: 23 }).updates);
  accept(store, proposal); assert.deepEqual(store.document.layout.entities[chair.id].transform, chair.transform); store.undo(); assert.deepEqual(store.document, before);
  const facing = proposePolish(store.document, { ids: [chair.id], mode: 'facing', referenceId: desk.id }, store.editVersion); accept(store, facing);
  assert.ok(Math.abs(store.document.layout.entities[chair.id].transform.rotation[1]) > .99);
});

test('passage revision moves selected obstructing decoration into valid free floor space', () => {
  const store = fresh(), floor = add(store, createEntity('floor', { width: 8, length: 8 }));
  const wall = add(store, createEntity('wall', { length: 8, position: [-4,0,4], surfaceId: floor.id }));
  add(store, createEntity('door', { wallId: wall.id, offset: 4 }));
  const crate = add(store, createEntity('prop', { position: [0,0,3.5], surfaceId: floor.id, footprint: [.5,.5] }));
  const proposal = proposePolish(store.document, { ids: [crate.id], mode: 'passage', clearance: .8 }, store.editVersion);
  assert.equal(proposal.updates.length, 1); assert.ok(proposal.report.reasons[0].includes('Porta')); accept(store, proposal);
  const moved = store.document.layout.entities[crate.id]; assert.ok(footprintOnFloor(floor, worldFootprint(moved))); assert.ok(passageZones(store.document, floor.id).length);
  const decoration = proposePolish(store.document, { ids: [floor.id], mode: 'corner' }, store.editVersion, catalog); assert.equal(decoration.entities.length, 1); accept(store, decoration);
  validateDocument(store.document);
});

test('local lights can distribute intervals and normalize color/intensity without changing positions', () => {
  const store = fresh(), lights = [createLight({ position: [0,2,0], intensity: 20 }), createLight({ position: [1,2,0], intensity: 40 }), createLight({ position: [6,2,0], intensity: 60 })];
  lights.forEach(light => store.execute('light.add', { light }));
  accept(store, proposePolish(store.document, { ids: lights.map(l => l.id), mode: 'distribute' }, store.editVersion));
  assert.equal(store.document.look.lights[lights[1].id].position[0], 3);
  accept(store, proposePolish(store.document, { ids: lights.map(l => l.id), mode: 'lighting' }, store.editVersion));
  assert.ok(lights.every(l => store.document.look.lights[l.id].intensity === 40));
});
