import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';

test('terrain editing: alphabetic cards, shortcut, square plateau, snow/grass masks and save/reload', { timeout: 180_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(),'tabletop-terrain-paint-'));
  const server = (await createApp({ dataDir })).listen(0,'127.0.0.1'); await once(server,'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless:true, args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir,{ recursive:true, force:true }); });
  const page = await browser.newPage({ viewport:{ width:1600,height:1000 } }), errors=[]; page.on('pageerror',error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  const action = async name => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  async function field(name,value) { const node=await reveal(page.locator(`[data-field="${name}"]`)); await node.fill(String(value)); await node.press('Tab'); }
  async function option(name,value) { await (await reveal(page.locator(`[data-field="${name}"]`))).selectOption(value); }
  async function key(value) { await page.locator('#viewport canvas').focus(); await page.keyboard.press(value); }
  async function stroke(start,end,cancel=false) {
    const a=await page.evaluate(p => window.__tabletop.project(p),start), b=await page.evaluate(p => window.__tabletop.project(p),end);
    assert.ok(a.visible && b.visible); await page.mouse.move(a.x,a.y); await page.mouse.down(); await page.mouse.move(b.x,b.y,{ steps:8 }); if(cancel) await page.keyboard.press('Escape'); await page.mouse.up();
  }
  const labels=await page.locator('.build-task > summary').allTextContents(); assert.deepEqual(labels,[...labels].sort((a,b) => a.localeCompare(b,'pt-BR')));
  assert.equal(await page.locator('.build-shortcuts').count(),0);
  await page.locator('[data-build-section="terrain"] > summary').click();
  await field('terrain-new-width',12); await field('terrain-new-length',12); await field('terrain-new-segments',16); await action('terrain-add'); await action('top');
  let doc=await snapshot(); const terrainId=Object.values(doc.layout.entities).find(e => e.kind==='terrain').id;
  // Typing T in a text field must not activate a tool.
  await page.locator('[data-field="object-name"]').focus(); await page.keyboard.press('End'); await page.keyboard.press('t'); await page.keyboard.press('Tab'); assert.equal(await page.locator('[data-action="terrain-stop"]').count(),0);
  await key('t'); assert.ok(await page.locator('[data-action="terrain-stop"]').isVisible()); const radius=Number(await page.locator('[data-field="brush-radius"]').inputValue()); await key(']'); assert.ok(Number(await page.locator('[data-field="brush-radius"]').inputValue())>radius); await key('t');
  await option('brush-mode','flatten'); await field('brush-target',2); await field('brush-strength',1); await field('brush-radius',2); await option('brush-shape','square');
  await page.getByRole('slider',{ name:'Dureza das bordas' }).focus(); await page.keyboard.press('End'); assert.equal(await page.locator('[data-field="brush-hardness"]').inputValue(),'1');
  await page.locator('[data-field="brush-snap"]').check();
  await key('t'); await stroke([-1,0,0],[1,0,0]); await key('t');
  doc=await snapshot(); const plateau=doc.layout.entities[terrainId]; assert.ok(plateau.heights.some(value => value===2)); assert.ok(plateau.heights.every(value => value===0 || value===2));
  await key('t'); await stroke([-1,0,-4],[1,0,-4],true); assert.deepEqual((await snapshot()).layout.entities[terrainId],plateau);
  // Empty snow layer, paint, recolor without repainting, then erase a trail.
  await action('terrain-layer-add'); await field('terrain-layer-name','Neve');
  const color=await reveal(page.locator('[data-field="terrain-layer-color"]')); await color.fill('#ffffff'); await color.dispatchEvent('change');
  const snowId=await page.locator('[data-field="terrain-paint-layer"]').inputValue();
  await field('brush-radius',1.5); await field('brush-strength',1); await option('brush-shape','circle'); await page.locator('[data-field="brush-snap"]').uncheck();
  await key('t'); await stroke([-1,2,0],[1,2,0]); await key('t');
  doc=await snapshot(); const painted=doc.layout.entities[terrainId]; const mask=painted.paintLayers.find(layer => layer.id===snowId).weights;
  assert.ok(mask.some(value => value>0)); assert.ok(mask.some(value => value===0)); assert.deepEqual(painted.heights,plateau.heights);
  await (await reveal(page.locator('[data-field="terrain-layer-color"]'))).fill('#804000'); await page.locator('[data-field="terrain-layer-color"]').dispatchEvent('change');
  assert.deepEqual((await snapshot()).layout.entities[terrainId].paintLayers.find(layer => layer.id===snowId).weights,mask);
  await (await reveal(page.locator('[data-field="terrain-layer-color"]'))).fill('#ffffff'); await page.locator('[data-field="terrain-layer-color"]').dispatchEvent('change');
  await option('brush-mode','erase'); await field('brush-radius',.4); await key('t'); await stroke([-.5,2,0],[.5,2,0]); await key('t');
  const erased=await snapshot(), erasedMask=erased.layout.entities[terrainId].paintLayers.find(layer => layer.id===snowId).weights;
  assert.ok(erasedMask.some((value,index) => value<mask[index])); assert.ok(erasedMask.some(value => value>0)); assert.deepEqual(erased.layout.entities[terrainId].heights,plateau.heights);
  await action('undo'); assert.deepEqual((await snapshot()).layout.entities[terrainId].paintLayers.find(layer => layer.id===snowId).weights,mask); await action('redo');
  // A visibility change is metadata only; restoring it does not repaint.
  await (await reveal(page.locator('[data-field="terrain-layer-visible"]'))).uncheck(); assert.deepEqual((await snapshot()).layout.entities[terrainId].paintLayers.find(layer => layer.id===snowId).weights,erasedMask);
  await (await reveal(page.locator('[data-field="terrain-layer-visible"]'))).check();
  await option('terrain-shading','faceted'); assert.equal((await snapshot()).layout.entities[terrainId].flatShading,true);
  const beforeDetail=await snapshot(); await field('terrain-resolution',8); doc=await snapshot(); assert.equal(doc.layout.entities[terrainId].heights.length,81); assert.ok(doc.layout.entities[terrainId].paintLayers.every(layer => layer.weights.length===81));
  await action('undo'); assert.deepEqual(await snapshot(),beforeDetail);
  const beforeRemoval=await snapshot(); await action('terrain-layer-remove'); assert.equal((await snapshot()).layout.entities[terrainId].paintLayers.length,1); await action('undo'); assert.deepEqual(await snapshot(),beforeRemoval);
  await action('perspective'); await action('frame'); await option('brush-mode','paint'); await mkdir('test-results',{ recursive:true }); await page.screenshot({ path:'test-results/terrain-paint.png' });
  await action('save'); await page.waitForFunction(() => window.__tabletop.snapshot().revision===1); const saved=await snapshot();
  assert.deepEqual(JSON.parse(await readFile(path.join(dataDir,'scenes',`${saved.id}.json`),'utf8')),saved);
  await page.reload(); await page.waitForFunction(() => !!window.__tabletop); assert.deepEqual(await snapshot(),saved); assert.deepEqual(errors,[]);
});
