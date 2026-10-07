import { RENDERING_DEFAULTS } from './dynamic-lighting.js';
import { clone, createLight, id } from './documents.js';
import { isLocked } from './geometry.js';
import { ValidationError, validateDocument } from './validation.js';
import { FOG_DEFAULTS, VOLUME_DEFAULTS, BLOOM_DEFAULTS, DAYLIGHT_DEFAULTS, SKY_DEFAULTS, WEATHER_DEFAULTS, NIGHT_WINDOWS_DEFAULTS, kelvinToColor } from './lighting.js';

export const ENVIRONMENT_FIELDS = ['background', 'fill', 'daylight', 'sky', 'weather', 'fog', 'volumetricFog', 'bloom', 'nightWindows', 'effectsPaused', 'rendering'];
export const primaryLight = look => Object.values(look.lights).find(light => light.role === 'key' && light.type === 'directional');
const direction = (altitude, azimuth) => {
  const x = (90 - altitude) * Math.PI / 360, y = azimuth * Math.PI / 360;
  return [Math.cos(y) * Math.sin(x), Math.sin(y) * Math.cos(x), -Math.sin(y) * Math.sin(x), Math.cos(y) * Math.cos(x)];
};
const key = (temperature, intensity, altitude = 45, azimuth = 35) => ({ name: 'Sol / Lua', type: 'directional', position: [4, 8, 6], rotation: direction(altitude, azimuth), temperature, color: kelvinToColor(temperature), intensity, distance: 0, shadowEnabled: true, enabled: true, audience: 'all', locked: false, groupId: null, surfaceId: null });
const settings = options => ({ background: '#789eaf', fill: { skyColor: '#bdcddd', groundColor: '#6c6255', intensity: 1.2 },
  daylight: { ...DAYLIGHT_DEFAULTS }, sky: { ...SKY_DEFAULTS, enabled: true }, weather: clone(WEATHER_DEFAULTS),
  fog: { ...FOG_DEFAULTS }, volumetricFog: { ...VOLUME_DEFAULTS }, bloom: { ...BLOOM_DEFAULTS }, nightWindows: { ...NIGHT_WINDOWS_DEFAULTS }, effectsPaused: false, rendering: {...RENDERING_DEFAULTS},
  keyLight: key(6000, 2.4), ...options });
