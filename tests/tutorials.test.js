import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../src/tutorial/lessons.js';
import { CONDITIONS, met } from '../src/tutorial/conditions.js';

const checks = done => (Array.isArray(done?.[0]) ? done : [done]);

test('every lesson is well-formed data: unique ids, known conditions and targets written with interface identifiers', () => {
  assert.equal(new Set(LESSONS.map(lesson => lesson.id)).size, LESSONS.length);
  for (const lesson of LESSONS) {
    assert.ok(lesson.title && lesson.summary && lesson.minutes > 0, lesson.id);
    assert.ok(lesson.steps.length >= 2, lesson.id);
    lesson.steps.forEach((step, index) => {
      const where = `${lesson.id} #${index + 1}`;
      assert.ok(step.say && step.say.length <= 140, `${where}: one short instruction`);
      assert.ok(step.done, `${where}: a step says what completes it`);
      for (const [name] of checks(step.done)) assert.ok(CONDITIONS[name], `${where}: unknown condition ${name}`);
      if (step.done[0] !== 'read') assert.ok(step.target, `${where}: a step that waits for an action points at something`);
      // Targets hold on to identifiers the interface already keeps stable, never to layout or text.
      if (step.target) assert.match(step.target, /data-(action|tab|field|choice|asset|build-section)=|#[a-z-]+|\.assistant-reading/, where);
      if (step.act === 'continue') assert.equal(step.done[0], 'read', where);
    });
    assert.equal(lesson.steps.at(-1).done[0], 'read', `${lesson.id}: a lesson ends on a closing step`);
  }
});

test('conditions read the document and the interface state, alone or together', () => {
  const entity = (kind, extra = {}) => ({ kind, tags: [], ...extra });
  const state = { document: { layout: { entities: { a: entity('wall'), b: entity('wall'), c: entity('prop', { assetRef: { id: 'builtin-stove' }, tags: ['entorno'] }) } } }, tab: 'build', sections: ['room'], proposal: false, assetsOpen: false, listedAssets: [], placing: null, assistant: { inferred: 'kitchen', state: 'ritual', buildingMode: 'new' } };
  assert.ok(met(['tab', 'build'], state)); assert.ok(!met(['tab', 'scene'], state));
  assert.ok(met(['atLeast', 'wall', 2], state)); assert.ok(!met(['atLeast', 'wall', 3], state));
  assert.ok(met(['hasAsset', 'builtin-stove'], state)); assert.ok(met(['hasTag', 'entorno'], state));
  assert.ok(met([['taskOpen', 'room'], ['previewClosed']], state)); assert.ok(!met([['taskOpen', 'room'], ['previewOpen']], state));
  assert.ok(met(['assistantState', 'ritual'], state)); assert.ok(met(['buildingMode', 'new'], state));
  assert.ok(!met(['read'], state), 'a reading step only leaves by Continuar');
});
