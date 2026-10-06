import { createViewport } from './renderer.js';

/** Only used for library entries that aren't currently on the work table. */
export async function renderScenePreview(document, assets) {
  const host = globalThis.document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0', width: '480px', height: '270px', pointerEvents: 'none' });
  globalThis.document.body.append(host);
  let viewport;
  try {
    viewport = createViewport(host, { navigationEnabled: false });
    viewport.setPresentation(true);
    viewport.setAssets(assets); viewport.setDocument(document);
    await viewport.ready();
    const camera = Object.values(document.cameraPresets ?? {})[0];
    if (camera) viewport.setCamera(camera); else viewport.frameScene();
    // ResizeObserver may not have run before the first capture.
    await new Promise(resolve => requestAnimationFrame(resolve));
    return viewport.captureThumbnail();
  } finally { viewport?.destroy(); host.remove(); }
}
