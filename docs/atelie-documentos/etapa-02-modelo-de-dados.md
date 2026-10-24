# Etapa 2 — Modelo de dados

Leia antes: `00-LEIA-PRIMEIRO.md`, `src/domain/inspectables.js` (para ver o estilo de validação com `ValidationError` e limites), `src/domain/validation.js` linhas 1–40 (a classe `ValidationError`).

## Objetivo

Definir, em `src/domain/handouts.js`, o formato de um documento do ateliê, as funções que o criam e o alteram sem mutar o original, e a validação. Tudo puro, sem DOM. Testado em `tests/handouts.test.js`.

## O formato

Um documento tem uma página e camadas empilhadas **de baixo para cima** (`layers[0]` é o fundo). As medidas são em **pixels do documento**: a página A4 padrão tem 1240 × 1754 (A4 a 150 ppp). O renderizador escala tudo para o tamanho pedido.

```js
{
  schema: 1,
  id: 'c0ffee00-…',               // uuid
  revision: 0,                      // incrementado pelo servidor
  name: 'Ficha criminal de Sonny',  // 1–120 caracteres
  category: 'Policial',             // livre, até 60
  tags: ['polícia', 'ficha'],       // até 20, cada uma até 40
  page: { width: 1240, height: 1754, background: '#00000000' },   // 64–4096 px; cor #rrggbb ou #rrggbbaa
  layers: [ /* camadas, ver abaixo; até 200 */ ],
  fields: [ { layerId: 'l-nome', label: 'Nome do suspeito' }, { layerId: 'l-foto', label: 'Foto do suspeito' } ],
                                    // campos do modo "Preencher" (camadas de texto ou de imagem); até 60
  source: { kind: 'blank' },        // 'blank' | 'template' (templateId) | 'import' (file, bundle)
}
```

### Campos comuns a toda camada

```js
{
  id: 'l-…',            // único no documento; /^[A-Za-z0-9_-]{1,64}$/
  name: 'Papel',        // até 80
  kind: 'image',        // 'image' | 'text' | 'shape' | 'adjust' | 'effect'
  visible: true,
  locked: false,
  opacity: 1,           // 0–1
  blend: 'normal',      // ver BLEND_MODES
  x: 0, y: 0,           // canto superior esquerdo da caixa, antes de girar
  width: 1240, height: 1754,   // > 0, até 8192
  rotation: 0,          // graus, -360..360, em torno do centro da caixa
  clip: false,          // true: só aparece onde a camada imediatamente abaixo tem pixels (máscara de recorte)
  light: 'both',        // 'both' | 'normal' | 'uv' — em que luz a camada aparece (etapa 14)
}
```

### Por tipo

```js
// image: uma imagem da biblioteca ou um asset importado no Tabletop
image: {
  src: { library: 'el-sangue-0007' } | { asset: { id, revision } } | null,
  fit: 'stretch',                // 'stretch' | 'cover' | 'contain'
  crop: null,                    // ou { x, y, width, height } em 0–1 da imagem original
  flipX: false, flipY: false,
  filter: { grayscale: 0, sepia: 0, brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0, invert: false },
                                 // grayscale/sepia 0–1; brightness/contrast/saturation -1..1; hue -180..180; blur 0–40 px
  tint: null,                    // ou { color: '#7a3cff', amount: 0–1 }
}

// text
text: {
  content: 'Nome: Sonny Forelli',   // até 5000; '\n' quebra linha
  font: { family: 'KingthingsTrypewriter2', library: 'font-kingthings-trypewriter-2' | null, weight: 400, italic: false },
                                    // weight 100–900; library null = fonte do sistema
  size: 46,                         // px do documento, 4–600
  color: '#111111',
  align: 'left',                    // 'left' | 'center' | 'right' | 'justify'
  valign: 'top',                    // 'top' | 'middle' | 'bottom'
  lineHeight: 1.25,                 // 0.6–4
  letterSpacing: 0,                 // milésimos de em, -200..1000
  box: 'area',                      // 'area' quebra na largura; 'point' não quebra
  fit: 'overflow',                  // 'overflow' | 'shrink' (diminui até caber na caixa)
  ink: { style: 'clean', wear: 0, seed: 1 },   // 'clean' | 'typewriter' | 'handwriting' | 'stamp'; wear 0–1; seed inteiro (etapa 4)
}

// shape
shape: { type: 'rect', fill: '#000000' | null, stroke: '#000000' | null, strokeWidth: 2, radius: 0, dash: [] }
                                    // type 'rect' | 'ellipse' | 'line'; strokeWidth 0–200; dash até 8 números

// adjust: muda a cor de tudo o que está abaixo (ou só da camada abaixo, com clip: true)
adjust: { grayscale: 0, sepia: 0, brightness: 0, contrast: 0, saturation: 0, hue: 0, invert: false, curve: null }
                                    // curve: null ou [[entrada, saída], …] 0–255, 2 a 16 pontos com entrada crescente (curvas e níveis importados do Photoshop)

// effect: gerado por código, sem imagem (etapa 15)
effect: { type: 'crumple', seed: 1, amount: .5, params: {} }
                                    // type 'crumple' | 'fold' | 'stain' | 'burn' | 'tear' | 'damp' | 'fade' | 'blood' | 'grain'
```

Uma camada tem **exatamente** o bloco do seu tipo (`image` para `kind: 'image'` etc.) e nenhum dos outros.

### Mesclagens

