import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createApp} from '../../server/app.js';
import {reveal} from './controls.js';

test('a cable is hung with two clicks at the height of the walls, edited in the inspector, placed from the library and survives a reload', {timeout:150_000}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-cables-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click(),snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
    const cables=async()=>Object.values((await snapshot()).layout.entities).filter(e=>e.cable),click=async position=>{const p=await page.evaluate(v=>window.__tabletop.project(v),position);await page.mouse.click(p.x,p.y);};
    await (await reveal(page.locator('#quick-form button[type=submit]'))).click();await action('accept-proposal');
    // Two clicks on the floor: the ends hang from the top of the walls above them.
    await action('cable-place');await click([-2,0,-1.5]);assert.equal((await cables()).length,0,'the first click only marks an end');await click([2,0,1]);
    await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.cable));
    const [first]=await cables();assert.equal(first.assetRef.id,'builtin-industrial-cable');assert.ok(Math.abs(first.transform.position[1]-2.56)<.02);assert.ok(Math.abs(Math.hypot(...first.cable.span)-Math.hypot(4,2.5))<.6);assert.ok(first.cable.sag>.3);
    // The wires are real geometry: more wires, more triangles.
    await page.waitForFunction(()=>window.__tabletop.ready());const before=(await page.evaluate(()=>window.__tabletop.stats())).triangles;
    const strands=await reveal(page.locator('[data-field="cable-strands"]'));await strands.fill('8');await strands.press('Tab');
    await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.cable).cable.strands===8);
    await page.waitForFunction(count=>window.__tabletop.ready()&&window.__tabletop.stats().triangles>count,before);
    await (await reveal(page.locator('.choice-field:has([data-field="cable-mode"]) [data-choice="drop"]'))).click();
    await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.cable).cable.mode==='drop');
    await action('undo');assert.equal((await cables())[0].cable.mode,'span');
    // From the library it arrives with the default span and is an ordinary object.
    await page.keyboard.press('Escape');await page.locator('[data-tab="assets"]').click();await page.getByLabel('Buscar assets',{exact:true}).fill('cabos pendentes');await page.locator('[data-asset="builtin-industrial-cable"]').click();
    await page.waitForFunction(()=>!document.elementFromPoint(900,500)?.closest('dialog'));await click([0,0,1.8]);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).filter(e=>e.cable).length===2);await page.keyboard.press('Escape');
    assert.deepEqual((await cables())[1].cable.span,[3,0,0]);
    // The assistant dresses the ceiling of the room, as a proposal like everything else it does.
    await page.keyboard.press('Escape');await page.locator('[data-tab="build"]').click();await action('cables-preview');assert.equal((await cables()).length,2,'a preview hangs nothing');await action('accept-proposal');
    const hung=(await cables()).filter(e=>e.tags.includes('cabos-assistidos'));assert.ok(hung.length>=3);assert.ok(hung.every(e=>Math.abs(e.transform.position[1]-2.56)<.02));
    await page.locator('#save-scene').click();await page.waitForFunction(()=>/Salvo/.test(document.getElementById('save-status').textContent));
    await page.reload();await page.waitForFunction(()=>!!window.__tabletop);
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});
