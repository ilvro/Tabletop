import { applicationURL } from './paths.js';
import { duplicateDocument, validateDocument } from '../domain/documents.js';

/** Bundled originals are never saved over. Loading always makes a private draft. */
export const EXAMPLE_SCENES = Object.freeze([
  Object.freeze({ id: 'snowy-mountain-pass', name: 'Subida da montanha · caverna e ruínas',
    description: 'Uma encosta nevada com subida, caverna lateral, ponte elevada, ruínas e lanternas arredondadas. Terreno, materiais, neve e câmeras editáveis.',
    file: 'scenes/snowy-mountain-pass.json', preview: 'scenes/snowy-mountain-pass.jpg' }),
  Object.freeze({ id: 'icewind-bridge', name: 'Passagem de Inverno · Ponte e Névoa',
    description: 'Um vale nevado e escuro com uma ponte gigantesca ao fundo e uma torre em ruínas.',
    file: 'scenes/icewind-bridge.json', preview: 'scenes/icewind-bridge.jpg' }),
]);

export async function loadExampleScene(exampleId, { fetcher = globalThis.fetch } = {}) {
  const example = EXAMPLE_SCENES.find(item => item.id === exampleId);
  if (!example) throw new Error('Cena de exemplo desconhecida.');
  const response = await fetcher(applicationURL(example.file));
  if (!response.ok) throw new Error('Não foi possível carregar esta cena de exemplo. Tente novamente.');
  const original = validateDocument(await response.json());
  if (original.documentType !== 'scene') throw new Error('O exemplo precisa ser uma cena.');
  return duplicateDocument(original, { name: example.name });
}
