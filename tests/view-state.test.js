import test from 'node:test';
import assert from 'node:assert/strict';
import { sameCamera, viewState } from '../src/app/view-state.js';

const camera = (position = [1, 2, 3]) => ({ projection: 'perspective', position, target: [0, 0, 0], fov: 42 });

test('cameras match within a centimetre and the same lens', () => {
  assert.ok(sameCamera(camera(), camera([1.005, 2, 3])));
  assert.ok(!sameCamera(camera(), camera([1.2, 2, 3])));
  assert.ok(!sameCamera(camera(), { ...camera(), fov: 60 }));
  assert.ok(!sameCamera(camera(), { ...camera(), projection: 'orthographic' }));
  assert.ok(sameCamera(camera(), null));
});

test('the badge tells rehearsal from live', () => {
  const state = fields => viewState({ isPresentation: false, connected: false, working: camera(), published: camera(), ...fields }).key;
  assert.equal(state({}), 'rehearsal');
  assert.equal(state({ connected: true }), 'live');
  assert.equal(state({ connected: true, working: camera([5, 5, 5]) }), 'offset');
  assert.equal(state({ isPresentation: true, connected: true }), 'preview');
});
