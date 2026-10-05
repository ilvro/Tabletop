# Materiais texturizados, fogo e fumaça

Implementação em 4 de outubro de 2026. As configurações acompanham mapas/cenas, histórico, duplicação, JSON, salvamento e apresentação. Documentos antigos continuam válidos; nenhum material é aplicado automaticamente a construções antigas.

## Aplicar uma textura

Selecione piso, parede, porta, janela, escada, rampa, terreno ou objeto. No inspetor, abra **Material e textura** (para terreno, **Material base · terreno inteiro**; para pintar uma região, **Editar material de → Camada · nome** e **Pintar esta camada**) e escolha madeira, pedra, grama, metal, areia, tijolo, concreto, lama, rocha natural, neve, casca, folhagem ou gelo.

A escolha aplica a cor branca de matiz e o acabamento inicial do material. Depois ajuste; cor/desenho/brilho ficam em **Personalizar cor e padrão**:

- **Tamanho do padrão · m:** tamanho de uma repetição. Menor produz detalhes menores; maior amplia o padrão.
- **Relevo aparente · microdetalhe em m:** simula fissuras/veios na iluminação (bump), sem elevar vértices nem alterar silhueta, colisão ou apoio. Zero desliga; aparece melhor de perto e com luz lateral. Sem textura no material ou numa camada visível, o controle fica desativado: cor lisa não tem mapa de detalhe. No terreno, esse parâmetro controla também o detalhe das camadas; a cobertura tem intensidade própria.
- **Cor da textura:** recolore o material preservando os detalhes. Ao escolher uma cor, **Aplicação da cor** muda da paleta original para **Recolorir · preservar detalhes**. Também é possível escolher **Multiplicar pela cor** ou voltar à **Paleta original**.
- **Brilho:** 1 conserva a aparência original, valores menores escurecem e valores maiores clareiam; 0 deixa a textura preta. Para madeira escura, experimente 0,5–0,7.
- **Rotação do padrão:** gira o desenho em graus sobre cada face projetada.
- **Contraste, saturação e variação:** bloco recolhível com contraste, saturação (0 = cinza), densidade de detalhes e seed. A seed gera outro desenho determinístico; não altera a geometria ou a área pintada.
- **Cor / matiz**, **Rugosidade** e **Metalicidade:** personalizam o acabamento final. Cor / matiz multiplica a textura, inclusive a recoloração; deixe branca para ver a cor escolhida sem outra matiz. A textura possui variação local de rugosidade.
- Em objetos da biblioteca/GLB, **Aplicar acabamento em** permite escolher um material nomeado, como `wood`, conservando textura, cor e acabamento dos outros. **Todos os materiais** aplica a textura ao conjunto.

### Madeira

- **Padrão:** tábuas, madeira contínua sem juntas ou parquet em blocos com direções alternadas.
- **Tábuas por repetição:** 1–32, por repetição do padrão; no parquet, por bloco. Não é a contagem total de tábuas do objeto. Por exemplo, tamanho de padrão de 2 m com 8 tábuas produz tábuas de aproximadamente 25 cm; no parquet, os blocos ocupam metade da repetição.
- **Orientação:** horizontal ou vertical nos eixos projetados da superfície; pode ser combinada com a rotação em graus. A rotação do objeto e a posição da câmera não definem esses eixos.
- **Largura das juntas:** 0–15% da largura de uma tábua; zero remove o sulco.
- **Intensidade dos veios:** 0–1, alterando cor e altura aparente dos veios.

Exemplo: escolha madeira, 8 tábuas, vertical, juntas de 5%, brilho 0,6 e uma cor marrom para obter um piso de tábuas mais estreitas e escuras.

### Metal

**Padrão do metal** oferece escovado, liso, chapa xadrez, ondulado e enferrujado. **Desgaste / oxidação** controla a intensidade de manchas de oxidação em 0–100%; no padrão enferrujado, a ferrugem também aumenta a rugosidade e reduz a resposta metálica local. Tamanho do padrão, rotação e densidade alteram a escala/direção dos detalhes. O relevo é aparente; chapas onduladas continuam com a geometria do objeto original.

Selecionar outra textura reinicia os ajustes de cor/desenho/brilho para os valores iniciais do material escolhido, conservando o slot selecionado e as máscaras do terreno. Desfazer restaura a configuração anterior. Ajustes ausentes em documentos antigos equivalem aos padrões originais.

