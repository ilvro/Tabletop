import test from 'node:test';
import assert from 'node:assert/strict';
import { measureDistance, measurementText } from '../src/domain/measurement.js';

test('ruler uses world metres, horizontal XZ, spatial distance and signed Y elevation', () => {
  const start = [-8, 2, -7], end = [-5, 14, -3], original = structuredClone([start, end]);
  assert.deepEqual(measureDistance(start, end, 1.5), { horizontal: 5, spatial: 13, elevation: 12, cells: 5 / 1.5 });
  assert.deepEqual(measureDistance(end, start, 2), { horizontal: 5, spatial: 13, elevation: -12, cells: 2.5 });
  assert.deepEqual([start, end], original);
});

test('vertical and zero-length rulers work without a valid grid', () => {
  assert.deepEqual(measureDistance([0, 2, 0], [0, 5, 0]), { horizontal: 0, spatial: 3, elevation: 3, cells: null });
  for (const size of [undefined, 0, -1, Infinity, NaN]) assert.deepEqual(measureDistance([1, 2, 3], [1, 2, 3], size), { horizontal: 0, spatial: 0, elevation: 0, cells: null });
  assert.throws(() => measureDistance([NaN, 0, 0], [0, 0, 0]), TypeError);
  assert.throws(() => measureDistance([0, 0], [0, 0, 0]), TypeError);
  assert.throws(() => measureDistance(null, [0, 0, 0]), TypeError);
});

test('ruler labels distinguish metric measurements from physical cell equivalents', () => {
  assert.match(measurementText(null), /clique na origem/);
  assert.equal(measurementText(measureDistance([0, 0, 0], [3, 12, 4], 2)), 'Plano: 5,00 m · 3D: 13,00 m · Desnível: +12,00 m · 2,50 células (plano)');
  assert.match(measurementText(measureDistance([0, 3, 0], [0, 1, 0])), /Desnível: -2,00 m$/);
  assert.doesNotMatch(measurementText(measureDistance([0, .00001, 0], [0, 0, 0])), /-0,00|células/);
});
