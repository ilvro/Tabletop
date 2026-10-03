# Tabletop — roadmap e critérios de entrega

Atualizado em 3 de outubro de 2026 após o primeiro incremento da Fase 3. [ARCHITECTURE.md](ARCHITECTURE.md), [MAP_AUTHORING.md](MAP_AUTHORING.md) e [IMMERSION.md](IMMERSION.md) mantêm o contexto da Fase 2; [VERTICAL_SLICE.md](VERTICAL_SLICE.md) registra a fundação, e [PHASE_3.md](PHASE_3.md) detalha construção, regeneração e polish entregues.

## 1. Como este roadmap revisa a Fase 1

A Fase 1 foi investigação. A Fase 2 consolidou arquitetura com autoria e imersão como requisitos centrais. Após essa entrega documental, o pedido seguinte autorizou o slice funcional descrito abaixo.

O novo MVP traz piso, paredes, porta, luz e Smart Build simples para o primeiro vertical slice. Esses itens estavam em parte previstos para a evolução do editor na Fase 1. A mudança atende ao pedido atual: provar criação rápida de uma cena convincente, além de seleção/persistência de tokens.

MVP, V2 e V3 são marcos de produto, não versões do schema. O schema evolui por migrações explícitas quando necessário. Não são datas prometidas nem autorização automática para começar a implementação ao terminar este documento.

Perfil informado: notebook intermediário com GPU, provável projetor e controle central pelo mestre. Celulares no Wi-Fi local são opcionais; o primeiro piloto não exige que jogadores entrem no Tabletop.

## 2. Fase 2 — arquitetura concluída

| Documento | Resultado consolidado |
| --- | --- |
| [Arquitetura](ARCHITECTURE.md) | Stack, mapa/ambiente/cena, estado e comandos, contratos v1, assets, storage, projetor e fronteiras de integração. |
| [Autoria](MAP_AUTHORING.md) | Quick/Assisted/Expert, grid/snap, estruturas, prefabs, sugestões, procedural, preservação manual e importação. |
| [Imersão](IMMERSION.md) | Estudo público de Ordem, iluminação/materiais/efeitos, ambientes/câmeras, Jukebox, qualidade e benchmark. |
| Este roadmap | MVP, V2, V3, futuro, critérios, riscos e decisões pendentes. |

As pesquisas arquiteturais foram divididas em três agentes independentes, somente para autoria, renderização/imersão e Smart Build. Naquela etapa não houve implementação. A síntese é uma arquitetura única, com referências primárias nos documentos especializados.

Decisões fechadas para orientar implementação: um modelo comum para autoria manual/assistida; resultados materializados editáveis; cópia de mapa e look na cena; ambiente aplicado sem geração ao carregar; Y para cima/metragem; storage local com revisão; áudio externo ao undo; mestre e apresentação com câmeras distintas.

Decisões ainda dependentes de protótipo/medição estão na seção 8. A arquitetura pode ser revisada com evidência real sem recomeçar a investigação.

## 3. MVP — pequeno vertical slice presencial

Pergunta de produto: **consigo criar uma cena 3D convincente e utilizável em uma sessão em poucos minutos, preservando controle manual?**

**Situação atual:** fundamento do slice implementado e validado tecnicamente. Há criação do vazio, sala com vão/porta, edição manual, tokens, catálogo local (agora com 61 assets originais), importação de imagem/GLB estático, luzes/ambientes simples, câmeras, prévia/aceite de Quick Build, undo/redo, servidor com revisões/backups e recuperação por aba. Master View e apresentação funcionam na mesma janela e em segunda janela com câmera publicada independente.

A evolução posterior já acrescentou gestão de cenas/mapas/tokens, conversão entre mapa e cena, pastas, renomeação e clipboard. Mapas podem ser editados e instanciados em cenas com `sourceMap`. A biblioteca de EnvironmentDocument e o transporte por manifesto/pacote de documento+assets continuam pendentes; preservar o diretório de dados completo é o caminho atual de backup.

O navegador foi validado com Chromium headless/WebGL por software; os dados foram comparados após fechar navegador e reiniciar servidor. Conflito entre abas e recuperação têm testes próprios. Isso não conclui a avaliação visual do mestre, o exercício cronometrado, o uso do projetor real ou o benchmark no notebook com música. Não há integração com Jukebox/Ficha ou acesso de celulares nesta entrega.