**Sem textura adicional** remove a substituição e volta a usar os mapas originais de um GLB, conservando seus ajustes de cor/rugosidade/metalicidade. Documentos e assets compartilhados não são modificados por outra instância.

As treze texturas são procedurais originais, geradas localmente, com cor, altura e rugosidade. O filtro usa derivadas antes de repetir o padrão e uma margem conforme o nível de detalhe, evitando linhas de repetição e mistura com cores de outras texturas no atlas. Não dependem de internet ou downloads. São um primeiro acervo de superfícies; modelos detalhados e materiais fotográficos específicos continuam úteis para aproximar as referências.

## Pintar materiais no terreno

**Editar material de** identifica explicitamente a camada ou a base. **Somente camada · nome** edita aquela camada; **Material base · terreno inteiro** edita o acabamento sob as camadas e os parâmetros compartilhados (microrelevo/cobertura). Veja o fluxo atual em [EDITOR_UI.md](EDITOR_UI.md).

Selecione o terreno e use **Material · escolha o alcance** no topo do inspetor:

1. Em **Editar material de**, escolha **Camada · nome**; abra **Somente camada · nome**.
2. Selecione a textura e o tamanho do padrão. Cada camada oferece os mesmos controles de cor, brilho, rotação, densidade/seed e desenho de madeira/metal dos materiais de objetos. Escolher uma textura reinicia os ajustes e a matiz da camada para branco, preservando a área pintada.
3. Para uma segunda superfície, use **Nova camada de material**, escolha outra textura e use **Pintar camada** com o pincel sobre o terreno.
4. **Apagar** revela as camadas de baixo. Opacidade, visibilidade e ordem continuam disponíveis; a última camada cobre as anteriores.

Até oito camadas podem misturar cores e texturas. As máscaras continuam acompanhando a malha ao esculpir ou alterar sua resolução. Um traço é uma operação de desfazer; Esc cancela. O relevo aparente e a rugosidade geral ficam em **Material e textura**. A textura geral serve de base para as camadas; camadas só de cor podem colori-la.

## Colocar fogo e fumaça

Em **Construir → Construções → Peças avulsas**, escolha **Fogueira** ou **Fumaça** e clique na superfície de apoio ativa. Selecionar um piso/terreno muda esse apoio; clique dentro dele ou escolha outro em **Estruturas e apoio**.

A fogueira usa o modelo existente de troncos/pedras com chamas animadas e luz pontual cintilante. Fumaça cria um emissor sem modelo visível. Também é possível selecionar qualquer objeto e escolher **Fogo e fumaça → Efeito neste objeto**.

O inspetor controla largura/altura/profundidade, deslocamento local, quantidade de partículas, velocidade, opacidade, cor e seed. O fogo tem **Intensidade da luz do fogo**; zero desliga sua luz. **Ocultar modelo** permite usar apenas o efeito. **Sem efeito** desativa a emissão.

O efeito acompanha posição, rotação, escala, apoio e composição do objeto. Duplicar cria outra instância com a configuração copiada. A seed conserva a variação, e a animação não grava frames no documento/histórico.

Na aba **Cena**, **Pausar efeitos animados** congela os efeitos. Movimento reduzido também pausa, e abas ocultas suspendem os frames. O controle de qualidade de volume/bloom/clima nesta janela também desliga as partículas locais; a luz do fogo permanece estática. A escolha de qualidade é independente no projetor e não edita o mapa.

## Dados, renderização e limites

