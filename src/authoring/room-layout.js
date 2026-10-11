import { rotateXZ, yawFromQuaternion, quaternionFromYaw, multiplyQuaternions } from '../domain/coords.js';
import { floorContour, worldPoint, localPoint } from '../domain/geometry.js';

/**
 * Reads a room the way a decorator would: where the walls, corners, doors and
 * windows are. Everything is in the area's own frame (metres, X/Z, yaw removed)
 * so recipes can speak of walls and fronts instead of coordinates.
 * Models face +Z; a yaw of θ degrees turns that front towards (sin θ, cos θ).
 */
export function stableRandom(seed, slot) {
  let hash = seed >>> 0;
  for (const character of slot) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return hash / 4294967296;
}
/** `stableRandom` moves little between similar names; scattering needs every bit to count. */
function random(seed, slot) {
  let hash = Math.floor(stableRandom(seed, slot) * 4294967296);
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x85ebca6b); hash ^= hash >>> 13; hash = Math.imul(hash, 0xc2b2ae35); hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1], cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export const facing = ([x, z]) => Math.atan2(x, z) * 180 / Math.PI;
export const forward = yaw => { const v = rotateXZ([0, 0, 1], yaw); return [v[0], v[2]]; };
export const rightOf = yaw => { const v = rotateXZ([1, 0, 0], yaw); return [v[0], v[2]]; };

export function roomFrame(document, floor, area) {
  const yaw = yawFromQuaternion(area.transform.rotation), origin = area.transform.position;
  const toLocal = ([x, , z]) => { const v = rotateXZ([x - origin[0], 0, z - origin[2]], -yaw); return [v[0], v[2]]; };
  const contour = floorContour(floor).map(([x, z]) => toLocal(worldPoint(floor, [x, 0, z])));
  const signed = contour.reduce((sum, p, i) => sum + cross(p, contour[(i + 1) % contour.length]), 0);
  const entities = Object.values(document.layout.entities);
  const walls = entities.filter(e => e.kind === 'wall' && (e.surfaceId === floor.id || e.floorIds?.includes(floor.id))).map(wall => {
    const start = toLocal(wall.transform.position), end = toLocal(worldPoint(wall, [wall.length, 0, 0]));
    return { wall, start, end, mid: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], dir: sub(end, start).map(v => v / wall.length) };
  });
  const openings = entities.filter(e => ['door', 'window'].includes(e.kind)).map(opening => {
    const host = walls.find(w => w.wall.id === opening.wallId);
    return host && { opening, host, point: add(host.start, host.dir, opening.offset) };
  }).filter(Boolean);
  const edges = contour.map((a, i) => {
    const b = contour[(i + 1) % contour.length], length = Math.hypot(...sub(b, a)), dir = sub(b, a).map(v => v / length);
    // The interior is on the left of a counter-clockwise contour.
    const normal = signed > 0 ? [-dir[1], dir[0]] : [dir[1], -dir[0]];
    const edge = { index: i, a, b, dir, normal, length, inset: .03, doors: [], windows: [] };
    for (const { wall, mid } of walls.filter(w => Math.abs(cross(w.dir, dir)) < .1)) {
      const along = dot(sub(mid, a), dir), depth = dot(sub(mid, a), normal);
      if (along < -wall.length / 2 || along > length + wall.length / 2 || Math.abs(depth) > .8) continue;
      if (depth + wall.thickness / 2 + .01 >= edge.inset) edge.wall = wall;
      edge.inset = Math.max(edge.inset, depth + wall.thickness / 2 + .01);
      for (const { opening, point } of openings.filter(o => o.host.wall === wall)) {
        const t = dot(sub(point, a), dir), span = [t - opening.width / 2, t + opening.width / 2];
        if (opening.kind === 'door') edge.doors.push(span); else edge.windows.push([...span, opening.sill ?? .9]);
      }
    }
    return edge;
  }).filter(edge => edge.length > .2);
  const xs = contour.map(p => p[0]), zs = contour.map(p => p[1]);
  return { yaw, toLocal, contour, edges, doors: openings.filter(o => o.opening.kind === 'door').map(o => o.point),
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }, width: area.width, length: area.length };
}

/**
 * Hangs a piece on a wall face so it follows the wall: the socket, and the
 * exact pose the document will derive from it. `position` is where the piece
 * was meant to be; `lift` its height on the wall.
 */
