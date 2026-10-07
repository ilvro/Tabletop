import { applicationURL } from './paths.js';
import { duplicateDocument, validateDocument } from '../domain/documents.js';

/** Bundled originals are never saved over. Loading always makes a private draft. */
export const EXAMPLE_SCENES = Object.freeze([
  Object.freeze({ id: 'snowy-mountain-pass', name: 'Subida da montanha · caverna e ruínas',
    description: 'Encosta esculpida com rochas orgânicas, caverna lateral, ponte, ruínas, abetos densos e tempestade de neve. Cópia totalmente editável.',
    file: 'scenes/snowy-mountain-pass.json' }),
  Object.freeze({ id: 'icewind-bridge', name: 'Passagem de Inverno · Ponte e Névoa',
    description: 'Um vale nevado e escuro com uma ponte gigantesca ao fundo e uma torre em ruínas.',
    file: 'scenes/icewind-bridge.json' }),
  Object.freeze({ id:'igreja-antiga',name:'Igreja Antiga · templo e vale dos vampiros',
    description:'Igreja completa com banquete, conjunto ritual, galerias, sala de correntes, torre, cobertura e caminho pelo vale violeta. Dez câmeras e cópia totalmente editável.',
    file:'scenes/igreja-antiga.json' }),
  ...[
    ['lighting-chapel','Iluminação · capela ritual','Nave vermelha e exterior violeta, vitrais projetados, candelabros e névoa local.'],
    ['lighting-tavern','Iluminação · taverna acolhedora','Velas agrupadas, lâmpadas quentes, madeira e sombras editáveis.'],
    ['lighting-office','Iluminação · escritório fluorescente','Spots frios sem cintilação, zonas e circulação legível.'],
    ['lighting-street','Iluminação · rua chuvosa','Postes com sombras, asfalto úmido, névoa e chuva.'],
  ].map(([id,name,description])=>Object.freeze({id,name,description,file:`scenes/${id}.json`})),
]);

export async function readExampleScene(exampleId, { fetcher = globalThis.fetch, signal } = {}) {
  const example = EXAMPLE_SCENES.find(item => item.id === exampleId);
  if (!example) throw new Error('Cena de exemplo desconhecida.');
  const response = await fetcher(applicationURL(example.file), { signal });
  if (!response.ok) throw new Error('Não foi possível carregar esta cena de exemplo. Tente novamente.');
  const original = validateDocument(await response.json());
  if (original.documentType !== 'scene') throw new Error('O exemplo precisa ser uma cena.');
  return original;
}

export async function loadExampleScene(exampleId, options) {
  const original = await readExampleScene(exampleId, options);
  return duplicateDocument(original, { name: EXAMPLE_SCENES.find(item => item.id === exampleId).name });
}
