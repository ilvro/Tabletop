import { clone, id, createLevel, createLayer, createLight } from '../domain/documents.js';
import { assemblyMembers, assemblyClosure, assemblyFor, objectById, objectTransform, transformMatrix, transformByMatrix } from '../domain/assemblies.js';
import { yawFromQuaternion, rotateXZ, snapPosition, multiplyQuaternions } from '../domain/coords.js';
import { kelvinToColor } from '../domain/lighting.js';
import { applyEnvironment, primaryLight } from '../domain/environments.js';
import { ValidationError, validateDocument } from '../domain/validation.js';
import { groupChain, isAccess, supportHeightAt, worldPoint, localPoint } from '../domain/geometry.js';

const collectionItems = value => Array.isArray(value) ? value : Object.values(value ?? {});
const requireRecord = (collection, itemId, label) => {
  const record = collection?.[itemId];
  if (!record) throw new ValidationError(`${label} não encontrado.`);
  return record;
};
function editable(record, patch, document) {
  if (document && (groupChain(document, record.groupId ?? record.parentId).some(g => g.locked) || document.layout.levels?.[record.levelId]?.locked || document.layout.layers?.[record.layerId]?.locked) || record.locked && patch?.locked !== false) throw new ValidationError('O objeto, andar ou camada está bloqueado.');
  if (document && record.anchor && patch?.anchor !== null) editable(requireRecord(document.layout.entities, record.anchor.hostId, 'Host'), undefined, document);
}
function merge(record, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new ValidationError('Patch inválido.');
  if (patch.id !== undefined && patch.id !== record.id) throw new ValidationError('O ID não pode ser alterado.');
  if (patch.kind !== undefined && patch.kind !== record.kind) throw new ValidationError('O tipo não pode ser alterado.');
  const next = { ...record, ...clone(patch) };
  for (const field of ['transform', 'material', 'fill', 'visualOverride', 'flicker', 'fog', 'volumetricFog', 'bloom', 'daylight', 'sky', 'weather', 'nightWindows']) {
    if (patch[field] && record[field]) next[field] = { ...clone(record[field]), ...clone(patch[field]) };
  }
  return next;
}
function put(collection, record) {
  if (!record?.id || Object.hasOwn(collection, record.id)) throw new ValidationError('Objeto ausente ou ID já utilizado.');
  collection[record.id] = clone(record);
}
function bakeStructuralScale(entity) {
  if (!['floor', 'terrain', 'wall', 'stairs', 'ramp'].includes(entity.kind)) return;
  const [x, y, z] = entity.transform.scale;
  if (entity.kind === 'floor') { entity.width *= x; entity.length *= z; entity.thickness *= y; if (entity.vertices) entity.vertices = entity.vertices.map(p => [p[0] * x, p[1] * z]); if (entity.holes) entity.holes = entity.holes.map(ring => ring.map(p => [p[0] * x, p[1] * z])); }
  else if (entity.kind === 'terrain') { entity.width *= x; entity.length *= z; entity.heights = entity.heights.map(h => h * y); }
  else if (isAccess(entity)) { entity.width *= x; entity.height *= y; entity.length *= z; }
  else { entity.length *= x; entity.height *= y; entity.thickness *= z; }
  entity.transform.scale = [1, 1, 1];
}
function snappingGrid(grid, override) {
  if (override === undefined) return grid;
  if (typeof override !== 'boolean') throw new ValidationError('A opção de snapping deve ser booleana.');
  return { ...grid, snap: override };
}
function snappedToken(token, grid, override, document) {
  const yaw = ((yawFromQuaternion(token.transform.rotation) % 180) + 180) % 180;
  const footprint = Math.abs(yaw - 90) < 1e-4 ? [token.footprint[1], token.footprint[0]] : token.footprint;
  token.transform.position = snapPosition(token.transform.position, snappingGrid(grid, override), footprint);
  settleOnAccess(document, token);
}
function settleOnAccess(document, record) {
  const host = document?.layout.entities[record.surfaceId];
  if ((isAccess(host) || host?.kind === 'terrain') && record.transform) record.transform.position[1] = supportHeightAt(host, record.transform.position);
}
function semanticPlacement(document, record, patch = {}, checkHost = true, initial = false) {
  const host = document.layout.entities[record.wallId ?? record.anchor?.hostId ?? record.surfaceId];
  const rehosted = ['surfaceId', 'wallId', 'anchor'].some(key => Object.hasOwn(patch, key));
  if (host && patch.levelId === undefined && host.levelId !== undefined && (initial || rehosted || !Object.hasOwn(record, 'levelId'))) record.levelId = host.levelId;
  if (isAccess(record)) {
    const levels = Object.values(document.layout.levels ?? {});
    if (patch.fromLevelId === undefined && !record.fromLevelId) {
      const hostLevel = document.layout.levels?.[host?.levelId];
      record.fromLevelId = hostLevel && Math.abs(hostLevel.elevation - record.transform.position[1]) < 1e-6 ? hostLevel.id : levels.find(l => Math.abs(l.elevation - record.transform.position[1]) < 1e-6)?.id ?? null;
    }
    if (!record.toLevelId && patch.toLevelId === undefined) record.toLevelId = levels.find(l => l.id !== record.fromLevelId && Math.abs(l.elevation - record.transform.position[1] - record.height) < 1e-6)?.id ?? null;
    const from = document.layout.levels?.[record.fromLevelId], to = document.layout.levels?.[record.toLevelId];
    if (from && to) { record.transform.position[1] = from.elevation; record.height = to.elevation - from.elevation; record.levelId = from.id; }
  }
  if (record.anchor) {
    const anchorHost = requireRecord(document.layout.entities, record.anchor.hostId, 'Host'); if (checkHost) editable(anchorHost, undefined, document);
    const offset = [...record.anchor.offset]; if (record.anchor.socket === 'ceiling') offset[1] -= anchorHost.thickness;
    const position = worldPoint(anchorHost, offset);
    if (record.transform) { record.transform.position = position; record.transform.rotation = clone(anchorHost.transform.rotation); }
    else {
      record.position = position;
      if (record.type === 'spot') {
        if (patch.rotation) {
          const [x, y, z, w] = anchorHost.transform.rotation;
          record.anchor.rotation = multiplyQuaternions([-x, -y, -z, w], patch.rotation);
        }
        record.rotation = multiplyQuaternions(anchorHost.transform.rotation, record.anchor.rotation ?? [0, 0, 0, 1]);
      } else record.rotation = clone(anchorHost.transform.rotation);
    }
  }
}
function dependentIds(document, entityId) {
  const ids = new Set([entityId]);
  let added = true;
  while (added) {
    added = false;
    for (const entity of Object.values(document.layout.entities)) {
      if (!ids.has(entity.id) && (ids.has(entity.wallId) || ids.has(entity.surfaceId) || ids.has(entity.anchor?.hostId))) { ids.add(entity.id); added = true; }
    }
  }
  return ids;
}
function removeEntity(document, entityId) {
  requireRecord(document.layout.entities, entityId, 'Entidade');
  const ids = dependentIds(document, entityId), look = document.look ?? document.defaultLook;
  for (const value of ids) editable(document.layout.entities[value], undefined, document);
  for (const token of Object.values(document.tokens ?? {})) if (ids.has(token.surfaceId)) editable(token, undefined, document);
  for (const light of Object.values(look.lights)) if (ids.has(light.surfaceId) || ids.has(light.anchor?.hostId)) { editable(light, undefined, document); delete look.lights[light.id]; if (look.environmentBindings) delete look.environmentBindings[light.id]; }
  for (const value of ids) {
    delete document.layout.entities[value]; delete look.materialAdjustments[value]; if (look.environmentBindings) delete look.environmentBindings[value];
    if (document.sessionState) delete document.sessionState.doors[value];
  }
  for (const area of Object.values(document.layout.areas)) {
    if (ids.has(area.surfaceId)) delete document.layout.areas[area.id];
    else area.memberIds = area.memberIds.filter(value => !ids.has(value));
  }
  for (const entity of Object.values(document.layout.entities)) if (entity.floorIds?.some(key => ids.has(key))) { editable(entity, undefined, document); entity.floorIds = entity.floorIds.filter(key => !ids.has(key)); }
  for (const composition of Object.values(document.layout.compositions ?? {})) if (!document.layout.areas[composition.areaId]) delete document.layout.compositions[composition.id];
  for (const token of Object.values(document.tokens ?? {})) if (ids.has(token.surfaceId)) removeToken(document, token.id);
}
function removeToken(document, tokenId) {
  const token = requireRecord(document.tokens, tokenId, 'Token'); editable(token, undefined, document);
  delete document.tokens[tokenId];
  if (!Object.values(document.tokens).some(item => item.actorId === token.actorId)) delete document.actors[token.actorId];
}
function offsetPosition(transform, offset) { transform.position = transform.position.map((v, i) => v + offset[i]); }
function duplicateEntity(document, payload) {
  const entity = requireRecord(document.layout.entities, payload.id, 'Entidade'); editable(entity, undefined, document);
  let offset = payload.offset ?? [document.layout.grid.cellSize, 0, document.layout.grid.cellSize];
  if (entity.transform) {
    const desired = entity.transform.position.map((v, i) => v + offset[i]);
    const snapped = snapPosition(desired, snappingGrid(document.layout.grid, payload.snap));
    // Move a duplicated composition by one delta; individual walls retain their joins.
    offset = snapped.map((v, i) => v - entity.transform.position[i]);
  }
  const ids = dependentIds(document, entity.id);
  if (entity.kind === 'floor') for (const wall of Object.values(document.layout.entities).filter(e => e.floorIds?.includes(entity.id))) for (const key of dependentIds(document, wall.id)) ids.add(key);
  const remap = new Map([...ids].map(value => [value, id()]));
  const originalGroupId = entity.kind === 'floor' ? entity.groupId : null;
  if (originalGroupId) {
    const group = clone(document.layout.groups[originalGroupId]);
    group.id = id(); group.name += ' — cópia'; put(document.layout.groups, group); remap.set(originalGroupId, group.id);
  }
  const ref = value => remap.get(value) ?? value;
  for (const entityId of ids) {
    const copy = clone(document.layout.entities[entityId]); copy.id = ref(entityId); copy.name += ' — cópia';
    copy.surfaceId = ref(copy.surfaceId); copy.groupId = ref(copy.groupId);
    if (copy.anchor) copy.anchor.hostId = ref(copy.anchor.hostId);
    if (copy.floorIds) copy.floorIds = copy.floorIds.filter(key => ids.has(key)).map(ref);
    if (['door', 'window'].includes(copy.kind)) {
      copy.wallId = ref(copy.wallId);
      if (['door', 'window'].includes(entity.kind)) {
        const wall = document.layout.entities[copy.wallId];
        const others = Object.values(document.layout.entities).filter(item => ['door', 'window'].includes(item.kind) && item.wallId === copy.wallId);
        const candidates = [copy.offset + copy.width + 0.1, copy.offset - copy.width - 0.1, copy.width / 2, wall.length - copy.width / 2];
        const candidate = candidates.find(center => center >= copy.width / 2 && center <= wall.length - copy.width / 2 &&
          others.every(other => other.sill >= copy.sill + copy.height - 1e-8 || copy.sill >= other.sill + other.height - 1e-8 || Math.abs(other.offset - center) >= (other.width + copy.width) / 2 + 1e-8));
        if (candidate === undefined) throw new ValidationError('Não há espaço para duplicar a abertura nesta parede.');
        copy.offset = candidate;
      }
      const angle = document.sessionState?.doors[entityId];
      if (angle !== undefined) document.sessionState.doors[copy.id] = angle;
    } else offsetPosition(copy.transform, offset);
    put(document.layout.entities, copy);
    const look = document.look ?? document.defaultLook;
    if (look.materialAdjustments[entityId]) look.materialAdjustments[copy.id] = clone(look.materialAdjustments[entityId]);
    if (look.environmentBindings?.[entityId]) look.environmentBindings[copy.id] = clone(look.environmentBindings[entityId]);
  }
  for (const area of Object.values(document.layout.areas)) {
    if (!ids.has(area.surfaceId)) continue;
    const copy = clone(area); copy.id = id(); remap.set(area.id, copy.id); copy.name += ' — cópia'; copy.groupId = ref(copy.groupId);
    copy.surfaceId = ref(copy.surfaceId); copy.memberIds = copy.memberIds.map(ref); offsetPosition(copy.transform, offset); put(document.layout.areas, copy);
  }
  for (const token of Object.values(document.tokens ?? {})) {
    if (!ids.has(token.surfaceId)) continue;
    const copy = clone(token); copy.id = id(); copy.surfaceId = ref(copy.surfaceId); copy.groupId = ref(copy.groupId); offsetPosition(copy.transform, offset); put(document.tokens, copy);
  }
  const look = document.look ?? document.defaultLook;
  for (const light of Object.values(look.lights)) {
    if (!ids.has(light.surfaceId) && !ids.has(light.anchor?.hostId)) continue;
    const copy = clone(light); copy.id = id(); remap.set(light.id, copy.id); copy.surfaceId = ref(copy.surfaceId); copy.groupId = ref(copy.groupId);
    copy.position = copy.position.map((v, i) => v + offset[i]); put(look.lights, copy);
    if (copy.anchor) look.lights[copy.id].anchor.hostId = ref(copy.anchor.hostId);
    if (look.environmentBindings?.[light.id]) look.environmentBindings[copy.id] = clone(look.environmentBindings[light.id]);
  }
  for (const source of Object.values(document.layout.compositions ?? {})) {
    if (!remap.has(source.areaId)) continue;
    const copy = clone(source); copy.id = id(); copy.areaId = ref(copy.areaId);
    for (const slot of Object.values(copy.slots)) {
      if (!remap.has(slot.id)) remap.set(slot.id, id()); slot.id = ref(slot.id);
      for (const field of ['surfaceId', 'groupId']) slot.baseline[field] = ref(slot.baseline[field]);
      const transform = slot.baseline.transform; if (transform) offsetPosition(transform, offset);
      else slot.baseline.position = slot.baseline.position.map((v, i) => v + offset[i]);
    }
    put(document.layout.compositions, copy);
  }
}
function duplicateAssembly(target, source, payload) {
  const root=requireRecord(source.layout.groups,payload.id,'Composição');
  if (!root.anchored) throw new ValidationError('Selecione uma composição ancorada.');
  const offset=payload.offset ?? [target.layout.grid.cellSize,0,target.layout.grid.cellSize];
  const members=assemblyClosure(source,assemblyMembers(source,root.id).map(record => record.id));
  for (const record of members) editable(record,undefined,source);
  const groups=Object.values(source.layout.groups).filter(group => group.id===root.id || groupChain(source,group.parentId).some(parent => parent.id===root.id));
  for(const group of groups) editable(group,undefined,source);
  const remap=new Map([...groups,...members].map(record => [record.id,id()])), ref=key => remap.get(key) ?? key;
  const ownedEntity=key => remap.has(key) ? ref(key) : target.layout.entities[key] ? key : null;
  const ownedGroup=key => remap.has(key) ? ref(key) : target.layout.groups[key] ? key : null;
  const sourceLook=source.look ?? source.defaultLook, targetLook=target.look ?? target.defaultLook;
  for(const group of groups) { const copy=clone(group); copy.id=ref(group.id); copy.parentId=ownedGroup(group.parentId); copy.name+=' — cópia'; if(copy.transform) offsetPosition(copy.transform,offset); put(target.layout.groups,copy); }
  for(const record of members) {
    const copy=clone(record); copy.id=ref(record.id); copy.groupId=remap.has(record.groupId) ? ref(record.groupId) : ref(root.id); copy.surfaceId=ownedEntity(record.surfaceId); if(copy.name) copy.name+=' — cópia';
    for(const field of ['levelId','fromLevelId','toLevelId']) if(copy[field] && !target.layout.levels?.[copy[field]]) copy[field]=null;
    if(copy.layerId && !target.layout.layers?.[copy.layerId]) copy.layerId=null;
    if(copy.anchor) { copy.anchor.hostId=ownedEntity(copy.anchor.hostId); if(!copy.anchor.hostId) copy.anchor=null; }
    if(copy.wallId) copy.wallId=ownedEntity(copy.wallId); if(copy.floorIds) copy.floorIds=copy.floorIds.map(ownedEntity).filter(Boolean);
    if(copy.transform) offsetPosition(copy.transform,offset); else if(copy.position) copy.position=copy.position.map((value,i) => value+offset[i]);
    if(source.layout.entities[record.id]) { put(target.layout.entities,copy); if(sourceLook.materialAdjustments[record.id]) targetLook.materialAdjustments[copy.id]=clone(sourceLook.materialAdjustments[record.id]); if(target.sessionState && source.sessionState?.doors[record.id] !== undefined) target.sessionState.doors[copy.id]=source.sessionState.doors[record.id]; }
    else if(source.tokens?.[record.id]) {
      if(!target.actors[copy.actorId]) { const actor=clone(source.actors[copy.actorId]); actor.id=id(); put(target.actors,actor); copy.actorId=actor.id; }
      put(target.tokens,copy);
    } else { delete copy.role; put(targetLook.lights,copy); }
    if(sourceLook.environmentBindings?.[record.id]) { targetLook.environmentBindings ??= {}; targetLook.environmentBindings[copy.id]=clone(sourceLook.environmentBindings[record.id]); }
  }
}

