import * as THREE from 'three';
import { flickerFactor } from '../domain/lighting.js';

export function createLightObject(record, { helper = true, presentation = false } = {}) {
  const wrapper = new THREE.Group();
  wrapper.position.fromArray(record.position);
  wrapper.quaternion.fromArray(record.rotation).normalize();
  const source = record.type === 'point'
    ? new THREE.PointLight(record.color, record.intensity, record.distance, 2)
    : record.type === 'spot'
      ? new THREE.SpotLight(record.color, record.intensity, record.distance, record.angle, record.penumbra, 2)
      : new THREE.DirectionalLight(record.color, record.intensity);
  source.castShadow = Boolean(record.shadowEnabled);
  source.shadow.mapSize.set(1024, 1024);
  source.shadow.normalBias = .035;
  source.shadow.bias = -.00008;
  source.shadow.camera.near = .1;
  if (record.type !== 'point') {
    const target = new THREE.Object3D();
    target.position.set(0, -1, 0);
    wrapper.add(target);
    source.target = target;
  }
  if (record.type !== 'directional') source.shadow.camera.far = Math.max(.2, record.distance || 30);
  wrapper.add(source);
  if (helper) {
    const material = new THREE.MeshBasicMaterial({ color: record.color, wireframe: true, depthTest: false });
    const indicator = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8), material);
    indicator.userData.editHelper = true;
    indicator.visible = !presentation;
    indicator.renderOrder = 5;
    wrapper.add(indicator);
    if (record.type === 'spot') {
      const length = Math.min(record.distance || 3, 3);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(Math.min(record.angle, 1.4)) * length, length, 16, 1, true), material);
      cone.position.y = -length / 2;
      cone.userData.editHelper = true;
      cone.visible = !presentation;
      wrapper.add(cone);
    }
  }
  wrapper.userData.source = source;
  wrapper.userData.lightRecord = record;
  source.intensity = record.enabled === false ? 0 : record.intensity;
  return wrapper;
}

export function updateLightEffects(objects, seconds, paused) {
  let animated = false;
  for (const wrapper of objects) {
    const source = wrapper.userData.source, record = wrapper.userData.lightRecord;
    if (!source || !record) continue;
    let visible = true;
    for (let parent = wrapper; parent; parent = parent.parent) if (!parent.visible) visible = false;
    const active = visible && record.enabled !== false;
    const running = active && !paused && record.flicker?.enabled && record.flicker.amplitude > 0;
    source.intensity = active ? record.intensity * flickerFactor(record.flicker, seconds) : 0;
    animated ||= Boolean(running);
  }
  return animated;
}
