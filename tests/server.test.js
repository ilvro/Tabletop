import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rename, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { createScene, createMap, createEntity, createToken, createLight } from '../src/domain/documents.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');

async function fixture(t, options = {}) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'tabletop-server-'));
  const dataDir = path.join(base, 'data'), publicDir = path.join(base, 'public'), distDir = path.join(base, 'dist');
  await mkdir(path.join(publicDir, 'assets'), { recursive: true });
  await mkdir(distDir);
  await writeFile(path.join(publicDir, 'assets', 'catalog.json'), JSON.stringify([{ id: 'builtin-crate', revision: 1, type: 'model', name: 'Caixa', category: 'props', tags: [], footprint: [1, 1], url: '/assets/crate.glb' }]));
  await writeFile(path.join(distDir, 'index.html'), '<!doctype html><title>Tabletop</title>');
  let server;
  let baseURL;
  const start = async () => {
    const app = await createApp({ dataDir, publicDir, distDir, ...options });
    server = await new Promise((resolve, reject) => {
      const current = app.listen(0, '127.0.0.1', () => resolve(current));
      current.once('error', reject);
    });
    baseURL = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    if (!server) return;
    const current = server;
    server = null;
    await new Promise((resolve, reject) => current.close((error) => error ? reject(error) : resolve()));
  };
  t.after(async () => { await stop(); await rm(base, { recursive: true, force: true }); });
  await start();
  const request = async (route, { method = 'GET', body, headers = {}, raw } = {}) => {
    const response = await fetch(`${baseURL}${route}`, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await response.text();
    let value;
    try { value = JSON.parse(text); } catch { value = text; }
    return { status: response.status, value, headers: response.headers };
  };
  return { request, start, stop, dataDir, publicDir, distDir, get origin() { return baseURL; } };
}

function smallRoom() {
  const scene = createScene('Sala de investigação');
  const floor = createEntity('floor', { width: 6, length: 5 });
  const wall = createEntity('wall', { position: [-3, 0, -2.6], length: 6, surfaceId: floor.id });
  const door = createEntity('door', { wallId: wall.id, offset: 3, initialAngle: 0.4 });
  const prop = createEntity('prop', { position: [1, 0, 1], surfaceId: floor.id });
  for (const entity of [floor, wall, door, prop]) scene.layout.entities[entity.id] = entity;
  const { actor, token } = createToken({ name: 'Agente', position: [-0.5, 0, 0.5], surfaceId: floor.id });
  scene.actors[actor.id] = actor;
  scene.tokens[token.id] = token;
  const light = createLight({ position: [0, 2, 0], intensity: 35 });
  scene.look.lights[light.id] = light;
  scene.sessionState.doors[door.id] = 0.75;
  return { scene, floor, wall, door, prop, actor, token, light };
}

function glb(overrides = {}) {
  const binary = Buffer.alloc(36);
  [-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0].forEach((value, index) => binary.writeFloatLE(value, index * 4));
  const json = Buffer.from(JSON.stringify({
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: binary.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: binary.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-0.5, 0, 0], max: [0.5, 1, 0] }],
    ...overrides,
  }));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
  json.copy(padded);
  const header = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), binaryHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + padded.length + 8 + binary.length, 8);
  jsonHeader.writeUInt32LE(padded.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  binaryHeader.writeUInt32LE(binary.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, padded, binaryHeader, binary]);
}

test('local server creates, edits, saves and restores a room after a full restart', async (t) => {
  const f = await fixture(t);
  const { scene, prop, token, light } = smallRoom();
  const health = await f.request('/api/tabletop/health');
  assert.equal(health.status, 200);
  const created = await f.request('/api/tabletop/scenes', { method: 'POST', body: { document: scene } });
  assert.equal(created.status, 201);
  assert.equal(created.value.id, scene.id);
  assert.equal(created.value.revision, 1);
  const edited = structuredClone(created.value);
  edited.layout.entities[prop.id].transform.position = [2, 0, -1];
  edited.layout.entities[prop.id].transform.rotation = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
  edited.tokens[token.id].transform.position = [-1.5, 0, 1.5];
  edited.look.lights[light.id].intensity = 55;
  const saved = await f.request(`/api/tabletop/scenes/${scene.id}`, { method: 'PUT', body: { document: edited, expectedRevision: 1 } });
  assert.equal(saved.status, 200);
  assert.equal(saved.value.revision, 2);
  assert.equal(saved.value.createdAt, created.value.createdAt);
  await f.stop();
  await f.start();
  const loaded = await f.request(`/api/tabletop/scenes/${scene.id}`);
  assert.equal(loaded.status, 200);
  assert.deepEqual(loaded.value, saved.value);
  assert.deepEqual(JSON.parse(await readFile(path.join(f.dataDir, 'scenes', `${scene.id}.json`), 'utf8')), saved.value);
  const list = await f.request('/api/tabletop/scenes');
  assert.equal(list.value.length, 1);
  assert.equal(list.value[0].id, scene.id);
  assert.equal(list.value[0].layout, undefined);
});