```js
export const BLEND_MODES = [
  // [id, nome na interface, operação do canvas 2D]
  ['normal', 'Normal', 'source-over'],
  ['multiply', 'Multiplicação', 'multiply'],
  ['screen', 'Divisão de tela', 'screen'],
  ['overlay', 'Sobrepor', 'overlay'],
  ['soft-light', 'Luz suave', 'soft-light'],
  ['hard-light', 'Luz direta', 'hard-light'],
  ['darken', 'Escurecer', 'darken'],
  ['lighten', 'Clarear', 'lighten'],
  ['color-dodge', 'Subexposição de cor', 'color-dodge'],
  ['color-burn', 'Superexposição de cor', 'color-burn'],
  ['difference', 'Diferença', 'difference'],
  ['exclusion', 'Exclusão', 'exclusion'],
  ['hue', 'Matiz', 'hue'],
  ['saturation', 'Saturação', 'saturation'],
  ['color', 'Cor', 'color'],
  ['luminosity', 'Luminosidade', 'luminosity'],
  // Photoshop modes the 2D canvas lacks: drawn with the closest native one (the importer bakes them when it matters).
  ['linear-dodge', 'Subexposição linear', 'lighter'],
  ['linear-burn', 'Superexposição linear', 'multiply'],
  ['lighter-color', 'Cor mais clara', 'lighten'],
  ['darker-color', 'Cor mais escura', 'darken'],
];
export const canvasOperation = blend => BLEND_MODES.find(([id]) => id === blend)?.[2] ?? 'source-over';
```

### Tamanhos de página prontos

```js
export const PAGE_PRESETS = [
  ['a4', 'A4 · retrato', 1240, 1754], ['a4-landscape', 'A4 · paisagem', 1754, 1240],
  ['letter', 'Carta', 1275, 1650], ['clipping', 'Recorte de jornal', 1200, 700],
  ['polaroid', 'Polaroide', 880, 1070], ['telegram', 'Telegrama', 1240, 880],
  ['card', 'Cartão', 1050, 600], ['note', 'Bilhete', 900, 700], ['square', 'Quadrado', 1200, 1200],
];
```

## Funções (todas puras, sem mutar a entrada)

```js
export const HANDOUT_LIMITS = { layers: 200, fields: 60, text: 5000, name: 120, size: [64, 4096], box: 8192, tags: 20 };
export function createHandout({ name = 'Documento sem nome', preset = 'a4', id = crypto.randomUUID() } = {})  // página do preset, uma camada 'shape' retangular branca "Papel" cobrindo a página
export function imageLayer(patch = {}), textLayer(patch = {}), shapeLayer(patch = {}), adjustLayer(patch = {}), effectLayer(patch = {})
                                       // camada completa com os padrões acima e um id novo (`l-` + 8 caracteres aleatórios); patch sobrescreve
export function addLayer(handout, layer, index = handout.layers.length)     // insere; devolve novo documento
export function updateLayer(handout, layerId, patch)                         // mescla patch (e patch.image/text/… em profundidade de 1 nível)
export function removeLayer(handout, layerId)                                // também remove o campo que aponta para ela
export function moveLayer(handout, layerId, toIndex)                         // reordena
export function duplicateLayer(handout, layerId)                             // cópia logo acima, id novo, nome + ' — cópia'
export function setField(handout, layerId, label | null)                     // marca/desmarca um texto ou uma imagem como campo do "Preencher"
export function fillFields(handout, values)                                  // values: { [layerId]: 'texto' | src }; texto muda text.content, imagem muda image.src
export function validateHandout(value)                                       // lança ValidationError com caminho ('layers[3].text.size') na primeira falha; devolve o valor
export function layerAt(handout, layerId)                                    // a camada ou null
export function libraryRefs(handout)                                         // ids de biblioteca usados (imagens e fontes), sem repetição
```

`createHandout` e as fábricas usam `crypto.randomUUID()` / `crypto.getRandomValues()` (existem no Node 22 e no navegador).

## Testes (`tests/handouts.test.js`)

1. `createHandout()` passa em `validateHandout`, tem página 1240 × 1754 e uma camada "Papel".
2. Cada fábrica gera uma camada válida; o bloco do tipo existe e os outros não.
3. `addLayer`, `updateLayer`, `moveLayer`, `duplicateLayer`, `removeLayer` **não mudam** o documento de entrada (compare com `structuredClone` feito antes) e fazem o que dizem.
4. `removeLayer` de um texto marcado como campo remove o campo.
5. `fillFields` muda só os textos dos campos informados, e troca o `src` de um campo de imagem.
6. `validateHandout` rejeita, com o caminho certo na mensagem: `kind` desconhecido; `opacity` 1.5; `blend` 'foo'; camada `text` sem `text`; camada `text` com `image`; id repetido; `fields` apontando para camada inexistente ou para uma forma; `curve` com entradas fora de ordem; 201 camadas; página 50 px; cor `'red'`.
7. `canvasOperation('linear-burn')` é `'multiply'` e `canvasOperation('nada')` é `'source-over'`.
8. `libraryRefs` devolve imagens e fontes da biblioteca, sem repetir.

## Pronto quando

- [ ] `npm test` passa com os testes acima.
- [ ] Nenhum outro arquivo do projeto mudou além de `src/domain/handouts.js` e `tests/handouts.test.js`.

## Não faça

- Não desenhe nada (etapa 3). Não crie interface.
- Não ligue o documento às cenas (etapa 13).
