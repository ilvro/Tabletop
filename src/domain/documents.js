import { cloneValue } from '../state/immutable.js';
import { validateDocument, ValidationError } from './validation.js';
import { WATER_DEFAULTS } from './landscape.js';
import { polygonSize } from './geometry.js';
import { kelvinToColor } from './lighting.js';
import { migrateDocument } from './migrations.js';
export { migrateDocument };
export { validateDocument, ValidationError };

export const clone = cloneValue;
export const id = () => globalThis.crypto.randomUUID();

const material = (color, override = {}) => ({ color, roughness: 0.8, metalness: 0, ...clone(override) });
const transform = options => ({
  position: clone(options.transform?.position ?? options.position ?? [0, 0, 0]),
  rotation: clone(options.transform?.rotation ?? options.rotation ?? [0, 0, 0, 1]),
  scale: clone(options.transform?.scale ?? options.scale ?? [1, 1, 1]),
});

export function createEntity(kind, options = {}) {
  const names = { water: 'Água / gelo', terrain: 'Terreno', floor: 'Piso', wall: 'Parede', door: 'Porta', window: 'Janela', stairs: 'Escada', ramp: 'Rampa', prop: 'Objeto' };
  if (!names[kind]) throw new ValidationError(`Tipo de entidade desconhecido: ${kind}.`);
  const common = {
    id: options.id ?? id(), name: options.name ?? names[kind], kind,
    groupId: options.groupId ?? null, surfaceId: options.surfaceId ?? null,
    locked: options.locked ?? false, audience: options.audience ?? 'all', tags: clone(options.tags ?? []),
    ...(options.illumination ? {illumination:clone(options.illumination)} : {}),
    ...(options.lightingZone ? {lightingZone:clone(options.lightingZone)} : {}),
    ...semanticFields(options),
  };
  if (kind === 'door') return { ...common,
    wallId: options.wallId ?? null, offset: options.offset ?? 2, width: options.width ?? 1,
    height: options.height ?? 2.1, sill: options.sill ?? 0, hinge: options.hinge ?? 'left',
    initialAngle: options.initialAngle ?? Math.PI / 4, material: material('#8b6342', options.material),
  };
  if (kind === 'window') return { ...common, wallId: options.wallId ?? null,
    offset: options.offset ?? 2, width: options.width ?? 1.2, height: options.height ?? 1,
    sill: options.sill ?? .9, style: options.style ?? 'glass', material: material('#618791', options.material) };
  if (kind === 'water') return { ...common, transform: transform(options),
    width: options.vertices ? polygonSize(options.vertices)[0] : options.width ?? 8, length: options.vertices ? polygonSize(options.vertices)[1] : options.length ?? 5, depth: options.depth ?? .35,
    ...(options.vertices ? {vertices:clone(options.vertices)} : {}), material:material('#43868d', options.material), water:{...WATER_DEFAULTS,...clone(options.water??{})} };
  if (kind === 'floor') return { ...common, transform: transform(options),
    width: options.vertices ? polygonSize(options.vertices)[0] : options.width ?? 6, length: options.vertices ? polygonSize(options.vertices)[1] : options.length ?? 5, thickness: options.thickness ?? 0.16,
    ...(options.vertices ? { vertices: clone(options.vertices) } : {}),
    ...(options.holes ? { holes: clone(options.holes) } : {}),
    material: material('#847d70', options.material),
  };
  if (kind === 'terrain') {
    const segments = options.segments ?? 32;
    if (!Number.isInteger(segments) || segments < 2 || segments > 64) throw new ValidationError('O terreno aceita de 2 a 64 divisões por eixo.');
    return { ...common, transform: transform(options), width: options.width ?? 20, length: options.length ?? 20,
      segments, heights: clone(options.heights ?? Array((segments + 1) ** 2).fill(0)), material: material('#71805a', options.material),
      ...(options.snowMask ? {snowMask:clone(options.snowMask)} : {}), flatShading: options.flatShading ?? false, paintLayers: clone(options.paintLayers ?? [{ id: id(), name: 'Grama', color: options.material?.color ?? '#71805a', opacity: 1, visible: true, weights: Array((segments + 1) ** 2).fill(1) }]) };
  }
  if (kind === 'wall') return { ...common, transform: transform(options),
    length: options.length ?? 4, height: options.height ?? 2.6, thickness: options.thickness ?? 0.18,
    material: material('#b3aca0', options.material),
    ...(options.floorIds ? { floorIds: clone(options.floorIds) } : {}),
  };
  if (kind === 'stairs' || kind === 'ramp') return { ...common, transform: transform(options),
    width: options.width ?? 1.5, length: options.length ?? 3, height: options.height ?? 1.5,
    ...(kind === 'stairs' ? { steps: options.steps ?? 8 } : {}), material: material('#847d70', options.material),
    ...(options.fromLevelId ? { fromLevelId: options.fromLevelId } : {}), ...(options.toLevelId ? { toLevelId: options.toLevelId } : {}),
  };
  return { ...common, transform: transform(options), assetRef: clone(options.assetRef ?? { id: 'builtin-crate', revision: 1 }),
    ...(options.supportHeight !== undefined ? { supportHeight: options.supportHeight } : {}),
    footprint: clone(options.footprint ?? [1, 1]), material: material('#ffffff', options.material),
    ...(options.localEffect ? { localEffect: clone(options.localEffect) } : {}),
    ...(options.vegetationSeed !== undefined ? {vegetationSeed:options.vegetationSeed} : {}),
    ...(options.rockSculpt ? {rockSculpt:clone(options.rockSculpt)} : {}),
    ...(options.rockShape ? { rockShape: clone(options.rockShape) } : {}),
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
    groupId: options.groupId ?? null,
    locked: options.locked ?? false, audience: options.audience ?? 'all', visualOverride: null,
    ...semanticFields(options),
  };
  return { actor, token };
}

