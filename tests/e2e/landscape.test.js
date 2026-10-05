import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import express from 'express';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene,createEntity } from '../../src/domain/documents.js';
import { surfacePatch,coverageDefaults } from '../../src/domain/materials.js';
import { supportHeightAt } from '../../src/domain/geometry.js';
import { reveal } from './controls.js';
const launch=()=>chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

test('alpine kit, vegetation preview, water/ice and physical snow are editable, sheltered, persistent and projected with independent cameras',{timeout:240_000},async t=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-landscape-')),server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');const browser=await launch();
  t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});});
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),origin=`http://127.0.0.1:${server.address().port}`,errors=[];page.setDefaultTimeout(35_000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
  const scene=createScene('Ruínas alpinas · água e neve física'),coverage={...coverageDefaults(),physicalThickness:.18,variation:.1},n=24;
  const terrain=createEntity('terrain',{width:24,length:28,segments:n,heights:Array.from({length:(n+1)**2},(_,i)=>{const x=(i%(n+1)/n-.5)*24,z=(Math.floor(i/(n+1))/n-.5)*28;return -.65+Math.max(0,Math.abs(x)-4)**1.3*.22+Math.max(0,-z-8)*.09;}),material:{...surfacePatch('rock'),coverage}});
  terrain.paintLayers=[];scene.layout.grid.visible=false;scene.look.effectsPaused=true;scene.look.background='#93a9ba';scene.look.fill.skyColor='#d5e5f1';scene.look.fill.groundColor='#676250';
  scene.layout.entities[terrain.id]=terrain;
  const river=createEntity('water',{name:'Córrego alpino',vertices:[[-1.6,-12],[1,-12],[1.7,-3],[.7,4],[1.5,11],[-.8,11],[-1.5,4],[-.8,-3]],position:[0,-.08,0],depth:.8});scene.layout.entities[river.id]=river;
  const floor=createEntity('floor',{name:'Ruína · pavimento',width:5,length:6,position:[-5,.55,-2],material:surfacePatch('stone')});scene.layout.entities[floor.id]=floor;
  const prop=(assetId,pos,scale=1,snow=true)=>{const e=createEntity('prop',{name:assetId,assetRef:{id:`builtin-${assetId}`,revision:1},position:pos,scale:[scale,scale,scale],material:snow?{coverage}:{},...(assetId.startsWith('alpine-')?{vegetationSeed:122}: {})});scene.layout.entities[e.id]=e;return e;};
  prop('ruin-stone-arch',[-5,.55,-4]);prop('ruin-masonry-wall',[-7,.55,-1]);prop('ruin-buttress',[-7,.55,-4]);
  const roof=prop('mountain-roof',[-5,2.5,-1],1.1),covered=prop('granite-boulder',[-5.22,.55,-1.4],.055),exposed=prop('mountain-boulder',[5,supportHeightAt(terrain,[5,0,4]),4],1.2);
  prop('mountain-timber-bridge',[0,.08,5]);prop('mountain-lantern-post',[-3,.4,4],1,false);
  for(const [x,z,id] of [[7,-7,'alpine-fir'],[-9,6,'alpine-pine'],[8,8,'bare-mountain-tree']])prop(id,[x,supportHeightAt(terrain,[x,0,z]),z],1);
  const response=await fetch(`${origin}/api/tabletop/scenes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:scene})});assert.equal(response.status,201,await response.text());
  await page.goto(`${origin}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
  const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const field=async(name,value)=>{const node=await reveal(page.locator(`[data-field="${name}"]`).first());await node.fill(String(value));await node.press('Tab');};
  const option=async(name,value)=>(await reveal(page.locator(`[data-field="${name}"]`).first())).selectOption(value);
  const snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());const stats=()=>page.evaluate(()=>window.__tabletop.stats());
  const select=async id=>{await page.locator('[data-tab="scene"]').click();await page.locator(`[data-select="${id}"]`).click();};
  await action('open');await page.locator(`[data-open="${scene.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,scene.id);
  await page.waitForFunction(id=>window.__tabletop.stats().surfaceMaterials.some(m=>m.id===id&&m.texture==='wood'),roof.id);
  await page.waitForFunction(id=>window.__tabletop.stats().snowCoats.some(c=>c.id===id),exposed.id);assert.ok(!(await stats()).snowCoats.some(c=>c.id===covered.id));
  await select(terrain.id);await action('snow-exposure');let snow=(await snapshot()).layout.entities[terrain.id];assert.ok(snow.snowMask.some(v=>v===0));assert.ok(snow.snowMask.some(v=>v===1));
  const originalHeights=snow.heights;await field('coverage-physicalThickness',.35);assert.deepEqual((await snapshot()).layout.entities[terrain.id].heights,originalHeights);await action('undo');assert.equal((await snapshot()).layout.entities[terrain.id].material.coverage.physicalThickness,.18);await action('redo');
  await select(river.id);await option('water-state','ice');await page.waitForFunction(id=>window.__tabletop.stats().surfaceMaterials.some(m=>m.id===id&&m.texture==='ice'),river.id);await field('depth',.6);await option('coverage-texture','snow');await field('coverage-physicalThickness',.12);
  await option('water-state','water');await field('water-waveHeight',.16);await field('water-speed',1.2);await field('water-direction',35);
  await select(Object.values(scene.layout.entities).find(e=>e.assetRef?.id==='builtin-alpine-fir').id);await field('vegetationSeed',343);assert.equal((await snapshot()).layout.entities[selectionId(scene,'builtin-alpine-fir')].vegetationSeed,343);
  await page.locator('[data-tab="build"]').click();await option('vegetation-terrainId',terrain.id);await option('vegetation-assetId','builtin-alpine-fern');await field('vegetation-count',8);await field('vegetation-seed',77);
  const before=await snapshot();await action('vegetation-preview');assert.deepEqual(await snapshot(),before);await action('cancel-proposal');assert.deepEqual(await snapshot(),before);await action('vegetation-preview');await action('accept-proposal');
  assert.equal(Object.values((await snapshot()).layout.entities).filter(e=>e.assetRef?.id==='builtin-alpine-fern').length,8);await action('undo');assert.deepEqual(await snapshot(),before);await action('redo');
  // New water is available from authoring, with a polygon drawn on the work plane.
  await action('water-add');assert.equal(Object.values((await snapshot()).layout.entities).filter(e=>e.kind==='water').length,2);await action('undo');
  await action('water-draw');await action('top');await action('frame');
  for(const p of [[-10,0,-11],[-6,0,-11],[-6,0,-7],[-10,0,-7]]){const hit=await page.evaluate(v=>window.__tabletop.project(v),p);await page.mouse.click(hit.x,hit.y);}
  await page.locator('#viewport canvas').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).filter(e=>e.kind==='water').length===2);const drawn=Object.values((await snapshot()).layout.entities).find(e=>e.kind==='water'&&e.id!==river.id);assert.equal(drawn.vertices.length,4);await action('undo');
  await select(terrain.id);await action('perspective');await action('frame');await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/alpine-landscape.png'});
  const [projector]=await Promise.all([page.waitForEvent('popup'),action('presentation-window')]);projector.on('pageerror',e=>errors.push(e.message));await projector.waitForFunction(id=>window.__tabletop?.stats().waterSurfaces.some(w=>w.id===id),river.id);await projector.waitForFunction(()=>!window.__tabletop.stats().cameraTransition);
  const camera=await projector.evaluate(()=>window.__tabletop.camera());await page.bringToFront();await select(river.id);await field('water-waveHeight',.21);await projector.waitForFunction(id=>window.__tabletop.stats().waterSurfaces.some(w=>w.id===id&&w.waveHeight===.21),river.id);assert.deepEqual(await projector.evaluate(()=>window.__tabletop.camera()),camera);
  const final=await snapshot();await action('save');await page.waitForFunction(()=>!document.querySelector('#save-status').classList.contains('unsaved')&&!document.querySelector('[data-action="save"]').disabled);await page.reload();await page.waitForFunction(id=>window.__tabletop?.snapshot().id===id,scene.id);assert.deepEqual((await snapshot()).layout,final.layout);assert.deepEqual(errors,[]);
});
const selectionId=(scene,assetId)=>Object.values(scene.layout.entities).find(e=>e.assetRef?.id===assetId).id;

test('water waves, ice and geometric snow change real WebGL pixels, honor pause and release GPU resources',{timeout:120_000},async t=>{
  const app=express();app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/three',express.static(path.resolve('node_modules/three')));app.use('/src',express.static(path.resolve('src')));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const browser=await launch();t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});const page=await browser.newPage(),errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async()=>{
    const THREE=await import('three'),{createWater,updateWater}=await import('/src/render/water.js'),{createTerrain,createFloor}=await import('/src/render/scene-objects.js'),{createEntity}=await import('/src/domain/documents.js'),{surfacePatch,coverageDefaults}=await import('/src/domain/materials.js'),{createSurfaceLibrary,applySurfaceTextures}=await import('/src/render/surface-materials.js'),{disposeObject}=await import('/src/render/asset-cache.js'),{addPhysicalSnow,clearPhysicalSnow,createExposureTest,snowOccluders}=await import('/src/render/physical-snow.js');
    const library=createSurfaceLibrary(),renderer=new THREE.WebGLRenderer({preserveDrawingBuffer:true});renderer.setSize(256,256);document.body.append(renderer.domElement);const scene=new THREE.Scene();scene.background=new THREE.Color('#213448');scene.add(new THREE.HemisphereLight('#eeeeff','#566666',2));const light=new THREE.DirectionalLight('#fff8ed',3);light.position.set(4,4,2);scene.add(light);const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(6,4,7);camera.lookAt(0,0,0);
    const capture=()=>{renderer.render(scene,camera);const bytes=new Uint8Array(256*256*4),gl=renderer.getContext();gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let hash=2166136261;for(const b of bytes)hash=Math.imul(hash^b,16777619);return hash>>>0;};
    const floor=createFloor(createEntity('floor',{width:6,length:6}));scene.add(floor);capture();disposeObject(floor);capture();const base={geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
    const record=createEntity('water',{width:6,length:6,water:{waveHeight:.2}}),water=createWater(record);scene.add(water);updateWater(water,0,false);const a=capture();updateWater(water,3,false);const b=capture();const paused=updateWater(water,3,true),c=capture();disposeObject(water);
    const iceRecord={...record,water:{...record.water,state:'ice'},material:surfacePatch('ice')},ice=createWater(iceRecord);applySurfaceTextures(ice,iceRecord,library);scene.add(ice);const d=capture();disposeObject(ice);
    const terrainRecord=createEntity('terrain',{width:6,length:6,segments:16,material:{...surfacePatch('rock'),coverage:{...coverageDefaults(),physicalThickness:.6,variation:0}}});terrainRecord.paintLayers=[];let terrain=createTerrain({...terrainRecord,material:{...terrainRecord.material,coverage:null}});applySurfaceTextures(terrain,{...terrainRecord,material:{...terrainRecord.material,coverage:null}},library);scene.add(terrain);const dry=capture();disposeObject(terrain);terrain=createTerrain(terrainRecord);applySurfaceTextures(terrain,terrainRecord,library);scene.add(terrain);const snow=capture();disposeObject(terrain);
    const host=createEntity('floor',{width:3,length:3,material:{...surfacePatch('wood'),coverage:{...coverageDefaults(),physicalThickness:.5,variation:0}}}),view=createFloor(host);applySurfaceTextures(view,host,library);scene.add(view);scene.updateMatrixWorld(true);addPhysicalSnow(view,host,library,createExposureTest(snowOccluders([view])));const cap=capture();let released=0;view.children.find(c=>c.userData.physicalSnow).geometry.addEventListener('dispose',()=>released++);clearPhysicalSnow(view);const noCap=capture();disposeObject(view);library.dispose();capture();const end={geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};renderer.dispose();return {a,b,c,d,paused,dry,snow,cap,noCap,released,base,end};
  });assert.notEqual(result.a,result.b);assert.equal(result.b,result.c);assert.equal(result.paused,false);assert.notEqual(result.b,result.d);assert.notEqual(result.dry,result.snow);assert.notEqual(result.cap,result.noCap);assert.equal(result.released,1);assert.equal(result.end.geometries,result.base.geometries,JSON.stringify(result));assert.equal(result.end.textures,result.base.textures,JSON.stringify(result));assert.deepEqual(errors,[]);
});
