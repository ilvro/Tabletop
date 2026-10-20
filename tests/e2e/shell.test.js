import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';

test('rail, slate and stage: places, drawer toggling, state badge and compact layout', { timeout: 180_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-shell-')), server = (await createApp({ dataDir })).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } }), errors = [];
  page.setDefaultTimeout(30_000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  const shell = page.locator('.app-shell'), collapsed = () => shell.evaluate(node => node.classList.contains('sidebar-collapsed'));
  const badge = () => page.locator('#view-tag').innerText();

  // The rail holds the places and the windows.
  for (const tab of ['build', 'elements', 'scene']) assert.equal(await page.locator(`.rail .tabs [data-tab="${tab}"]`).count(), 1);
  for (const selector of ['[data-tab="assets"]', '[data-action="open"]', '[data-action="new"]', '[data-action="tutorials"]']) assert.equal(await page.locator(`.rail ${selector}`).count(), 1, selector);
  assert.equal(await page.locator('.rail .tabs [data-tab="build"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#drawer-title').innerText(), 'CONSTRUIR');
  await page.locator('.tabs [data-tab="elements"]').click(); assert.equal(await page.locator('#drawer-title').innerText(), 'ELEMENTOS');
  await page.locator('.tabs [data-tab="build"]').click();

  // The drawer collapses with a double click on the active place, or with the edge handle.
  assert.equal(await collapsed(), false);
  await page.locator('.tabs [data-tab="build"]').dblclick(); assert.equal(await collapsed(), true);
  await page.locator('.tabs [data-tab="scene"]').click(); assert.equal(await collapsed(), false); assert.equal(await page.locator('#drawer-title').innerText(), 'AMBIENTE');
  await page.locator('[data-action="sidebar-toggle"]').click(); assert.equal(await collapsed(), true);
  await page.locator('[data-action="sidebar-toggle"]').click(); assert.equal(await collapsed(), false);
  await page.locator('.tabs [data-tab="build"]').click();

  // Undo and redo live in the slate; the old toolbar and status bar are gone.
  assert.equal(await page.locator('.app-header #undo').count(), 1); assert.equal(await page.locator('.app-header #redo').count(), 1);
  assert.equal(await page.locator('.statusbar').count(), 0);
  await page.locator('[data-action="shortcuts"]').first().click(); await page.locator('#shortcuts-sheet').waitFor({ state: 'visible' });
  assert.ok((await page.locator('#shortcuts-sheet kbd').allTextContents()).includes('Ctrl+Z')); await page.keyboard.press('Escape'); await page.locator('#shortcuts-sheet').waitFor({ state: 'hidden' });

  // The stage is larger than before: at least the scene area measured at 1600x950 with both panels open.
  const box = await page.locator('#viewport').boundingBox(); assert.ok(box.width >= 900 && box.height >= 890, `${box.width}x${box.height}`);

  // Rehearsal until a projector connects; live while it follows; rehearsal again when the editor moves away.
  assert.equal(await badge(), 'ENSAIO');
  const popupPromise = page.waitForEvent('popup'); await page.locator('[data-tab="shots"]').click();
  await (await (async () => { const node = page.locator('[data-action="presentation-window"]'); await node.evaluate(n => { for (let p = n.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; }); return node; })()).click();
  const popup = await popupPromise; popup.on('pageerror', error => errors.push(error.message));
  await popup.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  await page.waitForFunction(() => document.querySelector('#view-tag').innerText.includes('AO VIVO'));
  const view = await page.locator('#viewport').boundingBox();
  // Orbit away from the centre, where the empty-scene card sits.
  const [ox, oy] = [view.x + 160, view.y + view.height * .75];
  await page.mouse.move(ox, oy); await page.mouse.down({ button: 'right' });
  await page.mouse.move(ox + 90, oy + 30, { steps: 12 }); await page.mouse.up({ button: 'right' });
  await page.waitForFunction(() => document.querySelector('#view-tag').innerText.includes('projetor em outra tomada'));
  const published = await popup.evaluate(() => window.__tabletop.camera());
  assert.deepEqual(await popup.evaluate(() => window.__tabletop.camera().position), published.position);
  await page.locator('#view-tag').click(); await page.waitForFunction(() => document.querySelector('#view-tag').innerText.includes('AO VIVO'));
  await popup.close(); await page.waitForFunction(() => document.querySelector('#view-tag').innerText.trim() === 'ENSAIO', null, { timeout: 40_000 });

  // Compact: the rail moves to the bottom and the sheets open one at a time.
  await page.setViewportSize({ width: 800, height: 900 });
  await page.waitForFunction(() => document.querySelector('.app-shell').classList.contains('sidebar-collapsed') && document.querySelector('.app-shell').classList.contains('inspector-collapsed'));
  const rail = await page.locator('.rail').boundingBox(); assert.ok(rail.y > 800 && rail.width >= 790);
  await page.locator('[data-action="sidebar-toggle"]').click(); assert.equal(await collapsed(), false);
  await page.locator('[data-action="inspector-toggle"]').click(); assert.equal(await collapsed(), true);
  assert.deepEqual(errors, []);
});
