import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SURFACE_MATERIALS, TEXTURE_CHOICES, TEXTURE_DEFAULTS, TEXTURE_PATTERN_FIELDS, TEXTURE_RANGES, surfacePatch, textureFieldPatch } from '../src/domain/materials.js';
import { validateDocument } from '../src/domain/validation.js';
import { generateSurfaceTile, surfaceStyleKey, surfaceReferenceLuma, createLazySurfaceAtlas } from '../src/render/surface-pixels.js';

const families = ['fabric', 'leather', 'plaster', 'tile', 'carpet', 'paint'];

test('every texture family exposes its pattern as editable, validated settings', async () => {
  for (const id of families) assert.ok(SURFACE_MATERIALS.some(p => p.id === id), id);
  // Each pattern field has a default and either a range or a list of choices: nothing is fixed in code.
  for (const [texture, fields] of Object.entries(TEXTURE_PATTERN_FIELDS)) for (const field of fields) {
    assert.ok(field in TEXTURE_DEFAULTS, `${texture}.${field} default`); assert.ok(TEXTURE_RANGES[field] || TEXTURE_CHOICES[field], `${texture}.${field} domain`);
  }
  const scene = JSON.parse(await readFile('public/scenes/casa-de-bairro.json', 'utf8')), floor = Object.values(scene.layout.entities).find(e => e.kind === 'floor');
  const withMaterial = patch => { const next = structuredClone(scene); next.layout.entities[floor.id].material = { ...surfacePatch('tile'), ...patch }; return next; };
  validateDocument(withMaterial({ tilePattern: 'hex', tileCount: 7, tileGrout: .12, tileVariation: 1 }));
  for (const id of families) { const next = structuredClone(scene); next.layout.entities[floor.id].material = surfacePatch(id); validateDocument(next); }
  for (const bad of [{ tilePattern: 'spiral' }, { tileCount: 2.5 }, { tileCount: 17 }, { tileGrout: .3 }, { fabricWeave: 'satin' }, { leatherCreases: 2 }, { plasterFinish: 'brick' }, { paintBase: 'gold' }, { carpetPile: -1 }, { woodAge: 1.5 }])
    assert.throws(() => validateDocument(withMaterial(bad)), JSON.stringify(bad));
  assert.deepEqual(textureFieldPatch({ texture: 'tile' }, 'tileGrout', 8), { tileGrout: .08 }, 'the panel edits grout in percent');
});

test('each setting changes the generated surface, deterministically and without seams', () => {
  const S = 256;
  for (const [texture, fields] of Object.entries(TEXTURE_PATTERN_FIELDS)) {
    const base = generateSurfaceTile({ texture });
    assert.deepEqual(generateSurfaceTile({ texture }), base, `${texture} is deterministic`);
    for (const field of fields) {
      const values = TEXTURE_CHOICES[field] ?? [TEXTURE_RANGES[field][0], TEXTURE_RANGES[field][1]];
      for (const value of values) {
        if (value === TEXTURE_DEFAULTS[field]) continue;
        // Grout width and board count only exist for some layouts; every other value must show.
        const settings = { texture, [field]: value }, tile = generateSurfaceTile(settings);
        assert.notEqual(surfaceStyleKey(settings), surfaceStyleKey({ texture }), `${field} is part of the style key`);
        if (!(texture === 'wood' && ['woodBoards', 'woodGap'].includes(field))) assert.ok(tile.albedo.some((v, i) => v !== base.albedo[i]) || tile.details.some((v, i) => v !== base.details[i]), `${texture}.${field}=${value} changes pixels`);
      }
    }
  }
  for (const texture of families) {
    // A tile repeats: the step across its edge is no larger than between neighbouring texels inside.
    const { details } = generateSurfaceTile({ texture }); let seam = 0, inner = 0;
    for (let y = 0; y < S; y++) { seam += Math.abs(details[(y * S + S - 1) * 4] - details[y * S * 4]); inner += Math.abs(details[(y * S + 128) * 4] - details[(y * S + 127) * 4]); }
    assert.ok(seam <= inner * 2 + S, `${texture} tiles horizontally (${seam} vs ${inner})`);
  }
});

