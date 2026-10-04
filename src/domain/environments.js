import { clone, createLight } from './documents.js';
import { ValidationError, validateDocument } from './validation.js';

const recipes = {
  warm: { name: 'Fim de tarde', description: 'Madeira, luz suave e preenchimento azul.', background: '#202a34',
    fill: { skyColor: '#a7c4db', groundColor: '#5b493b', intensity: 1.35 }, color: '#ffe8c5', intensity: 2.2 },
  moonlight: { name: 'Luar', description: 'Contraste frio com as luzes locais preservadas.', background: '#121b2d',
    fill: { skyColor: '#7399c9', groundColor: '#303849', intensity: 0.85 }, color: '#b5cdf6', intensity: 1.7 },
  neutral: { name: 'Estúdio neutro', description: 'Leitura clara para preparar e apresentar o mapa.', background: '#303740',
    fill: { skyColor: '#d8e2ec', groundColor: '#78746c', intensity: 1.6 }, color: '#fff5e5', intensity: 2.1 },
};

export const ENVIRONMENTS = Object.entries(recipes).map(([id, recipe]) => ({ id, name: recipe.name, description: recipe.description }));

/** Internal presets materialize look only; local point lights and geometry survive. */
export function applyEnvironment(document, presetId) {
  const recipe = recipes[presetId];
  if (!recipe) throw new ValidationError('Ambiente desconhecido.');
  const next = clone(document), look = next.look ?? next.defaultLook;
  look.background = recipe.background; look.fill = clone(recipe.fill);
  let keys = Object.values(look.lights).filter(light => light.role === 'key' && light.type === 'directional');
  if (!keys.length) {
    const key = createLight({ type: 'directional', role: 'key', name: 'Luz principal', position: [4, 8, 6],
      rotation: [0.27059805, 0.27059805, 0, 0.92387953], shadowEnabled: true, distance: 0 });
    look.lights[key.id] = key; keys = [key];
  }
  for (const key of keys) { key.color = recipe.color; key.temperature = null; key.intensity = recipe.intensity; }
  if (next.documentType === 'scene') next.sourceEnvironment = { id: presetId, revision: 1 };
  return validateDocument(next);
}
