# Etapa 9 — Biblioteca no ateliê e modo "Preencher"

Leia antes: `00-LEIA-PRIMEIRO.md`, `etapa-05-armazenamento.md` (formato da biblioteca e cliente), `src/atelie/atelie.js`, `src/atelie/layers-panel.js`, `src/atelie/properties-panel.js`, `src/data/handouts-api.js`, `src/data/handout-fonts.js`, `src/domain/handouts.js` (`setField`, `fillFields`, `imageLayer`).

## Objetivo

Usar o acervo importado dentro do ateliê: procurar e pôr elementos na página, aplicar fontes, abrir modelos. E o caminho rápido: abrir um modelo e só **preencher os campos** (nome, data, texto da carta), sem mexer em camada nenhuma.

## Coluna da esquerda: Camadas | Biblioteca

Duas abas no topo da coluna. A aba **Biblioteca** tem:

1. Busca (procura em nome, categoria e tags, sem diferenciar acento e maiúscula; use a mesma normalização de `slug` da etapa 8, copiada para `src/atelie/library-search.js`).
2. Três chips: **Modelos**, **Elementos**, **Fontes** (um ativo por vez; padrão Elementos).
3. Lista de categorias do tipo ativo, com contagem, recolhível (`<details>`); clicar filtra.
4. Grade de prévias (3 colunas): `<img loading="lazy" src="previewURL(id)">`, nome embaixo. 60 por vez, botão "Mostrar mais".
5. Biblioteca indisponível (`available: false`): um texto curto explicando que o acervo é importado pelo terminal (`npm run handouts:elements -- --source "<pasta>"`) e um link para `docs/atelie-documentos/00-LEIA-PRIMEIRO.md`.

### Pôr um elemento na página

- **Clique**: nova camada `image` com `src: { library: id }`, acima da selecionada, centralizada, com a proporção do item e largura `min(item.width, page.width × 0,5)`.
- **Shift + clique**: cobre a página inteira (`fit: 'cover'`), útil para texturas de papel.
- **Arrastar** a prévia para o palco: centralizada no ponto onde soltou.
- Mesclagem inicial pela categoria (função pura `defaultBlend(category)` em `src/atelie/library-search.js`, testada): categorias com `mancha`, `sangue`, `poeira`, `sujeira`, `café`, `textura`, `amassad`, `dobrad`, `desgast`, `queimad`, `rabisco`, `doodle` → `multiply`; `luz`, `brilho` → `screen`; o resto `normal`.
- Nome da camada = nome do item.

### Fontes

- Na aba Fontes, cada item mostra o nome e uma amostra "Querida Lia, não procure por mim." na própria fonte (carregue com `fonts.load` só quando o item entra na tela, por `IntersectionObserver`).
- Clicar com uma camada de texto selecionada aplica: `text.font = { family: item.family, library: item.id, weight: item.weight, italic: item.style === 'italic' }`.
- O select de fonte das Propriedades passa a listar também as fontes da biblioteca (por família; valor `library:<id>`).

### Modelos

- Clicar num modelo mostra uma prévia grande e o botão **Usar este modelo**.
- Usar: se o documento aberto tem alterações, `confirm('Descartar as alterações do documento aberto?')`; depois busca `libraryItem(id)`, e abre uma **cópia**: `structuredClone(item.handout)` com `id` novo, `revision: 0`, `source: { kind: 'template', templateId: id }`, `name` = nome do modelo. Nunca altera o modelo.

## Modo "Preencher"

- Coluna da direita com duas abas: **Propriedades** | **Preencher**. A aba Preencher só aparece se `handout.fields` não estiver vazio, e abre sozinha ao usar um modelo que tenha campos.
- Um campo por item de `fields`, na ordem: rótulo = `label`. Para texto: `<input>` se o texto atual não tiver `\n`, senão `<textarea>`. Para imagem: a miniatura atual e o botão **Trocar imagem**, que abre a escolha entre os assets de imagem do Tabletop (e, com a biblioteca, os elementos). Editar chama `fillFields` com `coalesce: 'fill-' + layerId`.
- Nas Propriedades de uma camada de imagem também existe o check **Campo do Preencher** com **Rótulo**.
- Clicar no rótulo seleciona a camada no palco (contorno), sem trocar de aba.
- Nas Propriedades de uma camada de texto, um check **Campo do Preencher** e, ligado, o campo **Rótulo** (`setField`).

## Testes (`tests/e2e/atelie-library.test.js`)

Monte a biblioteca de teste numa pasta temporária, passando `handoutsDir` para `createApp`: três elementos PNG pequenos gerados no teste (um vermelho opaco categoria `Papéis`, um com transparência categoria `Sangue`, um azul categoria `Fitas`), a fonte mínima da etapa 8 (ou, se for difícil servir uma fonte válida ao navegador, copie `src/ui/fonts/hanken-grotesk.woff2` para a pasta temporária como item `font` com `family: 'Hanken Teste'`) e um modelo com duas camadas e um campo.

1. Aba Biblioteca → Elementos lista os 3; buscar "sang" deixa só o de `Sangue`.
2. Clicar no de `Sangue` cria uma camada `image` com `src.library` certo e `blend: 'multiply'`; o pixel no centro da página fica escuro.
3. Shift + clique no de `Papéis` cria camada 1240 × 1754 com `fit: 'cover'`.
4. Fontes: com um texto selecionado, clicar na fonte muda `text.font.library`.
5. Modelos: Usar este modelo abre uma cópia com outro `id`; a aba Preencher aparece com o rótulo do campo; digitar nela muda o texto no documento; o modelo da biblioteca continua igual (`GET …/library/<id>`).
6. Sem biblioteca (`handoutsDir` vazio): a aba mostra a explicação.

`tests/atelie-library.test.js` (Node): `defaultBlend` e a busca sem acento.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Com a biblioteca real da etapa 8: abrir o ateliê, buscar "sangue", pôr um respingo sobre um texto, e o resultado parece com o Photoshop (multiplicação sobre o papel).

## Não faça

- Não importe nada pelo navegador. Não crie modelos a partir de PSD aqui (etapa 12).
