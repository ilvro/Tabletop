import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene, createEntity } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { worldFootprint, footprintsOverlap, localPoint } from '../src/domain/geometry.js';
import { proposeBuilding, planBuilding, describeBuilding, BUILDING_TYPES } from '../src/authoring/building.js';
import { describeRoom } from '../src/authoring/room-insight.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { proposeFurnishing } from '../src/authoring/furnishing.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const build = (options, document = createScene()) => { const store = createSceneStore(document), proposal = proposeBuilding(store.document, options, store.editVersion, catalog); store.execute('proposal.accept', { proposal }); validateDocument(store.document); return { store, proposal }; };
const of = (store, kind) => Object.values(store.document.layout.entities).filter(e => e.kind === kind);

test('an outline is divided into the rooms of the building, covering it exactly, whatever its size', () => {
  for (const type of BUILDING_TYPES) for (const [long, short] of [[5, 3.5], [9, 5], [14, 9], [22, 12]]) for (const seed of [1, 2, 3]) {
    const plan = planBuilding(type.id, long, short, seed), cells = [...plan.rooms, ...(plan.corridor ? [plan.corridor] : [])], label = `${type.id} ${long}×${short}/${seed}`;
    assert.equal(plan.rooms[0].key, type.hub, label);
    assert.ok(Math.abs(cells.reduce((sum, c) => sum + (c.x1 - c.x0) * (c.z1 - c.z0), 0) - long * short) < 1e-6, `${label}: cobre o contorno`);
    for (const cell of plan.rooms) assert.ok(cell.x1 - cell.x0 >= 2.2 && cell.z1 - cell.z0 >= 2.2, `${label}: ${cell.key} ${(cell.x1 - cell.x0).toFixed(1)}×${(cell.z1 - cell.z0).toFixed(1)}`);
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) assert.ok(Math.min(cells[i].x1, cells[j].x1) - Math.max(cells[i].x0, cells[j].x0) < 1e-6 || Math.min(cells[i].z1, cells[j].z1) - Math.max(cells[i].z0, cells[j].z0) < 1e-6, `${label}: cômodos sobrepostos`);
  }
  assert.ok(planBuilding('house', 22, 12, 1).rooms.length > planBuilding('house', 9, 5, 1).rooms.length, 'a bigger outline holds more of the programme');
  assert.notDeepEqual(planBuilding('house', 14, 9, 1), planBuilding('house', 14, 9, 2));
});

test('a house is raised with shared walls, a door to every room, windows outside, a roof and furnished rooms', () => {
  const { store, proposal } = build({ width: 15, length: 9, type: 'house', seed: 2 });
  const floors = of(store, 'floor'), walls = of(store, 'wall'), doors = of(store, 'door'), windows = of(store, 'window'), rooms = floors.filter(f => f.name !== 'Corredor');
  assert.ok(rooms.length >= 4, proposal.report.reasons.join(' ')); assert.ok(floors.some(f => f.name === 'Corredor'));
  assert.equal(walls.filter(w => w.thickness === .2).length, 4, 'four outside walls');
  for (const wall of walls) assert.ok(wall.floorIds.length >= 1 && wall.floorIds.includes(wall.surfaceId));
  assert.ok(walls.some(w => w.floorIds.length >= 2), 'inner walls are shared by the rooms on both sides');
  // Every room can be entered, and the building too.
  for (const room of rooms) assert.ok(doors.some(d => store.document.layout.entities[d.wallId].floorIds.includes(room.id)), `${room.name} tem porta`);
  assert.ok(doors.some(d => d.name === 'Entrada')); assert.ok(windows.length >= rooms.length - 1);
  for (const window of windows) assert.equal(store.document.layout.entities[window.wallId].thickness, .2, 'windows only on outside walls');
  // Openings on a wall keep apart.
  for (const wall of walls) { const spans = [...doors, ...windows].filter(o => o.wallId === wall.id).map(o => [o.offset - o.width / 2, o.offset + o.width / 2]).sort((a, b) => a[0] - b[0]); for (let i = 1; i < spans.length; i++) assert.ok(spans[i][0] - spans[i - 1][1] >= .2); }
  // Rooms are what the plan says and are furnished as such.
  const props = of(store, 'prop'); assert.ok(props.length > 25);
  for (const [name, kind] of [['Sala de estar', 'living'], ['Cozinha', 'kitchen'], ['Banheiro', 'bathroom']]) { const room = rooms.find(f => f.name.startsWith(name)); assert.ok(room, name); assert.equal(describeRoom(store.document, room.id, catalog).inferred[0].id, kind); }
  const roofs = props.filter(e => e.assetRef.id === 'builtin-house-roof'); assert.equal(roofs.length, 1); assert.ok(roofs[0].transform.position[1] >= 2.7);
  assert.equal(store.document.layout.groups[roofs[0].groupId].name, 'Cobertura — Casa');
  // Lit by fixtures and objects, within the scene's budget.
  const lit = props.filter(e => e.illumination?.enabled); assert.ok(lit.length >= rooms.length && lit.length <= floors.length * 3);
  assert.equal(Object.values(store.document.look?.lights ?? store.document.defaultLook.lights).filter(l => l.type === 'point').length, 0);
  // Standing furniture stays inside its room and out of the others.
  const standing = props.filter(e => rooms.some(r => r.id === e.surfaceId) && catalog.find(a => a.id === e.assetRef.id).bounds[1] > .1);
  for (const piece of standing) { const room = store.document.layout.entities[piece.surfaceId], [x, , z] = localPoint(room, piece.transform.position); assert.ok(Math.abs(x) <= room.width / 2 && Math.abs(z) <= room.length / 2, `${piece.name} dentro de ${room.name}`); }
  store.undo(); assert.equal(of(store, 'floor').length, 0);
});

