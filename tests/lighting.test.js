import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createScene, createMapFromScene, createSceneFromMap, createEntity, createLight, duplicateDocument, validateDocument } from '../src/domain/documents.js';
import { FOG_DEFAULTS, VOLUME_DEFAULTS, BLOOM_DEFAULTS, FLICKER_DEFAULTS, kelvinToColor, flickerFactor } from '../src/domain/lighting.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { createLightObject, updateLightEffects } from '../src/render/lighting.js';
import { disposeObject } from '../src/render/asset-cache.js';
import { projectPresentation } from '../src/app/presentation.js';
import { proposeFurnishing } from '../src/authoring/furnishing.js';

test('Kelvin edits store a reproducible color; direct color exits temperature mode with undo', () => {
  const light = createLight({ type: 'spot', temperature: 2700 });
  const store = createSceneStore(createScene());
  store.execute('light.add', { light });
  assert.equal(light.color, kelvinToColor(2700));
  assert.ok(parseInt(light.color.slice(1, 3), 16) > parseInt(light.color.slice(5), 16));
  const cold = kelvinToColor(20000);
  assert.ok(parseInt(cold.slice(5), 16) > parseInt(cold.slice(1, 3), 16));
  store.execute('light.update', { id: light.id, patch: { temperature: 9000 } });
  assert.equal(store.document.look.lights[light.id].color, kelvinToColor(9000));
  store.execute('light.update', { id: light.id, patch: { color: '#ab1234' } });
  assert.equal(store.document.look.lights[light.id].temperature, null);
  store.undo(); assert.equal(store.document.look.lights[light.id].temperature, 9000);
  store.redo(); assert.equal(store.document.look.lights[light.id].color, '#ab1234');
});

test('flicker is deterministic, time-based, bounded and continuous for candles', () => {
  for (const pattern of ['candle', 'fluorescent']) {
    const config = { ...FLICKER_DEFAULTS, enabled: true, pattern, amplitude: .7, seed: 42 };
    const factors = Array.from({ length: 200 }, (_, i) => flickerFactor(config, i / 60));
    assert.ok(factors.every(v => v >= .3 && v <= 1.7));
    assert.ok(new Set(factors).size > 20);
    assert.deepEqual(factors, Array.from({ length: 200 }, (_, i) => flickerFactor(config, i / 60)));
    assert.notDeepEqual(factors, Array.from({ length: 200 }, (_, i) => flickerFactor({ ...config, seed: 7 }, i / 60)));
  }
  assert.equal(flickerFactor({ ...FLICKER_DEFAULTS, enabled: false }, 100), 1);
  const config = { ...FLICKER_DEFAULTS, enabled: true };
  assert.ok(Math.abs(flickerFactor(config, .5 - 1e-6) - flickerFactor(config, .5 + 1e-6)) < 1e-5);
});

test('spot direction follows rotation and translation; cone, penumbra and shadows reach Three.js', () => {
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 4, Math.PI / 3, 0, 'YXZ'));
  const record = createLight({ type: 'spot', position: [4, 3, 2], rotation: quaternion.toArray(), angle: .5, penumbra: .7, shadowEnabled: true });
  const view = createLightObject(record, { presentation: true });
  try {
    view.updateMatrixWorld(true);
    const source = view.userData.source;
    const direction = source.target.getWorldPosition(new THREE.Vector3()).sub(source.getWorldPosition(new THREE.Vector3())).normalize();
    assert.ok(direction.distanceTo(new THREE.Vector3(0, -1, 0).applyQuaternion(quaternion)) < 1e-8);
    assert.equal(source.angle, .5); assert.equal(source.penumbra, .7); assert.equal(source.castShadow, true);
    assert.ok(view.children.filter(c => c.userData.editHelper).every(c => !c.visible));
  } finally { disposeObject(view); }
});

test('visual scheduler respects hidden ancestors, disabled sources and pause without mutating records', () => {
  const record = createLight({ flicker: { ...FLICKER_DEFAULTS, enabled: true } });
  const before = structuredClone(record), wrapper = createLightObject(record), parent = new THREE.Group();
  parent.add(wrapper);
  try {
    assert.equal(updateLightEffects([wrapper], 1.5, false), true);
    const intensity = wrapper.userData.source.intensity;
    assert.equal(updateLightEffects([wrapper], 1.5, true), false);
    assert.equal(wrapper.userData.source.intensity, intensity);
    parent.visible = false;
    assert.equal(updateLightEffects([wrapper], 2, false), false);
    assert.equal(wrapper.userData.source.intensity, 0);
    parent.visible = true; record.enabled = false;
    assert.equal(updateLightEffects([wrapper], 2, false), false);
    assert.equal(wrapper.userData.source.intensity, 0);
    delete record.enabled; assert.deepEqual(record, before);
  } finally { disposeObject(wrapper); }
});

