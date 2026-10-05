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
import { surfacePatch, layerSurfacePatch } from '../../src/domain/materials.js';
import { protectTerrainFloors, resizeTerrain } from '../../src/authoring/terrain.js';
import { reveal } from './controls.js';

const launch=()=>chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

test('terrain authoring exposes area/physical rock relief, protects constructions, reviews presets and persists edits',{timeout:240_000},async t=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-terrain-authoring-'));
  const server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');const browser=await launch();
  t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});});
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),origin=`http://127.0.0.1:${server.address().port}`,errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
  const scene=createScene('Relevo natural editável'),terrain=createEntity('terrain',{width:16,length:16,segments:16,heights:Array(17**2).fill(3)}),floor=createEntity('floor',{width:4,length:6,position:[4,1,0],material:surfacePatch('stone')});
  terrain.paintLayers[0]={...terrain.paintLayers[0],...layerSurfacePatch('rock')};scene.layout.grid.visible=false;
  for(const entity of [terrain,floor]) scene.layout.entities[entity.id]=entity;
  assert.equal((await fetch(`${origin}/api/tabletop/scenes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:scene})})).status,201);
  await page.goto(`${origin}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
  const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const field=async(name,value)=>{const node=await reveal(page.locator(`[data-field="${name}"]`).first());await node.fill(String(value));await node.press('Tab');};
  const option=async(name,value)=>(await reveal(page.locator(`[data-field="${name}"]`).first())).selectOption(value);
  const snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());
  await action('open');await page.locator(`[data-open="${scene.id}"]`).click();await page.waitForFunction(id=>window.__tabletop.snapshot().id===id,scene.id);
  await page.locator('[data-tab="scene"]').click();await page.locator(`[data-select="${terrain.id}"]`).click();
  assert.ok(await page.locator('[data-field="width"]').isVisible(),'area is outside advanced disclosure');
  await action('terrain-protect-floors');assert.deepEqual((await snapshot()).layout.entities[terrain.id],terrain);await action('cancel-proposal');
  await action('terrain-protect-floors');await action('accept-proposal');
  let current=(await snapshot()).layout.entities[terrain.id];assert.deepEqual(current.heights,protectTerrainFloors(terrain,{[floor.id]:floor}));assert.deepEqual((await snapshot()).layout.entities[floor.id],floor);
  await action('undo');assert.deepEqual((await snapshot()).layout.entities[terrain.id],terrain);await action('redo');
  // The same material ID remains masonry; natural rock is an explicit separate choice.
  assert.match(await page.locator('[data-field="terrain-layer-texture"] option[value="stone"]').textContent(),/alvenaria/);
  await option('terrain-layer-texture','rock');await field('material-relief',.2);
  assert.ok(await page.locator('[data-field="material-relief"]').isEnabled());
  await option('terrain-layer-texture','none');await option('material-texture','none');assert.ok(await page.locator('[data-field="material-relief"]').isDisabled());
  await option('terrain-layer-texture','rock');assert.ok(await page.locator('[data-field="material-relief"]').isEnabled());
  await action('top');await action('frame');await option('brush-mode','rock');await field('brush-rockSeed',129);await field('brush-rockSize',3);await field('brush-radius',3);await field('brush-strength',2);
  const beforeRock=(await snapshot()).layout.entities[terrain.id];
  await action('terrain-sculpt');
  const start=await page.evaluate(()=>window.__tabletop.project([-4,3,-2])),end=await page.evaluate(()=>window.__tabletop.project([-4,3,2]));
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:10});await page.mouse.up();await action('terrain-stop');
  current=(await snapshot()).layout.entities[terrain.id];assert.notDeepEqual(current.heights,beforeRock.heights);assert.deepEqual(current.paintLayers,beforeRock.paintLayers);
  await action('undo');assert.deepEqual((await snapshot()).layout.entities[terrain.id],beforeRock);await action('redo');
  const beforeSize=(await snapshot()).layout.entities[terrain.id];await field('width',32);
  assert.deepEqual((await snapshot()).layout.entities[terrain.id],{...beforeSize,...resizeTerrain(beforeSize,{width:32})});
  await action('undo');assert.deepEqual((await snapshot()).layout.entities[terrain.id],beforeSize);await action('redo');
  await option('terrain-resize-mode','stretch');const expanded=(await snapshot()).layout.entities[terrain.id];await field('length',24);
  current=(await snapshot()).layout.entities[terrain.id];assert.equal(current.length,24);assert.deepEqual(current.heights,expanded.heights);assert.deepEqual(current.paintLayers,expanded.paintLayers);
  await action('undo');await option('terrain-resize-mode','extend');
  const [projector]=await Promise.all([page.waitForEvent('popup'),action('presentation-window')]);projector.on('pageerror',e=>errors.push(e.message));
  await projector.waitForFunction(expected=>JSON.stringify(window.__tabletop?.camera())===JSON.stringify(expected),await page.evaluate(()=>window.__tabletop.camera()));
  const camera=await projector.evaluate(()=>window.__tabletop.camera());await page.bringToFront();await field('terrain-layer-textureBrightness',.7);
  await projector.waitForFunction(id=>window.__tabletop.stats().surfaceMaterials.some(m=>m.id===id&&m.layerOptions.some(layer=>layer.textureBrightness===.7)),terrain.id);
  assert.deepEqual(await projector.evaluate(()=>window.__tabletop.camera()),camera);
  // The mountain is a reviewed independent preset, placed at explicit X/Z and capped under floors.
  await page.locator('[data-tab="build"]').click();await field('terrain-new-width',20);await field('terrain-new-length',20);await field('terrain-new-segments',16);await field('terrain-new-x',1);await field('terrain-new-z',2);
  const beforePreset=await snapshot();await action('terrain-mountain');assert.deepEqual(await snapshot(),beforePreset);await action('cancel-proposal');assert.deepEqual(await snapshot(),beforePreset);
  await action('terrain-mountain');await action('accept-proposal');
  const mountain=Object.values((await snapshot()).layout.entities).find(e=>e.kind==='terrain'&&e.id!==terrain.id);assert.deepEqual(mountain.transform.position,[1,0,2]);
  assert.deepEqual(protectTerrainFloors(mountain,{[floor.id]:floor}),mountain.heights);assert.equal(mountain.paintLayers[0].texture,'rock');assert.equal(mountain.paintLayers[1].texture,'snow');
  await action('undo');assert.deepEqual(await snapshot(),beforePreset);
  await page.locator('[data-tab="scene"]').click();await page.locator(`[data-select="${terrain.id}"]`).click();await action('perspective');await action('frame');
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/terrain-authoring.png'});
  const savedLayout=(await snapshot()).layout;await action('save');await page.waitForFunction(()=>!document.querySelector('#save-status').classList.contains('unsaved')&&!document.querySelector('[data-action="save"]').disabled);
  await page.reload();await page.waitForFunction(id=>window.__tabletop?.snapshot().id===id,scene.id);assert.deepEqual((await snapshot()).layout,savedLayout);assert.deepEqual(errors,[]);
});

