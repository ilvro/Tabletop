# Rocha orgânica e reconstrução da montanha

Data: 5 de outubro de 2026. Estado: **base técnica implementada, validação em andamento; reconstrução da cena pendente**.

A cena distribuída atualmente não atingiu o objetivo visual. Suas verificações de carregamento, apoios e persistência continuam úteis, mas não comprovam semelhança com a referência. Este plano substitui a sequência de acabamento de [EXAMPLE_SCENES.md](EXAMPLE_SCENES.md) para o piloto de montanha.

## Incremento técnico atual

Implementadas duas formações próprias (`organic`/`organic-cliff`) e dois assets, padrão mineral procedural, depósitos conectados de neve com espessura/vento, integração ao editor/apoios do terreno e correção da precipitação com deriva/rajadas. Cenas antigas conservam suas formas/cobertura por padrão. Uso e limites: [ORGANIC_WINTER.md](ORGANIC_WINTER.md).

A primeira captura ainda tinha pontas/manchas triangulares; o depósito passou a usar inclinação suavizada, filtragem de manchas, refinamento e bordas afinadas. A revisão no renderizador e a validação funcional estão em andamento. Isso não conclui a qualidade visual do plano: mapas PBR fotográficos, pintura localizada dos depósitos em rochas, vegetação/objetos detalhados e reconstrução do mapa continuam pendentes. Precipitação animada não constitui simulação contínua de depósito/derretimento.

## Referência e objetivo

Usar o quadro fornecido pelo usuário, identificado pelo título do vídeo **“Nevando ❄ | Ambientação de Inverno | Icewind Dale | 3 Horas”**, como referência de composição e acabamento. O título não identifica o motor nem a origem dos modelos. Não pressupor que o vídeo é uma captura do tabletop de Ordem Paranormal; as imagens de Ordem fornecidas anteriormente estabelecem a ambição de qualidade da aplicação.

Construir uma encosta ascendente com paredão escuro e caverna lateral, água na base esquerda, ponte à frente, construções antigas em diferentes alturas, abeto denso e neve irregular. O primeiro plano precisa funcionar em câmera próxima: silhueta rochosa quebrada, fissuras, neve depositada em saliências, madeira desgastada e lanterna arredondada realmente apoiada. Névoa e tempestade de neve devem separar planos sem esconder erros de montagem.

O mapa continuará sendo uma cena 3D editável, carregável em **Abrir**, com ferramentas reutilizáveis. Não usar um fundo rasterizado para aparentar uma cena navegável. Reconstruir a composição do zero depois de validar os recursos, em vez de apenas deslocar as peças da montagem atual.

## Diagnóstico confirmado e hipóteses

| Problema | Evidência no projeto | Correção necessária |
| --- | --- | --- |
| Paredões com ondas alinhadas | `cliffGeometry`, em `src/render/rock-geometry.js`, repete saliências em anéis horizontais; variação de seed não elimina a estrutura repetida | Nova formação orgânica com silhueta e fraturas locais, sem faixas contínuas atravessando a parede |
| Rocha parece alvenaria ou relevo uniforme | O padrão procedural fraturado de `surface-pixels.js` é celular; o estratificado usa bandas periódicas. O detalhe atual usa altura para perturbar normais | Material de rocha distinto da alvenaria, com detalhe em várias escalas e mapas de normal/rugosidade adequados |
| Neve angular e repetida | `physical-snow.js` acrescenta prismas independentes a triângulos expostos | Superfície conectada de depósito, sem paredes internas por triângulo, com bordas e espessura variáveis |
| Ausência de tempestade | O gerador do exemplo deixa `look.weather.type = 'none'` | Configurar o exemplo para neve e corrigir seu movimento |
| Movimento incorreto da neve | O shader em `atmosphere.js` inverte a direção vertical apenas para chuva; neve compartilha o sentido de poeira | Separar queda de neve, chuva e partículas ascendentes; adicionar deriva e rajadas |
| Abetos pouco volumosos | Ramos do kit alpino recebem leques estreitos de agulhas; a copa tem pouca massa entre níveis | Ramos secundários e agrupamentos de agulhas com volume e neve sobre os galhos |
| Gravetos artificiais | Ramos/galhos são predominantemente cilindros retos | Galhos curvos, afilados e bifurcados; casca, pontas quebradas e distribuição menos uniforme |
| Encosta regular | O gerador combina uma rampa suave com variação periódica pequena | Relevo em várias escalas, trilha controlada localmente, margens quebradas, afloramentos e depósitos |
| Objetos parecendo caixas de linhas | O renderer usa uma caixa wireframe como marcador de falha; destroços existentes também têm armações muito finas | Auditar falhas reais no navegador e substituir objetos pouco legíveis por modelos completos |

