import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createToken } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { FIGURE_DEFAULTS, FIGURE_STATES, opaqueBounds, stateLook } from '../src/domain/figures.js';
import { figurePanel } from '../src/ui/figure-panel.js';
import { numberField, colorField, checkField, choiceField } from '../src/ui/controls.js';

test('a token can stand as a figure: validated, switched off with null, one undo step each', () => {
  const store = createSceneStore(createScene('Figuras'));
  const { token, actor } = createToken({ name: 'Lia', position: [0, 0, 0] });
  store.execute('token.add', { token, actor, snap: false });
  store.execute('token.update', { id: token.id, patch: { figure: { ...FIGURE_DEFAULTS, state: 'dying' } } });
  assert.equal(store.document.tokens[token.id].figure.state, 'dying');
  for (const bad of [{ state: 'asleep' }, { height: 10 }, { base: 'box' }, { facing: 'left' }, { glow: 1 }]) assert.throws(() => store.execute('token.update', { id: token.id, patch: { figure: { ...FIGURE_DEFAULTS, ...bad } } }));
  store.execute('token.update', { id: token.id, patch: { figure: null } });
  assert.equal(store.document.tokens[token.id].figure, null);
  store.undo(); assert.equal(store.document.tokens[token.id].figure.state, 'dying');
});

test('the opaque part of a portrait is found, so its feet stand on the base', () => {
  // 10 × 10, opaque from column 3 to 6 and from row 2 to 7 (rows read from the top).
  const alpha = new Uint8Array(100); for (let y = 2; y <= 7; y++) for (let x = 3; x <= 6; x++) alpha[y * 10 + x] = 255;
  const found = opaqueBounds(alpha, 10, 10), wanted = { x0: .3, x1: .7, y0: .2, y1: .8 };
  for (const key of Object.keys(wanted)) assert.ok(Math.abs(found[key] - wanted[key]) < 1e-9, key);
  assert.deepEqual(opaqueBounds(new Uint8Array(100), 10, 10), { x0: 0, x1: 1, y0: 0, y1: 1 }, 'an empty image keeps its frame');
});

test('every state has a look, and only the moving ones animate', () => {
  for (const [id] of FIGURE_STATES) assert.ok(stateLook(id));
  assert.equal(stateLook('normal').tint, 0); assert.ok(stateLook('dead').desaturate > .5); assert.equal(stateLook('dying').pulse, 1); assert.equal(stateLook('maddened').wobble, 1);
});

test('the figure panel offers its settings once the figure is on', () => {
  const kit = { numberField, colorField, checkField, choiceField };
  assert.doesNotMatch(figurePanel(undefined, kit), /figure-state/);
  const html = figurePanel({ ...FIGURE_DEFAULTS, outlineWidth: .025 }, kit);
  for (const field of ['figure-state', 'figure-facing', 'figure-height', 'figure-base', 'figure-outlineColor', 'figure-rim']) assert.match(html, new RegExp(`data-field="${field}"`));
  assert.match(html, /data-field="figure-outlineWidth" value="2.5"/);
});
