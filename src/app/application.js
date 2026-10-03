import { createScene, createMap, createSceneFromMap, createMapFromScene, createEntity, createToken, createLight, clone, id, validateDocument, duplicateDocument, migrateDocument } from '../domain/documents.js';
import { polygonSize, groupChain, isSupport, isAccess, supportHeightAt, constrainOpening } from '../domain/geometry.js';
import { quaternionFromYaw, yawFromQuaternion } from '../domain/coords.js';
import { ENVIRONMENTS } from '../domain/environments.js';
import { createSceneStore } from '../state/scene-store.js';
import { proposeRoom } from '../authoring/quick-build.js';
import { proposeFurnishing } from '../authoring/furnishing.js';
import { proposePolish } from '../authoring/polish.js';
import { constructionPanel, smartBuildPanel, polishPanel, proposalReport } from '../ui/authoring-panels.js';
import { createViewport } from '../render/renderer.js';
import { repository, ApiError } from '../data/api.js';
import { drafts } from '../data/drafts.js';
import { icon, escapeHTML as esc } from '../ui/icons.js';
import { projectPresentation, presentationAssets } from './presentation.js';

const button = (action, label, glyph, className = '', extra = '') => `<button type="button" data-action="${action}" class="${className}" ${extra}>${glyph ? icon(glyph) : ''}<span>${label}</span></button>`;
const numberField = (field, label, value, { min, max, step = .1 } = {}) => `<label class="field"><span>${label}</span><input type="number" data-field="${field}" value="${Number(value).toFixed(3).replace(/\.?0+$/, '') || '0'}" step="${step}" ${min === undefined ? '' : `min="${min}"`} ${max === undefined ? '' : `max="${max}"`} /></label>`;
const colorField = (field, label, value) => `<label class="field color-field"><span>${label}</span><input type="color" data-field="${field}" value="${esc(value)}" /></label>`;
const checkField = (field, label, checked) => `<label class="check"><input type="checkbox" data-field="${field}" ${checked ? 'checked' : ''}/><span>${label}</span></label>`;
const contentJSON = (doc) => { const { revision, createdAt, updatedAt, ...body } = doc; return JSON.stringify(body); };
const entryName = (doc, entry) => doc.actors?.[entry.actorId]?.name ?? entry.name;
const lastScene = {
  read() { try { return localStorage.getItem('tabletop-last-scene'); } catch { return null; } },
  write(value) { try { localStorage.setItem('tabletop-last-scene', value); } catch { /* Optional preference, independent of a confirmed disk write. */ } },
};

