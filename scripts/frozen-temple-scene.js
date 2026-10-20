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

  // 9. The rooms behind the gate. Each is Construir → Sala with walls of 40 cm and no door; the passages are
  // openings (Janela → Vão) cut in both walls where two rooms touch, and each room gets a stone ceiling,
  // its own light zone (Piso → Zona de ambiente) and its things.
  const room = ({ name, x, y = 0, z, w, l, h, wall, ground: groundMaterial, ceiling = '#3a4546', zone }) => {
    const proposal = proposeRoom({ width: w, length: l, height: h, center: [x, y, z], thickness: T, lighting: false, door: false, name }, store.editVersion);
    store.execute('proposal.accept', { proposal });
    const made = Object.fromEntries(proposal.entities.map(e => [e.kind === 'floor' ? 'floor' : { 'Parede norte': 'north', 'Parede sul': 'south', 'Parede oeste': 'west', 'Parede leste': 'east' }[e.name], store.document.layout.entities[e.id]]));
    for (const side of ['north', 'south', 'west', 'east']) update(made[side], { material: wall });
    update(made.floor, { material: groundMaterial, lightingZone: { ...ZONE_DEFAULTS, position: [0, h / 2, 0], size: [w, h, l], blend: .8, priority: 20, indirect: .6, ...zone } });
    groupId = proposal.groups[0].id; surface = made.floor.id; surfaceY = y;
    // Ceiling slabs of about 6 m, stretched to cover the room exactly.
    const nx = Math.ceil((w + 2 * T) / 6), nz = Math.ceil((l + 2 * T) / 6), sx = (w + 2 * T) / nx, sz = (l + 2 * T) / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) put('industrial-ceiling-slab', x - (w + 2 * T) / 2 + sx * (i + .5), y + h, z - (l + 2 * T) / 2 + sz * (j + .5), 0, { name: `Teto · ${name}`, scale: [sx / 4.2, 1.8, sz / 4.2], surfaceId: null, material: { ...raw(ceiling, 60 + i * 7 + j), textureSlot: 'concrete' } });
    return { ...made, x, y, z, w, l, h };
  };
  /** A passage through a wall of a room: `at` is the world X (north and south walls) or Z (west and east walls) of its middle. */
  const pass = (r, side, at, width, height, sill = 0) => {
    const wall = r[side], offset = side === 'north' || side === 'south' ? at - (r.x - r.w / 2 - T) : (r.z + r.l / 2) - at;
    return add(createEntity('window', { name: 'Vão de passagem', wallId: wall.id, offset, width, height, sill, style: 'open', groupId: wall.groupId }));
  };
  const lantern = (x, y, z, patch = {}) => { const l = put('nordic-rune-lantern', x, y, z, 0); lit(l, 'lamp', { color: '#7fd8ff', intensity: 14, distance: 9, position: [0, 1.9, 0], shadowPolicy: 'off', ...patch }); return l; };
  const kerosene = (x, y, z, patch = {}) => { const l = put('kerosene-lantern', x, y, z, 0); lit(l, 'lamp', { color: '#ffb066', intensity: 12, distance: 7, position: [0, .2, 0], shadowPolicy: 'off', flicker: { ...illuminationDefaults('candle').flicker, enabled: true, amplitude: .1, seed: Math.abs(Math.round(x * 3 + z)) }, ...patch }); return l; };
  const rubble = (x, y, z, a, s = 1) => put('industrial-rubble-concrete', x, y, z, a, { scale: [s, s, s], material: { color: '#9aa3a0' } });
  const rune = (name, x, y, z, a, extra = {}) => put(name, x, y, z, a, { material: { textureSlot: 'stone', ...hewn('#56625f', 80) }, ...extra });

  // 9a. The rune atrium, 18 × 14 m right behind the gate: the ring, its crystals and the machines that fed it.
  const atrium = room({ name: 'Átrio rúnico', x: 0, z: GATE - .55 - 7, w: 18, l: 14, h: H, wall: hewn('#56635f', 81), ground: pavers('#5f6c6b', .3, 22), zone: { color: '#6d9fae', intensity: .32, fogColor: '#20414b', fogDensity: .02 } });
  // Its front wall gives way to the gate: a stretch of wall on each side of it.
  store.execute('entity.remove', { id: atrium.south.id });
  for (const x of [-9 - T, 4]) add(createEntity('wall', { name: 'Parede do átrio junto ao portão', length: 5 + T, height: H, thickness: T, position: [x, 0, atrium.z + atrium.l / 2 + T / 2], surfaceId: atrium.floor.id, groupId, material: hewn('#56635f', 82) }));
  const ring = put('temple-rune-ring', 0, 0, atrium.z - 4.3, 0, { material: { ...hewn('#56656a', 71), textureSlot: 'stone' } });
  add(createEntity('water', { name: 'Lago congelado', position: [0, .01, atrium.z - 1.6], vertices: [[-3.2, -1.1], [-1.1, -1.7], [2, -1.5], [3.3, -.4], [2.2, 1.3], [-.6, 1.7], [-2.8, 1]], depth: .06, groupId, material: { ...surfacePatch('ice'), color: '#a9d3df' }, water: { state: 'ice', waveHeight: 0, opacity: .88 } }));
  const crystals = [[-6.6, atrium.z - 5.4, 20, 1], [6.8, atrium.z - 4.8, 140, 1], [-7.4, atrium.z + 4.6, 310, .7], [6.2, atrium.z + 5, 200, .7]].map(([x, z, a, s]) => put('ice-crystal-cluster', x, 0, z, a, { scale: [s, s * 1.15, s] }));
  const conduits = [-1, 1].map(s => put('nordic-conduit-pillar', s * 3.7, 0, atrium.z - 5.4, 0, { scale: [1, 1.4, 1] }));
  for (const s of [-1, 1]) put('temple-square-pier', s * 5.6, 0, atrium.z + 3.3, 0, { material: { ...hewn('#5d6a68', 83 + s), textureSlot: 'stone' } });
  put('nordic-rune-console', -2.6, 0, atrium.z + .2, 15); put('nordic-rune-console', 2.7, 0, atrium.z + .4, -20, { material: { textureSlot: 'glow', emissiveIntensity: .3 } });
  rune('nordic-runestone', -8.2, 0, atrium.z - 1, 90); rune('nordic-runestone', 8.2, 0, atrium.z + 1.5, -90, { material: { textureSlot: 'glow', emissiveIntensity: .25 } });
  put('ruined-column', -3.8, 0, atrium.z + 4.8, 30, { material: { color: '#8f9895' } }); rubble(-4.6, 0, atrium.z + 3.6, 50); rubble(4.2, 0, atrium.z - 1.6, 120, .8); rubble(1.2, 0, atrium.z + 5.6, 200, .6);
  put('old-closed-crate', 7.4, 0, atrium.z + 6, 25, { material: old }); put('old-open-crate', 6.2, 0, atrium.z + 6.2, -15, { material: old });
  drift(-1.5, -.05, atrium.z + 6.4, 1.1, 40, 861); drift(2.2, -.05, atrium.z + 6.6, .8, 120, 863);
  for (const x of [-6, 5.5]) put('ice-icicles', x, H - 1.3, atrium.z - atrium.l / 2 + .3, 0, { scale: [1, .8, 1] });
  lit(ring, 'ritual', { color: '#7fd8ff', intensity: 90, distance: 26, position: [0, 2.4, 2.2], shadowPolicy: 'auto', flicker: { ...illuminationDefaults('ritual').flicker, enabled: true, pattern: 'candle', amplitude: .06, frequency: .6, seed: 5 } });
  for (const [i, crystal] of crystals.entries()) lit(crystal, 'ritual', { color: '#5fd2ff', intensity: i < 2 ? 4 : 2.5, distance: 4.5, position: [0, .7, 0], shadowPolicy: 'off' });
  for (const conduit of conduits) lit(conduit, 'lamp', { color: '#7fd8ff', intensity: 10, distance: 7, position: [0, 2.6, 0], shadowPolicy: 'off' });

  // 9b. West of the atrium, the machine room: walls of gears, conduits, pipes and the chains that held something.
  const machines = room({ name: 'Sala de máquinas', x: -9 - 2 * T - 7, z: atrium.z, w: 14, l: 14, h: 7, wall: hewn('#4f5b58', 84), ground: pavers('#555f5e', .15, 23), zone: { color: '#5d8794', intensity: .38, fogColor: '#1b343c', fogDensity: .025 } });
  pass(atrium, 'west', atrium.z, 3, 4); pass(machines, 'east', atrium.z, 3, 4);
  const mx = machines.x, mz = machines.z;
  put('nordic-gear-wall', mx - 7 + .26, 0, mz + 1.5, 90); put('nordic-gear-wall', mx - 2, 0, mz - 7 + .26, 0, { material: { textureSlot: 'glow', emissiveIntensity: .4 } });
  const machineConduits = [put('nordic-conduit-pillar', mx - 4.6, 0, mz - 4.5, 0), put('nordic-conduit-pillar', mx + 4.4, 0, mz - 4.6, 0, { material: { textureSlot: 'glow', emissiveIntensity: 0 } })];
  put('nordic-rune-console', mx - 3.6, 0, mz + 1.2, 75); put('nordic-rune-console', mx + 1.5, 0, mz - 3.6, -10, { material: { textureSlot: 'glow', emissiveIntensity: .15 } });
  const bronzePipe = { material: { color: '#c49a5a', roughness: .45, metalness: .5 } };
  for (const z of [mz + 5, mz + 1, mz - 3]) put('industrial-pipe-long', mx - 7 + .2, 5.2, z, 90, bronzePipe);
  for (const x of [mx - 4.5, mx - .5, mx + 3.5]) put('industrial-pipe-long', x, 4.4, mz - 7 + .2, 0, bronzePipe);
  for (const [x, z] of [[mx - 6.75, mz - 4], [mx - 6.75, mz + 4.5]]) put('industrial-pipe-riser', x, 0, z, 90, { scale: [1, 7 / 3, 1], ...bronzePipe });
  for (const [x, z] of [[mx + 1, mz + 1.5], [mx + 1.4, mz + 2.1], [mx + .7, mz + 2.4]]) put('chains', x, 7 - 1.57, z, x * 40);
  put('medieval-anvil', mx + 3, 0, mz + 3.2, 30); put('medieval-weapon-rack', mx + 6.6, 0, mz + 2, -90); rubble(mx + 2, 0, mz - 1, 70); rubble(mx - 1.5, 0, mz + 4.5, 160, .7);
  put('industrial-scattered-papers', mx - 1, 0, mz + 2.4, 30, { material: { color: '#b9ab8a' } }); put('crate', mx + 5.8, 0, mz - 5.6, 20, { material: old });
  lit(machineConduits[0], 'lamp', { color: '#7fd8ff', intensity: 9, distance: 7, position: [0, 2.2, 0], shadowPolicy: 'off' });
  lantern(mx - 5.6, 0, mz - 5.6, { intensity: 10, flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .35, frequency: 3, seed: 7 } });

  // 9c. East of the atrium, the archive of rune tablets, and behind it the quarters.
  const archive = room({ name: 'Arquivo rúnico', x: 9 + 2 * T + 6, z: atrium.z + 2, w: 12, l: 10, h: 6, wall: hewn('#57635f', 85), ground: pavers('#5b6766', .15, 24), zone: { color: '#62909e', intensity: .34, fogColor: '#1d3a42', fogDensity: .025 } });
  pass(atrium, 'east', archive.z + 1, 2.6, 3.6); pass(archive, 'west', archive.z + 1, 2.6, 3.6);
  const ax = archive.x, az = archive.z;
  for (const z of [az + 3.2, az, az - 3.2]) put('nordic-tablet-shelf', ax + 6 - .32, 0, z, -90, { material: { textureSlot: 'stone', ...hewn('#5d6966', 86) } });
  for (const x of [ax - 3.2, ax + .2]) put('nordic-tablet-shelf', x, 0, az - 5 + .32, 0, { material: { textureSlot: 'stone', ...hewn('#5d6966', 87) } });
  const stones = [rune('nordic-runestone', ax - 2.4, 0, az + 1.8, 20), rune('nordic-runestone', ax + 1.6, 0, az - .6, -35, { material: { textureSlot: 'glow', emissiveIntensity: .2 } })];
  put('medieval-trestle-table', ax + 1.8, 0, az + 3, 10, { material: { color: '#8a7f70' } }); put('medieval-bench', ax + 1.8, 0, az + 3.9, 10, { material: { color: '#8a7f70' } });
  put('industrial-scattered-papers', ax - .5, 0, az + 2.6, 70, { material: { color: '#b9ab8a' } }); put('industrial-rubble-tiles', ax - 3.4, 0, az - 2.4, 20, { material: { color: '#8f9895' } });
  put('medieval-candle-stand', ax - 4.8, 0, az - 3.8, 0, { material: { color: '#6d7272' } });
  lit(stones[0], 'ritual', { color: '#7fd8ff', intensity: 6, distance: 5, position: [0, 1.4, .8], shadowPolicy: 'off' });
  lantern(ax + 4.6, 0, az - 3.4, { intensity: 11 });
  kerosene(ax + 1.2, .812, az + 2.9, { intensity: 9, distance: 6 });

  const quarters = room({ name: 'Alojamento', x: archive.x, z: archive.z - archive.l / 2 - 2 * T - 4, w: 12, l: 8, h: 5, wall: hewn('#5a645f', 88), ground: pavers('#5a6362', .1, 25), zone: { color: '#7a8f96', intensity: .22, fogColor: '#1e3239', fogDensity: .02 } });
  pass(archive, 'north', ax + 2.6, 1.8, 2.8); pass(quarters, 'south', ax + 2.6, 1.8, 2.8);
  const qx = quarters.x, qz = quarters.z, fur = { material: { color: '#6a5444' } };
  for (const x of [qx - 4.8, qx - 2.6, qx + 4.8]) put('medieval-bed', x, 0, qz - 4 + 1.1, 0, { material: { color: '#9a8f80' } });
  put('medieval-bed', qx + 2.4, 0, qz - 4 + 1.1, 8, { material: { color: '#9a8f80' } });
  put('medieval-trestle-table', qx - .8, 0, qz + 1.2, 90, { material: { color: '#8a7f70' } }); put('medieval-bench', qx - 1.7, 0, qz + 1.2, 90, { material: { color: '#8a7f70' } });
  put('medieval-stool', qx + .6, 0, qz + 2, 30, { rotation: turn(30, 80) }); put('medieval-chest', qx - 4.6, 0, qz - .9, 0, { material: { color: '#8a8478' } }); put('medieval-chest', qx + 4.7, 0, qz - .9, 10, { material: { color: '#8a8478' } });
  put('rug', qx + .8, 0, qz - .6, 15, fur); put('medieval-armor-stand', qx + 5.4, 0, qz + 3.2, -120); put('medieval-tankards', qx - .8, .812, qz + .6, 40);
  put('old-closed-crate', qx - 5.2, 0, qz + 3.2, 10, { material: old }); put('medieval-sacks', qx - 4, 0, qz + 3.3, 70, { material: { color: '#a7a399' } });
  kerosene(qx - .7, .812, qz + 1.9, { intensity: 10 });
  lantern(qx + 5.3, 0, qz - 3.1, { intensity: 7, distance: 7 });

  // 9d. From the back of the atrium, a corridor to the painted cave.
  const corridor = room({ name: 'Corredor da galeria', x: 6, z: atrium.z - atrium.l / 2 - 2 * T - 4, w: 2.8, l: 8, h: 4, wall: hewn('#535e5b', 89), ground: pavers('#566060', 0, 26), ceiling: '#353f40', zone: { color: '#5b8290', intensity: .18, fogColor: '#18303a', fogDensity: .03 } });
  pass(atrium, 'north', 6, 2.4, 3.4); pass(corridor, 'south', 6, 2.4, 3.4);
  lantern(corridor.x - .9, 0, corridor.z + .5, { intensity: 8, distance: 7 }); rubble(corridor.x + .6, 0, corridor.z - 2.4, 90, .6);

  const gallery = room({ name: 'Galeria rupestre', x: 4, z: corridor.z - corridor.l / 2 - 2 * T - 7, w: 16, l: 14, h: 7, wall: raw('#6b6a61', 31), ground: { ...raw('#5c5d57', 33), relief: .02 }, ceiling: '#34393a', zone: { color: '#a08a76', intensity: .5, fogColor: '#1f2a2c', fogDensity: .008 } });
  pass(corridor, 'north', 6, 2.4, 3.4); pass(gallery, 'south', 6, 2.4, 3.4);
  const gx = gallery.x, gz = gallery.z;
  // The walls of the gallery are dug, not built: boulders along their feet hide the straight lines.
  for (const [x, z, s, a, seed] of [[gx - 7, gz - 5.5, 1, 20, 5101], [gx + 6.8, gz - 5.8, 1.1, 120, 5113], [gx + 7.2, gz + 4.6, .9, 200, 5119], [gx - 7.1, gz + 5.2, .8, 300, 5147], [gx - 2, gz - 6.6, .7, 80, 5153], [gx + 2.6, gz + 6.5, .7, 10, 5167]])
    put('organic-rock', x, -.4, z, a, { scale: [s, s * .9, s], rockShape: { ...rockDefaults('builtin-organic-rock'), seed, detail: 5, irregularity: .9, erosion: .8 }, material: raw('#474d4a', seed) });
  put('cave-painting-hunt', gx + 3, 1, gz - 7 + .1, 0, { scale: [1.3, 1.3, 1] }); put('cave-painting-ring', gx + 8 - .08, .8, gz - 1, -90, { scale: [1.3, 1.3, 1] });
  put('ice-crystal-cluster', gx - 5.6, 0, gz + 5.2, 60, { scale: [.8, .9, .8] });
  put('old-open-crate', gx + 3.6, 0, gz - 3.8, 30, { material: old }); put('medieval-sacks', gx + 4.8, 0, gz - 3.4, -20, { material: { color: '#a7a399' } }); put('medieval-stool', gx + 2.4, 0, gz - 3, 0, { material: { color: '#8a7f70' } });
  put('industrial-scattered-papers', gx + 2, 0, gz - 2, 10, { material: { color: '#c4b593' } }); put('rock-scree', gx - 3.6, -.1, gz - 4.6, 40, { material: raw('#4a4f4b', 77) });
  // The expedition was documenting the paintings: lanterns on crates against the walls, a board of notes and photographs.
  put('old-closed-crate', gx + 1, 0, gz - 5.9, 5, { material: old }); kerosene(gx + 1, .623, gz - 5.9, { intensity: 24, distance: 9 });
  put('old-closed-crate', gx + 6.8, 0, gz + 1.8, 85, { material: old }); kerosene(gx + 6.8, .623, gz + 1.8, { intensity: 20, distance: 8 });
  put('evidence-board', gx + 4.8, 0, gz + 1.2, -125, { material: { color: '#b8ad98' } }); put('medieval-stool', gx + 4, 0, gz + .3, 20, { material: { color: '#8a7f70' } });
  put('medieval-sacks', gx + 5.6, 0, gz + 2.6, 10, { material: { color: '#6f6a58' } });
  lantern(gx - 5.8, 0, gz - 3.6, { intensity: 7, distance: 8 });

  // 9e. The way down: a stairwell from the west side of the gallery to a level 6 m lower.
  const DEEP = -6;
  const well = room({ name: 'Descida', x: gx - 8 - 2 * T - 6.4, y: DEEP, z: gz, w: 12.8, l: 3.2, h: 10, wall: raw('#454c4a', 41), ground: raw('#454c4a', 42), ceiling: '#2c3233', zone: { color: '#56707a', intensity: .3, fogColor: '#152329', fogDensity: .03 } });
  pass(gallery, 'west', gz, 3, 3.5); pass(well, 'east', gz, 3, 3.5, -DEEP);
  add(createEntity('floor', { name: 'Patamar da descida', width: .8, length: 3.2, thickness: .3, position: [gallery.x - 8 - T - .4, 0, gz], groupId, material: raw('#454c4a', 43) }));
  add(createEntity('stairs', { name: 'Escadaria da descida', position: [well.x - .1, DEEP, gz], rotation: quaternionFromYaw(90), width: 3, length: 12.2, height: -DEEP, steps: 30, groupId, material: hewn('#56605d', 44) }));
  lantern(well.x - 5, DEEP, gz + 1.2, { intensity: 10, distance: 9 }); lantern(well.x - 6.6 + 12.2 * .3, DEEP + 6 * .3 - .1, gz - 1.25, { intensity: 6, distance: 6 });

  // 9f. The deep forge, at the foot of the stair: the forge engine, anvils, and the round vault door to the north.
  const forge = room({ name: 'Forja profunda', x: well.x - 6.4 - 2 * T - 7, y: DEEP, z: gz, w: 14, l: 14, h: 8, wall: raw('#433f3b', 51), ground: pavers('#4d4945', 0, 52), ceiling: '#2c2a28', zone: { color: '#8a6450', intensity: .2, fogColor: '#2a1c18', fogDensity: .035 } });
  pass(well, 'west', gz, 3, 3.5); pass(forge, 'east', gz, 3, 3.5);
  const fx = forge.x, fz = forge.z;
  const engine = put('nordic-forge-engine', fx - 1.6, DEEP, fz + .4, 90);
  for (const [x, z, a] of [[fx + 2.6, fz - 1.4, 20], [fx + 2.2, fz + 2.4, -40]]) put('medieval-anvil', x, DEEP, z, a);
  put('medieval-barrel-rack', fx - 6.2, DEEP, fz + 5, 90, { material: { color: '#8a8478' } }); put('medieval-weapon-rack', fx + 6.6, DEEP, fz + 4.4, -90); put('church-hook-rack', fx - 6.6, DEEP + 3.4, fz - 2.4, 90);
  put('medieval-cauldron', fx + 4.4, DEEP, fz - 4.6, 0); rubble(fx + 5, DEEP, fz + 1, 40, .8); rubble(fx - 4, DEEP, fz - 5.4, 110, .7);
  const forgeConduit = put('nordic-conduit-pillar', fx + 5.6, DEEP, fz - 5.6, 0);
  for (const [x, z] of [[fx + 1, fz - 3.6], [fx + .4, fz - 3.2]]) put('chains', x, DEEP + 8 - 1.57, z, 30);
  lit(engine, 'torch', { color: '#ff6a2a', intensity: 34, distance: 13, position: [1.4, 1.3, 0], shadowPolicy: 'auto', flicker: { ...illuminationDefaults('torch').flicker, enabled: true, amplitude: .22, frequency: 1.4, seed: 17 } });
  lit(forgeConduit, 'lamp', { color: '#7fd8ff', intensity: 8, distance: 7, position: [0, 2.2, 0], shadowPolicy: 'off' });

  // 9g. The sealed room behind the vault door: a burst stasis pod on a rune circle, and the drawing of the descent.
  const sealed = room({ name: 'Sala isolada', x: fx, y: DEEP, z: fz - 7 - 2 * T - 4, w: 8, l: 8, h: 4.5, wall: raw('#3c4446', 61), ground: pavers('#474f50', 0, 62), ceiling: '#262c2d', zone: { color: '#4f7884', intensity: .12, fogColor: '#10222a', fogDensity: .045 } });
  pass(forge, 'north', fx, 2.8, 3.3); pass(sealed, 'south', fx, 2.8, 3.3);
  const vault = asset('nordic-vault-door'), vaultShift = vault.bounds[0] / 2 - 2.2;
  put('nordic-vault-door', fx + vaultShift, DEEP, fz - 7 + .3, 0, { material: { textureSlot: 'stone', ...hewn('#4e5654', 63) } });
  const sx = sealed.x, sz = sealed.z;
  const sigil = put('nordic-floor-sigil', sx, DEEP, sz, 0); const pod = put('nordic-stasis-pod', sx - 2.4, DEEP, sz - 2.2, 35);
  put('cave-painting-descent', sx - 4 + .06, DEEP + .7, sz + .4, 90); put('chains', sx + 2.6, DEEP + 4.5 - 1.57, sz + 2.2, 0); put('industrial-scattered-papers', sx + 1.8, DEEP, sz + 2.6, 50, { material: { color: '#c4b593' } });
  lit(pod, 'ritual', { color: '#6fd0f0', intensity: 7, distance: 6, position: [0, .6, 0], shadowPolicy: 'off', flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .5, frequency: 2, seed: 23 } });
  lit(sigil, 'ritual', { color: '#7fd8ff', intensity: 4, distance: 4, position: [0, .3, 0], shadowPolicy: 'off' });

  // 9h. The long corridor north, its only light dying halfway, to the rim of the abyss.
  const hall2 = room({ name: 'Corredor do abismo', x: sx, y: DEEP, z: sz - 4 - 2 * T - 9, w: 2.8, l: 18, h: 3.5, wall: raw('#3a4143', 71), ground: raw('#3e4547', 72), ceiling: '#252a2b', zone: { color: '#46666f', intensity: .14, fogColor: '#0d1b21', fogDensity: .04 } });
  pass(sealed, 'north', sx, 2.2, 2.6); pass(hall2, 'south', sx, 2.2, 2.6);
  store.execute('entity.remove', { id: hall2.north.id });
  lantern(hall2.x + .9, DEEP, hall2.z + 3, { intensity: 6, distance: 6, flicker: { ...illuminationDefaults('fluorescent').flicker, enabled: true, pattern: 'fluorescent', amplitude: .7, frequency: 1.2, seed: 31 } });
  put('kerosene-lantern', hall2.x - .8, DEEP, hall2.z - 6.4, 0, { rotation: turn(40, 85) }); rubble(hall2.x + .7, DEEP, hall2.z - 4, 30, .5);

  // 9i. The abyss: a shaft 33 m across and 70 m deep, its wall a ring of 24 rock walls; the corridor comes
  // out through one of them onto a ledge, and the spiral stair starts at the ledge and goes down seven turns.
  groupId = folder('07 · Abismo'); surface = null;
  const AR = 17, rim = hall2.z - hall2.l / 2, center = [sx, rim - AR + .6], BOTTOM = DEEP - 60, sides = 24;
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

  // 10. The mountain over the complex: a second terrain, high above every ceiling, that meets the cave at the gate.
  // Hide its folder to see the rooms from above.
  groupId = folder('08 · Montanha (oculte para ver a planta)'); surface = null;
  const MW = 92, ML = 120, mountainCenter = [-10, 0, GATE - ML / 2];
  terrain('Montanha sobre o complexo', MW, ML, mountainCenter, (x, z) => {
    const behind = GATE - z, high = 13.5 + 9 * smooth(0, 45, behind) + 6 * smooth(20, 46, Math.abs(x + 10)) + fbm(x * .07, z * .07, 41) * 5 + fbm(x * .3, z * .3, 43) * .8;
    return mix(Math.max(heightAt(x, GATE), H + .5), high, smooth(0, 6, behind));
  }, { ...caveRock(41, .95), coverage: { ...snow(.95, .12, 41), slopeAngle: 36, slopeFade: 12 } });

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
    atrium: camera('Átrio rúnico', [3.8, 1.8, atrium.z + 6.3], [-.6, 2.6, atrium.z - 4.3], 62),
    machines: camera('Sala de máquinas', [machines.x + 6, 1.8, machines.z + 6], [machines.x - 5, 2.2, machines.z - 3], 64),
    archive: camera('Arquivo rúnico', [archive.x + 4.8, 1.7, archive.z + 4.2], [archive.x - 4, 1.4, archive.z - 3], 62),
    quarters: camera('Alojamento', [quarters.x + 5.2, 1.7, quarters.z + 3.4], [quarters.x - 4, 1, quarters.z - 2.6], 64),
    gallery: camera('Galeria rupestre', [gallery.x - 3, 1.8, gallery.z + 5.6], [gallery.x + 4.5, 1.8, gallery.z - 5], 62),
    descent: camera('Descida', [well.x + 5.6, 1.7, gz + .9], [well.x - 6, DEEP + .4, gz - .3], 66),
    forge: camera('Forja profunda', [forge.x + 6, DEEP + 1.8, forge.z + 6], [forge.x - 2.5, DEEP + 1.6, forge.z - 2], 62),
    sealed: camera('Sala isolada', [sealed.x + 3.2, DEEP + 1.7, sealed.z + 3.2], [sealed.x - 2.6, DEEP + 1.1, sealed.z - 1.8], 64),
    hall2: camera('Corredor do abismo', [hall2.x, DEEP + 1.6, hall2.z + 8.5], [hall2.x, DEEP + 1.2, rim - 6], 58),
    rim: camera('Borda do abismo', [sx + .6, DEEP + 1.7, rim - 1.4], [center[0] + 5, LEDGE - 15, center[1] - 6], 76),
    spiral: camera('Abismo · meio da descida', [center[0] - 14.3, LEDGE - 16.3, center[1] + .6], [center[0] + 10, LEDGE - 30, center[1] - 4], 74),
    overview: camera('Visão geral', [24, 30, 26], [0, 0, -2], 40),
    top: camera('Planta superior', [-10, 90, -45.0001], [-10, 0, -45], 40, { projection: 'orthographic', orthographicHeight: 125 }),
  };
  return { store, document: store.document, cameras, gate, rooms: { atrium, machines, archive, quarters, corridor, gallery, well, forge, sealed, hall2 }, abyss: { center, turns, BOTTOM }, W, L, H };
}
