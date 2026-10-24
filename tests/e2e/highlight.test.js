import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity, createToken } from '../../src/domain/documents.js';
import { createSceneStore } from '../../src/state/scene-store.js';
import { FIGURE_DEFAULTS } from '../../src/domain/figures.js';
import { reveal } from './controls.js';

// A crate marked interactive and one that is not; a hurt character: H outlines the first, the badge reads FERIDO.
test('H outlines interactive objects for a moment, also on the projector, and a character state shows as a badge', { timeout: 240_000 }, async t => {
  const store = createSceneStore(createScene('Interativos'));
  store.execute('entity.add', { entity: createEntity('floor', { width: 10, length: 10, position: [0, 0, 0] }), snap: false });
  const clue = createEntity('prop', { name: 'Caixa da pista', assetRef: { id: 'builtin-crate', revision: 1 }, position: [1, 0, 0] });
  store.execute('entity.add', { entity: clue, snap: false }); store.execute('entity.add', { entity: createEntity('prop', { name: 'Caixa comum', assetRef: { id: 'builtin-crate', revision: 1 }, position: [-2, 0, 0] }), snap: false });
  const { token, actor } = createToken({ name: 'Lia', position: [0, 0, 2] });
  store.execute('token.add', { token, actor, snap: false });
  store.execute('token.update', { id: token.id, patch: { figure: { ...FIGURE_DEFAULTS, state: 'hurt' } } });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-highlight-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) })).status, 201);
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?diagnostics&scene=${store.document.id}`); await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, store.document.id);
  await page.evaluate(() => window.__tabletop.ready());
  // Mark the clue's crate interactive in Propriedades → Organização.
  await page.locator('.tabs [data-tab="elements"]').click(); await page.locator(`[data-select="${clue.id}"]`).first().click();
  await (await reveal(page.locator('[data-field="entity-interactive"]'))).check();
  await page.waitForFunction(id => window.__tabletop.snapshot().layout.entities[id].interactive === true, clue.id);
  await page.locator('.tabs [data-tab="shots"]').click();
  const [projector] = await Promise.all([page.waitForEvent('popup'), (await reveal(page.locator('[data-action="presentation-window"]').first())).click()]);
  projector.setDefaultTimeout(60_000); projector.on('pageerror', e => errors.push(e.message));
  await projector.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  await page.locator('#viewport [data-testid="viewport-canvas"]').focus(); await page.keyboard.press('h');
  // Only the marked crate is outlined, for about three seconds, in both windows.
  for (const target of [page, projector]) await target.waitForFunction(() => window.__tabletop.stats().highlight?.objects === 1);
  await projector.screenshot({ path: 'test-results/highlight-projector.png' });
  await page.waitForFunction(() => !window.__tabletop.stats().highlight, null, { timeout: 10_000 });
  // The hurt character carries a badge over its name in the projector.
  assert.equal(await projector.evaluate(() => window.__tabletop.stats().badges), 1);
  assert.deepEqual(errors, []);
});
