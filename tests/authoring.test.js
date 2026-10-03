import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene, createEntity, createToken, createLight, clone, id, duplicateDocument, createMapFromScene, createSceneFromMap, validateDocument, migrateDocument } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { polygonContainsPolygon, polygonIsSimple, worldFootprint, footprintsOverlap, supportHeightAt } from '../src/domain/geometry.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { proposeFurnishing } from '../src/authoring/furnishing.js';
import { proposePolish } from '../src/authoring/polish.js';
import { projectPresentation } from '../src/app/presentation.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
function fixture(options = {}) {
  const store = createSceneStore(createScene());
  store.execute('proposal.accept', { proposal: proposeRoom({ width: 8, length: 7, ...options }, store.editVersion) });
  const floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
  return { store, floor };
}
const composition = store => Object.values(store.document.layout.compositions)[0];
function furnish(store, floorId, options = {}) {
  return proposeFurnishing(store.document, { floorId, compositionId: composition(store)?.id, ...options }, store.editVersion, catalog);
}

test('v1 migration preserves identity/revision and leaves the input untouched; future schemas fail', () => {
  const old = createScene(); old.schemaVersion = 1; old.revision = 7; delete old.layout.compositions;
  const bytes = JSON.stringify(old), migrated = migrateDocument(old);
  assert.equal(JSON.stringify(old), bytes); assert.equal(migrated.id, old.id); assert.equal(migrated.revision, 7);
  assert.equal(migrated.schemaVersion, 2); assert.deepEqual(migrated.layout.compositions, {});
  assert.deepEqual(createSceneStore(old).document, migrated);
  old.schemaVersion = 99; assert.throws(() => migrateDocument(old), /schema/);
});

test('polygon validation rejects crossed/degenerate contours and furniture crossing a concave notch', () => {
  const notch = [[-3,-3],[3,-3],[3,3],[1,3],[1,0],[-1,0],[-1,3],[-3,3]];
  assert.ok(polygonIsSimple(notch)); assert.equal(polygonIsSimple([[0,0],[2,2],[0,2],[2,0]]), false);
  assert.equal(polygonIsSimple([[0,0],[1,0],[2,0]]), false);
  assert.equal(polygonContainsPolygon(notch, [[-2,1],[2,1],[2,2],[-2,2]]), false);
  const store = createSceneStore(createScene()), floor = createEntity('floor', { vertices: notch, position: [0,2,0] });
  store.execute('entity.add', { entity: floor });
  store.execute('entity.update', { id: floor.id, patch: { transform: { scale: [2,1,2] } } });
  assert.deepEqual(store.document.layout.entities[floor.id].vertices, notch.map(p => p.map(v => v * 2)));
  assert.equal(store.document.layout.entities[floor.id].width, 12);
});

test('stacked openings validate vertically; invalid wall resize is atomic and deleting the host removes windows', () => {
  const store = createSceneStore(createScene()), wall = createEntity('wall', { length: 6, height: 4 });
  const door = createEntity('door', { wallId: wall.id, offset: 3 }), window = createEntity('window', { wallId: wall.id, offset: 3, sill: 2.5, height: 1 });
  for (const entity of [wall,door,window]) store.execute('entity.add', { entity });
  const before = clone(store.document), version = store.editVersion;
  assert.throws(() => store.execute('entity.update', { id: window.id, patch: { sill: 1 } }), /sobrepõem/);
  assert.throws(() => store.execute('entity.update', { id: wall.id, patch: { height: 3 } }), /abertura/);
  assert.deepEqual(store.document, before); assert.equal(store.editVersion, version);
  store.execute('entity.remove', { id: wall.id }); assert.equal(Object.keys(store.document.layout.entities).length, 0);
  store.undo(); assert.deepEqual(store.document, before);
});

