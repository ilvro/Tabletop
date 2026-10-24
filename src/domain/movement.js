/**
 * How far a character moved, in metres and in squares of the grid, and whether it was a walk, a run or out of reach.
 * `diagonal`: 'euclidean' (the real distance), 'chebyshev' (a diagonal costs one square, as in many grids) or
 * 'alternate' (diagonals cost 1, 2, 1, 2…).
 */
export const DIAGONAL_RULES = [['euclidean', 'Distância real'], ['chebyshev', 'Diagonal = 1 quadrado', '1 quadrado'], ['alternate', 'Diagonal alterna 1 e 2', '1 e 2']];

export function movementCost(from, to, cellSize = 1, diagonal = 'euclidean') {
  const dx = Math.abs(to[0] - from[0]), dz = Math.abs(to[2] - from[2]), metres = Math.hypot(dx, dz);
  if (!(cellSize > 0)) return { metres, squares: null };
  const a = Math.round(dx / cellSize), b = Math.round(dz / cellSize), straight = Math.abs(a - b), diagonals = Math.min(a, b);
  const squares = diagonal === 'chebyshev' ? Math.max(a, b) : diagonal === 'alternate' ? straight + diagonals + Math.floor(diagonals / 2) : Math.round(metres / cellSize * 10) / 10;
  return { metres, squares };
}

/** 'walk' within the speed, 'run' up to twice it, 'far' beyond; null without a speed. */
export const movementBand = (metres, speed) => !(speed > 0) ? null : metres <= speed + 1e-6 ? 'walk' : metres <= speed * 2 + 1e-6 ? 'run' : 'far';
export const BAND_COLORS = { walk: '#5bd38a', run: '#f2c14e', far: '#ef5b5b', none: '#ffd477' };
