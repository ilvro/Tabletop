# Plano de evolução da iluminação dinâmica

Proposta de 6 de outubro de 2026, com implementação inicial entregue na mesma data. **O texto de arquitetura abaixo registra o plano original; o quadro de estado distingue o que foi entregue das extensões futuras.** O desgaste configurável por material foi implementado separadamente em [MATERIAL_WEAR.md](MATERIAL_WEAR.md).

## Estado da implementação inicial

Uso e limites em [DYNAMIC_LIGHTING.md](DYNAMIC_LIGHTING.md). O contrato concreto usa campos opcionais `entity.illumination`, `entity.lightingZone` e `look.rendering` no schema 2. Vínculos pertencem ao host, sem IDs cruzados; fontes runtime são derivadas depois de filtrar a apresentação. A biblioteca pessoal usa IndexedDB nos dois modos, como a de pincéis; a proposta de repositório de perfis no servidor fica posterior.

| Área do plano | Entregue | Ainda posterior |
| --- | --- | --- |
| 0–1 · contrato/núcleo | Validação, snapshots, reconciliação por identidade, pool por tipo, seleção com retenção, budget de vistas, invalidação local e sol/lua focados na vista. Diagnóstico de CPU p50/p95, programas, memória e chamadas do frame completo. | Tempos GPU/hardware, índices por células, transições entre fontes, aquecimento antecipado de variantes e cascatas. |
| 2 · fontes | Seis perfis editáveis, origem numérica ou clicada, guias, slots emissivos, modos de autoria, parâmetros fixáveis, biblioteca pessoal/concorrência, clipboard, prévia transacional e histórico. Uma fonte compartilhada por host; evita duplicação da luz do fogo local. | Sockets sugeridos pelo catálogo/GLB, múltiplos sockets por host, agrupamento espacial automático e biblioteca no servidor. |
| 3 · zonas | Até 16 caixas simultâneas com prioridade/transição, preenchimento difuso e névoa por posição, guias, privacidade e caster de paredes paramétricas ocultas pelo recorte. | Polígonos extrudados, desenho direto de zonas, grafo de conexões/transmissão por aberturas e cutaway de coberturas/props. Portas reais já alteram as sombras de suas malhas. |
| 4 · acabamento | Cookies de vitral/grades/folhas de 128 px, seed/rotação, oclusão de spot; PMREM procedural de 64 px; GTAO em meia resolução, intensidade/raio e exclusão de helpers/transparências. | Importação HDR, sondas locais, refração/cáusticas e comparação presencial de alternativas de AO. |
| 5 · volumes | Névoa de caixa/horizontal integrada por profundidade, até quatro fontes e duas sombras spot, 8/12/20 passos, composição linear e fallback analítico. | Volume em meia resolução com upsampling, oclusão de pontuais no ar, cookies coloridos no feixe, transparências volumétricas e histórico temporal. |
| 6 · estudos | Presets acolhedor/ritual/fluorescente e quatro cenas editáveis com prévias do viewport real: capela, taverna, escritório e rua. Scripts verificam zero reconstrução em edição de intensidade e percorrem câmeras/qualidades. A [igreja completa com vale](IGREJA_ANTIGA_CENA.md) foi entregue no incremento de 7 de outubro. | Calibração de FPS em notebook + projetor reais. |

O núcleo recomendado das etapas 0–2 foi implementado, com partes utilizáveis das etapas 3–6. Os critérios integrais dessas etapas posteriores não estão todos encerrados. Testes em Chromium/SwiftShader comprovam correção, identidade e descarte; não comprovam a meta presencial de 30 FPS. Qualidade é local por janela e fontes sem sombra/projeção têm degradação explícita no guia e nos controles.

## Decisão

**Sim: vale evoluir a engine para oferecer iluminação reutilizável, com autoria simples e controles completos.** Cada mapa ainda precisa definir onde ficam suas fontes, quais áreas são internas e qual atmosfera deseja. A engine deve resolver transformação, sombras, distribuição, qualidade e reutilização desses elementos, sem um script exclusivo de renderização para cada cenário.

A meta é conseguir criar uma igreja vermelha com exterior violeta, uma taverna acolhedora, uma rua chuvosa ou um escritório com fluorescentes usando os mesmos recursos. O kit da igreja será um dos cenários de validação, não uma dependência do sistema.

