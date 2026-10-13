import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { proposeFurnishing } from '../src/authoring/furnishing.js';
import { proposeRoomState } from '../src/authoring/room-state.js';
import { proposeRoomLighting, roomMood } from '../src/authoring/room-ambience.js';
import { proposeBuilding } from '../src/authoring/building.js';
import { describeRoom } from '../src/authoring/room-insight.js';
import { eraAsset } from '../src/domain/room-eras.js';
import { ROOM_RECIPES } from '../src/domain/room-recipes.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const modern = ['Contemporânea', 'Décadas de 1970–1990'], eraOf = entity => catalog.find(a => a.id === entity.assetRef.id).era;
const props = store => Object.values(store.document.layout.entities).filter(e => e.kind === 'prop');
function room(template, era) {
  const store = createSceneStore(createScene()); store.execute('proposal.accept', { proposal: proposeRoom({ width: 7, length: 6 }, store.editVersion) });
  const floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
  store.execute('proposal.accept', { proposal: proposeFurnishing(store.document, { floorId: floor.id, template, density: 'dense', seed: 2, era }, store.editVersion, catalog) }); validateDocument(store.document);
  return { store, floor };
}

test('an older era replaces or leaves out what the period did not have, in every room', () => {
  assert.equal(eraAsset('modern', 'computer', catalog), 'computer'); assert.equal(eraAsset('old', 'computer', catalog), null);
  assert.equal(eraAsset('old', 'lamp', catalog), 'church-candelabra'); assert.equal(eraAsset('old', 'dining-table', catalog), 'dining-table');
  for (const recipe of ROOM_RECIPES) {
    const { store, floor } = room(recipe.id, 'old'), pieces = props(store);
    // The curtain is the one modern-made model kept on purpose.
    for (const piece of pieces) assert.ok(!modern.includes(eraOf(piece)) || piece.assetRef.id === 'builtin-house-curtain', `${recipe.id}: ${piece.name}`);
    assert.equal(Object.values(store.document.layout.compositions)[0].parameters.era, 'old');
    // What stood on a piece that the era dropped does not float where it was.
    for (const piece of pieces.filter(e => e.surfaceId && e.surfaceId !== floor.id)) assert.ok(store.document.layout.entities[piece.surfaceId].supportHeight > 0, `${recipe.id}: ${piece.name}`);
  }
  // Rooms that are mostly furniture keep their character.
  for (const template of ['bedroom', 'dining', 'living', 'kitchen', 'library', 'chapel', 'ritual', 'bar']) assert.ok(props(room(template, 'old').store).length >= 5, template);
  // The room is still recognised for what it is, and a modern recipe is unchanged.
  const kitchen = room('kitchen', 'old'); assert.equal(describeRoom(kitchen.store.document, kitchen.floor.id, catalog).inferred[0].id, 'kitchen');
  assert.equal(Object.values(room('kitchen').store.document.layout.compositions)[0].parameters.era, undefined);
});

