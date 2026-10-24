# Leitura tática

Recursos de sessão inspirados em Baldur's Gate 3, para mostrar com clareza onde cada um está e o que pode fazer sem perder o clima da cena. Plano e ordem: [PLANO_TATICO_BG3.md](PLANO_TATICO_BG3.md). Andamento: [progress.md](../progress.md).

## Paredes que se abrem e silhuetas

Em **Ambiente → Iluminação dinâmica e qualidade**:

- **Abrir paredes em volta dos personagens:** paredes, telhados, forros de andares acima e objetos com mais de 1,4 m que ficam entre a câmera e um personagem se abrem num círculo pontilhado em volta dele, do pé à cabeça. Só abre o que está na frente; o resto da cena continua inteiro. As sombras não mudam.
- **Silhueta de personagens atrás de obstáculos:** quem fica atrás de algo aparece por cima dele como silhueta translúcida na cor do personagem (o recorte da figura, ou a base para tokens sem retrato).

As duas opções ficam na cena (`look.rendering.occlusion`, `look.rendering.silhouettes`) e valem em cada janela, inclusive no projetor, com a câmera daquela janela. No editor, convivem com **Ver interior**, que continua tirando as paredes voltadas para a câmera.

Limites: até 8 personagens por quadro; o círculo tem 1,2 m de raio em volta do meio do corpo.

## Iniciativa

**Tomadas → Sessão → Iniciativa → Começar combate** cria a ordem com todos os personagens da cena. Digite o valor de cada um e a lista se ordena sozinha, do maior para o menor (empates ficam na ordem em que entraram). Antes de alguém jogar, quem fica no topo começa.

- **N** (ou **Próximo turno**) passa a vez; depois do último, começa uma nova rodada. **Anterior** volta.
- Uma faixa de retratos aparece no topo da mesa e do projetor: quem tem a vez fica maior, seguido dos próximos.
- Um anel dourado pulsa sob o token da vez (fixo com movimento reduzido).
- **Câmera vai até quem tem a vez:** ao passar o turno, a câmera desliza até olhar o personagem (com a câmera ao vivo ligada, o projetor vai junto).
- **Incluir** quem entrou depois, **tirar** alguém (×) e **Encerrar combate**. Cada ação é um passo de desfazer.
- Personagens "só do mestre" ficam na ordem do mestre, mas não aparecem no projetor.

Contrato: `sessionState.initiative = { order: [{ tokenId, value }], current, round }` (`src/domain/initiative.js`). Um token removido sai da ordem e a vez fica com quem a tinha.

## Trilha de movimento

Ao arrastar um token com **Mover (G)**, uma linha tracejada liga o ponto de onde ele saiu até onde está, com a distância em metros e em quadrados. No projetor, quando um token muda de lugar, ele desliza até o destino e a trilha aparece durante o movimento e some logo depois.

- **Deslocamento por turno** (Propriedades → Posição → MOVIMENTO, em metros): a trilha fica **verde** até o deslocamento, **amarela** até o dobro ("correndo") e **vermelha** além ("fora do alcance"). Zero mostra só a distância.
- **Movimento na diagonal** (Construir → Grid e precisão): **distância real**, **1 quadrado** por diagonal, ou **1 e 2 alternados**. A regra fica na cena (`layout.grid.diagonal`), então editor e projetor contam igual.
- A altura não conta como caminhada: subir uma escada mede só o deslocamento no plano.

Contratos: `actor.speed` (0–60 m) e `layout.grid.diagonal` (`euclidean`, `chebyshev`, `alternate`), opcionais. Cálculo em `src/domain/movement.js`.

Correção junto desta fase: na janela separada do projetor, os tokens não deslizavam (cada cena chegava como cópia nova e era reconstruída). Agora deslizam também lá.

## Áreas de efeito

Em **Tomadas → Sessão → Combate → Áreas de efeito**: escolha a forma (círculo, cone, linha ou quadrado), a cor e um rótulo, clique em **Desenhar área no chão** e arraste. Círculo e quadrado crescem do centro até onde você soltar; cone e linha saem da origem na direção do arraste. O cone abre tanto quanto é comprido; a linha tem largura ajustável.

- A área aparece no chão, translúcida e com borda viva, no editor e no projetor.
- Quem ela toca (contando a base do token) ganha um anel na cor da área.
- A lista mostra as áreas ativas; × apaga uma, **Apagar todas as áreas** limpa o chão. Cada ação é um passo de desfazer. Esc cancela o desenho.

Contrato: `sessionState.areas = [{ id, shape, origin, yaw, size, width, color, label }]`, até 32 (`src/domain/areas.js`).

## Destacar interativos e selos de condição

- **H** (ou **Tomadas → Combate → Destacar interativos**) contorna por 3 segundos, em dourado, as portas, os objetos marcados como interativos e os documentos inspecionáveis, no editor e no projetor. Para marcar um objeto: **Propriedades → Organização → INTERAÇÃO → Interativo**. O campo `interactive` é opcional e não reconstrói o objeto ao mudar.
- Um personagem com estado diferente de normal (Propriedades → Aparência → FIGURA → Estado) ganha um selo sobre o nome: FERIDO, MORRENDO, INCONSCIENTE, MORTO ou ENLOUQUECENDO, cada um com sua cor. O selo some junto com o nome quando a câmera chega perto (close).
