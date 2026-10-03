import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createMap, createEntity, createToken, createLight, duplicateDocument, clone, id, validateDocument, ValidationError } from '../src/domain/documents.js';
import { snapPosition, quaternionFromYaw, yawFromQuaternion } from '../src/domain/coords.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { applyCommand } from '../src/state/commands.js';

function roomStore() {
  const store = createSceneStore(createScene('Sala de investigação'));
  store.execute('proposal.accept', { proposal: proposeRoom({ width: 6, length: 5 }, store.editVersion) });
  return store;
}

test('snap negative coordinates, shifted origin, tie and footprints in metres', () => {
  const grid = createScene().layout.grid;
  assert.deepEqual(snapPosition([-0.2, 1.4, -1.2], grid, [1, 1]), [-0.5, 1.4, -1.5]);
  assert.deepEqual(snapPosition([-0.6, 0, 0.6], grid, [2, 2]), [-1, 0, 1]);
  assert.deepEqual(snapPosition([0, 0, 0], grid, [1, 1]), [0.5, 0, 0.5]);
  assert.deepEqual(snapPosition([-0.5, 0, -0.5], grid), [0, 0, 0]);
  assert.deepEqual(snapPosition([2.6, 3, -1.4], { ...grid, origin: [2, -2], cellSize: 0.5 }, [1, 0.5]), [2.5, 3, -1.25]);
  assert.deepEqual(snapPosition([0.24, 2, 0.24], grid, [0.7, 0.7]), [0, 2, 0]);
  assert.deepEqual(snapPosition([0.24, 2, 0.24], { ...grid, snap: false }, [1, 1]), [0.24, 2, 0.24]);
  assert.ok(Math.abs(yawFromQuaternion(quaternionFromYaw(-90)) + 90) < 1e-10);
});

test('blank scene/map and accepted room are serializable and have a real hosted opening', () => {
  const store = roomStore();
  assert.doesNotThrow(() => validateDocument(createMap()));
  assert.doesNotThrow(() => validateDocument(JSON.parse(JSON.stringify(store.document))));
  const entities = Object.values(store.document.layout.entities);
  assert.equal(entities.filter(e => e.kind === 'wall').length, 4);
  const floor = entities.find(e => e.kind === 'floor'), door = entities.find(e => e.kind === 'door');
  const wall = store.document.layout.entities[door.wallId];
  assert.equal(door.surfaceId, floor.id); assert.equal(door.offset, wall.length / 2);
  assert.ok(door.offset - door.width / 2 >= 0); assert.ok(door.offset + door.width / 2 <= wall.length);
  assert.equal(Object.values(store.document.layout.areas)[0].width, 6);
  assert.equal(Object.values(store.document.look.lights).filter(light => light.type === 'point').length, 1);
});

test('one room acceptance is one undo, and redo restores precisely the accepted IDs', () => {
  const store = roomStore(), result = clone(store.document);
  store.undo();
  assert.equal(Object.keys(store.document.layout.entities).length, 0);
  assert.equal(Object.keys(store.document.layout.groups).length, 0);
  assert.equal(Object.values(store.document.look.lights).filter(light => light.type === 'point').length, 0);
  store.redo(); assert.deepEqual(store.document, result);
});

test('stale or invalid proposals leave document and history untouched', () => {
  const store = createSceneStore(createScene()), proposal = proposeRoom({}, store.editVersion);
  store.execute('scene.rename', { name: 'Nova versão' });
  const before = clone(store.document), version = store.editVersion;
  assert.throws(() => store.execute('proposal.accept', { proposal }), /cena mudou/);
  assert.deepEqual(store.document, before); assert.equal(store.editVersion, version);
  const invalid = proposeRoom({}, version); invalid.entities.find(e => e.kind === 'door').wallId = 'missing';
  assert.throws(() => store.execute('proposal.accept', { proposal: invalid }), ValidationError);
  assert.deepEqual(store.document, before); assert.equal(store.editVersion, version);
});

test('wall deletion removes hosted doors and session state; undo restores dependencies', () => {
  const store = roomStore(), door = Object.values(store.document.layout.entities).find(e => e.kind === 'door');
  store.execute('door.setAngle', { id: door.id, angle: 0.1 });
  const before = clone(store.document);
  store.execute('entity.remove', { id: door.wallId });
  assert.equal(store.document.layout.entities[door.id], undefined);
  assert.equal(store.document.sessionState.doors[door.id], undefined);
  assert.ok(Object.values(store.document.layout.areas)[0].memberIds.every(entityId => entityId !== door.id && entityId !== door.wallId));
  store.undo(); assert.deepEqual(store.document, before);
});

