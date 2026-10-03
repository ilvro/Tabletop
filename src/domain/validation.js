/** Validated JSON is the boundary between editor, disk and future network adapters. */
export class ValidationError extends Error {
  constructor(message, path = '') {
    super(path ? `${path}: ${message}` : message);
    this.name = 'ValidationError'; this.status = 422; this.statusCode = 422; this.code = 'INVALID_DOCUMENT';
  }
}

const fail = (condition, message, path) => { if (!condition) throw new ValidationError(message, path); };
const record = (value, path) => {
  fail(value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype,
    'Deve ser um objeto JSON.', path);
};
const keys = (value, allowed, path) => {
  record(value, path);
  for (const key of Object.keys(value)) fail(allowed.includes(key), `Campo não suportado: ${key}.`, path);
};
const text = (value, path, max = 256) => fail(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 'Texto vazio ou inválido.', path);
const identifier = (value, path) => fail(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(value), 'ID inválido.', path);
const number = (value, path, min = -Infinity, max = Infinity) => fail(Number.isFinite(value) && value >= min && value <= max, 'Número fora dos limites.', path);
const positive = (value, path) => { number(value, path); fail(value > 0, 'Deve ser positivo.', path); };
const bool = (value, path) => fail(typeof value === 'boolean', 'Deve ser booleano.', path);
const color = (value, path) => fail(typeof value === 'string' && /^#[a-fA-F0-9]{6}$/.test(value), 'Use uma cor hexadecimal #RRGGBB.', path);
const choice = (value, choices, path) => fail(choices.includes(value), `Valor inválido; opções: ${choices.join(', ')}.`, path);
const vector = (value, size, path, min = -Infinity) => {
  fail(Array.isArray(value) && value.length === size, `Vetor deve ter ${size} componentes.`, path);
  value.forEach((item, i) => number(item, `${path}[${i}]`, min));
};
function quaternion(value, path, horizontal = false) {
  vector(value, 4, path);
  fail(Math.abs(Math.hypot(...value) - 1) < 1e-4, 'Quaternion deve estar normalizado.', path);
  if (horizontal) fail(Math.abs(value[0]) + Math.abs(value[2]) < 1e-5, 'Estruturas iniciais só giram no plano XZ.', path);
}
function transform(value, path, structural = false) {
  keys(value, ['position', 'rotation', 'scale'], path);
  vector(value.position, 3, `${path}.position`); quaternion(value.rotation, `${path}.rotation`, structural);
  vector(value.scale, 3, `${path}.scale`); value.scale.forEach((v, i) => positive(v, `${path}.scale[${i}]`));
  if (structural) fail(value.scale.every(v => Math.abs(v - 1) < 1e-8), 'Escala estrutural deve ser incorporada às dimensões.', path);
}
function material(value, path, partial = false) {
  keys(value, ['color', 'roughness', 'metalness', 'emissive', 'emissiveIntensity'], path);
  if (!partial || value.color !== undefined) color(value.color, `${path}.color`);
  for (const field of ['roughness', 'metalness']) if (!partial || value[field] !== undefined) number(value[field], `${path}.${field}`, 0, 1);
  if (value.emissive !== undefined) color(value.emissive, `${path}.emissive`);
  if (value.emissiveIntensity !== undefined) number(value.emissiveIntensity, `${path}.emissiveIntensity`, 0);
}
function assetRef(value, path, nullable = false) {
  if (nullable && value === null) return;
  keys(value, ['id', 'revision'], path); identifier(value.id, `${path}.id`);
  fail(Number.isInteger(value.revision) && value.revision >= 1, 'Revisão do asset deve ser inteiro positivo.', path);
}
function sourceRef(value, path) {
  if (value === null) return;
  keys(value, ['id', 'revision'], path); identifier(value.id, `${path}.id`);
  fail(Number.isInteger(value.revision) && value.revision >= 0, 'Revisão inválida.', path);
}
function reference(value, collection, path, nullable = true, kind) {
  if (nullable && value === null) return;
  identifier(value, path);
  fail(Object.hasOwn(collection, value), 'Referência ausente.', path);
  if (kind) fail(collection[value].kind === kind, `Referência deve apontar para ${kind}.`, path);
}
function dictionary(value, path, seen, validate) {
  record(value, path);
  for (const [key, entry] of Object.entries(value)) {
    record(entry, `${path}.${key}`); identifier(key, `${path}.${key}`);
    fail(entry.id === key, 'ID da chave diverge do registro.', `${path}.${key}`);
    fail(!seen.has(key), 'ID local duplicado.', `${path}.${key}`); seen.add(key);
    validate(entry, `${path}.${key}`);
  }
}
const common = ['id', 'name', 'kind', 'groupId', 'surfaceId', 'locked', 'audience', 'tags'];
function entity(value, path, document) {
  const { entities, groups } = document.layout;
  const fields = {
    floor: ['transform', 'width', 'length', 'thickness', 'material'],
    wall: ['transform', 'length', 'height', 'thickness', 'material'],
    door: ['wallId', 'offset', 'width', 'height', 'sill', 'hinge', 'initialAngle', 'material'],
    prop: ['transform', 'assetRef', 'footprint', 'material'],
  };
  choice(value.kind, Object.keys(fields), `${path}.kind`); keys(value, [...common, ...fields[value.kind]], path);
  text(value.name, `${path}.name`); bool(value.locked, `${path}.locked`); choice(value.audience, ['all', 'gm'], `${path}.audience`);
  fail(Array.isArray(value.tags), 'Tags devem ser uma lista.', `${path}.tags`);
  value.tags.forEach((tag, i) => text(tag, `${path}.tags[${i}]`, 128));
  reference(value.groupId, groups, `${path}.groupId`);
  reference(value.surfaceId, entities, `${path}.surfaceId`, true, 'floor');
  fail(value.surfaceId !== value.id, 'Uma superfície não pode apoiar a si mesma.', path);
  if (value.kind !== 'door') transform(value.transform, `${path}.transform`, value.kind !== 'prop');
  material(value.material, `${path}.material`);
  for (const field of fields[value.kind].filter(field => ['width', 'length', 'height', 'thickness'].includes(field))) positive(value[field], `${path}.${field}`);
  if (value.kind === 'prop') { assetRef(value.assetRef, `${path}.assetRef`); vector(value.footprint, 2, `${path}.footprint`); value.footprint.forEach((v, i) => positive(v, `${path}.footprint[${i}]`)); }
  if (value.kind === 'door') {
    reference(value.wallId, entities, `${path}.wallId`, false, 'wall');
    number(value.offset, `${path}.offset`, 0); number(value.sill, `${path}.sill`, 0);
    choice(value.hinge, ['left', 'right'], `${path}.hinge`); number(value.initialAngle, `${path}.initialAngle`, -Math.PI * 2, Math.PI * 2);
    const wall = entities[value.wallId];
    fail(value.offset - value.width / 2 >= -1e-8 && value.offset + value.width / 2 <= wall.length + 1e-8,
      'A abertura ultrapassa o comprimento da parede.', path);
    fail(value.sill + value.height <= wall.height + 1e-8, 'A abertura ultrapassa a altura da parede.', path);
  }
}

function look(value, path, document, seen) {
  keys(value, ['background', 'fill', 'lights', 'materialAdjustments'], path); color(value.background, `${path}.background`);
  keys(value.fill, ['skyColor', 'groundColor', 'intensity'], `${path}.fill`);
  color(value.fill.skyColor, `${path}.fill.skyColor`); color(value.fill.groundColor, `${path}.fill.groundColor`);
  number(value.fill.intensity, `${path}.fill.intensity`, 0);
  dictionary(value.lights, `${path}.lights`, seen, (light, lightPath) => {
    keys(light, ['id', 'name', 'type', 'position', 'rotation', 'color', 'intensity', 'distance', 'shadowEnabled', 'audience', 'role'], lightPath);
    text(light.name, `${lightPath}.name`); choice(light.type, ['directional', 'point'], `${lightPath}.type`);
    vector(light.position, 3, `${lightPath}.position`); quaternion(light.rotation, `${lightPath}.rotation`);
    color(light.color, `${lightPath}.color`); number(light.intensity, `${lightPath}.intensity`, 0); number(light.distance, `${lightPath}.distance`, 0);
    bool(light.shadowEnabled, `${lightPath}.shadowEnabled`); choice(light.audience, ['all', 'gm'], `${lightPath}.audience`);
    if (light.role !== undefined) text(light.role, `${lightPath}.role`, 64);
  });
  record(value.materialAdjustments, `${path}.materialAdjustments`);
  for (const [entityId, slots] of Object.entries(value.materialAdjustments)) {
    reference(entityId, document.layout.entities, `${path}.materialAdjustments.${entityId}`, false);
    record(slots, `${path}.materialAdjustments.${entityId}`);
    for (const [slot, override] of Object.entries(slots)) {
      choice(slot, ['base'], `${path}.materialAdjustments.${entityId}.${slot}`);
      material(override, `${path}.materialAdjustments.${entityId}.${slot}`, true);
    }
  }
}

export function validateDocument(document) {
  const path = 'document';
  record(document, path);
  fail(document.schemaVersion === 1, 'Versão de schema incompatível.', `${path}.schemaVersion`);
  choice(document.documentType, ['scene', 'map'], `${path}.documentType`);
  const isScene = document.documentType === 'scene';
  keys(document, ['schemaVersion', 'documentType', 'id', 'revision', 'name', 'createdAt', 'updatedAt', 'layout',
    ...(isScene ? ['sourceMap', 'sourceEnvironment', 'look', 'actors', 'tokens', 'cameraPresets', 'sessionState', 'audioCue'] : ['defaultLook'])], path);
  identifier(document.id, `${path}.id`); text(document.name, `${path}.name`);
  fail(Number.isInteger(document.revision) && document.revision >= 0, 'Revisão deve ser inteiro não negativo.', `${path}.revision`);
  for (const field of ['createdAt', 'updatedAt']) {
    const value = document[field], parsed = Date.parse(value);
    const canonical = Number.isFinite(parsed) ? new Date(parsed).toISOString() : '';
    fail(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
      (value === canonical || value === canonical.replace('.000Z', 'Z')), 'Data deve ser ISO UTC válida.', `${path}.${field}`);
  }
  keys(document.layout, ['grid', 'entities', 'groups', 'areas'], `${path}.layout`);
  const grid = document.layout.grid;
  keys(grid, ['type', 'origin', 'cellSize', 'visible', 'snap', 'color', 'opacity'], 'layout.grid');
  choice(grid.type, ['square'], 'layout.grid.type'); vector(grid.origin, 2, 'layout.grid.origin'); positive(grid.cellSize, 'layout.grid.cellSize');
  bool(grid.visible, 'layout.grid.visible'); bool(grid.snap, 'layout.grid.snap'); color(grid.color, 'layout.grid.color'); number(grid.opacity, 'layout.grid.opacity', 0, 1);
  // References are validated after every collection has its JSON shape checked.
  for (const name of ['entities', 'groups', 'areas']) record(document.layout[name], `layout.${name}`);
  const seen = new Set([document.id]);
  dictionary(document.layout.groups, 'layout.groups', seen, (group, groupPath) => {
    keys(group, ['id', 'name', 'parentId', 'locked', 'audience'], groupPath);
    text(group.name, `${groupPath}.name`); reference(group.parentId, document.layout.groups, `${groupPath}.parentId`);
    bool(group.locked, `${groupPath}.locked`); choice(group.audience, ['all', 'gm'], `${groupPath}.audience`);
    const parents = new Set([group.id]); let parent = group.parentId;
    while (parent) { fail(!parents.has(parent), 'Ciclo de grupos.', groupPath); parents.add(parent); parent = document.layout.groups[parent]?.parentId; }
  });
  dictionary(document.layout.entities, 'layout.entities', seen, (entry, entryPath) => entity(entry, entryPath, document));
  const doors = Object.values(document.layout.entities).filter(entry => entry.kind === 'door');
  for (let i = 0; i < doors.length; i++) for (let j = i + 1; j < doors.length; j++) {
    const a = doors[i], b = doors[j];
    if (a.wallId !== b.wallId) continue;
    const intersectsX = Math.abs(a.offset - b.offset) < (a.width + b.width) / 2 - 1e-8;
    const intersectsY = a.sill < b.sill + b.height - 1e-8 && b.sill < a.sill + a.height - 1e-8;
    fail(!(intersectsX && intersectsY), 'Aberturas da mesma parede se sobrepõem.', `layout.entities.${b.id}`);
  }
  dictionary(document.layout.areas, 'layout.areas', seen, (area, areaPath) => {
    keys(area, ['id', 'name', 'kind', 'transform', 'width', 'length', 'surfaceId', 'memberIds', 'groupId'], areaPath);
    text(area.name, `${areaPath}.name`); choice(area.kind, ['rectangle'], `${areaPath}.kind`); transform(area.transform, `${areaPath}.transform`, true);
    positive(area.width, `${areaPath}.width`); positive(area.length, `${areaPath}.length`);
    reference(area.surfaceId, document.layout.entities, `${areaPath}.surfaceId`, true, 'floor');
    reference(area.groupId, document.layout.groups, `${areaPath}.groupId`);
    fail(Array.isArray(area.memberIds), 'Membros devem ser uma lista.', `${areaPath}.memberIds`);
    fail(new Set(area.memberIds).size === area.memberIds.length, 'Membros duplicados.', `${areaPath}.memberIds`);
    area.memberIds.forEach((entityId, i) => reference(entityId, document.layout.entities, `${areaPath}.memberIds[${i}]`, false));
  });
  look(isScene ? document.look : document.defaultLook, isScene ? 'look' : 'defaultLook', document, seen);
  if (!isScene) return document;
  sourceRef(document.sourceMap, 'sourceMap'); sourceRef(document.sourceEnvironment, 'sourceEnvironment');
  fail(document.audioCue === null, 'Integração de áudio ainda não implementada; audioCue deve ser null.', 'audioCue');
  record(document.actors, 'actors'); record(document.tokens, 'tokens');
  dictionary(document.actors, 'actors', seen, (actor, actorPath) => {
    keys(actor, ['id', 'name', 'color', 'assetRef'], actorPath); text(actor.name, `${actorPath}.name`);
    color(actor.color, `${actorPath}.color`); assetRef(actor.assetRef, `${actorPath}.assetRef`, true);
  });
  dictionary(document.tokens, 'tokens', seen, (token, tokenPath) => {
    keys(token, ['id', 'actorId', 'transform', 'surfaceId', 'footprint', 'locked', 'audience', 'visualOverride'], tokenPath);
    reference(token.actorId, document.actors, `${tokenPath}.actorId`, false); transform(token.transform, `${tokenPath}.transform`);
    reference(token.surfaceId, document.layout.entities, `${tokenPath}.surfaceId`, true, 'floor');
    vector(token.footprint, 2, `${tokenPath}.footprint`); token.footprint.forEach((v, i) => positive(v, `${tokenPath}.footprint[${i}]`));
    bool(token.locked, `${tokenPath}.locked`); choice(token.audience, ['all', 'gm'], `${tokenPath}.audience`);
    if (token.visualOverride !== null) {
      keys(token.visualOverride, ['color', 'assetRef'], `${tokenPath}.visualOverride`);
      if (token.visualOverride.color !== undefined) color(token.visualOverride.color, `${tokenPath}.visualOverride.color`);
      if (token.visualOverride.assetRef !== undefined) assetRef(token.visualOverride.assetRef, `${tokenPath}.visualOverride.assetRef`, true);
    }
  });
  dictionary(document.cameraPresets, 'cameraPresets', seen, (camera, cameraPath) => {
    keys(camera, ['id', 'name', 'projection', 'position', 'target', 'fov', 'orthographicHeight'], cameraPath);
    text(camera.name, `${cameraPath}.name`); choice(camera.projection, ['perspective', 'orthographic'], `${cameraPath}.projection`);
    vector(camera.position, 3, `${cameraPath}.position`); vector(camera.target, 3, `${cameraPath}.target`);
    fail(camera.position.some((v, i) => Math.abs(v - camera.target[i]) > 1e-8), 'Posição e alvo da câmera devem ser diferentes.', cameraPath);
    number(camera.fov, `${cameraPath}.fov`, 1, 179); positive(camera.orthographicHeight, `${cameraPath}.orthographicHeight`);
  });
  keys(document.sessionState, ['doors'], 'sessionState'); record(document.sessionState.doors, 'sessionState.doors');
  for (const [doorId, angle] of Object.entries(document.sessionState.doors)) {
    reference(doorId, document.layout.entities, `sessionState.doors.${doorId}`, false, 'door');
    number(angle, `sessionState.doors.${doorId}`, -Math.PI * 2, Math.PI * 2);
  }
  return document;
}
