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
import { reveal } from './controls.js';

// A character with 9 m of movement walks, then runs: the projector draws each path with its distance and reach.
test('a moved token draws its path on the projector with metres, squares and reach', { timeout: 240_000 }, async t => {
  const store = createSceneStore(createScene('Movimento'));
  store.execute('entity.add', { entity: createEntity('floor', { width: 30, length: 30, position: [0, 0, 0] }), snap: false });
  store.execute('grid.update', { patch: { cellSize: 1.5, diagonal: 'chebyshev' } });
  const { token, actor } = createToken({ name: 'Lia', position: [0, 0, 0] });
  store.execute('token.add', { token, actor, snap: false });
  store.execute('actor.update', { id: actor.id, patch: { speed: 9 } });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-trail-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) })).status, 201);
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?diagnostics&scene=${store.document.id}`); await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, store.document.id);
  await page.locator('.tabs [data-tab="shots"]').click();
  const [projector] = await Promise.all([page.waitForEvent('popup'), (await reveal(page.locator('[data-action="presentation-window"]').first())).click()]);
  projector.setDefaultTimeout(60_000); projector.on('pageerror', e => errors.push(e.message));
  await projector.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  await page.locator('.tabs [data-tab="elements"]').click(); await page.locator(`[data-select="${token.id}"]`).first().click();
  const moveTo = async z => { const field = page.locator('[data-field="position-2"]'); await field.fill(String(z)); await field.press('Tab'); };
  // 3 m forward: two squares of 1.5 m, within 9 m.
  await moveTo(3);
  await projector.waitForFunction(() => /quadrados/.test(document.querySelector('.movement-label:not([hidden])')?.textContent ?? ''));
  const walk = await projector.locator('.movement-label').textContent();
  assert.equal(walk, '3 m · 2 quadrados');
  assert.doesNotMatch(walk, /correndo|fora/);
  // 12 m further: running.
  await moveTo(15);
  await projector.waitForFunction(() => /correndo/.test(document.querySelector('.movement-label:not([hidden])')?.textContent ?? ''));
  // The path fades after the glide.
  await projector.waitForFunction(() => document.querySelector('.movement-label').hidden, null, { timeout: 15_000 });
  assert.deepEqual(errors, []);
});
