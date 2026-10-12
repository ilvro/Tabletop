import { createEntity, id } from '../domain/documents.js';
import { quaternionFromYaw, rotateXZ, yawFromQuaternion } from '../domain/coords.js';
import { worldFootprint, footprintsOverlap, pointInPolygon, isLocked } from '../domain/geometry.js';
import { ValidationError, validateDocument } from '../domain/validation.js';
import { wearDefaults } from '../domain/wear.js';
import { ROOM_STATES } from '../domain/room-states.js';
import { roomFrame, candidates, stableRandom } from './room-layout.js';
import { scopeFor, doorZones, AMBIENCE_TAG } from './furnishing.js';
import { roomContents, roomEra } from './room-insight.js';
import { eraAsset } from '../domain/room-eras.js';

/** Marks surfaces whose wear came from a state, so tidying never erases wear the person applied. */
export const WEAR_TAG = 'desgaste-ambientação';
const SEATS = /chair|stool|bench|armchair/;

/**
 * Leaves a room in a state (lived-in, abandoned, crime scene, ritual…) by
 * working on what is there: the person's furniture is worn, shifted, pushed
 * aside or used as an altar, and set dressing is added around it. Everything
 * added carries the ambience tag and is replaced by the next state; nothing
 * the person made is removed.
 */
