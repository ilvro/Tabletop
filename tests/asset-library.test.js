import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { filterAssets, catalogFacets, validateAssetMetadata } from '../src/domain/asset-library.js';
import { recipeInstance, disposeObject } from '../src/render/asset-cache.js';

const publicRoot = new URL('../public/', import.meta.url);
const { assets } = JSON.parse(await readFile(new URL('assets/catalog.json', publicRoot), 'utf8'));

test('expanded catalog resolves every local model and preview with metric bounds and valid support heights', async () => {
  assert.ok(assets.length >= 127);
  assert.equal(new Set(assets.map(asset => asset.id)).size, assets.length);
  const facets = catalogFacets(assets);
  assert.ok(facets.eras.length >= 6); assert.ok(facets.contexts.length >= 20);
  for (const asset of assets) {
    assert.ok(asset.tags.length && asset.contexts.length && asset.era, asset.id);
    const recipe = JSON.parse(await readFile(new URL(asset.url.slice(1), publicRoot), 'utf8'));
    assert.equal(recipe.unit, 'meter'); assert.equal(recipe.pivot, 'base-center');
    assert.ok(recipe.parts.length > 1 && recipe.parts.length <= 200, asset.id);
    const preview = await readFile(new URL(asset.previewUrl.slice(1), publicRoot), 'utf8');
    assert.match(preview, /<svg/); assert.doesNotMatch(preview, /NaN|Infinity/);
    const object = recipeInstance(recipe);
    try {
      const bounds = new THREE.Box3().setFromObject(object), size = bounds.getSize(new THREE.Vector3());
      assert.ok([size.x, size.y, size.z].every(n => Number.isFinite(n) && n > 0), asset.id);
      assert.ok(Math.abs(bounds.min.y) < .001, `${asset.id} base pivot`);
      assert.ok(size.x <= asset.footprint[0] + .001 && size.z <= asset.footprint[1] + .001, `${asset.id} footprint`);
      if (asset.supportHeight) assert.ok(asset.supportHeight <= bounds.max.y + .001 && asset.supportHeight > 0, `${asset.id} support`);
    } finally { disposeObject(object); }
  }
});

test('search ignores accents, combines words and intersects thematic tags, hierarchy, era, context and favorites', () => {
  assert.ok(filterAssets(assets, { search: 'MICROSCOPIO pesquisa' }).some(a => a.id === 'builtin-microscope'));
  assert.ok(filterAssets(assets, { category: 'Saúde', context: 'Hospital', tags: ['sangue'], era: 'Contemporânea' }).some(a => a.id === 'builtin-gurney'));
  assert.ok(filterAssets(assets, { tags: ['ritual', 'conhecimento'] }).some(a => a.id === 'builtin-ritual-circle'));
  assert.equal(filterAssets(assets, { tags: ['ritual', 'inexistente'] }).length, 0);
  assert.equal(filterAssets(assets, { favorites: true }).length, 0);
  assert.equal(filterAssets([{ ...assets[0], favorite: true }, assets[1]], { favorites: true }).length, 1);
});

test('metadata rejects unsupported fields, unbounded or malformed labels and deduplicates accents and case', () => {
  assert.deepEqual(validateAssetMetadata({ tags: [' Investigação ', 'investigacao', 'Pista'], contexts: [], favorite: false }), { tags: ['Investigação', 'Pista'], contexts: [], favorite: false });
  for (const patch of [null, [], {}, { url: 'x' }, { revision: 2 }, { tags: 'sangue' }, { tags: Array(33).fill('x') }, { tags: ['x'.repeat(61)] }, { contexts: [42] }, { era: '' }, { category: 'x'.repeat(81) }, { favorite: 'true' }]) assert.throws(() => validateAssetMetadata(patch));
});
