import test from 'node:test';
import assert from 'node:assert/strict';
import { sparkBurst, burstLight, dropState, effectSeeds, BURST_LENGTH } from '../src/domain/local-effects.js';
import { sparksDefaults, dripDefaults, smokeDefaults } from '../src/domain/materials.js';
import { createScene, createEntity } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';

test('sparks come in bursts at irregular intervals, the same ones for the same seed and clock', () => {
  const starts = []; let before = false;
  for (let t = 0; t < 60; t += .02) { const burst = sparkBurst(7, 1, t); if (burst.active && !before) starts.push(t); before = burst.active; }
  assert.ok(starts.length >= 15 && starts.length <= 40, `${starts.length} bursts a minute`);
  const gaps = starts.slice(1).map((t, i) => +(t - starts[i]).toFixed(1)); assert.ok(new Set(gaps).size > 4, 'the gaps differ'); assert.ok(gaps.every(g => g > BURST_LENGTH * .9));
  assert.deepEqual(sparkBurst(7, 1, 12.34), sparkBurst(7, 1, 12.34)); assert.notDeepEqual([...Array(50)].map((_, i) => sparkBurst(8, 1, i * .5).active), [...Array(50)].map((_, i) => sparkBurst(7, 1, i * .5).active));
  assert.ok(sparkBurst(7, 4, 3).index !== sparkBurst(7, .5, 3).index, 'speed changes the pace');
  const lit = []; for (let t = 0; t < 30; t += .05) lit.push(burstLight(sparkBurst(7, 1, t)));
  assert.ok(lit.some(v => v > .9) && lit.some(v => v === 0) && lit.every(v => v >= 0 && v <= 1), 'the light flashes and goes out');
});

test('a drop swells where it hangs, falls the whole way and is gone at the floor, never below it', () => {
  const seeds = effectSeeds(42, 6), height = 3; let fell = 0, hung = 0;
  for (let i = 0; i < 6; i++) for (let t = 0; t < 20; t += .01) {
    const drop = dropState(seeds, i, 1, height, t); assert.ok(drop.y <= 0 && drop.y >= -height, `y ${drop.y}`); assert.ok(drop.scale >= 0 && drop.scale <= 1);
    if (drop.falling) fell++; else { hung++; assert.equal(drop.y, 0); }
  }
  assert.ok(fell > 0 && hung > 0); assert.deepEqual(dropState(seeds, 2, 1, height, 5.5), dropState(seeds, 2, 1, height, 5.5));
  assert.equal(Math.min(...Array.from({ length: 2000 }, (_, k) => dropState(seeds, 0, 1, height, k * .01).y)) > -height - 1e-9, true);
  assert.deepEqual([...effectSeeds(42, 6)], [...seeds], 'the same seed draws the same drops');
});

test('sparks and drips are ordinary local effects with the controls of fire and smoke', () => {
  const store = createSceneStore(createScene());
  for (const effect of [sparksDefaults(), dripDefaults(), smokeDefaults()]) store.execute('entity.add', { entity: createEntity('prop', { assetRef: { id: 'builtin-crate', revision: 1 }, footprint: [1, 1], localEffect: effect }), snap: false });
  validateDocument(store.document);
  assert.deepEqual(['sparks', 'drip', 'smoke'], Object.values(store.document.layout.entities).map(e => e.localEffect.type));
  assert.throws(() => store.execute('entity.add', { entity: createEntity('prop', { assetRef: { id: 'builtin-crate', revision: 1 }, footprint: [1, 1], localEffect: { ...sparksDefaults(), type: 'lightning' } }), snap: false }));
  assert.ok(sparksDefaults().lightIntensity > 0 && dripDefaults().lightIntensity === 0);
});