test('the era carries on to regeneration, light, states and buildings', () => {
  const { store, floor } = room('living', 'old'), composition = Object.values(store.document.layout.compositions)[0];
  const again = proposeFurnishing(store.document, { compositionId: composition.id, template: 'living', density: 'dense', seed: 2 }, store.editVersion, catalog);
  assert.equal(again.entities.length + again.updates.length + again.removals.length, 0, 'regenerating keeps the era');
  assert.equal(roomMood(store.document, floor.id, catalog).id, 'candles');
  store.execute('proposal.accept', { proposal: proposeRoomLighting(store.document, { floorId: floor.id }, store.editVersion, catalog) }); validateDocument(store.document);
  const lit = props(store).filter(e => e.illumination?.enabled); assert.ok(lit.length >= 1); assert.ok(lit.every(e => ['candle', 'torch'].includes(e.illumination.profile)), 'only flames');
  assert.ok(!props(store).some(e => ['builtin-house-ceiling-lamp', 'builtin-backrooms-fluorescent'].includes(e.assetRef.id)));
  store.execute('proposal.accept', { proposal: proposeRoomState(store.document, { floorId: floor.id, state: 'crime', intensity: .9, seed: 1 }, store.editVersion, catalog) });
  assert.ok(!props(store).some(e => ['builtin-traffic-cone', 'builtin-camera-tripod'].includes(e.assetRef.id)), 'no cones or cameras in an old crime scene'); assert.ok(props(store).some(e => e.assetRef.id === 'builtin-blood-pool'));
  const built = createSceneStore(createScene()); built.execute('proposal.accept', { proposal: proposeBuilding(built.document, { width: 15, length: 9, type: 'house', seed: 1, era: 'old' }, built.editVersion, catalog) }); validateDocument(built.document);
  for (const piece of props(built)) assert.ok(!modern.includes(eraOf(piece)) || ['builtin-house-curtain', 'builtin-house-roof'].includes(piece.assetRef.id), piece.name);
  const walls = Object.values(built.document.layout.entities).filter(e => e.kind === 'wall' && e.thickness === .2); assert.ok(walls.every(w => w.material.texture === 'stone'));
  assert.ok(!Object.values(built.document.layout.entities).some(e => e.kind === 'floor' && ['tile', 'carpet', 'concrete'].includes(e.material.texture)));
});

test('the medieval era furnishes every room with medieval pieces, lights by torch and builds taverns and keeps', () => {
  const allowed = e => ['Medieval', 'Antiguidade', 'Atemporal', 'Colonial / século XIX'].includes(eraOf(e)) || e.assetRef.id.startsWith('builtin-church-') || ['builtin-house-curtain', 'builtin-gravestone', 'builtin-spirit-board'].includes(e.assetRef.id);
  for (const recipe of ROOM_RECIPES) { const { store } = room(recipe.id, 'medieval'); for (const piece of props(store)) assert.ok(allowed(piece), `${recipe.id}: ${piece.name} (${eraOf(piece)})`); }
  // The everyday rooms are made of the kit, not of what was left over.
  const ids = template => props(room(template, 'medieval').store).map(e => e.assetRef.id);
  assert.ok(ids('bedroom').includes('builtin-medieval-bed') && ids('bedroom').includes('builtin-medieval-cupboard')); assert.ok(ids('kitchen').includes('builtin-medieval-hearth') && ids('kitchen').includes('builtin-medieval-trestle-table'));
  assert.ok(ids('office').includes('builtin-medieval-stool')); assert.ok(ids('living').includes('builtin-medieval-bench'));
  // The rooms of the kit itself.
  const tavern = room('tavern', 'medieval'), made = props(tavern.store).map(e => e.assetRef.id);
  for (const id of ['medieval-trestle-table', 'medieval-bench', 'medieval-hearth', 'medieval-barrel-rack', 'medieval-tankards', 'medieval-wall-torch']) assert.ok(made.includes(`builtin-${id}`), id);
  assert.equal(describeRoom(tavern.store.document, tavern.floor.id, catalog).inferred[0].id, 'tavern'); assert.equal(roomMood(tavern.store.document, tavern.floor.id, catalog).id, 'candles');
  tavern.store.execute('proposal.accept', { proposal: proposeRoomLighting(tavern.store.document, { floorId: tavern.floor.id }, tavern.store.editVersion, catalog) }); validateDocument(tavern.store.document);
  const lit = props(tavern.store).filter(e => e.illumination?.enabled); assert.ok(lit.some(e => e.assetRef.id === 'builtin-medieval-hearth')); assert.ok(lit.every(e => ['candle', 'torch'].includes(e.illumination.profile)));
  assert.ok(props(room('throne', 'medieval').store).some(e => e.assetRef.id === 'builtin-medieval-throne')); assert.ok(props(room('forge', 'medieval').store).some(e => e.assetRef.id === 'builtin-medieval-anvil'));
  for (const type of ['tavern', 'keep']) {
    const built = createSceneStore(createScene()); built.execute('proposal.accept', { proposal: proposeBuilding(built.document, { width: 18, length: 10, type, seed: 1, era: 'medieval' }, built.editVersion, catalog) }); validateDocument(built.document);
    const floors = Object.values(built.document.layout.entities).filter(e => e.kind === 'floor'), walls = Object.values(built.document.layout.entities).filter(e => e.kind === 'wall');
    assert.ok(floors.some(f => f.name === (type === 'tavern' ? 'Taverna' : 'Sala do trono')), type); assert.ok(walls.every(w => w.material.texture === 'stone'), 'stone inside and out');
    for (const piece of props(built)) assert.ok(allowed(piece) || piece.assetRef.id === 'builtin-house-roof', `${type}: ${piece.name}`);
  }
});

