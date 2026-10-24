import {once} from 'node:events';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import express from 'express';
import {chromium} from 'playwright';

// Frame cost of the bundled scenes on this machine's GPU, through the same
// viewport as the application. Each camera preset is nudged every frame so
// the on-demand renderer draws; CPU and GPU times come from ?diagnostics.
//   node scripts/benchmark-frames.js [--software] [--no-sharing] [--tactical] [--include-tactical] [--all-cameras] [--dpr=2] [--out=test-results/frames.json] [scene ...]
// --no-sharing draws with one material per instance, to compare under the same machine load.
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2),software=args.includes('--software'),dpr=Number(args.find(a=>a.startsWith('--dpr='))?.slice(6)??1),sharing=!args.includes('--no-sharing'),tactical=args.includes('--tactical'),includeTactical=args.includes('--include-tactical'),allCameras=args.includes('--all-cameras');
const out=args.find(a=>a.startsWith('--out='))?.slice(6)??'test-results/frame-benchmark.json',only=args.filter(a=>!a.startsWith('--'));
const TEMPLO_CAMERAS=new Set(['Ravina de entrada','Salão · olhos','Biblioteca','Visão geral']);
const app=express();
app.get('/',(_req,res)=>res.type('html').send('<link rel="icon" href="data:,"><style>html,body,#viewport{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="viewport"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
app.use('/three',express.static(root+'node_modules/three'));app.use('/src',express.static(root+'src'));app.use(express.static(root+'public'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try {
  browser=await chromium.launch({executablePath:process.env.TABLETOP_BROWSER_PATH||chromium.executablePath(),headless:true,
    args:software?['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--no-sandbox','--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--disable-gpu-vsync','--disable-frame-rate-limit']});
  const report={measuredAt:new Date().toISOString(),viewport:[1600,900],frames:150,scenes:[],...(includeTactical?{tacticalScenes:[]}:{})};
  const sceneFiles=(await readdir(root+'public/scenes')).filter(f=>f.endsWith('.json')&&(!only.length||only.includes(f.replace('.json',''))));
  async function runScene(file,tacticalMode) {
    const sceneId=file.replace('.json',''),document=JSON.parse(await readFile(root+'public/scenes/'+file,'utf8')),page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
    page.setDefaultTimeout(300000);
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);
    const selectedCameras=allCameras||sceneId!=='templo-gelado'?null:[...TEMPLO_CAMERAS];
    const measureWarm=!tacticalMode&&(sceneId==='igreja-antiga'||sceneId==='templo-gelado');
    const result=await page.evaluate(async({doc,frames,sharing,tacticalMode,selectedCameras,measureWarm})=>{
      const summarizeMeasures=()=>{
        const byName={};
        for(const entry of performance.getEntriesByType('measure')){
          if(!entry.name.startsWith('tabletop:'))continue;
          const k=entry.name.slice(9),b=byName[k]??={count:0,totalMs:0,maxMs:0};
          b.count++;b.totalMs+=entry.duration;if(entry.duration>b.maxMs)b.maxMs=entry.duration;
        }
        for(const b of Object.values(byName)){b.totalMs=+b.totalMs.toFixed(2);b.maxMs=+b.maxMs.toFixed(2);}
        return byName;
      };
      const catalog=await(await fetch('/assets/catalog.json')).json();
      if(tacticalMode){
        const c=document.createElement('canvas');c.width=96;c.height=144;const ctx=c.getContext('2d');
        ctx.fillStyle='#d46a4c';ctx.beginPath();ctx.arc(48,36,20,0,Math.PI*2);ctx.fill();ctx.fillRect(26,58,44,72);
        const portraitUrl=c.toDataURL('image/png');
        catalog.assets.push({id:'bench-portrait',revision:1,name:'Retrato',type:'image',url:portraitUrl});
        const look=doc.look??doc.defaultLook;
        look.rendering={...(look.rendering??{}),occlusion:true,silhouettes:true};
        look.sky={...(look.sky??{}),enabled:true,night:{...(look.sky?.night??{}),stars:.9,milkyWay:.75,moonPhase:.35,aurora:{enabled:true,intensity:.7,colorBottom:'#38ef7d',colorTop:'#6e48aa',height:.45,direction:0,speed:.4}}};
        doc.actors??={};doc.tokens??={};
        const target=Object.values(doc.cameraPresets)[0]?.target??[0,0,0];
        for(let i=0;i<8;i++){
          const angle=i*Math.PI/4,r=1.8+(i%2)*1.1,actorId=`bench-actor-${i}`,tokenId=`bench-token-${i}`;
          doc.actors[actorId]={id:actorId,name:`Agente ${i+1}`,color:'#e05a47',assetRef:{id:'bench-portrait',revision:1}};
          doc.tokens[tokenId]={id:tokenId,actorId,footprint:[1,1],transform:{position:[target[0]+Math.cos(angle)*r,target[1],target[2]+Math.sin(angle)*r],rotation:[0,0,0,1],scale:[1,1,1]},figure:{facing:'camera',height:1.7,outline:true,outlineColor:'#0b0b0d',outlineWidth:.02,rim:.35,rimColor:'#ffe2b8',base:'ring',state:i%2?'normal':'dying'}};
        }
      }
      performance.clearMarks();performance.clearMeasures();
      const {createViewport}=await import('/src/render/renderer.js'),v=createViewport(document.getElementById('viewport'));
      const gl=document.querySelector('canvas').getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
      const rendererName=(debug&&gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))||gl.getParameter(gl.RENDERER);
      const started=performance.now();v.setMaterialSharing(sharing);v.setAssets(catalog);v.setPresentation(true);v.setCutaway(false);v.setDocument(doc);
      const presets=Object.values(doc.cameraPresets).filter(p=>!selectedCameras||selectedCameras.includes(p.name));
      v.setCamera(presets[0]);await v.ready();
      const frame=()=>new Promise(r=>requestAnimationFrame(r));
      await frame();
      const loadMs=performance.now()-started,loadBreakdown=summarizeMeasures(),cameras=[];
      for(const preset of presets) {
        v.setCamera(preset);for(let i=0;i<20;i++)await frame();
        v.resetPerformance?.();const intervals=[];let last=performance.now();
        for(let i=0;i<frames;i++){v.setCamera({...preset,position:[preset.position[0]+Math.sin(i*.2)*.02,preset.position[1],preset.position[2]+Math.cos(i*.2)*.02]});await frame();const now=performance.now();intervals.push(now-last);last=now;}
        const info=v.getInfo(),sorted=intervals.sort((a,b)=>a-b),t=info.performance.timingMs,gpu=t.gpuFrame??t.gpu;
        const subsystems=Object.fromEntries(Object.entries(t).map(([k,x])=>[k,{p50:+x.p50.toFixed(3),p95:+x.p95.toFixed(3)}]));
        cameras.push({camera:preset.name,calls:info.calls,triangles:info.triangles,frameMs:{p50:+sorted[frames>>1].toFixed(2),p95:+sorted[Math.floor(frames*.95)].toFixed(2)},renderCpuMs:t.render&&{p50:+t.render.p50.toFixed(2),p95:+t.render.p95.toFixed(2)},gpuMs:gpu&&{p50:+gpu.p50.toFixed(2),p95:+gpu.p95.toFixed(2)},subsystems});
      }
      const info=v.getInfo();v.destroy();
      let warmLoadMs=null,warmLoadBreakdown=null;
      if(measureWarm){
        performance.clearMarks();performance.clearMeasures();
        const wStarted=performance.now(),v2=createViewport(document.getElementById('viewport'));
        v2.setMaterialSharing(sharing);v2.setAssets(catalog);v2.setPresentation(true);v2.setCutaway(false);v2.setDocument(doc);v2.setCamera(presets[0]);await v2.ready();await frame();
        warmLoadMs=+(performance.now()-wStarted).toFixed(1);warmLoadBreakdown=summarizeMeasures();v2.destroy();
      }
      return {renderer:rendererName,pixelRatio:devicePixelRatio,loadMs:+loadMs.toFixed(1),loadBreakdown,...(warmLoadMs!=null?{warmLoadMs,warmLoadBreakdown}:{}),geometries:info.geometries,textures:info.textures,cameras};
    },{doc:document,frames:report.frames,sharing,tacticalMode,selectedCameras,measureWarm});
    await page.close();
    const r=n=>n==null?'—':n.toFixed(1);
    console.log(`${sceneId}${tacticalMode?' [tático+noite+8 figuras]':''} · ${result.renderer} · carga ${Math.round(result.loadMs)} ms${result.warmLoadMs?` (quente ${Math.round(result.warmLoadMs)} ms)`:''}`);
    for(const c of result.cameras)console.log(`  ${c.camera}: ${c.calls} chamadas, ${Math.round(c.triangles/1000)}k triângulos, quadro p50 ${r(c.frameMs.p50)} / p95 ${r(c.frameMs.p95)} ms, CPU ${r(c.renderCpuMs?.p50)} ms, GPU ${r(c.gpuMs?.p50)} ms`);
    return {scene:sceneId,tactical:tacticalMode,...result};
  }
  for(const file of sceneFiles) report.scenes.push(await runScene(file,tactical));
  if(includeTactical) for(const file of sceneFiles) report.tacticalScenes.push(await runScene(file,true));
  await mkdir(root+'test-results',{recursive:true});await writeFile(root+out,JSON.stringify(report,null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
