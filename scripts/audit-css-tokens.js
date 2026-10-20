// Lists every literal colour in src/ui/styles.css with its count and the closest design token.
// `--write` replaces them in place; run without it to review the plan first.
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../src/ui/styles.css', import.meta.url);
const THEME = new URL('../src/ui/theme.css', import.meta.url);
const HEX = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b/g;

const parse = hex => {
  let h = hex.slice(1);
  if (h.length <= 4) h = [...h].map(c => c + c).join('');
  const n = i => parseInt(h.slice(i, i + 2), 16);
  return { rgb: [n(0), n(2), n(4)], alpha: h.length === 8 ? n(6) / 255 : 1 };
};
const hsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const themeText = await readFile(THEME, 'utf8');
const token = name => parse(themeText.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1]).rgb;
const GROUPS = {
  bg: ['tt-bg', 'tt-surface-1', 'tt-surface-2', 'tt-surface-3'],
  line: ['tt-line', 'tt-line-strong'],
  text: ['tt-text', 'tt-text-2', 'tt-muted'],
};
const nearest = (rgb, group) => GROUPS[group].map(name => [name, dist(rgb, token(name))]).sort((a, b) => a[1] - b[1])[0][0];

// Which kind of property a colour sits in, from the declaration around it.
function groupOf(css, index) {
  const start = Math.max(css.lastIndexOf(';', index), css.lastIndexOf('{', index)) + 1;
  const prop = css.slice(start, index).trim().split(':')[0].trim();
  if (/shadow|filter/.test(prop)) return 'shadow';
  if (/^(border|outline|column-rule)/.test(prop)) return 'line';
  if (/^(color|fill|stroke|caret-color|accent-color|text-decoration-color)$/.test(prop)) return 'text';
  return 'bg';
}

function suggest(hex, group) {
  const { rgb, alpha } = parse(hex), { h, s, l } = hsl(rgb);
  let value;
  if (group === 'shadow') value = 'var(--eco-black)';
  else if (group === 'text' && l > .82 && s < .6) value = l > .94 ? 'var(--tt-text)' : s > .3 ? 'var(--tt-accent-strong)' : 'var(--tt-text)';
  else if (group === 'text' && l < .2) value = 'var(--tt-accent-ink)';
  else if (h >= 18 && h <= 60 && (s >= 0.22 || (s >= 0.1 && l < .35 && group !== 'text'))) {
    // Amber family: the brand.
    if (group === 'bg') value = l > .55 ? 'var(--tt-accent)' : `color-mix(in srgb, var(--tt-accent) ${Math.round(l * 90)}%, var(--tt-surface-1))`;
    else if (group === 'line') value = l > .6 ? 'var(--tt-accent)' : `color-mix(in srgb, var(--tt-accent) ${Math.round(l * 100)}%, var(--tt-surface-1))`;
    else value = l > .72 ? 'var(--tt-accent-strong)' : 'var(--tt-accent)';
  } else if (s >= 0.18 && h > 60 && h < 175) {
    value = group === 'bg' ? `color-mix(in srgb, var(--tt-ok) ${Math.round(l * 100)}%, var(--tt-surface-1))` : 'var(--tt-ok)';
  } else if (s >= 0.18 && (h <= 18 || h >= 330)) {
    value = group === 'bg' ? `color-mix(in srgb, var(--tt-danger) ${Math.round(l * 100)}%, var(--tt-surface-1))` : group === 'line' ? `color-mix(in srgb, var(--tt-danger) ${Math.round(l * 100)}%, var(--tt-surface-1))` : 'var(--tt-danger)';
  } else if (s >= 0.3 && h >= 250 && h < 330) {
    value = group === 'bg' ? `color-mix(in srgb, var(--tt-gm) ${Math.round(l * 100)}%, var(--tt-surface-1))` : 'var(--tt-gm)';
  } else if (l > .94 && group === 'text') value = 'var(--tt-text)';
  else if (l < .03 && group !== 'text') value = 'var(--eco-black)';
  else value = `var(--${nearest(rgb, group)})`;
  if (alpha < 1) value = `color-mix(in srgb, ${value} ${Math.round(alpha * 100)}%, transparent)`;
  return value;
}

const css = await readFile(FILE, 'utf8');
const found = new Map();
let out = '', last = 0;
for (const match of css.matchAll(HEX)) {
  const group = groupOf(css, match.index), to = suggest(match[0], group), key = `${match[0].toLowerCase()} (${group})`;
  found.set(key, { to, count: (found.get(key)?.count ?? 0) + 1 });
  out += css.slice(last, match.index) + to; last = match.index + match[0].length;
}
out += css.slice(last);
if (process.argv.includes('--write')) { await writeFile(FILE, out); console.log(`replaced ${[...found.values()].reduce((n, v) => n + v.count, 0)} colours`); }
else for (const [key, { to, count }] of [...found].sort((a, b) => b[1].count - a[1].count)) console.log(String(count).padStart(3), key.padEnd(18), to);
