# Tutoriais — o que falta ensinar e como ensinar melhor

Data: 24 de outubro de 2026. Continua [TUTORIAL_PLAN.md](TUTORIAL_PLAN.md), que criou o motor e as primeiras lições. Este plano faz duas coisas: diz **quais recursos ainda não têm tutorial** e propõe **o que mudar no motor e no formato** para os tutoriais serem intuitivos, fáceis de aprender e úteis na mesa.

## Ponto de partida

O que já funciona e fica como está:

- Motor em `src/tutorial/` (anel no controle, cartão, ponto `spot` na cena, avanço por condição, Voltar / Pular / Sair, progresso salvo). O tutor só aponta; quem opera é a pessoa.
- Nove lições em três pastas: **Fundamentos** (Primeiros passos, Construção assistida), **Luz e câmera** (Iluminação e ambientação, Dirigir a cena ao vivo, Pistas e documentos) e **Galpão abandonado** (quatro partes).
- Toda lição é percorrida por `tests/e2e/tutorials.test.js`; uma lição quebrada falha no teste.
- Lições aparecem também na busca (Ctrl+K) e na tela inicial ("Aprender o básico").

O que o levantamento achou:

- **Das 129 ações da interface (`data-action`), só 34 aparecem em alguma lição.** As 95 restantes incluem quase todo o terreno, a paisagem, andares e camadas, pisos e acessos, o prédio por contorno, o projetor, a película, a iniciativa e as áreas de efeito.
- **A leitura tática inteira (23 de outubro) não tem lição**: paredes que se abrem, silhuetas, iniciativa, trilha de movimento, áreas de efeito, destacar interativos (H), selos de estado, zoom tático. É o que o mestre usa *durante* a sessão.
- As etapas 3 a 5 do plano anterior não foram feitas: o "?" em cada tarefa, a oferta na primeira visita e o aviso de novidade.

## Por que os tutoriais atuais ainda não bastam

1. **Grandes demais para quem só quer uma resposta.** As lições têm de 25 a 56 passos. Servem para quem quer aprender um tema inteiro, mas quem pergunta "como faço uma escada?" não tem uma resposta de um minuto.
2. **É preciso saber que a lição existe.** A ajuda mora num botão no trilho. Ninguém chega a ela pela tarefa onde está travado.
3. **A cena de prática é responsabilidade da pessoa.** `needs: 'empty'` só mostra um aviso. Quem começa uma lição com a própria cena aberta mistura as peças da lição com as dela, e as condições se confundem.
4. **O retorno é tudo ou nada.** `near`, `facing`, `scaledTo` e `colorNear` dizem "sim" ou "ainda não". Quem arrasta uma coluna não sabe se falta 10 cm ou 3 m, nem para que lado.
5. **Nada confere se a pessoa aprendeu.** Todo passo vem com o anel em volta do controle. A lição termina e não fica claro se ela faria aquilo sozinha.
6. **Não se vê aonde a lição vai chegar.** A lista mostra título e resumo, sem a imagem do resultado.

## Recursos que precisam de tutorial

Por prioridade: primeiro o que o mestre usa na mesa e que hoje ninguém descobre sozinho, depois a construção que o assistente não cobre, por último o ajuste fino.

### A · Sessão de jogo (nenhuma lição hoje)

| Recurso | Onde fica | Por que precisa de tutorial |
| --- | --- | --- |
| Iniciativa, rodada, **N**, faixa de retratos, câmera até a vez | Tomadas → Sessão → Combate | Fluxo de vários passos, com atalho próprio; ninguém acha "Combate" dentro de Tomadas por acaso |
| Trilha de movimento, deslocamento por turno, regra de diagonal | Propriedades → Posição → Movimento; Construir → Grid e precisão | São três lugares diferentes para um recurso só |
| Áreas de efeito (círculo, cone, linha, quadrado) | Combate → Áreas | É um gesto de arrastar no chão; o anel em quem foi atingido passa despercebido |
| Destacar interativos (**H**), selos de estado | Tecla H; Figura → estado | Só tecla, sem botão visível |
| Paredes que se abrem, silhuetas, zoom tático | Ambiente → Iluminação dinâmica; Tomadas → Câmera | Opções desligadas por padrão: quem não sabe que existem nunca liga |
| Projetor, publicar câmera, câmera ao vivo (**L**), cartela de título, película (ensaiar / cortar) | Tomadas → Projetor, Película | "Primeiros passos" só mostra o Apresentar; a segunda tela é o coração da mesa e não tem lição |
| Personagens: token e figura 2D recortada, retrato, estados, "só do mestre" | Construir → Tokens; Propriedades → Figura | Close, Seguir e Lanterna estão em "Dirigir a cena"; o resto, não |

