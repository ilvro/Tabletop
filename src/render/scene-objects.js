import * as THREE from 'three';
import { standardMaterial } from './asset-cache.js';
import { floorContour } from '../domain/geometry.js';
import { wallJoinProfile, clipWallProfile } from '../authoring/structures.js';

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
  // A floor laid at grade may coincide with a flat terrain triangle.
  material.polygonOffset = true; material.polygonOffsetFactor = -1; material.polygonOffsetUnits = -1;
  if (entity.vertices || entity.holes?.length) {
    const shape = new THREE.Shape(floorContour(entity).map(([x, z]) => new THREE.Vector2(x, z)));
    shape.holes = (entity.holes ?? []).map(ring => new THREE.Path(ring.map(([x, z]) => new THREE.Vector2(x, z))));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: entity.thickness, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material.clone()); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.materialSlot = 'base'; group.add(mesh);
  } else box(group, [entity.width, entity.thickness, entity.length], [0, -entity.thickness / 2, 0], material);
  material.dispose();
  applyTransform(group, entity.transform);
  return tagEntity(group, entity.id);
}

export function createTerrain(entity) {
  const n = entity.segments, positions = [], indices = [];
  for (let z = 0; z <= n; z++) for (let x = 0; x <= n; x++) positions.push((x / n - .5) * entity.width, entity.heights[z * (n + 1) + x], (z / n - .5) * entity.length);
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const a = z * (n + 1) + x, b = a + 1, c = a + n + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const group = new THREE.Group(), mesh = new THREE.Mesh(geometry, standardMaterial(entity.material));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.materialSlot = 'base'; group.add(mesh);
  applyTransform(group, entity.transform); return tagEntity(group, entity.id);
}

export function createAccess(entity) {
  const group = new THREE.Group(), material = standardMaterial(entity.material);
  if (entity.kind === 'stairs') {
    const depth = entity.length / entity.steps;
    for (let i = 0; i < entity.steps; i++) {
      const height = entity.height * (i + 1) / entity.steps;
      box(group, [entity.width, height, depth], [0, height / 2, -entity.length / 2 + depth * (i + .5)], material);
    }
  } else {
    const profile = new THREE.Shape();
    profile.moveTo(-entity.length / 2, 0); profile.lineTo(entity.length / 2, 0); profile.lineTo(entity.length / 2, entity.height); profile.closePath();
    const geometry = new THREE.ExtrudeGeometry(profile, { depth: entity.width, bevelEnabled: false, steps: 1, curveSegments: 1 });
    // Profile X becomes world Z and extrusion becomes centered world X.
    geometry.rotateY(-Math.PI / 2); geometry.translate(entity.width / 2, 0, 0);
    const mesh = new THREE.Mesh(geometry, material.clone()); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.materialSlot = 'base'; group.add(mesh);
  }
  material.dispose(); applyTransform(group, entity.transform);
  return tagEntity(group, entity.id);
}

/** A semantic opening creates physical segments, never a door in front of an intact wall. */
export function createWall(entity, doors, walls = []) {
  const group = new THREE.Group();
  const material = standardMaterial(entity.material);
  const skirting = standardMaterial({ color: '#434b43', roughness: 0.9 });
  skirting.polygonOffset = true; skirting.polygonOffsetFactor = -1; skirting.polygonOffsetUnits = -1;
  const profile = wallJoinProfile(entity, walls);
  const prism = (polygon, bottom, height, mat, slot) => {
    if (polygon.length < 3) return;
    const shape = new THREE.Shape(polygon.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
    geometry.rotateX(-Math.PI / 2); geometry.translate(0, bottom, 0);
    const mesh = new THREE.Mesh(geometry, mat.clone()); mesh.userData.materialSlot = slot; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  };
  const addSection = (start, length, bottom, height) => {
    if (length <= 0.00001 || height <= 0.00001) return;
    const section = clipWallProfile(profile, start === 0 ? -Infinity : start, Math.abs(start + length - entity.length) < 1e-8 ? Infinity : start + length);
    prism(section, bottom, height, material, 'base');
    if (bottom === 0 && height >= .18) prism(section, 0, .13, skirting, 'skirting');
  };
  const xs = [...new Set([0, entity.length, ...doors.flatMap(d => [d.offset - d.width / 2, d.offset + d.width / 2])])].sort((a, b) => a - b);
  for (let x = 0; x < xs.length - 1; x++) {
    const midX = (xs[x] + xs[x + 1]) / 2;
    const openings = doors.filter(d => midX > d.offset - d.width / 2 && midX < d.offset + d.width / 2);
    const ys = [...new Set([0, entity.height, ...openings.flatMap(d => [d.sill, d.sill + d.height])])].sort((a, b) => a - b);
    for (let y = 0; y < ys.length - 1; y++) {
      const midY = (ys[y] + ys[y + 1]) / 2;
      if (!openings.some(d => midY > d.sill && midY < d.sill + d.height)) addSection(xs[x], xs[x + 1] - xs[x], ys[y], ys[y + 1] - ys[y]);
    }
  }
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

export function createWindow(entity, wall) {
  const group = new THREE.Group(), frame = standardMaterial({ color: '#51483a', roughness: .72 });
  const trim = Math.min(.055, entity.width / 6, entity.height / 6), y = entity.sill + entity.height / 2;
  for (const sign of [-1, 1]) {
    box(group, [trim, entity.height, wall.thickness + .04], [entity.offset + sign * (entity.width - trim) / 2, y, 0], frame, 'frame');
    box(group, [entity.width, trim, wall.thickness + .04], [entity.offset, y + sign * (entity.height - trim) / 2, 0], frame, 'frame');
  }
  if (entity.style === 'glass') {
    const glass = standardMaterial({ ...entity.material, roughness: .16, metalness: .08 });
    glass.transparent = true; glass.opacity = .28; glass.depthWrite = false;
    const pane = box(group, [entity.width - 2 * trim, entity.height - 2 * trim, .014], [entity.offset, y, 0], glass); pane.castShadow = false; glass.dispose();
  } else if (entity.style === 'bars') {
    const count = Math.max(1, Math.floor(entity.width / .18));
    for (let i = 1; i <= count; i++) box(group, [.025, entity.height - trim * 2, .035], [entity.offset - entity.width / 2 + entity.width * i / (count + 1), y, 0], frame);
  }
  frame.dispose(); applyTransform(group, wall.transform); group.userData.wallId = wall.id;
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
