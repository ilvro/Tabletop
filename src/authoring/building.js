import { createEntity, clone, id } from '../domain/documents.js';
import { quaternionFromYaw, rotateXZ, yawFromQuaternion } from '../domain/coords.js';
import { isLocked, worldFootprint, footprintsOverlap } from '../domain/geometry.js';
import { ValidationError, validateDocument } from '../domain/validation.js';
import { surfacePatch } from '../domain/materials.js';
import { ROOM_RECIPES } from '../domain/room-recipes.js';
import { createSceneStore } from '../state/scene-store.js';
import { proposeFurnishing } from './furnishing.js';
import { proposeRoomLighting, proposeRoomDetails } from './room-ambience.js';
import { describeRoom, roomEra } from './room-insight.js';
import { stableRandom } from './room-layout.js';

/**
 * What each kind of building is made of. `hub` is the room one enters; `rooms`
 * are listed by importance with a relative size, and a building takes as many
 * as its outline holds. This is a programme, not a floor plan: the plan comes
 * from the outline the person drew.
 */
export const BUILDING_TYPES = [
  { id: 'house', name: 'Casa', hub: 'living', share: .34, rooms: [['kitchen', 1.1], ['bedroom', 1.1], ['bathroom', .55], ['bedroom', 1], ['dining', 1], ['garage', 1.5]] },
  { id: 'police', name: 'Delegacia', hub: 'reception', share: .28, rooms: [['office', 1], ['interrogation', .8], ['cell', .6], ['archive', .9], ['cell', .6], ['investigation', 1], ['surveillance', .8]] },
  { id: 'clinic', name: 'Clínica', hub: 'reception', share: .26, rooms: [['clinic', 1], ['ward', 1.4], ['bathroom', .5], ['lab', 1], ['morgue', 1.1], ['archive', .8]] },
  { id: 'office', name: 'Escritório', hub: 'reception', share: .26, rooms: [['office', 1], ['meeting', 1.1], ['bathroom', .5], ['office', 1], ['archive', .8], ['surveillance', .8]] },
  { id: 'bar', name: 'Bar', hub: 'bar', share: .55, rooms: [['storage', 1], ['bathroom', .55], ['kitchen', 1], ['office', .8]] },
  { id: 'warehouse', name: 'Galpão', hub: 'storage', share: .5, rooms: [['workshop', 1.2], ['office', .8], ['bathroom', .5], ['surveillance', .8]] },
  { id: 'church', name: 'Igreja', hub: 'chapel', share: .62, rooms: [['office', .8], ['storage', .7], ['ritual', 1]] },
];
const ROOM_WEIGHT = { bathroom: .55, cell: .6, garage: 1.5, ward: 1.4, kitchen: 1.1, bedroom: 1.1, meeting: 1.1, morgue: 1.1, workshop: 1.2, archive: .8, surveillance: .8, storage: .9 };
const FLOORS = { tile: ['kitchen', 'bathroom', 'ward', 'clinic', 'morgue', 'lab', 'bar', 'shop'], concrete: ['garage', 'storage', 'workshop', 'cell', 'surveillance'], carpet: ['meeting', 'office', 'reception', 'archive', 'investigation', 'interrogation', 'library', 'classroom'], stone: ['chapel', 'ritual'] };
const WINDOWLESS = ['cell', 'archive', 'storage', 'morgue', 'surveillance', 'ritual', 'interrogation'];
const recipeName = key => key === 'corridor' ? 'Corredor' : ROOM_RECIPES.find(recipe => recipe.id === key)?.name ?? key;
const OLD_FLOOR = { tile: 'stone', concrete: 'stone', carpet: 'wood' };
const flooring = (key, era = 'modern') => { const kind = Object.entries(FLOORS).find(([, rooms]) => rooms.includes(key))?.[0] ?? 'wood'; return surfacePatch(era === 'old' ? OLD_FLOOR[kind] ?? kind : kind); };

/**
 * Divides an outline into the rooms of a kind of building. Works in the
 * outline's own frame with the long side along X: the hub takes the entrance
 * end, a corridor runs from it and the other rooms open onto the corridor.
 * Returns rectangles `{ key, x0, x1, z0, z1 }` and the corridor, if any.
 */
