# Tabletop — análise de pendências e melhorias

Análise em 5 de outubro de 2026. Escopo: código atual, arquitetura, roadmap, guias, persistência, renderização, testes e prévia distribuída da montanha. As capas automáticas acrescentadas ao workspace durante a revisão foram consideradas como recurso existente. Esta análise não implementa as sugestões.

O projeto tem uma base funcional ampla: autoria manual/assistida, estruturas, terreno/rochas esculpíveis, água/gelo/neve, materiais, ambientes, 202 assets, tokens, histórico, persistência em servidor e IndexedDB, recuperação e apresentação com câmera independente. O próximo investimento deve consolidar confiabilidade, fluidez e acabamento visual, com tarefas mensuráveis.

**Achados que merecem correção**

| Prioridade | Achado e evidência | Ação recomendada |
| --- | --- | --- |
| Alta | `importJson`, em [application.js](../src/app/application.js), ignora qualquer falha de `repository.create` e considera o documento salvo quando o JSON tem `revision > 0`. Uma revisão do arquivo não é confirmação do repositório de destino. | Marcar como salvo somente após confirmação efetiva. Distinguir conflito, indisponibilidade e assets ausentes. Oferecer importar como cópia ou carregar como rascunho; restauração com mesma identidade deve conferir a revisão do destino. |
| Alta | [renderer.js](../src/render/renderer.js), `setDocument`, limpa grupos, objetos e registros e recria o conteúdo completo. `updateView` chama esse caminho para comandos e também para eventos de salvamento. | Primeiro evitar reconstrução quando muda apenas o estado de salvamento. Depois atualizar entidades afetadas, incluindo dependentes estruturais, materiais, neve e luzes, preservando descarte e câmera publicada. Medir antes/depois. |
| Média | [scene-store.js](../src/state/scene-store.js) mantém até 150 entradas com snapshots; [commands.js](../src/state/commands.js) clona o documento inteiro. A detecção de alterações serializa o conteúdo. | Medir latência e memória em terrenos pintados/esculpidos e mapas densos. Se necessário, adotar compartilhamento de estruturas ou histórico por alterações com checkpoints. Preservar atomicidade e um gesto por undo. |
| Média | Backups de cinco revisões existem no servidor e no navegador, mas não há fluxo dedicado de listar, comparar e restaurar revisões na interface/API pública atual. | Exibir versões anteriores e restaurar como nova revisão ou cópia, mantendo conflito explícito e confirmação de gravação. |
| Média | [floating-window.js](../src/ui/floating-window.js) fornece movimentação por ponteiro e teclado; `application.js` também mantém um bloco legado de arraste por mouse para Abrir. | Consolidar a movimentação no componente compartilhado. A redundância está presente no código; conflito visual entre os handlers não foi reproduzido nesta análise. |
| Média | README informa 191 assets e `data/` ignorado pelo Git; o catálogo tem 202 e existem cena/backups em `git ls-files data`. ROADMAP ainda chama EnvironmentDocument de pendente em um trecho e de entregue em outro. | Corrigir o estado vigente e distinguir histórico de pendência. Definir explicitamente a política para exemplos versionados e dados locais; não excluir arquivos existentes como consequência desta análise. |

**Reprodução confirmada da importação**

1. Criar e salvar uma cena chamada “Original no disco”, revisão 1.
2. Importar um JSON com o mesmo ID/revisão e nome diferente.
3. A criação é recusada porque o ID já existe, mas a interface carrega o JSON e mostra “Salvo · revisão 1”.
4. Consultar o repositório: o documento continua com o nome/conteúdo anterior.
5. Consultar o IndexedDB de recuperação após o debounce: não há rascunho desse trabalho.

O caso foi reproduzido com servidor em diretório temporário e Chromium headless. Há risco de perder o conteúdo importado ao sair/reabrir porque o estado salvo e a recuperação ficam incorretos. A revisão maior que zero também pode produzir indicação incorreta após outras falhas de criação; esses outros cenários foram identificados por leitura do código, não repetidos no navegador.

