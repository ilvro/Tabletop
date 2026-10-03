import { createScene, createEntity, createToken, createLight, clone, id, validateDocument, duplicateDocument } from '../domain/documents.js';
import { quaternionFromYaw, yawFromQuaternion } from '../domain/coords.js';
import { ENVIRONMENTS } from '../domain/environments.js';
import { createSceneStore } from '../state/scene-store.js';
import { proposeRoom } from '../authoring/quick-build.js';
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
const entryName = (doc, entry) => doc.actors[entry.actorId]?.name ?? entry.name;
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
        <div class="document-heading"><span class="eyebrow">SUA MESA / CENA</span><input id="scene-name" aria-label="Nome da cena" maxlength="256" disabled /></div>
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
    <dialog id="documents-dialog"><div class="dialog-header"><div><span class="eyebrow">NO SEU COMPUTADOR</span><h2>Cenas salvas</h2></div>${button('close-dialog', '', 'close', 'icon-button', 'aria-label="Fechar"')}</div><div id="documents-list"></div></dialog>
    <dialog id="recovery-dialog"><span class="eyebrow">RECUPERAÇÃO LOCAL</span><h2>Há trabalho não salvo</h2><p id="recovery-description"></p><div class="dialog-actions">${button('discard-draft', 'Descartar rascunho', '', 'quiet')}${button('restore-draft', 'Restaurar trabalho', 'undo', 'primary')}</div></dialog>
    <input id="asset-file" type="file" accept="image/png,image/jpeg,image/webp,.glb" hidden />`;

  let assets = [], savedScenes = [], selection = null, tool = 'select', tab = 'build';
  let proposal = null, placing = null, saving = false, isPresentation = false, cutaway = true;
  let workingCamera = null, publishedCamera = null, recovery = null, draftTimer, noticeTimer;
  let draftQueue = Promise.resolve(), draftWarningShown = false;
  let openTicket = 0;
  let initialized = false;
  let roomOptions = { width: 6, length: 5, height: 2.6, center: [0, 0, 0], door: true, lighting: true };
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
  const viewport = createViewport(document.getElementById('viewport'), {
    onSelect: (value) => { selection = value; renderInspector(); renderSceneTreeIfVisible(); viewport.setSelection(value); },
    onTransform: (objectId, transform, meta = {}) => {
      const found = locate(objectId);
      if (!found) return;
      const patch = found.type === 'light' ? { position: transform.position, rotation: transform.rotation } : { transform };
      execute(`${found.type}.update`, { id: objectId, patch, snap: meta.snap });
    },
    onPlace: (point) => placeAt(point),
    onRoomDraw: (rectangle) => { roomOptions = { ...roomOptions, ...rectangle }; tab = 'build'; makeProposal(); renderSidebar(); },
    onError: (error) => notify(error?.message ?? String(error), true, true),
  });

  function locate(objectId = selection) {
    const doc = store.document;
    if (doc.layout.entities[objectId]) return { type: 'entity', record: doc.layout.entities[objectId] };
    if (doc.tokens[objectId]) return { type: 'token', record: doc.tokens[objectId] };
    if (doc.look.lights[objectId]) return { type: 'light', record: doc.look.lights[objectId] };
    return null;
  }
  function execute(type, payload, options) {
    try { return store.execute(type, payload, options); }
    catch (error) { notify(error.message, true); viewport.setDocument(store.document); viewport.setSelection(selection); return null; }
  }
  function setTool(next) {
    tool = next; viewport.setTool(next);
    if (next !== 'place') placing = null;
    root.querySelectorAll('[data-action^="tool-"]').forEach((node) => node.classList.toggle('active', node.dataset.action === `tool-${next}`));
    document.getElementById('gesture-hint').textContent = next === 'room' ? 'Arraste no chão para desenhar a sala · Esc cancela' : next === 'place' ? 'Clique no piso para colocar · Alt: posição livre · Esc cancela' : 'Botão direito: orbitar · Meio: mover câmera · Scroll: zoom';
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
      const light = createLight({ position: [position[0], position[1] + 2.2, position[2]] });
      if (execute('light.add', { light })) newId = light.id;
    } else {
      const asset = placing.asset;
      const entity = createEntity('prop', { name: asset.name, position, surfaceId, assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint ?? [1, 1] });
      if (execute('entity.add', { entity, snap })) newId = entity.id;
    }
    if (newId) { selection = newId; setTool('move'); viewport.setSelection(newId); renderInspector(); notify('Adicionado à cena. Você pode mover, girar e editar.'); }
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
    } else if (tab === 'assets') {
      panel.innerHTML = `<div class="section-intro"><span class="eyebrow">BIBLIOTECA</span><h2>Detalhes dão vida.</h2><p class="muted">Escolha um objeto e clique no chão para colocá-lo.</p></div><input id="asset-search" type="search" aria-label="Buscar assets" placeholder="Buscar na biblioteca…" /><div id="asset-cards" class="asset-grid"></div>${button('asset-import', 'Importar imagem ou GLB', 'upload', 'wide accent-outline')}<p class="microcopy">Arquivos ficam guardados no servidor local, separados da cena.</p>`;
      renderAssetCards();
    } else {
      panel.innerHTML = `<section><span class="eyebrow">AMBIENTE</span><h2>A luz conta a história.</h2><p class="muted">Um ponto de partida. Ajuste cada fonte como quiser.</p><div class="environment-options">${ENVIRONMENTS.map((preset) => `<button data-environment="${preset.id}" class="environment-card ${store.document.sourceEnvironment?.id === preset.id ? 'active' : ''}"><span class="environment-swatch ${preset.id}"></span><span><strong>${esc(preset.name)}</strong><small>${esc(preset.description || '')}</small></span>${icon('chevron', 14)}</button>`).join('')}</div>${colorField('background', 'Fundo', store.document.look.background)}${numberField('fill-intensity', 'Preenchimento', store.document.look.fill.intensity, { min: 0, step: .1 })}${colorField('fill-color', 'Cor do preenchimento', store.document.look.fill.skyColor)}</section><section><span class="eyebrow">ENQUADRAMENTOS</span>${button('camera-save', 'Salvar câmera atual', 'camera', 'wide')}<div class="camera-presets">${Object.values(store.document.cameraPresets).map((camera) => `<div class="preset-row"><button data-camera="${camera.id}">${icon('camera', 14)}${esc(camera.name)}</button><button data-camera-delete="${camera.id}" aria-label="Excluir enquadramento ${esc(camera.name)}">${icon('close', 14)}</button></div>`).join('') || '<p class="microcopy">Prepare uma câmera para a apresentação.</p>'}</div>${button('presentation-window', 'Abrir segunda tela', 'display', 'wide accent-outline')}${button('publish-camera', 'Publicar câmera atual', 'camera', 'wide quiet')}</section><section><span class="eyebrow">DOCUMENTO</span>${button('duplicate-scene', 'Salvar como nova cena', 'copy', 'wide')}<p class="microcopy">Duplica também suas alterações locais, preservando os assets.</p></section><section><span class="eyebrow">ELEMENTOS DA CENA</span><div id="scene-tree"></div></section>`;
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
    const entries = [...Object.values(doc.layout.entities), ...Object.values(doc.tokens), ...Object.values(doc.look.lights)];
    tree.innerHTML = entries.map((entry) => `<button data-select="${entry.id}" class="tree-entry ${entry.id === selection ? 'selected' : ''}">${icon(entry.kind === 'floor' ? 'floor' : entry.kind === 'wall' ? 'wall' : entry.kind === 'door' ? 'door' : entry.actorId ? 'token' : entry.type ? 'light' : 'room', 14)}<span>${esc(entryName(doc, entry))}</span>${entry.audience === 'gm' ? '<small>GM</small>' : ''}</button>`).join('');
  }
  function renderInspector() {
    const panel = document.getElementById('inspector-content'), found = locate();
    if (!found) {
      panel.innerHTML = `<div class="empty-inspector">${icon('cursor', 30)}<h3>Selecione um elemento</h3><p>Escolha um objeto na cena para editar posição, material e propriedades.</p><div class="inspector-guide"><span>${icon('move', 15)}Posicione com precisão</span><span>${icon('light', 15)}Crie a atmosfera</span><span>${icon('camera', 15)}Prepare o enquadramento</span></div></div>`;
      return;
    }
    const { type, record } = found, doc = store.document;
    const actor = type === 'token' ? doc.actors[record.actorId] : null;
    const name = actor?.name ?? record.name;
    const position = record.transform?.position ?? record.position;
    let fields = `<div class="object-title"><span class="object-icon">${icon(type === 'token' ? 'token' : type === 'light' ? 'light' : record.kind === 'door' ? 'door' : 'room', 24)}</span><span><small>${type === 'token' ? 'TOKEN' : type === 'light' ? 'LUZ' : ({ floor: 'PISO', wall: 'PAREDE', door: 'PORTA', prop: 'ASSET' }[record.kind])}</small><strong>${esc(name)}</strong></span></div><label class="field"><span>Nome</span><input data-field="object-name" value="${esc(name)}" maxlength="256" /></label>`;
    if (position) {
      fields += `<section><span class="eyebrow">POSIÇÃO · METROS</span><div class="axis-fields">${position.map((value, axis) => numberField(`position-${axis}`, ['X', 'Y · altura', 'Z'][axis], value)).join('')}</div>${numberField('object-yaw', 'Rotação Y · graus', yawFromQuaternion(record.transform?.rotation ?? record.rotation), { step: 15 })}</section>`;
    }
    if (record.kind === 'floor') fields += `<section><span class="eyebrow">DIMENSÕES · METROS</span><div class="field-grid">${numberField('width', 'Largura', record.width, { min: .1 })}${numberField('length', 'Comprimento', record.length, { min: .1 })}</div>${numberField('thickness', 'Espessura', record.thickness, { min: .01 })}</section>`;
    if (record.kind === 'wall') fields += `<section><span class="eyebrow">DIMENSÕES · METROS</span>${numberField('length', 'Comprimento', record.length, { min: .1 })}${numberField('height', 'Altura', record.height, { min: .1 })}${numberField('thickness', 'Espessura', record.thickness, { min: .01 })}<p class="microcopy">Portas acompanham esta parede. Reduzir o comprimento exige manter as aberturas válidas.</p></section>`;
    if (record.kind === 'door') fields += `<section><span class="eyebrow">ABERTURA NA PAREDE</span>${numberField('offset', 'Posição na parede · m', record.offset, { min: 0 })}<div class="field-grid">${numberField('width', 'Largura · m', record.width, { min: .2 })}${numberField('height', 'Altura · m', record.height, { min: .2 })}</div>${numberField('door-angle', 'Ângulo atual · graus', (doc.sessionState.doors[record.id] ?? record.initialAngle) * 180 / Math.PI, { step: 15 })}<label class="field"><span>Dobradiça</span><select data-field="hinge"><option value="left" ${record.hinge === 'left' ? 'selected' : ''}>Esquerda</option><option value="right" ${record.hinge === 'right' ? 'selected' : ''}>Direita</option></select></label>${button('door-toggle', 'Abrir / fechar', 'door', 'wide')}<p class="microcopy">O vão pertence à parede. A folha pode ser aberta sem alterar o mapa.</p></section>`;
    if (type === 'token' || record.kind === 'prop') fields += `<section><span class="eyebrow">ESCALA VISUAL</span><div class="axis-fields">${record.transform.scale.map((value, axis) => numberField(`scale-${axis}`, ['X', 'Y', 'Z'][axis], value, { min: .01 })).join('')}</div>${type === 'token' ? `<span class="eyebrow">BASE · METROS</span><div class="field-grid">${numberField('footprint-0', 'Largura', record.footprint[0], { min: .1 })}${numberField('footprint-1', 'Profundidade', record.footprint[1], { min: .1 })}</div>${colorField('token-color', 'Cor do personagem', actor.color)}` : ''}</section>`;
    if (record.material) fields += `<section><span class="eyebrow">MATERIAL</span>${colorField('material-color', record.kind === 'prop' ? 'Matiz do asset' : 'Cor', record.material.color)}${numberField('material-roughness', 'Rugosidade', record.material.roughness, { min: 0, max: 1 })}</section>`;
    if (type === 'light') fields += `<section><span class="eyebrow">ILUMINAÇÃO</span>${colorField('light-color', 'Cor da fonte', record.color)}${numberField('light-intensity', 'Intensidade', record.intensity, { min: 0, step: record.type === 'point' ? 5 : .1 })}${record.type === 'point' ? numberField('light-distance', 'Alcance · m', record.distance, { min: 0, step: 1 }) : ''}${checkField('light-shadow', 'Projetar sombras', record.shadowEnabled)}</section>`;
    fields += `<section><span class="eyebrow">APRESENTAÇÃO</span>${checkField('object-secret', 'Somente para o mestre', record.audience === 'gm')}${record.locked === undefined ? '' : checkField('object-locked', 'Bloquear edição', record.locked)}</section><div class="object-actions">${button('object-duplicate', 'Duplicar', 'copy')}${button('object-delete', 'Excluir', 'trash', 'danger')}</div>`;
    panel.innerHTML = fields;
  }

  function updateView(event = {}) {
    const doc = store.document;
    if (selection && !locate()) selection = null;
    if (proposal && event.type !== 'saved') clearProposal();
    viewport.setDocument(isPresentation ? projectPresentation(doc) : doc);
    viewport.setSelection(isPresentation ? null : selection);
    document.getElementById('scene-name').value = doc.name;
    document.getElementById('presentation-name').textContent = doc.name;
    document.getElementById('welcome').hidden = Object.keys(doc.layout.entities).length > 0 || !!proposal || isPresentation;
    document.getElementById('undo').disabled = !store.canUndo;
    document.getElementById('redo').disabled = !store.canRedo;
    document.getElementById('undo').title = `Desfazer${store.undoLabel ? `: ${store.undoLabel}` : ''} (Ctrl+Z)`;
    const status = document.getElementById('save-status');
    status.textContent = saving ? 'Salvando…' : store.dirty ? 'Alterações locais' : `Salvo · revisão ${doc.revision}`;
    status.classList.toggle('unsaved', store.dirty); document.getElementById('save-scene').disabled = saving;
    document.getElementById('scene-summary').textContent = `${Object.keys(doc.layout.entities).length} elementos · ${Object.keys(doc.tokens).length} tokens · ${Object.keys(doc.look.lights).length} luzes · grid ${doc.layout.grid.cellSize} m`;
    renderInspector(); renderSidebar(); broadcast();
    clearTimeout(draftTimer); draftTimer = setTimeout(flushDraft, 180);
  }
  async function refreshSaved() { savedScenes = await repository.list(); }
  async function saveScene() {
    if (saving) return false;
    saving = true; updateView({ type: 'saved' });
    const sentDocument = clone(store.document), sentVersion = store.editVersion;
    try {
      const receipt = sentDocument.revision === 0 ? await repository.create(sentDocument) : await repository.save(sentDocument);
      if (store.document.id !== sentDocument.id) return false;
      store.markSaved(receipt, sentVersion);
      lastScene.write(receipt.id);
      flushDraft(); notify(store.dirty ? 'Versão salva. Há alterações posteriores ainda locais.' : 'Cena salva no computador.');
      await refreshSaved().catch(() => notify('Cena salva. A lista de cenas não pôde ser atualizada agora.', true)); return true;
    } catch (error) {
      const conflict = error instanceof ApiError && error.status === 409;
      notify(conflict ? 'Esta cena mudou em outra janela. Seu trabalho está no rascunho. Abra a versão salva ou salve como uma nova cena.' : `Não foi possível salvar: ${error.message}`, true, true);
      flushDraft(); return false;
    } finally { saving = false; updateView({ type: 'saved' }); }
  }
  function canSwitch() { return !saving && (!store.dirty || confirm('Há alterações locais. Continuar sem salvar no servidor?')); }
  async function duplicateScene() {
    if (saving) return;
    const sourceId = store.document.id, sourceVersion = store.editVersion;
    const copy = duplicateDocument(store.document, { name: `${store.document.name} — cópia` });
    saving = true; updateView({ type: 'saved' });
    try {
      // Duplicate the working document, including edits pending after a conflict.
      const receipt = await repository.create(copy);
      if (store.document.id === sourceId && store.editVersion === sourceVersion) {
        selection = null; clearProposal(); store.replace(receipt);
        lastScene.write(receipt.id);
        flushDraft(); notify('Cópia independente salva. Você está editando a nova cena.');
      } else notify('Cópia salva. Suas alterações posteriores continuam na cena atual.');
      await refreshSaved().catch(() => notify('Cópia salva. A lista de cenas não pôde ser atualizada agora.', true));
    } finally { saving = false; updateView({ type: 'saved' }); }
  }
  async function openScene(sceneId) {
    if (!canSwitch()) return;
    const ticket = ++openTicket, sourceId = store.document.id, sourceVersion = store.editVersion;
    const doc = await repository.read(sceneId);
    if (ticket !== openTicket) return;
    if (store.document.id !== sourceId || store.editVersion !== sourceVersion) { notify('A cena atual mudou durante o carregamento. Suas alterações foram preservadas; abra novamente quando estiver pronto.', true); return; }
    selection = null; clearProposal(); setTool('select');
    store.replace(doc); lastScene.write(doc.id); viewport.frameScene();
    const camera = Object.values(doc.cameraPresets)[0]; if (camera) viewport.setCamera(camera);
    document.getElementById('documents-dialog').close();
  }
  async function openDialog() {
    await refreshSaved();
    document.getElementById('documents-list').innerHTML = savedScenes.map((scene) => `<div class="saved-scene"><button data-open="${scene.id}">${icon('room', 23)}<span><strong>${esc(scene.name)}</strong><small>Revisão ${scene.revision} · ${new Date(scene.updatedAt).toLocaleString('pt-BR')}</small></span>${icon('chevron', 16)}</button><button data-delete-scene="${scene.id}" title="Excluir cena salva" aria-label="Excluir ${esc(scene.name)}">${icon('trash', 16)}</button></div>`).join('') || '<div class="empty-dialog">Nenhuma cena salva ainda.<p>Crie uma sala e use Salvar para começar sua coleção.</p></div>';
    document.getElementById('documents-dialog').showModal();
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
    else if (field === 'door-angle') { execute('door.setAngle', { id: record.id, angle: value * Math.PI / 180 }); return; }
    else patch[field] = value;
    execute(`${type}.update`, { id: record.id, patch, ...(actorPatch ? { actorPatch } : {}) });
  }

  async function act(action) {
    if (!initialized) return;
    switch (action) {
      case 'save': return saveScene();
      case 'duplicate-scene': return duplicateScene();
      case 'new': if (canSwitch()) { selection = null; clearProposal(); store.replace(createScene('Nova cena'), { saved: false }); setTool('select'); viewport.frameScene(); } break;
      case 'open': return openDialog();
      case 'close-dialog': document.getElementById('documents-dialog').close(); break;
      case 'room-draw': clearProposal(); setTool('room'); document.getElementById('welcome').hidden = true; notify('Arraste no chão para desenhar o tamanho da sala.'); break;
      case 'accept-proposal': {
        const proposed = proposal; if (!proposed) return;
        if (execute('proposal.accept', { proposal: proposed })) { clearProposal(); viewport.frameScene(); selection = proposed.entities.find((entity) => entity.kind === 'floor')?.id ?? null; viewport.setSelection(selection); renderInspector(); notify('Sala criada. Porta, paredes e luz continuam editáveis.'); } break;
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
      case 'object-duplicate': { const found = locate(); if (found) { const before = new Set([...Object.keys(store.document.layout.entities), ...Object.keys(store.document.tokens), ...Object.keys(store.document.look.lights)]); if (execute(`${found.type}.duplicate`, { id: selection })) { selection = [...Object.keys(store.document.layout.entities), ...Object.keys(store.document.tokens), ...Object.keys(store.document.look.lights)].find((key) => !before.has(key)); viewport.setSelection(selection); renderInspector(); } } break; }
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
    const node = event.target.closest('button'); if (!node) return;
    if (node.dataset.action) { Promise.resolve(act(node.dataset.action)).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.tab) { tab = node.dataset.tab; renderSidebar(); return; }
    if (node.dataset.select) { selection = node.dataset.select; viewport.setSelection(selection); renderInspector(); renderSceneTreeIfVisible(); return; }
    if (node.dataset.asset) {
      const asset = assets.find((item) => item.id === node.dataset.asset);
      placing = asset.type === 'image' ? { type: 'token', name: asset.name.replace(/\.[^.]+$/, ''), color: '#e4b76f', assetRef: { id: asset.id, revision: asset.revision } } : { type: 'prop', asset };
      setTool('place'); notify(`Clique no piso para colocar ${asset.name}.`); return;
    }
    if (node.dataset.environment) { execute('environment.apply', { presetId: node.dataset.environment }); return; }
    if (node.dataset.camera) { viewport.setCamera(store.document.cameraPresets[node.dataset.camera]); publishedCamera = viewport.getCamera(); broadcast(); return; }
    if (node.dataset.cameraDelete) { execute('camera.remove', { id: node.dataset.cameraDelete }); return; }
    if (node.dataset.open) { openScene(node.dataset.open).catch((error) => notify(error.message, true)); return; }
    if (node.dataset.deleteScene) {
      if (saving) { notify('Aguarde o salvamento antes de excluir uma cena.'); return; }
      const scene = savedScenes.find((item) => item.id === node.dataset.deleteScene);
      if (!confirm(`Excluir a cena salva “${scene.name}”?`)) return;
      const version = store.editVersion;
      repository.remove(scene).then(async () => {
        if (store.document.id === scene.id) {
          if (store.editVersion === version) store.replace(createScene('Nova cena'), { saved: false });
          else { store.replace(duplicateDocument(store.document, { name: store.document.name }), { saved: false }); notify('Cena salva excluída. As alterações posteriores foram mantidas como uma nova cena.'); }
        }
        await openDialog();
      }).catch((error) => notify(error.message, true));
    }
  });
  root.addEventListener('change', (event) => {
    if (!initialized) return;
    if (event.target.id === 'asset-file') { importAsset(event.target.files[0]); event.target.value = ''; }
    else if (event.target.dataset.field) changeField(event.target);
    else if (event.target.id === 'scene-name') execute('scene.rename', { name: event.target.value });
  });
  root.addEventListener('input', (event) => { if (event.target.id === 'asset-search') renderAssetCards(event.target.value); });
  root.addEventListener('submit', (event) => { if (event.target.id === 'quick-form') { event.preventDefault(); makeProposal(); } });
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="door-toggle"]')) {
      const found = locate(); if (found?.record.kind === 'door') { const angle = store.document.sessionState.doors[selection] ?? found.record.initialAngle; execute('door.setAngle', { id: selection, angle: Math.abs(angle) < .1 ? Math.PI / 2 : 0 }); }
    }
  });
  window.addEventListener('keydown', (event) => {
    if (!initialized) return;
    if (event.target.closest('input,select,textarea') || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') { if (isPresentation) act('present'); else { clearProposal(); setTool('select'); } }
    if (isPresentation) return;
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === 's') { event.preventDefault(); saveScene(); }
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? store.redo() : store.undo(); }
      if (event.key.toLowerCase() === 'y') { event.preventDefault(); store.redo(); }
      if (event.key.toLowerCase() === 'd') { event.preventDefault(); act('object-duplicate'); }
      return;
    }
    const keys = { q: 'select', w: 'move', r: 'rotate', s: 'scale' };
    if (keys[event.key.toLowerCase()]) setTool(keys[event.key.toLowerCase()]);
    if (event.key.toLowerCase() === 'f') act('frame');
    if (event.key === 'Delete' || event.key === 'Backspace') act('object-delete');
  });
  window.addEventListener('pagehide', () => { flushDraft(); channel?.close(); viewport.destroy(); });
  window.addEventListener('beforeunload', (event) => { if (store.dirty) { event.preventDefault(); event.returnValue = ''; } });

  const initial = await Promise.allSettled([repository.assets(), repository.list(), drafts.read()]);
  if (initial[0].status === 'fulfilled') assets = initial[0].value; else notify('O servidor local está indisponível. Inicie com npm run dev ou npm start; o trabalho continua como rascunho.', true, true);
  if (initial[1].status === 'fulfilled') savedScenes = initial[1].value;
  if (initial[2].status === 'fulfilled') recovery = initial[2].value;
  viewport.setAssets(assets);
  const lastId = lastScene.read();
  if (lastId && savedScenes.some((scene) => scene.id === lastId)) {
    try { store.replace(await repository.read(lastId)); } catch (error) { notify(error.message, true); }
  }
  if (recovery) {
    try { validateDocument(recovery.document); } catch { await drafts.dismiss(recovery); recovery = null; }
    if (recovery && recovery.document.id === store.document.id && contentJSON(recovery.document) === contentJSON(store.document)) { await drafts.dismiss(recovery); recovery = null; }
  }
  initialized = true; document.getElementById('scene-name').disabled = false;
  store.subscribe(updateView); updateView({ type: 'saved' }); viewport.frameScene();
  const firstCamera = Object.values(store.document.cameraPresets)[0]; if (firstCamera) viewport.setCamera(firstCamera);
  if (recovery) {
    document.getElementById('recovery-description').textContent = `“${recovery.document.name}” possui um rascunho local de ${new Date(recovery.savedAt).toLocaleString('pt-BR')}. Restaurar não sobrescreve a versão salva no servidor.`;
    document.getElementById('recovery-dialog').showModal();
  }
  // Read-only diagnostics for browser verification; no backdoor mutations.
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('diagnostics')) {
    Object.defineProperty(window, '__tabletop', { value: Object.freeze({ snapshot: () => clone(store.document), project: (position) => viewport.project(position), camera: () => viewport.getCamera(), stats: () => viewport.getInfo(), editVersion: () => store.editVersion }), configurable: true });
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