export function planBuilding(type, long, short, seed = 1, custom = null) {
  const base = BUILDING_TYPES.find(entry => entry.id === type);
  if (!base) throw new ValidationError('Tipo de prédio inválido.');
  // The person's own list of rooms replaces the programme of the type; sizes come from what each room usually needs.
  if (custom && (!Array.isArray(custom.rooms) || custom.rooms.length > 12 || ![custom.hub ?? base.hub, ...custom.rooms].every(key => ROOM_RECIPES.some(recipe => recipe.id === key)))) throw new ValidationError('Lista de cômodos inválida.');
  const programme = custom ? { ...base, hub: custom.hub ?? base.hub, rooms: custom.rooms.map(key => [key, ROOM_WEIGHT[key] ?? 1]) } : base;
  if (long < 4 || short < 3) throw new ValidationError('O contorno precisa ter pelo menos 4 × 3 m.');
  const random = key => stableRandom(seed, `plan/${key}`) * 7919 % 1, flip = random('side') < .5 ? 1 : -1;
  const corridor = short >= 7.2 ? 'middle' : short >= 4.6 ? 'side' : null, width = corridor ? 1.3 : 0;
  // How many rooms fit beyond the hub, at about 12 m² each.
  let hub = Math.max(3.2, Math.min(long * .6, long * programme.share * (.9 + random('hub') * .25)));
  let count = Math.max(0, Math.min(programme.rooms.length, Math.floor((long - hub) * (short - width) / (custom ? 7 : 12))));
  if (!count || long - hub < 2.4) return { programme, corridor: null, rooms: [{ key: programme.hub, hub: true, x0: -long / 2, x1: long / 2, z0: -short / 2, z1: short / 2 }], dropped: programme.rooms.length };
  const x0 = -long / 2 + hub, rooms = [{ key: programme.hub, hub: true, x0: -long / 2, x1: x0, z0: -short / 2, z1: short / 2 }];
  const bands = corridor === 'middle' ? [{ z0: -short / 2, z1: -width / 2 }, { z0: width / 2, z1: short / 2 }]
    : corridor === 'side' ? [flip > 0 ? { z0: -short / 2, z1: short / 2 - width } : { z0: -short / 2 + width, z1: short / 2 }] : [{ z0: -short / 2, z1: short / 2 }];
  // Rooms go to the band with less in it, so both sides of the corridor fill evenly.
  let lists; const fill = () => { lists = bands.map(() => []); programme.rooms.slice(0, count).forEach(([key, weight], i) => lists.reduce((a, b) => (a.reduce((s, r) => s + r.weight, 0) <= b.reduce((s, r) => s + r.weight, 0) ? a : b)).push({ key, weight: weight * (.9 + random(`w/${i}`) * .2) })); };
  fill();
  // The person's own arrangement, band by band, when it suits this outline.
  const arranged = custom?.bands?.length === bands.length && custom.bands.flat().length && custom.bands.every(list => !list.length || (long - hub) * Math.min(...list.map(key => ROOM_WEIGHT[key] ?? 1)) / list.reduce((sum, key) => sum + (ROOM_WEIGHT[key] ?? 1), 0) >= 2.3);
  if (arranged) { lists = custom.bands.map(list => list.map(key => ({ key, weight: ROOM_WEIGHT[key] ?? 1 }))); count = custom.bands.flat().length; }
  else while (count > 1 && lists.some(list => list.length && (long - hub) * Math.min(...list.map(r => r.weight)) / list.reduce((s, r) => s + r.weight, 0) < 2.3)) { count--; fill(); }
  bands.forEach((band, b) => {
    const list = arranged || flip > 0 ? lists[b] : [...lists[b]].reverse(), total = list.reduce((sum, room) => sum + room.weight, 0); let x = x0;
    for (const room of list) { const span = (long - hub) * room.weight / total; rooms.push({ key: room.key, x0: x, x1: x + span, z0: band.z0, z1: band.z1, band: b }); x += span; }
  });
  const hall = corridor === 'middle' ? { key: 'corridor', x0, x1: long / 2, z0: -width / 2, z1: width / 2 } : corridor === 'side' ? { key: 'corridor', x0, x1: long / 2, z0: flip > 0 ? short / 2 - width : -short / 2, z1: flip > 0 ? short / 2 : -short / 2 + width } : null;
  // `arrangement` is what the person rearranges: the rooms of each band in order.
  return { programme, corridor: hall, rooms, dropped: programme.rooms.length - count, arrangement: bands.map((_, b) => rooms.filter(room => room.band === b).map(room => room.key)) };
}

const near = (a, b) => Math.abs(a - b) < 1e-6;
/** Plan in a frame: `toWorld`, `toLocal` and the yaw that puts the long side on X. */
function frameAt(center, yaw) {
  return { yaw, center, toWorld: (x, z, y = 0) => rotateXZ([x, y, z], yaw).map((v, i) => v + center[i]), toLocal: position => { const v = rotateXZ(position.map((n, i) => n - center[i]), -yaw); return [v[0], v[2]]; } };
}
const mirrored = (plan, mx, mz) => { const turn = c => ({ ...c, x0: mx ? -c.x1 : c.x0, x1: mx ? -c.x0 : c.x1, z0: mz ? -c.z1 : c.z0, z1: mz ? -c.z0 : c.z1 }); return { ...plan, rooms: plan.rooms.map(turn), corridor: plan.corridor && turn(plan.corridor) }; };
/** Walls already standing, seen in the plan's frame. */
function standingWalls(document, frame, belongs) {
  return Object.values(document.layout.entities).filter(e => e.kind === 'wall' && belongs(e)).map(entity => {
    const a = frame.toLocal(entity.transform.position), b = frame.toLocal(rotateXZ([entity.length, 0, 0], yawFromQuaternion(entity.transform.rotation)).map((v, i) => v + entity.transform.position[i]));
    const along = Math.abs(a[1] - b[1]) < .08, upright = Math.abs(a[0] - b[0]) < .08;
    return (along || upright) && { entity, a, b, along, span: entity.length, openings: Object.values(document.layout.entities).filter(o => o.wallId === entity.id).map(o => [o.offset, o.width, o.kind, o.id]), adopted: true };
  }).filter(Boolean);
}
/**
 * Walls for a set of room rectangles. Every line of the plan gets one wall per
 * stretch; where a wall already stands on that line it is kept, with its doors
 * and windows, and only the missing stretches are built.
 */
