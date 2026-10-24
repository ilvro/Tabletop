import { ambiencePanel, AMBIENCE_TIMES } from '../../ui/ambience-panel.js';
import { applyEnvironment, primaryLight, ENVIRONMENTS } from '../../domain/environments.js';
import { mixLook, smootherstep } from '../../domain/cinematics.js';
import { colorToHSV, hsvToColor, DAYLIGHT_DEFAULTS, SKY_DEFAULTS, WEATHER_DEFAULTS, FOG_DEFAULTS, VOLUME_DEFAULTS, BLOOM_DEFAULTS } from '../../domain/lighting.js';
import { Euler, Quaternion } from 'three';

const settings = (look, field, defaults) => ({ ...defaults, ...look[field] });
// What a weather type looks like when it starts, as in the scene panel.
const WEATHER_START = { rain: { speed: 12, particleSize: .025, count: 900, color: '#afc9de', opacity: .45 }, snow: { speed: 1.2, particleSize: .04, count: 900, color: '#f2f6ff', opacity: .8 },
  smoke: { speed: .5, particleSize: .7, count: 180, color: '#b0b0b0', opacity: .22 }, embers: { speed: 1, particleSize: .055, count: 250, color: '#ff9e45', opacity: .8 }, dust: { speed: .25, particleSize: .035, count: 300, color: '#e1ceaa', opacity: .3 } };

/**
 * What one slider asks of the look: `{ look }` for look.update and/or `{ key }` for the key light. HSV rows pass the
 * channel; `hue` keeps the hue of a grey while its saturation is raised from zero.
 */
export function ambiencePatch(look, name, value, { channel = null, hue = null, center = null } = {}) {
  const key = primaryLight(look);
  const paint = color => { const hsv = colorToHSV(color); if (hsv.saturation < .01 && hue != null) hsv.hue = hue; hsv[{ h: 'hue', s: 'saturation', v: 'value' }[channel]] = value; return hsvToColor(hsv); };
  const sky = patch => ({ look: { sky: { ...settings(look, 'sky', SKY_DEFAULTS), ...patch } } });
  switch (name) {
    case 'exposure': return { look: { daylight: { ...settings(look, 'daylight', DAYLIGHT_DEFAULTS), exposure: value } } };
    case 'fill': return { look: { fill: { ...look.fill, intensity: value } } };
    case 'keyIntensity': return { key: { intensity: value, enabled: value > 0 || key?.enabled !== false } };
    case 'altitude': case 'azimuth': {
      const angles = new Euler().setFromQuaternion(new Quaternion(...(key?.rotation ?? [0, 0, 0, 1])), 'YXZ');
      if (name === 'altitude') angles.x = (90 - value) * Math.PI / 180; else angles.y = value * Math.PI / 180;
      return { key: { rotation: new Quaternion().setFromEuler(angles).toArray() } };
    }
    case 'key': return { key: { color: paint(key?.color ?? '#ffe8c5'), temperature: null } };
    case 'skyEnabled': return sky({ enabled: value });
    case 'topColor': case 'horizonColor': case 'cloudColor': return sky({ [name]: paint(settings(look, 'sky', SKY_DEFAULTS)[name]) });
    case 'cloudCoverage': case 'cloudOpacity': case 'cloudSpeed': case 'cloudScale': return sky({ [name]: value, ...(name === 'cloudScale' ? {} : { clouds: true }) });
    case 'volumeDensity': return { look: { volumetricFog: { ...settings(look, 'volumetricFog', VOLUME_DEFAULTS), density: value, enabled: value > 0 } } };
    case 'volumeHeight': return { look: { volumetricFog: { ...settings(look, 'volumetricFog', VOLUME_DEFAULTS), height: value } } };
    case 'fogDensity': return { look: { fog: { ...settings(look, 'fog', FOG_DEFAULTS), mode: 'exp2', density: value, enabled: value > 0 } } };
    case 'fogColor': {
      const volume = settings(look, 'volumetricFog', VOLUME_DEFAULTS), fog = settings(look, 'fog', FOG_DEFAULTS), color = paint(volume.enabled || !fog.enabled ? volume.color : fog.color);
      return { look: { volumetricFog: { ...volume, color }, fog: { ...fog, color } } };
    }
    case 'weatherType': {
      const weather = settings(look, 'weather', WEATHER_DEFAULTS);
      if (value === 'none') return { look: { weather: { ...weather, type: 'none' } } };
      // Starting weather lands where the camera looks, not at the origin of the map.
      const around = weather.type === 'none' && center ? { center: [center[0], Math.min(weather.center[1], center[1]), center[2]], size: [40, 14, 40] } : {};
      return { look: { weather: { ...weather, ...(weather.type !== value ? WEATHER_START[value] : {}), ...around, type: value } } };
    }
    case 'weatherCount': return { look: { weather: { ...settings(look, 'weather', WEATHER_DEFAULTS), count: Math.round(value) } } };
    case 'weatherSpeed': return { look: { weather: { ...settings(look, 'weather', WEATHER_DEFAULTS), speed: value } } };
    case 'wind': { const weather = settings(look, 'weather', WEATHER_DEFAULTS); return { look: { weather: { ...weather, wind: [value, weather.wind[1]] } } }; }
    case 'bloom': return { look: { bloom: { ...settings(look, 'bloom', BLOOM_DEFAULTS), strength: value, enabled: value > 0 } } };
    default: throw new Error(`Controle de ambientação desconhecido: ${name}.`);
  }
}

