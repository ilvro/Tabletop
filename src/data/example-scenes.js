import { applicationURL } from './paths.js';
import { duplicateDocument, validateDocument } from '../domain/documents.js';

/** Bundled originals are never saved over. Loading always makes a private draft. */
export const EXAMPLE_SCENES = Object.freeze([
  Object.freeze({ id: 'snowy-mountain-pass', name: 'Subida da montanha · caverna e ruínas',
    description: 'Encosta esculpida com rochas orgânicas, caverna lateral, ponte, ruínas, abetos densos e tempestade de neve. Cópia totalmente editável.',
    file: 'scenes/snowy-mountain-pass.json', preview: 'scenes/snowy-mountain-pass.jpg' }),
  Object.freeze({ id: 'icewind-bridge', name: 'Passagem de Inverno · Ponte e Névoa',
    description: 'Um vale nevado e escuro com uma ponte gigantesca ao fundo e uma torre em ruínas.',
    file: 'scenes/icewind-bridge.json', preview: 'scenes/icewind-bridge.jpg' }),
  ...[
    ['lighting-chapel','Iluminação · capela ritual','Nave vermelha e exterior violeta, vitrais projetados, candelabros e névoa local.'],
    ['lighting-tavern','Iluminação · taverna acolhedora','Velas agrupadas, lâmpadas quentes, madeira e sombras editáveis.'],
    ['lighting-office','Iluminação · escritório fluorescente','Spots frios sem cintilação, zonas e circulação legível.'],
    ['lighting-street','Iluminação · rua chuvosa','Postes com sombras, asfalto úmido, névoa e chuva.'],
  ].map(([id,name,description])=>Object.freeze({id,name,description,file:`scenes/${id}.json`,preview:`scenes/${id}.jpg`})),
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
