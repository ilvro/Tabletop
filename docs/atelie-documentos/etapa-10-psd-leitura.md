# Etapa 10 — Ler a estrutura dos PSDs (relatório)

Leia antes: `00-LEIA-PRIMEIRO.md` (inclusive "O que a análise dos PSDs mostrou"), `scripts/handouts/lib/manifest.js` e `catalog.js` (etapa 8), `server/handout-paths.js`.

## Objetivo

Ler os PSDs do acervo **sem exportar imagem nenhuma** e produzir: (1) uma árvore normalizada de cada arquivo, que as etapas 11 e 12 usam; (2) um relatório que diz, para o acervo inteiro, o que existe (mesclagens, ajustes, fontes, textos, variações, UV) e quais arquivos são fáceis ou difíceis de importar. Isso guia as etapas seguintes com dados reais, em vez de suposições.

```
npm run handouts:psd-report -- --source "<pasta do Arquivos Confidenciais>" [--bundle "Bundle 4"] [--file "<caminho de um .psd>"] [--limit 20]
```

## Fatos medidos (24/10/2026, `ag-psd` 30.2.0)

- `readPsd(buffer, { skipLayerImageData: true, skipCompositeImageData: true, skipThumbnail: true })` lê só a estrutura, rápido e com pouca memória.
- Para ler pixels (etapa 11), o `ag-psd` exige um canvas. No Node, basta este *stub* (coloque em `scripts/handouts/lib/psd-canvas.js` e chame uma vez antes de ler):

```js
import { initializeCanvas } from 'ag-psd';
const imageData = (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
/** ag-psd asks for a canvas even when it only fills ImageData; this one does just that. */
export function useImageDataCanvas() {
  initializeCanvas((width, height) => ({ width, height, getContext: () => ({ createImageData: imageData, putImageData() {}, getImageData: (x, y, w, h) => imageData(w, h), drawImage() {} }) }), imageData);
}
```
  e leia com `useImageData: true` (os pixels vêm em `layer.imageData` e a composição final em `psd.imageData`).
- Objeto inteligente: `layer.placedLayer = { id, transform: [x0,y0, x1,y1, x2,y2, x3,y3], width, height, type, … }`. O conteúdo está em `psd.linkedFiles.find(f => f.id === placedLayer.id).data` (um PSB inteiro; leia com `readPsd` de novo). `transform` são os cantos (superior esquerdo, superior direito, inferior direito, inferior esquerdo) onde o retângulo `width × height` do PSB aparece no documento.
- Texto: `layer.text = { text, transform: [xx, xy, yx, yy, tx, ty], shapeType: 'box' | 'point', boxBounds: [l, t, r, b], style: { font: { name }, fontSize, fillColor?: { r, g, b }, leading, autoLeading, tracking }, paragraphStyle: { justification: 'left' | 'center' | 'right' | 'justify-left' | … , autoLeading }, styleRuns?, warp?: { style } }`. `font.name` é o **nome PostScript**. `tracking` já está em milésimos de em. Cor ausente = preto.
- Mesclagem vem com espaços: `'normal'`, `'pass through'`, `'multiply'`, `'screen'`, `'overlay'`, `'soft light'`, `'hard light'`, `'linear burn'`, `'linear dodge'`, `'lighter color'`, `'darker color'`, `'color dodge'`, `'color burn'`, …
- Ajuste: `layer.adjustment = { type: 'hue/saturation' | 'black & white' | 'levels' | 'curves' | 'color balance' | 'brightness/contrast' | 'invert' | …, … }`; matiz/saturação traz `master: { hue, saturation, lightness }`.

## Arquivos

```
scripts/handouts/lib/psd-canvas.js     # o stub acima
scripts/handouts/lib/psd-tree.js       # normalizar a árvore (puro, recebe o objeto do ag-psd)
scripts/handouts/lib/psd-geometry.js   # transformar caixas e cantos (puro)
scripts/handouts/psd-report.js         # CLI
tests/handouts-psd-tree.test.js
```

