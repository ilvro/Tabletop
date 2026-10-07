# Plano de otimização sem perda visual

Plano de 7 de outubro de 2026, baseado na [auditoria e medições](PERFORMANCE_ANALYSIS.md). As etapas abaixo são propostas; a aplicação ainda não foi otimizada por este trabalho. Priorizar eliminação de processamento repetido e alocações, conservando o resultado da cena e os fluxos atuais.

## Contrato de preservação

Manter geometria/detalhe, resolução escolhida, quantidade de partículas, materiais, transparência, sombras, fontes selecionadas, névoa, AO, reflexos e bloom. Preservar todas as ferramentas, foco/scroll/disclosures, teclado/toque, undo/redo, prévia aceitar/cancelar, recuperação, save/reload/import/export, revisões concorrentes e Pages. Navegação livre não publica câmera; projetor recebe apenas conteúdo autorizado, com câmera e qualidade próprias. Otimização não deve alterar documentos antigos nem escrever estado de runtime no JSON.

Não usar como solução padrão: reduzir DPR/resolução, FPS das animações, detalhe/LOD, sombras/luzes/partículas; desativar efeitos; encurtar o histórico; atrasar recuperação; ocultar modelos; simplificar picking. Instanciamento e qualquer alteração no pipeline gráfico só entram após comprovar equivalência de materiais, seleção, transformações, transparência e descarte.

## Ordem de execução

| Etapa | Entrega | Prioridade | Esforço relativo | Dependência |
| --- | --- | --- | --- | --- |
| 0 | Baseline no fluxo real e contadores por subsistema | P0 | Pequeno | Nenhuma |
| 1 | Setters idempotentes e invalidação correta de sombras | P0 | Pequeno/médio | Baseline |
| 2 | Atualização seletiva de UI, projeção e recuperação | P1 | Médio | Etapa 1; contrato de alterações |
| 3 | Capas sem pico de trabalho no viewport principal | P1 | Médio | Baseline; filas/versionamento |
| 4 | Buffers persistentes no pincel e picking acelerado | P1 | Médio/grande | Baseline; índices derivados |
| 5 | Histórico e reconciliação com compartilhamento estrutural | P1 | Grande | Contrato de alterações; validação |
| 6 | Materiais uniformizados e atualizações temporais menores | P2 | Médio/grande | Baseline de pixels/compilação |
| 7 | Carga de assets, neve e galeria em escala | P2 | Médio/grande | Índices/invalidação; medidas de escala |

Esforço indica complexidade/risco relativo, não compromisso de prazo. Entregar em mudanças pequenas; usar os ganhos medidos de cada etapa para escolher a próxima. A etapa 5 pode avançar antes da 4 se histórico/heap dominar a experiência real; a etapa 3 ganha prioridade se as pausas ocorrerem um segundo depois de editar.

## Etapa 0 — medir o sintoma no caminho completo

**Entregar:** modo de diagnóstico opt-in, com ring buffers limitados, que separe comando/validação/clone/dirty, DOM, reconciliação, sombras, emissão/zonas, picking, pincel, neve, capas, rascunho e envio/recepção do projetor. Não chamar `getInfo` pesado em cada frame. Reutilizar os diagnósticos existentes, separando aquecimento da fase estável. Adicionar contadores de execuções e trabalho evitado, além de tempo.

**Roteiro:** fixture pequena (capela/escritório), média (montanha), grande (igreja). Carregar frio/quente; percorrer dez câmeras; renomear, ajustar intensidade/material e mover prop; pintar/esculpir dez segundos; undo/redo; aguardar capa; abrir galeria; salvar/recarregar. Repetir com animações normais, depois isoladas para diagnóstico. Conferir servidor e Pages. Medir editor sozinho e editor + apresentação; executar no notebook/projetor alvo, registrando GPU, CPU, navegador, resolução, DPR e qualidade. Não rodar suítes gráficas simultâneas.

**Medidas:** latência até o próximo frame apresentado, p50/p95/p99 e máximo, tarefas longas acima de 50 ms, CPU por caminho, chamadas/triângulos/programas/texturas, sombras efetivamente redesenhadas, bytes/frequência de mensagens, heap após coleta quando disponível e fila de jobs. GPU por timer query quando suportado, descartando amostras disjoint; caso contrário, declarar ausência. Capturas de CPU do DevTools devem explicar picos antes de propor workers.

