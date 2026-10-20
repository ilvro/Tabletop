const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function toHsl(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1)), h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function toHex({ h, s, l }) {
  const a = s * Math.min(l, 1 - l), channel = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return `#${[0, 8, 4].map(n => Math.round(channel(n) * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** The scene's own accent: the key light's colour made readable on dark UI; the brand accent when the light is grey. */
export function sceneAccent(look, fallback = '#e3b878') {
  const key = Object.values(look?.lights ?? {}).find(light => light.role === 'key' && HEX.test(light.color ?? ''));
  const source = key?.color ?? [look?.fog?.enabled && look.fog.color, look?.sky?.enabled && look.sky.horizonColor].find(color => HEX.test(color ?? ''));
  if (!source) return fallback;
  const { h, s } = toHsl(source);
  if (s < .12) return fallback;
  return toHex({ h, s: clamp(s, .35, .75), l: clamp(toHsl(source).l, .62, .72) });
}
