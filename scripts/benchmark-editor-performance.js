// Isolated real editor flow. All repository writes stay in a temporary directory/profile.
// Build first; run separately from graphics tests. SwiftShader is not hardware FPS.
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';

const names=(process.argv.find(a=>a.startsWith('--scenes='))?.slice(9)??'casa-de-bairro,snowy-mountain-pass,igreja-antiga').split(',');
const output=process.argv.find(a=>a.startsWith('--out='))?.slice(6)??'test-results/performance-editor.json';
const dataDir=await mkdtemp(path.join(os.tmpdir(),'tabletop-editor-performance-'));
let server,browser;
const report={measuredAt:new Date().toISOString(),method:{renderer:'SwiftShader',viewport:[1200,800],deviceScaleFactor:1,reducedMotion:'reduce',samples:6,warmup:2,note:'Scripted DOM change events run the real application handlers. nextFrameMs waits two rAF callbacks, not physical display presentation. No pre-implementation baseline for this real-editor flow; do not compare it with isolated store times.'},results:[]};
try{
  server=(await createApp({dataDir})).listen(0,'127.0.0.1');await once(server,'listening');
  browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browser=browser.version();
  for(const name of names){
    process.stderr.write(`Editor: ${name}\n`);
    const context=await browser.newContext({viewport:{width:1200,height:800},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
    try{
      await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);await page.waitForFunction(()=>!!window.__tabletop);
      if(name.startsWith('lighting-')) {
        const fixture=await readFile(new URL(`../tests/fixtures/scenes/${name}.json`,import.meta.url));
        await page.locator('#document-json-file').setInputFiles({name:name+'.json',mimeType:'application/json',buffer:fixture});
      } else { await page.locator('[data-action="open"]').first().click();await page.locator(`[data-open-example="${name}"]`).click(); }
      await page.waitForFunction(()=>Object.keys(window.__tabletop.snapshot().layout.entities).length>0);await page.evaluate(()=>window.__tabletop.ready());
      await page.locator('[data-tab="scene"]').click();
      for(const withProjector of [false,true]){
        let projector;
        if(withProjector){const node=page.locator('[data-action="presentation-window"]').first();await node.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});const pending=page.waitForEvent('popup');await node.click();projector=await pending;await projector.waitForFunction(()=>document.getElementById('presentation-message')?.hidden);await page.bringToFront();}
        const result=await page.evaluate(async withProjector=>{
          const api=window.__tabletop,frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          const summary=values=>{const s=[...values].sort((a,b)=>a-b);return {p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],max:s.at(-1)};};
          const entity=Object.values(api.snapshot().layout.entities).find(e=>e.illumination&&!e.locked)??Object.values(api.snapshot().layout.entities).find(e=>!e.locked&&!e.anchor);
          document.querySelector(`[data-select="${entity.id}"]`).click();await frame();
          const run=async(field,values)=>{
            const input=document.querySelector(`[data-field="${field}"]`);if(!input)return null;
            const duration=[],frames=[];let stableNode=true;
            for(let i=0;i<8;i++){
              const node=document.querySelector(`[data-field="${field}"]`);node.value=String(values(i));
              const start=performance.now();node.dispatchEvent(new Event('change',{bubbles:true}));const handler=performance.now()-start;await frame();
              stableNode&&=node===document.querySelector(`[data-field="${field}"]`);if(i>=2){duration.push(handler);frames.push(performance.now()-start);}
            }return {handlerMs:summary(duration),nextFrameMs:summary(frames),stableNode};
          };
          await run('object-name',i=>`Aquecimento ${i}`);api.resetPerformance();
          const rename=await run('object-name',i=>`Medição ${withProjector?'projetor':'editor'} ${i}`),afterRename=api.performance();
          api.resetPerformance();const intensity=entity.illumination?await run('illumination-intensity',i=>entity.illumination.intensity+i+1):null;
          await new Promise(resolve=>setTimeout(resolve,1500));return {withProjector,rename,afterRename,intensity,afterIntensity:api.performance(),resources:{programs:api.stats().programs,geometries:api.stats().geometries,textures:api.stats().textures}};
        },withProjector);
        report.results.push({name,...result,errors:[...errors]});await projector?.close();
      }
    }finally{await context.close();}
  }
}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await rm(dataDir,{recursive:true,force:true});}
await mkdir(path.dirname(path.resolve(output)),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify(report,null,2)+'\n');
