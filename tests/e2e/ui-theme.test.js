import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';

test('settings change the interface palette, persist it and leave the scene untouched', { timeout: 180_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-theme-')), server = (await createApp({ dataDir })).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } }), errors = [];
  page.setDefaultTimeout(30_000); page.on('pageerror', error => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}/?diagnostics`;
  await page.goto(url); await page.waitForFunction(() => !!window.__tabletop);
  const token = name => page.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
  const sceneAccent = () => page.locator('.app-shell').evaluate(node => getComputedStyle(node).getPropertyValue('--scene-accent').trim());
  assert.equal(await token('--tt-accent'), '#e3b878');
  const before = JSON.stringify(await page.evaluate(() => window.__tabletop.snapshot()));

  await page.locator('.rail [data-action="settings"]').click(); await page.locator('#settings-dialog').waitFor({ state: 'visible' });
  await page.locator('[data-ui-palette="sky"]').click();
  const sky = await token('--tt-accent');
  assert.notEqual(sky, '#e3b878');
  assert.equal(await page.locator('[data-ui-palette="sky"]').getAttribute('aria-pressed'), 'true');
  // Buttons ease into the new colour; wait for the transition to settle.
  await page.waitForFunction(c => { const probe = document.createElement('i'); probe.style.color = c; document.body.append(probe); const want = getComputedStyle(probe).color; probe.remove(); return getComputedStyle(document.getElementById('save-scene')).backgroundColor === want; }, sky);

  // With "follow the scene" off, scene-derived accents use the palette too.
  await page.locator('#ui-theme-follow').uncheck();
  assert.equal(await sceneAccent(), sky);
  await page.keyboard.press('Escape'); await page.locator('#settings-dialog').waitFor({ state: 'hidden' });
  assert.equal(JSON.stringify(await page.evaluate(() => window.__tabletop.snapshot())), before, 'the scene document is not touched');

  // The choice survives a reload; a custom colour is lifted to stay readable.
  await page.reload(); await page.waitForFunction(() => !!window.__tabletop);
  assert.equal(await token('--tt-accent'), sky);
  await page.locator('.rail [data-action="settings"]').click();
  assert.equal(await page.locator('#ui-theme-follow').isChecked(), false);
  await page.locator('#ui-theme-custom').evaluate(input => { input.value = '#102080'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
  const custom = await token('--tt-accent');
  assert.notEqual(custom, sky); assert.notEqual(custom, '#102080');
  await page.locator('[data-ui-theme-reset]').click();
  assert.equal(await token('--tt-accent'), '#e3b878'); assert.equal(await page.locator('#ui-theme-follow').isChecked(), true);

  // The HUD has its own shortcut button.
  await page.locator('[data-settings-close]').click();
  await page.locator('.viewport-bottom .hud-help').click(); await page.locator('#shortcuts-sheet').waitFor({ state: 'visible' });
  assert.deepEqual(errors, []);
});
