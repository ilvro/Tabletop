# Implementação do plano de desempenho

Implementação de 7 de outubro de 2026 do [plano](PERFORMANCE_PLAN.md). A [análise original](PERFORMANCE_ANALYSIS.md) e a [baseline](benchmarks/performance-2026-10-07.json) descrevem o estado anterior. O schema dos documentos, o detalhe da cena e as escolhas de qualidade permanecem os mesmos.

## Entregas

| Etapa | Implementação |
| --- | --- |
| 0 | Diagnóstico opt-in, amostras limitadas a 180 por operação, percentis, contadores, tarefas longas e timer GPU quando disponível. |
| 1 | Setters idempotentes; confirmação de save sem reaplicar a cena; metadados e seleção sem invalidar sombras; normalização consistente das rotações das luzes. |
| 2 | Contrato de alterações derivado; reconciliação DOM por identidade; painéis atualizados por dependência; projeção pública memorizada; receptores com heartbeat/ressincronização; publicação de câmera separada; gravação de rascunhos com apenas um estado pendente. |
| 3 | Render target de 480 × 270 com pipeline/crop próprios, readback assíncrono quando suportado e JPEG via `toBlob`; fila de até 32 jobs, prioridades, coalescência, cancelamento, pausa durante gestos e fallback para idle. Um viewport externo atende o lote e é descartado ao esvaziar/encerrar. |
| 4 | Atributos persistentes de terreno/máscaras/cores e contorno do pincel; normais regionais e upload por frame conservando amostras coalescidas; picking usa alturas atuais antes do upload; raízes únicas e filtro de bounds antes da interseção exata. |
| 5 | Snapshots congelados por copy-on-write, 150 entradas, compartilhamento de ramos intactos, dirty canônico memorizado; composições estáveis preservadas; dependências de paredes/vãos restringidas aos perfis efetivos. |
| 6 | Parâmetros numéricos de superfícies em uniforms por material, chaves estruturais de shader, aquecimento assíncrono do conteúdo visível, listas derivadas de luzes/água e caches de emissão/matrizes de zonas. |
| 7 | Bounds/seleção consolidados por frame, templates limitados com geometria compartilhada e escultura por cópia; índice de exposição memorizado, depósitos de neve por regiões afetadas; resumos persistentes no servidor e IndexedDB, com capas separadas no Pages. |

Os jobs da biblioteca que excedem a fila ficam como metadados leves, sem documento carregado ou contexto WebGL. Fechar a galeria cancela também esse backlog. Os exemplos distribuídos usam a mesma fila, somente quando seus cartões ficam visíveis; suas capas são geradas dos JSONs, sem JPGs em `public/scenes`. Um cache derivado IndexedDB separado da biblioteca pessoal conserva até 32 imagens de exemplos, invalidadas pelo conteúdo/revisões dos assets; falhas de armazenamento não bloqueiam a cena. A chave também contém a versão `renderer-1`; incrementar esse marcador quando uma alteração do pipeline exigir regenerar capas já armazenadas. Pedidos da cena atual/salva interrompem jobs menos prioritários de exemplos, retomados depois; uma capa pessoal em curso pode terminar. A visibilidade é acompanhada durante a rolagem para exemplos e documentos pessoais; jobs pendentes ganham prioridade, inclusive quando a fila já contém 32 entradas. O viewport oculto aguarda carregamento/compilação suspenso e desenha apenas o frame de preparação e a captura. Estatísticas da captura preservam o contador interno monotônico de frames do Three.js. O cache de imagens em memória conserva até 64 entradas; templates de receitas até 32, além do cache anterior de seis esculturas. Referências de geometria são contadas por malha, incluindo descarte conjunto de múltiplas instâncias. Templates conservam arrays CPU, mas liberam os buffers GPU quando a última instância sai de uso. Snapshots normalizam zero negativo para manter o roundtrip JSON anterior. A substituição de objetos conserva no máximo um antecessor por ID até o próximo frame, permitindo adquirir o mesmo programa GPU antes de liberar seu último proprietário anterior.

