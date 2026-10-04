export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`/api/tabletop${path}`, options);
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new ApiError(result?.error?.message || result?.error || 'O servidor não concluiu a operação.', response.status, result);
  }
  return result;
}

const json = (body) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const collection = (type = 'scene') => type === 'environment' ? 'environments' : type === 'map' ? 'maps' : 'scenes';
export const repository = {
  list: (type) => request(`/${collection(type)}`),
  read: (id, type) => request(`/${collection(type)}/${encodeURIComponent(id)}`),
  create: (document) => request(`/${collection(document.documentType)}`, { method: 'POST', ...json({ document }) }),
  save: (document) => request(`/${collection(document.documentType)}/${encodeURIComponent(document.id)}`, {
    method: 'PUT', ...json({ document, expectedRevision: document.revision }),
  }),
  duplicate: (document) => request(`/${collection(document.documentType)}/${encodeURIComponent(document.id)}/duplicate`, {
    method: 'POST', ...json({ expectedRevision: document.revision, name: `${document.name} — cópia` }),
  }),
  remove: (document) => request(`/${collection(document.documentType)}/${encodeURIComponent(document.id)}?expectedRevision=${document.revision}`, { method: 'DELETE' }),
  assets: () => request('/assets'),
  updateAssetMetadata: (asset, metadata) => request(`/assets/${encodeURIComponent(asset.id)}/metadata`, {
    method: 'PATCH', ...json({ metadata, expectedMetadataRevision: asset.metadataRevision ?? 0 }),
  }),
  importAsset: (file) => request(`/assets?name=${encodeURIComponent(file.name)}`, {
    method: 'POST', headers: { 'Content-Type': file.name.toLowerCase().endsWith('.glb') ? 'model/gltf-binary' : file.type }, body: file,
  }),
};
