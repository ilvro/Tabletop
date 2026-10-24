# Etapa 13 — Usar o documento na cena

Leia antes: `00-LEIA-PRIMEIRO.md`, `docs/DOCUMENTOS_INTERATIVOS.md` (inteiro), `src/domain/inspectables.js`, `src/render/page-textures.js` (`drawPageSide`, `createPageRuntime`), `src/ui/inspectable-panel.js`, `src/atelie/atelie.js`, `src/data/api.js` (`importAsset`), e em `src/app/application.js` procure `inspectableFieldPatch` (como o painel grava mudanças no inspecionável).

## Objetivo

O documento do ateliê vira a página de um objeto inspecionável (carta, foto, ficha), aparece na mesa, na inspeção e no projetor, e acompanha as edições feitas depois no ateliê.

## Decisão: assar em imagem

A cena e o projetor **não** desenham camadas. Ao usar um documento, o ateliê o renderiza num PNG (o *assado*) e o importa como asset de imagem comum. A página do inspecionável aponta para esse asset (o caminho que já funciona para imagens, inclusive o filtro de segredo do projetor) e guarda também **qual documento** a gerou, para poder assar de novo depois.

## Mudança no formato (a única desta etapa)

Em `src/domain/inspectables.js`, um lado de página ganha dois campos opcionais:

```js
side = {
  imageRef,          // como antes; para um documento do ateliê, o assado em luz normal
  text,              // como antes; null para documento do ateliê
  design: null | { id, revision },   // o documento do ateliê que gerou imageRef
  uvImageRef: null | { id, revision },   // o assado sob luz UV (etapa 14); null se o documento não tem camadas UV
}
```

- `validateInspectable`: aceita os dois campos (ausentes = `null`); `design.id` é uuid, `revision` inteiro ≥ 0.
- `pageImages` inclui `uvImageRef`.
- `sideKey` inclui `design` (para a textura ser refeita quando o assado muda).
- Um papel novo em `PAPERS`: `['design', 'Documento do ateliê']`. Com ele, `drawPageSide` desenha só a imagem, cobrindo a página (`cover`), **sem** grão, manchas, dobras nem texto. Ao escolher um documento para a página 1, o papel muda sozinho para `design`.
- `publicInspectable` (filtro do projetor): uma pista secreta não revelada continua virando página em branco; `design` nunca vai ao projetor (só o `imageRef`).

Não mude `src/domain/documents.js`, `validation.js` nem `commands.js`: a mudança passa pelo `entity.update` que o painel já usa.

## Assar (`src/atelie/bake.js`)

```js
/** Renders a handout for the scene and imports it as image assets. Long side 2048 px. */
export async function bakeHandout(handout, { images, fonts, importAsset })
// → { imageRef, uvImageRef }  // uvImageRef null se nenhuma camada visível tem light 'uv'
// renderHandout(…, { scale: 2048 / max(page.width, page.height), light: 'normal' }) → canvas.toBlob('image/png') → new File([blob], `Documento · ${handout.name}.png`) → importAsset(file) → { id, revision }
// O mesmo com light: 'uv' quando houver camadas UV.
```

## Na interface

### Painel do inspecionável (`src/ui/inspectable-panel.js`)

Em cada lado de cada página, ao lado de "Imagem" e "Texto":

- **Do ateliê…**: abre uma lista (popover simples com as prévias de `handoutRepository.list()`); escolher assa e grava `{ imageRef, uvImageRef, design: { id, revision }, text: null }` naquele lado (e `paper: 'design'` se for a página 1, frente).
- Com `design` preenchido, o lado mostra a prévia, o nome do documento e dois botões: **Editar no ateliê** (abre o ateliê com esse documento) e **Desvincular** (volta a um lado vazio).
- Se o documento salvo tem `revision` maior que a do lado, aparece **Atualizar a partir do ateliê** (assa de novo e grava).

### Ateliê

- Botão **Usar na cena** no cabeçalho (desabilitado com alterações não salvas: "Salve antes de usar"):
  - com um objeto inspecionável selecionado na cena: grava o documento na frente da página 1;
  - com um objeto não inspecionável selecionado: liga `inspectable` (`inspectableDefaults({ kind: 'document', title: handout.name, paper: 'design' })`) e grava na página 1;
  - sem seleção: coloca uma **Folha · A4** (`builtin-document-sheet`) no ponto da mesa que está no centro da tela (use o que o app já usa para colocar um asset; procure `beginAssetPlacement`), já inspecionável com o documento. Para documentos de página larga (largura > altura), use **Recorte · de jornal** (`builtin-document-clipping`).
  - Depois, fecha o ateliê e seleciona o objeto.
- Ao **salvar** um documento que já está em uso na cena aberta (algum lado com o mesmo `design.id`), pergunte por um aviso com botão: "Este documento está em N objetos da cena. **Atualizar na cena**". Atualizar assa uma vez e grava em todos os lados, num único passo de desfazer (um `entity.update` por objeto, agrupados com a ferramenta de agrupar histórico que o app já tiver; se não houver, um passo por objeto e anote como pendência).

## Testes

`tests/inspectables.test.js` (acrescente):

1. Lado com `design` e `uvImageRef` válidos passa; `design: { id: 'x' }` falha.
2. `pageImages` inclui o `uvImageRef`; `sideKey` muda quando `design.revision` muda.
3. `publicInspectable` de pista secreta não revelada não leva `design` nem `uvImageRef`.

`tests/e2e/atelie-scene.test.js`:

4. Criar no ateliê um documento com um retângulo vermelho cobrindo a página, salvar, **Usar na cena** sem seleção → aparece uma Folha · A4 inspecionável; o lado tem `design.id` e um `imageRef` que existe em `/api/tabletop/assets`.
5. Inspecionar (E sobre a folha, ou `inspect-open`) → a leitura (`[data-inspect="read"]`) mostra a imagem (a imagem da `.inspection-sheet` tem pixels vermelhos).
6. Editar no ateliê (pelo painel), trocar a cor para azul, salvar → aviso "Atualizar na cena" → atualizar → o `imageRef` mudou e a página mostra azul.
7. Com o projetor aberto: pista secreta não revelada → o projetor não recebe o asset; **Mostrar aos jogadores** → recebe.

## Pronto quando

- [ ] Testes passam; `npm test` passa; `tests/e2e/inspection.test.js` e o tutorial "Pistas e documentos" continuam passando.
- [ ] `docs/DOCUMENTOS_INTERATIVOS.md` ganhou uma seção curta "Documentos do ateliê".

## Não faça

- Não faça a cena ou o projetor renderizarem camadas. Não ligue a luz UV aqui (etapa 14), só asse o `uvImageRef`.
