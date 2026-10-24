import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity } from '../../src/domain/documents.js';
import { createSceneStore } from '../../src/state/scene-store.js';
import { inspectableDefaults } from '../../src/domain/inspectables.js';
import { reveal } from './controls.js';

// A letter on a desk at night, secret until shown: picked up in the editor, put back, then shown on the projector.
test('a document is picked up, read and put back without changing the scene, and reaches the projector only when shown', { timeout: 480_000 }, async t => {
  const store = createSceneStore(createScene('Carta na mesa'));
  store.execute('environment.apply', { presetId: 'day' });
  store.execute('entity.add', { entity: createEntity('floor', { name: 'Chão', width: 8, length: 8, position: [0, 0, 0] }), snap: false });
  const desk = createEntity('prop', { name: 'Mesa', assetRef: { id: 'builtin-desk', revision: 1 }, position: [0, 0, 0], supportHeight: .82 });
  store.execute('entity.add', { entity: desk, snap: false });
  const letter = createEntity('prop', { name: 'Carta', assetRef: { id: 'builtin-document-sheet', revision: 1 }, position: [0, .82, 0], surfaceId: desk.id,
    inspectable: inspectableDefaults({ title: 'Carta de Gustav', paper: 'aged', pages: [{ imageRef: null, text: 'Querida Lia, não procure por mim no porão.', back: { imageRef: null, text: 'O símbolo atrás do espelho.' } }, { imageRef: null, text: 'A chave está debaixo do vaso.', back: null }] }) });
  store.execute('entity.add', { entity: letter, snap: false });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-inspection-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) })).status, 201);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
  page.setDefaultTimeout(90_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?diagnostics&scene=${store.document.id}`); await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, store.document.id);
  await page.evaluate(() => window.__tabletop.ready());
  const stats = target => target.evaluate(() => window.__tabletop.stats()), snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  // The first page shows on the sheet lying on the desk.
  await page.waitForFunction(id => window.__tabletop.stats().pages.some(item => item.id === id && item.key.includes('porão')), letter.id);

  // Double-click picks it up: the background blurs, the scene document is not touched.
  const version = await page.evaluate(() => window.__tabletop.editVersion()), point = await page.evaluate(() => window.__tabletop.project([0, .825, 0]));
  await page.mouse.dblclick(point.x, point.y);
  await page.waitForFunction(id => window.__tabletop.stats().inspection?.entityId === id && window.__tabletop.stats().inspection.phase === 'open', letter.id);
  assert.ok((await stats(page)).depthOfField?.aperture > 1, 'the frame behind the object melts away');
  await page.locator('[data-testid="inspection"] h2', { hasText: 'Carta de Gustav' }).waitFor();
  // F turns the sheet over: the back is drawn on it; the arrow goes to the next page and its front.
  await page.keyboard.press('f');
  await page.waitForFunction(id => window.__tabletop.stats().pages.some(item => item.id === id && item.key.includes('espelho')), letter.id);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(id => window.__tabletop.stats().pages.some(item => item.id === id && item.key.includes('chave')), letter.id);
  await page.locator('.inspection-page', { hasText: 'Página 2 de 2' }).waitFor();
  // Reading shows the page sharp over everything.
  await page.locator('[data-inspect="read"]').first().click();
  await page.locator('.inspection-sheet img').waitFor();
  await page.keyboard.press('Escape'); await page.locator('.inspection-reader').waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__tabletop.stats().inspection === null);
  // Put back exactly: same document, first page on the sheet again, background sharp.
  assert.equal(await page.evaluate(() => window.__tabletop.editVersion()), version);
  assert.deepEqual((await snapshot()).layout.entities[letter.id].transform, store.document.layout.entities[letter.id].transform);
  await page.waitForFunction(id => window.__tabletop.stats().pages.some(item => item.id === id && item.key.includes('porão')), letter.id);
  await page.waitForFunction(() => !window.__tabletop.stats().depthOfField);

  // The projector sees a blank sheet until the letter is shown.
  await page.locator('.tabs [data-tab="shots"]').click();
  const [projector] = await Promise.all([page.waitForEvent('popup'), (await reveal(page.locator('[data-action="presentation-window"]').first())).click()]);
  projector.setDefaultTimeout(90_000); projector.on('pageerror', e => errors.push(e.message));
  await projector.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  await projector.waitForFunction(id => window.__tabletop.stats().pages.some(item => item.id === id), letter.id);
  assert.doesNotMatch(JSON.stringify((await stats(projector)).pages), /porão|Gustav/);
  // From the card of the selected letter this time, as on a table where it is hard to double-click.
  await page.locator('.tabs [data-tab="elements"]').click(); await page.locator(`[data-select="${letter.id}"]`).first().click();
  await page.locator('.inspector-hero [data-action="inspect-open"]').click();
  await page.waitForFunction(id => window.__tabletop.stats().inspection?.entityId === id, letter.id);
  assert.equal((await stats(projector)).inspection, null, 'inspecting in the editor is not shown to the players');
  await page.locator('[data-inspect="show"]').click();
  await page.waitForFunction(id => window.__tabletop.snapshot().sessionState.found?.includes(id), letter.id);
  assert.match(await page.locator('#undo').getAttribute('title'), /Revelar pista/);
  await projector.waitForFunction(id => window.__tabletop.stats().inspection?.entityId === id, letter.id);
  await projector.waitForFunction(id => window.__tabletop.stats().pages.some(item => item.id === id && item.key.includes('porão')), letter.id);
  await projector.locator('[data-testid="inspection"] h2', { hasText: 'Carta de Gustav' }).waitFor();
  // Turning and paging on the master's screen arrive on the projector.
  const box = await page.locator('.inspection-capture').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 4 }); await page.mouse.up();
  await projector.waitForFunction(() => Math.abs(window.__tabletop.stats().inspection.rotation[1]) > .1);
  await page.keyboard.press('ArrowRight');
  await projector.waitForFunction(() => window.__tabletop.stats().inspection?.page === 1);
  await projector.screenshot({ path: 'tests/e2e/test-results/inspection-projector.png' });
  // Putting it back closes it on the projector too; the clue stays in the archive.
  await page.keyboard.press('Escape');
  await projector.waitForFunction(() => window.__tabletop.stats().inspection === null);
  await page.locator('.tabs [data-tab="shots"]').click();
  await (await reveal(page.locator('.clue-list li', { hasText: 'Carta de Gustav' }).first())).waitFor();
  // Reopened from the archive, it goes straight to the projector.
  await page.locator('[data-action="clue-show"]').first().click();
  await projector.waitForFunction(id => window.__tabletop.stats().inspection?.entityId === id, letter.id);
  assert.deepEqual(errors, []);
});
