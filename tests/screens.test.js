import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createScene, createEntity } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { screenDefaults, validateScreen, screenFrame, screenAnimated, screenContentKey, dotsAt, cursorAt, progressAt, screenFieldPatch, screenLineAdd, screenLineRemove } from '../src/domain/screens.js';
import { projectPresentation, presentationAssets } from '../src/app/presentation.js';
import { createScreenRuntime, screenClock, screenSlotFrame } from '../src/render/screens.js';
import { CABLE_ASSET, cableDefaults } from '../src/domain/cables.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const asset = id => { const found = catalog.find(a => a.id === id); assert.ok(found, id); return { id: found.id, revision: found.revision }; };

test('a screen has strict, bounded content: two lines and a bar by default, and nothing outside the limits', () => {
  validateScreen(screenDefaults());
  for (const bad of [{ extra: 1 }, { lines: Array.from({ length: 7 }, () => ({ text: 'x', size: .1, align: 'left', anim: 'none' })) }, { lines: [{ text: 'x'.repeat(41), size: .1, align: 'left', anim: 'none' }] },
    { lines: [{ text: 'x', size: .9, align: 'left', anim: 'none' }] }, { lines: [{ text: 'x', size: .1, align: 'middle', anim: 'none' }] }, { lines: [{ text: 'x', size: .1, align: 'left', anim: 'none', extra: 1 }] }, { color: '#fff' }, { background: 'green' },
    { kind: 'image' }, { kind: 'video' }, { progress: { enabled: true, mode: 'loop', value: .4, speed: 0 } }, { progress: { enabled: true, mode: 'loop', value: 2, speed: .2 } }, { scanlines: 1.5 }, { flicker: -.1 }, { seed: 1.5 }, { seed: 70000 }, { imageRef: { id: 'x', revision: 0 } }])
    assert.throws(() => validateScreen(screenDefaults(bad)), undefined, JSON.stringify(bad).slice(0, 80));
  validateScreen(screenDefaults({ lines: [], progress: null })); validateScreen(screenDefaults({ lines: [{ text: '', size: .05, align: 'right', anim: 'cursor' }] }));
  validateScreen(screenDefaults({ kind: 'image', imageRef: { id: 'retrato', revision: 1 } }));
});

test('a screen belongs to a model, not to a cable or a decal, and an old document without one is untouched', async () => {
  const store = createSceneStore(createScene()), tv = asset('builtin-crt-tv');
  store.execute('entity.add', { entity: createEntity('prop', { assetRef: tv, footprint: [.7, .5], screen: screenDefaults() }), snap: false }); validateDocument(store.document);
  assert.throws(() => store.execute('entity.add', { entity: createEntity('prop', { assetRef: asset(CABLE_ASSET), footprint: [.2, .2], cable: cableDefaults(), screen: screenDefaults() }) }), /tela/i);
  assert.throws(() => store.execute('entity.add', { entity: { ...createEntity('prop', { assetRef: tv, footprint: [.7, .5] }), screen: { ...screenDefaults(), kind: 'image' } } }));
  for (const name of ['casa-de-bairro']) { const old = JSON.parse(await readFile(`public/scenes/${name}.json`, 'utf8')); assert.ok(Object.values(old.layout.entities).every(e => e.screen === undefined)); validateDocument(old); }
  const undone = store.document.layout.entities; store.undo(); assert.notEqual(store.document.layout.entities, undone);
});

test('the picture is a pure function of time: the same instant draws the same frame, at most ten times a second', () => {
  const s = screenDefaults();
  assert.ok(screenAnimated(s)); assert.equal(screenFrame(s, 1.234), screenFrame(s, 1.234)); assert.equal(screenFrame(s, 0), 0); assert.equal(screenFrame(s, 1), 10);
  let changes = 0, last = screenFrame(s, 0); for (let t = 0; t <= 1; t += .001) { const f = screenFrame(s, t); if (f !== last) { changes++; last = f; } } assert.ok(changes <= 10, `${changes} changes in a second`);
  const still = screenDefaults({ lines: [{ text: 'OK', size: .2, align: 'center', anim: 'none' }], progress: { enabled: true, mode: 'fixed', value: .5, speed: .2 } });
  assert.equal(screenAnimated(still), false); assert.equal(screenFrame(still, 99), 0); assert.equal(screenAnimated({ ...still, kind: 'static' }), true); assert.equal(screenAnimated({ ...s, enabled: false }), false);
  assert.deepEqual([0, .4, .8, 1.2, 1.6, 2].map(dotsAt), [0, 1, 2, 3, 0, 1]); assert.equal(cursorAt(0), true); assert.equal(cursorAt(.5), false); assert.equal(cursorAt(.7), true);
  for (let t = 0; t < 30; t += .37) { const p = progressAt(s.progress, t); assert.ok(p >= 0 && p <= 1); }
  assert.equal(progressAt({ enabled: true, mode: 'fixed', value: .3, speed: 1 }, 99), .3); assert.equal(progressAt({ ...s.progress, enabled: false }, 1), null); assert.equal(progressAt(null, 1), null); assert.equal(progressAt(s.progress, 3.9), 1, 'holds full before starting over');
});

