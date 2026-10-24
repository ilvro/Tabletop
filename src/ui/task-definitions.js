// The tasks of each place of the drawer: `[panel child index, key, name, description, open]`. One list for the panel and for search.
export const BUILD_TASKS = [
  { title: 'Construções', tasks: [
    [0, 'room', 'Sala', 'Desenhar no chão ou criar por medidas'], [1, 'manual', 'Peças avulsas', 'Piso, parede, porta, luzes, fogo e fumaça'],
    [4, 'structures', 'Pisos, paredes e acessos', 'Contornos, superfícies de apoio e escadas'], [9, 'furnishing', 'Assistente de cômodo', 'Entende o que já existe, completa e muda o estado'], [8, 'building', 'Prédio', 'Novo a partir de um contorno, ou ampliar o que existe'] ] },
  { title: 'Paisagem', tasks: [[6, 'terrain', 'Terreno e relevo', 'Criar terreno, elevar, nivelar e pintar'], [7, 'landscape', 'Água e vegetação', 'Lagos, rios, gelo e plantas'], [10, 'surroundings', 'Entorno do prédio', 'Terreno, muro, caminho, rua e quintal']] },
  { title: 'Personagens', tasks: [[2, 'characters', 'Tokens', 'Colocar personagens na mesa']] },
  { title: 'Organização', tasks: [[5, 'levels', 'Andares e camadas', 'Separar e isolar partes da cena'], [3, 'grid', 'Grid e precisão', 'Mostrar, encaixar e medir']] },
];

export const SCENE_TASKS = [
  { title: 'Atmosfera', tasks: [
    [0, 'presets', 'Ambientes e horários', 'Pontos de partida prontos e salvos', true], [1, 'sun', 'Sol / lua e cor da luz', 'Direção, força e cor da luz principal'], [2, 'sky', 'Céu e nuvens', 'Cor do céu, nuvens e estrelas'],
    [3, 'weather', 'Clima e partículas', 'Chuva, neve, poeira, brasas'], [4, 'night', 'Objetos que acendem à noite', 'Janelas e luminárias por horário'], [5, 'effects', 'Névoa, bloom e qualidade', 'Profundidade, brilho e desempenho'],
  ] },
];

export const SHOTS_TASKS = [
  { title: 'Tomadas', tasks: [[0, 'film', 'Película', 'Enquadramentos salvos: ensaie ou corte', true]] },
  { title: 'Câmera', tasks: [[1, 'navigation', 'Câmera cinematográfica', 'Velocidade, suavidade, lente e transições'], [2, 'focus', 'Foco, seguir e movimento', 'Desfocar o fundo, acompanhar um token, órbita e câmera na mão'], [3, 'live-camera', 'Câmera ao vivo', 'O projetor acompanha sua câmera, suavizado']] },
  { title: 'Projetor', tasks: [[4, 'projector', 'Segunda tela', 'Abrir o projetor e publicar a câmera'], [5, 'title-card', 'Cartela de título', 'Título sobre a imagem do projetor']] },
  { title: 'Sessão', tasks: [[6, 'initiative', 'Combate', 'Iniciativa, rodada e áreas de efeito'], [7, 'clues', 'Pistas reveladas', 'Documentos mostrados aos jogadores; reabrir no projetor']] },
];

export const TASKS_BY_TAB = { build: BUILD_TASKS, scene: SCENE_TASKS, shots: SHOTS_TASKS };
