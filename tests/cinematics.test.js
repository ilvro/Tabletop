import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createToken } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { applyEnvironment, primaryLight } from '../src/domain/environments.js';
import { validateDocument } from '../src/domain/validation.js';
import { FLASHLIGHT_DEFAULTS, mixLook, mixColor, smootherstep, approach, cameraExtras } from '../src/domain/cinematics.js';
import { ambiencePatch, patchedLook } from '../src/app/live/ambience.js';
import { ambiencePanel, ambienceValues } from '../src/ui/ambience-panel.js';
import { flashlightPanel } from '../src/ui/flashlight-panel.js';
import { numberField, colorField, checkField } from '../src/ui/controls.js';

const sceneWithToken = () => {
  const store = createSceneStore(createScene('Cinema'));
  const { token, actor } = createToken({ name: 'Agatha', position: [1, 0, 2] });
  store.execute('token.add', { token, actor, snap: false });
  return { store, token };
};

test('a token carries an optional flashlight that is validated and survives undo', () => {
  const { store, token } = sceneWithToken();
  store.execute('token.update', { id: token.id, patch: { flashlight: { ...FLASHLIGHT_DEFAULTS } } });
  assert.deepEqual(store.document.tokens[token.id].flashlight, FLASHLIGHT_DEFAULTS);
  assert.throws(() => store.execute('token.update', { id: token.id, patch: { flashlight: { ...FLASHLIGHT_DEFAULTS, angle: 3 } } }), /limites/);
  assert.throws(() => store.execute('token.update', { id: token.id, patch: { flashlight: { ...FLASHLIGHT_DEFAULTS, beam: 1 } } }), /desconhecido/);
  store.undo();
  assert.equal(store.document.tokens[token.id].flashlight, undefined);
});

test('shots keep focus, follow and motion, and forget a target that is removed', () => {
  const { store, token } = sceneWithToken();
  const camera = { id: 'close', name: 'Close', projection: 'perspective', position: [0, 1.5, 4], target: [1, 1.1, 2], fov: 30, orthographicHeight: 18,
    focus: { enabled: true, targetId: token.id, distance: 2.4, aperture: .6 }, follow: { targetId: token.id }, motion: { type: 'orbit', speed: .5 } };
  store.execute('camera.save', { camera });
  assert.deepEqual(store.document.cameraPresets.close.motion, { type: 'orbit', speed: .5 });
  // A shot saved with a target that is not in the scene keeps its framing without it; a document read from disk is refused.
  store.execute('camera.save', { camera: { ...camera, id: 'lost', follow: { targetId: 'nobody' } } });
  assert.equal(store.document.cameraPresets.lost.follow, undefined);
  assert.throws(() => validateDocument({ ...store.document, cameraPresets: { lost: { ...camera, id: 'lost', follow: { targetId: 'nobody' } } } }), /seguido/);
  assert.throws(() => store.execute('camera.save', { camera: { ...camera, id: 'bad', motion: { type: 'spin', speed: 1 } } }), /Movimento/);
  store.execute('token.remove', { id: token.id });
  const shot = store.document.cameraPresets.close;
  assert.equal(shot.focus.targetId, null, 'the focus stays, on its distance');
  assert.equal(shot.follow, undefined);
  assert.deepEqual(shot.position, camera.position);
});

test('cameraExtras fills defaults and plain presets stay plain', () => {
  assert.deepEqual(cameraExtras({}), { focus: { enabled: false, targetId: null, distance: 6, aperture: .45 }, follow: null, motion: { type: 'none', speed: .5 } });
  const doc = validateDocument(createScene('Plain'));
  assert.deepEqual(doc.cameraPresets, {});
});

test('easing and approach are smooth at the ends and independent of frame rate', () => {
  assert.equal(smootherstep(0), 0); assert.equal(smootherstep(1), 1); assert.equal(smootherstep(.5), .5);
  assert.ok(smootherstep(.05) < .002, 'starts with no jolt');
  let a = 0; for (let i = 0; i < 60; i++) a = approach(a, 10, 1 / 60, .5);
  let b = 0; for (let i = 0; i < 30; i++) b = approach(b, 10, 1 / 30, .5);
  assert.ok(Math.abs(a - b) < 1e-9);
});

test('mixColor blends in linear light and keeps the ends exact', () => {
  assert.equal(mixColor('#ff0000', '#0000ff', 0), '#ff0000');
  assert.equal(mixColor('#ff0000', '#0000ff', 1), '#0000ff');
  const mid = mixColor('#000000', '#ffffff', .5);
  assert.ok(parseInt(mid.slice(1, 3), 16) > 160, 'linear midpoint is brighter than 50% sRGB');
});

test('mixLook travels between two atmospheres without popping fog, bloom or the key light', () => {
  const day = applyEnvironment(createScene('Dia'), 'day'), night = applyEnvironment(day, 'moonlight'), fog = applyEnvironment(day, 'fog');
  const keyId = primaryLight(day.look).id;
  assert.equal(primaryLight(night.look).id, keyId, 'the key light keeps its identity');
  const half = mixLook(day.look, night.look, .5, keyId);
  const a = day.look.lights[keyId].intensity, b = night.look.lights[keyId].intensity;
  assert.ok(Math.abs(half.lights[keyId].intensity - (a + b) / 2) < 1e-9);
  assert.equal(half.bloom.enabled, true); assert.ok(half.bloom.strength > 0 && half.bloom.strength < night.look.bloom.strength);
  const misty = mixLook(day.look, fog.look, .25, keyId);
  assert.equal(misty.volumetricFog.enabled, true); assert.ok(misty.volumetricFog.density < fog.look.volumetricFog.density);
  assert.equal(mixLook(day.look, night.look, 0, keyId), day.look); assert.equal(mixLook(day.look, night.look, 1, keyId), night.look);
  const rain = applyEnvironment(day, 'rain'), early = mixLook(day.look, rain.look, .25), late = mixLook(day.look, rain.look, .75);
  assert.equal(early.weather.type, 'none'); assert.equal(late.weather.type, 'rain'); assert.ok(late.weather.opacity < rain.look.weather.opacity);
});

