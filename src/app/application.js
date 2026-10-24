import { trustSnapshot } from '../state/immutable.js';
import { reconcileElement } from '../ui/reconcile.js';
import { createLatestJob } from '../data/latest-job.js';
import { createPerformanceDiagnostics } from '../diagnostics/performance.js';
import { illuminationDefaults, illuminationPatch, ZONE_DEFAULTS, RENDERING_DEFAULTS } from '../domain/dynamic-lighting.js';
import { illuminationPanel, zonePanel } from '../ui/dynamic-lighting-panel.js';
import { switchState, recordLightOn } from '../domain/light-switch.js';
import { createLightPresetRepository } from '../data/light-presets.js';
import { wearFieldPatch } from '../domain/wear.js';
import { createScenePreviews } from './scene-previews.js';
import { copyMaterial } from '../domain/material-transfer.js';
import { captureBrushSettings, applyBrushPreset } from '../domain/brush-presets.js';
import { createBrushPresetRepository } from '../data/brush-presets.js';
import { brushPresetsPanel } from '../ui/brush-presets-panel.js';
import {rockSculptPanel} from '../ui/rock-sculpt-panel.js';
import { EXAMPLE_SCENES, loadExampleScene } from '../data/example-scenes.js';
import {isSculptableRock,ROCK_SCULPT_MODES} from '../domain/rock-sculpt.js';
import { proposeWaterBrush, proposeWaterBed } from '../authoring/water.js';
import { floatingWindow } from '../ui/floating-window.js';
import { taskList, sectionDisclosure, rememberDisclosures, restoreDisclosures, animateDisclosures } from '../ui/panel-disclosures.js';
import { landscapePanel, waterPanel } from '../ui/landscape-panels.js';
import { proposeVegetation } from '../authoring/vegetation.js';
import { isVegetationAsset } from '../domain/landscape.js';
import { rockDefaults } from '../domain/rocks.js';
import { measurementText } from '../domain/measurement.js';
import { rockPanel } from '../ui/rock-panel.js';
import { cablePanel } from '../ui/cable-panel.js';
import { screenPanel } from '../ui/screen-panel.js';
import { decalPanel } from '../ui/decal-panel.js';
import { screenFieldPatch, screenLineAdd, screenLineRemove } from '../domain/screens.js';
import { DECAL_ASSET, decalDefaults, decalPlacement, decalAnchorFromWorld, decalFieldPatch } from '../domain/decals.js';
import { CABLE_ASSET, cableBetween, cableDefaults, cableEndpoint } from '../domain/cables.js';
import { createMountainTerrain } from '../authoring/mountain.js';
import { numberField, colorField, checkField, choiceField, bindControls } from '../ui/controls.js';
import { paintSwatches } from '../ui/swatches.js';
import { wetFieldPatch } from '../domain/wetness.js';
import { materialPanel, localEffectPanel } from '../ui/material-panels.js';
import { surfacePatch, layerSurfacePatch, textureFieldPatch, coverageDefaults, distributionOptions, LOCAL_EFFECT_DEFAULTS, smokeDefaults, sparksDefaults, dripDefaults } from '../domain/materials.js';
import { Euler, Quaternion, Vector3 } from 'three';
import { environmentPanel, bindingPanel } from '../ui/environment-panels.js';
import { atmospherePanel, lightPanel } from '../ui/lighting-panels.js';
import { FOG_DEFAULTS, VOLUME_DEFAULTS, BLOOM_DEFAULTS, FLICKER_DEFAULTS, SKY_DEFAULTS, WEATHER_DEFAULTS, DAYLIGHT_DEFAULTS, NIGHT_WINDOWS_DEFAULTS, BINDING_DEFAULTS, colorToHSV, hsvToColor } from '../domain/lighting.js';
import { createScene, createMap, createSceneFromMap, createMapFromScene, createEntity, createToken, createLight, createLevel, createLayer, clone, id, validateDocument, duplicateDocument, migrateDocument } from '../domain/documents.js';
import { polygonSize, groupChain, isSupport, isAccess, supportHeightAt, constrainOpening, localPoint, isLocked } from '../domain/geometry.js';
import { quaternionFromYaw, yawFromQuaternion } from '../domain/coords.js';
import { ENVIRONMENTS, ENVIRONMENT_FIELDS, primaryLight, createEnvironmentFromLook, applyEnvironment, environmentDiff } from '../domain/environments.js';
import { createSceneStore } from '../state/scene-store.js';
import { proposeRoom } from '../authoring/quick-build.js';
import { proposeFurnishing } from '../authoring/furnishing.js';
import { proposeRoomState } from '../authoring/room-state.js';
import { describeRoom } from '../authoring/room-insight.js';
import { proposeBuilding, proposeAddRoom, proposeRemoveRoom, proposeRedivide, describeBuilding, planBuilding, addRoomSpots, BUILDING_TYPES } from '../authoring/building.js';
import { proposeRoomLighting, proposeRoomDetails, proposeRoomCables, roomMood, suggestAtmosphere } from '../authoring/room-ambience.js';
import { proposeSurroundings, inferSetting, SETTINGS, SURROUNDINGS_TAG } from '../authoring/surroundings.js';
import { roomEra } from '../authoring/room-insight.js';
import { createTutor, tutorialCenter, lessonForTask } from '../tutorial/tutor.js';
import { assemblyFor, assemblyMembers } from '../domain/assemblies.js';
import { resampleTerrain, resizeTerrain, protectTerrainFloors } from '../authoring/terrain.js';
import { proposeAnchoring } from '../authoring/anchoring.js';
import { proposePolish } from '../authoring/polish.js';
import { proposeContourWalls } from '../authoring/structures.js';
import { constructionPanel, smartBuildPanel, buildingPanel, surroundingsPanel, polishPanel, proposalReport, levelsPanel, terrainPanel, terrainInspector, anchoringPanel } from '../ui/authoring-panels.js';
import { createViewport } from '../render/renderer.js';
import { createInspectionControl } from './live/inspection.js';
import { createInspectionOverlay } from '../ui/inspection-overlay.js';
import { inspectablePanel } from '../ui/inspectable-panel.js';
import { cluePanel } from '../ui/clue-panel.js';
import { inspectableFieldPatch } from '../domain/inspectables.js';
import { repository, ApiError } from '../data/api.js';
import { applicationURL, storageScope } from '../data/paths.js';
import { drafts } from '../data/drafts.js';
import { icon, escapeHTML as esc } from '../ui/icons.js';
import { shellMarkup, button } from '../ui/shell.js';
import { viewState } from './view-state.js';
import { INSPECTOR_TABS, inspectorTabFor, kindLabel } from '../ui/inspector-tabs.js';
import { revealNode } from '../ui/reveal.js';
import { sceneAccent } from '../ui/scene-accent.js';
import { readUiTheme, writeUiTheme, applyUiTheme, normalizeUiTheme, uiThemeMarkup, DEFAULT_UI_THEME } from '../ui/ui-theme.js';
import { posterMarkup } from '../ui/posters.js';
import { createStageCut } from '../ui/stage-cut.js';
import { createCommandPalette } from '../ui/command-palette.js';
import { WHERE, normalize } from '../ui/command-index.js';
import { keyFor } from '../ui/shortcuts.js';
import { LESSONS } from '../tutorial/lessons.js';
import { BUILD_TASKS, SCENE_TASKS, SHOTS_TASKS, TASKS_BY_TAB } from '../ui/task-definitions.js';
import { actorHero, actorAvatar } from '../ui/actor-hero.js';
import { shotsPanel, shotDockMarkup } from '../ui/shots-panel.js';
import { createShotThumbnails } from './shot-thumbnails.js';
import { shortcutsSheetMarkup } from '../ui/shortcuts.js';
import { projectPresentation, presentationAssets } from './presentation.js';
import { createAmbience } from './live/ambience.js';
import { FLASHLIGHT_DEFAULTS, MOTION_DEFAULTS, closeUpSpots } from '../domain/cinematics.js';
import { cinemaPanel } from '../ui/cinema-panel.js';
import { flashlightPanel } from '../ui/flashlight-panel.js';
import { figurePanel } from '../ui/figure-panel.js';
import { initiativePanel, initiativeStrip, areasPanel } from '../ui/initiative-panel.js';
import { startInitiative, stepInitiative, setInitiativeValue } from '../domain/initiative.js';
import { DIAGONAL_RULES } from '../domain/movement.js';
import { FIGURE_DEFAULTS } from '../domain/figures.js';
import { splitLabels } from '../domain/asset-library.js';
import { assetLibraryPanel, assetCards, metadataEditor } from '../ui/asset-library-panel.js';

const TAB_TITLES = { build: 'CONSTRUIR', elements: 'ELEMENTOS', scene: 'AMBIENTE', shots: 'TOMADAS' };
const contentJSON = (doc) => { const { revision, createdAt, updatedAt, ...body } = doc; return JSON.stringify(body); };
const entryName = (doc, entry) => doc.actors?.[entry.actorId]?.name ?? entry.name;
const lastSceneKey = `tabletop-last-scene${storageScope()==='/'?'':':'+storageScope()}`;
const lastScene = {
  read() { try { return localStorage.getItem(lastSceneKey); } catch { return null; } },
  write(value) { try { localStorage.setItem(lastSceneKey, value); } catch { /* Optional preference, independent of a confirmed disk write. */ } },
};
const uiThemeKey = `tabletop-ui-theme${storageScope()==='/'?'':':'+storageScope()}`;

