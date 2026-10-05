# Cenas de exemplo

## Carregar e editar

Em **Abrir → Cenas → Cenas de exemplo**, escolha **Passagem da montanha · ruínas na neve**. O carregamento cria uma cópia independente e ainda não salva. Use **Salvar** para guardá-la no servidor local ou, no GitHub Pages, neste navegador. O exemplo original continua disponível; carregá-lo novamente cria outra cópia, sem substituir seu trabalho.

A montagem usa entidades e materiais comuns do editor: terreno com alturas e uma camada de terra pintada, água/gelo, rochas paramétricas, arquitetura, madeira, vegetação, cobertura de neve e luzes locais. Não existe uma imagem de fundo simulando o mapa. Você pode navegar, selecionar cada peça, mudar materiais, esculpir com **T**, excluir, duplicar, salvar como mapa ou apresentar na segunda tela. Os objetos estão em seis pastas organizacionais, desbloqueados e sem ancoragem conjunta.

## Passagem da montanha

93 elementos em uma área de 36 × 58 metros: caminho nevado junto ao rio, paredões com seeds/dimensões diferentes, saliências, pináculos, torres partidas, passagem de pedra, passarela, plataforma, cordas, lanternas, abetos, raízes, capim e destroços. O leito permanece abaixo da água, inclusive das cristas das ondas. A passarela tem um piso fino de apoio sobre o tabuleiro; selecione esse piso como superfície para atravessar com tokens. Rochas e ruínas permanecem cenográficas, sem inferência automática de apoio/colisão.

As câmeras estão em **Cena → Câmera e apresentação → Enquadramentos**:

1. **Chegada ao desfiladeiro** — abertura que aproxima a composição da referência.
2. **Rio e torre antiga** — vista mais próxima do rio e da torre esquerda.
3. **Passarela e ruínas** — continuação da trilha.
4. **Visão geral para construir** — visão ampla do conjunto.
5. **Mapa superior** — navegação ortográfica da área.

A primeira câmera é carregada no editor. Escolher/publicar uma câmera é uma ação explícita; a navegação livre do mestre continua independente do projetor.

Há neve com volume no terreno, paredões próximos, saliência, madeira e gelo. Rochas/ruínas de fundo usam cobertura visual; nas copas, ela é aplicada ao slot de folhagem, deixando troncos escuros e evitando milhares de pequenos prismas adicionais. Esta distribuição reduz o custo da edição sem exigir uma nova ferramenta. Névoa de distância separa os planos; volume/bloom/clima ficam desligados neste exemplo. O arquivo não depende de assets externos ou serviços. A nova **Ruína alta de montanha · torre partida** também está em Assets, com janela e fundo realmente abertos, fiadas proporcionais e 191 partes agrupadas em poucas malhas.

## Diferença para a referência e plano seguinte

A cena aproxima a disposição dos elementos e a atmosfera; o acabamento permanece estilizado. A revisão revelou a necessidade de materiais menos repetitivos, vegetação mais densa e desgaste localizado para alcançar o detalhe fotográfico da imagem. Esta entrega acrescenta somente o asset de ruína necessário à montagem; os recursos abaixo não foram implementados.

| Ordem | Proposta | Critério de conclusão |
| --- | --- | --- |
| 0 | Medir edição/câmeras neste piloto e avaliar reconstrução incremental de objetos e neve | Editar um objeto sem reconstruir os demais; medir tempo de confirmação, memória e frames no editor/projetor, preservando histórico e apoios |
| 1 | Materiais autorais de rocha, alvenaria, casca, madeira e neve; se necessário, biblioteca/importação de mapas de cor, normal e rugosidade por slot | Comparar as mesmas câmeras; escala em metros, clones independentes, armazenamento local e caminhos no Pages, sem mudar materiais de cenas anteriores |
| 2 | Variação local de desgaste e neve: pintura regional sobre malhas ou decals, com máscara persistida e edição por pincel | Marcas diferentes no mesmo paredão, bordas da trilha sujas e montes escolhidos pelo mestre; undo/redo, salvar/reabrir e projetor |
| 3 | Vegetação com massas mais densas de agulhas e neve sobre ramos; otimizar instâncias/LOD conforme medição | Silhueta de abeto convincente na câmera próxima, sem repetição visível ou aumento desnecessário de draw calls |
| 4 | Avaliar contato/sombras e reflexos da água usando esta cena como piloto | Comparar pixels e custo no notebook/projetor antes de escolher um novo passe de renderização |

Não se exige novo sistema de terreno para carregar ou editar esta montagem. A necessidade de união de malhas/cavernas deve ser avaliada somente se outra área do mapa a exigir. [VISUAL_TARGET.md](VISUAL_TARGET.md) mantém as prioridades gerais.

## Acrescentar outros exemplos

O catálogo de exemplos fica em `src/data/example-scenes.js`. Para acrescentar um, inclua uma entrada com nome, descrição, caminho relativo do JSON e prévia real do renderizador, distribuídos em `public/scenes/`. O JSON precisa ser uma cena válida de schema 2 com referências ao catálogo local. Não adicionar os exemplos aos registros pessoais nem regenerá-los ao carregar.

`node scripts/generate-example-scenes.js` reproduz a cena de montanha de maneira determinística. `node scripts/preview-example-scene.js`, depois de `npm run build`, abre o exemplo pela interface e captura o renderizador para gerar a prévia e recortes em `test-results/`. A prévia final precisa ser incluída nos builds local/Pages. Alterações da composição são feitas no gerador e materializadas no JSON, com revisão visual antes de substituir o exemplo distribuído.

Validação concluída: 157 testes unitários/de integração, builds local/Pages e quatro cenários E2E afetados aprovados. A nova galeria foi revisada em 390 px; cópias, edição/histórico, salvar/reabrir, falha de carregamento, catálogo sem API e projetor independente foram verificados. O recorte final possui 170 chamadas de desenho e 279.944 triângulos, contra 208/433.856 na montagem inicial; a distribuição da neve usa controles existentes.

Validação e medidas do recorte são registradas em [progress.md](../progress.md). Testes com Chromium/WebGL por software não substituem medição no hardware de uso.
