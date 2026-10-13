import { createEntity, id } from '../domain/documents.js';
import { quaternionFromYaw, rotateXZ, yawFromQuaternion } from '../domain/coords.js';
import { isLocked, worldFootprint, footprintsOverlap } from '../domain/geometry.js';
import { ValidationError, validateDocument } from '../domain/validation.js';
import { surfacePatch } from '../domain/materials.js';
import { illuminationDefaults } from '../domain/dynamic-lighting.js';
import { eraAsset, beforeElectricity } from '../domain/room-eras.js';
import { describeBuilding, roomKind } from './building.js';
import { roomEra } from './room-insight.js';
import { stableRandom } from './room-layout.js';

/** Marks what the assistant laid around a building, so the next pass replaces it and nothing else. */
export const SURROUNDINGS_TAG = 'entorno';
export const SETTINGS = [
  { id: 'auto', name: 'Automático', description: 'Escolhido pelo tipo de prédio e pela época.' },
  { id: 'urban', name: 'Urbano', description: 'Lote murado, calçada, rua, poste e árvores no quintal.' },
  { id: 'rural', name: 'Rural', description: 'Cerca de madeira, estrada de terra, poço, lenha e pomar.' },
  { id: 'woods', name: 'Mata', description: 'Sem cerca nem rua: árvores, troncos e pedras em volta, só uma trilha até a porta.' },
  { id: 'graveyard', name: 'Cemitério', description: 'Grade de ferro, lápides em fileiras, cruzes e árvores secas.' },
  { id: 'yard', name: 'Pátio industrial', description: 'Chão de concreto, muro, tambores, paletes e caçamba.' },
];
const BY_BUILDING = { station: 'yard', tavern: 'rural', keep: 'rural', house: 'urban', police: 'urban', clinic: 'urban', office: 'urban', bar: 'urban', warehouse: 'yard', church: 'graveyard' };
const PARKED = { police: 'police-car', clinic: 'ambulance', warehouse: 'delivery-van' };
// What stands in the yard of each setting: [model, how many per 100 m² of free ground at full greenery, where].
const YARD = {
  urban: [['tree', 1.7, 'back'], ['bushes', 1.9, 'edge'], ['house-plant', .4, 'front'], ['trash-can', .15, 'front'], ['bench', .15, 'front'], ['bicycle', .1, 'front']],
  rural: [['tree', 1.8, 'back'], ['bushes', 1.2, 'edge'], ['hay-bale', .5, 'back'], ['log-pile', .3, 'edge'], ['handcart', .12, 'front'], ['wheelbarrow', .12, 'back'], ['dry-grass', 1.6, 'any']],
  woods: [['pine', 3.2, 'any'], ['tree', 1.8, 'any'], ['dead-tree', .9, 'any'], ['bushes', 2.2, 'any'], ['stump', .7, 'any'], ['rock', .6, 'any'], ['dry-grass', 1.8, 'any']],
  graveyard: [['dead-tree', .6, 'edge'], ['angel-statue', .15, 'front'], ['grave-cross', .5, 'back'], ['dry-grass', 1.3, 'any'], ['bushes', .5, 'edge']],
  yard: [['barrel', 1, 'edge'], ['pallet', .8, 'back'], ['crate', .9, 'back'], ['dumpster', .2, 'edge'], ['pallet-jack', .12, 'back'], ['traffic-cone', .5, 'front']],
};
const LANDMARK = { rural: 'well', woods: 'campfire' };
const GROUND = { urban: 'grass', rural: 'grass', woods: 'grass', graveyard: 'grass', yard: 'concrete' };
const near = (a, b) => Math.abs(a - b) < 1e-6;

/** The setting a building asks for: a church has its graveyard, a warehouse its yard, an old house the countryside. */
export function inferSetting(buildingType, era = 'modern') {
  const setting = BY_BUILDING[buildingType] ?? 'urban';
  return beforeElectricity(era) && setting === 'urban' ? 'rural' : setting;
}

/**
 * Lays the surroundings of a building that already stands. It reads where the
 * way in is, whether there is a garage, what kind of building it is and its
 * era, and from that puts the ground, the wall or fence with its gate in front
 * of the door, the path, the driveway, the street and what grows or is left
 * in the yard. What the person already has outside stays and is worked around.
 */
