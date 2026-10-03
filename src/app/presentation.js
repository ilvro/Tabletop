/** Filter before sending. A clean viewport is separate from the master document. */
export function projectPresentation(document) {
  const copy = structuredClone(document);
  const entities = copy.layout.entities;
  const groups = copy.layout.groups;
  const semanticAllowed = record => ['levels', 'layers'].every((collection, index) => {
    const key = record[index === 0 ? 'levelId' : 'layerId'];
    const entry = copy.layout[collection]?.[key]; return !entry || entry.visible !== false && entry.audience !== 'gm';
  });
  const groupAllowed = (groupId) => {
    const visited = new Set();
    while (groupId) {
      if (visited.has(groupId) || !groups[groupId] || groups[groupId].audience === 'gm' || groups[groupId].visible === false) return false;
      visited.add(groupId); groupId = groups[groupId].parentId;
    }
    return true;
  };
  for (const [id, entity] of Object.entries(entities)) {
    if (entity.audience === 'gm' || !groupAllowed(entity.groupId) || !semanticAllowed(entity)) delete entities[id];
  }
  // Hidden hosts cannot leave a visible opening, support, or token behind.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, entity] of Object.entries(entities)) {
      if ((entity.wallId && !entities[entity.wallId]) || (entity.surfaceId && !entities[entity.surfaceId]) || (entity.anchor && !entities[entity.anchor.hostId])) {
        delete entities[id]; changed = true;
      }
    }
  }
  for (const [id, token] of Object.entries(copy.tokens ?? {})) {
    if (token.audience === 'gm' || !groupAllowed(token.groupId) || !semanticAllowed(token) || (token.surfaceId && !entities[token.surfaceId])) delete copy.tokens[id];
  }
  const actorIds = new Set(Object.values(copy.tokens ?? {}).map((token) => token.actorId));
  if (copy.actors) copy.actors = Object.fromEntries(Object.entries(copy.actors).filter(([id]) => actorIds.has(id)));
  for (const actor of Object.values(copy.actors ?? {})) {
    const usesDefaultAsset = Object.values(copy.tokens).some((token) => token.actorId === actor.id &&
      !Object.hasOwn(token.visualOverride ?? {}, 'assetRef'));
    // A public disguise must not disclose the actor's unused canonical portrait.
    if (!usesDefaultAsset) actor.assetRef = null;
  }
  copy.layout.groups = {};
  copy.layout.areas = {};
  if (copy.layout.compositions) copy.layout.compositions = {};
  for (const entity of Object.values(entities)) { entity.groupId = null; if (entity.floorIds) entity.floorIds = entity.floorIds.filter(key => entities[key]); }
  for (const token of Object.values(copy.tokens ?? {})) if (token.groupId !== undefined) token.groupId = null;
  const look = copy.look ?? copy.defaultLook;
  look.lights = Object.fromEntries(Object.entries(look.lights).filter(([, light]) => light.audience !== 'gm' && groupAllowed(light.groupId) && semanticAllowed(light) && (!light.surfaceId || entities[light.surfaceId]) && (!light.anchor || entities[light.anchor.hostId])));
  for (const light of Object.values(look.lights)) if (light.groupId !== undefined) light.groupId = null;
  look.materialAdjustments = Object.fromEntries(Object.entries(look.materialAdjustments).filter(([id]) => entities[id]));
  for (const collection of ['levels', 'layers']) if (copy.layout[collection]) copy.layout[collection] = Object.fromEntries(Object.entries(copy.layout[collection]).filter(([, entry]) => entry.audience !== 'gm' && entry.visible !== false));
  for (const entity of Object.values(entities)) for (const field of ['fromLevelId', 'toLevelId']) if (entity[field] && !copy.layout.levels?.[entity[field]]) entity[field] = null;
  if (copy.documentType === 'scene') {
    copy.sessionState.doors = Object.fromEntries(Object.entries(copy.sessionState.doors).filter(([id]) => entities[id]));
    copy.cameraPresets = {}; copy.audioCue = null; copy.sourceMap = null; copy.sourceEnvironment = null;
  }
  return copy;
}

export function presentationAssets(document, assets) {
  const references = new Set();
  const include = (reference) => { if (reference) references.add(`${reference.id}@${reference.revision}`); };
  for (const entity of Object.values(document.layout.entities)) include(entity.assetRef);
  for (const token of Object.values(document.tokens ?? {})) {
    const reference = Object.hasOwn(token.visualOverride ?? {}, 'assetRef') ?
      token.visualOverride.assetRef : document.actors[token.actorId]?.assetRef;
    include(reference);
  }
  return assets.filter((asset) => references.has(`${asset.id}@${asset.revision}`));
}
