import * as THREE from 'three';
import { screenContentKey, screenFrame, screenAnimated, dotsAt, cursorAt, progressAt } from '../domain/screens.js';

/** One uniform for every screen: material sharing can swap a material for its twin without freezing anybody's noise. */
export const screenClock = { value: 0 };
const FRAME_MS = 100;
/** How strongly the content glows: enough to read and to feed the bloom without washing out the letters. */
export const SCREEN_EMISSION = 1.15;
const SIZE = { width: 512, height: 384 }, SMALL = { width: 256, height: 192 };
const asList = material => Array.isArray(material) ? material : [material];
const hashCell = (i, frame, seed) => { const x = Math.sin(i * 12.9898 + frame * 78.233 + seed * 37.719) * 43758.5453; return x - Math.floor(x); };
const linear = c => (c /= 255) <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const slotOf = (mesh, material) => material?.name || mesh.userData.materialSlot || 'base';

/** The meshes of a model that draw the `screen` slot. */
export function screenMeshes(object, slot = 'screen') {
  const found = [];
  object.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.decorative) return;
    for (const material of asList(mesh.material)) if (material?.isMeshStandardMaterial && slotOf(mesh, material) === slot) found.push([mesh, material]);
  });
  return found;
}

/** Where the slot is on the model, in the model's own axes: its centre, the way it faces and where a light in front of it hangs. */
export function screenSlotFrame(object, slot = 'screen') {
  object.updateWorldMatrix(true, true);
  const inverse = object.matrixWorld.clone().invert(), box = new THREE.Box3();
  object.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.decorative || !mesh.geometry) return;
    mesh.geometry.boundingBox ?? mesh.geometry.computeBoundingBox();
    const local = mesh.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    if (asList(mesh.material).some(material => material?.isMeshStandardMaterial && slotOf(mesh, material) === slot)) box.union(local);
  });
  if (box.isEmpty()) return null;
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const axis = [0, 1, 2].reduce((best, i) => size.getComponent(i) < size.getComponent(best) ? i : best, 0), across = [0, 1, 2].filter(i => i !== axis);
  // The glass faces the side that is open: a ray leaving the screen backwards meets the casing at once.
  // (Bounding boxes cannot tell: parts of one material are merged, the keyboard with the frame.)
  const raycaster = new THREE.Raycaster(), meshes = []; object.traverse(mesh => { if (mesh.isMesh && !mesh.userData.decorative && !asList(mesh.material).some(m => slotOf(mesh, m) === slot)) meshes.push(mesh); });
  const blocked = sign => {
    const direction = new THREE.Vector3(); direction.setComponent(axis, sign);
    let hits = 0;
    for (const [u, v] of [[0, 0], [-.3, -.3], [.3, .3], [-.3, .3], [.3, -.3]]) {
      const origin = center.clone(); origin.setComponent(axis, center.getComponent(axis) + sign * (size.getComponent(axis) / 2 + .002));
      origin.setComponent(across[0], origin.getComponent(across[0]) + u * size.getComponent(across[0])); origin.setComponent(across[1], origin.getComponent(across[1]) + v * size.getComponent(across[1]));
      raycaster.set(origin.applyMatrix4(object.matrixWorld), direction.clone().transformDirection(object.matrixWorld)); raycaster.far = 2;
      if (raycaster.intersectObjects(meshes, false).length) hits++;
    }
    return hits;
  };
  const normal = new THREE.Vector3(); normal.setComponent(axis, blocked(1) <= blocked(-1) ? 1 : -1);
  return { center: center.toArray(), size: size.toArray(), normal: normal.toArray(), lightPosition: center.clone().addScaledVector(normal, .5).toArray() };
}

