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

- Lição **Primeiros passos** (29 passos): regiões da tela, prévia e confirmação, câmera, Assets, seleção, Propriedades, ferramentas, desfazer, Elementos, Ambiente, token, enquadramento, Apresentar e Salvar. Vem antes da Construção assistida na lista.

**15 de outubro — iluminação e o galpão, refeitos depois da primeira revisão**

A primeira versão foi rejeitada: a lição de luz misturava uma lâmpada quente, um candelabro e luminárias brancas do assistente (nada combinava e não ficava bonito), e não ensinava o bastante para refazer a luz do galpão ou da igreja; a lição do galpão não dizia onde pôr as peças e só citava os valores do exemplo, então o resultado ficava claro, vermelho e sem os materiais.

- **Iluminação e ambientação** (48 passos): uma capela à noite montada pela receita das cenas de exemplo. Escuro como base (Noite, lua 0,05, luz ambiente 0,06 azul-marinho, sem céu, janelas acesas desligadas); luz principal no candelabro (Vela / candelabro, força 10, alcance 6,5, sombras prioritárias); contraluz azul pelo vitral (Janela / vitral, #6f7fff); acento de velas sem sombra; zona com preenchimento marrom; piso molhado; névoa iluminada; reflexos; halo com limiar 1,4; os números do galpão e da igreja no fim. Duas famílias de cor, âmbar contra azul.
- **Galpão abandonado** em três partes que se continuam (`continues`): **1 · Casca e estrutura** (39 passos), **2 · Objetos e efeitos** (57), **3 · Luz e atmosfera** (27). Cada passo põe os valores do exemplo (cores e tamanhos de textura, desgaste, umidade, rotações, cores de material e de tela, força, alcance, origem e sombras de cada luz, névoa, halo, reflexos). O encaixe no grid é desligado no primeiro passo, para valerem as posições do exemplo; as repetições (lajes, tubos, colunas) vêm com as coordenadas.
- Motor: um ponto pulsando marca na cena onde clicar (`spot`, ou o ponto do gesto do passo), acompanhando a câmera. Condições `has`, `lookIs` e `moonIs` conferem um valor exato de uma peça ou do visual; `picked` confere a peça selecionada (a lição a seleciona pela busca de Elementos); `materialCopied` diz de onde veio o material.
- Correções no editor achadas ao percorrer: clicar no tampo de uma mesa ou altar agora põe o objeto em cima dele (antes ia para o chão, e o terminal ficava embaixo da mesa); a luz de uma janela nasce no vidro, apontada para dentro do cômodo (antes nascia no começo da parede, apontada para baixo).

**15 de outubro — segunda revisão**

- Toda cor tem, ao lado do seletor, uma caixa para o código hexadecimal (`hexBox` em `src/ui/controls.js`): aceita #a1b2c3, a1b2c3 ou #abc, confirma com Enter ou ao sair, e volta ao valor anterior se o código for inválido. O seletor nativo do sistema às vezes só oferece RGB. As lições digitam as cores nessa caixa.
- O cartão do tutor cobria o segundo campo de passos com vários campos (largura e comprimento, cor e força). Agora o anel envolve todos os campos que o passo pede no mesmo painel, com seus rótulos, e o cartão fica fora dessa área; seções recolhidas desses campos são abertas.

**22 de outubro — terceira revisão: gestos de verdade**

Problemas apontados: um passo do galpão era uma lista de coordenadas ("parece que estou programando a sala"); passos avançavam antes de a instrução terminar (pediam X, Y e Z e conferiam só Y; pediam duas coisas e a segunda estava na explicação); "Não encontrei este controle" na rotação; a laje não cobria o galpão.

- Regra para todo passo: **uma ação**, uma condição que confere **tudo** o que o passo pede, e a explicação nunca traz instrução. O E2E agora falha quando um passo se completa antes da última ação dele (condição incompleta).
- Posicionar como numa construção real: **G** move, **R** gira, **V** muda a escala, arrastando até o ponto que pulsa na cena (`spot`). Chegar perto basta: condições `near` (40 cm), `facing` (15°), `scaledTo` (12 %). Os números exatos ficam como dica opcional em Propriedades → Posição. Ajudantes `move`, `turn`, `stretch` e `copyTo` (duplicar e arrastar).
- Cores escolhidas no seletor, por descrição ("um cinza bem escuro"): `colorNear` aceita a mesma família de cor (matiz ±25°, ou claridade para cinzas); o código hexadecimal fica como atalho. Ajudante `tint`.
- Peças repetidas se distinguem pela seleção: `selectedHas`, `selectedNear`, `selectedColorNear`, `selectedSet`.
- O tutor abre o painel lateral recolhido (Ferramentas ou Propriedades) quando o controle do passo está nele; em telas estreitas eles começam recolhidos, e era isso que escondia a rotação.
- Galpão em **quatro** partes: 1 · A casca (29 passos), 2 · Estrutura e tubulação (49: colunas esticadas com V, mezanino arrastado com G, escada girada com R, guarda-corpo, duto, feixe de tubos, eletrocalha e tubo de parede, cada um em passos próprios, sem listas de coordenadas), 3 · Objetos e efeitos (56; a cobertura é uma laje só, erguida com G e esticada com V até cobrir 16 × 12 m), 4 · Luz e atmosfera (39). Passos cujo valor já vinha certo do padrão (texto SETOR 7, BOOTING, cor do perfil) saíram: não ensinavam nada.
- Iluminação e ambientação (53): mesma capela, cores pelo seletor e passos divididos.

**Falta**: etapa 3 (oferta na primeira visita), etapa 4 (ajuda no lugar), etapa 5 (novidades); recriar as demais cenas prontas (Igreja Antiga, Backrooms, Casa de bairro); uma lição exigir cena vazia hoje é só um aviso na lista, não cria a cena nova sozinha.
