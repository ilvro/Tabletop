import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createApp} from '../../server/app.js';
import {LESSONS} from '../../src/tutorial/lessons.js';

const chainLength=lesson=>lesson.steps.length+(lesson.continues?chainLength(LESSONS.find(entry=>entry.id===lesson.continues)):0);
// Every lesson is run as written: each target must be on screen and each step must complete by its own condition.
for (const lesson of LESSONS) test(`tutorial "${lesson.title}" can be followed from the first step to the last`, {timeout:Math.max(420_000,chainLength(lesson)*(lesson.heavy?60_000:25_000))}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-tutor-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(lesson.heavy?180_000:60_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    // A lesson that continues another runs on the scene the earlier ones leave: they are followed first, in order.
    const chain=[lesson];while(chain[0].continues)chain.unshift(LESSONS.find(entry=>entry.id===chain[0].continues));
    if (chain.some(entry => entry.requires === 'atelie')) {
      await page.evaluate(async () => {
        const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGM4AQAAygDJmcpdfgAAAABJRU5ErkJggg==';
        const pngBytes = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));
        const blob = new Blob([pngBytes], { type: 'image/png' });
        await new Promise((resolve, reject) => {
          const req = indexedDB.open('mesa-handouts-v1', 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('handouts')) db.createObjectStore('handouts', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('bakes')) db.createObjectStore('bakes', { keyPath: ['id', 'light'] });
          };
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction(['handouts', 'bakes'], 'readwrite');
            const id = 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6';
            tx.objectStore('handouts').put({
              id,
              name: 'Carta envelhecida',
              category: 'Cartas',
              tags: ['carta', 'antiga'],
              revision: 1,
              updatedAt: new Date().toISOString(),
              hasUv: true,
              source: window.location.origin + '/',
              preview: blob,
            });
            tx.objectStore('bakes').put({ id, light: 'normal', revision: 1, blob, width: 2048, height: 2048 });
            tx.objectStore('bakes').put({ id, light: 'uv', revision: 1, blob, width: 2048, height: 2048 });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
          };
          req.onerror = () => reject(req.error);
        });
      });
    }
    // The inspector shows one tab at a time: a gesture on a field of another tab first opens that tab, as a person would.
    const showPane=selector=>page.locator(selector).first().evaluate(node=>{const pane=node.closest('[data-inspector-tab]');if(pane?.hidden)document.querySelector(`[data-inspector-tab-button="${pane.dataset.inspectorTab}"]`)?.click();for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)p.open=true;},undefined,{timeout:30000}).catch(()=>{});
    const key=([,name])=>page.keyboard.press(name);let skipped=[];
    for (const current of chain) {
    skipped=[];
    await page.locator('[data-action="tutorials"]').first().click();
    // A folder of the list may start closed (Dicas rápidas): it is opened first, as a person would.
    const start=page.locator(`#tutorial-center [data-action="tutorial-start"][data-id="${current.id}"]`).first();
    await start.evaluate(node=>{const folder=node.closest('details');if(folder&&!folder.open)folder.open=true;});await start.click();
    // A lesson on a practice copy of an example starts once the copy has loaded.
    await page.waitForFunction(id=>window.tabletopTutor.active?.id===id,current.id);
    for (const [index,step] of current.steps.entries()) {
      const where=`${current.id} #${index+1} "${step.say.replace(/<[^>]+>/g,'')}"`;
      await page.waitForFunction(i=>!window.tabletopTutor.active||window.tabletopTutor.active.step>=i,index).catch(()=>assert.fail(`${where}: the lesson did not reach this step`));
      // A step whose condition already holds (a task that starts open) passes by itself, as it does for a person.
      if (await page.evaluate(i=>window.tabletopTutor.active?.step!==i,index)) { skipped.push(index+1);continue; }
      if (step.before) await key(step.before);
      // A step done alone shows no ring until the person asks "Mostrar onde"; the test asks at once.
      if (step.try) await page.evaluate(()=>window.tabletopTutor.showWhere());
      if (step.target) {
        await page.locator(step.target).first().waitFor({state:'visible'}).catch(()=>assert.fail(`${where}: target ${step.target} is not on screen`));
        await page.waitForFunction(()=>!document.querySelector('.tutor-ring').hidden);
      }
      const act=step.act??'click';
      // A step may take more than one gesture (open a window, then type in it): a list of acts, done in order.
      const acts=Array.isArray(act[0])?act:[act];
      for (const [order,one] of acts.entries()) {
        // A step must not complete before everything it asks is done: its condition has to check all of it.
        if (order>0&&await page.evaluate(i=>window.tabletopTutor.active?.step!==i,index)) assert.fail(`${where}: completed after ${order} of ${acts.length} actions; its condition does not check everything the step asks`);
        if (one==='continue') await page.locator('.tutor-card [data-tutor="next"]').click();
        // A large example scene draws a frame every few seconds under the software renderer, too slowly for the
        // "stable" check: there, a visible control is clicked without waiting for animation frames.
        else if (one==='click') await page.locator(step.target).first().click({force:Boolean(current.heavy)});
        else if (one[0]==='click') { await showPane(one[1]); await page.locator(one[1]).first().click({force:Boolean(current.heavy)}); }
        else if (one[0]==='fill') { await showPane(one[1]); await page.locator(one[1]).first().fill(one[2]);await page.keyboard.press('Tab'); }
        else if (one[0]==='select') { await showPane(one[1]); await page.locator(one[1]).first().selectOption(one[2]); }
        // A slider dragged and released: the value while dragging, then the release that commits it.
        else if (one[0]==='set') await page.locator(one[1]).first().evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},one[2]);
        else if (one[0]==='key') await key(one);
        // A drag on the floor from one point of the scene to another (a brush stroke, an area of effect).
        else if (one[0]==='drag') { const [a,b]=await page.evaluate(([from,to])=>[window.__tabletop.project(from),window.__tabletop.project(to)],[one[1],one[2]]);
          await page.mouse.move(a.x,a.y);await page.mouse.down();for(let i=1;i<=12;i++)await page.mouse.move(a.x+(b.x-a.x)*i/12,a.y+(b.y-a.y)*i/12);await page.mouse.up(); }
        else if (one[0]==='world') { const p=await page.evaluate(v=>window.__tabletop.project(v),one[1]);
          // The point must be free: a window still closing, or the tutor's own card over it, would take the click.
          await page.waitForFunction(({x,y})=>!!document.elementFromPoint(x,y)?.closest('#viewport'),p).catch(()=>assert.fail(`${where}: the point to click in the scene is covered`));await page.mouse.click(p.x,p.y); }
      }
      const done=timeout=>page.waitForFunction(i=>!window.tabletopTutor.active||window.tabletopTutor.active.step>i,index,{timeout}).then(()=>true,()=>false);
      // Under the software renderer a click in the scene is sometimes lost between slow frames; a person would click again.
      const last=(Array.isArray(act[0])?act:[act]).at(-1);
      if (last?.[0]==='world'&&!(await done(20_000))) { const p=await page.evaluate(v=>window.__tabletop.project(v),last[1]);console.log(`${where}: clicked the scene again`);await page.mouse.click(p.x,p.y); }
      await page.waitForFunction(i=>!window.tabletopTutor.active||window.tabletopTutor.active.step>i,index).catch(()=>assert.fail(`${where}: doing the step did not complete it`));
    }
    }
    // The frame each lesson ends on, to compare with the result it was designed for.
    await page.locator('.tutor-card [data-tutor="close"]').click().catch(()=>{});
    await page.locator('#viewport').screenshot({path:`test-results/tutorial-${lesson.id}-final.png`}).catch(()=>{});
    assert.ok(skipped.length<=lesson.steps.length/4,`steps ${skipped} completed by themselves: the lesson mostly teaches what is already done`);
    assert.equal(await page.evaluate(()=>window.tabletopTutor.active),null);
    assert.equal(await page.evaluate(id=>window.tabletopTutor.progress()[id]?.done,lesson.id),true);
    assert.deepEqual(errors,[]);
  } catch (error) {
    // What the screen showed when a step failed: the first thing to look at.
    await browser?.contexts()[0]?.pages()[0]?.screenshot({path:`test-results/tutorial-${lesson.id}-failed.png`}).catch(()=>{});
    throw error;
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});