test('wall resize cannot strand a door and complete structural scale becomes dimensions', () => {
  const store = roomStore(), door = Object.values(store.document.layout.entities).find(e => e.kind === 'door');
  const before = clone(store.document), version = store.editVersion;
  assert.throws(() => store.execute('entity.update', { id: door.wallId, patch: { length: 0.5 } }), /abertura/);
  assert.deepEqual(store.document, before); assert.equal(store.editVersion, version);
  store.execute('entity.update', { id: door.wallId, patch: { transform: { scale: [2, 1, 1] } } });
  assert.equal(store.document.layout.entities[door.wallId].length, before.layout.entities[door.wallId].length * 2);
  assert.deepEqual(store.document.layout.entities[door.wallId].transform.scale, [1, 1, 1]);
});

test('physical token footprint is independent of its visual scale; duplicated tokens share actor', () => {
  const store = roomStore(), floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
  const pair = createToken({ name: 'Agente', footprint: [2, 1], position: [-0.7, 0, -0.2], surfaceId: floor.id, scale: [3, 2, 4] });
  store.execute('token.add', pair);
  assert.deepEqual(store.document.tokens[pair.token.id].transform.position, [-1, 0, -0.5]);
  assert.deepEqual(store.document.tokens[pair.token.id].footprint, [2, 1]);
  store.execute('token.update', { id: pair.token.id, patch: { transform: { rotation: quaternionFromYaw(90) } }, actorPatch: { name: 'Ana' } });
  assert.deepEqual(store.document.tokens[pair.token.id].transform.position, [-0.5, 0, 0]);
  assert.equal(store.document.actors[pair.actor.id].name, 'Ana');
  store.execute('token.duplicate', { id: pair.token.id });
  assert.equal(Object.keys(store.document.actors).length, 1);
  assert.equal(Object.values(store.document.tokens).filter(t => t.actorId === pair.actor.id).length, 2);
});

test('temporary free movement bypasses snap without changing the grid, and scale preserves an off-grid token', () => {
  const store = createSceneStore(createScene());
  const pair = createToken({ position: [0.23, 0, -0.17] });
  store.execute('token.add', { ...pair, snap: false });
  assert.deepEqual(store.document.tokens[pair.token.id].transform.position, [0.23, 0, -0.17]);
  store.execute('token.update', { id: pair.token.id, patch: { transform: { scale: [2, 1, 2] } } });
  assert.deepEqual(store.document.tokens[pair.token.id].transform.position, [0.23, 0, -0.17]);
  store.execute('token.update', { id: pair.token.id, snap: false, patch: { transform: { position: [-1.13, 0, 2.37] } } });
  assert.deepEqual(store.document.tokens[pair.token.id].transform.position, [-1.13, 0, 2.37]);
  store.execute('token.duplicate', { id: pair.token.id, snap: false, offset: [0.25, 0, 0.25] });
  const copy = Object.values(store.document.tokens).find(token => token.id !== pair.token.id);
  assert.ok(copy.transform.position.every((v, i) => Math.abs(v - [-0.88, 0, 2.62][i]) < 1e-10));
  const prop = createEntity('prop', { position: [0.23, 0, -0.17] });
  store.execute('entity.add', { entity: prop, snap: false });
  store.execute('entity.update', { id: prop.id, snap: false, patch: { transform: { position: [1.17, 0, -2.43] } } });
  assert.deepEqual(store.document.layout.entities[prop.id].transform.position, [1.17, 0, -2.43]);
  store.execute('entity.duplicate', { id: prop.id, snap: false, offset: [0.25, 0, 0.25] });
  const propCopy = Object.values(store.document.layout.entities).find(entity => entity.id !== prop.id);
  assert.deepEqual(propCopy.transform.position, [1.42, 0, -2.18]);
  assert.equal(store.document.layout.grid.snap, true);
  store.execute('token.update', { id: pair.token.id, patch: { transform: { position: [0.23, 0, -0.17] } } });
  assert.deepEqual(store.document.tokens[pair.token.id].transform.position, [0.5, 0, -0.5]);
});

test('floor moves carry supports without losing prop orientation; delete cascades tokens and undo restores', () => {
  const store = roomStore(), floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
  const prop = createEntity('prop', { surfaceId: floor.id, position: [0, 1, 0], rotation: [Math.sin(0.2), 0, 0, Math.cos(0.2)] });
  store.execute('entity.add', { entity: prop });
  const pair = createToken({ surfaceId: floor.id }); store.execute('token.add', pair);
  const before = clone(store.document), wall = Object.values(store.document.layout.entities).find(e => e.kind === 'wall');
  store.execute('entity.update', { id: floor.id, patch: { transform: { position: [1, 2, 3] } } });
  assert.deepEqual(store.document.layout.entities[prop.id].transform.rotation, prop.transform.rotation);
  assert.deepEqual(store.document.layout.entities[wall.id].transform.position, wall.transform.position.map((v, i) => v + [1, 2, 3][i]));
  assert.deepEqual(store.document.tokens[pair.token.id].transform.position, [1.5, 2, 3.5]);
  store.undo(); assert.deepEqual(store.document, before);
  store.execute('entity.remove', { id: floor.id });
  assert.equal(Object.keys(store.document.layout.entities).length, 0);
  assert.equal(Object.keys(store.document.tokens).length, 0);
  assert.equal(Object.keys(store.document.actors).length, 0);
  assert.equal(Object.keys(store.document.layout.areas).length, 0);
  store.undo(); assert.deepEqual(store.document, before);
});