## Árvore normalizada (`psd-tree.js`)

```js
export const PSD_BLENDS = {   // ag-psd → id do ateliê (BLEND_MODES da etapa 2); null = sem equivalente
  'normal': 'normal', 'pass through': 'pass-through', 'multiply': 'multiply', 'screen': 'screen', 'overlay': 'overlay',
  'soft light': 'soft-light', 'hard light': 'hard-light', 'darken': 'darken', 'lighten': 'lighten',
  'color dodge': 'color-dodge', 'color burn': 'color-burn', 'linear dodge': 'linear-dodge', 'linear burn': 'linear-burn',
  'lighter color': 'lighter-color', 'darker color': 'darker-color', 'difference': 'difference', 'exclusion': 'exclusion',
  'hue': 'hue', 'saturation': 'saturation', 'color': 'color', 'luminosity': 'luminosity',
  'dissolve': null, 'vivid light': null, 'linear light': null, 'pin light': null, 'hard mix': null, 'subtract': null, 'divide': null,
};

/**
 * A layer tree independent of ag-psd: what the compositor and the template builder need, nothing else.
 * `linked` resolves a smart object's content: id → the PSB already read (or null).
 */
export function normalizeTree(psd, { linked = () => null } = {})
// → { width, height, nodes: [Node], warnings: [string] }  (nodes de baixo para cima, como no ag-psd; children também)
```

```js
Node = {
  id: 'n7',                        // sequencial no arquivo
  name, path: 'Com Rasgo/Textos',  // nomes dos grupos até ela
  kind: 'group' | 'pixel' | 'text' | 'smart' | 'adjust',
  blend,                           // id do ateliê, 'pass-through', ou 'unsupported:<nome>'
  opacity,                         // layer.opacity (0–1) × (layer.fillOpacity ?? 1) para pixel/smart; só opacity para grupos
  visible: !layer.hidden,
  clipping: Boolean(layer.clipping),
  bounds: { left, top, right, bottom },
  mask: layer.mask ? { left, top, right, bottom, defaultColor, disabled } : null,
  effects: Object.keys(layer.effects ?? {}).filter(key => layer.effects[key] && key !== 'scale'),   // só os nomes
  children,                        // grupos
  text,                            // kind 'text': { content, postscript, size, color: '#rrggbb', leading: number|null, tracking, justification, shape, box: [l,t,r,b], matrix: [6] }
  smart,                           // kind 'smart': { linkedId, corners: [8], width, height, content: { width, height, nodes } | null }
  adjust,                          // kind 'adjust': o objeto adjustment do ag-psd, como veio
}
```

Também em `psd-tree.js`:

```js
export function textNodes(tree)          // todos os textos, inclusive dentro de objetos inteligentes, com a caixa já no espaço do documento (use psd-geometry)
export function variantGroups(tree)      // irmãos de primeiro nível que são grupos e dos quais exatamente um está visível: [{ names, visible }]
export function looksLikeUv(node)        // nome contém 'uv' (palavra, sem diferenciar maiúscula) ou 'luz negra'
```

## Geometria (`psd-geometry.js`, puro)

```js
export function cornersToAffine(corners, width, height)
// Retângulo width × height do PSB → quadrilátero dos cantos. Se for paralelogramo (x2-x3 ≈ x1-x0 e y2-y3 ≈ y1-y0, tolerância 0,5 px),
// devolve { a, b, c, d, e, f } (x' = a·x + c·y + e; y' = b·x + d·y + f). Senão, { perspective: true } e o importador trata como imagem.
export function applyAffine(m, x, y)
export function textBoxInDocument(text, outer = null)
// Caixa do texto (boxBounds para 'box'; para 'point', [0, -size, larguraEstimada, size × 0.3] onde larguraEstimada = maior linha × size × 0,55)
// transformada por text.matrix e depois por `outer` (o afim do objeto inteligente, se o texto estiver dentro de um).
// → { x, y, width, height, rotation (graus) } — rotação vinda de atan2(b, a) da matriz composta; escala aplicada ao tamanho da fonte
//   também: devolva `scale` = sqrt(a² + b²) para multiplicar text.size.
```

