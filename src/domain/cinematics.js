import { ValidationError } from './validation.js';
import { FOG_DEFAULTS, VOLUME_DEFAULTS, BLOOM_DEFAULTS, DAYLIGHT_DEFAULTS, SKY_DEFAULTS, WEATHER_DEFAULTS } from './lighting.js';

/** A light carried by a character, pointing where the token faces (+Z), tilted down by `pitch` degrees. */
export const FLASHLIGHT_DEFAULTS = Object.freeze({ enabled: true, color: '#fff0d4', intensity: 60, distance: 16, angle: .38, penumbra: .55, pitch: 10, height: 1.05, shadow: true });
/** Depth of field of a shot: what is at `distance` (or at the target) is sharp, the rest blurs by `aperture` (0–1). */
export const FOCUS_DEFAULTS = Object.freeze({ enabled: false, targetId: null, distance: 6, aperture: .45 });
/** Slow movement on top of a shot: orbit (degrees/s), push (m/s towards the target) or handheld (amount 0–1). */
export const CAMERA_MOTIONS = ['none', 'orbit', 'push', 'handheld'];
export const MOTION_DEFAULTS = Object.freeze({ type: 'none', speed: .5 });
/** How far above a token's base the camera looks when it follows it. */
export const FOLLOW_HEIGHT = 1.1;

const fail = (condition, message, path) => { if (!condition) throw new ValidationError(message, path); };
const keys = (value, allowed, path) => { fail(value && typeof value === 'object' && !Array.isArray(value), 'Objeto inválido.', path); for (const key of Object.keys(value)) fail(allowed.includes(key), `Campo desconhecido: ${key}.`, `${path}.${key}`); };
const number = (value, path, min, max) => fail(Number.isFinite(value) && value >= min && value <= max, 'Número fora dos limites.', path);
const color = (value, path) => fail(typeof value === 'string' && /^#[a-fA-F0-9]{6}$/.test(value), 'Use uma cor hexadecimal #RRGGBB.', path);
const bool = (value, path) => fail(typeof value === 'boolean', 'Deve ser booleano.', path);

export function validateFlashlight(value, path = 'flashlight') {
  keys(value, Object.keys(FLASHLIGHT_DEFAULTS), path);
  bool(value.enabled, `${path}.enabled`); color(value.color, `${path}.color`);
  number(value.intensity, `${path}.intensity`, 0, 1000); number(value.distance, `${path}.distance`, .5, 80);
  number(value.angle, `${path}.angle`, .05, 1.4); number(value.penumbra, `${path}.penumbra`, 0, 1);
  number(value.pitch, `${path}.pitch`, -60, 80); number(value.height, `${path}.height`, 0, 4); bool(value.shadow, `${path}.shadow`);
}

/** Optional cinematic fields of a camera preset. `exists(id)` tells whether a focus/follow target is in the scene. */
export function validateCameraExtras(camera, path, exists) {
  if (camera.focus !== undefined) {
    const focus = camera.focus;
    keys(focus, Object.keys(FOCUS_DEFAULTS), `${path}.focus`); bool(focus.enabled, `${path}.focus.enabled`);
    number(focus.distance, `${path}.focus.distance`, .1, 500); number(focus.aperture, `${path}.focus.aperture`, 0, 1);
    fail(focus.targetId === null || exists(focus.targetId), 'Alvo de foco não encontrado.', `${path}.focus.targetId`);
  }
  if (camera.follow !== undefined && camera.follow !== null) {
    keys(camera.follow, ['targetId'], `${path}.follow`);
    fail(exists(camera.follow.targetId), 'Token seguido não encontrado.', `${path}.follow.targetId`);
  }
  if (camera.motion !== undefined) {
    keys(camera.motion, ['type', 'speed'], `${path}.motion`);
    fail(CAMERA_MOTIONS.includes(camera.motion.type), `Movimento inválido; opções: ${CAMERA_MOTIONS.join(', ')}.`, `${path}.motion.type`);
    number(camera.motion.speed, `${path}.motion.speed`, 0, 4);
  }
}

/** Quintic ease: zero speed and acceleration at both ends, so a move neither starts nor lands with a jolt. */
export const smootherstep = t => { const x = Math.min(1, Math.max(0, t)); return x * x * x * (x * (x * 6 - 15) + 10); };

/** Frame-rate independent approach towards a goal: after `time` seconds the remaining distance is about 1/e³. */
export const approach = (current, goal, seconds, time) => time <= 0 ? goal : current + (goal - current) * (1 - Math.exp(-3 * seconds / time));

const lerp = (a, b, t) => a + (b - a) * t;
const channels = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
// Mix colours in linear light: a red sky fading to night darkens instead of passing through grey.
const toLinear = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const toSrgb = c => c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055;
export function mixColor(a, b, t) {
  if (a === b || t <= 0) return a; if (t >= 1) return b;
  const x = channels(a), y = channels(b);
  return '#' + x.map((v, i) => Math.round(Math.min(1, Math.max(0, toSrgb(lerp(toLinear(v), toLinear(y[i]), t)))) * 255).toString(16).padStart(2, '0')).join('');
}
const isColor = value => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
// Numbers and colours blend; anything else (modes, seeds, types) switches halfway.
function mixValue(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t);
  if (isColor(a) && isColor(b)) return mixColor(a, b, t);
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => mixValue(v, b[i], t));
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) return Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(key => [key, key in a && key in b ? mixValue(a[key], b[key], t) : t < .5 ? a[key] ?? b[key] : b[key] ?? a[key]]));
  return t < .5 ? a : b;
}
const shortestAngle = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
function mixQuaternion(a, b, t) {
  let dot = a.reduce((sum, v, i) => sum + v * b[i], 0); const target = dot < 0 ? b.map(v => -v) : b; dot = Math.abs(dot);
  if (dot > .9995) { const q = a.map((v, i) => lerp(v, target[i], t)), length = Math.hypot(...q); return q.map(v => v / length); }
  const theta = Math.acos(dot), sin = Math.sin(theta), wa = Math.sin((1 - t) * theta) / sin, wb = Math.sin(t * theta) / sin;
  return a.map((v, i) => v * wa + target[i] * wb);
}
// A switched-off effect blends as the same effect at zero strength, so fog rolls in instead of popping.
const silent = {
  fog: f => ({ ...f, enabled: true, density: 0, near: f.far ?? FOG_DEFAULTS.far, far: Math.max(f.far ?? FOG_DEFAULTS.far, 400) }),
  volumetricFog: f => ({ ...f, enabled: true, density: 0 }),
  bloom: f => ({ ...f, enabled: true, strength: 0 }),
};
const blendEffect = (field, a, b, t, defaults) => {
  const from = { ...defaults, ...a }, to = { ...defaults, ...b };
  if (from.enabled === to.enabled) return mixValue(from, to, t);
  const mixed = mixValue(from.enabled ? from : silent[field](to), to.enabled ? to : silent[field](from), t);
  return { ...mixed, enabled: true };
};
const blendWeather = (a, b, t) => {
  const from = { ...WEATHER_DEFAULTS, ...a }, to = { ...WEATHER_DEFAULTS, ...b };
  if (from.type === to.type && from.count === to.count && from.seed === to.seed) return mixValue(from, to, t);
  // A different emitter cannot morph: the old one fades out, then the new one fades in.
  return t < .5 ? { ...from, opacity: from.opacity * (1 - t * 2) } : { ...to, opacity: to.opacity * (t * 2 - 1) };
};

