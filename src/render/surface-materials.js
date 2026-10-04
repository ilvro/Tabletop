import * as THREE from 'three';
import { SURFACE_MATERIALS, surfacePreset } from '../domain/materials.js';

const SIZE = 256, COUNT = SURFACE_MATERIALS.length;
const fract = x => x - Math.floor(x);
const hash = (x, y, seed = 1) => fract(Math.sin(x * 127.1 + y * 311.7 + seed * 71.3) * 43758.5453);
const smooth = x => x * x * (3 - 2 * x);
function noise(u, v, frequency, seed) {
  const x = u * frequency, y = v * frequency, ix = Math.floor(x), iy = Math.floor(y), fx = smooth(fract(x)), fy = smooth(fract(y));
  const at = (dx, dy) => hash((ix + dx) % frequency, (iy + dy) % frequency, seed);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(0,0), at(1,0), fx), THREE.MathUtils.lerp(at(0,1), at(1,1), fx), fy);
}

/** Original seamless procedural tiles: albedo + packed height/roughness, with no network dependency. */
export function generateSurfaceAtlas() {
  const albedo = new Uint8Array(SIZE * SIZE * COUNT * 4), details = new Uint8Array(albedo.length);
  SURFACE_MATERIALS.forEach((preset, layer) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE, v = y / SIZE, n = noise(u,v,8,layer+1), fine = noise(u,v,64,layer+11), grain = hash(x,y,layer+23);
      let rgb, height = n * .65 + fine * .35, rough = .7 + .3 * fine;
      switch (preset.id) {
        case 'wood': {
          const board = Math.floor(v * 5), joint = fract(v * 5) < .025;
          const fibers = Math.sin(v * Math.PI * 2 * 64 + Math.sin(u * Math.PI * 2) * 1.5 + n * 2);
          const knot = Math.sin(Math.hypot((u-.5)*2, (v-.5)*5) * 55 + n * 5) * Math.exp(-Math.hypot((u-.5)*8, (v-.5)*25));
          const value = joint ? .3 : .78 + .06 * fibers + .1 * n + .04 * fine + .07 * knot + hash(board,0)*.1;
          rgb = [164*value,108*value,60*value]; height = joint ? .05 : .6 + fibers * .018 + fine * .025; rough = .65 + fine*.25; break;
        }
        case 'stone': {
          const row = Math.floor(v*4), a = fract(u*3 + (row%2)*.5), b = fract(v*4);
          const joint = Math.min(a,1-a,b,1-b) < .035;
          const value = joint ? .28 : .65 + n*.25 + hash(Math.floor(u*3+(row%2)*.5),row)*.2;
          rgb = [143*value,143*value,132*value]; height = joint ? .04 : .55+n*.25+fine*.15; break;
        }
        case 'grass': {
          const blade = Math.pow(Math.max(0, Math.sin(u*2*Math.PI*64 + n*8 + v*2*Math.PI*16)),8);
          rgb = [35+fine*34+blade*30,65+n*40+blade*45,22+fine*25]; height = .25 + blade*.35 + fine*.3; break;
        }
        case 'metal': {
          const scratches = noise(u,v,128,5)*.13 + Math.sin(v*Math.PI*2*128)*.045;
          const spot = Math.max(0,n-.62)*2;
          rgb = [125+fine*26+spot*38,131+fine*26-spot*48,133+fine*26-spot*78]; height = .45+scratches; rough = .35+fine*.4+spot*.2; break;
        }
        case 'sand': {
          const ripple = Math.sin(v*2*Math.PI*10 + Math.sin(u*2*Math.PI)*1.5)*.12;
          const value = .75 + n*.12 + grain*.12 + ripple;
          rgb = [214*value,186*value,130*value]; height = .35+grain*.15+ripple+n*.15; break;
        }
        case 'brick': {
          const row = Math.floor(v*8), a = fract(u*4+(row%2)*.5), b = fract(v*8), joint = Math.min(a,1-a,b*.5,(1-b)*.5)<.025;
          const value = .72 + fine*.25 + hash(Math.floor(u*4+(row%2)*.5),row)*.12;
          rgb = joint ? [112+fine*12,106+fine*12,92+fine*12] : [173*value,77*value,48*value]; height = joint ? .08 : .7+fine*.15; break;
        }
        case 'concrete': rgb = [121+n*24+fine*15,119+n*24+fine*15,111+n*24+fine*15]; height = .45+n*.08+(grain>.97?-.22:fine*.08); break;
        case 'mud': {
          const crack = Math.max(0,.1-Math.abs(noise(u,v,16,9)-.5))*3;
          rgb = [65+n*32+fine*10,43+n*22+fine*6,25+n*17]; height = .35+n*.4+fine*.2-crack; rough = .3+n*.55; break;
        }
      }
      const index = ((layer*SIZE+y)*SIZE+x)*4;
      for(let c=0;c<3;c++) albedo[index+c]=Math.max(0,Math.min(255,Math.round(rgb[c])));
      albedo[index+3]=255; details[index]=Math.max(0,Math.min(255,height*255)); details[index+1]=Math.max(0,Math.min(255,rough*255)); details[index+2]=0; details[index+3]=255;
    }
  });
  return { albedo, details, width: SIZE, height: SIZE*COUNT };
}
let pixels;
export function createSurfaceLibrary() {
  let atlas;
  return {
    get() {
      if (!atlas) {
        pixels ??= generateSurfaceAtlas();
        const texture = (data, colorSpace) => {
          const result = new THREE.DataTexture(data, pixels.width, pixels.height); result.colorSpace = colorSpace;
          result.minFilter = THREE.LinearMipmapLinearFilter; result.magFilter = THREE.LinearFilter; result.generateMipmaps = true; result.needsUpdate = true;
          result.userData.tabletopShared = true; return result;
        };
        atlas = { albedo: texture(pixels.albedo,THREE.SRGBColorSpace), details: texture(pixels.details,THREE.NoColorSpace) };
      }
      return atlas;
    },
    dispose() { if(atlas) { atlas.albedo.dispose(); atlas.details.dispose(); atlas=null; } },
  };
}
const sampleFunctions = `
  uniform sampler2D surfaceAlbedo, surfaceDetails;
  varying vec3 surfacePosition, surfaceNormal;
  vec4 tileSample(sampler2D atlas, vec2 p, float index) {
    vec2 f = fract(p); f = (f * 255.0 + .5) / 256.0;
    return texture2D(atlas, vec2(f.x, (f.y + index) / 8.0));
  }
  vec4 surfaceSample(sampler2D atlas, float index, float size) {
    vec3 w = pow(abs(normalize(surfaceNormal)), vec3(4.0)); w /= max(.0001,w.x+w.y+w.z);
    vec3 p = surfacePosition / size;
    return tileSample(atlas,p.zy,index)*w.x + tileSample(atlas,p.xz,index)*w.y + tileSample(atlas,p.xy,index)*w.z;
  }
`;

