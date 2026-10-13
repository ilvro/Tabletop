import { createEntity, id } from '../domain/documents.js';
import { quaternionFromYaw, rotateXZ, yawFromQuaternion } from '../domain/coords.js';
import { worldFootprint, footprintsOverlap, pointInPolygon, isLocked, worldPoint } from '../domain/geometry.js';
import { ValidationError, validateDocument } from '../domain/validation.js';
import { illuminationDefaults } from '../domain/dynamic-lighting.js';
import { ENVIRONMENTS } from '../domain/environments.js';
import { ROOM_RECIPES } from '../domain/room-recipes.js';
import { roomFrame, candidates, stableRandom, wallSocket } from './room-layout.js';
import { scopeFor, doorZones, AMBIENCE_TAG } from './furnishing.js';
import { roomContents, describeRoom, roomEra } from './room-insight.js';
import { eraAsset, beforeElectricity } from '../domain/room-eras.js';
import { WEAR_TAG } from './room-state.js';

/** Fixtures the assistant hung, and objects of the person it switched on; both are redone on the next pass. */
export const FIXTURE_TAG = 'luminária-assistida', LIT_TAG = 'luz-assistida';
export const ROOM_MOODS = [
  { id: 'auto', name: 'Automática', description: 'Escolhida pelo tipo e pelo estado do cômodo.' },
  { id: 'warm', name: 'Aconchegante', description: 'Luminárias quentes; abajures e velas acesos.', environment: 'tavern' },
  { id: 'cold', name: 'Fria e clara', description: 'Fluorescentes no teto, luz de trabalho.', environment: 'office' },
  { id: 'dim', name: 'Penumbra', description: 'Poucas fontes, fracas e tremulando.', environment: 'moonlight' },
  { id: 'harsh', name: 'Foco duro', description: 'Uma luz fria sobre a cena; o resto apagado.', environment: 'moonlight' },
  { id: 'candles', name: 'Só chamas', description: 'Velas, lampiões e lareira; lâmpadas apagadas.', environment: 'ritual' },
];
// What each luminous object is, so it lights the way it looks.
const SOURCES = {
  lamp: ['lamp', 1], 'house-ceiling-lamp': ['lamp', .8], streetlamp: ['lamp', 1.2], chandelier: ['candle', 3], 'kerosene-lantern': ['candle', 1.4], candles: ['candle', 1], 'church-candelabra': ['candle', 1.8],
  'ritual-candelabra': ['candle', 1.6], 'future-ceiling-lamp': ['fluorescent', .45], 'future-light-column': ['fluorescent', .5], 'future-lamp-post': ['fluorescent', .7], 'medieval-wall-torch': ['torch', .7], 'medieval-brazier': ['torch', .9], 'medieval-candle-stand': ['candle', 2.4], 'medieval-hearth': ['torch', 1.1], 'medieval-forge': ['torch', 1.2], 'medieval-cauldron': ['torch', .6], fireplace: ['torch', 1], campfire: ['torch', 1], 'backrooms-fluorescent': ['fluorescent', 1], 'surgical-lamp': ['fluorescent', .9], 'mountain-wall-lantern': ['candle', 1.5], 'mountain-round-lantern': ['candle', 1.5], 'mountain-lantern-post': ['candle', 1.6],
};
const SOURCES_PER_ROOM = 4;
const SCREENS = ['crt-tv', 'computer', 'surveillance-monitor', 'arcade-cabinet', 'laptop', 'future-console', 'future-wall-screen', 'future-terminal', 'future-holo-table', 'future-server', 'future-reactor'], FLAMES = ['candle', 'torch'];
const WARM_ROOMS = ['Casa', 'Religioso e paranormal'], WARM_IDS = ['library', 'bar'];
const short = entity => (entity.assetRef?.id ?? '').replace('builtin-', '');

