/** Original, offline metric props. Run from the project root: node scripts/generate-library.js. */
import { readFile, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { recipeInstance, disposeObject } from '../src/render/asset-cache.js';
import { addLibraryExpansion } from './library-expansion.js';
import { addLibraryExpansion3 } from './library-expansion-3.js';
import { addMountainLibrary } from './library-mountain.js';
import { addAlpineLibrary } from './library-alpine.js';

const materials = {
  wood: { color: '#79553e', roughness: .84 }, dark: { color: '#292b30', roughness: .8 },
  metal: { color: '#87918e', roughness: .5, metalness: .55 }, rust: { color: '#824b34', roughness: .95, metalness: .25 },
  cloth: { color: '#64776e', roughness: .98 }, white: { color: '#d8d3bd', roughness: .72 },
  stone: { color: '#777873', roughness: .97 }, black: { color: '#181a20', roughness: .85 },
  red: { color: '#873c3c', roughness: .86 }, paper: { color: '#c8b38b', roughness: .98 },
  screen: { color: '#436f6b', emissive: '#356c68', emissiveIntensity: .45, roughness: .4 },
  wax: { color: '#d8bd87', roughness: .85 }, flame: { color: '#edb45e', emissive: '#ef943d', emissiveIntensity: .9 },
  violet: { color: '#77529b', emissive: '#64408d', emissiveIntensity: .5 }, green: { color: '#405b43', roughness: 1 },
};
const b = (size, position, material = 'wood', rotation) => ({ shape: 'box', size, position, material, ...(rotation ? { rotation } : {}) });
const c = (radius, height, position, material = 'metal', radiusTop = radius, rotation) => ({ shape: 'cylinder', radiusTop, radiusBottom: radius, height, position, material, segments: 12, ...(rotation ? { rotation } : {}) });
const s = (radius, position, material = 'stone') => ({ shape: 'sphere', radius, position, material });
const legs = (w, d, h, material = 'wood') => [-1, 1].flatMap(x => [-1, 1].map(z => b([.07, h, .07], [x * (w / 2 - .1), h / 2, z * (d / 2 - .1)], material)));
const table = (w, d, h = .8, material = 'wood') => [b([w, .08, d], [0, h - .04, 0], material), ...legs(w, d, h - .08, material)];
const wheels = (w, d, r = .12) => [-1, 1].flatMap(x => [-1, 1].map(z => c(r, .06, [x * w / 2, r, z * d / 2], 'black', r, [0, 0, Math.PI / 2])));
const shelf = (w, d, h, count = 4, material = 'wood') => [b([.07, h, d], [-w / 2 + .035, h / 2, 0], material), b([.07, h, d], [w / 2 - .035, h / 2, 0], material), b([w, h, .04], [0, h / 2, -d / 2 + .02], material), ...Array.from({ length: count + 1 }, (_, i) => b([w, .05, d], [0, .025 + i * (h - .05) / count, 0], material))];
const ring = (radius, y, material = 'red', count = 20) => Array.from({ length: count }, (_, i) => {
  const a = i * Math.PI * 2 / count; return b([.035, .014, radius * Math.PI * 2 / count], [Math.cos(a) * radius, y, Math.sin(a) * radius], material, [0, -a, 0]);
});
const assets = [];
function add(id, name, category, era, contexts, tags, parts, description, supportHeight) {
  assets.push({ id: `builtin-${id}`, revision: 1, type: 'recipe', name, category, era, contexts, tags, parts, description,
    ...(supportHeight ? { supportHeight } : {}), provenance: 'Modelo original Tabletop; distribuído com a aplicação. Não é um asset oficial de Ordem Paranormal.' });
}
const modern = 'Contemporânea', retro = 'Décadas de 1970–1990', historic = 'Início do século XX', colonial = 'Colonial / século XIX', ancient = 'Antiguidade', timeless = 'Atemporal';

add('dining-table', 'Mesa de jantar rústica', 'Mobiliário / Mesas', colonial, ['Casa', 'Fazenda'], ['mesa', 'madeira', 'refeição', 'rural'], table(2.2, 1, .78), 'Mesa comprida para casas antigas e refeições na fazenda.', .78);
add('bench', 'Banco de madeira', 'Mobiliário / Assentos', colonial, ['Fazenda', 'Igreja', 'Vila'], ['banco', 'madeira', 'rural'], table(1.6, .42, .45), 'Banco baixo de madeira maciça.', .45);
add('bookshelf', 'Estante de livros antigos', 'Mobiliário / Armazenamento', colonial, ['Biblioteca', 'Casa', 'Arquivo'], ['livros', 'pesquisa', 'conhecimento', 'madeira'], [...shelf(1.2, .38, 1.9), ...Array.from({ length: 24 }, (_, i) => b([.055, .24 + (i % 3) * .03, .24], [-.48 + (i % 8) * .135, .2 + Math.floor(i / 8) * .46, .01], ['red', 'paper', 'dark'][i % 3]))], 'Estante abastecida para investigação em arquivos e bibliotecas.');
add('single-bed', 'Cama de ferro antiga', 'Mobiliário / Dormitório', historic, ['Casa', 'Hospital', 'Asilo'], ['cama', 'ferro', 'repouso'], [b([1, .17, 2], [0, .43, 0], 'cloth'), b([.65, .1, .38], [0, .565, -.72], 'white'), ...legs(1, 2, .35, 'metal'), ...[-1, 1].flatMap(z => [b([1, .045, .05], [0, .85, z], 'metal'), ...[-.45, -.15, .15, .45].map(x => c(.024, .65, [x, .55, z], 'metal'))])], 'Estrutura tubular com cabeceiras e colchão.', .515);
add('bunk-bed', 'Beliche de alojamento', 'Mobiliário / Dormitório', modern, ['Alojamento', 'Prisão', 'Bunker'], ['cama', 'beliche', 'militar'], [b([1, .16, 2], [0, .48, 0], 'cloth'), b([1, .16, 2], [0, 1.55, 0], 'cloth'), ...legs(1.2, 2.2, 1.95, 'metal'), ...[-.45, .45].map(x => c(.022, 1.6, [x, .8, 1.06])), ...Array.from({ length: 5 }, (_, i) => b([.9, .035, .035], [0, .25 + i * .3, 1.06], 'metal'))], 'Duas camas com escada de acesso.');
add('sofa', 'Sofá de sala', 'Mobiliário / Assentos', retro, ['Casa', 'Hotel'], ['sofá', 'tecido', 'descanso'], [b([1.9, .2, .8], [0, .22, 0], 'dark'), b([1.65, .18, .66], [0, .41, .05], 'cloth'), b([1.9, .55, .18], [0, .67, -.35], 'cloth'), ...[-1, 1].map(x => b([.17, .44, .8], [x * .865, .48, 0], 'cloth')), ...legs(1.9, .8, .12, 'wood')], 'Sofá com encosto e braços estofados.');
add('wardrobe', 'Guarda-roupa de casarão', 'Mobiliário / Armazenamento', colonial, ['Casa', 'Hotel'], ['armário', 'madeira', 'casarão'], [b([1.3, 1.9, .65], [0, .95, 0]), ...[-1, 1].map(x => b([.61, 1.75, .04], [x * .32, .97, .35], 'dark')), ...[-1, 1].map(x => s(.035, [x * .07, .98, .39], 'metal')), b([1.42, .1, .73], [0, 1.96, 0])], 'Armário de duas portas com acabamento escuro.');
add('stove', 'Fogão a lenha', 'Mobiliário / Cozinha', colonial, ['Fazenda', 'Casa'], ['fogão', 'cozinha', 'lenha', 'rural'], [b([1.3, .7, .72], [0, .35, 0], 'stone'), b([1.36, .06, .76], [0, .73, 0], 'black'), ...[-.34, .34].map(x => c(.17, .02, [x, .77, 0], 'metal')), b([.4, .32, .04], [-.22, .34, .38], 'black'), c(.11, 1.5, [.47, 1.52, -.2], 'dark')], 'Fogão rústico com chapa, fornalha e chaminé.');
add('fridge', 'Geladeira antiga', 'Mobiliário / Cozinha', retro, ['Casa', 'Laboratório', 'Hospital'], ['geladeira', 'cozinha', 'conservação'], [b([.72, 1.6, .7], [0, .8, 0], 'white'), b([.67, .48, .035], [0, 1.31, .365], 'metal'), b([.67, 1.02, .035], [0, .52, .365], 'white'), ...[.8, 1.3].map(y => b([.035, .22, .05], [.26, y, .4], 'dark'))], 'Geladeira de duas portas para cozinhas e armazenamento de amostras.');
add('sink', 'Pia com bancada', 'Mobiliário / Cozinha', modern, ['Casa', 'Laboratório', 'Hospital'], ['pia', 'água', 'higiene'], [b([1.2, .72, .55], [0, .36, 0], 'white'), b([1.26, .05, .6], [0, .745, 0], 'stone'), b([.55, .015, .36], [0, .777, 0], 'metal'), c(.025, .23, [0, .89, -.22]), b([.18, .035, .035], [.065, 1, -.22], 'metal')], 'Bancada com cuba e torneira.', .77);
add('bathtub', 'Banheira de casarão', 'Mobiliário / Banheiro', historic, ['Casa', 'Hotel', 'Asilo'], ['banheira', 'água', 'higiene'], [b([.8, .13, 1.7], [0, .2, 0], 'white'), ...[-1, 1].map(x => b([.09, .4, 1.7], [x * .405, .45, 0], 'white')), ...[-1, 1].map(z => b([.8, .4, .09], [0, .45, z * .805], 'white')), ...legs(.85, 1.7, .16, 'metal')], 'Banheira aberta com pés metálicos.');

add('crt-tv', 'Televisão de tubo', 'Tecnologia / Analógica', retro, ['Casa', 'Delegacia', 'Hotel'], ['televisão', 'analógico', 'energia', 'transmissão'], [b([.7, .5, .46], [0, .3, 0], 'dark'), b([.53, .35, .025], [-.055, .32, .242], 'screen'), ...[.2, .3].map(y => s(.028, [.285, y, .265], 'metal')), ...[-1, 1].map(x => c(.006, .45, [x * .11, .73, 0], 'metal', .006, [0, 0, x * .5])), b([.6, .05, .4], [0, .025, 0], 'black')], 'Tela de tubo, seletores e antenas para cenas de gravação ou interferência.');
add('computer', 'Terminal de computador', 'Tecnologia / Computadores', modern, ['Escritório', 'Laboratório', 'Bunker'], ['computador', 'dados', 'investigação', 'energia'], [b([.68, .43, .055], [0, .49, -.17], 'dark'), b([.61, .36, .015], [0, .49, -.134], 'screen'), c(.035, .2, [0, .17, -.17]), b([.32, .03, .23], [0, .045, -.17], 'dark'), b([.54, .04, .18], [-.04, .02, .14], 'black'), b([.08, .04, .12], [.31, .02, .14], 'dark')], 'Monitor, base, teclado e mouse para bancadas de pesquisa.');
add('radio', 'Rádio de comunicação', 'Tecnologia / Analógica', retro, ['Delegacia', 'Bunker', 'Fazenda'], ['rádio', 'comunicação', 'analógico', 'investigação'], [b([.5, .28, .2], [0, .14, 0], 'dark'), b([.22, .17, .015], [-.1, .14, .108], 'black'), b([.14, .05, .015], [.15, .2, .108], 'screen'), s(.035, [.14, .09, .12], 'metal'), c(.007, .4, [-.18, .46, -.05], 'metal')], 'Receptor de mesa com alto-falante e antena.');
add('telephone', 'Telefone de disco', 'Tecnologia / Analógica', historic, ['Escritório', 'Casa', 'Delegacia'], ['telefone', 'comunicação', 'analógico'], [b([.32, .07, .26], [0, .035, 0], 'black'), c(.08, .015, [0, .082, .055], 'metal'), b([.35, .055, .07], [0, .18, -.075], 'black'), ...[-1, 1].map(x => c(.055, .08, [x * .14, .13, -.075], 'black'))], 'Telefone antigo com disco e monofone.');
add('security-camera', 'Câmera de vigilância', 'Tecnologia / Vigilância', modern, ['Bunker', 'Delegacia', 'Laboratório'], ['câmera', 'vigilância', 'segurança', 'parede'], [b([.16, .28, .04], [0, .14, -.15], 'metal'), b([.045, .045, .2], [0, .18, -.05], 'dark'), b([.17, .14, .32], [0, .27, .13], 'white'), c(.045, .02, [0, .27, .3], 'black', .045, [Math.PI / 2, 0, 0])], 'Câmera cenográfica com suporte; use a fixação de parede do editor.');
add('server-rack', 'Rack de servidores', 'Tecnologia / Computadores', modern, ['Bunker', 'Laboratório', 'Escritório'], ['servidor', 'dados', 'energia', 'tecnologia'], [b([.65, 1.9, .8], [0, .95, 0], 'dark'), ...Array.from({ length: 10 }, (_, i) => b([.56, .13, .04], [0, .2 + i * .16, .42], 'black')), ...Array.from({ length: 10 }, (_, i) => b([.03, .03, .015], [-.22, .2 + i * .16, .448], i % 2 ? 'screen' : 'violet'))], 'Equipamento com módulos e indicadores emissivos.');
add('generator', 'Gerador portátil', 'Industrial / Máquinas', modern, ['Bunker', 'Acampamento', 'Indústria'], ['gerador', 'energia', 'máquina', 'metal'], [b([.8, .05, .55], [0, .04, 0], 'dark'), ...legs(.85, .6, .6, 'metal'), b([.6, .26, .44], [0, .53, 0], 'red'), c(.17, .46, [0, .26, 0], 'dark', .17, [0, 0, Math.PI / 2]), b([.2, .2, .03], [-.22, .28, .245], 'metal')], 'Motor em armação de transporte; objeto cenográfico, sem luz automática.');
add('barrel', 'Tambor industrial', 'Industrial / Armazenamento', retro, ['Indústria', 'Depósito', 'Laboratório'], ['tambor', 'metal', 'químico', 'perigo'], [c(.3, .9, [0, .45, 0], 'rust'), ...[.12, .78].map(y => c(.312, .035, [0, y, 0], 'dark')), c(.035, .025, [.12, .913, 0], 'metal')], 'Tambor com aros e tampa para depósitos e resíduos.');
add('workbench', 'Bancada de oficina', 'Industrial / Oficina', retro, ['Indústria', 'Garagem', 'Depósito'], ['bancada', 'ferramentas', 'oficina', 'metal'], [...table(1.8, .7, .9, 'metal'), b([1.8, .07, .7], [0, .935, 0]), b([.23, .16, .2], [.6, 1.05, .16], 'dark'), b([1.8, .7, .05], [0, 1.3, -.32], 'rust'), ...Array.from({ length: 5 }, (_, i) => b([.035, .24, .03], [-.65 + i * .3, 1.3, -.28], 'metal'))], 'Bancada com torno e ferramentas no painel traseiro.', .97);
add('locker', 'Armários de vestiário', 'Industrial / Armazenamento', modern, ['Indústria', 'Hospital', 'Alojamento'], ['armário', 'vestiário', 'metal'], [b([1.2, 1.85, .5], [0, .925, 0], 'metal'), ...[-.4, 0, .4].flatMap(x => [b([.36, 1.76, .035], [x, .925, .268], 'cloth'), b([.025, .12, .025], [x + .11, .9, .296], 'dark'), ...[1.5, 1.56, 1.62].map(y => b([.22, .018, .01], [x, y, .29], 'black'))])], 'Três compartimentos metálicos com ventilação.');

add('gurney', 'Maca hospitalar', 'Saúde / Mobiliário', modern, ['Hospital', 'Laboratório', 'Asilo'], ['maca', 'medicina', 'sangue', 'metal'], [b([.75, .12, 1.9], [0, .78, 0], 'white'), ...legs(.75, 1.9, .65, 'metal'), ...wheels(.64, 1.65, .08), ...[-1, 1].map(x => b([.035, .035, 1.5], [x * .4, .96, 0], 'metal')), b([.55, .08, .35], [0, .88, -.7], 'cloth')], 'Maca com rodas, travesseiro e grades laterais.', .84);
add('wheelchair', 'Cadeira de rodas', 'Saúde / Mobiliário', modern, ['Hospital', 'Asilo'], ['cadeira', 'medicina', 'mobilidade'], [b([.5, .08, .5], [0, .48, 0], 'dark'), b([.5, .5, .07], [0, .73, -.23], 'cloth'), ...[-1, 1].map(x => c(.31, .04, [x * .34, .31, -.14], 'metal', .31, [0, 0, Math.PI / 2])), ...wheels(.5, .6, .06), ...[-1, 1].map(x => b([.04, .04, .6], [x * .27, .69, .04], 'metal')), b([.5, .03, .18], [0, .15, .39], 'metal')], 'Assento com rodas grandes e apoio para pés.');
add('microscope', 'Microscópio de laboratório', 'Saúde / Instrumentos', modern, ['Laboratório', 'Hospital'], ['microscópio', 'pesquisa', 'amostras', 'conhecimento'], [b([.28, .035, .22], [0, .018, 0], 'dark'), b([.045, .35, .07], [0, .21, -.07], 'metal'), b([.2, .025, .18], [0, .19, .02], 'dark'), c(.035, .23, [0, .35, .04], 'white', .035, [.35, 0, 0]), s(.035, [.06, .24, -.07], 'black')], 'Instrumento compacto para colocar sobre bancadas.');
add('medical-cart', 'Carrinho de instrumentos', 'Saúde / Instrumentos', modern, ['Hospital', 'Laboratório'], ['instrumentos', 'medicina', 'sangue', 'cirurgia'], [...table(.7, .5, .85, 'metal'), b([.7, .03, .5], [0, .3, 0], 'metal'), ...wheels(.55, .35, .06), ...Array.from({ length: 4 }, (_, i) => b([.02, .01, .2], [-.2 + i * .13, .86, 0], 'metal')), b([.17, .055, .17], [.2, .883, -.08], 'white')], 'Carrinho com bandejas e instrumentos cirúrgicos.', .85);
add('iv-stand', 'Suporte de soro', 'Saúde / Instrumentos', modern, ['Hospital', 'Asilo'], ['soro', 'medicina', 'tratamento'], [c(.16, .04, [0, .04, 0]), c(.018, 1.7, [0, .89, 0]), b([.36, .025, .025], [0, 1.72, 0], 'metal'), b([.12, .23, .06], [.12, 1.51, 0], 'white'), c(.005, .72, [.12, 1.02, 0], 'metal')], 'Haste com bolsa de soro e tubo.');

add('church-pew', 'Banco de igreja', 'Religioso / Mobiliário', colonial, ['Igreja', 'Capela'], ['banco', 'religião', 'madeira'], [...table(2, .52, .45), b([2, .65, .07], [0, .73, -.245]), ...[-1, 1].map(x => b([.08, .55, .6], [x * .98, .28, 0]))], 'Banco comprido com encosto e laterais.', .45);
add('confessional', 'Confessionário', 'Religioso / Mobiliário', colonial, ['Igreja', 'Capela'], ['confessionário', 'religião', 'segredo', 'madeira'], [b([1.1, 2, .06], [0, 1, -.45]), ...[-1, 1].map(x => b([.06, 2, .9], [x * .53, 1, 0])), b([1.2, .08, 1], [0, 2.04, 0]), b([.9, 1.7, .04], [0, .85, .46], 'red'), ...Array.from({ length: 6 }, (_, i) => b([.025, .34, .025], [-.2 + i * .08, 1.55, .49], 'wood'))], 'Cabine com cortina e grade para cenas em capelas.');
add('lectern', 'Púlpito com livro', 'Religioso / Mobiliário', colonial, ['Igreja', 'Biblioteca', 'Capela'], ['púlpito', 'livro', 'religião', 'conhecimento'], [b([.6, .08, .5], [0, .04, 0]), b([.32, 1, .28], [0, .56, 0]), b([.7, .06, .5], [0, 1.13, 0], 'wood', [-.2, 0, 0]), b([.35, .035, .27], [0, 1.18, 0], 'paper', [-.2, 0, 0])], 'Atril de madeira com livro aberto.');
add('bell', 'Sino de capela', 'Religioso / Objetos', colonial, ['Igreja', 'Capela', 'Vila'], ['sino', 'religião', 'metal', 'teto'], [c(.35, .5, [0, .3, 0], 'metal', .13), c(.38, .05, [0, .045, 0], 'metal'), s(.07, [0, .08, 0], 'dark'), c(.03, .2, [0, .65, 0], 'dark')], 'Sino cônico com badalo; pode ser fixado ao teto.');
add('gravestone', 'Lápide de cemitério', 'Religioso / Cemitério', historic, ['Cemitério', 'Ruínas'], ['lápide', 'morte', 'pedra', 'memorial'], [b([.85, .12, .6], [0, .06, 0], 'stone'), b([.6, .85, .16], [0, .545, 0], 'stone'), b([.06, .34, .025], [0, .69, .092], 'dark'), b([.24, .06, .025], [0, .71, .093], 'dark'), b([.32, .09, .025], [0, .33, .093], 'paper')], 'Lápide com cruz e placa sem nomes predefinidos.');
add('coffin', 'Caixão de madeira', 'Religioso / Cemitério', colonial, ['Cemitério', 'Igreja', 'Casa'], ['caixão', 'morte', 'madeira', 'funeral'], [b([.7, .42, 1.9], [0, .21, 0], 'dark'), b([.75, .06, 1.95], [0, .45, 0]), ...[-1, 1].flatMap(x => [-.6, .6].map(z => b([.04, .05, .2], [x * .37, .27, z], 'metal')))], 'Caixão fechado com alças metálicas.');

add('ritual-altar', 'Altar de pedra', 'Paranormal / Ritual', ancient, ['Ruínas', 'Templo', 'Ritual'], ['altar', 'ritual', 'sangue', 'medo', 'pedra'], [b([1.6, .15, .8], [0, .93, 0], 'stone'), ...[-1, 1].map(x => b([.38, .85, .6], [x * .5, .425, 0], 'stone')), b([.5, .016, .22], [0, 1.013, 0], 'red')], 'Altar com marca de ritual, para composições próprias do mestre.', 1.005);
add('candles', 'Conjunto de velas', 'Paranormal / Ritual', timeless, ['Ritual', 'Igreja', 'Casa'], ['velas', 'ritual', 'luz', 'medo'], [-.16, 0, .16].flatMap((x, i) => [c(.065, .025, [x, .013, 0], 'dark'), c(.036, .18 + i * .08, [x, .115 + i * .04, 0], 'wax'), s(.018, [x, .217 + i * .08, 0], 'flame')]), 'Velas com chama emissiva estática. Adicione uma luz para iluminar a cena.');
add('ritual-circle', 'Círculo ritualístico', 'Paranormal / Ritual', timeless, ['Ritual', 'Ruínas', 'Laboratório'], ['círculo', 'ritual', 'sangue', 'conhecimento', 'medo'], [...ring(1.2, .009), ...ring(.96, .009), ...Array.from({ length: 5 }, (_, i) => { const a = i * Math.PI * 2 / 5; return b([.025, .014, 1.83], [Math.cos(a) * .37, .009, Math.sin(a) * .37], 'red', [0, -a, 0]); })], 'Marca geométrica original sobre o chão; não representa um ritual oficial.');
add('obelisk', 'Obelisco de ruína', 'Paranormal / Relíquias', ancient, ['Ruínas', 'Templo', 'Ritual'], ['obelisco', 'pedra', 'morte', 'conhecimento'], [b([.8, .18, .8], [0, .09, 0], 'stone'), b([.5, 1.6, .5], [0, .98, 0], 'dark'), c(.36, .5, [0, 2.03, 0], 'stone', 0), ...[.6, .85, 1.1, 1.35].map(y => b([.14, .04, .015], [0, y, .26], 'paper'))], 'Monólito com inscrições geométricas abstratas.');
add('chains', 'Correntes suspensas', 'Paranormal / Contenção', timeless, ['Prisão', 'Bunker', 'Ritual'], ['correntes', 'contenção', 'metal', 'sangue', 'teto'], Array.from({ length: 12 }, (_, i) => [b([.065, .13, .025], [-.04, .07 + i * .13, 0], 'metal'), b([.065, .13, .025], [.04, .07 + i * .13, 0], 'metal'), b([.14, .025, .025], [0, .01 + i * .13, 0], 'dark')]).flat(), 'Segmentos de corrente para fixar em paredes e tetos.');
add('crystal', 'Fragmentos anômalos', 'Paranormal / Relíquias', timeless, ['Ritual', 'Laboratório', 'Ruínas'], ['cristal', 'energia', 'anomalia', 'relíquia'], [c(.23, .08, [0, .04, 0], 'stone'), c(.12, .6, [0, .38, 0], 'violet', 0), c(.08, .35, [.16, .23, .05], 'violet', 0, [0, 0, -.25]), c(.07, .27, [-.14, .185, -.03], 'screen', 0, [.2, 0, .3])], 'Cristais facetados com material emissivo para fenômenos criados pelo mestre.');
add('ritual-book', 'Livro de anotações ocultas', 'Paranormal / Relíquias', colonial, ['Biblioteca', 'Ritual', 'Casa'], ['livro', 'ocultismo', 'conhecimento', 'pista'], [b([.32, .025, .42], [0, .013, 0], 'dark'), b([.29, .055, .39], [0, .052, 0], 'paper'), b([.32, .025, .42], [0, .092, 0], 'red'), b([.04, .012, .21], [0, .112, 0], 'metal'), b([.15, .012, .04], [0, .112, 0], 'metal')], 'Livro fechado com símbolo abstrato original.');

add('tree', 'Árvore frondosa', 'Exterior / Vegetação', timeless, ['Floresta', 'Fazenda', 'Vila'], ['árvore', 'vegetação', 'rural', 'natureza'], [c(.22, 2.1, [0, 1.05, 0], 'wood', .12), s(.8, [0, 2.45, 0], 'green'), s(.6, [-.52, 2.15, .1], 'green'), s(.62, [.5, 2.23, -.12], 'green')], 'Árvore de copa larga, com tronco e volumes de folhagem.');
add('pine', 'Pinheiro', 'Exterior / Vegetação', timeless, ['Floresta', 'Acampamento'], ['árvore', 'pinheiro', 'vegetação', 'natureza'], [c(.1, 1.1, [0, .55, 0], 'wood'), c(.83, 1.5, [0, 1.65, 0], 'green', 0), c(.65, 1.3, [0, 2.25, 0], 'green', 0), c(.43, 1.1, [0, 2.85, 0], 'green', 0)], 'Conífera em camadas para trilhas e matas.');
add('rock', 'Afloramento rochoso', 'Exterior / Natureza', timeless, ['Floresta', 'Ruínas', 'Acampamento'], ['rocha', 'pedra', 'natureza', 'cobertura'], [c(.75, .7, [0, .35, 0], 'stone', .43), c(.42, .45, [.65, .225, .18], 'stone', .26), c(.33, .32, [-.65, .16, -.1], 'dark', .24)], 'Grupo de rochas facetadas para cobertura e caminhos.');
add('well', 'Poço de vila', 'Exterior / Rural', colonial, ['Vila', 'Fazenda', 'Ruínas'], ['poço', 'água', 'pedra', 'rural'], [...ring(.6, .06, 'stone', 14).map(part => ({ ...part, size: [.19, .75, .29], position: [part.position[0], .375, part.position[2]] })), ...[-1, 1].map(x => b([.08, 1.6, .08], [x * .72, .8, 0])), b([1.7, .08, 1.1], [0, 1.62, 0]), c(.07, 1.5, [0, 1.28, 0], 'wood', .07, [0, 0, Math.PI / 2]), c(.008, .6, [0, .92, 0], 'paper')], 'Poço aberto com suporte, eixo e corda.');
add('hay-bale', 'Fardo de palha', 'Exterior / Rural', colonial, ['Fazenda', 'Depósito'], ['palha', 'rural', 'armazenamento', 'cobertura'], [b([1, .6, .65], [0, .3, 0], 'paper'), ...[-.3, .3].map(x => b([.025, .62, .67], [x, .31, 0], 'wood'))], 'Fardo retangular amarrado.', .6);
add('handcart', 'Carroça de carga', 'Exterior / Rural', colonial, ['Fazenda', 'Vila'], ['carroça', 'transporte', 'madeira', 'rural'], [b([1.05, .09, 1.5], [0, .53, 0]), ...[-1, 1].map(x => b([.06, .35, 1.5], [x * .525, .75, 0])), b([1.05, .35, .06], [0, .75, -.75]), ...[-1, 1].map(x => c(.4, .1, [x * .64, .4, 0], 'dark', .4, [0, 0, Math.PI / 2])), ...[-1, 1].map(x => b([.055, .055, 1.3], [x * .38, .54, 1.2]))], 'Carroça de duas rodas com varais de tração.');
add('tent', 'Barraca de acampamento', 'Exterior / Acampamento', modern, ['Acampamento', 'Floresta'], ['barraca', 'abrigo', 'expedição'], [b([1.9, .03, 2.3], [0, .015, 0], 'dark'), ...[-1, 1].map(x => b([.04, 1.7, 2.3], [x * .48, .72, 0], 'cloth', [0, 0, x * -.59])), b([1.9, .04, .06], [0, .05, -1.15], 'metal')], 'Barraca triangular aberta para posicionar miniaturas dentro.');
add('campfire', 'Fogueira', 'Exterior / Acampamento', timeless, ['Acampamento', 'Floresta', 'Ritual'], ['fogo', 'luz', 'lenha', 'sobrevivência'], [...ring(.43, .06, 'stone', 10).map(part => ({ ...part, size: [.14, .12, .18] })), ...[-.5, .5].map(angle => b([.12, .12, .65], [0, .12, 0], 'wood', [0, angle, 0])), c(.17, .35, [0, .32, 0], 'flame', 0)], 'Lenha e pedras com chama estática; adicione luz pontual separadamente.');

add('streetlamp', 'Poste de rua', 'Urbano / Infraestrutura', modern, ['Rua', 'Vila', 'Indústria'], ['poste', 'luz', 'urbano', 'metal'], [c(.2, .1, [0, .05, 0], 'dark'), c(.05, 3.2, [0, 1.7, 0], 'metal'), b([.6, .05, .06], [.26, 3.28, 0], 'metal'), b([.38, .06, .24], [.53, 3.25, 0], 'dark'), b([.3, .015, .18], [.53, 3.211, 0], 'flame')], 'Poste com luminária emissiva; iluminação real usa uma luz da cena.');
add('dumpster', 'Caçamba de resíduos', 'Urbano / Infraestrutura', modern, ['Rua', 'Indústria', 'Garagem'], ['lixo', 'caçamba', 'urbano', 'metal'], [b([1.5, 1, .9], [0, .6, 0], 'cloth'), b([1.6, .06, 1], [0, 1.13, 0], 'dark'), ...wheels(1.3, .7, .1), b([.35, .3, .02], [0, .7, .463], 'paper')], 'Caçamba fechada sobre rodas.');
add('barrier', 'Barreira de concreto', 'Urbano / Contenção', modern, ['Rua', 'Bunker', 'Indústria'], ['barreira', 'cobertura', 'segurança', 'concreto'], [b([2, .25, .65], [0, .125, 0], 'stone'), b([2, .6, .33], [0, .55, 0], 'stone'), ...[-.55, 0, .55].map(x => b([.25, .12, .015], [x, .65, .173], 'paper', [0, 0, -.4]))], 'Barreira portátil com faixas de sinalização.');
add('traffic-cone', 'Cone de sinalização', 'Urbano / Contenção', modern, ['Rua', 'Garagem', 'Indústria'], ['cone', 'segurança', 'sinalização'], [b([.36, .04, .36], [0, .02, 0], 'black'), c(.14, .5, [0, .29, 0], 'rust', .025), c(.091, .08, [0, .32, 0], 'white', .073)], 'Cone com faixa clara para interdição de áreas.');

add('evidence-board', 'Quadro de investigação', 'Investigação / Pistas', modern, ['Delegacia', 'Escritório', 'Bunker'], ['quadro', 'pista', 'investigação', 'conhecimento', 'parede'], [b([1.5, 1, .04], [0, .5, 0]), ...[-.5, -.15, .3].flatMap((x, i) => [b([.22, .3, .01], [x, .65, .028], 'paper', [0, 0, (i - 1) * .12]), b([.2, .18, .01], [x + .15, .27, .028], 'white')]), b([1, .009, .012], [0, .52, .043], 'red', [0, 0, .25])], 'Quadro com fichas e conexões abstratas para fixar na parede.');
add('evidence-case', 'Maleta de perícia', 'Investigação / Equipamentos', modern, ['Delegacia', 'Laboratório', 'Rua'], ['maleta', 'perícia', 'investigação', 'amostras'], [b([.52, .18, .35], [0, .09, 0], 'dark'), b([.52, .035, .35], [0, .198, 0], 'metal'), b([.16, .04, .04], [0, .12, .2], 'black'), ...[-.15, .15].map(x => b([.03, .08, .02], [x, .15, .184], 'metal'))], 'Maleta rígida fechada para equipes de investigação.');
add('documents', 'Pilhas de documentos', 'Investigação / Pistas', timeless, ['Arquivo', 'Escritório', 'Biblioteca'], ['documentos', 'pista', 'papel', 'conhecimento'], [b([.22, .06, .3], [-.1, .03, 0], 'paper'), b([.22, .04, .3], [.12, .02, .08], 'white', [0, .18, 0]), b([.23, .01, .31], [-.1, .065, 0], 'red')], 'Pastas e folhas empilhadas para mesas e arquivos.');
add('suitcase', 'Mala de viagem antiga', 'Investigação / Equipamentos', historic, ['Hotel', 'Casa', 'Estação'], ['mala', 'viagem', 'bagagem', 'pista'], [b([.65, .4, .22], [0, .2, 0]), ...[-.2, .2].map(x => b([.025, .42, .235], [x, .21, 0], 'dark')), b([.22, .03, .07], [0, .45, 0], 'metal'), ...[-.095, .095].map(x => b([.03, .06, .07], [x, .42, 0], 'metal'))], 'Mala rígida com cintas e alça.');

addLibraryExpansion({ add, b, c, s, legs, table, wheels, shelf, ring, modern, retro, historic, colonial, ancient, timeless });
addLibraryExpansion3({ add, b, c, s, legs, table, wheels, modern, retro, historic, colonial, timeless });
addMountainLibrary({add,timeless});
const alpineIds=addAlpineLibrary({add,timeless,ancient});

function preview(object) {
  object.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(35, 1, .01, 100);
  const bounds = new THREE.Box3().setFromObject(object), center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3()).length();
  camera.position.copy(center).add(new THREE.Vector3(1.2, .85, 1.5).normalize().multiplyScalar(size * 2.05));
  camera.lookAt(center); camera.updateMatrixWorld(true);
  const triangles = [], light = new THREE.Vector3(-.4, .9, .7).normalize();
  object.traverse(mesh => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.attributes.position, index = mesh.geometry.index;
    for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
      const points = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, index ? index.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld));
      const normal = new THREE.Vector3().subVectors(points[1], points[0]).cross(new THREE.Vector3().subVectors(points[2], points[0])).normalize();
      if (normal.dot(new THREE.Vector3().subVectors(camera.position, points[0])) <= 0) continue;
      const projected = points.map(p => p.clone().project(camera));
      const color = (mesh.material.userData.recipePreviewColor?new THREE.Color(mesh.material.userData.recipePreviewColor):mesh.material.color.clone()).multiplyScalar(.55 + .45 * Math.max(0, normal.dot(light)));
      triangles.push({ z: projected.reduce((sum, p) => sum + p.z, 0) / 3, points: projected.map(p => `${(80 + p.x * 78).toFixed(2)},${(77 - p.y * 78).toFixed(2)}`).join(' '), color: `#${color.getHexString()}` });
    }
  });
  triangles.sort((a, b) => b.z - a.z);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 154"><rect width="160" height="154" fill="#20272b"/><ellipse cx="80" cy="128" rx="51" ry="9" fill="#141b20"/>${triangles.map(t => `<polygon points="${t.points}" fill="${t.color}"/>`).join('')}</svg>\n`;
}

