# Cenas de exemplo

**Estado visual em 5 de outubro:** o usuário rejeitou o acabamento da cena de montanha. A montagem descrita abaixo continua disponível como entrega funcional, mas não atingiu a referência. Foi elaborado o [plano de rocha orgânica, neve e reconstrução completa](ORGANIC_WINTER_PLAN.md); os novos recursos e a nova composição ainda estão pendentes.

## Carregar e editar

Em **Abrir → Cenas → Cenas de exemplo**, escolha **Subida da montanha · caverna e ruínas**. O carregamento cria uma cópia independente e ainda não salva. Use **Salvar** para guardá-la no servidor local ou, no GitHub Pages, neste navegador. O exemplo original continua disponível; carregá-lo novamente cria outra cópia, sem substituir seu trabalho.

A montagem usa entidades e materiais comuns do editor: terreno com alturas e uma camada de terra pintada, água/gelo, rochas paramétricas, arquitetura, madeira, vegetação, cobertura de neve e luzes locais. Não existe uma imagem de fundo simulando o mapa. Você pode navegar, selecionar cada peça, mudar materiais, esculpir com **T**, excluir, duplicar, salvar como mapa ou apresentar na segunda tela. Os objetos estão em seis pastas organizacionais, desbloqueados e sem ancoragem conjunta.

## Subida da montanha

85 elementos em uma área de 40 × 58 metros. A trilha sobe aproximadamente dez metros pela encosta direita; um lago glacial ocupa a base, a caverna abre lateralmente à esquerda e a ponte elevada liga as margens de uma ravina à frente. Ruínas em diferentes níveis, abetos, raízes, capim e destroços completam a montagem. Esta composição substitui o corredor entre paredes paralelas da primeira versão, após a correção da leitura da referência enviada pelo usuário, de Icewind Dale/D&D.

A caverna tem arco rochoso irregular, paredes, teto e fundo escuro recuado: existe espaço entre essas superfícies, não uma imagem de entrada. É um asset modular de abrigo, com terreno nivelado sob a abertura; não acrescenta um editor de cavernas ao heightmap. Escultura do terreno não remove automaticamente o teto nem mantém o interior livre depois de alterar alturas. O paredão de fundo encontra o volume posterior do abrigo, integrando a boca à montanha. Os relevos e estruturas vizinhos deixam o acesso e o interior livres.

A ponte tem um piso fino de apoio sobre o tabuleiro, extremidades na altura dos acessos, pilares abaixo das vigas e passagem livre de alvenaria; selecione esse piso como superfície para atravessar com tokens. Rochas, ruínas e caverna são cenográficas, sem inferência automática de apoio/colisão. O leito do lago permanece abaixo das ondas; o gelo ocupa a margem.

Três lanternas **arredondadas** substituem as quadradas: base circular, oito hastes, tampa cônica, alça e elos conectados ao suporte. Cada luz pontual coincide com o núcleo emissivo. Os braços de madeira foram posicionados sobre a geometria real dos paredões/ruínas por raycast durante a autoria; não há vínculo automático depois de carregar ou mover as peças. A lanterna quadrada de parede continua na biblioteca e recebeu elos adicionais/argola para fechar o vão da corrente, conservando ID e dimensões.

As câmeras estão em **Cena → Câmera e apresentação → Enquadramentos**:

1. **Subida, caverna e ponte** — composição principal da encosta.
2. **Entrada lateral da caverna** — revisão próxima da abertura e do abrigo.
3. **Ponte e continuação da subida** — acesso elevado e ruínas ao fundo.
4. **Visão geral para construir** — visão ampla do conjunto.
5. **Mapa superior** — navegação ortográfica da área.

A primeira câmera é carregada no editor. Escolher/publicar uma câmera é uma ação explícita; a navegação livre do mestre continua independente do projetor.

Há neve com volume no terreno, paredões próximos, saliência, madeira e gelo. Rochas/ruínas de fundo usam cobertura visual; nas copas, ela é aplicada ao slot de folhagem, deixando troncos escuros e evitando milhares de pequenos prismas adicionais. Esta distribuição reduz o custo da edição sem exigir uma nova ferramenta. Névoa de distância separa os planos; volume/bloom/clima ficam desligados neste exemplo. O arquivo não depende de assets externos ou serviços. A nova **Ruína alta de montanha · torre partida** também está em Assets, com janela e fundo realmente abertos, fiadas proporcionais e 191 partes agrupadas em poucas malhas.

