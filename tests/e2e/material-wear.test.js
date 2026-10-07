import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity } from '../../src/domain/documents.js';
import { reveal } from './controls.js';

const launch = () => chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

test('wear renders five styles over imported maps, confines regions, composes surfaces and releases GPU resources', { timeout: 120000 }, async t => {
  const app = express();
  app.get('/', (_req, res) => res.type('html').send('<link rel="icon" href="data:,"><style>body{margin:0;background:#222;color:#eee;font:16px sans-serif}#sheet{display:grid;grid-template-columns:repeat(3,400px)}figure{margin:0}img{width:400px;height:300px}figcaption{padding:8px}</style><div id="sheet"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/three', express.static(path.resolve('node_modules/three'))); app.use('/src', express.static(path.resolve('src')));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise(r => server.close(r)));
  const browser = await launch(); t.after(() => browser.close()); const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async () => {
    const THREE = await import('three'), { disposeObject } = await import('/src/render/asset-cache.js'), { createSurfaceLibrary, applySurfaceTextures } = await import('/src/render/surface-materials.js'), { wearDefaults } = await import('/src/domain/wear.js'), { coverageDefaults } = await import('/src/domain/materials.js');
    const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true }); renderer.setSize(512,384);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; const scene = new THREE.Scene(); scene.background = new THREE.Color('#222222');
    scene.add(new THREE.AmbientLight('#ffffff', 1)); const light = new THREE.DirectionalLight('#ffffff', 3); light.position.set(-3,6,8); scene.add(light);
    const camera = new THREE.OrthographicCamera(-3.5,4.5,3,-3,.1,30); camera.position.set(0,2,8); camera.lookAt(0,2,0);
    const warmup = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); scene.add(warmup); renderer.render(scene,camera); disposeObject(warmup); renderer.render(scene,camera);
    const baseline = {...renderer.info.memory}, library = createSurfaceLibrary(), variants = [];
    const texture = (normal=false) => { const data = new Uint8Array(8*8*4); for(let i=0;i<64;i++) { const c=(i+Math.floor(i/8))%2?145:210; data.set(normal?[125,140,254,255]:[c,c*.85,c*.65,255],i*4); } const map=new THREE.DataTexture(data,8,8); map.colorSpace=normal?THREE.NoColorSpace:THREE.SRGBColorSpace; map.needsUpdate=true; return map; };
    let root;
    function render(wear, extra={}) {
      if(root) disposeObject(root); root=new THREE.Group(); scene.add(root);
      const material = new THREE.MeshStandardMaterial({map:texture(),normalMap:texture(true),roughness:.55}); material.name='wood';
      const selected=new THREE.Mesh(new THREE.BoxGeometry(4,4,.5),material); selected.position.y=2; root.add(selected);
      const ironMaterial=new THREE.MeshStandardMaterial({color:'#b8bcc3',roughness:.35,metalness:.6}); ironMaterial.name='iron';
      const iron=new THREE.Mesh(new THREE.BoxGeometry(1,3,.5),ironMaterial); iron.position.set(3,2,0); root.add(iron);
      applySurfaceTextures(root,{kind:'prop',material:{color:'#ffffff',textureSlot:'wood',...extra,...(wear?{wear}:{})}},library);
      renderer.render(scene,camera); const pixels=new Uint8Array(512*384*4); renderer.getContext().readPixels(0,0,512,384,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);
      return {pixels,calls:renderer.info.render.calls,textures:renderer.info.memory.textures,image:renderer.domElement.toDataURL()};
    }
    const difference=(a,b,start=0,end=512) => {let changed=0; for(let y=0;y<384;y++) for(let x=start;x<end;x++) {const i=(y*512+x)*4;if(Math.max(...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])))>2) changed++;} return changed;};
    const original=render();
    function add(name,frame) {const f=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=frame.image;caption.textContent=name;f.append(img,caption);document.getElementById('sheet').append(f);}
    add('Original · texturas incorporadas',original);
    for(const type of ['grime','rust','moss','scorch','cracks']) {const frame=render({...wearDefaults(type),amount:.9,size:1.2});variants.push({type,changed:difference(original.pixels,frame.pixels),outside:difference(original.pixels,frame.pixels,390),calls:frame.calls,textures:frame.textures});add(type,frame);}
    const region=render({...wearDefaults('moss'),amount:1,size:.5,placement:'region',center:[.25,.35,1],radius:.3});add('Musgo · região localizada',region);
    const regionChanged=difference(original.pixels,region.pixels), regionOutside=difference(original.pixels,region.pixels,330);
    const zero=render({...wearDefaults(),amount:0}), disabled=render({...wearDefaults(),enabled:false});
    const stack={texture:'stone',coverage:{...coverageDefaults(),texture:'snow',amount:.3}};
    const plainStack=render(null,stack), wornStack=render(wearDefaults('rust'),stack);add('Pedra + cobertura + ferrugem',wornStack);
    const compositionChanged=difference(plainStack.pixels,wornStack.pixels);
    // Flat terrains have no Y extent: top/base must remain usable and region Y centered.
    disposeObject(root); root=null; camera.position.set(0,8,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);
    const flatFrame = wear => {
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(4,4).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:'#c8beb0'}));scene.add(plane);
      applySurfaceTextures(plane,{kind:'terrain',material:{color:'#c8beb0',...(wear?{wear}:{})}},library);renderer.render(scene,camera);
      const pixels=new Uint8Array(512*384*4);renderer.getContext().readPixels(0,0,512,384,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);disposeObject(plane);return pixels;
    };
    const flatOriginal=flatFrame(), flatChanges=['base','top','region'].map(placement=>difference(flatOriginal,flatFrame({...wearDefaults('moss'),placement})));
    library.dispose();renderer.render(scene,camera);const end={...renderer.info.memory};renderer.dispose();
    return {baseline,end,variants,originalCalls:original.calls,originalTextures:original.textures,regionChanged,regionOutside,zeroDifference:difference(original.pixels,zero.pixels),disabledDifference:difference(original.pixels,disabled.pixels),compositionChanged,flatChanges};
  });
  assert.deepEqual(errors,[]); assert.ok(result.variants.every(v=>v.changed>500 && v.outside===0 && v.calls===result.originalCalls && v.textures===result.originalTextures),JSON.stringify(result));
  assert.ok(result.regionChanged>300); assert.equal(result.regionOutside,0); assert.equal(result.zeroDifference,0); assert.equal(result.disabledDifference,0); assert.ok(result.compositionChanged>500); assert.ok(result.flatChanges.every(n=>n>500),JSON.stringify(result)); assert.deepEqual(result.end,result.baseline);
  await mkdir('test-results',{recursive:true}); await page.screenshot({path:'test-results/material-wear-sheet.png',fullPage:true}); console.log(JSON.stringify(result));
});