function raiseWalls(cells, standing, make, isOutside) {
  const lines = new Map(), records = [], adopted = new Map();
  const mark = (key, at, from, to, cell) => { if (!lines.has(key)) lines.set(key, { at, vertical: key[0] === 'v', spans: [] }); lines.get(key).spans.push({ from, to, cell }); };
  for (const cell of cells) { mark(`v${cell.x0.toFixed(4)}`, cell.x0, cell.z0, cell.z1, cell); mark(`v${cell.x1.toFixed(4)}`, cell.x1, cell.z0, cell.z1, cell); mark(`h${cell.z0.toFixed(4)}`, cell.z0, cell.x0, cell.x1, cell); mark(`h${cell.z1.toFixed(4)}`, cell.z1, cell.x0, cell.x1, cell); }
  for (const line of lines.values()) {
    const merged = [];
    for (const span of [...line.spans].sort((p, q) => p.from - q.from)) { const last = merged.at(-1); if (last && span.from <= last.to + 1e-6) { last.to = Math.max(last.to, span.to); last.cells.add(span.cell); } else merged.push({ from: span.from, to: span.to, cells: new Set([span.cell]) }); }
    for (const stretch of merged) {
      const touching = [...stretch.cells], here = standing.filter(w => w.along !== line.vertical && Math.abs((line.vertical ? w.a[0] : w.a[1]) - line.at) < .3).map(w => ({ w, from: Math.min(line.vertical ? w.a[1] : w.a[0], line.vertical ? w.b[1] : w.b[0]), to: Math.max(line.vertical ? w.a[1] : w.a[0], line.vertical ? w.b[1] : w.b[0]) })).filter(e => Math.min(e.to, stretch.to) - Math.max(e.from, stretch.from) > .3).sort((p, q) => p.from - q.from);
      let cursor = stretch.from; const gaps = [];
      for (const kept of here) {
        if (kept.from - cursor > .4) gaps.push([cursor, kept.from]); cursor = Math.max(cursor, kept.to);
        const cellsHere = touching.filter(c => Math.min(line.vertical ? c.z1 : c.x1, kept.to) - Math.max(line.vertical ? c.z0 : c.x0, kept.from) > .2);
        if (!adopted.has(kept.w.entity.id)) { adopted.set(kept.w.entity.id, new Set()); records.push({ ...kept.w, vertical: line.vertical, at: line.at }); }
        cellsHere.forEach(cell => adopted.get(kept.w.entity.id).add(cell));
      }
      if (stretch.to - cursor > .4) gaps.push([cursor, stretch.to]);
      for (const [from, to] of gaps) {
        const cellsHere = touching.filter(c => Math.min(line.vertical ? c.z1 : c.x1, to) - Math.max(line.vertical ? c.z0 : c.x0, from) > .2); if (!cellsHere.length) continue;
        const a = line.vertical ? [line.at, from] : [from, line.at], b = line.vertical ? [line.at, to] : [to, line.at];
        records.push({ entity: make(a, b, cellsHere, isOutside(line, from, to, cellsHere)), a, b, along: !line.vertical, vertical: line.vertical, at: line.at, span: to - from, openings: [], adopted: false });
      }
    }
  }
  return { records, adopted };
}
const lineAt = (records, point, vertical) => records.find(w => w.vertical === vertical && Math.abs(w.at - (vertical ? point[0] : point[1])) < .31 && Math.min(vertical ? w.a[1] : w.a[0], vertical ? w.b[1] : w.b[0]) - 1e-6 <= (vertical ? point[1] : point[0]) && (vertical ? point[1] : point[0]) <= Math.max(vertical ? w.a[1] : w.a[0], vertical ? w.b[1] : w.b[0]) + 1e-6);
/** Cuts a door or window where a wall has room for it; openings keep apart. */
function opening(built, kind, record, point, size, options) {
  if (!record || size < .5) return false;
  const offset = Math.hypot(point[0] - record.a[0], point[1] - record.a[1]);
  if (offset - size / 2 < .15 || offset + size / 2 > record.span - .15 || record.openings.some(([at, w]) => Math.abs(at - offset) < (w + size) / 2 + .25)) return false;
  record.openings.push([offset, size, kind]); built.push(createEntity(kind, { wallId: record.entity.id, offset, width: size, ...options })); return true;
}
/**
 * Runs the room assistant room by room on a copy of the scene and returns, as
 * one proposal, what the copy gained and what it changed in the person's
 * objects. `prepare(store)` builds the structure first.
 */
function compose(document, expectedEditVersion, label, prepare) {
  const store = createSceneStore(document), rehoming = [];
  const attempt = make => { try { store.execute('proposal.accept', { proposal: make() }); return true; } catch (error) { if (error instanceof ValidationError) return false; throw error; } };
  const update = (kind, key, patch) => { store.execute(`${kind}.update`, { id: key, patch, snap: false }); rehoming.push({ kind, id: key, patch }); };
  const removals = []; const remove = key => { store.execute('entity.remove', { id: key }); removals.push({ kind: 'entity', id: key }); };
  // Taken away first, in step with the other preparations (a window a new door replaces).
  const clear = key => { store.execute('entity.remove', { id: key }); rehoming.push({ kind: 'entity', id: key, remove: true }); };
  const report = { kept: [], suppressed: [], omissions: [], conflicts: [], reasons: [] };
  prepare({ store, attempt, update, remove, clear, report });
  const after = store.document, fresh = (now, then) => Object.values(now).filter(record => !then[record.id]).map(clone);
  // Lighting may switch on objects that were already in the scene.
  const updates = Object.values(after.layout.entities).filter(e => document.layout.entities[e.id] && !rehoming.some(op => op.id === e.id) && JSON.stringify(e.illumination ?? null) + JSON.stringify(e.tags) !== JSON.stringify(document.layout.entities[e.id].illumination ?? null) + JSON.stringify(document.layout.entities[e.id].tags)).map(e => ({ kind: 'entity', id: e.id, patch: { illumination: clone(e.illumination ?? null), tags: clone(e.tags) } }));
  const lights = (after.look ?? after.defaultLook).lights, before = (document.look ?? document.defaultLook).lights;
  for (const light of Object.values(before)) if (!lights[light.id]) removals.push({ kind: 'light', id: light.id });
  return { id: id(), expectedEditVersion, label, entities: fresh(after.layout.entities, document.layout.entities), groups: fresh(after.layout.groups, document.layout.groups), areas: fresh(after.layout.areas, document.layout.areas), lights: fresh(lights, before), compositions: fresh(after.layout.compositions, document.layout.compositions), rehoming, updates, removals, report };
}
const dress = ({ store, attempt, report }, cell, catalog, { furnish, lighting, seed, sources = 2, era = 'modern' }) => {
  if (furnish && cell.key !== 'corridor') {
    if (!attempt(() => proposeFurnishing(store.document, { floorId: cell.floor.id, template: cell.key, density: 'normal', seed, lighting: !lighting, era }, store.editVersion, catalog))) report.omissions.push(`${cell.floor.name}: não coube mobília.`);
    else attempt(() => proposeRoomDetails(store.document, { floorId: cell.floor.id, amount: .5, seed }, store.editVersion, catalog));
  }
  // A building shares the scene's few real lights: two sources a room, the hub one more.
  if (lighting) attempt(() => proposeRoomLighting(store.document, { floorId: cell.floor.id, mood: 'auto', sources, fixtures: 1, era }, store.editVersion, catalog));
};
const wallMaterial = (outside, era = 'modern') => era === 'old' && outside ? surfacePatch('stone') : { ...surfacePatch('plaster'), color: outside ? '#d8cfbd' : era === 'old' ? '#d9ceb6' : '#e4ddd0' };

