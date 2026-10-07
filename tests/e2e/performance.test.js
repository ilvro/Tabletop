import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

async function fixture(t){
  const app=express();app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><div id="viewport" style="width:800px;height:450px"></div>'));
  app.use('/src',express.static(path.resolve('src')));app.use('/three',express.static(path.resolve('node_modules/three')));app.use(express.static(path.resolve('public')));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  t.after(async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));});
  const page=await browser.newPage({reducedMotion:'reduce'});await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);return page;
}

test('Pages migrates v1 summaries without losing documents, previews, backups or conflicts at scale',{timeout:120000},async t=>{
  const page=await fixture(t);
  const result=await page.evaluate(async()=>{
    const {createBrowserRepository}=await import('/src/data/browser-repository.js'),{createScene}=await import('/src/domain/documents.js');
    const databaseName=`migration-${crypto.randomUUID()}`,scene={...createScene('Legado'),revision:1},key=`scene:${scene.id}`,cover='data:image/jpeg;base64,/9j/2Q==';
    await new Promise((resolve,reject)=>{const request=indexedDB.open(databaseName,1);request.onupgradeneeded=()=>{for(const store of ['documents','assets','metadata','backups'])request.result.createObjectStore(store);};
      request.onsuccess=()=>{const db=request.result,tx=db.transaction(['documents','metadata','backups'],'readwrite');tx.objectStore('documents').put(scene,key);tx.objectStore('metadata').put({previewKey:key,revision:1,image:cover},`preview:${key}`);tx.objectStore('backups').put(scene,`${key}:1`);tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};request.onerror=()=>reject(request.error);});
    const repo=createBrowserRepository({databaseName}),other=createBrowserRepository({databaseName}),initial=await repo.list('scene',{previews:false}),preview=await repo.readPreview(initial[0]),read=await repo.read(scene.id);
    const observations=[];let count=1;
    for(const target of [10,50,200]){while(count<target){await repo.create(createScene(`Cena ${count}`));count++;}const [a,b]=await Promise.all([repo.list('scene',{previews:false}),other.list('scene',{previews:false})]);observations.push([a.length,b.length,a.every(doc=>!doc.layout&&!doc.preview)]);}
    const writes=await Promise.allSettled([repo.save({...read,name:'A'}),other.save({...read,name:'B'})]);
    const current=await repo.read(scene.id),compact=(await repo.list('scene',{previews:false})).find(doc=>doc.id===scene.id),legacy=(await repo.list()).find(doc=>doc.id===scene.id);
    await repo.savePreview(current,cover);const copy=await repo.duplicate(current),copySummary=(await repo.list()).find(doc=>doc.id===copy.id);
    await repo.remove(copy);const remaining=(await repo.list('scene',{previews:false})).length;
    const backupCount=await new Promise((resolve,reject)=>{const request=indexedDB.open(databaseName);request.onsuccess=()=>{const db=request.result,tx=db.transaction('backups'),count=tx.objectStore('backups').count();count.onsuccess=()=>resolve(count.result);tx.oncomplete=()=>db.close();};request.onerror=()=>reject(request.error);});
    repo.dispose();other.dispose();return {initial,preview:preview.image,readName:read.name,observations,conflicts:writes.map(w=>w.status==='fulfilled'?200:w.reason.status).sort(),revision:current.revision,compact,legacy:legacy.preview,copyRevision:copySummary.previewRevision,remaining,backupCount};
  });
  assert.equal(result.initial.length,1);assert.equal(result.initial[0].preview,undefined);assert.equal(result.initial[0].previewRevision,1);
  assert.equal(result.preview,result.legacy);assert.equal(result.readName,'Legado');assert.deepEqual(result.observations,[[10,10,true],[50,50,true],[200,200,true]]);
  assert.deepEqual(result.conflicts,[200,409]);assert.equal(result.revision,2);assert.equal(result.compact.previewRevision,1);assert.equal(result.copyRevision,1);assert.equal(result.remaining,200);assert.ok(result.backupCount>=1);
});