test('recolouring leaves grout, chipped paint and peeled plaster in their own colour', () => {
  const alpha = tile => { let none = 0, full = 0; for (let i = 3; i < tile.albedo.length; i += 4) { if (tile.albedo[i] === 0) none++; else if (tile.albedo[i] === 255) full++; } return { none: none / 65536, full: full / 65536 }; };
  for (const texture of ['wood', 'stone', 'metal', 'fabric', 'leather', 'carpet']) assert.equal(alpha(generateSurfaceTile({ texture })).full, 1, `${texture} is recoloured everywhere`);
  const grid = alpha(generateSurfaceTile({ texture: 'tile', tileGrout: .1 })), checker = alpha(generateSurfaceTile({ texture: 'tile', tilePattern: 'checker', tileGrout: .1 }));
  assert.ok(grid.none > .1 && grid.none < .35 && grid.full > .6); assert.ok(checker.none > grid.none + .3, 'the dark half of a checker keeps its tone');
  assert.equal(alpha(generateSurfaceTile({ texture: 'tile', tileGrout: 0 })).full, 1);
  const chipped = alpha(generateSurfaceTile({ texture: 'paint', paintChips: .8 })), intact = alpha(generateSurfaceTile({ texture: 'paint', paintChips: 0 }));
  assert.ok(chipped.none > .15); assert.equal(intact.full, 1);
  assert.ok(alpha(generateSurfaceTile({ texture: 'plaster', plasterFinish: 'peeling', plasterDamage: .8 })).none > .1);
  // Bare metal under the paint is the only metallic part of the tile.
  const metal = generateSurfaceTile({ texture: 'paint', paintChips: .8, paintBase: 'metal' }), rust = generateSurfaceTile({ texture: 'paint', paintChips: .8, paintBase: 'rust' });
  let metallic = 0; for (let i = 0; i < 65536; i++) if (metal.details[i * 4 + 2] > 200) { metallic++; assert.ok(metal.albedo[i * 4 + 3] < 128, "metallic texels are chips"); }
  assert.ok(metallic > 6000); assert.ok(rust.details.every((v, i) => i % 4 !== 2 || v === 0));
  // The reference brightness used for recolouring ignores what is not recoloured.
  assert.ok(surfaceReferenceLuma({ texture: 'tile', tilePattern: 'checker' }) > surfaceReferenceLuma({ texture: 'tile' }) * .9);
});

test('the default atlas is filled one preset at a time', () => {
  const atlas = createLazySurfaceAtlas(), size = 256 * 256 * 4, index = SURFACE_MATERIALS.findIndex(p => p.id === 'fabric');
  assert.equal(atlas.rows, SURFACE_MATERIALS.length); assert.ok(atlas.albedo.every(v => v === 0));
  assert.equal(atlas.ensure(index), true); assert.equal(atlas.ensure(index), false); assert.equal(atlas.ensure(-1), false);
  assert.deepEqual(atlas.albedo.slice(index * size, (index + 1) * size), generateSurfaceTile({ texture: 'fabric' }).albedo);
  assert.ok(atlas.albedo.slice(0, index * size).every(v => v === 0), 'other presets are not generated');
});

test('the material panel offers a control for every pattern setting of the chosen texture', async () => {
  const { textureCustomization, textureSelect } = await import('../src/ui/material-panels.js');
  const helpers = { numberField: (field, label, value, { min, max }) => `<input data-field="${field}" value="${value}" min="${min}" max="${max}">`, colorField: field => `<input data-field="${field}">` };
  for (const { id } of SURFACE_MATERIALS) assert.match(textureSelect('material-texture', id), new RegExp(`value="${id}" selected`));
  for (const [texture, fields] of Object.entries(TEXTURE_PATTERN_FIELDS)) {
    const html = textureCustomization('material-', surfacePatch(texture), helpers);
    for (const field of fields) {
      // Board count and joint width belong to planked wood only.
      assert.ok(html.includes(`data-field="material-${field}"`), `${texture}: ${field}`);
      for (const choice of TEXTURE_CHOICES[field] ?? []) assert.ok(html.includes(`value="${choice}"`), `${texture}: ${field}=${choice}`);
    }
    for (const [other, otherFields] of Object.entries(TEXTURE_PATTERN_FIELDS)) if (other !== texture) for (const field of otherFields) assert.ok(!html.includes(`data-field="material-${field}"`), `${texture} does not show ${field}`);
  }
  // Percent fields show what the document stores as a fraction.
  assert.match(textureCustomization('material-', { ...surfacePatch('tile'), tileGrout: .08 }, helpers), /data-field="material-tileGrout" value="8"/);
});
