import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createApp} from '../../server/app.js';
import {reveal} from './controls.js';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=','base64');
const rotate=([x,y,z,w],[vx,vy,vz])=>{const tx=2*(y*vz-z*vy),ty=2*(z*vx-x*vz),tz=2*(x*vy-y*vx);return [vx+w*tx+y*tz-z*ty,vy+w*ty+z*tx-x*tz,vz+w*tz+x*ty-y*tx];};

test('a decal is glued by a click, follows its wall and the model it marks, a screen shows what it is told and lights the room, and all of it survives saving, undoing and presenting',{timeout:300_000},async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-screens-decals-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
    // A library image for the screen to show.
    const imported=await fetch(`http://127.0.0.1:${server.address().port}/api/tabletop/assets?name=Retrato`,{method:'POST',headers:{'Content-Type':'image/png'},body:png});assert.equal(imported.status,201);const image=await imported.json();
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click(),snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot()),stats=()=>page.evaluate(()=>window.__tabletop.stats());
    const field=async(name,value)=>{const node=await reveal(page.locator(`[data-field="${name}"]`));await node.fill(String(value));await node.press('Tab');};
    const check=async(name,value=true)=>(await reveal(page.locator(`[data-field="${name}"]`))).setChecked(value);
    const choose=async(name,value)=>(await reveal(page.locator(`.choice-field:has([data-field="${name}"]) [data-choice="${value}"]`))).click();
    const entities=async()=>Object.values((await snapshot()).layout.entities),decals=async()=>(await entities()).filter(e=>e.decal);
    const click=async position=>{const p=await page.evaluate(v=>window.__tabletop.project(v),position);await page.mouse.click(p.x,p.y);};
    const settle=()=>page.evaluate(()=>window.__tabletop.ready());
    await (await reveal(page.locator('#quick-form button[type=submit]'))).click();await action('accept-proposal');await settle();
    // Which wall is at the back, and a point on it above the furniture.
    const walls=(await entities()).filter(e=>e.kind==='wall'),back=walls.map(w=>({w,mid:(()=>{const d=rotate(w.transform.rotation,[w.length/2,w.height*.55,0]);return w.transform.position.map((v,i)=>v+d[i]);})()})).sort((a,b)=>a.mid[2]-b.mid[2])[0];
    assert.ok(back);

    // A decal: one click on the wall at the back.
    await action('decal-place');assert.equal((await decals()).length,0,'choosing the tool pastes nothing');
    await click(back.mid);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.decal));
    const [sign]=await decals();assert.equal(sign.anchor.socket,'surface');assert.equal(sign.anchor.hostId,back.w.id);assert.equal(sign.assetRef.id,'builtin-decal');assert.equal(sign.decal.kind,'text');
    await settle();let info=(await stats()).decals;assert.equal(info.length,1);assert.equal(info[0].polygonOffset,true);assert.equal(info[0].depthWrite,false);assert.equal(info[0].receiveShadow,true);assert.equal(info[0].castShadow,false);assert.equal(info[0].hostId,back.w.id);
    await field('decal-text','SETOR 7 · CARGA');await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.decal).decal.text==='SETOR 7 · CARGA');
    await field('decal-size-0',2.4);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.decal).footprint[0]===2.4);
    await field('decal-spin',15);await page.waitForFunction(()=>Math.abs(Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.decal).anchor.rotation[2])>.05);

    // A stripe of material, and the same material on the whole wall.
    await choose('decal-kind','surface');await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.decal).material.texture==='hazard');await settle();
    await page.waitForFunction(id=>window.__tabletop.stats().surfaceMaterials.some(m=>m.id===id&&m.texture==='hazard'),sign.id);
    await choose('material-texture','hazard');await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.decal).material.texture==='hazard');
    await field('material-hazardWidth',.2);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.decal).material.hazardWidth===.2);
    await page.keyboard.press('Escape');await click(back.w.transform.position.map((v,i)=>v+rotate(back.w.transform.rotation,[back.w.length*.15,back.w.height*.8,0])[i]));
    await page.waitForFunction(id=>document.querySelector('[data-field="position-0"]')&&window.__tabletop.stats().resourceIds.some(r=>r.id===id),back.w.id);
    await choose('material-texture','hazard');await page.waitForFunction(id=>window.__tabletop.snapshot().layout.entities[id].material.texture==='hazard',back.w.id);await settle();
    const textured=(await stats()).surfaceMaterials.filter(m=>m.texture==='hazard').map(m=>m.id);assert.ok(textured.includes(back.w.id)&&textured.includes(sign.id),'the material is on the wall and on the decal');

    // The decal goes where the wall goes.
    const before=(await decals())[0].transform.position,x=back.w.transform.position[0];
    const wallBefore=back.w.transform.position;await field('position-0',x+1);await page.waitForFunction(([id,v])=>window.__tabletop.snapshot().layout.entities[id].transform.position[0]!==v,[back.w.id,x]);
    // The grid snaps the wall to where it lands: the decal must have moved by whatever the wall did.
    const wallAfter=(await snapshot()).layout.entities[back.w.id].transform.position,moved=wallAfter.map((v,i)=>v-wallBefore[i]);assert.ok(Math.abs(moved[0])>.5,'the wall moved');
    await page.waitForFunction(([v,d])=>Math.abs(Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.decal).transform.position[0]-(v+d))<1e-6,[before[0],moved[0]]);
    const after=(await decals())[0].transform.position;assert.ok(after.every((v,i)=>Math.abs(v-before[i]-moved[i])<1e-6),'the decal moved by the same delta');
    await action('undo');await page.waitForFunction(v=>Math.abs(Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.decal).transform.position[0]-v)<1e-6,before[0]);

    // A model with a screen: placed from the library, it offers the section; a crate does not.
    await page.keyboard.press('Escape');await page.locator('[data-tab="assets"]').click();
    const place=async(id,term,position)=>{await page.getByLabel('Buscar assets',{exact:true}).fill(term);await page.locator(`[data-asset="${id}"]`).click();await page.waitForFunction(()=>!document.elementFromPoint(900,500)?.closest('dialog'));const count=(await entities()).filter(e=>e.assetRef?.id===id).length;await click(position);await page.waitForFunction(([key,n])=>Object.values(window.__tabletop.snapshot().layout.entities).filter(e=>e.assetRef?.id===key).length===n+1,[id,count]);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('[data-action="tool-select"]')?.classList.contains('active')||true);};
    await place('builtin-crate','caixa',[2,0,1.5]);await settle();assert.equal(await page.locator('[data-field="screen-enabled"]').count(),0,'a crate has no screen');
    await page.locator('[data-tab="assets"]').click();await place('builtin-crt-tv','televisão de tubo',[-1.5,0,1.2]);await settle();
    const tv=(await entities()).find(e=>e.assetRef?.id==='builtin-crt-tv');assert.ok(tv);
    if(!/Televisão/.test(await page.locator('.object-title strong').first().textContent().catch(()=>'')))await click([-1.5,.2,1.2]);await page.waitForFunction(()=>/Televisão/.test(document.querySelector('.object-title strong')?.textContent??''));
    await page.waitForSelector('[data-field="screen-enabled"]',{state:'attached'});
    await check('screen-enabled');await page.waitForFunction(id=>{const e=window.__tabletop.snapshot().layout.entities[id];return e.screen?.enabled&&e.illumination?.profile==='screen'&&e.illumination.shadowPolicy==='off';},tv.id);
    await field('screen-line-0-text','BOOTING');await field('screen-line-1-text','SYS');
    await page.waitForFunction(id=>window.__tabletop.snapshot().layout.entities[id].screen.lines[1].text==='SYS',tv.id);
    await page.waitForFunction(()=>window.__tabletop.stats().screens.length===1&&window.__tabletop.stats().screens[0].draws>0);
    let screen=(await stats()).screens[0];assert.notEqual(screen.average,'#000000','what is on the screen is not black');assert.ok(screen.luma>0);assert.equal(screen.pool,1);
    // It moves, ten times a second at most.
    const first=screen.draws;await page.waitForFunction(n=>window.__tabletop.stats().screens[0].draws>n+2,first);
    // The effect of the tube is an uniform: it changes nothing that is drawn, and undo takes it back.
    const drawn=(await stats()).screens[0].draws;await field('screen-scanlines',80);await page.waitForFunction(id=>window.__tabletop.snapshot().layout.entities[id].screen.scanlines===.8,tv.id);await action('undo');
    await page.waitForFunction(id=>window.__tabletop.snapshot().layout.entities[id].screen.scanlines===.5,tv.id);assert.ok((await stats()).screens[0].draws>=drawn);
    // A library image on the glass, then the text again: the picture follows the choice.
    await choose('screen-kind','image');await page.waitForFunction(([id,key])=>{const e=window.__tabletop.snapshot().layout.entities[id];return e.screen.kind==='image'&&e.screen.imageRef?.id===key;},[tv.id,image.id]);
    await page.waitForFunction(()=>window.__tabletop.stats().screens[0].key.includes('"image"')&&window.__tabletop.stats().screens[0].draws>0);await settle();
    await choose('screen-kind','text');await page.waitForFunction(id=>window.__tabletop.snapshot().layout.entities[id].screen.kind==='text',tv.id);await page.waitForFunction(()=>window.__tabletop.stats().screens[0].key.includes('"text"'));
    // Paused effects freeze it.
    await check('effects-paused');await page.waitForFunction(()=>window.__tabletop.snapshot().look.effectsPaused===true);await page.waitForTimeout(400);
    const frozen=(await stats()).screens[0].draws;await page.waitForTimeout(1500);assert.equal((await stats()).screens[0].draws,frozen,'a paused screen is not drawn');
    await check('effects-paused',false);await page.waitForFunction(n=>window.__tabletop.stats().screens[0].draws>n,frozen);

    // A mark on the casing of the monitor: the host is a model, not a wall.
    await action('top');await page.waitForFunction(()=>window.__tabletop.camera().projection==='orthographic');await action('decal-place');await click(tv.transform.position.map((v,i)=>v+[0,.5,0][i]));
    await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).filter(e=>e.decal).length===2);
    const mark=(await decals()).find(d=>d.id!==sign.id);assert.equal(mark.anchor.hostId,tv.id);assert.equal(mark.anchor.socket,'surface');
    await field('decal-text','NS-04');await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.decal?.text==='NS-04'));
    // The TV moves, the mark moves with it.
    await field('decal-size-0',.2);await field('decal-size-1',.1);await page.waitForFunction(id=>window.__tabletop.snapshot().layout.entities[id].decal.size[1]===.1,mark.id);
    await page.keyboard.press('Escape');await click(tv.transform.position.map((v,i)=>v+[.25,.5,0][i]));await page.waitForFunction(()=>/Televisão/.test(document.querySelector('.object-title strong')?.textContent??''));
    const markBefore=(await decals()).find(d=>d.id===mark.id).transform.position;await field('position-0',tv.transform.position[0]+.5);
    await page.waitForFunction(([id,x])=>Math.abs(window.__tabletop.snapshot().layout.entities[id].transform.position[0]-x)>.25,[mark.id,markBefore[0]]);
    const tvNow=(await snapshot()).layout.entities[tv.id].transform.position[0],markNow=(await snapshot()).layout.entities[mark.id].transform.position[0];assert.ok(Math.abs((markNow-markBefore[0])-(tvNow-tv.transform.position[0]))<1e-6,'the mark moved with the monitor');

    await action('perspective');await page.waitForFunction(()=>window.__tabletop.camera().projection==='perspective');
    // Save, reopen, present.
    const final=await snapshot();await page.locator('#save-scene').click();await page.waitForFunction(()=>/Salvo/.test(document.getElementById('save-status').textContent));
    await page.reload();await page.waitForFunction(()=>!!window.__tabletop);await action('open');await page.locator(`[data-open="${final.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,final.id);
    const reopened=await snapshot();assert.deepEqual(reopened.layout.entities[tv.id].screen,final.layout.entities[tv.id].screen);assert.deepEqual(reopened.layout.entities[sign.id].decal,final.layout.entities[sign.id].decal);assert.deepEqual(reopened.layout.entities[mark.id].anchor,final.layout.entities[mark.id].anchor);
    await settle();await page.waitForFunction(()=>window.__tabletop.stats().screens.length===1);assert.equal((await stats()).decals.length,2);
    await action('present');await settle();await page.waitForFunction(()=>window.__tabletop.stats().screens.length===1&&window.__tabletop.stats().decals.length===2);
    await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/screens-decals-presentation.png'});
    await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});
