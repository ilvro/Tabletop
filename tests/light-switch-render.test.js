import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyBoundEmission } from '../src/render/bound-light.js';
import { illuminationDefaults } from '../src/domain/dynamic-lighting.js';

// A lantern: a glowing crystal and a flame, each its own material slot.
function lantern() {
  const object = new THREE.Group(), slot = (name, emissive, intensity) => { const material = new THREE.MeshStandardMaterial({ emissive, emissiveIntensity: intensity }); material.name = name; const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); mesh.userData.materialSlot = name; object.add(mesh); return mesh; };
  return { object, crystal: slot('crystal', '#3fb6e6', .7), flame: slot('flame', '#ff9a3c', 1.1), iron: slot('iron', '#000000', 0) };
}
const look = { daylight: { phase: 'night' } }, record = enabled => ({ id: 'l', illumination: { ...illuminationDefaults('lamp'), enabled } });

test('a light switched off takes the glow of its model and its flame with it, and gives them back', () => {
  const { object, crystal, flame, iron } = lantern();
  applyBoundEmission(object, record(true), look);
  assert.equal(crystal.material.emissiveIntensity, .7); assert.equal(flame.visible, true);
  applyBoundEmission(object, record(false), look);
  assert.equal(crystal.material.emissiveIntensity, 0); assert.equal(flame.material.emissiveIntensity, 0); assert.equal(flame.visible, false); assert.equal(iron.visible, true);
  applyBoundEmission(object, record(true), look);
  assert.equal(crystal.material.emissiveIntensity, .7); assert.equal(flame.material.emissiveIntensity, 1.1); assert.equal(flame.visible, true);
  assert.equal(crystal.material.emissive.getHexString(), '3fb6e6');
});

test('a light outside its phase is off too; an object without a light keeps its glow', () => {
  const { object, crystal, flame } = lantern();
  applyBoundEmission(object, { id: 'l', illumination: { ...illuminationDefaults('lamp'), phase: 'night' } }, { daylight: { phase: 'day' } });
  assert.equal(crystal.material.emissiveIntensity, 0); assert.equal(flame.visible, false);
  const plain = lantern(); applyBoundEmission(plain.object, { id: 'p' }, look);
  assert.equal(plain.crystal.material.emissiveIntensity, .7); assert.equal(plain.flame.visible, true);
});