function carrySupports(document, previous, next) {
  const deltaYaw = yawFromQuaternion(next.transform.rotation) - yawFromQuaternion(previous.transform.rotation);
  const before = previous.transform.position, after = [...next.transform.position];
  after[1] += (next.supportHeight ?? 0) * next.transform.scale[1] - (previous.supportHeight ?? 0) * previous.transform.scale[1];
  const carry = transform => {
    const local = transform.position.map((v, i) => v - before[i]);
    transform.position = rotateXZ(local, deltaYaw).map((v, i) => v + after[i]);
    const [x, y, z, w] = transform.rotation, half = deltaYaw * Math.PI / 360;
    const s = Math.sin(half), c = Math.cos(half);
    transform.rotation = [c * x + s * z, c * y + s * w, c * z - s * x, c * w - s * y];
  };
  if (before.every((v, i) => v === after[i]) && Math.abs(deltaYaw) < 1e-8 && !(isAccess(next) && ['height', 'length', 'steps'].some(key => previous[key] !== next[key])) && !(next.kind === 'terrain' && ['heights', 'width', 'length'].some(key => JSON.stringify(previous[key]) !== JSON.stringify(next[key])))) return;
  const supports = dependentIds(document, previous.id); supports.delete(previous.id);
  const heightDeltas = new Map();
  const settle = record => {
    if (record.surfaceId === next.id && (isAccess(next) || next.kind === 'terrain')) {
      const delta = supportHeightAt(next, record.transform.position) - record.transform.position[1];
      record.transform.position[1] += delta; heightDeltas.set(record.id, delta);
    }
  };
  const entities = Object.values(document.layout.entities).filter(e => supports.has(e.id) && e.transform);
  for (const entity of entities) { editable(entity, undefined, document); carry(entity.transform); settle(entity); }
  const inheritedHeight = record => {
    let host = record.surfaceId;
    while (host && host !== next.id) { if (heightDeltas.has(host)) return heightDeltas.get(host); host = document.layout.entities[host]?.surfaceId; }
    return 0;
  };
  for (const entity of entities) entity.transform.position[1] += inheritedHeight(entity);
  const hosts = new Set([previous.id, ...supports]);
  for (const token of Object.values(document.tokens ?? {})) if (hosts.has(token.surfaceId)) { editable(token, undefined, document); carry(token.transform); settle(token); token.transform.position[1] += inheritedHeight(token); }
  for (const area of Object.values(document.layout.areas)) if (hosts.has(area.surfaceId)) carry(area.transform);
  for (const light of Object.values((document.look ?? document.defaultLook).lights)) if (hosts.has(light.surfaceId)) { editable(light, undefined, document);
    const oldPosition = [...light.position], t = { position: light.position, rotation: light.rotation }; carry(t);
    t.position[1] += inheritedHeight(light);
    if (light.surfaceId === next.id && (isAccess(next) || next.kind === 'terrain')) t.position[1] += supportHeightAt(next, t.position) - supportHeightAt(previous, oldPosition) - (after[1] - before[1]);
    light.position = t.position; light.rotation = t.rotation;
  }
}

