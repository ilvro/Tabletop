# Ateliê de documentos — leia primeiro

Plano escrito em 24 de outubro de 2026 para ser implementado **uma etapa por vez**. Cada etapa tem o seu próprio arquivo nesta pasta. Quem implementa recebe este arquivo e **um** arquivo de etapa; não leia nem adiante as outras etapas.

## O que é

Um editor de documentos dentro do Tabletop, parecido com um Photoshop pequeno e especializado em *handouts*: cartas, jornais, fichas policiais, telegramas, polaroides, diários. A pessoa:

1. começa de um **modelo** (importado dos PSDs do *Arquivos Confidenciais* ou feito no próprio ateliê) ou de uma folha em branco;
2. troca textos, fontes, imagens, manchas, carimbos, dobras e desgaste, camada por camada;
3. pode esconder um texto que só aparece sob **luz UV**;
4. usa o documento na cena: ele vira a página de um objeto inspecionável (carta na mesa, foto na parede) e pode ser mostrado no projetor.

O objetivo principal é usar **todo o acervo** de documentos que hoje vive em PSDs no HD, sem abrir o Photoshop.

## Por que em etapas pequenas

O acervo tem 78 pacotes de documentos, mais de 2 500 imagens soltas e PSDs de até 340 MB, com camadas de ajuste, modos de mesclagem, máscaras e objetos inteligentes aninhados. Nada disso precisa existir de uma vez. Cada etapa entrega algo que funciona e tem teste; a seguinte só começa com a anterior pronta.

## Ordem das etapas

| # | Arquivo | Entrega | Depende de |
|---|---|---|---|
| 1 | `etapa-01-preparacao.md` | Pasta privada da biblioteca, dependências, esqueleto | — |
| 2 | `etapa-02-modelo-de-dados.md` | O formato de um documento (`src/domain/handouts.js`) e a validação | 1 |
| 3 | `etapa-03-renderizador.md` | Desenhar um documento num canvas: imagens, formas, mesclagem, recorte | 2 |
| 4 | `etapa-04-texto.md` | Texto: caixa, quebra de linha, alinhamento, fontes carregadas | 3 |
| 5 | `etapa-05-armazenamento.md` | Salvar documentos e ler a biblioteca pelo servidor | 2 |
| 6 | `etapa-06-atelie-janela.md` | A janela do ateliê: palco, zoom, lista de camadas, propriedades, desfazer | 3, 4, 5 |
| 7 | `etapa-07-atelie-manipulacao.md` | Mover, redimensionar e girar no palco; editar texto no lugar | 6 |
| 8 | `etapa-08-importar-elementos.md` | Script que importa as imagens soltas, símbolos e fontes do HD | 1, 5 |
| 9 | `etapa-09-biblioteca-no-atelie.md` | Navegar e usar a biblioteca dentro do ateliê; modo "Preencher" | 6, 8 |
| 10 | `etapa-10-psd-leitura.md` | Ler a estrutura dos PSDs e gerar um relatório (sem exportar nada) | 1 |
| 11 | `etapa-11-psd-compositor.md` | Compor as camadas de um PSD em Node: mesclagem, opacidade, recorte, máscara, ajustes | 10 |
| 12 | `etapa-12-psd-modelos.md` | Transformar um PSD num modelo editável e validar contra o original | 11, 4 |
| 13 | `etapa-13-usar-na-cena.md` | O documento vira página de um inspecionável; projetor | 6 |
| 14 | `etapa-14-luz-uv.md` | Camadas UV e a luz UV na inspeção e no projetor | 13 |
| 15 | `etapa-15-efeitos-procedurais.md` | Amassado, dobras, manchas, queimado, rasgado sem precisar do acervo | 3 |
| 16 | `etapa-16-exportar-e-imprimir.md` | Exportar PNG e folha de impressão | 3 |
| 17 | `etapa-17-tutorial-e-docs.md` | Lição do ateliê, documentação de uso | todas |

A ordem é a recomendada. As etapas 8, 10 e 15 podem ser feitas a qualquer momento depois das suas dependências.

## Como entregar uma etapa a quem implementa

Mande uma etapa por conversa (ou por vez), com esta mensagem, trocando o número:

> Você vai implementar a **etapa N** do Ateliê de documentos do Tabletop (`/home/ilvro/Documents/Projects/Tabletop`). Leia, nesta ordem: `AGENTS.md`, `docs/atelie-documentos/00-LEIA-PRIMEIRO.md` e `docs/atelie-documentos/etapa-NN-….md`. Faça **só** o que essa etapa pede, na ordem em que ela pede, e leia só os arquivos de código que ela manda ler. Quando todos os itens de "Pronto quando" estiverem verdadeiros, pare e me mostre: o que mudou (arquivos), a saída dos testes, e o que ficou pendente. Não comece a próxima etapa.

Ao receber a resposta, confira o "Pronto quando" você mesmo (rode os testes) antes de mandar a etapa seguinte.

## Regras que valem para todas as etapas

