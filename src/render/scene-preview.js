import { createViewport } from './renderer.js';

/** A single offscreen viewport per gallery, suspended between serialized jobs. */
export function createScenePreviewRenderer() {
  let host, viewport;
  return {
    async render(document, assets, signal) {
      if(signal?.aborted)return null;
      if(!viewport){
        host=globalThis.document.createElement('div');host.setAttribute('aria-hidden','true');
        Object.assign(host.style,{position:'fixed',left:'-10000px',top:'0',width:'480px',height:'270px',pointerEvents:'none'});
        globalThis.document.body.append(host);viewport=createViewport(host,{navigationEnabled:false});viewport.setSuspended(true);viewport.setPresentation(true);
      }
      try{
        viewport.setSuspended(true);viewport.setAssets(assets);viewport.setDocument(document);
        await viewport.ready();if(signal?.aborted)return null;
        const camera=Object.values(document.cameraPresets??{})[0];if(camera)viewport.setCamera(camera);else viewport.frameScene();
        // Load/compile without repeatedly drawing the hidden scene. One frame applies
        // derived asset bounds, zones and deposits before the actual thumbnail pass.
        viewport.setSuspended(false);
        await new Promise(resolve=>requestAnimationFrame(resolve));viewport.setSuspended(true);if(signal?.aborted)return null;
        return await viewport.captureThumbnailAsync();
      }finally{viewport?.setSuspended(true);}
    },
    cancel(){viewport?.setDocument(null);viewport?.setSuspended(true);},
    dispose(){viewport?.destroy();host?.remove();viewport=host=null;},
  };
}
export async function renderScenePreview(document, assets) {
  const renderer=createScenePreviewRenderer();
  try{return await renderer.render(document,assets);}finally{renderer.dispose();}
}