const recipes = {
  day: { name: 'Dia', description: 'Sol claro, céu azul e nuvens suaves.', settings: settings({}) },
  warm: { name: 'Tarde', description: 'Sol baixo e atmosfera alaranjada.', settings: settings({ background: '#915c43', keyLight: key(3300, 2, 22, -65), daylight: { phase: 'sunset', exposure: 1.1 }, fill: { skyColor: '#ddb38f', groundColor: '#724633', intensity: .6 }, sky: { ...SKY_DEFAULTS, enabled: true, topColor: '#9c5847', horizonColor: '#efb370', cloudColor: '#ead0b4', cloudCoverage: .4 } }) },
  moonlight: { name: 'Noite', description: 'Lua, estrelas, preenchimento azul e janelas acesas.', settings: settings({ background: '#111d35', keyLight: key(12000, .55, 48, -30), daylight: { phase: 'night', exposure: 1.1 }, fill: { skyColor: '#6786b5', groundColor: '#252e43', intensity: .32 }, sky: { ...SKY_DEFAULTS, enabled: true, topColor: '#071329', horizonColor: '#304f84', cloudColor: '#6c86b5', cloudOpacity: .22, cloudCoverage: .22 }, bloom: { ...BLOOM_DEFAULTS, enabled: true, strength: .18 } }) },
  fog: { name: 'Neblina', description: 'Luz difusa e névoa clara entre os planos.', settings: settings({ background: '#899b9d', keyLight: key(7000, .8), sky: { ...SKY_DEFAULTS, enabled: true, topColor: '#708486', horizonColor: '#adbfc0', celestialEnabled: false, cloudCoverage: .8 }, fog: { ...FOG_DEFAULTS, enabled: true, mode: 'exp2', color: '#a1b3b4', density: .018 }, volumetricFog: { ...VOLUME_DEFAULTS, enabled: true, density: .035, height: 4 } }) },
  rain: { name: 'Chuva', description: 'Céu encoberto e chuva em uma região editável.', settings: settings({ background: '#465763', keyLight: key(8500, .65), fill: { skyColor: '#8eacbf', groundColor: '#424b4f', intensity: .65 }, sky: { ...SKY_DEFAULTS, enabled: true, topColor: '#344550', horizonColor: '#8399a7', celestialEnabled: false, cloudCoverage: .88, cloudOpacity: .8, cloudSpeed: .06 }, weather: { ...clone(WEATHER_DEFAULTS), type: 'rain', count: 900, speed: 12 }, fog: { ...FOG_DEFAULTS, enabled: true, mode: 'exp2', color: '#839ba7', density: .012 } }) },
  swamp: { name: 'Pântano', description: 'Luz esverdeada, névoa baixa e poeira suspensa.', settings: settings({ background: '#344c38', keyLight: { ...key(6000, 1.1, 35), temperature: null, color: '#c0d38c' }, fill: { skyColor: '#8eae73', groundColor: '#3f5338', intensity: .75 }, sky: { ...SKY_DEFAULTS, enabled: true, topColor: '#456645', horizonColor: '#b8c393', cloudColor: '#a4b895', cloudCoverage: .6 }, fog: { ...FOG_DEFAULTS, enabled: true, color: '#718a61', near: 12, far: 85 }, volumetricFog: { ...VOLUME_DEFAULTS, enabled: true, color: '#8eaa78', density: .055, height: 1.8 }, weather: { ...clone(WEATHER_DEFAULTS), type: 'dust', count: 250, color: '#b6c48a', opacity: .3, particleSize: .035, speed: .25, size: [20, 4, 20] } }) },
  heat: { name: 'Calor', description: 'Luz e céu quentes, com poeira alaranjada.', settings: settings({ background: '#ba7441', keyLight: key(2600, 2.5, 60), fill: { skyColor: '#e5b677', groundColor: '#9c6140', intensity: .8 }, sky: { ...SKY_DEFAULTS, enabled: true, topColor: '#ac603e', horizonColor: '#f5c284', clouds: false }, weather: { ...clone(WEATHER_DEFAULTS), type: 'dust', count: 300, color: '#eec48e', opacity: .25, particleSize: .035, speed: .35 } }) },
  ritual: { name:'Horror ritual', description:'Contraste vermelho e azul, contatos e névoa iluminada. Adicione fontes rituais aos objetos.', settings:settings({background:'#151020',keyLight:{...key(11000,.3,55),temperature:null,color:'#a296e9'},daylight:{phase:'night',exposure:1.05},fill:{skyColor:'#7364aa',groundColor:'#25162c',intensity:.2},sky:{...SKY_DEFAULTS,enabled:true,topColor:'#160c33',horizonColor:'#874f90'},bloom:{...BLOOM_DEFAULTS,enabled:true,strength:.14},rendering:{...RENDERING_DEFAULTS,ao:true,reflections:true,volumetricLights:true,cutawayShadows:true},volumetricFog:{...VOLUME_DEFAULTS,enabled:true,color:'#65557a',density:.025,height:5}}) },
  tavern: { name:'Interior acolhedor', description:'Preenchimento quente, sombras suaves e reflexos discretos. Combine com lâmpadas e velas.', settings:settings({background:'#30251f',keyLight:key(3400,.4,55),sky:{...SKY_DEFAULTS,enabled:false},fill:{skyColor:'#c5a582',groundColor:'#483629',intensity:.4},bloom:{...BLOOM_DEFAULTS,enabled:true,strength:.1},rendering:{...RENDERING_DEFAULTS,ao:true,reflections:true}}) },
  office: { name:'Interior fluorescente', description:'Ambiente frio e legível, com contatos discretos. Adicione spots fluorescentes.', settings:settings({background:'#3a454e',keyLight:key(7000,.4,70),sky:{...SKY_DEFAULTS,enabled:false},fill:{skyColor:'#c8d9e7',groundColor:'#5e676c',intensity:.7},rendering:{...RENDERING_DEFAULTS,ao:true,reflections:true,reflectionIntensity:.2}}) },
  neutral: { name: 'Estúdio neutro', description: 'Leitura clara para preparar o mapa.', settings: settings({ background: '#303740', fill: { skyColor: '#d8e2ec', groundColor: '#78746c', intensity: 1.6 }, keyLight: key(6000, 2.1), sky: { ...SKY_DEFAULTS, enabled: false } }) },
};
export const ENVIRONMENTS = Object.entries(recipes).map(([id, recipe]) => ({ id, name: recipe.name, description: recipe.description }));

