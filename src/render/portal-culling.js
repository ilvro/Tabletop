import * as THREE from 'three';
import { floorContour, pointInPolygon, worldPoint } from '../domain/geometry.js';

const BOX_EDGES = [
  [0, 1], [1, 3], [3, 2], [2, 0],
  [4, 5], [5, 7], [7, 6], [6, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

const clipX = new Float64Array(8);
const clipY = new Float64Array(8);
const clipW = new Float64Array(8);
const projScreenMatrix = new THREE.Matrix4();
const tempBox = new THREE.Box3();
const tempCenter = new THREE.Vector3();

/** Projects a 3D world Box3 to a 2D NDC rectangle [minX, minY, maxX, maxY], clipping against the near plane. */
export function projectBoxNDC(box, vpMatrix, camPos) {
  if (
    camPos.x >= box.min.x - 0.35 && camPos.x <= box.max.x + 0.35 &&
    camPos.y >= box.min.y - 0.35 && camPos.y <= box.max.y + 0.35 &&
    camPos.z >= box.min.z - 0.35 && camPos.z <= box.max.z + 0.35
  ) {
    return [-1, -1, 1, 1];
  }
  const e = vpMatrix.elements;
  let front = 0, back = 0;
  for (let i = 0; i < 8; i++) {
    const x = (i & 1) ? box.max.x : box.min.x;
    const y = (i & 2) ? box.max.y : box.min.y;
    const z = (i & 4) ? box.max.z : box.min.z;
    clipX[i] = e[0] * x + e[4] * y + e[8] * z + e[12];
    clipY[i] = e[1] * x + e[5] * y + e[9] * z + e[13];
    clipW[i] = e[3] * x + e[7] * y + e[11] * z + e[15];
    if (clipW[i] >= 1e-3) front++; else back++;
  }
  if (front === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    if (clipW[i] >= 1e-3) {
      const nx = clipX[i] / clipW[i], ny = clipY[i] / clipW[i];
      if (nx < minX) minX = nx;
      if (nx > maxX) maxX = nx;
      if (ny < minY) minY = ny;
      if (ny > maxY) maxY = ny;
    }
  }
  if (back > 0) {
    for (let k = 0; k < BOX_EDGES.length; k++) {
      const a = BOX_EDGES[k][0], b = BOX_EDGES[k][1];
      if ((clipW[a] >= 1e-3) !== (clipW[b] >= 1e-3)) {
        const t = (1e-3 - clipW[a]) / (clipW[b] - clipW[a]);
        const nx = (clipX[a] + t * (clipX[b] - clipX[a])) / 1e-3;
        const ny = (clipY[a] + t * (clipY[b] - clipY[a])) / 1e-3;
        if (nx < minX) minX = nx;
        if (nx > maxX) maxX = nx;
        if (ny < minY) minY = ny;
        if (ny > maxY) maxY = ny;
      }
    }
  }
  return [minX, minY, maxX, maxY];
}

function pointNearPolygon([x, z], contour, margin = 0.45) {
  if (pointInPolygon([x, z], contour)) return true;
  const mSq = margin * margin;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i], b = contour[(i + 1) % contour.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], lenSq = dx * dx + dz * dz;
    const t = lenSq > 1e-8 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / lenSq)) : 0;
    const px = a[0] + dx * t - x, pz = a[1] + dz * t - z;
    if (px * px + pz * pz <= mSq) return true;
  }
  return false;
}

/**
 * Room-based portal culling for the main colour pass.
 *
 * Builds room cells from enclosed floors and links them by portals (doors,
 * windows, openings and wall gaps). During `begin(camera)` / `end()`, objects
 * belonging exclusively to unreached rooms are temporarily marked `visible = false`
 * and restored immediately after the colour pass so shadow maps, zone probes,
 * picking and authoring are unaffected.
 */
