# Plano do tutorial

Objetivo: quem abre o Tabletop pela primeira vez consegue montar uma cena, e quem já usa descobre o que ainda não conhece (o assistente de cômodo, o prédio, os estados, a luz). Escrito em 11 de outubro de 2026.

## O problema a resolver

O projeto cresceu mais rápido do que a interface consegue explicar. Um exemplo real desta semana: para testar o prédio foi preciso um passo a passo por escrito, e mesmo assim o botão *Assets* não foi encontrado porque tinha mudado de lugar. Um tutorial escrito à mão uma vez envelhece do mesmo jeito: cada mudança de interface o deixa errado sem ninguém perceber.

Por isso "escalável" aqui quer dizer três coisas:

1. **Acrescentar uma lição custa pouco.** Uma lição é um arquivo de dados, sem código de interface.
2. **As lições não apodrecem.** Cada uma é executada automaticamente nos testes; se a interface mudar e um passo deixar de funcionar, o teste falha.
3. **O mesmo conteúdo serve a vários usos.** Percurso guiado, ajuda no lugar, busca e documentação saem da mesma fonte.

## Como funciona

### Lição como dados

Uma lição é uma lista de passos. Cada passo tem:

- **o que dizer**: uma frase de instrução e, se preciso, uma de explicação;
- **para onde apontar**: um alvo pelos identificadores que a interface já usa (`data-action`, `data-field`, `data-tab`, `data-build-section`), nunca por posição na tela ou texto do botão;
- **quando está feito**: uma condição sobre o estado (a cena tem um piso; o fogão está numa cozinha; a aba Elementos está aberta), não "clicou em tal botão". Assim a pessoa pode chegar ao resultado por outro caminho, e o passo se cumpre sozinho se ela já tiver feito aquilo;
- **o que preparar**, opcional: abrir a aba ou a tarefa onde o alvo mora, do mesmo jeito que o auxiliar `reveal` dos testes já faz.

As condições usam o que já existe para os testes (`window.__tabletop.snapshot()` e afins), exposto como uma pequena biblioteca de verificações com nome: `temPiso`, `temObjeto('builtin-stove')`, `comodoReconhecido('kitchen')`, `abaAberta('elements')`.

### O motor

Um componente único lê a lição e cuida de: destacar o alvo, mostrar o balão ao lado dele, abrir o painel certo antes, observar a condição e avançar, permitir pular, voltar e sair, e lembrar o progresso no navegador. Ele não conhece nenhuma lição em particular.

Se o alvo não existir (interface mudou, janela estreita demais), o motor não trava: mostra a instrução em texto, sem destaque, e registra o problema.

### Onde entra

- **Primeira vez**: três caminhos na tela inicial (abrir um exemplo, começar do zero com o guia, pular).
- **Central de aprendizado**: um botão fixo de ajuda com a lista de lições, o que já foi feito e quanto tempo cada uma leva.
- **Ajuda no lugar**: cada tarefa do painel ganha um "?" que abre a lição daquela tarefa. A ligação é feita pelo mesmo identificador da tarefa, então uma tarefa sem lição aparece numa lista de pendências em vez de ficar esquecida.
- **Novidades**: uma lição marcada como nova aparece uma vez para quem já usava o aplicativo.

## Lições previstas

Curtas, de dois a cinco minutos, cada uma terminando com algo visível na cena.

1. **Primeira sala**: desenhar, aceitar a prévia, orbitar e enquadrar.
2. **Colocar e ajustar objetos**: biblioteca de assets, mover, girar, propriedades.
3. **Assistente de cômodo**: colocar uma peça, ver o reconhecimento, completar o que falta.
4. **Estado do lugar e luz**: abandonado, ritual, clima da luz, atmosfera da cena.
5. **Um prédio**: contorno, tipo, completar algo já começado, acrescentar um cômodo.
6. **Materiais**: amostras de textura, padrão, desgaste.
7. **Terreno e paisagem**: relevo, água, vegetação.
8. **Apresentar**: enquadramentos, segunda tela, o que o mestre vê e o que os jogadores veem.

