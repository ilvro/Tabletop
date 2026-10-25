import { areaTouches } from '../domain/areas.js';

/**
 * Named checks a lesson step can wait for. Each reads the state of the scene
 * and of the editor, never which button was pressed: a step is done when its
 * result exists, by whatever path the person got there.
 *
 * `state` is `{ document, tab, sections, proposal, assetsOpen, placing, placingKind, selected, tool,
 * topView, canRedo, presenting, saved, assistant, room, copied, surface, picked, selectedId }`,
 * where `assistant` is what the room assistant currently reads and is set to, `room` the measures
 * and options of the Sala task, `copied` the name of the piece a waiting material came from and `surface` the
 * support new pieces are placed on, `picked` the model of the selected piece and `selectedId` the selected piece.
 */
const entities = state => Object.values(state.document.layout.entities);
const count = (state, kind) => entities(state).filter(entity => entity.kind === kind).length;
const models = (state, id) => entities(state).filter(entity => entity.assetRef?.id === id);
const look = state => state.document.look ?? state.document.defaultLook;
/** The lights placed by hand (Luz pontual, Luz spot), without the sun or moon. */
const lamps = state => Object.values(look(state).lights ?? {}).filter(light => light.role !== 'key');
/** A value at a dotted path ('material.wear.amount'); 'yaw' is the turn about the vertical, in degrees. */
const valueAt = (record, path) => path === 'yaw' ? Math.round(2 * Math.atan2(record.transform.rotation[1], record.transform.rotation[3]) * 180 / Math.PI) : path.split('.').reduce((value, key) => value?.[key], record);
/** Numbers match to about 2 %, colours and words ignoring case, angles a full turn apart. */
const same = (value, wanted) => typeof wanted === 'number' ? typeof value === 'number' && [0, 360, -360].some(turn => Math.abs(value + turn - wanted) <= Math.max(.011, Math.abs(wanted) * .02)) : String(value).toLowerCase() === String(wanted).toLowerCase();
const matches = (entity, which) => entity.assetRef?.id === which || entity.kind === which;
/** Within `tolerance` metres of `point`; an axis given as null is not checked. */
const closeTo = (position, point, tolerance) => Math.hypot(...point.map((value, axis) => value === null ? 0 : position[axis] - value)) <= tolerance;
const yawOf = entity => 2 * Math.atan2(entity.transform.rotation[1], entity.transform.rotation[3]) * 180 / Math.PI;
const hsv = hex => {
  const [r, g, b] = [1, 3, 5].map(start => parseInt(String(hex).slice(start, start + 2), 16) / 255), max = Math.max(r, g, b), range = max - Math.min(r, g, b);
  const hue = !range ? 0 : max === r ? ((g - b) / range + 6) % 6 : max === g ? (b - r) / range + 2 : (r - g) / range + 4;
  return { hue: hue * 60, saturation: max ? range / max : 0, value: max };
};
/**
 * A colour picked by eye counts when it is the same kind of colour: greys by how light they are,
 * the rest by hue (within 25°), saturation and lightness. Nobody hits #5a5d60 with a picker.
 */
