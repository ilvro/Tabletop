import { ApiError } from './errors.js';
import { applicationURL, resolveAsset } from './paths.js';
import { createBrowserRepository } from './browser-repository.js';
export { ApiError } from './errors.js';

async function request(path, options = {}) {
  const response = await fetch(applicationURL(`api/tabletop${path}`), options);
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new ApiError(result?.error?.message || result?.error || 'O servidor não concluiu a operação.', response.status, result);
  }
  return result;
}

const json = (body) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const collection = (type = 'scene') => type === 'environment' ? 'environments' : type === 'map' ? 'maps' : 'scenes';
const serverRepository = {
  storage:'server',
  list: async (type) => (await request(`/${collection(type)}`)).map(item => ({ ...item, ...(item.preview ? { preview: applicationURL(item.preview) } : {}) })),
  savePreview: (document, image) => request(`/${collection(document.documentType)}/${encodeURIComponent(document.id)}/preview`, { method: 'PUT', ...json({ image, expectedRevision: document.revision }) }),
  read: (id, type) => request(`/${collection(type)}/${encodeURIComponent(id)}`),
  create: (document) => request(`/${collection(document.documentType)}`, { method: 'POST', ...json({ document }) }),
  save: (document) => request(`/${collection(document.documentType)}/${encodeURIComponent(document.id)}`, {
    method: 'PUT', ...json({ document, expectedRevision: document.revision }),
  }),
  duplicate: (document) => request(`/${collection(document.documentType)}/${encodeURIComponent(document.id)}/duplicate`, {
    method: 'POST', ...json({ expectedRevision: document.revision, name: `${document.name} — cópia` }),
  }),
  remove: (document) => request(`/${collection(document.documentType)}/${encodeURIComponent(document.id)}?expectedRevision=${document.revision}`, { method: 'DELETE' }),
  assets: async () => (await request('/assets')).map(resolveAsset),
  updateAssetMetadata: async (asset, metadata) => resolveAsset(await request(`/assets/${encodeURIComponent(asset.id)}/metadata`, {
    method: 'PATCH', ...json({ metadata, expectedMetadataRevision: asset.metadataRevision ?? 0 }),
  })),
  importAsset: async (file) => resolveAsset(await request(`/assets?name=${encodeURIComponent(file.name)}`, {
    method: 'POST', headers: { 'Content-Type': file.name.toLowerCase().endsWith('.glb') ? 'model/gltf-binary' : file.type }, body: file,
  })),
};

// Dedicated static builds also work on custom domains. Normal builds on github.io
// use the same browser storage, while the existing local server remains unchanged.
const browserMode = import.meta.env?.VITE_TABLETOP_STORAGE === 'browser' || /(^|\.)github\.io$/i.test(globalThis.location?.hostname ?? '');
export const repository = browserMode ? createBrowserRepository() : serverRepository;