**Aceitar quando:** houver baseline reproduzível e contagem de chamadas capaz de provar que uma renomeação provocou ou evitou atualização de sombras. Meta inicial a validar no hardware: navegação estável dentro de 33,3 ms/frame (30 FPS), sem tarefas JS acima de 50 ms em operações simples após aquecimento. São objetivos, não resultados já atingidos; carga inicial/compilação será registrada separadamente.

## Etapa 1 — retirar invalidações sem mudança

**Arquivos:** `src/app/application.js`, `src/render/renderer.js`, `src/render/light-manager.js`.

1. Fazer setters de isolamento, apoio e plano de trabalho detectarem mudanças reais. Separar atualização de estado, visibilidade e pedido de renderização.
2. Em `updateView`, só reaplicar preferências/seleção que mudaram; confirmação de save atualiza metadados/estado salvo sem refazer o conteúdo gráfico.
3. Preservar invalidação espacial existente por bounds. Intensidade/cor não invalidam mapa de sombra se fonte/caster/seleção do orçamento mantêm o mesmo estado; alteração de seleção de fonte continua atualizando o slot necessário.
4. Fazer seleção, helpers e mudanças de texto pedirem somente o redesenho necessário, sem invalidar sombras físicas.

**Aceitação:** rename/save não criam malhas, materiais ou programas nem redesenham sombras físicas em câmera fixa. Intensidade mantém objetos e caches quando não muda a seleção do orçamento. Mover objeto, abrir porta, ocultar camada/pasta, mudar isolamento, reposicionar fonte e trocar enquadramento atualizam todas as sombras afetadas. Comparação de pixels confirma recorte e visibilidade. Meta: zero invalidações redundantes nesses casos, antes de exigir um ganho percentual.

**Risco:** retorno antecipado pode ignorar visibilidade alterada no documento. Comparar dependências efetivas ou concluir essa atualização em `setDocument`; testar combinação isolamento + pastas/camadas + hosts.

## Etapa 2 — uma edição atualiza seus consumidores

**Arquivos:** `src/state/commands.js`, `src/state/scene-store.js`, `src/app/application.js`, `src/app/presentation.js`, `src/data/drafts.js`.

Introduzir um contrato interno de alterações: IDs/ramos afetados, adições/remoções e categorias de impacto (texto, organização, transform, geometria, material, luz, zona, ambiente, câmera). Undo/redo emite o impacto correspondente; replace/import mantém fallback completo. Esse contrato é derivado e não modifica o schema salvo.

Atualizar campos/linhas DOM por identidade, conservando nós dos campos ativos, seleção do texto, scroll e disclosures. Evitar reconstruir atmosfera/árvore/construção para alteração sem dependência. Não começar por virtualização que retire linhas acessíveis ou prejudique busca/teclado.

Memorizar projeção pública por versão e manter registro de apresentações vivas com expiração. Enviar snapshot completo ao conectar/reconectar; publicar câmera por mensagem própria, mantendo `cameraSequence`, duração e publicação explícita. Coalescer snapshots intermediários no mesmo ciclo. Deltas de conteúdo são opcionais posteriores: exigem baseSequence, detecção de lacunas e ressincronização completa. Filtrar privados **antes** de derivar qualquer mensagem/cache público.

Para recuperação, manter o debounce atual e substituir apenas a gravação pendente mais antiga pelo estado mais recente, sem interromper a transação em curso. Eliminar cópias explícitas redundantes quando o snapshot é congelado e garantir revisão/versão na confirmação. Não transformar `pagehide` em garantia de gravação assíncrona; recuperação precisa ser conferida também em encerramento abrupto.

**Aceitação:** editar intensidade atualiza seu campo/estado sem reconstruir painéis alheios; publicar câmera não transporta layout/assets; editor sem receptor não monta snapshots públicos repetidos; reconexão recupera o estado aceito mais recente. Rajada de 50 edições conserva o último rascunho, histórico e confirmação correta de save concorrente. Conteúdo GM e prévias não vazam; navegar na câmera de trabalho não move o projetor.

## Etapa 3 — capas com custo limitado

**Arquivos:** `src/app/scene-previews.js`, `src/render/scene-preview.js`, `src/render/renderer.js`, `src/data/scene-preview.js`.

