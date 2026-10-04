import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { advanceVelocity, navigationDirection, interpolateCamera } from '../src/render/camera-motion.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);
const shot = (position, target = [0, 0, 0]) => ({ projection: 'perspective', position, target, fov: 42, orthographicHeight: 18 });

test('navigation follows camera heading, keeps ground height, and normalizes diagonals', () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(10, 10, 0); camera.lookAt(0, 0, 0);
  const forward = navigationDirection(camera, new Set(['KeyW']));
  close(forward[0], -1); close(forward[1], 0); close(forward[2], 0);
  const diagonal = navigationDirection(camera, new Set(['KeyW', 'KeyD']));
  close(Math.hypot(...diagonal), 1);
  assert.deepEqual(navigationDirection(camera, new Set(['KeyW', 'KeyS'])), [0, 0, 0]);
  const vertical = navigationDirection(camera, new Set(['PageUp']));
  vertical.forEach((value, i) => close(value, [0, 1, 0][i]));
});

test('WASD remains usable directly overhead and after rotating top view', () => {
  const camera = new THREE.OrthographicCamera();
  camera.position.set(0, 35, .0001); camera.lookAt(0, 0, 0);
  const forward = navigationDirection(camera, new Set(['KeyW']));
  close(forward[0], 0); close(forward[1], 0); close(forward[2], -1);
  camera.rotateZ(Math.PI / 2);
  const turned = navigationDirection(camera, new Set(['KeyW']));
  close(turned[0], -1); close(turned[1], 0); close(turned[2], 0);
});

test('Space and either Ctrl change perspective height, combine with WASD, and stay inactive overhead', () => {
  const camera = new THREE.PerspectiveCamera();
  assert.deepEqual(navigationDirection(camera, new Set(['Space'])), [0, 1, 0]);
  for (const control of ['ControlLeft', 'ControlRight']) {
    assert.deepEqual(navigationDirection(camera, new Set([control])), [0, -1, 0]);
  }
  assert.deepEqual(navigationDirection(camera, new Set(['ControlLeft', 'ControlRight'])), [0, -1, 0]);
  assert.deepEqual(navigationDirection(camera, new Set(['Space', 'ControlLeft'])), [0, 0, 0]);
  assert.deepEqual(navigationDirection(camera, new Set(['Space', 'PageUp'])), [0, 1, 0]);
  const diagonal = navigationDirection(camera, new Set(['KeyW', 'ControlLeft']));
  close(Math.hypot(...diagonal), 1); assert.ok(diagonal[1] < 0 && diagonal[2] < 0);
  for (const key of ['Space', 'ControlLeft', 'ControlRight']) {
    assert.deepEqual(navigationDirection(new THREE.OrthographicCamera(), new Set([key])), [0, 0, 0]);
  }
});

test('acceleration and stopping cover the same distance at 30 and 144 fps', () => {
  function simulate(fps) {
    let velocity = [0, 0, 0], distance = 0;
    for (let i = 0; i < fps * 3; i++) {
      const step = advanceVelocity(velocity, i < fps ? [6, 0, 0] : [0, 0, 0], 1 / fps);
      velocity = step.velocity; distance += step.displacement[0];
    }
    assert.ok(velocity[0] < .001);
    return distance;
  }
  close(simulate(30), simulate(144)); close(simulate(30), 6);
});

test('opposite cinematic views travel around the focal point without collapsing the radius', () => {
  const from = shot([10, 10, 0]), to = { ...shot([-10, 10, 0]), fov: 70 };
  assert.deepEqual(interpolateCamera(from, to, 0), from);
  assert.deepEqual(interpolateCamera(from, to, 1), to);
  const middle = interpolateCamera(from, to, .5);
  close(Math.hypot(...middle.position), Math.sqrt(200)); close(middle.fov, 56);
  assert.ok(Math.abs(middle.position[2]) > 9);
});

test('cinematic motion uses the shortest yaw and interpolates target and orthographic framing', () => {
  const offset = degrees => new THREE.Vector3().setFromSpherical(new THREE.Spherical(10, 1, THREE.MathUtils.degToRad(degrees))).toArray();
  const from = { ...shot(offset(179)), projection: 'orthographic', orthographicHeight: 10 };
  const to = { ...from, position: offset(-179).map((v, i) => v + [2, 4, 6][i]), target: [2, 4, 6], orthographicHeight: 20 };
  const middle = interpolateCamera(from, to, .5);
  assert.deepEqual(middle.target, [1, 2, 3]); close(middle.orthographicHeight, 15);
  assert.ok(middle.position[2] - middle.target[2] < -8);
});
