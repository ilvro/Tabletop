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

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
const HANDOUT_ID = 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6';

test('caminho A (exchange): banco mesa-handouts-v1, lista/uso, atualização em tempo real por BroadcastChannel e luz UV', { timeout: 180_000 }, async t => {
  const store = createSceneStore(createScene('Mesa do Ateliê'));
  store.execute('environment.apply', { presetId: 'day' });
  const desk = createEntity('prop', { name: 'Mesa', assetRef: { id: 'builtin-desk', revision: 1 }, position: [0, 0, 0], supportHeight: .82 });
  store.execute('entity.add', { entity: desk, snap: false });
  const letter = createEntity('prop', {
    name: 'Carta',
    assetRef: { id: 'builtin-document-sheet', revision: 1 },
    position: [0, .82, 0],
    surfaceId: desk.id,
    inspectable: inspectableDefaults({ title: 'Carta', paper: 'plain', pages: [{ imageRef: null, text: 'Texto inicial', back: null }] }),
  });
  store.execute('entity.add', { entity: letter, snap: false });

  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-atelie-exchange-'));
  const server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1');
  await once(server, 'listening');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal(
    (await fetch(`${base}/api/tabletop/scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: store.document }),
    })).status,
    201
  );

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(90_000);
  const errors = [];
  page.on('pageerror', e => {
    errors.push(e.message);
    console.error('PAGE ERROR:', e.message);
  });
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Configure localStorage to point to same origin Ateliê
  await page.addInitScript(({ base }) => {
    localStorage.setItem('tabletop-atelie-url', base.endsWith('/') ? base : `${base}/`);
  }, { base });

  // Navigate to scene
  await page.goto(`${base}/?diagnostics&scene=${store.document.id}`);
  await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, store.document.id);
  await page.evaluate(() => window.__tabletop.ready());

  // Helper to populate/update mesa-handouts-v1 IndexedDB
  async function seedExchange(revision = 1) {
    await page.evaluate(async ({ id, revision, base, pngBase64 }) => {
      const pngBytes = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));
      const normalBlob = new Blob([pngBytes], { type: 'image/png' });
      const uvBlob = new Blob([pngBytes], { type: 'image/png' });
      const previewBlob = new Blob([pngBytes], { type: 'image/png' });

      await new Promise((resolve, reject) => {
        const req = indexedDB.open('mesa-handouts-v1', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('handouts')) db.createObjectStore('handouts', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('bakes')) db.createObjectStore('bakes', { keyPath: ['id', 'light'] });
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['handouts', 'bakes'], 'readwrite');
          tx.objectStore('handouts').put({
            id,
            name: 'Carta envelhecida',
            category: 'Cartas',
            tags: ['carta', 'antiga'],
            revision,
            updatedAt: new Date().toISOString(),
            hasUv: true,
            source: base.endsWith('/') ? base : `${base}/`,
            preview: previewBlob,
          });
          tx.objectStore('bakes').put({
            id,
            light: 'normal',
            revision,
            blob: normalBlob,
            width: 2048,
            height: 2048,
          });
          tx.objectStore('bakes').put({
            id,
            light: 'uv',
            revision,
            blob: uvBlob,
            width: 2048,
            height: 2048,
          });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    }, { id: HANDOUT_ID, revision, base, pngBase64: png.toString('base64') });
  }

  // Seed revision 1 in mesa-handouts-v1
  await seedExchange(1);

  // Select the letter prop
  await page.evaluate(id => window.__tabletop.select(id), letter.id);

  // "Do ateliê…" button in inspectable panel
  const pickBtn = page.locator('[data-action="atelie-pick"]').first();
  await (await reveal(pickBtn)).click();

  // Dialog opens showing "Carta envelhecida"
  const card = page.locator(`#atelie-dialog [data-action="atelie-pick-item"][data-id="${HANDOUT_ID}"]`);
  await card.waitFor({ state: 'visible' });
  await card.click();

  // Verify entity updated with design and paper = 'design'
  await page.waitForFunction(id => {
    const ent = window.__tabletop?.snapshot().layout.entities[id];
    return ent?.inspectable?.paper === 'design' &&
      ent.inspectable.pages[0].design?.id === 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6' &&
      ent.inspectable.pages[0].design?.revision === 1 &&
      ent.inspectable.pages[0].imageRef !== null &&
      ent.inspectable.pages[0].uvImageRef !== null;
  }, letter.id);

  const snapBefore = await page.evaluate(() => window.__tabletop.snapshot());
  const initialImageRef = snapBefore.layout.entities[letter.id].inspectable.pages[0].imageRef;

  // Open inspection
  await (await reveal(page.locator('.inspector-hero [data-action="inspect-open"]'))).click();
  await page.locator('[data-testid="inspection"]').waitFor({ state: 'visible' });

  // UV button is visible since page has uvImageRef
  const uvBtn = page.locator('[data-inspect="uv"]');
  await uvBtn.waitFor({ state: 'visible' });

  // Press U: turns on UV light
  await page.keyboard.press('u');
  await page.waitForFunction(() => {
    const vignette = document.querySelector('.inspection-uv-vignette');
    return vignette && !vignette.hidden;
  });

  // Turn UV back off with U
  await page.keyboard.press('u');
  await page.waitForFunction(() => {
    const vignette = document.querySelector('.inspection-uv-vignette');
    return !vignette || vignette.hidden;
  });

  // Close inspection
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__tabletop.stats().inspection === null);

  // Test projector sync with UV:
  // Open projector window
  await page.locator('.tabs [data-tab="shots"]').click();
  const [projector] = await Promise.all([
    page.waitForEvent('popup'),
    (await reveal(page.locator('[data-action="presentation-window"]').first())).click(),
  ]);
  projector.setDefaultTimeout(90_000);
  projector.on('pageerror', e => errors.push(e.message));
  await projector.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);

  // Re-open inspection and show on projector
  await page.locator('.tabs [data-tab="elements"]').click();
  await page.locator(`[data-select="${letter.id}"]`).first().click();
  await (await reveal(page.locator('.inspector-hero [data-action="inspect-open"]'))).click();
  await page.locator('[data-testid="inspection"]').waitFor({ state: 'visible' });

  // Click "Mostrar aos jogadores"
  await page.locator('[data-inspect="show"]').click();
  await projector.waitForFunction(id => window.__tabletop.stats().inspection?.entityId === id, letter.id);

  // Turn UV on in inspection
  await page.keyboard.press('u');
  // Projector should receive UV
  await projector.waitForFunction(() => {
    const vignette = document.querySelector('.inspection-uv-vignette');
    return vignette && !vignette.hidden;
  });

  // Close inspection
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__tabletop.stats().inspection === null);

  // Seed revision 2 in mesa-handouts-v1 and broadcast saved message
  await seedExchange(2);
  await page.evaluate(({ id, base }) => {
    const bc = new BroadcastChannel('mesa:handout');
    bc.postMessage({
      app: 'atelie',
      contract: 1,
      type: 'handout-saved',
      id,
      revision: 2,
      source: base.endsWith('/') ? base : `${base}/`,
    });
    bc.close();
  }, { id: HANDOUT_ID, base });

  // Notice should appear with button: "Atualizar na cena (1 objeto)"
  const updateBtn = page.locator('#notice button[data-action="atelie-batch-update"]');
  await updateBtn.waitFor({ state: 'visible' });
  assert.match(await updateBtn.textContent(), /Atualizar na cena \(1 objeto\)/);

  // Click update button
  await updateBtn.click({ force: true });

  // Verify entity updated to revision 2 with a new imageRef
  await page.waitForFunction((id) => {
    const ent = window.__tabletop?.snapshot().layout.entities[id];
    return ent?.inspectable?.pages[0].design?.revision === 2;
  }, letter.id);

  const snapAfter = await page.evaluate(() => window.__tabletop.snapshot());
  const updatedImageRef = snapAfter.layout.entities[letter.id].inspectable.pages[0].imageRef;
  assert.notDeepEqual(updatedImageRef, initialImageRef, 'imageRef updated to new revision asset');

  assert.deepEqual(errors, []);
});
