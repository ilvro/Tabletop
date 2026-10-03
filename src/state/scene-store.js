import { clone, id } from '../domain/documents.js';
import { validateDocument, ValidationError } from '../domain/validation.js';
import { applyCommand } from './commands.js';
import { migrateDocument } from '../domain/migrations.js';

const content = document => {
  const { revision, createdAt, updatedAt, ...body } = document;
  return JSON.stringify(body);
};
function freeze(value) {
  Object.freeze(value);
  for (const entry of Object.values(value)) if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) freeze(entry);
  return value;
}

/** In-memory editing history is distinct from the disk revision and save receipt. */
export function createSceneStore(initialDocument) {
  let document = freeze(migrateDocument(initialDocument)), editVersion = 0;
  let savedContent = document.revision > 0 ? content(document) : null;
  let confirmed = { revision: document.revision, createdAt: document.createdAt, updatedAt: document.updatedAt };
  let undoStack = [], redoStack = [];
  const subscribers = new Set();
  const dirty = () => savedContent !== content(document);
  const notify = (type, command) => {
    const event = { type, command, document, editVersion, dirty: dirty() };
    for (const subscriber of subscribers) subscriber(event);
  };
  const restore = snapshot => freeze({ ...clone(snapshot), ...confirmed });
  return {
    get document() { return document; }, get editVersion() { return editVersion; }, get dirty() { return dirty(); },
    get canUndo() { return undoStack.length > 0; }, get canRedo() { return redoStack.length > 0; },
    get undoLabel() { return undoStack.at(-1)?.label ?? ''; }, get redoLabel() { return redoStack.at(-1)?.label ?? ''; },
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
    execute(type, payload, options = {}) {
      const expected = options.expectedEditVersion ?? (type === 'proposal.accept' ? payload.proposal?.expectedEditVersion : editVersion);
      if (expected !== editVersion) throw new ValidationError('A cena mudou; gere a sugestão novamente.');
      const command = { commandId: id(), documentId: document.id, expectedEditVersion: editVersion, type, payload: clone(payload) };
      const next = applyCommand(document, command);
      if (content(next) === content(document)) return document;
      undoStack.push({ before: document, after: freeze(next), label: options.label ?? payload.proposal?.label ?? type, command });
      if (undoStack.length > 150) undoStack.shift();
      redoStack = []; document = freeze(next); editVersion++; notify('execute', command); return document;
    },
    undo() {
      const entry = undoStack.pop(); if (!entry) return document;
      document = restore(entry.before); redoStack.push(entry); editVersion++; notify('undo', entry.command); return document;
    },
    redo() {
      const entry = redoStack.pop(); if (!entry) return document;
      document = restore(entry.after); undoStack.push(entry); editVersion++; notify('redo', entry.command); return document;
    },
    replace(next, { saved = true } = {}) {
      document = freeze(migrateDocument(next)); editVersion++;
      confirmed = { revision: document.revision, createdAt: document.createdAt, updatedAt: document.updatedAt };
      savedContent = saved ? content(document) : null; undoStack = []; redoStack = []; notify('replace'); return document;
    },
    markSaved(serverDocument, sentEditVersion) {
      validateDocument(serverDocument);
      if (serverDocument.id !== document.id) throw new ValidationError('Confirmação de outro documento.');
      if (!Number.isInteger(sentEditVersion) || sentEditVersion > editVersion || sentEditVersion < 0) throw new ValidationError('Versão local de salvamento inválida.');
      if (serverDocument.revision < confirmed.revision) throw new ValidationError('Confirmação de salvamento obsoleta.');
      confirmed = { revision: serverDocument.revision, createdAt: serverDocument.createdAt, updatedAt: serverDocument.updatedAt };
      savedContent = content(serverDocument);
      document = sentEditVersion === editVersion ? freeze(clone(serverDocument)) : restore(document);
      notify('saved'); return document;
    },
  };
}
