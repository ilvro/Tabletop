import { createPerformanceDiagnostics } from '../diagnostics/performance.js';
import { trustSnapshot } from './immutable.js';
import { documentChanges } from './changes.js';
import { clone, id } from '../domain/documents.js';
import { validateDocument, ValidationError } from '../domain/validation.js';
import { applyCommand } from './commands.js';
import { migrateDocument } from '../domain/migrations.js';

const content = document => {
  const { revision, createdAt, updatedAt, ...body } = document;
  return JSON.stringify(body);
};
const freeze = trustSnapshot;

function editingDocument(next) {
  const document = migrateDocument(next);
  if (!['scene', 'map'].includes(document.documentType)) throw new ValidationError('Ambientes são presets; o editor da mesa aceita cenas e mapas.');
  return document;
}

/** In-memory editing history is distinct from the disk revision and save receipt. */
export function createSceneStore(initialDocument) {
  const diagnostics=createPerformanceDiagnostics();
  const serialize=value=>diagnostics.measure('canonicalContent',()=>content(value));
  let document = freeze(editingDocument(initialDocument)), editVersion = 0;
  let savedContent = document.revision > 0 ? serialize(document) : null;
  let confirmed = { revision: document.revision, createdAt: document.createdAt, updatedAt: document.updatedAt };
  let undoStack = [], redoStack = [];
  const subscribers = new Set();
  let currentContent = serialize(document);
  const dirty = () => savedContent !== currentContent;
  const notify = (type, command, before) => {
    if (type!=='execute'&&before !== document) currentContent = serialize(document);
    const event = { type, command, document, editVersion, dirty: dirty(), changes: documentChanges(before, document) };
    for (const subscriber of subscribers) subscriber(event);
  };
  const restore = snapshot => freeze({ ...snapshot, ...confirmed });
  return {
    dispose(){subscribers.clear();diagnostics.dispose();},
    performance:()=>diagnostics.snapshot(),resetPerformance:()=>diagnostics.reset(),
    get document() { return document; }, get editVersion() { return editVersion; }, get dirty() { return dirty(); },
    get canUndo() { return undoStack.length > 0; }, get canRedo() { return redoStack.length > 0; },
    get undoLabel() { return undoStack.at(-1)?.label ?? ''; }, get redoLabel() { return redoStack.at(-1)?.label ?? ''; },
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
    execute(type, payload, options = {}) {
      const expected = options.expectedEditVersion ?? (type === 'proposal.accept' ? payload.proposal?.expectedEditVersion : editVersion);
      if (expected !== editVersion) throw new ValidationError('A cena mudou; gere a sugestão novamente.');
      const command = { commandId: id(), documentId: document.id, expectedEditVersion: editVersion, type, payload: diagnostics.measure('commandPayloadClone',()=>clone(payload)) };
      const next = diagnostics.measure('command',()=>applyCommand(document, command,diagnostics));
      const nextContent=next===document?currentContent:serialize(next);
      if (nextContent === currentContent) return document;
      const before = document;
      undoStack.push({ before: document, after: freeze(next), label: options.label ?? payload.proposal?.label ?? type, command });
      if (undoStack.length > 150) undoStack.shift();
      redoStack = []; document = freeze(next); editVersion++; currentContent=nextContent;notify('execute', command, before); return document;
    },
    undo() {
      const entry = undoStack.pop(); if (!entry) return document;
      const before = document; document = restore(entry.before); redoStack.push(entry); editVersion++; notify('undo', entry.command, before); return document;
    },
    redo() {
      const entry = redoStack.pop(); if (!entry) return document;
      const before = document; document = restore(entry.after); undoStack.push(entry); editVersion++; notify('redo', entry.command, before); return document;
    },
    replace(next, { saved = true } = {}) {
      document = freeze(editingDocument(next)); editVersion++;
      confirmed = { revision: document.revision, createdAt: document.createdAt, updatedAt: document.updatedAt };
      savedContent = saved ? serialize(document) : null; undoStack = []; redoStack = []; notify('replace'); return document;
    },
    markSaved(serverDocument, sentEditVersion) {
      validateDocument(serverDocument);
      if (serverDocument.documentType !== document.documentType) throw new ValidationError('Confirmação de outro tipo de documento.');
      if (serverDocument.id !== document.id) throw new ValidationError('Confirmação de outro documento.');
      if (!Number.isInteger(sentEditVersion) || sentEditVersion > editVersion || sentEditVersion < 0) throw new ValidationError('Versão local de salvamento inválida.');
      if (serverDocument.revision < confirmed.revision) throw new ValidationError('Confirmação de salvamento obsoleta.');
      confirmed = { revision: serverDocument.revision, createdAt: serverDocument.createdAt, updatedAt: serverDocument.updatedAt };
      savedContent = serialize(serverDocument);
      const before=document;
      document = sentEditVersion === editVersion && savedContent!==currentContent ? freeze(clone(serverDocument)) : restore(document);
      notify('saved',undefined,before); return document;
    },
  };
}
