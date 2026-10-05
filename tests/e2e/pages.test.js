import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp,rm,mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { reveal } from './controls.js';

const launchOptions={executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],viewport:{width:1600,height:1000}};
async function staticServer() {
  const app=express();
  const fixture='<link rel="icon" href="data:,"><script type="importmap">{"imports":{"three":"/Tabletop/three/build/three.module.js","three/addons/":"/Tabletop/three/examples/jsm/"}}</script>';
  app.get('/Tabletop/repository-test.html',(_req,res)=>res.type('html').send(fixture));
  app.use('/Tabletop/src',express.static(path.resolve('src')));app.use('/Tabletop/three',express.static(path.resolve('node_modules/three')));
  for(const base of ['/Tabletop','/OutraMesa','/'])app.use(base,express.static(path.resolve('dist-pages')));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');return server;
}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=','base64');
function staticGLB() {
  const binary=Buffer.alloc(36);[-.5,0,0,.5,0,0,0,1,0].forEach((v,i)=>binary.writeFloatLE(v,i*4));
  const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.5,0,0],max:[.5,1,0]}]}));
  const padded=Buffer.alloc(Math.ceil(json.length/4)*4,0x20);json.copy(padded);
  const header=Buffer.alloc(20),chunk=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+8+binary.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);chunk.writeUInt32LE(binary.length);chunk.writeUInt32LE(0x004e4942,4);return Buffer.concat([header,padded,chunk,binary]);
}

