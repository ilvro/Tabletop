import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Resource owners are explicit: cached models own shared textures; each instance owns its geometry/material. */
export function disposeObject(object, { includeSharedTextures = false } = {}) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  object.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    const list = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
    for (const material of list) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture && (includeSharedTextures || !value.userData.tabletopShared)) textures.add(value);
      }
    }
    if (child.shadow?.map) child.shadow.map.dispose();
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) { texture.dispose(); texture.source?.data?.close?.(); }
  object.removeFromParent();
}

export function standardMaterial(properties = {}) {
  return new THREE.MeshStandardMaterial({
    color: properties.color ?? '#9b947e',
    roughness: properties.roughness ?? 0.82,
    metalness: properties.metalness ?? 0,
    emissive: properties.emissive ?? '#000000',
    emissiveIntensity: properties.emissiveIntensity ?? 0,
    side: THREE.DoubleSide,
  });
}

export function recipeInstance(recipe) {
  if (!Array.isArray(recipe.parts) || recipe.parts.length > 200) throw new Error('Receita de asset inválida.');
  const group = new THREE.Group();
  for (const part of recipe.parts) {
    let geometry;
    switch (part.shape) {
      case 'box': geometry = new THREE.BoxGeometry(...part.size); break;
      case 'cylinder': geometry = new THREE.CylinderGeometry(part.radiusTop, part.radiusBottom, part.height, part.segments ?? 16, 1, part.openEnded ?? false); break;
      case 'sphere': geometry = new THREE.SphereGeometry(part.radius, 16, 12); break;
      default: disposeObject(group); throw new Error(`Forma de receita não suportada: ${part.shape}.`);
    }
    const mesh = new THREE.Mesh(geometry, standardMaterial(recipe.materials?.[part.material]));
    mesh.position.fromArray(part.position ?? [0, 0, 0]);
    if (part.rotation) mesh.rotation.set(...part.rotation);
    mesh.userData.materialSlot = part.material ?? 'base';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

function modelInstance(original, record) {
  const instance = original.clone(true);
  instance.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry = child.geometry.clone();
    child.material = Array.isArray(child.material) ? child.material.map((material) => material.clone()) : child.material.clone();
    child.userData.materialSlot = child.material.name || 'base';
    child.castShadow = true;
    child.receiveShadow = true;
  });
  const scale = record.normalization?.scale ?? 1;
  instance.scale.setScalar(scale);
  const front = record.normalization?.frontRotation ?? 0;
  instance.rotation.y = front;
  instance.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(instance);
  if (!bounds.isEmpty()) {
    const center = bounds.getCenter(new THREE.Vector3());
    instance.position.set(-center.x, -bounds.min.y, -center.z);
  }
  const wrapper = new THREE.Group();
  wrapper.add(instance);
  return wrapper;
}

export function createAssetCache() {
  const entries = new Map();
  const modelLoader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();
  let destroyed = false;
  const keyOf = (record) => `${record.id}@${record.revision ?? 1}:${record.type}:${record.url}`;

  async function load(record) {
    const key = keyOf(record);
    if (entries.has(key)) return entries.get(key).promise;
    const entry = { record, abort: new AbortController(), resource: null, disposed: false };
    entry.promise = (async () => {
      let resource;
      if (record.type === 'recipe') {
        const response = await fetch(record.url, { signal: entry.abort.signal });
        if (!response.ok) throw new Error(`Asset indisponível (HTTP ${response.status}).`);
        resource = await response.json();
      } else if (record.type === 'glb' || record.type === 'model') {
        const model = await modelLoader.loadAsync(record.url);
        resource = model.scene;
        let skinned = false;
        resource.traverse((child) => {
          if (child.isSkinnedMesh) skinned = true;
          for (const material of (Array.isArray(child.material) ? child.material : [child.material]).filter(Boolean)) {
            for (const value of Object.values(material)) if (value?.isTexture) value.userData.tabletopShared = true;
          }
        });
        if (skinned) { disposeObject(resource, { includeSharedTextures: true }); throw new Error('Este slice suporta GLB estático; modelos com skin precisam ser preparados externamente.'); }
      } else if (record.type === 'image') {
        resource = await textureLoader.loadAsync(record.url);
        resource.colorSpace = THREE.SRGBColorSpace;
        resource.userData.tabletopShared = true;
      } else throw new Error(`Tipo de asset não suportado: ${record.type}.`);
      entry.resource = resource;
      if (entry.disposed || destroyed) { release(entry); throw new Error('Carregamento de asset cancelado.'); }
      return resource;
    })().catch((error) => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    });
    entries.set(key, entry);
    return entry.promise;
  }

  function release(entry) {
    entry.abort.abort();
    entry.disposed = true;
    if (entry.resource?.isObject3D) disposeObject(entry.resource, { includeSharedTextures: true });
    else if (entry.resource?.isTexture) { entry.resource.dispose(); entry.resource.source?.data?.close?.(); }
    entry.resource = null;
  }

  return {
    async createInstance(record) {
      const resource = await load(record);
      if (record.type === 'recipe') return recipeInstance(resource);
      if (record.type === 'glb' || record.type === 'model') return modelInstance(resource, record);
      throw new Error('Uma imagem precisa da representação de token.');
    },
    texture: load,
    prune(records) {
      const used = new Set(records.map(keyOf));
      for (const [key, entry] of entries) if (!used.has(key)) { entries.delete(key); release(entry); }
    },
    destroy() { destroyed = true; for (const entry of entries.values()) release(entry); entries.clear(); },
  };
}
