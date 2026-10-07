const collections = doc => ({ entities: doc.layout.entities, tokens: doc.tokens ?? {}, actors: doc.actors ?? {}, groups: doc.layout.groups, levels: doc.layout.levels ?? {}, layers: doc.layout.layers ?? {}, lights: (doc.look ?? doc.defaultLook).lights });
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
export function documentChanges(before, after) {
  if (!before || before.id !== after.id || before.documentType !== after.documentType) return { full: true };
  const a = collections(before), b = collections(after), changed = {}, categories = new Set();
  for (const name of Object.keys(a)) {
    const ids = [...new Set([...Object.keys(a[name]), ...Object.keys(b[name])])].filter(id => a[name][id] !== b[name][id]);
    if (!ids.length) continue;
    changed[name] = ids;
    for (const id of ids) {
      const old = a[name][id], next = b[name][id];
      if (!old || !next) { categories.add('structure'); continue; }
      for (const key of new Set([...Object.keys(old), ...Object.keys(next)])) if (!same(old[key], next[key])) {
        categories.add(['name','tags','locked'].includes(key) ? 'metadata' : ['illumination'].includes(key) ? 'light' : ['lightingZone'].includes(key) ? 'zone' : ['transform','position','rotation','anchor'].includes(key) ? 'transform' : ['groupId','parentId','levelId','layerId','visible','audience','anchored'].includes(key) ? 'organization' : ['material','visualOverride'].includes(key) ? 'material' : 'geometry');
      }
    }
  }
  const oldLook = before.look ?? before.defaultLook, look = after.look ?? after.defaultLook;
  const lookFields = [...new Set([...Object.keys(oldLook), ...Object.keys(look)])].filter(key => key !== 'lights' && oldLook[key] !== look[key]);
  if (lookFields.length) categories.add('look');
  if (before.layout.grid !== after.layout.grid) categories.add('grid');
  if(before.layout.areas!==after.layout.areas||before.layout.compositions!==after.layout.compositions)categories.add('organization');
  if(before.audioCue!==after.audioCue||before.sourceMap!==after.sourceMap||before.sourceEnvironment!==after.sourceEnvironment)categories.add('metadata');
  if (before.sessionState !== after.sessionState) categories.add('session');
  if (before.cameraPresets !== after.cameraPresets) categories.add('camera');
  return { full: false, ...changed, lookFields, categories: [...categories], name: before.name !== after.name };
}