test('the outline the person drew is used as is: position, rotation and level, and must be empty', () => {
  const document = createScene(), store = createSceneStore(document);
  const outline = createEntity('floor', { name: 'Contorno', width: 8, length: 13, position: [20, 0, -6], rotation: quaternionFromYaw(30) }); store.execute('entity.add', { entity: outline });
  const proposal = proposeBuilding(store.document, { floorId: outline.id, type: 'police', seed: 4, furnish: false, lighting: false, roof: false }, store.editVersion, catalog);
  assert.deepEqual(proposal.removals, [{ kind: 'entity', id: outline.id }]); store.execute('proposal.accept', { proposal }); validateDocument(store.document);
  const original = worldFootprint(outline, .01);
  for (const floor of of(store, 'floor')) { assert.ok(footprintsOverlap(worldFootprint(floor), original)); for (const corner of worldFootprint(floor)) { const [x, , z] = localPoint(outline, [corner[0], 0, corner[1]]); assert.ok(Math.abs(x) <= 4.01 && Math.abs(z) <= 6.51, 'rooms stay inside the outline'); } }
  assert.ok(of(store, 'floor').some(f => f.name === 'Recepção')); assert.equal(of(store, 'prop').length, 0);
  // Something on the floor means it is not an empty outline.
  const used = createSceneStore(createScene()); used.execute('proposal.accept', { proposal: proposeRoom({ width: 8, length: 7 }, used.editVersion) });
  assert.throws(() => proposeBuilding(used.document, { floorId: of(used, 'floor')[0].id, type: 'house' }, used.editVersion, catalog), /precisa estar vazio/);
  const shaped = createSceneStore(createScene()), l = createEntity('floor', { vertices: [[-4, -3], [4, -3], [4, 0], [0, 0], [0, 3], [-4, 3]] }); shaped.execute('entity.add', { entity: l });
  assert.throws(() => proposeBuilding(shaped.document, { floorId: l.id, type: 'house' }, shaped.editVersion, catalog), /retangular/);
});

test('every kind of building validates, furnished, at several sizes', () => {
  for (const type of BUILDING_TYPES) for (const [width, length] of [[10, 6], [18, 10]]) {
    const { store, proposal } = build({ width, length, type: type.id, seed: 3, roof: false });
    assert.ok(of(store, 'prop').length >= 6, `${type.id} ${width}×${length}: ${proposal.report.omissions.join(' | ')}`);
  }
});

test('the assistant reads rooms built by hand as a building and says which room is missing', () => {
  const store = createSceneStore(createScene());
  for (const [template, x] of [['living', 0], ['kitchen', 7.4], ['bedroom', 14.8]]) {
    store.execute('proposal.accept', { proposal: proposeRoom({ width: 7, length: 6, center: [x, 0, 0], name: template }, store.editVersion) });
    store.execute('proposal.accept', { proposal: proposeFurnishing(store.document, { floorId: of(store, 'floor').at(-1).id, template, seed: 1 }, store.editVersion, catalog) });
  }
  store.execute('proposal.accept', { proposal: proposeRoom({ width: 5, length: 5, center: [60, 0, 0], name: 'longe' }, store.editVersion) });
  const floors = of(store, 'floor'), reading = describeBuilding(store.document, floors[0].id, catalog);
  assert.equal(reading.rooms.length, 3, 'only rooms that touch belong together'); assert.equal(reading.type.id, 'house');
  assert.deepEqual(reading.missing.map(room => room.id), ['bathroom']);
  assert.equal(describeBuilding(store.document, floors[3].id, catalog), null, 'a room alone is not a building');
});
