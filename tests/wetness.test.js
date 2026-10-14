import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateDocument } from '../src/domain/validation.js';
import { surfacePatch } from '../src/domain/materials.js';
import { WET_DEFAULTS, validateWet, wetFieldPatch, wetDefaults } from '../src/domain/wetness.js';
import { RENDERING_DEFAULTS } from '../src/domain/dynamic-lighting.js';

const scene = JSON.parse(await readFile('public/scenes/casa-de-bairro.json', 'utf8')), floor = Object.values(scene.layout.entities).find(e => e.kind === 'floor');
const withMaterial = patch => { const next = structuredClone(scene); next.layout.entities[floor.id].material = { ...surfacePatch('tile'), ...patch }; return next; };

test('a wet surface is strict, bounded and optional', () => {
  validateWet(WET_DEFAULTS); validateWet(wetDefaults({ amount: 0, puddles: 1, puddleSize: 10 }));
  for (const bad of [{ extra: 1 }, { amount: 1.5 }, { puddles: -.1 }, { puddleSize: .01 }, { seed: 1.5 }, { enabled: 'sim' }]) assert.throws(() => validateWet({ ...WET_DEFAULTS, ...bad }), undefined, JSON.stringify(bad));
  validateDocument(withMaterial({ wet: wetDefaults() })); validateDocument(withMaterial({})); validateDocument(withMaterial({ wet: null }));
  assert.throws(() => validateDocument(withMaterial({ wet: { ...WET_DEFAULTS, amount: 3 } })));
  const next = structuredClone(scene); next.defaultLook ??= next.look; const look = next.look ?? next.defaultLook;
  look.materialAdjustments[floor.id] = { base: { wet: wetDefaults() } }; assert.throws(() => validateDocument(next), 'wetness is not a partial adjustment');
});

test('the fields make whole patches, and the reflections are off until asked for', () => {
  assert.deepEqual(wetFieldPatch(undefined, 'enabled', true), WET_DEFAULTS); assert.equal(wetFieldPatch(WET_DEFAULTS, 'enabled', false).enabled, false);
  assert.equal(wetFieldPatch(WET_DEFAULTS, 'puddles', .9).puddles, .9); assert.throws(() => wetFieldPatch(undefined, 'amount', .5)); assert.throws(() => wetFieldPatch(WET_DEFAULTS, 'depth', 1));
  assert.equal(RENDERING_DEFAULTS.surfaceReflections, false);
  const next = structuredClone(scene), look = next.look ?? next.defaultLook; look.rendering = { ...RENDERING_DEFAULTS, surfaceReflections: true, surfaceReflectionIntensity: 2 }; validateDocument(next);
  look.rendering.surfaceReflectionIntensity = 2.5; assert.throws(() => validateDocument(next));
  const bloom = structuredClone(scene), bl = bloom.look ?? bloom.defaultLook; bl.bloom = { enabled: true, strength: .3, radius: .3, threshold: 1 }; validateDocument(bloom);
  bl.bloom = { ...bl.bloom, streak: .6, streakLength: .8 }; validateDocument(bloom); bl.bloom.streak = 1.5; assert.throws(() => validateDocument(bloom));
});
