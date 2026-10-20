import { createScenePreviewRenderer } from '../render/scene-preview.js';

const MAX_ENTRIES = 48;
const hash = text => { let value = 2166136261; for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619); return (value >>> 0).toString(36); };
const idle = callback => globalThis.requestIdleCallback ? requestIdleCallback(callback, { timeout: 2000 }) : setTimeout(callback, 200);

/** One thumbnail per saved camera, rendered one at a time while the editor is idle, kept in a small cache. */
export function createShotThumbnails({ assets, canRun, onUpdate, render, pause = 250 }) {
  const cache = new Map(), queue = [];
  let renderer = null, running = false, epoch = 0, disposed = false, controller = null;
  const keyOf = (doc, camera, version) => `${doc.id}:${camera.id}:${version}:${hash(JSON.stringify(camera))}`;
  async function drain() {
    if (running || disposed) return;
    const job = queue.shift(); if (!job) { renderer?.dispose(); renderer = null; return; }
    running = true; const mine = epoch;
    await new Promise(resolve => idle(resolve));
    try {
      if (mine === epoch && !disposed && canRun()) {
        controller = new AbortController();
        const image = render ? await render(job.doc, job.camera, controller.signal) : await (renderer ??= createScenePreviewRenderer()).render(job.doc, assets(), controller.signal, { camera: job.camera });
        if (image && mine === epoch && !disposed) { cache.delete(job.key); cache.set(job.key, image); while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value); onUpdate(); }
      } else if (mine === epoch && !disposed) queue.unshift(job);
    } catch { /* a missing thumbnail only leaves the placeholder */ }
    running = false;
    if (mine === epoch && queue[0] === job) { setTimeout(drain, 400); return; } // blocked by canRun: try again later
    setTimeout(drain, pause); // breathe between shots: each one is a full render
  }
  return {
    /** The thumbnail when it exists; `version` ties it to the edit state of the document. */
    image: (doc, camera, version) => cache.get(keyOf(doc, camera, version)),
    request(doc, version) {
      for (const camera of Object.values(doc.cameraPresets ?? {})) {
        const key = keyOf(doc, camera, version);
        if (cache.has(key) || queue.some(job => job.key === key)) continue;
        queue.push({ key, doc, camera });
      }
      void drain();
    },
    cancel() { epoch++; queue.length = 0; controller?.abort(); renderer?.cancel(); },
    dispose() { disposed = true; this.cancel(); renderer?.dispose(); renderer = null; cache.clear(); },
  };
}
