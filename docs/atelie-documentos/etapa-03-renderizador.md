# Etapa 3 — Renderizador

Leia antes: `00-LEIA-PRIMEIRO.md`, `etapa-02-modelo-de-dados.md` (o formato), `src/domain/handouts.js`, `src/render/page-textures.js` (só para ver o estilo de desenho em canvas 2D), `src/app/application.js` procurando `Object.defineProperty(window, '__tabletop'` (o objeto de diagnóstico usado pelos testes).

## Objetivo

Desenhar um documento num canvas, igual no ateliê, na cena e no projetor. Esta etapa cobre imagens, formas, ajustes, mesclagem, opacidade, recorte e luz (normal/UV). Texto entra numa versão mínima (a etapa 4 completa). Efeitos procedurais ficam para a etapa 15.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `src/domain/handout-pixels.js` | Matemática de pixels **pura** (sem DOM), usada aqui como reserva e pelo importador na etapa 11 |
| `src/render/handout-render.js` | `renderHandout` e os auxiliares geométricos |
| `src/render/handout-text.js` | `drawTextLayer` mínimo (a etapa 4 substitui o conteúdo) |
| `src/data/handout-images.js` | Carregar e guardar em cache as imagens das camadas |
| `tests/handout-render.test.js` | Testes das partes puras |
| `tests/e2e/handout-render.test.js` | Testes de pixel no navegador |

## Regras de composição (iguais às do Photoshop no que importa)

1. As camadas são desenhadas de `layers[0]` (fundo) até a última.
2. Camada invisível (`visible: false`) não é desenhada. Camada com `light: 'uv'` só aparece com `light: 'uv'` no render; `light: 'normal'` só sem UV; `'both'` sempre.
3. **Grupo de recorte**: uma camada sem `clip` (a **base**) mais todas as camadas com `clip: true` logo acima dela formam um grupo. Dentro do grupo:
   - a base é desenhada num canvas do tamanho da página (o *canvas do grupo*);
   - cada camada recortada é desenhada num canvas temporário, recortada pelo alfa **da base** (`destination-in` com o canvas da base original, antes das recortadas) e composta sobre o canvas do grupo com a sua `opacity` e `blend`;
   - o canvas do grupo é então composto na página com a `opacity` e o `blend` **da base**.
   Se a primeira camada visível tiver `clip: true`, ela é tratada como base.
4. **Ajuste** (`kind: 'adjust'`):
   - como base de grupo (sem `clip`): aplica o filtro a **tudo o que já está na página** e mistura o resultado sobre a página com a `opacity` do ajuste (`source-over`);
   - recortado (`clip: true`): aplica o filtro só ao canvas do grupo, e mistura com a sua `opacity`, mantendo o alfa da base.
5. Uma camada `effect` é ignorada nesta etapa (registre-a em `warnings` como `'effect pendente: <type>'`).
6. Imagem que não carregou: desenhe um xadrez cinza 50 % na caixa e coloque o `src` em `missing`.

## `src/domain/handout-pixels.js` (puro)

```js
/** CSS filter of an image or adjust block, at the render scale (blur is in document px). '' when nothing changes. */
export function cssFilter({ grayscale = 0, sepia = 0, brightness = 0, contrast = 0, saturation = 0, hue = 0, blur = 0, invert = false } = {}, scale = 1)
// → por exemplo 'grayscale(1) brightness(1.2) contrast(0.9) saturate(1.5) hue-rotate(30deg) blur(2px) invert(1)'
//   brightness b → brightness(1 + b); contrast c → contrast(1 + c); saturation s → saturate(1 + s); só os termos diferentes do neutro

/** The same filter applied to RGBA bytes, for browsers without ctx.filter and for Node. Mutates and returns data. */
export function applyAdjustPixels(data, adjust)
// Ordem: curve (tabela de 256 valores por interpolação linear entre os pontos, aplicada a R, G e B), grayscale (luminância 0.2126/0.7152/0.0722, misturada por grayscale), sepia (matriz W3C), brightness (multiplica por 1+b),
// contrast ((v-128)*(1+c)+128), saturation (mistura com a luminância por 1+s), hue (rotação W3C de hue-rotate), invert. Clampa 0–255. Alfa intacto.

/** Separable blend of one channel, 0–1, for the modes of BLEND_MODES (used by the importer, etapa 11). */
export function blendChannel(mode, backdrop, source)
// normal, multiply, screen, overlay, soft-light (fórmula W3C), hard-light, darken, lighten, color-dodge, color-burn, difference, exclusion,
// linear-dodge (min(1, b + s)), linear-burn (max(0, b + s - 1))
```

## `src/render/handout-render.js`

```js
/**
 * Draws a handout on `canvas`, resized to page × scale. Resolves images and fonts first (all in parallel), then draws
 * synchronously. Returns { canvas, missing: [src], warnings: [string] }.
 */
export async function renderHandout(canvas, handout, { scale = 1, light = 'normal', loadImage, loadFont = async () => {} } = {})

export function layerMatrix(layer, scale)        // { translate: [cx, cy], rotation: radians, flip: [sx, sy] } — centro da caixa × scale
export function fitRect(imageWidth, imageHeight, box, fit, crop)
                                                  // → { sx, sy, sw, sh, dx, dy, dw, dh } para drawImage, em coordenadas da caixa centrada (-w/2..w/2)
                                                  // stretch: imagem inteira na caixa; cover: preenche e corta o excesso centrado; contain: cabe inteira, centrada
                                                  // crop (0–1) escolhe a parte da imagem antes do fit
export function clipGroups(layers, light)        // → [{ base: layer, clipped: [layer, …] }] só com camadas visíveis nessa luz
export const visibleIn = (layer, light) => layer.visible && (layer.light === 'both' || layer.light === light)
```