## Relatório (`psd-report.js`)

Para cada `.psd`/`.psb` encontrado (ordem alfabética, um por vez):

1. Leia só a estrutura, depois os PSBs ligados que forem PSD (`linkedFiles[i].data` começando com `8BPS`), com o mesmo `readPsd`.
2. `normalizeTree`, e grave `<biblioteca>/reports/psd/<slug do caminho relativo>.json` com: `{ file, bytes, width, height, nodes, texts: textNodes(...), variants, uv: [nomes], fonts: [postscript], blends: { nome: n }, adjustments: { tipo: n }, effects: { nome: n }, unsupported: [...], perspective: n, score }`.
3. `score` (0–100, só para ordenar o trabalho): começa em 100; −5 por mesclagem sem equivalente, −3 por tipo de ajuste diferente de `hue/saturation`, `black & white`, `brightness/contrast`, `invert`, `levels`; −10 por objeto inteligente em perspectiva; −2 por efeito de camada (até −20); −15 se não houver texto nenhum (é só imagem); mínimo 0.
4. Erro num arquivo (PSD corrompido, sem memória) vai para a lista de erros; o script continua.

No fim, `<biblioteca>/reports/psd-summary.json` e `psd-summary.md` (tabela legível): total de arquivos e de bytes; contagem de cada mesclagem, ajuste, efeito; **fontes usadas** com quantos arquivos usam cada uma e se ela já está na biblioteca (procure pelo `postscript` nos itens `font` do `library.json`); os 20 de maior e os 20 de menor `score`; erros.

Rode com `node --max-old-space-size=8192` (já no `package.json`). Mostre o progresso a cada arquivo (`[12/430] Bundle 4/…/3- Recorte de Jornal.psd · 0,4 s`).

## Testes (`tests/handouts-psd-tree.test.js`)

Monte objetos **no formato do ag-psd à mão** (não precisa de PSD de verdade):

1. Grupo `pass through` com um pixel `multiply` opacidade .5, `fillOpacity` .5, `clipping: true` → nó com `blend: 'multiply'`, `opacity: .25`, `clipping: true`, `path` com o nome do grupo.
2. Mesclagem `'vivid light'` → `blend: 'unsupported:vivid light'` e um aviso.
3. Texto `box` com `matrix` [1,0,0,1,100,200] e `boxBounds` [0,0,300,50] → em `textNodes`, x 100, y 200, largura 300; cor ausente → `#000000`.
4. Objeto inteligente com cantos de um retângulo escalado 2× e deslocado (`[10,20, 210,20, 210,120, 10,120]` para PSB 100 × 50) contendo um texto em (5,5) tamanho 10 → caixa em (20, 30) e `scale` 2.
5. Cantos não paralelos → `{ perspective: true }`.
6. `variantGroups`: dois grupos irmãos, um oculto → uma variante com os dois nomes.
7. `looksLikeUv('Efeito de UV')` e `looksLikeUv('Luz negra')` são verdadeiros; `'Uva'` é falso.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Rodado de verdade em pelo menos 3 pacotes (`--bundle "Bundle 4"`, `"Bundle 2"`, `"Bundle 59"`) e no acervo inteiro se der tempo. Anote no `progress.md` o tempo, as cinco mesclagens e os cinco ajustes mais comuns e as fontes que faltam na biblioteca: são os dados que a etapa 11 usa para priorizar.

## Não faça

- Não grave imagem nenhuma. Não escreva fora de `handoutLibraryDir()`. Não modifique nada no HD.