### 3.1. Escopo mínimo

| Pilar | Entrega do slice |
| --- | --- |
| Espaço | Começar vazio; sala retangular de um andar, piso com dimensões/material e paredes retas. |
| Porta | Uma abertura real e porta hospedada com dobradiça/estado; edição de posição/dimensões válida. |
| Precisão | Grid configurável, snap pela base/pivot, coordenadas negativas e footprints de uma ou mais células. |
| Edição manual | Selecionar, mover, girar, escalar props, altura, campos numéricos, material simples, duplicar/remover. Estruturas editam parâmetros próprios. |
| Tokens | Atores locais, discos/recortes com nome/cor ou imagem real importada, transform e footprint distintos. |
| Assets | Pequeno catálogo interno curado; imagens e um fluxo reduzido de GLB estático, com preview e normalização básica. |
| Smart Build | Desenhar retângulo → oferecer “Criar sala”, com piso/paredes/porta e iluminação simples; preview/aceite/cancelamento. |
| Imersão | Materiais coerentes, preenchimento/luz editáveis, sombra principal opcional e composição legível. |
| Câmera | Perspectiva, vista superior, orbit/pan/zoom, enquadrar seleção e pelo menos um preset salvo. |
| Apresentação | Build/Session Mode e janela local sem ferramentas para projetor, com câmera publicada independente. |
| Histórico | Undo/redo de comandos e transações completas; um gesto/aceite por entrada. |
| Dados | Cenas/mapas: criar/listar/salvar/carregar/duplicar/excluir, conversão e reutilização de mapas, assets separados e rascunho. |
| Transporte — próxima entrega | Exportar/importar documento com manifesto e assets por pacote de arquivos/pasta; ZIP só se implementado. |

O catálogo não precisa ser grande, mas deve permitir uma sala utilizável. Preferir kit coeso com props reconhecíveis, preparado internamente ou com recursos que possam ser distribuídos, sem exigir download durante a sessão. Biblioteca/demo não substitui criação do vazio.

Imagens de personagens e GLB importados são assets locais do slice, sem fingir sincronização com a ficha. O Jukebox pode continuar aberto e operado diretamente pelo mestre; não oferecer controles remotos simulados. O benchmark deve usar áudio real mesmo antes da ponte.

Não incluir no slice: biblioteca completa de ambientes/prefabs, múltiplos andares editáveis, fog of war, rede multiusuário, editor de partículas, volumetria, IA ou extração profunda do player. Esses sistemas têm caminhos definidos, sem precisar existir para a sala inicial funcionar.

### 3.2. Sequência de implementação proposta

1. **Documento e comandos:** modelo mínimo, validação, coordenadas/snap e transações; criação manual da sala como dados.
2. **Viewport e autoria:** câmera, picking, piso/paredes/porta, props/tokens e inspector. Mostrar erro útil se WebGL 2 não estiver disponível.
3. **Assistência:** gerador interno de sala/iluminação, preview e comando composto, com edição manual dos resultados.
4. **Imersão/apresentação:** materiais, luzes, enquadramento salvo, Session Mode e janela do projetor.
5. **Persistência completa:** servidor local, revisões, gravação atômica, rascunho, assets e transporte. Validar save/load desde os primeiros documentos; concluir aqui o fluxo de reinício.
6. **Piloto:** roteiro do vazio ao projetor e benchmark com Jukebox ativo; ajustar problemas de interação/performance demonstrados.

O slice implementou os passos 1–4 e persistência/recuperação do passo 5. Transporte, piloto cronometrado e benchmark são pendências explícitas. Não criar antecipadamente módulos sem comportamento nem toda a infraestrutura de V2/V3.

### 3.3. Critérios de aceitação

