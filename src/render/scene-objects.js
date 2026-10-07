import { terrainSnow } from '../domain/snow.js';
import { terrainTextureMasks } from './surface-materials.js';
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
  const n = entity.segments, positions = [], indices = [], snow=terrainSnow(entity);
  for (let z = 0; z <= n; z++) for (let x = 0; x <= n; x++) positions.push((x / n - .5) * entity.width, snow.heights[z * (n + 1) + x], (z / n - .5) * entity.length);
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const a = z * (n + 1) + x, b = a + 1, c = a + n + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  terrainTextureMasks(geometry,entity);
  geometry.setAttribute('surfaceSnowWeight',new THREE.Float32BufferAttribute(snow.weights??entity.heights.map(()=>1),1));
  const material = standardMaterial({ ...entity.material, color: entity.paintLayers?.length ? '#ffffff' : entity.material.color });
  material.flatShading = entity.flatShading ?? false;
  if (entity.paintLayers?.length) {
    const base = new THREE.Color(entity.material.color), layers = entity.paintLayers.filter(layer => layer.visible).map(layer => ({ ...layer, tint: new THREE.Color(layer.color) }));
    const colors = [];
    for (let i = 0; i < entity.heights.length; i++) {
      const tint = base.clone();
      for (const layer of layers) tint.lerp(layer.tint, layer.weights[i] * layer.opacity);
      colors.push(tint.r, tint.g, tint.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); material.vertexColors = true;
  }
  const group = new THREE.Group(), mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.materialSlot = 'base'; group.add(mesh);
  if(snow.weights) {
    const border=[];for(let x=0;x<n;x++)border.push([x,x+1],[n*(n+1)+x+1,n*(n+1)+x]);for(let z=0;z<n;z++)border.push([(z+1)*(n+1),z*(n+1)],[z*(n+1)+n,(z+1)*(n+1)+n]);
    const sides=[];const at=(i,top)=>[(i%(n+1)/n-.5)*entity.width,top?snow.heights[i]:entity.heights[i],(Math.floor(i/(n+1))/n-.5)*entity.length];
    for(const [a,b] of border) {if(snow.weights[a]+snow.weights[b]<.001)continue;for(const p of [at(a,false),at(b,false),at(b,true),at(a,false),at(b,true),at(a,true)])sides.push(...p);}
    if(sides.length){const edge=new THREE.BufferGeometry();edge.setAttribute('position',new THREE.Float32BufferAttribute(sides,3));edge.computeVertexNormals();const skirt=new THREE.Mesh(edge,standardMaterial({color:entity.material.coverage.color,roughness:.86}));skirt.userData.decorative=true;skirt.userData.terrainSnowEdge=true;skirt.castShadow=true;skirt.receiveShadow=true;group.add(skirt);}
  }
  group.userData.terrainRecord = entity;
  applyTransform(group, entity.transform); return tagEntity(group, entity.id);
}

/** Same topology and material: brush samples update buffers, never GPU resources. */
export function updateTerrain(object, entity) {
  const before = object.userData.terrainRecord;
  if (!before || before.segments !== entity.segments || before.width !== entity.width || before.length !== entity.length || before.flatShading !== entity.flatShading || before.material.coverage?.physicalThickness > 0 || entity.material.coverage?.physicalThickness > 0) return null;
  if(Object.isFrozen(before)&&Object.isFrozen(entity)&&before.heights===entity.heights&&before.paintLayers===entity.paintLayers&&before.material===entity.material){object.userData.terrainRecord=entity;return {spatial:false};}
  const style = value => JSON.stringify([value.material,(value.paintLayers??[]).map(({weights,...layer})=>layer)]);
  if (before.material !== entity.material && JSON.stringify(before.material) !== JSON.stringify(entity.material) || style(before) !== style(entity)) return null;
  const mesh = object.children[0], geometry = mesh.geometry, position = geometry.attributes.position;
  const changed=geometry.userData.terrainPendingVertices??new Set();delete geometry.userData.terrainPendingVertices;
  for (let i = 0; i < entity.heights.length; i++) if (position.getY(i) !== Math.fround(entity.heights[i])) { position.setY(i,entity.heights[i]); changed.add(i); }
  const spatial=changed.size>0;
  if (spatial) { position.needsUpdate = true; updateTerrainNormals(geometry,entity.segments,changed); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); }
  terrainTextureMasks(geometry,entity);
  const colors = geometry.attributes.color;
  if (colors) {
    const base=new THREE.Color(entity.material.color),tint=new THREE.Color(),layers=(entity.paintLayers??[]).filter(l=>l.visible).map(l=>({...l,tint:new THREE.Color(l.color)}));
    for(let i=0;i<entity.heights.length;i++){tint.copy(base);for(const layer of layers)tint.lerp(layer.tint,layer.weights[i]*layer.opacity);colors.setXYZ(i,tint.r,tint.g,tint.b);}colors.needsUpdate=true;
  }
  object.userData.terrainRecord=entity;
  return { spatial };
}

