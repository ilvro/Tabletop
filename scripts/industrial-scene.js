import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createScene, createEntity, id } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { proposeRoomCables, CABLE_TAG } from '../src/authoring/room-ambience.js';
import { illuminationDefaults, RENDERING_DEFAULTS } from '../src/domain/dynamic-lighting.js';
import { BLOOM_DEFAULTS, VOLUME_DEFAULTS } from '../src/domain/lighting.js';
import { screenDefaults } from '../src/domain/screens.js';
import { DECAL_ASSET, decalDefaults, decalPlacement } from '../src/domain/decals.js';
import { surfacePatch, sparksDefaults, dripDefaults } from '../src/domain/materials.js';
import { wearDefaults } from '../src/domain/wear.js';
import { wetDefaults } from '../src/domain/wetness.js';
import { cableDefaults } from '../src/domain/cables.js';
import { recipeInstance } from '../src/render/asset-cache.js';
import { screenSlotFrame } from '../src/render/screens.js';

/**
 * A derelict plant of 16 × 12 m and 9 m of ceiling, with a mezzanine,, built in the order a person would build it in
 * the editor, so the same steps can become a tutorial: room, shell materials, roof, what hangs from the
 * ceiling, the mezzanine, the gate and its light, the bench with the monitor, set dressing, effects, light, cameras.
 * Everything goes through the public commands with fields the inspector and Ambiente expose; nothing
 * is written into the document by hand.
 */
export const rotate = (q, v) => new THREE.Vector3(...v).applyQuaternion(new THREE.Quaternion(...q));
export const wallMid = wall => rotate(wall.transform.rotation, [wall.length / 2, 0, 0]).add(new THREE.Vector3(...wall.transform.position));
export const INDUSTRIAL_SIZE = Object.freeze({ W: 16, L: 12, H: 9 });