export async function startApplication() {
  const root = document.getElementById('app');
  const presentationId = new URLSearchParams(location.search).get('presentation');
  if (presentationId) return startPresentation(root, presentationId);
  root.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <a class="brand" href="/" aria-label="Tabletop"><span class="brand-mark">T</span><span>TABLETOP<small>CRIAR. PREPARAR. APRESENTAR.</small></span></a>
        <div class="document-heading"><span id="doc-type-eyebrow" class="eyebrow">SUA MESA / CENA</span><input id="scene-name" aria-label="Nome da cena" maxlength="256" disabled /></div>
        <div class="header-actions"><span id="save-status" role="status" class="save-status"></span>${button('new', 'Nova', 'plus', 'quiet')}${button('open', 'Abrir', 'folder', 'quiet')}${button('present', 'Apresentar', 'display', 'quiet')}${button('save', 'Salvar', 'save', 'primary', 'id="save-scene"')}</div>
      </header>
      <aside class="sidebar">
        <nav class="tabs" aria-label="Painéis"><button data-tab="build" class="active">Construir</button><button data-tab="assets">Assets</button><button data-tab="scene">Cena</button></nav>
        <div id="side-content" class="side-content"></div>
        <footer class="sidebar-footer"><span class="local-dot"></span> Sua mesa, no seu computador.</footer>
      </aside>
      <main class="workspace">
        <div id="viewport" aria-label="Viewport 3D"></div>
        <div class="viewport-top"><div class="tool-strip" role="toolbar" aria-label="Ferramentas">${button('tool-select', '', 'cursor', 'icon-button active', 'title="Selecionar (Q)" aria-label="Selecionar"')}${button('tool-move', '', 'move', 'icon-button', 'title="Mover (W)" aria-label="Mover"')}${button('tool-rotate', '', 'rotate', 'icon-button', 'title="Rotacionar (R)" aria-label="Rotacionar"')}${button('tool-scale', '', 'scale', 'icon-button', 'title="Escala (S)" aria-label="Escala"')}<i></i>${button('undo', '', 'undo', 'icon-button', 'title="Desfazer (Ctrl+Z)" aria-label="Desfazer" id="undo"')}${button('redo', '', 'redo', 'icon-button', 'title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" id="redo"')}</div><div class="view-tag">${icon('room', 15)}<span id="view-tag">VISÃO DO MESTRE</span></div></div>
        <div id="welcome" class="welcome-card"><span class="eyebrow">UMA CENA COMEÇA COM UM ESPAÇO</span><h1>Sua próxima história<br/>começa aqui.</h1><p>Desenhe uma sala, escolha a luz e traga seus personagens para a mesa.</p>${button('room-draw', 'Desenhar minha primeira sala', 'room', 'primary')}<small>Ou use as medidas no painel Construir.</small></div>
        <div id="proposal-bar" class="proposal-bar" hidden></div>
        <div class="viewport-bottom"><div class="camera-strip">${button('perspective', 'Perspectiva', 'camera', 'quiet active')}${button('top', 'Superior', 'floor', 'quiet')}${button('frame', 'Enquadrar', 'frame', 'quiet')}${button('cutaway', 'Ver interior', 'eye', 'quiet active', 'aria-pressed="true"')}</div><span id="gesture-hint" class="gesture-hint">Botão direito: orbitar · Meio: mover câmera · Scroll: zoom</span></div>
        <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>
      </main>
      <aside class="inspector"><div class="panel-heading"><span class="eyebrow">PROPRIEDADES</span>${icon('scale', 16)}</div><div id="inspector-content"></div></aside>
      <footer class="statusbar"><span id="scene-summary">Preparando sua mesa…</span><span><kbd>Q</kbd> Selecionar <kbd>W</kbd> Mover <kbd>R</kbd> Girar <kbd>S</kbd> Escala <kbd>F</kbd> Enquadrar</span></footer>
    </div>
    <div id="presentation-controls" hidden><span id="presentation-name"></span>${button('present', 'Voltar à edição', 'close', 'quiet')}${button('fullscreen', 'Tela cheia', 'frame', 'quiet')}</div>
    <dialog id="documents-dialog" class="library-dialog">
      <div class="dialog-header">
        <div class="dialog-title-group">
          <span class="eyebrow">BIBLIOTECA & GESTÃO</span>
          <h2>Gestão da Mesa</h2>
        </div>
        <button type="button" id="close-library-dialog" data-action="close-dialog" class="icon-button dialog-close-btn" aria-label="Fechar painel" title="Fechar (Esc)">
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
    <dialog id="recovery-dialog"><span class="eyebrow">RECUPERAÇÃO LOCAL</span><h2>Há trabalho não salvo</h2><p id="recovery-description"></p><div class="dialog-actions">${button('discard-draft', 'Descartar rascunho', '', 'quiet')}${button('restore-draft', 'Restaurar trabalho', 'undo', 'primary')}</div></dialog>
    <div id="context-menu" class="context-menu" hidden></div>
    <input id="asset-file" type="file" accept="image/png,image/jpeg,image/webp,.glb" hidden />
    <input id="document-json-file" type="file" accept=".json,application/json" hidden />`;

  let assets = [], savedScenes = [], savedMaps = [], selection = null, tool = 'select', tab = 'build';
  let dialogTab = 'scenes';
  let proposal = null, placing = null, saving = false, isPresentation = false, cutaway = true;
  let workingCamera = null, publishedCamera = null, recovery = null, draftTimer, noticeTimer;
  let draftQueue = Promise.resolve(), draftWarningShown = false;
  let openTicket = 0;
  let initialized = false;
  let roomOptions = { width: 6, length: 5, height: 2.6, center: [0, 0, 0], door: true, lighting: true };
  let activeSurfaceId, buildHeight = 0, smartFloorId = null, selectedIds = new Set();
  let smartOptions = { template: 'office', density: 'normal', chairs: 4, seed: 1, lighting: true, restoreDeleted: false };
  let polishOptions = { mode: 'align', axis: 'x', alignment: 'center', angle: 5, seed: 1 };
  let contextTarget = null, draggedTreeId = null;
  const store = createSceneStore(createScene('Minha primeira cena'));
  const sessionId = id();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(`tabletop-presentation-${sessionId}`) : null;
  let sequence = 0;

  function notify(message, error = false, persistent = false) {
    const notice = document.getElementById('notice');
    notice.textContent = message; notice.hidden = false; notice.classList.toggle('error', error);
    clearTimeout(noticeTimer);
    if (!persistent) noticeTimer = setTimeout(() => { notice.hidden = true; }, error ? 8500 : 4000);
  }

  function locate(objectId = selection) {
    const doc = store.document;
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
        <button type="button" class="context-menu-item danger" data-context="delete-group">${icon('trash', 14)}<span>Deletar</span></button>
      `;
    } else {
      const found = locate(targetId);
      if (!found) return;
      const typeLabel = found.type === 'token' ? 'TOKEN' : found.type === 'light' ? 'LUZ' : ({ floor: 'PISO', wall: 'PAREDE', door: 'PORTA', prop: 'OBJETO' }[found.record.kind] || 'OBJETO');
      const name = found.type === 'token' ? doc.actors?.[found.record.actorId]?.name ?? found.record.name : found.record.name;
      menu.innerHTML = `
        <div class="context-menu-header">${typeLabel}: ${esc(name)}</div>
        <button type="button" class="context-menu-item" data-context="rename">${icon('edit', 14)}<span>Renomear</span></button>
        <button type="button" class="context-menu-item" data-context="duplicate">${icon('copy', 14)}<span>Duplicar</span></button>
        <button type="button" class="context-menu-item danger" data-context="delete">${icon('trash', 14)}<span>Deletar</span></button>
      `;
    }
    menu.hidden = false;
    const menuWidth = 175, menuHeight = 140;
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
    onSelect: (value, meta) => { selectObject(value, meta?.additive); hideContextMenu(); },
    onTransform: (objectId, transform, meta = {}) => {
      const found = locate(objectId);
      if (!found) return;
      const patch = found.type === 'light' ? { position: transform.position, rotation: transform.rotation } : { transform };
      execute(`${found.type}.update`, { id: objectId, patch, snap: meta.snap });
    },
    onPlace: (point) => placeAt(point),
    onWindowPlace: ({ wallId, offset, height: centerHeight }) => {
      const wall = store.document.layout.entities[wallId];
      const width = Math.min(1.2, wall.length - .1), height = Math.min(1, wall.height - .1);
      if (width < .1 || height < .1) { notify('Esta parede é pequena demais para a janela.', true); return; }
      const entity = createEntity('window', { wallId, surfaceId: wall.surfaceId, groupId: wall.groupId, width, height,
        ...constrainOpening(wall, { width, height }, offset, centerHeight - height / 2) });
      if (execute('entity.add', { entity })) { setTool('move'); selectObject(entity.id); notify('Janela criada. Arraste com Mover (W) ou ajuste posição e peitoril no inspetor.'); }
    },
    onOpeningMove: (objectId, patch) => execute('entity.update', { id: objectId, patch }),
    onRoomDraw: (rectangle) => { roomOptions = { ...roomOptions, ...rectangle }; tab = 'build'; makeProposal(); renderSidebar(); },
    onPolygonDraw: (points) => {
      const origin = points[0];
      const vertices = points.map(p => [p[0] - origin[0], p[2] - origin[2]]);
      const entity = createEntity('floor', { name: 'Piso poligonal', vertices, position: origin });
      if (execute('entity.add', { entity, snap: false })) { setTool('select'); activeSurfaceId = entity.id; selectObject(entity.id); renderSidebar(); }
    },
    onError: (error) => notify(error?.message ?? String(error), true, true),
    onContextMenu: (event, hit) => {
      if (hit?.entityId) {
        selection = hit.entityId;
        viewport.setSelection(selection);
        renderInspector();
        renderSceneTreeIfVisible();
        showContextMenu(event.clientX, event.clientY, hit.entityId);
      } else {
        hideContextMenu();
      }
    },
    onCameraChange: () => hideContextMenu(),
  });
  function selectObject(value, additive = false) {
    if (!additive) selectedIds.clear();
    if (value) { if (additive && selectedIds.has(value)) selectedIds.delete(value); else selectedIds.add(value); }
    selection = [...selectedIds].at(-1) ?? null;
    if (store.document.layout.entities[selection]?.kind === 'floor' && !additive) {
      activeSurfaceId = selection;
      if (smartFloorId !== selection) { smartFloorId = selection; const existing = currentComposition(); if (existing) smartOptions = { ...existing.parameters, restoreDeleted: false }; }
      viewport.setSupportSurface(selection); if (tab === 'build') renderSidebar();
    }
    viewport.setSelection(selection, [...selectedIds]); renderInspector(); renderSceneTreeIfVisible();
  }
  function currentComposition() { return Object.values(store.document.layout.compositions).find(c => store.document.layout.areas[c.areaId]?.surfaceId === smartFloorId); }
  function showAuthorshipProposal(next) {
    proposal = next; viewport.setPreview(next); setTool('select');
    const bar = document.getElementById('proposal-bar'); bar.hidden = false;
    bar.innerHTML = `<div><span><strong>${esc(next.label)}</strong><small>Verde: novo / ajustado · vermelho: remoção</small></span></div>${button('cancel-proposal', 'Cancelar', '', 'quiet')}${button('accept-proposal', 'Aceitar proposta', 'plus', 'primary')}<div class="proposal-report">${proposalReport(next)}</div>`;
    document.getElementById('welcome').hidden = true;
  }
  function setTool(next) {
    const previous = tool;
    tool = next; viewport.setTool(next);
    if (next !== 'place') placing = null;
    root.querySelectorAll('[data-action^="tool-"]').forEach((node) => node.classList.toggle('active', node.dataset.action === `tool-${next}`));
    document.getElementById('gesture-hint').textContent = next === 'polygon' ? 'Clique nos vértices · Enter conclui · Backspace remove · Esc cancela' : next === 'window' ? 'Clique na parede para posicionar o centro da janela · Esc cancela' : next === 'room' ? 'Arraste no chão para desenhar a sala · Esc cancela' : next === 'place' ? 'Clique no piso para colocar · Alt: posição livre · Esc cancela' : 'Botão direito: orbitar · Meio: mover câmera · Scroll: zoom';
    if (tab === 'build' && (previous === 'polygon' || next === 'polygon')) renderSidebar();
  }
  function clearProposal() { proposal = null; viewport.setPreview(null); document.getElementById('proposal-bar').hidden = true; }
  function makeProposal() {
    try {
      proposal = proposeRoom(roomOptions, store.editVersion); viewport.setPreview(proposal);
      const bar = document.getElementById('proposal-bar'); bar.hidden = false;
      bar.innerHTML = `<div>${icon('room')}<span><strong>Prévia de sala</strong><small>${roomOptions.width.toFixed(1)} × ${roomOptions.length.toFixed(1)} m${roomOptions.door ? ' · porta' : ''}${roomOptions.lighting ? ' · iluminação' : ''}</small></span></div>${button('cancel-proposal', 'Cancelar', '', 'quiet')}${button('accept-proposal', 'Criar sala', 'plus', 'primary')}`;
      document.getElementById('welcome').hidden = true; setTool('select');
    } catch (error) { clearProposal(); notify(error.message, true); }
  }
  function placeAt({ position, surfaceId = null, snap }) {
    if (!placing) return;
    let newId;
    if (placing.type === 'token') {
      const pair = createToken({ name: placing.name, color: placing.color, assetRef: placing.assetRef ?? null, position, surfaceId });
      if (execute('token.add', { ...pair, snap })) newId = pair.token.id;
    } else if (placing.type === 'light') {
      const light = createLight({ position: [position[0], position[1] + 2.2, position[2]], surfaceId });
      if (execute('light.add', { light })) newId = light.id;
    } else if (['stairs', 'ramp'].includes(placing.type)) {
      const entity = createEntity(placing.type, { position, surfaceId });
      if (execute('entity.add', { entity, snap })) newId = entity.id;
    } else {
      const asset = placing.asset;
      const entity = createEntity('prop', { name: asset.name, position, surfaceId, assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint ?? [1, 1], ...(asset.supportHeight ? { supportHeight: asset.supportHeight } : {}) });
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
      if (!draftWarningShown) { draftWarningShown = true; notify(`A recuperação automática não está disponível: ${error.message}. Salve no servidor.`, true); }
    });
  }
  function broadcast() {
    if (!channel) return;
    const doc = projectPresentation(store.document);
    channel.postMessage({ version: 1, type: 'snapshot', sessionId, sequence: ++sequence, document: doc, assets: presentationAssets(doc, assets), camera: publishedCamera ?? viewport.getCamera(), cutaway });
  }
  channel?.addEventListener('message', (event) => {
    if (event.data?.version === 1 && event.data?.sessionId === sessionId && event.data.type === 'ready') broadcast();
  });

  function renderSidebar() {
    root.querySelectorAll('[data-tab]').forEach((node) => node.classList.toggle('active', node.dataset.tab === tab));
    const panel = document.getElementById('side-content');
    if (tab === 'build') {
      panel.innerHTML = `<section class="quick-section"><span class="eyebrow">QUICK BUILD</span><h2>Um espaço para a história.</h2><p class="muted">Desenhe no chão ou comece pelas medidas. Tudo continua editável.</p>${button('room-draw', 'Desenhar sala', 'room', 'wide accent-outline')}<form id="quick-form"><div class="field-grid">${numberField('room-width', 'Largura interna · m', roomOptions.width, { min: 1.4 })}${numberField('room-length', 'Comprimento · m', roomOptions.length, { min: 1 })}</div>${numberField('room-height', 'Altura das paredes · m', roomOptions.height, { min: 2.2 })}<span class="section-caption">SUGESTÕES OPCIONAIS</span>${checkField('room-door', 'Incluir uma porta', roomOptions.door)}${checkField('room-lighting', 'Adicionar iluminação', roomOptions.lighting)}<button class="primary wide" type="submit">${icon('eye')} Ver prévia</button></form></section><section><span class="eyebrow">CONSTRUIR MANUALMENTE</span><div class="construction-grid">${button('floor-add', 'Piso', 'floor')}${button('wall-add', 'Parede', 'wall')}${button('door-add', 'Porta', 'door')}${button('light-place', 'Luz', 'light')}</div></section><section><span class="eyebrow">PERSONAGENS</span><label class="field"><span>Nome do token</span><input id="token-name" value="Investigador" maxlength="256" /></label><div class="token-controls"><input id="token-color" aria-label="Cor do token" type="color" value="#e4b76f" />${button('token-place', 'Colocar token', 'token', 'wide')}</div><p class="microcopy">Para usar um retrato, importe uma imagem na biblioteca.</p></section><section><span class="eyebrow">GRID E PRECISÃO</span>${checkField('grid-visible', 'Mostrar grid', store.document.layout.grid.visible)}${checkField('grid-snap', 'Encaixar no grid', store.document.layout.grid.snap)}${numberField('grid-size', 'Célula · m', store.document.layout.grid.cellSize, { min: .1 })}</section>`;
      panel.innerHTML += constructionPanel(store.document, { surfaceId: activeSurfaceId, height: buildHeight, polygon: tool === 'polygon' });
      panel.innerHTML += smartBuildPanel(store.document, smartOptions, smartFloorId, currentComposition());
    } else if (tab === 'assets') {
      panel.innerHTML = `<div class="section-intro"><span class="eyebrow">BIBLIOTECA</span><h2>Detalhes dão vida.</h2><p class="muted">Escolha um objeto e clique no chão para colocá-lo.</p></div><input id="asset-search" type="search" aria-label="Buscar assets" placeholder="Buscar na biblioteca…" /><div id="asset-cards" class="asset-grid"></div>${button('asset-import', 'Importar imagem ou GLB', 'upload', 'wide accent-outline')}<p class="microcopy">Arquivos ficam guardados no servidor local, separados da cena.</p>`;
      renderAssetCards();
    } else {
      const currentLook = store.document.look ?? store.document.defaultLook;
      panel.innerHTML = `<section><span class="eyebrow">AMBIENTE</span><h2>A luz conta a história.</h2><p class="muted">Um ponto de partida. Ajuste cada fonte como quiser.</p><div class="environment-options">${ENVIRONMENTS.map((preset) => `<button data-environment="${preset.id}" class="environment-card ${store.document.sourceEnvironment?.id === preset.id ? 'active' : ''}"><span class="environment-swatch ${preset.id}"></span><span><strong>${esc(preset.name)}</strong><small>${esc(preset.description || '')}</small></span>${icon('chevron', 14)}</button>`).join('')}</div>${colorField('background', 'Fundo', currentLook.background)}${numberField('fill-intensity', 'Preenchimento', currentLook.fill.intensity, { min: 0, step: .1 })}${colorField('fill-color', 'Cor do preenchimento', currentLook.fill.skyColor)}</section><section><span class="eyebrow">ENQUADRAMENTOS</span>${button('camera-save', 'Salvar câmera atual', 'camera', 'wide')}<div class="camera-presets">${Object.values(store.document.cameraPresets || {}).map((camera) => `<div class="preset-row"><button data-camera="${camera.id}">${icon('camera', 14)}${esc(camera.name)}</button><button data-camera-delete="${camera.id}" aria-label="Excluir enquadramento ${esc(camera.name)}">${icon('close', 14)}</button></div>`).join('') || '<p class="microcopy">Prepare uma câmera para a apresentação.</p>'}</div>${button('presentation-window', 'Abrir segunda tela', 'display', 'wide accent-outline')}${button('publish-camera', 'Publicar câmera atual', 'camera', 'wide quiet')}</section><section><span class="eyebrow">DOCUMENTO</span>${button('duplicate-scene', store.document.documentType === 'map' ? 'Salvar como novo mapa' : 'Salvar como nova cena', 'copy', 'wide')}<p class="microcopy">Duplica também suas alterações locais, preservando os assets.</p></section><section><div class="tree-header"><span class="eyebrow">ELEMENTOS DA CENA</span>${button('group-add', 'Nova pasta', 'plus', 'quiet')}</div><div id="scene-tree"></div></section>`;
      renderSceneTreeIfVisible();
    }
  }
  function renderAssetCards(search = '') {
    const node = document.getElementById('asset-cards'); if (!node) return;
    const filter = search.toLocaleLowerCase('pt-BR');
    const filtered = assets.filter((asset) => `${asset.name} ${asset.category} ${(asset.tags || []).join(' ')}`.toLocaleLowerCase('pt-BR').includes(filter));
    node.innerHTML = filtered.map((asset) => `<button class="asset-card" data-asset="${asset.id}" title="Colocar ${esc(asset.name)}"><div class="asset-preview">${asset.previewUrl ? `<img src="${esc(asset.previewUrl)}" alt="" />` : asset.type === 'image' ? `<img src="${esc(asset.url)}" alt="" />` : icon('room', 36)}</div><span>${esc(asset.name)}</span><small>${asset.type === 'image' ? 'Retrato de token' : esc(asset.category || 'Objeto')}</small></button>`).join('') || '<p class="microcopy">Nenhum asset encontrado.</p>';
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
      return `<div draggable="true" data-drag-id="${entry.id}" data-select="${entry.id}" class="tree-entry ${selectedIds.has(entry.id) ? 'selected' : ''}">
        ${icon(typeGlyph, 14)}
        <span class="tree-label" title="${esc(name)}">${esc(name)}</span>
        ${entry.audience === 'gm' ? '<small>GM</small>' : ''}
        <div class="tree-entry-actions">
          <button type="button" class="tree-action-btn" data-tree-rename="${entry.id}" title="Renomear">${icon('edit', 12)}</button>
          <button type="button" class="tree-action-btn" data-tree-menu="${entry.id}" title="Mais opções">${icon('dots', 12)}</button>
        </div>
      </div>`;
    };

    let html = '';

    if (groups.length > 0) {
      html += groups.map((group) => {
        const groupEntities = [...entities, ...tokens, ...lights].filter(e => e.groupId === group.id);
        return `<div class="tree-group" data-drop-group="${group.id}">
          <div class="tree-group-header" data-group-id="${group.id}">
            ${icon('folder', 14)}
            <span class="group-title" title="${esc(group.name)}">${esc(group.name)}</span>
            <div class="group-actions">
              <button type="button" data-group-visible="${group.id}" title="${group.visible === false ? 'Mostrar pasta' : 'Ocultar pasta'}">${icon('eye', 12)}</button>
              <button type="button" data-group-lock="${group.id}" title="${group.locked ? 'Desbloquear pasta' : 'Bloquear pasta'}">${group.locked ? '🔒' : '🔓'}</button>
              <button type="button" data-group-rename="${group.id}" title="Renomear pasta">${icon('edit', 12)}</button>
              <button type="button" data-group-delete="${group.id}" title="Excluir pasta">${icon('trash', 12)}</button>
            </div>
          </div>
          <div class="tree-group-items" data-drop-group="${group.id}">
            ${groupEntities.length > 0 ? groupEntities.map(renderEntry).join('') : '<div class="tree-group-empty">Pasta vazia (arraste aqui)</div>'}
          </div>
        </div>`;
      }).join('');
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
    if (selection && !selectedIds.has(selection)) selectedIds = new Set([selection]);
    if (!selection) selectedIds.clear();
    if (selectedIds.size > 1) { document.getElementById('inspector-content').innerHTML = polishPanel(selectedIds.size, polishOptions); viewport.setSelection(selection, [...selectedIds]); return; }
    const panel = document.getElementById('inspector-content'), found = locate();
    if (!found) {
      panel.innerHTML = `<div class="empty-inspector">${icon('cursor', 30)}<h3>Selecione um elemento</h3><p>Escolha um objeto na cena para editar posição, material e propriedades.</p><div class="inspector-guide"><span>${icon('move', 15)}Posicione com precisão</span><span>${icon('light', 15)}Crie a atmosfera</span><span>${icon('camera', 15)}Prepare o enquadramento</span></div></div>`;
      return;
    }
    const { type, record } = found, doc = store.document;
    const actor = type === 'token' ? doc.actors[record.actorId] : null;
    const name = actor?.name ?? record.name;
    const position = record.transform?.position ?? record.position;
    let fields = `<div class="object-title"><span class="object-icon">${icon(type === 'token' ? 'token' : type === 'light' ? 'light' : record.kind === 'door' ? 'door' : 'room', 24)}</span><span><small>${type === 'token' ? 'TOKEN' : type === 'light' ? 'LUZ' : ({ floor: 'PISO', wall: 'PAREDE', door: 'PORTA', window: 'JANELA', stairs: 'ESCADA', ramp: 'RAMPA', prop: 'ASSET' }[record.kind])}</small><strong>${esc(name)}</strong></span></div><label class="field"><span>Nome</span><input data-field="object-name" value="${esc(name)}" maxlength="256" /></label>`;
    if (position) {
      fields += `<section><span class="eyebrow">POSIÇÃO · METROS</span><div class="axis-fields">${position.map((value, axis) => numberField(`position-${axis}`, ['X', 'Y · altura', 'Z'][axis], value)).join('')}</div>${numberField('object-yaw', 'Rotação Y · graus', yawFromQuaternion(record.transform?.rotation ?? record.rotation), { step: 15 })}</section>`;
    }
    if (type === 'entity' || type === 'token' || type === 'light') {
      fields += `<section><span class="eyebrow">ORGANIZAÇÃO</span><label class="field"><span>Pasta / Grupo</span><select data-field="entity-group"><option value="">(Sem pasta / Raiz)</option>${Object.values(doc.layout.groups).map((g) => `<option value="${g.id}" ${record.groupId === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label></section>`;
    }
    if (record.transform) fields += `<section><span class="eyebrow">SUPERFÍCIE DE APOIO</span><label class="field"><span>Apoio</span><select data-field="object-surface"><option value="">Sem vínculo</option>${Object.values(doc.layout.entities).filter(e => e.id !== record.id && isSupport(e)).map(e => `<option value="${e.id}" ${record.surfaceId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>${record.kind === 'prop' ? checkField('prop-support', 'Oferecer superfície de apoio', Boolean(record.supportHeight)) + (record.supportHeight ? numberField('supportHeight', 'Altura local do apoio · m', record.supportHeight, { min: .01 }) : '') : ''}</section>`;
    if (record.vertices) fields += `<section><span class="eyebrow">CONTORNO LOCAL · X/Z</span>${record.vertices.map((p, i) => `<div class="field-grid">${numberField(`polygon-${i}-0`, `V${i + 1} · X`, p[0])}${numberField(`polygon-${i}-1`, `V${i + 1} · Z`, p[1])}</div>`).join('')}<p class="microcopy">O contorno não pode cruzar a si mesmo. Dimensões ajustam os vértices proporcionalmente.</p></section>`;
    if (record.kind === 'floor') fields += `<section><span class="eyebrow">DIMENSÕES · METROS</span><div class="field-grid">${numberField('width', 'Largura', record.width, { min: .1 })}${numberField('length', 'Comprimento', record.length, { min: .1 })}</div>${numberField('thickness', 'Espessura', record.thickness, { min: .01 })}</section>`;
    if (isAccess(record)) fields += `<section><span class="eyebrow">ACESSO ENTRE ALTURAS</span><div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .1 })}${numberField('length', 'Comprimento · m', record.length, { min: .1 })}</div>${numberField('height', 'Desnível · m', record.height, { min: .1 })}${record.kind === 'stairs' ? numberField('steps', 'Degraus', record.steps, { min: 1, max: 128, step: 1 }) : ''}<p class="microcopy">A base fica na altura Y; o acesso sobe no sentido Z local positivo. Use Rotacionar (R) para orientar e escolha este apoio para colocar tokens sobre ele.</p></section>`;
    if (record.kind === 'wall') fields += `<section><span class="eyebrow">DIMENSÕES · METROS</span>${numberField('length', 'Comprimento', record.length, { min: .1 })}${numberField('height', 'Altura', record.height, { min: .1 })}${numberField('thickness', 'Espessura', record.thickness, { min: .01 })}<p class="microcopy">Portas e janelas acompanham esta parede. Reduzir o comprimento exige manter as aberturas válidas.</p></section>`;
    if (record.kind === 'door') fields += `<section><span class="eyebrow">ABERTURA NA PAREDE</span>${numberField('offset', 'Posição na parede · m', record.offset, { min: 0 })}<div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .2 })}${numberField('height', 'Altura · m', record.height, { min: .2 })}</div>${numberField('door-angle', 'Ângulo atual · graus', (doc.sessionState?.doors?.[record.id] ?? record.initialAngle) * 180 / Math.PI, { step: 15 })}<label class="field"><span>Dobradiça</span><select data-field="hinge"><option value="left" ${record.hinge === 'left' ? 'selected' : ''}>Esquerda</option><option value="right" ${record.hinge === 'right' ? 'selected' : ''}>Direita</option></select></label>${button('door-toggle', 'Abrir / fechar', 'door', 'wide')}<p class="microcopy">O vão pertence à parede. A folha pode ser aberta sem alterar o mapa.</p></section>`;
    if (record.kind === 'window') fields += `<section><span class="eyebrow">JANELA HOSPEDADA</span><p class="microcopy">Com Mover (W), arraste a janela na parede. Alt permite ajuste livre. O recorte acompanha a janela.</p><label class="field"><span>Parede</span><select data-field="window-wall">${Object.values(doc.layout.entities).filter(e => e.kind === 'wall').map(e => `<option value="${e.id}" ${record.wallId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>${numberField('offset', 'Posição na parede · m', record.offset, { min: 0 })}<div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .1 })}${numberField('height', 'Altura · m', record.height, { min: .1 })}</div>${numberField('sill', 'Peitoril · m', record.sill, { min: 0 })}<label class="field"><span>Representação</span><select data-field="style"><option value="glass" ${record.style === 'glass' ? 'selected' : ''}>Vidro</option><option value="bars" ${record.style === 'bars' ? 'selected' : ''}>Grades</option><option value="open" ${record.style === 'open' ? 'selected' : ''}>Vão livre</option></select></label></section>`;
    if (type === 'token' || record.kind === 'prop') fields += `<section><span class="eyebrow">ESCALA VISUAL</span><div class="axis-fields">${record.transform.scale.map((value, axis) => numberField(`scale-${axis}`, ['X', 'Y', 'Z'][axis], value, { min: .01 })).join('')}</div>${type === 'token' ? `<span class="eyebrow">BASE · METROS</span><div class="field-grid">${numberField('footprint-0', 'Largura', record.footprint[0], { min: .1 })}${numberField('footprint-1', 'Profundidade', record.footprint[1], { min: .1 })}</div>${colorField('token-color', 'Cor do personagem', actor.color)}` : ''}</section>`;
    if (record.material) fields += `<section><span class="eyebrow">MATERIAL</span>${colorField('material-color', record.kind === 'prop' ? 'Matiz do asset' : 'Cor', record.material.color)}${numberField('material-roughness', 'Rugosidade', record.material.roughness, { min: 0, max: 1 })}</section>`;
    if (type === 'light') fields += `<section><span class="eyebrow">ILUMINAÇÃO</span>${colorField('light-color', 'Cor da fonte', record.color)}${numberField('light-intensity', 'Intensidade', record.intensity, { min: 0, step: record.type === 'point' ? 5 : .1 })}${record.type === 'point' ? numberField('light-distance', 'Alcance · m', record.distance, { min: 0, step: 1 }) : ''}${checkField('light-shadow', 'Projetar sombras', record.shadowEnabled)}</section>`;
    fields += `<section><span class="eyebrow">APRESENTAÇÃO</span>${checkField('object-secret', 'Somente para o mestre', record.audience === 'gm')}${record.locked === undefined ? '' : checkField('object-locked', 'Bloquear edição', record.locked)}</section><div class="object-actions">${button('object-copy', 'Copiar', 'copy')}${button('object-duplicate', 'Duplicar', 'copy')}${button('object-delete', 'Excluir', 'trash', 'danger')}</div>`;
    panel.innerHTML = groupChain(doc, record.groupId).some(g => g.locked) ? `<p class="microcopy">Esta pasta está bloqueada. Desbloqueie-a na árvore da cena para editar seus elementos.</p>${fields}` : fields;
  }

  function updateView(event = {}) {
    const doc = store.document;
    const isMap = doc.documentType === 'map';
    if (selection && !locate()) selection = null;
    selectedIds = new Set([...selectedIds].filter(key => locate(key)));
    if (!selection) selection = [...selectedIds].at(-1) ?? null;
    if (event.type === 'replace') { selectedIds.clear(); selection = null; activeSurfaceId = undefined; smartFloorId = null; }
    const floors = Object.values(doc.layout.entities).filter(e => e.kind === 'floor');
    if (activeSurfaceId && !doc.layout.entities[activeSurfaceId]) activeSurfaceId = undefined;
    if (activeSurfaceId === undefined) activeSurfaceId = floors.length === 1 ? floors[0].id : null;
    if (!doc.layout.entities[smartFloorId]) {
      smartFloorId = floors[0]?.id ?? null;
      const existing = currentComposition(); if (existing) smartOptions = { ...existing.parameters, restoreDeleted: false };
    }
    if (proposal && event.type !== 'saved') clearProposal();
    viewport.setDocument(isPresentation ? projectPresentation(doc) : doc);
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
    status.textContent = saving ? 'Salvando…' : store.dirty ? 'Alterações locais' : `Salvo · revisão ${doc.revision}`;
    status.classList.toggle('unsaved', store.dirty); document.getElementById('save-scene').disabled = saving;
    document.getElementById('scene-summary').textContent = `${Object.keys(doc.layout?.entities || {}).length} elementos · ${Object.keys(doc.tokens || {}).length} tokens · ${Object.keys(doc.look?.lights || doc.defaultLook?.lights || {}).length} luzes · grid ${doc.layout?.grid?.cellSize ?? 1} m`;
    renderInspector(); renderSidebar(); broadcast();
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
      lastScene.write(receipt.id);
      flushDraft(); notify(store.dirty ? 'Versão salva. Há alterações posteriores ainda locais.' : `${isMap ? 'Mapa salvo' : 'Cena salva'} no computador.`);
      await refreshSaved().catch(() => notify(`${isMap ? 'Mapa salvo' : 'Cena salva'}. A lista não pôde ser atualizada agora.`, true)); return true;
    } catch (error) {
      const conflict = error instanceof ApiError && error.status === 409;
      notify(conflict ? `Este documento mudou em outra janela. Seu trabalho está no rascunho. Abra a versão salva ou salve como nova.` : `Não foi possível salvar: ${error.message}`, true, true);
      flushDraft(); return false;
    } finally { saving = false; updateView({ type: 'saved' }); }
  }
  function canSwitch() { return !saving && (!store.dirty || confirm('Há alterações locais. Continuar sem salvar no servidor?')); }
  async function duplicateScene() {
    if (saving) return;
    const sourceId = store.document.id, sourceVersion = store.editVersion;
    const isMap = store.document.documentType === 'map';
    const copy = duplicateDocument(store.document, { name: `${store.document.name} — cópia` });
    saving = true; updateView({ type: 'saved' });
    try {
      // Duplicate the working document, including edits pending after a conflict.
      const receipt = await repository.create(copy);
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
        if (execute('entity.add', { entity: copy })) {
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
        if (execute('light.add', { light: copy })) {
          selection = copy.id;
          viewport.setSelection(selection);
          renderInspector();
          notify(`${copy.name || 'Luz'} colada.`);
        }
      }
    }
  }

  function closeDialog() {
    const dialog = document.getElementById('documents-dialog');
    if (dialog) {
      if (typeof dialog.close === 'function') dialog.close();
      dialog.removeAttribute('open');
    }
  }

  async function openScene(sceneId) {
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
        if (!canSwitch()) return;
        let loadedDoc = validated;
        try {
          const saved = await repository.create(validated);
          loadedDoc = saved;
        } catch { /* se já existir ou offline, usa local */ }
        selection = null; clearProposal(); setTool('select');
        store.replace(loadedDoc, { saved: Boolean(loadedDoc.revision > 0) });
        viewport.frameScene();
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
      container.innerHTML = `
        <div class="tab-toolbar">
          <span class="eyebrow">${savedScenes.length} cena(s) salva(s)</span>
          <div class="tab-toolbar-actions">
            ${button('dialog-new-scene', 'Nova cena', 'plus', 'primary')}
          </div>
        </div>
        ${savedScenes.map((scene) => `
          <div class="item-card">
            <button type="button" class="item-card-main" data-open="${scene.id}">
              <div style="display:flex;align-items:center;gap:6px">
                <strong>${esc(scene.name)}</strong>
                ${scene.id === store.document.id ? '<span class="item-badge" style="background:#2d473e;color:#8ce2be">Atual</span>' : ''}
              </div>
              <small>Revisão ${scene.revision} · ${new Date(scene.updatedAt).toLocaleString('pt-BR')}</small>
            </button>
            <div class="item-card-actions">
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
          <div class="item-card">
            <button type="button" class="item-card-main" data-open-map="${map.id}">
              <div style="display:flex;align-items:center;gap:6px">
                <span class="item-badge">MAPA</span>
                <strong>${esc(map.name)}</strong>
                ${map.id === store.document.id ? '<span class="item-badge" style="background:#2d473e;color:#8ce2be">Atual</span>' : ''}
              </div>
              <small>Revisão ${map.revision} · ${new Date(map.updatedAt).toLocaleString('pt-BR')}</small>
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
    if (typeof dialog.show === 'function') {
      dialog.show();
    } else {
      dialog.setAttribute('open', '');
    }
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
      assets = await repository.assets(); viewport.setAssets(assets); tab = 'assets'; renderSidebar();
      placing = asset.type === 'image' ? { type: 'token', name: asset.name.replace(/\.[^.]+$/, ''), color: '#e4b76f', assetRef: { id: asset.id, revision: asset.revision } } : { type: 'prop', asset };
      setTool('place'); notify('Asset guardado. Clique no piso para colocá-lo.');
    } catch (error) { notify(`O asset não foi importado: ${error.message}`, true); }
  }

  function changeField(input) {
    const field = input.dataset.field, value = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;
    if (field === 'build-height') { if (!Number.isFinite(value)) return; buildHeight = value; activeSurfaceId = null; roomOptions.center[1] = value; viewport.setWorkplaneHeight(value); viewport.setSupportSurface(null); renderSidebar(); return; }
    if (field === 'active-surface') { activeSurfaceId = value || null; viewport.setSupportSurface(activeSurfaceId); return; }
    if (field.startsWith('smart-')) {
      const key = field.slice(6);
      if (key === 'floor') { smartFloorId = value || null; const existing = currentComposition(); if (existing) smartOptions = { ...existing.parameters, restoreDeleted: false }; }
      else smartOptions[key] = value;
      clearProposal(); renderSidebar(); return;
    }
    if (field.startsWith('polish-')) { polishOptions[field.slice(7)] = value; clearProposal(); return; }
    if (field.startsWith('room-')) {
      const key = field.slice(5); roomOptions[key] = value; if (proposal) makeProposal(); return;
    }
    if (field.startsWith('grid-')) {
      const key = { 'grid-visible': 'visible', 'grid-snap': 'snap', 'grid-size': 'cellSize' }[field];
      execute('grid.update', { patch: { [key]: value } }); return;
    }
    if (field === 'background') { execute('look.update', { patch: { background: value } }); return; }
    if (field.startsWith('fill-')) { execute('look.update', { patch: { fill: { [field === 'fill-color' ? 'skyColor' : 'intensity']: value } } }); return; }
    const found = locate(); if (!found) return;
    const { type, record } = found; let patch = {}, actorPatch;
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
        const half = (value - yawFromQuaternion(record.rotation)) * Math.PI / 360;
        const s = Math.sin(half), c = Math.cos(half);
        patch.rotation = [c * x + s * z, c * y + s * w, c * z - s * x, c * w - s * y];
      } else patch.transform = { rotation: quaternionFromYaw(value) };
    }
    else if (field.startsWith('scale-')) { const scale = [...record.transform.scale]; scale[Number(field.slice(-1))] = value; patch.transform = { scale }; }
    else if (field.startsWith('footprint-')) { const footprint = [...record.footprint]; footprint[Number(field.slice(-1))] = value; patch.footprint = footprint; }
    else if (field === 'token-color') actorPatch = { color: value };
    else if (field.startsWith('material-')) patch.material = { [field.slice(9)]: value };
    else if (field.startsWith('light-')) patch[{ 'light-color': 'color', 'light-intensity': 'intensity', 'light-distance': 'distance', 'light-shadow': 'shadowEnabled' }[field]] = value;
    else if (field === 'object-secret') patch.audience = value ? 'gm' : 'all';
    else if (field === 'object-locked') patch.locked = value;
    else if (field === 'entity-group') { execute(`${type}.update`, { id: record.id, patch: { groupId: value || null } }); return; }
    else if (field === 'door-angle') { if (store.document.documentType === 'map') execute('entity.update', { id: record.id, patch: { initialAngle: value * Math.PI / 180 } }); else execute('door.setAngle', { id: record.id, angle: value * Math.PI / 180 }); return; }
    else patch[field] = value;
    execute(`${type}.update`, { id: record.id, patch, ...(actorPatch ? { actorPatch } : {}) });
  }

  async function act(action) {
    if (!initialized) return;
    switch (action) {
      case 'save': return saveScene();
      case 'smart-preview': {
        try { showAuthorshipProposal(proposeFurnishing(store.document, { ...smartOptions, floorId: smartFloorId, compositionId: currentComposition()?.id }, store.editVersion, assets)); }
        catch (error) { notify(error.message, true); } break;
      }
      case 'smart-detach': if (currentComposition()) execute('composition.detach', { id: currentComposition().id }); break;
      case 'polish-preview': {
        try { showAuthorshipProposal(proposePolish(store.document, { ...polishOptions, ids: [...selectedIds] }, store.editVersion)); }
        catch (error) { notify(error.message, true); } break;
      }
      case 'polygon-draw': clearProposal(); setTool('polygon'); document.getElementById('welcome').hidden = true; renderSidebar(); break;
      case 'polygon-finish': viewport.finishPolygon(); break;
      case 'platform-add': {
        const entity = createEntity('floor', { name: 'Plataforma', width: 3, length: 3, position: [0, buildHeight || 1, 0], thickness: .25 });
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
      case 'close-dialog': closeDialog(); break;
      case 'room-draw': clearProposal(); setTool('room'); document.getElementById('welcome').hidden = true; notify('Arraste no chão para desenhar o tamanho da sala.'); break;
      case 'accept-proposal': {
        const proposed = proposal; if (!proposed) return;
        if (execute('proposal.accept', { proposal: proposed })) {
          clearProposal(); const floor = proposed.entities?.find(entity => entity.kind === 'floor');
          if (floor) { viewport.frameScene(); activeSurfaceId = floor.id; smartFloorId = floor.id; selectObject(floor.id); }
          else { viewport.setSelection(selection, [...selectedIds]); renderInspector(); }
          renderSidebar(); notify('Proposta aceita. Os elementos continuam editáveis.');
        } break;
      }
      case 'cancel-proposal': clearProposal(); updateView({ type: 'saved' }); break;
      case 'floor-add': { const entity = createEntity('floor'); if (execute('entity.add', { entity })) { selection = entity.id; setTool('move'); viewport.setSelection(selection); renderInspector(); viewport.frameSelection(selection); } break; }
      case 'wall-add': {
        const surface = Object.values(store.document.layout.entities).find((entity) => entity.kind === 'floor');
        const entity = createEntity('wall', { surfaceId: surface?.id ?? null, position: surface?.transform.position ?? [0, 0, 0] });
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
      case 'light-place': placing = { type: 'light' }; setTool('place'); break;
      case 'object-delete': { const found = locate(); if (found && confirm(found.record.kind === 'floor' ? 'Excluir o piso e todos os elementos apoiados nele? Esta ação pode ser desfeita.' : found.record.kind === 'wall' ? 'Excluir esta parede e suas portas? Esta ação pode ser desfeita.' : 'Excluir este elemento? Esta ação pode ser desfeita.')) execute(`${found.type}.remove`, { id: selection }); break; }
      case 'object-copy': return copySelection();
      case 'object-paste': return pasteClipboard();
      case 'object-duplicate': { const found = locate(); if (found) { const before = new Set([...Object.keys(store.document.layout.entities), ...Object.keys(store.document.tokens), ...Object.keys((store.document.look ?? store.document.defaultLook).lights)]); if (execute(`${found.type}.duplicate`, { id: selection })) { selection = [...Object.keys(store.document.layout.entities), ...Object.keys(store.document.tokens), ...Object.keys((store.document.look ?? store.document.defaultLook).lights)].find((key) => !before.has(key)); viewport.setSelection(selection); renderInspector(); } } break; }
      case 'undo': store.undo(); break;
      case 'redo': store.redo(); break;
      case 'perspective': viewport.setTopView(false); break;
      case 'top': viewport.setTopView(true); break;
      case 'frame': if (selection) viewport.frameSelection(selection); else viewport.frameScene(); break;
      case 'cutaway': cutaway = !cutaway; viewport.setCutaway(cutaway); root.querySelector('[data-action="cutaway"]').classList.toggle('active', cutaway); broadcast(); break;
      case 'camera-save': { const camera = { ...viewport.getCamera(), id: id(), name: `Enquadramento ${Object.keys(store.document.cameraPresets).length + 1}` }; execute('camera.save', { camera }); notify('Enquadramento salvo na cena.'); break; }
      case 'publish-camera': publishedCamera = viewport.getCamera(); broadcast(); notify('Câmera publicada na segunda tela.'); break;
      case 'presentation-window': {
        publishedCamera ??= viewport.getCamera();
        const diagnostics = new URLSearchParams(location.search).has('diagnostics') ? '&diagnostics' : '';
        const opened = window.open(`/?presentation=${sessionId}${diagnostics}`, `tabletop-${sessionId}`);
        if (!opened) notify('A janela foi bloqueada. Permita pop-ups para abrir a segunda tela.', true);
        else broadcast(); break;
      }
      case 'present':
        clearProposal(); isPresentation = !isPresentation;
        if (isPresentation) { workingCamera = viewport.getCamera(); publishedCamera ??= workingCamera; viewport.setDocument(projectPresentation(store.document)); viewport.setCamera(publishedCamera); }
        else { publishedCamera = viewport.getCamera(); viewport.setDocument(store.document); if (workingCamera) viewport.setCamera(workingCamera); }
        document.body.classList.toggle('presenting', isPresentation); document.getElementById('presentation-controls').hidden = !isPresentation;
        viewport.setPresentation(isPresentation); updateView({ type: 'saved' }); break;
      case 'fullscreen': if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); break;
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
      if (action === 'rename') renameTarget(targetId);
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
      const id = treeMenuBtn.dataset.treeMenu;
      const rect = treeMenuBtn.getBoundingClientRect();
      selection = id; viewport.setSelection(selection); renderInspector(); renderSceneTreeIfVisible();
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
    if (node.dataset.action) { Promise.resolve(act(node.dataset.action)).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.tab) { tab = node.dataset.tab; renderSidebar(); return; }
    if (node.dataset.dialogTab) { dialogTab = node.dataset.dialogTab; renderDialogContent(); return; }
    if (node.dataset.select) { selectObject(node.dataset.select, event.shiftKey); return; }
    if (node.dataset.asset) {
      const asset = assets.find((item) => item.id === node.dataset.asset);
      placing = asset.type === 'image' ? { type: 'token', name: asset.name.replace(/\.[^.]+$/, ''), color: '#e4b76f', assetRef: { id: asset.id, revision: asset.revision } } : { type: 'prop', asset };
      setTool('place'); notify(`Clique no piso para colocar ${asset.name}.`); return;
    }
    if (node.dataset.environment) { execute('environment.apply', { presetId: node.dataset.environment }); return; }
    if (node.dataset.camera) { viewport.setCamera(store.document.cameraPresets[node.dataset.camera]); publishedCamera = viewport.getCamera(); broadcast(); return; }
    if (node.dataset.cameraDelete) { execute('camera.remove', { id: node.dataset.cameraDelete }); return; }
    if (node.dataset.open) { openScene(node.dataset.open).catch((error) => notify(error.message, true)); return; }
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
  root.addEventListener('contextmenu', (event) => {
    if (!initialized) return;
    const entry = event.target.closest('.tree-entry');
    if (entry) {
      event.preventDefault();
      const id = entry.dataset.select;
      selection = id; viewport.setSelection(selection); renderInspector(); renderSceneTreeIfVisible();
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
      const entity = store.document.layout.entities[draggedTreeId];
      if (entity && entity.groupId !== targetGroupId) {
        execute('entity.update', { id: draggedTreeId, patch: { groupId: targetGroupId } });
      }
      root.querySelectorAll('.tree-group.drag-over').forEach((el) => el.classList.remove('drag-over'));
      draggedTreeId = null;
    }
  });
  root.addEventListener('change', (event) => {
    if (!initialized) return;
    if (event.target.id === 'asset-file') { importAsset(event.target.files[0]); event.target.value = ''; }
    else if (event.target.id === 'document-json-file') { importJson(event.target.files[0]); event.target.value = ''; }
    else if (event.target.dataset.field) changeField(event.target);
    else if (event.target.id === 'scene-name') execute('scene.rename', { name: event.target.value });
  });
  root.addEventListener('input', (event) => { if (event.target.id === 'asset-search') renderAssetCards(event.target.value); });
  root.addEventListener('submit', (event) => { if (event.target.id === 'quick-form') { event.preventDefault(); makeProposal(); } });
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="door-toggle"]')) {
      const found = locate(); if (found?.record.kind === 'door') { const angle = store.document.sessionState?.doors?.[selection] ?? found.record.initialAngle; execute('door.setAngle', { id: selection, angle: Math.abs(angle) < .1 ? Math.PI / 2 : 0 }); }
    }
  });
  window.addEventListener('keydown', (event) => {
    if (!initialized) return;
    if (event.key === 'Escape') {
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
    if (event.target.closest('input,select,textarea')) return;
    if (document.getElementById('recovery-dialog')?.open) return;
    if (isPresentation) return;
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === 's') { event.preventDefault(); saveScene(); }
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? store.redo() : store.undo(); }
      if (event.key.toLowerCase() === 'y') { event.preventDefault(); store.redo(); }
      if (event.key.toLowerCase() === 'd') { event.preventDefault(); act('object-duplicate'); }
      if (event.key.toLowerCase() === 'c') { event.preventDefault(); act('object-copy'); }
      if (event.key.toLowerCase() === 'v') { event.preventDefault(); act('object-paste'); }
      return;
    }
    const keys = { q: 'select', w: 'move', r: 'rotate', s: 'scale' };
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
  window.addEventListener('pagehide', () => { flushDraft(); channel?.close(); viewport.destroy(); });
  window.addEventListener('beforeunload', (event) => { if (store.dirty) { event.preventDefault(); event.returnValue = ''; } });

  const initial = await Promise.allSettled([repository.assets(), repository.list('scene'), repository.list('map'), drafts.read()]);
  if (initial[0].status === 'fulfilled') assets = initial[0].value; else notify('O servidor local está indisponível. Inicie com npm run dev ou npm start; o trabalho continua como rascunho.', true, true);
  if (initial[1].status === 'fulfilled') savedScenes = initial[1].value;
  if (initial[2].status === 'fulfilled') savedMaps = initial[2].value;
  if (initial[3].status === 'fulfilled') recovery = initial[3].value;
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
  if (recovery) {
    document.getElementById('recovery-description').textContent = `“${recovery.document.name}” possui um rascunho local de ${new Date(recovery.savedAt).toLocaleString('pt-BR')}. Restaurar não sobrescreve a versão salva no servidor.`;
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
  root.innerHTML = `<div id="presentation-viewport"></div><div id="presentation-message" class="presentation-message">Aguardando a cena do mestre…</div><button id="presentation-fullscreen" class="presentation-fullscreen" title="Tela cheia" aria-label="Tela cheia">${icon('frame')}</button>`;
  const viewport = createViewport(document.getElementById('presentation-viewport'), {
    onError: (error) => { document.getElementById('presentation-message').textContent = error.message; },
  });
  viewport.setPresentation(true);
  if (new URLSearchParams(location.search).has('diagnostics')) {
    Object.defineProperty(window, '__tabletop', { value: Object.freeze({ camera: () => viewport.getCamera(), stats: () => viewport.getInfo() }), configurable: true });
  }
  const channel = new BroadcastChannel(`tabletop-presentation-${sessionId}`);
  let sequence = 0;
  const request = () => channel.postMessage({ version: 1, sessionId, type: 'ready' });
  const retry = setInterval(request, 1500);
  channel.onmessage = (event) => {
    const data = event.data;
    if (data?.version !== 1 || data.sessionId !== sessionId || data.type !== 'snapshot' || data.sequence <= sequence) return;
    try {
      validateDocument(data.document); sequence = data.sequence;
      viewport.setAssets(data.assets); viewport.setDocument(data.document); viewport.setCutaway(data.cutaway);
      if (data.camera) viewport.setCamera(data.camera);
      document.title = `${data.document.name} — apresentação`; document.getElementById('presentation-message').hidden = true; clearInterval(retry);
    } catch (error) { document.getElementById('presentation-message').textContent = error.message; }
  };
  document.getElementById('presentation-fullscreen').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  window.addEventListener('pagehide', () => { clearInterval(retry); channel.close(); viewport.destroy(); });
  request();
}
