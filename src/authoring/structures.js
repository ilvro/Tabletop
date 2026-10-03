import { createEntity, id, clone } from '../domain/documents.js';
import { floorContour, worldPoint, localPoint, isLocked } from '../domain/geometry.js';
import { quaternionFromYaw } from '../domain/coords.js';
import { ValidationError } from '../domain/validation.js';

export function proposeContourWalls(document, { floorId, height = 2.6, thickness = .18, includeHoles = false } = {}, expectedEditVersion = 0) {
  const floor = document.layout.entities[floorId];
  if (floor?.kind !== 'floor' || isLocked(document, floor)) throw new ValidationError('Selecione um piso desbloqueado.');
  if (![height, thickness].every(v => Number.isFinite(v) && v > 0)) throw new ValidationError('Medidas de parede inválidas.');
  const proposal = { id: id(), expectedEditVersion, label: 'Construir paredes do contorno', entities: [], groups: [], lights: [], updates: [], removals: [], report: { kept: [], suppressed: [], omissions: [], conflicts: [] } };
  const existing = Object.values(document.layout.entities).filter(e => e.kind === 'wall');
  for (const ring of [floorContour(floor), ...(includeHoles ? floor.holes ?? [] : [])]) for (let i = 0; i < ring.length; i++) {
    const a = worldPoint(floor, [ring[i][0], 0, ring[i][1]]), b = worldPoint(floor, [ring[(i + 1) % ring.length][0], 0, ring[(i + 1) % ring.length][1]]);
    const length = Math.hypot(b[0] - a[0], b[2] - a[2]), dx = (b[0] - a[0]) / length, dz = (b[2] - a[2]) / length;
    let intervals = [[0, length]];
    // Reuse every covered collinear interval, including partial shared walls.
    for (const wall of existing) {
      if (Math.abs(wall.transform.position[1] - a[1]) > 1e-6) continue;
      const c = wall.transform.position, d = worldPoint(wall, [wall.length, 0, 0]);
      const side = p => (p[0] - a[0]) * dz - (p[2] - a[2]) * dx;
      if (Math.abs(side(c)) > 1e-6 || Math.abs(side(d)) > 1e-6) continue;
      const project = p => (p[0] - a[0]) * dx + (p[2] - a[2]) * dz;
      const lo = Math.max(0, Math.min(project(c), project(d))), hi = Math.min(length, Math.max(project(c), project(d)));
      if (hi - lo < 1e-6) continue;
      intervals = intervals.flatMap(([start, end]) => hi <= start || lo >= end ? [[start, end]] : [[start, Math.max(start, lo)], [Math.min(end, hi), end]].filter(([x, y]) => y - x > 1e-6));
      proposal.report.kept.push(wall.id);
      if (Math.abs(wall.height - height) > 1e-6 || Math.abs(wall.thickness - thickness) > 1e-6) proposal.report.conflicts.push(`${wall.name}: parede compartilhada conserva altura e espessura existentes.`);
      if (!isLocked(document, wall)) {
        let update = proposal.updates.find(u => u.id === wall.id);
        if (!update) { update = { kind: 'entity', id: wall.id, patch: { floorIds: clone(wall.floorIds ?? (wall.surfaceId ? [wall.surfaceId] : [])), surfaceId: null } }; proposal.updates.push(update); }
        if (!update.patch.floorIds.includes(floor.id)) update.patch.floorIds.push(floor.id);
      } else proposal.report.conflicts.push(`${wall.name}: vínculo compartilhado preservado sem editar a parede bloqueada.`);
    }
    for (const [start, end] of intervals) {
      const wall = createEntity('wall', { name: `Parede · ${floor.name} · ${i + 1}`, position: [a[0] + dx * start, a[1], a[2] + dz * start],
        rotation: quaternionFromYaw(Math.atan2(-dz, dx) * 180 / Math.PI), length: end - start, height, thickness, floorIds: [floor.id], levelId: floor.levelId ?? null, layerId: floor.layerId ?? null, audience: floor.audience, groupId: floor.groupId });
      proposal.entities.push(wall); existing.push(wall);
    }
  }
  return proposal;
}

/** Local wall footprint with bounded mitres and butt joints at T intersections. */
export function wallJoinProfile(wall, walls) {
  const half = wall.thickness / 2, profile = [[0, -half], [wall.length, -half], [wall.length, half], [0, half]];
  for (const end of [0, 1]) {
    const point = worldPoint(wall, [end ? wall.length : 0, 0, 0]);
    const neighbors = walls.filter(other => other.id !== wall.id && Math.abs(other.transform.position[1] - point[1]) < 1e-6).map(other => ({ other, p: localPoint(other, point) })).filter(({ other, p }) => Math.abs(p[2]) < 1e-6 && p[0] >= -1e-6 && p[0] <= other.length + 1e-6);
    if (!neighbors.length) continue;
    const { other, p } = neighbors.sort((a, b) => a.other.id.localeCompare(b.other.id))[0];
    const o = localPoint(wall, other.transform.position), q = localPoint(wall, worldPoint(other, [other.length, 0, 0]));
    const ux = (q[0] - o[0]) / other.length, uz = (q[2] - o[2]) / other.length;
    if (Math.abs(uz) < 1e-6) continue;
    const t = other.thickness / 2, isT = p[0] > 1e-6 && p[0] < other.length - 1e-6;
    const inward = end ? -1 : 1;
    for (const index of end ? [1, 2] : [0, 3]) {
      const z = profile[index][1];
      let x;
      if (isT) x = (ux * (z - o[2]) + Math.sign(uz) * inward * t) / uz + o[0];
      else {
        // Bisector meeting: match corresponding outside sides on both wall rays.
        const direction = p[0] < 1e-6 ? 1 : -1;
        const sign = Math.sign(z) * Math.sign(uz * direction) * inward;
        x = (ux * (z - o[2]) + sign * t) / uz + o[0];
      }
      const base = end ? wall.length : 0;
      if (Math.abs(x - base) <= Math.min(wall.length / 3, Math.max(wall.thickness, other.thickness) * 4)) profile[index][0] = x;
    }
  }
  return profile;
}

export function clipWallProfile(polygon, min, max) {
  let result = polygon;
  for (const [bound, sign] of [[min, 1], [max, -1]]) {
    const input = result; result = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i + 1) % input.length], insideA = sign * (a[0] - bound) >= -1e-8, insideB = sign * (b[0] - bound) >= -1e-8;
      if (insideA) result.push(a);
      if (insideA !== insideB) { const t = (bound - a[0]) / (b[0] - a[0]); result.push([bound, a[1] + (b[1] - a[1]) * t]); }
    }
  }
  return result;
}
