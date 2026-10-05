import {createApp} from '../server/app.js';
import {once} from 'node:events';
import {mkdtemp,rm,mkdir,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {reveal} from '../tests/e2e/controls.js';

const original=JSON.parse(await readFile('public/scenes/snowy-mountain-pass.json','utf8'));
const entityCount=Object.keys(original.layout.entities).length;
const rockCount=Object.values(original.layout.entities).filter(e=>e.rockShape).length;
// Reproducible capture of the actual renderer, using only public UI controls.
const directory=await mkdtemp(path.join(os.tmpdir(),'tabletop-example-preview-'));
const server=(await createApp({dataDir:directory})).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:810}});page.setDefaultTimeout(120_000);page.on('dialog',dialog=>dialog.accept());
  await page.emulateMedia({reducedMotion:'reduce'});
  page.on('pageerror',error=>console.error(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
  await page.locator('[data-action="open"]').click();await page.locator('[data-open-example="snowy-mountain-pass"]').click();
  await page.waitForFunction(count=>Object.values(window.__tabletop.snapshot().layout.entities).length===count,entityCount);
  const loaded=await page.evaluate(()=>window.__tabletop.snapshot());
  const geometry=scene=>Object.values(scene.layout.entities).map(e=>[e.kind,e.name,e.transform,e.assetRef]);
  assert.deepEqual(geometry(loaded),geometry(original),'Rebuild before capturing: distributed geometry must match the source');
  assert.deepEqual(Object.values(loaded.cameraPresets)[0].position,Object.values(original.cameraPresets)[0].position,'Rebuild before capturing: distributed camera must match the source');
  await page.waitForFunction(count=>window.__tabletop.stats().rockGeometries.length>=count,rockCount); // all geological instances loaded
  // Allow the final asynchronous vegetation/snow pass to reach the visible frame.
  await page.waitForTimeout(4000);
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/mountain-example-editor.png'});
  await page.locator('[data-action="present"]').first().click();
  await page.addStyleTag({content:'#presentation-controls { visibility: hidden !important; }'});
  await page.waitForTimeout(2000);
  const canvas=page.locator('#viewport canvas');await canvas.screenshot({path:'test-results/mountain-example-reference.png'});
  await canvas.screenshot({path:'public/scenes/snowy-mountain-pass.jpg',type:'jpeg',quality:87});
  console.log(JSON.stringify(await page.evaluate(()=>{const s=window.__tabletop.stats();return {camera:window.__tabletop.camera(),stats:{objects:s.objects,calls:s.calls,triangles:s.triangles,textures:s.textures}};}),null,2));
  await page.keyboard.press('Escape');await page.locator('[data-tab="scene"]').click();
  const caveCamera=Object.values((await page.evaluate(()=>window.__tabletop.snapshot())).cameraPresets)[1];
  await (await reveal(page.locator(`[data-camera-cut="${caveCamera.id}"]`))).click();
  await page.waitForTimeout(2000);
  await canvas.screenshot({path:'test-results/mountain-example-cave.png'});
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