/** How long the outline must be for every room of the list to fit, or null if no reasonable length does. */
export function outlineThatFits(type, long, short, seed, custom) {
  for (let length = Math.ceil(long * 2) / 2; length <= 60; length += .5) { try { if (!planBuilding(type, length, short, seed, custom && { ...custom, bands: null }).dropped) return length; } catch { /* too small still */ } }
  return null;
}

/**
 * Raises a building on an outline: one floor per room, shared walls, a door
 * from every room to the corridor, windows on the outside walls, a roof, and
 * each room furnished and lit by the room assistant.
 *
 * The outline is a rectangular floor the person drew, or measures for a new
 * building. What already stands on that floor is part of the brief: walls are
 * kept and only completed, an existing door decides where the entrance room
 * goes, and the plan is chosen so that the furniture already there falls in
 * the rooms it belongs to, which are then completed around it.
 */
export function proposeBuilding(document, { floorId = null, width = 14, length = 9, center = [0, 0, 0], type = 'house', seed = 1, height = 2.7, furnish = true, lighting = true, roof = true, rooms = null, hub = null, bands = null, era = 'modern' } = {}, expectedEditVersion = 0, catalog = []) {
  validateDocument(document);
  if (!Number.isInteger(seed) || seed < 0 || !(height >= 2.3 && height <= 6)) throw new ValidationError('Parâmetros do prédio inválidos.');
  const outline = floorId ? document.layout.entities[floorId] : null, entities = Object.values(document.layout.entities), look = document.look ?? document.defaultLook;
  if (floorId) {
    if (outline?.kind !== 'floor') throw new ValidationError('Escolha um piso como contorno.');
    if (outline.vertices || outline.holes?.length) throw new ValidationError('Por enquanto o contorno precisa ser um piso retangular, sem recortes.');
    if (isLocked(document, outline)) throw new ValidationError('O piso do contorno está bloqueado.');
    [width, length, center] = [outline.width, outline.length, outline.transform.position];
  }
  const baseYaw = outline ? yawFromQuaternion(outline.transform.rotation) : 0, long = Math.max(width, length), short = Math.min(width, length), frame = frameAt(center, baseYaw + (length > width ? 90 : 0)), { toWorld, toLocal, yaw } = frame;
  const placing = { levelId: outline?.levelId ?? null, layerId: outline?.layerId ?? null };
  // What the person already has on the outline.
  const onOutline = record => outline && record.surfaceId === outline.id, ownWalls = outline ? standingWalls(document, frame, wall => wall.surfaceId === outline.id || wall.floorIds?.includes(outline.id)) : [];
  const ownProps = entities.filter(e => e.kind === 'prop' && onOutline(e)), ownDoors = ownWalls.flatMap(w => w.openings.filter(o => o[2] === 'door').map(([offset]) => [w.a[0] + (w.b[0] - w.a[0]) * offset / w.span, w.a[1] + (w.b[1] - w.a[1]) * offset / w.span])).filter(([x, z]) => Math.abs(Math.abs(x) - long / 2) < .4 || Math.abs(Math.abs(z) - short / 2) < .4);
  const strayWalls = entities.filter(e => e.kind === 'wall' && onOutline(e) && !ownWalls.some(w => w.entity === e));
  const recipeAssets = key => new Set(ROOM_RECIPES.find(r => r.id === key)?.items.map(item => `builtin-${item.asset}`) ?? []), inside = (cell, [x, z], margin = 0) => x >= cell.x0 + margin && x <= cell.x1 - margin && z >= cell.z0 + margin && z <= cell.z1 - margin;
  // Among the plans this outline allows, the one that suits what is already there.
  const fit = plan => {
    const cells = [...plan.rooms, ...(plan.corridor ? [plan.corridor] : [])]; let score = 0;
    for (const prop of ownProps) {
      const at = toLocal(prop.transform.position), half = Math.max(...prop.footprint) / 2, cell = cells.find(c => inside(c, at));
      if (!cell) continue;
      if (!inside(cell, at, Math.min(half, .45))) score -= 4;          // a wall would run through it
      if (cell.key === 'corridor') score -= 3; else if (recipeAssets(cell.key).has(prop.assetRef?.id)) score += 2;
    }
    for (const door of ownDoors) if (inside({ x0: plan.rooms[0].x0 - .5, x1: plan.rooms[0].x1 + .5, z0: plan.rooms[0].z0 - .5, z1: plan.rooms[0].z1 + .5 }, door)) score += 6;
    return score;
  };
  const custom = rooms ? { rooms, hub, bands } : null, busy = ownProps.length || ownDoors.length, variants = busy ? [0, 1, 2, 3, 4, 5].flatMap(k => [[false, false], [true, false], [false, true], [true, true]].map(([mx, mz]) => mirrored(planBuilding(type, long, short, seed * 7 + k, custom), mx, mz))) : [planBuilding(type, long, short, seed, custom)];
  const plan = variants.map((candidate, i) => ({ candidate, score: fit(candidate) - i * 1e-4 })).sort((a, b) => b.score - a.score)[0].candidate, { programme } = plan;
  const cells = [...plan.rooms, ...(plan.corridor ? [plan.corridor] : [])], hubCell = plan.rooms[0], hall = plan.corridor;
  const group = { id: id(), name: programme.name, parentId: outline?.groupId ?? null, locked: false, audience: 'all' }, roofGroup = { id: id(), name: `Cobertura — ${programme.name}`, parentId: group.id, locked: false, audience: 'all' };
  const built = [], [X0, X1, Z0, Z1] = [-long / 2, long / 2, -short / 2, short / 2];
  for (const cell of cells) {
    const same = cells.filter(c => c.key === cell.key);
    cell.floor = createEntity('floor', { name: `${recipeName(cell.key)}${same.length > 1 ? ` ${same.indexOf(cell) + 1}` : ''}`, width: cell.x1 - cell.x0, length: cell.z1 - cell.z0, position: toWorld((cell.x0 + cell.x1) / 2, (cell.z0 + cell.z1) / 2), rotation: quaternionFromYaw(yaw), groupId: group.id, ...placing, material: outline && busy ? clone(outline.material) : flooring(cell.key, era) });
    built.push(cell.floor);
  }
  const outside = (line, from, to) => near(Math.abs(line.at), (line.vertical ? long : short) / 2);
  const { records, adopted } = raiseWalls(cells, ownWalls, (a, b, touching, exterior) => {
    const entity = createEntity('wall', { name: exterior ? 'Parede externa' : 'Parede interna', length: Math.hypot(b[0] - a[0], b[1] - a[1]), height, thickness: exterior ? .2 : .14, position: toWorld(a[0], a[1]), rotation: quaternionFromYaw(yaw + Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180 / Math.PI), surfaceId: touching[0].floor.id, floorIds: touching.map(c => c.floor.id), groupId: group.id, ...placing, material: wallMaterial(exterior, era) });
    built.push(entity); return entity;
  }, outside);
  const cut = (kind, record, point, size, options) => opening(built, kind, record, point, size, { groupId: group.id, ...placing, ...options });
  // Way in: the person's door if there is one by the entrance room, else a new one at its end.
  const hubEnd = near(hubCell.x0, X0) ? X0 : X1;
  if (!ownDoors.length) cut('door', lineAt(records, [hubEnd, 0], true), [hubEnd, 0], Math.min(1.1, short - 1), { name: 'Entrada', height: 2.1, surfaceId: hubCell.floor.id, initialAngle: Math.PI / 3 });
  const meeting = (a, b) => near(a.x1, b.x0) ? [a.x1, true] : near(a.x0, b.x1) ? [a.x0, true] : near(a.z1, b.z0) ? [a.z1, false] : near(a.z0, b.z1) ? [a.z0, false] : null;
  const connect = (a, b, name, size) => {
    const edge = meeting(a, b); if (!edge) return false;
    const [at, vertical] = edge, from = Math.max(vertical ? a.z0 : a.x0, vertical ? b.z0 : b.x0), to = Math.min(vertical ? a.z1 : a.x1, vertical ? b.z1 : b.x1), mid = (from + to) / 2;
    // Beside the middle if the person's furniture stands in the doorway.
    for (const t of [mid, mid - (to - from) * .25, mid + (to - from) * .25]) { const point = vertical ? [at, t] : [t, at]; if (ownProps.some(p => Math.hypot(...toLocal(p.transform.position).map((v, i) => v - point[i])) < .9)) continue; if (cut('door', lineAt(records, point, vertical), point, Math.min(size, to - from - .6), { name, height: 2.1, surfaceId: b.floor.id })) return true; }
    const point = vertical ? [at, mid] : [mid, at]; return cut('door', lineAt(records, point, vertical), point, Math.min(size, to - from - .6), { name, height: 2.1, surfaceId: b.floor.id });
  };
  if (hall) { connect(hubCell, hall, 'Porta do corredor', 1.05); for (const cell of plan.rooms.filter(c => !c.hub)) connect(hall, cell, `Porta — ${cell.floor.name}`, .9); }
  else { const row = [...plan.rooms].sort((a, b) => Math.abs(a.x0 - hubCell.x0) - Math.abs(b.x0 - hubCell.x0)); for (let i = 1; i < row.length; i++) connect(row[i - 1], row[i], `Porta — ${row[i].floor.name}`, .9); }
  // Daylight where a room meets the outside, except in rooms that are kept closed.
  for (const cell of cells.filter(c => !WINDOWLESS.includes(c.key))) for (const [a, b, vertical] of [[[cell.x0, Z0], [cell.x1, Z0], false], [[cell.x0, Z1], [cell.x1, Z1], false], [[X0, cell.z0], [X0, cell.z1], true], [[X1, cell.z0], [X1, cell.z1], true]]) {
    if (vertical ? !(near(cell.x0, a[0]) || near(cell.x1, a[0])) : !(near(cell.z0, a[1]) || near(cell.z1, a[1]))) continue;
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]), count = span < 2.2 ? 0 : Math.max(1, Math.floor(span / 3.4)), small = cell.key === 'bathroom';
    for (let i = 0; i < count; i++) { const t = (i + .5) / count, point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], record = lineAt(records, point, vertical); if (record && !record.adopted) cut('window', record, point, small ? .7 : Math.min(1.4, span / count - .8), { name: `Janela — ${cell.floor.name}`, sill: small ? 1.5 : .9, height: small ? .6 : 1.2, surfaceId: cell.floor.id }); }
  }
  const proposal = compose(document, expectedEditVersion, `Construir ${programme.name.toLowerCase()}`, context => {
    const { store, update, remove, report } = context;
    store.execute('proposal.accept', { proposal: { id: id(), expectedEditVersion: store.editVersion, label: 'Pisos', entities: cells.map(cell => cell.floor), groups: [group], areas: [], lights: [] } });
    if (outline) {
      // Everything the person had on the outline moves to the room it stands in.
      const cellAt = position => { const at = toLocal(position); return cells.find(c => inside(c, at)) ?? cells.reduce((best, c) => Math.hypot((c.x0 + c.x1) / 2 - at[0], (c.z0 + c.z1) / 2 - at[1]) < Math.hypot((best.x0 + best.x1) / 2 - at[0], (best.z0 + best.z1) / 2 - at[1]) ? c : best); };
      for (const [entityId, touching] of adopted) update('entity', entityId, { surfaceId: [...touching][0].floor.id, floorIds: [...touching].map(c => c.floor.id) });
      for (const wall of strayWalls) { update('entity', wall.id, { surfaceId: cellAt(wall.transform.position).floor.id, floorIds: [cellAt(wall.transform.position).floor.id] }); report.kept.push(wall.id); }
      for (const wall of ownWalls.filter(w => !adopted.has(w.entity.id))) { update('entity', wall.entity.id, { surfaceId: cellAt(wall.entity.transform.position).floor.id, floorIds: [cellAt(wall.entity.transform.position).floor.id] }); report.kept.push(wall.entity.id); }
      for (const entity of entities.filter(e => onOutline(e) && e.kind !== 'wall')) update('entity', entity.id, { surfaceId: cellAt(entity.transform?.position ?? center).floor.id });
      for (const light of Object.values(look.lights).filter(onOutline)) update('light', light.id, { surfaceId: cellAt(light.position).floor.id });
      for (const token of Object.values(document.tokens ?? {}).filter(onOutline)) update('token', token.id, { surfaceId: cellAt(token.transform.position).floor.id });
      remove(outline.id);
    }
    store.execute('proposal.accept', { proposal: { id: id(), expectedEditVersion: store.editVersion, label: 'Estrutura', entities: built.filter(e => e.kind !== 'floor'), groups: [], areas: [], lights: [] } });
    plan.rooms.forEach((cell, i) => dress(context, cell, catalog, { furnish, lighting, seed: seed + i, sources: cell.hub ? 3 : 2, era }));
    if (hall) dress(context, hall, catalog, { furnish: false, lighting, seed, era });
    const model = roof && catalog.find(a => a.id === 'builtin-house-roof');
    if (model) store.execute('proposal.accept', { proposal: { id: id(), expectedEditVersion: store.editVersion, label: 'Cobertura', groups: [roofGroup], areas: [], lights: [], entities: [createEntity('prop', { name: 'Telhado', assetRef: { id: model.id, revision: model.revision }, footprint: model.footprint, position: toWorld(0, 0, height), rotation: quaternionFromYaw(yaw + 90), scale: [(short + .9) / model.bounds[0], Math.max(.6, Math.min(1.2, short / 9)), (long + .9) / model.bounds[2]], groupId: roofGroup.id, ...placing })] } });
  });
  const names = plan.rooms.map(cell => cell.floor.name.toLowerCase()), say = text => proposal.report.reasons.push(text);
  say(`${programme.name} de ${long.toFixed(1)} × ${short.toFixed(1)} m: ${names.join(', ')}${hall ? ' e corredor' : ''}.`);
  if (adopted.size) say(`${adopted.size === 1 ? 'Uma parede sua foi mantida' : `${adopted.size} paredes suas foram mantidas`}, com portas e janelas; só os trechos que faltavam foram erguidos.`);
  if (ownProps.length) { const homes = new Map(); for (const prop of ownProps) { const at = toLocal(prop.transform.position), cell = cells.find(c => inside(c, at)); if (cell) homes.set(cell.floor.name, (homes.get(cell.floor.name) ?? 0) + 1); } say(`A planta foi escolhida pelo que já estava no contorno: ${[...homes].map(([room, count]) => `${count} em ${room.toLowerCase()}`).join(', ')}.`); }
  for (const prop of ownProps) { const at = toLocal(prop.transform.position), cell = cells.find(c => inside(c, at)); if (cell && !inside(cell, at, Math.min(Math.max(...prop.footprint) / 2, .45) - .05)) proposal.report.conflicts.push(`${prop.name}: fica junto a uma parede nova; confira na prévia.`); }
  if (strayWalls.length || ownWalls.some(w => !adopted.has(w.entity.id))) say('Paredes suas que não coincidem com a planta ficaram onde estavam.');
  if (plan.dropped) say(`O contorno não comporta ${plan.dropped === 1 ? 'um cômodo' : `${plan.dropped} cômodos`} do programa; aumente o contorno para incluí-${plan.dropped === 1 ? 'lo' : 'los'}.`);
  return proposal;
}

