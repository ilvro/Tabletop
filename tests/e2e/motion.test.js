import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';

test('with reduced motion the scene cut, the live dot and the title card do not animate, and the fonts load', { timeout: 240_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-motion-')), server = (await createApp({ dataDir })).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  const context = await browser.newContext({ viewport: { width: 1600, height: 950 }, reducedMotion: 'reduce' }), page = await context.newPage(), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  assert.equal(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('13px "Hanken Grotesk"'); }), true, 'Hanken Grotesk is bundled and loads');

  // Opening an example never closes the bars.
  await page.evaluate(() => { window.__cut = []; new MutationObserver(list => list.forEach(entry => window.__cut.push(entry.target.className))).observe(document.querySelector('.stage-cut'), { attributes: true, attributeFilter: ['class'] }); });
  await (await reveal(page.locator('[data-action="open"]').first())).click(); await page.locator('[data-open-example="casa-de-bairro"]').click();
  await page.waitForFunction(() => Object.keys(window.__tabletop.snapshot().layout.entities).length > 0);
  assert.deepEqual(await page.evaluate(() => window.__cut), []);

  // Live: the dot is still, and the title card on the projector only fades.
  await page.locator('[data-tab="shots"]').click();
  const popupPromise = page.waitForEvent('popup'); await (await reveal(page.locator('[data-action="presentation-window"]'))).click();
  const popup = await popupPromise; popup.on('pageerror', error => errors.push(error.message));
  await popup.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  await page.waitForFunction(() => document.querySelector('#view-tag').dataset.state === 'live');
  assert.equal(await page.locator('#view-tag .view-dot').evaluate(node => getComputedStyle(node).animationName), 'none');
  const duration = await reveal(page.locator('[data-field="title-card-duration"]')); await duration.fill('2'); await duration.press('Tab');
  await (await reveal(page.locator('[data-action="title-card"]'))).click();
  const card = popup.locator('.title-card'); await card.waitFor({ state: 'visible' });
  assert.equal(await card.evaluate(node => getComputedStyle(node).transform), 'none');
  assert.ok(parseFloat(await popup.locator('.title-rule').evaluate(node => getComputedStyle(node).transitionDuration)) < .001, 'the title rule does not animate');
  await popup.close();
  assert.deepEqual(errors, []);
});
