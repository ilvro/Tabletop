import * as THREE from 'three';

const CREASE = Math.cos(THREE.MathUtils.degToRad(28)), COPLANAR = .985, NONE = 1e3, OFFSET = 1;
const derived = new WeakMap();

/** Geometry for wear that follows edges: every vertex carries the distance, in
 * metres, to up to four crease lines bordering its face. Distance to a line is
 * linear across a flat face, so the fragment shader gets the exact distance to
 * the nearest hard edge by interpolation, on boxes of two triangles a side as
 * well as on dense meshes. Curvature measured on screen cannot do this: the
 * models have flat faces with hard edges.
 *
 * Values are stored with an offset so that a mesh without the attribute, which
 * reads as zeros, is told apart from a vertex lying on an edge.
 * The result is cached per source geometry and shared by every instance. */
export function wearEdgeGeometry(source) {
  let geometry = derived.get(source);
  if (geometry) return geometry;
  geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.attributes.position, triangles = position.count / 3, points = [], normals = [], keys = new Array(position.count);
  const id = new Map(), keyOf = (x, y, z) => { const text = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`; let n = id.get(text); if (n === undefined) { n = id.size; id.set(text, n); } return n; };
  for (let i = 0; i < position.count; i++) { points.push(new THREE.Vector3().fromBufferAttribute(position, i)); keys[i] = keyOf(points[i].x, points[i].y, points[i].z); }
  const edges = new Map(), edgeKey = (a, b) => a < b ? a * 4194304 + b : b * 4194304 + a;
  for (let t = 0; t < triangles; t++) {
    const [a, b, c] = [0, 1, 2].map(k => points[t * 3 + k]), normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    normals.push(normal.lengthSq() > 1e-16 ? normal.normalize() : null);
    if (!normals[t]) continue;
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k, j = t * 3 + (k + 1) % 3, key = edgeKey(keys[i], keys[j]); let edge = edges.get(key);
      if (!edge) edges.set(key, edge = { a: points[i], b: points[j], ends: [keys[i], keys[j]], faces: [] });
      edge.faces.push(normals[t]);
    }
  }
  // A crease is an open border or an edge between faces that meet at an angle.
  const atVertex = new Map();
  for (const edge of edges.values()) {
    const crease = edge.faces.length === 1 || edge.faces.some((n, i) => edge.faces.some((m, j) => j > i && n.dot(m) < CREASE));
    if (!crease || edge.a.distanceToSquared(edge.b) < 1e-12) continue;
    edge.direction = new THREE.Vector3().subVectors(edge.b, edge.a).normalize();
    for (const end of edge.ends) { let list = atVertex.get(end); if (!list) atVertex.set(end, list = []); list.push(edge); }
  }
  const data = new Float32Array(position.count * 4).fill(NONE + OFFSET), offset = new THREE.Vector3(), distance = (point, edge) => offset.subVectors(point, edge.a).cross(edge.direction).length();
  for (let t = 0; t < triangles; t++) {
    if (!normals[t]) continue;
    // Creases of this face, and of coplanar neighbours that reach one of its corners.
    const lines = new Set();
    for (let k = 0; k < 3; k++) for (const edge of atVertex.get(keys[t * 3 + k]) ?? []) if (edge.faces.some(n => n.dot(normals[t]) > COPLANAR)) lines.add(edge);
    const ranked = [...lines].map(edge => { const d = [0, 1, 2].map(k => distance(points[t * 3 + k], edge)); return { d, nearest: Math.min(...d), sum: d[0] + d[1] + d[2] }; }).sort((p, q) => p.nearest - q.nearest || p.sum - q.sum).slice(0, 4);
    ranked.forEach((line, n) => { for (let k = 0; k < 3; k++) data[(t * 3 + k) * 4 + n] = line.d[k] + OFFSET; });
  }
  geometry.setAttribute('wearEdge', new THREE.BufferAttribute(data, 4));
  geometry.userData = { ...geometry.userData, wearEdges: true };
  derived.set(source, geometry);
  return geometry;
}

/** Meshes whose vertex order other systems depend on keep their geometry. */
export const supportsWearEdges = geometry => !(geometry.userData.rock || geometry.userData.rocks || geometry.userData.sculptPrepared || geometry.userData.snowProxy || geometry.userData.snowProxies || geometry.attributes.surfaceMaskA);
