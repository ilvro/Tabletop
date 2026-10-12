# Plano de construção assistida

Objetivo: montar cenas e ambientações completas com pouco esforço, sem tirar a autonomia de quem quer editar tudo à mão. Escrito em 11 de outubro de 2026 a partir da leitura de `src/authoring/`.

## Onde estamos

- **Sala** (`quick-build.js`): um retângulo com piso, quatro paredes, uma porta e uma luz.
- **Mobiliar cômodo** (`furnishing.js`): três receitas (escritório, reunião, depósito) com posições fixas em metros a partir do centro. Usam cinco modelos (mesa, cadeira, armário, luminária, caixa) dos 244 da biblioteca.
- **Ajustes** (`polish.js`): alinhar, distribuir, variar rotação e material.
- **Vegetação, água e montanha**: distribuição por pincel ou área.

O que já funciona bem e deve ser mantido: tudo passa por uma **proposta** com prévia, que só entra na cena ao aceitar; o resultado são objetos comuns; regenerar preserva o que foi editado ou excluído à mão; portas reservam passagem.

O que falta: as receitas não conhecem paredes, cantos nem janelas; não existe casa, delegacia, hospital, igreja, bar; nada coloca objetos pequenos, sujeira, desgaste ou clima; não há como gerar um prédio ou uma cena inteira; a biblioteca nova quase não é usada.

## Princípios

- **Assistente, não catálogo de prontos.** O ponto de partida é o que a pessoa já fez. O sistema lê a cena, deduz a intenção, aproveita as peças dela e propõe o próximo passo; receitas e estados são conhecimento que ele usa, não blocos que despeja.

- **Descrever a intenção, revisar o resultado.** Tipo de lugar, tamanho, estado e clima; o sistema propõe, a pessoa aceita, troca ou ajusta.
- **Nada vira caixa-preta.** Tudo o que é gerado é objeto comum, editável, e regenerar nunca desfaz edição manual.
- **Mesma semente, mesmo resultado.** Variações são escolhidas, não sorteadas a cada clique.
- **Dentro do orçamento.** Luzes e objetos gerados respeitam os limites de desempenho já medidos.

## Etapas

### 1. Receitas por regras

Trocar coordenadas fixas por regras de posicionamento: *encostado na parede*, *no canto*, *no centro*, *em volta de* (cadeiras e mesa), *em cima de* (objetos sobre móveis), *na parede* (quadros, prateleiras), *no teto* (luminárias), *de frente para* (sofá e TV). Um solucionador escolhe posições respeitando portas, janelas, folgas de passagem e o formato real do piso, inclusive polígonos. Receitas viram dados, com quantidades por área e densidade. É a base de todas as etapas seguintes.

### 2. Catálogo de cômodos

Cerca de vinte cômodos em temas que a biblioteca já cobre: casa (sala, cozinha, quarto, banheiro, garagem), delegacia (recepção, sala de interrogatório, cela, arquivo), hospital (enfermaria, consultório, necrotério), escritório, biblioteca, bar, laboratório, oficina, depósito, igreja e sala de ritual. Cada um com miniatura e duas ou três variações de arranjo para escolher lado a lado.

### 3. Estado do lugar

Uma segunda escolha, independente do cômodo: **arrumado**, **habitado**, **abandonado**, **cena de crime**, **ritual**. Muda bagunça, móveis tombados, sangue, velas, símbolos, e aplica o desgaste de materiais que já existe (sujeira, ferrugem, bordas gastas). É o que dá cara de Ordem Paranormal com um clique.

### 4. Ambientar

Um passo "Ambientar" sobre qualquer cômodo, gerado ou feito à mão: objetos pequenos sobre mesas e prateleiras, itens de parede, luminárias de verdade com perfil de luz no lugar de pontos de luz soltos, e sugestão de atmosfera (horário, névoa, clima) coerente com o estado.

### 5. Prédio a partir do contorno

Desenhar o contorno e escolher o tipo (casa, delegacia, clínica, galpão): o sistema divide em cômodos com corredor, abre portas e janelas, põe telhado e mobília cada cômodo com as etapas anteriores. Cada cômodo continua regenerável sozinho.

