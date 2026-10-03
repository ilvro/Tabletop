import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createEntity, createLight, clone } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { proposeAnchoring } from '../src/authoring/anchoring.js';

for (const kind of ['wall', 'floor']) test(`batch anchoring to ${kind}: preview matches committed position, follows host and undoes together`, () => {
  const store = createSceneStore(createScene());
  const host = createEntity(kind, { position: [0, 3, 0] });
  const prop = createEntity('prop', { position: [1, 4, 2] });
  const light = createLight({ position: [2, 4, -1] });
  for (const entity of [host, prop]) store.execute('entity.add', { entity, snap: false });
  store.execute('light.add', { light, snap: false });
  const before = clone(store.document);
  const proposal = proposeAnchoring(store.document, { ids: [prop.id, host.id, light.id], hostId: host.id }, store.editVersion);
  assert.deepEqual(store.document, before); assert.equal(proposal.updates.length, 2);
  store.execute('proposal.accept', { proposal });
  const after = clone(store.document);
  assert.deepEqual(after.layout.entities[prop.id].transform.position, proposal.updates[0].patch.transform.position);
  assert.deepEqual(after.look.lights[light.id].position, proposal.updates[1].patch.position);
  assert.equal(after.layout.entities[prop.id].anchor.hostId, host.id);
  store.undo(); assert.deepEqual(store.document, before); store.redo(); assert.deepEqual(store.document, after);
  store.execute('entity.update', { id: host.id, patch: { transform: { ...host.transform, position: [3, 3, 0] } }, snap: false });
  assert.equal(store.document.layout.entities[prop.id].transform.position[0], after.layout.entities[prop.id].transform.position[0] + 3);
  assert.equal(store.document.look.lights[light.id].position[0], after.look.lights[light.id].position[0] + 3);
});

test('anchoring preserves locked objects and rejects locked hosts or ineligible selections', () => {
  const doc = createScene(), wall = createEntity('wall'), prop = createEntity('prop', { locked: true }), floor = createEntity('floor');
  doc.layout.entities = { [wall.id]: wall, [prop.id]: prop, [floor.id]: floor };
  assert.throws(() => proposeAnchoring(doc, { ids: [prop.id, floor.id], hostId: wall.id }, 0), /desbloqueado/);
  wall.locked = true;
  assert.throws(() => proposeAnchoring(doc, { ids: [prop.id], hostId: wall.id }, 0), /bloqueado/);
});

test('ceiling preview excludes props outside the floor or below a hole and preserves the valid subset', () => {
  const doc = createScene();
  const floor = createEntity('floor', { width: 8, length: 8, position: [0, 3, 0], holes: [[[-1,-1],[1,-1],[1,1],[-1,1]]] });
  const hole = createEntity('prop', { position: [0, 0, 0] }), outside = createEntity('prop', { position: [10, 0, 0] }), valid = createEntity('prop', { position: [2, 0, 2] });
  for (const entity of [floor, hole, outside, valid]) doc.layout.entities[entity.id] = entity;
  const proposal = proposeAnchoring(doc, { ids: [hole.id, outside.id, valid.id], hostId: floor.id }, 0);
  assert.equal(proposal.updates.length, 1); assert.equal(proposal.updates[0].id, valid.id); assert.equal(proposal.report.omissions.length, 2);
  const store = createSceneStore(doc); store.execute('proposal.accept', { proposal });
  assert.equal(store.document.layout.entities[valid.id].anchor.hostId, floor.id);
  assert.equal(store.document.layout.entities[hole.id].anchor, undefined);
});