export async function buildIndustrialScene(catalog, { amount = .7, environment = 'ritual' } = {}) {
  const { W, L, H } = INDUSTRIAL_SIZE, store = createSceneStore(createScene('Galpão'));
  const update = (entity, patch) => store.execute('entity.update', { id: entity.id, patch, snap: false });
  const entities = () => Object.values(store.document.layout.entities);
  const put = (name, x, y, z, turn = 0, extra = {}) => {
    const asset = catalog.find(a => a.id === `builtin-${name}`); if (!asset) throw new Error(`Sem modelo: ${name}`);
    const entity = createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint, position: [x, y, z], rotation: quaternionFromYaw(turn), surfaceId: y < .01 ? floor.id : null, ...extra });
    store.execute('entity.add', { entity, snap: false }); return entity;
  };
  /** The light of an object (Propriedades → Iluminação própria), from a profile and a few adjustments. */
  const lit = (entity, profile, patch) => update(entity, { illumination: { ...illuminationDefaults(profile, entity), ...patch } });

  // 1. The room: Construir → Sala, 16 × 12 m, walls 9 m, no door and no light of its own. The grid is hidden (Ambiente → Grade).
  store.execute('proposal.accept', { proposal: proposeRoom({ width: W, length: L, height: H, lighting: false, door: false, name: 'Galpão' }, store.editVersion) });
  store.execute('grid.update', { patch: { visible: false } });
  const floor = entities().find(e => e.kind === 'floor'), walls = entities().filter(e => e.kind === 'wall');
  const backWall = [...walls].sort((a, b) => wallMid(a).z - wallMid(b).z)[0], rightWall = [...walls].sort((a, b) => wallMid(b).x - wallMid(a).x)[0], leftWall = [...walls].sort((a, b) => wallMid(a).x - wallMid(b).x)[0];

  // 2. The shell. Walls: dark concrete with grime running down. Floor: dark stone pavers, wet, with puddles.
  for (const wall of walls) update(wall, { material: { ...surfacePatch('concrete'), textureColor: '#5a5d60', textureColorMode: 'replace', textureBrightness: .8, textureSize: 2.6, relief: .015, roughness: .96, wear: { ...wearDefaults('grime'), amount: .7, size: 2.2, seed: 11 } } });
  update(floor, { material: { ...surfacePatch('brick'), textureColor: '#4a4643', textureColorMode: 'replace', textureBrightness: .75, textureSize: 1.2, relief: .03, roughness: .85, wet: wetDefaults({ amount: .7, puddles: .5, puddleSize: 2, seed: 5 }) } });

  // 3. The roof: concrete slabs side by side on the top of the walls ("Telhados" hides them).
  for (const x of [-6.3, -2.1, 2.1, 6.3]) for (const z of [-4.2, 0, 4.2]) put('industrial-ceiling-slab', x, H, z);

  // 4. Under the roof: a duct, pipe runs, cable trays and vines.
  // In layers: pipes close to the roof, the duct and the trays lower down, so the height reads.
  for (const x of [-4.5, -1.5, 1.5, 4.5]) put('industrial-duct', x, H - 2.6, -3.2);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) put('industrial-pipe-bundle', x, H - .57, 3.6);
  for (const z of [-4, -2, 0, 2, 4]) put('industrial-cable-tray', 5.6, H - 3.4, z, 90);
  // Pipe runs along the walls (Tubo reto · 4 m, at the height of each run).
  for (const x of [-6, -2, 2, 6]) put('industrial-pipe-long', x, 6.2, -L / 2 + .25);
  for (const x of [-6, -2]) put('industrial-pipe-long', x, 3, -L / 2 + .25);
  for (const z of [-4, 0, 4]) put('industrial-pipe-long', W / 2 - .25, 4.2, z, 90);
  put('industrial-hanging-vines', -6.6, H - 2, 1.4, 120); put('industrial-hanging-vines', 3.8, H - 2, -4.6, 30); put('industrial-hanging-vines', -2.6, H - 2, 4.4, 200);

  // 5. Structure: columns and risers as tall as the walls (Escala visual Y).
  for (const z of [-4.5, 4.5]) for (const x of [-2.5, 6]) put('industrial-column', x, 0, z, 0, { scale: [1, H / 3, 1] });
  for (const z of [-2, 1.5]) put('industrial-pipe-riser', -W / 2 + .02, 0, z, 90, { scale: [1, H / 3, 1] });

  // 5b. A mezzanine along the left wall: a floor 4,2 m up (Peças avulsas → Plataforma), steel stairs, a railing and posts.
  const mezzanine = createEntity('floor', { name: 'Mezanino', width: 3.4, length: 11.2, thickness: .22, position: [-W / 2 + 1.7, 4.2, 0], material: { ...surfacePatch('paint'), paintBase: 'rust', paintChips: .35, textureColor: '#454a4e', textureColorMode: 'replace', textureSize: 1.4, relief: .004, roughness: .75 } });
  store.execute('entity.add', { entity: mezzanine, snap: false });
  store.execute('entity.add', { entity: createEntity('stairs', { name: 'Escada do mezanino', position: [-1, 0, -3.6], rotation: quaternionFromYaw(-90), width: 1.1, length: 3.6, height: 4.2, steps: 22, material: { ...surfacePatch('paint'), paintBase: 'rust', paintChips: .3, textureColor: '#3f4448', textureColorMode: 'replace', textureSize: 1.4, relief: .004, roughness: .75 } }), snap: false });
  for (const z of [-5, -.6, 3.8]) put('industrial-column', -W / 2 + 3.3, 0, z, 0, { scale: [1, 4 / 3, 1] });
  for (const z of [-1.8, .3, 2.4, 4.5]) put('iron-fence', -W / 2 + 3.38, 4.2, z, 90, { surfaceId: mezzanine.id, material: { color: '#3f4448', roughness: .6, metalness: .6 } });
  const upstairs = (name, x, z, turn = 0, extra = {}) => put(name, x, 4.2, z, turn, { surfaceId: mezzanine.id, ...extra });
  upstairs('water-tank', -6.5, -3.4); upstairs('barrel', -7.3, 1.2); upstairs('barrel', -6.6, 1.7, 30); upstairs('old-closed-crate', -6.9, 4.3, 10); upstairs('industrial-scattered-papers', -6.2, -.4, 60);

  // 6. The back wall: the gate and the red warning light above it.
  put('industrial-blast-door', 2.5, 0, -L / 2 + .2);
  lit(put('industrial-warning-light', 2.5, 3.75, -L / 2 + .08), 'ritual', { color: '#ff2a1a', intensity: 40, distance: 11, position: [0, 0, .4], shadowPolicy: 'off' });

  // 7. Decals: alert stripes along three walls, the sign over the gate.
  const onWall = (wall, along, up) => {
    const mid = wallMid(wall), normal = rotate(wall.transform.rotation, [0, 0, 1]); if (normal.dot(mid.clone().negate()) < 0) normal.negate();
    return { point: rotate(wall.transform.rotation, [along, up, 0]).add(new THREE.Vector3(...wall.transform.position)).addScaledVector(normal, wall.thickness / 2).toArray(), normal: normal.toArray() };
  };
  const alongOf = (wall, world) => rotate(wall.transform.rotation, [1, 0, 0]).dot(new THREE.Vector3(...world).sub(new THREE.Vector3(...wall.transform.position)));
  const glue = (host, { point, normal }, patch, extra = {}) => {
    const decal = decalDefaults(patch), { position, rotation, anchor } = decalPlacement(store.document.layout.entities[host.id], point, normal);
    const entity = createEntity('prop', { name: extra.name ?? 'Decalque', assetRef: { id: DECAL_ASSET, revision: 1 }, footprint: [decal.size[0], .02], position, rotation, anchor, decal, ...extra });
    store.execute('entity.add', { entity, snap: false }); return entity;
  };
  const stripes = { kind: 'surface', wear: { faded: .3, scratched: .2, seed: 4 } }, hazard = { ...surfacePatch('hazard'), hazardWear: .45 };
  for (const wall of [backWall, rightWall, leftWall]) glue(wall, onWall(wall, wall.length / 2, 2.2), { ...stripes, size: [wall.length, .3] }, { name: 'Faixa de alerta', material: hazard });
  for (const wall of [backWall, leftWall]) glue(wall, onWall(wall, wall.length / 2, 4.9), { ...stripes, size: [wall.length, .25] }, { name: 'Faixa de alerta alta', material: hazard });
  glue(backWall, onWall(backWall, alongOf(backWall, [2.5, 0, -L / 2]), 4.35), { text: 'SETOR 7', size: [2.4, .55], textColor: '#c9c3b4', background: '#26292b', wear: { faded: .45, scratched: .3, seed: 7 } }, { name: 'Letreiro' });

  // 8. The bench with a computer terminal, its monitor turned toward whoever comes in.
  // Old metal and old plastic: the table and the terminal are darkened (Material → Cor / matiz).
  const bench = put('industrial-metal-table', -1.3, 0, 3, 25, { material: { color: '#55595c', roughness: .7, metalness: .3 } }); const tv = put('computer', -1.3, .78, 3, 25, { material: { color: '#8a8780', roughness: .8, metalness: 0 } });
  const tvAsset = catalog.find(a => a.id === 'builtin-computer'), holder = new THREE.Group();
  holder.add(recipeInstance(JSON.parse(await readFile(`public${tvAsset.url}`)), null, tvAsset.bounds)); const slot = screenSlotFrame(holder);
  const glassLight = slot.center.map((v, i) => v + slot.normal[i] * .6);
  update(tv, {
    screen: screenDefaults({ lines: [{ text: 'BOOTING', size: .2, align: 'center', anim: 'dots' }], color: '#dde4e8', background: '#05070a', progress: { enabled: true, mode: 'loop', value: .4, speed: .2 }, scanlines: .7, flicker: .2 }),
    illumination: { ...illuminationDefaults('screen', tv), intensity: 3, distance: 3.2, color: '#c9d8e6', position: glassLight, shadowPolicy: 'off', emissionSlot: 'none' },
  });
  const tvWorld = local => rotate(tv.transform.rotation, local).add(new THREE.Vector3(...tv.transform.position)), glassNormal = rotate(tv.transform.rotation, slot.normal).toArray();
  glue(tv, { point: tvWorld([slot.center[0] - slot.size[0] / 2 + .06, slot.center[1] - slot.size[1] / 2 - .035, slot.center[2] - .01]).toArray(), normal: glassNormal }, { text: 'AVARUS', font: 'sans', size: [.16, .04], textColor: '#9da2a6', wear: { faded: .4, scratched: .3, seed: 3 } }, { name: 'Marca no monitor' });

  // 9. What the years left on the floor.
  put('industrial-metal-table', 4.6, 0, 1.2, -70, { material: { color: '#55595c', roughness: .7, metalness: .3 } }); put('industrial-metal-shelf', -7.4, 0, -4, 90); put('generator', -6.2, 0, -.8, 80); put('oxygen-tank', -7.5, 0, 2); put('oxygen-tank', -7.2, 0, 2.35);
  put('locker', W / 2 - .32, 0, 2.6, -90); put('locker', W / 2 - .32, 0, 3.85, -90); put('power-panel', W / 2 - .12, 1.3, -1.5, -90); put('power-panel', W / 2 - .12, 1.3, -.8, -90);
  put('crate', 7.1, 0, -2.6, 10); put('crate', 7.1, .78, -2.6, 35); put('crate', 7.15, 0, -1.7, -5); put('pallet', 4.8, 0, -2.8, 20); put('pallet-jack', 4, 0, -3.6, 40); put('barrel', -1.4, 0, -4.9); put('barrel', -.6, 0, -5.1, 40);
  put('industrial-rubble-concrete', 1.5, 0, 0, 30); put('industrial-rubble-tiles', -3.6, 0, 1, 70); put('industrial-rubble-tiles', 3.4, 0, -2.6); put('industrial-scattered-papers', -3.4, 0, 3.8, 20);
  put('industrial-floor-weeds', 4.4, 0, -.6); put('industrial-floor-weeds', -2.4, 0, -1.2, 80); put('industrial-floor-weeds', -.4, 0, 4.1, 200); put('industrial-floor-weeds', 5.6, 0, -4.4, 140);

  // 10. Cables in the ceiling (Assistente de cômodo → Cabos no teto); the ones that would fall on the bench are taken down.
  store.execute('proposal.accept', { proposal: proposeRoomCables(store.document, { floorId: floor.id, amount: Number(amount), seed: 3 }, store.editVersion, catalog) });
  const nearBench = ([x, , z]) => Math.hypot(x - tv.transform.position[0], z - tv.transform.position[2]) < 1.6;
  for (const cable of entities().filter(e => e.cable && e.tags.includes(CABLE_TAG))) {
    const [x, y, z] = cable.transform.position, [dx, , dz] = cable.cable.span;
    if (nearBench([x, y, z]) || nearBench([x + dx, y, z + dz]) || nearBench([x + dx / 2, y, z + dz / 2])) store.execute('entity.remove', { id: cable.id });
  }

  // 11. Effects: a cable torn loose beside the bench, sparking, and a leak over the floor.
  store.execute('entity.add', { entity: createEntity('prop', { name: 'Cabo rompido', assetRef: { id: 'builtin-industrial-cable', revision: 1 }, footprint: [.2, .2], position: [.5, H - .04, 2.4], cable: cableDefaults({ mode: 'drop', span: [0, -(H - 1.4), 0], strands: 3, sag: .4, seed: 9 }) }), snap: false });
  put('campfire', .55, 1.35, 2.4, 0, { name: 'Faíscas', footprint: [.3, .3], localEffect: { ...sparksDefaults(), size: [.5, .5, .5], lightIntensity: 10 } });
  put('campfire', -3, H - .04, -1.5, 0, { name: 'Goteira', footprint: [.3, .3], localEffect: { ...dripDefaults(), size: [.3, H - .04, .3], count: 5 } });

  // 12. Light: a cold fluorescent over the bench, a weaker one flickering deeper in, and a night with almost no fill.
  lit(put('industrial-tube-light', -1.9, 3.3, 2.5, 70), 'fluorescent', { type: 'point', color: '#d6ecff', intensity: 24, distance: 9, position: [0, -.1, 0], shadowPolicy: 'auto', flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .12, frequency: 5, seed: 3 } });
  lit(put('industrial-tube-light', -6.2, 3.7, 0, 0), 'fluorescent', { type: 'point', color: '#cfe3ff', intensity: 8, distance: 6, position: [0, -.1, 0], shadowPolicy: 'off' });
  lit(put('industrial-tube-light', 1.2, 5.2, -1.8, 10), 'fluorescent', { type: 'point', color: '#b9d8ff', intensity: 10, distance: 8, position: [0, -.1, 0], shadowPolicy: 'off', flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .45, frequency: 9, seed: 8 } });
  if (environment) store.execute('environment.apply', { presetId: environment });
  store.execute('environment.key.update', { patch: { intensity: .05, color: '#6f82a8' } });
  {
    const look = store.document.look ?? store.document.defaultLook;
    store.execute('look.update', { patch: {
      background: '#05070a',
      fill: { skyColor: '#3d4d63', groundColor: '#0b0c0f', intensity: .14 },
      daylight: { ...look.daylight, phase: 'night', exposure: .95 },
      sky: { ...look.sky, enabled: false },
      bloom: { ...BLOOM_DEFAULTS, enabled: true, strength: .16, radius: .3, threshold: 1.6, streak: .1, streakLength: .25 },
      volumetricFog: { ...VOLUME_DEFAULTS, enabled: true, density: .014, color: '#1a222c', height: H },
      rendering: { ...RENDERING_DEFAULTS, ...look.rendering, ao: true, surfaceReflections: true, surfaceReflectionIntensity: 1.2, volumetricLights: true, volumeStrength: .12 },
    } });
  }

  // 13. Cameras.
  const camera = (name, position, target, fov = 60, extra = {}) => { const entry = { id: id(), name, projection: 'perspective', position, target, fov, orthographicHeight: 18, ...extra }; store.execute('camera.save', { camera: entry }); return entry; };
  // The reference: the monitor in the left foreground, the gate and its red light in the depth.
  const eye = camera('Olhos', [-.35, 1.4, 4.95], [.4, 2.9, -5.8], 64);
  const glass = tvWorld(slot.center), normal = new THREE.Vector3(...glassNormal);
  const close = camera('Tela a 2 m', glass.clone().addScaledVector(normal, 2).add(new THREE.Vector3(0, .04, 0)).toArray(), glass.toArray(), 50);
  const gate = camera('Portão', [-1, 1.6, 2], [2.5, 2.2, -L / 2 + .2], 55);
  const top = camera('Planta superior', [0, 40, .0001], [0, 0, 0], 40, { projection: 'orthographic', orthographicHeight: 20 });
  const entrance = camera('Entrada', [4.4, 1.7, 5.4], [-5, 3.2, -3], 64);
  return { store, document: store.document, cameras: { eye, close, gate, top, entrance }, tv, slot, W, L, H };
}