- `material.texture` guarda um ID local ou `none`; `textureSize` aceita 0,05–50 m, `relief` 0–0,2 m e `textureSlot` identifica o material do objeto. A validação aceita esses campos opcionais e rejeita IDs/valores inválidos.
- Materiais e camadas do terreno aceitam os parâmetros opcionais `textureColor`, `textureColorMode`, `textureBrightness`, `textureContrast`, `textureSaturation`, `textureRotation`, `textureSeed`, `patternDensity`, `woodPattern`, `woodBoards`, `woodDirection`, `woodGap`, `woodGrain`, `metalPattern` e `metalWear`. Brilho/contraste/saturação aceitam 0–2; rotação 0–360 graus; seed inteira 0–65.535; densidade 0,25–4; tábuas inteiras 1–32; juntas 0–0,15; veios/desgaste 0–1. A interface apresenta juntas/desgaste em porcentagem. Valores não aplicáveis à textura escolhida são ignorados pelo desenho.
- Camadas do terreno conservam suas cores e máscaras. Misturam cor, altura aparente, rugosidade e resposta metálica local; a metalicidade geral do terreno permanece no material base.
- As superfícies usam projeção em três eixos e escala em coordenadas mundiais. Isso evita esticar texturas em paredes e terrenos sem UV, mas mover objetos pode deslocar o padrão sobre eles. Texturas autorais com UV continuam disponíveis no GLB original.
- Cada viewport possui duas texturas compartilhadas do acervo original. Desenhos personalizados usam atlas compactos de cor/detalhes, com até nove tiles (base + oito camadas), compartilhados por configurações equivalentes e liberados quando seu último material é descartado. Há cache CPU de até 32 tiles; cores, brilho, contraste, saturação e orientação usam parâmetros de shader e não criam novos pixels no cache. Fechar o viewport libera todas as texturas GPU. Cenas com muitos desenhos diferentes exigem mais memória que o acervo original.
- `prop.localEffect` persiste configuração e deslocamento do emissor. O limite é 512 partículas por emissor, 32 emissores ativos e 4.096 partículas locais por documento. Emissores desativados não alocam partículas no viewport. O clima global conserva seu limite independente.
- Partículas são planos voltados para a câmera, desenhados em lote por emissor, com turbulência, expansão/desvanecimento da fumaça e cor de chama variando durante a vida. São efeitos visuais, sem simulação de fluidos, propagação de incêndio, colisão com tetos/paredes ou sombras volumétricas.
- A luz do fogo não projeta sombras próprias e pode atravessar paredes. Luzes pontuais/spot com sombra podem ser adicionadas separadamente quando necessário.