test('ambience sliders turn into look patches that commit as valid documents', () => {
  const doc = applyEnvironment(createScene('Painel'), 'day'), look = doc.look;
  const store = createSceneStore(doc);
  const check = (name, value, options) => {
    const patch = ambiencePatch(store.document.look, name, value, options);
    if (patch.look) store.execute('look.update', { patch: patch.look });
    if (patch.key) store.execute('environment.key.update', { patch: patch.key });
    return store.document.look;
  };
  assert.equal(check('exposure', 1.6).daylight.exposure, 1.6);
  assert.equal(check('volumeDensity', .05).volumetricFog.enabled, true);
  assert.equal(check('volumeDensity', 0).volumetricFog.enabled, false);
  assert.equal(check('fogDensity', .02).fog.mode, 'exp2');
  assert.equal(check('topColor', 0, { channel: 'h' }).sky.topColor.length, 7);
  const red = check('key', 0, { channel: 'h' }); assert.equal(primaryLight(red).temperature, null);
  assert.ok(Math.abs(ambienceValues(check('altitude', 30)).altitude - 30) < .5);
  const weather = check('weatherType', 'rain', { center: [40, 0, -12] }).weather;
  assert.deepEqual(weather.center, [40, 0, -12], 'weather starts where the camera looks');
  assert.equal(check('weatherCount', 512.4).weather.count, 512);
  assert.equal(check('bloom', 0).bloom.enabled, false);
  // A grey keeps the hue chosen on the H row while its saturation is raised.
  const grey = applyEnvironment(createScene('Cinza'), 'neutral');
  const tinted = ambiencePatch({ ...grey.look, sky: { ...grey.look.sky, topColor: '#808080' } }, 'topColor', .8, { channel: 's', hue: 120 }).look.sky.topColor;
  assert.ok(parseInt(tinted.slice(3, 5), 16) > parseInt(tinted.slice(1, 3), 16), 'green, not red');
  const live = patchedLook(look, ambiencePatch(look, 'keyIntensity', 4));
  assert.equal(primaryLight(live).intensity, 4); assert.equal(primaryLight(look).intensity, primaryLight(doc.look).intensity, 'the committed look is untouched');
});

test('the live panel lists times of day, saved atmospheres and every slider', () => {
  const doc = applyEnvironment(createScene('Painel'), 'moonlight');
  const html = ambiencePanel(doc.look, { environments: [{ id: 'mine', name: 'Hexatombe' }], activeId: 'moonlight', duration: 5 });
  for (const name of ['exposure', 'keyIntensity', 'altitude', 'azimuth', 'cloudCoverage', 'volumeDensity', 'fogDensity', 'bloom']) assert.match(html, new RegExp(`data-ambience="${name}"`));
  assert.match(html, /data-ambience-time="mine"[^>]*>Hexatombe/);
  assert.match(html, /amb-chip active" data-ambience-time="moonlight"/);
  assert.match(html, /data-ambience-duration="5" class=|aria-checked="true" class="active" data-ambience-duration="5"/);
  assert.match(ambiencePanel({ ...doc.look, lights: {} }), /não tem sol nem lua/);
});

test('the flashlight panel shows its settings only once the token has one', () => {
  const kit = { numberField, colorField, checkField };
  assert.doesNotMatch(flashlightPanel(undefined, kit), /flashlight-intensity/);
  const html = flashlightPanel({ ...FLASHLIGHT_DEFAULTS }, kit);
  assert.match(html, /LANTERNA/); assert.match(html, /data-field="flashlight-angle" value="22"/);
});

test('close-up spots start three-quarters in front of the character and go round to its back', async () => {
  const { closeUpSpots } = await import('../src/domain/cinematics.js');
  const spots = closeUpSpots([0, 1.1, 0], 0);
  assert.equal(spots.length, 10);
  assert.ok(spots[0][2] > 2 && Math.abs(spots[0][0]) > .5, 'first: in front (+Z), turned to the side');
  assert.ok(spots.at(-1)[2] < -2, 'last: behind');
  for (const spot of spots) assert.ok(Math.abs(Math.hypot(spot[0], spot[2]) - 2.4) < 1e-9 && Math.abs(spot[1] - 1.28) < 1e-9);
});

test('the cinema panel offers characters and the selected object, and keeps a chosen target listed', async () => {
  const { cinemaPanel } = await import('../src/ui/cinema-panel.js');
  const html = cinemaPanel({ focus: { enabled: true, targetId: 'lamp', distance: 3, aperture: .5 }, follow: { targetId: 't1' } }, { targets: [['t1', 'Agatha']], names: { lamp: 'Abajur' }, live: { enabled: true, smoothing: .8 } });
  assert.match(html, /<option value="lamp" selected>Abajur<\/option>/);
  assert.match(html, /data-field="camera-follow"><option value="">Ninguém<\/option><option value="t1" selected>Agatha/);
  assert.match(html, /data-field="camera-live" checked/);
  assert.doesNotMatch(html, /camera-focus-distance/, 'with a target, the distance follows it');
  assert.doesNotMatch(cinemaPanel({}), /camera-focus-aperture/);
});
