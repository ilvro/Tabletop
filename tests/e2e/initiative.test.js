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

// Three characters, one of them a monster only the master sees: the turn order, N, the strip and the projector.
test('initiative: start a combat, order by value, pass turns with N, show the strip without secret tokens on the projector', { timeout: 300_000 }, async t => {
  const store = createSceneStore(createScene('Combate'));
  store.execute('entity.add', { entity: createEntity('floor', { width: 10, length: 10, position: [0, 0, 0] }), snap: false });
  const ids = [];
  for (const [i, name] of ['Lia', 'Kian', 'Zumbi'].entries()) {
    const { token, actor } = createToken({ name, position: [i * 1.5 - 1.5, 0, 0], audience: name === 'Zumbi' ? 'gm' : 'all' });
    store.execute('token.add', { token, actor, snap: false }); ids.push(token.id);
  }
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-initiative-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) })).status, 201);
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?diagnostics&scene=${store.document.id}`); await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, store.document.id);
  const initiative = () => page.evaluate(() => window.__tabletop.snapshot().sessionState.initiative);
  await page.locator('.tabs [data-tab="shots"]').click();
  const [projector] = await Promise.all([page.waitForEvent('popup'), (await reveal(page.locator('[data-action="presentation-window"]').first())).click()]);
  projector.setDefaultTimeout(60_000); projector.on('pageerror', e => errors.push(e.message));
  await projector.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);

  await (await reveal(page.locator('[data-action="initiative-start"]'))).click();
  await page.waitForFunction(() => window.__tabletop.snapshot().sessionState.initiative?.order.length === 3);
  // Typing values reorders: Kian 18, Zumbi 12, Lia 7.
  for (const [id, value] of [[ids[1], 18], [ids[2], 12], [ids[0], 7]]) { const field = page.locator(`[data-initiative-value="${id}"]`); await field.fill(String(value)); await field.press('Tab'); }
  await page.waitForFunction(kian => window.__tabletop.snapshot().sessionState.initiative.order[0].tokenId === kian, ids[1]);
  assert.deepEqual((await initiative()).order.map(entry => entry.tokenId), [ids[1], ids[2], ids[0]]);
  // The strip over the stage: Kian has the turn.
  await page.waitForFunction(() => document.querySelector('#initiative-strip .is-turn small')?.textContent === 'Kian');
  // N passes the turn, with the scene focused; after the last one, a new round.
  await page.locator('#viewport [data-testid="viewport-canvas"]').focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('n');
  await page.waitForFunction(() => window.__tabletop.snapshot().sessionState.initiative.round === 2);
  assert.equal((await initiative()).current, 0);
  // The projector shows the order without the monster only the master sees.
  await projector.waitForFunction(() => document.querySelectorAll('#initiative-layer .initiative-card').length === 2);
  assert.deepEqual(await projector.locator('#initiative-layer .initiative-card small').allTextContents(), ['Kian', 'Lia']);
  // Ending the combat clears it everywhere, one undo step.
  await (await reveal(page.locator('[data-action="initiative-end"]'))).click();
  await page.waitForFunction(() => !window.__tabletop.snapshot().sessionState.initiative);
  await projector.waitForFunction(() => document.getElementById('initiative-layer').hidden);
  await page.locator('#undo').click();
  await page.waitForFunction(() => window.__tabletop.snapshot().sessionState.initiative?.round === 2);
  assert.deepEqual(errors, []);
});
