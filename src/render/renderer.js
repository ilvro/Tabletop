import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { snapPosition, yawFromQuaternion } from '../domain/coords.js';
import { createAssetCache, disposeObject, standardMaterial } from './asset-cache.js';
import { applyTransform, readTransform, tagEntity, createFloor, createWall, createDoor, createToken, applyMaterialOverrides } from './scene-objects.js';

const values = (collection) => Array.isArray(collection) ? collection : Object.values(collection ?? {});
const DEFAULT_CAMERA = { projection: 'perspective', position: [12, 13, 15], target: [0, 0, 0], fov: 42, orthographicHeight: 18 };

/** Configures a dedicated 4th diagonal axis/arrow on TransformControls for uniform/proportional XYZ scale. */
export function setupUniformScaleGizmo(transform) {
  const helper = transform?.getHelper ? transform.getHelper() : null;
  const tcGizmo = helper?.children?.find((child) => child.isTransformControlsGizmo);
  if (!tcGizmo?.gizmo?.scale || !tcGizmo?.picker?.scale) return;

  // Remove the old invisible/internal center 0.1 box to avoid near-zero divide issues
  const oldGizmo = tcGizmo.gizmo.scale.children.find((child) => child.name === 'XYZ');
  if (oldGizmo) tcGizmo.gizmo.scale.remove(oldGizmo);
  const oldPicker = tcGizmo.picker.scale.children.find((child) => child.name === 'XYZ');
  if (oldPicker) tcGizmo.picker.scale.remove(oldPicker);

  const dir = new THREE.Vector3(1, 1, 1).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const length = 0.52;

  // Diagonal axis line
  const lineGeom = new THREE.CylinderGeometry(0.0075, 0.0075, length, 6);
  lineGeom.translate(0, length / 2, 0);
  lineGeom.applyQuaternion(q);

  // Arrow cone tip pointing outward along the diagonal
  const tipGeom = new THREE.ConeGeometry(0.04, 0.1, 12);
  tipGeom.translate(0, 0.05, 0);
  tipGeom.applyQuaternion(q);
  const tipPos = dir.clone().multiplyScalar(length);
  tipGeom.translate(tipPos.x, tipPos.y, tipPos.z);

  // Cube handle at the base of the arrow tip
  const cubeGeom = new THREE.BoxGeometry(0.07, 0.07, 0.07);
  cubeGeom.applyQuaternion(q);
  const cubePos = dir.clone().multiplyScalar(length + 0.02);
  cubeGeom.translate(cubePos.x, cubePos.y, cubePos.z);

  const createMaterial = () => new THREE.MeshBasicMaterial({
    color: 0xf5a623,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.9,
    toneMapped: false,
  });

  const lineMesh = new THREE.Mesh(lineGeom, createMaterial());
  lineMesh.name = 'XYZ';
  lineMesh.renderOrder = Infinity;

  const tipMesh = new THREE.Mesh(tipGeom, createMaterial());
  tipMesh.name = 'XYZ';
  tipMesh.renderOrder = Infinity;

  const cubeMesh = new THREE.Mesh(cubeGeom, createMaterial());
  cubeMesh.name = 'XYZ';
  cubeMesh.renderOrder = Infinity;

  tcGizmo.gizmo.scale.add(lineMesh, tipMesh, cubeMesh);

  // Picker cylinder along the 4th axis
  const pickerGeom = new THREE.CylinderGeometry(0.14, 0.14, length + 0.16, 8);
  pickerGeom.translate(0, (length + 0.16) / 2, 0);
  pickerGeom.applyQuaternion(q);
  const pickerMesh = new THREE.Mesh(pickerGeom, new THREE.MeshBasicMaterial({ visible: false }));
  pickerMesh.name = 'XYZ';

  tcGizmo.picker.scale.add(pickerMesh);
}

