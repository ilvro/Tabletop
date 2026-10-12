import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene, createEntity } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { worldFootprint, footprintsOverlap, localPoint } from '../src/domain/geometry.js';
import { proposeBuilding, proposeAddRoom, proposeRemoveRoom, proposeRedivide, planBuilding, describeBuilding, BUILDING_TYPES } from '../src/authoring/building.js';
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
    for (const cell of plan.rooms) assert.ok(cell.x1 - cell.x0 >= 1.7 - 1e-9 && cell.z1 - cell.z0 >= 1.7 - 1e-9, `${label}: ${cell.key} ${(cell.x1 - cell.x0).toFixed(1)}×${(cell.z1 - cell.z0).toFixed(1)}`);
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

test('the outline the person drew is used as is: position, rotation and level', () => {
  const document = createScene(), store = createSceneStore(document);
  const outline = createEntity('floor', { name: 'Contorno', width: 8, length: 13, position: [20, 0, -6], rotation: quaternionFromYaw(30) }); store.execute('entity.add', { entity: outline });
  const proposal = proposeBuilding(store.document, { floorId: outline.id, type: 'police', seed: 4, furnish: false, lighting: false, roof: false }, store.editVersion, catalog);
  assert.deepEqual(proposal.removals, [{ kind: 'entity', id: outline.id }]); store.execute('proposal.accept', { proposal }); validateDocument(store.document);
  const original = worldFootprint(outline, .01);
  for (const floor of of(store, 'floor')) { assert.ok(footprintsOverlap(worldFootprint(floor), original)); for (const corner of worldFootprint(floor)) { const [x, , z] = localPoint(outline, [corner[0], 0, corner[1]]); assert.ok(Math.abs(x) <= 4.01 && Math.abs(z) <= 6.51, 'rooms stay inside the outline'); } }
  assert.ok(of(store, 'floor').some(f => f.name === 'Recepção')); assert.equal(of(store, 'prop').length, 0);
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

const asset = name => catalog.find(a => a.id === `builtin-${name}`);
const put = (store, floor, name, position, yaw = 0) => { const a = asset(name), entity = createEntity('prop', { name: a.name, assetRef: { id: a.id, revision: a.revision }, footprint: a.footprint, position, rotation: quaternionFromYaw(yaw), surfaceId: floor.id, ...(a.supportHeight ? { supportHeight: a.supportHeight } : {}) }); store.execute('entity.add', { entity }); return entity.id; };

test('an outline the person already started is completed around what is there', () => {
  // A shell: four walls with their own door and window, and a few pieces placed where the person wants them.
  const store = createSceneStore(createScene()); store.execute('proposal.accept', { proposal: proposeRoom({ width: 15.6, length: 8.6, lighting: false }, store.editVersion) });
  const floor = of(store, 'floor')[0], shell = of(store, 'wall').map(w => w.id), door = of(store, 'door')[0], east = of(store, 'wall').find(w => w.name === 'Parede leste');
  store.execute('entity.add', { entity: createEntity('window', { wallId: east.id, offset: 4, width: 1.2, sill: .9, height: 1.1, surfaceId: floor.id }) });
  // Their door is near the east end, so that is where one comes in; the default plan would enter from the west.
  store.execute('entity.update', { id: door.id, patch: { offset: store.document.layout.entities[door.wallId].length - 2.5 } });
  const stove = put(store, floor, 'stove', [-6.4, 0, -3.6]), bed = put(store, floor, 'single-bed', [-5.5, 0, 2.6]), sofa = put(store, floor, 'sofa', [5, 0, -3.4]);
  const before = Object.fromEntries([stove, bed, sofa].map(key => [key, JSON.stringify(store.document.layout.entities[key].transform)]));
  const proposal = proposeBuilding(store.document, { floorId: floor.id, type: 'house', seed: 1, roof: false }, store.editVersion, catalog);
  store.execute('proposal.accept', { proposal }); validateDocument(store.document);
  const after = store.document.layout.entities, roomOf = key => after[after[key].surfaceId];
  // Nothing of the person is lost or moved; each piece now belongs to the room it stands in.
  for (const key of [stove, bed, sofa]) { assert.ok(after[key], 'kept'); assert.equal(JSON.stringify(after[key].transform), before[key]); assert.equal(roomOf(key).kind, 'floor'); }
  assert.equal(after[floor.id], undefined, 'the outline became the rooms');
  // The plan was fitted to the furniture: the stove is in the kitchen, the bed in a bedroom, the sofa in the living room.
  assert.match(roomOf(stove).name, /Cozinha/); assert.match(roomOf(bed).name, /Quarto/); assert.match(roomOf(sofa).name, /Sala de estar/);
  // And those rooms were completed around them, without a second stove, bed or sofa in the same room.
  for (const [key, id] of [[stove, 'builtin-stove'], [bed, 'builtin-single-bed'], [sofa, 'builtin-sofa']]) assert.equal(of(store, 'prop').filter(e => e.surfaceId === after[key].surfaceId && e.assetRef.id === id).length, 1);
  assert.ok(of(store, 'prop').some(e => e.surfaceId === after[stove].surfaceId && e.assetRef.id === 'builtin-sink'), 'the kitchen got its sink');
  // The shell stands: same four outside walls with their door and window, shared with the rooms, and no wall doubled on them.
  for (const key of shell) { assert.ok(after[key], 'wall kept'); assert.ok(after[key].floorIds.length >= 1 && after[key].floorIds.every(f => after[f]?.kind === 'floor')); }
  assert.ok(after[door.id]); assert.equal(of(store, 'window').filter(w => w.wallId === east.id).length, 1, 'no new window on a wall of the person');
  assert.equal(of(store, 'wall').filter(w => w.thickness === .2).length, 0, 'no outside wall was built over the person\'s');
  assert.equal(of(store, 'door').filter(d => d.name === 'Entrada').length, 0, 'the existing door is the way in');
  assert.match(roomOf(sofa).name, /Sala/); const entry = after[after[door.id].wallId]; assert.ok(entry.floorIds.includes(after[sofa].surfaceId), 'the entrance room is where the door is');
  assert.match(proposal.report.reasons.join(' '), /4 paredes suas foram mantidas/); assert.match(proposal.report.reasons.join(' '), /escolhida pelo que já estava/);
  store.undo(); assert.ok(store.document.layout.entities[floor.id]); assert.equal(store.document.layout.entities[stove].surfaceId, floor.id);
});

test('a missing room is added against a free side, sharing the wall and opening a door through it', () => {
  const { store } = build({ width: 12, length: 7, type: 'house', seed: 1, roof: false });
  const floorsBefore = of(store, 'floor'), wallsBefore = of(store, 'wall').map(w => w.id), anchor = floorsBefore.find(f => f.name.startsWith('Sala'));
  const reading = describeBuilding(store.document, anchor.id, catalog); assert.equal(reading.type.id, 'house');
  const proposal = proposeAddRoom(store.document, { floorId: anchor.id, template: 'garage', seed: 1 }, store.editVersion, catalog);
  store.execute('proposal.accept', { proposal }); validateDocument(store.document);
  const garage = of(store, 'floor').find(f => f.name === 'Garagem'); assert.ok(garage);
  for (const floor of floorsBefore) assert.equal(footprintsOverlap(worldFootprint(garage, -.05), worldFootprint(floor, -.05)), false, 'beside the building, not over it');
  assert.ok(floorsBefore.some(floor => footprintsOverlap(worldFootprint(garage, .1), worldFootprint(floor, .1))), 'touching it');
  // One wall of the building is now shared and carries the new door; three new walls close the room.
  const shared = of(store, 'wall').filter(w => wallsBefore.includes(w.id) && w.floorIds.includes(garage.id)); assert.equal(shared.length, 1);
  assert.ok(of(store, 'door').some(d => d.wallId === shared[0].id && d.name === 'Porta — Garagem'));
  assert.equal(of(store, 'wall').filter(w => !wallsBefore.includes(w.id)).length, 3);
  assert.ok(of(store, 'prop').some(e => e.surfaceId === garage.id && e.assetRef.id === 'builtin-workbench'));
  assert.equal(describeBuilding(store.document, anchor.id, catalog).rooms.length, floorsBefore.length + 1);
  // A room alone grows the same way, and a boxed-in one says so.
  const lone = createSceneStore(createScene()); lone.execute('proposal.accept', { proposal: proposeRoom({ width: 6, length: 5 }, lone.editVersion) });
  lone.execute('proposal.accept', { proposal: proposeFurnishing(lone.document, { floorId: of(lone, 'floor')[0].id, template: 'bedroom', seed: 1 }, lone.editVersion, catalog) });
  const bath = proposeAddRoom(lone.document, { floorId: of(lone, 'floor')[0].id, template: 'bathroom', seed: 1 }, lone.editVersion, catalog); lone.execute('proposal.accept', { proposal: bath }); validateDocument(lone.document);
  assert.equal(of(lone, 'floor').length, 2); assert.match(bath.report.reasons[0], /usando a parede que já existe/);
  assert.equal(describeBuilding(lone.document, of(lone, 'floor')[0].id, catalog).rooms.length, 2);
});

test('the person decides which rooms the building has; the plan is found for that list', () => {
  const custom = { hub: 'bar', rooms: ['kitchen', 'bathroom', 'bathroom', 'storage', 'office'] }, plan = planBuilding('house', 20, 10, 1, custom);
  assert.equal(plan.rooms[0].key, 'bar'); assert.deepEqual(plan.rooms.slice(1).map(room => room.key).sort(), [...custom.rooms].sort());
  assert.ok(Math.abs([...plan.rooms, plan.corridor].reduce((sum, c) => sum + (c.x1 - c.x0) * (c.z1 - c.z0), 0) - 200) < 1e-6);
  // A list too long for the outline keeps the first rooms and says how many were left out.
  const tight = planBuilding('house', 9, 5, 1, custom); assert.ok(tight.rooms.length - 1 < custom.rooms.length); assert.equal(tight.dropped, custom.rooms.length - (tight.rooms.length - 1));
  assert.deepEqual(tight.rooms.slice(1).map(room => room.key).sort(), custom.rooms.slice(0, tight.rooms.length - 1).sort());
  assert.throws(() => planBuilding('house', 20, 10, 1, { rooms: ['nope'] }), /inválida/);
  // No extra rooms at all is a single room.
  assert.equal(planBuilding('house', 12, 8, 1, { rooms: [] }).rooms.length, 1);
  const { store } = build({ width: 20, length: 10, type: 'house', seed: 1, roof: false, ...custom });
  const names = of(store, 'floor').map(f => f.name); assert.ok(names.includes('Bar')); assert.equal(names.filter(n => n.startsWith('Banheiro')).length, 2); assert.ok(!names.some(n => n.startsWith('Quarto')));
  assert.ok(of(store, 'prop').some(e => e.assetRef.id === 'builtin-bar-stool'));
});

test('a room is taken out of a building without opening its neighbours', () => {
  const { store } = build({ width: 15, length: 9, type: 'house', seed: 2, roof: false }), floors = of(store, 'floor'), bath = floors.find(f => f.name.startsWith('Banheiro'));
  const walls = of(store, 'wall'), shared = walls.filter(w => w.floorIds.includes(bath.id) && w.floorIds.length > 1), own = walls.filter(w => w.floorIds.includes(bath.id) && w.floorIds.length === 1);
  const door = of(store, 'door').find(d => d.surfaceId === bath.id), inside = of(store, 'prop').filter(e => e.surfaceId === bath.id).length; assert.ok(shared.length >= 1 && door && inside >= 2);
  const proposal = proposeRemoveRoom(store.document, { floorId: bath.id }, store.editVersion); store.execute('proposal.accept', { proposal }); validateDocument(store.document);
  const after = store.document.layout.entities;
  assert.equal(after[bath.id], undefined); assert.equal(after[door.id], undefined, 'the door that led to it is closed');
  for (const wall of shared) { assert.ok(after[wall.id], 'shared wall stays'); assert.ok(!after[wall.id].floorIds.includes(bath.id)); assert.equal(after[after[wall.id].surfaceId].kind, 'floor'); }
  for (const wall of own) assert.equal(after[wall.id], undefined, 'its own walls go');
  assert.equal(of(store, 'floor').length, floors.length - 1); assert.equal(of(store, 'prop').filter(e => e.surfaceId === bath.id).length, 0);
  // The neighbours keep everything they had.
  for (const floor of floors.filter(f => f.id !== bath.id)) assert.ok(after[floor.id]);
  store.undo(); assert.ok(store.document.layout.entities[bath.id] && store.document.layout.entities[door.id]);
});

test('a room is fitted inside a building that exists: same outline, interior divided again around what is there', () => {
  const { store } = build({ width: 16, length: 9, type: 'house', seed: 2, rooms: ['kitchen', 'bedroom'], hub: 'living', roof: false });
  const floors = of(store, 'floor'), anchor = floors.find(f => f.name.startsWith('Sala')), outer = of(store, 'wall').filter(w => w.thickness === .2).map(w => w.id), entrance = of(store, 'door').find(d => d.name === 'Entrada');
  assert.ok(!floors.some(f => f.name.startsWith('Banheiro')));
  // Something the person placed by hand, and a window of theirs on an outside wall.
  const kitchen = floors.find(f => f.name.startsWith('Cozinha')), mine = put(store, kitchen, 'piano', [kitchen.transform.position[0], 0, kitchen.transform.position[2]]), where = JSON.stringify(store.document.layout.entities[mine].transform);
  const stove = of(store, 'prop').find(e => e.assetRef.id === 'builtin-stove'), windows = of(store, 'window').map(w => w.id), box = f => worldFootprint(f);
  const span = list => { const pts = list.flatMap(box); return [Math.min(...pts.map(p => p[0])), Math.max(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[1]))].map(v => +v.toFixed(3)); };
  const before = span(floors), proposal = proposeRedivide(store.document, { floorId: anchor.id, add: 'bathroom', seed: 1 }, store.editVersion, catalog);
  assert.equal(proposal.fits, true); assert.match(proposal.report.reasons[0], /contorno do prédio fica como está/);
  store.execute('proposal.accept', { proposal }); validateDocument(store.document);
  const after = store.document.layout.entities, now = of(store, 'floor'), names = now.map(f => f.name);
  assert.deepEqual(span(now), before, 'the building covers exactly the same ground');
  for (const name of ['Sala de estar', 'Cozinha', 'Quarto', 'Banheiro']) assert.ok(names.some(n => n.startsWith(name)), name);
  // The shell is untouched: outside walls, the entrance and every window of theirs.
  for (const key of outer) assert.ok(after[key], 'outside wall kept'); assert.ok(after[entrance.id]); for (const key of windows) assert.ok(after[key], 'window kept');
  assert.equal(of(store, 'wall').filter(w => w.thickness === .2).length, 4);
  // What the person placed did not move and is in a room of the new plan; the kitchen is still where its stove is.
  assert.equal(JSON.stringify(after[mine].transform), where); assert.equal(after[after[mine].surfaceId].kind, 'floor');
  assert.ok(after[stove.id], 'the stove stays'); assert.match(after[after[stove.id].surfaceId].name, /Cozinha/);
  // Every room can be entered and the new one is furnished.
  const bath = now.find(f => f.name.startsWith('Banheiro'));
  for (const room of now.filter(f => f.name !== 'Corredor' && !f.name.startsWith('Sala de estar'))) assert.ok(of(store, 'door').some(d => after[d.wallId].floorIds.includes(room.id)), `${room.name} tem porta`);
  assert.ok(of(store, 'prop').some(e => e.surfaceId === bath.id && e.assetRef.id === 'builtin-toilet'));
  // No piece is left standing across a wall or in the corridor.
  for (const piece of of(store, 'prop').filter(e => now.some(f => f.id === e.surfaceId) && catalog.find(a => a.id === e.assetRef.id).bounds[1] > .1)) { const room = after[piece.surfaceId], [x, , z] = localPoint(room, piece.transform.position); assert.ok(Math.abs(x) <= room.width / 2 + .01 && Math.abs(z) <= room.length / 2 + .01, `${piece.name} em ${room.name}`); }
  store.undo(); assert.deepEqual(of(store, 'floor').map(f => f.id).sort(), floors.map(f => f.id).sort());
  // A building that is not a rectangle, or has no room to spare, says so.
  const grown = build({ width: 12, length: 7, type: 'house', seed: 1, roof: false }).store; grown.execute('proposal.accept', { proposal: proposeAddRoom(grown.document, { floorId: of(grown, 'floor')[0].id, template: 'garage' }, grown.editVersion, catalog) });
  assert.throws(() => proposeRedivide(grown.document, { floorId: of(grown, 'floor')[0].id, add: 'bathroom' }, grown.editVersion, catalog), /não formam um retângulo/);
  const tiny = build({ width: 7, length: 4, type: 'house', seed: 1, rooms: ['bedroom'], hub: 'living', roof: false }).store;
  assert.equal(proposeRedivide(tiny.document, { floorId: of(tiny, 'floor')[0].id, add: 'garage' }, tiny.editVersion, catalog).fits, false);
});
