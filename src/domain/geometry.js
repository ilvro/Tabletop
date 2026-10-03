import { rotateXZ, yawFromQuaternion } from './coords.js';

const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onSegment = (a, b, p) => Math.abs(cross(a, b, p)) < 1e-8 && p.every((v, i) => v >= Math.min(a[i], b[i]) - 1e-8 && v <= Math.max(a[i], b[i]) + 1e-8);
function intersects(a, b, c, d) {
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0 ||
    onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
}
export function polygonIsSimple(points) {
  if (!Array.isArray(points) || points.length < 3 || points.length > 64 || points.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) return false;
  if (new Set(points.map(p => p.join(','))).size !== points.length) return false;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]; area += a[0] * b[1] - b[0] * a[1];
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || i === 0 && j === points.length - 1) continue;
      if (intersects(a, b, points[j], points[(j + 1) % points.length])) return false;
    }
  }
  return Math.abs(area) > 1e-6;
}
export function polygonSize(points) {
  return [0, 1].map(axis => Math.max(...points.map(p => p[axis])) - Math.min(...points.map(p => p[axis])));
}
export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (onSegment(a, b, point)) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function worldFootprint(record, padding = 0) {
  const [w, d] = record.footprint ?? [record.width ?? 1, record.length ?? 1];
  const [sx, , sz] = record.actorId ? [1,1,1] : record.transform.scale;
  const yaw = yawFromQuaternion(record.transform.rotation);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => {
    const offset = rotateXZ([x * (w * sx / 2 + padding), 0, z * (d * sz / 2 + padding)], yaw);
    return [record.transform.position[0] + offset[0], record.transform.position[2] + offset[2]];
  });
}
/** Every edge must stay inside, even when all corners surround a concave notch. */
export function polygonContainsPolygon(outer, inner) {
  if (!inner.every(p => pointInPolygon(p, outer))) return false;
  for (let i = 0; i < inner.length; i++) {
    const a = inner[i], b = inner[(i + 1) % inner.length], r = [b[0] - a[0], b[1] - a[1]], cuts = [0, 1];
    for (let j = 0; j < outer.length; j++) {
      const c = outer[j], d = outer[(j + 1) % outer.length], s = [d[0] - c[0], d[1] - c[1]];
      const denominator = r[0] * s[1] - r[1] * s[0];
      if (Math.abs(denominator) < 1e-8) continue;
      const q = [c[0] - a[0], c[1] - a[1]];
      const t = (q[0] * s[1] - q[1] * s[0]) / denominator, u = (q[0] * r[1] - q[1] * r[0]) / denominator;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) cuts.push(t);
    }
    cuts.sort((x, y) => x - y);
    for (let j = 1; j < cuts.length; j++) {
      const t = (cuts[j - 1] + cuts[j]) / 2;
      if (!pointInPolygon([a[0] + r[0] * t, a[1] + r[1] * t], outer)) return false;
    }
  }
  return true;
}
/** Separating axes for oriented rectangles, including edge contact as non-overlap. */
export function footprintsOverlap(a, b) {
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length], axis = [-(q[1] - p[1]), q[0] - p[0]];
    const project = vertices => vertices.map(v => v[0] * axis[0] + v[1] * axis[1]);
    const x = project(a), y = project(b);
    if (Math.max(...x) <= Math.min(...y) + 1e-8 || Math.max(...y) <= Math.min(...x) + 1e-8) return false;
  }
  return true;
}
export function groupChain(document, groupId) {
  const result = []; const visited = new Set();
  while (groupId && !visited.has(groupId)) { visited.add(groupId); const group = document.layout.groups[groupId]; if (!group) break; result.push(group); groupId = group.parentId; }
  return result;
}
export const isLocked = (document, record) => Boolean(record.locked || groupChain(document, record.groupId).some(g => g.locked) || document.layout.levels?.[record.levelId]?.locked || document.layout.layers?.[record.layerId]?.locked || (record.wallId || record.anchor?.hostId) && isLocked(document, document.layout.entities[record.wallId ?? record.anchor.hostId]));
export const isVisible = (document, record) => !groupChain(document, record.groupId).some(g => g.visible === false) && document.layout.levels?.[record.levelId]?.visible !== false && document.layout.layers?.[record.layerId]?.visible !== false;

