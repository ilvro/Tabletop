import { mkdir, open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, details);
  }
}

export const documentId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const assetId = /^[A-Za-z0-9_-]{1,120}$/;

export function assertId(id, pattern = documentId) {
  if (typeof id !== 'string' || !pattern.test(id)) {
    throw new HttpError(422, 'INVALID_ID', 'Identificador inválido.');
  }
  return id;
}

export function assertRevision(revision) {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new HttpError(422, 'INVALID_REVISION', 'Informe expectedRevision como inteiro positivo.');
  }
}

export function checkRevision(current, expected) {
  assertRevision(expected);
  if (current.revision !== expected) {
    throw new HttpError(409, 'REVISION_CONFLICT', 'O documento mudou no servidor. Recarregue antes de salvar.', {
      currentRevision: current.revision,
    });
  }
}

/** The temporary file and destination are on the same filesystem. */
export async function atomicWrite(file, content) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(content);
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, file);
  } finally {
    if (handle) await handle.close().catch(() => {});
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

export async function readJSON(file, missingMessage = 'Documento não encontrado.') {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') throw new HttpError(404, 'NOT_FOUND', missingMessage);
    throw error;
  }
}

/** A single server owns this store; concurrent tabs serialize by document ID. */
export class DocumentStorage {
  constructor(dataDir, { backupLimit = 5 } = {}) {
    this.dataDir = dataDir;
    this.backupLimit = backupLimit;
    this.locks = new Map();
  }

  async init() {
    await Promise.all(['maps', 'scenes', 'assets', 'backups'].map((name) => mkdir(path.join(this.dataDir, name), { recursive: true })));
  }

  file(collection, id) {
    assertId(id);
    return path.join(this.dataDir, collection, `${id}.json`);
  }

  async list(collection) {
    const files = await readdir(path.join(this.dataDir, collection));
    const documents = await Promise.all(files.filter((name) => documentId.test(name.slice(0, -5)) && name.endsWith('.json')).map(async (name) => {
      const doc = await readJSON(path.join(this.dataDir, collection, name));
      return { id: doc.id, documentType: doc.documentType, name: doc.name, revision: doc.revision, createdAt: doc.createdAt, updatedAt: doc.updatedAt };
    }));
    return documents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  }

  read(collection, id) {
    return readJSON(this.file(collection, id));
  }

  async locked(collection, id, action) {
    const key = `${collection}/${assertId(id)}`;
    const previous = this.locks.get(key) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(action);
    this.locks.set(key, operation);
    try {
      return await operation;
    } finally {
      if (this.locks.get(key) === operation) this.locks.delete(key);
    }
  }

  async backup(collection, doc) {
    if (this.backupLimit < 1) return;
    const dir = path.join(this.dataDir, 'backups', collection, assertId(doc.id));
    await mkdir(dir, { recursive: true });
    await atomicWrite(path.join(dir, `${doc.revision}.json`), JSON.stringify(doc, null, 2));
    const revisions = (await readdir(dir)).filter((name) => /^\d+\.json$/.test(name)).sort((a, b) => Number(b.slice(0, -5)) - Number(a.slice(0, -5)));
    await Promise.all(revisions.slice(this.backupLimit).map((name) => unlink(path.join(dir, name))));
  }

  async write(collection, doc, previous) {
    if (previous) await this.backup(collection, previous);
    await atomicWrite(this.file(collection, doc.id), JSON.stringify(doc, null, 2));
    return doc;
  }

  async remove(collection, id, expectedRevision) {
    return this.locked(collection, id, async () => {
      const previous = await this.read(collection, id);
      checkRevision(previous, expectedRevision);
      await this.backup(collection, previous);
      await unlink(this.file(collection, id));
    });
  }
}