test('simultaneous writers serialize: one succeeds and the old revision cannot overwrite', async (t) => {
  const f = await fixture(t);
  const scene = createScene();
  const created = (await f.request('/api/tabletop/scenes', { method: 'POST', body: scene })).value;
  const writes = await Promise.all(['Primeira', 'Segunda'].map((name) => f.request(`/api/tabletop/scenes/${scene.id}`, { method: 'PUT', body: { document: { ...created, name }, expectedRevision: 1 } })));
  assert.deepEqual(writes.map((result) => result.status).sort(), [200, 409]);
  const conflict = writes.find((result) => result.status === 409);
  assert.equal(conflict.value.currentRevision, 2);
  const loaded = await f.request(`/api/tabletop/scenes/${scene.id}`);
  assert.equal(loaded.value.name, writes.find((result) => result.status === 200).value.name);
});

test('duplicate remaps local references, preserves asset identity and delete guards revisions', async (t) => {
  const f = await fixture(t);
  const { scene, floor, wall, door, prop, actor, token } = smallRoom();
  await f.request('/api/tabletop/scenes', { method: 'POST', body: scene });
  const stale = await f.request(`/api/tabletop/scenes/${scene.id}/duplicate`, { method: 'POST', body: { expectedRevision: 7 } });
  assert.equal(stale.status, 409);
  const duplicate = await f.request(`/api/tabletop/scenes/${scene.id}/duplicate`, { method: 'POST', body: { expectedRevision: 1, name: 'Sala copiada' } });
  assert.equal(duplicate.status, 201);
  const copy = duplicate.value;
  assert.notEqual(copy.id, scene.id);
  assert.equal(copy.revision, 1);
  for (const original of [floor, wall, door, prop]) assert.equal(copy.layout.entities[original.id], undefined);
  const copyFloor = Object.values(copy.layout.entities).find((entity) => entity.kind === 'floor');
  const copyWall = Object.values(copy.layout.entities).find((entity) => entity.kind === 'wall');
  const copyDoor = Object.values(copy.layout.entities).find((entity) => entity.kind === 'door');
  const copyProp = Object.values(copy.layout.entities).find((entity) => entity.kind === 'prop');
  assert.equal(copyWall.surfaceId, copyFloor.id);
  assert.equal(copyDoor.wallId, copyWall.id);
  assert.equal(copy.sessionState.doors[copyDoor.id], scene.sessionState.doors[door.id]);
  assert.deepEqual(copyProp.assetRef, prop.assetRef);
  const copyToken = Object.values(copy.tokens)[0];
  assert.notEqual(copyToken.id, token.id);
  assert.notEqual(copyToken.actorId, actor.id);
  assert.ok(copy.actors[copyToken.actorId]);
  assert.equal((await f.request(`/api/tabletop/scenes/${copy.id}`, { method: 'DELETE' })).status, 422);
  assert.equal((await f.request(`/api/tabletop/scenes/${copy.id}?expectedRevision=2`, { method: 'DELETE' })).status, 409);
  assert.equal((await f.request(`/api/tabletop/scenes/${copy.id}?expectedRevision=1`, { method: 'DELETE' })).status, 204);
  assert.equal((await f.request(`/api/tabletop/scenes/${copy.id}`)).status, 404);
  assert.equal((await f.request(`/api/tabletop/scenes/${scene.id}`)).status, 200);
});

