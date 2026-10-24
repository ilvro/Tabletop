import { icon } from './icons.js';

/**
 * What is laid over a viewport while an object is held up: the title card, the page, and on the
 * master's screen a layer that turns the gestures into turns, zoom and pan, plus the buttons.
 * The projector gets the card and the reader only.
 */
export function createInspectionOverlay(container, { interactive = true, onDrag = () => {}, onRelease = () => {}, onZoom = () => {}, onPan = () => {}, onReset = () => {}, onAction = () => {} } = {}) {
  const layer = document.createElement('div');
  layer.className = `inspection-layer${interactive ? ' is-interactive' : ''}`; layer.hidden = true; layer.dataset.testid = 'inspection';
  layer.innerHTML = `${interactive ? '<div class="inspection-capture" tabindex="-1" aria-label="Objeto inspecionado: arraste para girar, roda aproxima, clique duplo volta ao enquadramento"></div>' : ''}
    <header class="inspection-card"><span class="tt-tag is-small">PISTA</span><h2 class="tt-display"></h2><small class="inspection-page"></small></header>
    ${interactive ? `<nav class="inspection-controls" aria-label="Inspeção">
      <button type="button" data-inspect="previous" aria-label="Página anterior" data-tip="Página anterior" data-key="←">${icon('chevron')}</button>
      <button type="button" data-inspect="flip" data-key="F">Virar</button>
      <button type="button" data-inspect="read">Ler</button>
      <button type="button" data-inspect="next" aria-label="Próxima página" data-tip="Próxima página" data-key="→">${icon('chevron')}</button>
      <span class="inspection-divider"></span>
      <button type="button" data-inspect="show" class="accent-outline" aria-pressed="false">${icon('display')}<span>Mostrar aos jogadores</span></button>
      <button type="button" data-inspect="release" hidden>Soltar no projetor</button>
      <button type="button" data-inspect="close" data-key="Esc">${icon('close')}<span>Devolver</span></button>
    </nav><p class="inspection-hint">Arraste para girar · roda aproxima · Shift ou botão direito arrasta · clique duplo volta ao enquadramento</p>` : ''}
    <div class="inspection-reader" hidden><div class="inspection-sheet"></div>${interactive ? `<button type="button" data-inspect="read" class="inspection-reader-close">${icon('close')}<span>Fechar leitura</span></button>` : ''}</div>`;
  container.append(layer);
  const capture = layer.querySelector('.inspection-capture'), reader = layer.querySelector('.inspection-reader');
  let drag = null;
  if (capture) {
    capture.addEventListener('pointerdown', event => {
      capture.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now(), pan: event.button !== 0 || event.shiftKey };
    });
    capture.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y, now = performance.now(), seconds = (now - drag.time) / 1000;
      Object.assign(drag, { x: event.clientX, y: event.clientY, time: now });
      if (drag.pan) onPan(dx, dy); else onDrag(dx, dy, seconds);
    });
    const end = event => { if (drag?.id !== event.pointerId) return; drag = null; onRelease(); };
    capture.addEventListener('pointerup', end); capture.addEventListener('pointercancel', end);
    capture.addEventListener('wheel', event => { event.preventDefault(); onZoom(event.deltaY * (event.deltaMode === 1 ? 33 : 1), event.clientX, event.clientY); }, { passive: false });
    capture.addEventListener('dblclick', event => { event.preventDefault(); onReset(); });
    capture.addEventListener('contextmenu', event => event.preventDefault());
  }
  layer.addEventListener('click', event => { const button = event.target.closest('[data-inspect]'); if (button && !button.disabled) onAction(button.dataset.inspect); });
  return {
    get open() { return !layer.hidden; },
    get reading() { return !reader.hidden; },
    /** `{ title, page, pages, side, showing, released }`; pages is 0 for an object. */
    show(state) {
      layer.hidden = false;
      layer.querySelector('h2').textContent = state.title || 'Objeto';
      layer.querySelector('.inspection-card .tt-tag').textContent = state.pages ? 'DOCUMENTO' : 'OBJETO';
      layer.querySelector('.inspection-page').textContent = state.pages ? `Página ${state.page + 1} de ${state.pages} · ${state.side === 'back' ? 'verso' : 'frente'}` : '';
      for (const [name, disabled] of [['previous', !state.pages || state.page <= 0], ['next', !state.pages || state.page >= state.pages - 1], ['read', !state.pages]]) for (const node of layer.querySelectorAll(`[data-inspect="${name}"]`)) if (!node.classList.contains('inspection-reader-close')) node.disabled = disabled;
      const show = layer.querySelector('[data-inspect="show"]');
      if (show) { show.setAttribute('aria-pressed', String(Boolean(state.showing))); show.classList.toggle('active', Boolean(state.showing)); show.querySelector('span').textContent = state.showing ? 'No projetor' : 'Mostrar aos jogadores'; show.disabled = Boolean(state.offline); show.title = state.offline ? 'Abra a segunda tela em Tomadas para mostrar aos jogadores.' : ''; }
      const release = layer.querySelector('[data-inspect="release"]'); if (release) release.hidden = !state.showing;
      if (capture && document.activeElement !== capture && !layer.contains(document.activeElement)) capture.focus({ preventScroll: true });
    },
    /** A page drawn at reading size, shown sharp over the blur; null closes the reader. */
    read(canvas) {
      const sheet = reader.querySelector('.inspection-sheet');
      if (!canvas) { reader.hidden = true; sheet.replaceChildren(); return; }
      const image = new Image(); image.alt = 'Página em leitura'; image.src = canvas.toDataURL('image/png');
      sheet.replaceChildren(image); reader.hidden = false;
    },
    hide() { layer.hidden = true; reader.hidden = true; reader.querySelector('.inspection-sheet').replaceChildren(); drag = null; },
    destroy() { layer.remove(); },
  };
}
