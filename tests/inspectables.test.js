import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createScene, createEntity, duplicateDocument } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { inspectableDefaults, validateInspectable, wrapText, layoutPageText, inspectableFieldPatch, publicInspectable, pageSide, INSPECT_LIMITS } from '../src/domain/inspectables.js';
import { projectPresentation, presentationAssets } from '../src/app/presentation.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const sheet = { id: 'builtin-document-sheet', revision: 1 };
const letterText = 'Querida Lia,\n\nNão procure por mim no porão.';
const letter = (patch = {}) => inspectableDefaults({ title: 'Carta de Gustav', paper: 'aged', pages: [{ imageRef: { id: 'foto-porao', revision: 2 }, text: letterText, back: { imageRef: null, text: 'O símbolo atrás do espelho.' } }], ...patch });

test('the inspectable contract is strict and bounded', () => {
  validateInspectable(letter());
  validateInspectable(inspectableDefaults({ kind: 'object', pages: [] }));
  validateInspectable(letter({ pages: [{ imageRef: null, text: null, back: null }] }));
  for (const bad of [{ kind: 'video' }, { paper: 'papiro' }, { title: 'x'.repeat(INSPECT_LIMITS.title + 1) }, { pages: [] }, { kind: 'object' },
    { pages: Array.from({ length: INSPECT_LIMITS.pages + 1 }, () => ({ imageRef: null, text: '', back: null })) }, { pages: [{ imageRef: null, text: 'x'.repeat(INSPECT_LIMITS.text + 1), back: null }] },
    { pages: [{ imageRef: { id: '../x', revision: 1 }, text: null, back: null }] }, { pages: [{ imageRef: null, text: null }] }, { pages: [{ imageRef: null, text: null, back: { imageRef: null, text: null, back: null } }] },
    { hold: { distance: 5, pitch: 0 } }, { hold: { distance: .45 } }, { secretUntilRevealed: 'sim' }, { extra: 1 }])
    assert.throws(() => validateInspectable(letter(bad)), undefined, JSON.stringify(bad).slice(0, 80));
});

test('text pages wrap by words, keep paragraphs, split words wider than the page and shrink to fit', () => {
  const measure = text => text.length; // one unit per letter
  assert.deepEqual(wrapText('um dois três quatro', measure, 8).lines, ['um dois', 'três', 'quatro']);
  assert.deepEqual(wrapText('a\n\nb', measure, 8).lines, ['a', '', 'b']);
  assert.deepEqual(wrapText('abcdefghij', measure, 4).lines, ['abcd', 'efgh', 'ij']);
  assert.deepEqual(wrapText('fim\n\n\n', measure, 8).lines, ['fim']);
  assert.deepEqual(wrapText('um dois três', measure, 4, 2), { lines: ['um', 'dois'], overflow: true });
  // Width in "pixels" grows with the font size: a long text settles on a smaller size that fits, never below the floor.
  const measureAt = (text, px) => text.length * px * .5;
  const short = layoutPageText('Queime esta carta.', { measureAt, width: 200, height: 300, size: 20 });
  assert.equal(short.size, 20); assert.equal(short.overflow, false);
  const long = layoutPageText('palavra '.repeat(200), { measureAt, width: 200, height: 300, size: 20 });
  assert.ok(long.size < 20 && long.size >= 11, `${long.size}`);
  assert.ok(long.lines.length * long.lineHeight <= 300 + 1e-6);
  const huge = layoutPageText('palavra '.repeat(4000), { measureAt, width: 200, height: 300, size: 20 });
  assert.equal(huge.overflow, true); assert.ok(Math.abs(huge.size - 11) < 1e-9);
});

test('inspector fields edit pages, backs, paper and hold; removing the switch removes the contract', () => {
  const record = { name: 'Carta', inspectable: letter() };
  assert.equal(inspectableFieldPatch({ name: 'Bilhete' }, 'enabled', true).inspectable.title, 'Bilhete');
  assert.equal(inspectableFieldPatch(record, 'enabled', false).inspectable, null);
  let next = inspectableFieldPatch(record, 'page-add', null, { page: 0 }).inspectable; assert.equal(next.pages.length, 2);
  next = inspectableFieldPatch({ ...record, inspectable: next }, 'page-1-back-text', 'Verso da segunda').inspectable; assert.equal(next.pages[1].back.text, 'Verso da segunda');
  next = inspectableFieldPatch({ ...record, inspectable: next }, 'page-0-front-imageRef', '', {}).inspectable; assert.equal(next.pages[0].imageRef, null);
  next = inspectableFieldPatch({ ...record, inspectable: next }, 'page-0-front-imageRef', 'retrato@3').inspectable; assert.deepEqual(next.pages[0].imageRef, { id: 'retrato', revision: 3 });
  next = inspectableFieldPatch({ ...record, inspectable: next }, 'distance', 9).inspectable; assert.equal(next.hold.distance, INSPECT_LIMITS.distance[1]);
  next = inspectableFieldPatch({ ...record, inspectable: next }, 'kind', 'object').inspectable; assert.deepEqual(next.pages, []);
  validateInspectable(next);
  assert.throws(() => inspectableFieldPatch(record, 'page-remove', null, { page: 0 }), /ao menos uma página/);
  assert.throws(() => inspectableFieldPatch({ name: 'x' }, 'title', 'y'), /Ative/);
  assert.deepEqual(pageSide(letter(), 0, 'back'), letter().pages[0].back);
  assert.deepEqual(pageSide(letter({ pages: [{ imageRef: null, text: 'a', back: null }] }), 0, 'back'), { imageRef: null, text: null });
});

