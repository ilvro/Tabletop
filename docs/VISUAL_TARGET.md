# Cenários detalhados — comparação com as referências

Revisão em 4 de outubro de 2026, a partir das sete imagens de Tabletop de Ordem Paranormal fornecidas pelo usuário e do código atual do projeto. Este documento registra lacunas e uma ordem recomendada de trabalho, atualizado após materiais personalizáveis, emissores locais e composição de terreno/rochas com neve; uso em [MATERIALS.md](MATERIALS.md).

## O que determina o resultado visual

A maior diferença está no conteúdo visual e na montagem: modelos com formas detalhadas, materiais texturizados, arquitetura coerente, vegetação e muitos objetos pequenos que contam a história do lugar. A biblioteca atual cobre vários temas, mas os 161 modelos anteriores são receitas de caixas, cilindros e esferas com materiais de cor, rugosidade, metalicidade e emissão, agora com substituição por dez texturas procedurais locais. O catálogo agora inclui quatro peças de rocha com malha irregular e geometria editável, totalizando 165 modelos. Isso ajuda a montar a disposição dos objetos; aumentar apenas a quantidade de receitas não produz o acabamento visto nos escritórios, na catedral ou no terreno lamacento.

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
- Camadas por inclinação/altura, rocha natural, neve e cobertura visual por objeto estão disponíveis em [MATERIALS.md](MATERIALS.md); geometria de acúmulo/exposição ao céu continua futura.
- Pincel de distribuição de vegetação/entulho com densidade, seed, variação de escala/rotação, apoio na superfície e possibilidade de editar/remover o resultado.
- Materiais de umidade e poças/água, avaliando a solução de reflexos adequada ao hardware. Reduzir rugosidade sozinho não entrega todo o aspecto do chão molhado.
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

Referência adicional fornecida em 4 de outubro de 2026: percurso nevado entre paredões rochosos, construções antigas, pinheiros, água e lanternas, com névoa clara separando os planos. Este piloto passa à frente do escritório na ordem recomendada; as demais etapas continuam como possibilidades posteriores. Jukebox e Ficha ficam adiados por orientação do usuário.

Disponível: escultura e pintura do terreno, estruturas e plataformas, escadas/rampas, pedra/madeira personalizáveis, pinheiro/rochas/coluna quebrada simplificados no catálogo, importação de GLB estático com texturas embutidas, névoa, iluminação fria e luzes quentes locais. Há agora material próprio de neve, camadas automáticas por inclinação/altura e cobertura visual nas faces superiores dos objetos. Acúmulo com volume físico e exposição ao céu continuam futuros.

Prioridades para aproximar esta imagem:

1. Kit inicial de rochas/paredões entregue com quatro peças de malha irregular e parâmetros por instância. Expandir arquitetura antiga/ruínas, pinheiros e lanternas com geometria e materiais detalhados. Terreno por alturas não representa saliências/cavernas; o novo kit acrescenta volumes reais, sem escultura livre ou geração de cavernas.
2. Material de neve e cobertura visual por inclinação/altura entregues; continuar com acúmulo geométrico/exposição ao céu, gelo e neve caindo conforme a necessidade do piloto.
3. Água para córrego/poças, com transparência, movimento e resposta à iluminação; uma superfície colorida funciona apenas como representação provisória.
4. Distribuição de vegetação/entulho e prefabs reutilizáveis para acelerar a montagem. Colocação manual continua possível.
5. Medição no hardware de uso e acabamento de contato/reflexos conforme a cena exigir.

Primeiro recorte recomendado: uma trilha, uma ruína acessível, um paredão e poucas árvores. Avaliar enquadramento próximo e superior, apoio dos tokens, salvamento/reabertura e projetor antes de ampliar a montanha. Esta revisão registra análise e prioridades, sem implementar recursos novos.

Incremento de 5 de outubro: kit original de rocha fraturada, granito, paredão estratificado e entulho, com forma/irregularidade/detalhe/seed por instância, dimensões/base preservadas e materiais/neve existentes. O kit inicial de geometria de rochas saiu das pendências; expansão de conteúdo autoral, arquitetura/vegetação, água/gelo, decals, acúmulo físico de neve e desempenho presencial continuam futuros. Uso: [ASSET_LIBRARY.md](ASSET_LIBRARY.md).