test('duplication remaps internal IDs, including hosted doors, areas and material adjustments, while preserving assets', () => {
  const store = roomStore(), floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
  const prop = createEntity('prop', { surfaceId: floor.id, assetRef: { id: 'builtin-crate', revision: 2 } });
  store.execute('entity.add', { entity: prop });
  store.execute('token.add', createToken({ assetRef: { id: 'portrait', revision: 1 }, surfaceId: floor.id }));
  store.execute('look.update', { patch: { materialAdjustments: { [floor.id]: { base: { color: '#443322' } } } } });
  const original = store.document, copy = duplicateDocument(original);
  assert.notEqual(copy.id, original.id); assert.equal(copy.revision, 0);
  assert.ok(Object.keys(copy.layout.entities).every(key => !original.layout.entities[key]));
  const copiedDoor = Object.values(copy.layout.entities).find(e => e.kind === 'door');
  assert.ok(copy.layout.entities[copiedDoor.wallId]); assert.ok(copy.layout.entities[copiedDoor.surfaceId]);
  assert.deepEqual(Object.values(copy.layout.entities).find(e => e.kind === 'prop').assetRef, prop.assetRef);
  const copiedToken = Object.values(copy.tokens)[0]; assert.ok(copy.actors[copiedToken.actorId]);
  assert.deepEqual(copy.actors[copiedToken.actorId].assetRef, { id: 'portrait', revision: 1 });
  assert.equal(Object.keys(copy.look.materialAdjustments)[0], copiedDoor.surfaceId);
  store.execute('entity.duplicate', { id: floor.id });
  assert.equal(Object.keys(store.document.layout.entities).length, 14);
  assert.equal(Object.keys(store.document.layout.areas).length, 2);
  assert.equal(Object.keys(store.document.layout.groups).length, 2);
  assert.doesNotThrow(() => validateDocument(store.document));
});

test('environment only changes snapshot look and keeps manually added local lights and geometry', () => {
  const store = roomStore(), local = createLight({ name: 'Lanterna', intensity: 65 });
  store.execute('light.add', { light: local }); const layout = clone(store.document.layout);
  const allPointLights = Object.values(store.document.look.lights).filter(light => light.type === 'point');
  store.execute('environment.apply', { presetId: 'moonlight' });
  assert.deepEqual(store.document.layout, layout);
  for (const light of allPointLights) assert.deepEqual(store.document.look.lights[light.id], light);
  assert.deepEqual(store.document.sourceEnvironment, { id: 'moonlight', revision: 1 });
});

test('save response preserves later edits and confirmed revision survives undo/redo', () => {
  const store = roomStore(), sent = clone(store.document), sentVersion = store.editVersion;
  store.execute('scene.rename', { name: 'Editado durante o salvamento' });
  const receipt = { ...sent, revision: 1, updatedAt: new Date(Date.now() + 1).toISOString() };
  store.markSaved(receipt, sentVersion);
  assert.equal(store.document.name, 'Editado durante o salvamento'); assert.equal(store.document.revision, 1); assert.equal(store.dirty, true);
  store.undo(); assert.equal(store.document.revision, 1); assert.equal(store.dirty, false);
  store.redo(); assert.equal(store.document.revision, 1); assert.equal(store.dirty, true);
  store.markSaved({ ...clone(store.document), revision: 2 }, store.editVersion);
  assert.equal(store.dirty, false);
  store.undo(); assert.equal(store.document.revision, 2); assert.equal(store.dirty, true);
  assert.throws(() => store.markSaved(receipt, sentVersion), /obsoleta/);
});

test('validation rejects unavailable integrations, runtime/embedded media, nonfinite values and orphan references', () => {
  const document = createScene(); document.audioCue = { provider: 'jukebox' };
  assert.throws(() => validateDocument(document), error => error.status === 422 && /audioCue/.test(error.message));
  const bad = createScene(); bad.layout.grid.cellSize = NaN; assert.throws(() => validateDocument(bad), ValidationError);
  const actor = createToken({ assetRef: { id: 'blob:temporary', revision: 1 } });
  assert.throws(() => applyCommand(createScene(), { type: 'token.add', payload: actor }), ValidationError);
  const door = createEntity('door', { wallId: id() });
  assert.throws(() => applyCommand(createScene(), { type: 'entity.add', payload: { entity: door } }), ValidationError);
  const badMedia = createScene(); badMedia.image = 'data:image/png;base64,abc'; assert.throws(() => validateDocument(badMedia), ValidationError);
});
