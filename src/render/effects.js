import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { createLightingZones } from './lighting-zones.js';

// Keep the analytical legacy slab; opt into bounded ray samples for local regions/scattering.
const volumeShader = zones => ({
  name: 'TabletopHeightFog',
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null },
    inverseProjection: { value: new THREE.Matrix4() }, cameraWorld: { value: new THREE.Matrix4() },
    fogColor: { value: new THREE.Color() }, density: { value: .06 },
    baseHeight: { value: 0 }, height: { value: 3 }, maxDistance: { value: 80 },
    ...zones.uniforms,
    localFog: {value:false}, scattering: {value:false}, steps: {value:12}, volumeStrength:{value:.5},
    lightCount:{value:0},lightPosition:{value:Array.from({length:4},()=>new THREE.Vector3())},
    lightDirection:{value:Array.from({length:4},()=>new THREE.Vector3())},
    lightColor:{value:Array.from({length:4},()=>new THREE.Vector3())},
    lightParams:{value:Array.from({length:4},()=>new THREE.Vector4())},
    lightShadowIndex:{value:[-1,-1,-1,-1]},
    volumeShadow0:{value:null},volumeShadow1:{value:null},
    volumeShadowMatrix:{value:[new THREE.Matrix4(),new THREE.Matrix4()]},
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `precision highp sampler2DShadow;
    varying vec2 vUv;
    ${zones.functions}
    uniform sampler2D tDiffuse, tDepth;
    uniform mat4 inverseProjection, cameraWorld;
    uniform vec3 fogColor;
    uniform float density, baseHeight, height, maxDistance;
    uniform bool localFog,scattering;
    uniform int steps,lightCount,lightShadowIndex[4];
    uniform vec3 lightPosition[4],lightDirection[4],lightColor[4];
    uniform vec4 lightParams[4];
    uniform float volumeStrength;
    uniform sampler2DShadow volumeShadow0,volumeShadow1;
    uniform mat4 volumeShadowMatrix[2];
    float visibility(vec3 p,int index){
      if(index<0)return 1.0;
      vec4 q=volumeShadowMatrix[index]*vec4(p,1.0);vec3 s=q.xyz/q.w;
      if(q.w<=0.0||any(lessThan(s,vec3(0.0)))||any(greaterThan(s,vec3(1.0))))return 0.0;
      if(index==0)return texture(volumeShadow0,vec3(s.xy,s.z-0.0004));
      return texture(volumeShadow1,vec3(s.xy,s.z-0.0004));
    }
    vec3 illumination(vec3 p){vec3 value=vec3(0.0);
      for(int i=0;i<4;i++){if(i>=lightCount)break;vec3 delta=p-lightPosition[i];float d=length(delta);vec4 params=lightParams[i];
        float attenuation=pow(max(0.0,1.0-d/max(params.x,.1)),2.0)/(1.0+d*d);
        if(params.y>=0.0)attenuation*=smoothstep(params.y,min(1.0,params.y+max(.001,params.z)),dot(delta/max(d,.0001),lightDirection[i]));
        value+=lightColor[i]*attenuation*visibility(p,lightShadowIndex[i]);
      }return min(value*volumeStrength*.04,vec3(1.5));
    }
    vec2 regionInterval(vec3 start,vec3 direction,int i,float limit){
      vec3 p=(zoneInverse[i]*vec4(start,1.0)).xyz,d=(zoneInverse[i]*vec4(direction,0.0)).xyz;
      d=vec3(abs(d.x)<.000001?.000001:d.x,abs(d.y)<.000001?.000001:d.y,abs(d.z)<.000001?.000001:d.z);
      vec3 a=(-zoneHalfSize[i]-p)/d,b=(zoneHalfSize[i]-p)/d,lo=min(a,b),hi=max(a,b);
      return vec2(max(0.0,max(lo.x,max(lo.y,lo.z))),min(limit,min(hi.x,min(hi.y,hi.z))));
    }
    vec3 viewPoint(float depth) {
      vec4 p = inverseProjection * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      return p.xyz / p.w;
    }
    void main() {
      vec4 original = texture2D(tDiffuse, vUv);
      vec3 start = (cameraWorld * vec4(viewPoint(0.0), 1.0)).xyz;
      vec3 end = (cameraWorld * vec4(viewPoint(texture2D(tDepth, vUv).x), 1.0)).xyz;
      vec3 ray = end - start;
      float distanceToSurface = length(ray);
      vec3 direction = ray / max(distanceToSurface, 0.00001);
      float limit = min(distanceToSurface, maxDistance);
      float entry = 0.0, exit = limit;
      if (abs(direction.y) < 0.00001) {
        if (start.y < baseHeight || start.y > baseHeight + height) exit = 0.0;
      } else {
        float a = (baseHeight - start.y) / direction.y;
        float b = (baseHeight + height - start.y) / direction.y;
        entry = max(0.0, min(a, b)); exit = min(limit, max(a, b));
      }
      float opacity = 1.0 - exp(-density * max(0.0, exit - entry));
      if(!localFog&&!scattering){gl_FragColor=vec4(mix(original.rgb,fogColor,opacity),original.a);return;}
      // Spend bounded samples on the actual fog interval, rather than empty space in a large map.
      float first=density>0.0&&exit>entry?entry:limit,last=density>0.0?max(0.0,exit):0.0;
      if(localFog)for(int zi=0;zi<16;zi++){if(zi>=zoneCount)break;if(zoneFog[zi].a<=0.0)continue;vec2 span=regionInterval(start,direction,zi,limit);if(span.y>span.x){first=min(first,span.x);last=max(last,span.y);}}
      if(last<=first){gl_FragColor=original;return;}
      vec3 accumulated=vec3(0.0);float transmittance=1.0,stepLength=(last-first)/float(steps);
      // Stable screen-space dither avoids visible parallel bands without temporal state.
      float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      for(int sampleIndex=0;sampleIndex<20;sampleIndex++){if(sampleIndex>=steps)break;
        vec3 p=start+direction*(first+(float(sampleIndex)+jitter)*stepLength);
        float localDensity=(p.y>=baseHeight&&p.y<=baseHeight+height)?density:0.0;vec3 tint=fogColor;
        if(localFog)for(int zi=0;zi<16;zi++){if(zi>=zoneCount)break;float w=zoneWeight(p,zi);localDensity=mix(localDensity,zoneFog[zi].a,w);tint=mix(tint,zoneFog[zi].rgb,w);}
        float alpha=1.0-exp(-localDensity*stepLength);vec3 light=scattering?illumination(p):vec3(0.0);
        accumulated+=transmittance*alpha*(tint+light);transmittance*=1.0-alpha;
      }
      gl_FragColor=vec4(original.rgb*transmittance+accumulated,original.a);
    }`,
});

