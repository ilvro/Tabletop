import { reveal } from './controls.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';

test('fase 3: estruturas, regeneração preservada, seleção múltipla, polish e restauração real', { timeout: 180_000 }, async t => {
  const executablePath = process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(); await access(executablePath);
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-phase3-'));
  let server, browser, page, context;
  const errors = [], launchOptions = { executablePath, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  async function start(port = 0) { server = (await createApp({ dataDir })).listen(port, '127.0.0.1'); await once(server, 'listening'); return server.address().port; }
  async function stop() { if (server) { await new Promise(resolve => server.close(resolve)); server = null; } }
  t.after(async () => { await browser?.close(); await stop(); await rm(dataDir, { recursive: true, force: true }); });
  const port = await start(), origin = `http://127.0.0.1:${port}`;
  async function open(storageState) {
    browser = await chromium.launch(launchOptions); context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState }); page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
    await page.goto(`${origin}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  }
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  const action = async name => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const tab = name => page.locator(`[data-tab="${name}"]`).click();
  async function field(name, value) { const node = page.locator(`[data-field="${name}"]`); await reveal(node); await node.fill(String(value)); await node.press('Tab'); }
  async function select(key, additive = false) { await tab('scene'); await page.locator(`[data-select="${key}"]`).click({ modifiers: additive ? ['Shift'] : [] }); }
  async function clickWorld(position) {
    const p = await page.evaluate(value => window.__tabletop.project(value), position); assert.ok(p.visible, `Point ${position} must be visible`);
    await page.mouse.click(p.x, p.y);
  }
  await open(); await field('room-width', 8); await field('room-length', 7);
  await page.locator('#quick-form [type="submit"]').click(); await action('accept-proposal');
  let doc = await snapshot(); const floor = Object.values(doc.layout.entities).find(e => e.kind === 'floor');
  await (await reveal(page.locator('[data-field="smart-template"]'))).selectOption('meeting');
  await action('smart-preview');
  assert.equal(Object.keys((await snapshot()).layout.compositions).length, 0, 'preview is read-only');
  await action('accept-proposal');
  doc = await snapshot(); const recipe = Object.values(doc.layout.compositions)[0]; assert.ok(recipe);
  const chairId = recipe.slots['table.chair.1'].id, deletedId = recipe.slots['table.chair.2'].id;
  await select(chairId); await field('object-name', 'Cadeira reservada'); await field('position-0', -2.5); await field('object-yaw', 23);
  const manual = (await snapshot()).layout.entities[chairId];
  await select(deletedId); await action('object-delete');
  await tab('build'); await field('smart-seed', 42); await action('smart-preview');
  await action('accept-proposal');
  doc = await snapshot(); assert.deepEqual(doc.layout.entities[chairId], manual); assert.equal(doc.layout.entities[deletedId], undefined);
  await (await reveal(page.locator('[data-field="smart-restoreDeleted"]'))).check(); await action('smart-preview'); await action('accept-proposal');
  assert.ok((await snapshot()).layout.entities[deletedId]);
  // The hosted window remains independently editable in the wall.
  const wall = Object.values(doc.layout.entities).find(e => e.kind === 'wall' && e.name === 'Parede sul');
  await select(wall.id); await tab('build'); await action('window-add');
  assert.equal(Object.values((await snapshot()).layout.entities).filter(e => e.kind === 'window').length, 0, 'window placement waits for a click');
  await clickWorld([wall.transform.position[0] + 6.2, 1.4, wall.transform.position[2]]);
  doc = await snapshot(); const window = Object.values(doc.layout.entities).find(e => e.kind === 'window'); assert.ok(window);
  assert.equal(window.wallId, wall.id); assert.ok(Math.abs(window.offset - 6.2) < .02); assert.ok(Math.abs(window.sill - .9) < .02);
  const windowStart = await page.evaluate(value => window.__tabletop.project(value), [wall.transform.position[0] + window.offset, window.sill + window.height / 2, wall.transform.position[2]]);
  const windowEnd = await page.evaluate(value => window.__tabletop.project(value), [wall.transform.position[0] + window.offset + .7, window.sill + window.height / 2 + .3, wall.transform.position[2]]);
  await page.keyboard.down('Alt'); await page.mouse.move(windowStart.x, windowStart.y); await page.mouse.down(); await page.mouse.move(windowEnd.x, windowEnd.y, { steps: 8 }); await page.mouse.up(); await page.keyboard.up('Alt');
  const movedWindow = (await snapshot()).layout.entities[window.id];
  assert.ok(Math.abs(movedWindow.offset - window.offset - .7) < .04); assert.ok(Math.abs(movedWindow.sill - window.sill - .3) < .04);
  await action('undo'); assert.deepEqual((await snapshot()).layout.entities[window.id], window);
  await action('redo'); assert.deepEqual((await snapshot()).layout.entities[window.id], movedWindow);
  await (await reveal(page.locator('[data-field="style"]'))).selectOption('bars'); await field('sill', 1.1);
  assert.equal((await snapshot()).layout.entities[window.id].style, 'bars');
  // Shift selection feeds a preview, whose cancellation cannot change positions.
  const ids = ['table.chair.1','table.chair.2','table.chair.3'].map(key => recipe.slots[key].id);
  await select(ids[0]); await select(ids[1], true); await select(ids[2], true);
  assert.equal(await page.locator('[data-field="polish-mode"]').count(), 1);
  const beforePolish = await snapshot();
  await (await reveal(page.locator('[data-field="polish-axis"]'))).selectOption('z'); await action('polish-preview'); await action('cancel-proposal');
  assert.deepEqual(await snapshot(), beforePolish);
  await action('polish-preview'); await action('accept-proposal');
  doc = await snapshot(); assert.ok(ids.every(key => doc.layout.entities[key].transform.position[2] === manual.transform.position[2]));
  await action('undo'); assert.deepEqual(await snapshot(), beforePolish); await action('redo');
  // Drawing is explicitly on the raised work plane, above the existing room.
  await tab('build'); await field('build-height', 1.5); await action('top'); await action('polygon-draw');
  for (const [x,z] of [[-2,-2],[2,-2],[2,2],[0,2],[0,0],[-2,0]]) await clickWorld([x,1.5,z]);
  await page.keyboard.press('Enter');
  doc = await snapshot(); const polygon = Object.values(doc.layout.entities).find(e => e.vertices); assert.ok(polygon);
  assert.equal(polygon.vertices.length, 6); assert.equal(polygon.transform.position[1], 1.5);
  // The next contour is outside the first floor, while that floor remains the active support.
  await action('polygon-draw');
  for (const [x,z] of [[-3,1],[-2,1],[-2,2],[-3,2]]) await clickWorld([x,1.5,z]);
  await action('polygon-finish');
  assert.equal(Object.values((await snapshot()).layout.entities).filter(e => e.vertices).length, 2);
  await action('polygon-draw'); await clickWorld([3,1.5,-2]); await clickWorld([3,1.5,2]); await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-action="polygon-finish"]').count(), 0, 'cancel resets the drawing controls');
  assert.equal(Object.values((await snapshot()).layout.entities).filter(e => e.vertices).length, 2);
  await select(polygon.id); await tab('build');
  await (await reveal(page.locator('#token-name'))).fill('No mezanino'); await action('token-place'); await clickWorld([1,1.5,1]);
  doc = await snapshot(); const token = Object.values(doc.tokens)[0]; assert.equal(token.surfaceId, polygon.id); assert.equal(token.transform.position[1], 1.5);
  // Selecting the support prevents a higher overlapping surface from stealing placement.
  const deskId = recipe.slots['table.main'].id;
  await (await reveal(page.locator('[data-field="active-surface"]'))).selectOption(deskId);
  const desk = doc.layout.entities[deskId]; await action('token-place'); await clickWorld([desk.transform.position[0],.82,desk.transform.position[2]]);
  doc = await snapshot(); const supported = Object.values(doc.tokens).find(item => item.surfaceId === deskId); assert.ok(supported);
  assert.ok(Math.abs(supported.transform.position[1] - .82) < .05);
  // Accesses are placed through visible construction controls and are editable supports.
  await (await reveal(page.locator('[data-field="active-surface"]'))).selectOption(floor.id);
  await action('stairs-place'); await clickWorld([3,0,0]); await field('steps', 6); await field('height', 2);
  doc = await snapshot(); const stairs = Object.values(doc.layout.entities).find(e => e.kind === 'stairs'); assert.ok(stairs); assert.equal(stairs.steps, 6); assert.equal(stairs.height, 2);
  await action('ramp-place'); await clickWorld([-3,0,0]); await field('height', 1.2); await field('object-yaw', 90);
  doc = await snapshot(); const ramp = Object.values(doc.layout.entities).find(e => e.kind === 'ramp'); assert.ok(ramp); assert.equal(ramp.height, 1.2);
  await (await reveal(page.locator('[data-field="active-surface"]'))).selectOption(ramp.id);
  await (await reveal(page.locator('#token-name'))).fill('Na rampa'); await action('token-place'); await clickWorld([ramp.transform.position[0], .6, ramp.transform.position[2]]);
  doc = await snapshot(); const rampToken = Object.values(doc.tokens).find(e => e.surfaceId === ramp.id); assert.ok(rampToken); assert.ok(rampToken.transform.position[1] > 0 && rampToken.transform.position[1] <= 1.2);
  // Hide/show the room and inherit the lock in its child inspector.
  await select(floor.id); await page.locator(`[data-group-visible="${floor.groupId}"]`).click();
  assert.equal((await snapshot()).layout.groups[floor.groupId].visible, false);
  await page.locator(`[data-group-visible="${floor.groupId}"]`).click();
  await page.locator('#scene-name').fill('Fase 3 — persistência'); await page.locator('#scene-name').press('Tab');
  await action('save'); await page.waitForFunction(() => window.__tabletop.snapshot().revision === 1);
  const saved = await snapshot(), state = await context.storageState();
  assert.deepEqual(JSON.parse(await readFile(path.join(dataDir, 'scenes', `${saved.id}.json`), 'utf8')), saved);
  await action('perspective'); await action('frame');
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/phase3-master.png' });
  await action('present'); await page.screenshot({ path: 'test-results/phase3-presentation.png' }); await page.keyboard.press('Escape');
  await browser.close(); browser = null; await stop(); await start(port); await open(state);
  assert.deepEqual(await snapshot(), saved);
  await tab('build'); assert.equal(await page.locator('[data-field="smart-template"]').inputValue(), 'meeting');
  assert.equal(await page.locator('[data-field="smart-seed"]').inputValue(), '42');
  assert.equal(await page.locator('[data-field="smart-restoreDeleted"]').isChecked(), false);
  assert.equal(errors.length, 0, errors.join('\n'));
});
