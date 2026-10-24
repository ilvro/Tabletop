import { escapeHTML as esc, icon } from './icons.js';
import { colorToHSV, hsvToColor, DAYLIGHT_DEFAULTS, skySettings, WEATHER_DEFAULTS, FOG_DEFAULTS, VOLUME_DEFAULTS, BLOOM_DEFAULTS } from '../domain/lighting.js';
import { primaryLight } from '../domain/environments.js';
import { Euler, Quaternion } from 'three';

/** Built-in atmospheres offered as times of day in the live panel, in the order a session goes through them. */
export const AMBIENCE_TIMES = [['day', 'Dia'], ['warm', 'Tarde'], ['moonlight', 'Noite'], ['aurora', 'Aurora'], ['fog', 'Neblina'], ['rain', 'Chuva'], ['ritual', 'Ritual']];
export const AMBIENCE_DURATIONS = [[0, 'Corte'], [2, '2 s'], [5, '5 s'], [10, '10 s'], [20, '20 s']];
const WEATHER = [['none', 'Nada'], ['rain', 'Chuva'], ['snow', 'Neve'], ['dust', 'Poeira'], ['embers', 'Brasas'], ['smoke', 'Fumaça']];

const sunAngles = light => { const e = new Euler().setFromQuaternion(new Quaternion(...(light?.rotation ?? [0, 0, 0, 1])), 'YXZ'); return { altitude: 90 - e.x * 180 / Math.PI, azimuth: e.y * 180 / Math.PI }; };

/** Every slider of the panel: its current value in a look, and its range. HSV rows read the colour named by `color`. */
export function ambienceValues(look) {
  const key = primaryLight(look), daylight = { ...DAYLIGHT_DEFAULTS, ...look.daylight }, sky = skySettings(look.sky), weather = { ...WEATHER_DEFAULTS, ...look.weather };
  const fog = { ...FOG_DEFAULTS, ...look.fog }, volume = { ...VOLUME_DEFAULTS, ...look.volumetricFog }, bloom = { ...BLOOM_DEFAULTS, ...look.bloom }, sun = sunAngles(key);
  return {
    exposure: daylight.exposure, fill: look.fill?.intensity ?? 1, keyIntensity: key ? (key.enabled === false ? 0 : key.intensity) : 0,
    altitude: sun.altitude, azimuth: sun.azimuth, cloudCoverage: sky.cloudCoverage, cloudOpacity: sky.cloudOpacity, cloudSpeed: sky.cloudSpeed, cloudScale: sky.cloudScale,
    volumeDensity: volume.enabled ? volume.density : 0, volumeHeight: volume.height, fogDensity: fog.enabled && fog.mode === 'exp2' ? fog.density : 0,
    weatherCount: weather.type === 'none' ? 0 : weather.count, weatherSpeed: weather.speed, wind: weather.wind[0], bloom: bloom.enabled ? bloom.strength : 0,
    colors: { key: key?.color ?? '#ffe8c5', topColor: sky.topColor, horizonColor: sky.horizonColor, cloudColor: sky.cloudColor, fogColor: volume.enabled || !fog.enabled ? volume.color : fog.color },
    starBrightness: sky.stars ? sky.starBrightness : 0, milkyWay: sky.milkyWay, aurora: sky.aurora ? sky.auroraIntensity : 0, moonPhase: sky.moonPhase, night: daylight.phase !== 'day',
    skyEnabled: sky.enabled, weatherType: weather.type, hasKey: Boolean(key),
  };
}

export const AMBIENCE_RANGES = {
  exposure: [.2, 3, .01], fill: [0, 3, .01], keyIntensity: [0, 6, .01], altitude: [1, 90, 1], azimuth: [-180, 180, 1],
  cloudCoverage: [0, 1, .01], cloudOpacity: [0, 1, .01], cloudSpeed: [0, .2, .001], cloudScale: [.5, 12, .1],
  volumeDensity: [0, .3, .002], volumeHeight: [.2, 30, .1], fogDensity: [0, .08, .001],
  starBrightness: [0, 3, .01], milkyWay: [0, 1, .01], aurora: [0, 3, .01], moonPhase: [0, 1, .01],
  weatherCount: [0, 3000, 10], weatherSpeed: [0, 30, .1], wind: [-15, 15, .1], bloom: [0, 1, .01],
};