- Construir do vazio uma pequena sala com piso, paredes e passagem real; adicionar props/tokens e iluminação.
- Aceitar assistência e editar individualmente porta, parede, prop, material ou luz. Nada fica bloqueado pelo gerador.
- Fazer uma preparação cronometrada com o usuário usando dez minutos como exercício, registrando esforço/correções. O resultado informa o design; não é promessa de tempo sem teste.
- Usar uma sessão de autoria cuidadosa para comprovar valores precisos, snap desligado, altura e substituição livre.
- Desfazer/refazer sala e operações dependentes sem órfãos ou sorteio de nova composição.
- Verificar snap negativo, footprints 1×1/2×2 e origem deslocada; campos numéricos e mouse seguem a mesma política.
- Salvar, encerrar navegador/servidor, reabrir e continuar com IDs, parâmetros, materiais, portas, câmeras e assets equivalentes.
- Exportar/importar em diretório de dados separado e verificar que assets não dependem de URLs temporárias.
- Falhar uma escrita e recuperar rascunho sem toast falso de sucesso; detectar conflito entre duas abas sem sobrescrever.
- Apresentar no projetor sem ferramentas/notas, com tokens e sala legíveis à distância; editar câmera no notebook sem mudar a publicada involuntariamente.
- Executar o roteiro representativo com Jukebox tocando, editor/projetor ativos e qualidade escolhida por medição.

## 4. V2 — autoria assistida e apresentação reutilizável

Objetivo: reduzir trabalho repetitivo e ampliar controle do cenário, mantendo o modelo de comandos e a liberdade do slice.

**Fase 3, primeiro incremento entregue:** pisos poligonais/plataformas, janelas posicionadas por clique/arraste com vãos físicos sincronizados, escadas/rampas paramétricas com apoio de tokens, apoio explícito em pisos/móveis, visibilidade/bloqueio herdados de pastas; receitas de escritório/reunião/depósito, luzes distribuídas e regeneração com overrides/exclusões; seleção múltipla, alinhamento, distribuição e variação de rotação com prévia. Schema 2 com migração de v1 em memória e gravação explícita. Detalhes e roteiro: [PHASE_3.md](PHASE_3.md). Isso não conclui todo o marco V2: junções, andares completos, biblioteca de prefabs/ambientes, evolução visual e integrações continuam pendentes.

| Área | Evolução |
| --- | --- |
| Estruturas | Pisos poligonais/plataformas, janelas, paredes compartilhadas/encontros, grupos/layers/andares e apoio explícito. |
| Assets | Entregues: 61 modelos, categorias hierárquicas, tags editáveis, busca, épocas/cenários e favoritos ([ASSET_LIBRARY.md](ASSET_LIBRARY.md)). Pendentes: coleções formais, variantes de textura, sockets específicos e glTF com dependências. |
| Prefabs | Composições pequenas, templates e receitas locais; proveniência, slots e regeneração por diff preservando alterações. |
| Smart Build | Cama/acessórios, mesa/cadeiras, luminárias distribuídas, auto-decoration e auto-layout em escopo selecionado. |
| Polish | Alinhamento/distribuição, variantes de material e revisão de passagens/decoração com preview. |
| Ambientes | Biblioteca de EnvironmentDocument, bindings por papel e snapshots editáveis por cena. |
| Visual | Spot, temperatura, flicker, fog de distância, emissores leves e bloom opcional se justificado pelo benchmark. |
| Câmera | Mais presets, foco em token/área, transições interrompíveis e corte imediato. |

Integrações são entregas independentes dentro desse marco, após seus pré-requisitos:

1. **Ficha:** escolher coleção autoritativa, separar domínio/repositório, migrar IDs e impedir escritor legado paralelo; leitura por ID/revisão e ajustes explícitos de recursos confirmados.
2. **Jukebox:** identidades persistentes e migração das cenas sonoras; fachada no runtime existente, handshake e comandos com retorno real; cue da cena visual.

Não vincular a conclusão de todas as ferramentas do editor à integração musical. As fronteiras permitem entregar uma integração útil quando estiver pronta. Modificar Jukebox/ficha será trabalho explícito da etapa de integração, não consequência oculta desta documentação.

Critérios de V2:

- Criar uma sala com estruturas adicionais e selecionar apoios/andares sem movimentação inesperada.
- Reutilizar o mesmo mapa em atmosferas diferentes e conservar a cena salva após editar preset/biblioteca.
- Regenerar uma composição preservando posição manual, item excluído e material substituído; diff mostra conflitos.
- Classificar um asset importado e usá-lo numa sugestão compatível.
- Ajustar luz/fog/efeito/câmera manualmente depois de aplicar preset.
- Confirmar recurso da ficha nos clientes conectados à mesma autoridade, com conflito visível e sem POST do array inteiro pelo Tabletop.
- Ativar cue no Jukebox real e demonstrar biblioteca ausente, áudio bloqueado, faixa ausente, desconexão e timeout sem sucesso fictício.
- Medir Jukebox em segundo plano/minimizado para preservar fades/loops/transições durante apresentação.

