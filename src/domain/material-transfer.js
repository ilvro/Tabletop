import { cloneValue } from '../state/immutable.js';
import { TEXTURE_OPTION_FIELDS, surfacePatch } from './materials.js';

const layerFields = ['color', 'texture', 'textureSize', ...TEXTURE_OPTION_FIELDS];
const selectFields = (value, fields) => Object.fromEntries(fields.filter(key => value[key] !== undefined).map(key => [key, cloneValue(value[key])]));

/** A material clipboard contains authored settings, never geometry, masks or GPU resources. */
export function copyMaterial(record, layerId = null) {
  if (!record?.material) throw new Error('Selecione uma superfície com material.');
  if (layerId !== null) {
    const layer = record.kind === 'terrain' && record.paintLayers?.find(item => item.id === layerId);
    if (!layer) throw new Error('Camada de material não encontrada.');
    return { type: 'layer', settings: selectFields(layer, layerFields) };
  }
  const settings = cloneValue(record.material);
  delete settings.textureSlot;
  return { type: 'material', settings };
}

/** Replacement removes stale optional settings; the destination owns its scope and painted area. */
export function pasteMaterial(record, sample, layerId = null) {
  if (!record?.material || !['material', 'layer'].includes(sample?.type) || !sample.settings || typeof sample.settings !== 'object' || Array.isArray(sample.settings)) throw new Error('Material copiado inválido.');
  if (layerId !== null) {
    if (record.kind !== 'terrain' || !record.paintLayers?.some(layer => layer.id === layerId)) throw new Error('Camada de material não encontrada.');
    return { paintLayers: record.paintLayers.map(layer => {
      if (layer.id !== layerId) return cloneValue(layer);
      const next = cloneValue(layer);
      for (const key of layerFields) delete next[key];
      return { ...next, ...selectFields(sample.settings, layerFields) };
    }) };
  }
  const material = sample.type === 'layer'
    ? { color: '#ffffff', roughness: .8, metalness: 0, ...surfacePatch(sample.settings.texture ?? 'none'), ...cloneValue(sample.settings) }
    : cloneValue(sample.settings);
  delete material.textureSlot;
  if (record.kind === 'prop' && record.material.textureSlot !== undefined) material.textureSlot = record.material.textureSlot;
  return { material };
}
