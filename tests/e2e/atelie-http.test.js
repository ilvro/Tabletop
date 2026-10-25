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

const HANDOUT_ID = 'e942a781-3094-4d8e-9c12-34827fbde101';
const pngNormalRev1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
const pngNormalRev2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGM4AQAAygDJmcpdfgAAAABJRU5ErkJggg==', 'base64');
const pngUv = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

function createFakeAtelieHttpServer() {
  let revision = 1;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = url.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'X-Atelie-Revision');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (pathname === '/api/atelie/health') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      return res.end(JSON.stringify({ status: 'ok', app: 'atelie', contract: 1 }));
    }

    if (pathname === '/api/atelie/handouts') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      return res.end(JSON.stringify([
        {
          id: HANDOUT_ID,
          name: 'Relatório Policial',
          category: 'Documentos',
          tags: ['policia', 'evidencia'],
          revision,
          updatedAt: new Date().toISOString(),
          hasUv: true,
          source: `http://${req.headers.host}/`,
          preview: `/api/atelie/handouts/${HANDOUT_ID}/preview`,
        },
      ]));
    }

    if (pathname === `/api/atelie/handouts/${HANDOUT_ID}/preview`) {
      res.setHeader('Content-Type', 'image/png');
      res.writeHead(200);
      return res.end(pngNormalRev1);
    }

    if (pathname === `/api/atelie/handouts/${HANDOUT_ID}/bake`) {
      const light = url.searchParams.get('light') || 'normal';
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Atelie-Revision', String(revision));
      res.writeHead(200);
      if (light === 'uv') {
        return res.end(pngUv);
      }
      return res.end(revision === 1 ? pngNormalRev1 : pngNormalRev2);
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  return {
    server,
    setRevision(r) { revision = r; },
    getRevision() { return revision; },
  };
}

test('caminho C (http): rotas do contrato v1, listagem, assados normal/uv, e atualização manual', { timeout: 180_000 }, async t => {
  const store = createSceneStore(createScene('Mesa HTTP'));
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

  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-atelie-http-'));
  const tabletopServer = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1');
  await once(tabletopServer, 'listening');

  const fakeAtelie = createFakeAtelieHttpServer();
  const atelieServer = fakeAtelie.server.listen(0, '127.0.0.1');
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
  page.on('pageerror', e => {
    errors.push(e.message);
    console.error('PAGE ERROR:', e.message);
  });
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Configure Ateliê URL pointing to our fake HTTP server
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
  await (await reveal(pickBtn)).click();

  // Popover dialog #atelie-dialog opens with "Relatório Policial"
  const card = page.locator(`#atelie-dialog [data-action="atelie-pick-item"][data-id="${HANDOUT_ID}"]`);
  await card.waitFor({ state: 'visible' });
  await card.click();

  // Letter prop gains design, normal bake and uv bake
  await page.waitForFunction(id => {
    const ent = window.__tabletop?.snapshot().layout.entities[id];
    return ent?.inspectable?.paper === 'design' &&
      ent.inspectable.pages[0].design?.id === 'e942a781-3094-4d8e-9c12-34827fbde101' &&
      ent.inspectable.pages[0].design?.revision === 1 &&
      ent.inspectable.pages[0].imageRef !== null &&
      ent.inspectable.pages[0].uvImageRef !== null;
  }, letter.id);

  const snapBefore = await page.evaluate(id => window.__tabletop.snapshot().layout.entities[id], letter.id);
  const initialImageRef = snapBefore.inspectable.pages[0].imageRef;

  // Open inspection and test UV
  await (await reveal(page.locator('.inspector-hero [data-action="inspect-open"]'))).click();
  await page.locator('[data-testid="inspection"]').waitFor({ state: 'visible' });

  // UV button is visible
  const uvBtn = page.locator('[data-inspect="uv"]');
  await uvBtn.waitFor({ state: 'visible' });

  // Press U to toggle UV light
  await page.keyboard.press('u');
  await page.waitForFunction(() => {
    const vignette = document.querySelector('.inspection-uv-vignette');
    return vignette && !vignette.hidden;
  });

  // Close inspection
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__tabletop.stats().inspection === null);

  // Update server revision to 2
  fakeAtelie.setRevision(2);

  // Refresh status with cache invalidation
  await page.evaluate(() => window.__tabletop.refreshAtelie({ invalidateCache: true }));

  // Re-select letter to ensure inspector renders updated atelieSummaries
  await page.evaluate(id => window.__tabletop.select(id), letter.id);

  // "Atualizar a partir do Ateliê" button appears
  const updateBtn = page.locator('[data-action="atelie-update"]').first();
  await (await reveal(updateBtn)).click();

  // Verify entity updated to revision 2
  await page.waitForFunction(id => {
    const ent = window.__tabletop?.snapshot().layout.entities[id];
    return ent?.inspectable?.pages[0].design?.revision === 2;
  }, letter.id);

  const snapAfter = await page.evaluate(id => window.__tabletop.snapshot().layout.entities[id], letter.id);
  assert.notDeepEqual(snapAfter.inspectable.pages[0].imageRef, initialImageRef, 'imageRef updated to rev 2');

  assert.deepEqual(errors, []);
});

