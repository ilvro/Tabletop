import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWall, createDoor, createFloor } from '../src/render/scene-objects.js';
import { disposeObject } from '../src/render/asset-cache.js';
import { createEntity } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { setupUniformScaleGizmo } from '../src/render/renderer.js';

const intersections = (object, origin, direction) => {
  object.updateMatrixWorld(true);
  return new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction).normalize()).intersectObject(object, true);
};

test('a hosted doorway is physically clear while its wall, lintel and closed leaf remain solid', () => {
  const wall = createEntity('wall', { length: 6, height: 2.6, thickness: 0.18 });
  const door = createEntity('door', { wallId: wall.id, offset: 3, width: 1.1, height: 2.1, initialAngle: Math.PI / 2 });
  const wallView = createWall(wall, [door]);
  const closed = createDoor(door, wall, 0);
  const open = createDoor(door, wall, Math.PI / 2);
  try {
    assert.equal(intersections(wallView, [3, 1, 2], [0, 0, -1]).length, 0, 'the opening cannot contain wall faces');
    assert.ok(intersections(wallView, [0.5, 1, 2], [0, 0, -1]).length > 0, 'the wall before the opening remains solid');
    assert.ok(intersections(wallView, [5.5, 1, 2], [0, 0, -1]).length > 0, 'the wall after the opening remains solid');
    assert.ok(intersections(wallView, [3, 2.4, 2], [0, 0, -1]).length > 0, 'the lintel above the doorway remains solid');
    assert.ok(intersections(closed, [3, 1, 2], [0, 0, -1]).length > 0, 'a closed leaf blocks the center of the opening');
    assert.equal(intersections(open, [3, 1, 2], [0, 0, -1]).length, 0, 'an open leaf leaves the center traversable');
    assert.ok(intersections(wallView, [0.5, 1, 2], [0, 0, -1]).every(hit => hit.object.userData.entityId === wall.id), 'picking preserves semantic wall identity');
    assert.ok(intersections(closed, [3, 1, 2], [0, 0, -1]).every(hit => hit.object.userData.entityId === door.id), 'picking preserves semantic door identity');
  } finally { [wallView, closed, open].forEach(object => disposeObject(object)); }
});

test('door openings follow rotated host walls in world coordinates', () => {
  const wall = createEntity('wall', { length: 6, height: 2.6, position: [4, 1, -2], rotation: quaternionFromYaw(90) });
  const door = createEntity('door', { wallId: wall.id, offset: 3, width: 1.1, height: 2.1 });
  const wallView = createWall(wall, [door]);
  const leaf = createDoor(door, wall, 0);
  try {
    assert.equal(intersections(wallView, [6, 2, -5], [-1, 0, 0]).length, 0);
    assert.ok(intersections(wallView, [6, 2, -2.5], [-1, 0, 0]).length > 0);
    assert.ok(intersections(leaf, [6, 2, -5], [-1, 0, 0]).length > 0);
  } finally { disposeObject(wallView); disposeObject(leaf); }
});

test('floor thickness grows below its top pivot and its top remains a selectable support surface', () => {
  const floor = createEntity('floor', { width: 6, length: 5, thickness: 0.2, position: [2, 1.5, -3] });
  const view = createFloor(floor);
  try {
    view.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(view);
    assert.ok(Math.abs(bounds.max.y - 1.5) < 1e-7);
    assert.ok(Math.abs(bounds.min.y - 1.3) < 1e-7);
    const hit = intersections(view, [2, 5, -3], [0, -1, 0])[0];
    assert.ok(Math.abs(hit.point.y - 1.5) < 1e-7);
    assert.equal(hit.object.userData.entityId, floor.id);
    assert.equal(hit.face.normal.y, 1);
  } finally { disposeObject(view); }
});

test('scale gizmo provides a 4th axis for proportional XYZ scale', () => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);
  const canvas = { style: {}, addEventListener() {}, removeEventListener() {} };
  const transform = new TransformControls(camera, canvas);
  setupUniformScaleGizmo(transform);

  const helper = transform.getHelper();
  const tcGizmo = helper.children.find((c) => c.isTransformControlsGizmo);
  assert.ok(tcGizmo, 'TransformControlsGizmo helper must exist');

  const xyzMeshes = tcGizmo.gizmo.scale.children.filter((c) => c.name === 'XYZ');
  assert.ok(xyzMeshes.length >= 3, 'Must have line, tip and handle meshes for XYZ');

  const xyzPickers = tcGizmo.picker.scale.children.filter((c) => c.name === 'XYZ');
  assert.ok(xyzPickers.length >= 1, 'Must have raycast picker for XYZ');

  const object = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  object.scale.set(1, 2, 3);
  const scene = new THREE.Scene();
  scene.add(object);
  scene.add(helper);
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);

  transform.attach(object);
  transform.setMode('scale');
  transform.axis = 'XYZ';
  helper.updateMatrixWorld(true);

  const pointerDown = { x: 0.1, y: 0.1, button: 0 };
  transform.pointerDown(pointerDown);
  assert.ok(transform.dragging, 'Pointer down on XYZ must start dragging');
  assert.ok(transform.pointStart.length() > 0, 'pointStart must be non-zero for proportional scaling');

  // Drag outward: should scale up proportionally
  const pointerMoveOut = { x: 0.2, y: 0.2, button: -1 };
  transform.pointerMove(pointerMoveOut);

  assert.ok(object.scale.x > 1, 'Scale X must increase');
  assert.ok(object.scale.y > 2, 'Scale Y must increase');
  assert.ok(object.scale.z > 3, 'Scale Z must increase');
  assert.ok(Math.abs(object.scale.y / object.scale.x - 2) < 1e-4, 'Y/X ratio preserved');
  assert.ok(Math.abs(object.scale.z / object.scale.x - 3) < 1e-4, 'Z/X ratio preserved');
});
