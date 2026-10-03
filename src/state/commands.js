import { clone, id } from '../domain/documents.js';
import { yawFromQuaternion, rotateXZ, snapPosition } from '../domain/coords.js';
import { applyEnvironment } from '../domain/environments.js';
import { ValidationError, validateDocument } from '../domain/validation.js';
import { groupChain, isAccess, supportHeightAt } from '../domain/geometry.js';

const collectionItems = value => Array.isArray(value) ? value : Object.values(value ?? {});
const requireRecord = (collection, itemId, label) => {
  const record = collection?.[itemId];
  if (!record) throw new ValidationError(`${label} não encontrado.`);
  return record;
};
function editable(record, patch, document) {
  if (document && groupChain(document, record.groupId ?? record.parentId).some(g => g.locked) || record.locked && patch?.locked !== false) throw new ValidationError('O objeto ou sua pasta está bloqueado.');
}
function merge(record, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new ValidationError('Patch inválido.');
  if (patch.id !== undefined && patch.id !== record.id) throw new ValidationError('O ID não pode ser alterado.');
  if (patch.kind !== undefined && patch.kind !== record.kind) throw new ValidationError('O tipo não pode ser alterado.');
  const next = { ...record, ...clone(patch) };
  for (const field of ['transform', 'material', 'fill', 'visualOverride']) {
    if (patch[field] && record[field]) next[field] = { ...clone(record[field]), ...clone(patch[field]) };
  }
  return next;
}
function put(collection, record) {
  if (!record?.id || Object.hasOwn(collection, record.id)) throw new ValidationError('Objeto ausente ou ID já utilizado.');
  collection[record.id] = clone(record);
}
function bakeStructuralScale(entity) {
  if (!['floor', 'wall', 'stairs', 'ramp'].includes(entity.kind)) return;
  const [x, y, z] = entity.transform.scale;
  if (entity.kind === 'floor') { entity.width *= x; entity.length *= z; entity.thickness *= y; if (entity.vertices) entity.vertices = entity.vertices.map(p => [p[0] * x, p[1] * z]); }
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
  if (isAccess(host) && record.transform) record.transform.position[1] = supportHeightAt(host, record.transform.position);
}
function dependentIds(document, entityId) {
  const ids = new Set([entityId]);
  let added = true;
  while (added) {
    added = false;
    for (const entity of Object.values(document.layout.entities)) {
      if (!ids.has(entity.id) && (ids.has(entity.wallId) || ids.has(entity.surfaceId))) { ids.add(entity.id); added = true; }
    }
  }
  return ids;
}
function removeEntity(document, entityId) {
  requireRecord(document.layout.entities, entityId, 'Entidade');
  const ids = dependentIds(document, entityId), look = document.look ?? document.defaultLook;
  for (const value of ids) editable(document.layout.entities[value], undefined, document);
  for (const token of Object.values(document.tokens ?? {})) if (ids.has(token.surfaceId)) editable(token, undefined, document);
  for (const light of Object.values(look.lights)) if (ids.has(light.surfaceId)) { editable(light, undefined, document); delete look.lights[light.id]; }
  for (const value of ids) {
    delete document.layout.entities[value]; delete look.materialAdjustments[value];
    if (document.sessionState) delete document.sessionState.doors[value];
  }
  for (const area of Object.values(document.layout.areas)) {
    if (ids.has(area.surfaceId)) delete document.layout.areas[area.id];
    else area.memberIds = area.memberIds.filter(value => !ids.has(value));
  }
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
  const ids = dependentIds(document, entity.id), remap = new Map([...ids].map(value => [value, id()]));
  const originalGroupId = entity.kind === 'floor' ? entity.groupId : null;
  if (originalGroupId) {
    const group = clone(document.layout.groups[originalGroupId]);
    group.id = id(); group.name += ' — cópia'; put(document.layout.groups, group); remap.set(originalGroupId, group.id);
  }
  const ref = value => remap.get(value) ?? value;
  for (const entityId of ids) {
    const copy = clone(document.layout.entities[entityId]); copy.id = ref(entityId); copy.name += ' — cópia';
    copy.surfaceId = ref(copy.surfaceId); copy.groupId = ref(copy.groupId);
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
    if (!ids.has(light.surfaceId)) continue;
    const copy = clone(light); copy.id = id(); remap.set(light.id, copy.id); copy.surfaceId = ref(copy.surfaceId); copy.groupId = ref(copy.groupId);
    copy.position = copy.position.map((v, i) => v + offset[i]); put(look.lights, copy);
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
  if (before.every((v, i) => v === after[i]) && Math.abs(deltaYaw) < 1e-8 && !(isAccess(next) && ['height', 'length', 'steps'].some(key => previous[key] !== next[key]))) return;
  const supports = dependentIds(document, previous.id); supports.delete(previous.id);
  const heightDeltas = new Map();
  const settle = record => {
    if (record.surfaceId === next.id && isAccess(next)) {
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
  for (const light of Object.values(document.look?.lights ?? document.defaultLook.lights)) if (hosts.has(light.surfaceId)) { editable(light, undefined, document);
    const oldPosition = [...light.position], t = { position: light.position, rotation: light.rotation }; carry(t);
    t.position[1] += inheritedHeight(light);
    if (light.surfaceId === next.id && isAccess(next)) t.position[1] += supportHeightAt(next, t.position) - supportHeightAt(previous, oldPosition) - (after[1] - before[1]);
    light.position = t.position; light.rotation = t.rotation;
  }
}

/** Pure atomic command application. Meshes, camera gestures and side effects stay outside. */
export function applyCommand(document, command) {
  validateDocument(document);
  if (command.documentId && command.documentId !== document.id) throw new ValidationError('O comando pertence a outro documento.');
  let next = clone(document); const payload = command.payload ?? {}, look = next.look ?? next.defaultLook;
  switch (command.type) {
    case 'entity.add': {
      const entity = clone(payload.entity); if (!entity) throw new ValidationError('Entidade ausente.');
      if (groupChain(next, entity.groupId).some(g => g.locked)) throw new ValidationError('A pasta está bloqueada.');
      if (entity.wallId) editable(requireRecord(next.layout.entities, entity.wallId, 'Parede'), undefined, next);
      if (entity.transform) entity.transform.position = snapPosition(entity.transform.position, snappingGrid(next.layout.grid, payload.snap));
      settleOnAccess(next, entity);
      bakeStructuralScale(entity); put(next.layout.entities, entity); break;
    }
    case 'entity.update': {
      const before = requireRecord(next.layout.entities, payload.id, 'Entidade'); editable(before, payload.patch, next);
      if (before.wallId) editable(requireRecord(next.layout.entities, before.wallId, 'Parede'), undefined, next);
      const after = merge(before, payload.patch); bakeStructuralScale(after);
      if (after.wallId !== before.wallId && after.wallId) editable(requireRecord(next.layout.entities, after.wallId, 'Parede'), undefined, next);
      if (before.vertices && !payload.patch.vertices && (payload.patch.width !== undefined || payload.patch.length !== undefined)) after.vertices = before.vertices.map(([x, z]) => [x * after.width / before.width, z * after.length / before.length]);
      if (after.transform && payload.patch.transform?.position) after.transform.position = snapPosition(after.transform.position, snappingGrid(next.layout.grid, payload.snap));
      settleOnAccess(next, after);
      if (['floor', 'prop', 'stairs', 'ramp'].includes(before.kind)) carrySupports(next, before, after);
      if (before.kind === 'floor' && (before.width !== after.width || before.length !== after.length)) {
        for (const area of Object.values(next.layout.areas)) if (area.surfaceId === before.id) {
          area.width *= after.width / before.width; area.length *= after.length / before.length;
          const local = rotateXZ(area.transform.position.map((v, i) => v - after.transform.position[i]), -yawFromQuaternion(after.transform.rotation));
          local[0] *= after.width / before.width; local[2] *= after.length / before.length;
          area.transform.position = rotateXZ(local, yawFromQuaternion(after.transform.rotation)).map((v, i) => v + after.transform.position[i]);
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
      { const token = clone(payload.token); if (!token) throw new ValidationError('Token ausente.'); snappedToken(token, next.layout.grid, payload.snap, next); put(next.tokens, token); }
      break;
    case 'token.update': {
      const patch = payload.patch ?? {};
      const before = requireRecord(next.tokens, payload.id, 'Token'); editable(before, patch, next);
      const token = merge(before, patch);
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
    case 'light.add': put(look.lights, payload.light); break;
    case 'light.update': { const before = requireRecord(look.lights, payload.id, 'Luz'); editable(before, payload.patch, next); look.lights[payload.id] = merge(before, payload.patch); break; }
    case 'light.remove': editable(requireRecord(look.lights, payload.id, 'Luz'), undefined, next); delete look.lights[payload.id]; break;
    case 'light.duplicate': {
      const light = clone(requireRecord(look.lights, payload.id, 'Luz')); editable(light, undefined, next); light.id = id(); light.name += ' — cópia'; delete light.role;
      light.position = light.position.map((v, i) => v + (payload.offset ?? [1, 0, 1])[i]); put(look.lights, light); break;
    }
    case 'grid.update': next.layout.grid = merge(next.layout.grid, payload.patch ?? payload); break;
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
    case 'look.update': {
      const field = next.documentType === 'scene' ? 'look' : 'defaultLook'; next[field] = merge(look, payload.patch ?? payload); break;
    }
    case 'environment.apply': return applyEnvironment(next, payload.presetId);
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
  return validateDocument(next);
}
