import test from 'node:test';
import assert from 'node:assert/strict';
import { numberField, choiceField, splitLabel } from '../src/ui/controls.js';
import { textureSelect, textureCustomization, wearPanel } from '../src/ui/material-panels.js';
import { numberField as n, colorField } from '../src/ui/controls.js';
import { wearDefaults } from '../src/domain/wear.js';

test('labels give up their unit and hint to the control', () => {
  assert.deepEqual(splitLabel('Largura do rejunte · % · da peça'), { name: 'Largura do rejunte', unit: '%', hint: 'da peça' });
  assert.deepEqual(splitLabel('Grão · 0–1'), { name: 'Grão', unit: '', hint: '' });
  assert.equal(splitLabel('Rotação · graus').unit, '°');
});

test('bounded values get a slider beside the same native field; open or huge ranges and seeds do not', () => {
  const range = numberField('material-roughness', 'Rugosidade', .5, { min: 0, max: 1, step: .05 });
  assert.match(range, /class="field range-field"/);
  assert.match(range, /<input type="number" data-field="material-roughness" value="0.5"/);
  assert.match(range, /<input type="range" data-range="material-roughness" value="0.5" step="0.05" min="0" max="1"/);
  assert.equal((range.match(/data-field=/g) ?? []).length, 1, 'only the number commits the field');
  for (const html of [numberField('width', 'Largura · m', 2, { min: 0 }), numberField('light-intensity', 'Força', 5, { min: 0, max: 10000, step: 1 }), numberField('wear-seed', 'Variação · seed', 3, { min: 0, max: 255, step: 1 })]) {
    assert.match(html, /measure-field/); assert.doesNotMatch(html, /type="range"/);
  }
  assert.match(numberField('width', 'Largura · m', 2), /<i>m<\/i>/);
  assert.match(numberField('material-relief', 'Relevo', 0, { min: 0, max: .2, step: .005, disabled: true }), /type="number"[^>]*disabled[\s\S]*type="range"[^>]*disabled/);
});

test('choices keep a native select as the field and offer one button per option', () => {
  const html = choiceField('light-type', 'Tipo de luz', 'spot', [['point', 'Pontual'], ['spot', 'Spot · foco cônico'], ['directional', 'Direcional']]);
  assert.match(html, /<select data-field="light-type"[^>]*>[\s\S]*value="spot" selected/);
  assert.match(html, /class="segments"/);
  assert.match(html, /aria-checked="true" data-choice="spot" class="active" title="Spot · foco cônico"[^>]*><span>Spot<\/span>/);
  assert.equal((html.match(/data-choice=/g) ?? []).length, 3);
  assert.match(choiceField('f', 'L', 'a', [['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'Longo nome', 'D']]), /class="chips"[\s\S]*<span>D<\/span>/);
});

test('materials are chosen from swatches with the pattern controls in view', () => {
  const grid = textureSelect('material-texture', 'tile');
  assert.match(grid, /class="swatches"/);
  assert.match(grid, /data-choice="tile" class="active"[^>]*><i class="swatch-image" data-swatch="texture=tile"/);
  assert.match(grid, /data-choice="none"[^>]*><i class="swatch-image empty">/);
  const panel = textureCustomization('material-', { texture: 'tile' }, { numberField: n, colorField });
  assert.doesNotMatch(panel.slice(0, panel.indexOf('<details')), /<details/);
  const design = panel.indexOf('DESENHO · AZULEJO'), colour = panel.indexOf('>COR<'), fine = panel.indexOf('Ajustes finos');
  assert.ok(design >= 0 && design < colour && colour < fine);
  assert.ok(panel.indexOf('data-field="material-tilePattern"') < colour, 'pattern sits in the open design group');
  assert.match(panel, /data-swatch="texture=tile;tilePattern=hex"/);
  assert.ok(panel.indexOf('data-field="material-textureSeed"') > fine);
});

test('wear type and placement are one click away', () => {
  const html = wearPanel({ wear: { ...wearDefaults('rust'), placement: 'edges' } }, { numberField: n, colorField });
  assert.match(html, /data-choice="rust" class="active"[^>]*><span>Ferrugem<\/span>/);
  assert.match(html, /data-choice="edges" class="active"[^>]*><span>Bordas<\/span>/);
});
