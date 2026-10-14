import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createScene, createEntity, id } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { proposeRoomCables } from '../src/authoring/room-ambience.js';
import { illuminationDefaults, RENDERING_DEFAULTS } from '../src/domain/dynamic-lighting.js';
import { BLOOM_DEFAULTS, VOLUME_DEFAULTS } from '../src/domain/lighting.js';
import { screenDefaults } from '../src/domain/screens.js';
import { DECAL_ASSET, decalDefaults, decalPlacement } from '../src/domain/decals.js';
import { surfacePatch, sparksDefaults, dripDefaults } from '../src/domain/materials.js';
import { wetDefaults } from '../src/domain/wetness.js';
import { cableDefaults } from '../src/domain/cables.js';
import { recipeInstance } from '../src/render/asset-cache.js';
import { screenSlotFrame } from '../src/render/screens.js';

/**
 * A derelict plant of 16 × 12 m. Everything here is what the editor itself can do: the room assistant,
 * the models of the library, the tools and the fields of Propriedades and Ambiente, applied through the
 * public commands. Nothing is written into the document by hand.
 */
export const rotate = (q, v) => new THREE.Vector3(...v).applyQuaternion(new THREE.Quaternion(...q));
export const wallMid = wall => rotate(wall.transform.rotation, [wall.length / 2, 0, 0]).add(new THREE.Vector3(...wall.transform.position));

