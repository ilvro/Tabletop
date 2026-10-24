# Etapa 14 — Luz UV

Leia antes: `00-LEIA-PRIMEIRO.md`, `src/domain/handouts.js`, `src/render/handout-render.js`, `src/atelie/atelie.js`, `src/atelie/bake.js`, `src/render/inspection.js`, `src/ui/inspection-overlay.js`, e em `src/app/application.js` e `src/app/presentation-window.js` as mensagens `inspect` (procure `type === 'inspect'`).

## Objetivo

Um documento pode ter um texto ou marca que só aparece sob luz ultravioleta (como os pacotes "com Luz UV" do *Arquivos Confidenciais*). No ateliê, a pessoa vê e edita as duas versões; na inspeção, o mestre liga a luz UV e a página troca, também no projetor.

## Formato

Em `src/domain/handouts.js`, a página ganha um campo opcional:

```js
page: { width, height, background, uv: { tint: '#2b1d52', strength: .65 } }
// Como a página "escurece" sob UV, antes das camadas UV: tudo o que já foi desenhado é multiplicado pela cor `tint` com força `strength` (0–1).
// Ausente = { tint: '#2b1d52', strength: .65 }. Os modelos importados de pacotes UV (que já trazem o próprio visual UV) usam strength: 0.
```

Valide (`#rrggbb`, 0–1) e acrescente o teste. A etapa 12 passa a gravar `strength: 0` nos modelos com camadas `light: 'uv'` (mude o importador e o teste dela).

## Renderização sob UV

Em `renderHandout(…, { light: 'uv' })`:

1. Desenhe as camadas `both` (e não as `normal`), em ordem, **exceto** as `uv`.
2. Aplique o escurecimento: `multiply` com `tint` e `globalAlpha = strength` sobre a página inteira.
3. Desenhe as camadas `uv` na ordem do documento, cada uma com seu modo e opacidade.

(Isso muda a regra 2 da etapa 3: camadas `uv` passam a ser desenhadas depois, mesmo que estejam no meio da lista. Ajuste e teste.)

## No ateliê

- Botão **Luz UV** no cabeçalho (ícone de lâmpada, `aria-pressed`), tecla **U** com o foco no palco: o palco renderiza com `light: 'uv'` e a moldura do palco fica roxa (`--tt-uv: #7a3cff` em `src/ui/atelie.css`).
- Com a luz UV ligada, camadas novas entram com `light: 'uv'`; desligada, com `both`.
- Na lista de camadas, as camadas `uv` têm um selo "UV" roxo; as `normal`, um selo "sem UV".
- Nas Propriedades da página (sem camada selecionada): **Escurecer sob UV** (cor e força).

## Na inspeção

- Se o lado que está à frente tem `uvImageRef`, a barra da inspeção mostra o botão **Luz UV** (e a tecla **U** funciona).
- Ligada: a textura da página troca para o assado UV (peça ao `createPageRuntime` o lado com `imageRef` = `uvImageRef`); a cena de fundo, já desfocada, ganha uma vinheta roxa (um `div` sobre o canvas com `radial-gradient` de `--tt-uv`, opacidade .35, só na tela onde a inspeção está).
- O estado `uv: boolean` entra no estado da inspeção que já é enviado ao projetor (mensagem `inspect`); o projetor faz o mesmo: troca a textura e mostra a vinheta. Pista secreta não revelada não mostra UV no projetor (a página já é branca).
- Ao trocar de página ou de lado, a luz UV desliga.

## Testes

`tests/handouts.test.js` (acrescente): `page.uv` válido e inválido.

`tests/e2e/handout-render.test.js` (acrescente): documento com um retângulo preto `both` e um texto `uv` branco: com `light: 'normal'` o texto não aparece; com `'uv'` a página escurece (pixel do fundo mais roxo e mais escuro que o original) e o texto aparece claro.

`tests/e2e/atelie-scene.test.js` (acrescente): documento com camada UV usado na cena → `uvImageRef` preenchido; na inspeção, o botão Luz UV aparece; U troca a imagem da leitura; com o projetor aberto e a pista revelada, o projetor recebe `uv: true` e mostra o assado UV.

## Pronto quando

- [ ] Testes passam; `npm test` passa; `tests/e2e/inspection.test.js` continua passando.
- [ ] Um modelo do `Bundle 59` (com a etapa 12 feita) mostra o texto escondido ao ligar a luz UV na inspeção.

## Não faça

- Lanterna UV de personagem iluminando documentos na mesa: fica como pendência (precisa de luz com máscara no 3D).
