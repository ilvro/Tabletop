import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity } from '../../src/domain/documents.js';
import { reveal } from './controls.js';

const launch = () => chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const catalog = JSON.parse(await readFile('public/assets/catalog.json', 'utf8')).assets.filter(a => a.tags.includes('igreja antiga'));

test('church kit renders all silhouettes and original surfaces, isolates overrides and releases GPU resources', { timeout: 120000 }, async t => {
  const app = express();
  app.get('/', (_req, res) => res.type('html').send('<link rel="icon" href="data:,"><style>body{margin:0;background:#20272b;color:#eee;font:14px sans-serif}#sheet{display:grid;grid-template-columns:repeat(6,200px)}figure{margin:0}img{width:200px;height:200px}figcaption{height:40px;padding:4px}</style><div id="sheet"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/three', express.static(path.resolve('node_modules/three'))); app.use('/src', express.static(path.resolve('src'))); app.use('/assets', express.static(path.resolve('public/assets')));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(r => server.close(r)));
  const browser = await launch(); t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async assets => {
    const THREE = await import('three'), { recipeInstance, disposeObject } = await import('/src/render/asset-cache.js'), { createSurfaceLibrary, applySurfaceTextures } = await import('/src/render/surface-materials.js');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setSize(600, 600); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#20272b'); scene.add(new THREE.HemisphereLight('#ffe8cf', '#5a6279', 2)); const light = new THREE.DirectionalLight('#ffead1', 3); light.position.set(-8, 12, 10); scene.add(light);
    const camera = new THREE.PerspectiveCamera(35, 1, .01, 100);
    // Allocate the renderer's internal PBR lookup before measuring asset resources.
    const warmup = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); scene.add(warmup); camera.position.set(0, 0, 3); camera.lookAt(0, 0, 0); renderer.render(scene, camera); disposeObject(warmup); renderer.render(scene, camera);
    const baseline = { ...renderer.info.memory }, library = createSurfaceLibrary(), captures = [], stats = [];
    const capture = () => { renderer.render(scene, camera); return renderer.domElement.toDataURL(); };
    for (const asset of assets) {
      const response = await fetch(asset.url); if (!response.ok) throw new Error(`${asset.id}: HTTP ${response.status}`);
      const recipe = await response.json(); let object = recipeInstance(recipe); scene.add(object); object.updateMatrixWorld(true);
      const record = { kind: 'prop', material: { color: '#ffffff' } }; applySurfaceTextures(object, record, library);
      const bounds = new THREE.Box3().setFromObject(object), center = bounds.getCenter(new THREE.Vector3()), distance = bounds.getSize(new THREE.Vector3()).length() * 1.9;
      camera.position.copy(center).add(new THREE.Vector3(.55, .32, 1).normalize().multiplyScalar(distance)); camera.lookAt(center);
      const image = capture(); captures.push({ id: asset.id, image }); stats.push({ id: asset.id, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
      const figure = document.createElement('figure'), img = document.createElement('img'), label = document.createElement('figcaption'); img.src = image; label.textContent = asset.name; figure.append(img, label); document.getElementById('sheet').append(figure);
      if (asset.id === 'builtin-church-stained-window') {
        // Match document updates: the renderer installs a fresh material instance.
        disposeObject(object); object = recipeInstance(recipe); scene.add(object);
        const glass = object.children.find(m => m.userData.materialSlot === 'glass'), emissive = glass.material.emissive.getHex();
        applySurfaceTextures(object, { ...record, material: { color: '#ffffff', texture: 'stone', textureSlot: 'limestone', textureBrightness: .25 } }, library);
        const changed = capture(); if (changed === image) throw new Error('Frame material override did not change pixels'); if (glass.material.emissive.getHex() !== emissive) throw new Error('Frame override changed glass');
      }
      disposeObject(object);
    }
    library.dispose(); renderer.render(scene, camera); const end = { ...renderer.info.memory }; renderer.dispose();
    return { captures, stats, baseline, end };
  }, catalog);
  await mkdir('test-results', { recursive: true });
  for (const item of result.captures) await writeFile(`test-results/${item.id}.png`, Buffer.from(item.image.split(',')[1], 'base64'));
  await page.screenshot({ path: 'test-results/church-kit-sheet.png', fullPage: true });
  // Double-sided translucent glass uses two passes for each glass material.
  assert.deepEqual(errors, []); assert.equal(result.stats.length, 18); assert.ok(result.stats.every(s => s.calls <= 6 && s.triangles < 18000), JSON.stringify(result.stats)); assert.deepEqual(result.end, result.baseline);
  console.log(JSON.stringify({ models: result.stats.length, maxCalls: Math.max(...result.stats.map(s => s.calls)), maxTriangles: Math.max(...result.stats.map(s => s.triangles)), released: result.end }));
});

