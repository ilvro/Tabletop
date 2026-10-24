import * as THREE from 'three';

/**
 * Characters never disappear behind the scenery. Walls, ceilings and tall objects between the camera and a token are
 * opened around it with a dithered circle (BG3-style), and a token hidden behind something can draw a silhouette.
 * Nothing changes in the document: one set of uniforms, refreshed each frame for the camera that draws.
 */
const MAX = 8;
const uniforms = { occlusionTokens: { value: Array.from({ length: MAX }, () => new THREE.Vector4()) }, occlusionCount: { value: 0 } };
const patched = new WeakSet();

/** Adds the cut-out to a material, after whatever shader changes it already has. */
export function makeOccluder(material) {
  if (!material || patched.has(material) || !(material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) return;
  patched.add(material);
  const previous = material.onBeforeCompile, key = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec4 occlusionTokens[${MAX}]; uniform int occlusionCount;
        float occlusionBayer(vec2 p) { ivec2 c = ivec2(mod(p, 4.0)); int i = c.x + c.y * 4;
          const float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.); return (m[i] + .5) / 16.0; }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        for (int i = 0; i < ${MAX}; i++) {
          if (i >= occlusionCount) break;
          vec4 token = occlusionTokens[i];
          float reach = distance(gl_FragCoord.xy, token.xy) / token.z;
          // Only what stands between the camera and the character opens; the dither fades the rim of the hole.
          if (reach < 1.0 && vViewPosition.z < token.w - .35 && occlusionBayer(gl_FragCoord.xy) > smoothstep(.62, 1.0, reach)) discard;
        }`);
  };
  material.customProgramCacheKey = () => `${key ? key.call(material) : ''}|occluder`;
  material.needsUpdate = true;
}

export function isOccluderCandidate(record, asset = null) {
  if (!record || record.actorId || record.decal || record.cable) return false;
  if (record.kind === 'wall' || record.kind === 'floor' || record.kind === 'door' || record.kind === 'window') return true;
  if (record.kind !== 'prop') return false;
  if (/roof|ceiling|vault|truss|gable/.test(record.assetRef?.id ?? '')) return true;
  const height = asset?.bounds?.[1];
  const scaleY = record.transform?.scale?.[1] ?? 1;
  return !Number.isFinite(height) || height * scaleY > 1.4;
}

/** What may hide a character: walls, roofs and ceilings, floors above head height, and objects taller than a person's chest. */
export function isOccluder(record, object, lowestToken, pickBounds = null) {
  if (!record || record.actorId || record.decal || record.cable) return false;
  if (record.kind === 'wall' || /roof|ceiling|vault|truss|gable/.test(record.assetRef?.id ?? '')) return true;
  let box = pickBounds?.get(object);
  if (!box) {
    box = new THREE.Box3().setFromObject(object);
    pickBounds?.set(object, box);
  }
  if (record.kind === 'floor') return box.min.y > lowestToken + 2.1;
  return ['prop', 'door', 'window'].includes(record.kind) && box.max.y - box.min.y > 1.4;
}

/**
 * The tokens to open the scenery for, in the pixels of the frame that is about to be drawn. `points` are world points
 * (a token's chest); `radius` is the hole in metres around each.
 */
export function updateOcclusion(camera, points, width, height, radius = 1.2) {
  let count = 0;
  const view = new THREE.Vector3(), ndc = new THREE.Vector3(), scale = camera.isPerspectiveCamera ? height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) : height / ((camera.top - camera.bottom) / camera.zoom);
  for (const point of points) {
    if (count >= MAX) break;
    view.copy(point).applyMatrix4(camera.matrixWorldInverse);
    const depth = -view.z; if (depth <= .1) continue;
    ndc.copy(point).project(camera); if (Math.abs(ndc.x) > 1.2 || Math.abs(ndc.y) > 1.2) continue;
    const pixels = radius * scale / (camera.isPerspectiveCamera ? depth : 1);
    // gl_FragCoord is in pixels of the target being drawn, from the bottom left: the caller passes its size.
    uniforms.occlusionTokens.value[count++].set((ndc.x + 1) / 2 * width, (ndc.y + 1) / 2 * height, pixels, depth);
  }
  uniforms.occlusionCount.value = count;
}
export function clearOcclusion() { uniforms.occlusionCount.value = 0; }

const silhouetteMaterials = new Map();
/** A flat colour drawn only where something stands in front of the token (depth greater than what is already there). */
export function silhouetteMaterial(color, map = null) {
  const key = `${color}|${map?.id ?? 0}`;
  if (!silhouetteMaterials.has(key)) silhouetteMaterials.set(key, new THREE.MeshBasicMaterial({ color, map, alphaTest: map ? .5 : 0, transparent: true, opacity: .55, depthFunc: THREE.GreaterDepth, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
  return silhouetteMaterials.get(key);
}
