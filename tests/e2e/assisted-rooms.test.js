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

test('the assistant reads what was placed by hand, completes around it and changes the state of the place', {timeout:150_000}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-assist-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click(),snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
    const props=async()=>Object.values((await snapshot()).layout.entities).filter(e=>e.kind==='prop'),reading=()=>page.locator('.assistant-reading');
    const place=async(search,asset,position)=>{await page.locator('[data-tab="assets"]').click();await page.getByLabel('Buscar assets',{exact:true}).fill(search);await page.locator(`[data-asset="${asset}"]`).click();const p=await page.evaluate(v=>window.__tabletop.project(v),position);await page.mouse.click(p.x,p.y);await page.waitForFunction(id=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.assetRef?.id===id),asset);await page.keyboard.press('Escape');};
    await (await reveal(page.locator('#quick-form button[type=submit]'))).click();await action('accept-proposal');
    await reveal(page.locator('[data-field="smart-template"]'));assert.match(await reading().textContent(),/Cômodo vazio/);
    // One stove by hand is enough for the assistant to follow.
    await place('fogão','builtin-stove',[-1.5,0,-1.5]);await page.locator('[data-tab="build"]').click();
    const stove=(await props())[0];
    await page.waitForFunction(()=>document.querySelector('[data-field="smart-template"]')?.value==='kitchen');
    assert.match(await reading().textContent(),/parece cozinha/);assert.match(await reading().textContent(),/falta: .*pia/);
    await action('smart-preview');await action('accept-proposal');
    let now=await props();assert.equal(now.filter(e=>e.assetRef.id==='builtin-stove').length,1,'the stove placed by hand is used, not duplicated');
    assert.deepEqual(now.find(e=>e.id===stove.id).transform,stove.transform);assert.ok(now.some(e=>e.assetRef.id==='builtin-sink'));
    // Light comes from the room's own objects plus fixtures; the bare point of the quick room leaves.
    const points=async()=>Object.values((await snapshot()).look?.lights??(await snapshot()).defaultLook.lights).filter(l=>l.type==='point').length;assert.ok(await points()>=1);
    assert.match(await (await reveal(page.locator('[data-field="ambience-mood"]'))).locator('option').first().textContent(),/Automática · aconchegante/);
    await action('light-preview');await action('accept-proposal');assert.equal(await points(),0);
    assert.ok((await props()).some(e=>e.tags.includes('luminária-assistida')&&e.illumination?.enabled));
    await action('details-preview');await action('accept-proposal');assert.ok((await props()).some(e=>e.tags.includes('detalhe')));
    const suggestion=page.locator('.assistant-suggestion [data-environment="tavern"]');await (await reveal(suggestion)).click();
    await page.waitForFunction(()=>window.__tabletop.snapshot().sourceEnvironment?.id==='tavern');await page.locator('[data-tab="build"]').click();assert.equal(await page.locator('.assistant-suggestion [data-environment]').count(),0);
    // A state works on that same room and leaves with "Arrumado".
    now=await props();const furnished=now.map(e=>e.id).sort();
    await (await reveal(page.locator('.choice-field:has([data-field="state-state"]) [data-choice="ritual"]'))).click();await action('state-preview');await action('accept-proposal');
    now=await props();assert.ok(now.some(e=>e.assetRef.id==='builtin-ritual-circle'));for(const key of furnished)assert.ok(now.some(e=>e.id===key));
    assert.equal((await snapshot()).layout.entities[stove.surfaceId].material.wear.type,'scorch');
    await (await reveal(page.locator('.choice-field:has([data-field="state-state"]) [data-choice="tidy"]'))).click();assert.equal(await page.locator('[data-field="state-intensity"]').count(),0);
    await action('state-preview');await action('accept-proposal');
    assert.deepEqual((await props()).map(e=>e.id).sort(),furnished);assert.equal((await snapshot()).layout.entities[stove.surfaceId].material.wear??null,null);
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});

