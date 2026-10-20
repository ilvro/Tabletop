import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';

test('shots: rehearse without publishing, cut to the projector, thumbnails and the presentation dock', { timeout: 240_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-shots-')), server = (await createApp({ dataDir })).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } }), errors = [];
  page.setDefaultTimeout(30_000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  const action = async name => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const camera = target => target.evaluate(() => window.__tabletop.camera().position);
  const orbit = async () => {
    const box = await page.locator('#viewport').boundingBox(), [x, y] = [box.x + 160, box.y + box.height * .75];
    await page.mouse.move(x, y); await page.mouse.down({ button: 'right' }); await page.mouse.move(x + 120, y + 40, { steps: 10 }); await page.mouse.up({ button: 'right' });
    await page.waitForFunction(() => !window.__tabletop.stats().cameraMoving);
  };
  await action('floor-add');
  await page.locator('[data-tab="shots"]').click();
  assert.deepEqual(await page.locator('#side-content .task-heading').allTextContents(), ['Tomadas', 'Projetor']);

  // Two shots: the saved framing, then an orbited one.
  await action('camera-save'); await orbit(); await action('camera-save');
  const ids = Object.keys((await page.evaluate(() => window.__tabletop.snapshot())).cameraPresets); assert.equal(ids.length, 2);
  assert.equal(await page.locator('.shot').count(), 2);
  await page.waitForFunction(() => [...document.querySelectorAll('.shot-frame img')].some(image => image.naturalWidth > 0), null, { timeout: 15_000 });

  // The projector opens on the working camera; rehearsing the first shot must not move it.
  const popupPromise = page.waitForEvent('popup'); await action('presentation-window');
  const popup = await popupPromise; popup.on('pageerror', error => errors.push(error.message));
  await popup.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  const before = await camera(popup);
  await page.locator(`[data-camera-rehearse="${ids[0]}"]`).click();
  await page.waitForFunction(() => !window.__tabletop.stats().cameraMoving);
  assert.notDeepEqual(await camera(page), before); assert.deepEqual(await camera(popup), before);
  assert.match(await page.locator('#view-tag').innerText(), /projetor em outra tomada/);
  assert.equal(await page.locator('.shot.is-rehearsed').count(), 1);

  // Cut: the projector follows at once and that shot is marked on air.
  await page.locator(`[data-camera-cut="${ids[0]}"]`).click();
  await popup.waitForFunction(p => window.__tabletop.camera().position.every((v, i) => Math.abs(v - p[i]) < 1e-6), (await page.evaluate(id => window.__tabletop.snapshot().cameraPresets[id].position, ids[0])));
  assert.equal(await page.locator('.shot.is-live').count(), 1);

  // The dock: numbers cut directly, arrows choose and Enter makes a transition.
  await page.locator('[data-tab="build"]').click(); await page.locator('#shot-dock').waitFor({ state: 'visible' });
  await page.keyboard.press('2');
  await popup.waitForFunction(p => window.__tabletop.camera().position.every((v, i) => Math.abs(v - p[i]) < 1e-6), (await page.evaluate(id => window.__tabletop.snapshot().cameraPresets[id].position, ids[1])));
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter');
  await popup.waitForFunction(p => window.__tabletop.camera().position.every((v, i) => Math.abs(v - p[i]) < 1e-3), (await page.evaluate(id => window.__tabletop.snapshot().cameraPresets[id].position, ids[0])), { timeout: 15_000 });

  // The projector is clean: its controls fade after a moment, and a title card comes and goes by itself.
  await popup.waitForFunction(() => document.body.classList.contains('controls-idle'), null, { timeout: 8000 });
  assert.equal(await popup.locator('.projector-controls').evaluate(node => getComputedStyle(node).opacity), '0');
  await page.locator('[data-tab="shots"]').click();
  const field = async (name, value) => { const node = await reveal(page.locator(`[data-field="${name}"]`)); await node.fill(value); await node.press('Tab'); };
  await field('title-card-title', 'Capítulo um'); await field('title-card-subtitle', 'A casa'); await field('title-card-duration', '2');
  await (await reveal(page.locator('[data-action="title-card"]'))).click();
  await popup.locator('.title-card').waitFor({ state: 'visible' });
  assert.equal(await popup.locator('.title-card h1').textContent(), 'Capítulo um'); assert.equal(await popup.locator('.title-card .tt-tag').textContent(), 'A casa');
  await popup.locator('.title-card').waitFor({ state: 'detached', timeout: 5000 });
  await popup.close();
  assert.deepEqual(errors, []);
});
