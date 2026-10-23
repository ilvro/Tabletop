# Leitura tática inspirada em Baldur's Gate 3 — plano de implementação

Data: 23 de outubro de 2026. Plano para implementar depois; nada aqui está feito. Contexto: [PLANO_MESA_AO_VIVO.md](PLANO_MESA_AO_VIVO.md) (fases 5 e 6) e [CINEMATOGRAFIA.md](CINEMATOGRAFIA.md) (câmera, foco, seguir e figuras, já entregues).

## O que o BG3 faz bem e serve à mesa

O BG3 é um jogo, não uma mesa, mas resolve um problema que o Tabletop também tem: **mostrar com clareza onde cada um está, o que pode fazer e o que está acontecendo**, sem perder o clima da cena. Os recursos que valem copiar:

| Recurso no BG3 | O que resolve | Como fica no Tabletop |
| --- | --- | --- |
| Paredes e tetos que somem perto do personagem, com recorte circular | O personagem nunca some atrás de uma parede quando a câmera gira | **Oclusão dinâmica**: no projetor, paredes e objetos entre a câmera e os tokens visíveis ficam recortados em volta do token (dither), sem mudar o documento |
| Silhueta através de obstáculos | Saber onde alguém está mesmo atrás de uma coluna | **Silhueta**: o token escondido aparece como um contorno de cor sólida por cima do obstáculo |
| Trilha de movimento com custo | Saber até onde dá para ir no turno | **Trilha**: ao arrastar um token, linha no chão com distância em metros e em quadrados, e cor por alcance (deslocamento normal, corrida, fora) |
| Áreas de efeito desenhadas no chão | Quem pega a bola de fogo | **Áreas**: círculo, cone, linha e quadrado com medida, mostradas no projetor; tokens dentro ficam destacados |
| Barra de iniciativa com retratos | De quem é a vez | **Iniciativa**: faixa de retratos no projetor, turno atual com anel pulsando no token e, se quiser, a câmera indo até ele |
| Tecla Alt destaca o que é interativo | Achar portas, baús e pistas | **Destacar interativos**: uma tecla (ou deixa) contorna portas, documentos e objetos marcados |
| Rolagem dramática do d20 no centro | Suspense e clareza do resultado | Vem com a integração com a Ficha ([PLANO_INTEGRACAO_FICHA.md](PLANO_INTEGRACAO_FICHA.md)) |
| Câmera que inclina com o zoom | Ver o mapa de cima e o personagem de perto com o mesmo gesto | **Zoom tático**: a inclinação acompanha a distância (de cima ao afastar, à altura dos olhos ao aproximar), opcional por tomada |
| Ícones de condição sobre o personagem | Ver quem está caído, amedrontado, sangrando | Os **estados da figura** já existem (ferido, morrendo, inconsciente, morto, enlouquecendo); falta um ícone pequeno opcional acima do token |

## Princípios

- Tudo isso é **leitura da sessão**, não autoria. Nada muda o mapa. O que precisa persistir (iniciativa, áreas ativas) vai em `sessionState`, com histórico de sessão separado do histórico de autoria.
- O mestre decide o que o projetor mostra. Cada recurso tem um interruptor no projetor e respeita "só mestre".
- Deve funcionar com a câmera ao vivo e com as tomadas: os recursos acompanham qualquer câmera.

## Fases

### 1. Oclusão dinâmica e silhueta (maior ganho visual)

- `src/render/occlusion.js`: a cada quadro, para cada token visível, um raio da câmera até o peito do token (`cinema.pointOf`). Paredes, telhados e props atingidos pelo raio entram numa lista de oclusores.
- Recorte: os oclusores ganham um uniform no shader (via `onBeforeCompile`, como em `material-wear.js`) com até 8 posições de token em espaço de tela e um raio. Fragmentos dentro do círculo são descartados por dither (padrão de Bayer 4×4) com borda suave. Sem trocar material nem criar draw calls.
- Silhueta: os tokens recebem um segundo desenho (material sólido na cor do personagem, `depthFunc: GreaterDepth`, sem escrita de profundidade), visível só onde algo está na frente.
- Opções em `look.rendering`: `occlusionCutout` (raio em metros) e `silhouettes` (bool). Projetor e editor decidem cada um. No editor, isso convive com o "Ver interior" atual.
- Testes: unidade para a seleção de oclusores (geometria pura) e E2E de pixels (o token atrás de uma parede aparece; sem a opção, não).

### 2. Trilha de movimento e alcance

- Ao arrastar um token (gizmo ou arraste direto), desenhar no chão uma linha (reusar `ruler.js`) com a distância e, se o grid for quadrado, quadrados percorridos (diagonal configurável: 1, 1-2-1 ou euclidiana).
- `actor.speed` opcional (metros por turno) define as faixas de cor: verde até o deslocamento, amarelo até o dobro (corrida), vermelho além. Com a Ficha, a velocidade pode vir dela.
- No projetor, a trilha aparece durante o movimento e some ao soltar. O token desliza pelo caminho, como já desliza hoje.
- Testes: unidade para a contagem de quadrados nas três regras de diagonal; E2E arrastando um token.

### 3. Áreas de efeito

- `sessionState.areas`: `{ id, shape: circle|cone|line|square, origin, direction, size, color, label, expires }`.
- Ferramenta "Área" no painel Ao Vivo: clique no centro (ou no token de origem) e arraste para orientar e medir. O decalque no chão reusa `decals.js` em modo projetado, com borda pulsando devagar.
- Tokens cuja base intercepta a área ganham destaque: anel na cor da área e lista no painel do mestre.
- "Limpar áreas" e expiração automática ao avançar o turno.

### 4. Iniciativa

- `sessionState.initiative`: `{ order: [{ tokenId, value }], current, round }`. Painel Ao Vivo com arrastar para reordenar, "Próximo turno" (tecla) e rodada.
- Projetor: faixa de retratos no topo (usando o recorte da figura), o atual maior, com o nome. Token da vez com anel pulsando. Opção "Câmera vai até a vez" (close ou enquadramento salvo do token).
- Com a Ficha: iniciativa rolada lá entra direto na ordem.

### 5. Destacar interativos e ícones de condição

- `entity.interactive: true` (e, por padrão, portas e documentos inspecionáveis — ver [PLANO_DOCUMENTOS_INTERATIVOS.md](PLANO_DOCUMENTOS_INTERATIVOS.md)). Tecla no editor e deixa no projetor: contorno por 3 s, com o mesmo passe de contorno das figuras.
- Ícone de condição: sprite pequeno acima do nome do token para os estados da figura. Mais tarde, condições livres vindas da Ficha.

### 6. Zoom tático

- Opção da câmera: "Inclinar com o zoom". Ao aproximar, o ângulo vai de ~65° (vista de cima) a ~15° (altura dos olhos), interpolado pela distância ao alvo. Fica entre a órbita livre de hoje e a vista Superior.

## Ordem sugerida

1 → 4 → 2 → 3 → 5 → 6. A oclusão é o que mais muda a leitura no projetor; a iniciativa é o que mais ajuda a conduzir combate. Cada fase entrega algo usável sozinha.