function refreshAnchors(document) {
  const records = [...Object.values(document.layout.entities), ...Object.values((document.look ?? document.defaultLook).lights)];
  const done = new Set();
  function refresh(record, visiting = new Set()) {
    if (!record.anchor || done.has(record.id)) return;
    if (visiting.has(record.id)) throw new ValidationError('Ciclo de ancoragem.');
    visiting.add(record.id);
    const host = document.layout.entities[record.anchor.hostId]; if (host) refresh(host, visiting);
    const before = clone(record); semanticPlacement(document, record, {}, false);
    if (JSON.stringify(before) !== JSON.stringify(record)) editable(before, undefined, document);
    if (record.transform && record.supportHeight) carrySupports(document, before, record);
    done.add(record.id);
  }
  records.forEach(record => refresh(record));
}

function moveLevel(document, levelId, elevation) {
  const level = requireRecord(document.layout.levels, levelId, 'Andar'); editable(level, undefined, document);
  if (!Number.isFinite(elevation)) throw new ValidationError('Altura do andar inválida.');
  const delta = elevation - level.elevation;
  const records = [...Object.values(document.layout.entities), ...Object.values(document.tokens ?? {}), ...Object.values((document.look ?? document.defaultLook).lights)];
  const accesses = Object.values(document.layout.entities).filter(e => isAccess(e) && (e.fromLevelId === levelId || e.toLevelId === levelId));
  const dependents = new Set(accesses.flatMap(e => [...dependentIds(document, e.id)].filter(key => key !== e.id)));
  const onAccess = record => accesses.some(e => record.surfaceId === e.id || dependents.has(record.surfaceId));
  const affected = new Set(Object.values(document.layout.entities).filter(e => e.levelId === levelId && !isAccess(e)).flatMap(e => [...dependentIds(document, e.id)]));
  for (const record of records) if (!accesses.some(a => a.id === record.id) && !dependents.has(record.id) && !onAccess(record) && (record.levelId === levelId || affected.has(record.id) || affected.has(record.surfaceId))) {
    editable(record, undefined, document);
    const position = record.transform?.position ?? record.position; if (position) position[1] += delta;
  }
  level.elevation = elevation;
  for (const access of accesses) {
    editable(access, undefined, document); const before = clone(access);
    semanticPlacement(document, access, { levelId: access.levelId }); carrySupports(document, before, access);
  }
  for (const area of Object.values(document.layout.areas)) if (affected.has(area.surfaceId)) area.transform.position[1] += delta;
}

