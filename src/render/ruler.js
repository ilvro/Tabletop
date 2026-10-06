import * as THREE from 'three';
import { measureDistance } from '../domain/measurement.js';

/** Transient editor overlay: no document, selection or camera mutations. */
export function createRuler(container, scene, onChange) {
  const group = new THREE.Group();
  group.visible = false;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#ffd477', depthTest: false, depthWrite: false, toneMapped: false }));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#fff1cf', size: 9, sizeAttenuation: false, depthTest: false, depthWrite: false, toneMapped: false }));
  line.renderOrder = points.renderOrder = 20;
  line.frustumCulled = points.frustumCulled = false;
  group.add(line, points); scene.add(group);
  const label = document.createElement('div');
  label.className = 'ruler-label'; label.hidden = true;
  label.setAttribute('aria-hidden', 'true'); container.append(label);
  const number = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let state = null;
  function set(next) {
    state = next ? structuredClone(next) : null;
    group.visible = Boolean(state); label.hidden = !state;
    if (state) {
      Object.assign(state, measureDistance(state.start, state.end, state.cellSize));
      geometry.attributes.position.array.set([...state.start, ...state.end]);
      geometry.attributes.position.needsUpdate = true;
      label.textContent = `${number.format(state.horizontal)} m no plano · ${number.format(state.spatial)} m em 3D`;
      label.dataset.complete = String(state.complete);
    }
    onChange(state ? structuredClone(state) : null);
  }
  return {
    group,
    snapshot: () => state ? structuredClone(state) : null,
    pending: () => Boolean(state && !state.complete),
    set,
    begin(point, cellSize) { set({ start: point, end: point, cellSize, complete: false }); },
    update(point) { if (state && !state.complete) set({ ...state, end: point }); },
    finish() { if (state) set({ ...state, complete: true }); },
    clear() { if (state) set(null); },
    project(camera, width, height) {
      if (!state || !group.visible) { label.hidden = true; return; }
      const point = new THREE.Vector3(...state.start).lerp(new THREE.Vector3(...state.end), .5).project(camera);
      label.hidden = point.z < -1 || point.z > 1 || Math.abs(point.x) > 1 || Math.abs(point.y) > 1;
      if (!label.hidden) {
        const half = label.offsetWidth / 2;
        label.style.left = `${Math.max(half + 8, Math.min(width - half - 8, (point.x + 1) * width / 2))}px`;
        label.style.top = `${Math.max(12, Math.min(height - label.offsetHeight - 12, (1 - point.y) * height / 2 - 28))}px`;
      }
    },
    destroy() { group.removeFromParent(); geometry.dispose(); line.material.dispose(); points.material.dispose(); label.remove(); },
  };
}