Modelos fotográficos, upload de texturas avulsas/coleções de variantes nomeadas, decals, vegetação distribuída, poças/reflexos e benchmark presencial seguem como evolução. Uso de iluminação e ambiente: [LIGHTING.md](LIGHTING.md) e [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Validação

Os testes de domínio cobrem rejeição atômica, histórico, duplicação/mapas, filtragem de emissores privados, máscaras/reamostragem do terreno, isolamento por material, seeds e descarte. Os testes de navegador cobrem controles reais, colocação, pausa/qualidade, reabertura e projetor independente. A verificação WebGL compara pixels dos oito materiais, variantes de madeira/metal, recoloração verde e escurecimento, terreno personalizado misturado e fogo/fumaça animados; verifica compatibilidade visual sem os novos campos e liberação das texturas. A UI verifica persistência no projetor/reabertura, desfazer e máscaras conservadas.

Os resultados finais desta implementação são registrados em [progress.md](../progress.md). Capturas do fluxo: `test-results/materials-fire-smoke.png` e `test-results/custom-materials.png`. Chromium com WebGL por software não representa benchmark no notebook/projetor.

## Composição de montanha: rocha, neve e camadas automáticas

Incremento de 4 de outubro de 2026. **Rocha natural** é uma superfície sem blocos de alvenaria: oferece formações fraturada, estratificada e granito, intensidade das fissuras, rotação, densidade/seed e os mesmos ajustes de cor/brilho. **Pedra · blocos de alvenaria** mantém seu desenho anterior em blocos, separado da rocha natural; os IDs e mapas existentes não mudam. **Neve** acrescenta granulação e ondulações suaves, com cor, rugosidade e relevo aparente próprios.

### Começar um terreno

Em **Construir → Paisagem → Terreno e relevo**, ajuste largura/comprimento/resolução e centro X/Z. Abra **Presets de paisagem · construção assistida** e clique em **Prévia · Montanha · rocha e neve**; revise e aceite ou cancele. O documento só muda ao aceitar. **Respeitar pisos das construções**, ligado inicialmente, limita o terreno sob os pisos existentes. O resultado é um terreno comum com alturas editáveis, rocha natural, neve automática nas partes menos inclinadas e uma trilha de lama pintada. É um preset assistido, sem receita de regeneração vinculada: você pode construir manualmente a mesma composição com alturas e camadas, e editar tudo depois.

Para compor seu próprio terreno:

1. Selecione o terreno e a camada inicial. Abra **Editar material e propriedades**, escolha **Rocha natural** e ajuste seu tamanho/cor/formação.
2. Use **Nova camada de material**, escolha **Neve** e mude **Distribuição da superfície** para **Faces superiores / pouca inclinação**. Essa camada aparece mesmo com a máscara manual vazia.
3. Ajuste **Inclinação limite** (por exemplo 40°) e **Transição da inclinação** (por exemplo 12°). Neve cobre terrenos planos e desaparece gradualmente nas encostas.
4. Se quiser neve apenas no alto, ative **Limitar pela altura no mapa** e ajuste Y mínimo/transição. A altura é mundial, inclusive ao mover o terreno.
5. Ajuste irregularidade, tamanho das manchas em metros e seed. Acrescente uma camada manual acima para trilhas, sujeira ou outras intervenções.

Cada camada aceita **Pintura manual**, **Faces superiores**, **Encostas** ou **Toda a superfície**. Modos automáticos substituem temporariamente a máscara na renderização; conservam seus valores e sua reamostragem. Voltar à pintura manual recupera a máscara anterior. O pincel de pintura/apagar pede que se escolha Pintura manual; os pincéis de escultura continuam disponíveis. Ordem, visibilidade e opacidade das oito camadas continuam funcionando.

### Cobrir rochas e construções

Selecione um objeto ou estrutura. Em **Material e textura → Cobertura sobre a superfície**, escolha **Neve**. Ela cobre as faces superiores sobre o material atual, inclusive materiais/texturas originais de um GLB. É possível escolher outras superfícies, como grama ou lama.

A cobertura tem cor, tamanho da textura, quantidade, relevo e distribuição próprios. Ela respeita a escolha **Aplicar acabamento em** nos modelos, permitindo cobrir só a pedra ou a folhagem. Alterar a textura base conserva a cobertura; **Sem cobertura** a remove e desfazer a restaura. Cor escura na base não escurece a neve. Inclinação usa as normais transformadas, incluindo rotação, escala não uniforme e facetas do terreno; textura e variação usam metros no mundo.

### Limites e dados

Com espessura zero, a cobertura é visual e não verifica exposição ao céu. A opção de espessura da neve acrescenta geometria e verificação de abrigo, com máscara persistida para o terreno e atualização automática nos objetos; água/gelo e kit alpino estão disponíveis. A queda de neve foi corrigida no emissor global; depósitos orgânicos opcionais estão em [ORGANIC_WINTER.md](ORGANIC_WINTER.md). Decals continuam pendentes. Uso e limites: [LANDSCAPE.md](LANDSCAPE.md). As quatro peças de rocha editáveis estão em [ASSET_LIBRARY.md](ASSET_LIBRARY.md).

`material.coverage` é opcional/nulo; quando ativo guarda `texture`, `color`, `textureSize`, `amount`, `relief` e os campos de distribuição. `paintLayers[].distribution` é opcional e guarda `mode`, `slopeAngle`, `slopeFade`, `heightEnabled`, `minHeight`, `heightFade`, `variation`, `variationSize` e `seed`. Campos ausentes conservam a pintura/aparência anterior. Novos parâmetros de textura: `rockPattern` e `rockCracks`. Todos são validados antes de confirmar comandos/imports/salvamento; acompanham histórico, mapas, duplicação e projeção filtrada.

As novas texturas usam o mesmo atlas/cache por viewport; cobertura visual não adiciona uma malha ou draw call; neve com espessura acrescenta geometria e custo de exposição. Distribuição é calculada por fragmento, com custo adicional de amostras/ruído. Não representa um benchmark presencial. Resultados de testes e limites de hardware estão em [progress.md](../progress.md).


## Esculpir rocha e ampliar o terreno

Incremento de 5 de outubro de 2026. **Esculpir rocha natural** altera o heightmap, não só a textura. Escolha formação fraturada (cristas/fissuras), estratificada (patamares) ou granito (ondulações), tamanho das formações em metros, seed e força. Arraste para acrescentar variação às alturas existentes; passar novamente aumenta o efeito. O desenho usa posição mundial, evitando a mesma silhueta em cada carimbo. Tudo se materializa em alturas comuns; não existe gerador ligado ao terreno depois. Para mudar apenas o acabamento, selecione **Rocha natural** em **Editar material e propriedades** da camada. Forma do relevo e formação da textura são ajustes independentes.

Para encostas naturais, comece com pincel circular e bordas suaves. Quadrado + dureza 100% + encaixe + Nivelar serve para patamares; as células são trianguladas e as bordas podem ter transições. Para alvenaria regular/pavimento, prefira Piso/Plataforma com textura **Pedra · blocos de alvenaria**; ela conserva espessura e limites retos. **Suave / Facetas marcadas** muda a iluminação das faces, não as alturas; a malha define a geometria possível. Formações menores que a célula não terão resolução suficiente. O terreno continua tendo uma altura por XZ, sem saliências ou cavernas; para isso, componha com as peças rochosas.

No inspetor, **Área do terreno** mostra largura/comprimento fora das opções avançadas. **Expandir / recortar** reamostra em metros locais, conserva a escala da área existente e continua alturas e pintura das bordas na área nova, em torno do mesmo centro. Aumenta as divisões até o limite de 64; reamostragem pode perder detalhes, especialmente nesse limite. Reduzir recorta. **Esticar** mantém as amostras e alonga toda a composição. Ambas as opções preservam posição/rotação, materiais e distribuição das camadas; undo restaura o terreno anterior. Terrenos grandes podem ser divididos em peças, sem encaixe automático entre elas.

**Respeitar pisos ao esculpir** limita os vértices alterados pelo pincel sob pisos, com margem de uma diagonal de célula para evitar triângulos atravessando a construção. Usa o contorno real e a rotação do piso, inclusive furos; perto das bordas de furos a margem ainda pode rebaixar terreno. O piso sólido mais baixo prevalece. A margem tem transição; reaplicar não aprofunda a proteção. Pisos/parede/objetos independentes não são deslocados, e dependentes apoiados no terreno acompanham a altura confirmada. Não há proteção automática contra props/GLBs ou paredes sem piso. Edição numérica de alturas, movimento, mudanças de malha/tamanho e novas construções não reaplicam proteção automaticamente.

Para corrigir um terreno existente que atravessa um prédio, use **Prévia · ajustar sob construções**, revise e aceite. Desativar a proteção permite esculpir livremente. Proteção não é vínculo persistente com prédios nem solver de colisão; ao mover uma construção ou reduzir a resolução, revise o resultado e reaplique quando necessário.

## Casca, folhagem, gelo e neve física

Casca de árvore, Folhagem · nervuras e Gelo · fissuras ampliam o acervo para treze superfícies, conservando IDs e tiles anteriores. Receitas alpinas podem definir acabamento próprio por peça/slot; aplicar outra textura no inspetor substitui apenas os slots selecionados.

Cobertura de neve aceita `physicalThickness` opcional (0–1,5 m, padrão zero) e `exposedOnly` (padrão true). Com espessura, terrain ganha alturas derivadas e atualiza apoios; objetos ganham malhas de cobertura respeitando exposição ao céu e slot. `terrain.snowMask` é persistida e reamostrada, com recalculo explícito depois de alterar abrigos. `relief` permanece microrelevo de iluminação. Uso, limites físicos, água/gelo e validação: [LANDSCAPE.md](LANDSCAPE.md).

## Rocha e neve orgânicas

O padrão **Orgânica · mineral e fissuras locais** (`rockPattern: 'organic'`) acrescenta variação mineral em várias escalas e um campo espacial amplo, sem o desenho de blocos de alvenaria. Continua procedural; mapas fotográficos/importados não foram acrescentados neste incremento. As formas do volume são opções independentes em Geometria da rocha.

Cobertura de neve oferece **Forma do acúmulo → Depósitos orgânicos · contínuos**, com `snowStyle`, `snowDrift`, `snowDriftScale` e `snowWindDirection` opcionais. Nos objetos, vértices compartilhados e bordas afinadas substituem os prismas independentes; no terreno, o campo de espessura também altera a superfície de apoio derivada. Ausência desses campos conserva a camada antiga. Uso, intervalos, precipitação e limites em [ORGANIC_WINTER.md](ORGANIC_WINTER.md).
