import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene, createEntity, clone } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { worldFootprint, footprintsOverlap } from '../src/domain/geometry.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { proposeFurnishing, AMBIENCE_TAG } from '../src/authoring/furnishing.js';
import { proposeRoomState, WEAR_TAG } from '../src/authoring/room-state.js';
import { describeRoom } from '../src/authoring/room-insight.js';
import { CABLE_TAG } from '../src/authoring/room-ambience.js';
import { ROOM_STATES } from '../src/domain/room-states.js';
import { ROOM_RECIPES } from '../src/domain/room-recipes.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const asset = name => catalog.find(a => a.id === `builtin-${name}`);
function room(template, options = { width: 7, length: 6 }) {
  const store = createSceneStore(createScene());
  store.execute('proposal.accept', { proposal: proposeRoom(options, store.editVersion) });
  const floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
  if (template) store.execute('proposal.accept', { proposal: proposeFurnishing(store.document, { floorId: floor.id, template, density: 'normal', seed: 3 }, store.editVersion, catalog) });
  return { store, floor };
}
const put = (store, floor, name, position, yaw = 0) => { const a = asset(name), entity = createEntity('prop', { name: a.name, assetRef: { id: a.id, revision: a.revision }, footprint: a.footprint, position, surfaceId: floor.id, ...(a.supportHeight ? { supportHeight: a.supportHeight } : {}) }); store.execute('entity.add', { entity }); return entity.id; };
const props = store => Object.values(store.document.layout.entities).filter(e => e.kind === 'prop');
const state = (store, floor, name, options = {}) => proposeRoomState(store.document, { floorId: floor.id, state: name, intensity: .8, seed: 5, ...options }, store.editVersion, catalog);

test('the assistant recognises a room from what the person placed and says what is missing', () => {
  const { store, floor } = room();
  assert.equal(describeRoom(store.document, floor.id, catalog).notes[0].kind, 'empty');
  put(store, floor, 'stove', [-2, 0, -2]); put(store, floor, 'fridge', [2, 0, -2]);
  const insight = describeRoom(store.document, floor.id, catalog);
  assert.equal(insight.inferred[0].id, 'kitchen'); assert.ok(insight.inferred[0].missing.includes('sink'));
  const complete = insight.notes.find(note => note.kind === 'complete'); assert.equal(complete.template, 'kitchen'); assert.match(complete.text, /pia/);
  assert.ok(insight.notes.some(note => note.kind === 'dark') === false, 'the quick room has its own light');
  // Every furnished recipe is recognised as itself.
  for (const recipe of ROOM_RECIPES) { const made = room(recipe.id); assert.equal(describeRoom(made.store.document, made.floor.id, catalog).inferred[0].id, recipe.id, recipe.id); }
  const blocked = room(); const door = Object.values(blocked.store.document.layout.entities).find(e => e.kind === 'door'), wall = blocked.store.document.layout.entities[door.wallId];
  const crate = put(blocked.store, blocked.floor, 'crate', [wall.transform.position[0] + door.offset, 0, wall.transform.position[2] - .7]);
  assert.deepEqual(describeRoom(blocked.store.document, blocked.floor.id, catalog).notes.filter(n => n.kind === 'blocked').map(n => n.id), [crate]);
});

