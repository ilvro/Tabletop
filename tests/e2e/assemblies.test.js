import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,mkdir,readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';
import { worldPoint } from '../../src/domain/geometry.js';

const close=(actual,expected)=>actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-6,`${actual} ≈ ${expected}`));
test('assemblies: desk/lamp bind, click-to-select, joint move/rotate/scale, duplicate/paste, folder unbind and reload', {timeout:180_000},async t=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-assemblies-'));
  const server=(await createApp({dataDir})).listen(0,'127.0.0.1'); await once(server,'listening');
  const browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  t.after(async()=>{await browser.close(); await new Promise(resolve=>server.close(resolve)); await rm(dataDir,{recursive:true,force:true});});
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
  const snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
  const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const tab=name=>page.locator(`[data-tab="${name}"]`).click();
  async function field(name,value){const input=await reveal(page.locator(`[data-field="${name}"]`));await input.fill(String(value));await input.press('Tab');}
  async function select(key,additive=false){await tab('scene');await page.locator(`[data-select="${key}"]`).click({modifiers:additive?['Shift']:[]});}
  async function point(position){const p=await page.evaluate(p=>window.__tabletop.project(p),position);assert.ok(p.visible);return p;}
  async function click(position){const p=await point(position);await page.mouse.click(p.x,p.y);}
  await action('floor-add');await action('top');
  await tab('assets');await page.locator('[data-asset="builtin-desk"]').click();await click([0,0,0]);
  let doc=await snapshot();const desk=Object.values(doc.layout.entities).find(e=>e.assetRef?.id==='builtin-desk');assert.ok(desk);
  await page.locator('[data-asset="builtin-lamp"]').click();await click([0,.82,0]);
  doc=await snapshot();const lamp=Object.values(doc.layout.entities).find(e=>e.assetRef?.id==='builtin-lamp');assert.ok(lamp);
  await select(desk.id);await select(lamp.id,true);const beforeBind=await snapshot();
  await page.locator(`[data-select="${lamp.id}"]`).click({button:'right'});await page.locator('#context-menu').getByRole('button',{name:'Ancorar objetos juntos',exact:true}).click();
  doc=await snapshot();const group=Object.values(doc.layout.groups).find(g=>g.anchored);assert.ok(group);assert.equal(doc.layout.entities[desk.id].groupId,group.id);assert.equal(doc.layout.entities[lamp.id].groupId,group.id);
  assert.deepEqual(doc.layout.entities[desk.id].transform,beforeBind.layout.entities[desk.id].transform);assert.deepEqual(doc.layout.entities[lamp.id].transform,beforeBind.layout.entities[lamp.id].transform);
  await select(desk.id);assert.ok(await page.locator('[data-field="assembly-position-0"]').isVisible());assert.equal(await page.locator('[data-field="object-name"]').count(),0);
  await action('tool-select');await click([.65,.82,-.3]);assert.ok(await page.locator('[data-field="assembly-name"]').isVisible());
  const beforeMove=await snapshot(),x=beforeMove.layout.groups[group.id].transform.position[0];await field('assembly-position-0',x+2);
  doc=await snapshot();for(const key of [desk.id,lamp.id])close(doc.layout.entities[key].transform.position,beforeMove.layout.entities[key].transform.position.map((v,i)=>v+(i===0?2:0)));
  await field('assembly-yaw',60);await field('assembly-size',1.5);doc=await snapshot();close(doc.layout.entities[desk.id].transform.scale,[1.5,1.5,1.5]);close(doc.layout.entities[lamp.id].transform.scale,[1.5,1.5,1.5]);
  // Dragging a constituent object with W previews and commits the whole proxy once.
  await action('tool-move');const posedDesk=doc.layout.entities[desk.id];const start=worldPoint(posedDesk,[.82*1.5,.82*1.5,.35*1.5]);const end=start.map((v,i)=>v-(i===0?1:0));const a=await point(start),b=await point(end);
  const beforeDrag=await snapshot(),version=await page.evaluate(()=>window.__tabletop.editVersion());
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();
  await page.waitForFunction(v=>window.__tabletop.editVersion()>v,version);assert.equal(await page.evaluate(()=>window.__tabletop.editVersion()),version+1);
  doc=await snapshot();const delta=doc.layout.entities[desk.id].transform.position.map((v,i)=>v-beforeDrag.layout.entities[desk.id].transform.position[i]);assert.ok(Math.hypot(...delta)>.1);
  close(doc.layout.entities[lamp.id].transform.position,beforeDrag.layout.entities[lamp.id].transform.position.map((v,i)=>v+delta[i]));
  await action('undo');assert.deepEqual(await snapshot(),beforeDrag);await action('redo');
  await action('object-duplicate');doc=await snapshot();const duplicated=Object.values(doc.layout.groups).find(g=>g.id!==group.id&&g.anchored);assert.ok(duplicated);assert.equal(Object.values(doc.layout.entities).filter(e=>e.groupId===duplicated.id).length,2);
  await action('object-copy');await action('object-delete');assert.equal((await snapshot()).layout.groups[duplicated.id],undefined);await page.locator('#viewport canvas').focus();await page.keyboard.press('Control+v');doc=await snapshot();assert.equal(Object.values(doc.layout.groups).filter(g=>g.anchored).length,2);
  await select(desk.id);await tab('scene');const boundState=await snapshot();
  await page.locator(`.tree-group[data-drop-group="${group.id}"] > [data-action="assembly-unbind"]`).click();
  doc=await snapshot();assert.equal(doc.layout.groups[group.id].anchored,false);assert.deepEqual(doc.layout.entities[desk.id].transform,boundState.layout.entities[desk.id].transform);assert.deepEqual(doc.layout.entities[lamp.id].transform,boundState.layout.entities[lamp.id].transform);
  await select(lamp.id);assert.equal(await page.locator('[data-field="assembly-name"]').count(),0);const tablePosition=doc.layout.entities[desk.id].transform.position;
  await field('position-0',doc.layout.entities[lamp.id].transform.position[0]+1);assert.deepEqual((await snapshot()).layout.entities[desk.id].transform.position,tablePosition);
  await action('undo');await action('undo');assert.equal((await snapshot()).layout.groups[group.id].anchored,true);
  await select(desk.id);await action('perspective');await action('frame');await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/assemblies.png'});
  await action('save');await page.waitForFunction(()=>window.__tabletop.snapshot().revision===1);const saved=await snapshot();assert.deepEqual(JSON.parse(await readFile(path.join(dataDir,'scenes',`${saved.id}.json`),'utf8')),saved);
  await page.reload();await page.waitForFunction(()=>!!window.__tabletop);assert.deepEqual(await snapshot(),saved);await select(lamp.id);assert.ok(await page.locator('[data-field="assembly-name"]').isVisible());assert.deepEqual(errors,[]);
});
