/** Optional material layer. Coordinates belong to the object, never to a decal asset. */
export const WEAR_STYLES = [
  { id: 'grime', name: 'Sujeira e escorrimentos', color: '#463c30', roughness: .94, metalness: 0, relief: .008 },
  { id: 'rust', name: 'Ferrugem', color: '#8a4829', roughness: .9, metalness: .08, relief: .012 },
  { id: 'moss', name: 'Musgo', color: '#43552b', roughness: .98, metalness: 0, relief: .015 },
  { id: 'scorch', name: 'Fuligem', color: '#242125', roughness: .96, metalness: 0, relief: .003 },
  { id: 'cracks', name: 'Rachaduras aparentes', color: '#332e2a', roughness: .9, metalness: 0, relief: .012 },
];
export const WEAR_RANGES = { amount: [0, 1], size: [.05, 50], seed: [0, 65535], roughness: [0, 1], metalness: [0, 1], relief: [0, .1], radius: [.01, 2], softness: [.01, 1] };
export const WEAR_PLACEMENTS = ['all', 'base', 'top', 'region'];
export function wearDefaults(type = 'grime', current = null) {
  const style = WEAR_STYLES.find(s => s.id === type);
  if (!style) throw new Error('Tipo de desgaste inválido.');
  const { id, name, ...finish } = style;
  return { enabled: true, amount: .6, size: .8, seed: 42, placement: 'all', center: [.5, .5, .5], radius: .4, softness: .5, ...structuredClone(current), ...finish, type };
}
export function wearFieldPatch(current, field, value) {
  if (field === 'type') return value === 'none' ? null : { ...wearDefaults(value, current), type: value, enabled: true };
  if (!current) throw new Error('Escolha um tipo de desgaste.');
  const next = structuredClone(current);
  if (field.startsWith('center-')) next.center[Number(field.slice(-1))] = value / 100;
  else next[field] = ['amount', 'radius', 'softness'].includes(field) ? value / 100 : value;
  return next;
}
