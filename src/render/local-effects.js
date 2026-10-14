import * as THREE from 'three';
import { effectSeeds, sparkBurst, burstLight, BURST_LENGTH } from '../domain/local-effects.js';

const vertexShader = `attribute vec4 effectSeed;
  uniform float time, speed, smoke, mode;
  uniform vec3 regionSize, burst;
  varying vec2 particleUV; varying float age, seed;
  #include <fog_pars_vertex>
  void main() {
    if (mode > 1.5) {
      vec4 mvPosition; vec2 shape;
      if (mode < 2.5) {
        // Sparks: a burst of streaks thrown from the origin, falling under gravity; none between bursts.
        if (burst.z < .5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
        float a = burst.y; age = a / ${BURST_LENGTH.toFixed(2)}; seed = effectSeed.w;
        vec3 r = fract(effectSeed.xyz + burst.x * vec3(.618, .414, .732));
        vec3 v0 = normalize(vec3(r.x - .5, .4 + r.y * .8, r.z - .5)) * (1.5 + effectSeed.w * 2.5) * regionSize.x;
        vec3 p = v0 * a + .5 * vec3(0.0, -9.8, 0.0) * a * a, vel = v0 + vec3(0.0, -9.8 * a, 0.0);
        mvPosition = modelViewMatrix * vec4(p, 1.0);
        vec2 dir = (modelViewMatrix * vec4(vel, 0.0)).xy; float len = length(dir); dir = len > .0001 ? dir / len : vec2(0.0, 1.0);
        shape = dir * position.x * max(.02, length(vel) * .03) + vec2(-dir.y, dir.x) * position.y * .014;
      } else {
        // Drips: each swells where it hangs, then falls and is gone at the floor, regionSize.y below.
        float height = max(.05, regionSize.y), period = (.8 + effectSeed.y * 1.6) / max(.05, speed), phase = effectSeed.w * period, local = mod(time + phase, period);
        float fall = sqrt(2.0 * height / 9.8), hang = max(.01, period - fall), y = 0.0, sc = 1.0, fallen = 0.0;
        if (local < hang) sc = local / hang; else { fallen = local - hang; y = max(-height, -.5 * 9.8 * fallen * fallen); }
        age = 0.0; seed = effectSeed.w;
        mvPosition = modelViewMatrix * vec4((effectSeed.x - .5) * regionSize.x, y, (effectSeed.z - .5) * regionSize.z, 1.0);
        shape = vec2(position.x * .018 * sc, position.y * (.02 * sc + min(.1, 9.8 * fallen * .02)));
      }
      mvPosition.xy += shape; particleUV = uv; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      return;
    }
    age=fract(effectSeed.y + time*speed/max(.1,regionSize.y)); seed=effectSeed.w;
    float spread=mix(.18*(1.0-age), .14+age*.38, smoke);
    vec3 p=vec3((effectSeed.x-.5)*regionSize.x*spread,age*regionSize.y,(effectSeed.z-.5)*regionSize.z*spread);
    p.x += sin(age*8.0 + seed*6.28 + time*speed*.6)*regionSize.x*.08*age;
    p.z += cos(age*6.0 + seed*6.28 + time*speed*.4)*regionSize.z*.07*age;
    vec4 mvPosition=modelViewMatrix*vec4(p,1.0);
    vec2 size=vec2(regionSize.x*mix(.42,.7,smoke),regionSize.y*mix(.42,.3,smoke))*mix(1.0-age*.75,.35+age*1.3,smoke);
    vec2 worldScale=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));
    mvPosition.xy += position.xy*size*worldScale;
    particleUV=uv; gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }`;
