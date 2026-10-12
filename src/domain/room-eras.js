/**
 * The period a place is furnished for. An era does not bring its own layouts:
 * it filters and replaces models by what the library has for that period, so
 * every room, state and building follows it, and models added to the library
 * with an older period are used without further work.
 */
export const ROOM_ERAS = [
  { id: 'modern', name: 'Atual', description: 'Tudo o que a biblioteca tem.' },
  { id: 'old', name: 'Antiga', description: 'Sem eletricidade nem plástico: madeira, ferro, velas e lampiões. Serve a cenários medievais, coloniais e rurais.' },
];
export const ROOM_ERA_IDS = ROOM_ERAS.map(era => era.id);
const MODERN = ['Contemporânea', 'Décadas de 1970–1990'];
// The older piece that does the same job; null when the period simply did not have one.
const OLD = {
  lamp: 'church-candelabra', 'house-ceiling-lamp': 'chandelier', 'backrooms-fluorescent': 'chandelier', fridge: 'old-closed-crate', sink: 'wooden-expedition-barrel', 'house-counter': 'dresser',
  cabinet: 'wardrobe', sofa: 'bench', armchair: 'rocking-chair', 'coffee-table': 'old-closed-crate', desk: 'dining-table', 'supermarket-shelf': 'bookshelf', locker: 'wardrobe', 'reception-counter': 'dining-table',
  crate: 'old-closed-crate', barrel: 'wooden-expedition-barrel', 'bar-stool': 'chair', 'restaurant-booth': 'bench', workbench: 'dining-table', 'tool-chest': 'old-closed-crate', gurney: 'single-bed', 'medical-cart': 'bedside-table',
  safe: 'old-closed-crate', 'classroom-desk': 'bench', 'house-place-setting': 'church-banquet-setting', 'house-curtain': 'house-curtain', typewriter: 'documents', telephone: null, 'card-catalog': 'bookshelf', pallet: 'old-open-crate',
  'evidence-case': 'suitcase', 'camera-tripod': null, 'house-plant': 'dry-grass', 'mortuary-cabinet': 'stone-sarcophagus', 'autopsy-table': 'dining-table', 'water-tank': 'well', generator: 'log-pile',
};
/** The model to use for `asset` in an era, or null when the era leaves it out. */
export function eraAsset(era, asset, catalog = []) {
  if (era !== 'old') return asset;
  if (Object.hasOwn(OLD, asset)) return OLD[asset];
  return MODERN.includes(catalog.find(entry => entry.id === `builtin-${asset}`)?.era) ? null : asset;
}
/** Every model that can stand for `asset` across eras, for recognising a room whatever its period. */
export const eraEquivalents = asset => [asset, ...(OLD[asset] ? [OLD[asset]] : [])];
