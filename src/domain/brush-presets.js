import { ROCK_SCULPT_MODES } from './rock-sculpt.js';

export const BRUSH_PRESET_LIMIT = 100;
const TERRAIN_MODES = [...ROCK_SCULPT_MODES, 'rock', 'paint', 'erase', 'water'];
const COMMON = ['mode', 'radius', 'strength', 'hardness'];
const fail = message => { throw new Error(message); };
const surfaceModes = surface => {
  if (surface === 'terrain') return TERRAIN_MODES;
  if (surface === 'rock') return ROCK_SCULPT_MODES;
  fail('Tipo de superfície do pincel inválido.');
};
const fields = (surface, mode) => surface === 'rock' ? COMMON : [
  ...COMMON, 'shape', 'snap', 'protectFloors',
  ...(mode === 'flatten' ? ['target'] : []),
  ...(mode === 'rock' ? ['rockPattern', 'rockSize', 'rockSeed'] : []),
  ...(mode === 'water' ? ['waterLevel', 'waterDepth'] : []),
];

export function brushPresetName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || /[\u0000-\u001f\u007f]/u.test(name)) fail('Dê ao pincel um nome de 1 a 80 caracteres.');
  return name.trim().normalize('NFC');
}

export function validateBrushSettings(surface, brush) {
  const modes = surfaceModes(surface);
  if (!brush || typeof brush !== 'object' || Array.isArray(brush) || !modes.includes(brush.mode)) fail('Ferramenta incompatível com a superfície do preset.');
  const allowed = fields(surface, brush.mode);
  if (Object.keys(brush).some(key => !allowed.includes(key)) || allowed.some(key => !Object.hasOwn(brush, key))) fail('Configurações do preset de pincel inválidas.');
  const range = (key, min, max) => {
    if (!Number.isFinite(brush[key]) || brush[key] < min || brush[key] > max) fail(`Valor inválido no pincel: ${key}.`);
  };
  range('radius', .1, 100);
  range('strength', .01, ['smooth', 'flatten', 'paint', 'erase'].includes(brush.mode) ? 1 : 10);
  range('hardness', 0, 1);
  if (surface === 'terrain') {
    if (!['circle', 'square'].includes(brush.shape) || typeof brush.snap !== 'boolean' || typeof brush.protectFloors !== 'boolean') fail('Forma ou encaixe do pincel inválido.');
    if (brush.mode === 'flatten' && !Number.isFinite(brush.target)) fail('Altura desejada inválida.');
    if (brush.mode === 'rock') {
      if (!['fractured', 'strata', 'granite'].includes(brush.rockPattern)) fail('Padrão de rocha inválido.');
      range('rockSize', .1, 100); range('rockSeed', 0, 65535);
      if (!Number.isInteger(brush.rockSeed)) fail('Seed de rocha inválido.');
    }
    if (brush.mode === 'water') {
      range('waterLevel', -1000, 1000); range('waterDepth', .1, 20);
      if (brush.shape !== 'circle' || brush.snap) fail('O pincel de água usa círculo sem encaixe.');
    }
  }
  return brush;
}

/** Only reusable settings: no layer, object, mask, material or camera references. */
export function captureBrushSettings(surface, brush) {
  surfaceModes(surface);
  const settings = Object.fromEntries(fields(surface, brush.mode).map(key => [key, brush[key]]));
  validateBrushSettings(surface, settings);
  return settings;
}

export function applyBrushPreset(current, preset, surface) {
  if (preset?.schemaVersion !== 1 || preset.surface !== surface) fail('Escolha um preset compatível com esta superfície.');
  validateBrushSettings(surface, preset.brush);
  return { ...current, ...preset.brush, ...(surface === 'rock' ? { shape: 'circle', snap: false } : {}) };
}

export function validateBrushPreset(preset) {
  if (!preset || preset.schemaVersion !== 1 || typeof preset.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(preset.id) ||
      !Number.isSafeInteger(preset.revision) || preset.revision < 1 || !Number.isFinite(Date.parse(preset.updatedAt)) ||
      brushPresetName(preset.name) !== preset.name) fail('Preset de pincel inválido.');
  validateBrushSettings(preset.surface, preset.brush);
  return preset;
}