test('validation, API misses and origin checks return JSON with useful status codes', async (t) => {
  const f = await fixture(t);
  const scene = createScene();
  assert.equal((await f.request('/api/tabletop/maps', { method: 'POST', body: scene })).status, 422);
  assert.equal((await f.request('/api/tabletop/scenes', { method: 'POST', raw: '{broken', headers: { 'Content-Type': 'application/json' } })).status, 400);
  assert.equal((await f.request('/api/tabletop/scenes/bad-id')).status, 422);
  assert.equal((await f.request('/api/tabletop/scenes', { method: 'POST', body: scene, headers: { Origin: 'https://unrelated.example' } })).status, 403);
  assert.equal((await f.request('/api/tabletop/scenes', { method: 'POST', body: scene, headers: { Origin: 'http://localhost:5173' } })).status, 201);
  assert.equal((await f.request('/api/tabletop/scenes', { method: 'POST', body: scene })).status, 409);
  const mismatch = { ...scene, id: createScene().id };
  assert.equal((await f.request(`/api/tabletop/scenes/${scene.id}`, { method: 'PUT', body: { document: mismatch, expectedRevision: 1 } })).status, 422);
  const absent = await f.request('/api/tabletop/this-does-not-exist');
  assert.equal(absent.status, 404);
  assert.ok(absent.headers.get('Content-Type').includes('application/json'));
  assert.equal(absent.value.error.code, 'API_NOT_FOUND');
  assert.ok((await f.request('/editor-route')).value.includes('<title>Tabletop</title>'));
  const map = createMap();
  assert.equal((await f.request('/api/tabletop/maps', { method: 'POST', body: map })).status, 201);
  assert.equal((await f.request('/api/tabletop/maps')).value[0].id, map.id);
});

test('failure during storage leaves the previously confirmed document intact', async (t) => {
  const f = await fixture(t);
  const created = (await f.request('/api/tabletop/scenes', { method: 'POST', body: createScene('Preservar') })).value;
  await rename(path.join(f.dataDir, 'backups'), path.join(f.dataDir, 'backups-before-failure'));
  await writeFile(path.join(f.dataDir, 'backups'), 'This is deliberately not a directory');
  const failed = await f.request(`/api/tabletop/scenes/${created.id}`, { method: 'PUT', body: { document: { ...created, name: 'Não salvo' }, expectedRevision: 1 } });
  assert.equal(failed.status, 500);
  assert.match(failed.value.error.message, /não foi confirmado/);
  assert.deepEqual((await f.request(`/api/tabletop/scenes/${created.id}`)).value, created);
  assert.equal((await readdir(path.join(f.dataDir, 'scenes'))).filter((name) => name.endsWith('.tmp')).length, 0);
});

test('backups retain the latest five previous revisions', async (t) => {
  const f = await fixture(t);
  let current = (await f.request('/api/tabletop/scenes', { method: 'POST', body: createScene() })).value;
  for (let index = 0; index < 7; index++) {
    const saved = await f.request(`/api/tabletop/scenes/${current.id}`, { method: 'PUT', body: { document: { ...current, name: `Revisão ${index}` }, expectedRevision: current.revision } });
    assert.equal(saved.status, 200);
    current = saved.value;
  }
  const backupDir = path.join(f.dataDir, 'backups', 'scenes', current.id);
  assert.deepEqual((await readdir(backupDir)).sort(), ['3.json', '4.json', '5.json', '6.json', '7.json']);
  assert.equal(JSON.parse(await readFile(path.join(backupDir, '7.json'), 'utf8')).revision, 7);
});

