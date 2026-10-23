import { ValidationError } from './validation.js';

/** How a character's portrait stands in the scene. Absent: the portrait keeps the size and look it always had. */
export const FIGURE_DEFAULTS = Object.freeze({ facing: 'camera', height: 1.7, outline: true, outlineColor: '#0b0b0d', outlineWidth: .02, rim: .35, rimColor: '#ffe2b8', base: 'ring', state: 'normal' });
export const FIGURE_STATES = [['normal', 'Normal'], ['hurt', 'Ferido'], ['dying', 'Morrendo'], ['unconscious', 'Inconsciente'], ['dead', 'Morto'], ['maddened', 'Enlouquecendo']];
export const FIGURE_BASES = [['ring', 'Anel'], ['plinth', 'Pedestal'], ['none', 'Sem base']];
/** States that lay the figure down, and states that move on their own (and keep the scene redrawing). */
export const LYING_STATES = new Set(['unconscious', 'dead']);
export const ANIMATED_STATES = new Set(['dying', 'maddened']);

const fail = (condition, message, path) => { if (!condition) throw new ValidationError(message, path); };
const number = (value, path, min, max) => fail(Number.isFinite(value) && value >= min && value <= max, 'Número fora dos limites.', path);
const color = (value, path) => fail(typeof value === 'string' && /^#[a-fA-F0-9]{6}$/.test(value), 'Use uma cor hexadecimal #RRGGBB.', path);

export function validateFigure(value, path = 'figure') {
  fail(value && typeof value === 'object' && !Array.isArray(value), 'Objeto inválido.', path);
  for (const key of Object.keys(value)) fail(key in FIGURE_DEFAULTS, `Campo desconhecido: ${key}.`, `${path}.${key}`);
  fail(['camera', 'fixed'].includes(value.facing), 'Orientação inválida; opções: camera, fixed.', `${path}.facing`);
  number(value.height, `${path}.height`, .3, 6);
  fail(typeof value.outline === 'boolean', 'Deve ser booleano.', `${path}.outline`); color(value.outlineColor, `${path}.outlineColor`);
  number(value.outlineWidth, `${path}.outlineWidth`, .002, .12); number(value.rim, `${path}.rim`, 0, 1); color(value.rimColor, `${path}.rimColor`);
  fail(FIGURE_BASES.some(([id]) => id === value.base), 'Base inválida.', `${path}.base`);
  fail(FIGURE_STATES.some(([id]) => id === value.state), 'Estado inválido.', `${path}.state`);
}

/** The visual treatment of a state: tint towards red, loss of colour, darkening, pulse and wobble (all 0–1). */
export function stateLook(state) {
  return {
    normal: { tint: 0, desaturate: 0, darken: 0, pulse: 0, wobble: 0 },
    hurt: { tint: .28, desaturate: 0, darken: 0, pulse: 0, wobble: 0 },
    dying: { tint: .45, desaturate: .35, darken: .1, pulse: 1, wobble: 0 },
    unconscious: { tint: 0, desaturate: .25, darken: .15, pulse: 0, wobble: 0 },
    dead: { tint: .1, desaturate: .85, darken: .45, pulse: 0, wobble: 0 },
    maddened: { tint: .12, desaturate: .2, darken: 0, pulse: 0, wobble: 1 },
  }[state] ?? stateLook('normal');
}

/**
 * The part of an image that is not transparent, as fractions of its width and height (y from the bottom), from an
 * alpha channel of `width` × `height` bytes read row by row from the top. A portrait with empty margins then stands
 * on its feet at the base instead of floating above it.
 */
export function opaqueBounds(alpha, width, height, threshold = 24) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (alpha[y * width + x] > threshold) {
    if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y;
  }
  if (right < 0) return { x0: 0, x1: 1, y0: 0, y1: 1 };
  return { x0: left / width, x1: (right + 1) / width, y0: 1 - (bottom + 1) / height, y1: 1 - top / height };
}
