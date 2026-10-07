import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createScene, createEntity } from '../src/domain/documents.js';
import { createExamplePreviewCache } from '../src/data/example-preview-cache.js';
import { EXAMPLE_SCENES, readExampleScene } from '../src/data/example-scenes.js';
import { createScenePreviews } from '../src/app/scene-previews.js';

test('bundled scenes contain editable JSON with no pre-rendered cover dependency', async () => {
  const files = await readdir('public/scenes');
  assert.ok(files.every(file => !/\.(jpg|jpeg|png|webp)$/i.test(file)));
  for (const example of EXAMPLE_SCENES) {
    assert.equal(example.preview, undefined);
    const original = JSON.parse(await readFile(`public/${example.file}`, 'utf8'));
    const read = await readExampleScene(example.id, { fetcher: async () => ({ ok: true, json: async () => original }) });
    assert.equal(read, original);
  }
});

test('derived example cache detects content and asset changes without requiring a new revision', async () => {
  const cache = createExamplePreviewCache({ databaseFactory: null }), scene = createScene('Origem');
  const example = EXAMPLE_SCENES[0], assets = [{ id: 'a', revision: 1, url: '/a.json' }];
  const key = await cache.key(example, scene, assets);
  assert.equal(await cache.key(example, structuredClone(scene), assets), key);
  assert.notEqual(await cache.key(example, { ...scene, name: 'Mudou' }, assets), key);
  assert.notEqual(await cache.key(example, scene, [{ ...assets[0], revision: 2 }]), key);
  await cache.write(key, 'data:image/jpeg;base64,/9j/2Q==');
  assert.equal(await cache.read(key), null, 'storage unavailable does not block rendering');
});

test('visible examples share the bounded preview queue, reuse cache and cancel without personal writes', async t => {
  const scene = createScene('Atual'), loaded = [], rendered = [], persisted = new Map(), errors = [];
  let release, started;
  const startedPromise = new Promise(resolve => { started = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  const previews = createScenePreviews({
    viewport: {}, repository: {}, current: () => ({ document: scene }), assets: () => [],
    loadExample: async id => { loaded.push(id); return { ...scene, name: id }; },
    exampleCache: { key: async example => example.id, read: async key => persisted.get(key), write: async (key, image) => persisted.set(key, image) },
    renderPreview: async doc => { rendered.push(doc.name); if (doc.name === 'blocked') { started(); return blocked; } return `image:${doc.name}`; },
    onUpdate: () => {}, onError: error => errors.push(error),
  });
  t.after(() => previews.dispose());
  const wait = async predicate => { for (let i = 0; i < 100 && !predicate(); i++) await new Promise(resolve => setTimeout(resolve, 10)); assert.ok(predicate()); };
  persisted.set('cached', 'stored-image');
  const examples = ['new', 'cached'].map(id => ({ id }));
  previews.ensureExamples(examples); previews.ensureExamples(examples);
  await wait(() => examples.every(example => previews.exampleImage(example)));
  assert.deepEqual(loaded, ['new', 'cached']); assert.deepEqual(rendered, ['new']);
  assert.equal(previews.exampleImage(examples[1]), 'stored-image');
  previews.ensureExamples([{ id: 'blocked' }, { id: 'cancelled' }]);
  await startedPromise; previews.cancelLibrary(); release('obsolete-image');
  await wait(() => !previews.info().running);
  assert.equal(previews.exampleImage({ id: 'blocked' }), undefined);
  assert.equal(loaded.includes('cancelled'), false); assert.deepEqual(errors, []);
});

test('immutable command snapshots preserve JSON numeric roundtrips including negative zero', async () => {
  const { createSceneStore } = await import('../src/state/scene-store.js');
  const store = createSceneStore(createScene('Persistência'));
  store.execute('entity.add', { entity: createEntity('floor', { position: [-0, 0, -0] }) });
  const entity = Object.values(store.document.layout.entities)[0];
  store.execute('entity.update', { id: entity.id, patch: { transform: { ...entity.transform, rotation: [0, -0, 0, 1] } }, snap: false });
  assert.deepEqual(store.document, JSON.parse(JSON.stringify(store.document)));
  store.dispose();
});

test('saving the current cover interrupts a slow example and resumes it afterwards', async t => {
  const scene = { ...createScene('Atual'), revision: 1 }, order = [];
  let started, attempts = 0;
  const firstStarted = new Promise(resolve => { started = resolve; });
  const previews = createScenePreviews({
    current: () => ({ document: scene, version: 1, dirty: false }), assets: () => [],
    viewport: { ready: async () => {}, captureThumbnail: () => { order.push('current'); return 'current-cover'; } },
    repository: { savePreview: async () => {} },
    exampleCache: { key: async () => 'example', read: async () => null, write: async () => {} },
    loadExample: async () => scene,
    renderPreview: async (_doc, _assets, signal) => {
      order.push('example'); attempts++;
      if (attempts > 1) return 'example-cover';
      started(); return new Promise(resolve => signal.addEventListener('abort', () => resolve(null), { once: true }));
    }, onUpdate: () => {}, onError: error => { throw error; },
  });
  t.after(() => previews.dispose());
  previews.ensureExamples([{ id: 'slow' }]); await firstStarted;
  await previews.saved(scene, 1);
  for (let i = 0; i < 20 && !previews.exampleImage({ id: 'slow' }); i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(order, ['example', 'current', 'example']);
  assert.equal(previews.exampleImage({ id: 'slow' }), 'example-cover');
});

test('scrolling to a saved card promotes it ahead of a full background queue', async t => {
  const scene=createScene('Mesa'),docs=Array.from({length:200},(_,i)=>({...createScene(`Cena ${i}`),revision:1}));
  let release,started;const firstStarted=new Promise(resolve=>{started=resolve;}),blocked=new Promise(resolve=>{release=resolve;}),order=[];
  const previews=createScenePreviews({current:()=>({document:scene}),assets:()=>[],viewport:{},
    repository:{read:async id=>docs.find(doc=>doc.id===id),savePreview:async()=>{}},
    renderPreview:async doc=>{order.push(doc.id);if(order.length===1){started();await blocked;}return 'cover';},onUpdate(){},onError(error){throw error;}});
  t.after(()=>previews.dispose());previews.ensure(docs);await firstStarted;
  previews.ensure([docs[199]],{visibleIds:new Set([docs[199].id])});
  assert.ok(previews.info().queued<=32);release();
  for(let i=0;i<20&&order.length<2;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(order[1],docs[199].id);previews.cancelLibrary();
});