test('annotated furniture carries nested supports, tokens and lights; cycles/tilted supports are rejected', () => {
  const { store, floor } = fixture();
  const desk = createEntity('prop', { position: [0,0,0], surfaceId: floor.id, supportHeight: .82 });
  const tray = createEntity('prop', { position: [0,.82,0], surfaceId: desk.id, supportHeight: .1 });
  const pair = createToken({ position: [0,.92,0], surfaceId: tray.id });
  const light = createLight({ position: [0,1,0], surfaceId: desk.id });
  for (const entity of [desk,tray]) store.execute('entity.add', { entity, snap: false });
  store.execute('token.add', { ...pair, snap: false }); store.execute('light.add', { light });
  store.execute('entity.update', { id: desk.id, patch: { transform: { position: [2,1,3], scale: [1,2,1] } }, snap: false });
  assert.ok(store.document.layout.entities[tray.id].transform.position.every((v, i) => Math.abs(v - [2,2.64,3][i]) < 1e-8));
  assert.ok(Math.abs(store.document.tokens[pair.token.id].transform.position[1] - 2.74) < 1e-8);
  assert.ok(Math.abs(store.document.look.lights[light.id].position[1] - 2.82) < 1e-8);
  assert.throws(() => store.execute('entity.update', { id: desk.id, patch: { surfaceId: tray.id } }), /Ciclo/);
  assert.throws(() => store.execute('entity.update', { id: desk.id, patch: { transform: { rotation: [Math.sin(.1),0,0,Math.cos(.1)] } } }), /plano XZ/);
  assert.throws(() => store.execute('entity.clearSupport', { id: desk.id }), /apoiados/);
});

test('group locks protect descendants; hiding filters openings, supported tokens/lights and composition metadata', () => {
  const { store, floor } = fixture();
  store.execute('proposal.accept', { proposal: furnish(store, floor.id) });
  const pair = createToken({ surfaceId: floor.id, groupId: floor.groupId }); store.execute('token.add', pair);
  store.execute('group.update', { id: floor.groupId, patch: { locked: true } });
  assert.throws(() => store.execute('token.update', { id: pair.token.id, patch: { transform: { position: [1,0,1] } } }), /bloqueado/);
  assert.throws(() => store.execute('entity.remove', { id: floor.id }), /bloqueado/);
  store.execute('group.update', { id: floor.groupId, patch: { visible: false } });
  const publicDoc = projectPresentation(store.document);
  assert.equal(Object.keys(publicDoc.layout.entities).length, 0); assert.equal(Object.keys(publicDoc.tokens).length, 0);
  assert.equal(Object.keys(publicDoc.layout.compositions).length, 0);
  assert.equal(Object.values(publicDoc.look.lights).filter(l => l.type === 'point').length, 0);
  assert.doesNotThrow(() => validateDocument(publicDoc));
});

test('templates produce actual non-overlapping catalog furniture and bounded lights, without mutating the document', () => {
  for (const template of ['office','meeting','storage']) {
    const { store, floor } = fixture({ width: 12, length: 10 });
    const before = clone(store.document), proposal = furnish(store, floor.id, { template, density: 'dense', chairs: 8 });
    assert.deepEqual(store.document, before); assert.ok(proposal.entities.length >= 4);
    assert.ok(proposal.lights.length >= 4 && proposal.lights.length <= 9);
    for (const entity of proposal.entities) assert.ok(catalog.some(a => a.id === entity.assetRef.id));
    for (let i = 0; i < proposal.entities.length; i++) for (let j = i + 1; j < proposal.entities.length; j++) {
      assert.equal(footprintsOverlap(worldFootprint(proposal.entities[i], .08), worldFootprint(proposal.entities[j], .08)), false);
    }
    store.execute('proposal.accept', { proposal }); const accepted = clone(store.document);
    store.undo(); assert.deepEqual(store.document, before); store.redo(); assert.deepEqual(store.document, accepted);
    const repeated = furnish(store, floor.id, { template, density: 'dense', chairs: 8 });
    assert.equal(repeated.entities.length, 0); assert.equal(repeated.lights.length, 0); assert.equal(repeated.updates.length, 0);
  }
});

