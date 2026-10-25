import { applicationBaseURL } from './paths.js';
import { browserMode } from './api.js';

export const ATELIE_URL_KEY = 'tabletop-atelie-url';

/** The sibling repository on GitHub Pages, or the local development server. */
export function defaultAtelieUrl(base = applicationBaseURL(), browser = browserMode) {
  if (browser) {
    return new URL('../Atelie/', base).href;
  }
  return 'http://127.0.0.1:3011/';
}

function ensureTrailingSlash(href) {
  return href.endsWith('/') ? href : `${href}/`;
}

/** Stored Ateliê URL or the default, always ending in '/'. */
export function atelieUrl() {
  try {
    const stored = globalThis.localStorage?.getItem(ATELIE_URL_KEY);
    if (stored) {
      const parsed = new URL(stored);
      return ensureTrailingSlash(parsed.href);
    }
  } catch {
    // Ignore invalid stored URLs and fall back to default
  }
  return defaultAtelieUrl();
}

/** Validates and saves Ateliê URL in localStorage. Accepts https:, or http: for localhost/127.0.0.1. */
export function setAtelieUrl(url) {
  const parsed = new URL(url);
  const isHttpLocal = parsed.protocol === 'http:' && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
  const isHttps = parsed.protocol === 'https:';
  if (!isHttps && !isHttpLocal) {
    throw new Error('O endereço do Ateliê deve usar HTTPS, ou HTTP para localhost/127.0.0.1.');
  }
  const clean = ensureTrailingSlash(parsed.href);
  try {
    globalThis.localStorage?.setItem(ATELIE_URL_KEY, clean);
  } catch {
    // Session-only if localStorage fails
  }
  return clean;
}

/** Contract, section 6: which way to talk. Pure. */
export function chooseRoute({ atelieOrigin, ownOrigin, healthOk }) {
  if (atelieOrigin && ownOrigin && atelieOrigin === ownOrigin) {
    return { list: 'exchange', open: 'window' };
  }
  if (healthOk) {
    return { list: 'http', open: 'window' };
  }
  return { list: 'window', open: 'window' };
}

let warnedContractVersion = false;

/** Filters and validates a message event from Ateliê window. */
export function filterAtelieMessage(event, { atelieOrigin, nonce, activeNonces }) {
  if (!event || event.origin !== atelieOrigin) return false;
  const data = event.data;
  if (!data || typeof data !== 'object') return false;
  if (data.app !== 'atelie') return false;
  if (data.contract !== 1) {
    if (!warnedContractVersion) {
      console.warn(`Ateliê com contrato ${data.contract}; este Tabletop entende 1`);
      warnedContractVersion = true;
    }
    return false;
  }
  if (nonce !== undefined && data.nonce !== nonce) return false;
  if (activeNonces && (!data.nonce || !activeNonces.has(data.nonce))) return false;
  return true;
}

const EXCHANGE_DB_NAME = 'mesa-handouts-v1';

