import { validateDocument, ValidationError } from './validation.js';
export { validateDocument, ValidationError };

export const clone = value => structuredClone(value);
export const id = () => globalThis.crypto.randomUUID();

const material = (color, override = {}) => ({ color, roughness: 0.8, metalness: 0, ...clone(override) });
const transform = options => ({
  position: clone(options.transform?.position ?? options.position ?? [0, 0, 0]),
  rotation: clone(options.transform?.rotation ?? options.rotation ?? [0, 0, 0, 1]),
  scale: clone(options.transform?.scale ?? options.scale ?? [1, 1, 1]),
});

export function createEntity(kind, options = {}) {
  const names = { floor: 'Piso', wall: 'Parede', door: 'Porta', prop: 'Objeto' };
  if (!names[kind]) throw new ValidationError(`Tipo de entidade desconhecido: ${kind}.`);
  const common = {
    id: options.id ?? id(), name: options.name ?? names[kind], kind,
    groupId: options.groupId ?? null, surfaceId: options.surfaceId ?? null,
    locked: options.locked ?? false, audience: options.audience ?? 'all', tags: clone(options.tags ?? []),
  };
  if (kind === 'door') return { ...common,
    wallId: options.wallId ?? null, offset: options.offset ?? 2, width: options.width ?? 1,
    height: options.height ?? 2.1, sill: options.sill ?? 0, hinge: options.hinge ?? 'left',
    initialAngle: options.initialAngle ?? Math.PI / 4, material: material('#8b6342', options.material),
  };
  if (kind === 'floor') return { ...common, transform: transform(options),
    width: options.width ?? 6, length: options.length ?? 5, thickness: options.thickness ?? 0.16,
    material: material('#847d70', options.material),
  };
  if (kind === 'wall') return { ...common, transform: transform(options),
    length: options.length ?? 4, height: options.height ?? 2.6, thickness: options.thickness ?? 0.18,
    material: material('#b3aca0', options.material),
  };
  return { ...common, transform: transform(options), assetRef: clone(options.assetRef ?? { id: 'builtin-crate', revision: 1 }),
    footprint: clone(options.footprint ?? [1, 1]), material: material('#ffffff', options.material),
  };
}

export function createToken(options = {}) {
  const actor = {
    id: options.actorId ?? id(), name: options.name ?? 'Personagem', color: options.color ?? '#d1a861',
    assetRef: clone(options.assetRef ?? null),
  };
  const token = {
    id: options.id ?? id(), actorId: actor.id, transform: transform(options),
    surfaceId: options.surfaceId ?? null, footprint: clone(options.footprint ?? [1, 1]),
    locked: options.locked ?? false, audience: options.audience ?? 'all', visualOverride: null,
  };
  return { actor, token };
}

export function createLight(options = {}) {
  return {
    id: options.id ?? id(), name: options.name ?? (options.type === 'directional' ? 'Luz principal' : 'Luz local'),
    type: options.type ?? 'point', position: clone(options.position ?? [0, 2.3, 0]),
    rotation: clone(options.rotation ?? [0, 0, 0, 1]), color: options.color ?? '#ffdfae',
    intensity: options.intensity ?? 40, distance: options.distance ?? 12,
    shadowEnabled: options.shadowEnabled ?? false, audience: options.audience ?? 'all',
    ...(options.role ? { role: options.role } : {}),
  };
}

function createLook() {
  const key = createLight({ type: 'directional', name: 'Luz principal', role: 'key',
    position: [4, 8, 6], rotation: [0.27059805, 0.27059805, 0, 0.92387953],
    color: '#ffe8c5', intensity: 2.2, distance: 0, shadowEnabled: true });
  return { background: '#202a34', fill: { skyColor: '#a7c4db', groundColor: '#5b493b', intensity: 1.35 },
    lights: { [key.id]: key }, materialAdjustments: {} };
}

function envelope(name, documentType) {
  const now = new Date().toISOString();
  return { schemaVersion: 1, documentType, id: id(), revision: 0, name, createdAt: now, updatedAt: now,
    layout: { grid: { type: 'square', origin: [0, 0], cellSize: 1, visible: true, snap: true,
      color: '#87969e', opacity: 0.25 }, entities: {}, groups: {}, areas: {} } };
}

export function createScene(name = 'Cena sem título') {
  return { ...envelope(name, 'scene'), sourceMap: null, sourceEnvironment: null, look: createLook(),
    actors: {}, tokens: {}, cameraPresets: {}, sessionState: { doors: {} }, audioCue: null };
}

export function createMap(name = 'Mapa sem título') {
  return { ...envelope(name, 'map'), defaultLook: createLook() };
}

/** Duplicate only document-owned IDs. External asset/source references remain immutable. */
export function duplicateDocument(document, { name } = {}) {
  validateDocument(document);
  const copy = clone(document), remap = new Map();
  const look = copy.look ?? copy.defaultLook;
  const collections = [copy.layout.entities, copy.layout.groups, copy.layout.areas, look.lights,
    copy.actors, copy.tokens, copy.cameraPresets].filter(Boolean);
  for (const collection of collections) for (const value of Object.values(collection)) remap.set(value.id, id());
  const ref = value => remap.get(value) ?? value;
  for (const collection of collections) {
    for (const [oldId, value] of Object.entries(collection)) {
      delete collection[oldId];
      value.id = ref(oldId);
      for (const field of ['groupId', 'parentId', 'surfaceId', 'wallId', 'actorId']) if (value[field]) value[field] = ref(value[field]);
      if (value.memberIds) value.memberIds = value.memberIds.map(ref);
      collection[value.id] = value;
    }
  }
  look.materialAdjustments = Object.fromEntries(Object.entries(look.materialAdjustments).map(([key, value]) => [ref(key), value]));
  if (copy.sessionState) copy.sessionState.doors = Object.fromEntries(Object.entries(copy.sessionState.doors).map(([key, value]) => [ref(key), value]));
  const now = new Date().toISOString();
  Object.assign(copy, { id: id(), name: name ?? `${document.name} — cópia`, revision: 0, createdAt: now, updatedAt: now });
  return validateDocument(copy);
}
