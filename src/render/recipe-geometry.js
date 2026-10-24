import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRopeGeometry, createRingGeometry } from './mountain-primitives.js';
import { createRockGeometry } from './rock-geometry.js';
import { createArchGeometry, createFoliageGeometry } from './landscape-geometry.js';
import { createBranchGeometry, createConiferGeometry, createTimberGeometry, createStaveGeometry } from './botanical-primitives.js';
import { createProfileGeometry } from './architectural-primitives.js';
import { surfacePreset } from '../domain/materials.js';
import { craftedBox, turnedGeometry, ellipsoidGeometry, weldVertices } from './crafted-geometry.js';

export const GEOMETRY_VERSION = 1;

function serializeGeometry(geometry) {
  const attributes = {};
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    attributes[name] = {
      array: attr.array,
      itemSize: attr.itemSize,
      normalized: Boolean(attr.normalized),
    };
  }
  const index = geometry.index ? {
    array: geometry.index.array,
    itemSize: geometry.index.itemSize ?? 1,
    normalized: Boolean(geometry.index.normalized),
  } : null;
  const boundingBox = geometry.boundingBox
    ? { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() }
    : null;
  const boundingSphere = geometry.boundingSphere
    ? { center: geometry.boundingSphere.center.toArray(), radius: geometry.boundingSphere.radius }
    : null;
  return {
    attributes,
    index,
    userData: structuredClone(geometry.userData ?? {}),
    boundingBox,
    boundingSphere,
  };
}

export function deserializeGeometry(serialized) {
  const geometry = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(serialized.attributes)) {
    geometry.setAttribute(name, new THREE.BufferAttribute(attr.array, attr.itemSize, attr.normalized));
  }
  if (serialized.index) {
    geometry.setIndex(new THREE.BufferAttribute(serialized.index.array, serialized.index.itemSize ?? 1, serialized.index.normalized));
  }
  geometry.userData = structuredClone(serialized.userData ?? {});
  if (serialized.boundingBox) {
    geometry.boundingBox = new THREE.Box3(
      new THREE.Vector3(...serialized.boundingBox.min),
      new THREE.Vector3(...serialized.boundingBox.max),
    );
  }
  if (serialized.boundingSphere) {
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(...serialized.boundingSphere.center),
      serialized.boundingSphere.radius,
    );
  }
  return geometry;
}

export function buildPartGeometry(part, rockShape = null, vegetationSeed = null) {
  switch (part.shape) {
    case 'box': return craftedBox(part);
    case 'lathe': return turnedGeometry(part);
    case 'ellipsoid': return ellipsoidGeometry(part);
    case 'cylinder': return new THREE.CylinderGeometry(part.radiusTop, part.radiusBottom, part.height, part.segments ?? 16, 1, part.openEnded ?? false);
    case 'sphere': return new THREE.SphereGeometry(part.radius, part.segments ?? 16, part.rings ?? 12);
    case 'rock': {
      const settings = { ...part, ...(rockShape && !part.fixedRock ? { ...rockShape, seed: (rockShape.seed + (part.seedOffset ?? 0)) % 65536 } : {}) };
      return createRockGeometry(settings);
    }
    case 'rope': return createRopeGeometry(part);
    case 'ring': return createRingGeometry(part);
    case 'arch': return createArchGeometry(part);
    case 'foliage': return createFoliageGeometry({ ...part, ...(vegetationSeed != null ? { seed: (vegetationSeed + (part.seed ?? 0)) % 65536 } : {}) });
    case 'conifer': return createConiferGeometry({ ...part, ...(vegetationSeed != null ? { seed: (vegetationSeed + (part.seed ?? 0)) % 65536 } : {}) });
    case 'branch': return createBranchGeometry({ ...part, ...(vegetationSeed != null ? { seed: (vegetationSeed + (part.seed ?? 0)) % 65536 } : {}) });
    case 'timber': return createTimberGeometry(part);
    case 'stave': return createStaveGeometry(part);
    case 'profile': return createProfileGeometry(part);
    default: throw new Error(`Forma de receita não suportada: ${part.shape}.`);
  }
}

/**
 * Pure geometry builder usable both on the main thread and inside a module Web Worker.
 * Returns serializable typed-array buffers and transform metadata for each mesh batch.
 */
