import { createInspectionOverlay } from '../../ui/inspection-overlay.js';
import { isRevealed } from '../../domain/inspectables.js';

/**
 * The master's side of an inspection: the overlay over the editor's viewport, the keys, and
 * what goes to the projector. Inspecting is local; only "Mostrar aos jogadores" (or a clue
 * reopened from the archive) sends it, and showing a secret document reveals it first.
 */
export function createInspectionControl({ container, viewport, store, execute, notify, send, hasPresentation, onChange = () => {} }) {
  let current = null, projector = null, sequence = 0, pump = 0, quiet = 0, lastSent = '';
  const overlay = createInspectionOverlay(container, {
    onDrag: (dx, dy, seconds) => { viewport.inspectDrag(dx, dy, seconds); stream(); },
    onRelease: () => { viewport.inspectRelease(); stream(); },
    onZoom: (delta, x, y) => { viewport.inspectZoom(delta, x, y); stream(); },
    onPan: (dx, dy) => { viewport.inspectPan(dx, dy); stream(); },
    onReset: () => { viewport.inspectReset(); stream(); },
    onAction: action => Promise.resolve(perform(action)).catch(error => notify(error.message, true)),
  });
  const entity = id => store.document.layout.entities[id];
  // While something is held the editor's own controls step aside.
  const hide = () => { overlay.hide(); document.body.classList.remove('inspecting'); };
  const pagesOf = record => record?.inspectable?.kind === 'document' ? record.inspectable.pages.length : 0;
  const titleOf = record => record?.inspectable?.title || record?.name || 'Objeto';

  function render() {
    if (!current) return;
    const record = entity(current.id), state = viewport.inspectionState();
    if (!record) { close(true); return; }
    document.body.classList.add('inspecting');
    overlay.show({ title: titleOf(record), page: state?.page ?? 0, pages: pagesOf(record), side: state?.side ?? 'front', showing: current.showing, offline: !hasPresentation() });
  }
  /** The projector's view of the inspection: the master's targets, or nothing. */
  function message() {
    const state = viewport.inspectionState();
    return state?.entityId ? { entityId: state.entityId, rotation: state.rotation, zoom: state.zoom, pan: state.pan, page: state.page ?? 0, reading: overlay.reading } : null;
  }
  function post(inspect) { projector = inspect; lastSent = JSON.stringify(inspect); send('inspect', { inspect, inspectSequence: ++sequence }); onChange(); }
  /** While the master turns the object (and while it keeps spinning after a flick), the projector follows, once a frame. */
  function stream() {
    if (!current?.showing || current.released) return;
    quiet = 0;
    if (pump) return;
    const tick = () => {
      pump = 0;
      if (!current?.showing || current.released) return;
      const next = message(), text = JSON.stringify(next);
      if (text !== lastSent) { post(next); quiet = 0; } else quiet++;
      if (quiet < 12) pump = requestAnimationFrame(tick);
    };
    pump = requestAnimationFrame(tick);
  }

  function open(id) {
    const record = entity(id);
    if (!record || record.kind !== 'prop') return false;
    if (current && current.id !== id) close(true);
    viewport.inspect(id);
    current = { id, showing: projector?.entityId === id, released: false };
    render(); onChange(); return true;
  }
  function close(instant = false) {
    if (!current) return;
    const { showing, released } = current;
    current = null; hide(); viewport.closeInspection({ instant });
    if (showing && !released) post(null);
    onChange();
  }
  /** Shown to the players: revealed first when its content is secret, then the same inspection on the projector. */
  function show(id = current?.id) {
    const record = entity(id);
    if (!record) return;
    if (record.audience === 'gm') throw new Error('Este objeto é só do mestre: torne-o visível aos jogadores em Organização para mostrar.');
    if (!hasPresentation()) throw new Error('Abra a segunda tela em Tomadas para mostrar aos jogadores.');
    if (record.inspectable && !isRevealed(store.document, id) && !execute('clue.reveal', { id }, { label: 'Revelar pista' })) return;
    // After the snapshot that carries the revealed content, which is queued for the end of this task.
    queueMicrotask(() => {
      if (current?.id === id) { current.showing = true; current.released = false; post(message()); render(); }
      else post({ entityId: id, rotation: [0, 0, 0, 1], zoom: 1, pan: [0, 0], page: 0, reading: false });
    });
    notify(record.inspectable?.secretUntilRevealed ? 'Pista revelada e mostrada no projetor.' : 'Inspeção no projetor.');
  }
  async function perform(action) {
    if (!current) return;
    const state = viewport.inspectionState();
    if (action === 'previous' || action === 'next') { viewport.inspectPage((state?.page ?? 0) + (action === 'next' ? 1 : -1)); if (overlay.reading) await read(true); stream(); setTimeout(render); }
    else if (action === 'flip') { viewport.inspectFlip(); stream(); }
    else if (action === 'read') await read(!overlay.reading);
    else if (action === 'show') { if (current.showing && !current.released) { current.showing = false; post(null); render(); } else show(); }
    else if (action === 'release') { current.released = true; const id = current.id; current.showing = false; close(); notify(`A inspeção de “${titleOf(entity(id))}” continua no projetor. Recolha em Tomadas → Pistas reveladas.`); }
    else if (action === 'close') close();
  }
  async function read(open) {
    if (!open) { overlay.read(null); stream(); return; }
    const state = viewport.inspectionState(), canvas = await viewport.pageCanvas(current.id, state?.page ?? 0, state?.side ?? 'front');
    if (current && canvas) overlay.read(canvas);
    stream();
  }
  /** Keys while holding something: arrows turn pages, F turns the sheet over, Esc puts it back. Everything else waits. */
  function onKey(event) {
    if (!current || !overlay.open || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key, handled = { Escape: 'escape', ArrowLeft: 'previous', ArrowRight: 'next', f: 'flip', Enter: 'read' }[key];
    event.preventDefault(); event.stopImmediatePropagation();
    if (handled === 'escape') { if (overlay.reading) read(false); else close(); }
    else if (handled) perform(handled).catch(error => notify(error.message, true));
  }
  window.addEventListener('keydown', onKey, { capture: true });
  return {
    open, close, show, render,
    get id() { return current?.id ?? null; },
    /** The entity the projector is inspecting, if any (also after the master let go of it). */
    get onProjector() { return projector?.entityId ?? null; },
    /** Put the projector's inspection away without touching the master's own. */
    recall() { if (current?.showing) { current.showing = false; render(); } if (projector) post(null); },
    /** For a projector that just connected: what it should be showing. */
    resend() { if (projector) send('inspect', { inspect: projector, inspectSequence: ++sequence }); },
    /** The viewport finished putting the object back on its own (it left the scene). */
    closed(id) { if (current?.id === id) { current = null; hide(); onChange(); } if (projector?.entityId === id && !entity(id)) post(null); },
    /** The scene was replaced: nothing held stays held. */
    reset() { if (current) { current = null; hide(); viewport.closeInspection({ instant: true }); } if (projector) post(null); },
  };
}
