import {sculptRockInstance} from './rock-sculpt.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { surfacePreset } from '../domain/materials.js';
import { defaultDerivedCache } from '../data/derived-cache.js';
import { GEOMETRY_VERSION, buildRecipeGeometryPayload, deserializeGeometry } from './recipe-geometry.js';

export { GEOMETRY_VERSION, buildRecipeGeometryPayload, deserializeGeometry };

const sharedGeometryOwners=new WeakMap();
export function releaseGeometry(geometry,owners=1){const state=sharedGeometryOwners.get(geometry);if(!state){geometry.dispose();return;}state.refs-=owners;if(state.refs===0)sharedGeometryOwners.delete(geometry);if(state.refs===0||state.refs===state.templateRefs)geometry.dispose();}

// Cached templates retain CPU arrays, but release uploaded buffers once no instance uses them.
function disposeTemplate(root){root.traverse(mesh=>{if(mesh.geometry){const state=sharedGeometryOwners.get(mesh.geometry);if(state)state.templateRefs--;}});disposeObject(root);}

/** Templates and each mesh own geometry references; instances own their materials. */
export function disposeObject(object, { includeSharedTextures = false } = {}) {
  const geometries = new Map();
  const materials = new Set();
  const textures = new Set();
  object.traverse((child) => {
    // A mesh drawing edge-wear geometry still owns a reference to its source; the derived
    // buffers are shared by a cache and are simply uploaded again if someone else needs them.
    const owned = child.userData?.wearSourceGeometry ?? child.geometry;
    if (owned !== child.geometry) child.geometry.dispose();
    if (owned) geometries.set(owned,(geometries.get(owned)??0)+1);
    const list = [...(child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : []), child.customDepthMaterial, child.customDistanceMaterial].filter(Boolean);
    for (const material of list) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture && (includeSharedTextures || !value.userData.tabletopShared)) textures.add(value);
      }
    }
    if (child.shadow?.map) child.shadow.map.dispose();
  });
  for (const [geometry,owners] of geometries) releaseGeometry(geometry,sharedGeometryOwners.has(geometry)?owners:1);
  for (const material of materials) material.dispose();
  for (const texture of textures) { texture.dispose(); texture.source?.data?.close?.(); }
  object.removeFromParent();
}

export function standardMaterial(properties = {}) {
  const opacity = Number.isFinite(properties.opacity) ? THREE.MathUtils.clamp(properties.opacity, 0, 1) : 1;
  return new THREE.MeshStandardMaterial({
    color: properties.color ?? '#9b947e',
    roughness: properties.roughness ?? 0.82,
    metalness: properties.metalness ?? 0,
    emissive: properties.emissive ?? '#000000',
    emissiveIntensity: properties.emissiveIntensity ?? 0,
    opacity,
    transparent: opacity < 1,
    depthWrite: opacity === 1,
    side: THREE.DoubleSide,
  });
}

