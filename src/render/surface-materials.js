import * as THREE from 'three';
import { SURFACE_MATERIALS, surfacePreset, textureOptions } from '../domain/materials.js';

export { generateSurfaceAtlas, generateSurfaceTile } from './surface-pixels.js';
import { generateSurfaceAtlas, packSurfaceTiles, surfaceStyleKey, surfaceReferenceLuma } from './surface-pixels.js';

let pixels;
/** Custom atlases are reference counted by material, never retained after their last mesh. */
export function createSurfaceLibrary() {
  let atlas;
  const variants=new Map();
  const upload = data => {
    const texture = (bytes, colorSpace) => {
      const result = new THREE.DataTexture(bytes, data.width, data.height); result.colorSpace = colorSpace;
      result.minFilter = THREE.LinearMipmapLinearFilter; result.magFilter = THREE.LinearFilter;
      result.generateMipmaps = true; result.needsUpdate = true; result.userData.tabletopShared = true; return result;
    };
    return {albedo:texture(data.albedo,THREE.SRGBColorSpace),details:texture(data.details,THREE.NoColorSpace),columns:data.columns,rows:data.rows};
  };
  const dispose = resource => {resource.albedo.dispose();resource.details.dispose();};
  const get = () => { if(!atlas) { pixels ??= generateSurfaceAtlas(); atlas=upload(pixels); } return atlas; };
  return {
    get,
    acquire(settings, material) {
      const unique=[...new Map(settings.map(s=>[surfaceStyleKey(s),s])).entries()].sort(([a],[b])=>a.localeCompare(b));
      const original=unique.every(([,s])=>surfaceStyleKey(s)===surfaceStyleKey({texture:s.texture}));
      if(original) return {...get(),index:s=>SURFACE_MATERIALS.findIndex(p=>p.id===s?.texture)};
      const key=JSON.stringify(unique.map(([k])=>k));
      let entry=variants.get(key);
      if(!entry) {entry={...upload(packSurfaceTiles(unique.map(([,s])=>s),Math.ceil(Math.sqrt(unique.length)))),refs:0};variants.set(key,entry);}
      entry.refs++;
      const release=()=>{material.removeEventListener('dispose',release); if(variants.get(key)!==entry)return; if(--entry.refs===0) {dispose(entry);variants.delete(key);} };
      material.addEventListener('dispose',release);
      return {...entry,index:s=>unique.findIndex(([k])=>k===surfaceStyleKey(s))};
    },
    get variantCount() {return variants.size;},
    dispose() {if(atlas) {dispose(atlas);atlas=null;} for(const entry of variants.values())dispose(entry);variants.clear();},
  };
}
const sampleFunctions = `
  uniform sampler2D surfaceAlbedo, surfaceDetails;
  uniform vec2 surfaceLayout;
  varying vec3 surfacePosition, surfaceNormal;
  vec4 tileSample(sampler2D atlas, vec2 p, float index, float rotation) {
    float c=cos(rotation), s=sin(rotation);
    vec2 f = fract(mat2(c,-s,s,c)*(p-vec2(.5))+vec2(.5)); f = (f * 255.0 + .5) / 256.0;
    vec2 offset=vec2(mod(index,surfaceLayout.x),floor(index/surfaceLayout.x));
    return texture2D(atlas,(f+offset)/surfaceLayout);
  }
  vec4 surfaceSample(sampler2D atlas, float index, float size, float rotation) {
    vec3 w = pow(abs(normalize(surfaceNormal)), vec3(4.0)); w /= max(.0001,w.x+w.y+w.z);
    vec3 p = surfacePosition / size;
    return tileSample(atlas,p.zy,index,rotation)*w.x + tileSample(atlas,p.xz,index,rotation)*w.y + tileSample(atlas,p.xy,index,rotation)*w.z;
  }
  vec3 customizeSurface(vec3 c, vec3 tint, vec4 adjustments, float mode, float reference) {
    float gray=dot(c,vec3(.2126,.7152,.0722));
    if(mode>1.5) c=tint*clamp(gray/reference,0.05,2.0);
    else if(mode>.5) c*=tint;
    if(adjustments.z!=1.0) c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,adjustments.z);
    if(adjustments.y!=1.0) c=(c-vec3(.18))*adjustments.y+vec3(.18);
    return max(vec3(0.0),c*adjustments.x);
  }
`;
function customization(shader, prefix, settings) {
  const o=textureOptions(settings), mode=['original','tint','replace'].indexOf(o.textureColorMode);
  const angle=(o.textureRotation+(settings.texture==='wood' && o.woodDirection==='vertical'?90:0))*Math.PI/180;
  Object.assign(shader.uniforms,{
    [`${prefix}Tint`]:{value:new THREE.Color(o.textureColor)},
    [`${prefix}Adjust`]:{value:new THREE.Vector4(o.textureBrightness,o.textureContrast,o.textureSaturation,0)},
    [`${prefix}Mode`]:{value:mode},[`${prefix}Rotation`]:{value:angle},
    [`${prefix}Reference`]:{value:surfacePreset(settings.texture)?surfaceReferenceLuma(settings):1},
  });
  shader.fragmentShader=`uniform vec3 ${prefix}Tint; uniform vec4 ${prefix}Adjust; uniform float ${prefix}Mode, ${prefix}Rotation, ${prefix}Reference;\n`+shader.fragmentShader;
  return c=>`customizeSurface(${c},${prefix}Tint,${prefix}Adjust,${prefix}Mode,${prefix}Reference)`;
}