Auditoria local: os **19 modelos distintos** referenciados pelo exemplo foram encontrados e instanciados com vértices finitos, sem erro de receita. A montagem não contém caixas nem barris. O catálogo já possui **Caixa de madeira** e **Tambor industrial**; isso não equivale a um barril de madeira detalhado ou a uma caixa antiga aberta. Não atribuir toda forma quadrática a um asset inexistente sem verificar o carregamento no ambiente afetado.

Auditoria no Chromium/servidor local: os 19 arquivos de modelo responderam HTTP 200 e a cena abriu sem aviso de falha de asset. A atmosfera reportou zero partículas e clima `none`. O outro cartão da galeria solicitou `scenes/icewind-bridge.jpg`, ausente (HTTP 404); essa prévia precisa de correção, mas não explica a geometria dos objetos da montanha. O ambiente relatado pelo usuário e o build Pages ainda precisam de auditoria específica. As tentativas iniciais do roteiro não aceitaram a confirmação de descarte do rascunho vazio; a execução corrigida carregou a cena.

## Sequência de implementação

### 0. Verificar os objetos e estabelecer comparação

- Capturar o exemplo atual no renderizador e registrar modelos solicitados, respostas HTTP, mensagens de carregamento e marcadores de falha. Repetir com arquivos estáticos em `/Tabletop/`.
- Diferenciar BoxHelper de seleção, marcador de falha e geometria de destroços. Corrigir referência/caminho ou receita quando houver erro; registrar o caso concreto.
- Fixar duas câmeras para comparação: paredão próximo sob luz lateral e composição principal. Registrar chamadas de desenho, triângulos, texturas e custo de uma edição.

**Saída:** diagnóstico verificável dos objetos suspeitos e uma base de comparação. Uma contagem de entidades, isoladamente, não confirma modelos carregados.

### 1. Protótipo de paredão orgânico — primeira implementação visual

**Geometria**

- Acrescentar uma formação própria, preservando as formas e seeds antigas para não remodelar mapas salvos.
- Gerar o volume principal com ruído espacial em várias escalas, deformação do domínio e cortes/fraturas localizados. Grandes massas determinam a silhueta; saliências e cavidades rasas quebram o volume; detalhe fino complementa o material. Evitar senoides e fileiras de saliências como estrutura dominante.
- Manter paredes fechadas, orientação correta dos triângulos, dimensões métricas e pivot na base. Cavidades locais e saliências não exigem introduzir um sistema de voxels.
- Expor controles curtos: forma geral, fraturas, irregularidade, detalhe e seed; manter escultura direta com T como modo principal de ajuste local. Traços locais devem sobreviver a salvar/reabrir, duplicar e undo/redo.
- Produzir variantes de face, canto e afloramento com as mesmas regras, sem exigir muitas cópias idênticas para formar uma parede.

**Material**

