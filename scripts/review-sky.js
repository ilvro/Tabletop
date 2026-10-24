/** Still frames of the procedural sky drawn by the real atmosphere module: node scripts/review-sky.js [outDir]. */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import express from 'express';
import {chromium} from 'playwright';
const out=process.argv[2]??'test-results/sky-review';
const app=express();
app.get('/',(_req,res)=>res.type('html').send(`<style>body{margin:0;background:#000}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>`));
app.use('/three',express.static('node_modules/three'));app.use('/src',express.static('src'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;
// Each shot: sky patch over the defaults, phase, camera pitch (degrees above the horizon) and yaw.
const shots={
  'night-wide':{sky:{topColor:'#071329',horizonColor:'#304f84',clouds:false},phase:'night',pitch:28,yaw:0,fov:75},
  'night-zenith':{sky:{topColor:'#071329',horizonColor:'#304f84',clouds:false},phase:'night',pitch:70,yaw:40,fov:60},
  'night-moon':{sky:{topColor:'#071329',horizonColor:'#304f84',cloudColor:'#6c86b5',cloudOpacity:.22,cloudCoverage:.22},phase:'night',pitch:30,yaw:0,fov:50,moon:true},
  'milky-way':{sky:{topColor:'#050d1e',horizonColor:'#22365a',clouds:false,milkyWay:1},phase:'night',pitch:50,yaw:-90,fov:100},
  'crescent':{sky:{topColor:'#071329',horizonColor:'#304f84',clouds:false,moonPhase:.2,discSize:.05},phase:'night',pitch:20,yaw:0,fov:40,moon:true},
  'aurora':{sky:{topColor:'#040b18',horizonColor:'#1b2c4a',clouds:false,aurora:true},phase:'night',pitch:22,yaw:0,fov:80},
  'aurora-purple':{sky:{topColor:'#040b18',horizonColor:'#1b2c4a',clouds:false,aurora:true,auroraColor:'#38f0c0',auroraTopColor:'#ff4fa0',auroraIntensity:1.4},phase:'night',pitch:35,yaw:30,fov:80},
  'sunset':{sky:{topColor:'#9c5847',horizonColor:'#efb370',cloudColor:'#ead0b4',cloudCoverage:.4},phase:'sunset',pitch:12,yaw:0,fov:70,moon:true},
  'day':{sky:{},phase:'day',pitch:20,yaw:0,fov:70},
};
try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async()=>{
    const THREE=await import('three'),{createAtmosphere}=await import('/src/render/atmosphere.js'),{SKY_DEFAULTS,WEATHER_DEFAULTS}=await import('/src/domain/lighting.js');
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(960,600);renderer.setPixelRatio(1);
    Object.assign(renderer,{outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.1});document.body.append(renderer.domElement);
    window.render=(shot,seconds)=>{
      const scene=new THREE.Scene(),atmosphere=createAtmosphere(scene),rad=Math.PI/180;
      const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshBasicMaterial({color:'#05070a'}));ground.rotation.x=-Math.PI/2;scene.add(ground);
      const camera=new THREE.PerspectiveCamera(shot.fov,960/600,.05,1200);camera.position.set(0,1.7,0);
      camera.lookAt(Math.sin(shot.yaw*rad)*Math.cos(shot.pitch*rad),1.7+Math.sin(shot.pitch*rad),-Math.cos(shot.yaw*rad)*Math.cos(shot.pitch*rad));
      // The moon/sun sits slightly to the right of the view when asked for, otherwise behind the camera.
      const toward=shot.moon?new THREE.Vector3(Math.sin((shot.yaw+14)*rad)*Math.cos((shot.pitch+4)*rad),Math.sin((shot.pitch+4)*rad),-Math.cos((shot.yaw+14)*rad)*Math.cos((shot.pitch+4)*rad)):new THREE.Vector3(.3,.6,.75).normalize();
      const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),toward).toArray();
      atmosphere.configure({sky:{...SKY_DEFAULTS,enabled:true,...shot.sky},daylight:{phase:shot.phase},weather:{...WEATHER_DEFAULTS}},{color:shot.phase==='sunset'?'#ffb46a':'#ffe9ae',rotation});
      atmosphere.update(camera,seconds,false,600,1);renderer.render(scene,camera);
      const url=renderer.domElement.toDataURL('image/png');atmosphere.dispose();ground.geometry.dispose();ground.material.dispose();return url;
    };
  });
  await mkdir(out,{recursive:true});
  for(const [name,shot] of Object.entries(shots)) {
    const url=await page.evaluate(([s,t])=>window.render(s,t),[shot,12]);
    await writeFile(`${out}/${name}.png`,Buffer.from(url.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);console.log(`Céus gravados em ${out}`);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
