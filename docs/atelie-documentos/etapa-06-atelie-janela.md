# Etapa 6 — A janela do ateliê

Leia antes: `00-LEIA-PRIMEIRO.md`, `docs/DESIGN_SYSTEM.md`, `src/domain/handouts.js`, `src/render/handout-render.js`, `src/data/handouts-api.js`, `src/data/handout-images.js`, `src/data/handout-fonts.js`, `src/ui/controls.js` (`numberField`, `colorField`, `checkField`, `choiceField`, `bindControls`), `src/ui/icons.js`, `src/ui/shell.js` (o trilho, `railAction`), e em `src/app/application.js` só: a função `act` (procure `case 'tutorials':` para ver o formato) e onde a paleta registra ações (procure `action('Tutoriais'`).

## Objetivo

Abrir um documento numa janela de tela cheia, ver a página, escolher e mudar camadas pelo painel, desfazer, salvar e abrir de novo. **Sem** arrastar no palco (etapa 7) e **sem** biblioteca (etapa 9): imagens vêm só dos assets de imagem já importados no Tabletop.

## Como fica

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ATELIÊ  [Nome do documento____]  A4·retrato   ↶ ↷   − 50% +   [Salvar] [×] │  cabeçalho
├──────────────┬────────────────────────────────────────────┬──────────────────┤
│ CAMADAS   [+]│                                            │ PROPRIEDADES     │
│ 👁 🔒 Título │          (página sobre fundo xadrez,       │ Nome             │
│ 👁 🔒 Texto  │           centrada, com sombra)            │ X Y L A Rotação  │
│ 👁 🔒 Mancha │                                            │ Opacidade        │
│ 👁 🔒 Papel  │                                            │ Mesclagem ▾      │
│              │                                            │ (campos do tipo) │
│ [Abrir…]     │                                            │                  │
└──────────────┴────────────────────────────────────────────┴──────────────────┘
```

- Um `<dialog id="atelie" class="atelie">` aberto com `showModal()`, ocupando a janela inteira (`inset: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none`). Por ser `dialog` modal (sem a classe `floating-window`), os atalhos globais do editor já ficam suspensos (o manipulador de teclas do app ignora teclas com `dialog[open]:not(.floating-window)`).
- Título `ATELIÊ` em `.tt-tag`; nome do documento num campo de texto grande na fonte `--eco-font-display`.
- Lista de camadas **de cima para baixo** (a camada de cima do documento aparece primeiro), como no Photoshop.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `src/atelie/state.js` | Estado e histórico, **puro** (testável no Node) |
| `src/atelie/atelie.js` | `createAtelie(root, deps)`: monta o diálogo, liga tudo |
| `src/atelie/stage.js` | Palco: render, zoom, centralizar |
| `src/atelie/layers-panel.js` | HTML da lista de camadas e do menu "+" |
| `src/atelie/properties-panel.js` | HTML das propriedades da camada selecionada |
| `src/ui/atelie.css` | Estilos; importado em `src/main.js` com `import './ui/atelie.css';` depois de `styles.css` |
| `tests/atelie-state.test.js`, `tests/e2e/atelie.test.js` | Testes |

## `src/atelie/state.js`

```js
/**
 * The open handout, the selection and the undo history of the ateliê. Every edit replaces the handout (functions of
 * src/domain/handouts.js never mutate). Edits with the same `coalesce` key within 600 ms make one undo step, so a
 * slider dragged or a word typed is undone at once.
 */
