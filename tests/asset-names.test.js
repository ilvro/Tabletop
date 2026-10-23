import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LESSONS } from '../src/tutorial/lessons.js';
import { filterAssets, normalizeSearch } from '../src/domain/asset-library.js';

const { assets } = JSON.parse(await readFile('public/assets/catalog.json', 'utf8'));
const KIT_PREFIX = /^(Igreja|Nórdico|Templo|Backrooms|Casa|Medieval|Futurista|Industrial) · /;
const ENGLISH_TAGS = new Set(['roof', 'range', 'washer', 'counter', 'plant', 'ceiling-lamp', 'curtain', 'place-setting', 'tile-floor', 'wallpaper', 'ceiling', 'fluorescent']);
const checks = done => (Array.isArray(done?.[0]) ? done : [done]);

test('asset names name the object; the kit lives in category and tags', () => {
  assert.equal(new Set(assets.map(asset => normalizeSearch(asset.name))).size, assets.length, 'unique names');
  for (const asset of assets) {
    assert.equal(asset.name, asset.name.trim(), asset.id);
    assert.match(asset.name, /^[\p{Lu}\d]/u, `${asset.id} starts with a capital`);
    // "Objeto · detalhe": the head before the dot is the object, never a kit label.
    assert.doesNotMatch(asset.name, KIT_PREFIX, `${asset.id} has a kit prefix`);
    for (const tag of asset.tags) assert.ok(!ENGLISH_TAGS.has(tag), `${asset.id} tag "${tag}"`);
  }
});

test('preset scenes label props with the current catalog name', async () => {
  // Scenes may give a prop its own label ("Templo · portal de entrada"); a stale catalog label is
  // the old "Kit · objeto" form of a name the catalog now spells without the kit.
  const current = new Set(assets.map(asset => normalizeSearch(asset.name)));
  for (const file of ['backrooms', 'casa-de-bairro', 'igreja-antiga', 'templo-gelado', 'snowy-mountain-pass']) {
    const scene = JSON.parse(await readFile(`public/scenes/${file}.json`, 'utf8'));
    for (const entity of Object.values(scene.layout.entities)) {
      if (entity.kind !== 'prop' || !KIT_PREFIX.test(entity.name ?? '')) continue;
      assert.ok(!current.has(normalizeSearch(entity.name.replace(KIT_PREFIX, ''))), `${file}: ${entity.name}`);
    }
  }
});

test('tutorial steps find and name assets as the library shows them', () => {
  let searched = 0, picked = 0;
  for (const lesson of LESSONS) for (const step of lesson.steps) for (const [condition, id] of checks(step.done)) {
    if (condition === 'assetListed') {
      const word = [step.act].flat(2).find((value, i, all) => all[i - 1] === '#asset-search');
      const index = filterAssets(assets, { search: word }).findIndex(asset => asset.id === id);
      // The first page of the library shows 24 cards.
      assert.ok(index >= 0 && index < 24, `${lesson.id}: "${word}" lists ${id}`);
      searched++;
    }
    if (condition === 'placingAsset' && /Clique em <b>/.test(step.say)) {
      const asset = assets.find(item => item.id === id);
      assert.ok(asset, `${lesson.id}: ${id} exists`);
      assert.equal(step.say.match(/<b>(.*?)<\/b>/)[1], asset.name, `${lesson.id}: card label for ${id}`);
      picked++;
    }
  }
  assert.ok(searched > 10 && picked > 10);
});