### 6. Terreno e entorno

Lote com muro ou cerca, caminho até a entrada, calçada, vegetação e objetos de rua, usando as ferramentas de paisagem que já existem.

### 7. Cena pronta

Um assistente de quatro perguntas (lugar, tamanho, estado, clima) que encadeia 5, 6, 2–4, atmosfera e enquadramentos de câmera, e entrega uma cena jogável. Depois disso, tudo segue editável pelas ferramentas normais.

### 8. Descrição em texto (opcional)

Escrever "delegacia abandonada à noite, com uma cela arrombada" e converter para os mesmos parâmetros do assistente. Depende de um modelo de linguagem e de chave de API; fica por último e nunca é obrigatório.

## Ordem

1 → 2 dão o maior salto visível e sustentam o resto. 3 e 4 são o que diferencia o resultado de um gerador genérico. 5 e 6 ampliam de cômodo para lugar. 7 só junta o que já existir.

## Como validar

- Mesma semente gera a mesma proposta; nenhuma peça sobreposta ou fora do piso; toda porta alcança o centro do cômodo.
- Regenerar preserva edições e exclusões manuais, como hoje.
- Cena gerada dentro do orçamento de luzes e do tempo de quadro medido em `docs/RENDER_SCALE_PLAN.md`.
- Capturas de cada cômodo e estado para revisão visual.

## Andamento

### Etapas 1 e 2 — entregues (11 de outubro)

**Receitas por regras**

- `src/authoring/room-layout.js` lê o cômodo (`roomFrame`): paredes a partir do contorno real do piso, inclusive polígonos; recuo pela espessura das paredes; vãos de portas e janelas. `candidates` devolve posições em ordem de preferência para cada regra: `wall`, `corner`, `center`, `front`/`behind`, `beside`, `around`, `ring`, `on`, `under`, `grid`, `free`.
- `src/domain/room-recipes.js` guarda as receitas como dados: modelo, regra, densidade mínima, quantidade por densidade, referência a outra peça.
- `src/authoring/furnishing.js` continua dono da proposta, da preservação de edições e exclusões e das luzes; só a escolha de posições mudou. Uma peça não guarda folga da peça a que pertence (cadeira e mesa); objetos sobre móveis usam o móvel como apoio; quadros, espelhos e painéis ficam pendurados na altura; tapetes e círculos não ocupam espaço.
- Móveis altos não cobrem janelas; a passagem das portas fica livre; a parede da porta é a última escolha para as peças principais.
- A mesma semente repete o cômodo; **Ver outra arrumação** troca só a semente e mantém os mesmos objetos.

**Catálogo: 26 cômodos**

Trabalho (escritório, reunião, investigação), casa (sala de estar, cozinha, jantar, quarto, banheiro, garagem), delegacia (recepção, interrogatório, cela, arquivo), saúde e ciência (enfermaria, consultório, necrotério, laboratório), comércio e lazer (biblioteca, bar, sala de aula, mercado), indústria (depósito, oficina, monitoramento), religioso e paranormal (capela, sala de ritual). Usam 113 modelos da biblioteca; antes eram 5.

**Compatibilidade**: os parâmetros salvos são os mesmos (`template`, `density`, `chairs`, `seed`, `lighting`); `recipeVersion` passa a 2 e a versão 1 continua válida. Regenerar um cômodo antigo reposiciona o que não foi editado.

**Ferramentas de revisão**: `node scripts/review-rooms.js <dir> [largura comprimento densidade semente]` desenha a planta de todos os cômodos; `node scripts/capture-rooms.js <dir> <receitas>` renderiza no editor real. Referências em `docs/references/assisted-build/`.

**Testes**: `tests/room-recipes.test.js` percorre os 26 cômodos em três densidades e dois tamanhos (sem sobreposição, porta livre, apoio correto, documento válido, regeneração estável), repetição por semente, janelas e piso em L. `tests/e2e/assisted-rooms.test.js` cobre o painel.

**Diferenças em relação ao plano**

