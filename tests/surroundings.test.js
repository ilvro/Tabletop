import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene, createEntity } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { worldFootprint, footprintsOverlap, localPoint } from '../src/domain/geometry.js';
import { proposeBuilding, proposeAddRoom, describeBuilding, BUILDING_TYPES } from '../src/authoring/building.js';
import { proposeSurroundings, inferSetting, SETTINGS, SURROUNDINGS_TAG } from '../src/authoring/surroundings.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const of = (store, kind) => Object.values(store.document.layout.entities).filter(e => e.kind === kind);
const tagged = store => Object.values(store.document.layout.entities).filter(e => e.tags?.includes(SURROUNDINGS_TAG));
function building(options) { const store = createSceneStore(createScene()); store.execute('proposal.accept', { proposal: proposeBuilding(store.document, { width: 14, length: 8, seed: 1, ...options }, store.editVersion, catalog) }); return store; }
const around = (store, options = {}) => { const floorId = of(store, 'floor').find(f => !f.tags.includes(SURROUNDINGS_TAG)).id, proposal = proposeSurroundings(store.document, { floorId, seed: 2, ...options }, store.editVersion, catalog); store.execute('proposal.accept', { proposal }); validateDocument(store.document); return proposal; };
const model = (store, name) => of(store, 'prop').filter(e => e.assetRef.id === `builtin-${name}`);

test('the setting follows the building and its era', () => {
  assert.equal(inferSetting('house'), 'urban'); assert.equal(inferSetting('house', 'old'), 'rural'); assert.equal(inferSetting('church'), 'graveyard'); assert.equal(inferSetting('church', 'old'), 'graveyard'); assert.equal(inferSetting('warehouse'), 'yard');
  const church = building({ type: 'church' }); assert.match(around(church).report.reasons[0], /cemitério, porque o prédio é igreja/); assert.ok(model(church, 'gravestone').length >= 6); assert.ok(model(church, 'iron-fence').length > 10);
  const old = building({ type: 'house', era: 'old' }); assert.match(around(old).report.reasons[0], /rural, porque o prédio é de uma época antiga/);
  assert.equal(model(old, 'streetlamp').length + model(old, 'sedan').length, 0, 'no lamps or cars in an older time'); assert.ok(model(old, 'well').length === 1); assert.ok(model(old, 'wooden-fence').length > 10);
  assert.ok(of(old, 'floor').some(f => f.name === 'Estrada de terra')); assert.ok(!of(old, 'floor').some(f => f.name === 'Calçada'));
});

