// Search over everything the editor can do or reach: pure, so it can be tested without a browser.
export const normalize = text => String(text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export const GROUPS = ['Ações', 'Nesta seleção', 'Tarefas', 'Elementos', 'Assets', 'Cenas', 'Tutoriais', 'Onde fica'];

const place = (text, word) => {
  if (!text) return 0;
  if (text.startsWith(word)) return 3;
  if (text.split(/[^a-z0-9]+/).some(part => part.startsWith(word))) return 2;
  return text.includes(word) ? 1 : 0;
};

/** 0 when absent; prefix 3, word start 2, inside 1; keywords count half. Every word of the query has to match. */
export function score(entry, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const label = normalize(entry.label), keywords = normalize(entry.keywords);
  let total = 0;
  for (const word of words) {
    const best = Math.max(place(label, word), place(keywords, word) / 2);
    if (!best) return 0;
    total += best;
  }
  return total / words.length;
}

/** A control you can use right now beats a hint about where one lives. */
const WEIGHT = { 'Nesta seleção': 1.15, 'Onde fica': .4 };

/** Best first; ties keep the order of the groups, then the alphabet. */
export function search(entries, query, limit = 40) {
  return entries.map(entry => ({ entry, value: score(entry, query) * (WEIGHT[entry.group] ?? 1) })).filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value || GROUPS.indexOf(a.entry.group) - GROUPS.indexOf(b.entry.group) || String(a.entry.label).localeCompare(String(b.entry.label), 'pt-BR'))
    .slice(0, limit).map(item => item.entry);
}

/** Controls that only exist with something selected: where to find them. Checked against the real panels. */
export const WHERE = [
  { label: 'Rejunte do azulejo', keywords: 'junta azulejo ladrilho', hint: 'Selecione um piso ou parede → Aparência → textura Azulejo → Largura do rejunte' },
  { label: 'Neve e cobertura', keywords: 'inverno gelo grama', hint: 'Selecione o objeto ou o terreno → Aparência → Cobertura' },
  { label: 'Ferrugem, musgo e sujeira', keywords: 'desgaste envelhecer bordas fuligem', hint: 'Selecione o objeto → Aparência → Desgaste' },
  { label: 'Sombra de uma luz', keywords: 'sombras luz projeta', hint: 'Selecione a luz → Luz → Iluminação' },
  { label: 'Luz que acende à noite', keywords: 'janela lampada horario dia noite', hint: 'Selecione o objeto → Luz → Reagir ao horário · dia / noite' },
  { label: 'Hora do dia', keywords: 'noite dia tarde sol lua horario', hint: 'Ambiente → Sol / lua e cor da luz → Horário da cena' },
  { label: 'Névoa', keywords: 'nevoa bruma profundidade', hint: 'Ambiente → Névoa, bloom e qualidade' },
  { label: 'Bloom e halo luminoso', keywords: 'brilho glow', hint: 'Ambiente → Névoa, bloom e qualidade' },
  { label: 'Chuva, neve caindo e poeira', keywords: 'clima particulas brasas', hint: 'Ambiente → Clima e partículas' },
  { label: 'Câmera, lente e transições', keywords: 'fov enquadramento velocidade', hint: 'Tomadas → Câmera cinematográfica' },
  { label: 'Tomadas salvas', keywords: 'camera enquadramento ensaiar cortar', hint: 'Tomadas → Película' },
  { label: 'Projetor e segunda tela', keywords: 'apresentar jogadores', hint: 'Tomadas → Segunda tela' },
  { label: 'Cartela de título', keywords: 'titulo capitulo legenda', hint: 'Tomadas → Cartela de título' },
  { label: 'Grid e encaixe', keywords: 'grade snap medida', hint: 'Construir → Grid e precisão' },
  { label: 'Andar e camada', keywords: 'nivel pavimento isolar', hint: 'Construir → Andares e camadas' },
  { label: 'Pincel de terreno', keywords: 'elevar nivelar pintar relevo', hint: 'Construir → Terreno e relevo, ou a tecla T com o terreno selecionado' },
  { label: 'Rio, lago e gelo', keywords: 'agua', hint: 'Construir → Água e vegetação' },
  { label: 'Escada e rampa', keywords: 'degraus acesso', hint: 'Construir → Pisos, paredes e acessos' },
  { label: 'Porta', keywords: 'abrir dobradica', hint: 'Construir → Peças avulsas → Porta; depois selecione a porta para ajustar' },
  { label: 'Telhado', keywords: 'cobertura forro', hint: 'Construir → Prédio; para ver ou ocultar, use Telhados sob a cena' },
  { label: 'Tela animada e imagem em objeto', keywords: 'tv monitor screen decalque', hint: 'Selecione o objeto → Aparência → Tela ou Decalque' },
];