### B · Construção que o assistente não cobre

| Recurso | Onde fica | Observação |
| --- | --- | --- |
| Terreno: criar, esculpir (**T**), nivelar, pintar, camadas, proteger pisos, montanha | Construir → Terreno e relevo | Nenhuma lição; é um gesto de pincel |
| Água (lago, rio desenhado, leito, gelo) e vegetação | Construir → Água e vegetação | Nenhuma lição |
| Pisos por contorno, paredes pelo contorno, buraco no piso, escada e rampa | Construir → Pisos, paredes e acessos | Desenhar polígono não é óbvio (clicar os cantos, fechar) |
| Andares e camadas: criar, duplicar, isolar, travar | Construir → Andares e camadas | Sem andares ninguém faz um sobrado |
| Prédio por contorno, células, ampliar, trocar e acrescentar cômodos, variações | Construir → Prédio | A Construção assistida só usa "Novo prédio" com o padrão |
| Rochas esculpidas, neve por exposição | Propriedades da rocha | Usado nas cenas da montanha e do templo |
| Materiais: amostras, desgaste, umidade, conta-gotas (**I**), copiar / colar material, pincel de superfície | Propriedades → Aparência | Aparece dentro do Galpão 1, misturado; falta uma lição curta só disso |
| Assets próprios: importar, agrupar (montagens), cabos, telas animadas | Assets; Propriedades | Importar é o pedido mais comum de quem traz os próprios modelos |
| Acabamento e detalhes do assistente (`polish`, `details`), variações | Assistente de cômodo | Botões "variação" nunca aparecem nas lições |

### C · Ajuste fino e organização

- Ambientes salvos: guardar, sobrescrever, apagar; objetos que acendem à noite; interruptores de luz.
- Iluminação dinâmica por objeto: copiar e colar a luz, escolher a origem, recalcular, encaixar a zona.
- Elementos: pastas, esconder, travar, filtros; régua (**M**); Ctrl+K; atalhos (**?**); tema e cor de destaque.

### Projetos (refazer cenas prontas)

O galpão já tem as quatro partes. Faltam a **Casa de bairro**, a **Igreja Antiga**, a **Subida da montanha**, o **Templo gelado** e os **Backrooms**. Cada um ensina um conjunto que nenhuma lição curta cobre: a casa, prédio e entorno; a igreja, luz de vitral e névoa; a montanha e o templo, terreno, rocha e neve; os backrooms, repetição e luz fluorescente.

## Três formatos, uma só fonte

Uma lição continua sendo dados em `lessons.js`, testada pelo mesmo E2E. O que muda é que ela declara o **formato**, e o motor e a lista se comportam conforme ele.

| Formato | Duração | Passos | Abre por | Cena |
| --- | --- | --- | --- | --- |
| **Dica** | 30 s a 2 min | 3 a 8 | "?" da tarefa, Ctrl+K ("como fazer…") | A cena aberta, quando não precisa de nada específico; senão uma cena de treino |
| **Lição** | 5 a 10 min | até 25 | Lista de tutoriais, recomendação | Sempre uma cena de treino (vazia ou um exemplo) |
| **Projeto** | várias partes de 10 a 15 min | até 40 por parte | Lista, pasta própria | Exemplo refeito do zero, partes que se continuam |

Regras que valem para os três (das revisões de 15 e 22 de outubro):

- Um passo, **uma ação**; a condição confere tudo o que o passo pede; a explicação nunca traz instrução.
- O resultado é desenhado **antes** dos passos: paleta coerente, renderizado e conferido. Toda lição termina numa cena bonita.
- Ao refazer uma cena, a pessoa **põe** cada valor que define o visual, e o ponto `spot` mostra onde.
- Posicionar com os gestos (**G**, **R**, **V**) até o ponto marcado; o número exato fica como dica opcional.
- Construção assistida parte do que a pessoa fez e transforma o que está lá; a lição nunca troca isso por um arranjo pronto.
- `say` com uma frase só; `why` com até duas. O teste de formato passa a conferir o tamanho.

## O que muda no motor

Cada item cita onde mexe e como se testa. Nenhum deles muda o princípio de que o tutor só aponta e espera.

### 1. Cena de treino automática

Hoje `needs: 'empty'` é um aviso. Passa a ser preparado pelo motor:

