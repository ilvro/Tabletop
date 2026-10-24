# Etapa 7 — Mover, redimensionar, girar e escrever no palco

Leia antes: `00-LEIA-PRIMEIRO.md`, `src/atelie/stage.js`, `src/atelie/state.js`, `src/atelie/atelie.js`, `src/domain/handouts.js`.

## Objetivo

Mexer nas camadas direto na página, como num editor de imagem: arrastar para mover, puxadores para redimensionar, um puxador para girar, guias de encaixe, setas do teclado, e clique duplo num texto para escrever no lugar. Cada gesto é **um** passo de desfazer.

## Geometria pura (`src/atelie/geometry.js`)

Tudo em pixels do documento. A caixa de uma camada é `{ x, y, width, height, rotation }` (graus, em torno do centro).

```js
export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export function boxCorners(box)                       // 4 pontos [x, y] já girados, na ordem nw, ne, se, sw
export function pointInBox(point, box)                // o ponto está dentro da caixa girada?
export function moveBox(box, dx, dy)
export function resizeBox(box, handle, pointer, { keepAspect = false, fromCenter = false, min = 4 })
// O canto/lado oposto ao puxador fica parado (ou o centro, com fromCenter). Funciona com a caixa girada:
// converta o ponteiro para o sistema local da caixa, ajuste, converta de volta. Largura e altura nunca menores que `min`.
export function rotateBox(box, pointer, { snap = false })   // ângulo do centro até o ponteiro, +90° (o puxador fica em cima); snap: múltiplos de 15°
export function snapBox(box, targets, threshold)
// targets: { x: [números], y: [números] } — bordas e centros da página e das outras camadas visíveis (não giradas).
// Encaixa a esquerda, o centro ou a direita da caixa na linha de x mais próxima (até `threshold`), e o mesmo em y.
// Só para caixas sem rotação. → { box, guides: [{ axis: 'x'|'y', at }] }
export function layerAtPoint(handout, point)          // a camada mais alta, visível e destravada, cuja caixa contém o ponto, ou null
```

## No palco

- Sobre a camada selecionada: contorno em `--tt-accent`, 8 puxadores quadrados de 10 px (tamanho de tela, não muda com o zoom) e um puxador redondo de girar 28 px acima do lado de cima.
- **Arrastar o corpo** move; **puxadores** redimensionam (Shift mantém a proporção; Alt redimensiona a partir do centro); **girar** (Shift encaixa em 15°).
- Durante o arraste, `state.edit(…, { coalesce: 'drag-' + idDoGesto })`, com um `idDoGesto` novo a cada `pointerdown`: o gesto inteiro vira um passo de desfazer. Use `setPointerCapture`.
- **Guias**: com a caixa sem rotação, `snapBox` com limiar de 6 px de tela (÷ zoom); as guias aparecem como linhas finas magenta sobre o palco enquanto encaixam. Ctrl durante o arraste desliga o encaixe.
- **Teclado** (com o foco no palco, não num campo): setas movem 1 px (Shift: 10 px), Delete exclui a camada, Ctrl+D duplica, Ctrl+] / Ctrl+[ sobe / desce uma posição, Esc tira a seleção. Cada tecla é um passo (setas seguidas em menos de 600 ms formam um só passo, pelo `coalesce`).
- O cursor muda conforme o puxador (`nwse-resize` etc., ajustado pela rotação em passos de 45°) e `grab`/`grabbing` no corpo.
- Camada travada: aparece com contorno cinza, sem puxadores, e não se move.

## Texto no lugar

- Clique duplo numa camada de texto (ou Enter com ela selecionada) abre um `<textarea>` sobre a caixa: mesma posição, tamanho e rotação (`transform: rotate()`), mesma família, tamanho (× zoom), cor, alinhamento e entrelinha; fundo transparente, sem borda; o canvas esconde essa camada enquanto se edita (renderize com a camada `visible: false` numa cópia).
- Cada tecla edita com `coalesce: 'type-' + layerId` (a digitação toda é um passo). Esc ou clique fora conclui.
- Atalhos do ateliê não disparam enquanto o `textarea` tem foco.

## Testes

`tests/atelie-geometry.test.js`:

1. `boxCorners` de uma caixa 100 × 50 girada 90° em torno do centro.
2. `pointInBox` com caixa girada 45°: o centro está dentro, um canto da caixa sem rotação está fora.
3. `resizeBox` pelo `se` de (0,0,100,100) até (150,120) → (0,0,150,120); com `keepAspect` → 150 × 150 (ou 120 × 120, conforme a maior variação; documente a regra e teste-a); com `fromCenter` o centro não muda.
4. `resizeBox` numa caixa girada 90°: o lado oposto ao puxador fica no mesmo lugar do mundo (compare `boxCorners` antes e depois).
5. `rotateBox` com o ponteiro à direita do centro → 90°; com `snap`, 97° vira 90°.
6. `snapBox` com a caixa a 4 px do centro da página e limiar 6 → encaixa e devolve a guia; a 8 px, não.
7. `layerAtPoint` ignora camadas invisíveis e travadas e escolhe a de cima.

`tests/e2e/atelie.test.js` (acrescente):

8. Arrastar um retângulo 100 px de tela com zoom 50 % move a camada 200 px no documento; um Ctrl+Z volta tudo.
9. Puxador `e` aumenta só a largura; com Shift no `se`, a proporção se mantém.
10. Girar com Shift termina num múltiplo de 15°.
11. Arrastar perto do centro da página encaixa no centro (x da camada = (página − largura) / 2).
12. Clique duplo no texto, digitar "Gustav", Esc → `text.content` termina em "Gustav"; um Ctrl+Z desfaz a digitação inteira.
13. Seta → com Shift move 10 px.

## Pronto quando

- [ ] Testes passam; `npm test` inteiro passa.

## Não faça

- Seleção múltipla, agrupar camadas e alinhar várias de uma vez ficam como pendência.
