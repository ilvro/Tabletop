import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import express from 'express';
import {chromium} from 'playwright';
const app=express();
app.get('/',(_req,res)=>res.type('html').send(`<style>body{margin:0;background:#182027;font:13px system-ui;color:#e5dfcf}canvas{position:absolute;inset:0}.label{position:absolute;width:280px;text-align:center;pointer-events:none}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>`));
app.use('/three',express.static('node_modules/three'));app.use('/src',express.static('src'));app.use('/before',express.static('test-results/library-before'));app.use(express.static('public'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1400,height:1040}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async()=>{
    const THREE=await import('three'),{recipeInstance,disposeObject}=await import('/src/render/asset-cache.js'),{createSurfaceLibrary,applySurfaceMaterial}=await import('/src/render/surface-materials.js');
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1400,1040);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;document.body.append(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#283139');scene.add(new THREE.HemisphereLight('#ecf1fa','#6d655b',2.2));
    for(const [position,color,intensity] of [[[-3,5,4],'#fff0d7',3.5],[[3,3,-2],'#c1d8f7',2]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(...position);scene.add(light);}
    const camera=new THREE.PerspectiveCamera(36,280/240,.01,50);camera.position.set(3.1,2.4,4.2);camera.lookAt(0,.95,0);
    const library=createSurfaceLibrary();
    window.catalog=(await(await fetch('/assets/catalog.json')).json()).assets;
    window.sheet=async(assets,before=false)=>{
      for(const e of document.querySelectorAll('.label'))e.remove();renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);const metrics=[];
      for(const [i,asset] of assets.entries()) {
        const recipe=await(await fetch(before?'/before/models/'+asset.id.slice(8)+'.json':asset.url)).json(),object=recipeInstance(recipe),wrapper=new THREE.Group();wrapper.add(object);
        object.traverse(m=>{if(m.isMesh&&m.material.userData.recipeSurface)applySurfaceMaterial(m.material,m.material.userData.recipeSurface,library);});
        const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),scale=2.25/Math.max(...size.toArray());wrapper.scale.setScalar(scale);wrapper.position.y=(2.25-size.y*scale)*.32;scene.add(wrapper);
        const x=(i%5)*280,y=Math.floor(i/5)*260;renderer.setViewport(x,1040-y-240,280,240);renderer.setScissor(x,1040-y-240,280,240);renderer.render(scene,camera);
        metrics.push({id:asset.id,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls});
        const label=document.createElement('div');label.className='label';label.style.left=x+'px';label.style.top=(y+239)+'px';label.textContent=asset.name;document.body.append(label);
        disposeObject(object);scene.remove(wrapper);
      }
      return metrics;
    };
    window.cleanup=()=>{library.dispose();renderer.dispose();};
  });
  await mkdir('test-results/library-review',{recursive:true});const metrics=[];
  const only=process.argv.slice(2),catalog=await page.evaluate(()=>window.catalog),selected=only.length?catalog.filter(a=>only.includes(a.id.slice(8))):catalog;
  for(let i=0;i<selected.length;i+=20){metrics.push(...await page.evaluate(a=>window.sheet(a),selected.slice(i,i+20)));await page.screenshot({path:`test-results/library-review/sheet-${String(i/20+1).padStart(2,'0')}.png`});console.log(`Conferidos ${Math.min(i+20,selected.length)}/${selected.length}`);}
  const heroes=catalog.filter(a=>['desk','chair','sofa','cabinet','telephone','sedan','coffin','bathtub','bell','lamp','tree','pine','ritual-mask','bookshelf','church-pointed-chair','armchair','stove','house-range','crt-tv','backrooms-fluorescent'].includes(a.id.slice(8)));
  await page.evaluate(a=>window.sheet(a,true),heroes);await page.screenshot({path:'test-results/library-review/before.png'});
  await page.evaluate(a=>window.sheet(a),heroes);await page.screenshot({path:'test-results/library-review/after.png'});
  await page.evaluate(()=>window.cleanup());assert.deepEqual(errors,[]);await writeFile('test-results/library-review/metrics.json',JSON.stringify(metrics,null,2)+'\n');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
