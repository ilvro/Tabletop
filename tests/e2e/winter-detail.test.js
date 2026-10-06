import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import {chromium} from 'playwright';

test('detailed winter vegetation/props render textured pixels, bough snow and release GPU resources',{timeout:120000},async t=>{
  const app=express();app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><style>body{margin:0}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/three',express.static(path.resolve('node_modules/three')));app.use('/src',express.static(path.resolve('src')));app.use('/assets',express.static(path.resolve('public/assets')));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async()=>{
    const THREE=await import('three'),{recipeInstance,disposeObject}=await import('/src/render/asset-cache.js'),{createSurfaceLibrary,applySurfaceTextures}=await import('/src/render/surface-materials.js'),{createFloor}=await import('/src/render/scene-objects.js'),{createEntity}=await import('/src/domain/documents.js'),{surfacePatch,coverageDefaults}=await import('/src/domain/materials.js'),{addPhysicalSnow,clearPhysicalSnow,createExposureTest,snowOccluders}=await import('/src/render/physical-snow.js');
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,850);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;document.body.append(renderer.domElement);const scene=new THREE.Scene();scene.background=new THREE.Color('#bac7ce');scene.add(new THREE.HemisphereLight('#e1edf7','#313b38',2));const sun=new THREE.DirectionalLight('#fff5e4',3);sun.position.set(-8,12,10);scene.add(sun);const camera=new THREE.PerspectiveCamera(42,1200/850,.1,100);camera.position.set(11,7,14);camera.lookAt(0,2,0);
    const warm=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial());scene.add(warm);renderer.render(scene,camera);disposeObject(warm);renderer.render(scene,camera);const baseline={...renderer.info.memory},library=createSurfaceLibrary(),props=[];
    for(const [id,position] of [['dense-alpine-fir',[-2,0,-1]],['dense-mountain-pine',[3,0,-3]],['wooden-expedition-barrel',[-.3,0,1]],['old-open-crate',[1,0,2]],['old-closed-crate',[2.4,0,.8]],['forked-dead-branch',[-1,0,3]],['twisted-mountain-roots',[-3.4,0,2]],['winter-dry-shrub',[3.4,0,3]],['broken-timber-pile',[.4,0,3.4]]]) {
      const response=await fetch(`/assets/models/${id}.json`);if(!response.ok)throw new Error(`${id}: HTTP ${response.status}`);const object=recipeInstance(await response.json()),record=createEntity('prop',{assetRef:{id:`builtin-${id}`,revision:1}});object.position.fromArray(position);scene.add(object);applySurfaceTextures(object,record,library);props.push({id,object,record});
    }
    const floorRecord=createEntity('floor',{width:15,length:15,material:surfacePatch('snow')}),floor=createFloor(floorRecord);scene.add(floor);applySurfaceTextures(floor,floorRecord,library);scene.updateMatrixWorld(true);
    const capture=()=>{renderer.render(scene,camera);const gl=renderer.getContext(),pixels=new Uint8Array(1200*850*4);gl.readPixels(0,0,1200,850,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let hash=2166136261;for(let i=0;i<pixels.length;i+=4)hash=Math.imul(hash^pixels[i]^pixels[i+1]^pixels[i+2],16777619);return {hash:hash>>>0,image:renderer.domElement.toDataURL()};};
    const dry=capture(),exposure=createExposureTest(snowOccluders(props.map(p=>p.object))),coats=[];
    for(const p of props.filter(p=>p.id.startsWith('dense-'))) {p.record.material.coverage={...coverageDefaults(),snowStyle:'organic',physicalThickness:.13,slopeAngle:65,snowDrift:.6,snowDriftScale:2,snowWindDirection:45};p.record.material.textureSlot='green';coats.push(addPhysicalSnow(p.object,p.record,library,exposure).triangles);}
    const snowy=capture(),stats={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures};
    for(const p of props){clearPhysicalSnow(p.object);disposeObject(p.object);}disposeObject(floor);library.dispose();renderer.render(scene,camera);const end={...renderer.info.memory};renderer.dispose();return {dry,snowy,coats,stats,baseline,end};
  });
  await mkdir('test-results',{recursive:true});for(const [name,capture] of [['winter-detail-dry',result.dry],['winter-detail-snow',result.snowy]])await writeFile(`test-results/${name}.png`,Buffer.from(capture.image.split(',')[1],'base64'));
  assert.notEqual(result.dry.hash,result.snowy.hash);assert.ok(result.coats.every(n=>n>1000&&n<18000));assert.ok(result.stats.calls<30);assert.deepEqual(result.end,result.baseline);assert.deepEqual(errors,[]);console.log(JSON.stringify({coats:result.coats,stats:result.stats}));
});