Workers, BVH e instanciamento eram investigações condicionais do plano. Não foram introduzidos sem evidência de vantagem e equivalência. Escultura atualiza normais da região e de seus triângulos vizinhos, com acumulação Float32 equivalente à reconstrução completa; usa o caminho completo quando mais da metade dos vértices é afetada. Pintura conserva a geometria e não exige esse cálculo. Neve física/topologia diferente mantém o caminho completo quando necessário.

## Diagnóstico

Abra o editor com `?diagnostics` e consulte no console:

```js
__tabletop.resetPerformance();
// Execute a operação que quer medir e aguarde os frames/capa.
__tabletop.performance();
__tabletop.stats(); // Consulta completa, sob demanda; não chamar em cada frame.
```

`performance()` separa aplicação, viewport, store e capas. `globalShadowInvalidations`, `shadowFrames`, `documentUpdatesSkipped`, `sidebarSkipped`, `presentationBytes`, `terrainBufferUpdates` e os tamanhos de fila ajudam a conferir trabalho evitado. `gpuTimingSupported` informa se há timer GPU; amostras disjoint são descartadas. Tempos de frame em JavaScript não são medidas de apresentação física na tela.

Reprodução da auditoria sintética:

```sh
node --expose-gc scripts/audit-performance.js --out=test-results/performance-after-cpu.json
node --expose-gc scripts/audit-performance.js --browser --out=test-results/performance-after-browser.json
node scripts/benchmark-editor-performance.js --scenes=lighting-chapel --out=test-results/performance-editor.json
npm test
npm run build
npm run build:pages
node --test --test-concurrency=1 tests/e2e/*.test.js
```

Executar testes gráficos e benchmarks separadamente. `benchmark-editor-performance.js` percorre os handlers reais da interface com editor sozinho e com projetor, usando repositório/perfil temporários; não possui baseline anterior para esse caminho completo. Os arquivos pessoais não são usados como fixture de gravação nos novos testes.

## Persistência e recuperação

O servidor guarda índices auxiliares em `data/.summaries/{collection}/{id}.json`, com troca atômica por arquivo e comparação de inode/tamanho/mtime/ctime do documento e da capa. Arquivo ausente, obsoleto ou JSON corrompido é reconstruído. Alterações externas continuam sendo detectadas; o documento é a fonte de verdade. O cache em memória tem limite de 256 resumos. Falha ao escrever o índice não transforma um documento já salvo em falha de save. A pasta derivada é ignorada pelo Git.

O Pages abre o banco existente na versão 2 e cria `summaries` na mesma transação de migração, preservando documentos, assets, metadados, capas e backups. Saves, cópias, exclusões e capas atualizam seus resumos atomicamente com os registros originais. O nome/escopo do banco não muda. `list(type, { previews: false })` evita carregar documentos e imagens; `readPreview(summary)` carrega a capa separadamente. A listagem padrão mantém a API anterior, inclusive capas antigas enquanto a nova revisão é gerada.

Rascunhos conservam o debounce de 180 ms. A fila mantém a transação em curso e substitui somente o estado pendente. `pagehide` continua sendo uma tentativa de flush, sem garantia de conclusão assíncrona. Câmera de trabalho, câmera publicada, qualidade do projetor e filtragem de privados continuam independentes.

## Validação e medidas

Medição CPU final em execução isolada: [JSON reproduzível](benchmarks/performance-implemented-cpu-2026-10-07.json), comparado à [baseline](benchmarks/performance-2026-10-07.json), no mesmo ambiente Node/Xeon e com o mesmo roteiro (25 amostras, cinco de aquecimento). São operações sintéticas do store, sem DOM/renderização; não representam latência total da interface.