class HeightFogPass extends ShaderPass {
  constructor(zones) { super(volumeShader(zones));Object.assign(this.uniforms,zones.uniforms);this.sources=[]; }
  render(renderer, writeBuffer, readBuffer, ...rest) {
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    const u=this.uniforms;let shadows=0;
    for(let i=0;i<this.sources.length;i++){
      const light=this.sources[i];u.lightPosition.value[i].copy(light.position);u.lightColor.value[i].set(light.color.r,light.color.g,light.color.b).multiplyScalar(light.intensity);
      u.lightDirection.value[i].set(0,-1,0);let cone=-1,penumbra=0;
      if(light.isSpotLight){u.lightDirection.value[i].copy(light.target.position).sub(light.position).normalize();cone=Math.cos(light.angle);penumbra=Math.cos(light.angle*(1-light.penumbra))-cone;}
      u.lightParams.value[i].set(light.distance||200,cone,penumbra,0);u.lightShadowIndex.value[i]=-1;
      if(light.isSpotLight&&light.castShadow&&light.shadow.map?.depthTexture&&shadows<2){u.lightShadowIndex.value[i]=shadows;u['volumeShadow'+shadows].value=light.shadow.map.depthTexture;u.volumeShadowMatrix.value[shadows].copy(light.shadow.matrix);shadows++;}
    }
    u.lightCount.value=this.sources.length;
    super.render(renderer, writeBuffer, readBuffer, ...rest);
  }
}