Começar com o `WebGLRenderer` e os materiais existentes. Não há medição que justifique migrar toda a aplicação para WebGPU ou implementar iluminação global em tempo real agora. Entregar primeiro um núcleo robusto, fontes fáceis de aplicar e acabamento coerente.

## O que já funciona e o que limita a evolução

| Evidência no projeto | Consequência |
| --- | --- |
| [`lighting.js`](../src/render/lighting.js): fontes pontuais, spots e direcionais, alvo transformado, queda quadrática, Kelvin/cor e cintilação. | Reutilizar esse domínio e o vínculo a paredes/tetos; não manter um segundo sistema paralelo de luzes. |
| [`ENVIRONMENTS.md`](ENVIRONMENTS.md): presets, biblioteca, prévia transacional, sol/lua e vínculos por horário. | Expandir os fluxos existentes com fontes e regiões; preservar customizações e a cópia concreta de presets. |
| [`renderer.js`](../src/render/renderer.js), `setDocument`: limpa conteúdo/luzes e recria a cena a cada documento. | Antes de multiplicar fontes, diferenciar atualização de parâmetros, transformações, geometria e recursos. |
| Cache global de sombras já existe (`shadowMap.autoUpdate = false`), mas atualizações espaciais invalidam o conjunto. Resolução fixa de 1.024; direcional enquadra o conteúdo inteiro. | Adotar invalidação por fonte e enquadramento útil; evitar perder detalhe de contato quando o mapa cresce. |
| Luz pontual com sombra custa seis vistas; não há seleção espacial/orçamento de fontes. | Quantidade de fontes autoradas precisa ser independente da quantidade de luzes/sombras simultâneas na GPU. |
| Emissão e bloom existem, inclusive nas velas e nos vitrais; emissão não ilumina objetos próximos. Fogo local já cria uma fonte própria. | Unificar emissores visuais, slots emissivos e fontes reais; impedir iluminação duplicada do fogo. |
| [`effects.js`](../src/render/effects.js): névoa horizontal homogênea, integração analítica por profundidade; bloom opcional. | Feixes, volumes locais e espalhamento por fonte exigem trabalho novo. A névoa atual não os calcula. |
| Preenchimento hemisférico global; não há iluminação indireta local, AO dedicado ou reflexos de ambiente configuráveis. | Interiores/exteriores simultâneos exigem influência espacial, em vez de trocar o preenchimento global conforme a câmera. |
| Projetor recebe documento filtrado e possui câmera/qualidade próprias. | Toda otimização precisa preservar privacidade, leitura do mapa e autonomia de cada janela. |

## Experiência de uso

### Caminho rápido

1. Em **Cena → Atmosfera**, escolher uma intenção: dia natural, noite de luar, interior acolhedor, horror ritual ou fluorescente fria. A intenção oferece valores iniciais; nenhuma geometria ou posição é inventada silenciosamente.
2. Selecionar um asset e escolher **Adicionar iluminação → Vela / Tocha / Lâmpada / Janela / Luz decorativa**. Mostrar uma prévia da origem e do alcance. Permitir clicar no modelo para definir a origem local, inclusive em GLBs sem metadados.
3. Ajustar inicialmente **Cor/temperatura**, **Força**, **Alcance**, **Sombras** e **Animação**. Cada controle deve ter valor numérico, teclado e explicação curta. Avançado contém intensidade técnica, cone, penumbra, offsets, padrões, prioridade e resolução solicitada.
4. Para interiores, desenhar uma **Zona de ambiente** com altura e limites visíveis no editor: cor do preenchimento, força, neblina e transição. Opcionalmente marcar portas/janelas como aberturas entre zonas.
5. Usar **Experimentar**, comparar as alterações e **Aplicar** em um único undo. Cancelar descarta a proposta. O projetor só recebe o resultado aceito, preservando sua câmera.

Perfis de fonte e ambientes pessoais devem poder ser salvos, renomeados e reaplicados. No Pages, manter armazenamento local com revisão/validação; no servidor, usar o padrão de repositório existente. Não introduzir sincronização entre dispositivos como requisito. Instâncias guardam uma cópia dos valores e a referência de origem; editar a biblioteca não muda mapas antigos.

