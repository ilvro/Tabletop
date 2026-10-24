# Etapa 16 — Exportar e imprimir

Leia antes: `00-LEIA-PRIMEIRO.md`, `src/render/handout-render.js`, `src/atelie/atelie.js`, `src/data/handout-images.js`, `src/data/handout-fonts.js`.

## Objetivo

Levar o documento para fora do Tabletop: um PNG em alta resolução (para Discord, Foundry, celular dos jogadores) e uma folha para imprimir em tamanho real (para entregar o papel na mesa).

## Exportar imagem

Botão **Exportar ▾** no cabeçalho do ateliê, com:

- **PNG · tela** (lado maior 2048 px) e **PNG · impressão** (300 ppp: escala `300 / 150 = 2` sobre o tamanho do documento, ou seja, 2480 × 3508 para A4);
- **Sob luz UV** (só aparece se houver camadas `uv`);
- **Frente e verso lado a lado** não existe: cada documento é um lado (fica como pendência).

Implementação: `renderHandout` num canvas novo com a escala escolhida → `canvas.toBlob('image/png')` → download com `<a download="<nome do documento>.png">` e `URL.createObjectURL` (revogue depois). Antes de exportar em 300 ppp, verifique o limite de área do canvas (16 384 × 16 384 e ~268 milhões de pixels no Chromium): se passar, reduza a escala e avise.

## Imprimir

**Imprimir…** abre uma janela nova (`window.open`) com uma página HTML mínima:

```html
<!doctype html><html><head><meta charset="utf-8"><title>{nome}</title>
<style>@page { size: A4 portrait; margin: 0 } html, body { margin: 0 } img { display: block; width: 210mm; height: 297mm; object-fit: contain }</style>
</head><body><img src="{dataURL do PNG · impressão}"></body></html>
```

- `size`: `A4 portrait` ou `A4 landscape` conforme a proporção; para tamanhos que não são A4 (recorte, telegrama, polaroide), imprima centralizado numa A4 com as medidas reais em milímetros, calculadas por `largura / 150 × 25,4` mm, e linhas de corte finas (`1px dashed #999`) em volta.
- Quando a imagem carregar, `print()`; feche a janela no `afterprint`.

Funções puras em `src/atelie/export.js`, testadas: `exportScale(handout, target)` (`'screen'` | `'print'`), `printLayout(handout)` → `{ orientation, widthMm, heightMm, cropMarks }`, `fitsCanvas(width, height)`.

## Testes

`tests/atelie-export.test.js`: A4 em `print` → escala 2; recorte 1200 × 700 → 203,2 × 118,5 mm (± 0,1) com marcas de corte e orientação paisagem; `fitsCanvas(20000, 100)` falso.

`tests/e2e/atelie.test.js` (acrescente): Exportar → PNG · tela gera um download (`page.waitForEvent('download')`) com nome `<nome>.png` e lado maior 2048 (leia as dimensões do PNG pelo cabeçalho IHDR).

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Um documento A4 impresso pelo navegador (salvar como PDF) sai do tamanho da folha, sem margens brancas extras.
