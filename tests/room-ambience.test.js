import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene, createEntity, clone } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { localPoint } from '../src/domain/geometry.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { proposeFurnishing } from '../src/authoring/furnishing.js';
import { proposeRoomState } from '../src/authoring/room-state.js';
import { proposeRoomLighting, proposeRoomDetails, roomMood, suggestAtmosphere, FIXTURE_TAG, LIT_TAG } from '../src/authoring/room-ambience.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const asset = name => catalog.find(a => a.id === `builtin-${name}`);
function room(template, density = 'normal') {
  const store = createSceneStore(createScene());
  store.execute('proposal.accept', { proposal: proposeRoom({ width: 7, length: 6 }, store.editVersion) });
  const floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
  if (template) store.execute('proposal.accept', { proposal: proposeFurnishing(store.document, { floorId: floor.id, template, density, seed: 3 }, store.editVersion, catalog) });
  return { store, floor };
}
const put = (store, floor, name, position) => { const a = asset(name), entity = createEntity('prop', { name: a.name, assetRef: { id: a.id, revision: a.revision }, footprint: a.footprint, position, surfaceId: floor.id, ...(a.supportHeight ? { supportHeight: a.supportHeight } : {}) }); store.execute('entity.add', { entity }); return entity.id; };
const props = store => Object.values(store.document.layout.entities).filter(e => e.kind === 'prop');
const lights = store => Object.values((store.document.look ?? store.document.defaultLook).lights).filter(l => l.type === 'point');
const accept = (store, proposal) => { store.execute('proposal.accept', { proposal }); validateDocument(store.document); };
const light = (store, floor, mood = 'auto') => proposeRoomLighting(store.document, { floorId: floor.id, mood }, store.editVersion, catalog);

test('wall pieces follow their wall, on either face', () => {
  const { store, floor } = room('meeting'), board = props(store).find(e => e.assetRef.id === 'builtin-evidence-board'), wall = store.document.layout.entities[board.anchor.hostId];
  assert.equal(wall.kind, 'wall'); assert.equal(board.surfaceId, null);
  const depth = localPoint(wall, board.transform.position)[2];
  store.execute('entity.update', { id: wall.id, patch: { transform: { position: wall.transform.position.map((v, i) => v + [.6, 0, -.4][i]) } }, snap: false });
  const moved = store.document.layout.entities[board.id], after = store.document.layout.entities[wall.id];
  assert.ok(Math.abs(localPoint(after, moved.transform.position)[2] - depth) < 1e-6, 'keeps its distance from the wall');
  assert.ok(Math.hypot(moved.transform.position[0] - board.transform.position[0] - .6, moved.transform.position[2] - board.transform.position[2] + .4) < 1e-6);
  // Every wall of the room hangs pieces facing inwards.
  for (const recipe of ['bedroom', 'bathroom', 'classroom', 'workshop']) for (const seed of [1, 2, 3, 4]) {
    const made = room(); accept(made.store, proposeFurnishing(made.store.document, { floorId: made.floor.id, template: recipe, density: 'dense', seed }, made.store.editVersion, catalog));
    for (const piece of props(made.store).filter(e => e.anchor)) {
      const [x, , z] = piece.transform.position, yaw = Math.atan2(2 * (piece.transform.rotation[3] * piece.transform.rotation[1]), 1 - 2 * piece.transform.rotation[1] ** 2);
      assert.ok(x * Math.sin(yaw) + z * Math.cos(yaw) < 0, `${recipe}/${seed}: ${piece.name} faces the room`);
    }
  }
});

test('the mood of the light follows the kind of room and the state it was left in', () => {
  const home = room('living'), work = room('lab');
  assert.equal(roomMood(home.store.document, home.floor.id, catalog).id, 'warm'); assert.equal(roomMood(work.store.document, work.floor.id, catalog).id, 'cold');
  assert.equal(suggestAtmosphere(home.store.document, home.floor.id, catalog).id, 'tavern');
  accept(home.store, proposeRoomState(home.store.document, { floorId: home.floor.id, state: 'ritual', intensity: .8, seed: 2 }, home.store.editVersion, catalog));
  assert.equal(roomMood(home.store.document, home.floor.id, catalog).id, 'candles'); assert.equal(suggestAtmosphere(home.store.document, home.floor.id, catalog).id, 'ritual');
  accept(home.store, proposeRoomState(home.store.document, { floorId: home.floor.id, state: 'abandoned', intensity: .8, seed: 2 }, home.store.editVersion, catalog));
  assert.equal(roomMood(home.store.document, home.floor.id, catalog).id, 'dim');
  accept(work.store, proposeRoomState(work.store.document, { floorId: work.floor.id, state: 'crime', intensity: .8, seed: 2 }, work.store.editVersion, catalog));
  assert.equal(roomMood(work.store.document, work.floor.id, catalog).id, 'harsh');
  home.store.execute('environment.apply', { presetId: 'moonlight' }); assert.equal(suggestAtmosphere(home.store.document, home.floor.id, catalog), null, 'nothing to suggest once the scene uses it');
});