## Diferença para a referência e plano seguinte

A comparação do usuário não considerou satisfatórias a composição nem a aparência. O problema exige mudar a formação das rochas, a continuidade da neve, a massa da vegetação e o relevo do terreno, além dos materiais. A revisão funcional acrescentou a ruína alta, a lanterna arredondada e a entrada de caverna, mas não resolveu esse acabamento.

| Ordem | Proposta | Critério de conclusão |
| --- | --- | --- |
| 0 | Auditar modelos/objetos suspeitos e registrar recortes/custo de edição | Distinguir falha de carregamento, seleção e destroços pouco legíveis; conferir servidor e Pages |
| 1 | Protótipo de paredão orgânico e material detalhado de rocha | Silhueta e fraturas irregulares, sem faixas alinhadas ou textura de alvenaria; escultura manual e mapas antigos preservados |
| 2 | Depósitos conectados de neve, edição local e tempestade | Sem prismas/costuras evidentes; neve sobre saliências e flocos caindo com vento, pausa e persistência |
| 3 | Abeto volumoso, galhos naturais, barril de madeira e caixas antigas | Modelos legíveis de perto, copa densa e neve sobre ramos; medir e otimizar recursos antes de expandir |
| 4 | Reconstruir terreno e composição inteira com os recursos validados | Encosta, caverna lateral, água e ponte; comparação próxima/principal/ampla e travessia utilizável |
| 5 | Revisar acabamento, prévia e entrega | Carregamento real dos modelos, edição/Pages/projetor e capturas do renderizador; custo medido e limites registrados |

Detalhamento e critérios de cada etapa: [ORGANIC_WINTER_PLAN.md](ORGANIC_WINTER_PLAN.md). O terreno continua com uma altura por X/Z; saliências e a caverna usam malhas. União booleana/voxels e reflexos avançados não são pré-requisitos automáticos para corrigir a geometria artificial. [VISUAL_TARGET.md](VISUAL_TARGET.md) mantém as prioridades gerais.

## Acrescentar outros exemplos

O catálogo de exemplos fica em `src/data/example-scenes.js`. Para acrescentar um, inclua uma entrada com nome, descrição, caminho relativo do JSON e prévia real do renderizador, distribuídos em `public/scenes/`. O JSON precisa ser uma cena válida de schema 2 com referências ao catálogo local. Não adicionar os exemplos aos registros pessoais nem regenerá-los ao carregar.

`node scripts/generate-example-scenes.js` reproduz a cena de montanha de maneira determinística. `node scripts/preview-example-scene.js`, depois de `npm run build`, abre o exemplo pela interface e captura o renderizador para gerar a prévia e recortes em `test-results/`. A prévia final precisa ser incluída nos builds local/Pages. Alterações da composição são feitas no gerador e materializadas no JSON, com revisão visual antes de substituir o exemplo distribuído.

A revisão foi verificada por 159 testes de domínio/integração, com repetição dos cinco testes do exemplo após os ajustes finais de encaixe e passagem da ponte. O teste de geometria verifica subida, leito, entrada vazada, apoios, fixação dos suportes nas paredes e posição das luzes. Quatro cenários E2E afetados passaram: exemplo no servidor, exemplo no Pages, biblioteca/importação/projetor sem API e conflitos/IndexedDB. O fluxo completo do exemplo no Pages passou novamente após os ajustes finais da ponte/caverna. Builds local/Pages aprovados; as câmeras principal e da caverna foram revisadas no renderizador. Recorte com movimento reduzido: 156 chamadas de desenho, 222.058 triângulos e 17 texturas, sem benchmark presencial. A suíte completa de navegador não foi repetida. Medidas e histórico de ajustes estão em progress.md. A captura é produzida no renderizador real, sem imagem de fundo.

Validação e medidas do recorte são registradas em [progress.md](../progress.md). Testes com Chromium/WebGL por software não substituem medição no hardware de uso.
