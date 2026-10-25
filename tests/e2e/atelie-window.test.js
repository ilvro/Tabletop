import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
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

const HANDOUT_ID = 'b73a2134-8c09-4e56-9d8a-71bf9e20a320';

function createFakeAtelieServer() {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Ateliê Falso</title></head>
<body>
  <h1>Ateliê Falso</h1>
  <button id="btn-bad-nonce">Nonce Errado</button>
  <button id="btn-bad-app">App Errado</button>
  <button id="btn-bad-contract">Contrato Errado</button>
  <button id="btn-deliver">Enviar ao Tabletop</button>
  <button id="btn-update">Enviar Revisão 2</button>
  <script>
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    const nonce = params.get('nonce');
    const handout = params.get('handout');

    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
    function makePngBlob() {
      const bytes = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));
      return new Blob([bytes], { type: 'image/png' });
    }

    function makeDelivery(revision = 1) {
      return {
        id: handout || '${HANDOUT_ID}',
        name: 'Carta da Janela',
        category: 'Cartas',
        tags: ['janela'],
        revision,
        updatedAt: new Date().toISOString(),
        hasUv: false,
        source: window.location.origin + '/',
        preview: makePngBlob(),
        bakes: {
          normal: makePngBlob(),
          uv: null,
        },
      };
    }

    document.getElementById('btn-bad-nonce').onclick = () => {
      window.opener.postMessage({
        app: 'atelie',
        contract: 1,
        type: 'delivered',
        nonce: 'invalid-nonce-xyz',
        delivery: makeDelivery(1),
      }, from);
    };

    document.getElementById('btn-bad-app').onclick = () => {
      window.opener.postMessage({
        app: 'other-app',
        contract: 1,
        type: 'delivered',
        nonce,
        delivery: makeDelivery(1),
      }, from);
    };

    document.getElementById('btn-bad-contract').onclick = () => {
      window.opener.postMessage({
        app: 'atelie',
        contract: 99,
        type: 'delivered',
        nonce,
        delivery: makeDelivery(1),
      }, from);
    };

    document.getElementById('btn-deliver').onclick = () => {
      window.opener.postMessage({
        app: 'atelie',
        contract: 1,
        type: 'delivered',
        nonce,
        delivery: makeDelivery(1),
      }, from);
      window.close();
    };

    document.getElementById('btn-update').onclick = () => {
      window.opener.postMessage({
        app: 'atelie',
        contract: 1,
        type: 'delivered',
        nonce,
        delivery: makeDelivery(2),
      }, from);
    };
  </script>