- A escolha é por lista agrupada, sem miniatura; as variações aparecem uma por vez com "Ver outra arrumação", não lado a lado.
- Itens de parede são posicionados na altura, sem vínculo com a parede: não acompanham se a parede for movida. O vínculo fica para a etapa 4.
- Não há folga na frente de móveis (um guarda-roupa pode ficar perto de uma cama), só a passagem das portas.
- Em cômodos pequenos parte da receita não cabe; a prévia lista o que ficou de fora. Um carro só cabe em garagem com 5,5 m ou mais de comprimento.
- Luminárias de teto e luzes com perfil continuam como pontos de luz distribuídos (etapa 4).

### Etapa 3 e leitura do cômodo — entregues (11 de outubro)

Orientação recebida antes desta etapa: não é para ser um conjunto de presets; a ferramenta deve entender o que a pessoa está fazendo, adaptar-se e ajudar. Por isso a etapa 3 veio junto com a parte do assistente que lê a cena.

**O assistente lê o cômodo** (`src/authoring/room-insight.js`)

- Deduz que cômodo é a partir das peças presentes, pesando mais as que identificam um lugar (um fogão diz mais que uma cadeira). Uma peça colocada à mão já basta; a sugestão muda conforme a pessoa acrescenta objetos e para de mudar quando ela escolhe um tipo.
- Diz o que costuma haver naquele cômodo e ainda falta, e aponta problemas: objeto na passagem de uma porta, objetos atravessados, cômodo sem luz.
- Acompanha o trabalho: selecionar um piso, um móvel ou algo sobre um móvel leva o assistente para aquele cômodo.

**Completar em vez de substituir** (`furnishing.js`)

- As peças que a pessoa já colocou são aproveitadas: quem pôs uma mesa e pede sala de jantar recebe cadeiras em volta daquela mesa, não outra mesa. Peças aproveitadas não são movidas nem passam a pertencer à receita, então trocar ou regenerar a receita nunca as remove.

**Estado do lugar como transformação** (`src/authoring/room-state.js`, `src/domain/room-states.js`)

- Funciona em qualquer cômodo, gerado ou feito à mão, e age sobre o que existe, com intensidade e variação.
- **Habitado**: objetos de uso sobre os tampos livres, cadeiras fora de esquadro.
- **Abandonado**: sujeira em piso, paredes e móveis usando o desgaste de materiais, peças pequenas fora do lugar, entulho, papéis e mato nos cantos.
- **Cena de crime**: sangue onde há piso livre, corpo, cones, maleta de evidências, câmera apontada para a cena, sinais de luta nas cadeiras.
- **Ritual**: os móveis que estão no centro são levados à parede livre mais próxima, com o que estiver sobre eles; círculo, velas em anel, queimado no piso; uma mesa do próprio cômodo vira altar, e só um cômodo vazio recebe um altar.
- **Arrumado**: tira a ambientação, limpa o desgaste aplicado pelos estados e endireita os móveis.
- O que um estado acrescenta leva a etiqueta `ambientação` e é trocado pelo estado seguinte. O desgaste aplicado é marcado com `desgaste-ambientação`; desgaste posto pela pessoa nunca é sobrescrito nem limpo. Nada do que a pessoa fez é removido.

**Interface**: a tarefa passou a se chamar *Assistente de cômodo*, com a leitura no topo ("isto parece cozinha", o que falta, avisos com botão *Mostrar*), o grupo Mobiliar (o botão vira *Completar o que falta* quando já há peças) e o grupo Estado do lugar.

**Testes**: `tests/room-state.test.js` (reconhecimento dos 26 cômodos, aproveitamento de peças, quatro estados sobre quatro cômodos, troca de estado, Arrumado devolve exatamente os objetos da pessoa, desgaste próprio preservado, ritual afastando mesa e usando-a como altar) e o segundo caso de `tests/e2e/assisted-rooms.test.js` (fogão colocado à mão → "parece cozinha" → completar sem duplicar → ritual → arrumado). Referência: `docs/references/assisted-build/estados.jpg`.

**Limites desta entrega**

- Arrumado endireita, mas não devolve à posição anterior os móveis que um estado tirou do lugar; para isso há o desfazer.
- Os estados não mexem nas luzes nem na atmosfera (etapa 4).
- Os móveis só giram no próprio eixo: não há peça tombada.
- O reconhecimento compara modelos exatos; uma mesa de outro tipo não conta como "a mesa" da receita.
- A leitura é por cômodo. O assistente ainda não entende o prédio (que cômodo falta numa casa), que é a etapa 5.

