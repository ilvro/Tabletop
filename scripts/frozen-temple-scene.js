import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createScene, createEntity, createLight, id } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { illuminationDefaults, RENDERING_DEFAULTS, ZONE_DEFAULTS } from '../src/domain/dynamic-lighting.js';
import { BLOOM_DEFAULTS, VOLUME_DEFAULTS, WEATHER_DEFAULTS } from '../src/domain/lighting.js';
import { surfacePatch, coverageDefaults } from '../src/domain/materials.js';
import { rockDefaults } from '../src/domain/rocks.js';
import { wearDefaults } from '../src/domain/wear.js';

/**
 * A temple carved into a snow cave, and the complex behind its portcullis.
 *
 * Outside: a ravine of rock and snow leads to the hall, 14 × 20 m and 9 m of ceiling, with two pairs of stepped
 * piers, door niches, the camp of the last expedition and, at its far end, an arched gate with its portcullis.
 * Behind the gate, inside the mountain, is what an old northern people built and left: a rune atrium with the
 * glowing ring, a machine room, an archive of rune tablets, quarters, and a corridor to a cave gallery painted
 * by older hands. From the gallery a stair goes 6 m down to a deep forge; a round vault door leads to a sealed
 * room, the sealed room to a long corridor, and the corridor to the rim of an abyss 33 m across where a spiral
 * stair cut into the wall goes down seven turns into the dark.
 *
 * Built in the order a person would build it in the editor, only through public commands with fields the editor
 * exposes. The palette is cold: teal stone, blue-white snow and the cyan of the rune light; the warm lights are
 * the expedition's (braziers, kerosene lanterns) and the embers of the forge.
 */
export const FROZEN_TEMPLE_SIZE = Object.freeze({ W: 14, L: 20, H: 9 });
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const hash = (x, z, seed) => { const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
/** Smooth value noise in [-1, 1]. */
const noise = (x, z, seed = 1) => {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi, seed), b = hash(xi + 1, zi, seed), c = hash(xi, zi + 1, seed), d = hash(xi + 1, zi + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
};
const fbm = (x, z, seed) => noise(x, z, seed) * .55 + noise(x * 2.1, z * 2.1, seed + 7) * .3 + noise(x * 4.3, z * 4.3, seed + 13) * .15;
const pitch = degrees => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), degrees * Math.PI / 180).toArray();
const turn = (yaw, roll) => new THREE.Quaternion().setFromEuler(new THREE.Euler(roll * Math.PI / 180, yaw * Math.PI / 180, 0, 'YXZ')).toArray();
/**
 * Every distinct set of texture settings is a texture the editor generates when it opens the scene, so the
 * materials come from a short palette per family, with one seed each: the variety comes from the world-space
 * pattern, not from a texture per object.
 */
const snap = (palette, color) => {
  const luma = hex => { const n = parseInt(hex.slice(1), 16); return (n >> 16) * .3 + (n >> 8 & 255) * .59 + (n & 255) * .11; };
  return palette.reduce((best, tone) => Math.abs(luma(tone) - luma(color)) < Math.abs(luma(best) - luma(color)) ? tone : best);
};
const STONE_TONES = ['#3f4b4c', '#5b6a69'], ROCK_TONES = ['#1d2224', '#30373a', '#454c4a', '#6b6a61'], PAVER_TONES = ['#4b5051', '#5a6564'];
/** The thickness of the walls of the rooms behind the gate. */
const T = .4;

