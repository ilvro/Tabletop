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
export const surfacePreset = id => SURFACE_MATERIALS.find(item => item.id === id);
export function surfacePatch(id) {
  const preset = surfacePreset(id);
  return preset ? { texture: id, textureSize: preset.size, relief: preset.relief, color: '#ffffff', roughness: preset.roughness, metalness: preset.metalness } : { texture: 'none' };
}
export const LOCAL_EFFECT_DEFAULTS = {
  type: 'fire', enabled: true, count: 96, size: [1, 1.6, 1], offset: [0, .15, 0],
  speed: 1, opacity: .85, color: '#ff9f38', seed: 42, lightIntensity: 28, hideModel: false,
};
export const smokeDefaults = () => ({ ...structuredClone(LOCAL_EFFECT_DEFAULTS), type: 'smoke', count: 80, size: [1.2, 3, 1.2], opacity: .35, color: '#777b80', speed: .6, lightIntensity: 0, hideModel: true });
