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

// A fireball dragged on the floor over one of two characters: the area, its ring and the projector.
test('an area of effect is dragged on the floor, rings the token it touches and shows on the projector', { timeout: 240_000 }, async t => {
  const store = createSceneStore(createScene('Áreas'));
  store.execute('entity.add', { entity: createEntity('floor', { width: 20, length: 20, position: [0, 0, 0] }), snap: false });
  const ids = [];
  for (const [name, x] of [['Lia', -3], ['Kian', 4]]) { const { token, actor } = createToken({ name, position: [x, 0, 0] }); store.execute('token.add', { token, actor, snap: false }); ids.push(token.id); }
  store.execute('camera.save', { camera: { id: 'top', name: 'Cima', projection: 'perspective', position: [0, 14, 8], target: [0, 0, 0], fov: 45, orthographicHeight: 18 } });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-areas-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) })).status, 201);
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?diagnostics&scene=${store.document.id}&shot=top`); await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, store.document.id);
  await page.locator('.tabs [data-tab="shots"]').click();
  const [projector] = await Promise.all([page.waitForEvent('popup'), (await reveal(page.locator('[data-action="presentation-window"]').first())).click()]);
  projector.setDefaultTimeout(60_000); projector.on('pageerror', e => errors.push(e.message));
  await projector.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  await (await reveal(page.locator('[data-field="area-label"]'))).fill('Bola de fogo'); await page.keyboard.press('Tab');
  await (await reveal(page.locator('[data-action="area-draw"]'))).click();
  // From x 3 to x 5: a 2 m circle around Kian, far from Lia.
  const from = await page.evaluate(p => window.__tabletop.project(p), [3.5, 0, 0]), to = await page.evaluate(p => window.__tabletop.project(p), [5.5, 0, 0]);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(from.x + (to.x - from.x) * i / 8, from.y + (to.y - from.y) * i / 8);
  await page.mouse.up();
  await page.waitForFunction(() => window.__tabletop.snapshot().sessionState.areas?.length === 1);
  const area = (await page.evaluate(() => window.__tabletop.snapshot().sessionState.areas))[0];
  assert.equal(area.shape, 'circle'); assert.equal(area.label, 'Bola de fogo'); assert.ok(Math.abs(area.size - 2) < .3, `about 2 m (${area.size})`);
  assert.deepEqual(await page.evaluate(() => window.__tabletop.stats().areas), { areas: 1, touched: 1 });
  await projector.waitForFunction(() => window.__tabletop.stats().areas?.areas === 1 && window.__tabletop.stats().areas.touched === 1);
  await projector.waitForTimeout(800); await projector.screenshot({ path: 'test-results/effect-areas-projector.png' });
  // Cleared everywhere, one undo step.
  await (await reveal(page.locator('[data-action="areas-clear"]'))).click();
  await projector.waitForFunction(() => window.__tabletop.stats().areas.areas === 0);
  await page.locator('#undo').click();
  await page.waitForFunction(() => window.__tabletop.snapshot().sessionState.areas?.length === 1);
  assert.deepEqual(errors, []);
});