/** The light a room asks for, read from the state it was left in and from what kind of room it is. */
export function roomMood(document, floorId, catalog = []) {
  const { floor, standing, resting } = roomContents(document, floorId), dressing = [...standing, ...resting].filter(e => e.tags?.includes(AMBIENCE_TAG)).map(short);
  const pick = (mood, reason) => ({ ...ROOM_MOODS.find(entry => entry.id === mood), reason });
  if (dressing.includes('ritual-circle')) return pick('candles', 'há um ritual montado');
  if (dressing.includes('blood-pool') || dressing.includes('body-bag')) return pick('harsh', 'é uma cena de crime');
  if (floor.tags?.includes(WEAR_TAG) && floor.material?.wear?.type === 'grime') return pick('dim', 'o lugar está abandonado');
  if (roomEra(document, floorId) === 'future') return pick('cold', 'o lugar é futurista');
  if (beforeElectricity(roomEra(document, floorId))) return pick('candles', 'o lugar é de uma época sem eletricidade');
  const kind = describeRoom(document, floorId, catalog)?.inferred[0], recipe = ROOM_RECIPES.find(entry => entry.id === kind?.id);
  if (!recipe) return pick('warm', 'ainda não há um tipo de cômodo definido');
  return WARM_ROOMS.includes(recipe.group) || WARM_IDS.includes(recipe.id) ? pick('warm', `é ${recipe.name.toLowerCase()}`) : pick('cold', `é ${recipe.name.toLowerCase()}`);
}
/** A scene atmosphere that goes with the room, unless the scene already uses it. */
export function suggestAtmosphere(document, floorId, catalog = []) {
  const mood = roomMood(document, floorId, catalog), preset = ENVIRONMENTS.find(entry => entry.id === mood.environment);
  return !preset || document.sourceEnvironment?.id === preset.id ? null : { id: preset.id, name: preset.name, reason: mood.reason };
}

function setup(document, floorId, catalog) {
  validateDocument(document);
  const { floor, area, newArea } = scopeFor(document, floorId);
  if (isLocked(document, floor)) throw new ValidationError('O piso ou sua pasta está bloqueado.');
  const frame = roomFrame(document, floor, area), contents = roomContents(document, floor.id);
  const toWorld = (x, z, height = 0) => rotateXZ([x, height, z], frame.yaw).map((v, i) => v + area.transform.position[i]);
  const inside = position => pointInPolygon(frame.toLocal(position), frame.contour);
  const era = roomEra(document, floorId);
  return { floor, area, newArea, frame, contents, toWorld, inside, era, assetOf: entity => catalog.find(a => a.id === entity.assetRef?.id), named: name => { const model = eraAsset(era, name, catalog); return model && catalog.find(a => a.id === `builtin-${model}`); } };
}
const blank = (label, expectedEditVersion, room) => ({ id: id(), expectedEditVersion, label, entities: [], groups: [], areas: room.newArea ? [room.area] : [], lights: [], updates: [], removals: [], report: { kept: [], suppressed: [], omissions: [], conflicts: [], reasons: [] } });

/**
 * Lights a room through its own objects. Lamps, candles, screens and fireplaces
 * the person placed are switched on according to the mood; ceiling fixtures are
 * hung only where those are not enough, and the bare light points a quick room
 * comes with give way to them.
 */
