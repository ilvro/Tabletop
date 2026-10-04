/** World coordinates are metres, with Y up. Snap never changes height. */
export function quaternionFromYaw(degrees) {
  const half = degrees * Math.PI / 360;
  return [0, Math.sin(half), 0, Math.cos(half)];
}

export function yawFromQuaternion([x, y, z, w]) {
  return Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + z * z)) * 180 / Math.PI;
}

export function multiplyQuaternions([ax, ay, az, aw], [bx, by, bz, bw]) {
  return [aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz];
}

/** Footprints are physical metres; non-cell multiples use pivot snapping. */
export function snapPosition(position, grid, footprint) {
  if (!grid.snap) return [...position];
  const { cellSize: step, origin } = grid;
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('A célula deve ser positiva.');
  const result = [...position];
  for (const [axis, index] of [[0, 0], [2, 1]]) {
    const cells = footprint?.[index] / step;
    const offset = Number.isFinite(cells) && Math.abs(cells - Math.round(cells)) < 1e-8 ? cells / 2 : 0;
    // floor(+0.5) consistently chooses the greater index at a tie, including negatives.
    result[axis] = origin[index] + step * (Math.floor((position[axis] - origin[index]) / step - offset + 0.5) + offset);
  }
  return result;
}

export function rotateXZ(position, degrees) {
  const angle = degrees * Math.PI / 180;
  const c = Math.cos(angle), s = Math.sin(angle);
  return [position[0] * c + position[2] * s, position[1], -position[0] * s + position[2] * c];
}
