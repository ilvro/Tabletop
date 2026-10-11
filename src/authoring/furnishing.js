import { createEntity, createLight, clone, id } from '../domain/documents.js';
import { quaternionFromYaw, rotateXZ, yawFromQuaternion } from '../domain/coords.js';
import { worldFootprint, footprintsOverlap, pointInPolygon, polygonContainsPolygon, isLocked, footprintOnFloor } from '../domain/geometry.js';
import { ValidationError, validateDocument } from '../domain/validation.js';
import { ROOM_RECIPES, DENSITY_LEVEL } from '../domain/room-recipes.js';
import { roomFrame, candidates as poses, stableRandom } from './room-layout.js';
export { stableRandom };

export const ROOM_TEMPLATES = ROOM_RECIPES;
export const snapshotItem = item => { const { id: _, kind, ...fields } = clone(item); return fields; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
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
export function scopeFor(document, floorId, existing) {
  const floor = document.layout.entities[floorId];
  if (floor?.kind !== 'floor') throw new ValidationError('Selecione um piso para mobiliar.');
  const area = existing ? document.layout.areas[existing.areaId] : Object.values(document.layout.areas).find(a => a.surfaceId === floorId);
  if (area) return { floor, area, newArea: false };
  const xs = floor.vertices?.map(p => p[0]), zs = floor.vertices?.map(p => p[1]);
  const offset = floor.vertices ? [(Math.max(...xs) + Math.min(...xs)) / 2, 0, (Math.max(...zs) + Math.min(...zs)) / 2] : [0, 0, 0];
  const world = rotateXZ(offset, yawFromQuaternion(floor.transform.rotation)).map((n, i) => n + floor.transform.position[i]);
  return { floor, newArea: true, area: { id: id(), name: floor.name, kind: 'rectangle', transform: { position: world, rotation: clone(floor.transform.rotation), scale: [1, 1, 1] }, width: floor.width, length: floor.length, surfaceId: floor.id, memberIds: [floor.id], groupId: floor.groupId } };
}

/** The floor a person needs to walk through each door of the room. */
export function doorZones(document, floor) {
  const zones = [];
  for (const door of Object.values(document.layout.entities).filter(e => e.kind === 'door')) {
    const wall = document.layout.entities[door.wallId]; if (wall.surfaceId !== floor.id && !wall.floorIds?.includes(floor.id)) continue;
    const offset = rotateXZ([door.offset, 0, 0], yawFromQuaternion(wall.transform.rotation)).map((v, i) => v + wall.transform.position[i]);
    zones.push(worldFootprint({ footprint: [door.width + .5, 2.4], transform: { position: offset, rotation: wall.transform.rotation, scale: [1, 1, 1] } }));
  }
  return zones;
}
export const AMBIENCE_TAG = 'ambientação';

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
  const composition = { id: previous?.id ?? id(), name: `${ROOM_TEMPLATES.find(t => t.id === template).name} — ${floor.name}`, recipeId: 'room-furnishing', recipeVersion: 2, areaId: area.id, parameters, slots: {} };
  const proposal = { id: id(), expectedEditVersion, label: previous ? 'Regenerar mobiliário' : 'Mobiliar espaço', entities: [], groups: [], areas: newArea ? [area] : [], lights: [], updates: [], removals: [], compositions: [composition], report: { kept: [], suppressed: [], omissions: [], conflicts: [], reasons: [] } };
  const yaw = yawFromQuaternion(area.transform.rotation), [w, l] = [area.width, area.length];
  const toWorld = (x, z, height = 0) => rotateXZ([x, height, z], yaw).map((v, i) => v + area.transform.position[i]);
  const recipe = ROOM_RECIPES.find(entry => entry.id === template), level = DENSITY_LEVEL[density];
  const frame = roomFrame(document, floor, area), placed = new Map(), candidates = [];
  for (const rule of recipe.items) {
    if ((rule.level ?? 0) > level) continue;
    const total = rule.count === 'chairs' ? chairs : Array.isArray(rule.count) ? rule.count[level] : rule.count ?? 1;
    for (let index = 0; index < total; index++) candidates.push({ slot: rule.count === undefined ? rule.slot : `${rule.slot}.${index + 1}`, rule, index, total, assetId: `builtin-${rule.asset}` });
  }
  // Light budget is bounded and proportional to area. No shadows on generated points.
  if (lighting) {
    const nx = Math.min(3, Math.max(1, Math.ceil(w / 5))), nz = Math.min(3, Math.max(1, Math.ceil(l / 5)));
    for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) candidates.push({ slot: `light.${x}.${z}`, light: true, x: w * ((x + .5) / nx - .5), z: l * ((z + .5) / nz - .5), intensity: Math.min(65, w * l * 1.6 / (nx * nz)) });
  }
  const priorIds = new Set(Object.values(previous?.slots ?? {}).map(slot => slot.id));
  const occupied = Object.values(document.layout.entities).filter(e => e.kind === 'prop' && e.surfaceId === floor.id && !priorIds.has(e.id)).map(e => ({ id: e.id, corners: worldFootprint(e, .08), tight: worldFootprint(e) }));
  const reserved = doorZones(document, floor);
  const floorPolygon = floor.vertices ?? [[-floor.width / 2, -floor.length / 2], [floor.width / 2, -floor.length / 2], [floor.width / 2, floor.length / 2], [-floor.width / 2, floor.length / 2]];
  const localFloor = p => { const v = rotateXZ([p[0] - floor.transform.position[0], 0, p[1] - floor.transform.position[2]], -yawFromQuaternion(floor.transform.rotation)); return [v[0], v[2]]; };
  const within = corners => footprintOnFloor(floor, corners) && polygonContainsPolygon(floorPolygon, corners.map(localFloor)) && corners.every(p => {
    const local = rotateXZ([p[0] - area.transform.position[0], 0, p[1] - area.transform.position[2]], -yaw);
    return Math.abs(local[0]) <= w / 2 - .02 + 1e-8 && Math.abs(local[2]) <= l / 2 - .02 + 1e-8 && pointInPolygon(localFloor(p), floorPolygon);
  });
  // Reserve manual overrides first, independent of recipe ordering.
  for (const [slotKey, slot] of Object.entries(previous?.slots ?? {})) {
    const current = slot.kind === 'entity' ? document.layout.entities[slot.id] : look.lights[slot.id];
    if (current && slot.kind === 'entity' && (isLocked(document, current) || !same(snapshotItem(current).transform, slot.baseline.transform))) occupied.push({ id: slot.id, corners: worldFootprint(current, .08), tight: worldFootprint(current) });
  }
  const usedSlots = new Set(), missing = new Map();
  // What the person already put in the room is part of the room: a recipe uses
  // their desk instead of bringing another. Adopted pieces are never moved or owned.
  const owned = new Set(Object.values(document.layout.compositions).flatMap(c => Object.values(c.slots).map(slot => slot.id)));
  const roomProps = Object.values(document.layout.entities).filter(e => e.kind === 'prop' && e.surfaceId === floor.id);
  const adoptable = [...roomProps, ...Object.values(document.layout.entities).filter(e => e.kind === 'prop' && roomProps.some(host => host.id === e.surfaceId))].filter(e => !owned.has(e.id) && !e.tags?.includes(AMBIENCE_TAG));
  for (const candidate of candidates) {
    const { slot: key } = candidate; usedSlots.add(key);
    const prior = previous?.slots[key], kind = candidate.light ? 'light' : 'entity';
    const current = prior ? prior.kind === 'entity' ? document.layout.entities[prior.id] : look.lights[prior.id] : null;
    if (prior && !current && !restoreDeleted) { composition.slots[key] = clone(prior); proposal.report.suppressed.push(key); continue; }
    if (current && isLocked(document, current)) { composition.slots[key] = clone(prior); proposal.report.kept.push(key); continue; }
    let generated, fits = true, solid = false;
    // A chair tucks under its table: a piece keeps no clearance from the one it belongs to.
    const partner = candidate.rule?.of ? placed.get(candidate.rule.of)?.id : null;
    const blocked = entity => { const corners = worldFootprint(entity, .08), tight = worldFootprint(entity); return !within(tight) || reserved.some(r => footprintsOverlap(corners, r)) || occupied.some(o => o.id !== entity.id && footprintsOverlap(o.id === partner ? tight : corners, o.id === partner ? o.tight : o.corners)); };
    if (candidate.light) {
      const height = Math.max(1.2, ...Object.values(document.layout.entities).filter(e => e.kind === 'wall' && e.surfaceId === floor.id).map(e => e.height - .3));
      generated = createLight({ id: prior?.id, name: `Luz — ${area.name}`, position: toWorld(candidate.x, candidate.z, height), intensity: candidate.intensity, distance: Math.max(w, l) * 1.3, surfaceId: floor.id, groupId: area.groupId, levelId: floor.levelId ?? null, layerId: floor.layerId ?? null });
    } else {
      const asset = catalog.find(a => a.id === candidate.assetId), { rule } = candidate;
      if (!asset) { proposal.report.omissions.push('Um móvel da receita está ausente no catálogo.'); if (prior) composition.slots[key] = clone(prior); continue; }
      candidate.asset = asset; fits = false;
      const own = prior ? null : adoptable.find(e => e.assetRef?.id === asset.id);
      if (own) {
        adoptable.splice(adoptable.indexOf(own), 1);
        const [x, z] = frame.toLocal(own.transform.position);
        placed.set(key, { id: own.id, x, z, rotation: yawFromQuaternion(own.transform.rotation) - yaw, width: asset.footprint[0] * own.transform.scale[0], depth: asset.footprint[1] * own.transform.scale[2], top: own.transform.position[1] - area.transform.position[1] + (asset.supportHeight ?? 0) * own.transform.scale[1] });
        proposal.report.reasons.push(`${own.name}: já estava no cômodo e foi aproveitado.`); continue;
      }
      // The first pose that is free wins; hanging and flat pieces take no floor space.
      for (const pose of poses(rule, { frame, placed, seed, slot: key, asset, index: candidate.index, total: candidate.total })) {
        const entity = createEntity('prop', { id: prior?.id, name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, position: toWorld(pose.x, pose.z, pose.on ? pose.on.top : rule.lift ?? 0), rotation: quaternionFromYaw(yaw + pose.rotation), footprint: asset.footprint, groupId: area.groupId, surfaceId: pose.on?.id ?? floor.id, levelId: floor.levelId ?? null, layerId: floor.layerId ?? null, ...(asset.supportHeight ? { supportHeight: asset.supportHeight } : {}) });
        solid = !pose.on && !rule.flat && !rule.lift; generated ??= entity;
        if (pose.on || (solid ? !blocked(entity) : within(worldFootprint(entity)))) { generated = entity; fits = true; break; }
      }
      if (!generated) {
        missing.set(asset.name, (missing.get(asset.name) ?? 0) + 1);
        if (current) { composition.slots[key] = clone(prior); proposal.report.kept.push(key); }
        continue;
      }
    }
    const baseline = snapshotItem(generated);
    const label = generated.name;
    let item = current ? { id: current.id, ...(kind === 'entity' ? { kind: 'prop' } : {}), ...preserve(prior.baseline, snapshotItem(current), baseline) } : generated;
    const manualPosition = current && (!same(current.transform, prior.baseline.transform) || current.surfaceId !== prior.baseline.surfaceId);
    if (kind === 'entity') {
      if (!manualPosition && !fits) {
        missing.set(label, (missing.get(label) ?? 0) + 1);
        if (current) { composition.slots[key] = clone(prior); proposal.report.kept.push(key); occupied.push({ id: current.id, corners: worldFootprint(current, .08), tight: worldFootprint(current) }); }
        continue;
      }
      if (manualPosition && solid && blocked(item)) proposal.report.conflicts.push(`${label}: posição manual preservada; revise limite ou sobreposição.`);
      if (solid) occupied.push({ id: item.id, corners: worldFootprint(item, .08), tight: worldFootprint(item) });
      // Later pieces refer to this one where it really is, including manual moves.
      const [x, z] = frame.toLocal(item.transform.position), asset = candidate.asset;
      placed.set(key, { id: item.id, x, z, rotation: yawFromQuaternion(item.transform.rotation) - yaw, width: asset.footprint[0] * item.transform.scale[0], depth: asset.footprint[1] * item.transform.scale[2], top: item.transform.position[1] - area.transform.position[1] + (asset.supportHeight ?? 0) * item.transform.scale[1] });
    } else if (!pointInPolygon(localFloor([item.position[0], item.position[2]]), floorPolygon)) { proposal.report.omissions.push(`${label}: ponto fora do piso.`); continue; }
    composition.slots[key] = { id: item.id, kind, baseline };
    if (current) {
      if (!same(snapshotItem(current), snapshotItem(item))) proposal.updates.push({ kind, id: current.id, patch: snapshotItem(item) });
      if (!same(snapshotItem(current), prior.baseline)) proposal.report.kept.push(key);
    } else proposal[kind === 'entity' ? 'entities' : 'lights'].push(item);
  }
  for (const [name, count] of missing) proposal.report.omissions.push(`${name}${count > 1 ? ` (${count})` : ''}: não cabe com as folgas e a passagem livres.`);
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
