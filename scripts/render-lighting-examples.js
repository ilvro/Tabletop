import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import express from 'express';
import {chromium} from 'playwright';
import {LIGHTING_EXAMPLES} from './lighting-examples.js';

// Reproducible screenshots from the real viewport; no external art or baked lighting.
const root=fileURLToPath(new URL('../',import.meta.url)),app=express();
app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><style>html,body,#viewport{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="viewport"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
app.use('/three',express.static(root+'node_modules/three'));app.use('/src',express.static(root+'src'));app.use(express.static(root+'public'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;const errors=[],metrics=[];
try{
  browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:960,height:600},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async()=>{const {createViewport}=await import('/src/render/renderer.js');window.viewport=createViewport(document.getElementById('viewport'),{onError:e=>{throw e;}});window.viewport.setAssets(await(await fetch('/assets/catalog.json')).json());window.viewport.setPresentation(true);});
  for(const item of LIGHTING_EXAMPLES){
    const scene=JSON.parse(await readFile(root+'public/scenes/'+item.id+'.json','utf8'));
    const result=await page.evaluate(async scene=>{const v=window.viewport;v.setLightingQuality('balanced');v.setDocument(scene);await v.ready();v.setCamera(Object.values(scene.cameraPresets)[0]);await new Promise(r=>setTimeout(r,120));const before=v.getInfo(),edited=structuredClone(scene);Object.values(edited.layout.entities).find(e=>e.illumination).illumination.intensity*=.9;const start=performance.now();v.setDocument(edited);const updateMs=performance.now()-start;await new Promise(r=>setTimeout(r,60));const after=v.getInfo();v.setDocument(scene);await new Promise(r=>setTimeout(r,60));return {thumbnail:v.captureThumbnail(),before,after,updateMs};},scene);
    assert.equal(result.after.reconciliation.created,0);assert.equal(result.after.reconciliation.removed,0);assert.deepEqual(result.after.resourceIds,result.before.resourceIds);assert.ok(result.before.lighting.active>0);assert.equal(result.before.assetDiagnostics.length,0);
    await mkdir(root+'test-results',{recursive:true});await writeFile(root+'test-results/'+item.id+'-thumbnail.jpg',Buffer.from(result.thumbnail.split(',')[1],'base64'));await page.screenshot({path:root+'test-results/'+item.id+'.png'});
    metrics.push({id:item.id,updateMs:result.updateMs,lighting:result.before.lighting,timingMs:result.before.timingMs,programs:result.before.programs,geometries:result.before.geometries,textures:result.before.textures,reconciliation:result.after.reconciliation});
    console.log(item.id,JSON.stringify(metrics.at(-1)));
    if(item.style==='ritual'){
      const structural=await page.evaluate(async scene=>{const {createEntity,validateDocument}=await import('/src/domain/documents.js'),{illuminationDefaults}=await import('/src/domain/dynamic-lighting.js'),v=window.viewport,next=structuredClone(scene),wall=Object.values(next.layout.entities).find(e=>e.kind==='wall');
        for(const kind of ['door','window']){const e=createEntity(kind,{wallId:wall.id,offset:kind==='door'?6:2});next.layout.entities[e.id]=e;}validateDocument(next);v.setDocument(next);await v.ready();await new Promise(r=>setTimeout(r,60));const before=v.getInfo().resourceIds;
        wall.illumination={...illuminationDefaults('lamp',wall),enabled:false};v.setDocument(next);await new Promise(r=>setTimeout(r,60));const after=v.getInfo();
        v.setPreview({entities:[createEntity('floor',{position:[8,0,0]})]});v.setPreview(null);v.setDocument(scene);await v.ready();return {before,after};},scene);
      assert.equal(structural.after.reconciliation.created,0);assert.equal(structural.after.reconciliation.removed,0);assert.deepEqual(structural.after.resourceIds,structural.before);
    }
    await page.evaluate(async scene=>{const v=window.viewport;for(const preset of Object.values(scene.cameraPresets)){v.setCamera(preset);await new Promise(r=>setTimeout(r,50));}v.setLightingQuality('economy');await new Promise(r=>setTimeout(r,50));v.setLightingQuality('high');await new Promise(r=>setTimeout(r,50));},scene);
  }
  assert.deepEqual(errors,[]);await page.evaluate(()=>window.viewport.destroy());await writeFile(root+'test-results/lighting-examples-metrics.json',JSON.stringify({renderer:'Chromium / SwiftShader (correção, sem meta de FPS)',metrics},null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
