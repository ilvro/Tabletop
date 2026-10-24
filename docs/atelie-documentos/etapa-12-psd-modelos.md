# Etapa 12 — PSD vira modelo editável

Leia antes: `00-LEIA-PRIMEIRO.md`, `etapa-02-modelo-de-dados.md` (formato, inclusive `adjust.curve` e campos de imagem), `etapa-10-psd-leitura.md`, `etapa-11-psd-compositor.md`, `scripts/handouts/lib/psd-tree.js`, `psd-geometry.js`, `compose.js`, `adjust.js`, `manifest.js`, `catalog.js`, `src/domain/handouts.js`.

## Objetivo

Converter cada PSD do acervo num **modelo** do ateliê que fica parecido com o original e em que se pode trocar o texto, a fonte, a foto, e ligar ou desligar o amassado, as dobras, o rasgo ou o UV. Não é "uma imagem com textos por cima": a conversão é **quase camada por camada**, porque o ateliê tem mesclagem, recorte, opacidade, ajustes e luz UV.

```
npm run handouts:psd-import -- --source "<pasta>" [--bundle "Bundle 4"] [--file "<psd>"] [--limit 10] [--force]
```

`--source` também aceita a pasta dos documentos do usuário (`…/Campanhas/Vaesen/Documentos`).

## Arquivos

```
scripts/handouts/lib/psd-to-handout.js   # árvore normalizada + pixels → { handout, rasters, report } (puro, exceto a redução de imagem)
scripts/handouts/lib/font-match.js       # nome PostScript → fonte da biblioteca (puro)
scripts/handouts/import-psd.js           # CLI: lê, converte, grava, valida, atualiza o manifesto
tests/handouts-psd-to-handout.test.js
tests/e2e/handout-templates.test.js
```

## Conversão (`psd-to-handout.js`)

Escala: a mesma da etapa 11 (`scale = min(1, 1240 / largura)` para A4; em geral lado maior ≤ 2048). A página do modelo tem `width × scale` por `height × scale`.

Percorra a árvore de baixo para cima, produzindo uma **lista plana** de camadas do ateliê:

| Nó | Vira |
|---|---|
| grupo `pass-through` | nada; os filhos entram na lista (opacidade do grupo multiplica a deles; máscara do grupo é aplicada ao alfa de cada filho) e o nome do grupo vai no início do nome (`"Com Rasgo · Amassado"`) |
| grupo com outro modo | **uma** camada `image`: o grupo composto isolado (etapa 11, regra 3), com o modo e a opacidade do grupo |
| grupo de variação (de `variantGroups`) | como `pass-through`, mas as camadas do grupo oculto entram com `visible: false`, e o nome começa com `"Variação · <nome do grupo>"` |
| grupo UV (`looksLikeUv`) | os filhos entram com `light: 'uv'` (só aparecem com luz UV, etapa 14) |
| `pixel` | camada `image` com os pixels da camada (máscara aplicada no alfa), posição e tamanho dos bounds × scale, `blend`, `opacity`, `clip` |
| `smart` afim **sem texto dentro** | igual a `pixel` (pixels rasterizados da própria camada) |
| `smart` afim **com texto dentro** | (a) uma camada `image` com o conteúdo do PSB **composto sem os textos** (etapa 11 com `skip` nos textos), transformado pelo afim para o lugar dos cantos, com o modo e a opacidade do objeto; (b) cada texto do PSB como camada `text` (abaixo), na posição transformada, com o **mesmo modo e opacidade** do objeto |
| `smart` em perspectiva | camada `image` rasterizada; textos dentro ficam de fora e entram no relatório |
| `text` | camada `text` (abaixo) |
| `adjust` mapeável | camada `adjust` (tabela abaixo), com `clip` e `opacity`; máscara de ajuste é ignorada com aviso |
| `adjust` não mapeável | ignorado, com aviso |

Ajustes → `adjust`:

