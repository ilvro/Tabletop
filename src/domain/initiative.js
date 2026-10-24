import { ValidationError } from './validation.js';

/**
 * Turn order of a combat, kept in the scene's session state: `{ order: [{ tokenId, value }], current, round }`.
 * Ordered from the highest value; `current` is an index into `order`.
 */
const fail = (condition, message, path) => { if (!condition) throw new ValidationError(message, path); };

export function validateInitiative(value, document, path = 'sessionState.initiative') {
  fail(value && typeof value === 'object' && !Array.isArray(value), 'Objeto inválido.', path);
  for (const key of Object.keys(value)) fail(['order', 'current', 'round'].includes(key), `Campo desconhecido: ${key}.`, `${path}.${key}`);
  fail(Array.isArray(value.order) && value.order.length <= 64, 'Ordem inválida.', `${path}.order`);
  const seen = new Set();
  value.order.forEach((entry, index) => {
    const at = `${path}.order[${index}]`;
    fail(entry && typeof entry === 'object' && Object.keys(entry).every(key => ['tokenId', 'value'].includes(key)), 'Entrada inválida.', at);
    fail(typeof entry.tokenId === 'string' && Boolean(document.tokens?.[entry.tokenId]), 'Token da iniciativa não encontrado.', `${at}.tokenId`);
    fail(!seen.has(entry.tokenId), 'Token repetido na iniciativa.', `${at}.tokenId`); seen.add(entry.tokenId);
    fail(Number.isFinite(entry.value) && Math.abs(entry.value) <= 999, 'Valor de iniciativa inválido.', `${at}.value`);
  });
  fail(Number.isInteger(value.current) && value.current >= 0 && value.current < Math.max(1, value.order.length), 'Vez inválida.', `${path}.current`);
  fail(Number.isInteger(value.round) && value.round >= 1 && value.round <= 9999, 'Rodada inválida.', `${path}.round`);
}

/** Highest first; ties keep the order they were added in. */
export const sortOrder = order => order.map((entry, index) => ({ entry, index })).sort((a, b) => b.entry.value - a.entry.value || a.index - b.index).map(({ entry }) => entry);

/** A new combat with these tokens, highest value first, on the first round. */
export function startInitiative(entries) {
  return { order: sortOrder(entries.map(({ tokenId, value }) => ({ tokenId, value: Number(value) || 0 }))), current: 0, round: 1 };
}

/** The next turn (or the previous one with `step = -1`), counting rounds. */
export function stepInitiative(initiative, step = 1) {
  const count = initiative.order.length; if (!count) return initiative;
  let current = initiative.current + step, round = initiative.round;
  if (current >= count) { current = 0; round++; } else if (current < 0) { current = count - 1; round = Math.max(1, round - 1); }
  return { ...initiative, current, round };
}

/**
 * Changes one value and re-sorts, keeping the turn on the same token. Before anyone has played (first turn of the first
 * round) the turn stays at the top, so typing the values in sets who starts.
 */
export function setInitiativeValue(initiative, tokenId, value) {
  const turn = initiative.order[initiative.current]?.tokenId, starting = initiative.round === 1 && initiative.current === 0;
  const order = sortOrder(initiative.order.map(entry => entry.tokenId === tokenId ? { ...entry, value: Number(value) || 0 } : entry));
  return { ...initiative, order, current: starting ? 0 : Math.max(0, order.findIndex(entry => entry.tokenId === turn)) };
}

/** Without the tokens that no longer exist (or are not shown), the turn staying on its token when it can. */
export function pruneInitiative(initiative, exists) {
  if (!initiative) return initiative;
  const turn = initiative.order[initiative.current]?.tokenId, order = initiative.order.filter(entry => exists(entry.tokenId));
  if (order.length === initiative.order.length) return initiative;
  const kept = order.findIndex(entry => entry.tokenId === turn);
  return { ...initiative, order, current: kept >= 0 ? kept : Math.min(initiative.current, Math.max(0, order.length - 1)) };
}