## Etapas

### 1. Formato e motor

Formato da lição, biblioteca de condições, motor com destaque, balão, preparação do painel, avanço por condição, pular/voltar/sair e progresso salvo. Entrega junto a lição 1, para provar o formato.

### 2. Lições testadas

Um teste de ponta a ponta genérico que percorre **todas** as lições: para cada passo, confere que o alvo existe e está visível depois da preparação, executa a ação esperada e confere que a condição se cumpre. Uma lição nova entra nos testes sem escrever teste novo. Também um teste que valida o formato de cada arquivo (alvos com identificadores conhecidos, condições que existem).

### 3. Central e primeira vez

Botão de ajuda, lista de lições com progresso, tela inicial com os três caminhos. Lições 2 e 3.

### 4. Ajuda no lugar

O "?" por tarefa, a lista de tarefas sem lição e as lições 4 a 6.

### 5. Novidades e restante

Marcação de lição nova, lições 7 e 8, e a exportação das lições como página de documentação com capturas geradas pelo mesmo percurso dos testes, para que o manual escrito também não envelheça.

## Ordem e dependências

1 → 2 são o que torna o tutorial sustentável e vêm juntas. 3 e 4 são o que o usuário vê. 5 fecha. A busca de comandos do plano de interface (etapa 5 de `UI_REWORK_PLAN.md`) pode usar o mesmo índice de alvos e tarefas.

## Riscos

- **Condições frágeis**: uma condição mal escrita que nunca se cumpre prende a pessoa. Todo passo tem "pular", e o teste genérico pega a maioria antes.
- **Janela estreita**: painéis recolhidos mudam onde os alvos estão; a preparação do passo precisa abrir o painel, como já acontece nos testes.
- **Excesso**: tutorial que interrompe irrita. Nada abre sozinho depois da primeira vez, exceto o aviso de novidade, uma vez.
- **Texto**: instruções curtas, na voz do aplicativo, sem jargão interno ("receita", "composição", "slot").

## Como validar

- Uma pessoa que nunca viu o aplicativo monta uma sala mobiliada seguindo só a lição 1 e a 3.
- Mudar o identificador de um botão usado numa lição faz o teste genérico falhar.
- Acrescentar a lição 9 exige apenas um arquivo novo.

## Andamento

**13 de outubro — etapas 1 e 2 com a primeira lição**

- Motor em `src/tutorial/tutor.js`: anel sobre o controle, cartão ao lado, avanço quando a condição do passo vale, Voltar / Pular passo / Sair, aviso quando o alvo não está na tela, progresso em `localStorage` (`tabletop-tutorials-v1`). O tutor só aponta e espera; nunca edita a cena.
- Condições em `src/tutorial/conditions.js`; lições em `src/tutorial/lessons.js`. Acrescentar uma lição é acrescentar uma entrada de dados.
- Entrada: botão **Tutoriais** na barra superior abre a lista de lições (Começar, Continuar do passo N, Refazer). Ficou na barra e não numa aba lateral porque as abas laterais precisam ficar livres enquanto a lição aponta para elas.
- Lição **Construção assistida** (26 passos): sala, fogão à mão, leitura do assistente, completar, estado Ritual, luz, prédio novo, entorno.
- Testes: `tests/tutorials.test.js` (formato das lições e condições) e `tests/e2e/tutorials.test.js`, que percorre toda lição de `LESSONS` passo a passo e falha quando um alvo some ou uma condição deixa de poder ser cumprida.

**Falta**: etapa 3 (oferta na primeira visita), etapa 4 (ajuda no lugar), etapa 5 (novidades); lições de recriar cenas prontas, que dependem das duas cenas de referência; uma lição exigir cena vazia hoje é só um aviso na lista, não cria a cena nova sozinha.
