import * as THREE from 'three';
import { standardMaterial } from './asset-cache.js';

export function applyTransform(object, transform) {
  object.position.fromArray(transform?.position ?? [0, 0, 0]);
  object.quaternion.fromArray(transform?.rotation ?? [0, 0, 0, 1]).normalize();
  object.scale.fromArray(transform?.scale ?? [1, 1, 1]);
}

export function readTransform(object) {
  return { position: object.position.toArray(), rotation: object.quaternion.toArray(), scale: object.scale.toArray() };
}

export function tagEntity(object, id) {
  object.traverse((child) => { child.userData.entityId = id; });
  return object;
}

function box(parent, size, position, material, slot = 'base') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material.clone());
  mesh.position.fromArray(position);
  mesh.userData.materialSlot = slot;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createFloor(entity) {
  const group = new THREE.Group();
  const material = standardMaterial(entity.material);
  box(group, [entity.width, entity.thickness, entity.length], [0, -entity.thickness / 2, 0], material);
  material.dispose();
  applyTransform(group, entity.transform);
  return tagEntity(group, entity.id);
}

/** A semantic opening creates physical segments, never a door in front of an intact wall. */
export function createWall(entity, doors) {
  const group = new THREE.Group();
  const material = standardMaterial(entity.material);
  const skirting = standardMaterial({ color: '#434b43', roughness: 0.9 });
  const addSection = (start, length, bottom, height) => {
    if (length <= 0.00001 || height <= 0.00001) return;
    box(group, [length, height, entity.thickness], [start + length / 2, bottom + height / 2, 0], material);
    if (bottom === 0 && height >= 0.18) box(group, [length, 0.13, entity.thickness + 0.018], [start + length / 2, 0.065, 0], skirting, 'skirting');
  };
  let cursor = 0;
  for (const door of [...doors].sort((a, b) => a.offset - b.offset)) {
    const left = door.offset - door.width / 2;
    const right = door.offset + door.width / 2;
    addSection(cursor, left - cursor, 0, entity.height);
    addSection(left, door.width, 0, door.sill ?? 0);
    const top = door.height + (door.sill ?? 0);
    addSection(left, door.width, top, entity.height - top);
    cursor = right;
  }
  addSection(cursor, entity.length - cursor, 0, entity.height);
  material.dispose();
  skirting.dispose();
  applyTransform(group, entity.transform);
  group.userData.wall = entity;
  return tagEntity(group, entity.id);
}

export function createDoor(entity, wall, angle) {
  const group = new THREE.Group();
  const frame = standardMaterial({ color: '#51483a', roughness: 0.78 });
  const leaf = standardMaterial(entity.material ?? { color: '#8c6847', roughness: 0.74 });
  const trim = 0.055;
  const sill = entity.sill ?? 0;
  const left = entity.offset - entity.width / 2;
  const right = entity.offset + entity.width / 2;
  box(group, [trim, entity.height, wall.thickness + 0.05], [left + trim / 2, sill + entity.height / 2, 0], frame, 'frame');
  box(group, [trim, entity.height, wall.thickness + 0.05], [right - trim / 2, sill + entity.height / 2, 0], frame, 'frame');
  box(group, [entity.width, trim, wall.thickness + 0.05], [entity.offset, sill + entity.height - trim / 2, 0], frame, 'frame');
  const hinge = new THREE.Group();
  const direction = entity.hinge === 'right' ? -1 : 1;
  hinge.position.set(direction === 1 ? left + trim : right - trim, sill, 0);
  hinge.rotation.y = direction * (angle ?? entity.initialAngle ?? 0);
  const width = entity.width - trim * 2;
  const height = entity.height - trim;
  box(hinge, [width, height, 0.065], [direction * width / 2, height / 2, 0], leaf, 'base');
  // Inset panel and knob preserve a readable, recognizable doorway at tabletop scale.
  box(hinge, [width * 0.77, height * 0.64, 0.075], [direction * width / 2, height * 0.55, 0], leaf, 'base');
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), standardMaterial({ color: '#cdb789', metalness: 0.7, roughness: 0.35 }));
  knob.position.set(direction * width * 0.83, height * 0.46, 0.07);
  knob.castShadow = true;
  hinge.add(knob);
  group.add(hinge);
  applyTransform(group, wall.transform);
  group.userData.wallId = wall.id;
  frame.dispose();
  leaf.dispose();
  return tagEntity(group, entity.id);
}

export function createLabel(name, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(14,28,28,.92)';
  context.beginPath();
  context.roundRect(6, 6, 500, 100, 26);
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 5;
  context.stroke();
  context.font = '600 46px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#f0eee3';
  const label = name.length > 20 ? `${name.slice(0, 19)}…` : name;
  context.fillText(label, 256, 57, 450);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }));
  sprite.scale.set(1.2, 0.27, 1);
  sprite.renderOrder = 4;
  sprite.userData.decorative = true;
  return sprite;
}

export function createToken(entity, actor) {
  const appearance = { ...actor, ...entity.visualOverride };
  const color = appearance.color ?? '#78b5a1';
  const width = Math.min(...entity.footprint);
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.43, width * 0.46, 0.10, 40), standardMaterial({ color, roughness: 0.58, metalness: 0.18 }));
  base.position.y = 0.055;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(width * 0.38, 0.018, 6, 40), standardMaterial({ color: '#e8e0c9', metalness: 0.35, roughness: 0.5 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.11;
  group.add(ring);
  const direction = new THREE.Mesh(new THREE.ConeGeometry(width * 0.075, width * 0.21, 3), standardMaterial({ color: '#eee3c2', roughness: 0.75 }));
  direction.rotation.x = Math.PI / 2;
  direction.position.set(0, 0.12, width * 0.31);
  group.add(direction);
  const label = createLabel(appearance.name ?? 'Token', color);
  label.position.y = 0.47;
  group.add(label);
  group.userData.appearance = appearance;
  applyTransform(group, entity.transform);
  return tagEntity(group, entity.id);
}

export function applyMaterialOverrides(object, base, adjustments, tint = false) {
  object.traverse((child) => {
    if (!child.isMesh || child.userData.decorative) return;
    const slot = child.userData.materialSlot ?? 'base';
    const override = { ...base, ...adjustments?.[slot] };
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!material?.isMeshStandardMaterial) continue;
      if (base?.color) {
        if (tint) material.color.multiply(new THREE.Color(base.color));
        else material.color.set(base.color);
      }
      if (adjustments?.[slot]?.color) material.color.set(adjustments[slot].color);
      if (override.roughness != null) material.roughness = override.roughness;
      if (override.metalness != null) material.metalness = override.metalness;
      if (override.emissive) material.emissive.set(override.emissive);
      if (override.emissiveIntensity != null) material.emissiveIntensity = override.emissiveIntensity;
    }
  });
}
