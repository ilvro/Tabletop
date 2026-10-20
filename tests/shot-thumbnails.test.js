import test from 'node:test';
import assert from 'node:assert/strict';
import { createShotThumbnails } from '../src/app/shot-thumbnails.js';

const doc = count => ({ id: 'd', revision: 1, cameraPresets: Object.fromEntries(Array.from({ length: count }, (_, i) => [`c${i}`, { id: `c${i}`, name: `C${i}`, position: [i, 1, 1] }])) });
const settle = ms => new Promise(resolve => setTimeout(resolve, ms));

test('renders one thumbnail at a time and caches them', async () => {
  let active = 0, peak = 0, calls = 0;
  const thumbs = createShotThumbnails({ assets: () => [], canRun: () => true, onUpdate: () => {}, pause: 0, render: async (_, camera) => { active++; peak = Math.max(peak, active); calls++; await settle(5); active--; return `img-${camera.id}`; } });
  const document = doc(3);
  thumbs.request(document, 1);
  await settle(1000);
  assert.equal(peak, 1); assert.equal(calls, 3);
  assert.equal(thumbs.image(document, document.cameraPresets.c1, 1), 'img-c1');
  thumbs.request(document, 1); await settle(300); assert.equal(calls, 3, 'cached shots are not rendered again');
  assert.equal(thumbs.image(document, document.cameraPresets.c1, 2), undefined, 'another edit version is another thumbnail');
  thumbs.dispose();
});

test('waits while the editor is busy and drops work on cancel', async () => {
  let allowed = false, calls = 0;
  const thumbs = createShotThumbnails({ assets: () => [], canRun: () => allowed, onUpdate: () => {}, pause: 0, render: async () => { calls++; return 'x'; } });
  thumbs.request(doc(1), 1); await settle(500); assert.equal(calls, 0);
  allowed = true; await settle(1500); assert.equal(calls, 1);
  thumbs.request(doc(2), 2); thumbs.cancel(); await settle(500); assert.equal(calls, 1);
  thumbs.dispose();
});

test('keeps at most 48 thumbnails', async () => {
  const thumbs = createShotThumbnails({ assets: () => [], canRun: () => true, onUpdate: () => {}, pause: 0, render: async (_, camera) => `img-${camera.id}` });
  const document = doc(50);
  thumbs.request(document, 1); await settle(14_000);
  const cached = Object.values(document.cameraPresets).filter(camera => thumbs.image(document, camera, 1)).length;
  assert.ok(cached <= 48 && cached >= 40, `${cached}`);
  thumbs.dispose();
});
