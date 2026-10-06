import test from 'node:test';
import assert from 'node:assert/strict';
import { captureBrushSettings, applyBrushPreset, validateBrushSettings, brushPresetName, validateBrushPreset } from '../src/domain/brush-presets.js';
import { createBrushPresetRepository } from '../src/data/brush-presets.js';
import { brushPresetsPanel } from '../src/ui/brush-presets-panel.js';

const brush = { mode: 'raise', radius: 2, strength: .25, hardness: .2, shape: 'square', snap: true, protectFloors: false,
  layerId: 'scene-layer', target: 17, rockPattern: 'strata', rockSize: 3, rockSeed: 42, waterLevel: 4, waterDepth: .6 };
const preset = (surface, settings) => ({ id: crypto.randomUUID(), schemaVersion: 1, name: 'Meu pincel', surface, brush: settings, revision: 1, updatedAt: new Date().toISOString() });

test('terrain presets round-trip all modes without storing scene references or inactive settings', () => {
  for (const mode of ['raise', 'lower', 'push', 'pull', 'smooth', 'flatten', 'rock', 'paint', 'erase', 'water']) {
    const original = { ...brush, mode, ...(mode === 'water' ? { shape: 'circle', snap: false } : {}), document: { id: 'private' } };
    const settings = captureBrushSettings('terrain', original), saved = preset('terrain', settings);
    validateBrushPreset(saved);
    assert.equal(settings.layerId, undefined); assert.equal(settings.document, undefined);
    assert.equal(Object.hasOwn(settings, 'target'), mode === 'flatten');
    assert.equal(Object.hasOwn(settings, 'rockSeed'), mode === 'rock');
    assert.equal(Object.hasOwn(settings, 'waterLevel'), mode === 'water');
    const current = { ...brush, layerId: 'another-scene-layer', target: -3 };
    const applied = applyBrushPreset(current, saved, 'terrain');
    assert.equal(applied.layerId, current.layerId);
    for (const [key, value] of Object.entries(settings)) assert.equal(applied[key], value);
    assert.deepEqual(current, { ...brush, layerId: 'another-scene-layer', target: -3 });
    original.radius = 8; assert.equal(settings.radius, 2);
    applied.radius = 12; assert.equal(saved.brush.radius, 2);
  }
});

test('rock presets store face tools without terrain-only context and cannot cross surfaces', () => {
  for (const mode of ['raise', 'lower', 'push', 'pull', 'smooth', 'flatten']) {
    const settings = captureBrushSettings('rock', { ...brush, mode });
    assert.deepEqual(Object.keys(settings), ['mode', 'radius', 'strength', 'hardness']);
    const saved = preset('rock', settings);
    const applied = applyBrushPreset(brush, saved, 'rock');
    assert.equal(applied.shape, 'circle'); assert.equal(applied.snap, false);
    assert.equal(applied.layerId, brush.layerId); assert.equal(applied.target, brush.target);
    assert.throws(() => applyBrushPreset(brush, saved, 'terrain'), /compatível/);
  }
  assert.throws(() => captureBrushSettings('rock', { ...brush, mode: 'water' }), /incompatível/);
});

test('brush preset validation rejects unsupported fields, ranges, versions and invalid names', () => {
  const settings = captureBrushSettings('terrain', brush);
  for (const patch of [{ radius: NaN }, { radius: 0 }, { strength: 11 }, { hardness: 2 }, { shape: 'triangle' }, { snap: 'true' }, { layerId: 'foreign' }]) {
    assert.throws(() => validateBrushSettings('terrain', { ...settings, ...patch }));
  }
  assert.throws(() => captureBrushSettings('terrain', { ...brush, mode: 'paint', strength: 2 }));
  assert.throws(() => captureBrushSettings('terrain', { ...brush, mode: 'rock', rockSeed: .5 }));
  assert.throws(() => captureBrushSettings('terrain', { ...brush, mode: 'water' }));
  assert.throws(() => captureBrushSettings('terrain', { ...brush, mode: 'flatten', target: Infinity }));
  assert.throws(() => applyBrushPreset(brush, { ...preset('terrain', settings), schemaVersion: 2 }, 'terrain'));
  for (const name of ['', '   ', 'a'.repeat(81), 'a\nb', null]) assert.throws(() => brushPresetName(name));
  assert.equal(brushPresetName('  pincel a\u0301  '), 'pincel á');
});

test('unavailable preset storage reports failure, never a successful save', async () => {
  const repo = createBrushPresetRepository({ databaseFactory: null });
  await assert.rejects(repo.list(), /não permite salvar/);
  await assert.rejects(repo.save({ name: 'Teste', surface: 'terrain', brush: captureBrushSettings('terrain', brush) }), /não permite salvar/);
});

test('personal brush controls filter by surface and escape names and drafts', () => {
  const html = brushPresetsPanel('terrain', [preset('terrain', captureBrushSettings('terrain', brush)),
    { ...preset('rock', captureBrushSettings('rock', brush)), name: 'ROCK_ONLY' }], { selectedId: '', name: '<img onerror="x">' }, false, 'Erro <script>');
  assert.ok(!html.includes('ROCK_ONLY')); assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img')); assert.ok(html.includes('Erro &lt;script&gt;'));
});