export function proposeRoomLighting(document, { floorId, mood = 'auto', sources = SOURCES_PER_ROOM, fixtures = Infinity, era = null } = {}, expectedEditVersion = 0, catalog = []) {
  const room = setup(document, floorId, catalog), { floor, area, frame, contents, toWorld, assetOf, named } = room;
  if (era) room.era = era;   // a corridor has no recipe to say which era its building is
  let chosen = mood === 'auto' ? roomMood(document, floor.id, catalog) : ROOM_MOODS.find(entry => entry.id === mood);
  if (mood === 'auto' && beforeElectricity(room.era) && ['warm', 'cold'].includes(chosen.id)) chosen = { ...ROOM_MOODS.find(entry => entry.id === 'candles'), reason: 'o lugar é de uma época sem eletricidade' };
  if (!chosen) throw new ValidationError('Clima de luz inválido.');
  const proposal = blank(`Iluminar: ${chosen.name.toLowerCase()}`, expectedEditVersion, room), look = document.look ?? document.defaultLook, entities = Object.values(document.layout.entities);
  // Previous pass: fixtures leave, objects it switched on are reconsidered.
  for (const fixture of entities.filter(e => e.kind === 'prop' && e.tags?.includes(FIXTURE_TAG) && room.inside(e.transform.position))) { if (isLocked(document, fixture)) proposal.report.kept.push(fixture.id); else proposal.removals.push({ kind: 'entity', id: fixture.id }); }
  const gone = new Set(proposal.removals.map(op => op.id));
  for (const light of Object.values(look.lights).filter(l => l.surfaceId === floor.id && l.type === 'point' && l.name.startsWith('Luz — ') && !l.locked)) proposal.removals.push({ kind: 'light', id: light.id });
  const objects = [...contents.standing, ...contents.resting].filter(e => !gone.has(e.id) && assetOf(e) && !isLocked(document, e));
  const height = Math.max(2.4, ...contents.walls.map(wall => wall.height)), areaSize = area.width * area.length;
  const lit = (entity, profile, strength, extra = {}) => {
    const base = illuminationDefaults(profile, entity), top = assetOf(entity)?.bounds[1] ?? 1;
    return { ...base, intensity: Math.round(base.intensity * strength), position: [0, Number((top * .85).toFixed(3)), 0], ...extra };
  };
  let on = 0, off = 0, strong = 0;
  const wanted = [], untag = entity => (entity.tags ?? []).filter(tag => tag !== LIT_TAG);
  for (const entity of objects) {
    if (entity.illumination && !entity.tags?.includes(LIT_TAG)) { if (entity.illumination.enabled !== false) strong += entity.illumination.intensity >= 40 ? 1 : 0; continue; }
    const source = SOURCES[short(entity)], screen = SCREENS.includes(short(entity));
    let light = null;
    if (short(entity) === 'ritual-circle' && chosen.id === 'candles') light = { ...illuminationDefaults('ritual', entity), intensity: 42, distance: 8, position: [0, .6, 0], priority: 30 }; // glows red from the floor; first in line for the scene's lights
    else if (screen && chosen.id !== 'candles') light = lit(entity, 'lamp', .16, { color: '#9cc3ff', distance: 3.5, priority: 2 });
    else if (source) {
      const [profile, strength] = source, flame = FLAMES.includes(profile);
      if (chosen.id === 'warm' || chosen.id === 'cold') light = lit(entity, profile, strength);
      else if (chosen.id === 'dim') light = lit(entity, profile, strength * .45, { flicker: { ...illuminationDefaults(profile, entity).flicker, enabled: true, amplitude: .28 } });
      else if (chosen.id === 'candles' && flame) light = lit(entity, profile, strength * 1.7);
      else if (chosen.id === 'harsh' && flame) light = lit(entity, profile, strength * .6);
    }
    if (light) wanted.push({ entity, light }); else if (entity.tags?.includes(LIT_TAG)) { proposal.updates.push({ kind: 'entity', id: entity.id, patch: { illumination: null, tags: untag(entity) } }); off++; }
  }
  // A scene has few real lights to spend: each room lights its strongest sources and the rest stay as objects.
  wanted.sort((a, b) => b.light.intensity - a.light.intensity);
  wanted.forEach(({ entity, light }, i) => {
    if (i < sources) { proposal.updates.push({ kind: 'entity', id: entity.id, patch: { illumination: light, tags: [...untag(entity), LIT_TAG] } }); on++; if (light.intensity >= 40) strong++; }
    else if (entity.tags?.includes(LIT_TAG)) { proposal.updates.push({ kind: 'entity', id: entity.id, patch: { illumination: null, tags: untag(entity) } }); off++; }
  });
  if (wanted.length > sources) proposal.report.reasons.push(`${wanted.length - sources} fontes menores ficam só como objeto, para não esgotar as luzes da cena.`);
  let hung = 0;
  const hang = (model, x, z, light) => {
    // The fixture of the era: a chandelier where there is no electricity, a light panel in the future.
    const asset = catalog.find(a => a.id === `builtin-${eraAsset(room.era, model, catalog) ?? model}`); if (!asset || !room.inside(toWorld(x, z))) return;
    proposal.entities.push(createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, position: toWorld(x, z, height - asset.bounds[1] - .04), rotation: quaternionFromYaw(frame.yaw), footprint: asset.footprint, groupId: area.groupId ?? floor.groupId ?? null, levelId: floor.levelId ?? null, layerId: floor.layerId ?? null, tags: [FIXTURE_TAG], illumination: light })); hung++;
  };
  const spread = (wanted, place) => { const count = Math.min(wanted, fixtures), nx = Math.max(1, Math.round(Math.sqrt(count * area.width / area.length))), nz = Math.max(1, Math.ceil(count / nx)); for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) place(area.width * ((x + .5) / nx - .5), area.length * ((z + .5) / nz - .5)); };
  const ceiling = (profile, strength, extra) => ({ ...illuminationDefaults(profile, {}), type: 'point', intensity: Math.round(illuminationDefaults(profile, {}).intensity * strength), position: [0, -.05, 0], priority: 20, ...extra });
  if (chosen.id === 'warm') { const need = Math.max(0, Math.ceil(areaSize / 14) - strong); if (need) spread(need, (x, z) => hang('house-ceiling-lamp', x, z, ceiling('lamp', .7))); }
  else if (chosen.id === 'cold') spread(Math.max(1, Math.ceil(areaSize / 20)), (x, z) => hang('backrooms-fluorescent', x, z, ceiling('fluorescent', .3)));
  else if (chosen.id === 'dim' && !on) hang('house-ceiling-lamp', 0, 0, ceiling('lamp', .35, { flicker: { ...illuminationDefaults('fluorescent', {}).flicker, enabled: true, amplitude: .35 } }));
  // Where flames are the only light and none is strong enough, a chandelier of candles hangs from the ceiling.
  else if (chosen.id === 'candles' && beforeElectricity(room.era) && !strong) hang('chandelier', 0, 0, ceiling('candle', 3.2, { flicker: { ...illuminationDefaults('candle', {}).flicker, enabled: true } }));
  else if (chosen.id === 'harsh') {
    // Over the scene if there is one, else over the middle of the room.
    const scene = objects.find(e => ['blood-pool', 'body-bag', 'autopsy-table'].includes(short(e))), [x, z] = scene ? frame.toLocal(scene.transform.position) : [0, 0];
    hang('backrooms-fluorescent', x, z, ceiling('fluorescent', .7));
  }
  const say = (count, one, many) => { if (count) proposal.report.reasons.push(count === 1 ? one : many.replace('#', count)); };
  proposal.report.reasons.push(`Luz ${chosen.name.toLowerCase()}${chosen.reason ? `, porque ${chosen.reason}` : ''}.`);
  say(on, 'Um objeto seu passa a iluminar.', '# objetos seus passam a iluminar.'); say(off, 'Um objeto é apagado.', '# objetos são apagados.');
  say(hung, 'Uma luminária é pendurada no teto.', '# luminárias são penduradas no teto.');
  say(proposal.removals.filter(op => op.kind === 'light').length, 'O ponto de luz solto do cômodo sai.', 'Os # pontos de luz soltos do cômodo saem.');
  if (!proposal.entities.length && !proposal.updates.length && !proposal.removals.length) throw new ValidationError('Não há fontes de luz para acender neste cômodo com este clima. Coloque velas, um abajur ou escolha outro clima.');
  return proposal;
}