const catalog = JSON.parse(await readFile('public/assets/catalog.json', 'utf8'));
const originals = catalog.assets.filter(asset => ['desk', 'chair', 'cabinet', 'crate', 'lamp', 'rug'].some(id => asset.id === `builtin-${id}`));
const categories = ['Mobiliário / Mesas', 'Mobiliário / Assentos', 'Mobiliário / Armazenamento', 'Industrial / Armazenamento', 'Mobiliário / Iluminação', 'Mobiliário / Decoração'];
for (const [i, asset] of originals.entries()) {
  asset.category = categories[i]; asset.era = [modern, colonial, retro, timeless, modern, timeless][i];
  asset.contexts = [['Escritório', 'Delegacia'], ['Casa', 'Escritório'], ['Arquivo', 'Delegacia', 'Escritório'], ['Depósito', 'Fazenda'], ['Casa', 'Escritório'], ['Casa', 'Hotel']][i];
  asset.description = 'Modelo original do kit inicial Tabletop, disponível localmente.';
  const object = recipeInstance(JSON.parse(await readFile(`public${asset.url}`, 'utf8')));
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  asset.footprint = asset.footprint.map((extent, axis) => Math.max(extent, Math.ceil([size.x, size.z][axis] * 100 - .0001) / 100));
  disposeObject(object);
}
for (const asset of assets) {
  const recipe = { name: asset.name, unit: 'meter', pivot: 'base-center', materials, parts: asset.parts, ...(alpineIds.has(asset.id)?{mergeParts:true}:{}) };
  const object = recipeInstance(recipe);
  let bounds = new THREE.Box3().setFromObject(object);
  // Move the geometry to an exact base pivot, preserving annotated support heights.
  const bottom = bounds.min.y;
  const center = bounds.getCenter(new THREE.Vector3());
  for (const part of recipe.parts) {
    part.position[0] -= center.x; part.position[1] -= bottom; part.position[2] -= center.z;
  }
  disposeObject(object);
  const normalized = recipeInstance(recipe);
  bounds = new THREE.Box3().setFromObject(normalized);
  const extent = bounds.getSize(new THREE.Vector3());
  if (asset.supportHeight) asset.supportHeight -= bottom;
  await writeFile(`public/assets/models/${asset.id.slice(8)}.json`, `${JSON.stringify(recipe, null, 2)}\n`);
  await writeFile(`public/assets/previews/${asset.id.slice(8)}.svg`, preview(normalized));
  disposeObject(normalized);
  const { parts, ...record } = asset;
  Object.assign(record, { footprint: [Math.ceil(extent.x * 100) / 100, Math.ceil(extent.z * 100) / 100], bounds: [extent.x, extent.y, extent.z].map(n => Math.round(n * 1000) / 1000), url: `/assets/models/${asset.id.slice(8)}.json`, previewUrl: `/assets/previews/${asset.id.slice(8)}.svg` });
  originals.push(record);
}
await writeFile('public/assets/catalog.json', `${JSON.stringify({ assets: originals }, null, 2)}\n`);
console.log(`Catálogo gerado: ${originals.length} assets originais (${assets.length} novos).`);
