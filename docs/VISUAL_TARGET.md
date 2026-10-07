# Cenários detalhados — comparação com as referências

Revisão em 5 de outubro de 2026, a partir das sete imagens de Tabletop de Ordem Paranormal fornecidas pelo usuário e do código atual do projeto. Este documento registra lacunas e uma ordem recomendada de trabalho, atualizado após materiais personalizáveis, emissores locais e composição de terreno/rochas com neve; uso em [MATERIALS.md](MATERIALS.md).

## O que determina o resultado visual

A maior diferença está no conteúdo visual e na montagem: modelos com formas detalhadas, materiais texturizados, arquitetura coerente, vegetação e muitos objetos pequenos que contam a história do lugar. A biblioteca atual cobre vários temas, mas os 161 modelos anteriores são receitas de caixas, cilindros e esferas com materiais de cor, rugosidade, metalicidade e emissão, agora com substituição por treze texturas procedurais locais. O catálogo agora inclui quatro peças de rocha com malha irregular e geometria editável, e onze peças de arquitetura/vegetação alpina, mais doze peças de paredões e complementos de montanha, totalizando 220 modelos após os complementos orgânicos, de inverno e as 18 peças da igreja. Isso ajuda a montar a disposição dos objetos; aumentar apenas a quantidade de receitas não produz o acabamento visto nos escritórios, na catedral ou no terreno lamacento.

A base de autoria e atmosfera já permite construir pisos, paredes, vãos e andares, esculpir terreno, posicionar objetos, ajustar luzes/sombras, escolher tarde/noite, exibir céu/lua, acender materiais por horário e publicar uma câmera independente. É possível começar um cenário mais detalhado hoje importando modelos estáticos com texturas embutidas no GLB. Ainda é necessário produzir ou obter esses modelos e compor o mapa.

As imagens mostram o resultado final. Elas não permitem determinar o motor, os algoritmos de iluminação, quais efeitos são pré-calculados ou o desempenho da ferramenta de referência.

## Comparação por tipo de cenário

| Referência | Base disponível | Trabalho necessário para aproximar o resultado |
| --- | --- | --- |
| Salão industrial com janelas vermelhas e pilares orgânicos | Paredes/vãos, luzes coloridas, materiais emissivos, fog e bloom | Kit de vigas, treliças e arquitetura industrial; modelos orgânicos específicos; superfícies de metal/concreto desgastadas; decoração e iluminação local cuidadosamente posicionadas. |
| Pátio urbano à tarde e skyline à noite | Horários, Kelvin/HSV, sol/lua, céu/nuvens, sombras e vínculos de janelas/luzes por horário | Fachadas modulares texturizadas, ruas/calçadas, árvores e vegetação detalhadas, objetos urbanos e composição dos quarteirões. Separar os materiais das janelas nos modelos permite configurar os vínculos por horário. |
| Escritório doméstico com personagens | Construção, móveis básicos, importação GLB, luzes e câmera próxima | Modelos de móveis com curvas e detalhes, madeira/tecido/plástico texturizados, pequenos objetos pessoais e miniaturas 3D de corpo inteiro. |
| Arquivo/escritório deteriorado | Receita de escritório, posicionamento, apoios e iluminação pontual/spot | Arquivos, papéis, equipamentos e luminárias detalhados; desgaste, sujeira e variações de material; composição menos regular e acabamento nas sombras de contato. |
| Catedral/ritual com velas e ruínas | Luzes quentes/vermelhas, flicker, emissão, névoa e bloom | Arquitetura específica com arcos/altares, ruínas e entulho texturizados, objetos rituais e composição dos efeitos locais de chama/fumaça. A geometria pode começar como GLB estático. |
| Exterior lamacento com fogueiras | Relevo editável, mistura de texturas por camada, fog, luzes/flicker, fogo/fumaça locais e emissor global | Materiais autorais mais detalhados, marcas no chão, umidade/poças, vegetação distribuída e ruínas. |

## Lacunas de conteúdo e ferramentas

### 1. Kits de modelos e materiais detalhados — prioridade inicial

