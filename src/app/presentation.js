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
  for (const actor of Object.values(copy.actors)) {
    const usesDefaultAsset = Object.values(copy.tokens).some((token) => token.actorId === actor.id &&
      !Object.hasOwn(token.visualOverride ?? {}, 'assetRef'));
    // A public disguise must not disclose the actor's unused canonical portrait.
    if (!usesDefaultAsset) actor.assetRef = null;
  }
  copy.layout.groups = {};
  copy.layout.areas = {};
  for (const entity of Object.values(entities)) entity.groupId = null;
  copy.look.lights = Object.fromEntries(Object.entries(copy.look.lights).filter(([, light]) => light.audience !== 'gm'));
  copy.look.materialAdjustments = Object.fromEntries(Object.entries(copy.look.materialAdjustments).filter(([id]) => entities[id]));
  copy.sessionState.doors = Object.fromEntries(Object.entries(copy.sessionState.doors).filter(([id]) => entities[id]));
  copy.cameraPresets = {};
  copy.audioCue = null;
  copy.sourceMap = null;
  copy.sourceEnvironment = null;
  return copy;
}

export function presentationAssets(document, assets) {
  const references = new Set();
  const include = (reference) => { if (reference) references.add(`${reference.id}@${reference.revision}`); };
  for (const entity of Object.values(document.layout.entities)) include(entity.assetRef);
  for (const token of Object.values(document.tokens)) {
    const reference = Object.hasOwn(token.visualOverride ?? {}, 'assetRef') ?
      token.visualOverride.assetRef : document.actors[token.actorId]?.assetRef;
    include(reference);
  }
  return assets.filter((asset) => references.has(`${asset.id}@${asset.revision}`));
}
