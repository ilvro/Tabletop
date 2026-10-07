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

for (const mode of ['server', 'pages']) test(`examples generate and cache covers from scene JSON without changing the table (${mode})`, { timeout: 120_000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-example-covers-'));
  const app = mode === 'server' ? await createApp({ dataDir: directory }) : express();
  if (mode === 'pages') app.use('/Tabletop', express.static(path.resolve('dist-pages')));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' }), errors = [], requests = [];
  page.on('dialog', dialog => dialog.accept());
  page.setDefaultTimeout(60_000); page.on('pageerror', error => errors.push(error.message)); page.on('request', request => requests.push(request.url()));
  const source = createScene('Fixture de prévia'), floor = createEntity('floor', { width: 8, length: 6 });
  source.layout.entities[floor.id] = floor;
  // Exercise the gallery with a small, real editable scene; large fixture rendering has separate tests.
  await page.route('**/scenes/*.json', route => route.fulfill({ json: source }));
  await page.goto(`http://127.0.0.1:${server.address().port}/${mode === 'pages' ? 'Tabletop/' : ''}?diagnostics`);
  await page.waitForFunction(() => !!window.__tabletop);
  const before = await page.evaluate(() => ({ document: __tabletop.snapshot(), camera: __tabletop.camera(), version: __tabletop.editVersion() }));
  await page.locator('[data-action="open"]').first().click();
  const selector = '[data-open-example="snowy-mountain-pass"]';
  await page.waitForFunction(selector => document.querySelector(`${selector} img`)?.naturalWidth === 480, selector);
  const image = await page.locator(`${selector} img`).getAttribute('src');
  assert.match(image, /^data:image\/jpeg;base64,/);
  assert.deepEqual(await page.evaluate(() => ({ document: __tabletop.snapshot(), camera: __tabletop.camera(), version: __tabletop.editVersion() })), before);
  assert.equal(requests.some(url => /\/scenes\/[^/]+\.(jpg|png|webp)/.test(url)), false);
  await page.locator('[data-action="close-dialog"]').click();
  await page.reload(); await page.waitForFunction(() => !!window.__tabletop);
  await page.locator('[data-action="open"]').first().click();
  await page.waitForFunction(selector => document.querySelector(`${selector} img`)?.naturalWidth === 480, selector);
  assert.equal(await page.locator(`${selector} img`).getAttribute('src'), image, 'persistent derived cover reused across reloads');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForFunction(selector => { const box = document.querySelector(selector).getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; }, selector);
  await mkdir('test-results', { recursive: true });
  await page.locator(selector).screenshot({ path: `test-results/example-cover-${mode}.png` });
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.locator(selector).click(); await page.waitForFunction(() => Object.keys(__tabletop.snapshot().layout.entities).length === 1);
  const copy = await page.evaluate(() => __tabletop.snapshot());
  assert.notEqual(copy.id, source.id); assert.equal(copy.revision, 0);
  assert.deepEqual(Object.values(copy.layout.entities)[0].transform, floor.transform);
  if (mode === 'pages') assert.equal(requests.some(url => url.includes('/api/')), false);
  assert.deepEqual(errors, []);
});

test('example cache is bounded and invalidates edits that keep the same revision', { timeout: 30_000 }, async t => {
  const app = express(); app.use('/src', express.static(path.resolve('src')));
  app.get('/', (_req, res) => res.send('<link rel="icon" href="data:,">'));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const page = await browser.newPage(); await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result = await page.evaluate(async () => {
    const { createExamplePreviewCache } = await import('/src/data/example-preview-cache.js');
    const options = { databaseName: 'cache-test' }, cache = createExamplePreviewCache(options), image = 'data:image/jpeg;base64,/9j/2Q==';
    for (let i = 0; i < 36; i++) await cache.write(String(i), image);
    const copy = createExamplePreviewCache(options), old = await copy.read('0'), recent = await copy.read('35');
    const before = await copy.key({ id: 'test' }, { revision: 0, name: 'Original' }, []);
    const after = await copy.key({ id: 'test' }, { revision: 0, name: 'Editada' }, []);
    return { old, recent, changed: before !== after };
  });
  assert.equal(result.old, null); assert.equal(result.recent, 'data:image/jpeg;base64,/9j/2Q=='); assert.equal(result.changed, true);
});
