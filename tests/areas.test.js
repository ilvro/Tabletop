import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { areaFromDrag, areaTouches, areaOutline } from '../src/domain/areas.js';
import { projectPresentation } from '../src/app/presentation.js';

test('a drag draws an area, and tokens touch it by shape', () => {
  const circle = areaFromDrag([0, 0, 0], [3, 0, 4], { id: 'c', shape: 'circle' });
  assert.equal(circle.size, 5);
  assert.ok(areaTouches(circle, [4, 0, 0])); assert.ok(!areaTouches(circle, [6, 0, 0])); assert.ok(areaTouches(circle, [5.4, 0, 0], .5), 'the base counts');
  const cone = areaFromDrag([0, 0, 0], [0, 0, 6], { id: 'k', shape: 'cone' });
  assert.ok(areaTouches(cone, [0, 0, 3])); assert.ok(areaTouches(cone, [1.4, 0, 3]), 'half as wide as long'); assert.ok(!areaTouches(cone, [2, 0, 3])); assert.ok(!areaTouches(cone, [0, 0, -1]), 'not behind the apex');
  const line = areaFromDrag([0, 0, 0], [6, 0, 0], { id: 'l', shape: 'line', width: 2 });
  assert.ok(areaTouches(line, [3, 0, .9])); assert.ok(!areaTouches(line, [3, 0, 1.2])); assert.ok(!areaTouches(line, [7, 0, 0]));
  const square = areaFromDrag([0, 0, 0], [0, 0, 2], { id: 's', shape: 'square' });
  assert.ok(areaTouches(square, [1.9, 0, -1.9])); assert.ok(!areaTouches(square, [2.2, 0, 0]));
  assert.equal(areaOutline(square).length, 4); assert.ok(areaOutline(cone).length > 3);
});

test('areas are validated session state, added, removed and cleared one undo step each, and shown on the projector', () => {
  const store = createSceneStore(createScene('Áreas'));
  store.execute('area.add', { area: areaFromDrag([0, 0, 0], [2, 0, 0], { id: 'a', shape: 'circle', label: 'Bola de fogo' }) });
  store.execute('area.add', { area: areaFromDrag([0, 0, 0], [0, 0, 4], { id: 'b', shape: 'cone', color: '#5bc0eb' }) });
  assert.equal(store.document.sessionState.areas.length, 2);
  assert.throws(() => store.execute('area.add', { area: { ...store.document.sessionState.areas[0], id: 'c', shape: 'star' } }), /Forma/);
  assert.equal(projectPresentation(store.document).sessionState.areas.length, 2);
  store.execute('area.remove', { id: 'a' }); assert.deepEqual(store.document.sessionState.areas.map(area => area.id), ['b']);
  store.execute('areas.clear', {}); assert.equal(store.document.sessionState.areas, undefined);
  store.undo(); assert.equal(store.document.sessionState.areas.length, 1);
});