/** Lazy optional GPU pipeline. Each viewport owns and can suppress its effects. */
export function createEffectsPipeline(renderer, scene, { offscreen = false } = {}) {
  const zones=createLightingZones();let activeZones=zones,sources=[],quality={steps:12},tier='balanced',fallbackDepth,sceneDepth=null;
  let composer, renderPass, volumePass, bloomPass, outputPass,aoPass;
  let currentLook = {}, enabled = true, width = 1, height = 1,hadLocalFog=false;
  // Effects draw into an offscreen target, which bypasses the canvas antialiasing
  // and used to be capped at one physical pixel per CSS pixel: switching AO or
  // bloom on softened the whole image. Outside the economy tier the target is
  // multisampled. Fog and bloom run on every pixel of it, so resolution follows
  // the tier: measured on the church at 1.6x, full resolution costs 32 ms a frame
  // against 23 ms at 1.25x and 18 ms at 1x.
  let sharpTarget=true,appliedRatio=0;
  const sharp=()=>tier!=='economy',effectsRatio=()=>Math.min(renderer.getPixelRatio(),tier==='economy'?1:tier==='high'?Infinity:1.25);
  const aoSize=()=>[Math.max(1,width*effectsRatio()/2|0),Math.max(1,height*effectsRatio()/2|0)];
  function dispose() {
    if (!composer) return;
    for (const pass of composer.passes) pass.dispose();
    composer.dispose(); composer = null; bloomPass = null;aoPass=null;appliedRatio=0;
    fallbackDepth?.dispose();fallbackDepth=null;
  }
  function configure(look = currentLook) {
    currentLook = look;
    const localFog=activeZones.hasFog();
    hadLocalFog=localFog;
    const ao=enabled&&look.rendering?.ao&&tier!=='economy';
    if (!offscreen && (!enabled || !(look.volumetricFog?.enabled || look.bloom?.enabled||localFog||ao))) { dispose(); return; }
    if (composer && sharpTarget !== sharp()) dispose();
    if (!composer) {
      sharpTarget = sharp();
      const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1), samples: sharpTarget ? 4 : 0 });
      composer = new EffectComposer(renderer, target);
      renderPass = new RenderPass(scene, null);
      // The composer alternates its two targets; remember which one holds this frame's depth.
      const drawScene=renderPass.render.bind(renderPass);renderPass.render=(r,writeBuffer,readBuffer,...rest)=>{sceneDepth=readBuffer.depthTexture;drawScene(r,writeBuffer,readBuffer,...rest);};
      volumePass = new HeightFogPass(activeZones);
      fallbackDepth=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);fallbackDepth.compareFunction=THREE.LessEqualCompare;fallbackDepth.needsUpdate=true;
      volumePass.uniforms.volumeShadow0.value=fallbackDepth;volumePass.uniforms.volumeShadow1.value=fallbackDepth;
      outputPass = new OutputPass();
      composer.addPass(renderPass); composer.addPass(volumePass); composer.addPass(outputPass);
      composer.setSize(width, height);
    }
    if(appliedRatio!==effectsRatio()){appliedRatio=effectsRatio();composer.setPixelRatio(appliedRatio);}
    volumePass.enabled = enabled&&Boolean(look.volumetricFog?.enabled||localFog);
    const f=look.volumetricFog;
    volumePass.uniforms.fogColor.value.set(f?.color??'#9daac2');
    Object.assign(volumePass.uniforms.density,{value:f?.enabled?f.density:0});
    for(const field of ['baseHeight','height','maxDistance'])volumePass.uniforms[field].value=f?.[field]??({baseHeight:0,height:3,maxDistance:80}[field]);
    volumePass.uniforms.localFog.value=activeZones.uniforms.zoneCount.value>0;
    volumePass.uniforms.scattering.value=!!look.rendering?.volumetricLights&&tier!=='economy'&&(look.rendering?.volumeStrength??.5)>0;
    volumePass.uniforms.volumeStrength.value=look.rendering?.volumeStrength??.5;
    if(ao&&!aoPass){aoPass=new GTAOPass(scene,new THREE.PerspectiveCamera(),...aoSize());
      // The pass would draw the whole scene again for depth and normals. The frame
      // already has depth, and the shaders derive normals from it: sample that.
      aoPass._renderGBuffer=false;for(const material of [aoPass.gtaoMaterial,aoPass.pdMaterial]){material.defines.NORMAL_VECTOR_TYPE=0;material.uniforms.tNormal.value=null;material.needsUpdate=true;}
      const draw=aoPass.render.bind(aoPass);aoPass.render=(...args)=>{aoPass.gtaoMaterial.uniforms.tDepth.value=aoPass.pdMaterial.uniforms.tDepth.value=sceneDepth;draw(...args);};
      composer.insertPass(aoPass,2);}
    else if(!ao&&aoPass){composer.removePass(aoPass);aoPass.dispose();aoPass=null;}
    if(aoPass){aoPass.blendIntensity=look.rendering.aoIntensity??.35;aoPass.updateGtaoMaterial({radius:look.rendering.aoRadius??.6});aoPass.setSize(...aoSize());}
    if (enabled && look.bloom?.enabled && !bloomPass) {
      bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height));
      composer.insertPass(bloomPass, composer.passes.length - 1);
    } else if ((!enabled || !look.bloom?.enabled) && bloomPass) {
      composer.removePass(bloomPass); bloomPass.dispose(); bloomPass = null;
    }
    if (bloomPass) Object.assign(bloomPass, { strength: look.bloom.strength, radius: look.bloom.radius, threshold: look.bloom.threshold });
  }
  return {
    configure,
    setQuality(value){tier=value;configure();},
    setLighting(value,lights,q){const before=hadLocalFog;activeZones=value;sources=lights;quality=q;
      const after=value.hasFog();
      if(before!==after||after&&!composer&&enabled)configure();
      if(volumePass&&composer){Object.assign(volumePass.uniforms,value.uniforms);volumePass.uniforms.localFog.value=value.uniforms.zoneCount.value>0;volumePass.uniforms.steps.value=q.steps;volumePass.sources=sources;}
    },
    setEnabled(value) { enabled = value; configure(); },
    resize(w, h) { if (width === w && height === h) return; width = w; height = h; composer?.setSize(w, h);aoPass?.setSize(...aoSize()); },
    render(camera, seconds, target = null) {
      if (!composer) { renderer.render(scene, camera); return; }
      camera.updateMatrixWorld();
      renderPass.camera = camera;
      if(aoPass){aoPass.camera=camera;const perspective=camera.isPerspectiveCamera?1:0;if(aoPass.gtaoMaterial.defines.PERSPECTIVE_CAMERA!==perspective){aoPass.gtaoMaterial.defines.PERSPECTIVE_CAMERA=perspective;aoPass.gtaoMaterial.needsUpdate=true;}}
      volumePass.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
      volumePass.uniforms.cameraWorld.value.copy(camera.matrixWorld);
      const previous=renderer.getRenderTarget();composer.renderToScreen=!target;
      // Colour, AO and shadow passes draw the same frame: update world matrices once.
      scene.updateMatrixWorld();scene.matrixWorldAutoUpdate=false;
      try{composer.render(seconds);if(target){composer.copyPass.renderToScreen=false;composer.copyPass.render(renderer,target,composer.readBuffer);}}finally{scene.matrixWorldAutoUpdate=true;renderer.setRenderTarget(previous);}
    },
    info() { return { enabled, bloom: Boolean(composer && bloomPass), volumetricFog: Boolean(composer && volumePass.enabled), ao:!!aoPass,scattering:!!composer&&volumePass.uniforms.scattering.value,steps:quality.steps,pixelRatio: effectsRatio(),samples:composer&&sharpTarget?4:0 }; },
    dispose,
  };
}