function openExchangeDb(indexedDB) {
  if (!indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(EXCHANGE_DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        // Tabletop only reads; if upgrading or missing, cancel to avoid inventing schema
        const db = req.result;
        if (!db.objectStoreNames.contains('handouts')) db.createObjectStore('handouts', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('bakes')) db.createObjectStore('bakes', { keyPath: ['id', 'light'] });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function createAtelieLink({
  url = atelieUrl,
  targetWindow = globalThis.window,
  indexedDB = globalThis.indexedDB,
  fetch = globalThis.fetch ? globalThis.fetch.bind(globalThis) : undefined,
  open = (targetUrl, target) => targetWindow?.open?.(targetUrl, target),
} = {}) {
  const activeNonces = new Set();
  const savedListeners = new Set();
  let httpCache = { time: 0, items: [] };
  let healthState = null;
  let broadcastChannel = null;

  function currentUrl() {
    const raw = typeof url === 'function' ? url() : url;
    return ensureTrailingSlash(new URL(raw).href);
  }

  function getAtelieOrigin() {
    return new URL(currentUrl()).origin;
  }

  function getOwnOrigin() {
    return globalThis.location?.origin ?? 'http://localhost';
  }

  function currentRoute() {
    const atelieOrigin = getAtelieOrigin();
    const ownOrigin = getOwnOrigin();
    return chooseRoute({ atelieOrigin, ownOrigin, healthOk: Boolean(healthState) });
  }

  async function checkHealth() {
    if (!fetch) return false;
    try {
      const u = new URL('api/atelie/health', currentUrl());
      const res = await fetch(u.href);
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.app === 'atelie' && data.contract === 1 && data.status === 'ok') {
        healthState = true;
        return true;
      }
      if (data && data.app === 'atelie' && data.contract !== 1 && !warnedContractVersion) {
        console.warn(`Ateliê com contrato ${data.contract}; este Tabletop entende 1`);
        warnedContractVersion = true;
      }
    } catch {
      // Offline / not responding
    }
    healthState = false;
    return false;
  }

  // Setup broadcast channel if in browser / same origin
  function ensureBroadcastChannel() {
    if (broadcastChannel || typeof globalThis.BroadcastChannel !== 'function') return;
    try {
      broadcastChannel = new globalThis.BroadcastChannel('mesa:handout');
      broadcastChannel.unref?.();
      broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || data.app !== 'atelie') return;
        if (data.contract !== 1) {
          if (!warnedContractVersion) {
            console.warn(`Ateliê com contrato ${data.contract}; este Tabletop entende 1`);
            warnedContractVersion = true;
          }
          return;
        }
        if (data.type === 'handout-saved') {
          for (const listener of savedListeners) {
            listener({ id: data.id, revision: data.revision, source: data.source });
          }
        }
      };
    } catch {
      // BroadcastChannel not supported or error
    }
  }

  // Window message listener for postMessage routes
  if (targetWindow?.addEventListener) {
    targetWindow.addEventListener('message', (event) => {
      const atelieOrigin = getAtelieOrigin();
      if (!filterAtelieMessage(event, { atelieOrigin, activeNonces })) return;
      const data = event.data;
      if (data.type === 'delivered' && data.delivery) {
        for (const listener of savedListeners) {
          listener({
            id: data.delivery.id,
            revision: data.delivery.revision,
            source: data.delivery.source,
            delivery: data.delivery,
          });
        }
      }
    });
  }

  async function list() {
    if (getAtelieOrigin() !== getOwnOrigin() && healthState === null) {
      await checkHealth();
    }
    const r = currentRoute();
    const targetUrl = currentUrl();
    const targetOrigin = getAtelieOrigin();

    if (r.list === 'exchange') {
      const db = await openExchangeDb(indexedDB);
      if (!db) return [];
      try {
        const tx = db.transaction('handouts', 'readonly');
        const store = tx.objectStore('handouts');
        const items = await new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        db.close();
        return items.filter((item) => {
          try {
            return item.source === targetUrl || new URL(item.source).origin === targetOrigin;
          } catch {
            return false;
          }
        });
      } catch {
        db.close();
        return [];
      }
    }

    if (r.list === 'http') {
      const now = Date.now();
      if (now - httpCache.time < 10000 && httpCache.items.length) {
        return httpCache.items;
      }
      if (!fetch) return [];
      try {
        const res = await fetch(new URL('api/atelie/handouts', targetUrl).href);
        if (!res.ok) return [];
        const items = await res.json();
        httpCache = { time: now, items: Array.isArray(items) ? items : [] };
        return httpCache.items;
      } catch {
        return [];
      }
    }

    return [];
  }

  return {
    get route() {
      return currentRoute();
    },

    invalidateCache() {
      httpCache = { time: 0, items: [] };
      healthState = null;
    },

    async available() {
      const atelieOrigin = getAtelieOrigin();
      const ownOrigin = getOwnOrigin();

      if (atelieOrigin === ownOrigin) {
        if (!indexedDB) return false;
        try {
          if (indexedDB.databases) {
            const list = await indexedDB.databases();
            if (list.some((db) => db.name === EXCHANGE_DB_NAME)) return true;
          }
          // Check if DB can be opened and has records or if healthOk
          const db = await openExchangeDb(indexedDB);
          if (db) {
            const hasStore = db.objectStoreNames.contains('handouts');
            db.close();
            if (hasStore) return true;
          }
        } catch {
          // Fall through
        }
        return checkHealth();
      }

      // Origins differ: check health to discover if HTTP server is responding
      await checkHealth();
      return true;
    },

    async list() {
      return list();
    },

    async delivery(id) {
      if (getAtelieOrigin() !== getOwnOrigin() && healthState === null) {
        await checkHealth();
      }
      const r = currentRoute();
      const targetUrl = currentUrl();

      if (r.list === 'exchange') {
        const db = await openExchangeDb(indexedDB);
        if (!db) return null;
        try {
          const tx = db.transaction(['handouts', 'bakes'], 'readonly');
          const summaryReq = tx.objectStore('handouts').get(id);
          const normalReq = tx.objectStore('bakes').get([id, 'normal']);
          const uvReq = tx.objectStore('bakes').get([id, 'uv']);
          await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
          });
          db.close();
          const summary = summaryReq.result;
          const normal = normalReq.result;
          const uv = uvReq.result;
          if (!summary || !normal?.blob) return null;
          return {
            id: summary.id,
            name: summary.name,
            category: summary.category,
            tags: summary.tags,
            revision: summary.revision,
            updatedAt: summary.updatedAt,
            hasUv: Boolean(summary.hasUv),
            source: summary.source,
            preview: summary.preview,
            bakes: {
              normal: normal.blob,
              uv: uv?.blob ?? null,
            },
          };
        } catch (err) {
          console.error('atelie delivery exchange error:', err);
          db.close();
          return null;
        }
      }

      if (r.list === 'http') {
        if (!fetch) return null;
        try {
          const normalUrl = new URL(`api/atelie/handouts/${encodeURIComponent(id)}/bake?light=normal`, targetUrl).href;
          const normalRes = await fetch(normalUrl);
          if (!normalRes.ok) return null;
          const normalBlob = await normalRes.blob();
          const revision = Number(normalRes.headers.get('X-Atelie-Revision')) || 1;

          // Check if hasUv from handouts list or attempt uv fetch
          const summaries = await list();
          const summary = summaries.find((s) => s.id === id);
          let uvBlob = null;
          if (summary?.hasUv) {
            const uvUrl = new URL(`api/atelie/handouts/${encodeURIComponent(id)}/bake?light=uv`, targetUrl).href;
            const uvRes = await fetch(uvUrl);
            if (uvRes.ok) uvBlob = await uvRes.blob();
          }

          let previewBlob = summary?.preview;
          if (typeof previewBlob === 'string' && previewBlob) {
            const prevUrl = new URL(previewBlob.replace(/^\//, ''), targetUrl).href;
            const prevRes = await fetch(prevUrl);
            if (prevRes.ok) previewBlob = await prevRes.blob();
          }

          return {
            id,
            name: summary?.name || 'Documento',
            category: summary?.category || 'Documentos',
            tags: summary?.tags || [],
            revision: summary?.revision || revision,
            updatedAt: summary?.updatedAt || new Date().toISOString(),
            hasUv: Boolean(uvBlob),
            source: targetUrl,
            preview: previewBlob,
            bakes: {
              normal: normalBlob,
              uv: uvBlob,
            },
          };
        } catch (err) {
          console.error('atelie delivery http error:', err);
          return null;
        }
      }

      return null;
    },

    pick() {
      const atelieOrigin = getAtelieOrigin();
      const ownOrigin = getOwnOrigin();
      const nonce = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2);
      activeNonces.add(nonce);

      const target = new URL(currentUrl());
      target.searchParams.set('pick', '1');
      target.searchParams.set('from', ownOrigin);
      target.searchParams.set('nonce', nonce);

      const win = open(target.href, 'atelie');

      return new Promise((resolve) => {
        let timer = null;
        const cleanup = () => {
          if (timer) clearInterval(timer);
          targetWindow?.removeEventListener?.('message', onMessage);
          activeNonces.delete(nonce);
        };

        const onMessage = (event) => {
          if (!filterAtelieMessage(event, { atelieOrigin, nonce })) return;
          if (event.data?.type === 'delivered' && event.data.delivery) {
            cleanup();
            resolve(event.data.delivery);
          }
        };

        if (targetWindow?.addEventListener) {
          targetWindow.addEventListener('message', onMessage);
        }

        if (win && typeof win.closed === 'boolean') {
          timer = setInterval(() => {
            if (win.closed) {
              setTimeout(() => {
                cleanup();
                resolve(null);
              }, 500);
            }
          }, 400);
          timer?.unref?.();
        }
      });
    },

    edit(id) {
      const ownOrigin = getOwnOrigin();
      const nonce = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2);
      activeNonces.add(nonce);

      const target = new URL(currentUrl());
      target.searchParams.set('handout', id);
      target.searchParams.set('from', ownOrigin);
      target.searchParams.set('nonce', nonce);

      return open(target.href, 'atelie');
    },

    create(preset = 'a4') {
      const ownOrigin = getOwnOrigin();
      const nonce = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2);
      activeNonces.add(nonce);

      const target = new URL(currentUrl());
      target.searchParams.set('new', preset);
      target.searchParams.set('from', ownOrigin);
      target.searchParams.set('nonce', nonce);

      return open(target.href, 'atelie');
    },

    onSaved(listener) {
      ensureBroadcastChannel();
      savedListeners.add(listener);
      return () => {
        savedListeners.delete(listener);
        if (savedListeners.size === 0 && broadcastChannel) {
          broadcastChannel.close();
          broadcastChannel = null;
        }
      };
    },
  };
}
