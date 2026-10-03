import { createEntity, createLight, clone, id } from '../domain/documents.js';
import { quaternionFromYaw, rotateXZ, yawFromQuaternion } from '../domain/coords.js';
import { worldFootprint, footprintsOverlap, pointInPolygon, polygonContainsPolygon, isLocked } from '../domain/geometry.js';
import { ValidationError, validateDocument } from '../domain/validation.js';

export const ROOM_TEMPLATES = [{ id: 'office', name: 'Escritório' }, { id: 'meeting', name: 'Sala de reunião' }, { id: 'storage', name: 'Depósito' }];
export const snapshotItem = item => { const { id: _, kind, ...fields } = clone(item); return fields; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function stableRandom(seed, slot) {
  let hash = seed >>> 0;
  for (const character of slot) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return hash / 4294967296;
}
/** Preserve changed leaves, including name, material, asset, position and rotation independently. */
function preserve(original, current, generated) {
  if (same(original, current)) return clone(generated);
  if (!original || !current || !generated || Array.isArray(current) || typeof current !== 'object') return clone(current);
  const result = clone(generated);
  for (const key of new Set([...Object.keys(original), ...Object.keys(current)])) {
    if (!Object.hasOwn(current, key)) { delete result[key]; continue; }
    result[key] = preserve(original[key], current[key], generated[key]);
  }
  return result;
}
function scopeFor(document, floorId, existing) {
  const floor = document.layout.entities[floorId];
  if (floor?.kind !== 'floor') throw new ValidationError('Selecione um piso para mobiliar.');
  const area = existing ? document.layout.areas[existing.areaId] : Object.values(document.layout.areas).find(a => a.surfaceId === floorId);
  if (area) return { floor, area, newArea: false };
  const xs = floor.vertices?.map(p => p[0]), zs = floor.vertices?.map(p => p[1]);
  const offset = floor.vertices ? [(Math.max(...xs) + Math.min(...xs)) / 2, 0, (Math.max(...zs) + Math.min(...zs)) / 2] : [0, 0, 0];
  const world = rotateXZ(offset, yawFromQuaternion(floor.transform.rotation)).map((n, i) => n + floor.transform.position[i]);
  return { floor, newArea: true, area: { id: id(), name: floor.name, kind: 'rectangle', transform: { position: world, rotation: clone(floor.transform.rotation), scale: [1, 1, 1] }, width: floor.width, length: floor.length, surfaceId: floor.id, memberIds: [floor.id], groupId: floor.groupId } };
}

export function proposeFurnishing(document, { floorId, compositionId, template = 'office', density = 'normal', chairs = 4, seed = 1, lighting = true, restoreDeleted = false } = {}, expectedEditVersion = 0, catalog = []) {
  validateDocument(document);
  if (document.schemaVersion !== 2) throw new ValidationError('Migre o documento antes de usar Smart Build.');
  const previous = compositionId ? document.layout.compositions[compositionId] : null;
  if (compositionId && !previous) throw new ValidationError('Composição ausente.');
  if (previous) floorId = document.layout.areas[previous.areaId].surfaceId;
  if (!ROOM_TEMPLATES.some(t => t.id === template) || !['sparse', 'normal', 'dense'].includes(density) || !Number.isInteger(chairs) || chairs < 1 || chairs > 8 || !Number.isInteger(seed) || seed < 0 || seed > 4294967295 || typeof lighting !== 'boolean' || typeof restoreDeleted !== 'boolean') throw new ValidationError('Parâmetros de Smart Build inválidos.');
  const { floor, area, newArea } = scopeFor(document, floorId, previous);
  if (isLocked(document, floor)) throw new ValidationError('O piso ou sua pasta está bloqueado.');
  const parameters = { template, density, chairs, seed, lighting }, look = document.look ?? document.defaultLook;
  const composition = { id: previous?.id ?? id(), name: `${ROOM_TEMPLATES.find(t => t.id === template).name} — ${floor.name}`, recipeId: 'room-furnishing', recipeVersion: 1, areaId: area.id, parameters, slots: {} };
  const proposal = { id: id(), expectedEditVersion, label: previous ? 'Regenerar mobiliário' : 'Mobiliar espaço', entities: [], groups: [], areas: newArea ? [area] : [], lights: [], updates: [], removals: [], compositions: [composition], report: { kept: [], suppressed: [], omissions: [], conflicts: [] } };
  const yaw = yawFromQuaternion(area.transform.rotation), [w, l] = [area.width, area.length];
  const toWorld = (x, z, height = 0) => rotateXZ([x, height, z], yaw).map((v, i) => v + area.transform.position[i]);
  const candidates = [];
  const add = (slot, assetId, x, z, rotation = 0) => candidates.push({ slot, assetId, x, z, rotation });
  if (template === 'office') {
    add('desk.main', 'builtin-desk', -Math.min(w / 5, 1.2), -.3);
    add('desk.chair', 'builtin-chair', -Math.min(w / 5, 1.2), .75, 180);
    if (density !== 'sparse') { add('cabinet.main', 'builtin-cabinet', w / 2 - .8, -l / 2 + .7); add('lamp.corner', 'builtin-lamp', -w / 2 + .5, -l / 2 + .5); }
    if (density === 'dense') { add('crate.corner', 'builtin-crate', w / 2 - .8, l / 2 - .7); add('cabinet.extra', 'builtin-cabinet', w / 2 - .8, -l / 2 + 1.5); }
  } else if (template === 'meeting') {
    add('table.main', 'builtin-desk', 0, 0);
    const positions = [[-.6, 1, 180], [.6, 1, 180], [-.6, -1, 0], [.6, -1, 0], [-1.5, 0, 90], [1.5, 0, -90], [0, 1.75, 180], [0, -1.75, 0]];
    positions.slice(0, chairs).forEach(([x, z, angle], i) => add(`table.chair.${i + 1}`, 'builtin-chair', x, z, angle));
    if (density !== 'sparse') add('cabinet.main', 'builtin-cabinet', w / 2 - .8, -l / 2 + .7);
  } else {
    const count = { sparse: 4, normal: 8, dense: 16 }[density];
    const columns = Math.max(1, Math.floor((w - .8) / 1.15));
    for (let i = 0; i < count; i++) add(`crate.${i + 1}`, 'builtin-crate', -w / 2 + .6 + (i % columns) * 1.15, -l / 2 + .6 + Math.floor(i / columns) * 1.15, (stableRandom(seed, `crate.${i + 1}`) - .5) * 12);
    add('cabinet.main', 'builtin-cabinet', w / 2 - .7, l / 2 - .7, 180);
  }
  // Light budget is bounded and proportional to area. No shadows on generated points.
  if (lighting) {
    const nx = Math.min(3, Math.max(1, Math.ceil(w / 5))), nz = Math.min(3, Math.max(1, Math.ceil(l / 5)));
    for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) candidates.push({ slot: `light.${x}.${z}`, light: true, x: w * ((x + .5) / nx - .5), z: l * ((z + .5) / nz - .5), intensity: Math.min(65, w * l * 1.6 / (nx * nz)) });
  }
  const priorIds = new Set(Object.values(previous?.slots ?? {}).map(slot => slot.id));
  const occupied = Object.values(document.layout.entities).filter(e => e.kind === 'prop' && e.surfaceId === floor.id && !priorIds.has(e.id)).map(e => ({ id: e.id, corners: worldFootprint(e, .08) }));
  const reserved = [];
  for (const door of Object.values(document.layout.entities).filter(e => e.kind === 'door')) {
    const wall = document.layout.entities[door.wallId]; if (wall.surfaceId !== floor.id) continue;
    const offset = rotateXZ([door.offset, 0, 0], yawFromQuaternion(wall.transform.rotation)).map((v, i) => v + wall.transform.position[i]);
    reserved.push(worldFootprint({ footprint: [door.width + .5, 2.4], transform: { position: offset, rotation: wall.transform.rotation, scale: [1, 1, 1] } }));
  }
  const floorPolygon = floor.vertices ?? [[-floor.width / 2, -floor.length / 2], [floor.width / 2, -floor.length / 2], [floor.width / 2, floor.length / 2], [-floor.width / 2, floor.length / 2]];
  const localFloor = p => { const v = rotateXZ([p[0] - floor.transform.position[0], 0, p[1] - floor.transform.position[2]], -yawFromQuaternion(floor.transform.rotation)); return [v[0], v[2]]; };
  const within = corners => polygonContainsPolygon(floorPolygon, corners.map(localFloor)) && corners.every(p => {
    const local = rotateXZ([p[0] - area.transform.position[0], 0, p[1] - area.transform.position[2]], -yaw);
    return Math.abs(local[0]) <= w / 2 - .1 + 1e-8 && Math.abs(local[2]) <= l / 2 - .1 + 1e-8 && pointInPolygon(localFloor(p), floorPolygon);
  });
  // Reserve manual overrides first, independent of recipe ordering.
  for (const [slotKey, slot] of Object.entries(previous?.slots ?? {})) {
    const current = slot.kind === 'entity' ? document.layout.entities[slot.id] : look.lights[slot.id];
    if (current && slot.kind === 'entity' && (isLocked(document, current) || !same(snapshotItem(current).transform, slot.baseline.transform))) occupied.push({ id: slot.id, corners: worldFootprint(current, .08) });
  }
  const usedSlots = new Set();
  for (const candidate of candidates) {
    const { slot: key } = candidate; usedSlots.add(key);
    const prior = previous?.slots[key], kind = candidate.light ? 'light' : 'entity';
    const current = prior ? prior.kind === 'entity' ? document.layout.entities[prior.id] : look.lights[prior.id] : null;
    if (prior && !current && !restoreDeleted) { composition.slots[key] = clone(prior); proposal.report.suppressed.push(key); continue; }
    if (current && isLocked(document, current)) { composition.slots[key] = clone(prior); proposal.report.kept.push(key); continue; }
    let generated;
    if (candidate.light) {
      const height = Math.max(1.2, ...Object.values(document.layout.entities).filter(e => e.kind === 'wall' && e.surfaceId === floor.id).map(e => e.height - .3));
      generated = createLight({ id: prior?.id, name: `Luz — ${area.name}`, position: toWorld(candidate.x, candidate.z, height), intensity: candidate.intensity, distance: Math.max(w, l) * 1.3, surfaceId: floor.id, groupId: area.groupId });
    } else {
      const asset = catalog.find(a => a.id === candidate.assetId);
      if (!asset) { proposal.report.omissions.push('Um móvel da receita está ausente no catálogo.'); if (prior) composition.slots[key] = clone(prior); continue; }
      generated = createEntity('prop', { id: prior?.id, name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, position: toWorld(candidate.x, candidate.z), rotation: quaternionFromYaw(yaw + candidate.rotation), footprint: asset.footprint, groupId: area.groupId, surfaceId: floor.id, ...(asset.supportHeight ? { supportHeight: asset.supportHeight } : {}) });
    }
    const baseline = snapshotItem(generated);
    const label = generated.name;
    let item = current ? { id: current.id, ...(kind === 'entity' ? { kind: 'prop' } : {}), ...preserve(prior.baseline, snapshotItem(current), baseline) } : generated;
    const manualPosition = current && (!same(current.transform, prior.baseline.transform) || current.surfaceId !== prior.baseline.surfaceId);
    if (kind === 'entity') {
      const blocked = entity => { const corners = worldFootprint(entity, .08); return !within(corners) || reserved.some(r => footprintsOverlap(corners, r)) || occupied.some(o => o.id !== entity.id && footprintsOverlap(corners, o.corners)); };
      if (!manualPosition && blocked(item)) {
        const originalPosition = [...item.transform.position]; let fits = false;
        // Bounded local search; never resize furniture to fit.
        for (const [dx, dz] of [[.4, 0], [-.4, 0], [0, .4], [0, -.4], [.8, 0], [-.8, 0], [0, .8], [0, -.8], [.4, .4], [-.4, -.4]]) {
          const offset = rotateXZ([dx, 0, dz], yaw); item.transform.position = originalPosition.map((v, i) => v + offset[i]);
          if (!blocked(item)) { fits = true; break; }
        }
        if (!fits) {
          proposal.report.omissions.push(`${label}: não cabe com as folgas e a passagem livres.`);
          if (current) { composition.slots[key] = clone(prior); proposal.report.kept.push(key); occupied.push({ id: current.id, corners: worldFootprint(current, .08) }); }
          continue;
        }
        baseline.transform.position = [...item.transform.position];
      } else if (manualPosition && blocked(item)) proposal.report.conflicts.push(`${label}: posição manual preservada; revise limite ou sobreposição.`);
      occupied.push({ id: item.id, corners: worldFootprint(item, .08) });
    } else if (!pointInPolygon(localFloor([item.position[0], item.position[2]]), floorPolygon)) { proposal.report.omissions.push(`${label}: ponto fora do piso.`); continue; }
    composition.slots[key] = { id: item.id, kind, baseline };
    if (current) {
      if (!same(snapshotItem(current), snapshotItem(item))) proposal.updates.push({ kind, id: current.id, patch: snapshotItem(item) });
      if (!same(snapshotItem(current), prior.baseline)) proposal.report.kept.push(key);
    } else proposal[kind === 'entity' ? 'entities' : 'lights'].push(item);
  }
  for (const [key, slot] of Object.entries(previous?.slots ?? {})) {
    if (usedSlots.has(key)) continue;
    const current = slot.kind === 'entity' ? document.layout.entities[slot.id] : look.lights[slot.id];
    if (!current) { composition.slots[key] = clone(slot); continue; }
    const hasDependents = slot.kind === 'entity' && [...Object.values(document.layout.entities), ...Object.values(document.tokens ?? {}), ...Object.values(look.lights)].some(item => item.surfaceId === current.id);
    if (isLocked(document, current) || hasDependents || !same(snapshotItem(current), slot.baseline)) proposal.report.kept.push(`${key}: fora da receita, mantido e desvinculado.`);
    else proposal.removals.push({ kind: slot.kind, id: slot.id });
  }
  return proposal;
}