Desenho de cada tipo, num contexto já transladado para o centro da caixa, girado e espelhado:

- **image**: `ctx.filter = cssFilter(image.filter, scale)` (se o navegador não tiver `ctx.filter`, desenhe sem filtro num canvas temporário, aplique `applyAdjustPixels` e desenhe esse); `drawImage` com `fitRect`; se `tint`, por cima: `globalCompositeOperation = 'source-atop'`, `globalAlpha = tint.amount`, `fillRect` com `tint.color`.
- **shape**: `rect` com `roundRect(-w/2, -h/2, w, h, radius × scale)`; `ellipse` inscrita na caixa; `line` horizontal no meio da caixa, de `-w/2` a `w/2` (a rotação dá o ângulo). `setLineDash(dash × scale)`, `lineWidth = strokeWidth × scale`; preencha antes de contornar.
- **text**: `drawTextLayer(ctx, layer, scale)` de `handout-text.js`. Versão mínima desta etapa: fonte `${size×scale}px "${family}", serif` (com `italic` e `weight`), cor, `wrapText` de `src/domain/inspectables.js` na largura da caixa quando `box: 'area'`, linhas a cada `size × lineHeight`, alinhamento esquerdo, a partir do topo da caixa.
- **adjust**: ver regra 4; use `cssFilter` com `ctx.filter` desenhando a fonte num canvas temporário (`drawImage(source)` com o filtro), ou `applyAdjustPixels`. Com `curve`, use sempre o caminho de pixels (`getImageData` → `applyAdjustPixels` → `putImageData`): o filtro do canvas não faz curvas.

Use canvases temporários do tamanho da página e **reuse-os** entre camadas (no máximo três vivos: grupo, base original, temporário). Limpe-os com `clearRect` e `setTransform(1,0,0,1,0,0)`.

## `src/data/handout-images.js`

```js
/** An image source of a layer as an ImageBitmap, cached by key; null when it cannot load. */
export function createHandoutImages({ fetchBlob = url => fetch(url).then(r => r.ok ? r.blob() : null) } = {})
// → { load(src): Promise<ImageBitmap|null>, url(src): string, clear() }
// src.library → `api/tabletop/handouts/library/${encodeURIComponent(id)}/file` (a rota nasce na etapa 5; até lá, null)
// src.asset   → a URL de arquivo de asset que o resto do app já usa (procure em src/data/api.js como ele monta a URL de `/api/tabletop/assets/:id/file`)
// Use `applicationURL` de src/data/paths.js para respeitar o prefixo do GitHub Pages.
```

## Diagnóstico para os testes

No objeto `window.__tabletop` (só existe com `?diagnostics`), acrescente:

```js
renderHandout: async (handout, { scale = .25, light = 'normal', at = [] } = {}) => {
  // renders into a fresh canvas and returns the RGBA of each [x, y] (page px × scale) plus missing/warnings
}
```

## Testes

`tests/handout-render.test.js` (Node):

1. `cssFilter({})` é `''`; `cssFilter({ grayscale: 1, brightness: .2, hue: 30, blur: 4 }, .5)` contém `grayscale(1)`, `brightness(1.2)`, `hue-rotate(30deg)` e `blur(2px)`.
2. `applyAdjustPixels` em `[255,0,0,255]` com `grayscale: 1` dá cinza com R = G = B ≈ 54 (0,2126 × 255); `invert: true` em `[10,20,30,128]` dá `[245,235,225,128]`; `curve: [[0,0],[128,200],[255,255]]` leva 128 a 200.
3. `blendChannel('multiply', .5, .5)` é .25; `'screen'` é .75; `'linear-burn'` com .3 e .4 é 0; `'overlay'` com .25 e .5 é .25.
4. `fitRect` para imagem 200 × 100 em caixa 100 × 100: `contain` desenha 100 × 50 centrado; `cover` usa a parte central 100 × 100 da imagem; `stretch` 100 × 100 com a imagem toda.
5. `clipGroups`: [A, B(clip), C(clip), D, E(clip, invisível)] vira `[{A,[B,C]}, {D,[]}]`; com A invisível, B vira base do primeiro grupo.
6. `visibleIn` com as três luzes.

`tests/e2e/handout-render.test.js` (navegador, pelo `__tabletop.renderHandout`):

1. Página 400 × 400 branca; retângulo vermelho `#ff0000` em (0,0,200,400); retângulo azul `#0000ff` em (100,0,200,400) com `blend: 'multiply'` → pixel (150, 200) é preto (±8), (50, 200) vermelho, (250, 200) azul.
2. Recorte: retângulo verde 100 × 100 em (0,0); acima, com `clip: true`, retângulo preto cobrindo a página → (50,50) preto, (300,300) branco (fora da base).
3. Ajuste `grayscale: 1` sem clip, sobre o vermelho → (50,200) cinza (R = G = B ± 6).
4. Camada `light: 'uv'` com retângulo roxo: com `light: 'normal'` o pixel é branco; com `'uv'`, roxo.
5. Imagem com `src: { library: 'nao-existe' }` → `missing` tem esse src e o pixel é o xadrez cinza (R = G = B entre 100 e 200).
6. Texto mínimo "ABC" preto em caixa: algum pixel escuro (< 80) dentro da caixa.

## Pronto quando

- [ ] Os testes acima passam, e `npm test` inteiro.
- [ ] `npm run build` funciona.

## Não faça

- Não crie a janela do ateliê. Não ligue à cena.
- Não use WebGL nesta etapa.
