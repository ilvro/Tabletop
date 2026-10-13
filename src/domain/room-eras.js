/**
 * The period a place is furnished for. An era does not bring its own layouts:
 * it filters and replaces models by what the library has for that period, so
 * every room, state and building follows it, and models added to the library
 * with an older period are used without further work.
 */
export const ROOM_ERAS = [
  { id: 'modern', name: 'Atual', description: 'Tudo o que a biblioteca tem.' },
  { id: 'old', name: 'Antiga', description: 'Sem eletricidade nem plástico: madeira, ferro, velas e lampiões. Serve a cenários coloniais e rurais.' },
  { id: 'medieval', name: 'Medieval', description: 'Mesas de cavalete, bancos, baús, tochas, braseiros e lareiras de pedra; nada posterior a isso.' },
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
// Medieval stand-ins come first; what they do not cover falls back to the older-era table.
const MEDIEVAL = {
  chair: 'medieval-stool', 'rocking-chair': 'medieval-stool', armchair: 'medieval-stool', 'bar-stool': 'medieval-stool', desk: 'medieval-trestle-table', 'dining-table': 'medieval-trestle-table', 'house-counter': 'medieval-trestle-table',
  'reception-counter': 'medieval-trestle-table', workbench: 'medieval-trestle-table', 'autopsy-table': 'medieval-trestle-table', bench: 'medieval-bench', sofa: 'medieval-bench', 'restaurant-booth': 'medieval-bench', 'classroom-desk': 'medieval-bench',
  'coffee-table': 'medieval-chest', 'bedside-table': 'medieval-chest', 'tool-chest': 'medieval-chest', 'medical-cart': 'medieval-chest', safe: 'medieval-chest', 'single-bed': 'medieval-bed', 'bunk-bed': 'medieval-bed', gurney: 'medieval-bed',
  wardrobe: 'medieval-cupboard', cabinet: 'medieval-cupboard', locker: 'medieval-cupboard', dresser: 'medieval-cupboard', 'supermarket-shelf': 'medieval-cupboard', 'card-catalog': 'medieval-cupboard', lamp: 'medieval-candle-stand',
  fireplace: 'medieval-hearth', stove: 'medieval-hearth', fridge: 'medieval-barrel-rack', bathtub: 'medieval-wooden-tub', shower: 'medieval-wooden-tub', 'house-place-setting': 'medieval-tankards', 'cash-register': 'medieval-tankards',
  'evidence-board': 'medieval-shield', 'power-panel': 'medieval-wall-torch', 'kerosene-lantern': 'candles', 'wooden-fence': 'medieval-palisade', 'iron-fence': 'medieval-palisade', pallet: 'medieval-sacks', crate: 'medieval-sacks', generator: 'medieval-anvil',
  piano: null, 'grandfather-clock': null, toilet: null, 'coat-rack': null, typewriter: 'documents',
};
const EARLY = 'Início do século XX', KEPT_EARLY = ['gravestone', 'spirit-board'];

/** Whether an era is before electricity: light is fire, walls are stone, the street is dirt. */
export const beforeElectricity = era => era === 'old' || era === 'medieval';

/** The model to use for `asset` in an era, or null when the era leaves it out. */
export function eraAsset(era, asset, catalog = []) {
  if (era === 'medieval') {
    if (Object.hasOwn(MEDIEVAL, asset)) return MEDIEVAL[asset];
    const made = catalog.find(entry => entry.id === `builtin-${asset}`)?.era;
    if (made === EARLY && !asset.startsWith('church-') && !KEPT_EARLY.includes(asset)) return null;
  }
  if (era !== 'old' && era !== 'medieval') return asset;
  if (Object.hasOwn(OLD, asset)) return OLD[asset];
  return MODERN.includes(catalog.find(entry => entry.id === `builtin-${asset}`)?.era) ? null : asset;
}
/** Every model that can stand for `asset` across eras, for recognising a room whatever its period. */
export const eraEquivalents = asset => [asset, ...(OLD[asset] ? [OLD[asset]] : []), ...(MEDIEVAL[asset] ? [MEDIEVAL[asset]] : [])];