### Autonomia e acessibilidade

- **Assistido** calcula sugestões a partir de perfil, dimensões e origem escolhida. **Manual** mantém parâmetros explícitos. O usuário pode fixar parâmetros individuais e depois recalcular somente os demais; conversão para uma luz manual deve conservar a aparência e o vínculo ao asset.
- Desativar a sugestão ou apagar uma fonte derivada deve persistir essa decisão. Nunca recriá-la silenciosamente ao recarregar, trocar ambiente ou atualizar o asset.
- Mostrar diferenças antes de substituir um ambiente; respeitar bloqueios de objetos, grupos e fontes. Detectar prévia obsoleta após edições.
- Mostrar cor acompanhada de nome/valor, não como único indicador. Manter foco de teclado e painéis recolhíveis; controles precisam caber em tela estreita e funcionar por toque.
- Movimento reduzido e pausa desligam cintilação/variações sem apagar fontes. Oferecer limite de amplitude e perfis suaves; evitar flashes agressivos nos padrões padrão.
- **Revisar legibilidade** oferece uma prévia de leitura dos tokens/passagens. É uma ferramenta temporária do editor; qualquer preenchimento adicional publicado exige aplicação explícita. Não confundir escuridão visual com sigilo ou fog of war.
- Qualidade **Econômica / Equilibrada / Alta / Personalizada** pertence à janela. Preservar cores, hierarquia e zonas; reduzir primeiro resolução/amostras/efeitos decorativos. Mostrar quando um pedido ultrapassa o orçamento, com opção de fixar a prioridade.

## Arquitetura proposta

### 1. Documento autorado, derivação e runtime separados

Manter `look.lights` para fontes explícitas e os campos antigos válidos. Acrescentar configurações opcionais e versionadas para perfis de fonte por instância, regiões e aberturas. Não serializar objetos Three.js, texturas de sombra, seleção do orçamento ou frames de animação.

Esboço conceitual do plano original (a implementação inicial usa os campos por host descritos no quadro acima; este objeto não é aceito pelo schema):

```js
look.lighting = {
  version: 1,
  sourceBindings: {
    bindingId: {
      hostId, socketId, localPosition, localRotation,
      profileSnapshot, origin: { id, revision },
      overrides, pinnedFields, enabled, shadowPolicy, priority
    }
  },
  regions: { regionId: { shape, transform, bounds, blend, priority, fill, fog } },
  openings: { openingId: { hostId, regionA, regionB, contour, transmission } }
};
// Preferência local do viewport: tier, pixelRatio, orçamento, AO/volume/reflexos.
```

Definir enums, limites finitos, contagem máxima e referências antes de implementar o schema; `overrides` não pode ser um objeto arbitrário sem validação. `profileSnapshot` guarda parâmetros resolvidos, não código executável. Cenas antigas sem `look.lighting` conservam exatamente o comportamento atual.

No domínio, funções puras resolvem perfil + overrides + horário e produzem descritores de fontes. Identidade estável por vínculo/socket impede duplicação em reload. A visibilidade/audiência efetiva deriva do hospedeiro e de seus ancestrais. Filtrar o documento para apresentação **antes** de resolver fontes, regiões, preenchimentos ou capturas de ambiente; uma fonte privada não pode vazar por seus efeitos indiretos.

Duplicação, mapa↔cena e composições devem remapear IDs e conservar coordenadas locais. Remover o host remove seus vínculos; substituir asset preserva sockets compatíveis e pede resolução explícita dos ausentes, sem aproximar a posição em silêncio. Fonte derivada recebe seleção no inspetor e indicação de seu hospedeiro.

Separação sugerida: `domain/light-profiles.js` e `domain/lighting-regions.js` para validação/derivação; `render/light-manager.js` para reconciliação, pool e qualidade; `render/shadow-manager.js` para dependências; `render/lighting-regions.js` para influência espacial; componentes UI compartilhados para perfis, prévia e controles avançados. Extrair gradualmente de `application.js`/`renderer.js` evita ampliar seus monólitos.

### 2. Atualização incremental e recursos