export function proposeSurroundings(document, { floorId, setting = 'auto', margin = 6, enclosure = true, street = true, greenery = .6, seed = 1 } = {}, expectedEditVersion = 0, catalog = []) {
  validateDocument(document);
  const anchor = document.layout.entities[floorId];
  if (anchor?.kind !== 'floor' || anchor.tags?.includes(SURROUNDINGS_TAG)) throw new ValidationError('Selecione um cômodo do prédio que terá o entorno.');
  if (!(margin >= 2 && margin <= 30) || !(greenery >= 0 && greenery <= 1) || !Number.isInteger(seed) || seed < 0 || !SETTINGS.some(entry => entry.id === setting)) throw new ValidationError('Parâmetros do entorno inválidos.');
  const entities = Object.values(document.layout.entities), look = document.look ?? document.defaultLook;
  const building = describeBuilding(document, floorId, catalog), memberIds = new Set(building ? building.rooms.map(room => room.id) : [floorId]), members = [...memberIds].map(key => document.layout.entities[key]);
  const eras = [floorId, ...members.map(floor => floor.id)].map(key => roomEra(document, key)), era = eras.includes('future') ? 'future' : eras.includes('medieval') ? 'medieval' : eras.includes('old') ? 'old' : 'modern', old = beforeElectricity(era);
  const chosen = setting === 'auto' ? inferSetting(building?.type?.id, era) : setting, definition = SETTINGS.find(entry => entry.id === chosen);
  const model = name => { const real = eraAsset(era, name, catalog); return real ? catalog.find(a => a.id === `builtin-${real}`) : null; };
  // The way in: an outside door of the building, and the side of the building it is on.
  const baseYaw = yawFromQuaternion(anchor.transform.rotation), unturn = position => { const v = rotateXZ(position.map((n, i) => n - anchor.transform.position[i]), -baseYaw); return [v[0], v[2]]; };
  const corners = members.flatMap(floor => worldFootprint(floor).map(([x, z]) => unturn([x, 0, z]))), box = { x0: Math.min(...corners.map(p => p[0])), x1: Math.max(...corners.map(p => p[0])), z0: Math.min(...corners.map(p => p[1])), z1: Math.max(...corners.map(p => p[1])) };
  const outerWalls = entities.filter(e => e.kind === 'wall' && (e.floorIds ?? [e.surfaceId]).filter(key => memberIds.has(key)).length === 1 && !(e.floorIds ?? []).some(key => document.layout.entities[key]?.tags?.includes(SURROUNDINGS_TAG)));
  const doorAt = door => { const wall = document.layout.entities[door.wallId]; return unturn(rotateXZ([door.offset, 0, 0], yawFromQuaternion(wall.transform.rotation)).map((v, i) => v + wall.transform.position[i])); };
  const doors = entities.filter(e => e.kind === 'door' && outerWalls.some(wall => wall.id === e.wallId)), entrance = doors.find(door => /entrada/i.test(door.name)) ?? doors[0] ?? null;
  const sides = [['z1', 0], ['x1', 90], ['z0', 180], ['x0', -90]], at = entrance ? doorAt(entrance) : null;
  const front = at ? sides.map(([key, turn]) => ({ key, turn, gap: Math.abs((key[0] === 'x' ? at[0] : at[1]) - box[key]) })).sort((a, b) => a.gap - b.gap)[0] : { key: 'z1', turn: 0 };
  // From here on, a frame centred on the building with the front towards +Z.
  const yaw = baseYaw + front.turn, centreLocal = [(box.x0 + box.x1) / 2, (box.z0 + box.z1) / 2], centre = rotateXZ([centreLocal[0], 0, centreLocal[1]], baseYaw).map((v, i) => v + anchor.transform.position[i]);
  const toWorld = (x, z, y = 0) => rotateXZ([x, y, z], yaw).map((v, i) => v + centre[i]), toLocal = position => { const v = rotateXZ(position.map((n, i) => n - centre[i]), -yaw); return [v[0], v[2]]; };
  const quarter = Math.abs(front.turn) === 90, bw = quarter ? box.z1 - box.z0 : box.x1 - box.x0, bd = quarter ? box.x1 - box.x0 : box.z1 - box.z0;
  const open = chosen === 'woods', frontYard = open ? margin : margin * 1.3, lot = { x0: -bw / 2 - margin, x1: bw / 2 + margin, z0: -bd / 2 - margin, z1: bd / 2 + frontYard };
  const doorX = entrance ? Math.max(-bw / 2 + .8, Math.min(bw / 2 - .8, toLocal(rotateXZ([...at.slice(0, 1), 0, at[1]], baseYaw).map((v, i) => v + anchor.transform.position[i]))[0])) : 0;
  const base = anchor.transform.position[1], placing = { levelId: anchor.levelId ?? null, layerId: anchor.layerId ?? null }, group = { id: id(), name: `Entorno — ${definition.name}`, parentId: null, locked: false, audience: 'all' };
  const proposal = { id: id(), expectedEditVersion, label: `Entorno: ${definition.name.toLowerCase()}`, entities: [], groups: [group], areas: [], lights: [], updates: [], rehoming: [], removals: [], report: { kept: [], suppressed: [], omissions: [], conflicts: [], reasons: [] } };
  const road = street && !open, reach = { x0: lot.x0 - 1, x1: lot.x1 + 1, z0: lot.z0 - 1, z1: lot.z1 + (road ? 9 : 1) }, inReach = position => { const [x, z] = toLocal(position); return x >= lot.x0 - 14 && x <= lot.x1 + 14 && z >= lot.z0 - 14 && z <= lot.z1 + 22; };   // wide enough for a previous pass of any setting

  // The previous pass leaves; what the person put on the old ground moves to the new one.
  const previous = entities.filter(e => e.tags?.includes(SURROUNDINGS_TAG) && e.transform && inReach(e.transform.position) && !isLocked(document, e)), oldFloors = new Set(previous.filter(e => e.kind === 'floor').map(e => e.id));
  const rests = record => oldFloors.has(record.surfaceId) || oldFloors.has(document.layout.entities[record.surfaceId]?.surfaceId), mine = entities.filter(e => !e.tags?.includes(SURROUNDINGS_TAG) && oldFloors.has(e.surfaceId));
  const strip = (name, x0, x1, z0, z1, texture, lift, color) => { const floor = createEntity('floor', { name, width: x1 - x0, length: z1 - z0, thickness: .05, position: toWorld((x0 + x1) / 2, (z0 + z1) / 2, lift), rotation: quaternionFromYaw(yaw), groupId: group.id, ...placing, tags: [SURROUNDINGS_TAG], material: { ...surfacePatch(texture), ...(color ? { color } : {}) } }); floor.transform.position[1] = base + lift; proposal.entities.push(floor); return floor; };
  const ground = strip(open ? 'Clareira' : 'Terreno', lot.x0, lot.x1, lot.z0, lot.z1, GROUND[chosen], -.04, chosen === 'woods' ? '#8f9a78' : chosen === 'graveyard' ? '#9aa08c' : undefined);
  for (const record of mine) proposal.rehoming.push({ kind: 'entity', id: record.id, patch: { surfaceId: ground.id } });
  for (const light of Object.values(look.lights).filter(l => oldFloors.has(l.surfaceId))) proposal.rehoming.push({ kind: 'light', id: light.id, patch: { surfaceId: ground.id } });
  for (const token of Object.values(document.tokens ?? {}).filter(t => oldFloors.has(t.surfaceId))) proposal.rehoming.push({ kind: 'token', id: token.id, patch: { surfaceId: ground.id } });
  for (const record of previous) if (record.kind === 'floor' || !rests(record) && !oldFloors.has(document.layout.entities[record.wallId]?.surfaceId)) proposal.removals.push({ kind: 'entity', id: record.id });

  // Ways across the yard: the path to the door and, if the building has a garage on the front, the driveway.
  const keepClear = [], lane = (x0, x1, z0, z1) => keepClear.push([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => { const w = toWorld(x, z); return [w[0], w[2]]; }));
  const pathTexture = chosen === 'yard' ? null : old || chosen === 'rural' || open ? 'sand' : 'stone';
  if (entrance || !open) { if (pathTexture) strip(open ? 'Trilha' : 'Caminho de entrada', doorX - .7, doorX + .7, bd / 2, lot.z1, pathTexture, -.025); lane(doorX - 1, doorX + 1, bd / 2 - .2, lot.z1 + .5); }
  const gates = entrance || !open ? [[doorX - .9, doorX + .9]] : [];
  const garage = members.find(floor => roomKind(document, floor.id, catalog) === 'garage'), garageBox = garage && (() => { const points = worldFootprint(garage).map(([x, z]) => toLocal([x, 0, z])); return { x0: Math.min(...points.map(p => p[0])), x1: Math.max(...points.map(p => p[0])), z1: Math.max(...points.map(p => p[1])) }; })();
  let driveway = null;
  if (garageBox && near(Math.round(garageBox.z1 * 100), Math.round(bd / 2 * 100)) && !open) {
    const mid = (garageBox.x0 + garageBox.x1) / 2, half = Math.min(1.6, (garageBox.x1 - garageBox.x0) / 2 - .2);
    if (Math.abs(mid - doorX) > half + 1.2) { driveway = [mid - half, mid + half]; if (chosen !== 'yard') strip('Entrada de veículos', driveway[0], driveway[1], bd / 2, lot.z1, old ? 'sand' : 'concrete', -.03); lane(driveway[0] - .2, driveway[1] + .2, bd / 2 - .2, lot.z1 + .5); gates.push(driveway); }
  }
  // The street side: pavement and road, or a dirt road in the country and in older times.
  if (road) {
    const dirt = chosen === 'rural' || old;
    if (!dirt) strip('Calçada', reach.x0 - 1, reach.x1 + 1, lot.z1, lot.z1 + 2, 'concrete', -.03, '#b9b6ad');
    strip(dirt ? 'Estrada de terra' : 'Rua', reach.x0 - 1, reach.x1 + 1, lot.z1 + (dirt ? 0 : 2), lot.z1 + (dirt ? 5 : 8), dirt ? 'sand' : 'concrete', -.05, dirt ? '#a08c6c' : '#4a4b4d');
  }

  // Standing things: the building, what the person has outside, and whatever is placed from here on.
  const taken = [[[-bw / 2 - .5, -bd / 2 - .5], [bw / 2 + .5, -bd / 2 - .5], [bw / 2 + .5, bd / 2 + .5], [-bw / 2 - .5, bd / 2 + .5]].map(([x, z]) => { const w = toWorld(x, z); return [w[0], w[2]]; }), ...keepClear];
  const outsiders = entities.filter(e => (e.kind === 'prop' || e.kind === 'floor' && !memberIds.has(e.id)) && !e.tags?.includes(SURROUNDINGS_TAG) && e.transform && inReach(e.transform.position) && !memberIds.has(e.surfaceId) && !memberIds.has(document.layout.entities[e.surfaceId]?.surfaceId)
    // Roofs, ceiling lights and what hangs on the walls belong to the building, not to the yard.
    && (([x, z]) => Math.abs(x) > bw / 2 + .3 || Math.abs(z) > bd / 2 + .3)(toLocal(e.transform.position)));
  for (const record of outsiders) taken.push(worldFootprint(record, .3));
  const random = key => { let hash = Math.floor(stableRandom(seed, `yard/${key}`) * 4294967296); hash ^= hash >>> 16; hash = Math.imul(hash, 0x85ebca6b); hash ^= hash >>> 13; hash = Math.imul(hash, 0xc2b2ae35); hash ^= hash >>> 16; return (hash >>> 0) / 4294967296; };
  const counts = new Map(), put = (name, x, z, turn = 0, { padding = .15, support = ground, extra = {} } = {}) => {
    const asset = model(name); if (!asset) return null;
    const entity = createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint, position: toWorld(x, z, 0), rotation: quaternionFromYaw(yaw + turn), groupId: group.id, surfaceId: support.id, ...placing, tags: [SURROUNDINGS_TAG], ...(asset.supportHeight ? { supportHeight: asset.supportHeight } : {}), ...extra });
    entity.transform.position[1] = support.transform.position[1];
    const footprint = worldFootprint(entity, padding); if (taken.some(other => footprintsOverlap(footprint, other))) return null;
    taken.push(footprint); proposal.entities.push(entity); counts.set(asset.name, (counts.get(asset.name) ?? 0) + 1); return entity;
  };

  // The edge of the lot: a wall in town, a fence in the country and around a graveyard, nothing in the woods.
  if (enclosure && !open) {
    const walled = (chosen === 'urban' || chosen === 'yard') && era !== 'future', fenceModel = chosen === 'graveyard' ? 'iron-fence' : 'wooden-fence';
    const runs = [[[lot.x0, lot.z0], [lot.x1, lot.z0]], [[lot.x1, lot.z0], [lot.x1, lot.z1]], [[lot.x0, lot.z1], [lot.x0, lot.z0]]];
    let cursor = lot.x1; for (const [from, to] of [...gates].sort((a, b) => b[0] - a[0])) { if (cursor - to > .4) runs.push([[cursor, lot.z1], [to, lot.z1]]); cursor = from; } if (cursor - lot.x0 > .4) runs.push([[cursor, lot.z1], [lot.x0, lot.z1]]);
    for (const [[ax, az], [bx, bz]] of runs) {
      const span = Math.hypot(bx - ax, bz - az), turn = Math.atan2(-(bz - az), bx - ax) * 180 / Math.PI;
      if (walled) { const wall = createEntity('wall', { name: 'Muro', length: span, height: chosen === 'yard' ? 2.2 : 1.7, thickness: .16, position: toWorld(ax, az), rotation: quaternionFromYaw(yaw + turn), surfaceId: ground.id, groupId: group.id, ...placing, tags: [SURROUNDINGS_TAG], material: surfacePatch(old ? 'stone' : chosen === 'yard' ? 'concrete' : 'brick') }); wall.transform.position[1] = ground.transform.position[1]; proposal.entities.push(wall); continue; }
      const piece = model(fenceModel); if (!piece) continue;
      const count = Math.max(1, Math.round(span / piece.footprint[0])), step = span / count;
      for (let i = 0; i < count; i++) put(fenceModel, ax + (bx - ax) * (i + .5) * step / span, az + (bz - az) * (i + .5) * step / span, turn, { padding: -.4 });
    }
  }
  // The street: lamps that light, something parked that says what the building is.
  if (road) {
    const kerb = chosen === 'rural' || old ? lot.z1 + .6 : lot.z1 + 1.2;
    for (const x of [lot.x0 + 2, lot.x1 - 2]) { const lamp = put('streetlamp', x, kerb, 180); if (lamp) lamp.illumination = { ...illuminationDefaults('lamp', lamp), position: [0, 3.2, 0], intensity: 60, distance: 14, priority: 4 }; }
    if (chosen === 'urban') { put('fire-hydrant', doorX + 3, kerb, 0); put('trash-can', doorX - 2.4, kerb, 0); }
    const car = PARKED[building?.type?.id] ?? (chosen === 'urban' ? 'sedan' : null);
    if (car && chosen !== 'rural') put(car, lot.x0 + 5 + random('car') * Math.max(0, lot.x1 - lot.x0 - 10), lot.z1 + 5.2, 90, { padding: .3 });
    if (driveway && !old) put('sedan', (driveway[0] + driveway[1]) / 2, bd / 2 + (lot.z1 - bd / 2) * .45, 0, { padding: -.1 });
  }
  // Graves stand in rows beside and behind the church.
  const free = (lot.x1 - lot.x0) * (lot.z1 - lot.z0) - bw * bd;
  if (chosen === 'graveyard') {
    const rows = Math.round((.25 + greenery * .75) * free / 22); let made = 0;
    const plots = []; for (let z = lot.z0 + 1.6; z < bd / 2; z += 2.6) for (let x = lot.x0 + 1.4; x < lot.x1 - 1; x += 1.9) plots.push([x, z]);
    // Filled from the far corners inwards, on both sides alike, as a graveyard grows.
    plots.sort((p, q) => (Math.abs(q[0]) - q[1] * .6) - (Math.abs(p[0]) - p[1] * .6));
    for (const [x, z] of plots) { if (made >= rows) break; if (put(random(`g/${x}/${z}`) < .16 ? 'grave-cross' : 'gravestone', x + (random(`gx/${x}/${z}`) - .5) * .3, z, 180 + (random(`gr/${x}/${z}`) - .5) * 14, { padding: .25 })) made++; }
    if (greenery > .5) put('mausoleum', lot.x1 - 2.6, lot.z0 + 2.6, 180) ; if (greenery > .3) put('open-grave', lot.x0 + 2.4, bd / 2 + frontYard * .5, 0);
  }
  if (LANDMARK[chosen]) for (let attempt = 0; attempt < 12; attempt++) if (put(LANDMARK[chosen], lot.x0 + 2 + random(`lm/x/${attempt}`) * (lot.x1 - lot.x0 - 4), chosen === 'woods' ? bd / 2 + 2 + random(`lm/z/${attempt}`) * (frontYard - 3) : lot.z0 + 1.5 + random(`lm/z/${attempt}`) * (margin - 2.5), 0, { padding: .6 })) break;
  if (era === 'medieval' && !open) { for (const side of [2.4, -2.4, 3.6, -3.6]) if (put('medieval-signpost', doorX + side, lot.z1 - 1.3, 180, { padding: .1 })) break; for (let attempt = 0; attempt < 10; attempt++) if (put(building?.type?.id === 'keep' ? 'medieval-stocks' : 'medieval-market-stall', lot.x0 + 2 + random(`md/${attempt}`) * (lot.x1 - lot.x0 - 4), bd / 2 + 1.6 + random(`mz/${attempt}`) * (frontYard - 3.4), 180, { padding: .4 })) break; for (let attempt = 0; attempt < 10; attempt++) if (put('medieval-training-dummy', lot.x0 + 1.5 + random(`dd/${attempt}`) * (lot.x1 - lot.x0 - 3), lot.z0 + 1.5 + random(`dz/${attempt}`) * (margin - 2.5), 0, { padding: .5 })) break; }
  // A base has its dish and its panels behind, and a sentry by the gate.
  if (era === 'future' && !open) { for (const side of [2.6, -2.6]) if (put('future-turret', doorX + side, lot.z1 - 1.4, 0, { padding: .1 })) break; for (const [name, tries] of [['future-dish', 10], ['future-solar-panel', 10], ['future-solar-panel', 10]]) for (let attempt = 0; attempt < tries; attempt++) if (put(name, lot.x0 + 2 + random(`fx/${name}/${attempt}/${counts.size}`) * (lot.x1 - lot.x0 - 4), lot.z0 + 1.6 + random(`fz/${name}/${attempt}/${counts.size}`) * (margin - 3), 180, { padding: .4 })) break; }
  // What grows and what is left in the yard, each kind where it belongs.
  const spot = (where, key) => {
    const u = random(`${key}/u`), v = random(`${key}/v`), pick = random(`${key}/s`), across = lot.x0 + .9 + u * (lot.x1 - lot.x0 - 1.8), beside = () => [pick < .5 ? lot.x0 + .9 + u * (margin - 1.6) : lot.x1 - .9 - u * (margin - 1.6), lot.z0 + .9 + v * (lot.z1 - lot.z0 - 1.8)];
    // Behind the building or down its sides; in front of it; hugging the edge of the lot; or anywhere.
    if (where === 'back') return pick < .2 || pick > .8 ? beside() : [across, lot.z0 + .9 + v * (margin - 1.6)];
    if (where === 'front') return [across, bd / 2 + 1 + v * (frontYard - 2)];
    if (where === 'edge') return pick < .34 ? [across, lot.z0 + .8 + v * 1.2] : [pick < .67 ? lot.x0 + .8 + v * 1.2 : lot.x1 - .8 - v * 1.2, lot.z0 + .9 + u * (lot.z1 - lot.z0 - 1.8)];
    return [across, lot.z0 + .9 + v * (lot.z1 - lot.z0 - 1.8)];
  };
  for (const [name, density, where] of YARD[chosen]) {
    const count = Math.round(density * free / 100 * greenery * (.75 + random(`n/${name}`) * .5));
    for (let i = 0; i < count; i++) for (let attempt = 0; attempt < 24; attempt++) { const [x, z] = spot(where, `${name}/${i}/${attempt}`); if (put(name, x, z, random(`${name}/${i}/${attempt}/r`) * 360, { padding: /tree|pine/.test(name) ? .5 : .2 })) break; }
  }

  const why = setting !== 'auto' ? '' : chosen === 'rural' && old && !['tavern', 'keep'].includes(building?.type?.id) ? ', porque o prédio é de uma época antiga' : building?.type ? `, porque o prédio é ${building.type.name.toLowerCase()}` : '';
  proposal.report.reasons.push(`Entorno ${definition.name.toLowerCase()}${why}: terreno de ${(lot.x1 - lot.x0).toFixed(0)} × ${(lot.z1 - lot.z0).toFixed(0)} m.`);
  if (entrance) proposal.report.reasons.push(`A frente é o lado da porta ${entrance.name.toLowerCase()}; ${open ? 'a trilha sai dela' : 'o portão fica diante dela e o caminho leva até ela'}.`); else proposal.report.conflicts.push('O prédio não tem porta externa; a frente foi escolhida por conta própria.');
  if (driveway) proposal.report.reasons.push('A garagem dá para a frente, então há entrada de veículos e um segundo portão.');
  if (counts.size) proposal.report.reasons.push([...counts].map(([name, count]) => `${count} × ${name.toLowerCase()}`).join(', ') + '.');
  if (outsiders.length || mine.length) proposal.report.reasons.push(`${outsiders.length + mine.length === 1 ? 'O objeto que você tinha do lado de fora ficou' : `Os ${new Set([...outsiders, ...mine]).size} objetos que você tinha do lado de fora ficaram`} onde estava${outsiders.length + mine.length === 1 ? '' : 'm'}; o entorno contorna.`);
  if (previous.length) proposal.report.reasons.push('O entorno anterior foi substituído.');
  return proposal;
}
