import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity } from '../../src/domain/documents.js';
import { LOCAL_EFFECT_DEFAULTS } from '../../src/domain/materials.js';
import { reveal } from './controls.js';

const launch=()=>chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

test('textured materials, terrain layers and local fire/smoke render through UI, survive restart and keep projector camera independent',{timeout:240_000},async t=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-materials-'));let server,browser,page;const errors=[];
  t.after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});});
  async function listen(){server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');}
  const origin=()=>`http://127.0.0.1:${server.address().port}`;
  async function open(){browser=await launch();page=await browser.newPage({viewport:{width:1600,height:1000}});page.setDefaultTimeout(25_000);page.on('dialog',dialog=>dialog.accept());page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(`${origin()}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);}
  const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const select=async(name,value)=>(await reveal(page.locator(`[data-field="${name}"]`).first())).selectOption(value);
  const field=async(name,value)=>{const node=await reveal(page.locator(`[data-field="${name}"]`).first());await node.fill(String(value));await node.press('Tab');};
  const check=async(name,value=true)=>(await reveal(page.locator(`[data-field="${name}"]`).first())).setChecked(value);
  const snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
  const stats=()=>page.evaluate(()=>window.__tabletop.stats());
  await listen();
  const scene=createScene('Materiais e fogueiras'),floor=createEntity('floor',{width:8,length:8}),prop=createEntity('prop',{assetRef:{id:'builtin-wardrobe',revision:1},position:[2,0,0]}),terrain=createEntity('terrain',{position:[-10,0,0],width:8,length:8,segments:8});
  for(const entity of [floor,prop,terrain])scene.layout.entities[entity.id]=entity;
  assert.equal((await fetch(`${origin()}/api/tabletop/scenes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:scene})})).status,201);
  await open();await action('open');await page.locator(`[data-open="${scene.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,scene.id);
  await page.locator('[data-tab="scene"]').click();await page.locator(`[data-select="${floor.id}"]`).click();
  await select('material-texture','wood');await field('material-textureSize',1.5);await field('material-relief',.05);
  await page.waitForFunction(id=>window.__tabletop.stats().surfaceMaterials.some(m=>m.id===id && m.texture==='wood' && m.size===1.5),floor.id);
  await action('undo');assert.equal((await snapshot()).layout.entities[floor.id].material.relief,.035);await action('redo');
  await page.locator(`[data-select="${prop.id}"]`).click();await page.waitForFunction(()=>document.querySelector('[data-field="material-textureSlot"]').options.length>1);
  await select('material-textureSlot','wood');await select('material-texture','wood');
  const materials=(await stats()).surfaceMaterials.filter(m=>m.id===prop.id);assert.ok(materials.length);assert.ok(materials.every(m=>m.slot==='wood'));
  await page.locator(`[data-select="${terrain.id}"]`).click();await select('terrain-layer-texture','grass');await field('terrain-layer-textureSize',.75);
  assert.equal((await snapshot()).layout.entities[terrain.id].paintLayers[0].texture,'grass');
  await page.locator(`[data-select="${floor.id}"]`).click();
  await page.locator('[data-tab="build"]').click();await action('fire-place');
  let point=await page.evaluate(()=>window.__tabletop.project([0,0,0]));await page.mouse.click(point.x,point.y);
  await page.waitForSelector('[data-field="effect-type"]');const fire=Object.values((await snapshot()).layout.entities).find(e=>e.localEffect?.type==='fire');assert.ok(fire);
  await field('effect-size-1',2);await field('effect-lightIntensity',35);await field('effect-count',64);
  await page.waitForFunction(()=>window.__tabletop.stats().animatedLocalEffects);
  const stable=await snapshot(),version=await page.evaluate(()=>window.__tabletop.editVersion()),clock=(await stats()).effectTime;
  await page.waitForFunction(time=>window.__tabletop.stats().effectTime>time+.1,clock);assert.deepEqual(await snapshot(),stable);assert.equal(await page.evaluate(()=>window.__tabletop.editVersion()),version);
  await action('object-duplicate');assert.equal(Object.values((await snapshot()).layout.entities).filter(e=>e.localEffect?.type==='fire').length,2);await action('undo');
  await action('smoke-place');point=await page.evaluate(()=>window.__tabletop.project([-2,0,0]));await page.mouse.click(point.x,point.y);await page.waitForSelector('[data-field="effect-type"]');
  assert.equal(Object.values((await snapshot()).layout.entities).filter(e=>e.localEffect?.type==='smoke').length,1);
  await page.locator('[data-tab="scene"]').click();await check('effects-paused');await page.waitForFunction(()=>!window.__tabletop.stats().animatedLocalEffects);
  const paused=(await stats()).effectTime;await page.waitForTimeout(120);assert.equal((await stats()).effectTime,paused);
  await mkdir('test-results',{recursive:true});await page.locator('#viewport canvas').screenshot({path:'test-results/materials-fire-smoke.png'});
  const [projector]=await Promise.all([page.waitForEvent('popup'),action('presentation-window')]);projector.on('pageerror',e=>errors.push(e.message));await projector.waitForFunction(()=>window.__tabletop?.stats().localEffects.length===2);
  const camera=await projector.evaluate(()=>window.__tabletop.camera());
  await page.bringToFront();await page.locator(`[data-select="${floor.id}"]`).click();await select('material-texture','stone');await projector.waitForFunction(id=>window.__tabletop.stats().surfaceMaterials.some(m=>m.id===id&&m.texture==='stone'),floor.id);assert.deepEqual(await projector.evaluate(()=>window.__tabletop.camera()),camera);
  const textureCount=(await stats()).textures;
  for(const id of ['sand','metal','brick','concrete','wood']) await select('material-texture',id);
  assert.ok((await stats()).textures<=textureCount+2,'atlas resources stay bounded while switching');
  await check('viewport-effects',false);await page.waitForFunction(()=>window.__tabletop.stats().localEffects.every(e=>e.count===0));assert.ok((await projector.evaluate(()=>window.__tabletop.stats())).localEffects.some(e=>e.count>0));await check('viewport-effects');
  await check('effects-paused',false);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!window.__tabletop.stats().animatedLocalEffects);await page.emulateMedia({reducedMotion:'no-preference'});await check('effects-paused');
  await action('save');await page.waitForFunction(()=>!document.querySelector('#save-status').classList.contains('unsaved'));const saved=await snapshot();
  await browser.close();browser=null;await new Promise(r=>server.close(r));server=null;await listen();await open();await action('open');await page.locator(`[data-open="${scene.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,scene.id);
  assert.deepEqual((await snapshot()).layout,saved.layout);await page.waitForFunction(()=>window.__tabletop.stats().localEffects.length===2);assert.deepEqual(errors,[]);
});