// Which small things recipes put on which furniture: the assistant learns pairs, not layouts.
const PAIRS = new Map();
for (const recipe of ROOM_RECIPES) for (const item of recipe.items.filter(entry => entry.at === 'on')) {
  const host = recipe.items.find(entry => entry.slot === item.of || entry.slot === item.of.replace(/\.\d+$/, ''));
  if (host) PAIRS.set(host.asset, [...new Set([...(PAIRS.get(host.asset) ?? []), item.asset])]);
}
const WALL_PIECE = { classroom: 'chalkboard', office: 'evidence-board', investigation: 'evidence-board', meeting: 'evidence-board', interrogation: 'mirror', archive: 'evidence-board', reception: 'evidence-board', storage: 'power-panel', workshop: 'power-panel', surveillance: 'power-panel', garage: 'power-panel', lab: 'power-panel' };
const CORNER_PIECE = { 'Indústria': 'barrel', 'Religioso e paranormal': 'church-candelabra' }, RUG_HOSTS = ['coffee-table', 'dining-table', 'sofa', 'single-bed', 'desk'];

/**
 * Finishing touches read from the room: curtains on its windows, a rug under
 * the main furniture, something on the bare walls, corners and table tops.
 * It only adds what is not there yet, so running it twice changes nothing.
 */
