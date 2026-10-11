# Plano de construção assistida

Objetivo: montar cenas e ambientações completas com pouco esforço, sem tirar a autonomia de quem quer editar tudo à mão. Escrito em 11 de outubro de 2026 a partir da leitura de `src/authoring/`.

## Onde estamos

- **Sala** (`quick-build.js`): um retângulo com piso, quatro paredes, uma porta e uma luz.
- **Mobiliar cômodo** (`furnishing.js`): três receitas (escritório, reunião, depósito) com posições fixas em metros a partir do centro. Usam cinco modelos (mesa, cadeira, armário, luminária, caixa) dos 244 da biblioteca.
- **Ajustes** (`polish.js`): alinhar, distribuir, variar rotação e material.
- **Vegetação, água e montanha**: distribuição por pincel ou área.

O que já funciona bem e deve ser mantido: tudo passa por uma **proposta** com prévia, que só entra na cena ao aceitar; o resultado são objetos comuns; regenerar preserva o que foi editado ou excluído à mão; portas reservam passagem.

O que falta: as receitas não conhecem paredes, cantos nem janelas; não existe casa, delegacia, hospital, igreja, bar; nada coloca objetos pequenos, sujeira, desgaste ou clima; não há como gerar um prédio ou uma cena inteira; a biblioteca nova quase não é usada.

## Princípios

- **Descrever a intenção, revisar o resultado.** Tipo de lugar, tamanho, estado e clima; o sistema propõe, a pessoa aceita, troca ou ajusta.
- **Nada vira caixa-preta.** Tudo o que é gerado é objeto comum, editável, e regenerar nunca desfaz edição manual.
- **Mesma semente, mesmo resultado.** Variações são escolhidas, não sorteadas a cada clique.
- **Dentro do orçamento.** Luzes e objetos gerados respeitam os limites de desempenho já medidos.

## Etapas

### 1. Receitas por regras

Trocar coordenadas fixas por regras de posicionamento: *encostado na parede*, *no canto*, *no centro*, *em volta de* (cadeiras e mesa), *em cima de* (objetos sobre móveis), *na parede* (quadros, prateleiras), *no teto* (luminárias), *de frente para* (sofá e TV). Um solucionador escolhe posições respeitando portas, janelas, folgas de passagem e o formato real do piso, inclusive polígonos. Receitas viram dados, com quantidades por área e densidade. É a base de todas as etapas seguintes.

### 2. Catálogo de cômodos

Cerca de vinte cômodos em temas que a biblioteca já cobre: casa (sala, cozinha, quarto, banheiro, garagem), delegacia (recepção, sala de interrogatório, cela, arquivo), hospital (enfermaria, consultório, necrotério), escritório, biblioteca, bar, laboratório, oficina, depósito, igreja e sala de ritual. Cada um com miniatura e duas ou três variações de arranjo para escolher lado a lado.

### 3. Estado do lugar

Uma segunda escolha, independente do cômodo: **arrumado**, **habitado**, **abandonado**, **cena de crime**, **ritual**. Muda bagunça, móveis tombados, sangue, velas, símbolos, e aplica o desgaste de materiais que já existe (sujeira, ferrugem, bordas gastas). É o que dá cara de Ordem Paranormal com um clique.

### 4. Ambientar

Um passo "Ambientar" sobre qualquer cômodo, gerado ou feito à mão: objetos pequenos sobre mesas e prateleiras, itens de parede, luminárias de verdade com perfil de luz no lugar de pontos de luz soltos, e sugestão de atmosfera (horário, névoa, clima) coerente com o estado.

### 5. Prédio a partir do contorno

Desenhar o contorno e escolher o tipo (casa, delegacia, clínica, galpão): o sistema divide em cômodos com corredor, abre portas e janelas, põe telhado e mobília cada cômodo com as etapas anteriores. Cada cômodo continua regenerável sozinho.

### 6. Terreno e entorno

Lote com muro ou cerca, caminho até a entrada, calçada, vegetação e objetos de rua, usando as ferramentas de paisagem que já existem.

### 7. Cena pronta

Um assistente de quatro perguntas (lugar, tamanho, estado, clima) que encadeia 5, 6, 2–4, atmosfera e enquadramentos de câmera, e entrega uma cena jogável. Depois disso, tudo segue editável pelas ferramentas normais.