export async function buildIndustrialScene(catalog, { amount = .8, environment = 'ritual' } = {}) {
const W = 16, L = 12, H = 4.6;
const store = createSceneStore(createScene('Galpão'));
store.execute('proposal.accept', { proposal: proposeRoom({ width: W, length: L, height: H, lighting: false, door: false, name: 'Galpão' }, store.editVersion) });
const floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
const put = (name, x, y, z, turn = 0, extra = {}) => { const asset = catalog.find(a => a.id === `builtin-${name}`); if (!asset) throw new Error(`Sem modelo: ${name}`); const entity = createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint, position: [x, y, z], rotation: quaternionFromYaw(turn), surfaceId: y < .01 ? floor.id : null, ...extra }); store.execute('entity.add', { entity, snap: false }); return entity; };
const lit = (entity, patch) => store.execute('entity.update', { id: entity.id, patch: { illumination: { ...illuminationDefaults('lamp', entity), ...patch } } });
const walls = () => Object.values(store.document.layout.entities).filter(e => e.kind === 'wall');
/** A point on the room-facing side of a wall, `along` metres of the way from its start and `up` metres high, with that side's normal. */
function onWall(wall, along, up) {
  const mid = wallMid(wall), toRoom = mid.clone().negate(), normal = rotate(wall.transform.rotation, [0, 0, 1]); if (normal.dot(toRoom) < 0) normal.negate();
  const point = rotate(wall.transform.rotation, [along, up, 0]).add(new THREE.Vector3(...wall.transform.position)).addScaledVector(normal, wall.thickness / 2);
  return { point: point.toArray(), normal: normal.toArray() };
}
const along = (wall, world, axis) => rotate(wall.transform.rotation, [1, 0, 0]).dot(new THREE.Vector3(...world).sub(new THREE.Vector3(...wall.transform.position))) * 1;
const backWall = walls().sort((a, b) => wallMid(a).z - wallMid(b).z)[0], rightWall = walls().sort((a, b) => wallMid(b).x - wallMid(a).x)[0];
/** Glues a decal to the face of `host` at `point`. */
function glue(host, point, normal, patch, extra = {}) {
  const decal = decalDefaults(patch), { position, rotation, anchor } = decalPlacement(store.document.layout.entities[host.id], point, normal);
  const entity = createEntity('prop', { name: extra.name ?? 'Decalque', assetRef: { id: DECAL_ASSET, revision: 1 }, footprint: [decal.size[0], .02], position, rotation, anchor, decal, ...extra });
  store.execute('entity.add', { entity, snap: false }); return entity;
}
// Ceiling: a duct, two pipe runs, trays and the lamps.
for (const x of [-4.5, -1.5, 1.5, 4.5]) put('industrial-duct', x, H - .97, -3.2);
for (const x of [-4.5, -1.5, 1.5, 4.5]) put('industrial-pipe-bundle', x, H - .57, 3.6);
for (const z of [-4, -2, 0, 2, 4]) put('industrial-cable-tray', 5.6, H - .52, z, 90);
lit(put('industrial-tube-light', -4.5, H - .72, 2.2, 20), { color: '#bfe6ff', intensity: 55, distance: 11, position: [0, -.1, 0], flicker: { enabled: true, pattern: 'fluorescent', amplitude: .25, frequency: 6, seed: 3 } });
// Back wall: the gate with its sign and the red lamp over it; bands along the walls.
put('industrial-blast-door', 2.5, 0, -L / 2 + .2); lit(put('industrial-warning-light', 2.5, 3.5, -L / 2 + .08), { color: '#ff2a1a', intensity: 70, distance: 14, position: [0, 0, .4] });
// Stripes of alert paint along two walls: a decal as long as the wall, in the hazard material.
for (const wall of [backWall, rightWall]) { const at = onWall(wall, wall.length / 2, 2.25); glue(wall, at.point, at.normal, { kind: 'surface', size: [wall.length, .3], wear: { faded: 0, scratched: 0, seed: 1 } }, { name: 'Faixa de alerta', material: surfacePatch('hazard') }); }
// The sign over the gate's neighbour.
{ const at = onWall(backWall, along(backWall, [-3.5, 0, -L / 2]), 3.1); glue(backWall, at.point, at.normal, { text: 'SETOR 7 · CARGA', size: [2.8, .5], textColor: '#e9e2cf', background: '#2a2a28', wear: { faded: .35, scratched: .25, seed: 7 } }, { name: 'Letreiro' }); }
for (const z of [-4.5, 4.5]) for (const x of [-2.5, 6]) put('industrial-column', x, 0, z); for (const z of [-2, 1.5]) put('industrial-pipe-riser', -W / 2 + .02, 0, z, 90);
// Floor: where somebody worked, and what the years left.
put('industrial-metal-table', -5, 0, 3.2, 15); const tv = put('crt-tv', -5, .78, 3.2, 20); put('industrial-metal-table', 4.6, 0, 1.2, -70); put('industrial-metal-shelf', -7.4, 0, -4, 90); put('barrel', -1.4, 0, -4.9); put('barrel', -.6, 0, -5.1, 40);
put('industrial-rubble-concrete', 1.5, 0, 0, 30); put('industrial-rubble-tiles', -1.5, 0, 2.2, 70); put('industrial-rubble-tiles', 3.4, 0, -2.6); put('industrial-scattered-papers', -3.6, 0, 3.6, 20);
put('industrial-floor-weeds', 4.4, 0, -.6); put('industrial-floor-weeds', -2.4, 0, -1.2, 80); put('industrial-floor-weeds', 0, 0, 4.4, 200); put('industrial-hanging-vines', -1, H - 2, -1); put('industrial-hanging-vines', -6.6, H - 2, 1.4, 120);
store.execute('proposal.accept', { proposal: proposeRoomCables(store.document, { floorId: floor.id, amount: Number(amount), seed: 3 }, store.editVersion, catalog) });
// The monitor: its slot is measured on the model itself, as the editor does, so the light hangs in front of the glass.
const tvAsset = catalog.find(a => a.id === 'builtin-crt-tv'), holder = new THREE.Group();
holder.add(recipeInstance(JSON.parse(await readFile(`public${tvAsset.url}`)), null, tvAsset.bounds)); const slot = screenSlotFrame(holder);
store.execute('entity.update', { id: tv.id, patch: {
  screen: screenDefaults({ lines: [{ text: 'BOOTING', size: .2, align: 'left', anim: 'dots' }, { text: 'SYS 4.2', size: .12, align: 'left', anim: 'none' }] }),
  illumination: { ...illuminationDefaults('screen', tv), position: slot.lightPosition, shadowPolicy: 'off', emissionSlot: 'none' } }, snap: false });
