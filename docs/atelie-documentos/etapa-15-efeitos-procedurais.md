# Etapa 15 — Efeitos procedurais

Leia antes: `00-LEIA-PRIMEIRO.md`, `src/domain/handouts.js` (camada `effect`), `src/render/handout-render.js`, `src/render/page-textures.js` (`drawPaper`: grão, manchas de café, bordas escurecidas e dobras já existem para os papéis atuais; reaproveite as ideias), `src/atelie/layers-panel.js` (menu "+").

## Objetivo

Dar ao ateliê os acabamentos de papel sem depender do acervo pago, gerados por código e reproduzíveis por semente: amassado, dobras, manchas, queimado, rasgado, umidade, desbotado, sangue e grão. Funciona também na versão do GitHub Pages (sem biblioteca).

## Como funciona

Uma camada `effect` desenha, na caixa dela, uma imagem gerada por `src/render/handout-effects.js` a partir de `{ type, seed, amount, params }`. Ela se comporta como uma camada `image` (posição, rotação, opacidade, mesclagem, recorte), e o gerador escolhe a mesclagem inicial adequada (abaixo). Determinística: mesma semente, mesmos pixels; nunca `Math.random`.

```js
/** Draws an effect into a canvas of the given size (px of the render). */
export function drawEffect(ctx, width, height, { type, seed, amount, params }, scale)
/** For the effects that cut the paper (burn, tear): the shape that remains, white = keep, transparent = gone. */
export function drawCutMask(ctx, width, height, { type, seed, amount, params }, scale)
export const EFFECTS = [
  // [type, nome, mesclagem inicial, parâmetros com padrão]
  ['crumple', 'Amassado', 'soft-light', { creases: 18 }],
  ['fold', 'Dobras', 'multiply', { horizontal: 2, vertical: 1 }],
  ['stain', 'Manchas de café', 'multiply', { count: 5, color: '#7a4a1e' }],
  ['burn', 'Bordas queimadas', 'normal', { depth: .08 }],
  ['tear', 'Borda rasgada', 'normal', { side: 'bottom', depth: .04 }],
  ['damp', 'Umidade', 'multiply', { color: '#8a7a5a' }],
  ['fade', 'Desbotado', 'screen', { color: '#efe6cf' }],
  ['blood', 'Sangue', 'multiply', { drops: 12, smear: true, color: '#6e0b0b' }],
  ['grain', 'Grão', 'overlay', { size: 1.5 }],
];
```

Desenho de cada um (todos com `amount` 0–1 controlando a intensidade e um gerador pseudoaleatório pela `seed`):

| Efeito | Como desenhar |
|---|---|
| `crumple` | fundo cinza 50 %; `creases` vincos: polilinhas quebradas (4–7 segmentos) com um lado claro e outro escuro (duas linhas paralelas de 1–3 px, `#fff` e `#000`, alfa ∝ amount) e um leve gradiente de sombreamento entre vincos; desfoque 1 px |
| `fold` | fundo branco; linhas de dobra retas (horizontais/verticais igualmente espaçadas): gradiente estreito escuro de um lado e claro do outro (como em `drawPaper` do papel comum) |
| `stain` | anéis de café: gradiente radial mais escuro na borda, como em `drawPaper` do papel envelhecido, mais uma ou duas manchas cheias irregulares (círculo deformado por ruído) |
| `burn` | **corta o papel** (abaixo) com uma borda irregular (ruído ao longo do perímetro, profundidade `depth`); depois desenha a parte chamuscada: preto no limite, marrom `#5a2a0a` para dentro, em gradiente |
| `tear` | **corta o papel** no lado escolhido com uma borda serrilhada irregular; depois desenha a fibra branca do papel ao longo do corte (linha clara fina, 1–2 px) |
| `damp` | manchas grandes e suaves de bordas irregulares, mais escuras na borda (marca d'água seca) |
| `fade` | gradiente radial do centro para as bordas na cor `color`, para clarear e "lavar" a tinta |
| `blood` | gotas (círculos com cauda), respingos (muitas gotas pequenas em leque) e, com `smear`, um arrasto (traço largo com bordas irregulares e alfa variável) |
| `grain` | ruído de valor por pixel (blocos de `size` px), cinza em torno de 50 % |

### Efeitos que cortam o papel

Uma camada não apaga as de baixo, então `burn` e `tear` têm tratamento especial no `renderHandout`: antes de desenhar a camada, a página composta até ali passa por `destination-in` com `drawCutMask` (só fica o que a máscara mantém, já na posição, rotação e tamanho da caixa do efeito); depois o efeito é desenhado normalmente. Com `amount: 0` a máscara mantém tudo. Teste esse caso também.

## No ateliê

- Menu "+" → **Efeito** → lista com nome e uma miniatura gerada (64 px) de cada efeito.
- Novo efeito cobre a página, com a mesclagem inicial da tabela, acima da camada selecionada.
- Propriedades: **Intensidade** (`amount`, 0–100 %), **Variação** (`seed`, com botão "↻ outra" que soma 1), e os parâmetros de cada tipo (número, cor, check ou escolha).

## Testes

`tests/handout-effects.test.js` (Node): `EFFECTS` tem os 9 tipos; os padrões passam em `validateHandout` como camada `effect`.

`tests/e2e/handout-render.test.js` (acrescente):

1. Cada efeito com `seed: 7`, renderizado duas vezes → os mesmos pixels em 20 pontos.
2. `seed: 7` e `seed: 8` de `blood` → pixels diferentes.
3. `amount: 0` em `multiply` não muda a página (todos os pontos iguais à página sem o efeito, ± 2).
4. `fold` com 1 dobra horizontal: o pixel na linha da dobra é mais escuro que a 100 px dela.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Num documento A4 com texto à máquina, os efeitos "Amassado", "Dobras", "Manchas de café" e "Bordas queimadas" juntos deixam a folha com cara de documento antigo (capture uma imagem e coloque em `docs/references/atelie/efeitos.png`).
