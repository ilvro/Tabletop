/**
 * Lessons as data. A lesson is a list of steps; a step says
 *
 *   say     the instruction, one sentence
 *   why     optional explanation shown under it
 *   target  what to point at, by the identifiers the interface already uses
 *   done    the condition that completes it (see conditions.js); `['read']` waits for "Continuar"
 *   tab     the side tab the target lives in, opened before pointing
 *   reveal  false when opening the target's own task is what the step teaches
 *   act     how a test performs the step: 'click' (default), 'continue', ['fill', selector, text],
 *           ['world', [x, y, z]] to click a point of the scene, or ['key', name]
 *
 * Nothing here is interface code: adding a lesson is adding an entry. Every
 * lesson is run by tests/e2e/tutorials.test.js, which fails when a target
 * disappears or a condition can no longer be met.
 */
const ACCEPT = { say: 'Confirme a prévia no <b>botão destacado</b>, no topo da cena.', why: 'Tudo o que o assistente faz aparece primeiro como prévia, em verde. Nada entra na cena antes de você aceitar, e Ctrl+Z desfaz a proposta inteira.', target: '[data-action="accept-proposal"]' };
export const LESSONS = [
  {
    id: 'basics', title: 'Primeiros passos', minutes: 6, summary: 'Conheça a tela inteira: criar uma sala, mover a câmera, colocar e ajustar objetos, mudar o ambiente, pôr um token, apresentar e salvar.',
    needs: 'empty',
    steps: [
      { say: 'Vamos passar por tudo o que o Tabletop faz, montando uma cena pequena.', why: 'Você opera a tela de verdade; o tutorial só aponta. Cada passo avança sozinho quando o resultado aparece, e dá para sair e continuar depois.', done: ['read'], act: 'continue' },
      { say: 'À esquerda ficam as ferramentas, em três abas.', why: '<b>Construir</b> cria salas, prédios, terreno e personagens. <b>Elementos</b> lista tudo o que está na cena. <b>Ambiente</b> cuida de luz, céu, clima e câmera.', target: '.tabs', done: ['read'], act: 'continue' },
      { say: 'À direita ficam as <b>Propriedades</b> do que estiver selecionado.', why: 'Posição, tamanho, material, luz própria: tudo o que pertence a um objeto se ajusta aqui.', target: '.inspector', done: ['read'], act: 'continue' },
      { say: 'Toda construção começa por uma prévia. Clique em <b>Ver prévia</b>.', why: 'As medidas acima definem a sala. “Desenhar sala” faz o mesmo arrastando no chão.', target: '#quick-form button[type="submit"]', tab: 'build', done: [['previewOpen'], ['taskOpen', 'room']] },
      { say: 'A prévia aparece em verde. Clique em <b>Criar sala</b> para aplicar.', why: 'É assim com tudo o que constrói: primeiro a prévia, depois você confirma ou cancela. Nada entra na cena sem a sua confirmação.', target: '[data-action="accept-proposal"]', done: [['atLeast', 'wall', 4], ['previewClosed']] },
      { say: 'Mova a câmera à vontade.', why: '<b>W A S D</b> anda, <b>botão direito</b> gira, <b>scroll</b> aproxima e <b>F</b> enquadra a seleção. Esta barra troca a vista e mostra ou esconde paredes da frente e telhados.', target: '.camera-strip', done: ['read'], act: 'continue' },
      { say: 'Clique em <b>Superior</b> para ver a planta.', target: '[data-action="top"]', done: ['view', 'top'] },
      { say: 'Volte para <b>Perspectiva</b>.', target: '[data-action="perspective"]', done: ['view', 'perspective'] },
      { say: 'Agora um objeto. Abra <b>Assets</b>.', why: 'A biblioteca tem mais de 300 modelos, além de texturas e retratos, e aceita os seus arquivos.', target: '.app-header [data-tab="assets"]', done: ['assetsOpen'] },
      { say: 'Digite <b>mesa de jantar</b> na busca.', target: '#asset-search', done: ['assetListed', 'builtin-dining-table'], act: ['fill', '#asset-search', 'mesa de jantar'] },
      { say: 'Clique na <b>Mesa de jantar rústica</b>.', target: '[data-asset="builtin-dining-table"]', done: ['placingAsset', 'builtin-dining-table'] },
      { say: 'Clique dentro da sala para colocar a mesa.', why: 'Cada clique põe uma cópia. <b>Esc</b> ou <b>Q</b> encerra a colocação.', target: '#viewport', done: ['hasAsset', 'builtin-dining-table'], act: ['world', [-1.2, 0, -1]] },
      { say: 'Aperte <b>Esc</b> e clique no <b>piso</b> da sala para selecioná-lo.', why: 'Clicar seleciona; Shift+clique soma à seleção. As Propriedades passam a mostrar o que você clicou.', target: '#viewport', done: ['selected', 'floor'], before: ['key', 'Escape'], act: ['world', [2, 0, 1.6]] },
      { say: 'Agora clique na <b>mesa</b>.', target: '#viewport', done: ['selected', 'prop'], act: ['world', [-1.2, .8, -1]] },
      { say: 'Em Propriedades, mude a <b>Rotação Y</b> para 45.', why: 'Os campos aceitam digitar, as setas do teclado e a roda do mouse. Cada mudança é um passo de Ctrl+Z.', target: '[data-field="object-yaw"]', done: ['turned', 'builtin-dining-table'], act: ['fill', '[data-field="object-yaw"]', '45'] },
      { say: 'Para ajustar com a mão, escolha a ferramenta <b>Mover</b>.', why: 'Arraste as setas que aparecem sobre o objeto. <b>G</b> move, <b>R</b> gira, <b>V</b> muda a escala e <b>Q</b> volta a selecionar. A régua mede distâncias e o conta-gotas copia materiais.', target: '[data-action="tool-move"]', done: ['tool', 'move'] },
      { say: 'Errou? Clique em <b>Desfazer</b>.', why: 'Ctrl+Z desfaz qualquer coisa, inclusive uma construção inteira aceita de uma vez.', target: '#undo', done: ['undone'] },
      { say: 'E em <b>Refazer</b> para trazer de volta.', target: '#redo', done: ['redone'] },
      { say: 'Abra a aba <b>Elementos</b>.', target: '.tabs [data-tab="elements"]', done: ['tab', 'elements'] },
      { say: 'Aqui está tudo o que existe na cena.', why: 'Clique para selecionar, use a busca e os filtros, crie pastas, e esconda ou trave o que não quer mexer. É o jeito mais fácil de achar uma peça numa cena grande.', target: '#scene-tree', tab: 'elements', done: ['read'], act: 'continue' },
      { say: 'Abra a aba <b>Ambiente</b>.', target: '.tabs [data-tab="scene"]', done: ['tab', 'scene'] },
      { say: 'Escolha o ambiente <b>Noite</b>.', why: 'Um ambiente troca sol ou lua, céu, névoa e clima de uma vez. Cada parte tem depois os seus ajustes finos nas tarefas abaixo.', target: '[data-environment="moonlight"]', tab: 'scene', done: ['environment', 'moonlight'] },
      { say: 'Falta alguém na cena. Clique em <b>Colocar token</b>.', why: 'Tokens são os personagens da mesa: têm nome, cor, retrato e uma base em metros.', target: '[data-action="token-place"]', tab: 'build', done: ['placingToken'] },
      { say: 'Clique no piso para pôr o token.', target: '#viewport', done: ['tokens', 1], act: ['world', [1.8, 0, 1.2]] },
      { say: 'Guarde este ângulo: clique em <b>Salvar câmera atual</b>.', why: 'Enquadramentos salvos são as tomadas que você mostra aos jogadores durante a sessão.', target: '[data-action="camera-save"]', tab: 'scene', done: ['cameras', 1], before: ['key', 'Escape'] },
      { say: 'Clique em <b>Apresentar</b>.', why: 'É a visão dos jogadores, sem painéis. A câmera de trabalho e a câmera publicada são separadas: você navega à vontade sem mudar o que o projetor mostra.', target: '.app-header [data-action="present"]', done: ['presenting'] },
      { say: 'Clique em <b>Voltar à edição</b>.', target: '#presentation-controls [data-action="present"]', done: ['presenting', false] },
      { say: 'Por fim, clique em <b>Salvar</b>.', why: 'A cena fica na sua biblioteca e reabre em <b>Abrir</b>. Enquanto isso, um rascunho automático protege o que ainda não foi salvo.', target: '#save-scene', done: ['saved'] },
      { say: 'Você já sabe se virar: construir, colocar, ajustar, ambientar, apresentar e salvar.', why: 'O próximo tutorial, <b>Construção assistida</b>, mostra como deixar o assistente mobiliar, iluminar e levantar prédios inteiros.', done: ['read'], act: 'continue' },
    ],
  },
  {
    id: 'assistant', title: 'Construção assistida', minutes: 5, summary: 'Monte uma casa mobiliada, mude o estado de um cômodo, ilumine e crie o entorno, deixando o assistente fazer o trabalho repetitivo.',
    needs: 'empty',
    steps: [
      { say: 'Vamos montar um lugar inteiro em poucos minutos.', why: 'O assistente lê o que já existe na cena e propõe o passo seguinte. Você decide; ele faz o trabalho repetitivo. Cada passo deste tutorial avança sozinho quando você faz o que ele pede.', done: ['read'], act: 'continue' },
      { say: 'Abra a aba <b>Construir</b>.', target: '.tabs [data-tab="build"]', done: ['tab', 'build'] },
      { say: 'Abra a tarefa <b>Sala</b>.', why: 'Cada tarefa do painel abre e fecha com um clique. Dentro dela está tudo o que ela precisa.', target: '[data-build-section="room"] > summary', tab: 'build', reveal: false, done: ['taskOpen', 'room'] },
      { say: 'Clique em <b>Ver prévia</b> para propor uma sala de 6 × 5 m.', target: '#quick-form button[type="submit"]', tab: 'build', done: [['previewOpen'], ['taskOpen', 'room']] },
      { ...ACCEPT, say: 'Clique em <b>Criar sala</b>, no topo da cena.', done: [['atLeast', 'wall', 4], ['previewClosed']] },
      { say: 'Agora coloque uma peça à mão. Abra <b>Assets</b>, na barra do topo.', why: 'A biblioteca tem mais de 300 modelos, de várias épocas.', target: '.app-header [data-tab="assets"]', done: ['assetsOpen'] },
      { say: 'Digite <b>fogão</b> na busca.', target: '#asset-search', done: ['assetListed', 'builtin-stove'], act: ['fill', '#asset-search', 'fogão'] },
      { say: 'Clique no <b>Fogão a lenha</b>.', target: '[data-asset="builtin-stove"]', done: ['placingAsset', 'builtin-stove'] },
      { say: 'Clique dentro da sala para colocar o fogão. Depois aperte <b>Esc</b>.', why: 'Enquanto a colocação está ativa, cada clique põe uma cópia. Esc ou Q encerra.', target: '#viewport', done: ['hasAsset', 'builtin-stove'], act: ['world', [-1.5, 0, -1.2]] },
      { say: 'Abra a tarefa <b>Assistente de cômodo</b>.', target: '[data-build-section="furnishing"] > summary', tab: 'build', reveal: false, done: ['taskOpen', 'furnishing'], before: ['key', 'Escape'] },
      { say: 'Veja o que ele entendeu.', why: 'Bastou um fogão para o assistente ler o cômodo como cozinha e listar o que costuma haver numa e ainda falta. A leitura muda conforme você coloca mais peças.', target: '.assistant-reading', tab: 'build', done: ['read'], act: 'continue' },
      { say: 'Clique em <b>Completar o que falta</b>.', why: 'Ele aproveita o seu fogão: não traz outro nem tira o seu do lugar. As peças novas se arrumam em volta, encostadas nas paredes e longe da porta.', target: '[data-action="smart-preview"]', tab: 'build', done: ['previewOpen'] },
      { ...ACCEPT, done: [['furnished'], ['previewClosed']] },
      { say: 'Em <b>Estado do lugar</b>, escolha <b>Ritual</b>.', why: 'Um estado não é um arranjo pronto: ele transforma o que está no cômodo. O ritual afasta os seus móveis do centro e usa uma mesa sua como altar.', target: '.choice-field:has([data-field="state-state"]) [data-choice="ritual"]', tab: 'build', done: ['assistantState', 'ritual'] },
      { say: 'Clique em <b>Prévia do estado</b>.', target: '[data-action="state-preview"]', tab: 'build', done: ['previewOpen'] },
      { ...ACCEPT, done: [['hasAsset', 'builtin-ritual-circle'], ['previewClosed']] },
      { say: 'Agora a luz. Clique em <b>Prévia da iluminação</b>.', why: 'O clima da luz é deduzido: com um ritual montado, só chamas. Ele acende as velas e candelabros que estão no cômodo em vez de espalhar pontos de luz.', target: '[data-action="light-preview"]', tab: 'build', done: ['previewOpen'] },
      { ...ACCEPT, done: [['litObject'], ['previewClosed']] },
      { say: 'Um cômodo está pronto. Agora um prédio inteiro: abra a tarefa <b>Prédio</b>.', target: '[data-build-section="building"] > summary', tab: 'build', reveal: false, done: ['taskOpen', 'building'] },
      { say: 'Escolha <b>Novo prédio</b>.', why: 'Com um cômodo selecionado, o painel abre em “Mudar um prédio”, que serve para encaixar ou acrescentar cômodos ao que já existe. Aqui queremos um prédio à parte.', target: '.choice-field:has([data-field="building-mode"]) [data-choice="new"]', tab: 'build', done: ['buildingMode', 'new'] },
      { say: 'Clique em <b>Prévia do prédio</b>.', why: 'A planta ao lado mostra como o contorno será dividido. Você pode arrastar um cômodo sobre outro para trocá-los, tirar ou acrescentar cômodos, e a prévia acompanha.', target: '[data-action="building-preview"]', tab: 'build', done: ['previewOpen'] },
      { ...ACCEPT, done: [['atLeast', 'floor', 5], ['previewClosed']] },
      { say: 'Falta o lado de fora. Abra <b>Entorno do prédio</b>.', target: '[data-build-section="surroundings"] > summary', tab: 'build', reveal: false, done: ['taskOpen', 'surroundings'] },
      { say: 'Clique em <b>Prévia do entorno</b>.', why: 'A frente é o lado da porta de entrada: o portão fica diante dela e o caminho leva até ela. O tipo de entorno vem do tipo de prédio.', target: '[data-action="around-preview"]', tab: 'build', done: ['previewOpen'] },
      { ...ACCEPT, done: [['hasTag', 'entorno'], ['previewClosed']] },
      { say: 'Pronto: uma cozinha em ritual, uma casa mobiliada e o terreno em volta.', why: 'Tudo o que foi criado são objetos comuns, que você move, troca e apaga como qualquer outro. Clique no gramado ou num muro e troque textura, cor e desgaste em Propriedades; em Água e vegetação, espalhe mais plantas. Experimente também a vista Superior, o botão Telhados e as épocas Medieval e Futurista.', done: ['read'], act: 'continue' },
    ],
  },
  {
    id: 'industrial', title: 'Galpão industrial', minutes: 12, summary: 'Recrie um galpão abandonado: cabos no teto, monitor com tela acesa, letreiro e faixa de alerta, piso molhado com reflexo, faíscas e goteira.',
    needs: 'empty',
    steps: [
      { say: 'Vamos montar um canto de galpão abandonado, com os recursos de tela, decalque, umidade e efeitos.', why: 'Tudo o que você vai usar é do próprio editor; a cena de exemplo “Galpão industrial” foi feita do mesmo jeito.', done: ['read'], act: 'continue' },
      { say: 'Abra a aba <b>Construir</b> e a tarefa <b>Sala</b>.', target: '[data-build-section="room"] > summary', tab: 'build', reveal: false, done: ['taskOpen', 'room'] },
      { say: 'Clique em <b>Ver prévia</b> para propor a sala.', target: '#quick-form button[type="submit"]', tab: 'build', done: [['previewOpen'], ['taskOpen', 'room']] },
      { ...ACCEPT, say: 'Clique em <b>Criar sala</b>, no topo da cena.', done: [['atLeast', 'wall', 4], ['previewClosed']] },
      { say: 'Abra a tarefa <b>Assistente de cômodo</b>, para o que pende do teto.', target: '[data-build-section="furnishing"] > summary', tab: 'build', reveal: false, done: ['taskOpen', 'furnishing'] },
      { say: 'Clique em <b>Cabos no teto</b>.', why: 'Feixes de parede a parede e pontas soltas, sempre acima da altura da cabeça. É uma prévia, como tudo do assistente.', target: '[data-action="cables-preview"]', tab: 'build', done: ['previewOpen'] },
      { ...ACCEPT, done: [['hasTag', 'cabos-assistidos'], ['previewClosed']] },
      { say: 'Agora o monitor. Abra <b>Assets</b>.', target: '.app-header [data-tab="assets"]', done: ['assetsOpen'] },
      { say: 'Digite <b>televisão</b> na busca.', target: '#asset-search', done: ['assetListed', 'builtin-crt-tv'], act: ['fill', '#asset-search', 'televisão'] },
      { say: 'Clique na <b>Televisão de tubo</b>.', target: '[data-asset="builtin-crt-tv"]', done: ['placingAsset', 'builtin-crt-tv'] },
      { say: 'Clique no piso da sala para colocá-la. Depois aperte <b>Esc</b>.', target: '#viewport', done: ['hasAsset', 'builtin-crt-tv'], act: ['world', [-1.2, 0, 0]] },
      { say: 'Em Propriedades, marque <b>Tela acesa</b>.', why: 'Todo modelo com tela ganha a seção <b>Tela</b>: texto, barra de progresso, imagem ou chuvisco. Acesa, ela ilumina o que está à frente com a cor do que mostra.', target: '[data-field="screen-enabled"]', done: ['screenLit'] },
      { say: 'Troque o texto da primeira linha para <b>ALERTA</b>.', why: 'O efeito de tubo, a barra e a cintilação ficam logo abaixo. “Pausar efeitos animados”, em Ambiente, congela a tela.', target: '[data-field="screen-line-0-text"]', done: ['screenText', 'ALERTA'], act: ['fill', '[data-field="screen-line-0-text"]', 'ALERTA'] },
      { say: 'Agora um letreiro. Em Peças avulsas, clique em <b>Decalque</b>.', why: 'Um decalque é texto, imagem ou faixa de material colado numa superfície; acompanha a parede se ela se mover.', target: '[data-action="decal-place"]', tab: 'build', done: ['tool', 'decal'], before: ['key', 'Escape'] },
      { say: 'Clique na parede do fundo para colá-lo.', target: '#viewport', done: ['decals', 1, 'text'], act: ['world', [0, 1.4, -2.5]] },
      { say: 'Escreva <b>SETOR 7</b> no texto do decalque.', target: '[data-field="decal-text"]', done: ['decalText', 'SETOR 7'], act: ['fill', '[data-field="decal-text"]', 'SETOR 7'] },
      { say: 'Mais um decalque: clique de novo em <b>Decalque</b>.', target: '[data-action="decal-place"]', tab: 'build', done: ['tool', 'decal'] },
      { say: 'Cole-o mais embaixo, na mesma parede.', target: '#viewport', done: ['decals', 2], act: ['world', [1.2, .5, -2.5]] },
      { say: 'Em Conteúdo, escolha <b>Faixa de material</b>.', why: 'A faixa usa o material <b>Listras de alerta</b>: ângulo, largura, cores e desgaste em Material e textura. Estique até o tamanho da parede em Largura.', target: '.choice-field:has([data-field="decal-kind"]) [data-choice="surface"]', done: [['decals', 1, 'surface'], ['hazardOn']] },
      { say: 'Aperte <b>Esc</b> e clique no <b>piso</b> para selecioná-lo.', target: '#viewport', done: ['selected', 'floor'], before: ['key', 'Escape'], act: ['world', [1.6, 0, 1.2]] },
      { say: 'Em Material e textura, abra <b>Molhado</b> e marque <b>Superfície molhada</b>.', why: 'A superfície escurece e perde rugosidade; em faces voltadas para cima junta poças lisas.', target: '[data-field="wet-enabled"]', done: ['wetFloor'] },
      { say: 'Abra a aba <b>Ambiente</b> e marque <b>Reflexos de superfície</b>.', why: 'As poças passam a refletir o que está na imagem. Só nas qualidades equilibrada e alta.', target: '[data-field="rendering-surfaceReflections"]', tab: 'scene', done: ['rendering', 'surfaceReflections'] },
      { say: 'Marque <b>Ativar bloom</b>.', target: '[data-field="bloom-enabled"]', tab: 'scene', done: ['bloomOn'] },
      { say: 'Ponha o <b>Risco horizontal</b> em 0,6.', why: 'O risco sai só das luzes que já brilham acima do limiar do bloom, como a luz vermelha de um portão.', target: '[data-field="bloom-streak"]', tab: 'scene', done: ['bloomStreak'], act: ['fill', '[data-field="bloom-streak"]', '0.6'] },
      { say: 'Volte a <b>Construir</b>. Em Peças avulsas, clique em <b>Faíscas</b>.', target: '[data-action="sparks-place"]', tab: 'build', done: ['tool', 'place'] },
      { say: 'Clique no ar da sala, sobre o piso, para pôr a faísca.', target: '#viewport', done: ['effectType', 'sparks'], act: ['world', [1.6, 0, .4]] },
      { say: 'Agora a goteira: clique em <b>Goteira</b>.', target: '[data-action="drip-place"]', tab: 'build', done: ['tool', 'place'], before: ['key', 'Escape'] },
      { say: 'Clique no piso, sob o ponto de onde a água pinga.', target: '#viewport', done: ['effectType', 'drip'], act: ['world', [-1.8, 0, -1]] },
      { say: 'Guarde o enquadramento: <b>Salvar câmera atual</b>.', target: '[data-action="camera-save"]', tab: 'scene', done: ['cameras', 1], before: ['key', 'Escape'] },
      { say: 'Por fim, clique em <b>Salvar</b>.', target: '#save-scene', done: ['saved'] },
      { say: 'Pronto: tela, decalques, faixa de alerta, piso molhado com reflexo, risco de lente, faíscas e goteira.', why: 'A cena de exemplo <b>Galpão industrial</b>, em Abrir → Cenas de exemplo, junta tudo isso num galpão de 16 × 12 m.', done: ['read'], act: 'continue' },
    ],
  },
];