### Etapa 4 — ambientar, entregue (11 de outubro)

Feita no mesmo espírito da etapa 3: cada passo lê o cômodo e age sobre o que está lá.

**Luz do cômodo** (`proposeRoomLighting` em `src/authoring/room-ambience.js`)

- O **clima da luz** é deduzido (`roomMood`): ritual montado pede só chamas, cena de crime pede foco duro, lugar abandonado pede penumbra; sem estado, vale o tipo de cômodo (casa, capela, biblioteca e bar quentes; trabalho, saúde e indústria frios). A pessoa pode trocar por qualquer um dos cinco climas.
- As fontes são os objetos do cômodo: abajures, velas, candelabros, lampiões, lareira, luminária cirúrgica e fluorescentes ganham o perfil de luz que corresponde ao que são; telas (TV, computador, monitores, fliperama) só brilham. Luminárias de teto são penduradas apenas onde isso não basta, em quantidade pela área.
- Os pontos de luz soltos que a sala rápida e o mobiliar criam dão lugar às luminárias.
- Cada cômodo acende no máximo quatro fontes, as mais fortes, e as luminárias de teto e o círculo ritual têm prioridade maior, porque a cena tem um limite de luzes reais (oito na qualidade equilibrada).
- Refazer com outro clima troca as luminárias penduradas e reconsidera os objetos acesos pelo assistente (`luminária-assistida`, `luz-assistida`). Luz que a pessoa configurou não é alterada.

**Atmosfera da cena** (`suggestAtmosphere`): o painel sugere o ambiente global que combina com o cômodo (interior acolhedor, fluorescente, noite, horror ritual), com Prévia e Aplicar; a sugestão some quando a cena já usa esse ambiente.

**Detalhes** (`proposeRoomDetails`): cortinas em cada janela do cômodo que não tem, tapete sob o móvel em torno do qual o cômodo se organiza, peças nas paredes vazias conforme o tipo de cômodo, cantos preenchidos e objetos sobre tampos vazios. Os pares móvel → objeto são tirados das próprias receitas, não de uma lista à parte. Só acrescenta o que falta: rodar de novo não duplica.

**Itens de parede vinculados**: quadros, espelhos, painéis e cortinas ficam presos à parede e a acompanham. Para isso o encaixe de parede passou a aceitar orientação em objetos (antes só em luz spot), o que permite pendurar na face oposta da parede; documentos antigos não mudam.

**Testes**: `tests/room-ambience.test.js` (peça acompanha a parede e fica voltada para dentro em qualquer parede, clima por tipo e estado, luz pelos objetos com troca de clima e luz própria preservada, detalhes lidos do cômodo e idempotentes) e o caso de ponta a ponta do assistente, estendido com luz, detalhes e atmosfera. Referência: `docs/references/assisted-build/luz-por-comodo.jpg`.

**Limites desta entrega**

- As luminárias de teto ficam na altura das paredes, sem vínculo com um teto; se a altura das paredes mudar, é preciso refazer a luz.
- Reconhece como "ponto de luz solto" o que tem nome começando por "Luz — " (como os criados pela sala rápida e pelo mobiliar); uma luz sua com esse nome também sairia. A prévia mostra o que sai.
- Com muitos cômodos iluminados na mesma cena, o limite global de luzes ainda apaga as menos prioritárias; a qualidade Alta dobra o limite.
- As intensidades foram calibradas a olho em seis cômodos de 7 × 6 m à noite; cômodos muito maiores ou menores podem pedir ajuste manual.
- Os detalhes não são retirados pelos estados nem por Arrumado: são objetos comuns, com a etiqueta `detalhe`.

### Etapa 5 — prédio a partir do contorno, entregue (11 de outubro)

**O contorno é da pessoa; a planta é do assistente** (`src/authoring/building.js`)

