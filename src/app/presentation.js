/** Filter before sending. A clean viewport is separate from the master document. */
export function projectPresentation(document) {
  const copy = structuredClone(document);
  const entities = copy.layout.entities;
  const groups = copy.layout.groups;
  const groupAllowed = (groupId) => {
    const visited = new Set();
    while (groupId) {
      if (visited.has(groupId) || !groups[groupId] || groups[groupId].audience === 'gm') return false;
      visited.add(groupId); groupId = groups[groupId].parentId;
    }
    return true;
  };
  for (const [id, entity] of Object.entries(entities)) {
    if (entity.audience === 'gm' || !groupAllowed(entity.groupId)) delete entities[id];
  }
  // Hidden hosts cannot leave a visible opening, support, or token behind.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, entity] of Object.entries(entities)) {
      if ((entity.wallId && !entities[entity.wallId]) || (entity.surfaceId && !entities[entity.surfaceId])) {
        delete entities[id]; changed = true;
      }
    }
  }
  for (const [id, token] of Object.entries(copy.tokens)) {
    if (token.audience === 'gm' || (token.surfaceId && !entities[token.surfaceId])) delete copy.tokens[id];
  }
  const actorIds = new Set(Object.values(copy.tokens).map((token) => token.actorId));
  copy.actors = Object.fromEntries(Object.entries(copy.actors).filter(([id]) => actorIds.has(id)));
  copy.layout.groups = {};
  copy.layout.areas = {};
  for (const entity of Object.values(entities)) entity.groupId = null;
  copy.look.lights = Object.fromEntries(Object.entries(copy.look.lights).filter(([, light]) => light.audience !== 'gm'));
  copy.look.materialAdjustments = Object.fromEntries(Object.entries(copy.look.materialAdjustments).filter(([id]) => entities[id]));
  copy.sessionState.doors = Object.fromEntries(Object.entries(copy.sessionState.doors).filter(([id]) => entities[id]));
  copy.cameraPresets = {};
  copy.audioCue = null;
  copy.sourceMap = null;
  return copy;
}

export function presentationAssets(document, assets) {
  const ids = new Set(Object.values(document.layout.entities).map((entity) => entity.assetRef?.id));
  for (const actor of Object.values(document.actors)) if (actor.assetRef) ids.add(actor.assetRef.id);
  for (const token of Object.values(document.tokens)) if (token.visualOverride?.assetRef) ids.add(token.visualOverride.assetRef.id);
  return assets.filter((asset) => ids.has(asset.id));
}
