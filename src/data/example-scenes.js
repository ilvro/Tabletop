import { applicationURL } from './paths.js';
import { duplicateDocument, validateDocument } from '../domain/documents.js';

/** Bundled originals are never saved over. Loading always makes a private draft. */
export const EXAMPLE_SCENES = Object.freeze([
  Object.freeze({ id: 'snowy-mountain-pass', name: 'Subida da montanha · caverna e ruínas',
    description: 'Encosta esculpida com rochas orgânicas, caverna lateral, ponte, ruínas, abetos densos e tempestade de neve. Cópia totalmente editável.',
    file: 'scenes/snowy-mountain-pass.json' }),
  Object.freeze({id:'backrooms',name:'Backrooms · corredores e salas esquecidas',
    description:'Labirinto amarelo com corredores interligados, oito setores, pilares, arquivo, manutenção, fluorescentes e teto ocultável. Cinco câmeras e cópia editável.',
    file:'scenes/backrooms.json'}),
  Object.freeze({ id:'casa-de-bairro',name:'Casa de bairro · jardim e quintal',
    description:'Casa térrea mobiliada: sala e jantar, dois quartos, cozinha, banheiro, lavanderia, garagem e quintal. Portas funcionais, cobertura ocultável e cinco câmeras.',
    file:'scenes/casa-de-bairro.json' }),
  Object.freeze({ id:'igreja-antiga',name:'Igreja Antiga · templo e vale dos vampiros',
    description:'Igreja completa com banquete, conjunto ritual, galerias, sala de correntes, torre, cobertura e caminho pelo vale violeta. Dez câmeras e cópia totalmente editável.',
    file:'scenes/igreja-antiga.json' }),
  Object.freeze({ id:'galpao-industrial',name:'Galpão industrial · abandonado',
    description:'Galpão de 16 × 12 m com cabos, tela acesa, letreiros, faixas de alerta, piso molhado, faíscas e goteira. Cinco câmeras e cópia editável.',
    file:'scenes/galpao-industrial.json' }),
  Object.freeze({ id:'templo-gelado',name:'Templo gelado · caverna e grade levadiça',
    description:'Salão de pilares numa caverna de neve e, atrás da grade levadiça, um complexo nórdico abandonado em dois níveis — biblioteca, salão de banquete, quartos, caverna pintada, forja — e um abismo com escada em espiral. Luzes que se acendem por sala. Trinta câmeras e cópia editável.',
    file:'scenes/templo-gelado.json' }),
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