- O contorno é um piso retangular vazio que a pessoa desenhou (posição, rotação e andar são respeitados) ou medidas para um prédio novo, colocado ao lado do que a cena já tem.
- `planBuilding` divide o contorno pelo programa do tipo de prédio: o cômodo de entrada ocupa uma ponta, um corredor parte dele (central se o prédio é largo, lateral se é estreito, nenhum se é muito estreito) e os demais cômodos abrem para o corredor. O prédio recebe tantos cômodos do programa quantos o contorno comporta, por ordem de importância, e o painel diz de antemão o que cabe.
- Sete tipos: casa, delegacia, clínica, escritório, bar, galpão, igreja. São programas (que cômodos, com que peso), não plantas prontas: a mesma casa muda com o tamanho, a proporção e a variação.
- `proposeBuilding` ergue um piso por cômodo com o revestimento do tipo de cômodo, paredes compartilhadas entre vizinhos, porta de entrada, porta de cada cômodo para o corredor, janelas nas paredes externas (menos em cela, arquivo, depósito, necrotério e afins), e telhado numa pasta própria.
- Mobília, detalhes e luz de cada cômodo são feitos pelo assistente de cômodo, numa cópia da cena; a proposta é o que essa cópia ganhou. Cada cômodo fica com sua receita e segue editável e regenerável sozinho.
- A luz respeita o limite da cena: duas fontes por cômodo, três no cômodo de entrada, uma luminária de teto por cômodo.

**O assistente entende o conjunto** (`describeBuilding`): cômodos cujos pisos se tocam são lidos como um prédio; pelo tipo de cada um, deduz que prédio é e diz qual cômodo essencial falta ("forma casa de 3 cômodos; ainda não tem banheiro"). Vale para cômodos feitos à mão, não só para prédios gerados.

**Interface**: tarefa *Prédio* em Construir, com contorno, tipo, o que mobiliar/iluminar/cobrir, prévia e "Ver outra planta"; a leitura do prédio aparece no Assistente de cômodo.

**Testes**: `tests/building.test.js` (planta cobre o contorno sem sobreposição em 7 tipos × 4 tamanhos × 3 variações, casa completa com paredes compartilhadas, portas, janelas, telhado e mobília dentro de cada cômodo, contorno rotacionado respeitado, recusa de contorno ocupado ou não retangular, todos os tipos validando, leitura de prédio feito à mão) e o terceiro caso de `tests/e2e/assisted-rooms.test.js`. Referência: `docs/references/assisted-build/predios.jpg`; `scripts/capture-building.js` renderiza prédios no editor.

**Limites desta entrega**

- Só contorno retangular e um pavimento. Contorno em L, prédios de dois andares e escadas ficam para depois.
- O contorno precisa estar vazio; o assistente ainda não divide em volta de cômodos que já existem dentro dele.
- A planta é sempre "entrada numa ponta + corredor"; não há pátio, varanda nem cômodos de passagem.
- O telhado é o modelo de telhado de casa esticado para o contorno; em prédios muito grandes ou muito estreitos fica desproporcional.
- `building.js` usa o armazenamento de cena para compor as propostas dos cômodos, o que liga a camada de autoria à de estado.
- A leitura do prédio sugere o que falta, mas ainda não cria o cômodo que falta com um clique.

### Etapa 5, segunda parte — completar o que já está construído (11 de outubro)

Motivo: depois da primeira entrega da etapa 5, o usuário observou que "Prédio" parecia um conjunto de presets: não havia como incluir o prédio em algo já construído nem ele se adaptava para completar. Estava certo; o contorno tinha de estar vazio. Esta parte corrige isso.

**Contorno já começado** (`proposeBuilding`)

- O contorno não precisa mais estar vazio. O que a pessoa tem nele faz parte do pedido e nada é removido nem movido.
- **Paredes**: as que coincidem com a planta são mantidas, com portas e janelas, e passam a ser compartilhadas com os cômodos; só os trechos que faltam são erguidos (`raiseWalls`). Paredes fora da planta ficam onde estão. Nenhuma janela é aberta em parede da pessoa.
- **Entrada**: uma porta externa que já existe é a entrada, e o cômodo de entrada vai para junto dela (a planta é espelhada se preciso).
- **Móveis**: entre as plantas possíveis (variações e espelhamentos) é escolhida a que põe cada móvel no cômodo a que ele pertence e não passa parede por cima de nenhum. Cada móvel passa a pertencer ao cômodo onde está, e o assistente de cômodo completa em volta, sem duplicar.
- Portas internas desviam de móveis que estejam no vão. A prévia diz quantas paredes foram mantidas, onde cada móvel ficou e o que precisa de conferência.

