import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validateDocument, duplicateDocument, migrateDocument } from '../src/domain/documents.js';
import { AssetStorage } from './assets.js';
import { DocumentStorage, HttpError, assertId, checkRevision } from './storage.js';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asyncRoute = (callback) => (req, res, next) => Promise.resolve(callback(req, res)).catch(next);

function validDocument(body, type, routeId) {
  const document = body?.document ?? body;
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new HttpError(422, 'INVALID_DOCUMENT', 'Envie um documento Tabletop.');
  }
  if (document.documentType !== type) throw new HttpError(422, 'INVALID_DOCUMENT_TYPE', `Esta rota exige um documento ${type}.`);
  assertId(document.id);
  if (routeId && document.id !== routeId) throw new HttpError(422, 'DOCUMENT_ID_MISMATCH', 'ID do documento difere da rota.');
  validateDocument(document);
  return migrateDocument(document);
}

async function validateAssetReferences(document, assets) {
  const references = new Map();
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (value.assetRef) references.set(`${value.assetRef.id}:${value.assetRef.revision}`, value.assetRef);
    for (const child of Object.values(value)) visit(child);
  };
  visit(document);
  for (const reference of references.values()) {
    let record;
    try { record = await assets.read(reference.id); } catch (error) {
      if (error.status === 404) throw new HttpError(422, 'MISSING_ASSET', `Asset ausente: ${reference.id}. Importe-o antes de salvar.`);
      throw error;
    }
    if (record.revision !== reference.revision) throw new HttpError(422, 'MISSING_ASSET_REVISION', `A revisão ${reference.revision} do asset ${reference.id} não está disponível.`);
  }
}

