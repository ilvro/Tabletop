import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import express from 'express';
import {chromium} from 'playwright';

// The same viewport used by the application. No baked scenery or external art.
const root=fileURLToPath(new URL('../',import.meta.url)),app=express();
app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><style>html,body,#viewport{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="viewport"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
app.use('/three',express.static(root+'node_modules/three'));app.use('/src',express.static(root+'src'));app.use(express.static(root+'public'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try {
  const original=JSON.parse(await readFile(root+'public/scenes/igreja-antiga.json','utf8'));
  browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1000,height:650},reducedMotion:'reduce'}),errors=[];
  page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async doc=>{
    const {createViewport}=await import('/src/render/renderer.js');window.viewport=createViewport(document.getElementById('viewport'));
    const v=window.viewport;v.setAssets(await(await fetch('/assets/catalog.json')).json());v.setPresentation(true);v.setCutaway(false);v.setDocument(doc);v.setCamera(Object.values(doc.cameraPresets)[0]);await v.ready();
    await new Promise(r=>setTimeout(r,100));
  },original);
  await mkdir(root+'test-results',{recursive:true});const metrics=[];
  const selected=process.argv.slice(2).filter(x=>/^\d+$/.test(x)).map(Number);
  for(const [index,preset]of Object.values(original.cameraPresets).entries()) {
    if(selected.length&&!selected.includes(index+1))continue;
    const stats=await page.evaluate(async({preset,index,doc})=>{
      const v=window.viewport,next=structuredClone(doc);if(index>=8)for(const layer of Object.values(next.layout.layers))if(layer.name.startsWith('Coberturas'))layer.visible=false;
      v.setDocument(next);v.setCamera(preset);await v.ready();await new Promise(r=>setTimeout(r,100));return v.getInfo();
    },{preset,index,doc:original});
    assert.deepEqual(stats.assetDiagnostics,[]);assert.ok(stats.lighting.active>0);assert.ok(stats.calls>0);
    await page.screenshot({path:root+`test-results/church-view-${String(index+1).padStart(2,'0')}.png`});
    if(index===0) {
      const thumbnail=await page.evaluate(()=>window.viewport.captureThumbnail());await writeFile(root+'test-results/church-thumbnail.jpg',Buffer.from(thumbnail.split(',')[1],'base64'));
    }
    metrics.push({camera:preset.name,calls:stats.calls,triangles:stats.triangles,textures:stats.textures,lighting:stats.lighting,timingMs:stats.timingMs});console.log(JSON.stringify(metrics.at(-1)));
  }
  const check=await page.evaluate(async doc=>{
    const v=window.viewport;v.setDocument(doc);await v.ready();const before=v.getInfo(),next=structuredClone(doc),source=Object.values(next.layout.entities).find(e=>e.illumination);source.illumination.intensity*=.9;
    v.setDocument(next);await new Promise(r=>setTimeout(r,60));const after=v.getInfo();v.setDocument(doc);return {before:before.resourceIds,after:after.resourceIds,reconciliation:after.reconciliation};
  },original);
  assert.deepEqual(check.before,check.after);assert.equal(check.reconciliation.created,0);assert.equal(check.reconciliation.removed,0);assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.viewport.destroy());await writeFile(root+`test-results/church-metrics${selected.length?'-selected-'+selected.join('-'):''}.json`,JSON.stringify({renderer:'Chromium / SwiftShader; não é benchmark presencial',metrics},null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
