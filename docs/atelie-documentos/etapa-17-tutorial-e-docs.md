# Etapa 17 — Tutorial e documentação

Leia antes: `00-LEIA-PRIMEIRO.md` (inteiro, inclusive a tabela "Andamento"), `docs/PLANO_TUTORIAIS.md` (seções "Três formatos" e as regras de qualidade), `src/tutorial/lessons.js` (as lições `clues` e `tip-terrain`, como exemplo), `src/tutorial/conditions.js`, `docs/DOCUMENTOS_INTERATIVOS.md`.

## Objetivo

Ensinar o ateliê dentro do próprio Tabletop e deixar a documentação de uso e de manutenção completa.

## Lição "Uma carta para a mesa" (`kind: 'lesson'`, pasta `light`, `task: 'clues'`)

Resultado desenhado antes (regra dos tutoriais): uma carta envelhecida, à máquina, com uma mancha de café, uma dobra e uma assinatura à mão, colocada na mesa de investigação da Casa de bairro e lida na inspeção. Com o resultado pronto, faça uma captura e compare antes de escrever os passos.

Passos (cada um uma ação, condição que confere tudo o que o passo pede):

1. Abrir o ateliê pelo trilho (`atelieOpen`).
2. Novo documento A4 (`handoutPage`, 1240 × 1754).
3. Efeito **Manchas de café** (`handoutHasEffect`, `stain`).
4. Efeito **Dobras** (`handoutHasEffect`, `fold`).
5. Texto: escrever o corpo da carta (`handoutTextIncludes`, uma frase dada no passo).
6. Tinta **Máquina** com desgaste 60 % (`handoutLayerHas`, `text.ink.style` / `text.ink.wear`).
7. Segundo texto: a assinatura com tinta **À mão** (`handoutLayerHas`).
8. Mover a assinatura até o ponto marcado (no palco do ateliê, `handoutLayerNear`).
9. Salvar (`handoutSaved`).
10. **Usar na cena** sem nada selecionado, com a câmera olhando a mesa de investigação (`designUsed`: algum inspecionável da cena tem um lado com `design`).
11. Inspecionar (E) (`inspecting`).
12. Ler (`read`) e fechar.

Condições novas em `src/tutorial/conditions.js`, lendo um campo `atelie` que `tutorialState()` passa a expor (`{ open, handout, saved }` vindos do estado do ateliê): `atelieOpen`, `handoutPage(width, height)`, `handoutHasEffect(type)`, `handoutTextIncludes(text)`, `handoutLayerHas(path, value)` (alguma camada), `handoutLayerNear(name, [x, y], tolerance = 40)`, `handoutSaved`, `designUsed`. Teste cada uma em `tests/tutorials.test.js`, como as existentes.

O tutor aponta para controles **dentro** do diálogo do ateliê. Atenção: o ateliê é aberto com `showModal()`, e um diálogo modal fica na *top layer* do navegador, **acima de qualquer `z-index`**: a camada do tutor (`.tutor`, filha de `root`) ficaria escondida atrás dele e os cliques no cartão não chegariam. Solução: em `src/tutorial/tutor.js`, a cada quadro, se existir um `dialog[open]` modal (`document.querySelector('dialog:modal')`), mova a camada do tutor para dentro dele (`dialog.append(layer)`); quando não houver, devolva para `root`. Como a camada usa `position: fixed`, ela continua cobrindo a tela inteira. Teste no E2E da lição que o anel e o cartão aparecem sobre o ateliê e que "Continuar" funciona.

## Dica "Preencher um modelo" (`kind: 'tip'`, pasta `tips`, sem `task`)

Só funciona com a biblioteca importada: `needs` não cobre isso, então o primeiro passo explica e oferece **Pular** quando `library().available` for falso (condição `libraryAvailable`). Passos: abrir o ateliê → aba Biblioteca → Modelos → escolher um → Usar este modelo → aba Preencher → mudar um campo → Salvar.

O E2E dos tutoriais roda sem biblioteca: para esta dica, crie no teste a biblioteca temporária da etapa 9 e passe `handoutsDir` (ou marque a dica com `requires: 'library'` e faça o E2E criar a biblioteca para lições com esse campo).

## Documentação

1. `docs/ATELIE_DOCUMENTOS.md` (uso): o que é, abrir, camadas e mesclagem (com uma frase sobre cada modo útil para papel: multiplicação para manchas e texto sobre papel, sobrepor e luz suave para amassados, divisão de tela para luz), texto e tintas, biblioteca e Preencher, efeitos, luz UV, usar na cena, exportar e imprimir, atalhos, limites.
2. `docs/atelie-documentos/MANUTENCAO.md`: como reimportar o acervo (comandos das etapas 8 e 12, tempos e tamanhos medidos), onde fica cada arquivo, como ler os relatórios, o que fazer com um modelo marcado `revisar`, e o aviso de que o acervo é privado.
3. `docs/DOCUMENTOS_INTERATIVOS.md`: link para os dois.
4. Atualize `progress.md`, `PROGRESSO.md` e `docs/PROGRESSO.md` (o `AGENTS.md` pede).

## Pronto quando

- [ ] A lição passa no E2E de tutoriais; `npm test` passa.
- [ ] A tabela "Andamento" de `00-LEIA-PRIMEIRO.md` está completa.