export function createAtelieState(handout, { now = () => Date.now(), limit = 100 } = {})
// → {
//   get handout(), get selection() /* layer id or null */, get dirty(), get canUndo(), get canRedo(),
//   edit(nextHandout, { label, coalesce = null }),  // pushes history (or merges with the last step when coalesce matches and < 600 ms)
//   undo(), redo(), select(layerId | null),
//   markSaved(savedHandout),                         // dirty = false; keeps history
//   subscribe(listener) → unsubscribe                // listener(change) with change = { type: 'edit'|'undo'|'redo'|'select'|'saved' }
// }
```

- Depois de `undo`/`redo`, se a camada selecionada não existe mais, a seleção vira `null`.
- `edit` com um documento idêntico (mesma referência) não faz nada.
- O histórico guarda no máximo `limit` passos (descarta os mais antigos).

## Campos de propriedade

Use os controles de `src/ui/controls.js`. O `data-field` de cada campo é `h:` + caminho na camada:

| Para | `data-field` | Controle |
|---|---|---|
| todas | `h:name`, `h:x`, `h:y`, `h:width`, `h:height`, `h:rotation` | texto / `numberField` |
| todas | `h:opacity` (mostrar 0–100 %, gravar 0–1), `h:blend` (select com `BLEND_MODES`), `h:clip` (`checkField` "Recortar na camada de baixo"), `h:light` (`choiceField`: Sempre / Só luz normal / Só luz UV) | |
| text | `h:text.content` (`<textarea>` com 8 linhas), `h:text.font.family` (select: fontes do sistema `Georgia`, `Times New Roman`, `Courier New`, `Arial`, `Special Elite` se existir, mais as da biblioteca depois), `h:text.size`, `h:text.color`, `h:text.align` (choice: ⟸ ≡ ⟹ ☰), `h:text.valign`, `h:text.lineHeight`, `h:text.letterSpacing`, `h:text.box` (choice Caixa / Ponto), `h:text.fit` (check "Encolher para caber"), `h:text.ink.style` (choice Limpa / Máquina / À mão / Carimbo), `h:text.ink.wear` (0–100 %), `h:text.ink.seed`, `h:text.font.italic`, `h:text.font.weight` (choice 400 / 700) | |
| image | `h:image.src` (select dos assets de imagem do Tabletop, via `repository.assets()` filtrando `type === 'image'`), `h:image.fit`, `h:image.flipX`, `h:image.flipY`, `h:image.filter.grayscale` … `h:image.filter.blur`, `h:image.filter.invert`, `h:image.tint.color` + `h:image.tint.amount` | |
| shape | `h:shape.type`, `h:shape.fill` (com check "Sem preenchimento"), `h:shape.stroke`, `h:shape.strokeWidth`, `h:shape.radius` | |
| adjust | `h:adjust.grayscale` … `h:adjust.invert` | |

Um único manipulador de `change` no diálogo lê `data-field`, converte o valor (número, booleano, `#rrggbb`), monta o patch com o caminho (`text.ink.wear` → `{ text: { ink: { …ink, wear } } }`) e chama `state.edit(updateLayer(...), { label, coalesce: layerId + field })`. Campos de texto (`input` em `h:text.content` e `h:name`) também editam no `input`, com `coalesce`, para o palco acompanhar a digitação.

## Palco (`src/atelie/stage.js`)

```js
export function createStage(container, { images, fonts })
// → { show(handout, { light }), zoom(factor | 'fit'), get zoom(), destroy() }
```

- Um `<canvas>` dentro de um contêiner com rolagem; fundo xadrez (CSS `conic-gradient`) e sombra na página.
- Renderiza com `renderHandout(canvas, handout, { scale: zoom × devicePixelRatio, loadImage: images.load, loadFont: fonts.load })` e define `canvas.style.width = page.width × zoom` px.
- Agrupe pedidos: no máximo um render por quadro (`requestAnimationFrame`); se chegar um novo pedido durante um render assíncrono, renderize de novo no fim só com o último.
- Zoom: botões − / + (×0,8 / ×1,25), `fit` (cabe no palco), limites 10 %–400 %; Ctrl + roda do mouse sobre o palco também.
- Camada selecionada: um retângulo tracejado em `--tt-accent` desenhado num `<div>` sobreposto (posição e tamanho × zoom, `transform: rotate(...)`), não no canvas. (Os puxadores vêm na etapa 7.)
- Clique no palco seleciona a camada mais alta cuja caixa (girada) contém o ponto; clique fora de tudo limpa a seleção.