/** A planar UV over the two longest axes, for a slot whose mesh arrived without one. */
function ensureUv(mesh) {
  const geometry = mesh.geometry, uv = geometry.attributes.uv;
  if (uv && uv.array.some(value => value !== 0)) return;
  geometry.boundingBox ?? geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3()), min = geometry.boundingBox.min;
  const [u, v] = [0, 1, 2].sort((a, b) => size.getComponent(b) - size.getComponent(a)).slice(0, 2).sort(), position = geometry.attributes.position, data = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    data[i * 2] = (position.getComponent(i, u) - min.getComponent(u)) / (size.getComponent(u) || 1);
    data[i * 2 + 1] = (position.getComponent(i, v) - min.getComponent(v)) / (size.getComponent(v) || 1);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(data, 2));
}

/** Tube look over the emission map: barrel curvature, scan lines, grain, vignette and a slow flicker. */
function installTubeShader(material, screen) {
  const prior = material.onBeforeCompile, priorKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    prior.call(material, shader, renderer);
    Object.assign(shader.uniforms, { screenTime: screenClock, screenTube: { value: screen.scanlines }, screenFlicker: { value: screen.flicker }, screenSeed: { value: screen.seed } });
    shader.fragmentShader = 'uniform float screenTime, screenTube, screenFlicker, screenSeed;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `
#ifdef USE_EMISSIVEMAP
  vec2 cc = vEmissiveMapUv * 2.0 - 1.0;
  cc *= 1.0 + screenTube * 0.10 * dot(cc, cc);
  vec2 suv = cc * 0.5 + 0.5;
  float inside = step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);
  vec3 tube = texture2D(emissiveMap, suv).rgb * inside;
  float scan = 0.5 + 0.5 * sin(suv.y * 240.0 * 6.2831853);
  tube *= mix(1.0, 0.6 + 0.4 * scan, screenTube);
  float grain = fract(sin(dot(floor(suv * vec2(320.0, 240.0)) + floor(screenTime * 24.0) + screenSeed, vec2(12.9898, 78.233))) * 43758.5453);
  tube += (grain - 0.5) * 0.10 * screenTube;
  float vignette = smoothstep(0.0, 0.18, min(min(suv.x, 1.0 - suv.x), min(suv.y, 1.0 - suv.y)));
  float dip = step(0.92, fract(sin(floor(screenTime * 8.0) * 91.3 + screenSeed) * 4375.85));
  float flick = 1.0 - screenFlicker * (0.06 + 0.06 * sin(screenTime * 60.0) + 0.35 * dip);
  totalEmissiveRadiance *= max(tube, 0.0) * mix(1.0, vignette, screenTube) * flick;
#endif`);
  };
  material.customProgramCacheKey = () => `${priorKey}|screen-v1`;
}

/**
 * Draws the content of every screen in the scene on small canvases, one per distinct
 * content, and lays them over the `screen` slot of the models that own them.
 * Two screens with the same content share one canvas and one texture.
 */
