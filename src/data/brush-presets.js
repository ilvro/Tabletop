import { storageScope } from './paths.js';
import { BRUSH_PRESET_LIMIT, brushPresetName, validateBrushSettings, validateBrushPreset } from '../domain/brush-presets.js';

/** Personal library shared by tabs of this application, with atomic revision checks. */
export function createBrushPresetRepository({ databaseName = `tabletop-brush-presets-v1:${storageScope()}`, databaseFactory = globalThis.indexedDB } = {}) {
  function open() {
    if (!databaseFactory) return Promise.reject(new Error('O navegador não permite salvar pincéis. Libere o armazenamento do site.'));
    return new Promise((resolve, reject) => {
      const request = databaseFactory.open(databaseName, 1);
      let blocked = false;
      request.onupgradeneeded = () => request.result.createObjectStore('presets', { keyPath: 'id' });
      request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => { blocked = true; reject(new Error('Feche as outras abas para atualizar os pincéis salvos.')); };
    });
  }
  async function transact(mode, action) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('presets', mode);
        let value, failure;
        const stop = error => { failure = error; tx.abort(); };
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => { failure ??= tx.error; };
        tx.onabort = () => reject(failure ?? tx.error ?? new Error('Não foi possível salvar os pincéis neste navegador.'));
        const request = tx.objectStore('presets').getAll();
        request.onsuccess = () => { try { value = action(tx.objectStore('presets'), request.result); } catch (error) { stop(error); } };
      });
    } finally { db.close(); }
  }
  const valid = entries => entries.filter(entry => { try { validateBrushPreset(entry); return true; } catch { return false; } });
  const sort = entries => entries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
  const checkName = (entries, surface, name, id) => {
    if (entries.some(entry => entry.id !== id && entry.surface === surface && entry.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) throw new Error('Já existe um pincel com esse nome nesta superfície.');
  };
  return {
    list: () => transact('readonly', (_store, entries) => sort(valid(entries))),
    async save({ name, surface, brush }, previous = null) {
      name = brushPresetName(name);
      validateBrushSettings(surface, brush);
      const copy = structuredClone(brush);
      return transact('readwrite', (store, entries) => {
        const current = previous && entries.find(entry => entry.id === previous.id);
        if (previous && (!current || current.revision !== previous.revision)) throw new Error('Este pincel mudou em outra aba. Selecione-o novamente antes de atualizar.');
        if (current && current.surface !== surface) throw new Error('Superfície do pincel incompatível.');
        if (!previous && entries.length >= BRUSH_PRESET_LIMIT) throw new Error(`Você já tem ${BRUSH_PRESET_LIMIT} pincéis. Exclua um antes de salvar outro.`);
        checkName(valid(entries), surface, name, current?.id);
        const entry = { id: current?.id ?? crypto.randomUUID(), schemaVersion: 1, name, surface, brush: copy, revision: (current?.revision ?? 0) + 1, updatedAt: new Date().toISOString() };
        validateBrushPreset(entry); store.put(entry);
        return entry;
      });
    },
    remove: previous => transact('readwrite', (store, entries) => {
      const current = entries.find(entry => entry.id === previous?.id);
      if (!current || current.revision !== previous.revision) throw new Error('Este pincel mudou em outra aba. Selecione-o novamente antes de excluir.');
      store.delete(current.id);
    }),
  };
}