</body>
</html>`;

  return http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(html);
  });
}

test('caminho B (window): janela popup, segurança de nonce e origem, e entrega por postMessage', { timeout: 180_000 }, async t => {
  const store = createSceneStore(createScene('Mesa com Janela'));
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

  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-atelie-window-'));
  const tabletopServer = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1');
  await once(tabletopServer, 'listening');

  const atelieServer = createFakeAtelieServer().listen(0, '127.0.0.1');
  await once(atelieServer, 'listening');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise(resolve => tabletopServer.close(resolve));
    await new Promise(resolve => atelieServer.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });

  const tabletopBase = `http://127.0.0.1:${tabletopServer.address().port}`;
  const atelieBase = `http://127.0.0.1:${atelieServer.address().port}/`;

  assert.equal(
    (await fetch(`${tabletopBase}/api/tabletop/scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: store.document }),
    })).status,
    201
  );

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(90_000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // Configure Ateliê URL pointing to our fake server (different port -> route 'window')
  await page.addInitScript(({ atelieBase }) => {
    localStorage.setItem('tabletop-atelie-url', atelieBase);
  }, { atelieBase });

  await page.goto(`${tabletopBase}/?diagnostics&scene=${store.document.id}`);
  await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, store.document.id);
  await page.evaluate(() => window.__tabletop.ready());

  // Select letter prop
  await page.evaluate(id => window.__tabletop.select(id), letter.id);

  // Click "Do ateliê…"
  const pickBtn = page.locator('[data-action="atelie-pick"]').first();
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    (await reveal(pickBtn)).click(),
  ]);

  await popup.waitForLoadState('domcontentloaded');
  const popupUrl = new URL(popup.url());
  assert.equal(popupUrl.searchParams.get('pick'), '1');
  assert.equal(popupUrl.searchParams.get('from'), tabletopBase);
  const actualNonce = popupUrl.searchParams.get('nonce');
  assert.ok(actualNonce, 'nonce must be provided');

  // 1. Try sending invalid nonce
  await popup.locator('#btn-bad-nonce').click();
  await new Promise(r => setTimeout(r, 300));
  const snapAfterBadNonce = await page.evaluate(id => window.__tabletop.snapshot().layout.entities[id], letter.id);
  assert.ok(!snapAfterBadNonce.inspectable.pages[0].design, 'Must ignore bad nonce');

  // 2. Try sending invalid app name
  await popup.locator('#btn-bad-app').click();
  await new Promise(r => setTimeout(r, 300));
  const snapAfterBadApp = await page.evaluate(id => window.__tabletop.snapshot().layout.entities[id], letter.id);
  assert.ok(!snapAfterBadApp.inspectable.pages[0].design, 'Must ignore bad app');

  // 3. Try sending invalid contract version
  await popup.locator('#btn-bad-contract').click();
  await new Promise(r => setTimeout(r, 300));
  const snapAfterBadContract = await page.evaluate(id => window.__tabletop.snapshot().layout.entities[id], letter.id);
  assert.ok(!snapAfterBadContract.inspectable.pages[0].design, 'Must ignore bad contract');

  // 4. Try sending message from wrong origin (from Tabletop page itself)
  await page.evaluate(({ nonce }) => {
    window.postMessage({
      app: 'atelie',
      contract: 1,
      type: 'delivered',
      nonce,
      delivery: {
        id: 'spoofed-id',
        name: 'Spoofed',
        category: 'Spoofed',
        tags: [],
        revision: 1,
        updatedAt: new Date().toISOString(),
        hasUv: false,
        source: window.location.origin,
        preview: new Blob(['x'], { type: 'image/png' }),
        bakes: { normal: new Blob(['x'], { type: 'image/png' }), uv: null },
      },
    }, '*');
  }, { nonce: actualNonce });
  await new Promise(r => setTimeout(r, 300));
  const snapAfterSpoof = await page.evaluate(id => window.__tabletop.snapshot().layout.entities[id], letter.id);
  assert.ok(!snapAfterSpoof.inspectable.pages[0].design, 'Must ignore message from wrong origin');

  // 5. Send valid delivery
  const [closedPopup] = await Promise.all([
    popup.waitForEvent('close'),
    popup.locator('#btn-deliver').click(),
  ]);
  assert.ok(closedPopup, 'Popup closed on delivery');

  // In Tabletop, letter prop gains design and paper = 'design'
  await page.waitForFunction(id => {
    const ent = window.__tabletop?.snapshot().layout.entities[id];
    return ent?.inspectable?.paper === 'design' &&
      ent.inspectable.pages[0].design?.id === 'b73a2134-8c09-4e56-9d8a-71bf9e20a320' &&
      ent.inspectable.pages[0].design?.revision === 1 &&
      ent.inspectable.pages[0].imageRef !== null;
  }, letter.id);

  const initialImageRef = (await page.evaluate(id => window.__tabletop.snapshot().layout.entities[id], letter.id)).inspectable.pages[0].imageRef;

  // 6. Test editing: "Editar no Ateliê"
  const editBtn = page.locator('[data-action="atelie-edit"]').first();
  const [editPopup] = await Promise.all([
    page.waitForEvent('popup'),
    (await reveal(editBtn)).click(),
  ]);

  await editPopup.waitForLoadState('domcontentloaded');
  const editUrl = new URL(editPopup.url());
  assert.equal(editUrl.searchParams.get('handout'), HANDOUT_ID);
  assert.equal(editUrl.searchParams.get('from'), tabletopBase);
  assert.ok(editUrl.searchParams.get('nonce'));

  // From editPopup, send update for revision 2
  await editPopup.locator('#btn-update').click();

  // Notice should appear in Tabletop: "Atualizar na cena (1 objeto)"
  const updateBtn = page.locator('#notice button[data-action="atelie-batch-update"]');
  await updateBtn.waitFor({ state: 'visible' });
  assert.match(await updateBtn.textContent(), /Atualizar na cena \(1 objeto\)/);

  // Click update in notice
  await updateBtn.click({ force: true });

  // Entity is updated to revision 2 with new imageRef
  await page.waitForFunction(id => {
    const ent = window.__tabletop?.snapshot().layout.entities[id];
    return ent?.inspectable?.pages[0].design?.revision === 2;
  }, letter.id);

  const snapAfterUpdate = await page.evaluate(id => window.__tabletop.snapshot().layout.entities[id], letter.id);
  assert.notDeepEqual(snapAfterUpdate.inspectable.pages[0].imageRef, initialImageRef, 'imageRef updated');

  await editPopup.close();
  assert.deepEqual(errors, []);
});
