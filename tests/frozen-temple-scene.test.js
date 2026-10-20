import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFrozenTempleExample } from '../scripts/generate-frozen-temple-scene.js';
import { EXAMPLE_SCENES, loadExampleScene } from '../src/data/example-scenes.js';
import { validateDocument } from '../src/domain/documents.js';
import { projectPresentation } from '../src/app/presentation.js';

const { assets } = JSON.parse(await readFile('public/assets/catalog.json', 'utf8'));
const original = JSON.parse(await readFile('public/scenes/templo-gelado.json', 'utf8'));

test('the frozen temple is an ordinary scene: a hall in a snow cave and, behind the portcullis, a complex that goes down to an abyss', () => {
  validateDocument(original);
  const entities = Object.values(original.layout.entities), look = original.look ?? original.defaultLook, uses = id => entities.filter(e => e.assetRef?.id === `builtin-${id}`);
  const folders = Object.values(original.layout.groups).map(g => g.name);
  assert.equal(Object.keys(original.cameraPresets).length, 16); assert.ok(EXAMPLE_SCENES.some(card => card.id === 'templo-gelado'));
  assert.equal(uses('temple-square-pier').length, 6); assert.equal(uses('temple-portcullis').length, 1); assert.equal(uses('temple-arched-gateway').length, 2); assert.equal(uses('temple-wall-niche').length, 6);
  for (const room of ['Átrio rúnico', 'Sala de máquinas', 'Arquivo rúnico', 'Alojamento', 'Galeria rupestre', 'Descida', 'Forja profunda', 'Sala isolada', 'Corredor do abismo']) assert.ok(folders.includes(room), room);
  assert.equal(entities.filter(e => e.kind === 'terrain').length, 2, 'the cave outside and the mountain over the rooms');
  assert.ok(entities.some(e => e.kind === 'water' && e.water.state === 'ice'), 'a frozen pool');
  assert.ok(entities.filter(e => e.kind === 'window' && e.style === 'open').length >= 16, 'passages between the rooms');
  // The way down: a stair 6 m down from the gallery, the vault door, the sealed room and seven turns of the spiral.
  const stairs = entities.find(e => e.kind === 'stairs'); assert.equal(stairs.height, 6);
  assert.equal(uses('nordic-vault-door').length, 1); assert.equal(uses('nordic-stasis-pod').length, 1);
  const turns = uses('nordic-spiral-stair-turn').map(e => e.transform.position[1]).sort((a, b) => b - a);
  assert.equal(turns.length, 7); for (let k = 1; k < 7; k++) assert.ok(Math.abs(turns[k - 1] - turns[k] - 8) < 1e-6, 'turns 8 m apart join step to step');
  assert.equal(uses('cave-painting-hunt').length + uses('cave-painting-ring').length + uses('cave-painting-descent').length, 3);
  assert.ok(entities.filter(e => e.lightingZone?.enabled).length <= 16);
  // Cold rune light everywhere; the warm lights are the expedition's and the forge's.
  const ring = uses('temple-rune-ring')[0]; assert.equal(ring.illumination.shadowPolicy, 'auto');
  assert.deepEqual(entities.filter(e => e.illumination?.profile === 'torch').map(e => e.assetRef.id).sort(), ['builtin-medieval-brazier', 'builtin-medieval-brazier', 'builtin-nordic-forge-engine']);
  assert.equal(look.weather.type, 'snow'); assert.equal(look.volumetricFog.enabled, true); assert.equal(look.sky.enabled, false);
  for (const e of entities) { assert.equal(e.locked, false); if (e.assetRef) assert.equal(assets.find(a => a.id === e.assetRef.id)?.revision, e.assetRef.revision, e.assetRef.id); }
});

test('the temple keeps few textures to generate: a short palette of materials', () => {
  const textured = new Set(Object.values(original.layout.entities).filter(e => e.material?.texture && e.material.texture !== 'none').map(e => JSON.stringify(e.material)));
  assert.ok(textured.size <= 32, `${textured.size} materiais com textura`);
});

test('the temple is made again, whole, by the generator, and loads as an independent copy', async () => {
  const again = await createFrozenTempleExample(assets), kinds = scene => Object.values(scene.layout.entities).map(e => e.kind + ':' + (e.assetRef?.id ?? '')).sort();
  assert.deepEqual(kinds(again), kinds(original));
  const fetcher = async () => ({ ok: true, json: async () => structuredClone(original) }), copy = await loadExampleScene('templo-gelado', { fetcher });
  assert.notEqual(copy.id, original.id); assert.equal(Object.keys(copy.layout.entities).length, Object.keys(original.layout.entities).length);
  assert.ok(Object.keys(projectPresentation(copy).layout.entities).length > 0);
});