/** Build/API share one origin in production. The slice is intentionally local. */
export async function createApp({ dataDir = path.join(projectDir, 'data'), distDir = path.join(projectDir, 'dist'), publicDir = path.join(projectDir, 'public'), allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'], assetLimit = '25mb', backupLimit = 5, instanceId = randomUUID() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  const storage = new DocumentStorage(path.resolve(dataDir), { backupLimit });
  await storage.init();
  const assets = new AssetStorage(path.resolve(dataDir), path.resolve(publicDir));
  app.locals.storage = storage;
  app.locals.assets = assets;

  const origins = new Set([
    ...allowedOrigins,
    ...(process.env.TABLETOP_ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean),
    ...(process.env.TABLETOP_UI_PORT ? [
      `http://localhost:${process.env.TABLETOP_UI_PORT}`,
      `http://127.0.0.1:${process.env.TABLETOP_UI_PORT}`,
    ] : []),
  ]);

  function isAllowedOrigin(origin, sameOrigin) {
    if (!origin) return true;
    if (sameOrigin && origin === sameOrigin) return true;
    if (origins.has(origin)) return true;
    try {
      const { hostname } = new URL(origin);
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') {
        return true;
      }
    } catch { /* malformed origin */ }
    return false;
  }

  app.use('/api', (req, _res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = req.get('Origin');
    if (!origin) return next();
    const sameOrigin = `${req.protocol}://${req.get('host')}`;
    if (!isAllowedOrigin(origin, sameOrigin)) return next(new HttpError(403, 'ORIGIN_REJECTED', 'Origem de escrita não autorizada pelo servidor local.'));
    next();
  });

  app.get('/api/tabletop/health', (_req, res) => res.json({ status: 'ok', schemaVersion: 2, persistence: 'local-server', instanceId }));
  app.post('/api/tabletop/assets', express.raw({ type: '*/*', limit: assetLimit }), asyncRoute(async (req, res) => {
    const mime = (req.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
    const record = await assets.import(req.body, mime, { name: req.query.name, category: req.query.category });
    res.status(201).json(record);
  }));

  app.use('/api', express.json({ limit: '5mb', strict: true }));
  app.get('/api/tabletop/assets', asyncRoute(async (_req, res) => res.json(await assets.list())));
  app.get('/api/tabletop/assets/:id', asyncRoute(async (req, res) => res.json(await assets.read(req.params.id))));
  app.patch('/api/tabletop/assets/:id/metadata', asyncRoute(async (req, res) => {
    res.json(await assets.updateMetadata(req.params.id, req.body?.metadata, req.body?.expectedMetadataRevision));
  }));
  app.get('/api/tabletop/assets/:id/file', asyncRoute(async (req, res) => {
    const record = await assets.read(req.params.id);
    const file = assets.file(record);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(record.mimeType);
    await new Promise((resolve, reject) => res.sendFile(file, (error) => error ? reject(error) : resolve()));
  }));

  for (const [collection, type] of [['scenes', 'scene'], ['maps', 'map'], ['environments', 'environment']]) {
    const route = `/api/tabletop/${collection}`;
    app.get(route, asyncRoute(async (_req, res) => res.json(await storage.list(collection))));
    app.get(`${route}/:id`, asyncRoute(async (req, res) => res.json(await storage.read(collection, req.params.id))));
    app.post(route, asyncRoute(async (req, res) => {
      const document = validDocument(req.body, type);
      await validateAssetReferences(document, assets);
      const saved = await storage.locked(collection, document.id, async () => {
        try {
          const existing = await storage.read(collection, document.id);
          throw new HttpError(409, 'DOCUMENT_EXISTS', 'Já existe um documento com este ID. Use salvar ou duplicar.', { currentRevision: existing.revision });
        } catch (error) { if (error.status !== 404) throw error; }
        const now = new Date().toISOString();
        Object.assign(document, { revision: 1, createdAt: now, updatedAt: now });
        validateDocument(document);
        return storage.write(collection, document);
      });
      res.status(201).json(saved);
    }));
    app.put(`${route}/:id`, asyncRoute(async (req, res) => {
      assertId(req.params.id);
      const document = validDocument(req.body, type, req.params.id);
      await validateAssetReferences(document, assets);
      const saved = await storage.locked(collection, document.id, async () => {
        const current = await storage.read(collection, document.id);
        checkRevision(current, req.body.expectedRevision);
        Object.assign(document, { revision: current.revision + 1, createdAt: current.createdAt, updatedAt: new Date().toISOString() });
        validateDocument(document);
        return storage.write(collection, document, current);
      });
      res.json(saved);
    }));
    app.post(`${route}/:id/duplicate`, asyncRoute(async (req, res) => {
      const saved = await storage.locked(collection, req.params.id, async () => {
        const current = await storage.read(collection, req.params.id);
        checkRevision(current, req.body?.expectedRevision);
        const document = duplicateDocument(current, { name: req.body?.name });
        const now = new Date().toISOString();
        Object.assign(document, { revision: 1, createdAt: now, updatedAt: now });
        validateDocument(document);
        await validateAssetReferences(document, assets);
        return storage.locked(collection, document.id, () => storage.write(collection, document));
      });
      res.status(201).json(saved);
    }));
    app.delete(`${route}/:id`, asyncRoute(async (req, res) => {
      const revision = /^\d+$/.test(req.query.expectedRevision ?? '') ? Number(req.query.expectedRevision) : NaN;
      await storage.remove(collection, req.params.id, revision);
      res.status(204).end();
    }));
  }

  // Unknown API paths must never resolve to the editor's index.html.
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API_NOT_FOUND', 'Rota de API não encontrada.')));
  app.use('/assets', express.static(path.join(publicDir, 'assets'), { dotfiles: 'deny' }));
  app.use(express.static(distDir, { dotfiles: 'deny' }));
  app.get('*', (req, res, next) => {
    if (path.extname(req.path)) return next(new HttpError(404, 'NOT_FOUND', 'Arquivo não encontrado.'));
    res.sendFile(path.resolve(distDir, 'index.html'), (error) => {
      if (error) next(error.code === 'ENOENT' ? new HttpError(404, 'BUILD_NOT_FOUND', 'Build não encontrado. Execute npm run build e npm start, ou use npm run dev.') : error);
    });
  });
  app.use((error, _req, res, _next) => {
    if (res.headersSent) return res.end();
    const status = error.status ?? error.statusCode ?? 500;
    const code = error.code ?? (status === 422 ? 'INVALID_DOCUMENT' : status === 400 ? 'INVALID_JSON' : status === 413 ? 'BODY_TOO_LARGE' : 'STORAGE_ERROR');
    const message = status >= 500 ? 'Não foi possível concluir a operação no disco. O documento não foi confirmado como salvo.' : error.message;
    const body = { error: { code, message } };
    if (error.currentRevision !== undefined) body.currentRevision = error.currentRevision;
    if (error.issues) body.error.issues = error.issues;
    res.status(status).json(body);
  });
  return app;
}
