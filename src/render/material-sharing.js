/** Draws meshes that look identical with one material object for the duration
 * of a frame. Every instance owns its material so that edits stay local, but
 * three.js re-uploads all uniforms whenever the material object changes between
 * draw calls; hundreds of equal copies made that the main cost of a frame.
 *
 * Outside `begin`/`end` every mesh has its own material again, so authoring,
 * picking and thumbnails never see a shared one and nothing needs copy-on-write.
 */
export function createMaterialSharing() {
  const fixed = new WeakMap(), swapped = [], owners = new Map();
  // Compile-time identity, recomputed only when the material is marked for update.
  // three.js draws transparent double-sided materials in two passes and marks
  // them for update on every one; they are left alone.
  const volatile = material => material.transparent && material.side === 2 && !material.forceSinglePass;
  function fixedKey(material) {
    if (volatile(material)) return null;
    let entry = fixed.get(material);
    if (!entry || entry.version !== material.version) {
      const surface = material.userData.surface;
      // Terrain layers and coverage carry per-object uniforms that are not described
      // by the material itself; wear records its own frame in `wearSpace`.
      const shareable = material.isMeshStandardMaterial && !surface?.coverage && !surface?.layers?.length;
      const maps = ['map','normalMap','bumpMap','roughnessMap','metalnessMap','emissiveMap','alphaMap','aoMap','envMap'].map(name => material[name]?.id ?? 0);
      entry = { version: material.version, key: shareable ? [material.type, material.customProgramCacheKey(), JSON.stringify(material.userData), maps, material.side, material.flatShading, material.vertexColors, material.blending, material.alphaTest, material.wireframe, material.envMapIntensity, material.normalScale?.x, material.bumpScale].join('|') : null };
      fixed.set(material, entry);
    }
    return entry.key;
  }
  // The mesh list survives between frames; a stale list only shares less.
  let regrouped = 0, meshes = [], prints = new Float64Array(0), plan = [], listed = false, age = 0;
  const print = material => material.id * 131 + material.version * 31 + material.color.getHex() + material.emissive.getHex() * 3 + material.emissiveIntensity * 7919 + material.roughness * 104729 + material.metalness * 1299709 + material.opacity * 15485863 + (material.transparent ? 1 : 0) + (material.depthWrite ? 2 : 0) + (material.depthTest ? 4 : 0) + (material.visible ? 8 : 0);
  function group() {
    owners.clear(); plan = [];
    for (const mesh of meshes) {
      const material = mesh.material; if (!material?.isMeshStandardMaterial) continue;
      const base = fixedKey(material); if (base === null) continue;
      // Values that authoring changes in place, without recompiling.
      // three.js compiles per material and object traits; mixing them under one
      // material would switch programs on every draw.
      const key = `${base}|${mesh.receiveShadow}|${Object.keys(mesh.geometry.attributes)}|${material.color.getHex()}|${material.emissive.getHex()}|${material.emissiveIntensity}|${material.roughness}|${material.metalness}|${material.opacity}|${material.transparent}|${material.depthWrite}|${material.depthTest}|${material.visible}`;
      const owner = owners.get(key);
      if (!owner) owners.set(key, material);
      else if (owner !== material) plan.push(mesh, material, owner);
    }
    owners.clear();
  }
  return {
    /** Call when meshes were added to or removed from the scene. */
    invalidate() { listed = false; },
    info() { return { meshes: meshes.length, shared: plan.length / 3, regrouped }; },
    begin(root) {
      let changed = false;
      if (!listed || ++age > 120) {
        meshes = []; root.traverse(mesh => { if (mesh.isMesh && !mesh.isInstancedMesh && !mesh.isSkinnedMesh && mesh.material && !Array.isArray(mesh.material)) meshes.push(mesh); });
        if (prints.length < meshes.length) prints = new Float64Array(meshes.length);
        listed = true; age = 0; changed = true;
      }
      // One number per mesh detects any edit made since the last frame.
      for (let i = 0; i < meshes.length; i++) { const material = meshes[i].material, value = !material?.isMeshStandardMaterial || volatile(material) ? -1 : print(material); if (prints[i] !== value) { prints[i] = value; changed = true; } }
      if (changed) { group(); regrouped++; }
      for (let i = 0; i < plan.length; i += 3) { if (plan[i].material === plan[i + 1]) { plan[i].material = plan[i + 2]; swapped.push(plan[i], plan[i + 1]); } }
      return swapped.length / 2;
    },
    end() { for (let i = 0; i < swapped.length; i += 2) swapped[i].material = swapped[i + 1]; swapped.length = 0; },
  };
}
