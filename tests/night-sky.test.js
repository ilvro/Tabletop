import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, validateDocument } from '../src/domain/documents.js';
import { applyEnvironment } from '../src/domain/environments.js';
import { SKY_DEFAULTS, SKY_NIGHT_DEFAULTS, skySettings } from '../src/domain/lighting.js';
import { mixLook } from '../src/domain/cinematics.js';
import { ambiencePatch } from '../src/app/live/ambience.js';
import { ambienceValues } from '../src/ui/ambience-panel.js';
import { skyAnimates } from '../src/render/atmosphere.js';

test('night-sky fields are optional, validated and filled in on read', () => {
  const scene = createScene();
  scene.look.sky = { ...SKY_DEFAULTS, enabled: true };
  validateDocument(scene);
  assert.equal(skySettings(scene.look.sky).milkyWay, SKY_NIGHT_DEFAULTS.milkyWay);
  scene.look.sky = { ...scene.look.sky, ...SKY_NIGHT_DEFAULTS, aurora: true, auroraColor: '#22ff88', moonPhase: .25, meteors: .4 };
  validateDocument(scene);
  for (const bad of [{ starDensity: 2 }, { moonPhase: -.1 }, { aurora: 'yes' }, { auroraTopColor: 'violeta' }, { milkyWayAngle: 200 }]) {
    assert.throws(() => validateDocument({ ...scene, look: { ...scene.look, sky: { ...scene.look.sky, ...bad } } }), JSON.stringify(bad));
  }
});

test('aurora environment is a valid night with the aurora on, and transitions fade it in', () => {
  const night = applyEnvironment(createScene(), 'moonlight'), aurora = applyEnvironment(night, 'aurora');
  assert.equal(aurora.look.daylight.phase, 'night'); assert.equal(aurora.look.sky.aurora, true);
  const half = mixLook(night.look, aurora.look, .5);
  assert.equal(half.sky.aurora, true); assert.ok(Math.abs(half.sky.auroraIntensity - aurora.look.sky.auroraIntensity / 2) < 1e-9);
  assert.ok(skyAnimates(aurora.look)); assert.equal(skyAnimates({ ...aurora.look, daylight: { phase: 'day' }, sky: { ...aurora.look.sky, clouds: false } }), false);
});

test('live panel drives stars, Milky Way, aurora and moon phase', () => {
  const look = applyEnvironment(createScene(), 'moonlight').look;
  const on = ambiencePatch(look, 'aurora', 1.5).look.sky;
  assert.equal(on.aurora, true); assert.equal(on.auroraIntensity, 1.5);
  assert.equal(ambiencePatch({ ...look, sky: on }, 'aurora', 0).look.sky.aurora, false);
  assert.equal(ambiencePatch(look, 'starBrightness', 0).look.sky.stars, false);
  const values = ambienceValues({ ...look, sky: { ...look.sky, moonPhase: .3 } });
  assert.equal(values.moonPhase, .3); assert.equal(values.aurora, 0); assert.equal(values.night, true);
});
