import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneAccent } from '../src/ui/scene-accent.js';

const key = color => ({ lights: { a: { role: 'fill', color: '#ff0000' }, b: { role: 'key', color } } });
const lightness = hex => { const n = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); return (Math.max(...n) + Math.min(...n)) / 2; };

test('a warm key light gives a warm accent in the readable band', () => {
  const accent = sceneAccent(key('#ff9a3c'));
  assert.match(accent, /^#[0-9a-f]{6}$/);
  assert.ok(parseInt(accent.slice(1, 3), 16) > parseInt(accent.slice(5, 7), 16));
  assert.ok(lightness(accent) >= .61 && lightness(accent) <= .73);
});

test('a cold blue light stays blue', () => {
  const accent = sceneAccent(key('#2b4cff'));
  assert.ok(parseInt(accent.slice(5, 7), 16) > parseInt(accent.slice(1, 3), 16));
});

test('grey or white light, no lights and no look fall back to the brand', () => {
  assert.equal(sceneAccent(key('#ffffff')), '#e3b878');
  assert.equal(sceneAccent(key('#888888')), '#e3b878');
  assert.equal(sceneAccent({ lights: {} }), '#e3b878');
  assert.equal(sceneAccent(undefined), '#e3b878');
  assert.equal(sceneAccent({ lights: {} }, '#123456'), '#123456');
});

test('extreme lightness is pulled into the readable band', () => {
  assert.ok(lightness(sceneAccent(key('#200800'))) >= .61);
  assert.ok(lightness(sceneAccent(key('#ffe0d0'))) <= .73);
});

test('without a key light the fog or the sky horizon tints it', () => {
  assert.notEqual(sceneAccent({ lights: {}, fog: { enabled: true, color: '#3366ff' } }), '#e3b878');
  assert.notEqual(sceneAccent({ lights: {}, sky: { enabled: true, horizonColor: '#cc5522' } }), '#e3b878');
});
