import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';

test('snow exposure and coats use authored roofs across isolated levels, including after rebuilding the scene',{timeout:60_000},async t=>{
  const app=express();app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><div id="view" style="width:500px;height:500px"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/three',express.static(path.resolve('node_modules/three')));app.use('/src',express.static(path.resolve('src')));const server=app.listen(0,'127.0.0.1');await once(server,'listening');const browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});t.after(async()=>{await browser.close();await new Promise(r=>server.close(r));});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async()=>{
    const {createViewport}=await import('/src/render/renderer.js'),{createScene,createEntity,createLevel}=await import('/src/domain/documents.js'),{coverageDefaults}=await import('/src/domain/materials.js');
    const doc=createScene(),lower=createLevel({elevation:0}),upper=createLevel({elevation:3});doc.layout.levels={[lower.id]:lower,[upper.id]:upper};doc.look.effectsPaused=true;
    const coverage={...coverageDefaults(),physicalThickness:.3,variation:0};
    const terrain=createEntity('terrain',{segments:4,width:10,length:10,levelId:lower.id,material:{coverage}}),inside=createEntity('floor',{position:[0,.5,0],width:2,length:2,levelId:lower.id,material:{coverage}}),roof=createEntity('floor',{position:[0,3,0],width:4,length:4,levelId:upper.id}),outside=createEntity('floor',{position:[5,3,0],width:2,length:2,levelId:upper.id,material:{coverage}});
    for(const e of [terrain,inside,roof,outside])doc.layout.entities[e.id]=e;
    const viewport=createViewport(document.getElementById('view')),frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    try {
      viewport.setDocument(doc);await frame();const snowPoint=viewport.project([5,3.3,-.92]),picked=viewport.pick({clientX:snowPoint.x,clientY:snowPoint.y});const normal=viewport.getInfo().snowCoats,mask=viewport.computeSnowExposure(terrain.id);
      viewport.setIsolatedLevel(lower.id);const isolatedMask=viewport.computeSnowExposure(terrain.id);viewport.setDocument(doc);await frame();const isolated=viewport.getInfo().snowCoats;
      viewport.setIsolatedLevel(null);await frame();const restored=viewport.getInfo().snowCoats;
      return {normal,isolated,restored,mask,isolatedMask,picked,inside:inside.id,outside:outside.id};
    }finally {viewport.destroy();}
  });assert.ok(!result.normal.some(c=>c.id===result.inside));assert.ok(result.normal.some(c=>c.id===result.outside));assert.equal(result.picked.entityId,result.outside);assert.deepEqual(result.isolatedMask,result.mask);assert.equal(result.mask[12],0);assert.equal(result.mask[0],1);assert.deepEqual(result.isolated,result.normal);assert.deepEqual(result.restored,result.normal);assert.deepEqual(errors,[]);
});
