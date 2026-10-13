import { b, c, e, r, rb, lathe, curve, along, polar } from './library-atelier-kit.js';
import { cylinder } from './library-craft-parts.js';

/**
 * Futuristic kit: crew quarters, command, medicine, power, cargo and the
 * outside of a base. Authored in metres, front towards +Z, at most six
 * materials a model. Slot names are chosen to stay clear of the automatic
 * wood and stone finishes: `hull` is painted composite, `dark` its trim,
 * `steel` bare metal, `glow`/`alert`/`screen` emit light, `glass` is clear.
 */
const PI = Math.PI, FLAT = [PI / 2, 0, 0];
const MATERIALS = {
  hull: { color: '#d7dbde', roughness: .38 }, dark: { color: '#24282d', roughness: .5 }, steel: { color: '#9aa2a8', roughness: .3, metalness: .5 }, accent: { color: '#e27a2b', roughness: .45 },
  cloth: { color: '#3f5563', roughness: .95 }, black: { color: '#121416', roughness: .85 }, green: { color: '#4f8a4a', roughness: .95 },
  glow: { color: '#9fefff', emissive: '#36d2ff', emissiveIntensity: 1.3 }, alert: { color: '#ff8a70', emissive: '#ff4a2a', emissiveIntensity: 1.1 }, screen: { color: '#2a5d6b', emissive: '#2fa7c4', emissiveIntensity: .7, roughness: .3 },
  glass: { color: '#9ec3cf', opacity: .28, roughness: .06, metalness: .1 }, holo: { color: '#7fe6ff', emissive: '#42d8ff', emissiveIntensity: 1, opacity: .45 },
};
const strip = (w, [x, y, z], material = 'glow', depth = .012) => b([w, .025, depth], [x, y, z], material);
const foot = (x, z, radius = .05, height = .05) => lathe([[0, 0], [radius, 0], [radius, height * .5], [radius * .6, height], [0, height]], [x, 0, z], 'dark');
const vents = (w, h, [x, y, z], count = 5) => along(count, y - h / 2 + h / count / 2, y + h / 2 - h / count / 2).map(v => b([w, h / count * .45, .01], [x, v, z], 'black'));

