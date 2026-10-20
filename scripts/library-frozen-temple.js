import { b, c, e, r, rb, p, lathe, curve, along, polar, withSurface } from './library-atelier-kit.js';
import { cylinder } from './library-craft-parts.js';

/**
 * Frozen temple kit: the architecture of an old hall carved into a snow cave
 * (stepped square piers with iron rings, an arched gateway with its portcullis,
 * door niches between pilasters, a rune ring) and what the cold and the people
 * who camped there left: icicles, glowing ice crystals, spiked barricades and a
 * floor grate. Authored in metres, front towards +Z, few materials a model.
 * Stone parts carry the masonry texture so they can be retinted or snowed on.
 */
const PI = Math.PI;
const MATERIALS = {
  stone: { color: '#6f7b79', roughness: .93 }, trim: { color: '#5c6866', roughness: .9 }, recess: { color: '#3c4648', roughness: .95 },
  iron: { color: '#2a2e31', roughness: .55, metalness: .55 }, void: { color: '#07090b', roughness: 1 },
  wood: { color: '#5b4b3a', roughness: .9 }, rope: { color: '#8a7756', roughness: 1 },
  ice: { color: '#cfe7ef', roughness: .06, opacity: .8, emissive: '#3f7f95', emissiveIntensity: .18 },
  crystal: { color: '#9fdcef', roughness: .05, opacity: .85, emissive: '#3fb6e6', emissiveIntensity: .55 },
  glow: { color: '#d8f6ff', emissive: '#6fdcff', emissiveIntensity: 2.2 }, veil: { color: '#7fd0ee', opacity: .12, emissive: '#3fa8e0', emissiveIntensity: .35, roughness: .2 },
  rock: { color: '#4d585a', roughness: .95 },
};
const STONE = { texture: 'stone', textureSize: 1.6, textureColor: '#6f7b79', textureColorMode: 'replace', relief: .05 };
const TRIM = { texture: 'stone', textureSize: 2.4, textureColor: '#5c6866', textureColorMode: 'replace', relief: .03 };
const RECESS = { texture: 'rock', textureSize: 2.2, textureColor: '#3c4648', textureColorMode: 'replace', relief: .04 };
const WOOD = { texture: 'wood', textureSize: 1.2, textureColor: '#5b4b3a', textureColorMode: 'replace', woodPattern: 'grain', relief: .02 };
const stone = parts => withSurface(parts, STONE), trim = parts => withSurface(parts, TRIM), wood = parts => withSurface(parts, WOOD);
/** A tiny deterministic random, so every regeneration draws the same icicles and crystals. */
const random = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
/** A wall with a round arch cut from its foot: `w` wide, springing at `spring`, as one extruded contour. */
const archWall = (W, H, w, spring, depth, z, material, steps = 16) => p([
  [-W / 2, 0], [-w / 2, 0], [-w / 2, spring],
  ...along(steps + 1, PI, 0).slice(1, -1).map(a => [Math.cos(a) * w / 2, spring + Math.sin(a) * w / 2]),
  [w / 2, spring], [w / 2, 0], [W / 2, 0], [W / 2, H], [-W / 2, H],
], depth, [0, 0, z], material);
/** The pyramid of a panel, pointing out of the face whose outward axis is `out`. */
const PYRAMID = { '+z': [PI / 2, 0, 0], '-z': [-PI / 2, 0, 0], '+x': [0, 0, -PI / 2], '-x': [0, 0, PI / 2] };
const pyramid = (out, position, radius = .62, height = .16) => ({ ...cylinder(radius, height, position, 'stone', 0, PYRAMID[out]), segments: 4 });