/** Keep CPU picking current between pointer samples, without uploading or recomputing normals. */
export function syncTerrainPicking(object,entity){
  if(entity.material.coverage?.physicalThickness>0)return false;
  const geometry=object.children[0].geometry,position=geometry.attributes.position,changed=geometry.userData.terrainPendingVertices??=new Set();
  geometry.boundingBox??=new THREE.Box3().setFromBufferAttribute(position);
  if(!geometry.boundingSphere)geometry.computeBoundingSphere();
  const point=new THREE.Vector3();
  for(let i=0;i<entity.heights.length;i++)if(position.getY(i)!==Math.fround(entity.heights[i])){
    position.setY(i,entity.heights[i]);changed.add(i);point.fromBufferAttribute(position,i);geometry.boundingBox.expandByPoint(point);geometry.boundingSphere.radius=Math.max(geometry.boundingSphere.radius,point.distanceTo(geometry.boundingSphere.center));
  }
  return true;
}

function updateTerrainNormals(geometry,n,changed){
  const index=geometry.index,position=geometry.attributes.position,normal=geometry.attributes.normal,affected=new Set();
  const incident=vertex=>{
    const x=vertex%(n+1),z=Math.floor(vertex/(n+1)),triangles=[];
    for(let row=Math.max(0,z-1);row<=Math.min(n-1,z);row++)for(let col=Math.max(0,x-1);col<=Math.min(n-1,x);col++)for(let side=0;side<2;side++){
      const offset=(row*n+col)*6+side*3;if([0,1,2].some(i=>index.getX(offset+i)===vertex))triangles.push(offset);
    }
    return triangles;
  };
  for(const vertex of changed)for(const offset of incident(vertex))for(let i=0;i<3;i++)affected.add(index.getX(offset+i));
  if(affected.size>position.count/2){geometry.computeVertexNormals();return;}
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),cb=new THREE.Vector3(),ab=new THREE.Vector3(),sum=new THREE.Vector3();
  for(const vertex of affected){
    normal.setXYZ(vertex,0,0,0);
    // Match Three's triangle order and Float32 accumulation, including unchanged neighbours.
    for(const offset of incident(vertex)){
      a.fromBufferAttribute(position,index.getX(offset));b.fromBufferAttribute(position,index.getX(offset+1));c.fromBufferAttribute(position,index.getX(offset+2));
      cb.subVectors(c,b);ab.subVectors(a,b);cb.cross(ab);sum.fromBufferAttribute(normal,vertex).add(cb);normal.setXYZ(vertex,sum.x,sum.y,sum.z);
    }
    sum.fromBufferAttribute(normal,vertex).normalize();normal.setXYZ(vertex,sum.x,sum.y,sum.z);
  }
  normal.needsUpdate=true;
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
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!material?.isMeshStandardMaterial) continue;
      const slot = material.name || child.userData.materialSlot || 'base';
      const selected = !base?.textureSlot || base.textureSlot === 'base' || base.textureSlot === slot;
      // Scene overrides retain their legacy semantic slot and precedence, even for named GLB materials.
      const adjustment = adjustments?.[child.userData.materialSlot ?? 'base'];
      const override = { ...(selected ? base : undefined), ...adjustment };
      if (selected && base?.color) {
        if (tint) material.color.multiply(new THREE.Color(base.color));
        else material.color.set(base.color);
      }
      if (adjustment?.color) material.color.set(adjustment.color);
      if (override.roughness != null) material.roughness = override.roughness;
      if (override.metalness != null) material.metalness = override.metalness;
      if (override.emissive) material.emissive.set(override.emissive);
      if (override.emissiveIntensity != null) material.emissiveIntensity = override.emissiveIntensity;
    }
  });
}