Reconciliar objetos por ID/revisão: intensidade, cor e relógio alteram uniforms; mover fonte altera transformação; trocar geometria recompõe apenas a entidade afetada. Propagar dependências para apoios, âncoras, grupos, portas, recortes, neve e bounds. Entrega tardia de asset precisa respeitar a geração vigente. Preservar materiais/texturas compartilhados e descarte por referência.

Reutilizar pools de luzes por tipo. Números de luzes/sombras afetam variantes de shader; usar classes de orçamento com cardinalidade estável e fontes ociosas com intensidade zero. Aquecer variantes necessárias e medir o custo real de luzes ociosas. Não dimensionar um pool enorme apenas para evitar compilação.

Indexar volumes de influência por região/célula. Selecionar candidatos por contribuição estimada aos objetos visíveis, distância, prioridade e vínculo; o emissor pode estar fora do enquadramento e ainda iluminar a sala. Usar histerese e transições para evitar fontes piscando ao mover a câmera. A seleção nunca modifica o documento nem suas prioridades artísticas.

### 3. Sombras com orçamento explícito

Usar políticas **Automática / Prioritária / Desligada**, além de resolução solicitada avançada. Separar iluminação real, oclusão e animação: mudar intensidade/cor/cintilação não invalida sombra. Mover uma porta, token ou caster invalida somente fontes cujo volume intersecta os bounds antigos/novos; considerar descarregamento e carregamento tardio de assets.

