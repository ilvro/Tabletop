import { generateSurfaceTile } from './surface-pixels.js';

globalThis.onmessage = ({ data: { id, settings, size } }) => {
  try {
    const tile = generateSurfaceTile(settings, size);
    globalThis.postMessage({ id, tile }, [tile.albedo.buffer, tile.details.buffer]);
  } catch (error) {
    globalThis.postMessage({ id, error: error?.message ?? String(error) });
  }
};

