import { localPoint, worldPoint } from '../domain/geometry.js';
import { ValidationError } from '../domain/validation.js';

function brushSettings(options = {}) {
  const settings = { mode: 'raise', radius: 2, strength: .25, target: 0, shape: 'circle', hardness: 0, snap: false, ...options };
  const { mode, radius, strength, target, shape, hardness, snap } = settings;
  if (!['raise','lower','smooth','flatten','paint','erase'].includes(mode) || !['circle','square'].includes(shape) || !Number.isFinite(radius) || radius <= 0 || radius > 100 || !Number.isFinite(strength) || strength <= 0 || strength > 10 || !Number.isFinite(target) || !Number.isFinite(hardness) || hardness < 0 || hardness > 1 || typeof snap !== 'boolean') throw new ValidationError('Pincel de terreno inválido.');
  return settings;
}

export function terrainBrushCenter(terrain, position, options = {}) {
  const point = localPoint(terrain, position);
  if (options.snap) {
    point[0] = (Math.round((point[0] / terrain.width + .5) * terrain.segments) / terrain.segments - .5) * terrain.width;
    point[2] = (Math.round((point[2] / terrain.length + .5) * terrain.segments) / terrain.segments - .5) * terrain.length;
  }
  return point;
}

function weightAt(terrain, index, point, settings) {
  const n = terrain.segments, x = index % (n + 1), z = Math.floor(index / (n + 1));
  const dx = Math.abs((x / n - .5) * terrain.width - point[0]), dz = Math.abs((z / n - .5) * terrain.length - point[2]);
  const distance = settings.shape === 'square' ? Math.max(dx, dz) : Math.hypot(dx, dz);
  if (distance > settings.radius) return 0;
  if (distance <= settings.radius * settings.hardness) return 1;
  const t = 1 - (distance - settings.radius * settings.hardness) / (settings.radius * (1 - settings.hardness));
  return t * t * (3 - 2 * t);
}

/** The cursor follows the same local axes and snapped center as the actual stamp. */
export function terrainBrushOutline(terrain, position, options = {}) {
  const settings = brushSettings(options), center = terrainBrushCenter(terrain, position, settings);
  return Array.from({ length: 49 }, (_, i) => {
    const angle = i / 48 * Math.PI * 2;
    let dx = Math.cos(angle), dz = Math.sin(angle);
    if (settings.shape === 'square') { const edge = Math.max(Math.abs(dx), Math.abs(dz)); dx /= edge; dz /= edge; }
    return worldPoint(terrain, [center[0] + dx * settings.radius, 0, center[2] + dz * settings.radius]);
  });
}

/** One stamp is pure; a pointer gesture collects stamps into one undoable edit. */
export function sculptTerrain(terrain, position, options = {}) {
  const settings = brushSettings(options), { mode, strength, target } = settings;
  if (terrain.kind !== 'terrain' || ['paint','erase'].includes(mode)) throw new ValidationError('Ferramenta de relevo inválida.');
  const point = terrainBrushCenter(terrain, position, settings), n = terrain.segments, before = terrain.heights;
  return before.map((height, index) => {
    const weight = weightAt(terrain, index, point, settings); if (!weight) return height;
    const x = index % (n + 1), z = Math.floor(index / (n + 1));
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

/** Paint changes only the active mask; erasing reveals the layers underneath. */
export function paintTerrain(terrain, position, options = {}) {
  const settings = brushSettings(options);
  const layer = terrain.paintLayers?.find(entry => entry.id === settings.layerId);
  if (terrain.kind !== 'terrain' || !['paint','erase'].includes(settings.mode) || !layer || !layer.visible) throw new ValidationError('Escolha uma camada de cor visível para pintar.');
  const point = terrainBrushCenter(terrain, position, settings);
  return terrain.paintLayers.map(entry => entry.id !== layer.id ? structuredClone(entry) : { ...structuredClone(entry), weights: entry.weights.map((weight, index) => Math.max(0, Math.min(1, weight + (settings.mode === 'erase' ? -1 : 1) * Math.min(1, settings.strength) * weightAt(terrain, index, point, settings)))) });
}

/** Resampling preserves both height and paint masks when changing mesh detail. */
export function resampleTerrain(terrain, segments) {
  if (!Number.isInteger(segments) || segments < 2 || segments > 64) throw new ValidationError('O terreno aceita de 2 a 64 divisões por eixo.');
  const sample = values => Array.from({ length: (segments + 1) ** 2 }, (_, index) => {
    const x = index % (segments + 1) / segments * terrain.segments, z = Math.floor(index / (segments + 1)) / segments * terrain.segments;
    const x0 = Math.floor(x), z0 = Math.floor(z), x1 = Math.min(terrain.segments, x0 + 1), z1 = Math.min(terrain.segments, z0 + 1), tx = x - x0, tz = z - z0;
    const at = (x, z) => values[z * (terrain.segments + 1) + x];
    return (at(x0,z0) * (1-tx) + at(x1,z0) * tx) * (1-tz) + (at(x0,z1) * (1-tx) + at(x1,z1) * tx) * tz;
  });
  return { segments, heights: sample(terrain.heights), ...(terrain.paintLayers ? { paintLayers: terrain.paintLayers.map(layer => ({ ...structuredClone(layer), weights: sample(layer.weights) })) } : {}) };
}