for (const mode of ['server', 'pages']) test(`church assets are searchable, placeable, editable, saved and projected (${mode})`, { timeout: 180000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-church-')); let server, browser;
  t.after(async () => { await browser?.close(); if (server) await new Promise(r => server.close(r)); await rm(dataDir, { recursive: true, force: true }); });
  if (mode === 'server') server = (await createApp({ dataDir })).listen(0, '127.0.0.1');
  else { const app = express(); app.use('/Tabletop', express.static(path.resolve('dist-pages'))); server = app.listen(0, '127.0.0.1'); }
  await once(server, 'listening'); browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' }), errors = [];
  page.setDefaultTimeout(30000); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}${mode === 'pages' ? '/Tabletop/' : '/'}?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  const scene = createScene('Kit arquitetônico da igreja'), floor = createEntity('floor', { width: 70, length: 60 }); scene.layout.entities[floor.id] = floor;
  const ids = [];
  for (const [i, asset] of catalog.entries()) {
    const prop = createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: 1 }, footprint: asset.footprint, ...(asset.supportHeight ? { supportHeight: asset.supportHeight } : {}), position: [(i % 6 - 2.5) * 10, 0, (Math.floor(i / 6) - 1) * 12] });
    scene.layout.entities[prop.id] = prop; ids.push(prop.id);
  }
  await page.locator('#document-json-file').setInputFiles({ name: 'church-kit.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(scene)) });
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id, scene.id);
  await page.waitForFunction(() => window.__tabletop.stats().environmentMaterials.filter(m => m.slot === 'glass' || m.slot === 'flame').length >= 2);
  console.log(`${mode}: models loaded`);
  assert.deepEqual(await page.evaluate(() => window.__tabletop.stats().assetDiagnostics), []);
  const action = async name => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const select = async id => { await page.locator('[data-tab="scene"]').click(); await (await reveal(page.locator(`[data-select="${id}"]`))).click(); };
  await select(floor.id); await action('top'); await action('frame');
  await page.locator('[data-tab="assets"]').click(); await page.getByLabel('Buscar assets', { exact: true }).fill('igreja antiga');
  assert.equal(await page.locator('[data-asset]').count(), 18);
  await page.locator('[data-asset="builtin-church-pointed-arch"]').click(); await page.waitForFunction(() => !document.getElementById('assets-dialog').open);
  const point = await page.evaluate(() => window.__tabletop.project([0, 0, 22])); assert.ok(point.visible); await page.mouse.click(point.x, point.y); await page.locator('#viewport canvas').focus(); await page.keyboard.press('Escape');
  await page.waitForFunction(() => Object.values(window.__tabletop.snapshot().layout.entities).filter(e => e.assetRef?.id === 'builtin-church-pointed-arch').length === 2);
  await action('undo'); await action('redo');
  console.log(`${mode}: library placement and history verified`);
  const tableId = ids[catalog.findIndex(a => a.id === 'builtin-church-banquet-table')];
  await select(tableId); await page.waitForFunction(() => !!document.querySelector('[data-field="material-textureSlot"] option[value="wood"]'));
  await (await reveal(page.locator('[data-field="material-textureSlot"]'))).selectOption('wood'); await (await reveal(page.locator('[data-field="material-texture"]'))).selectOption('wood');
  const brightness = await reveal(page.locator('[data-field="material-textureBrightness"]')); await brightness.fill('.55'); await brightness.press('Tab');
  const [projector] = await Promise.all([page.waitForEvent('popup'), action('presentation-window')]); projector.setDefaultTimeout(30000); projector.on('pageerror', e => errors.push(e.message));
  await projector.waitForFunction(id => window.__tabletop?.stats().surfaceMaterials.some(m => m.id === id && m.options.textureBrightness === .55), tableId);
  const camera = await projector.evaluate(() => window.__tabletop.camera()); await page.bringToFront();
  console.log(`${mode}: named material projected`);
  await action('undo'); await projector.waitForFunction(id => window.__tabletop.stats().surfaceMaterials.some(m => m.id === id && m.options.textureBrightness === 1), tableId); assert.deepEqual(await projector.evaluate(() => window.__tabletop.camera()), camera); await action('redo'); await projector.close();
  await action('save'); await page.waitForFunction(() => !document.querySelector('#save-status').classList.contains('unsaved') && !document.querySelector('[data-action="save"]').disabled);
  const saved = await page.evaluate(() => window.__tabletop.snapshot().layout); await page.reload(); await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, scene.id);
  assert.deepEqual(await page.evaluate(() => window.__tabletop.snapshot().layout), saved); assert.deepEqual(errors, []);
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: `test-results/church-kit-${mode}.png` });
});
