import { createEntity, clone, id } from '../domain/documents.js';
import { quaternionFromYaw, rotateXZ, yawFromQuaternion } from '../domain/coords.js';
import { isLocked, worldFootprint, footprintsOverlap } from '../domain/geometry.js';
import { ValidationError, validateDocument } from '../domain/validation.js';
import { surfacePatch } from '../domain/materials.js';
import { ROOM_RECIPES } from '../domain/room-recipes.js';
import { createSceneStore } from '../state/scene-store.js';
import { proposeFurnishing } from './furnishing.js';
import { proposeRoomLighting, proposeRoomDetails } from './room-ambience.js';
import { describeRoom } from './room-insight.js';
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
const FLOORS = { tile: ['kitchen', 'bathroom', 'ward', 'clinic', 'morgue', 'lab', 'bar', 'shop'], concrete: ['garage', 'storage', 'workshop', 'cell', 'surveillance'], carpet: ['meeting', 'office', 'reception', 'archive', 'investigation', 'interrogation', 'library', 'classroom'], stone: ['chapel', 'ritual'] };
const WINDOWLESS = ['cell', 'archive', 'storage', 'morgue', 'surveillance', 'ritual', 'interrogation'];
const recipeName = key => key === 'corridor' ? 'Corredor' : ROOM_RECIPES.find(recipe => recipe.id === key)?.name ?? key;
const flooring = key => surfacePatch(Object.entries(FLOORS).find(([, rooms]) => rooms.includes(key))?.[0] ?? 'wood');

/**
 * Divides an outline into the rooms of a kind of building. Works in the
 * outline's own frame with the long side along X: the hub takes the entrance
 * end, a corridor runs from it and the other rooms open onto the corridor.
 * Returns rectangles `{ key, x0, x1, z0, z1 }` and the corridor, if any.
 */
export function planBuilding(type, long, short, seed = 1) {
  const programme = BUILDING_TYPES.find(entry => entry.id === type);
  if (!programme) throw new ValidationError('Tipo de prédio inválido.');
  if (long < 4 || short < 3) throw new ValidationError('O contorno precisa ter pelo menos 4 × 3 m.');
  const random = key => stableRandom(seed, `plan/${key}`) * 7919 % 1, flip = random('side') < .5 ? 1 : -1;
  const corridor = short >= 7.2 ? 'middle' : short >= 4.6 ? 'side' : null, width = corridor ? 1.3 : 0;
  // How many rooms fit beyond the hub, at about 12 m² each.
  let hub = Math.max(3.2, Math.min(long * .6, long * programme.share * (.9 + random('hub') * .25)));
  let count = Math.max(0, Math.min(programme.rooms.length, Math.floor((long - hub) * (short - width) / 12)));
  if (!count || long - hub < 2.4) return { programme, corridor: null, rooms: [{ key: programme.hub, hub: true, x0: -long / 2, x1: long / 2, z0: -short / 2, z1: short / 2 }], dropped: programme.rooms.length };
  const x0 = -long / 2 + hub, rooms = [{ key: programme.hub, hub: true, x0: -long / 2, x1: x0, z0: -short / 2, z1: short / 2 }];
  const bands = corridor === 'middle' ? [{ z0: -short / 2, z1: -width / 2 }, { z0: width / 2, z1: short / 2 }]
    : corridor === 'side' ? [flip > 0 ? { z0: -short / 2, z1: short / 2 - width } : { z0: -short / 2 + width, z1: short / 2 }] : [{ z0: -short / 2, z1: short / 2 }];
  // Rooms go to the band with less in it, so both sides of the corridor fill evenly.
  let lists; const fill = () => { lists = bands.map(() => []); programme.rooms.slice(0, count).forEach(([key, weight], i) => lists.reduce((a, b) => (a.reduce((s, r) => s + r.weight, 0) <= b.reduce((s, r) => s + r.weight, 0) ? a : b)).push({ key, weight: weight * (.9 + random(`w/${i}`) * .2) })); };
  fill();
  while (count > 1 && lists.some(list => list.length && (long - hub) * Math.min(...list.map(r => r.weight)) / list.reduce((s, r) => s + r.weight, 0) < 2.3)) { count--; fill(); }
  bands.forEach((band, b) => {
    const list = flip > 0 ? lists[b] : [...lists[b]].reverse(), total = list.reduce((sum, room) => sum + room.weight, 0); let x = x0;
    for (const room of list) { const span = (long - hub) * room.weight / total; rooms.push({ key: room.key, x0: x, x1: x + span, z0: band.z0, z1: band.z1, band: b }); x += span; }
  });
  const hall = corridor === 'middle' ? { key: 'corridor', x0, x1: long / 2, z0: -width / 2, z1: width / 2 } : corridor === 'side' ? { key: 'corridor', x0, x1: long / 2, z0: flip > 0 ? short / 2 - width : -short / 2, z1: flip > 0 ? short / 2 : -short / 2 + width } : null;
  return { programme, corridor: hall, rooms, dropped: programme.rooms.length - count };
}

