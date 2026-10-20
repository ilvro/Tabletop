import test from 'node:test';
import assert from 'node:assert/strict';
import { shotsPanel, shotDockMarkup } from '../src/ui/shots-panel.js';

const doc = { cameraPresets: { a: { id: 'a', name: 'Entrada' }, b: { id: 'b', name: 'Altar' } } };

test('the shot on air is marked only while a projector is connected', () => {
  assert.match(shotsPanel(doc, { publishedId: 'a', live: true }), /class="shot is-live[^"]*" data-shot="a"/);
  assert.doesNotMatch(shotsPanel(doc, { publishedId: 'a', live: false }), /is-live/);
});

test('the rehearsed shot is marked and every action keeps its selector', () => {
  const html = shotsPanel(doc, { rehearsedId: 'b' });
  assert.match(html, /class="shot  is-rehearsed" data-shot="b"/);
  for (const attribute of ['data-camera-rehearse', 'data-camera', 'data-camera-cut', 'data-camera-delete']) assert.ok(html.includes(`${attribute}="b"`), attribute);
  assert.match(html, /data-action="camera-save"/);
});

test('the dock shows previous, current and next and disables the ends', () => {
  const html = shotDockMarkup(doc, { index: 0, publishedId: 'a' });
  assert.match(html, /is-current is-live/);
  assert.match(html, /data-dock-step="-1"[^>]*disabled/);
  assert.equal(shotDockMarkup({ cameraPresets: {} }), '');
});