| Photoshop | ateliê |
|---|---|
| `hue/saturation` (master) | `hue: master.hue`, `saturation: master.saturation / 100`, `brightness: master.lightness / 100` |
| `black & white` | `grayscale: 1` |
| `brightness/contrast` | `brightness: b / 150`, `contrast: c / 100` |
| `invert` | `invert: true` |
| `curves` (canal composto) | `curve: pontos` |
| `levels` (canal composto) | `curve`: amostre a função de níveis em 9 entradas (0, 32, …, 255) |
| `color balance` | `curve` não serve; ignore e avise |

Texto → camada `text`:

- Caixa: `textBoxInDocument` (etapa 10) × scale; `rotation` da matriz.
- `content` = `text.text` com `\r` trocado por `\n`.
- `size` = `fontSize × escalaDaMatriz × scale`; `lineHeight` = `leading / fontSize` (se `autoLeading`, `paragraphStyle.autoLeading ?? 1.2`); `letterSpacing` = `tracking`.
- `align`: `left`→`left`, `center`→`center`, `right`→`right`, qualquer `justify-*`→`justify`. `box`: `shapeType 'box'` → `area`, `'point'` → `point`. `fit: 'overflow'`.
- `color` da `style.fillColor` (ausente = `#000000`).
- Fonte: `matchFont(postscript, libraryFonts)` (abaixo). Achou: `{ family: item.family, library: item.id, weight: item.weight, italic: item.style === 'italic' }`. Não achou: `{ family: postscript, library: null, weight: 400, italic: false }` e a fonte vai para `missingFonts` no relatório.
- `ink.style`: `typewriter` se a fonte da biblioteca for da categoria "Máquina de escrever" ou o nome tiver `type`, `courier`, `trypewriter`, `executive`, `remington`; `handwriting` se tiver `hand`, `script`, `brush`, `marker`, `pen`; senão `clean`. `wear: 0` (o desgaste do original vem das camadas acima do texto).
- Cada texto vira um **campo** do "Preencher" com `label` = nome da camada (sem espaços sobrando; se repetir, acrescente " 2", " 3").
- Texto com mais de um estilo (`styleRuns.length > 1`): use o estilo do primeiro trecho e avise.

Vagas de imagem: camadas `pixel` ou `smart` cujo nome case com `/foto|imagem|retrato|brasão|brasao|coloque|insira|sua imagem|placeholder/i` viram campo de imagem (`label` = nome), mantendo os pixels originais como imagem inicial.

**Juntar para não ter camadas demais**: depois da lista pronta, junte (componha num só raster, etapa 11) sequências de camadas `image` vizinhas que sejam todas `normal`, sem `clip`, sem `light: 'uv'`, que não sejam campo e não tenham variação. A primeira sequência vira "Fundo". Meta: um modelo típico com 5 a 20 camadas.

Rasters: cada camada `image` grava um `templates/<tplId>/<nn>.webp` (`quality: 88`, alfa preservado, recortado aos pixels não transparentes para economizar) e vira item `kind: 'layer'` no manifesto com id `<tplId>--<nn>`; a camada aponta para `src: { library: '<tplId>--<nn>' }`.

## Fonte certa (`font-match.js`)

```js
export function matchFont(postscript, fonts)
// 1. item com postscript igual (sem diferenciar maiúscula)
// 2. item cujo slug(postscript) é igual ao slug(family + subfamily) ou ao slug(fullName)
// 3. item cuja família, sem espaços e sem hífen, é prefixo do postscript (ex.: 'Lora' ↔ 'Lora-Bold' com peso 700)
// senão null
```

## Gravação, id e categoria