- `needs: 'empty'` cria uma cena nova chamada "Treino · <lição>"; `needs: { example: 'casa-de-bairro' }` abre uma cópia do exemplo; `continues` reabre a cena de treino da parte anterior, se existir.
- Antes de trocar, a cena da pessoa é guardada como rascunho (o mesmo rascunho automático de hoje). Ao sair ou concluir, o cartão oferece **Voltar para a minha cena** e **Ficar no treino**.
- Uma dica que não precisa de nada roda na cena aberta, que é o lugar onde ela é útil.

Onde: `start()` em `tutor.js` ganha um `host.prepareScene(lesson)`; a implementação fica em `application.js`, ao lado de `tutorial-start`. Teste: E2E começa uma lição com uma cena cheia aberta e confere que a cena original volta intacta.

### 2. "Quase lá": retorno gradual

As condições de proximidade ganham uma medida (`measure`) ao lado do `met`, em `conditions.js`:

- `near`: "falta 1,2 m, para a parede do fundo" (a direção vem da câmera, não dos eixos);
- `facing`: "gire mais 30° para a esquerda";
- `scaledTo`: "ainda baixa: estique para cima";
- `colorNear`: "a cor está certa; falta escurecer";
- `atLeast` e `copies`: "2 de 4".

O cartão mostra a medida numa linha discreta abaixo da instrução, com uma barra que enche. Teste unitário para cada medida; E2E confere que a linha aparece e muda durante um passo de `near`.

### 3. Ajuda em degraus, nunca automática

Quem fica parado num passo recebe ajuda aos poucos, sem que o tutor faça por ela:

1. Depois de ~20 s sem progresso, o anel pulsa mais forte e aparece **Mostrar onde** (abre o painel, rola até o controle, marca o ponto na cena).
2. Depois de ~45 s, ou ao pedir, **Mostrar o valor**: o cartão mostra os números exatos que o `act` do passo usaria ("Posição 4,0 · 0 · −2,5"; "#2b2f33").
3. **Pular passo** continua sempre lá.

O "valor" sai do `act` que o teste já usa, então nenhuma lição precisa ser reescrita. Um passo pode trazer `hint` próprio quando o `act` não diz nada útil.

### 4. "Agora sozinho": prática sem o anel

Um passo com `try: true` não aponta nada: mostra só o objetivo ("Ponha um segundo token e mova até a porta"). Se a pessoa travar, a ajuda em degraus aponta. Toda lição termina com um ou dois passos assim, repetindo o que acabou de ensinar com outro objeto. É o que mostra se ela aprendeu; o E2E percorre esses passos como os outros.

### 5. Ver o destino e o que se aprendeu

- **Prévia do resultado** em cada cartão da lista: o E2E captura o quadro final de cada lição (`test-results/lessons/<id>.png`) e um script converte em `public/tutorials/<id>.webp`. Como sai do mesmo percurso dos testes, a imagem nunca fica velha.
- **Recapitulação** no último cartão: o que foi aprendido, montado dos passos marcados com `learn` (por exemplo `learn: ['G', 'Mover']`), com as teclas em `<kbd>` e um link para os atalhos. Ao lado, a recomendação do próximo tutorial (`next`).

### 6. Ajuda no lugar

- Cada tarefa de `task-definitions.js` ganha um "?" no título quando existe dica ou lição com `task: '<chave>'`. Clicar abre a dica direto, sem passar pela lista.
- `tests/tutorials.test.js` lista as tarefas sem tutorial. Começa como relatório e passa a falhar quando a lista zerar, para que nenhuma tarefa nova entre sem ajuda.
- Ctrl+K já lista as lições; as dicas entram com frases de busca ("como fazer escada", "como importar modelo").

### 7. Primeira visita, trilhas e novidades

- A tela inicial troca "Aprender o básico" por duas trilhas: **Vou mestrar** (Primeiros passos → Conduzir a sessão → Combate na mesa) e **Quero construir** (Primeiros passos → Construção assistida → Terreno → Iluminação). A lista de tutoriais mostra a trilha escolhida no topo.
- Uma lição com `since: 'AAAA-MM-DD'` mais nova que a última visita põe um ponto no botão Tutoriais, uma vez. Nada abre sozinho.

### 8. Saber onde as pessoas travam

O motor anota no `localStorage`, só no navegador, os passos pulados, as voltas, o tempo por passo e os alvos não encontrados. Em Configurações → Tutoriais, **Exportar relatório** gera um JSON. Serve para quem desenvolve achar os passos confusos depois de um teste com uma pessoa real; nada sai do computador.

## Lições novas

Cada uma com o resultado desenhado antes dos passos.

**Sessão** (nova pasta "Na mesa"):