export function createLight(options = {}) {
  return {
    id: options.id ?? id(), name: options.name ?? (options.type === 'directional' ? 'Luz principal' : options.type === 'spot' ? 'Luz spot' : 'Luz local'),
    type: options.type ?? 'point', position: clone(options.position ?? [0, 2.3, 0]),
    rotation: clone(options.rotation ?? [0, 0, 0, 1]), color: options.temperature != null ? kelvinToColor(options.temperature) : options.color ?? '#ffdfae',
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.enabled !== undefined ? { enabled: options.enabled } : {}),
    ...(options.flicker ? { flicker: clone(options.flicker) } : {}),
    ...Object.fromEntries(['priority','shadowPolicy','mapSize','projection','projectionSeed','projectionRotation'].filter(k=>options[k]!==undefined).map(k=>[k,options[k]])),
    ...(options.type === 'spot' ? { angle: options.angle ?? Math.PI / 6, penumbra: options.penumbra ?? .4 } : {}),
    intensity: options.intensity ?? 40, distance: options.distance ?? 12,
    shadowEnabled: options.shadowEnabled ?? false, audience: options.audience ?? 'all',
    groupId: options.groupId ?? null, surfaceId: options.surfaceId ?? null, locked: options.locked ?? false,
    ...(options.role ? { role: options.role } : {}),
    ...semanticFields(options),
  };
}

function semanticFields(options) {
  return Object.fromEntries(['levelId', 'layerId', 'anchor'].filter(key => options[key] !== undefined).map(key => [key, clone(options[key])]));
}

export function createLevel(options = {}) {
  return { id: options.id ?? id(), name: options.name ?? 'Andar', elevation: options.elevation ?? 0, visible: options.visible ?? true, locked: options.locked ?? false, audience: options.audience ?? 'all' };
}
export function createLayer(options = {}) {
  return { id: options.id ?? id(), name: options.name ?? 'Camada', visible: options.visible ?? true, locked: options.locked ?? false, audience: options.audience ?? 'all' };
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
  return { schemaVersion: 2, documentType, id: id(), revision: 0, name, createdAt: now, updatedAt: now,
    layout: { grid: { type: 'square', origin: [0, 0], cellSize: 1, visible: true, snap: true,
      color: '#87969e', opacity: 0.25 }, entities: {}, groups: {}, areas: {}, compositions: {} } };
}

