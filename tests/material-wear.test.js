import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { wearDefaults, wearFieldPatch, WEAR_STYLES } from '../src/domain/wear.js';
import { createScene, createEntity, validateDocument, createMapFromScene, createSceneFromMap, duplicateDocument } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { projectPresentation } from '../src/app/presentation.js';
import { copyMaterial } from '../src/domain/material-transfer.js';
import { createSurfaceLibrary, applySurfaceTextures } from '../src/render/surface-materials.js';
import { applyMaterialWear, wearCoordinates } from '../src/render/material-wear.js';
import { disposeObject } from '../src/render/asset-cache.js';

test('wear presets and percentage fields preserve spatial settings and produce bounded JSON materials', () => {
  const w = wearDefaults();
  assert.equal(wearFieldPatch(w, 'amount', 35).amount, .35);
  assert.deepEqual(wearFieldPatch(w, 'center-1', 75).center, [.5,.75,.5]);
  const next = wearFieldPatch({ ...w, seed: 53, placement: 'region', amount: .4 }, 'type', 'rust');
  assert.equal(next.type, 'rust'); assert.equal(next.seed, 53); assert.equal(next.placement, 'region'); assert.equal(next.amount, .4);
  assert.equal(wearFieldPatch(next, 'type', 'none'), null); assert.throws(() => wearDefaults('missing'));
  for (const style of WEAR_STYLES) { const scene = createScene(), entity = createEntity('floor', { material: { wear: wearDefaults(style.id) } }); scene.layout.entities[entity.id] = entity; validateDocument(scene); }
});

test('wear survives history, clipboard, maps and projection; rejects malformed and locked edits atomically', () => {
  const scene = createScene(), source = createEntity('prop', { material: { wear: wearDefaults('moss'), textureSlot: 'wood' } }), target = createEntity('floor'), hidden = createEntity('prop', { audience: 'gm', material: { wear: wearDefaults() } });
  for (const e of [source,target,hidden]) scene.layout.entities[e.id] = e;
  const store = createSceneStore(scene), sample = copyMaterial(source); source.material.wear.center[0] = .9;
  store.execute('material.apply', { targets: [{ id: target.id }], sample }); const saved = structuredClone(store.document);
  assert.deepEqual(saved.layout.entities[target.id].material.wear, sample.settings.wear);
  store.undo(); assert.equal(store.document.layout.entities[target.id].material.wear, undefined); store.redo(); assert.deepEqual(store.document, saved);
  for (const doc of [JSON.parse(JSON.stringify(saved)), duplicateDocument(saved), createSceneFromMap(createMapFromScene(saved))]) { validateDocument(doc); assert.ok(Object.values(doc.layout.entities).some(e => e.material.wear?.type === 'moss')); }
  const projected = projectPresentation(saved); validateDocument(projected); assert.equal(projected.layout.entities[hidden.id], undefined); assert.equal(projected.layout.entities[target.id].material.wear.type, 'moss');
  for (const patch of [{ amount: -1 }, { amount: Infinity }, { enabled: 'yes' }, { center: [0,2,0] }, { center: [0,0] }, { seed: .5 }, { seed: 65536 }, { type: 'missing' }, { placement: 'world' }, { radius: 0 }, { relief: 1 }, { color: 'red' }, { injected: true }]) {
    assert.throws(() => store.execute('entity.update', { id: target.id, patch: { material: { wear: { ...wearDefaults(), ...patch } } } })); assert.deepEqual(store.document, saved);
  }
  store.execute('entity.update', { id: target.id, patch: { locked: true } }); const locked = structuredClone(store.document);
  assert.throws(() => store.execute('material.apply', { targets: [{ id: target.id }], sample })); assert.deepEqual(store.document, locked);
  store.execute('entity.update', { id: target.id, patch: { locked: false } });
  store.execute('material.apply', { targets: [{ id: target.id }], sample: copyMaterial(createEntity('floor')) }); assert.equal(store.document.layout.entities[target.id].material.wear, undefined);
});

test('wear follows object coordinates under rotation and scale, preserves imported maps and named slot isolation', () => {
  const parent = new THREE.Group(), root = new THREE.Group(); parent.add(root);
  const maps = ['map','normalMap','roughnessMap','metalnessMap','emissiveMap'].map(() => new THREE.Texture());
  const material = new THREE.MeshStandardMaterial(); ['map','normalMap','roughnessMap','metalnessMap','emissiveMap'].forEach((k,i) => material[k] = maps[i]); material.name = 'wood';
  const selected = new THREE.Mesh(new THREE.BoxGeometry(2,3,.4), material); selected.position.set(0,1.5,0); root.add(selected);
  const other = new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3), new THREE.MeshStandardMaterial()); other.position.x = 1; other.material.name = 'iron'; root.add(other);
  const a = wearCoordinates(root); parent.position.set(22,7,-18); parent.rotation.set(.4,1.2,.3); root.scale.set(2,.7,1.4); const b = wearCoordinates(root);
  for (const mesh of [selected,other]) a.matrices.get(mesh).elements.forEach((v,i) => assert.ok(Math.abs(v-b.matrices.get(mesh).elements[i]) < 1e-10)); assert.ok(a.extent.distanceTo(b.extent) < 1e-10);
  const library = createSurfaceLibrary();
  try {
    applySurfaceTextures(root, { kind: 'prop', material: { color: '#ffffff', textureSlot: 'wood', wear: wearDefaults() } }, library);
    ['map','normalMap','roughnessMap','metalnessMap','emissiveMap'].forEach((k,i) => assert.equal(material[k], maps[i]));
    assert.equal(material.userData.wear.type, 'grime'); assert.equal(other.material.userData.wear, undefined); assert.equal(library.variantCount, 0);
    const key = material.customProgramCacheKey();
    applyMaterialWear(material, { ...wearDefaults('rust'), seed: 135, amount: .2 }, b, b.matrices.get(selected)); assert.equal(material.customProgramCacheKey(), key, 'uniform changes reuse the program');
    applyMaterialWear(material, { ...wearDefaults(), enabled: false }, b, b.matrices.get(selected)); assert.equal(material.userData.wear, undefined);
  } finally { disposeObject(root); library.dispose(); }
});