test('only what is drawn is part of the content: the tube effect is not', () => {
  const s = screenDefaults(), key = screenContentKey(s);
  assert.equal(screenContentKey({ ...s, scanlines: .9, flicker: 0 }), key);
  assert.notEqual(screenContentKey({ ...s, lines: [{ ...s.lines[0], text: 'OTHER' }, s.lines[1]] }), key); assert.notEqual(screenContentKey({ ...s, color: '#ffffff' }), key);
});

test('lighting a screen hangs its light in front of it, and putting it out turns that light off', () => {
  const record = { kind: 'prop', supportHeight: .8 }, frame = { lightPosition: [0, .36, .45] };
  const on = screenFieldPatch(record, 'enabled', true, frame);
  assert.equal(on.screen.enabled, true); assert.equal(on.illumination.profile, 'screen'); assert.equal(on.illumination.shadowPolicy, 'off'); assert.equal(on.illumination.emissionSlot, 'none'); assert.deepEqual(on.illumination.position, [0, .36, .45]); validateScreen(on.screen);
  const lit = { ...record, ...on }, off = screenFieldPatch(lit, 'enabled', false, frame);
  assert.equal(off.screen.enabled, false); assert.equal(off.illumination.enabled, false); assert.deepEqual(off.screen.lines, lit.screen.lines, 'the content is kept');
  assert.equal(screenFieldPatch({ ...lit, ...off }, 'enabled', true, frame).illumination.enabled, true);
  const other = { ...lit, illumination: { ...lit.illumination, profile: 'lamp' } }; assert.equal(screenFieldPatch(other, 'enabled', false, frame).illumination, undefined, 'a light the person chose is not ours to turn off');
  const edited = screenFieldPatch(lit, 'line-1-text', 'SYS 9', frame).screen; assert.equal(edited.lines[1].text, 'SYS 9'); assert.equal(lit.screen.lines[1].text, 'SYS 4.2');
  assert.equal(screenFieldPatch(lit, 'line-0-size', 25).screen.lines[0].size, .25); assert.equal(screenFieldPatch(lit, 'scanlines', 80).screen.scanlines, .8); assert.equal(screenFieldPatch(lit, 'progress-value', 30).screen.progress.value, .3);
  assert.equal(screenFieldPatch(lit, 'imageRef', 'retrato@2').screen.imageRef.revision, 2); assert.throws(() => screenFieldPatch(lit, 'kind', 'image'), /imagem/i);
  assert.equal(screenFieldPatch(lit, 'kind', 'image', null, [{ id: 'retrato', revision: 3 }]).screen.imageRef.id, 'retrato'); assert.throws(() => screenFieldPatch(lit, 'line-9-text', 'x'));
  assert.equal(screenLineAdd(lit.screen).lines.length, 3); assert.equal(screenLineRemove(lit.screen, 0).lines.length, 1);
  let full = lit.screen; while (full.lines.length < 6) full = screenLineAdd(full); assert.throws(() => screenLineAdd(full)); validateScreen(full);
});

test('a screen survives the presentation, which also carries the image it shows', () => {
  const scene = createScene(), store = createSceneStore(scene), tv = createEntity('prop', { assetRef: asset('builtin-crt-tv'), footprint: [.7, .5], screen: screenDefaults({ kind: 'image', imageRef: { id: 'retrato', revision: 1 } }) });
  store.execute('entity.add', { entity: tv, snap: false });
  const projected = projectPresentation(store.document); assert.deepEqual(projected.layout.entities[tv.id].screen, store.document.layout.entities[tv.id].screen);
  const shown = presentationAssets(projected, [...catalog, { id: 'retrato', revision: 1, type: 'image', name: 'Retrato', url: '/x.png' }, { id: 'outra', revision: 1, type: 'image', name: 'Outra', url: '/y.png' }]);
  assert.ok(shown.some(a => a.id === 'retrato') && !shown.some(a => a.id === 'outra') && shown.some(a => a.id === 'builtin-crt-tv'));
});

// A canvas that only counts what is drawn on it, so the runtime can be exercised without a browser.
function fakeCanvas(width, height) {
  const calls = { fillRect: 0, fillText: 0, strokeRect: 0 };
  const context = { calls, fillRect() { calls.fillRect++; }, strokeRect() { calls.strokeRect++; }, fillText() { calls.fillText++; }, drawImage() {}, putImageData() {}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: () => ({ data: Uint8ClampedArray.from([0, 255, 0, 255, 0, 255, 0, 255]) }), set fillStyle(v) {}, set strokeStyle(v) {}, set font(v) {}, set textAlign(v) {}, set textBaseline(v) {}, set lineWidth(v) {}, set imageSmoothingEnabled(v) {} };
  return { width, height, getContext: () => context, context };
}
function tvModel() {
  const root = new THREE.Group(), material = new THREE.MeshStandardMaterial({ color: '#436f6b', emissive: '#356c68', emissiveIntensity: .45 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(.46, .29, .02), material); mesh.userData.materialSlot = 'screen'; mesh.position.set(0, .3, .1);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.6, .4, .4), new THREE.MeshStandardMaterial()); body.userData.materialSlot = 'dark';
  const instance = new THREE.Group(); instance.add(body, mesh); root.add(instance); root.updateMatrixWorld(true); return { root, material, mesh };
}
const documentWith = (...records) => ({ layout: { entities: Object.freeze(Object.fromEntries(records.map(r => [r.id, r]))) } });