/** Apply per-instance; imported materials and the atlas are never mutated by another entity. */
export function applySurfaceMaterial(material, settings, library, terrain = null) {
  const preset = surfacePreset(settings?.texture), layers = terrain?.paintLayers ?? [];
  const texturedTerrain = layers.some(layer => layer.visible && surfacePreset(layer.texture));
  if (!preset && !texturedTerrain) return;
  const active = layers.filter(layer => layer.visible).slice(0,8);
  const atlas = library.acquire([...(preset?[settings]:[]),...active.filter(layer=>surfacePreset(layer.texture))],material);
  material.userData.surface = { texture: preset?.id ?? 'none', size: settings.textureSize ?? preset?.size ?? 2, relief: settings.relief ?? preset?.relief ?? .03, layers: active.map(l=>l.texture??'none'), options:textureOptions(settings), layerOptions:active.map(textureOptions) };
  // Terrain color is composed in the fragment shader, retaining legacy masks and their ordering.
  if (texturedTerrain) material.vertexColors = false;
  const relief = settings.relief ?? preset?.relief ?? .03;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    previous.call(material,shader);
    Object.assign(shader.uniforms, { surfaceAlbedo:{value:atlas.albedo}, surfaceDetails:{value:atlas.details}, surfaceLayout:{value:new THREE.Vector2(atlas.columns,atlas.rows)}, surfaceIndex:{value:preset?atlas.index(settings):-1}, surfaceSize:{value:settings.textureSize??preset?.size??2}, surfaceRelief:{value:relief} });
    shader.vertexShader = 'varying vec3 surfacePosition, surfaceNormal;\n'+shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nsurfacePosition = (modelMatrix * vec4(transformed,1.0)).xyz; surfaceNormal = mat3(modelMatrix) * objectNormal;');
    shader.fragmentShader = sampleFunctions+'\nuniform float surfaceIndex, surfaceSize, surfaceRelief;\n'+shader.fragmentShader;
    const customize=customization(shader,'baseSurface',settings);
    const baseSample=channel=>`surfaceSample(${channel},surfaceIndex,surfaceSize,baseSurfaceRotation)`;
    let compose = `vec3 surfaceColor = vec3(1.0); float surfaceHeight = .5, surfaceRoughness = 1.0, surfaceMetalness = 1.0;
      if(surfaceIndex >= 0.0) { surfaceColor = ${customize(baseSample('surfaceAlbedo')+'.rgb')}; vec4 d = ${baseSample('surfaceDetails')}; surfaceHeight=d.r; surfaceRoughness=d.g; surfaceMetalness=d.b; }`;
    if(texturedTerrain) {
      shader.vertexShader = 'attribute vec4 surfaceMaskA, surfaceMaskB; varying vec4 maskA, maskB;\n'+shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmaskA=surfaceMaskA; maskB=surfaceMaskB;');
      shader.fragmentShader = 'varying vec4 maskA, maskB;\n'+shader.fragmentShader;
      compose += `surfaceColor *= vec3(${new THREE.Color(settings.color).toArray().join(',')});`;
      active.forEach((layer,i) => {
        const p=surfacePreset(layer.texture), index=p?atlas.index(layer):-1, tint=new THREE.Color(layer.color);
        shader.uniforms[`layerColor${i}`]={value:tint};
        shader.fragmentShader = `uniform vec3 layerColor${i};\n`+shader.fragmentShader;
        const weight=`${i<4?'maskA':'maskB'}[${i%4}] * ${Number(layer.opacity).toFixed(6)}`;
        compose += `{ float w = clamp(${weight},0.0,1.0); vec3 c=layerColor${i}; float h=.5, r=1.0, m=1.0;`;
        if(p) {
          const custom=customization(shader,`paint${i}`,layer);
          const sample=channel=>`surfaceSample(${channel},${index}.0,${Number(layer.textureSize??p.size).toFixed(6)},paint${i}Rotation)`;
          compose += `c *= ${custom(sample('surfaceAlbedo')+'.rgb')}; vec4 d=${sample('surfaceDetails')}; h=d.r; r=d.g; m=d.b;`;
        }
        if(!p && preset) compose += `c *= ${customize(baseSample('surfaceAlbedo')+'.rgb')}; vec4 d=${baseSample('surfaceDetails')}; h=d.r; r=d.g; m=d.b;`;
        compose += 'surfaceColor=mix(surfaceColor,c,w); surfaceHeight=mix(surfaceHeight,h,w); surfaceRoughness=mix(surfaceRoughness,r,w); surfaceMetalness=mix(surfaceMetalness,m,w); }';
      });
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',compose+'\ndiffuseColor.rgb *= surfaceColor;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor *= surfaceRoughness;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor *= surfaceMetalness;');
    // A derivative-based height perturbation works without UVs on procedural structures/terrain.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 q0=dFdx(-vViewPosition), q1=dFdy(-vViewPosition);
      vec3 r0=cross(q1,normal), r1=cross(normal,q0); float det=dot(q0,r0);
      vec3 gradient=sign(det)*(dFdx(surfaceHeight)*r0+dFdy(surfaceHeight)*r1)*surfaceRelief;
      normal=normalize(max(abs(det),1e-12)*normal-gradient);`);
  };
  material.customProgramCacheKey = () => `surface-v2:${JSON.stringify({settings,active:active.map(({weights,...layer})=>layer),terrain:!!texturedTerrain})}`;
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
