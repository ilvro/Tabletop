import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createToken } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { movementCost, movementBand } from '../src/domain/movement.js';

test('movement is counted in metres and in squares by the chosen diagonal rule', () => {
  // Three squares right and two forward on a 1.5 m grid.
  const from = [0, 0, 0], to = [4.5, 0, 3];
  assert.ok(Math.abs(movementCost(from, to, 1.5).metres - Math.hypot(4.5, 3)) < 1e-9);
  assert.equal(movementCost(from, to, 1.5, 'chebyshev').squares, 3);
  assert.equal(movementCost(from, to, 1.5, 'alternate').squares, 4, 'two diagonals cost 1 + 2, then one straight');
  assert.equal(movementCost(from, to, 1.5).squares, 3.6);
  assert.equal(movementCost(from, [0, 2, 0], 1.5).metres, 0, 'height does not count as walking');
});

test('reach bands come from the actor speed, which is validated', () => {
  assert.equal(movementBand(5, 9), 'walk'); assert.equal(movementBand(12, 9), 'run'); assert.equal(movementBand(20, 9), 'far'); assert.equal(movementBand(20, 0), null);
  const store = createSceneStore(createScene('Movimento')), { token, actor } = createToken({ name: 'Lia', position: [0, 0, 0] });
  store.execute('token.add', { token, actor, snap: false });
  store.execute('actor.update', { id: actor.id, patch: { speed: 9 } });
  assert.equal(store.document.actors[actor.id].speed, 9);
  assert.throws(() => store.execute('actor.update', { id: actor.id, patch: { speed: -1 } }));
  store.execute('grid.update', { patch: { diagonal: 'alternate' } });
  assert.throws(() => store.execute('grid.update', { patch: { diagonal: 'taxi' } }));
});
