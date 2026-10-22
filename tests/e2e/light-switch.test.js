import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity, createLight } from '../../src/domain/documents.js';
import { createSceneStore } from '../../src/state/scene-store.js';
import { illuminationDefaults } from '../../src/domain/dynamic-lighting.js';

// A room folder with a lamp and a nested folder with a free light, switched from the tree of Elementos.
test('the tree switches the lights of a folder and of one object, one step in the history each', { timeout: 240_000 }, async t => {
  const store = createSceneStore(createScene('Interruptores'));
  store.execute('group.add', { group: { id: 'room', name: 'Sala' } }); store.execute('group.add', { group: { id: 'corner', name: 'Canto', parentId: 'room' } });
  const lamp = createEntity('prop', { name: 'Luminária', groupId: 'room', assetRef: { id: 'builtin-lamp', revision: 1 }, position: [0, 0, 0] });
  store.execute('entity.add', { entity: lamp, snap: false }); store.execute('entity.update', { id: lamp.id, patch: { illumination: illuminationDefaults('lamp', lamp) }, snap: false });
  store.execute('light.add', { light: createLight({ id: 'spot', name: 'Spot do canto', groupId: 'corner', position: [2, 2.4, 0] }) });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-switch-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`, saved = await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) });
  assert.equal(saved.status, 201);
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = []; page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(`${base}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  await page.locator('[data-action="open"]').first().click(); await page.locator(`[data-open="${store.document.id}"]`).click();
  await page.waitForFunction(id => window.__tabletop.snapshot().id === id, store.document.id);
  await page.locator('.tabs [data-tab="elements"]').click();
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot()), lightOf = doc => (doc.look ?? doc.defaultLook).lights.spot.enabled;
  const folder = page.locator('[data-group-lights="room"]');
  assert.equal(await folder.getAttribute('data-state'), 'on');
  await folder.click(); await page.waitForFunction(() => document.querySelector('[data-group-lights="room"]')?.dataset.state === 'off');
  let doc = await snapshot(); assert.equal(doc.layout.entities[lamp.id].illumination.enabled, false); assert.equal(lightOf(doc), false);
  assert.equal(await page.locator('[data-group-lights="corner"]').getAttribute('data-state'), 'off', 'the subfolder follows');
  // One light back on: the folder shows mixed.
  await page.locator(`[data-entry-light="${lamp.id}"]`).click(); await page.waitForFunction(() => document.querySelector('[data-group-lights="room"]')?.dataset.state === 'mixed');
  doc = await snapshot(); assert.equal(doc.layout.entities[lamp.id].illumination.enabled, true); assert.equal(lightOf(doc), false);
  // Clicking the bulb does not select the row, and each switch is one undo.
  assert.equal(await page.locator(`[data-select="${lamp.id}"].selected`).count(), 0);
  await page.keyboard.press('Control+z'); await page.waitForFunction(() => document.querySelector('[data-group-lights="room"]')?.dataset.state === 'off');
  await page.keyboard.press('Control+z'); await page.waitForFunction(() => document.querySelector('[data-group-lights="room"]')?.dataset.state === 'on');
  assert.deepEqual(errors, []);
});
