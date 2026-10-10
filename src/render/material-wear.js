import * as THREE from 'three';

const hooks = new WeakMap();
const functions = `
  varying vec3 wearPosition;
  uniform vec3 wearMin, wearExtent, wearCenter, wearColor;
  uniform vec4 wearPattern, wearFinish;
  uniform vec3 wearRegion;
  float wearHash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
  float wearNoise(vec3 p) {
    vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(wearHash(i),wearHash(i+vec3(1,0,0)),f.x),mix(wearHash(i+vec3(0,1,0)),wearHash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(wearHash(i+vec3(0,0,1)),wearHash(i+vec3(1,0,1)),f.x),mix(wearHash(i+vec3(0,1,1)),wearHash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float wearWeight() {
    vec3 p=wearPosition/wearPattern.y+vec3(wearPattern.z*.013,wearPattern.z*.027,wearPattern.z*.019);
    float wide=wearNoise(p), fine=wearNoise(p*7.3+vec3(2.7));
    float pattern=smoothstep(.3,.72,wide*.75+fine*.25);
    if(wearPattern.w<.5) pattern=smoothstep(.32,.72,wearNoise(p*vec3(2.8,.22,2.8))*.7+fine*.3);
    else if(wearPattern.w<1.5) pattern=smoothstep(.35,.68,wide*.7+fine*.3);
    else if(wearPattern.w<2.5) pattern=smoothstep(.42,.7,wide)*(.6+.4*fine);
    else if(wearPattern.w<3.5) pattern=smoothstep(.25,.7,wide)*(.8+.2*fine);
    else pattern=1.0-smoothstep(.012,.055,abs(wearNoise(p*2.0+wide*.65)-.5));
    vec3 uvw=(wearPosition-wearMin)/wearExtent;
    // A perfectly flat terrain/plane still has a usable centered region.
    uvw=mix(vec3(.5),uvw,step(vec3(.000101),wearExtent));
    float region=1.0;
    if(wearRegion.x>.5 && wearRegion.x<1.5 && wearExtent.y>.0001) region=1.0-smoothstep(.05,.55,uvw.y);
    else if(wearRegion.x<2.5 && wearRegion.x>1.5 && wearExtent.y>.0001) region=smoothstep(.45,.95,uvw.y);
    else if(wearRegion.x>2.5) region=1.0-smoothstep(wearRegion.y*(1.0-wearRegion.z),wearRegion.y,distance(uvw,wearCenter));
    return clamp(pattern*region*wearPattern.x,0.0,1.0);
  }
`;

/** Capture transforms relative to the authored object, cancelling all parent/world transforms. */
export function wearCoordinates(object) {
  object.updateWorldMatrix(true, true);
  const inverse = object.matrixWorld.clone().invert(), bounds = new THREE.Box3();
  const matrices = new Map();
  object.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.decorative) return;
    mesh.geometry.computeBoundingBox();
    const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    matrices.set(mesh, matrix);
    bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(matrix));
  });
  const extent = bounds.getSize(new THREE.Vector3()).max(new THREE.Vector3(.0001, .0001, .0001));
  return { matrices, min: bounds.isEmpty() ? new THREE.Vector3() : bounds.min.clone(), extent };
}

/** One uniform-driven layer, preserving maps and other shader extensions. No extra meshes/textures. */
export function applyMaterialWear(material, wear, coordinates, matrix) {
  let base = hooks.get(material);
  if (base) { material.onBeforeCompile = base.compile; material.customProgramCacheKey = base.key; }
  delete material.userData.wear; delete material.userData.wearSpace;
  if (!wear?.enabled || wear.amount === 0) { if (base) material.needsUpdate = true; return; }
  if (!base) {
    base = { compile: material.onBeforeCompile, key: material.customProgramCacheKey, program: material.customProgramCacheKey() };
    hooks.set(material, base);
  }
  material.userData.wear = structuredClone(wear);
  // The object-local frame of the layer; with `wear` it identifies the uniforms for material sharing.
  material.userData.wearSpace = [...matrix.elements, ...coordinates.min.toArray(), ...coordinates.extent.toArray()].map(v => Math.round(v * 1e4) / 1e4);
  material.onBeforeCompile = shader => {
    base.compile.call(material, shader);
    Object.assign(shader.uniforms, {
      wearMatrix: { value: matrix }, wearMin: { value: coordinates.min }, wearExtent: { value: coordinates.extent },
      wearCenter: { value: new THREE.Vector3(...wear.center) }, wearColor: { value: new THREE.Color(wear.color) },
      wearPattern: { value: new THREE.Vector4(wear.amount, wear.size, wear.seed, ['grime','rust','moss','scorch','cracks'].indexOf(wear.type)) },
      wearFinish: { value: new THREE.Vector4(wear.roughness, wear.metalness, wear.type === 'cracks' ? -wear.relief : wear.relief, 0) },
      wearRegion: { value: new THREE.Vector3(['all','base','top','region'].indexOf(wear.placement), wear.radius, wear.softness) },
    });
    shader.vertexShader = 'varying vec3 wearPosition; uniform mat4 wearMatrix;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nwearPosition=(wearMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = functions + shader.fragmentShader;
    // After original texture/terrain/coverage composition, before lighting.
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', 'float materialWearWeight=wearWeight(); diffuseColor.rgb=mix(diffuseColor.rgb,wearColor,materialWearWeight);\n#include <color_fragment>');
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_fragment>', `
      roughnessFactor=mix(roughnessFactor,wearFinish.x,materialWearWeight);
      metalnessFactor=mix(metalnessFactor,wearFinish.y,materialWearWeight);
      totalEmissiveRadiance*=1.0-materialWearWeight*.85;
      vec3 wearQ0=dFdx(-vViewPosition), wearQ1=dFdy(-vViewPosition);
      vec3 wearR0=cross(wearQ1,normal), wearR1=cross(normal,wearQ0);
      float wearDet=dot(wearQ0,wearR0);
      vec3 wearGradient=sign(wearDet)*(dFdx(materialWearWeight*wearFinish.z)*wearR0+dFdy(materialWearWeight*wearFinish.z)*wearR1);
      normal=normalize(max(abs(wearDet),1e-12)*normal-wearGradient);
      #include <lights_physical_fragment>`);
  };
  material.customProgramCacheKey = () => `${base.program}|tabletop-wear-v1`;
  material.needsUpdate = true;
}