test('apparent relief changes real texture lighting while leaving the mesh silhouette and physical support unchanged',{timeout:90_000},async t=>{
  const app=express();app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/three',express.static(path.resolve('node_modules/three')));app.use('/src',express.static(path.resolve('src')));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const browser=await launch();t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async()=>{
    const THREE=await import('three'),{createSurfaceLibrary,applySurfaceTextures}=await import('/src/render/surface-materials.js'),{createTerrain}=await import('/src/render/scene-objects.js'),{disposeObject}=await import('/src/render/asset-cache.js'),{surfacePatch,layerSurfacePatch}=await import('/src/domain/materials.js'),{createEntity}=await import('/src/domain/documents.js');
    const renderer=new THREE.WebGLRenderer({preserveDrawingBuffer:true});renderer.setSize(320,320);document.body.append(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#202020');scene.add(new THREE.AmbientLight('#ffffff',.25));
    const light=new THREE.DirectionalLight('#ffffff',3);light.position.set(-8,2,1);scene.add(light);
    const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,5,6);camera.lookAt(0,0,0);const library=createSurfaceLibrary();
    const draw=(texture,relief,layer=false)=>{
      const entity=createEntity('terrain',{width:5,length:5,segments:8,material:{...(texture==='none'?{color:'#888888'}:surfacePatch(texture)),relief},paintLayers:[]});
      if(layer){entity.material={color:'#ffffff',roughness:.9,metalness:0,relief};entity.paintLayers=[{id:'rock',name:'Rocha',...layerSurfacePatch(texture),opacity:1,visible:true,weights:Array(81).fill(1)}];}
      const object=createTerrain(entity);applySurfaceTextures(object,entity,library);scene.add(object);renderer.render(scene,camera);
      const bytes=new Uint8Array(320*320*4),gl=renderer.getContext();gl.readPixels(0,0,320,320,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
      const positions=[...object.children[0].geometry.attributes.position.array];disposeObject(object);return{bytes:[...bytes],positions};
    };
    const rock0=draw('rock',0),rock2=draw('rock',.2),layer0=draw('rock',0,true),layer2=draw('rock',.2,true),plain0=draw('none',0),plain2=draw('none',.2),stone=draw('stone',0);
    const difference=(a,b)=>{let count=0,delta=0;for(let i=0;i<a.bytes.length;i+=4){const d=Math.abs(a.bytes[i]-b.bytes[i])+Math.abs(a.bytes[i+1]-b.bytes[i+1])+Math.abs(a.bytes[i+2]-b.bytes[i+2]);if(d>3)count++;delta+=d;}return{count,delta};};
    // A constant tile beside a contrasting tile must stay constant across repeats and mip levels.
    // This isolates atlas filtering from actual cracks/color variation in the procedural artwork.
    const bytes=new Uint8Array(512*256*4),detailBytes=new Uint8Array(bytes.length);
    for(let y=0;y<256;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;bytes.set(x<256?[180,70,50,255]:[20,255,255,255],i);detailBytes.set([128,255,255,255],i);}
    const texture=(data,colorSpace)=>{const tex=new THREE.DataTexture(data,512,256);tex.colorSpace=colorSpace;tex.generateMipmaps=true;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.needsUpdate=true;return tex;};
    const albedo=texture(bytes,THREE.SRGBColorSpace),details=texture(detailBytes,THREE.NoColorSpace);
    const customLibrary={acquire:()=>({albedo,details,columns:2,rows:1,index:()=>0})};
    scene.remove(light);const ortho=new THREE.OrthographicCamera(-2,2,2,-2,.1,100);ortho.position.set(0,8,0);ortho.up.set(0,0,-1);ortho.lookAt(0,0,0);
    const seamRanges=[];
    for(const textureSize of [1,.08,.02]) {
      const entity=createEntity('terrain',{width:5,length:5,segments:8,paintLayers:[],material:{...surfacePatch('rock'),relief:0,roughness:1,textureSize}}),object=createTerrain(entity);applySurfaceTextures(object,entity,customLibrary);scene.add(object);renderer.render(scene,ortho);
      const pixels=new Uint8Array(320*320*4),gl=renderer.getContext();gl.readPixels(0,0,320,320,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      const minimum=[255,255,255],maximum=[0,0,0];for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++){minimum[c]=Math.min(minimum[c],pixels[i+c]);maximum[c]=Math.max(maximum[c],pixels[i+c]);}
      seamRanges.push(maximum.map((v,c)=>v-minimum[c]));disposeObject(object);
    }
    albedo.dispose();details.dispose();library.dispose();renderer.dispose();return{base:difference(rock0,rock2),layer:difference(layer0,layer2),plain:difference(plain0,plain2),masonry:difference(rock0,stone),samePositions:JSON.stringify(rock0.positions)===JSON.stringify(rock2.positions),seamRanges};
  });
  assert.ok(result.base.count>1000,JSON.stringify(result));assert.ok(result.layer.count>1000,JSON.stringify(result));assert.equal(result.plain.delta,0);assert.ok(result.masonry.count>1000);assert.equal(result.samePositions,true);assert.ok(result.seamRanges.flat().every(range=>range<=3),JSON.stringify(result.seamRanges));assert.deepEqual(errors,[]);
});
