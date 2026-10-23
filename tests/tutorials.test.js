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
      if (step.target) assert.match(step.target, /data-(action|tab|field|choice|asset|build-section|environment|open-example|ambience|ambience-time|ambience-duration)=|#[a-z-]+|^\.(assistant-reading|tabs|inspector|camera-strip|tool-strip)$/, where);
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

test('cinematography conditions read the camera, the live window and the tokens', () => {
  const key = { role: 'key', type: 'directional', rotation: [Math.sin(41 * Math.PI / 360), 0, 0, Math.cos(41 * Math.PI / 360)] };
  const state = { document: { name: 'Casa de bairro · jardim e quintal', layout: { entities: {} }, look: { lights: { key } }, tokens: { t: { flashlight: { enabled: true, pitch: 25 } } }, cameraPresets: { c: { focus: { enabled: true, targetId: 't', aperture: .7 } } } },
    ambience: { open: true, duration: 10 }, camera: { focus: { enabled: true, targetId: 't', aperture: .7 } }, following: 't', documentsOpen: false };
  assert.ok(met(['sceneNamed', 'Casa de bairro'], state)); assert.ok(met(['ambienceOpen'], state)); assert.ok(!met(['ambienceOpen', false], state));
  assert.ok(met(['ambienceDuration', 10], state)); assert.ok(met(['flashlightOn'], state)); assert.ok(met(['tokenHas', 'flashlight.pitch', 25], state));
  assert.ok(met(['cameraFocused', .7], state)); assert.ok(!met(['cameraFocused', .4], state)); assert.ok(met(['shotFocused'], state)); assert.ok(met(['following'], state));
  // 41° below the zenith: 49° above the horizon.
  assert.ok(met(['sunBelow', 50], state)); assert.ok(!met(['sunBelow', 45], state));
});

test('the tutorial list shows lessons in folders, closing a folder once all of it is done', async () => {
  const { tutorialCenter, LESSON_FOLDERS } = await import('../src/tutorial/tutor.js');
  const tutor = { lessons: LESSONS, progress: () => Object.fromEntries(LESSONS.filter(lesson => lesson.folder === 'start').map(lesson => [lesson.id, { done: true }])) };
  const html = tutorialCenter(tutor, true);
  for (const lesson of LESSONS) assert.ok(LESSON_FOLDERS.some(folder => folder.id === lesson.folder), `${lesson.id} is in a known folder`);
  assert.match(html, /data-lesson-folder="industrial" open/); assert.match(html, /data-lesson-folder="start" >/);
  assert.match(html, /<h3>1 · A casca<small>/, 'inside its folder, a lesson drops the folder name');
  assert.match(html, /2 de 2 concluídos/);
});