test('panel reconciliation retains live controls, selection, focus and preset options',{timeout:60000},async t=>{
  const page=await fixture(t);
  const result=await page.evaluate(async()=>{
    const {reconcileElement}=await import('/src/ui/reconcile.js');
    const panel=document.createElement('div');panel.innerHTML='<details data-disclosure="a" open><input data-field="name" value="Texto"><select data-field="preset"><option value="old">Antigo</option></select></details>';document.body.append(panel);
    const input=panel.querySelector('input'),select=panel.querySelector('select'),details=panel.querySelector('details');input.focus();input.setSelectionRange(1,3);
    const desired=panel.cloneNode(true);desired.querySelector('select').innerHTML='<option value="old">Antigo</option><option value="new">Novo</option>';desired.querySelector('select').value='new';
    reconcileElement(panel,desired);
    const preserved={input:panel.querySelector('input')===input,select:panel.querySelector('select')===select,focus:document.activeElement===input,selection:[input.selectionStart,input.selectionEnd],open:details.open,value:select.value};
    const next=panel.cloneNode(true);next.querySelector('input').value='Desfeito';reconcileElement(panel,next);preserved.restored=input.value;return preserved;
  });
  assert.deepEqual(result,{input:true,select:true,focus:true,selection:[1,3],open:true,value:'new',restored:'Desfeito'});
});

test('rename and repeated setters preserve resources and shadows; thumbnail leaves the visible canvas intact',{timeout:120000},async t=>{
  const page=await fixture(t),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const result=await page.evaluate(async()=>{
    const {createViewport}=await import('/src/render/renderer.js'),{createScene,createEntity}=await import('/src/domain/documents.js'),{createSceneStore}=await import('/src/state/scene-store.js');
    const {WEATHER_DEFAULTS}=await import('/src/domain/lighting.js');
    const scene=createScene('Cena'),floor=createEntity('floor',{width:6,length:6});scene.look.effectsPaused=true;scene.look.weather={...WEATHER_DEFAULTS,type:'snow',count:64,speed:0,particleSize:.2};scene.layout.entities[floor.id]=floor;const store=createSceneStore(scene);
    const viewport=createViewport(document.getElementById('viewport'));
    try{
      viewport.setDocument(store.document);viewport.frameScene();await viewport.ready();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const before=viewport.getInfo();viewport.resetPerformance();
      store.execute('entity.update',{id:floor.id,patch:{name:'Outro nome'}});viewport.setDocument(store.document);
      for(let i=0;i<10;i++){viewport.setDocument(store.document);viewport.setIsolatedLevel(null);viewport.setSupportSurface(null);viewport.setWorkplaneHeight(0);viewport.setSelection(null,[]);}
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const after=viewport.getInfo();
      window.__performanceFixture={viewport,store};viewport.setSuspended(true);return {before:{resources:before.resourceIds,programs:before.programs,geometries:before.geometries},after:{resources:after.resourceIds,programs:after.programs,geometries:after.geometries},counts:after.performance.counts};
    }catch(error){viewport.destroy();store.dispose();throw error;}
  });
  const visible=await page.locator('#viewport canvas').screenshot();
  const capture=await page.evaluate(async()=>{const {viewport}=window.__performanceFixture,camera=viewport.getCamera(),cover=await viewport.captureThumbnailAsync(),image=new Image();image.src=cover;await image.decode();return {unchangedCamera:JSON.stringify(camera)===JSON.stringify(viewport.getCamera()),size:[image.width,image.height]};});
  const intact=visible.equals(await page.locator('#viewport canvas').screenshot());
  await page.evaluate(()=>{window.__performanceFixture.viewport.destroy();window.__performanceFixture.store.dispose();});
  assert.deepEqual(errors,[]);assert.deepEqual(result.after,result.before);assert.equal(result.counts.globalShadowInvalidations??0,0);assert.equal(result.counts.shadowFrames??0,0);assert.equal(result.counts.documentUpdatesSkipped,10);assert.equal(intact,true);assert.equal(capture.unchangedCamera,true);assert.deepEqual(capture.size,[480,270]);
});

test('numeric surface edits reuse the compiled GPU program even for a single textured object',{timeout:120000},async t=>{
  const page=await fixture(t),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const result=await page.evaluate(async()=>{
    let compilations=0;const original=WebGL2RenderingContext.prototype.createProgram;WebGL2RenderingContext.prototype.createProgram=function(...args){compilations++;return original.apply(this,args);};
    const {createViewport}=await import('/src/render/renderer.js'),{createScene,createEntity}=await import('/src/domain/documents.js'),{createSceneStore}=await import('/src/state/scene-store.js');
    const scene=createScene(),floor=createEntity('floor',{material:{texture:'rock',rockPattern:'organic',textureSize:2}});scene.look.effectsPaused=true;scene.layout.entities[floor.id]=floor;
    const store=createSceneStore(scene),viewport=createViewport(document.getElementById('viewport')),frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    try{viewport.setDocument(store.document);await viewport.ready();await frame();const counts=[compilations],programs=[viewport.getInfo().programs];
      for(const material of [{textureSize:3},{textureSeed:70},{textureColor:'#537159'},{color:'#bbbbbb'},{roughness:.4}]){
        store.execute('entity.update',{id:floor.id,patch:{material}});viewport.setDocument(store.document);await viewport.ready();await frame();counts.push(compilations);programs.push(viewport.getInfo().programs);
      }return {counts,programs};
    }finally{viewport.destroy();store.dispose();WebGL2RenderingContext.prototype.createProgram=original;}
  });assert.deepEqual(errors,[]);assert.ok(result.counts.every(n=>n===result.counts[0]),JSON.stringify(result));assert.ok(result.programs.every(n=>n===result.programs[0]),JSON.stringify(result));
});

