import { ValidationError } from './validation.js';

/**
 * Wet surfaces: the surface darkens and loses roughness, and on faces that look up it gathers in
 * puddles, smooth and flat, that mirror what is above them. Optional on any material.
 */
export const WET_DEFAULTS = Object.freeze({ enabled: true, amount: .6, puddles: .4, puddleSize: 1.2, seed: 1 });
export const WET_RANGES = Object.freeze({ amount: [0, 1], puddles: [0, 1], puddleSize: [.1, 10], seed: [0, 65535] });
export const wetDefaults = (patch = {}) => ({ ...WET_DEFAULTS, ...patch });

export function validateWet(wet, path = 'wet') {
  const fail = message => { throw new ValidationError(`${message} (${path})`); };
  if (!wet || typeof wet !== 'object' || Array.isArray(wet)) fail('Umidade inválida.');
  for (const key of Object.keys(wet)) if (!(key in WET_DEFAULTS)) fail(`Campo de umidade desconhecido: ${key}.`);
  if (typeof wet.enabled !== 'boolean') fail('A umidade ligada deve ser booleana.');
  for (const [key, [min, max]] of Object.entries(WET_RANGES)) if (!Number.isFinite(wet[key]) || wet[key] < min || wet[key] > max) fail(`Valor de umidade fora do intervalo: ${key}.`);
  if (!Number.isInteger(wet.seed)) fail('A variação da umidade deve ser inteira.');
}

/** The `material.wet` an inspector field makes: switching on writes the defaults, the rest edits one value. */
export function wetFieldPatch(current, field, value) {
  if (field === 'enabled') return value ? { ...(current ?? WET_DEFAULTS), enabled: true } : { ...(current ?? WET_DEFAULTS), enabled: false };
  if (!current) throw new ValidationError('Ligue Molhado antes de ajustar a umidade.');
  if (!(field in WET_RANGES)) throw new ValidationError(`Campo de umidade desconhecido: ${field}.`);
  return { ...current, [field]: value };
}
