# Etapa 4 — Texto

Leia antes: `00-LEIA-PRIMEIRO.md`, a seção `text` de `etapa-02-modelo-de-dados.md`, `src/render/handout-text.js` (a versão mínima da etapa 3), `src/domain/inspectables.js` (`wrapText`, `layoutPageText`), `src/render/page-textures.js` (as pilhas de fontes `FONT` e `HAND`).

## Objetivo

Texto com cara de documento: quebra de linha, alinhamento (inclusive justificado), alinhamento vertical, espaçamento entre letras, encolher para caber, fontes da biblioteca e quatro "tintas" (limpa, máquina de escrever, à mão, carimbo). Determinístico: o mesmo documento desenha sempre os mesmos pixels.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `src/domain/handout-text-layout.js` | Diagramação **pura**: linhas, posições, encolher, justificar, tremidos da tinta |
| `src/render/handout-text.js` | `drawTextLayer` completo, usando o módulo acima |
| `src/data/handout-fonts.js` | Carregar fontes da biblioteca com `FontFace` |
| `tests/handout-text.test.js` | Testes da diagramação |
| `tests/e2e/handout-render.test.js` | Acrescentar os casos de texto |

## `src/domain/handout-text-layout.js`

```js
/**
 * Lines of a text block. `measure(text, px)` gives the width of a string at a size (the renderer passes the canvas'
 * measureText; tests pass a fake). Sizes in document px.
 * Returns { size, lines: [{ text, x, y, width, words: [{ text, x, width }] }], height, overflow }
 *   x, y: start of the line's baseline inside the box (box top-left = 0,0)
 */
export function layoutText(content, { measure, width, height, size, lineHeight = 1.25, letterSpacing = 0, align = 'left', valign = 'top', box = 'area', fit = 'overflow', minSize = size * .4 })
```

Regras:

1. `box: 'point'`: cada `\n` é uma linha; não quebra pela largura. `box: 'area'`: quebra palavras na largura (palavra maior que a largura é quebrada por caracteres, como `wrapText`).
2. `letterSpacing` é em milésimos de em: o espaço extra por caractere é `size × letterSpacing / 1000`, e entra na largura medida.
3. `fit: 'shrink'`: se a altura das linhas passa de `height`, diminui `size` (busca binária, 12 passos) até caber ou chegar a `minSize`. `overflow: true` quando nem `minSize` cabe.
4. A primeira linha tem a linha de base em `size × 0.8` a partir do topo; as seguintes a cada `size × lineHeight`.
5. `valign: 'middle' | 'bottom'` desloca todas as linhas para centralizar ou encostar embaixo na `height`.
6. `align`: `left` x = 0; `center` x = (width − larguraDaLinha) / 2; `right` x = width − larguraDaLinha; `justify` distribui o espaço que sobra entre as palavras, **menos na última linha do parágrafo** (que fica à esquerda).

```js
/**
 * Deterministic wobble of one glyph for an ink style. `index` counts glyphs across the whole layer.
 * Returns { dx, dy, rotate (rad), scale, alpha, ghost: null | { dx, dy, alpha } } in document px.
 */
export function inkJitter(style, { seed, index, size, wear })
```

| Estilo | O que faz (`wear` de 0 a 1 multiplica tudo) |
|---|---|
| `clean` | nada: `{ dx: 0, dy: 0, rotate: 0, scale: 1, alpha: 1, ghost: null }` |
| `typewriter` | `dy` ± 0,04 × size; `dx` ± 0,015 × size; `alpha` entre 1 − 0,45·wear e 1 (letras mais fracas, como fita gasta); 1 em cada ~12 letras com `ghost` (batida dupla) deslocado 0,03 × size, alfa 0,35 |
| `handwriting` | `rotate` ± 0,05 rad; `scale` 0,94–1,06; `dy` acompanha uma onda lenta pela linha (`sin(index × 0,35) × 0,03 × size`) |
| `stamp` | `alpha` 0,55–1; `rotate` igual para a camada toda (use só `seed`): ± 0,03 rad; sem ghost |

