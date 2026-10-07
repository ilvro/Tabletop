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
const auditShadows=process.argv.includes('--audit-shadows');
// Reproducible capture of the actual renderer, using only public UI controls.
const directory=await mkdtemp(path.join(os.tmpdir(),'tabletop-example-preview-'));
const server=(await createApp({dataDir:directory})).listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:auditShadows?{width:960,height:540}:{width:1440,height:810}}),errors=[];page.setDefaultTimeout(120_000);page.on('dialog',dialog=>dialog.accept());
  await page.emulateMedia({reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
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
  await canvas.screenshot({path:'test-results/mountain-example-preview.jpg',type:'jpeg',quality:87});
  const measurements=await page.evaluate(()=>{const s=window.__tabletop.stats();return {camera:window.__tabletop.camera(),stats:{objects:s.objects,calls:s.calls,triangles:s.triangles,textures:s.textures},atmosphere:s.atmosphere,assetDiagnostics:s.assetDiagnostics};});
  assert.deepEqual(measurements.assetDiagnostics,[]);
  assert.equal(measurements.atmosphere.weather,'snow');assert.equal(measurements.atmosphere.particles,2700);
  console.log(JSON.stringify(measurements,null,2));
  if(auditShadows) {
    await page.keyboard.press('Escape');await page.locator('[data-tab="scene"]').click();
    const key=Object.values(loaded.look.lights).find(light=>light.type==='directional');
    await (await reveal(page.locator(`[data-select="${key.id}"]`))).click();
    await (await reveal(page.locator('[data-field="light-shadow"]'))).uncheck();
    await page.locator('[data-action="present"]').first().click();await page.waitForTimeout(1000);
    await canvas.screenshot({path:'test-results/mountain-example-no-shadows.png'});
  }
  const cameras=Object.values((await page.evaluate(()=>window.__tabletop.snapshot())).cameraPresets);
  const qualityLook=await page.evaluate(()=>window.__tabletop.snapshot().look);
  for(const [index,name] of (auditShadows?[]:[[1,'cave'],[2,'bridge'],[3,'wide'],[4,'top']])) {
    await page.keyboard.press('Escape');await page.locator('[data-tab="scene"]').click();
    // Authoring overviews must stay legible above the fog bank. This is local quality only.
    if(index===3)await (await reveal(page.locator('[data-field="viewport-effects"]'))).uncheck();
    await (await reveal(page.locator(`[data-camera-cut="${cameras[index].id}"]`))).click();
    await page.locator('[data-action="present"]').first().click();await page.waitForTimeout(1200);
    await canvas.screenshot({path:`test-results/mountain-example-${name}.png`});
  }
  if(!auditShadows) {
  // Observe the real animation in a small viewport; the full-size stills use reduced motion.
  await page.keyboard.press('Escape');await page.locator('[data-tab="scene"]').click();
  await (await reveal(page.locator('[data-field="viewport-effects"]'))).check();
  assert.deepEqual(await page.evaluate(()=>window.__tabletop.snapshot().look),qualityLook,'overview quality must not change the saved environment');
  await (await reveal(page.locator(`[data-camera-cut="${cameras[0].id}"]`))).click();
  await page.locator('[data-action="present"]').first().click();await page.setViewportSize({width:640,height:360});
  const paused=await page.evaluate(()=>window.__tabletop.stats());assert.equal(paused.animatedAtmosphere,false);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(time=>window.__tabletop.stats().animatedAtmosphere&&window.__tabletop.stats().effectTime>time+.3,paused.effectTime);
  await canvas.screenshot({path:'test-results/mountain-example-storm-a.png'});
  const first=await page.evaluate(()=>window.__tabletop.stats().effectTime);
  await page.waitForFunction(time=>window.__tabletop.stats().effectTime>time+.4,first);
  await canvas.screenshot({path:'test-results/mountain-example-storm-b.png'});
  console.log(JSON.stringify({storm:await page.evaluate(()=>{const s=window.__tabletop.stats();return {animated:s.animatedAtmosphere,time:s.effectTime,particles:s.atmosphere.particles};})}));
  await page.emulateMedia({reducedMotion:'reduce'});
  }
  assert.deepEqual(errors,[],'All models and shaders must load without browser errors');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
