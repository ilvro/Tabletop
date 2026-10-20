import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, score, search, GROUPS, WHERE } from '../src/ui/command-index.js';

const entry = (label, group = 'Ações', keywords = '') => ({ label, group, keywords });

test('accents and case do not matter', () => {
  assert.equal(normalize('  Névoa '), 'nevoa');
  assert.ok(score(entry('Névoa de distância'), 'nevoa') > 0);
  assert.ok(score(entry('Névoa de distância'), 'NÉVOA') > 0);
});

test('prefix beats word start beats inside; keywords count half', () => {
  assert.ok(score(entry('Sofá de sala'), 'sof') > score(entry('Poltrona sofá'), 'sof'));
  assert.equal(score(entry('Mesa'), 'xyz'), 0);
  assert.ok(score(entry('Mesa', 'Ações', 'rejunte'), 'rejunte') < score(entry('Rejunte'), 'rejunte'));
  assert.equal(score(entry('Piso de azulejo'), 'piso azulejo') > 0, true);
  assert.equal(score(entry('Piso de madeira'), 'piso azulejo'), 0);
});

test('search orders by score, then group, then name, and respects the limit', () => {
  const entries = [entry('Salvar', 'Tarefas'), entry('Salvar', 'Ações'), entry('Abrir salvos', 'Ações')];
  assert.deepEqual(search(entries, 'salv').map(item => item.group), ['Ações', 'Tarefas', 'Ações']);
  assert.equal(search(entries, 'salv', 1).length, 1);
  assert.deepEqual(search(entries, ''), []);
});

test('the groups and the hints are complete', () => {
  assert.equal(new Set(GROUPS).size, GROUPS.length);
  assert.ok(WHERE.length >= 20);
  for (const hint of WHERE) assert.ok(hint.label && hint.hint, hint.label);
  assert.ok(search(WHERE.map(item => ({ ...item, group: 'Onde fica' })), 'rejunte').length >= 1);
});

test('a control in the selection outranks the hint about where it lives', () => {
  const entries = [entry('Rejunte do azulejo', 'Onde fica'), entry('Largura do rejunte', 'Nesta seleção')];
  assert.equal(search(entries, 'rejunte')[0].group, 'Nesta seleção');
});
