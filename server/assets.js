import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { atomicWrite, assertId, assetId, HttpError, readJSON } from './storage.js';
import { validateAssetMetadata } from '../src/domain/asset-library.js';

const mimeTypes = {
  'image/png': { extension: 'png', type: 'image' },
  'image/jpeg': { extension: 'jpg', type: 'image' },
  'image/webp': { extension: 'webp', type: 'image' },
  'model/gltf-binary': { extension: 'glb', type: 'model' },
  'application/octet-stream': { extension: 'glb', type: 'model' },
};

function invalid(message) {
  throw new HttpError(422, 'INVALID_ASSET', message);
}

const crcTable = Array.from({ length: 256 }, (_value, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function validatePNG(bytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(signature)) invalid('PNG inválido.');
  let offset = 8;
  let foundHeader = false;
  let foundData = false;
  let ended = false;
  let width, height, depth, colorType, interlace;
  const compressed = [];
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (offset + 12 + size > bytes.length) invalid('PNG truncado.');
    if (crc32(bytes.subarray(offset + 4, offset + 8 + size)) !== bytes.readUInt32BE(offset + 8 + size)) invalid('Checksum PNG inválido.');
    if (!foundHeader) {
      if (type !== 'IHDR' || size !== 13 || !bytes.readUInt32BE(offset + 8) || !bytes.readUInt32BE(offset + 12)) invalid('Dimensões PNG inválidas.');
      foundHeader = true;
      width = bytes.readUInt32BE(offset + 8);
      height = bytes.readUInt32BE(offset + 12);
      depth = bytes[offset + 16];
      colorType = bytes[offset + 17];
      interlace = bytes[offset + 20];
      const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
      if (!depths[colorType]?.includes(depth) || bytes[offset + 18] !== 0 || bytes[offset + 19] !== 0 || ![0, 1].includes(interlace)) invalid('Formato PNG inválido.');
    }
    if (type === 'IDAT' && size > 0) {
      foundData = true;
      compressed.push(bytes.subarray(offset + 8, offset + 8 + size));
    }
    offset += 12 + size;
    if (type === 'IEND') {
      if (size !== 0 || offset !== bytes.length) invalid('Final PNG inválido.');
      ended = true;
      break;
    }
  }
  if (!foundData || !ended) invalid('PNG incompleto.');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const passes = interlace ? [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]] : [[0, 0, 1, 1]];
  let decoded;
  try { decoded = inflateSync(Buffer.concat(compressed), { maxOutputLength: 128 * 1024 * 1024 }); } catch { invalid('Pixels PNG inválidos ou imagem descomprimida acima de 128 MB.'); }
  let cursor = 0;
  for (const [x, y, dx, dy] of passes) {
    const passWidth = Math.max(0, Math.ceil((width - x) / dx));
    const passHeight = Math.max(0, Math.ceil((height - y) / dy));
    if (!passWidth || !passHeight) continue;
    const rowBytes = Math.ceil(passWidth * channels * depth / 8);
    if (cursor + passHeight * (rowBytes + 1) > decoded.length) invalid('Pixels PNG truncados.');
    for (let row = 0; row < passHeight; row++) {
      if (decoded[cursor] > 4) invalid('Filtro PNG inválido.');
      cursor += rowBytes + 1;
    }
  }
  if (cursor !== decoded.length) invalid('Quantidade de pixels PNG inválida.');
}

function validateJPEG(bytes) {
  if (bytes.length < 16 || bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) invalid('JPEG inválido ou truncado.');
  let offset = 2;
  let dimensions = false;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) invalid('Marcador JPEG inválido.');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda) break;
    if (marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) invalid('JPEG truncado.');
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8 || !bytes.readUInt16BE(offset + 3) || !bytes.readUInt16BE(offset + 5)) invalid('Dimensões JPEG inválidas.');
      dimensions = true;
    }
    offset += length;
  }
  if (!dimensions) invalid('JPEG sem dimensões suportadas.');
}