export function createEnvironmentFromLook(document, name = 'Meu ambiente') {
  const look = document.look ?? document.defaultLook, now = new Date().toISOString();
  const defaults = settings({ sky: { ...SKY_DEFAULTS } });
  const snapshot = Object.fromEntries(ENVIRONMENT_FIELDS.map(field => [field, clone(look[field] ?? defaults[field])]));
  const source = primaryLight(look) ?? createLight(key(6000, 2.4));
  snapshot.keyLight = Object.fromEntries(Object.keys(key(6000, 2.4)).map(field => [field, clone(source[field] === undefined ? defaults.keyLight[field] : source[field])]));
  snapshot.keyLight.temperature = source.temperature ?? null;
  snapshot.keyLight.groupId = null; snapshot.keyLight.surfaceId = null; snapshot.keyLight.locked = false; snapshot.keyLight.audience = 'all';
  return validateDocument({ schemaVersion: 2, documentType: 'environment', id: id(), name, revision: 0, createdAt: now, updatedAt: now, settings: snapshot });
}

/** Snapshot globals only. Geometry, material overrides, local lights and bindings survive. */
export function applyEnvironment(document, presetOrId) {
  const recipe = typeof presetOrId === 'string' ? recipes[presetOrId] : null;
  const preset = recipe ? { id: presetOrId, revision: 1, settings: recipe.settings } : presetOrId;
  if (!preset?.settings) throw new ValidationError('Ambiente desconhecido.');
  if (!recipe) validateDocument(preset);
  const next = clone(document), look = next.look ?? next.defaultLook;
  for (const field of ENVIRONMENT_FIELDS) if(preset.settings[field]!==undefined){
    if(recipe&&field==='rendering'&&look.rendering===undefined&&JSON.stringify(preset.settings.rendering)===JSON.stringify(RENDERING_DEFAULTS))continue;
    look[field] = clone(preset.settings[field]);
  }
  let light = primaryLight(look);
  if (!light) { light = createLight({ ...preset.settings.keyLight, role: 'key' }); look.lights[light.id] = light; }
  if (isLocked(next, light)) throw new ValidationError('Desbloqueie a luz principal e sua organização antes de trocar o ambiente.');
  Object.assign(light, clone(preset.settings.keyLight), { groupId: light.groupId, surfaceId: light.surfaceId, audience: light.audience, locked: light.locked });
  if (next.documentType === 'scene') next.sourceEnvironment = { id: preset.id, revision: preset.revision };
  return validateDocument(next);
}

export function environmentDiff(document, next) {
  const before = document.look ?? document.defaultLook, after = next.look ?? next.defaultLook;
  const fields = ENVIRONMENT_FIELDS.filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
  return { fields, bindings: Object.keys(after.environmentBindings ?? {}).length,
    windows: Object.values(next.layout.entities).filter(e => e.kind === 'window' && e.style === 'glass').length,
    localLights: Object.values(after.lights).filter(l => l.role !== 'key').length };
}