test('regeneration preserves changed fields and deleted slots, restores explicitly, and removes only untouched recipe items', () => {
  const { store, floor } = fixture(); store.execute('proposal.accept', { proposal: furnish(store, floor.id, { template: 'meeting', chairs: 4 }) });
  const first = composition(store), chair = first.slots['table.chair.1'].id, deleted = first.slots['table.chair.2'].id;
  store.execute('entity.update', { id: chair, patch: { name: 'Cadeira escolhida', material: { color: '#112233' }, transform: { position: [-2,0,-2], rotation: quaternionFromYaw(23) }, assetRef: { id: 'builtin-crate', revision: 1 } }, snap: false });
  store.execute('entity.remove', { id: deleted });
  const edited = clone(store.document.layout.entities[chair]);
  let proposal = furnish(store, floor.id, { template: 'meeting', chairs: 4, seed: 42 });
  assert.ok(proposal.report.suppressed.includes('table.chair.2')); assert.ok(proposal.report.kept.includes('table.chair.1'));
  store.execute('proposal.accept', { proposal });
  assert.deepEqual(store.document.layout.entities[chair], edited); assert.equal(store.document.layout.entities[deleted], undefined);
  assert.equal(composition(store).id, first.id);
  proposal = furnish(store, floor.id, { template: 'meeting', chairs: 4, seed: 42, restoreDeleted: true });
  assert.ok(proposal.entities.some(e => e.id === deleted)); store.execute('proposal.accept', { proposal });
  proposal = furnish(store, floor.id, { template: 'office', density: 'sparse' });
  assert.ok(proposal.report.kept.some(key => key.startsWith('table.chair.1'))); assert.ok(proposal.removals.some(op => op.id === deleted));
  store.execute('proposal.accept', { proposal }); assert.deepEqual(store.document.layout.entities[chair], edited);
  assert.equal(store.document.layout.entities[deleted], undefined);
});

test('small rooms report omissions; manual conflicts are reported and stale previews leave edits intact', () => {
  const { store, floor } = fixture({ width: 2, length: 2 });
  const proposal = furnish(store, floor.id, { template: 'meeting', chairs: 8 }); assert.ok(proposal.report.omissions.length > 0);
  store.execute('scene.rename', { name: 'Alterada' }); const before = clone(store.document);
  assert.throws(() => store.execute('proposal.accept', { proposal }), /cena mudou/); assert.deepEqual(store.document, before);
  const normal = fixture(); normal.store.execute('proposal.accept', { proposal: furnish(normal.store, normal.floor.id) });
  const deskId = composition(normal.store).slots['desk.main'].id;
  normal.store.execute('entity.update', { id: deskId, patch: { transform: { position: [100,0,100] } }, snap: false });
  const conflict = furnish(normal.store, normal.floor.id); assert.ok(conflict.report.conflicts.length > 0);
  normal.store.execute('proposal.accept', { proposal: conflict }); assert.deepEqual(normal.store.document.layout.entities[deskId].transform.position, [100,0,100]);
});

test('changing recipe retains a support with manually placed dependents; resizing updates the generation area', () => {
  const { store, floor } = fixture(); store.execute('proposal.accept', { proposal: furnish(store, floor.id, { template: 'meeting' }) });
  const tableId = composition(store).slots['table.main'].id;
  const pair = createToken({ position: [0,.82,0], surfaceId: tableId }); store.execute('token.add', { ...pair, snap: false });
  const proposal = furnish(store, floor.id, { template: 'storage' });
  assert.equal(proposal.removals.some(op => op.id === tableId), false);
  store.execute('proposal.accept', { proposal }); assert.ok(store.document.tokens[pair.token.id]); assert.ok(store.document.layout.entities[tableId]);
  const area = store.document.layout.areas[composition(store).areaId];
  store.execute('entity.update', { id: floor.id, patch: { width: floor.width * 2, length: floor.length * 2 } });
  const resized = store.document.layout.areas[area.id]; assert.equal(resized.width, area.width * 2); assert.equal(resized.length, area.length * 2);
});

