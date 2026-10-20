import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity, id } from '../../src/domain/documents.js';
import { reveal } from './controls.js';

test('direct links open a scene and rehearse a shot without publishing, and the address follows the scene', { timeout: 240_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-links-')), scene = createScene('Link'), floor = createEntity('floor', { position: [0, 0, 0], width: 8, length: 8 });
  scene.layout.entities[floor.id] = floor;
  const shots = [[id(), 'Entrada', [6, 5, 7]], [id(), 'Altar', [-4, 3, -6]]];
  for (const [shotId, name, position] of shots) scene.cameraPresets[shotId] = { id: shotId, name, projection: 'perspective', position, target: [0, 0, 0], fov: 42, orthographicHeight: 18 };
  const server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: scene }) })).status, 201);
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 950 }, permissions: ['clipboard-read', 'clipboard-write'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', error => errors.push(error.message));

  // The link opens the scene and the working camera goes to the shot; nothing is published.
  await page.goto(`${base}/?diagnostics&scene=${scene.id}&shot=${shots[1][0]}`); await page.waitForFunction(() => !!window.__tabletop);
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id, scene.id);
  await page.waitForFunction(p => window.__tabletop.camera().position.every((v, i) => Math.abs(v - p[i]) < 1e-3), shots[1][2]);
  assert.equal((await page.locator('#view-tag').innerText()).trim(), 'ENSAIO');
  assert.equal(new URL(page.url()).searchParams.get('scene'), scene.id); assert.equal(new URL(page.url()).searchParams.has('diagnostics'), true);
  await page.locator('[data-tab="shots"]').click(); assert.equal(await page.locator('.shot.is-rehearsed').count(), 1); assert.equal(await page.locator('.shot.is-live').count(), 0);

  // Copy the link of the open scene.
  await page.locator('[data-action="copy-link"]').click();
  assert.equal(new URL(await page.evaluate(() => navigator.clipboard.readText())).searchParams.get('scene'), scene.id);

  // An unknown id does not stop the editor from starting.
  const lost = await context.newPage(); lost.setDefaultTimeout(60_000); lost.on('pageerror', error => errors.push(error.message));
  await lost.goto(`${base}/?diagnostics&scene=nao-existe`); await lost.waitForFunction(() => !!window.__tabletop);
  await lost.locator('#notice:not([hidden])').waitFor(); assert.match(await lost.locator('#notice').innerText(), /Não encontrei/);
  assert.equal(await lost.locator('#scene-name').isEnabled(), true);
  assert.deepEqual(errors, []);
});
