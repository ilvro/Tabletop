/** Stable IDs are persisted; texture pixels are generated locally and never embedded in documents. */
export const SURFACE_MATERIALS = [
  { id: 'wood', name: 'Madeira', roughness: .72, metalness: 0, size: 2, relief: .035 },
  { id: 'stone', name: 'Pedra', roughness: .9, metalness: 0, size: 2, relief: .065 },
  { id: 'grass', name: 'Grama', roughness: .95, metalness: 0, size: 1, relief: .025 },
  { id: 'metal', name: 'Metal', roughness: .38, metalness: .85, size: 1, relief: .012 },
  { id: 'sand', name: 'Areia', roughness: .95, metalness: 0, size: 2, relief: .025 },
  { id: 'brick', name: 'Tijolo', roughness: .88, metalness: 0, size: 2, relief: .045 },
  { id: 'concrete', name: 'Concreto', roughness: .92, metalness: 0, size: 2, relief: .025 },
  { id: 'mud', name: 'Lama', roughness: .58, metalness: 0, size: 2, relief: .04 },
];
/** Optional parameters preserve the appearance of existing documents. */
export const TEXTURE_DEFAULTS = Object.freeze({
  textureColor: '#ffffff', textureColorMode: 'original', textureBrightness: 1,
  textureContrast: 1, textureSaturation: 1, textureRotation: 0, textureSeed: 0,
  patternDensity: 1, woodPattern: 'planks', woodBoards: 5, woodDirection: 'horizontal',
  woodGap: .025, woodGrain: .5, metalPattern: 'brushed', metalWear: .15,
});
export const TEXTURE_OPTION_FIELDS = Object.keys(TEXTURE_DEFAULTS);
export const TEXTURE_RANGES = {
  textureBrightness: [0, 2], textureContrast: [0, 2], textureSaturation: [0, 2],
  textureRotation: [0, 360], textureSeed: [0, 65535], patternDensity: [.25, 4],
  woodBoards: [1, 32], woodGap: [0, .15], woodGrain: [0, 1], metalWear: [0, 1],
};
export const TEXTURE_CHOICES = {
  textureColorMode: ['original', 'tint', 'replace'], woodPattern: ['planks', 'grain', 'parquet'],
  woodDirection: ['horizontal', 'vertical'], metalPattern: ['brushed', 'smooth', 'diamond', 'corrugated', 'rusted'],
};
export const textureOptions = settings => Object.fromEntries(TEXTURE_OPTION_FIELDS.map(key => [key, settings?.[key] ?? TEXTURE_DEFAULTS[key]]));
/** Inspector percentages are presentation only; documents store fractions. */
export function textureFieldPatch(settings, key, value) {
  const patch = { [key]: ['woodGap', 'metalWear'].includes(key) ? value / 100 : value };
  if (key === 'textureColor' && (!settings.textureColorMode || settings.textureColorMode === 'original')) patch.textureColorMode = 'replace';
  return patch;
}
export function layerSurfacePatch(id) {
  const preset = surfacePreset(id);
  return preset ? { texture: id, textureSize: preset.size, color: '#ffffff', ...TEXTURE_DEFAULTS } : { texture: 'none' };
}
export const surfacePreset = id => SURFACE_MATERIALS.find(item => item.id === id);
export function surfacePatch(id) {
  const preset = surfacePreset(id);
  return preset ? { ...TEXTURE_DEFAULTS, texture: id, textureSize: preset.size, relief: preset.relief, color: '#ffffff', roughness: preset.roughness, metalness: preset.metalness } : { texture: 'none' };
}
export const LOCAL_EFFECT_DEFAULTS = {
  type: 'fire', enabled: true, count: 96, size: [1, 1.6, 1], offset: [0, .15, 0],
  speed: 1, opacity: .85, color: '#ff9f38', seed: 42, lightIntensity: 28, hideModel: false,
};
export const smokeDefaults = () => ({ ...structuredClone(LOCAL_EFFECT_DEFAULTS), type: 'smoke', count: 80, size: [1.2, 3, 1.2], opacity: .35, color: '#777b80', speed: .6, lightIntensity: 0, hideModel: true });
