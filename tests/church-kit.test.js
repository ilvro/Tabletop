import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createProfileGeometry } from '../src/render/architectural-primitives.js';
import { recipeInstance, disposeObject, standardMaterial } from '../src/render/asset-cache.js';
import { createScene, createEntity, validateDocument, duplicateDocument, createMapFromScene, createSceneFromMap } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { projectPresentation } from '../src/app/presentation.js';
import { filterAssets } from '../src/domain/asset-library.js';

const catalog = JSON.parse(await readFile('public/assets/catalog.json', 'utf8')).assets;
const kit = catalog.filter(a => a.tags.includes('igreja antiga'));
const load = async id => {
  const asset = kit.find(a => a.id === `builtin-church-${id}`);
  assert.ok(asset, id);
  return { asset, object: recipeInstance(JSON.parse(await readFile(`public${asset.url}`, 'utf8'))) };
};
const ray = (object, origin, direction) => { object.updateMatrixWorld(true); return new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction)).intersectObject(object, true); };

test('architectural profiles are solid extrusions with outward normals and reject malformed silhouettes before allocation', () => {
  const options = { contour: [[-2, 0], [2, 0], [2, 3], [0, 4], [-2, 3]], depth: .4 };
  for (const contour of [options.contour, [...options.contour].reverse()]) {
    const geometry = createProfileGeometry({ ...options, contour });
    try {
      const p = geometry.attributes.position, n = geometry.attributes.normal; let volume = 0;
      assert.ok(p.array.every(Number.isFinite)); assert.ok(n.array.every(Number.isFinite));
      for (let i = 0; i < p.count; i += 3) {
        const [a, b, c] = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, i + j));
        const normal = b.clone().sub(a).cross(c.clone().sub(a));
        assert.ok(normal.length() > 1e-8); assert.ok(normal.dot(new THREE.Vector3().fromBufferAttribute(n, i)) > 0);
        volume += a.dot(b.clone().cross(c)) / 6;
      }
      assert.ok(Math.abs(volume - 5.6) < 1e-5); assert.equal(geometry.attributes.uv.count, p.count);
    } finally { geometry.dispose(); }
  }
  for (const patch of [{ depth: 0 }, { depth: Infinity }, { depth: 31 }, { contour: [[0, 0], [1, 1], [0, 1], [1, 0]] }, { contour: [[0, 0], [0, 0], [1, 1]] }, { contour: [[0, 0], [1, 0], [NaN, 1]] }, { contour: [[0, 0], [1, 0], [101, 1]] }]) assert.throws(() => createProfileGeometry({ ...options, ...patch }));
});

test('church catalog models have finite metric geometry, bounded batches, compact previews and isolated materials', async () => {
  assert.equal(kit.length, 18);
  assert.equal(filterAssets(catalog, { search: 'igreja antiga' }).length, 18);
  for (const asset of kit) {
    const { object } = await load(asset.id.slice('builtin-church-'.length));
    try {
      const bounds = new THREE.Box3().setFromObject(object), size = bounds.getSize(new THREE.Vector3());
      assert.ok(Math.abs(bounds.min.y) < 1e-6, asset.id);
      assert.ok(Math.abs(bounds.min.x + bounds.max.x) < 1e-6 && Math.abs(bounds.min.z + bounds.max.z) < 1e-6);
      assert.ok(size.x <= asset.footprint[0] + .001 && size.z <= asset.footprint[1] + .001);
      let triangles = 0;
      assert.ok(object.children.length <= 5, `${asset.id}: batches ${object.children.length}`);
      object.traverse(m => { if (m.isMesh) {
        const p = m.geometry.attributes.position;
        assert.ok(p.array.every(Number.isFinite), asset.id);
        assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));
        assert.equal(m.geometry.attributes.normal.count, p.count); assert.equal(m.geometry.attributes.uv.count, p.count);
        triangles += (m.geometry.index?.count ?? p.count) / 3;
      } });
      assert.ok(triangles > 0 && triangles < 18000, `${asset.id}: ${triangles} triangles`);
      const preview = await readFile(`public${asset.previewUrl}`, 'utf8');
      assert.match(preview, /data:image\/png;base64/); assert.ok(Buffer.byteLength(preview) < 100000);
    } finally { disposeObject(object); }
  }
});

