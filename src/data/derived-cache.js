import { storageScope } from './paths.js';

// Disposable derived cache (procedural surface tiles and recipe geometry buffers),
// kept in its own IndexedDB database so personal library migrations stay untouched.
const connections = new Map();

function openDatabase(databaseFactory, databaseName) {
  if (!databaseFactory) return Promise.resolve(null);
  const shared = databaseFactory === globalThis.indexedDB;
  if (shared && connections.has(databaseName)) return connections.get(databaseName);
  const promise = new Promise((resolve, reject) => {
    const request = databaseFactory.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('surface-tiles')) db.createObjectStore('surface-tiles');
      if (!db.objectStoreNames.contains('recipe-geometries')) db.createObjectStore('recipe-geometries');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); if (shared) connections.delete(databaseName); };
      db.onclose = () => { if (shared) connections.delete(databaseName); };
      resolve(db);
    };
    request.onerror = () => { if (shared) connections.delete(databaseName); reject(request.error); };
    request.onblocked = () => { if (shared) connections.delete(databaseName); reject(new Error('Cache derivado ocupado.')); };
  });
  if (shared) connections.set(databaseName, promise);
  return promise;
}

export function createDerivedCache({ indexedDB: idb = globalThis.indexedDB, databaseFactory = idb,
  databaseName = `tabletop-derived-cache:${storageScope()}` } = {}) {
  const shared = databaseFactory === globalThis.indexedDB;
  async function transact(storeName, mode, action) {
    const db = await openDatabase(databaseFactory, databaseName);
    if (!db) return null;
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode); let value;
        tx.oncomplete = () => resolve(value ?? null);
        tx.onabort = tx.onerror = () => reject(tx.error);
        action(tx.objectStore(storeName), result => { value = result; });
      });
    } finally { if (!shared) db.close(); }
  }
  return {
    async read(storeName, key) {
      try {
        return await transact(storeName, 'readonly', (store, done) => {
          const request = store.get(key);
          request.onsuccess = () => done(request.result?.value ?? null);
        });
      } catch { return null; }
    },
    async write(storeName, key, value, maxEntries = 64) {
      try {
        const ok = await transact(storeName, 'readwrite', (store, done) => {
          store.put({ value, created: Date.now() }, key);
          done(true);
          const countReq = store.count();
          countReq.onsuccess = () => {
            if (countReq.result <= maxEntries) return;
            const request = store.getAll();
            request.onsuccess = () => {
              const keys = store.getAllKeys();
              keys.onsuccess = () => {
                const entries = request.result.map((entry, i) => ({ created: entry?.created ?? 0, key: keys.result[i] }));
                entries.sort((a, b) => b.created - a.created);
                for (const entry of entries.slice(maxEntries)) store.delete(entry.key);
              };
            };
          };
        });
        return Boolean(ok);
      } catch { return false; /* Quota or private browsing failure never blocks rendering. */ }
    },
  };
}

export const defaultDerivedCache = createDerivedCache();