test('all surface presets change real GPU pixels; terrain blends masks and local effects animate without shader errors',{timeout:90_000},async t=>{
  const app=express();app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/three',express.static(path.resolve('node_modules/three')));app.use('/src',express.static(path.resolve('src')));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const browser=await launch(),page=await browser.newPage();const errors=[];
  t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async()=>{
    const THREE=await import('three'),{createSurfaceLibrary,applySurfaceTextures}=await import('/src/render/surface-materials.js'),{createEntity}=await import('/src/domain/documents.js'),{createFloor,createTerrain}=await import('/src/render/scene-objects.js'),{SURFACE_MATERIALS,surfacePatch,LOCAL_EFFECT_DEFAULTS,smokeDefaults}=await import('/src/domain/materials.js'),{createLocalEffect,updateLocalEffect}=await import('/src/render/local-effects.js'),{disposeObject}=await import('/src/render/asset-cache.js');
    const renderer=new THREE.WebGLRenderer({preserveDrawingBuffer:true});renderer.setSize(240,240);renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.append(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#222222');scene.add(new THREE.HemisphereLight('#ffffff','#888888',3));const light=new THREE.DirectionalLight('#ffffff',3);light.position.set(3,5,2);scene.add(light);
    const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,4,3);camera.lookAt(0,0,0);const library=createSurfaceLibrary();
    const capture=()=>{renderer.render(scene,camera);const bytes=new Uint8Array(240*240*4);renderer.getContext().readPixels(0,0,240,240,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,bytes);let hash=2166136261;for(const byte of bytes) hash=Math.imul(hash^byte,16777619);return hash>>>0;};
    const plain=createFloor(createEntity('floor'));scene.add(plain);capture();disposeObject(plain);const baseline=renderer.info.memory.textures;
    const hashes=[];for(const preset of SURFACE_MATERIALS){const entity=createEntity('floor',{width:4,length:4,material:surfacePatch(preset.id)}),view=createFloor(entity);applySurfaceTextures(view,entity,library);scene.add(view);hashes.push(capture());disposeObject(view);}
    const terrain=createEntity('terrain',{width:4,length:4,segments:4});terrain.paintLayers=[{id:'grass',color:'#ffffff',opacity:1,visible:true,texture:'grass',textureSize:1,weights:Array(25).fill(1)},{id:'mud',color:'#ffffff',opacity:1,visible:true,texture:'mud',textureSize:2,weights:Array.from({length:25},(_,i)=>i%5/4)}];
    const ground=createTerrain(terrain);applySurfaceTextures(ground,terrain,library);scene.add(ground);const blend=capture();disposeObject(ground);
    const fire=createLocalEffect(LOCAL_EFFECT_DEFAULTS),smoke=createLocalEffect(smokeDefaults());fire.position.x=-.7;smoke.position.x=.7;scene.add(fire,smoke);camera.position.set(0,2,6);camera.lookAt(0,1,0);
    updateLocalEffect(fire,1,true,false);updateLocalEffect(smoke,1,true,false);const first=capture();updateLocalEffect(fire,1.8,true,false);updateLocalEffect(smoke,1.8,true,false);const second=capture();
    updateLocalEffect(fire,1.8,false,false);updateLocalEffect(smoke,1.8,false,false);const hidden=capture();disposeObject(fire);disposeObject(smoke);library.dispose();capture();const textures=renderer.info.memory.textures;renderer.dispose();return {hashes,blend,first,second,hidden,textures,baseline};
  });
  assert.equal(new Set(result.hashes).size,8);assert.ok(!result.hashes.includes(result.blend));assert.notEqual(result.first,result.second);assert.notEqual(result.second,result.hidden);assert.equal(result.textures,result.baseline);assert.deepEqual(errors,[]);
});
