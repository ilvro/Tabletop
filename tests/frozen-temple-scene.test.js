import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFrozenTempleExample } from '../scripts/generate-frozen-temple-scene.js';
import { EXAMPLE_SCENES, loadExampleScene } from '../src/data/example-scenes.js';
import { validateDocument } from '../src/domain/documents.js';
import { projectPresentation } from '../src/app/presentation.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { switchState } from '../src/domain/light-switch.js';

const { assets } = JSON.parse(await readFile('public/assets/catalog.json', 'utf8'));
const original = JSON.parse(await readFile('public/scenes/templo-gelado.json', 'utf8'));

test('the frozen temple is an ordinary scene: a hall in a snow cave and, behind the portcullis, a complex that goes down to an abyss', () => {
  validateDocument(original);
  const entities = Object.values(original.layout.entities), look = original.look ?? original.defaultLook, uses = id => entities.filter(e => e.assetRef?.id === `builtin-${id}`);
  const folders = Object.values(original.layout.groups).map(g => g.name), named = name => entities.find(e => e.name === name);
  assert.equal(Object.keys(original.cameraPresets).length, 30); assert.ok(EXAMPLE_SCENES.some(card => card.id === 'templo-gelado'));
  assert.equal(uses('temple-portcullis').length, 1); assert.equal(uses('temple-arched-gateway').length, 2);
  for (const room of ['Átrio rúnico', 'Sala de máquinas', 'Arquivo rúnico', 'Dormitório dos guerreiros', 'Biblioteca', 'Salão de banquete', 'Cozinha', 'Ala dos quartos', 'Quarto do sacerdote 1', 'Quarto do sacerdote 2', 'Quarto do sacerdote 3', 'Câmara do jarl', 'Despensa', 'Corredor dos guardiões', 'Galeria rupestre', 'Salão dos ancestrais', 'Escada de serviço', 'Forja profunda', 'Depósito de minério', 'Sala isolada', 'Corredor do abismo', 'Porta do abismo', '07 · Abismo']) assert.ok(folders.includes(room), room);
  assert.equal(entities.filter(e => e.kind === 'terrain').length, 2, 'the cave outside and the mountain over the rooms');
  assert.ok(entities.filter(e => e.kind === 'window' && e.style === 'open').length >= 24, 'passages between the rooms');
  // Levels inside the rooms: the dais and balcony of the atrium, the pit of the machine room, the archive's mezzanine.
  assert.ok(named('Estrado do anel') && named('Balcão do átrio') && named('Mezanino do arquivo'));
  assert.equal(entities.find(e => e.kind === 'floor' && e.holes?.length)?.name, 'Piso — Sala de máquinas');
  assert.ok(entities.find(e => e.kind === 'floor' && e.vertices?.length >= 12), 'the cave is a polygon');
  // Two ways down, 6 m each: the grand stair of the ancestors and the service stair from the machines.
  assert.equal(named('Escadaria dos ancestrais').height, 6); assert.equal(entities.find(e => e.kind === 'stairs' && e.name === 'Escada de serviço').height, 6);
  assert.equal(uses('nordic-vault-door').length, 1); assert.equal(uses('nordic-rune-door').length, 1); assert.equal(uses('nordic-stasis-pod').length, 1);
  const turns = uses('nordic-spiral-stair-turn').map(e => e.transform.position[1]).sort((a, b) => b - a);
  assert.equal(turns.length, 7); for (let k = 1; k < 7; k++) assert.ok(Math.abs(turns[k - 1] - turns[k] - 8) < 1e-6, 'turns 8 m apart join step to step');
  assert.ok(uses('cave-painting-hunt').length + uses('cave-painting-ring').length + uses('cave-painting-descent').length >= 4);
  assert.ok(entities.filter(e => e.lightingZone?.enabled).length <= 16);
  // Where they lived: beds, tables set for a feast, books.
  assert.ok(uses('medieval-bed').length >= 12 && uses('church-banquet-table').length >= 5 && uses('bookshelf').length >= 40 && uses('lectern').length === 1);
  // Cold rune light everywhere; the warm lights burning at the start are the expedition's and the forge's.
  const ring = uses('temple-rune-ring')[0]; assert.equal(ring.illumination.shadowPolicy, 'auto');
  assert.deepEqual(entities.filter(e => e.illumination?.profile === 'torch' && e.illumination.enabled).map(e => e.assetRef?.id ?? e.name).sort(), ['Canal de metal fundido', 'builtin-medieval-brazier', 'builtin-medieval-brazier', 'builtin-nordic-forge-engine']);
  // Everything that glows can be switched: hearths, chandeliers, candles, cauldrons and the runes carry a light, and what once burned starts off.
  for (const id of ['medieval-hearth', 'chandelier', 'candles', 'medieval-candle-stand', 'medieval-cauldron', 'nordic-rune-console', 'nordic-gear-wall', 'nordic-runestone']) for (const e of uses(id)) assert.ok(e.illumination, `${e.name} has a switchable light`);
  for (const id of ['medieval-hearth', 'chandelier', 'medieval-cauldron']) assert.ok(uses(id).every(e => e.illumination.enabled === false), `${id} starts off`);
  assert.equal(look.weather.type, 'snow'); assert.equal(look.volumetricFog.enabled, true); assert.equal(look.sky.enabled, false);
  for (const e of entities) { assert.equal(e.locked, false); if (e.assetRef) assert.equal(assets.find(a => a.id === e.assetRef.id)?.revision, e.assetRef.revision, e.assetRef.id); }
});

test('one switch turns a whole room off, glow included, and back on', () => {
  const store = createSceneStore(structuredClone(original)), hall = Object.values(original.layout.groups).find(g => g.name === 'Salão de banquete');
  assert.equal(switchState(store.document, { groupId: hall.id }), 'mixed');
  store.execute('lights.switch', { groupId: hall.id, enabled: true }); assert.equal(switchState(store.document, { groupId: hall.id }), 'on');
  store.execute('lights.switch', { groupId: hall.id, enabled: false }); assert.equal(switchState(store.document, { groupId: hall.id }), 'off');
  const others = Object.values(store.document.layout.entities).filter(e => e.illumination && e.groupId !== hall.id && e.name === 'Nórdico · lanterna rúnica de cristal');
  assert.ok(others.length && others.every(e => store.document.layout.entities[e.id].illumination.enabled === original.layout.entities[e.id].illumination.enabled), 'other rooms keep theirs');
});

test('the temple keeps few textures to generate: a short palette of materials', () => {
  const textured = new Set(Object.values(original.layout.entities).filter(e => e.material?.texture && e.material.texture !== 'none').map(e => JSON.stringify(e.material)));
  assert.ok(textured.size <= 40, `${textured.size} materiais com textura`);
});

test('the temple is made again, whole, by the generator, and loads as an independent copy', async () => {
  const again = await createFrozenTempleExample(assets), kinds = scene => Object.values(scene.layout.entities).map(e => e.kind + ':' + (e.assetRef?.id ?? '')).sort();
  assert.deepEqual(kinds(again), kinds(original));
  const fetcher = async () => ({ ok: true, json: async () => structuredClone(original) }), copy = await loadExampleScene('templo-gelado', { fetcher });
  assert.notEqual(copy.id, original.id); assert.equal(Object.keys(copy.layout.entities).length, Object.keys(original.layout.entities).length);
  assert.ok(Object.keys(projectPresentation(copy).layout.entities).length > 0);
});