**Acrescentar um cômodo** (`proposeAddRoom`)

- Procura um lado livre nos cômodos do prédio, prefere o vizinho ao qual aquele cômodo costuma se ligar (banheiro junto a corredor ou quarto, cozinha junto a sala ou jantar) e a posição que mantém o prédio compacto.
- Usa a parede que já existe como parede compartilhada, abre a porta por ela desviando dos móveis do vizinho, fecha a janela que passaria a dar para o cômodo novo, ergue as três paredes restantes e mobília o cômodo.
- Vale para um cômodo sozinho, que assim começa a virar prédio. Na leitura do assistente, cada cômodo que falta tem um botão *Criar*.

**Mecanismo**: uma proposta pode levar passos de preparação (`rehoming`) aplicados antes das remoções: mudar o apoio de um objeto antes de o piso sair, e tirar o que uma peça nova substitui antes de ela chegar.

**Testes**: dois casos novos em `tests/building.test.js` (casca com porta, janela e três móveis completada sem mover nada, com cozinha, quarto e sala nos lugares dos móveis e as quatro paredes mantidas; cômodo acrescentado com uma parede compartilhada, porta e três paredes novas) e o quarto caso de `tests/e2e/assisted-rooms.test.js`. Referência: `docs/references/assisted-build/completar-o-que-existe.jpg`.

**Limites que continuam**

- Contorno retangular e um pavimento.
- Cômodos (pisos separados) que já existam dentro do contorno não são reconhecidos como parte da planta; para ampliar um prédio feito de cômodos, o caminho é *Acrescentar cômodo*.
- A escolha da planta olha a posição dos móveis, não a orientação; um móvel pode ficar de costas para a porta nova.
- Paredes internas da pessoa só são aproveitadas se estiverem a menos de 30 cm de uma linha da planta; a planta ainda não se desloca para alcançá-las.
- A planta continua sendo "entrada numa ponta + corredor".

### Etapa 5, terceira parte — programa da pessoa e contorno desenhado na cena (11 de outubro)

Itens 3 e 4 combinados depois da observação sobre presets.

- **Os cômodos são da pessoa.** O tipo de prédio passou a ser só uma sugestão de lista. No painel, o cômodo de entrada é escolhido entre os 26 e cada cômodo da lista pode ser tirado ou acrescentado; `planBuilding` recebe a lista (`rooms`, `hub`) e acha a planta. O que não cabe no contorno aparece riscado, com o aviso de quantos ficaram de fora, em vez de sumir.
- **Planta em escala no painel**, atualizada a cada mudança de medida, tipo ou lista.
- **Contorno desenhado na cena.** *Desenhar o contorno na cena* usa o mesmo gesto de desenhar sala: o retângulo arrastado no chão vira o prédio, naquele lugar, e a prévia abre na hora.
- **A prévia acompanha o painel.** Com a prévia aberta, mudar medidas, tipo, entrada ou lista de cômodos refaz a prévia na cena, sem precisar pedir de novo.

**Testes**: caso novo em `tests/building.test.js` (lista própria respeitada, lista longa demais mantém os primeiros e informa os que saíram, lista inválida recusada, prédio completo com bar de entrada e dois banheiros) e quinto caso de `tests/e2e/assisted-rooms.test.js` (arrastar no chão → prévia → tirar um quarto, pôr sala de ritual, bar como entrada → aceitar → prédio no lugar desenhado). Referência: `docs/references/assisted-build/predio-painel.jpg`.

**Limites**

- O contorno desenhado é sempre alinhado aos eixos da cena; para um prédio girado, desenha-se um piso, gira-se e usa-se como contorno.
- A prévia só aparece ao soltar o arraste, não durante.
- Não se escolhe o tamanho de cada cômodo nem quem fica ao lado de quem; isso continua a cargo da planta.
- A lista da pessoa volta à sugestão do tipo quando o tipo é trocado.

