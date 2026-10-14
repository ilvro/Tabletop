# Galpão industrial — plano do que falta tecnicamente

Complementa a [análise da referência](GALPAO_INDUSTRIAL_ANALISE.md). Aqui está só o que exige código novo no motor ou no editor; os modelos comuns (tubulação, porta industrial, entulho, mesa e estante de metal, vegetação invasora) seguem o caminho já conhecido das bibliotecas medieval e futurista e ficam como etapa 0.

Regra para todas as etapas: cada recurso é uma capacidade geral do Tabletop, com controles em Propriedades ou Ambiente, e não um ajuste feito só para esta cena. A cena pronta e o tutorial de recriação só usam o que qualquer pessoa pode usar.

## Resumo

| # | Recurso | Para que serve na referência | Peso | Depende de |
| --- | --- | --- | --- | --- |
| 0 | Kit industrial de modelos | Tubos, porta, entulho, mobília de metal, mato | Médio | — |
| 1 | Tela com conteúdo | Monitor com "BOOTING.." e barra, emitindo luz | Médio | — |
| 2 | Decalques | Letreiro na parede, marca no monitor, faixas de alerta | Médio | — |
| 3 | Cabos pendentes | Feixes em arco por todo o teto | Médio | — |
| 4 | Piso molhado e reflexo das luzes | Risco vermelho no chão | Alto | — |
| 5 | Brilho de lente | Risco horizontal na luz vermelha | Baixo | bloom existente |
| 6 | Faíscas e gotejamento | Faísca ao lado do monitor | Baixo | efeitos locais existentes |
| 7 | Montagem, cena pronta e tutorial | — | Médio | 0 a 4 |

Sem 0, 1, 2 e 3 a cena não se parece com a referência. O item 4 é o que mais pesa na qualidade percebida. 5 e 6 são acabamento.

## 1. Tela com conteúdo

**O que é.** Um objeto com tela (monitor de tubo, TV, terminal, telão) passa a mostrar algo escolhido pela pessoa e a iluminar o que está à frente.

**Como.**
- Os modelos de tela já têm um material chamado `screen`. Esse slot passa a aceitar um **conteúdo**: texto com layout simples (linhas, tamanho, cor, alinhamento), barra de progresso, imagem da biblioteca, ou chuvisco.
- O conteúdo é desenhado num canvas pequeno (256 ou 512 px) e usado como mapa emissivo do slot. Um shader por cima acrescenta linhas de varredura, curvatura leve e ruído, com intensidade ajustável.
- Animação por tempo, sem estado: cursor piscando, reticências, barra que enche e recomeça, chuvisco. Respeita "Pausar efeitos animados".
- A tela acesa liga a iluminação própria do objeto (que já existe) com a cor média do conteúdo, para o brilho chegar à mesa e ao rosto de quem está perto.

**Dados.** `screen: { kind, lines, color, progress, imageRef, scanlines, flicker }` no objeto, validado e migrado como os outros campos opcionais.

**Interface.** Propriedades → **Tela**, visível só em modelos com slot de tela: tipo de conteúdo, texto, cor, efeito de tubo.

**Aceite.** Monitor de tubo mostrando duas linhas e uma barra, legível a 2 m, iluminando a mesa; pausa congela; salvar e reabrir preserva; apresentação mostra igual.

**Risco.** Custo de textura por tela. Limite: canvas compartilhado por conteúdo idêntico e redesenho a no máximo 10 quadros por segundo.

## 2. Decalques

**O que é.** Imagem ou texto colado numa superfície: letreiro, logotipo, placa, mancha, seta, faixa de alerta.

**Como.**
- Novo tipo de objeto, **decalque**: um retângulo fino preso à parede, ao piso ou a um modelo, com imagem da biblioteca ou texto gerado em canvas, transparência e desgaste (apagado, riscado).
- Renderizado como plano com deslocamento de profundidade para não cintilar contra a parede; recebe luz e sombra como a superfície.
- Fixação pelo mesmo mecanismo de "Fixar em parede / teto" que os objetos já usam, para acompanhar a parede quando ela se move.
- **Faixa de alerta** amarelo-e-preta entra como material novo de superfície ("listras de alerta": ângulo, largura, cores, desgaste) aplicável a uma faixa de parede ou a um decalque comprido.

**Dados.** Entidade `decal` com `hostId`, tamanho, `imageRef` ou `text`, opacidade, desgaste.

**Interface.** Construir → Peças avulsas → **Decalque**; clique numa superfície para colocar.

**Aceite.** Letreiro de texto na parede do fundo, marca na carcaça do monitor, faixa de alerta ao longo de duas paredes; nada cintila ao mover a câmera; acompanha a parede.

**Risco.** Projeção sobre superfícies curvas fica fora: o decalque é plano. Suficiente para paredes, pisos e faces de móveis.

## 3. Cabos pendentes

**O que é.** Cabo, corrente, corda ou varal entre dois pontos, com barriga.