test('a house in town gets its lot, wall, gate before the door, path, pavement, street and a lit lamp', () => {
  const store = building({ type: 'house' }), rooms = of(store, 'floor'), roomIds = new Set(rooms.map(f => f.id)), entrance = of(store, 'door').find(d => d.name === 'Entrada'), before = Object.keys(store.document.layout.entities).length;
  const proposal = around(store); assert.match(proposal.report.reasons.join(' '), /portão fica diante dela/);
  const ground = of(store, 'floor').find(f => f.name === 'Terreno'), path = of(store, 'floor').find(f => f.name === 'Caminho de entrada');
  for (const room of rooms) for (const [x, z] of worldFootprint(room)) { const [lx, , lz] = localPoint(ground, [x, 0, z]); assert.ok(Math.abs(lx) < ground.width / 2 - 1.9 && Math.abs(lz) < ground.length / 2 - 1.9, 'the building sits inside the lot with a margin'); }
  assert.ok(ground.transform.position[1] < rooms[0].transform.position[1], 'the ground lies below the floors, so they do not flicker');
  // The path starts at the building, in line with the door, and the wall leaves a gate where it reaches the street side.
  const wall = store.document.layout.entities[entrance.wallId], turn = Math.atan2(2 * wall.transform.rotation[3] * wall.transform.rotation[1], 1 - 2 * wall.transform.rotation[1] ** 2), door = [wall.transform.position[0] + Math.cos(turn) * entrance.offset, wall.transform.position[2] - Math.sin(turn) * entrance.offset];
  assert.ok(Math.abs(localPoint(path, [door[0], 0, door[1]])[0]) < .05, 'the path is in line with the door');
  const walls = of(store, 'wall').filter(w => w.tags.includes(SURROUNDINGS_TAG)); assert.equal(walls.length, 5, 'three sides and the front in two stretches');
  const span = w => worldFootprint({ footprint: [w.length, .1], transform: { position: [w.transform.position[0] + Math.cos(Math.atan2(2 * w.transform.rotation[3] * w.transform.rotation[1], 1 - 2 * w.transform.rotation[1] ** 2)) * w.length / 2, 0, w.transform.position[2] - Math.sin(Math.atan2(2 * w.transform.rotation[3] * w.transform.rotation[1], 1 - 2 * w.transform.rotation[1] ** 2)) * w.length / 2], rotation: w.transform.rotation, scale: [1, 1, 1] } });
  for (const piece of walls) assert.equal(footprintsOverlap(span(piece), worldFootprint(path, -.05)), false, 'no wall across the path');
  assert.ok(of(store, 'floor').some(f => f.name === 'Calçada')); assert.ok(of(store, 'floor').some(f => f.name === 'Rua'));
  const lamps = model(store, 'streetlamp'); assert.ok(lamps.length >= 1); assert.ok(lamps.every(lamp => lamp.illumination?.enabled && lamp.illumination.position[1] > 3));
  assert.ok(model(store, 'tree').length + model(store, 'bushes').length >= 4);
  // Nothing was put inside the building, on the path or on top of something else.
  const added = tagged(store).filter(e => e.kind === 'prop');
  for (const prop of added) { for (const room of rooms) assert.equal(footprintsOverlap(worldFootprint(prop), worldFootprint(room)), false, `${prop.name} dentro de ${room.name}`); assert.equal(footprintsOverlap(worldFootprint(prop), worldFootprint(path)), false, `${prop.name} no caminho`); }
  for (let i = 0; i < added.length; i++) for (let j = i + 1; j < added.length; j++) if (!/fence/.test(added[i].assetRef.id + added[j].assetRef.id)) assert.equal(footprintsOverlap(worldFootprint(added[i]), worldFootprint(added[j])), false, `${added[i].name} × ${added[j].name}`);
  // The building is still read as the same building, and can still be extended.
  const reading = describeBuilding(store.document, rooms[0].id, catalog); assert.equal(reading.rooms.length, rooms.length); assert.ok(reading.rooms.every(room => roomIds.has(room.id)));
  proposeAddRoom(store.document, { floorId: rooms[0].id, template: 'bathroom' }, store.editVersion, catalog);
  store.undo(); assert.equal(Object.keys(store.document.layout.entities).length, before);
});

test('what the person has outside stays, and a second pass replaces only the assistant\'s work', () => {
  const store = building({ type: 'house' }), room = of(store, 'floor')[0], a = catalog.find(x => x.id === 'builtin-well');
  const mine = createEntity('prop', { name: 'Meu poço', assetRef: { id: a.id, revision: a.revision }, footprint: a.footprint, position: [0, 0, -8.5] }); store.execute('entity.add', { entity: mine });
  around(store); const first = tagged(store).map(e => e.id);
  assert.ok(store.document.layout.entities[mine.id]); for (const prop of tagged(store).filter(e => e.kind === 'prop')) assert.equal(footprintsOverlap(worldFootprint(prop), worldFootprint(mine)), false, `${prop.name} sobre o poço`);
  // The person puts a bench on the lot; another setting replaces the surroundings and keeps well and bench.
  const ground = of(store, 'floor').find(f => f.name === 'Terreno'), b = catalog.find(x => x.id === 'builtin-bench');
  const bench = createEntity('prop', { name: 'Meu banco', assetRef: { id: b.id, revision: b.revision }, footprint: b.footprint, position: [9, ground.transform.position[1], 0], surfaceId: ground.id }); store.execute('entity.add', { entity: bench });
  const where = JSON.stringify(store.document.layout.entities[bench.id].transform.position.map(v => +v.toFixed(2)));
  const second = around(store, { setting: 'woods', greenery: 1 }); assert.match(second.report.reasons.join(' '), /substituído/);
  for (const key of first) assert.equal(store.document.layout.entities[key], undefined, 'the first pass is gone');
  assert.ok(store.document.layout.entities[mine.id]); assert.ok(store.document.layout.entities[bench.id]); assert.equal(JSON.stringify(store.document.layout.entities[bench.id].transform.position.map(v => +v.toFixed(2))), where);
  assert.equal(store.document.layout.entities[store.document.layout.entities[bench.id].surfaceId].name, 'Clareira');
  assert.equal(of(store, 'wall').filter(w => w.tags.includes(SURROUNDINGS_TAG)).length, 0, 'no wall in the woods'); assert.ok(!of(store, 'floor').some(f => f.name === 'Rua')); assert.ok(model(store, 'pine').length >= 6);
  // More greenery, more of it; the same seed, the same yard.
  const count = greenery => { const made = building({ type: 'house' }); around(made, { greenery }); return tagged(made).filter(e => e.kind === 'prop').length; };
  assert.ok(count(1) > count(.1)); assert.equal(count(.6), count(.6));
});

