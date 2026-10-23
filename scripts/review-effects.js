/** Still frames of fire, rain and fog drawn by the real render modules: node scripts/review-effects.js [outDir]. */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import express from 'express';
import {chromium} from 'playwright';
const out=process.argv[2]??'test-results/effects-review';
const app=express();
app.get('/',(_req,res)=>res.type('html').send(`<style>body{margin:0;background:#000}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>`));
app.use('/three',express.static('node_modules/three'));app.use('/src',express.static('src'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try {
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async()=>{
    const THREE=await import('three'),{createLocalEffect,updateLocalEffect}=await import('/src/render/local-effects.js'),{createAtmosphere}=await import('/src/render/atmosphere.js'),{createEffectsPipeline}=await import('/src/render/effects.js');
    const {LOCAL_EFFECT_DEFAULTS}=await import('/src/domain/materials.js'),{WEATHER_DEFAULTS,VOLUME_DEFAULTS}=await import('/src/domain/lighting.js'),{ENVIRONMENT_PRESETS}=await import('/src/domain/environments.js').catch(()=>({}));
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(960,600);renderer.setPixelRatio(1);
    Object.assign(renderer,{outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.1});renderer.shadowMap.enabled=true;document.body.append(renderer.domElement);
    const stone=new THREE.MeshStandardMaterial({color:'#5d5850',roughness:.9}),wood=new THREE.MeshStandardMaterial({color:'#4a3220',roughness:.85});
    function stage(background){
      const scene=new THREE.Scene();scene.background=new THREE.Color(background);
      const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),stone);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
      for(const [x,z,h] of [[-3,-4,3.5],[3.5,-6,4],[-6,-12,5],[5,-16,5],[-2,-22,6],[7,-28,6]]){const pillar=new THREE.Mesh(new THREE.BoxGeometry(.8,h,.8),stone);pillar.position.set(x,h/2,z);pillar.castShadow=pillar.receiveShadow=true;scene.add(pillar);}
      return scene;
    }
    window.shots={
      fire(t){
        const scene=stage('#07090d');scene.add(new THREE.HemisphereLight('#283447','#0d0b09',.35));
        for(const a of [0,1.9,3.8]){const log=new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,.9,10),wood);log.rotation.set(Math.PI/2-.25,a,0);log.position.y=.12;log.castShadow=true;scene.add(log);}
        for(let i=0;i<9;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.12),stone);rock.position.set(Math.cos(i*.7)*.62,.07,Math.sin(i*.7)*.62);scene.add(rock);}
        const fire=createLocalEffect({...structuredClone(LOCAL_EFFECT_DEFAULTS)});scene.add(fire);fire.userData.localEffect.light&&(fire.userData.localEffect.light.castShadow=true);
        const camera=new THREE.PerspectiveCamera(40,960/600,.05,200);camera.position.set(0,1.25,3.4);camera.lookAt(0,.75,0);
        return {scene,camera,look:{bloom:{enabled:true,strength:.45,radius:.4,threshold:.85}},tick:s=>updateLocalEffect(fire,s,true,false)};
      },
      rain(t){
        const scene=stage('#465763');scene.fog=new THREE.FogExp2('#839ba7',.012);scene.add(new THREE.HemisphereLight('#8eacbf','#424b4f',.9));
        const sun=new THREE.DirectionalLight('#cfdbe6',.8);sun.position.set(4,10,6);scene.add(sun);
        const atmosphere=createAtmosphere(scene);atmosphere.configure({weather:{...structuredClone(WEATHER_DEFAULTS),type:'rain',count:900,speed:12,wind:[2.5,0],size:[30,12,30],center:[0,0,-8]}},null);
        const camera=new THREE.PerspectiveCamera(50,960/600,.05,200);camera.position.set(0,1.7,6);camera.lookAt(0,1.4,-6);
        return {scene,camera,look:{},tick:s=>atmosphere.update(camera,s,false,600,1)};
      },
      fog(t){
        const scene=stage('#899b9d');scene.fog=new THREE.FogExp2('#a1b3b4',.018);scene.add(new THREE.HemisphereLight('#c7d6d8','#5b5f58',1.1));
        const sun=new THREE.DirectionalLight('#fff3dc',1.2);sun.position.set(-6,8,-12);scene.add(sun);
        const camera=new THREE.PerspectiveCamera(50,960/600,.05,200);camera.position.set(0,1.6,6);camera.lookAt(0,1.5,-8);
        return {scene,camera,look:{volumetricFog:{...VOLUME_DEFAULTS,enabled:true,color:'#a1b3b4',density:.035,height:4}},tick:()=>{}};
      },
    };
    window.render=async(name,seconds)=>{
      const {scene,camera,look,tick}=window.shots[name](seconds),effects=createEffectsPipeline(renderer,scene,{offscreen:true});
      effects.resize(960,600);effects.setQuality('balanced');effects.configure(look);tick(seconds);effects.render(camera,seconds);
      const url=renderer.domElement.toDataURL('image/png');effects.dispose();
      scene.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==stone&&o.material!==wood)o.material.dispose?.();});
      return url;
    };
  });
  await mkdir(out,{recursive:true});
  for(const [name,seconds] of [['fire',3.2],['fire',3.45],['rain',2],['fog',0]]) {
    const url=await page.evaluate(([n,s])=>window.render(n,s),[name,seconds]);
    const {writeFile}=await import('node:fs/promises');await writeFile(`${out}/${name}-${seconds}.png`,Buffer.from(url.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);console.log(`Efeitos gravados em ${out}`);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
