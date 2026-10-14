import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createIndustrialExample } from '../scripts/generate-industrial-scene.js';
import { EXAMPLE_SCENES, loadExampleScene } from '../src/data/example-scenes.js';
import { validateDocument } from '../src/domain/documents.js';
import { projectPresentation } from '../src/app/presentation.js';

const { assets } = JSON.parse(await readFile('public/assets/catalog.json', 'utf8'));
const original = JSON.parse(await readFile('public/scenes/galpao-industrial.json', 'utf8'));

test('the industrial plant is an ordinary scene that uses every new feature, with five cameras', async () => {
  validateDocument(original);
  const entities = Object.values(original.layout.entities), look = original.look ?? original.defaultLook;
  assert.equal(Object.keys(original.cameraPresets).length, 5); assert.ok(EXAMPLE_SCENES.some(card => card.id === 'galpao-industrial'));
  assert.ok(entities.some(e => e.screen?.enabled && e.illumination?.profile === 'screen' && e.screen.lines.some(l => l.text === 'BOOTING')), 'a lit screen');
  assert.ok(entities.filter(e => e.decal).length >= 3 && entities.some(e => e.decal?.kind === 'surface' && e.material.texture === 'hazard') && entities.some(e => e.decal?.kind === 'text'), 'a sign, a mark and stripes');
  assert.ok(entities.some(e => e.kind === 'floor' && e.material.wet?.enabled), 'a wet floor');
  assert.ok(entities.filter(e => e.cable).length >= 8, 'hung cables');
  assert.ok(entities.some(e => e.localEffect?.type === 'sparks') && entities.some(e => e.localEffect?.type === 'drip'), 'sparks and a leak');
  assert.ok(entities.filter(e => e.assetRef?.id === 'builtin-industrial-ceiling-slab').length >= 12, 'a roof');
  assert.equal(look.rendering.surfaceReflections, true); assert.ok(look.bloom.streak > 0); assert.equal(look.volumetricFog.enabled, true);
  for (const e of entities) { assert.equal(e.locked, false); if (e.assetRef) assert.equal(assets.find(a => a.id === e.assetRef.id)?.revision, e.assetRef.revision, e.assetRef.id); }
  // Every decal is glued to something that is there.
  for (const e of entities.filter(e => e.decal)) assert.ok(original.layout.entities[e.anchor.hostId], e.name);
});

test('the scene is made again, whole, by the generator, and a copy remaps what is glued to what', async () => {
  const again = await createIndustrialExample(assets), kinds = scene => Object.values(scene.layout.entities).map(e => e.kind + ':' + (e.assetRef?.id ?? '') + ':' + (e.decal?.kind ?? '') + ':' + (e.cable?.mode ?? '')).sort();
  assert.deepEqual(kinds(again), kinds(original));
  const fetcher = async () => ({ ok: true, json: async () => structuredClone(original) }), copy = await loadExampleScene('galpao-industrial', { fetcher });
  assert.notEqual(copy.id, original.id);
  for (const e of Object.values(copy.layout.entities).filter(e => e.decal)) { assert.ok(copy.layout.entities[e.anchor.hostId], 'the host is in the copy'); assert.ok(!original.layout.entities[e.anchor.hostId], 'and it is the copy\'s own'); }
  const shown = projectPresentation(copy); assert.equal(Object.values(shown.layout.entities).filter(e => e.decal).length, Object.values(copy.layout.entities).filter(e => e.decal).length);
});