### Ajustes pedidos após o uso (11 de outubro)

Cinco observações do usuário ao testar o prédio.

- **Telhados na vista superior.** Botão *Telhados* na faixa de câmera; na vista superior o telhado é levantado sozinho, a menos que a pessoa escolha o contrário. Vale para telhados, forros e abóbadas, só na janela de edição: o projetor sempre mostra.
- **A planta é clicável.** No painel do prédio, dois cliques na planta trocam dois cômodos de lugar (inclusive o de entrada), com os tamanhos acompanhando os cômodos (`arrangement`/`bands` em `planBuilding`). No Assistente de cômodo, a planta do prédio já construído aparece com cada cômodo como botão: clicar seleciona aquele piso. Cada cômodo é, de fato, um piso próprio.
- **Escolher onde o cômodo novo fica.** *Acrescentar cômodo* desenha o prédio e os lugares possíveis em tracejado, numerados do melhor em diante (`addRoomSpots`); clicar num deles abre a prévia ali.
- **Cômodo que não cabe sugere ampliar.** Quando a lista não cabe, o painel calcula o tamanho que comporta todos (`outlineThatFits`) e oferece *Ampliar o contorno* com um clique; se o contorno é um piso da pessoa, informa o tamanho necessário e lembra de *Acrescentar cômodo*.
- **Épocas.** `src/domain/room-eras.js`: a época não traz arranjos próprios, ela filtra e troca modelos pelo que a biblioteca tem para o período, usando a época registrada em cada modelo do catálogo. **Antiga** tira o que depende de eletricidade ou plástico e troca o que tem equivalente (geladeira → baú, pia → barril, sofá → banco, armário de aço → guarda-roupa, luminária → candelabro). A época segue para tudo: mobília, regeneração, estados (cena de crime sem cones nem câmera), luz (só chamas, com lustre de velas onde falta) e prédio (paredes externas e pisos de pedra ou madeira). Modelos novos de época antiga passam a ser usados sem mexer no código.

**Sobre medieval e futurista**: a biblioteca tem 57 modelos de época antiga (Antiguidade e Colonial/século XIX) e nenhum futurista. A época *Antiga* cobre cenários medievais com o que existe, mas não há armas, armaduras, tronos, forjas ou mobília propriamente medieval, e não há nada de ficção científica. Isso é trabalho de biblioteca (modelar os objetos), não de regras; quando os modelos existirem, uma época nova é uma entrada em `room-eras.js`.

**Testes**: `tests/room-eras.test.js` (os 26 cômodos na época antiga sem modelos modernos, nada flutuando onde um móvel foi tirado, regeneração, luz, estado e prédio seguindo a época); casos de ponta a ponta estendidos com troca de cômodos na planta, ampliar o contorno, escolha do segundo lugar para a garagem e o botão de telhados. Referência: `docs/references/assisted-build/epoca-antiga.jpg`.

**Limites**

- Trocar cômodos de lugar funciona dentro do esquema "entrada + corredor"; não se arrasta um cômodo para uma posição livre.
- Os lugares para o cômodo novo são os que o assistente considera viáveis (até oito); não se desenha um lugar à mão.
- Na época antiga alguns cômodos ficam ralos porque a biblioteca não tem equivalentes (laboratório, monitoramento, mercado, enfermaria).
- O botão de telhados reconhece telhado pelo modelo; um telhado feito de pisos ou paredes não é ocultado.

### Correções após o uso (12 de outubro)

- **Desenhar em qualquer lugar.** Erro: com um piso ativo (o último construído ou selecionado), *Desenhar o contorno na cena* e *Desenhar sala* só aceitavam o arraste sobre aquele piso. A ferramenta procurava o ponto no piso ativo em vez de no plano de trabalho. Corrigido em `renderer.js`; o teste de ponta a ponta agora desenha em chão livre com outro piso ativo.
- **Arrastar para rearranjar.** Na planta do painel, arrastar um cômodo sobre outro troca os dois; os dois cliques continuam valendo para teclado e toque.
- **Ampliar com prévia.** *Ampliar o contorno* abre a prévia do prédio maior na cena, para aceitar ou cancelar.