// How large a room of each kind is when added on its own: [along the shared wall, away from it].
const ROOM_SIZE = { bathroom: [2.6, 2.4], kitchen: [3.8, 3.4], bedroom: [3.8, 3.6], living: [5, 4.2], dining: [4.2, 3.8], garage: [3.6, 6], cell: [2.6, 2.8], archive: [3.4, 3], storage: [3.6, 3.2], office: [3.8, 3.4] };
const AFFINITY = { bathroom: { corridor: 3, bedroom: 2, living: 1 }, kitchen: { dining: 3, living: 3, corridor: 2 }, bedroom: { corridor: 3, living: 1 }, dining: { kitchen: 3, living: 3 }, garage: { kitchen: 2, living: 2, corridor: 1 }, cell: { corridor: 3, reception: 1 } };

/**
 * Adds a room to a building the person already has. It looks for a free side
 * of the existing rooms, prefers the neighbour such a room usually opens to
 * and the spot that keeps the building compact, shares the wall that is
 * there, opens a door through it and furnishes the new room.
 */
function findSpots(document, { floorId, template, seed = 1 }, catalog) {
  const anchor = document.layout.entities[floorId], recipe = ROOM_RECIPES.find(entry => entry.id === template);
  if (anchor?.kind !== 'floor' || !recipe) throw new ValidationError('Escolha um cômodo do prédio e o tipo de cômodo a acrescentar.');
  const entities = Object.values(document.layout.entities), level = anchor.levelId ?? null, frame = frameAt(anchor.transform.position, yawFromQuaternion(anchor.transform.rotation)), { toWorld, toLocal, yaw } = frame;
  const building = describeBuilding(document, floorId, catalog), memberIds = new Set(building ? building.rooms.map(room => room.id) : [floorId]);
  const rect = floor => { const points = worldFootprint(floor).map(([x, z]) => toLocal([x, 0, z])), xs = points.map(p => p[0]), zs = points.map(p => p[1]); return { floor, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), square: !floor.vertices && Math.abs(((yawFromQuaternion(floor.transform.rotation) - yaw) % 90 + 90) % 90) < .5 }; };
  const all = entities.filter(e => e.kind === 'floor' && (e.levelId ?? null) === level).map(rect), members = all.filter(r => memberIds.has(r.floor.id) && r.square);
  const kindOf = r => building?.rooms.find(room => room.id === r.floor.id)?.kind ?? (/corredor/i.test(r.floor.name) ? 'corridor' : null);
  const standing = standingWalls(document, frame, wall => memberIds.has(wall.surfaceId) || wall.floorIds?.some(key => memberIds.has(key)));
  const obstacles = entities.filter(e => e.kind === 'prop' && e.surfaceId && !memberIds.has(e.surfaceId) && document.layout.entities[e.surfaceId]?.kind !== 'prop').map(e => worldFootprint(e).map(([x, z]) => toLocal([x, 0, z])));
  const box = { x0: Math.min(...members.map(r => r.x0)), x1: Math.max(...members.map(r => r.x1)), z0: Math.min(...members.map(r => r.z0)), z1: Math.max(...members.map(r => r.z1)) };
  const [wide, deep] = ROOM_SIZE[template] ?? [3.6, 3.2], options = [];
  for (const host of members) for (const [vertical, sign] of [[true, -1], [true, 1], [false, -1], [false, 1]]) {
    const from = vertical ? host.z0 : host.x0, to = vertical ? host.z1 : host.x1, shared = Math.min(wide, to - from), at = vertical ? (sign < 0 ? host.x0 : host.x1) : (sign < 0 ? host.z0 : host.z1);
    if (shared < 2.2) continue;
    for (const start of new Set([from, to - shared, (from + to - shared) / 2])) {
      const cell = vertical ? { x0: sign < 0 ? at - deep : at, x1: sign < 0 ? at : at + deep, z0: start, z1: start + shared } : { z0: sign < 0 ? at - deep : at, z1: sign < 0 ? at : at + deep, x0: start, x1: start + shared };
      if (all.some(r => Math.min(r.x1, cell.x1) - Math.max(r.x0, cell.x0) > .05 && Math.min(r.z1, cell.z1) - Math.max(r.z0, cell.z0) > .05)) continue;
      if (obstacles.some(points => points.some(([x, z]) => x > cell.x0 && x < cell.x1 && z > cell.z0 && z < cell.z1))) continue;
      const wall = standing.find(w => w.along !== vertical && Math.abs((vertical ? w.a[0] : w.a[1]) - at) < .3), cuts = wall ? wall.openings.filter(([offset, size]) => { const p = (vertical ? wall.a[1] + (wall.b[1] - wall.a[1]) * offset / wall.span : wall.a[0] + (wall.b[0] - wall.a[0]) * offset / wall.span); return p + size / 2 > start - .3 && p - size / 2 < start + shared + .3; }) : [];
      const grown = (Math.max(box.x1, cell.x1) - Math.min(box.x0, cell.x0)) * (Math.max(box.z1, cell.z1) - Math.min(box.z0, cell.z0)) - (box.x1 - box.x0) * (box.z1 - box.z0);
      options.push({ cell, host, vertical, at, start, shared, cuts, score: (AFFINITY[template]?.[kindOf(host)] ?? (kindOf(host) === 'corridor' ? 2 : 0)) * 2 - grown / 8 - cuts.length * 5 + stableRandom(seed, `add/${members.indexOf(host)}/${vertical}/${sign}/${start.toFixed(2)}`) * .5 });
    }
  }
  // One spot per side of the building is enough to choose from: the best of each.
  const ranked = options.sort((p, q) => q.score - p.score), spots = [];
  for (const option of ranked) if (!spots.some(spot => Math.min(spot.cell.x1, option.cell.x1) - Math.max(spot.cell.x0, option.cell.x0) > .4 && Math.min(spot.cell.z1, option.cell.z1) - Math.max(spot.cell.z0, option.cell.z0) > .4)) spots.push(option);
  return { anchor, recipe, entities, frame, members, standing, spots: spots.slice(0, 8), kindOf };
}
/** Where a room could be added to the building of `floorId`, best first, with the building as it stands. */
export function addRoomSpots(document, options, catalog = []) {
  const { members, spots, frame } = findSpots(document, options, catalog);
  return { rooms: members.map(r => ({ id: r.floor.id, name: r.floor.name, x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 })), spots: spots.map(spot => ({ ...spot.cell, beside: spot.host.floor.name })), yaw: frame.yaw };
}

