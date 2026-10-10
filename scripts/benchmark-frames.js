import {once} from 'node:events';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import express from 'express';
import {chromium} from 'playwright';

// Frame cost of the bundled scenes on this machine's GPU, through the same
// viewport as the application. Each camera preset is nudged every frame so
// the on-demand renderer draws; CPU and GPU times come from ?diagnostics.
//   node scripts/benchmark-frames.js [--software] [--no-sharing] [--dpr=2] [--out=test-results/frames.json] [scene ...]
// --no-sharing draws with one material per instance, to compare under the same machine load.
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2),software=args.includes('--software'),dpr=Number(args.find(a=>a.startsWith('--dpr='))?.slice(6)??1),sharing=!args.includes('--no-sharing');
const out=args.find(a=>a.startsWith('--out='))?.slice(6)??'test-results/frame-benchmark.json',only=args.filter(a=>!a.startsWith('--'));
const app=express();
app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><style>html,body,#viewport{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="viewport"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
app.use('/three',express.static(root+'node_modules/three'));app.use('/src',express.static(root+'src'));app.use(express.static(root+'public'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try {
  browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,
    args:software?['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--no-sandbox','--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--disable-gpu-vsync','--disable-frame-rate-limit']});
  const report={measuredAt:new Date().toISOString(),viewport:[1600,900],frames:150,scenes:[]};
  for(const file of (await readdir(root+'public/scenes')).filter(f=>f.endsWith('.json')&&(!only.length||only.includes(f.replace('.json',''))))) {
    const document=JSON.parse(await readFile(root+'public/scenes/'+file,'utf8')),page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:dpr,reducedMotion:'reduce'});
    page.setDefaultTimeout(300000);
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);
    const result=await page.evaluate(async({doc,frames,sharing})=>{
      const {createViewport}=await import('/src/render/renderer.js'),v=createViewport(document.getElementById('viewport'));
      const gl=document.querySelector('canvas').getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
      const started=performance.now();v.setMaterialSharing(sharing);v.setAssets(await(await fetch('/assets/catalog.json')).json());v.setPresentation(true);v.setCutaway(false);v.setDocument(doc);v.setCamera(Object.values(doc.cameraPresets)[0]);await v.ready();
      const loadMs=performance.now()-started,frame=()=>new Promise(r=>requestAnimationFrame(r)),cameras=[];
      for(const preset of Object.values(doc.cameraPresets)) {
        v.setCamera(preset);for(let i=0;i<20;i++)await frame();
        v.performance?.();const intervals=[];let last=performance.now();
        for(let i=0;i<frames;i++){v.setCamera({...preset,position:[preset.position[0]+Math.sin(i*.2)*.02,preset.position[1],preset.position[2]+Math.cos(i*.2)*.02]});await frame();const now=performance.now();intervals.push(now-last);last=now;}
        const info=v.getInfo(),sorted=intervals.sort((a,b)=>a-b),t=info.performance.timingMs;
        cameras.push({camera:preset.name,calls:info.calls,triangles:info.triangles,frameMs:{p50:sorted[frames>>1],p95:sorted[Math.floor(frames*.95)]},renderCpuMs:t.render&&{p50:t.render.p50,p95:t.render.p95},gpuMs:t.gpu&&{p50:t.gpu.p50,p95:t.gpu.p95}});
      }
      const info=v.getInfo();v.destroy();
      return {renderer:(debug&&gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))||gl.getParameter(gl.RENDERER),pixelRatio:devicePixelRatio,loadMs,geometries:info.geometries,textures:info.textures,cameras};
    },{doc:document,frames:report.frames,sharing});
    await page.close();report.scenes.push({scene:file.replace('.json',''),...result});
    const r=n=>n==null?'—':n.toFixed(1);
    console.log(`${file.replace('.json','')} · ${result.renderer} · carga ${Math.round(result.loadMs)} ms`);
    for(const c of result.cameras)console.log(`  ${c.camera}: ${c.calls} chamadas, ${Math.round(c.triangles/1000)}k triângulos, quadro p50 ${r(c.frameMs.p50)} / p95 ${r(c.frameMs.p95)} ms, CPU ${r(c.renderCpuMs?.p50)} ms, GPU ${r(c.gpuMs?.p50)} ms`);
  }
  await mkdir(root+'test-results',{recursive:true});await writeFile(root+out,JSON.stringify(report,null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
