import { reveal } from './controls.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';

async function draftRecord(page, slotId) {
  return page.evaluate((key) => new Promise((resolve, reject) => {
    const opening = indexedDB.open('tabletop-recovery-v1', 1);
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const database = opening.result;
      if (!database.objectStoreNames.contains('drafts')) { database.close(); resolve(null); return; }
      const transaction = database.transaction('drafts', 'readonly');
      const request = transaction.objectStore('drafts').get(key);
      let value = null;
      request.onsuccess = () => { value = request.result ?? null; };
      transaction.oncomplete = () => { database.close(); resolve(value); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), slotId);
}

async function eventually(reader, predicate, message) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const value = await reader();
    if (predicate(value)) return value;
    await delay(50);
  }
  assert.fail(message);
}

test('rascunhos de duas abas sobrevivem a conflito/reload e copiar preserva edições feitas durante o POST', { timeout: 180_000 }, async (t) => {
  const executablePath = process.env.TABLETOP_BROWSER_PATH || chromium.executablePath();
  await access(executablePath).catch(() => { throw new Error('Instale Chromium ou configure TABLETOP_BROWSER_PATH e execute npm run build antes do teste.'); });
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-recovery-browser-'));
  let browser, server, releasePending;
  t.after(async () => {
    releasePending?.();
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });
  const app = await createApp({ dataDir });
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  const action = async (page, name) => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const snapshot = (page) => page.evaluate(() => window.__tabletop.snapshot());
  const renameScene = async (page, name) => { await page.locator('#scene-name').fill(name); await page.locator('#scene-name').press('Tab'); };
  const createPage = async () => {
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(`${origin}/?diagnostics`);
    await page.waitForFunction(() => !!window.__tabletop);
    return page;
  };
  const readScene = async (id) => {
    const response = await context.request.get(`${origin}/api/tabletop/scenes/${id}`);
    assert.equal(response.status(), 200);
    return response.json();
  };

  // Build and confirm one shared authoritative document before opening tab B.
  const a = await createPage();
  await a.locator('#quick-form [type="submit"]').click();
  await action(a, 'accept-proposal');
  await a.waitForFunction(() => Object.keys(window.__tabletop.snapshot().layout.entities).length === 6);
  await renameScene(a, 'Sala compartilhada');
  await action(a, 'save');
  await a.waitForFunction(() => window.__tabletop.snapshot().revision === 1 && !document.getElementById('save-scene').disabled);
  const original = await snapshot(a);
  const slotA = await a.evaluate(() => sessionStorage.getItem('tabletop-recovery-slot'));
  assert.ok(slotA);
  await eventually(() => draftRecord(a, slotA), (value) => value === null, 'A confirmed save must clear only tab A recovery slot.');

  const b = await createPage();
  assert.deepEqual(await snapshot(b), original);
  const slotB = await b.evaluate(() => sessionStorage.getItem('tabletop-recovery-slot'));
  assert.notEqual(slotA, slotB);
  assert.equal(await b.locator('#recovery-dialog').isVisible(), false);

  // Tab A has real unsaved room changes; tab B saves a concurrent name change.
  const floor = Object.values(original.layout.entities).find((entity) => entity.kind === 'floor');
  await a.locator('[data-tab="scene"]').click();
  await a.locator(`[data-select="${floor.id}"]`).click();
  await a.locator('[data-field="width"]').fill('7.5');
  await a.locator('[data-field="width"]').press('Tab');
  await renameScene(a, 'Sala A em recuperação');
  const local = await snapshot(a);
  assert.equal(local.layout.entities[floor.id].width, 7.5);
  const firstDraft = await eventually(() => draftRecord(a, slotA), (value) => value?.document?.name === local.name && value.document.layout.entities[floor.id].width === 7.5, 'Tab A must persist the actual edited room in IndexedDB.');

  await renameScene(b, 'Sala B confirmada');
  await action(b, 'save');
  await b.waitForFunction(() => window.__tabletop.snapshot().revision === 2 && !document.getElementById('save-scene').disabled);
  const authoritative = await snapshot(b);
  await eventually(() => draftRecord(b, slotB), (value) => value === null, 'Tab B should clear its own confirmed draft.');
  assert.deepEqual(await draftRecord(b, slotA), firstDraft, 'A clean second tab must preserve the other tab recovery record.');
  assert.deepEqual(await readScene(original.id), authoritative);

  // A stale save must reject without changing disk or losing the local copy.
  const conflictResponse = a.waitForResponse((response) => response.url() === `${origin}/api/tabletop/scenes/${original.id}` && response.request().method() === 'PUT');
  await action(a, 'save');
  assert.equal((await conflictResponse).status(), 409);
  await a.waitForFunction(() => !document.getElementById('save-scene').disabled);
  assert.deepEqual(await snapshot(a), local);
  assert.deepEqual(await readScene(original.id), authoritative);
  await eventually(() => draftRecord(a, slotA), (value) => value?.document?.name === local.name, 'Conflict must preserve the local draft.');

  // Reload initially reads the newer disk revision, then explicitly restores A.
  await a.reload(); await a.waitForFunction(() => !!window.__tabletop);
  await a.locator('#recovery-dialog[open]').waitFor();
  assert.equal(await a.evaluate(() => sessionStorage.getItem('tabletop-recovery-slot')), slotA);
  assert.deepEqual(await snapshot(a), authoritative);
  await action(a, 'restore-draft');
  await a.locator('#recovery-dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(await snapshot(a), local);
  assert.deepEqual(await readScene(original.id), authoritative, 'Restoring a draft must not write the old revision over the current authority.');
  await a.locator('[data-tab="scene"]').click();
  await action(a, 'duplicate-scene');
  await a.waitForFunction((id) => window.__tabletop.snapshot().id !== id && !document.getElementById('save-scene').disabled, original.id);
  const independent = await snapshot(a);
  assert.equal(independent.revision, 1);
  assert.equal(Object.keys(independent.layout.entities).length, 6);
  const independentFloor = Object.values(independent.layout.entities).find((entity) => entity.kind === 'floor');
  const independentWall = Object.values(independent.layout.entities).find((entity) => entity.kind === 'wall' && Object.values(independent.layout.entities).some((door) => door.wallId === entity.id));
  const independentDoor = Object.values(independent.layout.entities).find((entity) => entity.kind === 'door');
  assert.equal(independentFloor.width, 7.5);
  assert.notEqual(independentFloor.id, floor.id);
  assert.equal(independentDoor.wallId, independentWall.id);
  assert.deepEqual(await readScene(independent.id), independent);
  assert.deepEqual(await readScene(original.id), authoritative);

  // Hold a duplicate POST; edits made during its round trip must stay in A.
  let begin;
  const started = new Promise((resolve) => { begin = resolve; });
  const pending = new Promise((resolve) => { releasePending = resolve; });
  let submitted;
  await a.route(`${origin}/api/tabletop/scenes`, async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    submitted = route.request().postDataJSON().document;
    begin();
    await pending;
    await route.continue();
  });
  const duplicateResponse = a.waitForResponse((response) => response.url() === `${origin}/api/tabletop/scenes` && response.request().method() === 'POST');
  await action(a, 'duplicate-scene'); await started;
  await renameScene(a, 'Edição durante a cópia');
  const later = await snapshot(a);
  releasePending(); releasePending = null;
  assert.equal((await duplicateResponse).status(), 201);
  await a.waitForFunction(() => !document.getElementById('save-scene').disabled);
  assert.deepEqual(await snapshot(a), later);
  assert.equal(later.id, independent.id);
  assert.equal(later.name, 'Edição durante a cópia');
  assert.equal(await a.locator('#save-status').textContent(), 'Alterações locais');
  const completedDuplicate = await readScene(submitted.id);
  assert.notEqual(completedDuplicate.id, independent.id);
  assert.equal(completedDuplicate.name, `${independent.name} — cópia`);
  assert.equal(Object.values(completedDuplicate.layout.entities).find((entity) => entity.kind === 'floor').width, 7.5);
  assert.deepEqual(await readScene(independent.id), independent, 'Later edits stay local until an explicit save.');
  assert.deepEqual(await readScene(original.id), authoritative);
  await a.unroute(`${origin}/api/tabletop/scenes`);
  assert.deepEqual(errors, [], 'The recovery flow must not emit unhandled browser errors.');
});