export function proposeAddRoom(document, { floorId, template, seed = 1, height = null, furnish = true, lighting = true, spot = 0, era = null } = {}, expectedEditVersion = 0, catalog = []) {
  validateDocument(document);
  const { anchor, recipe, entities, frame, standing, spots } = findSpots(document, { floorId, template, seed }, catalog), { toWorld, toLocal, yaw } = frame;
  if (!spots.length) throw new ValidationError('Não há um lado livre neste prédio para encostar o cômodo. Libere espaço junto a uma parede externa.');
  const best = spots[Math.max(0, Math.min(spots.length - 1, spot))], cell = { ...best.cell, key: template }, placing = { levelId: anchor.levelId ?? null, layerId: anchor.layerId ?? null, groupId: best.host.floor.groupId ?? null };
  const wallHeight = height ?? Math.max(2.4, ...standing.map(w => w.entity.height));
  cell.floor = createEntity('floor', { name: recipe.name, width: cell.x1 - cell.x0, length: cell.z1 - cell.z0, position: toWorld((cell.x0 + cell.x1) / 2, (cell.z0 + cell.z1) / 2), rotation: quaternionFromYaw(yaw), ...placing, material: flooring(template) });
  const built = [], sharedLine = (line, from, to) => !(line.vertical === best.vertical && near(line.at, best.at));
  const { records, adopted } = raiseWalls([cell], standing, (a, b, touching, exterior) => {
    const entity = createEntity('wall', { name: exterior ? 'Parede externa' : 'Parede interna', length: Math.hypot(b[0] - a[0], b[1] - a[1]), height: wallHeight, thickness: exterior ? .2 : .14, position: toWorld(a[0], a[1]), rotation: quaternionFromYaw(yaw + Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180 / Math.PI), surfaceId: cell.floor.id, floorIds: exterior ? [cell.floor.id] : [cell.floor.id, best.host.floor.id], ...placing, material: wallMaterial(exterior) });
    built.push(entity); return entity;
  }, sharedLine);
  // A window that would now look into the new room is closed, which also frees the wall for the door.
  const closed = best.cuts.filter(([, , kind]) => kind === 'window').map(([, , , key]) => key);
  for (const record of records.filter(r => r.adopted)) record.openings = record.openings.filter(([, , , key]) => !closed.includes(key));
  // The door goes through the shared wall, clear of what the neighbour has against it.
  const hostProps = entities.filter(e => e.kind === 'prop' && e.surfaceId === best.host.floor.id), mid = best.start + best.shared / 2; let through = null, blocked = null;
  for (const t of [mid, mid - best.shared * .25, mid + best.shared * .25, mid - best.shared * .35, mid + best.shared * .35]) {
    const point = best.vertical ? [best.at, t] : [t, best.at], inTheWay = hostProps.find(p => Math.hypot(...toLocal(p.transform.position).map((v, i) => v - point[i])) < .55 + Math.max(...p.footprint) / 2);
    if (inTheWay) { blocked ??= inTheWay; continue; }
    if (opening(built, 'door', lineAt(records, point, best.vertical), point, Math.min(.9, best.shared - .6), { name: `Porta — ${recipe.name}`, height: 2.1, surfaceId: cell.floor.id, ...placing })) { through = point; blocked = null; break; }
  }
  if (!through) { const point = best.vertical ? [best.at, mid] : [mid, best.at]; opening(built, 'door', lineAt(records, point, best.vertical), point, Math.min(.9, best.shared - .6), { name: `Porta — ${recipe.name}`, height: 2.1, surfaceId: cell.floor.id, ...placing }); }
  if (!WINDOWLESS.includes(template)) { const far = best.vertical ? [best.at + (cell.x0 < best.at - .01 ? -1 : 1) * (cell.x1 - cell.x0), (cell.z0 + cell.z1) / 2] : [(cell.x0 + cell.x1) / 2, best.at + (cell.z0 < best.at - .01 ? -1 : 1) * (cell.z1 - cell.z0)], small = template === 'bathroom'; opening(built, 'window', lineAt(records, far, best.vertical), far, small ? .7 : 1.3, { name: `Janela — ${recipe.name}`, sill: small ? 1.5 : .9, height: small ? .6 : 1.2, surfaceId: cell.floor.id, ...placing }); }
  const proposal = compose(document, expectedEditVersion, `Acrescentar ${recipe.name.toLowerCase()}`, context => {
    const { store, update, clear } = context;
    closed.forEach(clear);
    store.execute('proposal.accept', { proposal: { id: id(), expectedEditVersion: store.editVersion, label: 'Piso', entities: [cell.floor], groups: [], areas: [], lights: [] } });
    for (const [entityId] of adopted) { const wall = document.layout.entities[entityId]; update('entity', entityId, { floorIds: [...new Set([...(wall.floorIds ?? [wall.surfaceId]).filter(Boolean), cell.floor.id])] }); }
    store.execute('proposal.accept', { proposal: { id: id(), expectedEditVersion: store.editVersion, label: 'Paredes', entities: built, groups: [], areas: [], lights: [] } });
    dress(context, cell, catalog, { furnish, lighting, seed, era: era ?? roomEra(document, best.host.floor.id) });
  });
  const neighbour = best.host.floor.name.toLowerCase();
  proposal.report.reasons.push(`${recipe.name} de ${(cell.x1 - cell.x0).toFixed(1)} × ${(cell.z1 - cell.z0).toFixed(1)} m encostado em ${neighbour}${adopted.size ? ', usando a parede que já existe' : ''}, com porta entre os dois.`);
  if (blocked) proposal.report.conflicts.push(`${blocked.name} está junto à nova porta em ${neighbour}; afaste-o.`);
  if (closed.length) proposal.report.reasons.push(`${closed.length === 1 ? 'Uma janela' : `${closed.length} janelas`} de ${neighbour} dava para onde fica o cômodo novo e foi fechada.`);
  return proposal;
}

