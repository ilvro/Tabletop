import { createScenePreviews } from './scene-previews.js';
import { copyMaterial } from '../domain/material-transfer.js';
import {rockSculptPanel} from '../ui/rock-sculpt-panel.js';
import { EXAMPLE_SCENES, loadExampleScene } from '../data/example-scenes.js';
import {isSculptableRock,ROCK_SCULPT_MODES} from '../domain/rock-sculpt.js';
import { proposeWaterBrush, proposeWaterBed } from '../authoring/water.js';
import { floatingWindow } from '../ui/floating-window.js';
import { groupDisclosures, sectionDisclosure, rememberDisclosures, restoreDisclosures, animateDisclosures } from '../ui/panel-disclosures.js';
import { landscapePanel, waterPanel } from '../ui/landscape-panels.js';
import { proposeVegetation } from '../authoring/vegetation.js';
import { isVegetationAsset } from '../domain/landscape.js';
import { rockDefaults } from '../domain/rocks.js';
import { rockPanel } from '../ui/rock-panel.js';
import { createMountainTerrain } from '../authoring/mountain.js';
import { materialPanel, localEffectPanel } from '../ui/material-panels.js';
import { surfacePatch, layerSurfacePatch, textureFieldPatch, coverageDefaults, distributionOptions, LOCAL_EFFECT_DEFAULTS, smokeDefaults } from '../domain/materials.js';
import { Euler, Quaternion, Vector3 } from 'three';
import { environmentPanel, bindingPanel } from '../ui/environment-panels.js';
import { atmospherePanel, lightPanel } from '../ui/lighting-panels.js';
import { FOG_DEFAULTS, VOLUME_DEFAULTS, BLOOM_DEFAULTS, FLICKER_DEFAULTS, SKY_DEFAULTS, WEATHER_DEFAULTS, DAYLIGHT_DEFAULTS, NIGHT_WINDOWS_DEFAULTS, BINDING_DEFAULTS, colorToHSV, hsvToColor } from '../domain/lighting.js';
import { createScene, createMap, createSceneFromMap, createMapFromScene, createEntity, createToken, createLight, createLevel, createLayer, clone, id, validateDocument, duplicateDocument, migrateDocument } from '../domain/documents.js';
import { polygonSize, groupChain, isSupport, isAccess, supportHeightAt, constrainOpening, localPoint, isLocked } from '../domain/geometry.js';
import { quaternionFromYaw, yawFromQuaternion } from '../domain/coords.js';
import { primaryLight, createEnvironmentFromLook, applyEnvironment, environmentDiff } from '../domain/environments.js';
import { createSceneStore } from '../state/scene-store.js';
import { proposeRoom } from '../authoring/quick-build.js';
import { proposeFurnishing } from '../authoring/furnishing.js';
import { assemblyFor, assemblyMembers } from '../domain/assemblies.js';
import { resampleTerrain, resizeTerrain, protectTerrainFloors } from '../authoring/terrain.js';
import { proposeAnchoring } from '../authoring/anchoring.js';
import { proposePolish } from '../authoring/polish.js';
import { proposeContourWalls } from '../authoring/structures.js';
import { constructionPanel, smartBuildPanel, polishPanel, proposalReport, levelsPanel, terrainPanel, terrainInspector, anchoringPanel } from '../ui/authoring-panels.js';
import { createViewport } from '../render/renderer.js';
import { repository, ApiError } from '../data/api.js';
import { applicationURL, storageScope } from '../data/paths.js';
import { drafts } from '../data/drafts.js';
import { icon, escapeHTML as esc } from '../ui/icons.js';
import { projectPresentation, presentationAssets } from './presentation.js';
import { splitLabels } from '../domain/asset-library.js';
import { assetLibraryPanel, assetCards, metadataEditor } from '../ui/asset-library-panel.js';

const button = (action, label, glyph, className = '', extra = '') => `<button type="button" data-action="${action}" class="${className}" ${extra}>${glyph ? icon(glyph) : ''}<span>${label}</span></button>`;
const numberField = (field, label, value, { min, max, step = .1 } = {}) => `<label class="field"><span>${label}</span><input type="number" data-field="${field}" value="${Number(value).toFixed(3).replace(/\.?0+$/, '') || '0'}" step="${step}" ${min === undefined ? '' : `min="${min}"`} ${max === undefined ? '' : `max="${max}"`} /></label>`;
const colorField = (field, label, value) => `<label class="field color-field"><span>${label}</span><input type="color" data-field="${field}" value="${esc(value)}" /></label>`;
const checkField = (field, label, checked) => `<label class="check"><input type="checkbox" data-field="${field}" ${checked ? 'checked' : ''}/><span>${label}</span></label>`;
const contentJSON = (doc) => { const { revision, createdAt, updatedAt, ...body } = doc; return JSON.stringify(body); };
const entryName = (doc, entry) => doc.actors?.[entry.actorId]?.name ?? entry.name;
const lastSceneKey = `tabletop-last-scene${storageScope()==='/'?'':':'+storageScope()}`;
const lastScene = {
  read() { try { return localStorage.getItem(lastSceneKey); } catch { return null; } },
  write(value) { try { localStorage.setItem(lastSceneKey, value); } catch { /* Optional preference, independent of a confirmed disk write. */ } },
};

