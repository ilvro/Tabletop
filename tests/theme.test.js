import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = name => readFile(new URL(`../src/ui/${name}`, import.meta.url), 'utf8');
const hex = (css, name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
const channel = value => { const c = value / 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const luminance = color => { const n = parseInt(color.slice(1), 16); return .2126 * channel(n >> 16) + .7152 * channel((n >> 8) & 255) + .0722 * channel(n & 255); };
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05); };

test('no font size is smaller than 11px', async () => {
  const css = await read('styles.css');
  for (const [, size] of css.matchAll(/font-size:\s*([0-9.]+)px/g)) assert.ok(Number(size) >= 11, `font-size ${size}px`);
  for (const [, size] of css.matchAll(/font:[^;}]*?\b([0-9.]+)px/g)) assert.ok(Number(size) >= 11, `font shorthand ${size}px`);
});

test('muted and body text keep their contrast on the dark surfaces', async () => {
  const theme = await read('theme.css');
  assert.ok(contrast(hex(theme, 'tt-muted'), hex(theme, 'tt-surface-1')) >= 4.5);
  assert.ok(contrast(hex(theme, 'tt-text'), hex(theme, 'tt-bg')) >= 12);
  assert.ok(contrast(hex(theme, 'tt-accent-ink'), hex(theme, 'tt-accent')) >= 7);
});

test('colours live in the theme, not in the stylesheet', async () => {
  const css = await read('styles.css');
  assert.ok((css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length <= 15);
});

test('every interface palette keeps dark ink readable on its accent and the accent readable on panels', async () => {
  const { UI_PALETTES, paletteTokens, contrast: ratio } = await import('../src/ui/ui-theme.js');
  const theme = await read('theme.css'), surface = hex(theme, 'tt-surface-1');
  const samples = [...UI_PALETTES.map(p => p.accent), '#000000', '#ffffff', '#0a1f8f', '#7a0000', '#00ff00', '#808080', '#3d2b5c'];
  for (const color of samples) {
    const tokens = paletteTokens(color);
    assert.ok(ratio(tokens.ink, tokens.accent) >= 7, `ink on ${color} → ${tokens.accent}`);
    assert.ok(ratio(tokens.accent, surface) >= 4.5, `${color} → ${tokens.accent} on panels`);
  }
  assert.deepEqual(paletteTokens('#e3b878'), { accent: hex(theme, 'tt-accent'), strong: hex(theme, 'tt-accent-strong'), ink: hex(theme, 'tt-accent-ink') });
});

test('a stored interface theme is normalized', async () => {
  const { normalizeUiTheme, DEFAULT_UI_THEME } = await import('../src/ui/ui-theme.js');
  assert.deepEqual(normalizeUiTheme(null), { ...DEFAULT_UI_THEME });
  assert.deepEqual(normalizeUiTheme({ palette: 'nope', custom: 'red', followScene: 0 }), { ...DEFAULT_UI_THEME, followScene: true });
  assert.deepEqual(normalizeUiTheme({ palette: 'custom', custom: '#ABCDEF', followScene: false }), { palette: 'custom', custom: '#abcdef', followScene: false });
});
