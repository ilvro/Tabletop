import { groupChain } from './geometry.js';

/**
 * Light switches. A switch reaches the light of objects (`illumination`) and the free lights of the
 * scene, either everything inside a folder and its subfolders or a list of ids. The light of the
 * environment is never part of a folder. Switching only flips `enabled`: colour, force and every
 * other setting are kept for when the light comes back on.
 */
export function switchTargets(document, { groupId = null, ids = null } = {}) {
  const look = document.look ?? document.defaultLook;
  const wanted = record => ids ? ids.includes(record.id) : Boolean(groupId) && groupChain(document, record.groupId).some(group => group.id === groupId);
  return {
    entities: Object.values(document.layout.entities).filter(entity => entity.illumination && wanted(entity)).map(entity => entity.id),
    lights: Object.values(look?.lights ?? {}).filter(light => light.id !== 'environment-key' && wanted(light)).map(light => light.id),
  };
}

/** 'none' when the scope has no light, otherwise 'on', 'off' or 'mixed'. */
export function switchState(document, scope) {
  const look = document.look ?? document.defaultLook, { entities, lights } = switchTargets(document, scope);
  const states = [...entities.map(id => document.layout.entities[id].illumination.enabled !== false), ...lights.map(id => look.lights[id].enabled !== false)];
  if (!states.length) return 'none';
  return states.every(Boolean) ? 'on' : states.some(Boolean) ? 'mixed' : 'off';
}

/** The light of one record (an object with its own light, or a free light), or null when it has none. */
export function recordLightOn(record) {
  if (record?.illumination) return record.illumination.enabled !== false;
  if (record?.type && 'intensity' in record) return record.enabled !== false;
  return null;
}