/** Runtime adapter only. Documents are read; all durable changes leave through callbacks. */
export function createViewport(container, {
  onSelect = () => {}, onTransform = () => {}, onPlace = () => {}, onRoomDraw = () => {},
  onCameraChange = () => {}, onError = () => {},
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Cena 3D — botão direito orbita, botão do meio desloca, roda aproxima');
  canvas.dataset.testid = 'viewport-canvas';
  canvas.tabIndex = 0;
  let renderer;
  try {
    const context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!context) throw new Error('WebGL 2 não está disponível. Ative a aceleração gráfica e abra em um navegador compatível.');
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: false });
  } catch (error) {
    onError(error);
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.append(canvas);

  const hint = document.createElement('div');
  hint.className = 'viewport-feedback';
  Object.assign(hint.style, { position: 'absolute', left: '18px', bottom: '18px', pointerEvents: 'none', padding: '8px 12px', color: '#e8eddf', background: 'rgba(12,28,29,.86)', borderRadius: '8px', font: '12px system-ui', display: 'none' });
  container.append(hint);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#25373a');
  const content = new THREE.Group();
  const lighting = new THREE.Group();
  const preview = new THREE.Group();
  scene.add(content, lighting, preview);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), standardMaterial({ color: '#253633', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.24;
  ground.receiveShadow = true;
  scene.add(ground);
  const selectionBox = new THREE.BoxHelper(new THREE.Object3D(), '#b2dec1');
  selectionBox.material.depthTest = false;
  selectionBox.material.transparent = true;
  selectionBox.material.opacity = 0.8;
  selectionBox.renderOrder = 6;
  selectionBox.visible = false;
  scene.add(selectionBox);

  let gridObject = null;
  let sceneDocument = null;
  let assets = new Map();
  let selectedId = null;
  let tool = 'select';
  let presentation = false;
  let cutaway = true;
  let destroyed = false;
  let generation = 0;
  let renderRequest = null;
  let width = 1, height = 1;
  let camera = new THREE.PerspectiveCamera(DEFAULT_CAMERA.fov, 1, 0.03, 1200);
  camera.position.fromArray(DEFAULT_CAMERA.position);
  let orthoHeight = DEFAULT_CAMERA.orthographicHeight;
  let lastPerspective = DEFAULT_CAMERA;
  let controls = null;
  let pointer = null;
  let gizmoCancelled = false;
  let altHeld = false;
  const objects = new Map();
  const records = new Map();
  const cache = createAssetCache();
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const transform = new TransformControls(camera, canvas);
  const gizmo = transform.getHelper();
  transform.setSize(0.82);
  setupUniformScaleGizmo(transform);
  scene.add(gizmo);

  function report(message) { if (!destroyed) onError(message instanceof Error ? message : new Error(message)); }
  function invalidate(shadows = false) {
    if (destroyed) return;
    if (shadows) renderer.shadowMap.needsUpdate = true;
    if (renderRequest == null) renderRequest = requestAnimationFrame(render);
  }
  function render() {
    renderRequest = null;
    if (destroyed) return;
    controls.update();
    updateCutaway();
    if (selectionBox.visible) selectionBox.update();
    renderer.render(scene, camera);
  }
  function attachOrbit(target) {
    controls?.dispose();
    controls = new OrbitControls(camera, canvas);
    controls.target.fromArray(target);
    controls.enableDamping = false;
    controls.minDistance = 1.1;
    controls.maxDistance = 260;
    controls.minZoom = 0.1;
    controls.maxZoom = 16;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.addEventListener('change', () => { invalidate(); onCameraChange(getCamera()); });
    controls.update();
  }
  attachOrbit(DEFAULT_CAMERA.target);

  function getCamera() {
    return { projection: camera.isOrthographicCamera ? 'orthographic' : 'perspective', position: camera.position.toArray(), target: controls.target.toArray(), fov: camera.isPerspectiveCamera ? camera.fov : (lastPerspective.fov ?? 42), orthographicHeight: camera.isOrthographicCamera ? orthoHeight / camera.zoom : orthoHeight };
  }
  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    if (camera.isPerspectiveCamera) camera.aspect = width / height;
    else { camera.left = -orthoHeight * width / height / 2; camera.right = orthoHeight * width / height / 2; camera.top = orthoHeight / 2; camera.bottom = -orthoHeight / 2; }
    camera.updateProjectionMatrix();
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function setCamera(preset) {
    const next = { ...DEFAULT_CAMERA, ...preset };
    if ((next.projection === 'orthographic') !== camera.isOrthographicCamera) {
      camera = next.projection === 'orthographic' ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.03, 1200) : new THREE.PerspectiveCamera(next.fov, width / height, 0.03, 1200);
      camera.position.fromArray(next.position);
      transform.camera = camera;
      attachOrbit(next.target);
    }
    camera.position.fromArray(next.position);
    camera.zoom = 1;
    controls.target.fromArray(next.target);
    if (camera.isPerspectiveCamera) camera.fov = next.fov;
    else orthoHeight = next.orthographicHeight;
    camera.lookAt(controls.target);
    resize();
    controls.update();
    onCameraChange(getCamera());
    invalidate();
  }
  function setTopView(enabled = !camera.isOrthographicCamera) {
    if (enabled && !camera.isOrthographicCamera) {
      lastPerspective = getCamera();
      const target = controls.target.toArray();
      setCamera({ projection: 'orthographic', position: [target[0], target[1] + 35, target[2] + 0.0001], target, orthographicHeight: Math.max(8, camera.position.distanceTo(controls.target) * 0.85) });
    } else if (!enabled && camera.isOrthographicCamera) setCamera(lastPerspective);
  }

  function frameBounds(bounds) {
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 0.8);
    let direction = camera.position.clone().sub(controls.target).normalize();
    if (direction.lengthSq() === 0) direction.set(0.65, 0.75, 0.8).normalize();
    if (camera.isOrthographicCamera) {
      orthoHeight = Math.max(size.x / (width / height), size.z, size.y) * 1.65;
      camera.zoom = 1;
      camera.position.copy(center).addScaledVector(direction, radius * 3 + 8);
    } else {
      const vertical = THREE.MathUtils.degToRad(camera.fov);
      const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * width / height);
      const distance = radius / Math.sin(Math.min(vertical, horizontal) / 2) * 1.12;
      camera.position.copy(center).addScaledVector(direction, distance);
    }
    controls.target.copy(center);
    resize();
    controls.update();
    onCameraChange(getCamera());
  }
  function frameSelection(id = selectedId) {
    const object = objects.get(id);
    if (object) frameBounds(new THREE.Box3().setFromObject(object));
  }
  function frameScene() { frameBounds(new THREE.Box3().setFromObject(content)); }

  function entityRecord(id) { return records.get(id); }
  function footprintFor(record, quaternion = record?.transform?.rotation) {
    if (!record) return undefined;
    const footprint = record.footprint ? [...record.footprint] : (sceneDocument?.tokens?.[record.id]?.footprint ? [...sceneDocument.tokens[record.id].footprint] : undefined);
    if (!footprint) return undefined;
    const yaw = ((yawFromQuaternion(quaternion ?? [0, 0, 0, 1]) % 180) + 180) % 180;
    if (Math.abs(yaw - 90) < 1e-4) footprint.reverse();
    return footprint;
  }
  function snapObject(object) {
    if (tool !== 'move' || altHeld || !sceneDocument?.layout?.grid?.snap) return;
    const footprint = footprintFor(entityRecord(selectedId), object.quaternion.toArray());
    const snapped = snapPosition(object.position.toArray(), sceneDocument.layout.grid, footprint);
    const axis = transform.axis;
    if (axis === 'X') {
      object.position.x = snapped[0];
    } else if (axis === 'Z') {
      object.position.z = snapped[2];
    } else if (axis === 'XZ' || axis === 'XYZ' || !axis) {
      object.position.x = snapped[0];
      object.position.z = snapped[2];
    }
  }
  function updateSelection() {
    transform.detach();
    const object = objects.get(selectedId);
    const record = entityRecord(selectedId);
    selectionBox.visible = Boolean(object && !presentation);
    if (selectionBox.visible) selectionBox.setFromObject(object);
    if (object && record && !presentation && !record.locked && ['move', 'rotate', 'scale'].includes(tool) && record.kind !== 'door') {
      const isLight = record.type === 'directional' || record.type === 'point';
      if (!(isLight && (tool === 'scale' || (tool === 'rotate' && record.type === 'point')))) {
        transform.setMode({ move: 'translate', rotate: 'rotate', scale: 'scale' }[tool]);
        transform.setSpace(tool === 'scale' ? 'local' : 'world');
        transform.showX = tool !== 'rotate' || !(record.kind === 'wall' || record.kind === 'floor' || sceneDocument?.tokens?.[record.id]);
        transform.showY = !(tool === 'scale' && record.kind === 'floor');
        transform.showZ = transform.showX;
        transform.setTranslationSnap(null); // Footprint/origin snapping belongs to the domain.
        transform.setRotationSnap(sceneDocument?.layout?.grid?.snap && !altHeld ? Math.PI / 12 : null);
        transform.attach(object);
      }
    }
    transform.enabled = !presentation && ['move', 'rotate', 'scale'].includes(tool);
    gizmo.visible = Boolean(transform.object && !presentation);
    invalidate();
  }
  function commitTransform(id, object, useSnap) {
    const version = generation;
    try { onTransform(id, readTransform(object), { snap: useSnap }); }
    catch (error) { report(error.message); }
    // A rejected/no-op callback must not leave a runtime transform masquerading as saved state.
    if (version === generation && sceneDocument) setDocument(sceneDocument);
  }
  transform.addEventListener('dragging-changed', (event) => { controls.enabled = !event.value; if (event.value) gizmoCancelled = false; invalidate(); });
  transform.addEventListener('objectChange', () => {
    if (transform.object) {
      if (tool === 'scale') {
        transform.object.scale.x = Math.max(0.01, transform.object.scale.x);
        transform.object.scale.y = Math.max(0.01, transform.object.scale.y);
        transform.object.scale.z = Math.max(0.01, transform.object.scale.z);
      }
      snapObject(transform.object);
    }
    invalidate(true);
  });
  transform.addEventListener('mouseUp', () => {
    if (transform.object && selectedId && !gizmoCancelled) commitTransform(selectedId, transform.object, Boolean(sceneDocument?.layout.grid.snap && !altHeld));
    controls.enabled = true;
  });

  function clearGroup(group) { for (const child of [...group.children]) disposeObject(child); }
  function createGrid(grid) {
    if (gridObject) disposeObject(gridObject);
    if (!grid) { gridObject = null; return; }
    const step = Math.max(0.05, grid.cellSize);
    // An even count keeps a line at the configured origin for every cell size.
    const divisions = Math.min(200, Math.max(20, Math.ceil(40 / step / 2) * 2));
    gridObject = new THREE.GridHelper(step * divisions, divisions, grid.color ?? '#8d9b82', grid.color ?? '#8d9b82');
    gridObject.position.set(grid.origin?.[0] ?? 0, 0.009, grid.origin?.[1] ?? 0);
    gridObject.material.transparent = true;
    gridObject.material.opacity = grid.opacity ?? 0.18;
    gridObject.material.depthWrite = false;
    gridObject.visible = Boolean(grid.visible && !presentation);
    scene.add(gridObject);
  }
  function assetRecord(reference) { return reference ? assets.get(`${reference.id}@${reference.revision ?? 1}`) : null; }
  function fallback(parent, label) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: '#c66a60', wireframe: true }));
    mesh.position.y = 0.35;
    mesh.userData.diagnostic = label;
    parent.add(mesh);
  }
  function installAsset(parent, entity, reference, version, appearance = null) {
    const record = assetRecord(reference);
    if (!record) { fallback(parent, 'Asset ausente'); report(`Asset ausente: ${reference?.id ?? 'sem ID'}.`); return; }
    const stillCurrent = () => !destroyed && version === generation && objects.get(entity.id) === parent;
    if (record.type === 'image' && appearance) {
      cache.texture(record).then((texture) => {
        if (!stillCurrent()) return;
        const aspect = (texture.image?.width ?? 1) / (texture.image?.height ?? 1);
        const image = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.25, aspect * 1.35), 1.35), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide }));
        image.position.y = 0.84;
        parent.add(image);
        const label = parent.children.find((child) => child.isSprite);
        if (label) label.position.y = 1.7;
        tagEntity(parent, entity.id);
        updateSelection();
        invalidate(true);
      }).catch((error) => { if (stillCurrent()) { fallback(parent, error.message); tagEntity(parent, entity.id); report(`Não foi possível abrir ${record.name}: ${error.message}`); invalidate(); } });
      return;
    }
    cache.createInstance(record).then((instance) => {
      if (!stillCurrent()) { disposeObject(instance); return; }
      parent.add(instance);
      applyMaterialOverrides(instance, entity.material, sceneDocument.look?.materialAdjustments?.[entity.id] ?? sceneDocument.defaultLook?.materialAdjustments?.[entity.id], true);
      tagEntity(parent, entity.id);
      updateSelection();
      updateShadowBounds();
      invalidate(true);
    }).catch((error) => { if (stillCurrent()) { fallback(parent, error.message); tagEntity(parent, entity.id); report(`Não foi possível abrir ${record.name}: ${error.message}`); invalidate(); } });
  }

  function createLight(record, parent, helper = true) {
    const wrapper = new THREE.Group();
    wrapper.position.fromArray(record.position);
    wrapper.quaternion.fromArray(record.rotation ?? [0, 0, 0, 1]).normalize();
    const source = record.type === 'point' ? new THREE.PointLight(record.color, record.intensity, record.distance ?? 12, 2) : new THREE.DirectionalLight(record.color, record.intensity);
    source.castShadow = Boolean(record.shadowEnabled);
    source.shadow.mapSize.set(1024, 1024);
    source.shadow.normalBias = 0.035;
    source.shadow.bias = -0.00008;
    source.shadow.camera.near = 0.1;
    if (record.type === 'directional') {
      const target = new THREE.Object3D();
      target.position.set(0, -1, 0);
      wrapper.add(target);
      source.target = target;
    } else source.shadow.camera.far = record.distance || 30;
    wrapper.add(source);
    if (helper) {
      const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshBasicMaterial({ color: record.color, wireframe: true, depthTest: false }));
      indicator.userData.editHelper = true;
      indicator.visible = !presentation;
      indicator.renderOrder = 5;
      wrapper.add(indicator);
    }
    wrapper.userData.source = source;
    tagEntity(wrapper, record.id);
    parent.add(wrapper);
    return wrapper;
  }
  function updateShadowBounds() {
    const bounds = new THREE.Box3().setFromObject(content);
    const radius = bounds.isEmpty() ? 15 : Math.max(8, bounds.getSize(new THREE.Vector3()).length() * 0.65);
    for (const wrapper of lighting.children) {
      const source = wrapper.userData.source;
      if (!source?.isDirectionalLight) continue;
      Object.assign(source.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, far: radius * 6 + 100 });
      source.shadow.camera.updateProjectionMatrix();
    }
  }
  function updateCutaway() {
    const viewDirection = camera.position.clone().sub(controls.target);
    viewDirection.y = 0;
    viewDirection.normalize();
    for (const [id, object] of objects) {
      const record = records.get(id);
      if (record?.kind !== 'wall') continue;
      const center = new THREE.Vector3(record.length / 2, record.height / 2, 0).applyMatrix4(object.matrixWorld);
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(object.quaternion);
      const inFront = center.clone().sub(controls.target).dot(viewDirection) > 0.2;
      const facing = Math.abs(normal.dot(viewDirection)) > 0.45;
      const visible = !(cutaway && inFront && facing && !(selectedId === id && !presentation));
      if (object.visible !== visible) { object.visible = visible; renderer.shadowMap.needsUpdate = true; }
    }
    for (const [id, object] of objects) if (records.get(id)?.kind === 'door') {
      // Cutaway removes the tall wall, retaining the door as a readable room entrance.
      const visible = true;
      if (object.visible !== visible) { object.visible = visible; renderer.shadowMap.needsUpdate = true; }
    }
  }

  function setDocument(next) {
    generation += 1;
    sceneDocument = next;
    cancelPointer();
    transform.detach();
    clearGroup(content);
    clearGroup(lighting);
    objects.clear();
    records.clear();
    createGrid(next?.layout?.grid);
    if (!next) { cache.prune([]); invalidate(true); return; }
    const look = next.look ?? next.defaultLook;
    scene.background.set(look.background);
    ground.material.color.set(look.fill?.groundColor ?? '#283934');
    lighting.add(new THREE.HemisphereLight(look.fill?.skyColor ?? '#dbe7e4', look.fill?.groundColor ?? '#524938', look.fill?.intensity ?? 1));
    const entities = values(next.layout.entities);
    const doors = entities.filter((record) => record.kind === 'door');
    const usedAssets = [];
    for (const entity of entities) {
      let object;
      if (entity.kind === 'floor') object = createFloor(entity);
      else if (entity.kind === 'wall') object = createWall(entity, doors.filter((door) => door.wallId === entity.id));
      else if (entity.kind === 'door') {
        const wall = next.layout.entities[entity.wallId];
        if (!wall) continue;
        object = createDoor(entity, wall, next.sessionState?.doors?.[entity.id]);
      } else if (entity.kind === 'prop') { object = new THREE.Group(); applyTransform(object, entity.transform); }
      else continue;
      object.name = entity.name;
      content.add(object);
      objects.set(entity.id, object);
      records.set(entity.id, entity);
      if (entity.kind === 'prop') {
        const asset = assetRecord(entity.assetRef);
        if (asset) usedAssets.push(asset);
        installAsset(object, entity, entity.assetRef, generation);
      } else applyMaterialOverrides(object, undefined, look.materialAdjustments?.[entity.id]);
    }
    for (const token of values(next.tokens)) {
      const actor = next.actors[token.actorId];
      const object = createToken(token, actor);
      object.name = actor?.name ?? 'Token';
      content.add(object);
      objects.set(token.id, object);
      records.set(token.id, token);
      const appearance = object.userData.appearance;
      if (appearance.assetRef) {
        const asset = assetRecord(appearance.assetRef);
        if (asset) usedAssets.push(asset);
        installAsset(object, token, appearance.assetRef, generation, appearance);
      }
    }
    for (const record of values(look.lights)) {
      const object = createLight(record, lighting);
      objects.set(record.id, object);
      records.set(record.id, record);
    }
    cache.prune(usedAssets);
    content.updateMatrixWorld(true);
    updateShadowBounds();
    updateSelection();
    invalidate(true);
  }

  function setPreview(proposal) {
    clearGroup(preview);
    if (!proposal || presentation) { invalidate(); return; }
    const entities = values(proposal.entities ?? proposal.layout?.entities);
    const doors = entities.filter((entity) => entity.kind === 'door');
    for (const entity of entities) {
      let object;
      if (entity.kind === 'floor') object = createFloor(entity);
      else if (entity.kind === 'wall') object = createWall(entity, doors.filter((door) => door.wallId === entity.id));
      else if (entity.kind === 'door') {
        const wall = entities.find((item) => item.id === entity.wallId);
        if (wall) object = createDoor(entity, wall, entity.initialAngle);
      }
      if (!object) continue;
      object.traverse((child) => {
        if (!child.material) return;
        child.material.color.set('#8bcea7');
        child.material.transparent = true;
        child.material.opacity = 0.26;
        child.material.depthWrite = false;
        child.castShadow = false;
        child.receiveShadow = false;
        child.userData.entityId = undefined;
      });
      preview.add(object);
    }
    for (const light of values(proposal.lights)) {
      const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), new THREE.MeshBasicMaterial({ color: light.color, wireframe: true }));
      indicator.position.fromArray(light.position);
      preview.add(indicator);
    }
    invalidate();
  }

  function rayFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(mouse, camera);
  }
  function visibleInHierarchy(object) { for (let current = object; current; current = current.parent) if (!current.visible) return false; return true; }
  function pick(event) {
    rayFromEvent(event);
    return raycaster.intersectObjects([...objects.values()], true).find((hit) => hit.object.userData.entityId && !hit.object.userData.decorative && visibleInHierarchy(hit.object));
  }
  function supportPoint(event, planeY = 0) {
    rayFromEvent(event);
    const floors = [...objects].filter(([id]) => records.get(id)?.kind === 'floor').map(([, object]) => object);
    const hit = raycaster.intersectObjects(floors, true).find((intersection) => intersection.face?.normal.y > 0.5 && visibleInHierarchy(intersection.object));
    if (hit && Math.abs(planeY) < 1e-4) return { position: hit.point.toArray(), surfaceId: hit.object.userData.entityId };
    plane.constant = -planeY;
    const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    return point ? { position: point.toArray(), surfaceId: null } : null;
  }
  function onPointerDown(event) {
    if (event.button !== 0 || presentation || transform.dragging) return;
    canvas.focus({ preventScroll: true });
    altHeld = event.altKey;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    if (tool === 'room') {
      const support = supportPoint(event);
      if (!support) { pointer = null; return; }
      pointer.roomStart = support.position;
      controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
    } else if (tool === 'move') {
      const hit = pick(event);
      const id = hit?.object.userData.entityId;
      const record = entityRecord(id);
      if (id && record && record.kind !== 'door' && !record.locked && record.type !== 'directional' && record.type !== 'point') {
        if (selectedId !== id) {
          onSelect(id);
          // A host may rebuild its viewport when selection changes.
          pointer ??= { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        }
        const object = objects.get(id);
        if (!object) return;
        pointer.object = object;
        pointer.entityId = id;
        pointer.initial = readTransform(object);
        pointer.planeStart = supportPoint(event, object.position.y)?.position;
        controls.enabled = false;
        canvas.setPointerCapture(event.pointerId);
      }
    }
  }
  function onPointerMove(event) {
    altHeld = event.altKey;
    if (!pointer || pointer.id !== event.pointerId || presentation) return;
    pointer.moved ||= Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4;
    if (pointer.roomStart) {
      const point = supportPoint(event, pointer.roomStart[1]);
      if (!point) return;
      const start = snapPosition(pointer.roomStart, { ...sceneDocument.layout.grid, snap: sceneDocument.layout.grid.snap && !altHeld });
      const end = snapPosition(point.position, { ...sceneDocument.layout.grid, snap: sceneDocument.layout.grid.snap && !altHeld });
      pointer.roomEnd = end;
      pointer.snappedStart = start;
      const w = Math.abs(end[0] - start[0]), l = Math.abs(end[2] - start[2]);
      clearGroup(preview);
      const positions = [start[0], start[1] + 0.035, start[2], end[0], start[1] + 0.035, start[2], end[0], start[1] + 0.035, end[2], start[0], start[1] + 0.035, end[2], start[0], start[1] + 0.035, start[2]];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      preview.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#b2dec1', depthTest: false })));
      hint.textContent = `${w.toFixed(1)} × ${l.toFixed(1)} m · solte para revisar a sala`;
      hint.style.display = '';
      invalidate();
    } else if (pointer.object && pointer.planeStart && pointer.moved) {
      const support = supportPoint(event, pointer.initial.position[1]);
      if (!support) return;
      const candidate = [...pointer.initial.position];
      candidate[0] += support.position[0] - pointer.planeStart[0];
      candidate[2] += support.position[2] - pointer.planeStart[2];
      pointer.object.position.fromArray(snapPosition(candidate, { ...sceneDocument.layout.grid, snap: sceneDocument.layout.grid.snap && !altHeld }, footprintFor(entityRecord(pointer.entityId), pointer.object.quaternion.toArray())));
      hint.textContent = `X ${pointer.object.position.x.toFixed(2)} · Z ${pointer.object.position.z.toFixed(2)} m${altHeld ? ' · livre' : ''}`;
      hint.style.display = '';
      invalidate(true);
    }
  }
  function onPointerUp(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const gesture = pointer;
    pointer = null;
    controls.enabled = true;
    hint.style.display = 'none';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (gesture.roomStart) {
      clearGroup(preview);
      if (gesture.roomEnd && gesture.moved) {
        const start = gesture.snappedStart ?? gesture.roomStart, end = gesture.roomEnd;
        const room = { width: Math.abs(end[0] - start[0]), length: Math.abs(end[2] - start[2]), center: [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2] };
        if (room.width >= 1 && room.length >= 1) onRoomDraw(room);
        else report('Desenhe uma sala com pelo menos 1 m de largura e comprimento.');
      }
    } else if (gesture.object && gesture.moved) commitTransform(gesture.entityId, gesture.object, Boolean(sceneDocument?.layout.grid.snap && !event.altKey));
    else if (!gesture.moved && !transform.dragging) {
      if (tool === 'place') {
        const support = supportPoint(event);
        if (support) onPlace({ ...support, snap: Boolean(sceneDocument?.layout.grid.snap && !event.altKey) });
      } else if (tool !== 'room') onSelect(pick(event)?.object.userData.entityId ?? null);
    }
    invalidate();
  }
  function cancelPointer() {
    if (pointer?.object && pointer.initial) applyTransform(pointer.object, pointer.initial);
    const id = pointer?.id;
    pointer = null;
    if (id != null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    controls.enabled = true;
    hint.style.display = 'none';
  }
  function cancelGesture() {
    if (transform.dragging) { gizmoCancelled = true; transform.reset(); transform.pointerUp(null); }
    if (pointer?.roomStart) clearGroup(preview);
    cancelPointer();
    invalidate(true);
  }
  function onKeyDown(event) {
    altHeld = event.altKey;
    if (event.key === 'Escape') cancelGesture();
    if (transform.object) transform.setRotationSnap(sceneDocument?.layout?.grid?.snap && !altHeld ? Math.PI / 12 : null);
  }
  function onKeyUp(event) { altHeld = event.altKey; }
  function onContextMenu(event) { event.preventDefault(); }
  function syncGizmoPlane(event) {
    if (presentation || !transform.enabled || !transform.object) return;
    const pointerPos = transform._getPointer ? transform._getPointer(event) : null;
    if (pointerPos) {
      transform.pointerHover(pointerPos);
      gizmo.updateMatrixWorld(true);
    }
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button === 0) syncGizmoPlane(event);
  }, { capture: true });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointer && !transform.dragging && transform.enabled && transform.object && !presentation) {
      const prevAxis = transform.axis;
      syncGizmoPlane(event);
      if (transform.axis !== prevAxis) invalidate();
    }
  }, { passive: true });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', cancelGesture);
  canvas.addEventListener('lostpointercapture', () => { if (pointer) cancelGesture(); });
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    setDocument,
    setAssets(next) {
      const replacement = new Map(values(next?.assets ?? next).map((record) => [`${record.id}@${record.revision ?? 1}`, record]));
      const changed = replacement.size !== assets.size || [...replacement].some(([key, record]) => JSON.stringify(record) !== JSON.stringify(assets.get(key)));
      assets = replacement;
      if (changed && sceneDocument) {
        // Snapshot delivery calls setAssets then setDocument. Avoid rebuilding the old
        // scene with the new catalog, which would report temporarily missing assets.
        const version = generation;
        queueMicrotask(() => { if (!destroyed && version === generation) setDocument(sceneDocument); });
      }
    },
    setSelection(id) { selectedId = id; updateSelection(); },
    setTool(mode) { cancelGesture(); tool = mode; canvas.style.cursor = mode === 'place' || mode === 'room' ? 'crosshair' : 'default'; updateSelection(); },
    setPreview,
    setPresentation(enabled) {
      presentation = enabled;
      cancelGesture();
      preview.visible = !enabled;
      if (gridObject) gridObject.visible = !enabled && Boolean(sceneDocument?.layout?.grid?.visible);
      lighting.traverse((child) => { if (child.userData.editHelper) child.visible = !enabled; });
      updateSelection();
      invalidate();
    },
    getCamera, setCamera, setTopView, frameSelection, frameScene,
    setCutaway(enabled) { cutaway = enabled; invalidate(true); },
    setExposure(exposure) { renderer.toneMappingExposure = Math.max(0.2, Math.min(4, exposure)); invalidate(); },
    project(position) {
      camera.updateMatrixWorld(true);
      const vector = new THREE.Vector3(...position).project(camera);
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + (vector.x + 1) * rect.width / 2, y: rect.top + (1 - vector.y) * rect.height / 2, visible: vector.z >= -1 && vector.z <= 1 && Math.abs(vector.x) <= 1 && Math.abs(vector.y) <= 1 };
    },
    getInfo() { return { objects: objects.size, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
    destroy() {
      destroyed = true;
      generation += 1;
      if (renderRequest != null) cancelAnimationFrame(renderRequest);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.dispose();
      transform.dispose();
      clearGroup(content);
      clearGroup(lighting);
      clearGroup(preview);
      if (gridObject) disposeObject(gridObject);
      disposeObject(ground);
      disposeObject(selectionBox);
      cache.destroy();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      hint.remove();
    },
  };
}
