# Auditoria de desempenho — 7 de outubro de 2026

O Tabletop tem caminhos que repetem trabalho da cena inteira para alterações pequenas. Eles explicam possíveis pausas ao editar, pintar, selecionar, carregar mapas e gerar capas. O custo contínuo de luzes, sombras e efeitos é uma segunda categoria: pode reduzir a fluidez enquanto a câmera se move ou a atmosfera anima. Esta auditoria identifica mecanismos no código e mede operações isoladas; não atribui todos os travamentos percebidos a uma única causa nem estabelece FPS no notebook do usuário.

Escopo: arquitetura, estado/comandos, atualização da interface, renderer, assets, iluminação, materiais, terreno/neve, capas, apresentação e repositórios servidor/Pages. Este relatório registra a baseline anterior às otimizações, cuja implementação posterior está em [PERFORMANCE_IMPLEMENTATION.md](PERFORMANCE_IMPLEMENTATION.md). Alterações de conteúdo já presentes na árvore de trabalho foram preservadas. O plano executável está em [PERFORMANCE_PLAN.md](PERFORMANCE_PLAN.md).

## Como a análise foi feita

Leitura do código atual e dos contratos de [arquitetura](ARCHITECTURE.md), [iluminação dinâmica](DYNAMIC_LIGHTING.md), [plano de iluminação](DYNAMIC_LIGHTING_PLAN.md) e [Igreja Antiga](IGREJA_ANTIGA_CENA.md). O quadro “O que já funciona e o que limita a evolução” do plano de iluminação registra o diagnóstico anterior à implementação; sua afirmação de reconstrução total não descreve mais o renderer atual.

O diagnóstico reproduzível em [scripts/audit-performance.js](../scripts/audit-performance.js) usa apenas exemplos públicos. O ensaio de CPU mede 25 amostras após cinco aquecimentos, sem UI/rede/renderização. O ensaio de navegador abre um viewport isolado de 960 × 640, DPR 1, qualidade equilibrada, Chromium/SwiftShader e movimento reduzido, sem servidor de documentos ou acesso a cenas pessoais. Mede seis atualizações de intensidade, seis reaplicações do mesmo documento, 30 seleções por raio e uma captura de capa. Os tempos de render existentes incluem submissão/compilação e espera que o driver provoque; não são medições GPU por timer query.

Movimento reduzido pausa animações para isolar operações. Esse ensaio não mede a carga contínua normal de cintilação, nuvens, neve/chuva e água. Os percentis do renderer retêm até 120 amostras e incluem aquecimento; os tempos separados de `setDocument` são amostras posteriores à carga inicial. Seleção usa pontos sintéticos, com e sem acerto. Capa e carregamento inicial têm uma amostra, não um percentil estável. Não se devem somar percentis nem converter esses números em FPS presencial.

```bash
node --expose-gc scripts/audit-performance.js --out=test-results/performance-audit-cpu.json
node --expose-gc scripts/audit-performance.js --browser --out=test-results/performance-audit.json
```

O segundo comando precisa de Chromium instalado e permissão de loopback; usa Vite apenas para servir módulos/assets. `TABLETOP_BROWSER_PATH` permite indicar o executável já usado pelos E2E. Os resultados vão para `test-results/`, ignorado pelo Git. O relatório de CPU continua disponível sem navegador. Não executar concorrendo com outros ensaios WebGL.

## Resultados medidos

Registro desta execução: [JSON completo da baseline](benchmarks/performance-2026-10-07.json), iniciado às 10h07 de 7 de outubro (São Paulo). Ambiente: Linux x64, Node 22.22.2, Intel Xeon E5-2640 v3 a 2,60 GHz; navegador Chromium 145.0.7632.6 com renderização por software. Não é o notebook/projetor alvo.

