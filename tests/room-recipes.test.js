import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene, createEntity, clone } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { worldFootprint, footprintsOverlap } from '../src/domain/geometry.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { proposeFurnishing } from '../src/authoring/furnishing.js';
import { ROOM_RECIPES, ROOM_GROUPS } from '../src/domain/room-recipes.js';
import { roomFrame } from '../src/authoring/room-layout.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const asset = entity => catalog.find(a => a.id === entity.assetRef.id);
function room(options) {
  const store = createSceneStore(createScene());
  store.execute('proposal.accept', { proposal: proposeRoom(options, store.editVersion) });
  return { store, floor: Object.values(store.document.layout.entities).find(e => e.kind === 'floor') };
}
const standing = (entities, floor) => entities.filter(e => e.surfaceId === floor.id && e.transform.position[1] === floor.transform.position[1] && asset(e).bounds[1] > .05);

test('every recipe names catalogue models, known rules and references placed earlier', () => {
  const rules = ['wall', 'corner', 'center', 'front', 'behind', 'beside', 'around', 'ring', 'on', 'under', 'grid', 'free'];
  assert.ok(ROOM_RECIPES.length >= 20); assert.equal(new Set(ROOM_RECIPES.map(r => r.id)).size, ROOM_RECIPES.length);
  for (const recipe of ROOM_RECIPES) {
    assert.ok(ROOM_GROUPS.includes(recipe.group), recipe.id);
    const seen = new Set();
    for (const item of recipe.items) {
      const label = `${recipe.id}/${item.slot}`;
      assert.ok(catalog.some(a => a.id === `builtin-${item.asset}`), `${label}: ${item.asset}`); assert.ok(rules.includes(item.at), label);
      assert.ok(!seen.has(item.slot), `${label} repetido`);
      if (item.of) assert.ok(seen.has(item.of) || seen.has(item.of.replace(/\.\d+$/, '')), `${label} depende de ${item.of}`);
      if (item.at === 'on') { const host = recipe.items.find(i => i.slot === item.of || i.slot === item.of.replace(/\.\d+$/, '')); assert.ok(catalog.find(a => a.id === `builtin-${host.asset}`).supportHeight > 0, `${label}: ${host.asset} não tem tampo`); }
      seen.add(item.slot);
    }
  }
});

test('rooms are furnished against walls, clear of doors and of each other, at every density', () => {
  for (const recipe of ROOM_RECIPES) for (const density of ['sparse', 'normal', 'dense']) for (const [width, length] of [[6, 5], [9, 7]]) {
    const { store, floor } = room({ width, length }), label = `${recipe.id} ${density} ${width}×${length}`;
    const proposal = proposeFurnishing(store.document, { floorId: floor.id, template: recipe.id, density, seed: 7 }, store.editVersion, catalog);
    assert.ok(proposal.entities.length >= 2, `${label}: ${proposal.entities.length} peças · ${proposal.report.omissions.join(' | ')}`);
    const floorItems = standing(proposal.entities, floor);
    for (let i = 0; i < floorItems.length; i++) for (let j = i + 1; j < floorItems.length; j++) assert.equal(footprintsOverlap(worldFootprint(floorItems[i]), worldFootprint(floorItems[j])), false, `${label}: ${floorItems[i].name} × ${floorItems[j].name}`);
    // The doorway stays walkable.
    const door = Object.values(store.document.layout.entities).find(e => e.kind === 'door'), wall = store.document.layout.entities[door.wallId];
    const passage = worldFootprint({ footprint: [door.width, 1.6], transform: { position: [wall.transform.position[0] + door.offset, 0, wall.transform.position[2]], rotation: [0, 0, 0, 1], scale: [1, 1, 1] } });
    for (const entity of floorItems) assert.equal(footprintsOverlap(worldFootprint(entity), passage), false, `${label}: ${entity.name} na passagem`);
    // What sits on furniture is above its top and names it as support.
    // What hangs is fixed to a wall of the room, above the floor.
    for (const entity of proposal.entities.filter(e => !e.surfaceId)) { assert.equal(store.document.layout.entities[entity.anchor.hostId].kind, 'wall', `${label}: ${entity.name}`); assert.ok(entity.transform.position[1] > .5, label); }
    for (const entity of proposal.entities.filter(e => e.surfaceId && e.surfaceId !== floor.id)) {
      const host = proposal.entities.find(e => e.id === entity.surfaceId); assert.ok(host?.supportHeight > 0, `${label}: ${entity.name}`);
      assert.ok(Math.abs(entity.transform.position[1] - host.transform.position[1] - host.supportHeight) < 1e-6, `${label}: ${entity.name}`);
    }
    store.execute('proposal.accept', { proposal }); validateDocument(store.document);
    const again = proposeFurnishing(store.document, { compositionId: Object.values(store.document.layout.compositions)[0].id, template: recipe.id, density, seed: 7 }, store.editVersion, catalog);
    assert.equal(again.entities.length + again.updates.length + again.removals.length, 0, `${label}: regenerar sem mudanças deve ser estável`);
  }
});