test('GitHub Pages works under a repository path without an API: catalog, imports, save/reopen and projector',{timeout:180_000},async t=>{
  const server=await staticServer(),profile=await mkdtemp(path.join(os.tmpdir(),'tabletop-pages-'));let context;
  t.after(async()=>{await context?.close();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});});
  const origin=`http://127.0.0.1:${server.address().port}`, url=`${origin}/Tabletop/?diagnostics`,errors=[],badRequests=[];
  async function open() {context=await chromium.launchPersistentContext(profile,launchOptions);const page=await context.newPage();page.setDefaultTimeout(20_000);page.on('dialog',d=>d.accept(d.type()==='prompt'?d.defaultValue():undefined));context.on('page',track);track(page);await page.goto(url);await page.waitForFunction(()=>!!window.__tabletop);return page;}
  function track(page) {page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{const u=new URL(r.url());if(['http:','https:'].includes(u.protocol)&&u.origin===origin&&(u.pathname.includes('/api/')||!u.pathname.startsWith('/Tabletop/')))badRequests.push(u.pathname);});}
  let page=await open();
  const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
  const world=async position=>{const p=await page.evaluate(v=>window.__tabletop.project(v),position);await page.mouse.click(p.x,p.y);};
  assert.match(await page.locator('.sidebar-footer').textContent(),/navegador/);assert.equal(await page.locator('.brand').getAttribute('href'),`${origin}/Tabletop/`);
  await action('floor-add');let floor=Object.values((await snapshot()).layout.entities).find(e=>e.kind==='floor');assert.ok(floor);
  await page.locator('[data-field="material-texture"]').selectOption('wood');await (await reveal(page.locator('[data-field="material-woodBoards"]'))).fill('8');await page.locator('[data-field="material-woodBoards"]').press('Tab');
  await page.locator('[data-tab="assets"]').click();
  await page.waitForFunction(()=>document.querySelector('#asset-result-count').textContent.includes('191'));
  await page.locator('[data-asset="builtin-desk"] img').waitFor();assert.equal(await page.locator('[data-asset="builtin-desk"] img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
  await page.locator('[data-asset="builtin-desk"]').click();await world([0,0,0]);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.assetRef?.id==='builtin-desk'));
  await page.locator('[data-tab=assets]').click();await page.locator('[data-library-favorite="builtin-desk"]').click();await page.waitForFunction(()=>document.querySelector('[data-library-favorite="builtin-desk"]').getAttribute('aria-pressed')==='true');
  await page.getByLabel('Buscar assets',{exact:true}).fill('paredão natural');await page.locator('[data-asset="builtin-mountain-cliff-face"]').click();await world([0,0,-1]);
  await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.assetRef?.id==='builtin-mountain-cliff-face'));
  const geological=Object.values((await snapshot()).layout.entities).find(e=>e.assetRef?.id==='builtin-mountain-cliff-face');
  await page.waitForFunction(id=>window.__tabletop.stats().rockGeometries.some(g=>g.id===id),geological.id);
  const seedField=await reveal(page.locator('[data-field="rock-seed"]'));await seedField.fill('123');await seedField.press('Tab');
  assert.equal((await snapshot()).layout.entities[geological.id].rockShape.seed,123);
  const ledgeField=await reveal(page.locator('[data-field="rock-overhang"]'));await ledgeField.fill('.8');await ledgeField.press('Tab');assert.equal((await snapshot()).layout.entities[geological.id].rockShape.overhang,.8);
  await action('rock-sculpt');await (await reveal(page.locator('[data-field="brush-mode"]'))).selectOption('push');await world([0,3,0]);await page.waitForFunction(id=>!!window.__tabletop.snapshot().layout.entities[id].rockSculpt?.stamps.length,geological.id);await action('terrain-stop');
  await page.locator('[data-tab="scene"]').click();await page.locator(`[data-select="${floor.id}"]`).click();
  await page.locator('#asset-file').setInputFiles({name:'Retrato.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.getElementById('gesture-hint').textContent.includes('Clique no piso'));await world([1,0,1]);await page.waitForFunction(()=>Object.keys(window.__tabletop.snapshot().tokens).length===1);
  await page.locator('#asset-file').setInputFiles({name:'Marcador.glb',mimeType:'model/gltf-binary',buffer:staticGLB()});await page.waitForFunction(()=>document.getElementById('gesture-hint').textContent.includes('Clique no piso'));await world([-1,0,1]);await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.name==='Marcador.glb'));
  // The landscape tools and their new records must also work in a static project path.
  await page.locator('[data-tab="build"]').click();await action('water-add');
  await (await reveal(page.locator('[data-field="water-state"]'))).selectOption('ice');
  const ice=Object.values((await snapshot()).layout.entities).find(e=>e.kind==='water');
  const depth=await reveal(page.locator('[data-field="depth"]'));await depth.fill('.55');await depth.press('Tab');
  const coverage=await reveal(page.locator('[data-field="coverage-texture"]'));await coverage.selectOption('snow');
  const thickness=await reveal(page.locator('[data-field="coverage-physicalThickness"]'));await thickness.fill('.12');await thickness.press('Tab');
  assert.equal((await snapshot()).layout.entities[ice.id].material.coverage.physicalThickness,.12);
  await page.locator('[data-tab="assets"]').click();await page.getByLabel('Buscar assets',{exact:true}).fill('abeto alpino');await page.locator('[data-asset="builtin-alpine-fir"]').click();await world([-2,0,2]);
  await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.assetRef?.id==='builtin-alpine-fir'));
  const variation=await reveal(page.locator('[data-field="vegetationSeed"]'));await variation.fill('707');await variation.press('Tab');
  await page.waitForFunction(()=>window.__tabletop.stats().surfaceMaterials.some(m=>m.texture==='bark'));
  await page.locator('[data-tab="scene"]').click();await action('environment-save');await page.waitForFunction(()=>document.querySelector('[data-field="environment-library"]').options.length>1);
  await action('save');await page.waitForFunction(()=>window.__tabletop.snapshot().revision===1&&!document.getElementById('save-status').classList.contains('unsaved')&&!document.getElementById('save-scene').disabled);const saved=await snapshot();assert.match(await page.locator('#save-status').textContent(),/navegador/);
  await action('open');await page.locator('[data-dialog-tab="maps"]').click();await action('save-current-as-map');await page.waitForSelector('[data-open-map]');await action('close-dialog');
  const [projector]=await Promise.all([page.waitForEvent('popup'),action('presentation-window')]);await projector.waitForFunction(()=>window.__tabletop&&document.getElementById('presentation-message').hidden);assert.equal(new URL(projector.url()).pathname,'/Tabletop/');
  const camera=await projector.evaluate(()=>window.__tabletop.camera());await page.bringToFront();await page.locator(`[data-select="${floor.id}"]`).click();await (await reveal(page.locator('[data-field="material-woodBoards"]'))).fill('10');await page.locator('[data-field="material-woodBoards"]').press('Tab');await projector.waitForFunction(id=>window.__tabletop.stats().surfaceMaterials.some(m=>m.id===id&&m.options.woodBoards===10),floor.id);assert.deepEqual(await projector.evaluate(()=>window.__tabletop.camera()),camera);await action('undo');await action('save');await page.waitForFunction(()=>!document.getElementById('save-scene').disabled&&!document.getElementById('save-status').classList.contains('unsaved'));
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/github-pages.png'});
  await context.close();context=null;page=await open();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,saved.id);assert.deepEqual((await snapshot()).layout,saved.layout);assert.deepEqual((await snapshot()).actors,saved.actors);await page.waitForFunction(()=>window.__tabletop.stats().triangles>0 && window.__tabletop.stats().textures>=3);
  await page.locator('[data-tab="assets"]').click();await page.getByLabel('Somente favoritos',{exact:true}).check();assert.equal(await page.locator('[data-asset="builtin-desk"]').count(),1);await page.locator('[data-library-clear]').click();await page.getByLabel('Buscar assets',{exact:true}).fill('Marcador.glb');assert.equal(await page.locator('[data-asset]').count(),1);
  await page.locator('[data-tab="scene"]').click();assert.ok(await page.locator('[data-field="environment-library"] option').count()>1);
  await action('open');await page.locator('[data-dialog-tab="maps"]').click();assert.equal(await page.locator('[data-open-map]').count(),1);await action('close-dialog');
  assert.deepEqual(badRequests,[],'all app and asset requests stay within the published project path');
  // Another project on the same host has an independent library and recovery namespace.
  await page.goto(`${origin}/OutraMesa/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);assert.equal(Object.keys((await snapshot()).layout.entities).length,0);assert.equal(await page.locator('#recovery-dialog').evaluate(d=>d.open),false);
  await page.goto(`${origin}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);assert.equal(Object.keys((await snapshot()).layout.entities).length,0);
  // Root/custom-domain requests are intentional only after the project-path assertions.
  assert.deepEqual(errors,[]);assert.ok(badRequests.every(p=>p==='/'||p==='/favicon.svg'||p.startsWith('/assets/')||p.startsWith('/OutraMesa/')));assert.ok(!badRequests.some(p=>p.includes('/api/')));
});

