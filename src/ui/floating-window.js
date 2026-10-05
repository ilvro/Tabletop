/** Non-modal windows. Position is a local preference, never part of the scene. */
export function floatingWindow(dialog, { trigger, position = [280, 96] } = {}) {
  const handle = dialog.querySelector('[data-window-handle]');
  const key = `tabletop.window.${dialog.id}`;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch { /* optional preference */ }
  let x = Number.isFinite(saved?.[0]) ? saved[0] : position[0];
  let y = Number.isFinite(saved?.[1]) ? saved[1] : position[1];
  let gesture = null, frame = 0;
  let animation = null, closing = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function cancelAnimation() {
    animation?.cancel(); animation = null;
  }
  function fade(from, to, duration, done) {
    cancelAnimation();
    if (reducedMotion.matches || !dialog.animate) { done?.(); return; }
    const current = dialog.animate([{ opacity: from }, { opacity: to }], { duration, easing: 'ease-out', fill: 'forwards' });
    animation = current;
    current.finished.then(() => {
      if (animation !== current) return;
      animation = null; done?.(); current.cancel();
    }).catch(() => {}); // Reopening or closing again cancels the previous transition.
  }
  function close() {
    if (!dialog.open || closing) return;
    const opacity = Number(getComputedStyle(dialog).opacity);
    closing = true; dialog.inert = true; dialog.classList.add('window-closing');
    trigger?.setAttribute('aria-expanded', 'false');
    if (dialog.contains(document.activeElement)) trigger?.focus({ preventScroll: true });
    fade(opacity, 0, 80, () => {
      dialog.close(); closing = false; dialog.inert = false; dialog.classList.remove('window-closing');
    });
  }
  function layout() {
    frame = 0;
    if (!dialog.open) return;
    x = Math.max(8, Math.min(x, window.innerWidth - dialog.offsetWidth - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - dialog.offsetHeight - 8));
    dialog.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(layout); };
  const remember = () => { try { localStorage.setItem(key, JSON.stringify([x, y])); } catch { /* optional preference */ } };
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault(); handle.focus({ preventScroll: true });
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y };
    handle.setPointerCapture(event.pointerId); dialog.classList.add('window-dragging');
  });
  handle.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    x = gesture.x + event.clientX - gesture.startX;
    y = gesture.y + event.clientY - gesture.startY; schedule();
  });
  const finish = () => { if (!gesture) return; gesture = null; dialog.classList.remove('window-dragging'); layout(); remember(); };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('lostpointercapture', finish);
  handle.addEventListener('pointercancel', finish);
  handle.addEventListener('keydown', event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction || event.target !== handle) return;
    event.preventDefault(); event.stopPropagation();
    x += direction[0] * (event.shiftKey ? 40 : 10); y += direction[1] * (event.shiftKey ? 40 : 10);
    layout(); remember();
  });
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(dialog);
  dialog.querySelector('[data-window-reset]').addEventListener('click', () => { [x, y] = position; layout(); remember(); });
  dialog.addEventListener('close', () => {
    if(dialog.open) return; // Ignore a queued close event after the window has reopened.
    trigger?.setAttribute('aria-expanded', 'false');
    cancelAnimation(); closing = false; dialog.inert = false; dialog.classList.remove('window-closing');
    if (dialog.contains(document.activeElement) || document.activeElement === document.body) trigger?.focus({ preventScroll: true });
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    cancelAnimation();
    if (closing) { dialog.close(); closing = false; dialog.inert = false; dialog.classList.remove('window-closing'); }
  });
  return {
    open() {
      const entering = !dialog.open || closing;
      const opacity = dialog.open ? Number(getComputedStyle(dialog).opacity) : 0;
      if (!dialog.open) dialog.show();
      closing = false; dialog.inert = false; dialog.classList.remove('window-closing');
      layout(); trigger?.setAttribute('aria-expanded', 'true');
      if (entering) fade(opacity, 1, 100);
    },
    close,
  };
}
