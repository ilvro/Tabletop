// CPU profile of the render loop on this machine's GPU: where a frame's script
// time goes, by function. node scripts/profile-frames.js [scene]
import {once} from 'node:events';import {readFile} from 'node:fs/promises';import express from 'express';import {chromium} from 'playwright';
const root=process.cwd()+'/',scene=process.argv[2]??'backrooms',app=express();
app.get('/',(_q,res)=>res.type('html').send('<style>html,body,#viewport{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="viewport"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
app.use('/three',express.static(root+'node_modules/three'));app.use('/src',express.static(root+'src'));app.use(express.static(root+'public'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist','--disable-gpu-vsync','--disable-frame-rate-limit']});
const page=await browser.newPage({viewport:{width:1600,height:900}});page.setDefaultTimeout(300000);
const doc=JSON.parse(await readFile(root+`public/scenes/${scene}.json`,'utf8'));
await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);
await page.evaluate(async doc=>{const {createViewport}=await import('/src/render/renderer.js');const v=window.v=createViewport(document.getElementById('viewport'));v.setAssets(await(await fetch('/assets/catalog.json')).json());v.setPresentation(true);v.setCutaway(false);v.setDocument(doc);v.setCamera(Object.values(doc.cameraPresets)[0]);await v.ready();for(let i=0;i<30;i++)await new Promise(r=>requestAnimationFrame(r));},doc);
const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:200});await cdp.send('Profiler.start');
const info=await page.evaluate(async doc=>{const preset=Object.values(doc.cameraPresets)[0];for(let i=0;i<200;i++){v.setCamera({...preset,position:[preset.position[0]+Math.sin(i*.2)*.02,preset.position[1],preset.position[2]+Math.cos(i*.2)*.02]});await new Promise(r=>requestAnimationFrame(r));}const i=v.getInfo();return {calls:i.calls,sharing:i.materialSharing,counts:i.performance.counts,t:Object.fromEntries(Object.entries(i.performance.timingMs).map(([k,x])=>[k,+x.p50.toFixed(2)]))};},doc);
const {profile}=await cdp.send('Profiler.stop');const self=new Map(),dt=profile.timeDeltas,byId=new Map(profile.nodes.map(n=>[n.id,n]));
profile.samples.forEach((id,i)=>{const n=byId.get(id),k=n.callFrame.functionName+' '+n.callFrame.url.split('/').slice(-1)[0]+':'+n.callFrame.lineNumber;self.set(k,(self.get(k)??0)+dt[i]);});
const total=[...self.values()].reduce((a,b)=>a+b,0);console.log(JSON.stringify(info));
console.log([...self].sort((a,b)=>b[1]-a[1]).slice(0,28).map(([k,v])=>(v/total*100).toFixed(1).padStart(5)+'% '+k).join('\n'));
await browser.close();server.close();