Sombras direcionais devem cobrir o espaço útil com margem, estabilização em texels e atualização controlada. Mapas amplos podem exigir cascatas em uma fase posterior; não simplesmente aumentar o bias ou enquadrar 140 m com a mesma textura. Luzes pontuais continuam mais caras que spots e devem consumir seis unidades no orçamento de vistas. A API já oferece atualização explícita de sombras por fonte; integrar seu ciclo de vida e descarte ao gerenciador. [Three.js LightShadow](https://threejs.org/docs/pages/LightShadow.html).

Proposta inicial **para experimentar e calibrar**, não garantia de desempenho:

| Qualidade | Fontes locais reais simultâneas | Vistas de sombra adicionais ao sol/lua | Resolução local inicial | AO / névoa iluminada |
| --- | --- | --- | --- | --- |
| Econômica | 4 | 0–2 | 512 | Desligados; névoa simples opcional |
| Equilibrada | 8 | Até 6 | 512–1.024 | AO reduzido; volume por opção |
| Alta | 16 | Até 12 | 1.024; 2.048 sob pedido | Efeitos com resolução/amostras limitadas |
| Personalizada | Limites validados e diagnóstico de custo | Configurável | Conforme capacidade medida | Independentes |

Agrupar velas próximas de um candelabro em uma fonte compartilhada é uma aproximação configurável. Preservar a intensidade total e permitir separar fontes quando necessário. Não agrupar lados opostos de uma parede ou regiões desconectadas. Emissão visual pode existir em centenas de velas sem uma sombra pontual individual por vela.

Não desligar a única oclusão de uma sala e fingir equivalência visual: quando faltar orçamento, priorizar a fonte importante ou reduzir seu alcance/cone conforme configuração aceita. Mostrar a degradação; luz sem sombra pode atravessar paredes.

### 4. Fontes vinculadas e iluminação de janelas

Metadados opcionais de asset podem sugerir sockets e perfis; o mesmo fluxo manual serve para qualquer prop/GLB. Uma vela terá emissão no slot correto, um ponto local e animação comum; o candelabro sugere um conjunto compartilhado. Migrar gradualmente a luz do fogo local para esse contrato, preservando parâmetros antigos e impedindo duas fontes para o mesmo emissor.

Janela recebe direção, dimensões e transmissão explicitamente, obtidas do vão paramétrico quando disponível. Para um vitral de receita/GLB, selecionar origem/plano e slot; não inferir uma abertura estrutural a partir de qualquer material transparente. Um spotlight com textura de projeção pode representar o desenho colorido no chão/paredes. A API `SpotLight.map` oferece essa modulação e sua documentação a vincula a `castShadow`; validar custo/comportamento na versão fixada antes de definir a qualidade econômica. [Three.js SpotLight](https://threejs.org/docs/pages/SpotLight.html).

Gerar/cachear padrões de projeção reutilizáveis (vitral, grades, folhas) com seed e controles de escala/rotação. Isso é uma aproximação artística: vidro transparente não passa a produzir refração, cáusticas ou sombras coloridas fisicamente corretas. Conferir orientação, clipping, oclusão e consistência entre câmeras antes de disponibilizar o perfil.

### 5. Regiões simultâneas e iluminação indireta aproximada

Primeira versão: volumes de caixa/polígono extrudado, prioridades explícitas e bordas suaves. Consultar região na posição mundial do fragmento para preenchimento difuso/fog local; objetos grandes podem atravessar mais de uma zona. Compartilhar dados compactos e limitar regiões relevantes por célula/draw. O preenchimento hemisférico antigo continua sendo o fallback de documentos sem zonas; em documentos novos, separar contribuição exterior da interior para não somar duas vezes.

A cor de uma sala não pode substituir o ambiente global ao entrar com a câmera: a vista externa precisa mostrar simultaneamente a nave vermelha e o vale violeta. Definir mistura normalizada nas sobreposições e regras de precedência. `THREE.Layers` filtra renderização; não resolve oclusão física entre cômodos.

Portas/janelas devem descrever conexões opcionais e estado de abertura. Começar restringindo preenchimento artístico e influência de aberturas; sombras reais continuam responsáveis pela oclusão das luzes diretas. O recorte de paredes para leitura pode esconder sua malha visual mantendo um caster separado; tornar essa escolha explícita, pois portas abertas precisam continuar afetando a luz.

Depois, avaliar sondas difusas pré-calculadas/atualizadas sob demanda com interpolação por região. `LightProbe` representa irradiância difusa em harmônicos esféricos, mas não fornece sozinho GI espacial nem calcula rebotes ao abrir uma porta. Capturas devem invalidar por conteúdo e nunca por frame; custos, privacidade e persistência do cache precisam ser medidos. [Three.js LightProbe](https://threejs.org/docs/pages/LightProbe.html).

### 6. Acabamento e atmosfera

Adicionar ambiente de reflexos de baixa resolução, procedural ou arquivo HDR validado, com intensidade separada do preenchimento. PMREM permite pré-filtrar por rugosidade e aproveitar os materiais atuais; gerar uma vez por configuração e descartar recursos substituídos. Não capturar a cena inteira em seis faces por frame. Reflexos globais aproximam metais/vidros, mas não representam automaticamente cada sala. [Three.js PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html).

Avaliar AO em resolução reduzida para contatos, com raio em metros, intensidade baixa e controle de qualidade local. AO não substitui sombras ou iluminação indireta. `GTAOPass` é uma opção de maior custo; comparar com alternativa mais simples antes de escolher. Usar profundidade/normais coerentes com perspectiva, vista superior e recortes, sem escurecer helpers ou UI. [Three.js GTAOPass](https://threejs.org/docs/pages/GTAOPass.html).

Só depois adicionar volumes de névoa locais e amostragem de fontes importantes: reconstrução de raio por profundidade, densidade limitada, integração com as sombras disponíveis e composição linear antes de bloom/saída. Começar em meia resolução com número limitado de passos/luzes, fallback para a névoa atual e limites de distância. Evitar acumular névoa global/local duas vezes. Histórico temporal exige reset em corte/transição de câmera e mudanças de volume; transparências e janelas precisam de testes próprios. Pilares de luz cenográficos baratos podem ser oferecidos como modo explícito, sem chamá-los de espalhamento físico.

Manter exposição manual por padrão para evitar bombeamento ao navegar entre salas. Se houver adaptação automática no futuro, torná-la opcional por viewport, com limites/velocidade e sem alterar o look salvo a cada frame. Conservar uma única conversão final de cor/tone mapping; luz, desgaste e texturas devem continuar trabalhando em espaço linear.

## Etapas, dependências e critérios de conclusão

| Etapa | Entrega concreta | Concluir somente quando |
| --- | --- | --- |
| 0. Medição e contrato | Fixtures neutras + igreja recortada + rua + sala; métricas de CPU/GPU, compilação e memória; schema proposto e budgets experimentais. | Existirem baselines reproduzíveis e decisões sobre compatibilidade/privacidade. |
| 1. Núcleo incremental | Reconciliação por ID, gerenciador de fontes, pool limitado e invalidação de sombras por dependência. | Alterar uma intensidade não recriar assets/geometrias, mover porta invalidar sombras corretas e salvar não reconstruir a cena. Sem regressões de apoios/âncoras/recortes/neve. |
| 2. Fontes fáceis de usar | Perfis em qualquer asset, sockets manuais, emissão + luz reais, agrupamento opcional, biblioteca e prévia/undo. | Taverna e escritório configuráveis pela UI, sem script de mapa; duplicação, exclusão, projeção e GLB sem socket funcionarem. |
| 3. Zonas e aberturas | Ambientes internos/externos simultâneos e transições; controle do caster no recorte. | Nave vermelha e exterior violeta aparecerem juntos em câmeras internas/externas/superiores; porta aberta alterar o resultado sem vazar luz privada. |
| 4. Janelas e acabamento | Projeções de vitrais/grades, ambiente de reflexos e AO opcional. | Comparações de pixels provarem oclusão/projeção corretas, ganho visual e descarte; preset continuar editável manualmente. |
| 5. Volumes iluminados | Névoa local com feixes limitados, qualidade por janela e fallback. | Profundidade, teto/parede, transparência, movimento e alternância de qualidade passarem; custo dentro do orçamento definido no equipamento alvo. |
| 6. Calibração e exemplos | Presets revisados, tutoriais curtos, perfis pessoais e exemplos de diferentes estilos. | Usuário preparar os casos abaixo sem editar código; comparação presencial editor + projetor aprovada. |

Etapa 2 depende de 1; 3 usa os descritores de 2; 4 pode ter reflexos/AO em paralelo a 3, mas fontes de janela dependem do contrato de aberturas. 5 depende da gestão de fontes/sombras e das zonas. Não há estimativa de dias confiável antes da medição inicial. Primeira implementação recomendada: **etapas 0–2**, com um recorte da igreja como teste de estresse visual.

## Matriz de validação

- **Igreja/vale:** interior vermelho, exterior violeta, múltiplas velas, vitral, portas e cobertura; percorra vista superior, mesa, altar e exterior. Julgar materiais/peles/tokens legíveis, circulação e diferença entre emissão, halo e luz incidente.
- **Taverna:** dezenas de velas/lareira agrupadas, madeiras com desgaste, janela diurna e sombras de personagens. Verificar que o agrupamento respeita cômodos e mantém a cor desejada.
- **Rua chuvosa:** vários prédios/janelas, luzes fora da câmera que iluminam a rua, neblina e superfícies metálicas. Testar orçamento com histerese e alternância noite/dia.
- **Escritório/laboratório:** fontes frias sem cintilação obrigatória, circulação clara, salas conectadas e ajustes manuais. Evitar perfil universal de horror que comprometa outros estilos.
- **Domínio:** validação atômica, limites, bloqueios, herança de audiência, remapeamento de IDs, exclusão/substituição de host, mapas/cenas, JSON antigo e snapshots de biblioteca.
- **Runtime/GPU:** identidade de recursos preservada, zero reconstrução na edição de intensidade, contagem de variantes/passes, invalidação por caster, pixels fora de região conservados, ausência de luz privada e retorno à baseline de memória após troca/fechamento.
- **Interface:** servidor e Pages, teclado/toque/tela estreita, prévia/cancelar/aplicar, campos fixados, biblioteca indisponível/conflitos, undo/redo, salvar/reabrir, projetor filtrado com câmera e qualidade independentes.
- **Medição presencial:** tempo de frame e edição p50/p95, compilação, memória estimada de buffers, número de fontes/sombras/triângulos/chamadas; notebook e projetor juntos, resolução real e áudio ativo. Meta inicial de 30 fps estáveis durante navegação (p95 ≤ 33,3 ms), revisável conforme hardware. Cena parada deve voltar a renderizar sob demanda. Chromium com WebGL por software valida correção, não esse desempenho.

## Depois deste plano

GI dinâmica completa, renderização clustered/deferred, cascatas de sombra e probes volumétricas ficam condicionadas a gargalos e limites visuais medidos. Não são pré-requisitos para melhorar muito a aplicação atual. O avanço mais útil é combinar autoria reutilizável, luzes bem selecionadas, oclusão correta e qualidade local previsível, preservando o controle artístico do mestre.
