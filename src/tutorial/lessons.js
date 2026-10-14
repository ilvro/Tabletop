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
      { say: 'Pronto: uma cozinha em ritual, uma casa mobiliada e o terreno em volta.', why: 'Tudo o que foi criado são objetos comuns, que você move, troca e apaga como qualquer outro. Experimente a vista Superior, o botão Telhados e, no Assistente de cômodo, as épocas Medieval e Futurista.', done: ['read'], act: 'continue' },
    ],
  },
];
