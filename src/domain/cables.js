import { ValidationError } from './validation.js';

/**
 * A cable is a prop whose shape is computed instead of loaded: wires hung
 * between two points with a belly, or dropping loose from one. The object's
 * position is the first fixing point; `span` reaches the second, in the
 * object's own axes, so moving and turning the object carries both ends.
 */
export const CABLE_ASSET = 'builtin-industrial-cable';
export const CABLE_DEFAULTS = Object.freeze({ mode: 'span', span: [3, 0, 0], sag: .5, strands: 3, radius: .014, spread: .12, seed: 1 });
export const CABLE_RANGES = Object.freeze({ sag: [0, 6], strands: [1, 12], radius: [.005, .08], spread: [0, .8], seed: [0, 65535] });
export const CABLE_MODES = [['span', 'Entre dois pontos'], ['drop', 'Solto de um ponto']];
const STEPS = 14;

export const cableDefaults = (patch = {}) => ({ ...CABLE_DEFAULTS, span: [...CABLE_DEFAULTS.span], ...patch });
export const isCable = record => Boolean(record?.cable);

export function validateCable(cable, path = 'cable') {
  const fail = message => { throw new ValidationError(`${message} (${path})`); };
  if (!cable || typeof cable !== 'object' || Array.isArray(cable)) fail('Cabo inválido.');
  for (const key of Object.keys(cable)) if (!(key in CABLE_DEFAULTS)) fail(`Campo de cabo desconhecido: ${key}.`);
  if (!CABLE_MODES.some(([id]) => id === cable.mode)) fail('Tipo de cabo inválido.');
  if (!Array.isArray(cable.span) || cable.span.length !== 3 || cable.span.some(v => !Number.isFinite(v) || Math.abs(v) > 60)) fail('Vão do cabo inválido.');
  if (Math.hypot(...cable.span) < .05) fail('As duas pontas do cabo estão no mesmo lugar.');
  for (const [key, [min, max]] of Object.entries(CABLE_RANGES)) if (!Number.isFinite(cable[key]) || cable[key] < min || cable[key] > max) fail(`Valor de cabo fora do intervalo: ${key}.`);
  if (!Number.isInteger(cable.strands) || !Number.isInteger(cable.seed)) fail('Fios e semente do cabo devem ser inteiros.');
}

const random = (seed, key) => { let h = (seed * 2654435761 + key * 40503) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; };

/**
 * The wires of a cable as lists of points, in the object's axes with the first
 * fixing point at the origin. Each wire has its own belly and sits a little
 * aside from the others, so a bundle reads as several wires and not as a pipe.
 */
export function cableStrands(cable) {
  const { mode, span, sag, strands, spread, seed } = cable, [dx, dy, dz] = span, reach = Math.hypot(dx, dz);
  // Sideways from the run, to set the wires apart; any horizontal direction when the cable is vertical.
  const side = reach > 1e-6 ? [-dz / reach, 0, dx / reach] : [1, 0, 0], along = reach > 1e-6 ? [dx / reach, 0, dz / reach] : [0, 0, 1];
  return Array.from({ length: strands }, (_, index) => {
    const lone = strands === 1, aside = lone ? 0 : (random(seed, index * 7 + 1) - .5) * spread, lift = lone ? 0 : (random(seed, index * 7 + 2) - .5) * spread * .35;
    const belly = lone ? 1 : .72 + random(seed, index * 7 + 3) * .56, lean = lone ? 0 : (random(seed, index * 7 + 4) - .5) * spread * 1.6;
    if (mode === 'drop') {
      // Loose from one point: straight down for the length of the span, the end swinging a little off.
      const length = Math.hypot(dx, dy, dz) * (lone ? 1 : .55 + random(seed, index * 7 + 5) * .45), sway = sag * .25 * (lone ? 1 : .4 + random(seed, index * 7 + 6) * 1.2), turn = random(seed, index * 7 + 7) * Math.PI * 2;
      return Array.from({ length: STEPS + 1 }, (_, step) => { const t = step / STEPS, out = sway * t * t; return [side[0] * aside + Math.cos(turn) * out, -length * t, side[2] * aside + Math.sin(turn) * out]; });
    }
    return Array.from({ length: STEPS + 1 }, (_, step) => {
      const t = step / STEPS, hang = 4 * t * (1 - t), ends = Math.sin(Math.PI * t);
      return [dx * t + side[0] * (aside * ends + lean * hang) + along[0] * 0, dy * t - sag * belly * hang + lift * ends, dz * t + side[2] * (aside * ends + lean * hang)];
    });
  });
}

/** The cable as an asset recipe, so it is drawn, lit and textured as any other model. */
export function cableRecipe(cable) {
  return {
    parts: cableStrands(cable).map((points, index) => ({ shape: 'rope', points, radius: Math.max(.005, cable.radius * (cable.strands === 1 ? 1 : .7 + random(cable.seed, index * 7 + 9) * .6)), segments: STEPS * 2, sides: 6, position: [0, 0, 0], material: 'cable' })),
    materials: { cable: { color: '#17181a', roughness: .78 } },
  };
}

/** Lowest point of the cable below its first fixing point, in metres: what must clear the floor. */
export const cableDepth = cable => -Math.min(0, ...cableStrands(cable).flat().map(point => point[1]));

/** A cable hung between two points of the scene, as the fields of the prop that holds it. */
export function cableBetween(from, to, patch = {}) {
  const span = to.map((value, axis) => +(value - from[axis]).toFixed(4)), reach = Math.hypot(...span);
  if (reach < .05) throw new ValidationError('Escolha dois pontos diferentes para o cabo.');
  return { position: [...from], cable: cableDefaults({ span, sag: +Math.max(.08, reach * .16).toFixed(3), ...patch }) };
}

/**
 * Where an end of a cable hangs from, given what the click hit: a model (a beam, a duct, the top of a
 * thing) or the underside of a floor above is the point itself; a wall is that point a little out from
 * the face; the top of a floor is the ground, and the end hangs from the height of the walls above it.
 */
export function cableEndpoint({ point, normal, hostKind, wallHeight = 2.6 }) {
  if (hostKind === 'wall') return point.map((v, i) => +(v + normal[i] * .02).toFixed(4));
  if (hostKind === 'floor' && normal[1] > .5) return [point[0], +(point[1] + wallHeight - .04).toFixed(4), point[2]];
  return [...point];
}