1. **Conduzir a sessão** (lição, Casa de bairro): abrir o projetor, publicar uma tomada, ensaiar e cortar na película, cartela de título, câmera ao vivo com **L**, o que é "só do mestre". Resultado: o projetor mostrando o título sobre a casa ao entardecer.
2. **Combate na mesa** (lição, Igreja Antiga ou Casa de bairro à noite): três tokens com deslocamento de 9 m, regra de diagonal, começar o combate, digitar a iniciativa, **N**, mover com **G** vendo a trilha verde, amarela e vermelha, uma área de 6 m sobre dois inimigos, selo FERIDO, **H**, paredes que se abrem e zoom tático. Termina com "Agora sozinho: passe a vez e mova o próximo".
3. **Personagens e figuras** (lição): token e figura recortada, retrato, base, estados, só do mestre, close e lanterna.

**Construção** (pasta "Construir mais"):

4. **Clareira à beira do rio** (lição): terreno, esculpir com **T**, pintar, rio desenhado, vegetação, proteger o piso de uma cabana.
5. **Um sobrado** (lição): piso por contorno, paredes pelo contorno, segundo andar, escada, buraco no piso, isolar e travar andares.
6. **Prédio sob medida** (lição): desenhar o contorno, mexer nas células, trocar e acrescentar cômodos, ampliar um prédio que já existe, variações.
7. **Materiais e desgaste** (lição curta): amostras, desgaste, umidade, conta-gotas, copiar e colar material, pincel de superfície.
8. **Seus próprios modelos** (dica): importar, agrupar, salvar como asset.

**Dicas** (primeiras doze, uma por tarefa): desenhar sala, escada e rampa, buraco no piso, andares, grid e régua, esculpir terreno, rio, vegetação, áreas de efeito, cartela de título, salvar ambiente, pastas e travas em Elementos.

**Projetos**: Casa de bairro (3 partes), Igreja Antiga (4), Subida da montanha (3). Iluminação e ambientação (53 passos) se divide em duas lições, *A base escura e a luz principal* e *Contraluz, acentos e ar*.

## Etapas

Cada etapa é um commit testado e entra em `progress.md`.

1. **Motor: cena de treino, "quase lá", ajuda em degraus, passos `try`.** É o que deixa todas as lições, inclusive as atuais, mais fáceis. Valida: testes unitários das medidas, E2E da cena preservada, E2E de todas as lições atuais ainda passando.
2. **Formato Dica, "?" nas tarefas e relatório de cobertura**, com as doze primeiras dicas. Valida: E2E abre a dica pelo "?" e a conclui; o relatório lista o que falta.
3. **Pasta "Na mesa"**: Conduzir a sessão, Combate na mesa, Personagens e figuras; marca `since` e o ponto de novidade. Valida: E2E das três; capturas do quadro final conferidas.
4. **Pasta "Construir mais"**: Clareira, Sobrado, Prédio sob medida, Materiais, Seus próprios modelos.
5. **Prévias, recapitulação, trilhas na tela inicial e recomendação do próximo.** Valida: as imagens são geradas pelo E2E; a tela inicial abre a trilha certa.
6. **Projetos e divisão da Iluminação.** Cada projeto comparado com a cena original na mesma câmera antes de ser dado como pronto.
7. **Relatório local e um teste com uma pessoa que nunca usou o Tabletop**: Vou mestrar do começo ao fim e Clareira à beira do rio. Os passos com mais pulos e tempo são revistos.

1 vem antes de tudo porque melhora o que já existe. 2 e 3 são o que mais ajuda quem usa hoje: a sessão de jogo é o recurso mais novo e o menos descoberto. 4 a 6 podem andar em paralelo, uma lição por vez.

## Riscos

- **Tempo do E2E**: cada lição aumenta a suíte. Dicas são curtas; lições em exemplos grandes continuam `heavy`; dá para separar um comando que roda só as lições alteradas.
- **Dica na cena da pessoa**: ela mexe na cena de verdade, de propósito. Por isso só roda lá a dica cujas condições não dependem de peças específicas; o resto vai para o treino.
- **Troca de cena**: perder algo não salvo seria pior que qualquer tutorial ruim. O rascunho é gravado antes, e o E2E confere que a cena volta igual.
- **Ajuda que vira atalho**: "Mostrar o valor" pode levar a copiar números sem entender. Ela aparece só depois de um tempo e nunca nos passos `try`.
- **Arquivos em edição por outras sessões**: as etapas 1 a 3 mexem em `application.js` (troca de cena, "?" nas tarefas, `tutorialState`), que outra sessão está editando para a leitura tática. Combinar antes e commitar só os próprios trechos.

## Como validar

