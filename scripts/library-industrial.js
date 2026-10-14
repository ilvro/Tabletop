import { cableDefaults, cableDepth, cableRecipe } from '../src/domain/cables.js';
import { b, c, e, r, rb, p, lathe, curve, along, polar, bolts, withSurface } from './library-atelier-kit.js';

/**
 * Industrial kit: pipe runs, the fittings that join them, what holds them to
 * a ceiling, doors and signs of a plant, and what a derelict one collects:
 * rubble, loose paper and plants coming through. Authored in metres, front
 * towards +Z, at most six materials a model. Pieces meant for a ceiling hang
 * from their top; pipes lie on y = 0 so a run is built by height.
 */
const PI = Math.PI;
const MATERIALS = {
  pipe: { color: '#4b5457', roughness: .62, metalness: .35 }, rust: { color: '#6a4632', roughness: .85, metalness: .2 }, steel: { color: '#8a9194', roughness: .42, metalness: .5 },
  dark: { color: '#23272b', roughness: .7, metalness: .2 }, black: { color: '#141618', roughness: .9 }, yellow: { color: '#d6a31f', roughness: .6 },
  concrete: { color: '#77756f', roughness: .96 }, tile: { color: '#6c6660', roughness: .7 }, paper: { color: '#cdc6b1', roughness: .95 },
  leaf: { color: '#4a6a37', roughness: .95 }, stem: { color: '#3b3424', roughness: .95 },
  alert: { color: '#ff7a6a', emissive: '#ff2414', emissiveIntensity: 1.8 }, glow: { color: '#e9f6ff', emissive: '#bfe6ff', emissiveIntensity: 1.5 }, glass: { color: '#b9c9cc', opacity: .3, roughness: .08 },
};
// Chipped paint over rust on everything that is a pipe; concrete and leaves take their own textures.
const PAINT = { texture: 'paint', paintChips: .26, paintBase: 'rust', textureColor: '#4b5457', textureColorMode: 'replace', textureSize: 1.2 };
const CONCRETE = { texture: 'concrete', textureSize: 1.4 }, LEAVES = { texture: 'foliage', textureSize: .6, relief: .008 };
const painted = parts => withSurface(parts, PAINT);
/** A broken piece of slab: a block with a chipped edge, lying however it fell. */
const chunk = (size, position, rotation) => withSurface([rb(size, position, 'concrete', Math.min(...size) * .12, rotation)], CONCRETE)[0];
/** Flange with its bolt circle at `x`, facing along X. */
const flange = (x, y, z, radius, material = 'steel') => [c(radius * 1.42, .035, [x, y, z], material, 'x'), ...polar(6, radius * 1.2, (u, v) => c(.012, .05, [x, y + u, z + v], 'dark', 'x'))];
/** A straight pipe along X resting on the ground line, with a flange at each end. */
const run = (length, radius, z = 0, y = radius * 1.42) => [...painted([c(radius, length, [0, y, z], 'pipe', 'x')]), ...[-1, 1].flatMap(s => flange(s * (length / 2 - .018), y, z, radius))];
/** Threaded rod with a nut, hanging from `top`. */
const rod = (x, z, bottom, top) => [c(.008, top - bottom, [x, (top + bottom) / 2, z], 'steel'), c(.016, .014, [x, bottom + .012, z], 'dark'), c(.03, .008, [x, top - .004, z], 'dark')];
const stripes = (w, h, [x, y, z], count, depth = .006) => along(count, x - w / 2 + w / count / 2, x + w / 2 - w / count / 2).map(u => p([[-w / count * .28, -h / 2], [w / count * .22, -h / 2], [w / count * .28, h / 2], [-w / count * .22, h / 2]], depth, [u, y, z], 'black'));
const vine = (points, radius = .012) => curve(points, radius, 'stem');
const leaves = (style, size, position, seed, count, rotation) => ({ shape: 'foliage', style, size, count, seed, position, material: 'leaf', surface: LEAVES, ...(rotation ? { rotation } : {}) });