test('furnishing uses the person\'s own pieces instead of bringing duplicates, and never moves or owns them', () => {
  const { store, floor } = room(), table = put(store, floor, 'dining-table', [1.5, 0, -1], 0), before = clone(store.document.layout.entities[table]);
  const proposal = proposeFurnishing(store.document, { floorId: floor.id, template: 'dining', density: 'normal', chairs: 4, seed: 1 }, store.editVersion, catalog);
  assert.equal(proposal.entities.filter(e => e.assetRef.id === 'builtin-dining-table').length, 0);
  assert.match(proposal.report.reasons.join(' '), /aproveitado/);
  const chairs = proposal.entities.filter(e => e.assetRef.id === 'builtin-chair'); assert.equal(chairs.length, 4);
  for (const chair of chairs) assert.ok(Math.hypot(chair.transform.position[0] - 1.5, chair.transform.position[2] + 1) < 1.6, 'chairs go around the table where it is');
  store.execute('proposal.accept', { proposal }); validateDocument(store.document);
  assert.deepEqual(store.document.layout.entities[table], before);
  assert.ok(!Object.values(Object.values(store.document.layout.compositions)[0].slots).some(slot => slot.id === table));
  // Changing the recipe removes what the recipe brought, never the person's table.
  store.execute('proposal.accept', { proposal: proposeFurnishing(store.document, { compositionId: Object.values(store.document.layout.compositions)[0].id, template: 'storage' }, store.editVersion, catalog) });
  assert.deepEqual(store.document.layout.entities[table], before);
});

test('states reshape the room that is there, tag what they add and are replaced by the next one', () => {
  for (const recipe of ['living', 'office', 'kitchen', 'ward']) for (const entry of ROOM_STATES.filter(s => s.id !== 'tidy')) {
    const { store, floor } = room(recipe), label = `${recipe} · ${entry.id}`, own = props(store).map(e => e.id);
    const proposal = state(store, floor, entry.id);
    assert.equal(proposal.removals.length, 0, label); assert.ok(proposal.entities.length >= 2, `${label}: ${proposal.entities.length}`);
    assert.ok(proposal.entities.every(e => e.tags.includes(AMBIENCE_TAG)), label);
    store.execute('proposal.accept', { proposal }); validateDocument(store.document);
    for (const key of own) assert.ok(store.document.layout.entities[key], `${label}: nothing of the person is removed`);
    // Standing pieces still do not intersect and the doorway stays free.
    const solid = props(store).filter(e => e.surfaceId === floor.id && catalog.find(a => a.id === e.assetRef.id).bounds[1] > .1 && !['builtin-body-bag'].includes(e.assetRef.id)); // papers and stains lie under things
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) assert.equal(footprintsOverlap(worldFootprint(solid[i]), worldFootprint(solid[j])), false, `${label}: ${solid[i].name} × ${solid[j].name}`);
    // The next state takes the previous dressing away and brings its own.
    const next = state(store, floor, entry.id === 'ritual' ? 'crime' : 'ritual'), dressed = props(store).filter(e => e.tags.includes(AMBIENCE_TAG)).map(e => e.id).sort();
    assert.deepEqual(next.removals.map(op => op.id).filter(key => !store.document.layout.entities[key].cable).sort(), dressed.filter(key => !store.document.layout.entities[key].cable), label);
    store.execute('proposal.accept', { proposal: next }); validateDocument(store.document);
    // Tidying leaves exactly the person's objects, without the wear a state applied.
    store.execute('proposal.accept', { proposal: state(store, floor, 'tidy') }); validateDocument(store.document);
    assert.deepEqual(props(store).map(e => e.id).sort(), [...own].sort(), label);
    for (const entity of Object.values(store.document.layout.entities)) { assert.ok(!entity.tags?.includes(WEAR_TAG), label); assert.ok(!entity.material?.wear, `${label}: ${entity.name}`); }
  }
});

