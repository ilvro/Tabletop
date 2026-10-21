# Cenas de exemplo

Atualizado em 8 de outubro de 2026. As capas dos exemplos agora são geradas dinamicamente, sem JPGs distribuídos. O exemplo de montanha foi reconstruído integralmente com rocha/neve orgânicas, vegetação densa, objetos detalhados e tempestade. A composição substitui a versão rejeitada; continua editável e não representa uma declaração de paridade visual com a referência.

## Backrooms

**Abrir → Cenas → Cenas de exemplo → Backrooms · corredores e salas esquecidas** abre um pavimento de 36 × 30 m com corredores interligados e oito setores: salão de pilares, escritório vazio, reunião, arquivo, sala sem luz, divisórias, manutenção e espera. São 436 elementos, cinco câmeras, papel de parede amarelo, carpete e fluorescentes. Oculte **10 · Coberturas** para a planta. [Uso e montagem](BACKROOMS.md).

## Casa de bairro

**Abrir → Cenas → Cenas de exemplo → Casa de bairro · jardim e quintal** abre o piloto residencial do plano: lote de 24 × 30 m, dois quartos, sala/jantar, cozinha, banheiro, lavanderia, garagem e quintal. São 171 elementos editáveis e cinco câmeras. Para a planta, oculte **10 · Coberturas**. [Planta, uso e geração](CASA_DE_BAIRRO.md).

A galeria contém agora Backrooms, Casa de bairro, Galpão industrial, Igreja Antiga, Subida da montanha e Templo gelado. **Passagem de Inverno · Ponte e Névoa** foi removida, e os quatro estudos de iluminação foram transferidos para fixtures de desenvolvimento. Cópias pessoais já salvas não são alteradas.

## Igreja Antiga

**Abrir → Cenas → Cenas de exemplo → Igreja Antiga · templo e vale dos vampiros** cria uma cópia editável do templo completo e seu exterior: 423 elementos, dez câmeras, galerias/escadas, banquete/ritual, sala de correntes e vale rochoso violeta. Para a planta, oculte a pasta **11 · Coberturas**. [Montagem, medidas, câmeras e limites](IGREJA_ANTIGA_CENA.md). Geradores: `scripts/generate-church-scene.js` e `scripts/preview-church-scene.js`.

## Galpão industrial

**Abrir → Cenas → Cenas de exemplo → Galpão industrial · abandonado** cria uma cópia editável de um galpão de 16 × 12 m com pé-direito de 9 m: 139 elementos e cinco câmeras (Olhos, Tela a 2 m, Portão, Planta superior e Entrada). Paredes de concreto escuro com escorridos, piso de pedra escura molhado com reflexos, mezanino de 4,2 m com escada e guarda-corpo, tubulação nas paredes em três alturas, armários, quadros elétricos, gerador, caixas e paletes, cobertura de lajes, tubulação, dutos e eletrocalhas, portão com luz vermelha, cabos no teto e um cabo rompido soltando faíscas ao lado da bancada, goteira, terminal com a tela `BOOTING`, letreiro, marca na carcaça e faixas de alerta em três paredes. A luz é de noite: quase sem preenchimento, um fluorescente frio sobre a bancada, outro piscando ao fundo e o vermelho do portão. A grade do editor vem escondida (Ambiente → Grade). Para a planta, use **Planta superior** (a cobertura se esconde na vista superior) ou **Telhados**.

A cena é gerada por `scripts/industrial-scene.js` (`node scripts/generate-industrial-scene.js` a regrava) usando só o que o editor oferece, em 13 etapas na ordem em que uma pessoa a montaria (sala, materiais, cobertura, teto, estrutura e mezanino, portão, decalques, bancada, entulho, cabos, efeitos, luz, câmeras), para virar tutorial. `node scripts/capture-industrial.js <pasta>` captura as vistas e a comparação com a referência.

## Templo gelado

**Abrir → Cenas → Cenas de exemplo → Templo gelado · caverna e grade levadiça** cria uma cópia editável de um templo escavado numa caverna de neve e do complexo que ele guarda dentro da montanha: 675 elementos e 23 câmeras. Referência do salão: `docs/references/scenes/templo-gelado.png`; a câmera **Salão · olhos** reproduz o enquadramento dela.

**Fora e no salão.** Uma ravina de rocha e neve leva ao salão de 14 × 20 m e 9 m de pé-direito: dois pares de pilares escalonados com argolas, seis nichos de porta, o acampamento da última expedição (barricadas de estacas e caixas em volta de uma grade no piso) e, no fundo, o portal com a grade levadiça em arco.

**Atrás da grade, no nível do salão.** O complexo é um circuito, não um corredor:

