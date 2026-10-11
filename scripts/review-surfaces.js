import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import express from 'express';
import {chromium} from 'playwright';

// Contact sheet of surface textures on this machine's GPU: each tile is a panel
// and a rounded block lit like the model review, with the given settings.
//   node scripts/review-surfaces.js [out.png]
const out=process.argv[2]??'test-results/surface-review.png',app=express();
app.get('/',(_req,res)=>res.type('html').send(`<style>body{margin:0;background:#182027}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>`));
app.use('/three',express.static('node_modules/three'));app.use('/src',express.static('src'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;
const samples=[
  ['Tecido · tela',{texture:'fabric',textureColor:'#6f8f7c',textureColorMode:'replace'}],['Tecido · sarja',{texture:'fabric',fabricWeave:'twill',textureColor:'#3d4f7a',textureColorMode:'replace'}],
  ['Tecido · espinha',{texture:'fabric',fabricWeave:'herringbone',textureColor:'#7a6a55',textureColorMode:'replace'}],['Veludo',{texture:'fabric',fabricWeave:'velvet',textureColor:'#7a1f2c',textureColorMode:'replace'}],
  ['Couro granulado',{texture:'leather'}],['Couro capitonê',{texture:'leather',leatherPattern:'tufted',textureColor:'#5a2a22',textureColorMode:'replace'}],
  ['Reboco liso',{texture:'plaster',textureColor:'#c9d2c4',textureColorMode:'replace'}],['Reboco chapisco',{texture:'plaster',plasterFinish:'stucco'}],
  ['Parede descascando',{texture:'plaster',plasterFinish:'peeling',plasterDamage:.6,textureColor:'#7fa3a0',textureColorMode:'replace'}],['Azulejo',{texture:'tile',textureColor:'#8fc0cf',textureColorMode:'replace'}],
  ['Azulejo xadrez',{texture:'tile',tilePattern:'checker',tileCount:6}],['Ladrilho hexagonal',{texture:'tile',tilePattern:'hex',tileCount:6,textureColor:'#d8c9a0',textureColorMode:'replace'}],
  ['Carpete',{texture:'carpet',textureColor:'#8a7a3a',textureColorMode:'replace'}],['Tapete de losangos',{texture:'carpet',carpetPattern:'diamonds',textureColor:'#7a2f2a',textureColorMode:'replace'}],
  ['Pintura lascada',{texture:'paint',paintChips:.45,textureColor:'#3f7a55',textureColorMode:'replace'}],['Pintura · ferrugem',{texture:'paint',paintChips:.5,paintBase:'rust',textureColor:'#b03a2e',textureColorMode:'replace'}],
  ['Pintura martelada',{texture:'paint',paintFinish:'hammered',paintChips:.05,textureColor:'#5b6f8c',textureColorMode:'replace'}],['Madeira envelhecida',{texture:'wood',woodAge:.8}],
];
try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1500,height:780}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async samples=>{
    const THREE=await import('three'),{RoundedBoxGeometry}=await import('three/addons/geometries/RoundedBoxGeometry.js'),{createSurfaceLibrary,applySurfaceMaterial}=await import('/src/render/surface-materials.js'),{surfacePreset}=await import('/src/domain/materials.js');
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1500,780);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.append(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#283139');scene.add(new THREE.HemisphereLight('#ecf1fa','#6d655b',1.6));
    const key=new THREE.DirectionalLight('#fff0d7',3.2);key.position.set(-2,3,3);scene.add(key);
    const camera=new THREE.PerspectiveCamera(30,250/260,.01,50);camera.position.set(1.1,.9,1.6);camera.lookAt(0,.28,0);
    const library=createSurfaceLibrary();renderer.setScissorTest(true);
    samples.forEach(([name,settings],i)=>{
      const preset=surfacePreset(settings.texture),material=()=>{const m=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:preset.roughness,metalness:preset.metalness});applySurfaceMaterial(m,{textureSize:preset.size,relief:preset.relief,...settings},library);return m;};
      const group=new THREE.Group(),floor=new THREE.Mesh(new THREE.BoxGeometry(1.4,.02,1.4),material()),block=new THREE.Mesh(new RoundedBoxGeometry(.5,.5,.5,4,.06),material());
      block.position.set(0,.27,0);block.rotation.y=.5;group.add(floor,block);scene.add(group);
      const x=(i%6)*250,y=Math.floor(i/6)*260;renderer.setViewport(x,780-y-260,250,260);renderer.setScissor(x,780-y-260,250,260);renderer.render(scene,camera);scene.remove(group);
      const label=document.createElement('div');label.textContent=name;label.style.cssText=`position:absolute;left:${x}px;top:${y+238}px;width:250px;text-align:center;font:13px system-ui;color:#e5dfcf`;document.body.append(label);
    });
  },samples);
  await mkdir('test-results',{recursive:true});await page.screenshot({path:out});
  if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