| Operação | Antes | Depois |
| --- | --- | --- |
| Renomear na capela, p95 | 4,03 ms | 2,01 ms |
| Renomear na montanha, p95 | 26,52 ms | 7,76 ms |
| Renomear na igreja, p95 | 46,16 ms | 15,76 ms |
| Alterar intensidade na igreja, p95 | 46,97 ms | 13,30 ms |
| Heap retido após 150 renomeações na igreja, com GC | 133.150.832 bytes (~127 MiB) | 747.888 bytes (~0,71 MiB) |

A redução de heap é de aproximadamente 99,4% nessa fixture. Essa medida não inclui memória GPU nem equivale à memória total do navegador. As metas de 30 FPS/33,3 ms e ausência de tarefas longas no notebook/projetor exigem medição presencial e não são resultados de SwiftShader.

O [benchmark do editor real](benchmarks/performance-implemented-editor-2026-10-07.json) percorreu os handlers DOM da capela com Chromium 145/SwiftShader, seis amostras e duas de aquecimento. Os controles conservaram a identidade; a renomeação não invalidou sombras globais nem produziu frames de sombra. Sem projetor, oito publicações foram evitadas; com projetor, os oito estados foram enviados. Nenhum erro de navegador foi registrado.

| Handler real, p95 | Editor | Editor + projetor |
| --- | --- | --- |
| Renomear objeto | 31,60 ms | 32,70 ms |
| Alterar intensidade | 27,20 ms | 17,20 ms |

Não há baseline anterior desse fluxo completo; esses valores não devem ser comparados diretamente aos tempos isolados do store. O intervalo até duas callbacks rAF foi muito maior em software: p95 de 1,81/5,24 s para renomear e 1,86/10,01 s para intensidade, sem/com projetor, respectivamente. Inclui renderização e capas durante a sequência; não é tempo físico de apresentação nem evidência de que as metas no notebook foram atingidas. A renderização em SwiftShader continua sendo uma limitação importante deste ambiente de validação. Medir hardware alvo permanece necessário.

A suíte gráfica ampla executou 60 casos: 57 passaram na execução integral; três revelaram diferenças de zero negativo no roundtrip JSON e buffers GPU conservados pelos templates. Esses três caminhos foram corrigidos e aprovados em repetição dirigida. A validação final tem 220 testes de domínio/integração, builds local/Pages e 15 E2E afetados aprovados por suíte/repetições, incluindo exemplos e capas pessoais. A suíte integral não foi repetida após os últimos ajustes. Logs: `test-results/performance-e2e-corrections.log`, `performance-and-covers-e2e-accepted.log` (11 aprovações; o caso antigo de fila ainda falhava nesse run), `older-cover-e2e-final.log` (caso antigo corrigido/aprovado), `example-previews-e2e-final.log` e `example-previews-unit-final.log`. A correção final observa cartões pessoais durante a rolagem e promove jobs já enfileirados; o cenário de 200 documentos com fila cheia também é coberto. Resultados consolidados em `progress.md`.

As novas regressões cobrem compartilhamento/imutabilidade e 150 undo/redo, atomicidade, confirmação concorrente, privacidade do cache público, rajada de 50 gravações, equivalência de atributos do terreno, descarte de geometria compartilhada, fila/cancelamento de 200 capas, índices com 10/50/200 documentos e alterações externas, migração Pages, foco/seleção/presets, ausência de sombras redundantes e captura sem modificar o canvas visível.

## Reversão

Não há migração de cenas/mapas/ambientes. O índice do servidor pode ser apagado com o serviço parado e será reconstruído. Para reverter apenas a UI/renderer, conservar a versão 2 do banco e a leitura das stores existentes; um navegador rejeita abrir um banco 2 explicitamente como versão 1. Exportação de JSON, backups e dados autoritativos não dependem dos índices auxiliares. Reverter as mudanças de runtime por arquivo/commit deve preservar os trabalhos anteriores e as cenas pessoais.

Em 8 de outubro, os estudos de iluminação passaram a `tests/fixtures/scenes/`. A auditoria isolada lê os novos caminhos; o benchmark do editor importa a fixture pela interface quando `--scenes` contém `lighting-*`. Seu conjunto padrão agora usa casa, montanha e igreja.
