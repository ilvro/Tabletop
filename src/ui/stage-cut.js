/** Letterbox bars that close and reopen over the stage when a scene is replaced. Never blocks input; nothing with reduced motion. */
export function createStageCut(element) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)'), wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  return {
    async close() {
      if (reduced.matches) return;
      element.classList.remove('opening'); element.classList.add('closing');
      await wait(120);
    },
    async open(ready) {
      if (reduced.matches) return;
      try { await ready; } catch { /* the bars open regardless */ }
      element.classList.replace('closing', 'opening');
      setTimeout(() => element.classList.remove('opening'), 240);
    },
  };
}