- Uma pessoa nova conduz um combate com iniciativa, trilha e área seguindo só **Combate na mesa**, e depois repete sem o tutorial.
- Quem está travado numa tarefa chega à resposta pelo "?" em menos de três cliques.
- Nenhuma tarefa do painel fica sem dica ou lição (relatório de cobertura vazio).
- Começar e sair de qualquer lição deixa a cena da pessoa exatamente como estava.
- O quadro final de cada lição, gerado pelo E2E, é bonito e parecido com o alvo desenhado.

## Andamento

**24 de outubro — etapas 1, 2 e 3, e parte da 5**

Motor (`src/tutorial/tutor.js`, `conditions.js`):

- **Cena de treino**: `needs: 'empty'` abre uma cena "Treino · <lição>" quando a cena aberta tem algo; `needs: { example }` abre uma cópia do exemplo. A cena da pessoa fica guardada (rascunho gravado antes; a cena de treino não grava rascunho enquanto não for salva) e volta com **Voltar para “…”**, no cartão final ou no topo da lista. Um segundo clique em Começar durante o carregamento não faz nada.
- **"Quase lá"** (`MEASURES` e `measure`): `near`, `selectedNear`, `tokenNear`, `facing`, `scaledTo`, as quatro de cor, e as de contagem dizem quanto falta, com a direção vista da câmera, e enchem uma barra.
- **Ajuda em degraus**: aos 20 s o anel insiste; aos 35 s, **Mostrar o valor** lê os números dos gestos do próprio passo (ou `hint`). Passos `try` ("Agora sozinho") não apontam nada até **Mostrar onde**.
- **Vários pontos na cena**: `spot` aceita uma lista; os pontos aparecem numerados.
- **Cartão final**: "O que você aprendeu" (passos com `learn`), **Próximo** (`next`) e a volta à cena da pessoa.
- **Novidades**: `since` acende um ponto no botão Tutoriais e um selo "Novo" na lista, até a lista ser fechada.
- **Trilhas** no topo da lista: *Vou mestrar* e *Quero construir*, com o próximo tutorial não feito.
- **Relatório local**: passos pulados, voltas, tempo, ajuda pedida e alvos não achados, em `localStorage`; **Exportar relatório**, no fim da lista.

Formato: `kind` (`tip`, `lesson`, `project`), `task` (as tarefas cujo "?" abre o tutorial), `next`, `since`, `ask` (frases de busca do Ctrl+K), `try`, `learn`, `hint`.

Ajuda no lugar: `taskList` põe um "?" no título de cada tarefa com tutorial (`lessonForTask`, dica primeiro). Clicar abre o tutorial sem dobrar a tarefa.

Lições novas, todas percorridas pelo E2E:

- **Dicas rápidas**: Sala em L pelo contorno, Um segundo andar, Uma colina com árvores, Grid de 1,5 m e régua, Segunda tela e cartela, Ensaiar e cortar, Guardar um ambiente, Chuva na cena.
- **Na mesa**: **Conduzir a sessão** (13 passos, cópia da Casa de bairro: segunda tela, cartela, ensaiar e cortar, barras de cinema, câmera ao vivo, e um corte feito sozinho) e **Combate na mesa** (23 passos: três tokens, deslocamento, regra de diagonal, iniciativa, N, trilha até a varanda, bola de fogo sobre o Vulto, H, abrir paredes e silhuetas, e passar a vez sozinho até a rodada 2).
- **Primeiros passos** ganhou um passo "agora sozinho" e as marcas `learn`; as demais lições ganharam `kind`, `task` e `next`.

Testes: `tests/tutorials.test.js` confere formato, tamanho das dicas, referências (`next`, `task`, exemplo), cobertura das tarefas e as medidas; `tests/e2e/tutorials.test.js` ganhou o gesto `drag`, os passos `try`, a escolha por posição, a espera pela cópia do exemplo, uma captura quando um passo falha e o quadro final de cada lição (`test-results/tutorial-<id>-final.png`), e um teste da ida e volta da cena de treino pelo "?".

**Falta**:

- Tarefas sem tutorial: **Tokens** (personagens), **Céu e nuvens**, **Objetos que acendem à noite** (o teste de cobertura lista as três). A lição *Personagens e figuras* precisa de um retrato de exemplo na biblioteca, que hoje não tem nenhuma imagem.
- Etapa 4 (Clareira, Sobrado, Prédio sob medida, Materiais, Seus próprios modelos) e etapa 6 (projetos Casa de bairro, Igreja Antiga, Montanha; dividir a Iluminação, 53 passos).
- Prévia do resultado na lista: os quadros finais já saem do E2E; falta convertê-los em `public/tutorials/<id>.webp` e mostrá-los no cartão.
- Teste com uma pessoa que nunca usou o Tabletop.