test('a building is raised from an outline drawn by the person and each room stays with the room assistant', {timeout:150_000}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-building-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click(),snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
    const of=async kind=>Object.values((await snapshot()).layout.entities).filter(e=>e.kind===kind),set=async(field,value)=>{const node=await reveal(page.locator(`[data-field="${field}"]`));await node.fill(String(value));await node.press('Tab');};
    // The person draws the outline: a plain floor, resized.
    await action('floor-add');const outline=(await of('floor'))[0];await set('width',16);await set('length',9);
    await page.locator('[data-tab="build"]').click();await (await reveal(page.locator('[data-field="building-floorId"]'))).selectOption(outline.id);
    assert.equal(await page.locator('[data-field="building-width"]').count(),0,'measures come from the outline');
    assert.equal(await page.locator('[data-field="building-hub"]').inputValue(),'living');assert.ok((await page.locator('[data-build-section="building"] .building-rooms button').allTextContents()).some(text=>text.startsWith('Cozinha')));
    await (await reveal(page.locator('.choice-field:has([data-field="building-type"]) [data-choice="police"]'))).click();
    assert.equal(await page.locator('[data-field="building-hub"]').inputValue(),'reception');
    await action('building-preview');assert.equal((await of('floor')).length,1,'a preview builds nothing');await action('accept-proposal');
    const floors=await of('floor');assert.ok(floors.length>=5);assert.ok(!floors.some(f=>f.id===outline.id),'the outline became the rooms');
    assert.ok(floors.some(f=>f.name==='Recepção'));assert.ok((await of('door')).length>=floors.length-1);assert.ok((await of('prop')).length>20);
    // Selecting a room of the building brings the room assistant to it, aware of the whole.
    const cell=floors.find(f=>f.name.startsWith('Cela'));await page.locator('[data-tab="elements"]').click();await (await reveal(page.locator(`[data-select="${cell.id}"]`))).click();await page.locator('[data-tab="build"]').click();
    await reveal(page.locator('[data-field="smart-template"]'));assert.equal(await page.locator('[data-field="smart-floor"]').inputValue(),cell.id);
    assert.match(await page.locator('.assistant-reading').textContent(),/forma delegacia de \d+ cômodos/);
    await action('undo');assert.deepEqual((await of('floor')).map(f=>f.id),[outline.id]);
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});

test('what is already built is completed: a room is added to a room, and a started shell becomes a house around its furniture', {timeout:150_000}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-complete-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click(),snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
    const of=async kind=>Object.values((await snapshot()).layout.entities).filter(e=>e.kind===kind),set=async(field,value)=>{const node=await reveal(page.locator(`[data-field="${field}"]`));await node.fill(String(value));await node.press('Tab');};
    const place=async(search,asset,position)=>{await page.locator('[data-tab="assets"]').click();await page.getByLabel('Buscar assets',{exact:true}).fill(search);await page.locator(`[data-asset="${asset}"]`).click();const p=await page.evaluate(v=>window.__tabletop.project(v),position);await page.mouse.click(p.x,p.y);await page.waitForFunction(id=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.assetRef?.id===id),asset);await page.keyboard.press('Escape');};
    // A shell made by hand: a large room with its own door, and a stove where the kitchen should be.
    await set('room-width',14);await set('room-length',8);await (await reveal(page.locator('#quick-form button[type=submit]'))).click();await action('accept-proposal');
    const shell=(await of('wall')).map(w=>w.id),outline=(await of('floor'))[0],entry=(await of('door'))[0];
    await action('top');await action('frame');await page.waitForTimeout(600);await place('fogão','builtin-stove',[5.5,0,-3]);const stove=(await of('prop'))[0];
    await page.locator('[data-tab="build"]').click();await (await reveal(page.locator('[data-field="building-floorId"]'))).selectOption(outline.id);
    await action('building-preview');await action('accept-proposal');
    let entities=(await snapshot()).layout.entities;const kitchen=entities[entities[stove.id].surfaceId];
    assert.match(kitchen.name,/Cozinha/,'the plan put the kitchen where the stove was');assert.deepEqual(entities[stove.id].transform,stove.transform);
    for(const key of shell)assert.ok(entities[key],'the walls made by hand stand');assert.ok(entities[entry.id]);
    assert.equal((await of('door')).filter(d=>d.name==='Entrada').length,0);assert.equal((await of('prop')).filter(e=>e.assetRef.id==='builtin-stove').length,1);
    assert.ok((await of('floor')).length>=4);
    // The assistant now knows the house and offers the room it lacks, or any other.
    const rooms=(await of('floor')).length;await (await reveal(page.locator('[data-field="building-addTemplate"]'))).selectOption('garage');
    // The places it could go are drawn on the plan of the house; the second one is chosen.
    const spots=page.locator('[data-build-section="building"] .building-sketch.spots .spot');await reveal(spots.first());assert.ok(await spots.count()>=2);
    await spots.nth(1).click();await action('accept-proposal');
    const garage=(await of('floor')).find(f=>f.name==='Garagem');assert.ok(garage);assert.equal((await of('floor')).length,rooms+1);
    assert.ok((await of('door')).some(d=>d.name==='Porta — Garagem'));
    await action('undo');await action('undo');assert.deepEqual((await of('floor')).map(f=>f.id),[outline.id]);assert.equal((await snapshot()).layout.entities[stove.id].surfaceId,outline.id);
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});

