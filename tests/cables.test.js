import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene, createEntity } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { CABLE_ASSET, cableDefaults, cableStrands, cableRecipe, cableDepth, cableBetween, validateCable } from '../src/domain/cables.js';
import { proposeRoomCables, CABLE_TAG } from '../src/authoring/room-ambience.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≉ ${b}`);

test('wires run from one fixing point to the other, belly down, each a little apart from the rest', () => {
  const cable = cableDefaults({ span: [4, .5, 2], sag: .8, strands: 5 }), wires = cableStrands(cable);
  assert.equal(wires.length, 5);
  for (const wire of wires) { assert.ok(wire.length <= 16); assert.deepEqual(wire[0].map(v => +v.toFixed(6)), [0, 0, 0]); wire.at(-1).forEach((v, axis) => near(v, cable.span[axis])); assert.ok(Math.min(...wire.map(p => p[1])) < -.3, 'the middle hangs below both ends'); }
  assert.notDeepEqual(wires[0][7], wires[1][7]); assert.deepEqual(cableStrands(cable), wires, 'the same settings draw the same cable');
  assert.notDeepEqual(cableStrands({ ...cable, seed: 2 }), wires);
  const single = cableStrands(cableDefaults({ span: [2, 0, 0], sag: .4, strands: 1 }))[0]; near(Math.min(...single.map(p => p[1])), -.4, .01); near(cableDepth(cableDefaults({ span: [2, 0, 0], sag: .4, strands: 1 })), .4, .01);
  const recipe = cableRecipe(cable); assert.equal(recipe.parts.length, 5); assert.ok(recipe.parts.every(part => part.shape === 'rope' && part.radius >= .005 && part.material === 'cable'));
});

test('a loose cable drops from its point; settings out of range and cables on other models are refused', () => {
  const drop = cableStrands(cableDefaults({ mode: 'drop', span: [0, -1.5, 0], strands: 1, sag: .4 }))[0]; near(drop.at(-1)[1], -1.5); assert.ok(Math.hypot(drop.at(-1)[0], drop.at(-1)[2]) <= .11);
  for (const bad of [{ strands: 0 }, { strands: 2.5 }, { radius: .5 }, { sag: -1 }, { span: [0, 0, 0] }, { mode: 'knot' }, { extra: 1 }]) assert.throws(() => validateCable(cableDefaults(bad)), undefined, JSON.stringify(bad));
  assert.throws(() => cableBetween([0, 2, 0], [0, 2, 0]));
  const store = createSceneStore(createScene()), asset = catalog.find(a => a.id === CABLE_ASSET); assert.ok(asset, 'the library lists the cable');
  store.execute('entity.add', { entity: createEntity('prop', { assetRef: { id: asset.id, revision: asset.revision }, footprint: [.2, .2], ...cableBetween([0, 2.5, 0], [3, 2.5, 1]) }), snap: false }); validateDocument(store.document);
  const crate = catalog.find(a => a.id === 'builtin-crate');
  assert.throws(() => store.execute('entity.add', { entity: createEntity('prop', { assetRef: { id: crate.id, revision: crate.revision }, cable: cableDefaults() }) }), /Cabos pendentes/);
});

test('the assistant hangs cables under the ceiling of a room, clear of head height, and replaces its own on the next pass', () => {
  const store = createSceneStore(createScene()); store.execute('proposal.accept', { proposal: proposeRoom({ width: 12, length: 8, height: 4, door: true, lighting: false }, store.editVersion) });
  const floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor'), hung = () => Object.values(store.document.layout.entities).filter(e => e.cable);
  const first = proposeRoomCables(store.document, { floorId: floor.id, amount: .6, seed: 1 }, store.editVersion, catalog); store.execute('proposal.accept', { proposal: first }); validateDocument(store.document);
  assert.ok(hung().length >= 8, first.report.reasons.join(' ')); assert.ok(hung().every(e => e.tags.includes(CABLE_TAG)));
  for (const entity of hung()) {
    near(entity.transform.position[1], 3.96, .001); assert.ok(entity.transform.position[1] - cableDepth(entity.cable) >= 1.85, 'nobody walks into a cable');
    const [x, , z] = entity.transform.position, [dx, , dz] = entity.cable.mode === 'drop' ? [0, 0, 0] : entity.cable.span; for (const [px, pz] of [[x, z], [x + dx, z + dz]]) assert.ok(Math.abs(px) <= 6.2 && Math.abs(pz) <= 4.2, 'both ends stay inside the room');
  }
  assert.ok(hung().some(e => e.cable.mode === 'drop')); assert.ok(proposeRoomCables(store.document, { floorId: floor.id, amount: 1, seed: 1 }, store.editVersion, catalog).entities.length > proposeRoomCables(store.document, { floorId: floor.id, amount: .1, seed: 1 }, store.editVersion, catalog).entities.length);
  // One the person locks stays; the rest are redone.
  const kept = hung()[0]; store.execute('entity.update', { id: kept.id, patch: { locked: true } });
  const count = hung().length, second = proposeRoomCables(store.document, { floorId: floor.id, amount: .6, seed: 2 }, store.editVersion, catalog); store.execute('proposal.accept', { proposal: second });
  assert.ok(hung().some(e => e.id === kept.id)); assert.equal(second.removals.length, count - 1); assert.deepEqual(second.report.kept, [kept.id]);
  store.undo(); assert.equal(hung().length, count);
});
