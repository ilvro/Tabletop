import { b, c, e, t, r, rb, lathe, curve, fire, candle, planks, along, polar, bolts, chain, panel, spin, AX, TAU } from './library-atelier-kit.js';
import { cylinder, spindle } from './library-craft-parts.js';

/**
 * Medieval kit: furniture, fire and light, arms, the forge and the yard.
 * Every model is authored here in metres, front towards +Z, with at most six
 * materials so it draws in few batches. Slot names carry their finish:
 * `oak`/`board` are wood, `iron`/`steel`/`brass` metal, `cloth`/`leather` textile.
 */
const PI = Math.PI, FLAT = [PI / 2, 0, 0];
const MATERIALS = {
  oak: { color: '#6d4c31', roughness: .78 }, board: { color: '#4a3323', roughness: .82 }, iron: { color: '#35373a', roughness: .5, metalness: .5 },
  steel: { color: '#9aa1a4', roughness: .34, metalness: .5 }, brass: { color: '#b08d3c', roughness: .4, metalness: .5 }, stone: { color: '#817d74', roughness: .95 },
  cloth: { color: '#70222a', roughness: .95 }, linen: { color: '#cdc2a3', roughness: .97 }, straw: { color: '#b89b56', roughness: 1 }, leather: { color: '#5c3d28', roughness: .7 },
  wax: { color: '#d8c796', roughness: .8 }, black: { color: '#17181a', roughness: .9 }, water: { color: '#3f5f6b', roughness: .12 },
  flame: { color: '#f3c477', emissive: '#ff9a3c', emissiveIntensity: 1.1 }, ember: { color: '#d8642a', emissive: '#ff5a1c', emissiveIntensity: .9 },
};
const band = (w, h, d, [x, y, z], material = 'iron') => [b([w + .012, h, .008], [x, y, z + d / 2 + .003], material), b([w + .012, h, .008], [x, y, z - d / 2 - .003], material), b([.008, h, d + .012], [x + w / 2 + .003, y, z], material), b([.008, h, d + .012], [x - w / 2 - .003, y, z], material)];
const logs = (x, y, z, length = .5, material = 'board') => [-1, 0, 1].map(i => ({ ...cylinder(.045, length, [x, y + .045, z + i * .1], material, .04, [0, i * .35, PI / 2]), segments: 8 }));
const flames = (x, y, z, size = 1) => [fire(x, y, z, .09 * size, .34 * size), fire(x - .09 * size, y, z + .04 * size, .06 * size, .22 * size), fire(x + .08 * size, y, z - .03 * size, .055 * size, .2 * size)];

