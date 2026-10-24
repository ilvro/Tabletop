import { ValidationError } from './validation.js';

/**
 * Areas of effect drawn on the floor during a session: `{ id, shape, origin, yaw, size, width, color, label }`.
 * `size` is the radius of a circle, the half side of a square, the length of a cone or line; `yaw` turns it (radians,
 * from +Z); `width` is a line's width. A cone opens as wide as it is long (half-angle atan ½), as in many systems.
 */
export const AREA_SHAPES = [['circle', 'Círculo'], ['cone', 'Cone'], ['line', 'Linha'], ['square', 'Quadrado']];
export const AREA_COLORS = ['#ff6a3d', '#ffd23f', '#5bc0eb', '#9b5de5', '#3ddc84', '#f2f2f2'];
const CONE_SLOPE = .5;
const fail = (condition, message, path) => { if (!condition) throw new ValidationError(message, path); };

export function validateArea(area, path) {
  fail(area && typeof area === 'object' && !Array.isArray(area), 'Área inválida.', path);
  for (const key of Object.keys(area)) fail(['id', 'shape', 'origin', 'yaw', 'size', 'width', 'color', 'label'].includes(key), `Campo desconhecido: ${key}.`, `${path}.${key}`);
  fail(typeof area.id === 'string' && area.id.length > 0 && area.id.length <= 120, 'ID inválido.', `${path}.id`);
  fail(AREA_SHAPES.some(([id]) => id === area.shape), 'Forma inválida.', `${path}.shape`);
  fail(Array.isArray(area.origin) && area.origin.length === 3 && area.origin.every(Number.isFinite), 'Origem inválida.', `${path}.origin`);
  fail(Number.isFinite(area.yaw), 'Direção inválida.', `${path}.yaw`);
  fail(Number.isFinite(area.size) && area.size > 0 && area.size <= 200, 'Tamanho inválido.', `${path}.size`);
  fail(Number.isFinite(area.width) && area.width > 0 && area.width <= 50, 'Largura inválida.', `${path}.width`);
  fail(typeof area.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(area.color), 'Cor inválida.', `${path}.color`);
  fail(typeof area.label === 'string' && area.label.length <= 80, 'Rótulo inválido.', `${path}.label`);
}
export function validateAreas(areas, path = 'sessionState.areas') {
  fail(Array.isArray(areas) && areas.length <= 32, 'Áreas inválidas (no máximo 32).', path);
  const ids = new Set(); areas.forEach((area, i) => { validateArea(area, `${path}[${i}]`); fail(!ids.has(area.id), 'Área repetida.', `${path}[${i}].id`); ids.add(area.id); });
}

/** The area a drag on the floor draws: from where it started (centre or apex) to where it ended (reach and direction). */
export function areaFromDrag(start, end, { id, shape = 'circle', width = 1.5, color = AREA_COLORS[0], label = '' }) {
  const dx = end[0] - start[0], dz = end[2] - start[2];
  return { id, shape, origin: [...start], yaw: Math.atan2(dx, dz), size: Math.max(.25, Math.hypot(dx, dz)), width, color, label };
}

/** Where a point is in the area's own axes: `along` its direction, `across` to its right. */
function local(area, point) {
  const dx = point[0] - area.origin[0], dz = point[2] - area.origin[2], s = Math.sin(area.yaw), c = Math.cos(area.yaw);
  return { along: dx * s + dz * c, across: dx * c - dz * s };
}

/** Whether a token whose base has `radius` touches the area. */
export function areaTouches(area, point, radius = 0) {
  const { along, across } = local(area, point), r = radius;
  if (area.shape === 'circle') return Math.hypot(along, across) <= area.size + r;
  if (area.shape === 'square') return Math.abs(along) <= area.size + r && Math.abs(across) <= area.size + r;
  if (area.shape === 'line') return along >= -r && along <= area.size + r && Math.abs(across) <= area.width / 2 + r;
  return along >= -r && along <= area.size + r && Math.abs(across) <= Math.max(0, along) * CONE_SLOPE + r;
}

/** The outline of the area as points in its own axes `[along, across]`, counter-clockwise, for drawing. */
export function areaOutline(area, segments = 48) {
  if (area.shape === 'circle') return Array.from({ length: segments }, (_, i) => { const a = i / segments * Math.PI * 2; return [Math.cos(a) * area.size, Math.sin(a) * area.size]; });
  if (area.shape === 'square') return [[-area.size, -area.size], [area.size, -area.size], [area.size, area.size], [-area.size, area.size]];
  if (area.shape === 'line') return [[0, -area.width / 2], [area.size, -area.width / 2], [area.size, area.width / 2], [0, area.width / 2]];
  // A cone: the apex, then an arc across its far end.
  const half = Math.atan(CONE_SLOPE), reach = area.size / Math.cos(half), arc = Array.from({ length: segments / 4 + 1 }, (_, i) => { const a = -half + i / (segments / 4) * half * 2; return [Math.cos(a) * reach, Math.sin(a) * reach]; });
  return [[0, 0], ...arc];
}
