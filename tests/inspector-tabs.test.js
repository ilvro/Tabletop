import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectorTabFor, INSPECTOR_TABS, kindLabel } from '../src/ui/inspector-tabs.js';

// Section titles collected from the inspector of every kind of object in the example scenes.
const TITLES = {
  position: ['POSIÇÃO · METROS', 'DIMENSÕES · METROS', 'ESCALA VISUAL', 'CONTORNO LOCAL · X/Z', 'ABERTURA NA PAREDE', 'ABERTURAS E PAREDES', 'JANELA HOSPEDADA', 'ACESSO ENTRE ALTURAS', 'ANDARES CONECTADOS', 'RECORTES DO PISO', 'FIXAR EM PAREDE / TETO', 'FIXAR / ANCORAR · parede', 'SUPERFÍCIE DE APOIO', 'BASE · METROS', 'ÁREA DO TERRENO', 'ALTURA DE UM VÉRTICE', 'Alinhar e ajustar objetos'],
  look: ['PINCEL DE SUPERFÍCIE · T', 'MATERIAL E TEXTURA', 'MATERIAIS DA SELEÇÃO', 'MATERIAL · ESCOLHA O ALCANCE', 'COR', 'CORES', 'DESENHO', 'DESGASTE', 'TELA', 'DECALQUE', 'VEGETAÇÃO · GEOMETRIA', 'GEOMETRIA DA ROCHA', 'ÁGUA / GELO', 'EFEITO LOCAL', 'EFEITO DE TUBO', 'FOGO E FUMAÇA', 'CABO', 'LINHAS · ATÉ 3', 'BARRA DE PROGRESSO', 'DETALHES', 'AJUSTES · mesa'],
  light: ['ILUMINAÇÃO', 'LUZ NESTE OBJETO', 'LUZ DO CÔMODO', 'ZONA DE AMBIENTE', 'OBJETOS QUE ACENDEM À NOITE'],
  organize: ['ORGANIZAÇÃO', 'ANDAR / CAMADA', 'APRESENTAÇÃO'],
};

test('every inspector section title belongs to its tab', () => {
  for (const [tab, titles] of Object.entries(TITLES)) for (const title of titles) assert.equal(inspectorTabFor(title), tab, title);
});

test('unknown titles have no tab and the tab list is complete', () => {
  assert.equal(inspectorTabFor('Organização'), 'organize');
  assert.equal(inspectorTabFor('xyz'), null);
  assert.deepEqual(INSPECTOR_TABS.map(tab => tab.id), ['position', 'look', 'light', 'organize']);
});

test('kind labels', () => {
  assert.equal(kindLabel({ type: 'token', record: {} }), 'TOKEN');
  assert.equal(kindLabel({ type: 'light', record: {} }), 'LUZ');
  assert.equal(kindLabel({ type: 'group', record: {} }), 'COMPOSIÇÃO');
  assert.equal(kindLabel({ type: 'entity', record: { kind: 'water', water: { state: 'ice' } } }), 'GELO');
  assert.equal(kindLabel({ type: 'entity', record: { kind: 'wall' } }), 'PAREDE');
  assert.equal(kindLabel({ type: 'entity', record: { kind: 'prop' } }), 'OBJETO');
});