Priorizar card visível e documento atual, coalescer por documento/revisão/versão, cancelar trabalho obsoleto e limitar jobs pendentes. Fazer uma pausa quando houver gesto/transição ativa, com idade máxima para evitar postergação indefinida. `requestIdleCallback`, se utilizado, precisa de fallback; idle da CPU não significa GPU livre.

Substituir dupla renderização no canvas visível por captura em alvo dedicado, mantendo pipeline/câmera/crop. Reusar o renderer de capas de documentos externos e cache limitado entre jobs, com descarte explícito no encerramento. Preferir `toBlob`/codificação assíncrona; readback também deve ser medido, pois uma API assíncrona não elimina necessariamente sincronização GPU.

**Aceitação:** capa de 480 × 270 limpa, atualizada e coerente com a revisão; nenhuma câmera alterada, flicker de helpers ou imagem antiga substituindo edição nova. Salvar não aguarda capa. Abrir/fechar galeria de 30 cenas sem capa não deixa fila/contexts crescendo indefinidamente. Diminuir o pico medido de captura mantendo comparação visual no mesmo enquadramento, inclusive névoa/bloom/AO e sombras. Se o alvo menor alterar significativamente pixels, manter o caminho atual até corrigir a equivalência.

## Etapa 4 — pincel e seleção com estruturas persistentes

**Arquivos:** `src/render/renderer.js`, `src/render/scene-objects.js`, `src/render/rock-sculpt.js`, `src/domain/geometry.js`.

Reusar o buffer do círculo; para topologia igual, atualizar os atributos existentes do terreno. Pintura atualiza máscaras/cores, escultura atualiza alturas e normais da região com sua vizinhança. Recalcular bounds/apoios quando necessário. Unificar uploads e reconciliação por frame, conservando amostras espaciais/coalescidas e seus timestamps quando relevantes; descartar eventos indiscriminadamente mudaria a força/cobertura do pincel.

Separar seleção em roots únicos, filtro de bounds/células e interseção exata. Avaliar BVH somente depois de medir picking em cenas densas; geometrias deformadas precisam atualizar/refazer a aceleração. Indexar apoios/hosts, sem substituir superfícies reais por caixas aproximadas no resultado final.

**Aceitação:** gesto com mesma trajetória produz alturas/máscaras equivalentes; um undo restaura exatamente o documento anterior e Esc restaura o preview. Pintura sem mudança geométrica não cria `BufferGeometry`/material/programa por evento nem recalcula sombras. Escultura preserva apoio/proteção de pisos, água e neve. Picking mantém entidade/ponto/distância, oclusão, vidro, neve física, aberturas, composições e bloqueios. Contar alocações/stamps/uploads por gesto e comparar p95 no hardware.

## Etapa 5 — compartilhar snapshots e limitar dependências

**Arquivos:** `src/state/scene-store.js`, `src/state/commands.js`, `src/domain/validation.js`, `src/render/renderer.js`, `src/domain/assemblies.js`.

Começar pelo cache do conteúdo canônico do snapshot corrente e da versão salva. Estado `dirty` precisa continuar baseado no conteúdo: desfazer até o salvo e salvar enquanto há edições novas exigem mais que comparar `editVersion`. Evitar guardar outra string completa para cada entrada de histórico.

Migrar comandos gradualmente para copy-on-write: entidades/ramos não alterados conservam identidade; arrays de alturas/máscaras só são copiados quando editados. Manter 150 entradas, atomicidade e congelamento. Se documentos congelados forem registrados como já validados, a validação de entrada pode ser reutilizada; dados externos e relações alteradas não recebem essa confiança automaticamente.

Usar identidade/revisões dos ramos para pular assinaturas/travessias. Indexar aberturas por parede e junções por vizinhança, invalidando posições antiga/nova e paredes realmente conectadas. Mover prop não achata/remonta composições estáveis; mudança de composição ainda atualiza transforms mundiais e bounds.

**Aceitação:** 150 renomeações na igreja compartilham alturas/máscaras/entidades intactas e não multiplicam o heap pelo tamanho completo da cena. Todas as entradas continuam utilizáveis por undo/redo; mutar um snapshot jamais altera outro. Comandos inválidos não alteram documento/histórico. Trocar uma parede reconstrói apenas dependências geométricas corretas, incluindo vãos e junções T/anguladas. Comparar os documentos resultantes e projeções, não apenas UUIDs.

## Etapa 6 — programas de shader estáveis e frame mais curto