test('regional snow after moving/removing a roof matches a full scene rebuild',{timeout:120000},async t=>{
  const page=await fixture(t),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const result=await page.evaluate(async()=>{
    const {createViewport}=await import('/src/render/renderer.js'),{createScene,createEntity}=await import('/src/domain/documents.js'),{createSceneStore}=await import('/src/state/scene-store.js'),{coverageDefaults}=await import('/src/domain/materials.js');
    const scene=createScene(),coverage={...coverageDefaults(),physicalThickness:.2,variation:0},roof=createEntity('floor',{position:[0,3,0],width:3,length:3});scene.look.effectsPaused=true;
    for(const entity of [roof,createEntity('floor',{position:[0,0,0],width:2,length:2,material:{coverage}}),createEntity('floor',{position:[5,0,0],width:2,length:2,material:{coverage}})])scene.layout.entities[entity.id]=entity;
    const store=createSceneStore(scene),viewport=createViewport(document.getElementById('viewport')),frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),observations=[];
    const capture=async()=>({coats:viewport.getInfo().snowCoats,image:await viewport.captureThumbnailAsync()});
    try{viewport.setDocument(store.document);viewport.frameScene();await viewport.ready();await frame();
      for(const [type,payload]of [['entity.update',{id:roof.id,patch:{transform:{position:[5,3,0]}}}],['entity.remove',{id:roof.id}]]){
        store.execute(type,payload,{snap:false});viewport.setDocument(store.document);await viewport.ready();await frame();const regional=await capture();viewport.setDocument(store.document,{force:true});await viewport.ready();await frame();const full=await capture();observations.push({coats:JSON.stringify(regional.coats)===JSON.stringify(full.coats),pixels:regional.image===full.image,...(regional.image!==full.image?{regional:regional.image,full:full.image}:{})});
      }return observations;
    }finally{viewport.destroy();store.dispose();}
  });assert.deepEqual(errors,[]);await mkdir('test-results',{recursive:true});for(const [i,observation]of result.entries())for(const field of ['regional','full'])if(observation[field]){await writeFile(`test-results/snow-${i}-${field}.jpg`,Buffer.from(observation[field].split(',')[1],'base64'));delete observation[field];}assert.deepEqual(result,[{coats:true,pixels:true},{coats:true,pixels:true}]);
});

test('disposing background previews preserves subsequent editor thumbnail pixels',{timeout:60000},async t=>{
  const page=await fixture(t),errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const result=await page.evaluate(async()=>{
    const {createViewport}=await import('/src/render/renderer.js'),{createScene,createEntity}=await import('/src/domain/documents.js'),{createScenePreviewRenderer}=await import('/src/render/scene-preview.js');
    const scene=createScene('Capa'),floor=createEntity('floor',{width:8,length:6});scene.layout.entities[floor.id]=floor;
    const viewport=createViewport(document.getElementById('viewport'));viewport.setDocument(scene);viewport.frameScene();await viewport.ready();viewport.setSuspended(true);
    try{
      const before=await viewport.captureThumbnailAsync(),covers=[];
      for(let i=0;i<3;i++){
        const background=createScenePreviewRenderer();try{await background.render(scene,[]);}finally{background.dispose();}
        covers.push(await viewport.captureThumbnailAsync());
      }
      const image=new Image();image.src=before;await image.decode();const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const context=canvas.getContext('2d');context.drawImage(image,0,0);const bytes=context.getImageData(0,0,480,270).data,colours=new Set();for(let i=0;i<bytes.length;i+=64)colours.add(`${bytes[i]>>3},${bytes[i+1]>>3},${bytes[i+2]>>3}`);return {before,covers,colours:colours.size};
    }finally{viewport.destroy();}
  });
  assert.deepEqual(errors,[]);assert.ok(result.colours>20,'reference cover contains real geometry');assert.ok(result.covers.every(image=>image===result.before),'editor JPEG remains identical after other viewport disposal');
});
