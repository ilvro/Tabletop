import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { wearEdgeGeometry, supportsWearEdges } from '../src/render/wear-edges.js';
import { craftedBox } from '../src/render/crafted-geometry.js';
import { WEAR_PLACEMENTS, WEAR_STYLES, wearDefaults, wearFieldPatch } from '../src/domain/wear.js';
import { validateDocument } from '../src/domain/validation.js';
import { wearPanel } from '../src/ui/material-panels.js';

// Interpolated edge distance at a point of a triangle, as the fragment shader sees it.
function distanceAt(geometry, triangle, weights) {
  const d = geometry.attributes.wearEdge, lines = [0, 1, 2, 3].map(n => [0, 1, 2].reduce((sum, k) => sum + weights[k] * (d.array[(triangle * 3 + k) * 4 + n] - 1), 0));
  return Math.min(...lines.map(Math.abs));
}

test('edge wear geometry gives every point of a face its distance to the nearest hard edge', () => {
  const source = new THREE.BoxGeometry(2, 1, .6), geometry = wearEdgeGeometry(source), p = geometry.attributes.position;
  assert.equal(geometry.index, null); assert.equal(p.count, 36); assert.equal(wearEdgeGeometry(source), geometry, 'cached per source geometry');
  for (let t = 0; t < 12; t++) {
    const corners = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(p, t * 3 + k));
    for (const weights of [[1 / 3, 1 / 3, 1 / 3], [.8, .1, .1], [.1, .1, .8], [.5, .5, 0], [.05, .9, .05]]) {
      const point = new THREE.Vector3(); corners.forEach((c, k) => point.addScaledVector(c, weights[k]));
      // On a box the nearest edge is where the second-largest |coordinate - half size| margin vanishes.
      const margins = [1 - Math.abs(point.x), .5 - Math.abs(point.y), .3 - Math.abs(point.z)].sort((a, b) => a - b);
      assert.ok(Math.abs(distanceAt(geometry, t, weights) - margins[1]) < 1e-5, `triangle ${t} at ${weights}`);
    }
  }
  // Stored with an offset of one, so that a missing attribute (zeros) means "no data".
  assert.ok(geometry.attributes.wearEdge.array.every(v => v >= 1));
});

test('chamfers, smooth surfaces and protected meshes are handled without inventing edges', () => {
  const chamfered = wearEdgeGeometry(craftedBox({ size: [1, 1, 1], bevel: .05 })), d = chamfered.attributes.wearEdge.array;
  assert.ok(d.some(v => Math.abs(v - 1) < 1e-6), 'chamfer strips lie on creases');
  // A sphere has no crease: no vertex is near an edge.
  const sphere = wearEdgeGeometry(new THREE.SphereGeometry(1, 24, 16)); assert.ok(sphere.attributes.wearEdge.array.every(v => v > 100));
  // An open sheet wears along its border.
  const plane = wearEdgeGeometry(new THREE.PlaneGeometry(2, 2)); assert.ok(Math.abs(distanceAt(plane, 0, [1 / 3, 1 / 3, 1 / 3]) - 2 / 3) < 1e-5);
  const rock = new THREE.BoxGeometry(); rock.userData.rocks = [{}]; assert.equal(supportsWearEdges(rock), false); assert.equal(supportsWearEdges(new THREE.BoxGeometry()), true);
});

test('edge placement and exposed-material wear are ordinary, optional wear settings', async () => {
  assert.ok(WEAR_PLACEMENTS.includes('edges')); assert.ok(WEAR_STYLES.some(s => s.id === 'bare'));
  const scene = JSON.parse(await readFile('public/scenes/casa-de-bairro.json', 'utf8')), prop = Object.values(scene.layout.entities).find(e => e.kind === 'prop');
  const withWear = wear => { const next = structuredClone(scene); next.layout.entities[prop.id].material = { ...next.layout.entities[prop.id].material, wear }; return next; };
  const base = wearDefaults('bare'); assert.equal(base.edgeWidth, undefined, 'documents without the field stay valid and unchanged');
  validateDocument(withWear({ ...base, placement: 'edges' })); validateDocument(withWear({ ...base, placement: 'edges', edgeWidth: .05 }));
  for (const edgeWidth of [0, .6, '3']) assert.throws(() => validateDocument(withWear({ ...base, placement: 'edges', edgeWidth })));
  assert.equal(wearFieldPatch({ ...base, placement: 'edges' }, 'edgeWidth', 4).edgeWidth, .04, 'the panel edits the band in centimetres');
  const helpers = { numberField: (field, label, value) => `<input data-field="${field}" value="${value}">`, colorField: field => `<input data-field="${field}">` };
  assert.match(wearPanel({ wear: { ...base, placement: 'edges' } }, helpers), /value="edges" selected[\s\S]*data-field="wear-edgeWidth" value="3"/);
  assert.doesNotMatch(wearPanel({ wear: base }, helpers), /wear-edgeWidth/);
});