function validateWebP(bytes) {
  if (bytes.length < 30 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) invalid('WebP inválido ou truncado.');
  const format = bytes.toString('ascii', 12, 16);
  if (!['VP8 ', 'VP8L', 'VP8X'].includes(format)) invalid('Formato WebP não suportado.');
  if (bytes.readUInt32LE(16) + 20 > bytes.length) invalid('WebP truncado.');
  if (format === 'VP8 ' && (bytes.toString('hex', 23, 26) !== '9d012a' || !(bytes.readUInt16LE(26) & 0x3fff) || !(bytes.readUInt16LE(28) & 0x3fff))) invalid('Dimensões WebP inválidas.');
  if (format === 'VP8L' && bytes[20] !== 0x2f) invalid('WebP lossless inválido.');
}

/** GLBs are static and self-contained; compressed assets need future local decoders. */
export function validateGLB(bytes) {
  if (bytes.length < 24 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) invalid('GLB 2.0 inválido ou truncado.');
  let offset = 12;
  let json;
  let binary;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) invalid('Chunk GLB truncado.');
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    if (length % 4 || offset + 8 + length > bytes.length) invalid('Tamanho de chunk GLB inválido.');
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) {
      if (json || offset !== 12) invalid('JSON GLB deve ser o primeiro e único chunk.');
      try { json = JSON.parse(chunk.toString('utf8')); } catch { invalid('JSON GLB inválido.'); }
    } else if (type === 0x004e4942) {
      if (binary || !json) invalid('Chunk binário GLB inválido.');
      binary = chunk;
    } else invalid('Chunk GLB não suportado.');
    offset += length + 8;
  }
  if (json?.asset?.version !== '2.0') invalid('A versão do asset deve ser glTF 2.0.');
  const extensions = new Set([...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])]);
  for (const extension of extensions) {
    if (!['KHR_materials_unlit', 'KHR_materials_variants'].includes(extension)) invalid(`Extensão GLB não suportada neste slice: ${extension}. Exporte um GLB sem compressão/extensões adicionais.`);
  }
  if (json.animations?.length) invalid('Importe um GLB estático sem animações neste slice.');
  if (json.buffers && !Array.isArray(json.buffers)) invalid('Buffers GLB inválidos.');
  if ((json.buffers?.length ?? 0) > 1) invalid('GLB deve conter um único buffer embutido.');
  for (const buffer of json.buffers ?? []) {
    if (buffer.uri || !Number.isSafeInteger(buffer.byteLength) || buffer.byteLength < 0 || buffer.byteLength > (binary?.length ?? 0) || (binary?.length ?? 0) - buffer.byteLength > 3) invalid('GLB contém buffer externo ou incompleto.');
  }
  for (const view of json.bufferViews ?? []) {
    if (view.buffer !== 0 || !Number.isSafeInteger(view.byteLength) || view.byteLength <= 0 || !Number.isSafeInteger(view.byteOffset ?? 0) || (view.byteOffset ?? 0) < 0 || (view.byteOffset ?? 0) + view.byteLength > (json.buffers?.[0]?.byteLength ?? 0)) invalid('BufferView GLB fora do buffer.');
  }
  const sizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
  for (const accessor of json.accessors ?? []) {
    const size = sizes[accessor.componentType] * components[accessor.type];
    const view = json.bufferViews?.[accessor.bufferView];
    if (!size || !view || accessor.sparse || !Number.isSafeInteger(accessor.count) || accessor.count < 1 || !Number.isSafeInteger(accessor.byteOffset ?? 0) || (accessor.byteOffset ?? 0) < 0) invalid('Accessor GLB inválido ou não suportado.');
    const stride = view.byteStride ?? size;
    if (!Number.isSafeInteger(stride) || stride < size || (accessor.byteOffset ?? 0) + (accessor.count - 1) * stride + size > view.byteLength) invalid('Accessor GLB fora do buffer.');
  }
  for (const image of json.images ?? []) {
    let imageBytes, imageMime;
    if (image.uri) {
      if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(image.uri)) invalid('GLB contém imagem externa ou formato não suportado.');
      imageMime = image.uri.slice(5, image.uri.indexOf(';'));
      imageBytes = Buffer.from(image.uri.slice(image.uri.indexOf(',') + 1), 'base64');
    } else if (!Number.isInteger(image.bufferView) || !json.bufferViews?.[image.bufferView] || !['image/png', 'image/jpeg', 'image/webp'].includes(image.mimeType)) invalid('Imagem GLB inválida.');
    else {
      const view = json.bufferViews[image.bufferView];
      imageMime = image.mimeType;
      imageBytes = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    }
    if (imageMime === 'image/png') validatePNG(imageBytes);
    else if (imageMime === 'image/jpeg') validateJPEG(imageBytes);
    else validateWebP(imageBytes);
  }
  if (!Array.isArray(json.meshes) || !json.meshes.length || !Array.isArray(json.nodes) || !json.nodes.some((node) => Number.isInteger(node.mesh) && json.meshes[node.mesh])) invalid('GLB precisa de uma mesh estática e um node que a use.');
  for (const mesh of json.meshes) {
    if (!Array.isArray(mesh.primitives) || !mesh.primitives.length) invalid('Mesh GLB sem geometria.');
    for (const primitive of mesh.primitives) {
      if (!Number.isInteger(primitive.attributes?.POSITION) || !json.accessors?.[primitive.attributes.POSITION] || json.accessors[primitive.attributes.POSITION].type !== 'VEC3') invalid('Primitiva GLB precisa de posições válidas.');
      if (primitive.targets?.length) invalid('Morph targets GLB não são suportados neste slice.');
      for (const index of Object.values(primitive.attributes)) if (!Number.isInteger(index) || !json.accessors[index]) invalid('Atributo GLB inválido.');
      if (primitive.indices !== undefined && (!Number.isInteger(primitive.indices) || !json.accessors[primitive.indices] || json.accessors[primitive.indices].type !== 'SCALAR')) invalid('Índices GLB inválidos.');
      if (primitive.material !== undefined && (!Number.isInteger(primitive.material) || !json.materials?.[primitive.material])) invalid('Material GLB ausente.');
    }
  }
  for (const node of json.nodes) {
    if (node.mesh !== undefined && (!Number.isInteger(node.mesh) || !json.meshes[node.mesh])) invalid('Node GLB referencia mesh ausente.');
    if ((node.children ?? []).some((index) => !Number.isInteger(index) || !json.nodes[index])) invalid('Node GLB referencia filho ausente.');
  }
  const visiting = new Set(), visited = new Set();
  const checkNode = (index) => {
    if (visiting.has(index)) invalid('Hierarquia GLB contém ciclo.');
    if (visited.has(index)) return;
    visiting.add(index);
    for (const child of json.nodes[index].children ?? []) checkNode(child);
    visiting.delete(index);
    visited.add(index);
  };
  json.nodes.forEach((_node, index) => checkNode(index));
  if (!Array.isArray(json.scenes) || !json.scenes.length || !json.scenes[json.scene ?? 0] || !json.scenes[json.scene ?? 0].nodes?.length || json.scenes.some((scene) => (scene.nodes ?? []).some((index) => !Number.isInteger(index) || !json.nodes[index]))) invalid('Cena GLB não contém nodes válidos.');
  if (json.skins?.length) invalid('GLB com rig não é suportado neste slice.');
  return json;
}