export function addFrozenTempleLibrary({ add, ancient, timeless }) {
  const ids = new Set();
  const model = (id, name, category, era, contexts, tags, parts, description, supportHeight) => { const asset = add(id, name, category, era, contexts, tags, parts, description, supportHeight); asset.materials = MATERIALS; ids.add(asset.id); };
  const TEMPLE = ['Templo', 'Caverna', 'Masmorra', 'Ruína'], tags = ['templo gelado', 'templo', 'pedra', 'inverno'];

  // Architecture ----------------------------------------------------------------------------------
  // 9 m tall: a stepped plinth, a pedestal with a framed pyramid on each face, a cornice and the shaft
  // that reaches the ceiling, with an iron mooring ring on the front and the back.
  const face = (out, y, half) => {
    const axis = out[1] === 'z' ? 'x' : 'z', sign = out[0] === '+' ? 1 : -1, at = (u, v, depth) => axis === 'x' ? [u, v, sign * depth] : [sign * depth, v, u];
    const strip = (u, v, w, h) => b(axis === 'x' ? [w, h, .07] : [.07, h, w], at(u, v, half + .035), 'trim');
    return [strip(0, y + .82, 1.78, .14), strip(0, y - .82, 1.78, .14), strip(-.82, y, .14, 1.5), strip(.82, y, .14, 1.5), pyramid(out, at(0, y, half + .08))];
  };
  const ring = z => { const s = Math.sign(z); return [b([.34, .42, .05], [0, 7.78, z], 'iron'), c(.035, .14, [0, 7.86, z + s * .07], 'iron', 'z'), r(.16, .03, [0, 7.62, z + s * .14], 'iron')]; };
  model('temple-square-pier', 'Templo · pilar quadrado escalonado com argola', 'Arquitetura / Templo gelado', ancient, TEMPLE, [...tags, 'pilar', 'coluna', 'argola'], [
    ...trim([rb([2.9, .28, 2.9], [0, .14, 0], 'trim', .03), rb([2.65, .28, 2.65], [0, .42, 0], 'trim', .03), rb([2.45, .3, 2.45], [0, .71, 0], 'trim', .03)]),
    ...stone([rb([2.2, 2.3, 2.2], [0, 2.01, 0], 'stone', .025)]), ...trim(['+z', '-z', '+x', '-x'].flatMap(out => face(out, 2.01, 1.1))),
    ...trim([rb([2.5, .22, 2.5], [0, 3.27, 0], 'trim', .03), rb([2.3, .2, 2.3], [0, 3.48, 0], 'trim', .03)]),
    ...stone([rb([1.75, 5.12, 1.75], [0, 6.14, 0], 'stone', .02)]), ...trim([rb([2.05, .3, 2.05], [0, 8.85, 0], 'trim', .03)]),
    ...ring(.875), ...ring(-.875),
  ], 'Pilar de cantaria de 9 m: base em degraus, pedestal com almofadas e pirâmides, cornija e fuste até o teto, com argola de ferro na frente e atrás.');

  // A gateway 8 m wide and 9 m tall: a deep faceted recess in front, and in its back the round arch
  // of 4,4 m where the portcullis sits (Templo · grade levadiça, at the back face).
  const voussoirs = along(11, PI, 0).map(a => rb([.5, .34, .2], [Math.cos(a) * 2.42, 3.6 + Math.sin(a) * 2.42, .2], 'trim', .02, [0, 0, a - PI / 2]));
  model('temple-arched-gateway', 'Templo · portal em arco com recesso', 'Arquitetura / Templo gelado', ancient, TEMPLE, [...tags, 'portal', 'arco', 'parede', 'passagem'], [
    ...stone([archWall(8, 9, 6.6, 4.1, .5, .35, 'stone', 6)]), ...withSurface([archWall(8, 9, 4.4, 3.6, .7, -.25, 'recess')], RECESS), ...trim(voussoirs),
    ...trim([rb([8.2, .3, 1.32], [0, 8.85, 0], 'trim', .03), ...[-1, 1].map(s => rb([.5, .3, .9], [s * 2.45, .15, .3], 'trim', .03))]),
  ], 'Parede de cantaria com um recesso facetado e, ao fundo, o arco redondo de 4,4 × 5,8 m onde se encaixa a grade levadiça.');

  // Square bars clipped to the arch: verticals in front, crossbars behind, and a spike at each foot.
  const span = 2.2, spring = 3.6, top = x => spring + Math.sqrt(Math.max(0, span * span - x * x)), half = y => y <= spring ? span : Math.sqrt(Math.max(0, span * span - (y - spring) ** 2));
  const verticals = along(11, -2, 2).flatMap(x => { const h = top(x) - .12; return [b([.09, h - .1, .09], [x, .1 + (h - .1) / 2, .05], 'iron'), { ...cylinder(.065, .12, [x, .06, .05], 'iron', 0, [PI, 0, 0]), segments: 4 }]; });
  const crossbars = along(12, .5, 5.45).filter(y => half(y) > .4).map(y => b([half(y) * 2 - .16, .08, .08], [0, y, -.04], 'iron'));
  model('temple-portcullis', 'Templo · grade levadiça em arco', 'Arquitetura / Templo gelado', ancient, TEMPLE, [...tags, 'grade', 'portão', 'ferro', 'levadiça'], [
    ...verticals, ...crossbars, curve(along(15, PI, 0).map(a => [Math.cos(a) * (span - .04), spring + Math.sin(a) * (span - .04), 0]), .055, 'iron'),
    ...[-1, 1].map(s => b([.12, spring, .16], [s * (span - .04), spring / 2, 0], 'iron')),
  ], 'Grade de barras quadradas com topo em arco de 4,4 × 5,8 m e pontas no pé. Encaixa no portal em arco do templo.');

  // A doorway between pilasters, with steps, a lintel and the dark of the passage behind.
  model('temple-wall-niche', 'Templo · nicho de porta com pilastras', 'Arquitetura / Templo gelado', ancient, TEMPLE, [...tags, 'nicho', 'porta', 'pilastra', 'parede'], [
    b([2.1, 3.9, .04], [0, 2.05, -.2], 'void'), ...stone([...[-1, 1].flatMap(s => [rb([.5, 4.7, .62], [s * 1.32, 2.35, 0], 'stone', .02), rb([.16, 3.9, .4], [s * 1.0, 2.05, -.05], 'stone', .015)])]),
    ...trim([rb([3.3, .42, .74], [0, 4.91, .04], 'trim', .03), rb([3.5, .18, .84], [0, 5.21, .06], 'trim', .03), rb([2.2, .16, .4], [0, 4.02, -.05], 'trim', .02),
      rb([3.2, .2, 1.1], [0, .1, .38], 'trim', .02), rb([2.4, .18, .6], [0, .29, .2], 'trim', .02)]),
  ], 'Vão de passagem de 2,1 × 3,9 m entre pilastras, com verga, cornija e dois degraus. Encoste à parede; o fundo é escuro.');

  // A ring of stone blocks on a stepped base, with a dashed ring of light and a faint veil inside.
  const R = 1.7, cy = 2.3;
  model('temple-rune-ring', 'Templo · anel rúnico de pedra', 'Arquitetura / Templo gelado', ancient, [...TEMPLE, 'Ritual'], [...tags, 'portal', 'runa', 'ritual', 'anomalia'], [
    ...trim([rb([4.2, .25, 1.7], [0, .125, 0], 'trim', .03), rb([3.5, .25, 1.3], [0, .375, 0], 'trim', .03)]),
    ...stone(along(20, 0, PI * 2 * 19 / 20).map(a => rb([.6, .42, .5], [Math.cos(a) * R, cy + Math.sin(a) * R, 0], 'stone', .03, [0, 0, a + PI / 2]))),
    ...[-1, 1].flatMap(z => along(12, 0, PI * 2 * 11 / 12).map(a => b([.24, .1, .03], [Math.cos(a) * R, cy + Math.sin(a) * R, z * .26], 'glow', [0, 0, a + PI / 2]))),
    c(R - .18, .02, [0, cy, 0], 'veil', 'z'),
  ], 'Anel de pedra de 3,8 m sobre base em degraus, com runas acesas nas duas faces e um véu luminoso no vão. Dê luz própria azul.');

  // Rubble and the camp ---------------------------------------------------------------------------
  // A beam on three crossed pairs of sharpened stakes, lashed where they cross.
  const stake = (x, lean) => ({ ...cylinder(.045, 1.6, [x, .55, 0], 'wood', .006, [lean, 0, 0]), segments: 7 });
  model('temple-spike-barricade', 'Barricada de estacas cruzadas', 'Exterior / Barreiras', timeless, ['Acampamento', 'Templo', 'Fortificação', 'Guerra'], ['barricada', 'estacas', 'madeira', 'defesa', 'templo gelado'], [
    ...wood([{ ...cylinder(.075, 2.5, [0, .55, 0], 'wood', .07, [0, 0, PI / 2]), segments: 10 }, ...[-1, 0, 1].flatMap(i => [stake(i * .95, .78), stake(i * .95 + .06, -.78)])]),
    ...[-1, 0, 1].map(i => ({ ...r(.09, .02, [i * .95 + .03, .55, 0], 'rope', [0, PI / 2, 0]), segments: 16 })),
  ], 'Viga sobre três pares de estacas afiadas, amarradas em X. Barreira de acampamento ou de cerco.');

  model('temple-floor-grate', 'Templo · grade de alçapão no piso', 'Arquitetura / Templo gelado', ancient, TEMPLE, [...tags, 'grade', 'alçapão', 'piso', 'ferro'], [
    b([2.3, .01, 1.5], [0, .005, 0], 'void'), ...[-1, 1].flatMap(s => [b([2.5, .07, .1], [0, .035, s * .8], 'iron'), b([.1, .07, 1.7], [s * 1.2, .035, 0], 'iron')]),
    ...along(9, -1, 1).map(x => b([.05, .06, 1.5], [x, .03, 0], 'iron')), ...along(5, -.6, .6).map(z => b([2.3, .045, .05], [0, .03, z], 'iron')),
  ], 'Grade de ferro de 2,5 × 1,7 m sobre um poço escuro. Fica rente ao piso.');

  // Ice ------------------------------------------------------------------------------------------
  // Hangs from its top: place it with its top at the ceiling or the edge it drips from.
  const icicles = (() => {
    const next = random(91), height = 1.5, parts = [e([2.5, .16, .34], [0, height - .04, 0], 'ice')];
    for (let i = 0; i < 18; i++) {
      const x = -1.15 + i * 2.3 / 17 + (next() - .5) * .08, z = (next() - .5) * .2, length = .3 + next() ** 1.6 * 1.15, radius = .03 + length * .05;
      parts.push({ ...cylinder(.004, length, [x, height - .06 - length / 2, z], 'ice', radius), segments: 7 });
    }
    return parts;
  })();
  model('ice-icicles', 'Pingentes de gelo · cortina', 'Exterior / Gelo', timeless, ['Caverna', 'Montanha', 'Templo', 'Inverno'], ['gelo', 'pingentes', 'inverno', 'teto', 'caverna', 'templo gelado'], icicles,
    'Fileira de 2,5 m de pingentes de gelo translúcidos, até 1,5 m. Fica pendurada pelo topo em tetos, cornijas e bordas de rocha.');

  const crystals = (() => {
    const next = random(57), parts = [e([1.2, .3, 1], [0, .1, 0], 'rock'), e([.7, .26, .6], [.35, .1, .3], 'rock')];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4 + next() * .4, d = i ? .12 + next() * .32 : 0, h = (i ? .45 + next() * .7 : 1.35), radius = .05 + h * .07, tilt = i ? .25 + next() * .35 : .05;
      parts.push(lathe([[0, 0], [radius, 0], [radius, h * .78], [0, h]], [Math.cos(a) * d, .12, Math.sin(a) * d * .8], 'crystal', undefined, { segments: 6, rotation: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt] }));
    }
    return parts;
  })();
  model('ice-crystal-cluster', 'Cristais de gelo luminosos', 'Exterior / Gelo', timeless, ['Caverna', 'Templo', 'Ritual', 'Inverno'], ['gelo', 'cristal', 'luz', 'anomalia', 'templo gelado'], crystals,
    'Prismas de gelo azulados brotando de rocha, acesos por dentro. Dê luz própria para iluminar o entorno.');

  return ids;
}
