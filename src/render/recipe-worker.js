import { buildRecipeGeometryPayload } from './recipe-geometry.js';

globalThis.onmessage = ({ data: { id, recipe, rockShape, metricBounds, vegetationSeed } }) => {
  try {
    const payload = buildRecipeGeometryPayload(recipe, rockShape, metricBounds, vegetationSeed);
    const transferables = [];
    const seen = new Set();
    for (const part of payload.parts) {
      for (const attr of Object.values(part.attributes)) {
        if (attr?.array?.buffer && !seen.has(attr.array.buffer)) {
          seen.add(attr.array.buffer);
          transferables.push(attr.array.buffer);
        }
      }
      if (part.index?.array?.buffer && !seen.has(part.index.array.buffer)) {
        seen.add(part.index.array.buffer);
        transferables.push(part.index.array.buffer);
      }
    }
    globalThis.postMessage({ id, payload }, transferables);
  } catch (error) {
    globalThis.postMessage({ id, error: error?.message ?? String(error) });
  }
};