export function createPortalCulling() {
  let cells = [], floorToCell = new Map(), entryById = new Map(), entries = [];
  let visibleFlags = new Uint8Array(0), portalCount = 0, lastCulled = 0, lastCellName = null;
  const hidden = [];
  let currentDoc = null;

  function cellsNearBox(box, marginXZ = 1.1, marginY = 0.5) {
    const result = [];
    const cx = (box.min.x + box.max.x) * 0.5, cz = (box.min.z + box.max.z) * 0.5;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (
        box.max.x >= c.minX - marginXZ && box.min.x <= c.maxX + marginXZ &&
        box.max.z >= c.minZ - marginXZ && box.min.z <= c.maxZ + marginXZ &&
        box.max.y >= c.minY - marginY && box.min.y <= c.maxY + marginY &&
        pointNearPolygon([cx, cz], c.contour, marginXZ)
      ) {
        result.push(c);
      }
    }
    return result;
  }

  function addPortal(cellA, cellB, box) {
    cellA.portals.push({ target: cellB, box });
    if (cellB) cellB.portals.push({ target: cellA, box });
    portalCount++;
  }

  function hostFloorId(entities, record) {
    let cur = record, depth = 0;
    while (cur && depth++ < 8) {
      if (cur.kind === 'floor' && floorToCell.has(cur.id)) return cur.id;
      const nextId = cur.surfaceId ?? cur.wallId ?? cur.anchor?.hostId;
      cur = nextId ? entities[nextId] : null;
    }
    return null;
  }

  function classifyEntity(record, object) {
    if (!record || !object || record.kind === 'terrain' || !cells.length) return null;
    const entities = currentDoc?.layout?.entities ?? {};
    const matched = new Set();
    let isExterior = false;

    const floorId = hostFloorId(entities, record);
    if (floorId !== null) matched.add(floorToCell.get(floorId));

    if (record.kind === 'wall') {
      if (record.surfaceId && floorToCell.has(record.surfaceId)) matched.add(floorToCell.get(record.surfaceId));
      for (const fid of record.floorIds ?? []) if (floorToCell.has(fid)) matched.add(floorToCell.get(fid));
      const a = record.transform.position, b = worldPoint(record, [record.length, 0, 0]);
      const mid = [(a[0] + b[0]) * 0.5, a[1] + record.height * 0.5, (a[2] + b[2]) * 0.5];
      for (const pt of [a, b, mid]) {
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          if (
            pt[0] >= c.minX - 0.65 && pt[0] <= c.maxX + 0.65 &&
            pt[2] >= c.minZ - 0.65 && pt[2] <= c.maxZ + 0.65 &&
            a[1] + record.height >= c.minY - 0.3 && a[1] <= c.maxY + 0.5 &&
            pointNearPolygon([pt[0], pt[2]], c.contour, 0.65)
          ) {
            matched.add(i);
          }
        }
      }
      if (matched.size <= 1) isExterior = true;
    } else if (record.wallId) {
      const w = entities[record.wallId];
      if (w) {
        const sill = record.sill ?? 0;
        const center = worldPoint(w, [record.offset, sill + (record.height ?? 2) * 0.5, 0]);
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          if (
            center[0] >= c.minX - 1.1 && center[0] <= c.maxX + 1.1 &&
            center[2] >= c.minZ - 1.1 && center[2] <= c.maxZ + 1.1 &&
            center[1] >= c.minY - 0.5 && center[1] <= c.maxY + 0.5 &&
            pointNearPolygon([center[0], center[2]], c.contour, 1.1)
          ) {
            matched.add(i);
          }
        }
        if (matched.size <= 1) isExterior = true;
      }
    } else {
      tempBox.makeEmpty();
      object.updateWorldMatrix(true, true);
      tempBox.setFromObject(object);
      if (tempBox.isEmpty()) {
        const p = record.transform?.position ?? [0, 0, 0];
        const hw = (record.width ?? 1) * 0.5, hl = (record.length ?? 1) * 0.5, hh = (record.height ?? 1) * 0.5;
        tempBox.min.set(p[0] - hw, p[1], p[2] - hl);
        tempBox.max.set(p[0] + hw, p[1] + hh * 2, p[2] + hl);
      }
      tempBox.getCenter(tempCenter);
      const pos = record.transform?.position ?? [tempCenter.x, tempCenter.y, tempCenter.z];
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (
          tempBox.max.x >= c.minX + 0.05 && tempBox.min.x <= c.maxX - 0.05 &&
          tempBox.max.z >= c.minZ + 0.05 && tempBox.min.z <= c.maxZ - 0.05 &&
          tempBox.max.y >= c.minY - 0.3 && tempBox.min.y <= c.maxY + 0.65
        ) {
          const sampleX = Math.max(c.minX, Math.min(c.maxX, tempCenter.x));
          const sampleZ = Math.max(c.minZ, Math.min(c.maxZ, tempCenter.z));
          if (pointNearPolygon([sampleX, sampleZ], c.contour, 0.25) || pointNearPolygon([pos[0], pos[2]], c.contour, 0.25)) {
            matched.add(i);
          }
        }
      }
      if (!matched.size) isExterior = true;
      else if (tempBox.max.y > Math.max(...[...matched].map(idx => cells[idx].maxY)) + 1.2) {
        isExterior = true;
      }
    }

    const list = [...matched];
    return {
      object,
      cell0: list.length ? list[0] : -1,
      extraCells: list.length > 1 ? list.slice(1) : null,
      isExterior,
    };
  }

  function cellAt(pos) {
    const x = pos.x ?? pos[0], y = pos.y ?? pos[1], z = pos.z ?? pos[2];
    let best = null;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (
        x >= c.minX - 0.45 && x <= c.maxX + 0.45 &&
        z >= c.minZ - 0.45 && z <= c.maxZ + 0.45 &&
        y >= c.minY - 0.5 && y <= c.maxY + 0.5 &&
        pointNearPolygon([x, z], c.contour, 0.45)
      ) {
        if (!best || c.area < best.area) best = c;
      }
    }
    return best;
  }

  return {
    setDocument(document, objects) {
      currentDoc = document;
      cells = [];
      floorToCell = new Map();
      entryById = new Map();
      entries = [];
      portalCount = 0;
      lastCulled = 0;
      lastCellName = null;
      if (!document?.layout?.entities) return;

      const entities = Object.values(document.layout.entities);
      const floors = entities.filter(e => e.kind === 'floor');
      const walls = entities.filter(e => e.kind === 'wall');
      const openings = entities.filter(e => e.wallId && (e.kind === 'door' || e.kind === 'window' || e.kind === 'opening'));

      const candidates = [];
      for (const f of floors) {
        const contour = floorContour(f).map(([x, z]) => {
          const p = worldPoint(f, [x, 0, z]);
          return [p[0], p[2]];
        });
        const cx = contour.reduce((s, p) => s + p[0], 0) / contour.length;
        const cz = contour.reduce((s, p) => s + p[1], 0) / contour.length;
        const minX = Math.min(...contour.map(p => p[0])), maxX = Math.max(...contour.map(p => p[0]));
        const minZ = Math.min(...contour.map(p => p[1])), maxZ = Math.max(...contour.map(p => p[1]));
        const y = f.transform.position[1];
        let totalPerim = 0, coveredPerim = 0;
        const edgeTops = [];

        for (let i = 0; i < contour.length; i++) {
          const a = contour[i], b = contour[(i + 1) % contour.length];
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (len < 1e-3) continue;
          totalPerim += len;
          const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
          let nx = -dz, nz = dx;
          if ((cx - a[0]) * nx + (cz - a[1]) * nz < 0) { nx = -nx; nz = -nz; }

          const aligned = [];
          const intervals = [];
          for (const w of walls) {
            if (w.length < 1e-3) continue;
            const wa = w.transform.position, wb = worldPoint(w, [w.length, 0, 0]);
            const wdx = (wb[0] - wa[0]) / w.length, wdz = (wb[2] - wa[2]) / w.length;
            if (Math.abs(dx * wdz - dz * wdx) > 0.25) continue;
            const signedPerp = ((wa[0] + wb[0]) * 0.5 - a[0]) * nx + ((wa[2] + wb[2]) * 0.5 - a[1]) * nz;
            if (signedPerp < -0.25 || signedPerp > 0.65) continue;
            const t0 = (wa[0] - a[0]) * dx + (wa[2] - a[1]) * dz;
            const t1 = (wb[0] - a[0]) * dx + (wb[2] - a[1]) * dz;
            const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(len, Math.max(t0, t1));
            if (hi - lo > 0.05) {
              aligned.push({ w, signedPerp, lo, hi });
              const wy = w.transform.position[1];
              if (wy <= y + 0.5 && wy + w.height >= y + 2.0) intervals.push([lo, hi]);
            }
          }
          intervals.sort((u, v) => u[0] - v[0]);
          let cur = 0;
          for (const [lo, hi] of intervals) {
            const s = Math.max(cur, lo);
            if (hi > s) { coveredPerim += hi - s; cur = hi; }
          }

          const ownAligned = aligned.some(item => item.signedPerp >= -0.05 && item.hi - item.lo > 0.5 && item.w.transform.position[1] <= y + 0.5)
            ? aligned.filter(item => item.signedPerp >= -0.05 && item.hi - item.lo > 0.5)
            : aligned.filter(item => item.hi - item.lo > 0.5);
          ownAligned.sort((u, v) => u.w.transform.position[1] - v.w.transform.position[1]);
          let edgeTop = -Infinity;
          for (const { w } of ownAligned) {
            const wy = w.transform.position[1];
            if (edgeTop === -Infinity) {
              if (wy <= y + 0.5 && wy + w.height >= y + 2.0) edgeTop = wy + w.height;
            } else if (wy <= edgeTop + 0.5 && wy + w.height > edgeTop) {
              edgeTop = wy + w.height;
            }
          }
          if (edgeTop > -Infinity) edgeTops.push(edgeTop);
        }

        const internalWalls = walls.filter(w => {
          const wy = w.transform.position[1];
          if (Math.abs(wy - y) > 0.5 || w.height < 2.5) return false;
          const wa = w.transform.position, wb = worldPoint(w, [w.length, 0, 0]);
          return wa[0] >= minX - 1 && wa[0] <= maxX + 1 && wa[2] >= minZ - 1 && wa[2] <= maxZ + 1 &&
                 wb[0] >= minX - 1 && wb[0] <= maxX + 1 && wb[2] >= minZ - 1 && wb[2] <= maxZ + 1;
        });
        let wallLoopLen = 0, internalTop = y + 3;
        for (const w of internalWalls) {
          wallLoopLen += w.length;
          internalTop = Math.max(internalTop, w.transform.position[1] + w.height);
        }

        edgeTops.sort((a, b) => a - b);
        const maxY = edgeTops.length ? edgeTops[Math.floor((edgeTops.length - 1) / 2)] : internalTop;
        const ratio = totalPerim > 0 ? Math.max(coveredPerim / totalPerim, wallLoopLen / (totalPerim * 0.75)) : 0;
        if (ratio >= 0.70) {
          candidates.push({
            id: f.id,
            floor: f,
            contour,
            minX,
            maxX,
            minZ,
            maxZ,
            minY: y,
            maxY,
            area: (maxX - minX) * (maxZ - minZ),
            hasZone: Boolean(f.lightingZone?.enabled),
            portals: [],
          });
        }
      }

      cells = candidates.filter((c, i) => !candidates.some((other, j) => {
        if (i === j) return false;
        const overlapX = Math.max(0, Math.min(c.maxX, other.maxX) - Math.max(c.minX, other.minX));
        const overlapZ = Math.max(0, Math.min(c.maxZ, other.maxZ) - Math.max(c.minZ, other.minZ));
        if (overlapX * overlapZ < c.area * 0.8) return false;
        if (c.minY < other.minY - 3.5 || c.minY > other.maxY - 0.5) return false;
        if (other.hasZone !== c.hasZone) return other.hasZone;
        if (Math.abs(other.area - c.area) > 1) return other.area > c.area;
        return j < i;
      }));

      cells.forEach((cell, idx) => {
        cell.index = idx;
        floorToCell.set(cell.id, idx);
      });

      for (const f of floors) {
        if (floorToCell.has(f.id)) continue;
        const [fx, fy, fz] = f.transform.position;
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          if (fx >= cell.minX - 0.2 && fx <= cell.maxX + 0.2 && fz >= cell.minZ - 0.2 && fz <= cell.maxZ + 0.2 && fy >= cell.minY - 4 && fy <= cell.maxY + 0.5) {
            cell.minY = Math.min(cell.minY, fy);
            floorToCell.set(f.id, i);
            break;
          }
        }
      }

      visibleFlags = new Uint8Array(cells.length);

      for (const op of openings) {
        const w = document.layout.entities[op.wallId];
        if (!w) continue;
        const sill = op.sill ?? 0;
        const corners = [
          worldPoint(w, [op.offset - op.width / 2 - 0.2, sill - 0.15, -w.thickness / 2 - 0.45]),
          worldPoint(w, [op.offset + op.width / 2 + 0.2, sill - 0.15, -w.thickness / 2 - 0.45]),
          worldPoint(w, [op.offset - op.width / 2 - 0.2, sill + op.height + 0.15, w.thickness / 2 + 0.45]),
          worldPoint(w, [op.offset + op.width / 2 + 0.2, sill + op.height + 0.15, w.thickness / 2 + 0.45]),
        ];
        const box = new THREE.Box3();
        for (const p of corners) box.expandByPoint(new THREE.Vector3(...p));
        const centerBox = new THREE.Box3().setFromCenterAndSize(box.getCenter(new THREE.Vector3()), new THREE.Vector3(0.2, 0.2, 0.2));
        const touched = cellsNearBox(centerBox, 1.1, 0.5);
        if (touched.length === 1) addPortal(touched[0], null, box);
        else if (touched.length >= 2) {
          for (let i = 0; i < touched.length; i++) for (let j = i + 1; j < touched.length; j++) addPortal(touched[i], touched[j], box);
        }
      }

      for (const cell of cells) {
        const { contour } = cell;
        for (let i = 0; i < contour.length; i++) {
          const a = contour[i], b = contour[(i + 1) % contour.length];
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (len < 1e-3) continue;
          const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
          const edgeWalls = walls.filter(w => {
            if (w.length < 1e-3) return false;
            const wa = w.transform.position, wb = worldPoint(w, [w.length, 0, 0]);
            const wdx = (wb[0] - wa[0]) / w.length, wdz = (wb[2] - wa[2]) / w.length;
            if (Math.abs(dx * wdz - dz * wdx) > 0.25) return false;
            const perp = Math.abs((wa[0] - a[0]) * (-dz) + (wa[2] - a[1]) * dx);
            return perp <= 0.85;
          });
          const baseFloorY = cell.floor.transform.position[1];
          const tiers = new Set([baseFloorY]);
          for (const w of edgeWalls) if (w.transform.position[1] >= baseFloorY + 2.0 && w.height >= 2.0) tiers.add(w.transform.position[1]);
          for (const tierY of tiers) {
            const tierWalls = edgeWalls.filter(w => {
              const wy = w.transform.position[1];
              return wy <= tierY + 0.6 && wy + w.height >= tierY + 2.0;
            });
            if (!tierWalls.length) continue;
            let gaps = [[0, len]], tierTop = tierY + 3.0;
            for (const w of tierWalls) {
              tierTop = Math.max(tierTop, w.transform.position[1] + w.height);
              const wa = w.transform.position, wb = worldPoint(w, [w.length, 0, 0]);
              const t0 = (wa[0] - a[0]) * dx + (wa[2] - a[1]) * dz;
              const t1 = (wb[0] - a[0]) * dx + (wb[2] - a[1]) * dz;
              const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(len, Math.max(t0, t1));
              if (hi - lo > 0.05) gaps = gaps.flatMap(([s, e]) => hi <= s || lo >= e ? [[s, e]] : [[s, Math.max(s, lo)], [Math.min(e, hi), e]]);
            }
            const covered = len - gaps.reduce((s, [u, v]) => s + (v - u), 0);
            if (covered < len * 0.25) continue;
            for (const [u, v] of gaps) {
              if (v - u < 0.75 || (u < 0.05 && v < 0.6) || (v > len - 0.05 && len - u < 0.6)) continue;
              const p0 = [a[0] + dx * u, tierY, a[1] + dz * u];
              const p1 = [a[0] + dx * v, tierTop, a[1] + dz * v];
              const box = new THREE.Box3();
              box.expandByPoint(new THREE.Vector3(p0[0] - 0.4, p0[1] - 0.2, p0[2] - 0.4));
              box.expandByPoint(new THREE.Vector3(p1[0] + 0.4, p1[1] + 0.2, p1[2] + 0.4));
              const midBox = new THREE.Box3().setFromCenterAndSize(box.getCenter(new THREE.Vector3()), new THREE.Vector3(0.2, 0.2, 0.2));
              const others = cellsNearBox(midBox, 1.1, 0.5).filter(c => c !== cell);
              if (!others.length) addPortal(cell, null, box);
              else for (const o of others) addPortal(cell, o, box);
            }
          }
        }
        // Entrance halls or open shafts without a single full ceiling slab may see exterior cliffs through ceiling openings.
        const hasFullCeiling = entities.some(e =>
          (e.kind === 'floor' && e.id !== cell.id && Math.abs(e.transform.position[1] - cell.maxY) <= 1.0 && (e.width ?? 0) * (e.length ?? 0) >= cell.area * 0.7) ||
          (e.kind === 'prop' && Math.abs(e.transform.position[1] - cell.maxY) <= 1.5 && (e.name?.startsWith('Teto') || e.name?.includes('Cobertura da nave')))
        );
        if (!hasFullCeiling) {
          addPortal(cell, null, new THREE.Box3(
            new THREE.Vector3(cell.minX, cell.maxY - 0.5, cell.minZ),
            new THREE.Vector3(cell.maxX, cell.maxY + 0.5, cell.maxZ),
          ));
        }
      }

      if (objects) {
        for (const [id, object] of objects) {
          const record = document.layout.entities[id];
          if (!record) continue;
          const entry = classifyEntity(record, object);
          if (entry) { entryById.set(id, entry); entries.push(entry); }
        }
      }
    },

    updateObject(id, record, object) {
      if (!cells.length || !record || !object) return;
      const next = classifyEntity(record, object);
      const prev = entryById.get(id);
      if (prev && next) {
        prev.object = next.object;
        prev.cell0 = next.cell0;
        prev.extraCells = next.extraCells;
        prev.isExterior = next.isExterior;
      } else if (next) {
        entryById.set(id, next);
        entries.push(next);
      }
    },

    begin(camera, { enabled = true, cutaway = false, roofsHidden = false, capturing = false } = {}) {
      lastCulled = 0;
      lastCellName = null;
      if (!enabled || cutaway || roofsHidden || capturing || !camera?.isPerspectiveCamera || !cells.length) return 0;

      const startCell = cellAt(camera.position);
      if (!startCell) return 0;
      lastCellName = startCell.floor.name;

      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      visibleFlags.fill(0);
      visibleFlags[startCell.index] = 1;

      const rects = new Map([[startCell.index, [-1, -1, 1, 1]]]);
      const queue = [{ cell: startCell, rect: [-1, -1, 1, 1], depth: 0 }];
      let exteriorVisible = false;

      // Also include any adjacent cell whose padded boundary contains the camera position
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (c !== startCell &&
          camera.position.x >= c.minX - 0.45 && camera.position.x <= c.maxX + 0.45 &&
          camera.position.z >= c.minZ - 0.45 && camera.position.z <= c.maxZ + 0.45 &&
          camera.position.y >= c.minY - 0.5 && camera.position.y <= c.maxY + 0.5 &&
          pointNearPolygon([camera.position.x, camera.position.z], c.contour, 0.45)
        ) {
          visibleFlags[c.index] = 1;
          rects.set(c.index, [-1, -1, 1, 1]);
          queue.push({ cell: c, rect: [-1, -1, 1, 1], depth: 0 });
        }
      }

      while (queue.length) {
        const { cell, rect, depth } = queue.shift();
        if (depth >= 6) continue;
        const portals = cell.portals;
        for (let i = 0; i < portals.length; i++) {
          const portal = portals[i];
          const pRect = projectBoxNDC(portal.box, projScreenMatrix, camera.position);
          if (!pRect) continue;
          const nx0 = Math.max(rect[0], pRect[0]), ny0 = Math.max(rect[1], pRect[1]);
          const nx1 = Math.min(rect[2], pRect[2]), ny1 = Math.min(rect[3], pRect[3]);
          if (nx0 >= nx1 || ny0 >= ny1) continue;
          if (!portal.target) { exteriorVisible = true; continue; }
          const idx = portal.target.index;
          const prev = rects.get(idx);
          if (!prev) {
            const nextRect = [nx0, ny0, nx1, ny1];
            visibleFlags[idx] = 1;
            rects.set(idx, nextRect);
            queue.push({ cell: portal.target, rect: nextRect, depth: depth + 1 });
          } else {
            const ux0 = Math.min(prev[0], nx0), uy0 = Math.min(prev[1], ny0);
            const ux1 = Math.max(prev[2], nx1), uy1 = Math.max(prev[3], ny1);
            if (ux0 < prev[0] - 1e-3 || uy0 < prev[1] - 1e-3 || ux1 > prev[2] + 1e-3 || uy1 > prev[3] + 1e-3) {
              const nextRect = [ux0, uy0, ux1, uy1];
              rects.set(idx, nextRect);
              queue.push({ cell: portal.target, rect: nextRect, depth: depth + 1 });
            }
          }
        }
      }

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const obj = entry.object;
        if (!obj.visible) continue;
        let vis = (entry.cell0 >= 0 && visibleFlags[entry.cell0] === 1) || (entry.isExterior && exteriorVisible);
        if (!vis && entry.extraCells) {
          for (let j = 0; j < entry.extraCells.length; j++) {
            if (visibleFlags[entry.extraCells[j]] === 1) { vis = true; break; }
          }
        }
        if (!vis) {
          hidden.push(obj);
          obj.visible = false;
        }
      }
      lastCulled = hidden.length;
      return lastCulled;
    },

    pause() {
      for (let i = 0; i < hidden.length; i++) hidden[i].visible = true;
    },

    resume() {
      for (let i = 0; i < hidden.length; i++) hidden[i].visible = false;
    },

    end() {
      for (let i = 0; i < hidden.length; i++) hidden[i].visible = true;
      hidden.length = 0;
    },

    info() {
      let visibleCount = 0;
      for (let i = 0; i < visibleFlags.length; i++) if (visibleFlags[i]) visibleCount++;
      return {
        cells: cells.length,
        visibleCells: visibleCount,
        portals: portalCount,
        culled: lastCulled,
        activeCell: lastCellName,
      };
    },
  };
}