test('a room is lit by its own objects, fixtures are hung only where needed and bare light points give way', () => {
  const { store, floor } = room('living', 'dense'), bare = lights(store).length; assert.ok(bare >= 1);
  const lamp = props(store).find(e => e.assetRef.id === 'builtin-lamp'), tv = props(store).find(e => e.assetRef.id === 'builtin-crt-tv'), before = props(store).map(e => e.id);
  const proposal = light(store, floor); accept(store, proposal);
  assert.equal(lights(store).length, 0); assert.match(proposal.report.reasons[0], /aconchegante, porque é sala de estar/);
  const after = store.document.layout.entities;
  assert.equal(after[lamp.id].illumination.profile, 'lamp'); assert.ok(after[lamp.id].tags.includes(LIT_TAG)); assert.ok(after[lamp.id].illumination.position[1] > 1);
  assert.ok(after[tv.id].illumination.intensity < 20, 'a screen only glows');
  const fixtures = props(store).filter(e => e.tags.includes(FIXTURE_TAG)); assert.ok(fixtures.length >= 1 && fixtures.length <= 3);
  for (const fixture of fixtures) { assert.ok(fixture.transform.position[1] > 2.2); assert.equal(fixture.surfaceId, null); assert.ok(fixture.illumination.enabled); }
  for (const key of before) assert.ok(after[key]);
  // Another mood redoes the pass: fixtures are replaced, lamps go out, flames stay.
  const lantern = put(store, floor, 'kerosene-lantern', [0, 0, 0]); accept(store, light(store, floor, 'candles'));
  assert.equal(props(store).filter(e => e.tags.includes(FIXTURE_TAG)).length, 0);
  assert.equal(store.document.layout.entities[lamp.id].illumination ?? null, null); assert.ok(!store.document.layout.entities[lamp.id].tags.includes(LIT_TAG));
  assert.equal(store.document.layout.entities[lantern].illumination.profile, 'candle');
  accept(store, light(store, floor, 'cold')); const tubes = props(store).filter(e => e.tags.includes(FIXTURE_TAG));
  assert.ok(tubes.length >= 3); assert.ok(tubes.every(e => e.assetRef.id === 'builtin-backrooms-fluorescent'));
  // A light the person configured is theirs.
  const own = clone(store.document.layout.entities[lantern].illumination); store.execute('entity.update', { id: lantern, patch: { tags: [], illumination: { ...own, intensity: 77 } } });
  accept(store, light(store, floor, 'harsh')); assert.equal(store.document.layout.entities[lantern].illumination.intensity, 77);
  // After a ritual the circle itself glows and no ceiling fixture is hung.
  const rite = room('dining'); accept(rite.store, proposeRoomState(rite.store.document, { floorId: rite.floor.id, state: 'ritual', intensity: .9, seed: 1 }, rite.store.editVersion, catalog)); accept(rite.store, light(rite.store, rite.floor));
  assert.equal(props(rite.store).find(e => e.assetRef.id === 'builtin-ritual-circle').illumination.profile, 'ritual'); assert.equal(props(rite.store).filter(e => e.tags.includes(FIXTURE_TAG)).length, 0);
  assert.ok(props(rite.store).filter(e => e.illumination?.profile === 'candle').length >= 3);
});

test('details are read from the room and only add what is missing', () => {
  const { store, floor } = room(), north = Object.values(store.document.layout.entities).find(e => e.name === 'Parede norte');
  store.execute('entity.add', { entity: createEntity('window', { wallId: north.id, offset: 2, width: 1.4, sill: .9, height: 1.1, surfaceId: floor.id }) });
  const table = put(store, floor, 'dining-table', [0, 0, 0]), dresser = put(store, floor, 'dresser', [-3, 0, 1.5]);
  store.execute('entity.update', { id: dresser, patch: { transform: { rotation: quaternionFromYaw(90) } }, snap: false });
  const proposal = proposeRoomDetails(store.document, { floorId: floor.id, amount: .8, seed: 4 }, store.editVersion, catalog); accept(store, proposal);
  const curtain = props(store).find(e => e.assetRef.id === 'builtin-house-curtain'); assert.equal(curtain.anchor.hostId, north.id); assert.ok(Math.abs(curtain.anchor.offset[0] - 2) < 1e-6);
  const rug = props(store).find(e => e.assetRef.id === 'builtin-rug'); assert.ok(Math.hypot(rug.transform.position[0], rug.transform.position[2]) < .3, 'the rug lies under the table');
  assert.ok(props(store).some(e => e.surfaceId === table), 'something sits on the empty table'); assert.ok(props(store).some(e => e.surfaceId === dresser));
  assert.ok(props(store).some(e => e.assetRef.id === 'builtin-house-plant'));
  assert.throws(() => proposeRoomDetails(store.document, { floorId: floor.id, amount: .8, seed: 4 }, store.editVersion, catalog), /já tem os detalhes/);
});
