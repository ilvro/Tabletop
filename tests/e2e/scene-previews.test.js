import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';

for (const mode of ['server', 'pages']) test(`automatic scene covers from creation through editing, duplication and reload (${mode})`, { timeout: 150_000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-previews-'));
  const app = mode === 'server' ? await createApp({ dataDir: directory }) : express();
  if (mode === 'pages') app.use('/Tabletop', express.static(path.resolve('dist-pages')));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? dialog.defaultValue() : undefined));
  await page.goto(`http://127.0.0.1:${server.address().port}/${mode === 'pages' ? 'Tabletop/' : ''}?diagnostics`);
  await page.waitForFunction(() => !!window.__tabletop);
  const action = async name => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  const id = (await snapshot()).id;
  await action('open');
  const image = () => page.locator(`[data-open="${id}"] img`);
  await page.waitForFunction(id => document.querySelector(`[data-open="${id}"] img`)?.naturalWidth === 480, id);
  assert.match(await page.locator(`[data-open="${id}"]`).textContent(), /Em criação/);
  const emptyImage = await image().getAttribute('src');
  await action('close-dialog');
  await page.locator('[data-tab=scene]').click();
  const [projector] = await Promise.all([page.waitForEvent('popup'), action('presentation-window')]);
  await projector.waitForFunction(() => window.__tabletop && document.getElementById('presentation-message').hidden);
  const publishedCamera = await projector.evaluate(() => window.__tabletop.camera());
  await page.bringToFront(); await page.locator('[data-tab=build]').click(); await action('floor-add');
  const before = await snapshot(), camera = await page.evaluate(() => window.__tabletop.camera());
  await action('open');
  await page.waitForFunction(({ id, previous }) => {
    const image = document.querySelector(`[data-open="${id}"] img`);
    return image?.naturalWidth === 480 && image.src !== previous;
  }, { id, previous: emptyImage });
  const populatedImage = await image().getAttribute('src');
  assert.deepEqual(await projector.evaluate(() => window.__tabletop.camera()), publishedCamera, 'preview does not publish a camera');
  await projector.close();
  assert.deepEqual(await snapshot(), before, 'automatic capture does not change the document');
  assert.deepEqual(await page.evaluate(() => window.__tabletop.camera()), camera, 'automatic capture does not move the work camera');
  // JPEG contains a rendered scene, rather than a single-colour placeholder.
  const diversity = await image().evaluate(async img => {
    await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 270;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    const bytes = ctx.getImageData(0, 0, 480, 270).data, colours = new Set();
    for (let i = 0; i < bytes.length; i += 64) colours.add(`${bytes[i] >> 3},${bytes[i + 1] >> 3},${bytes[i + 2] >> 3}`);
    return colours.size;
  });
  if(diversity<=20){
    await mkdir('test-results',{recursive:true});
    await writeFile(`test-results/failed-personal-cover-${mode}.jpg`,Buffer.from(populatedImage.split(',')[1],'base64'));
    await writeFile(`test-results/failed-personal-cover-${mode}.json`,JSON.stringify(await page.evaluate(()=>({camera:__tabletop.camera(),doc:__tabletop.snapshot(),performance:__tabletop.performance(),stats:__tabletop.stats(),notices:document.getElementById('notice').textContent})),null,2));
    await action('close-dialog');await page.locator('#viewport').screenshot({path:`test-results/failed-personal-cover-${mode}-viewport.png`});
  }
  assert.ok(diversity > 20, `rendered cover has ${diversity} colours`);
  await action('close-dialog'); await action('save');
  await page.waitForFunction(() => window.__tabletop.snapshot().revision === 1 && !document.querySelector('#save-scene').disabled);
  if (mode === 'server') await page.waitForFunction(async id => (await fetch(`api/tabletop/scenes/${id}/preview`)).ok, id);
  await page.reload(); await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, id);
  await action('open'); await image().waitFor();
  await page.waitForFunction(id => document.querySelector(`[data-open="${id}"] img`)?.naturalWidth === 480, id);
  if (mode === 'server') {
    const metadata = await page.evaluate(async id => (await (await fetch('api/tabletop/scenes')).json()).find(doc => doc.id === id), id);
    assert.equal(metadata.previewRevision, 1); assert.ok(metadata.preview.endsWith('/preview?revision=1'));
  }
  else assert.equal(await image().getAttribute('src'), populatedImage);
  await page.locator(`[data-duplicate-scene-id="${id}"]`).click();
  await page.waitForFunction(id => [...document.querySelectorAll('[data-open]')].some(node => node.dataset.open !== id && node.querySelector('img')?.naturalWidth === 480), id);
  assert.equal(await page.locator('[data-open]').count(), 2);
  const copyId = await page.locator(`[data-open]:not([data-open="${id}"])`).getAttribute('data-open');
  await page.locator(`[data-open="${copyId}"]`).click(); await page.waitForFunction(id => window.__tabletop.snapshot().id === id, copyId);
  await action('open'); await page.locator('[data-dialog-tab="maps"]').click();
  await action('save-current-as-map');
  await page.waitForFunction(() => document.querySelector('[data-open-map] img')?.naturalWidth === 480);
  await page.locator('[data-instantiate-map]').click();
  await page.waitForFunction(id => window.__tabletop.snapshot().id !== id && window.__tabletop.snapshot().revision === 1, copyId);
  const fromMapId = (await snapshot()).id;
  await action('open'); await page.locator('[data-dialog-tab="scenes"]').click();
  await page.waitForFunction(id => document.querySelector(`[data-open="${id}"] img`)?.naturalWidth === 480, fromMapId);
  await action('close-dialog');
  // JSON imported as a new document receives a cover without embedded image data.
  const imported = { ...await snapshot(), id: 'ab4922ad-9c9d-466d-8761-4288a3f349c1', revision: 0, name: 'Cena importada' };
  await page.locator('#document-json-file').setInputFiles({ name: 'scene.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id && window.__tabletop.snapshot().revision === 1, imported.id);
  await action('open'); await page.waitForFunction(id => document.querySelector(`[data-open="${id}"] img`)?.naturalWidth === 480, imported.id);
  await action('close-dialog');
  await action('new'); const nextId = (await snapshot()).id; assert.notEqual(nextId, id);
  await action('open'); await page.waitForFunction(id => document.querySelector(`[data-open="${id}"] img`)?.naturalWidth === 480, nextId);
  assert.equal(await page.locator('[data-open]').count(), 5, 'new unsaved scene also receives a cover');
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: `test-results/scene-previews-${mode}.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const card of await page.locator('.scene-library-card').all()) assert.ok(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
  assert.deepEqual(errors, []);
});

test('older scenes get their own cover in the background after asynchronous models load', { timeout: 60_000 }, async t => {
  const { createScene, createEntity } = await import('../../src/domain/documents.js');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-old-cover-'));
  const app = await createApp({ dataDir: directory });
  const scene = createScene('Acervo anterior');
  const floor = createEntity('floor', { material: { color: '#d74435' } }); scene.layout.entities[floor.id] = floor;
  const crate = createEntity('prop', { assetRef: { id: 'builtin-crate', revision: 1 } }); scene.layout.entities[crate.id] = crate;
  scene.revision = 1; await app.locals.storage.write('scenes', scene);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);
  await page.waitForFunction(() => !!window.__tabletop);
  const before = await page.evaluate(() => ({ scene: window.__tabletop.snapshot(), camera: window.__tabletop.camera() }));
  await page.locator('[data-action="open"]').click();
  await page.locator(`[data-open="${scene.id}"]`).scrollIntoViewIfNeeded();
  try { await page.waitForFunction(id => document.querySelector(`[data-open="${id}"] img`)?.naturalWidth === 480, scene.id); }
  catch(error) {
    console.log('old cover queue',JSON.stringify(await page.evaluate(id=>({performance:__tabletop.performance(),notice:document.getElementById('notice').textContent,card:document.querySelector(`[data-open="${id}"]`)?.outerHTML,hiddenCanvases:document.querySelectorAll('[aria-hidden="true"] canvas').length}),scene.id),null,2));
    throw error;
  }
  assert.deepEqual(await page.evaluate(() => ({ scene: window.__tabletop.snapshot(), camera: window.__tabletop.camera() })), before);
  const colours = await page.locator(`[data-open="${scene.id}"] img`).evaluate(img => {
    const c = document.createElement('canvas'); c.width = 480; c.height = 270;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); const p = ctx.getImageData(0, 0, 480, 270).data;
    let warm = 0; for (let i = 0; i < p.length; i += 4) if (p[i] > p[i+1] * 1.7 && p[i] > 100) warm++;
    return warm;
  }); assert.ok(colours > 500, 'background capture contains the red floor of the saved scene');
  assert.deepEqual(await app.locals.storage.read('scenes', scene.id), scene);
  assert.equal((await app.locals.storage.preview('scenes', scene.id)).revision, 1);
  await page.locator('[data-action="close-dialog"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('[aria-hidden="true"] canvas').length===0);
  assert.equal(await page.locator('[aria-hidden="true"] canvas').count(), 0, 'temporary renderer is disposed after gallery jobs are cancelled');
});
