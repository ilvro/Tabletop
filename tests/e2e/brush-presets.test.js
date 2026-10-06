import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity } from '../../src/domain/documents.js';
import { rockDefaults } from '../../src/domain/rocks.js';
import { reveal } from './controls.js';

for (const mode of ['server', 'pages']) test(`personal brush library, strokes, storage errors, concurrent tabs and reload (${mode})`, { timeout: 180_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-brush-presets-'));
  let server, browser;
  t.after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  if (mode === 'server') server = (await createApp({ dataDir })).listen(0, '127.0.0.1');
  else { const app = express(); app.use('/Tabletop', express.static(path.resolve('dist-pages'))); server = app.listen(0, '127.0.0.1'); }
  await once(server, 'listening');
  browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [], url = `http://127.0.0.1:${server.address().port}${mode === 'pages' ? '/Tabletop/' : '/'}?diagnostics`;
  page.setDefaultTimeout(30_000); page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.goto(url); await page.waitForFunction(() => Boolean(window.__tabletop));
  const scene = createScene('Pincéis pessoais');
  const terrain = createEntity('terrain', { name: 'Primeiro chão', width: 8, length: 8, segments: 16, position: [-6, 0, 0] });
  const other = createEntity('terrain', { name: 'Outro chão', width: 8, length: 8, segments: 8, position: [-6, 0, 11] });
  const rock = createEntity('prop', { name: 'Paredão', assetRef: { id: 'builtin-mountain-cliff-face', revision: 1 }, rockShape: rockDefaults('builtin-mountain-cliff-face'), position: [5, 0, 0] });
  for (const entity of [terrain, other, rock]) scene.layout.entities[entity.id] = entity;
  const importScene = async (p, doc) => {
    await p.locator('#document-json-file').setInputFiles({ name: 'brushes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(doc)) });
    await p.waitForFunction(id => window.__tabletop.snapshot().id === id, doc.id);
  };
  await importScene(page, scene);
  const action = async (name, p = page) => (await reveal(p.locator(`[data-action="${name}"]`).first())).click();
  const select = async (id, p = page) => {
    if (await p.locator('[data-action="sidebar-toggle"]').getAttribute('aria-expanded') === 'false') await action('sidebar-toggle', p);
    await p.locator('[data-tab="scene"]').click(); await (await reveal(p.locator(`[data-select="${id}"]`))).click();
  };
  const node = async (name, p = page) => reveal(p.locator(`[data-field="${name}"]`).first());
  const field = async (name, value, p = page) => { const input = await node(name, p); await input.fill(String(value)); await input.press('Tab'); };
  const choose = async (name, value, p = page) => (await node(name, p)).selectOption(value);
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  const ready = p => p.waitForFunction(() => !document.querySelector('[data-action="brush-preset-save"]')?.disabled);
  const savedId = () => page.locator('[data-field="preset-selection"]').inputValue();
  await action('top'); await action('frame'); await select(terrain.id);
  await choose('brush-mode', 'paint'); await choose('brush-shape', 'square');
  await field('brush-radius', 1.7); await field('brush-strength', .65);
  await (await node('brush-hardness')).evaluate(input => { input.value = '.75'; input.dispatchEvent(new Event('change', { bubbles: true })); });
  await (await node('brush-snap')).check();
  const original = await snapshot(), editVersion = await page.evaluate(() => window.__tabletop.editVersion()), camera = await page.evaluate(() => window.__tabletop.camera());
  await field('preset-name', 'Pintura quadrada'); await action('brush-preset-save'); await ready(page);
  const paintId = await savedId(); assert.ok(paintId);
  await field('preset-name', 'pintura QUADRADA'); await action('brush-preset-save'); await ready(page);
  assert.match(await page.locator('#notice').innerText(), /Já existe/);
  assert.equal(await page.locator('[data-field="preset-selection"] option').count(), 2);
  await select(other.id); await choose('brush-mode', 'raise'); await field('brush-radius', 4);
  await choose('preset-selection', paintId); await action('brush-preset-apply');
  assert.equal(await page.locator('[data-field="brush-mode"]').inputValue(), 'paint');
  assert.equal(await page.locator('[data-field="brush-radius"]').inputValue(), '1.7');
  assert.equal(await page.locator('[data-field="terrain-paint-layer"]').inputValue(), other.paintLayers[0].id);
  assert.deepEqual(await snapshot(), original); assert.equal(await page.evaluate(() => window.__tabletop.editVersion()), editVersion);
  assert.deepEqual(await page.evaluate(() => window.__tabletop.camera()), camera);

  await field('brush-radius', 2.3); await action('brush-preset-update'); await ready(page);
  await field('preset-name', 'Minha pintura'); await action('brush-preset-rename'); await ready(page);
  await field('brush-radius', 4); await action('brush-preset-apply');
  assert.equal(await page.locator('[data-field="brush-radius"]').inputValue(), '2.3');
  assert.equal(await page.locator('[data-field="preset-selection"] option:checked').innerText(), 'Minha pintura');

  // A stale tab cannot overwrite or delete a newer revision.
  const tab = await context.newPage(); tab.on('dialog', dialog => dialog.accept());
  await tab.goto(url); await tab.waitForFunction(() => Boolean(window.__tabletop));
  await action('open', tab); await tab.locator(`[data-open="${scene.id}"]`).click();
  await tab.waitForFunction(id => window.__tabletop.snapshot().id === id, scene.id); await select(other.id, tab);
  await choose('preset-selection', paintId, tab);
  await field('brush-radius', 1.9); await action('brush-preset-update'); await ready(page);
  await action('brush-preset-delete', tab); await ready(tab);
  assert.match(await tab.locator('#notice').innerText(), /mudou em outra aba/);
  assert.equal(await tab.locator('[data-field="preset-selection"] option').count(), 2);
  await tab.close();

  // Failed storage must leave the existing preset intact and report failure.
  await page.evaluate(() => {
    window.originalPresetPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'presets') throw new DOMException('Espaço insuficiente para salvar pincéis.', 'QuotaExceededError');
      return window.originalPresetPut.apply(this, args);
    };
  });
  await field('brush-radius', 3.5); await action('brush-preset-update'); await ready(page);
  assert.match(await page.locator('#notice').innerText(), /Espaço insuficiente/);
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.originalPresetPut; delete window.originalPresetPut; });
  await action('brush-preset-apply'); assert.equal(await page.locator('[data-field="brush-radius"]').inputValue(), '1.9');

  await select(rock.id); assert.equal(await page.locator('[data-field="preset-selection"] option').count(), 1);
  await choose('brush-mode', 'push'); await field('brush-radius', 1.4); await field('brush-strength', .6);
  await field('preset-name', 'Minha pintura'); await action('brush-preset-save'); await ready(page);
  const rockId = await savedId();
  await choose('brush-mode', 'lower'); await action('brush-preset-apply');
  assert.equal(await page.locator('[data-field="brush-mode"]').inputValue(), 'push');
  assert.equal(await page.locator('[data-field="brush-strength"]').inputValue(), '0.6');
  assert.deepEqual(await snapshot(), original);

  // Reuse in a different document; local layer IDs are never copied from a preset.
  const fresh = createScene('Outra cena');
  const ground = createEntity('terrain', { width: 10, length: 10, segments: 16 }); fresh.layout.entities[ground.id] = ground;
  await importScene(page, fresh); await select(ground.id); await choose('preset-selection', paintId); await action('brush-preset-apply');
  assert.equal(await page.locator('[data-field="terrain-paint-layer"]').inputValue(), ground.paintLayers[0].id);
  await choose('brush-mode', 'raise'); await choose('brush-shape', 'circle'); await (await node('brush-snap')).uncheck();
  await field('brush-radius', 2); await field('brush-strength', .4); await field('preset-name', 'Elevar suave');
  await action('brush-preset-save'); await ready(page); const raiseId = await savedId();
  await field('brush-strength', .9); await action('brush-preset-apply'); await action('top'); await action('frame');
  await page.waitForFunction(() => !window.__tabletop.stats().cameraMoving);
  const [projector] = await Promise.all([page.waitForEvent('popup'), action('presentation-window')]);
  await projector.waitForFunction(() => Boolean(window.__tabletop));
  await projector.waitForFunction(() => window.__tabletop.stats().objects > 0);
  const publishedCamera = await projector.evaluate(() => window.__tabletop.camera());
  await page.bringToFront(); await action('terrain-sculpt');
  const point = await page.evaluate(() => window.__tabletop.project([0, 0, 0]));
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x + 20, point.y, { steps: 4 }); await page.mouse.up();
  await page.waitForFunction(id => window.__tabletop.snapshot().layout.entities[id].heights.some(height => height > 0), ground.id);
  assert.deepEqual(await projector.evaluate(() => window.__tabletop.camera()), publishedCamera);
  await action('undo'); assert.deepEqual((await snapshot()).layout.entities[ground.id].heights, ground.heights);
  await action('tool-select'); await action('save'); await page.waitForFunction(() => document.getElementById('save-status').textContent.startsWith('Salvo'));
  await projector.close(); await page.reload(); await page.waitForFunction(() => Boolean(window.__tabletop)); await select(ground.id);
  await choose('preset-selection', raiseId); await action('brush-preset-apply');
  assert.equal(await page.locator('[data-field="brush-radius"]').inputValue(), '2');
  assert.equal(await page.locator('[data-field="brush-strength"]').inputValue(), '0.4');
  await choose('preset-selection', paintId); await action('brush-preset-delete'); await ready(page);
  assert.equal(await page.locator('[data-field="preset-selection"] option').count(), 2);
  await choose('preset-selection', raiseId);
  await mkdir('test-results', { recursive: true });
  await (await node('preset-name')).scrollIntoViewIfNeeded(); await page.screenshot({ path: `test-results/brush-presets-${mode}.png` });
  // Rock library also survived reload, even though the current scene contains no rock.
  const stored = await page.evaluate(scope => new Promise((resolve, reject) => {
    const request = indexedDB.open(`tabletop-brush-presets-v1:${scope}`, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result, tx = db.transaction('presets'), all = tx.objectStore('presets').getAll(); all.onsuccess = () => resolve(all.result); tx.oncomplete = () => db.close(); };
  }), mode === 'pages' ? '/Tabletop/' : '/');
  assert.equal(stored.length, 2); assert.equal(stored.find(entry => entry.id === rockId).brush.mode, 'push');
  assert.ok(stored.every(entry => !Object.hasOwn(entry.brush, 'layerId')));
  await page.setViewportSize({ width: 430, height: 900 }); await select(ground.id);
  await (await node('preset-name')).scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.brush-presets').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
  await page.screenshot({ path: `test-results/brush-presets-${mode}-mobile.png` });
  assert.deepEqual(errors, []);
});