export async function startApplication() {
  const root = document.getElementById('app');
  const presentationId = new URLSearchParams(location.search).get('presentation');
  if (presentationId) return startPresentation(root, presentationId);
  root.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <a class="brand" href="${esc(applicationURL(''))}" aria-label="Tabletop"><span class="brand-mark">T</span><span>TABLETOP<small>CRIAR. PREPARAR. APRESENTAR.</small></span></a>
        <div class="document-heading"><span id="doc-type-eyebrow" class="eyebrow">SUA MESA / CENA</span><input id="scene-name" aria-label="Nome da cena" maxlength="256" disabled /></div>
        <div class="panel-toggles"><button data-action="sidebar-toggle" aria-expanded="true" aria-controls="side-content">Ferramentas</button><button data-action="inspector-toggle" aria-expanded="true" aria-controls="inspector-content">Propriedades</button></div><div class="header-actions"><span id="save-status" role="status" class="save-status"></span>${button('new', 'Nova', 'plus', 'quiet')}${button('open', 'Abrir', 'folder', 'quiet')}${button('present', 'Apresentar', 'display', 'quiet')}${button('save', 'Salvar', 'save', 'primary', 'id="save-scene"')}</div>
      </header>
      <aside class="sidebar">
        <nav class="tabs" aria-label="Painéis"><button data-tab="build" class="active">Construir</button><button data-tab="assets" aria-controls="assets-dialog" aria-expanded="false">Assets ↗</button><button data-tab="scene">Cena</button></nav>
        <div id="side-content" class="side-content"></div>
        <footer class="sidebar-footer"><span class="local-dot"></span> ${repository.storage==='browser'?'Dados salvos neste navegador.':'Sua mesa, no seu computador.'}</footer>
      </aside>
      <main class="workspace">
        <div id="viewport" aria-label="Viewport 3D"></div>
        <div class="viewport-top"><div class="tool-strip" role="toolbar" aria-label="Ferramentas">${button('tool-select', '', 'cursor', 'icon-button active', 'title="Selecionar (Q)" aria-label="Selecionar"')}${button('tool-move', '', 'move', 'icon-button', 'title="Mover (G)" aria-label="Mover"')}${button('tool-rotate', '', 'rotate', 'icon-button', 'title="Rotacionar (R)" aria-label="Rotacionar"')}${button('tool-scale', '', 'scale', 'icon-button', 'title="Escala (V)" aria-label="Escala"')}<i></i>${button('material-eyedropper', '', 'eyedropper', 'icon-button', 'title="Conta-gotas (I)" aria-label="Conta-gotas" aria-pressed="false"')}<i></i>${button('undo', '', 'undo', 'icon-button', 'title="Desfazer (Ctrl+Z)" aria-label="Desfazer" id="undo"')}${button('redo', '', 'redo', 'icon-button', 'title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" id="redo"')}</div><div class="view-tag">${icon('room', 15)}<span id="view-tag">VISÃO DO MESTRE</span></div></div>
        <div id="welcome" class="welcome-card"><span class="eyebrow">UMA CENA COMEÇA COM UM ESPAÇO</span><h1>Sua próxima história<br/>começa aqui.</h1><p>Desenhe uma sala, escolha a luz e traga seus personagens para a mesa.</p>${button('room-draw', 'Desenhar minha primeira sala', 'room', 'primary')}<small>Ou use as medidas no painel Construir.</small></div>
        <div id="tool-context" class="tool-context" hidden></div><div id="proposal-bar" class="proposal-bar" hidden></div>
        <div class="viewport-bottom"><div class="camera-strip">${button('perspective', 'Perspectiva', 'camera', 'quiet active')}${button('top', 'Superior', 'floor', 'quiet')}${button('frame', 'Enquadrar', 'frame', 'quiet')}${button('cutaway', 'Ver interior', 'eye', 'quiet active', 'aria-pressed="true"')}${button('fullscreen', 'Tela cheia', 'frame', 'quiet', 'title="Capturar WASD e suas combinações em tela cheia; Esc sai" aria-pressed="false"')}</div><span id="gesture-hint" class="gesture-hint">WASD: câmera · Shift: rápido · Direito: órbita · Scroll: zoom</span></div>
        <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>
      </main>
      <aside class="inspector"><div class="panel-heading"><span class="eyebrow">PROPRIEDADES</span>${icon('scale', 16)}</div><div id="inspector-content"></div></aside>
      <footer class="statusbar"><span id="scene-summary">Preparando sua mesa…</span><span><kbd>Q</kbd> Selecionar <kbd>G</kbd> Mover <kbd>R</kbd> Girar <kbd>V</kbd> Escala <kbd>F</kbd> Enquadrar</span></footer>
    </div>
    <div id="presentation-controls" hidden><span id="presentation-name"></span>${button('present', 'Voltar à edição', 'close', 'quiet')}${button('fullscreen', 'Tela cheia', 'frame', 'quiet')}</div>
    <dialog id="documents-dialog" class="library-dialog floating-window" aria-labelledby="documents-title">
      <div class="dialog-header">
        <div class="dialog-title-group" data-window-handle tabindex="0" role="group" aria-label="Mover janela Abrir: arraste ou use as setas">
          <span class="eyebrow">BIBLIOTECA & GESTÃO</span>
          <h2 id="documents-title">Abrir e gerenciar</h2>
        </div>
        <button type="button" data-window-reset class="quiet" aria-label="Reposicionar janela Abrir" title="Reposicionar janela">↺</button><button type="button" id="close-library-dialog" data-action="close-dialog" class="icon-button dialog-close-btn" aria-label="Fechar painel" title="Fechar (Esc)">
          ${icon('close', 18)}
        </button>
      </div>
      <nav class="dialog-tabs">
        <button type="button" data-dialog-tab="scenes" class="active">${icon('room', 14)} Cenas</button>
        <button type="button" data-dialog-tab="maps">${icon('floor', 14)} Mapas</button>
        <button type="button" data-dialog-tab="tokens">${icon('token', 14)} Tokens</button>
        <button type="button" data-dialog-tab="documents">${icon('folder', 14)} Documentos</button>
      </nav>
      <div id="documents-tab-content" class="dialog-tab-content"></div>
    </dialog>
    <dialog id="assets-dialog" class="floating-window assets-window" aria-labelledby="assets-title">
      <div class="dialog-header"><div data-window-handle class="dialog-title-group" tabindex="0" role="group" aria-label="Mover janela Assets: arraste ou use as setas"><span class="eyebrow">BIBLIOTECA · ARRASTE PARA MOVER</span><h2 id="assets-title">Assets</h2></div><button type="button" data-window-reset class="quiet" aria-label="Reposicionar janela Assets">↺</button><button type="button" data-action="assets-close" class="icon-button" aria-label="Fechar Assets">${icon('close',18)}</button></div>
      <div id="assets-content" class="window-content"></div>
    </dialog>
    <dialog id="asset-metadata-dialog" aria-label="Classificar asset"></dialog>
    <dialog id="recovery-dialog"><span class="eyebrow">RECUPERAÇÃO LOCAL</span><h2>Há trabalho não salvo</h2><p id="recovery-description"></p><div class="dialog-actions">${button('discard-draft', 'Descartar rascunho', '', 'quiet')}${button('restore-draft', 'Restaurar trabalho', 'undo', 'primary')}</div></dialog>
    <div id="context-menu" class="context-menu" hidden></div>
    <input id="asset-file" type="file" accept="image/png,image/jpeg,image/webp,.glb" hidden />
    <input id="document-json-file" type="file" accept=".json,application/json" hidden />`;

  let assets = [], savedScenes = [], savedMaps = [], selection = null, tool = 'select', tab = 'build';
  let materialClipboard = null;
  let dialogTab = 'scenes';
  let savedEnvironments = [], selectedEnvironmentId = '', environmentPreview = null, skyReturnCamera = null;
  const openAtmosphereSections = new Set();
  const sceneDisclosures = new Map(), inspectorDisclosures = new Map();
  let libraryFilters = { search: '', category: '', era: '', context: '', tags: [], favorites: false };
  let libraryLimit = 24, editingAsset = null;
  let proposal = null, placing = null, saving = false, isPresentation = false, cutaway = true;
  let workingCamera = null, publishedCamera = null, recovery = null, draftTimer, noticeTimer;
  let draftQueue = Promise.resolve(), draftWarningShown = false;
  let openTicket = 0;
  let initialized = false;
  let roomOptions = { width: 6, length: 5, height: 2.6, center: [0, 0, 0], door: true, lighting: true };
  let activeSurfaceId, buildHeight = 0, smartFloorId = null, selectedIds = new Set();
  let smartOptions = { template: 'office', density: 'normal', chairs: 4, seed: 1, lighting: true, restoreDeleted: false };
  let anchorEditing = false, anchorHostId = '';
  const openBuildSections = new Set(['room']);
  const openBuildGroups = new Set(['structures']);
  let terrainMaterialTarget = 'layer';
  const compactLayout = window.matchMedia('(max-width:900px)');
  let desktopPanels = { sidebar: false, inspector: false };
  if(compactLayout.matches) root.querySelector('.app-shell').classList.add('sidebar-collapsed','inspector-collapsed');
  function syncPanelToggles() { for(const key of ['sidebar','inspector']) root.querySelector(`[data-action=${key}-toggle]`).setAttribute('aria-expanded',String(!root.querySelector('.app-shell').classList.contains(`${key}-collapsed`))); }
  syncPanelToggles();
  compactLayout.addEventListener('change', event => {
    const shell=root.querySelector('.app-shell');
    if(event.matches) {
      desktopPanels=Object.fromEntries(['sidebar','inspector'].map(key=>[key,shell.classList.contains(`${key}-collapsed`)]));
      shell.classList.add('sidebar-collapsed','inspector-collapsed');
    } else for(const key of ['sidebar','inspector']) shell.classList.toggle(`${key}-collapsed`,desktopPanels[key]);
    syncPanelToggles();
  });
  const assetsWindow = floatingWindow(document.getElementById('assets-dialog'), { trigger: root.querySelector('[data-tab=assets]'), position: [280,96] });
  const documentsWindow = floatingWindow(document.getElementById('documents-dialog'), { trigger: root.querySelector('[data-action=open]'), position: [280,96] });
  animateDisclosures(root);
  let polishOptions = { mode: 'align', axis: 'x', alignment: 'center', angle: 5, seed: 1, palette: 'natural', clearance: .8, referenceId: '' };
  let activeLevelId = null, activeLayerId = null, isolatedLevel = false, polygonHoleHost = null, polygonKind='floor', terrainCell = 0;
  let vegetationOptions={terrainId:'',assetId:'builtin-dense-alpine-fir',count:6,seed:42,scaleMin:.7,scaleMax:1.2,slopeMax:35};
  let terrainOptions = { width: 20, length: 20, segments: 32, x: 0, z: 0, protectFloors: true }, terrainResizeMode = 'extend', terrainBrush = { mode: 'raise', radius: 2, strength: .25, target: 0, waterLevel: .05, waterDepth: .6, shape: 'circle', hardness: 0, snap: false, layerId: '', rockPattern: 'fractured', rockSize: 3, rockSeed: 42, protectFloors: true };
  const constructionSemantics = () => ({ levelId: activeLevelId, layerId: activeLayerId });
  let contextTarget = null, draggedTreeId = null;
  const store = createSceneStore(createScene('Minha primeira cena'));
  const sessionId = id();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(`tabletop-presentation-${sessionId}`) : null;
  let sequence = 0, cameraSequence = 0, publishedDuration = 0;
  let cameraDuration = 1.2, cameraSpeed = 6, effectsEnabled = true;

  function notify(message, error = false, persistent = false) {
    const notice = document.getElementById('notice');
    notice.textContent = message; notice.hidden = false; notice.classList.toggle('error', error);
    clearTimeout(noticeTimer);
    if (!persistent) noticeTimer = setTimeout(() => { notice.hidden = true; }, error ? 8500 : 4000);
  }

  function locate(objectId = selection) {
    const doc = store.document;
    if (doc.layout?.groups?.[objectId]?.anchored) return { type: 'group', record: doc.layout.groups[objectId] };
    if (doc.layout?.entities?.[objectId]) return { type: 'entity', record: doc.layout.entities[objectId] };
    if (doc.tokens?.[objectId]) return { type: 'token', record: doc.tokens[objectId] };
    if (doc.look?.lights?.[objectId] || doc.defaultLook?.lights?.[objectId]) return { type: 'light', record: (doc.look?.lights ?? doc.defaultLook?.lights)[objectId] };
    return null;
  }
  function execute(type, payload, options) {
    try { return store.execute(type, payload, options); }
    catch (error) { notify(error.message, true); viewport.setDocument(store.document); viewport.setSelection(selection); return null; }
  }
  function renameTarget(targetId) {
    const doc = store.document;
    if (doc.layout?.groups?.[targetId]) {
      const group = doc.layout.groups[targetId];
      const nextName = window.prompt('Renomear pasta:', group.name);
      if (nextName !== null && nextName.trim() && nextName.trim() !== group.name) {
        execute('group.update', { id: targetId, patch: { name: nextName.trim() } });
      }
      return;
    }
    const found = locate(targetId);
    if (!found) return;
    const currentName = found.type === 'token' ? doc.actors?.[found.record.actorId]?.name ?? found.record.name : found.record.name;
    const nextName = window.prompt('Renomear objeto:', currentName);
    if (nextName !== null && nextName.trim() && nextName.trim() !== currentName) {
      if (found.type === 'token') {
        execute('token.update', { id: targetId, actorPatch: { name: nextName.trim() }, patch: { name: nextName.trim() } });
      } else {
        execute(`${found.type}.update`, { id: targetId, patch: { name: nextName.trim() } });
      }
    }
  }
  function showContextMenu(x, y, targetId) {
    contextTarget = targetId;
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    const doc = store.document;
    if (doc.layout?.groups?.[targetId]) {
      const group = doc.layout.groups[targetId];
      menu.innerHTML = `
        <div class="context-menu-header">PASTA: ${esc(group.name)}</div>
        <button type="button" class="context-menu-item" data-context="rename">${icon('edit', 14)}<span>Renomear</span></button>
        ${group.anchored ? `<button class="context-menu-item" data-context="unbind">Desancorar objetos</button><button class="context-menu-item" data-context="duplicate">Duplicar composição</button><button class="context-menu-item danger" data-context="delete">Excluir composição</button>` : ''}${selectedIds.size > 1 ? '<button class="context-menu-item" data-context="anchor">Ancorar objetos juntos</button>' : ''}<button type="button" class="context-menu-item danger" data-context="delete-group">${icon('trash', 14)}<span>Deletar</span></button>
      `;
    } else {
      const found = locate(targetId);
      if (!found) return;
      const typeLabel = found.type === 'token' ? 'TOKEN' : found.type === 'light' ? 'LUZ' : ({ floor: 'PISO', wall: 'PAREDE', door: 'PORTA', prop: 'OBJETO' }[found.record.kind] || 'OBJETO');
      const name = found.type === 'token' ? doc.actors?.[found.record.actorId]?.name ?? found.record.name : found.record.name;
      menu.innerHTML = `
        <div class="context-menu-header">${selectedIds.size > 1 ? `${selectedIds.size} SELECIONADOS` : `${typeLabel}: ${esc(name)}`}</div>
        <button type="button" class="context-menu-item" data-context="rename">${icon('edit', 14)}<span>Renomear</span></button>
        <button type="button" class="context-menu-item" data-context="anchor" ${selectedIds.size < 2 ? 'disabled title="Selecione dois ou mais objetos com Shift"' : ''}><span>Ancorar objetos juntos</span></button><button type="button" class="context-menu-item" data-context="mount"><span>Fixar em parede / teto…</span></button><button type="button" class="context-menu-item" data-context="adjust"><span>Alinhar e ajustar…</span></button><button type="button" class="context-menu-item" data-context="duplicate">${icon('copy', 14)}<span>Duplicar</span></button>
        <button type="button" class="context-menu-item danger" data-context="delete">${icon('trash', 14)}<span>Deletar</span></button>
      `;
    }
    menu.hidden = false;
    const menuWidth = menu.offsetWidth, menuHeight = menu.offsetHeight;
    const left = Math.min(x, window.innerWidth - menuWidth - 12);
    const top = Math.min(y, window.innerHeight - menuHeight - 12);
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  }
  function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) menu.hidden = true;
    contextTarget = null;
  }

  const viewport = createViewport(document.getElementById('viewport'), {
    onMaterialSlots: objectId => { if (selection === objectId) renderInspector(); },
    onSelect: (value, meta) => { selectObject(value, meta?.additive); hideContextMenu(); },
    onMaterialPick: objectId => sampleMaterial(objectId),
    onTransform: (objectId, transform, meta = {}) => {
      const found = locate(objectId);
      if (!found) return;
      const patch = found.type === 'light' ? { position: transform.position, rotation: transform.rotation } : { transform };
      if (found.type === 'group') execute('group.transform', { id: objectId, transform, snap: meta.snap });
      else execute(`${found.type}.update`, { id: objectId, patch, snap: meta.snap });
    },
    onPlace: (point) => placeAt(point),
    onWindowPlace: ({ wallId, offset, height: centerHeight }) => {
      const wall = store.document.layout.entities[wallId];
      const width = Math.min(1.2, wall.length - .1), height = Math.min(1, wall.height - .1);
      if (width < .1 || height < .1) { notify('Esta parede é pequena demais para a janela.', true); return; }
      const entity = createEntity('window', { wallId, surfaceId: wall.surfaceId, groupId: wall.groupId, width, height,
        ...constrainOpening(wall, { width, height }, offset, centerHeight - height / 2) });
      if (execute('entity.add', { entity })) { setTool('move'); selectObject(entity.id); notify('Janela criada. Arraste com Mover (G) ou ajuste posição e peitoril no inspetor.'); }
    },
    onOpeningMove: (objectId, patch) => execute('entity.update', { id: objectId, patch }),
    onWaterStroke: (objectId, points, options) => { try { showAuthorshipProposal(proposeWaterBrush(store.document,objectId,points,options,store.editVersion)); } catch(error) { notify(error.message,true); } },
    onRockStroke:(objectId,patch)=>execute('entity.update',{id:objectId,patch,snap:false},{label:'Esculpir superfície de rocha'}),
    onTerrainStroke: (objectId, patch) => execute('entity.update', { id: objectId, patch, snap: false }, { label: patch.paintLayers ? 'Pintar terreno' : 'Esculpir terreno' }),
    onRoomDraw: (rectangle) => { roomOptions = { ...roomOptions, ...rectangle }; tab = 'build'; makeProposal(); renderSidebar(); },
    onPolygonDraw: (points) => {
      if (polygonHoleHost) {
        const floor = store.document.layout.entities[polygonHoleHost];
        const ring = points.map(p => { const local = localPoint(floor, p); return [local[0], local[2]]; });
        if (execute('entity.update', { id: floor.id, patch: { holes: [...(floor.holes ?? []), ring] } }, { label: 'Recortar piso' })) { polygonHoleHost = null; setTool('select'); selectObject(floor.id); }
        return;
      }
      const origin = points[0];
      const vertices = points.map(p => [p[0] - origin[0], p[2] - origin[2]]);
      const entity = createEntity(polygonKind, { name: polygonKind==='water'?'Rio / lago':'Piso poligonal', vertices, position: origin, ...constructionSemantics() });
      if (execute('entity.add', { entity, snap: false })) { setTool('select'); if(isSupport(entity)) activeSurfaceId = entity.id; selectObject(entity.id); renderSidebar(); }
    },
    onError: (error) => notify(error?.message ?? String(error), true, true),
    onContextMenu: (event, hit) => {
      if (hit?.entityId) {
        const target = assemblyFor(store.document,hit.entityId)?.id ?? hit.entityId;
        if (!selectedIds.has(target)) selectObject(target);
        selection = target;
        viewport.setSelection(selection, [...selectedIds]);
        renderInspector();
        renderSceneTreeIfVisible();
        showContextMenu(event.clientX, event.clientY, selection);
      } else {
        hideContextMenu();
      }
    },
    onCameraChange: preset => {
      hideContextMenu();
      root.querySelector('[data-action="perspective"]')?.classList.toggle('active', preset.projection === 'perspective');
      root.querySelector('[data-action="top"]')?.classList.toggle('active', preset.projection === 'orthographic');
      const field = root.querySelector('[data-field="camera-fov"]');
      if (field && document.activeElement !== field) field.value = String(Math.round(preset.fov * 10) / 10);
    },
  });
  let previewWarningShown = false;
  const previews = createScenePreviews({
    viewport, repository, assets: () => assets,
    current: () => ({ document: store.document, version: store.editVersion, dirty: store.dirty, previewing: Boolean(environmentPreview) }),
    onUpdate: () => {
      if (!document.getElementById('documents-dialog')?.hasAttribute('open')) return;
      for (const node of root.querySelectorAll('[data-open], [data-open-map]')) {
        const docId = node.dataset.open ?? node.dataset.openMap;
        const doc = docId === store.document.id ? store.document : [...savedScenes, ...savedMaps].find(item => item.id === docId);
        if (!doc) continue;
        const title = node.querySelector('strong'); if (title) title.textContent = doc.name;
        const detail = node.querySelector('.scene-card-description small');
        if (detail) detail.textContent = doc.revision === 0 ? 'Em criação · ainda não salva' : `Revisão ${doc.revision} · ${new Date(doc.updatedAt).toLocaleString('pt-BR')}`;
        const actions = node.closest('.item-card')?.querySelector('.item-card-actions');
        if (actions) actions.hidden = doc.revision === 0;
        const image = previews.image(doc); if (!image) continue;
        const old = node.querySelector('.scene-thumbnail');
        if (old?.tagName === 'IMG') { if (old.getAttribute('src') !== image) old.src = image; }
        else if (old) { const img = document.createElement('img'); img.className = 'scene-thumbnail'; img.src = image;
          img.alt = `Prévia de ${doc.name}`; img.width = 480; img.height = 270; img.loading = 'lazy'; old.replaceWith(img); }
      }
    },
    onError: error => {
      if (!previewWarningShown) { previewWarningShown = true; notify(`Não foi possível gerar a prévia agora: ${error.message}. Sua cena continua disponível.`, true); }
    },
  });
  function previewImage(doc) {
    const image = previews.image(doc);
    return image ? `<img class="scene-thumbnail" src="${esc(image)}" alt="Prévia de ${esc(doc.name)}" width="480" height="270" loading="lazy" />`
      : '<span class="scene-thumbnail scene-thumbnail-pending" aria-label="Gerando prévia">Gerando prévia…</span>';
  }
  function materialTarget(record) {
    return { id: record.id, ...(record.kind === 'terrain' && terrainMaterialTarget === 'layer' && record.paintLayers?.some(layer => layer.id === terrainBrush.layerId) ? { layerId: terrainBrush.layerId } : {}) };
  }
  function materialTransferControls(record = null) {
    const target = record && materialTarget(record);
    const scope = target?.layerId ? `Camada · ${record.paintLayers.find(layer => layer.id === target.layerId).name}` : record?.kind === 'terrain' ? 'Base · terreno inteiro' : record?.material.textureSlot && record.material.textureSlot !== 'base' ? `Material · ${record.material.textureSlot}` : 'Material do objeto';
    const locked = record ? isLocked(store.document, record) : [...selectedIds].some(objectId => isLocked(store.document, store.document.layout.entities[objectId]));
    return `<div class="material-transfer"><div class="construction-grid">${button('material-copy', 'Copiar material', 'copy', '', `title="Copiar material (Ctrl+Shift+C)" ${!record ? 'disabled' : ''}`)}${button('material-paste', 'Colar material', 'copy', '', `title="Colar material (Ctrl+Shift+V)" ${!materialClipboard || locked ? 'disabled' : ''}`)}</div>${button('material-eyedropper', 'Conta-gotas', 'eyedropper', 'wide', 'title="Conta-gotas (I)"')}<p class="microcopy">${record ? `Alcance: ${esc(scope)}. ` : 'Aplica aos objetos selecionados em uma operação. '}${materialClipboard ? `Copiado de ${esc(materialClipboard.name)}.` : 'Copie um material ou use o conta-gotas na cena.'}</p></div>`;
  }
  function sampleMaterial(objectId = selection) {
    if (tool !== 'material-sample' && selectedIds.size > 1) { notify('Selecione apenas uma superfície para copiar o material ou use o conta-gotas.', true); return; }
    const record = store.document.layout.entities[objectId];
    if (!record?.material || record.water?.state === 'water') { notify('Escolha uma superfície com material editável, como piso, rocha, objeto, terreno ou gelo.', true); return; }
    const target = tool !== 'material-sample' && objectId === selection ? materialTarget(record) : { id: objectId };
    try {
      materialClipboard = { sample: copyMaterial(record, target.layerId ?? null), name: target.layerId ? `${record.name} · ${record.paintLayers.find(layer => layer.id === target.layerId).name}` : record.name };
      if (tool === 'material-sample') setTool('select');
      renderInspector();
      notify(`Material copiado de ${materialClipboard.name}. Escolha o destino e use Colar material.`);
    } catch (error) { notify(error.message, true); }
  }
  function pasteSelectedMaterial() {
    if (!materialClipboard) { notify('Copie um material primeiro ou use o conta-gotas.', true); return; }
    const records = [...selectedIds].map(objectId => store.document.layout.entities[objectId]);
    if (!records.length || records.some(record => !record?.material || record.water?.state === 'water')) { notify('Selecione objetos com material editável para colar.', true); return; }
    const targets = records.map(record => records.length === 1 ? materialTarget(record) : { id: record.id });
    if (execute('material.apply', { targets, sample: materialClipboard.sample }, { label: records.length === 1 ? 'Colar material' : 'Colar materiais na seleção' })) notify('Material aplicado. Ctrl+Z desfaz.');
  }
  function selectObject(value, additive = false) {
    anchorEditing = false;
    value = tool==='terrain'&&isSculptableRock(store.document.layout.entities[value])?value:assemblyFor(store.document,value)?.id??value;
    if (!additive) selectedIds.clear();
    if (value) { if (additive && selectedIds.has(value)) selectedIds.delete(value); else selectedIds.add(value); }
    selection = [...selectedIds].at(-1) ?? null;
    if (['floor', 'terrain'].includes(store.document.layout.entities[selection]?.kind) && !additive) {
      activeSurfaceId = selection;
      if (store.document.layout.entities[selection].kind === 'floor' && smartFloorId !== selection) { smartFloorId = selection; const existing = currentComposition(); if (existing) smartOptions = { ...existing.parameters, restoreDeleted: false }; }
      viewport.setSupportSurface(selection); if (locate()?.record.kind==='terrain') openBuildGroups.add('landscape');
      if (tab === 'build') renderSidebar();
    }
    if(selection && window.innerWidth<=900) {root.querySelector('.app-shell').classList.remove('inspector-collapsed');root.querySelector('.app-shell').classList.add('sidebar-collapsed');syncPanelToggles();}
    if(tool==='terrain'&&isSculptableRock(store.document.layout.entities[selection])&&terrainBrush.mode==='rock'){terrainBrush.mode='push';viewport.setTerrainBrush(terrainBrush);renderToolContext();}
    viewport.setSelection(selection, [...selectedIds]); renderInspector(); renderSceneTreeIfVisible();
    if (store.document.layout.entities[selection]?.kind === 'terrain') document.getElementById('inspector-content').scrollTop = 0;
  }
  function currentComposition() { return Object.values(store.document.layout.compositions).find(c => store.document.layout.areas[c.areaId]?.surfaceId === smartFloorId); }
  function showAuthorshipProposal(next) {
    proposal = next; viewport.setPreview(next); setTool('select');
    const bar = document.getElementById('proposal-bar'); bar.hidden = false;
    bar.innerHTML = `<div><span><strong>${esc(next.label)}</strong><small>${next.materialPreview ? 'Cores propostas' : 'Verde: novo / ajustado'} · vermelho: remoção</small></span></div>${button('cancel-proposal', 'Cancelar', '', 'quiet')}${button('accept-proposal', 'Aceitar proposta', 'plus', 'primary')}<div class="proposal-report">${proposalReport(next)}</div>`;
    document.getElementById('welcome').hidden = true;
  }
  function setTool(next) {
    const previous = tool;
    if (next !== 'polygon') polygonHoleHost = null;
    tool = next; viewport.setTool(next);
    for (const node of root.querySelectorAll('[data-action=material-eyedropper]')) { node.classList.toggle('active', next === 'material-sample'); node.setAttribute('aria-pressed', String(next === 'material-sample')); }
    if (next !== 'place') placing = null;
    root.querySelectorAll('[data-action^="tool-"]').forEach((node) => node.classList.toggle('active', node.dataset.action === `tool-${next}`));
    document.getElementById('gesture-hint').textContent = next === 'material-sample' ? 'Conta-gotas · clique para copiar o material · Esc cancela' : next === 'terrain' ? 'Pincel ativo · T/Q: seleção · [ ]: tamanho · Esc: cancelar traço' : next === 'polygon' ? 'Clique nos vértices · Enter conclui · Backspace remove · Esc cancela' : next === 'window' ? 'Clique na parede para posicionar o centro da janela · Esc cancela' : next === 'room' ? 'Arraste no chão para desenhar a sala · Esc cancela' : next === 'place' ? 'Clique no piso para colocar · Alt: posição livre · Esc cancela' : 'WASD: câmera · Shift: rápido · Direito: órbita · Scroll: zoom';
    renderToolContext();
    if (tab === 'build' && (previous === 'polygon' || next === 'polygon')) renderSidebar();
    if (previous === 'terrain' || next === 'terrain') {renderInspector(); if(next==='terrain') document.getElementById('inspector-content').scrollTop=0;}
  }
  function renderToolContext() {
    const next=tool;
    const context=document.getElementById('tool-context'); context.hidden=['select','move','rotate','scale'].includes(next);
    context.innerHTML=`<span>${esc(next==='material-sample'?'Conta-gotas · clique na superfície de origem':next==='terrain'?`Pincel · ${({push:'Projetar face',pull:'Recuar face',raise:'Elevar',lower:'Rebaixar',smooth:'Suavizar',flatten:'Nivelar',rock:'Rocha natural',paint:'Pintar camada',erase:'Apagar camada',water:'Água'})[terrainBrush.mode]} · ${terrainBrush.radius} m`:next==='polygon'?'Desenhar contorno':next==='room'?'Desenhar sala':'Colocar objeto')}</span><button data-action=tool-select class=quiet>Concluir · Q</button>`;
  }
  function clearProposal() { cancelEnvironmentPreview(); proposal = null; viewport.setPreview(null); document.getElementById('proposal-bar').hidden = true; }
  function makeProposal() {
    try {
      proposal = proposeRoom(roomOptions, store.editVersion);
      for (const record of [...proposal.entities, ...proposal.lights]) Object.assign(record, constructionSemantics());
      viewport.setPreview(proposal);
      const bar = document.getElementById('proposal-bar'); bar.hidden = false;
      bar.innerHTML = `<div>${icon('room')}<span><strong>Prévia de sala</strong><small>${roomOptions.width.toFixed(1)} × ${roomOptions.length.toFixed(1)} m${roomOptions.door ? ' · porta' : ''}${roomOptions.lighting ? ' · iluminação' : ''}</small></span></div>${button('cancel-proposal', 'Cancelar', '', 'quiet')}${button('accept-proposal', 'Criar sala', 'plus', 'primary')}`;
      document.getElementById('welcome').hidden = true; setTool('select');
    } catch (error) { clearProposal(); notify(error.message, true); }
  }
  function placeAt({ position, surfaceId = null, snap }) {
    if (!placing) return;
    let newId;
    if (placing.type === 'token') {
      const pair = createToken({ name: placing.name, color: placing.color, assetRef: placing.assetRef ?? null, position, surfaceId, ...constructionSemantics() });
      if (store.document.layout.entities[surfaceId]?.levelId) pair.token.levelId = store.document.layout.entities[surfaceId].levelId;
      if (execute('token.add', { ...pair, snap })) newId = pair.token.id;
    } else if (placing.type === 'light') {
      const light = createLight({ type: placing.lightType ?? 'point', position: [position[0], position[1] + 2.2, position[2]], surfaceId, ...constructionSemantics() });
      if (execute('light.add', { light })) newId = light.id;
    } else if (['stairs', 'ramp'].includes(placing.type)) {
      const candidateLevel = store.document.layout.levels?.[store.document.layout.entities[surfaceId]?.levelId ?? activeLevelId];
      const from = candidateLevel && Math.abs(candidateLevel.elevation - position[1]) < 1e-6 ? candidateLevel : null;
      const to = Object.values(store.document.layout.levels ?? {}).filter(l => l.elevation > (from?.elevation ?? position[1])).sort((a,b) => a.elevation - b.elevation)[0];
      const entity = createEntity(placing.type, { position, surfaceId, ...constructionSemantics(), ...(from && to ? { fromLevelId: from.id, toLevelId: to.id, height: to.elevation - from.elevation } : {}) });
      if (execute('entity.add', { entity, snap })) newId = entity.id;
    } else {
      const asset = placing.asset;
      const geological=rockDefaults(asset.id);
      const entity = createEntity('prop', { ...(isVegetationAsset(asset.id)?{vegetationSeed:0}:{}), ...(geological ? {material:{...surfacePatch('rock'),rockPattern:geological.form.startsWith('organic')?'organic':['strata','cliff','spire'].includes(geological.form)?'strata':geological.form==='rounded'?'granite':'fractured'},rockShape:geological} : {}), name: asset.name, position, surfaceId, assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint ?? [1, 1], ...constructionSemantics(), ...(asset.supportHeight ? { supportHeight: asset.supportHeight } : {}), ...(placing.localEffect || asset.id==='builtin-campfire' ? { localEffect: clone(placing.localEffect??LOCAL_EFFECT_DEFAULTS) } : {}) });
      if (execute('entity.add', { entity, snap })) newId = entity.id;
    }
    if (newId) { setTool('move'); selectObject(newId); notify('Adicionado à cena. Você pode mover, girar e editar.'); }
  }
  function flushDraft() {
    clearTimeout(draftTimer);
    if (recovery) return;
    const doc = clone(store.document), dirty = store.dirty;
    const meaningful = store.editVersion > 0 || doc.revision > 0;
    draftQueue = draftQueue.catch(() => {}).then(() => dirty && meaningful ? drafts.write(doc) : drafts.clear()).catch((error) => {
      if (!draftWarningShown) { draftWarningShown = true; notify(`A recuperação automática não está disponível: ${error.message}. Use Salvar ou baixe o JSON pela Gestão da Mesa.`, true); }
    });
  }
  function broadcast() {
    if (!channel) return;
    const doc = projectPresentation(store.document);
    channel.postMessage({ version: 1, type: 'snapshot', sessionId, sequence: ++sequence, document: doc, assets: presentationAssets(doc, assets), camera: publishedCamera ?? viewport.getCamera(), cameraSequence, cameraDuration: publishedDuration, cutaway });
  }
  channel?.addEventListener('message', (event) => {
    if (event.data?.version === 1 && event.data?.sessionId === sessionId && event.data.type === 'ready') broadcast();
  });

  function publishCamera(preset, duration = cameraDuration) {
    publishedCamera = clone(preset); publishedDuration = duration; cameraSequence++; broadcast();
  }
  function cameraPanel() {
    const current = viewport.getCamera();
    return `<section><span class="eyebrow">CÂMERA CINEMATOGRÁFICA</span>
      <p class="microcopy">Clique na mesa e use WASD para viajar e Shift para acelerar. Na perspectiva, Espaço sobe e Ctrl desce; Ctrl+WASD navega com foco na mesa. Para Ctrl+S/D salvar/duplicar, dê foco a outro controle ou use os botões. Page Up/Down também alteram a altura. Arraste com o botão direito para orbitar; solte sem arrastar para selecionar. Roda aproxima.</p>
      ${numberField('camera-speed', 'Velocidade · m/s', cameraSpeed, { min: .2, max: 40, step: .2 })}
      ${numberField('camera-fov', 'Lente · campo de visão em graus', current.fov, { min: 20, max: 90, step: 1 })}
      <label class="field"><span>Troca de enquadramento</span><select data-field="camera-duration">${[[0,'Corte imediato'],[.6,'Rápida · 0,6 s'],[1.2,'Suave · 1,2 s'],[2.5,'Dramática · 2,5 s'],[4,'Contemplativa · 4 s']].map(([duration,label]) => `<option value="${duration}" ${cameraDuration === duration ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <div class="field-grid">${button('camera-stop', 'Parar transição', 'close', 'quiet')}${button('camera-cut', 'Cortar agora', 'camera', 'quiet')}</div>
      <p class="microcopy">Enquadramentos salvos e publicação usam a duração escolhida. Parar conserva o ponto atual e publica; Cortar chega ao destino imediatamente. A navegação livre conserva a câmera do projetor.</p>
    </section>`;
  }
  function renderSidebar() {
    root.querySelectorAll('[data-tab]').forEach((node) => { const active = node.dataset.tab === tab; node.classList.toggle('active', active); if (node.dataset.tab !== 'assets') node.setAttribute('aria-pressed', String(active)); });
    if (document.getElementById('assets-dialog').open) renderAssets();
    const panel = document.getElementById('side-content');
    const scroll = panel.scrollTop;
    const focused = panel.contains(document.activeElement) ? document.activeElement.dataset.field : null;
    if (panel.dataset.currentTab === 'scene') rememberDisclosures(panel, sceneDisclosures);
    panel.dataset.currentTab = tab;
    if (tab === 'build') {
      panel.innerHTML = `<section class="quick-section"><span class="eyebrow">QUICK BUILD</span><h2>Um espaço para a história.</h2><p class="muted">Desenhe no chão ou comece pelas medidas. Tudo continua editável.</p>${button('room-draw', 'Desenhar sala', 'room', 'wide accent-outline')}<form id="quick-form"><div class="field-grid">${numberField('room-width', 'Largura interna · m', roomOptions.width, { min: 1.4 })}${numberField('room-length', 'Comprimento · m', roomOptions.length, { min: 1 })}</div>${numberField('room-height', 'Altura das paredes · m', roomOptions.height, { min: 2.2 })}<span class="section-caption">SUGESTÕES OPCIONAIS</span>${checkField('room-door', 'Incluir uma porta', roomOptions.door)}${checkField('room-lighting', 'Adicionar iluminação', roomOptions.lighting)}<button class="primary wide" type="submit">${icon('eye')} Ver prévia</button></form></section><section><span class="eyebrow">CONSTRUIR MANUALMENTE</span><div class="construction-grid">${button('floor-add', 'Piso', 'floor')}${button('wall-add', 'Parede', 'wall')}${button('door-add', 'Porta', 'door')}${button('light-place', 'Luz pontual', 'light')}${button('spot-place', 'Luz spot', 'light')}${button('fire-place', 'Fogueira', 'light')}${button('smoke-place', 'Fumaça', 'light')}</div></section><section><span class="eyebrow">PERSONAGENS</span><label class="field"><span>Nome do token</span><input id="token-name" value="Investigador" maxlength="256" /></label><div class="token-controls"><input id="token-color" aria-label="Cor do token" type="color" value="#e4b76f" />${button('token-place', 'Colocar token', 'token', 'wide')}</div><p class="microcopy">Para usar um retrato, importe uma imagem na biblioteca.</p></section><section><span class="eyebrow">GRID E PRECISÃO</span>${checkField('grid-visible', 'Mostrar grid', store.document.layout.grid.visible)}${checkField('grid-snap', 'Encaixar no grid', store.document.layout.grid.snap)}${numberField('grid-size', 'Célula · m', store.document.layout.grid.cellSize, { min: .1 })}</section>`;
      panel.innerHTML += constructionPanel(store.document, { surfaceId: activeSurfaceId, height: buildHeight, polygon: tool === 'polygon' });
      panel.innerHTML += levelsPanel(store.document, { levelId: activeLevelId, layerId: activeLayerId, isolated: isolatedLevel });
      panel.innerHTML += terrainPanel(terrainOptions);
      panel.innerHTML += landscapePanel(store.document,vegetationOptions,assets,{numberField});
      panel.innerHTML += smartBuildPanel(store.document, smartOptions, smartFloorId, currentComposition());
      const tasks = [['room','Sala'],['manual','Peças avulsas'],['characters','Personagens'],['grid','Grid e precisão'],['structures','Pisos, paredes e acessos'],['levels','Andares e camadas'],['terrain','Terreno e relevo'],['landscape','Água e vegetação'],['furnishing','Mobiliar cômodo']];
      const taskSections = [...panel.children].map((section, i) => ({ section, key: tasks[i][0], label: tasks[i][1] }));
      const groups = [['landscape', 'Paisagem', 'Terreno, água e vegetação', ['terrain','landscape']], ['structures', 'Construções', 'Salas, superfícies e mobiliário', ['room','structures','manual','furnishing']], ['characters', 'Personagens', 'Tokens e retratos', ['characters']], ['organization', 'Organização', 'Andares, camadas e precisão', ['levels','grid']]];
      const containers = new Map();
      for (const [key,label,description] of groups) {
        const group = document.createElement('details'); group.className = 'build-group'; group.dataset.buildGroup = key; group.open = openBuildGroups.has(key);
        group.innerHTML = `<summary><strong>${label}</strong><small>${description}</small></summary><div class=build-group-content></div>`; panel.append(group); containers.set(key, group.lastElementChild);
      }
      taskSections.forEach(({ section, key, label }) => {
        const details = document.createElement('details'); details.className = 'build-task'; details.dataset.buildSection = key; details.open = openBuildSections.has(key);
        const summary = document.createElement('summary'); summary.textContent = label; details.append(summary, section); containers.get(groups.find(group => group[3].includes(key))[0]).append(details);
      });
      panel.insertAdjacentHTML('afterbegin', '<div class=workflow-intro><span class=eyebrow>CONSTRUIR SEU MAPA</span><p>Escolha uma tarefa. Selecione na cena para editar nas Propriedades.</p></div>');

    } else {
      const currentLook = store.document.look ?? store.document.defaultLook;
      panel.innerHTML = `${environmentPanel(store.document, savedEnvironments, selectedEnvironmentId, openAtmosphereSections, { numberField, colorField, checkField })}${atmospherePanel(currentLook, effectsEnabled, { numberField, colorField, checkField }, openAtmosphereSections)}${cameraPanel()}<section><span class="eyebrow">ENQUADRAMENTOS</span>${button('camera-save', 'Salvar câmera atual', 'camera', 'wide')}<div class="camera-presets">${Object.values(store.document.cameraPresets || {}).map((camera) => `<div class="preset-row"><button data-camera="${camera.id}">${icon('camera', 14)}${esc(camera.name)}</button><button data-camera-cut="${camera.id}" title="Cortar para este enquadramento" aria-label="Cortar para ${esc(camera.name)}">${icon('camera', 14)}</button><button data-camera-delete="${camera.id}" aria-label="Excluir enquadramento ${esc(camera.name)}">${icon('close', 14)}</button></div>`).join('') || '<p class="microcopy">Prepare uma câmera para a apresentação.</p>'}</div>${button('presentation-window', 'Abrir segunda tela', 'display', 'wide accent-outline')}${button('publish-camera', 'Publicar câmera atual', 'camera', 'wide quiet')}</section><section><span class="eyebrow">DOCUMENTO</span>${button('duplicate-scene', store.document.documentType === 'map' ? 'Salvar como novo mapa' : 'Salvar como nova cena', 'copy', 'wide')}<p class="microcopy">Duplica também suas alterações locais, preservando os assets.</p></section><section><div class="tree-header"><span class="eyebrow">ELEMENTOS DA CENA</span>${button('group-add', 'Nova pasta', 'plus', 'quiet')}</div><div id="scene-tree"></div></section>`;
      groupDisclosures(panel, [
        { key: 'atmosphere', title: 'Atmosfera', description: 'Ambientes, iluminação, céu e efeitos', open: true, tasks: [
          [0,'presets','Ambientes e horários',true], [1,'sun','Sol / lua e cor da luz'], [2,'sky','Céu e nuvens'],
          [3,'weather','Clima e partículas'], [4,'night','Objetos que acendem à noite'], [5,'effects','Névoa, bloom e qualidade'],
        ] },
        { key: 'cameras', title: 'Câmera e apresentação', description: 'Navegação, enquadramentos e projetor', tasks: [
          [6,'navigation','Câmera cinematográfica',true], [7,'shots','Enquadramentos e publicação',true],
        ] },
        { key: 'elements', title: 'Elementos e documento', description: 'Objetos, pastas e cópias da cena', open: true, tasks: [
          [9,'objects','Elementos da cena',true], [8,'document','Documento'],
        ] },
      ]);
      restoreDisclosures(panel, sceneDisclosures);
      panel.insertAdjacentHTML('afterbegin', '<div class="workflow-intro"><span class="eyebrow">PREPARAR SUA CENA</span><p>Abra um grupo para ajustar a atmosfera, preparar a apresentação ou organizar os objetos.</p></div>');
      renderSceneTreeIfVisible();
    }
    if (focused) panel.querySelector(`[data-field="${focused}"]`)?.focus({ preventScroll: true });
    panel.scrollTop = scroll;
  }
  function renderAssets() {
    const panel = document.getElementById('assets-content'), scroll = panel.scrollTop;
    panel.innerHTML = assetLibraryPanel(assets, libraryFilters, repository.storage); renderAssetCards(); panel.scrollTop = scroll;
  }
  function renderAssetCards() {
    const node = document.getElementById('asset-cards'); if (!node) return;
    const result = assetCards(assets, libraryFilters, libraryLimit);
    node.innerHTML = result.cards;
    document.getElementById('asset-result-count').textContent = `${result.total} de ${assets.length} assets · ${result.shown} exibidos`;
    document.querySelector('[data-library-more]').hidden = result.shown >= result.total;
    document.getElementById('asset-active-tags').innerHTML = libraryFilters.tags.map(tag => `<button type="button" class="asset-tag active" data-library-remove-tag="${esc(tag)}" aria-label="Remover filtro ${esc(tag)}">${esc(tag)} ×</button>`).join('');
  }

  async function updateAssetClassification(asset, metadata) {
    const updated = await repository.updateAssetMetadata(asset, metadata);
    assets = assets.map(item => item.id === updated.id ? updated : item);
    viewport.setAssets(assets); renderSidebar();
    return updated;
  }

  async function saveAssetClassification(form) {
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    const fields = new FormData(form);
    try {
      await updateAssetClassification(editingAsset, { category: fields.get('category'), era: fields.get('era'), contexts: splitLabels(fields.get('contexts')), tags: splitLabels(fields.get('tags')), favorite: fields.has('favorite') });
      document.getElementById('asset-metadata-dialog').close(); editingAsset = null;
      notify('Classificação salva na biblioteca.');
    } catch (error) {
      document.getElementById('asset-metadata-error').textContent = error.message;
      if (error.status === 409) {
        assets = await repository.assets().catch(() => assets); viewport.setAssets(assets); renderSidebar();
      }
    } finally { submit.disabled = false; }
  }
  function renderSceneTreeIfVisible() {
    const tree = document.getElementById('scene-tree'); if (!tree) return;
    const doc = store.document;
    const groups = Object.values(doc.layout?.groups || {});
    const entities = Object.values(doc.layout?.entities || {});
    const tokens = Object.values(doc.tokens || {});
    const lights = Object.values(doc.look?.lights || doc.defaultLook?.lights || {});

    const renderEntry = (entry) => {
      const typeGlyph = entry.kind === 'floor' ? 'floor' : entry.kind === 'wall' ? 'wall' : entry.kind === 'door' ? 'door' : entry.actorId ? 'token' : entry.type ? 'light' : 'room';
      const name = entryName(doc, entry);
      return `<div draggable="true" data-drag-id="${entry.id}" data-select="${entry.id}" class="tree-entry ${selectedIds.has(assemblyFor(doc,entry.id)?.id ?? entry.id) ? 'selected' : ''}">
        ${icon(typeGlyph, 14)}
        <span class="tree-label" title="${esc([name, doc.layout.levels?.[entry.levelId]?.name, doc.layout.layers?.[entry.layerId]?.name].filter(Boolean).join(' · '))}">${esc(name)}</span>${entry.levelId && doc.layout.levels?.[entry.levelId] ? `<small title="Andar">${esc(doc.layout.levels[entry.levelId].name)}</small>` : ''}
        ${entry.audience === 'gm' ? '<small>GM</small>' : ''}
        <div class="tree-entry-actions">
          <button type="button" class="tree-action-btn" data-tree-rename="${entry.id}" title="Renomear">${icon('edit', 12)}</button>
          <button type="button" class="tree-action-btn" data-tree-menu="${entry.id}" title="Mais opções">${icon('dots', 12)}</button>
        </div>
      </div>`;
    };

    let html = '';

    if (groups.length > 0) {
      const renderGroup = group => {
        const groupEntities = [...entities, ...tokens, ...lights].filter(e => e.groupId === group.id);
        return `<div class="tree-group" data-drop-group="${group.id}">
          <div class="tree-group-header" data-group-id="${group.id}">
            ${icon('folder', 14)}
            ${group.anchored ? `<button class="group-title" data-action="assembly-select" data-id="${group.id}" title="Selecionar composição">${esc(group.name)} · ancorada</button>` : `<span class="group-title" title="${esc(group.name)}">${esc(group.name)}</span>`}
            <div class="group-actions">
              <button type="button" data-group-visible="${group.id}" title="${group.visible === false ? 'Mostrar pasta' : 'Ocultar pasta'}">${icon('eye', 12)}</button>
              <button type="button" data-group-lock="${group.id}" title="${group.locked ? 'Desbloquear pasta' : 'Bloquear pasta'}">${group.locked ? '🔒' : '🔓'}</button>
              <button type="button" data-group-rename="${group.id}" title="Renomear pasta">${icon('edit', 12)}</button>
              <button type="button" data-group-delete="${group.id}" title="Excluir pasta">${icon('trash', 12)}</button>
            </div>
          </div>
          ${group.anchored ? `<button class="assembly-release wide quiet" data-action="assembly-unbind" data-id="${group.id}">Desancorar objetos</button>` : ''}<div class="tree-group-items" data-drop-group="${group.id}">
            ${groups.filter(child => child.parentId===group.id).map(renderGroup).join('')}${groupEntities.length > 0 ? groupEntities.map(renderEntry).join('') : groups.some(child => child.parentId===group.id) ? '' : '<div class="tree-group-empty">Pasta vazia (arraste aqui)</div>'}
          </div>
        </div>`;
      };
      html += groups.filter(group => !group.parentId).map(renderGroup).join('');
    }

    const rootEntities = entities.filter((e) => !e.groupId);
    if (groups.length > 0 && rootEntities.length > 0) {
      html += `<div class="tree-section-title">Sem pasta (Raiz)</div>`;
    }
    if (rootEntities.length > 0) {
      html += `<div class="tree-group-items" data-drop-group="">${rootEntities.map(renderEntry).join('')}</div>`;
    }

    if (tokens.length > 0) {
      html += `<div class="tree-section-title">Personagens</div><div class="tree-group-items">${tokens.filter(e => !e.groupId).map(renderEntry).join('')}</div>`;
    }

    if (lights.length > 0) {
      html += `<div class="tree-section-title">Iluminação</div><div class="tree-group-items">${lights.filter(e => !e.groupId).map(renderEntry).join('')}</div>`;
    }

    if (!html) {
      html = '<p class="microcopy">Nenhum elemento na cena.</p>';
    }

    tree.innerHTML = html;
  }
  function renderInspector() {
    if (!selection) anchorEditing = false;
    if (anchorEditing && !store.document.layout.entities[anchorHostId]) anchorHostId = '';
    if (anchorEditing) { document.getElementById('inspector-content').innerHTML = anchoringPanel(store.document, [...selectedIds], anchorHostId); return; }
    if (selection && !selectedIds.has(selection)) selectedIds = new Set([selection]);
    if (!selection) selectedIds.clear();
    if (selectedIds.size > 1) { document.getElementById('inspector-content').innerHTML = `<section><span class="eyebrow">UNIR OBJETOS</span><button class="wide primary" data-action="assembly-bind">Ancorar objetos juntos</button><p class="microcopy">Cria uma composição que se seleciona, move e gira como uma unidade. Desancore pela pasta para editar os objetos individualmente.</p></section>` + ([...selectedIds].every(objectId => store.document.layout.entities[objectId]?.material && store.document.layout.entities[objectId].water?.state !== 'water') ? `<section><span class=eyebrow>MATERIAIS DA SELEÇÃO</span>${materialTransferControls()}</section>` : '') + polishPanel(selectedIds.size, polishOptions, store.document); viewport.setSelection(selection, [...selectedIds]); return; }
    const panel = document.getElementById('inspector-content'), found = locate();
    const scroll = panel.dataset.objectId === selection ? panel.scrollTop : 0;
    panel.dataset.objectId = selection ?? '';
    rememberDisclosures(panel, inspectorDisclosures);
    const focused = panel.contains(document.activeElement) ? document.activeElement.dataset.field : null;
    const geometryDisclosures = new Map([...panel.querySelectorAll('[data-disclosure=terrain-area]')].map(node=>[node.dataset.disclosure,node.open]));
    const textureDisclosures = new Map([...panel.querySelectorAll('[data-texture-options]')].map(node => [node.dataset.textureOptions, node.open]));
    const adjustmentsOpen = panel.querySelector('.object-adjustments')?.open ?? false;
    const terrainAdvancedOpen = panel.querySelector('[data-disclosure="terrain-advanced"]')?.open ?? false;
    const terrainObjectSettingsOpen = panel.querySelector('[data-disclosure="terrain-object-settings"]')?.open ?? false;
    if (!found) {
      panel.innerHTML = `<div class="empty-inspector">${icon('cursor', 30)}<h3>Selecione um elemento</h3><p>Escolha um objeto na cena para editar posição, material e propriedades.</p><div class="inspector-guide"><span>${icon('move', 15)}Posicione com precisão</span><span>${icon('light', 15)}Crie a atmosfera</span><span>${icon('camera', 15)}Prepare o enquadramento</span></div></div>`;
      return;
    }
    const { type, record } = found, doc = store.document;
    if (type === 'group') {
      const members = assemblyMembers(doc,record.id), t=record.transform;
      panel.innerHTML=`<div class="object-title"><strong>${esc(record.name)}</strong><small>COMPOSIÇÃO ANCORADA · ${members.length} objetos</small></div><label class="field"><span>Nome da pasta</span><input data-field="assembly-name" value="${esc(record.name)}" maxlength="256"/></label><p class="microcopy">Clique em qualquer membro para selecionar todos. Mover (G), Rotacionar (R) e Escalar (S) atuam na composição inteira.</p><section><span class="eyebrow">POSIÇÃO DA COMPOSIÇÃO</span><div class="axis-fields">${t.position.map((value,i) => numberField(`assembly-position-${i}`,['X','Y · altura','Z'][i],value)).join('')}</div>${numberField('assembly-yaw','Rotação Y · graus',yawFromQuaternion(t.rotation),{ step:15 })}${numberField('assembly-size','Tamanho uniforme',t.scale[0],{ min:.01 })}</section><details><summary>Objetos da composição</summary><ul>${members.map(member => `<li>${esc(entryName(doc,member))}</li>`).join('')}</ul></details><button class="wide" data-action="assembly-unbind" data-id="${record.id}">Desancorar objetos</button><p class="microcopy">Desancorar conserva as posições e a pasta; seus objetos voltam a ser selecionados individualmente.</p><div class="object-actions">${button('object-copy','Copiar','copy')}${button('object-duplicate','Duplicar','copy')}${button('object-delete','Excluir','trash','danger')}</div>`;
      organizeInspector();
      if (focused) panel.querySelector(`[data-field="${focused}"]`)?.focus({ preventScroll: true });
      panel.scrollTop = scroll;
      return;
    }

    const actor = type === 'token' ? doc.actors[record.actorId] : null;
    const name = actor?.name ?? record.name;
    const position = record.transform?.position ?? record.position;
    let fields = `<div class="object-title"><span class="object-icon">${icon(type === 'token' ? 'token' : type === 'light' ? 'light' : record.kind === 'door' ? 'door' : 'room', 24)}</span><span><small>${type === 'token' ? 'TOKEN' : type === 'light' ? 'LUZ' : ({ water: record.water?.state==='ice'?'GELO':'ÁGUA', terrain: 'TERRENO', floor: 'PISO', wall: 'PAREDE', door: 'PORTA', window: 'JANELA', stairs: 'ESCADA', ramp: 'RAMPA', prop: 'ASSET' }[record.kind])}</small><strong>${esc(name)}</strong></span></div><label class="field"><span>Nome</span><input data-field="object-name" value="${esc(name)}" maxlength="256" /></label>`;
    if(isSculptableRock(record))fields+=rockSculptPanel(record,terrainBrush,tool==='terrain',{numberField});
    if (record.kind === 'terrain') {
      if(!record.paintLayers?.length) terrainMaterialTarget='base';
      if (!record.paintLayers?.some(layer => layer.id === terrainBrush.layerId)) terrainBrush.layerId = record.paintLayers?.[0]?.id ?? '';
      viewport.setTerrainBrush(terrainBrush);
      const basePanel = `<details class=terrain-base-material data-disclosure=terrain-base-material ${terrainMaterialTarget === 'base' ? 'open' : ''}><summary>Material base · terreno inteiro</summary><p class=scope-hint>Edite aqui a textura base e os ajustes gerais do terreno. Para alterar somente uma camada, escolha-a no seletor acima. Relevo e cobertura são compartilhados.</p>${materialPanel(record, viewport.getMaterialSlots(record.id), { numberField, colorField })}</details>`;
      fields += terrainInspector(record, terrainBrush, Math.min(terrainCell, record.heights.length - 1), tool === 'terrain', terrainAdvancedOpen, terrainMaterialTarget !== 'base', terrainResizeMode, terrainMaterialTarget, basePanel, materialTransferControls(record));
    }
    if(record.kind==='water') fields+=waterPanel(record,{numberField,colorField},store.document);
    if (record.kind === 'floor') fields += `<section><span class="eyebrow">ABERTURAS E PAREDES</span><button data-action="floor-hole" class="wide">Recortar piso · vão de escada / pátio</button><p class="microcopy">Clique nos cantos do vão dentro deste piso; Enter conclui. O recorte atravessa sua espessura.</p><button data-action="contour-walls" class="wide">Criar paredes do contorno</button><p class="microcopy">Revise antes de aceitar. Paredes de bordas compartilhadas são reaproveitadas; encontros em L e T se ajustam automaticamente.</p></section>`;
    if (record.kind === 'terrain') fields += `<details data-disclosure="terrain-object-settings" ${terrainObjectSettingsOpen ? 'open' : ''}><summary>Posição, organização e apresentação</summary>`;
    if (position) {
      fields += `<section><span class="eyebrow">POSIÇÃO · METROS</span><div class="axis-fields">${position.map((value, axis) => numberField(`position-${axis}`, ['X', 'Y · altura', 'Z'][axis], value)).join('')}</div>${numberField('object-yaw', 'Rotação Y · graus', type === 'light' ? new Euler().setFromQuaternion(new Quaternion(...record.rotation), 'YXZ').y * 180 / Math.PI : yawFromQuaternion(record.transform.rotation), { step: 15 })}</section>`;
    }
    if (type === 'entity' || type === 'token' || type === 'light') {
      fields += `<section><span class="eyebrow">ORGANIZAÇÃO</span><label class="field"><span>Pasta / Grupo</span><select data-field="entity-group"><option value="">(Sem pasta / Raiz)</option>${Object.values(doc.layout.groups).map((g) => `<option value="${g.id}" ${record.groupId === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label></section>`;
    }
    if (record.transform) fields += `<section><span class="eyebrow">SUPERFÍCIE DE APOIO</span><label class="field"><span>Apoio</span><select data-field="object-surface"><option value="">Sem vínculo</option>${Object.values(doc.layout.entities).filter(e => e.id !== record.id && isSupport(e)).map(e => `<option value="${e.id}" ${record.surfaceId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>${record.kind === 'prop' ? checkField('prop-support', 'Oferecer superfície de apoio', Boolean(record.supportHeight)) + (record.supportHeight ? numberField('supportHeight', 'Altura local do apoio · m', record.supportHeight, { min: .01 }) : '') : ''}</section>`;
    fields += `<section><span class="eyebrow">ANDAR / CAMADA</span>${[['object-level','Andar','levels','levelId'],['object-layer','Camada','layers','layerId']].map(([field,label,collection,key]) => `<label class="field"><span>${label}</span><select data-field="${field}"><option value="">Sem vínculo</option>${Object.values(doc.layout[collection] ?? {}).map(entry => `<option value="${entry.id}" ${record[key] === entry.id ? 'selected' : ''}>${esc(entry.name)}</option>`).join('')}</select></label>`).join('')}</section>`;

    if (record.kind === 'floor' && record.holes?.length) fields += `<section><span class="eyebrow">RECORTES DO PISO</span>${record.holes.map((ring,h) => `<details><summary>Furo ${h + 1} · ${ring.length} vértices</summary>${ring.map((p,i) => `<div class="field-grid">${numberField(`hole-${h}-${i}-0`,'X local',p[0])}${numberField(`hole-${h}-${i}-1`,'Z local',p[1])}</div>`).join('')}<button data-action="hole-remove" data-index="${h}">Remover recorte</button></details>`).join('')}</section>`;
    if (isAccess(record)) fields += `<section><span class="eyebrow">ANDARES CONECTADOS</span>${[['fromLevelId','Origem'],['toLevelId','Destino']].map(([field,label]) => `<label class="field"><span>${label}</span><select data-field="${field}"><option value="">Sem associação</option>${Object.values(doc.layout.levels ?? {}).map(l => `<option value="${l.id}" ${record[field] === l.id ? 'selected' : ''}>${esc(l.name)} · ${l.elevation} m</option>`).join('')}</select></label>`).join('')}<p class="microcopy">Quando os dois andares estão associados, base e desnível acompanham suas alturas.</p></section>`;
    if (record.kind === 'prop' || type === 'light' && ['point', 'spot'].includes(record.type)) fields += `<section><span class="eyebrow">FIXAR EM PAREDE / TETO</span><p class="microcopy">Escolha uma parede ou o piso do andar de cima. O objeto ficará junto à face escolhida e acompanhará seus movimentos. Para vários objetos, use Shift+seleção e botão direito → Fixar em parede / teto….</p><label class="field"><span>Fixar em</span><select data-field="object-anchor"><option value="">Livre</option>${Object.values(doc.layout.entities).filter(e => ['wall','floor'].includes(e.kind)).map(e => { const socket = e.kind === 'wall' ? 'wall' : 'ceiling'; return `<option value="${socket}:${e.id}" ${record.anchor?.hostId === e.id && record.anchor.socket === socket ? 'selected' : ''}>${socket === 'wall' ? 'Parede' : 'Teto sob piso'} · ${esc(e.name)}</option>`; }).join('')}</select></label>${record.anchor ? `<div class="axis-fields">${record.anchor.offset.map((v,i) => numberField(`anchor-${i}`,['X local','Y local','Z local'][i],v)).join('')}</div><p class="microcopy">O objeto acompanha posição e rotação da parede ou piso escolhido. Escolha Livre para soltá-lo. Teto usa a face inferior do piso superior.</p>` : ''}</section>`;
    if (record.vertices) fields += `<section><span class="eyebrow">CONTORNO LOCAL · X/Z</span>${record.vertices.map((p, i) => `<div class="field-grid">${numberField(`polygon-${i}-0`, `V${i + 1} · X`, p[0])}${numberField(`polygon-${i}-1`, `V${i + 1} · Z`, p[1])}</div>`).join('')}<p class="microcopy">O contorno não pode cruzar a si mesmo. Dimensões ajustam os vértices proporcionalmente.</p></section>`;
    if (record.kind === 'floor') fields += `<section><span class="eyebrow">DIMENSÕES · METROS</span><div class="field-grid">${numberField('width', 'Largura', record.width, { min: .1 })}${numberField('length', 'Comprimento', record.length, { min: .1 })}</div>${numberField('thickness', 'Espessura', record.thickness, { min: .01 })}</section>`;
    if (isAccess(record)) fields += `<section><span class="eyebrow">ACESSO ENTRE ALTURAS</span><div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .1 })}${numberField('length', 'Comprimento · m', record.length, { min: .1 })}</div>${numberField('height', 'Desnível · m', record.height, { min: .1 })}${record.kind === 'stairs' ? numberField('steps', 'Degraus', record.steps, { min: 1, max: 128, step: 1 }) : ''}<p class="microcopy">A base fica na altura Y; o acesso sobe no sentido Z local positivo. Use Rotacionar (R) para orientar e escolha este apoio para colocar tokens sobre ele.</p></section>`;
    if (record.kind === 'wall') fields += `<section><span class="eyebrow">DIMENSÕES · METROS</span>${numberField('length', 'Comprimento', record.length, { min: .1 })}${numberField('height', 'Altura', record.height, { min: .1 })}${numberField('thickness', 'Espessura', record.thickness, { min: .01 })}<p class="microcopy">Portas e janelas acompanham esta parede. Reduzir o comprimento exige manter as aberturas válidas.</p></section>`;
    if (record.kind === 'door') fields += `<section><span class="eyebrow">ABERTURA NA PAREDE</span>${numberField('offset', 'Posição na parede · m', record.offset, { min: 0 })}<div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .2 })}${numberField('height', 'Altura · m', record.height, { min: .2 })}</div>${numberField('door-angle', 'Ângulo atual · graus', (doc.sessionState?.doors?.[record.id] ?? record.initialAngle) * 180 / Math.PI, { step: 15 })}<label class="field"><span>Dobradiça</span><select data-field="hinge"><option value="left" ${record.hinge === 'left' ? 'selected' : ''}>Esquerda</option><option value="right" ${record.hinge === 'right' ? 'selected' : ''}>Direita</option></select></label>${button('door-toggle', 'Abrir / fechar', 'door', 'wide')}<p class="microcopy">O vão pertence à parede. A folha pode ser aberta sem alterar o mapa.</p></section>`;
    if (record.kind === 'window') fields += `<section><span class="eyebrow">JANELA HOSPEDADA</span><p class="microcopy">Com Mover (G), arraste a janela na parede. Alt permite ajuste livre. O recorte acompanha a janela.</p><label class="field"><span>Parede</span><select data-field="window-wall">${Object.values(doc.layout.entities).filter(e => e.kind === 'wall').map(e => `<option value="${e.id}" ${record.wallId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>${numberField('offset', 'Posição na parede · m', record.offset, { min: 0 })}<div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .1 })}${numberField('height', 'Altura · m', record.height, { min: .1 })}</div>${numberField('sill', 'Peitoril · m', record.sill, { min: 0 })}<label class="field"><span>Representação</span><select data-field="style"><option value="glass" ${record.style === 'glass' ? 'selected' : ''}>Vidro</option><option value="bars" ${record.style === 'bars' ? 'selected' : ''}>Grades</option><option value="open" ${record.style === 'open' ? 'selected' : ''}>Vão livre</option></select></label></section>`;
    if (type === 'token' || record.kind === 'prop') fields += `<section><span class="eyebrow">ESCALA VISUAL</span><div class="axis-fields">${record.transform.scale.map((value, axis) => numberField(`scale-${axis}`, ['X', 'Y', 'Z'][axis], value, { min: .01 })).join('')}</div>${type === 'token' ? `<span class="eyebrow">BASE · METROS</span><div class="field-grid">${numberField('footprint-0', 'Largura', record.footprint[0], { min: .1 })}${numberField('footprint-1', 'Profundidade', record.footprint[1], { min: .1 })}</div>${colorField('token-color', 'Cor do personagem', actor.color)}` : ''}</section>`;
    if (record.material && record.kind !== 'terrain' && record.water?.state!=='water') fields += materialPanel(record, viewport.getMaterialSlots(record.id), { numberField, colorField, transferControls: materialTransferControls(record) });
    if(record.kind==='prop' && isVegetationAsset(record.assetRef.id)) fields+=`<section><span class="eyebrow">VEGETAÇÃO · GEOMETRIA</span>${numberField('vegetationSeed','Variação geométrica',record.vegetationSeed??0,{min:0,max:65535,step:1})}<p class="microcopy">Varia ramificação e folhagem, preservando o tamanho e a base. Escala e rotação continuam independentes.</p></section>`;
    if (record.kind === 'prop') fields += rockPanel(record,{numberField});
    if (record.kind === 'prop') fields += localEffectPanel(record, { numberField, colorField, checkField });
    if (type === 'light') fields += lightPanel(record, { numberField, colorField, checkField });
    if (type === 'light' || ['prop','window'].includes(record.kind)) fields += bindingPanel(record, doc.look ?? doc.defaultLook, viewport.getMaterialSlots(record.id), openAtmosphereSections, { numberField, colorField, checkField });
    fields += `<section><span class="eyebrow">APRESENTAÇÃO</span>${checkField('object-secret', 'Somente para o mestre', record.audience === 'gm')}${record.locked === undefined ? '' : checkField('object-locked', 'Bloquear edição', record.locked)}</section>${record.kind === 'terrain' ? '</details>' : ''}<div class="object-actions">${button('object-copy', 'Copiar', 'copy')}${button('object-duplicate', 'Duplicar', 'copy')}${button('object-delete', 'Excluir', 'trash', 'danger')}</div>`;
    if (record.kind !== 'terrain') fields += `<details class="object-adjustments" ${adjustmentsOpen ? 'open' : ''}><summary>Alinhar e ajustar objetos</summary>${polishPanel(1, polishOptions, doc)}</details>`;
    panel.innerHTML = isLocked(doc, record) ? `<p class="microcopy">Elemento, pasta, andar ou camada bloqueados. Desbloqueie na organização da cena para editar.</p>${fields}` : fields;
    for(const [key,open] of geometryDisclosures) {const node=panel.querySelector(`[data-disclosure=${key}]`);if(node)node.open=open;}
    for (const node of panel.querySelectorAll('[data-texture-options]')) node.open = textureDisclosures.get(node.dataset.textureOptions) ?? false;
    organizeInspector();
    if(focused) panel.querySelector(`[data-field="${focused}"]`)?.focus({preventScroll:true});
    panel.scrollTop = scroll;

    function organizeInspector() {
      if (found?.record.kind !== 'terrain') for (const section of [...panel.children].filter(node => node.tagName === 'SECTION')) {
        const title = section.querySelector(':scope > .eyebrow')?.textContent.trim();
        if (!title) continue;
        const label = title.toLocaleLowerCase('pt-BR').replace(/^./u, char => char.toLocaleUpperCase('pt-BR'));
        const expanded = /PINCEL DE SUPERFÍCIE|POSIÇÃO|DIMENSÕES|ILUMINAÇÃO|MATERIAL E TEXTURA|ACESSO ENTRE ALTURAS|FOGO E FUMAÇA|ÁGUA \/ GELO/.test(title);
        sectionDisclosure(section, title, label, expanded);
      }
      if (found?.record.kind !== 'terrain') restoreDisclosures(panel, inspectorDisclosures);
    }
  }

  function updateView(event = {}) {
    const doc = store.document;
    const isMap = doc.documentType === 'map';
    if (selection && !locate()) selection = null;
    selectedIds = new Set([...selectedIds].filter(key => locate(key)));
    if (!selection) selection = [...selectedIds].at(-1) ?? null;
    if (event.type === 'replace') { skyReturnCamera = null; selectedIds.clear(); selection = null; activeSurfaceId = undefined; smartFloorId = null; activeLevelId = null; activeLayerId = null; isolatedLevel = false; }
    if (!doc.layout.levels?.[activeLevelId]) { activeLevelId = null; isolatedLevel = false; }
    if (!doc.layout.layers?.[activeLayerId]) activeLayerId = null;
    const floors = Object.values(doc.layout.entities).filter(e => e.kind === 'floor');
    if (activeSurfaceId && !doc.layout.entities[activeSurfaceId]) activeSurfaceId = undefined;
    if (activeSurfaceId === undefined) activeSurfaceId = floors.length === 1 ? floors[0].id : null;
    if (!doc.layout.entities[smartFloorId]) {
      smartFloorId = floors[0]?.id ?? null;
      const existing = currentComposition(); if (existing) smartOptions = { ...existing.parameters, restoreDeleted: false };
    }
    if (environmentPreview && event.type !== 'saved') { environmentPreview = null; document.getElementById('proposal-bar').hidden = true; }
    if (proposal && event.type !== 'saved') clearProposal();
    viewport.setDocument(isPresentation ? projectPresentation(environmentPreview?.next ?? doc) : environmentPreview?.next ?? doc);
    viewport.setIsolatedLevel(isolatedLevel ? activeLevelId : null);
    viewport.setSupportSurface(activeSurfaceId); viewport.setWorkplaneHeight(buildHeight);
    viewport.setSelection(isPresentation ? null : selection, isPresentation ? [] : [...selectedIds]);
    document.getElementById('scene-name').value = doc.name;
    document.getElementById('presentation-name').textContent = doc.name;
    const eyebrow = document.getElementById('doc-type-eyebrow');
    if (eyebrow) eyebrow.textContent = `SUA MESA / ${isMap ? 'MAPA' : 'CENA'}`;
    document.getElementById('welcome').hidden = Object.keys(doc.layout?.entities || {}).length > 0 || !!proposal || isPresentation;
    document.getElementById('undo').disabled = !store.canUndo;
    document.getElementById('redo').disabled = !store.canRedo;
    document.getElementById('undo').title = `Desfazer${store.undoLabel ? `: ${store.undoLabel}` : ''} (Ctrl+Z)`;
    const status = document.getElementById('save-status');
    status.textContent = saving ? 'Salvando…' : store.dirty ? 'Alterações locais' : `${repository.storage==='browser'?'Salvo neste navegador':'Salvo'} · revisão ${doc.revision}`;
    status.classList.toggle('unsaved', store.dirty); document.getElementById('save-scene').disabled = saving;
    document.getElementById('scene-summary').textContent = `${Object.keys(doc.layout?.entities || {}).length} elementos · ${Object.keys(doc.tokens || {}).length} tokens · ${Object.keys(doc.look?.lights || doc.defaultLook?.lights || {}).length} luzes · grid ${doc.layout?.grid?.cellSize ?? 1} m`;
    renderInspector(); renderSidebar(); broadcast();
    if (event.type !== 'saved') previews.schedule();
    clearTimeout(draftTimer); draftTimer = setTimeout(flushDraft, 180);
  }
  async function refreshSaved() {
    const [scenesResult, mapsResult] = await Promise.allSettled([
      repository.list('scene'),
      repository.list('map'),
    ]);
    if (scenesResult.status === 'fulfilled') savedScenes = scenesResult.value;
    if (mapsResult.status === 'fulfilled') savedMaps = mapsResult.value;
  }
  async function saveScene() {
    if (saving) return false;
    saving = true; updateView({ type: 'saved' });
    const sentDocument = clone(store.document), sentVersion = store.editVersion;
    const isMap = sentDocument.documentType === 'map';
    try {
      const receipt = sentDocument.revision === 0 ? await repository.create(sentDocument) : await repository.save(sentDocument);
      if (store.document.id !== sentDocument.id) return false;
      store.markSaved(receipt, sentVersion);
      void previews.saved(receipt, sentVersion);
      lastScene.write(receipt.id);
      flushDraft(); notify(store.dirty ? 'Versão salva. Há alterações posteriores ainda locais.' : `${isMap ? 'Mapa salvo' : 'Cena salva'} ${repository.storage==='browser'?'neste navegador':'no computador'}.`);
      await refreshSaved().catch(() => notify(`${isMap ? 'Mapa salvo' : 'Cena salva'}. A lista não pôde ser atualizada agora.`, true)); return true;
    } catch (error) {
      const conflict = error instanceof ApiError && error.status === 409;
      notify(conflict ? `Este documento mudou em outra janela. Seu trabalho está no rascunho. Abra a versão salva ou salve como nova.` : `Não foi possível salvar: ${error.message}`, true, true);
      flushDraft(); return false;
    } finally { saving = false; updateView({ type: 'saved' }); }
  }
  function canSwitch() { return !saving && (!store.dirty || confirm(`Há alterações locais. Continuar sem salvar ${repository.storage==='browser'?'no navegador':'no servidor'}?`)); }
  async function duplicateScene() {
    if (saving) return;
    const sourceId = store.document.id, sourceVersion = store.editVersion;
    const isMap = store.document.documentType === 'map';
    const copy = duplicateDocument(store.document, { name: `${store.document.name} — cópia` });
    saving = true; updateView({ type: 'saved' });
    try {
      // Duplicate the working document, including edits pending after a conflict.
      const receipt = await repository.create(copy);
      void previews.saved(receipt);
      if (store.document.id === sourceId && store.editVersion === sourceVersion) {
        selection = null; clearProposal(); store.replace(receipt);
        lastScene.write(receipt.id);
        flushDraft(); notify(`Cópia independente salva. Você está editando ${isMap ? 'o novo mapa' : 'a nova cena'}.`);
      } else notify(`Cópia salva. Suas alterações posteriores continuam ${isMap ? 'no mapa atual' : 'na cena atual'}.`);
      await refreshSaved().catch(() => notify('Cópia salva. A lista não pôde ser atualizada agora.', true));
    } finally { saving = false; updateView({ type: 'saved' }); }
  }
  let clipboard = null;
  let pasteCount = 0;
  function copySelection() {
    const found = locate();
    if (!found) { notify('Nenhum objeto selecionado para copiar.'); return; }
    clipboard = {
      type: found.type,
      id: selection,
      record: clone(found.record),
      binding: clone((store.document.look ?? store.document.defaultLook).environmentBindings?.[selection] ?? null),
      document: found.type === 'group' ? clone(store.document) : null,
      actor: found.type === 'token' && store.document.actors?.[found.record.actorId] ? clone(store.document.actors[found.record.actorId]) : null,
    };
    pasteCount = 0;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(JSON.stringify({ tabletopClipboard: clipboard })).catch(() => {});
      }
    } catch { /* clipboard permission or context */ }
    notify(`${found.record.name || 'Objeto'} copiado.`);
  }
  function pasteClipboard() {
    if (!clipboard) { notify('Área de transferência vazia.'); return; }
    pasteCount += 1;
    const step = store.document.layout.grid.cellSize || 1;
    const offset = [step * pasteCount, 0, step * pasteCount];
    if(clipboard.type==='group') {
      const before=new Set(Object.keys(store.document.layout.groups));
      if(execute('group.paste',{ id:clipboard.id,document:clipboard.document,offset })) { const key=Object.keys(store.document.layout.groups).find(key => !before.has(key) && !store.document.layout.groups[key].parentId); selectObject(key ?? Object.keys(store.document.layout.groups).find(key => !before.has(key))); notify('Composição colada como uma unidade independente.'); }
      return;
    }
    const exists = locate(clipboard.id);
    if (exists && exists.type === clipboard.type) {
      const before = new Set([
        ...Object.keys(store.document.layout.entities),
        ...Object.keys(store.document.tokens),
        ...Object.keys((store.document.look ?? store.document.defaultLook).lights),
      ]);
      if (execute(`${clipboard.type}.duplicate`, { id: clipboard.id, offset })) {
        const newId = [
          ...Object.keys(store.document.layout.entities),
          ...Object.keys(store.document.tokens),
          ...Object.keys((store.document.look ?? store.document.defaultLook).lights),
        ].find((key) => !before.has(key));
        if (newId) {
          selection = newId;
          viewport.setSelection(selection);
          renderInspector();
        }
        notify(`${clipboard.record.name || 'Objeto'} colado.`);
      }
    } else {
      const copy = clone(clipboard.record);
      copy.id = id();
      if (copy.name) copy.name = copy.name.includes('— cópia') ? copy.name : `${copy.name} — cópia`;
      if (clipboard.type === 'entity') {
        if (copy.transform) copy.transform.position = copy.transform.position.map((v, i) => v + offset[i]);
        if (execute('entity.add', { entity: copy, binding: clipboard.binding })) {
          selection = copy.id;
          viewport.setSelection(selection);
          renderInspector();
          notify(`${copy.name || 'Objeto'} colado.`);
        }
      } else if (clipboard.type === 'token') {
        if (copy.transform) copy.transform.position = copy.transform.position.map((v, i) => v + offset[i]);
        if (execute('token.add', { token: copy, actor: clipboard.actor })) {
          selection = copy.id;
          viewport.setSelection(selection);
          renderInspector();
          notify(`${copy.name || 'Personagem'} colado.`);
        }
      } else if (clipboard.type === 'light') {
        delete copy.role;
        if (copy.position) copy.position = copy.position.map((v, i) => v + offset[i]);
        if (execute('light.add', { light: copy, binding: clipboard.binding })) {
          selection = copy.id;
          viewport.setSelection(selection);
          renderInspector();
          notify(`${copy.name || 'Luz'} colada.`);
        }
      }
    }
  }

  function closeDialog() { documentsWindow.close(); }

  async function openExample(exampleId) {
    if (!canSwitch()) return;
    const ticket=++openTicket, sourceId=store.document.id, sourceVersion=store.editVersion;
    notify('Carregando cena de exemplo…');
    const doc=await loadExampleScene(exampleId);
    if(ticket!==openTicket)return;
    if(store.document.id!==sourceId||store.editVersion!==sourceVersion) {notify('A cena atual mudou durante o carregamento. Suas alterações foram preservadas; abra o exemplo novamente.',true);return;}
    selection=null;clearProposal();setTool('select');
    store.replace(doc,{saved:false});viewport.frameScene();
    const camera=Object.values(doc.cameraPresets)[0];if(camera)viewport.setCamera(camera);
    closeDialog();notify('Exemplo aberto como cópia editável. Use Salvar para guardar sua cena.');
  }

  async function openScene(sceneId) {
    if (sceneId === store.document.id && store.document.revision === 0) { closeDialog(); return; }
    if (!canSwitch()) return;
    const ticket = ++openTicket, sourceId = store.document.id, sourceVersion = store.editVersion;
    const doc = await repository.read(sceneId, 'scene');
    if (ticket !== openTicket) return;
    if (store.document.id !== sourceId || store.editVersion !== sourceVersion) { notify('A cena atual mudou durante o carregamento. Suas alterações foram preservadas; abra novamente quando estiver pronto.', true); return; }
    selection = null; clearProposal(); setTool('select');
    store.replace(doc); lastScene.write(doc.id); viewport.frameScene();
    const camera = Object.values(doc.cameraPresets || {})[0]; if (camera) viewport.setCamera(camera);
    closeDialog();
    notify(`Cena “${doc.name}” aberta.`);
  }

  async function openMap(mapId) {
    if (!canSwitch()) return;
    const ticket = ++openTicket, sourceId = store.document.id, sourceVersion = store.editVersion;
    const doc = await repository.read(mapId, 'map');
    if (ticket !== openTicket) return;
    if (store.document.id !== sourceId || store.editVersion !== sourceVersion) { notify('O documento atual mudou durante o carregamento.', true); return; }
    selection = null; clearProposal(); setTool('select');
    store.replace(doc); lastScene.write(doc.id); viewport.frameScene();
    closeDialog();
    notify(`Mapa “${doc.name}” aberto para edição.`);
  }

  async function instantiateMap(mapId) {
    if (!canSwitch()) return;
    const map = await repository.read(mapId, 'map');
    const sceneName = window.prompt('Nome da nova cena baseada neste mapa:', `Cena de ${map.name}`);
    if (sceneName === null) return;
    const scene = createSceneFromMap(map, sceneName.trim() || undefined);
    selection = null; clearProposal(); setTool('select');
    saving = true; updateView({ type: 'saved' });
    try {
      const receipt = await repository.create(scene);
      store.replace(receipt);
      lastScene.write(receipt.id);
      void previews.saved(receipt, store.editVersion);
      flushDraft();
      closeDialog();
      notify(`Cena “${receipt.name}” criada a partir do mapa.`);
      await refreshSaved();
    } catch (error) {
      notify(`Erro ao criar cena a partir do mapa: ${error.message}`, true);
    } finally {
      saving = false; updateView({ type: 'saved' });
    }
  }

  async function saveCurrentAsMap() {
    const defaultName = `Mapa de ${store.document.name.replace(/^Mapa de\s*/i, '')}`;
    const mapName = window.prompt('Nome do novo mapa modelo:', defaultName);
    if (mapName === null) return;
    const map = createMapFromScene(store.document, mapName.trim() || undefined);
    try {
      const receipt = await repository.create(map);
      void previews.saved(receipt);
      notify(`Mapa “${receipt.name}” salvo no acervo com sucesso.`);
      await refreshSaved();
      renderDialogContent();
    } catch (error) {
      notify(`Não foi possível salvar o mapa: ${error.message}`, true);
    }
  }

  async function duplicateDocFromList(docId, type = 'scene') {
    const list = type === 'map' ? savedMaps : savedScenes;
    const item = list.find((d) => d.id === docId);
    if (!item) return;
    try {
      const receipt = await repository.duplicate({ ...item, documentType: type });
      void previews.saved(receipt);
      notify(`${type === 'map' ? 'Mapa' : 'Cena'} “${receipt.name}” duplicado(a).`);
      await refreshSaved();
      renderDialogContent();
    } catch (error) {
      notify(`Erro ao duplicar: ${error.message}`, true);
    }
  }

  async function deleteMap(mapId) {
    if (saving) { notify('Aguarde o salvamento antes de excluir um mapa.'); return; }
    const map = savedMaps.find((m) => m.id === mapId);
    if (!map || !confirm(`Excluir o mapa “${map.name}”?`)) return;
    const version = store.editVersion;
    try {
      await repository.remove({ ...map, documentType: 'map' });
      if (store.document.id === map.id) {
        if (store.editVersion === version) store.replace(createScene('Nova cena'), { saved: false });
        else { store.replace(duplicateDocument(store.document, { name: store.document.name }), { saved: false }); notify('Mapa excluído. Alterações mantidas como nova cena.'); }
      }
      await refreshSaved();
      renderDialogContent();
    } catch (error) {
      notify(error.message, true);
    }
  }

  function exportJson() {
    const doc = store.document;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/[^a-zA-Z0-9_\u00C0-\u017F\s-]/g, '').trim() || 'tabletop-document'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Documento JSON exportado para download.');
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const validated = validateDocument(parsed);
        if (validated.documentType === 'environment') throw new Error('Ambientes são presets. Use a biblioteca de ambientes na aba Cena; este carregamento aceita cenas e mapas.');
        if (!canSwitch()) return;
        let loadedDoc = validated;
        try {
          const saved = await repository.create(validated);
          loadedDoc = saved;
        } catch { /* se já existir ou offline, usa local */ }
        selection = null; clearProposal(); setTool('select');
        store.replace(loadedDoc, { saved: Boolean(loadedDoc.revision > 0) });
        viewport.frameScene();
        if (loadedDoc.revision > 0) void previews.saved(loadedDoc, store.editVersion);
        closeDialog();
        notify(`Documento “${loadedDoc.name}” carregado na mesa.`);
        await refreshSaved();
      } catch (err) {
        notify(`Não foi possível carregar o arquivo JSON: ${err.message}`, true);
      }
    };
    reader.onerror = () => notify('Erro ao ler o arquivo selecionado.', true);
    reader.readAsText(file);
  }

  function renderDialogContent() {
    const container = document.getElementById('documents-tab-content');
    if (!container) return;
    const tabs = root.querySelectorAll('[data-dialog-tab]');
    tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.dialogTab === dialogTab));

    if (dialogTab === 'scenes') {
      const current = store.document.documentType === 'scene' ? store.document : null;
      const scenes = savedScenes.map(scene => scene.id === current?.id ? { ...scene, ...current } : scene);
      if (current && !scenes.some(scene => scene.id === current.id)) scenes.unshift(current);
      container.innerHTML = `
        <section class="example-scenes" aria-labelledby="example-scenes-title">
          <h3 id="example-scenes-title" class="eyebrow">CENAS DE EXEMPLO</h3>
          <p class="microcopy">Carregue uma cópia para explorar, editar e salvar como sua cena.</p>
          ${EXAMPLE_SCENES.map(example=>`<button type="button" class="example-scene-card" data-open-example="${example.id}">
            <img src="${applicationURL(example.preview)}" alt="" width="320" height="180" loading="lazy" />
            <span><strong>${esc(example.name)}</strong><small>${esc(example.description)}</small><b>Carregar cena</b></span>
          </button>`).join('')}
        </section>
        <div class="tab-toolbar">
          <span class="eyebrow">${scenes.length} cena(s) · prévias automáticas</span>
          <div class="tab-toolbar-actions">
            ${button('dialog-new-scene', 'Nova cena', 'plus', 'primary')}
          </div>
        </div>
        ${scenes.map((scene) => `
          <div class="item-card scene-library-card">
            <button type="button" class="item-card-main" data-open="${scene.id}">
              ${previewImage(scene)}
              <span class="scene-card-description">
              <span style="display:flex;align-items:center;gap:6px">
                <strong>${esc(scene.name)}</strong>
                ${scene.id === store.document.id ? '<span class="item-badge" style="background:#2d473e;color:#8ce2be">Atual</span>' : ''}
              </span>
              <small>${scene.revision === 0 ? 'Em criação · ainda não salva' : `Revisão ${scene.revision} · ${new Date(scene.updatedAt).toLocaleString('pt-BR')}`}</small>
              </span>
            </button>
            <div class="item-card-actions" ${scene.revision === 0 ? 'hidden' : ''}>
              <button type="button" class="quiet" data-duplicate-scene-id="${scene.id}" title="Duplicar cena">${icon('copy', 14)}</button>
              <button type="button" class="quiet danger" data-delete-scene="${scene.id}" title="Excluir cena">${icon('trash', 14)}</button>
            </div>
          </div>
        `).join('') || '<div class="empty-dialog">Nenhuma cena salva ainda.<p>Crie uma sala e use Salvar para começar sua coleção.</p></div>'}
      `;
    } else if (dialogTab === 'maps') {
      container.innerHTML = `
        <div class="tab-toolbar">
          <span class="eyebrow">${savedMaps.length} mapa(s) no acervo</span>
          <div class="tab-toolbar-actions">
            ${button('save-current-as-map', 'Salvar cena como Mapa', 'save', 'primary')}
            ${button('dialog-new-map', 'Novo mapa em branco', 'plus', 'quiet')}
          </div>
        </div>
        ${savedMaps.map((map) => `
          <div class="item-card scene-library-card">
            <button type="button" class="item-card-main" data-open-map="${map.id}">
              ${previewImage(map)}
              <span class="scene-card-description">
              <span style="display:flex;align-items:center;gap:6px">
                <span class="item-badge">MAPA</span>
                <strong>${esc(map.name)}</strong>
                ${map.id === store.document.id ? '<span class="item-badge" style="background:#2d473e;color:#8ce2be">Atual</span>' : ''}
              </span>
              <small>Revisão ${map.revision} · ${new Date(map.updatedAt).toLocaleString('pt-BR')}</small>
              </span>
            </button>
            <div class="item-card-actions">
              <button type="button" class="primary" data-instantiate-map="${map.id}" title="Criar nova cena usando este mapa">${icon('plus', 14)} Criar cena</button>
              <button type="button" class="quiet" data-duplicate-map-id="${map.id}" title="Duplicar mapa">${icon('copy', 14)}</button>
              <button type="button" class="quiet danger" data-delete-map="${map.id}" title="Excluir mapa">${icon('trash', 14)}</button>
            </div>
          </div>
        `).join('') || '<div class="empty-dialog">Nenhum mapa salvo ainda.<p>Você pode converter a estrutura da sua cena atual em um Mapa modelo reutilizável!</p></div>'}
      `;
    } else if (dialogTab === 'tokens') {
      const defaultTokens = [
        { name: 'Investigador', color: '#e4b76f' },
        { name: 'Guerreiro', color: '#c44d44' },
        { name: 'Mago', color: '#5b7fc4' },
        { name: 'Ladino', color: '#4a934a' },
        { name: 'Monstro', color: '#8e44ad' },
        { name: 'NPC', color: '#888888' },
      ];
      const imageAssets = assets.filter((asset) => asset.type === 'image');
      container.innerHTML = `
        <div class="tab-toolbar">
          <span class="eyebrow">Banco de Tokens & Personagens</span>
          <div class="tab-toolbar-actions">
            ${button('dialog-custom-token', 'Novo token customizado', 'plus', 'primary')}
          </div>
        </div>
        <p class="microcopy" style="margin: 0 0 10px 0">Clique em qualquer token abaixo para colocá-lo diretamente na mesa:</p>
        <div class="token-library-grid">
          ${defaultTokens.map((t) => `
            <div class="token-library-card">
              <div class="token-avatar" style="border-color:${t.color};background:${t.color}22">
                <span style="font-weight:700;color:${t.color}">${t.name[0]}</span>
              </div>
              <strong>${esc(t.name)}</strong>
              <button type="button" class="primary" data-dialog-pick-token="${esc(t.name)}" data-token-color="${t.color}">Colocar</button>
            </div>
          `).join('')}
          ${imageAssets.map((asset) => `
            <div class="token-library-card">
              <div class="token-avatar">
                <img src="${esc(asset.url)}" alt="${esc(asset.name)}" />
              </div>
              <strong>${esc(asset.name.replace(/\.[^.]+$/, ''))}</strong>
              <button type="button" class="primary" data-dialog-pick-asset-token="${asset.id}">Colocar</button>
            </div>
          `).join('')}
        </div>
      `;
    } else if (dialogTab === 'documents') {
      const doc = store.document;
      const isMap = doc.documentType === 'map';
      const entitiesCount = Object.keys(doc.layout?.entities || {}).length;
      const tokensCount = Object.keys(doc.tokens || {}).length;
      const lightsCount = Object.keys(doc.look?.lights || doc.defaultLook?.lights || {}).length;
      container.innerHTML = `
        <div class="tab-toolbar">
          <span class="eyebrow">Importação, Exportação e Arquivos</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="doc-box">
            <div style="font-size:24px">${icon('download', 28)}</div>
            <h4>Exportar Documento Atual (.json)</h4>
            <p>Baixe uma cópia completa do arquivo JSON deste(a) ${isMap ? 'mapa' : 'cena'} para backup, envio ou uso em outro computador.</p>
            ${button('export-json', `Baixar ${isMap ? 'Mapa' : 'Cena'} (${esc(doc.name)}.json)`, 'download', 'primary')}
          </div>
          <div class="doc-box">
            <div style="font-size:24px">${icon('upload', 28)}</div>
            <h4>Carregar Documento Local (.json)</h4>
            <p>Importe um arquivo .json de cena ou mapa salvo no seu computador diretamente para a mesa de jogo.</p>
            ${button('trigger-load-json', 'Selecionar arquivo .json no computador', 'folder', 'accent-outline')}
          </div>
          <div class="item-card" style="margin-top:4px">
            <div class="item-card-main">
              <strong>Documento atual em edição: ${esc(doc.name)}</strong>
              <small>Tipo: ${isMap ? 'Mapa Estrutural' : 'Cena com Tokens'} · ID: ${doc.id} · Revisão: ${doc.revision}</small>
              <small>Conteúdo: ${entitiesCount} entidades · ${tokensCount} tokens · ${lightsCount} luzes</small>
            </div>
          </div>
        </div>
      `;
    }
  }

  async function openDialog(targetTab) {
    const dialog = document.getElementById('documents-dialog');
    if (!dialog) return;
    if (dialog.hasAttribute('open') && (!targetTab || targetTab === dialogTab)) {
      closeDialog();
      return;
    }
    if (targetTab) dialogTab = targetTab;
    await refreshSaved();
    renderDialogContent();
    documentsWindow.open();
    previews.ensure([...savedScenes, ...savedMaps]);
  }
  async function importAsset(file) {
    if (!file) return;
    notify('Conferindo o arquivo…');
    try {
      // Decode before ingestion; byte signatures alone do not prove a usable image.
      if (!file.name.toLowerCase().endsWith('.glb')) {
        const image = await createImageBitmap(file); image.close();
      } else {
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const bytes = await file.arrayBuffer();
        // Refuse external dependencies before the loader can issue any requests.
        const view = new DataView(bytes);
        if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('Use um arquivo GLB 2.0 válido.');
        const jsonLength = view.getUint32(12, true);
        if (20 + jsonLength > bytes.byteLength) throw new Error('GLB incompleto.');
        const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonLength)).trim());
        if ([...(json.buffers || []), ...(json.images || [])].some((entry) => entry.uri !== undefined)) throw new Error('O GLB deve conter todos os recursos internamente, sem URLs externas.');
        if ((json.extensionsUsed || []).some((extension) => !['KHR_materials_unlit', 'KHR_materials_variants'].includes(extension))) throw new Error('Este slice aceita GLB estático sem compressão ou extensões adicionais.');
        const model = await new GLTFLoader().parseAsync(bytes, '');
        model.scene.traverse((node) => {
          node.geometry?.dispose();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          for (const material of materials.filter(Boolean)) { for (const value of Object.values(material)) if (value?.isTexture) { value.source?.data?.close?.(); value.dispose(); } material.dispose(); }
        });
      }
      const asset = await repository.importAsset(file);
      assets = await repository.assets(); viewport.setAssets(assets); renderSidebar();
      placing = asset.type === 'image' ? { type: 'token', name: asset.name.replace(/\.[^.]+$/, ''), color: '#e4b76f', assetRef: { id: asset.id, revision: asset.revision } } : { type: 'prop', asset };
      setTool('place'); notify('Asset guardado. Clique no piso para colocá-lo.');
    } catch (error) { notify(`O asset não foi importado: ${error.message}`, true); }
  }

  function changeField(input) {
    const field = input.dataset.field, value = input.type === 'checkbox' ? input.checked : ['number','range'].includes(input.type) ? Number(input.value) : input.value;
    if (field === 'camera-speed') { if (Number.isFinite(Number(value))) { cameraSpeed = Math.max(.2, Math.min(40, Number(value))); viewport.setNavigationSpeed(cameraSpeed); } renderSidebar(); return; }
    if (field === 'camera-fov') { viewport.setFov(Number(value)); renderSidebar(); return; }
    if (field === 'camera-duration') { cameraDuration = Number(value); return; }
    if (field.startsWith('assembly-')) {
      const group=locate()?.record; if(!group?.anchored) return;
      if(field==='assembly-name') { execute('group.update',{ id:group.id,patch:{ name:value } }); return; }
      const transform=clone(group.transform);
      if(field.startsWith('assembly-position-')) transform.position[Number(field.slice(18))]=value;
      else if(field==='assembly-yaw') transform.rotation=quaternionFromYaw(value);
      else if(field==='assembly-size') transform.scale=[value,value,value];
      execute('group.transform',{ id:group.id,transform,snap:false },{ label:'Transformar composição' }); return;
    }
    if (field === 'anchor-host') { anchorHostId = value; clearProposal(); renderInspector(); return; }
    if (field === 'active-level') {
      activeLevelId = value || null; const level = store.document.layout.levels?.[activeLevelId];
      if (level) { buildHeight = level.elevation; roomOptions.center[1] = buildHeight; }
      activeSurfaceId = null; viewport.setSupportSurface(null); viewport.setWorkplaneHeight(buildHeight); viewport.setIsolatedLevel(isolatedLevel ? activeLevelId : null); clearProposal(); renderSidebar(); return;
    }
    if (field === 'active-layer') { activeLayerId = value || null; return; }
    for (const [prefix, type, key] of [['level-name-', 'level.update', 'name'], ['level-elevation-', 'level.update', 'elevation'], ['layer-name-', 'layer.update', 'name']]) if (field.startsWith(prefix)) {
      const keyId = field.slice(prefix.length); if (execute(type, { id: keyId, patch: { [key]: value } }) && key === 'elevation' && activeLevelId === keyId) { buildHeight = value; roomOptions.center[1] = value; viewport.setWorkplaneHeight(value); renderSidebar(); } return;
    }
    if(field.startsWith('vegetation-')) {vegetationOptions[field.slice(11)]=value;renderSidebar();return;}
    if (field.startsWith('terrain-new-')) { terrainOptions[field.slice(12)] = value; return; }
    if(field==='terrain-resize-mode') {terrainResizeMode=value;return;}
    if(['width','length'].includes(field) && locate()?.record.kind==='terrain') {
      const terrain=locate().record;
      try {execute('entity.update',{id:terrain.id,patch:resizeTerrain(terrain,{[field]:value,mode:terrainResizeMode}),snap:false},{label:terrainResizeMode==='extend'?'Expandir área do terreno':'Esticar terreno'});} catch(error) {notify(error.message,true);renderInspector();}
      return;
    }
    if (field === 'terrain-material-target') { terrainMaterialTarget = value === 'base' ? 'base' : 'layer'; if(value !== 'base') terrainBrush.layerId=value; viewport.setTerrainBrush(terrainBrush); renderInspector(); return; }
    if (field === 'terrain-paint-layer') { terrainMaterialTarget='layer'; terrainBrush.layerId = value; viewport.setTerrainBrush(terrainBrush); renderInspector(); return; }
    if (field.startsWith('terrain-distribution-')) {
      const terrain=locate()?.record;
      if(terrain?.kind!=='terrain') return;
      const key=field.slice('terrain-distribution-'.length);
      execute('entity.update',{id:terrain.id,patch:{paintLayers:terrain.paintLayers.map(layer=>layer.id===terrainBrush.layerId?{...layer,distribution:{...distributionOptions(layer.distribution),[key]:value}}:layer)},snap:false},{label:'Distribuir superfície do terreno'}); return;
    }
    if (field.startsWith('terrain-layer-')) {
      const terrain = locate()?.record, layers = terrain?.paintLayers;
      if (terrain?.kind !== 'terrain' || !layers?.some(layer => layer.id === terrainBrush.layerId)) return;
      const key = field.slice(14);
      execute('entity.update', { id: terrain.id, patch: { paintLayers: layers.map(layer => layer.id === terrainBrush.layerId ? { ...layer, ...(key === 'texture' ? layerSurfacePatch(value) : textureFieldPatch(layer, key, value)) } : layer) }, snap: false }, { label: 'Editar camada do terreno' }); return;
    }
    if (field === 'terrain-shading') { if (locate()?.record.kind === 'terrain') execute('entity.update', { id: selection, patch: { flatShading: value === 'faceted' } }, { label: 'Acabamento do terreno' }); return; }
    if (field === 'terrain-resolution') {
      const terrain = locate()?.record; if (terrain?.kind !== 'terrain') return;
      try { const patch = resampleTerrain(terrain, value); execute('entity.update', { id: terrain.id, patch, snap: false }, { label: 'Alterar detalhe do terreno' }); } catch (error) { notify(error.message, true); renderInspector(); } return;
    }
    if (field.startsWith('brush-')) {
      const next = { ...terrainBrush, [field.slice(6)]: value };
      if (field === 'brush-mode' && value==='water') { next.shape='circle'; next.snap=false; const terrain=locate()?.record; next.waterLevel=terrain?.transform.position[1]+.05 || .05; }
      if (field === 'brush-mode' && ['smooth','flatten','paint','erase'].includes(value)) next.strength = Math.min(1, next.strength);
      if (!Number.isFinite(next.radius) || next.radius <= 0 || next.radius > 100 || !Number.isFinite(next.strength) || next.strength <= 0 || next.strength > 10 || !Number.isFinite(next.target) || !Number.isFinite(next.rockSize) || next.rockSize<.1 || next.rockSize>100 || !Number.isFinite(next.waterLevel) || !Number.isFinite(next.waterDepth) || next.waterDepth<.1 || next.waterDepth>20 || !Number.isInteger(next.rockSeed) || next.rockSeed<0 || next.rockSeed>65535) { notify('Confira raio, força, tamanho da formação (0,1–100 m) e variação inteira (0–65535).', true); renderInspector(); return; }
      terrainBrush = next; viewport.setTerrainBrush(terrainBrush); renderToolContext(); if (['brush-mode','brush-shape','brush-hardness'].includes(field)) renderInspector(); return;
    }
    if (field === 'terrain-cell') { terrainCell = Math.max(0, Math.min((locate()?.record.heights?.length ?? 1) - 1, Math.floor(value))); renderInspector(); return; }
    if (field === 'build-height') { if (!Number.isFinite(value)) return; buildHeight = value; activeSurfaceId = null; roomOptions.center[1] = value; viewport.setWorkplaneHeight(value); viewport.setSupportSurface(null); renderSidebar(); return; }
    if (field === 'active-surface') { activeSurfaceId = value || null; viewport.setSupportSurface(activeSurfaceId); return; }
    if (field.startsWith('smart-')) {
      const key = field.slice(6);
      if (key === 'floor') { smartFloorId = value || null; const existing = currentComposition(); if (existing) smartOptions = { ...existing.parameters, restoreDeleted: false }; }
      else smartOptions[key] = value;
      clearProposal(); renderSidebar(); return;
    }
    if (field.startsWith('polish-')) { polishOptions[field.slice(7)] = value; clearProposal(); if (field === 'polish-mode') renderInspector(); return; }
    if (field.startsWith('room-')) {
      const key = field.slice(5); roomOptions[key] = value; if (proposal) makeProposal(); return;
    }
    if (field.startsWith('grid-')) {
      const key = { 'grid-visible': 'visible', 'grid-snap': 'snap', 'grid-size': 'cellSize' }[field];
      execute('grid.update', { patch: { [key]: value } }); return;
    }
    if (field === 'environment-library') { selectedEnvironmentId = value; renderSidebar(); return; }
    if (field.startsWith('scene-key-')) {
      const key = field.slice(10), look = store.document.look ?? store.document.defaultLook, light = primaryLight(look);
      let patch = { [key === 'shadow' ? 'shadowEnabled' : key]: value };
      if (key === 'useTemperature') patch = { temperature: value ? 6000 : null };
      if (['hue','saturation','value'].includes(key)) {
        if (!Number.isFinite(value) || value < 0 || value > (key === 'hue' ? 360 : 100)) { notify('HSV fora do intervalo permitido.', true); return; }
        const hsv = colorToHSV(light?.color ?? '#ffe8c5'); hsv[key] = key === 'hue' ? value : value / 100;
        patch = { color: hsvToColor(hsv) };
      }
      if (['altitude','azimuth'].includes(key)) {
        if (!Number.isFinite(value) || value < (key === 'altitude' ? 1 : -180) || value > (key === 'altitude' ? 90 : 180)) return;
        const angles = new Euler().setFromQuaternion(new Quaternion(...(light?.rotation ?? [0,0,0,1])), 'YXZ');
        if (key === 'altitude') angles.x = (90 - value) * Math.PI / 180; else angles.y = value * Math.PI / 180;
        patch = { rotation: new Quaternion().setFromEuler(angles).toArray() };
      }
      execute('environment.key.update', { patch }); return;
    }
    for (const [prefix, key, defaults] of [['daylight-', 'daylight', DAYLIGHT_DEFAULTS], ['sky-', 'sky', SKY_DEFAULTS], ['weather-', 'weather', WEATHER_DEFAULTS], ['nightWindows-', 'nightWindows', NIGHT_WINDOWS_DEFAULTS]]) {
      if (!field.startsWith(prefix)) continue;
      const look = store.document.look ?? store.document.defaultLook, settings = clone({ ...defaults, ...look[key] }), member = field.slice(prefix.length);
      if (/^(center|size|wind)-[012]$/.test(member)) { const [array, index] = member.split('-'); settings[array][Number(index)] = value; }
      else settings[member] = value;
      if (key === 'weather' && member === 'type' && value !== 'none' && look.weather?.type !== value) {
        Object.assign(settings, value === 'rain' ? { speed:12, particleSize:.025, count:900, color:'#afc9de', opacity:.45 } : value === 'smoke' ? { speed:.5, particleSize:.7, count:180, color:'#b0b0b0', opacity:.22 } : value === 'embers' ? { speed:1, particleSize:.055, count:250, color:'#ff9e45', opacity:.8 } : { speed:.25, particleSize:.035, count:300, color:'#e1ceaa', opacity:.3 });
      }
      execute('look.update', { patch: { [key]: settings } }); return;
    }
    if (field === 'background') { execute('look.update', { patch: { background: value } }); return; }
    if (field.startsWith('fill-')) { execute('look.update', { patch: { fill: { [{'fill-color':'skyColor','fill-groundColor':'groundColor','fill-intensity':'intensity'}[field]]: value } } }); return; }
    if (field === 'viewport-effects') { effectsEnabled = value; viewport.setEffectsEnabled(value); return; }
    if (field === 'effects-paused') { execute('look.update', { patch: { effectsPaused: value } }); return; }
    for (const [prefix, key, defaults] of [['fog-', 'fog', FOG_DEFAULTS], ['volume-', 'volumetricFog', VOLUME_DEFAULTS], ['bloom-', 'bloom', BLOOM_DEFAULTS]]) {
      if (field.startsWith(prefix)) {
        const look = store.document.look ?? store.document.defaultLook;
        execute('look.update', { patch: { [key]: { ...defaults, ...look[key], [field.slice(prefix.length)]: value } } }); return;
      }
    }
    const found = locate(); if (!found) return;
    const { type, record } = found;
    if (field.startsWith('binding-')) {
      const look = store.document.look ?? store.document.defaultLook;
      execute('environment.binding.update', { id: record.id, binding: { ...BINDING_DEFAULTS, ...look.environmentBindings?.[record.id], [field.slice(8)]: value } }); return;
    }
    let patch = {}, actorPatch;
    if (type === 'light' && field.startsWith('flicker-')) {
      execute('light.update', { id: record.id, patch: { flicker: { ...FLICKER_DEFAULTS, ...record.flicker, [field.slice(8)]: value } } }); return;
    }
    if (type === 'light' && field === 'light-type') {
      execute('light.update', { id: record.id, patch: { type: value } }); return;
    }
    if (type === 'light' && field === 'light-useTemperature') { execute('light.update', { id: record.id, patch: { temperature: value ? 6500 : null } }); return; }
    if (type === 'light' && field === 'light-pitch') {
      const angles = new Euler().setFromQuaternion(new Quaternion(...record.rotation), 'YXZ');
      angles.x = value * Math.PI / 180;
      execute('light.update', { id: record.id, patch: { rotation: new Quaternion().setFromEuler(angles).toArray() } }); return;
    }
    if (isAccess(record) && record.fromLevelId && record.toLevelId && (field === 'height' || field === 'position-1')) { notify('Este acesso acompanha os andares. Ajuste suas alturas ou remova uma associação para editar o desnível manualmente.'); renderInspector(); return; }
    if (field === 'terrain-height') { const heights = [...record.heights]; heights[terrainCell] = value; execute('entity.update', { id: record.id, patch: { heights } }); return; }
    if (field === 'object-level' || field === 'object-layer') { execute(`${type}.update`, { id: record.id, patch: { [field === 'object-level' ? 'levelId' : 'layerId']: value || null } }); return; }
    if (['fromLevelId', 'toLevelId'].includes(field)) { execute('entity.update', { id: record.id, patch: { [field]: value || null } }); return; }
    if (field === 'object-anchor') {
      if (!value) patch.anchor = null;
      else {
        const [socket, hostId] = value.split(':'), host = store.document.layout.entities[hostId];
        const local = localPoint(host, record.transform?.position ?? record.position);
        const offset = socket === 'wall' ? [Math.max(0, Math.min(host.length, local[0])), Math.max(0, Math.min(host.height, local[1])), host.thickness / 2 + .05] : [local[0], -.05, local[2]];
        patch = { anchor: { hostId, socket, offset }, surfaceId: null };
      }
      execute(`${type}.update`, { id: record.id, patch, snap: false }); return;
    }
    if (field.startsWith('anchor-')) { const anchor = clone(record.anchor); anchor.offset[Number(field.slice(7))] = value; execute(`${type}.update`, { id: record.id, patch: { anchor }, snap: false }); return; }
    if (field.startsWith('hole-')) { const [,h,v,a] = field.split('-'), holes = clone(record.holes); holes[Number(h)][Number(v)][Number(a)] = value; execute('entity.update', { id: record.id, patch: { holes } }); return; }
    if (field === 'window-wall') {
      const wall = store.document.layout.entities[value];
      execute('entity.update', { id: record.id, patch: { wallId: wall.id, surfaceId: wall.surfaceId, groupId: wall.groupId,
        ...constrainOpening(wall, record, record.offset, record.sill) } }); return;
    }
    if (field.startsWith('polygon-')) {
      const [, vertex, axis] = field.split('-'), vertices = clone(record.vertices); vertices[Number(vertex)][Number(axis)] = value;
      const [width, length] = polygonSize(vertices); execute('entity.update', { id: record.id, patch: { vertices, width, length } }); return;
    }
    if (field === 'prop-support') { if (!value) execute('entity.clearSupport', { id: record.id }); else execute('entity.update', { id: record.id, patch: { supportHeight: .8 } }); return; }
    if (field === 'object-surface') {
      patch.surfaceId = value || null;
      if (value) patch.anchor = null;
      if (value) { const host = store.document.layout.entities[value]; const position = [...record.transform.position]; position[1] = supportHeightAt(host, position); patch.transform = { position }; }
      execute(`${type}.update`, { id: record.id, patch, snap: false }); return;
    }
    if (field === 'object-name') { if (type === 'token') actorPatch = { name: value }; else patch.name = value; }
    else if (field.startsWith('position-')) {
      const position = [...(record.transform?.position ?? record.position)]; position[Number(field.slice(-1))] = value;
      patch = type === 'light' ? { position } : { transform: { position } };
    } else if (field === 'object-yaw') {
      if (type === 'light') {
        const [x, y, z, w] = record.rotation;
        const yaw = new Euler().setFromQuaternion(new Quaternion(...record.rotation), 'YXZ').y * 180 / Math.PI;
        const half = (value - yaw) * Math.PI / 360;
        const s = Math.sin(half), c = Math.cos(half);
        patch.rotation = [c * x + s * z, c * y + s * w, c * z - s * x, c * w - s * y];
      } else patch.transform = { rotation: quaternionFromYaw(value) };
    }
    else if (field.startsWith('scale-')) { const scale = [...record.transform.scale]; scale[Number(field.slice(-1))] = value; patch.transform = { scale }; }
    else if (field.startsWith('footprint-')) { const footprint = [...record.footprint]; footprint[Number(field.slice(-1))] = value; patch.footprint = footprint; }
    else if (field === 'token-color') actorPatch = { color: value };
    else if (field.startsWith('material-')) patch.material = field === 'material-texture' ? surfacePatch(value) : textureFieldPatch(record.material, field.slice(9), value);
    else if(field.startsWith('water-') && record.kind==='water') patch.water={[field.slice(6)]:value};
    else if (field.startsWith('rock-') && rockDefaults(record.assetRef?.id)) {
      patch.rockShape={...(record.rockShape??rockDefaults(record.assetRef.id)),[field.slice(5)]:value};
    }
    else if (field.startsWith('coverage-')) {
      const member=field.slice(9), current=record.material.coverage;
      patch.material={coverage: member==='texture' ? (value==='none'?null:coverageDefaults(value)) : {...current,[member]:value}};
      if(record.kind==='terrain' && patch.material.coverage?.physicalThickness>0 && patch.material.coverage.exposedOnly!==false)patch.snowMask=viewport.computeSnowExposure(record.id);
    }
    else if (field.startsWith('effect-') && record.kind === 'prop') {
      const config = clone(record.localEffect ?? LOCAL_EFFECT_DEFAULTS), member=field.slice(7);
      if(member === 'type') patch.localEffect = value === 'none' ? { ...config, enabled:false } : config.type === value ? { ...config, enabled:true } : { ...(value==='smoke'?smokeDefaults():LOCAL_EFFECT_DEFAULTS), hideModel:config.hideModel, enabled:true };
      else if(member.startsWith('size-') || member.startsWith('offset-')) { const [key,index]=member.split('-'); config[key][Number(index)]=value; patch.localEffect=config; }
      else patch.localEffect={ ...config, [member]:value };
    }
    else if (field.startsWith('light-')) patch[{ 'light-color': 'color', 'light-intensity': 'intensity', 'light-distance': 'distance', 'light-shadow': 'shadowEnabled', 'light-enabled': 'enabled', 'light-temperature': 'temperature', 'light-angle': 'angle', 'light-penumbra': 'penumbra' }[field]] = field === 'light-angle' ? value * Math.PI / 360 : value;
    else if (field === 'object-secret') patch.audience = value ? 'gm' : 'all';
    else if (field === 'object-locked') patch.locked = value;
    else if (field === 'entity-group') { execute(`${type}.update`, { id: record.id, patch: { groupId: value || null } }); return; }
    else if (field === 'door-angle') { if (store.document.documentType === 'map') execute('entity.update', { id: record.id, patch: { initialAngle: value * Math.PI / 180 } }); else execute('door.setAngle', { id: record.id, angle: value * Math.PI / 180 }); return; }
    else patch[field] = value;
    execute(`${type}.update`, { id: record.id, patch, ...(actorPatch ? { actorPatch } : {}) });
  }

  function cancelEnvironmentPreview() {
    if (!environmentPreview) return;
    environmentPreview = null; viewport.setDocument(isPresentation ? projectPresentation(store.document) : store.document);
    document.getElementById('proposal-bar').hidden = true;
  }
  function previewEnvironment(preset) {
    const next = applyEnvironment(store.document, preset), diff = environmentDiff(store.document, next);
    clearProposal(); environmentPreview = { preset, next, version: store.editVersion };
    viewport.setDocument(isPresentation ? projectPresentation(next) : next);
    const labels = { background:'fundo', fill:'luz ambiente', daylight:'horário/exposição', sky:'céu/nuvens', weather:'clima', fog:'névoa', volumetricFog:'volume de névoa', bloom:'halo', nightWindows:'janelas', effectsPaused:'animação' };
    const bar = document.getElementById('proposal-bar'); bar.hidden = false;
    bar.innerHTML = `<div><span><strong>Prévia de ambiente</strong><small>${diff.fields.map(f => labels[f]).join(' · ') || 'Mesmas configurações globais'} · sol/lua</small></span></div>${button('environment-preview-cancel','Cancelar','','quiet')}${button('environment-preview-accept','Aplicar ambiente','plus','primary')}<p class="microcopy">${diff.windows} janelas de vidro · ${diff.bindings} vínculos por horário · ${diff.localLights} luzes locais preservadas. Geometria e câmeras permanecem na cena.</p>`;
  }
  async function selectedEnvironment() {
    if (!selectedEnvironmentId) throw new Error('Selecione um ambiente salvo.');
    return repository.read(selectedEnvironmentId, 'environment');
  }
  async function refreshEnvironments() { savedEnvironments = await repository.list('environment'); renderSidebar(); }
  async function act(action, metadata = {}) {
    if (!initialized) return;
    switch (action) {
      case 'environment-view-sky': {
        const camera = viewport.getCamera(); skyReturnCamera ??= clone(camera);
        const light = primaryLight(store.document.look ?? store.document.defaultLook);
        const direction = new Vector3(0,1,0).applyQuaternion(new Quaternion(...(light?.rotation ?? [0,0,0,1]))).normalize();
        viewport.setCamera({ ...camera, projection:'perspective', target: new Vector3(...camera.position).addScaledVector(direction,20).toArray() }); break;
      }
      case 'environment-return-map': if (skyReturnCamera) { viewport.setCamera(skyReturnCamera); skyReturnCamera = null; } viewport.frameScene(); break;
      case 'environment-select-light': selectObject(primaryLight(store.document.look ?? store.document.defaultLook)?.id); break;
      case 'environment-binding-remove': if (selection) execute('environment.binding.update', { id:selection, binding:null }); break;
      case 'environment-preview-cancel': cancelEnvironmentPreview(); break;
      case 'environment-preview-accept': { const preview = environmentPreview; if (!preview) break; if (preview.version !== store.editVersion) { cancelEnvironmentPreview(); throw new Error('A cena mudou. Faça uma nova prévia.'); } execute('environment.apply', { preset: preview.preset }); break; }
      case 'environment-custom-apply':
      case 'environment-custom-preview': {
        const version = store.editVersion, documentId = store.document.id, preset = await selectedEnvironment();
        if (version !== store.editVersion || documentId !== store.document.id) throw new Error('A cena mudou enquanto o ambiente era carregado. Tente novamente.');
        if (action.endsWith('preview')) previewEnvironment(preset); else execute('environment.apply', { preset }); break;
      }
      case 'environment-save': {
        const name = prompt('Nome do ambiente:', 'Meu ambiente'); if (!name?.trim()) break;
        const saved = await repository.create(createEnvironmentFromLook(store.document, name.trim()));
        selectedEnvironmentId = saved.id; openAtmosphereSections.add('library'); await refreshEnvironments(); notify('Ambiente salvo na biblioteca.'); break;
      }
      case 'environment-overwrite': {
        const snapshot = createEnvironmentFromLook(store.document), existing = await selectedEnvironment();
        Object.assign(snapshot, { id:existing.id, revision:existing.revision, name:existing.name, createdAt:existing.createdAt });
        await repository.save(snapshot); await refreshEnvironments(); notify('Ambiente atualizado. Cenas anteriores mantêm sua própria cópia.'); break;
      }
      case 'environment-delete': {
        const existing = await selectedEnvironment(); if (!confirm(`Excluir o ambiente “${existing.name}”?`)) break;
        await repository.remove(existing); selectedEnvironmentId = ''; await refreshEnvironments(); notify('Ambiente excluído. As cenas que o usaram continuam iguais.'); break;
      }
      case 'level-add': {
        const level = createLevel({ name: Object.keys(store.document.layout.levels ?? {}).length ? `Andar ${Object.keys(store.document.layout.levels).length + 1}` : 'Térreo', elevation: buildHeight });
        if (execute('level.add', { level, adoptExisting: !Object.keys(store.document.layout.levels ?? {}).length })) { activeLevelId = level.id; renderSidebar(); } break;
      }
      case 'layer-add': { const layer = createLayer({ name: `Camada ${Object.keys(store.document.layout.layers ?? {}).length + 1}` }); if (execute('layer.add', { layer })) { activeLayerId = layer.id; renderSidebar(); } break; }
      case 'level-duplicate': {
        const previous = new Set(Object.keys(store.document.layout.levels ?? {}));
        if (execute('level.duplicate', { id: activeLevelId })) { activeLevelId = Object.keys(store.document.layout.levels).find(key => !previous.has(key)); buildHeight = store.document.layout.levels[activeLevelId].elevation; roomOptions.center[1] = buildHeight; activeSurfaceId = null; viewport.setWorkplaneHeight(buildHeight); viewport.setSupportSurface(null); viewport.setIsolatedLevel(isolatedLevel ? activeLevelId : null); renderSidebar(); notify('Construção copiada para o novo andar; acessos e personagens permanecem no andar de origem.'); } break;
      }
      case 'level-isolate': isolatedLevel = !isolatedLevel; viewport.setIsolatedLevel(isolatedLevel ? activeLevelId : null); renderSidebar(); break;
      case 'level-visible': case 'level-lock': case 'layer-visible': case 'layer-lock': {
        const [kind, operation] = action.split('-'), entry = store.document.layout[kind === 'level' ? 'levels' : 'layers'][metadata.id];
        execute(`${kind}.update`, { id: entry.id, patch: { [operation === 'visible' ? 'visible' : 'locked']: !entry[operation === 'visible' ? 'visible' : 'locked'] } }); break;
      }
      case 'level-remove': case 'layer-remove': execute(`${action.split('-')[0]}.remove`, { id: metadata.id }); break;
      case 'assembly-select': selectObject(metadata.id); break;
      case 'assembly-bind': {
        const groupId=id(), names=[...selectedIds].map(key => locate(key)?.record).filter(Boolean).map(record => entryName(store.document,record));
        if(execute('group.bind',{ id:groupId,ids:[...selectedIds],name:names.slice(0,2).join(' + ').slice(0,256) || 'Composição ancorada' },{ label:'Ancorar objetos juntos' })) { selectObject(groupId); tab='scene'; renderSidebar(); notify('Objetos ancorados como uma unidade. Desancore pelo botão na pasta.'); } break;
      }
      case 'assembly-unbind': {
        const key=metadata.id ?? selection;
        const member=assemblyMembers(store.document,key)[0];
        if(execute('group.unbind',{ id:key },{ label:'Desancorar objetos' })) { selectObject(member?.id ?? null); renderSidebar(); notify('Objetos desancorados. Suas posições e a pasta foram preservadas.'); } break;
      }
      case 'rock-reset': {
        const record=locate()?.record, defaults=rockDefaults(record?.assetRef?.id);
        if(defaults) execute('entity.update',{id:record.id,patch:{rockShape:defaults},snap:false},{label:'Restaurar forma da rocha'});
        break;
      }
      case 'vegetation-preview': try {showAuthorshipProposal(proposeVegetation(store.document,vegetationOptions,store.editVersion,assets));}catch(error){notify(error.message,true);}break;
      case 'water-add': {const entity=createEntity('water',{position:[0,buildHeight,0],...constructionSemantics()});if(execute('entity.add',{entity,snap:false})){selectObject(entity.id);document.getElementById('welcome').hidden=true;}break;}
      case 'water-draw': polygonKind='water';polygonHoleHost=null;clearProposal();viewport.setWorkplaneHeight(buildHeight);setTool('polygon');document.getElementById('welcome').hidden=true;notify('Clique no contorno do rio/lago; Enter conclui.');break;
      case 'snow-exposure': {const terrain=store.document.layout.entities[selection];if(terrain?.kind!=='terrain'){notify('Selecione um terreno para recalcular a máscara. A neve dos objetos verifica o céu automaticamente.');break;}execute('entity.update',{id:terrain.id,patch:{snowMask:viewport.computeSnowExposure(terrain.id)}},{label:'Exposição da neve ao céu'});break;}
      case 'terrain-add': case 'terrain-mountain': {
        const options={ width:terrainOptions.width,length:terrainOptions.length,segments:terrainOptions.segments,position: [terrainOptions.x, buildHeight, terrainOptions.z], ...constructionSemantics() };
        const entity = action==='terrain-mountain' ? createMountainTerrain(options) : createEntity('terrain',options);
        if(terrainOptions.protectFloors) entity.heights=protectTerrainFloors(entity,store.document.layout.entities);
        if(action==='terrain-mountain') {
          showAuthorshipProposal({id:id(),expectedEditVersion:store.editVersion,label:'Preset de montanha · rocha e neve',entities:[entity],lights:[],groups:[],areas:[],updates:[],removals:[],report:{reasons:[terrainOptions.protectFloors?'Relevo limitado sob os pisos existentes, com margem para os triângulos da malha.':'Respeitar pisos está desligado: revise sobreposições com construções.','Preset independente: alturas, materiais e máscaras continuam editáveis; não há regeneração vinculada.']}});
          viewport.framePreview(); break;
        }
        if (execute('entity.add', { entity, snap: false })) { selectObject(entity.id); setTool('select'); viewport.frameSelection(entity.id); document.getElementById('inspector-content').scrollTop = 0; notify('Terreno criado. Os pincéis estão no topo do inspetor à direita: escolha um e clique em Ativar pincel.'); } break;
      }
      case 'terrain-protect-floors': {
        const terrain=locate()?.record;if(terrain?.kind!=='terrain') break;
        showAuthorshipProposal({id:id(),expectedEditVersion:store.editVersion,label:'Ajustar terreno sob construções',entities:[],lights:[],groups:[],areas:[],updates:[{kind:'entity',id:terrain.id,patch:{heights:protectTerrainFloors(terrain,store.document.layout.entities)}}],removals:[],report:{reasons:['Rebaixa somente o terreno que ultrapassa a face inferior dos pisos, com margem e transição nas bordas. Pisos, paredes e objetos independentes são preservados.']}});break;
      }
      case 'terrain-layer-add': {
        const terrain = locate()?.record; if (terrain?.kind !== 'terrain') break;
        const layers = terrain.paintLayers ?? []; if (layers.length >= 8) { notify('O terreno aceita até oito camadas de cor.', true); break; }
        const layer = { id: id(), name: `Camada ${layers.length + 1}`, color: '#f0f3f5', opacity: 1, visible: true, weights: Array(terrain.heights.length).fill(0) };
        if (execute('entity.update', { id: terrain.id, patch: { paintLayers: [...layers, layer] }, snap: false }, { label: 'Nova camada do terreno' })) {
          terrainMaterialTarget='layer'; terrainBrush = { ...terrainBrush, mode: 'paint', strength: Math.min(1, terrainBrush.strength), layerId: layer.id }; viewport.setTerrainBrush(terrainBrush); renderInspector();
          const editor = document.querySelector('[data-disclosure="terrain-layer-editor"]'); if (editor) editor.open = true;
          notify('Camada criada. Escolha a cor e pressione T para pintar no terreno.');
        } break;
      }
      case 'terrain-layer-remove': case 'terrain-layer-front': case 'terrain-layer-back': {
        const terrain = locate()?.record; if (terrain?.kind !== 'terrain' || !terrain.paintLayers) break;
        const layers = clone(terrain.paintLayers), index = layers.findIndex(layer => layer.id === terrainBrush.layerId); if (index < 0) break;
        if (action === 'terrain-layer-remove') layers.splice(index, 1);
        else { const next = index + (action === 'terrain-layer-front' ? 1 : -1); if (next < 0 || next >= layers.length) break; [layers[index], layers[next]] = [layers[next], layers[index]]; }
        execute('entity.update', { id: terrain.id, patch: { paintLayers: layers }, snap: false }, { label: action === 'terrain-layer-remove' ? 'Remover camada do terreno' : 'Reordenar camadas do terreno' }); break;
      }
      case 'terrain-stop': setTool('select'); renderInspector(); break;
      case 'anchor-close': anchorEditing = false; renderInspector(); break;
      case 'anchor-preview': {
        try { showAuthorshipProposal(proposeAnchoring(store.document, { ids: [...selectedIds], hostId: anchorHostId }, store.editVersion)); } catch (error) { notify(error.message, true); } break;
      }
      case 'terrain-paint-selected': {
        const terrain=locate()?.record, layer=terrain?.paintLayers?.find(l=>l.id===terrainBrush.layerId);
        if(!layer)break;
        if(layer.distribution?.mode && layer.distribution.mode!=='paint') {notify('Mude Distribuição da camada para Pintura manual antes de pintar.',true);break;}
        terrainMaterialTarget='layer';terrainBrush.mode='paint';terrainBrush.strength=Math.min(1,terrainBrush.strength);await act('terrain-sculpt');break;
      }
      case 'water-bed-preview': {
        const terrainId=root.querySelector('[data-water-terrain]')?.value;
        try {showAuthorshipProposal(proposeWaterBed(store.document,terrainId,selection,store.editVersion));}catch(error){notify(error.message,true);}break;
      }
      case 'terrain-water-brush': terrainBrush.mode='water'; terrainBrush.shape='circle'; terrainBrush.snap=false; await act('terrain-sculpt'); break;
      case 'rock-sculpt': {
        if(!isSculptableRock(locate()?.record))break;
        if(!ROCK_SCULPT_MODES.includes(terrainBrush.mode))terrainBrush.mode='raise';
        terrainBrush.shape='circle';terrainBrush.snap=false;await act('terrain-sculpt');break;
      }
      case 'rock-sculpt-clear': {
        const record=locate()?.record;if(!isSculptableRock(record))break;
        const asset=assets.find(asset=>asset.id===record.assetRef.id);
        execute('entity.update',{id:record.id,patch:{rockSculpt:{stamps:[]},...(asset?.footprint?{footprint:asset.footprint}:{})},snap:false},{label:'Limpar escultura manual'});break;
      }
      case 'terrain-sculpt': {
        const rock=store.document.layout.entities[selection];
        if(isSculptableRock(rock)) {
          if(isLocked(store.document,rock)){notify('Desbloqueie a rocha antes de esculpir.',true);break;}
          if(!ROCK_SCULPT_MODES.includes(terrainBrush.mode))terrainBrush.mode='raise';
          clearProposal();viewport.setTerrainBrush(terrainBrush);setTool('terrain');renderInspector();notify('Pincel ativo: arraste na superfície da rocha ou no terreno. Esc cancela o traço.');break;
        }
        let terrain = store.document.layout.entities[selection];
        if (terrain?.kind !== 'terrain') {
          const support = store.document.layout.entities[activeSurfaceId];
          const terrains = Object.values(store.document.layout.entities).filter(e => e.kind === 'terrain' && !isLocked(store.document, e));
          terrain = support?.kind === 'terrain' ? support : terrains.length === 1 ? terrains[0] : null;
        }
        if (!terrain || terrain.kind !== 'terrain' || isLocked(store.document, terrain)) { const rock=Object.values(store.document.layout.entities).find(e=>isSculptableRock(e)&&!isLocked(store.document,e));if(rock){if(!ROCK_SCULPT_MODES.includes(terrainBrush.mode))terrainBrush.mode='raise';clearProposal();viewport.setTerrainBrush(terrainBrush);setTool('terrain');selectObject(rock.id);notify('Pincel ativo: aponte para uma rocha/paredão.');}else notify('Selecione um terreno ou uma rocha/paredão desbloqueado para o pincel (T).',true);break; }
        if (selectedIds.size !== 1 || selection !== terrain.id) selectObject(terrain.id);
        if (['paint','erase'].includes(terrainBrush.mode) && !terrain.paintLayers?.some(layer => layer.id === terrainBrush.layerId && layer.visible)) { notify('Crie ou escolha uma camada de cor visível antes de pintar.', true); break; }
        const paintLayer=terrain.paintLayers?.find(layer=>layer.id===terrainBrush.layerId);
        if (['paint','erase'].includes(terrainBrush.mode) && paintLayer?.distribution && paintLayer.distribution.mode!=='paint') { notify('Esta camada é automática. Escolha Pintura manual em Editar material para usar o pincel.',true); break; }
        clearProposal(); viewport.setTerrainBrush(terrainBrush); setTool('terrain'); renderInspector(); notify('Pincel ativo: arraste no terreno ou em rochas/paredões. T ou Q retorna à seleção; Esc cancela.'); break;
      }
      case 'floor-hole': {
        const floor = store.document.layout.entities[selection]; if (floor?.kind !== 'floor') { notify('Selecione o piso para recortar.', true); break; }
        clearProposal(); polygonHoleHost = floor.id; viewport.setWorkplaneHeight(floor.transform.position[1]); setTool('polygon'); notify('Desenhe o contorno interno do recorte; Enter conclui.'); break;
      }
      case 'hole-remove': { const floor = locate()?.record; if (floor?.holes) execute('entity.update', { id: floor.id, patch: { holes: floor.holes.filter((_,i) => i !== Number(metadata.index)) } }); break; }
      case 'contour-walls': {
        try { showAuthorshipProposal(proposeContourWalls(store.document, { floorId: selection ?? activeSurfaceId, height: roomOptions.height }, store.editVersion)); } catch (error) { notify(error.message, true); } break;
      }
      case 'polish-frame': { const key = polishOptions.referenceId || selection; if (store.document.layout.entities[key]) viewport.frameSelection(key); break; }
      case 'save': return saveScene();
      case 'smart-preview': {
        try { showAuthorshipProposal(proposeFurnishing(store.document, { ...smartOptions, floorId: smartFloorId, compositionId: currentComposition()?.id }, store.editVersion, assets)); }
        catch (error) { notify(error.message, true); } break;
      }
      case 'smart-detach': if (currentComposition()) execute('composition.detach', { id: currentComposition().id }); break;
      case 'polish-preview': {
        try { showAuthorshipProposal(proposePolish(store.document, { ...polishOptions, ids: selectedIds.size ? [...selectedIds] : selection ? [selection] : [] }, store.editVersion, assets)); }
        catch (error) { notify(error.message, true); } break;
      }
      case 'polygon-draw': polygonKind='floor'; clearProposal(); polygonHoleHost = null; viewport.setWorkplaneHeight(buildHeight); setTool('polygon'); document.getElementById('welcome').hidden = true; renderSidebar(); break;
      case 'polygon-finish': viewport.finishPolygon(); break;
      case 'platform-add': {
        const entity = createEntity('floor', { name: 'Plataforma', width: 3, length: 3, position: [0, buildHeight || 1, 0], thickness: .25, ...constructionSemantics() });
        if (execute('entity.add', { entity })) { activeSurfaceId = entity.id; selectObject(entity.id); renderSidebar(); } break;
      }
      case 'window-add': {
        if (!Object.values(store.document.layout.entities).some(e => e.kind === 'wall')) { notify('Crie uma parede antes de colocar a janela.', true); break; }
        clearProposal(); setTool('window'); viewport.setTopView(false);
        notify('Clique na parede onde deseja colocar o centro da janela.'); break;
      }
      case 'stairs-place': placing = { type: 'stairs' }; clearProposal(); setTool('place'); notify('Clique no apoio para colocar a escada; ajuste desnível e degraus no inspetor.'); break;
      case 'ramp-place': placing = { type: 'ramp' }; clearProposal(); setTool('place'); notify('Clique no apoio para colocar a rampa; ajuste o desnível no inspetor.'); break;
      case 'duplicate-scene': return duplicateScene();
      case 'group-add': {
        const name = window.prompt('Nome da nova pasta:', 'Nova pasta');
        if (name !== null && name.trim()) {
          execute('group.add', { group: { name: name.trim() } });
          tab = 'scene';
          renderSidebar();
        }
        break;
      }
      case 'new': if (canSwitch()) { selection = null; clearProposal(); store.replace(createScene('Nova cena'), { saved: false }); setTool('select'); viewport.frameScene(); } break;
      case 'open': return openDialog();
      case 'sidebar-toggle': case 'inspector-toggle': { const key=action.split('-')[0],shell=root.querySelector('.app-shell'),closed=shell.classList.toggle(`${key}-collapsed`);if(compactLayout.matches && !closed) shell.classList.add(`${key==='sidebar'?'inspector':'sidebar'}-collapsed`);syncPanelToggles();break; }
      case 'assets-close': assetsWindow.close(); break;
      case 'close-dialog': closeDialog(); break;
      case 'room-draw': clearProposal(); setTool('room'); document.getElementById('welcome').hidden = true; notify('Arraste no chão para desenhar o tamanho da sala.'); break;
      case 'accept-proposal': {
        const proposed = proposal; if (!proposed) return;
        if (execute('proposal.accept', { proposal: proposed })) {
          clearProposal(); const floor = proposed.entities?.find(entity => entity.kind === 'floor');
          if (floor) { viewport.frameScene(); activeSurfaceId = floor.id; smartFloorId = floor.id; selectObject(floor.id); }
          else if(proposed.entities?.some(entity=>entity.kind==='terrain')) {const terrain=proposed.entities.find(entity=>entity.kind==='terrain');selectObject(terrain.id);viewport.frameSelection(terrain.id);}
          else { viewport.setSelection(selection, [...selectedIds]); renderInspector(); }
          renderSidebar(); notify('Proposta aceita. Os elementos continuam editáveis.');
        } break;
      }
      case 'cancel-proposal': clearProposal(); updateView({ type: 'saved' }); break;
      case 'floor-add': { const entity = createEntity('floor', { position: [0, buildHeight, 0], ...constructionSemantics() }); if (execute('entity.add', { entity })) { selectObject(entity.id); setTool('move'); viewport.frameSelection(entity.id); } break; }
      case 'wall-add': {
        const surface = store.document.layout.entities[activeSurfaceId];
        const entity = createEntity('wall', { surfaceId: surface?.id ?? null, position: surface?.transform.position ?? [0, buildHeight, 0], ...constructionSemantics() });
        if (execute('entity.add', { entity })) { selection = entity.id; setTool('move'); viewport.setSelection(selection); renderInspector(); } break;
      }
      case 'door-add': {
        const selected = store.document.layout.entities[selection];
        const wall = selected?.kind === 'wall' ? selected : Object.values(store.document.layout.entities).find((entity) => entity.kind === 'wall' && entity.length >= 1.1 && !Object.values(store.document.layout.entities).some((door) => door.wallId === entity.id));
        if (!wall) { notify('Selecione uma parede com espaço para uma porta.', true); break; }
        const entity = createEntity('door', { wallId: wall.id, surfaceId: wall.surfaceId, groupId: wall.groupId, offset: wall.length / 2, height: Math.min(2.1, wall.height) });
        if (execute('entity.add', { entity })) { selection = entity.id; viewport.setSelection(selection); renderInspector(); } break;
      }
      case 'token-place': placing = { type: 'token', name: document.getElementById('token-name')?.value || 'Personagem', color: document.getElementById('token-color')?.value || '#e4b76f' }; setTool('place'); break;
      case 'fire-place': case 'smoke-place': {
        const asset=assets.find(item=>item.id==='builtin-campfire');
        if(!asset) { notify('Modelo de fogueira indisponível.',true); break; }
        placing={type:'prop',asset:{...asset,name:action==='fire-place'?'Fogueira':'Fumaça'},localEffect:action==='fire-place'?clone(LOCAL_EFFECT_DEFAULTS):smokeDefaults()}; setTool('place'); break;
      }
      case 'spot-place': placing = { type: 'light', lightType: 'spot' }; setTool('place'); break;
      case 'light-place': placing = { type: 'light' }; setTool('place'); break;
      case 'object-delete': { const found = locate(); if (found && confirm(found.type === 'group' ? 'Excluir a composição e todos os seus objetos? Esta ação pode ser desfeita.' : found.record.kind === 'floor' ? 'Excluir o piso e todos os elementos apoiados nele? Esta ação pode ser desfeita.' : found.record.kind === 'wall' ? 'Excluir esta parede e suas portas? Esta ação pode ser desfeita.' : 'Excluir este elemento? Esta ação pode ser desfeita.')) execute(found.type === 'group' ? 'group.delete' : `${found.type}.remove`, { id: selection }); break; }
      case 'material-copy': return sampleMaterial();
      case 'material-paste': return pasteSelectedMaterial();
      case 'material-eyedropper': clearProposal(); setTool('material-sample'); notify('Clique em um objeto para copiar seu material configurado. No terreno, a amostra é da base; para copiar uma camada, use Copiar material no inspetor. Esc cancela.'); break;
      case 'object-copy': return copySelection();
      case 'object-paste': return pasteClipboard();
      case 'object-duplicate': {
        const found=locate(); if(!found) break;
        const keys=() => found.type==='group' ? Object.values(store.document.layout.groups).filter(group=>group.anchored).map(group=>group.id) : [...Object.keys(store.document.layout.entities),...Object.keys(store.document.tokens),...Object.keys((store.document.look ?? store.document.defaultLook).lights)];
        const before=new Set(keys());
        if(execute(`${found.type}.duplicate`,{ id:selection })) selectObject(keys().find(key=>!before.has(key))); break;
      }
      case 'undo': store.undo(); break;
      case 'redo': store.redo(); break;
      case 'perspective': viewport.setTopView(false); break;
      case 'top': viewport.setTopView(true); break;
      case 'frame': if (selection) viewport.frameSelection(selection); else viewport.frameScene(); break;
      case 'cutaway': cutaway = !cutaway; viewport.setCutaway(cutaway); root.querySelector('[data-action="cutaway"]').classList.toggle('active', cutaway); broadcast(); break;
      case 'camera-save': { const camera = { ...viewport.getCamera(), id: id(), name: `Enquadramento ${Object.keys(store.document.cameraPresets).length + 1}` }; execute('camera.save', { camera }); notify('Enquadramento salvo na cena.'); break; }
      case 'publish-camera': viewport.stopCameraMotion(); publishCamera(viewport.getCamera()); notify('Câmera publicada na segunda tela.'); break;
      case 'camera-stop': viewport.stopCameraMotion(); publishCamera(viewport.getCamera(), 0); notify('Transição interrompida no enquadramento atual.'); break;
      case 'camera-cut': viewport.stopCameraMotion(true); publishCamera(viewport.getCamera(), 0); notify('Corte imediato publicado.'); break;
      case 'presentation-window': {
        publishedCamera ??= viewport.getCamera();
        const diagnostics = new URLSearchParams(location.search).has('diagnostics') ? '&diagnostics' : '';
        const opened = window.open(applicationURL(`?presentation=${sessionId}${diagnostics}`), `tabletop-${sessionId}`);
        if (!opened) notify('A janela foi bloqueada. Permita pop-ups para abrir a segunda tela.', true);
        else broadcast(); break;
      }
      case 'present':
        assetsWindow.close(); documentsWindow.close();
        clearProposal(); isPresentation = !isPresentation;
        if (isPresentation) { workingCamera = viewport.getCamera(); publishedCamera ??= workingCamera; viewport.setDocument(projectPresentation(store.document)); viewport.setCamera(publishedCamera); }
        else { const presented = viewport.getCamera(); viewport.setDocument(store.document); if (workingCamera) viewport.setCamera(workingCamera); publishCamera(presented, 0); }
        document.body.classList.toggle('presenting', isPresentation); document.getElementById('presentation-controls').hidden = !isPresentation;
        viewport.setPresentation(isPresentation); updateView({ type: 'saved' }); break;
      case 'fullscreen':
        if (document.fullscreenElement) await document.exitFullscreen();
        else {
          await document.documentElement.requestFullscreen();
          viewport.stopCameraMotion();
          document.querySelector('#viewport canvas')?.focus({ preventScroll: true });
          if (navigator.keyboard?.lock) {
            try {
              // Reserved browser shortcuts need Keyboard Lock, not just preventDefault.
              // Keep Esc unclaimed so leaving fullscreen remains immediate.
              await navigator.keyboard.lock(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
              if (!document.fullscreenElement) navigator.keyboard.unlock();
              else notify('WASD capturado: Ctrl+W controla a câmera. Esc sai da tela cheia.');
            } catch {
              notify('Tela cheia ativa, mas a captura do teclado não foi autorizada. Ctrl+W ainda pode fechar a aba; use Page Down para descer.', true);
            }
          } else notify('Este navegador não oferece captura de teclado. Ctrl+W ainda pode fechar a aba; use Page Down para descer.', true);
        }
        break;
      case 'asset-import': document.getElementById('asset-file').click(); break;
      case 'save-current-as-map': return saveCurrentAsMap();
      case 'dialog-new-scene': {
        if (canSwitch()) {
          selection = null; clearProposal();
          store.replace(createScene('Nova cena'), { saved: false });
          setTool('select'); viewport.frameScene();
          closeDialog();
        }
        break;
      }
      case 'dialog-new-map': {
        if (canSwitch()) {
          selection = null; clearProposal();
          store.replace(createMap('Novo mapa'), { saved: false });
          setTool('select'); viewport.frameScene();
          closeDialog();
          notify('Novo mapa em branco criado. Construa a estrutura e salve no acervo.');
        }
        break;
      }
      case 'dialog-custom-token': {
        const name = window.prompt('Nome do novo token:', 'Personagem');
        if (name !== null && name.trim()) {
          placing = { type: 'token', name: name.trim(), color: '#e4b76f' };
          setTool('place');
          closeDialog();
          notify('Clique no piso para colocar o token.');
        }
        break;
      }
      case 'export-json': return exportJson();
      case 'trigger-load-json': {
        document.getElementById('document-json-file').click();
        break;
      }
      case 'restore-draft': {
        const doc = recovery.document, matching = savedScenes.find((scene) => scene.id === doc.id);
        await drafts.dismiss(recovery);
        recovery = null;
        if (matching && matching.revision !== doc.revision) notify('O disco possui outra revisão. Rascunho restaurado com sua base original; salve como nova cena para preservar as duas versões.', true, true);
        store.replace(doc, { saved: false }); viewport.frameScene(); document.getElementById('recovery-dialog').close(); flushDraft(); break;
      }
      case 'discard-draft': await drafts.dismiss(recovery); recovery = null; await drafts.clear(); document.getElementById('recovery-dialog').close(); updateView({ type: 'saved' }); break;
    }
    if (action.startsWith('tool-')) setTool(action.slice(5));
  }
  root.addEventListener('click', (event) => {
    if (!initialized) return;
    if (!event.target.closest('#context-menu')) hideContextMenu();

    const contextBtn = event.target.closest('[data-context]');
    if (contextBtn && contextTarget) {
      const action = contextBtn.dataset.context;
      const targetId = contextTarget;
      hideContextMenu();
      if (action === 'anchor') act('assembly-bind');
      else if (action === 'unbind') act('assembly-unbind', { id: targetId });
      else if (action === 'mount') {
        anchorEditing = true;
        anchorHostId = [...selectedIds].find(key => ['wall','floor'].includes(store.document.layout.entities[key]?.kind)) ?? locate()?.record.anchor?.hostId ?? '';
        renderInspector(); document.getElementById('inspector-content').scrollTop = 0;
      } else if (action === 'adjust') {
        anchorEditing = false; renderInspector(); const adjustments = document.getElementById('selection-adjustments'); if (adjustments?.parentElement.tagName === 'DETAILS') adjustments.parentElement.open = true; adjustments?.scrollIntoView({ block: 'start' });
      } else if (action === 'rename') renameTarget(targetId);
      else if (action === 'duplicate') { selection = targetId; viewport.setSelection(selection); act('object-duplicate'); }
      else if (action === 'delete') { selection = targetId; viewport.setSelection(selection); act('object-delete'); }
      else if (action === 'delete-group') {
        const group = store.document.layout.groups[targetId];
        if (group && confirm(`Excluir a pasta “${group.name}”? Os objetos dentro dela serão mantidos na raiz.`)) {
          execute('group.remove', { id: targetId });
        }
      }
      return;
    }

    const treeRenameBtn = event.target.closest('[data-tree-rename]');
    if (treeRenameBtn) { renameTarget(treeRenameBtn.dataset.treeRename); return; }

    const treeMenuBtn = event.target.closest('[data-tree-menu]');
    if (treeMenuBtn) {
      const id = assemblyFor(store.document,treeMenuBtn.dataset.treeMenu)?.id ?? treeMenuBtn.dataset.treeMenu;
      const rect = treeMenuBtn.getBoundingClientRect();
      if (!selectedIds.has(id)) selectObject(id); selection = id; viewport.setSelection(selection, [...selectedIds]); renderInspector(); renderSceneTreeIfVisible();
      showContextMenu(rect.right + 4, rect.top, id); return;
    }

    const groupRenameBtn = event.target.closest('[data-group-rename]');
    if (groupRenameBtn) { renameTarget(groupRenameBtn.dataset.groupRename); return; }
    const groupVisibility = event.target.closest('[data-group-visible]');
    if (groupVisibility) { const group = store.document.layout.groups[groupVisibility.dataset.groupVisible]; execute('group.update', { id: group.id, patch: { visible: group.visible === false } }); return; }
    const groupLock = event.target.closest('[data-group-lock]');
    if (groupLock) { const group = store.document.layout.groups[groupLock.dataset.groupLock]; execute('group.update', { id: group.id, patch: { locked: !group.locked } }); return; }

    const groupDeleteBtn = event.target.closest('[data-group-delete]');
    if (groupDeleteBtn) {
      const groupId = groupDeleteBtn.dataset.groupDelete;
      const group = store.document.layout.groups[groupId];
      if (group && confirm(`Excluir a pasta “${group.name}”? Os objetos dentro dela serão mantidos na raiz.`)) {
        execute('group.remove', { id: groupId });
      }
      return;
    }

    const treeEntry = event.target.closest('.tree-entry');
    if (treeEntry && !event.target.closest('button')) {
      selectObject(treeEntry.dataset.select, event.shiftKey); return;
    }

    const node = event.target.closest('button'); if (!node) return;
    if (node.hasAttribute('data-library-clear')) { libraryFilters = { search: '', category: '', era: '', context: '', tags: [], favorites: false }; libraryLimit = 24; renderSidebar(); return; }
    if (node.hasAttribute('data-library-more')) { libraryLimit += 24; renderAssetCards(); return; }
    if (node.dataset.libraryTag) { if (!libraryFilters.tags.includes(node.dataset.libraryTag)) libraryFilters.tags.push(node.dataset.libraryTag); libraryLimit = 24; renderSidebar(); return; }
    if (node.dataset.libraryRemoveTag) { libraryFilters.tags = libraryFilters.tags.filter(tag => tag !== node.dataset.libraryRemoveTag); libraryLimit = 24; renderSidebar(); return; }
    if (node.dataset.libraryEdit) {
      editingAsset = assets.find(asset => asset.id === node.dataset.libraryEdit);
      const dialog = document.getElementById('asset-metadata-dialog'); dialog.innerHTML = metadataEditor(editingAsset, assets); dialog.showModal(); return;
    }
    if (node.hasAttribute('data-library-close')) { document.getElementById('asset-metadata-dialog').close(); editingAsset = null; return; }
    if (node.dataset.libraryFavorite) {
      const asset = assets.find(item => item.id === node.dataset.libraryFavorite); node.disabled = true;
      updateAssetClassification(asset, { favorite: !asset.favorite }).catch(async error => {
        notify(error.message, true); assets = await repository.assets().catch(() => assets); viewport.setAssets(assets); renderSidebar();
      }); return;
    }
    if (node.dataset.action) { Promise.resolve(act(node.dataset.action, node.dataset)).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.tab) {
      if (node.dataset.tab === 'assets') { renderAssets(); assetsWindow.open(); document.getElementById('asset-search').focus({preventScroll:true}); }
      else { assetsWindow.close(); tab = node.dataset.tab; renderSidebar(); }
      return;
    }
    if (node.dataset.dialogTab) { dialogTab = node.dataset.dialogTab; renderDialogContent(); return; }
    if (node.dataset.select) { selectObject(node.dataset.select, event.shiftKey); return; }
    if (node.dataset.asset) {
      const asset = assets.find((item) => item.id === node.dataset.asset);
      placing = asset.type === 'image' ? { type: 'token', name: asset.name.replace(/\.[^.]+$/, ''), color: '#e4b76f', assetRef: { id: asset.id, revision: asset.revision } } : { type: 'prop', asset };
      assetsWindow.close(); if(window.innerWidth<=900) {root.querySelector('.app-shell').classList.add('sidebar-collapsed');syncPanelToggles();} setTool('place'); notify(`Clique no piso para colocar ${asset.name}.`); return;
    }
    if (node.dataset.environmentPreview) { try { previewEnvironment(node.dataset.environmentPreview); } catch (error) { notify(error.message, true); } return; }
    if (node.dataset.environment) { execute('environment.apply', { presetId: node.dataset.environment }); return; }
    if (node.dataset.camera || node.dataset.cameraCut) {
      const preset = store.document.cameraPresets[node.dataset.camera ?? node.dataset.cameraCut];
      const duration = node.dataset.cameraCut ? 0 : cameraDuration;
      viewport.setCamera(preset, { duration }); publishCamera(preset, duration); return;
    }
    if (node.dataset.cameraDelete) { execute('camera.remove', { id: node.dataset.cameraDelete }); return; }
    if (node.dataset.open) { openScene(node.dataset.open).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.openExample) { openExample(node.dataset.openExample).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.openMap) { openMap(node.dataset.openMap).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.instantiateMap) { instantiateMap(node.dataset.instantiateMap).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.duplicateSceneId) { duplicateDocFromList(node.dataset.duplicateSceneId, 'scene'); return; }
    if (node.dataset.duplicateMapId) { duplicateDocFromList(node.dataset.duplicateMapId, 'map'); return; }
    if (node.dataset.deleteMap) { deleteMap(node.dataset.deleteMap); return; }
    if (node.dataset.dialogPickToken) {
      placing = { type: 'token', name: node.dataset.dialogPickToken, color: node.dataset.tokenColor || '#e4b76f' };
      setTool('place');
      closeDialog();
      notify(`Clique no piso para posicionar ${node.dataset.dialogPickToken}.`);
      return;
    }
    if (node.dataset.dialogPickAssetToken) {
      const asset = assets.find((item) => item.id === node.dataset.dialogPickAssetToken);
      if (asset) {
        placing = { type: 'token', name: asset.name.replace(/\.[^.]+$/, ''), color: '#e4b76f', assetRef: { id: asset.id, revision: asset.revision } };
        setTool('place');
        closeDialog();
        notify(`Clique no piso para posicionar ${asset.name}.`);
      }
      return;
    }
    if (node.dataset.deleteScene) {
      if (saving) { notify('Aguarde o salvamento antes de excluir uma cena.'); return; }
      const scene = savedScenes.find((item) => item.id === node.dataset.deleteScene);
      if (!scene || !confirm(`Excluir a cena salva “${scene.name}”?`)) return;
      const version = store.editVersion;
      repository.remove({ ...scene, documentType: 'scene' }).then(async () => {
        if (store.document.id === scene.id) {
          if (store.editVersion === version) store.replace(createScene('Nova cena'), { saved: false });
          else { store.replace(duplicateDocument(store.document, { name: store.document.name }), { saved: false }); notify('Cena salva excluída. As alterações posteriores foram mantidas como uma nova cena.'); }
        }
        await refreshSaved();
        renderDialogContent();
      }).catch((error) => notify(error.message, true));
    }
  });
  root.addEventListener('toggle', event => {
    const atmosphereKey = event.target.dataset?.atmosphereSection;
    if (atmosphereKey && event.target.isConnected) { if (event.target.open) openAtmosphereSections.add(atmosphereKey); else openAtmosphereSections.delete(atmosphereKey); }
    const key = event.target.dataset?.buildSection;
    if(event.target.isConnected && event.target.dataset.disclosure==='terrain-base-material') terrainMaterialTarget=event.target.open?'base':'layer';
    const groupKey = event.target.dataset.buildGroup; if(groupKey && event.target.isConnected) { if(event.target.open) openBuildGroups.add(groupKey); else openBuildGroups.delete(groupKey); }
    if (key && event.target.isConnected) { if (event.target.open) openBuildSections.add(key); else openBuildSections.delete(key); }
  }, true);
  root.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.workspace')) event.preventDefault();
  }, { capture: true });
  document.addEventListener('fullscreenchange', () => {
    const fullscreen = Boolean(document.fullscreenElement);
    root.querySelectorAll('[data-action="fullscreen"]').forEach(button => {
      button.setAttribute('aria-pressed', String(fullscreen));
      button.querySelector('span').textContent = fullscreen ? 'Sair da tela cheia' : 'Tela cheia';
    });
    if (!fullscreen) { navigator.keyboard?.unlock?.(); viewport.stopCameraMotion(); }
  });
  root.addEventListener('contextmenu', (event) => {
    if (!initialized) return;
    const entry = event.target.closest('.tree-entry');
    if (entry) {
      event.preventDefault();
      const id = assemblyFor(store.document,entry.dataset.select)?.id ?? entry.dataset.select;
      if (!selectedIds.has(id)) selectObject(id); selection = id; viewport.setSelection(selection, [...selectedIds]); renderInspector(); renderSceneTreeIfVisible();
      showContextMenu(event.clientX, event.clientY, id);
      return;
    }
    const groupHeader = event.target.closest('.tree-group-header');
    if (groupHeader) {
      event.preventDefault();
      showContextMenu(event.clientX, event.clientY, groupHeader.dataset.groupId);
      return;
    }
  });
  root.addEventListener('dragstart', (event) => {
    const entry = event.target.closest('[data-drag-id]');
    if (entry) {
      draggedTreeId = entry.dataset.dragId;
      entry.classList.add('dragging');
      event.dataTransfer.setData('text/plain', draggedTreeId);
      event.dataTransfer.effectAllowed = 'move';
    }
  });
  root.addEventListener('dragend', (event) => {
    const entry = event.target.closest('[data-drag-id]');
    if (entry) entry.classList.remove('dragging');
    root.querySelectorAll('.tree-group.drag-over').forEach((el) => el.classList.remove('drag-over'));
    draggedTreeId = null;
  });
  root.addEventListener('dragover', (event) => {
    const groupTarget = event.target.closest('[data-drop-group]');
    if (groupTarget && draggedTreeId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const treeGroup = groupTarget.closest('.tree-group');
      if (treeGroup) treeGroup.classList.add('drag-over');
    }
  });
  root.addEventListener('dragleave', (event) => {
    const treeGroup = event.target.closest('.tree-group');
    if (treeGroup && !treeGroup.contains(event.relatedTarget)) {
      treeGroup.classList.remove('drag-over');
    }
  });
  root.addEventListener('drop', (event) => {
    const groupTarget = event.target.closest('[data-drop-group]');
    if (groupTarget && draggedTreeId) {
      event.preventDefault();
      const targetGroupId = groupTarget.dataset.dropGroup || null;
      const assembly=assemblyFor(store.document,draggedTreeId);
      if(assembly && assembly.id!==targetGroupId) execute('group.update',{ id:assembly.id,patch:{ parentId:targetGroupId } });
      const entity = !assembly && store.document.layout.entities[draggedTreeId];
      if (entity && entity.groupId !== targetGroupId) {
        execute('entity.update', { id: draggedTreeId, patch: { groupId: targetGroupId } });
      }
      root.querySelectorAll('.tree-group.drag-over').forEach((el) => el.classList.remove('drag-over'));
      draggedTreeId = null;
    }
  });
  root.addEventListener('change', (event) => {
    if (!initialized) return;
    if (event.target.dataset.assetFilter) { libraryFilters[event.target.dataset.assetFilter] = event.target.value; libraryLimit = 24; renderAssetCards(); }
    else if (event.target.id === 'asset-tag-filter') { if (event.target.value && !libraryFilters.tags.includes(event.target.value)) libraryFilters.tags.push(event.target.value); libraryLimit = 24; renderSidebar(); }
    else if (event.target.id === 'asset-favorites') { libraryFilters.favorites = event.target.checked; libraryLimit = 24; renderAssetCards(); }
    else if (event.target.id === 'asset-file') { importAsset(event.target.files[0]); event.target.value = ''; }
    else if (event.target.id === 'document-json-file') { importJson(event.target.files[0]); event.target.value = ''; }
    else if (event.target.dataset.field) changeField(event.target);
    else if (event.target.id === 'scene-name') execute('scene.rename', { name: event.target.value });
  });
  root.addEventListener('input', (event) => { if (event.target.id === 'asset-search') { libraryFilters.search = event.target.value; libraryLimit = 24; renderAssetCards(); } });
  root.addEventListener('submit', (event) => {
    if (event.target.id === 'quick-form') { event.preventDefault(); makeProposal(); }
    else if (event.target.id === 'asset-metadata-form') { event.preventDefault(); saveAssetClassification(event.target); }
  });
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="door-toggle"]')) {
      const found = locate(); if (found?.record.kind === 'door') { const angle = store.document.sessionState?.doors?.[selection] ?? found.record.initialAngle; execute('door.setAngle', { id: selection, angle: Math.abs(angle) < .1 ? Math.PI / 2 : 0 }); }
    }
  });
  window.addEventListener('keydown', (event) => {
    if (!initialized) return;
    if (event.key === 'Escape') {
      if (document.getElementById('asset-metadata-dialog').open) return;
      if (document.getElementById('assets-dialog').open) { assetsWindow.close(); return; }
      const docDialog = document.getElementById('documents-dialog');
      if (docDialog && docDialog.hasAttribute('open')) {
        closeDialog();
        return;
      }
      hideContextMenu();
      if (isPresentation) act('present');
      else { clearProposal(); setTool('select'); }
      return;
    }
    if (event.defaultPrevented || event.target.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])')) return;
    if (document.querySelector('dialog[open]:not(.floating-window)') || event.target.closest('.floating-window')) return;
    if (isPresentation) return;
    if (event.ctrlKey || event.metaKey) {
      if (event.shiftKey && ['c', 'v'].includes(event.key.toLowerCase())) { event.preventDefault(); act(event.key.toLowerCase() === 'c' ? 'material-copy' : 'material-paste'); return; }
      if (event.key.toLowerCase() === 's') { event.preventDefault(); saveScene(); }
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? store.redo() : store.undo(); }
      if (event.key.toLowerCase() === 'y') { event.preventDefault(); store.redo(); }
      if (event.key.toLowerCase() === 'd') { event.preventDefault(); act('object-duplicate'); }
      if (event.key.toLowerCase() === 'c') { event.preventDefault(); act('object-copy'); }
      if (event.key.toLowerCase() === 'v') { event.preventDefault(); act('object-paste'); }
      return;
    }
    if (event.key.toLowerCase() === 't') { event.preventDefault(); if (!event.repeat) act(tool === 'terrain' ? 'terrain-stop' : 'terrain-sculpt'); return; }
    if (tool === 'terrain' && ['[',']'].includes(event.key)) { event.preventDefault(); terrainBrush.radius = Math.max(.1, Math.min(100, Number((terrainBrush.radius * (event.key === '[' ? .8 : 1.25)).toFixed(2)))); viewport.setTerrainBrush(terrainBrush); renderToolContext(); renderInspector(); return; }
    if (event.altKey || event.repeat) return;
    if (event.key.toLowerCase() === 'i') { event.preventDefault(); act('material-eyedropper'); return; }
    const keys = { q: 'select', g: 'move', r: 'rotate', v: 'scale' };
    if (keys[event.key.toLowerCase()]) setTool(keys[event.key.toLowerCase()]);
    if (event.key.toLowerCase() === 'f') act('frame');
    if (event.key === 'Delete' || event.key === 'Backspace') act('object-delete');
  });

  const dialogElem = document.getElementById('documents-dialog');
  const dialogCloseBtn = document.getElementById('close-library-dialog');
  if (dialogCloseBtn) {
    dialogCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
    });
  }
  const dialogHeader = dialogElem?.querySelector('.dialog-title-group');
  if (dialogElem && dialogHeader) {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dialogStartX = 0;
    let dialogStartY = 0;

    dialogHeader.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = dialogElem.getBoundingClientRect();
      dialogStartX = rect.left;
      dialogStartY = rect.top;
      dialogElem.style.left = `${dialogStartX}px`;
      dialogElem.style.top = `${dialogStartY}px`;
      dialogElem.style.right = 'auto';
      dialogElem.style.bottom = 'auto';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - dragStartX;
        const dy = moveEvent.clientY - dragStartY;
        const newLeft = Math.max(10, Math.min(window.innerWidth - 100, dialogStartX + dx));
        const newTop = Math.max(10, Math.min(window.innerHeight - 80, dialogStartY + dy));
        dialogElem.style.left = `${newLeft}px`;
        dialogElem.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }
  window.addEventListener('pagehide', () => { previews.dispose(); flushDraft(); channel?.close(); viewport.destroy(); repository.dispose?.(); });
  window.addEventListener('beforeunload', (event) => { if (store.dirty) { event.preventDefault(); event.returnValue = ''; } });

  const initial = await Promise.allSettled([repository.assets(), repository.list('scene'), repository.list('map'), drafts.read(), repository.list('environment')]);
  if (initial[0].status === 'fulfilled') assets = initial[0].value; else notify(repository.storage==='browser'?`Não foi possível carregar os assets: ${initial[0].reason.message}`:'O servidor local está indisponível. Inicie com npm run dev ou npm start; o trabalho continua como rascunho.', true, true);
  if (initial[1].status === 'fulfilled') savedScenes = initial[1].value;
  if (initial[2].status === 'fulfilled') savedMaps = initial[2].value;
  if (initial[3].status === 'fulfilled') recovery = initial[3].value;
  if (initial[4].status === 'fulfilled') savedEnvironments = initial[4].value;
  viewport.setAssets(assets);
  const lastId = lastScene.read();
  if (lastId) {
    const isMap = savedMaps.some((scene) => scene.id === lastId);
    const isScene = savedScenes.some((scene) => scene.id === lastId);
    if (isMap || isScene) {
      try { store.replace(await repository.read(lastId, isMap ? 'map' : 'scene')); } catch (error) { notify(error.message, true); }
    }
  }
  if (recovery) {
    try { recovery.document = migrateDocument(recovery.document); } catch { await drafts.dismiss(recovery); recovery = null; }
    if (recovery && recovery.document.id === store.document.id && contentJSON(recovery.document) === contentJSON(store.document)) { await drafts.dismiss(recovery); recovery = null; }
  }
  initialized = true; document.getElementById('scene-name').disabled = false;
  store.subscribe(updateView); updateView({ type: 'saved' }); viewport.frameScene();
  const firstCamera = Object.values(store.document.cameraPresets || {})[0]; if (firstCamera) viewport.setCamera(firstCamera);
  previews.schedule();
  if (recovery) {
    document.getElementById('recovery-description').textContent = `“${recovery.document.name}” possui um rascunho local de ${new Date(recovery.savedAt).toLocaleString('pt-BR')}. Restaurar não sobrescreve a versão salva ${repository.storage==='browser'?'neste navegador':'no servidor'}.`;
    document.getElementById('recovery-dialog').showModal();
  }
  // Read-only diagnostics for browser verification; no backdoor mutations.
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('diagnostics')) {
    Object.defineProperty(window, '__tabletop', { value: Object.freeze({ snapshot: () => clone(store.document), project: (position) => viewport.project(position), camera: () => viewport.getCamera(), stats: () => viewport.getInfo(), editVersion: () => store.editVersion, copy: () => copySelection(), paste: () => pasteClipboard() }), configurable: true });
  }
}

function startPresentation(root, sessionId) {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(sessionId)) throw new Error('Endereço de apresentação inválido.');
  if (typeof BroadcastChannel !== 'function') throw new Error('Este navegador não suporta a apresentação em segunda janela.');
  document.body.classList.add('presentation-window');
  root.innerHTML = `<div id="presentation-viewport"></div><div id="presentation-message" class="presentation-message">Aguardando a cena do mestre…</div><button id="presentation-effects" class="presentation-fullscreen" style="right:60px" title="Névoa e efeitos nesta janela" aria-label="Névoa e efeitos nesta janela" aria-pressed="true">${icon('light')}</button><button id="presentation-fullscreen" class="presentation-fullscreen" title="Tela cheia" aria-label="Tela cheia">${icon('frame')}</button>`;
  const viewport = createViewport(document.getElementById('presentation-viewport'), {
    onError: (error) => { document.getElementById('presentation-message').textContent = error.message; },
    navigationEnabled: false,
  });
  viewport.setPresentation(true);
  if (new URLSearchParams(location.search).has('diagnostics')) {
    Object.defineProperty(window, '__tabletop', { value: Object.freeze({ camera: () => viewport.getCamera(), stats: () => viewport.getInfo() }), configurable: true });
  }
  const channel = new BroadcastChannel(`tabletop-presentation-${sessionId}`);
  let sequence = 0, receivedCameraSequence = null;
  const request = () => channel.postMessage({ version: 1, sessionId, type: 'ready' });
  const retry = setInterval(request, 1500);
  channel.onmessage = (event) => {
    const data = event.data;
    if (data?.version !== 1 || data.sessionId !== sessionId || data.type !== 'snapshot' || data.sequence <= sequence) return;
    try {
      validateDocument(data.document); sequence = data.sequence;
      viewport.setAssets(data.assets); viewport.setDocument(data.document); viewport.setCutaway(data.cutaway);
      if (data.camera && data.cameraSequence !== receivedCameraSequence) {
        const duration = receivedCameraSequence === null ? 0 : Number(data.cameraDuration) || 0;
        viewport.setCamera(data.camera, { duration }); receivedCameraSequence = data.cameraSequence;
      }
      document.title = `${data.document.name} — apresentação`; document.getElementById('presentation-message').hidden = true; clearInterval(retry);
    } catch (error) { document.getElementById('presentation-message').textContent = error.message; }
  };
  let effectsEnabled = true;
  document.getElementById('presentation-effects').onclick = event => { effectsEnabled = !effectsEnabled; viewport.setEffectsEnabled(effectsEnabled); event.currentTarget.setAttribute('aria-pressed', String(effectsEnabled)); };
  document.getElementById('presentation-fullscreen').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  window.addEventListener('pagehide', () => { clearInterval(retry); channel.close(); viewport.destroy(); });
  request();
}