**Como.**
- Novo tipo de objeto, **cabo**: dois pontos de fixação, folga, espessura, quantidade de fios e desalinho entre eles. A curva é uma catenária; a malha é um tubo de poucos lados gerado a partir dela.
- Um feixe de vários fios é uma só malha, para não custar um desenho por fio.
- Ferramenta de colocação em dois cliques (ponto A, ponto B), com prévia. Os pontos grudam em teto, parede, viga e topo de objetos.
- Variação **pendente**: um ponto só, o cabo cai solto até um comprimento, para fios rompidos.
- O assistente ganha um detalhe de cômodo, "cabos no teto", que espalha feixes entre pontos do teto em estados abandonado e futurista. Entra como proposta, como todo o resto.

**Dados.** Entidade `cable` com `from`, `to`, `slack`, `strands`, `radius`, `seed`, material.

**Aceite.** Trinta feixes num galpão de 20 × 14 m sem queda de quadros perceptível; mover uma ponta atualiza a curva; a sombra aparece.

**Risco.** Sombras de muitos tubos finos serrilham. Mitigação: cabos projetam sombra só na qualidade alta.

## 4. Piso molhado e reflexo das luzes

**O que é.** Superfície que espelha as luzes e os objetos próximos, com poças.

**Estado atual.** Os reflexos são de um ambiente procedural: realçam metal e brilho, mas não mostram nada da sala. O risco vermelho da referência não sai disso.

**Como, em dois degraus.**
1. **Umidade no material** (barato, entra primeiro): controle "Molhado" em pisos e paredes, com quantidade e tamanho das poças. Baixa a rugosidade e escurece a cor em manchas de mundo; dentro das poças a superfície fica lisa e plana. Com luzes pontuais fortes já aparece um brilho especular alongado no ladrilho.
2. **Reflexo de tela** (caro, é o que chega na referência): passo de pós-processamento que reflete o que está na imagem sobre superfícies lisas, limitado a pisos molhados e a meia resolução, ligado só nas qualidades equilibrada e alta. Entra depois do GTAO e antes da névoa e do bloom.

**Interface.** Propriedades → Material → **Molhado**; Ambiente → Névoa, bloom e qualidade → **Reflexos de superfície**.

**Aceite.** Luz vermelha ao fundo deixa um risco no piso até perto da câmera; o monitor aparece refletido na mesa; desligar o reflexo de tela mantém a cena aceitável só com o degrau 1; 60 quadros por segundo na qualidade equilibrada na máquina de referência.

**Risco.** É o item mais incerto. Reflexo de tela falha no que está fora da imagem e pode brigar com a vista de corte ("Ver interior"). Se o custo ou os defeitos não fecharem, o plano B é um reflexo plano (espelho) só para o piso selecionado, mais previsível e mais caro por piso.

## 5. Brilho de lente

**O que é.** O risco horizontal e o halo em fontes muito fortes.

**Como.** Opção no bloom: **risco anamórfico**, um borrão só horizontal da mesma imagem de brilho que o bloom já extrai, somado no final. Quantidade e comprimento ajustáveis. Sem fantasmas de lente.

**Aceite.** A luz vermelha ganha o risco; fontes fracas não; desligado por padrão.

## 6. Faíscas e gotejamento

**O que é.** Mais dois tipos no efeito local que hoje faz chama e fumaça.

**Como.** **Faíscas**: rajadas curtas de partículas brilhantes com gravidade, em intervalos irregulares, com um clarão de luz a cada rajada. **Gotejamento**: gotas que caem de um ponto e somem ao tocar o piso. Mesmos controles dos efeitos atuais (quantidade, tamanho, cor, velocidade, semente).

**Aceite.** Faísca intermitente num cabo rompido iluminando o entorno por um instante; goteira do teto sobre uma poça.

## 7. Montagem, cena pronta e tutorial

1. Montar o galpão só com o editor, sem código de cena.
2. Comparar lado a lado com a referência no mesmo enquadramento e listar as diferenças; corrigir até ficarem só diferenças de estilo.
3. Publicar como cena de exemplo, com miniatura.
4. Escrever o tutorial de recriação como lição em `src/tutorial/lessons.js`, do contorno ao enquadramento final, usando cada recurso novo no momento em que ele aparece na cena.

## Ordem e pontos de decisão

1. **Etapa 0 e item 3** (modelos e cabos): com eles e o que já existe, a silhueta da cena fecha. Primeira comparação com a referência.
2. **Itens 1 e 2** (tela e decalques): a cena passa a ter a identidade da referência.
3. **Item 4, degrau 1**, depois **5 e 6**: acabamento barato.
4. **Item 4, degrau 2**: decidir depois de ver o resultado dos anteriores, porque é o mais caro e o mais arriscado.
5. **Item 7**.