test('arcades, balcony and roof retain real openings; ritual silhouettes and table support are geometric', async () => {
  const defaultMaterial = standardMaterial();
  try { assert.equal(defaultMaterial.opacity, 1); assert.equal(defaultMaterial.transparent, false); assert.equal(defaultMaterial.depthWrite, true); } finally { defaultMaterial.dispose(); }
  const { object: window } = await load('stained-window');
  try { const glass = window.children.find(m => m.userData.materialSlot === 'glass'); assert.equal(glass.material.opacity, .72); assert.equal(glass.material.transparent, true); assert.equal(glass.material.depthWrite, false); assert.equal(glass.castShadow, false); } finally { disposeObject(window); }
  for (const id of ['round-arcade', 'pointed-arch']) {
    const { object } = await load(id);
    try { assert.equal(ray(object, [0, 1, 10], [0, 0, -1]).length, 0); assert.ok(ray(object, [id === 'round-arcade' ? 1.95 : 1.6, 1, 10], [0, 0, -1]).length); } finally { disposeObject(object); }
  }
  const { asset: balconyAsset, object: balcony } = await load('curved-balcony');
  try { assert.ok(Math.abs(ray(balcony, [0, 4, 0], [0, -1, 0])[0].point.y - 1.14) < 1e-5); assert.equal(balconyAsset.supportHeight, undefined, 'curved slab must not claim rectangular support'); } finally { disposeObject(balcony); }
  const { asset: tableAsset, object: table } = await load('banquet-table');
  try { assert.ok(Math.abs(ray(table, [0, 4, 0], [0, -1, 0])[0].point.y - tableAsset.supportHeight) < 1e-5); } finally { disposeObject(table); }
  const { object: roof } = await load('roof-shell');
  try { assert.equal(ray(roof, [0, 2, 10], [0, 0, -1]).length, 0); assert.ok(ray(roof, [0, 12, 0], [0, -1, 0]).length); } finally { disposeObject(roof); }
  const { object: tower } = await load('bell-tower');
  try { for (const [origin, direction] of [[[0, 5.2, 10], [0, 0, -1]], [[10, 5.2, 0], [-1, 0, 0]]]) assert.equal(ray(tower, origin, direction).length, 0, 'bell openings connect through tower'); } finally { disposeObject(tower); }
  const { object: seraph } = await load('headless-seraph');
  try { assert.equal(ray(seraph, [0, 4.2, 10], [0, 0, -1]).length, 0, 'no head'); assert.ok(ray(seraph, [1.8, 4.2, 10], [0, 0, -1]).length, 'wing'); } finally { disposeObject(seraph); }
  const { object: maiden } = await load('iron-maiden');
  try { const hit = ray(maiden, [0, 1.7, 0], [0, -1, 0])[0]; assert.ok(hit && hit.point.y < .5, 'open interior reaches base'); } finally { disposeObject(maiden); }
});

test('church props and named materials survive history, JSON, maps and filtered projection', () => {
  const scene = createScene(), asset = kit.find(a => a.id === 'builtin-church-banquet-table');
  const entity = createEntity('prop', { assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint, supportHeight: asset.supportHeight });
  scene.layout.entities[entity.id] = entity;
  const store = createSceneStore(scene);
  store.execute('entity.update', { id: entity.id, patch: { material: { ...entity.material, textureSlot: 'wood', texture: 'wood', textureBrightness: .6 } } });
  store.undo(); assert.deepEqual(store.document, scene); store.redo();
  for (const doc of [JSON.parse(JSON.stringify(store.document)), duplicateDocument(store.document), createSceneFromMap(createMapFromScene(store.document)), projectPresentation(store.document)]) {
    validateDocument(doc); const prop = Object.values(doc.layout.entities)[0]; assert.equal(prop.assetRef.id, asset.id); assert.equal(prop.material.textureSlot, 'wood'); assert.equal(prop.supportHeight, asset.supportHeight);
  }
});