### 8. Descrição em texto (opcional)

Escrever "delegacia abandonada à noite, com uma cela arrombada" e converter para os mesmos parâmetros do assistente. Depende de um modelo de linguagem e de chave de API; fica por último e nunca é obrigatório.

## Ordem

1 → 2 dão o maior salto visível e sustentam o resto. 3 e 4 são o que diferencia o resultado de um gerador genérico. 5 e 6 ampliam de cômodo para lugar. 7 só junta o que já existir.

## Como validar

- Mesma semente gera a mesma proposta; nenhuma peça sobreposta ou fora do piso; toda porta alcança o centro do cômodo.
- Regenerar preserva edições e exclusões manuais, como hoje.
- Cena gerada dentro do orçamento de luzes e do tempo de quadro medido em `docs/RENDER_SCALE_PLAN.md`.
- Capturas de cada cômodo e estado para revisão visual.

## Andamento

### Etapas 1 e 2 — entregues (11 de outubro)

**Receitas por regras**

- `src/authoring/room-layout.js` lê o cômodo (`roomFrame`): paredes a partir do contorno real do piso, inclusive polígonos; recuo pela espessura das paredes; vãos de portas e janelas. `candidates` devolve posições em ordem de preferência para cada regra: `wall`, `corner`, `center`, `front`/`behind`, `beside`, `around`, `ring`, `on`, `under`, `grid`, `free`.
- `src/domain/room-recipes.js` guarda as receitas como dados: modelo, regra, densidade mínima, quantidade por densidade, referência a outra peça.
- `src/authoring/furnishing.js` continua dono da proposta, da preservação de edições e exclusões e das luzes; só a escolha de posições mudou. Uma peça não guarda folga da peça a que pertence (cadeira e mesa); objetos sobre móveis usam o móvel como apoio; quadros, espelhos e painéis ficam pendurados na altura; tapetes e círculos não ocupam espaço.
- Móveis altos não cobrem janelas; a passagem das portas fica livre; a parede da porta é a última escolha para as peças principais.
- A mesma semente repete o cômodo; **Ver outra arrumação** troca só a semente e mantém os mesmos objetos.

**Catálogo: 26 cômodos**

Trabalho (escritório, reunião, investigação), casa (sala de estar, cozinha, jantar, quarto, banheiro, garagem), delegacia (recepção, interrogatório, cela, arquivo), saúde e ciência (enfermaria, consultório, necrotério, laboratório), comércio e lazer (biblioteca, bar, sala de aula, mercado), indústria (depósito, oficina, monitoramento), religioso e paranormal (capela, sala de ritual). Usam 113 modelos da biblioteca; antes eram 5.

**Compatibilidade**: os parâmetros salvos são os mesmos (`template`, `density`, `chairs`, `seed`, `lighting`); `recipeVersion` passa a 2 e a versão 1 continua válida. Regenerar um cômodo antigo reposiciona o que não foi editado.

**Ferramentas de revisão**: `node scripts/review-rooms.js <dir> [largura comprimento densidade semente]` desenha a planta de todos os cômodos; `node scripts/capture-rooms.js <dir> <receitas>` renderiza no editor real. Referências em `docs/references/assisted-build/`.

**Testes**: `tests/room-recipes.test.js` percorre os 26 cômodos em três densidades e dois tamanhos (sem sobreposição, porta livre, apoio correto, documento válido, regeneração estável), repetição por semente, janelas e piso em L. `tests/e2e/assisted-rooms.test.js` cobre o painel.

**Diferenças em relação ao plano**

- A escolha é por lista agrupada, sem miniatura; as variações aparecem uma por vez com "Ver outra arrumação", não lado a lado.
- Itens de parede são posicionados na altura, sem vínculo com a parede: não acompanham se a parede for movida. O vínculo fica para a etapa 4.
- Não há folga na frente de móveis (um guarda-roupa pode ficar perto de uma cama), só a passagem das portas.
- Em cômodos pequenos parte da receita não cabe; a prévia lista o que ficou de fora. Um carro só cabe em garagem com 5,5 m ou mais de comprimento.
- Luminárias de teto e luzes com perfil continuam como pontos de luz distribuídos (etapa 4).
