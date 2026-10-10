import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMaterialSharing } from '../src/render/material-sharing.js';

const mesh = (properties, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial(properties)); parent.add(m); return m; };

test('identical materials are drawn through one object and every mesh owns its material again afterwards', () => {
  const root = new THREE.Group(), sharing = createMaterialSharing();
  const a = mesh({ color: '#804020' }, root), b = mesh({ color: '#804020' }, root), c = mesh({ color: '#204080' }, root), own = [a, b, c].map(m => m.material);
  assert.equal(sharing.begin(root), 1); assert.equal(b.material, a.material); assert.notEqual(c.material, a.material);
  sharing.end(); assert.deepEqual([a, b, c].map(m => m.material), own);
  // An in-place edit of one instance is seen on the next frame and stays local.
  b.material.color.set('#ff0000');
  assert.equal(sharing.begin(root), 0); assert.equal(b.material, own[1]); sharing.end();
  b.material.color.set('#804020'); b.material.emissiveIntensity = 2;
  assert.equal(sharing.begin(root), 0); sharing.end();
  b.material.emissiveIntensity = a.material.emissiveIntensity;
  assert.equal(sharing.begin(root), 1); sharing.end();
});

test('compile-time differences, per-object uniforms and volatile transparency are never shared', () => {
  const root = new THREE.Group(), sharing = createMaterialSharing(), pair = properties => [mesh(properties, root), mesh(properties, root)];
  const [a, b] = pair({ color: '#555555' });
  b.material.userData.surface = { texture: 'wood', layers: [], coverage: null }; b.material.needsUpdate = true;
  assert.equal(sharing.begin(root), 0, 'different surface'); sharing.end();
  a.material.userData.surface = { texture: 'wood', layers: [], coverage: null }; a.material.needsUpdate = true;
  assert.equal(sharing.begin(root), 1, 'same surface'); sharing.end();
  a.material.userData.surface.coverage = b.material.userData.surface.coverage = { texture: 'snow' }; a.material.needsUpdate = b.material.needsUpdate = true;
  assert.equal(sharing.begin(root), 0, 'coverage'); sharing.end();
  a.material.userData.surface = b.material.userData.surface = undefined; a.material.needsUpdate = b.material.needsUpdate = true;
  a.material.userData.wear = b.material.userData.wear = { type: 'grime' }; a.material.userData.wearSpace = [1]; b.material.userData.wearSpace = [2]; a.material.needsUpdate = b.material.needsUpdate = true;
  assert.equal(sharing.begin(root), 0, 'wear in another frame'); sharing.end();
  b.material.userData.wearSpace = [1]; b.material.needsUpdate = true;
  assert.equal(sharing.begin(root), 1, 'wear in the same frame'); sharing.end();
  const [g, h] = pair({ color: '#99aaaa', transparent: true, opacity: .3, side: THREE.DoubleSide });
  assert.equal(sharing.begin(root), 1, 'double-sided glass stays separate'); assert.notEqual(g.material, h.material); sharing.end();
  // Effect and helper meshes use other material types, or none at the time of drawing.
  root.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.ShaderMaterial()), new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial()));
  sharing.invalidate(); assert.equal(sharing.begin(root), 1, 'other material types are ignored'); sharing.end();
  // Meshes added later are picked up after invalidation; removed ones are simply restored.
  const [x, y] = pair({ color: '#112233' });
  assert.equal(sharing.begin(root), 1); sharing.end(); sharing.invalidate();
  assert.equal(sharing.begin(root), 2); assert.equal(y.material, x.material); sharing.end(); assert.notEqual(y.material, x.material);
});
