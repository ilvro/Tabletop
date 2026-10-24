# Etapa 11 — Compor as camadas de um PSD em Node

Leia antes: `00-LEIA-PRIMEIRO.md`, `etapa-10-psd-leitura.md` (a árvore normalizada e o stub de canvas), `scripts/handouts/lib/psd-tree.js`, `src/domain/handout-pixels.js` (`blendChannel`, `applyAdjustPixels`), `<biblioteca>/reports/psd-summary.md` (gerado na etapa 10: quais mesclagens e ajustes aparecem de verdade).

## Objetivo

Reconstruir a imagem de um PSD a partir das camadas, em Node, para a etapa 12 poder **separar** o que é fundo do que é editável. Medimos a qualidade comparando com a composição que o próprio Photoshop salvou no arquivo (`psd.imageData`).

Não precisa ser perfeito: precisa ficar **parecido o bastante** para que um fundo reconstruído, com os textos desenhados pelo ateliê por cima, pareça o original. A métrica e os limites estão no fim.

## Arquivos

```
scripts/handouts/lib/raster.js        # buffers RGBA, reduzir, recortar, colar (puro + sharp só para reduzir)
scripts/handouts/lib/blend.js         # composição com alfa e mesclagens (puro)
scripts/handouts/lib/adjust.js        # camadas de ajuste (puro)
scripts/handouts/lib/compose.js       # percorre a árvore e compõe (puro, exceto a redução)
scripts/handouts/psd-check.js         # CLI de conferência visual
tests/handouts-compose.test.js
```

## Escala de trabalho

Componha já na **escala final**: `scale = min(1, 1240 / psd.width)` para A4 retrato (largura 2480 → 1240); em geral `scale = min(1, 2048 / max(width, height))`. Reduza os pixels de cada camada (e de cada máscara) para essa escala **antes** de compor, com `sharp(raw, { raw: { width, height, channels: 4 } }).resize(w2, h2, { kernel: 'lanczos3' })` (o `sharp` pré-multiplica o alfa ao reduzir). Posições: `Math.round(left × scale)`.

Buffers: `{ width, height, data: Float32Array }` com RGBA em 0–1 **não** pré-multiplicado. (Float32 de 1240 × 1754 × 4 ≈ 35 MB; mantenha poucos vivos.)

## Composição (`blend.js`)

Use a fórmula de composição da W3C (*Compositing and Blending Level 1*) com `source-over` e mesclagem:

```
αo = αs + αb·(1 − αs)
Co = [ (1 − αb)·αs·Cs + αb·αs·B(Cb, Cs) + (1 − αs)·αb·Cb ] / αo     (Co = 0 se αo = 0)
```

onde `αs` já inclui opacidade da camada × máscara. `B` vem de `blendChannel` (separáveis) ou das funções não separáveis abaixo.

```js
export function blendPixel(mode, backdrop, source, out)          // arrays [r,g,b,a] 0–1
export function nonSeparable(mode, cb, cs)                       // 'hue' | 'saturation' | 'color' | 'luminosity' (W3C: Lum, Sat, SetLum, SetSat, ClipColor)
                                                                 // 'lighter-color' / 'darker-color': a cor inteira de quem tem a maior/menor soma r+g+b
export function compositeLayer(target, layer, { mode, opacity, mask, clipAlpha, left, top })
// Desenha `layer` (buffer) sobre `target` na posição; mask: buffer de um canal 0–1 (ou null); clipAlpha: Float32Array do alfa da base (ou null).
```

## Árvore (`compose.js`)

```js
export async function composeTree(tree, pixels, { scale, skip = () => false, warnings = [] })
// pixels(node) → { buffer, mask } já reduzidos (lidos do ag-psd por quem chama). skip(node) → true para pular (ex.: textos na etapa 12).
// → buffer do documento inteiro na escala.
```

Regras, de baixo para cima em cada lista de filhos:

1. Nó invisível: pula (com seus filhos).
2. **Grupo `pass-through`**: os filhos são compostos **direto** no buffer atual (como se o grupo não existisse), com a opacidade do grupo multiplicando a de cada filho. A máscara do grupo, se houver, também multiplica.
3. **Grupo com outro modo**: compõe os filhos num buffer transparente separado e depois compõe esse buffer no atual com o modo, opacidade e máscara do grupo.
4. **Recorte**: um nó sem `clipping` seguido de nós com `clipping` forma um grupo de recorte (mesma regra da etapa 3): a base é composta normalmente; cada recortada é composta usando como `clipAlpha` o alfa **da base** (o buffer da base sozinha, antes das recortadas).
5. **pixel** e **smart**: usam os pixels rasterizados da própria camada (`layer.imageData`; o `ag-psd` guarda o objeto inteligente já desenhado). Efeitos de camada são **ignorados**: some o nome em `warnings` (uma vez por tipo).
6. **text**: também tem pixels rasterizados na camada; componha-os (a etapa 12 decide quando pular).
7. **adjust**: aplica o ajuste ao buffer atual (ou, se `clipping`, só onde a base tem alfa, usando `clipAlpha`), misturando o resultado com a opacidade × máscara do ajuste. Tipos não implementados: pula e avisa.
8. Mesclagem `unsupported:*`: compõe como `normal` e avisa.

Máscaras: `layer.mask` vem com bounds e `defaultColor` (fora dos bounds vale `defaultColor / 255`). Máscara `disabled` é ignorada. Máscara vetorial (`layer.vectorMask`) é ignorada com aviso.

