import * as THREE from 'three';

// Original metric models, authored from the supplied composition references.
// Curved openings are geometry; none of these models cuts a structural wall.
const materials = {
  limestone: { color: '#b1a18a', roughness: .95 },
  wornStone: { color: '#524a43', roughness: 1 },
  carving: { color: '#c6b79d', roughness: .88 },
  wood: { color: '#482b23', roughness: .87 },
  iron: { color: '#343035', metalness: .7, roughness: .55 },
  brass: { color: '#9b7750', metalness: .65, roughness: .4 },
  cloth: { color: '#631e2b', roughness: 1 },
  glass: { color: '#9e122f', emissive: '#a4132e', emissiveIntensity: .65, roughness: .28, opacity: .72 },
  amberGlass: { color: '#b85032', emissive: '#a83d22', emissiveIntensity: .35, roughness: .3, opacity: .8 },
  wax: { color: '#c5af88', roughness: .9 },
  flame: { color: '#ffd58a', emissive: '#ff8a37', emissiveIntensity: 2 },
};
const stone = { texture: 'stone', textureSize: 1.4, relief: .018, textureColorMode: 'replace', textureColor: '#a99b88', textureBrightness: .9 };
const wood = { texture: 'wood', textureSize: 1.1, woodPattern: 'grain', textureColorMode: 'replace', textureColor: '#523125', relief: .012 };
const iron = { texture: 'metal', textureSize: .65, metalPattern: 'rusted', metalWear: .12, textureColorMode: 'tint', textureColor: '#625e65', textureSaturation: .3, textureBrightness: .7, relief: .008 };
const surface = slot => slot === 'limestone' ? stone : slot === 'wood' ? wood : slot === 'iron' ? iron : undefined;
const box = (size, position, material = 'limestone', rotation) => ({ shape: 'box', size, position, material, surface: surface(material), ...(rotation ? { rotation } : {}) });
const cylinder = (radiusBottom, radiusTop, height, position, material = 'limestone', segments = 12, rotation) => ({ shape: 'cylinder', radiusBottom, radiusTop, height, position, material, segments, surface: surface(material), ...(rotation ? { rotation } : {}) });
const ring = (radius, tube, position, material = 'iron', rotation = [0, 0, 0]) => ({ shape: 'ring', radius, tube, segments: 24, sides: 6, position, material, rotation, surface: surface(material) });
const profile = (contour, depth, position = [0, 0, 0], material = 'limestone', rotation) => ({ shape: 'profile', contour, depth, position, material, surface: surface(material), ...(rotation ? { rotation } : {}) });
const rope = (points, radius = .045, material = 'carving') => ({ shape: 'rope', points, radius, segments: 36, sides: 8, position: [0, 0, 0], material, surface: surface(material) });
function beam(a, b, radius, material = 'iron', tip = radius) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.sub(start);
  const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
  return cylinder(radius, tip, delta.length(), start.addScaledVector(delta, .5).toArray(), material, 10, rotation.toArray().slice(0, 3));
}
// Left-to-right crown, preserving semicircular lower arcades and two-centre ogives.
function crown(radius, spring, pointed = true) {
  return Array.from({ length: 25 }, (_, i) => {
    if (!pointed) { const a = Math.PI - i * Math.PI / 24; return [Math.cos(a) * radius, spring + Math.sin(a) * radius]; }
    const left = i <= 12, a = left ? Math.PI - i * Math.PI / 36 : Math.PI / 3 - (i - 12) * Math.PI / 36;
    return [(left ? radius : -radius) + 2 * radius * Math.cos(a), spring + 2 * radius * Math.sin(a)];
  });
}
function arch(radius, spring, thickness, depth, pointed = true, position = [0, 0, 0], material = 'limestone') {
  return profile([[-radius - thickness, 0], ...crown(radius + thickness, spring, pointed), [radius + thickness, 0], [radius, 0], ...crown(radius, spring, pointed).reverse(), [-radius, 0]], depth, position, material);
}
function cross(x, y, z, size = 1, material = 'brass') {
  return [box([.1 * size, 1.2 * size, .08], [x, y, z], material), box([.64 * size, .1 * size, .08], [x, y + .18 * size, z], material), box([.48 * size, .07 * size, .08], [x, y - .05 * size, z], material)];
}
function balusters(radius, base, count = 11) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = .08 + i * (Math.PI - .16) / (count - 1), x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    parts.push(cylinder(.065, .065, .68, [x, base + .4, z], 'carving'), cylinder(.11, .06, .18, [x, base + .2, z], 'carving'), cylinder(.06, .11, .18, [x, base + .6, z], 'carving'));
  }
  for (const y of [base + .06, base + .82]) parts.push(rope(Array.from({ length: 13 }, (_, i) => [Math.cos(i * Math.PI / 12) * radius, y, Math.sin(i * Math.PI / 12) * radius]), .075));
  return parts;
}