export function addMedievalLibrary({ add, medieval }) {
  const ids = new Set();
  const model = (id, name, category, contexts, tags, parts, description, supportHeight) => { const asset = add(`medieval-${id}`, name, `Medieval / ${category}`, medieval, contexts, ['medieval', ...tags], parts, description, supportHeight); asset.materials = MATERIALS; ids.add(asset.id); };

  // Furniture -------------------------------------------------------------------------------------
  model('throne', 'Trono de carvalho entalhado', 'Mobiliário', ['Castelo', 'Salão'], ['trono', 'assento', 'nobreza'], [
    rb([.92, .16, .8], [0, .08, 0], 'board', .015), rb([.74, .42, .62], [0, .37, 0], 'oak', .012), rb([.7, .09, .58], [0, .615, .02], 'cloth', .03),
    rb([.82, 1.55, .09], [0, 1.2, -.31], 'oak', .012), ...panel(.58, .9, [0, 1.3, -.262], 'board'), rb([.5, .7, .03], [0, 1.25, -.24], 'cloth', .012),
    ...[-1, 1].flatMap(s => [rb([.09, .62, .64], [s * .41, .74, .0], 'oak', .012), rb([.13, .06, .66], [s * .41, 1.07, .02], 'board', .02), spindle(.5, .05, [s * .41, 1.95, -.31], 'oak'), lathe([[0, 0], [.05, .01], [.06, .05], [.03, .1], [0, .13]], [s * .41, 2.44, -.31], 'brass')]),
    // Pointed crest with a brass sun.
    b([.5, .2, .09], [0, 2.06, -.31], 'oak'), b([.3, .16, .09], [0, 2.22, -.31], 'oak'), b([.12, .14, .09], [0, 2.36, -.31], 'oak'), lathe([[0, 0], [.09, .005], [.1, .02], [.06, .035], [0, .04]], [0, 2.08, -.262], 'brass', 'z'),
    ...bolts([-.3, .3].flatMap(x => [.55, 1.85].map(y => [x, y, -.262])), .014, 'brass'),
  ], 'Assento alto de espaldar entalhado, com almofada e brasão de latão. Para o salão de um senhor.');

  model('trestle-table', 'Mesa de cavaletes', 'Mobiliário', ['Taverna', 'Salão', 'Casa'], ['mesa', 'refeição', 'banquete'], [
    ...planks(2.4, .06, .9, [0, .76, 0], 4, 'oak', .006),
    ...[-1, 1].flatMap(s => [b([.07, .8, .07], [s * .85, .37, .3], 'board', [.3, 0, 0]), b([.07, .8, .07], [s * .85, .37, -.3], 'board', [-.3, 0, 0]), b([.09, .07, .86], [s * .85, .7, 0], 'board'), b([.05, .05, .5], [s * .85, .3, 0], 'board')]),
    b([1.76, .07, .06], [0, .3, 0], 'board'), ...[-1, 1].map(s => b([.03, .14, .03], [s * .93, .3, 0], 'oak')),
  ], 'Tampo de tábuas sobre dois cavaletes travados. Mesa comum de taverna e salão.', .79);

  model('bench', 'Banco comprido de tábua', 'Mobiliário', ['Taverna', 'Salão', 'Casa'], ['banco', 'assento'], [
    rb([1.9, .06, .34], [0, .45, 0], 'oak', .012), ...[-1, 1].flatMap(s => [b([.06, .43, .3], [s * .72, .215, 0], 'board'), b([.05, .28, .04], [s * .6, .28, 0], 'board', [0, 0, s * .7])]), b([1.4, .07, .05], [0, .18, 0], 'board'),
  ], 'Banco de tábua grossa com pés de prancha e travessa.', .48);

  model('stool', 'Banqueta de três pés', 'Mobiliário', ['Taverna', 'Casa', 'Oficina'], ['banqueta', 'assento'], [
    lathe([[0, 0], [.16, 0], [.18, .015], [.18, .045], [.16, .06], [0, .06]], [0, .42, 0], 'oak'),
    ...polar(3, .14, (x, z, a) => [{ ...cylinder(.022, .46, [x * .95, .22, z * .95], 'board', .028, spin(['z', .2], ['y', -a])), segments: 8 }], .5),
  ], 'Assento redondo torneado sobre três pés abertos.');

  model('chest', 'Baú com ferragens', 'Armazenamento', ['Casa', 'Castelo', 'Depósito'], ['baú', 'tesouro', 'guardar'], [
    rb([.98, .42, .52], [0, .25, 0], 'oak', .012), ...[-1, 1].map(s => rb([.1, .06, .56], [s * .4, .03, 0], 'board', .01)),
    // Lid: a low barrel vault of boards.
    // The lower half of the vault sits inside the body.
    { ...cylinder(.26, .98, [0, .46, 0], 'oak', .26, [0, 0, PI / 2]), segments: 20 }, ...[-.34, 0, .34].flatMap(x => [...band(.012, .44, .52, [x, .25, 0]).slice(0, 2), { ...r(.262, .008, [x, .46, 0], 'iron', [0, PI / 2, 0]), segments: 20 }]),
    rb([.11, .13, .018], [0, .4, .27], 'iron', .01), r(.03, .007, [0, .33, .285], 'iron'), ...[-1, 1].map(s => r(.045, .008, [s * .5, .3, 0], 'iron', [0, PI / 2, 0])),
  ], 'Arca de tampa abaulada, cintas de ferro, fechadura e argolas.');

  model('bed', 'Cama de palha com dossel baixo', 'Mobiliário', ['Casa', 'Castelo', 'Taverna'], ['cama', 'repouso'], [
    ...[-1, 1].flatMap(s => [rb([.08, .34, 2.0], [s * .62, .32, 0], 'oak', .012), spindle(1.25, .05, [s * .62, 0, -1.0], 'board'), spindle(.75, .05, [s * .62, 0, 1.0], 'board')]),
    rb([1.24, .62, .06], [0, .82, -1.0], 'oak', .012), ...panel(1.0, .4, [0, .86, -.968], 'board'), rb([1.24, .34, .06], [0, .42, 1.0], 'oak', .012),
    ...planks(1.2, .03, 1.96, [0, .3, 0], 6, 'board', .03), rb([1.16, .16, 1.9], [0, .4, 0], 'straw', .05), rb([1.12, .07, 1.25], [0, .5, .28], 'cloth', .03), rb([1.14, .05, .3], [0, .52, -.32], 'linen', .02),
    e([.7, .14, .36], [0, .56, -.72], 'linen'),
  ], 'Estrado de tábuas, colchão de palha, manta de lã e travesseiro de linho, com cabeceira almofadada.');

  model('cupboard', 'Armário de despensa', 'Armazenamento', ['Casa', 'Taverna', 'Castelo'], ['armário', 'despensa', 'guardar'], [
    rb([1.2, 1.7, .5], [0, .9, 0], 'oak', .012), rb([1.28, .07, .56], [0, 1.77, 0], 'board', .015), rb([1.26, .1, .54], [0, .05, 0], 'board', .012),
    ...[-1, 1].flatMap(s => [...panel(.52, .74, [s * .29, 1.3, .252], 'board'), ...panel(.52, .6, [s * .29, .52, .252], 'board'), ...[1.55, 1.05, .72, .32].map(y => b([.1, .03, .012], [s * .5, y, .262], 'iron')), r(.028, .006, [s * .06, 1.3, .27], 'iron'), r(.028, .006, [s * .06, .52, .27], 'iron')]),
    b([1.16, .03, .02], [0, .88, .255], 'board'),
  ], 'Armário de quatro portas almofadadas, dobradiças de ferro e puxadores de argola.');

  model('barrel-rack', 'Barris de vinho em cavalete', 'Armazenamento', ['Taverna', 'Adega', 'Depósito'], ['barril', 'vinho', 'bebida', 'adega'], [
    ...[-.5, .5].flatMap(x => [
      lathe([[0, -.42], [.27, -.42], [.31, -.2], [.33, 0], [.31, .2], [.27, .42], [0, .42]], [x, .58, 0], 'oak', 'z'),
      ...[-.36, -.14, .14, .36].map(z => ({ ...r(z * z > .1 ? .285 : .322, .011, [x, .58, z], 'iron'), segments: 24 })),
      lathe([[0, 0], [.02, 0], [.02, .07], [.012, .09], [0, .09]], [x, .44, .42], 'brass', 'z'), c(.008, .05, [x, .42, .5], 'brass'),
    ]),
    ...[-.3, .3].flatMap(z => [b([1.9, .09, .09], [0, .2, z], 'board'), ...[-.86, 0, .86].map(x => b([.09, .2, .09], [x, .1, z], 'board')), ...[-.76, -.24, .24, .76].map(x => b([.08, .12, .09], [x, .29, z], 'board', [0, 0, x * x > .3 ? Math.sign(x) * -.5 : Math.sign(x) * .5]))]),
  ], 'Dois barris deitados em cavalete, com aros de ferro e torneiras de latão.');

  model('sacks', 'Sacos de grão empilhados', 'Armazenamento', ['Depósito', 'Mercado', 'Moinho'], ['saco', 'grão', 'mantimento'], [
    e([.62, .34, .44], [-.2, .17, .02], 'linen', [0, .3, 0]), e([.6, .32, .42], [.28, .16, -.08], 'linen', [0, -.4, 0]), e([.58, .3, .4], [.04, .43, -.02], 'linen', [0, .9, .08]),
    ...[[-.2, .34, .02], [.28, .32, -.08], [.04, .58, -.02]].map(([x, y, z], i) => e([.12, .09, .1], [x + (i - 1) * .24, y - .08, z + .16], 'linen')), curve([[-.02, .36, .16], [.04, .42, .2], [.1, .37, .17]], .008, 'straw'),
  ], 'Três sacos de linho cheios, amarrados na boca.');

  model('tankards', 'Jarro e canecas', 'Utensílios', ['Taverna', 'Salão', 'Casa'], ['caneca', 'jarro', 'bebida', 'mesa'], [
    rb([.5, .02, .34], [0, .01, 0], 'board', .008),
    { ...lathe([[0, 0], [.07, 0], [.085, .06], [.08, .14], [.05, .2], [.055, .25], [.045, .25], [.04, .2], [.065, .14], [.07, .06], [0, .012]], [-.13, .02, -.03], 'steel'), segments: 20 }, r(.045, .008, [-.21, .15, -.03], 'steel', [0, 0, 0]),
    ...[[.06, .07], [.16, -.06], [.02, -.09]].flatMap(([x, z], i) => [{ ...lathe([[0, 0], [.042, 0], [.046, .1], [.04, .1], [.036, .012], [0, .012]], [x, .02, z], 'oak'), segments: 16 }, r(.03, .006, [x + .055, .07, z], 'iron', [0, i, 0]), ...[.03, .09].map(y => ({ ...r(.045, .003, [x, y, z], 'iron', FLAT), segments: 16 }))]),
    e([.16, .07, .1], [.15, .055, .09], 'straw'),
  ], 'Bandeja com jarro de estanho, três canecas de aduelas e um pão.');

  model('wooden-tub', 'Tina de banho', 'Mobiliário', ['Casa', 'Taverna', 'Castelo'], ['tina', 'banho', 'água'], [
    { ...lathe([[0, 0], [.5, 0], [.56, .05], [.6, .58], [.56, .58], [.52, .08], [0, .08]], [0, 0, 0], 'oak'), segments: 28 }, ...[.12, .46].map(y => ({ ...r(.56 + y * .08, .012, [0, y, 0], 'iron', FLAT), segments: 28 })),
    c(.53, .01, [0, .44, 0], 'water'), rb([.3, .04, .16], [.5, .6, 0], 'board', .01), e([.24, .05, .14], [.5, .64, 0], 'linen'), c(.1, .2, [.75, .1, .2], 'oak'), curve([[.67, .2, .2], [.75, .32, .2], [.83, .2, .2]], .007, 'iron'),
  ], 'Tina de aduelas com aros de ferro, água, pano na borda e balde.');

  // Fire and light --------------------------------------------------------------------------------
  model('wall-torch', 'Tocha de parede', 'Fogo e luz', ['Castelo', 'Masmorra', 'Taverna'], ['tocha', 'luz', 'fogo', 'parede'], [
    rb([.1, .22, .02], [0, .16, -.11], 'iron', .008), curve([[0, .2, -.1], [0, .16, 0], [0, .1, .06]], .012, 'iron'), { ...r(.04, .008, [0, .14, .04], 'iron', spin(['x', PI / 2 - .5])), segments: 16 },
    { ...cylinder(.022, .46, [0, .26, .08], 'board', .03, [.5, 0, 0]), segments: 10 }, { ...cylinder(.045, .12, [0, .44, .178], 'black', .05, [.5, 0, 0]), segments: 12 }, fire(0, .47, .2, .06, .2), fire(-.03, .47, .19, .035, .12),
  ], 'Tocha de pano e breu em suporte de ferro. Fixe à parede; emite luz quando vinculada.');

  model('brazier', 'Braseiro de ferro', 'Fogo e luz', ['Castelo', 'Masmorra', 'Pátio'], ['braseiro', 'fogo', 'luz', 'calor'], [
    ...polar(3, .26, (x, z) => [curve([[x, 0, z], [x * .55, .4, z * .55], [x * .9, .78, z * .9]], .016, 'iron')], .3), { ...r(.2, .01, [0, .32, 0], 'iron', FLAT), segments: 20 },
    { ...lathe([[0, 0], [.1, 0], [.24, .1], [.3, .22], [.27, .22], [.21, .11], [0, .03]], [0, .72, 0], 'iron'), segments: 20 }, e([.46, .12, .46], [0, .9, 0], 'ember'), ...flames(0, .9, 0, .9),
  ], 'Cuba de ferro sobre tripé, com brasas e chama.');

  model('candle-stand', 'Castiçal de pé', 'Fogo e luz', ['Castelo', 'Capela', 'Salão'], ['castiçal', 'vela', 'luz'], [
    lathe([[0, 0], [.17, 0], [.18, .02], [.07, .05], [.03, .09], [.025, .6], [.045, .64], [.025, .68], [.022, 1.25], [.05, 1.28], [0, 1.28]], [0, 0, 0], 'iron'),
    ...polar(3, .16, (x, z) => [curve([[0, 1.2, 0], [x * .6, 1.16, z * .6], [x, 1.3, z]], .009, 'iron'), lathe([[0, 0], [.04, 0], [.045, .015], [0, .015]], [x, 1.3, z], 'iron'), ...candle(x, 1.315, z, .016, .16)], .2), ...candle(0, 1.28, 0, .018, .22),
  ], 'Haste de ferro torneada com quatro velas.');

  model('hearth', 'Lareira de pedra', 'Fogo e luz', ['Casa', 'Castelo', 'Taverna'], ['lareira', 'fogo', 'calor', 'luz'], [
    ...[-1, 1].map(s => rb([.34, 1.25, .6], [s * .78, .625, 0], 'stone', .02)), rb([1.9, .22, .66], [0, 1.36, 0], 'oak', .02), rb([1.6, .9, .5], [0, 1.9, -.05], 'stone', .02), rb([1.2, .5, .42], [0, 2.55, -.09], 'stone', .02),
    b([1.22, 1.25, .1], [0, .625, -.25], 'black'), rb([1.9, .08, .7], [0, .04, .05], 'stone', .015), ...logs(0, .08, .02, .6), e([.5, .08, .22], [0, .12, .02], 'ember'), ...flames(0, .16, .02, 1.2),
    ...[-.34, .34].map(x => b([.03, .3, .3], [x, .23, .05], 'iron')), ...bolts([-.8, 0, .8].map(x => [x, 1.36, .33]), .02, 'iron'),
  ], 'Boca de fogo entre pilares de pedra, verga de carvalho e coifa em degraus, com lenha acesa.');

  model('cauldron', 'Caldeirão em tripé', 'Fogo e luz', ['Taverna', 'Casa', 'Acampamento'], ['caldeirão', 'cozinha', 'fogo'], [
    ...polar(3, .52, (x, z) => [curve([[x, 0, z], [x * .04, 1.5, z * .04]], .022, 'board')], .5), ...chain([0, 1.42, 0], [0, .78, 0], .028, 'iron'),
    { ...lathe([[0, .02], [.12, 0], [.24, .08], [.28, .2], [.25, .34], [.27, .37], [.23, .37], [.21, .33], [.24, .2], [.2, .1], [0, .06]], [0, .4, 0], 'iron'), segments: 24 }, curve([[-.25, .74, 0], [0, .92, 0], [.25, .74, 0]], .009, 'iron'),
    c(.22, .01, [0, .7, 0], 'water'), ...polar(6, .3, (x, z) => [e([.14, .09, .12], [x, .045, z], 'stone')]), ...logs(0, 0, 0, .44), e([.3, .06, .3], [0, .1, 0], 'ember'), ...flames(0, .14, 0, .8),
  ], 'Panela de ferro pendurada por corrente sobre fogo de lenha.');

  // Arms ------------------------------------------------------------------------------------------
  model('weapon-rack', 'Estante de armas', 'Armas', ['Castelo', 'Arsenal', 'Quartel'], ['armas', 'lança', 'espada', 'arsenal'], [
    ...[-1, 1].flatMap(s => [rb([.08, 1.75, .1], [s * .78, .875, -.12], 'oak', .012), rb([.1, .08, .46], [s * .78, .04, 0], 'board', .01)]), ...[.5, 1.5].map(y => rb([1.66, .09, .07], [0, y, -.12], 'board', .01)), rb([1.66, .05, .26], [0, .1, .02], 'board', .01),
    // Three spears and a halberd.
    ...[-.56, -.34, -.12].flatMap(x => [{ ...cylinder(.016, 2.05, [x, 1.12, -.05], 'oak', .016, [-.03, 0, 0]), segments: 8 }, lathe([[0, 0], [.02, 0], [.034, .06], [.012, .22], [0, .26]], [x, 2.14, -.08], 'steel')]),
    { ...cylinder(.018, 2.0, [.1, 1.1, -.05], 'oak', .018, [-.03, 0, 0]), segments: 8 }, b([.2, .26, .012], [.19, 1.92, -.075], 'steel', [0, 0, .25]), lathe([[0, 0], [.016, 0], [.02, .05], [0, .22]], [.1, 2.1, -.08], 'steel'),
    // Two swords, point down, and a round shield at the foot.
    ...[.34, .56].flatMap(x => [b([.045, .78, .008], [x, .56, -.04], 'steel'), b([.2, .025, .03], [x, .96, -.04], 'brass'), { ...cylinder(.014, .15, [x, 1.05, -.04], 'leather'), segments: 8 }, lathe([[0, 0], [.022, .01], [.022, .03], [0, .04]], [x, 1.125, -.04], 'brass')]),
    lathe([[0, 0], [.3, .01], [.31, .03], [.1, .06], [.07, .1], [0, .11]], [.45, .42, .1], 'oak', 'z'), { ...r(.3, .012, [.45, .42, .12], 'iron'), segments: 24 },
  ], 'Cavalete com lanças, alabarda, duas espadas e um escudo redondo.');

  model('armor-stand', 'Armadura em cabide', 'Armas', ['Castelo', 'Arsenal', 'Salão'], ['armadura', 'elmo', 'cavaleiro'], [
    ...[0, PI / 2].map(a => b([.62, .05, .08], [0, .025, 0], 'board', [0, a, 0])), c(.03, 1.5, [0, .78, 0], 'board'), b([.56, .05, .05], [0, 1.4, 0], 'board'),
    e([.46, .56, .3], [0, 1.16, 0], 'steel'), e([.4, .2, .27], [0, .88, 0], 'steel'), ...[-1, 1].flatMap(s => [e([.2, .16, .22], [s * .3, 1.4, 0], 'steel'), e([.12, .34, .13], [s * .34, 1.17, 0], 'steel', [0, 0, s * .15]), e([.16, .42, .17], [s * .12, .58, 0], 'leather')]),
    b([.02, .5, .012], [0, 1.16, .152], 'brass'), ...along(4, .98, 1.34).map(y => b([.36, .012, .012], [0, y, .145], 'iron')),
    // Helm with visor slit and crest.
    { ...lathe([[0, 0], [.11, 0], [.125, .08], [.12, .2], [.07, .28], [0, .3]], [0, 1.52, 0], 'steel'), segments: 20 }, b([.16, .014, .02], [0, 1.66, .115], 'black'), b([.014, .1, .2], [0, 1.82, -.02], 'cloth'),
  ], 'Peitoral, espaldeiras, saiote e elmo com viseira sobre cabide de madeira.');

  model('shield', 'Escudo com espadas cruzadas', 'Armas', ['Castelo', 'Salão', 'Taverna'], ['escudo', 'espada', 'parede', 'brasão'], [
    ...[-1, 1].flatMap(s => [b([.04, 1.0, .008], [0, .5, -.02], 'steel', [0, 0, s * .7]), b([.18, .025, .025], [s * .245, .79, -.02], 'brass', [0, 0, s * .7])]),
    { ...lathe([[0, 0], [.33, .01], [.34, .03], [.33, .05], [.12, .07], [.08, .11], [0, .12]], [0, .5, 0], 'cloth', 'z'), segments: 28 }, { ...r(.335, .014, [0, .5, .03], 'iron'), segments: 28 },
    lathe([[0, 0], [.07, .01], [.05, .04], [0, .05]], [0, .5, .1], 'brass', 'z'), ...polar(8, .25, (x, y) => [lathe([[0, 0], [.014, 0], [.008, .012], [0, .014]], [x, .5 + y, .05], 'brass', 'z')]),
  ], 'Escudo redondo pintado, com umbo de latão, sobre duas espadas cruzadas. Fixe à parede.');

  model('banner', 'Estandarte de parede', 'Decoração', ['Castelo', 'Salão', 'Capela'], ['estandarte', 'bandeira', 'brasão', 'parede'], [
    { ...cylinder(.02, 1.1, [0, 1.78, 0], 'board', .02, [0, 0, PI / 2]), segments: 10 }, ...[-1, 1].map(s => lathe([[0, 0], [.03, .01], [.035, .04], [0, .07]], [s * .55, 1.78, 0], 'brass', 'x', { rotation: [0, 0, s * -PI / 2] })),
    b([.92, 1.3, .012], [0, 1.12, 0], 'cloth'), ...[-1, 0, 1].map(i => b([.2, .3, .012], [i * .3, .36, 0], 'cloth', [0, 0, PI / 4])), b([.92, .05, .016], [0, 1.72, 0], 'linen'), b([.08, 1.3, .016], [0, 1.12, 0], 'linen'),
    lathe([[0, 0], [.17, 0], [.17, .008], [0, .008]], [0, 1.2, .008], 'brass', 'z'), b([.06, .24, .01], [0, 1.2, .018], 'cloth'), b([.24, .06, .01], [0, 1.2, .018], 'cloth'), ...[-1, 1].map(s => curve([[s * .5, 1.78, 0], [s * .52, 1.9, -.02], [0, 1.98, -.04]], .006, 'straw')),
  ], 'Pano vermelho de pontas em bico com faixa e medalhão, pendurado em haste.');

  // Craft -----------------------------------------------------------------------------------------
  model('anvil', 'Bigorna sobre toco', 'Ofício', ['Ferraria', 'Oficina'], ['bigorna', 'ferreiro', 'forja'], [
    { ...lathe([[0, 0], [.3, 0], [.31, .04], [.28, .46], [0, .46]], [0, 0, 0], 'oak'), segments: 20 }, ...[.1, .36].map(y => ({ ...r(.3, .012, [0, y, 0], 'iron', FLAT), segments: 20 })),
    rb([.3, .06, .2], [0, .49, 0], 'iron', .01), b([.16, .1, .12], [0, .57, 0], 'iron'), rb([.44, .1, .16], [0, .67, 0], 'iron', .012), lathe([[0, 0], [.075, 0], [.05, .14], [0, .26]], [.22, .67, 0], 'iron', 'x', { rotation: [0, 0, -PI / 2] }),
    { ...cylinder(.016, .34, [-.06, .745, .02], 'oak', .016, [0, .5, PI / 2]), segments: 8 }, rb([.05, .05, .11], [.1, .745, -.07], 'steel', .008, [0, .5, 0]), curve([[-.3, .0, .3], [-.3, .3, .3], [-.2, .5, .28]], .01, 'iron'),
  ], 'Bigorna de ferro com bico, presa a um toco cintado, com martelo e tenaz.');

  model('forge', 'Forja de ferreiro', 'Ofício', ['Ferraria', 'Oficina'], ['forja', 'ferreiro', 'fogo', 'fole'], [
    rb([1.5, .86, 1.0], [0, .43, 0], 'stone', .025), rb([1.56, .08, 1.06], [0, .9, 0], 'stone', .02), b([.9, .06, .6], [0, .93, .05], 'black'), e([.7, .14, .46], [0, .98, .05], 'ember'), ...flames(0, 1.0, .05, 1.1),
    // Hood and chimney on four iron posts.
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => b([.05, .7, .05], [sx * .6, 1.29, sz * .36 + .02], 'iron'))), rb([1.4, .12, .9], [0, 1.7, .02], 'stone', .02), rb([1.0, .4, .64], [0, 1.95, 0], 'stone', .02), rb([.6, .7, .44], [0, 2.5, -.04], 'stone', .02),
    // Bellows at the side.
    e([.36, .2, .6], [-1.0, .86, .1], 'leather'), ...[-1, 1].map(s => rb([.34, .03, .62], [-1.0, .86 + s * .11, .1], 'board', .01)), b([.05, .7, .05], [-1.0, .35, .1], 'board'), b([.4, .05, .4], [-1.0, .025, .1], 'board'), { ...cylinder(.02, .34, [-.72, .9, .1], 'iron', .012, [0, 0, PI / 2]), segments: 8 }, { ...cylinder(.018, .5, [-1.0, 1.0, .5], 'board', .018, [PI / 2 - .3, 0, 0]), segments: 8 },
    // Quench tub and tools.
    { ...lathe([[0, 0], [.2, 0], [.23, .34], [.2, .34], [.18, .04], [0, .04]], [.98, 0, .3], 'board'), segments: 18 }, c(.19, .01, [.98, .28, .3], 'black'), ...[-.1, .1].map(x => curve([[x + .2, .96, .46], [x + .3, 1.0, .64]], .009, 'iron')),
  ], 'Fornalha de pedra com brasas, coifa e chaminé, fole de couro, tina de têmpera e tenazes.');

  // Yard ------------------------------------------------------------------------------------------
  model('market-stall', 'Barraca de feira', 'Exterior', ['Mercado', 'Vila', 'Feira'], ['barraca', 'feira', 'mercado', 'comércio'], [
    ...[-1, 1].flatMap(sx => [b([.07, 2.25, .07], [sx * 1.05, 1.125, -.6], 'board'), b([.07, 1.85, .07], [sx * 1.05, .925, .6], 'board')]),
    ...planks(2.2, .05, .8, [0, .84, .1], 3, 'oak', .006), b([2.16, .5, .03], [0, .56, .5], 'board'), ...[-1, 1].map(s => b([.03, .5, .78], [s * 1.07, .56, .1], 'board')),
    // Striped awning sloping to the front.
    ...along(7, -1.02, 1.02).map((x, i) => b([.3, .02, 1.5], [x, 2.06, 0], i % 2 ? 'linen' : 'cloth', [.27, 0, 0])), b([2.2, .05, .05], [0, 2.25, -.6], 'board'), b([2.2, .05, .05], [0, 1.85, .64], 'board'), ...along(7, -1.02, 1.02).map((x, i) => b([.3, .12, .012], [x, 1.78, .72], i % 2 ? 'linen' : 'cloth')),
    // Goods.
    rb([.5, .2, .4], [-.7, .97, .1], 'board', .01), ...polar(5, .13, (x, z) => [e([.13, .12, .13], [-.7 + x, 1.1, .1 + z], 'ember')]), e([.4, .26, .32], [0, 1.0, .05], 'linen'), ...along(3, .5, .9).map(x => lathe([[0, 0], [.06, 0], [.08, .1], [.05, .18], [.055, .2], [0, .2]], [x, .865, .12], 'stone')),
  ], 'Balcão de tábuas sob toldo listrado, com caixa de frutas, saco e potes.', .865);

  model('stocks', 'Pelourinho', 'Exterior', ['Vila', 'Praça', 'Castelo'], ['pelourinho', 'punição', 'praça'], [
    rb([1.7, .1, .6], [0, .05, 0], 'board', .015), ...[-1, 1].map(s => rb([.14, 1.5, .14], [s * .7, .82, 0], 'oak', .015)),
    rb([1.5, .2, .09], [0, 1.2, 0], 'oak', .012), rb([1.5, .2, .09], [0, 1.41, 0], 'oak', .012), ...[-.42, 0, .42].map((x, i) => lathe([[0, 0], [i === 1 ? .1 : .055, 0], [i === 1 ? .1 : .055, .1], [0, .1]], [x, 1.305, -.05], 'black', 'z')),
    ...[-1, 1].map(s => b([.03, .46, .012], [s * .62, 1.3, .052], 'iron')), r(.03, .008, [.62, 1.15, .07], 'iron'), ...chain([-.7, .6, .08], [-.5, .12, .2], .022, 'iron'),
  ], 'Duas pranchas com furos para cabeça e mãos entre postes, com ferrolho e corrente.');

  model('training-dummy', 'Boneco de treino', 'Exterior', ['Castelo', 'Quartel', 'Pátio'], ['treino', 'boneco', 'espada', 'pátio'], [
    ...[0, PI / 2].map(a => b([.9, .07, .1], [0, .035, 0], 'board', [0, a, 0])), c(.05, 1.75, [0, .92, 0], 'oak'), b([1.1, .07, .07], [0, 1.4, 0], 'oak'),
    e([.46, .62, .34], [0, 1.2, 0], 'straw'), e([.26, .28, .26], [0, 1.72, 0], 'straw'), ...[.98, 1.2, 1.42].map(y => ({ ...r(.2, .012, [0, y, 0], 'leather', FLAT), segments: 16 })), r(.1, .01, [0, 1.6, 0], 'leather', FLAT),
    lathe([[0, 0], [.2, .01], [.2, .03], [.05, .05], [0, .07]], [-.5, 1.32, .06], 'board', 'z'), { ...cylinder(.018, .7, [.52, 1.5, .06], 'board', .014, [.5, 0, -.2]), segments: 8 },
  ], 'Poste com travessa e corpo de palha amarrado, escudo num braço e bastão no outro.');

  model('palisade', 'Paliçada de troncos', 'Exterior', ['Vila', 'Castelo', 'Acampamento'], ['paliçada', 'cerca', 'muro', 'defesa'], [
    ...along(8, -.875, .875).flatMap((x, i) => { const h = 1.9 + (i * 37 % 5) * .05; return [{ ...cylinder(.118, h, [x, h / 2, 0], 'oak', .11), segments: 8 }, { ...cylinder(.11, .22, [x, h + .11, 0], 'oak', .012), segments: 8 }]; }),
    ...[.6, 1.4].map(y => b([1.98, .09, .05], [0, y, -.13], 'board')), ...[.6, 1.4].flatMap(y => along(4, -.75, .75).map(x => lathe([[0, 0], [.014, 0], [.008, .012], [0, .014]], [x, y, -.155], 'iron', 'z', { rotation: [-PI / 2, 0, 0] }))),
  ], 'Trecho de dois metros de troncos apontados, travados por dentro.');

  model('signpost', 'Placa de taverna', 'Exterior', ['Taverna', 'Vila', 'Estrada'], ['placa', 'taverna', 'poste'], [
    rb([.4, .08, .4], [0, .04, 0], 'stone', .015), rb([.12, 2.7, .12], [0, 1.39, 0], 'oak', .015), rb([.95, .08, .08], [.44, 2.5, 0], 'oak', .012), b([.5, .05, .05], [.3, 2.2, 0], 'board', [0, 0, .75]),
    ...[.3, .76].flatMap(x => chain([x, 2.46, 0], [x, 2.24, 0], .02, 'iron')), rb([.62, .46, .04], [.53, 2.0, 0], 'board', .012), 
    ...[-1, 1].flatMap(s => [b([.2, .22, .008], [.53, 2.0, s * .024], 'brass'), b([.1, .1, .008], [.66, 2.02, s * .024], 'brass'), b([.26, .04, .008], [.53, 2.14, s * .024], 'linen')]),
  ], 'Poste com braço, corrente e tabuleta de caneca pintada.');

  return ids;
}
