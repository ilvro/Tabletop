// Inspector sections grouped by job: where it is, what it looks like, its light, how it is organised.
export const INSPECTOR_TABS = [
  { id: 'position', label: 'Posição', icon: 'move' },
  { id: 'look', label: 'Aparência', icon: 'eyedropper' },
  { id: 'light', label: 'Luz', icon: 'light' },
  { id: 'organize', label: 'Organização', icon: 'folder' },
];

const RULES = [
  ['position', /^(POSIÇÃO|DIMENSÕES|ESCALA VISUAL|CONTORNO LOCAL|ABERTURA NA PAREDE|ABERTURAS E PAREDES|JANELA HOSPEDADA|ACESSO ENTRE ALTURAS|ANDARES CONECTADOS|RECORTES DO PISO|FIXAR|SUPERFÍCIE DE APOIO|BASE · METROS|ÁREA DO TERRENO|ALTURA DE UM VÉRTICE|ALINHAR E AJUSTAR)/],
  ['look', /^(PINCEL DE SUPERFÍCIE|MATERIAL|MATERIAIS DA SELEÇÃO|COR|CORES|DESENHO|DESGASTE|TELA$|DECALQUE|VEGETAÇÃO|GEOMETRIA DA ROCHA|ÁGUA \/ GELO|EFEITO LOCAL|EFEITO DE TUBO|FOGO E FUMAÇA|CABO|LINHAS|BARRA DE PROGRESSO|DETALHES|AJUSTES)/],
  ['light', /^(ILUMINAÇÃO|LUZ NESTE OBJETO|LUZ DO CÔMODO|ZONA DE AMBIENTE|OBJETOS QUE ACENDEM|LANTERNA)/],
  ['organize', /^(ORGANIZAÇÃO|ANDAR \/ CAMADA|APRESENTAÇÃO)/],
];

/** Which tab a section belongs to, by its eyebrow title; null when unmapped. */
export const inspectorTabFor = title => RULES.find(([, rule]) => rule.test(String(title).trim().toUpperCase()))?.[0] ?? null;

const KINDS = { token: 'TOKEN', light: 'LUZ', floor: 'PISO', wall: 'PAREDE', door: 'PORTA', window: 'JANELA', terrain: 'TERRENO', stairs: 'ESCADA', ramp: 'RAMPA', prop: 'OBJETO' };

/** The short kind label for a located object (`{ type, record }`), shared by the inspector and the context menu. */
export function kindLabel(found) {
  if (!found) return 'OBJETO';
  const { type, record } = found;
  if (type === 'group') return 'COMPOSIÇÃO';
  if (type === 'token') return KINDS.token;
  if (type === 'light') return KINDS.light;
  if (record.kind === 'water') return record.water?.state === 'ice' ? 'GELO' : 'ÁGUA';
  return KINDS[record.kind] ?? 'OBJETO';
}
