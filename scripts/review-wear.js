import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import express from 'express';
import {chromium} from 'playwright';

// Library models with wear applied, on this machine's GPU, to judge wear settings.
//   node scripts/review-wear.js [out.png]
const out=process.argv[2]??'test-results/wear-review.png',app=express();
app.get('/',(_req,res)=>res.type('html').send(`<style>body{margin:0;background:#182027}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>`));
app.use('/three',express.static('node_modules/three'));app.use('/src',express.static('src'));app.use(express.static('public'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;
const edge=(type,extra={})=>({enabled:true,type,placement:'edges',amount:.8,size:.5,seed:42,center:[.5,.5,.5],radius:.4,softness:.5,...extra});
const samples=[
  ['Sem desgaste','tool-chest',null],['Uso nas bordas','tool-chest',edge('bare',{color:'#b3ada0',roughness:.5,metalness:.3,relief:.004,edgeWidth:.025})],
  ['Ferrugem nas bordas','dumpster',edge('rust',{color:'#8a4829',roughness:.9,metalness:.08,relief:.012,edgeWidth:.06})],['Sujeira nas bordas','fridge',edge('grime',{color:'#463c30',roughness:.94,metalness:0,relief:.008,edgeWidth:.05})],
  ['Uso nas bordas','desk',edge('bare',{color:'#c9b08a',roughness:.7,metalness:0,relief:.004,edgeWidth:.02})],['Uso nas bordas','locker',edge('bare',{color:'#b3ada0',roughness:.5,metalness:.3,relief:.004,edgeWidth:.02})],
];
try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1500,height:560}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async samples=>{
    const THREE=await import('three'),{recipeInstance}=await import('/src/render/asset-cache.js'),{createSurfaceLibrary,applySurfaceTextures}=await import('/src/render/surface-materials.js');
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1500,560);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.append(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#283139');scene.add(new THREE.HemisphereLight('#ecf1fa','#6d655b',1.8));
    const key=new THREE.DirectionalLight('#fff0d7',3);key.position.set(-2,4,3);scene.add(key);
    const camera=new THREE.PerspectiveCamera(30,250/540,.01,50),library=createSurfaceLibrary();renderer.setScissorTest(true);
    for(const [i,[name,id,wear]] of samples.entries()) {
      const object=recipeInstance(await(await fetch(`/assets/models/${id}.json`)).json());scene.add(object);object.updateMatrixWorld(true);
      applySurfaceTextures(object,{kind:'prop',material:{texture:'none',...(wear?{wear}:{})}},library);
      const size=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()),reach=Math.max(size.x,size.y,size.z);
      camera.position.set(reach*1.3,size.y*.5+reach*.9,reach*1.9);camera.lookAt(0,size.y*.45,0);
      const x=i*250;renderer.setViewport(x,0,250,540);renderer.setScissor(x,0,250,540);renderer.render(scene,camera);scene.remove(object);
      const label=document.createElement('div');label.textContent=name;label.style.cssText=`position:absolute;left:${x}px;top:8px;width:250px;text-align:center;font:13px system-ui;color:#e5dfcf`;document.body.append(label);
    }
  },samples);
  await mkdir('test-results',{recursive:true});await page.screenshot({path:out});
  if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
