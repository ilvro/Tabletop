import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity } from '../../src/domain/documents.js';
import { reveal } from './controls.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');

test('a character selected on the stage gets the cinematic card with its portrait', { timeout: 180_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-actor-')), scene = createScene('Elenco'), floor = createEntity('floor', { position: [0, 0, 0], width: 12, length: 12 });
  scene.layout.entities[floor.id] = floor;
  const server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: scene }) })).status, 201);
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } }), errors = [];
  page.setDefaultTimeout(30_000); page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.goto(`${base}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  await (await reveal(page.locator('[data-action="open"]').first())).click(); await page.locator(`[data-open="${scene.id}"]`).click();
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id, scene.id); await page.evaluate(() => window.__tabletop.ready());
  await page.locator('#asset-file').setInputFiles({ name: 'Retrato.png', mimeType: 'image/png', buffer: png });
  await page.waitForFunction(() => document.getElementById('gesture-hint').textContent.includes('Clique no piso'));
  const point = await page.evaluate(() => window.__tabletop.project([1, 0, 1])); await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => Object.keys(window.__tabletop.snapshot().tokens).length === 1);
  const doc = await page.evaluate(() => window.__tabletop.snapshot()), token = Object.values(doc.tokens)[0], actor = doc.actors[token.actorId];
  await page.locator('[data-tab="elements"]').click(); await (await reveal(page.locator(`[data-select="${token.id}"]`))).click();
  await page.locator('.actor-hero').waitFor();
  assert.equal(await page.locator('.object-title strong').innerText(), actor.name);
  assert.equal(await page.locator('.actor-hero .tt-tag').first().innerText(), 'PERSONAGEM');
  await page.waitForFunction(() => { const image = document.querySelector('.actor-hero img'); return image?.complete && image.naturalWidth > 0; });
  assert.ok(await page.locator('.tree-entry .tree-avatar').count());
  assert.deepEqual(errors, []);
});