Cada etapa segue a rotina do projeto: testes unitários do que for dado e regra, E2E do que for interface, conferência em imagem na GPU e registro em `progress.md`.

## Andamento

**13 de outubro — etapa 0 e item 3 concluídos**

- **Etapa 0:** 22 modelos do kit industrial (tubulação, estrutura, sinalização, mobiliário e abandono). A faixa de alerta entrou como modelo de parede de 2 m; o material de listras continua no item 2.
- **Item 3:** cabos pendentes como objeto com ajustes próprios, ferramenta de dois cliques, entrada na biblioteca e "Cabos no teto" no assistente de cômodo. Detalhes em [ASSET_LIBRARY.md](ASSET_LIBRARY.md).
- Primeira comparação com a referência (`scripts/capture-industrial.js`): a silhueta fecha, com cabos em arco, duto, faixas, portão com luz vermelha e monitor sobre a mesa. Faltam teto, o conteúdo da tela, o letreiro e o piso molhado.

**Diferenças em relação ao plano**

- As pontas do cabo são marcadas no chão e sobem para a altura das paredes; não há encaixe em viga ou topo de objeto. A altura de cada ponta se ajusta em Propriedades.
- Os cabos projetam sombra em qualquer qualidade; a restrição à qualidade alta não foi feita.
- O assistente pendura cabos quando a pessoa pede, em qualquer cômodo; não os liga sozinho ao estado abandonado.

**14 de outubro — itens 1 e 2 concluídos**

- **Item 1, tela com conteúdo:** campo `screen` em qualquer modelo com o material `screen`, seção Propriedades → Tela, perfil de luz "Tela / monitor". Aceite: duas linhas e uma barra legíveis a 2 m (`screen-2m.png`), luz na mesa, pausa congela (E2E), salvar e reabrir preservam, apresentação mostra a tela.
- **Item 2, decalques:** modelo `builtin-decal`, ferramenta e botão **Decalque**, campo `decal` e material **Listras de alerta**. Aceite: letreiro na parede do fundo, marca na carcaça do monitor, faixas de alerta ao longo de duas paredes, acompanha a parede e o monitor, e a sonda de cintilação com 0 pixels errados em 62 317.
- Detalhes em [ASSET_LIBRARY.md](ASSET_LIBRARY.md) e [progress.md](../progress.md).

**Diferenças em relação ao plano (itens 1 e 2)**

- O `hostId` do decalque fica em `decal.anchor.hostId`, não na raiz do campo `decal`: é o mesmo dado, reaproveitando o mecanismo de fixação.
- O decalque reaproveita o campo `anchor` do "Fixar em parede / teto", com o socket novo `surface`, mas não passa por esse painel: a colagem é feita pela ferramenta de clique.
- `screen.scanlines` controla o efeito de tubo inteiro (linhas, curvatura e ruído) com uma intensidade só, não três controles.
- A fase da animação no projetor pode diferir da do editor (cada janela tem o seu tempo de efeitos); conteúdo e estilo são os mesmos.
- Projeção em superfície curva fica fora: na carcaça do monitor o decalque assenta na face plana.
- A emissão aparece levemente nas bordas chanfradas da tela (1 a 2 cm), porque o UV do chanfro é planar.
- O decalque está na biblioteca como `builtin-decal` (categoria Industrial / Sinalização), sem o prefixo `industrial-` dos outros modelos do kit.
- A luz da tela só toma a cor e o brilho do conteúdo no perfil "Tela / monitor"; se a pessoa trocar o perfil, a luz volta a ser a que ela escolheu.
- O conteúdo da tela inclui a variação (`seed`) na chave de compartilhamento do canvas, porque o chuvisco depende dela; só texto fixo e barra fixa deixam a tela sem animação.
- `hazardAngle` e `hazardWidth` ficam em `TEXTURE_UNIFORM_FIELDS` e as cores em `TEXTURE_COLOR_FIELDS` (`src/domain/materials.js`), fora da chave do ladrilho.
- Ao escolher "Faixa de material" num decalque sem textura, o material passa a ser Listras de alerta, para a faixa funcionar com um clique.
- O vidro da tela usa rugosidade 0,55, em vez de 0,18, para a luz própria não abrir um clarão sobre o texto.
- No E2E o clique do decalque na carcaça do monitor é feito na vista de topo, porque na perspectiva padrão a porta da sala tapa o monitor.
- A conferência em imagem foi feita com o rasterizador por software (`CAPTURE_SOFTWARE=1`), não numa GPU.

**Próximo:** resíduos do item 3 e item 4, degrau 1 (piso molhado), depois 5 e 6.

**14 de outubro — microplano de execução**

O detalhamento de tudo o que falta (resíduos do item 3 e itens 1, 2, 4, 5, 6 e 7), com arquivos, linhas, dados, shaders e provas de cada critério de aceite, está em [GALPAO_INDUSTRIAL_MICROPLANO.md](GALPAO_INDUSTRIAL_MICROPLANO.md).
