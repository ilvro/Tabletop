import {once} from 'node:events';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import express from 'express';
import {chromium} from 'playwright';

// Screenshots of bundled scene cameras on this machine's GPU, with effects
// paused, for before/after comparison of rendering changes.
//   node scripts/capture-views.js <out-dir> [--no-ao] [--dpr=2] <scene>:<camera>[,<camera>] ...
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2),noAo=args.includes('--no-ao'),dpr=Number(args.find(a=>a.startsWith('--dpr='))?.slice(6)??1),[out,...views]=args.filter(a=>!a.startsWith('--')),app=express();
app.get('/',(_q,res)=>res.type('html').send('<style>html,body,#viewport{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="viewport"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
app.use('/three',express.static(root+'node_modules/three'));app.use('/src',express.static(root+'src'));app.use(express.static(root+'public'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try {
  await mkdir(out,{recursive:true});
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist']});
  for(const view of views) {
    const [scene,list]=view.split(':'),doc=JSON.parse(await readFile(`${root}public/scenes/${scene}.json`,'utf8')),page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:dpr});page.setDefaultTimeout(300000);
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(async doc=>{const {createViewport}=await import('/src/render/renderer.js'),v=window.viewport=createViewport(document.getElementById('viewport'));v.setAssets(await(await fetch('/assets/catalog.json')).json());v.setPresentation(true);v.setCutaway(false);v.setDocument(doc);await v.ready();},{...doc,look:{...doc.look,effectsPaused:true,rendering:{...doc.look.rendering,...(noAo?{ao:false}:{})}}});
    for(const index of list.split(',').map(Number)) {
      await page.evaluate(async preset=>{const v=window.viewport;v.setCamera(preset);await v.ready();for(let i=0;i<8;i++)await new Promise(r=>requestAnimationFrame(r));},Object.values(doc.cameraPresets)[index-1]);
      await page.screenshot({path:`${out}/${scene}-${index}.png`});
    }
    await page.close();
  }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
