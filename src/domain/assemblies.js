import { Matrix4, Vector3, Quaternion } from 'three';
import { groupChain, worldPoint } from './geometry.js';

export const sceneObjects = document => [...Object.values(document.layout.entities), ...Object.values(document.tokens ?? {}), ...Object.values((document.look ?? document.defaultLook).lights)];
export const objectById = (document, key) => document.layout.entities[key] ?? document.tokens?.[key] ?? (document.look ?? document.defaultLook).lights[key];

export function assemblyFor(document, key) {
  const group = document.layout.groups[key], object = objectById(document,key);
  const chain = groupChain(document, group ? group.id : object?.groupId);
  return chain.filter(entry => entry.anchored).at(-1) ?? null;
}

export function assemblyMembers(document, groupId) {
  return sceneObjects(document).filter(record => groupChain(document,record.groupId).some(group => group.id === groupId));
}

export function assemblyClosure(document, ids) {
  const selected = new Set();
  for (const key of ids) {
    const group = document.layout.groups[key];
    if (group) for (const record of assemblyMembers(document,key)) selected.add(record.id);
    else if (objectById(document,key)) selected.add(key);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const record of sceneObjects(document)) if (!selected.has(record.id) && [record.surfaceId,record.wallId,record.anchor?.hostId].some(key => selected.has(key))) { selected.add(record.id); changed = true; }
  }
  return sceneObjects(document).filter(record => selected.has(record.id));
}

export function objectTransform(document, record) {
  if (record.transform) return record.transform;
  if (record.position) return { position: record.position, rotation: record.rotation, scale: [1,1,1] };
  const host = document.layout.entities[record.wallId];
  return { position: worldPoint(host,[record.offset,record.sill ?? 0,0]), rotation:host.transform.rotation, scale:[1,1,1] };
}

export const transformMatrix = transform => new Matrix4().compose(new Vector3(...transform.position),new Quaternion(...transform.rotation),new Vector3(...transform.scale));
export function transformByMatrix(transform, matrix) {
  const position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
  matrix.clone().multiply(transformMatrix(transform)).decompose(position,rotation,scale);
  return { position:position.toArray(),rotation:rotation.normalize().toArray(),scale:scale.toArray() };
}