- Produzir kits coerentes de interiores, fachadas urbanas, ruínas/ritual e exterior, com escala métrica, pivot na base e materiais nomeados.
- Usar texturas de cor, relevo aparente por normal map e rugosidade para madeira, metal, concreto, tecido e desgaste. Os GLBs importados preservam seus materiais/texturas; não é preciso implementar um novo carregador para começar com arquivos compatíveis.
- Adicionar pequenos objetos de decoração: papéis, livros, cabos, utensílios, ferramentas, lixo e detalhes pessoais. Parte do catálogo já representa esses temas, mas precisa de modelos com o acabamento adequado para câmera próxima.
- Ampliar os materiais procedurais locais com importação de texturas avulsas/fotográficas e superfícies autorais. Variações procedurais de madeira/metal, recoloração/brilho/orientação, aplicação em estruturas/receitas, tamanho em metros e mistura por camada do terreno estão disponíveis em [MATERIALS.md](MATERIALS.md).
- Acrescentar decals, como manchas, inscrições, rachaduras e sujeira, para variar superfícies sem criar um modelo inteiro para cada variação.

### 2. Terreno, vegetação e superfícies molhadas

As camadas pintáveis agora misturam cores e texturas procedurais de lama, grama e pedra, com relevo aparente e variação de rugosidade. A última imagem ainda exige materiais autorais, vegetação e superfícies molhadas mais detalhadas.

- Ampliar o acervo do terreno com texturas autorais/fotográficas, conservando escala, máscaras e transições disponíveis.
- Camadas por inclinação/altura, rocha natural, neve e cobertura visual por objeto estão disponíveis em [MATERIALS.md](MATERIALS.md); neve com espessura e exposição ao céu estão disponíveis em [LANDSCAPE.md](LANDSCAPE.md).
- Distribuição com prévia, seed, variação de escala/rotação/geometria, exclusão de construções e apoio no terreno entregue para cinco plantas alpinas. Pincel regional, entulho e expansão de espécies continuam pendentes.
- Água poligonal animada e gelo sólido entregues. Materiais de umidade e reflexos dos objetos na água continuam dependentes da solução adequada ao hardware. Reduzir rugosidade sozinho não entrega todo o aspecto do chão molhado.
- Resolução do relevo e densidade de objetos ajustadas ao tamanho do mapa e ao orçamento de renderização, medidos em uma cena piloto.

### 3. Montagem reutilizável

Grupos ancorados e copiar/colar já permitem mover composições como uma unidade. Falta uma biblioteca de prefabs do usuário para guardar, catalogar e reutilizar uma mesa decorada, uma fachada, um altar ou uma fogueira com seus objetos/luzes. Auto-layout entre cômodos e sockets específicos por asset também seguem pendentes.

O objetivo é montar mapas a partir de kits e composições consistentes, mantendo edição individual e undo/redo, sem repetir manualmente toda a decoração em cada cena.

### 4. Miniaturas 3D de corpo inteiro

A interface atual prioriza tokens com base/cor e retratos em cartões. Um personagem estático pode ser importado como GLB e colocado como objeto; o renderer também possui suporte a referência de modelo na representação de token, mas falta um fluxo dedicado na interface para vincular a miniatura ao personagem, ajustar escala/footprint e preservar esse vínculo no uso cotidiano.

GLBs com rig ou animações são rejeitados na ingestão. Miniaturas estáticas já posadas bastam para o primeiro cenário semelhante às imagens; rig, troca interativa de poses e animação seriam uma evolução posterior.

### 5. Efeitos locais e acabamento de renderização

- Múltiplas regiões de chuva/poeira/brasas, colisão com tetos/paredes e efeitos adicionais. Fogo/fumaça ligados a objetos e luz do fogo estão disponíveis; o clima global mantém seu emissor separado.
- Avaliar oclusão ambiente para contato entre móveis, papéis, cantos e chão. Não há um passe dedicado de oclusão ambiente no pipeline atual.
- Avaliar iluminação/reflexos de ambiente para materiais metálicos e superfícies molhadas, junto com a qualidade das sombras e exposição.
- Feixes, sombras e espalhamento volumétricos por fonte continuam pendentes. Sua prioridade depende do cenário e do custo; materiais e modelos detalhados podem melhorar o resultado antes dessa extensão.

