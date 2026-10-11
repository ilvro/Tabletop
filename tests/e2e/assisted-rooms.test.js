import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createApp} from '../../server/app.js';
import {reveal} from './controls.js';

test('a room is furnished by type from the panel, another arrangement is one click, and the result is ordinary objects', {timeout:120_000}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-rooms-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click(),snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
    const props=async()=>Object.values((await snapshot()).layout.entities).filter(e=>e.kind==='prop');
    await (await reveal(page.locator('#quick-form button[type=submit]'))).click();await action('accept-proposal');
    assert.equal(Object.values((await snapshot()).layout.entities).filter(e=>e.kind==='wall').length,4);
    const template=await reveal(page.locator('[data-field="smart-template"]'));
    assert.ok(await template.locator('option').count()>=20);assert.ok(await template.locator('optgroup').count()>=5);
    await template.selectOption('ritual');assert.equal(await page.locator('[data-field="smart-chairs"]').count(),0,'seats only where the room has a table');
    await action('smart-preview');assert.equal((await props()).length,0,'a preview adds nothing');await action('accept-proposal');
    const first=await props();assert.ok(first.some(e=>e.assetRef.id==='builtin-ritual-circle'));assert.ok(first.some(e=>e.assetRef.id==='builtin-ritual-altar'));
    // What lies on the altar names it as its support.
    const altar=first.find(e=>e.assetRef.id==='builtin-ritual-altar');assert.ok(first.some(e=>e.surfaceId===altar.id));
    const seed=Number(await page.locator('[data-field="smart-seed"]').inputValue());
    await action('smart-variation');assert.equal(Number(await (await reveal(page.locator('[data-field="smart-seed"]'))).inputValue()),seed+1);await action('accept-proposal');
    const second=await props(),place=list=>JSON.stringify(list.map(e=>e.transform.position.map(v=>+v.toFixed(2))).sort());
    assert.notEqual(place(second),place(first));assert.ok(second.some(e=>e.id===altar.id),'rearranging moves the same objects instead of replacing them');assert.ok(second.filter(e=>first.some(f=>f.id===e.id)).length>=first.length-3);
    await action('undo');assert.equal(place(await props()),place(first));
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});
