/** Stable IDs are persisted; texture pixels are generated locally and never embedded in documents. */
export const SURFACE_MATERIALS = [
  { id: 'wood', name: 'Madeira', roughness: .72, metalness: 0, size: 2, relief: .035 },
  { id: 'stone', name: 'Pedra · blocos de alvenaria', roughness: .9, metalness: 0, size: 2, relief: .065 },
  { id: 'grass', name: 'Grama', roughness: .95, metalness: 0, size: 1, relief: .025 },
  { id: 'metal', name: 'Metal', roughness: .38, metalness: .85, size: 1, relief: .012 },
  { id: 'sand', name: 'Areia', roughness: .95, metalness: 0, size: 2, relief: .025 },
  { id: 'brick', name: 'Tijolo', roughness: .88, metalness: 0, size: 2, relief: .045 },
  { id: 'concrete', name: 'Concreto', roughness: .92, metalness: 0, size: 2, relief: .025 },
  { id: 'mud', name: 'Lama', roughness: .58, metalness: 0, size: 2, relief: .04 },
  { id: 'rock', name: 'Rocha natural', roughness: .92, metalness: 0, size: 3, relief: .09 },
  { id: 'snow', name: 'Neve', roughness: .86, metalness: 0, size: 2, relief: .018 },
  { id: 'bark', name: 'Casca de árvore', roughness: .95, metalness: 0, size: 1, relief: .055 },
  { id: 'foliage', name: 'Folhagem · nervuras', roughness: .85, metalness: 0, size: .5, relief: .012 },
  { id: 'ice', name: 'Gelo · fissuras', roughness: .2, metalness: 0, size: 3, relief: .025 },
  { id: 'fabric', name: 'Tecido', roughness: .95, metalness: 0, size: .25, relief: .006 },
  { id: 'leather', name: 'Couro', roughness: .55, metalness: 0, size: .6, relief: .012 },
  { id: 'plaster', name: 'Reboco / parede pintada', roughness: .9, metalness: 0, size: 2, relief: .012 },
  { id: 'tile', name: 'Azulejo / ladrilho', roughness: .5, metalness: 0, size: 1, relief: .012 },
  { id: 'carpet', name: 'Carpete / tapete', roughness: 1, metalness: 0, size: .8, relief: .015 },
  // Metalness lets chipped paint reveal bare metal; painted areas mask it out.
  { id: 'paint', name: 'Pintura sobre metal ou madeira', roughness: .6, metalness: .5, size: 1.2, relief: .006 },
];
/** Optional parameters preserve the appearance of existing documents. */
export const TEXTURE_DEFAULTS = Object.freeze({
  textureColor: '#ffffff', textureColorMode: 'original', textureBrightness: 1,
  textureContrast: 1, textureSaturation: 1, textureRotation: 0, textureSeed: 0,
  patternDensity: 1, woodPattern: 'planks', woodBoards: 5, woodDirection: 'horizontal',
  woodGap: .025, woodGrain: .5, metalPattern: 'brushed', metalWear: .15,
  rockPattern: 'fractured', rockCracks: .6, woodAge: 0,
  fabricWeave: 'plain', fabricThread: .6, leatherPattern: 'pebbled', leatherGrain: .6, leatherCreases: .3,
  plasterFinish: 'smooth', plasterDamage: .1, tilePattern: 'grid', tileCount: 4, tileGrout: .05, tileVariation: .25,
  carpetPattern: 'pile', carpetPile: .6, paintFinish: 'smooth', paintChips: .15, paintBase: 'metal',
});
export const TEXTURE_OPTION_FIELDS = Object.keys(TEXTURE_DEFAULTS);
export const TEXTURE_RANGES = {
  textureBrightness: [0, 2], textureContrast: [0, 2], textureSaturation: [0, 2],
  textureRotation: [0, 360], textureSeed: [0, 65535], patternDensity: [.25, 4],
  woodBoards: [1, 32], woodGap: [0, .15], woodGrain: [0, 1], metalWear: [0, 1],
  rockCracks: [0, 1], woodAge: [0, 1], fabricThread: [0, 1], leatherGrain: [0, 1], leatherCreases: [0, 1],
  plasterDamage: [0, 1], tileCount: [1, 16], tileGrout: [0, .2], tileVariation: [0, 1], carpetPile: [0, 1], paintChips: [0, 1],
};
/** Ranges that only accept whole numbers. */
export const TEXTURE_INTEGERS = ['tileCount'];
export const TEXTURE_CHOICES = {
  textureColorMode: ['original', 'tint', 'replace'], woodPattern: ['planks', 'grain', 'parquet'],
  woodDirection: ['horizontal', 'vertical'], metalPattern: ['brushed', 'smooth', 'diamond', 'corrugated', 'rusted'],
  rockPattern: ['fractured', 'strata', 'granite', 'organic'],
  fabricWeave: ['plain', 'twill', 'herringbone', 'velvet'], leatherPattern: ['pebbled', 'smooth', 'tufted'],
  plasterFinish: ['smooth', 'stucco', 'troweled', 'peeling'], tilePattern: ['grid', 'offset', 'checker', 'hex'],
  carpetPattern: ['pile', 'loop', 'striped', 'diamonds'], paintFinish: ['smooth', 'brushstrokes', 'hammered'],
  paintBase: ['metal', 'rust', 'wood', 'primer'],
};
/** Pattern parameters that change the generated pixels, per texture. */
export const TEXTURE_PATTERN_FIELDS = {
  wood: ['woodPattern', 'woodBoards', 'woodGap', 'woodGrain', 'woodAge'], metal: ['metalPattern', 'metalWear'], rock: ['rockPattern', 'rockCracks'],
  fabric: ['fabricWeave', 'fabricThread'], leather: ['leatherPattern', 'leatherGrain', 'leatherCreases'], plaster: ['plasterFinish', 'plasterDamage'],
  tile: ['tilePattern', 'tileCount', 'tileGrout', 'tileVariation'], carpet: ['carpetPattern', 'carpetPile'], paint: ['paintFinish', 'paintChips', 'paintBase'],
};
export const textureOptions = settings => Object.fromEntries(TEXTURE_OPTION_FIELDS.map(key => [key, settings?.[key] ?? TEXTURE_DEFAULTS[key]]));
/** Inspector percentages are presentation only; documents store fractions. */
export function textureFieldPatch(settings, key, value) {
  const patch = { [key]: ['woodGap', 'metalWear', 'tileGrout'].includes(key) ? value / 100 : value };
  if (key === 'textureColor' && (!settings.textureColorMode || settings.textureColorMode === 'original')) patch.textureColorMode = 'replace';
  return patch;
}
/** Defaults written when a texture is chosen: the general settings, the wood/metal/rock
 * settings documents have always carried, and the pattern of the chosen family. */