/**
 * What the assistant understands of the building a room belongs to: the rooms
 * that touch one another, the kind of building they add up to, and which rooms
 * such a building usually has that this one lacks.
 */
export function describeBuilding(document, floorId, catalog = []) {
  const floors = Object.values(document.layout.entities).filter(e => e.kind === 'floor' && (e.levelId ?? null) === (document.layout.entities[floorId]?.levelId ?? null));
  if (!floors.some(floor => floor.id === floorId)) return null;
  const outline = floor => worldFootprint(floor, .25), linked = new Set([floorId]);
  for (let grown = true; grown;) { grown = false; for (const floor of floors) if (!linked.has(floor.id) && [...linked].some(key => footprintsOverlap(outline(floor), outline(document.layout.entities[key])))) { linked.add(floor.id); grown = true; } }
  if (linked.size < 2) return null;
  const rooms = [...linked].map(key => ({ id: key, name: document.layout.entities[key].name, kind: describeRoom(document, key, catalog)?.inferred[0]?.id ?? null })), kinds = rooms.map(room => room.kind).filter(Boolean);
  if (!kinds.length) return { rooms, type: null, missing: [] };
  // The building whose programme the known rooms cover best.
  const scored = BUILDING_TYPES.map(type => { const wanted = [type.hub, ...type.rooms.map(([key]) => key)], hits = kinds.filter(kind => wanted.includes(kind)).length; return { type, score: hits / kinds.length + (kinds.includes(type.hub) ? .35 : 0), missing: [...new Set([type.hub, ...type.rooms.slice(0, 3).map(([key]) => key)])].filter(key => !kinds.includes(key)) }; }).sort((a, b) => b.score - a.score)[0];
  if (scored.score < .5) return { rooms, type: null, missing: [] };
  return { rooms, type: { id: scored.type.id, name: scored.type.name }, missing: scored.missing.map(key => ({ id: key, name: recipeName(key) })), empty: rooms.filter(room => !room.kind).length };
}