export function proposeRoomState(document, { floorId, state = 'abandoned', intensity = .6, seed = 1 } = {}, expectedEditVersion = 0, catalog = []) {
  validateDocument(document);
  const definition = ROOM_STATES.find(entry => entry.id === state);
  if (!definition || !Number.isFinite(intensity) || intensity < 0 || intensity > 1 || !Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new ValidationError('Parâmetros de estado do cômodo inválidos.');
  const { floor, area, newArea } = scopeFor(document, floorId);
  if (isLocked(document, floor)) throw new ValidationError('O piso ou sua pasta está bloqueado.');
  const frame = roomFrame(document, floor, area), yaw = frame.yaw, contents = roomContents(document, floor.id);
  const toWorld = (x, z, height = 0) => rotateXZ([x, height, z], yaw).map((v, i) => v + area.transform.position[i]);
  const era = roomEra(document, floor.id), assetOf = entity => catalog.find(a => a.id === entity.assetRef?.id), named = name => { const model = eraAsset(era, name, catalog); return model && catalog.find(a => a.id === `builtin-${model}`); };
  const proposal = { id: id(), expectedEditVersion, label: `Estado do cômodo: ${definition.name}`, entities: [], groups: [], areas: newArea ? [area] : [], lights: [], updates: [], removals: [], report: { kept: [], suppressed: [], omissions: [], conflicts: [], reasons: [] } };
  const random = key => stableRandom(seed, `${state}/${key}`) * 7919 % 1, amount = (base, extra) => Math.round(base + extra * intensity);

  // 1. Take the previous ambience away; wear set by a state is cleared, the person's own wear stays.
  const patches = new Map(), patch = (entity, change) => { const current = patches.get(entity.id) ?? {}; patches.set(entity.id, { ...current, ...change, ...(change.material ? { material: { ...current.material, ...change.material } } : {}) }); };
  // What rests on a piece leaves before the piece does.
  const dressing = [...contents.resting, ...contents.standing].filter(e => e.tags?.includes(AMBIENCE_TAG));
  for (const entity of dressing) { if (isLocked(document, entity)) proposal.report.kept.push(entity.id); else proposal.removals.push({ kind: 'entity', id: entity.id }); }
  const gone = new Set(proposal.removals.map(op => op.id)), surfaces = [floor, ...contents.walls, ...contents.standing].filter(e => !gone.has(e.id) && !isLocked(document, e));
  for (const entity of surfaces.filter(e => e.tags?.includes(WEAR_TAG))) patch(entity, { tags: entity.tags.filter(tag => tag !== WEAR_TAG), material: { wear: null } });
  const wear = (entity, type, settings) => {
    if (entity.material?.wear && !entity.tags?.includes(WEAR_TAG)) return false;
    patch(entity, { tags: [...(entity.tags ?? []).filter(tag => tag !== WEAR_TAG), WEAR_TAG], material: { wear: { ...wearDefaults(type), seed: Math.floor(random(`wear/${entity.id}`) * 65535), ...settings } } });
    return true;
  };

  // 2. The room as it stands: furniture that stays, where one can walk, what can hold things.
  const furniture = contents.standing.filter(e => !gone.has(e.id) && assetOf(e)), solid = furniture.filter(e => assetOf(e).bounds[1] > .05);
  const movable = solid.filter(e => !isLocked(document, e) && !e.anchor), reserved = doorZones(document, floor);
  const occupied = solid.map(entity => ({ id: entity.id, corners: worldFootprint(entity, .06) })), placed = new Map();
  const within = corners => corners.every(point => pointInPolygon(frame.toLocal([point[0], 0, point[1]]), frame.contour));
  const free = (entity, padding = .06) => { const corners = worldFootprint(entity, padding); return within(worldFootprint(entity)) && !reserved.some(zone => footprintsOverlap(corners, zone)) && !occupied.some(o => o.id !== entity.id && footprintsOverlap(corners, o.corners)); };
  const pose = (entity, asset = assetOf(entity)) => { const [x, z] = frame.toLocal(entity.transform.position); return { id: entity.id, x, z, rotation: yawFromQuaternion(entity.transform.rotation) - yaw, width: asset.footprint[0] * entity.transform.scale[0], depth: asset.footprint[1] * entity.transform.scale[2], top: entity.transform.position[1] - area.transform.position[1] + (asset.supportHeight ?? 0) * entity.transform.scale[1] }; };
  const tops = furniture.filter(e => assetOf(e).supportHeight > 0 && assetOf(e).bounds[1] > .3 && contents.resting.filter(r => r.surfaceId === e.id && !gone.has(r.id)).length < 2).sort((a, b) => random(`top/${a.id}`) - random(`top/${b.id}`));
  tops.forEach((entity, i) => placed.set(`top.${i + 1}`, pose(entity)));

  let added = 0;
  /** Adds one piece of set dressing by a layout rule, or reports that it found no room. */
  const dress = (key, model, rule, { takesSpace = true, index = 0, total = 1 } = {}) => {
    const asset = named(model); if (!asset) return null;
    for (const candidate of candidates(rule, { frame, placed, seed, slot: `${state}/${key}`, asset, index, total })) {
      const entity = createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, position: toWorld(candidate.x, candidate.z, candidate.on ? candidate.on.top : 0), rotation: quaternionFromYaw(yaw + candidate.rotation), footprint: asset.footprint, groupId: area.groupId ?? floor.groupId ?? null, surfaceId: candidate.on?.id ?? floor.id, levelId: floor.levelId ?? null, layerId: floor.layerId ?? null, tags: [AMBIENCE_TAG], ...(asset.supportHeight ? { supportHeight: asset.supportHeight } : {}) });
      if (!candidate.on && !(takesSpace ? free(entity) : within(worldFootprint(entity)))) continue;
      proposal.entities.push(entity); placed.set(key, pose(entity, asset)); added++;
      if (takesSpace && !candidate.on) occupied.push({ id: entity.id, corners: worldFootprint(entity, .06) });
      return entity;
    }
    return null;
  };
  const several = (key, model, rule, count, options) => { for (let index = 0; index < count; index++) dress(`${key}.${index + 1}`, model, rule, { ...options, index, total: count }); };
  /** Moves a piece of the person's furniture if the new place is free. */
  const move = (entity, position, rotation) => {
    const next = { ...entity, transform: { ...entity.transform, position, rotation } };
    if (!free(next)) return false;
    patch(entity, { transform: { position, rotation } });
    occupied.splice(occupied.findIndex(o => o.id === entity.id), 1, { id: entity.id, corners: worldFootprint(next, .06) });
    return true;
  };
  const disturb = (entity, angle, distance) => {
    const turn = (random(`turn/${entity.id}`) - .5) * 2 * angle, heading = random(`dir/${entity.id}`) * 360, step = rotateXZ([0, 0, distance * random(`far/${entity.id}`)], heading);
    const rotation = quaternionFromYaw(yawFromQuaternion(entity.transform.rotation) + turn);
    return move(entity, entity.transform.position.map((v, i) => v + step[i]), rotation) || move(entity, entity.transform.position, rotation);
  };
  const pick = (list, share, key) => list.filter(entity => random(`${key}/${entity.id}`) < share);
  const onTops = (models, count) => { let used = 0; for (let i = 0; i < tops.length && used < count; i++) if (dress(`on.${i + 1}`, models[Math.floor(random(`model/${i}`) * models.length)], { at: 'on', of: `top.${i + 1}`, u: random(`u/${i}`) * 1.6 - .8, v: random(`v/${i}`) * 1.2 - .6 })) used++; return used; };
  const seats = movable.filter(e => SEATS.test(e.assetRef.id)), small = movable.filter(e => assetOf(e).footprint[0] * assetOf(e).footprint[1] < 1.3);
  let shifted = 0, worn = 0;

  if (state === 'tidy') {
    // Square to the room again; positions are the person's and stay.
    for (const entity of movable) {
      const local = yawFromQuaternion(entity.transform.rotation) - yaw, square = Math.round(local / 90) * 90, off = Math.abs(local - square);
      if (off > .5 && off < 35 && move(entity, entity.transform.position, quaternionFromYaw(yaw + square))) shifted++;
    }
  } else if (state === 'lived') {
    onTops(['documents', 'radio', 'telephone', 'desk-fan', 'kerosene-lantern', 'house-place-setting', 'laptop', 'typewriter', 'candles'], amount(1, 4));
    for (const entity of pick(seats, .4 + .5 * intensity, 'seat')) if (disturb(entity, 8 + 14 * intensity, .12)) shifted++;
    if (!furniture.some(e => /plant/.test(e.assetRef.id)) && intensity > .3) dress('plant', 'house-plant', { at: 'corner' });
    if (!furniture.some(e => /coat-rack/.test(e.assetRef.id)) && intensity > .6) dress('coat', 'coat-rack', { at: 'wall', prefer: 'door' });
  } else if (state === 'abandoned') {
    if (wear(floor, 'grime', { amount: .35 + .45 * intensity, size: 1.6 })) worn++;
    for (const wall of contents.walls.filter(e => !isLocked(document, e))) if (wear(wall, random(`moss/${wall.id}`) < intensity * .35 ? 'moss' : 'grime', { amount: .25 + .45 * intensity, placement: 'base', size: 1.1 })) worn++;
    for (const entity of pick(movable, .45 + .45 * intensity, 'worn')) if (wear(entity, 'grime', { amount: .3 + .5 * intensity, size: .5 })) worn++;
    for (const entity of pick(small, .15 + .4 * intensity, 'moved')) if (disturb(entity, 12 + 28 * intensity, .35)) shifted++;
    several('timber', 'broken-timber-pile', { at: 'free' }, amount(0, 2)); several('paper', 'documents', { at: 'free' }, amount(1, 2), { takesSpace: false });
    several('weed', 'dry-grass', { at: 'corner' }, amount(0, 3)); several('shrub', 'winter-dry-shrub', { at: 'wall', align: 'start' }, amount(0, 2)); several('crate', 'old-open-crate', { at: 'free' }, amount(0, 1.4));
  } else if (state === 'crime') {
    // The scene happens where there is floor to fall on, beside what the room already has.
    dress('blood', 'blood-pool', { at: 'center', dx: random('bx') * .7 - .35, dz: random('bz') * .7 - .35, rotation: random('br') * 360 }, { takesSpace: false });
    if (placed.has('blood')) {
      dress('body', 'body-bag', { at: 'under', of: 'blood', shift: .25, turn: random('body') * 180 }, { takesSpace: true }) || dress('body', 'body-bag', { at: 'beside', of: 'blood', gap: .05 });
      several('cone', 'traffic-cone', { at: 'ring', of: 'blood' }, amount(2, 3)); dress('case', 'evidence-case', { at: 'beside', of: 'blood', gap: .5 });
      dress('camera', 'camera-tripod', { at: 'front', of: 'blood', gap: 1.1 + random('cam') * .6, shift: random('cams') - .5 });
      if (intensity > .65) dress('blood.2', 'blood-pool', { at: 'free' }, { takesSpace: false });
    } else proposal.report.omissions.push('Não há piso livre para a cena; afaste alguns móveis do centro.');
    several('paper', 'documents', { at: 'free' }, amount(0, 2), { takesSpace: false }); onTops(['documents', 'evidence-case', 'telephone'], amount(0, 2));
    if (intensity > .5) dress('weapon', 'weapon-case', { at: 'wall', prefer: 'door' });
    for (const entity of pick(seats.length ? seats : small, .25 + .5 * intensity, 'struggle')) if (disturb(entity, 25 + 50 * intensity, .45)) shifted++;
  } else if (state === 'ritual') {
    const circle = named('ritual-circle'), radius = circle.footprint[0] / 2;
    // Open the middle: whatever the person has there goes to the nearest free stretch of wall.
    for (const entity of movable) {
      const here = pose(entity);
      if (Math.hypot(here.x, here.z) > radius + Math.max(here.width, here.depth) * .35) continue;
      const spots = [...candidates({ at: 'wall' }, { frame, placed, seed, slot: `clear/${entity.id}`, asset: assetOf(entity) })].sort((a, b) => Math.hypot(a.x - here.x, a.z - here.z) - Math.hypot(b.x - here.x, b.z - here.z));
      if (spots.some(spot => move(entity, toWorld(spot.x, spot.z, entity.transform.position[1] - area.transform.position[1]), quaternionFromYaw(yaw + spot.rotation)))) shifted++;
      else proposal.report.conflicts.push(`${entity.name}: não há parede livre para afastar; ficou no centro.`);
    }
    tops.forEach((entity, i) => placed.set(`top.${i + 1}`, pose({ ...entity, transform: { ...entity.transform, ...patches.get(entity.id)?.transform } })));
    dress('circle', 'ritual-circle', { at: 'center', rotation: random('circle') * 360 }, { takesSpace: false });
    if (placed.has('circle')) {
      several('candle', 'candles', { at: 'ring', of: 'circle' }, amount(3, 5));
      if (intensity > .45) dress('blood', 'blood-pool', { at: 'under', of: 'circle', shift: .4 }, { takesSpace: false });
      const centre = frame.toLocal(toWorld(placed.get('circle').x, placed.get('circle').z)), span = frame.bounds;
      if (wear(floor, 'scorch', { amount: .5 + .4 * intensity, placement: 'region', center: [(centre[0] - span.minX) / (span.maxX - span.minX), .5, (centre[1] - span.minZ) / (span.maxZ - span.minZ)], radius: .22 + .15 * intensity, softness: .7 })) worn++;
    } else proposal.report.omissions.push('Não há espaço para o círculo no centro do cômodo.');
    // A table of the room becomes the altar; only an empty room gets one brought in.
    if (!tops.length && dress('altar', 'ritual-altar', { at: 'wall', prefer: 'far' })) placed.set('top.1', placed.get('altar'));
    if (placed.has('top.1')) { dress('book', 'ritual-book', { at: 'on', of: 'top.1', u: -.5 }); dress('skull', 'skull-display', { at: 'on', of: 'top.1', u: .6 }); if (intensity > .5) dress('offering', 'candles', { at: 'on', of: 'top.1', v: -.7 }); }
    several('candelabra', 'ritual-candelabra', { at: 'corner' }, amount(1, 3)); if (intensity > .4) dress('effigy', 'effigy', { at: 'wall', prefer: 'far' });
  }

  for (const [key, change] of patches) proposal.updates.push({ kind: 'entity', id: key, patch: change });
  const tell = (count, one, many) => { if (count) proposal.report.reasons.push(count === 1 ? one : many.replace('#', count)); };
  tell(proposal.removals.length, 'Uma peça da ambientação anterior sai.', '# peças da ambientação anterior saem.');
  tell(added, 'Uma peça de ambientação entra.', '# peças de ambientação entram.');
  tell(shifted, state === 'tidy' ? 'Um móvel seu é endireitado.' : state === 'ritual' ? 'Um móvel seu é afastado do centro.' : 'Um móvel seu sai do lugar.', state === 'tidy' ? '# móveis seus são endireitados.' : state === 'ritual' ? '# móveis seus são afastados do centro.' : '# móveis seus saem do lugar.');
  tell(worn, 'Uma superfície recebe desgaste.', '# superfícies recebem desgaste (piso, paredes e móveis).');
  if (!proposal.entities.length && !proposal.updates.length && !proposal.removals.length) throw new ValidationError(state === 'tidy' ? 'O cômodo já está arrumado.' : 'Não há o que mudar neste cômodo com este estado.');
  return proposal;
}
