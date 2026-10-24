# Plano de desempenho — 24 de outubro de 2026

Plano escrito para implementação por um agente. Nada deste documento foi implementado ainda. Complementa o [plano de otimização de edição](PERFORMANCE_PLAN.md) (implementado, ver [PERFORMANCE_IMPLEMENTATION.md](PERFORMANCE_IMPLEMENTATION.md)) e o [plano de renderização em escala](RENDER_SCALE_PLAN.md) (etapas 1–4 concluídas).

## 0. Antes de começar

### Regras do repositório

- Ler [AGENTS.md](../AGENTS.md) e os documentos de arquitetura relevantes ([ARCHITECTURE.md](ARCHITECTURE.md), [DYNAMIC_LIGHTING.md](DYNAMIC_LIGHTING.md), [MATERIALS.md](MATERIALS.md)).
- Manter `progress.md` atualizado durante o trabalho (concluído, em andamento, validação, pendências reais) e sincronizar `PROGRESSO.md` e `docs/PROGRESSO.md` ao concluir.
- Câmera de trabalho e câmera publicada continuam independentes: navegação livre nunca publica no projetor.
- Vale o [contrato de preservação](PERFORMANCE_PLAN.md#contrato-de-preservação): sem perda visual; não reduzir DPR, LOD, sombras, partículas ou efeitos como solução padrão; não mudar o schema dos documentos nem gravar estado de runtime no JSON.
- Estilo de código: linhas densas como no código existente, comentários curtos em inglês explicando o *porquê*, sem abstrações novas sem necessidade.
- Testes: `npm test` (`node --test tests/*.test.js`). E2E: `node --test --test-concurrency=1 tests/e2e/*.test.js`, que rodam sobre `dist/` — executar `npm run build` antes. Nunca rodar suítes gráficas ou benchmarks em paralelo. Conferir também `npm run build:pages`.
- Medições de desempenho só valem na GPU real (Radeon RX 580). WebGL por software (SwiftShader) verifica funcionamento, não desempenho.

### O que já foi feito (não refazer)

Render sob demanda; setters idempotentes; snapshots copy-on-write; reconciliação DOM por identidade; capas em alvo dedicado com fila; compartilhamento de material por frame ([material-sharing.js](../src/render/material-sharing.js)); AO lendo a profundidade do próprio frame; geometria soldada; uniforms de zonas em arrays planos; cache de 128 modelos; aquecimento de shaders com `compileAsync`; índice de exposição de neve sob demanda.

### Pendências conhecidas

- [RENDER_SCALE_PLAN.md](RENDER_SCALE_PLAN.md): etapa 5 (instanciamento), etapa 6 (LOD e sombras econômicas), etapa 7 (descarte por cômodo) e vidro de dupla face.
- [progress.md](../progress.md), templo gelado: ~52 ms/quadro no salão e ~42 ms nas vistas externas, porque o complexo inteiro é desenhado atrás das paredes; abrir a cena leva 16–20 s; a capa em Abrir leva ~10–13 s.
- Recursos adicionados depois de 10 de outubro nunca foram medidos em GPU: oclusão tática e silhuetas, figuras 2D, céu noturno, documentos interativos, câmera ao vivo, clima, interruptores.

### Medições de 24 de outubro (Node, CPU, sem GPU)

| O quê | Resultado |
|---|---|
| `generateSurfaceTile` (256²) | 20 presets = 2,77 s no total; 130–237 ms cada (plaster, ice, paint, leather, hazard, rock). O templo usa 32 combinações: ~4,5 s bloqueando o thread principal. |
| `recipeInstance` (359 modelos) | 6,0 s no total, média de 17 ms; árvores de 170–365 ms cada (`dense-alpine-fir`, `pine`, `dense-mountain-pine`, `alpine-pine`). |
| Bundle | `index.js` 1,08 MB (364 KB gzip), `three` 731 KB (184 KB gzip). O chunk `model-loader` é pré-carregado (`modulepreload`) apesar da divisão manual. |

Os números de CPU vêm de Node nesta máquina, não do navegador; servem para ordenar prioridades, não como meta.

## Fase 0 — Baseline do estado atual (P0, pequeno)

1. Rodar `node scripts/benchmark-frames.js` e `node scripts/profile-frames.js` na RX 580 com Backrooms, Casa, Igreja, Templo gelado (salão, biblioteca, vista externa) e Montanha. Salvar em `docs/benchmarks/frames-<data>.json`.
2. Repetir com `look.rendering.occlusion` e `silhouettes` ligados, céu noturno ativo e ~8 tokens/figuras na cena.
3. Adicionar `diagnostics.measure` em [renderer.js](../src/render/renderer.js) para `updateCutaway`, `prepareOcclusion`, `cutawayCasters`, `matrixWorld` (as duas chamadas `updateMatrixWorld(true)`), `figures`, `pages.sync` e montagem de `descriptors`. Hoje só `boundLights`, `zones`, `lightBudget`, `zoneProbes`, `screens` e `render` são medidos.
4. Decompor o carregamento com `performance.mark`/`measure`: fetch, tiles, receitas, `setDocument`, primeiro frame e shaders aquecidos, no templo e na igreja, com cache frio e quente.

**Aceitação:** JSON reproduzível com p50/p95 por subsistema e a decomposição do carregamento. As fases seguintes escolhem prioridade a partir dele.

## Fase 1 — Carregamento de cena (P0, maior ganho percebido)

### 1.1 Tiles procedurais em worker pool

Arquivos: [surface-pixels.js](../src/render/surface-pixels.js), [surface-materials.js](../src/render/surface-materials.js).

- `generateSurfaceTile(settings)` é pura e devolve `Uint8Array`. Criar `src/render/surface-worker.js` (module worker, `new Worker(new URL('./surface-worker.js', import.meta.url), { type: 'module' })`, suportado pelo Vite) e um pool de `min(4, navigator.hardwareConcurrency - 1)` workers. Devolver `albedo` e `details` como transferables.
- Criar uma variante assíncrona `ensureTile(settings) → Promise<tile>` ao lado de `cachedTile`, com dedupe por `surfaceStyleKey` (Map de promises em andamento).
- Em `createSurfaceLibrary().acquire`, enquanto o tile não chega, o material usa a cor base (`recipePreviewColor` já existe). Quando chega: escrever no atlas, fazer upload (1.3) e chamar `invalidate()` no viewport. Pedidos da cena atual têm prioridade sobre os de capas.
- Manter o caminho síncrono quando não houver `Worker` (Node/testes) e para `surfaceReferenceLuma`, que precisa do tile; alternativa é tornar o chamador assíncrono.
- Risco: capas ([scene-preview.js](../src/render/scene-preview.js), [scene-previews.js](../src/app/scene-previews.js)) capturarem antes dos tiles chegarem. O job de capa precisa aguardar `library.ready()` antes de capturar.

### 1.2 Cache persistente de tiles (IndexedDB)

- Store `surface-tiles` com chave `surfaceStyleKey + SURFACE_GENERATOR_VERSION`. Criar a constante e incrementá-la sempre que o algoritmo de geração mudar.
- Banco separado do repositório Pages (por exemplo `tabletop-derived-cache`), para não tocar na migração v2 descrita em PERFORMANCE_IMPLEMENTATION. Seguir o padrão de [example-preview-cache.js](../src/data/example-preview-cache.js).
- LRU de ~64 tiles (cada um tem 512 KB: dois RGBA 256²). Falha de IndexedDB nunca bloqueia a cena.
- O projetor (segunda janela, mesma origem) passa a reaproveitar os tiles em vez de gerá-los de novo.

### 1.3 Upload parcial do atlas

- Hoje um tile novo faz `atlas.albedo.needsUpdate = atlas.details.needsUpdate = true`, reenviando o atlas inteiro (256 × 256·N) e regerando os mipmaps.
- O atlas tem uma coluna, então cada tile é um intervalo contíguo do buffer. Usar `texture.addUpdateRange(offset, SIZE * SIZE * 4)` (existe no three 0.186, `node_modules/three/src/textures/Texture.js:442`).
- Verificar no `WebGLTextures` do three 0.186 se os mipmaps são regenerados quando há `updateRanges`. Se não forem, medir contra o upload completo; sem ganho comprovado, não mudar.

### 1.4 Geometria das receitas fora do thread principal

Arquivos: [asset-cache.js](../src/render/asset-cache.js) (`recipeInstance`), [crafted-geometry.js](../src/render/crafted-geometry.js), [botanical-primitives.js](../src/render/botanical-primitives.js), [rock-geometry.js](../src/render/rock-geometry.js), [landscape-geometry.js](../src/render/landscape-geometry.js).

- Separar `recipeInstance` em duas etapas:
  - **Geometria pura** (worker): recebe `parts`, `rockShape`, `metricBounds` e `vegetationSeed`; devolve, por lote de material, `{ position, normal, uv, index, atributos extras, userData }` como typed arrays transferíveis. Worker de módulo importando `three`; as primitivas não usam DOM.
  - **Montagem** (thread principal): `BufferGeometry` a partir dos arrays, materiais e `Mesh`.
- Cache IndexedDB dos buffers com chave `hash(recipe JSON) + parâmetros + GEOMETRY_VERSION`, no mesmo banco derivado de 1.2.
- Manter o caminho síncrono para testes e Node.
- Aceitação: teste unitário comparando, para os 359 modelos, atributos byte a byte entre o caminho síncrono e o do worker.
- Risco: `userData` de geometria (`rock`, `faceted`, `wearSourceGeometry`) precisa ser serializável por `structuredClone`.

### 1.5 `setDocument` fatiado e paredes sem O(W²)

Arquivo: [renderer.js](../src/render/renderer.js) (`setDocument`, por volta da linha 912).

- Na troca de documento (`old?.id !== next.id`), criar as entidades em lotes de ~8 ms, cedendo o thread com `scheduler.yield()` (fallback com `MessageChannel`). Proteger com `generation`: um documento novo cancela o lote anterior. Edições incrementais continuam síncronas.
- `createWall(entity, doors.filter(...), entities.filter(e => e.kind === 'wall'))` filtra todas as entidades para cada parede. Usar o `Map` `openings` (wallId → vãos), que já é montado logo acima e não é usado nessa chamada, e uma lista única de paredes.
- `wallJoinProfile(w, walls)` é O(W²): criar um índice espacial (grid hash das extremidades, célula de ~1 m) e passar só as paredes vizinhas. Conferir junções em T e anguladas.
- `JSON.stringify(walls.map(wallShape))` roda a cada edição. Trocar por comparação de identidade dos records quando o snapshot for confiável (`isTrustedSnapshot`), mantendo o stringify como fallback.
- Aceitação: mesmo conjunto de objetos e pixels do caminho síncrono; nenhuma tarefa acima de 50 ms durante a carga, exceto upload de GPU; trocar de cena no meio da carga não instala objetos antigos.

### 1.6 Variante de shader da oclusão tática

Arquivo: [occlusion.js](../src/render/occlusion.js).

- `makeOccluder` acrescenta `|occluder` ao `customProgramCacheKey` e marca `needsUpdate` na primeira vez em que a oclusão é ativada. Isso recompila de uma vez todos os materiais de parede, teto e props altos, e a interface trava.
- Opção A (preferida): aplicar o patch na criação do material sempre que o registro for candidato a oclusor. O loop do shader faz `break` com `occlusionCount == 0`, então o custo é desprezível e a chave de programa fica estável.
- Opção B: manter como está, mas aquecer a variante com `compileAsync` quando a cena tiver tokens.
- `isOccluder` faz `Box3.setFromObject` por objeto; reutilizar `pickBounds` (WeakMap existente) ou os bounds do asset.

## Fase 2 — CPU por frame (P1)

Todos os pontos estão no `render()` de [renderer.js](../src/render/renderer.js) (linhas ~336–477), executado em todo frame com movimento.

1. **Matrizes de mundo.** `content.updateMatrixWorld(true)` e `lighting.updateMatrixWorld(true)` rodam com `force = true` em todo frame, e depois `effects.render` chama `scene.updateMatrixWorld()` de novo ([effects.js](../src/render/effects.js), `render`). Proposta: `matrixAutoUpdate = false` nos objetos autorais; `applyTransform` chama `object.updateMatrix()` e marca `matrixWorldNeedsUpdate = true`; remover o `force` e deixar a propagação por dirty flag. Objetos animados (figuras, portas em transição, glides, gizmo, inspeção) continuam com `matrixAutoUpdate = true`. Risco: auditar todos os pontos que alteram `position`/`quaternion`/`scale` diretamente (`grep -n "\.position\.\(copy\|set\|add\)" src/render`).
2. **`updateCutaway`.** Faz quatro passadas completas por `objects` em todo frame e aloca três `Vector3` por parede. Pré-classificar as listas (`walls`, `ceilingHung`, `decals`, `openings`) no `setDocument`, por `generation`. Só recalcular quando a direção de visão quantizada (dot < 0,999 com a anterior), `cutaway`, `roofsHidden`, `selectedId`, `tool` ou `generation` mudarem. Memoizar `visibleRecord` (recursiva, chama `assemblyMembers`) por `(record, generation, isolatedLevel, roofsHidden)`.
3. **`cutawayCasters.update`** ([cutaway-shadows.js](../src/render/cutaway-shadows.js)). Chama `original.updateWorldMatrix(true, true)` e `proxy.updateMatrixWorld(true)` para cada parede em todo frame. Só fazer quando `generation` ou a visibilidade do original mudar.
4. **Alocações e trabalho no corpo do `render()`:**
   - `descriptors` é refeito com `filter`/`map`, e `[...boundLights.values()].some(...)` roda em todo frame. Manter a lista base por `generation` e acrescentar só a lanterna e o fogo.
   - `sources(region)` filtra todas as fontes com cálculo de distância para cada zona: O(zonas × fontes) por chamada do probe. Pré-calcular as posições uma vez por frame.
   - `new THREE.Frustum()`, `new Matrix4()`, `new Vector3(...step.displacement)`, `new Spherical()` e `new Vector3(0, 1, 0)` são criados por frame. Trocar por temporários no escopo do módulo.
   - `prepareOcclusion` faz `[...records.values()].filter(r => r.actorId …)` em todo frame. Manter `tokenIds` atualizado no `setDocument`.
   - `pages.sync` ([page-textures.js](../src/render/page-textures.js)) cria um `Set` e um array por frame. Pular quando `entities` e `objects` não mudaram (comparar por `generation`).
5. **`applyCamera` → `resize()`.** Em cada frame de transição, `resize()` lê `container.clientWidth` e força layout. Separar `updateProjection()` (aspect e frustum) de `resize()`, que fica só no `ResizeObserver`.
6. **`onCameraChange`** ([application.js](../src/app/application.js), por volta da linha 514). Faz três `querySelector` em cada frame de órbita. Guardar os nós e só alternar as classes quando `projection` mudar.

**Aceitação:** pixels idênticos nas fixtures dos E2E `material-sharing` e `performance`; p95 de script por frame do `profile-frames.js` menor no templo e na igreja; nenhuma regressão em cutaway, isolamento de andar, decal sumindo com o host, teto levantado, sombras de cutaway e oclusão tática.

## Fase 3 — GPU e draw calls (P1, decidir pela Fase 0)

### 3.1 Descarte por cômodo (etapa 7 do RENDER_SCALE_PLAN; maior ganho no templo)

A medição de 10 de outubro mostrou que o tempo de quadro acompanha as chamadas de desenho, não os triângulos. O templo desenha todas as salas atrás das paredes.

V1, portal culling:

- **Células:** cômodos e zonas já existentes (`lightingZone` por sala, salas do Construir, `levelId`). Atribuir cada objeto a uma célula no `setDocument` (contenção do centro do AABB; objetos ancorados herdam a célula do host).
- **Portais:** portas, janelas e vãos (`wallId` + `offset`/`width`/`height`/`sill`).
- **Por frame:** localizar a célula da câmera e fazer BFS pelos portais, estreitando o frustum pelo retângulo do portal em NDC. Objetos fora das células alcançadas ficam `visible = false` apenas durante o passe de cor, com salvar/restaurar no mesmo padrão de `materialSharing.begin/end`.
- **Desligar** com `cutaway`, `roofsHidden`, câmera ortográfica, câmera fora de qualquer célula (vista externa; no V1, todas as células com portal para o exterior ficam visíveis) e durante capas.
- **Não aplicar** ao passe de sombras nem às zone probes: luz que vaza por portas precisa dos casters.
- Cada viewport tem o seu culling (editor e projetor têm câmeras independentes).

**Aceitação:** diferença de pixels zero contra o culling desligado em todas as câmeras do templo e da igreja (qualquer diferença indica célula ou portal errado); chamadas de desenho e ms medidos no salão do templo (hoje ~52 ms).

### 3.2 `DoubleSide` como padrão

- `standardMaterial` ([asset-cache.js](../src/render/asset-cache.js), linha ~45) cria todos os materiais de receita com `side: THREE.DoubleSide`, o que desliga o backface culling (custo de fragmento e no passe de sombra).
- Material transparente com `DoubleSide` é desenhado em dois passes, marcado com `needsUpdate` em todo frame e fica fora do compartilhamento de materiais. É a pendência do "vidro de dupla face".
- Proposta: `FrontSide` para shapes fechados (`box`, `ellipsoid`, `sphere`, `lathe` fechado, `cylinder` sem `openEnded`); `DoubleSide` apenas para planos, `openEnded`, folhagem e o que a receita marcar explicitamente; vidro fino com `forceSinglePass = true`.
- Validação obrigatória: `node scripts/review-library.js` antes e depois, com diff de pixels por modelo, e revisão manual das peças que mudarem (normais invertidas aparecem como buracos).

### 3.3 Instanciamento (etapa 5; só depois de 3.1 e 3.2)

- `BatchedMesh` (three 0.186) por grupo do `material-sharing` (mesma geometria e material equivalente). Seleção e picking via `batchId → entityId`. A peça sai do lote ao receber material ou geometria próprios.
- Alto risco (seleção, gizmo, projetor, desgaste por instância, transparência). Fazer só se, depois de 3.1, igreja e templo ainda passarem de 16,7 ms.

### 3.4 Sombras econômicas (etapa 6, parcial)

- `castShadow = false` em partes com raio de bounding menor que ~3 cm. Só ajuda quando as sombras são redesenhadas (luzes com flicker ou em movimento, portas). Medir `shadowFrames` antes de investir.

### 3.5 MSAA duplicado (baixa prioridade)

- O contexto é criado com `antialias: true` ([renderer.js](../src/render/renderer.js), linha ~135) e, com o composer ativo, o alvo de efeitos também usa `samples: 4`. Com efeitos ligados, o canvas recebe só um quad de tela cheia, e o MSAA do framebuffer padrão é banda desperdiçada.
- Não dá para trocar depois de criado o contexto. Só investigar se o perfil de GPU mostrar custo relevante.

## Fase 4 — Bundle e segunda janela (P2)

1. **`GLTFLoader` estático** no topo de [asset-cache.js](../src/render/asset-cache.js) anula o chunk `model-loader` (aparece como `modulepreload` em `dist/index.html`). Trocar por `await import()` apenas quando houver asset `.glb`, como [application.js](../src/app/application.js) já faz na importação (linha ~1830).
2. **Carregamento sob demanda:**
   - `tutorial/lessons.js` (80 KB) e `tutor.js` só quando o tutorial abrir.
   - `authoring/*` (building, room-ambience, surroundings, furnishing, quick-build, polish; ~250 KB de fonte) via `import()` no primeiro uso da ferramenta.
   - O projetor (`?presentation=`) não carrega nada de autoria nem de tutorial: separar o ponto de entrada da apresentação em [main.js](../src/main.js).
3. O projetor também se beneficia de 1.2 e 1.4, porque os caches IndexedDB são compartilhados entre janelas da mesma origem.

**Aceitação:** tamanho gzip de `index.js` registrado antes e depois; E2E de Pages, tutoriais e apresentação aprovados; tempo até o primeiro frame do projetor menor.

## Ordem sugerida

| # | Item | Ganho esperado | Risco |
|---|---|---|---|
| 1 | Fase 0 | Decide o resto | Baixo |
| 2 | 1.1 + 1.2 + 1.3 | Segundos a menos na carga, nas capas e no projetor | Médio |
| 3 | 1.5 | Carga sem tarefa longa | Médio |
| 4 | Fase 2 | Menos ms de CPU por frame em cenas grandes | Médio |
| 5 | 3.1 | Maior ganho de FPS no templo | Alto |
| 6 | 1.4 | Carga de cenas com vegetação | Médio |
| 7 | 3.2, 1.6, Fase 4 | Pontuais | Baixo a médio |
| 8 | 3.3, 3.4, 3.5 | Só se a medição justificar | Alto |

## Critérios de cada entrega

- Mudança pequena, um commit por item, com medição antes e depois no mesmo roteiro (RX 580 para GPU).
- Testes unitários novos para o comportamento alterado; `npm test`, `npm run build`, `npm run build:pages` e os E2E afetados, executados em sequência.
- Constante de versão incrementada sempre que o formato de um cache derivado mudar.
- Registro em `progress.md` do que foi medido, do que não foi e das pendências reais; resumos em `PROGRESSO.md` e `docs/PROGRESSO.md` sincronizados ao concluir.
- Reversão: caches derivados (tiles, geometria) podem ser apagados sem perda de dados; documentos de cena não mudam.