## 5. V3 — composição maior e LAN opcional

Objetivo: atender cenas mais amplas e, quando necessário, permitir participação de jogadores no Wi-Fi local.

Autoria: prefabs paramétricos de quarto/escritório/hospital, composição entre áreas, variações coerentes, vegetação/scattering com caminhos excluídos e ferramentas de polish mais amplas. Não esticar móveis para fazê-los caber; escolher alternativas ou reportar omissões.

Apresentação/performance: pré-carregamento de cenas, LOD/instancing/streaming por regiões conforme benchmark, variantes comprimidas e efeitos adicionais com custo demonstrado. Não tornar pós-processamento pesado requisito para os celulares.

LAN é opcional e pode ser adiada se o mestre continuar controlando tudo no projetor. Quando implementada:

- servidor de sessão autoritativo com pareamento/papéis;
- HTTP para documentos/assets permitidos, WebSocket para comandos/eventos;
- projeção filtrada antes do envio, inclusive referências/arquivos secretos;
- permissões de movimento por token/participante;
- snapshot/reconexão, sequência, commandId e deduplicação;
- câmera e qualidade próprias por cliente;
- vista tática leve para celulares, com opção de 3D conforme capacidade medida.

O celular não precisa oferecer todo o editor. A função mestre continua com acesso completo; reduzir interface de jogador é política de sessão, distinta da liberdade de autoria.

Critérios: reconectar no Wi-Fi sem duplicar comandos; rejeitar edição não autorizada; não transferir segredos; carregar uma cena representativa em dispositivos reais; conservar áudio/apresentação no notebook durante movimentos remotos. Dados de PV permanecem no serviço da ficha, com política de concorrência própria.

## 6. Futuro — condicionado a uso e medição

| Possibilidade | Condição para investir |
| --- | --- |
| IA para intenção, tags e recomendações | Regras/metadados já úteis; ganho demonstrado; mesma proposta validada/editável e operação offline preservada. |
| Layout aprendido de exemplos | Catálogo e exemplos suficientes, curadoria e benefício sobre heurísticas simples. |
| Volumetria, reflexos e efeitos avançados | Ganho perceptível no projetor que compense custo e manutenção. |
| Fog of war/visão por personagem | Necessidade real e modelo de visibilidade próprio, sem confundir escuridão com autorização. |
| Importadores de outros VTTs | Formatos conhecidos e primeiros arquivos reais; preservar semântica quando possível. |
| Extração maior do player sem DOM | Benefício comprovado sobre ponte existente, com testes de regressão musical. |
| SQLite, TypeScript ou engine alternativa | Limitação concreta de storage, contratos ou rendering; migração fundamentada. |
| Histórico persistente mais amplo | Demanda de recuperação/auditoria além do documento final e backups. |

Não há data ou compromisso de implementar todos esses recursos. O produto deve continuar utilizável em cada marco.

## 7. Estratégia de verificação

Testes implementados e futuros devem proteger comportamento e perda de trabalho, sem espelhar detalhes do renderer:

| Camada | Verificações necessárias |
| --- | --- |
| Domínio | Snap/origem/footprint, estruturas/aberturas, referências, comandos compostos e undo/redo. |
| Persistência | Equivalência save/load, revisão/conflito, escrita falha, rascunho, duplicação e exportação com assets. |
| Browser | Do vazio à apresentação, seleção/gestos, GLB/imagem persistentes, recuperação e controle de câmera. |
| Assistência V2 | Proposta obsoleta, busca limitada, resultado parcial explícito, overrides/supressões e IDs estáveis. |
| Integrações | Concorrência/repetição de recursos, identidade, áudio real, falhas/desconexão e ausência de efeitos externos no undo. |
| Performance | Roteiro/snapshots reproduzíveis, notebook/projetor, mix real do Jukebox e dispositivos móveis quando usados. |

Domínio, projeção, geometria e servidor contam com 49 testes. Os três roteiros de navegador verificam autoria, assets, apresentação, revisão/recuperação e a Fase 3: regeneração preservada, janela, piso elevado, apoios, seleção múltipla/polish e fidelidade após reiniciar. Build de produção foi executado. Escolher metas de frame/resposta/memória somente após baseline; ver [benchmark](IMMERSION.md). Teste com áudio, projetor e notebook reais continua pendente.