As sombras dinâmicas, flicker, névoa de distância/altura e bloom já existem. A necessidade de cada acabamento deve ser confirmada com a cena piloto, sem pressupor que as referências usam exatamente essas técnicas.

### 6. Escala e desempenho

Mapas urbanos/exteriores podem repetir muitas fachadas, árvores e objetos. LOD, instanciamento de malhas repetidas e particionamento/streaming espacial continuam pendentes. Antes de definir limites, medir tempo por frame, chamadas de desenho, memória e custo de texturas/luzes no notebook com editor e projetor ativos.

Os testes anteriores usam Chromium com WebGL por software e verificam funcionamento. Eles não estabelecem capacidade de uma cena densa no hardware de uso.

## Ordem recomendada e critérios de conclusão

| Etapa proposta | Entrega concreta | Como avaliar |
| --- | --- | --- |
| 1. Escritório piloto | Uma sala pequena com móveis texturizados, decoração detalhada e miniaturas estáticas, usando a importação GLB e a iluminação existentes | Conferir acabamento em câmera próxima, escala/apoios, salvamento/reabertura e apresentação independente; medir no notebook/projetor. |
| 2. Kits e autoria reutilizável | Biblioteca de prefabs e materiais autorais; pátio urbano com fachadas e árvores | Montar uma segunda composição reutilizando peças; alternar tarde/noite com janelas emissivas e luzes por horário; preservar edições e histórico. |
| 3. Exterior | Terreno com materiais autorais, vegetação/entulho distribuídos e umidade/poças | Comparar o chão e a densidade visual com a referência; verificar apoio dos tokens e custo de renderização. |
| 4. Ritual e efeitos | Arquitetura/objetos específicos, composição de velas/fogueiras com os efeitos locais e acabamento necessário | Verificar vínculo dos emissores, pausa/qualidade por janela, descarte de recursos e desempenho; acrescentar otimizações conforme as medições. |

Integrações Ficha/Jukebox, LAN, caminhos de câmera e importadores de outros VTTs têm utilidade própria, mas não são pré-requisitos para o detalhe visual dessas imagens. Esta ordem prioriza um mapa concreto antes de ampliar todos os sistemas.

## Evidência no projeto

- [Biblioteca e limites](ASSET_LIBRARY.md); receitas e preservação de materiais GLB em [`asset-cache.js`](../src/render/asset-cache.js).
- [Autoria estrutural](STRUCTURAL_EVOLUTION.md); terreno com cores por vértice em [`scene-objects.js`](../src/render/scene-objects.js).
- [Ambientes e horários](ENVIRONMENTS.md) e [iluminação](LIGHTING.md); implementação em [`renderer.js`](../src/render/renderer.js) e [`effects.js`](../src/render/effects.js).
- Fluxo de importação/colocação em [`application.js`](../src/app/application.js); rejeição de dependências, rigs e animações em [`server/assets.js`](../server/assets.js).
- Pendências gerais e cobertura em [PROGRESSO.md](PROGRESSO.md); andamento em [progress.md](../progress.md).

## Piloto atual: montanha com construções antigas

**Reavaliação de 5 de outubro:** a montagem anterior foi rejeitada pelo usuário. Rocha/neve orgânicas, queda/vento de flocos e vegetação/objetos detalhados foram implementados e usados na reconstrução integral. Novo exemplo editável e tempestade disponíveis, com capturas das cinco câmeras e fluxos de servidor/Pages/projetor verificados. Materiais fotográficos, desgaste regional, aceitação visual e benchmark presencial continuam futuros. O plano específico está em [ORGANIC_WINTER_PLAN.md](ORGANIC_WINTER_PLAN.md). As ferramentas abaixo continuam disponíveis; sua existência não resolve o acabamento visual do piloto.

Referência adicional fornecida em 4 de outubro de 2026: percurso nevado entre paredões rochosos, construções antigas, pinheiros, água e lanternas, com névoa clara separando os planos. Este piloto passa à frente do escritório na ordem recomendada; as demais etapas continuam como possibilidades posteriores. Jukebox e Ficha ficam adiados por orientação do usuário.

