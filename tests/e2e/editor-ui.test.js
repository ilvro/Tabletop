import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene,createEntity } from '../../src/domain/documents.js';
import { layerSurfacePatch, surfacePatch } from '../../src/domain/materials.js';
import { supportHeightAt } from '../../src/domain/geometry.js';
import { reveal } from './controls.js';

test('editor scopes layer materials, moves non-modal libraries, paints water with one undo and remains usable on narrow screens',{timeout:180_000},async t=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-editor-ui-')),scene=createScene('UX · terreno e água');
  const terrain=createEntity('terrain',{width:20,length:20,segments:32,material:surfacePatch('rock')});
  terrain.paintLayers=[{id:'grass-layer',name:'Grama da margem',...layerSurfacePatch('grass'),visible:true,opacity:1,weights:Array(33**2).fill(.2)},{id:'trail-layer',name:'Trilha',...layerSurfacePatch('sand'),visible:true,opacity:1,weights:Array(33**2).fill(0)}];scene.layout.entities[terrain.id]=terrain;
  const server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');
  const seeded=await fetch(`http://127.0.0.1:${server.address().port}/api/tabletop/scenes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:scene})});assert.equal(seeded.status,201);
  const browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});});
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
  const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const option=async(name,value)=>(await reveal(page.locator(`[data-field="${name}"]`))).selectOption(value);
  const field=async(name,value)=>{const node=await reveal(page.locator(`[data-field="${name}"]`));await node.fill(String(value));await node.press('Tab');};
  const snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
  await action('open');await page.locator(`[data-open="${scene.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,scene.id);
  await page.locator('[data-tab=scene]').click();await page.locator(`[data-select="${terrain.id}"]`).click();
  const before=await snapshot();await option('terrain-material-target','trail-layer');await option('terrain-layer-texture','wood');await option('terrain-layer-woodDirection','vertical');await field('terrain-layer-woodBoards',7);
  let edited=(await snapshot()).layout.entities[terrain.id];assert.deepEqual(edited.material,before.layout.entities[terrain.id].material);assert.deepEqual(edited.paintLayers[0],before.layout.entities[terrain.id].paintLayers[0]);assert.equal(edited.paintLayers[1].woodBoards,7);assert.equal(edited.paintLayers[1].woodDirection,'vertical');assert.deepEqual(edited.paintLayers[1].weights,terrain.paintLayers[1].weights);
  assert.equal(await page.locator('[data-disclosure=terrain-base-material]').getAttribute('open'),null);
  await option('terrain-material-target','base');await option('material-texture','stone');assert.equal((await snapshot()).layout.entities[terrain.id].paintLayers[1].texture,'wood');
  await page.locator('[data-tab=build]').click();assert.deepEqual(await page.locator('.build-group > summary strong').allTextContents(),['Paisagem','Construções','Personagens','Organização']);
  // Windows are movable without changing the document or the working camera.
  const state=await snapshot(),camera=await page.evaluate(()=>window.__tabletop.camera());
  await page.locator('[data-tab=assets]').click();const dialog=page.locator('#assets-dialog'),handle=dialog.locator('[data-window-handle]');const a=await dialog.boundingBox(),h=await handle.boundingBox();
  await page.mouse.move(h.x+50,h.y+20);await page.mouse.down();await page.mouse.move(h.x+170,h.y+60,{steps:8});await page.mouse.up();let b=await dialog.boundingBox();assert.ok(b.x>a.x+100 && b.y>a.y+30);
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/editor-ui-assets.png'});await handle.focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(80);const c=await dialog.boundingBox();assert.ok(c.x<b.x-8);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await dialog.getAttribute('open'),null);assert.equal(await page.locator('[data-tab=assets]').getAttribute('aria-expanded'),'false');
  await action('open');const documents=page.locator('#documents-dialog');await documents.waitFor({state:'visible'});await documents.locator('[data-window-handle]').focus();const d=await documents.boundingBox();await page.keyboard.press('Shift+ArrowRight');const e=await documents.boundingBox();assert.ok(e.x>=d.x+39);await page.keyboard.press('Escape');
  assert.deepEqual(await snapshot(),state);assert.deepEqual(await page.evaluate(()=>window.__tabletop.camera()),camera);
  // A terrain gesture produces a proposal; accepting creates editable water and lowers its bed.
  await option('brush-mode','water');await field('brush-radius',1.8);await field('brush-waterLevel',.2);await field('brush-waterDepth',.7);await action('top');await action('frame');await page.waitForTimeout(1500);await action('terrain-sculpt');
  const beforeWater=await snapshot(),p=await page.evaluate(()=>window.__tabletop.project([-3,0,-2])),q=await page.evaluate(()=>window.__tabletop.project([3,0,2]));assert.ok(p.visible&&q.visible);
  await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:12});await page.mouse.up();await page.locator('#proposal-bar:not([hidden])').waitFor();assert.deepEqual(await snapshot(),beforeWater);
  await action('accept-proposal');let after=await snapshot(),water=Object.values(after.layout.entities).find(e=>e.kind==='water');assert.ok(water);assert.ok(supportHeightAt(after.layout.entities[terrain.id],[0,0,0])<-.5);
  await action('undo');assert.deepEqual(await snapshot(),beforeWater);await action('redo');assert.deepEqual(await snapshot(),after);
  // Existing water can prepare a fresh bed after changing its level/depth.
  await page.locator('[data-tab=scene]').click();await page.locator(`[data-select="${water.id}"]`).click();await field('depth',1.1);await action('water-bed-preview');await action('accept-proposal');assert.ok(supportHeightAt((await snapshot()).layout.entities[terrain.id],[0,0,0])<-.9);
  await action('save');await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('Salvo'));const saved=await snapshot();await page.reload();await page.waitForFunction(()=>!!window.__tabletop);await action('open');await page.locator(`[data-open="${scene.id}"]`).click();assert.deepEqual((await snapshot()).layout,saved.layout);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.app-shell').classList.contains('sidebar-collapsed')&&document.querySelector('.app-shell').classList.contains('inspector-collapsed'));await page.emulateMedia({reducedMotion:'reduce'});if(await page.locator('[data-action=sidebar-toggle]').getAttribute('aria-expanded')==='false')await page.locator('[data-action=sidebar-toggle]').click();await page.locator('[data-tab=assets]').click();const mobile=await dialog.boundingBox();assert.ok(mobile.x>=0&&mobile.x+mobile.width<=390&&mobile.y+mobile.height<=844);assert.equal(await dialog.evaluate(n=>getComputedStyle(n).animationName),'none');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth)<=390);await page.screenshot({path:'test-results/editor-ui-mobile-assets.png'});
  await page.keyboard.press('Escape');for(const name of ['sidebar','inspector'])if(await page.locator(`[data-action=${name}-toggle]`).getAttribute('aria-expanded')==='true')await page.locator(`[data-action=${name}-toggle]`).click();await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/editor-ui-mobile.png'});
  await page.setViewportSize({width:1600,height:1000});await page.waitForFunction(()=>document.querySelector('[data-action=sidebar-toggle]').getAttribute('aria-expanded')==='true'&&document.querySelector('[data-action=inspector-toggle]').getAttribute('aria-expanded')==='true');for(const name of ['sidebar','inspector'])if(await page.locator(`[data-action=${name}-toggle]`).getAttribute('aria-expanded')==='false')await page.locator(`[data-action=${name}-toggle]`).click();await page.locator('[data-tab=scene]').click();await page.locator(`[data-select="${terrain.id}"]`).click();await option('terrain-material-target','trail-layer');await page.screenshot({path:'test-results/editor-ui.png'});
  assert.deepEqual(errors,[]);
});