export async function buildFrozenTempleScene(catalog) {
  const { W, L, H } = FROZEN_TEMPLE_SIZE, store = createSceneStore(createScene('Templo gelado'));
  const update = (entity, patch) => store.execute('entity.update', { id: entity.id, patch, snap: false });
  const entities = () => Object.values(store.document.layout.entities);
  const add = entity => { store.execute('entity.add', { entity, snap: false }); return entity; };
  const folder = name => { const group = { id: id(), name }; store.execute('group.add', { group }); return group.id; };
  const asset = name => { const found = catalog.find(a => a.id === `builtin-${name}`); if (!found) throw new Error(`Sem modelo: ${name}`); return found; };
  let groupId = null, floor = null, surface = null, surfaceY = 0;
  const put = (name, x, y, z, rotation = 0, extra = {}) => {
    const model = asset(name), onHall = floor && Math.abs(y) < .01 && Math.abs(x) < W / 2 && Math.abs(z) < L / 2;
    return add(createEntity('prop', { name: model.name, assetRef: { id: model.id, revision: model.revision }, footprint: model.footprint, position: [x, y, z], rotation: typeof rotation === 'number' ? quaternionFromYaw(rotation) : rotation, surfaceId: onHall ? floor.id : surface && Math.abs(y - surfaceY) < .01 ? surface : null, groupId, ...extra }));
  };
  /** The light of an object (Propriedades → Iluminação própria), from a profile and a few adjustments. */
  const lit = (entity, profile, patch) => update(entity, { illumination: { ...illuminationDefaults(profile, entity), ...patch } });
  // Snow over the tops of things (Material → Cobertura), the same recipe everywhere with its own amount.
  const snow = (amount = .8, thickness = 0, seed = 7, extra = {}) => ({ ...coverageDefaults(), snowStyle: 'organic', snowDrift: .6, snowDriftScale: 2.4, amount, physicalThickness: thickness, exposedOnly: false, slopeAngle: 50, slopeFade: 20, variation: .3, variationSize: 2.2, color: '#dbe9ee', relief: .002, ...extra, seed: 7 });
  const frost = amount => ({ ...snow(amount, 0), mode: 'all', variation: .6, variationSize: 2.6, color: '#a9c0c7' });
  const caveRock = (seed = 3, cover = .75) => ({ ...surfacePatch('rock'), rockPattern: 'organic', textureSize: 2.6, textureSeed: 11, textureColorMode: 'replace', textureColor: '#3b4a4f', textureBrightness: .72, textureContrast: 1.15, relief: .02, rockCracks: .6, coverage: snow(cover, .06, seed) });
  const masonry = (color = '#5f6e6d', cover = .55) => ({ ...surfacePatch('stone'), textureColor: snap(STONE_TONES, color), textureColorMode: 'replace', textureBrightness: .82, textureSize: 1.8, relief: .05, roughness: .94, coverage: snow(cover, 0, 0, { slopeAngle: 35 }) });
  // Inside the mountain the stone is bare: masonry for what was built, raw rock for what was dug.
  const hewn = () => ({ ...surfacePatch('stone'), textureColor: '#56625f', textureColorMode: 'replace', textureBrightness: .78, textureSize: 2, relief: .05, roughness: .95, wear: { ...wearDefaults('grime'), amount: .5, size: 2.4, seed: 5 } });
  const raw = (color = '#3e4a4c') => ({ ...surfacePatch('rock'), rockPattern: 'organic', textureSize: 2.4, textureSeed: 9, textureColorMode: 'replace', textureColor: snap(ROCK_TONES, color), textureBrightness: .7, textureContrast: 1.2, relief: .03, rockCracks: .7, roughness: .95 });
  const pavers = (color = '#5d6a6b', cover = 0) => ({ ...surfacePatch('stone'), textureColor: snap(PAVER_TONES, color), textureColorMode: 'replace', textureBrightness: .82, textureSize: 2.6, relief: .04, roughness: .85, ...(cover ? { coverage: frost(cover) } : {}) });

  // 1. The cave outside: one terrain whose walls climb steeply around the hall and the ravine that leads in.
  // It ends at the gate; behind it, the mountain (step 12) covers the rooms.
  groupId = folder('01 · Caverna');
  const outside = (x, z) => {
    const box = (hx, z0, z1) => Math.hypot(Math.max(0, Math.abs(x) - hx), Math.max(0, z0 - z, z - z1));
    const ravine = Math.hypot(Math.max(0, Math.abs(x - Math.sin(z * .18) * 1.6) - (4.6 + Math.sin(z * .41) * .7)), Math.max(0, 9 - z));
    return Math.min(box(W / 2 + .7, -L / 2 - .8, L / 2 + .8), ravine);
  };
  const ground = z => z > 10 ? Math.min(3.2, (z - 10) * .13) : -.04;
  const heightAt = (x, z) => { const d = outside(x, z); return ground(z) + 13.5 * smooth(0, 6, d) + 4 * smooth(6, 16, d) + fbm(x * .23, z * .23, 3) * 2.6 * smooth(.5, 3, d) + (d > .2 ? fbm(x * .9, z * .9, 9) * .35 : 0); };
  const terrain = (name, width, length, center, height, material) => {
    const segments = 64, heights = [];
    for (let row = 0; row <= segments; row++) for (let col = 0; col <= segments; col++) heights.push(Number(height((col / segments - .5) * width + center[0], (row / segments - .5) * length + center[2]).toFixed(4)));
    return add(createEntity('terrain', { name, width, length, segments, heights, position: center, groupId, material }));
  };
  const GATE = -L / 2 - .6;
  terrain('Caverna · paredes de rocha e neve', 60, 40 - GATE, [0, 0, (40 + GATE) / 2], heightAt, { ...caveRock(11, .9), coverage: { ...snow(.95, .12, 11), slopeAngle: 34, slopeFade: 12 } });
  const rock = (name, x, y, z, rotation, scale, seed, extra = {}) => put(name, x, y, z, rotation, { scale, rockShape: { ...rockDefaults(`builtin-${name}`), seed, detail: 6, irregularity: .6, erosion: .6 }, material: caveRock(seed), ...extra });
  // Bare rock faces breaking out of the snowy slopes, sunk into the terrain and turned toward the hollow.
  for (const [x, z, yaw, s, seed] of [[-12, -3, 90, 1.2, 4703], [-12.5, 6.5, 100, 1.1, 4721], [12, -5, -90, 1.2, 4751], [12.4, 5, -80, 1.1, 4787], [-9.5, 19, 80, 1, 4831], [9, 25, -100, 1, 4861]])
    rock('organic-cliff', x, heightAt(x, z) - 4.2, z, yaw, [s, s * 1.15, s], seed);
  for (const [x, z, s, seed] of [[-4.6, 13.2, 1, 4519], [4.4, 16, .8, 4561], [-3.8, 21, .9, 4603], [4.1, 26, 1.1, 4639]]) rock('organic-rock', x, ground(z) - .3, z, seed % 360, [s, s * .8, s], seed);

  // 2. The hall: Construir → Sala, 14 × 20 m, walls 9 m, no door and no light of its own. The grid is hidden.
  groupId = folder('02 · Salão');
  store.execute('proposal.accept', { proposal: proposeRoom({ width: W, length: L, height: H, lighting: false, door: false, name: 'Salão do templo' }, store.editVersion) });
  store.execute('grid.update', { patch: { visible: false } });
  floor = entities().find(e => e.kind === 'floor');
  const walls = entities().filter(e => e.kind === 'wall'), byZ = [...walls].sort((a, b) => a.transform.position[2] - b.transform.position[2]);
  // The back and the front walls give way to the two gateways, with a stretch of wall on each side of them.
  for (const wall of [byZ[0], byZ.at(-1)]) store.execute('entity.remove', { id: wall.id });
  for (const z of [-L / 2 - .3, L / 2 + .3]) for (const x of [-W / 2 - .18, 4]) add(createEntity('wall', { name: z < 0 ? 'Parede do fundo' : 'Parede da entrada', length: 3.18, height: H, thickness: .9, position: [x, 0, z], surfaceId: floor.id, groupId }));

  // 3. The shell. Walls: teal masonry, frosted at the foot. Floor: big stone pavers under drifted snow.
  for (const wall of entities().filter(e => e.kind === 'wall')) update(wall, { material: { ...masonry('#566564', .35), wear: { ...wearDefaults('grime'), amount: .45, size: 2.6, seed: 5 } } });
  update(floor, { material: { ...surfacePatch('stone'), textureColor: '#6c7c7f', textureColorMode: 'replace', textureBrightness: .9, textureSize: 2.4, relief: .04, roughness: .7, coverage: { ...snow(.7, 0, 17), mode: 'all', variation: .55, variationSize: 3.2, color: '#b7cfd7' } } });
  // The ceiling: stone slabs on top of the walls ("Telhados" hides them); one is missing over the middle of the hall.
  for (const [i, x] of [-5.4, -1.8, 1.8, 5.4].entries()) for (const [j, z] of [-8.16, -4.08, 0, 4.08, 8.16].entries()) {
    if (i === 2 && j === 2) continue;
    put('industrial-ceiling-slab', x, H, z, 0, { name: 'Laje de pedra do teto', scale: [3.6 / 4.2, 1.6, 4.08 / 4.2], material: { ...masonry('#3f4b4c', .9, 30 + i * 5 + j), textureSlot: 'concrete' } });
  }

  // 4. The piers, two pairs, and the door niches between them along the side walls.
  const piers = [];
  for (const z of [5.3, -4.4]) for (const s of [-1, 1]) piers.push(put('temple-square-pier', s * 3.9, 0, z, 0, { material: { ...masonry('#61706f', .7, 40 + piers.length), textureSlot: 'stone' } }));
  const niches = [];
  for (const z of [-7.6, .45, 8.4]) for (const s of [-1, 1]) niches.push(put('temple-wall-niche', s * (W / 2 - .31), 0, z, s * -90, { material: { ...masonry('#5b6a69', .6, 50 + niches.length), textureSlot: 'stone' } }));
  // Torn dark banners hanging from the shafts of the front piers.
  for (const pier of piers.slice(0, 2)) put('church-ritual-banner', pier.transform.position[0], 4.6, pier.transform.position[2] + .9, 0, { material: { color: '#55707a' } });

  // 5. The gates: the far one with its portcullis, the near one open to the ravine.
  const gate = put('temple-arched-gateway', 0, 0, -L / 2 - .3, 0, { material: { ...masonry('#5d6c6b', .6, 61), textureSlot: 'stone' } });
  put('temple-portcullis', 0, 0, -L / 2 - .55, 0, { material: { color: '#9aa3a8', roughness: .5 } });
  put('temple-arched-gateway', 0, 0, L / 2 + .3, 180, { name: 'Templo · portal de entrada', material: { ...masonry('#5d6c6b', .75, 67), textureSlot: 'stone' } });

  // 6. Ice and snow in the hall: icicles along the top of the side walls, on the cornices of the piers and over the gate.
  groupId = folder('03 · Gelo e neve');
  for (const s of [-1, 1]) for (const z of [-6, 2.5]) put('ice-icicles', s * (W / 2 - .2), H - 1.1, z + s * .6, 90, { scale: [1, .75, 1] });
  for (const pier of piers) { const [x, , z] = pier.transform.position; put('ice-icicles', x, 3.58 - .45, z + 1.27, 0, { scale: [.8, .3, .6] }); }
  put('ice-icicles', 0, 8.7 - .9, -L / 2 + .45, 0, { scale: [1.8, .6, 1] });
  for (const x of [.6, 3]) put('ice-icicles', x, H - 1.5, -2.1, x > 1 ? 10 : -15, { scale: [.9, 1, 1] });
  const drift = (x, y, z, s, a, seed) => put('rock-scree', x, y, z, a, { name: 'Monte de neve', scale: [s, s * .55, s], rockShape: { ...rockDefaults('builtin-rock-scree'), seed, detail: 5, irregularity: .35, erosion: .9 }, material: { ...surfacePatch('snow'), textureColorMode: 'replace', textureColor: '#cfe0e6', coverage: snow(1, .05, seed) } });
  for (const [x, z, s, a, seed] of [[-5.9, 9, 1.4, 20, 801], [5.6, 8.6, 1.2, 110, 809], [-1.6, 9.2, 1.1, 60, 811], [2.2, 12, 1.8, 150, 821], [-2.4, 14.5, 2, 30, 823], [3.6, 19, 1.7, 80, 827], [-6.3, -9, 1, 0, 829], [6.2, -2, .9, 90, 839], [-6.3, 3.8, .8, 45, 853]]) drift(x, z > L / 2 ? ground(z) - .2 : -.05, z, s, a, seed);

  // 7. What the last expedition left in the middle of the hall: a ring of spiked barricades and crates around a floor grate.
  groupId = folder('04 · Acampamento');
  const grate = put('temple-floor-grate', 0, 0, 1.4, 0, { material: { color: '#a8b0b4' } });
  for (const [a, r] of [[200, 2.6], [245, 2.8], [290, 2.7], [-10, 2.7], [35, 2.9]]) { const t = a * Math.PI / 180; put('temple-spike-barricade', Math.cos(t) * r, 0, 1.4 + Math.sin(t) * r, -a + 90, { material: { color: '#8f8a80' } }); }
  const old = { color: '#c4bcac', coverage: snow(.8, .03, 91) };
  // Inside the mountain no snow falls: the same crates, bare.
  const oldIn = { color: '#c4bcac' };
  for (const [name, x, y, z, a] of [['old-closed-crate', -2.4, 0, 2.6, 15], ['old-closed-crate', -2.3, .623, 2.7, 35], ['crate', -1.5, 0, 3.6, -10], ['crate', -2.9, 0, 3.7, 20], ['old-open-crate', -1.4, 0, -.6, 70],
    ['old-closed-crate', 2.3, 0, 2.2, -20], ['crate', 2.4, .623, 2.2, 10], ['crate', 1.6, 0, 3.4, 40], ['old-closed-crate', 2.9, 0, 3.4, 80], ['crate', 1.9, 0, -.4, -30], ['old-open-crate', 3.1, 0, .5, 100]]) put(name, x, y, z, a, { material: old });
  put('medieval-sacks', -3.2, 0, .6, 40, { material: { color: '#a7a399', coverage: snow(.7, .02, 93) } }); put('medieval-chest', 3.3, 0, -1.5, -60, { material: { color: '#8a8478' } });

  // 8. Light of the hall: the rune light through the bars is the key; braziers in two niches are the only warm accents.
  groupId = folder('05 · Luz do salão');
  for (const [niche, x] of [[niches[2], -W / 2 + 1.2], [niches[1], W / 2 - 1.2]]) {
    const brazier = put('medieval-brazier', x, 0, niche.transform.position[2], 0);
    lit(brazier, 'torch', { color: '#ff8a3d', intensity: 16, distance: 7, position: [0, 1.25, 0], shadowPolicy: 'off', flicker: { ...illuminationDefaults('torch').flicker, enabled: true, amplitude: .18, seed: Math.abs(Math.round(x)) } });
  }
  // The snow on the floor throws a soft cold light back up the piers (the light of the floor grate, 3 m above it).
  lit(grate, 'lamp', { color: '#8fc3d1', intensity: 55, distance: 17, position: [0, 3.2, 0], shadowPolicy: 'off' });
  // Cold light falls through the missing slab, and the daylight of the entrance reaches down the ravine.
  store.execute('light.add', { light: createLight({ name: 'Fresta no teto', type: 'spot', position: [1.8, H + 5, .6], rotation: pitch(-4), color: '#cfe6ff', intensity: 160, distance: 22, angle: .22, penumbra: .55, shadowPolicy: 'auto', groupId }) });
  store.execute('light.add', { light: createLight({ name: 'Boca da caverna', type: 'spot', position: [0, 16, 34], rotation: pitch(-48), color: '#b8d4ea', intensity: 260, distance: 40, angle: .55, penumbra: .7, shadowPolicy: 'off', groupId }) });

  // 9. The rooms behind the gate. Rectangular rooms are Construir → Sala with walls of 40 cm and no door; the
  // cave is a polygon floor with a wall along each edge. Passages are openings (Janela → Vão) cut in both walls
  // where two rooms touch; each room gets a stone ceiling, its own light zone (Piso → Zona de ambiente), and is
  // given levels inside it (a pit, a dais, balconies, a mezzanine, a grand stair) so it is not one flat box.
  // The way through is a loop, not a line: atrium → machines → service stair down → forge → hall of the
  // ancestors → up to the cave → guardians → atrium, with the archive, the quarters and the storeroom as a
  // second loop on the east, dead ends (the crystal crevice, the ore store), and one way on: the vault door.
  const ceilingOver = (name, x0, x1, z0, z1, y, tone = '#3a4546') => {
    // As few slabs as possible: every slab is drawn on its own, and the rock texture follows the world, not the slab.
    const nx = Math.ceil((x1 - x0) / 20), nz = Math.ceil((z1 - z0) / 20), sx = (x1 - x0) / nx, sz = (z1 - z0) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) put('industrial-ceiling-slab', x0 + sx * (i + .5), y, z0 + sz * (j + .5), 0, { name: `Teto · ${name}`, scale: [sx / 4.2, 1.8, sz / 4.2], surfaceId: null, material: { ...raw(tone), textureSlot: 'concrete' } });
  };
  const zoneOf = (w, h, l, zone) => ({ ...ZONE_DEFAULTS, position: [0, h / 2, 0], size: [w, h, l], blend: .8, priority: 20, indirect: .6, ...zone });
  const room = ({ name, x, y = 0, z, w, l, h, wall, ground: groundMaterial, ceiling = '#3a4546', zone, zoneBox = null }) => {
    const proposal = proposeRoom({ width: w, length: l, height: h, center: [x, y, z], thickness: T, lighting: false, door: false, name }, store.editVersion);
    store.execute('proposal.accept', { proposal });
    const made = Object.fromEntries(proposal.entities.map(e => [e.kind === 'floor' ? 'floor' : { 'Parede norte': 'north', 'Parede sul': 'south', 'Parede oeste': 'west', 'Parede leste': 'east' }[e.name], store.document.layout.entities[e.id]]));
    for (const side of ['north', 'south', 'west', 'east']) update(made[side], { material: wall });
    // A zone may cover the small rooms next door too (the document takes 16 zones); `zone: null` leaves the room to its neighbour's.
    const box = zoneBox ? { w: zoneBox[1] - zoneBox[0], l: zoneBox[3] - zoneBox[2], x: (zoneBox[0] + zoneBox[1]) / 2 - x, z: (zoneBox[2] + zoneBox[3]) / 2 - z } : { w, l, x: 0, z: 0 };
    update(made.floor, { material: groundMaterial, ...(zone === null ? {} : { lightingZone: { ...zoneOf(box.w, h, box.l, zone), position: [box.x, h / 2, box.z] } }) });
    groupId = proposal.groups[0].id; surface = made.floor.id; surfaceY = y;
    ceilingOver(name, x - w / 2 - T, x + w / 2 + T, z - l / 2 - T, z + l / 2 + T, y + h, ceiling);
    return { ...made, x, y, z, w, l, h };
  };
  /** A passage through a wall of a room: `at` is the world X (north and south walls) or Z (west and east walls) of its middle. */
  const pass = (r, side, at, width, height, sill = 0) => {
    const wall = r[side], offset = side === 'north' || side === 'south' ? at - (r.x - r.w / 2 - T) : (r.z + r.l / 2) - at;
    return add(createEntity('window', { name: 'Vão de passagem', wallId: wall.id, offset, width, height, sill, style: 'open', groupId: wall.groupId }));
  };
  /** A plain wall from (x0, z0) to (x1, z1). */
  const wallLine = (name, x0, z0, x1, z1, y, height, thickness, material) => {
    const length = Math.hypot(x1 - x0, z1 - z0), yaw = Math.atan2(-(z1 - z0), x1 - x0) * 180 / Math.PI;
    return add(createEntity('wall', { name, length, height, thickness, position: [x0, y, z0], rotation: quaternionFromYaw(yaw), groupId, material }));
  };
  /** Bronze rails end to end from (x0, z0) to (x1, z1) at height y. */
  const railLine = (x0, z0, x1, z1, y) => {
    const length = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(length / 2)), yaw = Math.atan2(-(z1 - z0), x1 - x0) * 180 / Math.PI;
    for (let i = 0; i < n; i++) { const t = (i + .5) / n; put('nordic-railing', x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, yaw, { scale: [length / n / 2.06, 1, 1] }); }
  };
  /** A box of solid stone: a floor whose thickness reaches down to `bottom` (daises, landings, balconies). */
  const block = (name, x, z, w, l, top, bottom, material = hewn()) => add(createEntity('floor', { name, width: w, length: l, thickness: top - bottom, position: [x, top, z], groupId, material }));
  const stairs = (name, x, y, z, yaw, width, length, height, material = hewn()) => add(createEntity('stairs', { name, position: [x, y, z], rotation: quaternionFromYaw(yaw), width, length, height, steps: Math.max(3, Math.round(height / .22)), groupId, material }));
  const lantern = (x, y, z, patch = {}) => { const l = put('nordic-rune-lantern', x, y, z, 0); lit(l, 'lamp', { color: '#7fd8ff', intensity: 14, distance: 9, position: [0, 1.9, 0], shadowPolicy: 'off', ...patch }); return l; };
  const kerosene = (x, y, z, patch = {}) => { const l = put('kerosene-lantern', x, y, z, 0); lit(l, 'lamp', { color: '#ffb066', intensity: 12, distance: 7, position: [0, .2, 0], shadowPolicy: 'off', flicker: { ...illuminationDefaults('candle').flicker, enabled: true, amplitude: .1, seed: Math.abs(Math.round(x * 3 + z)) }, ...patch }); return l; };
  const rubble = (x, y, z, a, s = 1) => put('industrial-rubble-concrete', x, y, z, a, { scale: [s, s, s], material: { color: '#9aa3a0' } });
  const rune = (name, x, y, z, a, extra = {}) => put(name, x, y, z, a, { material: { textureSlot: 'stone', ...hewn() }, ...extra });
  const statue = (x, y, z, a, extra = {}) => put('nordic-guardian-statue', x, y, z, a, { material: { textureSlot: 'stone', ...hewn() }, ...extra });
  const tall = h => [1, h / 9, 1];
  // Things that once burned (hearths, chandeliers, candles, fallen lanterns) start switched off: light them when the players do.
  const dark = new Set(), off = entity => { dark.add(entity.id); return entity; };
  const dim = level => ({ material: { textureSlot: 'glow', emissiveIntensity: level } });
  const DEEP = -6;

  // 9a. The rune atrium, 24 × 22 m and 12 m high, right behind the gate: a nave between two rows of piers, the
  // ring on a dais at the far end, and a balcony across the back wall reached by a stair along the east wall.
  const atrium = room({ name: 'Átrio rúnico', x: 0, z: GATE - .55 - 11, w: 24, l: 22, h: 12, wall: hewn(), ground: pavers('#5f6c6b', .3), zone: { color: '#6d9fae', intensity: .32, fogColor: '#20414b', fogDensity: .018 } });
  const az = atrium.z, aBack = az - 11, aFront = az + 11;
  // Its front wall gives way to the gate: a stretch of wall on each side, and a lintel over it.
  store.execute('entity.remove', { id: atrium.south.id });
  for (const x of [-12 - T, 4]) add(createEntity('wall', { name: 'Parede do átrio junto ao portão', length: 8 + T, height: 12, thickness: T, position: [x, 0, aFront + T / 2], surfaceId: atrium.floor.id, groupId, material: hewn() }));
  add(createEntity('wall', { name: 'Parede sobre o portão', length: 8, height: 3, thickness: T, position: [-4, H, aFront + T / 2], groupId, material: hewn() }));
  for (const z of [aFront - 3.4, aFront - 8.9, aFront - 14.4]) for (const s of [-1, 1]) put('temple-square-pier', s * 6.5, 0, z, 0, { scale: tall(12), material: { ...hewn(), textureSlot: 'stone' } });
  block('Estrado do anel', 0, aBack + 3, 11, 6, .9, 0); stairs('Degraus do estrado', 0, 0, aBack + 6.9, 180, 7, 1.8, .9);
  const ring = put('temple-rune-ring', 0, .9, aBack + 2.75, 0, { material: { ...hewn(), textureSlot: 'stone' } });
  const conduits = [-1, 1].map(s => put('nordic-conduit-pillar', s * 4.4, .9, aBack + 1.55, 0, { scale: [1, 1.4, 1] }));
  put('nordic-rune-console', -3.6, .9, aBack + 5.2, 15); put('nordic-rune-console', 3.6, .9, aBack + 5.2, -15, dim(.3));
  add(createEntity('water', { name: 'Lago congelado', position: [0, .01, az + 2.6], vertices: [[-3.2, -1.1], [-1.1, -1.7], [2, -1.5], [3.3, -.4], [2.2, 1.3], [-.6, 1.7], [-2.8, 1]], depth: .06, groupId, material: { ...surfacePatch('ice'), color: '#a9d3df' }, water: { state: 'ice', waveHeight: 0, opacity: .88 } }));
  // The west aisle keeps the runestones and a niche; the east aisle, the crystals and the stair to the balcony.
  rune('nordic-runestone', -10.4, 0, aFront - 4, 90); rune('nordic-runestone', -10.4, 0, aBack + 4, 90, dim(.25));
  put('temple-wall-niche', -12 + .31, 0, az, 90, { material: { ...hewn(), textureSlot: 'stone' } });
  const crystals = [[9.4, aFront - 2.6, 140, 1], [9.6, aFront - 7, 20, .8], [-9.6, aBack + 1.4, 310, .7]].map(([x, z, a, s]) => put('ice-crystal-cluster', x, 0, z, a, { scale: [s, s * 1.15, s] }));
  block('Balcão do átrio', 0, aBack + 1.2, 24, 2.4, 6.5, 6.1); railLine(-11.9, aBack + 2.45, 9.9, aBack + 2.45, 6.5);
  stairs('Escada do balcão', 11, 0, aBack + 2.4 + 4.875, 180, 1.8, 9.75, 6.5);
  put('nordic-gear-wall', -6, 6.5, aBack + .26, 0, dim(.6)); put('nordic-rune-console', 3, 6.5, aBack + 1.2, 0); lantern(-1.5, 6.5, aBack + .7, { intensity: 9 });
  put('ruined-column', -4.2, 0, aFront - 2.4, 30, { material: { color: '#8f9895' } }); rubble(-3.4, 0, aFront - 4, 50); rubble(4.6, 0, az - 1.6, 120, .8); rubble(2.2, 0, aFront - 1.2, 200, .6);
  put('old-closed-crate', 9.8, 0, aFront - 1, 25, { material: oldIn }); put('old-open-crate', 8.4, 0, aFront - 1.3, -15, { material: oldIn });
  drift(-1.5, -.05, aFront - .6, 1.1, 40, 861); drift(2.2, -.05, aFront - .4, .8, 120, 863);
  for (const x of [-8, 7]) put('ice-icicles', x, 12 - 1.3, aBack + .3, 0, { scale: [1, .8, 1] });
  lit(ring, 'ritual', { color: '#7fd8ff', intensity: 110, distance: 30, position: [0, 2.4, 2.2], shadowPolicy: 'auto', flicker: { ...illuminationDefaults('ritual').flicker, enabled: true, pattern: 'candle', amplitude: .06, frequency: .6, seed: 5 } });
  for (const crystal of crystals) lit(crystal, 'ritual', { color: '#5fd2ff', intensity: 3.5, distance: 5, position: [0, .7, 0], shadowPolicy: 'off' });
  for (const conduit of conduits) lit(conduit, 'lamp', { color: '#7fd8ff', intensity: 10, distance: 8, position: [0, 2.6, 0], shadowPolicy: 'off' });

  // 9b. West of the atrium, the machine room, 22 × 22 m: a pit 3 m deep in the middle, fenced with bronze rails,
  // where four conduits stand around a rune circle; gear walls on the walls, pipes, and a workbench in a corner.
  const machines = room({ name: 'Sala de máquinas', x: -23.8, z: az - 1.85, w: 22, l: 22, h: 10, wall: hewn(), ground: pavers('#555f5e', .15), zone: { color: '#5d8794', intensity: .36, fogColor: '#1b343c', fogDensity: .022 } });
  pass(atrium, 'west', az + 4, 3.4, 4.6); pass(machines, 'east', az + 4, 3.4, 4.6);
  const mx = machines.x, mz = machines.z, PIT = [-6, -5, 6, 5], pitY = -3;
  update(machines.floor, { holes: [[[PIT[0], PIT[1]], [PIT[2], PIT[1]], [PIT[2], PIT[3]], [PIT[0], PIT[3]]]] });
  block('Fundo do poço', mx, mz, 12, 10, pitY, pitY - .3, pavers('#4b5051'));
  const pitWall = (x0, z0, x1, z1) => wallLine('Parede do poço', x0, z0, x1, z1, pitY, -pitY, .3, hewn());
  pitWall(mx - 6.15, mz - 5.15, mx + 6.15, mz - 5.15); pitWall(mx - 4, mz + 5.15, mx + 6.15, mz + 5.15); pitWall(mx - 6.15, mz + 5.15, mx - 6.15, mz - 5.15); pitWall(mx + 6.15, mz + 5.15, mx + 6.15, mz - 5.15);
  stairs('Escada do poço', mx - 5, pitY, mz + 2.5, 0, 2, 5, -pitY);
  railLine(mx - 6.2, mz - 5.25, mx + 6.2, mz - 5.25, 0); railLine(mx + 6.25, mz - 5.2, mx + 6.25, mz + 5.2, 0); railLine(mx - 6.25, mz + 5.2, mx - 6.25, mz - 5.2, 0); railLine(mx - 3.9, mz + 5.25, mx + 6.2, mz + 5.25, 0);
  const core = put('nordic-floor-sigil', mx, pitY, mz, 0, { scale: [2, 1, 2] });
  const pitConduits = [[-3.6, -2.8], [3.6, -2.8], [-3.6, 2.8], [3.6, 2.8]].map(([u, v], i) => put('nordic-conduit-pillar', mx + u, pitY, mz + v, 0, { scale: [1, 1.6, 1], ...(i === 3 ? dim(0) : {}) }));
  put('nordic-gear-wall', mx - 2.6, pitY, mz - 5 + .26, 0); put('nordic-gear-wall', mx + 2.6, pitY, mz - 5 + .26, 0, dim(.3));
  put('nordic-rune-console', mx + 1.4, 0, mz + 6.2, 180); put('nordic-rune-console', mx - 7.2, 0, mz - 1, 90, dim(.2));
  for (const z of [mz + 6, mz - 4]) put('nordic-gear-wall', mx - 11 + .26, 0, z, 90, z > mz ? {} : dim(.4));
  const bronzePipe = { material: { color: '#c49a5a', roughness: .45, metalness: .5 } };
  for (const x of [mx - 8, mx - 4, mx, mx + 4, mx + 8]) put('industrial-pipe-long', x, 8.2, mz - 11 + .2, 0, bronzePipe);
  for (const z of [mz - 8, mz - 4, mz, mz + 4, mz + 8]) put('industrial-pipe-long', mx - 11 + .2, 7.4, z, 90, bronzePipe);
  for (const [u, v] of [[-3.6, -2.8], [3.6, 2.8]]) put('industrial-pipe-riser', mx + u, 3.4, mz + v, 0, { scale: [1, 6.6 / 3, 1], ...bronzePipe });
  for (const [u, v] of [[1, 1.5], [1.4, 2.1], [-.7, -1.4]]) put('chains', mx + u, 10 - 1.57, mz + v, u * 40);
  put('medieval-trestle-table', mx + 8, 0, mz - 8.4, 90, { material: { color: '#8a7f70' } }); put('medieval-anvil', mx + 6.4, 0, mz - 9.4, 30); put('medieval-weapon-rack', mx + 11 - .3, 0, mz - 4.5, -90);
  put('industrial-scattered-papers', mx + 7.6, .812, mz - 8.2, 30, { material: { color: '#b9ab8a' } }); put('crate', mx + 9.4, 0, mz - 10, 20, { material: oldIn }); put('crate', mx + 9.6, .78, mz - 10, 50, { material: oldIn });
  rubble(mx - 8.5, 0, mz + 8.5, 70); rubble(mx + 3, 0, mz + 9, 160, .7);
  lit(core, 'ritual', { color: '#7fd8ff', intensity: 34, distance: 16, position: [0, 1.4, 0], shadowPolicy: 'auto', flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .12, frequency: .8, seed: 13 } });
  lit(pitConduits[0], 'lamp', { color: '#7fd8ff', intensity: 9, distance: 7, position: [0, 3, 0], shadowPolicy: 'off' });
  lantern(mx + 8.6, 0, mz - 6.2, { intensity: 8, distance: 8 });

  // 9c. East of the atrium, the archive, 18 × 16 m and 9 m high: aisles between double shelves, a mezzanine of
  // shelves along the east wall, a reading table by the door and a corner where the mountain has broken in.
  const archive = room({ name: 'Arquivo rúnico', x: 21.8, z: aFront - 9.85, w: 18, l: 16, h: 9, wall: hewn(), ground: pavers('#5b6766', .15), zone: { color: '#62909e', intensity: .34, fogColor: '#1d3a42', fogDensity: .02 } });
  pass(atrium, 'east', aFront - 3.85, 3, 4); pass(archive, 'west', aFront - 3.85, 3, 4);
  const ax = archive.x, arz = archive.z, aN = arz - 8, aS = arz + 8;
  block('Mezanino do arquivo', ax + 6.5, arz, 5, 16, 4.2, 3.85); block('Patamar do mezanino', ax + 3.2, aN + 5.9, 1.6, 2.2, 4.2, 3.85);
  stairs('Escada do mezanino', ax + 3.2, 0, aN + 10, 180, 1.6, 8, 4.2);
  railLine(ax + 4.05, aS, ax + 4.05, aN + 7, 4.2); railLine(ax + 4.05, aN + 4.8, ax + 4.05, aN, 4.2);
  for (const z of [aS - 2, aS - 5.2, aS - 8.4, aN + 1.6]) put('nordic-tablet-shelf', ax + 9 - .32, 4.2, z, -90, { material: { textureSlot: 'stone', ...hewn() } });
  for (const x of [ax - 5.6, ax - 1.2]) for (const z of [arz + 1.4, arz - 1.4]) { put('nordic-tablet-shelf', x + .31, 0, z, 90, { material: { textureSlot: 'stone', ...hewn() } }); put('nordic-tablet-shelf', x - .31, 0, z, -90, { material: { textureSlot: 'stone', ...hewn() } }); }
  put('nordic-tablet-shelf', ax + 1.4, 0, aN + .32, 0, { material: { textureSlot: 'stone', ...hewn() } });
  const stones = [rune('nordic-runestone', ax + 1.6, 0, aN + 3.4, -20), rune('nordic-runestone', ax - 3.4, 0, aN + 3.2, 25, dim(.2))];
  put('medieval-trestle-table', ax - .6, 0, aS - 1.5, 0, { material: { color: '#8a7f70' } }); for (const s of [-1, 1]) put('medieval-bench', ax - .6, 0, aS - 1.5 + s * .85, 0, { material: { color: '#8a7f70' } });
  put('industrial-scattered-papers', ax - 2.6, 0, aS - 3.2, 70, { material: { color: '#b9ab8a' } }); off(put('medieval-candle-stand', ax + 2.6, 0, aS - .6, 0, { material: { color: '#6d7272' } }));
  // The broken corner: rock pushing through the walls, rubble, a shelf thrown down and frost.
  put('organic-rock', ax - 8.6, -.6, aN + 1.4, 40, { scale: [1.2, 1.5, 1.1], rockShape: { ...rockDefaults('builtin-organic-rock'), seed: 5203, detail: 5, irregularity: .9, erosion: .8 }, material: raw('#454c4a') });
  put('nordic-tablet-shelf', ax - 6.6, .3, aN + 3.6, turn(35, -80), { material: { textureSlot: 'stone', ...hewn() } }); rubble(ax - 6.4, 0, aN + 1.4, 20); rubble(ax - 8, 0, aN + 4, 110, .7);
  put('ice-icicles', ax - 7.6, 9 - 1.2, aN + 1, 45, { scale: [1, .8, 1] }); drift(ax - 7.4, -.05, aN + 2.6, .9, 300, 871);
  lit(stones[0], 'ritual', { color: '#7fd8ff', intensity: 6, distance: 6, position: [0, 1.4, .8], shadowPolicy: 'off' });
  lantern(ax - 7, 0, aN + 6.4, { intensity: 10 }); lantern(ax + 8.2, 4.2, aN + 5, { intensity: 9 });
  kerosene(ax - 1.2, .812, aS - 1.5, { intensity: 10, distance: 7 });

  // 9d. North of the archive, the warriors' dormitory, 18 × 16 m: three cells behind low walls on the east for the
  // captains, a row of beds along the west wall, a common table, a cold hearth and the way east to the banquet hall.
  const quarters = room({ name: 'Dormitório dos guerreiros', x: ax, z: aN - T * 2 - 8, w: 18, l: 16, h: 6, wall: hewn(), ground: pavers('#5a6362', .1), zone: { color: '#7a8f96', intensity: .26, fogColor: '#1e3239', fogDensity: .018 }, zoneBox: [4, 30.8, -48.35, -29.8] });
  pass(archive, 'north', ax - 3.3, 2.4, 3.2); pass(quarters, 'south', ax - 3.3, 2.4, 3.2);
  const qx = quarters.x, qz = quarters.z, qS = qz + 8, cell = { ...hewn(), textureColor: '#5b6a69' };
  for (let i = 0; i < 3; i++) {
    const top = qS - 4 * i;
    if (i) wallLine('Parede da cela', qx + 2.2, top, qx + 9, top, 0, 2.6, .2, cell);
    wallLine('Parede da cela', qx + 2.2, top - 1.4, qx + 2.2, top - 4, 0, 2.6, .2, cell);
    put('medieval-bed', qx + 7.8, 0, top - 2.2, 90, { material: { color: '#9a8f80' } }); put('medieval-chest', qx + 4.6, 0, top - 3.3, 90, { material: { color: '#8a8478' } });
    if (i % 2) put('medieval-armor-stand', qx + 3, 0, top - 3.4, 90); else put('rug', qx + 6, 0, top - 2.2, 90, { scale: [.5, 1, .9], material: { color: '#6a5444' } });
  }
  wallLine('Parede da cela', qx + 2.2, qS - 12, qx + 9, qS - 12, 0, 2.6, .2, cell);
  for (const [i, z] of [qS - 1.6, qS - 4.2, qS - 6.8, qS - 9.4, qS - 12].entries()) { put('medieval-bed', qx - 9 + 1.1, 0, z, 90, { material: { color: '#9a8f80' } }); if (i % 2 === 0) put('medieval-chest', qx - 9 + 2.6, 0, z, 90, { material: { color: '#8a8478' } }); }
  put('medieval-trestle-table', qx - 2.4, 0, qz - 1, 90, { material: { color: '#8a7f70' } }); for (const s of [-1, 1]) put('medieval-bench', qx - 2.4 + s * .85, 0, qz - 1, 90, { material: { color: '#8a7f70' } });
  put('medieval-tankards', qx - 2.4, .812, qz - 1.6, 40); put('medieval-stool', qx - .4, 0, qz + 2.6, 30, { rotation: turn(30, 80) });
  off(put('medieval-hearth', qx - 4.6, 0, qz - 8 + .37, 0, { material: { color: '#9b9f9a' } })); put('medieval-weapon-rack', qx + .6, 0, qz - 8 + .3, 0);
  put('medieval-armor-stand', qx - 1, 0, qS - .8, 180); put('old-closed-crate', qx - 6, 0, qz - 6.6, 10, { material: oldIn });
  kerosene(qx - 2.4, .812, qz - .4, { intensity: 11 }); lantern(qx + 5.8, 0, qz - 6.4, { intensity: 8, distance: 8 });

  // 9e. West of the quarters, the storeroom, and north of the atrium the corridor of the guardians: both open
  // onto the painted cave.
  const store_ = room({ name: 'Despensa', x: 8, z: -48.35 + 5.175, w: 8, l: 10.35, h: 5, wall: hewn(), ground: pavers('#555f5e', .2), zone: null });
  pass(quarters, 'west', qz - 4.2, 2.2, 3); pass(store_, 'east', qz - 4.2, 2.2, 3);
  const sx_ = store_.x, sz_ = store_.z;
  put('medieval-cupboard', sx_ - 4 + .3, 0, sz_ - 2, 90, { material: { color: '#8a8478' } }); put('medieval-cupboard', sx_ - 4 + .3, 0, sz_ + 1, 90, { material: { color: '#8a8478' } });
  put('medieval-barrel-rack', sx_ + 1.6, 0, sz_ + 4.4, 0, { material: { color: '#8a8478' } }); put('church-hook-rack', sx_, 5 - 1.6, sz_ - 1, 0);
  put('medieval-sacks', sx_ + 2.6, 0, sz_ - 1.6, 20, { material: { color: '#a7a399' } }); put('old-open-crate', sx_ + 2.4, 0, sz_ - 3.6, 60, { material: oldIn }); put('crate', sx_ - 1, 0, sz_ + 3.6, 15, { material: oldIn });
  lantern(sx_ + 3.2, 0, sz_ + 1.6, { intensity: 7, distance: 7 });

  // 9e2. East of the archive and the dormitory, the wing where they lived well: a library on two floors, the banquet
  // hall with its kitchen, and a corridor of bedrooms ending in the chamber of the jarl.
  const book = { material: { color: '#d8c8b0' } }, wood = { material: { color: '#8a7f70' } };
  const library = room({ name: 'Biblioteca', x: 40.6, z: arz, w: 18, l: 16, h: 10, wall: hewn(), ground: pavers('#5a6564'), zone: { color: '#8a8070', intensity: .3, fogColor: '#1f2a2c', fogDensity: .012 } });
  const lx = library.x, lz = library.z, lW = lx - 9, lE = lx + 9, lN = lz - 8, lS = lz + 8;
  pass(archive, 'east', lS - 4, 2.4, 3.2); pass(library, 'west', lS - 4, 2.4, 3.2);
  // The upper floor joins the archive's mezzanine through the wall, 4,2 m up.
  pass(archive, 'east', lN + 4, 2.2, 2.6, 4.2); pass(library, 'west', lN + 4, 2.2, 2.6, 4.2);
  block('Galeria oeste da biblioteca', lW + 2, lz, 4, 16, 4.2, 3.85); block('Galeria norte da biblioteca', lx + 2, lN + 2, 14, 4, 4.2, 3.85);
  railLine(lW + 4.05, lS, lW + 4.05, lN + 4.05, 4.2); railLine(lW + 4.05, lN + 4.05, lE - 1.8, lN + 4.05, 4.2);
  stairs('Escada da biblioteca', lE - .9, 0, lN + 4 + 5.4, 180, 1.6, 10.8, 4.2);
  for (const z of [lS - 1.4, lS - 2.8, lS - 4.2, lS - 5.6, lS - 7, lS - 8.4, lS - 9.8, lN + 1.6]) put('bookshelf', lW + .2, 4.2, z + .6, 90, { scale: [1.15, 1.3, 1], ...book });
  for (const x of [lx - 4.6, lx - 3.4, lx - 2.2, lx - 1, lx + .2, lx + 1.4, lx + 2.6, lx + 3.8, lx + 5]) put('bookshelf', x, 4.2, lN + .2, 0, { scale: [1, 1.3, 1], ...book });
  for (const x of [lx - 2, lx - .8, lx + .4, lx + 1.6, lx + 2.8, lx + 4]) put('bookshelf', x, 0, lS - .2, 180, { scale: [1, 1.3, 1], ...book });
  // Two double rows of shelves running north–south make the aisles of the ground floor.
  for (const x of [lx - 4.6, lx - 1.6]) for (const z of [lz + 3, lz + 1.8, lz + .6, lz - .6, lz - 1.8]) { put('bookshelf', x - .2, 0, z, -90, { scale: [1, 1.2, 1], ...book }); put('bookshelf', x + .2, 0, z, 90, { scale: [1, 1.2, 1], ...book }); }
  put('nordic-tablet-shelf', lx + 5.2, 0, lN + 4.6, 0, { material: { textureSlot: 'stone', ...hewn() } });
  for (const z of [lz + 2.2, lz - 1.4]) { put('medieval-trestle-table', lx + 3.4, 0, z, 0, wood); for (const s of [-1, 1]) put('chair', lx + 3.4 + s * .7, 0, z + .75, 180, wood); }
  put('ritual-book', lx + 3, .812, lz + 2.1, 30); off(put('candles', lx + 4.2, .812, lz + 2.2, 0)); put('globe', lx + 2.6, .812, lz - 1.3, 0); put('industrial-scattered-papers', lx + 3.6, .812, lz - 1.5, 60, { material: { color: '#c4b593' } });
  put('lectern', lx + 2.4, 0, lN + 5, 0, wood); put('armchair', lx + 5.6, 0, lz + 3.6, -140, { material: { color: '#6d5a4a' } }); put('rug', lx + 3.4, 0, lz + .4, 0, { scale: [1.2, 1, 2.2], material: { color: '#4f3a30' } });
  for (const z of [lz + 2, lz - 2]) off(put('chandelier', lx + 3.4, 10 - 1.02, z, 0));
  off(put('candles', lx + 4.2, .812, lz - 1.4, 40)); off(put('medieval-candle-stand', lW + 4.6, 0, lS - 1.2, 0)); off(put('medieval-candle-stand', lx + 5.8, 4.2, lN + 1.4, 0));
  kerosene(lx + 3.9, .812, lz + 1.8, { intensity: 10, distance: 7 }); lantern(lx - 3.1, 0, lz - 4.2, { intensity: 10, distance: 8 }); lantern(lx - .1, 0, lz - 3.4, { intensity: 9, distance: 8 }); lantern(lE - 2.6, 0, lS - 2, { intensity: 9 }); lantern(lW + 1.4, 4.2, lN + 1.4, { intensity: 8 });

  const hall3 = room({ name: 'Salão de banquete', x: 41.6, z: qz, w: 20, l: 16, h: 8, wall: hewn(), ground: pavers('#5a6564', .05), zone: { color: '#857a6c', intensity: .28, fogColor: '#1f2a2c', fogDensity: .014 }, zoneBox: [31.6, 51.6, -56.6, -29.8] });
  const bx = hall3.x, bz = hall3.z, bS = bz + 8, bN = bz - 8, bW = bx - 10, bE = bx + 10;
  pass(library, 'north', lx - 1, 2.4, 3.2); pass(hall3, 'south', lx - 1, 2.4, 3.2);
  pass(quarters, 'east', qz - 6, 2.2, 3); pass(hall3, 'west', qz - 6, 2.2, 3);
  // Two long tables down the hall, the high table on a dais at the east end, the great hearth on the north wall.
  for (const x of [bx - 5, bx + 1.4]) for (const z of [bz + 2.8, bz - 2.8]) {
    put('church-banquet-table', x, 0, z, 0, wood);
    for (const s of [-1, 1]) for (const u of [-1.3, 1.3]) put('medieval-bench', x + s * 1.05, 0, z + u, 90, wood);
    for (const u of [-1.8, 0, 1.8]) for (const s of [-1, 1]) put('church-banquet-setting', x + s * .32, 1.04, z + u, s * 90);
  }
  block('Estrado da mesa alta', bE - 1.4, bz, 2.8, 9, .45, 0); put('church-banquet-table', bE - 2, .45, bz, 0, wood);
  put('medieval-throne', bE - .55, .45, bz, -90); for (const z of [bz - 1.6, bz + 1.6]) put('church-pointed-chair', bE - .6, .45, z, -90, wood);
  for (const z of [bz - 3.2, bz + 3.2]) put('medieval-banner', bE - .06, 3.4, z, -90, { scale: [1.4, 1.6, 1], material: { color: '#6a3a2e' } });
  off(put('medieval-hearth', bx - 1.6, 0, bN + .37, 0, { scale: [1.6, 1.4, 1.2], material: { color: '#9b9f9a' } }));
  put('medieval-barrel-rack', bW + .6, 0, bN + 4.6, 90, { material: { color: '#8a8478' } }); put('medieval-tankards', bx - 5, 1.04, bz + 1.4, 20); put('medieval-tankards', bx + 1.4, 1.04, bz - 3.6, 120);
  put('medieval-stool', bx - 3, 0, bz + 6.4, 0, { rotation: turn(10, 85) }); put('church-banquet-setting', bx - 2.6, 0, bz + 5.2, 50);
  for (const x of [bx - 5, bx + 1.4]) off(put('chandelier', x, 8 - 1.02, bz, 0));
  for (const z of [bz - 4, bz + 4]) off(put('medieval-candle-stand', bE - 2, .45, z, 0));
  put('old-closed-crate', bW + 1.2, 0, bS - 1.2, 15, { material: oldIn }); kerosene(bW + 1.2, .623, bS - 1.2, { intensity: 12, distance: 8 });
  lantern(bx - 1.8, 0, bS - .8, { intensity: 9 }); lantern(bW + 1, 0, bN + 4.4, { intensity: 8 });

  const kitchen = room({ name: 'Cozinha', x: 36.6, z: bN - 2 * T - 5, w: 10, l: 10, h: 5, wall: hewn(), ground: pavers('#555f5e', .05), zone: null });
  pass(hall3, 'north', 36, 2.2, 3); pass(kitchen, 'south', 36, 2.2, 3);
  const kx = kitchen.x, kz = kitchen.z;
  off(put('medieval-hearth', kx + 1.6, 0, kz - 5 + .37, 0, { scale: [1.3, 1.2, 1.1], material: { color: '#9b9f9a' } })); off(put('medieval-cauldron', kx + 1.6, 0, kz - 3.4, 0)); off(put('medieval-cauldron', kx - 3.4, 0, kz - 3.6, 0));
  put('medieval-trestle-table', kx - .6, 0, kz + .4, 0, wood); put('medieval-tankards', kx - 1, .812, kz + .3, 0); put('medieval-sacks', kx + 3.4, 0, kz + 3.2, 20, { material: { color: '#a7a399' } });
  put('medieval-cupboard', kx - 5 + .3, 0, kz + 1.4, 90, { material: { color: '#8a8478' } }); put('medieval-barrel-rack', kx - 4.4, 0, kz - 2, 90, { material: { color: '#8a8478' } }); put('church-hook-rack', kx - .6, 5 - 1.6, kz + .4, 0);
  put('wooden-expedition-barrel', kx + 3.6, 0, kz - 1.4, 0); put('medieval-wooden-tub', kx + 3, 0, kz + .6, 30, wood);
  lantern(kx - 3.6, 0, kz + 3.6, { intensity: 6, distance: 7 });

  // The bedrooms open off a corridor east of the hall: three rooms of the priests and, at the end, the jarl's chamber.
  const wing = room({ name: 'Ala dos quartos', x: bE + 2 * T + 1.4, z: bz - 5, w: 2.8, l: 26, h: 4, wall: hewn(), ground: pavers('#5a6564'), zone: { color: '#7c8a8c', intensity: .26, fogColor: '#1b2a30', fogDensity: .02 }, zoneBox: [52.4, 66, -60.8, -29.8] });
  const cx_ = wing.x, wS = wing.z + 13;
  pass(hall3, 'east', bS - 1.8, 2.2, 3); pass(wing, 'west', bS - 1.8, 2.2, 3);
  const bedroom = (name, z, l, w = 8, door = z) => { const r = room({ name, x: cx_ + 1.4 + 2 * T + w / 2, z, w, l, h: 4, wall: hewn(), ground: pavers('#5a6564'), zone: null }); pass(wing, 'east', door, 1.4, 2.6); pass(r, 'west', door, 1.4, 2.6); return r; };
  const priests = [wS - 3, wS - 3 - 6.8, wS - 3 - 13.6].map((z, i) => bedroom(`Quarto do sacerdote ${i + 1}`, z, 6));
  for (const [i, r] of priests.entries()) {
    const rx = r.x, rz = r.z;
    put('medieval-bed', rx + 2.6, 0, rz - 1.6, i === 2 ? turn(-90 + 25, 0) : -90, { material: { color: '#9a8f80' } }); put('medieval-chest', rx + 2.6, 0, rz + 1.6, -90, { material: { color: '#8a8478' } });
    put('medieval-trestle-table', rx - 1.2, 0, rz - 2.3, 0, { scale: [.6, 1, .8], ...wood }); put('chair', rx - 1.2, 0, rz - 1.5, 180, wood); put('bookshelf', rx - 2.8, 0, rz - 2.75, 0, book);
    put('rug', rx + .4, 0, rz + .4, 90, { scale: [.6, 1, .7], material: { color: '#4f3a30' } }); off(put('candles', rx - 1.4, .812, rz - 2.4, 0));
    if (i === 1) { put('ritual-book', rx - .9, .812, rz - 2.2, 20); put('nordic-floor-sigil', rx + .4, 0, rz + .4, 0, { scale: [.6, 1, .6] }); }
    if (i === 2) { put('industrial-scattered-papers', rx, 0, rz + .6, 30, { material: { color: '#c4b593' } }); put('chair', rx - .6, 0, rz + 1.6, 0, { rotation: turn(60, 88) }); }
  }
  const jarl = bedroom('Câmara do jarl', priests[2].z - 3 - 2 * T - 5, 10, 10, priests[2].z - 8.2);
  const jx = jarl.x, jz = jarl.z;
  put('medieval-bed', jx + 3.4, 0, jz - 2.6, -90, { scale: [1.4, 1.1, 1.2], material: { color: '#8a5a48' } }); put('rug', jx + 1.6, 0, jz - 2.6, 90, { scale: [.9, 1, 1.4], material: { color: '#5a4434' } });
  put('medieval-throne', jx - 3.6, 0, jz + 2.6, 50); off(put('medieval-hearth', jx - 1, 0, jz - 5 + .37, 0, { material: { color: '#9b9f9a' } }));
  put('medieval-weapon-rack', jx + 5 - .3, 0, jz + 2.8, -90); put('medieval-armor-stand', jx + 3.8, 0, jz + 4.2, -120); put('medieval-shield', jx - 5 + .1, 2, jz - 2.4, 90);
  put('medieval-chest', jx + 3.4, 0, jz + .2, -90, { material: { color: '#7a5a3a' } }); put('medieval-cupboard', jx - 5 + .3, 0, jz - 3, 90, { material: { color: '#8a6a4a' } });
  put('desk', jx - 1.4, 0, jz + 3.6, 180, wood); put('globe', jx - .8, .82, jz + 3.6, 0); put('ritual-book', jx - 1.9, .82, jz + 3.5, 10);
  for (const z of [jz - 4, jz + 1]) put('medieval-banner', jx + 5 - .06, 2.2, z, -90, { material: { color: '#6a3a2e' } });
  off(put('medieval-candle-stand', jx + 1.8, 0, jz - 4.2, 0)); off(put('medieval-brazier', jx - 1.4, 0, jz, 0)); lantern(jx + 4.2, 0, jz - .2, { intensity: 8, distance: 9 });
  lantern(cx_ - .9, 0, wS - 6.4, { intensity: 7 }); lantern(cx_ + .9, 0, wS - 20, { intensity: 5, flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .6, frequency: 1.4, seed: 59 } });

  const guards = room({ name: 'Corredor dos guardiões', x: -8, z: aBack - 2 * T - 7.2, w: 6, l: 14.4, h: 7, wall: hewn(), ground: pavers('#5a6564'), zone: { color: '#6a8f9a', intensity: .26, fogColor: '#1b343c', fogDensity: .02 } });
  pass(atrium, 'north', -8, 3, 4); pass(guards, 'south', -8, 3, 4);
  for (const [i, z] of [guards.z + 4.4, guards.z, guards.z - 4.4].entries()) {
    statue(-10.2, 0, z, 90); statue(-5.8, 0, z, -90);
    if (i < 2) { put('medieval-banner', -11 + .06, 3.6, z - 2.2, 90, { material: { color: '#4f6670' } }); put('medieval-banner', -5 - .06, 3.6, z - 2.2, -90, { material: { color: '#4f6670' } }); }
  }
  lantern(-10.4, 0, guards.z + 2.2, { intensity: 9 }); lantern(-5.6, 0, guards.z - 2.2, { intensity: 9 });

  // 9f. The painted cave, about 30 × 23 m: a natural chamber with an irregular outline (a polygon floor and a
  // wall along each edge), a rock pillar, a frozen pool, a crevice of crystals on the west and the expedition's
  // camp under the paintings. Openings: the guardians and the storeroom on the south, the hall of the ancestors
  // through a short tunnel on the west.
  groupId = folder('Galeria rupestre');
  const CAVE = [[-11.4, -48.95], [12.4, -48.95], [14, -53], [13, -58.5], [14.5, -62.5], [11.5, -67.5], [6, -71], [-.5, -72], [-6, -70.5], [-9.5, -67.5], [-14, -69.5], [-17, -66], [-13.5, -63.5], [-11.5, -62], [-12.5, -57], [-12.5, -51]];
  const caveH = 8.5, caveX = (Math.min(...CAVE.map(p => p[0])) + Math.max(...CAVE.map(p => p[0]))) / 2, caveZ = (Math.min(...CAVE.map(p => p[1])) + Math.max(...CAVE.map(p => p[1]))) / 2;
  const caveFloor = add(createEntity('floor', { name: 'Piso — Galeria rupestre', vertices: CAVE.map(([x, z]) => [x - caveX, z - caveZ]), thickness: .3, position: [caveX, 0, caveZ], groupId, material: { ...raw('#5c5d57'), relief: .02 }, lightingZone: zoneOf(32, caveH, 24, { color: '#a08a76', intensity: .5, fogColor: '#1f2a2c', fogDensity: .008 }) }));
  surface = caveFloor.id; surfaceY = 0;
  const centroid = [CAVE.reduce((s, p) => s + p[0], 0) / CAVE.length, CAVE.reduce((s, p) => s + p[1], 0) / CAVE.length];
  const edges = CAVE.map((a, i) => {
    const b = CAVE[(i + 1) % CAVE.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]), [ux, uz] = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
    let [nx, nz] = [-uz, ux]; const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if ((centroid[0] - mid[0]) * nx + (centroid[1] - mid[1]) * nz < 0) [nx, nz] = [-nx, -nz];
    const wall = wallLine('Parede da caverna', a[0] - ux * .2, a[1] - uz * .2, b[0] + ux * .2, b[1] + uz * .2, 0, caveH, T, raw('#6b6a61'));
    return { wall, a, mid, length, normal: [nx, nz], yaw: Math.atan2(nx, nz) * 180 / Math.PI };
  });
  const caveOpening = (i, along, width, height) => add(createEntity('window', { name: 'Vão de passagem', wallId: edges[i].wall.id, offset: along + .2, width, height, sill: 0, style: 'open', groupId }));
  caveOpening(0, 3.4, 3, 4); caveOpening(0, 19.4, 2.2, 3); caveOpening(14, 3.75, 3, 3.5);
  pass(guards, 'north', -8, 3, 4); pass(store_, 'north', 8, 2.2, 3);
  ceilingOver('Galeria rupestre', -17.4, 14.9, -72.4, -48.75, caveH, '#34393a');
  const onWall = (i, t, y, name, scale = [1, 1, 1]) => { const e = edges[i], p = [e.a[0] + (e.mid[0] - e.a[0]) * 2 * t, e.a[1] + (e.mid[1] - e.a[1]) * 2 * t]; return put(name, p[0] + e.normal[0] * .42, y, p[1] + e.normal[1] * .42, e.yaw, { scale }); };
  onWall(2, .5, 1, 'cave-painting-hunt', [1.25, 1.25, 1]); onWall(6, .5, .9, 'cave-painting-ring', [1.3, 1.3, 1]); onWall(8, .45, 1.1, 'cave-painting-hunt', [1.1, 1.1, 1]);
  const spire = (x, z, sy, a, seed, hanging = false) => put('mountain-rock-spire', x, hanging ? caveH : 0, z, hanging ? turn(a, 180) : a, { name: hanging ? 'Estalactite' : 'Pilar de rocha', scale: [sy * .5, sy, sy * .5], rockShape: { ...rockDefaults('builtin-mountain-rock-spire'), seed, detail: 5 }, material: raw('#5c5d57') });
  spire(-3.5, -61, caveH / 9, 30, 5301); spire(6.5, -66.5, .3, 80, 5309); spire(2, -57, .28, 10, 5311, true); spire(-6.5, -66, .32, 200, 5323, true);
  for (const [x, z, s, a, seed] of [[12.6, -55.5, .8, 20, 5401], [-8.8, -68.5, .9, 120, 5413], [12.8, -64.2, .7, 200, 5419], [-11.2, -59.6, .6, 300, 5431]])
    put('organic-rock', x, -.4, z, a, { scale: [s, s * .9, s], rockShape: { ...rockDefaults('builtin-organic-rock'), seed, detail: 5, irregularity: .9, erosion: .8 }, material: raw('#5c5d57') });
  add(createEntity('water', { name: 'Poça congelada', position: [3.6, .02, -63.6], vertices: [[-2.2, -1], [0, -1.6], [2.4, -.8], [2, 1.2], [-.4, 1.6], [-2.4, .8]], depth: .05, groupId, material: { ...surfacePatch('ice'), color: '#a9c9d2' }, water: { state: 'ice', waveHeight: 0, opacity: .85 } }));
  const crevice = [[-14.6, -67.4, 40, 1], [-15.6, -65.4, 160, .8], [-13.4, -65.6, 260, .6]].map(([x, z, a, s]) => put('ice-crystal-cluster', x, 0, z, a, { scale: [s, s * 1.2, s] }));
  put('ice-icicles', -14.8, caveH - 1.4, -66.6, 50, { scale: [.9, .9, 1] });
  // The expedition was documenting the paintings: lanterns on crates against the walls, a board of notes and photographs.
  put('old-closed-crate', 11.2, 0, -55.9, 80, { material: oldIn }); kerosene(11.2, .623, -55.9, { intensity: 22, distance: 9 });
  put('old-closed-crate', 0, 0, -69.6, 5, { material: oldIn }); kerosene(0, .623, -69.6, { intensity: 22, distance: 9 });
  put('evidence-board', 6.4, 0, -60.5, -60, { material: { color: '#b8ad98' } }); put('medieval-stool', 5.6, 0, -59.8, 20, { material: { color: '#8a7f70' } });
  put('medieval-sacks', 8.4, 0, -59, 10, { material: { color: '#6f6a58' } }); put('old-open-crate', 7.6, 0, -57.2, 40, { material: oldIn }); put('industrial-scattered-papers', 4.8, 0, -58.6, 10, { material: { color: '#c4b593' } });
  for (const crystal of crevice.slice(0, 2)) lit(crystal, 'ritual', { color: '#5fd2ff', intensity: 4, distance: 6, position: [0, .7, 0], shadowPolicy: 'off' });
  lantern(-10.6, 0, -57.8, { intensity: 7, distance: 8 });

  // 9g. Down from the cave: the hall of the ancestors, 16 × 16 m and 12 m high, its floor 6 m below. The cave
  // opens onto an upper landing; a grand stair goes down along the north wall to a lower hall of guardians,
  // a cold-fire brazier and the way west to the forge.
  add(createEntity('floor', { name: 'Soleira do túnel', width: .8, length: 3, thickness: .3, position: [-12.7, 0, -53.25], groupId, material: raw('#5c5d57') }));
  const ancestors = room({ name: 'Salão dos ancestrais', x: -21.1, y: DEEP, z: -48, w: 16, l: 16, h: 12, wall: hewn(), ground: pavers('#4b5051'), zone: { color: '#5f8794', intensity: .3, fogColor: '#17303a', fogDensity: .025 } });
  pass(ancestors, 'east', -53.25, 3, 3.5, -DEEP);
  const anx = ancestors.x, anz = ancestors.z;
  block('Patamar superior', anx + 6, -53.25, 4, 5.5, 0, DEEP); stairs('Escadaria dos ancestrais', anx - 1, DEEP, -53.25, 90, 5, 10, -DEEP);
  railLine(anx + 4, -50.45, anx + 8, -50.45, 0);
  for (const x of [anx - 6.4, anx - 2.2, anx + 2, anx + 6]) statue(x, DEEP, anz + 8 - .9, 180);
  for (const s of [-1, 1]) put('temple-square-pier', anx + s * 4.6, DEEP, anz + 2.4, 0, { scale: tall(12), material: { ...hewn(), textureSlot: 'stone' } });
  const coldFire = put('medieval-brazier', anx, DEEP, anz + 2.4, 0, { material: { textureSlot: 'flame', emissive: '#3fb6ff', emissiveIntensity: 1.8 } });
  rune('nordic-runestone', anx - 7.4, DEEP, anz + 4.6, 90); put('medieval-banner', anx, DEEP + 7.6, anz - 8 + .06, 0, { scale: [2, 2, 1], material: { color: '#4f6670' } });
  lit(coldFire, 'ritual', { color: '#6fd0ff', intensity: 26, distance: 14, position: [0, 1.4, 0], shadowPolicy: 'auto', flicker: { ...illuminationDefaults('torch').flicker, enabled: true, amplitude: .16, seed: 41 } });
  lantern(anx + 6.4, 0, -55, { intensity: 9 }); lantern(anx - 6.6, DEEP, -49.6, { intensity: 12, distance: 11 }); lantern(anx + 6.6, DEEP, anz + 6.6, { intensity: 10, distance: 10 });

  // 9h. The service stair from the machine room comes down beside the forge, closing the loop.
  const service = room({ name: 'Escada de serviço', x: mx - 9.2, y: DEEP, z: machines.z - 11 - 2 * T - 4.7, w: 4, l: 9.4, h: 9.6, wall: hewn(), ground: pavers('#4b5051'), ceiling: '#30373a', zone: null });
  pass(machines, 'north', service.x, 3, 3.4); pass(service, 'south', service.x, 3, 3.4, -DEEP);
  stairs('Escada de serviço', service.x, DEEP, service.z, 0, 3.2, 9.4, -DEEP);
  for (const s of [-1, 1]) put('industrial-pipe-riser', service.x + s * 1.75, DEEP, service.z, 90, { scale: [1, 9.6 / 3, 1], ...bronzePipe });
  lantern(service.x + 1.2, DEEP + (4.7 - .5) / 9.4 * -DEEP, service.z - .5, { intensity: 8, distance: 8 });

  // 9i. The deep forge, 18 × 18 m and 10 m high: a channel of molten metal runs across it with a bridge to the
  // ore store; the forge engine, anvils, a quenching trough, and the round vault door in the north wall.
  const forge = room({ name: 'Forja profunda', x: -39, y: DEEP, z: -55, w: 18, l: 18, h: 10, wall: raw('#454c4a'), ground: pavers('#4b5051'), ceiling: '#30373a', zone: { color: '#8a6450', intensity: .22, fogColor: '#2a1c18', fogDensity: .03 }, zoneBox: [-48, -30, -64, -35.8] });
  pass(service, 'north', service.x, 3, 3.4); pass(forge, 'south', service.x, 3, 3.4);
  pass(ancestors, 'west', -48.5, 3, 4); pass(forge, 'east', -48.5, 3, 4);
  const fx = forge.x, fz = forge.z, molten = { color: '#ff8a3a', emissive: '#ff4a10', emissiveIntensity: 2.4, roughness: .35, texture: 'none' };
  const channel = add(createEntity('floor', { name: 'Canal de metal fundido', width: 1.2, length: 18, thickness: .1, position: [fx - 3, DEEP + .03, fz], groupId, material: molten }));
  for (const s of [-1, 1]) wallLine('Borda do canal', fx - 3 + s * .72, fz + 9, fx - 3 + s * .72, fz - 9, DEEP, .35, .24, hewn());
  block('Ponte sobre o canal', fx - 3, fz, 2.2, 2.4, DEEP + .42, DEEP + .2);
  const engine = put('nordic-forge-engine', fx - 6.4, DEEP, fz - 4.6, 90);
  for (const [x, z, a] of [[fx + 2.4, fz - 1.4, 20], [fx + 3, fz + 3.2, -40]]) put('medieval-anvil', x, DEEP, z, a);
  block('Tina de têmpera', fx + 5.6, fz + 5.6, 2.8, 1.6, DEEP + .6, DEEP); block('Água da tina', fx + 5.6, fz + 5.6, 2.4, 1.2, DEEP + .62, DEEP + .6, { color: '#16262b', roughness: .15, texture: 'none' });
  put('nordic-gear-wall', fx - 1, DEEP, fz + 9 - .26, 180, dim(.3)); put('medieval-weapon-rack', fx + 9 - .3, DEEP, fz - 3, -90); put('church-hook-rack', fx + 4.4, DEEP + 10 - 1.6, fz - 1, 0);
  put('medieval-barrel-rack', fx - 8.4, DEEP, fz + 6, 90, { material: { color: '#8a8478' } }); put('mountain-cart-wreck', fx - 6.6, DEEP, fz + 4, 25);
  const ore = { material: { ...raw('#454c4a'), textureColor: '#6b4a38' } };
  put('rock-scree', fx - 7, DEEP, fz + 2.2, 60, { scale: [.6, .5, .6], rockShape: { ...rockDefaults('builtin-rock-scree'), seed: 5501 }, ...ore });
  for (const [x, z] of [[fx + 2.8, fz - 1.8], [fx + 3.2, fz + 2.6], [fx - 2, fz - 6]]) put('chains', x, DEEP + 10 - 1.57, z, x * 20);
  rubble(fx + 6.6, DEEP, fz - 6.4, 40, .8);
  const vault = asset('nordic-vault-door'), vaultShift = vault.bounds[0] / 2 - 2.2;
  put('nordic-vault-door', fx + vaultShift, DEEP, fz - 9 + .3, 0, { material: { textureSlot: 'stone', ...hewn() } });
  const forgeConduit = put('nordic-conduit-pillar', fx + 5.4, DEEP, fz - 7.4, 0);
  lit(engine, 'torch', { color: '#ff6a2a', intensity: 34, distance: 13, position: [1.4, 1.3, 0], shadowPolicy: 'auto', flicker: { ...illuminationDefaults('torch').flicker, enabled: true, amplitude: .22, frequency: 1.4, seed: 17 } });
  lit(channel, 'torch', { color: '#ff5a1c', intensity: 26, distance: 12, position: [0, .5, 3], shadowPolicy: 'off', flicker: { ...illuminationDefaults('torch').flicker, enabled: true, amplitude: .1, frequency: .5, seed: 19 } });
  lit(forgeConduit, 'lamp', { color: '#7fd8ff', intensity: 8, distance: 7, position: [0, 2.2, 0], shadowPolicy: 'off' });

  // 9j. Across the bridge, the ore store: carts, ore and the mouth of a mine tunnel that has caved in.
  const depot = room({ name: 'Depósito de minério', x: fx - 9 - 2 * T - 5, y: DEEP, z: fz, w: 10, l: 10, h: 5, wall: raw('#454c4a'), ground: raw('#454c4a'), ceiling: '#30373a', zone: { color: '#7a6455', intensity: .16, fogColor: '#1d1712', fogDensity: .035 } });
  pass(forge, 'west', fz, 2.6, 3.2); pass(depot, 'east', fz, 2.6, 3.2);
  const dx = depot.x;
  put('ruin-stone-arch', dx - 5 + .34, DEEP, fz, 90, { material: { ...raw('#454c4a'), textureSlot: 'stone' } });
  for (const [x, z, s, a, seed] of [[dx - 4, fz - .4, 1.2, 30, 5601], [dx - 3.4, fz + 1.4, .9, 160, 5609], [dx - 4.2, fz + 2.2, .7, 260, 5611]])
    put('rock-scree', x, DEEP, z, a, { scale: [s, s * .8, s], rockShape: { ...rockDefaults('builtin-rock-scree'), seed }, material: raw('#454c4a') });
  put('mountain-cart-wreck', dx + 1, DEEP, fz - 2.6, -60); put('rock-scree', dx + 2.4, DEEP, fz + 2.8, 10, { scale: [.7, .6, .7], rockShape: { ...rockDefaults('builtin-rock-scree'), seed: 5701 }, ...ore });
  put('old-closed-crate', dx + 3.4, DEEP, fz - 3.8, 20, { material: oldIn }); off(put('kerosene-lantern', dx - 1.6, DEEP, fz + 3.4, 0, { rotation: turn(50, 85) }));
  lantern(dx - 1, DEEP, fz - 3.6, { intensity: 6, distance: 7, flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .5, frequency: 1.6, seed: 47 } });

  // 9k. Behind the vault door, the sealed room: a burst stasis pod on a rune circle, and the drawing of the descent.
  const sealed = room({ name: 'Sala isolada', x: fx, y: DEEP, z: fz - 9 - 2 * T - 4, w: 8, l: 8, h: 4.5, wall: raw('#30373a'), ground: pavers('#4b5051'), ceiling: '#1d2224', zone: { color: '#4f7884', intensity: .12, fogColor: '#10222a', fogDensity: .045 } });
  pass(forge, 'north', fx, 2.8, 3.3); pass(sealed, 'south', fx, 2.8, 3.3);
  const slx = sealed.x, slz = sealed.z;
  const sigil = put('nordic-floor-sigil', slx, DEEP, slz, 0); const pod = put('nordic-stasis-pod', slx - 2.2, DEEP, slz - 2, 35);
  put('cave-painting-descent', slx - 4 + .06, DEEP + .7, slz + .4, 90); put('chains', slx + 2.6, DEEP + 4.5 - 1.57, slz + 2.2, 0); put('industrial-scattered-papers', slx + 1.8, DEEP, slz + 2.6, 50, { material: { color: '#c4b593' } });
  lit(pod, 'ritual', { color: '#6fd0f0', intensity: 7, distance: 6, position: [0, .6, 0], shadowPolicy: 'off', flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .5, frequency: 2, seed: 23 } });
  lit(sigil, 'ritual', { color: '#7fd8ff', intensity: 4, distance: 4, position: [0, .3, 0], shadowPolicy: 'off' });

  // 9l. The way to the abyss: a corridor east from the sealed room, its only light dying, then a turn north to
  // the stone door of the abyss, Othala lit on its lintel.
  const ABYSS_X = -25.4, RIM = -76.35;
  const hall2 = room({ name: 'Corredor do abismo', x: (slx + 4 + 2 * T + ABYSS_X + 1.4) / 2, y: DEEP, z: slz - .6, w: ABYSS_X + 1.4 - (slx + 4 + 2 * T), l: 2.8, h: 3.5, wall: raw('#30373a'), ground: raw('#454c4a'), ceiling: '#1d2224', zone: { color: '#46666f', intensity: .14, fogColor: '#0d1b21', fogDensity: .04 }, zoneBox: [-34.2, -24, -76.35, -68] });
  pass(sealed, 'east', hall2.z, 2.2, 2.6); pass(hall2, 'west', hall2.z, 2.2, 2.6);
  const turnZ0 = hall2.z - 1.4 - 2 * T, door2 = room({ name: 'Porta do abismo', x: ABYSS_X, y: DEEP, z: (turnZ0 + RIM) / 2, w: 2.8, l: turnZ0 - RIM, h: 3.5, wall: raw('#30373a'), ground: raw('#454c4a'), ceiling: '#1d2224', zone: null });
  pass(hall2, 'north', ABYSS_X, 2.2, 2.6); pass(door2, 'south', ABYSS_X, 2.2, 2.6);
  store.execute('entity.remove', { id: door2.north.id });
  const runeDoor = put('nordic-rune-door', ABYSS_X, DEEP, RIM + 2.05 - .31, 0, { material: { textureSlot: 'stone', ...hewn() } });
  lit(runeDoor, 'ritual', { color: '#7fd8ff', intensity: 8, distance: 7, position: [0, 2.9, 1.2], shadowPolicy: 'off', flicker: { ...illuminationDefaults('ritual').flicker, enabled: true, pattern: 'candle', amplitude: .08, frequency: .5, seed: 53 } });
  lantern(hall2.x - 1.6, DEEP, hall2.z + .9, { intensity: 6, distance: 6, flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .7, frequency: 1.2, seed: 31 } });
  off(put('kerosene-lantern', hall2.x + 2.4, DEEP, hall2.z - .7, 0, { rotation: turn(40, 85) })); rubble(hall2.x + 3.6, DEEP, hall2.z + .6, 30, .5);
  const sx = ABYSS_X, rim = RIM;

  // 9i. The abyss: a shaft 33 m across and 70 m deep, its wall a ring of 24 rock walls; the corridor comes
  // out through one of them onto a ledge, and the spiral stair starts at the ledge and goes down seven turns.
  groupId = folder('07 · Abismo'); surface = null;
  const AR = 17, center = [sx, rim - AR + .6], BOTTOM = DEEP - 60, sides = 24;
  for (let k = 0; k < sides; k++) {
    const a0 = (k - .5) * Math.PI * 2 / sides + Math.PI / 2, a1 = a0 + Math.PI * 2 / sides;
    const [x0, z0, x1, z1] = [center[0] + Math.cos(a0) * AR, center[1] + Math.sin(a0) * AR, center[0] + Math.cos(a1) * AR, center[1] + Math.sin(a1) * AR];
    const length = Math.hypot(x1 - x0, z1 - z0) + .3, yaw = Math.atan2(-(z1 - z0), x1 - x0) * 180 / Math.PI;
    const wall = add(createEntity('wall', { name: 'Parede do abismo', length, height: 4 - BOTTOM, thickness: .9, position: [x0 - Math.cos(yaw * Math.PI / 180) * .15, BOTTOM, z0 + Math.sin(yaw * Math.PI / 180) * .15], rotation: quaternionFromYaw(yaw), groupId, material: raw(k % 3 ? '#343c3e' : '#2f3638', 90 + k) }));
    if (k === 0) add(createEntity('window', { name: 'Saída do corredor', wallId: wall.id, offset: length / 2, width: 2.8, height: 3.3, sill: DEEP - BOTTOM, style: 'open', groupId }));
  }
  const stair = asset('nordic-spiral-stair-turn'), stepTop = stair.bounds[1] - 1.045, LEDGE = DEEP - .2;
  add(createEntity('floor', { name: 'Borda do abismo', width: 3.4, length: 2.4, thickness: .5, position: [sx, DEEP, rim - .9], groupId, material: raw('#3a4143', 91) }));
  const turns = [];
  for (let k = 0; k < 7; k++) turns.push(put('nordic-spiral-stair-turn', center[0], LEDGE - stepTop - 8 * k, center[1], -90, { name: `Escada do abismo · volta ${k + 1}`, material: { textureSlot: 'stone', ...hewn(k < 2 ? '#4e5856' : '#434b4a', 92 + k) } }));
  add(createEntity('floor', { name: 'Fundo do abismo', width: 2 * AR, length: 2 * AR, thickness: 1, position: [center[0], BOTTOM, center[1]], groupId, material: raw('#1d2224', 99), lightingZone: { ...ZONE_DEFAULTS, position: [0, -BOTTOM / 2, 0], size: [2 * AR, -BOTTOM + 4, 2 * AR], blend: 1.5, priority: 30, color: '#4f7480', intensity: .3, fogColor: '#0b1a20', fogDensity: .03, indirect: 0 } }));
  // Lanterns left on the steps, fewer the deeper they go; the last one lies fallen five turns down.
  const onStep = (k, i) => { const a = i * Math.PI * 2 / 40; return [center[0] - Math.sin(a) * 14.3, LEDGE - 8 * k - i * .2, center[1] + Math.cos(a) * 14.3]; };
  for (const [k, i, intensity] of [[0, 2, 10], [0, 9, 14], [0, 20, 12], [0, 32, 11], [1, 12, 9], [1, 30, 7], [2, 22, 5]]) { const [x, y, z] = onStep(k, i); lantern(x, y, z, { intensity, distance: 11 }); }
  // Veins of ice crystals in the wall, between the turns, dimmer the deeper they are.
  for (const [i, [angle, depth, intensity]] of [[40, 11, 6], [160, 19, 5], [280, 27, 4], [70, 36, 3], [200, 45, 2.2], [320, 55, 1.6]].entries()) {
    const a = angle * Math.PI / 180, crystal = put('ice-crystal-cluster', center[0] + Math.cos(a) * 16.2, LEDGE - depth, center[1] + Math.sin(a) * 16.2, 0, { rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.cos(a), .25, -Math.sin(a)).normalize()).toArray(), scale: [1.2, 1.4, 1.2], name: 'Veio de cristais' });
    lit(crystal, 'ritual', { color: '#5fd2ff', intensity, distance: 9, position: [0, .8, 0], shadowPolicy: 'off' });
  }
  // A crack far above lets a column of cold light fall through the middle of the shaft and fade into the dark.
  store.execute('light.add', { light: createLight({ name: 'Fenda sobre o abismo', type: 'spot', position: [center[0], 3.5, center[1]], color: '#9fc8d8', intensity: 1800, distance: 80, angle: .3, penumbra: .8, shadowPolicy: 'off', groupId }) });
  { const [x, y, z] = onStep(4, 30), fallen = put('nordic-rune-lantern', x, y, z, 0, { rotation: turn(60, 88) }); lit(fallen, 'lamp', { color: '#5fc4f0', intensity: 3, distance: 6, position: [0, .2, 0], shadowPolicy: 'off' }); }

  // 9m. Every object whose model glows gets a light of its own (faint for runes and crystals, a real flame for hearths,
  // braziers and candles), so that a switch, of the object or of its room's folder, turns its glow off too
  // (Elementos → lâmpada da pasta, or Luz → Fonte ligada). What once burned starts switched off.
  {
    const glowOf = new Map(), fire = /hearth|brazier|cauldron/, small = /candle|chandelier|kerosene/;
    for (const entity of entities()) {
      if (entity.kind !== 'prop' || !entity.assetRef || entity.illumination || (entity.material?.textureSlot === 'glow' && entity.material.emissiveIntensity === 0)) continue;
      const model = catalog.find(a => a.id === entity.assetRef.id);
      if (!glowOf.has(model.id)) {
        let best = null; for (const m of Object.values(JSON.parse(await readFile(`public${model.url}`, 'utf8')).materials ?? {})) if ((m.emissiveIntensity ?? 0) >= .5 && (!best || m.emissiveIntensity > best.emissiveIntensity)) best = m;
        glowOf.set(model.id, best);
      }
      const glow = glowOf.get(model.id); if (!glow) continue;
      const height = model.bounds[1] * (entity.transform.scale?.[1] ?? 1), name = model.id;
      if (fire.test(name)) lit(entity, 'torch', { color: '#ff9a4a', intensity: 30, distance: 10, position: [0, Math.min(1.3, height * .5), .3], shadowPolicy: 'off' });
      else if (small.test(name)) lit(entity, 'candle', { intensity: name.includes('chandelier') ? 18 : 8, distance: name.includes('chandelier') ? 9 : 5, position: [0, height * .7, 0], shadowPolicy: 'off' });
      else lit(entity, 'lamp', { color: glow.emissive, intensity: 1.5, distance: 3.5, position: [0, Math.min(2, height * .6), 0], shadowPolicy: 'off' });
    }
    for (const key of dark) { const entity = store.document.layout.entities[key]; if (entity.illumination) update(entity, { illumination: { ...entity.illumination, enabled: false } }); }
  }

  // 10. The mountain over the complex: a second terrain, high above every ceiling, that meets the cave at the gate.
  // Hide its folder to see the rooms from above.
  groupId = folder('08 · Montanha (oculte para ver a planta)'); surface = null;
  const MW = 140, ML = 120, mountainCenter = [-4, 0, GATE - ML / 2];
  terrain('Montanha sobre o complexo', MW, ML, mountainCenter, (x, z) => {
    const behind = GATE - z, high = 13.5 + 9 * smooth(0, 45, behind) + 6 * smooth(30, 70, Math.abs(x + 4)) + fbm(x * .07, z * .07, 41) * 5 + fbm(x * .3, z * .3, 43) * .8;
    return mix(Math.max(heightAt(x, GATE), 12.8), Math.max(high, 13.5), smooth(0, 6, behind));
  }, { ...caveRock(41, .95), coverage: { ...snow(.95, 0, 41), slopeAngle: 36, slopeFade: 12 } });

  // 11. Atmosphere: a cold night without sky, teal fill, fog lit by the lights and slow snow drifting into the hall.
  store.execute('environment.apply', { presetId: 'ritual' });
  store.execute('environment.key.update', { patch: { intensity: .08, color: '#8fb6c8' } });
  {
    const look = store.document.look ?? store.document.defaultLook;
    store.execute('look.update', { patch: {
      background: '#04070a',
      fill: { skyColor: '#5f93a2', groundColor: '#1b2a2e', intensity: .5 },
      daylight: { ...look.daylight, phase: 'night', exposure: 1.2 },
      sky: { ...look.sky, enabled: false },
      weather: { ...structuredClone(WEATHER_DEFAULTS), type: 'snow', count: 1500, center: [0, 0, 9], size: [16, 12, 38], color: '#dcecf2', opacity: .75, particleSize: .035, speed: .9, wind: [.35, -.25], seed: 29 },
      bloom: { ...BLOOM_DEFAULTS, enabled: true, strength: .22, radius: .45, threshold: 1.15 },
      volumetricFog: { ...VOLUME_DEFAULTS, enabled: true, density: .022, color: '#25444e', height: H },
      rendering: { ...RENDERING_DEFAULTS, ...look.rendering, ao: true, surfaceReflections: true, surfaceReflectionIntensity: .8, volumetricLights: true, volumeStrength: .35, cutawayShadows: true },
    } });
  }

  // 12. Cameras, in the order of the way in.
  const camera = (name, position, target, fov = 60, extra = {}) => { const entry = { id: id(), name, projection: 'perspective', position, target, fov, orthographicHeight: 18, ...extra }; store.execute('camera.save', { camera: entry }); return entry; };
  const cameras = {
    ravine: camera('Ravina de entrada', [1.6, 4.4, 30], [0, 3.6, 8], 58),
    // The reference: from the near end of the hall, between the piers, the portcullis and the glow behind it.
    eye: camera('Salão · olhos', [0, 1.9, 9.5], [0, 3.5, -10], 64),
    bars: camera('Grade levadiça', [-.8, 1.6, -4.6], [0, 2.6, -16], 55),
    atrium: camera('Átrio rúnico', [-3.4, 2, aFront - 1.2], [1.2, 3.4, aBack + 2], 66),
    balcony: camera('Átrio · do balcão', [-4, 9.6, aBack + .4], [3, 1, aFront - 3], 64),
    machines: camera('Sala de máquinas', [mx + 9.4, 2.6, mz + 9.6], [mx - 2, -2.2, mz - 3], 66),
    pit: camera('Poço das máquinas', [mx + 4.6, -1.3, mz + 3.9], [mx - 3.4, -.6, mz - 3.2], 72),
    archive: camera('Arquivo rúnico', [ax - 7.4, 1.8, aS - 1.6], [ax + 5.4, 3.2, aN + 3], 68),
    quarters: camera('Dormitório dos guerreiros', [qx - 2.6, 1.8, qS - 1.4], [qx - 6, 1, qz - 6], 70),
    library: camera('Biblioteca', [lx - 3.1, 1.7, lS - .9], [lx - 2.6, 2.6, lN + 2], 70),
    libraryGallery: camera('Biblioteca · galeria', [lx + 4.6, 5.9, lN + 1.6], [lx - 3, .8, lS - 3], 70),
    banquet: camera('Salão de banquete', [bW + 1.6, 2.1, bS - 1.6], [bE - 1, 1.2, bN + 4], 70),
    kitchen: camera('Cozinha', [kx - 2.4, 1.7, kz + 4], [kx + 2.4, .8, kz - 4], 70),
    wing: camera('Ala dos quartos', [cx_, 1.7, wS - .8], [cx_, 1.3, wS - 24], 60),
    priest: camera('Quarto do sacerdote', [priests[1].x - 3, 1.7, priests[1].z + 2.4], [priests[1].x + 3, .6, priests[1].z - 2], 72),
    jarl: camera('Câmara do jarl', [jx - 4.2, 1.8, jz + .4], [jx + 4, 1, jz - 2.4], 72),
    guards: camera('Corredor dos guardiões', [-8, 1.7, guards.z + 6.6], [-8, 2.6, guards.z - 8], 60),
    gallery: camera('Galeria rupestre', [-6.4, 1.8, -50.8], [7, 2, -64], 68),
    crevice: camera('Fenda dos cristais', [-7.6, 1.7, -62.6], [-15.4, 1.1, -66.4], 64),
    ancestors: camera('Salão dos ancestrais', [anx - 3.5, DEEP + 1.9, anz + 5.6], [anx + 5, DEEP + 3.2, -52.6], 72),
    service: camera('Escada de serviço', [service.x, 1.7, service.z + 4.4], [service.x, DEEP + .4, service.z - 4.4], 66),
    forge: camera('Forja profunda', [fx + 7.8, DEEP + 2, fz + 7.6], [fx - 5, DEEP + 1, fz - 4], 68),
    depot: camera('Depósito de minério', [dx + 4, DEEP + 1.7, fz + 4], [dx - 4.6, DEEP + 1, fz - .6], 64),
    sealed: camera('Sala isolada', [slx + 3.2, DEEP + 1.7, slz + 3.2], [slx - 2.6, DEEP + 1.1, slz - 1.8], 64),
    hall2: camera('Corredor do abismo', [hall2.x - 4.4, DEEP + 1.6, hall2.z + .4], [hall2.x + 6, DEEP + 1.3, hall2.z - .2], 62),
    door: camera('Porta do abismo', [sx + .4, DEEP + 1.6, turnZ0 - .4], [sx, DEEP + 1.8, rim], 66),
    rim: camera('Borda do abismo', [sx + .6, DEEP + 1.7, rim - 1.4], [center[0] + 5, LEDGE - 15, center[1] - 6], 76),
    spiral: camera('Abismo · meio da descida', [center[0] - 14.3, LEDGE - 16.3, center[1] + .6], [center[0] + 10, LEDGE - 30, center[1] - 4], 74),
    overview: camera('Visão geral', [24, 30, 26], [0, 0, -2], 40),
    top: camera('Planta superior', [3, 100, -50.0001], [3, 0, -50], 40, { projection: 'orthographic', orthographicHeight: 110 }),
  };
  return { store, document: store.document, cameras, gate, rooms: { atrium, machines, archive, quarters, library, banquet: hall3, kitchen, wing, priests, jarl, store: store_, guards, ancestors, service, forge, depot, sealed, hall2, door: door2 }, abyss: { center, turns, BOTTOM }, W, L, H };
}