1. **Antes de começar**, leia `AGENTS.md`, este arquivo e o arquivo da etapa. Leia só os arquivos de código que a etapa manda ler.
2. **Faça só o que a etapa pede.** Se achar que falta algo, anote em "Pendências" no `progress.md`; não implemente.
3. **Nunca** coloque arquivos do *Arquivos Confidenciais* (PSDs, imagens, fontes) no git, em `public/`, em `dist/` ou em `dist-pages/`. É um produto pago, para uso pessoal. Tudo o que vem dele vai para a pasta privada da biblioteca (etapa 1), que está no `.gitignore`.
4. **Não mude** o formato das cenas (`src/domain/documents.js`, `src/domain/validation.js`) nem os comandos de `src/state/commands.js`, **exceto** na etapa 13, que diz exatamente o que mudar.
5. **Estilo**: siga o arquivo vizinho. Comentários em inglês, curtos, explicando o porquê; textos de interface em português do Brasil. Funções puras em módulos próprios, cobertas por `tests/*.test.js` (`node --test`). Sem framework, sem biblioteca de componentes, sem CDN.
6. **Dependências novas** só as que a etapa 1 lista, e só como `devDependencies` usadas pelos scripts de importação. Nada entra no bundle do navegador.
7. **Interface**: use os tokens e primitivas de [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) (`--tt-*`, `.tt-tag`, `.tt-display`, botões e campos de `src/ui/controls.js`). Nenhuma fonte menor que 11 px (há teste). Toda animação respeita `prefers-reduced-motion`.
8. **Ao terminar a etapa**:
   - `npm test` sem falhas;
   - os testes E2E que a etapa lista: `npm run build && node --test --test-concurrency=1 tests/e2e/<arquivo>.test.js`;
   - marque a etapa como feita na tabela "Andamento" no fim deste arquivo, com a data e uma linha do que foi feito;
   - acrescente uma seção curta no `progress.md` (feito, validação, pendências reais);
   - **não faça commit** sem o usuário pedir. Quando pedir, um commit por etapa, só com os arquivos da etapa.
9. Se um teste que já existia falhar, verifique se ele falha também sem as suas mudanças (`git stash`, rode, `git stash pop`) antes de mexer nele. Só altere teste antigo quando a própria etapa mandar.

## Vocabulário

| Termo | Significado |
|---|---|
| **documento** (no código: *handout*) | Uma peça editável: uma página com camadas. Formato na etapa 2. |
| **camada** | Uma imagem, um texto, uma forma, um ajuste de cor ou um efeito, empilhados de baixo para cima. |
| **modelo** | Um documento pronto para ser copiado, com campos marcados para preencher. |
| **elemento** | Uma imagem solta da biblioteca: papel, mancha, sangue, fita, prendedor, símbolo, carimbo, moldura. |
| **biblioteca** | Os modelos, elementos e fontes importados, na pasta privada. |
| **ateliê** | A janela do editor. |
| **assar** (*bake*) | Renderizar o documento numa imagem PNG para a cena e o projetor. |
| **UV** | Camadas que só aparecem sob luz ultravioleta. |

## Referências

- Acervo: `/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais` (link para `/media/hd/Arquivos Confidenciais`, num HD; leitura lenta). Pastas: `Documentos/Bundle N - …` (PSDs, `Prévias`, `Fontes`), `Assets/<ano>/<mês>/<categoria>` (PNG/JPG soltos), `Símbolos/<ano>/<mês>`, `EXTRAS`, `EXTRAS (2)`.
- Documentos que o usuário já fez (PSD, e PNG/PDF em `PDFs | Imagens`): `/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Campanhas/Vaesen/Documentos/`.
- O que o Tabletop já faz com documentos: [`docs/DOCUMENTOS_INTERATIVOS.md`](../DOCUMENTOS_INTERATIVOS.md) (inspecionáveis, papéis procedurais, projetor).

## O que a análise dos PSDs mostrou (24/10/2026)

Medido com `ag-psd` em três arquivos (um jornal, um relatório policial com UV, um modelo de polaroide):

- Folhas A4 a 300 ppp (2480 × 3508); recortes menores (1148 × 627).
- **Texto editável fica dentro de objetos inteligentes**: o PSD tem uma camada `SMART "Textos"` cujo conteúdo é um `.psb` embutido (`psd.linkedFiles[i].data`); dentro dele estão as camadas `TEXT` com fonte (`OldNewspaperTypes`, `KingthingsTrypewriter2`, `F25Executive`, `Moinho`, `Calibri`), tamanho, cor, caixa (`shapeType: 'box' | 'point'`) e o texto.
- Mesclagens usadas: `multiply`, `overlay`, `screen`, `soft light`, `hard light`, `linear burn`, `lighter color`, `pass through` (grupos).
- Camadas de ajuste: `black & white`, `hue/saturation`, `levels`, `curves`, `color balance`, quase sempre como **máscara de recorte** (`clipping`) de uma camada.
- Variações em grupos irmãos, um visível e outro oculto (`"Com Rasgo"` / `"Sem Rasgo"`).
- UV num grupo próprio (`"Efeito de UV"`), com texto roxo em `multiply` e efeitos de camada.
- Efeitos de camada (`dropShadow`, `outerGlow`, `stroke`…) aparecem, mas não são essenciais para o visual.
- **Todo PSD traz a imagem composta** (`psd.imageData`, lida em 0,1 a 0,5 s, até ~480 MB de memória). Ela serve de prévia e de gabarito para validar a importação.
- Para ler pixels em Node, o `ag-psd` exige `initializeCanvas(createCanvas, createImageData)`; um *stub* que só cria `ImageData` basta (ver etapa 10).

## Andamento

| Etapa | Situação | Data | Nota |
|---|---|---|---|
| 1 | pendente | | |
| 2 | pendente | | |
| 3 | pendente | | |
| 4 | pendente | | |
| 5 | pendente | | |
| 6 | pendente | | |
| 7 | pendente | | |
| 8 | pendente | | |
| 9 | pendente | | |
| 10 | pendente | | |
| 11 | pendente | | |
| 12 | pendente | | |
| 13 | pendente | | |
| 14 | pendente | | |
| 15 | pendente | | |
| 16 | pendente | | |
| 17 | pendente | | |