test('duplication remaps live and deleted composition slots; map conversion retains editable recipes', () => {
  const { store, floor } = fixture(); store.execute('proposal.accept', { proposal: furnish(store, floor.id) });
  const original = composition(store), deleted = original.slots['desk.chair'].id;
  store.execute('entity.remove', { id: deleted });
  const copy = duplicateDocument(store.document), copied = Object.values(copy.layout.compositions)[0];
  assert.notEqual(copied.id, original.id); assert.notEqual(copied.slots['desk.chair'].id, deleted);
  assert.equal(copy.layout.entities[copied.slots['desk.chair'].id], undefined);
  assert.ok(copy.layout.areas[copied.areaId]);
  assert.ok(copy.layout.entities[copied.slots['desk.main'].baseline.surfaceId]);
  const map = createMapFromScene(store.document), scene = createSceneFromMap(map);
  assert.deepEqual(scene.layout.compositions, store.document.layout.compositions); assert.doesNotThrow(() => validateDocument(scene));
  store.execute('entity.duplicate', { id: floor.id }); assert.equal(Object.keys(store.document.layout.compositions).length, 2);
  assert.doesNotThrow(() => validateDocument(store.document));
});

test('polish aligns rotated bounds and distributes unequal widths with fixed endpoints as one undo', () => {
  const store = createSceneStore(createScene());
  const items = [[-5,1,1],[0,3,2],[6,2,3]].map(([x,w,z]) => createEntity('prop', { position: [x,0,z], footprint: [w,1], rotation: quaternionFromYaw(30) }));
  items.forEach(entity => store.execute('entity.add', { entity, snap: false }));
  const ids = items.map(e => e.id), before = clone(store.document);
  store.execute('proposal.accept', { proposal: proposePolish(store.document, { ids, axis: 'z', alignment: 'min' }, store.editVersion) });
  const minZ = e => Math.min(...worldFootprint(e).map(p => p[1]));
  assert.ok(ids.every(key => Math.abs(minZ(store.document.layout.entities[key]) - minZ(items[0])) < 1e-8));
  store.undo(); assert.deepEqual(store.document, before);
  store.execute('proposal.accept', { proposal: proposePolish(store.document, { ids, mode: 'distribute' }, store.editVersion) });
  const bounds = ids.map(key => worldFootprint(store.document.layout.entities[key]).map(p => p[0])).map(xs => [Math.min(...xs),Math.max(...xs)]);
  assert.ok(Math.abs((bounds[1][0] - bounds[0][1]) - (bounds[2][0] - bounds[1][1])) < 1e-8);
  assert.deepEqual(store.document.layout.entities[ids[0]].transform, items[0].transform); assert.deepEqual(store.document.layout.entities[ids[2]].transform, items[2].transform);
  store.undo(); assert.deepEqual(store.document, before);
});

test('rotation variation is repeatable, preserves tilt/position/scale, and refuses locked/support-dependent selections', () => {
  const store = createSceneStore(createScene());
  const items = [createEntity('prop', { rotation: [Math.sin(.2),0,0,Math.cos(.2)] }), createEntity('prop', { position: [3,0,0] })];
  items.forEach(entity => store.execute('entity.add', { entity, snap: false }));
  const options = { ids: items.map(e => e.id), mode: 'rotation', seed: 7, angle: 10 };
  const a = proposePolish(store.document, options), b = proposePolish(store.document, options);
  assert.deepEqual(a.updates, b.updates);
  const q = a.updates[0].patch.transform.rotation; assert.ok(Math.abs(Math.hypot(q[0],q[2]) - Math.sin(.2)) < 1e-8);
  assert.deepEqual(a.updates[0].patch.transform.position, items[0].transform.position);
  store.execute('entity.update', { id: items[1].id, patch: { locked: true } });
  assert.throws(() => proposePolish(store.document, options), /desbloqueados/);
});

test('access dimensions validate atomically, scale bakes into dimensions and scene/map copies preserve them', () => {
  const store = createSceneStore(createScene()), stairs = createEntity('stairs'), ramp = createEntity('ramp', { position: [4,0,0] });
  for (const entity of [stairs, ramp]) store.execute('entity.add', { entity });
  const before = clone(store.document);
  for (const steps of [0, 1.5, 129]) assert.throws(() => store.execute('entity.update', { id: stairs.id, patch: { steps } }));
  assert.throws(() => store.execute('entity.update', { id: ramp.id, patch: { height: -1 } }));
  assert.deepEqual(store.document, before);
  store.execute('entity.update', { id: stairs.id, patch: { transform: { scale: [2,3,4] } } });
  const scaled = store.document.layout.entities[stairs.id];
  assert.deepEqual([scaled.width, scaled.height, scaled.length], [3,4.5,12]); assert.deepEqual(scaled.transform.scale, [1,1,1]);
  store.undo(); assert.deepEqual(store.document, before); store.redo();
  const map = createMapFromScene(store.document); assert.deepEqual(createSceneFromMap(map).layout, map.layout);
  const copy = duplicateDocument(map); assert.equal(Object.values(copy.layout.entities).filter(e => ['stairs','ramp'].includes(e.kind)).length, 2);
});

