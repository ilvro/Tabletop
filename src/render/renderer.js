import { isTrustedSnapshot } from '../state/immutable.js';
import { createPerformanceDiagnostics, createGpuTimer } from '../diagnostics/performance.js';
import { wallJoinProfile } from '../authoring/structures.js';
import { createLightManager } from './light-manager.js';
import { createLightingZones } from './lighting-zones.js';
import { createCutawayShadows } from './cutaway-shadows.js';
import { createLightingHelpers } from './lighting-helpers.js';
import { focusDirectionalShadow } from './directional-shadows.js';
import { createReflectionEnvironment } from './reflections.js';
import { updateBoundLights, applyBoundEmission } from './bound-light.js';
import {isSculptableRock,ROCK_SCULPT_LIMIT} from '../domain/rock-sculpt.js';
import {prepareRockSculpt,applyRockStamp,rockBrushStamp,sculptFootprint} from './rock-sculpt.js';
import { hasPhysicalSnow } from '../domain/snow.js';
import { createWater, updateWater } from './water.js';
import { addPhysicalSnow, clearPhysicalSnow, snowOccluders, createExposureTest } from './physical-snow.js';
import { worldPoint } from '../domain/geometry.js';
import { createSurfaceLibrary, applySurfaceTextures } from './surface-materials.js';
import { createLocalEffect, updateLocalEffect } from './local-effects.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { assemblyFor, assemblyMembers } from '../domain/assemblies.js';
import { snapPosition, yawFromQuaternion } from '../domain/coords.js';
import { groupChain, isLocked, isVisible, isSupport, isAccess, supportHeightAt, constrainOpening } from '../domain/geometry.js';
import { createAssetCache, disposeObject, standardMaterial } from './asset-cache.js';
import { applyTransform, readTransform, tagEntity, createFloor, createTerrain, updateTerrain, syncTerrainPicking, createAccess, createWall, createDoor, createWindow, createToken, applyMaterialOverrides } from './scene-objects.js';
import { sculptTerrain, paintTerrain, terrainBrushOutline, protectTerrainFloors } from '../authoring/terrain.js';
import { createAtmosphere, applyEnvironmentMaterials, materialSlots } from './atmosphere.js';
import { primaryLight } from '../domain/environments.js';
import { environmentBindingActive } from '../domain/lighting.js';
import { createLightObject, updateLightEffects } from './lighting.js';
import { createEffectsPipeline } from './effects.js';
import { advanceVelocity, navigationDirection, interpolateCamera } from './camera-motion.js';
import { createRuler } from './ruler.js';
import { createMaterialSharing } from './material-sharing.js';

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
  onSelect = () => {}, onMaterialPick = () => {}, onIlluminationOrigin = () => {}, onTransform = () => {}, onPlace = () => {}, onRoomDraw = () => {},
  onCameraChange = () => {}, onError = () => {}, onContextMenu: onContextMenuCb = () => {}, onPolygonDraw = () => {},
  onWindowPlace = () => {}, onOpeningMove = () => {}, onTerrainStroke = () => {}, onRockStroke = () => {}, onWaterStroke = () => {}, onMaterialSlots = () => {},
  onMeasurementChange = () => {}, onLightingDiagnostics = () => {}, navigationEnabled = true,
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', navigationEnabled ? 'Cena 3D — WASD desloca, Shift acelera, Page Up/Down altera altura, botão direito orbita, roda aproxima' : 'Cena publicada pelo mestre');
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
  renderer.info.autoReset=false;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.append(canvas);

  const hint = document.createElement('div');
  hint.className = 'viewport-feedback';
  Object.assign(hint.style, { position: 'absolute', left: '18px', bottom: '18px', pointerEvents: 'none', padding: '8px 12px', color: '#e8eddf', background: 'rgba(12,28,29,.86)', borderRadius: '8px', font: '12px system-ui', display: 'none' });
  container.append(hint);
  const scene = new THREE.Scene();
  const diagnostics = createPerformanceDiagnostics();
  const gpuTimer = createGpuTimer(renderer.getContext(), diagnostics);
  const effects = createEffectsPipeline(renderer, scene);
  const atmosphere = createAtmosphere(scene);
  const surfaces = createSurfaceLibrary(), localEffects = new Map();
  const lightManager=createLightManager(scene),zones=createLightingZones(),reflections=createReflectionEnvironment(renderer,scene),boundLights=new Map(),signatures=new Map();
  const cutawayCasters=createCutawayShadows(scene),lightingHelpers=createLightingHelpers(scene),timings={render:[],update:[]};
  const sample=(key,start)=>{timings[key].push(performance.now()-start);if(timings[key].length>120)timings[key].shift();};
  const metrics=()=>Object.fromEntries(Object.entries(timings).map(([key,values])=>{const sorted=[...values].sort((a,b)=>a-b);return [key,{samples:values.length,p50:sorted[Math.floor(sorted.length*.5)]??0,p95:sorted[Math.floor(sorted.length*.95)]??0}];}));
  let runtimeStats={created:0,reused:0,removed:0};
  let hemisphere;const readingLight=new THREE.AmbientLight(0xffffff,1.2);readingLight.visible=false;scene.add(readingLight);
  let localEffectsEnabled = true, animatedLocalEffects = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onReducedMotion = () => invalidate();
  reducedMotion.addEventListener('change', onReducedMotion);
  const shadowBounds=new THREE.Box3();
  let snowDirty=false, snowTriangles=0, animatedWater=false,snowRegions=null;
  let effectTime = 0, animatedLights = false, animatedAtmosphere = false;
  scene.background = new THREE.Color('#25373a');
  const content = new THREE.Group();
  const materialSharing = createMaterialSharing(); let shareMaterials = true;
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
  let selectedIds = [], extraSelections = [];
  let supportSurface = undefined, workplaneHeight = 0, polygonPoints = [], previewGeneration = 0;
  let isolatedLevel = null, terrainBrush = { mode: 'raise', radius: 2, strength: .25, target: 0 };
  const polygonLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#e3b878', depthTest: false }));
  polygonLine.visible = false; polygonLine.renderOrder = 8; scene.add(polygonLine);
  const brushLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#e3b878', depthTest: false }));
  brushLine.visible = false; brushLine.renderOrder = 8; scene.add(brushLine);
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
  const navigationKeys = new Set();
  const perspectiveHeightCodes = new Set(['Space', 'ControlLeft', 'ControlRight']);
  const movementCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'PageUp', 'PageDown', ...perspectiveHeightCodes]);
  let velocity = [0, 0, 0], navigationSpeed = 6, fastNavigation = false;
  let transition = null, lastFrameTime = null, orbitMoving = false;
  let pointer = null;
  let contextPointer = null;
  let gizmoCancelled = false;
  let altHeld = false;
  let rulerSnap = false;
  const ruler = createRuler(container, scene, onMeasurementChange);
  const objects = new Map();
  const records = new Map();
  const cache = createAssetCache();
  const pendingAssets = new Set();
  function trackAsset(promise) {
    pendingAssets.add(promise);
    promise.finally(() => pendingAssets.delete(promise));
  }
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const transform = new TransformControls(camera, canvas);
  const gizmo = transform.getHelper();
  gizmo.userData.editHelper=true;
  transform.setSize(0.82);
  setupUniformScaleGizmo(transform);
  scene.add(gizmo);

  function report(message) { if (!destroyed) onError(message instanceof Error ? message : new Error(message)); }
  let pickBounds = new WeakMap(), assetsDirty = false, pendingTerrain, suspended=false;
  let wallProfilesKey, wallProfiles = new Map();
  const retiredObjects=new Map();
  function releaseRetired(){for(const object of retiredObjects.values())disposeObject(object);retiredObjects.clear();}
  let lightObjects=[],waterObjects=[],warmupTimer,warmupRequested=false,warmupPromise;
  async function warmShaders(){
    if(warmupPromise)await warmupPromise;
    if(destroyed||!warmupRequested||!sceneDocument||pointer||transform.dragging||transition)return;
    warmupRequested=false;clearTimeout(warmupTimer);
    // Compile authored visible content using the scene's lights; omit hidden editing helpers.
    const subset={traverseVisible(){},traverse(visitor){content.traverseVisible(visitor);visitor(ground);}};
    const pending=diagnostics.measureAsync('shaderWarmup',()=>renderer.compileAsync(subset,camera,scene));warmupPromise=pending;
    try{await pending;}finally{if(warmupPromise===pending)warmupPromise=null;}
  }
  function scheduleWarmup(){
    if(!renderer.compileAsync||destroyed)return;
    warmupRequested=true;clearTimeout(warmupTimer);
    warmupTimer=setTimeout(async()=>{
      if(destroyed||!warmupRequested||!sceneDocument)return;
      if(pendingAssets.size||pointer||transform.dragging||transition){scheduleWarmup();return;}
      try{await warmShaders();}catch(error){report(error);}
    },100);
  }
  function invalidate(shadows = false) {
    if (destroyed) return;
    if (shadows) { pickBounds = new WeakMap(); diagnostics.count('globalShadowInvalidations'); renderer.shadowMap.needsUpdate = true;lightManager.invalidate();for(const o of objects.values())if(o.userData.source?.isDirectionalLight)o.userData.source.shadow.needsUpdate=true; }
    if (!suspended && renderRequest == null) renderRequest = requestAnimationFrame(render);
  }
  function render(now) {
    const started=performance.now();
    renderRequest = null;
    if (destroyed || suspended) return;
    const elapsed = Math.max(0, (now - (lastFrameTime ?? now)) / 1000);
    const seconds = Math.min(.05, elapsed);
    lastFrameTime = now;
    let moving = false;
    if (transition) {
      const progress = Math.min(1, (now - transition.start) / (transition.duration * 1000));
      applyCamera(interpolateCamera(transition.from, transition.to, progress));
      if (progress === 1) transition = null;
      moving = Boolean(transition);
    } else if (navigationEnabled && controls.enabled && !pointer && !transform.dragging && document.activeElement === canvas) {
      const desired = navigationDirection(camera, navigationKeys).map(value => value * navigationSpeed * (fastNavigation ? 3 : 1));
      const step = advanceVelocity(velocity, desired, seconds);
      velocity = step.velocity;
      if (Math.hypot(...velocity) < .001 && !navigationKeys.size) velocity = [0, 0, 0];
      const displacement = new THREE.Vector3(...step.displacement);
      camera.position.add(displacement); controls.target.add(displacement);
      moving = navigationKeys.size > 0 || Math.hypot(...velocity) > 0;
    }
    controls.dampingFactor = 1 - Math.exp(-12 * Math.max(seconds, 1 / 240));
    // Ambient animation must not keep consuming sub-threshold orbit damping.
    const orbitChanged = Boolean(controls.enabled && (orbitMoving || moving || transition) && controls.update(seconds));
    orbitMoving = Boolean(orbitChanged);
    if(pendingTerrain){const next=pendingTerrain;pendingTerrain=null;replaceTerrain(next);}
    if (assetsDirty) { assetsDirty = false; diagnostics.measure('assetBounds', () => {updateShadowBounds();updateSelection();}); snowDirty = true;invalidate(true); }
    updateCutaway();
    if (selectionBox.visible) selectionBox.update();
    const effectsPaused = sceneDocument?.look?.effectsPaused ?? sceneDocument?.defaultLook?.effectsPaused;
    const paused = Boolean(effectsPaused || reducedMotion.matches || document.hidden);
    if (!paused) effectTime += elapsed;
    animatedLights = updateLightEffects(lightObjects, effectTime, paused);
    animatedAtmosphere = atmosphere.update(camera, effectTime, paused, height * renderer.getPixelRatio());
    animatedLocalEffects = false;
    for (const effect of localEffects.values()) animatedLocalEffects = updateLocalEffect(effect,effectTime,localEffectsEnabled,paused) || animatedLocalEffects;
    const descriptors=lightObjects.filter(o=>!o.userData.source.isDirectionalLight).map(wrapper=>({id:wrapper.userData.lightRecord.id,wrapper,source:wrapper.userData.source,record:wrapper.userData.lightRecord}));
    if(sceneDocument)descriptors.push(...diagnostics.measure('boundLights',()=>updateBoundLights(sceneDocument,objects,boundLights,effectTime,paused,visibleRecord,generation)));
    for(const [id,effect]of localEffects){const data=effect.userData.localEffect;if(data.light && !sceneDocument.layout.entities[id]?.illumination)descriptors.push({id:id+':fire',wrapper:effect,source:data.light,record:{type:'point',distance:data.light.distance,priority:10,shadowEnabled:false}});}
    animatedLights ||= [...boundLights.values()].some(b=>b.wrapper.visible&&b.wrapper.userData.lightRecord.enabled&&!paused&&b.wrapper.userData.lightRecord.flicker?.enabled);
    content.updateMatrixWorld(true);lighting.updateMatrixWorld(true);camera.updateMatrixWorld();
    updateShadowBounds(false);
    if(cutawayCasters.update(objects,records,Boolean((sceneDocument?.look??sceneDocument?.defaultLook)?.rendering?.cutawayShadows),visibleRecord))invalidate(true);
    diagnostics.measure('zones',()=>zones.update(sceneDocument,objects));
    lightingHelpers.update(records.get(selectedId),objects.get(selectedId),!presentation);
    diagnostics.measure('lightBudget',()=>lightManager.update(descriptors,camera,controls.target));if(lightManager.needsShadowUpdate())renderer.shadowMap.needsUpdate=true;
    onLightingDiagnostics(lightManager.info());
    if(snowDirty) diagnostics.measure('snow', rebuildSnow);
    animatedWater=false;for(const object of waterObjects)animatedWater=updateWater(object,effectTime,paused)||animatedWater;
    ruler.project(camera, width, height);
    effects.setLighting?.(zones,lightManager.volumeLights(),lightManager.quality);
    renderer.info.reset();
    if (renderer.shadowMap.needsUpdate) diagnostics.count('shadowFrames');
    gpuTimer.begin();
    if (shareMaterials) diagnostics.measure('shareMaterials', () => materialSharing.begin(content));
    try { diagnostics.measure('render', () => effects.render(camera, seconds)); } finally { materialSharing.end();gpuTimer.end();releaseRetired(); }
    sample('render',started);
    if ((moving || orbitChanged || animatedLights || animatedAtmosphere || animatedLocalEffects || animatedWater) && !document.hidden) invalidate();
    else lastFrameTime = null;
  }
  function attachOrbit(target) {
    controls?.dispose();
    controls = new OrbitControls(camera, canvas);
    controls.target.fromArray(target);
    controls.enableDamping = true;
    controls.dampingFactor = .18;
    controls.screenSpacePanning = false;
    controls.minDistance = 1.1;
    controls.maxDistance = 260;
    controls.minZoom = 0.1;
    controls.maxZoom = 16;
    controls.maxPolarAngle = Math.PI - .05;
    controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.addEventListener('change', () => { orbitMoving = true; invalidate(); onCameraChange(getCamera()); });
    // Mouse navigation interrupts a shot while preserving held keys and velocity.
    controls.addEventListener('start', () => { transition = null; orbitMoving = true; invalidate(); });
    controls.enabled = navigationEnabled;
    controls.update();
  }
  attachOrbit(DEFAULT_CAMERA.target);

  function getCamera() {
    return { projection: camera.isOrthographicCamera ? 'orthographic' : 'perspective', position: camera.position.toArray(), target: controls.target.toArray(), fov: camera.isPerspectiveCamera ? camera.fov : (lastPerspective.fov ?? 42), orthographicHeight: camera.isOrthographicCamera ? orthoHeight / camera.zoom : orthoHeight };
  }
  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    // A transition changes the lens/frustum every frame, not the drawing buffer size.
    const ratio = renderer.getPixelRatio();
    if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) renderer.setSize(width, height, false);
    if (camera.isPerspectiveCamera) camera.aspect = width / height;
    else { camera.left = -orthoHeight * width / height / 2; camera.right = orthoHeight * width / height / 2; camera.top = orthoHeight / 2; camera.bottom = -orthoHeight / 2; }
    camera.updateProjectionMatrix();
    effects.resize(width, height);
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function applyCamera(next) {
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
  function resetNavigation() { navigationKeys.clear(); velocity = [0, 0, 0]; fastNavigation = false; }
  function stopCameraMotion(finish = false) {
    const destination = finish && transition?.to;
    transition = null; resetNavigation();
    // Flush accumulated damping without replacing listeners during a pointer gesture.
    const position = camera.position.clone(), target = controls.target.clone();
    controls.enableDamping = false; controls.update();
    camera.position.copy(position); controls.target.copy(target);
    controls.enableDamping = true; controls.update();
    orbitMoving = false;
    if (destination) applyCamera(destination);
    invalidate();
  }
  function setCamera(preset, { duration = 0 } = {}) {
    const next = { ...DEFAULT_CAMERA, ...preset };
    stopCameraMotion();
    if (duration > 0 && next.projection === getCamera().projection && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      transition = { from: getCamera(), to: next, start: performance.now(), duration: Math.min(10, duration) };
      invalidate();
    } else applyCamera(next);
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
    stopCameraMotion();
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
  function framePreview() { if(preview.children.length) frameBounds(new THREE.Box3().setFromObject(preview)); }
  function frameScene() { const bounds = new THREE.Box3(); for (const [key, object] of objects) if (object.visible && !records.get(key)?.type) bounds.expandByObject(object); frameBounds(bounds); }

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
    for (const helper of extraSelections) disposeObject(helper); extraSelections = [];
    if (!presentation) for (const id of selectedIds.filter(id => id !== selectedId)) {
      const object = objects.get(id); if (!object?.visible) continue;
      const helper = new THREE.BoxHelper(object, '#e3b878'); helper.material.depthTest = false; scene.add(helper); extraSelections.push(helper);
    }
    const object = objects.get(selectedId);
    const record = entityRecord(selectedId);
    selectionBox.visible = Boolean(object?.visible && !presentation);
    if (selectionBox.visible) selectionBox.setFromObject(object);
    if (object?.visible && record && !presentation && selectedIds.length <= 1 && !isLocked(sceneDocument, record) && ['move', 'rotate', 'scale'].includes(tool) && !['door', 'window'].includes(record.kind)) {
      const isLight = ['directional', 'point', 'spot'].includes(record.type);
      if (!(isLight && (tool === 'scale' || (tool === 'rotate' && record.type === 'point')))) {
        transform.setMode({ move: 'translate', rotate: 'rotate', scale: 'scale' }[tool]);
        transform.setSpace(tool === 'scale' ? 'local' : 'world');
        transform.showX = tool !== 'rotate' || !(record.kind === 'assembly' || record.kind === 'wall' || record.kind === 'floor' || record.kind === 'terrain' || record.kind === 'water' || isAccess(record) || sceneDocument?.tokens?.[record.id]);
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
    if (version === generation && sceneDocument) setDocument(sceneDocument,{force:true});
  }
  transform.addEventListener('dragging-changed', (event) => { if (event.value) { stopCameraMotion(); gizmoCancelled = false; } controls.enabled = navigationEnabled && !event.value; invalidate(); });
  transform.addEventListener('objectChange', () => {
    if (transform.object) {
      if (tool === 'scale' && entityRecord(selectedId)?.kind==='assembly') {
        const original=entityRecord(selectedId).transform.scale[0], values=transform.object.scale.toArray();
        const changed=values.reduce((best,value) => Math.abs(value-original)>Math.abs(best-original) ? value : best,original);
        transform.object.scale.setScalar(Math.max(.01,changed));
      }
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
    controls.enabled = navigationEnabled;
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
    const stillCurrent = () => !destroyed && objects.get(entity.id) === parent;
    if (record.type === 'image' && appearance) {
      trackAsset(cache.texture(record).then((texture) => {
        if (!stillCurrent()) return;
        const aspect = (texture.image?.width ?? 1) / (texture.image?.height ?? 1);
        const image = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.25, aspect * 1.35), 1.35), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide }));
        image.position.y = 0.84;
        parent.add(image);
        const label = parent.children.find((child) => child.isSprite);
        if (label) label.position.y = 1.7;
        tagEntity(parent, entity.id);
        assetsDirty=true;diagnostics.count('assetsInstalled');materialSharing.invalidate();
        invalidate();
      }).catch((error) => { if (stillCurrent()) { fallback(parent, error.message); tagEntity(parent, entity.id); report(`Não foi possível abrir ${record.name}: ${error.message}`); invalidate(); } }));
      return;
    }
    trackAsset(cache.createInstance(record,entity.rockShape,entity.vegetationSeed,entity.rockSculpt).then((instance) => {
      if (!stillCurrent()) { disposeObject(instance); return; }
      parent.add(instance);
      if(entity.localEffect?.enabled && entity.localEffect.type==='fire') instance.traverse(child=>{if(child.userData.materialSlot==='flame') child.visible=false;});
      applyMaterialOverrides(instance, entity.material, sceneDocument.look?.materialAdjustments?.[entity.id] ?? sceneDocument.defaultLook?.materialAdjustments?.[entity.id], true);
      const look = sceneDocument.look ?? sceneDocument.defaultLook;
      applySurfaceTextures(instance, entity, surfaces);
      applyEnvironmentMaterials(instance, entity, look);
      applyMaterialOverrides(instance, undefined, look.materialAdjustments?.[entity.id]);
      applyBoundEmission(instance,records.get(entity.id)??entity,sceneDocument.look??sceneDocument.defaultLook);zones.apply(instance);
      tagEntity(parent, entity.id);
      onMaterialSlots(entity.id);
      parent.updateWorldMatrix(true,true);if(snowRegions!==null)snowRegions.push(new THREE.Box3().setFromObject(parent));
      assetsDirty = true; diagnostics.count('assetsInstalled');materialSharing.invalidate();
      invalidate();
    }).catch((error) => { if (stillCurrent()) { fallback(parent, error.message); tagEntity(parent, entity.id); report(`Não foi possível abrir ${record.name}: ${error.message}`); invalidate(); } }));
  }

  function createLight(record, parent, helper = true) {
    const wrapper = createLightObject(record, { helper, presentation });
    if(record.type!=='directional')wrapper.userData.source.removeFromParent();
    else {wrapper.userData.source.shadow.autoUpdate=false;wrapper.userData.source.shadow.camera.layers.enable(31);wrapper.userData.source.shadow.needsUpdate=true;}
    tagEntity(wrapper, record.id);
    parent.add(wrapper);
    return wrapper;
  }
  function updateShadowBounds(refresh=true) {
    if(refresh){content.updateMatrixWorld(true);shadowBounds.setFromObject(content);}
    for(const wrapper of objects.values())if(focusDirectionalShadow(wrapper,shadowBounds,camera,controls.target,lightManager.quality.mapSize))renderer.shadowMap.needsUpdate=true;
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
      const visible = visibleRecord(record) && !(cutaway && tool !== 'window' && inFront && facing && !(!presentation && (selectedId === id || records.get(selectedId)?.wallId === id)));
      if (object.visible !== visible) { object.visible = visible; invalidate(true); }
    }
    for (const [id, object] of objects) if (['door', 'window'].includes(records.get(id)?.kind)) {
      // Cutaway removes the tall wall, retaining the door as a readable room entrance.
      const visible = visibleRecord(records.get(id));
      if (object.visible !== visible) { object.visible = visible; invalidate(true); }
    }
  }

  function configureDistanceFog(look) {
    scene.fog = !localEffectsEnabled || !look?.fog?.enabled ? null : look.fog.mode === 'exp2'
      ? new THREE.FogExp2(look.fog.color, look.fog.density) : new THREE.Fog(look.fog.color, look.fog.near, look.fog.far);
  }
  function setDocument(next,{force=false}={}) {
    const started=performance.now();
    if (!force && next === sceneDocument && isTrustedSnapshot(next)) { diagnostics.count('documentUpdatesSkipped'); return; }
    diagnostics.count('documentUpdates');materialSharing.invalidate();
    const old=sceneDocument;
    if(!next||force||old?.id!==next.id)releaseRetired();
    if(force||old?.id!==next?.id)snowRegions=null;
    const reparent = force || !isTrustedSnapshot(next) || !old || old.id !== next?.id || old.layout.groups !== next?.layout.groups || ['entities','tokens'].some(name => { const a=name==='entities'?old.layout.entities:old.tokens??{},b=name==='entities'?next?.layout.entities??{}:next?.tokens??{}; return Object.keys(b).some(id=>a[id]?.groupId!==b[id]?.groupId); }) || Object.keys((next?.look??next?.defaultLook)?.lights??{}).some(id => (old.look??old.defaultLook).lights[id]?.groupId !== (next.look??next.defaultLook).lights[id]?.groupId);
    generation += 1;
    cancelPointer(); ruler.clear(); transform.detach();
    runtimeStats={created:0,reused:0,removed:0};
    const changedBounds=[],createdIds=new Set();let spatial=false;
    const remove=(id,{retire=false}={})=>{const o=objects.get(id);if(o){o.updateWorldMatrix(true,true);changedBounds.push(new THREE.Box3().setFromObject(o));
      // Let the replacement acquire the same GPU program before releasing its last old owner.
      // At most one old object per ID survives until the next frame, even during a burst.
      if(retire&&!retiredObjects.has(id)){o.removeFromParent();retiredObjects.set(id,o);}else disposeObject(o);
      runtimeStats.removed++;spatial=true;}objects.delete(id);records.delete(id);localEffects.delete(id);signatures.delete(id);};
    // Flatten assembly proxies while keeping children/resources and their world transforms.
    content.updateMatrixWorld(true);lighting.updateMatrixWorld(true);
    if(reparent) for(const [id,o]of [...objects])if(records.get(id)?.kind!=='assembly') (o.userData.source?lighting:content).attach(o);
    if(reparent) for(const [id,o]of [...objects])if(records.get(id)?.kind==='assembly') {o.removeFromParent();objects.delete(id);records.delete(id);}
    if(!next||force||old?.id!==next.id){for(const id of [...objects.keys()])remove(id);clearGroup(lighting);hemisphere=null;}
    sceneDocument=next;
    if(!next){lightObjects=[];waterObjects=[];warmupRequested=false;clearTimeout(warmupTimer);}
    if(JSON.stringify(old?.layout?.grid)!==JSON.stringify(next?.layout?.grid)||force||!gridObject)createGrid(next?.layout?.grid);
    if(!next){thumbnailEffects?.dispose();thumbnailEffects=undefined;thumbnailTarget?.dispose();thumbnailTarget=undefined;cache.prune([]);scene.fog=null;effects.configure({});atmosphere.configure({},null);reflections.configure({});zones.update(null,objects);lightManager.dispose();boundLights.clear();cutawayCasters.dispose();sample('update',started);invalidate(true);return;}
    const look=next.look??next.defaultLook;
    scene.background.set(look.background);configureDistanceFog(look);effects.configure(look);reflections.configure(look,localEffectsEnabled);
    renderer.toneMappingExposure=look.daylight?.exposure??1.1;
    const atmosphereKey=l=>JSON.stringify([l?.sky,l?.weather,l?.daylight,primaryLight(l??{lights:{}})?.rotation,primaryLight(l??{lights:{}})?.color]);
    if(!old||atmosphereKey(old.look??old.defaultLook)!==atmosphereKey(look)) atmosphere.configure(look,primaryLight(look));
    ground.material.color.set(look.fill?.groundColor??'#283934');
    if(!hemisphere){hemisphere=new THREE.HemisphereLight();lighting.add(hemisphere);}
    hemisphere.color.set(look.fill?.skyColor??'#dbe7e4');hemisphere.groundColor.set(look.fill?.groundColor??'#524938');hemisphere.intensity=look.fill?.intensity??1;
    const keep=new Set([...Object.keys(next.layout.entities),...Object.keys(next.tokens??{}),...Object.keys(look.lights),...Object.values(next.layout.groups).filter(g=>g.anchored).map(g=>g.id)]);
    for(const id of [...objects.keys()])if(!keep.has(id))remove(id);
    const wallShape=({id,transform,length,height,thickness,floorIds})=>({id,transform,length,height,thickness,floorIds});
    const openingShape=({id,kind,wallId,offset,width,height,sill})=>({id,kind,wallId,offset,width,height,sill});
    const walls=Object.values(next.layout.entities).filter(e=>e.kind==='wall');
    const wallKey=JSON.stringify(walls.map(wallShape));
    if(wallProfilesKey!==wallKey){wallProfilesKey=wallKey;wallProfiles=new Map(walls.map(w=>[w.id,wallJoinProfile(w,walls)]));}
    const openings=new Map(); for(const e of Object.values(next.layout.entities))if(e.wallId){const list=openings.get(e.wallId)??[];list.push(e);openings.set(e.wallId,list);}
    const oldLook=old?.look??old?.defaultLook;
    const sameVisualContext=oldLook&&oldLook.materialAdjustments===look.materialAdjustments&&oldLook.environmentBindings===look.environmentBindings&&oldLook.daylight?.phase===look.daylight?.phase&&oldLook.nightWindows===look.nightWindows;
    const shapeFields=record=>Object.keys(record).filter(key=>!['transform','name','locked','audience','tags','groupId','levelId','layerId','illumination','lightingZone'].includes(key));
    const shapeKey=record=>{const {transform,name,locked,audience,tags,groupId,levelId,layerId,illumination,lightingZone,...shape}=record;
      const host=record.wallId&&next.layout.entities[record.wallId];
      return JSON.stringify([shape,look.materialAdjustments?.[record.id],look.environmentBindings?.[record.id],look.daylight?.phase,look.nightWindows,
        record.kind==='wall'?[wallProfiles.get(record.id),(openings.get(record.id)??[]).map(openingShape)]:host?wallShape(host):null,
        record.kind==='door'?next.sessionState?.doors?.[record.id]:null,record.actorId?next.actors[record.actorId]:null,assetRecord(record.assetRef),record.actorId?assetRecord(next.actors[record.actorId]?.assetRef):null]);
    };
    const reusable=record=>{const object=objects.get(record.id), prior=records.get(record.id);
      const identical=isTrustedSnapshot(next)&&prior&&sameVisualContext&&record.kind!=='wall'&&!record.wallId&&(!record.actorId||old?.actors?.[record.actorId]===next.actors?.[record.actorId])&&(prior===record||shapeFields(prior).length===shapeFields(record).length&&shapeFields(record).every(key=>prior[key]===record[key]));
      const key=identical?signatures.get(record.id):shapeKey(record);if(object&&signatures.get(record.id)===key){
      const before=records.get(record.id),visibilityChanged=visibleRecord(before,false,old)!==visibleRecord(record);
      const moved=JSON.stringify(before?.transform)!==JSON.stringify(record.transform)||visibilityChanged;
      if(moved){changedBounds.push(new THREE.Box3().setFromObject(object));spatial=true;}
      if(record.transform&&(!isTrustedSnapshot(next)||before?.transform!==record.transform||reparent)){applyTransform(object,record.transform);if(object.parent&&object.parent!==content&&object.parent!==lighting){const world=new THREE.Matrix4().compose(object.position,object.quaternion,object.scale);object.parent.updateWorldMatrix(true,false);world.premultiply(object.parent.matrixWorld.clone().invert()).decompose(object.position,object.quaternion,object.scale);}}if(moved){object.updateWorldMatrix(true,true);changedBounds.push(new THREE.Box3().setFromObject(object));}object.name=record.name??next.actors?.[record.actorId]?.name;records.set(record.id,record);if(record.kind!=='wall'||visibilityChanged)object.visible=visibleRecord(record);runtimeStats.reused++;return object;
    }if(object)remove(record.id,{retire:true});signatures.set(record.id,key);return null;};
    const entities = values(next.layout.entities);
    ground.position.y = Math.min(-.025, ...entities.filter(e => e.kind === 'terrain').map(e => e.transform.position[1] + Math.min(...e.heights) - .05));
    const doors = entities.filter((record) => ['door', 'window'].includes(record.kind));
    const usedAssets = [];
    for (const entity of entities) {
      if(entity.assetRef){const asset=assetRecord(entity.assetRef);if(asset)usedAssets.push(asset);}
      if(entity.kind==='terrain'&&objects.has(entity.id)&&sameVisualContext&&records.get(entity.id)!==entity){const object=objects.get(entity.id),beforeBounds=new THREE.Box3().setFromObject(object),maskVersion=object.children[0].geometry.attributes.surfaceMaskA.version,updated=updateTerrain(object,entity);if(updated){signatures.set(entity.id,shapeKey(entity));if(updated.spatial||records.get(entity.id).heights!==entity.heights&&JSON.stringify(records.get(entity.id).heights)!==JSON.stringify(entity.heights)){spatial=true;changedBounds.push(beforeBounds,new THREE.Box3().setFromObject(object));}if(object.children[0].geometry.attributes.surfaceMaskA.version!==maskVersion)diagnostics.count('terrainBufferUpdates');}}
      if(reusable(entity))continue;
      let object;
      if (entity.kind === 'water') object = createWater(entity);
      else if (entity.kind === 'floor') object = createFloor(entity);
      else if (entity.kind === 'terrain') object = createTerrain(entity);
      else if (isAccess(entity)) object = createAccess(entity);
      else if (entity.kind === 'wall') object = createWall(entity, doors.filter((door) => door.wallId === entity.id), entities.filter(e => e.kind === 'wall'));
      else if (entity.kind === 'door') {
        const wall = next.layout.entities[entity.wallId];
        if (!wall) continue;
        object = createDoor(entity, wall, next.sessionState?.doors?.[entity.id]);
      } else if (entity.kind === 'window') {
        const wall = next.layout.entities[entity.wallId]; if (!wall) continue; object = createWindow(entity, wall);
      } else if (entity.kind === 'prop') { object = new THREE.Group(); applyTransform(object, entity.transform); }
      else continue;
      object.name = entity.name;
      content.add(object);
      objects.set(entity.id, object);runtimeStats.created++;createdIds.add(entity.id);
      records.set(entity.id, entity);
      object.visible = visibleRecord(entity);
      if (entity.kind === 'prop') {
        if(entity.localEffect?.enabled) { const effect=createLocalEffect(entity.localEffect); object.add(effect);effect.userData.localEffect.light?.removeFromParent(); localEffects.set(entity.id,effect); }
        if(entity.localEffect?.hideModel) {
          const proxy=new THREE.Mesh(new THREE.BoxGeometry(...entity.localEffect.size),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
          proxy.position.fromArray(entity.localEffect.offset); proxy.position.y+=entity.localEffect.size[1]/2; proxy.userData.decorative=true; object.add(proxy); tagEntity(object,entity.id); continue;
        }
        const asset = assetRecord(entity.assetRef);
        if (asset) usedAssets.push(asset);
        installAsset(object, entity, entity.assetRef, generation);
      } else { if(entity.water?.state!=='water') applySurfaceTextures(object, entity.kind==='water'?{...entity,material:{...entity.material,texture:entity.material.texture&&entity.material.texture!=='none'?entity.material.texture:'ice'}}:entity, surfaces); applyEnvironmentMaterials(object, entity, look); applyMaterialOverrides(object, undefined, look.materialAdjustments?.[entity.id]); }
    }
    for (const token of values(next.tokens)) {
      const reference=token.visualOverride?.assetRef??next.actors[token.actorId]?.assetRef;if(reference){const asset=assetRecord(reference);if(asset)usedAssets.push(asset);}
      if(reusable(token))continue;
      const actor = next.actors[token.actorId];
      const object = createToken(token, actor);
      object.name = actor?.name ?? 'Token';
      content.add(object);
      objects.set(token.id, object);runtimeStats.created++;createdIds.add(token.id);
      records.set(token.id, token);
      object.visible = visibleRecord(token);
      const appearance = object.userData.appearance;
      if (appearance.assetRef) {
        const asset = assetRecord(appearance.assetRef);
        if (asset) usedAssets.push(asset);
        installAsset(object, token, appearance.assetRef, generation, appearance);
      }
    }
    for (const record of values(look.lights)) {
      let object=objects.get(record.id);
      if(object?.userData.lightRecord?.type===record.type){
        const before=records.get(record.id);if(!isTrustedSnapshot(next)||before.position!==record.position||before.rotation!==record.rotation||reparent){object.position.fromArray(record.position);object.quaternion.fromArray(record.rotation).normalize();if(object.parent&&object.parent!==content&&object.parent!==lighting){const world=new THREE.Matrix4().compose(object.position,object.quaternion,new THREE.Vector3(1,1,1));object.parent.updateWorldMatrix(true,false);world.premultiply(object.parent.matrixWorld.clone().invert()).decompose(object.position,object.quaternion,object.scale);}}object.userData.lightRecord=record;const source=object.userData.source;source.color.set(record.color);source.intensity=record.intensity;source.distance=record.distance;source.angle=record.angle;source.penumbra=record.penumbra;
        object.traverse(child=>{if(child.userData.editHelper&&child.material?.color)child.material.color.set(record.color);});
        if(record.type==='spot'&&(before.angle!==record.angle||before.distance!==record.distance)){const cone=object.children.find(child=>child.geometry?.type==='ConeGeometry');if(cone){const length=Math.min(record.distance||3,3);cone.geometry.dispose();cone.geometry=new THREE.ConeGeometry(Math.tan(Math.min(record.angle,1.4))*length,length,16,1,true);cone.position.y=-length/2;}}
        if(source.isDirectionalLight){source.castShadow=record.shadowEnabled;source.shadow.needsUpdate ||= JSON.stringify([before.position,before.rotation,before.shadowEnabled])!==JSON.stringify([record.position,record.rotation,record.shadowEnabled]);}
        runtimeStats.reused++;
      }else{if(object)remove(record.id);object=createLight(record,lighting);runtimeStats.created++;}
      const binding = look.environmentBindings?.[record.id];
      object.userData.environmentActive = !binding?.enabled || environmentBindingActive(look, binding);
      objects.set(record.id, object);
      records.set(record.id, record);
      object.visible = visibleRecord(record);
    }
    const assemblies=values(next.layout.groups).filter(group => group.anchored);
    const depth=group => { let count=0,parent=group.parentId; while(parent) { count++; parent=next.layout.groups[parent]?.parentId; } return count; };
    if(reparent) for(const group of assemblies.sort((a,b) => depth(b)-depth(a))) {
      const proxy=new THREE.Group(); applyTransform(proxy,group.transform); content.add(proxy); proxy.updateMatrixWorld(true);
      for(const record of [...values(next.layout.entities),...values(next.tokens),...values(look.lights)]) if(groupChain(next,record.groupId).find(parent => parent.anchored)?.id===group.id && objects.has(record.id)) proxy.attach(objects.get(record.id));
      for(const child of assemblies) if(groupChain(next,child.parentId).find(parent => parent.anchored)?.id===group.id && objects.has(child.id)) proxy.attach(objects.get(child.id));
      objects.set(group.id,proxy); records.set(group.id,{ ...group,kind:'assembly',groupId:group.parentId,locked:group.locked || assemblyMembers(next,group.id).some(record => isLocked(next,record)) }); proxy.visible=group.visible!==false && visibleRecord(records.get(group.id));
    }
    if(!reparent)for(const [id,object] of objects){const record=records.get(id);if(record?.kind==='assembly')continue;const parent=groupChain(next,record?.groupId).find(g=>g.anchored);if(parent&&objects.has(parent.id)&&object.parent!==objects.get(parent.id))objects.get(parent.id).attach(object);}
    cache.prune(usedAssets);
    lightObjects=[...objects.values()].filter(o=>o.userData.source);waterObjects=[...objects.values()].filter(o=>o.userData.waterRecord);
    if(runtimeStats.created)scheduleWarmup();
    content.updateMatrixWorld(true);
    spatial ||= force||old?.id!==next.id||runtimeStats.created>0;
    if(spatial){updateShadowBounds();snowDirty=true;for(const o of objects.values())if(o.userData.source?.isDirectionalLight)o.userData.source.shadow.needsUpdate=true;
      if(runtimeStats.created)for(const id of createdIds)changedBounds.push(new THREE.Box3().setFromObject(objects.get(id)));
      if(snowRegions!==null)snowRegions.push(...changedBounds);lightManager.invalidate(changedBounds);renderer.shadowMap.needsUpdate=true;}
    pickBounds = new WeakMap();
    zones.update(next,objects);zones.apply(ground);for(const o of objects.values())zones.apply(o);
    updateSelection();sample('update',started);diagnostics.record('reconciliation',performance.now()-started); invalidate();
  }

  function exposureForScene(omitId=null) {
    content.updateMatrixWorld(true);return createExposureTest(snowOccluders([...objects].filter(([id])=>id!==omitId && records.get(id)?.kind && records.get(id)?.kind!=='assembly' && visibleRecord(records.get(id),true)).map(([,o])=>o)));
  }
  function rebuildSnow() {
    const regions=snowRegions;snowRegions=[];snowDirty=false;
    const affected=[];
    for(const [id,object] of objects){
      const bounds=regions===null?null:new THREE.Box3().setFromObject(object);
      if(regions===null||regions.some(b=>!b.isEmpty()&&bounds.min.x<=b.max.x&&bounds.max.x>=b.min.x&&bounds.min.z<=b.max.z&&bounds.max.z>=b.min.z)){
        clearPhysicalSnow(object);object.userData.snowTriangles=0;affected.push([id,object]);
      }
    }
    if(affected.length&&[...records.values()].some(hasPhysicalSnow)){
      const exposure=exposureForScene();
      for(const [id,object] of affected){const record=records.get(id);if(record?.kind&&visibleRecord(record,true))object.userData.snowTriangles=addPhysicalSnow(object,record,surfaces,exposure).triangles;}
    }
    snowTriangles=[...objects.values()].reduce((sum,o)=>sum+(o.userData.snowTriangles??0),0);
    diagnostics.count('snowObjectsRebuilt',affected.length);content.updateMatrixWorld(true);if(snowTriangles)invalidate(true);
  }
  function computeSnowExposure(terrainId) {
    const terrain=records.get(terrainId);if(terrain?.kind!=='terrain')throw new Error('Selecione um terreno.');
    const exposure=exposureForScene(terrainId),n=terrain.segments;
    return terrain.heights.map((h,i)=>exposure(worldPoint(terrain,[(i%(n+1)/n-.5)*terrain.width,h,(Math.floor(i/(n+1))/n-.5)*terrain.length])));
  }

  function setPreview(proposal) {
    const previewVersion = ++previewGeneration;
    clearGroup(preview);
    if (!proposal || presentation) { invalidate(); return; }
    const merged = (base, patch) => ({ ...base, ...patch, ...(patch.transform ? { transform: { ...base.transform, ...patch.transform } } : {}) });
    const entities = [...values(proposal.entities ?? proposal.layout?.entities), ...(proposal.updates ?? []).filter(p => ['entity', 'token'].includes(p.kind)).map(p => merged(sceneDocument.layout.entities[p.id] ?? sceneDocument.tokens?.[p.id], p.patch))];
    const doors = [...values(sceneDocument?.layout.entities).filter(e => ['door', 'window'].includes(e.kind)), ...entities.filter(e => ['door', 'window'].includes(e.kind))];
    const ghost = object => object.traverse(child => {
      child.userData.entityId = undefined;
      if (!child.material || child.isSprite) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) { if (!proposal.materialPreview) material.color.set('#8bcea7'); material.transparent = true; material.opacity = proposal.materialPreview ? .85 : .36; material.depthWrite = false; }
      child.castShadow = false; child.receiveShadow = false;
    });
    for (const entity of entities) {
      let object;
      if (entity.kind === 'water') object = createWater(entity);
      else if (entity.kind === 'floor') object = createFloor(entity);
      else if (entity.kind === 'terrain') object = createTerrain(entity);
      else if (isAccess(entity)) object = createAccess(entity);
      else if (entity.kind === 'wall') object = createWall(entity, doors.filter((door) => door.wallId === entity.id), [...values(sceneDocument.layout.entities).filter(e => e.kind === 'wall' && !entities.some(p => p.id === e.id)), ...entities.filter(e => e.kind === 'wall')]);
      else if (entity.kind === 'door') {
        const wall = entities.find((item) => item.id === entity.wallId) ?? sceneDocument.layout.entities[entity.wallId];
        if (wall) object = createDoor(entity, wall, entity.initialAngle);
      } else if (entity.kind === 'window') {
        const wall = entities.find(e => e.id === entity.wallId) ?? sceneDocument.layout.entities[entity.wallId]; if (wall) object = createWindow(entity, wall);
      } else if (entity.kind === 'prop') {
        object = new THREE.Group(); applyTransform(object, entity.transform);
        const parent = object, asset = assetRecord(entity.assetRef);
        if (asset) cache.createInstance(asset,entity.rockShape,entity.vegetationSeed,entity.rockSculpt).then(instance => {
          if (destroyed || previewVersion !== previewGeneration) { disposeObject(instance); return; }
          applyMaterialOverrides(instance, entity.material, null, true); ghost(instance); parent.add(instance); invalidate();
        }).catch(error => { if (previewVersion === previewGeneration) report(error); });
      } else if (entity.actorId) object = createToken(entity, sceneDocument.actors[entity.actorId]);
      if (!object) continue;
      ghost(object);
      preview.add(object);
    }
    for (const light of [...values(proposal.lights), ...(proposal.updates ?? []).filter(p => p.kind === 'light').map(p => merged((sceneDocument.look ?? sceneDocument.defaultLook).lights[p.id], p.patch))]) {
      const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), new THREE.MeshBasicMaterial({ color: light.color, wireframe: true }));
      indicator.position.fromArray(light.position);
      preview.add(indicator);
    }
    for (const operation of proposal.removals ?? []) {
      const object = objects.get(operation.id); if (!object) continue;
      const helper = new THREE.BoxHelper(object, '#e08a7a'); helper.material.depthTest = false; preview.add(helper);
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
  function visibleRecord(record, ignoreIsolation = false, inDocument=sceneDocument) {
    if(!record||!inDocument)return false;
    if(record.kind==='assembly') return record.visible!==false && isVisible(inDocument,record) && assemblyMembers(inDocument,record.id).some(member => visibleRecord(member,ignoreIsolation,inDocument));
    if (!isVisible(inDocument, record)) return false;
    if (!ignoreIsolation && !presentation && isolatedLevel && record.levelId && record.levelId !== isolatedLevel && record.fromLevelId !== isolatedLevel && record.toLevelId !== isolatedLevel) return false;
    const host = record.wallId ?? record.anchor?.hostId ?? record.surfaceId;
    return !host || !inDocument.layout.entities[host] || visibleRecord(inDocument.layout.entities[host], ignoreIsolation || isAccess(record) && (record.fromLevelId === isolatedLevel || record.toLevelId === isolatedLevel),inDocument);
  }
  function pickCandidates() {
    const all=new Set(objects.values()), roots=[];
    for(const object of all){let nested=false;for(let p=object.parent;p;p=p.parent)if(all.has(p)){nested=true;break;}if(nested||!visibleInHierarchy(object))continue;
      let bounds=pickBounds.get(object);if(!bounds){object.updateWorldMatrix(true,true);bounds=new THREE.Box3().setFromObject(object);pickBounds.set(object,bounds);}
      if(raycaster.ray.intersectsBox(bounds))roots.push(object);
    }
    diagnostics.count('pickCandidates',roots.length);return roots;
  }
  function pick(event) {
    const started=performance.now();diagnostics.count('picking');
    rayFromEvent(event);
    let nearest = raycaster.intersectObjects(pickCandidates(), true).find((hit) => hit.object.userData.entityId && (!hit.object.userData.decorative || hit.object.userData.physicalSnow || hit.object.userData.terrainSnowEdge) && visibleInHierarchy(hit.object));
    // Empty and barred windows remain selectable through their aperture, without
    // adding invisible geometry that would make the physical opening solid.
    for (const opening of records.values()) {
      const object = objects.get(opening.id);
      if (opening.kind !== 'window' || !object?.visible) continue;
      const local = pointOnWall(event, opening.wallId);
      if (!local || Math.abs(local.x - opening.offset) > opening.width / 2 || local.y < opening.sill || local.y > opening.sill + opening.height) continue;
      const point = local.applyMatrix4(objects.get(opening.wallId).matrixWorld), distance = point.distanceTo(raycaster.ray.origin);
      if (!nearest || distance < nearest.distance) nearest = { object, point, distance };
    }
    diagnostics.record('picking',performance.now()-started);return nearest;
  }
  function supportPoint(event, planeY) {
    rayFromEvent(event);
    if (planeY === undefined && supportSurface !== null) {
      const floors = [...objects].filter(([id]) => (supportSurface === undefined || supportSurface === id) && isSupport(records.get(id))).map(([, object]) => object);
      const hit = raycaster.intersectObjects(floors, true).find(intersection => intersection.face?.normal.y > 1e-8 && visibleInHierarchy(intersection.object));
      if (hit) return { position: hit.point.toArray(), surfaceId: hit.object.userData.entityId };
      if (supportSurface) return null;
    }
    plane.constant = -(planeY ?? workplaneHeight);
    const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    return point ? { position: point.toArray(), surfaceId: null } : null;
  }
  function measurementPoint(event) {
    if (!sceneDocument) return null;
    const hit = pick(event), token = sceneDocument.tokens?.[hit?.object.userData.entityId];
    // Token portraits and bases have different shapes; measure from their logical base centre.
    if (token) return [...token.transform.position];
    const point = hit?.point.toArray() ?? supportPoint(event, workplaneHeight)?.position;
    return point ? snapPosition(point, { ...sceneDocument.layout.grid, snap: rulerSnap && !event.altKey }) : null;
  }
  function pointOnWall(event, wallId) {
    rayFromEvent(event);
    const wall = objects.get(wallId); if (!wall) return null;
    wall.updateMatrixWorld(true);
    const localRay = raycaster.ray.clone().applyMatrix4(wall.matrixWorld.clone().invert());
    return localRay.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), new THREE.Vector3());
  }
  function wallPoint(event) {
    let nearest;
    for (const wall of records.values()) {
      if (wall.kind !== 'wall' || !visibleRecord(wall) || isLocked(sceneDocument, wall)) continue;
      const local = pointOnWall(event, wall.id);
      if (!local || local.x < 0 || local.x > wall.length || local.y < 0 || local.y > wall.height) continue;
      const distance = local.clone().applyMatrix4(objects.get(wall.id).matrixWorld).distanceTo(raycaster.ray.origin);
      if (!nearest || distance < nearest.distance) nearest = { wallId: wall.id, offset: local.x, height: local.y, distance };
    }
    return nearest;
  }
  // During a drag, replace both meshes from temporary opening data. The document
  // stays unchanged until pointer-up commits one command (or cancellation restores it).
  function previewOpening(opening) {
    const wall = records.get(opening.wallId);
    const openings = values(sceneDocument.layout.entities).filter(e => e.wallId === wall.id).map(e => e.id === opening.id ? opening : e);
    for (const [record, object] of [[wall, createWall(wall, openings, values(sceneDocument.layout.entities).filter(e => e.kind === 'wall'))], [opening, createWindow(opening, wall)]]) {
      disposeObject(objects.get(record.id)); content.add(object); objects.set(record.id, object);
      object.visible = visibleRecord(record); applySurfaceTextures(object,record,surfaces); applyEnvironmentMaterials(object, record, sceneDocument.look ?? sceneDocument.defaultLook); applyMaterialOverrides(object, undefined, (sceneDocument.look ?? sceneDocument.defaultLook).materialAdjustments?.[record.id]);
    }
    content.updateMatrixWorld(true); updateSelection(); invalidate(true);
  }
  function onPointerDown(event) {
    if (event.button !== 0 || presentation || transform.dragging) return;
    if (tool === 'measure' && (!event.isPrimary || pointer)) return;
    stopCameraMotion();
    canvas.focus({ preventScroll: true });
    altHeld = event.altKey;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    if (tool === 'measure') {
      const point = measurementPoint(event);
      if (!point) { pointer = null; controls.enabled = navigationEnabled; return; }
      const before = ruler.snapshot();
      pointer.ruler = { before, finishOnClick: Boolean(before && !before.complete) };
      if (!before || before.complete) ruler.begin(point, sceneDocument.layout.grid.cellSize);
      else ruler.update(point);
      controls.enabled = false; canvas.setPointerCapture(event.pointerId); invalidate();
    } else if (tool === 'terrain') {
      const hit=surfaceBrushHit(event),record=records.get(hit?.object.userData.entityId);
      if(!record||isLocked(sceneDocument,record)||(record.kind!=='terrain'&&!isSculptableRock(record))) {pointer=null;report('Aponte para um terreno ou uma rocha/paredão desbloqueado.');return;}
      if(isSculptableRock(record)&&['paint','erase','water'].includes(terrainBrush.mode)){pointer=null;report('Para esculpir a rocha, escolha Elevar, Rebaixar ou Projetar face. Pintura de camadas e água usam o terreno.');return;}
      if(record.id!==selectedId) {onSelect(record.id);pointer??={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};}
      if(isSculptableRock(record)) {
        if((record.rockSculpt?.stamps.length??0)>=ROCK_SCULPT_LIMIT){pointer=null;report('Esta rocha atingiu 512 amostras. Continue em outra peça ou desfaça/limpe traços.');return;}
        pointer.rock=structuredClone(record);pointer.terrainBrush={...terrainBrush};pointer.rockObject=objects.get(record.id);
        pointer.rockMeshes=prepareRockSculpt(pointer.rockObject);pointer.rockBefore=pointer.rockMeshes.map(mesh=>mesh.geometry.attributes.position.array.slice());
        pointer.snow=[];pointer.rockObject.traverse(child=>{if(child.userData.physicalSnow){pointer.snow.push([child,child.visible]);child.visible=false;}});
        pointer.lastStamp=hit.point.toArray();pointer.planePoint=pointer.lastStamp;pointer.planeNormal=surfaceNormal(hit);pointer.strokeChanged=false;
        try {stampRock(hit.point.toArray(),pointer.planeNormal);}catch(error){cancelGesture();report(error);return;}
        controls.enabled=false;canvas.setPointerCapture(event.pointerId);return;
      }
      if(['paint','erase'].includes(terrainBrush.mode)&&!record.paintLayers?.some(layer=>layer.id===terrainBrush.layerId&&layer.visible&&(!layer.distribution||layer.distribution.mode==='paint'))){pointer=null;report('Selecione uma camada manual visível deste terreno para pintar.');return;}
      pointer.terrain = structuredClone(record); pointer.terrainBefore = record; pointer.terrainBrush = { ...terrainBrush }; pointer.lastStamp = hit.point.toArray(); pointer.waterPoints = [];
      try { stampTerrain(hit.point.toArray()); } catch (error) { pointer = null; report(error); return; }
      controls.enabled = false; canvas.setPointerCapture(event.pointerId);
    } else if (tool === 'room') {
      const support = supportPoint(event);
      if (!support) { pointer = null; return; }
      pointer.roomStart = support.position;
      controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
    } else if (tool === 'move' && !event.shiftKey) {
      const hit = pick(event);
      const hitId=hit?.object.userData.entityId;
      const id=assemblyFor(sceneDocument,hitId)?.id ?? hitId;
      const record = entityRecord(id);
      if (record?.kind === 'window' && selectedIds.length <= 1 && !isLocked(sceneDocument, record)) {
        if (selectedId !== id) { onSelect(id); pointer ??= { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }; }
        const start = pointOnWall(event, record.wallId);
        if (!start) return;
        pointer.opening = record; pointer.wallStart = start; pointer.entityId = id;
        controls.enabled = false; canvas.setPointerCapture(event.pointerId);
      } else if (id && record && selectedIds.length <= 1 && !['door', 'window'].includes(record.kind) && !isLocked(sceneDocument, record) && !['directional', 'point', 'spot'].includes(record.type)) {
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
    const events=event.getCoalescedEvents?.();
    diagnostics.measure('brushInput',()=>{for(const sample of events?.length?events:[event])processPointerMove(sample);});
  }
  function processPointerMove(event) {
    altHeld = event.altKey;
    if (tool === 'measure' && ruler.pending() && !presentation && (!pointer || pointer.id === event.pointerId)) {
      const point = measurementPoint(event);
      if (point) { ruler.update(point); invalidate(); }
    }
    if(tool==='terrain'&&!presentation) {
      const hit=surfaceBrushHit(event,pointer?.rock?.id??pointer?.terrain?.id),record=records.get(hit?.object.userData.entityId);
      brushLine.visible=!!hit&&(record?.kind==='terrain'||isSculptableRock(record))&&!isLocked(sceneDocument,record);
      if(brushLine.visible) {
        const brush=pointer?.terrainBrush??terrainBrush;let points;
        if(isSculptableRock(record)) {
          const normal=new THREE.Vector3(...surfaceNormal(hit)),u=new THREE.Vector3(0,1,0);if(Math.abs(normal.y)>.9)u.set(1,0,0);u.cross(normal).normalize();const w=normal.clone().cross(u);
          points=Array.from({length:49},(_,i)=>hit.point.clone().addScaledVector(u,Math.cos(i/48*Math.PI*2)*brush.radius).addScaledVector(w,Math.sin(i/48*Math.PI*2)*brush.radius).addScaledVector(normal,.025));
        } else points=terrainBrushOutline(record,hit.point.toArray(),brush).map(point=>{point[1]=supportHeightAt(record,point)+.03;return new THREE.Vector3(...point);});
        const positions=brushLine.geometry.getAttribute('position');if(positions?.count===points.length){for(let i=0;i<points.length;i++)positions.setXYZ(i,points[i].x,points[i].y,points[i].z);positions.needsUpdate=true;brushLine.geometry.computeBoundingSphere();}else{brushLine.geometry.dispose();brushLine.geometry=new THREE.BufferGeometry().setFromPoints(points);}invalidate();
      } else invalidate();
    }
    if (!pointer || pointer.id !== event.pointerId || presentation) return;
    pointer.moved ||= Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4;
    if(pointer.rock) {
      const hit=surfaceBrushHit(event,pointer.rock.id);if(!hit)return;
      const point=hit.point.toArray(),previous=pointer.lastStamp,distance=Math.hypot(...point.map((v,i)=>v-previous[i])),spacing=Math.max(.05,pointer.terrainBrush.radius/4);
      if(distance>=spacing) {
        const steps=Math.min(8,Math.ceil(distance/spacing)),normal=pointer.terrainBrush.mode==='flatten'?pointer.planeNormal:surfaceNormal(hit);
        for(let i=1;i<=steps;i++)stampRock(previous.map((v,axis)=>v+(point[axis]-v)*i/steps),normal);
        pointer.lastStamp=point;updateSelection();invalidate(true);
      }
    } else if (pointer.terrain) {
      const hits = (() => { rayFromEvent(event); return raycaster.intersectObject(objects.get(pointer.terrain.id), true); })();
      const hit = hits.find(h => h.face?.normal.y > 0); if (!hit) return;
      const point = hit.point.toArray(), previous = pointer.lastStamp;
      const distance = Math.hypot(point[0] - previous[0], point[2] - previous[2]), spacing = Math.max(.05, pointer.terrainBrush.radius / 4);
      if (distance >= spacing) {
        const steps = Math.min(64, Math.ceil(distance / spacing));
        for (let i = 1; i <= steps; i++) stampTerrain(previous.map((v, axis) => v + (point[axis] - v) * i / steps), false);
        if(pointer.terrainBrush.mode !== 'water'){stampTerrain(point,false);pendingTerrain=pointer.terrain;invalidate();} else stampTerrain(point);
        pointer.lastStamp = point;
      }
    } else if (pointer.roomStart) {
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
    } else if (pointer.opening && pointer.moved) {
      const local = pointOnWall(event, pointer.opening.wallId); if (!local) return;
      const wall = records.get(pointer.opening.wallId), cell = sceneDocument.layout.grid.cellSize;
      const snapDelta = value => sceneDocument.layout.grid.snap && !event.altKey ? Math.round(value / cell) * cell : value;
      pointer.openingPatch = constrainOpening(wall, pointer.opening, pointer.opening.offset + snapDelta(local.x - pointer.wallStart.x), pointer.opening.sill + snapDelta(local.y - pointer.wallStart.y));
      previewOpening({ ...pointer.opening, ...pointer.openingPatch });
      hint.textContent = `Posição ${pointer.openingPatch.offset.toFixed(2)} · Peitoril ${pointer.openingPatch.sill.toFixed(2)} m · Alt: livre`; hint.style.display = '';
    } else if (pointer.object && pointer.planeStart && pointer.moved) {
      const support = supportPoint(event, pointer.initial.position[1]);
      if (!support) return;
      const candidate = [...pointer.initial.position];
      candidate[0] += support.position[0] - pointer.planeStart[0];
      candidate[2] += support.position[2] - pointer.planeStart[2];
      pointer.object.position.fromArray(snapPosition(candidate, { ...sceneDocument.layout.grid, snap: sceneDocument.layout.grid.snap && !altHeld }, footprintFor(entityRecord(pointer.entityId), pointer.object.quaternion.toArray())));
      const host = records.get(entityRecord(pointer.entityId)?.surfaceId);
      if (isAccess(host) || host?.kind === 'terrain') pointer.object.position.y = supportHeightAt(host, pointer.object.position.toArray());
      hint.textContent = `X ${pointer.object.position.x.toFixed(2)} · Z ${pointer.object.position.z.toFixed(2)} m${altHeld ? ' · livre' : ''}`;
      hint.style.display = '';
      invalidate(true);
    }
  }
  function onPointerUp(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    if(pendingTerrain){replaceTerrain(pendingTerrain);pendingTerrain=null;}
    const gesture = pointer;
    pointer = null;
    controls.enabled = navigationEnabled;
    hint.style.display = 'none';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (gesture.ruler) {
      const point = measurementPoint(event);
      if (point) ruler.update(point);
      if (gesture.moved || gesture.ruler.finishOnClick) ruler.finish();
    } else if(gesture.rock) {
      const version=generation;
      try {if(gesture.strokeChanged)onRockStroke(gesture.rock.id,{rockSculpt:gesture.rock.rockSculpt,footprint:sculptFootprint(gesture.rockObject)});}catch(error){report(error);}
      if(version===generation)setDocument(sceneDocument,{force:true});
    } else if (gesture.terrain) {
      const version = generation;
      try { if(gesture.terrainBrush.mode==='water') { clearGroup(preview); if(gesture.waterOverflow) report('Traço longo demais. Faça traços menores e separados.'); else onWaterStroke(gesture.terrain.id,gesture.waterPoints,gesture.terrainBrush); } else onTerrainStroke(gesture.terrain.id, ['paint','erase'].includes(gesture.terrainBrush.mode) ? { paintLayers: gesture.terrain.paintLayers } : { heights: gesture.terrain.heights }); } catch (error) { report(error); }
      if (version === generation) setDocument(sceneDocument,{force:true});
    } else if (gesture.roomStart) {
      clearGroup(preview);
      if (gesture.roomEnd && gesture.moved) {
        const start = gesture.snappedStart ?? gesture.roomStart, end = gesture.roomEnd;
        const room = { width: Math.abs(end[0] - start[0]), length: Math.abs(end[2] - start[2]), center: [(start[0] + end[0]) / 2, start[1], (start[2] + end[2]) / 2] };
        if (room.width >= 1 && room.length >= 1) onRoomDraw(room);
        else report('Desenhe uma sala com pelo menos 1 m de largura e comprimento.');
      }
    } else if (gesture.opening && gesture.moved) {
      const version = generation;
      if (gesture.openingPatch) { try { onOpeningMove(gesture.entityId, gesture.openingPatch); } catch (error) { report(error); } }
      if (version === generation) setDocument(sceneDocument,{force:true});
    } else if (gesture.object && gesture.moved) commitTransform(gesture.entityId, gesture.object, Boolean(sceneDocument?.layout.grid.snap && !event.altKey));
    else if (!gesture.moved && !transform.dragging) {
      if(tool==='illumination-origin'){
        const hit=pick(event);if(hit?.object.userData.entityId!==selectedId){report('Clique na superfície do objeto selecionado.');return;}
        onIlluminationOrigin(selectedId,objects.get(selectedId).worldToLocal(hit.point.clone()).toArray());
      }else if (tool === 'material-sample') {
        onMaterialPick(pick(event)?.object.userData.entityId ?? null);
      } else if (tool === 'place') {
        const support = supportPoint(event);
        if (support) onPlace({ ...support, snap: Boolean(sceneDocument?.layout.grid.snap && !event.altKey) });
      } else if (tool === 'window') {
        const point = wallPoint(event);
        if (point) onWindowPlace(point); else report('Clique em uma parede desbloqueada. Use a vista 3D para escolher a altura.');
      } else if (tool === 'polygon') {
        const support = supportPoint(event, workplaneHeight);
        if (support) { const point = snapPosition(support.position, { ...sceneDocument.layout.grid, snap: sceneDocument.layout.grid.snap && !event.altKey });
          if (!polygonPoints.length || point.some((n, i) => Math.abs(n - polygonPoints.at(-1)[i]) > 1e-6)) polygonPoints.push(point); drawPolygon(); }
      } else if (tool !== 'room') onSelect(pick(event)?.object.userData.entityId ?? null, { additive: event.shiftKey });
    }
    invalidate();
  }
  function cancelPointer() {
    pendingTerrain=null;
    if (pointer?.ruler) ruler.set(pointer.ruler.before);
    if(pointer?.rockBefore) {for(let i=0;i<pointer.rockMeshes.length;i++){const g=pointer.rockMeshes[i].geometry;g.attributes.position.array.set(pointer.rockBefore[i]);g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();}for(const [snow,visible] of pointer.snow)snow.visible=visible;updateSelection();}
    if (pointer?.terrainBefore) replaceTerrain(pointer.terrainBefore);
    if (pointer?.object && pointer.initial) applyTransform(pointer.object, pointer.initial);
    if (pointer?.opening) previewOpening(pointer.opening);
    const id = pointer?.id;
    pointer = null;
    if (id != null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    controls.enabled = navigationEnabled;
    hint.style.display = 'none';
  }
  function replaceTerrain(record) {
    ground.position.y = Math.min(-.025, ...values(sceneDocument.layout.entities).filter(e => e.kind === 'terrain').map(e => { const terrain = e.id === record.id ? record : e; return terrain.transform.position[1] + Math.min(...terrain.heights) - .05; }));
    const previous = objects.get(record.id),maskVersion=previous?.children[0].geometry.attributes.surfaceMaskA.version, updated = previous && updateTerrain(previous,record);
    if(updated){if(previous.children[0].geometry.attributes.surfaceMaskA.version!==maskVersion)diagnostics.count('terrainBufferUpdates');pickBounds=new WeakMap();invalidate(updated.spatial);return;}
    diagnostics.count('terrainRebuilds');
    if (previous) { previous.removeFromParent(); disposeObject(previous); }
    const object = createTerrain(record); applySurfaceTextures(object,record,surfaces); content.add(object); objects.set(record.id, object); object.visible = visibleRecord(record); content.updateMatrixWorld(true); invalidate(true);
  }
  function surfaceNormal(hit) {return hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize().toArray();}
  function surfaceBrushHit(event,id=null) {
    if(pendingTerrain){const object=objects.get(pendingTerrain.id);if(object&&!syncTerrainPicking(object,pendingTerrain)){replaceTerrain(pendingTerrain);pendingTerrain=null;}pickBounds=new WeakMap();}
    rayFromEvent(event);
    // Respect nearer occluders; ignore only helper/derived snow meshes.
    const hit=raycaster.intersectObjects(pickCandidates(),true).find(h=>h.object.userData.entityId&&!h.object.userData.decorative&&visibleInHierarchy(h.object));
    if(id&&hit?.object.userData.entityId!==id)return null;
    const record=records.get(hit?.object.userData.entityId);
    if(record?.kind==='terrain'&&surfaceNormal(hit)[1]<=0)return null;
    return hit;
  }
  function stampRock(point,normal) {
    const stamps=pointer.rock.rockSculpt?.stamps??[];
    if(stamps.length>=ROCK_SCULPT_LIMIT){hint.textContent='Limite de amostras atingido · solte para salvar o traço';return;}
    const stamp=rockBrushStamp(pointer.rock,point,normal,pointer.terrainBrush,pointer.planePoint);
    if(applyRockStamp(pointer.rockMeshes,stamp)) {diagnostics.count('rockStamps');pointer.rock.rockSculpt={stamps:[...stamps,stamp]};pointer.strokeChanged=true;}
    hint.textContent=`Esculpindo superfície · ${pointer.terrainBrush.radius} m · solte para aplicar · Esc cancela`;hint.style.display='';invalidate(true);
  }
  function stampTerrain(position, render = true) {
    diagnostics.count('terrainStamps');
    const brush = pointer.terrainBrush;
    if(brush.mode==='water') {
      if(pointer.waterPoints.length>=2048) {pointer.waterOverflow=true;return;}
      pointer.waterPoints.push(position);
      if(render) {
        clearGroup(preview);
        const geometry=new THREE.BufferGeometry().setFromPoints(pointer.waterPoints.map(p=>new THREE.Vector3(p[0],brush.waterLevel,p[2])));
        const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#69d4f2',depthTest:false}));line.renderOrder=9;preview.add(line);invalidate(true);
      }
      hint.textContent='Água · solte para revisar o leito · Esc cancela';hint.style.display='';return;
    }
    if (['paint','erase'].includes(brush.mode)) pointer.terrain.paintLayers = paintTerrain(pointer.terrain, position, brush);
    else {
      const before=pointer.terrain.heights;
      pointer.terrain.heights = sculptTerrain(pointer.terrain, position, {...brush,mode:brush.mode==='push'?'raise':brush.mode==='pull'?'lower':brush.mode});
      if(brush.protectFloors) {
        const protectedHeights=protectTerrainFloors(pointer.terrain,sceneDocument.layout.entities);
        pointer.terrain.heights=pointer.terrain.heights.map((h,i)=>h===before[i]?h:protectedHeights[i]);
      }
    }
    if (render) replaceTerrain(pointer.terrain);
    hint.textContent = `Pincel ${brush.radius} m · solte para aplicar · Esc cancela`; hint.style.display = '';
  }
  function cancelGesture() {
    const rockGesture=!!pointer?.rock;
    contextPointer = null;
    if (transform.dragging) { gizmoCancelled = true; transform.reset(); transform.pointerUp(null); }
    if (pointer?.roomStart || pointer?.terrainBrush?.mode==='water') clearGroup(preview);
    cancelPointer();
    if(rockGesture)setDocument(sceneDocument,{force:true});
    invalidate(true);
  }
  function onKeyDown(event) {
    altHeld = event.altKey;
    if (transform.object) transform.setRotationSnap(sceneDocument?.layout?.grid?.snap && !altHeld ? Math.PI / 12 : null);
    if (event.key === 'Escape') stopCameraMotion();
    const heightKey = perspectiveHeightCodes.has(event.code);
    const perspectiveHeightKey = camera.isPerspectiveCamera && heightKey;
    const canNavigate = navigationEnabled && document.activeElement === canvas && !document.querySelector('dialog:modal') && controls.enabled && !pointer && !transform.dragging;
    // Ctrl is a height control here: Ctrl+WASD must not reach browser/editor shortcuts.
    const perspectiveCtrlNavigation = canNavigate && camera.isPerspectiveCamera && (movementCodes.has(event.code) || event.key === 'Shift');
    if (event.metaKey || event.altKey || (event.ctrlKey && !perspectiveCtrlNavigation)) { resetNavigation(); return; }
    fastNavigation = event.shiftKey;
    if (canNavigate && movementCodes.has(event.code) && (!heightKey || perspectiveHeightKey)) {
      event.preventDefault();
      if (transition) stopCameraMotion();
      navigationKeys.add(event.code); fastNavigation = event.shiftKey; invalidate();
    }
    if (tool === 'polygon' && !event.target.closest('input,textarea,select') && ['Enter', 'Backspace'].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key === 'Enter') finishPolygon(); else { polygonPoints.pop(); drawPolygon(); } return;
    }
    if (event.key === 'Escape') cancelGesture();
  }
  function onKeyUp(event) { altHeld = event.altKey; fastNavigation = event.shiftKey; navigationKeys.delete(event.code); }
  function onVisibilityChange() { if (document.hidden) { onNavigationBlur(); if (!transition) stopCameraMotion(); lastFrameTime = null; } else invalidate(); }
  function drawPolygon() {
    polygonLine.geometry.dispose();
    const points = polygonPoints.map(p => new THREE.Vector3(p[0], p[1] + .035, p[2]));
    if (points.length > 2) points.push(points[0]);
    polygonLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    polygonLine.visible = points.length > 1 && !presentation;
    hint.textContent = `${polygonPoints.length} vértices · Enter concluir · Backspace remover · Esc cancelar`; hint.style.display = 'block'; invalidate();
  }
  function finishPolygon() {
    if (polygonPoints.length < 3) { report('Adicione ao menos três vértices.'); return; }
    const points = polygonPoints.map(p => [...p]);
    try { onPolygonDraw(points); } catch (error) { report(error); }
  }
  function handleContextMenu(event) {
    event.preventDefault();
    // Browsers may emit contextmenu on press; selection belongs to pointer release.
  }
  function finishContextPointer(event) {
    if (!contextPointer || contextPointer.id !== event.pointerId || event.button !== 2) return;
    const gesture = contextPointer;
    contextPointer = null;
    const rect = canvas.getBoundingClientRect();
    if (presentation || pointer || transform.dragging || gesture.moved || Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 4 ||
      event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    const hit = pick(event);
    onContextMenuCb(event, hit ? { entityId: hit.object.userData.entityId, point: hit.point.toArray() } : null);
  }
  function syncGizmoPlane(event) {
    if (presentation || !transform.enabled || !transform.object) return;
    const pointerPos = transform._getPointer ? transform._getPointer(event) : null;
    if (pointerPos) {
      transform.pointerHover(pointerPos);
      gizmo.updateMatrixWorld(true);
    }
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (navigationEnabled) canvas.focus({ preventScroll: true });
    // Before OrbitControls sees a touch: one finger belongs to the ruler while measuring.
    if (tool === 'measure' && event.button === 0 && event.isPrimary && !presentation) controls.enabled = false;
    if (event.button === 2 && navigationEnabled && !presentation && !pointer && !transform.dragging) {
      contextPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    }
    if (event.button === 0) syncGizmoPlane(event);
  }, { capture: true });
  canvas.addEventListener('pointermove', (event) => {
    if (contextPointer?.id === event.pointerId) contextPointer.moved ||= Math.hypot(event.clientX - contextPointer.x, event.clientY - contextPointer.y) > 4;
    if (!pointer && !transform.dragging && transform.enabled && transform.object && !presentation) {
      const prevAxis = transform.axis;
      syncGizmoPlane(event);
      if (transform.axis !== prevAxis) invalidate();
    }
  }, { passive: true });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerup', finishContextPointer, { capture: true });
  canvas.addEventListener('pointercancel', cancelGesture);
  canvas.addEventListener('lostpointercapture', () => { contextPointer = null; if (pointer) cancelGesture(); });
  // Cancel before controls or other canvas listeners can stop propagation.
  container.addEventListener('contextmenu', handleContextMenu, { capture: true });
  function preventMouseDefault(event) {
    if (event.button === 1 || event.button === 2) event.preventDefault();
  }
  canvas.addEventListener('mousedown', preventMouseDefault);
  canvas.addEventListener('auxclick', preventMouseDefault);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  function onNavigationBlur() { resetNavigation(); contextPointer = null; }
  canvas.addEventListener('blur', onNavigationBlur);
  window.addEventListener('blur', onNavigationBlur);
  document.addEventListener('visibilitychange', onVisibilityChange);

  let thumbnailEffects, thumbnailTarget;
  function thumbnailCanvas(bytes) {
    const image=document.createElement('canvas');image.width=480;image.height=270;
    const pixels=new Uint8ClampedArray(bytes.length),stride=480*4;
    for(let y=0;y<270;y++)pixels.set(bytes.subarray(y*stride,(y+1)*stride),(269-y)*stride);
    image.getContext('2d').putImageData(new ImageData(pixels,480,270),0,0);return image;
  }
  function capturePixels(asynchronous) {
    if(destroyed||pointer||transform.dragging)return null;
    if(snowDirty)rebuildSnow();
    thumbnailEffects??=createEffectsPipeline(renderer,scene,{offscreen:true});
    thumbnailTarget??=new THREE.WebGLRenderTarget(480,270,{depthBuffer:false});
    thumbnailEffects.resize(480,270);thumbnailEffects.setQuality(lightManager.info().tier);
    thumbnailEffects.setLighting(zones,lightManager.volumeLights(),lightManager.quality);
    thumbnailEffects.configure(sceneDocument?.look??sceneDocument?.defaultLook??{});thumbnailEffects.setEnabled(localEffectsEnabled);
    const captureCamera=camera.clone(),crop=Math.min(width/16,height/9);
    captureCamera.setViewOffset(width,height,(width-crop*16)/2,(height-crop*9)/2,crop*16,crop*9);
    const hidden=new Map(),hide=object=>{if(object&&!hidden.has(object)){hidden.set(object,object.visible);object.visible=false;}};
    for(const object of [gridObject,selectionBox,gizmo,preview,polygonLine,brushLine,ruler.group,...extraSelections])hide(object);
    scene.traverse(object=>{if(object.userData.editHelper)hide(object);});
    const started=performance.now(),previousInfo={...renderer.info.render};
    try {
      atmosphere.update(captureCamera,effectTime,true,270,270/(crop*9*renderer.getPixelRatio()));
      diagnostics.measure('thumbnailRender',()=>thumbnailEffects.render(captureCamera,0,thumbnailTarget));
      const bytes=new Uint8Array(480*270*4);
      if(asynchronous)return renderer.readRenderTargetPixelsAsync(thumbnailTarget,0,0,480,270,bytes).then(()=>{diagnostics.record('thumbnailReadback',performance.now()-started);return bytes;});
      renderer.readRenderTargetPixels(thumbnailTarget,0,0,480,270,bytes);return bytes;
    } finally {atmosphere.update(camera,effectTime,true,height*renderer.getPixelRatio());for(const [object,visible] of hidden)object.visible=visible;Object.assign(renderer.info.render,previousInfo,{frame:renderer.info.render.frame});diagnostics.count('thumbnailCaptures');}
  }
  return {
    setDocument, computeSnowExposure,
    async ready() {
      while (pendingAssets.size && !destroyed) await Promise.allSettled([...pendingAssets]);
      if (destroyed) throw new Error('Renderizador encerrado.');
      if(renderer.compileAsync)await warmShaders();
    },
    captureThumbnail() {const bytes=capturePixels(false);return bytes?thumbnailCanvas(bytes).toDataURL('image/jpeg',.78):null;},
    async captureThumbnailAsync() {
      const bytes=await capturePixels(true);if(!bytes||destroyed)return null;const image=thumbnailCanvas(bytes);
      const blob=await new Promise(resolve=>image.toBlob(resolve,'image/jpeg',.78));if(!blob)return null;
      return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
    },
    pick(event) {
      const hit = pick(event);
      return hit ? { entityId: hit.object.userData.entityId, point: hit.point.toArray() } : null;
    },
    setAssets(next) {
      const replacement = new Map(values(next?.assets ?? next).map((record) => [`${record.id}@${record.revision ?? 1}`, record]));
      const changed = replacement.size !== assets.size || [...replacement].some(([key, record]) => JSON.stringify(record) !== JSON.stringify(assets.get(key)));
      assets = replacement;
      if (changed && sceneDocument) {
        // Snapshot delivery calls setAssets then setDocument. Avoid rebuilding the old
        // scene with the new catalog, which would report temporarily missing assets.
        const version = generation;
        queueMicrotask(() => { if (!destroyed && version === generation) setDocument(sceneDocument,{force:true}); });
      }
    },
    setSelection(id, ids = id ? [id] : []) { if(id===selectedId&&ids.length===selectedIds.length&&ids.every((key,i)=>key===selectedIds[i])){diagnostics.count('selectionUpdatesSkipped');return;}selectedId = id; selectedIds = ids; updateSelection(); },
    setTool(mode) { cancelGesture(); ruler.clear(); brushLine.visible = false; if (mode !== tool || mode === 'polygon') { polygonPoints = []; polygonLine.visible = false; } tool = mode; canvas.style.cursor = ['place', 'room', 'polygon', 'window', 'terrain', 'material-sample', 'measure', 'illumination-origin'].includes(mode) ? 'crosshair' : 'default'; updateSelection(); },
    setRulerSnap(value) { rulerSnap = Boolean(value); },
    clearMeasurement() { if (pointer?.ruler) cancelPointer(); ruler.clear(); invalidate(); },
    setTerrainBrush(options) { terrainBrush = { ...terrainBrush, ...options }; },
    setIsolatedLevel(levelId) { if(levelId===isolatedLevel){diagnostics.count('isolationUpdatesSkipped');return;}ruler.clear(); isolatedLevel = levelId; for (const [key, object] of objects) object.visible = visibleRecord(records.get(key)); updateSelection(); invalidate(true); },
    setSupportSurface(id) { if(id===supportSurface)return;supportSurface = id; const host = records.get(id); if (gridObject) gridObject.position.y = (host?.transform?.position[1] ?? workplaneHeight) + (host?.supportHeight ?? 0) * (host?.transform?.scale[1] ?? 1) + .009; invalidate(); },
    setWorkplaneHeight(value) { if(value===workplaneHeight)return;workplaneHeight = value; if (gridObject && !supportSurface) gridObject.position.y = value + .009; invalidate(); },
    finishPolygon,
    setPreview,
    setPresentation(enabled) {
      presentation = enabled;
      cancelGesture();
      ruler.clear();
      preview.visible = !enabled;
      brushLine.visible = false;
      if (gridObject) gridObject.visible = !enabled && Boolean(sceneDocument?.layout?.grid?.visible);
      scene.traverse((child) => { if (child.userData.editHelper) child.visible = !enabled; });
      updateSelection();
      invalidate();
    },
    getCamera, setCamera, setTopView, frameSelection, frameScene, framePreview, stopCameraMotion,
    setNavigationSpeed(value) { if (Number.isFinite(value)) navigationSpeed = Math.max(.2, Math.min(40, value)); },
    setFov(value) { if (!Number.isFinite(value)) return; const next = Math.max(20, Math.min(90, value)); stopCameraMotion(); if (camera.isPerspectiveCamera) { camera.fov = next; camera.updateProjectionMatrix(); onCameraChange(getCamera()); invalidate(); } else lastPerspective = { ...lastPerspective, fov: next }; },
    setCutaway(enabled) { if(enabled===cutaway)return;cutaway = enabled; invalidate(true); },
    setExposure(exposure) { renderer.toneMappingExposure = Math.max(0.2, Math.min(4, exposure)); invalidate(); },
    project(position) {
      camera.updateMatrixWorld(true);
      const vector = new THREE.Vector3(...position).project(camera);
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + (vector.x + 1) * rect.width / 2, y: rect.top + (1 - vector.y) * rect.height / 2, visible: vector.z >= -1 && vector.z <= 1 && Math.abs(vector.x) <= 1 && Math.abs(vector.y) <= 1 };
    },
    getMaterialSlots(id) { return materialSlots(objects.get(id)); },
    setLegibility(value){readingLight.visible=!!value;invalidate();},
    setLightingQuality(tier,custom) {lightManager.setQuality(tier,custom);effects.setQuality?.(tier);invalidate(true);},
    setEffectsEnabled(value) { reflections.configure(sceneDocument?.look??sceneDocument?.defaultLook,value);effects.setEnabled(value); atmosphere.setEnabled(value); localEffectsEnabled=value; configureDistanceFog(sceneDocument?.look ?? sceneDocument?.defaultLook); invalidate(); },
    setSuspended(value){suspended=value;if(value&&renderRequest!=null){cancelAnimationFrame(renderRequest);renderRequest=null;}if(!value)invalidate();},
    isBusy() {return Boolean(pointer||transform.dragging||transition||navigationKeys.size||orbitMoving);},
    performance() {return {...diagnostics.snapshot(),gpuTimingSupported:gpuTimer.supported};},
    resetPerformance() {diagnostics.reset();},
    /** Diagnostic switch: the frame must look the same either way. */
    setMaterialSharing(value) { shareMaterials = !!value; invalidate(); },
    getInfo() { return {performance:{...diagnostics.snapshot(),gpuTimingSupported:gpuTimer.supported}, materialSharing:materialSharing.info(), directionalShadows:[...objects.values()].filter(o=>o.userData.source?.isDirectionalLight).map(o=>({id:o.userData.lightRecord.id,...o.userData.source.userData.shadowFocus})),timingMs:metrics(),programs:renderer.info.programs?.length??0,cutawayShadows:cutawayCasters.info(),lighting:lightManager.info(),zones:zones.uniforms.zoneCount.value,reconciliation:{...runtimeStats},resourceIds:[...objects].map(([id,o])=>({id,uuid:o.uuid})),measurement: ruler.snapshot(), atmosphere: atmosphere.info(), animatedAtmosphere, animatedLocalEffects, localEffects: [...localEffects].map(([id,effect])=>({ id, type: effect.userData.localEffect.config.type, count: effect.userData.localEffect.particles.visible ? effect.userData.localEffect.config.count : 0 })),
      assetDiagnostics:[...objects].flatMap(([id,object])=>{const diagnostics=[];object.traverse(child=>{if(child.userData.diagnostic)diagnostics.push({id,message:child.userData.diagnostic});});return diagnostics;}),
      sculptedRocks:[...objects].flatMap(([id,object])=>{let vertices=0,triangles=0;object.traverse(m=>{if(m.geometry?.userData.sculptPrepared){vertices+=m.geometry.attributes.position.count;triangles+=m.geometry.index.count/3;}});return vertices?[{id,vertices,triangles,samples:records.get(id)?.rockSculpt?.stamps.length??0,bounds:new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).toArray()}]:[];}),
      rockGeometries: [...objects].flatMap(([id,object])=>{const list=[];object.traverse(child=>{if(child.geometry?.userData.rock) list.push({id,...child.geometry.userData.rock,triangles:(child.geometry.index?.count??child.geometry.attributes.position.count)/3});for(const rock of child.geometry?.userData.rocks??[])list.push({id,...rock});});return list;}),
      snowCoats:[...objects].flatMap(([id,object])=>{const list=[];object.traverse(child=>{if(child.userData.physicalSnow)list.push({id,triangles:(child.geometry.index?.count??child.geometry.attributes.position.count)/3,...child.geometry.userData.snowDeposit});});return list;}), snowTriangles, animatedWater, waterSurfaces:[...records.values()].filter(r=>r.kind==='water').map(r=>({id:r.id,...r.water})),
      surfaceMaterials: [...objects].flatMap(([id,object])=>{const list=[]; object.traverse(child=>{for(const mat of Array.isArray(child.material)?child.material:[child.material]) if(mat?.userData.surface) list.push({id,slot:mat.name||child.userData.materialSlot||'base',...mat.userData.surface});});return list;}),
      wearMaterials: [...objects].flatMap(([id,object])=>{const result=[];object.traverse(child=>{for(const mat of Array.isArray(child.material)?child.material:[child.material])if(mat?.userData.wear)result.push({id,slot:mat.name||child.userData.materialSlot||'base',...mat.userData.wear});});return result;}),
      environmentMaterials: [...objects].flatMap(([id, object]) => { const result = []; object.traverse(child => { if (!child.isMesh) return; for (const mat of Array.isArray(child.material) ? child.material : [child.material]) if (mat?.emissiveIntensity > 0 && mat.emissive?.getHex() !== 0) result.push({ id, slot: mat.name || child.userData.materialSlot || 'base', color: '#' + mat.emissive.getHexString(), intensity: mat.emissiveIntensity }); }); return result; }), effects: effects.info(), animatedLights, effectTime, lights: [...objects.values()].filter(o => o.userData.source).map(o => ({ id: o.userData.entityId, type: o.userData.lightRecord.type, intensity: o.userData.source.intensity })), fog: scene.fog?.isFogExp2 ? 'exp2' : scene.fog?.isFog ? 'linear' : null, objects: objects.size, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, cameraMoving: Boolean(transition || navigationKeys.size || Math.hypot(...velocity) || orbitMoving), cameraTransition: Boolean(transition) }; },
    destroy() {
      destroyed = true;gpuTimer.dispose();diagnostics.dispose();lightManager.dispose();reflections.dispose();cutawayCasters.dispose();lightingHelpers.dispose();
      ruler.destroy();
      previewGeneration++;
      for (const helper of extraSelections) disposeObject(helper); disposeObject(polygonLine); disposeObject(brushLine);
      generation += 1;
      clearTimeout(warmupTimer);
      if (renderRequest != null) cancelAnimationFrame(renderRequest);
      observer.disconnect();
      container.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      canvas.removeEventListener('mousedown', preventMouseDefault);
      canvas.removeEventListener('auxclick', preventMouseDefault);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onNavigationBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      controls.dispose();
      transform.dispose();
      releaseRetired();
      clearGroup(content);
      clearGroup(lighting);
      clearGroup(preview);
      if (gridObject) disposeObject(gridObject);
      disposeObject(ground);
      disposeObject(selectionBox);
      cache.destroy();
      reducedMotion.removeEventListener('change', onReducedMotion);
      thumbnailEffects?.dispose();thumbnailTarget?.dispose();
      effects.dispose();
      atmosphere.dispose();
      surfaces.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      hint.remove();
    },
  };
}