- **Átrio rúnico** (24 × 22 m, 12 m de altura): nave entre duas fileiras de pilares, o anel aceso num estrado com degraus, lago congelado, pedras rúnicas e um balcão no fundo, alcançado por uma escada ao longo da parede leste.
- **Sala de máquinas** (22 × 22 m): um poço de 3 m no meio, cercado de balaustrada de bronze, com quatro colunas condutoras em volta de um círculo rúnico e engrenagens nas paredes do poço; escada para descer ao poço, bancada num canto.
- **Arquivo rúnico** (18 × 16 m, 9 m): corredores entre estantes duplas, mezanino de estantes na parede leste, mesa de leitura e um canto onde a montanha rompeu a parede.
- **Alojamento** (18 × 16 m): quatro celas atrás de muretas, refeitório com lareira fria e mantimentos; liga-se à **Despensa**, que abre para a caverna.
- **Corredor dos guardiões**: seis estátuas de guerreiros em plintos e estandartes, do átrio à caverna.
- **Galeria rupestre** (cerca de 30 × 23 m): caverna de contorno irregular, com pilar de rocha, estalactites, poça congelada, três painéis de pintura, o acampamento da expedição que estava documentando as pinturas e uma **fenda de cristais** sem saída.

**Descendo (6 m abaixo).** Da caverna, um túnel dá no patamar do **Salão dos ancestrais** (16 × 16 m, 12 m): uma escadaria monumental desce junto à parede norte até um salão com guardiões, dois pilares e um braseiro de chama fria. A oeste fica a **Forja profunda** (18 × 18 m, 10 m), cortada por um canal de metal fundido com ponte, forja rúnica, bigornas e tina de têmpera. Do outro lado da ponte fica o **Depósito de minério**, um beco sem saída com a boca de uma mina desmoronada. A **Escada de serviço** liga a forja de volta à sala de máquinas, fechando o circuito entre os dois níveis.

**O caminho para o abismo.** A porta-cofre na parede norte da forja abre a **Sala isolada** (cápsula de estase rompida, círculo rúnico, a pintura da descida). Dela, o corredor segue para leste com a última lanterna morrendo, vira para o norte e chega à **porta de pedra rúnica**: Othala acesa no lintel e duas lajes abertas com Algiz e Tiwaz. Atrás dela, a borda do **abismo**: poço de 33 m de diâmetro e 70 m de profundidade, com a escada em espiral descendo sete voltas (56 m) até o escuro.

**Pastas e planta.** Cada sala é uma pasta própria. Os vãos entre salas são **Janela → Vão** nas duas paredes que se tocam; pisos internos (estrado, balcão, mezanino, patamares) são **Pisos** grossos; o poço das máquinas é um furo no piso; a caverna é um piso em polígono com uma parede por lado. Uma segunda montanha (terreno) cobre o complexo por fora; para ver as salas de cima, oculte a pasta **08 · Montanha (oculte para ver a planta)** e use **Planta superior**. No editor, **Ver interior** esconde paredes entre a câmera e o cômodo; desligue-o para ver as salas como o projetor mostra.

**Luz.** O ciano das runas e cristais é a luz principal; as luzes quentes são da expedição (braseiros, lampiões) e da forja (brasas e metal fundido). Cada sala tem uma **zona de ambiente** própria (15 no total, o limite é 16), mais escura quanto mais fundo.