export function colourNear(colour, wanted) {
  if (!/^#[0-9a-f]{6}$/i.test(colour ?? '')) return false;
  const a = hsv(colour), b = hsv(wanted), hue = Math.abs(a.hue - b.hue);
  if (b.saturation < .15 || b.value < .12) return Math.abs(a.value - b.value) <= .14 && a.saturation <= Math.max(.25, b.saturation + .15);
  return Math.min(hue, 360 - hue) <= 25 && Math.abs(a.saturation - b.saturation) <= .35 && Math.abs(a.value - b.value) <= .3;
}
const moon = state => Object.values(look(state).lights ?? {}).find(light => light.role === 'key' && light.type === 'directional');
export const CONDITIONS = {
  /** Always true: an explanation the person leaves with "Continuar". */
  read: () => false,
  tab: (state, name) => state.tab === name,
  taskOpen: (state, key) => state.tab === 'build' && state.sections.includes(key),
  previewOpen: state => state.proposal,
  previewClosed: state => !state.proposal,
  assetsOpen: state => state.assetsOpen,
  assetListed: (state, id) => state.listedAssets.includes(id),
  placingAsset: (state, id) => state.placing === id || entities(state).some(entity => entity.assetRef?.id === id),
  hasAsset: (state, id) => entities(state).some(entity => entity.assetRef?.id === id),
  atLeast: (state, kind, number) => count(state, kind) >= number,
  hasTag: (state, tag) => entities(state).some(entity => entity.tags?.includes(tag)),
  furnished: state => Object.keys(state.document.layout.compositions ?? {}).length > 0,
  litObject: (state, number = 1) => entities(state).filter(entity => entity.illumination?.enabled).length >= number,
  roomSeenAs: (state, template) => state.assistant.inferred === template,
  assistantState: (state, id) => state.assistant.state === id,
  buildingMode: (state, mode) => state.assistant.buildingMode === mode,
  /** What is selected, by kind: 'floor', 'wall', 'prop'… */
  selected: (state, kind) => state.selected === kind,
  /** An object of this model was turned from the way it arrives. */
  turned: (state, id) => entities(state).some(entity => entity.assetRef?.id === id && Math.abs(entity.transform.rotation[3]) < .999),
  tool: (state, name) => state.tool === name,
  view: (state, name) => (state.topView ? 'top' : 'perspective') === name,
  undone: state => state.canRedo,
  redone: state => !state.canRedo,
  environment: (state, id) => state.document.sourceEnvironment?.id === id,
  placingToken: state => state.placingKind === 'token' || Object.keys(state.document.tokens ?? {}).length > 0,
  tokens: (state, number) => Object.keys(state.document.tokens ?? {}).length >= number,
  cameras: (state, number) => Object.keys(state.document.cameraPresets ?? {}).length >= number,
  /** A screen is lit on some object, and what it writes. */
  screenLit: state => entities(state).some(entity => entity.screen?.enabled),
  /** Something is held up to the camera (or, with false, was put back). */
  inspecting: (state, on = true) => Boolean(state.inspecting) === on,
  inspectText: (state, text) => entities(state).some(entity => entity.inspectable?.pages.some(page => [page.text, page.back?.text].some(value => value?.includes(text)))),
  screenText: (state, text) => entities(state).some(entity => entity.screen?.lines.some(line => line.text.includes(text))),
  /** At least `number` decals, of a kind if one is named. */
  decals: (state, number, kind) => entities(state).filter(entity => entity.decal && (!kind || entity.decal.kind === kind)).length >= number,
  decalText: (state, text) => entities(state).some(entity => entity.decal?.text.includes(text)),
  hazardOn: state => entities(state).some(entity => entity.material?.texture === 'hazard'),
  wetFloor: state => entities(state).some(entity => entity.kind === 'floor' && entity.material?.wet?.enabled),
  rendering: (state, key) => Boolean((state.document.look ?? state.document.defaultLook).rendering?.[key]),
  bloomOn: state => Boolean((state.document.look ?? state.document.defaultLook).bloom?.enabled),
  bloomStreak: state => ((state.document.look ?? state.document.defaultLook).bloom?.streak ?? 0) > 0,
  effectType: (state, type) => entities(state).some(entity => entity.localEffect?.enabled && entity.localEffect.type === type),
  presenting: (state, on = true) => state.presenting === on,
  saved: state => state.saved,
  atelieAvailable: state => Boolean(state.atelie?.available),
  designUsed: state => entities(state).some(entity => entity.inspectable?.pages.some(page => page.design || page.back?.design)),

  /** The Sala task is set to this measure or option, before the room exists. */
  roomOption: (state, key, value) => state.room?.[key] === value,
  gridHidden: state => state.document.layout.grid?.visible === false,
  /** At least `number` pieces of a kind wear this texture ('concrete', 'brick'…). */
  textured: (state, kind, texture, number = 1) => entities(state).filter(entity => entity.kind === kind && entity.material?.texture === texture).length >= number,
  worn: (state, kind, type) => entities(state).some(entity => entity.kind === kind && entity.material?.wear?.type === type),
  /** A material waits to be pasted, copied from a piece whose name starts with `from` when one is given. */
  materialCopied: (state, from) => Boolean(state.copied) && (!from || state.copied.startsWith(from)),
  copies: (state, id, number) => models(state, id).length >= number,
  /** An object of this model stands at least this high (Posição Y) or is stretched this much (Escala Y). */
  raised: (state, id, height) => models(state, id).some(entity => entity.transform.position[1] >= height),
  stretched: (state, id, factor) => models(state, id).some(entity => (entity.transform.scale?.[1] ?? 1) >= factor),
  /** A floor raised to this height (a platform, a mezzanine), centred near `x` when one is given, or of this size. */
  floorAt: (state, height, x) => entities(state).some(entity => entity.kind === 'floor' && entity.transform.position[1] >= height && (x === undefined || Math.abs(entity.transform.position[0] - x) < .3)),
  floorSize: (state, width, length) => entities(state).some(entity => entity.kind === 'floor' && Math.abs(entity.width - width) < .05 && Math.abs(entity.length - length) < .05),
  /** Stairs or a ramp climbing at least this much. */
  climbs: (state, height) => entities(state).some(entity => ['stairs', 'ramp'].includes(entity.kind) && entity.height >= height),
  placingKind: (state, kind) => state.placingKind === kind,
  /** New pieces land on a support at most this high: the ground floor rather than a platform. */
  supportAt: (state, height) => (state.document.layout.entities[state.surface]?.transform.position[1] ?? Infinity) <= height,
  /** New pieces land on a support at least this high: a platform or mezzanine. */
  supportAbove: (state, height) => (state.document.layout.entities[state.surface]?.transform.position[1] ?? -Infinity) >= height,
  /** An object lights its surroundings with this profile ('candle', 'ritual', 'fluorescent'…). */
  glowing: (state, profile) => entities(state).some(entity => entity.illumination?.enabled !== false && entity.illumination?.profile === profile),
  decalWide: (state, metres) => entities(state).some(entity => entity.decal && entity.decal.size[0] >= metres),
  screenProgress: state => entities(state).some(entity => entity.screen?.enabled && entity.screen.progress?.enabled),
  zoneOn: state => entities(state).some(entity => entity.lightingZone?.enabled),
  /** Hand-placed lights: how many, warmed by Kelvin, flickering (an object's own light counts too). */
  lamps: (state, number) => lamps(state).length >= number,
  placingLight: state => state.placingKind === 'light' || lamps(state).length > 0,
  kelvin: state => lamps(state).some(light => light.temperature != null),
  warmLight: (state, kelvin) => lamps(state).some(light => light.temperature != null && light.temperature <= kelvin),
  flickering: state => lamps(state).some(light => light.flicker?.enabled) || entities(state).some(entity => entity.illumination?.flicker?.enabled),
  /** The scene as a whole: sun or moon, the fill from everywhere, the time of day, the sky, the fog. */
  moonBelow: (state, intensity) => (moon(state)?.intensity ?? 0) <= intensity,
  fillBelow: (state, intensity) => look(state).fill.intensity <= intensity,
  phase: (state, id) => look(state).daylight?.phase === id,
  skyOff: state => look(state).sky?.enabled === false,
  volumeOn: state => Boolean(look(state).volumetricFog?.enabled),
  mood: (state, id) => state.assistant.mood === id,
  /** The selected piece is of this model. */
  picked: (state, id) => state.picked === id,
  /** Some piece, by model or kind, stands near a point: what a person reaches by dragging it with Mover (G). */
  near: (state, which, point, tolerance = .4) => entities(state).some(entity => matches(entity, which) && entity.transform && closeTo(entity.transform.position, point, tolerance)),
  /** Turned about the vertical to roughly this angle, as with Girar (R). */
  facing: (state, which, degrees, tolerance = 15) => entities(state).some(entity => matches(entity, which) && entity.transform && [0, 360, -360].some(turn => Math.abs(yawOf(entity) + turn - degrees) <= tolerance)),
  /** Stretched to roughly these factors per axis (null: any), as with Escala (V). */
  scaledTo: (state, which, factors, tolerance = .12) => entities(state).some(entity => matches(entity, which) && factors.every((factor, axis) => factor === null || Math.abs((entity.transform?.scale?.[axis] ?? 1) - factor) <= factor * tolerance)),
  /** A colour of a piece, of the scene or of the moon, chosen close enough to the one asked (see colourNear). */
  colorNear: (state, which, path, hex) => entities(state).some(entity => matches(entity, which) && colourNear(valueAt(entity, path), hex)),
  lookColorNear: (state, path, hex) => colourNear(valueAt(look(state), path), hex),
  moonColorNear: (state, hex) => colourNear(moon(state)?.color, hex),
  /** The selected piece has this value, or stands near this point: tells copies of the same model apart. */
  selectedHas: (state, path, value) => Boolean(state.document.layout.entities[state.selectedId]) && same(valueAt(state.document.layout.entities[state.selectedId], path), value),
  selectedColorNear: (state, path, hex) => colourNear(valueAt(state.document.layout.entities[state.selectedId] ?? {}, path), hex),
  selectedSet: (state, path) => valueAt(state.document.layout.entities[state.selectedId] ?? {}, path) != null,
  selectedNear: (state, point, tolerance = .4) => Boolean(state.document.layout.entities[state.selectedId]?.transform) && closeTo(state.document.layout.entities[state.selectedId].transform.position, point, tolerance),
  gridSnapOff: state => state.document.layout.grid?.snap === false,
  /** Some piece, chosen by model ('builtin-…') or kind ('wall', 'floor'), has this value: ['has', 'wall', 'material.textureSize', 2.6]. */
  has: (state, which, path, value) => entities(state).some(entity => (entity.assetRef?.id === which || entity.kind === which) && same(valueAt(entity, path), value)),
  /** The look of the scene has this value: ['lookIs', 'bloom.threshold', 1.6]. */
  lookIs: (state, path, value) => same(valueAt(look(state), path), value),
  moonIs: (state, path, value) => same(valueAt(moon(state) ?? {}, path), value),

  /** Cinematography: the scene opened from the gallery, the live atmosphere window, the camera's focus and following. */
  sceneNamed: (state, prefix) => state.document.name.startsWith(prefix),
  documentsOpen: state => state.documentsOpen,
  ambienceOpen: (state, open = true) => state.ambience.open === open,
  ambienceDuration: (state, seconds) => state.ambience.duration === seconds,
  /** The sun or moon stands at most this many degrees above the horizon. */
  sunBelow: (state, degrees) => { const q = moon(state)?.rotation; if (!q) return false; const pitch = Math.asin(Math.max(-1, Math.min(1, 2 * (q[3] * q[0] - q[1] * q[2])))); return 90 - pitch * 180 / Math.PI <= degrees; },
  flashlightOn: state => Object.values(state.document.tokens ?? {}).some(token => token.flashlight?.enabled),
  /** Some token has this value: ['tokenHas', 'flashlight.pitch', 30]. */
  tokenHas: (state, path, value) => Object.values(state.document.tokens ?? {}).some(token => same(valueAt(token, path), value)),
  /** The working camera focuses on a token, with this much blur when a value is given. */
  cameraFocused: (state, aperture) => Boolean(state.camera?.focus?.enabled && state.camera.focus.targetId) && (aperture === undefined || same(state.camera.focus.aperture, aperture)),
  shotFocused: state => Object.values(state.document.cameraPresets ?? {}).some(camera => camera.focus?.enabled && camera.focus.targetId),
  following: state => Boolean(state.following),

  /** Organisation: the grid, floors (levels) and the one isolated in the editor. */
  gridIs: (state, key, value) => same(state.document.layout.grid?.[key], value),
  levels: (state, number) => Object.keys(state.document.layout.levels ?? {}).length >= number,
  levelAt: (state, height) => Object.values(state.document.layout.levels ?? {}).some(level => same(level.elevation, height)),
  isolated: (state, on = true) => Boolean(state.isolated) === on,
  /** A terrain whose relief was sculpted: some height off the flat. */
  sculpted: state => entities(state).some(entity => entity.kind === 'terrain' && (entity.heights ?? []).some(height => Math.abs(height) > .05)),
  /** Água e vegetação has a terrain chosen to plant on. */
  vegetationTerrain: state => Boolean(state.vegetationTerrain),
  environments: (state, number) => (state.environments ?? 0) >= number,
  weather: (state, type) => look(state).weather?.type === type,

  /** The session: the projector, what it shows, the live camera and the camera's tilt with the zoom. */
  projector: (state, on = true) => Boolean(state.projector) === on,
  rehearsed: state => Boolean(state.rehearsed),
  /** Something was published to the projector: the current camera or a shot. */
  published: state => Boolean(state.anyPublished),
  /** The shot on air, by the start of its name ('02'). */
  onAir: (state, prefix) => Boolean(state.published) && (state.document.cameraPresets?.[state.published]?.name ?? '').startsWith(prefix),
  titleIs: (state, text) => (state.titleText ?? '').trim() === text,
  roofs: (state, on = true) => Boolean(state.roofs) === on,
  /** A token is about to be placed with this name (and a colour of this family, when one is given). */
  placingTokenAs: (state, name, hex) => state.placingToken?.name === name && (!hex || colourNear(state.placingToken.color, hex)),
  /** The selected character, by name. */
  selectedNamed: (state, name) => state.selectedName === name,
  liveCamera: (state, on = true) => Boolean(state.live) === on,
  titleShown: state => (state.titles ?? 0) > 0,
  letterbox: (state, on = true) => Boolean(state.letterbox) === on,
  tactical: (state, on = true) => Boolean(state.tactical) === on,
  /** Combat: the turn order, values typed, the turn passed, areas drawn and who they touch, the highlight. */
  initiativeOn: (state, on = true) => Boolean(state.document.sessionState?.initiative) === on,
  initiativeValues: (state, number) => (state.document.sessionState?.initiative?.order ?? []).filter(entry => Number.isFinite(entry.value) && entry.value !== 0).length >= (number ?? Math.max(1, Object.keys(state.document.tokens ?? {}).length)),
  /** The turn reached this round, or this place in the order of the first round. */
  turnPassed: (state, round = 1, place = 1) => { const initiative = state.document.sessionState?.initiative; return Boolean(initiative) && (initiative.round > round || (initiative.round === round && initiative.current >= place)); },
  areas: (state, number = 1, shape) => (state.document.sessionState?.areas ?? []).filter(area => !shape || area.shape === shape).length >= number,
  /** At least this many tokens inside the areas on the floor (a token's base counts). */
  areaTouches: (state, number = 1) => Object.values(state.document.tokens ?? {}).filter(token => (state.document.sessionState?.areas ?? []).some(area => areaTouches(area, token.transform.position, .3))).length >= number,
  highlighted: state => (state.highlights ?? 0) > 0,
  /** Some character walks this many metres per turn. */
  speed: (state, metres) => Object.values(state.document.actors ?? {}).some(actor => same(actor.speed ?? 0, metres)),
  /** The character with this name stands near a point: dragged there with Mover (G), along its trail. */
  tokenNear: (state, name, point, tolerance = .5) => Object.values(state.document.tokens ?? {}).some(token => state.document.actors?.[token.actorId]?.name === name && closeTo(token.transform.position, point, tolerance)),
};
const metres = value => `${value < 1 ? `${Math.round(value * 100)} cm` : `${value.toFixed(1).replace('.', ',')} m`}`;
const tokenCount = state => Object.keys(state.document.tokens ?? {}).length;
/** Of the pieces a condition is about, the one the person is working on: the selected one, otherwise the closest to the goal. */
function nearest(state, which, distance) {
  const candidates = entities(state).filter(entity => matches(entity, which) && entity.transform);
  const selected = state.document.layout.entities[state.selectedId];
  if (selected && candidates.includes(selected)) return selected;
  return candidates.sort((a, b) => distance(a) - distance(b))[0] ?? null;
}
/** Which way the point lies as the camera sees it: right or left, away or closer, up or down, the strongest first. */
function direction(delta, camera) {
  const [dx, dy, dz] = delta, from = camera?.position, to = camera?.target;
  let forward = from && to ? [to[0] - from[0], to[2] - from[2]] : [0, -1];
  const size = Math.hypot(...forward) || 1; forward = forward.map(value => value / size);
  const right = [-forward[1], forward[0]], across = dx * right[0] + dz * right[1], along = dx * forward[0] + dz * forward[1];
  const parts = [[Math.abs(across), across > 0 ? 'para a direita' : 'para a esquerda'], [Math.abs(along), along > 0 ? 'para o fundo' : 'para perto da câmera'], [Math.abs(dy), dy > 0 ? 'para cima' : 'para baixo']];
  return parts.filter(([amount]) => amount >= .15).sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, words]) => words).join(' e ');
}
const counted = (have, need, noun) => ({ left: Math.max(0, need - have), text: `${Math.min(have, need)} de ${need} ${noun}` });
/**
 * How far a step still is from done, for the conditions a person reaches by degrees: dragging, turning,
 * stretching, picking a colour, placing several of something. Each returns `{ left, text }`, where `left`
 * falls to 0 as the person gets there (the card draws it as a bar) and `text` says what is missing.
 */