function duplicateLevel(document, payload) {
  const source = requireRecord(document.layout.levels, payload.id, 'Andar'); editable(source, undefined, document);
  const target = createLevel({ name: payload.name ?? `${source.name} — cópia`, elevation: payload.elevation ?? source.elevation + 3 });
  put(document.layout.levels, target);
  const ids = new Set(Object.values(document.layout.entities).filter(e => e.levelId === source.id && !isAccess(e) && e.kind !== 'terrain').map(e => e.id));
  for (const key of [...ids]) for (const dependent of dependentIds(document, key)) if (!isAccess(document.layout.entities[dependent]) && document.layout.entities[dependent].kind !== 'terrain') ids.add(dependent);
  const remap = new Map([...ids].map(key => [key, id()])), ref = key => remap.get(key) ?? key, delta = target.elevation - source.elevation;
  for (const key of ids) {
    const record = clone(document.layout.entities[key]); editable(record, undefined, document);
    record.id = ref(key); record.levelId = target.id; record.surfaceId = remap.get(record.surfaceId) ?? null;
    if (record.wallId) record.wallId = ref(record.wallId);
    if (record.floorIds) record.floorIds = record.floorIds.filter(k => ids.has(k)).map(ref);
    if (record.anchor) record.anchor.hostId = ref(record.anchor.hostId);
    if (record.transform) record.transform.position[1] += delta;
    put(document.layout.entities, record);
    const look = document.look ?? document.defaultLook; if (look.materialAdjustments[key]) look.materialAdjustments[record.id] = clone(look.materialAdjustments[key]);
    if (look.environmentBindings?.[key]) look.environmentBindings[record.id] = clone(look.environmentBindings[key]);
  }
  // Session tokens stay with their characters; copying a storey copies its construction and lighting.
  const look = document.look ?? document.defaultLook;
  for (const light of Object.values(look.lights)) if (light.levelId === source.id || ids.has(light.surfaceId) || ids.has(light.anchor?.hostId)) {
    editable(light, undefined, document); const copy = clone(light); copy.id = id(); copy.levelId = target.id; copy.surfaceId = remap.get(copy.surfaceId) ?? null; delete copy.role;
    if (copy.anchor) copy.anchor.hostId = ref(copy.anchor.hostId); copy.position[1] += delta; put(look.lights, copy);
    if (look.environmentBindings?.[light.id]) look.environmentBindings[copy.id] = clone(look.environmentBindings[light.id]);
  }
}

