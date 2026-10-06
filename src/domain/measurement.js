/** Physical distances in world metres (Y up), independent of combat rules. */
export function measureDistance(start, end, cellSize) {
  for (const point of [start, end]) {
    if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)) throw new TypeError('A medição exige dois pontos XYZ finitos.');
  }
  const [dx, dy, dz] = end.map((value, axis) => value - start[axis]);
  const horizontal = Math.hypot(dx, dz);
  return { horizontal, spatial: Math.hypot(dx, dy, dz), elevation: dy,
    cells: Number.isFinite(cellSize) && cellSize > 0 ? horizontal / cellSize : null };
}

const number = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatted = value => number.format(Math.abs(value) < .005 ? 0 : value);
export function measurementText(value) {
  if (!value) return 'Régua · clique na origem e no destino, ou arraste';
  const height = Math.abs(value.elevation) < .005 ? 0 : value.elevation;
  return `Plano: ${formatted(value.horizontal)} m · 3D: ${formatted(value.spatial)} m · Desnível: ${height > 0 ? '+' : ''}${formatted(height)} m${value.cells === null ? '' : ` · ${formatted(value.cells)} células (plano)`}`;
}
