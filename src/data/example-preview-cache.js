import { storageScope } from './paths.js';
import { validateScenePreview } from './scene-preview.js';

// Disposable derived data, independent of the personal library and its migrations.
// The content digest invalidates even fixtures edited without a revision change.
export function createExamplePreviewCache({ databaseFactory = globalThis.indexedDB,
  databaseName = `tabletop-example-previews:${storageScope()}` } = {}) {
  async function transact(mode, action) {
    if (!databaseFactory) return null;
    const db = await new Promise((resolve, reject) => {
      const request = databaseFactory.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Cache de prévias ocupado.'));
    });
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('images', mode); let value;
        tx.oncomplete = () => resolve(value ?? null);
        tx.onabort = tx.onerror = () => reject(tx.error);
        action(tx.objectStore('images'), result => { value = result; });
      });
    } finally { db.close(); }
  }
  return {
    async key(example, document, assets) {
      const dependencies = assets.map(asset => [asset.id, asset.revision, asset.url, asset.contentHash]);
      const bytes = new TextEncoder().encode(JSON.stringify([document, dependencies]));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return `${example.id}:renderer-1:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
    },
    async read(key) {
      try {
        const image = await transact('readonly', (store, done) => {
          const request = store.get(key); request.onsuccess = () => done(request.result?.image);
        });
        return image ? validateScenePreview(image) : null;
      } catch { return null; }
    },
    async write(key, image) {
      validateScenePreview(image);
      // Quota/private-mode failures must never prevent loading a scene.
      try {
        await transact('readwrite', store => {
          store.put({ image, created: Date.now() }, key);
          const request = store.getAll();
          request.onsuccess = () => {
            const keys = store.getAllKeys();
            keys.onsuccess = () => {
              const entries = request.result.map((entry, i) => ({ ...entry, key: keys.result[i] }));
              entries.sort((a, b) => b.created - a.created);
              for (const entry of entries.slice(32)) store.delete(entry.key);
            };
          };
        });
      } catch { /* The cover remains in the bounded memory cache. */ }
    },
  };
}