test('only props are inspectable; clues are revealed once, forgotten, and leave with their object', () => {
  assert.ok(catalog.some(asset => asset.id === sheet.id), 'the documents kit is in the library');
  const store = createSceneStore(createScene('Pistas'));
  const paper = createEntity('prop', { name: 'Carta', assetRef: sheet, footprint: [.21, .3], inspectable: letter() });
  store.execute('entity.add', { entity: paper, snap: false });
  validateDocument(store.document);
  assert.throws(() => store.execute('entity.add', { entity: { ...createEntity('floor', { width: 2, length: 2 }), inspectable: letter() }, snap: false }));
  assert.throws(() => store.execute('clue.reveal', { id: 'nada' }));
  const plain = createEntity('prop', { name: 'Caixa', assetRef: { id: 'builtin-crate', revision: 1 }, footprint: [.6, .6] });
  store.execute('entity.add', { entity: plain, snap: false });
  assert.throws(() => store.execute('clue.reveal', { id: plain.id }), /inspecionáveis/);
  store.execute('clue.reveal', { id: paper.id }); store.execute('clue.reveal', { id: paper.id });
  assert.deepEqual(store.document.sessionState.found, [paper.id]);
  const copy = duplicateDocument(store.document, { name: 'Cópia' }), copied = Object.values(copy.layout.entities).find(e => e.name === 'Carta');
  assert.deepEqual(copy.sessionState.found, [copied.id], 'a duplicated scene keeps its archive, with the new ids');
  store.undo(); assert.equal(store.document.sessionState.found, undefined, 'revealing is one undo step');
  store.redo(); store.execute('clue.forget', { id: paper.id }); assert.deepEqual(store.document.sessionState.found, []);
  assert.throws(() => store.execute('clue.forget', { id: paper.id }));
  store.execute('clue.reveal', { id: paper.id }); store.execute('entity.remove', { id: paper.id });
  assert.deepEqual(store.document.sessionState.found, []);
  assert.throws(() => validateDocument({ ...store.document, sessionState: { ...store.document.sessionState, found: ['ausente'] } }));
});

test('secret content reaches the projector only once revealed; non-secret content always', () => {
  const store = createSceneStore(createScene('Projetor'));
  const secret = createEntity('prop', { name: 'Carta', assetRef: sheet, footprint: [.21, .3], inspectable: letter() });
  const open = createEntity('prop', { name: 'Recorte', assetRef: sheet, footprint: [.21, .3], inspectable: letter({ title: 'Jornal', secretUntilRevealed: false, pages: [{ imageRef: { id: 'manchete', revision: 1 }, text: 'Desaparecimento', back: null }] }) });
  const note = createEntity('prop', { name: 'Nota do mestre', assetRef: sheet, footprint: [.21, .3], audience: 'gm', inspectable: letter() });
  for (const entity of [secret, open, note]) store.execute('entity.add', { entity, snap: false });
  const images = [{ id: 'foto-porao', revision: 2, type: 'image' }, { id: 'manchete', revision: 1, type: 'image' }];
  let shown = projectPresentation(store.document);
  validateDocument(shown);
  assert.equal(shown.layout.entities[secret.id].inspectable.title, '');
  assert.deepEqual(shown.layout.entities[secret.id].inspectable.pages, [{ imageRef: null, text: null, back: null }]);
  assert.doesNotMatch(JSON.stringify(shown), /porão|espelho|foto-porao/);
  assert.equal(shown.layout.entities[note.id], undefined);
  assert.equal(shown.layout.entities[open.id].inspectable.pages[0].text, 'Desaparecimento');
  assert.deepEqual(presentationAssets(shown, images).map(asset => asset.id), ['manchete']);
  store.execute('clue.reveal', { id: secret.id }); store.execute('clue.reveal', { id: note.id });
  shown = projectPresentation(store.document);
  validateDocument(shown);
  assert.equal(shown.layout.entities[secret.id].inspectable.pages[0].text, letterText);
  assert.deepEqual(shown.sessionState.found, [secret.id], 'a GM-only clue stays out even when revealed');
  assert.deepEqual(presentationAssets(shown, images).map(asset => asset.id).sort(), ['foto-porao', 'manchete']);
  assert.equal(publicInspectable(letter(), false).pages.length, 1);
  assert.equal(publicInspectable(inspectableDefaults({ kind: 'object', pages: [] }), false).pages.length, 0);
});