/** The look a patch would make, for showing it before it is committed. */
export function patchedLook(look, patch) {
  const next = { ...look, ...patch.look };
  const key = primaryLight(look);
  if (patch.key && key) next.lights = { ...look.lights, [key.id]: { ...key, ...patch.key, color: patch.key.color ?? key.color } };
  return next;
}

/**
 * The live atmosphere window. Dragging shows the change in this editor and on the projector through `sendLook`,
 * without touching the document; releasing commits one undo step. Times of day travel there over the chosen duration.
 */
export function createAmbience({ dialog, content, store, viewport, execute, environments, sendLook, notify, onTransition = () => {} }) {
  let duration = 5, transition = null, dragging = false, frame = 0, pending = null;
  const hues = {};
  const look = () => store.document.look ?? store.document.defaultLook;
  const activeId = () => store.document.sourceEnvironment?.id ?? null;

  function render() {
    if (!dialog.open || dragging) return;
    const scroll = content.scrollTop;
    content.innerHTML = ambiencePanel(look(), { environments: environments(), activeId: activeId(), duration, hues, transition: transition && { name: transition.name, progress: transition.progress } });
    content.scrollTop = scroll;
  }
  // One live frame per animation frame, however fast the pointer moves.
  function show(next) {
    pending = next;
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; if (!pending) return; viewport.setLiveLook(pending); sendLook(pending); pending = null; });
  }
  function patchFrom(input) {
    const name = input.dataset.ambience, channel = input.dataset.channel ?? null;
    const value = input.type === 'checkbox' ? input.checked : Number(input.value);
    if (channel === 'h') hues[name] = value;
    return ambiencePatch(look(), name, value, { channel, hue: hues[name] ?? null, center: viewport.getCamera().target });
  }
  function commit(patch, label) {
    try {
      if (patch.look) execute('look.update', { patch: patch.look }, { label });
      if (patch.key) execute('environment.key.update', { patch: patch.key }, { label });
    } catch (error) { notify(error.message, true); viewport.setDocument?.(store.document); }
  }

  function presetFor(id) { return ENVIRONMENTS.some(item => item.id === id) ? id : environments().find(item => item.id === id) ?? null; }
  function nameOf(id) { return AMBIENCE_TIMES.find(([key]) => key === id)?.[1] ?? environments().find(item => item.id === id)?.name ?? 'ambiente'; }
  function finish(cancelled = false) {
    if (!transition) return;
    const done = transition; transition = null; cancelAnimationFrame(done.frame); onTransition(false);
    if (!cancelled) { try { execute('environment.apply', { preset: done.preset }, { label: `Ambientação · ${done.name}` }); } catch (error) { notify(error.message, true); } }
    else { viewport.setLiveLook(look()); sendLook(look()); }
    render();
  }
  function travel(id) {
    const preset = presetFor(id); if (!preset) return;
    finish();
    if (!duration || matchMedia('(prefers-reduced-motion: reduce)').matches) { try { execute('environment.apply', { preset }, { label: `Ambientação · ${nameOf(id)}` }); } catch (error) { notify(error.message, true); } return; }
    let target;
    try { target = applyEnvironment(store.document, preset); } catch (error) { notify(error.message, true); return; }
    const from = look(), to = target.look ?? target.defaultLook, keyId = primaryLight(from)?.id ?? null;
    transition = { preset, name: nameOf(id), from, to, keyId: keyId && to.lights[keyId] ? keyId : null, start: performance.now(), seconds: duration, progress: 0, version: store.editVersion, frame: 0 };
    onTransition(true);
    const step = now => {
      if (!transition) return;
      // Anything else committed meanwhile wins: the transition stops where the scene is.
      if (store.editVersion !== transition.version) { finish(true); return; }
      transition.progress = Math.min(1, (now - transition.start) / (transition.seconds * 1000));
      const live = mixLook(transition.from, transition.to, smootherstep(transition.progress), transition.keyId);
      viewport.setLiveLook(live); sendLook(live);
      const bar = content.querySelector('.amb-progress i'); if (bar) bar.style.setProperty('--progress', `${Math.round(transition.progress * 100)}%`);
      if (transition.progress >= 1) finish(); else transition.frame = requestAnimationFrame(step);
    };
    transition.frame = requestAnimationFrame(step);
    render();
  }

  dialog.addEventListener('pointerdown', event => { if (event.target.matches?.('input[type=range][data-ambience]')) dragging = true; });
  // The browser releases the pointer before the slider reports its change: redrawing on release would put the old
  // value back under the hand and the change would never show. The change redraws; a release without one does, after.
  window.addEventListener('pointerup', () => { if (dragging) setTimeout(() => { if (dragging) { dragging = false; render(); } }, 0); });
  dialog.addEventListener('input', event => {
    const input = event.target; if (!input.dataset?.ambience || input.type === 'checkbox') return;
    try {
      const patch = patchFrom(input);
      show(patchedLook(look(), patch));
      const output = input.parentElement.querySelector('output'), name = input.dataset.ambience, channel = input.dataset.channel, value = Number(input.value);
      if (output) output.textContent = channel ? Math.round(channel === 'h' ? value : value * 100) : name === 'altitude' || name === 'azimuth' ? `${Math.round(value)}°` : name === 'weatherCount' ? Math.round(value) : Math.round(value * 100) / 100;
      const swatch = input.closest('.amb-color')?.querySelector('.amb-swatch'), color = channel && (name === 'key' ? patch.key.color : name === 'fogColor' ? patch.look.volumetricFog.color : patch.look.sky[name]);
      if (swatch && color) swatch.style.background = color;
    } catch (error) { notify(error.message, true); }
  });
  dialog.addEventListener('change', event => {
    const input = event.target; if (!input.dataset?.ambience) return;
    dragging = false;
    if (transition) finish();
    try { commit(patchFrom(input), 'Ambientação ao vivo'); } catch (error) { notify(error.message, true); }
    render();
  });
  dialog.addEventListener('click', event => {
    const time = event.target.closest('[data-ambience-time]'), weather = event.target.closest('[data-ambience-weather]'), seconds = event.target.closest('[data-ambience-duration]');
    if (time) travel(time.dataset.ambienceTime);
    else if (weather) { finish(); commit(ambiencePatch(look(), 'weatherType', weather.dataset.ambienceWeather, { center: viewport.getCamera().target }), 'Clima'); }
    else if (seconds) { duration = Number(seconds.dataset.ambienceDuration); render(); }
    else if (event.target.closest('[data-ambience-action="finish"]')) finish();
  });
  return { render, finish, get transitioning() { return Boolean(transition); }, get duration() { return duration; } };
}