export function createScreenRuntime({ loadImage = async () => null, createCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height }), small = false, onChange = () => {}, onError = () => {} } = {}) {
  const pool = new Map(), bound = new Map(), dims = small ? SMALL : SIZE;
  const probe = createCanvas(8, 6), probeContext = probe.getContext('2d', { willReadFrequently: true });
  let lastEntities = null, withScreen = [], destroyed = false;

  function acquire(screen) {
    const key = screenContentKey(screen);
    let entry = pool.get(key);
    if (entry) { entry.refs++; return entry; }
    const canvas = createCanvas(dims.width, dims.height), texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false; texture.userData.tabletopShared = true;
    entry = { key, screen, canvas, context: canvas.getContext('2d'), texture, refs: 1, frame: -1, lastDraw: -Infinity, draws: 0, average: new THREE.Color(0, 0, 0), luma: 0, image: null, animated: screenAnimated(screen) };
    pool.set(key, entry);
    if (screen.kind === 'image' && screen.imageRef) {
      Promise.resolve(loadImage(screen.imageRef)).then(image => { if (image && !destroyed && pool.get(key) === entry) { entry.image = image; entry.frame = -1; entry.lastDraw = -Infinity; onChange(); } })
        .catch(error => { if (!destroyed) onError(error); });
    }
    return entry;
  }
  function release(entry) {
    if (--entry.refs > 0) return;
    entry.texture.dispose(); pool.delete(entry.key);
  }

  function sampleAverage(entry) {
    probeContext.drawImage(entry.canvas, 0, 0, 8, 6);
    const data = probeContext.getImageData(0, 0, 8, 6).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) { r += linear(data[i]); g += linear(data[i + 1]); b += linear(data[i + 2]); }
    const count = data.length / 4; r /= count; g /= count; b /= count;
    entry.luma = .2126 * r + .7152 * g + .0722 * b;
    const peak = Math.max(r, g, b, 1e-4);
    entry.average.setRGB(r / peak, g / peak, b / peak, THREE.LinearSRGBColorSpace);
  }

  function draw(entry, t) {
    const { context: ctx, screen: s } = entry, { width: W, height: H } = dims;
    ctx.fillStyle = s.background; ctx.fillRect(0, 0, W, H);
    if (s.kind === 'static') {
      // Snow: a grey cell every 4 px, a new field each frame.
      const frame = Math.floor(t * 10), cells = ctx.createImageData(W / 4, H / 4);
      for (let i = 0; i < cells.data.length; i += 4) { const v = hashCell(i, frame, s.seed) * 255; cells.data[i] = cells.data[i + 1] = cells.data[i + 2] = v; cells.data[i + 3] = 255; }
      ctx.imageSmoothingEnabled = false; ctx.putImageData(cells, 0, 0); ctx.drawImage(entry.canvas, 0, 0, W / 4, H / 4, 0, 0, W, H);
    } else if (s.kind === 'image' && entry.image) {
      const image = entry.image, k = Math.min(W / image.width, H / image.height);
      ctx.drawImage(image, (W - image.width * k) / 2, (H - image.height * k) / 2, image.width * k, image.height * k);
    }
    if (s.kind === 'text') {
      let y = H * .12; ctx.fillStyle = s.color; ctx.textBaseline = 'top';
      for (const line of s.lines) {
        const px = Math.round(line.size * H); ctx.font = `bold ${px}px "Courier New", monospace`; ctx.textAlign = line.align;
        const text = line.text + (line.anim === 'dots' ? '.'.repeat(dotsAt(t)) : '') + (line.anim === 'cursor' && cursorAt(t) ? '_' : '');
        ctx.fillText(text, { left: W * .08, center: W / 2, right: W * .92 }[line.align], y, W * .84); y += px * 1.25;
      }
    }
    const share = progressAt(s.progress, t);
    if (share != null) {
      const x = W * .08, w = W * .84, h = H * .07, y = H * .8;
      ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); ctx.fillStyle = s.color; ctx.fillRect(x + 5, y + 5, (w - 10) * share, h - 10);
    }
    sampleAverage(entry);
    entry.texture.needsUpdate = true; entry.draws++;
  }

  // The glass is dark and everything the eye sees comes from the emission, which also feeds the bloom.
  function style(record) {
    const { material, saved, entry, screen } = record;
    material.onBeforeCompile = saved.onBeforeCompile; material.customProgramCacheKey = saved.customProgramCacheKey;
    material.emissiveMap = entry.texture; material.emissive.set('#ffffff'); material.emissiveIntensity = SCREEN_EMISSION;
    material.color.set('#06090a'); material.roughness = .55; material.metalness = 0;
    material.userData.screen = `${entry.key}|${screen.scanlines}|${screen.flicker}|${screen.seed}`;
    installTubeShader(material, screen); material.needsUpdate = true;
  }
  function bind(id, object, screen) {
    const entry = acquire(screen), materials = [];
    for (const [mesh, material] of screenMeshes(object)) {
      ensureUv(mesh);
      const saved = { color: material.color.clone(), emissive: material.emissive.clone(), emissiveIntensity: material.emissiveIntensity, emissiveMap: material.emissiveMap, roughness: material.roughness, metalness: material.metalness, onBeforeCompile: material.onBeforeCompile, customProgramCacheKey: material.customProgramCacheKey, userData: material.userData.screen };
      const record = { material, saved, entry, screen }; style(record); materials.push(record);
    }
    bound.set(id, { object, entry, screen, materials, children: object.children.length, signature: signatureOf(screen) });
    onChange();
  }
  function unbind(id) {
    const record = bound.get(id); if (!record) return;
    for (const { material, saved } of record.materials) {
      material.color.copy(saved.color); material.emissive.copy(saved.emissive); material.emissiveIntensity = saved.emissiveIntensity; material.emissiveMap = saved.emissiveMap;
      material.roughness = saved.roughness; material.metalness = saved.metalness; material.onBeforeCompile = saved.onBeforeCompile; material.customProgramCacheKey = saved.customProgramCacheKey;
      if (saved.userData === undefined) delete material.userData.screen; else material.userData.screen = saved.userData;
      material.needsUpdate = true;
    }
    bound.delete(id); release(record.entry); onChange();
  }
  const signatureOf = screen => `${screenContentKey(screen)}|${screen.scanlines}|${screen.flicker}|${screen.seed}`;

  /** Keeps what the models show in step with the document: binds new screens, rebinds edited ones, lets go of removed ones. */
  function syncBindings(document, objects) {
    const entities = document?.layout?.entities;
    if (entities !== lastEntities || !Object.isFrozen(entities ?? {})) { lastEntities = entities; withScreen = entities ? Object.values(entities).filter(record => record.screen) : []; }
    const live = new Set(withScreen.filter(record => record.screen.enabled && objects.has(record.id)).map(record => record.id));
    for (const id of [...bound.keys()]) if (!live.has(id) || bound.get(id).object !== objects.get(id)) unbind(id);
    for (const record of withScreen) {
      if (!live.has(record.id)) continue;
      const object = objects.get(record.id), current = bound.get(record.id), signature = signatureOf(record.screen);
      if (current && current.signature === signature && (current.materials.length || current.children === object.children.length)) {
        // Another pass (an environment binding, a material edit) may have overwritten the material.
        for (const item of current.materials) if (item.material.emissiveMap !== item.entry.texture || item.material.emissiveIntensity !== SCREEN_EMISSION) style(item);
        continue;
      }
      // Editing the tube effect keeps what was drawn: hold the canvas across the rebinding.
      const kept = current?.entry; if (kept) kept.refs++;
      unbind(record.id); bind(record.id, object, record.screen);
      if (kept) release(kept);
    }
  }

  /** Redraws what changed. Returns whether anything is still moving, so the viewport knows to come back. */
  function update(document, objects, t, paused, now) {
    screenClock.value = t;
    syncBindings(document, objects);
    let animated = false;
    for (const entry of pool.values()) {
      const frame = screenFrame(entry.screen, t);
      if (frame !== entry.frame && now - entry.lastDraw >= FRAME_MS) { draw(entry, t); entry.frame = frame; entry.lastDraw = now; }
      animated ||= entry.animated && !paused;
    }
    return animated;
  }

  const hex = color => `#${color.getHexString(THREE.SRGBColorSpace)}`;
  return {
    update,
    slotFrame: (object, slot) => screenSlotFrame(object, slot),
    /** What the light of a lit screen should take from it. */
    lightFor(id) {
      const record = bound.get(id);
      if (!record?.screen.enabled) return null;
      return { color: record.entry.average, scale: THREE.MathUtils.clamp(record.entry.luma / .12, .25, 1) };
    },
    info: () => [...bound].map(([id, record]) => ({ id, key: record.entry.key, frame: record.entry.frame, draws: record.entry.draws, average: hex(record.entry.average), luma: record.entry.luma, pool: pool.size, materials: record.materials.length })),
    get size() { return pool.size; },
    dispose() {
      destroyed = true;
      for (const id of [...bound.keys()]) unbind(id);
      for (const entry of pool.values()) entry.texture.dispose();
      pool.clear();
    },
  };
}
