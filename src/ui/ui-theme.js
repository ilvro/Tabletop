// Interface colour preference: a per-browser setting, never part of a scene document.
import { icon } from './icons.js';

const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export const UI_PALETTES = [
  { id: 'tungsten', label: 'Tungstênio', accent: '#e3b878' },
  { id: 'copper', label: 'Cobre', accent: '#e8946a' },
  { id: 'rose', label: 'Rosa', accent: '#ee93b0' },
  { id: 'moss', label: 'Musgo', accent: '#b5cf6c' },
  { id: 'jade', label: 'Jade', accent: '#6fcf9f' },
  { id: 'teal', label: 'Petróleo', accent: '#62c0c0' },
  { id: 'sky', label: 'Céu', accent: '#86b4f2' },
];
export const DEFAULT_UI_THEME = Object.freeze({ palette: 'tungsten', custom: '#86b4f2', followScene: true });
// The brand tokens as theme.css declares them; kept exact so the default look does not drift.
const TUNGSTEN = { accent: '#e3b878', strong: '#f0ca91', ink: '#1d1a14' };

function toHsl(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1)), h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}
function toHex({ h, s, l }) {
  const a = s * Math.min(l, 1 - l), channel = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return `#${[0, 8, 4].map(n => Math.round(clamp(channel(n), 0, 1) * 255).toString(16).padStart(2, '0')).join('')}`;
}
const linear = value => { const c = value / 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
export function luminance(hex) { const n = parseInt(hex.slice(1), 16); return .2126 * linear(n >> 16) + .7152 * linear((n >> 8) & 255) + .0722 * linear(n & 255); }
export function contrast(a, b) { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05); }

/** Accent, hover and ink tokens for any colour, lifted until dark ink on it reads at 7:1 and it reads as text on the dark panels. */
export function paletteTokens(color) {
  if (!HEX.test(color ?? '')) return { ...TUNGSTEN };
  if (color.toLowerCase() === TUNGSTEN.accent) return { ...TUNGSTEN };
  const { h, s: rawS, l: rawL } = toHsl(color), s = rawS < .08 ? rawS : clamp(rawS, .35, .8), ink = toHex({ h, s: Math.min(s, .3), l: .07 });
  let l = clamp(rawL, .6, .9), accent = toHex({ h, s, l });
  while (contrast(ink, accent) < 7 && l < .95) { l += .02; accent = toHex({ h, s, l }); }
  return { accent, strong: toHex({ h, s, l: Math.min(.92, l + .08) }), ink };
}

export function normalizeUiTheme(value) {
  const palette = value?.palette === 'custom' || UI_PALETTES.some(p => p.id === value?.palette) ? value.palette : DEFAULT_UI_THEME.palette;
  return { palette, custom: HEX.test(value?.custom ?? '') ? value.custom.toLowerCase() : DEFAULT_UI_THEME.custom, followScene: value?.followScene !== false };
}
export const themeAccentSource = theme => theme.palette === 'custom' ? theme.custom : UI_PALETTES.find(p => p.id === theme.palette).accent;

export function readUiTheme(key) {
  try { return normalizeUiTheme(JSON.parse(localStorage.getItem(key) ?? 'null')); } catch { return normalizeUiTheme(null); }
}
export function writeUiTheme(key, theme) {
  try { localStorage.setItem(key, JSON.stringify(normalizeUiTheme(theme))); return true; } catch { return false; /* Applied for this session only. */ }
}

/** Writes the brand tokens on the document root; returns the accent so scene-derived colours can fall back to it. */
export function applyUiTheme(theme, target = document.documentElement) {
  const tokens = paletteTokens(themeAccentSource(normalizeUiTheme(theme)));
  target.style.setProperty('--tt-accent', tokens.accent);
  target.style.setProperty('--tt-accent-strong', tokens.strong);
  target.style.setProperty('--tt-accent-ink', tokens.ink);
  return tokens.accent;
}

export function uiThemeMarkup(theme, { saved = true } = {}) {
  const swatch = (id, label, color) => `<button type="button" class="theme-swatch" data-ui-palette="${id}" aria-pressed="${theme.palette === id}" style="--swatch:${paletteTokens(color).accent}"><i aria-hidden="true"></i><span>${label}</span></button>`;
  return `<div class="dialog-header"><div><span class="tt-eyebrow">CONFIGURAÇÕES</span><h2>Aparência</h2></div><button type="button" data-settings-close class="icon-button" aria-label="Fechar configurações">${icon('close', 18)}</button></div>
    <section class="settings-section" aria-labelledby="settings-palette"><h3 id="settings-palette" class="task-heading">Cor do tema</h3>
      <p class="settings-hint">Botões, abas, foco e destaques da interface. Vale para este navegador e para a janela do projetor; não muda nenhuma cena.</p>
      <div class="theme-swatches" role="group" aria-label="Paleta">${UI_PALETTES.map(p => swatch(p.id, p.label, p.accent)).join('')}
        <label class="theme-swatch theme-custom${theme.palette === 'custom' ? ' is-active' : ''}" style="--swatch:${paletteTokens(theme.custom).accent}"><input type="color" id="ui-theme-custom" value="${theme.custom}" aria-label="Cor personalizada" /><span>Personalizada</span></label>
      </div>
      <p class="settings-hint">Cores escuras são clareadas para continuar legíveis no fundo escuro.</p>
    </section>
    <section class="settings-section"><h3 class="task-heading">Destaques da cena</h3>
      <label class="settings-check"><input type="checkbox" id="ui-theme-follow" ${theme.followScene ? 'checked' : ''} /><span><strong>Seguir a luz principal da cena</strong><small>Claquete, cantoneiras do visor, tomadas e cartazes ganham a cor da luz de cada cena. Desligado, tudo usa a cor do tema.</small></span></label>
    </section>
    <div class="dialog-actions"><button type="button" data-ui-theme-reset class="quiet">Restaurar padrão</button>${saved ? '' : '<span class="settings-hint">Não foi possível guardar neste navegador; a cor vale até fechar a aba.</span>'}</div>`;
}
