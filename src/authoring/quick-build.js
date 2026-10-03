import { createEntity, createLight, id } from '../domain/documents.js';
import { quaternionFromYaw } from '../domain/coords.js';
import { ValidationError } from '../domain/validation.js';

/**
 * Extension boundary for prefab/procedural/decoration rules: return materialized
 * proposal data, never mutate a store or construct renderer objects. Accepted
 * proposals become ordinary entities; redo never regenerates IDs or candidates.
 */
export function proposeRoom({ width = 6, length = 5, height = 2.6, center = [0, 0, 0],
  door = true, lighting = true, thickness = 0.18, name = 'Sala', floorColor = '#847d70', wallColor = '#b3aca0' } = {}, expectedEditVersion = 0) {
  if (![width, length, height, thickness].every(value => Number.isFinite(value) && value > 0)) throw new ValidationError('As medidas da sala devem ser positivas.');
  if (!Array.isArray(center) || center.length !== 3 || !center.every(Number.isFinite)) throw new ValidationError('Centro da sala inválido.');
  if (door && (width < 1.4 || height < 2.2)) throw new ValidationError('A sala precisa de largura ≥ 1,4 m e altura ≥ 2,2 m para esta porta.');
  const group = { id: id(), name, parentId: null, locked: false, audience: 'all' };
  const floor = createEntity('floor', { name: `Piso — ${name}`, width: width + thickness * 2, length: length + thickness * 2,
    position: center, groupId: group.id, material: { color: floorColor } });
  const [cx, cy, cz] = center;
  const common = { height, thickness, surfaceId: floor.id, groupId: group.id, material: { color: wallColor } };
  // North/south cover the corners; east/west stop between them. Measures are internal.
  const south = createEntity('wall', { ...common, name: 'Parede sul', length: width + thickness * 2,
    position: [cx - width / 2 - thickness, cy, cz + length / 2 + thickness / 2] });
  const north = createEntity('wall', { ...common, name: 'Parede norte', length: width + thickness * 2,
    position: [cx - width / 2 - thickness, cy, cz - length / 2 - thickness / 2] });
  const west = createEntity('wall', { ...common, name: 'Parede oeste', length,
    position: [cx - width / 2 - thickness / 2, cy, cz + length / 2], rotation: quaternionFromYaw(90) });
  const east = createEntity('wall', { ...common, name: 'Parede leste', length,
    position: [cx + width / 2 + thickness / 2, cy, cz + length / 2], rotation: quaternionFromYaw(90) });
  const entities = [floor, south, north, west, east];
  if (door) entities.push(createEntity('door', { name: 'Porta de entrada', wallId: south.id, offset: south.length / 2,
    width: Math.min(1.1, width - 0.3), height: 2.1, initialAngle: Math.PI / 3, surfaceId: floor.id, groupId: group.id }));
  const area = { id: id(), name, kind: 'rectangle', transform: { position: [...center], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    width, length, surfaceId: floor.id, memberIds: entities.map(entity => entity.id), groupId: group.id };
  const lights = lighting ? [createLight({ name: `Luz — ${name}`, position: [cx, cy + height - 0.3, cz],
    color: '#ffdfa6', intensity: Math.max(28, width * length * 1.8), distance: Math.hypot(width, length) * 1.5 })] : [];
  return { id: id(), expectedEditVersion, label: `Criar ${name}`, entities, groups: [group], areas: [area], lights };
}