export function addChurchKit({ add, historic }) {
  const ids = new Set();
  function model(id, name, parts, description, ritual = false, supportHeight) {
    const record = add(id, name, ritual ? 'Ritual / Igreja antiga' : 'Arquitetura / Igreja antiga', historic,
      ['Igreja', 'Ruínas', 'Horror gótico'], ['igreja antiga', 'kit gótico', ...(ritual ? ['ritual', 'sangue'] : ['arquitetura'])], parts, description, supportHeight);
    record.materials = materials;
    ids.add(record.id);
  }
  const pier = [box([1.4, .22, 1.4], [0, .11, 0]), box([1.15, .28, 1.15], [0, .36, 0], 'carving'), cylinder(.43, .4, 4.5, [0, 2.75, 0])];
  for (const [x, z] of [[.43, 0], [-.43, 0], [0, .43], [0, -.43]]) {
    pier.push(cylinder(.17, .15, 4.35, [x, 2.7, z]), cylinder(.24, .17, .25, [x, .64, z], 'carving'), cylinder(.16, .28, .28, [x, 4.87, z], 'carving'));
  }
  pier.push(box([1.3, .24, 1.3], [0, 5.12, 0], 'carving'), box([1.45, .16, 1.45], [0, 5.32, 0]), profile([[-.23, 0], [.24, 0], [.26, .22], [.1, .34], [-.06, .29], [-.21, .49], [-.27, .2]], .018, [0, .5, .584], 'wornStone'));
  model('church-clustered-pier', 'Igreja · pilar fasciculado com capitel', pier, 'Pilar de 5,4 m com quatro colunelos, base e capitel. Materiais de pedra, ornamento e desgaste separados.');
  for (const pointed of [false, true]) {
    const radius = pointed ? 1.45 : 1.8, spring = pointed ? 2.5 : 2.8;
    const parts = [arch(radius, spring, .3, .65, pointed), arch(radius + .31, spring, .09, .78, pointed, [0, 0, 0], 'carving')];
    for (const sign of [-1, 1]) parts.push(box([.65, .24, .9], [sign * (radius + .15), spring, 0], 'carving'), box([.6, .18, .9], [sign * (radius + .15), .09, 0]));
    model(pointed ? 'church-pointed-arch' : 'church-round-arcade', pointed ? 'Igreja · arco ogival vazado' : 'Igreja · arcada semicircular vazada', parts, 'Vão real, moldura em duas ordens e impostas. Frente +Z. Peça avulsa: não recorta paredes do editor.');
  }
  const slab = Array.from({ length: 25 }, (_, i) => [Math.cos(i * Math.PI / 24) * 2, -Math.sin(i * Math.PI / 24) * 2]);
  const balcony = [profile(slab, .28, [0, 1, 0], 'limestone', [-Math.PI / 2, 0, 0]), ...balusters(1.86, 1.14)];
  for (const x of [-1.3, 0, 1.3]) balcony.push(profile([[-.16, 0], [.16, 0], [.16, .95], [-.16, .95]], .22, [x, 0, .15], 'carving'), beam([x, .22, .1], [x, .88, 1.3], .12, 'carving'));
  model('church-curved-balcony', 'Igreja · balcão semicircular com balaústres', balcony, 'Projeção para +Z, laje superior a 1,14 m da base e escoras reais. Para tokens, acrescente piso poligonal no contorno da laje; sem apoio retangular fictício.');
  const railing = [box([3, .14, .24], [0, .07, 0], 'carving'), box([3.1, .16, .3], [0, .98, 0], 'carving')];
  for (let i = 0; i < 9; i++) { const x = -1.35 + i * .3375; railing.push(cylinder(.06, .06, .76, [x, .53, 0], 'carving'), cylinder(.12, .06, .17, [x, .3, 0], 'carving'), cylinder(.06, .12, .17, [x, .75, 0], 'carving')); }
  model('church-balustrade', 'Igreja · balaustrada reta de pedra', railing, 'Módulo de 3 m, com corrimão e balaústres torneados. Combine com pisos e balcões.');
  const window = [arch(.95, 2.4, .19, .28), profile([[-.94, .02], ...crown(.94, 2.4), [.94, .02]], .025, [0, 0, -.04], 'glass')];
  for (const x of [-.48, 0, .48]) window.push(box([.045, 3.35, .065], [x, 1.7, 0], 'iron'));
  for (const y of [.65, 1.5, 2.35]) window.push(box([1.86, .035, .065], [0, y, 0], 'iron'));
  for (const sign of [-1, 1]) window.push(arch(.4, 1.8, .035, .07, true, [sign * .46, .5, .02], 'iron'));
  window.push(ring(.29, .035, [0, 3.15, .02], 'iron'), profile([[0, 0], [.24, .32], [0, .64], [-.24, .32]], .035, [0, 1.15, .025], 'amberGlass'));
  model('church-stained-window', 'Igreja · vitral ogival vermelho com traceria', window, 'Vidro translúcido emissivo, com chumbo, lancetas e medalhão. Não projeta luz colorida nem corta parede; use luz vermelha separada para o ambiente.');
  const ribs = [arch(4.8, .1, .14, .24, true, [0, 0, -2], 'carving'), arch(4.8, .1, .14, .24, true, [0, 0, 2], 'carving')];
  for (const sign of [-1, 1]) ribs.push(rope([[-4.8, .1, sign * 2], [-3, 5.65, sign * 1.3], [0, 8.42, 0], [3, 5.65, -sign * 1.3], [4.8, .1, -sign * 2]], .095, 'carving'));
  ribs.push(cylinder(.25, .25, 4.3, [0, 8.42, 0], 'carving', 12, [Math.PI / 2, 0, 0]));
  model('church-vault-ribs', 'Igreja · nervuras de abóbada cruzada', ribs, 'Módulo de 4 m no eixo Z, vão de 9,6 m, sem teto opaco. Base na linha de arranque da cobertura; repetição longitudinal.');
  model('church-roof-shell', 'Igreja · cobertura ogival modular', [arch(4.96, .1, .18, 4, true)], 'Casca sólida de 4 m no eixo Z, com interior livre. Coloque em grupo/camada própria para ocultar manualmente durante o jogo; não tem cutaway automático.');
  const buttress = [box([1.25, .25, 2.1], [0, .125, 0]), profile([[-1, .25], [1, .25], [1, 1.7], [.42, 1.7], [.42, 4.3], [-.24, 4.3], [-.24, 6], [-1, 6]], .8, [0, 0, 0], 'limestone', [0, Math.PI / 2, 0])];
  for (const y of [1.7, 4.3, 6]) buttress.push(box([1, .16, 1.2], [0, y, -.3], 'carving'));
  model('church-buttress', 'Igreja · contraforte escalonado', buttress, 'Contraforte sólido com três patamares e coroamento; apoio de fachada e silhueta exterior.');
  const pinnacle = [box([.75, .18, .75], [0, .09, 0]), box([.48, 1.1, .48], [0, .73, 0]), box([.65, .15, .65], [0, 1.35, 0], 'carving'), cylinder(.43, 0, 1.5, [0, 2.17, 0], 'carving', 4, [0, Math.PI / 4, 0])];
  for (const y of [1.7, 2.05, 2.4]) for (const sign of [-1, 1]) pinnacle.push(beam([sign * .18, y - .12, 0], [sign * .36, y, 0], .055, 'carving', .01));
  model('church-pinnacle', 'Igreja · pináculo com florões', pinnacle, 'Peça de coroamento com agulha quadrangular e ornamentos laterais.');
  const tower = [box([4.4, .3, 4.4], [0, .15, 0]), box([3.5, 4, 3.5], [0, 2.3, 0]), box([4, .25, 4], [0, 4.43, 0], 'carving')];
  for (const [x, z, angle] of [[0, 1.65, 0], [0, -1.65, 0], [1.65, 0, Math.PI / 2], [-1.65, 0, Math.PI / 2]]) tower.push({ ...arch(1.05, 1.5, .3, .35, true, [x, 4.55, z], 'carving'), rotation: [0, angle, 0] });
  tower.push(box([4.1, .3, 4.1], [0, 8.3, 0]), cylinder(2.6, 0, 4, [0, 10.45, 0], 'iron', 4, [0, Math.PI / 4, 0]), ...cross(0, 12.8, 0, .65));
  model('church-bell-tower', 'Igreja · torre sineira com vãos abertos', tower, 'Torre de aproximadamente 13 m, com quatro aberturas superiores e agulha. Base inferior maciça cenográfica; para interior navegável, monte os módulos separados.');

  const maiden = [cylinder(.8, .8, .22, [0, .11, 0], 'iron', 20), cylinder(.66, .66, .12, [0, .28, 0], 'brass', 20)];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + i * Math.PI / 12, x = Math.cos(a) * .56, z = Math.sin(a) * .56;
    maiden.push(box([.15, 1.95, .09], [x, 1.32, z], 'iron', [0, Math.PI / 2 - a, 0]));
  }
  for (const sign of [-1, 1]) {
    maiden.push(profile([[-.3, 0], [.3, 0], [.3, 1.65], [0, 1.98], [-.3, 1.65]], .08, [sign * .8, .35, .25], 'iron', [0, sign * .65, 0]));
    for (let i = 0; i < 6; i++) maiden.push(beam([sign * .78, .62 + i * .23, .3], [sign * .78, .62 + i * .23, .57], .065, 'brass', 0));
  }
  for (const y of [.6, 1.25, 1.9]) maiden.push(rope([[-.6, y, .15], [-.44, y, -.42], [0, y, -.59], [.44, y, -.42], [.6, y, .15]], .045, 'brass'));
  maiden.push(ring(.56, .035, [0, 2.55, -.2], 'brass'));
  for (let i = 0; i < 13; i++) { const a = i * Math.PI / 6; maiden.push(beam([Math.cos(a) * .58, 2.55 + Math.sin(a) * .58, -.2], [Math.cos(a) * .78, 2.55 + Math.sin(a) * .78, -.2], .035, 'iron', 0)); }
  model('church-iron-maiden', 'Igreja · Dama de Ferro com portas abertas', maiden, 'Relicário de ferro com interior aberto, portas espinhadas, aros e halo radial. Interpretação original das referências, estática, sem personagem ou animação.', true);
  const seraph = [box([1.8, .25, 1.2], [0, .125, 0]), box([1.3, .22, .85], [0, .36, 0], 'carving'), cylinder(.65, .26, 2.2, [0, 1.57, 0], 'carving', 16), cylinder(.3, .55, .85, [0, 3.05, 0], 'carving', 12)];
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; seraph.push(profile([[-.07, 0], [.09, 0], [.035, 1.98], [-.025, 2.08]], .055, [Math.cos(a) * .4, .48, Math.sin(a) * .4], 'limestone', [0, -a, 0])); }
  seraph.push(cylinder(.19, .16, .16, [0, 3.56, 0], 'wornStone', 7));
  for (const sign of [-1, 1]) {
    seraph.push(beam([sign * .35, 3.34, .02], [sign * 1.1, 3.52, .16], .17, 'carving', .12), beam([sign * 1.1, 3.52, .16], [sign * 1.65, 3.9, .1], .12, 'carving', .07));
    const wing = [[.28, 3.2], [.45, 4], [1.4, 4.95], [3.2, 5.35], [2.75, 4.5], [2, 3.65], [1.1, 3.1]];
    seraph.push(profile(wing.map(([x, y]) => [x * sign, y]), .16, [0, 0, -.28], 'limestone'));
    for (let i = 0; i < 13; i++) {
      const x = .58 + i * .15, y = 3.65 + i * .085;
      seraph.push(profile([[x, y], [x + .16, y + .2], [x + .9, y + .68], [x + .62, y + .05]].map(([x, y]) => [x * sign, y]), .08, [0, 0, -.13], 'carving'));
    }
  }
  for (const part of seraph) if (['limestone', 'carving'].includes(part.material)) part.surface = { texture: 'concrete', textureSize: .8, relief: .006, textureColorMode: 'replace', textureColor: '#b9ac99', textureBrightness: .9 };
  model('church-headless-seraph', 'Igreja · Serafim decapitado de pedra', seraph, 'Estátua alada com pescoço fraturado, braços erguidos, penas sobrepostas e vestes esculpidas. Modelo original estático, sem rig.', true);
  const chair = [box([.7, .1, .65], [0, .52, 0], 'wood'), profile([[-.35, .5], [.35, .5], [.35, 1.5], [0, 2.1], [-.35, 1.5]], .1, [0, 0, -.28], 'wood')];
  for (const x of [-.27, .27]) for (const z of [-.23, .23]) chair.push(cylinder(.045, .055, .5, [x, .25, z], 'wood'));
  chair.push(arch(.19, .7, .045, .04, true, [0, .57, -.21], 'brass'));
  model('church-pointed-chair', 'Igreja · cadeira de espaldar pontiagudo', chair, 'Assento de madeira com espaldar alto e entalhe ogival; escala adequada ao banquete.', true);
  const banner = [profile([[-.65, 3], [.65, 3], [.65, .35], [.3, .1], [.08, .32], [-.17, 0], [-.44, .22], [-.65, .13]], .025, [0, 0, 0], 'cloth'), beam([-.83, 3, 0], [.83, 3, 0], .04, 'iron'), ...cross(0, 1.9, .045, 1.3, 'brass')];
  model('church-ritual-banner', 'Igreja · pendão ritual de tecido rasgado', banner, 'Pendão vinho com barra metálica e cruz dupla original. Frente +Z; sem usar logotipo ou textura extraída da referência.', true);
  const rack = [box([3.8, .15, .2], [0, 2.65, 0], 'iron')];
  for (let n = 0; n < 5; n++) {
    const x = -1.6 + n * .8, length = .8 + (n % 3) * .17;
    for (let i = 0; i < 12; i++) rack.push({ ...ring(.055, .012, [x + .08 * Math.sin(i * .23), 2.6 - i * length / 12, .05], 'iron', [0, i % 2 * Math.PI / 2, 0]), segments: 12 });
    rack.push(rope([[x, 2.6 - length, .05], [x + .02, 2.4 - length, .05], [x + .13, 2.32 - length, .05], [x + .22, 2.42 - length, .05], [x + .2, 2.52 - length, .05]], .045, 'iron'));
  }
  model('church-hook-rack', 'Igreja · correntes e ganchos suspensos', rack, 'Cinco correntes com elos vazados e ganchos curvos, em suporte de parede. Base normalizada no gancho mais baixo; eleve a peça ao instalar.', true);
  const banquet = [box([1.35, .12, 5.4], [0, .98, 0], 'wood')];
  for (const z of [-1.8, 1.8]) banquet.push(profile([[-.6, 0], [.6, 0], [.3, .15], [.22, .85], [-.22, .85], [-.3, .15]], .22, [0, 0, z], 'wood'), box([1.25, .16, .5], [0, .08, z], 'wood'));
  banquet.push(box([.17, .2, 3.8], [0, .4, 0], 'wood'));
  model('church-banquet-table', 'Igreja · mesa longa de banquete', banquet, 'Mesa de 5,4 m com cavaletes esculpidos, travessa e apoio a 1,04 m. Decoração colocada separadamente para reutilização.', true, 1.04);
  const candles = [cylinder(.25, .16, .1, [0, .05, 0], 'brass'), cylinder(.045, .04, .75, [0, .43, 0], 'brass')];
  for (let i = -2; i <= 2; i++) {
    const x = i * .22, y = .75 + (2 - Math.abs(i)) * .15;
    if (i) candles.push(rope([[0, .4, 0], [x * .6, .45, 0], [x, y - .15, 0]], .025, 'brass'));
    candles.push(cylinder(.075, .075, .04, [x, y, 0], 'brass'), cylinder(.04, .04, .22, [x, y + .13, 0], 'wax'), cylinder(.025, 0, .09, [x, y + .28, 0], 'flame'));
  }
  model('church-candelabra', 'Igreja · candelabro de cinco velas', candles, 'Cinco velas com chama emissiva estática. Para iluminar a mesa, acrescente uma luz compartilhada; não gera cinco luzes dinâmicas.', true);
  return ids;
}