test('abandonment wears floor, walls and furniture but keeps wear the person applied', () => {
  const { store, floor } = room('office'), wall = Object.values(store.document.layout.entities).find(e => e.kind === 'wall');
  store.execute('entity.update', { id: wall.id, patch: { material: { wear: { enabled: true, type: 'rust', amount: .9, size: 1, seed: 7, placement: 'all', center: [.5, .5, .5], radius: .4, softness: .5, color: '#8a4829', roughness: .9, metalness: .08, relief: .012 } } } });
  const mine = clone(store.document.layout.entities[wall.id].material.wear);
  store.execute('proposal.accept', { proposal: state(store, floor, 'abandoned') });
  const after = store.document.layout.entities;
  assert.equal(after[floor.id].material.wear.type, 'grime'); assert.ok(after[floor.id].tags.includes(WEAR_TAG));
  assert.deepEqual(after[wall.id].material.wear, mine); assert.ok(!after[wall.id].tags.includes(WEAR_TAG));
  assert.ok(Object.values(after).filter(e => e.kind === 'wall' && e.tags.includes(WEAR_TAG)).length === 3);
  assert.ok(Object.values(after).some(e => e.kind === 'prop' && !e.tags.includes(AMBIENCE_TAG) && e.material.wear), 'furniture is worn too');
  store.execute('proposal.accept', { proposal: state(store, floor, 'tidy') });
  assert.deepEqual(store.document.layout.entities[wall.id].material.wear, mine);
  // More intensity, more change; same seed, same scene.
  const count = intensity => { const made = room('office'); return state(made.store, made.floor, 'abandoned', { intensity }).entities.length; };
  assert.ok(count(1) > count(.1)); assert.equal(count(.7), count(.7));
});

test('a ritual clears the centre by moving the person\'s furniture to the walls and uses their table as the altar', () => {
  const { store, floor } = room(), table = put(store, floor, 'dining-table', [0, 0, 0]), dresser = put(store, floor, 'dresser', [-2.6, 0, 1]);
  const proposal = state(store, floor, 'ritual'); store.execute('proposal.accept', { proposal }); validateDocument(store.document);
  const after = store.document.layout.entities, moved = after[table].transform.position, circle = props(store).find(e => e.assetRef.id === 'builtin-ritual-circle');
  assert.ok(circle); assert.ok(Math.hypot(moved[0] - circle.transform.position[0], moved[2] - circle.transform.position[2]) > 1.6, 'the table left the circle');
  assert.ok(Math.abs(moved[0]) > 2 || Math.abs(moved[2]) > 1.6, 'and stands by a wall');
  assert.ok(!props(store).some(e => e.assetRef.id === 'builtin-ritual-altar'), 'no altar is brought when a table can serve');
  const altarItems = props(store).filter(e => e.tags.includes(AMBIENCE_TAG) && [table, dresser].includes(e.surfaceId)).map(e => e.assetRef.id);
  assert.ok(altarItems.includes('builtin-ritual-book') && altarItems.includes('builtin-skull-display'));
  assert.equal(after[floor.id].material.wear.type, 'scorch'); assert.equal(after[floor.id].material.wear.placement, 'region');
  assert.match(proposal.report.reasons.join(' '), /afastad/);
  // An empty room gets an altar of its own.
  const empty = room(); assert.ok(state(empty.store, empty.floor, 'ritual').entities.some(e => e.assetRef.id === 'builtin-ritual-altar'));
});

test('an abandoned room gets wires hung from its ceiling as part of the proposal, and a tidy one takes them away', () => {
  const { store, floor } = room(null, { width: 10, length: 8 });
  const abandoned = state(store, floor, 'abandoned'), hung = abandoned.entities.filter(e => e.cable);
  assert.ok(hung.length >= 4, `${hung.length} cables`); assert.ok(hung.every(e => e.tags.includes(CABLE_TAG)));
  assert.equal(store.document.layout.entities && Object.values(store.document.layout.entities).filter(e => e.cable).length, 0, 'a proposal hangs nothing until it is accepted');
  store.execute('proposal.accept', { proposal: abandoned }); validateDocument(store.document);
  assert.ok(Object.values(store.document.layout.entities).filter(e => e.cable).length >= 4);
  const tidy = state(store, floor, 'tidy'); assert.ok(tidy.removals.filter(op => store.document.layout.entities[op.id]?.cable).length >= 4);
  store.execute('proposal.accept', { proposal: tidy }); assert.equal(Object.values(store.document.layout.entities).filter(e => e.cable).length, 0);
});
