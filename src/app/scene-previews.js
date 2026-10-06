import { renderScenePreview } from '../render/scene-preview.js';

/** Bounded, serialized derived work; never a document command or a camera publication. */
export function createScenePreviews({ viewport, repository, current, assets, onUpdate, onError, renderPreview = renderScenePreview }) {
  const images = new Map(), pending = new Map();
  let timer, running = false, disposed = false;
  const jobs = [];
  const key = doc => `${doc.documentType}:${doc.id}`;
  const stamp = doc => `${doc.revision}:${doc.updatedAt}`;
  function remember(doc, image, version) {
    const live = current(), previous = images.get(key(doc));
    // A late saved snapshot must not replace the image of edits made afterwards.
    if (live.document.id === doc.id && live.dirty && previous?.version === live.version && version !== live.version) return;
    images.delete(key(doc)); images.set(key(doc), { image, version, stamp: stamp(doc) });
    while (images.size > 64) images.delete(images.keys().next().value);
    onUpdate();
  }
  async function capture(doc, version) {
    let image;
    const live = current();
    if (live.document.id === doc.id && live.version === version && !live.previewing) {
      await viewport.ready();
      const latest = current();
      if (disposed || latest.document.id !== doc.id || latest.version !== version) return null;
      image = viewport.captureThumbnail();
    } else image = await renderPreview(doc, assets());
    if (disposed || !image) return null;
    remember(doc, image, version); return image;
  }
  async function drain() {
    if (running) return;
    running = true;
    while (jobs.length) {
      const { task, resolve } = jobs.shift();
      try { resolve(disposed ? null : await task()); }
      catch (error) { if (!disposed) onError(error); resolve(null); }
    }
    running = false;
  }
  function enqueue(task, urgent = true) {
    return new Promise(resolve => {
      const job = { task, resolve };
      if (urgent) jobs.unshift(job); else jobs.push(job);
      void drain();
    });
  }
  return {
    image(doc) {
      const entry = images.get(key(doc));
      const live = current();
      return (entry && (entry.stamp === stamp(doc) || live.document.id === doc.id && entry.version === live.version)) ? entry.image : doc.preview;
    },
    schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const live = current(), doc = structuredClone(live.document), version = live.version;
        if (!['scene', 'map'].includes(doc.documentType)) return;
        enqueue(async () => {
          if (current().document.id !== doc.id || current().version !== version) return;
          const image = await capture(doc, version);
          if (image && !current().dirty && doc.revision > 0) await repository.savePreview(doc, image);
        });
      }, 1000);
    },
    saved(doc, version) {
      if (!['scene', 'map'].includes(doc.documentType)) return Promise.resolve();
      return enqueue(async () => {
        const cached = images.get(key(doc));
        const image = cached?.version === version && version !== undefined ? cached.image : await capture(doc, version);
        if (image) { await repository.savePreview(doc, image); remember(doc, image, version); }
      });
    },
    ensure(documents) {
      for (const doc of documents) {
        if (doc.preview && doc.previewRevision === doc.revision || pending.get(key(doc)) === stamp(doc)) continue;
        pending.set(key(doc), stamp(doc));
        enqueue(async () => {
          try {
            const snapshot = await repository.read(doc.id, doc.documentType);
            // Render a saved snapshot, never upload current unsaved geometry for it.
            const image = await renderPreview(snapshot, assets());
            if (disposed || !image) return;
            await repository.savePreview(snapshot, image);
            Object.assign(doc, { preview: image, previewRevision: snapshot.revision, revision: snapshot.revision, updatedAt: snapshot.updatedAt, name: snapshot.name });
            remember(snapshot, image);
          } finally { pending.delete(key(doc)); }
        }, false);
      }
    },
    dispose() { disposed = true; clearTimeout(timer); },
  };
}