Disponível: escultura e pintura do terreno, estruturas e plataformas, escadas/rampas, pedra/madeira personalizáveis, pinheiro/rochas/coluna quebrada simplificados no catálogo, importação de GLB estático com texturas embutidas, névoa, iluminação fria e luzes quentes locais. Há agora material próprio de neve, camadas automáticas por inclinação/altura e cobertura visual nas faces superiores dos objetos. Neve com espessura, exposição ao céu, plantas ramificadas, distribuição com prévia e água/gelo estão disponíveis; uso em [LANDSCAPE.md](LANDSCAPE.md).

Prioridades para aproximar esta imagem:

1. Kits de rochas/paredões, arquitetura antiga e vegetação entregues. O incremento de [paredões e kit de montanha](MOUNTAIN_KIT.md) acrescenta faces verticais com camadas, saliências/reentrâncias, pináculo e oito complementos. Geometria editável permite variar instâncias. Materiais autorais/fotográficos, decals e montagem cuidadosa ainda são necessários para o acabamento da referência. Terreno por alturas continua sem cavernas; as peças acrescentam volumes reais sem escultura livre.
2. Material de neve e cobertura visual por inclinação/altura entregues; acúmulo geométrico/exposição ao céu e gelo entregues. Queda/vento no emissor e depósitos conectados foram implementados no complemento orgânico. Tempestade no piloto e comparação visual GPU entregues; pintura local de depósitos nas rochas permanece futura.
3. Água poligonal para córrego/poças entregue, com transparência, ondas e resposta à iluminação; reflexos dos objetos/refração continuam futuros.
4. Distribuição de cinco plantas com prévia entregue. Pincel regional/entulho e prefabs reutilizáveis seguem futuros. Colocação manual continua possível.
5. Medição no hardware de uso e acabamento de contato/reflexos conforme a cena exigir.

Primeiro recorte recomendado: uma trilha, uma ruína acessível, um paredão e poucas árvores. Avaliar enquadramento próximo e superior, apoio dos tokens, salvamento/reabertura e projetor antes de ampliar a montanha. Os incrementos implementados e sua validação são registrados em [progress.md](../progress.md).

Incremento de 5 de outubro: kit original de rocha fraturada, granito, paredão estratificado e entulho, com forma/irregularidade/detalhe/seed por instância, dimensões/base preservadas e materiais/neve existentes. O kit inicial de geometria de rochas saiu das pendências; o kit alpino e o incremento de paredões abaixo complementam esta entrega. Materiais autorais/fotográficos, decals e desempenho presencial continuam futuros. Uso: [ASSET_LIBRARY.md](ASSET_LIBRARY.md).


O incremento de autoria do terreno acrescenta relevo rochoso diretamente no heightmap (formação/tamanho/seed com campo espacial), expansão em metros, proteção sob pisos e prévia do preset de montanha. Textura Rocha natural e Pedra · blocos de alvenaria ficam explicitamente separadas; microrelevo continua sendo detalhe de iluminação, enquanto os pincéis mudam a geometria. Isso reduz a dependência de repetir props, mas o limite de 64 divisões e uma altura por XZ continua exigindo composição com malhas para grandes saliências, cavernas e paredões complexos.

Incremento alpino de 5 de outubro: kit com 11 peças texturizadas, vegetação ramificada variável e distribuição assistida, água/gelo com contorno editável e neve com espessura/exposição. Os recortes iniciais de arquitetura/vegetação, água/gelo e neve física saíram das pendências. Permanecem variedade/decoração autoral, decals, acúmulo temporal/derretimento, materiais fotográficos, apoios nevados de props/pisos/gelo, reflexos/refração, prefabs e desempenho presencial. [LANDSCAPE.md](LANDSCAPE.md) registra uso e limites; [progress.md](../progress.md) registra validação.

Reformulação de autoria em 5 de outubro: tarefas agrupadas por contexto, materiais com alcance explícito por camada/base e bibliotecas flutuantes. O pincel de água materializa contornos e escavação numa proposta desfazível; águas existentes oferecem ajuste de leito revisável para evitar interseção com relevo/neve. Fluxo e limites de resolução/contorno: [EDITOR_UI.md](EDITOR_UI.md). O terreno continua um heightmap e a água continua horizontal, sem cascatas ou simulação de inundação.

