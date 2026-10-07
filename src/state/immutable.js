// JSON copy-on-write drafts. Empty proxy targets keep frozen snapshot descriptors
// out of Proxy invariants; published documents never contain a draft.
const states = new WeakMap(), trusted = new WeakSet();
const object = value => value !== null && typeof value === 'object';
export const isTrustedSnapshot = value => trusted.has(value);
export function freezeSnapshot(value) {
  if (!object(value) || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeSnapshot(child);
  return Object.freeze(value);
}
// Only call after full document validation, never merely on externally frozen JSON.
export function trustSnapshot(value) { freezeSnapshot(value); trusted.add(value); return value; }

export function cloneValue(value) {
  if (!object(value)) return value;
  const state = states.get(value), source = state ? state.copy ?? state.base : value;
  if (Array.isArray(source)) return Array.from({ length: source.length }, (_, i) => cloneValue(state?.children.get(String(i)) ?? source[i]));
  if (Object.getPrototypeOf(source) !== Object.prototype) return structuredClone(source);
  return Object.fromEntries(Object.keys(source).map(key => [key, cloneValue(state?.children.get(key) ?? source[key])]));
}

export function createDraft(base) {
  if (states.has(base)) base = finishDraft(base);
  const state = { base, copy: null, children: new Map() };
  const copy = () => state.copy ??= Array.isArray(base) ? base.slice() : { ...base };
  const proxy = new Proxy(Array.isArray(base) ? [] : {}, {
    get(_, key) {
      const value = (state.copy ?? base)[key];
      if (!object(value)) return value;
      if (states.has(value)) return value;
      if (!state.children.has(key)) state.children.set(key, createDraft(value));
      return state.children.get(key);
    },
    set(_, key, value) {
      if (Object.is((state.copy ?? base)[key], value)) return true;
      copy()[key] = value; state.children.delete(key); return true;
    },
    deleteProperty(_, key) { if (Object.hasOwn(state.copy ?? base, key)) { delete copy()[key]; state.children.delete(key); } return true; },
    has: (_, key) => key in (state.copy ?? base),
    ownKeys: () => Reflect.ownKeys(state.copy ?? base),
    getPrototypeOf: () => Object.getPrototypeOf(base),
    getOwnPropertyDescriptor(_, key) {
      const d = Object.getOwnPropertyDescriptor(state.copy ?? base, key);
      return d && { value: d.value, writable: true, enumerable: d.enumerable, configurable: key === 'length' && Array.isArray(base) ? false : true };
    },
  });
  states.set(proxy, state); return proxy;
}

export function finishDraft(value) {
  if (!object(value)) return value;
  const state = states.get(value);
  if (!state && Object.isFrozen(value)) return value;
  const source = state ? state.copy ?? state.base : value;
  let result = source;
  const change = (key, next) => {
    if (Object.is(source[key], next)) return;
    if (result === source) result = Array.isArray(source) ? source.slice() : { ...source };
    result[key] = next;
  };
  if (state) {
    for (const [key, child] of state.children) if (Object.hasOwn(source, key)) change(key, finishDraft(child));
    if (state.copy || !Object.isFrozen(state.base)) for (const key of Object.keys(source)) if (!state.children.has(key)) change(key, finishDraft(source[key]));
    // Equal assignments (e.g. normalized transforms) must not grow history.
    if (result !== state.base && Object.keys(result).length === Object.keys(state.base).length && Object.keys(result).every(key => Object.hasOwn(state.base, key) && Object.is(result[key], state.base[key]))) return state.base;
  } else for (const key of Object.keys(source)) change(key, finishDraft(source[key]));
  return state ? shareEqual(state.base, result) : result;
}

function shareEqual(before, after) {
  if (states.has(before)) before = finishDraft(before);
  if (states.has(after)) after = finishDraft(after);
  if (before === after || !object(before) || !object(after) || Array.isArray(before) !== Array.isArray(after)) return after;
  const keys = Object.keys(after); let same = keys.length === Object.keys(before).length, result = after;
  for (const key of keys) {
    if (!Object.hasOwn(before, key)) { same = false; continue; }
    const next = shareEqual(before[key], after[key]);
    if (next !== after[key]) { if (result === after) result = Array.isArray(after) ? after.slice() : { ...after }; result[key] = next; }
    same &&= before[key] === next;
  }
  return same ? before : result;
}
