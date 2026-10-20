import test from 'node:test';
import assert from 'node:assert/strict';
import { initials, posterMarkup } from '../src/ui/posters.js';

test('initials come from the first two words', () => {
  assert.equal(initials('Casa de bairro · jardim'), 'CD');
  assert.equal(initials('igreja'), 'I');
  assert.equal(initials(''), '·');
});

test('the open attribute stays on the main button and the text is escaped', () => {
  const html = posterMarkup({ tag: 'EXEMPLO', name: '<b>x</b>', open: 'data-open-example="a"', cta: 'Carregar cena', actions: '<button>Excluir</button>' });
  assert.match(html, /<button type="button" class="item-card-main poster-main" data-open-example="a">/);
  assert.ok(!html.includes('<b>x</b>'));
  assert.match(html, /poster-actions/);
});
