import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import express from 'express';
import {chromium} from 'playwright';
import {createApp} from '../../server/app.js';
import {reveal} from './controls.js';

for(const mode of ['server','pages'])test(`mountain example loads a private scene in ${mode}, saves/reopens and leaves bundled original intact`,{timeout:240_000},async t=>{
  const original=JSON.parse(await readFile('public/scenes/snowy-mountain-pass.json','utf8'));
  const entityCount=Object.keys(original.layout.entities).length,objectCount=entityCount+Object.keys(original.look.lights).length;
  const directory=await mkdtemp(path.join(os.tmpdir(),'tabletop-example-test-'));
  const app=mode==='server'?await createApp({dataDir:directory}):express();
  if(mode==='pages')app.use('/Tabletop',express.static(path.resolve('dist-pages')));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  t.after(async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});});
  const context=await browser.newContext({viewport:{width:1100,height:760},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[];
  // Static scene verification: SwiftShader should not continuously rasterize a river in two windows.
  await page.emulateMedia({reducedMotion:'reduce'});
  page.setDefaultTimeout(60_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.on('request',r=>requests.push(r.url()));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const origin=`http://127.0.0.1:${server.address().port}`,base=mode==='pages'?'/Tabletop/':'/';
  await page.goto(`${origin}${base}?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
  const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
  await action('open');await page.locator('[data-open-example="snowy-mountain-pass"] img').waitFor();
  await page.waitForFunction(()=>{const img=document.querySelector('[data-open-example] img');return img?.complete&&img.naturalWidth>0;});
  if(mode==='pages') {
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>{const b=document.querySelector('[data-open-example]').getBoundingClientRect();return b.left>=0&&b.right<=innerWidth;});
    const card=await page.locator('[data-open-example]').boundingBox();assert.ok(card.x>=0&&card.x+card.width<=390);
    await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/example-gallery-mobile.png'});
    await page.setViewportSize({width:1100,height:760});
  }
  await page.locator('[data-open-example="snowy-mountain-pass"]').click();await page.waitForFunction(count=>Object.keys(window.__tabletop.snapshot().layout.entities).length===count,entityCount);
  const draft=await snapshot();assert.equal(draft.revision,0);assert.equal(await page.locator('#save-status').evaluate(node=>node.classList.contains('unsaved')),true);
  console.log(`${mode}: exemplo carregado`);
  assert.notEqual(draft.id,original.id);
  const initialCamera=await page.evaluate(()=>window.__tabletop.camera());
  initialCamera.position.forEach((value,index)=>assert.ok(Math.abs(value-Object.values(draft.cameraPresets)[0].position[index])<1e-8));
  await page.waitForFunction(()=>window.__tabletop.stats().snowCoats.length>=6);
  await page.locator('[data-tab="scene"]').click();const rock=Object.values(draft.layout.entities).find(e=>e.rockShape);
  await page.locator(`[data-select="${rock.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.stats().rockGeometries.some(g=>g.id===id),rock.id);
  const field=await reveal(page.locator('[data-field="rock-seed"]'));await field.fill('909');await field.press('Tab');assert.equal((await snapshot()).layout.entities[rock.id].rockShape.seed,909);
  await action('undo');assert.deepEqual((await snapshot()).layout,draft.layout);await action('redo');
  console.log(`${mode}: edição e histórico verificados`);
  const [projector]=await Promise.all([page.waitForEvent('popup'),action('presentation-window')]);projector.on('pageerror',e=>errors.push(e.message));await projector.emulateMedia({reducedMotion:'reduce'});
  try {await projector.waitForFunction(count=>window.__tabletop?.stats().objects===count,objectCount,{timeout:60_000});}
  catch(error) {console.log(await projector.evaluate(()=>({url:location.href,message:document.querySelector('#presentation-message')?.textContent,stats:window.__tabletop?.stats()})));throw error;}
  const projectorCamera=await projector.evaluate(()=>window.__tabletop.camera());
  await page.bringToFront();await page.locator('#viewport canvas').focus();await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');
  assert.deepEqual(await projector.evaluate(()=>window.__tabletop.camera()),projectorCamera);await projector.close();
  await action('save');await page.waitForFunction(()=>window.__tabletop.snapshot().revision===1);const saved=await snapshot();await page.reload();await page.waitForFunction(id=>window.__tabletop?.snapshot().id===id,saved.id);assert.deepEqual((await snapshot()).layout,saved.layout);
  await action('open');await page.locator(`[data-open="${saved.id}"]`).waitFor();assert.equal(await page.locator(`[data-open="${saved.id}"]`).count(),1);
  await page.locator('[data-open-example="snowy-mountain-pass"]').click();await page.waitForFunction(id=>window.__tabletop.snapshot().id!==id,saved.id);
  const second=await snapshot();assert.equal(second.revision,0);assert.notEqual(second.id,draft.id);assert.equal(Object.values(second.layout.entities).find(e=>e.rockShape).rockShape.seed,Object.values(original.layout.entities).find(e=>e.rockShape).rockShape.seed);
  // A failed load leaves the current private draft untouched.
  await page.route('**/scenes/snowy-mountain-pass.json',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await action('open');await page.locator('[data-open-example="snowy-mountain-pass"]').click();await page.getByRole('status').filter({hasText:'Não foi possível carregar esta cena'}).waitFor();assert.deepEqual(await snapshot(),second);
  await page.unroute('**/scenes/snowy-mountain-pass.json');await action('close-dialog');
  if(mode==='pages')assert.equal(requests.some(url=>url.includes('/api/')),false);
  assert.deepEqual(errors,[`503 ${origin}${base}scenes/snowy-mountain-pass.json`]);
});
