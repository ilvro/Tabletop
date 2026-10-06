# Tabletop — andamento

Atualizado em 6 de outubro de 2026. Histórico geral: [PROGRESSO.md](PROGRESSO.md) e [relatório detalhado](docs/PROGRESSO.md).

## Colocação repetida de assets — concluída em 6 de outubro

**Assets → Colocação repetida** começa marcada e também aparece na barra sobre a cena, junto do nome do asset. Escolher um card mantém o asset ativo após cada inserção; Esc/Q/Concluir ou outra ferramenta encerra. Desmarcar permite uma cópia e passa para Mover. Cada clique cria IDs próprios e uma entrada independente de histórico, conservando apoio, snap/Alt, andar e camada atuais; falhas não encerram a colocação. Trocar o card conserva filtros e muda o asset em uso. Imports e retratos de assets usam o mesmo fluxo, com ator/token independente por clique. Em tela estreita, repetir recolhe os painéis e cada inserção mantém o cenário livre. Uso: [docs/ASSET_LIBRARY.md](docs/ASSET_LIBRARY.md#colocação-repetida).

Validação: **178 testes de domínio/integração e builds local/Pages aprovados**. **Três E2E afetados aprovados**: regressão da biblioteca (filtros/classificação/favoritos/import/reinício) e dois novos de colocação repetida, no servidor e no Pages. Conferidos três cliques com IDs distintos, camada bloqueada, apoio elevado/andar/camada, snap e Alt, undo/redo sem encerrar, clique fora do apoio, troca de asset, opção única e sincronização biblioteca/barra, Esc/Q/Concluir, retratos independentes, câmera do projetor preservada, tela de 430 px e salvar/reabrir. Fixtures/roteiro foram ajustados aos campos opcionais, nome do catálogo, tolerância de raycast, referência do retrato no ator e enquadramento do piso; a execução final dos dois novos passou. Capturas desktop e compactas inspecionadas em `test-results/repeated-placement-{server,pages}.png` e `repeated-placement-{server,pages}-mobile.png`. A suíte E2E completa não foi repetida.

A preferência é da sessão: recarregar restaura repetição marcada, sem asset ativo. Cópias usam os padrões do asset e não herdam edições da instância anterior. Colocação por nome de tokens e comandos avulsos de luz/escada/rampa continuam individuais; distribuição automática, variantes por traço e assets recentes ficam para incrementos próprios.

## Presets pessoais de pincéis — concluído em 6 de outubro

**Propriedades → Pincel de superfície → Meus pincéis**: salvar com nome, aplicar, atualizar ajustes, renomear e excluir. Listas separadas de terreno/rocha, com até 100 presets no total, nomes validados e proteção contra duplicatas/alterações concorrentes. Biblioteca IndexedDB por endereço/caminho do navegador, independente das cenas e disponível no servidor local e no Pages. Guarda ferramenta, tamanho, força/dureza e opções específicas do terreno (formato/encaixe/proteção, nivelamento, formação rochosa ou água), preservando a camada atual. Aplicar não muda documento/histórico/câmeras nem ativa automaticamente a ferramenta parada. Guia: [docs/BRUSH_PRESETS.md](docs/BRUSH_PRESETS.md).

Validação: **178 testes de domínio/integração aprovados**, incluindo cinco novos para captura de todos os modos, isolamento/contexto, incompatibilidades, validação, armazenamento indisponível e escape da interface; builds local/Pages aprovados. **Quatro E2E afetados aprovados**: dois novos de presets (servidor e Pages), mais regressões de pintura de terreno e escultura de rochas. Conferidos CRUD, nomes duplicados, revisão entre abas, falha de gravação sem sobrescrever, reutilização em outra cena/camada, reload, traço real/undo e projetor independente. Os roteiros novos precisaram abrir explicitamente a cena na segunda aba e o painel Ferramentas recolhido na tela estreita; a repetição final dos dois passou. Capturas desktop e 430 px em `test-results/brush-presets-{server,pages}.png` e `brush-presets-{server,pages}-mobile.png`, com interface inspecionada. A suíte E2E completa não foi repetida.

Limites: biblioteca neste navegador/endereço, sem exportação/importação ou sincronização entre dispositivos; limpar os dados do site remove os presets. Para enxergar adições de outra aba, recarregar; atualizações/exclusões antigas são recusadas e atualizam a lista. Presets de materiais, neve e distribuição de vegetação permanecem fora deste incremento.

## Conta-gotas e copiar/colar materiais — concluído em 6 de outubro

Controles no inspetor e conta-gotas na barra 3D; I amostra, Ctrl+Shift+C copia e Ctrl+Shift+V cola. Clipboard de materiais separado de objetos, com configurações de textura, acabamento e cobertura; destino conserva material nomeado ou alcance base/camada do terreno. Camadas preservam máscaras/distribuição; seleção múltipla é uma transação de histórico, com validação de bloqueios e remoção de parâmetros opcionais antigos. Amostrar não muda documento/seleção; Esc/Q cancela. Apoios acompanham neve física no terreno. Uso e limites em [docs/MATERIALS.md](docs/MATERIALS.md#conta-gotas-e-copiarcolar-materiais).

Validação: 173 testes de domínio/integração aprovados (quatro novos para transferência, isolamento, histórico/atomicidade, bloqueios, máscaras e apoios); builds local e Pages aprovados. Dois E2E novos, um por modo, passaram e foram repetidos após acrescentar material nomeado e conferir o layout: conta-gotas/atalhos/cancelamento, origem bloqueada, seleção preservada, base/camada, colagem múltipla, isolamento do material `strap` de uma caixa, undo/redo, salvamento/reabertura e câmera independente do projetor. Capturas em `test-results/material-transfer-server.png` e `test-results/material-transfer-pages.png`. Clipboard só nesta aba; texturas/cores originais de assets não são extraídas, e camadas recebem apenas os campos que suportam. A suíte E2E completa e benchmark presencial não foram repetidos.

## Análise de pendências e qualidade de vida — concluída

Revisão de código, documentação e prévia distribuída, incluindo capas automáticas presentes no workspace. Diagnóstico e sugestões priorizadas em [docs/AUDITORIA_2026-10-05.md](docs/AUDITORIA_2026-10-05.md). Confirmado no Chromium: importar JSON com ID já existente pode mostrar salvo sem gravar e sem manter rascunho. Correção continua pendente. Reconstrução integral do renderer por atualização/salvamento e custo de snapshots merecem medição; transporte, restauração acessível de backups, reutilização e acabamento visual têm próximos passos registrados. Nenhuma sugestão foi implementada nesta análise.

Validação: 169 testes de domínio/integração e builds local/Pages aprovados; reprodução de importação com fixture temporária e inspeção da imagem do renderer. Primeira execução dos testes impedida pela restrição de portas locais, execução autorizada aprovada. Suíte E2E completa, benchmark presencial e aceitação visual não executados.

## Prévia automática de cada cena — implementada e verificada

- [x] Capturar o cenário renderizado sem grid, gizmos ou seleção, sem modificar câmera/documento/projetor.
- [x] Incluir a cena em criação no menu Abrir e atualizar sua imagem após edições.
- [x] Guardar a capa derivada separadamente do histórico; criar/duplicar/importar/mapas e cenas antigas recebem prévias automaticamente.
- [x] Verificar imagens reais, atualização, criação sem salvar, persistência, conflitos e descarte no navegador; concluir guias/resumos.

Uso: **Abrir → Cenas**. Toda cena criada recebe captura própria, inclusive antes de salvar; edição atualiza após cerca de um segundo de pausa. Inclui cópias, JSON importado e cenas criadas a partir de mapas. Mapas do acervo também têm capas. Documentos antigos sem imagem são capturados em segundo plano, aguardando modelos, com primeiro enquadramento salvo ou vista do conjunto. A captura não modifica/publica câmera, não entra no undo e não bloqueia Salvar. Imagens de 480 × 270 ficam fora do documento, com revisão verificada, duplicação/exclusão e cache limitada; atualização de imagem conserva foco/rolagem da janela. Guia: [docs/EXAMPLE_SCENES.md](docs/EXAMPLE_SCENES.md#imagem-automática-de-cada-cena).

Validação: **169 testes de domínio/integração aprovados**, builds local/Pages e cinco casos de navegador verificados: três novos de capas (servidor, Pages e acervo antigo) e dois de regressão Pages/IndexedDB. Capturas reais em `test-results/scene-previews-server.png` e `scene-previews-pages.png`. Conferidos pixels da cena, salvamento/reabertura, criação antes de salvar, mapas/importação/duplicação, tela estreita, espera de assets, descarte do viewport temporário e independência de documento/câmeras. O teste ampliado do projetor precisou abrir o painel Cena antes de clicar no botão oculto; após corrigir o roteiro, os três testes de capas passaram. Um teste de concorrência confirma que uma captura salva atrasada não substitui a imagem das edições posteriores, e prévias de ambientes não aceitas não viram a capa. O roteiro de persistência confere o metadado salvo, pois uma nova captura pode trocar a URL exibida por imagem em memória. A suíte completa de navegador não foi repetida.

## Reconstrução integral da montanha — entregue e validada

- [x] Substituir a composição por um snapshot novo: **101 elementos e quatro luzes**, **48 × 62 m**, seis pastas desbloqueadas e cinco câmeras.
- [x] Modelar trilha ascendente com relevo espacial em várias escalas, lago irregular com leito escavado, caverna lateral livre e ponte elevada sobre uma ravina real.
- [x] Usar paredões/rochas orgânicos, quatro abetos densos/um pinheiro denso, neve de copa, caixas/barril/tábuas/raízes/arbustos e lanternas circulares conectadas.
- [x] Ativar tempestade com 2.700 flocos, queda/vento/rajadas, névoa fria e contraste quente das lanternas.
- [x] Revisar as cinco câmeras e a tempestade em movimento no renderizador real; atualizar a prévia distribuída.
- [x] Validar cópia independente em Abrir, carregamento de modelos, edição/histórico, persistência, servidor/Pages e câmera independente do projetor.
- [x] Sincronizar os guias e resumos; retirar entregas das pendências atuais.

Uso: **Abrir → Cenas → Cenas de exemplo → Subida da montanha · caverna e ruínas**. Cada carregamento cria uma cópia editável; originais e cópias pessoais anteriores ficam preservados. Gerador em `scripts/mountain-example.js`, JSON/prévia em `public/scenes/`; o outro exemplo de ponte não é regenerado pelo comando de manutenção. Guia: [docs/EXAMPLE_SCENES.md](docs/EXAMPLE_SCENES.md).

Revisão visual: rocha deslocada para liberar a caverna; árvore afastada da borda; props inclinados com o chão e boulders assentados pela área de contato; irregularidade dos paredões reduzida para evitar pontas excessivas; lanterna reposicionada na face visível. Comparação com sombras desligadas confirmou que as faixas no chão eram auto-sombreamento. `normalBias` direcional agora acompanha o tamanho de texel no mundo, limitado entre 0,035 e 0,18 m, sem aumentar a resolução. Recorte final conferido sem as faixas. Vistas de autoria usam a qualidade local desligada para revelar o conjunto sem névoa, preservando o ambiente salvo/projetor. Arco antigo com pedras espaçadas substituído por ruína de torre; piso da caverna aproximado do chão e caixas parcialmente enterradas na neve.

Validação: 167 testes de domínio/integração aprovados; nove testes de iluminação repetidos após a correção das sombras. Builds local/Pages aprovados. Oito cenários E2E afetados passaram nesta etapa: vegetação/pixels/descarte, exemplo no servidor e no Pages, três casos de rocha/neve/precipitação e dois de Pages/IndexedDB. Dois E2E de iluminação também foram repetidos. Cinco testes do exemplo passaram novamente após os últimos ajustes de composição. O roteiro móvel do exemplo foi corrigido para conferir os dois cartões da galeria, após falha por seleção ambígua; o caso Pages foi repetido. A suíte completa de navegador não foi repetida. Os raycasts da entrada foram ampliados para três alturas/larguras. Conferidos subida, margem/leito, apoios/vãos, fixação das lanternas/luzes, determinismo e cópias independentes. Todas as referências/modelos/prévias do catálogo e o JSON/JPEG do exemplo foram conferidos nos dois builds; nenhum diagnóstico de falha no mapa renderizado.

Capturas finais: `test-results/mountain-example-reference.png`, `-cave.png`, `-bridge.png`, `-wide.png`, `-top.png`; tempestade animada em `-storm-a.png`/`-storm-b.png`. Recorte principal: **105 objetos, 167 chamadas, 747.504 triângulos, 17 texturas**. Compartilhar o acabamento mineral reduziu as texturas de 55 para 17 durante a revisão; o recorte anterior à reconstrução tinha aproximadamente 222 mil triângulos. Os contadores incluem as passagens de renderização, inclusive sombras; não são uma contagem de triângulos únicos. Essa ampliação tem custo real. Chromium/SwiftShader verifica funcionamento, sem estabelecer FPS no notebook/projetor. A animação de neve foi observada com relógio de efeitos avançando; movimento reduzido continua pausando.

O mapa está pronto para carregar e editar. O acabamento continua procedural e estilizado: materiais fotográficos/desgaste regional, pintura local dos depósitos nas rochas, contato/reflexos e otimizações conforme benchmark permanecem futuros. Não declarar paridade com a referência ou com Ordem Paranormal por contagem de assets/testes; a aceitação visual pelo usuário ainda precisa ocorrer.

## Vegetação e objetos detalhados — implementados e verificados no navegador

- [x] Acrescentar abeto/pinheiro densos com agulhas em volume, ramos curvos afilados/bifurcados e variação por seed, preservando as plantas anteriores.
- [x] Acrescentar galho seco, raízes torcidas e arbusto seco; madeira com pontas maciças, sem hastes retas como forma dominante.
- [x] Acrescentar barril abaulado com 18 aduelas/aros, caixas antigas abertas/fechadas e tábuas partidas com espessura e ferragens.
- [x] Integrar neve de copa por envelopes de ramos, slots/exposição/vento e descarte, com orçamento de refinamento menor que o das rochas.
- [x] Integrar as cinco plantas à distribuição editável; iniciar com seis abetos densos e manter alternativas leves para fundo.
- [x] Compactar as nove prévias offline em PNG embutido em SVG local; atualizar guias e resumos.

Catálogo de **202 assets**: nove peças novas, sem alterar os arquivos dos 193 anteriores. Árvores com duas malhas e menos de 65 mil triângulos; neve em uma malha adicional. Prévia de cada árvore caiu de aproximadamente 2 MB para 12–14 KB. Guia e nomes para busca: [docs/WINTER_DETAIL.md](docs/WINTER_DETAIL.md).

Validação: 152 testes offline de domínio/geometria/integração passaram, excluindo `server.test.js` que abre portas. Quatro testes novos cobrem fechamento/orientação, buffers completos, bounds/base/seed, volume da copa, orçamento, vãos por raycast, abaulamento do barril, prévias PNG válidas/compactas, slot/exposição/descarte da neve e autoria/histórico/duplicação/projeção. Após a inspeção, corrigidas tampas dos ramos, buffers de normais após acrescentar vértices, tábuas/cantos da caixa, aros que entravam na madeira e suporte de neve mais suave. Após os últimos ajustes, 18 testes afetados (catálogo/paisagem/rocha/neve/novas peças) e os builds local/Pages passaram novamente; os 202 modelos e 202 prévias foram conferidos idênticos a public nos dois builds. Inspeção geométrica/CPU das nove peças em `test-results/winter-detail-catalog-cpu.png`; não é captura PBR do site.

Comparação GPU seca/nevada e descarte concluídos: um teste de navegador aprovado, com capturas reais em `test-results/winter-detail-dry.png` e `winter-detail-snow.png`. Recorte nevado: 20 chamadas, 159.152 triângulos, cinco texturas; depósitos de copa com 9.176/8.380 triângulos. O roteiro reaplicava o shader aos mesmos materiais e foi corrigido para evitar a falsa falha de folhagem. A autenticação da revisão automática voltou a funcionar. Mapa reconstruído e revisão no renderizador concluídos no incremento acima; benchmark presencial continua futuro.

## Base técnica de rocha e neve orgânicas — implementada

- [x] Formações orgânicas separadas das geometrias antigas, fraturas/erosão em três dimensões e dois assets próprios.
- [x] Padrão mineral com variação espacial ampla, preservando materiais anteriores.
- [x] Depósitos conectados de neve com espessura/vento; parâmetros opcionais, editor e altura de apoio do terreno.
- [x] Queda de neve corrigida, variação de flocos, deriva e rajadas no emissor GPU.
- [x] Prévia real ausente do outro exemplo corrigida e diagnósticos de assets acrescentados.

A base passou anteriormente por 163 testes unitários/de integração e sete roteiros de navegador (geometria/neve, editor/Pages/projetor e regressão de paisagem/IndexedDB). Os últimos ajustes foram depois conferidos nos testes de domínio e nos três E2E de rocha/neve/precipitação, junto da reconstrução acima. Guia: [docs/ORGANIC_WINTER.md](docs/ORGANIC_WINTER.md).

Pendências reais do objetivo visual: materiais autorais/fotográficos/desgaste regional, pintura localizada de depósitos nas rochas, aceitação visual do novo mapa e benchmark presencial. Servidor/Pages e novas peças já foram conferidos no navegador. Simulação contínua de depósito/derretimento e LOD/instanciamento entre árvores não estão implementados. Paridade visual com a referência ainda não foi atingida nem declarada.

## Rocha orgânica e reconstrução completa — histórico do planejamento

- [x] Reavaliar a entrega após a rejeição visual do usuário; separar funcionamento de semelhança com a referência.
- [x] Investigar os geradores de rocha, terreno, neve, vegetação e clima; verificar as 19 receitas usadas pelo exemplo.
- [x] Elaborar sequência, contratos afetados e critérios visuais em [docs/ORGANIC_WINTER_PLAN.md](docs/ORGANIC_WINTER_PLAN.md).

O usuário considerou a cena insatisfatória: paredões com ondas regulares, neve uniforme/sem tempestade, vegetação rala, galhos cilíndricos e objetos pouco legíveis. O código confirma faixas horizontais repetidas nos paredões, rampa quase uniforme, neve geométrica feita de prismas por triângulo e clima desligado no exemplo. A opção de neve já existe no emissor, mas o shader dá a ela o sentido vertical das partículas ascendentes.

Auditoria desta etapa: 19 receitas distintas instanciadas sem erro ou vértices não finitos; no navegador local, os 19 arquivos responderam HTTP 200, sem aviso de falha ao carregar a cena. A atmosfera reportou zero partículas e clima `none`. Houve HTTP 404 na prévia `scenes/icewind-bridge.jpg` do outro cartão da galeria, separado dos modelos desta cena. O catálogo tem caixa de madeira e tambor industrial, mas a montagem não contém caixas/barris. Falhas dos objetos no ambiente relatado pelo usuário ainda precisam de reprodução; esta auditoria não validou novamente o Pages. O roteiro de auditoria foi corrigido para aceitar a confirmação de descarte da cena vazia inicial.

Próximo marco: paredão orgânico com material detalhado, preservando escultura manual e mapas antigos. Depois: depósitos de neve conectados/tempestade, abeto volumoso/galhos naturais/caixas e barris de madeira, e reconstrução integral da cena. Comparar recortes no renderizador antes de ampliar o mapa; testes funcionais não substituem aceitação visual. Esse foi o estado no diagnóstico inicial. Rocha/neve orgânicas e vegetação/objetos detalhados foram implementados nos incrementos acima; a reconstrução da composição foi entregue no incremento acima.

## Revisão anterior · subida, caverna e lanternas — entrega funcional, objetivo visual não atingido

- [x] Identificar a corrente interrompida e corrigir a leitura da referência: encosta ascendente, caverna lateral e ponte elevada.
- [x] Acrescentar lanterna arredondada e entrada de caverna com vão real; corrigir a corrente da lanterna existente.
- [x] Distribuir a montagem anterior com relevo ascendente e encaixes; revisar suas câmeras e prévia. O acabamento foi rejeitado e substituído pela reconstrução acima.
- [x] Validar geometria, apoios, carregamento/Pages e persistência; sincronizar guias e resumos.

A revisão tem 85 elementos em 40 × 58 m, com subida de aproximadamente dez metros, três lanternas circulares e cinco câmeras. Suportes encaixados por raycast na geometria dos paredões/ruínas; luzes posicionadas nos núcleos. Suíte final de 159 testes de domínio/integração aprovada; os cinco testes do exemplo passaram novamente depois de afastar a torre do acesso à ponte e limitar os pilares abaixo das vigas. Verificados encaixes dos suportes/luzes, subida, passagem da ponte livre de alvenaria e vazio da caverna. Quatro cenários E2E afetados aprovados: exemplo no servidor, exemplo no Pages, catálogo/importação/salvamento/projetor sob /Tabletop/ sem API e repositório IndexedDB/conflitos. Após os últimos ajustes da ponte e do paredão da caverna, os cinco testes do exemplo e o fluxo completo do exemplo no Pages passaram novamente. Cópias independentes, edição/histórico, salvar/reabrir e câmera do projetor independente verificados. A suíte completa de navegador não foi repetida.

A montagem anterior foi interpretada como vale/corredor e foi substituída no exemplo distribuído. Cópias pessoais já salvas permanecem independentes. A revisão usa entidades comuns e dois assets originais; a caverna é um abrigo modular com teto, laterais e fundo, sem alterar o contrato de uma altura por X/Z do terreno.

Capturas finais revisadas: `test-results/mountain-example-reference.png` e `test-results/mountain-example-cave.png`; prévia real atualizada em `public/scenes/snowy-mountain-pass.jpg`. Builds local/Pages aprovados após incluir a prévia final; JSON, modelos e imagem conferidos idênticos a public nos dois builds. Recorte com movimento reduzido: 156 chamadas de desenho, 222.058 triângulos e 17 texturas. Sem benchmark presencial. O acabamento continua estilizado; materiais autorais, desgaste/neve regional, vegetação densa e contato/reflexos continuam no plano de [docs/EXAMPLE_SCENES.md](docs/EXAMPLE_SCENES.md). Jukebox/Ficha permanecem adiados. Guias e três relatórios de progresso sincronizados.

## Cena de exemplo · primeira montagem — histórico, substituída pela revisão acima

- [x] Compor terreno nevado, leito e rio, paredões, ruínas, madeira, vegetação e enquadramentos com entidades comuns/editáveis.
- [x] Disponibilizar exemplo em Abrir como cópia independente, com prévia real e caminhos compatíveis com Pages.
- [x] Revisar a composição no renderizador, corrigir montagem e verificar apoios, persistência e projetor.
- [x] Sincronizar documentação e registrar limitações e próximos passos constatados na cena.

Montagem revisada com 93 elementos, cinco câmeras e seis pastas. Um asset de ruína alta foi acrescentado para evitar esticar as fiadas da torre pequena; os 188 assets anteriores mantêm arquivos e IDs. O original distribuído fica separado das cenas pessoais; carregar cria um rascunho novo sem sobrescrever documentos. Validação final: suíte de 157 testes unitários/de integração, builds local/Pages e quatro cenários E2E afetados aprovados: exemplo no servidor, exemplo no Pages, fluxo anterior de Pages/imports/projetor e repositório IndexedDB/conflitos. Os três testes do novo arquivo foram repetidos após distribuir a neve entre volume próximo e cobertura visual de fundo. Verificados terreno/leito, referências locais, determinismo, janela real da nova ruína, cópias independentes, edição/undo/redo, salvar/reabrir, original preservado, erro de fetch sem perder a cena, URLs sob /Tabletop/ sem API e câmera independente do projetor. Galeria de 390 px revisada em `test-results/example-gallery-mobile.png`. A suíte completa de navegador não foi repetida.

As primeiras execuções ajustaram comparação de câmera para tolerância numérica, espera pela lista assíncrona e indicador de alterações oculto no cabeçalho compacto. O cartão recebeu limites de largura e a verificação espera o reposicionamento da janela ao mudar de tamanho. A execução animada simultânea ficou pesada em SwiftShader; os fluxos completos passaram com movimento reduzido, sem alterar o JSON da cena. O teste da suíte pelo sandbox não abriu portas; a chamada direta autorizada de `node --test` passou.

Captura revisada: `test-results/mountain-example-reference.png`; prévia real em `public/scenes/snowy-mountain-pass.jpg`. Neve com volume concentrada no primeiro plano: recorte passou de 208 chamadas/433.856 triângulos para 170 chamadas/279.944 triângulos, com 15 texturas, sem benchmark presencial. A composição permanece estilizada; plano de edição incremental, materiais/desgaste regional, vegetação e contato/água em [docs/EXAMPLE_SCENES.md](docs/EXAMPLE_SCENES.md), comunicado antes de implementar novas ferramentas.

## Escultura direta nas superfícies — concluída

- [x] Pincel por raycast em rochas/paredões, incluindo faces verticais e topo; conservar controles paramétricos.
- [x] Elevar/rebaixar, projetar/recuar, suavizar e aplainar; cursor orientado pela superfície, prévia durante arraste e um traço por undo.
- [x] Persistir traços locais, refinar a malha com orçamento fixo, conservar escala/rotação/material/neve e cancelar sem gravar.
- [x] Unificar ativação T para terreno/rocha, permitir trocar a superfície apontada sem forçar o terreno selecionado e tornar o pincel visível nas propriedades.
- [x] Validar deformação/limites, histórico/mapas/Pages/projetor, recursos e revisar um recorte; sincronizar guias e resumos.

Validação final: 154 testes unitários/de integração, builds local/Pages e cinco cenários E2E afetados passaram: editor/projetor, dois de Pages/IndexedDB, pixels/descarte e regressão de pintura/terreno. Verificados topo/face, troca de superfície, cancelamento, undo/redo, duplicação, salvar/reabrir e ativação T com apenas rochas em composição ancorada, sem terreno. Cache CPU limitado a seis templates, com clones independentes e prune/destruição, validado. Captura revisada: `test-results/rock-sculpt-editor.png`. A suíte completa de navegador não foi repetida neste incremento; Chromium/WebGL por software verifica funcionamento, sem estabelecer desempenho no hardware real. Uso e limites: [docs/ROCK_SCULPT.md](docs/ROCK_SCULPT.md).

A escultura de malha mantém a topologia fechada do asset; não é um sistema de voxels, união booleana ou abertura de cavernas. Pintura de camadas/água conserva o fluxo de terreno. O objetivo imediato é desenhar e corrigir formas locais diretamente nas superfícies, inclusive onde a seed atual abaixa um pico.

## Paredões e kit de montanha — concluído

- [x] Malhas próprias de paredão/pináculo, com faces verticais, topo quebrado e saliências/reentrâncias reais. As quatro rochas anteriores conservam sua geometria.
- [x] Controles de saliências, camadas e erosão por instância; campos opcionais validados, histórico, materiais/neve e dimensões/base conservados.
- [x] Quatro formações geológicas e oito complementos de ruínas/madeira/cordas/lanterna/raízes/destroços, com materiais locais e prévias. Catálogo de 188 assets; os 176 arquivos anteriores permanecem iguais.
- [x] Validar fechamento/orientação/raycast, vãos, escala, apoio da plataforma, GPU, edição/salvamento/projetor e GitHub Pages; revisar recorte e conjunto das peças.
- [x] Sincronizar guias, arquitetura, visual target e os três resumos, separando entregas de pendências.

Validação final: 150 testes unitários/de integração, builds local/Pages e cinco cenários E2E afetados passaram. GPU/pixels/descarte foi repetido após conferir o seed da segunda face do canto e acrescentar a prévia conjunta das 12 peças. Verificados extremos, malhas fechadas e orientadas, tampas sem T-junctions, faces inferiores reais, bounds/base, determinismo e concordância entre prévia/instância padrão; janela e interior vazados, elos vazados, tabuleiro com apoio; edições inválidas atômicas, undo/redo/reset/duplicação/mapas/JSON, salvamento/reabertura e projetor com câmera independente. Pages coloca/edita/persiste o novo paredão sem API. As oito peças complementares usam até quatro draw calls cada no recorte isolado e liberam geometria ao remover.

Capturas revisadas: `test-results/mountain-kit.png` (editor, ruína/neve/plataforma) e `test-results/mountain-kit-catalog.png` (12 peças). A revisão levou a camadas com alturas/projeções variadas, fissuras e blocos angulares de alvenaria. O primeiro fixture foi corrigido para ambiente completo; o roteiro antigo de montanha excedeu o tempo quando dois navegadores estavam concorrendo, e passou em sequência (125 s). A suíte completa de navegador não foi repetida neste incremento. Chromium/WebGL por software verifica funcionamento, sem estabelecer desempenho no notebook/projetor reais.

Uso e limites em [docs/MOUNTAIN_KIT.md](docs/MOUNTAIN_KIT.md). Paredões continuam cenográficos; terreno mantém uma altura por X/Z. Lanternas exigem luz local e cordas são estáticas. Materiais fotográficos/decals, montes locais de neve e acabamento de contato/água seguem próximos incrementos; as novas peças foram retiradas das lacunas do visual target. Ficha/Jukebox continuam adiados.

## Consistência dos demais painéis e animações — concluída

- [x] Agrupar Cena em Atmosfera, Câmera e apresentação, Elementos e documento, com tarefas recolhíveis.
- [x] Padronizar indicadores e títulos recolhíveis também nas propriedades de objetos e luzes, conservando abertura, foco e rolagem nas edições.
- [x] Trocar fade de entrada por transições controladas de 100 ms na abertura e 80 ms no fechamento de Assets/Abrir; permitir reabertura durante a saída e respeitar movimento reduzido.
- [x] Preservar o painel de edição ao importar assets, restaurar foco/rolagem em composições e cancelar fades em curso ao ativar movimento reduzido.
- [x] Validar navegação, fechamento/reabertura, propriedades, histórico e câmera no navegador; sincronizar guias e resumos.

Validação final: 147 testes unitários/de integração e builds local/GitHub Pages passaram na versão final. Os 25 cenários E2E foram aprovados entre a suíte completa e repetições dos fluxos afetados. A suíte inicial aprovou 23/25: controles principais de Água/Gelo passaram a iniciar abertos e o roteiro Pages abre explicitamente a tarefa; o teste de recursos passou a esperar o frame do mestre antes de medir texturas, independentemente do projetor. A repetição de oito cenários aprovou sete; a nova asserção de importação foi corrigida para comparar a aba realmente selecionada após recarregar (Construir), e a biblioteca passou na repetição final.

Verificados: grupos/tarefas de Cena, abertura por teclado, estado conservado nas edições e trocas de aba, propriedades de objetos/luzes/composições, histórico, câmera do projetor independente, importação sem trocar o painel de edição, janelas com fade de 100/80 ms, saída sem interação, cancelamento/reabertura durante fechamento, foco devolvido, limites de Abrir, telas de 390 px e movimento reduzido. Fades de tarefas não reiniciam ao editar parâmetros. Capturas revisadas: `test-results/panel-consistency.png` e `panel-consistency-mobile.png`. Guia atualizado: [docs/EDITOR_UI.md](docs/EDITOR_UI.md), com os caminhos de câmera, iluminação, ambientes e assets sincronizados. Testes de navegador em Chromium/WebGL por software; servidores locais executados fora do sandbox após `listen EPERM`.

## Reformulação dos fluxos de edição — concluída

- [x] Construção organizada por contexto (Paisagem, Construções, Personagens e Organização), com feedback da ferramenta ativa.
- [x] Assets e Abrir em janelas flutuantes arrastáveis, utilizáveis por teclado e ajustadas à tela.
- [x] Alcance explícito dos materiais: camada selecionada versus base do terreno, com edição e pintura acessíveis.
- [x] Água integrada ao pincel: contorno comum e leito rebaixado em uma transação; ajuste revisável para água existente.
- [x] Legibilidade, foco, telas estreitas e animações curtas com respeito a movimento reduzido.
- [x] Validar histórico, persistência, câmera independente e fluxos no navegador; atualizar guias e resumos.

Validação final: 147 testes unitários/de integração passaram; builds local e GitHub Pages passaram. Os 24 cenários E2E foram aprovados entre a suíte completa e repetições dos casos afetados. A suíte inicial teve 21/24: dois roteiros foram adaptados à nova navegação (biblioteca que fecha ao escolher e tamanho do terreno em seção própria); o novo roteiro ganhou espera da abertura assíncrona e revelou a sobreposição dos painéis em tela estreita, corrigida e validada. A repetição de oito casos aprovou sete antes da correção estreita; os quatro casos finais (UI, biblioteca e dois de Pages) passaram na versão final.

Verificados: alteração de textura/padrão de uma camada sem mudar base, outras camadas ou máscaras; janelas com arraste/setas, foco/fechamento e documento/câmera intactos; pincel de água com proposta/cancelamento, leito abaixo de ondas/neve, apoios e rejeição atômica de dependentes bloqueados, undo/redo, ajuste de água existente e salvamento/reabertura; painéis exclusivos em 390 px, restauração de desktop, ausência de overflow horizontal, limites das janelas e movimento reduzido. Pages conservou catálogo/importação/armazenamento/projetor sem API. Capturas revisadas: `test-results/editor-ui.png`, `editor-ui-assets.png`, `editor-ui-mobile.png` e `editor-ui-mobile-assets.png`.

Guia e limites: [docs/EDITOR_UI.md](docs/EDITOR_UI.md). Água usa nível horizontal, resolução do terreno e contornos de até 64 vértices, sem união automática entre traços. Não há benchmark presencial; WebGL por software verifica funcionamento. Ficha/Jukebox continuam adiados.

## Conflitos com o navegador — concluído

- [x] Bloquear menu nativo por captura na área 3D, incluindo overlays, e padrões de botões direito/meio no canvas.
- [x] Disponibilizar Tela cheia no editor com Keyboard Lock de WASD e suas combinações, preservando Esc para saída e liberando captura ao sair.
- [x] Avisar quando captura é recusada ou indisponível; Page Down desce sem Ctrl.
- [x] Validar build, testes e E2E de câmera com Shift + mouse, fullscreen e captura recusada/ausente.

Validação: build, 98 testes unitários/de integração e E2E de câmera passaram. O E2E confirmou Shift durante navegação e arrastes, cancelamento de contexto no canvas/overlays, fullscreen real, foco no canvas, solicitação de captura WASD, liberação ao sair e avisos de recusa/ausência de API, além da publicação independente. A janela do mestre é trazida à frente antes de solicitar fullscreen após o teste do projetor.

Limite: preventDefault sozinho não garante bloquear Ctrl+W em uma aba normal. Captura real depende de fullscreen iniciado pelo botão, suporte/permissão do Chrome e teclas permitidas pelo sistema operacional. E2E headless simula a fronteira de permissão de Keyboard Lock; validação dessa permissão e atalhos reservados no Chrome com interface permanece presencial.

## Ctrl combinado com navegação — concluído

- [x] Dar prioridade a Ctrl+WASD na perspectiva com foco no canvas, bloqueando atalhos do navegador/editor sem limpar o movimento.
- [x] Preservar Shift durante descida e manter atalhos de edição fora desse contexto.
- [x] Validar Ctrl antes/depois de WASD, teclas repetidas, foco e atalhos de edição; atualizar os resumos.

Validação: 98 testes unitários/de integração, build e E2E de câmera passaram. O navegador confirmou deslocamento e descida simultâneos com Ctrl+A/D/S/W, cancelamento dos padrões do navegador inclusive nas repetições, movimento preservado ao soltar Ctrl, Ctrl direito + Shift com W já pressionado, documento inalterado durante navegação, Ctrl+A em campo de texto e Ctrl+S fora do canvas. A câmera publicada permanece independente.

## Ajustes dos controles de câmera — concluídos

- [x] Identificar interrupção de WASD ao iniciar controles do mouse e seleção pelo evento de contexto.
- [x] Preservar navegação durante zoom, pan e órbita; selecionar com botão direito somente no release sem arraste.
- [x] Adicionar Espaço/Ctrl para subir/descer na perspectiva, preservando atalhos de edição.
- [x] Validar regressões no navegador, testes e build; sincronizar documentação.

Validação deste ajuste: 98 testes unitários/de integração, build e E2E de câmera passaram. O navegador verificou WASD durante roda/pan/órbita e após soltar o mouse, ausência de seleção/menu no press e em arrastes que retornam ao ponto inicial, seleção/menu no release, Espaço e ambos os Ctrl na perspectiva e Ctrl+D preservado. O mesmo E2E confirmou novamente foco, transições, persistência e publicação independente. Servidores locais/Chromium executados fora do sandbox após bloqueio de loopback (`listen EPERM`).

## Câmera cinematográfica — incremento concluído

- [x] Ler contexto de arquitetura, imersão, autoria, roadmap e relatórios; conferir renderer, atalhos e publicação.
- [x] Navegação WASD relativa à câmera, aceleração/desaceleração suaves e Shift para movimento rápido; Page Up/Down altera altura.
- [x] Resolver conflito: G mover, R girar e V escalar; instruções da interface atualizadas.
- [x] Transições suaves entre enquadramentos, duração configurável, interrupção e corte imediato.
- [x] Controle de lente e navegação também na vista superior.
- [x] Projetor independente, com transições somente após publicação explícita e sem reinício ao editar conteúdo.
- [x] Validar comportamento com testes e build; documentar controles e limites.

Validação: 97 testes unitários/de integração, build e oito E2E passaram. O E2E de câmera foi repetido após a revisão final e também confirmou WASD na apresentação na mesma janela, restauração da câmera de trabalho e publicação do ponto apresentado ao voltar à edição. Chromium headless com WebGL por software; avaliação no notebook/projetor real permanece pendente. Controles/limites documentados em [docs/CAMERA.md](docs/CAMERA.md).

Último ajuste validado com build e E2E de câmera: transições atualizam lente/frustum sem redimensionar o buffer de desenho quando o viewport conserva seu tamanho. Captura final: `test-results/camera-controls.png`.

## Iluminação e imersão avançada — concluída

- [x] Conferir arquitetura, especificação de imersão e implementação atual; preservar os ajustes locais de câmera.
- [x] Luz spot editável (direção, cone, penumbra, alcance e sombras) e temperatura Kelvin com cor reproduzível.
- [x] Flicker determinístico com seed, amplitude/frequência e pausa, sem gravar frames no histórico.
- [x] Fog de distância, névoa volumétrica por altura e bloom opcional, com controles e descarte de recursos GPU.
- [x] Validar comandos, persistência, projeção, renderização e fluxos pela interface; sincronizar os relatórios.

Validação final em 4 de outubro: build de produção, 107 testes unitários/de integração e os dez E2E passaram. Os dois E2E de iluminação foram repetidos após o ajuste final de rotação numérica, confirmando que o yaw conserva a inclinação do spot. Verificados: edição, Kelvin/cor, animação sem mudar documento/histórico, pausa/movimento reduzido, fog/volume/bloom, descarte de buffers, qualidade e câmera independentes do projetor e fidelidade após reiniciar navegador/servidor. Pixels WebGL confirmam limite de profundidade, câmeras perspectiva/ortográfica, distância máxima do volume e limiar de bloom. Uso e limites: [docs/LIGHTING.md](docs/LIGHTING.md).

Spots, Kelvin, flicker, fog de distância, névoa por altura e bloom saíram das pendências. A névoa volumétrica entregue é uma camada homogênea limitada pela geometria opaca; feixes e sombras volumétricas continuam futuros. A avaliação presencial no notebook/projetor permanece necessária.

## Ambientes, horários e clima — concluídos

- [x] Conferir os limites atuais: controles da luz principal escondidos no inspetor e presets restritos a fundo/preenchimento/luz.
- [x] Expor sol/lua, temperatura, intensidade, direção e HSV na aba Cena.
- [x] Presets de dia, tarde, noite, neblina, chuva, pântano e calor; céu com sol/lua, estrelas e nuvens editáveis.
- [x] Chuva e partículas em região configurável, com animação determinística, pausa e qualidade local.
- [x] Vínculos de dia/noite para materiais e luzes, incluindo janelas acesas, sem modificar assets compartilhados.
- [x] Biblioteca de ambientes personalizados no servidor, reutilização independente da cena e prévia/diff.
- [x] Validar histórico, dados, sigilo, reinício e projetor independente; sincronizar os relatórios.

Referências visuais fornecidas pelo usuário: tarde alaranjada e noite azul com lua/janelas acesas. Essas imagens orientam comportamento e composição; não estabelecem a implementação interna da ferramenta de referência. Controles e limites: [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

Validação final: Build de produção, 118 testes unitários/de integração e os 12 roteiros E2E verificados com sucesso. Após corrigir o encerramento da órbita durante animação contínua, os roteiros de câmera, autoria e ambientes foram repetidos e passaram. Verificados controles diretos, materiais por slot/instâncias independentes, janelas/luzes por horário, biblioteca e snapshots após reiniciar, prévia local/aceite, pausa/movimento reduzido, qualidade local, enquadramento de céu sem publicar câmera e pixels WebGL de sol/lua, nuvens e chuva. Capturas em `test-results/environment-afternoon.png`, `environment-night.png` e `environment-night-sky.png`.

Revisão final validada: importar um EnvironmentDocument não substitui a mesa; store/histórico e recibos de salvamento rejeitam o tipo de documento incompatível sem alterar cena ou histórico. A suíte de 118 testes e os dois E2E de ambientes passaram novamente após essa proteção.

Biblioteca de ambientes e emissor global de clima/partículas saíram das pendências. Múltiplos emissores associados a objetos/áreas, colisão de partículas, feixes/sombras volumétricas e benchmark presencial permanecem futuros.

## Biblioteca — terceira ampliação concluída

- [x] Inspecionar pipeline: receitas de primitivas em `scripts/generate-library.js`/`library-expansion.js`, pivot na base, footprints/apoios e prévias SVG.
- [x] Adicionar 34 assets originais em `scripts/library-expansion-3.js` (casarão/sótão, asilo/necrotério, cemitério, rua, rural, comércio e investigação), sem alterar materiais nem modelos existentes.
- [x] Regenerar catálogo/modelos/prévias e revisar visualmente as prévias; sincronizar contagens (161 assets, 155 além do kit) na documentação.

Validação: 107 testes unitários/de integração, build e E2E da biblioteca (paginação completa com 161 cards) passaram. A regeneração apenas acrescentou registros ao catálogo; os 127 modelos/prévias anteriores ficaram idênticos.

## Revisão das pendências e referências visuais — concluída

- [x] Remover recursos entregues da seção de pendências do relatório detalhado; corrigir as menções antigas a três presets para os oito atuais.
- [x] Comparar as sete imagens fornecidas com os recursos e limites do código, distinguindo conteúdo visual, ferramentas de autoria e acabamento de renderização.
- [x] Registrar lacunas e uma ordem recomendada com critérios de conclusão em [docs/VISUAL_TARGET.md](docs/VISUAL_TARGET.md); sincronizar os três arquivos de progresso.

Resultado: a maior diferença visual está nos modelos/materiais detalhados e na composição. GLBs estáticos texturizados permitem começar um interior piloto com a base existente. Na análise inicial, texturas para estruturas/terreno, prefabs de usuário, distribuição de vegetação, miniaturas 3D pela interface, poças e efeitos locais foram apontados como trabalho futuro; materiais e emissores por objeto são tratados no incremento abaixo.

Validação desta revisão: consistência das seções e links locais da documentação; nenhum código alterado. As contagens de testes acima registram as validações anteriores.

## Materiais texturizados e efeitos locais — concluídos

Plano de implementação autorizado em 4 de outubro:

1. [x] Biblioteca local de madeira, pedra, grama, metal, areia, tijolo, concreto e lama, com cor, rugosidade e relevo aparente; aplicação em estruturas/objetos por material e mistura nas camadas do terreno.
2. [x] Controles de material, escala e relevo no inspetor, preservando documentos antigos, histórico, duplicação e apresentação.
3. [x] Fogo e fumaça vinculados a objetos, com partículas animadas, luz do fogo, limites de custo, pausa e qualidade por janela.
4. [x] Validar domínio, renderização real no navegador, edição/salvamento/projetor e descarte; documentar uso e atualizar as pendências reais.

Validação final: build e 123 testes unitários/de integração passaram, assim como a suíte completa de 14 E2E. Após revisar acabamento por material, veios/filtro das texturas e seleção da fumaça, os cinco E2E de ambientes, materiais/efeitos e pintura do terreno passaram novamente. Os dois E2E de materiais/efeitos foram repetidos após o último ajuste de composição das chamas e preservação dos overrides de cena, e passaram.

Verificados: oito materiais com pixels distintos, mistura no terreno, isolamento de cor/acabamento por material, prioridade de overrides, colocação/duplicação, animação sem editar histórico, pausa/movimento reduzido, qualidade por janela, câmera publicada independente e fidelidade após reiniciar navegador/servidor. Atlas e recursos dos emissores têm descarte verificado. Captura revisada: `test-results/materials-fire-smoke.png`. Servidores locais/Chromium executados fora do sandbox após bloqueio de loopback (`listen EPERM`); WebGL por software, sem benchmark presencial. Uso e limites: [docs/MATERIALS.md](docs/MATERIALS.md).

Texturas em estruturas/objetos, mistura no terreno e emissores de fogo/fumaça por objeto ficam nas entregas. Importação de texturas avulsas/fotográficas, decals, múltiplas regiões de chuva/poeira/brasas e colisão continuam como pendências reais.

## Personalização dos materiais — concluída

Pedido de 4 de outubro de 2026: tornar o desenho e a cor das texturas editáveis. Plano: controles de recoloração, brilho, contraste, saturação e rotação; quantidade/orientação/juntas/veios da madeira; padrões e desgaste do metal; densidade e seed das demais superfícies. Os ajustes serão opcionais para preservar documentos existentes e estarão disponíveis em materiais e camadas do terreno.

Entregue: recoloração preservando detalhes, paleta original/multiplicação, brilho/contraste/saturação, rotação, densidade e seed; madeira com tábuas por repetição, orientação, juntas/veios, madeira contínua e parquet; metal escovado/liso/xadrez/ondulado/enferrujado e oxidação. Controles por material e camada do terreno; opções avançadas conservam sua abertura durante a edição. Campos opcionais preservam documentos antigos, máscaras, histórico, duplicação/mapas, JSON, salvamento e projetor.

Atlas personalizados compactos compartilham desenhos equivalentes e são liberados ao descartar seu último material; cache CPU limitado a 32 tiles. Cor e orientação usam parâmetros de shader. Uso e limites em [docs/MATERIALS.md](docs/MATERIALS.md); roteiro manual em [docs/TESTAR_CONSTRUCAO.md](docs/TESTAR_CONSTRUCAO.md).

Validação final: build, 126 testes unitários/de integração e três E2E afetados passaram. Os oito testes específicos e dois E2E de materiais/efeitos foram repetidos após a revisão final e passaram. Pixels WebGL verificam recoloração verde, escurecimento, saturação zero, padrões distintos de madeira/metal, compatibilidade sem os novos campos, base com oito camadas personalizadas e descarte. UI verifica controles, desfazer/refazer, máscaras, reinício/salvamento, projetor e câmera independente. Captura revisada: `test-results/custom-materials.png`. WebGL por software; sem benchmark presencial. Resumos PROGRESSO.md e docs/PROGRESSO.md sincronizados.

## GitHub Pages — concluído

Pedido de 4 de outubro de 2026: corrigir assets ausentes e permitir uso normal em hospedagem estática. Diagnóstico: caminhos absolutos apontam à raiz do domínio e a biblioteca/persistência dependem de `/api/tabletop`, que só existe no servidor Node local. Plano: caminhos relativos ao diretório publicado, repositório IndexedDB para cenas/mapas/ambientes/assets/classificação, manutenção do backend local, build/workflow do Pages e teste de navegador servindo apenas arquivos em subdiretório.

Entregue: base relativa do build e resolução de catálogo/assets/favicons/projetor no diretório publicado; biblioteca IndexedDB para cenas/mapas/ambientes/imports/classificação, com validação de documentos/referências, revisões e conflitos entre abas, transações com backups limitados e URLs Blob temporárias recriadas ao reabrir. Biblioteca, rascunhos e última cena ficam isolados por origem/diretório; UI identifica salvamento no navegador. O modo com API Node continua disponível. Build estático em dist-pages/, preview e workflow de GitHub Pages prontos.

Validação final: builds local e estático, 127 testes unitários/de integração e quatro E2E afetados passaram (Pages/IndexedDB, biblioteca e recuperação local). O teste estático serviu arquivos em /Tabletop/ sem API, verificando paths HTTP, previews/modelos, imports PNG/GLB, cenas/mapas/ambientes, salvamento após fechar/reabrir navegador, projetor/câmera independente e isolamento em outro diretório/raiz. Transações verificaram conflitos de documentos/classificação, refs inválidas, backups limitados e rollback em falha de espaço. Os 161 modelos e suas prévias estão presentes no build. Captura: test-results/github-pages.png. Chromium/WebGL por software; sem benchmark presencial.

Uso/publicação e limites em [docs/GITHUB_PAGES.md](docs/GITHUB_PAGES.md); README/arquitetura e resumos PROGRESSO.md/docs/PROGRESSO.md sincronizados. Workflow validado localmente; envio do código e seleção de GitHub Actions em Settings → Pages são necessários para atualizar a publicação online. Dados pessoais ficam neste navegador; transporte de cena+assets e sincronização entre computadores continuam fora desta entrega.

## Pendências atuais

Somente trabalho ainda não concluído. A prioridade visual está em [docs/ORGANIC_WINTER_PLAN.md](docs/ORGANIC_WINTER_PLAN.md), complementando [docs/VISUAL_TARGET.md](docs/VISUAL_TARGET.md).

- Obter aceitação visual do novo mapa; refinar os pontos concretos identificados nessa revisão.
- Materiais autorais/fotográficos, desgaste regional e depósitos locais editáveis nas rochas.
- Medir edição/renderização no notebook/projetor reais; otimizar conforme os resultados.
- Expansão de conteúdo autoral/decoração e miniaturas estáticas para o mapa piloto; avaliação visual em câmera próxima.
- Texturas fotográficas específicas, importação de texturas avulsas/variantes e decals de desgaste/sujeira.
- Pincel regional de distribuição e entulho; umidade, reflexos dos objetos na água e refinamento da neve em apoios anotados de props/pisos/gelo.
- Fluxo dedicado de miniaturas 3D vinculadas a personagens/tokens; rig, poses e animação como evolução posterior.
- Acabamento de contato/reflexos e otimizações para cenas densas (LOD, instanciamento e particionamento/streaming), conforme medição.
- Acompanhamento automático de tokens; caminhos de câmera e colisão com paredes.
- Avaliação presencial do movimento/legibilidade no notebook e projetor.
- Pacote único de cena + assets (opcional).
- Receitas e prefabs adicionais e auto-layout entre cômodos.
- Coleções/variantes de assets, sockets específicos por asset e glTF com texturas externas.
- LAN, conforme [roadmap](docs/ROADMAP.md). Integrações Ficha/Jukebox adiadas por orientação do usuário.
- Volumetria com sombras/espalhamento por luz, múltiplas regiões de chuva/poeira/brasas, colisão de partículas e efeitos adicionais dependentes de benchmark.

## Integração das alterações remotas — concluída

Os quatro commits remotos foram integrados preservando a remoção de data/ do .gitignore. A base relativa continua atendendo /Tabletop/ e outros diretórios. O workflow antigo foi substituído pelo pages.yml, evitando duas publicações concorrentes e mantendo Node 22, build:pages e persistência no navegador. Validação: build:pages e os 127 testes unitários/de integração passaram após a resolução dos conflitos. Integração registrada em um merge, preservando os históricos local e remoto.

## Análise do primeiro mapa de montanha — concluída

Referência e prioridades registradas em docs/VISUAL_TARGET.md. O piloto atual substitui a prioridade anterior de escritório: trilha, ruína, paredão e pinheiros. Lacunas apontadas nesta análise: kit detalhado de montanha/arquitetura antiga, neve acumulada/material próprio, água, distribuição de vegetação e prefabs. Material de neve e cobertura visual foram entregues no incremento de composição abaixo; volume físico continua futuro. Pintura branca, terreno esculpido, estruturas, importação GLB, névoa e iluminação já permitem uma primeira versão simplificada. Jukebox e Ficha ficam adiados. Revisão documental; nenhum recurso novo implementado ou teste de código executado nesta análise.

## Composição de terreno e rochas — concluída

Plano autorizado: acrescentar rocha natural e neve ao acervo procedural; distribuir camadas do terreno por inclinação/altura com transições e variação em metros; aplicar cobertura independente (por exemplo neve nas faces superiores) em rochas/estruturas/GLBs. Preservar pintura manual, materiais existentes, apoios, histórico, salvamento e projetor. Validar pixels WebGL, controles e persistência antes de concluir. Este incremento melhora superfícies; água, kits detalhados e geometria de acúmulo continuam posteriores.


Entregue: dez superfícies locais, com rocha natural fraturada/estratificada/granito e neve; fissuras, densidade, seed, cor/brilho e relevo editáveis. Camadas do terreno agora alternam entre pintura manual e distribuição automática por faces superiores, encostas ou toda a superfície, com limite/transição de inclinação e altura mundial, irregularidade/tamanho de manchas/seed. Máscaras manuais, ordem/opacidade, reamostragem e apoios permanecem preservados. Cobertura independente sobre material original de estruturas/props/GLBs, por slot, com textura/cor/quantidade/relevo próprios. Normais corretas sob rotação/escala não uniforme e facetas.

Construir → Terreno e relevo → Montanha · rocha e neve cria um terreno comum com alturas, rocha, neve automática e trilha manual, sem regeneração posterior ou alteração de outras entidades. UI mantém as opções recolhíveis abertas; pintura em camada automática orienta retornar à pintura manual.

Validação final: builds local/Pages, 131 testes unitários/de integração e seis E2E afetados passaram (materiais/efeitos/UI/pixels, montanha, pintura do terreno e os dois de Pages/IndexedDB). Pixels verificam neve clara sobre base escura, laterais e faces inferiores expostas, quantidade zero, limite de altura, manchas/seed, normais transformadas e distribuição automática com máscara manual vazia. UI verifica edição, undo/redo, salvamento/reabertura, cobertura/presets no projetor sem mudar sua câmera, botão de montanha e regressão de pintura. Captura revisada: test-results/mountain-surfaces.png. A suíte completa de 17 E2E não foi repetida neste incremento; Chromium/WebGL por software não estabelece benchmark presencial.

Limites: cobertura visual sem volume físico ou teste de exposição ao céu; objetos sob teto também podem receber cobertura. Os modelos antigos de rochas conservam suas formas simplificadas; o novo kit de malhas irregulares foi entregue no incremento abaixo. Água/gelo, neve caindo, vegetação distribuída, decals e benchmark continuam pendentes. Uso em docs/MATERIALS.md; VISUAL_TARGET.md e resumos sincronizados. Jukebox/Ficha permanecem adiados.

## Geometria de rochas e paredões — concluída

Plano de 5 de outubro: acrescentar um kit original de rochas irregulares, granito, paredão estratificado e entulho; preservar todos os assets anteriores. Gerar malhas fechadas com limites de detalhe e dimensões métricas, pivot na base e prévias da própria geometria. Expor forma/irregularidade/detalhe/seed por instância, conservando transform, materiais, neve, histórico, mapas e apresentação. Validar geometria/raycast, biblioteca, edição/reabertura/projetor e Pages; atualizar visual target e resumos. Água, acúmulo físico de neve e integração Ficha/Jukebox continuam posteriores.


Entregue em 5 de outubro: quatro assets adicionais (Rocha fraturada, Matacão de granito, Paredão estratificado e Entulho rochoso), totalizando 165. Malhas fechadas e soldadas com volumes/faces irregulares, ondulações e estratos; limites de detalhe, bounds métricos, pivot na base e prévias SVG da geometria real. Todos os 161 registros/modelos/prévias anteriores permaneceram idênticos. Geometria da rocha expõe formação, irregularidade, detalhe 2–8, seed e restauração por instância. Colocação aplica rocha natural/padrão correspondente; edição conserva dimensões/base, transform, material/neve, histórico, duplicação, mapas, JSON e projeção filtrada. Cache conserva receitas; cada instância possui e descarta suas malhas/materiais.

Validação final: builds local/Pages, 134 testes unitários/de integração e sete E2E afetados passaram (montanha/UI/projetor, pixels/descarte de rochas, dois Pages/IndexedDB, biblioteca e dois materiais/efeitos). Verificados fechamento de bordas, números finitos, raycast, bounds/base com mudanças de seed/forma/detalhe, determinismo, comandos inválidos atômicos, formas diferentes em pixels WebGL, detalhe/cobertura de neve e liberação de recursos. UI verifica colocar pela biblioteca, editar/restaurar/undo/duplicar, salvamento/reabertura e geometria recebida pelo projetor sem alterar a câmera; Pages salva/reabre uma rocha personalizada sem API. Após reduzir o trabalho da geração, builds, suíte de 134 e o E2E de pixels foram repetidos; os três testes específicos passaram novamente após revisão do tratamento de falhas. Captura revisada: test-results/mountain-rock-geometry.png. A suíte completa de 18 E2E não foi repetida; WebGL por software não representa benchmark presencial.

Pendências de conteúdo: ampliar variedade/decoração, decals e neve caindo; kit alpino, água/gelo e acúmulo físico/exposição ao céu foram entregues no incremento seguinte; distribuição/LOD/instanciamento conforme medição. O novo kit é cenográfico, sem apoio automático de tokens, colisão de câmera, escultura livre ou geração de cavernas. Uso em docs/ASSET_LIBRARY.md; VISUAL_TARGET.md, README, Pages, arquitetura e resumos sincronizados. Ficha/Jukebox continuam adiados.

## Autoria de terreno natural — concluída

Revisão de 5 de outubro: distinguir alvenaria de rocha natural, esculpir relevo contínuo sem repetir assets, tornar área/expansão visíveis, apresentar a montanha como preset manualmente editável e impedir interseção com pisos existentes. Preservar alturas/máscaras/apoios, histórico, salvamento e câmera independente do projetor; verificar microrelevo em pixels e revisar documentação.

Entregue: pincel Esculpir rocha natural com formações fraturada/estratificada/granito, força, tamanho em metros e seed, variando pela posição mundial. Altera alturas comuns e apoios sem mudar pintura; repassar acumula o efeito. Área do terreno fora das opções avançadas, com expansão/recorte em metros (continua bordas, reamostra alturas/máscaras) ou alongamento explícito; centro X/Z na criação. Circular/bordas suaves para encostas, quadrado/duro/nivelar para patamares; Piso/Plataforma para alvenaria regular. Suave/Facetas altera iluminação, não alturas. Pedra · blocos de alvenaria conserva ID/desenho e distingue Rocha natural.

Montanha é preset assistido com prévia/aceitar/cancelar, sem escrita antes de aceitar nem gerador vinculado; mesma composição pode ser montada manualmente. Respeitar pisos na criação/pincéis limita relevo sob contornos sólidos rotacionados/poligonais, respeitando furos grandes, com margem de triângulo/transição idempotente; no traço, limita somente vértices alterados. Prévia · ajustar sob construções corrige terrenos existentes, sem mover estruturas independentes. Relevo aparente explicado/desativado sem textura: simula detalhes de iluminação, não volume. Corrigidas linhas nas repetições do atlas, usando derivadas antes do wrap e margem conforme o mip, sem contaminação por tiles vizinhos.

Validação final: builds local/Pages, 137 testes unitários/de integração e nove E2E afetados passaram após a revisão final (montanha/UI/projetor e geometria/pixels, autoria de terreno/UI e microrelevo/filtro, pintura, dois materiais/efeitos e dois Pages/IndexedDB). Domínio verifica campo coerente/determinismo/variações/raycast/apoios, expansão em metros versus alongamento e máscaras/histórico/mapas, proteção sob pisos rotacionados/côncavos com furos, triângulos e idempotência. UI verifica prévia sem escrita/cancelamento, preset em X/Z com proteção, escultura/undo, expansão/alongamento, controle de microrelevo, salvamento/reabertura e câmera independente após aguardar o primeiro enquadramento do projetor. Pixels confirmam microrelevo em base/camadas, geometria preservada, cor lisa sem efeito e tile constante com vizinhos contrastantes em três escalas. Captura final revisada: test-results/terrain-authoring.png, sem as linhas de repetição. A suíte completa de 20 E2E não foi repetida; WebGL por software não representa benchmark presencial.

Limites e pendências reais: heightmap até 64 divisões e uma altura por XZ, sem saliências/cavernas; reamostragem pode perder detalhes. Proteção é operação sobre pisos existentes, sem vínculo/solver de colisão ou proteção contra props/GLBs; mudanças numéricas, de tamanho/malha/posição e novas construções exigem revisão/reaplicação. Ampliações continuam bordas sem encaixe automático entre terrenos. Kit alpino, água/gelo e neve física entregues no incremento seguinte; decals e expansão de conteúdo continuam pendentes; Ficha/Jukebox adiados. MATERIALS.md, STRUCTURAL_EVOLUTION.md, TESTAR_CONSTRUCAO.md, VISUAL_TARGET.md, arquitetura e resumos sincronizados.

## Paisagem de montanha: arquitetura, vegetação, água/gelo e neve física — concluída

Plano executado: kit original de arquitetura antiga com vãos/arquivoltas, alvenaria irregular e madeira texturizada; vegetação ramificada/folhagem com variações e distribuição assistida editável; superfícies de água animada e gelo com contorno/dimensões/estado/espessura, mantendo apoios coerentes; neve física opcional no terreno e nas faces superiores de objetos, com exposição ao céu. Preservar os 165 assets anteriores e documentos antigos, histórico/mapas/salvamento/Pages, descarte de recursos e câmera independente. Validar domínio, geometria/raycast/apoios, pixels WebGL, edição/propostas/persistência/projetor e regressões antes de concluir. Ficha/Jukebox continuam adiados.

Entregue: 11 assets originais adicionais (alvenaria irregular, arco com vão, contraforte, passarela, telhado, lanterna e cinco plantas alpinas), texturas de casca/folhagem/gelo e geometria de plantas variável. Paisagem ganhou distribuição com prévia editável e superfícies poligonais de água/gelo. Cobertura de neve aceita espessura real; o terreno preserva suas alturas base e atualiza apoios sobre a camada, enquanto objetos recebem malhas de cobertura e verificam exposição ao céu. Máscara de exposição do terreno é persistida e pode ser recalculada depois de alterar abrigos.

Verificações iniciais concluídas: 143 testes unitários/de integração aprovados e os dois novos E2E passaram. O navegador confirmou controles de paisagem, distribuição sem escrita antes de aceitar/cancelar, undo/redo, água por desenho, gelo, neve com espessura/exposição, persistência/reabertura e projetor com câmera independente. Pixels WebGL confirmaram mudanças de ondas, gelo e geometria nevada, pausa e descarte de recursos relativo à linha de base. Otimizado o teste vertical de exposição por índice espacial dos triângulos das copas, preservando frestas/vãos reais. Captura revisada em perspectiva: test-results/alpine-landscape.png.

Revisão adicional: isolamento visual de andares não altera abrigo/exposição nem remove coberturas de neve ao reconstruir a cena; seleção aceita também o volume acrescentado. Novo teste de navegador aprovado. Acrescentados testes de vãos reais no teto e aplicação por slot, corrigindo o tratamento dos grupos de uma geometria com material único. A regressão de pixels identificou uma expectativa antiga de dez superfícies; atualizada para o catálogo atual de treze e aprovada na repetição. Pages ganhou verificação explícita de gelo/neve e uma planta ramificada variável, além do acervo/IndexedDB já verificados.

Validação final: builds local e Pages aprovados; 144 testes unitários/de integração e 23 roteiros E2E aprovados por suíte e repetições. A suíte de 22 concluiu com uma falha de expectativa antiga (dez versus treze materiais), corrigida; sete casos afetados foram repetidos na versão final e passaram (paisagem/UI, paisagem/pixels, materiais/UI, materiais/pixels, Pages/UI, Pages/IndexedDB e isolamento/seleção da neve). O novo teste de isolamento amplia a suíte para 23. Pages verificou gelo com neve e abeto com seed personalizados, salvamento/reabertura e assets dentro do caminho do repositório. Catálogo preserva exatamente os 165 registros anteriores; 176 IDs únicos, e receitas/prévias anteriores sem alteração. Links locais e git diff --check aprovados. Captura final revisada: test-results/alpine-landscape.png. WebGL por software não representa benchmark presencial.

Pendências remanescentes deste objetivo: expansão de espécies/decoração/conteúdo autoral, pincel regional/entulho, texturas fotográficas/decals, acúmulo temporal/derretimento da neve, suporte à camada de neve nos apoios anotados de props/pisos/gelo, reflexos/refração da cena na água e desempenho/LOD/instanciamento para mapas densos. Máscara de exposição do terreno deve ser recalculada após alterar abrigos/tamanho/posição; a geometria conserva a resolução do heightmap. Guias e três relatórios de progresso sincronizados; uso em [docs/LANDSCAPE.md](docs/LANDSCAPE.md). Ficha/Jukebox continuam adiados.