export function buildRecipeGeometryPayload(recipe, rockShape = null, metricBounds = null, vegetationSeed = null) {
  if (!Array.isArray(recipe?.parts) || recipe.parts.length > 200) throw new Error('Receita de asset inválida.');
  const rawParts = [];
  const tempGroup = new THREE.Group();
  try {
    for (const part of recipe.parts) {
      const geometry = buildPartGeometry(part, rockShape, vegetationSeed);
      const mesh = new THREE.Mesh(geometry);
      const slot = part.material ?? 'base';
      const flatShading = Boolean(geometry.userData.faceted);
      const hasSurface = Boolean(surfacePreset(part.surface?.texture));
      const recipeSurface = hasSurface ? structuredClone(part.surface) : undefined;
      mesh.position.fromArray(part.position ?? [0, 0, 0]);
      if (part.rotation) mesh.rotation.set(...part.rotation);
      if (vegetationSeed != null && part.rotation) {
        const jitter = (Math.sin(vegetationSeed * 1.19 + tempGroup.children.length * 7.13) - Math.sin(tempGroup.children.length * 7.13)) * .09;
        mesh.rotation.y += jitter;
        mesh.rotation.z += jitter * .5;
      }
      mesh.userData = { materialSlot: slot, flatShading, recipeSurface };
      tempGroup.add(mesh);
      rawParts.push(mesh);
    }

    const outParts = [];
    if (recipe.mergeParts) {
      const batches = new Map();
      tempGroup.updateMatrixWorld(true);
      for (const mesh of tempGroup.children) {
        const key = JSON.stringify([mesh.userData.materialSlot, mesh.userData.recipeSurface, mesh.userData.flatShading]);
        if (!batches.has(key)) {
          batches.set(key, {
            slot: mesh.userData.materialSlot,
            flatShading: mesh.userData.flatShading,
            recipeSurface: mesh.userData.recipeSurface,
            rocks: [],
            snowProxies: [],
            geometries: [],
          });
        }
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrix);
        if (!geometry.attributes.uv) {
          geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
        }
        batches.get(key).geometries.push(geometry);
        if (mesh.geometry.userData.snowProxy) {
          const proxy = mesh.geometry.userData.snowProxy, p = [];
          for (let i = 0; i < proxy.positions.length; i += 3) {
            p.push(...new THREE.Vector3(...proxy.positions.slice(i, i + 3)).applyMatrix4(mesh.matrix).toArray());
          }
          batches.get(key).snowProxies.push({ positions: p, indices: [...proxy.indices] });
        }
        if (mesh.geometry.userData.rock) {
          batches.get(key).rocks.push({
            ...mesh.geometry.userData.rock,
            triangles: (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3,
          });
        }
      }
      for (const mesh of [...tempGroup.children]) {
        mesh.geometry.dispose();
        mesh.removeFromParent();
      }
      for (const batch of batches.values()) {
        let geometry = mergeGeometries(batch.geometries);
        if (!batch.rocks.length && !batch.snowProxies.length) {
          const welded = weldVertices(geometry);
          geometry.dispose();
          geometry = welded;
        }
        if (batch.rocks.length) geometry.userData.rocks = batch.rocks;
        if (batch.snowProxies.length) geometry.userData.snowProxies = batch.snowProxies;
        for (const g of batch.geometries) g.dispose();
        const mesh = new THREE.Mesh(geometry);
        mesh.userData = {
          materialSlot: batch.slot,
          flatShading: batch.flatShading,
          recipeSurface: batch.recipeSurface,
        };
        tempGroup.add(mesh);
      }
    }

    const fittedBounds = ((rockShape || vegetationSeed != null) && metricBounds) ? metricBounds : recipe.fitBounds;
    let groupScale = [1, 1, 1];
    let groupPosition = [0, 0, 0];
    if (fittedBounds) {
      if (!Array.isArray(fittedBounds) || fittedBounds.length !== 3 || fittedBounds.some(v => !Number.isFinite(v) || v <= 0)) {
        throw new Error('Dimensões de receita inválidas.');
      }
      tempGroup.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(tempGroup);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      groupScale = [fittedBounds[0] / size.x, fittedBounds[1] / size.y, fittedBounds[2] / size.z];
      groupPosition = [-center.x * groupScale[0], -bounds.min.y * groupScale[1], -center.z * groupScale[2]];
    }

    for (const mesh of tempGroup.children) {
      outParts.push({
        ...serializeGeometry(mesh.geometry),
        slot: mesh.userData.materialSlot,
        flatShading: mesh.userData.flatShading,
        recipeSurface: mesh.userData.recipeSurface,
        position: mesh.position.toArray(),
        rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
      });
    }
    return {
      parts: outParts,
      groupScale,
      groupPosition,
    };
  } finally {
    for (const child of [...tempGroup.children]) {
      child.geometry?.dispose?.();
      child.removeFromParent();
    }
  }
}

