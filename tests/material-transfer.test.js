import test from 'node:test';
import assert from 'node:assert/strict';
import { copyMaterial } from '../src/domain/material-transfer.js';
import { createScene, createEntity, createToken, createMapFromScene, createSceneFromMap, duplicateDocument, validateDocument } from '../src/domain/documents.js';
import { surfacePatch, coverageDefaults, distributionOptions } from '../src/domain/materials.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { projectPresentation } from '../src/app/presentation.js';
import { supportHeightAt } from '../src/domain/geometry.js';

const style = () => ({ ...surfacePatch('wood'), textureColor: '#643b20', textureColorMode: 'replace', textureBrightness: .6, woodPattern: 'parquet', woodBoards: 8, textureSeed: 123,
  coverage: { ...coverageDefaults(), snowStyle: 'organic', snowDrift: .6, snowDriftScale: 2, snowWindDirection: 45, physicalThickness: .2 } });
function setup(...entities) {
  const scene = createScene();
  for (const entity of entities) scene.layout.entities[entity.id] = entity;
  return createSceneStore(scene);
}

test('material snapshots are independent; paste replaces optional settings and keeps destination slot, identity and geometry', () => {
  const source = createEntity('prop', { material: { ...style(), textureSlot: 'wood' } });
  const target = createEntity('prop', { material: { ...surfacePatch('metal'), textureSlot: 'metal', emissive: '#ff0000', emissiveIntensity: 2 }, position: [2, 0, 3] });
  const sample = copyMaterial(source), store = setup(source, target), before = structuredClone(store.document);
  source.material.coverage.amount = .1;
  assert.equal(sample.settings.coverage.amount, 1);
  store.execute('material.apply', { targets: [{ id: target.id }], sample });
  const result = store.document.layout.entities[target.id];
  assert.deepEqual(result.material, { ...style(), textureSlot: 'metal' });
  assert.deepEqual({ ...result, material: before.layout.entities[target.id].material }, before.layout.entities[target.id]);
  store.undo(); assert.deepEqual(store.document, before);
  store.redo(); assert.deepEqual(store.document.layout.entities[target.id].material, result.material);
  store.execute('material.apply', { targets: [{ id: target.id }], sample: copyMaterial(createEntity('floor')) });
  assert.equal(store.document.layout.entities[target.id].material.coverage, undefined);
  assert.equal(store.document.layout.entities[target.id].material.textureSeed, undefined);
});

test('paste into terrain layers keeps their mask, distribution, identity, order and geometry; layer to base uses valid material defaults', () => {
  const source = createEntity('floor', { material: style() }), terrain = createEntity('terrain', { segments: 4 });
  const layer = terrain.paintLayers[0];
  Object.assign(layer, { texture: 'metal', opacity: .6, distribution: { ...distributionOptions(), mode: 'top' }, weights: layer.weights.map((_, index) => index / 25) });
  const beforeLayer = structuredClone(layer), store = setup(source, terrain), layerId = layer.id;
  store.execute('material.apply', { targets: [{ id: terrain.id, layerId }], sample: copyMaterial(source) });
  const result = store.document.layout.entities[terrain.id];
  for (const field of ['id', 'name', 'weights', 'opacity', 'visible', 'distribution']) assert.deepEqual(result.paintLayers[0][field], beforeLayer[field]);
  assert.equal(result.paintLayers[0].woodPattern, 'parquet');
  for (const field of ['coverage', 'roughness', 'metalness', 'relief', 'textureSlot']) assert.equal(result.paintLayers[0][field], undefined);
  assert.deepEqual(result.material, terrain.material); assert.deepEqual(result.heights, terrain.heights);
  const sample = copyMaterial(result, layerId);
  store.execute('material.apply', { targets: [{ id: source.id }], sample });
  const material = store.document.layout.entities[source.id].material;
  assert.equal(material.texture, 'wood'); assert.equal(material.woodBoards, 8); assert.equal(material.roughness, surfacePatch('wood').roughness);
  assert.equal(material.coverage, undefined); assert.equal(material.weights, undefined);
  assert.throws(() => copyMaterial(terrain, 'missing'));
});

test('multi-target paste is one undo, rejects locked dependencies and malformed settings without partial writes', () => {
  const first = createEntity('floor'), second = createEntity('floor', { locked: true }), store = setup(first, second), before = structuredClone(store.document);
  const targets = [{ id: first.id }, { id: second.id }], sample = copyMaterial(createEntity('floor', { material: style() }));
  assert.throws(() => store.execute('material.apply', { targets, sample }), /bloqueado/); assert.deepEqual(store.document, before);
  store.execute('entity.update', { id: second.id, patch: { locked: false } });
  const unlocked = structuredClone(store.document);
  store.execute('material.apply', { targets, sample });
  store.undo(); assert.deepEqual(store.document, unlocked); store.redo();
  const pasted = structuredClone(store.document);
  for (const payload of [{ targets, sample: { type: 'material', settings: { ...style(), roughness: 2 } } }, { targets: [{ id: first.id }, { id: 'missing' }], sample }, { targets: [{ id: first.id, layerId: 'missing' }], sample }, { targets: [{ id: first.id }, { id: first.id }], sample }]) {
    assert.throws(() => store.execute('material.apply', payload)); assert.deepEqual(store.document, pasted);
  }
  const wall = createEntity('wall', { locked: true }), door = createEntity('door', { wallId: wall.id });
  const hosted = setup(wall, door);
  assert.throws(() => hosted.execute('material.apply', { targets: [{ id: door.id }], sample }), /bloqueado/);
});

test('copied snow updates terrain support and survives JSON, maps, duplication and public projection', () => {
  const terrain = createEntity('terrain', { segments: 4 }), scene = createScene();
  scene.layout.entities[terrain.id] = terrain;
  const { actor, token } = createToken({ surfaceId: terrain.id, position: [0, 0, 0] }); scene.actors[actor.id] = actor; scene.tokens[token.id] = token;
  const store = createSceneStore(scene), before = structuredClone(store.document);
  const snowy = style(); snowy.coverage.exposedOnly = false;
  store.execute('material.apply', { targets: [{ id: terrain.id }], sample: copyMaterial(createEntity('floor', { material: snowy })) });
  const result = store.document.layout.entities[terrain.id];
  assert.equal(store.document.tokens[token.id].transform.position[1], supportHeightAt(result, [0, 0, 0]));
  assert.ok(store.document.tokens[token.id].transform.position[1] > 0);
  for (const doc of [JSON.parse(JSON.stringify(store.document)), duplicateDocument(store.document), createSceneFromMap(createMapFromScene(store.document)), projectPresentation(store.document)]) {
    validateDocument(doc); assert.ok(Object.values(doc.layout.entities).some(entity => entity.material.coverage?.physicalThickness === .2));
  }
  store.undo(); assert.deepEqual(store.document, before);
});
