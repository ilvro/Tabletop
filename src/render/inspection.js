import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { smootherstep } from '../domain/cinematics.js';

/**
 * An object picked up from the scene and held in front of the camera, like a clue in a
 * survival horror: it flies to the camera in an arc, turns to face it, and is drawn in a
 * scene of its own over the blurred, darkened frame, under a studio light that does not
 * depend on how dark the room is. The document never changes: the object is a clone
 * sharing geometry and materials, and the original is only hidden while it is away.
 *
 * Gestures change a target (turn, zoom, pan, page); what is drawn approaches it, quickly
 * under the master's hand and with the projector's smoothing on the second screen.
 */
export const FLIGHT_SECONDS = .7;
export const ZOOM_LIMITS = [1, 6];
const FILL = .66, X = new THREE.Vector3(1, 0, 0);

const vignetteShader = {
  uniforms: { amount: { value: 0 }, aspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `varying vec2 vUv; uniform float amount, aspect;
    void main() { vec2 c = (vUv - .5) * vec2(aspect, 1.0); float r = length(c);
      gl_FragColor = vec4(0.0, 0.0, 0.0, amount * (.46 + .42 * smoothstep(.18, .95, r))); }`,
};

function shadowTexture() {
  const canvas = Object.assign(document.createElement('canvas'), { width: 128, height: 128 }), ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(.55, 'rgba(0,0,0,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

/** The turn that holds a model square to the camera: its page (or front) toward the lens, the top of the page up. */
export function holdRotation(axes) {
  if (!axes) return new THREE.Quaternion();
  const basis = new THREE.Matrix4().makeBasis(axes.right, axes.up, axes.normal);
  return new THREE.Quaternion().setFromRotationMatrix(basis).invert();
}

export function createInspection({ renderer, reducedMotion, slow = false, onSide = () => {}, onClosed = () => {} }) {
  const scene = new THREE.Scene(), rig = new THREE.Group(), focus = new THREE.Object3D();
  rig.add(focus); scene.add(rig);
  const key = new THREE.DirectionalLight('#fff3e2', 2.6), fill = new THREE.DirectionalLight('#dfe7ff', .85), rim = new THREE.DirectionalLight('#ffffff', 1.9);
  for (const light of [key, fill, rim]) { light.target = focus; rig.add(light); }
  rig.add(new THREE.HemisphereLight('#fff8ee', '#2c3036', .6));
  const vignette = new FullScreenQuad(new THREE.ShaderMaterial({ ...vignetteShader, uniforms: THREE.UniformsUtils.clone(vignetteShader.uniforms), transparent: true, depthTest: false, depthWrite: false }));
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false }));
  shadow.renderOrder = -1; rig.add(shadow);
  let environment = null, item = null;
  const scratch = { v: new THREE.Vector3(), w: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4() };

  function ensureEnvironment() {
    if (environment || slow) return;
    const generator = new THREE.PMREMGenerator(renderer);
    environment = generator.fromScene(new RoomEnvironment(), .04).texture; generator.dispose();
    scene.environment = environment; scene.environmentIntensity = .45;
  }
  /** A clone that shares what it draws, without the lights, labels and effects hung on the original. */
  function cloneOf(object) {
    const clone = object.clone(true), drop = [];
    clone.traverse(child => { if (child !== clone && (child.isLight || child.isSprite || child.isPoints || child.userData.editHelper || child.userData.localEffect)) drop.push(child); });
    for (const child of drop) child.removeFromParent();
    clone.traverse(child => { child.visible = true; if (child.isMesh) { child.castShadow = false; child.receiveShadow = false; child.frustumCulled = false; } });
    clone.matrixAutoUpdate = true; return clone;
  }
  function localBounds(object) {
    object.updateWorldMatrix(true, true);
    const inverse = object.matrixWorld.clone().invert(), box = new THREE.Box3();
    object.traverse(mesh => {
      if (!mesh.isMesh || !mesh.geometry || mesh.userData.decorative) return;
      mesh.geometry.boundingBox ?? mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox.clone().applyMatrix4(scratch.m.multiplyMatrices(inverse, mesh.matrixWorld)));
    });
    if (box.isEmpty()) box.set(new THREE.Vector3(-.1, 0, -.1), new THREE.Vector3(.1, .2, .1));
    return box;
  }
  const poseOf = object => { object.updateWorldMatrix(true, false); const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); object.matrixWorld.decompose(p, q, s); return { position: p, quaternion: q, scale: s }; };
  const view = camera => camera.isPerspectiveCamera ? { height: d => 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), aspect: camera.aspect } : { height: () => (camera.top - camera.bottom) / camera.zoom, aspect: (camera.right - camera.left) / (camera.top - camera.bottom) };

  /** Start holding `object`. `axes` are the page axes of a document's `page` slot (null for an object held by its front). */
  function open({ id, object, hold, axes = null, pages = 0, title = '' }) {
    if (item) finish();
    ensureEnvironment();
    const clone = cloneOf(object), bounds = localBounds(object), start = poseOf(object);
    clone.position.copy(start.position); clone.quaternion.copy(start.quaternion); clone.scale.copy(start.scale);
    scene.add(clone);
    item = {
      id, source: object, clone, axes, title, pages, bounds, start, phase: 'opening', time: 0, from: null,
      base: holdRotation(axes).premultiply(new THREE.Quaternion().setFromAxisAngle(X, THREE.MathUtils.degToRad(hold.pitch))),
      distance: hold.distance,
      current: { rotation: new THREE.Quaternion(), zoom: 1, pan: new THREE.Vector2() },
      target: { rotation: new THREE.Quaternion(), zoom: 1, pan: new THREE.Vector2(), page: 0 },
      page: 0, side: 'front', velocity: new THREE.Vector2(), dragging: false, remote: null, blend: 0, pose: start,
    };
    onSide(id, 0, 'front');
    return item;
  }
  /** Fly back to where the object was. */
  function close() { if (!item || item.phase === 'closing') return; item.phase = 'closing'; item.time = 0; item.from = { position: item.clone.position.clone(), quaternion: item.clone.quaternion.clone(), scale: item.clone.scale.clone() }; }
  /** End at once (the object left the scene, or another one was picked up). */
  function finish() { if (!item) return; const id = item.id; item.clone.removeFromParent(); item = null; onClosed(id); }
  /** The object was rebuilt (an edit in the inspector): keep holding the new one where the old one was. */
  function replaceSource(object) {
    if (!item || item.source === object) return;
    const clone = cloneOf(object); clone.position.copy(item.clone.position); clone.quaternion.copy(item.clone.quaternion); clone.scale.copy(item.clone.scale);
    item.clone.removeFromParent(); scene.add(clone); item.clone = clone; item.source = object; item.bounds = localBounds(object); item.start = poseOf(object);
  }

  /** Where the object is held this frame, in world space. */
  function holdPose(camera) {
    const { current, bounds, base, distance, start } = item, v = view(camera);
    const quaternion = scratch.q.copy(camera.quaternion).multiply(current.rotation).multiply(base).clone();
    // Fit the held turn into ~70% of the frame height, whatever its real size.
    const size = bounds.getSize(new THREE.Vector3()).multiply(start.scale), turn = new THREE.Quaternion().copy(base), extent = new THREE.Box3();
    for (let i = 0; i < 8; i++) extent.expandByPoint(scratch.v.set(i & 1 ? size.x : -size.x, i & 2 ? size.y : -size.y, i & 4 ? size.z : -size.z).multiplyScalar(.5).applyQuaternion(turn));
    const seen = extent.getSize(new THREE.Vector3()), height = v.height(distance), width = height * v.aspect;
    const fit = Math.min(FILL * height / Math.max(seen.y, 1e-4), .82 * width / Math.max(seen.x, 1e-4)), scale = start.scale.clone().multiplyScalar(fit * current.zoom);
    // A little below the middle, clear of the title card.
    const point = new THREE.Vector3(current.pan.x, current.pan.y - height * .035, -distance).applyQuaternion(camera.quaternion).add(camera.position);
    const center = bounds.getCenter(new THREE.Vector3()).multiply(scale).applyQuaternion(quaternion);
    return { position: point.sub(center), quaternion, scale, seen: seen.multiplyScalar(fit * current.zoom), height, width };
  }

  const approach = (seconds, tau) => 1 - Math.exp(-seconds / Math.max(.001, tau));
  /** Advance one frame. Returns whether anything is still moving. */
  function step(camera, seconds) {
    if (!item) return false;
    const motion = !reducedMotion.matches, { current, target } = item;
    let moving = false;
    if (!item.dragging && item.velocity.lengthSq() > 25 && motion) {
      rotateBy(item.velocity.x * seconds, item.velocity.y * seconds); item.velocity.multiplyScalar(Math.exp(-5 * seconds)); moving = true;
    } else if (!item.dragging) item.velocity.set(0, 0);
    const k = motion ? approach(seconds, item.remote ?? .07) : 1;
    if (current.rotation.angleTo(target.rotation) > 1e-4) { current.rotation.slerp(target.rotation, k); moving = true; } else current.rotation.copy(target.rotation);
    if (Math.abs(current.zoom - target.zoom) > 1e-4) { current.zoom += (target.zoom - current.zoom) * k; moving = true; } else current.zoom = target.zoom;
    if (current.pan.distanceTo(target.pan) > 1e-5) { current.pan.lerp(target.pan, k); moving = true; } else current.pan.copy(target.pan);
    if (target.page !== item.page) { item.page = target.page; item.side = 'front'; onSide(item.id, item.page, 'front'); }
    const hold = holdPose(camera), { clone } = item;
    if (item.phase === 'closing') {
      item.time += seconds;
      const t = motion ? Math.min(1, item.time / FLIGHT_SECONDS) : 1, e = smootherstep(t), back = poseOf(item.source);
      clone.position.lerpVectors(item.from.position, back.position, e); clone.quaternion.slerpQuaternions(item.from.quaternion, back.quaternion, e); clone.scale.lerpVectors(item.from.scale, back.scale, e);
      item.blend = 1 - e;
      if (t >= 1) { finish(); return true; }
      return true;
    }
    if (item.phase === 'opening') {
      item.time += seconds;
      const t = motion ? Math.min(1, item.time / FLIGHT_SECONDS) : 1, e = smootherstep(t), from = item.start;
      clone.position.lerpVectors(from.position, hold.position, e);
      // An arc rather than a straight line: the object rises toward the lens as it comes.
      const lift = Math.sin(Math.PI * t) * Math.min(.25, from.position.distanceTo(hold.position) * .12);
      clone.position.addScaledVector(scratch.w.set(0, 1, 0).applyQuaternion(camera.quaternion), lift);
      clone.quaternion.slerpQuaternions(from.quaternion, hold.quaternion, e); clone.scale.lerpVectors(from.scale, hold.scale, e);
      item.blend = e; moving = true;
      if (t >= 1) item.phase = 'open';
    } else { clone.position.copy(hold.position); clone.quaternion.copy(hold.quaternion); clone.scale.copy(hold.scale); item.blend = 1; }
    // Which side of the sheet faces the lens decides whether the front or the back is drawn.
    if (item.axes) {
      const normal = scratch.v.copy(item.axes.normal).applyQuaternion(clone.quaternion), toward = scratch.w.subVectors(camera.position, clone.position);
      const side = normal.dot(toward) >= 0 ? 'front' : 'back';
      if (side !== item.side) { item.side = side; onSide(item.id, item.page, side); }
    }
    // Studio light and a soft shadow behind the object, both fixed to the camera.
    rig.position.copy(camera.position); rig.quaternion.copy(camera.quaternion);
    const d = item.distance; focus.position.set(current.pan.x, current.pan.y, -d);
    key.position.set(-.9, 1.1, 1.2).add(focus.position); fill.position.set(1.2, .1, .8).add(focus.position); rim.position.set(.4, .9, -1.6).add(focus.position);
    shadow.position.set(current.pan.x + hold.seen.x * .05, current.pan.y - hold.height * .035 - hold.seen.y * .06, -d - Math.max(.03, hold.seen.z * .7));
    shadow.scale.set(hold.seen.x * 1.35 + .02, hold.seen.y * 1.3 + .02, 1).multiplyScalar(1 + Math.max(.03, hold.seen.z * .7) / d);
    shadow.material.opacity = .55 * item.blend;
    return moving;
  }

  function draw(camera, width, height) {
    if (!item) return;
    const autoClear = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(null);
    vignette.material.uniforms.amount.value = item.blend; vignette.material.uniforms.aspect.value = width / Math.max(1, height);
    vignette.render(renderer);
    renderer.clearDepth(); renderer.render(scene, camera);
    renderer.autoClear = autoClear;
  }

  // Gestures. Angles in radians per pixel dragged; the axis is the one the drag turns about on screen.
  function rotateBy(dx, dy) {
    const angle = Math.hypot(dx, dy) * .0085; if (!item || angle < 1e-6) return;
    item.target.rotation.premultiply(scratch.q.setFromAxisAngle(scratch.v.set(dy, dx, 0).normalize(), angle)); item.target.rotation.normalize();
  }
  const panLimit = camera => { const v = view(camera), h = v.height(item.distance); return [h * v.aspect / 2 * item.target.zoom, h / 2 * item.target.zoom]; };
  function clampPan(camera) { const [lx, ly] = panLimit(camera); item.target.pan.set(THREE.MathUtils.clamp(item.target.pan.x, -lx, lx), THREE.MathUtils.clamp(item.target.pan.y, -ly, ly)); }
  return {
    open, close, finish, replaceSource, step, draw,
    get id() { return item?.id ?? null; },
    get phase() { return item?.phase ?? null; },
    get blend() { return item?.blend ?? 0; },
    get source() { return item?.source ?? null; },
    /** Settled in the hands: the frame behind it no longer changes. */
    get settled() { return item?.phase === 'open'; },
    drag(dx, dy, seconds) { if (!item) return; item.dragging = true; item.lastDrag = performance.now(); item.remote = null; rotateBy(dx, dy); if (seconds > 0) item.velocity.lerp(scratch.w.set(dx / Math.max(seconds, 1 / 60), dy / Math.max(seconds, 1 / 60), 0), .5).clampLength(0, 1400); },
    // Let go after holding still: no spin.
    release() { if (!item) return; item.dragging = false; if (performance.now() - (item.lastDrag ?? 0) > 90) item.velocity.set(0, 0); },
    /** Wheel zoom toward the point under the pointer (`ndc` in −1…1), so the detail being looked at stays put. */
    zoomAt(delta, ndc, camera) {
      if (!item) return; item.remote = null;
      const z0 = item.target.zoom, z1 = THREE.MathUtils.clamp(z0 * Math.exp(-delta * .0016), ...ZOOM_LIMITS), v = view(camera), h = v.height(item.distance);
      const point = new THREE.Vector2(ndc[0] * h * v.aspect / 2, ndc[1] * h / 2);
      item.target.pan.copy(z1 <= ZOOM_LIMITS[0] + 1e-4 ? new THREE.Vector2() : point.clone().sub(point.clone().sub(item.target.pan).multiplyScalar(z1 / z0)));
      item.target.zoom = z1; clampPan(camera);
    },
    panBy(dx, dy, pixelsHigh, camera) { if (!item) return; item.remote = null; const m = view(camera).height(item.distance) / Math.max(1, pixelsHigh); item.target.pan.x += dx * m; item.target.pan.y -= dy * m; clampPan(camera); },
    /** Back to how it was first held: front up, whole object in view. */
    reset() { if (!item) return; item.target.rotation.identity(); item.target.zoom = 1; item.target.pan.set(0, 0); item.velocity.set(0, 0); },
    /** Turn the sheet over, top edge toward the viewer, like a page in the hand. */
    flip() { if (!item) return; item.velocity.set(0, 0); item.target.rotation.premultiply(scratch.q.setFromAxisAngle(X, Math.PI)); },
    setPage(page) { if (!item || !item.pages) return; const next = THREE.MathUtils.clamp(page, 0, item.pages - 1); if (next !== item.target.page) { item.target.page = next; item.target.rotation.identity(); item.velocity.set(0, 0); } },
    setPages(count) { if (item) { item.pages = count; if (item.target.page >= count) this.setPage(Math.max(0, count - 1)); } },
    /** The projector follows the master: the same target, approached with `smoothing` seconds. */
    setRemote(state, smoothing = .14) {
      if (!item || !state) return;
      if (Array.isArray(state.rotation) && state.rotation.length === 4 && state.rotation.every(Number.isFinite)) item.target.rotation.fromArray(state.rotation).normalize();
      if (Number.isFinite(state.zoom)) item.target.zoom = THREE.MathUtils.clamp(state.zoom, ...ZOOM_LIMITS);
      if (Array.isArray(state.pan) && state.pan.every(Number.isFinite)) item.target.pan.fromArray(state.pan);
      if (Number.isInteger(state.page)) this.setPage(state.page), item.target.rotation.fromArray(state.rotation ?? [0, 0, 0, 1]).normalize();
      item.remote = smoothing; item.velocity.set(0, 0);
    },
    state() { return item ? { entityId: item.id, rotation: item.target.rotation.toArray(), zoom: item.target.zoom, pan: item.target.pan.toArray(), page: item.target.page, side: item.side, phase: item.phase } : null; },
    dispose() { if (item) { item.clone.removeFromParent(); item = null; } vignette.material.dispose(); vignette.dispose(); shadow.material.map.dispose(); shadow.material.dispose(); shadow.geometry.dispose(); environment?.dispose(); },
  };
}