test('the runtime gives equal content one canvas, draws it at most ten times a second and lets go of it afterwards', () => {
  const runtime = createScreenRuntime({ createCanvas: fakeCanvas }), a = tvModel(), b = tvModel(), screen = screenDefaults();
  const records = [{ id: 'a', screen }, { id: 'b', screen: { ...screen, scanlines: .1 } }, { id: 'c', screen: { ...screen, lines: [{ text: 'OTHER', size: .2, align: 'left', anim: 'none' }], progress: { enabled: true, mode: 'fixed', value: .5, speed: .2 } } }], c = tvModel();
  const objects = new Map([['a', a.root], ['b', b.root], ['c', c.root]]), doc = documentWith(...records);
  let animated = false;
  for (let step = 0; step <= 62; step++) { const t = step * .016; animated = runtime.update(doc, objects, t, false, t * 1000); }
  assert.equal(runtime.size, 2, 'two screens with the same content share one canvas'); assert.ok(animated);
  const info = runtime.info(), shared = info.filter(i => i.key === info[0].key); assert.equal(shared.length, 2); assert.equal(shared[0].draws, shared[1].draws);
  const moving = info.find(i => i.id === 'a'); assert.ok(moving.draws >= 9 && moving.draws <= 11, `${moving.draws} draws in a second`); assert.equal(info.find(i => i.id === 'c').draws, 1, 'a still picture is drawn once');
  assert.equal(a.material.emissiveMap, b.material.emissiveMap); assert.notEqual(a.material.emissiveMap, c.material.emissiveMap); assert.equal(a.material.emissiveMap.colorSpace, THREE.SRGBColorSpace); assert.equal(a.material.emissiveIntensity, 1.6);
  assert.notEqual(a.material.userData.screen, b.material.userData.screen, 'a different tube effect is a different material');
  // Editing only the tube effect keeps the canvas and what was drawn on it.
  const drawsBefore = runtime.info().find(i => i.id === 'a').draws, keyBefore = runtime.info().find(i => i.id === 'a').key;
  runtime.update(documentWith({ id: 'a', screen: { ...screen, scanlines: .9 } }, { id: 'b', screen: { ...screen, scanlines: .1 } }, records[2]), objects, 1.0, false, 1000);
  assert.equal(runtime.info().find(i => i.id === 'a').key, keyBefore); assert.ok(runtime.info().find(i => i.id === 'a').draws >= drawsBefore); assert.equal(runtime.size, 2);
  // The glass keeps what the model had when the screen goes out.
  const out = documentWith({ id: 'a', screen: { ...screen, enabled: false } }, { id: 'b', screen }); runtime.update(out, objects, 1.1, false, 1100);
  assert.equal(a.material.emissiveMap, null); assert.equal(a.material.emissiveIntensity, .45); assert.equal(a.material.userData.screen, undefined); assert.equal(runtime.size, 1);
  assert.equal(runtime.lightFor('a'), null); const tint = runtime.lightFor('b'); assert.ok(tint.color.g > tint.color.r && tint.scale >= .25 && tint.scale <= 1);
  runtime.dispose(); assert.equal(runtime.size, 0); assert.equal(b.material.emissiveMap, null);
});

test('paused effects freeze a screen: the clock stops, nothing is drawn and the viewport is told there is nothing moving', () => {
  const runtime = createScreenRuntime({ createCanvas: fakeCanvas }), model = tvModel(), objects = new Map([['a', model.root]]), doc = documentWith({ id: 'a', screen: screenDefaults() });
  runtime.update(doc, objects, 2, false, 2000); const before = runtime.info()[0].draws;
  for (let step = 0; step < 100; step++) assert.equal(runtime.update(doc, objects, 2, true, 2000 + step * 100), false);
  assert.equal(runtime.info()[0].draws, before); assert.equal(screenClock.value, 2);
});

test('a screen finds itself on the model and gets a planar UV when the mesh has none', () => {
  const { root, mesh } = tvModel(), frame = screenSlotFrame(root);
  assert.deepEqual(frame.normal, [0, 0, 1]); assert.ok(Math.abs(frame.lightPosition[2] - (frame.center[2] + .3)) < 1e-9); assert.ok(Math.abs(frame.center[1] - .3) < 1e-9);
  assert.equal(screenSlotFrame(new THREE.Group()), null);
  mesh.geometry.deleteAttribute('uv'); const runtime = createScreenRuntime({ createCanvas: fakeCanvas });
  runtime.update(documentWith({ id: 'a', screen: screenDefaults() }), new Map([['a', root]]), 0, false, 0);
  const uv = mesh.geometry.attributes.uv; assert.ok(uv && uv.array.some(v => v > 0) && Math.max(...uv.array) <= 1 + 1e-9);
});
