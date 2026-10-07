import { mkdir, open, readFile, readdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateScenePreview } from '../src/data/scene-preview.js';
import { migrateDocument } from '../src/domain/migrations.js';

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
    this.summaries = new Map();
  }

  async init() {
    await Promise.all(['maps', 'scenes', 'environments', 'assets', 'backups'].map((name) => mkdir(path.join(this.dataDir, name), { recursive: true })));
    await Promise.all(['maps','scenes','environments'].map(name=>mkdir(path.join(this.dataDir,'.summaries',name),{recursive:true})));
  }

  file(collection, id) {
    assertId(id);
    return path.join(this.dataDir, collection, `${id}.json`);
  }

  async list(collection) {
    const files = await readdir(path.join(this.dataDir, collection));
    const documents = await Promise.all(files.filter((name) => documentId.test(name.slice(0, -5)) && name.endsWith('.json')).map(async (name) => {
      return this.locked(collection,name.slice(0,-5),()=>this.summary(collection,name.slice(0,-5))).catch(error=>{if(error.status===404)return null;throw error;});
    }));
    return documents.filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  }

  async summary(collection,id) {
    const fingerprint=async file=>{try {const s=await stat(file,{bigint:true});return `${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`;}catch(error){if(error.code==='ENOENT')return null;throw error;}};
    const signatures=await Promise.all([fingerprint(this.file(collection,id)),fingerprint(this.previewFile(collection,id))]);
    const signature=JSON.stringify(signatures),key=`${collection}/${id}`;
    const indexFile=path.join(this.dataDir,'.summaries',collection,`${assertId(id)}.json`);
    let cached=this.summaries.get(key);
    if(!cached)try {cached=await readJSON(indexFile);}catch{/* The source document remains readable without the auxiliary index. */}
    const summaryValid=cached?.summary?.id===id&&typeof cached.summary.name==='string'&&typeof cached.summary.updatedAt==='string'&&typeof cached.summary.createdAt==='string'&&Number.isSafeInteger(cached.summary.revision)&&cached.summary.revision>0&&['scene','map','environment'].includes(cached.summary.documentType);
    if(cached?.signature===signature&&summaryValid){this.summaries.set(key,cached);if(this.summaries.size>256)this.summaries.delete(this.summaries.keys().next().value);return {...cached.summary};}
    const doc=await readJSON(this.file(collection,id)),preview=await this.preview(collection,id);
    const {documentType,name,revision,createdAt,updatedAt}=doc;
    const summary={id,documentType,name,revision,createdAt,updatedAt,...(preview?{preview:`api/tabletop/${collection}/${id}/preview?revision=${preview.revision}`,previewRevision:preview.revision}:{})};
    cached={signature,summary};this.summaries.delete(key);this.summaries.set(key,cached);
    if(this.summaries.size>256)this.summaries.delete(this.summaries.keys().next().value);
    // Advisory and rebuildable: a failed index write must not lose an authoritative save.
    await atomicWrite(indexFile,JSON.stringify(cached)).catch(()=>{});
    return {...summary};
  }

  async refreshSummary(collection,id) {
    this.summaries.delete(`${collection}/${id}`);
    await this.summary(collection,id).catch(()=>{});
  }

  previewFile(collection, id) { return this.file(collection, id).replace(/\.json$/, '.preview.json'); }

  async preview(collection, id) {
    try { return await readJSON(this.previewFile(collection, id)); }
    catch (error) { if (error.status === 404) return null; throw error; }
  }

  async writePreview(collection, id, image, revision) {
    try { validateScenePreview(image); } catch (error) { throw new HttpError(422, 'INVALID_PREVIEW', error.message); }
    return this.locked(collection, id, async () => {
      const current = await this.read(collection, id); checkRevision(current, revision);
      await atomicWrite(this.previewFile(collection, id), JSON.stringify({ image, revision }));
      await this.refreshSummary(collection,id);
    });
  }

  async read(collection, id) {
    return migrateDocument(await readJSON(this.file(collection, id)));
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
    // Keep the original schema in the backup when the explicit save migrates it.
    if (previous) await this.backup(collection, await readJSON(this.file(collection, previous.id)));
    await atomicWrite(this.file(collection, doc.id), JSON.stringify(doc, null, 2));
    await this.refreshSummary(collection,doc.id);
    return doc;
  }

  async remove(collection, id, expectedRevision) {
    return this.locked(collection, id, async () => {
      const previous = await this.read(collection, id);
      checkRevision(previous, expectedRevision);
      await this.backup(collection, await readJSON(this.file(collection, id)));
      await unlink(this.file(collection, id));
      await unlink(this.previewFile(collection, id)).catch(error => { if (error.code !== 'ENOENT') throw error; });
      this.summaries.delete(`${collection}/${id}`);
      await unlink(path.join(this.dataDir,'.summaries',collection,`${id}.json`)).catch(error=>{if(error.code!=='ENOENT')throw error;});
    });
  }
}