export function addFutureLibrary({ add, future }) {
  const ids = new Set();
  const model = (id, name, category, contexts, tags, parts, description, supportHeight) => { const asset = add(`future-${id}`, name, `Futurista / ${category}`, future, contexts, ['futurista', 'ficção científica', ...tags], parts, description, supportHeight); asset.materials = MATERIALS; ids.add(asset.id); };

  // Crew ------------------------------------------------------------------------------------------
  model('bunk', 'Cápsula de descanso', 'Tripulação', ['Base', 'Nave', 'Alojamento'], ['cama', 'cápsula', 'descanso'], [
    rb([1.05, .3, 2.15], [0, .2, 0], 'hull', .05), rb([.98, .06, 2.08], [0, .03, 0], 'dark', .02), rb([.9, .1, 1.9], [0, .4, .05], 'cloth', .04), rb([.6, .09, .3], [0, .48, -.72], 'hull', .04),
    // Canopy over the head with a reading light.
    rb([1.05, .7, .1], [0, .7, -1.02], 'hull', .04), rb([1.05, .08, .85], [0, 1.06, -.64], 'hull', .03), ...[-1, 1].map(s => rb([.06, .64, .8], [s * .495, .74, -.64], 'glass', .02)), strip(.7, [0, 1.01, -.64], 'glow', .5),
    rb([.3, .2, .02], [0, .78, -.96], 'screen', .01), ...[-1, 1].map(s => b([.012, .025, 1.9], [s * .527, .2, 0], 'glow')), rb([1.05, .34, .08], [0, .32, 1.04], 'hull', .03),
  ], 'Leito embutido com dossel, luz de leitura e painel pessoal.');

  model('chair', 'Cadeira de comando', 'Tripulação', ['Base', 'Nave', 'Ponte'], ['cadeira', 'assento', 'comando'], [
    lathe([[0, 0], [.26, 0], [.27, .02], [.08, .05], [.045, .1], [.045, .38], [0, .38]], [0, 0, 0], 'dark'), rb([.5, .09, .48], [0, .44, .02], 'cloth', .03), rb([.54, .05, .5], [0, .385, .02], 'hull', .02),
    rb([.48, .62, .09], [0, .8, -.21], 'cloth', .04, [-.1, 0, 0]), rb([.52, .66, .04], [0, .8, -.255], 'hull', .03, [-.1, 0, 0]), rb([.26, .16, .08], [0, 1.18, -.25], 'cloth', .03, [-.1, 0, 0]),
    ...[-1, 1].flatMap(s => [rb([.06, .05, .34], [s * .29, .62, .04], 'hull', .02), b([.04, .2, .05], [s * .29, .51, -.08], 'dark'), strip(.02, [s * .29, .65, .18], 'glow', .04)]),
  ], 'Assento giratório estofado, com braços e encosto de cabeça.');

  model('table', 'Mesa de refeitório', 'Tripulação', ['Base', 'Nave', 'Refeitório'], ['mesa', 'refeição'], [
    rb([1.8, .05, .9], [0, .74, 0], 'hull', .02), rb([1.7, .02, .8], [0, .705, 0], 'dark', .01), ...[-.55, .55].flatMap(x => [lathe([[0, 0], [.2, 0], [.21, .02], [.06, .05], [.05, .1], [.05, .7], [0, .7]], [x, 0, 0], 'steel')]),
    b([1.2, .012, .012], [0, .768, 0], 'glow'), ...[-1, 1].map(s => b([.012, .012, .5], [s * .6, .768, 0], 'glow')),
  ], 'Tampo composto sobre dois pedestais, com guia luminosa.', .765);

  model('sofa', 'Banco estofado modular', 'Tripulação', ['Base', 'Nave', 'Saguão'], ['banco', 'sofá', 'assento'], [
    rb([1.9, .22, .7], [0, .15, 0], 'hull', .04), rb([1.8, .12, .58], [0, .32, .04], 'cloth', .04), rb([1.9, .5, .16], [0, .5, -.27], 'hull', .04), rb([1.76, .36, .1], [0, .56, -.18], 'cloth', .04),
    ...[-1, 1].map(s => rb([.1, .34, .7], [s * .9, .36, 0], 'hull', .04)), b([1.7, .02, .012], [0, .06, .351], 'glow'), ...[-.7, .7].map(x => foot(x, 0, .05, .04)),
  ], 'Banco de três lugares com base iluminada.');

  model('locker', 'Armário de equipamentos', 'Tripulação', ['Base', 'Nave', 'Alojamento'], ['armário', 'equipamento', 'guardar'], [
    rb([1.0, 1.95, .5], [0, .985, 0], 'hull', .03), rb([.96, .05, .46], [0, .025, 0], 'dark', .015), ...[-1, 1].flatMap(s => [rb([.46, 1.78, .02], [s * .245, .99, .252], 'hull', .012), b([.02, .5, .012], [s * .05, 1.0, .266], 'steel'), ...vents(.3, .16, [s * .245, 1.68, .263], 4), rb([.12, .06, .012], [s * .245, 1.35, .263], 'screen', .005)]),
    b([.012, 1.78, .012], [0, .99, .256], 'black'), strip(.9, [0, 1.94, .2], 'glow', .06),
  ], 'Armário duplo com respiros, fechos e identificação luminosa.');

  model('hygiene-pod', 'Cabine sanitária', 'Tripulação', ['Base', 'Nave'], ['banheiro', 'higiene', 'cabine'], [
    lathe([[0, 0], [.5, 0], [.52, .04], [.52, .1], [0, .1]], [0, 0, 0], 'dark'), { ...lathe([[.5, 0], [.5, 1.9]], [0, .1, 0], 'glass'), segments: 28 }, lathe([[0, 0], [.52, 0], [.52, .08], [.3, .14], [0, .15]], [0, 2.0, 0], 'hull'),
    ...polar(4, .5, (x, z) => [c(.03, 1.9, [x, 1.05, z], 'hull')], PI / 4), rb([.3, .34, .3], [0, .27, -.22], 'hull', .05), lathe([[0, 0], [.14, 0], [.16, .04], [.1, .05], [0, .03]], [0, .44, -.22], 'dark'), rb([.34, .5, .06], [0, 1.2, -.44], 'hull', .02), rb([.2, .14, .012], [0, 1.3, -.405], 'screen', .005), lathe([[0, 0], [.07, 0], [.05, .03], [0, .03]], [0, 1.96, 0], 'glow'),
  ], 'Cabine cilíndrica de vidro com sanitário, painel e luz no teto.');

  model('synthesizer', 'Sintetizador de alimentos', 'Tripulação', ['Base', 'Nave', 'Refeitório'], ['cozinha', 'comida', 'máquina'], [
    rb([1.3, .9, .62], [0, .45, 0], 'hull', .03), rb([1.34, .04, .66], [0, .92, 0], 'dark', .012), rb([1.3, 1.0, .34], [0, 1.44, -.14], 'hull', .03),
    rb([.56, .46, .04], [-.3, 1.4, .04], 'black', .02), rb([.5, .4, .012], [-.3, 1.4, .062], 'glass', .01), b([.4, .012, .2], [-.3, 1.24, -.04], 'glow'), rb([.4, .3, .012], [.34, 1.52, .035], 'screen', .008), ...along(4, .16, .52).map(x => lathe([[0, 0], [.022, 0], [.022, .012], [0, .012]], [x, 1.26, .035], 'accent', 'z')),
    ...[-.32, .32].flatMap(x => [rb([.58, .7, .02], [x, .46, .312], 'hull', .012), b([.3, .02, .014], [x, .76, .326], 'steel')]), strip(1.24, [0, .945, .3], 'glow'), lathe([[0, 0], [.05, 0], [.06, .1], [.05, .1], [.045, .012], [0, .012]], [.2, .94, .12], 'steel'),
  ], 'Bancada com nicho de preparo iluminado, painel e gavetas.', .94);

  // Command and data ------------------------------------------------------------------------------
  model('console', 'Console de comando', 'Comando', ['Base', 'Nave', 'Ponte'], ['console', 'controle', 'tela', 'comando'], [
    rb([1.7, .7, .6], [0, .35, -.05], 'hull', .03), rb([1.74, .05, .64], [0, .025, -.05], 'dark', .015), rb([1.7, .06, .5], [0, .78, .08], 'dark', .02, [.28, 0, 0]),
    ...[-.55, 0, .55].map(x => rb([.46, .01, .3], [x, .816, .09], 'screen', .005, [.28, 0, 0])), ...along(9, -.72, .72).map((x, i) => lathe([[0, 0], [.018, 0], [.018, .012], [0, .012]], [x, .762, .29], i % 3 ? 'glow' : 'alert', null, { rotation: [.28, 0, 0] })),
    rb([1.7, .56, .06], [0, 1.2, -.3], 'hull', .02), ...[-.57, 0, .57].map(x => rb([.5, .42, .012], [x, 1.2, -.266], 'screen', .008)), strip(1.6, [0, .08, .252], 'glow'), ...vents(.5, .2, [0, .4, .252], 4),
  ], 'Mesa inclinada com três telas, teclas luminosas e painel superior.');

  model('wall-screen', 'Tela tática de parede', 'Comando', ['Base', 'Nave', 'Ponte'], ['tela', 'mapa', 'parede'], [
    rb([1.8, 1.0, .05], [0, .5, 0], 'dark', .02), rb([1.7, .9, .012], [0, .5, .028], 'screen', .01), ...along(4, -.6, .6).map((x, i) => b([.3, .012 + i * .0, .004], [x, .2 + i * .14, .036], 'glow')), { ...r(.2, .008, [.3, .56, .036], 'glow'), segments: 24 }, { ...r(.1, .006, [.3, .56, .036], 'alert'), segments: 20 },
    b([.012, .7, .004], [-.2, .5, .036], 'glow'), ...[-1, 1].map(s => b([.04, 1.0, .07], [s * .9, .5, 0], 'hull')),
  ], 'Painel largo com mapa, gráficos e marcador de alvo. Fixe à parede.');

  model('terminal', 'Terminal de parede', 'Comando', ['Base', 'Nave', 'Corredor'], ['terminal', 'painel', 'parede', 'acesso'], [
    rb([.5, .7, .08], [0, .35, 0], 'hull', .025), rb([.38, .3, .012], [0, .47, .042], 'screen', .008), ...along(3, -.12, .12).flatMap(x => along(2, .16, .24).map(y => rb([.08, .05, .012], [x, y, .044], 'dark', .006))),
    rb([.12, .03, .014], [0, .07, .044], 'alert', .006), strip(.44, [0, .685, .02], 'glow', .06),
  ], 'Painel de acesso com tela, teclado e indicador. Fixe à parede.');

  model('holo-table', 'Mesa holográfica', 'Comando', ['Base', 'Nave', 'Ponte'], ['holograma', 'mapa', 'mesa'], [
    lathe([[0, 0], [.5, 0], [.52, .04], [.3, .1], [.24, .6], [.62, .72], [.66, .8], [.62, .82], [0, .82]], [0, 0, 0], 'hull'), { ...r(.6, .012, [0, .825, 0], 'glow', FLAT), segments: 32 }, lathe([[0, 0], [.5, 0], [.5, .012], [0, .012]], [0, .82, 0], 'screen'),
    // A planet with its ring, drawn in light above the table.
    e([.5, .5, .5], [0, 1.3, 0], 'holo'), { ...r(.42, .006, [0, 1.3, 0], 'holo', [PI / 2 - .35, 0, 0]), segments: 32 }, { ...lathe([[.02, 0], [.3, .42]], [0, .84, 0], 'holo'), segments: 24 }, ...polar(4, .44, (x, z) => [lathe([[0, 0], [.03, 0], [.03, .02], [0, .02]], [x, .83, z], 'alert')], PI / 4),
  ], 'Pedestal com projetor e um planeta em holograma.');

  model('server', 'Núcleo de dados', 'Comando', ['Base', 'Nave', 'Laboratório'], ['servidor', 'dados', 'computador'], [
    rb([.8, 2.0, .7], [0, 1.0, 0], 'dark', .03), rb([.7, 1.8, .012], [0, 1.02, .352], 'glass', .01), ...along(8, .25, 1.8).flatMap((y, i) => [rb([.62, .16, .03], [0, y, .32], 'hull', .008), ...along(5, -.24, .24).map((x, j) => b([.03, .02, .008], [x, y, .338], (i + j) % 4 ? 'glow' : 'alert'))]),
    ...[-1, 1].map(s => b([.012, 1.9, .5], [s * .403, 1.0, 0], 'glow')), ...vents(.6, .1, [0, .08, .352], 3),
  ], 'Torre de módulos atrás de vidro, com luzes de atividade.');

  // Medicine and science --------------------------------------------------------------------------
  model('medbed', 'Leito médico com scanner', 'Medicina', ['Base', 'Nave', 'Enfermaria'], ['leito', 'médico', 'scanner'], [
    rb([.7, .5, 1.5], [0, .3, 0], 'hull', .05), rb([.76, .05, 1.56], [0, .025, 0], 'dark', .02), rb([.86, .1, 2.0], [0, .62, 0], 'hull', .04), rb([.74, .06, 1.84], [0, .7, 0], 'cloth', .03), rb([.5, .06, .28], [0, .75, -.72], 'hull', .03),
    // Scanner arch over the chest.
    ...[-1, 1].map(s => rb([.07, .62, .26], [s * .47, .96, -.1], 'hull', .03)), rb([1.0, .09, .26], [0, 1.3, -.1], 'hull', .03), b([.8, .012, .16], [0, 1.25, -.1], 'glow'),
    rb([.34, .24, .04], [.56, 1.1, -.7], 'screen', .01), c(.02, .5, [.56, .86, -.7], 'steel'), b([.012, .02, 1.8], [.435, .62, 0], 'glow'), b([.012, .02, 1.8], [-.435, .62, 0], 'glow'),
  ], 'Maca fixa com arco de varredura e monitor de sinais.', .73);

  model('cryo-pod', 'Cápsula criogênica', 'Medicina', ['Base', 'Nave', 'Laboratório'], ['criogenia', 'cápsula', 'sono'], [
    lathe([[0, 0], [.52, 0], [.54, .05], [.5, .2], [0, .2]], [0, 0, 0], 'dark'), { ...lathe([[.44, 0], [.46, .9], [.4, 1.5], [.2, 1.78]], [0, .2, 0], 'glass'), segments: 28 }, lathe([[0, 0], [.2, 0], [.22, .05], [.12, .12], [0, .13]], [0, 1.98, 0], 'hull'),
    rb([.6, 1.9, .2], [0, 1.15, -.42], 'hull', .05), e([.34, 1.3, .22], [0, 1.05, -.05], 'cloth'), e([.2, .24, .2], [0, 1.78, -.05], 'hull'),
    ...[-1, 1].map(s => curve([[s * .3, .2, -.38], [s * .5, .7, -.3], [s * .34, 1.3, -.4]], .02, 'steel')), rb([.24, .16, .012], [0, .5, .46], 'screen', .006), { ...r(.5, .012, [0, .22, 0], 'glow', FLAT), segments: 28 }, { ...r(.24, .01, [0, 1.94, 0], 'glow', FLAT), segments: 20 },
  ], 'Tubo de vidro com ocupante em suspensão, mangueiras e painel.');

  model('reactor', 'Núcleo de energia', 'Engenharia', ['Base', 'Nave', 'Reator'], ['reator', 'energia', 'núcleo'], [
    lathe([[0, 0], [.75, 0], [.78, .06], [.6, .16], [.5, .4], [0, .4]], [0, 0, 0], 'dark'), lathe([[0, 0], [.5, 0], [.6, .24], [.78, .34], [.75, .4], [0, .4]], [0, 1.9, 0], 'dark'),
    { ...lathe([[.34, 0], [.34, 1.5]], [0, .4, 0], 'glass'), segments: 28 }, { ...lathe([[0, 0], [.14, .05], [.2, .5], [.24, .75], [.2, 1.0], [.14, 1.45], [0, 1.5]], [0, .4, 0], 'glow'), segments: 20 },
    ...polar(4, .42, (x, z) => [rb([.1, 1.5, .1], [x, 1.15, z], 'hull', .02), b([.02, 1.2, .012], [x * 1.13, 1.15, z * 1.13], 'alert')], PI / 4), ...[.7, 1.15, 1.6].map(y => ({ ...r(.36, .014, [0, y, 0], 'steel', FLAT), segments: 28 })),
    ...polar(3, .68, (x, z) => [curve([[x, .1, z], [x * .8, .5, z * .8], [x * .5, .42, z * .5]], .03, 'steel')], .4),
  ], 'Coluna de plasma dentro de vidro, entre dois anéis, com dutos e alertas.');

  model('cell', 'Célula de combustível', 'Engenharia', ['Base', 'Nave', 'Depósito'], ['combustível', 'célula', 'tambor'], [
    lathe([[0, 0], [.26, 0], [.3, .04], [.3, .2], [.27, .24], [.27, .66], [.3, .7], [.3, .86], [.26, .9], [0, .9]], [0, 0, 0], 'hull'), { ...lathe([[.275, 0], [.275, .42]], [0, .24, 0], 'glow'), segments: 24 },
    ...polar(4, .285, (x, z) => [b([.05, .46, .05], [x, .45, z], 'dark')], PI / 4), lathe([[0, 0], [.12, 0], [.12, .04], [.06, .06], [0, .06]], [0, .9, 0], 'steel'), ...[.12, .78].map(y => ({ ...r(.305, .01, [0, y, 0], 'accent', FLAT), segments: 24 })),
  ], 'Tambor selado com janela luminosa e faixas de aviso.');

  model('workbench', 'Bancada de engenharia', 'Engenharia', ['Base', 'Nave', 'Oficina'], ['bancada', 'oficina', 'braço robótico'], [
    rb([1.9, .06, .8], [0, .9, 0], 'dark', .02), rb([1.8, .8, .7], [0, .45, -.02], 'hull', .03), ...[-.6, 0, .6].flatMap(x => [rb([.54, .3, .02], [x, .68, .34], 'hull', .012), b([.3, .02, .014], [x, .78, .354], 'steel'), rb([.54, .34, .02], [x, .3, .34], 'hull', .012)]),
    rb([1.9, .5, .05], [0, 1.2, -.37], 'dark', .02), rb([.7, .34, .012], [-.5, 1.22, -.34], 'screen', .008), ...along(5, .1, .8).map(x => b([.03, .26, .03], [x, 1.2, -.33], 'steel')),
    // A small arm with two joints and a welding tip.
    lathe([[0, 0], [.1, 0], [.1, .06], [.05, .08], [0, .08]], [.6, .93, .1], 'steel'), curve([[.6, 1.0, .1], [.6, 1.3, .1], [.4, 1.42, .16]], .03, 'accent'), curve([[.4, 1.42, .16], [.22, 1.24, .22]], .022, 'steel'), lathe([[0, 0], [.02, .0], [.008, .06], [0, .06]], [.2, 1.16, .22], 'glow'),
    strip(1.8, [0, .87, .35], 'glow'),
  ], 'Tampo com gavetas, painel de ferramentas, tela e braço articulado.', .93);

  // Cargo -----------------------------------------------------------------------------------------
  model('crate', 'Contêiner de carga', 'Carga', ['Base', 'Nave', 'Depósito'], ['caixa', 'carga', 'contêiner'], [
    rb([1.0, .7, .7], [0, .37, 0], 'hull', .04), ...[-1, 1].flatMap(s => [rb([.1, .76, .76], [s * .465, .38, 0], 'dark', .03), rb([1.0, .09, .09], [0, .38 + s * .335, .325], 'dark', .02), rb([1.0, .09, .09], [0, .38 + s * .335, -.325], 'dark', .02)]),
    rb([.5, .3, .012], [0, .4, .352], 'accent', .01), rb([.16, .08, .014], [.3, .62, .352], 'screen', .005), ...[-.25, .25].map(x => rb([.14, .04, .05], [x, .74, 0], 'steel', .012)),
  ], 'Caixa reforçada com faixa de identificação, alças e leitor.', .74);

  model('shelf', 'Estante modular de carga', 'Carga', ['Base', 'Nave', 'Depósito'], ['estante', 'prateleira', 'carga'], [
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => b([.05, 2.0, .05], [sx * .72, 1.0, sz * .22], 'steel'))), ...[.12, .72, 1.32, 1.92].map(y => rb([1.5, .04, .5], [0, y, 0], 'dark', .01)),
    ...[[.3, -.4, 'hull'], [.3, .2, 'accent'], [.9, -.2, 'hull'], [.9, .42, 'hull'], [1.5, -.42, 'accent'], [1.5, .1, 'hull']].map(([y, x, material]) => rb([.46, .34, .4], [x, y + .01, 0], material, .03)), ...[.12, .72, 1.32].map(y => strip(1.4, [0, y + .03, .246], 'glow', .008)),
  ], 'Montantes de aço com quatro prateleiras e caixas.');

  model('weapon-rack', 'Rack de armas', 'Carga', ['Base', 'Nave', 'Arsenal'], ['armas', 'rifle', 'arsenal'], [
    rb([1.5, 1.9, .16], [0, .95, -.1], 'dark', .03), rb([1.4, .05, .3], [0, .05, 0], 'hull', .012), strip(1.4, [0, 1.86, -.02], 'glow', .04),
    ...[-.5, -.17, .17, .5].flatMap(x => [rb([.07, .9, .06], [x, 1.05, 0], 'steel', .02), rb([.1, .3, .09], [x, .5, 0], 'black', .03), rb([.06, .2, .12], [x, .78, .03], 'black', .02), b([.02, .3, .014], [x, 1.2, .035], 'glow'), rb([.16, .05, .1], [x, 1.5, 0], 'hull', .015), rb([.16, .05, .1], [x, .34, 0], 'hull', .015)]),
  ], 'Painel com quatro rifles presos, base e luz superior.');

  // Automata and devices --------------------------------------------------------------------------
  model('droid', 'Droide de serviço', 'Autômatos', ['Base', 'Nave', 'Oficina'], ['robô', 'droide', 'serviço'], [
    lathe([[0, 0], [.28, 0], [.3, .05], [.3, .14], [.18, .2], [0, .2]], [0, 0, 0], 'dark'), lathe([[0, 0], [.2, 0], [.26, .2], [.28, .5], [.24, .7], [0, .72]], [0, .2, 0], 'hull'), { ...r(.275, .012, [0, .62, 0], 'accent', FLAT), segments: 24 },
    lathe([[0, 0], [.1, 0], [.1, .06], [0, .06]], [0, .92, 0], 'steel'), e([.34, .3, .34], [0, 1.12, 0], 'hull'), rb([.22, .07, .02], [0, 1.14, .16], 'black', .01), ...[-.05, .05].map(x => lathe([[0, 0], [.022, 0], [.022, .01], [0, .01]], [x, 1.14, .172], 'glow', 'z')),
    ...[-1, 1].flatMap(s => [e([.1, .12, .12], [s * .3, .76, 0], 'steel'), curve([[s * .32, .74, 0], [s * .4, .5, .08], [s * .36, .34, .2]], .028, 'hull'), lathe([[0, 0], [.03, 0], [.012, .07], [0, .07]], [s * .36, .28, .22], 'steel')]), c(.008, .2, [.1, 1.36, -.05], 'steel'), lathe([[0, 0], [.014, .0], [.014, .02], [0, .02]], [.1, 1.46, -.05], 'alert'),
  ], 'Corpo sobre base rolante, cabeça com visor, dois braços e antena.');

  model('turret', 'Torreta de sentinela', 'Autômatos', ['Base', 'Perímetro', 'Posto'], ['torreta', 'defesa', 'sentinela'], [
    lathe([[0, 0], [.4, 0], [.42, .05], [.3, .14], [.16, .2], [.14, .9], [.22, .96], [0, .96]], [0, 0, 0], 'dark'), ...polar(3, .34, (x, z) => [rb([.14, .06, .14], [x, .03, z], 'hull', .02)], .5),
    rb([.5, .34, .56], [0, 1.14, 0], 'hull', .05), ...[-1, 1].flatMap(s => [{ ...cylinder(.035, .7, [s * .14, 1.16, .5], 'steel', .035, FLAT), segments: 12 }, { ...cylinder(.05, .12, [s * .14, 1.16, .2], 'dark', .05, FLAT), segments: 12 }, lathe([[0, 0], [.02, 0], [.02, .01], [0, .01]], [s * .14, 1.16, .85], 'alert', 'z')]),
    rb([.2, .1, .02], [0, 1.26, .285], 'screen', .008), lathe([[0, 0], [.05, 0], [.05, .05], [0, .07]], [0, 1.31, -.1], 'glow'),
  ], 'Coluna com cabeça giratória, dois canos e sensor.');

  model('hydroponics', 'Módulo de hidroponia', 'Engenharia', ['Base', 'Nave', 'Estufa'], ['planta', 'estufa', 'hidroponia'], [
    rb([.9, .5, .5], [0, .25, 0], 'hull', .04), rb([.84, .05, .44], [0, .5, 0], 'dark', .01), ...along(4, -.3, .3).flatMap((x, i) => [c(.012, .3 + i % 2 * .08, [x, .66 + i % 2 * .04, 0], 'green'), e([.2, .16, .2], [x, .86 + i % 2 * .08, 0], 'green'), e([.14, .1, .16], [x + .04, .74, .06], 'green')]),
    ...[-1, 1].map(s => b([.03, .9, .03], [s * .42, .95, -.2], 'steel')), rb([.9, .05, .2], [0, 1.4, -.2], 'hull', .015), b([.8, .012, .14], [0, 1.372, -.2], 'glow'), rb([.2, .1, .012], [0, .3, .252], 'screen', .005),
  ], 'Cuba de cultivo com mudas e lâmpada de crescimento.');

  // Light -----------------------------------------------------------------------------------------
  model('ceiling-lamp', 'Painel de luz de teto', 'Luz', ['Base', 'Nave', 'Corredor'], ['luz', 'teto', 'painel'], [
    rb([1.2, .06, .5], [0, .05, 0], 'hull', .02), rb([1.08, .02, .38], [0, .012, 0], 'glow', .008), ...[-1, 1].map(s => b([.04, .07, .5], [s * .58, .045, 0], 'dark')),
  ], 'Painel luminoso embutido. Fonte de luz vinculável.');

  model('light-column', 'Coluna de luz', 'Luz', ['Base', 'Nave', 'Saguão'], ['luz', 'coluna', 'luminária'], [
    lathe([[0, 0], [.18, 0], [.19, .03], [.07, .07], [.06, .12], [0, .12]], [0, 0, 0], 'dark'), { ...lathe([[.05, 0], [.05, 1.4]], [0, .12, 0], 'glow'), segments: 16 }, lathe([[0, 0], [.07, 0], [.08, .03], [.05, .06], [0, .06]], [0, 1.52, 0], 'dark'), ...[.5, 1.0].map(y => ({ ...r(.055, .008, [0, y, 0], 'steel', FLAT), segments: 16 })),
  ], 'Tubo luminoso entre duas bases. Fonte de luz vinculável.');

  // Outside ---------------------------------------------------------------------------------------
  model('lamp-post', 'Poste de perímetro', 'Exterior', ['Base', 'Perímetro', 'Colônia'], ['poste', 'luz', 'exterior'], [
    lathe([[0, 0], [.2, 0], [.21, .04], [.08, .1], [.06, .2], [.05, 3.3], [0, 3.3]], [0, 0, 0], 'dark'), rb([.9, .07, .22], [.4, 3.32, 0], 'hull', .02), b([.7, .014, .16], [.45, 3.28, 0], 'glow'), rb([.14, .2, .04], [0, 1.3, .07], 'screen', .008),
  ], 'Haste com braço e painel de luz voltado para baixo.');

  model('barrier', 'Barreira de energia', 'Exterior', ['Base', 'Perímetro', 'Colônia'], ['barreira', 'cerca', 'campo de força'], [
    ...[-1, 1].flatMap(s => [lathe([[0, 0], [.13, 0], [.14, .04], [.08, .1], [.07, 1.7], [.1, 1.74], [0, 1.78]], [s * .93, 0, 0], 'dark'), lathe([[0, 0], [.04, 0], [.04, .04], [0, .05]], [s * .93, 1.78, 0], 'alert')]),
    ...[.4, .9, 1.4].map(y => b([1.76, .03, .02], [0, y, 0], 'glow')), b([1.76, 1.3, .006], [0, .9, 0], 'holo'),
  ], 'Dois emissores com feixes e campo translúcido entre eles. Trecho de dois metros.');

  model('dish', 'Antena parabólica', 'Exterior', ['Base', 'Colônia', 'Posto'], ['antena', 'comunicação', 'parabólica'], [
    lathe([[0, 0], [.5, 0], [.52, .06], [.2, .14], [.12, .9], [0, .9]], [0, 0, 0], 'dark'), e([.24, .24, .24], [0, .96, 0], 'steel'),
    { ...lathe([[0, 0], [.3, .02], [.6, .1], [.85, .24], [.9, .3], [.86, .3], [.6, .14], [.3, .06], [0, .04]], [0, 1.0, .1], 'hull', null, { rotation: [.9, 0, 0] }), segments: 28 },
    curve([[0, 1.1, .16], [0, 1.6, .8]], .012, 'steel'), lathe([[0, 0], [.05, 0], [.05, .08], [0, .1]], [0, 1.58, .78], 'alert', null, { rotation: [.9, 0, 0] }), rb([.3, .3, .3], [.3, .15, -.3], 'hull', .03), strip(.2, [.3, .2, -.148], 'glow'),
  ], 'Prato inclinado sobre coluna, com alimentador e caixa de controle.');

  model('solar-panel', 'Painel solar', 'Exterior', ['Base', 'Colônia', 'Posto'], ['energia', 'solar', 'painel'], [
    ...[-.7, .7].map(x => lathe([[0, 0], [.16, 0], [.17, .04], [.06, .08], [.05, .8], [0, .8]], [x, 0, 0], 'dark')), b([1.9, .06, .06], [0, .8, 0], 'steel'),
    rb([2.2, .05, 1.3], [0, .98, 0], 'hull', .015, [.5, 0, 0]), ...along(4, -.81, .81).flatMap(x => along(2, -.3, .3).map(z => rb([.5, .012, .56], [x, .98 + z * -.479 + .03, z * .878], 'screen', .006, [.5, 0, 0]))),
  ], 'Mesa inclinada de oito células sobre dois pés.');

  model('speeder', 'Veículo flutuante', 'Exterior', ['Base', 'Colônia', 'Rua'], ['veículo', 'transporte', 'flutuante'], [
    e([1.7, .7, 3.9], [0, .75, 0], 'hull'), e([1.3, .56, 1.9], [0, 1.05, -.2], 'glass'), rb([1.5, .12, 3.0], [0, .5, 0], 'dark', .05), rb([1.2, .1, .8], [0, .78, 1.45], 'accent', .04),
    ...[-1, 1].flatMap(s => [e([.34, .3, 1.1], [s * .82, .56, -1.1], 'dark'), lathe([[0, 0], [.12, 0], [.12, .04], [0, .04]], [s * .82, .56, -1.66], 'glow', 'z', { rotation: [-PI / 2, 0, 0] }), e([.3, .12, .9], [s * .6, .32, .9], 'glow'), rb([.06, .05, .3], [s * .78, .8, 1.7], 'alert', .02)]),
    e([.3, .12, .9], [0, .32, -.9], 'glow'), ...[-.4, .4].map(x => rb([.2, .06, .05], [x, .74, 1.92], 'glow', .02)),
  ], 'Carro sem rodas, com cabine de vidro, propulsores e sustentação luminosa.');

  return ids;
}