const shown = (name, value) => name === 'altitude' || name === 'azimuth' ? `${Math.round(value)}°` : name === 'weatherCount' ? String(Math.round(value)) : String(Math.round(value * 100) / 100);
const slider = (name, label, value, style = '') => {
  const [min, max, step] = AMBIENCE_RANGES[name];
  return `<label class="amb-row"><span>${label}</span><input type="range" data-ambience="${name}" min="${min}" max="${max}" step="${step}" value="${value}" ${style ? `style="${style}"` : ''} aria-label="${esc(label)}"/><output>${shown(name, value)}</output></label>`;
};
/** Three sliders that paint a colour, with tracks that show where each one leads, like a colour wheel opened flat. */
export function hsvRows(name, label, color, hueMemory) {
  const hsv = colorToHSV(color), hue = hsv.saturation < .01 && hueMemory != null ? hueMemory : hsv.hue;
  const pure = hsvToColor({ hue, saturation: 1, value: 1 }), grey = hsvToColor({ hue, saturation: 0, value: hsv.value }), full = hsvToColor({ hue, saturation: hsv.saturation, value: 1 });
  const row = (channel, letter, value, max, track) => `<label class="amb-row amb-hsv"><span>${letter}</span><input type="range" data-ambience="${name}" data-channel="${channel}" min="0" max="${max}" step="${channel === 'h' ? 1 : .005}" value="${value}" style="--track:${track}" aria-label="${esc(label)} · ${letter}"/><output>${channel === 'h' ? Math.round(value) : Math.round(value * 100)}</output></label>`;
  return `<div class="amb-color"><span class="amb-swatch" style="background:${color}" title="${esc(color)}"></span><div>
    ${row('h', 'H', hue, 360, 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)')}
    ${row('s', 'S', hsv.saturation, 1, `linear-gradient(90deg,${grey},${hsvToColor({ hue, saturation: 1, value: hsv.value })})`)}
    ${row('v', 'V', hsv.value, 1, `linear-gradient(90deg,#000,${full === '#000000' ? pure : full})`)}
  </div></div>`;
}

/** The live atmosphere window: times of day with a transition, then the sliders a session needs, grouped like a lighting desk. */
export function ambiencePanel(look, { environments = [], activeId = null, duration = 5, hues = {}, transition = null } = {}) {
  const v = ambienceValues(look), section = (title, body, extra = '') => `<section class="amb-section"><h3>${title}${extra}</h3>${body}</section>`;
  const chip = (id, label, title = '') => `<button type="button" class="amb-chip ${activeId === id ? 'active' : ''}" data-ambience-time="${esc(id)}" ${title ? `title="${esc(title)}"` : ''}>${esc(label)}</button>`;
  const times = `<div class="amb-chips">${AMBIENCE_TIMES.map(([id, label]) => chip(id, label)).join('')}${environments.map(item => chip(item.id, item.name, 'Ambiente salvo')).join('')}</div>
    <div class="amb-inline"><span>Transição</span><div class="amb-segments" role="radiogroup" aria-label="Duração da transição">${AMBIENCE_DURATIONS.map(([seconds, label]) => `<button type="button" role="radio" aria-checked="${duration === seconds}" class="${duration === seconds ? 'active' : ''}" data-ambience-duration="${seconds}">${label}</button>`).join('')}</div></div>
    ${transition ? `<div class="amb-progress" role="status"><i style="--progress:${Math.round(transition.progress * 100)}%"></i><span>Indo para ${esc(transition.name)}…</span><button type="button" data-ambience-action="finish" class="quiet">Chegar agora</button></div>` : ''}`;
  return `${section('Hora do dia', times)}
    ${section('Luz', `${slider('exposure', 'Exposição', v.exposure)}${v.hasKey ? `${slider('keyIntensity', 'Sol / lua', v.keyIntensity)}${slider('altitude', 'Altura', v.altitude)}${slider('azimuth', 'Direção', v.azimuth)}${hsvRows('key', 'Cor do sol / lua', v.colors.key, hues.key)}` : '<p class="amb-note">A cena não tem sol nem lua. Escolha uma hora do dia para criar.</p>'}${slider('fill', 'Luz ambiente', v.fill)}`)}
    ${section('Céu', `${hsvRows('topColor', 'Cor do céu', v.colors.topColor, hues.topColor)}${hsvRows('horizonColor', 'Horizonte', v.colors.horizonColor, hues.horizonColor)}`, `<label class="amb-toggle"><input type="checkbox" data-ambience="skyEnabled" ${v.skyEnabled ? 'checked' : ''}/> mostrar</label>`)}
    ${section('Céu noturno', `${slider('starBrightness', 'Estrelas', v.starBrightness)}${slider('milkyWay', 'Via Láctea', v.milkyWay)}${slider('aurora', 'Aurora', v.aurora)}${slider('moonPhase', 'Fase da lua', v.moonPhase)}${v.night ? '' : '<p class="amb-note">Aparece com Tarde escura ou Noite.</p>'}`)}
    ${section('Nuvens', `${slider('cloudCoverage', 'Cobertura', v.cloudCoverage)}${slider('cloudOpacity', 'Opacidade', v.cloudOpacity)}${slider('cloudSpeed', 'Velocidade', v.cloudSpeed)}${slider('cloudScale', 'Padrão', v.cloudScale)}${hsvRows('cloudColor', 'Cor das nuvens', v.colors.cloudColor, hues.cloudColor)}`)}
    ${section('Névoa', `${slider('volumeDensity', 'Névoa baixa', v.volumeDensity)}${slider('volumeHeight', 'Altura', v.volumeHeight)}${slider('fogDensity', 'Distância', v.fogDensity)}${hsvRows('fogColor', 'Cor da névoa', v.colors.fogColor, hues.fogColor)}`)}
    ${section('Clima', `<div class="amb-chips">${WEATHER.map(([id, label]) => `<button type="button" class="amb-chip ${v.weatherType === id ? 'active' : ''}" data-ambience-weather="${id}">${label}</button>`).join('')}</div>${v.weatherType !== 'none' ? `${slider('weatherCount', 'Intensidade', v.weatherCount)}${slider('weatherSpeed', 'Velocidade', v.weatherSpeed)}${slider('wind', 'Vento', v.wind)}` : ''}`)}
    ${section('Brilho', slider('bloom', 'Halo das luzes', v.bloom))}
    <p class="amb-note">${icon('display', 13)} Arrastar mostra no editor e no projetor; soltar grava um passo de desfazer.</p>`;
}