export function proposeRoomDetails(document, { floorId, amount = .6, seed = 1 } = {}, expectedEditVersion = 0, catalog = []) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1 || !Number.isInteger(seed) || seed < 0) throw new ValidationError('Parâmetros de detalhes inválidos.');
  const room = setup(document, floorId, catalog), { floor, area, frame, contents, toWorld, assetOf, named } = room, yaw = frame.yaw;
  const proposal = blank('Detalhes do cômodo', expectedEditVersion, room), entities = Object.values(document.layout.entities);
  const kind = describeRoom(document, floor.id, catalog)?.inferred[0], recipe = ROOM_RECIPES.find(entry => entry.id === kind?.id);
  const furniture = contents.standing.filter(assetOf), solid = furniture.filter(e => assetOf(e).bounds[1] > .05), wallIds = new Set(contents.walls.map(wall => wall.id));
  const hanging = entities.filter(e => e.kind === 'prop' && wallIds.has(e.anchor?.hostId)), occupied = solid.map(e => worldFootprint(e, .06)), reserved = doorZones(document, floor);
  const within = corners => corners.every(point => pointInPolygon(frame.toLocal([point[0], 0, point[1]]), frame.contour));
  const common = asset => ({ name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint, groupId: area.groupId ?? floor.groupId ?? null, levelId: floor.levelId ?? null, layerId: floor.layerId ?? null });
  const pose = entity => { const asset = assetOf(entity), [x, z] = frame.toLocal(entity.transform.position); return { id: entity.id, x, z, rotation: yawFromQuaternion(entity.transform.rotation) - yaw, width: asset.footprint[0] * entity.transform.scale[0], depth: asset.footprint[1] * entity.transform.scale[2], top: entity.transform.position[1] - area.transform.position[1] + (asset.supportHeight ?? 0) * entity.transform.scale[1] }; };
  const placed = new Map(), counts = { curtains: 0, rug: 0, wall: 0, corner: 0, top: 0 };
  // Curtains hang over every window of the room that has none.
  const curtain = named('house-curtain');
  for (const window of entities.filter(e => e.kind === 'window' && wallIds.has(e.wallId))) {
    const wall = document.layout.entities[window.wallId], centre = area.transform.position.map((v, i) => v - wall.transform.position[i]), side = rotateXZ(centre, -yawFromQuaternion(wall.transform.rotation))[2] < 0 ? -1 : 1;
    if (!curtain || hanging.some(e => e.anchor.hostId === wall.id && Math.abs(e.anchor.offset[0] - window.offset) < window.width / 2 + .3)) continue;
    const lift = Math.max(0, Math.min(wall.height - curtain.bounds[1], window.sill + window.height + .12 - curtain.bounds[1])), socket = wallSocket(wall, worldPoint(wall, [window.offset, lift, side * (wall.thickness / 2 + curtain.footprint[1] / 2 + .02)]), lift);
    proposal.entities.push(createEntity('prop', { ...common(curtain), position: socket.position, rotation: socket.rotation, anchor: socket.anchor, tags: ['detalhe'] })); counts.curtains++;
  }
  const add = (key, model, rule, { takesSpace = true } = {}) => {
    const asset = named(model); if (!asset) return false;
    for (const candidate of candidates(rule, { frame, placed, seed, slot: `detail/${key}`, asset })) {
      const socket = rule.lift && candidate.wall ? wallSocket(candidate.wall, toWorld(candidate.x, candidate.z, rule.lift), rule.lift) : null;
      const entity = createEntity('prop', { ...common(asset), position: socket?.position ?? toWorld(candidate.x, candidate.z, candidate.on ? candidate.on.top : 0), rotation: socket?.rotation ?? quaternionFromYaw(yaw + candidate.rotation), surfaceId: socket ? null : candidate.on?.id ?? floor.id, tags: ['detalhe'], ...(socket ? { anchor: socket.anchor } : {}), ...(asset.supportHeight ? { supportHeight: asset.supportHeight } : {}) });
      const corners = worldFootprint(entity, takesSpace ? .06 : 0);
      if (!candidate.on && !socket && (!within(worldFootprint(entity)) || takesSpace && (reserved.some(zone => footprintsOverlap(corners, zone)) || occupied.some(other => footprintsOverlap(corners, other))))) continue;
      if (rule.lift && !socket) continue;
      proposal.entities.push(entity); if (takesSpace && !candidate.on && !socket) occupied.push(corners);
      return true;
    }
    return false;
  };
  // A rug goes under the piece a room gathers around.
  const rugHost = RUG_HOSTS.map(model => furniture.find(e => short(e) === model)).find(Boolean);
  if (rugHost && amount > .25 && !furniture.some(e => short(e) === 'rug')) { placed.set('rug.host', pose(rugHost)); if (add('rug', 'rug', { at: 'under', of: 'rug.host' }, { takesSpace: false })) counts.rug++; }
  // Bare walls get what that kind of room hangs on them.
  const wallPiece = WALL_PIECE[recipe?.id] ?? 'mirror';
  for (let i = hanging.length + counts.curtains; i < Math.round(amount * 2) && contents.walls.length; i++) if (add(`wall.${i}`, wallPiece, { at: 'wall', prefer: 'long', lift: 1.1 }, { takesSpace: false })) counts.wall++;
  const cornerPiece = CORNER_PIECE[recipe?.group] ?? 'house-plant';
  for (let i = furniture.filter(e => short(e) === cornerPiece).length; i < Math.round(amount * 2); i++) if (add(`corner.${i}`, cornerPiece, { at: 'corner' })) counts.corner++;
  // Empty table tops get the things recipes usually pair with that furniture.
  const tops = furniture.filter(e => assetOf(e).supportHeight > 0 && assetOf(e).bounds[1] > .3 && PAIRS.has(short(e)) && !contents.resting.some(r => r.surfaceId === e.id));
  tops.slice(0, Math.round(1 + amount * 4)).forEach((entity, i) => {
    const options = PAIRS.get(short(entity)), key = `top.${i}`; placed.set(key, pose(entity));
    if (add(`on.${i}`, options[Math.floor(stableRandom(seed, `detail/${entity.id}`) * 7919 % 1 * options.length)], { at: 'on', of: key, u: stableRandom(seed, `u/${entity.id}`) * 7919 % 1 * 1.4 - .7 })) counts.top++;
  });
  const say = (count, one, many) => { if (count) proposal.report.reasons.push(count === 1 ? one : many.replace('#', count)); };
  say(counts.curtains, 'Cortina na janela.', 'Cortinas nas # janelas.'); say(counts.rug, `Tapete sob ${rugHost?.name.toLowerCase()}.`, '');
  say(counts.wall, 'Uma peça numa parede vazia.', '# peças nas paredes vazias.'); say(counts.corner, 'Um canto preenchido.', '# cantos preenchidos.'); say(counts.top, 'Um objeto sobre um móvel vazio.', '# objetos sobre móveis vazios.');
  if (!proposal.entities.length) throw new ValidationError('Este cômodo já tem os detalhes que o assistente sabe sugerir.');
  return proposal;
}
