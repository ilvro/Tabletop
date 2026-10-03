import { localPoint } from '../domain/geometry.js';
import { ValidationError } from '../domain/validation.js';

/** One stamp is pure; a pointer gesture collects stamps into one accepted heightmap. */
export function sculptTerrain(terrain, position, { mode = 'raise', radius = 2, strength = .25, target = 0 } = {}) {
  if (terrain.kind !== 'terrain' || !['raise', 'lower', 'smooth', 'flatten'].includes(mode) || !Number.isFinite(radius) || radius <= 0 || !Number.isFinite(strength) || strength <= 0 || strength > 10 || !Number.isFinite(target)) throw new ValidationError('Pincel de terreno inválido.');
  const point = localPoint(terrain, position), n = terrain.segments, before = terrain.heights;
  return before.map((height, index) => {
    const x = index % (n + 1), z = Math.floor(index / (n + 1));
    const distance = Math.hypot((x / n - .5) * terrain.width - point[0], (z / n - .5) * terrain.length - point[2]);
    if (distance >= radius) return height;
    const t = 1 - distance / radius, weight = t * t * (3 - 2 * t);
    let result;
    if (mode === 'raise' || mode === 'lower') result = height + (mode === 'raise' ? 1 : -1) * strength * weight;
    else {
      const neighbors = [];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx <= n && z + dz >= 0 && z + dz <= n) neighbors.push(before[(z + dz) * (n + 1) + x + dx]);
      const desired = mode === 'flatten' ? target - terrain.transform.position[1] : neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      result = height + (desired - height) * Math.min(1, strength) * weight;
    }
    return Math.max(-1000, Math.min(1000, result));
  });
}