## Menu "+" de camadas

Texto (cria `textLayer` com "Escreva aqui", caixa 600 × 200 no centro), Imagem (caixa 600 × 400, `src` vazio), Retângulo, Elipse, Linha, Ajuste de cor (cobrindo a página). A camada nova entra **acima da selecionada** (ou no topo) e fica selecionada.

Botões na linha de cada camada: olho (`visible`), cadeado (`locked`; camada travada não é editada pelo painel nem selecionada pelo clique no palco), nome (clique duplo renomeia), e no fim ↑ ↓ ⧉ (duplicar) 🗑 (excluir). Arrastar uma linha sobre outra também reordena (HTML5 drag and drop).

## Abrir, novo, salvar

- **Salvar** (Ctrl+S dentro do ateliê): `create` na primeira vez e `save` depois, usando `handoutRepository`; em seguida gera a prévia (render com largura 480 px → `canvas.toDataURL('image/webp', .82)`) e `savePreview`. Erro → aviso na barra do ateliê (o `notify` do app, passado em `deps`).
- **Abrir…**: uma lista (no lugar das camadas, com "Voltar") dos documentos salvos com prévia, nome e data; clicar abre. Se houver alterações não salvas, `confirm('Descartar as alterações do documento aberto?')`.
- **Novo**: escolher um `PAGE_PRESETS` numa lista simples; cria com `createHandout`.
- Fechar (× ou Esc) com alterações: o mesmo `confirm`.

## Entrada no app

- `src/ui/icons.js`: acrescente `doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'`.
- `src/ui/shell.js`: `railAction('atelie', 'Ateliê', 'doc')` logo depois de "Abrir".
- `src/app/application.js`: crie o ateliê uma vez (`const atelie = createAtelie(root, { notify, assets: () => assets })`), `case 'atelie': atelie.open(); break;` em `act`, e uma ação na paleta: `action('Ateliê de documentos', 'atelie', 'documento handout carta jornal ficha editor')`. **Nada mais** muda em `application.js`.

## Testes

`tests/atelie-state.test.js`:

1. `edit` torna `dirty` e `canUndo`; `undo` volta o documento anterior (mesma referência) e `redo` reaplica.
2. Duas edições com o mesmo `coalesce` em 300 ms viram um passo; com 700 ms, dois.
3. `undo` depois de adicionar e selecionar uma camada: seleção vira `null`.
4. `limit: 3` com 5 edições: só 3 desfazeres possíveis.
5. `markSaved` zera `dirty`; nova edição liga de novo.

`tests/e2e/atelie.test.js`:

1. Trilho → Ateliê abre o diálogo com uma página A4 e a camada "Papel".
2. "+" → Texto; em Propriedades, escrever "Querida Lia" e tamanho 80 → o pixel no centro da caixa de texto escurece (leia com `canvas.getContext('2d').getImageData` pelo `page.evaluate`).
3. Ctrl+Z volta o tamanho; Ctrl+Z de novo volta o texto inteiro (a digitação foi um passo).
4. Mesclagem "Multiplicação" e opacidade 50 % gravam no documento (`state` exposto em `window.__tabletop.atelie` só com `?diagnostics`).
5. Salvar → fechar → Abrir… mostra o documento com prévia; abrir recupera as camadas.
6. Ocultar a camada (olho) → o texto some do canvas; travar → o painel fica desabilitado.
7. Reordenar com ↑ muda a ordem no documento.

## Pronto quando

- [ ] Testes passam; `npm test` inteiro passa; `tests/e2e/panel-consistency.test.js` e `tests/e2e/shell.test.js` continuam passando.
- [ ] Nenhum texto menor que 11 px; tudo em português; `prefers-reduced-motion` respeitado.

## Não faça

- Nada de puxadores ou arrastar no palco (etapa 7), biblioteca (etapa 9) ou ligação com a cena (etapa 13).
- Não mexa no inspetor do Tabletop nem nos inspecionáveis.
