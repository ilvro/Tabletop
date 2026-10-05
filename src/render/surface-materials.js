import * as THREE from 'three';
import { SURFACE_MATERIALS, surfacePreset, textureOptions, distributionOptions } from '../domain/materials.js';

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
  vec3 surfaceGeometryNormal() {
    #ifdef FLAT_SHADED
      return normalize(cross(dFdx(surfacePosition),dFdy(surfacePosition))) * (gl_FrontFacing ? 1.0 : -1.0);
    #else
      return normalize(surfaceNormal);
    #endif
  }
  float surfaceHash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
  float surfaceNoise(vec3 p) {
    vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float surfaceDistribution(vec3 slope, vec4 height, vec2 variation) {
    float mottling=surfaceNoise(surfacePosition/variation.x+vec3(variation.y*.013,variation.y*.027,variation.y*.019));
    float angle=degrees(acos(clamp(surfaceGeometryNormal().y,-1.0,1.0)));
    float offset=(mottling-.5)*height.w*45.0;
    float w=1.0;
    if(slope.x>.5) {
      w=smoothstep(slope.y-slope.z*.5,slope.y+slope.z*.5,angle+offset);
      if(slope.x<1.5) w=1.0-w;
    }
    if(height.x>.5) w*=smoothstep(height.y-height.z*.5,height.y+height.z*.5,surfacePosition.y+(mottling-.5)*height.w*height.z);
    return clamp(w*(1.0-height.w*.5+height.w*.5*mottling),0.0,1.0);
  }
  vec4 tileSample(sampler2D atlas, vec2 p, float index, float rotation) {
    float c=cos(rotation), s=sin(rotation);
    vec2 raw=mat2(c,-s,s,c)*(p-vec2(.5))+vec2(.5);
    // Differentiate before wrapping: fract() otherwise picks coarse atlas mips at every repeat.
    vec2 dx=dFdx(raw)*255.0, dy=dFdy(raw)*255.0;
    float footprint=max(1.0,max(length(dx),length(dy)));
    float scale=min(1.0,128.0/footprint); dx*=scale; dy*=scale;
    // Keep the complete bilinear/trilinear footprint inside this tile, including coarse mips.
    float border=exp2(ceil(log2(min(footprint,128.0))))*.5/256.0;
    vec2 f=clamp((fract(raw)*255.0+.5)/256.0,vec2(border),vec2(1.0-border));
    vec2 offset=vec2(mod(index,surfaceLayout.x),floor(index/surfaceLayout.x));
    return textureGrad(atlas,(f+offset)/surfaceLayout,dx/256.0/surfaceLayout,dy/256.0/surfaceLayout);
  }
  vec4 surfaceSample(sampler2D atlas, float index, float size, float rotation) {
    vec3 w = pow(abs(surfaceGeometryNormal()), vec3(4.0)); w /= max(.0001,w.x+w.y+w.z);
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
function distribution(shader, prefix, settings) {
  const d=distributionOptions(settings), mode={all:0,top:1,steep:2}[d.mode]??0;
  shader.uniforms[`${prefix}Slope`]={value:new THREE.Vector3(mode,d.slopeAngle,d.slopeFade)};
  shader.uniforms[`${prefix}Height`]={value:new THREE.Vector4(d.heightEnabled?1:0,d.minHeight,d.heightFade,d.variation)};
  shader.uniforms[`${prefix}Variation`]={value:new THREE.Vector2(d.variationSize,d.seed)};
  shader.fragmentShader=`uniform vec3 ${prefix}Slope; uniform vec4 ${prefix}Height; uniform vec2 ${prefix}Variation;\n`+shader.fragmentShader;
  return `surfaceDistribution(${prefix}Slope,${prefix}Height,${prefix}Variation)`;
}
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
  const coverage=settings?.coverage, coverPreset=surfacePreset(coverage?.texture);
  const texturedTerrain = layers.some(layer => layer.visible && (surfacePreset(layer.texture) || layer.distribution?.mode && layer.distribution.mode!=='paint'));
  if (!preset && !texturedTerrain && !coverPreset) return;
  const active = layers.filter(layer => layer.visible).slice(0,8);
  const atlas = library.acquire([...(preset?[settings]:[]),...active.filter(layer=>surfacePreset(layer.texture)),...(coverPreset?[coverage]:[])],material);
  material.userData.surface = { texture: preset?.id ?? 'none', size: settings.textureSize ?? preset?.size ?? 2, relief: settings.relief ?? preset?.relief ?? .03, layers: active.map(l=>l.texture??'none'), options:textureOptions(settings), layerOptions:active.map(textureOptions), distributions:active.map(l=>distributionOptions(l.distribution)), coverage:coverage?structuredClone(coverage):null };
  // Terrain color is composed in the fragment shader, retaining legacy masks and their ordering.
  if (texturedTerrain) material.vertexColors = false;
  const relief = settings.relief ?? preset?.relief ?? .03;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    previous.call(material,shader);
    Object.assign(shader.uniforms, { surfaceAlbedo:{value:atlas.albedo}, surfaceDetails:{value:atlas.details}, surfaceLayout:{value:new THREE.Vector2(atlas.columns,atlas.rows)}, surfaceIndex:{value:preset?atlas.index(settings):-1}, surfaceSize:{value:settings.textureSize??preset?.size??2}, surfaceRelief:{value:relief} });
    shader.vertexShader = 'varying vec3 surfacePosition, surfaceNormal;\n'+shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nsurfaceNormal = inverseTransformDirection(transformedNormal,viewMatrix);');
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nsurfacePosition = (modelMatrix * vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = sampleFunctions+'\nuniform float surfaceIndex, surfaceSize, surfaceRelief;\n'+shader.fragmentShader;
    const customize=customization(shader,'baseSurface',settings);
    const baseSample=channel=>`surfaceSample(${channel},surfaceIndex,surfaceSize,baseSurfaceRotation)`;
    let compose = `vec3 surfaceColor = vec3(1.0); float surfaceHeight = .5, surfaceRoughness = 1.0, surfaceMetalness = 1.0;
      if(surfaceIndex >= 0.0) { surfaceColor = ${customize(baseSample('surfaceAlbedo')+'.rgb')}; vec4 d = ${baseSample('surfaceDetails')}; surfaceHeight=d.r; surfaceRoughness=d.g; surfaceMetalness=d.b; }`;
    // A world-space mineral field prevents repeated tiles from repeating their broad colour.
    const organic=(s,color,height)=>s.texture==='rock'&&s.rockPattern==='organic'?`{float mineral=surfaceNoise(surfacePosition/${Number((s.textureSize??3)*1.8).toFixed(6)}+vec3(${Number((s.textureSeed??0)*.017).toFixed(6)})); ${color}*=.72+mineral*.55; ${height}+=(mineral-.5)*.12;}`:'';
    compose+=organic(settings,'surfaceColor','surfaceHeight');
    if(texturedTerrain) {
      shader.vertexShader = 'attribute vec4 surfaceMaskA, surfaceMaskB; varying vec4 maskA, maskB;\n'+shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmaskA=surfaceMaskA; maskB=surfaceMaskB;');
      shader.fragmentShader = 'varying vec4 maskA, maskB;\n'+shader.fragmentShader;
      compose += `surfaceColor *= vec3(${new THREE.Color(settings.color).toArray().join(',')});`;
      active.forEach((layer,i) => {
        const p=surfacePreset(layer.texture), index=p?atlas.index(layer):-1, tint=new THREE.Color(layer.color);
        shader.uniforms[`layerColor${i}`]={value:tint};
        shader.fragmentShader = `uniform vec3 layerColor${i};\n`+shader.fragmentShader;
        const automatic=layer.distribution && layer.distribution.mode!=='paint';
        const weight=`${automatic?distribution(shader,`distribution${i}`,layer.distribution):`${i<4?'maskA':'maskB'}[${i%4}]`} * ${Number(layer.opacity).toFixed(6)}`;
        compose += `{ float w = clamp(${weight},0.0,1.0); vec3 c=layerColor${i}; float h=.5, r=1.0, m=1.0;`;
        if(p) {
          const custom=customization(shader,`paint${i}`,layer);
          const sample=channel=>`surfaceSample(${channel},${index}.0,${Number(layer.textureSize??p.size).toFixed(6)},paint${i}Rotation)`;
          compose += `c *= ${custom(sample('surfaceAlbedo')+'.rgb')}; vec4 d=${sample('surfaceDetails')}; h=d.r; r=d.g; m=d.b;`;
          compose+=organic(layer,'c','h');
        }
        if(!p && preset) compose += `c *= ${customize(baseSample('surfaceAlbedo')+'.rgb')}; vec4 d=${baseSample('surfaceDetails')}; h=d.r; r=d.g; m=d.b;`;
        compose += 'surfaceColor=mix(surfaceColor,c,w); surfaceHeight=mix(surfaceHeight,h,w); surfaceRoughness=mix(surfaceRoughness,r,w); surfaceMetalness=mix(surfaceMetalness,m,w); }';
      });
    }
    let finish='diffuseColor.rgb *= surfaceColor; float surfaceBumpHeight=surfaceHeight*surfaceRelief;';
    if(coverPreset) {
      let weight=distribution(shader,'coverage',coverage); const index=atlas.index(coverage);
      if(terrain && coverage.physicalThickness>0) {
        shader.vertexShader='attribute float surfaceSnowWeight; varying float snowWeight;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsnowWeight=surfaceSnowWeight;');
        shader.fragmentShader='varying float snowWeight;\n'+shader.fragmentShader; weight='snowWeight';
      }
      shader.uniforms.coverageTint={value:new THREE.Color(coverage.color)};
      shader.fragmentShader='uniform vec3 coverageTint;\n'+shader.fragmentShader;
      finish+=`float coverWeight=${weight}*${Number(terrain && coverage.physicalThickness>0?1:coverage.amount).toFixed(6)};
        vec3 coverColor=surfaceSample(surfaceAlbedo,${index}.0,${Number(coverage.textureSize).toFixed(6)},0.0).rgb*coverageTint;
        vec4 coverDetails=surfaceSample(surfaceDetails,${index}.0,${Number(coverage.textureSize).toFixed(6)},0.0);
        diffuseColor.rgb=mix(diffuseColor.rgb,coverColor,coverWeight);
        surfaceBumpHeight=mix(surfaceBumpHeight,coverDetails.r*${Number(coverage.relief).toFixed(6)},coverWeight);`;
    }
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n'+compose+'\n'+finish);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor *= surfaceRoughness;'+(coverPreset?`\nroughnessFactor=mix(roughnessFactor,coverDetails.g*${coverPreset.roughness.toFixed(6)},coverWeight);`:''));
    shader.fragmentShader = shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor *= surfaceMetalness;'+(coverPreset?`\nmetalnessFactor=mix(metalnessFactor,coverDetails.b*${coverPreset.metalness.toFixed(6)},coverWeight);`:''));
    // A derivative-based height perturbation works without UVs on procedural structures/terrain.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 q0=dFdx(-vViewPosition), q1=dFdy(-vViewPosition);
      vec3 r0=cross(q1,normal), r1=cross(normal,q0); float det=dot(q0,r0);
      vec3 gradient=sign(det)*(dFdx(surfaceBumpHeight)*r0+dFdy(surfaceBumpHeight)*r1);
      normal=normalize(max(abs(det),1e-12)*normal-gradient);`);
  };
  material.customProgramCacheKey = () => `surface-v2:${JSON.stringify({settings,active:active.map(({weights,...layer})=>layer),terrain:!!texturedTerrain})}`;
  material.needsUpdate=true;
}

export function applySurfaceTextures(object, entity, library) {
  const settings=entity.kind!=='terrain' && entity.material?.coverage?.physicalThickness>0 ? {...entity.material,coverage:null} : entity.material;
  if (!settings) return;
  object.traverse(child => {
    if(!child.isMesh || child.userData.decorative) return;
    for(const material of Array.isArray(child.material)?child.material:[child.material]) {
      const slot=material?.name || child.userData.materialSlot || 'base';
      if(!material?.isMeshStandardMaterial) continue;
      const selected=!settings.textureSlot || settings.textureSlot==='base' || settings.textureSlot===slot;
      if(material.userData.recipeSurface && (!selected || !surfacePreset(settings.texture))) {
        applySurfaceMaterial(material,{...material.userData.recipeSurface,...(selected?{coverage:settings.coverage}: {})},library);
        continue;
      }
      if(!selected) continue;
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
