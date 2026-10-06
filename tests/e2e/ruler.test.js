import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity, createToken, createLayer } from '../../src/domain/documents.js';
import { reveal } from './controls.js';
import { validateDocument } from '../../src/domain/validation.js';

for (const mode of ['server', 'pages']) test(`ruler: metrics, tokens, surfaces, snap, gestures, isolation and touch (${mode})`, { timeout: 150_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-ruler-'));
  let server, browser;
  t.after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  if (mode === 'server') server = (await createApp({ dataDir })).listen(0, '127.0.0.1');
  else { const app = express(); app.use('/Tabletop', express.static(path.resolve('dist-pages'))); server = app.listen(0, '127.0.0.1'); }
  await once(server, 'listening');
  browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce', hasTouch: true }), errors = [];
  page.setDefaultTimeout(25_000); page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}${mode === 'pages' ? '/Tabletop/' : '/'}?diagnostics`);
  await page.waitForFunction(() => Boolean(window.__tabletop));
  const scene = createScene('Régua de combate'), floor = createEntity('floor', { width: 20, length: 16, position: [0, 2, 0], locked: true });
  const platform = createEntity('floor', { width: 2, length: 2, position: [-1, 5, 1] });
  const terrain = createEntity('terrain', { width: 4, length: 4, segments: 2, position: [6, 2, -3], heights: [0, 1, 2, 0, 1, 2, 0, 1, 2] });
  const hiddenLayer = createLayer({ name: 'Oculta', visible: false });
  scene.layout.layers = { [hiddenLayer.id]: hiddenLayer };
  const hidden = createEntity('floor', { width: 2, length: 2, position: [3, 9, 4], layerId: hiddenLayer.id });
  for (const entity of [floor, platform, terrain, hidden]) scene.layout.entities[entity.id] = entity;
  for (const pair of [createToken({ name: 'Origem', position: [-4, 2, -3], locked: true }), createToken({ name: 'Destino', position: [-1, 5, 1] })]) {
    scene.actors[pair.actor.id] = pair.actor; scene.tokens[pair.token.id] = pair.token;
  }
  scene.layout.grid.cellSize = 1.5; scene.layout.grid.origin = [-.25, .25];
  validateDocument(scene);
  await page.locator('#document-json-file').setInputFiles({ name: 'ruler.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(scene)) });
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id, scene.id);
  const action = async name => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const key = async value => { await page.locator('#viewport canvas').focus(); await page.keyboard.press(value); };
  const measurement = () => page.evaluate(() => window.__tabletop.stats().measurement);
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  const point = async value => { const result = await page.evaluate(p => window.__tabletop.project(p), value); assert.ok(result.visible, JSON.stringify(value)); return result; };
  const click = async value => { const p = await point(value); await page.mouse.click(p.x, p.y); };
  const drag = async (from, to) => {
    const a = await point(from), b = await point(to); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  };
  const near = (actual, expected, tolerance = .06) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);
  await page.locator('[data-tab="scene"]').click(); await (await reveal(page.locator(`[data-select="${floor.id}"]`))).click();
  await action('top'); await action('frame'); await page.waitForFunction(() => !window.__tabletop.stats().cameraMoving);
  const original = await snapshot(), version = await page.evaluate(() => window.__tabletop.editVersion()), camera = await page.evaluate(() => window.__tabletop.camera());
  const [projector] = await Promise.all([page.waitForEvent('popup'), action('presentation-window')]);
  await projector.waitForFunction(() => window.__tabletop?.stats().objects > 0);
  const publishedCamera = await projector.evaluate(() => window.__tabletop.camera()); await page.bringToFront();
  await key('m'); assert.equal(await page.locator('[data-action="tool-measure"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-field="ruler-snap"]').isChecked(), false);
  await click([-4, 2, -3]); assert.equal((await measurement()).complete, false);
  const end = await point([-1, 5, 1]); await page.mouse.move(end.x, end.y);
  near((await measurement()).horizontal, 5, 1e-8);
  await click([-1, 5, 1]);
  let result = await measurement(); assert.equal(result.complete, true);
  assert.deepEqual(result.start, [-4, 2, -3]); assert.deepEqual(result.end, [-1, 5, 1]);
  near(result.horizontal, 5, 1e-8); near(result.spatial, Math.sqrt(34), 1e-8); near(result.elevation, 3, 1e-8); near(result.cells, 5 / 1.5, 1e-8);
  assert.match(await page.locator('#ruler-result').innerText(), /Plano: 5,00 m · 3D: 5,83 m · Desnível: \+3,00 m/);
  assert.equal(await page.locator('#ruler-result').getAttribute('aria-live'), 'polite');
  assert.equal(await page.locator('.ruler-label').isVisible(), true);
  const idle = await point([4, 2, 4]); await page.mouse.move(idle.x, idle.y); assert.deepEqual(await measurement(), result);
  assert.deepEqual(await snapshot(), original); assert.equal(await page.evaluate(() => window.__tabletop.editVersion()), version);
  assert.deepEqual(await page.evaluate(() => window.__tabletop.camera()), camera);
  assert.equal(await projector.evaluate(() => window.__tabletop.stats().measurement), null);

  // A new drag replaces the confirmed ruler; reversed elevation is signed.
  await drag([-1, 5, 1], [-4, 2, -3]); near((await measurement()).elevation, -3, 1e-8);
  // Lost/cancelled pointer capture restores the last confirmed result.
  const confirmed = await measurement();
  await page.evaluate(() => document.querySelector('#viewport canvas').addEventListener('pointerdown', e => { window.rulerPointerId = e.pointerId; }, { once: true }));
  const a = await point([-6, 2, 3]); await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.evaluate(() => document.querySelector('#viewport canvas').dispatchEvent(new PointerEvent('pointercancel', { pointerId: window.rulerPointerId, pointerType: 'mouse', isPrimary: true, bubbles: true })));
  await page.mouse.up(); assert.deepEqual(await measurement(), confirmed);
  await action('ruler-clear'); assert.equal(await measurement(), null);
  assert.equal(await page.locator('.ruler-label').isVisible(), false);
  await drag([3, 2, 4], [6, 3, -3]); result = await measurement();
  near(result.start[1], 2, 1e-6); near(result.end[1], 3); // hidden platform ignored; sloped terrain hit
  assert.equal(result.complete, true);
  // Ruler snap is independent of the document's enabled authoring snap; Alt bypasses it.
  await page.locator('[data-field="ruler-snap"]').check();
  await drag([-6.12, 2, 3.12], [-3.14, 2, 5.15]); result = await measurement();
  near(result.start[0], -6.25, 1e-6); near(result.start[2], 3.25, 1e-6);
  near(result.end[0], -3.25, 1e-6); near(result.end[2], 4.75, 1e-6);
  await drag([-4, 2, -3], [-1, 5, 1]);
  assert.deepEqual((await measurement()).start, [-4, 2, -3]); assert.deepEqual((await measurement()).end, [-1, 5, 1]);
  await page.keyboard.down('Alt'); await drag([-6.12, 2, 3.12], [-3.14, 2, 5.15]); await page.keyboard.up('Alt');
  result = await measurement(); near(result.start[0], -6.12); near(result.end[2], 5.15);
  await page.locator('[data-field="ruler-snap"]').uncheck();
  await action('ruler-clear'); await drag([11, 0, 3], [12, 0, 5]); result = await measurement();
  near(result.start[1], 0, 1e-6); near(result.end[1], 0, 1e-6); near(result.horizontal, Math.sqrt(5)); // workplane outside scene geometry
  await key('Escape'); assert.equal(await measurement(), null); assert.equal(await page.locator('#tool-context').isVisible(), false);
  await key('m'); await drag([-4, 2, -3], [-1, 5, 1]);
  // Keyboard navigation changes only the working camera and keeps the world measurement fixed.
  result = await measurement(); await key('d'); // short key press
  await page.waitForFunction(() => !window.__tabletop.stats().cameraMoving);
  assert.deepEqual(await measurement(), result); assert.deepEqual(await snapshot(), original);
  assert.deepEqual(await projector.evaluate(() => window.__tabletop.camera()), publishedCamera);
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: `test-results/ruler-${mode}.png` });

  await action('present'); assert.equal(await measurement(), null);
  assert.equal(await page.locator('#tool-context').isVisible(), false);
  await key('Escape');

  await key('q'); assert.equal(await measurement(), null);
  // Names and other text fields retain normal typing (M does not activate the ruler).
  await page.locator('[data-tab="build"]').click();
  const tokenName = page.locator('#token-name'); await reveal(tokenName); await tokenName.fill(''); await tokenName.press('m');
  assert.equal(await tokenName.inputValue(), 'm'); assert.equal(await page.locator('[data-action="tool-measure"]').getAttribute('aria-pressed'), 'false');
  // Real touch interaction on a narrow viewport must not pan the camera or open inspectors.
  await page.setViewportSize({ width: 430, height: 900 });
  await action('tool-measure'); await action('top'); await action('frame'); await page.waitForFunction(() => !window.__tabletop.stats().cameraMoving);
  const mobileCamera = await page.evaluate(() => window.__tabletop.camera());
  const p1 = await point([-4, 2, -3]), p2 = await point([-1, 5, 1]);
  await page.touchscreen.tap(p1.x, p1.y); await page.touchscreen.tap(p2.x, p2.y);
  near((await measurement()).horizontal, 5, 1e-8); assert.equal((await measurement()).complete, true);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p2.x, y: p2.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p1.x, y: p1.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  near((await measurement()).elevation, -3, 1e-8); assert.equal((await measurement()).complete, true);
  assert.deepEqual(await page.evaluate(() => window.__tabletop.camera()), mobileCamera);
  assert.equal(await page.locator('[data-action="sidebar-toggle"]').getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('[data-action="inspector-toggle"]').getAttribute('aria-expanded'), 'false');
  assert.deepEqual(await snapshot(), original);
  const bounds = await page.locator('#tool-context').boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 430);
  const toolbar = await page.locator('.tool-strip').boundingBox(); assert.ok(toolbar.x >= 0 && toolbar.x + toolbar.width <= 430);
  await page.screenshot({ path: `test-results/ruler-${mode}-mobile.png` });
  await page.locator('#tool-context [data-action="tool-select"]').click(); assert.equal(await measurement(), null);
  await action('tool-measure'); await click([-4, 2, -3]); await key('Escape'); assert.equal(await measurement(), null);
  // Document replacement cannot keep a ruler pointing at geometry from the previous scene.
  await action('tool-measure'); await click([-4, 2, -3]);
  const empty = createScene('Outra cena');
  await page.locator('#document-json-file').setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(empty)) });
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id, empty.id); assert.equal(await measurement(), null);
  assert.deepEqual(errors, []);
});
