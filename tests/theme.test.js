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
