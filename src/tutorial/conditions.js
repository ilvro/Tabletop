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
};
/** A step's `done` is `['name', ...args]`, or a list of them that must all hold. */
export function met(done, state) {
  if (!done) return false;
  if (Array.isArray(done[0])) return done.every(entry => met(entry, state));
  const [name, ...args] = done, check = CONDITIONS[name];
  if (!check) throw new Error(`Condição de tutorial desconhecida: ${name}`);
  return Boolean(check(state, ...args));
}