- Separar explicitamente rocha natural de blocos de alvenaria. Cor escura, variação mineral, rugosidade e normal devem continuar legíveis quando a neve é removida.
- Usar projeção em metros e mistura entre faces para evitar alongamento nas paredes verticais. Combinar variação ampla com detalhe próximo para reduzir repetição visível.
- Criar uma opção de material detalhado com mapas de cor, normal e rugosidade. Começar com mapas locais destinados ao kit; importação avulsa geral pode vir depois. GLBs já preservam mapas, mas receitas/projeção procedural precisam de integração própria.
- Preservar recoloração e os materiais antigos. Overriding de cor não deve apagar mapas do material detalhado. Reutilizar e liberar texturas/geometrias no cache.
- Para mapas obtidos externamente, verificar a licença de cada fonte, guardar arquivos localmente e registrar autoria/origem/resolução. Não extrair modelos ou texturas do vídeo. A biblioteca Poly Haven declara seus assets CC0 em sua [licença oficial](https://polyhaven.com/license); escolher e conferir os materiais concretos antes de incluí-los.

**Arquivos principais:** `src/domain/rocks.js`, validação/comandos de rochas, `src/render/rock-geometry.js`, `rock-sculpt.js`, `surface-pixels.js`, `surface-materials.js`, `asset-cache.js`, `src/ui/rock-panel.js`, geradores do kit/catálogo e testes afetados.

**Critério para avançar:** o recorte com um paredão e uma lanterna precisa mostrar silhueta irregular e detalhe natural de perto e à distância. Não pode depender da névoa para esconder faixas horizontais, facetas regulares ou textura de tijolos. Comparar várias seeds e a geometria depois de um traço manual. Rever esse recorte antes de construir todo o mapa.

### 2. Neve depositada e tempestade

- Construir cobertura conectada nas superfícies expostas: vértices compartilhados quando a topologia permitir, continuidade de espessura e laterais apenas nas bordas do depósito. Remover o aspecto de prismas independentes.
- Usar inclinação, exposição ao céu e um campo coerente de vento/variação para formar placas e montes assimétricos. Rocha deve aparecer entre depósitos; paredes verticais não devem receber cobertura uniforme.
- Acrescentar depósitos locais editáveis e parâmetros de vento/espessura, conservando máscaras e histórico. Resolver bordas de neve contra a trilha, rochas e água, e coerência dos apoios onde houver volume caminhável.
- Corrigir o sentido da queda no shader de neve; variar tamanho, velocidade e deriva dos flocos, com rajadas. Configurar uma tempestade visível no exemplo, inclusive em planos próximos, sem depender apenas da névoa.
- Manter um emissor GPU com limites de qualidade, pausa e movimento reduzido por janela; não criar um objeto JavaScript por floco por frame.
- Separar dois comportamentos: **precipitação animada** e **acúmulo editável/persistido**. Esta etapa não promete simulação contínua de depósito/derretimento; esse sistema exigiria contrato próprio de tempo e persistência.

**Arquivos principais:** `src/domain/snow.js`, `src/render/physical-snow.js`, `surface-materials.js`, `atmosphere.js`, controles de ambiente/cobertura e apoios do terreno.

**Critério para avançar:** neve com espessura sem costuras triangulares evidentes, acumulada nas saliências do novo paredão e nos galhos. Flocos caem e seguem o vento. Pausar a tempestade não altera a forma salva dos depósitos.

### 3. Vegetação e objetos próximos

- Criar abeto detalhado com copa irregular, galhos secundários e agulhas agrupadas em diferentes direções. Medir o custo de transparência se forem usadas lâminas com alpha; escolher a técnica pelo recorte, não por contagem de folhas.
- Modelar neve sobre as massas de galhos, conservando tronco/casca visíveis. Variar volume, altura e densidade por seed sem deixar buracos grandes na copa.
- Acrescentar galhos secos curvos e bifurcados, raízes torcidas, pontas quebradas e pequenos tufos de vegetação emergindo da neve.
- Fazer barril de madeira com silhueta abaulada, tábuas e aros; caixa antiga fechada e aberta, com interior, tábuas e ferragens; destroços de madeira com espessura e bordas partidas. Reaproveitar modelos existentes apenas onde o acabamento for suficiente.
- Rever ruínas, madeira da ponte e suportes de lanternas no mesmo recorte: desgaste localizado, pedras desalinhadas e transições coerentes de neve.
- Agrupar partes por material e compartilhar recursos. Se a densidade exigir LOD/instanciamento ou edição incremental, implementar antes de expandir o mapa; não compensar queda de desempenho apenas reduzindo toda a vegetação.

**Critério para avançar:** abeto volumoso, barril e caixa reconhecíveis em câmera próxima, galhos sem aparência de hastes cilíndricas retas e nenhum wireframe usado como objeto final.

### 4. Reconstruir a cena inteira

- Refazer o gerador da composição, sem reutilizar a rampa e o corredor como base. Manter o identificador da cena de exemplo para substituir o original distribuído sem afetar cópias pessoais.
- Montar primeiro massas/silhuetas: paredão no primeiro plano esquerdo, percurso que sobe à direita, boca de caverna lateral e ponte à frente. Evitar duas paredes paralelas que transformem tudo numa passarela.
- Modelar terreno com variação espacial não periódica em várias escalas, preservando uma trilha utilizável. Compor saliências e cavidades com malhas; o terreno continua tendo uma altura por X/Z. Ajustar margens, pequenos taludes, afloramentos e drifts em vez de aplicar uma ondulação igual ao mapa inteiro.
- Inserir água/gelo seguindo margens irregulares, árvores e ruínas com sobreposição de planos, lanternas apoiadas, barris/caixas e detritos com escala e orientação naturais.
- Distribuir neve, sujeira e vegetação por regiões. Não usar a mesma cobertura em todos os objetos. Rever iluminação fria, contrastes locais e gradação da névoa com a tempestade ligada e desligada.
- Criar enquadramento principal próximo à referência, câmera da caverna, travessia/ponte e visões de autoria/superior. Conferir o mapa em outras direções para evitar uma montagem que funcione apenas numa câmera.

**Arquivos principais:** `scripts/generate-example-scenes.js`, `public/scenes/snowy-mountain-pass.json`, `src/data/example-scenes.js`, prévia e roteiro de captura.

### 5. Verificar a entrega funcional e visual

- Testar geometria/raycast, limites, determinismo, compatibilidade de cenas antigas, escultura, neve, materiais, histórico, salvar/reabrir e descarte de recursos.
- Verificar todos os arquivos/modelos no servidor e no Pages; exigir ausência de marcadores de falha. Conferir cópia independente do exemplo e câmera de trabalho separada da publicada.
- Capturar imagens **do renderizador real** nas câmeras principal, próxima e ampla. Registrar também a tempestade em movimento; movimento reduzido sozinho não verifica animação.
- Comparar composição, irregularidade das superfícies, densidade da copa, escala dos objetos, contato com o chão e leitura dos planos. Corrigir esses itens antes de marcar o objetivo visual como concluído.
- Medir custo antes/depois com editor e projetor. Testes em WebGL por software comprovam funcionamento, não desempenho no notebook real; registrar essa diferença e evitar orçamento de FPS inventado.
- Atualizar a prévia distribuída, guias de materiais/rochas/neve/exemplos e os três documentos de progresso a cada etapa. Recursos implementados ficam em entregas; refinamentos ainda necessários ficam em pendências.

## Limites e ordem de decisão

Esta é uma evolução de geometria, materiais, neve, vegetação e renderização, seguida de autoria da cena. Não é somente uma troca de assets. O primeiro marco é **um paredão orgânico convincente com material detalhado**; a neve é o marco seguinte. Uma captura que continue artificial exige rever o protótipo, antes de multiplicá-lo pelo mapa.

Reflexos da cena na água, oclusão ambiente e volumetria com sombras serão avaliados nesse recorte; não são pré-requisitos automáticos para corrigir as formas regulares. União booleana, terreno volumétrico, simulação contínua de neve, integrações Ficha/Jukebox e reprodução de assets comerciais não fazem parte desta reconstrução.

O objetivo é aproximar composição e acabamento da imagem e ampliar a capacidade de montar outros cenários com facilidade. Paridade com um tabletop comercial não deve ser declarada apenas por adicionar opções, assets ou testes.