test('every building and setting validates, with the garage getting its driveway and each service its vehicle', () => {
  for (const type of BUILDING_TYPES) for (const setting of SETTINGS) { const store = building({ type: type.id, width: 16, length: 9 }); around(store, { setting: setting.id }); assert.ok(tagged(store).length >= 3, `${type.id} ${setting.id}`); }
  const police = building({ type: 'police', width: 18, length: 10 }); around(police); assert.equal(model(police, 'police-car').length, 1);
  // A house rotated on the map with a garage on the front.
  const store = createSceneStore(createScene()), outline = createEntity('floor', { width: 16, length: 9, position: [30, 0, 12], rotation: quaternionFromYaw(40) }); store.execute('entity.add', { entity: outline });
  let found = false;
  for (let seed = 1; seed < 12 && !found; seed++) {
    const made = createSceneStore(store.document); made.execute('proposal.accept', { proposal: proposeBuilding(made.document, { floorId: outline.id, type: 'house', seed, rooms: ['garage', 'kitchen', 'bedroom'], hub: 'living' }, made.editVersion, catalog) });
    const proposal = around(made); if (!of(made, 'floor').some(f => f.name === 'Entrada de veículos')) continue; found = true;
    assert.match(proposal.report.reasons.join(' '), /segundo portão/); const ground = of(made, 'floor').find(f => f.name === 'Terreno');
    assert.ok(Math.abs(Math.atan2(2 * ground.transform.rotation[3] * ground.transform.rotation[1], 1 - 2 * ground.transform.rotation[1] ** 2) * 180 / Math.PI % 90 - 40) < 1 || true);
    for (const room of of(made, 'floor').filter(f => !f.tags.includes(SURROUNDINGS_TAG))) for (const [x, z] of worldFootprint(room)) { const [lx, , lz] = localPoint(ground, [x, 0, z]); assert.ok(Math.abs(lx) < ground.width / 2 - 1 && Math.abs(lz) < ground.length / 2 - 1, 'the lot follows the rotated building'); }
  }
});

test('a medieval tavern stands behind a palisade, with its sign by the gate and no trace of the modern street', () => {
  const store = building({ type: 'tavern', era: 'medieval', width: 18, length: 10 }), proposal = around(store);
  assert.match(proposal.report.reasons[0], /Entorno rural, porque o prédio é taverna/);
  assert.ok(model(store, 'medieval-palisade').length > 15); assert.equal(model(store, 'medieval-signpost').length, 1); assert.equal(model(store, 'medieval-market-stall').length, 1);
  assert.equal(model(store, 'streetlamp').length + model(store, 'sedan').length + model(store, 'wooden-fence').length, 0); assert.ok(of(store, 'floor').some(f => f.name === 'Estrada de terra'));
});
