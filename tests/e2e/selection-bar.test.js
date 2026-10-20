import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';

test('the selection bar follows the selected object and opens the inspector tabs', { timeout: 300_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-bar-')), scene = JSON.parse(await readFile('public/scenes/casa-de-bairro.json', 'utf8'));
  const server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: scene }) })).status, 201);
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.goto(`${base}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  await (await reveal(page.locator('[data-action="open"]').first())).click(); await page.locator(`[data-open="${scene.id}"]`).click();
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id, scene.id); await page.evaluate(() => window.__tabletop.ready());
  const sofa = Object.values(scene.layout.entities).find(entity => entity.assetRef?.id === 'builtin-sofa');
  assert.equal(await page.locator('#selection-bar').isVisible(), false);
  await page.locator('[data-tab="elements"]').click(); await (await reveal(page.locator(`[data-select="${sofa.id}"]`))).click();
  await page.locator('#selection-bar').waitFor({ state: 'visible' });
  const bar = await page.locator('#selection-bar').boundingBox(), stage = await page.locator('#viewport').boundingBox();
  assert.ok(bar.x >= stage.x && bar.x + bar.width <= stage.x + stage.width && bar.y >= stage.y, 'inside the stage');
  // Looking at the object from another side moves the bar with it.
  const before = bar.x;
  await page.mouse.move(stage.x + 200, stage.y + stage.height * .75); await page.mouse.down({ button: 'right' }); await page.mouse.move(stage.x + 330, stage.y + stage.height * .75, { steps: 10 });
  await page.locator('#selection-bar').waitFor({ state: 'hidden' }); await page.mouse.up({ button: 'right' });
  await page.locator('#selection-bar').waitFor({ state: 'visible' }); assert.notEqual((await page.locator('#selection-bar').boundingBox()).x, before);
  // Aparência opens the look tab.
  await page.locator('[data-tab="build"]').click();
  await page.locator('#selection-bar [data-bar="look"]').click();
  assert.equal(await page.locator('[data-inspector-tab-button="look"]').getAttribute('aria-selected'), 'true');
  // The tool buttons switch tools; a light adds its own tab button.
  await page.locator('#selection-bar [data-bar="move"]').click(); assert.equal(await page.locator('[data-action="tool-move"]').getAttribute('class').then(text => /active/.test(text)), true);
  assert.deepEqual(errors, []);
});