## Ajustes (`adjust.js`)

Implemente, na ordem de prioridade (ajuste a ordem pelo `psd-summary.md` da etapa 10):

| Tipo (`ag-psd`) | Como |
|---|---|
| `hue/saturation` | só `master`: `hue` (−180..180) rotaciona o matiz em HSL; `saturation` (−100..100) multiplica a saturação HSL por `1 + s/100` (s < 0) ou aproxima de 1 (s > 0: `S + (1 − S)·s/100`); `lightness` (−100..100) mistura com preto ou branco. Se `colorize` vier ligado, pinte com `hue`/`saturation` do master. As faixas por cor (`reds`, …): ignore e avise se alguma tiver valores diferentes de zero. |
| `black & white` | luminância com os pesos padrão do Photoshop por matiz (vermelhos 40, amarelos 60, verdes 40, cianos 60, azuis 20, magentas 80): interpole o peso pelo matiz do pixel entre os dois mais próximos e faça `cinza = L + (peso − 50)/100 × S` aproximado. Se o arquivo trouxer os pesos, use-os. Se `useTint`, multiplique pelo tom. Basta ficar visualmente parecido: conferido pela métrica. |
| `brightness/contrast` | brilho soma `b/255`; contraste `(v − .5)·(1 + c/100) + .5` |
| `invert` | `1 − v` |
| `levels` | canal composto `rgb`: entrada sombra/realce, gama (`midtoneInput`), saída sombra/realce. Confira os nomes reais dos campos no objeto do ag-psd (imprima um) e documente no código. |
| `curves` | canal composto: pontos `{ input, output }` 0–255 → tabela de 256 valores por interpolação linear entre pontos (cúbica fica como melhoria). |
| `color balance` | só tons médios, aproximado: soma `(ciano↔vermelho, magenta↔verde, amarelo↔azul) / 255 × .5` a R, G, B com peso `4·L·(1 − L)`. |

Cada um como função pura `adjustBuffer(buffer, adjustment, { mask, clipAlpha, opacity })`.

## Conferência (`psd-check.js` e a métrica)

```js
export function compareBuffers(a, b)   // mesmo tamanho → { mae, bad } — mae: erro absoluto médio de R,G,B em 0–255, ponderado pelo alfa de b; bad: fração de pixels com erro > 24
```

```
node --max-old-space-size=8192 scripts/handouts/psd-check.js --file "<psd>"
```

Lê o PSD com pixels (`useImageDataCanvas()` antes; `readPsd(buffer, { useImageData: true })`), compõe a árvore toda, reduz `psd.imageData` para a mesma escala e grava em `<biblioteca>/reports/psd-check/<slug>/`: `original.png`, `nosso.png`, `diferenca.png` (|a − b| × 4, para ver onde erra) e `resultado.json` (`mae`, `bad`, `warnings`, tempo, memória máxima). No terminal: uma linha com `mae` e `bad`.

**Limites de aceitação**, medidos nos três arquivos de referência abaixo:

| Arquivo | `mae` | `bad` |
|---|---|---|
| `Bundle 4 - Jornais (PARTE 1)/Bundle 4 - Jornais [Complexo]/4- Recorte de Jornal.psd` | ≤ 6 | ≤ 3 % |
| `Bundle 21 - Polaroides e Porta-Retratos (PARTE 1)/1- Quadro Azul.psd` | ≤ 6 | ≤ 3 % |
| `Bundle 59 - Rework Documentos Policiais com Luz UV/2- Relatório Policial.psd` | ≤ 10 | ≤ 8 % (tem UV e efeitos) |

Se um não atingir, olhe `diferenca.png`, descubra qual regra ou ajuste falta, e registre no `progress.md` o que foi tentado. Não mude os limites sem falar com o usuário.

## Testes (`tests/handouts-compose.test.js`, buffers montados à mão, 4 × 4 px)

1. `normal` com opacidade .5 de vermelho sobre branco → (1, .5, .5, 1).
2. `multiply` de azul sobre vermelho, ambos opacos → preto; `screen` → magenta.
3. Fonte com alfa .5 em `multiply` sobre fundo transparente → a cor da fonte com alfa .5 (a mesclagem não age onde não há fundo).
4. `luminosity` de cinza 50 % sobre vermelho puro → vermelho com a luminância do cinza (confira contra a fórmula W3C).
5. Grupo `pass-through` com um filho `multiply` × grupo `normal` com o mesmo filho: resultados diferentes, como no Photoshop (no isolado, o `multiply` não enxerga o fundo).
6. Recorte: base cobrindo só a metade esquerda; a recortada (preta, cobrindo tudo) só escurece a esquerda.
7. Máscara: metade 0, metade 1 → a camada só aparece na metade com 1; `defaultColor: 255` fora dos bounds.
8. `hue/saturation` com saturação −100 → R = G = B; `invert` duas vezes volta ao original.
9. `curves` com pontos (0,0) (128,200) (255,255) → 128 vira 200/255 (± 1/255).
10. `compareBuffers` de buffers iguais → `mae` 0; um pixel em 16 diferente por 255 → `bad` = 1/16.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] `psd-check.js` atinge os limites nos três arquivos de referência; os números estão no `progress.md` e na tabela "Andamento".

## Não faça

- Não crie modelos (etapa 12). Não grave nada fora de `reports/psd-check/`.
- Não implemente efeitos de camada (sombra, brilho, chanfro): só avise.