const tvWorld = local => rotate(tv.transform.rotation, local).add(new THREE.Vector3(...tv.transform.position));
{ // A mark on the casing, beside the glass.
  const point = tvWorld([slot.center[0] + slot.size[0] / 2 + .05, slot.center[1] - slot.size[1] / 2 - .03, slot.center[2] - .01]), normal = rotate(tv.transform.rotation, slot.normal).toArray();
  glue(tv, point.toArray(), normal, { text: 'NS-04', size: [.14, .05], textColor: '#e9e2cf', background: null, wear: { faded: .3, scratched: .2, seed: 3 } }, { name: 'Marca no monitor' });
}
// A roof: slabs side by side on the top of the walls.
for (const x of [-6.3, -2.1, 2.1, 6.3]) for (const z of [-4.2, 0, 4.2]) put('industrial-ceiling-slab', x, H, z);
// The floor is wet tile with puddles.
store.execute('entity.update', { id: floor.id, patch: { material: { ...surfacePatch('tile'), textureColor: '#55534f', textureColorMode: 'replace', wet: wetDefaults({ amount: .75, puddles: .55, puddleSize: 2.4, seed: 5 }) } }, snap: false });
// A cable torn loose, with sparks at its end, and a leak over the floor.
const torn = createEntity('prop', { name: 'Cabo rompido', assetRef: { id: 'builtin-industrial-cable', revision: 1 }, footprint: [.2, .2], position: [1.2, H - .04, 2.8], cable: cableDefaults({ mode: 'drop', span: [0, -1.5, 0], strands: 3, sag: .4, seed: 9 }) });
store.execute('entity.add', { entity: torn, snap: false });
put('campfire', 1.3, H - .04 - 1.5, 2.8, 0, { name: 'Faíscas', footprint: [.3, .3], localEffect: sparksDefaults() });
put('campfire', -1.5, H - .04, -2.6, 0, { name: 'Goteira', footprint: [.3, .3], localEffect: { ...dripDefaults(), size: [.3, H - .04, .3], count: 5 } });
if (environment) store.execute('environment.apply', { presetId: environment });
{ // Mirror the wet floor, give the red light its streak and let the air carry it.
  const look = store.document.look ?? store.document.defaultLook;
  store.execute('look.update', { patch: {
    rendering: { ...RENDERING_DEFAULTS, ...look.rendering, surfaceReflections: true, surfaceReflectionIntensity: 1 },
    bloom: { ...BLOOM_DEFAULTS, ...look.bloom, enabled: true, strength: .5, radius: .45, threshold: .75, streak: .45, streakLength: .5 },
    volumetricFog: { ...VOLUME_DEFAULTS, ...look.volumetricFog, enabled: true, density: .04 },
  } });
}
const camera = (name, position, target, fov = 60, extra = {}) => { const entry = { id: id(), name, projection: 'perspective', position, target, fov, orthographicHeight: 18, ...extra }; store.execute('camera.save', { camera: entry }); return entry; };
const eye = camera('Olhos', [-6.6, 1.5, 5], [3, 1.9, -6], 62);
// The monitor from 2 m, to read it.
const glass = tvWorld(slot.center), glassNormal = rotate(tv.transform.rotation, slot.normal);
const close = camera('Tela a 2 m', glass.clone().addScaledVector(glassNormal, 2).add(new THREE.Vector3(0, .04, 0)).toArray(), glass.toArray(), 50);
const gate = camera('Portão', [-1, 1.6, 3.5], [2.5, 1.8, -L / 2 + .2], 55);
const top = camera('Planta superior', [0, 40, .0001], [0, 0, 0], 40, { projection: 'orthographic', orthographicHeight: 20 });
const entrance = camera('Entrada', [7, 1.7, 5.2], [-3, 1.4, -4], 60);
return { store, document: store.document, cameras: { eye, close, gate, top, entrance }, tv, slot, W, L, H };
}