for(const mode of ['server','pages']) test(`wear controls, slots, clipboard, history, save and independent projector (${mode})`, {timeout:180000}, async t => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-wear-'));let server,browser;
  t.after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});});
  if(mode==='server')server=(await createApp({dataDir})).listen(0,'127.0.0.1');else{const app=express();app.use('/Tabletop',express.static(path.resolve('dist-pages')));server=app.listen(0,'127.0.0.1');}
  await once(server,'listening');browser=await launch();const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'}),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}${mode==='pages'?'/Tabletop/':'/'}?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
  const scene=createScene('Desgaste reutilizável'),table=createEntity('prop',{name:'Mesa envelhecida',assetRef:{id:'builtin-church-banquet-table',revision:1},position:[0,0,0]}),floor=createEntity('floor',{name:'Destino',width:8,length:8,position:[0,-.1,0]});
  for(const e of [table,floor])scene.layout.entities[e.id]=e;
  await page.locator('#document-json-file').setInputFiles({name:'wear.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(scene))});await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,scene.id);
  const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const select=async id=>{if(await page.locator('[data-action="sidebar-toggle"]').getAttribute('aria-expanded')==='false')await action('sidebar-toggle');await page.locator('[data-tab="scene"]').click();await(await reveal(page.locator(`[data-select="${id}"]`))).click();};
  const option=async(field,value)=>{await(await reveal(page.locator(`[data-field="${field}"]`))).selectOption(value);};
  const number=async(field,value)=>{const input=await reveal(page.locator(`[data-field="${field}"]`));await input.fill(String(value));await input.press('Tab');};
  const material=async id=>page.evaluate(id=>window.__tabletop.snapshot().layout.entities[id].material,id);
  await select(table.id);await page.waitForFunction(()=>!!document.querySelector('[data-field="material-textureSlot"] option[value="wood"]'));await option('material-textureSlot','wood');
  await option('wear-type','grime');await option('wear-placement','region');await number('wear-center-0',25);await number('wear-radius',60);await number('wear-amount',58);await number('wear-size',.45);await number('wear-seed',175);
  let edited=await material(table.id);assert.equal(edited.wear.amount,.58);assert.equal(edited.wear.seed,175);assert.deepEqual(edited.wear.center,[.25,.5,.5]);
  await page.waitForFunction(id=>window.__tabletop.stats().wearMaterials.filter(m=>m.id===id).every(m=>m.slot==='wood')&&window.__tabletop.stats().wearMaterials.some(m=>m.id===id&&m.seed===175),table.id);
  await option('wear-type','rust');assert.equal((await material(table.id)).wear.placement,'region');assert.equal((await material(table.id)).wear.amount,.58);
  await(await reveal(page.locator('[data-field="wear-enabled"]'))).uncheck();await page.waitForFunction(id=>!window.__tabletop.stats().wearMaterials.some(m=>m.id===id),table.id);await action('undo');await action('material-copy');
  const [projector]=await Promise.all([page.waitForEvent('popup'),action('presentation-window')]);projector.setDefaultTimeout(30000);projector.on('pageerror',e=>errors.push(e.message));await projector.waitForFunction(id=>window.__tabletop?.stats().wearMaterials.some(m=>m.id===id&&m.type==='rust'),table.id);const camera=await projector.evaluate(()=>window.__tabletop.camera());await page.bringToFront();
  await select(floor.id);await action('material-paste');assert.deepEqual((await material(floor.id)).wear,(await material(table.id)).wear);await action('undo');assert.equal((await material(floor.id)).wear,undefined);await action('redo');
  await projector.waitForFunction(id=>window.__tabletop.stats().wearMaterials.some(m=>m.id===id&&m.amount===.58),floor.id);assert.deepEqual(await projector.evaluate(()=>window.__tabletop.camera()),camera);
  await option('wear-type','none');assert.equal((await material(floor.id)).wear,null);await action('undo');await projector.close();
  await action('save');await page.waitForFunction(()=>!document.querySelector('#save-status').classList.contains('unsaved')&&!document.querySelector('[data-action="save"]').disabled);const saved=await page.evaluate(()=>window.__tabletop.snapshot().layout);await page.reload();await page.waitForFunction(id=>window.__tabletop?.snapshot().id===id,scene.id);assert.deepEqual(await page.evaluate(()=>window.__tabletop.snapshot().layout),saved);
  await select(table.id);await(await reveal(page.locator('[data-field="wear-placement"]'))).scrollIntoViewIfNeeded();await mkdir('test-results',{recursive:true});await page.screenshot({path:`test-results/material-wear-${mode}.png`});
  await page.setViewportSize({width:430,height:900});await select(table.id);const amount=await reveal(page.locator('[data-field="wear-amount"]'));await amount.scrollIntoViewIfNeeded();
  assert.equal(await page.locator('[data-texture-options="material-wear"]').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);await page.screenshot({path:`test-results/material-wear-${mode}-mobile.png`});assert.deepEqual(errors,[]);
});