**Pendências reais de produto**

| Área | Trabalho remanescente | Critério útil de conclusão |
| --- | --- | --- |
| Visual da montanha | Aceitação visual; materiais detalhados/fotográficos, desgaste e decals; depósitos locais de neve nas rochas; contato e variedade da vegetação. | Comparar câmera próxima, principal e ampla no renderer real, com névoa ligada/desligada e iluminação constante. |
| Desempenho | Benchmark de autoria e apresentação no notebook/projetor, com áudio real; otimizações de cenas densas conforme o resultado. | Registrar tempo de frame, latência de edição, carregamento e memória, com editor e projetor juntos. Contagem de triângulos não mede FPS. |
| Portabilidade | Pacote único de cena/mapa e assets importados, atualmente opcional no escopo. | Abrir em outro diretório/perfil sem depender de URLs Blob ou biblioteca pessoal da origem. Manifesto com versões, referências e deduplicação. |
| Reutilização | Prefabs/receitas do usuário, coleções e variantes nomeadas, sockets específicos e auto-layout entre cômodos. | Reutilizar uma composição mantendo parâmetros, IDs remapeados, alterações manuais e preview/undo. |
| Paisagem | Pincel regional de distribuição/entulho, neve nos apoios anotados de props/pisos/gelo e reflexos/refração de objetos na água. | Conferir apoios após salvar/reabrir e qualidade visual/custo em recortes representativos. |
| Personagens | Fluxo dedicado de miniaturas 3D vinculadas aos tokens. Rig, poses e animação são evolução posterior. | Alterar aparência sem quebrar identidade do ator, footprint, apoio ou projeção pública. |
| Apresentação | Seguir tokens, caminhos/colisão de câmera e avaliação de legibilidade no projetor. | Navegação/transição fluida com publicação explícita e câmera de trabalho independente. |
| Futuro | LAN; múltiplas regiões/colisão de partículas; volumetria com sombras. Ficha/Jukebox continuam adiados. | Investir após comprovar demanda e custo; não são requisitos para consolidar a sessão local. |

Terreno, água/gelo, neve com espessura e tempestade, escultura de rochas, biblioteca de ambientes, filtros/favoritos e capas automáticas já existem. Não devem voltar ao backlog como recursos inteiramente ausentes. Heightmap continua tendo uma altura por X/Z: cavernas/saliências são composições de malhas, não terreno volumétrico.

**Melhorias de qualidade de vida sugeridas**

| Sugestão | Benefício e escopo |
| --- | --- |
| Paleta de comandos e busca de objetos | Acessar ferramentas e localizar uma entidade por nome/tipo sem navegar por todos os painéis. Complementar com ajuda de atalhos e filtros na árvore. |
| Assets recentes e colocação repetida | Manter um asset selecionado para distribuir várias cópias; sair com Esc. Complementa favoritos/filtros que já existem. |
| Conta-gotas e copiar/colar materiais | Reutilizar material completo, inclusive textura, cobertura e parâmetros; escolher alcance por slot/objeto/camada e permitir undo. |
| Presets de pincel e parâmetros | Salvar configurações pessoais de neve, rocha, escultura e distribuição para reduzir repetição numérica. |
| Medidas e duplicação em série | Régua entre pontos e duplicações com espaçamento/rotação relativos, sem substituir as ferramentas existentes de alinhamento/distribuição. |
| Histórico de versões e backup acessível | Restaurar pelo editor e exportar pacote completo. No navegador, mostrar uso de armazenamento e distinguir rascunho de salvamento confirmado. |
| Confirmações proporcionais | Exclusão simples reversível com ação Desfazer; confirmar dependências e operações de documento. Troca de cena pode oferecer Salvar, Descartar ou Cancelar. |
| Monitor da apresentação | Pequena prévia da câmera efetivamente publicada e indicação de conexão do projetor; trocar enquadramento explicitamente. Capas da biblioteca não substituem essa visão da sessão. |
| Qualidade por janela | Perfis simples para resolução, sombras, partículas e neve, além do liga/desliga de efeitos existente. Ajustes locais não devem reescrever a aparência salva da cena. |
| Painel curto de sessão | Acesso a tokens, portas e enquadramentos com controles legíveis no uso presencial. Medir tarefas reais antes de acrescentar automações de regras. |

