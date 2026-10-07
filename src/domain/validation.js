import {assertRockSculpt,isSculptableRock} from './rock-sculpt.js';
import { SURFACE_MATERIALS, TEXTURE_OPTION_FIELDS, TEXTURE_RANGES, TEXTURE_CHOICES } from './materials.js';
import { WATER_RANGES, isVegetationAsset } from './landscape.js';
import { ROCK_FORMS, ROCK_RANGES, CLIFF_RANGES, rockDefaults } from './rocks.js';
import {SNOW_SHAPE_DEFAULTS,SNOW_SHAPE_RANGES} from './snow.js';
import { WEAR_STYLES, WEAR_RANGES, WEAR_PLACEMENTS } from './wear.js';
/** Validated JSON is the boundary between editor, disk and future network adapters. */
import { kelvinToColor } from './lighting.js';
import { polygonIsSimple, polygonSize, floorContour, validHoles, pointInPolygon } from './geometry.js';
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
  keys(value, ['color', 'roughness', 'metalness', 'emissive', 'emissiveIntensity', 'texture', 'textureSize', 'relief', 'textureSlot', 'coverage', ...(!partial ? ['wear'] : []), ...TEXTURE_OPTION_FIELDS], path);
  if (!partial || value.color !== undefined) color(value.color, `${path}.color`);
  for (const field of ['roughness', 'metalness']) if (!partial || value[field] !== undefined) number(value[field], `${path}.${field}`, 0, 1);
  surfaceFields(value,path);
  if (value.wear !== undefined && value.wear !== null) {
    const w = value.wear, wp = `${path}.wear`;
    keys(w, ['enabled', 'type', 'color', 'placement', 'center', ...Object.keys(WEAR_RANGES)], wp);
    bool(w.enabled, `${wp}.enabled`); choice(w.type, WEAR_STYLES.map(s => s.id), `${wp}.type`);
    color(w.color, `${wp}.color`); choice(w.placement, WEAR_PLACEMENTS, `${wp}.placement`);
    vector(w.center, 3, `${wp}.center`); w.center.forEach(v => number(v, `${wp}.center`, 0, 1));
    for (const [key, range] of Object.entries(WEAR_RANGES)) number(w[key], `${wp}.${key}`, ...range);
    fail(Number.isInteger(w.seed), 'Seed deve ser inteiro.', `${wp}.seed`);
  }
  if (value.coverage !== undefined && value.coverage !== null) {
    const c = value.coverage, cp = `${path}.coverage`;
    keys(c, ['texture','color','textureSize','amount','relief','physicalThickness','exposedOnly',...Object.keys(SNOW_SHAPE_DEFAULTS), ...distributionFields], cp);
    choice(c.texture, SURFACE_MATERIALS.map(m=>m.id), `${cp}.texture`);
    color(c.color, `${cp}.color`); number(c.textureSize, `${cp}.textureSize`, .05, 50);
    number(c.amount, `${cp}.amount`, 0, 1); number(c.relief, `${cp}.relief`, 0, .2);
    distribution(c, cp, false);
    if(c.physicalThickness !== undefined) number(c.physicalThickness,`${cp}.physicalThickness`,0,c.texture==='snow'?1.5:0);
    if(c.exposedOnly !== undefined) bool(c.exposedOnly,`${cp}.exposedOnly`);
    for(const key of Object.keys(SNOW_SHAPE_DEFAULTS))if(c[key]!==undefined) {
      fail(c.texture==='snow','Depósitos orgânicos exigem cobertura de neve.',`${cp}.${key}`);
      if(key==='snowStyle')choice(c[key],['legacy','organic'],`${cp}.${key}`);
      else number(c[key],`${cp}.${key}`,...SNOW_SHAPE_RANGES[key]);
    }
  }
  if (value.emissive !== undefined) color(value.emissive, `${path}.emissive`);
  if (value.emissiveIntensity !== undefined) number(value.emissiveIntensity, `${path}.emissiveIntensity`, 0);
}
const distributionFields = ['mode','slopeAngle','slopeFade','heightEnabled','minHeight','heightFade','variation','variationSize','seed'];
function distribution(value, path, paint = true) {
  choice(value.mode, paint ? ['paint','top','steep','all'] : ['top','steep','all'], `${path}.mode`);
  for (const [key,min,max] of [['slopeAngle',0,90],['slopeFade',.5,45],['minHeight',-1000,1000],['heightFade',.01,100],['variation',0,1],['variationSize',.05,100],['seed',0,65535]]) {
    number(value[key],`${path}.${key}`,min,max);
  }
  bool(value.heightEnabled,`${path}.heightEnabled`);
  fail(Number.isInteger(value.seed),'Seed deve ser inteiro.',`${path}.seed`);
}
function surfaceFields(value,path) {
  if(value.texture !== undefined) choice(value.texture,['none',...SURFACE_MATERIALS.map(m=>m.id)],`${path}.texture`);
  if(value.textureSize !== undefined) number(value.textureSize,`${path}.textureSize`,.05,50);
  if(value.relief !== undefined) number(value.relief,`${path}.relief`,0,.2);
  if(value.textureSlot !== undefined) text(value.textureSlot,`${path}.textureSlot`,128);
  if(value.textureColor !== undefined) color(value.textureColor,`${path}.textureColor`);
  for (const [key, [min, max]] of Object.entries(TEXTURE_RANGES)) if (value[key] !== undefined) {
    number(value[key],`${path}.${key}`,min,max);
    if (['woodBoards','textureSeed'].includes(key)) fail(Number.isInteger(value[key]),'Deve ser inteiro.',`${path}.${key}`);
  }
  for (const [key, choices] of Object.entries(TEXTURE_CHOICES)) if (value[key] !== undefined) choice(value[key],choices,`${path}.${key}`);
}
function localEffect(value,path) {
  keys(value,['type','enabled','count','size','offset','speed','opacity','color','seed','lightIntensity','hideModel'],path);
  choice(value.type,['fire','smoke'],path); bool(value.enabled,path); bool(value.hideModel,path);
  number(value.count,path,1,512); fail(Number.isInteger(value.count),'Quantidade deve ser inteira.',path);
  vector(value.size,3,path,.1); value.size.forEach(v=>number(v,path,.1,20)); vector(value.offset,3,path);
  number(value.speed,path,0,10); number(value.opacity,path,0,1); color(value.color,path); number(value.lightIntensity,path,0,500);
  number(value.seed,path,0,4294967295); fail(Number.isInteger(value.seed),'Seed deve ser inteiro.',path);
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
const semantics = ['levelId', 'layerId', 'anchor'];
function semanticReferences(value, document, path) {
  if (semantics.some(key => value[key] !== undefined)) fail(document.schemaVersion === 2, 'Organização e sockets exigem schema 2.', path);
  for (const [field, collection] of [['levelId', 'levels'], ['layerId', 'layers']]) if (value[field] !== undefined) reference(value[field], document.layout[collection] ?? {}, `${path}.${field}`);
  if (value.anchor != null) {
    keys(value.anchor, ['hostId', 'socket', 'offset', 'rotation'], `${path}.anchor`);
    reference(value.anchor.hostId, document.layout.entities, `${path}.anchor.hostId`, false);
    choice(value.anchor.socket, ['wall', 'ceiling'], `${path}.anchor.socket`); vector(value.anchor.offset, 3, `${path}.anchor.offset`);
    if (value.anchor.rotation !== undefined) {
      fail(value.type === 'spot', 'Orientação local do socket exige luz spot.', path);
      quaternion(value.anchor.rotation, `${path}.anchor.rotation`);
    }
    const host = document.layout.entities[value.anchor.hostId];
    fail(value.kind === 'prop' || ['point', 'spot'].includes(value.type), 'Somente props e luzes locais podem usar sockets.', path);
    fail(host.kind === (value.anchor.socket === 'wall' ? 'wall' : 'floor'), 'Host incompatível com o socket.', path);
    fail(!value.surfaceId, 'Âncora e apoio não podem controlar o mesmo objeto.', path);
    if (host.kind === 'wall') {
      number(value.anchor.offset[0], path, 0, host.length); number(value.anchor.offset[1], path, 0, host.height);
    } else {
      const point = [value.anchor.offset[0], value.anchor.offset[2]];
      fail(pointInPolygon(point, floorContour(host)) && !(host.holes ?? []).some(hole => pointInPolygon(point, hole)), 'Socket de teto deve estar sobre uma região sólida do piso.', path);
    }
  }
}
const common = ['id', 'name', 'kind', 'groupId', 'surfaceId', 'locked', 'audience', 'tags', ...semantics];
function entity(value, path, document) {
  const { entities, groups } = document.layout;
  const fields = {
    water: ['transform','width','length','depth','vertices','material','water'],
    floor: ['transform', 'width', 'length', 'thickness', 'material', 'vertices', 'holes'],
    terrain: ['transform', 'width', 'length', 'segments', 'heights', 'material', 'paintLayers', 'flatShading', 'snowMask'],
    wall: ['transform', 'length', 'height', 'thickness', 'material', 'floorIds'],
    door: ['wallId', 'offset', 'width', 'height', 'sill', 'hinge', 'initialAngle', 'material'],
    window: ['wallId', 'offset', 'width', 'height', 'sill', 'style', 'material'],
    stairs: ['transform', 'width', 'length', 'height', 'steps', 'material', 'fromLevelId', 'toLevelId'],
    ramp: ['transform', 'width', 'length', 'height', 'material', 'fromLevelId', 'toLevelId'],
    prop: ['transform', 'assetRef', 'footprint', 'material', 'supportHeight', 'localEffect', 'rockShape', 'rockSculpt', 'vegetationSeed'],
  };
  choice(value.kind, Object.keys(fields), `${path}.kind`); keys(value, [...common, ...fields[value.kind]], path);
  text(value.name, `${path}.name`); bool(value.locked, `${path}.locked`); choice(value.audience, ['all', 'gm'], `${path}.audience`);
  fail(Array.isArray(value.tags), 'Tags devem ser uma lista.', `${path}.tags`);
  value.tags.forEach((tag, i) => text(tag, `${path}.tags[${i}]`, 128));
  reference(value.groupId, groups, `${path}.groupId`);
  supportReference(value.surfaceId, document, `${path}.surfaceId`);
  fail(value.surfaceId !== value.id, 'Uma superfície não pode apoiar a si mesma.', path);
  if (!['door', 'window'].includes(value.kind)) transform(value.transform, `${path}.transform`, value.kind !== 'prop');
  material(value.material, `${path}.material`);
  if(value.vegetationSeed !== undefined) {
    fail(value.kind==='prop' && isVegetationAsset(value.assetRef?.id),'Variação geométrica exige vegetação alpina.',path);
    number(value.vegetationSeed,path,0,65535); fail(Number.isInteger(value.vegetationSeed),'Seed deve ser inteiro.',path);
  }
  if(value.kind==='water') {
    fail(document.schemaVersion===2,'Água/gelo exige schema 2.',path); number(value.depth,path,.02,20);
    keys(value.water,['state',...Object.keys(WATER_RANGES)],`${path}.water`); choice(value.water.state,['water','ice'],`${path}.water.state`);
    for(const [key,[min,max]] of Object.entries(WATER_RANGES)) number(value.water[key],`${path}.water.${key}`,min,max);
  }
  if(value.rockSculpt !== undefined) {
    fail(isSculptableRock(value),'A escultura exige uma rocha editável.',`${path}.rockSculpt`);
    try {assertRockSculpt(value.rockSculpt);} catch(error) {throw new ValidationError(error.message,`${path}.rockSculpt`);}
  }
  if(value.rockShape !== undefined) {
    fail(value.kind==='prop' && !!rockDefaults(value.assetRef?.id),'A geometria editável exige uma rocha do kit de montanha.',`${path}.rockShape`);
    const r=value.rockShape,rp=`${path}.rockShape`;
    keys(r,['form',...Object.keys(ROCK_RANGES),...Object.keys(CLIFF_RANGES)],rp);choice(r.form,ROCK_FORMS,`${rp}.form`);
    for(const [key,[min,max]] of Object.entries(ROCK_RANGES)) {
      number(r[key],`${rp}.${key}`,min,max);
      if(key!=='irregularity') fail(Number.isInteger(r[key]),'Deve ser inteiro.',`${rp}.${key}`);
    }
    for(const [key,[min,max]] of Object.entries(CLIFF_RANGES)) if(r[key]!==undefined) {
      number(r[key],`${rp}.${key}`,min,max);
      if(key==='terraces') fail(Number.isInteger(r[key]),'Deve ser inteiro.',`${rp}.${key}`);
    }
  }
  semanticReferences(value, document, path);
  if (value.localEffect !== undefined) {
    localEffect(value.localEffect, `${path}.localEffect`);
    const effects=Object.values(entities).filter(e=>e.localEffect?.enabled);
    fail(effects.length<=32 && effects.reduce((sum,e)=>sum+(e.localEffect.count??0),0)<=4096,'Limite de 32 emissores e 4096 partículas locais por documento.',path);
  }
  for (const field of fields[value.kind].filter(field => ['width', 'length', 'height', 'thickness'].includes(field))) positive(value[field], `${path}.${field}`);
  if (value.kind === 'prop') { assetRef(value.assetRef, `${path}.assetRef`); vector(value.footprint, 2, `${path}.footprint`); value.footprint.forEach((v, i) => positive(v, `${path}.footprint[${i}]`)); }
  if (value.vertices !== undefined) {
    fail(document.schemaVersion === 2 && ['floor','water'].includes(value.kind) && polygonIsSimple(value.vertices), 'O contorno do piso deve ser um polígono simples de 3 a 64 vértices.', path);
    fail(polygonSize(value.vertices).every((size, i) => Math.abs(size - [value.width, value.length][i]) < 1e-6), 'Dimensões devem corresponder ao contorno do piso.', path);
  }
  if (value.holes !== undefined) fail(document.schemaVersion === 2 && value.kind === 'floor' && validHoles(floorContour(value), value.holes), 'Furos devem ser polígonos internos, separados e sem cruzamentos.', path);
  if (value.kind === 'terrain') {
    fail(document.schemaVersion === 2, 'Terreno exige schema 2.', path);
    number(value.segments, `${path}.segments`, 2, 64); fail(Number.isInteger(value.segments), 'Resolução deve ser inteira.', path);
    fail(Array.isArray(value.heights) && value.heights.length === (value.segments + 1) ** 2, 'Heightmap com tamanho incompatível.', path);
    value.heights.forEach((height, i) => number(height, `${path}.heights[${i}]`, -1000, 1000));
    if(value.snowMask !== undefined) { fail(Array.isArray(value.snowMask) && value.snowMask.length===value.heights.length,'Máscara de exposição com tamanho incompatível.',path);value.snowMask.forEach(v=>number(v,path,0,1)); }
    if (value.flatShading !== undefined) bool(value.flatShading, `${path}.flatShading`);
    if (value.paintLayers !== undefined) {
      fail(Array.isArray(value.paintLayers) && value.paintLayers.length <= 8, 'O terreno aceita até 8 camadas de cor.', path);
      fail(new Set(value.paintLayers.map(layer => layer?.id)).size === value.paintLayers.length, 'IDs de camadas de cor devem ser únicos.', path);
      value.paintLayers.forEach((layer, index) => {
        const lp = `${path}.paintLayers[${index}]`;
        keys(layer, ['id','name','color','opacity','visible','weights','texture','textureSize','distribution', ...TEXTURE_OPTION_FIELDS], lp);
        if (layer.distribution !== undefined) {
          keys(layer.distribution, distributionFields, `${lp}.distribution`);
          distribution(layer.distribution, `${lp}.distribution`);
        }
        surfaceFields(layer,lp);
        identifier(layer.id, `${lp}.id`); text(layer.name, `${lp}.name`); color(layer.color, `${lp}.color`); number(layer.opacity, `${lp}.opacity`, 0, 1); bool(layer.visible, `${lp}.visible`);
        fail(Array.isArray(layer.weights) && layer.weights.length === value.heights.length, 'Máscara de pintura com tamanho incompatível.', lp);
        layer.weights.forEach((weight, i) => number(weight, `${lp}.weights[${i}]`, 0, 1));
      });
    }

  }
  if (value.floorIds !== undefined) {
    fail(document.schemaVersion === 2, 'Paredes compartilhadas exigem schema 2.', path);
    fail(Array.isArray(value.floorIds) && new Set(value.floorIds).size === value.floorIds.length, 'Pisos compartilhados inválidos.', path);
    value.floorIds.forEach(key => reference(key, entities, path, false, 'floor'));
  }
  if (['stairs', 'ramp'].includes(value.kind)) {
    for (const field of ['fromLevelId', 'toLevelId']) if (value[field] !== undefined) reference(value[field], document.layout.levels ?? {}, `${path}.${field}`);
    if (value.fromLevelId && value.toLevelId) {
      const from = document.layout.levels[value.fromLevelId], to = document.layout.levels[value.toLevelId];
      fail(to.elevation > from.elevation && Math.abs(value.height - (to.elevation - from.elevation)) < 1e-6 && Math.abs(value.transform.position[1] - from.elevation) < 1e-6, 'O acesso deve conectar as alturas dos andares.', path);
    }
  }
  if (value.supportHeight !== undefined) { fail(document.schemaVersion === 2, 'Apoios de props exigem schema 2.', path); positive(value.supportHeight, `${path}.supportHeight`); quaternion(value.transform.rotation, `${path}.rotation`, true); }
  if (value.kind === 'window') { fail(document.schemaVersion === 2, 'Janelas exigem schema 2.', path); choice(value.style, ['glass', 'bars', 'open'], `${path}.style`); }
  if (['stairs', 'ramp'].includes(value.kind)) fail(document.schemaVersion === 2, 'Escadas/rampas exigem schema 2.', path);
  if (value.kind === 'stairs') { number(value.steps, `${path}.steps`, 1, 128); fail(Number.isInteger(value.steps), 'A quantidade de degraus deve ser inteira.', path); }
  if (['door', 'window'].includes(value.kind)) {
    reference(value.wallId, entities, `${path}.wallId`, false, 'wall');
    number(value.offset, `${path}.offset`, 0); number(value.sill, `${path}.sill`, 0);
    if (value.kind === 'door') { choice(value.hinge, ['left', 'right'], `${path}.hinge`); number(value.initialAngle, `${path}.initialAngle`, -Math.PI * 2, Math.PI * 2); }
    const wall = entities[value.wallId];
    fail(value.offset - value.width / 2 >= -1e-8 && value.offset + value.width / 2 <= wall.length + 1e-8,
      'A abertura ultrapassa o comprimento da parede.', path);
    fail(value.sill + value.height <= wall.height + 1e-8, 'A abertura ultrapassa a altura da parede.', path);
  }
}

function supportReference(value, document, path) {
  if (value === undefined || value === null) return;
  reference(value, document.layout.entities, path, false);
  const host = document.layout.entities[value];
  fail(host.kind === 'floor' || document.schemaVersion === 2 && ((['terrain', 'stairs', 'ramp'].includes(host.kind) || host.kind==='water' && host.water.state==='ice') || host.kind === 'prop' && host.supportHeight > 0), 'O apoio precisa ser um piso, terreno, acesso, gelo sólido ou prop com superfície anotada.', path);
  if (host.kind === 'prop') quaternion(host.transform.rotation, `${path}.rotation`, true);
}

function composition(value, path, document) {
  keys(value, ['id', 'name', 'recipeId', 'recipeVersion', 'areaId', 'parameters', 'slots'], path);
  text(value.name, `${path}.name`); choice(value.recipeId, ['room-furnishing'], `${path}.recipeId`);
  fail(value.recipeVersion === 1, 'Versão de receita incompatível.', path);
  reference(value.areaId, document.layout.areas, `${path}.areaId`, false);
  keys(value.parameters, ['template', 'density', 'chairs', 'seed', 'lighting'], `${path}.parameters`);
  choice(value.parameters.template, ['office', 'meeting', 'storage'], `${path}.parameters.template`);
  choice(value.parameters.density, ['sparse', 'normal', 'dense'], `${path}.parameters.density`);
  number(value.parameters.chairs, `${path}.parameters.chairs`, 1, 8); number(value.parameters.seed, `${path}.parameters.seed`, 0, 4294967295);
  fail(Number.isInteger(value.parameters.chairs) && Number.isInteger(value.parameters.seed), 'Quantidade/seed devem ser inteiros.', path);
  bool(value.parameters.lighting, `${path}.parameters.lighting`); record(value.slots, `${path}.slots`);
  fail(Object.keys(value.slots).length <= 256, 'Composição excede 256 slots.', path);
  const ids = new Set();
  for (const [key, slot] of Object.entries(value.slots)) {
    fail(/^[a-zA-Z0-9_.-]{1,120}$/.test(key), 'Slot inválido.', path);
    keys(slot, ['id', 'kind', 'baseline'], `${path}.slots.${key}`); identifier(slot.id, path);
    fail(!ids.has(slot.id), 'Slots compartilham identidade.', path); ids.add(slot.id);
    choice(slot.kind, ['entity', 'light'], path);
    const b = slot.baseline;
    if (slot.kind === 'entity') {
      keys(b, ['name', 'groupId', 'surfaceId', 'locked', 'audience', 'tags', 'transform', 'assetRef', 'footprint', 'material', 'supportHeight', ...semantics], path);
      transform(b.transform, path); assetRef(b.assetRef, path); vector(b.footprint, 2, path); b.footprint.forEach(v => positive(v, path)); material(b.material, path);
      fail(Array.isArray(b.tags), 'Tags inválidas.', path); b.tags.forEach(v => text(v, path));
      if (b.supportHeight !== undefined) positive(b.supportHeight, path);
    } else {
      keys(b, ['name', 'type', 'position', 'rotation', 'color', 'intensity', 'distance', 'shadowEnabled', 'audience', 'groupId', 'surfaceId', 'locked', ...semantics], path);
      choice(b.type, ['point'], path); vector(b.position, 3, path); quaternion(b.rotation, path); color(b.color, path);
      number(b.intensity, path, 0); number(b.distance, path, 0); bool(b.shadowEnabled, path);
    }
    text(b.name, path); bool(b.locked, path); choice(b.audience, ['all', 'gm'], path);
    for (const field of ['groupId', 'surfaceId']) if (b[field] !== null) identifier(b[field], path);
    const current = slot.kind === 'entity' ? document.layout.entities[slot.id] : (document.look ?? document.defaultLook).lights[slot.id];
    if (current) fail(slot.kind === 'light' ? ['point', 'spot', 'directional'].includes(current.type) : current.kind === 'prop', 'Slot aponta para um tipo incompatível.', path);
  }
}

function look(value, path, document, seen) {
  keys(value, ['background', 'fill', 'lights', 'materialAdjustments', 'fog', 'volumetricFog', 'bloom', 'effectsPaused', 'daylight', 'sky', 'weather', 'nightWindows', 'environmentBindings'], path); color(value.background, `${path}.background`);
  keys(value.fill, ['skyColor', 'groundColor', 'intensity'], `${path}.fill`);
  color(value.fill.skyColor, `${path}.fill.skyColor`); color(value.fill.groundColor, `${path}.fill.groundColor`);
  number(value.fill.intensity, `${path}.fill.intensity`, 0);
  dictionary(value.lights, `${path}.lights`, seen, (light, lightPath) => {
    keys(light, ['id', 'name', 'type', 'position', 'rotation', 'color', 'intensity', 'distance', 'shadowEnabled', 'audience', 'role', 'groupId', 'surfaceId', 'locked', 'enabled', 'temperature', 'angle', 'penumbra', 'flicker', ...semantics], lightPath);
    semanticReferences(light, document, lightPath);
    text(light.name, `${lightPath}.name`); choice(light.type, ['directional', 'point', 'spot'], `${lightPath}.type`);
    vector(light.position, 3, `${lightPath}.position`); quaternion(light.rotation, `${lightPath}.rotation`);
    color(light.color, `${lightPath}.color`); number(light.intensity, `${lightPath}.intensity`, 0); number(light.distance, `${lightPath}.distance`, 0);
    bool(light.shadowEnabled, `${lightPath}.shadowEnabled`); choice(light.audience, ['all', 'gm'], `${lightPath}.audience`);
    if (light.enabled !== undefined) bool(light.enabled, `${lightPath}.enabled`);
    if (light.temperature != null) {
      number(light.temperature, `${lightPath}.temperature`, 1000, 40000);
      fail(light.color.toLowerCase() === kelvinToColor(light.temperature), 'Cor deve corresponder à temperatura salva.', lightPath);
    }
    if (light.type === 'spot') {
      number(light.angle, `${lightPath}.angle`, .01, Math.PI / 2);
      number(light.penumbra, `${lightPath}.penumbra`, 0, 1);
    } else fail(light.angle === undefined && light.penumbra === undefined, 'Cone e penumbra exigem uma luz spot.', lightPath);
    if (light.flicker !== undefined) {
      const f = light.flicker, p = `${lightPath}.flicker`;
      keys(f, ['enabled', 'pattern', 'amplitude', 'frequency', 'seed'], p);
      bool(f.enabled, p); choice(f.pattern, ['candle', 'fluorescent'], p);
      number(f.amplitude, p, 0, 1); number(f.frequency, p, .1, 20);
      fail(Number.isInteger(f.seed) && f.seed >= 0 && f.seed <= 2147483647, 'Seed deve ser inteiro de 0 a 2147483647.', p);
    }
    if (light.role !== undefined) text(light.role, `${lightPath}.role`, 64);
    if (light.locked !== undefined) bool(light.locked, `${lightPath}.locked`);
    if (light.groupId !== undefined) reference(light.groupId, document.layout.groups, `${lightPath}.groupId`);
    supportReference(light.surfaceId, document, `${lightPath}.surfaceId`);
  });
  if (value.effectsPaused !== undefined) bool(value.effectsPaused, `${path}.effectsPaused`);
  if (value.fog !== undefined) {
    const f = value.fog, p = `${path}.fog`;
    keys(f, ['enabled', 'mode', 'color', 'near', 'far', 'density'], p);
    bool(f.enabled, p); choice(f.mode, ['linear', 'exp2'], p); color(f.color, p);
    number(f.near, p, 0); positive(f.far, p); fail(f.far > f.near, 'Fim deve ser maior que o início da névoa.', p);
    number(f.density, p, 0, 1);
  }
  if (value.volumetricFog !== undefined) {
    const f = value.volumetricFog, p = `${path}.volumetricFog`;
    keys(f, ['enabled', 'color', 'density', 'baseHeight', 'height', 'maxDistance'], p);
    bool(f.enabled, p); color(f.color, p); number(f.density, p, 0, 1); number(f.baseHeight, p);
    number(f.height, p, .1, 1000); number(f.maxDistance, p, 1, 1200);
  }
  if (value.bloom !== undefined) {
    const b = value.bloom, p = `${path}.bloom`;
    keys(b, ['enabled', 'strength', 'radius', 'threshold'], p);
    bool(b.enabled, p); number(b.strength, p, 0, 1); number(b.radius, p, 0, 1); number(b.threshold, p, 0, 10);
  }
  if (value.daylight !== undefined) {
    keys(value.daylight, ['phase', 'exposure'], `${path}.daylight`);
    choice(value.daylight.phase, ['day', 'sunset', 'night'], path); number(value.daylight.exposure, path, .2, 4);
  }
  if (value.sky !== undefined) {
    const s = value.sky, p = `${path}.sky`;
    keys(s, ['enabled', 'topColor', 'horizonColor', 'celestialEnabled', 'discSize', 'stars', 'clouds', 'cloudColor', 'cloudCoverage', 'cloudOpacity', 'cloudSpeed', 'cloudScale', 'seed'], p);
    for (const key of ['enabled', 'celestialEnabled', 'stars', 'clouds']) bool(s[key], `${p}.${key}`);
    for (const key of ['topColor', 'horizonColor', 'cloudColor']) color(s[key], `${p}.${key}`);
    number(s.discSize, p, .005, .15); number(s.cloudCoverage, p, 0, 1); number(s.cloudOpacity, p, 0, 1);
    number(s.cloudSpeed, p, 0, 1); number(s.cloudScale, p, .1, 20);
    fail(Number.isInteger(s.seed) && s.seed >= 0 && s.seed <= 2147483647, 'Seed inválido.', p);
  }
  if (value.weather !== undefined) {
    const w = value.weather, p = `${path}.weather`;
    keys(w, ['type', 'count', 'center', 'size', 'color', 'opacity', 'particleSize', 'speed', 'wind', 'seed'], p);
    choice(w.type, ['none', 'rain', 'dust', 'embers', 'smoke', 'snow'], p);
    fail(Number.isInteger(w.count) && w.count >= 0 && w.count <= 3000, 'Quantidade deve ser inteiro de 0 a 3000.', p);
    vector(w.center, 3, p); vector(w.size, 3, p); w.size.forEach(v => number(v, p, .1, 1000));
    color(w.color, p); number(w.opacity, p, 0, 1); number(w.particleSize, p, .005, 3); number(w.speed, p, 0, 100);
    vector(w.wind, 2, p); w.wind.forEach(v => number(v, p, -50, 50));
    fail(Number.isInteger(w.seed) && w.seed >= 0 && w.seed <= 2147483647, 'Seed inválido.', p);
  }
  if (value.nightWindows !== undefined) {
    keys(value.nightWindows, ['enabled', 'color', 'intensity'], `${path}.nightWindows`);
    bool(value.nightWindows.enabled, path); color(value.nightWindows.color, path); number(value.nightWindows.intensity, path, 0, 20);
  }
  if (value.environmentBindings !== undefined) {
    record(value.environmentBindings, `${path}.environmentBindings`);
    for (const [targetId, b] of Object.entries(value.environmentBindings)) {
      const target = document.layout.entities[targetId] ?? value.lights[targetId], p = `${path}.environmentBindings.${targetId}`;
      fail(target && (target.type || ['prop', 'window'].includes(target.kind)), 'Vínculo exige prop, janela ou luz existente.', p);
      keys(b, ['enabled', 'phase', 'slot', 'color', 'intensity'], p); bool(b.enabled, p);
      choice(b.phase, ['day', 'night', 'always'], p); text(b.slot, p, 120); color(b.color, p); number(b.intensity, p, 0, 20);
    }
  }
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
  fail([1, 2].includes(document.schemaVersion), 'Versão de schema incompatível.', `${path}.schemaVersion`);
  if (document.documentType === 'environment') return validateEnvironmentDocument(document);
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
  keys(document.layout, ['grid', 'entities', 'groups', 'areas', ...(document.schemaVersion === 2 ? ['compositions', 'levels', 'layers'] : [])], `${path}.layout`);
  const grid = document.layout.grid;
  keys(grid, ['type', 'origin', 'cellSize', 'visible', 'snap', 'color', 'opacity'], 'layout.grid');
  choice(grid.type, ['square'], 'layout.grid.type'); vector(grid.origin, 2, 'layout.grid.origin'); positive(grid.cellSize, 'layout.grid.cellSize');
  bool(grid.visible, 'layout.grid.visible'); bool(grid.snap, 'layout.grid.snap'); color(grid.color, 'layout.grid.color'); number(grid.opacity, 'layout.grid.opacity', 0, 1);
  // References are validated after every collection has its JSON shape checked.
  for (const name of ['entities', 'groups', 'areas']) record(document.layout[name], `layout.${name}`);
  const seen = new Set([document.id]);
  for (const name of ['levels', 'layers']) if (document.layout[name] !== undefined) dictionary(document.layout[name], `layout.${name}`, seen, (entry, entryPath) => {
    keys(entry, ['id', 'name', 'visible', 'locked', 'audience', ...(name === 'levels' ? ['elevation'] : [])], entryPath);
    text(entry.name, entryPath); bool(entry.visible, entryPath); bool(entry.locked, entryPath); choice(entry.audience, ['all', 'gm'], entryPath);
    if (name === 'levels') number(entry.elevation, entryPath);
  });
  dictionary(document.layout.groups, 'layout.groups', seen, (group, groupPath) => {
    keys(group, ['id', 'name', 'parentId', 'locked', 'audience', 'visible', 'anchored', 'transform'], groupPath);
    text(group.name, `${groupPath}.name`); reference(group.parentId, document.layout.groups, `${groupPath}.parentId`);
    bool(group.locked, `${groupPath}.locked`); choice(group.audience, ['all', 'gm'], `${groupPath}.audience`);
    if (group.visible !== undefined) bool(group.visible, `${groupPath}.visible`);
    if (group.anchored !== undefined) bool(group.anchored, `${groupPath}.anchored`);
    if (group.anchored) { transform(group.transform, `${groupPath}.transform`); quaternion(group.transform.rotation, `${groupPath}.transform.rotation`, true); fail(group.transform.scale.every(value => Math.abs(value - group.transform.scale[0]) < 1e-8), 'A composição usa escala uniforme.', groupPath); }
    else fail(group.transform === undefined, 'Transformação de grupo exige composição ancorada.', groupPath);
    const parents = new Set([group.id]); let parent = group.parentId;
    while (parent) { fail(!parents.has(parent), 'Ciclo de grupos.', groupPath); parents.add(parent); parent = document.layout.groups[parent]?.parentId; }
  });
  dictionary(document.layout.entities, 'layout.entities', seen, (entry, entryPath) => entity(entry, entryPath, document));
  for (const item of Object.values(document.layout.entities)) {
    const seenSupports = new Set([item.id]); let host = item.surfaceId;
    while (host) { fail(!seenSupports.has(host), 'Ciclo de superfícies de apoio.', `layout.entities.${item.id}`); seenSupports.add(host); host = document.layout.entities[host]?.surfaceId; }
  }
  for (const item of [...Object.values(document.layout.entities), ...Object.values((document.look ?? document.defaultLook)?.lights ?? {})]) {
    const visited = new Set([item.id]); let hostId = item.anchor?.hostId ?? item.surfaceId ?? item.wallId;
    while (hostId) { fail(!visited.has(hostId), 'Ciclo de ancoragem/apoio.', 'layout.entities'); visited.add(hostId); const host = document.layout.entities[hostId]; hostId = host?.anchor?.hostId ?? host?.surfaceId ?? host?.wallId; }
  }
  const doors = Object.values(document.layout.entities).filter(entry => ['door', 'window'].includes(entry.kind));
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
  if (document.schemaVersion === 2) dictionary(document.layout.compositions, 'layout.compositions', seen, (entry, entryPath) => composition(entry, entryPath, document));
  if (!isScene) return document;
  sourceRef(document.sourceMap, 'sourceMap'); sourceRef(document.sourceEnvironment, 'sourceEnvironment');
  fail(document.audioCue === null, 'Integração de áudio ainda não implementada; audioCue deve ser null.', 'audioCue');
  record(document.actors, 'actors'); record(document.tokens, 'tokens');
  dictionary(document.actors, 'actors', seen, (actor, actorPath) => {
    keys(actor, ['id', 'name', 'color', 'assetRef'], actorPath); text(actor.name, `${actorPath}.name`);
    color(actor.color, `${actorPath}.color`); assetRef(actor.assetRef, `${actorPath}.assetRef`, true);
  });
  dictionary(document.tokens, 'tokens', seen, (token, tokenPath) => {
    keys(token, ['id', 'actorId', 'transform', 'surfaceId', 'footprint', 'locked', 'audience', 'visualOverride', 'groupId', ...semantics], tokenPath);
    semanticReferences(token, document, tokenPath);
    reference(token.actorId, document.actors, `${tokenPath}.actorId`, false); transform(token.transform, `${tokenPath}.transform`);
    supportReference(token.surfaceId, document, `${tokenPath}.surfaceId`);
    if (token.groupId !== undefined) reference(token.groupId, document.layout.groups, `${tokenPath}.groupId`);
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

/** Environment library snapshots have no scene IDs, geometry, actors or media. */
function validateEnvironmentDocument(document) {
  const path = 'environment';
  keys(document, ['schemaVersion', 'documentType', 'id', 'revision', 'name', 'createdAt', 'updatedAt', 'settings'], path);
  fail(document.schemaVersion === 2, 'Ambientes exigem schema 2.', path); identifier(document.id, path); text(document.name, path);
  fail(Number.isSafeInteger(document.revision) && document.revision >= 0, 'Revisão inválida.', path);
  for (const key of ['createdAt', 'updatedAt']) fail(typeof document[key] === 'string' && Number.isFinite(Date.parse(document[key])) && new Date(document[key]).toISOString() === document[key], 'Data deve ser ISO UTC válida.', path);
  const s = document.settings;
  keys(s, ['background', 'fill', 'daylight', 'sky', 'weather', 'fog', 'volumetricFog', 'bloom', 'nightWindows', 'effectsPaused', 'keyLight'], `${path}.settings`);
  const required = ['daylight', 'sky', 'weather', 'fog', 'volumetricFog', 'bloom', 'nightWindows', 'effectsPaused'];
  for (const key of required) fail(s[key] !== undefined, `Configuração ausente: ${key}.`, path);
  keys(s.keyLight, ['name', 'type', 'position', 'rotation', 'temperature', 'color', 'intensity', 'distance', 'shadowEnabled', 'enabled', 'audience', 'locked', 'groupId', 'surfaceId'], `${path}.keyLight`);
  fail(s.keyLight.type === 'directional' && s.keyLight.groupId === null && s.keyLight.surfaceId === null && s.keyLight.audience === 'all' && s.keyLight.locked === false, 'A luz principal do preset deve ser direcional e independente da cena.', path);
  const { keyLight, ...globals } = s;
  const value = { ...globals, materialAdjustments: {}, lights: { 'environment-key': { ...keyLight, id: 'environment-key' } } };
  look(value, `${path}.settings`, { schemaVersion: 2, layout: { entities: {}, groups: {} } }, new Set([document.id]));
  return document;
}