- `tplId` = `'tpl-' + slug(categoria) + '-' + slug(nome do arquivo sem número inicial) + '-' + 6 hex do sha1 do caminho` (estável).
- Categoria: nome do pacote sem `Bundle N - `, sem `miniBundle`, sem `[ESPECIAL]`, sem `Rework`, sem `(PARTE n)`: `Bundle 59 - Rework Documentos Policiais com Luz UV` → `Documentos Policiais com Luz UV`. Para a pasta do usuário: o nome da pasta de origem (ex.: `Vaesen`).
- Nome: o nome do arquivo sem extensão e sem o número inicial (`2- Relatório Policial` → `Relatório Policial`).
- Tags: palavras da categoria e do nome; `uv` se tiver camadas UV; `variações` se tiver variação.
- Item `kind: 'template'`: `{ id, kind, name, category, tags, file: 'templates/<id>.json', preview: 'previews/<id>.webp' (a composição do PSD, lado maior 480), width, height, source: { bundle, path }, fields: n, layers: n }`.
- `templates/<id>.json` é o documento (passe por `validateHandout` antes de gravar; se falhar, não grave e registre o erro).
- Incremental como na etapa 8 (`state/psd-index.json` por tamanho e data); `--force` refaz.

## Validação de cada modelo

1. **Sem texto**: componha (etapa 11) o modelo inteiro **sem as camadas de texto** e compare com a composição do PSD **com as caixas de texto apagadas da comparação** (pixels dentro das caixas não contam). Grave `mae` e `bad` no relatório. Limite para aceitar automaticamente: `mae ≤ 8` e `bad ≤ 5 %`. Acima disso, o modelo é gravado mesmo assim, mas com a tag `revisar` e o motivo no relatório.
2. **Com texto** (no navegador, E2E): renderize o modelo com `window.__tabletop.renderHandout` e compare com `original.png`; o limite é mais folgado (`mae ≤ 18`), porque o texto do canvas nunca é idêntico ao do Photoshop.

Relatório por modelo em `reports/templates/<id>.json` (`mae`, `bad`, `missingFonts`, `warnings`, camadas, campos, tempo) e um resumo `reports/templates-summary.md` com quantos foram aceitos, quantos ficaram com `revisar` e as fontes que mais faltam.

## Testes

`tests/handouts-psd-to-handout.test.js` (árvores e pixels montados à mão, como na etapa 11):

1. Grupo `pass-through` "Com Rasgo" com um pixel `soft-light` → camada `image` "Com Rasgo · <nome>" com `blend: 'soft-light'`.
2. Dois grupos irmãos de variação, um oculto → as camadas do oculto vêm com `visible: false` e prefixo "Variação ·".
3. Grupo "Efeito de UV" → as camadas vêm com `light: 'uv'`.
4. Objeto inteligente afim (escala 2) com um texto e um pixel dentro → uma `image` sem o texto, transformada, e uma `text` com `size` dobrado, no lugar certo, com o modo do objeto; o texto virou campo.
5. `hue/saturation` com saturação −50 → `adjust` com `saturation: -.5`; `levels` → `curve` com 9 pontos crescentes.
6. Três `image` `normal` seguidas no fundo viram uma só "Fundo".
7. `matchFont('Lora-Bold', [{ family: 'Lora', postscript: 'Lora-Regular', weight: 400 }, { family: 'Lora', postscript: 'Lora-Bold', weight: 700 }])` → o de peso 700; `'Nada'` → `null`.
8. O documento gerado passa em `validateHandout`.

`tests/e2e/handout-templates.test.js`: monte uma biblioteca temporária com um modelo gerado pelo importador a partir de um PSD **pequeno criado no próprio teste** com `writePsd` do `ag-psd` (um fundo, uma camada `multiply` e um texto; se o `writePsd` de texto exigir canvas real, crie só as camadas de pixel e acrescente o texto no JSON do modelo à mão). Abra no ateliê ("Usar este modelo"), confira que o campo aparece no "Preencher" e que trocar o texto muda os pixels.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Rodado nos três arquivos de referência da etapa 11 e em pelo menos um pacote inteiro (`--bundle "Bundle 4"`): os modelos abrem no ateliê, o texto troca, as variações ligam e desligam; números no `progress.md`.
- [ ] Rodado em `Bundle 59` (UV): as camadas UV ficam com `light: 'uv'`.

## Não faça

- Não importe efeitos de camada (sombra, brilho, contorno). Não tente reproduzir texto em arco (`warp` diferente de `none`): mantenha o raster do texto (como imagem) e avise.
- Não grave nada fora da biblioteca. Não modifique nada no HD.
