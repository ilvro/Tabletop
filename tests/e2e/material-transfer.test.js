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
import { surfacePatch, coverageDefaults } from '../../src/domain/materials.js';
import { reveal } from './controls.js';

for (const mode of ['server', 'pages']) test(`material eyedropper, scoped paste, history, persistence and independent projector (${mode})`, { timeout: 180_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-material-transfer-'));
  let server, browser;
  t.after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  if (mode === 'server') server = (await createApp({ dataDir })).listen(0, '127.0.0.1');
  else { const app = express(); app.use('/Tabletop', express.static(path.resolve('dist-pages'))); server = app.listen(0, '127.0.0.1'); }
  await once(server, 'listening');
  browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }), errors = [];
  page.setDefaultTimeout(30_000);
  page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:${server.address().port}${mode === 'pages' ? '/Tabletop/' : '/'}?diagnostics`);
  await page.waitForFunction(() => Boolean(window.__tabletop));

  const scene = createScene('Transferência de materiais');
  const source = createEntity('floor', { name: 'Origem', width: 3, length: 3, position: [-3, 0, 0], locked: true,
    material: { ...surfacePatch('wood'), textureColor: '#386c52', textureColorMode: 'replace', textureBrightness: .6, woodBoards: 8, textureSeed: 27, coverage: { ...coverageDefaults(), amount: .3 } } });
  const target = createEntity('floor', { name: 'Destino', width: 3, length: 3, position: [3, 0, 0], material: { ...surfacePatch('metal'), emissive: '#ff0000', emissiveIntensity: 1 } });
  const terrain = createEntity('terrain', { name: 'Camadas', width: 4, length: 4, segments: 4, position: [0, 0, 7] });
  const prop = createEntity('prop', { name: 'Material nomeado', assetRef: { id: 'builtin-crate', revision: 1 }, position: [-4, 0, 7] });
  for (const entity of [source, target, terrain, prop]) scene.layout.entities[entity.id] = entity;
  await page.locator('#document-json-file').setInputFiles({ name: 'materials.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(scene)) });
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id, scene.id);
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  const action = async name => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const select = async id => { await page.locator('[data-tab="scene"]').click(); await (await reveal(page.locator(`[data-select="${id}"]`))).click(); };
  await action('top'); await action('frame'); await select(target.id);
  assert.equal(await page.locator('[data-action="material-paste"]').isDisabled(), true);
  const beforeSample = await snapshot(), editVersion = await page.evaluate(() => window.__tabletop.editVersion());
  await page.locator('#viewport canvas').focus(); await page.keyboard.press('i');
  assert.match(await page.locator('#tool-context').innerText(), /Conta-gotas/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#tool-context').isHidden(), true);
  await page.keyboard.press('i');
  const point = await page.evaluate(position => window.__tabletop.project(position), source.transform.position);
  assert.equal(point.visible, true); await page.mouse.click(point.x, point.y);
  assert.deepEqual(await snapshot(), beforeSample);
  assert.equal(await page.evaluate(() => window.__tabletop.editVersion()), editVersion);
  assert.equal(await page.locator('#inspector-content .object-title strong').innerText(), target.name);
  assert.equal(await page.locator('[data-action="material-paste"]').isEnabled(), true);

  const popup = page.waitForEvent('popup'); await action('presentation-window'); const projector = await popup;
  await projector.waitForFunction(() => Boolean(window.__tabletop));
  await projector.waitForFunction(() => window.__tabletop.stats().objects > 0);
  const camera = await projector.evaluate(() => window.__tabletop.camera());
  await page.locator('#viewport canvas').focus(); await page.keyboard.press('Control+Shift+V');
  assert.deepEqual((await snapshot()).layout.entities[target.id].material, source.material);
  await action('undo'); assert.deepEqual((await snapshot()).layout.entities[target.id].material, target.material);
  await action('redo');
  await projector.waitForFunction(id => window.__tabletop.stats().surfaceMaterials.some(material => material.id === id && material.texture === 'wood'), target.id);
  assert.deepEqual(await projector.evaluate(() => window.__tabletop.camera()), camera);

  await select(terrain.id);
  const mask = (await snapshot()).layout.entities[terrain.id].paintLayers[0].weights;
  await action('material-paste');
  let edited = (await snapshot()).layout.entities[terrain.id];
  assert.equal(edited.paintLayers[0].texture, 'wood'); assert.equal(edited.paintLayers[0].woodBoards, 8);
  assert.deepEqual(edited.paintLayers[0].weights, mask); assert.deepEqual(edited.material, terrain.material);
  await page.locator('#viewport canvas').focus(); await page.keyboard.press('Control+Shift+C');
  await (await reveal(page.locator('[data-field="terrain-material-target"]'))).selectOption('base');
  await action('material-paste'); edited = (await snapshot()).layout.entities[terrain.id];
  assert.equal(edited.material.texture, 'wood'); assert.equal(edited.material.coverage, undefined);
  assert.deepEqual(edited.paintLayers[0].weights, mask);

  await select(source.id); assert.equal(await page.locator('[data-action="material-paste"]').isDisabled(), true);
  await select(target.id);
  await (await reveal(page.locator(`[data-select="${terrain.id}"]`))).click({ modifiers: ['Shift'] });
  await action('material-paste');
  const multi = await snapshot();
  assert.equal(multi.layout.entities[target.id].material.coverage, undefined);
  await action('undo'); assert.deepEqual((await snapshot()).layout.entities[target.id].material, source.material);
  await action('redo');

  await select(prop.id);
  await (await reveal(page.locator('[data-field="material-textureSlot"]'))).selectOption('strap');
  await action('material-paste');
  assert.equal((await snapshot()).layout.entities[prop.id].material.textureSlot, 'strap');
  await page.waitForFunction(id => {
    const materials = window.__tabletop.stats().surfaceMaterials.filter(material => material.id === id);
    // Board and brace keep the wood finish built into the rebuilt crate; the paste reaches only the strap.
    return materials.some(material => material.slot === 'strap' && material.texture === 'wood') && materials.every(material => material.texture === 'wood');
  }, prop.id);

  await action('save'); await page.waitForFunction(() => document.getElementById('save-status').textContent.startsWith('Salvo'));
  const saved = await snapshot(); await projector.close();
  await page.reload(); await page.waitForFunction(() => Boolean(window.__tabletop));
  assert.deepEqual(await snapshot(), saved);
  await mkdir('test-results', { recursive: true }); await select(target.id);
  await (await reveal(page.locator('[data-action="material-copy"]'))).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/material-transfer-${mode}.png` });
  assert.deepEqual(errors, []);
});
