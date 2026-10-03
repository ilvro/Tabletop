const DB_NAME = 'tabletop-recovery-v1';
const STORE_NAME = 'drafts';
const SLOT_KEY = 'tabletop-recovery-slot';
const LEGACY_SLOT = 'working-copy';
let sessionSlot;
let lastWriteTime = 0;

function ownSlot() {
  if (sessionSlot) return sessionSlot;
  try {
    const stored = sessionStorage.getItem(SLOT_KEY);
    sessionSlot = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored ?? '') ? stored : crypto.randomUUID();
    sessionStorage.setItem(SLOT_KEY, sessionSlot);
  } catch {
    // Recovery still works when storage access is restricted; read can find this
    // slot again as another pending draft after the browser has been reopened.
    sessionSlot = crypto.randomUUID();
  }
  return sessionSlot;
}

async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(mode, callback) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      let value = null;
      callback(transaction.objectStore(STORE_NAME), (result) => { value = result; });
      transaction.oncomplete = () => resolve(value ?? null);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Rascunho não concluído.'));
    });
  } finally { database.close(); }
}

export const drafts = {
  read: () => {
    const slotId = ownSlot();
    return transact('readonly', (store, result) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const pending = request.result.filter((entry) => entry?.document && typeof entry.savedAt === 'string').map((entry) => ({ ...entry, slotId: entry.slotId ?? LEGACY_SLOT }));
        result(pending.find((entry) => entry.slotId === slotId) ?? pending.sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0] ?? null);
      };
    });
  },
  write: (document) => {
    const slotId = ownSlot();
    // Dismiss compares savedAt; guarantee two writes from this tab have distinct
    // timestamps even when they happen during the same millisecond.
    lastWriteTime = Math.max(Date.now(), lastWriteTime + 1);
    const entry = { document: structuredClone(document), savedAt: new Date(lastWriteTime).toISOString(), slotId };
    return transact('readwrite', (store, result) => {
      const request = store.put(entry, slotId);
      request.onsuccess = () => result(entry);
    });
  },
  clear: () => {
    const slotId = ownSlot();
    return transact('readwrite', (store) => store.delete(slotId));
  },
  dismiss: (receipt) => {
    if (!receipt || typeof receipt.slotId !== 'string' || typeof receipt.savedAt !== 'string') return Promise.resolve(false);
    return transact('readwrite', (store, result) => {
      const request = store.get(receipt.slotId);
      request.onsuccess = () => {
        if (request.result?.savedAt !== receipt.savedAt) { result(false); return; }
        const deletion = store.delete(receipt.slotId);
        deletion.onsuccess = () => result(true);
      };
    });
  },
};