export async function startApplication() {
  const root = document.getElementById('app');
  const presentationId = new URLSearchParams(location.search).get('presentation');
  let uiTheme = readUiTheme(uiThemeKey), brandAccent = applyUiTheme(uiTheme), uiThemeSaved = true;
  if (presentationId) return startPresentation(root, presentationId);
  // Scene-derived colours fall back to the chosen palette, or follow it entirely when the person turns that off.
  const accentFor = look => uiTheme.followScene ? sceneAccent(look, brandAccent) : brandAccent;
  root.innerHTML = shellMarkup({ storage: repository.storage, homeURL: applicationURL('') });

  let assets = [], savedScenes = [], savedMaps = [], selection = null, tool = 'select', tab = 'build';
  let materialClipboard = null,illuminationClipboard=null;
  let lightingQuality='balanced',lightingBudget={locals:8,shadowViews:6,mapSize:1024},legibility=false;
  const lightPresetRepository=createLightPresetRepository();let lightPresets=[],selectedLightPreset='';
  let dialogTab = 'scenes';
  let savedEnvironments = [], selectedEnvironmentId = '', environmentPreview = null, skyReturnCamera = null;
  const openAtmosphereSections = new Set();
  const sceneDisclosures = new Map(), inspectorDisclosures = new Map(), inspectorTab = new Map(), treeFilter = { search: '', kind: 'all' }, collapsedTreeGroups = new Set();
  let libraryFilters = { search: '', category: '', era: '', context: '', tags: [], favorites: false };
  let libraryLimit = 24, editingAsset = null;
  let proposal = null, placing = null, saving = false, isPresentation = false, cutaway = true;
  let repeatAssetPlacement = true;
  let measurement = null, rulerSnap = false;
  let barQuietUntil = 0, lastTabbed = null, barFrame = 0, pointerHeld = false, barSignature = '', letterbox = false, titleSequence = 0, titleCard = { title: '', subtitle: '', duration: 4 }, viewTagFrame = 0, publishedPresetId = null, rehearsedId = null, dockIndex = 0, dockHidden = false, lastConnected = false, workingCamera = null, publishedCamera = null, recovery = null, draftTimer, noticeTimer;
  let draftWarningShown = false;
  const performanceDiagnostics=createPerformanceDiagnostics();
  let openTicket = 0;
  let initialized = false;
  let roomOptions = { width: 6, length: 5, height: 2.6, center: [0, 0, 0], door: true, lighting: true };
  let activeSurfaceId, buildHeight = 0, smartFloorId = null, selectedIds = new Set();
  let smartOptions = { template: 'office', density: 'normal', chairs: 4, seed: 1, lighting: true, restoreDeleted: false };
  // The room type follows what is in the room until the person picks one for that floor.
  let stateOptions = { state: 'abandoned', intensity: .6, seed: 1 }, smartTemplateChosenFor = null, ambienceOptions = { mood: 'auto', amount: .6, seed: 1 }, buildingOptions = { floorId: '', width: 15, length: 9, type: 'house', seed: 1, furnish: true, lighting: true, roof: true, addTemplate: 'bathroom', rooms: null, hub: null, center: null, bands: null, pick: null, era: 'modern', mode: null };
  let aroundOptions = { setting: 'auto', margin: 6, enclosure: true, street: true, greenery: .6, seed: 1 };
  let drawingBuilding = false, topView = false, roofsChoice = null;
  let anchorEditing = false, anchorHostId = '';
  const openBuildSections = new Set(['room']);
    let terrainMaterialTarget = 'layer';
  const compactLayout = window.matchMedia('(max-width:900px)');
  let desktopPanels = { sidebar: false, inspector: false };
  if(compactLayout.matches) root.querySelector('.app-shell').classList.add('sidebar-collapsed','inspector-collapsed');
  function syncPanelToggles() {
    const shell = root.querySelector('.app-shell');
    for (const key of ['sidebar', 'inspector']) root.querySelector(`[data-action=${key}-toggle]`).setAttribute('aria-expanded', String(!shell.classList.contains(`${key}-collapsed`)));
    root.querySelectorAll('.rail-tabs [data-tab]').forEach(node => node.setAttribute('aria-expanded', String(node.dataset.tab === tab && !shell.classList.contains('sidebar-collapsed'))));
  }
  // --- selection bar: the few things you do right after picking an object, next to the object ---
  const scheduleSelectionBar = () => { if (!barFrame) barFrame = requestAnimationFrame(() => { barFrame = 0; updateSelectionBar(); }); };
  // The bar waits a moment after a selection, a tool change or a click, so it never sits under the next click.
  const holdSelectionBar = () => { barQuietUntil = performance.now() + 350; scheduleSelectionBar(); };
  function updateSelectionBar() {
    const wait = barQuietUntil - performance.now();
    if (wait > 0) { document.getElementById('selection-bar').hidden = true; setTimeout(scheduleSelectionBar, wait + 20); return; }
    const bar = document.getElementById('selection-bar'), found = selection && selectedIds.size <= 1 ? locate() : null;
    const record = found?.record, anchor = record && (record.transform?.position ?? record.position);
    const allowed = found && found.type !== 'group' && record.kind !== 'terrain' && anchor && !isPresentation && !pointerHeld && !proposal && ['select', 'move', 'rotate', 'scale'].includes(tool);
    const point = allowed ? viewport.project([anchor[0], anchor[1] + 1.4, anchor[2]]) : null;
    if (!point?.visible) { if (!bar.hidden) bar.hidden = true; return; }
    const hasLight = Boolean(document.querySelector('#inspector-content [data-inspector-tab-button="light"]'));
    const signature = `${selection}:${hasLight}`;
    if (signature !== barSignature) {
      barSignature = signature;
      bar.innerHTML = `<button type="button" data-bar="move" data-tip="Mover" data-key="G" aria-label="Mover">${icon('move', 16)}</button><button type="button" data-bar="rotate" data-tip="Girar" data-key="R" aria-label="Girar">${icon('rotate', 16)}</button><button type="button" data-bar="look" data-tip="Aparência" aria-label="Aparência">${icon('eyedropper', 16)}</button>${hasLight ? `<button type="button" data-bar="light" data-tip="Luz" aria-label="Luz">${icon('light', 16)}</button>` : ''}<i></i><button type="button" data-bar="duplicate" data-tip="Duplicar" data-key="Ctrl+D" aria-label="Duplicar">${icon('layers', 16)}</button><button type="button" data-bar="delete" data-tip="Excluir" data-key="Delete" aria-label="Excluir" class="danger">${icon('trash', 16)}</button>`;
    }
    const host = bar.parentElement.getBoundingClientRect();
    bar.style.transform = `translate(${Math.round(point.x - host.left)}px, ${Math.round(point.y - host.top)}px) translate(-50%, calc(-100% - 10px))`;
    if (bar.hidden) bar.hidden = false;
  }
  function useSelectionBar(name) {
    if (name === 'move') setTool('move'); else if (name === 'rotate') setTool('rotate');
    else if (name === 'look' || name === 'light') { const shell = root.querySelector('.app-shell'); if (shell.classList.contains('inspector-collapsed')) togglePanel('inspector'); selectInspectorTab(name === 'look' ? 'look' : 'light'); }
    else if (name === 'duplicate') act('object-duplicate'); else if (name === 'delete') act('object-delete');
  }
  // --- Ctrl+K: everything the editor can do or reach, found by name ---
  function openTask(tabName, key) {
    tab = tabName; if (root.querySelector('.app-shell').classList.contains('sidebar-collapsed')) togglePanel('sidebar');
    if (tabName === 'build') openBuildSections.add(key); else sceneDisclosures.set(key, true);
    renderSidebar(); syncPanelToggles();
    const node = document.querySelector(`#side-content [data-panel-section="${key}"], #side-content [data-build-section="${key}"]`);
    if (node) { node.open = true; node.scrollIntoView({ block: 'start' }); flash(node); }
  }
  const flash = node => { node.classList.remove('reveal-flash'); void node.offsetWidth; node.classList.add('reveal-flash'); setTimeout(() => node.classList.remove('reveal-flash'), 1300); };
  function goToTab(name) { tab = name; if (root.querySelector('.app-shell').classList.contains('sidebar-collapsed')) togglePanel('sidebar'); assetsWindow.close(); renderSidebar(); syncPanelToggles(); }
  const labelOf = field => {
    const holder = field.closest('label.field, label.check, .check');
    const labelNode = holder?.querySelector('.field-label') ?? holder?.querySelector('span');
    const text = labelNode ? [...labelNode.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim() || labelNode.textContent.trim() : '';
    return text || field.getAttribute('aria-label') || '';
  };
  function paletteEntries() {
    const entries = [], doc = store.document, add = (group, label, run, extra = {}) => entries.push({ group, label, run, ...extra });
    const action = (label, name, keywords = '') => add('Ações', label, () => act(name), { keywords, hint: keyFor(label) });
    action('Salvar', 'save', 'gravar'); action('Nova cena', 'new', 'novo criar'); action('Abrir cenas e mapas', 'open', 'biblioteca galeria'); add('Ações', 'Assets', () => root.querySelector('[data-tab="assets"]').click(), { keywords: 'biblioteca modelos texturas retratos importar' });
    action('Apresentar', 'present', 'projetor jogadores previa'); action('Abrir segunda tela', 'presentation-window', 'projetor'); action('Publicar câmera atual', 'publish-camera', 'projetor mostrar');
    action('Desfazer', 'undo'); action('Refazer', 'redo'); action('Duplicar', 'object-duplicate', 'copiar objeto');
    add('Ações', 'Selecionar', () => setTool('select'), { keywords: 'ferramenta', hint: keyFor('Selecionar') }); add('Ações', 'Mover', () => setTool('move'), { keywords: 'ferramenta', hint: keyFor('Mover') });
    add('Ações', 'Girar', () => setTool('rotate'), { keywords: 'rotacionar ferramenta', hint: keyFor('Girar') }); add('Ações', 'Escala', () => setTool('scale'), { keywords: 'tamanho ferramenta', hint: keyFor('Escala') });
    add('Ações', 'Régua', () => act('tool-measure'), { keywords: 'medir distancia ferramenta', hint: keyFor('Régua') }); add('Ações', 'Conta-gotas', () => act('material-eyedropper'), { keywords: 'copiar material ferramenta', hint: keyFor('Conta-gotas') });
    action('Esculpir terreno', 'terrain-sculpt', 'pincel relevo'); action('Enquadrar', 'frame', 'foco camera');
    action('Perspectiva', 'perspective', 'camera vista'); action('Vista superior', 'top', 'camera planta'); action('Ver interior', 'cutaway', 'paredes da frente'); action('Telhados', 'roofs', 'forro mostrar ocultar'); action('Tela cheia', 'fullscreen');
    action('Destacar interativos', 'highlight-interactives', 'portas objetos pistas contorno'); add('Ações', 'Interagir: porta, luz ou documento', () => interact(), { keywords: 'interagir porta abrir fechar luz lampada acender apagar ligar desligar documento carta pista ler pegar', hint: 'E' }); action('Próximo turno', 'initiative-next', 'iniciativa combate vez rodada'); action('Câmera ao vivo', 'live-camera', 'projetor acompanha camera travelling cinematografica'); action('Ambientação ao vivo', 'ambience', 'variaveis da sessao hora do dia horario ceu nuvens nevoa clima chuva sliders transicao'); action('Tutoriais', 'tutorials', 'aprender ajuda'); action('Atalhos de teclado', 'shortcuts', 'teclas ajuda'); action('Configurações', 'settings', 'aparencia tema cor paleta destaque preferencias');
    for (const [name, label, keywords] of [['build', 'Construir', 'ferramentas sala prédio'], ['elements', 'Elementos', 'lista objetos cena'], ['scene', 'Ambiente', 'luz atmosfera clima'], ['shots', 'Tomadas', 'câmeras enquadramentos projetor']]) add('Ações', `Ir para ${label}`, () => goToTab(name), { keywords });
    for (const preset of ENVIRONMENTS) add('Ações', `Ambiente · ${preset.name}`, () => execute('environment.apply', { presetId: preset.id }), { keywords: `${preset.description} horario atmosfera`, hint: 'aplicar ambiente' });
    for (const [tabName, groups] of Object.entries(TASKS_BY_TAB)) for (const { title, tasks } of groups) for (const [, key, label, description] of tasks) add('Tarefas', label, () => openTask(tabName, key), { keywords: `${description} ${title}`, hint: `${TAB_TITLES[tabName].toLowerCase()} · ${title}` });
    const seen = new Set();
    for (const field of document.querySelectorAll('#inspector-content [data-field]')) {
      const label = labelOf(field), name = field.dataset.field;
      if (!label || seen.has(name) || field.type === 'hidden') continue; seen.add(name);
      const section = field.closest('details[data-panel-section]')?.querySelector(':scope > summary')?.textContent.trim() ?? '';
      add('Nesta seleção', label, () => { revealNode(field); field.focus({ preventScroll: true }); flash(field.closest('label, .check') ?? field); }, { keywords: section, hint: section });
    }
    for (const entry of [...Object.values(doc.layout?.entities ?? {}), ...Object.values(doc.tokens ?? {}), ...Object.values(doc.look?.lights ?? doc.defaultLook?.lights ?? {})]) {
      const name = entryName(doc, entry); if (name) add('Elementos', name, () => { selectObject(entry.id); act('frame-selection'); }, { hint: kindLabel({ type: entry.actorId ? 'token' : entry.type ? 'light' : 'entity', record: entry }).toLowerCase() });
    }
    for (const asset of assets) add('Assets', asset.name, () => beginAssetPlacement(asset), { keywords: [asset.category, asset.era, ...(asset.tags ?? []), ...(asset.contexts ?? [])].filter(Boolean).join(' '), hint: asset.category ?? asset.type });
    for (const scene of savedScenes) add('Cenas', scene.name, () => openScene(scene.id), { hint: 'minha cena' });
    for (const map of savedMaps) add('Cenas', map.name, () => openMap(map.id), { hint: 'mapa' });
    for (const example of EXAMPLE_SCENES) add('Cenas', example.name, () => openExample(example.id), { keywords: example.description, hint: 'exemplo' });
    for (const lesson of LESSONS) add('Tutoriais', lesson.title, () => act('tutorial-start', { id: lesson.id }), { keywords: [lesson.summary, ...[lesson.ask ?? []].flat()].join(' '), hint: `${lesson.minutes} min` });
    for (const item of WHERE) add('Onde fica', item.label, () => notify(item.hint), { keywords: item.keywords, hint: 'onde fica' });
    return entries;
  }
  const palette = createCommandPalette(document.getElementById('command-palette'), { collect: paletteEntries });
  function toggleShortcuts(open) {
    const sheet = document.getElementById('shortcuts-sheet'), next = open ?? !sheet.open;
    if (next && !sheet.open) { sheet.innerHTML = shortcutsSheetMarkup(); sheet.show(); sheet.querySelector('button')?.focus(); }
    else if (!next && sheet.open) { sheet.close(); root.querySelector('[data-action="shortcuts"]')?.focus(); }
  }
  function setUiTheme(next, { persist = true } = {}) {
    uiTheme = normalizeUiTheme(next); brandAccent = applyUiTheme(uiTheme);
    if (persist) uiThemeSaved = writeUiTheme(uiThemeKey, uiTheme);
    renderSettings();
    if (!initialized) return;
    paintSceneAccent(); renderWelcome();
    if (document.getElementById('documents-dialog').open) renderDialogContent();
  }
  function renderSettings() {
    const sheet = document.getElementById('settings-dialog'); if (!sheet.open) return;
    const focused = document.activeElement?.closest?.('#settings-dialog') ? (document.activeElement.dataset.uiPalette ?? document.activeElement.id) : null;
    sheet.innerHTML = uiThemeMarkup(uiTheme, { saved: uiThemeSaved });
    if (focused) sheet.querySelector(`[data-ui-palette="${focused}"], #${CSS.escape(focused)}`)?.focus();
  }
  function toggleSettings(open) {
    const sheet = document.getElementById('settings-dialog'), next = open ?? !sheet.open;
    if (next && !sheet.open) { sheet.show(); renderSettings(); sheet.querySelector('[aria-pressed="true"], input')?.focus(); }
    else if (!next && sheet.open) { sheet.close(); root.querySelector('.rail [data-action="settings"]')?.focus(); }
    root.querySelector('.rail [data-action="settings"]')?.setAttribute('aria-expanded', String(sheet.open));
  }
  {
    const sheet = document.getElementById('settings-dialog');
    sheet.addEventListener('click', event => {
      const swatch = event.target.closest('[data-ui-palette]');
      if (swatch) setUiTheme({ ...uiTheme, palette: swatch.dataset.uiPalette });
      else if (event.target.closest('[data-ui-theme-reset]')) setUiTheme(DEFAULT_UI_THEME);
      else if (event.target.closest('[data-settings-close]')) toggleSettings(false);
    });
    // The picker previews while dragging and is stored once the person settles on a colour.
    sheet.addEventListener('input', event => { if (event.target.id === 'ui-theme-custom') { uiTheme = normalizeUiTheme({ ...uiTheme, palette: 'custom', custom: event.target.value }); brandAccent = applyUiTheme(uiTheme); if (initialized) paintSceneAccent(); } });
    sheet.addEventListener('change', event => {
      if (event.target.id === 'ui-theme-custom') setUiTheme({ ...uiTheme, palette: 'custom', custom: event.target.value });
      else if (event.target.id === 'ui-theme-follow') setUiTheme({ ...uiTheme, followScene: event.target.checked });
    });
    // Another tab changed the preference.
    window.addEventListener('storage', event => { if (event.key === uiThemeKey) setUiTheme(readUiTheme(uiThemeKey), { persist: false }); });
  }
  function togglePanel(key) {
    const shell = root.querySelector('.app-shell'), closed = shell.classList.toggle(`${key}-collapsed`);
    if (compactLayout.matches && !closed) shell.classList.add(`${key === 'sidebar' ? 'inspector' : 'sidebar'}-collapsed`);
    syncPanelToggles();
  }
  syncPanelToggles();
  compactLayout.addEventListener('change', event => {
    const shell=root.querySelector('.app-shell');
    if(event.matches) {
      desktopPanels=Object.fromEntries(['sidebar','inspector'].map(key=>[key,shell.classList.contains(`${key}-collapsed`)]));
      shell.classList.add('sidebar-collapsed','inspector-collapsed');
    } else for(const key of ['sidebar','inspector']) shell.classList.toggle(`${key}-collapsed`,desktopPanels[key]);
    syncPanelToggles();
  });
  const stageCut = createStageCut(root.querySelector('.stage-cut'));
  const assetsWindow = floatingWindow(document.getElementById('assets-dialog'), { trigger: root.querySelector('[data-tab=assets]'), position: [280,96] });
  const documentsWindow = floatingWindow(document.getElementById('documents-dialog'), { trigger: root.querySelector('[data-action=open]'), position: [110,48] });
  const ambienceWindow = floatingWindow(document.getElementById('ambience-window'), { trigger: root.querySelector('.rail [data-action="ambience"]'), position: [Math.max(16, window.innerWidth - 420), 72] });
  // Session-only camera settings: none of them is saved with the scene except through a saved shot.
  // Whether passing the turn also glides the camera to whoever has it (a session preference).
  let initiativeCamera = false, tacticalZoom = false, highlightCount = 0;
  // The next area of effect to draw: shape, colour, width and label (session preferences).
  let areaTool = { shape: 'circle', color: '#ff6a3d', width: 1.5, label: '' };
  let ambience = null, navigationSmoothing = 0, liveCamera = { enabled: false, smoothing: .6 }, liveCameraFrame = 0, tokenDrag = null, tokenDragFrame = 0;
  animateDisclosures(root);
  let polishOptions = { mode: 'align', axis: 'x', alignment: 'center', angle: 5, seed: 1, palette: 'natural', clearance: .8, referenceId: '' };
  let activeLevelId = null, activeLayerId = null, isolatedLevel = false, polygonHoleHost = null, polygonKind='floor', terrainCell = 0;
  let vegetationOptions={terrainId:'',assetId:'builtin-dense-alpine-fir',count:6,seed:42,scaleMin:.7,scaleMax:1.2,slopeMax:35};
  let terrainOptions = { width: 20, length: 20, segments: 32, x: 0, z: 0, protectFloors: true }, terrainResizeMode = 'extend', terrainBrush = { mode: 'raise', radius: 2, strength: .25, target: 0, waterLevel: .05, waterDepth: .6, shape: 'circle', hardness: 0, snap: false, layerId: '', rockPattern: 'fractured', rockSize: 3, rockSeed: 42, protectFloors: true };
  lightPresetRepository.list().then(entries=>{lightPresets=entries;if(initialized)renderInspector();}).catch(()=>{});
  const brushPresetRepository = createBrushPresetRepository();
  const brushPresetStates = { terrain: { selectedId: '', name: '' }, rock: { selectedId: '', name: '' } };
  let brushPresets = [], brushPresetsBusy = false, brushPresetsError = '';
  const brushSurface = () => locate()?.record.kind === 'terrain' ? 'terrain' : isSculptableRock(locate()?.record) ? 'rock' : null;
  const personalBrushes = surface => brushPresetsPanel(surface, brushPresets, brushPresetStates[surface], brushPresetsBusy, brushPresetsError);

  async function manageBrushPreset(action) {
    const surface = brushSurface();
    if (!surface || brushPresetsBusy) return;
    const state = brushPresetStates[surface], selected = brushPresets.find(preset => preset.id === state.selectedId && preset.surface === surface);
    if (action === 'apply') {
      terrainBrush = applyBrushPreset(terrainBrush, selected, surface);
      viewport.setTerrainBrush(terrainBrush); renderInspector(); renderToolContext();
      notify(`Pincel “${selected.name}” aplicado. ${tool === 'terrain' ? 'Continue pintando na superfície.' : 'Ative o pincel para começar.'}`);
      return;
    }
    if (action !== 'save' && !selected) throw new Error('Selecione um pincel salvo primeiro.');
    // Capture before awaiting storage; switching scene cannot change what is saved.
    const input = action === 'delete' ? null : {
      name: action === 'update' ? selected.name : state.name,
      surface,
      brush: action === 'rename' ? selected.brush : captureBrushSettings(surface, terrainBrush),
    };
    brushPresetsBusy = true; brushPresetsError = ''; renderInspector();
    try {
      if (action === 'delete') {
        await brushPresetRepository.remove(selected);
        brushPresets = brushPresets.filter(preset => preset.id !== selected.id);
        state.selectedId = ''; state.name = '';
        notify(`Preset “${selected.name}” excluído.`);
      } else {
        const saved = await brushPresetRepository.save(input, action === 'save' ? null : selected);
        brushPresets = [...brushPresets.filter(preset => preset.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        state.selectedId = saved.id; state.name = saved.name;
        notify(`Pincel “${saved.name}” ${action === 'rename' ? 'renomeado' : action === 'update' ? 'atualizado' : 'salvo neste navegador'}.`);
      }
    } catch (error) {
      brushPresetsError = error.message || 'Não foi possível guardar o pincel.';
      try { brushPresets = await brushPresetRepository.list(); } catch { /* Keep the last confirmed library visible for a retry. */ }
      notify(brushPresetsError, true);
    } finally { brushPresetsBusy = false; renderInspector(); }
  }
  const constructionSemantics = () => ({ levelId: activeLevelId, layerId: activeLayerId });
  let contextTarget = null, draggedTreeId = null;
  const store = createSceneStore(createScene('Minha primeira cena'));
  let viewInitialized=false;
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
      const typeLabel = kindLabel(found);
      const name = found.type === 'token' ? doc.actors?.[found.record.actorId]?.name ?? found.record.name : found.record.name;
      menu.innerHTML = `
        <div class="context-menu-header">${selectedIds.size > 1 ? `${selectedIds.size} SELECIONADOS` : `${typeLabel}: ${esc(name)}`}</div>
        <button type="button" class="context-menu-item" data-context="rename">${icon('edit', 14)}<span>Renomear</span></button>
        <button type="button" class="context-menu-item" data-context="anchor" ${selectedIds.size < 2 ? 'disabled title="Selecione dois ou mais objetos com Shift"' : ''}><span>Ancorar objetos juntos</span></button><button type="button" class="context-menu-item" data-context="mount"><span>Fixar em parede / teto…</span></button><button type="button" class="context-menu-item" data-context="adjust"><span>Alinhar e ajustar…</span></button>${found.type === 'entity' && found.record.kind === 'prop' && selectedIds.size < 2 ? `<button type="button" class="context-menu-item" data-context="inspect">${icon('search', 14)}<span>Inspecionar</span></button>` : ''}<button type="button" class="context-menu-item" data-context="duplicate">${icon('copy', 14)}<span>Duplicar</span></button>
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
    onInspect: id => { hideContextMenu(); inspectionControl.open(id); },
    onInspection: event => { if (event.type === 'closed') inspectionControl.closed(event.entityId); else inspectionControl.render(); },
    onMaterialSlots: objectId => { if (selection === objectId) renderInspector(); },
    onSelect: (value, meta) => { selectObject(value, meta?.additive); hideContextMenu(); },
    onMaterialPick: objectId => sampleMaterial(objectId),
    onLightingDiagnostics:info=>{const message=`${info.active} de ${info.authored} fontes locais · ${info.shadowViews} vistas de sombra${info.omitted?' · '+info.omitted+' fora do orçamento':''}`;for(const output of root.querySelectorAll('[data-lighting-status]'))if(output.textContent!==message)output.textContent=message;},
    onIlluminationOrigin:(id,position)=>{const r=locate(id)?.record;if(!r?.illumination)return;const config=clone(r.illumination);config.position=position;if(!config.pinned.includes('position'))config.pinned.push('position');if(execute('entity.update',{id,patch:{illumination:config},snap:false}))setTool('select');},
    onMeasurementChange: value => { measurement = value; updateMeasurementResult(); },
    onTransform: (objectId, transform, meta = {}) => {
      const found = locate(objectId);
      if (!found) return;
      // A decal only slides over the face it is glued to and turns about its normal.
      if (found.record.decal && found.record.anchor?.socket === 'surface') {
        const host = store.document.layout.entities[found.record.anchor.hostId];
        execute('entity.update', { id: objectId, patch: { anchor: decalAnchorFromWorld(host, found.record.anchor, transform) }, snap: false }); return;
      }
      const patch = found.type === 'light' ? { position: transform.position, rotation: transform.rotation } : { transform };
      if (found.type === 'group') execute('group.transform', { id: objectId, transform, snap: meta.snap });
      else execute(`${found.type}.update`, { id: objectId, patch, snap: meta.snap });
    },
    onPlace: (point) => placeAt(point),
    onSurfacePlace: ({ hostId, point, normal, purpose }) => {
      if (purpose === 'cable') { placeCableEnd(hostId, point, normal); return; }
      const host = store.document.layout.entities[hostId], asset = assets.find(a => a.id === DECAL_ASSET);
      if (!host || !asset) { notify('O objeto Decalque não está na biblioteca.', true); return; }
      if (isLocked(store.document, host)) { notify('A superfície está bloqueada.', true); return; }
      try {
        const decal = decalDefaults(), { position, rotation, anchor } = decalPlacement(host, point, normal);
        const entity = createEntity('prop', { name: 'Decalque', assetRef: { id: asset.id, revision: asset.revision }, footprint: [decal.size[0], .02], position, rotation, anchor, decal, ...constructionSemantics() });
        if (execute('entity.add', { entity, snap: false })) { setTool('move'); selectObject(entity.id, false, { revealInspector: true }); notify('Decalque colado. Edite o texto e o desgaste em Propriedades; Mover (G) o desliza sobre a superfície.'); }
      } catch (error) { notify(error.message, true); }
    },
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
    onRoomDraw: (rectangle) => {
      // The same gesture draws a room or the outline of a building.
      if (drawingBuilding) { drawingBuilding = false; buildingOptions = { ...buildingOptions, floorId: '', width: rectangle.width, length: rectangle.length, center: rectangle.center }; tab = 'build'; openBuildSections.add('building'); previewBuilding(); renderSidebar(); return; }
      roomOptions = { ...roomOptions, ...rectangle }; tab = 'build'; makeProposal(); renderSidebar();
    },
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
    onCinemaChange: () => { renderInspector(); if (tab === 'shots') renderSidebar(); },
    // With the live camera on, the projector sees a token move while it is dragged, at most once a frame.
    onTokenDrag: (tokenId, position) => {
      if (!liveCamera.enabled || isPresentation || !hasPresentation()) return;
      tokenDrag = { tokenId, position }; if (tokenDragFrame) return;
      tokenDragFrame = requestAnimationFrame(() => { tokenDragFrame = 0; sendPresentation('live-token', tokenDrag); });
    },
    onAreaDraw: area => { if (execute('area.add', { area: { ...area, id: id() } }, { label: 'Área de efeito' })) { setTool('select'); if (tab === 'shots') renderSidebar(); } },
    onCameraChange: (() => {
      const perspectiveBtn = root.querySelector('[data-action="perspective"]');
      const topBtn = root.querySelector('[data-action="top"]');
      let lastProjection = null, lastFov = null;
      return preset => {
        hideContextMenu(); scheduleViewTag(); scheduleSelectionBar();
        if (liveCamera.enabled && !isPresentation) sendLiveCamera();
        if (lastProjection !== preset.projection) {
          lastProjection = preset.projection;
          perspectiveBtn?.classList.toggle('active', preset.projection === 'perspective');
          topBtn?.classList.toggle('active', preset.projection === 'orthographic');
        }
        if (tab === 'shots') {
          const rounded = String(Math.round(preset.fov * 10) / 10);
          if (lastFov !== rounded) {
            const field = root.querySelector('[data-field="camera-fov"]');
            if (field && document.activeElement !== field) { field.value = rounded; lastFov = rounded; }
          }
        } else lastFov = null;
      };
    })(),
  });
  let previewWarningShown = false;
  const previews = createScenePreviews({
    viewport, repository, assets: () => assets,
    current: () => ({ document: store.document, version: store.editVersion, dirty: store.dirty, previewing: Boolean(environmentPreview) }),
    onUpdate: () => {
      renderWelcome();
      if (!document.getElementById('documents-dialog')?.hasAttribute('open')) return;
      for (const node of root.querySelectorAll('[data-open], [data-open-map], [data-open-example]')) {
        const example = EXAMPLE_SCENES.find(item => item.id === node.dataset.openExample);
        const docId = node.dataset.open ?? node.dataset.openMap;
        const doc = example ?? (docId === store.document.id ? store.document : [...savedScenes, ...savedMaps].find(item => item.id === docId));
        if (!doc) continue;
        const title = node.querySelector('strong'); if (title) title.textContent = doc.name;
        const detail = node.querySelector('.scene-card-description small');
        if (detail) detail.textContent = doc.revision === 0 ? 'Em criação · ainda não salva' : `Tomada ${doc.revision} · ${new Date(doc.updatedAt).toLocaleString('pt-BR')}`;
        const actions = node.closest('.item-card')?.querySelector('.item-card-actions');
        if (actions) actions.hidden = doc.revision === 0;
        const image = example ? previews.exampleImage(example) : previews.image(doc); if (!image) continue;
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
  // Picking up a document or object: local by default, on the projector only when shown.
  const inspectionControl = createInspectionControl({ container: document.getElementById('viewport'), viewport, store, execute: (type, payload, options) => execute(type, payload, options), notify,
    send: (type, fields) => { if (hasPresentation()) sendPresentation(type, fields); }, hasPresentation, onChange: () => { if (tab === 'shots') renderSidebar(); } });
  const shotThumbnails = createShotThumbnails({ assets: () => assets, canRun: () => !isPresentation && tab === 'shots' && !viewport.isBusy?.(), onUpdate: () => { if (tab === 'shots') renderSidebar(); renderShotDock(); } });
  const presets = () => Object.values(store.document.cameraPresets ?? {});
  // The carousel of shots over the stage, while a projector is connected or the editor is presenting.
  function renderShotDock() {
    const dock = document.getElementById('shot-dock'), list = presets();
    const visible = list.length > 0 && !dockHidden && (isPresentation || hasPresentation()) && tab !== 'shots';
    dock.hidden = !visible;
    if (!visible) { if (dock.dataset.html) { dock.innerHTML = ''; dock.dataset.html = ''; } return; }
    dockIndex = Math.min(Math.max(dockIndex, 0), list.length - 1);
    const html = shotDockMarkup(store.document, { index: dockIndex, publishedId: publishedPresetId, thumbnails: camera => shotThumbnails.image(store.document, camera, store.editVersion) });
    if (dock.dataset.html !== html) { dock.innerHTML = html; dock.dataset.html = html; }
  }
  function takeShot(preset, { cut = false, rehearse = false } = {}) {
    if (!preset) return;
    const duration = cut ? 0 : cameraDuration;
    viewport.setCamera(preset, { duration });
    if (rehearse) rehearsedId = preset.id; else { rehearsedId = null; publishCamera(preset, duration, preset.id); }
    dockIndex = Math.max(0, presets().findIndex(item => item.id === preset.id));
    if (tab === 'shots') renderSidebar();
    renderShotDock(); scheduleViewTag();
  }
  let exampleObserver;
  function observeGalleryCards() {
    exampleObserver?.disconnect();
    const dialog = document.getElementById('documents-dialog');
    if (!dialog.hasAttribute('open')) return;
    const cards = [...dialog.querySelectorAll('[data-open-example], [data-open], [data-open-map]')];
    const prioritize = nodes => {
      const ids = new Set(nodes.map(node => node.dataset.open ?? node.dataset.openMap).filter(Boolean));
      if (ids.size) previews.ensure([...savedScenes, ...savedMaps].filter(doc => ids.has(doc.id)), { visibleIds: ids });
      const examples = nodes.map(node => EXAMPLE_SCENES.find(item => item.id === node.dataset.openExample)).filter(Boolean);
      if (examples.length) previews.ensureExamples(examples);
    };
    if (!globalThis.IntersectionObserver) {
      const bounds = dialog.getBoundingClientRect();
      prioritize(cards.filter(node => { const box = node.getBoundingClientRect(); return box.bottom > bounds.top && box.top < bounds.bottom; }));
      return;
    }
    exampleObserver = new IntersectionObserver(entries => {
      if (dialog.hasAttribute('open')) prioritize(entries.filter(entry => entry.isIntersecting).map(entry => entry.target));
    }, { root: dialog });
    cards.forEach(card => exampleObserver.observe(card));
  }
  document.getElementById('documents-dialog').addEventListener('close',()=>{exampleObserver?.disconnect();previews.cancelLibrary();});
  function previewImage(doc, example = false) {
    const image = example ? previews.exampleImage(doc) : previews.image(doc);
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
  function selectObject(value, additive = false, { revealInspector = true } = {}) {
    anchorEditing = false;
    value = tool==='terrain'&&isSculptableRock(store.document.layout.entities[value])?value:assemblyFor(store.document,value)?.id??value;
    if (!additive) selectedIds.clear();
    if (value) { if (additive && selectedIds.has(value)) selectedIds.delete(value); else selectedIds.add(value); }
    selection = [...selectedIds].at(-1) ?? null;
    if (['floor', 'terrain'].includes(store.document.layout.entities[selection]?.kind) && !additive) {
      activeSurfaceId = selection;
      // The assistant follows the room being worked on: its floor, or the floor under the selected piece.
      const selected = store.document.layout.entities[selection], roomFloor = selected.kind === 'floor' ? selection : store.document.layout.entities[store.document.layout.entities[selected.surfaceId]?.kind === 'prop' ? store.document.layout.entities[selected.surfaceId].surfaceId : selected.surfaceId]?.kind === 'floor' ? (store.document.layout.entities[selected.surfaceId].kind === 'prop' ? store.document.layout.entities[selected.surfaceId].surfaceId : selected.surfaceId) : null;
      // The ground the assistant laid is not a room to work on.
      if (roomFloor && smartFloorId !== roomFloor && !store.document.layout.entities[roomFloor].tags?.includes(SURROUNDINGS_TAG)) { smartFloorId = roomFloor; const existing = currentComposition(); if (existing) smartOptions = { ...existing.parameters, restoreDeleted: false }; }
      viewport.setSupportSurface(selection); if (locate()?.record.kind==='terrain') openBuildSections.add('terrain');
      if (tab === 'build') renderSidebar();
    }
    if(selection && revealInspector && window.innerWidth<=900) {root.querySelector('.app-shell').classList.remove('inspector-collapsed');root.querySelector('.app-shell').classList.add('sidebar-collapsed');syncPanelToggles();}
    if(tool==='terrain'&&isSculptableRock(store.document.layout.entities[selection])&&terrainBrush.mode==='rock'){terrainBrush.mode='push';viewport.setTerrainBrush(terrainBrush);renderToolContext();}
    viewport.setSelection(selection, [...selectedIds]); renderInspector(); renderSceneTreeIfVisible();
    if (store.document.layout.entities[selection]?.kind === 'terrain') document.getElementById('inspector-content').scrollTop = 0;
  }
  /** The rooms being edited: the person's list, or what the type puts in this outline. */
  function buildingRooms() {
    if (buildingOptions.rooms) return buildingOptions.rooms;
    const outline = store.document.layout.entities[buildingOptions.floorId], [w, l] = outline ? [outline.width, outline.length] : [buildingOptions.width, buildingOptions.length];
    try { return planBuilding(buildingOptions.type, Math.max(w, l), Math.min(w, l), buildingOptions.seed).rooms.filter(room => !room.hub).map(room => room.key); } catch { return []; }
  }
  function buildingPlan() {
    const outline = store.document.layout.entities[buildingOptions.floorId], [w, l] = outline ? [outline.width, outline.length] : [buildingOptions.width, buildingOptions.length];
    try { return planBuilding(buildingOptions.type, Math.max(w, l), Math.min(w, l), buildingOptions.seed, buildingOptions.rooms ? { rooms: buildingOptions.rooms, hub: buildingOptions.hub, bands: buildingOptions.bands } : null); } catch { return null; }
  }
  /** Swaps two rooms of the plan, the entrance room included; sizes follow the rooms. */
  function swapBuildingRooms(from, to) {
    const plan = buildingPlan(), a = plan?.rooms[from], b = plan?.rooms[to]; buildingOptions.pick = null;
    if (!a || !b || a === b) { renderSidebar(); return; }
    const bands = plan.arrangement.map(list => [...list]), live = Boolean(proposal?.buildingPreview);
    const slot = room => { let seen = 0; for (const other of plan.rooms) { if (other === room) break; if (!other.hub && other.band === room.band) seen++; } return [room.band, seen]; };
    let hub = plan.programme.hub;
    if (a.hub || b.hub) { const other = a.hub ? b : a, [band, at] = slot(other); bands[band][at] = hub; hub = other.key; }
    else { const [ba, ia] = slot(a), [bb, ib] = slot(b); [bands[ba][ia], bands[bb][ib]] = [bands[bb][ib], bands[ba][ia]]; }
    buildingOptions = { ...buildingOptions, hub, bands, rooms: bands.flat(), pick: null }; clearProposal(); if (live) previewBuilding(); renderSidebar();
  }
  /** Which side of its wall a window's room is on: +1 along the wall's local Z, −1 against it. */
  function windowInward(window) {
    const wall = store.document.layout.entities[window.wallId], floor = store.document.layout.entities[wall?.floorIds?.[0] ?? wall?.surfaceId];
    if (!wall?.transform || !floor?.transform) return 1;
    const turn = new Quaternion(...wall.transform.rotation), middle = new Vector3(window.offset, 0, 0).applyQuaternion(turn).add(new Vector3(...wall.transform.position));
    return new Vector3(0, 0, 1).applyQuaternion(turn).dot(new Vector3(...floor.transform.position).sub(middle)) >= 0 ? 1 : -1;
  }
  // What the tutorials' conditions read. The assistant's reading is kept per document and floor: this runs every frame of a lesson.
  let tutorReading = null;
  function tutorialState() {
    if (!tutorReading || tutorReading.document !== store.document || tutorReading.floor !== smartFloorId) tutorReading = { document: store.document, floor: smartFloorId, inferred: smartFloorId ? describeRoom(store.document, smartFloorId, assets)?.inferred[0]?.id ?? null : null, inBuilding: Boolean(smartFloorId && describeBuilding(store.document, smartFloorId, assets)) };
    const assetsOpen = document.getElementById('assets-dialog').open;
    return { document: store.document, tab, sections: [...openBuildSections], proposal: Boolean(proposal), assetsOpen, placing: tool === 'place' && placing?.asset ? placing.asset.id : null, placingKind: tool === 'place' ? placing?.type ?? null : null,
      selected: store.document.layout.entities[selection]?.kind ?? (store.document.tokens?.[selection] ? 'token' : null), tool, topView, canRedo: store.canRedo, presenting: isPresentation, inspecting: inspectionControl?.id ?? null, saved: !store.dirty && store.document.revision > 0,
      listedAssets: assetsOpen ? [...document.querySelectorAll('#asset-cards [data-asset]')].map(node => node.dataset.asset) : [],
      assistant: { inferred: tutorReading.inferred, state: stateOptions.state, mood: ambienceOptions.mood, buildingMode: buildingOptions.mode ?? (tutorReading.inBuilding ? 'extend' : 'new') },
      room: roomOptions, copied: materialClipboard?.name ?? null, surface: activeSurfaceId ?? null, picked: store.document.layout.entities[selection]?.assetRef?.id ?? null, selectedId: selection ?? null,
      documentsOpen: document.getElementById('documents-dialog').open, ambience: { open: document.getElementById('ambience-window').open, duration: ambience?.duration ?? 5 },
      camera: viewport.getCamera(), following: viewport.cinemaInfo().follow,
      isolated: isolatedLevel, environments: savedEnvironments.length, projector: hasPresentation(), rehearsed: rehearsedId, published: publishedPresetId, live: liveCamera.enabled,
      titles: titleSequence, titleText: titleCard.title, letterbox, tactical: tacticalZoom, highlights: highlightCount, roofs: roofsChoice ?? !topView, anyPublished: cameraSequence > 0,
      placingToken: tool === 'place' && placing?.type === 'token' ? { name: placing.name, color: placing.color } : null,
      selectedName: store.document.actors?.[store.document.tokens?.[selection]?.actorId]?.name ?? null, vegetationTerrain: vegetationOptions.terrainId || null };
  }
  const sceneEmpty = () => !Object.keys(store.document.layout.entities).length;
  function renderTutorials() {
    const panel = document.getElementById('tutorial-center'); if (!panel.hidden) panel.innerHTML = tutorialCenter(tutor, sceneEmpty(), heldScene?.document.name);
    root.querySelector('.rail [data-action="tutorials"]')?.classList.toggle('has-news', tutor.news().length > 0);
  }
  /**
   * A lesson that builds from nothing, or on a copy of an example, runs on a practice scene: the person's own scene
   * is kept aside (its draft written first) and comes back with "Voltar" when the lesson ends. An empty scene is used as is.
   */
  let heldScene = null, practiceId = null, preparing = false;
  async function preparePractice(lesson, from) {
    const needs = lesson.needs; if (!needs || from > 0) return true;
    if (needs === 'empty' && sceneEmpty()) return true;
    // An example takes a moment to load: a second click on Começar meanwhile does nothing.
    if (saving || preparing) return false;
    let doc;
    preparing = true;
    try { doc = needs === 'empty' ? createScene(`Treino · ${lesson.title}`) : await loadExampleScene(needs.example); }
    catch (error) { notify(error.message, true); return false; }
    finally { preparing = false; }
    if (!(heldScene && store.document.id === practiceId)) { await flushDraft(); heldScene = { document: store.document, dirty: store.dirty }; }
    await stageCut.close();
    selection = null; clearProposal(); setTool('select'); practiceId = doc.id;
    store.replace(doc, { saved: false }); viewport.frameScene();
    const camera = Object.values(doc.cameraPresets ?? {})[0]; if (camera) viewport.setCamera(camera);
    notify(`Cena de treino aberta. Sua cena “${heldScene.document.name}” está guardada.`);
    return true;
  }
  function returnFromPractice() {
    if (!heldScene) return;
    const { document: doc, dirty } = heldScene; heldScene = null; practiceId = null;
    selection = null; clearProposal(); setTool('select');
    store.replace(doc, { saved: !dirty }); viewport.frameScene();
    const camera = Object.values(doc.cameraPresets ?? {})[0]; if (camera) viewport.setCamera(camera);
    tutor.dismiss(); flushDraft(); notify(`De volta à sua cena “${doc.name}”.`);
  }
  /** The closing card of a lesson offers the way back while the person's scene is kept aside. */
  const afterLesson = () => heldScene ? `<button type="button" class="primary" data-action="tutorial-return">Voltar para “${esc(heldScene.document.name)}”</button>` : '';
  function previewSurroundings() {
    try { const next = proposeSurroundings(store.document, { ...aroundOptions, floorId: smartFloorId }, store.editVersion, assets); next.aroundPreview = true; showAuthorshipProposal(next); }
    catch (error) { notify(error.message, true); }
  }
  function previewBuilding() {
    try {
      // Where it was drawn; otherwise beside what the scene already has.
      const standing = Object.values(store.document.layout.entities).filter(e => e.transform && ['floor', 'terrain'].includes(e.kind)), reach = e => Math.max(e.width, e.length) / 2, half = Math.max(buildingOptions.width, buildingOptions.length) / 2;
      const beside = side => [standing.length ? side > 0 ? Math.max(...standing.map(e => e.transform.position[0] + reach(e))) + 3 + half : Math.min(...standing.map(e => e.transform.position[0] - reach(e))) - 3 - half : 0, 0, 0];
      const { addTemplate, pick, ...options } = buildingOptions, propose = center => proposeBuilding(store.document, { ...options, floorId: buildingOptions.floorId || null, center }, store.editVersion, assets);
      let center = buildingOptions.center ?? beside(1), next = propose(center);
      // The entrance should open onto free ground, not onto what is already standing: when it would, the building goes to the other side.
      if (!buildingOptions.center && !buildingOptions.floorId && standing.length) { const door = next.entities.find(e => e.kind === 'door' && /entrada/i.test(e.name)), wall = door && next.entities.find(e => e.id === door.wallId); if (wall && Math.abs(wall.transform.position[0] + door.offset * Math.cos(yawFromQuaternion(wall.transform.rotation) * Math.PI / 180) - (center[0] - buildingOptions.width / 2)) < .4) { center = beside(-1); next = propose(center); } }
      next.buildingPreview = true;
      showAuthorshipProposal(next);
    } catch (error) { notify(error.message, true); }
  }
  function syncRoofs() {
    const shown = roofsChoice ?? !topView, node = root.querySelector('[data-action="roofs"]');
    viewport.setRoofsHidden(!shown); node.classList.toggle('active', shown); node.setAttribute('aria-pressed', String(shown));
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
    tool = next; viewport.setTool(next); holdSelectionBar(); if (previous === 'cable' && next !== 'cable') viewport.setPreview(null);
    root.querySelector('[data-action="tool-measure"]').setAttribute('aria-pressed', String(next === 'measure'));
    if (next === 'measure' && window.innerWidth <= 900) { root.querySelector('.app-shell').classList.add('sidebar-collapsed', 'inspector-collapsed'); syncPanelToggles(); }
    for (const node of root.querySelectorAll('[data-action=material-eyedropper]')) { node.classList.toggle('active', next === 'material-sample'); node.setAttribute('aria-pressed', String(next === 'material-sample')); }
    if (!['place', 'decal', 'cable'].includes(next)) placing = null;
    root.querySelectorAll('[data-action^="tool-"]').forEach((node) => node.classList.toggle('active', node.dataset.action === `tool-${next}`));
    document.getElementById('gesture-hint').textContent = next === 'measure' ? 'Régua · dois cliques ou arraste · Alt: livre · Esc/Q conclui' : next==='illumination-origin'?'Origem da luz · clique no objeto selecionado · Esc cancela':next === 'material-sample' ? 'Conta-gotas · clique para copiar o material · Esc cancela' : next === 'terrain' ? 'Pincel ativo · T/Q: seleção · [ ]: tamanho · Esc: cancelar traço' : next === 'polygon' ? 'Clique nos vértices · Enter conclui · Backspace remove · Esc cancela' : next === 'decal' ? 'Decalque · clique na superfície · Esc cancela' : next === 'window' ? 'Clique na parede para posicionar o centro da janela · Esc cancela' : next === 'room' ? 'Arraste no chão para desenhar a sala · Esc cancela' : next === 'place' ? `Clique no piso para colocar${placing?.repeat ? ' cópias' : ''} · Alt: posição livre · Esc/Q conclui` : 'WASD: câmera · Shift: rápido · Direito: órbita · Scroll: zoom';
    renderToolContext();
    if (tab === 'build' && (previous === 'polygon' || next === 'polygon')) renderSidebar();
    if (previous === 'terrain' || next === 'terrain') {renderInspector(); if(next==='terrain') document.getElementById('inspector-content').scrollTop=0;}
  }
  function renderToolContext() {
    const next=tool;
    const context=document.getElementById('tool-context'); context.hidden=['select','move','rotate','scale'].includes(next);
    if (next === 'measure') {
      context.innerHTML = `<span>Régua · metros</span>${checkField('ruler-snap', 'Encaixar no grid', rulerSnap)}<button data-action="ruler-clear" class="quiet">Limpar</button><button data-action="tool-select" class="quiet">Concluir · Q</button><output class="ruler-result" id="ruler-result" aria-live="off"></output>`;
      updateMeasurementResult(); return;
    }
    context.innerHTML=`<span>${esc(next==='illumination-origin'?'Origem da luz · clique no objeto selecionado':next==='material-sample'?'Conta-gotas · clique na superfície de origem':next==='terrain'?`Pincel · ${({push:'Projetar face',pull:'Recuar face',raise:'Elevar',lower:'Rebaixar',smooth:'Suavizar',flatten:'Nivelar',rock:'Rocha natural',paint:'Pintar camada',erase:'Apagar camada',water:'Água'})[terrainBrush.mode]} · ${terrainBrush.radius} m`:next==='polygon'?'Desenhar contorno':next==='room'?'Desenhar sala':next==='decal'?'Decalque · clique numa parede, piso ou objeto':`Colocar · ${placing?.asset?.name ?? placing?.name ?? 'objeto'}`)}</span>${next==='place' && placing?.assetPlacement ? checkField('asset-placement-repeat','Colocação repetida',placing.repeat) : ''}<button data-action=tool-select class=quiet>Concluir · Q</button>`;
  }
  function updateMeasurementResult() {
    const result = document.getElementById('ruler-result');
    if (!result) return;
    result.setAttribute('aria-live', measurement?.complete ? 'polite' : 'off');
    result.textContent = measurementText(measurement);
  }
  function beginAssetPlacement(asset) {
    if (!asset) { notify('Este asset não está disponível. Reabra a biblioteca.', true); return; }
    clearProposal();
    // A decal is glued to a face, not stood on the floor.
    if (asset.id === DECAL_ASSET) { placing = { type: 'decal' }; setTool('decal'); notify('Clique numa parede, piso ou objeto para colar o decalque. Esc cancela.'); return; }
    placing = { ...(asset.type === 'image'
      ? { type: 'token', name: asset.name.replace(/\.[^.]+$/, ''), color: '#e4b76f', assetRef: { id: asset.id, revision: asset.revision } }
      : { type: 'prop', asset }), assetPlacement: true, repeat: repeatAssetPlacement };
    if (placing.repeat && window.innerWidth <= 900) { root.querySelector('.app-shell').classList.add('sidebar-collapsed', 'inspector-collapsed'); syncPanelToggles(); }
    setTool('place');
    notify(`Clique no piso para colocar ${asset.name}.${placing.repeat ? ' Continue clicando para colocar cópias; Esc ou Q conclui.' : ''}`);
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
  // One end of a cable is where the click landed on a beam, a duct, a wall or the ceiling, or hangs from the walls above the floor.
  function placeCableEnd(hostId, point, normal) {
    if (placing?.type !== 'cable') return;
    const host = store.document.layout.entities[hostId], walls = Object.values(store.document.layout.entities).filter(e => e.kind === 'wall' && (e.floorIds ?? [e.surfaceId]).includes(hostId));
    const end = cableEndpoint({ point, normal, hostKind: host.kind, wallHeight: walls.length ? Math.max(...walls.map(w => w.height)) : 2.6 });
    if (!placing.from) {
      placing.from = end; viewport.setPreview({ entities: [createEntity('prop', { name: 'Ponta do cabo', assetRef: { id: CABLE_ASSET, revision: 1 }, footprint: [.2, .2], position: end, cable: cableDefaults({ mode: 'drop', span: [0, -.6, 0], strands: 1, sag: .1 }) })] });
      notify('Agora clique na segunda ponta do cabo. Esc cancela.'); return;
    }
    const asset = assets.find(a => a.id === CABLE_ASSET);
    try {
      const entity = createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, footprint: [.2, .2], ...cableBetween(placing.from, end), ...constructionSemantics() });
      placing.from = null; viewport.setPreview(null);
      if (execute('entity.add', { entity, snap: false })) { setTool('move'); selectObject(entity.id, false, { revealInspector: true }); }
    } catch (error) { notify(error.message, true); }
  }
  function placeAt({ position, surfaceId = null, snap }) {
    if (!placing) return;
    let newId;
    if (placing.type === 'token') {
      const pair = createToken({ name: placing.name, color: placing.color, assetRef: placing.assetRef ?? null, position, surfaceId, ...constructionSemantics() });
      // A portrait placed from now on stands as a cut-out figure; older tokens keep their look until the person turns it on.
      if (placing.assetRef) pair.token.figure = { ...FIGURE_DEFAULTS };
      if (store.document.layout.entities[surfaceId]?.levelId) pair.token.levelId = store.document.layout.entities[surfaceId].levelId;
      if (execute('token.add', { ...pair, snap })) newId = pair.token.id;
    } else if (placing.type === 'light') {
      const light = createLight({ type: placing.lightType ?? 'point', position: [position[0], position[1] + 2.2, position[2]], surfaceId, ...constructionSemantics() });
      if (execute('light.add', { light })) newId = light.id;
    } else if (placing.type === 'cable') {
      // Two clicks on the ground mark where the ends hang from; the height is the top of the walls of that room.
      const walls = Object.values(store.document.layout.entities).filter(e => e.kind === 'wall' && (e.floorIds ?? [e.surfaceId]).includes(surfaceId)), point = [position[0], position[1] + (walls.length ? Math.max(...walls.map(w => w.height)) : 2.6) - .04, position[2]];
      if (!placing.from) { placing.from = point; notify('Agora clique sob a segunda ponta do cabo. Esc cancela.'); return; }
      const asset = assets.find(a => a.id === CABLE_ASSET);
      try { const entity = createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, footprint: [.2, .2], ...cableBetween(placing.from, point), ...constructionSemantics() }); placing.from = null; if (execute('entity.add', { entity, snap: false })) newId = entity.id; }
      catch (error) { notify(error.message, true); return; }
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
      // A drip hangs from the ceiling of the room it is placed in and falls the whole way to the floor.
      if (placing.localEffect?.type === 'drip') {
        const walls = Object.values(store.document.layout.entities).filter(e => e.kind === 'wall' && (e.floorIds ?? [e.surfaceId]).includes(surfaceId)), top = (walls.length ? Math.max(...walls.map(w => w.height)) : 2.6) - .04;
        entity.transform.position[1] += top; entity.surfaceId = null; entity.localEffect.size[1] = top;
      }
      // From the library a cable arrives with its default span, hung at wall height; the settings are in Propriedades.
      if (asset.id === CABLE_ASSET) { entity.cable = cableDefaults(); entity.footprint = [.2, .2]; entity.surfaceId = null; entity.transform.position[1] += 2.56; }
      if (execute('entity.add', { entity, snap })) newId = entity.id;
    }
    if (newId) {
      const repeat = placing.repeat;
      if (!repeat) setTool('move');
      selectObject(newId, false, { revealInspector: !repeat });
      notify(repeat ? 'Cópia adicionada. Clique para colocar outra; Esc ou Q conclui. Ctrl+Z desfaz a última cópia.' : 'Adicionado à cena. Você pode mover, girar e editar.');
    }
  }
  const draftQueue=createLatestJob(({document:doc,dirty,meaningful})=>performanceDiagnostics.measureAsync('draft',()=>dirty&&meaningful?drafts.write(doc):drafts.clear()),error=>{if(!draftWarningShown){draftWarningShown=true;notify(`A recuperação automática não está disponível: ${error.message}. Use Salvar ou baixe o JSON pela Gestão da Mesa.`,true);}});
  function flushDraft() {
    clearTimeout(draftTimer);if(recovery)return;
    // A practice scene of a tutorial is not the person's work until saved: the draft keeps their own scene.
    if(heldScene&&store.document.id===practiceId&&store.document.revision===0)return;
    return draftQueue.push({document:store.document,dirty:store.dirty,meaningful:store.editVersion>0||store.document.revision>0});
  }
  const receivers=new Map();
  let broadcastPending=false,lastSentDocument,lastSentAssets;
  function sendPresentation(type, fields) {
    if(!channel)return;
    performanceDiagnostics.measure('broadcast',()=>channel.postMessage({version:1,type,sessionId,sequence:++sequence,...fields}));
    performanceDiagnostics.count('presentationMessages');
    if(performanceDiagnostics.enabled)performanceDiagnostics.count('presentationBytes',new TextEncoder().encode(JSON.stringify(fields)).byteLength);
  }
  function hasPresentation() {
    const now=Date.now();for(const [peer,seen] of receivers)if(now-seen>20_000)receivers.delete(peer);
    return receivers.size>0;
  }
  function sendSnapshot(force=false) {
    if(!force&&!hasPresentation()){performanceDiagnostics.count('broadcastsSkipped');return;}
    const fields={camera:publishedCamera??viewport.getCamera(),cameraSequence,cameraDuration:publishedDuration,cutaway,letterbox};
    if(!force&&lastSentDocument===store.document&&lastSentAssets===assets){sendPresentation('view',fields);return;}
    const doc=performanceDiagnostics.measure('presentationProjection',()=>projectPresentation(store.document));
    sendPresentation('snapshot',{...fields,document:doc,assets:presentationAssets(doc,assets)});
    lastSentDocument=store.document;lastSentAssets=assets;
  }
  function broadcast() {
    if(broadcastPending)return;broadcastPending=true;
    queueMicrotask(()=>{broadcastPending=false;sendSnapshot();});
  }
  channel?.addEventListener('message', event => {
    const data=event.data;if(data?.version!==1||data.sessionId!==sessionId)return;
    const peer=data.receiverId??'legacy';
    if(data.type==='ready'||data.type==='heartbeat'){const previous=receivers.get(peer);receivers.set(peer,Date.now());if(data.type==='ready'||!previous||Date.now()-previous>20000){sendSnapshot(true);inspectionControl.resend();}}
    if(data.type==='closed')receivers.delete(peer);
    scheduleViewTag();
  });
  setInterval(scheduleViewTag,5000);
  // At most one DOM update per frame, and only when the badge text changes.
  function scheduleViewTag() { if (!viewTagFrame) viewTagFrame = requestAnimationFrame(() => { viewTagFrame = 0; renderViewTag(); }); }
  function renderViewTag() {
    const connected = hasPresentation(), node = document.getElementById('view-tag'), state = viewState({ isPresentation, connected, working: viewport.getCamera(), published: publishedCamera });
    if (connected !== lastConnected) { lastConnected = connected; if (tab === 'shots') renderSidebar(); renderShotDock(); }
    if (node.dataset.state !== state.key) { node.dataset.state = state.key; node.title = state.title; node.disabled = state.key !== 'offset'; }
    const label = node.querySelector('span'); if (label.textContent !== state.text) label.textContent = state.text;
  }
  // A focus or follow target the players cannot see stays out of what the projector receives.
  function publicCamera(camera) {
    const doc = projectPresentation(store.document), seen = key => Boolean(doc.tokens?.[key] ?? doc.layout.entities[key]), next = clone(camera);
    if (next.focus?.targetId && !seen(next.focus.targetId)) next.focus.targetId = null;
    if (next.follow && !seen(next.follow.targetId)) delete next.follow;
    return next;
  }
  /**
   * Live camera on: the projector follows the working camera, smoothed, and the working camera itself moves like a
   * dolly (at least 55% smoothing), so every move the master makes is a shot. Off: the smoothing goes back to what it was.
   */
  let smoothingBeforeLive = null;
  function setLiveCamera(on) {
    if (on === liveCamera.enabled) return;
    liveCamera.enabled = on;
    if (on) { smoothingBeforeLive = navigationSmoothing; navigationSmoothing = Math.max(navigationSmoothing, .55); sendLiveCamera(); notify(hasPresentation() ? 'Câmera ao vivo: o projetor acompanha seus movimentos. Z/C orbitam, a roda aproxima, clique duplo olha para um ponto. L desliga.' : 'Câmera ao vivo ligada. Abra a segunda tela para ver.'); }
    else { if (smoothingBeforeLive !== null) navigationSmoothing = smoothingBeforeLive; smoothingBeforeLive = null; notify('Câmera ao vivo desligada: o projetor fica onde está.'); }
    viewport.setNavigationSmoothing(navigationSmoothing);
    const node = root.querySelector('[data-action="live-camera"]'); node?.classList.toggle('active', on); node?.setAttribute('aria-pressed', String(on));
    if (tab === 'shots') renderSidebar();
  }
  /** Explicitly switched on: the projector approaches the working camera, smoothed, at most once a frame. */
  function sendLiveCamera() {
    if (liveCameraFrame) return;
    liveCameraFrame = requestAnimationFrame(() => {
      liveCameraFrame = 0; if (!liveCamera.enabled || isPresentation) return;
      publishedCamera = publicCamera(viewport.getCamera()); publishedDuration = 0; publishedPresetId = null; cameraSequence++; scheduleViewTag();
      if (hasPresentation()) sendPresentation('live-camera', { camera: publishedCamera, cameraSequence, smoothing: liveCamera.smoothing, cutaway });
    });
  }
  /** A look being dragged or travelled to: global settings and the key light, which the projector lays over its scene. */
  function sendLiveLook(look) {
    if (!hasPresentation()) return;
    const key = primaryLight(look);
    sendPresentation('look', { look: Object.fromEntries(ENVIRONMENT_FIELDS.filter(field => look[field] !== undefined).map(field => [field, look[field]])), key: key && key.audience !== 'gm' ? key : null });
  }
  function toggleAmbience(open = !document.getElementById('ambience-window').open) {
    if (!open) { ambience?.finish(); ambienceWindow.close(); return; }
    ambience ??= createAmbience({ dialog: document.getElementById('ambience-window'), content: document.getElementById('ambience-content'), store, viewport, execute: (type, payload, options) => execute(type, payload, options),
      environments: () => savedEnvironments, sendLook: sendLiveLook, notify });
    ambienceWindow.open(); ambience.render();
  }
  function publishCamera(preset, duration = cameraDuration, presetId = null) {
    publishedCamera=publicCamera(preset);publishedDuration=duration;publishedPresetId=presetId;cameraSequence++;scheduleViewTag();
    if(hasPresentation())sendPresentation('camera',{camera:publishedCamera,cameraSequence,cameraDuration:duration,cutaway});
  }
  function cameraPanel() {
    const current = viewport.getCamera();
    return `<section><span class="eyebrow">CÂMERA CINEMATOGRÁFICA</span>
      <p class="microcopy">Clique na mesa e use WASD para viajar e Shift para acelerar. Na perspectiva, Espaço sobe e Ctrl desce; Ctrl+WASD navega com foco na mesa. Para Ctrl+S/D salvar/duplicar, dê foco a outro controle ou use os botões. Page Up/Down também alteram a altura. Arraste com o botão direito para orbitar; solte sem arrastar para selecionar. Roda aproxima.</p>
      ${numberField('camera-speed', 'Velocidade · m/s', cameraSpeed, { min: .2, max: 40, step: .2 })}
      ${numberField('camera-smoothing', 'Suavidade do movimento · %', Math.round(navigationSmoothing * 100), { min: 0, max: 100, step: 5 })}
      ${checkField('camera-tactical', 'Inclinar com o zoom · tático', tacticalZoom)}
      ${numberField('camera-fov', 'Lente · campo de visão em graus', current.fov, { min: 20, max: 90, step: 1 })}
      <label class="field"><span>Troca de enquadramento</span><select data-field="camera-duration">${[[0,'Corte imediato'],[.6,'Rápida · 0,6 s'],[1.2,'Suave · 1,2 s'],[2.5,'Dramática · 2,5 s'],[4,'Contemplativa · 4 s']].map(([duration,label]) => `<option value="${duration}" ${cameraDuration === duration ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <div class="field-grid">${button('camera-stop', 'Parar transição', 'close', 'quiet')}${button('camera-cut', 'Cortar agora', 'camera', 'quiet')}</div>
      <p class="microcopy">Enquadramentos salvos e publicação usam a duração escolhida. Parar conserva o ponto atual e publica; Cortar chega ao destino imediatamente. A navegação livre conserva a câmera do projetor.</p>
    </section>${cinemaPanel(current, cinemaTargets(current))}`;
  }
  // What the camera can focus on or follow: the characters, then the selected object.
  function cinemaTargets(camera) {
    const doc = store.document, picked = locate(), targets = Object.values(doc.tokens ?? {}).map(token => [token.id, doc.actors[token.actorId]?.name ?? 'Token']);
    if (picked?.type === 'entity') targets.push([picked.record.id, picked.record.name]);
    const names = Object.fromEntries([camera.focus?.targetId, camera.follow?.targetId].filter(Boolean).map(key => [key, doc.layout.entities[key]?.name ?? 'Objeto']));
    return { targets, names, live: liveCamera };
  }
  function renderSidebar() { const live=document.getElementById('side-content'),desired=live.cloneNode(true);desired.scrollTop=live.scrollTop;performanceDiagnostics.measure('sidebar',()=>{buildSidebar(desired);reconcileElement(live,desired);}); }
  function buildSidebar(panel) {
    root.querySelectorAll('.tabs [data-tab]').forEach((node) => { const active = node.dataset.tab === tab; node.classList.toggle('active', active); if (node.dataset.tab !== 'assets') node.setAttribute('aria-pressed', String(active)); });
    if (document.getElementById('assets-dialog').open) renderAssets();
    document.getElementById('drawer-title').textContent = TAB_TITLES[tab] ?? tab.toUpperCase();
    renderShotDock();
    const scroll = panel.scrollTop;
    const focused = panel.contains(document.activeElement) ? document.activeElement.dataset.field : null;
    if (['scene','elements','shots'].includes(panel.dataset.currentTab)) rememberDisclosures(panel, sceneDisclosures);
    panel.dataset.currentTab = tab;
    if (tab === 'build') {
      panel.innerHTML = `<section class="quick-section"><span class="eyebrow">QUICK BUILD</span>${button('room-draw', 'Desenhar sala', 'room', 'wide accent-outline')}<form id="quick-form"><div class="field-grid">${numberField('room-width', 'Largura interna · m', roomOptions.width, { min: 1.4 })}${numberField('room-length', 'Comprimento · m', roomOptions.length, { min: 1 })}</div>${numberField('room-height', 'Altura das paredes · m', roomOptions.height, { min: 2.2 })}<span class="section-caption">SUGESTÕES OPCIONAIS</span>${checkField('room-door', 'Incluir uma porta', roomOptions.door)}${checkField('room-lighting', 'Adicionar iluminação', roomOptions.lighting)}<button class="primary wide" type="submit">${icon('eye')} Ver prévia</button></form></section><section><span class="eyebrow">CONSTRUIR MANUALMENTE</span><div class="construction-grid">${button('floor-add', 'Piso', 'floor')}${button('wall-add', 'Parede', 'wall')}${button('door-add', 'Porta', 'door')}${button('light-place', 'Luz pontual', 'light')}${button('spot-place', 'Luz spot', 'light')}${button('fire-place', 'Fogueira', 'light')}${button('smoke-place', 'Fumaça', 'light')}${button('sparks-place', 'Faíscas', 'light')}${button('drip-place', 'Goteira', 'light')}${button('cable-place', 'Cabo', 'ruler', '', 'title="Cabos pendentes entre dois pontos: dois cliques no chão"')}${button('decal-place', 'Decalque', 'ruler', '', 'title="Clique numa parede, piso ou objeto"')}</div></section><section><span class="eyebrow">PERSONAGENS</span><label class="field"><span>Nome do token</span><input id="token-name" value="Investigador" maxlength="256" /></label><div class="token-controls"><input id="token-color" aria-label="Cor do token" type="color" value="#e4b76f" />${button('token-place', 'Colocar token', 'token', 'wide')}</div><p class="microcopy">Para usar um retrato, importe uma imagem na biblioteca.</p></section><section><span class="eyebrow">GRID E PRECISÃO</span>${checkField('grid-visible', 'Mostrar grid', store.document.layout.grid.visible)}${checkField('grid-snap', 'Encaixar no grid', store.document.layout.grid.snap)}${numberField('grid-size', 'Célula · m', store.document.layout.grid.cellSize, { min: .1 })}${choiceField('grid-diagonal', 'Movimento na diagonal', store.document.layout.grid.diagonal ?? 'euclidean', DIAGONAL_RULES)}</section>`;
      panel.innerHTML += constructionPanel(store.document, { surfaceId: activeSurfaceId, height: buildHeight, polygon: tool === 'polygon' });
      panel.innerHTML += levelsPanel(store.document, { levelId: activeLevelId, layerId: activeLayerId, isolated: isolatedLevel });
      panel.innerHTML += terrainPanel(terrainOptions);
      panel.innerHTML += landscapePanel(store.document,vegetationOptions,assets,{numberField});
      const insight = smartFloorId ? describeRoom(store.document, smartFloorId, assets) : null;
      if (insight?.inferred[0] && !currentComposition() && smartTemplateChosenFor !== smartFloorId) smartOptions.template = insight.inferred[0].id;
      if (buildingOptions.floorId && !store.document.layout.entities[buildingOptions.floorId]) buildingOptions.floorId = '';
      // One job at a time: extending when a room of a building is selected, a new building otherwise, unless the person chose.
      const inBuilding = Boolean(smartFloorId && describeBuilding(store.document, smartFloorId, assets)), buildingMode = buildingOptions.mode ?? (inBuilding ? 'extend' : 'new');
      let spots = null; if (smartFloorId && buildingMode === 'extend' && openBuildSections.has('building')) { try { spots = addRoomSpots(store.document, { floorId: smartFloorId, template: buildingOptions.addTemplate, seed: buildingOptions.seed }, assets); } catch { spots = null; } }
      panel.innerHTML += buildingPanel(store.document, buildingOptions, smartFloorId, spots, buildingMode);
      if (insight) { insight.building = describeBuilding(store.document, smartFloorId, assets); if (insight.building) { try { insight.building.plan = addRoomSpots(store.document, { floorId: smartFloorId, template: 'bathroom' }, assets).rooms; } catch { /* no plan to draw */ } } insight.mood = roomMood(store.document, smartFloorId, assets); insight.atmosphere = suggestAtmosphere(store.document, smartFloorId, assets); }
      panel.innerHTML += smartBuildPanel(store.document, smartOptions, smartFloorId, currentComposition(), insight, stateOptions, ambienceOptions);
      // What the building asks for around it, read the same way the proposal will.
      let around = null; if (smartFloorId) { const type = insight?.building?.type, era = roomEra(store.document, smartFloorId), id = inferSetting(type?.id, era); around = { id, name: SETTINGS.find(entry => entry.id === id).name, reason: id === 'rural' && era !== 'modern' && !['tavern', 'keep'].includes(type?.id) ? 'porque o prédio é de uma época antiga' : type ? `porque o prédio é ${type.name.toLowerCase()}` : '' }; }
      panel.innerHTML += surroundingsPanel(store.document, aroundOptions, smartFloorId, around);
      // Plain headings and one level of tasks: what is inside a task is visible as soon as it opens.
      taskList(panel, BUILD_TASKS, { attribute: 'buildSection', help: lessonForTask });
      for (const task of panel.querySelectorAll('[data-build-section]')) task.open = openBuildSections.has(task.dataset.buildSection);
    } else if (tab === 'elements') {
      const kinds = [['build','Estrutura'],['props','Objetos'],['lights','Luzes'],['tokens','Tokens']];
      panel.innerHTML = `<section class="elements-panel"><div class="tree-header"><input id="tree-search" type="search" placeholder="Buscar na cena" aria-label="Buscar elementos da cena" value="${esc(treeFilter.search)}" autocomplete="off" />${button('group-add', 'Pasta', 'plus', 'quiet', 'title="Nova pasta"')}</div><div class="chips tree-kinds" role="group" aria-label="Mostrar só um tipo">${kinds.map(([kind,label]) => `<button type="button" data-tree-kind="${kind}" aria-pressed="${treeFilter.kind===kind}" class="${treeFilter.kind===kind?'active':''}">${label}</button>`).join('')}</div><div id="scene-tree"></div></section><section><span class="eyebrow">DOCUMENTO</span>${button('duplicate-scene', store.document.documentType === 'map' ? 'Salvar como novo mapa' : 'Salvar como nova cena', 'copy', 'wide')}<p class="microcopy">Duplica também suas alterações locais, preservando os assets.</p></section>`;
      sectionDisclosure(panel.lastElementChild, 'document', 'Documento', false, 'Salvar uma cópia da cena').classList.add('task');
      restoreDisclosures(panel, sceneDisclosures);
      renderSceneTreeIfVisible(panel.querySelector('#scene-tree'));
    } else if (tab === 'shots') {
      const doc = store.document, connected = hasPresentation() || isPresentation;
      panel.innerHTML = `${shotsPanel(doc, { publishedId: publishedPresetId, rehearsedId, live: connected, thumbnails: camera => shotThumbnails.image(doc, camera, store.editVersion) })}${cameraPanel()}<section><span class="eyebrow">SEGUNDA TELA</span><p class="microcopy">O projetor é a janela que os jogadores veem. Ensaiar mexe só no seu editor; Transição e Corte publicam a tomada para o projetor.</p>${button('presentation-window', 'Abrir segunda tela', 'display', 'wide accent-outline')}${button('publish-camera', 'Publicar câmera atual', 'camera', 'wide quiet')}</section><section><span class="eyebrow">CARTELA DE TÍTULO</span><label class="field"><span>Título</span><input type="text" data-field="title-card-title" value="${esc(titleCard.title)}" placeholder="${esc(doc.name)}" maxlength="120" autocomplete="off" /></label><label class="field"><span>Subtítulo</span><input type="text" data-field="title-card-subtitle" value="${esc(titleCard.subtitle)}" maxlength="120" autocomplete="off" /></label>${numberField('title-card-duration', 'Duração · s', titleCard.duration, { min: 2, max: 12, step: 1 })}${button('title-card', 'Mostrar no projetor', 'display', 'wide primary', connected && !isPresentation ? '' : 'disabled')}${checkField('projector-letterbox', 'Barras de cinema · 2,39:1', letterbox)}<p class="microcopy">A cartela aparece sobre a imagem do projetor e some sozinha. Nada disso é salvo na cena.</p></section>`;
      panel.innerHTML += initiativePanel(doc, { camera: initiativeCamera, extra: areasPanel(doc, areaTool, tool === 'area') + `<div class="combat-areas"><span class="tt-tag is-small">Interativos</span>${button('highlight-interactives', 'Destacar interativos (H)', 'eye', 'wide quiet')}<p class="microcopy">Contorna por 3 segundos portas e objetos marcados como interativos, no editor e no projetor.</p></div>` });
      panel.innerHTML += cluePanel(doc, { onProjector: inspectionControl.onProjector, connected: hasPresentation() && !isPresentation });
      taskList(panel, SHOTS_TASKS, { help: lessonForTask });
      restoreDisclosures(panel, sceneDisclosures);
      shotThumbnails.request(doc, store.editVersion);
    } else {
      const currentLook = store.document.look ?? store.document.defaultLook;
      panel.innerHTML = `${environmentPanel(store.document, savedEnvironments, selectedEnvironmentId, openAtmosphereSections, { numberField, colorField, checkField })}${atmospherePanel(currentLook, effectsEnabled, { numberField, colorField, checkField }, openAtmosphereSections,lightingQuality,lightingBudget)}`;
      taskList(panel, SCENE_TASKS, { help: lessonForTask });
      restoreDisclosures(panel, sceneDisclosures);
    }
    if (focused) panel.querySelector(`[data-field="${focused}"]`)?.focus({ preventScroll: true });
    panel.scrollTop = scroll;
  }
  function renderAssets() {
    const panel = document.getElementById('assets-content'), scroll = panel.scrollTop;
    panel.innerHTML = assetLibraryPanel(assets, libraryFilters, repository.storage, repeatAssetPlacement); renderAssetCards(); panel.scrollTop = scroll;
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
  /** The bulb of a folder or a record: 'on', 'off', 'mixed' (a folder with both), or nothing when there is no light. */
  function lightSwitchButton(state, attributes, what) {
    if (state === null || state === 'none') return '';
    const key = state === true ? 'on' : state === false ? 'off' : state;
    return `<button type="button" class="light-switch ${key}" ${attributes} data-state="${key}" aria-pressed="${key !== 'off'}" title="${key === 'off' ? `Acender ${what}` : `Apagar ${what}`}${key === 'mixed' ? ' (algumas estão apagadas)' : ''}">${icon('light', 12)}</button>`;
  }
  function renderSceneTreeIfVisible(tree=document.getElementById('scene-tree')) {
    if (!tree) return;
    const doc = store.document;
    const groups = Object.values(doc.layout?.groups || {});
    const entities = Object.values(doc.layout?.entities || {});
    const tokens = Object.values(doc.tokens || {});
    const lights = Object.values(doc.look?.lights || doc.defaultLook?.lights || {});
    // The floor name says it already when the scene has a single floor.
    const manyLevels = Object.keys(doc.layout?.levels || {}).length > 1;
    const search = treeFilter.search.trim().toLocaleLowerCase('pt-BR'), filtering = Boolean(search) || treeFilter.kind !== 'all';
    const kindOf = entry => entry.actorId ? 'tokens' : lights.includes(entry) ? 'lights' : entry.kind === 'prop' ? 'props' : 'build';

    const renderEntry = (entry) => {
      const typeGlyph = entry.kind === 'floor' ? 'floor' : entry.kind === 'wall' ? 'wall' : entry.kind === 'door' ? 'door' : entry.actorId ? 'token' : entry.type ? 'light' : 'room';
      const name = entryName(doc, entry);
      const avatar = entry.actorId ? actorAvatar(portraitOf(doc.actors?.[entry.actorId])) : '';
      return `<div draggable="true" data-drag-id="${entry.id}" data-select="${entry.id}" class="tree-entry ${selectedIds.has(assemblyFor(doc,entry.id)?.id ?? entry.id) ? 'selected' : ''}">
        ${avatar || icon(typeGlyph, 14)}
        <span class="tree-label" title="${esc([name, doc.layout.levels?.[entry.levelId]?.name, doc.layout.layers?.[entry.layerId]?.name].filter(Boolean).join(' · '))}">${esc(name)}${filtering && entry.groupId && doc.layout.groups?.[entry.groupId] ? `<small>${esc(doc.layout.groups[entry.groupId].name)}</small>` : ''}</span>${manyLevels && entry.levelId && doc.layout.levels?.[entry.levelId] ? `<small title="Andar">${esc(doc.layout.levels[entry.levelId].name)}</small>` : ''}
        ${entry.audience === 'gm' ? '<small>GM</small>' : ''}${lightSwitchButton(recordLightOn(entry), `data-entry-light="${entry.id}"`, 'a luz')}
        <div class="tree-entry-actions">
          <button type="button" class="tree-action-btn" data-tree-rename="${entry.id}" title="Renomear">${icon('edit', 12)}</button>
          <button type="button" class="tree-action-btn" data-tree-menu="${entry.id}" title="Mais opções">${icon('dots', 12)}</button>
        </div>
      </div>`;
    };

    let html = '';
    if (filtering) {
      const found = [...entities, ...tokens, ...lights].filter(entry => (treeFilter.kind === 'all' || kindOf(entry) === treeFilter.kind) && (!search || entryName(doc, entry).toLocaleLowerCase('pt-BR').includes(search)));
      tree.innerHTML = found.length ? `<div class="tree-section-title">${found.length} ${found.length === 1 ? 'elemento' : 'elementos'}</div><div class="tree-group-items">${found.map(renderEntry).join('')}</div>` : '<p class="microcopy">Nenhum elemento encontrado.</p>';
      return;
    }

    if (groups.length > 0) {
      const renderGroup = group => {
        const groupEntities = [...entities, ...tokens, ...lights].filter(e => e.groupId === group.id);
        const collapsed = collapsedTreeGroups.has(group.id) && !groupEntities.some(e => selectedIds.has(e.id));
        return `<div class="tree-group ${collapsed ? 'collapsed' : ''}" data-drop-group="${group.id}">
          <div class="tree-group-header" data-group-id="${group.id}">
            <button type="button" class="tree-collapse" data-group-collapse="${group.id}" aria-expanded="${!collapsed}" title="${collapsed ? 'Abrir pasta' : 'Recolher pasta'}">${icon('chevron', 12)}</button>${icon('folder', 14)}
            ${group.anchored ? `<button class="group-title" data-action="assembly-select" data-id="${group.id}" title="Selecionar composição">${esc(group.name)} · ancorada</button>` : `<span class="group-title" title="${esc(group.name)}">${esc(group.name)}</span>`}
            ${lightSwitchButton(switchState(doc, { groupId: group.id }), `data-group-lights="${group.id}"`, 'as luzes da pasta')}<div class="group-actions">
              <button type="button" data-group-visible="${group.id}" title="${group.visible === false ? 'Mostrar pasta' : 'Ocultar pasta'}">${icon('eye', 12)}</button>
              <button type="button" data-group-lock="${group.id}" title="${group.locked ? 'Desbloquear pasta' : 'Bloquear pasta'}">${group.locked ? '🔒' : '🔓'}</button>
              <button type="button" data-group-rename="${group.id}" title="Renomear pasta">${icon('edit', 12)}</button>
              <button type="button" data-group-delete="${group.id}" title="Excluir pasta">${icon('trash', 12)}</button>
            </div>
          </div>
          ${group.anchored ? `<button class="assembly-release wide quiet" data-action="assembly-unbind" data-id="${group.id}">Desancorar objetos</button>` : ''}<div class="tree-group-items" data-drop-group="${group.id}" ${collapsed ? 'hidden' : ''}>
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
  const heroActions = (inspectable = false) => `<div class="hero-actions">${inspectable ? button('inspect-open', '', 'search', 'icon-button', 'data-tip="Inspecionar" data-tip-side="top" data-key="Clique duplo" aria-label="Inspecionar"') : ''}${button('object-copy', '', 'copy', 'icon-button', 'data-tip="Copiar" data-tip-side="top" data-key="Ctrl+C" aria-label="Copiar"')}${button('frame-selection', '', 'frame', 'icon-button', 'data-tip="Enquadrar" data-tip-side="top" data-key="F" aria-label="Enquadrar"')}${button('object-duplicate', '', 'layers', 'icon-button', 'data-tip="Duplicar" data-tip-side="top" data-key="Ctrl+D" aria-label="Duplicar"')}${button('object-delete', '', 'trash', 'icon-button danger', 'data-tip="Excluir" data-tip-side="top" data-key="Delete" aria-label="Excluir"')}</div>`;
  // What a director does with a character: a close-up, keeping the camera on it, its flashlight.
  const tokenCameraActions = token => {
    const following = viewport.cinemaInfo().follow === token.id, lit = Boolean(token.flashlight?.enabled);
    return `<div class="hero-actions hero-camera">${button('token-closeup', 'Close', 'camera', 'quiet', 'data-tip="Close no personagem com o fundo desfocado" data-tip-side="top"')}${button('token-follow', following ? 'Seguindo' : 'Seguir', 'eye', `quiet${following ? ' active' : ''}`, `aria-pressed="${following}" data-tip="A câmera acompanha o personagem" data-tip-side="top"`)}${button('token-flashlight', 'Lanterna', 'light', `quiet${lit ? ' active' : ''}`, `aria-pressed="${lit}" data-tip="Acender ou apagar a lanterna do personagem" data-tip-side="top"`)}</div>`;
  };
  /** Frame a character from the front at chest height, three-quarters, long lens, background out of focus. Rehearsed: publish to show it. */
  function closeUp(tokenId) {
    const token = store.document.tokens?.[tokenId], point = token && viewport.pointOf(tokenId);
    if (!point) { notify('O personagem não está visível nesta vista.', true); return; }
    // Three-quarters from the front first; a wall or a pillar in the way sends the camera round to the next free side.
    const chest = new Vector3(...point), sides = closeUpSpots(point, yawFromQuaternion(token.transform.rotation) * Math.PI / 180).map(spot => ({ spot: new Vector3(...spot), free: viewport.clearance(point, spot, tokenId) }));
    const best = sides.find(side => side.free > .97) ?? sides.reduce((a, b) => b.free > a.free ? b : a);
    const position = best.free > .97 ? best.spot : chest.clone().lerp(best.spot, Math.max(.35, best.free * .85));
    viewport.setCamera({ projection: 'perspective', position: position.toArray(), target: chest.toArray(), fov: 30, focus: { enabled: true, targetId: tokenId, distance: position.distanceTo(chest), aperture: .6 } }, { duration: cameraDuration || 1.2 });
    notify(liveCamera.enabled ? 'Close no personagem, ao vivo no projetor.' : 'Close no personagem. Publique a câmera ou salve como tomada para mostrar no projetor.');
    if (tab === 'shots') renderSidebar();
  }
  /** The strip of turns over the stage, while a combat is on. */
  function renderInitiativeStrip(doc) {
    const node = document.getElementById('initiative-strip'), html = isPresentation ? initiativeStrip(projectPresentation(doc), tokenPortrait) : initiativeStrip(doc, tokenPortrait);
    if (node.innerHTML !== html) node.innerHTML = html; node.hidden = !html;
  }
  const tokenPortrait = tokenId => { const token = store.document.tokens?.[tokenId]; return token ? portraitOf({ assetRef: token.visualOverride?.assetRef ?? store.document.actors?.[token.actorId]?.assetRef }) : null; };
  /** Pass the turn; with the option on, the camera glides to look at whoever has it. */
  function passTurn(step) {
    const initiative = store.document.sessionState?.initiative; if (!initiative) return;
    const next = stepInitiative(initiative, step);
    if (!execute('initiative.update', { initiative: next }, { label: step > 0 ? 'Próximo turno' : 'Turno anterior' })) return;
    const tokenId = next.order[next.current]?.tokenId, point = tokenId && initiativeCamera ? viewport.pointOf(tokenId) : null;
    if (point) viewport.glideTo(point);
  }
  // The portrait of an actor is the image asset it points to, if any.
  const portraitOf = actor => { const asset = actor?.assetRef ? assets.find(item => item.id === actor.assetRef.id) : null; return asset && (asset.type === 'image' || asset.previewUrl) ? asset.previewUrl ?? asset.url : null; };
  function inspectorHero(found, name, doc) {
    if (found.type === 'token') return actorHero(doc.actors[found.record.actorId], found.record, portraitOf(doc.actors[found.record.actorId]), heroActions() + tokenCameraActions(found.record));
    const { record } = found, meta = [doc.layout.levels?.[record.levelId]?.name, doc.layout.groups?.[record.groupId]?.name].filter(Boolean).join(' · ');
    return `<div class="object-title inspector-hero"><span class="hero-tags"><span class="tt-tag is-small">${kindLabel(found)}</span>${record.audience === 'gm' ? '<span class="tt-tag is-small is-gm">SÓ MESTRE</span>' : ''}</span><strong class="tt-display">${esc(name)}</strong>${meta ? `<small class="hero-meta">${esc(meta)}</small>` : ''}${heroActions(record.kind === 'prop' && !record.decal && !record.cable)}</div>`;
  }
  function selectInspectorTab(id) {
    const panel = document.getElementById('inspector-content'), found = locate();
    if (!found) return;
    inspectorTab.set(found.type === 'entity' ? found.record.kind : found.type, id);
    for (const node of panel.querySelectorAll('[data-inspector-tab]')) node.hidden = node.dataset.inspectorTab !== id;
    for (const button of panel.querySelectorAll('[data-inspector-tab-button]')) { const on = button.dataset.inspectorTabButton === id; button.setAttribute('aria-selected', String(on)); button.tabIndex = on ? 0 : -1; button.classList.toggle('active', on); }
    panel.scrollTop = 0;
  }
  function renderInspector() {
    holdSelectionBar();
    const live=document.getElementById('inspector-content'),desired=live.cloneNode(true),previous=live.dataset.objectId;
    performanceDiagnostics.measure('inspector',()=>{buildInspector(desired);reconcileElement(live,desired);});
    if(previous!==live.dataset.objectId)live.scrollTop=0;
  }
  function buildInspector(panel) {
    if (!selection) anchorEditing = false;
    if (anchorEditing && !store.document.layout.entities[anchorHostId]) anchorHostId = '';
    if (anchorEditing) { panel.innerHTML = anchoringPanel(store.document, [...selectedIds], anchorHostId); return; }
    if (selection && !selectedIds.has(selection)) selectedIds = new Set([selection]);
    if (!selection) selectedIds.clear();
    if (selectedIds.size > 1) { panel.innerHTML = `<div class="object-title inspector-hero"><span class="hero-tags"><span class="tt-tag is-small">SELEÇÃO</span></span><strong class="tt-display">${selectedIds.size} objetos</strong></div><section><span class="eyebrow">UNIR OBJETOS</span><button class="wide primary" data-action="assembly-bind">Ancorar objetos juntos</button><p class="microcopy">Cria uma composição que se seleciona, move e gira como uma unidade. Desancore pela pasta para editar os objetos individualmente.</p></section>` + ([...selectedIds].every(objectId => store.document.layout.entities[objectId]?.material && store.document.layout.entities[objectId].water?.state !== 'water') ? `<section><span class=eyebrow>MATERIAIS DA SELEÇÃO</span>${materialTransferControls()}</section>` : '') + polishPanel(selectedIds.size, polishOptions, store.document); viewport.setSelection(selection, [...selectedIds]); return; }
    const found = locate();
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
      panel.innerHTML=`<div class="object-title inspector-hero"><span class="hero-tags"><span class="tt-tag is-small">COMPOSIÇÃO</span></span><strong class="tt-display">${esc(record.name)}</strong><small class="hero-meta">Ancorada · ${members.length} objetos</small></div><label class="field"><span>Nome da pasta</span><input data-field="assembly-name" value="${esc(record.name)}" maxlength="256"/></label><p class="microcopy">Clique em qualquer membro para selecionar todos. Mover (G), Rotacionar (R) e Escalar (S) atuam na composição inteira.</p><section><span class="eyebrow">POSIÇÃO DA COMPOSIÇÃO</span><div class="axis-fields">${t.position.map((value,i) => numberField(`assembly-position-${i}`,['X','Y · altura','Z'][i],value)).join('')}</div>${numberField('assembly-yaw','Rotação Y · graus',yawFromQuaternion(t.rotation),{ step:15 })}${numberField('assembly-size','Tamanho uniforme',t.scale[0],{ min:.01 })}</section><details><summary>Objetos da composição</summary><ul>${members.map(member => `<li>${esc(entryName(doc,member))}</li>`).join('')}</ul></details><button class="wide" data-action="assembly-unbind" data-id="${record.id}">Desancorar objetos</button><p class="microcopy">Desancorar conserva as posições e a pasta; seus objetos voltam a ser selecionados individualmente.</p><div class="object-actions">${button('object-copy','Copiar','copy')}${button('object-duplicate','Duplicar','copy')}${button('object-delete','Excluir','trash','danger')}</div>`;
      organizeInspector();
      if (focused) panel.querySelector(`[data-field="${focused}"]`)?.focus({ preventScroll: true });
      panel.scrollTop = scroll;
      return;
    }

    const actor = type === 'token' ? doc.actors[record.actorId] : null;
    const name = actor?.name ?? record.name;
    const position = record.transform?.position ?? record.position;
    const nameField = `<label class="field"><span>Nome</span><input data-field="object-name" value="${esc(name)}" maxlength="256" /></label>`, nameInOrganization = record.kind !== 'terrain';
    let fields = inspectorHero(found, name, doc) + (nameInOrganization ? '' : nameField);
    if(isSculptableRock(record)) {
      if (!ROCK_SCULPT_MODES.includes(terrainBrush.mode)) { terrainBrush.mode = 'raise'; viewport.setTerrainBrush(terrainBrush); }
      fields+=rockSculptPanel(record,terrainBrush,tool==='terrain',{numberField,presetsPanel:personalBrushes('rock')});
    }
    if (record.kind === 'terrain') {
      if(!record.paintLayers?.length) terrainMaterialTarget='base';
      if (!record.paintLayers?.some(layer => layer.id === terrainBrush.layerId)) terrainBrush.layerId = record.paintLayers?.[0]?.id ?? '';
      viewport.setTerrainBrush(terrainBrush);
      const basePanel = `<details class=terrain-base-material data-disclosure=terrain-base-material ${terrainMaterialTarget === 'base' ? 'open' : ''}><summary>Material base · terreno inteiro</summary><p class=scope-hint>Edite aqui a textura base e os ajustes gerais do terreno. Para alterar somente uma camada, escolha-a no seletor acima. Relevo e cobertura são compartilhados.</p>${materialPanel(record, viewport.getMaterialSlots(record.id), { numberField, colorField })}</details>`;
      fields += terrainInspector(record, terrainBrush, Math.min(terrainCell, record.heights.length - 1), tool === 'terrain', terrainAdvancedOpen, terrainMaterialTarget !== 'base', terrainResizeMode, terrainMaterialTarget, basePanel, materialTransferControls(record), personalBrushes('terrain'));
    }
    if(record.kind==='water') fields+=waterPanel(record,{numberField,colorField},store.document);
    if (record.kind === 'floor') fields += `<section><span class="eyebrow">ABERTURAS E PAREDES</span><button data-action="floor-hole" class="wide">Recortar piso · vão de escada / pátio</button><p class="microcopy">Clique nos cantos do vão dentro deste piso; Enter conclui. O recorte atravessa sua espessura.</p><button data-action="contour-walls" class="wide">Criar paredes do contorno</button><p class="microcopy">Revise antes de aceitar. Paredes de bordas compartilhadas são reaproveitadas; encontros em L e T se ajustam automaticamente.</p></section>`;
    if (record.kind === 'terrain') fields += `<details data-disclosure="terrain-object-settings" ${terrainObjectSettingsOpen ? 'open' : ''}><summary>Posição, organização e apresentação</summary>`;
    if (position) {
      fields += `<section><span class="eyebrow">POSIÇÃO · METROS</span><div class="axis-fields">${position.map((value, axis) => numberField(`position-${axis}`, ['X', 'Y · altura', 'Z'][axis], value)).join('')}</div>${numberField('object-yaw', 'Rotação Y · graus', type === 'light' ? new Euler().setFromQuaternion(new Quaternion(...record.rotation), 'YXZ').y * 180 / Math.PI : yawFromQuaternion(record.transform.rotation), { step: 15 })}</section>`;
    }
    if (type === 'entity' || type === 'token' || type === 'light') {
      fields += `<section><span class="eyebrow">ORGANIZAÇÃO</span>${nameInOrganization ? nameField : ''}<label class="field"><span>Pasta / Grupo</span><select data-field="entity-group"><option value="">(Sem pasta / Raiz)</option>${Object.values(doc.layout.groups).map((g) => `<option value="${g.id}" ${record.groupId === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label></section>`;
    }
    if (record.transform && !record.decal) fields += `<section><span class="eyebrow">SUPERFÍCIE DE APOIO</span><label class="field"><span>Apoio</span><select data-field="object-surface"><option value="">Sem vínculo</option>${Object.values(doc.layout.entities).filter(e => e.id !== record.id && isSupport(e)).map(e => `<option value="${e.id}" ${record.surfaceId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>${record.kind === 'prop' ? checkField('prop-support', 'Oferecer superfície de apoio', Boolean(record.supportHeight)) + (record.supportHeight ? numberField('supportHeight', 'Altura local do apoio · m', record.supportHeight, { min: .01 }) : '') : ''}</section>`;
    fields += `<section><span class="eyebrow">ANDAR / CAMADA</span>${[['object-level','Andar','levels','levelId'],['object-layer','Camada','layers','layerId']].map(([field,label,collection,key]) => `<label class="field"><span>${label}</span><select data-field="${field}"><option value="">Sem vínculo</option>${Object.values(doc.layout[collection] ?? {}).map(entry => `<option value="${entry.id}" ${record[key] === entry.id ? 'selected' : ''}>${esc(entry.name)}</option>`).join('')}</select></label>`).join('')}</section>`;

    if (record.kind === 'floor' && record.holes?.length) fields += `<section><span class="eyebrow">RECORTES DO PISO</span>${record.holes.map((ring,h) => `<details><summary>Furo ${h + 1} · ${ring.length} vértices</summary>${ring.map((p,i) => `<div class="field-grid">${numberField(`hole-${h}-${i}-0`,'X local',p[0])}${numberField(`hole-${h}-${i}-1`,'Z local',p[1])}</div>`).join('')}<button data-action="hole-remove" data-index="${h}">Remover recorte</button></details>`).join('')}</section>`;
    if (isAccess(record)) fields += `<section><span class="eyebrow">ANDARES CONECTADOS</span>${[['fromLevelId','Origem'],['toLevelId','Destino']].map(([field,label]) => `<label class="field"><span>${label}</span><select data-field="${field}"><option value="">Sem associação</option>${Object.values(doc.layout.levels ?? {}).map(l => `<option value="${l.id}" ${record[field] === l.id ? 'selected' : ''}>${esc(l.name)} · ${l.elevation} m</option>`).join('')}</select></label>`).join('')}<p class="microcopy">Quando os dois andares estão associados, base e desnível acompanham suas alturas.</p></section>`;
    if (!record.decal && (record.kind === 'prop' || type === 'light' && ['point', 'spot'].includes(record.type))) fields += `<section><span class="eyebrow">FIXAR EM PAREDE / TETO</span><p class="microcopy">Escolha uma parede ou o piso do andar de cima. O objeto ficará junto à face escolhida e acompanhará seus movimentos. Para vários objetos, use Shift+seleção e botão direito → Fixar em parede / teto….</p><label class="field"><span>Fixar em</span><select data-field="object-anchor"><option value="">Livre</option>${Object.values(doc.layout.entities).filter(e => ['wall','floor'].includes(e.kind)).map(e => { const socket = e.kind === 'wall' ? 'wall' : 'ceiling'; return `<option value="${socket}:${e.id}" ${record.anchor?.hostId === e.id && record.anchor.socket === socket ? 'selected' : ''}>${socket === 'wall' ? 'Parede' : 'Teto sob piso'} · ${esc(e.name)}</option>`; }).join('')}</select></label>${record.anchor ? `<div class="axis-fields">${record.anchor.offset.map((v,i) => numberField(`anchor-${i}`,['X local','Y local','Z local'][i],v)).join('')}</div><p class="microcopy">O objeto acompanha posição e rotação da parede ou piso escolhido. Escolha Livre para soltá-lo. Teto usa a face inferior do piso superior.</p>` : ''}</section>`;
    if (record.vertices) fields += `<section><span class="eyebrow">CONTORNO LOCAL · X/Z</span>${record.vertices.map((p, i) => `<div class="field-grid">${numberField(`polygon-${i}-0`, `V${i + 1} · X`, p[0])}${numberField(`polygon-${i}-1`, `V${i + 1} · Z`, p[1])}</div>`).join('')}<p class="microcopy">O contorno não pode cruzar a si mesmo. Dimensões ajustam os vértices proporcionalmente.</p></section>`;
    if (record.kind === 'floor') fields += `<section><span class="eyebrow">DIMENSÕES · METROS</span><div class="field-grid">${numberField('width', 'Largura', record.width, { min: .1 })}${numberField('length', 'Comprimento', record.length, { min: .1 })}</div>${numberField('thickness', 'Espessura', record.thickness, { min: .01 })}</section>`;
    if (isAccess(record)) fields += `<section><span class="eyebrow">ACESSO ENTRE ALTURAS</span><div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .1 })}${numberField('length', 'Comprimento · m', record.length, { min: .1 })}</div>${numberField('height', 'Desnível · m', record.height, { min: .1 })}${record.kind === 'stairs' ? numberField('steps', 'Degraus', record.steps, { min: 1, max: 128, step: 1 }) : ''}<p class="microcopy">A base fica na altura Y; o acesso sobe no sentido Z local positivo. Use Rotacionar (R) para orientar e escolha este apoio para colocar tokens sobre ele.</p></section>`;
    if (record.kind === 'wall') fields += `<section><span class="eyebrow">DIMENSÕES · METROS</span>${numberField('length', 'Comprimento', record.length, { min: .1 })}${numberField('height', 'Altura', record.height, { min: .1 })}${numberField('thickness', 'Espessura', record.thickness, { min: .01 })}<p class="microcopy">Portas e janelas acompanham esta parede. Reduzir o comprimento exige manter as aberturas válidas.</p></section>`;
    if (record.kind === 'door') fields += `<section><span class="eyebrow">ABERTURA NA PAREDE</span>${numberField('offset', 'Posição na parede · m', record.offset, { min: 0 })}<div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .2 })}${numberField('height', 'Altura · m', record.height, { min: .2 })}</div>${numberField('door-angle', 'Ângulo atual · graus', (doc.sessionState?.doors?.[record.id] ?? record.initialAngle) * 180 / Math.PI, { step: 15 })}<label class="field"><span>Dobradiça</span><select data-field="hinge"><option value="left" ${record.hinge === 'left' ? 'selected' : ''}>Esquerda</option><option value="right" ${record.hinge === 'right' ? 'selected' : ''}>Direita</option></select></label>${button('door-toggle', 'Abrir / fechar · E', 'door', 'wide')}<p class="microcopy">O vão pertence à parede. A folha pode ser aberta sem alterar o mapa.</p></section>`;
    if (record.kind === 'window') fields += `<section><span class="eyebrow">JANELA HOSPEDADA</span><p class="microcopy">Com Mover (G), arraste a janela na parede. Alt permite ajuste livre. O recorte acompanha a janela.</p><label class="field"><span>Parede</span><select data-field="window-wall">${Object.values(doc.layout.entities).filter(e => e.kind === 'wall').map(e => `<option value="${e.id}" ${record.wallId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>${numberField('offset', 'Posição na parede · m', record.offset, { min: 0 })}<div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .1 })}${numberField('height', 'Altura · m', record.height, { min: .1 })}</div>${numberField('sill', 'Peitoril · m', record.sill, { min: 0 })}<label class="field"><span>Representação</span><select data-field="style"><option value="glass" ${record.style === 'glass' ? 'selected' : ''}>Vidro</option><option value="bars" ${record.style === 'bars' ? 'selected' : ''}>Grades</option><option value="open" ${record.style === 'open' ? 'selected' : ''}>Vão livre</option></select></label></section>`;
    if (type === 'token' || record.kind === 'prop' && !record.decal) fields += `<section><span class="eyebrow">ESCALA VISUAL</span><div class="axis-fields">${record.transform.scale.map((value, axis) => numberField(`scale-${axis}`, ['X', 'Y', 'Z'][axis], value, { min: .01 })).join('')}</div>${type === 'token' ? `<span class="eyebrow">BASE · METROS</span><div class="field-grid">${numberField('footprint-0', 'Largura', record.footprint[0], { min: .1 })}${numberField('footprint-1', 'Profundidade', record.footprint[1], { min: .1 })}</div>${colorField('token-color', 'Cor do personagem', actor.color)}` : ''}</section>`;
    if (record.material && record.kind !== 'terrain' && record.water?.state!=='water' && (!record.decal || record.decal.kind === 'surface')) fields += materialPanel(record, viewport.getMaterialSlots(record.id), { numberField, colorField, transferControls: materialTransferControls(record) });
    if(record.kind==='prop' && isVegetationAsset(record.assetRef.id)) fields+=`<section><span class="eyebrow">VEGETAÇÃO · GEOMETRIA</span>${numberField('vegetationSeed','Variação geométrica',record.vegetationSeed??0,{min:0,max:65535,step:1})}<p class="microcopy">Varia ramificação e folhagem, preservando o tamanho e a base. Escala e rotação continuam independentes.</p></section>`;
    const imageAssets = assets.filter(asset => asset.type === 'image');
    if (record.kind === 'prop') fields += rockPanel(record,{numberField}) + cablePanel(record) + screenPanel(record, viewport.getMaterialSlots(record.id), imageAssets, { numberField, colorField, checkField, choiceField }) + inspectablePanel(record, viewport.getMaterialSlots(record.id), imageAssets, { numberField, checkField, choiceField }) + decalPanel(record, doc.layout.entities[record.anchor?.hostId], imageAssets, { numberField, colorField, checkField, choiceField });
    if (record.kind === 'prop' && !record.decal) fields += localEffectPanel(record, { numberField, colorField, checkField });
    if(record.material && !record.decal){fields+=illuminationPanel(record,viewport.getMaterialSlots(record.id),lightPresets,selectedLightPreset,{numberField,colorField,checkField});fields+=zonePanel(record,{numberField,colorField,checkField});}
    if (type === 'entity' && ['prop', 'window'].includes(record.kind) && !record.decal) fields += `<section><span class="eyebrow">INTERAÇÃO</span>${checkField('entity-interactive', 'Interativo · aparece ao destacar (H)', Boolean(record.interactive))}</section>`;
    if (type === 'light') fields += lightPanel(record, { numberField, colorField, checkField });
    if (type === 'token') fields += `<section><span class="eyebrow">MOVIMENTO</span>${numberField('actor-speed', 'Deslocamento por turno · m', actor?.speed ?? 0, { min: 0, max: 60, step: .5 })}<p class="microcopy">Ao arrastar o token, a trilha fica verde até esse deslocamento, amarela até o dobro (correndo) e vermelha além. Zero: só a distância.</p></section>`;
    if (type === 'token') fields += flashlightPanel(record.flashlight, { numberField, colorField, checkField });
    if (type === 'token' && (record.visualOverride?.assetRef ?? actor?.assetRef)) fields += figurePanel(record.figure, { numberField, colorField, checkField, choiceField });
    if (type === 'light' || ['prop','window'].includes(record.kind) && !record.decal) fields += bindingPanel(record, doc.look ?? doc.defaultLook, viewport.getMaterialSlots(record.id), openAtmosphereSections, { numberField, colorField, checkField });
    fields += `<section><span class="eyebrow">APRESENTAÇÃO</span>${checkField('object-secret', 'Somente para o mestre', record.audience === 'gm')}${record.locked === undefined ? '' : checkField('object-locked', 'Bloquear edição', record.locked)}</section>${record.kind === 'terrain' ? '</details>' : ''}`;
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
        const expanded = /PINCEL DE SUPERFÍCIE|POSIÇÃO|DIMENSÕES|ILUMINAÇÃO|MATERIAL E TEXTURA|ACESSO ENTRE ALTURAS|FOGO E FUMAÇA|EFEITO LOCAL|^TELA$|^DECALQUE$|ÁGUA \/ GELO/.test(title);
        sectionDisclosure(section, title, label, expanded);
      }
      if (found?.record.kind !== 'terrain') restoreDisclosures(panel, inspectorDisclosures);
      if (found?.record.kind !== 'terrain' && found?.type !== 'group') tabInspector();
    }

    // Sections go to the tab of their job; only the active tab is visible. Applied before reconciling, so a rerender keeps it.
    function tabInspector() {
      const nodes = [...panel.children].filter(node => node.tagName === 'DETAILS' || (node.tagName === 'SECTION' && !node.querySelector(':scope > .eyebrow')));
      for (const node of nodes) {
        const key = node.dataset.panelSection;
        const tabId = node.classList.contains('object-adjustments') ? 'position' : key ? inspectorTabFor(key) ?? 'look' : /^reagir/i.test(node.textContent.trim()) ? 'light' : 'look';
        node.dataset.inspectorTab = tabId;
      }
      const available = INSPECTOR_TABS.filter(entry => nodes.some(node => node.dataset.inspectorTab === entry.id));
      if (!available.length) return;
      const kindKey = found.type === 'entity' ? record.kind : found.type;
      // A light opens on its Luz tab each time it is picked; the rest remember the last tab used for that kind.
      if (type === 'light' && lastTabbed !== selection) inspectorTab.set(kindKey, 'light');
      lastTabbed = selection;
      let active = tool === 'terrain' && available.some(entry => entry.id === 'look') ? 'look' : inspectorTab.get(kindKey) ?? available[0].id;
      if (!available.some(entry => entry.id === active)) active = available[0].id;
      const inActive = nodes.filter(node => node.dataset.inspectorTab === active);
      for (const node of nodes) {
        node.hidden = node.dataset.inspectorTab !== active;
        if (!node.hidden && inActive.length <= 2 && node.tagName === 'DETAILS' && node.dataset.panelSection && !inspectorDisclosures.has(node.dataset.panelSection)) node.open = true;
      }
      const bar = document.createElement('div');
      bar.className = 'inspector-tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Propriedades');
      bar.innerHTML = available.map(entry => `<button type="button" role="tab" data-inspector-tab-button="${entry.id}" aria-selected="${entry.id === active}" tabindex="${entry.id === active ? 0 : -1}" class="${entry.id === active ? 'active' : ''}">${icon(entry.icon, 15)}<span>${entry.label}</span></button>`).join('');
      panel.querySelector('.inspector-hero')?.after(bar);
    }
  }

  let syncedLocation = '';
  // The address follows the open document so that it can be copied into a note; diagnostics and other parameters stay.
  function syncLocation(doc) {
    const key = `${doc.documentType}:${doc.id}:${doc.revision > 0}`;
    if (key === syncedLocation) return; syncedLocation = key;
    try {
      const url = new URL(location.href);
      for (const name of ['scene', 'map', 'example', 'shot']) url.searchParams.delete(name);
      if (doc.revision > 0) url.searchParams.set(doc.documentType === 'map' ? 'map' : 'scene', doc.id);
      history.replaceState(null, '', url);
    } catch { /* an address that cannot be rewritten is only a missing convenience */ }
  }
  function paintSceneAccent(doc = store.document) {
    const accent = accentFor(environmentPreview?.next?.look ?? doc.look ?? doc.defaultLook), shellNode = root.querySelector('.app-shell');
    if (shellNode.dataset.accent !== accent) { shellNode.dataset.accent = accent; shellNode.style.setProperty('--scene-accent', accent); document.getElementById('tt-rim-flood')?.setAttribute('flood-color', accent); }
  }
  function updateView(event = {}) {
    const contentChanged=event.type!=='saved'||!viewInitialized||event.changes?.name||Boolean(event.changes?.categories?.length);
    const doc = store.document;
    const isMap = doc.documentType === 'map';
    if (selection && !locate()) selection = null;
    selectedIds = new Set([...selectedIds].filter(key => locate(key)));
    if (!selection) selection = [...selectedIds].at(-1) ?? null;
    if (event.type === 'replace') { inspectionControl.reset(); if (liveCamera.enabled) setLiveCamera(false); viewport.setFollow(null); shotThumbnails.cancel(); rehearsedId = null; dockIndex = 0; skyReturnCamera = null; selectedIds.clear(); selection = null; activeSurfaceId = undefined; smartFloorId = null; activeLevelId = null; activeLayerId = null; isolatedLevel = false; }
    if (!doc.layout.levels?.[activeLevelId]) { activeLevelId = null; isolatedLevel = false; }
    if (!doc.layout.layers?.[activeLayerId]) activeLayerId = null;
    const floors = Object.values(doc.layout.entities).filter(e => e.kind === 'floor');
    if (activeSurfaceId && !doc.layout.entities[activeSurfaceId]) activeSurfaceId = undefined;
    if (activeSurfaceId === undefined) activeSurfaceId = floors.length === 1 ? floors[0].id : null;
    if (!doc.layout.entities[smartFloorId]) {
      smartFloorId = (floors.find(floor => !floor.tags?.includes(SURROUNDINGS_TAG)) ?? floors[0])?.id ?? null;
      const existing = currentComposition(); if (existing) smartOptions = { ...existing.parameters, restoreDeleted: false };
    }
    if (environmentPreview && event.type !== 'saved') { environmentPreview = null; document.getElementById('proposal-bar').hidden = true; }
    if (proposal && event.type !== 'saved') clearProposal();
    if(contentChanged)performanceDiagnostics.measure('viewportUpdate',()=>viewport.setDocument(isPresentation ? projectPresentation(environmentPreview?.next ?? doc) : environmentPreview?.next ?? doc));
    viewport.setIsolatedLevel(isolatedLevel ? activeLevelId : null);
    viewport.setSupportSurface(activeSurfaceId); viewport.setWorkplaneHeight(buildHeight);
    viewport.setSelection(isPresentation ? null : selection, isPresentation ? [] : [...selectedIds]);
    document.getElementById('scene-name').value = doc.name;
    document.getElementById('presentation-name').textContent = doc.name;
    const eyebrow = document.getElementById('doc-type-eyebrow'), take = document.getElementById('take'), takeText = doc.revision > 0 ? `TOMADA ${doc.revision}` : 'RASCUNHO';
    if (eyebrow.textContent !== (isMap ? 'MAPA' : 'CENA')) eyebrow.textContent = isMap ? 'MAPA' : 'CENA';
    if (take.textContent !== takeText) take.textContent = takeText;
    scheduleViewTag(); renderShotDock(); syncLocation(doc); scheduleSelectionBar();
    paintSceneAccent(doc);
    renderInitiativeStrip(doc);
    document.getElementById('welcome').hidden = Object.keys(doc.layout?.entities || {}).length > 0 || !!proposal || isPresentation; renderWelcome();
    document.getElementById('undo').disabled = !store.canUndo;
    document.getElementById('redo').disabled = !store.canRedo;
    document.getElementById('undo').title = `Desfazer${store.undoLabel ? `: ${store.undoLabel}` : ''} (Ctrl+Z)`;
    const status = document.getElementById('save-status');
    status.textContent = saving ? 'Salvando…' : store.dirty ? 'Alterações locais' : `${repository.storage==='browser'?'Salvo neste navegador':'Salvo'} · revisão ${doc.revision}`;
    status.classList.toggle('unsaved', store.dirty);
    const saveButton = document.getElementById('save-scene'); saveButton.disabled = saving; saveButton.classList.toggle('primary', store.dirty); saveButton.classList.toggle('quiet', !store.dirty);
    document.getElementById('scene-summary').textContent = `${Object.keys(doc.layout?.entities || {}).length} elementos · ${Object.keys(doc.tokens || {}).length} tokens · ${Object.keys(doc.look?.lights || doc.defaultLook?.lights || {}).length} luzes · grid ${doc.layout?.grid?.cellSize ?? 1} m`;
    if(contentChanged){
      const changes=event.changes, categories=changes?.categories??[];
      if(!changes||changes.full||changes.entities?.includes(selection)||changes.tokens?.includes(selection)||changes.lights?.includes(selection)||changes.actors?.includes(doc.tokens?.[selection]?.actorId)||changes.groups?.length||changes.levels?.length||changes.layers?.length||categories.some(c=>['structure','organization','look','session'].includes(c)))renderInspector();else performanceDiagnostics.count('inspectorSkipped');
      if(!changes||changes.full||changes.name||categories.some(c=>['structure','organization','metadata','look','camera','grid'].includes(c))||categories.includes('session')&&tab==='shots')renderSidebar();
      // A light switched on or off only changes the bulbs of the tree.
      else if(categories.includes('light'))renderSceneTreeIfVisible();else performanceDiagnostics.count('sidebarSkipped');
      broadcast();
      ambience?.render();
    }
    if (event.type !== 'saved') previews.schedule();
    viewInitialized=true;
    clearTimeout(draftTimer); draftTimer = setTimeout(flushDraft, 180);
  }
  let welcomeHTML = '', welcomePreviews = false;
  // The start screen: continue the latest scene, load an example, or start from nothing. Rendered only while it is shown.
  function renderWelcome() {
    const node = document.getElementById('welcome');
    let html = '';
    if (!node.hidden) {
      const latest = [...savedScenes].filter(scene => scene.revision > 0).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      const examples = EXAMPLE_SCENES.slice(0, 4);
      html = `<span class="tt-eyebrow">UMA CENA COMEÇA COM UM ESPAÇO</span><h1 class="tt-display">Qual é a próxima cena?</h1>
        ${latest ? `<section class="welcome-continue"><span class="tt-eyebrow">CONTINUAR</span>${posterMarkup({ tag: 'MINHA CENA', name: latest.name, image: previews.image(latest), open: `data-welcome-open="${latest.id}"`, accent: accentFor(latest.look ?? latest.defaultLook), meta: `Tomada ${latest.revision} · ${new Date(latest.updatedAt).toLocaleString('pt-BR')}`, cta: 'Continuar esta cena', className: 'is-large' })}</section>` : ''}
        <section><span class="tt-eyebrow">CENAS DE EXEMPLO</span><div class="welcome-strip">${examples.map(example => posterMarkup({ tag: 'EXEMPLO', tagClass: 'is-dark', name: example.name, image: previews.exampleImage(example), open: `data-welcome-example="${example.id}"`, accent: accentFor(example.look ?? example.defaultLook), className: 'is-compact' })).join('')}</div>${button('open-all', 'Ver todas', 'folder', 'quiet')}</section>
        <section class="welcome-start"><span class="tt-eyebrow">COMEÇAR DO ZERO</span><div class="welcome-start-actions">${button('room-draw', 'Desenhar minha primeira sala', 'room', 'primary cta')}${button('welcome-building', 'Prédio por contorno', 'floor', 'quiet')}${button('welcome-tutorials', 'Aprender o básico', 'cap', 'quiet')}</div></section>`;
    }
    if (html !== welcomeHTML) { node.innerHTML = html; welcomeHTML = html; }
    // Posters fill in with real previews a moment later; tests (diagnostics) keep the start screen free of that work.
    if (html && !welcomePreviews && !new URLSearchParams(location.search).has('diagnostics')) {
      welcomePreviews = true;
      setTimeout(() => { previews.ensureExamples(EXAMPLE_SCENES.slice(0, 4)); const latest = [...savedScenes].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0]; if (latest) previews.ensure([latest], { visibleIds: new Set([latest.id]) }); }, 1500);
    }
  }
  async function refreshSaved() {
    const [scenesResult, mapsResult] = await Promise.allSettled([
      repository.list('scene',{previews:false}),
      repository.list('map',{previews:false}),
    ]);
    if (scenesResult.status === 'fulfilled') savedScenes = scenesResult.value;
    if (mapsResult.status === 'fulfilled') savedMaps = mapsResult.value;
    renderWelcome();
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

  function closeDialog() { exampleObserver?.disconnect();previews.cancelLibrary();documentsWindow.close(); }

  async function openExample(exampleId) {
    if (!canSwitch()) return;
    const ticket=++openTicket, sourceId=store.document.id, sourceVersion=store.editVersion;
    exampleObserver?.disconnect();previews.cancelLibrary();
    notify('Carregando cena de exemplo…');
    const doc=await loadExampleScene(exampleId);
    if(ticket!==openTicket)return;
    if(store.document.id!==sourceId||store.editVersion!==sourceVersion) {notify('A cena atual mudou durante o carregamento. Suas alterações foram preservadas; abra o exemplo novamente.',true);return;}
    await stageCut.close();
    selection=null;clearProposal();setTool('select');
    // An example opened from a practice scene is still practice: the person's scene stays kept aside.
    if(heldScene&&store.document.id===practiceId)practiceId=doc.id;
    store.replace(doc,{saved:false});viewport.frameScene();
    const camera=Object.values(doc.cameraPresets)[0];if(camera)viewport.setCamera(camera);
    closeDialog();notify('Exemplo aberto como cópia editável. Use Salvar para guardar sua cena.');
    void stageCut.open(viewport.ready());
  }

  async function openScene(sceneId) {
    if (sceneId === store.document.id && store.document.revision === 0) { closeDialog(); return; }
    if (!canSwitch()) return;
    const ticket = ++openTicket, sourceId = store.document.id, sourceVersion = store.editVersion;
    const doc = await repository.read(sceneId, 'scene');
    if (ticket !== openTicket) return;
    if (store.document.id !== sourceId || store.editVersion !== sourceVersion) { notify('A cena atual mudou durante o carregamento. Suas alterações foram preservadas; abra novamente quando estiver pronto.', true); return; }
    await stageCut.close();
    selection = null; clearProposal(); setTool('select');
    store.replace(doc); lastScene.write(doc.id); viewport.frameScene();
    const camera = Object.values(doc.cameraPresets || {})[0]; if (camera) viewport.setCamera(camera);
    closeDialog();
    notify(`Cena “${doc.name}” aberta.`);
    void stageCut.open(viewport.ready());
  }

  async function openMap(mapId) {
    if (!canSwitch()) return;
    const ticket = ++openTicket, sourceId = store.document.id, sourceVersion = store.editVersion;
    const doc = await repository.read(mapId, 'map');
    if (ticket !== openTicket) return;
    if (store.document.id !== sourceId || store.editVersion !== sourceVersion) { notify('O documento atual mudou durante o carregamento.', true); return; }
    await stageCut.close();
    selection = null; clearProposal(); setTool('select');
    store.replace(doc); lastScene.write(doc.id); viewport.frameScene();
    closeDialog();
    notify(`Mapa “${doc.name}” aberto para edição.`);
    void stageCut.open(viewport.ready());
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
      const accentOf = doc => accentFor(doc.look ?? doc.defaultLook);
      container.innerHTML = `
        <section class="example-scenes" aria-labelledby="example-scenes-title">
          <h3 id="example-scenes-title" class="eyebrow">CENAS DE EXEMPLO</h3>
          <p class="microcopy">Carregue uma cópia para explorar, editar e salvar como sua cena.</p>
          <div class="poster-grid">${EXAMPLE_SCENES.map(example => posterMarkup({ tag: 'EXEMPLO', tagClass: 'is-dark', name: example.name, text: example.description, cta: 'Carregar cena', image: previews.exampleImage(example), open: `data-open-example="${example.id}"`, accent: accentOf(example), className: 'example-scene-card' })).join('')}</div>
        </section>
        <div class="tab-toolbar">
          <span class="eyebrow">${scenes.length} cena(s) · prévias automáticas</span>
          <div class="tab-toolbar-actions">
            ${button('dialog-new-scene', 'Nova cena', 'plus', 'primary')}
          </div>
        </div>
        <div class="poster-grid">${scenes.map(scene => posterMarkup({
          tag: 'MINHA CENA', name: scene.name, image: previews.image(scene), open: `data-open="${scene.id}"`, accent: accentOf(scene), className: 'scene-library-card',
          badge: scene.id === store.document.id ? '<span class="item-badge is-current">Atual</span>' : '',
          meta: scene.revision === 0 ? 'Em criação · ainda não salva' : `Tomada ${scene.revision} · ${new Date(scene.updatedAt).toLocaleString('pt-BR')}`,
          actionsHidden: scene.revision === 0,
          actions: `<button type="button" class="quiet" data-duplicate-scene-id="${scene.id}" title="Duplicar cena" aria-label="Duplicar cena">${icon('copy', 14)}</button><button type="button" class="quiet danger" data-delete-scene="${scene.id}" title="Excluir cena" aria-label="Excluir cena">${icon('trash', 14)}</button>`,
        })).join('')}</div>
        ${scenes.length ? '' : '<div class="empty-dialog">Nenhuma cena salva ainda.<p>Crie uma sala e use Salvar para começar sua coleção.</p></div>'}
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
        <div class="poster-grid">${savedMaps.map(map => posterMarkup({
          tag: 'MAPA', name: map.name, image: previews.image(map), open: `data-open-map="${map.id}"`, accent: accentFor(map.look ?? map.defaultLook), className: 'scene-library-card',
          badge: map.id === store.document.id ? '<span class="item-badge is-current">Atual</span>' : '',
          meta: `Tomada ${map.revision} · ${new Date(map.updatedAt).toLocaleString('pt-BR')}`,
          actions: `<button type="button" class="primary" data-instantiate-map="${map.id}" title="Criar nova cena usando este mapa">${icon('plus', 14)} Criar cena</button><button type="button" class="quiet" data-duplicate-map-id="${map.id}" title="Duplicar mapa" aria-label="Duplicar mapa">${icon('copy', 14)}</button><button type="button" class="quiet danger" data-delete-map="${map.id}" title="Excluir mapa" aria-label="Excluir mapa">${icon('trash', 14)}</button>`,
        })).join('')}</div>
        ${savedMaps.length ? '' : '<div class="empty-dialog">Nenhum mapa salvo ainda.<p>Você pode converter a estrutura da sua cena atual em um Mapa modelo reutilizável!</p></div>'}
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
              <div class="token-avatar" style="--token:${t.color}">
                <span class="token-initial">${t.name[0]}</span>
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
    observeGalleryCards();
    const visible=new Set([...dialog.querySelectorAll('[data-open], [data-open-map]')].filter(node=>{const a=node.getBoundingClientRect(),b=dialog.getBoundingClientRect();return a.bottom>=b.top&&a.top<=b.bottom;}).map(node=>node.dataset.open??node.dataset.openMap));
    previews.ensure([...savedScenes, ...savedMaps],{visibleIds:visible});
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
      beginAssetPlacement(asset);
    } catch (error) { notify(`O asset não foi importado: ${error.message}`, true); }
  }

  function changeField(input) {
    const field = input.dataset.field, value = input.type === 'checkbox' ? input.checked : ['number','range'].includes(input.type) ? Number(input.value) : input.value;
    if (field === 'ruler-snap') { rulerSnap = value; viewport.setRulerSnap(value); return; }
    if (field === 'asset-placement-repeat') {
      repeatAssetPlacement = value;
      if (placing?.assetPlacement) { placing.repeat = value; if (tool === 'place') setTool('place'); }
      root.querySelectorAll('[data-field="asset-placement-repeat"]').forEach(node => { node.checked = value; });
      return;
    }
    if (field === 'camera-speed') { if (Number.isFinite(Number(value))) { cameraSpeed = Math.max(.2, Math.min(40, Number(value))); viewport.setNavigationSpeed(cameraSpeed); } renderSidebar(); return; }
    if (field === 'camera-fov') { viewport.setFov(Number(value)); renderSidebar(); return; }
    if (field === 'camera-duration') { cameraDuration = Number(value); return; }
    if (field === 'camera-smoothing') { navigationSmoothing = Math.max(0, Math.min(1, Number(value) / 100)); viewport.setNavigationSmoothing(navigationSmoothing); return; }
    if (field.startsWith('camera-focus-')) {
      const key = field.slice(13), camera = viewport.getCamera();
      // Turned on with nothing chosen, focus lands on what the camera looks at.
      const patch = key === 'enabled' ? { enabled: value, ...(value && !camera.focus ? { distance: Math.max(.2, new Vector3(...camera.position).distanceTo(new Vector3(...camera.target))) } : {}) }
        : key === 'target' ? { targetId: value || null } : key === 'aperture' ? { aperture: Math.max(0, Math.min(1, value / 100)) } : { distance: Math.max(.2, value) };
      viewport.setFocus(patch); if (key === 'enabled' || key === 'target') renderSidebar(); return;
    }
    if (field === 'camera-follow') { viewport.setFollow(value || null); renderSidebar(); renderInspector(); return; }
    if (field === 'camera-motion') { viewport.setCameraMotion({ ...MOTION_DEFAULTS, ...viewport.getCamera().motion, type: value }); renderSidebar(); return; }
    if (field === 'camera-motion-speed') { viewport.setCameraMotion({ ...viewport.getCamera().motion, speed: Math.max(0, Math.min(4, value)) }); return; }
    if (field === 'camera-live') { setLiveCamera(Boolean(value)); return; }
    if (field === 'initiative-camera') { initiativeCamera = Boolean(value); return; }
    if (field === 'camera-tactical') { tacticalZoom = Boolean(value); viewport.setTacticalZoom(tacticalZoom); notify(tacticalZoom ? 'Zoom tático: afastar olha de cima, aproximar desce à altura dos olhos.' : 'Zoom tático desligado.'); return; }
    if (field.startsWith('area-')) { const key = field.slice(5); areaTool = { ...areaTool, [key]: key === 'width' ? Math.max(.5, Math.min(10, Number(value) || 1.5)) : value }; viewport.setAreaTool(areaTool); if (key === 'shape') renderSidebar(); return; }
    if (field === 'camera-live-smoothing') { liveCamera.smoothing = Math.max(.1, Math.min(2, value)); sendLiveCamera(); return; }
    if (field === 'title-card-title') { titleCard.title = String(value).slice(0, 120); return; }
    if (field === 'title-card-subtitle') { titleCard.subtitle = String(value).slice(0, 120); return; }
    if (field === 'title-card-duration') { titleCard.duration = Math.min(12, Math.max(2, Number(value) || 4)); return; }
    if (field === 'projector-letterbox') { letterbox = Boolean(value); sendSnapshot(); return; }
    if (field.startsWith('assembly-')) {
      const group=locate()?.record; if(!group?.anchored) return;
      if(field==='assembly-name') { execute('group.update',{ id:group.id,patch:{ name:value } }); return; }
      const transform=clone(group.transform);
      if(field.startsWith('assembly-position-')) transform.position[Number(field.slice(18))]=value;
      else if(field==='assembly-yaw') transform.rotation=quaternionFromYaw(value);
      else if(field==='assembly-size') transform.scale=[value,value,value];
      execute('group.transform',{ id:group.id,transform,snap:false },{ label:'Transformar composição' }); return;
    }
    if (field === 'preset-name') { const surface = brushSurface(); if (surface) brushPresetStates[surface].name = value; return; }
    if (field === 'preset-selection') {
      const surface = brushSurface(); if (!surface) return;
      const selected = brushPresets.find(preset => preset.id === value && preset.surface === surface);
      brushPresetStates[surface] = { selectedId: selected?.id ?? '', name: selected?.name ?? '' };
      brushPresetsError = ''; renderInspector(); return;
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
    if(field==='light-preset-name')return;
    if(field==='light-preset-selected'){selectedLightPreset=value;renderInspector();return;}
    if(field==='lighting-quality'||field.startsWith('lighting-')){
      try{const tier=field==='lighting-quality'?value:lightingQuality,budget=field==='lighting-quality'?lightingBudget:{...lightingBudget,[field.slice(9)]:Number(value)};viewport.setLightingQuality(tier,budget);lightingQuality=tier;lightingBudget=budget;renderSidebar();}catch(error){notify(error.message,true);renderSidebar();}return;
    }
    if(field.startsWith('rendering-')){const look=store.document.look??store.document.defaultLook;execute('look.update',{patch:{rendering:{...RENDERING_DEFAULTS,...look.rendering,[field.slice(10)]:value}}});return;}
    if(field.startsWith('illumination-')||field.startsWith('zone-')){
      const record=locate()?.record;if(!record?.material)return;
      if(field.startsWith('zone-')){const key=field.slice(5),z=clone(record.lightingZone??{...ZONE_DEFAULTS,size:[record.width??record.footprint?.[0]??8,4,record.length??record.footprint?.[1]??8]});if(/^(size|position)-[012]$/.test(key)){const [array,i]=key.split('-');z[array][Number(i)]=value;}else z[key]=value;execute('entity.update',{id:record.id,patch:{lightingZone:z},snap:false});return;}
      const key=field.slice(13);let config;
      if(['yaw','pitch'].includes(key)){config=clone(record.illumination);const angles=new Euler().setFromQuaternion(new Quaternion(...config.rotation),'YXZ');angles[key==='yaw'?'y':'x']=value*Math.PI/180;config.rotation=new Quaternion().setFromEuler(angles).toArray();}
      else{config=illuminationPatch(record.illumination,key,key==='mapSize'?Number(value):value,record.kind==='window'?{...record,inward:windowInward(record)}:record);if(key==='type'&&value==='point')config.projection='none';}
      execute('entity.update',{id:record.id,patch:{illumination:config},snap:false});return;
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
      if (key === 'template') smartTemplateChosenFor = smartFloorId;
      if (key === 'floor') { smartFloorId = value || null; const existing = currentComposition(); if (existing) smartOptions = { ...existing.parameters, restoreDeleted: false }; }
      else smartOptions[key] = value;
      clearProposal(); renderSidebar(); return;
    }
    if (field.startsWith('around-')) { const key = field.slice(7), live = Boolean(proposal?.aroundPreview); aroundOptions[key] = key === 'greenery' ? Math.max(0, Math.min(1, value / 100)) : value; clearProposal(); if (live) previewSurroundings(); renderSidebar(); return; }
    if (field.startsWith('building-')) {
      const key = field.slice(9), live = Boolean(proposal?.buildingPreview);
      buildingOptions.pick = null; if (key === 'mode') { buildingOptions.mode = value; clearProposal(); renderSidebar(); return; }
      if (!['addTemplate', 'furnish', 'lighting', 'roof', 'era'].includes(key)) buildingOptions.bands = null;
      if (key === 'roomAdd') { if (value) buildingOptions.rooms = [...buildingRooms(), value]; }
      else if (key === 'hub') { buildingOptions.rooms = buildingRooms(); buildingOptions.hub = value; }
      else { buildingOptions[key] = value; if (key === 'type') { buildingOptions.rooms = null; buildingOptions.hub = null; const own = BUILDING_TYPES.find(entry => entry.id === value)?.era; if (own) buildingOptions.era = own; /* a tavern or a keep comes with its period; it can be changed back */ } if (key === 'floorId') buildingOptions.center = null; }
      // With the preview open, the scene follows the panel.
      clearProposal(); if (live) previewBuilding(); renderSidebar(); return;
    }
    if (field.startsWith('ambience-')) { const key = field.slice(9); ambienceOptions[key] = key === 'amount' ? Math.max(0, Math.min(1, value / 100)) : value; clearProposal(); renderSidebar(); return; }
    if (field.startsWith('state-')) { const key = field.slice(6); stateOptions[key] = key === 'intensity' ? Math.max(0, Math.min(1, value / 100)) : value; clearProposal(); renderSidebar(); return; }
    if (field.startsWith('polish-')) { polishOptions[field.slice(7)] = value; clearProposal(); if (field === 'polish-mode') renderInspector(); return; }
    if (field.startsWith('room-')) {
      const key = field.slice(5); roomOptions[key] = value; if (proposal) makeProposal(); return;
    }
    if (field.startsWith('grid-')) {
      const key = { 'grid-visible': 'visible', 'grid-snap': 'snap', 'grid-size': 'cellSize', 'grid-diagonal': 'diagonal' }[field];
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
    if (field === 'entity-interactive' && type === 'entity') { execute('entity.update', { id: record.id, patch: { interactive: Boolean(value) } }, { label: 'Interativo' }); return; }
    if (type === 'token' && field === 'actor-speed') { const speed = Math.max(0, Math.min(60, Number(value) || 0)); execute('actor.update', { id: record.actorId, patch: { speed } }, { label: 'Deslocamento' }); return; }
    if (type === 'token' && field.startsWith('figure-')) {
      const key = field.slice(7), current = { ...FIGURE_DEFAULTS, ...record.figure };
      const figure = key === 'enabled' ? (value ? { ...FIGURE_DEFAULTS } : null) : { ...current, [key]: key === 'facing' ? (value ? 'camera' : 'fixed') : key === 'outlineWidth' ? value / 100 : key === 'rim' ? value / 100 : value };
      execute('token.update', { id: record.id, patch: { figure } }, { label: key === 'state' ? 'Estado do personagem' : 'Figura' }); return;
    }
    if (type === 'token' && field.startsWith('flashlight-')) {
      const key = field.slice(11), current = { ...FLASHLIGHT_DEFAULTS, ...record.flashlight }, amount = key === 'angle' ? value * Math.PI / 180 : key === 'penumbra' ? value / 100 : value;
      execute('token.update', { id: record.id, patch: { flashlight: { ...current, ...(record.flashlight ? {} : { enabled: false }), [key]: amount } } }, { label: 'Lanterna' }); return;
    }
    if (field.startsWith('binding-')) {
      const look = store.document.look ?? store.document.defaultLook;
      execute('environment.binding.update', { id: record.id, binding: { ...BINDING_DEFAULTS, ...look.environmentBindings?.[record.id], [field.slice(8)]: value } }); return;
    }
    let patch = {}, actorPatch;
    const imageAssets = assets.filter(asset => asset.type === 'image');
    if (record.decal && record.anchor?.socket === 'surface' && (field.startsWith('position-') || field === 'object-yaw')) {
      // A decal lives on its face: typing a position slides it over that plane, and the turn is its own field.
      if (field === 'object-yaw') { notify('Para girar o decalque sobre a superfície, use "Giro no plano" em Decalque.'); renderInspector(); return; }
      const position = [...record.transform.position]; position[Number(field.slice(-1))] = value;
      try { execute('entity.update', { id: record.id, patch: { anchor: decalAnchorFromWorld(store.document.layout.entities[record.anchor.hostId], record.anchor, { position, rotation: record.transform.rotation }) }, snap: false }); }
      catch (error) { notify(error.message, true); renderInspector(); }
      return;
    }
    if (field.startsWith('inspect-') && type === 'entity') {
      try { execute('entity.update', { id: record.id, patch: inspectableFieldPatch(record, field.slice(8), value, { imageAssets }), snap: false }, { label: 'Inspecionável' }); }
      catch (error) { notify(error.message, true); renderInspector(); }
      return;
    }
    if (field.startsWith('screen-') && type === 'entity') {
      try { execute('entity.update', { id: record.id, patch: screenFieldPatch(record, field.slice(7), value, viewport.getSlotFrame(record.id, 'screen'), imageAssets), snap: false }); }
      catch (error) { notify(error.message, true); renderInspector(); }
      return;
    }
    if (field.startsWith('decal-') && record.decal) {
      try { execute('entity.update', { id: record.id, patch: decalFieldPatch(record, field.slice(6), value, { host: store.document.layout.entities[record.anchor?.hostId], imageAssets }), snap: false }); }
      catch (error) { notify(error.message, true); renderInspector(); }
      return;
    }
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
    else if (field.startsWith('wet-')) patch.material = { wet: wetFieldPatch(record.material.wet, field.slice(4), value) };
    else if (field.startsWith('wear-')) patch.material = { wear: wearFieldPatch(record.material.wear, field.slice(5), value) };
    else if (field.startsWith('material-')) patch.material = field === 'material-texture' ? surfacePatch(value) : textureFieldPatch(record.material, field.slice(9), value);
    else if(field.startsWith('water-') && record.kind==='water') patch.water={[field.slice(6)]:value};
    else if (field.startsWith('cable-') && record.cable) {
      const member = field.slice(6);
      patch.cable = member.startsWith('span-') ? { ...record.cable, span: record.cable.span.map((v, axis) => axis === Number(member.slice(5)) ? value : v) } : { ...record.cable, [member]: value };
    }
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
      if(member === 'type') patch.localEffect = value === 'none' ? { ...config, enabled:false } : config.type === value ? { ...config, enabled:true } : { ...({smoke:smokeDefaults,sparks:sparksDefaults,drip:dripDefaults}[value]?.()??LOCAL_EFFECT_DEFAULTS), hideModel:config.hideModel, enabled:true };
      else if(member.startsWith('size-') || member.startsWith('offset-')) { const [key,index]=member.split('-'); config[key][Number(index)]=value; patch.localEffect=config; }
      else patch.localEffect={ ...config, [member]:value };
    }
    else if (field.startsWith('light-')) patch[{ 'light-color': 'color', 'light-intensity': 'intensity', 'light-distance': 'distance', 'light-shadow': 'shadowEnabled', 'light-enabled': 'enabled', 'light-temperature': 'temperature', 'light-angle': 'angle', 'light-penumbra': 'penumbra', 'light-priority':'priority','light-shadowPolicy':'shadowPolicy','light-projection':'projection' }[field]] = field === 'light-angle' ? value * Math.PI / 360 : value;
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
    const labels = { background:'fundo', fill:'luz ambiente', daylight:'horário/exposição', sky:'céu/nuvens', weather:'clima', fog:'névoa', volumetricFog:'volume de névoa', bloom:'halo', nightWindows:'janelas', effectsPaused:'animação',rendering:'acabamento da iluminação' };
    const bar = document.getElementById('proposal-bar'); bar.hidden = false;
    bar.innerHTML = `<div><span><strong>Prévia de ambiente</strong><small>${diff.fields.map(f => labels[f]).join(' · ') || 'Mesmas configurações globais'} · sol/lua</small></span></div>${button('environment-preview-cancel','Cancelar','','quiet')}${button('environment-preview-accept','Aplicar ambiente','plus','primary')}<p class="microcopy">${diff.windows} janelas de vidro · ${diff.bindings} vínculos por horário · ${diff.localLights} luzes locais preservadas. Geometria e câmeras permanecem na cena.</p>`;
  }
  function previewIllumination(record,settings){
    clearProposal();const next=clone(store.document);next.layout.entities[record.id].illumination=clone(settings);validateDocument(next);
    environmentPreview={illuminationId:record.id,settings:clone(settings),next,version:store.editVersion};viewport.setDocument(next);
    const bar=document.getElementById('proposal-bar');bar.hidden=false;bar.innerHTML='<span>Prévia de iluminação · somente nesta janela</span><button data-action="environment-preview-accept">Aplicar iluminação</button><button data-action="environment-preview-cancel">Cancelar</button>';
  }
  async function lightPresetAction(action){const record=locate()?.record;if(!record?.material)throw new Error('Selecione um objeto.');const selected=lightPresets.find(p=>p.id===selectedLightPreset);
    if(action==='reload'){lightPresets=await lightPresetRepository.list();renderInspector();return;}
    if(['apply','preview'].includes(action)){if(!selected)throw new Error('Escolha um perfil pessoal.');if(action==='preview')previewIllumination(record,selected.settings);else execute('entity.update',{id:record.id,patch:{illumination:clone(selected.settings)},snap:false});return;}
    if(action==='delete'){if(!selected)throw new Error('Escolha um perfil pessoal.');await lightPresetRepository.remove(selected);selectedLightPreset='';}
    else{if(!record.illumination)throw new Error('Adicione uma fonte ao objeto.');if(action!=='save'&&!selected)throw new Error('Escolha um perfil pessoal.');const name=document.querySelector('[data-field="light-preset-name"]')?.value;const saved=await lightPresetRepository.save({name,settings:action==='rename'?selected.settings:record.illumination},action==='save'?null:selected);selectedLightPreset=saved.id;}
    lightPresets=await lightPresetRepository.list();renderInspector();
  }
  async function selectedEnvironment() {
    if (!selectedEnvironmentId) throw new Error('Selecione um ambiente salvo.');
    return repository.read(selectedEnvironmentId, 'environment');
  }
  async function refreshEnvironments() { savedEnvironments = await repository.list('environment',{previews:false}); renderSidebar(); }
  async function act(action, metadata = {}) {
    if (!initialized) return;
    if (action.startsWith('brush-preset-')) { await manageBrushPreset(action.slice('brush-preset-'.length)); return; }
    switch (action) {
      case 'lighting-legibility':legibility=!legibility;viewport.setLegibility(legibility);notify(legibility?'Revisão de legibilidade ligada só nesta janela.':'Revisão de legibilidade desligada.');break;
      case 'illumination-origin-pick':clearProposal();setTool('illumination-origin');notify('Clique no objeto selecionado para definir a origem da luz. Esc cancela.');break;
      case 'illumination-copy':illuminationClipboard=clone(locate()?.record.illumination);notify('Iluminação copiada.');break;
      case 'illumination-paste':if(!illuminationClipboard)throw new Error('Copie uma iluminação primeiro.');execute('entity.update',{id:selection,patch:{illumination:clone(illuminationClipboard)},snap:false});break;
      case 'illumination-preview':{const r=locate()?.record;if(r?.illumination)previewIllumination(r,{...r.illumination,enabled:!r.illumination.enabled});break;}
      case 'illumination-recalculate':{const r=locate()?.record;if(r?.illumination)execute('entity.update',{id:r.id,patch:{illumination:illuminationDefaults(r.illumination.profile,r,r.illumination)},snap:false});break;}
      case 'zone-fit':{const r=locate()?.record;if(r?.lightingZone)execute('entity.update',{id:r.id,patch:{lightingZone:{...r.lightingZone,size:[r.width??r.footprint?.[0]??8,r.lightingZone.size[1],r.length??r.footprint?.[1]??8]}},snap:false});break;}
      case 'light-preset-save':case 'light-preset-preview':case 'light-preset-apply':case 'light-preset-update':case 'light-preset-rename':case 'light-preset-delete':case 'light-preset-reload':try{await lightPresetAction(action.slice(13));}catch(error){try{lightPresets=await lightPresetRepository.list();}catch{}notify(error.message,true);}break;

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
      case 'environment-preview-accept': { const preview = environmentPreview; if (!preview) break; if (preview.version !== store.editVersion) { cancelEnvironmentPreview(); throw new Error('A cena mudou. Faça uma nova prévia.'); } if(preview.illuminationId)execute('entity.update',{id:preview.illuminationId,patch:{illumination:preview.settings},snap:false});else execute('environment.apply', { preset: preview.preset }); break; }
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
        if(execute('group.bind',{ id:groupId,ids:[...selectedIds],name:names.slice(0,2).join(' + ').slice(0,256) || 'Composição ancorada' },{ label:'Ancorar objetos juntos' })) { selectObject(groupId); tab='elements'; renderSidebar(); notify('Objetos ancorados como uma unidade. Desancore pelo botão na pasta.'); } break;
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
      // Same room, next arrangement: only the seed changes, so it can be repeated later.
      case 'smart-variation': smartOptions.seed = (smartOptions.seed + 1) % 4294967296; renderSidebar();
      // falls through
      case 'smart-preview': {
        try { showAuthorshipProposal(proposeFurnishing(store.document, { ...smartOptions, floorId: smartFloorId, compositionId: currentComposition()?.id }, store.editVersion, assets)); }
        catch (error) { notify(error.message, true); } break;
      }
      case 'smart-pick': smartOptions.template = metadata.id; smartTemplateChosenFor = smartFloorId; clearProposal(); renderSidebar(); break;
      case 'assist-select': selectObject(metadata.id); break;
      case 'state-variation': stateOptions.seed = (stateOptions.seed + 1) % 4294967296; renderSidebar();
      // falls through
      case 'state-preview': {
        try { showAuthorshipProposal(proposeRoomState(store.document, { ...stateOptions, floorId: smartFloorId }, store.editVersion, assets)); }
        catch (error) { notify(error.message, true); } break;
      }
      case 'tutorials': { tutor.dismiss(); const panel = document.getElementById('tutorial-center'); if (!panel.hidden) tutor.seen(); panel.hidden = !panel.hidden; root.querySelector('.rail [data-action="tutorials"]').setAttribute('aria-expanded', String(!panel.hidden)); renderTutorials(); break; }
      case 'tutorial-start': {
        document.getElementById('tutorial-center').hidden = true; root.querySelector('.rail [data-action="tutorials"]').setAttribute('aria-expanded', 'false');
        tutor.seen(); const lesson = LESSONS.find(entry => entry.id === metadata.id), from = Number(metadata.from ?? 0);
        if (lesson && await preparePractice(lesson, from)) tutor.start(lesson.id, from); break;
      }
      case 'tutorial-help': { const lesson = lessonForTask(metadata.task); if (lesson) return act('tutorial-start', { id: lesson.id }); break; }
      case 'tutorial-return': returnFromPractice(); renderTutorials(); break;
      case 'tutorial-report': { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(tutor.report(), null, 2)], { type: 'application/json' })); link.download = 'tabletop-tutoriais.json'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); break; }
      case 'around-variation': aroundOptions.seed = (aroundOptions.seed + 1) % 4294967296; renderSidebar();
      // falls through
      case 'around-preview': previewSurroundings(); break;
      case 'building-fit': {
        // The usual way to add a room: inside the building. Outwards only when the inside has no room for it.
        const template = metadata.rearrange ? null : metadata.id || buildingOptions.addTemplate, options = { floorId: smartFloorId, seed: buildingOptions.seed, furnish: buildingOptions.furnish, lighting: buildingOptions.lighting };
        try {
          const inside = proposeRedivide(store.document, { ...options, add: template }, store.editVersion, assets);
          if (inside.fits) { showAuthorshipProposal(inside); break; }
          notify('Não há espaço por dentro para este cômodo; a prévia mostra a ampliação para fora.');
        } catch (error) { if (!template) { notify(error.message, true); break; } notify(`${error.message} A prévia mostra a ampliação para fora.`); }
        try { showAuthorshipProposal(proposeAddRoom(store.document, { ...options, template }, store.editVersion, assets)); } catch (error) { notify(error.message, true); }
        break;
      }
      case 'building-add-room': {
        try { showAuthorshipProposal(proposeAddRoom(store.document, { floorId: smartFloorId, template: metadata.id ?? buildingOptions.addTemplate, spot: Number(metadata.spot ?? 0), seed: buildingOptions.seed, furnish: buildingOptions.furnish, lighting: buildingOptions.lighting }, store.editVersion, assets)); }
        catch (error) { notify(error.message, true); } break;
      }
      case 'welcome-building': return act('building-draw');
      case 'welcome-tutorials': return act('tutorials');
      case 'open-all': return openDialog();
      case 'building-draw': drawingBuilding = true; clearProposal(); setTool('room'); notify('Arraste no chão para desenhar o contorno do prédio.'); break;
      case 'building-room-remove': { const live = Boolean(proposal?.buildingPreview); buildingOptions.bands = null; buildingOptions.pick = null; buildingOptions.rooms = buildingRooms().filter((_, i) => i !== Number(metadata.id)); clearProposal(); if (live) previewBuilding(); renderSidebar(); break; }
      case 'building-rooms-reset': { const live = Boolean(proposal?.buildingPreview); buildingOptions.rooms = null; buildingOptions.hub = null; buildingOptions.bands = null; buildingOptions.pick = null; clearProposal(); if (live) previewBuilding(); renderSidebar(); break; }
      // A click selects a room of the plan (Delete then takes it out); dragging swaps two.
      case 'building-cell': { const index = Number(metadata.id); buildingOptions.pick = buildingOptions.pick === index ? null : index; renderSidebar(); root.querySelector(`.building-sketch [data-action="building-cell"][data-id="${index}"]`)?.focus({ preventScroll: true }); break; }
      case 'building-cell-delete': {
        const plan = buildingPlan(), room = plan?.rooms[buildingOptions.pick]; if (!room) break;
        if (room.hub) { notify('O cômodo de entrada não sai da planta; troque-o de lugar ou escolha outro como entrada.', true); break; }
        const live = Boolean(proposal?.buildingPreview), bands = plan.arrangement.map(list => [...list]); let at = 0; for (const other of plan.rooms) { if (other === room) break; if (!other.hub && other.band === room.band) at++; }
        bands[room.band].splice(at, 1); buildingOptions = { ...buildingOptions, bands, rooms: bands.flat(), hub: plan.programme.hub, pick: null }; clearProposal(); if (live) previewBuilding(); renderSidebar(); break;
      }
      case 'building-room-drop': { const live = Boolean(proposal?.buildingPreview), list = [...buildingRooms()], at = list.lastIndexOf(metadata.id); if (at >= 0) list.splice(at, 1); buildingOptions = { ...buildingOptions, rooms: list, bands: null, pick: null }; clearProposal(); if (live) previewBuilding(); renderSidebar(); break; }
      // Growing the outline is shown in the scene at once, to be accepted or cancelled like any preview.
      case 'building-expand': { const needed = Number(metadata.id); if (buildingOptions.width >= buildingOptions.length) buildingOptions.width = needed; else buildingOptions.length = needed; clearProposal(); previewBuilding(); renderSidebar(); break; }
      case 'building-variation': buildingOptions.seed = (buildingOptions.seed + 1) % 4294967296; buildingOptions.bands = null; buildingOptions.pick = null; renderSidebar();
      // falls through
      case 'building-preview': previewBuilding(); break;
      case 'light-preview': {
        try { showAuthorshipProposal(proposeRoomLighting(store.document, { mood: ambienceOptions.mood, floorId: smartFloorId }, store.editVersion, assets)); }
        catch (error) { notify(error.message, true); } break;
      }
      case 'cables-preview': {
        try { ambienceOptions.cableSeed = (ambienceOptions.cableSeed ?? 0) + 1; showAuthorshipProposal(proposeRoomCables(store.document, { amount: ambienceOptions.amount, seed: ambienceOptions.cableSeed, floorId: smartFloorId }, store.editVersion, assets)); }
        catch (error) { notify(error.message, true); } break;
      }
      case 'details-variation': ambienceOptions.seed = (ambienceOptions.seed + 1) % 4294967296;
      // falls through
      case 'details-preview': {
        try { showAuthorshipProposal(proposeRoomDetails(store.document, { amount: ambienceOptions.amount, seed: ambienceOptions.seed, floorId: smartFloorId }, store.editVersion, assets)); }
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
      case 'decal-place': placing = { type: 'decal' }; clearProposal(); setTool('decal'); notify('Clique numa parede, piso ou objeto para colar o decalque. Esc cancela.'); break;
      case 'inspect-open': if (selection && locate()?.record.kind === 'prop') inspectionControl.open(selection); break;
      case 'inspect-page-add': case 'inspect-page-remove': case 'inspect-back-add': case 'inspect-back-remove': {
        const record = locate()?.record; if (!record?.inspectable) break;
        execute('entity.update', { id: record.id, patch: inspectableFieldPatch(record, action.slice(8), null, { page: Number(metadata.index) }), snap: false }, { label: 'Páginas do documento' }); break;
      }
      case 'clue-show': inspectionControl.show(metadata.id); break;
      case 'clue-inspect': inspectionControl.open(metadata.id); break;
      case 'clue-forget': if (metadata.id === inspectionControl.onProjector) inspectionControl.recall(); execute('clue.forget', { id: metadata.id }, { label: 'Esquecer pista' }); break;
      case 'projector-inspect-close': inspectionControl.recall(); break;
      case 'screen-line-add': case 'screen-line-remove': {
        const record = locate()?.record; if (!record?.screen) break;
        try { execute('entity.update', { id: record.id, patch: { screen: action === 'screen-line-add' ? screenLineAdd(record.screen) : screenLineRemove(record.screen, Number(metadata.index)) }, snap: false }); } catch (error) { notify(error.message, true); }
        break;
      }
      case 'cable-place': placing = { type: 'cable', from: null }; clearProposal(); setTool('cable'); notify('Clique no teto, numa viga, num duto, numa parede ou no chão (a ponta sobe até o teto) para a primeira ponta do cabo; depois, na segunda. Esc cancela.'); break;
      case 'stairs-place': placing = { type: 'stairs' }; clearProposal(); setTool('place'); notify('Clique no apoio para colocar a escada; ajuste desnível e degraus no inspetor.'); break;
      case 'ramp-place': placing = { type: 'ramp' }; clearProposal(); setTool('place'); notify('Clique no apoio para colocar a rampa; ajuste o desnível no inspetor.'); break;
      case 'duplicate-scene': return duplicateScene();
      case 'group-add': {
        const name = window.prompt('Nome da nova pasta:', 'Nova pasta');
        if (name !== null && name.trim()) {
          execute('group.add', { group: { name: name.trim() } });
          tab = 'elements';
          renderSidebar();
        }
        break;
      }
      case 'new': if (canSwitch()) { selection = null; clearProposal(); store.replace(createScene('Nova cena'), { saved: false }); setTool('select'); viewport.frameScene(); } break;
      case 'open': return openDialog();
      case 'sidebar-toggle': case 'inspector-toggle': togglePanel(action.split('-')[0]); break;
      case 'assets-close': assetsWindow.close(); break;
      case 'close-dialog': closeDialog(); break;
      case 'room-draw': clearProposal(); setTool('room'); document.getElementById('welcome').hidden = true; notify('Arraste no chão para desenhar o tamanho da sala.'); break;
      case 'accept-proposal': {
        const proposed = proposal; if (!proposed) return;
        if (execute('proposal.accept', { proposal: proposed })) {
          // The assistant stays with the building: the ground and paths laid around it are not rooms.
          clearProposal(); const floor = proposed.entities?.find(entity => entity.kind === 'floor' && !entity.tags?.includes(SURROUNDINGS_TAG));
          if (proposed.aroundPreview) viewport.frameScene();
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
      case 'fire-place': case 'smoke-place': case 'sparks-place': case 'drip-place': {
        const asset=assets.find(item=>item.id==='builtin-campfire');
        if(!asset) { notify('Modelo de fogueira indisponível.',true); break; }
        const kind={'fire-place':['Fogueira',()=>clone(LOCAL_EFFECT_DEFAULTS)],'smoke-place':['Fumaça',smokeDefaults],'sparks-place':['Faíscas',sparksDefaults],'drip-place':['Goteira',dripDefaults]}[action];
        placing={type:'prop',asset:{...asset,name:kind[0]},localEffect:kind[1]()}; setTool('place'); if(action==='drip-place')notify('Clique no chão sob o ponto de onde a água pinga; a goteira sobe até o teto do cômodo.'); break;
      }
      case 'spot-place': placing = { type: 'light', lightType: 'spot' }; setTool('place'); break;
      case 'light-place': placing = { type: 'light' }; setTool('place'); break;
      case 'object-delete': { const found = locate();
        if (found?.record.kind === 'floor' && describeBuilding(store.document, selection, assets)) { if (confirm(`Remover ${found.record.name} do prédio? As paredes divididas com os vizinhos ficam. Esta ação pode ser desfeita.`)) execute('proposal.accept', { proposal: proposeRemoveRoom(store.document, { floorId: selection }, store.editVersion) }); break; } if (found && confirm(found.type === 'group' ? 'Excluir a composição e todos os seus objetos? Esta ação pode ser desfeita.' : found.record.kind === 'floor' ? 'Excluir o piso e todos os elementos apoiados nele? Esta ação pode ser desfeita.' : found.record.kind === 'wall' ? 'Excluir esta parede e suas portas? Esta ação pode ser desfeita.' : 'Excluir este elemento? Esta ação pode ser desfeita.')) execute(found.type === 'group' ? 'group.delete' : `${found.type}.remove`, { id: selection }); break; }
      case 'material-copy': return sampleMaterial();
      case 'ruler-clear': viewport.clearMeasurement(); break;
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
      // From above a roof hides the whole building, so the top view lifts it unless the person chose otherwise.
      case 'perspective': viewport.setTopView(false); topView = false; syncRoofs(); break;
      case 'top': viewport.setTopView(true); topView = true; syncRoofs(); break;
      case 'roofs': roofsChoice = !(roofsChoice ?? !topView); syncRoofs(); break;
      case 'frame': if (selection) viewport.frameSelection(selection); else viewport.frameScene(); break;
      case 'frame-selection': if (selection) viewport.frameSelection(selection); break;
      case 'cutaway': cutaway = !cutaway; viewport.setCutaway(cutaway); root.querySelector('[data-action="cutaway"]').classList.toggle('active', cutaway); broadcast(); break;
      case 'camera-save': { const camera = { ...viewport.getCamera(), id: id(), name: `Enquadramento ${Object.keys(store.document.cameraPresets).length + 1}` }; execute('camera.save', { camera }); notify('Enquadramento salvo na cena.'); break; }
      case 'view-tag': if (document.getElementById('view-tag').dataset.state === 'offset') { viewport.stopCameraMotion(); publishCamera(viewport.getCamera()); notify('Câmera publicada na segunda tela.'); } break;
      case 'shortcuts': toggleShortcuts(); break;
      case 'settings': toggleSettings(); break;
      case 'ambience': toggleAmbience(); break;
      case 'initiative-start': { const ids = Object.keys(store.document.tokens ?? {}); if (ids.length) execute('initiative.update', { initiative: startInitiative(ids.map(tokenId => ({ tokenId, value: 0 }))) }, { label: 'Começar combate' }); break; }
      case 'initiative-next': passTurn(1); break;
      case 'area-draw': if (tool === 'area') setTool('select'); else { viewport.setAreaTool(areaTool); setTool('area'); notify('Arraste no chão a partir do centro ou da origem da área. Esc cancela.'); } renderSidebar(); break;
      case 'highlight-interactives': { highlightCount++; const count = viewport.highlightInteractives(3); if (hasPresentation()) sendPresentation('highlight', { seconds: 3 }); if (!count) notify('Nada interativo à vista: portas aparecem sempre; marque objetos em Propriedades → Organização → Interativo.'); break; }
      case 'areas-clear': if (store.document.sessionState?.areas) execute('areas.clear', {}, { label: 'Apagar áreas' }); break;
      case 'initiative-prev': passTurn(-1); break;
      case 'initiative-add': { const initiative = store.document.sessionState?.initiative; if (!initiative) break; const turn = initiative.order[initiative.current]?.tokenId, missing = Object.keys(store.document.tokens ?? {}).filter(id => !initiative.order.some(entry => entry.tokenId === id)); const next = startInitiative([...initiative.order, ...missing.map(tokenId => ({ tokenId, value: 0 }))]); execute('initiative.update', { initiative: { ...next, round: initiative.round, current: Math.max(0, next.order.findIndex(entry => entry.tokenId === turn)) } }, { label: 'Incluir no combate' }); break; }
      case 'initiative-end': if (store.document.sessionState?.initiative) execute('initiative.update', { initiative: null }, { label: 'Encerrar combate' }); break;
      case 'live-camera': setLiveCamera(!liveCamera.enabled); break;
      case 'ambience-close': toggleAmbience(false); break;
      case 'token-closeup': closeUp(selection); break;
      case 'token-follow': { const following = viewport.cinemaInfo().follow === selection; viewport.setFollow(following ? null : selection); notify(following ? 'A câmera parou de seguir o personagem.' : 'A câmera segue o personagem. WASD solta a câmera.'); renderInspector(); if (tab === 'shots') renderSidebar(); break; }
      case 'token-flashlight': { const token = store.document.tokens?.[selection]; if (!token) break; execute('token.update', { id: token.id, patch: { flashlight: { ...FLASHLIGHT_DEFAULTS, ...token.flashlight, enabled: !token.flashlight?.enabled } } }, { label: token.flashlight?.enabled ? 'Apagar lanterna' : 'Acender lanterna' }); break; }
      case 'copy-link': {
        const doc = store.document;
        if (doc.revision === 0) { notify('Salve a cena para ter um link que a abre de novo.', true); break; }
        const url = new URL(location.href); for (const name of ['scene', 'map', 'example', 'shot']) url.searchParams.delete(name);
        url.searchParams.set(doc.documentType === 'map' ? 'map' : 'scene', doc.id);
        try { await navigator.clipboard.writeText(url.toString()); notify('Link copiado.'); } catch { notify(url.toString()); }
        break;
      }
      case 'command-palette': palette.open(); break;
      case 'title-card': {
        if (!hasPresentation()) { notify('Abra a segunda tela para mostrar a cartela.', true); break; }
        sendPresentation('title', { titleSequence: ++titleSequence, title: titleCard.title.trim() || store.document.name, subtitle: titleCard.subtitle.trim(), accent: accentFor(store.document.look ?? store.document.defaultLook), duration: titleCard.duration });
        notify('Cartela enviada ao projetor.'); break;
      }
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
    if (action.startsWith('tool-')) { if (action === 'tool-measure') clearProposal(); setTool(action.slice(5)); }
  }
  root.addEventListener('click', (event) => {
    if (!initialized) return;
    if (!event.target.closest('#context-menu')) hideContextMenu();

    const contextBtn = event.target.closest('[data-context]');
    if (contextBtn && contextTarget) {
      const action = contextBtn.dataset.context;
      const targetId = contextTarget;
      hideContextMenu();
      if (action === 'inspect') inspectionControl.open(targetId);
      else if (action === 'anchor') act('assembly-bind');
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

    // Light switches: a folder (with its subfolders) or one record, one step in the history.
    const groupLights = event.target.closest('[data-group-lights]');
    if (groupLights) { const on = groupLights.dataset.state === 'off'; execute('lights.switch', { groupId: groupLights.dataset.groupLights, enabled: on }, { label: on ? 'Acender luzes da pasta' : 'Apagar luzes da pasta' }); return; }
    const entryLight = event.target.closest('[data-entry-light]');
    if (entryLight) { const on = entryLight.dataset.state === 'off'; execute('lights.switch', { ids: [entryLight.dataset.entryLight], enabled: on }, { label: on ? 'Acender luz' : 'Apagar luz' }); return; }
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
    // The "?" sits in the title of a task: it opens the tutorial without folding the task.
    if (node.dataset.action === 'tutorial-help') event.preventDefault();
    if (node.dataset.action) { Promise.resolve(act(node.dataset.action, node.dataset)).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.treeKind) { treeFilter.kind = treeFilter.kind === node.dataset.treeKind ? 'all' : node.dataset.treeKind; renderSidebar(); return; }
    if (node.dataset.groupCollapse) { const key = node.dataset.groupCollapse; if (collapsedTreeGroups.has(key)) collapsedTreeGroups.delete(key); else collapsedTreeGroups.add(key); renderSceneTreeIfVisible(); return; }
    if (node.dataset.bar) { useSelectionBar(node.dataset.bar); return; }
    if (node.dataset.inspectorTabButton) { selectInspectorTab(node.dataset.inspectorTabButton); return; }
    if (node.dataset.tab) {
      if (node.dataset.tab === 'assets') { renderAssets(); assetsWindow.open(); document.getElementById('asset-search').focus({preventScroll:true}); }
      else {
        assetsWindow.close();
        const shell = root.querySelector('.app-shell');
        // A place always opens the drawer; a double click on the active place collapses it (see the dblclick listener).
        tab = node.dataset.tab; if (shell.classList.contains('sidebar-collapsed')) togglePanel('sidebar'); renderSidebar();
        syncPanelToggles();
      }
      return;
    }
    if (node.dataset.areaColor) { areaTool = { ...areaTool, color: node.dataset.areaColor }; viewport.setAreaTool(areaTool); renderSidebar(); return; }
    if (node.dataset.areaRemove) { execute('area.remove', { id: node.dataset.areaRemove }, { label: 'Apagar área' }); return; }
    if (node.dataset.initiativeRemove) { const initiative = store.document.sessionState?.initiative; if (initiative) { const turn = initiative.order[initiative.current]?.tokenId, order = initiative.order.filter(entry => entry.tokenId !== node.dataset.initiativeRemove); execute('initiative.update', { initiative: order.length ? { ...initiative, order, current: Math.max(0, Math.min(order.length - 1, order.findIndex(entry => entry.tokenId === turn) >= 0 ? order.findIndex(entry => entry.tokenId === turn) : initiative.current)) } : null }, { label: 'Tirar do combate' }); } return; }
    if (node.dataset.dialogTab) { dialogTab = node.dataset.dialogTab; renderDialogContent(); observeGalleryCards(); return; }
    if (node.dataset.select) { selectObject(node.dataset.select, event.shiftKey); return; }
    if (node.dataset.asset) {
      const asset = assets.find((item) => item.id === node.dataset.asset);
      assetsWindow.close(); if(window.innerWidth<=900) {root.querySelector('.app-shell').classList.add('sidebar-collapsed');syncPanelToggles();} beginAssetPlacement(asset); return;
    }
    if (node.dataset.environmentPreview) { try { previewEnvironment(node.dataset.environmentPreview); } catch (error) { notify(error.message, true); } return; }
    if (node.dataset.environment) { execute('environment.apply', { presetId: node.dataset.environment }); return; }
    if (node.dataset.camera || node.dataset.cameraCut) { takeShot(store.document.cameraPresets[node.dataset.camera ?? node.dataset.cameraCut], { cut: Boolean(node.dataset.cameraCut) }); return; }
    if (node.dataset.cameraRehearse) { takeShot(store.document.cameraPresets[node.dataset.cameraRehearse], { rehearse: true }); return; }
    if (node.hasAttribute('data-dock-hide')) { dockHidden = true; renderShotDock(); return; }
    if (node.dataset.dockStep) { dockIndex += Number(node.dataset.dockStep); renderShotDock(); return; }
    if (node.dataset.dockSelect) { dockIndex = Number(node.dataset.dockSelect); renderShotDock(); return; }
    if (node.dataset.cameraDelete) { execute('camera.remove', { id: node.dataset.cameraDelete }); return; }
    if (node.dataset.welcomeOpen) { openScene(node.dataset.welcomeOpen).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.welcomeExample) { openExample(node.dataset.welcomeExample).catch((error) => notify(error.message, true)); return; }
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
        beginAssetPlacement(asset);
        closeDialog();
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
  bindControls(root, input => { if (initialized) changeField(input); });
  // Rooms of the building plan are rearranged by dragging one onto another.
  const planCell = target => target.closest?.('.building-sketch [data-action="building-cell"]');
  let draggedRoom = null;
  root.addEventListener('dragstart', event => { const cell = planCell(event.target); if (!cell) return; draggedRoom = Number(cell.dataset.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', cell.title); cell.classList.add('picked'); });
  root.addEventListener('dragover', event => { const cell = planCell(event.target); if (draggedRoom == null || !cell) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; for (const other of root.querySelectorAll('.building-sketch .drop')) if (other !== cell) other.classList.remove('drop'); if (Number(cell.dataset.id) !== draggedRoom) cell.classList.add('drop'); });
  root.addEventListener('drop', event => { const cell = planCell(event.target); if (draggedRoom == null || !cell) return; event.preventDefault(); const from = draggedRoom; draggedRoom = null; swapBuildingRooms(from, Number(cell.dataset.id)); });
  root.addEventListener('dragend', () => { if (draggedRoom == null) return; draggedRoom = null; root.querySelectorAll('.building-sketch .drop, .building-sketch .picked').forEach(node => node.classList.remove('drop', 'picked')); });
  new MutationObserver(() => paintSwatches(root)).observe(root, { childList: true, subtree: true });
  root.addEventListener('change', (event) => {
    if (!initialized) return;
    if (event.target.dataset.assetFilter) { libraryFilters[event.target.dataset.assetFilter] = event.target.value; libraryLimit = 24; renderAssetCards(); }
    else if (event.target.id === 'asset-tag-filter') { if (event.target.value && !libraryFilters.tags.includes(event.target.value)) libraryFilters.tags.push(event.target.value); libraryLimit = 24; renderSidebar(); }
    else if (event.target.id === 'asset-favorites') { libraryFilters.favorites = event.target.checked; libraryLimit = 24; renderAssetCards(); }
    else if (event.target.id === 'asset-file') { importAsset(event.target.files[0]); event.target.value = ''; }
    else if (event.target.id === 'document-json-file') { importJson(event.target.files[0]); event.target.value = ''; }
    else if (event.target.dataset.field) changeField(event.target);
    else if (event.target.id === 'scene-name') execute('scene.rename', { name: event.target.value });
    else if (event.target.dataset.initiativeValue) { const initiative = store.document.sessionState?.initiative; if (initiative) execute('initiative.update', { initiative: setInitiativeValue(initiative, event.target.dataset.initiativeValue, Number(event.target.value)) }, { label: 'Iniciativa' }); }
  });
  root.addEventListener('input', (event) => {
    if (event.target.id === 'tree-search') { treeFilter.search = event.target.value; renderSceneTreeIfVisible(); return; }
    if (event.target.dataset.field === 'preset-name') changeField(event.target);
    // Camera sliders act while dragging: the blur and the smoothing are judged by eye.
    if (/^camera-(focus-aperture|focus-distance|smoothing|motion-speed|live-smoothing)$/.test(event.target.dataset.range ?? '')) { const number = event.target.closest('.range-field')?.querySelector('[data-field]'); if (number) { number.value = event.target.value; changeField(number); } }
    if (event.target.id === 'asset-search') { libraryFilters.search = event.target.value; libraryLimit = 24; renderAssetCards(); }
  });
  root.addEventListener('submit', (event) => {
    if (event.target.id === 'quick-form') { event.preventDefault(); makeProposal(); }
    else if (event.target.id === 'asset-metadata-form') { event.preventDefault(); saveAssetClassification(event.target); }
  });
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="door-toggle"]') && locate()?.record.kind === 'door') toggleDoor(selection);
  });
  /** A closed door opens a quarter turn, an open one closes. On a map, the angle it starts with. */
  function toggleDoor(id) {
    const door = store.document.layout.entities[id], angle = store.document.sessionState?.doors?.[id] ?? door.initialAngle ?? 0, next = Math.abs(angle) < .1 ? Math.PI / 2 : 0;
    if (store.document.documentType === 'map') return execute('entity.update', { id, patch: { initialAngle: next } }, { label: next ? 'Abrir porta' : 'Fechar porta' });
    return execute('door.setAngle', { id, angle: next }, { label: next ? 'Abrir porta' : 'Fechar porta' });
  }
  /**
   * E, as at a table: open or close a door, light or put out a lamp, pick up a document to read it. What is under the
   * pointer comes first, so pointing and pressing is enough; otherwise the selection. Several lights go together: all
   * on if any is off. A document is read alone: it wins over doors and lights in the same gesture.
   */
  function interact() {
    const doc = store.document, lights = doc.look ?? doc.defaultLook, recordOf = id => doc.layout.entities[id] ?? lights.lights?.[id];
    const readable = id => Boolean(doc.layout.entities[id]?.inspectable);
    const usable = id => doc.layout.entities[id]?.kind === 'door' || recordLightOn(recordOf(id)) !== null || readable(id);
    const hovered = viewport.entityAtPointer?.(), ids = hovered && usable(hovered) ? [hovered] : [...(selectedIds.size ? selectedIds : selection ? [selection] : [])].filter(usable);
    if (!ids.length) { notify('Aponte para uma porta, um objeto que acende ou um documento e aperte E (ou selecione e aperte E).'); return; }
    const paper = ids.find(readable); if (paper) { hideContextMenu(); inspectionControl.open(paper); return; }
    for (const id of ids.filter(id => doc.layout.entities[id]?.kind === 'door')) toggleDoor(id);
    const lamps = ids.filter(id => recordLightOn(recordOf(id)) !== null);
    if (lamps.length) { const on = lamps.some(id => !recordLightOn(recordOf(id))); execute('lights.switch', { ids: lamps, enabled: on }, { label: on ? 'Acender luz' : 'Apagar luz' }); }
  }
  window.addEventListener('keydown', (event) => {
    if (!initialized) return;
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!isPresentation) palette.open(); return; }
    if (palette.isOpen) return;
    if (event.key === 'Escape') {
      if (document.getElementById('asset-metadata-dialog').open) return;
      if (document.getElementById('shortcuts-sheet').open) { toggleShortcuts(false); return; }
      if (document.getElementById('settings-dialog').open) { toggleSettings(false); return; }
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
    if (!document.getElementById('shot-dock').hidden && ['select', 'move', 'rotate', 'scale'].includes(tool) && !proposal && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const list = presets();
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); dockIndex += event.key === 'ArrowRight' ? 1 : -1; renderShotDock(); return; }
      if (event.key === 'Enter') { event.preventDefault(); takeShot(list[dockIndex], { cut: event.shiftKey }); return; }
      if (/^[1-9]$/.test(event.key) && list[Number(event.key) - 1]) { event.preventDefault(); takeShot(list[Number(event.key) - 1], { cut: true }); return; }
    }
    if (isPresentation) return;
    if (event.key === '?') { event.preventDefault(); toggleShortcuts(); return; }
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
    if (event.key.toLowerCase() === 'l' && !isPresentation) { event.preventDefault(); act('live-camera'); return; }
    if (event.key.toLowerCase() === 'n' && store.document.sessionState?.initiative) { event.preventDefault(); act('initiative-next'); return; }
    if (event.key.toLowerCase() === 'h') { event.preventDefault(); act('highlight-interactives'); return; }
    if (event.key.toLowerCase() === 'e') { event.preventDefault(); interact(); return; }
    const keys = { q: 'select', g: 'move', r: 'rotate', v: 'scale', m: 'measure' };
    if (keys[event.key.toLowerCase()]) { if (keys[event.key.toLowerCase()] === 'measure') act('tool-measure'); else setTool(keys[event.key.toLowerCase()]); }
    if (event.key.toLowerCase() === 'f') act('frame');
    if (event.key === 'Delete' || event.key === 'Backspace') { if (buildingOptions.pick != null && document.activeElement?.closest?.('.building-sketch')) { event.preventDefault(); act('building-cell-delete'); } else act('object-delete'); }
  });

  root.querySelector('.rail-tabs').addEventListener('dblclick', event => { const node = event.target.closest('[data-tab]'); if (node?.dataset.tab === tab) togglePanel('sidebar'); });

  const stage = document.getElementById('viewport');
  stage.addEventListener('pointerdown', () => { pointerHeld = true; scheduleSelectionBar(); }, true);
  for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, () => { if (pointerHeld) { pointerHeld = false; holdSelectionBar(); } });
  const inspectorPanel = document.getElementById('inspector-content');
  inspectorPanel.addEventListener('dblclick', event => { if (!event.target.closest('.inspector-hero strong')) return; const field = inspectorPanel.querySelector('[data-field="object-name"]'); if (field) { revealNode(field); field.focus(); field.select(); } });
  inspectorPanel.addEventListener('keydown', event => {
    const tabButton = event.target.closest('[data-inspector-tab-button]'); if (!tabButton || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const buttons = [...inspectorPanel.querySelectorAll('[data-inspector-tab-button]')], next = buttons[(buttons.indexOf(tabButton) + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
    event.preventDefault(); next.click(); next.focus();
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
  window.addEventListener('pagehide', () => { exampleObserver?.disconnect();previews.dispose(); flushDraft(); store.dispose();performanceDiagnostics.dispose();channel?.close(); viewport.destroy(); repository.dispose?.(); });
  window.addEventListener('beforeunload', (event) => { if (store.dirty) { event.preventDefault(); event.returnValue = ''; } });

  const initial = await Promise.allSettled([repository.assets(), repository.list('scene',{previews:false}), repository.list('map',{previews:false}), drafts.read(), repository.list('environment',{previews:false}), brushPresetRepository.list()]);
  if (initial[0].status === 'fulfilled') assets = initial[0].value; else notify(repository.storage==='browser'?`Não foi possível carregar os assets: ${initial[0].reason.message}`:'O servidor local está indisponível. Inicie com npm run dev ou npm start; o trabalho continua como rascunho.', true, true);
  if (initial[1].status === 'fulfilled') savedScenes = initial[1].value;
  if (initial[2].status === 'fulfilled') savedMaps = initial[2].value;
  if (initial[3].status === 'fulfilled') recovery = initial[3].value;
  if (initial[4].status === 'fulfilled') savedEnvironments = initial[4].value;
  if (initial[5].status === 'fulfilled') brushPresets = initial[5].value;
  else brushPresetsError = 'Não foi possível ler os pincéis pessoais. Verifique o armazenamento do navegador e tente salvar novamente.';
  viewport.setAssets(assets);
  const linkParams = new URLSearchParams(location.search), linkedId = linkParams.get('scene') ?? linkParams.get('map');
  const lastId = linkedId ?? lastScene.read();
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
  const tutor = createTutor(root, { state: tutorialState, open: name => { tab = name; renderSidebar(); }, project: point => viewport.project(point), afterLesson }); tutor.onChange(renderTutorials); renderTutorials(); window.tabletopTutor = tutor;
  store.subscribe(updateView); store.subscribe(renderTutorials); updateView({ type: 'saved' }); viewport.frameScene();
  const firstCamera = Object.values(store.document.cameraPresets || {})[0]; if (firstCamera) viewport.setCamera(firstCamera);
  previews.schedule();
  // Direct links from notes and other apps: they open a scene and may rehearse a shot, but never publish it to the projector.
  if (linkedId && store.document.id !== linkedId) notify('Não encontrei a cena ou o mapa deste link. Abrindo sua mesa normalmente.', true);
  const linkedShot = linkParams.get('shot');
  if (linkedId && linkedShot) { const preset = store.document.cameraPresets?.[linkedShot]; if (preset) { viewport.setCamera(preset); rehearsedId = preset.id; scheduleViewTag(); } else notify('A tomada deste link não existe mais.', true); }
  const linkedExample = linkParams.get('example');
  if (linkedExample) { if (EXAMPLE_SCENES.some(item => item.id === linkedExample)) openExample(linkedExample).catch(error => notify(error.message, true)); else notify('Não encontrei o exemplo deste link.', true); }
  if (recovery) {
    document.getElementById('recovery-description').textContent = `“${recovery.document.name}” possui um rascunho local de ${new Date(recovery.savedAt).toLocaleString('pt-BR')}. Restaurar não sobrescreve a versão salva ${repository.storage==='browser'?'neste navegador':'no servidor'}.`;
    document.getElementById('recovery-dialog').showModal();
  }
  // Read-only diagnostics for browser verification; no backdoor mutations.
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('diagnostics')) {
    Object.defineProperty(window, '__tabletop', { value: Object.freeze({ snapshot: () => clone(store.document), ready:()=>viewport.ready(), project: (position) => viewport.project(position), camera: () => viewport.getCamera(), stats: () => viewport.getInfo(), performance:()=>({app:performanceDiagnostics.snapshot(),viewport:viewport.performance(),store:store.performance(),previews:previews.info()}), resetPerformance:()=>{performanceDiagnostics.reset();viewport.resetPerformance();store.resetPerformance();}, editVersion: () => store.editVersion, copy: () => copySelection(), paste: () => pasteClipboard() }), configurable: true });
  }
}

function startPresentation(root, sessionId) {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(sessionId)) throw new Error('Endereço de apresentação inválido.');
  if (typeof BroadcastChannel !== 'function') throw new Error('Este navegador não suporta a apresentação em segunda janela.');
  document.body.classList.add('presentation-window');
  let brandAccent = applyUiTheme(readUiTheme(uiThemeKey));
  window.addEventListener('storage', event => { if (event.key === uiThemeKey) brandAccent = applyUiTheme(readUiTheme(uiThemeKey)); });
  root.innerHTML = `<div id="presentation-viewport"></div><div class="letterbox" aria-hidden="true"><i></i><i></i></div><div id="presentation-message" class="presentation-message">Aguardando a cena do mestre…</div><div id="title-layer" class="title-layer" aria-live="polite"></div><div id="initiative-layer" class="initiative-strip is-projector" hidden></div><div class="projector-controls"><select id="presentation-quality" aria-label="Qualidade da iluminação"><option value="economy">Econômica</option><option value="balanced" selected>Equilibrada</option><option value="high">Alta</option></select><button id="presentation-effects" class="presentation-fullscreen" title="Névoa e efeitos nesta janela" aria-label="Névoa e efeitos nesta janela" aria-pressed="true">${icon('light')}</button><button id="presentation-fullscreen" class="presentation-fullscreen" title="Tela cheia" aria-label="Tela cheia">${icon('frame')}</button></div>`;
  const viewport = createViewport(document.getElementById('presentation-viewport'), {
    onError: (error) => { document.getElementById('presentation-message').textContent = error.message; },
    onInspection: event => { if (event.type === 'closed') { if (inspected?.entityId === event.entityId) { inspected = null; inspectionOverlay.hide(); } } else renderInspection(); },
    navigationEnabled: false,
  });
  viewport.setPresentation(true);
  // The master's inspection, followed: the same object, turned the same way, smoothed.
  const inspectionOverlay = createInspectionOverlay(document.getElementById('presentation-viewport'), { interactive: false });
  let inspected = null, lastInspect = 0, readingKey = '';
  function renderInspection() {
    const record = inspected && shown?.layout.entities[inspected.entityId];
    if (!record) return;
    const state = viewport.inspectionState(), pages = record.inspectable?.kind === 'document' ? record.inspectable.pages.length : 0, side = state?.side ?? 'front';
    inspectionOverlay.show({ title: record.inspectable?.title || record.name, page: inspected.page ?? 0, pages, side });
    const key = inspected.reading && pages ? `${record.id}|${inspected.page}|${side}|${JSON.stringify(record.inspectable.pages[inspected.page] ?? null)}` : '';
    if (key === readingKey) return;
    readingKey = key;
    if (!key) inspectionOverlay.read(null);
    else viewport.pageCanvas(record.id, inspected.page ?? 0, side).then(canvas => { if (readingKey === key && canvas) inspectionOverlay.read(canvas); });
  }
  function followInspection(state) {
    if (!state || typeof state.entityId !== 'string') { inspected = null; readingKey = ''; viewport.closeInspection(); inspectionOverlay.hide(); return; }
    inspected = state;
    if (!shown?.layout.entities[state.entityId]) return;
    viewport.inspect(state.entityId, state); renderInspection();
  }
  if (new URLSearchParams(location.search).has('diagnostics')) {
    Object.defineProperty(window, '__tabletop', { value: Object.freeze({ camera: () => viewport.getCamera(), stats: () => viewport.getInfo() }), configurable: true });
  }
  const channel = new BroadcastChannel(`tabletop-presentation-${sessionId}`);
  let sequence = 0, receivedCameraSequence = null, shown = null;
  const receiverId=id();
  const request = () => channel.postMessage({ version: 1, sessionId, type: 'ready',receiverId });
  const heartbeat=setInterval(()=>channel.postMessage({version:1,sessionId,type:'heartbeat',receiverId}),5000);
  const retry = setInterval(request, 1500);
  let lastTitle = 0;
  // The turn order over the image, with the portraits the master's scene uses.
  function showInitiative(data) {
    const layer = document.getElementById('initiative-layer'), urls = new Map((data.assets ?? []).map(asset => [`${asset.id}@${asset.revision}`, asset.previewUrl ?? asset.url]));
    const doc = data.document, portrait = tokenId => { const token = doc.tokens?.[tokenId], ref = token?.visualOverride?.assetRef ?? doc.actors?.[token?.actorId]?.assetRef; return ref ? urls.get(`${ref.id}@${ref.revision}`) ?? null : null; };
    const html = initiativeStrip(doc, portrait); if (layer.innerHTML !== html) layer.innerHTML = html; layer.hidden = !html;
  }
  const clean = (text, limit = 120) => typeof text === 'string' ? text.slice(0, limit) : '';
  // A title card over the image: sanitized text only, in the accent of the scene.
  function showTitleCard(data) {
    const layer = document.getElementById('title-layer'), duration = Math.min(12, Math.max(2, Number(data.duration) || 4)), accent = /^#[0-9a-f]{6}$/i.test(data.accent ?? '') ? data.accent : brandAccent;
    layer.replaceChildren();
    const card = document.createElement('div'); card.className = 'title-card is-in'; card.style.setProperty('--card-accent', accent);
    const subtitle = clean(data.subtitle); if (subtitle) { const tag = document.createElement('span'); tag.className = 'tt-tag'; tag.textContent = subtitle; card.append(tag); }
    const heading = document.createElement('h1'); heading.className = 'tt-display'; heading.textContent = clean(data.title); card.append(heading);
    const rule = document.createElement('i'); rule.className = 'title-rule'; card.append(rule);
    layer.append(card);
    setTimeout(() => card.classList.replace('is-in', 'is-out'), duration * 1000);
    setTimeout(() => card.remove(), duration * 1000 + 700);
  }
  channel.onmessage = (event) => {
    const data = event.data;
    if (data?.version === 1 && data.sessionId === sessionId && data.type === 'title') { if (Number.isFinite(data.titleSequence) && data.titleSequence > lastTitle && clean(data.title)) { lastTitle = data.titleSequence; showTitleCard(data); } return; }
    // Live look: laid over the last scene received, until the committed snapshot replaces it.
    if (data?.version === 1 && data.sessionId === sessionId && data.type === 'look') {
      if (!shown || data.sequence <= sequence || !data.look || typeof data.look !== 'object') return;
      const look = shown.look ?? shown.defaultLook, next = { ...look };
      for (const field of ENVIRONMENT_FIELDS) if (data.look[field] !== undefined) next[field] = data.look[field];
      if (data.key?.id && look.lights[data.key.id]) next.lights = { ...look.lights, [data.key.id]: { ...look.lights[data.key.id], color: data.key.color, intensity: data.key.intensity, enabled: data.key.enabled, rotation: data.key.rotation } };
      try { viewport.setLiveLook(next); } catch (error) { console.warn(error); }
      return;
    }
    if (data?.version === 1 && data.sessionId === sessionId && data.type === 'inspect') {
      if (!Number.isFinite(data.inspectSequence) || data.inspectSequence <= lastInspect) return;
      lastInspect = data.inspectSequence; followInspection(data.inspect); return;
    }
    // Live camera: approach the master's camera, smoothed, instead of cutting.
    if (data?.version === 1 && data.sessionId === sessionId && data.type === 'highlight') { if (shown) viewport.highlightInteractives(Math.min(10, Math.max(1, Number(data.seconds) || 3))); return; }
    if (data?.version === 1 && data.sessionId === sessionId && data.type === 'live-token') { if (shown && data.sequence > sequence) viewport.previewToken(data.tokenId, data.position); return; }
    if (data?.version === 1 && data.sessionId === sessionId && data.type === 'live-camera') {
      if (receivedCameraSequence === null || data.sequence <= sequence || !data.camera) return;
      viewport.setCutaway(data.cutaway); viewport.setCameraGoal(data.camera, Math.min(2, Math.max(.1, Number(data.smoothing) || .6))); receivedCameraSequence = data.cameraSequence; return;
    }
    if (data?.version !== 1 || data.sessionId !== sessionId || !['snapshot','camera','view'].includes(data.type) || data.sequence <= sequence) return;
    try {
      if(data.type==='snapshot'){validateDocument(data.document);viewport.setAssets(data.assets);shown=trustSnapshot(data.document);viewport.setDocument(shown);showInitiative(data);document.title=`${data.document.name} — apresentação`;if(inspected)followInspection(inspected);}
      else if(receivedCameraSequence===null){request();return;}
      sequence=data.sequence;viewport.setCutaway(data.cutaway);document.body.classList.toggle('letterboxed',data.letterbox===true);
      if (data.camera && data.cameraSequence !== receivedCameraSequence) {
        const duration = receivedCameraSequence === null ? 0 : Number(data.cameraDuration) || 0;
        viewport.setCamera(data.camera, { duration }); receivedCameraSequence = data.cameraSequence;
      }
      document.getElementById('presentation-message').hidden = true; clearInterval(retry);
    } catch (error) { document.getElementById('presentation-message').textContent = error.message; }
  };
  // The controls fade away after a moment without the pointer, so nothing sits over the projected image.
  let idleTimer;
  const wake = () => { document.body.classList.remove('controls-idle'); clearTimeout(idleTimer); idleTimer = setTimeout(() => document.body.classList.add('controls-idle'), 2500); };
  for (const type of ['mousemove', 'keydown', 'pointerdown', 'focusin']) window.addEventListener(type, wake);
  wake();
  let effectsEnabled = true;
  document.getElementById('presentation-quality').onchange=e=>viewport.setLightingQuality(e.target.value);
  document.getElementById('presentation-effects').onclick = event => { effectsEnabled = !effectsEnabled; viewport.setEffectsEnabled(effectsEnabled); event.currentTarget.setAttribute('aria-pressed', String(effectsEnabled)); };
  document.getElementById('presentation-fullscreen').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  window.addEventListener('pagehide', () => { clearInterval(retry);clearInterval(heartbeat);clearTimeout(idleTimer);channel.postMessage({version:1,sessionId,type:'closed',receiverId});channel.close();viewport.destroy(); });
  request();
}