const fragmentShader = `uniform vec3 effectColor;
  uniform float time, speed, opacity, smoke, mode;
  varying vec2 particleUV; varying float age, seed;
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) { vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y); }
  void main() {
    vec2 p=particleUV*2.0-1.0;
    if (mode > 1.5) {
      float disc = 1.0 - smoothstep(.5, 1.0, length(p * vec2(mode < 2.5 ? .55 : 1.0, 1.0)));
      float alpha = disc * opacity * (mode < 2.5 ? 1.0 - age : 1.0);
      if (alpha < .008) discard;
      vec3 color = mode < 2.5 ? mix(vec3(3.0, 2.2, 1.0), effectColor * 2.0, age) : effectColor * (.7 + .5 * smoothstep(.2, -.6, p.y));
      gl_FragColor = vec4(mode < 2.5 ? color * alpha : color, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      return;
    }
    float n=noise(p*3.5+vec2(seed*20.0,-time*speed*.8))*.65+noise(p*8.0+seed*19.0-time*speed*.3)*.35;
    float radius=length(p*vec2(1.0,mix(.75,1.0,smoke)));
    float cloud=(1.0-smoothstep(.1,1.0,radius + (n-.5)*.5));
    float fade=smoothstep(0.0,.12,age)*(1.0-smoothstep(.55,1.0,age));
    float flame=(1.0-smoothstep(.15,1.0,length(vec2(p.x*(1.0+max(0.0,p.y)*1.5),p.y*.8))+(n-.5)*.55));
    float alpha=mix(flame,cloud,smoke)*fade*opacity;
    if(alpha<.008) discard;
    vec3 hot=mix(vec3(3.3,2.6,1.3),effectColor*2.5,clamp(age*1.5+particleUV.y*.3,0.0,1.0));
    vec3 color=mix(hot,effectColor*(.75+n*.5),smoke);
    gl_FragColor=vec4(color,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

/** Billboard quads avoid hardware point-size limits; each emitter owns its GPU resources. */
export function createLocalEffect(config) {
  const group=new THREE.Group(); group.position.fromArray(config.offset);
  const geometry=new THREE.InstancedBufferGeometry(), plane=new THREE.PlaneGeometry(1,1);
  geometry.index=plane.index.clone(); for(const [name,attribute] of Object.entries(plane.attributes)) geometry.setAttribute(name,attribute.clone()); plane.dispose();
  const seeds=effectSeeds(config.seed,config.count), mode={fire:0,smoke:1,sparks:2,drip:3}[config.type]??0;
  geometry.setAttribute('effectSeed',new THREE.InstancedBufferAttribute(seeds,4)); geometry.instanceCount=config.count;
  geometry.boundingBox=new THREE.Box3(new THREE.Vector3(-config.size[0],mode===3?-config.size[1]:0,-config.size[2]),new THREE.Vector3(config.size[0],config.size[1]*1.3,config.size[2]));
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,config.size[1]/2,0),Math.hypot(...config.size));
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:true,
    blending:mode===2?THREE.AdditiveBlending:THREE.NormalBlending,
    uniforms:{...THREE.UniformsLib.fog,time:{value:0},speed:{value:config.speed},smoke:{value:config.type==='smoke'?1:0},mode:{value:mode},burst:{value:new THREE.Vector3()},regionSize:{value:new THREE.Vector3(...config.size)},effectColor:{value:new THREE.Color(config.color)},opacity:{value:config.opacity*(config.type==='fire' ? .15 : 1)}}});
  // Clone fog uniforms: Three updates them independently for each viewport/material.
  material.uniforms=THREE.UniformsUtils.clone(material.uniforms);
  const particles=new THREE.Mesh(geometry,material); particles.userData.decorative=true; particles.raycast=()=>{}; particles.frustumCulled=mode<2; group.add(particles);
  let light;
  if((config.type==='fire'||config.type==='sparks') && config.lightIntensity>0) { light=new THREE.PointLight(config.color,config.lightIntensity,Math.max(...config.size)*6,2); light.position.y=config.size[1]*.25; group.add(light); }
  group.userData.localEffect={config,particles,light}; group.visible=config.enabled;
  return group;
}
export function updateLocalEffect(group,seconds,enabled,paused) {
  const {config,particles,light}=group.userData.localEffect;
  particles.visible=enabled && config.enabled;
  particles.material.uniforms.time.value=seconds;
  if(config.type==='sparks') {
    // The flash of a burst: bright as it starts, gone as it dies, the same instant the particles are drawn.
    const burst=sparkBurst(config.seed,config.speed,seconds); particles.material.uniforms.burst.value.set(burst.index,burst.age,burst.active?1:0);
    if(light) light.intensity=enabled?config.lightIntensity*burstLight(burst):0;
  } else if(light) light.intensity=config.lightIntensity*(enabled && config.speed > 0 ? .88+.12*Math.sin(seconds*9+config.seed)+.06*Math.sin(seconds*17+config.seed) : 1);
  let visible=true; for(let node=group;node;node=node.parent) if(!node.visible) visible=false;
  return visible && enabled && !paused && config.speed>0 && (config.opacity>0 || light?.intensity>0);
}
