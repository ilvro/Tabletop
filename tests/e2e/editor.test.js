import { reveal } from './controls.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';

function staticGLB() {
  const binary = Buffer.alloc(36);
  [-.5, 0, 0, .5, 0, 0, 0, 1, 0].forEach((value, index) => binary.writeFloatLE(value, index * 4));
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], buffers: [{ byteLength: 36 }], bufferViews: [{ buffer: 0, byteLength: 36 }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-.5, 0, 0], max: [.5, 1, 0] }] }));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20); json.copy(padded);
  const header = Buffer.alloc(20), chunk = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(20 + padded.length + 8 + binary.length, 8); header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  chunk.writeUInt32LE(binary.length); chunk.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, padded, chunk, binary]);
}

test('autoria real, apresentação, assets e fidelidade após reabrir navegador/servidor', { timeout: 180_000 }, async (t) => {
  const executablePath = process.env.TABLETOP_BROWSER_PATH || chromium.executablePath();
  await access(executablePath).catch(() => { throw new Error('Instale Chromium com npx playwright install chromium ou indique TABLETOP_BROWSER_PATH. Execute npm run build antes deste teste.'); });
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-browser-'));
  const artifacts = path.resolve('test-results');
  await mkdir(artifacts, { recursive: true });
  let server, browser;
  const errors = [];
  async function listen(port = 0) {
    const app = await createApp({ dataDir });
    server = app.listen(port, '127.0.0.1'); await once(server, 'listening');
    return server.address().port;
  }
  async function stop() { if (server) { await new Promise((resolve) => server.close(resolve)); server = null; } }
  t.after(async () => { await browser?.close(); await stop(); await rm(dataDir, { recursive: true, force: true }); });
  const port = await listen();
  const origin = `http://127.0.0.1:${port}`;
  const launchOptions = { executablePath, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  browser = await chromium.launch(launchOptions);
  let context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  let page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  async function field(name, value) { const node = page.locator(`[data-field="${name}"]`); await reveal(node); await node.fill(String(value)); await node.press('Tab'); }
  const action = async (name) => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  async function point(position) { return page.evaluate((value) => window.__tabletop.project(value), position); }
  async function clickWorld(position) { const projected = await point(position); assert.ok(projected.visible); await page.mouse.click(projected.x, projected.y); }
  async function select(id) { await page.locator('[data-tab="scene"]').click(); await page.locator(`[data-select="${id}"]`).click(); }
  async function waitCounts(entities, tokens) {
    await page.waitForFunction(([e, t]) => { const doc = window.__tabletop.snapshot(); return Object.keys(doc.layout.entities).length === e && Object.keys(doc.tokens).length === t; }, [entities, tokens]);
  }
  await page.goto(`${origin}/?diagnostics`);
  await page.waitForFunction(() => !!window.__tabletop);
  assert.equal(Object.keys((await snapshot()).layout.entities).length, 0);
  // Reject the optional suggestions and cancel the preview: it must not mutate state.
  await (await reveal(page.locator('[data-field="room-door"]'))).uncheck();
  await (await reveal(page.locator('[data-field="room-lighting"]'))).uncheck();
  await page.locator('#quick-form [type="submit"]').click();
  assert.equal(Object.keys((await snapshot()).layout.entities).length, 0);
  await action('cancel-proposal');
  await (await reveal(page.locator('[data-field="room-door"]'))).check();
  await (await reveal(page.locator('[data-field="room-lighting"]'))).check();
  // Draw the accepted room through actual pointer events.
  await action('top'); await action('room-draw');
  const start = await point([-3, 0, -2]), end = await point([3, 0, 3]);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 }); await page.mouse.up();
  await page.locator('[data-action="accept-proposal"]').waitFor();
  await action('accept-proposal'); await waitCounts(6, 0);
  const built = await snapshot();
  assert.equal(Object.values(built.layout.entities).filter((e) => e.kind === 'wall').length, 4);
  assert.equal(Object.values(built.look.lights).filter((l) => l.type === 'point').length, 1);
  await action('undo'); await waitCounts(0, 0);
  await action('redo'); await waitCounts(6, 0);
  assert.deepEqual((await snapshot()).layout, built.layout);
  const floor = Object.values(built.layout.entities).find((e) => e.kind === 'floor');
  const door = Object.values(built.layout.entities).find((e) => e.kind === 'door');
  // Door dimensions and opening are independent, editable data.
  await select(door.id); await field('door-angle', 90); await field('width', .9);
  assert.equal((await snapshot()).layout.entities[door.id].width, .9);
  assert.equal((await snapshot()).sessionState.doors[door.id], Math.PI / 2);
  // Change the structural floor: supporting wall transforms must follow.
  await select(floor.id); await field('object-yaw', 15); await field('object-yaw', 0);
  assert.ok(Object.values((await snapshot()).layout.entities).filter((e) => e.kind === 'wall').every((e) => e.surfaceId === floor.id));
  await page.locator('[data-tab="build"]').click();
  await (await reveal(page.locator('#token-name'))).fill('Helena'); await action('token-place');
  await clickWorld([1.5, 0, .5]); await waitCounts(6, 1);
  let token = Object.values((await snapshot()).tokens)[0];
  assert.equal((await snapshot()).actors[token.actorId].name, 'Helena');
  // Numeric editing uses the same validated commands as dragging.
  await field('position-0', -.5); await field('object-yaw', 45); await field('scale-1', 1.3);
  token = (await snapshot()).tokens[token.id];
  assert.equal(token.transform.position[0], -.5);
  assert.equal(token.transform.scale[1], 1.3);
  assert.ok(Math.abs(token.transform.rotation[1] - Math.sin(Math.PI / 8)) < 1e-8);
  // A real drag commits only one command and supports undo/redo.
  await action('tool-move');
  const dragStart = await point([-.5, .08, token.transform.position[2]]), dragEnd = await point([1.5, .08, token.transform.position[2]]);
  const beforeDrag = await snapshot(), beforeVersion = await page.evaluate(() => window.__tabletop.editVersion());
  await page.mouse.move(dragStart.x, dragStart.y); await page.mouse.down();
  await page.mouse.move(dragEnd.x, dragEnd.y, { steps: 14 }); await page.mouse.up();
  await page.waitForFunction((version) => window.__tabletop.editVersion() > version, beforeVersion);
  assert.equal(await page.evaluate(() => window.__tabletop.editVersion()), beforeVersion + 1);
  const dragged = await snapshot(); assert.notDeepEqual(dragged.tokens[token.id].transform.position, beforeDrag.tokens[token.id].transform.position);
  await action('undo'); assert.deepEqual((await snapshot()).tokens[token.id].transform, beforeDrag.tokens[token.id].transform);
  await action('redo'); assert.deepEqual((await snapshot()).tokens[token.id].transform, dragged.tokens[token.id].transform);
  await action('object-duplicate'); await waitCounts(6, 2);
  await action('object-delete'); await waitCounts(6, 1);
  await action('undo'); await waitCounts(6, 2);
  await action('redo'); await waitCounts(6, 1);
  // With snapping disabled, placement must preserve the requested position.
  await page.locator('[data-tab="build"]').click(); await (await reveal(page.locator('[data-field="grid-snap"]'))).uncheck();
  await action('token-place'); await clickWorld([.27, 0, -1.18]); await waitCounts(6, 2);
  const free = Object.values((await snapshot()).tokens).find((item) => item.id !== token.id);
  assert.ok(Math.abs(free.transform.position[0] - .27) < .02);
  assert.ok(Math.abs(free.transform.position[2] + 1.18) < .02);
  await action('object-delete'); await waitCounts(6, 1);
  await (await reveal(page.locator('[data-field="grid-snap"]'))).check();
  // Built-in furniture is real catalog data; its files are separate from documents.
  for (const [assetId, position] of [['builtin-desk', [-1.5, 0, -.5]], ['builtin-chair', [-1.5, 0, .5]], ['builtin-cabinet', [2, 0, -1]], ['builtin-rug', [0, 0, .5]], ['builtin-lamp', [-2, 0, 2]]]) {
    await page.locator('[data-tab="assets"]').click(); await page.locator(`[data-asset="${assetId}"]`).click(); await clickWorld(position);
  }
  await waitCounts(11, 1);
  const prop = Object.values((await snapshot()).layout.entities).find((e) => e.kind === 'prop' && e.assetRef.id === 'builtin-desk');
  await select(prop.id); await field('object-yaw', 90); await field('scale-0', 1.1);
  // Import and decode a real image, then use the persisted AssetRecord for a token.
  const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#485762'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#ebd0a1'; ctx.beginPath(); ctx.arc(64, 42, 24, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(29, 71, 70, 57); return canvas.toDataURL('image/png').split(',')[1]; });
  await page.locator('#asset-file').setInputFiles({ name: 'Retrato.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => document.getElementById('gesture-hint').textContent.includes('Clique no piso'));
  await clickWorld([.5, 0, 2]); await waitCounts(11, 2);
  const imageToken = Object.values((await snapshot()).tokens).find((item) => item.id !== token.id);
  const imageRef = (await snapshot()).actors[imageToken.actorId].assetRef; assert.ok(imageRef && !imageRef.id.startsWith('builtin'));
  await page.locator('[data-tab="scene"]').click(); await page.locator('[data-environment="warm"]').click();
  const light = Object.values((await snapshot()).look.lights).find((l) => l.type === 'point');
  await select(light.id); await field('light-intensity', 65); await field('position-1', 2.4);
  await page.locator('[data-field="light-color"]').fill('#ffcd8d'); await page.locator('[data-field="light-color"]').dispatchEvent('change');
  assert.equal((await snapshot()).look.lights[light.id].intensity, 65);
  // Frame/publish a perspective camera. Master orbit must not change the published one.
  await action('perspective'); await select(floor.id); await action('frame');
  await action('camera-save'); await action('publish-camera');
  const popupPromise = page.waitForEvent('popup'); await action('presentation-window');
  const popup = await popupPromise; popup.on('pageerror', (error) => errors.push(error.message));
  await popup.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  assert.equal(await popup.locator('.tool-strip').count(), 0);
  const published = await popup.evaluate(() => window.__tabletop.camera());
  const viewportBox = await page.locator('#viewport').boundingBox();
  await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(viewportBox.x + viewportBox.width / 2 + 90, viewportBox.y + viewportBox.height / 2 + 30, { steps: 12 });
  await page.mouse.up({ button: 'right' });
  const editorCamera = await page.evaluate(() => window.__tabletop.camera());
  assert.notDeepEqual(editorCamera.position, published.position);
  assert.deepEqual((await popup.evaluate(() => window.__tabletop.camera())).position, published.position);
  await action('publish-camera');
  await popup.waitForFunction((position) => window.__tabletop.camera().position.every((n, i) => Math.abs(n - position[i]) < 1e-8), editorCamera.position);
  await popup.screenshot({ path: path.join(artifacts, 'presentation.png') });
  await popup.close();
  await action('present'); assert.equal(await page.locator('.app-header').isVisible(), false);
  await page.keyboard.press('Escape'); assert.equal(await page.locator('.app-header').isVisible(), true);
  await page.locator('#scene-name').fill('Sala do primeiro slice'); await page.locator('#scene-name').press('Tab');
  await action('save'); await page.waitForFunction(() => window.__tabletop.snapshot().revision === 1);
  const saved = await snapshot();
  await page.screenshot({ path: path.join(artifacts, 'master.png') });
  const disk = JSON.parse(await readFile(path.join(dataDir, 'scenes', `${saved.id}.json`), 'utf8'));
  assert.deepEqual(disk, saved);
  assert.ok(!JSON.stringify(disk).includes('data:image'));
  const storageState = await context.storageState();
  await browser.close(); browser = null; await stop(); await listen(port);
  browser = await chromium.launch(launchOptions);
  context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState });
  page = await context.newPage(); page.on('pageerror', (error) => errors.push(error.message)); page.on('dialog', (dialog) => dialog.accept());
  await page.goto(`${origin}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  assert.deepEqual(await snapshot(), saved);
  const assetResponse = await page.request.get(`${origin}/api/tabletop/assets/${imageRef.id}/file`);
  assert.equal(assetResponse.status(), 200); assert.equal(assetResponse.headers()['content-type'], 'image/png');
  await page.locator('[data-tab="scene"]').click(); await action('duplicate-scene');
  await page.waitForFunction((previous) => window.__tabletop.snapshot().id !== previous, saved.id);
  const copy = await snapshot(); assert.notEqual(copy.id, saved.id); assert.equal(copy.revision, 1);
  assert.equal(Object.keys(copy.layout.entities).length, 11);
  assert.ok(Object.keys(copy.layout.entities).every((id) => !saved.layout.entities[id]));
  assert.deepEqual(Object.values(copy.actors).map((actor) => actor.assetRef).filter(Boolean), Object.values(saved.actors).map((actor) => actor.assetRef).filter(Boolean));
  await action('open'); await page.locator(`[data-open="${saved.id}"]`).click();
  await page.waitForFunction((id) => window.__tabletop.snapshot().id === id, saved.id);
  assert.deepEqual(await snapshot(), saved);
  // Decode/import a self-contained model through the real browser loader.
  await action('top');
  await page.locator('#asset-file').setInputFiles({ name: 'Marcador.glb', mimeType: 'model/gltf-binary', buffer: staticGLB() });
  await page.waitForFunction(() => document.getElementById('notice').textContent.includes('Asset guardado.'));
  await clickWorld([1, 0, -1]); await waitCounts(12, 2);
  const imported = Object.values((await snapshot()).layout.entities).find((entity) => entity.kind === 'prop' && entity.name === 'Marcador.glb');
  assert.ok(imported?.assetRef && !imported.assetRef.id.startsWith('builtin'));
  await page.waitForFunction(() => !document.getElementById('notice').classList.contains('error'));
  await action('save'); await page.waitForFunction(() => window.__tabletop.snapshot().revision === 2);
  const withModel = await snapshot();
  await page.reload(); await page.waitForFunction(() => !!window.__tabletop);
  assert.deepEqual(await snapshot(), withModel);
  assert.deepEqual(errors, [], 'No unhandled browser errors');
});