### Qualidade de uso do painel Prédio (12 de outubro)

Observações do usuário: com o arraste, o "clicar em um para trocar com outro" ficou confuso; Delete deveria remover o cômodo selecionado; e havia duas plantas no painel sem ficar claro o que cada uma era.

- **Um trabalho por vez.** O painel tem dois modos, *Novo prédio* e *Ampliar um prédio*, e mostra uma planta só: a do prédio que está sendo planejado, ou a do prédio que já existe com os lugares livres. O modo acompanha a seleção (um cômodo de um prédio selecionado abre *Ampliar*) e pode ser trocado à mão. Cada planta tem título.
- **Arrastar troca, clicar seleciona, Delete remove.** A troca por dois cliques saiu. O cômodo selecionado na planta sai com Delete ou pelo botão que aparece abaixo dela; o cômodo de entrada não sai, só troca. A lista de cômodos em botões foi substituída pela própria planta; o que não cabe é listado à parte, com × e a oferta de ampliar.
- **Remover um cômodo de um prédio** (`proposeRemoveRoom`): excluir o piso de um cômodo que faz parte de um prédio mantém as paredes divididas com os vizinhos, fecha a porta que levava a ele e tira as paredes próprias, o piso e o conteúdo. Antes, excluir o piso levava também a parede compartilhada e deixava o vizinho aberto.

**Testes**: caso novo em `tests/building.test.js` para a remoção; casos de ponta a ponta atualizados (uma planta por vez, seleção + Delete na planta, arraste, remoção da garagem mantendo a parede). Referência: `docs/references/assisted-build/predio-dois-modos.jpg`.

### Encaixar por dentro de um prédio existente (12 de outubro)

Observação do usuário: ampliar para fora é o caso excepcional; o normal ao acrescentar um cômodo é o interior se adaptar para acomodá-lo. Isso só existia para o prédio ainda no planejamento; para o prédio já construído não existia e o painel só oferecia ampliar.

- **`proposeRedivide`**: o contorno do prédio fica como está e o interior é dividido de novo para os cômodos que ele tinha mais o novo. Paredes externas, a entrada, as janelas e tudo o que a pessoa colocou ficam. Cada cômodo continua do seu lado do corredor e na sua ordem; o cômodo de entrada mantém o tamanho; o novo entra no fim do lado que consegue recebê-lo. Só se nenhum lado comporta os cômodos são redistribuídos, e a prévia avisa.
- Paredes internas que a nova divisão não usa saem, com as portas; uma porta que já liga dois cômodos é mantida. A mobília que o assistente tinha posto e que uma parede nova atravessaria, ou que ficaria num cômodo de outro tipo, é refeita; a que a pessoa colocou não se move.
- **É o caminho principal.** No modo *Mudar um prédio*, o botão de destaque é *Encaixar por dentro*; *Criar banheiro* na leitura do assistente também encaixa por dentro. Se não há espaço, ou o prédio não é um retângulo, a prévia passa a ser a ampliação para fora, com aviso. Há ainda *Só rearranjar por dentro*.
- O tipo de cada cômodo vem da receita com que foi mobiliado, quando há (`roomKind`); antes era sempre deduzido das peças, e uma cozinha com mesa podia ser lida como sala de jantar.
- Largura mínima por cômodo: 1,7 m para os pequenos (banheiro, cela, arquivo) e 2,3 m para os demais; antes 2,3 m para todos, o que fazia cômodos pequenos "não caberem".

**Testes**: caso novo em `tests/building.test.js` (mesmo chão coberto, casca intacta, peça da pessoa sem se mover, fogão ainda na cozinha, todo cômodo com porta, nada atravessando parede, recusa de prédio não retangular e aviso quando não cabe); o quarto caso de ponta a ponta encaixa um arquivo por dentro antes de ampliar.

**Limites**

- Só para prédios cujos cômodos formam um retângulo; depois de ampliar para fora, não dá mais para rearranjar por dentro.
- Cômodos vazios ou não reconhecidos dão lugar à nova divisão.
- O cômodo novo entra sempre no fim de um lado; não se escolhe ao lado de qual cômodo ele fica (dá para trocar no planejamento, não no prédio pronto).
