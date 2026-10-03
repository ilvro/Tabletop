import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWall, createDoor, createFloor } from '../src/render/scene-objects.js';
import { disposeObject } from '../src/render/asset-cache.js';
import { createEntity } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';

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
