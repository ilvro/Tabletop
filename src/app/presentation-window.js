import { trustSnapshot } from '../state/immutable.js';
import { storageScope } from '../data/paths.js';
import { id, validateDocument } from '../domain/documents.js';
import { ENVIRONMENT_FIELDS } from '../domain/environments.js';
import { createViewport } from '../render/renderer.js';
import { createInspectionOverlay } from '../ui/inspection-overlay.js';
import { icon } from '../ui/icons.js';
import { readUiTheme, applyUiTheme } from '../ui/ui-theme.js';
import { initiativeStrip } from '../ui/initiative-panel.js';

const uiThemeKey = `tabletop-ui-theme${storageScope() === '/' ? '' : ':' + storageScope()}`;

export function startPresentation(root, sessionId) {
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
    Object.defineProperty(window, '__tabletop', { value: Object.freeze({ camera: () => viewport.getCamera(), stats: () => viewport.getInfo(), ready: () => viewport.ready() }), configurable: true });
  }
  const channel = new BroadcastChannel(`tabletop-presentation-${sessionId}`);
  let sequence = 0, receivedCameraSequence = null, shown = null;
  const receiverId = id();
  const request = () => channel.postMessage({ version: 1, sessionId, type: 'ready', receiverId });
  const heartbeat = setInterval(() => channel.postMessage({ version: 1, sessionId, type: 'heartbeat', receiverId }), 5000);
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
    // A token being dragged by the master, before the drop arrives as a new scene.
    if (data?.version === 1 && data.sessionId === sessionId && data.type === 'live-token') { if (shown && data.sequence > sequence) viewport.previewToken(data.tokenId, data.position); return; }
    if (data?.version === 1 && data.sessionId === sessionId && data.type === 'live-camera') {
      if (receivedCameraSequence === null || data.sequence <= sequence || !data.camera) return;
      viewport.setCutaway(data.cutaway); viewport.setCameraGoal(data.camera, Math.min(2, Math.max(.1, Number(data.smoothing) || .6))); receivedCameraSequence = data.cameraSequence; return;
    }
    if (data?.version !== 1 || data.sessionId !== sessionId || !['snapshot', 'camera', 'view'].includes(data.type) || data.sequence <= sequence) return;
    try {
      if (data.type === 'snapshot') { validateDocument(data.document); viewport.setAssets(data.assets); shown = trustSnapshot(data.document); viewport.setDocument(shown); showInitiative(data); document.title = `${data.document.name} — apresentação`; if (inspected) followInspection(inspected); }
      else if (receivedCameraSequence === null) { request(); return; }
      sequence = data.sequence; viewport.setCutaway(data.cutaway); document.body.classList.toggle('letterboxed', data.letterbox === true);
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
  document.getElementById('presentation-quality').onchange = e => viewport.setLightingQuality(e.target.value);
  document.getElementById('presentation-effects').onclick = event => { effectsEnabled = !effectsEnabled; viewport.setEffectsEnabled(effectsEnabled); event.currentTarget.setAttribute('aria-pressed', String(effectsEnabled)); };
  document.getElementById('presentation-fullscreen').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  window.addEventListener('pagehide', () => { clearInterval(retry); clearInterval(heartbeat); clearTimeout(idleTimer); channel.postMessage({ version: 1, sessionId, type: 'closed', receiverId }); channel.close(); viewport.destroy(); });
  request();
}