test('the outline is drawn in the scene, the rooms are chosen by the person and the preview follows the panel', {timeout:150_000}, async () => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-draw-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];page.setDefaultTimeout(30_000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
    const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click(),snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
    const of=async kind=>Object.values((await snapshot()).layout.entities).filter(e=>e.kind===kind),project=p=>page.evaluate(v=>window.__tabletop.project(v),p);
    const section=page.locator('[data-build-section="building"]'),chips=()=>section.locator('.building-rooms button').allTextContents(),bar=page.locator('#proposal-bar');
    await action('top');await page.waitForTimeout(500);
    // A room already stands elsewhere and its floor is the active surface: the outline can still be drawn on open ground.
    await (await reveal(page.locator('#quick-form button[type=submit]'))).click();await action('accept-proposal');const first0=(await of('floor'))[0];
    await page.evaluate(()=>{});await page.locator('[data-tab="elements"]').click();await (await reveal(page.locator(`[data-select="${first0.id}"]`))).click();await page.locator('[data-tab="build"]').click();
    // Drag on the ground: that rectangle is the building, and the plan shows at once.
    const canvas=await page.locator('#viewport canvas').boundingBox();await page.mouse.move(canvas.x+canvas.width/2,canvas.y+canvas.height/2);for(let i=0;i<6;i++){await page.mouse.wheel(0,400);await page.waitForTimeout(80);}await page.waitForTimeout(500);
    await action('building-draw');const a=await project([-7,0,-11.5]),b=await project([7,0,-3.5]);assert.ok(a.visible&&b.visible,'both corners are on screen '+JSON.stringify([a,b,canvas]));
    await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move((a.x+b.x)/2,(a.y+b.y)/2,{steps:4});await page.mouse.move(b.x,b.y,{steps:4});await page.mouse.up();
    await bar.locator('[data-action="accept-proposal"]').waitFor();assert.match(await bar.textContent(),/Construir casa/);assert.equal((await of('floor')).length,1);
    const width=Number(await (await reveal(page.locator('[data-field="building-width"]'))).inputValue()),length=Number(await page.locator('[data-field="building-length"]').inputValue());
    assert.ok(Math.abs(width-14)<1.2&&Math.abs(length-8)<1.2,`${width} × ${length}`);assert.equal(await section.locator('.building-sketch:not(.spots) > *').count(),(await chips()).length+2);
    // The list of rooms is the person's: out with a bedroom, in with a ritual room, a bar as the way in.
    const before=await chips(),bedroom=before.findIndex(text=>text.startsWith('Quarto'));assert.ok(bedroom>=0);
    await section.locator('.building-rooms button').nth(bedroom).click();assert.equal((await chips()).length,before.length-1);
    await (await reveal(page.locator('[data-field="building-roomAdd"]'))).selectOption('ritual');await (await reveal(page.locator('[data-field="building-hub"]'))).selectOption('bar');
    assert.ok((await chips()).some(text=>text.startsWith('Sala de ritual')));
    // Two clicks on the plan swap two rooms, sizes following the rooms.
    const cell=i=>section.locator('.building-sketch:not(.spots) > button').nth(i),first=await cell(1).getAttribute('title'),second=await cell(2).getAttribute('title');
    await cell(1).dragTo(cell(2));
    assert.equal(await cell(1).getAttribute('title'),second);assert.equal(await cell(2).getAttribute('title'),first);
    // Two clicks do the same, for keyboard and touch.
    await cell(1).click();assert.match(await section.textContent(),/troca de lugar com/);await cell(2).click();assert.equal(await cell(1).getAttribute('title'),first);
    // A room too many is offered a bigger outline instead of being dropped silently.
    for(const extra of ['garage','ward','lab'])await (await reveal(page.locator('[data-field="building-roomAdd"]'))).selectOption(extra);
    assert.ok(await section.locator('.building-rooms button.dropped').count()>=1);const grow=section.locator('[data-action="building-expand"]');assert.match(await grow.textContent(),/Ampliar o contorno/);
    await grow.click();await bar.locator('[data-action="accept-proposal"]').waitFor();assert.equal(await section.locator('.building-rooms button.dropped').count(),0);assert.ok(Number(await page.locator('[data-field="building-width"]').inputValue())>width);
    for(let i=0;i<3;i++)await section.locator('.building-rooms button').last().click();await page.locator('[data-field="building-width"]').fill(String(width));await page.locator('[data-field="building-width"]').press('Tab');
    // The preview stayed open through every change and is accepted as it stands.
    await bar.locator('[data-action="accept-proposal"]').waitFor();await action('accept-proposal');
    const names=(await of('floor')).map(f=>f.name);assert.ok(names.includes('Bar'));assert.ok(names.includes('Sala de ritual'));assert.equal(names.filter(n=>n.startsWith('Quarto')).length,before.filter(t=>t.startsWith('Quarto')).length-1);
    // From above the roof is lifted so the rooms can be seen and picked; the button brings it back.
    const roofs=page.locator('[data-action="roofs"]'),hidden=()=>page.evaluate(()=>window.__tabletop.stats().hiddenRoofs??null);
    assert.equal(await roofs.getAttribute('aria-pressed'),'false');await roofs.click();assert.equal(await roofs.getAttribute('aria-pressed'),'true');await action('perspective');assert.equal(await roofs.getAttribute('aria-pressed'),'true');
    // It stands where it was drawn.
    const xs=(await of('floor')).flatMap(f=>[f.transform.position[0]]),zs=(await of('floor')).map(f=>f.transform.position[2]);const mine=(await of('floor')).filter(f=>f.id!==first0.id).map(f=>f.transform.position);assert.ok(mine.every(([x,,z])=>x>-7.5&&x<7.5&&z>-12&&z<-3),'on the open ground where it was drawn, away from the first room');
    assert.deepEqual(errors,[]);
  } finally { await browser?.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true}); }
});
