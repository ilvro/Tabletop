import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {reveal} from './controls.js';
import {chromium} from 'playwright';
import {createApp} from '../../server/app.js';

test('swatches, segments and sliders edit the same fields, one undo step each', {timeout:120_000}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-controls-')),scene=JSON.parse(await readFile('public/scenes/casa-de-bairro.json','utf8'));
  const server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/api/tabletop/scenes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:scene})})).status,201);
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(base+'/?diagnostics');await page.waitForFunction(()=>!!window.__tabletop);
    await page.locator('[data-action="open"]').first().click();await page.locator(`[data-open="${scene.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,scene.id);
    const floor=Object.values(scene.layout.entities).find(e=>e.kind==='floor');
    const material=()=>page.evaluate(id=>window.__tabletop.snapshot().layout.entities[id].material,floor.id);
    // Elements: search by name, show one type, collapse a folder; none of it edits the scene.
    await page.locator('[data-tab=elements]').click();const revision=JSON.stringify((await page.evaluate(()=>window.__tabletop.snapshot())).layout);
    const sofa=Object.values(scene.layout.entities).find(e=>e.assetRef?.id==='builtin-sofa');
    await page.locator('#tree-search').fill('sofá de');assert.deepEqual(await page.locator('#scene-tree [data-select]').evaluateAll(n=>n.map(e=>e.dataset.select)),[sofa.id]);
    await page.locator('#tree-search').fill('');await page.locator('[data-tree-kind=lights]').click();
    assert.equal(await page.locator('#scene-tree [data-select]').count(),Object.keys(scene.look?.lights??scene.defaultLook?.lights??{}).length);
    await page.locator('[data-tree-kind=lights]').click();assert.ok(await page.locator('#scene-tree [data-select]').count()>100);
    const folder=page.locator('[data-group-collapse]').first();await folder.click();assert.equal(await folder.getAttribute('aria-expanded'),'false');await folder.click();
    assert.equal(JSON.stringify((await page.evaluate(()=>window.__tabletop.snapshot())).layout),revision);
    await (await reveal(page.locator(`[data-select="${floor.id}"]`).first())).click();
    const panel=page.locator('#inspector-content'),open=node=>node.evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
    const grid=panel.locator('.choice-field:has([data-field="material-texture"])');await open(grid);

    await grid.locator('[data-choice="tile"]').click();
    assert.equal((await material()).texture,'tile');
    assert.equal(await grid.locator('[data-choice="tile"]').getAttribute('aria-checked'),'true');
    // The pattern of the chosen texture is in view without opening anything.
    const pattern=panel.locator('.choice-field:has([data-field="material-tilePattern"])');
    assert.equal(await pattern.evaluate(e=>!e.closest('details:not([open])')),true);
    await pattern.locator('[data-choice="hex"]').click();assert.equal((await material()).tilePattern,'hex');
    await page.waitForFunction(()=>[...document.querySelectorAll('#inspector-content [data-swatch]')].every(n=>n.style.backgroundImage));

    // A drag is many input events and a single edit.
    const before=(await material()).tileVariation,slider=panel.locator('[data-range="material-tileVariation"]'),number=panel.locator('[data-field="material-tileVariation"]');
    await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();
    await page.mouse.move(box.x+box.width*.2,box.y+box.height/2);await page.mouse.down();
    for(const t of [.3,.45,.6,.8])await page.mouse.move(box.x+box.width*t,box.y+box.height/2,{steps:3});
    const live=Number(await number.inputValue());assert.ok(live>.6,'the value follows the drag');assert.equal((await material()).tileVariation,before,'nothing is committed while dragging');
    await page.mouse.up();
    await page.waitForFunction(([id,v])=>window.__tabletop.snapshot().layout.entities[id].material.tileVariation===v,[floor.id,live]);
    await page.locator('[data-action="undo"]').click();assert.equal((await material()).tileVariation,before,'the whole drag is one undo step');assert.equal((await material()).tilePattern,'hex');
    // Typing still works and moves the slider.
    await panel.locator('[data-field="material-tileVariation"]').fill('0.9');await panel.locator('[data-field="material-tileVariation"]').press('Tab');
    assert.equal((await material()).tileVariation,.9);assert.equal(await panel.locator('[data-range="material-tileVariation"]').inputValue(),'0.9');
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});