export function createScene(name = 'Cena sem título') {
  return { ...envelope(name, 'scene'), sourceMap: null, sourceEnvironment: null, look: createLook(),
    actors: {}, tokens: {}, cameraPresets: {}, sessionState: { doors: {} }, audioCue: null };
}

export function createMap(name = 'Mapa sem título') {
  return { ...envelope(name, 'map'), defaultLook: createLook() };
}

export function createSceneFromMap(map, name) {
  map = migrateDocument(map);
  const now = new Date().toISOString();
  const scene = {
    schemaVersion: 2,
    documentType: 'scene',
    id: id(),
    revision: 0,
    name: name ?? `Cena de ${map.name}`,
    createdAt: now,
    updatedAt: now,
    layout: clone(map.layout),
    sourceMap: { id: map.id, revision: map.revision },
    sourceEnvironment: null,
    look: clone(map.defaultLook),
    actors: {},
    tokens: {},
    cameraPresets: {},
    sessionState: { doors: {} },
    audioCue: null,
  };
  return validateDocument(scene);
}

export function createMapFromScene(scene, name) {
  scene = migrateDocument(scene);
  const now = new Date().toISOString();
  const map = {
    schemaVersion: 2,
    documentType: 'map',
    id: id(),
    revision: 0,
    name: name ?? `Mapa de ${scene.name}`,
    createdAt: now,
    updatedAt: now,
    layout: clone(scene.layout),
    defaultLook: clone(scene.look ?? scene.defaultLook),
  };
  return validateDocument(map);
}

/** Duplicate only document-owned IDs. External asset/source references remain immutable. */
export function duplicateDocument(document, { name } = {}) {
  document = migrateDocument(document);
  if (document.documentType === 'environment') return validateDocument({ ...clone(document), id: id(), revision: 0, name: name ?? `${document.name} — cópia`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const copy = clone(document), remap = new Map();
  const look = copy.look ?? copy.defaultLook;
  const collections = [copy.layout.levels, copy.layout.layers, copy.layout.entities, copy.layout.groups, copy.layout.areas, copy.layout.compositions, look.lights,
    copy.actors, copy.tokens, copy.cameraPresets].filter(Boolean);
  for (const collection of collections) for (const value of Object.values(collection)) remap.set(value.id, id());
  for (const composition of Object.values(copy.layout.compositions)) for (const slot of Object.values(composition.slots)) if (!remap.has(slot.id)) remap.set(slot.id, id());
  const ref = value => remap.get(value) ?? value;
  for (const collection of collections) {
    for (const [oldId, value] of Object.entries(collection)) {
      delete collection[oldId];
      value.id = ref(oldId);
      for (const field of ['groupId', 'parentId', 'surfaceId', 'wallId', 'actorId', 'areaId', 'levelId', 'layerId', 'fromLevelId', 'toLevelId']) if (value[field]) value[field] = ref(value[field]);
      if (value.anchor) value.anchor.hostId = ref(value.anchor.hostId);
      if (value.floorIds) value.floorIds = value.floorIds.map(ref);
      if (value.slots) for (const slot of Object.values(value.slots)) {
        slot.id = ref(slot.id);
        for (const field of ['groupId', 'surfaceId', 'levelId', 'layerId']) if (slot.baseline[field]) slot.baseline[field] = ref(slot.baseline[field]);
      }
      if (value.memberIds) value.memberIds = value.memberIds.map(ref);
      collection[value.id] = value;
    }
  }
  look.materialAdjustments = Object.fromEntries(Object.entries(look.materialAdjustments).map(([key, value]) => [ref(key), value]));
  if (look.environmentBindings) look.environmentBindings = Object.fromEntries(Object.entries(look.environmentBindings).map(([key, value]) => [ref(key), value]));
  if (copy.sessionState) copy.sessionState.doors = Object.fromEntries(Object.entries(copy.sessionState.doors).map(([key, value]) => [ref(key), value]));
  const now = new Date().toISOString();
  Object.assign(copy, { id: id(), name: name ?? `${document.name} — cópia`, revision: 0, createdAt: now, updatedAt: now });
  return validateDocument(copy);
}