// A lesson that builds from nothing runs on a practice scene: the person's own scene, unsaved changes included, comes back as it was.
test('a lesson keeps the person\'s scene aside on a practice scene and gives it back; the "?" of a task opens its tip', {timeout:240_000}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-practice-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(60_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    // The person's own work, not saved: a room.
    await page.locator('.tabs [data-tab="build"]').click();await page.locator('#quick-form button[type="submit"]').click();await page.locator('[data-action="accept-proposal"]').click();
    const own=await page.evaluate(()=>window.__tabletop.snapshot());
    assert.ok(Object.keys(own.layout.entities).length>=5);
    // The "?" of Andares e camadas opens its tip, which needs an empty scene: a practice scene takes the place of the room.
    await page.locator('[data-build-section="levels"] .task-help').click();
    await page.waitForFunction(()=>window.tabletopTutor.active?.id==='tip-levels');
    const practice=await page.evaluate(()=>window.__tabletop.snapshot());
    assert.notEqual(practice.id,own.id);assert.match(practice.name,/^Treino · /);assert.equal(Object.keys(practice.layout.entities).length,0);
    assert.equal(await page.locator('[data-build-section="levels"]').evaluate(node=>node.open),false,'the "?" does not fold the task open');
    // Leaving halfway: the closing card offers the way back.
    await page.locator('.tutor-card [data-tutor="exit"]').click();
    await page.locator('.tutor-card [data-action="tutorial-return"]').click();
    const back=await page.evaluate(()=>window.__tabletop.snapshot());
    assert.equal(back.id,own.id);assert.deepEqual(back.layout,own.layout);
    assert.equal(await page.evaluate(()=>!document.querySelector('.tutor').hidden),false,'the card closes');
    // Unsaved, as it was: Salvar still has something to save.
    assert.equal(await page.locator('#save-scene').evaluate(node=>node.closest('header')?.textContent.includes('Alterações locais')??true),true);
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});
