import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../src/tutorial/lessons.js';
import { CONDITIONS, met, measure } from '../src/tutorial/conditions.js';
import { lessonForTask } from '../src/tutorial/tutor.js';
import { TASKS_BY_TAB } from '../src/ui/task-definitions.js';
import { EXAMPLE_SCENES } from '../src/data/example-scenes.js';

const TASK_KEYS = new Set(Object.values(TASKS_BY_TAB).flat().flatMap(group => group.tasks.map(([, key]) => key)));

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
      if (step.target) assert.match(step.target, /data-(action|tab|field|choice|asset|build-section|environment|open-example|ambience|ambience-time|ambience-duration)=|data-(camera-rehearse|camera-cut|initiative-value)\]|#[a-z-]+|^\.(assistant-reading|tabs|inspector|camera-strip|tool-strip)$/, where);
      if (step.try) assert.ok(step.target, `${where}: a step done alone still knows where, for "Mostrar onde"`);
      for (const act of Array.isArray(step.act?.[0]) ? step.act : [step.act]) if (act?.[0] === 'select' && typeof act[2] !== 'string') assert.ok(step.hint, `${where}: a choice made by position says in words what to pick`);
      if (step.act === 'continue') assert.equal(step.done[0], 'read', where);
    });
    assert.equal(lesson.steps.at(-1).done[0], 'read', `${lesson.id}: a lesson ends on a closing step`);
    // Three sizes: a tip answers one question in a minute or two; a lesson teaches one theme; a project rebuilds a scene in parts.
    assert.ok(['tip', 'lesson', 'project'].includes(lesson.kind), `${lesson.id}: kind`);
    if (lesson.kind === 'tip') assert.ok(lesson.steps.length <= 10 && lesson.minutes <= 2, `${lesson.id}: a tip is short`);
    for (const id of [lesson.next, lesson.continues].filter(Boolean)) assert.ok(LESSONS.some(entry => entry.id === id), `${lesson.id}: ${id} exists`);
    for (const key of [lesson.task ?? []].flat()) assert.ok(TASK_KEYS.has(key), `${lesson.id}: task ${key} exists in the panels`);
    if (lesson.since) assert.match(lesson.since, /^\d{4}-\d{2}-\d{2}$/, `${lesson.id}: since is a date`);
    if (lesson.needs && lesson.needs !== 'empty') assert.ok(EXAMPLE_SCENES.some(example => example.id === lesson.needs.example), `${lesson.id}: practice example exists`);
  }
});

test('every task of the panels has a tutorial behind its "?"', () => {
  const missing = [...TASK_KEYS].filter(key => !lessonForTask(key));
  // The tasks still without one are listed here on purpose: a new task cannot arrive without help unnoticed.
  assert.deepEqual(missing, ['characters', 'sky', 'night'], `tasks without a tutorial: ${missing.join(', ')}`);
});

test('"quase lá" says how far a step is: distance and direction, a turn, a stretch, a colour, a count', () => {
  const entity = (kind, extra = {}) => ({ id: kind, kind, tags: [], transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }, ...extra });
  const camera = { position: [0, 10, 10], target: [0, 0, 0] };
  const state = { camera, selectedId: null, document: { layout: { entities: { column: entity('builtin-column', { assetRef: { id: 'builtin-column' }, material: { color: '#808080' } }) } }, tokens: {} } };
  const far = measure(['near', 'builtin-column', [3, 0, 0]], state);
  assert.match(far.text, /Falta 3,0 m, para a direita/); assert.ok(Math.abs(far.left - 2.6) < 1e-9);
  assert.match(measure(['near', 'builtin-column', [0, 0, -2]], state).text, /para o fundo/);
  assert.equal(measure(['near', 'builtin-column', [.1, 0, 0]], state), null, 'already there: nothing to say');
  assert.match(measure(['facing', 'builtin-column', 90], state).text, /Gire mais 90°/);
  assert.match(measure(['scaledTo', 'builtin-column', [null, 3, null]], state).text, /Estique mais na altura/);
  assert.match(measure(['colorNear', 'builtin-column', 'material.color', '#202020'], state).text, /escurecer/);
  assert.match(measure(['colorNear', 'builtin-column', 'material.color', '#2050c0'], state).text, /tom ainda é outro/);
  assert.deepEqual(measure(['atLeast', 'wall', 4], state), { left: 4, text: '0 de 4 colocados' });
  assert.equal(measure(['read'], state), null);
  // Of several conditions, the first one still missing speaks.
  assert.match(measure([['atLeast', 'builtin-column', 1], ['near', 'builtin-column', [0, 0, 2]]], state).text, /para perto da câmera/);
});

test('session and combat conditions read the projector, the turn order and the areas', () => {
  const token = (id, actorId, position) => ({ id, actorId, transform: { position, rotation: [0, 0, 0, 1], scale: [1, 1, 1] } });
  const document = { name: 'x', layout: { entities: {}, grid: { cellSize: 1.5, diagonal: 'alternate' }, levels: { a: { elevation: 0 }, b: { elevation: 3 } } },
    actors: { a: { name: 'Lia', speed: 9 }, b: { name: 'Vulto' } }, tokens: { t1: token('t1', 'a', [-2, 0, 8.3]), t2: token('t2', 'b', [-4, .2, 5]) },
    cameraPresets: { s2: { name: '02 · Sala e jantar' } },
    sessionState: { initiative: { order: [{ tokenId: 't2', value: 18 }, { tokenId: 't1', value: 15 }], current: 1, round: 1 }, areas: [{ id: 'f', shape: 'circle', origin: [-4, .2, 5], yaw: 0, size: 2.5, width: 1.5, color: '#ff6a3d', label: '' }] } };
  const state = { document, projector: true, published: 's2', anyPublished: true, live: false, roofs: false, selectedName: 'Lia', placingToken: { name: 'Vulto', color: '#b03a2e' } };
  for (const done of [['projector'], ['onAir', '02'], ['published'], ['liveCamera', false], ['roofs', false], ['selectedNamed', 'Lia'], ['placingTokenAs', 'Vulto', '#c0392b'], ['gridIs', 'diagonal', 'alternate'], ['gridIs', 'cellSize', 1.5], ['levels', 2], ['levelAt', 3],
    ['initiativeOn'], ['initiativeValues', 2], ['turnPassed', 1, 1], ['areas', 1, 'circle'], ['areaTouches', 1], ['speed', 9], ['tokenNear', 'Lia', [-2, null, 8.2]]]) assert.ok(met(done, state), JSON.stringify(done));
  for (const done of [['onAir', '03'], ['turnPassed', 2, 0], ['areaTouches', 2], ['placingTokenAs', 'Vulto', '#2050c0'], ['tokenNear', 'Lia', [-2, null, 6]]]) assert.ok(!met(done, state), JSON.stringify(done));
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