/** Apply per-instance; imported materials and the atlas are never mutated by another entity. */
export function applySurfaceMaterial(material, settings, library, terrain = null) {
  const preset = surfacePreset(settings?.texture), layers = terrain?.paintLayers ?? [];
  const texturedTerrain = layers.some(layer => layer.visible && surfacePreset(layer.texture));
  if (!preset && !texturedTerrain) return;
  const atlas = library.get(), active = layers.filter(layer => layer.visible).slice(0,8);
  material.userData.surface = { texture: preset?.id ?? 'none', size: settings.textureSize ?? preset?.size ?? 2, relief: settings.relief ?? preset?.relief ?? .03, layers: active.map(l=>l.texture??'none') };
  // Terrain color is composed in the fragment shader, retaining legacy masks and their ordering.
  if (texturedTerrain) material.vertexColors = false;
  const relief = settings.relief ?? preset?.relief ?? .03;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    previous.call(material,shader);
    Object.assign(shader.uniforms, { surfaceAlbedo:{value:atlas.albedo}, surfaceDetails:{value:atlas.details}, surfaceIndex:{value:SURFACE_MATERIALS.indexOf(preset)}, surfaceSize:{value:settings.textureSize??preset?.size??2}, surfaceRelief:{value:relief} });
    shader.vertexShader = 'varying vec3 surfacePosition, surfaceNormal;\n'+shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nsurfacePosition = (modelMatrix * vec4(transformed,1.0)).xyz; surfaceNormal = mat3(modelMatrix) * objectNormal;');
    shader.fragmentShader = sampleFunctions+'\nuniform float surfaceIndex, surfaceSize, surfaceRelief;\n'+shader.fragmentShader;
    let compose = `vec3 surfaceColor = vec3(1.0); float surfaceHeight = .5, surfaceRoughness = 1.0;
      if(surfaceIndex >= 0.0) { surfaceColor = surfaceSample(surfaceAlbedo,surfaceIndex,surfaceSize).rgb; vec4 d = surfaceSample(surfaceDetails,surfaceIndex,surfaceSize); surfaceHeight=d.r; surfaceRoughness=d.g; }`;
    if(texturedTerrain) {
      shader.vertexShader = 'attribute vec4 surfaceMaskA, surfaceMaskB; varying vec4 maskA, maskB;\n'+shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmaskA=surfaceMaskA; maskB=surfaceMaskB;');
      shader.fragmentShader = 'varying vec4 maskA, maskB;\n'+shader.fragmentShader;
      compose += `surfaceColor *= vec3(${new THREE.Color(settings.color).toArray().join(',')});`;
      active.forEach((layer,i) => {
        const p=surfacePreset(layer.texture), index=SURFACE_MATERIALS.indexOf(p), tint=new THREE.Color(layer.color);
        shader.uniforms[`layerColor${i}`]={value:tint};
        shader.fragmentShader = `uniform vec3 layerColor${i};\n`+shader.fragmentShader;
        const weight=`${i<4?'maskA':'maskB'}[${i%4}] * ${Number(layer.opacity).toFixed(6)}`;
        compose += `{ float w = clamp(${weight},0.0,1.0); vec3 c=layerColor${i}; float h=.5, r=1.0;`;
        if(p) compose += `c *= surfaceSample(surfaceAlbedo,${index}.0,${Number(layer.textureSize??p.size).toFixed(6)}).rgb; vec4 d=surfaceSample(surfaceDetails,${index}.0,${Number(layer.textureSize??p.size).toFixed(6)}); h=d.r; r=d.g;`;
        if(!p && preset) compose += `c *= surfaceSample(surfaceAlbedo,surfaceIndex,surfaceSize).rgb; vec4 d=surfaceSample(surfaceDetails,surfaceIndex,surfaceSize); h=d.r; r=d.g;`;
        compose += 'surfaceColor=mix(surfaceColor,c,w); surfaceHeight=mix(surfaceHeight,h,w); surfaceRoughness=mix(surfaceRoughness,r,w); }';
      });
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',compose+'\ndiffuseColor.rgb *= surfaceColor;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor *= surfaceRoughness;');
    // A derivative-based height perturbation works without UVs on procedural structures/terrain.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 q0=dFdx(-vViewPosition), q1=dFdy(-vViewPosition);
      vec3 r0=cross(q1,normal), r1=cross(normal,q0); float det=dot(q0,r0);
      vec3 gradient=sign(det)*(dFdx(surfaceHeight)*r0+dFdy(surfaceHeight)*r1)*surfaceRelief;
      normal=normalize(max(abs(det),1e-12)*normal-gradient);`);
  };
  material.customProgramCacheKey = () => `surface-v1:${JSON.stringify({settings,active:active.map(({weights,...layer})=>layer),terrain:!!texturedTerrain})}`;
  material.needsUpdate=true;
}

export function applySurfaceTextures(object, entity, library) {
  const settings=entity.material;
  if (!settings) return;
  object.traverse(child => {
    if(!child.isMesh || child.userData.decorative) return;
    for(const material of Array.isArray(child.material)?child.material:[child.material]) {
      const slot=material?.name || child.userData.materialSlot || 'base';
      if(!material?.isMeshStandardMaterial || settings.textureSlot && settings.textureSlot!=='base' && settings.textureSlot!==slot) continue;
      if(surfacePreset(settings.texture)) { material.map=null; material.normalMap=null; material.bumpMap=null; material.roughnessMap=null; material.color.set(settings.color); }
      applySurfaceMaterial(material,settings,library,entity.kind==='terrain'?entity:null);
    }
  });
}

export function terrainTextureMasks(geometry, entity) {
  const layers=(entity.paintLayers??[]).filter(l=>l.visible).slice(0,8), count=entity.heights.length;
  for(let group=0;group<2;group++) {
    const data=new Float32Array(count*4);
    for(let i=0;i<count;i++) for(let c=0;c<4;c++) data[i*4+c]=layers[group*4+c]?.weights[i]??0;
    geometry.setAttribute(group?'surfaceMaskB':'surfaceMaskA',new THREE.BufferAttribute(data,4));
  }
}