/** Pure atomic command application. Meshes, camera gestures and side effects stay outside. */
export function applyCommand(document, command) {
  validateDocument(document);
  if (command.documentId && command.documentId !== document.id) throw new ValidationError('O comando pertence a outro documento.');
  let next = clone(document); const payload = command.payload ?? {}, look = next.look ?? next.defaultLook;
  switch (command.type) {
    case 'level.add': case 'layer.add': {
      const field = command.type.startsWith('level') ? 'levels' : 'layers'; next.layout[field] ??= {};
      const entry = field === 'levels' ? createLevel(payload.level) : createLayer(payload.layer); put(next.layout[field], entry);
      if (field === 'levels' && payload.adoptExisting) {
        const roots = Object.values(next.layout.entities).filter(e => !e.levelId && e.transform && Math.abs(e.transform.position[1] - entry.elevation) < 1e-6);
        const ids = new Set(roots.flatMap(e => [...dependentIds(next, e.id)]));
        for (const record of [...Object.values(next.layout.entities), ...Object.values(next.tokens ?? {}), ...Object.values(look.lights)]) if (!record.levelId && (ids.has(record.id) || ids.has(record.surfaceId) || ids.has(record.anchor?.hostId))) { editable(record, undefined, next); record.levelId = entry.id; }
      }
      if (field === 'levels') for (const access of Object.values(next.layout.entities).filter(isAccess)) {
        const before = clone(access); semanticPlacement(next, access, { levelId: access.levelId });
        if (JSON.stringify(before) !== JSON.stringify(access)) editable(before, undefined, next);
      }
      break;
    }
    case 'level.move': moveLevel(next, payload.id, payload.elevation); break;
    case 'level.duplicate': duplicateLevel(next, payload); break;
    case 'level.update': case 'layer.update': {
      const field = command.type.startsWith('level') ? 'levels' : 'layers', before = requireRecord(next.layout[field], payload.id, 'Andar/camada');
      if (payload.patch?.elevation !== undefined) { moveLevel(next, payload.id, payload.patch.elevation); }
      if (!Object.keys(payload.patch ?? {}).every(key => ['visible', 'locked', 'audience'].includes(key))) editable(before, payload.patch, next);
      next.layout[field][payload.id] = merge(before, payload.patch); break;
    }
    case 'level.remove': case 'layer.remove': {
      const field = command.type.startsWith('level') ? 'levels' : 'layers', reference = field === 'levels' ? 'levelId' : 'layerId';
      editable(requireRecord(next.layout[field], payload.id, 'Andar/camada'), undefined, next);
      for (const record of [...Object.values(next.layout.entities), ...Object.values(next.tokens ?? {}), ...Object.values(look.lights)]) {
        if (record[reference] === payload.id) { editable(record, undefined, next); record[reference] = null; }
        for (const key of ['fromLevelId', 'toLevelId']) if (field === 'levels' && record[key] === payload.id) record[key] = null;
      }
      for (const composition of Object.values(next.layout.compositions ?? {})) for (const slot of Object.values(composition.slots)) if (slot.baseline[reference] === payload.id) slot.baseline[reference] = null;
      delete next.layout[field][payload.id]; break;
    }
    case 'entity.add': {
      const entity = clone(payload.entity); if (!entity) throw new ValidationError('Entidade ausente.');
      if (groupChain(next, entity.groupId).some(g => g.locked)) throw new ValidationError('A pasta está bloqueada.');
      if (entity.wallId) editable(requireRecord(next.layout.entities, entity.wallId, 'Parede'), undefined, next);
      if (entity.transform) entity.transform.position = snapPosition(entity.transform.position, snappingGrid(next.layout.grid, payload.snap));
      settleOnAccess(next, entity);
      semanticPlacement(next, entity, { levelId: entity.levelId ?? undefined }, true, true);
      editable({ ...entity, locked: false }, undefined, next);
      bakeStructuralScale(entity); put(next.layout.entities, entity); if (payload.binding) { look.environmentBindings ??= {}; look.environmentBindings[entity.id] = clone(payload.binding); } break;
    }
    case 'entity.update': {
      const before = requireRecord(next.layout.entities, payload.id, 'Entidade'); editable(before, payload.patch, next);
      if (before.wallId) editable(requireRecord(next.layout.entities, before.wallId, 'Parede'), undefined, next);
      const after = merge(before, payload.patch); bakeStructuralScale(after);
      semanticPlacement(next, after, payload.patch);
      editable({ ...after, locked: false }, undefined, next);
      if (after.wallId !== before.wallId && after.wallId) editable(requireRecord(next.layout.entities, after.wallId, 'Parede'), undefined, next);
      if (before.vertices && !payload.patch.vertices && (payload.patch.width !== undefined || payload.patch.length !== undefined)) after.vertices = before.vertices.map(([x, z]) => [x * after.width / before.width, z * after.length / before.length]);
      if (before.holes && !payload.patch.holes && (payload.patch.width !== undefined || payload.patch.length !== undefined)) after.holes = before.holes.map(ring => ring.map(([x, z]) => [x * after.width / before.width, z * after.length / before.length]));
      if (after.transform && payload.patch.transform?.position) after.transform.position = snapPosition(after.transform.position, snappingGrid(next.layout.grid, payload.snap));
      settleOnAccess(next, after);
      if (['floor', 'terrain', 'wall', 'prop', 'stairs', 'ramp'].includes(before.kind)) carrySupports(next, before, after);
      if (before.kind === 'floor' && (before.width !== after.width || before.length !== after.length)) {
        for (const area of Object.values(next.layout.areas)) if (area.surfaceId === before.id) {
          area.width *= after.width / before.width; area.length *= after.length / before.length;
          const local = rotateXZ(area.transform.position.map((v, i) => v - after.transform.position[i]), -yawFromQuaternion(after.transform.rotation));
          local[0] *= after.width / before.width; local[2] *= after.length / before.length;
          area.transform.position = rotateXZ(local, yawFromQuaternion(after.transform.rotation)).map((v, i) => v + after.transform.position[i]);
        }
      }
      if (before.levelId !== after.levelId) {
        const dependents = dependentIds(next, before.id); dependents.delete(before.id);
        for (const record of [...Object.values(next.layout.entities), ...Object.values(next.tokens ?? {}), ...Object.values(look.lights)]) if ((dependents.has(record.id) || dependents.has(record.surfaceId) || record.surfaceId === before.id || record.anchor?.hostId === before.id) && (record.levelId === before.levelId || record.levelId === undefined) && !(isAccess(record) && record.fromLevelId && record.toLevelId)) {
          editable(record, undefined, next); record.levelId = after.levelId ?? null;
        }
      }
      next.layout.entities[payload.id] = after; break;
    }
    case 'entity.remove': removeEntity(next, payload.id); break;
    case 'entity.clearSupport': {
      const entity = requireRecord(next.layout.entities, payload.id, 'Entidade'); editable(entity, undefined, next);
      if (Object.values(next.layout.entities).some(e => e.surfaceId === entity.id) || Object.values(next.tokens ?? {}).some(t => t.surfaceId === entity.id) || Object.values(look.lights).some(l => l.surfaceId === entity.id)) throw new ValidationError('Desvincule os elementos apoiados antes de remover esta superfície.');
      delete entity.supportHeight; break;
    }
    case 'entity.duplicate': duplicateEntity(next, payload); break;
    case 'token.add':
      if (next.documentType !== 'scene') throw new ValidationError('Mapas não contêm tokens de sessão.');
      if (payload.actor) {
        const existing = next.actors[payload.actor.id];
        if (!existing) put(next.actors, payload.actor);
        else if (JSON.stringify(existing) !== JSON.stringify(payload.actor)) throw new ValidationError('O ator já existe com dados diferentes.');
      }
      { const token = clone(payload.token); if (!token) throw new ValidationError('Token ausente.'); snappedToken(token, next.layout.grid, payload.snap, next); semanticPlacement(next, token, { levelId: token.levelId ?? undefined }, true, true); editable({ ...token, locked: false }, undefined, next); put(next.tokens, token); }
      break;
    case 'token.update': {
      const patch = payload.patch ?? {};
      const before = requireRecord(next.tokens, payload.id, 'Token'); editable(before, patch, next);
      const token = merge(before, patch);
      semanticPlacement(next, token, patch);
      editable({ ...token, locked: false }, undefined, next);
      if (patch.transform?.position || patch.transform?.rotation || patch.footprint || patch.surfaceId) snappedToken(token, next.layout.grid, payload.snap, next);
      next.tokens[payload.id] = token;
      if (payload.actorPatch) next.actors[token.actorId] = merge(next.actors[token.actorId], payload.actorPatch);
      break;
    }
    case 'actor.update': next.actors[payload.id] = merge(requireRecord(next.actors, payload.id, 'Ator'), payload.patch); break;
    case 'token.remove': removeToken(next, payload.id); break;
    case 'token.duplicate': {
      const token = clone(requireRecord(next.tokens, payload.id, 'Token')); editable(token, undefined, next);
      token.id = id(); offsetPosition(token.transform, payload.offset ?? [next.layout.grid.cellSize, 0, next.layout.grid.cellSize]);
      snappedToken(token, next.layout.grid, payload.snap, next); put(next.tokens, token); break;
    }
    case 'light.add': { const light = clone(payload.light); semanticPlacement(next, light, { levelId: light.levelId ?? undefined }, true, true); editable({ ...light, locked: false }, undefined, next); put(look.lights, light); if (payload.binding) { look.environmentBindings ??= {}; look.environmentBindings[light.id] = clone(payload.binding); } break; }
    case 'light.update': { const before = requireRecord(look.lights, payload.id, 'Luz'); editable(before, payload.patch, next); const after = merge(before, payload.patch);
      if (after.type === 'spot') { after.angle ??= Math.PI / 6; after.penumbra ??= .4; }
      else if (payload.patch.type !== undefined) { delete after.angle; delete after.penumbra; if (after.anchor) delete after.anchor.rotation; }
      if (payload.patch.temperature != null) after.color = kelvinToColor(payload.patch.temperature);
      else if (payload.patch.color !== undefined) after.temperature = null;
      semanticPlacement(next, after, payload.patch); editable({ ...after, locked: false }, undefined, next); look.lights[payload.id] = after; break; }
    case 'light.remove': editable(requireRecord(look.lights, payload.id, 'Luz'), undefined, next); delete look.lights[payload.id]; if (look.environmentBindings) delete look.environmentBindings[payload.id]; break;
    case 'light.duplicate': {
      const light = clone(requireRecord(look.lights, payload.id, 'Luz')); editable(light, undefined, next); light.id = id(); light.name += ' — cópia'; delete light.role;
      light.position = light.position.map((v, i) => v + (payload.offset ?? [1, 0, 1])[i]); put(look.lights, light); if (look.environmentBindings?.[payload.id]) look.environmentBindings[light.id] = clone(look.environmentBindings[payload.id]); break;
    }
    case 'grid.update': next.layout.grid = merge(next.layout.grid, payload.patch ?? payload); break;
    case 'group.bind': {
      if (!Array.isArray(payload.ids) || payload.ids.length < 2 || payload.ids.length > 256 || new Set(payload.ids).size !== payload.ids.length) throw new ValidationError('Selecione pelo menos dois objetos para ancorar juntos.');
      for (const key of payload.ids) if (!objectById(next,key) && !next.layout.groups[key]?.anchored) throw new ValidationError('Objeto selecionado não encontrado.');
      const units = new Set(payload.ids.map(key => assemblyFor(next,key)?.id ?? key));
      if (units.size < 2) throw new ValidationError('Os objetos já pertencem à mesma composição.');
      const members = assemblyClosure(next,[...units]), memberIds = new Set(members.map(record => record.id));
      for (const record of members) {
        editable(record,undefined,next);
        if (record.anchor && !memberIds.has(record.anchor.hostId) || record.wallId && !memberIds.has(record.wallId)) throw new ValidationError('Inclua a parede/teto de fixação na seleção ou solte essa fixação antes de ancorar os objetos juntos.');
      }
      const positions = members.map(record => objectTransform(next,record).position);
      const position = [0,1,2].map(axis => positions.reduce((sum,p) => sum+p[axis],0)/positions.length);
      const group = { id:payload.id ?? id(),name:payload.name ?? 'Composição ancorada',parentId:null,locked:false,audience:'all',visible:true,anchored:true,transform:{ position,rotation:[0,0,0,1],scale:[1,1,1] } };
      put(next.layout.groups,group);
      const nested = new Set([...units].filter(key => next.layout.groups[key]?.anchored));
      for (const key of nested) { const child = next.layout.groups[key]; editable(child,undefined,next); child.parentId=group.id; }
      for (const record of members) if (!groupChain(next,record.groupId).some(parent => nested.has(parent.id))) record.groupId=group.id;
      break;
    }
    case 'group.unbind': {
      const group = requireRecord(next.layout.groups,payload.id,'Composição'); editable(group,undefined,next);
      group.anchored=false; delete group.transform; break;
    }
    case 'group.transform': {
      const group = requireRecord(next.layout.groups,payload.id,'Composição'); editable(group,undefined,next);
      if (!group.anchored || !payload.transform) throw new ValidationError('Selecione uma composição ancorada.');
      const after=clone(payload.transform); after.position=snapPosition(after.position,snappingGrid(next.layout.grid,payload.snap));
      if (!after.scale.every(value => Math.abs(value-after.scale[0])<1e-8)) throw new ValidationError('A composição usa escala uniforme.');
      const delta=transformMatrix(after).multiply(transformMatrix(group.transform).invert()), ratio=after.scale[0]/group.transform.scale[0];
      const members=assemblyClosure(next,assemblyMembers(next,group.id).map(record => record.id)), memberIds=new Set(members.map(record => record.id));
      for (const record of members) {
        editable(record,undefined,next);
        if (record.anchor && !memberIds.has(record.anchor.hostId) || record.wallId && !memberIds.has(record.wallId)) throw new ValidationError('A composição tem uma fixação externa. Solte a fixação ou inclua seu suporte antes de mover.');
        if (isAccess(record) && record.fromLevelId && record.toLevelId) throw new ValidationError('Desassocie os andares deste acesso antes de mover a composição.');
      }
      for (const record of members) {
        if (record.transform) { record.transform=transformByMatrix(record.transform,delta); bakeStructuralScale(record); }
        else if (record.position) { const transformed=transformByMatrix(objectTransform(next,record),delta); record.position=transformed.position; record.rotation=transformed.rotation; }
        else { for (const field of ['offset','width','height','sill']) if (record[field] !== undefined) record[field]*=ratio; }
      }
      for (const record of members) if (record.anchor) {
        const host=next.layout.entities[record.anchor.hostId];
        record.anchor.offset=localPoint(host,record.transform?.position ?? record.position);
        if (record.anchor.socket==='ceiling') record.anchor.offset[1]+=host.thickness;
      }
      for (const child of Object.values(next.layout.groups)) if (child.id!==group.id && child.anchored && groupChain(next,child.parentId).some(parent => parent.id===group.id)) { editable(child,undefined,next); child.transform=transformByMatrix(child.transform,delta); }
      for (const area of Object.values(next.layout.areas)) if (memberIds.has(area.surfaceId)) { area.transform=transformByMatrix(area.transform,delta); area.width*=ratio; area.length*=ratio; area.transform.scale=[1,1,1]; }
      group.transform=after; break;
    }
    case 'group.duplicate': duplicateAssembly(next,next,payload); break;
    case 'group.paste': duplicateAssembly(next,validateDocument(clone(payload.document)),payload); break;
    case 'group.delete': {
      const group=requireRecord(next.layout.groups,payload.id,'Composição'); editable(group,undefined,next);
      const members=assemblyClosure(next,assemblyMembers(next,group.id).map(record => record.id));
      for(const record of members) editable(record,undefined,next);
      for(const record of members) {
        if(next.layout.entities[record.id]) removeEntity(next,record.id);
        else if(next.tokens?.[record.id]) removeToken(next,record.id);
        else { delete look.lights[record.id]; if (look.environmentBindings) delete look.environmentBindings[record.id]; }
      }
      const groupIds=Object.values(next.layout.groups).filter(child => child.id===group.id || groupChain(next,child.parentId).some(parent => parent.id===group.id)).map(child => child.id);
      for(const key of groupIds) delete next.layout.groups[key];
      break;
    }
    case 'group.add': {
      const group = clone(payload.group ?? {});
      if (!group.id) group.id = id();
      if (group.name === undefined) group.name = 'Nova pasta';
      if (group.parentId === undefined) group.parentId = null;
      if (group.locked === undefined) group.locked = false;
      if (group.audience === undefined) group.audience = 'all';
      put(next.layout.groups, group);
      break;
    }
    case 'group.update': {
      if(payload.patch && ['transform','anchored'].some(key => Object.hasOwn(payload.patch,key))) throw new ValidationError('Use ancorar, desancorar ou transformar composição para modificar esse vínculo.');
      const before = requireRecord(next.layout.groups, payload.id, 'Grupo');
      if (!payload.patch || Object.keys(payload.patch).some(key => key !== 'visible')) editable(before, payload.patch, next);
      next.layout.groups[payload.id] = merge(before, payload.patch);
      break;
    }
    case 'group.remove': {
      editable(requireRecord(next.layout.groups, payload.id, 'Grupo'), undefined, next);
      delete next.layout.groups[payload.id];
      for (const entity of Object.values(next.layout.entities)) if (entity.groupId === payload.id) entity.groupId = null;
      for (const area of Object.values(next.layout.areas)) if (area.groupId === payload.id) area.groupId = null;
      for (const group of Object.values(next.layout.groups)) if (group.parentId === payload.id) group.parentId = null;
      for (const item of [...Object.values(next.tokens ?? {}), ...Object.values(look.lights)]) if (item.groupId === payload.id) item.groupId = null;
      break;
    }
    case 'environment.key.update': {
      let light = primaryLight(look);
      if (!light) { light = createLight({ type: 'directional', role: 'key', name: 'Sol / Lua', intensity: 2.2, distance: 0, position: [4, 8, 6], shadowEnabled: true }); put(look.lights, light); }
      next = applyCommand(next, { type: 'light.update', payload: { id: light.id, patch: payload.patch } }); break;
    }
    case 'environment.binding.update': {
      const target = next.layout.entities[payload.id] ?? look.lights[payload.id];
      if (!target) throw new ValidationError('Objeto do vínculo não encontrado.'); editable(target, undefined, next);
      look.environmentBindings ??= {};
      if (payload.binding === null) delete look.environmentBindings[payload.id];
      else look.environmentBindings[payload.id] = clone(payload.binding); break;
    }
    case 'look.update': {
      const field = next.documentType === 'scene' ? 'look' : 'defaultLook'; next[field] = merge(look, payload.patch ?? payload); break;
    }
    case 'environment.apply': return applyEnvironment(next, payload.preset ?? payload.presetId);
    case 'scene.rename': next.name = payload.name; break;
    case 'camera.save':
      if (next.documentType !== 'scene') throw new ValidationError('Presets de câmera pertencem a cenas.');
      if (!payload.camera?.id) throw new ValidationError('Câmera ausente.');
      next.cameraPresets[payload.camera.id] = clone(payload.camera); break;
    case 'camera.remove': requireRecord(next.cameraPresets, payload.id, 'Câmera'); delete next.cameraPresets[payload.id]; break;
    case 'composition.detach': requireRecord(next.layout.compositions, payload.id, 'Composição'); delete next.layout.compositions[payload.id]; break;
    case 'door.setAngle': {
      const door = requireRecord(next.layout.entities, payload.id, 'Porta');
      if (door.kind !== 'door' || !next.sessionState) throw new ValidationError('Porta de sessão inválida.');
      editable(door, undefined, next);
      next.sessionState.doors[door.id] = payload.angle; break;
    }
    case 'proposal.accept': {
      const proposal = payload.proposal;
      if (!proposal || !Number.isInteger(proposal.expectedEditVersion)) throw new ValidationError('Proposta inválida.');
      if (command.expectedEditVersion !== undefined && proposal.expectedEditVersion !== command.expectedEditVersion) throw new ValidationError('A cena mudou; gere a sugestão novamente.');
      for (const group of collectionItems(proposal.groups)) put(next.layout.groups, group);
      for (const entity of collectionItems(proposal.entities)) put(next.layout.entities, entity);
      for (const area of collectionItems(proposal.areas)) put(next.layout.areas, area);
      for (const light of collectionItems(proposal.lights)) put(look.lights, light);
      for (const source of [...collectionItems(proposal.entities), ...collectionItems(proposal.lights)]) {
        const record = next.layout.entities[source.id] ?? look.lights[source.id];
        semanticPlacement(next, record, { levelId: record.levelId ?? undefined }, true, true);
        editable({ ...record, locked: false }, undefined, next); settleOnAccess(next, record);
      }
      for (const operation of proposal.removals ?? []) {
        if (!['entity', 'light', 'token'].includes(operation.kind)) throw new ValidationError('Tipo de remoção inválido.');
        next = applyCommand(next, { type: `${operation.kind}.remove`, payload: { id: operation.id } });
      }
      for (const operation of proposal.updates ?? []) {
        if (!['entity', 'light', 'token'].includes(operation.kind)) throw new ValidationError('Tipo de ajuste inválido.');
        next = applyCommand(next, { type: `${operation.kind}.update`, payload: { id: operation.id, patch: operation.patch, snap: false } });
      }
      for (const record of proposal.compositions ?? []) next.layout.compositions[record.id] = clone(record);
      break;
    }
    default: throw new ValidationError(`Comando desconhecido: ${command.type}.`);
  }
  refreshAnchors(next);
  return validateDocument(next);
}
