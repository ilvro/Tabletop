import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenePreviews } from '../src/app/scene-previews.js';
import { createScene } from '../src/domain/documents.js';

test('a late cover for a saved snapshot never replaces the image of newer unsaved edits', async t => {
  const source = { ...createScene('Original'), revision: 1 };
  const other = { ...createScene('Outra cena'), revision: 1 };
  const receipt = { ...source, revision: 2, updatedAt: '2026-10-05T20:00:00.000Z' };
  let live = { document: source, version: 1, dirty: false }, release;
  const blockedRender = new Promise(resolve => { release = resolve; });
  const stored = [], errors = [];
  const previews = createScenePreviews({
    current: () => live, assets: () => [],
    viewport: { ready: async () => {}, captureThumbnail: () => 'newer-edits-image' },
    repository: { savePreview: async (document, image) => stored.push({ document, image }) },
    renderPreview: document => document.id === other.id ? blockedRender : Promise.resolve('saved-snapshot-image'),
    onUpdate: () => {}, onError: error => errors.push(error),
  });
  t.after(() => previews.dispose());
  const first = previews.saved(other);
  const saved = previews.saved(receipt, 1);
  live = { document: { ...receipt, name: 'Alteração posterior' }, version: 2, dirty: true };
  previews.schedule();
  // New editing work has priority over the older library/snapshot job.
  await new Promise(resolve => setTimeout(resolve, 1050));
  release('other-image'); await first; await saved;
  assert.equal(previews.image(live.document), 'newer-edits-image');
  assert.equal(stored.find(entry => entry.document.id === source.id).image, 'saved-snapshot-image');
  assert.equal(stored.find(entry => entry.document.id === source.id).document.name, 'Original');
  assert.equal(live.document.name, 'Alteração posterior');
  // A speculative environment on the viewport must not become the document cover.
  live = { ...live, version: 3, previewing: true };
  previews.schedule(); await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal(previews.image(live.document), 'saved-snapshot-image');
  assert.deepEqual(errors, []);
});
