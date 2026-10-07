import * as THREE from 'three';
import { polygonIsSimple } from '../domain/geometry.js';

/** Solid metric silhouettes: arches, tracery, curved slabs and carved ornaments.
 * The contour is in XY and extrusion is centred on Z. No runtime tessellation loop.
 */
export function createProfileGeometry({ contour, depth = .2 }) {
  if (!Array.isArray(contour) || contour.length < 3 || contour.length > 64 ||
      contour.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v) || Math.abs(v) > 100)) ||
      !polygonIsSimple(contour) || !Number.isFinite(depth) || depth < .005 || depth > 30) {
    throw new Error('Perfil arquitetônico inválido.');
  }
  const area = contour.reduce((a, p, i) => { const q = contour[(i + 1) % contour.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
  if (Math.abs(area) < 1e-7) throw new Error('Perfil arquitetônico sem área.');
  const shape = new THREE.Shape(contour.map(p => new THREE.Vector2(...p)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
