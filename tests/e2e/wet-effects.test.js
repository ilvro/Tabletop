import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createApp} from '../../server/app.js';
import {reveal} from './controls.js';

test('a wet floor mirrors the frame, a bright light draws a streak, sparks flash and drops fall, and cables cast shadows only at high quality',{timeout:300_000},async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-wet-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1300,height:850}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics&hardware`);await page.waitForFunction(()=>!!window.__tabletop);
    const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click(),snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot()),stats=()=>page.evaluate(()=>window.__tabletop.stats());
    const check=async(name,value=true)=>(await reveal(page.locator(`[data-field="${name}"]`))).setChecked(value);
    const field=async(name,value)=>{const node=await reveal(page.locator(`[data-field="${name}"]`));await node.fill(String(value));await node.press('Tab');};
    const choose=async(name,value)=>(await reveal(page.locator(`.choice-field:has([data-field="${name}"]) [data-choice="${value}"]`))).click();
    const entities=async()=>Object.values((await snapshot()).layout.entities),click=async position=>{const p=await page.evaluate(v=>window.__tabletop.project(v),position);await page.mouse.click(p.x,p.y);};
    const settle=()=>page.evaluate(()=>window.__tabletop.ready());
    await (await reveal(page.locator('#quick-form button[type=submit]'))).click();await action('accept-proposal');await settle();

    // Wet floor: select it, turn it on, and the material shows up wet.
    const floor=(await entities()).find(e=>e.kind==='floor');await action('top');await page.waitForFunction(()=>window.__tabletop.camera().projection==='orthographic');
    await click([floor.transform.position[0]+1.2,floor.transform.position[1],floor.transform.position[2]+.8]);await page.waitForFunction(()=>/Piso/.test(document.querySelector('.object-title strong')?.textContent??''));
    await check('wet-enabled');await page.waitForFunction(id=>window.__tabletop.snapshot().layout.entities[id].material.wet?.enabled===true,floor.id);
    await field('wet-puddles',.8);await page.waitForFunction(id=>window.__tabletop.snapshot().layout.entities[id].material.wet.puddles===.8,floor.id);
    await settle();assert.ok((await stats()).wetMaterials.some(m=>m.id===floor.id&&m.amount===.6),'the floor draws wet');
    await action('undo');await page.waitForFunction(id=>window.__tabletop.snapshot().layout.entities[id].material.wet.puddles===.4,floor.id);
    // Reflections, bloom and its streak: through Ambiente.
    await check('rendering-surfaceReflections');await check('bloom-enabled');await field('bloom-streak',.6);
    await page.waitForFunction(()=>{const e=window.__tabletop.stats().effects;return e.surfaceReflections&&e.streak&&e.bloom;});
    await page.waitForTimeout(1500);const lit=(await stats()).effects;assert.ok(lit.reflectedMeshes>=1,'the wet floor is in the reflection pass');
    await (await reveal(page.locator('[data-field="lighting-quality"]'))).selectOption('economy');await page.waitForFunction(()=>!window.__tabletop.stats().effects.surfaceReflections);
    await (await reveal(page.locator('[data-field="lighting-quality"]'))).selectOption('balanced');await page.waitForFunction(()=>window.__tabletop.stats().effects.surfaceReflections);
    // Cables cast shadows at high quality only.
    await action('cable-place');await click([-1.5,0,-1]);await click([1.5,0,1]);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.cable));await settle();
    assert.equal((await stats()).cableShadows.every(c=>c.castShadow===false),true,'balanced: no shadow');
    await (await reveal(page.locator('[data-field="lighting-quality"]'))).selectOption('high');await page.waitForFunction(()=>window.__tabletop.stats().cableShadows.every(c=>c.castShadow===true));
    await (await reveal(page.locator('[data-field="lighting-quality"]'))).selectOption('balanced');await page.waitForFunction(()=>window.__tabletop.stats().cableShadows.every(c=>c.castShadow===false));
    // Sparks flash the light; drips fall; the pause holds them.
    await action('sparks-place');await click([2.4,0,-1.6]);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.localEffect?.type==='sparks'));
    await field('effect-count',24);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.localEffect?.type==='sparks').localEffect.count===24);
    const flashes=new Set();for(let i=0;i<60;i++){const [s]=(await stats()).localEffectLights.filter(l=>l.type==='sparks');flashes.add(s.lightIntensity>.5?'on':'off');await page.waitForTimeout(150);if(flashes.size===2)break;}
    assert.deepEqual([...flashes].sort(),['off','on'],'the light flashes and goes out');
    await action('drip-place');await click([-2.4,0,1.6]);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.localEffect?.type==='drip'));
    const drip=(await entities()).find(e=>e.localEffect?.type==='drip');assert.ok(drip.localEffect.size[1]>2&&drip.transform.position[1]>2,'it hangs from the ceiling and falls to the floor');
    await check('effects-paused');await page.waitForTimeout(500);const frozen=(await stats()).localEffectLights.find(l=>l.type==='sparks').lightIntensity;await page.waitForTimeout(1200);assert.equal((await stats()).localEffectLights.find(l=>l.type==='sparks').lightIntensity,frozen);
    await check('effects-paused',false);
    await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/wet-effects.png'});
    const saved=await snapshot();await page.locator('#save-scene').click();await page.waitForFunction(()=>/Salvo/.test(document.getElementById('save-status').textContent));
    await page.reload();await page.waitForFunction(()=>!!window.__tabletop);await action('open');await page.locator(`[data-open="${saved.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,saved.id);
    assert.deepEqual((await snapshot()).layout.entities[floor.id].material.wet,saved.layout.entities[floor.id].material.wet);
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});
