# Plano de reformulação da interface

Elaborado em 10 de outubro de 2026, a partir do relato de uso (dificuldade para encontrar os controles de padrão das texturas; interface "genérica e confusa" desde o início) e de capturas da interface atual (`node scripts/capture-ui.js <pasta>`; três delas em [references/ui/](references/ui/)). Não é uma reescrita: a interface é HTML gerado por funções e reconciliado no lugar, os campos são identificados por `data-field`/`data-action` e quase todos os números passam por uma única função (`numberField`). O plano troca a organização e os controles, mantendo comandos, histórico, documento e câmera publicada como estão.

## O que as capturas mostram

1. **Tudo é uma coluna longa de caixas de texto.** Cada número, de 0–1 a metros, é um campo largo de digitação, um por linha. No piso com azulejo, a largura do rejunte só aparece depois de rolar por nome, posição, cinco seções recolhidas, três botões, textura, tamanho, cor, modo de cor e brilho. Não há controle deslizante, incremento nem prévia.
2. **Os controles mais procurados estão em dois níveis de recolhimento.** "Trama", "assentamento" e "acabamento" ficam dentro de *Material e textura → Personalizar cor e padrão*, abaixo dos controles de cor, e variações dentro de mais um recolhível. O título "Personalizar cor e padrão" não diz que ali se escolhe o desenho do material.
3. **A textura é escolhida por nome numa lista**, sem amostra. São dezenove nomes.
4. **O painel esquerdo acumula três funções.** *Construir* mistura lista de tarefas e formulários; *Assets* é uma aba que abre uma janela; *Cena* reúne atmosfera, câmera e, só no fim da rolagem, a lista de elementos da cena, que é a navegação principal de quem edita.
5. **A lista de elementos é plana e longa** (171 linhas na Casa), sem busca nem filtro, com nomes truncados e a etiqueta "Térreo" repetida em todas as linhas.
6. **As ferramentas não têm nome.** A barra sobre a cena tem oito ícones sem rótulo; os atalhos aparecem em dois lugares diferentes (canto inferior direito da cena e rodapé).
7. **Texto pequeno e pouco contraste.** A maior parte dos rótulos usa 8 a 12 px (em `styles.css`, 81 das 98 declarações de tamanho de fonte), em cinza sobre cinza-escuro.
8. **Não há como procurar.** Quem não sabe onde fica "rejunte" precisa abrir seções até achar.

## Princípios

- **O que se mexe com frequência fica visível; o resto, a um clique.** Nada essencial a mais de um nível de recolhimento.
- **Mostrar em vez de nomear.** Amostras para texturas, padrões e acabamentos.
- **Controle adequado ao valor.** Deslizante para faixas, segmentos para poucas opções, campo para medidas exatas.
- **Achar pelo nome.** Qualquer controle pode ser encontrado digitando.
- **Mesmos dados.** Nenhuma etapa muda o formato dos documentos nem os identificadores usados pelos testes.

## Etapas

Cada etapa é entregável sozinha e termina com capturas antes/depois e os E2E de interface.

### 1. Conjunto de controles

Substituir o campo numérico único por três formas, escolhidas pelos limites que cada chamada já informa:

- **Faixa** (mínimo e máximo definidos, como 0–1, 0–100 %, 0–360°): deslizante com o valor ao lado, editável por digitação.
- **Medida** (metros, quantidades): campo compacto com unidade como sufixo e incremento por setas ou arraste.
- **Trio de eixos**: X/Y/Z na mesma linha, como já ocorre na posição, para tamanho e centro.

Listas de até cinco opções viram **segmentos**; listas longas continuam sendo listas. Rótulo à esquerda e controle à direita numa linha, o que reduz a altura dos painéis a cerca da metade. Como os números passam por `numberField`, a troca é central.

### 2. Material com amostras

