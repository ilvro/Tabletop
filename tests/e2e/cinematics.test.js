import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity, createToken } from '../../src/domain/documents.js';
import { createSceneStore } from '../../src/state/scene-store.js';
import { reveal } from './controls.js';

// A small room at daytime with one character: the live atmosphere, the flashlight, focus, following and the live camera.
test('live ambience, flashlight, close-up focus, following and the live camera reach the projector as intended', { timeout: 480_000 }, async t => {
  const store = createSceneStore(createScene('Cinema ao vivo'));
  store.execute('environment.apply', { presetId: 'day' });
  store.execute('entity.add', { entity: createEntity('floor', { name: 'Chão', width: 10, length: 10, position: [0, 0, 0] }), snap: false });
  const { token, actor } = createToken({ name: 'Agatha', position: [1, 0, 1] });
  store.execute('token.add', { token, actor, snap: false });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-cinema-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) })).status, 201);
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
  page.setDefaultTimeout(90_000); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(`${base}/?diagnostics&scene=${store.document.id}`); await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, store.document.id);
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot()), stats = target => target.evaluate(() => window.__tabletop.stats());
  const action = async name => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  await page.locator('.tabs [data-tab="shots"]').click();
  const [projector] = await Promise.all([page.waitForEvent('popup'), action('presentation-window')]);
  projector.setDefaultTimeout(90_000); projector.on('pageerror', e => errors.push(e.message));
  await projector.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);

  // Dragging a slider shows the look in both windows; the document changes only on release, as one undo step.
  await action('ambience');
  const exposure = page.locator('[data-ambience="exposure"]'), revision = (await snapshot()).look.daylight.exposure;
  await exposure.evaluate(input => { input.value = '2.4'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await projector.waitForFunction(() => Math.abs(window.__tabletop.stats().exposure - 2.4) < 1e-6);
  assert.equal((await snapshot()).look.daylight.exposure, revision, 'nothing is committed while dragging');
  await exposure.evaluate(input => input.dispatchEvent(new Event('change', { bubbles: true })));
  await page.waitForFunction(() => window.__tabletop.snapshot().look.daylight.exposure === 2.4);
  assert.match(await page.locator('#undo').getAttribute('title'), /Ambientação ao vivo/);

  // A time of day travels there: the projector passes through the colours in between, then the scene is committed once.
  const dayBackground = await stats(projector).then(info => info.background);
  await page.locator('[data-ambience-duration="5"]').click();
  await page.locator('[data-ambience-time="moonlight"]').click();
  await projector.waitForFunction(day => { const bg = window.__tabletop.stats().background; return bg !== day && bg !== '#111d35'; }, dayBackground);
  await page.waitForFunction(() => window.__tabletop.snapshot().sourceEnvironment?.id === 'moonlight', null, { timeout: 120_000 });
  await projector.waitForFunction(() => window.__tabletop.stats().background === '#111d35');
  assert.match(await page.locator('#undo').getAttribute('title'), /Ambientação · Noite/);
  await action('ambience-close');

  // The flashlight is a token setting with one undo step, and its spot joins the light budget.
  await page.locator('.tabs [data-tab="elements"]').click(); await page.locator(`[data-select="${token.id}"]`).first().click();
  await action('token-flashlight');
  await page.waitForFunction(id => window.__tabletop.snapshot().tokens[id].flashlight?.enabled === true, token.id);
  await page.waitForFunction(id => window.__tabletop.stats().lighting.sources.includes(`${id}:flashlight`), token.id);
  await projector.waitForFunction(id => window.__tabletop.stats().cinema.flashlights.some(item => item.id === id && item.on), token.id);

  // Close-up: rehearsed in the editor with focus on the character; publishing carries the focus to the projector.
  await action('token-closeup');
  await page.waitForFunction(id => window.__tabletop.camera().focus?.targetId === id, token.id);
  await page.waitForFunction(() => window.__tabletop.stats().effects.depthOfField !== null);
  assert.equal((await stats(projector)).effects.depthOfField, null, 'rehearsal does not reach the players');
  await action('publish-camera');
  await projector.waitForFunction(() => window.__tabletop.stats().effects.depthOfField !== null);

  // Following: the camera keeps the token in frame when it moves; keyboard travel lets go.
  await action('token-follow');
  await page.waitForFunction(id => window.__tabletop.stats().cinema.follow === id, token.id);
  await page.locator('[data-field="position-0"]').fill('3'); await page.locator('[data-field="position-0"]').press('Enter');
  await page.waitForFunction(() => Math.abs(window.__tabletop.camera().target[0] - 3) < .05);
  await page.locator('#viewport [data-testid="viewport-canvas"]').focus(); await page.keyboard.down('w'); await page.waitForTimeout(150); await page.keyboard.up('w');
  await page.waitForFunction(() => window.__tabletop.stats().cinema.follow === null);

  // Live camera: off by default; switched on, the projector approaches the editor's camera without a publish.
  const before = await projector.evaluate(() => window.__tabletop.camera().position);
  await page.locator('.tabs [data-tab="shots"]').click();
  await (await reveal(page.locator('[data-field="camera-live"]'))).check();
  await page.locator('#viewport [data-testid="viewport-canvas"]').focus(); await page.keyboard.down('d'); await page.waitForTimeout(400); await page.keyboard.up('d');
  const working = await page.evaluate(() => window.__tabletop.camera().position);
  await projector.waitForFunction(target => window.__tabletop.camera().position.every((v, i) => Math.abs(v - target[i]) < .05), working);
  assert.notDeepEqual(working, before);
  await page.locator('[data-field="camera-live"]').uncheck();
  const held = await projector.evaluate(() => window.__tabletop.camera().position);
  await page.keyboard.down('a'); await page.waitForTimeout(300); await page.keyboard.up('a'); await page.waitForTimeout(500);
  assert.deepEqual(await projector.evaluate(() => window.__tabletop.camera().position), held, 'switched off, free navigation stays in the editor');

  assert.deepEqual(errors, []);
});