export function addIndustrialLibrary({ add, modern }) {
  const ids = new Set();
  const model = (id, name, category, contexts, tags, parts, description, supportHeight) => { const asset = add(`industrial-${id}`, name, `Industrial / ${category}`, modern, contexts, ['industrial', 'fábrica', ...tags], parts, description, supportHeight); asset.materials = MATERIALS; ids.add(asset.id); };
  const PLANT = ['Fábrica', 'Galpão', 'Laboratório', 'Subsolo'];

  // Pipes -----------------------------------------------------------------------------------------
  model('pipe-straight', 'Tubo reto · 2 m', 'Tubulação', PLANT, ['tubo', 'cano', 'tubulação'], run(2, .08),
    'Trecho de 2 m com flanges parafusadas. Suba pela altura para montar linhas no teto ou na parede.');
  model('pipe-long', 'Tubo reto · 4 m', 'Tubulação', PLANT, ['tubo', 'cano', 'tubulação'], [
    ...run(4, .08), ...flange(0, .1136, 0, .08), ...painted([c(.086, .3, [0, .1136, 0], 'pipe', 'x')]),
  ], 'Trecho de 4 m com luva de emenda no meio.');
  model('pipe-elbow', 'Curva de tubo · 90°', 'Tubulação', PLANT, ['tubo', 'curva', 'cotovelo'], [
    ...painted([curve([[-.5, .1136, 0], [-.16, .1136, 0], [-.05, .1136, .05], [0, .1136, .16], [0, .1136, .5]], .08, 'pipe')]),
    ...flange(-.482, .1136, 0, .08), c(.1136, .035, [0, .1136, .482], 'steel', 'z'), ...polar(6, .096, (u, v) => c(.012, .05, [u, .1136 + v, .482], 'dark', 'z')),
  ], 'Curva no plano do chão, com flange nas duas pontas.');
  model('pipe-elbow-up', 'Curva de tubo · sobe', 'Tubulação', PLANT, ['tubo', 'curva', 'subida'], [
    ...painted([curve([[-.5, .1136, 0], [-.16, .1136, 0], [-.05, .16, 0], [0, .28, 0], [0, .62, 0]], .08, 'pipe')]),
    ...flange(-.482, .1136, 0, .08), c(.1136, .035, [0, .602, 0], 'steel'), ...polar(6, .096, (u, v) => c(.012, .05, [u, .602, v], 'dark')),
  ], 'Curva que leva uma linha horizontal para cima.');
  model('pipe-tee', 'Tê de tubo', 'Tubulação', PLANT, ['tubo', 'derivação', 'tê'], [
    ...run(1, .08), ...painted([c(.08, .5, [0, .1136, .25], 'pipe', 'z')]), c(.1136, .035, [0, .1136, .482], 'steel', 'z'), ...polar(6, .096, (u, v) => c(.012, .05, [u, .1136 + v, .482], 'dark', 'z')),
    ...painted([e([.2, .2, .2], [0, .1136, 0], 'pipe')]),
  ], 'Derivação de uma linha, com três flanges.');
  model('pipe-riser', 'Tubo vertical de parede · 3 m', 'Tubulação', PLANT, ['tubo', 'prumada', 'parede'], [
    ...painted([c(.07, 3, [0, 1.5, .1], 'pipe')]), ...[.25, 1.5, 2.75].flatMap(y => [rb([.24, .05, .012], [0, y, .006], 'steel', .004), r(.074, .012, [0, y, .1], 'steel', [PI / 2, 0, 0]), ...[-1, 1].map(s => c(.01, .02, [s * .095, y, .02], 'dark', 'z'))]),
    c(.1, .03, [0, .015, .1], 'steel'), c(.1, .03, [0, 2.985, .1], 'steel'), ...[1, 2].map(y => r(.072, .008, [0, y, .1], 'rust', [PI / 2, 0, 0])),
  ], 'Prumada com três abraçadeiras. Encoste na parede.');
  model('pipe-bundle', 'Feixe de três tubos · 3 m', 'Tubulação', PLANT, ['tubo', 'linha', 'teto'], [
    ...painted([-.22, 0, .22].map((z, i) => c([.05, .07, .04][i], 3, [0, .12, z], 'pipe', 'x'))), ...[-1.1, 0, 1.1].flatMap(x => [b([.04, .03, .66], [x, .03, 0], 'steel'), ...[-1, 1].flatMap(s => rod(x, s * .31, .03, .55)), ...[-.22, 0, .22].map((z, i) => r([.054, .074, .044][i], .008, [x, .12, z], 'dark', [0, PI / 2, 0]))]),
    ...[-.22, .22].map(z => r(.058, .01, [.6, .12, z], 'rust', [0, PI / 2, 0])),
  ], 'Três linhas em suportes de tirante. O topo dos tirantes toca o teto.');
  model('duct', 'Duto grosso · 3 m', 'Tubulação', PLANT, ['duto', 'tubo', 'teto', 'ventilação'], [
    ...painted([c(.28, 3, [0, .3, 0], 'pipe', 'x')]), ...[-1.49, 1.49].map(x => c(.33, .04, [x, .3, 0], 'steel', 'x')), ...[-1.49, 1.49].flatMap(x => polar(10, .305, (u, v) => c(.012, .06, [x, .3 + u, v], 'dark', 'x'))),
    ...along(4, -1, 1).map(x => r(.284, .012, [x, .3, 0], 'rust', [0, PI / 2, 0])), ...[-.9, .9].flatMap(x => [r(.292, .016, [x, .3, 0], 'steel', [0, PI / 2, 0]), ...[-1, 1].flatMap(s => rod(x, s * .3, .3, .95))]),
  ], 'Duto de 56 cm com anéis de reforço e duas braçadeiras de tirante. O topo dos tirantes toca o teto.');
  model('pipe-hanger', 'Suporte de tubos de teto', 'Tubulação', PLANT, ['suporte', 'tirante', 'teto'], [
    ...[-1, 1].flatMap(s => rod(s * .4, 0, .02, .6)), b([.9, .035, .05], [0, .0175, 0], 'steel'), ...[-1, 1].map(s => b([.012, .05, .05], [s * .444, .03, 0], 'steel')), ...bolts([[-.2, .035, 0], [.2, .035, 0]], .012, 'dark', undefined),
  ], 'Travessa em dois tirantes rosqueados, para apoiar linhas de tubo ou cabos.');
  model('cable-tray', 'Eletrocalha · 2 m', 'Tubulação', PLANT, ['eletrocalha', 'cabos', 'teto'], [
    ...[-1, 1].map(s => b([2, .06, .008], [0, .03, s * .2], 'steel')), ...along(9, -.94, .94).map(x => b([.03, .008, .4], [x, .008, 0], 'steel')),
    ...[-.1, .02, .12].map((z, i) => c(.016 + i * .003, 1.98, [0, .03 + i * .002, z], 'black', 'x')), c(.012, 1.98, [0, .028, -.03], 'dark', 'x'), ...[-.8, .8].flatMap(x => [-1, 1].flatMap(s => rod(x, s * .2, .05, .5))),
  ], 'Calha em escada com quatro cabos, pendurada em tirantes.');

  // Structure and openings ------------------------------------------------------------------------
  model('column', 'Coluna de aço · 3 m', 'Estrutura', PLANT, ['coluna', 'viga', 'estrutura'], [
    b([.3, 3, .012], [0, 1.5, 0], 'steel'), ...[-1, 1].map(s => b([.016, 3, .26], [s * .15, 1.5, 0], 'steel')), rb([.42, .025, .38], [0, .0125, 0], 'dark', .004), rb([.42, .025, .38], [0, 2.9875, 0], 'dark', .004),
    ...bolts([[-.17, .025, -.15], [.17, .025, -.15], [-.17, .025, .15], [.17, .025, .15]], .016, 'dark', undefined), b([.3, .34, .014], [0, .19, 0], 'yellow'), ...stripes(.3, .34, [0, .19, .008], 4, .005), ...stripes(.3, .34, [0, .19, -.008], 4, .005),
  ], 'Perfil em H com chapas de base e topo e faixa de alerta ao pé.');
  model('blast-door', 'Portão industrial de duas folhas', 'Estrutura', PLANT, ['porta', 'portão', 'entrada'], [
    // Heavy frame, two ribbed leaves, a lintel with a sign plate and a lamp over it.
    ...[-1, 1].map(s => rb([.3, 3, .34], [s * 1.75, 1.5, 0], 'dark', .02)), rb([3.8, .4, .34], [0, 3.2, 0], 'dark', .02), ...painted([-1, 1].map(s => rb([1.58, 2.96, .1], [s * .8, 1.5, 0], 'pipe', .012))),
    ...[-1, 1].flatMap(s => [.5, 1.2, 1.9, 2.6].map(y => rb([1.4, .09, .03], [s * .8, y, .06], 'steel', .01))), b([.03, 2.96, .12], [0, 1.5, .01], 'black'),
    ...[-1, 1].flatMap(s => [rb([.08, .5, .05], [s * .12, 1.3, .08], 'steel', .012), b([1.58, .26, .008], [s * .8, .16, .054], 'yellow'), ...stripes(1.58, .26, [s * .8, .16, .059], 7, .005)]),
    rb([1.5, .26, .02], [0, 3.2, .18], 'steel', .008), rb([1.38, .16, .006], [0, 3.2, .192], 'black', .004), ...[-1.4, 1.4].map(x => rb([.2, .12, .1], [x, 3.2, .2], 'alert', .03)),
    ...[-1, 1].flatMap(s => along(4, .4, 2.6).map(y => c(.03, .05, [s * 1.62, y, .16], 'steel', 'z'))),
  ], 'Batente pesado, duas folhas nervuradas, faixa de alerta, placa para letreiro e duas luzes de aviso. É um objeto: não abre passagem na parede.');
  model('hazard-band', 'Faixa de alerta de parede · 2 m', 'Sinalização', PLANT, ['faixa', 'alerta', 'segurança', 'listras'], withSurface([
    b([2, .3, .016], [0, .15, .008], 'yellow'),
  ], { texture: 'hazard', hazardAngle: 45, hazardWidth: .1, hazardWear: .2 }), 'Faixa amarela e preta de 30 cm, do material Listras de alerta: ângulo, largura, cores e desgaste em Propriedades. Fixe à parede na altura desejada e repita lado a lado, ou cole uma faixa de qualquer comprimento com Decalque.');
  model('warning-light', 'Luz de aviso de parede', 'Sinalização', PLANT, ['luz', 'alarme', 'aviso', 'vermelha'], [
    rb([.2, .2, .05], [0, .14, .025], 'dark', .012), lathe([[0, 0], [.07, 0], [.075, .03], [.06, .12], [.03, .16], [0, .165]], [0, .14, .05], 'alert', 'z', { segments: 16 }),
    ...polar(6, .082, (u, v) => curve([[u, .14 + v, .05], [u * 1.02, .14 + v * 1.02, .14], [u * .5, .14 + v * .5, .225], [0, .14, .235]], .005, 'steel')), r(.082, .006, [0, .14, .12], 'steel'), c(.014, .1, [0, .02, .03], 'black'),
  ], 'Lâmpada vermelha em grade, sobre caixa de parede. Fonte de luz vinculável.');
  model('tube-light', 'Luminária fluorescente pendente', 'Sinalização', PLANT, ['luz', 'fluorescente', 'teto'], [
    rb([1.3, .05, .22], [0, .075, 0], 'dark', .012), ...[-.055, .055].map(z => c(.016, 1.2, [0, .034, z], 'glow', 'x')), ...[-1, 1].flatMap(s => [b([.03, .04, .2], [s * .615, .04, 0], 'steel'), ...rod(s * .45, 0, .1, .7)]),
    ...along(7, -.5, .5).map(x => b([.006, .012, .2], [x, .012, 0], 'steel')),
  ], 'Calha com dois tubos e grade, em dois tirantes. O topo dos tirantes toca o teto. Fonte de luz vinculável.');

  // Furniture -------------------------------------------------------------------------------------
  model('metal-table', 'Mesa de aço tubular', 'Mobiliário', [...PLANT, 'Oficina'], ['mesa', 'bancada', 'metal'], [
    rb([1.5, .03, .7], [0, .765, 0], 'steel', .008), ...[-1, 1].flatMap(s => [-1, 1].map(q => c(.018, .75, [s * .7, .375, q * .3], 'dark'))), ...[-1, 1].map(q => c(.014, 1.4, [0, .18, q * .3], 'dark', 'x')), ...[-1, 1].map(s => c(.014, .6, [s * .7, .18, 0], 'dark', 'z')),
    rb([1.36, .012, .56], [0, .2, 0], 'steel', .004), ...[-1, 1].flatMap(s => [-1, 1].map(q => c(.026, .012, [s * .7, .006, q * .3], 'black'))),
  ], 'Tampo de chapa sobre quadro de tubo, com prateleira baixa.', .78);
  model('metal-shelf', 'Estante de aço', 'Mobiliário', [...PLANT, 'Depósito'], ['estante', 'prateleira', 'metal'], [
    ...[-1, 1].flatMap(s => [-1, 1].map(q => b([.035, 1.9, .035], [s * .58, .95, q * .2], 'dark'))), ...[.12, .58, 1.04, 1.5, 1.88].map(y => rb([1.2, .02, .44], [0, y, 0], 'steel', .004)),
    ...[-1, 1].map(s => b([.012, .02, .58], [s * .58, .8, 0], 'dark', [.8, 0, 0])), rb([.36, .26, .3], [-.3, .72, 0], 'rust', .01), rb([.3, .2, .28], [.25, 1.15, .02], 'paper', .008), c(.09, .24, [.36, .25, 0], 'pipe'), rb([.42, .1, .3], [-.2, 1.56, 0], 'dark', .01),
  ], 'Montantes perfurados e cinco prateleiras de chapa, com caixas e uma lata esquecidas.');

  // What a derelict place collects ----------------------------------------------------------------
  model('rubble-concrete', 'Entulho de concreto', 'Abandono', [...PLANT, 'Ruína'], ['entulho', 'escombros', 'concreto'], [
    chunk([.74, .2, .5], [0, .13, 0], [.12, .4, .08]), chunk([.44, .16, .36], [.5, .1, .24], [.3, 1.1, -.1]), chunk([.5, .12, .3], [-.3, .22, .1], [-.5, -.3, .5]), chunk([.32, .14, .26], [-.5, .07, .3], [0, .7, .1]),
    chunk([.24, .1, .2], [.22, .05, -.4], [.1, 2, .3]), chunk([.16, .08, .14], [-.32, .04, -.32], [0, .3, 0]), chunk([.12, .06, .1], [.64, .03, -.18], [.2, 1.4, 0]), chunk([.1, .05, .08], [.1, .03, .5], [0, .9, .2]),
    curve([[-.1, .2, .05], [.2, .42, .1], [.5, .46, 0]], .008, 'rust'), curve([[.1, .16, -.1], [-.2, .36, -.2], [-.44, .3, -.36]], .008, 'rust'),
  ], 'Oito pedaços de laje quebrada com vergalhões expostos.');
  model('rubble-tiles', 'Piso solto e quebrado', 'Abandono', [...PLANT, 'Ruína'], ['entulho', 'piso', 'ladrilho', 'quebrado'], [
    ...[[0, 0, 0, 0], [.34, .02, .1, .5], [-.3, .015, .2, -.3], [.1, .03, -.34, 1.2], [-.42, .0, -.2, .8], [.52, .0, -.26, -.6], [-.1, .05, .36, 2.1], [.3, .045, .44, .2]].map(([x, y, z, a], i) => rb([.3, .02, .3], [x, .01 + y, z], 'tile', .004, [i % 3 ? .06 * (i % 2 ? 1 : -1) : 0, a, i % 4 === 1 ? .1 : 0])),
    chunk([.12, .04, .1], [.62, .02, .2], [0, .5, .1]), chunk([.09, .035, .08], [-.56, .018, .1], [.1, 1.3, 0]), chunk([.07, .03, .06], [.02, .015, -.6], [0, 2.2, .1]),
  ], 'Oito placas levantadas, viradas e empilhadas, com lascas em volta.');
  model('scattered-papers', 'Papéis espalhados', 'Abandono', [...PLANT, 'Escritório', 'Arquivo'], ['papel', 'documentos', 'chão'], [
    ...[[0, 0, .2], [.3, .2, -.5], [-.34, .1, 1.1], [.12, -.36, .7], [-.2, -.3, -.2], [.5, -.1, 1.9], [-.52, -.18, 2.6], [.36, .44, .1], [-.06, .4, 1.5]].map(([x, z, a], i) => b([.21, .0015, .297], [x, .002 + i * .0016, z], 'paper', [0, a, 0])),
    rb([.24, .03, .32], [-.46, .016, .42], 'yellow', .004, [0, .5, 0]), b([.22, .002, .3], [-.44, .033, .43], 'paper', [0, .58, 0]),
  ], 'Folhas soltas e uma pasta caída.');
  model('floor-weeds', 'Mato nascendo do piso', 'Abandono', [...PLANT, 'Ruína'], ['mato', 'planta', 'abandono', 'vegetação'], [
    leaves('grass', [.5, .55, .5], [0, 0, 0], 411, 30), leaves('grass', [.36, .4, .36], [.26, 0, .16], 412, 20), leaves('fern', [.5, .4, .5], [-.2, 0, -.14], 413, 6), leaves('grass', [.3, .3, .3], [-.3, 0, .24], 414, 14),
    chunk([.2, .025, .16], [.3, .03, -.22], [.3, .5, .1]), chunk([.14, .02, .1], [-.06, .02, .34], [-.2, 1.3, .15]), chunk([.16, .022, .12], [-.34, .025, -.3], [.1, 2.4, -.25]),
  ], 'Tufos de capim e uma samambaia rompendo o piso, com lascas levantadas.');
  model('hanging-vines', 'Trepadeira pendente', 'Abandono', [...PLANT, 'Ruína'], ['trepadeira', 'cipó', 'planta', 'teto', 'vegetação'], [
    // Stems drop from the ceiling line at y = 2; leaves gather where they bend.
    vine([[0, 2, 0], [.04, 1.5, .03], [-.05, .9, 0], [.02, .3, .05]]), vine([[.2, 2, .06], [.26, 1.6, .02], [.18, 1.15, .08]], .009), vine([[-.22, 2, -.04], [-.3, 1.4, 0], [-.2, .7, -.06]], .01), vine([[.06, 2, -.14], [.1, 1.75, -.2], [.02, 1.45, -.16]], .008),
    vine([[-.22, 2, -.04], [-.05, 1.96, 0], [.2, 2, .06]], .009),
    ...[[0, 1.72, 0, .5, .6], [.24, 1.5, .04, .4, .5], [-.27, 1.3, -.02, .46, .6], [.0, 1.0, .02, .42, .56], [-.2, .76, -.05, .34, .44], [.03, .4, .05, .3, .4], [.06, 1.62, -.18, .3, .36]].map(([x, y, z, w, h], i) => leaves('fern', [w, h, w], [x, y, z], 431 + i, 7, [PI, i * .9, 0])),
  ], 'Cipós que descem 1,7 m do teto, com folhas caídas. O topo toca o teto.');
  // The cable is drawn from its own settings once it is in a scene; this is what the library shows and what a single click places.
  const sample = cableDefaults(), depth = cableDepth(sample);
  model('cable', 'Cabos pendentes', 'Tubulação', [...PLANT, 'Ruína'], ['cabo', 'fio', 'teto', 'pendurado'], cableRecipe(sample).parts.map(part => ({ ...part, points: part.points.map(([x, y, z]) => [x - 1.5, y + depth + .02, z]), material: 'black' })),
    'Feixe de fios com barriga entre dois pontos, ou solto de um só. Vão, folga, quantidade de fios e espessura são ajustados em Propriedades.');
  // The decal is drawn from its own settings once it is in a scene; this is the plate the library shows, with a stencilled stripe.
  const decal = add('decal', 'Decalque', 'Industrial / Sinalização', modern, [...PLANT, 'Escritório', 'Ruína'], ['industrial', 'decalque', 'letreiro', 'placa', 'adesivo', 'marca'], [
    b([1.2, .3, .01], [0, .15, .005], 'steel'), b([1.12, .22, .006], [0, .15, .011], 'black'), ...stripes(1.12, .22, [0, .15, .012], 6, .006),
  ], 'Letreiro, marca ou faixa colada numa parede, no piso ou num objeto: texto, imagem da biblioteca ou uma faixa de material. Clique na superfície para colar; tamanho, fonte e desgaste em Propriedades.');
  decal.materials = MATERIALS; ids.add(decal.id);
  // A roof for a plant: slabs side by side. The lower face sits on the top of the walls, so the model stands on the wall tops.
  model('ceiling-slab', 'Laje de cobertura · 4,2 m', 'Estrutura', PLANT, ['teto', 'laje', 'cobertura', 'concreto'], withSurface([
    rb([4.2, .22, 4.2], [0, .11, 0], 'concrete', .02),
  ], CONCRETE), 'Laje de concreto de 4,2 × 4,2 m e 22 cm. A face de baixo fica na altura do objeto: ponha-a no topo das paredes e emende várias lado a lado. "Telhados" a esconde.');
  return ids;
}
