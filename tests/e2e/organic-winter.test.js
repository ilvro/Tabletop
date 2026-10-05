import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir,mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import {chromium} from 'playwright';
import {createEntity,createScene} from '../../src/domain/documents.js';
import {surfacePatch,coverageDefaults} from '../../src/domain/materials.js';
import {rockDefaults} from '../../src/domain/rocks.js';
import {createApp} from '../../server/app.js';
import {reveal} from './controls.js';
const launch=()=>chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

test('organic rock/deposits render real pixels; snow falls, wind drifts, pause and disposal work',{timeout:120_000},async t=>{
  const app=express();app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/three',express.static(path.resolve('node_modules/three')));app.use('/src',express.static(path.resolve('src')));app.use('/assets',express.static(path.resolve('public/assets')));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const browser=await launch();t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});
  const page=await browser.newPage({viewport:{width:1000,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async()=>{
    const THREE=await import('three'),{recipeInstance,disposeObject}=await import('/src/render/asset-cache.js'),{createFloor}=await import('/src/render/scene-objects.js'),{createSurfaceLibrary,applySurfaceTextures}=await import('/src/render/surface-materials.js'),{createEntity}=await import('/src/domain/documents.js'),{surfacePatch,coverageDefaults}=await import('/src/domain/materials.js'),{addPhysicalSnow,clearPhysicalSnow,createExposureTest,snowOccluders}=await import('/src/render/physical-snow.js'),{createAtmosphere}=await import('/src/render/atmosphere.js'),{WEATHER_DEFAULTS}=await import('/src/domain/lighting.js');
    const renderer=new THREE.WebGLRenderer({preserveDrawingBuffer:true,antialias:true});renderer.setSize(1000,720);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;document.body.append(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#aab7c1');scene.add(new THREE.HemisphereLight('#d5e5f5','#4b4c49',1.5));const sun=new THREE.DirectionalLight('#fff4e1',3);sun.position.set(-7,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);
    const camera=new THREE.PerspectiveCamera(46,1000/720,.1,100);camera.position.set(9,5.5,12);camera.lookAt(0,3,0);
    const capture=()=>{renderer.render(scene,camera);const gl=renderer.getContext(),bytes=new Uint8Array(1000*720*4);gl.readPixels(0,0,1000,720,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let hash=2166136261;for(let i=0;i<bytes.length;i+=4)hash=Math.imul(hash^bytes[i]^bytes[i+1]^bytes[i+2],16777619);return hash>>>0;};
    const warm=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial());warm.castShadow=true;scene.add(warm);capture();disposeObject(warm);capture();const baseTextures=renderer.info.memory.textures;
    const library=createSurfaceLibrary(),recipe=await (await fetch('/assets/models/organic-cliff.json')).json(),record=createEntity('prop',{assetRef:{id:'builtin-organic-cliff',revision:1},material:{...surfacePatch('rock'),rockPattern:'organic'}}),rock=recipeInstance(recipe);applySurfaceTextures(rock,record,library);scene.add(rock);scene.updateMatrixWorld(true);
    const groundRecord=createEntity('floor',{width:18,length:18,material:surfacePatch('snow')}),ground=createFloor(groundRecord);applySurfaceTextures(ground,groundRecord,library);scene.add(ground);
    const hit=new THREE.Raycaster(new THREE.Vector3(-1.5,2,8),new THREE.Vector3(0,0,-1)).intersectObject(rock,true)[0];
    const lantern=recipeInstance(await (await fetch('/assets/models/mountain-round-lantern.json')).json());lantern.position.set(hit.point.x+.5025,hit.point.y-.4975,hit.point.z+.06);scene.add(lantern);applySurfaceTextures(lantern,createEntity('prop'),library);
    const lamp=new THREE.PointLight('#ffc878',8,5,2);lamp.position.copy(lantern.position).add(new THREE.Vector3(.3475,.1925,0));scene.add(lamp);scene.updateMatrixWorld(true);const dry=capture();
    record.material.coverage={...coverageDefaults(),snowStyle:'organic',physicalThickness:.32,snowDrift:.85,snowDriftScale:1.8,snowWindDirection:35,variation:.2,slopeAngle:58,slopeFade:20};
    const exposure=createExposureTest(snowOccluders([rock]));addPhysicalSnow(rock,record,library,exposure);const snow=capture(),coat=rock.children.find(c=>c.userData.physicalSnow),stats={triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,textures:renderer.info.memory.textures,deposit:coat.geometry.userData.snowDeposit};
    window.__winterCapture={renderer,scene,camera};
    const snowyImage=renderer.domElement.toDataURL();clearPhysicalSnow(rock);record.material.coverage.snowWindDirection=220;addPhysicalSnow(rock,record,library,exposure);const windy=capture();
    clearPhysicalSnow(rock);disposeObject(rock);disposeObject(ground);disposeObject(lantern);lamp.dispose();library.dispose();
    // One isolated flake gives an unambiguous GPU direction test, independent of wrap/fog.
    scene.clear();scene.background=new THREE.Color('#000000');camera.position.set(0,2,10);camera.lookAt(0,2,0);
    const atmosphere=createAtmosphere(scene),weather={...WEATHER_DEFAULTS,type:'snow',count:1,size:[4,4,4],center:[0,0,0],wind:[0,0],speed:.6,particleSize:.12,color:'#ffffff',opacity:1};
    atmosphere.configure({weather});scene.children.find(c=>c.isPoints).geometry.attributes.position.setXYZ(0,.5,.75,.5);
    const centroid=()=>{capture();const gl=renderer.getContext(),p=new Uint8Array(1000*720*4);gl.readPixels(0,0,1000,720,gl.RGBA,gl.UNSIGNED_BYTE,p);let weight=0,x=0,y=0;for(let i=0;i<p.length;i+=4){const w=p[i]+p[i+1]+p[i+2];weight+=w;x+=((i/4)%1000)*w;y+=Math.floor(i/4/1000)*w;}return {x:x/weight,y:y/weight,weight};};
    atmosphere.update(camera,0,false,720);const first=centroid();atmosphere.update(camera,1,false,720);const second=centroid();const paused=atmosphere.update(camera,1,true,720),still=centroid();atmosphere.dispose();
    atmosphere.configure({weather:{...weather,wind:[1,0]}});scene.children.find(c=>c.isPoints).geometry.attributes.position.setXYZ(0,.5,.75,.5);atmosphere.update(camera,1,false,720);const drift=centroid();atmosphere.dispose();
    atmosphere.configure({weather:{...weather,speed:0}});scene.children.find(c=>c.isPoints).geometry.attributes.position.setXYZ(0,.5,.75,.5);atmosphere.update(camera,0,false,720);const stoppedA=centroid(),stopped=atmosphere.update(camera,5,false,720),stoppedB=centroid();atmosphere.dispose();
    atmosphere.configure({weather:{...weather,type:'dust'}});scene.children.find(c=>c.isPoints).geometry.attributes.position.setXYZ(0,.5,.25,.5);atmosphere.update(camera,0,false,720);const dustA=centroid();atmosphere.update(camera,1,false,720);const dustB=centroid();atmosphere.dispose();
    scene.clear();capture();const end={geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
    sun.shadow.map?.dispose();sun.shadow.mapPass?.dispose();sun.dispose();renderer.dispose();return {baseTextures,dry,snow,windy,snowyImage,stats,first,second,still,drift,paused,stoppedA,stoppedB,stopped,dustA,dustB,end};
  });
  await mkdir('test-results',{recursive:true});const {writeFile}=await import('node:fs/promises');await writeFile('test-results/organic-cliff-prototype.png',Buffer.from(result.snowyImage.split(',')[1],'base64'));delete result.snowyImage;console.log(JSON.stringify(result));
  assert.notEqual(result.dry,result.snow);assert.notEqual(result.snow,result.windy);assert.ok(result.first.weight>0);assert.ok(result.second.y<result.first.y-10,'flake falls on GPU');assert.deepEqual(result.second,result.still);assert.equal(result.paused,false);assert.ok(result.drift.x>result.second.x+10,'wind moves flake');assert.equal(result.end.geometries,0);assert.equal(result.end.textures,result.baseTextures,'only baseline renderer/light resources remain');assert.deepEqual(errors,[]);
  assert.equal(result.stopped,false);assert.deepEqual(result.stoppedA,result.stoppedB,'zero speed and wind keep flakes still');assert.ok(result.dustB.y>result.dustA.y+10,'dust still rises');
});

for(const mode of ['server','pages'])test(`organic formations and snow edit/persist/project in ${mode}`,{timeout:180_000},async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tabletop-organic-')),app=mode==='server'?await createApp({dataDir:dir}):express();if(mode==='pages')app.use('/Tabletop',express.static(path.resolve('dist-pages')));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const browser=await launch();t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
  const page=await browser.newPage({viewport:{width:1400,height:900},reducedMotion:'reduce'}),origin=`http://127.0.0.1:${server.address().port}`,base=mode==='pages'?'/Tabletop/':'/',errors=[],requests=[];page.setDefaultTimeout(45_000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());page.on('request',r=>requests.push(r.url()));
  const scene=createScene('Protótipo de paredão orgânico'),rock=createEntity('prop',{name:'Paredão orgânico',assetRef:{id:'builtin-organic-cliff',revision:1},rockShape:rockDefaults('builtin-organic-cliff'),material:{...surfacePatch('rock'),rockPattern:'organic',coverage:{...coverageDefaults(),snowStyle:'organic',physicalThickness:.25,snowDrift:.7,snowDriftScale:2,snowWindDirection:30,slopeAngle:55}},footprint:[8,3.4]});scene.layout.entities[rock.id]=rock;scene.layout.grid.visible=false;
  if(mode==='server'){const r=await fetch(`${origin}/api/tabletop/scenes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:scene})});assert.equal(r.status,201,await r.text());}
  await page.goto(`${origin}${base}?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
  const action=async name=>(await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  if(mode==='pages') {
    await action('open');await page.locator('#document-json-file').setInputFiles({name:'organic-scene.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(scene))});
  }else {await action('open');await page.locator(`[data-open="${scene.id}"]`).click();}
  await page.waitForFunction(()=>Object.values(window.__tabletop.snapshot().layout.entities).some(e=>e.assetRef?.id==='builtin-organic-cliff'));
  const id=await page.evaluate(()=>Object.values(window.__tabletop.snapshot().layout.entities).find(e=>e.assetRef?.id==='builtin-organic-cliff').id);
  await page.waitForFunction(id=>window.__tabletop.stats().snowCoats.some(c=>c.id===id&&c.topFaces>0),id);
  await page.locator('[data-tab="scene"]').click();await page.locator(`[data-select="${id}"]`).click();
  const field=async(name,value)=>{const n=await reveal(page.locator(`[data-field="${name}"]`).first());await n.fill(String(value));await n.press('Tab');};
  await field('rock-seed',917);await field('coverage-snowWindDirection',150);const snapshot=()=>page.evaluate(()=>window.__tabletop.snapshot());assert.equal((await snapshot()).layout.entities[id].material.coverage.snowWindDirection,150);await action('undo');assert.equal((await snapshot()).layout.entities[id].material.coverage.snowWindDirection,30);await action('redo');
  await (await reveal(page.locator('[data-field="rock-form"]'))).selectOption('organic');await page.waitForFunction(id=>window.__tabletop.stats().rockGeometries.some(g=>g.id===id&&g.form==='organic'),id);await action('undo');
  await action('rock-sculpt');assert.equal(await page.locator('[data-field="brush-mode"]').count()>0,true);await page.keyboard.press('Escape');
  const [projector]=await Promise.all([page.waitForEvent('popup'),action('presentation-window')]);await projector.emulateMedia({reducedMotion:'reduce'});projector.on('pageerror',e=>errors.push(e.message));await projector.waitForFunction(id=>window.__tabletop?.stats().snowCoats.some(c=>c.id===id&&c.topFaces>0),id);
  const camera=await projector.evaluate(()=>window.__tabletop.camera());await page.bringToFront();await field('coverage-snowDrift',.9);await projector.waitForFunction(id=>window.__tabletop.stats().snowCoats.some(s=>s.id===id&&s.drift===.9),id);assert.deepEqual(await projector.evaluate(()=>window.__tabletop.camera()),camera);await projector.close();
  const revision=(await snapshot()).revision;await action('save');await page.waitForFunction(previous=>window.__tabletop.snapshot().revision>previous,revision);const saved=await snapshot();await page.reload();await page.waitForFunction(id=>window.__tabletop?.snapshot().id===id,saved.id);assert.deepEqual((await snapshot()).layout,saved.layout);
  assert.deepEqual(await page.evaluate(()=>window.__tabletop.stats().assetDiagnostics),[]);assert.deepEqual(errors,[]);if(mode==='pages')assert.equal(requests.some(r=>r.includes('/api/')),false);
});