**Acabamento visual**

A prévia distribuída em `public/scenes/snowy-mountain-pass.jpg` mostra uma composição legível de trilha, caverna, ruínas e luzes quentes. Como avaliação visual, a copa ainda apresenta níveis horizontais regulares, madeira/objetos têm superfícies muito uniformes, e a névoa reduz bastante a leitura das ruínas distantes. Essa observação é de uma imagem do renderer; não mede a navegação, outras câmeras ou desempenho presencial.

Recomenda-se trabalhar em três recortes: rocha/neve/lanterna; árvore/galhos; caixa/barril/chão. Melhorar primeiro silhueta, detalhe do material, variação localizada e contato. Depois avaliar sombras de contato/oclusão ambiente/reflexos, com orçamento medido. Aumentar apenas quantidade de assets ou partículas não resolve esses pontos.

**Manutenção e verificação**

`application.js` concentra mais de duas mil linhas de UI, ações, biblioteca, importação, persistência e apresentação. Extrair responsabilidades gradualmente aproveitando `src/ui`, repositórios e store existentes: gestão de documentos, seleção/clipboard, ferramentas e sessão/apresentação. A separação domínio/estado/renderização já oferece uma base útil; uma troca de engine ou migração completa para TypeScript não é pré-requisito identificado nesta revisão.

O workflow de Pages executa testes e build em push/publicação. Acrescentar CI de pull request com build local/Pages e uma seleção pequena de E2E para salvar/reabrir, importar com conflito, recuperação, publicação de câmera e armazenamento estático. A suíte visual completa pode ter execução separada, pois WebGL por software tem custo alto. O aviso de bundle acima de 500 kB foi observado nos dois builds; avaliar carregamento inicial e módulos carregados sob demanda antes de alterar a stack.

**Ordem recomendada**

1. Corrigir importação/estado salvo e proteger recuperação; atualizar documentação de estado vigente.
2. Evitar reconstrução por eventos de salvamento; medir uma cena pequena e a montanha com editor/projetor ativos.
3. Entregar backup/restauração acessíveis e transporte completo se houver troca de máquina/perfil.
4. Melhorar reutilização de materiais, colocação repetida e busca; validar uma preparação real cronometrada.
5. Refinar os três recortes visuais e o mapa principal; otimizar geometria/vegetação conforme medição.
6. Expandir prefabs, miniaturas e recursos de sessão conforme uso. LAN, integrações e efeitos mais caros ficam posteriores.

**Validação desta análise**

- `npm test`: 169 testes de domínio/integração aprovados. A primeira tentativa falhou pela restrição de abrir portas locais; a execução autorizada passou.
- `npm run build` e `npm run build:pages`: aprovados, incluindo os arquivos novos de capas automáticas presentes no workspace.
- Reprodução específica de importação no Chromium: confirmou falso estado salvo, conteúdo anterior no servidor e ausência de rascunho.
- Inspeção da prévia real distribuída da montanha e conferência de catálogo/documentação.
- A suíte E2E completa, benchmark presencial e aceitação visual do usuário não foram executados nesta análise.

Referências de pendências: [progress.md](../progress.md), [relatório](PROGRESSO.md), [plano de inverno](ORGANIC_WINTER_PLAN.md) e [objetivo visual](VISUAL_TARGET.md).
