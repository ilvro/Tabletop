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
for (const lesson of LESSONS) test(`tutorial "${lesson.title}" can be followed from the first step to the last`, {timeout:Math.max(420_000,chainLength(lesson)*25_000)}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-tutor-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(60_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    // A lesson that continues another runs on the scene the earlier ones leave: they are followed first, in order.
    const chain=[lesson];while(chain[0].continues)chain.unshift(LESSONS.find(entry=>entry.id===chain[0].continues));
    // The inspector shows one tab at a time: a gesture on a field of another tab first opens that tab, as a person would.
    const showPane=selector=>page.locator(selector).first().evaluate(node=>{const pane=node.closest('[data-inspector-tab]');if(pane?.hidden)document.querySelector(`[data-inspector-tab-button="${pane.dataset.inspectorTab}"]`)?.click();for(let p=node.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)p.open=true;},undefined,{timeout:30000}).catch(()=>{});
    const key=([,name])=>page.keyboard.press(name);let skipped=[];
    for (const current of chain) {
    skipped=[];
    await page.locator('[data-action="tutorials"]').first().click();
    await page.locator(`#tutorial-center [data-action="tutorial-start"][data-id="${current.id}"]`).first().click();
    for (const [index,step] of current.steps.entries()) {
      const where=`${current.id} #${index+1} "${step.say.replace(/<[^>]+>/g,'')}"`;
      await page.waitForFunction(i=>!window.tabletopTutor.active||window.tabletopTutor.active.step>=i,index).catch(()=>assert.fail(`${where}: the lesson did not reach this step`));
      // A step whose condition already holds (a task that starts open) passes by itself, as it does for a person.
      if (await page.evaluate(i=>window.tabletopTutor.active?.step!==i,index)) { skipped.push(index+1);continue; }
      if (step.before) await key(step.before);
      if (step.target) {
        await page.locator(step.target).first().waitFor({state:'visible'}).catch(()=>assert.fail(`${where}: target ${step.target} is not on screen`));
        await page.waitForFunction(()=>!document.querySelector('.tutor-ring').hidden);
      }
      const act=step.act??'click';
      // A step may take more than one gesture (open a window, then type in it): a list of acts, done in order.
      for (const one of Array.isArray(act[0])?act:[act]) {
        if (one==='continue') await page.locator('.tutor-card [data-tutor="next"]').click();
        else if (one==='click') await page.locator(step.target).first().click();
        else if (one[0]==='click') { await showPane(one[1]); await page.locator(one[1]).first().click(); }
        else if (one[0]==='fill') { await showPane(one[1]); await page.locator(one[1]).first().fill(one[2]);await page.keyboard.press('Tab'); }
        else if (one[0]==='select') { await showPane(one[1]); await page.locator(one[1]).first().selectOption(one[2]); }
        else if (one[0]==='key') await key(one);
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
    assert.ok(skipped.length<=lesson.steps.length/4,`steps ${skipped} completed by themselves: the lesson mostly teaches what is already done`);
    assert.equal(await page.evaluate(()=>window.tabletopTutor.active),null);
    assert.equal(await page.evaluate(id=>window.tabletopTutor.progress()[id]?.done,lesson.id),true);
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});
