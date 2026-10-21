import { b, c, e, r, rb, p, lathe, curve, along, polar, chain, withSurface } from './library-atelier-kit.js';
import { cylinder } from './library-craft-parts.js';

/**
 * Nordic depths kit: the machinery an old northern people left inside the mountain (rune consoles,
 * gear walls, conduit pillars, a forge engine, runestones, a round vault door, a stasis pod, rune
 * lanterns), the paintings on the walls of their caves and one turn of the spiral stair that goes down
 * the abyss. Bronze and iron over stone, with cyan light running in carved grooves; the `glow` slot of
 * every model can be dimmed or switched off in the scene (Material → slot glow → emission).
 * Authored in metres, front towards +Z.
 */
const PI = Math.PI, TAU = PI * 2;
const MATERIALS = {
  stone: { color: '#5f6b6a', roughness: .93 }, bronze: { color: '#8c6b3c', roughness: .42, metalness: .6 }, oxide: { color: '#4c5a4c', roughness: .7, metalness: .35 },
  iron: { color: '#2b2f33', roughness: .55, metalness: .55 }, glow: { color: '#d8f6ff', emissive: '#5fd6ff', emissiveIntensity: 2 },
  ember: { color: '#ff9a5a', emissive: '#ff4a12', emissiveIntensity: 2.4 }, crystal: { color: '#9fdcef', roughness: .05, opacity: .85, emissive: '#3fb6e6', emissiveIntensity: .7 },
  frost: { color: '#d4ecf3', roughness: .08, opacity: .4, emissive: '#2f6f86', emissiveIntensity: .15 }, void: { color: '#06080a', roughness: 1 },
  leather: { color: '#4a3526', roughness: .85 }, wood: { color: '#55473a', roughness: .9 },
};
const PAINT = {
  ochre: { color: '#9c4a26', roughness: 1 }, red: { color: '#7a2a1c', roughness: 1 }, charcoal: { color: '#1b1a18', roughness: 1 }, chalk: { color: '#c9bfa6', roughness: 1 },
};
const STONE = { texture: 'stone', textureSize: 1.6, textureColor: '#5f6b6a', textureColorMode: 'replace', relief: .05 };
const ROCK = { texture: 'rock', textureSize: 2.2, textureColor: '#56605f', textureColorMode: 'replace', relief: .05 };
const stone = parts => withSurface(parts, STONE), rocky = parts => withSurface(parts, ROCK);
const random = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
/** A gear of `teeth` on the plane z, with hub, four spokes and a ring of light. */
const gear = (radius, teeth, [x, y, z], phase = 0) => [
  { ...c(radius, .12, [x, y, z], 'bronze', 'z'), segments: 32 }, c(radius * .26, .22, [x, y, z + .03], 'oxide', 'z'),
  ...polar(teeth, radius + .06, (u, v, a) => [rb([.13, .15, .12], [x + u, y + v, z], 'bronze', .015, [0, 0, a])], phase),
  ...[0, PI / 2].map(a => b([radius * 1.7, .1, .05], [x, y, z + .08], 'oxide', [0, 0, a + phase])), { ...r(radius * .62, .022, [x, y, z + .08], 'glow'), segments: 32 },
];
/** A rune: two or three strokes inside a 0.18 m cell, from a seed, as thin boxes. */
const rune = (x, y, z, seed, material = 'glow', size = .18, depth = .015, rotation = 0) => {
  const next = random(seed), strokes = [b([.022, size, depth], [x, y, z], material, rotation ? [0, rotation, 0] : undefined)];
  for (let i = 0; i < 1 + Math.floor(next() * 2); i++) { const up = (next() - .5) * size * .6, lean = (next() > .5 ? 1 : -1) * (.5 + next() * .4); strokes.push(b([.02, size * .55, depth], [x + Math.sin(lean) * size * .22, y + up, z], material, [0, rotation, lean])); }
  return strokes;
};
/** Points in the plane z: [x, y] pairs to a curve. */
const stroke = (points, radius, material, z = 0) => curve(points.map(([x, y]) => [x, y, z]), radius, material);