**Arquivos:** `src/render/surface-materials.js`, `src/render/material-wear.js`, `src/render/bound-light.js`, `src/render/lighting-zones.js`, `src/render/light-manager.js`, `src/render/renderer.js`.

Converter valores numéricos hoje embutidos no GLSL em uniforms; depois reduzir a chave a diferenças estruturais: camadas, recursos, atributos e composição do shader. Manter uniforms por material/instância para impedir que editar uma peça altere outra. Aquecer variantes necessárias após carregar assets, em fatias e com `compileAsync` quando aplicável ao renderer instalado, evitando bloquear a primeira interação.

Manter coleções derivadas de fontes/zonas/águas/efeitos; recalcular emissão/configuração e matrizes de zonas somente quando parâmetros/hosts/visibilidade mudarem. Atualizações temporais seguem por frame. Reusar vetores/matrizes temporários nos caminhos medidos; seleção de luzes continua respondendo à câmera, intensidade e retenção, com a mesma política de orçamento.

**Aceitação:** mudar cor/intensidade/opacidade/tamanho de textura/cobertura não cria programa novo quando a estrutura é a mesma. Camadas/recursos novos podem criar variantes. Materiais diferentes preservam valores independentes; pixels de desgaste, cobertura, terreno, GLBs e transparência equivalentes. Cintilação, nuvens e água seguem tempo/velocidade atuais. Zonas móveis e ocultas atualizam corretamente; campos estáticos não são recalculados a cada frame.

## Etapa 7 — carga, neve e acervo

Consolidar callbacks de assets: marcar bounds/seleção/neve pendentes e executar a travessia uma vez por frame/lote. Reusar templates de receitas iguais com referência/clone-on-write para geometria editável; materiais por instância continuam independentes. Workers só para cálculos puros com buffers transferíveis e cancelamento por geração, depois de comparar custo de transferência. Não transferir o DOM/renderer inteiro para worker como pré-requisito.

Na neve, reusar índice de exposição e reconstruir depósitos afetados por mudanças espaciais, inclusive a área sob um oclusor movido/removido. Quedas de neve animadas continuam separadas do depósito persistido. Instanciamento de repetições opacas é investigação condicional; precisa preservar coordenadas procedurais, slots, emissão, seleção individual, sombras e edição. Transparências com ordenação e objetos deformáveis exigem tratamento específico.

Na galeria, persistir resumos/previewRevision sem carregar documentos inteiros. Índice do servidor deve ter atualização atômica, rebuild e detecção de alterações externas; índice Pages deve migrar sem perder dados, backups ou conflitos. Testar 10/50/200 cenas e leitura concorrente antes de priorizar essa mudança.

**Aceitação:** carga não repete travessia global por prop; trocar de cena durante carga não instala recursos antigos. Mover cobertura/teto produz a mesma exposição/neve final que rebuild completo. Cenas e acervo preservam metadados/ordem/capas/revisões. Repetir abrir/fechar 20 vezes e conferir baseline de geometria/textura/contextos e heap após estabilização; um cache limitado pode permanecer, crescimento contínuo não.

## Validação e entrega

Cada etapa começa com seu caso de baseline, aplica a mudança e repete o mesmo caso. Exigir melhora no caminho afetado sem regressão fora da dispersão medida nos demais. Meta orientadora após baseline: reduzir pelo menos 30% do p95 do gargalo escolhido ou eliminar sua operação redundante; não declarar ganho global de 30% nem aprovar só por um frame rápido.

Comparar imagens em fixtures determinísticas, mesma câmera/resolução/qualidade/tempo de animação e recursos aquecidos. Exigir igualdade onde possível; qualquer tolerância para bordas/precisão deve ser definida por teste e inspecionada, sem relaxar globalmente a comparação. Testes funcionais também precisam cobrir identidade de recursos, descarte, foco, teclado/toque, estado salvo/rascunho e privacidade. Usar regressões existentes de câmera/apresentação, iluminação dinâmica, materiais/efeitos, terreno/neve, composições, capas, recovery, Pages e igreja conforme o escopo alterado, além de builds local/Pages quando houver alteração da aplicação.

Registrar por entrega: evidência antes/depois, ambiente, testes executados, limitações e rollback. Atualizar `progress.md`, `PROGRESSO.md` e `docs/PROGRESSO.md`; nunca substituir medição presencial por números de SwiftShader. Próximo incremento recomendado: etapas 0 e 1, seguidas do cache de `dirty` e atualização seletiva da etapa 2.