| Fixture | Entidades | JSON compacto | Renomear: p50 / p95 | Intensidade: p50 / p95 | Ler `dirty`: p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Capela | 22 | 17,5 KiB | 2,71 / 4,03 ms | 2,42 / 4,59 ms | 0,18 ms |
| Escritório | 19 | 13,3 KiB | 1,66 / 3,00 ms | 1,80 / 3,19 ms | 0,13 ms |
| Montanha | 101 | 156,8 KiB | 19,18 / 26,52 ms | Não medido: sem fonte vinculada | 2,09 ms |
| Igreja | 379 | 365,8 KiB | 41,70 / 46,16 ms | 41,91 / 46,97 ms | 4,00 ms |

São comandos reais do store, com histórico/congelamento/validação, **sem assinantes de UI**. Na igreja, o máximo da alteração de intensidade foi 104,68 ms; causa desse outlier não foi atribuída. Clonar a igreja teve p95 de 6,87 ms, validar 10,28 ms e derivar a apresentação 8,01 ms. Somente esses custos já justificam evitar repetir operações, mas não equivalem à latência total de interação.

O histórico de **150 renomeações na igreja reteve 133.150.832 bytes adicionais, aproximadamente 127 MiB**, após GC forçada em Node. Medição isolada do heap, não vazamento comprovado nem tamanho do histórico no navegador. Reduzir a quantidade de passos não faz parte do plano.

| Operação no viewport isolado | Capela | Igreja |
| --- | ---: | ---: |
| `setDocument` de intensidade, p50 / máximo (6 amostras) | 1,60 / 2,50 ms | 19,80 / 22,70 ms |
| Reaplicar mesmo documento, p50 / máximo (6 amostras) | 1,30 / 2,70 ms | 18,70 / 21,70 ms |
| Picking, p50 / p95 (30 pontos) | 0,10 / 1,10 ms | 0,50 / 3,20 ms |
| Capturar capa, uma amostra em SwiftShader | 15,81 s | 42,50 s |
| Chamadas / triângulos do último frame após ajustes | 182 / 45.327 | 1.930 / 663.423 |
| Programas / geometrias / texturas após ajustes | 30 / 92 / 38 | 53 / 1.047 / 47 |

As atualizações de intensidade criaram/removeram **zero objetos**: reutilizaram 23 na capela e 380 na igreja, contando a direcional. Não houve crescimento de programas/geometrias/texturas entre a captura inicial e o fim desses ajustes, nem erros de página/diagnóstico de assets. Isso confirma que a reconciliação incremental existe; reaplicar o mesmo documento ainda custa quase o mesmo que ajustar uma intensidade.

Chamadas/triângulos incluem passes do frame, não somente as malhas visíveis. Capa inclui renderização, cópia/readback, codificação e restauração síncrona; os **segundos observados em SwiftShader não predizem segundos no notebook**. Servem para demonstrar que a captura pode bloquear o mesmo thread da interface e merece perfil em hardware. A medição não isolou quanto desses segundos pertence a cada fase.

## Causas encontradas

### 1. Invalidação global de sombras em toda edição — prioridade imediata