/**
 * The look between two looks, for a transition of time of day or atmosphere. Global settings and the key light blend;
 * local lights, bindings and material adjustments come from `to` unchanged. `keyId` is the key light in both looks.
 */
export function mixLook(from, to, t, keyId = null) {
  if (t <= 0) return from; if (t >= 1) return to;
  const look = { ...to };
  look.background = mixColor(from.background, to.background, t);
  look.fill = mixValue(from.fill, to.fill, t);
  look.daylight = { ...mixValue({ ...DAYLIGHT_DEFAULTS, ...from.daylight }, { ...DAYLIGHT_DEFAULTS, ...to.daylight }, t) };
  const skyFrom = { ...SKY_DEFAULTS, ...from.sky }, skyTo = { ...SKY_DEFAULTS, ...to.sky };
  look.sky = skyFrom.enabled === skyTo.enabled ? mixValue(skyFrom, skyTo, t) : t < .5 ? skyFrom : skyTo;
  look.weather = blendWeather(from.weather, to.weather, t);
  look.fog = blendEffect('fog', from.fog, to.fog, t, FOG_DEFAULTS);
  look.volumetricFog = blendEffect('volumetricFog', from.volumetricFog, to.volumetricFog, t, VOLUME_DEFAULTS);
  look.bloom = blendEffect('bloom', from.bloom, to.bloom, t, BLOOM_DEFAULTS);
  const a = keyId && from.lights?.[keyId], b = keyId && to.lights?.[keyId];
  if (a && b) {
    const on = a.enabled !== false, next = b.enabled !== false;
    look.lights = { ...to.lights, [keyId]: { ...b, color: mixColor(a.color, b.color, t), rotation: mixQuaternion(a.rotation, b.rotation, t),
      intensity: lerp(on ? a.intensity : 0, next ? b.intensity : 0, t), enabled: on || next } };
  }
  return look;
}

/** The cinematic part of the camera that travels with it to the projector, with defaults filled in. */
export const cameraExtras = camera => ({
  focus: { ...FOCUS_DEFAULTS, ...camera?.focus }, follow: camera?.follow?.targetId ? { targetId: camera.follow.targetId } : null,
  motion: { ...MOTION_DEFAULTS, ...camera?.motion },
});

/**
 * Where a close-up may stand around a character's chest, best first: three-quarters from the front, then round the
 * sides to behind. `yaw` is the token's heading in radians; the caller keeps the first spot with a clear view.
 */
export function closeUpSpots(chest, yaw, distance = 2.4, lift = .18) {
  return [20, -20, 45, -45, 0, 75, -75, 120, -120, 180].map(degrees => {
    const angle = yaw + degrees * Math.PI / 180;
    return [chest[0] + Math.sin(angle) * distance, chest[1] + lift, chest[2] + Math.cos(angle) * distance];
  });
}

export { shortestAngle };