test('the same seed repeats a room and another seed rearranges it', () => {
  const layout = seed => { const { store, floor } = room({ width: 8, length: 6 }); return proposeFurnishing(store.document, { floorId: floor.id, template: 'living', density: 'dense', seed }, store.editVersion, catalog).entities.map(e => [e.name, ...e.transform.position.map(v => +(v).toFixed(3))]); };
  assert.deepEqual(layout(3), layout(3));
  assert.ok([4, 5, 6, 7].some(seed => JSON.stringify(layout(seed)) !== JSON.stringify(layout(3))));
});

test('walls, their thickness, doors and windows are read from the room, including polygons', () => {
  const { store, floor } = room({ width: 6, length: 5 });
  const walls = Object.values(store.document.layout.entities).filter(e => e.kind === 'wall'), north = walls.find(w => w.name === 'Parede norte');
  store.execute('entity.add', { entity: createEntity('window', { wallId: north.id, offset: 2, width: 1.4, sill: .9, surfaceId: floor.id }) });
  const frame = roomFrame(store.document, floor, Object.values(store.document.layout.areas)[0]);
  assert.equal(frame.edges.length, 4); assert.equal(frame.doors.length, 1);
  for (const edge of frame.edges) assert.ok(Math.abs(edge.inset - .19) < .02, 'a mobília encosta na face interna da parede');
  assert.equal(frame.edges.filter(e => e.windows.length).length, 1); assert.equal(frame.edges.filter(e => e.doors.length).length, 1);
  // Tall furniture keeps off the window; low furniture may stand below it.
  const proposal = proposeFurnishing(store.document, { floorId: floor.id, template: 'archive', density: 'dense', seed: 2 }, store.editVersion, catalog);
  const window = Object.values(store.document.layout.entities).find(e => e.kind === 'window'), centre = [north.transform.position[0] + window.offset, north.transform.position[2]];
  for (const entity of proposal.entities.filter(e => asset(e).bounds[1] > 1.2 && Math.abs(e.transform.position[2] - centre[1]) < .8)) assert.ok(Math.abs(entity.transform.position[0] - centre[0]) > window.width / 2, `${entity.name} cobre a janela`);
  // An L-shaped floor has six walls to lean on.
  const shaped = createSceneStore(createScene());
  const l = createEntity('floor', { vertices: [[-4, -3], [4, -3], [4, 0], [0, 0], [0, 3], [-4, 3]] }); shaped.execute('entity.add', { entity: l });
  const lProposal = proposeFurnishing(shaped.document, { floorId: l.id, template: 'bedroom', density: 'dense', seed: 1 }, shaped.editVersion, catalog);
  assert.ok(lProposal.entities.length >= 6, lProposal.report.omissions.join(' | '));
  shaped.execute('proposal.accept', { proposal: lProposal }); validateDocument(shaped.document);
});