**Confirmado pelo fluxo de chamadas.** [application.js, updateView](../src/app/application.js#L797) chama `viewport.setIsolatedLevel(...)` depois de cada alteração, undo/redo e confirmação de salvamento. [renderer.js, setIsolatedLevel](../src/render/renderer.js#L1260) percorre os objetos e termina com `invalidate(true)` mesmo quando o andar é o mesmo. Esse caminho marca o cache de fontes locais e as sombras direcionais para atualização global. Reutilizar os UUIDs das malhas não evita esse custo.

Uma simples renomeação ou alteração de intensidade pode, portanto, obrigar a redesenhar sombras sem mudança nos casters. A aplicação também reaplica superfície de apoio, plano de trabalho e seleção. Os dois primeiros invalidam o viewport mesmo quando o valor é igual. O benchmark isolado chama `setDocument` diretamente e não reproduz essa cadeia da UI; seus resultados não quantificam a penalidade adicional do isolamento.

**Otimização proposta:** tornar setters idempotentes, invalidar somente quando valor/visibilidade efetiva mudar e reservar atualização de sombras para mudanças que afetem casters, fontes, enquadramento da sombra ou seleção de fontes. Conferir visibilidade de pastas/camadas/hosts durante a reconciliação, para que um retorno antecipado não conserve visibilidade obsoleta.

### 2. Cópias, validação e serialização completas no histórico — alta prioridade

**Confirmado no código e medido em CPU.** [commands.js](../src/state/commands.js#L328) valida o documento de entrada, clona tudo e valida a saída. [scene-store.js](../src/state/scene-store.js#L6) serializa versões para detectar ausência de mudança, calcula `dirty` por serialização a cada leitura e congela recursivamente os snapshots. Uma edição pequena atravessa também alturas e máscaras de terreno que não mudaram.

O histórico conserva até 150 entradas com snapshots completos; snapshots adjacentes reaproveitam referências `before/after`, mas cada comando produz outro documento completo. Não equivale a 300 documentos independentes. O ensaio de heap após GC mede esse crescimento em Node para a igreja; não demonstra vazamento e não inclui memória GPU. Em cenas extensas, retenção e alocações temporárias podem aumentar pressão de memória e pausas de coleta.

**Otimização proposta:** primeiro calcular a representação canônica/`dirty` uma vez por snapshot corrente; depois implementar cópia dos ramos afetados, com compartilhamento estrutural e validação incremental apoiada em documentos imutáveis já validados. Importação, migração, dados externos e limites de persistência continuam com validação completa. Não reduzir os 150 passos para obter economia.

### 3. Reconstrução dos painéis e trabalho de persistência/sincronização — alta prioridade

**Confirmado no código; custo integral da UI ainda não perfilado.** [updateView](../src/app/application.js#L797) termina com `renderInspector`, `renderSidebar`, `broadcast` e agenda rascunho. A sidebar substitui `innerHTML`, remonta grupos de disclosures, câmera/atmosfera ou construção e, quando presente, a árvore de objetos. No modo de construção há múltiplos `innerHTML +=`. Isso repete criação de DOM, restauração de foco/scroll e geração de opções para campos sem relação com a edição.

[broadcast](../src/app/application.js#L525) clona/filtra a cena e envia um snapshot completo com assets. A existência do canal não confirma que há projetor ouvindo. Publicar só a câmera também envia toda a cena; o receptor reaplica assets e documento. [flushDraft](../src/app/application.js#L516) clona a cena e `drafts.write` faz outra cópia explícita, além da serialização necessária ao IndexedDB. O debounce de 180 ms e a fila de promessas não eliminam gravações intermediárias quando o armazenamento demora.

**Otimização proposta:** propagar o conjunto de alterações para atualizar campos/linhas afetados; memorizar projeção pública por versão e assets por revisão; separar publicação de câmera de publicação de conteúdo; coalescer rascunhos pendentes por versão e remover cópias redundantes com base na imutabilidade. Preservar a janela de recuperação atual, tratamento de falhas e revisões concorrentes.

### 4. Capas fazem trabalho gráfico síncrono pesado — alta prioridade

**Confirmado no código e medido no viewport.** [captureThumbnail](../src/render/renderer.js#L1218) esconde helpers, renderiza a cena completa, copia o canvas para 480 × 270, codifica JPEG com `toDataURL` e renderiza a cena completa outra vez para restaurar a imagem. A capa pequena não significa que a primeira renderização acontece em 480 × 270: ela usa o viewport corrente. Esse caminho roda após o debounce de um segundo das edições.

Para documentos fora da mesa, [renderScenePreview](../src/render/scene-preview.js) cria outro WebGLRenderer, carrega recursos e compila materiais. A [fila](../src/app/scene-previews.js#L40) já serializa os trabalhos, tem deduplicação de pendências em `ensure` e cache de 64 imagens. Porém a lista de jobs não tem um limite explícito; muitas cenas antigas sem capa geram uma sequência longa, e trabalhos já iniciados não são cancelados quando a galeria fecha.

**Otimização proposta:** captura em alvo dedicado de 480 × 270, preservando enquadramento, crop, pós-processamento e limpeza de helpers; codificação assíncrona; prioridade por card visível; coalescência/cancelamento de versões obsoletas e processamento nos intervalos disponíveis. Confirmar equivalência de sombras/efeitos antes de substituir a captura, pois mudar o tamanho do alvo pode alterar o resultado dos passes.

### 5. Pincel recria malha, material e contorno a cada movimento — alta prioridade para autoria

**Confirmado no código; sem benchmark de gesto nesta auditoria.** [onPointerMove](../src/render/renderer.js#L921) calcula raycasts, recria o `BufferGeometry` do círculo e, durante pintura/escultura, chama [replaceTerrain](../src/render/renderer.js#L1061). Essa função descarta o objeto, cria terreno/material, reaplica texturas, atualiza matrizes e invalida todas as sombras. Um evento pode produzir até 64 stamps de terreno; o processamento ocorre por evento de ponteiro, sem agrupamento explícito por frame.

**Otimização proposta:** reusar buffers, atualizar posições/máscaras/cores nas regiões alteradas e recalcular normais/bounds necessários. Processar a sequência espacial completa do traço, agrupando o upload e a atualização visual em um frame. Pintura apenas de cor/máscara não deve invalidar sombras quando a cobertura física e a geometria não mudam. Reconstrução completa continua apropriada para mudança de topologia/resolução/contorno. Esc e um undo por gesto permanecem iguais.

### 6. Reconciliação ainda percorre toda a cena; paredes têm dependência ampla

**Confirmado no código e custo geral medido no viewport.** [setDocument](../src/render/renderer.js#L582) reaplica matrizes, calcula assinaturas JSON e achata/remonta proxies de composições. Para cada parede, a assinatura inclui a lista geométrica de **todas** as paredes e filtra novamente as aberturas. Há trabalho proporcional a paredes × paredes/entidades; alterar uma parede pode reconstruir paredes não vizinhas. A dependência existe para junções, portanto removê-la sem um índice correto mudaria a geometria.

Cada conclusão assíncrona de [installAsset](../src/render/renderer.js#L489) também recalcula seleção e bounds de sombras do conteúdo inteiro. Com muitos props, isso repete travessias durante a carga. A fila de rAF agrega pedidos de renderização, mas não agrega esses cálculos executados dentro dos callbacks.

**Otimização proposta:** índices derivados por host/vizinhança/asset, revisão geométrica por entidade, reparenting somente quando a composição muda e consolidação de bounds/seleção por frame. Primeiro carregar fixtures e medir o peso dessas travessias; workers para receitas puras são uma etapa posterior, com cancelamento por geração.

### 7. Trabalho estático reaplicado em cada frame animado

**Confirmado no código; magnitude depende da cena e exige perfil contínuo.** [render](../src/render/renderer.js#L233) monta descritores e percorre coleções; [updateBoundLights](../src/render/bound-light.js#L16) examina todas as entidades, reaplica emissão por malha/material e recalcula transforms. [zones.update](../src/render/lighting-zones.js#L12) busca/ordena zonas e recalcula inversas/cores. A câmera em movimento e efeitos visíveis mantêm esse caminho ativo.

**Otimização proposta:** manter coleções de fontes, zonas, águas e efeitos e separar revisão de configuração/transformação da atualização temporal. Cintilação continua com a mesma frequência e função temporal; seleção espacial de luzes continua reagindo à câmera e preserva prioridade/retenção. Não transformar animações visíveis em imagens estáticas.

### 8. Shaders de superfície fragmentam variantes por parâmetros numéricos

**Confirmado no código; compilação excedente por edição ainda precisa de medição dedicada.** [surface-materials.js](../src/render/surface-materials.js#L193) inclui `settings` na chave do programa. Parte dos parâmetros já usa uniforms, mas outros entram como literais no GLSL: cor base do terreno, opacidades/tamanhos de camadas e parâmetros de cobertura/rocha orgânica. Materiais com a mesma estrutura podem gerar chaves distintas e ajustes podem exigir recompilação. Não basta apagar valores da chave: literais diferentes precisam virar uniforms para preservar pixels corretos.

**Otimização proposta:** distinguir estrutura do shader de valores editáveis, uniformizar os últimos, incluir no cache somente diferenças de código/layout e aquecer variantes realmente necessárias. O shader de desgaste já usa esse padrão para vários parâmetros e serve de referência, sem dispensar teste de isolamento entre materiais.

### 9. Seleção precisa examinar malhas; neve recompõe toda a cena

**Confirmado no código, com seleção medida.** [pick](../src/render/renderer.js#L790) e `surfaceBrushHit` fazem raycast recursivo sobre os roots e filtram hits depois. Em composições, roots também presentes no mapa de objetos podem incluir descendentes já examinados. `supportPoint` usa outra busca de apoios. Não há aceleração geral por BVH/células nessa seleção. O ensaio não confirma que picking seja o maior gargalo atual.

[rebuildSnow](../src/render/renderer.js#L713) remove coberturas de todos os objetos e reconstrói teste de exposição e depósitos quando `snowDirty` é ativado por mudanças espaciais/carga. O teste de exposição **já** possui grade local por triângulos; propor uma primeira grade como se não existisse seria incorreto. O espaço de otimização está em reutilizar o índice e invalidar apenas regiões cuja geometria/exposição mudou.

**Otimização proposta:** roots únicos, broad phase de bounds seguida do teste exato, índices de apoio e invalidação local de neve, incluindo a região sob tetos/oclusores movidos e as posições antiga/nova. Aceleração não pode tornar vidro, portas, neve física ou apoios menos precisos.

### 10. Acervo grande pode tornar “Abrir” lento

**Hipótese de escala sustentada pelo código, sem acervo grande medido.** [DocumentStorage.list](../server/storage.js#L86) lê JSONs completos e capas para gerar metadados. [browser-repository.list](../src/data/browser-repository.js#L99) usa `getAll` de documentos e metadados mesmo que a galeria precise apenas de resumos. Cada categoria listada pode repetir essa leitura. Muitas cenas grandes ampliam parsing, cópias IndexedDB e pressão de memória.

**Otimização proposta:** índice de resumos atualizado atomicamente no save/import/delete, capas separadas e leitura sob demanda. No servidor, índice deve poder ser reconstruído após edição externa/falha; no Pages, migração deve conservar documentos/backups e revisão das capas. É etapa posterior aos gargalos de interação confirmados.

## O que já ajuda e deve ser preservado

O renderer reconcilia objetos por identidade; edição de intensidade já preserva malhas. Há renderização por demanda e interrupção de animação em aba oculta/movimento reduzido, cache de sombras, pool fixo de fontes locais por tipo/qualidade e orçamento de vistas. Receitas já agrupam malhas por material; assets possuem cache, descarte e templates limitados para rochas esculpidas. Texturas/atlas têm compartilhamento e liberação por referência. Efeitos limitam o DPR e AO usa meia resolução. Essas medidas não precisam ser reimplementadas.

Carga elevada em SwiftShader não prova vazamento, bug de GPU ou necessidade de migrar para WebGPU. Não foram perfilados hardware real, acervo pessoal, Jukebox concorrente, multitarefa do sistema ou o pipeline completo da UI. Não se identificou um loop infinito no escopo lido. Os mecanismos confirmados justificam otimizações, mas a ordem final deve ser ajustada com uma captura de performance dos sintomas reais.
