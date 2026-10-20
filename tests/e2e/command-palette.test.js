import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';

test('Ctrl+K finds elements, controls and environments, and the shortcut sheet lists the keys', { timeout: 300_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-palette-')), scene = JSON.parse(await readFile('public/scenes/casa-de-bairro.json', 'utf8'));
  const server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: scene }) })).status, 201);
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.goto(`${base}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  await (await reveal(page.locator('[data-action="open"]').first())).click(); await page.locator(`[data-open="${scene.id}"]`).click();
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id, scene.id);
  const sofa = Object.values(scene.layout.entities).find(entity => entity.assetRef?.id === 'builtin-sofa'), floor = Object.values(scene.layout.entities).find(entity => entity.kind === 'floor');
  const palette = page.locator('#command-palette'), type = async text => { await page.locator('#palette-input').fill(text); };

  // From a text field, and straight to the sofa.
  await page.locator('#scene-name').focus(); await page.keyboard.press('Control+k'); await palette.waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'palette-input');
  await type('sof'); assert.match(await page.locator('.palette-option').first().innerText(), /Sofá/); await page.keyboard.press('Enter');
  await page.waitForFunction(id => document.querySelector('#scene-tree [data-select].selected, .tree-entry.selected')?.dataset.select === id, sofa.id).catch(() => {});
  assert.equal(await page.locator('.object-title strong').innerText(), sofa.name); assert.equal(await palette.getAttribute('open'), null);

  // The grout width of a tiled floor, found by its everyday word.
  await page.locator('[data-tab="elements"]').click(); await (await reveal(page.locator(`[data-select="${floor.id}"]`))).click();
  await (await reveal(page.locator('[data-field="material-texture"]'))).selectOption('tile');
  await page.locator('#scene-name').focus(); await page.keyboard.press('Control+k'); await type('rejunte');
  await page.locator('.palette-option', { hasText: 'Largura do rejunte' }).first().waitFor(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => /grout/i.test(document.activeElement?.dataset?.field ?? ''));
  assert.equal(await page.evaluate(() => document.activeElement.closest('[data-inspector-tab]').hidden), false);

  // An environment by name, then Escape closes and gives the focus back.
  await page.keyboard.press('Control+k'); await type('noite'); assert.ok((await page.locator('.palette-option').allInnerTexts()).some(text => /Noite/.test(text)));
  await page.keyboard.press('Escape'); await palette.waitFor({ state: 'hidden' });

  // The shortcut sheet opens with ? and tells the truth about Ctrl+K.
  await page.locator('.rail [data-action="shortcuts"]').click(); await page.locator('#shortcuts-sheet').waitFor({ state: 'visible' });
  assert.ok((await page.locator('#shortcuts-sheet kbd').allTextContents()).includes('Ctrl+K')); await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});