test('tokens follow rotated access elevations after snap, movement and dimension changes', () => {
  for (const kind of ['stairs', 'ramp']) {
    const store = createSceneStore(createScene()), access = createEntity(kind, { width: 2, length: 4, height: 2, steps: 4, position: [3,1,-2], rotation: quaternionFromYaw(90) });
    store.execute('entity.add', { entity: access });
    const pair = createToken({ surfaceId: access.id, position: [3,99,-2] }); store.execute('token.add', { ...pair, snap: false });
    assert.equal(store.document.tokens[pair.token.id].transform.position[1], supportHeightAt(access, [3,0,-2]));
    store.execute('token.update', { id: pair.token.id, patch: { transform: { position: [3.8,99,-2.2] } } });
    let token = store.document.tokens[pair.token.id]; assert.equal(token.transform.position[1], supportHeightAt(access, token.transform.position));
    const before = clone(store.document);
    store.execute('entity.update', { id: access.id, patch: { height: 4, transform: { position: [5,2,0], rotation: quaternionFromYaw(180) } }, snap: false });
    token = store.document.tokens[pair.token.id]; const host = store.document.layout.entities[access.id];
    assert.equal(token.transform.position[1], supportHeightAt(host, token.transform.position));
    store.undo(); assert.deepEqual(store.document, before); store.redo();
    store.execute('entity.remove', { id: access.id }); assert.equal(store.document.tokens[pair.token.id], undefined); store.undo();
    assert.ok(store.document.tokens[pair.token.id]);
  }
});

test('access height edits carry objects on annotated furniture and keep lights above the slope', () => {
  const store = createSceneStore(createScene()), ramp = createEntity('ramp', { length: 4, height: 2 });
  store.execute('entity.add', { entity: ramp });
  const desk = createEntity('prop', { surfaceId: ramp.id, position: [0,0,0], supportHeight: .8 }); store.execute('entity.add', { entity: desk, snap: false });
  const pair = createToken({ surfaceId: desk.id, position: [0,1.8,0] }); store.execute('token.add', { ...pair, snap: false });
  const light = createLight({ surfaceId: ramp.id, position: [0,3,0] }); store.execute('light.add', { light });
  store.execute('entity.update', { id: ramp.id, patch: { height: 4 } });
  assert.equal(store.document.layout.entities[desk.id].transform.position[1], 2);
  assert.equal(store.document.tokens[pair.token.id].transform.position[1], 2.8);
  assert.equal(store.document.look.lights[light.id].position[1], 4);
});

test('window movement and rehosting respect the host lock and overlapping openings', () => {
  const store = createSceneStore(createScene()), wall = createEntity('wall', { length: 8 }), other = createEntity('wall', { length: 8, position: [0,0,5] });
  const a = createEntity('window', { wallId: wall.id, offset: 2 }), b = createEntity('window', { wallId: wall.id, offset: 5 });
  for (const entity of [wall,other,a,b]) store.execute('entity.add', { entity });
  const before = clone(store.document);
  assert.throws(() => store.execute('entity.update', { id: a.id, patch: { offset: 5 } }), /sobrepõem/); assert.deepEqual(store.document, before);
  store.execute('entity.update', { id: a.id, patch: { offset: 3, sill: 1.2 } }); store.undo(); assert.deepEqual(store.document, before); store.redo();
  store.execute('entity.update', { id: other.id, patch: { locked: true } });
  assert.throws(() => store.execute('entity.update', { id: a.id, patch: { wallId: other.id } }), /bloqueado/);
  store.execute('entity.update', { id: wall.id, patch: { locked: true } });
  assert.throws(() => store.execute('entity.update', { id: a.id, patch: { offset: 4 } }), /bloqueado/);
});