export function addNordicDepthsLibrary({ add, ancient }) {
  const ids = new Set();
  const model = (id, name, category, contexts, tags, parts, description, materials = MATERIALS) => { const asset = add(id, name, category, ancient, contexts, ['nórdico', 'templo gelado', ...tags], parts, description); asset.materials = materials; ids.add(asset.id); };
  const DEPTHS = ['Templo', 'Caverna', 'Masmorra', 'Ruína', 'Laboratório'];

  // Machinery -------------------------------------------------------------------------------------
  model('nordic-rune-console', 'Nórdico · console rúnico', 'Nórdico / Tecnologia rúnica', DEPTHS, ['console', 'runa', 'tecnologia', 'painel'], [
    ...stone([rb([1.05, .16, .85], [0, .08, 0], 'stone', .03), rb([.62, .82, .5], [0, .57, 0], 'stone', .02)]),
    ...[.3, .78].map(y => rb([.68, .06, .56], [0, y, 0], 'bronze', .01)),
    rb([1.06, .1, .7], [0, 1.02, .04], 'bronze', .02, [.45, 0, 0]), b([.78, .02, .46], [0, 1.072, .065], 'glow', [.45, 0, 0]),
    ...along(5, -.3, .3).flatMap((x, i) => [b([.022, .012, .18], [x, 1.083, .07], 'iron', [.45, 0, 0]), b([.02, .012, .1], [x + .03, 1.083, .05], 'iron', [.45, i % 2 ? .6 : -.6, 0])]),
    c(.022, .42, [.5, 1.05, -.1], 'iron'), lathe([[0, 0], [.045, .01], [.05, .05], [0, .08]], [.5, 1.26, -.1], 'bronze'),
  ], 'Pedestal de pedra com painel de bronze inclinado e runas acesas sob o vidro, e uma alavanca ao lado.');

  model('nordic-gear-wall', 'Nórdico · mecanismo de engrenagens de parede', 'Nórdico / Tecnologia rúnica', DEPTHS, ['engrenagem', 'mecanismo', 'máquina', 'parede'], [
    ...stone([rb([3.3, 3.1, .22], [0, 1.55, -.14], 'stone', .03)]), ...[-1, 1].map(s => rb([.16, 3.1, .16], [s * 1.6, 1.55, -.02], 'bronze', .02)), rb([3.3, .16, .16], [0, 3.05, -.02], 'bronze', .02),
    ...gear(1, 18, [-.55, 1.75, .05]), ...gear(.6, 12, [.95, 2.25, .1], .2), ...gear(.4, 9, [.72, .78, .1], .1),
    curve([[1.4, 2.6, 0], [1.45, 2.95, .05], [1.2, 3.1, .1]], .05, 'oxide'), curve([[-1.5, .3, 0], [-1.4, .9, .05], [-1.55, 1.2, .05]], .05, 'oxide'),
  ], 'Três engrenagens de bronze com aros de luz sobre placa de pedra, 3,3 × 3,1 m. Encoste a uma parede.');

  model('nordic-conduit-pillar', 'Nórdico · coluna condutora rúnica', 'Nórdico / Tecnologia rúnica', DEPTHS, ['coluna', 'energia', 'cristal', 'luz'], [
    ...stone([rb([1, .4, 1], [0, .2, 0], 'stone', .03), rb([.9, .35, .9], [0, 3.95, 0], 'stone', .03)]),
    { ...c(.16, 3.4, [0, 2.1, 0], 'crystal'), segments: 6 }, ...polar(4, .3, (x, z, a) => [rb([.1, 3.4, .1], [x, 2.1, z], 'iron', .01, [0, -a, 0])], PI / 4),
    ...[.65, 1.6, 2.6, 3.55].flatMap(y => [{ ...lathe([[.26, -.07], [.36, -.06], [.38, 0], [.36, .06], [.26, .07]], [0, y, 0], 'bronze'), segments: 16 }, ...polar(4, .38, (x, z, a) => rune(x, y, z, Math.round(y * 10), 'glow', .1, .012, -a + PI / 2), PI / 4)]),
  ], 'Coluna de 4,1 m com núcleo de cristal aceso entre barras de ferro e anéis de bronze com runas.');

  const engine = [
    ...stone([rb([3, .6, 3], [0, .3, 0], 'stone', .04)]), { ...c(1.1, 2.3, [0, 1.75, 0], 'bronze'), segments: 32 },
    ...[.75, 1.75, 2.75].map(y => ({ ...r(1.12, .05, [0, y, 0], 'oxide', [PI / 2, 0, 0]), segments: 32 })),
    { ...lathe([[0, 0], [1.15, 0], [1.1, .15], [.5, .55], [.38, .62], [0, .62]], [0, 2.9, 0], 'oxide'), segments: 32 },
    { ...c(.32, 2.6, [0, 4.6, 0], 'iron'), segments: 16 }, { ...c(.42, .22, [0, 5.85, 0], 'iron'), segments: 16 },
    // The mouth of the furnace, embers behind a grille.
    b([.9, .7, .12], [0, 1.35, 1.06], 'ember'), ...along(5, -.36, .36).map(x => b([.05, .78, .05], [x, 1.35, 1.14], 'iron')), rb([1.1, .14, .3], [0, .95, 1.08], 'oxide', .02),
    ...polar(8, 1.14, (x, z, a) => rune(x, 2.25, z, 40 + Math.round(a * 10), 'glow', .16, .012, -a + PI / 2), PI / 8),
    // Bellows and pipes to the side.
    e([.7, .45, .9], [1.65, .95, .1], 'leather'), rb([.75, .06, .95], [1.65, 1.2, .1], 'wood', .01), curve([[1.3, 1.1, .1], [1.15, 1.4, .2], [.98, 1.6, .3]], .06, 'bronze'),
    curve([[-1, 2.4, .3], [-1.5, 2.9, .4], [-1.6, 3.8, .2], [-1.2, 4.6, 0]], .09, 'oxide'),
  ];
  model('nordic-forge-engine', 'Nórdico · forja rúnica', 'Nórdico / Tecnologia rúnica', DEPTHS, ['forja', 'fornalha', 'máquina', 'fogo'], engine,
    'Fornalha de bronze sobre base de pedra, com boca de brasas atrás de grade, runas, fole e chaminé. Dê luz própria quente na boca.');

  // Stones and doors ------------------------------------------------------------------------------
  const top = along(9, PI, 0).map(a => [Math.cos(a) * .62, 1.85 + Math.sin(a) * .55]);
  model('nordic-runestone', 'Nórdico · pedra rúnica com sulcos acesos', 'Nórdico / Pedras rúnicas', DEPTHS, ['pedra rúnica', 'runa', 'monumento', 'luz'], [
    ...rocky([p([[-.6, 0], [.6, 0], [.64, 1.85], ...top.slice(1, -1).reverse(), [-.64, 1.85]], .36, [0, 0, 0], 'stone')]), ...rocky([rb([1.5, .2, .7], [0, .1, 0], 'stone', .04)]),
    stroke([[-.45, .35], [-.5, 1.2], [-.42, 1.9], [-.2, 2.25], [.15, 2.3], [.4, 2.05], [.48, 1.4], [.44, .55], [.2, .3], [-.05, .45]], .022, 'glow', .185),
    ...along(5, .7, 1.95).flatMap((y, i) => rune(0, y, .19, 70 + i, 'glow', .2, .012)),
  ], 'Laje de pedra de 2,4 m com a serpente e uma coluna de runas gravadas, acesas por dentro.');

  // The frame of a round vault door, its opening reaching the floor through a threshold notch, and the door rolled aside.
  const cy = 1.9, R = 1.5, from = Math.atan2(.525 - cy, -.6) + TAU, to = Math.atan2(.525 - cy, .6);
  const opening = along(26, from, to).map(a => [Math.cos(a) * R, cy + Math.sin(a) * R]);
  model('nordic-vault-door', 'Nórdico · porta-cofre circular aberta', 'Nórdico / Portas', DEPTHS, ['porta', 'cofre', 'selada', 'runa'], [
    ...stone([p([[-2.2, 0], [-.6, 0], ...opening, [.6, 0], [2.2, 0], [2.2, 4], [-2.2, 4]], .6, [0, 0, 0], 'stone')]),
    ...polar(16, R + .22, (x, y, a) => [b([.24, .1, .04], [x, cy + y, .32], a > PI * 1.25 && a < PI * 1.75 ? 'iron' : 'glow', [0, 0, a + PI / 2])]),
    // The door, rolled aside on its track in front of the frame.
    { ...c(1.45, .32, [2.65, 1.5, .55], 'bronze', 'z'), segments: 40 }, { ...r(1.2, .05, [2.65, 1.5, .72], 'oxide'), segments: 40 },
    ...polar(6, .0001, (u, v, a) => [b([2.5, .12, .06], [2.65, 1.5, .74], 'iron', [0, 0, a])]), c(.3, .2, [2.65, 1.5, .8], 'oxide', 'z'),
    ...polar(12, 1.05, (x, y, a) => rune(2.65 + x, 1.5 + y, .73, 90 + Math.round(a * 10), 'iron', .14, .01, 0)),
    b([4.2, .1, .2], [1.4, .05, .55], 'iron'),
  ], 'Moldura de pedra 4,4 × 4 m com vão redondo de 3 m e a porta de bronze rolada para o lado no trilho. Coloque sobre um vão de passagem.');

  // An upright pod with frosted panes, two of them burst outward, and the broken chains of whatever was kept inside.
  const pane = (x, z, a, i) => i === 1 || i === 2 ? [] : [rb([.6, 1.9, .03], [Math.cos(a) * .55, 1.35, Math.sin(a) * .55], 'frost', .01, [0, -a + PI / 2, 0])];
  model('nordic-stasis-pod', 'Nórdico · cápsula de estase rompida', 'Nórdico / Tecnologia rúnica', DEPTHS, ['cápsula', 'estase', 'contenção', 'medo'], [
    ...stone([{ ...lathe([[0, 0], [.95, 0], [.95, .2], [.8, .32], [0, .32]], [0, 0, 0], 'stone'), segments: 6 }]), { ...r(.7, .025, [0, .33, 0], 'glow', [PI / 2, 0, 0]), segments: 24 },
    ...polar(6, .64, (x, z) => [b([.08, 2.1, .08], [x, 1.37, z], 'iron')], PI / 6), ...polar(6, .55, pane, 0),
    { ...lathe([[0, 0], [.85, 0], [.8, .18], [.4, .4], [0, .45]], [0, 2.4, 0], 'bronze'), segments: 6 }, c(.18, .3, [0, 2.95, 0], 'oxide'),
    ...chain([.2, 2.35, .1], [.3, 1.6, .2], .035, 'iron'), ...chain([-.25, 2.35, -.1], [-.2, 1.9, -.15], .035, 'iron'),
    ...along(7, 0, 1).map((t, i) => { const next = random(300 + i), a = .3 + t * .9; return rb([.12 + next() * .2, .02, .1 + next() * .18], [Math.cos(a) * (1.1 + next() * .8), .02, Math.sin(a) * (1.1 + next() * .8)], 'frost', .005, [0, next() * PI, 0]); }),
  ], 'Cápsula de 3 m sobre base rúnica: vidro fosco com dois painéis estourados para fora, cacos no chão e correntes partidas.');

  model('nordic-rune-lantern', 'Nórdico · lanterna rúnica de cristal', 'Nórdico / Iluminação', DEPTHS, ['lanterna', 'luz', 'cristal', 'iluminação'], [
    ...polar(3, .28, (x, z) => [curve([[x, 0, z], [x * .4, .3, z * .4], [0, .45, 0]], .018, 'iron')]), c(.03, 1.25, [0, 1.05, 0], 'iron'),
    { ...lathe([[0, 0], [.16, 0], [.18, .04], [0, .06]], [0, 1.66, 0], 'bronze'), segments: 8 }, ...polar(4, .15, (x, z) => [b([.025, .42, .025], [x, 1.9, z], 'iron')], PI / 4),
    lathe([[0, 0], [.07, .05], [.07, .26], [0, .36]], [0, 1.72, 0], 'crystal', undefined, { segments: 6 }), { ...lathe([[0, 0], [.2, 0], [.12, .1], [0, .14]], [0, 2.11, 0], 'bronze'), segments: 8 }, r(.05, .012, [0, 2.3, 0], 'iron'),
  ], 'Lanterna de pé de 2,3 m: tripé de ferro e gaiola com cristal aceso. Dê luz própria fria.');

  const tablets = (() => { const next = random(77), parts = []; for (const y of [.42, 1.12, 1.82]) for (let i = 0; i < 5; i++) { if (next() < .25) continue; const x = -.85 + i * .42 + (next() - .5) * .06, lean = (next() - .5) * .35; parts.push(rb([.3, .5, .07], [x, y + .25, -.05], 'stone', .02, [lean * .3, 0, lean]), ...rune(x, y + .28, -.012, 500 + i + y * 10, next() < .4 ? 'glow' : 'void', .14, .008)); } return parts; })();
  model('nordic-tablet-shelf', 'Nórdico · estante de tábuas rúnicas', 'Nórdico / Pedras rúnicas', DEPTHS, ['estante', 'tábua', 'runa', 'arquivo'], [
    ...stone([...[-1, 1].map(s => rb([.16, 2.4, .6], [s * 1.12, 1.2, 0], 'stone', .02)), ...[.36, 1.06, 1.76, 2.4].map(y => rb([2.4, .1, .6], [0, y, 0], 'stone', .02))]), ...withSurface(tablets, STONE),
  ], 'Estante de pedra com tábuas rúnicas encostadas, algumas ainda acesas. Para arquivos e bibliotecas.');

  model('nordic-floor-sigil', 'Nórdico · círculo rúnico no piso', 'Nórdico / Pedras rúnicas', DEPTHS, ['círculo', 'runa', 'ritual', 'piso'], [
    ...[1.5, 1.15].map(radius => ({ ...r(radius, .022, [0, .012, 0], 'iron', [PI / 2, 0, 0]), segments: 48 })),
    ...polar(16, 1.33, (x, z, a, i) => [b([.04, .006, .2], [x, .02, z], i % 3 ? 'glow' : 'iron', [0, -a, 0]), b([.04, .006, .1], [x + Math.cos(a + .3) * .05, .02, z + Math.sin(a + .3) * .05], i % 3 ? 'glow' : 'iron', [0, -a + .7, 0])]),
    ...polar(6, .6, (x, z, a) => [b([.03, .006, .9], [x * .5, .015, z * .5], 'iron', [0, -a, 0])]),
  ], 'Dois anéis de ferro embutidos no piso, 3 m, com runas acesas entre eles e raios até o centro.');

  // Doors, rails and statues ------------------------------------------------------------------------
  // A stone gate for the abyss: posts, a lintel with Othala carved and lit, and two slabs swung back,
  // Algiz on one and Tiwaz on the other. The opening is 2,2 × 2,7 m; the slabs open toward -Z.
  const stroke2 = (x, y, z, length, angle, material = 'glow', width = .07, depth = .03) => b([width, length, depth], [x, y, z], material, [0, 0, angle]);
  const othala = (x, y, z, s) => [
    ...[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([u, v]) => stroke2(x + u * .14 * s, y + v * .14 * s + .14 * s, z, .4 * s, u * v * PI / 4)),
    ...[-1, 1].map(u => stroke2(x + u * .16 * s, y - .2 * s, z, .36 * s, -u * PI / 5)),
  ];
  const algiz = (x, y, z, s, material) => [stroke2(x, y, z, 1 * s, 0, material), ...[-1, 1].map(u => stroke2(x + u * .14 * s, y + .3 * s, z, .42 * s, -u * PI / 5, material))];
  const tiwaz = (x, y, z, s, material) => [stroke2(x, y, z, 1 * s, 0, material), ...[-1, 1].map(u => stroke2(x + u * .14 * s, y + .36 * s, z, .4 * s, u * PI / 4, material))];
  /** Parts drawn in a plane at the origin, turned by `yaw` and moved to `origin`. */
  const place = (parts, [ox, oy, oz], yaw) => parts.map(part => {
    const [x, y, z] = part.position;
    return { ...part, position: [ox + x * Math.cos(yaw) + z * Math.sin(yaw), oy + y, oz - x * Math.sin(yaw) + z * Math.cos(yaw)], rotation: [0, yaw, part.rotation?.[2] ?? 0] };
  });
  const leaf = (side, carve) => {
    // Hinged at the post and swung 70° back, toward -Z.
    const open = 1.22, yaw = side * -open, cx = side * 1.1 - side * Math.cos(open) * .55, cz = -Math.sin(open) * .55;
    return [rb([1.1, 2.65, .3], [cx, 1.38, cz], 'stone', .02, [0, yaw, 0]), ...[.55, 2.2].map(y => b([1.12, .1, .32], [cx, y, cz], 'iron', [0, yaw, 0])),
      ...place(carve(0, 0, .16, 1.1, 'glow'), [cx, 1.45, cz], yaw)];
  };
  model('nordic-rune-door', 'Nórdico · porta de pedra rúnica', 'Nórdico / Portas', DEPTHS, ['porta', 'pedra', 'runa', 'portal', 'abismo'], [
    ...stone([...[-1, 1].map(s => rb([.65, 3.3, .9], [s * 1.43, 1.65, 0], 'stone', .03)), rb([3.9, .65, 1], [0, 3.02, 0], 'stone', .04), rb([2.6, .14, 1.1], [0, .07, 0], 'stone', .02)]),
    ...othala(0, 2.92, .51, .72), ...[-1, 1].flatMap(s => along(4, .6, 2.4).flatMap((y, i) => rune(s * 1.43, y, .46, 600 + i + (s > 0 ? 10 : 0), 'oxide', .16, .012))),
    ...leaf(-1, algiz), ...leaf(1, tiwaz),
  ], 'Portal de pedra com Othala acesa no lintel e duas lajes abertas para trás, com Algiz e Tiwaz. Vão de 2,2 × 2,7 m; encaixe no fim de um corredor.');

  // A bronze rail of 2 m: knotted posts at the ends and two rails. Line them up end to end.
  model('nordic-railing', 'Nórdico · balaustrada de bronze', 'Nórdico / Arquitetura', DEPTHS, ['balaustrada', 'guarda-corpo', 'bronze', 'grade'], [
    ...[-1, 1].flatMap(s => [c(.05, 1.05, [s * .97, .525, 0], 'bronze'), lathe([[0, 0], [.08, .02], [.09, .08], [.05, .14], [0, .18]], [s * .97, 1.05, 0], 'oxide')]),
    ...[.5, .98].map(y => c(.03, 1.94, [0, y, 0], 'bronze', 'x')), c(.04, 1.94, [0, 1.06, 0], 'oxide', 'x'),
    ...along(3, -.5, .5).map(x => ({ ...r(.17, .018, [x, .74, 0], 'bronze'), segments: 16 })),
  ], 'Guarda-corpo de bronze de 2 m com postes de pomo e três argolas entre os corrimãos. Alinhe vários pela borda de poços e mezaninos.');

  // A stone warrior on a plinth: round shield, axe, horned helm, worn smooth.
  model('nordic-guardian-statue', 'Nórdico · estátua de guardião', 'Nórdico / Arquitetura', DEPTHS, ['estátua', 'guardião', 'guerreiro', 'pedra'], [
    ...stone([rb([1.3, .55, 1.3], [0, .275, 0], 'stone', .04), rb([1.1, .18, 1.1], [0, .64, 0], 'stone', .03)]),
    ...rocky([
      rb([.32, 1.2, .36], [-.18, 1.33, 0], 'stone', .08, [0, 0, .04]), rb([.32, 1.2, .36], [.18, 1.33, 0], 'stone', .08, [0, 0, -.04]),
      e([.9, .55, .55], [0, 2.02, 0], 'stone'), rb([.86, .95, .5], [0, 2.45, 0], 'stone', .12), e([.98, .3, .55], [0, 2.92, 0], 'stone'),
      rb([.24, .9, .26], [-.55, 2.42, .05], 'stone', .08, [0, 0, .12]), rb([.24, .9, .26], [.55, 2.42, .1], 'stone', .08, [-.35, 0, -.1]),
      e([.36, .42, .4], [0, 3.32, 0], 'stone'), lathe([[0, 0], [.22, 0], [.23, .1], [.15, .24], [0, .28]], [0, 3.4, 0], 'stone'),
      ...[-1, 1].map(s => curve([[s * .2, 3.52, 0], [s * .36, 3.62, 0], [s * .38, 3.86, .04]], .035, 'stone')),
      { ...c(.5, .1, [-.62, 2.3, .32], 'stone', 'z'), segments: 24 }, c(.11, .06, [-.62, 2.3, .38], 'stone', 'z'),
      c(.035, 1.5, [.62, 2.4, .5], 'stone'), b([.3, .34, .06], [.74, 3.05, .5], 'stone'),
    ]),
  ], 'Guerreiro de pedra de 4 m sobre plinto, com escudo redondo, machado e elmo com chifres, gasto pelo tempo.');

  // The spiral stair of the abyss --------------------------------------------------------------------
  // One turn of 40 steps cut into the wall of a shaft of 16,5 m of radius, going down 8 m. Stack turns 8 m
  // apart with the same rotation and they join step to step. The rail runs along the open edge.
  const STEPS = 40, RISE = .2, inner = 13.6, outer = 16.4, mid = (inner + outer) / 2;
  const stair = [];
  for (let i = 0; i < STEPS; i++) {
    const a = i * TAU / STEPS, y = STEPS * RISE - i * RISE, [u, v] = [Math.cos(a), Math.sin(a)];
    stair.push(rb([outer - inner, .3, 2.5], [u * mid, y - .15, v * mid], 'stone', .03, [0, -a, 0]), rb([.6, .7, 1.4], [u * (outer - .3), y - .65, v * (outer - .3)], 'stone', .05, [0, -a, 0]));
  }
  const post = i => { const a = i * TAU / STEPS, y = STEPS * RISE - i * RISE; return [Math.cos(a) * (inner + .15), y, Math.sin(a) * (inner + .15)]; };
  for (let i = 0; i < STEPS; i += 4) {
    const [x, y, z] = post(i), [x2, y2, z2] = post(i + 4); stair.push(c(.035, 1.05, [x, y + .52, z], 'iron'));
    stair.push(curve([[x, y + 1, z], [(x + x2) / 2, (y + y2) / 2 + .78, (z + z2) / 2], [x2, y2 + 1, z2]], .02, 'iron'));
  }
  model('nordic-spiral-stair-turn', 'Nórdico · escada em espiral do abismo (uma volta)', 'Nórdico / Escadas', ['Abismo', 'Caverna', 'Masmorra', 'Torre'], ['escada', 'espiral', 'abismo', 'descida'],
    [...withSurface(stair.filter(part => part.material === 'stone'), STONE), ...stair.filter(part => part.material !== 'stone')],
    'Uma volta de 40 degraus presos à parede de um poço de 16,5 m de raio, descendo 8 m, com corrimão de ferro na borda aberta. Empilhe voltas a cada 8 m, com o mesmo giro, para descer mais.');

  // Cave paintings ------------------------------------------------------------------------------------
  // Flat figures in ochre, red, charcoal and chalk, to lean against a rock wall a hand's width away.
  const figure = (x, y, s, m, { spear = 0, kneel = false, dir = 1 } = {}) => {
    const P = (u, v) => [x + dir * u * s, y + v * s];
    return [
      e([.13 * s, .15 * s, .02], [...P(0, .9), 0], m), stroke([P(0, .8), P(.02, .42)], .028 * s, m),
      ...(kneel ? [stroke([P(.02, .42), P(.2, .3), P(.05, 0)], .026 * s, m), stroke([P(.02, .42), P(-.15, .2), P(-.3, .05)], .026 * s, m)]
        : [stroke([P(.02, .42), P(.14, .2), P(.2, 0)], .026 * s, m), stroke([P(.02, .42), P(-.1, .2), P(-.14, 0)], .026 * s, m)]),
      stroke([P(0, .72), P(.18, .62), P(.3, .75 + spear * .1)], .024 * s, m), stroke([P(0, .72), P(-.2, .58), P(-.26, .4)], .024 * s, m),
      ...(spear ? [stroke([P(.05, .45), P(.6, 1.1)], .016 * s, m)] : []),
    ];
  };
  const elk = (x, y, s, m, dir = 1) => [
    e([.62 * s, .26 * s, .02], [x, y + .5 * s, 0], m), stroke([[x + dir * .26 * s, y + .58 * s], [x + dir * .38 * s, y + .76 * s]], .06 * s, m), e([.2 * s, .1 * s, .02], [x + dir * .46 * s, y + .78 * s, 0], m, [0, 0, dir * -.4]),
    ...[-.22, -.12, .12, .22].map((u, i) => stroke([[x + u * s, y + .42 * s], [x + (u + (i % 2 ? .04 : -.04)) * s, y]], .024 * s, m)),
    stroke([[x + dir * .4 * s, y + .82 * s], [x + dir * .34 * s, y + 1.05 * s], [x + dir * .2 * s, y + 1.18 * s]], .016 * s, m), stroke([[x + dir * .36 * s, y + .98 * s], [x + dir * .48 * s, y + 1.12 * s]], .014 * s, m),
    stroke([[x - dir * .3 * s, y + .55 * s], [x - dir * .38 * s, y + .48 * s]], .02 * s, m),
  ];
  const wolf = (x, y, s, m, dir = 1) => [
    e([.42 * s, .14 * s, .02], [x, y + .3 * s, 0], m), e([.14 * s, .08 * s, .02], [x + dir * .27 * s, y + .38 * s, 0], m), b([.03 * s, .07 * s, .02], [x + dir * .27 * s, y + .44 * s, 0], m),
    ...[-.15, .15].flatMap(u => [stroke([[x + u * s, y + .25 * s], [x + (u + .05) * s, y]], .02 * s, m), stroke([[x + u * s + .03 * s, y + .25 * s], [x + (u - .04) * s, y]], .02 * s, m)]),
    stroke([[x - dir * .2 * s, y + .33 * s], [x - dir * .36 * s, y + .4 * s], [x - dir * .44 * s, y + .3 * s]], .02 * s, m),
  ];
  const hand = (x, y, s, m) => [e([.14 * s, .17 * s, .015], [x, y, 0], m), ...[-.5, -.18, .1, .38].map((a, i) => e([.04 * s, (i === 1 || i === 2 ? .17 : .14) * s, .015], [x + Math.sin(a) * .16 * s, y + Math.cos(a) * .17 * s + .04 * s, 0], m, [0, 0, -a])), e([.04 * s, .11 * s, .015], [x - .15 * s, y - .02 * s, 0], m, [0, 0, 1.1])];
  const spiral = (x, y, size, m, turns = 2.4) => along(16, 0, 1).map(t => [x + Math.cos(t * turns * TAU) * (.04 + t * size), y + Math.sin(t * turns * TAU) * (.04 + t * size)]);
  const ringOfRays = (x, y, radius, m) => [stroke(along(16, 0, TAU * 15 / 16).map(a => [x + Math.cos(a) * radius, y + Math.sin(a) * radius]), .03, m), ...polar(12, radius + .12, (u, v, a) => [b([.16, .035, .02], [x + u, y + v, 0], m, [0, 0, a])])];
  const PAINTS = PAINT;
  model('cave-painting-hunt', 'Pintura rupestre · a caçada', 'Arte / Pinturas rupestres', ['Caverna', 'Templo', 'Ruína'], ['pintura rupestre', 'caverna', 'arte', 'caça'], [
    ...figure(-1.6, .1, .9, 'charcoal', { spear: 1 }), ...figure(-1, .2, .8, 'charcoal', { spear: 1 }), ...figure(-.5, 0, .85, 'red', { spear: 1 }),
    ...elk(.5, .25, 1, 'ochre', 1), ...elk(1.45, .05, .8, 'ochre', 1), ...wolf(-.2, 1.2, .9, 'charcoal', 1), ...hand(1.75, 1.35, 1, 'red'), ...hand(-1.75, 1.45, .9, 'ochre'),
    ...along(7, -1.2, 0).map(x => b([.03, .16, .02], [x, 1.62, 0], 'charcoal')),
  ], 'Painel de 4 × 1,8 m: caçadores com lanças atrás de dois alces e um lobo, com mãos carimbadas. Encoste a uma parede de rocha.', PAINTS);

  model('cave-painting-ring', 'Pintura rupestre · o anel e os que se curvam', 'Arte / Pinturas rupestres', ['Caverna', 'Templo', 'Ritual'], ['pintura rupestre', 'caverna', 'arte', 'ritual', 'anel'], [
    ...ringOfRays(0, 1.05, .55, 'chalk'), e([.14, .14, .02], [0, 1.05, 0], 'red'),
    ...figure(-1.5, .05, .8, 'ochre', { kneel: true }), ...figure(-.95, .05, .7, 'ochre', { kneel: true }), ...figure(1.05, .05, .7, 'ochre', { kneel: true, dir: -1 }),
    ...figure(1.55, .05, .8, 'ochre', { kneel: true, dir: -1 }),
    ...hand(-1.8, 1.6, .9, 'red'), ...hand(-1.5, 1.75, .8, 'red'), ...hand(1.7, 1.7, .9, 'chalk'),
    stroke(spiral(0, .3, .2, 'red', 1.6), .02, 'red'),
  ], 'Painel de 4 × 2 m: um anel de luz com raios e figuras ajoelhadas dos dois lados, mãos e uma espiral. Encoste a uma parede de rocha.', PAINTS);

  model('cave-painting-descent', 'Pintura rupestre · a descida', 'Arte / Pinturas rupestres', ['Caverna', 'Abismo', 'Ritual'], ['pintura rupestre', 'caverna', 'arte', 'abismo', 'espiral'], [
    stroke(spiral(.6, .95, .85, 'charcoal', 2.6), .045, 'charcoal'), stroke(spiral(.6, .95, .5, 'red', 1.8), .025, 'red'),
    ...along(5, 0, 1).flatMap((t, i) => figure(-1.9 + t * 1.6, 1.25 - t * .75, .55 - t * .15, 'ochre')),
    ...[[1.5, 1.6], [1.75, 1.35], [1.45, .3], [-.3, .25], [1.9, .8]].flatMap(([x, y]) => [e([.06, .035, .02], [x - .05, y, 0], 'chalk'), e([.06, .035, .02], [x + .05, y, 0], 'chalk')]),
    ...along(12, -1.9, -.6).map((x, i) => b([.03, .2, .02], [x, .12, 0], i % 5 === 4 ? 'red' : 'charcoal', i % 5 === 4 ? [0, 0, 1.1] : undefined)),
  ], 'Painel de 4 × 1,9 m: uma fila de figuras entrando numa espiral escura cercada de olhos, e marcas de contagem. Encoste a uma parede de rocha.', PAINTS);

  return ids;
}