export const MEASURES = {
  near: (state, which, point, tolerance = .4) => {
    const gap = entity => Math.hypot(...point.map((value, axis) => value === null ? 0 : value - entity.transform.position[axis]));
    const entity = nearest(state, which, gap); if (!entity) return null;
    const delta = point.map((value, axis) => value === null ? 0 : value - entity.transform.position[axis]), left = Math.max(0, gap(entity) - tolerance);
    return { left, text: `Falta ${metres(gap(entity))}${direction(delta, state.camera) ? `, ${direction(delta, state.camera)}` : ''}.` };
  },
  selectedNear: (state, point, tolerance = .4) => {
    const entity = state.document.layout.entities[state.selectedId]; if (!entity?.transform) return null;
    return MEASURES.near({ ...state, document: { ...state.document, layout: { entities: { [entity.id ?? 'selected']: entity } } }, selectedId: entity.id ?? 'selected' }, entity.assetRef?.id ?? entity.kind, point, tolerance);
  },
  facing: (state, which, degrees, tolerance = 15) => {
    const off = entity => { const turn = ((degrees - yawOf(entity)) % 360 + 540) % 360 - 180; return turn; };
    const entity = nearest(state, which, entity => Math.abs(off(entity))); if (!entity) return null;
    const turn = off(entity);
    return { left: Math.max(0, Math.abs(turn) - tolerance), text: `Gire mais ${Math.round(Math.abs(turn))}° ${turn > 0 ? 'no sentido anti-horário' : 'no sentido horário'}.` };
  },
  scaledTo: (state, which, factors, tolerance = .12) => {
    const gaps = entity => factors.map((factor, axis) => factor === null ? 0 : factor - (entity.transform?.scale?.[axis] ?? 1));
    const entity = nearest(state, which, entity => Math.max(...gaps(entity).map(Math.abs))); if (!entity) return null;
    const all = gaps(entity), axis = all.reduce((best, value, index) => Math.abs(value) > Math.abs(all[best]) ? index : best, 0), gap = all[axis];
    const name = ['na largura', 'na altura', 'na profundidade'][axis];
    return { left: Math.max(0, Math.abs(gap) - factors[axis] * tolerance), text: `${gap > 0 ? 'Estique' : 'Encolha'} mais ${name}: está em ×${(entity.transform?.scale?.[axis] ?? 1).toFixed(2).replace('.', ',')}, o alvo é ×${String(factors[axis]).replace('.', ',')}.` };
  },
  colorNear: (state, which, path, hex) => {
    const entity = nearest(state, which, () => 0);
    return entity ? colourAdvice(valueAt(entity, path), hex) : null;
  },
  lookColorNear: (state, path, hex) => colourAdvice(valueAt(look(state), path), hex),
  moonColorNear: (state, hex) => colourAdvice(moon(state)?.color, hex),
  selectedColorNear: (state, path, hex) => colourAdvice(valueAt(state.document.layout.entities[state.selectedId] ?? {}, path), hex),
  tokenNear: (state, name, point, tolerance = .5) => {
    const token = Object.values(state.document.tokens ?? {}).find(entry => state.document.actors?.[entry.actorId]?.name === name); if (!token) return null;
    const delta = point.map((value, axis) => value === null ? 0 : value - token.transform.position[axis]), gap = Math.hypot(delta[0], delta[2]);
    return { left: Math.max(0, gap - tolerance), text: `Falta ${metres(gap)}${direction([delta[0], 0, delta[2]], state.camera) ? `, ${direction([delta[0], 0, delta[2]], state.camera)}` : ''}.` };
  },
  atLeast: (state, kind, number) => counted(count(state, kind), number, 'colocados'),
  copies: (state, id, number) => counted(models(state, id).length, number, 'colocados'),
  tokens: (state, number) => counted(tokenCount(state), number, 'tokens'),
  lamps: (state, number) => counted(lamps(state).length, number, 'luzes'),
  cameras: (state, number) => counted(Object.keys(state.document.cameraPresets ?? {}).length, number, 'enquadramentos'),
  initiativeValues: (state, number) => counted((state.document.sessionState?.initiative?.order ?? []).filter(entry => Number.isFinite(entry.value) && entry.value !== 0).length, number ?? Math.max(1, tokenCount(state)), 'valores'),
};
/** What to change in a colour to reach the family asked for: the hue first, then how light and how vivid. */
function colourAdvice(colour, wanted) {
  if (!/^#[0-9a-f]{6}$/i.test(colour ?? '')) return null;
  const a = hsv(colour), b = hsv(wanted), hue = Math.min(Math.abs(a.hue - b.hue), 360 - Math.abs(a.hue - b.hue)), grey = b.saturation < .15 || b.value < .12;
  const light = b.value - a.value, vivid = b.saturation - a.saturation;
  const left = grey ? Math.max(0, Math.abs(light) - .14) + Math.max(0, a.saturation - Math.max(.25, b.saturation + .15)) : Math.max(0, hue - 25) / 180 + Math.max(0, Math.abs(light) - .3) + Math.max(0, Math.abs(vivid) - .35);
  const text = !grey && hue > 25 ? 'O tom ainda é outro: procure a cor pedida na faixa de matizes.'
    : grey && a.saturation > Math.max(.25, b.saturation + .15) ? 'Tire a cor: o alvo é quase cinza.'
    : Math.abs(light) > (grey ? .14 : .3) ? `O tom está certo; falta ${light > 0 ? 'clarear' : 'escurecer'}.`
    : `O tom está certo; deixe a cor ${vivid > 0 ? 'mais viva' : 'mais apagada'}.`;
  return { left, text };
}
/** Of the conditions of a step that do not hold yet, the first one that can say how far it is. */
export function measure(done, state) {
  if (!done || done[0] === 'read') return null;
  for (const entry of Array.isArray(done[0]) ? done : [done]) {
    if (met(entry, state)) continue;
    const [name, ...args] = entry, gauge = MEASURES[name];
    return gauge ? gauge(state, ...args) : null;
  }
  return null;
}
/** A step's `done` is `['name', ...args]`, or a list of them that must all hold. */
export function met(done, state) {
  if (!done) return false;
  if (Array.isArray(done[0])) return done.every(entry => met(entry, state));
  const [name, ...args] = done, check = CONDITIONS[name];
  if (!check) throw new Error(`Condição de tutorial desconhecida: ${name}`);
  return Boolean(check(state, ...args));
}