Use um gerador pseudoaleatório pequeno e determinístico a partir de `seed` e `index` (por exemplo o `mulberry32` de `seed * 9973 + index`). Nunca `Math.random`.

## `src/render/handout-text.js`

```js
export function drawTextLayer(ctx, layer, scale)
```

1. Fonte: `${italic ? 'italic ' : ''}${weight} ${px}px "${family}", ${fallback}`; o `fallback` depende do estilo: `typewriter` → `"Courier New", "Liberation Mono", monospace`; `handwriting` → a pilha `HAND` de `page-textures.js` (copie, não importe de render para domain); outros → `Georgia, "DejaVu Serif", serif`.
2. `layoutText` com `measure = (t, px) => { ctx.font = font(px); return ctx.measureText(t).width; }`, largura e altura da caixa (sem scale), e depois desenha multiplicando posições por `scale`.
3. Com `ink.style === 'clean'` e `letterSpacing === 0`: `fillText` por linha (rápido). Caso contrário: glifo por glifo (`for (const char of line.text)`, que respeita acentos e emojis), avançando `measureText(char) + espaço extra`, aplicando `inkJitter` (save/translate/rotate/scale/globalAlpha, fillText, restore; `ghost` desenha uma segunda vez deslocada).
4. `stamp`: depois de desenhar a camada inteira num canvas temporário, apague grãos com `destination-out` usando um padrão de ruído determinístico (pontos de 1–3 px; quantidade ∝ `wear`), e só então componha.
5. Texto vazio não desenha nada.

## `src/data/handout-fonts.js`

```js
/** Loads library fonts once each; resolves even when a font fails (the fallback draws instead). */
export function createHandoutFonts({ url = id => applicationURL(`api/tabletop/handouts/library/${encodeURIComponent(id)}/file`) } = {})
// → { load(font): Promise<boolean> }   font = layer.text.font
// Sem `library`: resolve true na hora (fonte do sistema).
// Com `library`: new FontFace(font.family, `url(${url(font.library)})`, { weight: String(font.weight), style: font.italic ? 'italic' : 'normal' }),
// document.fonts.add, await load(); cache pela chave `${library}|${weight}|${italic}`. Falha → false e um aviso no console uma vez.
```

`renderHandout` (etapa 3) já recebe `loadFont`; passe `fonts.load` nas chamadas do diagnóstico e, depois, do ateliê.

## Testes

`tests/handout-text.test.js` (com `measure = (t, px) => t.length * px * .5`):

1. "um dois três" em largura 100, size 20, `area`: quebra em linhas que cabem em 100; `point` mantém uma linha.
2. `align: 'center'` em largura 200: x da linha = (200 − largura) / 2. `right`: termina em 200.
3. `justify` com três linhas num parágrafo: as duas primeiras têm largura final 200 (± 0,5) e a última não.
4. `fit: 'shrink'` com texto longo em altura 60: `size` final < inicial, a altura das linhas ≤ 60; texto impossível dá `overflow: true` e `size === minSize`.
5. `valign: 'bottom'`: a última linha de base fica em `height − size × (lineHeight − 0.8)` (± 1).
6. `inkJitter('typewriter', …)` é idêntico em duas chamadas iguais e diferente para `index` diferente; `clean` é neutro; com `wear: 0` todos os estilos são neutros, exceto o ângulo do `stamp`, que também zera.
7. `letterSpacing: 100` aumenta a largura de "abcd" em 4 × size × 0,1.

E2E (acrescente em `tests/e2e/handout-render.test.js`):

8. Texto "MMMM" em `typewriter` com `wear: 1`, renderizado duas vezes → os pixels lidos em 20 pontos são idênticos.
9. Texto centralizado numa caixa simétrica: a soma de pixels escuros na metade esquerda e na direita difere menos de 15 %.

## Pronto quando

- [ ] Testes passam; `npm test` inteiro passa.
- [ ] Nenhum `Math.random` nos três arquivos novos (`grep`).

## Não faça

- Não implemente texto com vários estilos no mesmo bloco (negrito em uma palavra só). Fica como pendência.
- Não crie interface.