export const isAccess = record => ['stairs', 'ramp'].includes(record?.kind);
export const isSupport = record => ['floor', 'terrain'].includes(record?.kind) || isAccess(record) || record?.supportHeight > 0;

/** Accesses rise along local +Z; their pivot is the center of the lower base. */
export function supportHeightAt(host, position) {
  if (host.kind === 'terrain') return host.transform.position[1] + terrainHeightAt(host, position);
  if (!isAccess(host)) return host.transform.position[1] + (host.supportHeight ?? 0) * host.transform.scale[1];
  const local = rotateXZ(position.map((v, i) => v - host.transform.position[i]), -yawFromQuaternion(host.transform.rotation));
  const progress = Math.max(0, Math.min(1, local[2] / host.length + .5));
  const rise = host.kind === 'stairs' ? Math.min(host.steps, Math.floor(progress * host.steps) + 1) / host.steps : progress;
  return host.transform.position[1] + host.height * rise;
}

export const floorContour = floor => floor.vertices ?? [[-floor.width / 2, -floor.length / 2], [floor.width / 2, -floor.length / 2], [floor.width / 2, floor.length / 2], [-floor.width / 2, floor.length / 2]];
export const localPoint = (host, position) => rotateXZ(position.map((v, i) => v - host.transform.position[i]), -yawFromQuaternion(host.transform.rotation));
export const worldPoint = (host, point) => rotateXZ(point, yawFromQuaternion(host.transform.rotation)).map((v, i) => v + host.transform.position[i]);

/** Holes must be strictly internal, disjoint, simple rings. */
export function validHoles(outer, holes) {
  if (!Array.isArray(holes) || holes.length > 16) return false;
  const ringsTouch = (a, b) => a.some((p, i) => b.some((q, j) => intersects(p, a[(i + 1) % a.length], q, b[(j + 1) % b.length])));
  return holes.every((hole, i) => polygonIsSimple(hole) && polygonContainsPolygon(outer, hole) && !ringsTouch(outer, hole) && holes.slice(0, i).every(other => !ringsTouch(other, hole) && !pointInPolygon(hole[0], other) && !pointInPolygon(other[0], hole)));
}

export function footprintOnFloor(floor, footprint) {
  const polygon = footprint.map(([x, z]) => { const p = localPoint(floor, [x, floor.transform.position[1], z]); return [p[0], p[2]]; });
  if (!polygonContainsPolygon(floorContour(floor), polygon)) return false;
  return !(floor.holes ?? []).some(hole => hole.some(p => pointInPolygon(p, polygon)) || polygon.some(p => pointInPolygon(p, hole)) || hole.some((p, i) => polygon.some((q, j) => intersects(p, hole[(i + 1) % hole.length], q, polygon[(j + 1) % polygon.length]))));
}

/** Matches the rendered grid's diagonal: a-b-c and b-d-c, never bilinear. */
export function terrainHeightAt(terrain, position) {
  const p = localPoint(terrain, position), n = terrain.segments;
  const gx = Math.max(0, Math.min(n, (p[0] / terrain.width + .5) * n)), gz = Math.max(0, Math.min(n, (p[2] / terrain.length + .5) * n));
  const x = Math.min(n - 1, Math.floor(gx)), z = Math.min(n - 1, Math.floor(gz)), u = gx - x, v = gz - z;
  const a = terrain.heights[z * (n + 1) + x], b = terrain.heights[z * (n + 1) + x + 1], c = terrain.heights[(z + 1) * (n + 1) + x], d = terrain.heights[(z + 1) * (n + 1) + x + 1];
  return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
}

export function constrainOpening(wall, opening, offset, sill) {
  return { offset: Math.max(opening.width / 2, Math.min(wall.length - opening.width / 2, offset)),
    sill: Math.max(0, Math.min(wall.height - opening.height, sill)) };
}
