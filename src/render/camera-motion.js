import * as THREE from 'three';

// Integrate exponential acceleration exactly so speed does not depend on refresh rate.
export function advanceVelocity(velocity, desired, seconds, response = 10) {
  const decay = Math.exp(-response * seconds);
  return {
    velocity: velocity.map((value, i) => desired[i] + (value - desired[i]) * decay),
    displacement: velocity.map((value, i) => desired[i] * seconds + (value - desired[i]) * (1 - decay) / response),
  };
}

// Ground-plane movement follows the screen's right/up axes even directly overhead.
export function navigationDirection(camera, keys) {
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  right.y = 0; right.normalize();
  const forward = new THREE.Vector3(0, 1, 0).cross(right);
  const direction = right.multiplyScalar(Number(keys.has('KeyD')) - Number(keys.has('KeyA')))
    .addScaledVector(forward, Number(keys.has('KeyW')) - Number(keys.has('KeyS')));
  const up = keys.has('PageUp') || (camera.isPerspectiveCamera === true && keys.has('Space'));
  const down = keys.has('PageDown') || (camera.isPerspectiveCamera === true && (keys.has('ControlLeft') || keys.has('ControlRight')));
  direction.y = Number(up) - Number(down);
  return direction.lengthSq() ? direction.normalize().toArray() : [0, 0, 0];
}

// Travel around the focal point instead of collapsing through it between opposite views.
export function interpolateCamera(from, to, progress) {
  if (progress <= 0) return structuredClone(from);
  if (progress >= 1) return structuredClone(to);
  const t = progress * progress * (3 - 2 * progress);
  const target = new THREE.Vector3().fromArray(from.target).lerp(new THREE.Vector3().fromArray(to.target), t);
  const a = new THREE.Spherical().setFromVector3(new THREE.Vector3().fromArray(from.position).sub(new THREE.Vector3().fromArray(from.target)));
  const b = new THREE.Spherical().setFromVector3(new THREE.Vector3().fromArray(to.position).sub(new THREE.Vector3().fromArray(to.target)));
  const yaw = Math.atan2(Math.sin(b.theta - a.theta), Math.cos(b.theta - a.theta));
  const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(
    THREE.MathUtils.lerp(a.radius, b.radius, t),
    THREE.MathUtils.lerp(a.phi, b.phi, t), a.theta + yaw * t,
  ));
  return { ...to, position: target.clone().add(offset).toArray(), target: target.toArray(),
    fov: THREE.MathUtils.lerp(from.fov, to.fov, t),
    orthographicHeight: THREE.MathUtils.lerp(from.orthographicHeight, to.orthographicHeight, t) };
}
