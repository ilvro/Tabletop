import { escapeHTML as esc } from './icons.js';
import { search, GROUPS, normalize } from './command-index.js';

const RECENT = 5;

/**
 * The find-anything box (Ctrl+K). `collect()` returns fresh entries `{ group, label, keywords, hint, run }` on every opening,
 * so what it finds is always what is on screen now. Not modal: the stage stays in view and keeps its focus rules.
 */
export function createCommandPalette(dialog, { collect }) {
  const input = dialog.querySelector('input'), list = dialog.querySelector('[role="listbox"]');
  let entries = [], shown = [], active = 0, previousFocus = null;
  const recent = [];
  const keyOf = entry => `${entry.group}:${entry.label}`;

  function view(query) {
    if (normalize(query)) {
      const found = search(entries, query, 40), best = new Map();
      found.forEach((entry, index) => { if (!best.has(entry.group)) best.set(entry.group, index); });
      const order = [...best.keys()].sort((a, b) => best.get(a) - best.get(b) || GROUPS.indexOf(a) - GROUPS.indexOf(b));
      return order.flatMap(group => found.filter(entry => entry.group === group));
    }
    const recents = recent.map(key => entries.find(entry => keyOf(entry) === key)).filter(Boolean);
    return [...recents.map(entry => ({ ...entry, group: 'Recentes', origin: entry })), ...entries.filter(entry => entry.group === 'Ações')];
  }
  function render() {
    shown = view(input.value); active = Math.min(active, Math.max(shown.length - 1, 0));
    let group = null, html = '';
    shown.forEach((entry, index) => {
      if (entry.group !== group) { group = entry.group; html += `<li class="palette-group tt-eyebrow" role="presentation">${esc(group)}</li>`; }
      html += `<li id="palette-option-${index}" role="option" class="palette-option" aria-selected="${index === active}" data-index="${index}"><span>${esc(entry.label)}</span>${entry.hint ? `<small>${esc(entry.hint)}</small>` : ''}</li>`;
    });
    list.innerHTML = html || `<li class="palette-empty" role="presentation">Nada encontrado para “${esc(input.value)}”.</li>`;
    input.setAttribute('aria-activedescendant', shown.length ? `palette-option-${active}` : '');
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }
  function close({ restore = true } = {}) {
    if (!dialog.open) return;
    dialog.close(); input.setAttribute('aria-expanded', 'false');
    if (restore && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  async function choose(index) {
    const entry = shown[index]; if (!entry) return;
    const origin = entry.origin ?? entry, key = keyOf(origin);
    recent.splice(0, recent.length, key, ...recent.filter(item => item !== key)); recent.length = Math.min(recent.length, RECENT);
    close({ restore: false });
    try { await origin.run(); } catch (error) { console.error(error); }
  }
  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (shown.length) { active = (active + (event.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length; render(); } }
    else if (event.key === 'Enter') { event.preventDefault(); void choose(active); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  });
  list.addEventListener('mousemove', event => { const option = event.target.closest('[data-index]'); if (option && Number(option.dataset.index) !== active) { active = Number(option.dataset.index); list.querySelectorAll('[aria-selected]').forEach(node => node.setAttribute('aria-selected', String(node === option))); input.setAttribute('aria-activedescendant', option.id); } });
  list.addEventListener('click', event => { const option = event.target.closest('[data-index]'); if (option) void choose(Number(option.dataset.index)); });
  return {
    get isOpen() { return dialog.open; },
    open() {
      if (dialog.open) { input.focus(); input.select(); return; }
      previousFocus = document.activeElement; entries = collect(); active = 0; input.value = '';
      dialog.show(); input.setAttribute('aria-expanded', 'true'); render(); input.focus();
    },
    close,
  };
}