export function wallSocket(wall, position, lift) {
  const local = localPoint(wall, position), far = local[2] < 0, offset = [Math.max(0, Math.min(wall.length, local[0])), Math.max(0, Math.min(wall.height, lift)), local[2]];
  const turn = quaternionFromYaw(180);
  return { anchor: { hostId: wall.id, socket: 'wall', offset, ...(far ? { rotation: turn } : {}) }, position: worldPoint(wall, offset), rotation: far ? multiplyQuaternions(wall.transform.rotation, turn) : [...wall.transform.rotation] };
}
const overlaps = (spans, from, to) => spans.some(([a, b]) => from < b && to > a);
/** Edges in the order a rule prefers them; the seed breaks ties and offers variations. */
function rankEdges(frame, rule, placed, seed, slot) {
  const longest = Math.max(...frame.edges.map(e => e.length));
  const doorDistance = edge => frame.doors.length ? Math.min(...frame.doors.map(door => Math.hypot(...sub(add(edge.a, edge.dir, edge.length / 2), door)))) : 0;
  const farthest = Math.max(1, ...frame.edges.map(doorDistance));
  const reference = rule.of ? placed.get(rule.of) : null;
  return frame.edges.map(edge => {
    let score = random(seed, `${slot}/wall/${edge.index}`) * .3;
    // The wall with the door is the last choice for the main pieces.
    if (rule.prefer === 'long') score += edge.length / longest - (edge.doors.length ? .35 : 0);
    else if (rule.prefer === 'short') score += 1 - edge.length / longest;
    else if (rule.prefer === 'far') score += doorDistance(edge) / farthest;
    else if (rule.prefer === 'door') score += 1 - doorDistance(edge) / farthest;
    else if (rule.prefer === 'window') score += edge.windows.length ? 1 : 0;
    // Opposite: the wall the reference looks at. Same: the wall behind it.
    else if (reference && rule.prefer === 'opposite') score += -dot(edge.normal, forward(reference.rotation));
    else if (reference && rule.prefer === 'same') score += dot(edge.normal, forward(reference.rotation));
    return { edge, score };
  }).sort((a, b) => b.score - a.score).map(entry => entry.edge);
}

/**
 * Candidate poses `{x, z, rotation}` for one recipe item, best first. The
 * caller keeps the first that is free; items that depend on a missing
 * reference get none.
 */