## 8. Riscos e decisões pendentes

| Tema | Decisão proposta ou pergunta a validar | Próxima evidência |
| --- | --- | --- |
| Notebook e navegador | Perfil intermediário com GPU; modelo, WebGL 2 e navegador ainda desconhecidos. | Baseline na máquina real. |
| Projetor | Janela estendida/local, com ajuste visual próprio. | Resolução, distância, iluminação e contraste reais. |
| Celulares | Entrada LAN opcional, sem requisito para MVP. | Necessidade durante sessões e dispositivos usados. |
| Primeiro kit | Poucos props coesos e editáveis, imagens e GLB simples. | Assets reais, licença/proveniência e custos. |
| Estilo visual | Composição/atmosfera inspiradas nas referências, sem promessa de mesma fidelidade. | Sala apresentada e avaliada pelo mestre. |
| Tempo de preparação | Quick Build mais correção manual precisa caber na rotina. | Piloto cronometrado e número de ajustes. |
| Metragem/snap | Medidas internas, metros e base/footprint explícitos. | Teste com regras/escala usadas na mesa. |
| Corner joins e aberturas | Solução retangular no MVP; demais encontros na V2. | Duas salas reais e casos de resize/portas. |
| Edições manuais | Cópia independente primeiro; regeneração com diff/proteções depois. | Alterar/excluir resultado e trocar receita. |
| Sombras/interiores | Sombras seletivas, vazamentos avaliados visualmente. | Enquadramentos noturnos e portas abertas. |
| Música em segundo plano | Preservar Jukebox; não assumir scheduler sem efeito de ocultação. | Fades/loops com editor/projetor em foco. |
| Autoridade da ficha | Migração explícita de uma coleção antes de escrita integrada. | Escolha da origem e teste simultâneo de recursos. |
| Tamanho típico de mapa | Nenhum limite arbitrário. | Sala, corredor/andares e externo representativos. |
| Escopo crescer demais | Slice completo pequeno antes de biblioteca procedural ampla. | Critérios de MVP cumpridos e avaliados. |

As pendências devem ser resolvidas pelo piloto do slice e por dados reais na fase correspondente. A implementação confirmou estruturas paramétricas, propostas materializadas e câmera publicada independente; ainda não fornece evidência para sistemas visuais avançados ou LAN.

## 9. Matriz de cobertura do pedido

| Requisito | Onde foi tratado |
| --- | --- |
| Filosofia, Quick/Assisted/Expert e liberdade manual | MAP_AUTHORING, seções 1–5. |
| Grid, snapping, paredes, pisos, portas, janelas, alturas e andares | MAP_AUTHORING, seções 6–8. |
| Props, prefabs, templates e receitas paramétricas | MAP_AUTHORING, seções 9–10. |
| Sugestões, procedural, auto-layout/decoration/lighting e polish | MAP_AUTHORING, seções 11–14; IMMERSION, seção 4. |
| Biblioteca/importação e uso de assets externos nas regras | ARCHITECTURE, seção 8; MAP_AUTHORING, seção 15. |
| Undo/redo, persistência, duplicação e recuperação | ARCHITECTURE, seções 7–9; MAP_AUTHORING, seção 16. |
| Fontes públicas de Ordem e separação de fatos/interpretações/hipóteses | IMMERSION, seção 2. |
| Luz/sombra/material/atmosfera/fog/partículas/efeitos | IMMERSION, seções 4–9. |
| Mapa/ambiente/cena, câmeras/presets e Build/Session Mode | ARCHITECTURE, seção 6; IMMERSION, seções 7 e 10–11. |
| Jukebox como autoridade e ficha como fonte de recursos | ARCHITECTURE, seções 3 e 11; IMMERSION, seção 12. |
| Performance com notebook/projetor/áudio e benchmark sem metas inventadas | IMMERSION, seções 13–14. |
| MVP, V2, V3, futuro, riscos e validações | Este documento, seções 3–8. |

Próximo incremento estrutural: junções/paredes compartilhadas, níveis e acessos. Catálogo ampliado para 61 assets, com classificação e filtros persistentes; avaliar com o mestre no projetor antes de ampliar receitas e composição procedural. Transporte e biblioteca de ambientes continuam pendentes. [PHASE_3.md](PHASE_3.md) distingue esta entrega dos recursos futuros.