**Gerar e conferir.** `scripts/frozen-temple-scene.js` monta tudo com comandos do editor (`node scripts/generate-frozen-temple-scene.js` regrava o JSON). `npm run build && node scripts/capture-frozen-temple.js <pasta> [câmeras…]` captura as câmeras no editor, a planta sem a montanha e a comparação com a referência. Os materiais vêm de uma paleta curta (32 combinações de textura), porque cada combinação é uma textura gerada ao abrir a cena. Nesta máquina a cena abre em 16 a 20 s (o Galpão leva 6 s), com quadros de 9 a 42 ms conforme a câmera; as vistas externas são as mais pesadas, porque desenham também o complexo atrás das paredes. Modelos: [kit do templo gelado](ASSET_LIBRARY.md#kit-do-templo-gelado-19-de-outubro-de-2026) e [kit das profundezas nórdicas](ASSET_LIBRARY.md#kit-das-profundezas-nórdicas-20-de-outubro-de-2026).

## Carregar e editar

Em **Abrir → Cenas → Cenas de exemplo**, escolha **Subida da montanha · caverna e ruínas**. O carregamento cria uma cópia independente e ainda não salva. Use **Salvar** para guardá-la no servidor local ou, no GitHub Pages, neste navegador. O exemplo original continua disponível; carregá-lo novamente cria outra cópia, sem substituir seu trabalho. Cópias pessoais de versões anteriores permanecem iguais.

A montagem usa entidades comuns: terreno com alturas e camada pintada, água/gelo, rochas esculpíveis, arquitetura, madeira, vegetação, cobertura de neve e luzes. Você pode selecionar cada peça, mudar materiais, esculpir com **T**, excluir, duplicar, salvar ou apresentar. Os objetos ficam em seis pastas desbloqueadas. O mapa é geometria 3D navegável; não usa a imagem de referência como fundo.

## Subida da montanha

**101 elementos e quatro luzes**, em uma área de **48 × 62 metros**. A trilha sinuosa sobe aproximadamente dez metros pela encosta direita; um lago glacial irregular ocupa a base esquerda, a caverna abre lateralmente e uma ponte elevada atravessa a ravina à frente. Três paredões orgânicos ficam no lado esquerdo, com formações, boulders e cobertura variáveis. Ruínas em alturas diferentes e pequenas paredes acompanham a subida.

O relevo combina ruído espacial em quatro escalas com deformação do domínio. A trilha é mais suave localmente; taludes, ravina e margem conservam irregularidade. Neve com espessura e variação pelo vento participa da superfície do terreno. Não há duas paredes paralelas formando uma passarela. O terreno permanece um heightmap de 64 segmentos, com uma altura por X/Z; caverna e saliências usam malhas independentes.

A caverna tem teto, laterais e fundo escuro recuado, um piso explícito para apoio e quatro rochas orgânicas enquadrando a entrada. Há espaço real dentro dela e máscara de neve sob o abrigo. Esculpir o terreno posteriormente não remove automaticamente o teto nem conserva esse interior livre. Rochas/ruínas não inferem colisão ou navegação de tokens.

A ponte tem piso de apoio fino sobre o tabuleiro, extremidades niveladas com os acessos e pilares abaixo das vigas. Selecione o piso como superfície para apoiar tokens. O leito do lago foi escavado com margem suficiente para permanecer abaixo da água e das ondas mesmo entre vértices; o gelo ocupa uma borda.

Três lanternas **arredondadas** têm corpo circular, tampa cônica, hastes, alça e elos conectados. As luzes coincidem com os núcleos emissivos. Suportes foram assentados por raycast sobre a geometria durante a autoria; não acompanham automaticamente o paredão depois de movê-lo.

Quatro abetos densos e um pinheiro denso recebem depósitos nas copas por envelopes de ramos; quatro abetos leves completam os planos distantes. Caixas antigas aberta/fechada, barril abaulado com aduelas/aros, tábuas partidas, raízes, galhos bifurcados, arbustos e capim dão escala ao primeiro plano. Objetos maiores acompanham a inclinação do chão e as rochas são enterradas a partir da altura mínima em sua área de contato. Peças de fundo usam cobertura visual para conter o custo.

A atmosfera tem névoa fria, iluminação difusa e **2.700 flocos de neve**, com queda, vento e rajadas. Volume e bloom ficam desligados. Pausa, movimento reduzido e desativação de efeitos interrompem animações por janela; precipitação e depósitos são controles separados. Não existe simulação contínua de acumulação/derretimento ou colisão dos flocos com tetos.

## Enquadramentos

Em **Cena → Câmera e apresentação → Enquadramentos**:

1. **Subida, caverna e ponte** — composição principal da encosta.
2. **Entrada lateral da caverna** — abertura e abrigo.
3. **Ponte e continuação da subida** — tabuleiro, acesso e ruínas.
4. **Visão geral para construir** — conjunto de massas e terreno.
5. **Mapa superior** — área em projeção ortográfica.

A primeira câmera é carregada no editor. A navegação livre do mestre conserva a câmera publicada no projetor; publicar exige uma ação explícita.

Para trabalhar nas vistas ampla/superior, desligue **Cena → Atmosfera → Névoa e efeitos nesta janela**: revela o conjunto sem névoa/clima/efeitos, sem alterar o ambiente salvo nem o projetor. Religue para avaliar a atmosfera. As capturas de autoria ampla/superior usam esse controle local; as demais mantêm a tempestade e névoa.

## Gerar e acrescentar outros exemplos

O catálogo fica em `src/data/example-scenes.js`. Novos exemplos precisam de nome, descrição, caminho relativo para o JSON e cena válida de schema 2 com referências locais. Arquivos ficam em `public/scenes/`; não se acrescentam automaticamente à biblioteca pessoal.

`node scripts/generate-example-scenes.js` materializa deterministicamente a montanha a partir de `scripts/mountain-example.js`. Não regenera o outro exemplo independente de ponte. O gerador é ferramenta de manutenção; não roda ao abrir a cena.

Depois de `npm run build`, `node scripts/preview-example-scene.js` carrega pela interface e captura o renderizador real. Gera `test-results/mountain-example-preview.jpg` e recortes das cinco câmeras em `test-results/mountain-example-*.png`, além de dois frames da tempestade animada. Essas capturas servem à revisão de autoria; não são dependências do catálogo.

## Validação e limites

Os testes de geometria verificam reprodução do JSON, referências, subida, margem/leito do lago, terreno livre na caverna, vazio real do abrigo, ponte sem bloqueios, fixação das lanternas, histórico e cópias independentes. A revisão visual compara os cinco enquadramentos e o contato das peças. Carregamento real, edição, persistência e projetor são verificados nos modos servidor e Pages.

Resultados e medidas finais em [progress.md](../progress.md). WebGL por software verifica funcionamento e custo geométrico; não estabelece FPS no notebook/projetor. O acabamento continua procedural. Desgaste regional e reflexos procedurais foram entregues depois desse marco. Materiais fotográficos/decals, pintura de depósitos em rochas e otimizações de cenas densas permanecem evoluções reais. O mapa está disponível sem esperar por essas extensões.

Guias: [rocha e neve orgânicas](ORGANIC_WINTER.md), [vegetação e objetos](WINTER_DETAIL.md), [plano e estado](ORGANIC_WINTER_PLAN.md) e [objetivos visuais](VISUAL_TARGET.md).

## Imagem automática de cada cena

Toda cena criada recebe sua própria captura em **Abrir → Cenas**, inclusive a cena em criação, antes de salvar. A imagem acompanha as edições após cerca de um segundo de pausa. Uma cena vazia mostra o espaço vazio; conforme você constrói, a capa passa a mostrar o cenário. Não é necessário enviar imagem ou clicar em um botão de captura.

A cena atual usa o enquadramento e a qualidade visual da mesa, com grid, seleção, gizmos e prévias de construção ocultados apenas durante a captura. Uma prévia de ambiente ainda não aceita não é gravada como capa. A captura não muda a câmera de trabalho, não publica câmera no projetor e não entra no histórico. Abrir o cartão da cena ainda não salva apenas volta à mesa. Para guardar a cena no acervo e depois trocar de documento, continue usando **Salvar**.

Cópias, importações JSON e cenas criadas a partir de mapas também recebem uma imagem. Mapas do acervo têm capas. Cenas/mapas anteriores sem prévia são processados em segundo plano quando Abrir é usado: um por vez, esperando modelos/imagens terminarem de carregar. Para documentos fora da mesa, usa-se o primeiro enquadramento salvo ou uma vista automática do conjunto. A interface e o salvamento continuam disponíveis durante o processamento.

São capturas JPEG de 480 × 270 pixels. As imagens são dados derivados, guardados fora do JSON, do undo e das revisões/backups: metadados da biblioteca no navegador ou arquivos `.preview.json` ao lado das cenas/mapas no servidor local. Ao salvar uma alteração, a imagem recebe a revisão correspondente; uma captura atrasada não pode substituir a capa de uma revisão mais recente. Duplicações preservam a capa válida e exclusões removem a capa junto com o documento. O JSON exportado continua contendo apenas o documento; a importação gera outra capa automaticamente.

Os exemplos distribuídos também geram suas capas automaticamente a partir do JSON, pelo mesmo renderizador. Os cartões visíveis entram na fila compartilhada, sem aguardar a imagem para permitir carregar a cena. Um cache derivado IndexedDB, separado da biblioteca pessoal e limitado a 32 imagens, evita repetir a renderização após recarregar; alterações no conteúdo ou nas revisões dos assets invalidam a capa. Falha no cache não impede abrir a cena. Não há JPGs de capas em `public/scenes/` nem seleção de imagem pelo usuário. As cópias abertas e editadas recebem suas próprias capturas.

O [plano de cenas padrão completas](DEFAULT_SCENES_PLAN.md) define oito novos locais jogáveis, revisão dos cenários existentes e a separação dos estudos técnicos da galeria. Casa de bairro entregue; os outros sete novos locais continuam planejados.


## Estudos de iluminação

**Capela ritual**, **taverna acolhedora**, **escritório fluorescente** e **rua chuvosa** estão em `tests/fixtures/scenes/`, fora da galeria e dos builds. As verificações automatizadas de iluminação continuam disponíveis. Regeneração: `node scripts/lighting-examples.js`; capturas e métricas: `node scripts/render-lighting-examples.js`. A auditoria de desempenho aceita essas fixtures por importação. [Controles e limites](DYNAMIC_LIGHTING.md).