test('the futuristic era furnishes rooms with its kit, lights them cold and builds a base', () => {
  const past = ['Colonial / século XIX', 'Início do século XX', 'Décadas de 1970–1990', 'Antiguidade', 'Medieval'];
  for (const recipe of ROOM_RECIPES) { const { store } = room(recipe.id, 'future'); for (const piece of props(store)) assert.ok(!past.includes(eraOf(piece)), `${recipe.id}: ${piece.name} (${eraOf(piece)})`); }
  const ids = template => props(room(template, 'future').store).map(e => e.assetRef.id);
  assert.ok(ids('bedroom').includes('builtin-future-bunk') && ids('bedroom').includes('builtin-future-locker')); assert.ok(ids('office').includes('builtin-future-console') && ids('office').includes('builtin-future-chair'));
  assert.ok(ids('ward').includes('builtin-future-medbed')); assert.ok(ids('kitchen').includes('builtin-future-synthesizer')); assert.ok(ids('storage').includes('builtin-future-crate'));
  // Its own rooms, recognised as themselves, and never used by the older eras.
  for (const [template, piece] of [['bridge', 'future-holo-table'], ['quarters', 'future-bunk'], ['medbay', 'future-cryo-pod'], ['reactor', 'future-reactor'], ['cargo', 'future-crate']]) {
    const made = room(template, 'future'); assert.ok(props(made.store).some(e => e.assetRef.id === `builtin-${piece}`), template); assert.equal(describeRoom(made.store.document, made.floor.id, catalog).inferred[0].id, template);
  }
  assert.equal(eraAsset('medieval', 'future-console', catalog), null); assert.equal(eraAsset('old', 'future-bunk', catalog), null); assert.equal(eraAsset('future', 'medieval-throne', catalog), null);
  const bridge = room('bridge', 'future'); assert.equal(roomMood(bridge.store.document, bridge.floor.id, catalog).id, 'cold');
  bridge.store.execute('proposal.accept', { proposal: proposeRoomLighting(bridge.store.document, { floorId: bridge.floor.id }, bridge.store.editVersion, catalog) }); validateDocument(bridge.store.document);
  assert.ok(props(bridge.store).some(e => e.assetRef.id === 'builtin-future-ceiling-lamp' && e.illumination?.enabled), 'light panels, not office tubes'); assert.ok(!props(bridge.store).some(e => e.assetRef.id === 'builtin-backrooms-fluorescent'));
  const built = createSceneStore(createScene()); built.execute('proposal.accept', { proposal: proposeBuilding(built.document, { width: 22, length: 12, type: 'station', seed: 1, era: 'future' }, built.editVersion, catalog) }); validateDocument(built.document);
  const names = Object.values(built.document.layout.entities).filter(e => e.kind === 'floor').map(f => f.name); for (const name of ['Ponte de comando', 'Alojamento', 'Sala do reator']) assert.ok(names.some(n => n.startsWith(name)), name);
  for (const piece of props(built)) assert.ok(!past.includes(eraOf(piece)) || piece.assetRef.id === 'builtin-house-roof', piece.name);
  assert.ok(Object.values(built.document.layout.entities).filter(e => e.kind === 'wall').every(w => w.material.texture === 'paint'));
});