export function assembleRecipeGroup(recipe, payload) {
  const group = new THREE.Group();
  try {
    for (const part of payload.parts) {
      const geometry = deserializeGeometry(part);
      const materialProps = recipe.materials?.[part.slot];
      const material = standardMaterial(materialProps);
      material.flatShading = Boolean(part.flatShading);
      if (part.recipeSurface && surfacePreset(part.recipeSurface.texture)) {
        material.userData.recipePreviewColor = materialProps?.color;
        material.color.set('#ffffff');
        const preset = surfacePreset(part.recipeSurface.texture);
        material.roughness = preset.roughness;
        material.metalness = preset.metalness;
        material.userData.recipeSurface = structuredClone(part.recipeSurface);
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(part.position ?? [0, 0, 0]);
      if (part.rotation) mesh.rotation.set(...part.rotation);
      mesh.userData.materialSlot = part.slot ?? 'base';
      mesh.castShadow = !material.transparent;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    group.scale.fromArray(payload.groupScale ?? [1, 1, 1]);
    group.position.fromArray(payload.groupPosition ?? [0, 0, 0]);
    return group;
  } catch (error) {
    disposeObject(group);
    throw error;
  }
}

export function recipeInstance(recipe, rockShape = null, metricBounds = null, vegetationSeed = null) {
  if (!Array.isArray(recipe.parts) || recipe.parts.length > 200) throw new Error('Receita de asset inválida.');
  const mark = globalThis.location?.search?.includes('diagnostics') && globalThis.performance?.mark;
  if (mark) performance.mark('tabletop:recipe:start');
  const payload = buildRecipeGeometryPayload(recipe, rockShape, metricBounds, vegetationSeed);
  const group = assembleRecipeGroup(recipe, payload);
  if (mark) performance.measure('tabletop:recipe', 'tabletop:recipe:start');
  return group;
}

function hashRecipeString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Worker pool for off-thread recipe geometry generation.
let recipeWorkerPool = null, nextRecipeTaskId = 1;
const recipeWorkerQueue = [];
function getRecipeWorkerPool() {
  if (recipeWorkerPool !== null) return recipeWorkerPool;
  if (typeof globalThis.Worker !== 'function') { recipeWorkerPool = []; return recipeWorkerPool; }
  const count = Math.min(2, Math.max(1, (globalThis.navigator?.hardwareConcurrency || 2) - 1));
  recipeWorkerPool = [];
  for (let i = 0; i < count; i++) {
    try {
      const worker = new Worker(new URL('./recipe-worker.js', import.meta.url), { type: 'module' });
      const slot = { worker, busy: null };
      worker.onmessage = ({ data }) => {
        const task = slot.busy; slot.busy = null; pumpRecipeWorkers();
        if (!task) return;
        if (data.error) task.reject(new Error(data.error));
        else task.resolve(data.payload);
      };
      worker.onerror = error => {
        const task = slot.busy; slot.busy = null; pumpRecipeWorkers();
        task?.reject(error instanceof Error ? error : new Error('Falha no worker de geometria.'));
      };
      recipeWorkerPool.push(slot);
    } catch { break; }
  }
  return recipeWorkerPool;
}
function pumpRecipeWorkers() {
  const pool = getRecipeWorkerPool();
  if (!pool.length || !recipeWorkerQueue.length) return;
  for (const slot of pool) {
    if (slot.busy || !recipeWorkerQueue.length) continue;
    const task = recipeWorkerQueue.shift();
    slot.busy = task;
    slot.worker.postMessage({
      id: task.id,
      recipe: task.recipe,
      rockShape: task.rockShape,
      metricBounds: task.metricBounds,
      vegetationSeed: task.vegetationSeed,
    });
  }
}
function generateRecipeInWorker(recipe, rockShape, metricBounds, vegetationSeed) {
  const pool = getRecipeWorkerPool();
  if (!pool.length) return Promise.resolve().then(() => buildRecipeGeometryPayload(recipe, rockShape, metricBounds, vegetationSeed));
  return new Promise((resolve, reject) => {
    const mark = globalThis.location?.search?.includes('diagnostics') && globalThis.performance?.mark;
    if (mark) performance.mark('tabletop:recipe:start');
    recipeWorkerQueue.push({
      id: nextRecipeTaskId++,
      recipe, rockShape, metricBounds, vegetationSeed,
      resolve: payload => { if (mark) performance.measure('tabletop:recipe', 'tabletop:recipe:start'); resolve(payload); },
      reject,
    });
    pumpRecipeWorkers();
  });
}

const pendingRecipePayloads = new Map();
export function ensureRecipePayload(recipe, { assetKey = '', rockShape = null, metricBounds = null, vegetationSeed = null, cache = defaultDerivedCache } = {}) {
  const recipeHash = assetKey || hashRecipeString(JSON.stringify(recipe));
  const key = `${GEOMETRY_VERSION}:${recipeHash}:${JSON.stringify([metricBounds, rockShape, vegetationSeed])}`;
  if (pendingRecipePayloads.has(key)) return pendingRecipePayloads.get(key);
  const promise = (async () => {
    try {
      const stored = await cache?.read('recipe-geometries', key);
      if (stored && Array.isArray(stored.parts)) return stored;
      const payload = await generateRecipeInWorker(recipe, rockShape, metricBounds, vegetationSeed);
      void cache?.write('recipe-geometries', key, payload, 128);
      return payload;
    } finally {
      pendingRecipePayloads.delete(key);
    }
  })();
  pendingRecipePayloads.set(key, promise);
  return promise;
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
  const entries = new Map(), sculpted = new Map(), templates = new Map();
  const modelLoader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();
  let destroyed = false;
  const keyOf = (record) => `${record.id}@${record.revision ?? 1}:${record.type}:${record.url}:${record.contentHash??''}`;

  async function load(record) {
    const key = keyOf(record);
    if (entries.has(key)) return entries.get(key).promise;
    const entry = { record, abort: new AbortController(), resource: null, disposed: false };
    entry.promise = (async () => {
      let resource;
      if (record.type === 'recipe') {
        const mark = globalThis.location?.search?.includes('diagnostics') && globalThis.performance?.mark, markId = `tabletop:fetch:${key}`;
        if (mark) performance.mark(markId);
        const response = await fetch(record.url, { signal: entry.abort.signal });
        if (!response.ok) throw new Error(`Asset indisponível (HTTP ${response.status}).`);
        resource = await response.json();
        if (mark) performance.measure('tabletop:fetch', markId);
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
    async createInstance(record, rockShape = null, vegetationSeed = null, rockSculpt = null) {
      const resource = await load(record);
      if (record.type === 'recipe') {
        if(!rockSculpt?.stamps.length){
          const assetKey=keyOf(record),key=JSON.stringify([assetKey,record.bounds,rockShape,vegetationSeed]);
          let entry=templates.get(key);
          if(!entry){
            const payload = await ensureRecipePayload(resource, { assetKey, rockShape, metricBounds: record.bounds, vegetationSeed });
            if (destroyed) throw new Error('Carregamento de asset cancelado.');
            entry = templates.get(key);
            if (!entry) {
              const root=assembleRecipeGroup(resource,payload);
              root.traverse(mesh=>{if(mesh.geometry){const state=sharedGeometryOwners.get(mesh.geometry);if(state){state.refs++;state.templateRefs++;}else sharedGeometryOwners.set(mesh.geometry,{refs:1,templateRefs:1});}});
              entry={assetKey,root};
            }
          }
          templates.delete(key);templates.set(key,entry);
          const instance=entry.root.clone(true);instance.traverse(mesh=>{if(!mesh.isMesh)return;sharedGeometryOwners.get(mesh.geometry).refs++;mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>m.clone()):mesh.material.clone();});
          while(templates.size>128){const oldest=templates.keys().next().value;disposeTemplate(templates.get(oldest).root);templates.delete(oldest);}
          return instance;
        }
        // CPU templates avoid replaying long sculpt histories on unrelated scene edits.
        const assetKey=keyOf(record),key=JSON.stringify([assetKey,record.bounds,rockShape,vegetationSeed,rockSculpt]);
        let entry=sculpted.get(key);
        if(!entry) {
          const payload = await ensureRecipePayload(resource, { assetKey, rockShape, metricBounds: record.bounds, vegetationSeed });
          if (destroyed) throw new Error('Carregamento de asset cancelado.');
          entry = sculpted.get(key);
          if (!entry) {
            const instance=assembleRecipeGroup(resource,payload);
            try {entry={assetKey,root:sculptRockInstance(instance,rockSculpt)};}catch(error){disposeObject(instance);throw error;}
          }
        } else sculpted.delete(key);
        sculpted.set(key,entry);
        while(sculpted.size>6){const oldest=sculpted.keys().next().value;disposeObject(sculpted.get(oldest).root);sculpted.delete(oldest);}
        const instance=entry.root.clone(true);instance.traverse(mesh=>{if(mesh.isMesh){mesh.geometry=mesh.geometry.clone();mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>m.clone()):mesh.material.clone();}});
        return instance;
      }
      if (record.type === 'glb' || record.type === 'model') return modelInstance(resource, record);
      throw new Error('Uma imagem precisa da representação de token.');
    },
    async preload(record, rockShape = null, vegetationSeed = null) {
      const resource = await load(record);
      if (record.type === 'recipe') {
        const assetKey = keyOf(record), key = JSON.stringify([assetKey, record.bounds, rockShape, vegetationSeed]);
        if (!templates.has(key)) {
          await ensureRecipePayload(resource, { assetKey, rockShape, metricBounds: record.bounds, vegetationSeed });
        }
      }
      return resource;
    },
    texture: load,
    prune(records) {
      const used = new Set(records.map(keyOf));
      for(const [key,entry] of templates)if(!used.has(entry.assetKey)){disposeTemplate(entry.root);templates.delete(key);}
      for(const [key,entry] of sculpted)if(!used.has(entry.assetKey)){disposeObject(entry.root);sculpted.delete(key);}
      for (const [key, entry] of entries) if (!used.has(key)) { entries.delete(key); release(entry); }
    },
    destroy() { destroyed = true;for(const entry of templates.values())disposeTemplate(entry.root);templates.clear(); for(const entry of sculpted.values())disposeObject(entry.root);sculpted.clear();for (const entry of entries.values()) release(entry); entries.clear(); },
  };
}
