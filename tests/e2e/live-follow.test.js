import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';

// Live camera on and the camera following a token: while the master drags it, the projector shows the token moving
// and its camera goes along, instead of waiting for the drop.
test('with the live camera following a token, the projector follows the drag as it happens', { timeout: 300_000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-live-follow-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  const project = point => page.evaluate(p => window.__tabletop.project(p), point);
  await page.locator('.tabs [data-tab="build"]').click(); await page.locator('#quick-form button[type="submit"]').click(); await page.locator('[data-action="accept-proposal"]').click(); await page.keyboard.press('Escape');
  await (await reveal(page.locator('[data-action="token-place"]'))).click();
  const at = await project([-1.5, 0, 0]); await page.mouse.click(at.x, at.y); await page.keyboard.press('Escape');
  const tokenId = await page.evaluate(() => Object.keys(window.__tabletop.snapshot().tokens)[0]);
  await page.locator('.tabs [data-tab="shots"]').click();
  const [projector] = await Promise.all([page.waitForEvent('popup'), (await reveal(page.locator('[data-action="presentation-window"]').first())).click()]);
  projector.setDefaultTimeout(60_000); projector.on('pageerror', e => errors.push(e.message));
  await projector.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  await page.locator('.tabs [data-tab="elements"]').click(); await page.locator(`#scene-tree [data-select="${tokenId}"]`).click();
  await page.locator('[data-action="token-follow"]').first().click();
  await page.locator('#viewport').hover({ position: { x: 20, y: 400 } }); await page.keyboard.press('l'); await page.keyboard.press('g');
  const target = () => projector.evaluate(() => window.__tabletop.camera().target[0]);
  const before = await target();
  // Dragged 3 m along x by the gizmo, slowly; the scene itself only changes at the drop.
  const from = await project([-1.5, .05, 0]), to = await project([1.5, .05, 0]);
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let i = 1; i <= 16; i++) { await page.mouse.move(from.x + (to.x - from.x) * i / 16, from.y + (to.y - from.y) * i / 16); await page.waitForTimeout(80); }
  await projector.waitForFunction(x => window.__tabletop.camera().target[0] > x + 1, before);
  assert.equal(await page.evaluate(id => window.__tabletop.snapshot().tokens[id].transform.position[0], tokenId), -1.5, 'still mid-drag: the scene has not changed yet');
  assert.ok(await projector.evaluate(() => window.__tabletop.stats().trail?.visible ?? true), 'the projector draws the trail of the drag');
  await page.mouse.up();
  const dropped = await page.evaluate(id => window.__tabletop.snapshot().tokens[id].transform.position[0], tokenId);
  assert.ok(dropped > before + 1);
  await projector.waitForFunction(x => Math.abs(window.__tabletop.camera().target[0] - x) < .3, dropped);
  assert.deepEqual(errors, []);
});