/**
 * Raises a building on an outline: one floor per room, shared walls, a door
 * from every room to the corridor, windows on the outside walls, a roof, and
 * each room furnished and lit by the room assistant. The outline is an empty
 * rectangular floor the person drew, or measures for a new one.
 */
export function proposeBuilding(document, { floorId = null, width = 14, length = 9, center = [0, 0, 0], type = 'house', seed = 1, height = 2.7, furnish = true, lighting = true, roof = true } = {}, expectedEditVersion = 0, catalog = []) {
  validateDocument(document);
  if (!Number.isInteger(seed) || seed < 0 || !(height >= 2.3 && height <= 6)) throw new ValidationError('Parâmetros do prédio inválidos.');
  const outline = floorId ? document.layout.entities[floorId] : null, entities = Object.values(document.layout.entities);
  if (floorId) {
    if (outline?.kind !== 'floor') throw new ValidationError('Escolha um piso como contorno.');
    if (outline.vertices || outline.holes?.length) throw new ValidationError('Por enquanto o contorno precisa ser um piso retangular, sem recortes.');
    if (isLocked(document, outline)) throw new ValidationError('O piso do contorno está bloqueado.');
    if (entities.some(e => e.surfaceId === outline.id || e.floorIds?.includes(outline.id)) || Object.values(document.tokens ?? {}).some(t => t.surfaceId === outline.id) || Object.values((document.look ?? document.defaultLook).lights).some(l => l.surfaceId === outline.id)) throw new ValidationError('O contorno precisa estar vazio: tire ou desvincule o que está sobre este piso, ou use medidas para um prédio novo.');
    [width, length, center] = [outline.width, outline.length, outline.transform.position];
  }
  const baseYaw = outline ? yawFromQuaternion(outline.transform.rotation) : 0, turned = length > width, long = Math.max(width, length), short = Math.min(width, length), yaw = baseYaw + (turned ? 90 : 0);
  const plan = planBuilding(type, long, short, seed), { programme } = plan, cells = [...plan.rooms, ...(plan.corridor ? [plan.corridor] : [])];
  const toWorld = (x, z, y = 0) => rotateXZ([x, y, z], yaw).map((v, i) => v + center[i]), placing = { levelId: outline?.levelId ?? null, layerId: outline?.layerId ?? null };
  const group = { id: id(), name: programme.name, parentId: outline?.groupId ?? null, locked: false, audience: 'all' }, roofGroup = { id: id(), name: `Cobertura — ${programme.name}`, parentId: group.id, locked: false, audience: 'all' };
  const built = [];
  for (const cell of cells) {
    cell.floor = createEntity('floor', { name: `${recipeName(cell.key)}${cells.filter(c => c.key === cell.key).length > 1 ? ` ${cells.filter(c => c.key === cell.key).indexOf(cell) + 1}` : ''}`, width: cell.x1 - cell.x0, length: cell.z1 - cell.z0, position: toWorld((cell.x0 + cell.x1) / 2, (cell.z0 + cell.z1) / 2), rotation: quaternionFromYaw(yaw), groupId: group.id, ...placing, material: flooring(cell.key) });
    built.push(cell.floor);
  }
  // A wall runs along a whole line of the plan and belongs to every room it touches.
  const walls = [], near = (a, b) => Math.abs(a - b) < 1e-6;
  const wall = (name, [ax, az], [bx, bz], exterior = false) => {
    const span = Math.hypot(bx - ax, bz - az); if (span < .3) return null;
    const along = near(az, bz), touching = cells.filter(c => along ? (near(c.z0, az) || near(c.z1, az)) && Math.min(c.x1, Math.max(ax, bx)) - Math.max(c.x0, Math.min(ax, bx)) > .2 : (near(c.x0, ax) || near(c.x1, ax)) && Math.min(c.z1, Math.max(az, bz)) - Math.max(c.z0, Math.min(az, bz)) > .2);
    if (!touching.length) return null;
    const entity = createEntity('wall', { name, length: span, height, thickness: exterior ? .2 : .14, position: toWorld(ax, az), rotation: quaternionFromYaw(yaw + Math.atan2(-(bz - az), bx - ax) * 180 / Math.PI), surfaceId: touching[0].floor.id, floorIds: touching.map(c => c.floor.id), groupId: group.id, ...placing, material: { ...surfacePatch('plaster'), color: exterior ? '#d8cfbd' : '#e4ddd0' } });
    const record = { entity, a: [ax, az], b: [bx, bz], span, along, exterior, openings: [] }; walls.push(record); built.push(entity); return record;
  };
  const [X0, X1, Z0, Z1] = [-long / 2, long / 2, -short / 2, short / 2];
  const front = wall('Fachada', [X0, Z1], [X0, Z0], true); wall('Fundos', [X1, Z0], [X1, Z1], true); wall('Lateral', [X0, Z0], [X1, Z0], true); wall('Lateral', [X1, Z1], [X0, Z1], true);
  const hubCell = plan.rooms[0], hall = plan.corridor;
  const divide = hubCell.x1 < X1 - 1e-6 ? wall('Parede interna', [hubCell.x1, Z0], [hubCell.x1, Z1]) : null;
  if (hall) for (const z of [hall.z0, hall.z1]) if (!near(z, Z0) && !near(z, Z1)) wall('Parede do corredor', [hall.x0, z], [hall.x1, z]);
  for (const cell of plan.rooms.filter(c => !c.hub && c.x1 < X1 - 1e-6)) wall('Divisória', [cell.x1, cell.z0], [cell.x1, cell.z1]);
  const lineAt = (point, vertical) => walls.find(w => (vertical ? !w.along && near(w.a[0], point[0]) && Math.min(w.a[1], w.b[1]) - 1e-6 <= point[1] && point[1] <= Math.max(w.a[1], w.b[1]) + 1e-6 : w.along && near(w.a[1], point[1]) && Math.min(w.a[0], w.b[0]) - 1e-6 <= point[0] && point[0] <= Math.max(w.a[0], w.b[0]) + 1e-6));
  const open = (kind, record, point, size, options) => {
    if (!record) return false;
    const offset = Math.hypot(point[0] - record.a[0], point[1] - record.a[1]);
    if (offset - size / 2 < .15 || offset + size / 2 > record.span - .15 || record.openings.some(([at, w]) => Math.abs(at - offset) < (w + size) / 2 + .25)) return false;
    record.openings.push([offset, size]); built.push(createEntity(kind, { wallId: record.entity.id, offset, width: size, groupId: group.id, ...placing, ...options })); return true;
  };
  // Way in, then a way from the hub to every room.
  open('door', front, [X0, 0], Math.min(1.1, short - 1), { name: 'Entrada', height: 2.1, surfaceId: hubCell.floor.id, initialAngle: Math.PI / 3 });
  if (hall) {
    open('door', divide, [hall.x0, (hall.z0 + hall.z1) / 2], Math.min(1.05, hall.z1 - hall.z0 - .2), { name: 'Porta do corredor', height: 2.1, surfaceId: hall.floor.id, initialAngle: Math.PI / 2 });
    for (const cell of plan.rooms.filter(c => !c.hub)) { const z = Math.abs(cell.z0 - hall.z1) < Math.abs(cell.z1 - hall.z0) ? cell.z0 : cell.z1; open('door', lineAt([(cell.x0 + cell.x1) / 2, z], false), [(cell.x0 + cell.x1) / 2, z], Math.min(.9, cell.x1 - cell.x0 - .6), { name: `Porta — ${cell.floor.name}`, height: 2.1, surfaceId: cell.floor.id }); }
  } else {
    // No corridor: one room leads to the next.
    const row = plan.rooms.filter(c => !c.hub).sort((a, b) => a.x0 - b.x0);
    row.forEach(cell => open('door', lineAt([cell.x0, 0], true), [cell.x0, (cell.z0 + cell.z1) / 2 + (cell.z1 - cell.z0) * .2], .9, { name: `Porta — ${cell.floor.name}`, height: 2.1, surfaceId: cell.floor.id }));
  }
  // Daylight where a room meets the outside, except in rooms that are kept closed.
  for (const cell of cells.filter(c => !WINDOWLESS.includes(c.key))) for (const [a, b, vertical] of [[[cell.x0, Z0], [cell.x1, Z0], false], [[cell.x0, Z1], [cell.x1, Z1], false], [[X0, cell.z0], [X0, cell.z1], true], [[X1, cell.z0], [X1, cell.z1], true]]) {
    if (vertical ? !near(cell[a[0] === X0 ? 'x0' : 'x1'], a[0]) : !near(cell[a[1] === Z0 ? 'z0' : 'z1'], a[1])) continue;
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]), count = span < 2.2 ? 0 : Math.max(1, Math.floor(span / 3.4)), small = cell.key === 'bathroom';
    for (let i = 0; i < count; i++) { const t = (i + .5) / count, point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; open('window', lineAt(point, vertical), point, small ? .7 : Math.min(1.4, span / count - .8), { name: `Janela — ${cell.floor.name}`, sill: small ? 1.5 : .9, height: small ? .6 : 1.2, surfaceId: cell.floor.id }); }
  }
  // Furnishing and light are the room assistant's work, room by room, on a copy of the scene.
  const store = createSceneStore(document), accept = make => { try { store.execute('proposal.accept', { proposal: make() }); return true; } catch (error) { if (error instanceof ValidationError) return false; throw error; } };
  if (outline) store.execute('entity.remove', { id: outline.id });
  store.execute('proposal.accept', { proposal: { id: id(), expectedEditVersion: store.editVersion, label: 'Estrutura', entities: built, groups: [group], areas: [], lights: [] } });
  const notes = [];
  if (furnish) plan.rooms.forEach((cell, i) => {
    if (!accept(() => proposeFurnishing(store.document, { floorId: cell.floor.id, template: cell.key, density: 'normal', seed: seed + i, lighting: !lighting }, store.editVersion, catalog))) notes.push(`${cell.floor.name}: não coube mobília.`);
    else accept(() => proposeRoomDetails(store.document, { floorId: cell.floor.id, amount: .5, seed: seed + i }, store.editVersion, catalog));
  });
  // A building shares the scene's few real lights: two sources a room, the hub first.
  if (lighting) for (const cell of cells) accept(() => proposeRoomLighting(store.document, { floorId: cell.floor.id, mood: 'auto', sources: cell.hub ? 3 : 2, fixtures: 1 }, store.editVersion, catalog));
  if (roof) {
    const model = catalog.find(a => a.id === 'builtin-house-roof');
    if (model) { store.execute('proposal.accept', { proposal: { id: id(), expectedEditVersion: store.editVersion, label: 'Cobertura', groups: [roofGroup], areas: [], lights: [], entities: [createEntity('prop', { name: 'Telhado', assetRef: { id: model.id, revision: model.revision }, footprint: model.footprint, position: toWorld(0, 0, height), rotation: quaternionFromYaw(yaw + 90), scale: [(short + .9) / model.bounds[0], Math.max(.6, Math.min(1.2, short / 9)), (long + .9) / model.bounds[2]], groupId: roofGroup.id, ...placing })] } }); }
  }
  // The proposal is what the copy gained.
  const after = store.document, before = document, fresh = (now, then) => Object.values(now).filter(record => !then[record.id]);
  const proposal = { id: id(), expectedEditVersion, label: `Construir ${programme.name.toLowerCase()}`, entities: fresh(after.layout.entities, before.layout.entities).map(clone), groups: fresh(after.layout.groups, before.layout.groups).map(clone), areas: fresh(after.layout.areas, before.layout.areas).map(clone),
    lights: fresh((after.look ?? after.defaultLook).lights, (before.look ?? before.defaultLook).lights).map(clone), compositions: fresh(after.layout.compositions, before.layout.compositions).map(clone), updates: [], removals: outline ? [{ kind: 'entity', id: outline.id }] : [], report: { kept: [], suppressed: [], omissions: notes, conflicts: [], reasons: [] } };
  const names = plan.rooms.map(cell => cell.floor.name.toLowerCase());
  proposal.report.reasons.push(`${programme.name} de ${long.toFixed(1)} × ${short.toFixed(1)} m: ${names.join(', ')}${hall ? ' e corredor' : ''}.`);
  if (plan.dropped) proposal.report.reasons.push(`O contorno não comporta ${plan.dropped === 1 ? 'um cômodo' : `${plan.dropped} cômodos`} do programa; aumente o contorno para incluí-${plan.dropped === 1 ? 'lo' : 'los'}.`);
  proposal.plan = undefined; delete proposal.plan;
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