test('fog and bloom edits merge, undo and survive map conversion, duplication and public projection', () => {
  const store = createSceneStore(createScene());
  store.execute('look.update', { patch: { fog: { ...FOG_DEFAULTS, enabled: true }, volumetricFog: { ...VOLUME_DEFAULTS, enabled: true }, bloom: { ...BLOOM_DEFAULTS, enabled: true } } });
  const first = structuredClone(store.document.look);
  store.execute('look.update', { patch: { fog: { mode: 'exp2', density: .1 } } });
  assert.equal(store.document.look.fog.color, first.fog.color);
  store.undo(); assert.deepEqual(store.document.look, first); store.redo();
  const expected = store.document.look;
  const map = createMapFromScene(store.document), scene = createSceneFromMap(map);
  for (const doc of [map, scene, duplicateDocument(scene), projectPresentation(scene)]) {
    validateDocument(JSON.parse(JSON.stringify(doc)));
    const look = doc.look ?? doc.defaultLook;
    for (const field of ['fog', 'volumetricFog', 'bloom']) assert.deepEqual(look[field], expected[field]);
  }
});

test('invalid effect data is rejected atomically, including inconsistent temperature and unsafe numeric limits', () => {
  const store = createSceneStore(createScene()), light = createLight({ type: 'spot' });
  store.execute('light.add', { light });
  const initial = store.document, version = store.editVersion;
  for (const patch of [{ angle: 0 }, { penumbra: 2 }, { temperature: 500 }, { flicker: { ...FLICKER_DEFAULTS, seed: 1.5 } }, { flicker: { ...FLICKER_DEFAULTS, frequency: Infinity } }]) {
    assert.throws(() => store.execute('light.update', { id: light.id, patch }));
    assert.deepEqual(store.document, initial); assert.equal(store.editVersion, version);
  }
  for (const patch of [{ fog: { ...FOG_DEFAULTS, near: 60 } }, { volumetricFog: { ...VOLUME_DEFAULTS, density: -1 } }, { bloom: { ...BLOOM_DEFAULTS, strength: NaN } }, { effectsPaused: 'yes' }]) {
    assert.throws(() => store.execute('look.update', { patch }));
    assert.deepEqual(store.document, initial); assert.equal(store.editVersion, version);
  }
  const imported = structuredClone(initial);
  imported.look.lights[light.id].temperature = 2700;
  assert.throws(() => validateDocument(imported), /temperatura/);
});

test('spot switches retain identity, history and manual effects through furnishing regeneration', () => {
  const store = createSceneStore(createScene()), floor = createEntity('floor');
  store.execute('entity.add', { entity: floor });
  store.execute('proposal.accept', { proposal: proposeFurnishing(store.document, { floorId: floor.id, seed: 3 }, store.editVersion) });
  const composition = Object.values(store.document.layout.compositions)[0];
  const light = Object.values(store.document.look.lights).find(l => l.type === 'point');
  assert.ok(light);
  store.execute('light.update', { id: light.id, patch: { type: 'spot', temperature: 3000, flicker: { ...FLICKER_DEFAULTS, enabled: true } } });
  const manual = structuredClone(store.document.look.lights[light.id]);
  store.execute('proposal.accept', { proposal: proposeFurnishing(store.document, { compositionId: composition.id, seed: 8 }, store.editVersion) });
  assert.equal(store.document.look.lights[light.id].type, 'spot');
  assert.equal(store.document.look.lights[light.id].temperature, manual.temperature);
  assert.deepEqual(store.document.look.lights[light.id].flicker, manual.flicker);
  store.execute('light.update', { id: light.id, patch: { type: 'point' } });
  assert.equal(store.document.look.lights[light.id].angle, undefined);
  store.undo(); assert.equal(store.document.look.lights[light.id].type, 'spot');
});

test('public look excludes secret spot sources and their animated parameters', () => {
  const scene = createScene(), light = createLight({ type: 'spot', audience: 'gm', flicker: { ...FLICKER_DEFAULTS, enabled: true } });
  scene.look.lights[light.id] = light;
  assert.equal(projectPresentation(scene).look.lights[light.id], undefined);
});

test('anchored spot keeps its edited direction relative to the host through movement, rotation and undo', () => {
  const store = createSceneStore(createScene()), wall = createEntity('wall', { length: 5 });
  store.execute('entity.add', { entity: wall });
  const light = createLight({ type: 'spot', anchor: { hostId: wall.id, socket: 'wall', offset: [2, 2, .2] } });
  store.execute('light.add', { light });
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(.5, .3, 0, 'YXZ'));
  store.execute('light.update', { id: light.id, patch: { rotation: tilt.toArray() } });
  assert.deepEqual(store.document.look.lights[light.id].rotation, tilt.toArray());
  const hostRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1);
  store.execute('entity.update', { id: wall.id, patch: { transform: { position: [4, 0, 0], rotation: hostRotation.toArray() } } });
  const expected = hostRotation.clone().multiply(tilt);
  assert.ok(new THREE.Quaternion(...store.document.look.lights[light.id].rotation).angleTo(expected) < 1e-7);
  store.execute('light.update', { id: light.id, patch: { intensity: 50 } });
  assert.ok(new THREE.Quaternion(...store.document.look.lights[light.id].rotation).angleTo(expected) < 1e-7);
  store.undo(); store.undo(); assert.deepEqual(store.document.look.lights[light.id].rotation, tilt.toArray());
});
