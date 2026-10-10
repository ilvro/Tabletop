import {sculptRockInstance} from './rock-sculpt.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createRopeGeometry,createRingGeometry } from './mountain-primitives.js';
import { createRockGeometry } from './rock-geometry.js';
import { createArchGeometry,createFoliageGeometry } from './landscape-geometry.js';
import {createBranchGeometry,createConiferGeometry,createTimberGeometry,createStaveGeometry} from './botanical-primitives.js';
import { createProfileGeometry } from './architectural-primitives.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { surfacePreset } from '../domain/materials.js';
import { craftedBox, turnedGeometry, ellipsoidGeometry, weldVertices } from './crafted-geometry.js';

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
    if (child.geometry) geometries.set(child.geometry,(geometries.get(child.geometry)??0)+1);
    const list = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : [];
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

export function recipeInstance(recipe, rockShape = null, metricBounds = null, vegetationSeed = null) {
  if (!Array.isArray(recipe.parts) || recipe.parts.length > 200) throw new Error('Receita de asset inválida.');
  const group = new THREE.Group();
  try {
    for (const part of recipe.parts) {
      let geometry;
      switch (part.shape) {
        case 'box': geometry = craftedBox(part); break;
        case 'lathe': geometry = turnedGeometry(part); break;
        case 'ellipsoid': geometry = ellipsoidGeometry(part); break;
        case 'cylinder': geometry = new THREE.CylinderGeometry(part.radiusTop, part.radiusBottom, part.height, part.segments ?? 16, 1, part.openEnded ?? false); break;
        case 'sphere': geometry = new THREE.SphereGeometry(part.radius, part.segments ?? 16, part.rings ?? 12); break;
        case 'rock': {
          const settings={...part,...(rockShape&&!part.fixedRock?{...rockShape,seed:(rockShape.seed+(part.seedOffset??0))%65536}:{})};
          geometry=createRockGeometry(settings);break;
        }
        case 'rope': geometry=createRopeGeometry(part);break;
        case 'ring': geometry=createRingGeometry(part);break;
        case 'arch': geometry=createArchGeometry(part);break;
        case 'foliage': geometry=createFoliageGeometry({...part,...(vegetationSeed!=null?{seed:(vegetationSeed+(part.seed??0))%65536}:{})});break;
        case 'conifer': geometry=createConiferGeometry({...part,...(vegetationSeed!=null?{seed:(vegetationSeed+(part.seed??0))%65536}:{})});break;
        case 'branch': geometry=createBranchGeometry({...part,...(vegetationSeed!=null?{seed:(vegetationSeed+(part.seed??0))%65536}:{})});break;
        case 'timber': geometry=createTimberGeometry(part);break;
        case 'stave': geometry=createStaveGeometry(part);break;
        case 'profile': geometry=createProfileGeometry(part);break;
        default: throw new Error(`Forma de receita não suportada: ${part.shape}.`);
      }
      const mesh = new THREE.Mesh(geometry, standardMaterial(recipe.materials?.[part.material]));
      mesh.material.flatShading=!!geometry.userData.faceted;
      if(surfacePreset(part.surface?.texture)) {mesh.material.userData.recipePreviewColor=recipe.materials?.[part.material]?.color;mesh.material.color.set('#ffffff');mesh.material.roughness=surfacePreset(part.surface.texture).roughness;mesh.material.metalness=surfacePreset(part.surface.texture).metalness;mesh.material.userData.recipeSurface=structuredClone(part.surface);}
      mesh.position.fromArray(part.position ?? [0, 0, 0]);
      if (part.rotation) mesh.rotation.set(...part.rotation);
      if(vegetationSeed!=null && part.rotation) {const jitter=(Math.sin(vegetationSeed*1.19+group.children.length*7.13)-Math.sin(group.children.length*7.13))*.09;mesh.rotation.y+=jitter;mesh.rotation.z+=jitter*.5;}
      mesh.userData.materialSlot = part.material ?? 'base';
      mesh.castShadow = !mesh.material.transparent;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  } catch(error) {disposeObject(group);throw error;}
  if(recipe.mergeParts) {
    const batches=new Map();group.updateMatrixWorld(true);
    for(const mesh of group.children) {
      const key=JSON.stringify([mesh.userData.materialSlot,mesh.material.userData.recipeSurface,mesh.material.flatShading]);
      if(!batches.has(key))batches.set(key,{material:mesh.material.clone(),slot:mesh.userData.materialSlot,rocks:[],snowProxies:[],geometries:[]});
      const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrix);
      if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
      batches.get(key).geometries.push(geometry);
      if(mesh.geometry.userData.snowProxy) {
        const proxy=mesh.geometry.userData.snowProxy,p=[];
        for(let i=0;i<proxy.positions.length;i+=3)p.push(...new THREE.Vector3(...proxy.positions.slice(i,i+3)).applyMatrix4(mesh.matrix).toArray());
        batches.get(key).snowProxies.push({positions:p,indices:[...proxy.indices]});
      }
      if(mesh.geometry.userData.rock)batches.get(key).rocks.push({...mesh.geometry.userData.rock,triangles:(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3});
    }
    for(const mesh of [...group.children])disposeObject(mesh);
    for(const batch of batches.values()) {
      let geometry=mergeGeometries(batch.geometries);
      // Weld vertices that agree in position, normal and UV: hard edges stay hard,
      // while memory and vertex work drop. Sculptable rock and snow proxies keep
      // their own vertex order.
      if(!batch.rocks.length&&!batch.snowProxies.length){const welded=weldVertices(geometry);geometry.dispose();geometry=welded;}
      if(batch.rocks.length)geometry.userData.rocks=batch.rocks;if(batch.snowProxies.length)geometry.userData.snowProxies=batch.snowProxies;for(const g of batch.geometries)g.dispose();const mesh=new THREE.Mesh(geometry,batch.material);mesh.userData.materialSlot=batch.slot;mesh.castShadow=!batch.material.transparent;mesh.receiveShadow=true;group.add(mesh);}
  }
  const fittedBounds = ((rockShape || vegetationSeed!=null) && metricBounds) ? metricBounds : recipe.fitBounds;
  if(fittedBounds) {
    if(!Array.isArray(fittedBounds)||fittedBounds.length!==3||fittedBounds.some(v=>!Number.isFinite(v)||v<=0)) {disposeObject(group);throw new Error('Dimensões de receita inválidas.');}
    group.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    group.scale.set(fittedBounds[0]/size.x,fittedBounds[1]/size.y,fittedBounds[2]/size.z);
    group.position.set(-center.x*group.scale.x,-bounds.min.y*group.scale.y,-center.z*group.scale.z);
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
    async createInstance(record, rockShape = null, vegetationSeed = null, rockSculpt = null) {
      const resource = await load(record);
      if (record.type === 'recipe') {
        if(!rockSculpt?.stamps.length){
          const assetKey=keyOf(record),key=JSON.stringify([assetKey,record.bounds,rockShape,vegetationSeed]);
          let entry=templates.get(key);
          if(!entry){const root=recipeInstance(resource,rockShape,record.bounds,vegetationSeed);root.traverse(mesh=>{if(mesh.geometry){const state=sharedGeometryOwners.get(mesh.geometry);if(state){state.refs++;state.templateRefs++;}else sharedGeometryOwners.set(mesh.geometry,{refs:1,templateRefs:1});}});entry={assetKey,root};}
          templates.delete(key);templates.set(key,entry);
          const instance=entry.root.clone(true);instance.traverse(mesh=>{if(!mesh.isMesh)return;sharedGeometryOwners.get(mesh.geometry).refs++;mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>m.clone()):mesh.material.clone();});
          while(templates.size>128){const oldest=templates.keys().next().value;disposeTemplate(templates.get(oldest).root);templates.delete(oldest);}
          return instance;
        }
        // CPU templates avoid replaying long sculpt histories on unrelated scene edits.
        const assetKey=keyOf(record),key=JSON.stringify([assetKey,record.bounds,rockShape,vegetationSeed,rockSculpt]);
        let entry=sculpted.get(key);
        if(!entry) {
          const instance=recipeInstance(resource,rockShape,record.bounds,vegetationSeed);
          try {entry={assetKey,root:sculptRockInstance(instance,rockSculpt)};}catch(error){disposeObject(instance);throw error;}
        } else sculpted.delete(key);
        sculpted.set(key,entry);
        while(sculpted.size>6){const oldest=sculpted.keys().next().value;disposeObject(sculpted.get(oldest).root);sculpted.delete(oldest);}
        const instance=entry.root.clone(true);instance.traverse(mesh=>{if(mesh.isMesh){mesh.geometry=mesh.geometry.clone();mesh.material=Array.isArray(mesh.material)?mesh.material.map(m=>m.clone()):mesh.material.clone();}});
        return instance;
      }
      if (record.type === 'glb' || record.type === 'model') return modelInstance(resource, record);
      throw new Error('Uma imagem precisa da representação de token.');
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
