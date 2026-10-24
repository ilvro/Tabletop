import * as THREE from 'three';
import { movementCost, movementBand, BAND_COLORS } from '../domain/movement.js';

const metres = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/**
 * The line a character draws on the floor while it moves: from where it left to where it is, with the distance in
 * metres and squares, coloured by its reach when its actor has a speed. A view overlay: never in the document.
 */
export function createMovementTrail(container, scene) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const material = new THREE.LineDashedMaterial({ color: BAND_COLORS.none, dashSize: .25, gapSize: .12, depthTest: false, depthWrite: false, toneMapped: false, transparent: true });
  const line = new THREE.Line(geometry, material); line.renderOrder = 19; line.frustumCulled = false; line.visible = false; line.userData.editHelper = false;
  const end = new THREE.Mesh(new THREE.RingGeometry(.28, .34, 40), new THREE.MeshBasicMaterial({ color: BAND_COLORS.none, depthTest: false, depthWrite: false, toneMapped: false, transparent: true, side: THREE.DoubleSide }));
  end.rotation.x = -Math.PI / 2; end.renderOrder = 19; end.visible = false;
  scene.add(line, end);
  const label = document.createElement('div'); label.className = 'ruler-label movement-label'; label.hidden = true; label.setAttribute('aria-hidden', 'true'); container.append(label);
  let state = null, timer = null;
  function show(from, to, { cellSize = 1, diagonal = 'euclidean', speed = null } = {}) {
    clearTimeout(timer);
    const lift = .04, a = [from[0], from[1] + lift, from[2]], b = [to[0], to[1] + lift, to[2]];
    geometry.attributes.position.array.set([...a, ...b]); geometry.attributes.position.needsUpdate = true; line.computeLineDistances();
    const cost = movementCost(from, to, cellSize, diagonal), band = movementBand(cost.metres, speed), color = BAND_COLORS[band ?? 'none'];
    material.color.set(color); end.material.color.set(color); end.position.set(...b);
    line.visible = end.visible = cost.metres > .05; label.hidden = !line.visible;
    label.textContent = `${metres.format(cost.metres)} m${cost.squares !== null ? ` · ${metres.format(cost.squares)} ${cost.squares === 1 ? 'quadrado' : 'quadrados'}` : ''}${band === 'run' ? ' · correndo' : band === 'far' ? ' · fora do alcance' : ''}`;
    label.style.borderColor = color; label.style.color = color;
    state = { from, to, ...cost, band };
  }
  function hide(after = 0) {
    clearTimeout(timer);
    const close = () => { line.visible = end.visible = false; label.hidden = true; state = null; };
    if (after > 0) timer = setTimeout(close, after); else close();
  }
  /** Keeps the label over the middle of the line, in the pixels of `camera`. */
  function project(camera, width, height) {
    if (!state || label.hidden) return;
    const middle = new THREE.Vector3((state.from[0] + state.to[0]) / 2, (state.from[1] + state.to[1]) / 2 + .2, (state.from[2] + state.to[2]) / 2).project(camera);
    label.style.left = `${(middle.x + 1) / 2 * width}px`; label.style.top = `${(1 - middle.y) / 2 * height}px`;
  }
  return { show, hide, project, get visible() { return line.visible; }, snapshot: () => state && { ...state }, dispose() { clearTimeout(timer); line.removeFromParent(); end.removeFromParent(); geometry.dispose(); material.dispose(); end.geometry.dispose(); end.material.dispose(); label.remove(); } };
}