test('assets are separate managed files and remain usable after restart', async (t) => {
  const f = await fixture(t);
  const imported = await f.request('/api/tabletop/assets?name=Retrato', { method: 'POST', raw: png, headers: { 'Content-Type': 'image/png' } });
  assert.equal(imported.status, 201);
  const record = imported.value;
  assert.equal(record.type, 'image');
  assert.equal(record.revision, 1);
  assert.equal(record.byteLength, png.length);
  assert.match(record.hash, /^[0-9a-f]{64}$/);
  assert.deepEqual(await readFile(path.join(f.dataDir, 'assets', record.id, record.fileName)), png);
  const scene = createScene('Retrato persistente');
  const { actor, token } = createToken({ assetRef: { id: record.id, revision: 1 } });
  scene.actors[actor.id] = actor; scene.tokens[token.id] = token;
  const created = await f.request('/api/tabletop/scenes', { method: 'POST', body: scene });
  assert.equal(created.status, 201);
  const serialized = await readFile(path.join(f.dataDir, 'scenes', `${scene.id}.json`), 'utf8');
  assert.ok(!serialized.includes('base64') && !serialized.includes('blob:'));
  await f.stop(); await f.start();
  assert.deepEqual((await f.request(`/api/tabletop/assets/${record.id}`)).value, record);
  const list = (await f.request('/api/tabletop/assets')).value;
  assert.equal(list.length, 2);
  assert.equal((await f.request(record.url)).status, 200);
  assert.equal((await f.request(record.url)).headers.get('Content-Type'), 'image/png');
  const missingScene = createScene();
  const missing = createToken({ assetRef: { id: 'absent-image', revision: 1 } });
  missingScene.actors[missing.actor.id] = missing.actor; missingScene.tokens[missing.token.id] = missing.token;
  assert.equal((await f.request('/api/tabletop/scenes', { method: 'POST', body: missingScene })).status, 422);
  actor.assetRef.revision = 2;
  assert.equal((await f.request(`/api/tabletop/scenes/${scene.id}`, { method: 'PUT', body: { document: scene, expectedRevision: 1 } })).status, 422);
});

test('asset ingestion accepts a static GLB and rejects external dependencies, unsupported extensions, malformed bytes and excess size', async (t) => {
  const f = await fixture(t, { assetLimit: 1024 * 1024 });
  const uploaded = await f.request('/api/tabletop/assets?name=Triangulo', { method: 'POST', raw: glb(), headers: { 'Content-Type': 'model/gltf-binary' } });
  assert.equal(uploaded.status, 201);
  assert.equal(uploaded.value.type, 'model');
  const invalidGLBs = [
    glb({ buffers: [{ byteLength: 36, uri: 'https://example.com/buffer.bin' }] }),
    glb({ images: [{ uri: 'texture.png' }] }),
    glb({ extensionsRequired: ['KHR_draco_mesh_compression'] }),
    glb({ animations: [{}] }),
    glb({ nodes: [{ mesh: 0, children: [0] }] }),
    glb({ accessors: [{ bufferView: 0, componentType: 5126, count: 100, type: 'VEC3' }] }),
    Buffer.from('not a model'),
  ];
  for (const bytes of invalidGLBs) assert.equal((await f.request('/api/tabletop/assets', { method: 'POST', raw: bytes, headers: { 'Content-Type': 'model/gltf-binary' } })).status, 422);
  const corruptPNG = Buffer.from(png);
  corruptPNG[52] ^= 1;
  assert.equal((await f.request('/api/tabletop/assets', { method: 'POST', raw: corruptPNG, headers: { 'Content-Type': 'image/png' } })).status, 422);
  assert.equal((await f.request('/api/tabletop/assets', { method: 'POST', raw: Buffer.from('not png'), headers: { 'Content-Type': 'image/png' } })).status, 422);
  assert.equal((await f.request('/api/tabletop/assets', { method: 'POST', raw: png, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await f.request('/api/tabletop/assets', { method: 'POST', raw: Buffer.alloc(1024 * 1024 + 1), headers: { 'Content-Type': 'image/png' } })).status, 413);
  assert.equal((await f.request('/api/tabletop/assets')).value.length, 2);
});

test('development launcher refuses to reuse an existing backend on its configured port', async (t) => {
  const f = await fixture(t);
  const project = fileURLToPath(new URL('..', import.meta.url));
  const child = spawn(process.execPath, ['scripts/dev.js'], {
    cwd: project,
    env: { ...process.env, TABLETOP_PORT: new URL(f.origin).port, TABLETOP_HOST: '127.0.0.1', TABLETOP_DATA_DIR: path.join(f.dataDir, 'other-instance') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const exitCode = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('Dev launcher did not stop after detecting the occupied backend port.')); }, 8000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code) => { clearTimeout(timer); resolve(code); });
  });
  assert.equal(exitCode, 1);
  assert.match(output, /outra instância/);
  assert.ok(!output.includes('VITE v'));
  assert.equal((await f.request('/api/tabletop/health')).status, 200);
});
