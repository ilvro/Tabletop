import { clone, id } from '../domain/documents.js';
import { yawFromQuaternion, rotateXZ, snapPosition } from '../domain/coords.js';
import { applyEnvironment } from '../domain/environments.js';
import { ValidationError, validateDocument } from '../domain/validation.js';

const collectionItems = value => Array.isArray(value) ? value : Object.values(value ?? {});
const requireRecord = (collection, itemId, label) => {
  const record = collection?.[itemId];
  if (!record) throw new ValidationError(`${label} não encontrado.`);
  return record;
};
function editable(record, patch) {
  if (record.locked && patch?.locked !== false) throw new ValidationError('O objeto está bloqueado.');
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
  if (!['floor', 'wall'].includes(entity.kind)) return;
  const [x, y, z] = entity.transform.scale;
  if (entity.kind === 'floor') { entity.width *= x; entity.length *= z; entity.thickness *= y; }
  else { entity.length *= x; entity.height *= y; entity.thickness *= z; }
  entity.transform.scale = [1, 1, 1];
}
function snappingGrid(grid, override) {
  if (override === undefined) return grid;
  if (typeof override !== 'boolean') throw new ValidationError('A opção de snapping deve ser booleana.');
  return { ...grid, snap: override };
}
function snappedToken(token, grid, override) {
  const yaw = ((yawFromQuaternion(token.transform.rotation) % 180) + 180) % 180;
  const footprint = Math.abs(yaw - 90) < 1e-4 ? [token.footprint[1], token.footprint[0]] : token.footprint;
  token.transform.position = snapPosition(token.transform.position, snappingGrid(grid, override), footprint);
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
  for (const value of ids) editable(document.layout.entities[value]);
  for (const token of Object.values(document.tokens ?? {})) if (ids.has(token.surfaceId)) editable(token);
  for (const value of ids) {
    delete document.layout.entities[value]; delete look.materialAdjustments[value];
    if (document.sessionState) delete document.sessionState.doors[value];
  }
  for (const area of Object.values(document.layout.areas)) {
    if (ids.has(area.surfaceId)) delete document.layout.areas[area.id];
    else area.memberIds = area.memberIds.filter(value => !ids.has(value));
  }
  for (const token of Object.values(document.tokens ?? {})) if (ids.has(token.surfaceId)) removeToken(document, token.id);
}
function removeToken(document, tokenId) {
  const token = requireRecord(document.tokens, tokenId, 'Token'); editable(token);
  delete document.tokens[tokenId];
  if (!Object.values(document.tokens).some(item => item.actorId === token.actorId)) delete document.actors[token.actorId];
}
function offsetPosition(transform, offset) { transform.position = transform.position.map((v, i) => v + offset[i]); }
function duplicateEntity(document, payload) {
  const entity = requireRecord(document.layout.entities, payload.id, 'Entidade'); editable(entity);
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
    if (copy.kind === 'door') {
      copy.wallId = ref(copy.wallId);
      if (entity.kind === 'door') {
        const wall = document.layout.entities[copy.wallId];
        const others = Object.values(document.layout.entities).filter(item => item.kind === 'door' && item.wallId === copy.wallId);
        const candidates = [copy.offset + copy.width + 0.1, copy.offset - copy.width - 0.1, copy.width / 2, wall.length - copy.width / 2];
        const candidate = candidates.find(center => center >= copy.width / 2 && center <= wall.length - copy.width / 2 &&
          others.every(other => Math.abs(other.offset - center) >= (other.width + copy.width) / 2 + 1e-8));
        if (candidate === undefined) throw new ValidationError('Não há espaço para duplicar a porta nesta parede.');
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
    const copy = clone(area); copy.id = id(); copy.name += ' — cópia'; copy.groupId = ref(copy.groupId);
    copy.surfaceId = ref(copy.surfaceId); copy.memberIds = copy.memberIds.map(ref); offsetPosition(copy.transform, offset); put(document.layout.areas, copy);
  }
  for (const token of Object.values(document.tokens ?? {})) {
    if (!ids.has(token.surfaceId)) continue;
    const copy = clone(token); copy.id = id(); copy.surfaceId = ref(copy.surfaceId); offsetPosition(copy.transform, offset); put(document.tokens, copy);
  }
}
function carryFloorSupports(document, previous, next) {
  const deltaYaw = yawFromQuaternion(next.transform.rotation) - yawFromQuaternion(previous.transform.rotation);
  const before = previous.transform.position, after = next.transform.position;
  const carry = transform => {
    const local = transform.position.map((v, i) => v - before[i]);
    transform.position = rotateXZ(local, deltaYaw).map((v, i) => v + after[i]);
    const [x, y, z, w] = transform.rotation, half = deltaYaw * Math.PI / 360;
    const s = Math.sin(half), c = Math.cos(half);
    transform.rotation = [c * x + s * z, c * y + s * w, c * z - s * x, c * w - s * y];
  };
  if (before.every((v, i) => v === after[i]) && Math.abs(deltaYaw) < 1e-8) return;
  for (const entity of Object.values(document.layout.entities)) if (entity.surfaceId === previous.id && entity.transform) { editable(entity); carry(entity.transform); }
  for (const token of Object.values(document.tokens ?? {})) if (token.surfaceId === previous.id) { editable(token); carry(token.transform); }
  for (const area of Object.values(document.layout.areas)) if (area.surfaceId === previous.id) carry(area.transform);
}

/** Pure atomic command application. Meshes, camera gestures and side effects stay outside. */
export function applyCommand(document, command) {
  validateDocument(document);
  if (command.documentId && command.documentId !== document.id) throw new ValidationError('O comando pertence a outro documento.');
  const next = clone(document), payload = command.payload ?? {}, look = next.look ?? next.defaultLook;
  switch (command.type) {
    case 'entity.add': {
      const entity = clone(payload.entity); if (!entity) throw new ValidationError('Entidade ausente.');
      if (entity.transform) entity.transform.position = snapPosition(entity.transform.position, snappingGrid(next.layout.grid, payload.snap));
      bakeStructuralScale(entity); put(next.layout.entities, entity); break;
    }
    case 'entity.update': {
      const before = requireRecord(next.layout.entities, payload.id, 'Entidade'); editable(before, payload.patch);
      const after = merge(before, payload.patch); bakeStructuralScale(after);
      if (after.transform && payload.patch.transform?.position) after.transform.position = snapPosition(after.transform.position, snappingGrid(next.layout.grid, payload.snap));
      if (before.kind === 'floor') carryFloorSupports(next, before, after);
      next.layout.entities[payload.id] = after; break;
    }
    case 'entity.remove': removeEntity(next, payload.id); break;
    case 'entity.duplicate': duplicateEntity(next, payload); break;
    case 'token.add':
      if (next.documentType !== 'scene') throw new ValidationError('Mapas não contêm tokens de sessão.');
      if (payload.actor) {
        const existing = next.actors[payload.actor.id];
        if (!existing) put(next.actors, payload.actor);
        else if (JSON.stringify(existing) !== JSON.stringify(payload.actor)) throw new ValidationError('O ator já existe com dados diferentes.');
      }
      { const token = clone(payload.token); if (!token) throw new ValidationError('Token ausente.'); snappedToken(token, next.layout.grid, payload.snap); put(next.tokens, token); }
      break;
    case 'token.update': {
      const patch = payload.patch ?? {};
      const before = requireRecord(next.tokens, payload.id, 'Token'); editable(before, patch);
      const token = merge(before, patch);
      if (patch.transform?.position || patch.transform?.rotation || patch.footprint) snappedToken(token, next.layout.grid, payload.snap);
      next.tokens[payload.id] = token;
      if (payload.actorPatch) next.actors[token.actorId] = merge(next.actors[token.actorId], payload.actorPatch);
      break;
    }
    case 'actor.update': next.actors[payload.id] = merge(requireRecord(next.actors, payload.id, 'Ator'), payload.patch); break;
    case 'token.remove': removeToken(next, payload.id); break;
    case 'token.duplicate': {
      const token = clone(requireRecord(next.tokens, payload.id, 'Token')); editable(token);
      token.id = id(); offsetPosition(token.transform, payload.offset ?? [next.layout.grid.cellSize, 0, next.layout.grid.cellSize]);
      snappedToken(token, next.layout.grid, payload.snap); put(next.tokens, token); break;
    }
    case 'light.add': put(look.lights, payload.light); break;
    case 'light.update': look.lights[payload.id] = merge(requireRecord(look.lights, payload.id, 'Luz'), payload.patch); break;
    case 'light.remove': requireRecord(look.lights, payload.id, 'Luz'); delete look.lights[payload.id]; break;
    case 'light.duplicate': {
      const light = clone(requireRecord(look.lights, payload.id, 'Luz')); light.id = id(); light.name += ' — cópia'; delete light.role;
      light.position = light.position.map((v, i) => v + (payload.offset ?? [1, 0, 1])[i]); put(look.lights, light); break;
    }
    case 'grid.update': next.layout.grid = merge(next.layout.grid, payload.patch ?? payload); break;
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
    case 'door.setAngle': {
      const door = requireRecord(next.layout.entities, payload.id, 'Porta');
      if (door.kind !== 'door' || !next.sessionState) throw new ValidationError('Porta de sessão inválida.');
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
      break;
    }
    default: throw new ValidationError(`Comando desconhecido: ${command.type}.`);
  }
  return validateDocument(next);
}