export class AssetStorage {
  constructor(dataDir, publicDir) {
    this.directory = path.join(dataDir, 'assets');
    this.catalogFile = path.join(publicDir, 'assets', 'catalog.json');
    this.metadataDirectory = path.join(dataDir, 'asset-metadata');
    this.locks = new Map();
  }

  async builtins() {
    try {
      const catalog = JSON.parse(await readFile(this.catalogFile, 'utf8'));
      return Array.isArray(catalog) ? catalog : catalog.assets ?? [];
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async list() {
    const dirs = await readdir(this.directory, { withFileTypes: true });
    const imported = await Promise.all(dirs.filter((entry) => entry.isDirectory() && assetId.test(entry.name)).map((entry) => readJSON(path.join(this.directory, entry.name, 'record.json'))));
    return Promise.all([...await this.builtins(), ...imported].map(record => this.withMetadata(record)));
  }

  async read(id) {
    assertId(id, assetId);
    const builtin = (await this.builtins()).find((record) => record.id === id);
    if (builtin) return this.withMetadata(builtin);
    return this.withMetadata(await readJSON(path.join(this.directory, id, 'record.json'), 'Asset não encontrado.'));
  }

  async withMetadata(record) {
    let metadata;
    try { metadata = await readJSON(path.join(this.metadataDirectory, `${record.id}.json`)); }
    catch (error) { if (error.status !== 404) throw error; }
    return { ...record, metadataRevision: 0, favorite: false, ...metadata };
  }

  async updateMetadata(id, patch, expectedRevision) {
    assertId(id, assetId);
    let fields;
    try { fields = validateAssetMetadata(patch); } catch (error) { invalid(error.message); }
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) invalid('Informe expectedMetadataRevision como inteiro não negativo.');
    const previous = this.locks.get(id) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      const current = await this.read(id);
      if (current.metadataRevision !== expectedRevision) throw new HttpError(409, 'METADATA_CONFLICT', 'A classificação mudou em outra aba. Reabra o editor de tags antes de salvar.', { currentRevision: current.metadataRevision });
      const metadata = Object.fromEntries(['category', 'era', 'contexts', 'tags', 'favorite'].filter(key => current[key] !== undefined).map(key => [key, current[key]]));
      Object.assign(metadata, fields, { metadataRevision: current.metadataRevision + 1 });
      await mkdir(this.metadataDirectory, { recursive: true });
      await atomicWrite(path.join(this.metadataDirectory, `${id}.json`), JSON.stringify(metadata, null, 2));
      return { ...current, ...metadata };
    });
    this.locks.set(id, operation);
    try { return await operation; } finally { if (this.locks.get(id) === operation) this.locks.delete(id); }
  }

  file(record) {
    assertId(record.id, assetId);
    if (!/^source\.(png|jpg|webp|glb)$/.test(record.fileName ?? '')) throw new HttpError(404, 'NOT_FOUND', 'Arquivo gerenciado não encontrado.');
    return path.join(this.directory, record.id, record.fileName);
  }

  async import(bytes, mime, { name = 'Asset importado', category = 'imported' } = {}) {
    const format = mimeTypes[mime];
    if (!format) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use PNG, JPEG, WebP ou GLB estático.');
    if (!Buffer.isBuffer(bytes) || !bytes.length) invalid('O arquivo está vazio.');
    try {
      if (mime === 'image/png') validatePNG(bytes);
      else if (mime === 'image/jpeg') validateJPEG(bytes);
      else if (mime === 'image/webp') validateWebP(bytes);
      else validateGLB(bytes);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      invalid('Estrutura de arquivo inválida ou não suportada.');
    }
    if (typeof name !== 'string' || !name.trim() || name.length > 160) invalid('Nome de asset inválido (máximo 160 caracteres).');
    if (typeof category !== 'string' || !category.trim() || category.length > 80) invalid('Categoria inválida.');
    const id = randomUUID();
    const dir = path.join(this.directory, id);
    const fileName = `source.${format.extension}`;
    const record = { id, revision: 1, metadataRevision: 0, favorite: false, type: format.type, name: name.trim(), category: category.trim(), era: 'Não definida', contexts: [], tags: [], footprint: [1, 1], url: `/api/tabletop/assets/${id}/file`, fileName, mimeType: format.type === 'model' ? 'model/gltf-binary' : mime, hash: createHash('sha256').update(bytes).digest('hex'), byteLength: bytes.length };
    await mkdir(dir);
    try {
      await atomicWrite(path.join(dir, fileName), bytes);
      await atomicWrite(path.join(dir, 'record.json'), JSON.stringify(record, null, 2));
    } catch (error) {
      await unlink(path.join(dir, fileName)).catch(() => {});
      await unlink(path.join(dir, 'record.json')).catch(() => {});
      await rmdir(dir).catch(() => {});
      throw error;
    }
    return record;
  }
}