Incremento de paredões e montanha: quatro formações com malha própria (face, canto, saliência e pináculo), parâmetros de camadas/erosão/saliências e oito complementos locais. Os paredões deixaram de depender apenas de volumes arredondados. Torre com janela/interior aberto, canto de ruína, plataforma com apoio, cordas/poste, lanterna de parede, raízes e carroça quebrada disponíveis. Falta avaliar o recorte final do mapa do usuário no hardware de uso; ampliar materiais, neve localizada e acabamento de contato/água continua a próxima prioridade visual.

Escultura manual de superfícies: o pincel agora atua no terreno e nas oito rochas/paredões, incluindo faces verticais e topo. Elevar/Rebaixar corrige picos locais sem trocar seed; Projetar/Recuar, Suavizar e Aplainar permitem romper a repetição paramétrica. Traços persistem por instância com histórico/projetor independente. A etapa reduz a necessidade de ajustar números para cada acidente do relevo; mantém topologia e não constitui ferramenta de voxels/união/cavernas. Pintura regional de materiais em rochas, conteúdo autoral, decals, neve localizada e contato/água continuam futuros. [ROCK_SCULPT.md](ROCK_SCULPT.md).

## Cena piloto distribuída: passagem da montanha

A montagem passou a existir como cena editável em Abrir → Cenas → Cenas de exemplo, com terreno/leito, rio/gelo, paredões, ruínas, madeira, abetos, neve, névoa e cinco câmeras. Uma ruína alta foi acrescentada para conservar proporções das fiadas. A composição é uma aproximação estilizada da referência. A revisão confirmou como próximos passos materiais autorais menos repetitivos, desgaste/neve regional e refinamento da vegetação densa já integrada à nova composição; contato/reflexos devem ser avaliados no mesmo piloto antes de escolher novos passes. Plano e critérios em [EXAMPLE_SCENES.md](EXAMPLE_SCENES.md); essas features não foram implementadas nesta entrega.

A revisão anterior acrescentou encosta ascendente, lago na base, caverna lateral modular e ponte elevada, além da lanterna arredondada e correção dos elos. A avaliação posterior do usuário rejeitou o resultado; conteúdo e composição ainda não atingiram o objetivo. Paredões com saliências alinhadas, neve em prismas, copa rala e relevo regular motivaram os recursos orgânicos e a reconstrução integral já entregue. A imagem foi identificada pelo título do vídeo de ambientação de Icewind Dale; isso não identifica seu motor ou a origem dos assets. O terreno continua sem escavação volumétrica ou topologia arbitrária.

## Incremento de inverno · 5 de outubro

Formações orgânicas, padrão mineral, depósitos conectados de neve/vento e precipitação corrigida disponíveis. Vegetação densa, ramos curvos e nove peças de inverno com slots e cobertura de copa acrescentados; [WINTER_DETAIL.md](WINTER_DETAIL.md). Esses recursos saem das pendências de implementação básica. Novo mapa de 101 elementos/quatro luzes reconstruído, com tempestade, modelos reais e revisão GPU das novas peças/cinco enquadramentos; [EXAMPLE_SCENES.md](EXAMPLE_SCENES.md). Ainda faltam acabamento de materiais autorais/fotográficos/desgaste regional, pintura de depósitos nas rochas, aceitação visual e benchmark presencial. A inspeção geométrica e os testes funcionais não estabelecem paridade com Ordem Paranormal. [ORGANIC_WINTER_PLAN.md](ORGANIC_WINTER_PLAN.md).

## Incremento da igreja · 6 de outubro

Kit de 18 peças arquitetônicas/rituais entregue, incluindo perfis ogivais e semicirculares vazados, balcão curvo, nervuras/cobertura, torre, vitral translúcido, Dama de Ferro e Serafim. Conteúdo original reutilizável; não estabelece acabamento ou paridade com as referências. Desgaste fixo pode integrar os modelos; desgaste desenhado pelo usuário exige decals/máscaras ainda pendentes. [CHURCH_KIT.md](CHURCH_KIT.md).