const LEGACY_PATTERNS = ['wood', 'metal', 'rock'];
const familyFields = new Set(Object.entries(TEXTURE_PATTERN_FIELDS).filter(([texture]) => !LEGACY_PATTERNS.includes(texture)).flatMap(([, fields]) => fields).concat('woodAge'));
export const patternDefaults = id => Object.fromEntries(Object.entries(TEXTURE_DEFAULTS).filter(([key]) => !familyFields.has(key) || (TEXTURE_PATTERN_FIELDS[id] ?? []).includes(key) && key !== 'woodAge'));
export function layerSurfacePatch(id) {
  const preset = surfacePreset(id);
  return preset ? { texture: id, textureSize: preset.size, color: '#ffffff', ...patternDefaults(id) } : { texture: 'none' };
}
export const surfacePreset = id => SURFACE_MATERIALS.find(item => item.id === id);
/** Paint masks remain stored when switching temporarily to automatic distribution. */
export const DISTRIBUTION_DEFAULTS = Object.freeze({
  mode: 'paint', slopeAngle: 40, slopeFade: 12, heightEnabled: false,
  minHeight: 0, heightFade: 2, variation: .25, variationSize: 3, seed: 42,
});
export const distributionOptions = settings => ({ ...DISTRIBUTION_DEFAULTS, ...settings });
export function coverageDefaults(texture = 'snow') {
  const preset = surfacePreset(texture);
  return { ...DISTRIBUTION_DEFAULTS, mode: 'top', texture, color: '#ffffff',
    textureSize: preset?.size ?? 2, amount: 1, relief: preset?.relief ?? .018, physicalThickness:0, exposedOnly:true };
}
export function surfacePatch(id) {
  const preset = surfacePreset(id);
  return preset ? { ...patternDefaults(id), texture: id, textureSize: preset.size, relief: preset.relief, color: '#ffffff', roughness: preset.roughness, metalness: preset.metalness } : { texture: 'none' };
}
export const LOCAL_EFFECT_DEFAULTS = {
  type: 'fire', enabled: true, count: 96, size: [1, 1.6, 1], offset: [0, .15, 0],
  speed: 1, opacity: .85, color: '#ff9f38', seed: 42, lightIntensity: 28, hideModel: false,
};
export const smokeDefaults = () => ({ ...structuredClone(LOCAL_EFFECT_DEFAULTS), type: 'smoke', count: 80, size: [1.2, 3, 1.2], opacity: .35, color: '#777b80', speed: .6, lightIntensity: 0, hideModel: true });