export function* candidates(rule, { frame, placed, seed, slot, asset, index = 0, total = 1 }) {
  // A piece turned sideways meets the wall with its other side.
  const sideways = ['wall', 'corner'].includes(rule.at) && Math.abs((rule.turn ?? 0) % 180) === 90 || rule.at === 'grid' && Math.abs((rule.rotation ?? 180) % 180) === 90;
  const [fw, fd] = sideways ? [asset.footprint[1], asset.footprint[0]] : asset.footprint, height = asset.bounds?.[1] ?? 1, gap = rule.gap ?? .04;
  const host = rule.of ? placed.get(rule.of) : null;
  if (rule.of && !host && !['wall', 'corner'].includes(rule.at)) return;
  if (rule.at === 'wall') {
    for (const edge of rankEdges(frame, rule, placed, seed, slot)) {
      const margin = .12, from = fw / 2 + margin, to = edge.length - fw / 2 - margin;
      if (to < from) continue;
      const stops = []; for (let t = from; t <= to + 1e-9; t += .2) stops.push(t);
      if (stops.at(-1) < to - .01) stops.push(to);
      // Several of a kind spread along the wall; one alone sits where the rule says.
      const target = total > 1 ? from + (to - from) * (index + .5) / total
        : rule.align === 'start' ? (random(seed, `${slot}/end`) < .5 ? from : to) : (from + to) / 2;
      stops.sort((p, q) => Math.abs(p - target) - Math.abs(q - target));
      for (const t of stops) {
        if (overlaps(edge.doors, t - fw / 2 - .1, t + fw / 2 + .1)) continue;
        if (overlaps(edge.windows.filter(([, , sill]) => height > sill), t - fw / 2, t + fw / 2)) continue;
        const point = add(add(edge.a, edge.dir, t), edge.normal, edge.inset + fd / 2 + gap);
        yield { x: point[0], z: point[1], rotation: facing(edge.normal) + (rule.turn ?? 0), wall: edge.wall };
      }
    }
  } else if (rule.at === 'corner') {
    const corners = [];
    for (const edge of frame.edges) for (const end of [0, 1]) {
      const other = frame.edges.find(e => e !== edge && Math.hypot(...sub(end ? e.a : e.b, end ? edge.b : edge.a)) < 1e-6);
      if (!other || Math.abs(dot(other.normal, edge.normal)) > .5) continue;
      const along = end ? edge.dir.map(v => -v) : edge.dir, corner = end ? edge.b : edge.a;
      const point = add(add(corner, along, other.inset + fw / 2 + gap), edge.normal, edge.inset + fd / 2 + gap);
      corners.push({ x: point[0], z: point[1], rotation: facing(edge.normal) + (rule.turn ?? 0), order: random(seed, `${slot}/corner/${edge.index}/${end}`) });
    }
    yield* corners.sort((a, b) => a.order - b.order);
  } else if (rule.at === 'center') {
    const base = [(rule.dx ?? 0) * frame.width / 2, (rule.dz ?? 0) * frame.length / 2], rotation = rule.rotation ?? (frame.width >= frame.length ? 0 : 90);
    for (const [dx, dz] of [[0, 0], [.4, 0], [-.4, 0], [0, .4], [0, -.4], [.8, 0], [-.8, 0], [0, .8], [0, -.8], [.4, .4], [-.4, -.4]]) yield { x: base[0] + dx, z: base[1] + dz, rotation };
  } else if (rule.at === 'front' || rule.at === 'behind') {
    const sign = rule.at === 'front' ? 1 : -1, f = forward(host.rotation), r = rightOf(host.rotation);
    const distance = host.depth / 2 + (rule.gap ?? .1) + fd / 2;
    const rotation = host.rotation + ({ toward: sign > 0 ? 180 : 0, away: sign > 0 ? 0 : 180, same: 0 }[rule.face ?? 'toward']);
    const spread = total > 1 ? (index - (total - 1) / 2) * (fw + .22) : rule.shift ?? 0;
    for (const shift of total > 1 ? [spread] : [spread, .25, -.25, .5, -.5]) for (const extra of [0, .2]) {
      const point = add(add([host.x, host.z], f, sign * (distance + extra)), r, shift);
      yield { x: point[0], z: point[1], rotation };
    }
  } else if (rule.at === 'beside') {
    const f = forward(host.rotation), r = rightOf(host.rotation), first = rule.side ?? (random(seed, `${slot}/side`) < .5 ? 1 : -1);
    for (const side of [first, -first]) for (const extra of [0, .15, .3]) {
      // Backs stay flush, as furniture along a wall does.
      const point = add(add([host.x, host.z], r, side * (host.width / 2 + (rule.gap ?? .06) + fw / 2 + extra)), f, (fd - host.depth) / 2);
      yield { x: point[0], z: point[1], rotation: host.rotation + (rule.turn ?? 0) };
    }
  } else if (rule.at === 'around') {
    const f = forward(host.rotation), r = rightOf(host.rotation), seats = [];
    const perSide = Math.max(1, Math.floor(host.width / .7)), reach = host.depth / 2 + .12 + fd / 2;
    // Fill both long sides in turns, then the two heads.
    for (let i = 0; i < perSide; i++) for (const side of [1, -1]) {
      const along = (((i % 2 ? -1 : 1) * Math.ceil(i / 2)) + (perSide % 2 ? 0 : .5)) * (host.width / perSide);
      seats.push({ point: add(add([host.x, host.z], r, along), f, side * reach), rotation: host.rotation + (side > 0 ? 180 : 0) });
    }
    for (const side of [1, -1]) seats.push({ point: add([host.x, host.z], r, side * (host.width / 2 + .12 + fd / 2)), rotation: host.rotation + (side > 0 ? -90 : 90) });
    const seat = seats[index]; if (seat) yield { x: seat.point[0], z: seat.point[1], rotation: seat.rotation };
  } else if (rule.at === 'ring') {
    const radius = Math.max(host.width, host.depth) / 2 + .1 + fd / 2, angle = 360 * (index + random(seed, `${rule.of}/ring`)) / total, out = forward(angle);
    yield { x: host.x + out[0] * radius, z: host.z + out[1] * radius, rotation: angle + 180 };
  } else if (rule.at === 'on') {
    const f = forward(host.rotation), r = rightOf(host.rotation);
    for (const [u, v] of [[rule.u ?? 0, rule.v ?? 0], [0, 0]]) {
      const point = add(add([host.x, host.z], r, u * Math.max(0, host.width - fw) / 2), f, v * Math.max(0, host.depth - fd) / 2);
      yield { x: point[0], z: point[1], rotation: host.rotation + (rule.turn ?? (random(seed, `${slot}/turn`) - .5) * 30), on: host };
    }
  } else if (rule.at === 'under') {
    const f = forward(host.rotation), point = add([host.x, host.z], f, rule.shift ?? 0);
    yield { x: point[0], z: point[1], rotation: host.rotation + (rule.turn ?? 0) };
  } else if (rule.at === 'grid') {
    // Rows facing one way with an aisle, as pews and school desks stand.
    const columns = rule.columns ?? Math.max(1, Math.floor((frame.width - 1.2) / (fw + (rule.spacingX ?? .5)))), stepX = fw + (rule.spacingX ?? .5), stepZ = fd + (rule.spacingZ ?? .7);
    const column = index % columns, row = Math.floor(index / columns), aisle = rule.aisle && columns > 1 ? (column < columns / 2 ? -rule.aisle / 2 : rule.aisle / 2) : 0;
    const z = (rule.dz ?? -.2) * frame.length / 2 + row * stepZ;
    if (z + fd / 2 < frame.length / 2 - .3) yield { x: (column - (columns - 1) / 2) * stepX + aisle, z, rotation: (rule.rotation ?? 180) + (random(seed, `${slot}/jitter`) - .5) * 2 * (rule.jitter ?? 0) };
  } else if (rule.at === 'free') {
    const { minX, maxX, minZ, maxZ } = frame.bounds;
    for (let attempt = 0; attempt < 40; attempt++) yield {
      x: minX + .4 + random(seed, `${slot}/x/${attempt}`) * Math.max(0, maxX - minX - .8),
      z: minZ + .4 + random(seed, `${slot}/z/${attempt}`) * Math.max(0, maxZ - minZ - .8),
      // Loose pieces stay roughly square to the room, as people leave them.
      rotation: rule.rotation ?? Math.floor(random(seed, `${slot}/r/${attempt}`) * 4) * 90 + (random(seed, `${slot}/j/${attempt}`) - .5) * 24,
    };
  }
}
