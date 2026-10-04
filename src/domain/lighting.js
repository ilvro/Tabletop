// Optional look fields keep existing schema-2 documents readable without migration.
export const FOG_DEFAULTS = Object.freeze({ enabled: false, mode: 'linear', color: '#8899aa', near: 8, far: 45, density: .025 });
export const VOLUME_DEFAULTS = Object.freeze({ enabled: false, color: '#a5b6c5', density: .06, baseHeight: 0, height: 3, maxDistance: 80 });
export const BLOOM_DEFAULTS = Object.freeze({ enabled: false, strength: .25, radius: .3, threshold: 1 });
export const FLICKER_DEFAULTS = Object.freeze({ enabled: false, pattern: 'candle', amplitude: .2, frequency: 2, seed: 1 });

/** Approximate black-body RGB, stored as sRGB. Artistic control, not photometry. */
export function kelvinToColor(kelvin) {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  const rgb = t <= 66
    ? [255, 99.4708025861 * Math.log(t) - 161.1195681661, t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307]
    : [329.698727446 * (t - 60) ** -.1332047592, 288.1221695283 * (t - 60) ** -.0755148492, 255];
  return '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function noise(index, seed) {
  let n = (index ^ seed) | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/** Pure visual intensity multiplier. No random frame mutations or commands. */
export function flickerFactor(config, seconds) {
  if (!config?.enabled || !config.amplitude) return 1;
  const phase = Math.max(0, seconds) * config.frequency, index = Math.floor(phase), fraction = phase - index;
  const a = noise(index, config.seed), b = noise(index + 1, config.seed);
  const signal = config.pattern === 'fluorescent'
    ? (a < .18 ? -1 : .15 * Math.sin(phase * Math.PI * 2))
    : 2 * (a + (b - a) * fraction * fraction * (3 - 2 * fraction)) - 1;
  return Math.max(0, 1 + config.amplitude * signal);
}
