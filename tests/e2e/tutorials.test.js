import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createApp} from '../../server/app.js';
import {LESSONS} from '../../src/tutorial/lessons.js';

// Every lesson is run as written: each target must be on screen and each step must complete by its own condition.
for (const lesson of LESSONS) test(`tutorial "${lesson.title}" can be followed from the first step to the last`, {timeout:420_000}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-tutor-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(60_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    await page.locator('.app-header [data-action="tutorials"]').click();
    await page.locator(`#tutorial-center [data-action="tutorial-start"][data-id="${lesson.id}"]`).first().click();
    const key=([,name])=>page.keyboard.press(name),skipped=[];
    for (const [index,step] of lesson.steps.entries()) {
      const where=`${lesson.id} #${index+1} "${step.say.replace(/<[^>]+>/g,'')}"`;
      await page.waitForFunction(i=>!window.tabletopTutor.active||window.tabletopTutor.active.step>=i,index).catch(()=>assert.fail(`${where}: the lesson did not reach this step`));
      // A step whose condition already holds (a task that starts open) passes by itself, as it does for a person.
      if (await page.evaluate(i=>window.tabletopTutor.active?.step!==i,index)) { skipped.push(index+1);continue; }
      if (step.before) await key(step.before);
      if (step.target) {
        await page.locator(step.target).first().waitFor({state:'visible'}).catch(()=>assert.fail(`${where}: target ${step.target} is not on screen`));
        await page.waitForFunction(()=>!document.querySelector('.tutor-ring').hidden);
      }
      const act=step.act??'click';
      if (act==='continue') await page.locator('.tutor-card [data-tutor="next"]').click();
      else if (act==='click') await page.locator(step.target).first().click();
      else if (act[0]==='fill') { await page.locator(act[1]).fill(act[2]);await page.keyboard.press('Tab'); }
      else if (act[0]==='key') await key(act);
      else if (act[0]==='world') { const p=await page.evaluate(v=>window.__tabletop.project(v),act[1]);await page.mouse.click(p.x,p.y); }
      await page.waitForFunction(i=>!window.tabletopTutor.active||window.tabletopTutor.active.step>i,index).catch(()=>assert.fail(`${where}: doing the step did not complete it`));
    }
    assert.ok(skipped.length<=lesson.steps.length/4,`steps ${skipped} completed by themselves: the lesson mostly teaches what is already done`);
    assert.equal(await page.evaluate(()=>window.tabletopTutor.active),null);
    assert.equal(await page.evaluate(id=>window.tabletopTutor.progress()[id]?.done,lesson.id),true);
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});