test('browser repository validates documents/assets, serializes conflicts and aborts failed writes atomically',{timeout:60_000},async t=>{
  const server=await staticServer(),browser=await chromium.launch(launchOptions),page=await browser.newPage();
  t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});await page.goto(`http://127.0.0.1:${server.address().port}/Tabletop/repository-test.html`);
  const results=await page.evaluate(async pngBase64=>{
    const {createBrowserRepository}=await import('/Tabletop/src/data/browser-repository.js'),{createScene,createEntity,createMapFromScene}=await import('/Tabletop/src/domain/documents.js'),{createEnvironmentFromLook}=await import('/Tabletop/src/domain/environments.js');
    const databaseName='test-pages-'+crypto.randomUUID(),a=createBrowserRepository({databaseName}),b=createBrowserRepository({databaseName});
    const scene=createScene('Concorrência');scene.layout.entities['floor-test']=createEntity('floor',{id:'floor-test'});
    const saved=await a.create(scene),statuses=[];
    const rejection=async fn=>{try {await fn();return 'accepted';}catch(e){return e.status??e.name;}};
    statuses.push(await rejection(()=>b.create(saved)));
    const concurrent=await Promise.allSettled([a.save({...saved,name:'A'}),b.save({...saved,name:'B'})]);const current=await a.read(saved.id);statuses.push(await rejection(()=>a.remove(saved)));
    const copy=await a.duplicate(current),map=await a.create(createMapFromScene(current)),environment=await a.create(createEnvironmentFromLook(current));
    const before=await a.read(saved.id);statuses.push(await rejection(()=>a.save({...before,layout:{...before.layout,grid:{...before.layout.grid,cellSize:NaN}}})));
    const unavailable=createScene();const missing=createEntity('prop',{assetRef:{id:'missing',revision:1}});unavailable.layout.entities[missing.id]=missing;statuses.push(await rejection(()=>a.create(unavailable)));
    // A quota failure after the backup request must abort both writes.
    const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='documents')throw new DOMException('Sem espaço','QuotaExceededError');return put.apply(this,args);};
    let quota;try {quota=await rejection(()=>a.save({...before,name:'Não salvar'}));}finally{IDBObjectStore.prototype.put=put;}
    const after=await a.read(saved.id);
    const bytes=Uint8Array.from(atob(pngBase64),c=>c.charCodeAt(0)),file=new File([bytes],'retrato.png',{type:'image/png'}),imported=await a.importAsset(file);
    const blobFetch=await fetch(imported.url);const blobSize=(await blobFetch.blob()).size;
    const builtin=(await a.assets()).find(asset=>asset.id==='builtin-desk');const edits=await Promise.allSettled([a.updateAssetMetadata(builtin,{favorite:true,tags:['Mesa','mesa','Campanha']}),b.updateAssetMetadata(builtin,{favorite:false})]);
    const updated=(await a.assets()).find(asset=>asset.id===builtin.id);statuses.push(await rejection(()=>a.updateAssetMetadata(updated,{url:'/fake'})));
    statuses.push(await rejection(()=>a.importAsset(new File(['bad'],'asset.exe'))));statuses.push(await rejection(()=>a.importAsset(new File(['bad'],'asset.glb'))));
    let revision=after;for(let i=0;i<7;i++)revision=await a.save({...revision,name:`Revisão ${i}`});
    const backups=await new Promise((resolve,reject)=>{const request=indexedDB.open(databaseName,1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('backups'),r=tx.objectStore('backups').getAll();r.onsuccess=()=>resolve(r.result);tx.oncomplete=()=>db.close();};request.onerror=()=>reject(request.error);});
    await a.remove(copy);const scenes=await a.list('scene'),maps=await a.list('map'),environments=await a.list('environment');
    const reloaded=createBrowserRepository({databaseName}),assetAgain=(await reloaded.assets()).find(asset=>asset.id===imported.id);const reloadedBlob=(await(await fetch(assetAgain.url)).blob()).size;
    const result={statuses,concurrent:concurrent.map(r=>r.status==='fulfilled'?'saved':r.reason.status),metadataConflicts:edits.map(r=>r.status==='fulfilled'?'saved':r.reason.status),before,after,quota,blobSize,reloadedBlob,updated,counts:[scenes.length,maps.length,environments.length],backups:backups.length,allBuiltins:(await a.assets()).filter(asset=>asset.id.startsWith('builtin-')).length};
    a.dispose();b.dispose();reloaded.dispose();return result;
  },png.toString('base64'));
  assert.deepEqual(results.concurrent.sort(),[409,'saved'].sort());assert.deepEqual(results.metadataConflicts.sort(),[409,'saved'].sort());assert.deepEqual(results.before,results.after);assert.equal(results.quota,'QuotaExceededError');assert.equal(results.statuses[0],409);assert.equal(results.statuses[1],409);assert.ok(results.statuses.slice(2).every(s=>s!=='accepted'));assert.equal(results.blobSize,png.length);assert.equal(results.reloadedBlob,png.length);assert.equal(results.updated.metadataRevision,1);assert.deepEqual(results.counts,[1,1,1]);assert.ok(results.backups<=5);assert.equal(results.allBuiltins,191);
});
