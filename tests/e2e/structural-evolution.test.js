import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';

test('structural authoring: sculpt/cancel, holes, shared walls, levels, anchors, polish and durable reload', { timeout: 180_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-structure-'));
  const server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  const action = name => page.locator(`[data-action="${name}"]`).first().click();
  const tab = name => page.locator(`[data-tab="${name}"]`).click();
  async function field(name, value) { const input = page.locator(`[data-field="${name}"]`); await input.fill(String(value)); await input.press('Tab'); }
  async function select(key) { await tab('scene'); await page.locator(`[data-select="${key}"]`).click(); await tab('build'); }
  async function point(position) { const p = await page.evaluate(value => window.__tabletop.project(value), position); assert.ok(p.visible, `Visible world point ${position}`); return p; }
  async function click(position) { const p = await point(position); await page.mouse.click(p.x,p.y); }
  async function stroke(start, end, cancel = false) {
    const a = await point(start), b = await point(end);
    await page.mouse.move(a.x,a.y); await page.mouse.down(); await page.mouse.move(b.x,b.y, { steps: 8 });
    if (cancel) await page.keyboard.press('Escape'); await page.mouse.up();
  }
  await field('terrain-new-width', 10); await field('terrain-new-length', 10); await field('terrain-new-segments', 16); await action('terrain-add'); await action('top');
  let doc = await snapshot(); const terrain = Object.values(doc.layout.entities).find(e => e.kind === 'terrain'); assert.ok(terrain);
  const before = await snapshot(); await action('terrain-sculpt'); await stroke([-1,0,0],[1,0,0]);
  const sculpted = await snapshot(); assert.ok(sculpted.layout.entities[terrain.id].heights.some(h => h > 0));
  await action('undo'); assert.deepEqual(await snapshot(), before); await action('redo'); assert.deepEqual(await snapshot(), sculpted);
  await action('terrain-sculpt'); await stroke([-1,0,2],[1,0,2],true); assert.deepEqual(await snapshot(), sculpted);
  await field('terrain-cell', 144); await field('terrain-height', 2); assert.equal((await snapshot()).layout.entities[terrain.id].heights[144],2);
  // Creating the first level can adopt existing geometry at its reference height.
  await action('level-add'); doc = await snapshot(); const ground = Object.values(doc.layout.levels)[0]; assert.equal(doc.layout.entities[terrain.id].levelId, ground.id);
  await action('floor-add'); doc = await snapshot(); const floor = Object.values(doc.layout.entities).find(e => e.kind === 'floor'); assert.equal(floor.levelId,ground.id);
  await action('top'); await action('frame'); await action('floor-hole');
  for (const p of [[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1]]) await click(p); await page.keyboard.press('Enter');
  assert.equal((await snapshot()).layout.entities[floor.id].holes.length,1);
  const cut = await snapshot(); await action('undo'); assert.equal((await snapshot()).layout.entities[floor.id].holes, undefined); await action('redo'); assert.deepEqual(await snapshot(),cut);
  await action('contour-walls'); assert.equal(Object.values((await snapshot()).layout.entities).filter(e => e.kind === 'wall').length,0); await action('accept-proposal');
  doc = await snapshot(); const wall = Object.values(doc.layout.entities).find(e => e.kind === 'wall'); assert.ok(wall);
  // Repeating a contour does not create coincident walls.
  await select(floor.id); await action('contour-walls'); await action('accept-proposal'); assert.equal(Object.values((await snapshot()).layout.entities).filter(e => e.kind === 'wall').length,4);
  await action('level-duplicate'); doc = await snapshot(); const upper = Object.values(doc.layout.levels).find(l => l.id !== ground.id); assert.equal(upper.elevation,3);
  const upperFloor = Object.values(doc.layout.entities).find(e => e.kind === 'floor' && e.levelId === upper.id); assert.ok(upperFloor.holes.length);
  await field(`level-elevation-${upper.id}`,4); assert.equal((await snapshot()).layout.entities[upperFloor.id].transform.position[1],4);
  const beforeIsolation = await snapshot(); await action('level-isolate'); assert.deepEqual(await snapshot(),beforeIsolation); await action('level-isolate');
  // A layer can be edited and made visible without changing audience.
  await action('layer-add'); doc = await snapshot(); const layer = Object.values(doc.layout.layers)[0]; await field(`layer-name-${layer.id}`,'Decoração');
  // Material proposals remain transient and preserve geometry when accepted.
  await select(upperFloor.id); await page.locator('[data-field="polish-mode"]').selectOption('material'); await page.locator('[data-field="polish-palette"]').selectOption('worn');
  const beforeMaterial = await snapshot(); await action('polish-preview'); await action('cancel-proposal'); assert.deepEqual(await snapshot(),beforeMaterial);
  await action('polish-preview'); await action('accept-proposal'); assert.deepEqual((await snapshot()).layout.entities[upperFloor.id].holes, upperFloor.holes);
  await action('undo'); assert.deepEqual(await snapshot(),beforeMaterial); await action('redo');
  // Auto-associated access reaches the upper floor even with a selected lower support.
  await page.locator('[data-field="active-level"]').selectOption(ground.id); await page.locator('[data-field="active-surface"]').selectOption(floor.id);
  await select(floor.id); await action('top'); await action('frame'); await action('stairs-place'); await click([2,0,0]);
  doc = await snapshot(); const stairs = Object.values(doc.layout.entities).find(e => e.kind === 'stairs'); assert.equal(stairs.fromLevelId,ground.id); assert.equal(stairs.toLevelId,upper.id); assert.equal(stairs.height,4);
  await field(`level-elevation-${upper.id}`,5); assert.equal((await snapshot()).layout.entities[stairs.id].height,5);
  // Place a real catalog prop and bind it to a wall socket.
  await tab('assets'); await page.locator('[data-asset="builtin-lamp"]').click(); await action('top'); await click([2,0,1]);
  doc = await snapshot(); const lamp = Object.values(doc.layout.entities).find(e => e.kind === 'prop'); assert.ok(lamp);
  await page.locator('[data-field="object-anchor"]').selectOption(`wall:${wall.id}`); assert.equal((await snapshot()).layout.entities[lamp.id].anchor.hostId,wall.id);
  await field('anchor-1',2); assert.equal((await snapshot()).layout.entities[lamp.id].anchor.offset[1],2);
  await select(wall.id); await field('position-0', wall.transform.position[0] + 1); assert.ok((await snapshot()).layout.entities[lamp.id].transform.position[0] !== doc.layout.entities[lamp.id].transform.position[0]);
  await page.locator('#scene-name').fill('Evolução estrutural'); await page.locator('#scene-name').press('Tab'); await action('save'); await page.waitForFunction(() => window.__tabletop.snapshot().revision === 1);
  const saved = await snapshot(); assert.deepEqual(JSON.parse(await readFile(path.join(dataDir,'scenes',`${saved.id}.json`),'utf8')),saved);
  await select(terrain.id); await action('perspective'); await action('frame'); await mkdir('test-results',{ recursive:true }); await page.screenshot({ path:'test-results/structural-evolution.png' });
  await action('present'); await page.screenshot({ path:'test-results/structural-presentation.png' }); await page.keyboard.press('Escape');
  await page.reload(); await page.waitForFunction(() => !!window.__tabletop); assert.deepEqual(await snapshot(),saved); assert.deepEqual(errors,[]);
});