- **Grade de amostras** no lugar da lista de texturas, geradas das próprias texturas procedurais, com o nome embaixo.
- Ao escolher uma textura, o **desenho dela** (trama, assentamento, acabamento, padrão) aparece logo abaixo, aberto, com os valores de cada opção como segmentos ou miniaturas; depois vêm tamanho e relevo; cor e ajustes finos por último.
- "Personalizar cor e padrão" deixa de existir como recolhível: vira dois grupos visíveis, **Desenho** e **Cor**; só "Ajustes finos" (contraste, saturação, densidade, seed) fica recolhido.
- Desgaste ganha o mesmo tratamento: tipo e local por amostras.

### 3. Propriedades em abas

O painel de propriedades passa a ter abas por assunto, com ícone e nome: **Posição**, **Aparência**, **Luz**, **Organização**. A aba aberta é lembrada por tipo de objeto. O cabeçalho mostra nome e tipo e traz as ações comuns (duplicar, excluir, enquadrar). Acaba a coluna única com sete seções antes do material.

### 4. Painel esquerdo: três lugares claros

- **Construir**: só tarefas, cada uma abrindo seu formulário curto.
- **Elementos**: a lista de elementos como aba própria, com busca, filtro por tipo e pasta, pastas recolhidas por padrão e nomes completos em duas linhas quando preciso.
- **Ambiente**: atmosfera, clima, câmeras e apresentação.

*Assets* sai das abas e vira botão no cabeçalho, ao lado de *Abrir*, porque abre uma janela.

### 5. Encontrar e aprender

- **Busca de comandos** (Ctrl+K e um campo no cabeçalho): digitar "rejunte", "neve" ou "sombra" leva ao controle, abrindo a aba e destacando o campo. O índice vem dos rótulos já existentes.
- **Ferramentas com nome**: rótulo curto sob os ícones ou ao passar o mouse, com o atalho; uma única faixa de atalhos.
- **Ajuda no lugar**: um "?" por grupo com uma frase e, onde ajudar, uma miniatura do efeito.

### 6. Barra de contexto na cena

Ao selecionar, uma barra pequena junto ao objeto com as ações mais usadas (mover, girar, material, luz, duplicar, excluir), para não depender do painel lateral nas tarefas rápidas.

### 7. Identidade visual

Escala tipográfica com mínimo de 12 px para rótulos e 13–14 px para valores, contraste revisto, espaçamentos e raios em poucos valores fixos, estados de foco e seleção consistentes, textos de apoio objetivos no lugar de frases de efeito. Tom próprio do projeto (investigação, paranormal), sem copiar interface de terceiros.

### 8. Primeira vez

Tela inicial com três caminhos (abrir exemplo, sala nova, continuar), e um percurso curto e dispensável que mostra onde ficam Construir, Elementos, Propriedades e Apresentar.

## Ordem e dependências

1 → 2 atacam diretamente a queixa das texturas e podem ser entregues juntas. 3 e 4 reorganizam os painéis e dependem de 1. 5 depende de 3 e 4 (a busca precisa saber onde cada controle mora). 6, 7 e 8 são independentes entre si e vêm por último.

## Como validar

- **Tarefas de referência**, medidas em cliques e rolagem antes e depois: trocar o piso para azulejo hexagonal azul com rejunte largo; achar e selecionar "Sofá de sala"; acender uma luminária; mudar a hora do dia; aplicar ferrugem nas bordas de um objeto.
- **Capturas** das mesmas telas com `scripts/capture-ui.js`.
- **E2E de interface** existentes, que usam `data-field` e `data-action`; onde a estrutura mudar (abas no lugar de recolhíveis), o auxiliar `reveal` dos testes passa a abrir a aba.
- **Tela estreita**: os painéis continuam recolhíveis e utilizáveis por toque.

## Riscos

- Os testes de interface abrem recolhíveis para alcançar campos; a troca por abas exige atualizar esse auxiliar em um lugar.
- Deslizantes disparam muitas edições: cada arraste deve virar um único passo de desfazer, como já acontece nos pincéis.
- A busca de comandos precisa ser mantida junto com os rótulos; gerar o índice dos próprios painéis evita que fique desatualizada.
