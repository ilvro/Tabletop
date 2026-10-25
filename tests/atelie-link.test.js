import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultAtelieUrl,
  chooseRoute,
  setAtelieUrl,
  atelieUrl,
  filterAtelieMessage,
  createAtelieLink,
  ATELIE_URL_KEY,
} from '../src/data/atelie.js';

test('defaultAtelieUrl: Pages points to sibling ../Atelie/, server mode points to 127.0.0.1:3011/', () => {
  const pagesBase = 'https://conta.github.io/Tabletop/';
  assert.equal(defaultAtelieUrl(pagesBase, true), 'https://conta.github.io/Atelie/');

  const serverBase = 'http://127.0.0.1:3001/';
  assert.equal(defaultAtelieUrl(serverBase, false), 'http://127.0.0.1:3011/');
});

test('chooseRoute: contract section 6 three route situations', () => {
  // Situation 1: Same origin (GitHub Pages same account) -> exchange route
  assert.deepEqual(
    chooseRoute({
      atelieOrigin: 'https://conta.github.io',
      ownOrigin: 'https://conta.github.io',
      healthOk: false,
    }),
    { list: 'exchange', open: 'window' }
  );

  // Situation 2: Different origins, but HTTP health responded ok (local dev servers) -> http route
  assert.deepEqual(
    chooseRoute({
      atelieOrigin: 'http://127.0.0.1:3011',
      ownOrigin: 'http://127.0.0.1:3001',
      healthOk: true,
    }),
    { list: 'http', open: 'window' }
  );

  // Situation 3: Different origins, no HTTP health -> window route
  assert.deepEqual(
    chooseRoute({
      atelieOrigin: 'https://outro-site.com',
      ownOrigin: 'https://conta.github.io',
      healthOk: false,
    }),
    { list: 'window', open: 'window' }
  );
});

test('setAtelieUrl: accepts https: and http: for localhost/127.0.0.1, rejects javascript: and remote http:', () => {
  // Valid URLs
  assert.equal(setAtelieUrl('https://conta.github.io/Atelie'), 'https://conta.github.io/Atelie/');
  assert.equal(setAtelieUrl('http://127.0.0.1:3011'), 'http://127.0.0.1:3011/');
  assert.equal(setAtelieUrl('http://localhost:3011/'), 'http://localhost:3011/');

  // Invalid URLs
  assert.throws(() => setAtelieUrl('javascript:alert(1)'), /HTTPS/);
  assert.throws(() => setAtelieUrl('http://exemplo.com'), /HTTPS/);
  assert.throws(() => setAtelieUrl('http://meu-servidor-remoto.org/'), /HTTPS/);
});

test('filterAtelieMessage: origin, app, contract version and nonce verification', () => {
  const atelieOrigin = 'https://conta.github.io';
  const nonce = 'random-nonce-123';
  const activeNonces = new Set(['random-nonce-123', 'other-nonce']);

  // Valid message with exact nonce
  assert.ok(
    filterAtelieMessage(
      {
        origin: atelieOrigin,
        data: { app: 'atelie', contract: 1, type: 'delivered', nonce, delivery: { id: 'abc' } },
      },
      { atelieOrigin, nonce }
    )
  );

  // Valid message matching activeNonces set
  assert.ok(
    filterAtelieMessage(
      {
        origin: atelieOrigin,
        data: { app: 'atelie', contract: 1, type: 'delivered', nonce, delivery: { id: 'abc' } },
      },
      { atelieOrigin, activeNonces }
    )
  );

  // Wrong origin
  assert.ok(
    !filterAtelieMessage(
      {
        origin: 'https://malicious.org',
        data: { app: 'atelie', contract: 1, type: 'delivered', nonce },
      },
      { atelieOrigin, nonce }
    )
  );

  // Wrong app
  assert.ok(
    !filterAtelieMessage(
      {
        origin: atelieOrigin,
        data: { app: 'other-app', contract: 1, type: 'delivered', nonce },
      },
      { atelieOrigin, nonce }
    )
  );

  // Incompatible contract version
  assert.ok(
    !filterAtelieMessage(
      {
        origin: atelieOrigin,
        data: { app: 'atelie', contract: 2, type: 'delivered', nonce },
      },
      { atelieOrigin, nonce }
    )
  );

  // Wrong nonce
  assert.ok(
    !filterAtelieMessage(
      {
        origin: atelieOrigin,
        data: { app: 'atelie', contract: 1, type: 'delivered', nonce: 'wrong-nonce' },
      },
      { atelieOrigin, nonce }
    )
  );

  // Nonce not in activeNonces set
  assert.ok(
    !filterAtelieMessage(
      {
        origin: atelieOrigin,
        data: { app: 'atelie', contract: 1, type: 'delivered', nonce: 'unknown-nonce' },
      },
      { atelieOrigin, activeNonces }
    )
  );
});

test('createAtelieLink: routes, pick, onSaved lifecycle', async () => {
  let openedUrl = null;
  const mockOpen = (targetUrl) => {
    openedUrl = targetUrl;
    return { closed: false };
  };

  const mockWindow = new EventTarget();
  mockWindow.open = mockOpen;

  const link = createAtelieLink({
    url: () => 'https://conta.github.io/Atelie/',
    targetWindow: mockWindow,
    open: mockOpen,
    indexedDB: null,
    fetch: async () => ({ ok: false }),
  });

  // Pick launches window with ?pick=1&from=...&nonce=...
  const pickPromise = link.pick();
  assert.ok(openedUrl);
  const parsed = new URL(openedUrl);
  assert.equal(parsed.searchParams.get('pick'), '1');
  const nonce = parsed.searchParams.get('nonce');
  assert.ok(nonce);

  // Simulating delivered postMessage
  const deliveredPayload = {
    id: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
    name: 'Carta de Gustav',
    revision: 1,
    source: 'https://conta.github.io/Atelie/',
  };

  let savedReceived = null;
  const unsubscribe = link.onSaved((evt) => {
    savedReceived = evt;
  });

  // Dispatch window message
  mockWindow.dispatchEvent(
    new MessageEvent('message', {
      origin: 'https://conta.github.io',
      data: {
        app: 'atelie',
        contract: 1,
        type: 'delivered',
        nonce,
        delivery: deliveredPayload,
      },
    })
  );

  const result = await pickPromise;
  assert.deepEqual(result, deliveredPayload);
  assert.deepEqual(savedReceived, {
    id: deliveredPayload.id,
    revision: 1,
    source: deliveredPayload.source,
    delivery: deliveredPayload,
  });

  unsubscribe();
});
