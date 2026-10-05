# Tabletop — Relatório de Progresso e Planejamento

**Data:** 4 de outubro de 2026

**Status do Projeto:** Vertical Slice validado; evolução estrutural, polish câmera cinematográfica e iluminação/imersão avançada, ambientes/horários/clima, materiais texturizados e efeitos locais entregues
**Documentos de Referência:** [`ROADMAP.md`](ROADMAP.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`MAP_AUTHORING.md`](MAP_AUTHORING.md), [`IMMERSION.md`](IMMERSION.md), [`VERTICAL_SLICE.md`](VERTICAL_SLICE.md) e [`INVESTIGACAO_E_ARQUITETURA.md`](../INVESTIGACAO_E_ARQUITETURA.md).

---

**Câmera cinematográfica:** WASD com aceleração/desaceleração, Shift rápido, Page Up/Down e Espaço/Ctrl para altura na perspectiva, velocidade e lente; órbita suave, transições de presets/publicação com duração, pausa e corte. Zoom, pan e órbita preservam o movimento por teclado, e o botão direito seleciona somente ao soltar sem arrastar. Ctrl+WASD tem prioridade sobre atalhos de edição na perspectiva com foco no canvas; atalhos reservados do Chrome exigem Tela cheia pelo botão e permissão de captura WASD. Menu nativo cancelado na área 3D, incluindo overlays. Projetor mantém câmera independente e edições de conteúdo não reiniciam transições. A apresentação na mesma janela aceita navegação e restaura a câmera de trabalho ao voltar à edição. G/R/V substituem W/R/S para transformar objetos. Acompanhamento automático/caminhos e benchmark no projetor permanecem pendentes. Uso: [CAMERA.md](CAMERA.md). Andamento contínuo: [progress.md](../progress.md).

**Biblioteca expandida:** 161 assets originais locais (155 além do kit inicial, incluindo 66 na segunda e 34 na terceira ampliação), para investigação/horror paranormal em diferentes épocas e cenários. Categorias hierárquicas, busca sem acentos, filtros combinados por época/cenário/tags, favoritos e classificação editável de assets internos/importados, salva no servidor sem alterar referências de cenas. Uso e limites em [ASSET_LIBRARY.md](ASSET_LIBRARY.md).

**Composições ancoradas:** Shift+seleção → botão direito → Ancorar objetos juntos cria uma pasta que se seleciona, move, gira, redimensiona, duplica e copia/cola como uma unidade. Desancorar pela pasta conserva as poses e volta à seleção individual. Fixar em parede/teto permanece como comando separado. [TESTAR_CONSTRUCAO.md](TESTAR_CONSTRUCAO.md) inclui o exemplo mesa + lamparina.

**Usabilidade da construção:** controles agrupados por tarefa, blocos recolhíveis em ordem alfabética, pincéis no topo do inspetor, ajustes com opções e instruções por operação e fixação em grupo pelo menu de contexto, preservando Shift+seleção. [TESTAR_CONSTRUCAO.md](TESTAR_CONSTRUCAO.md) traz passos e resultados esperados para cada teste.

**Refinamento do terreno:** atalho T, tamanho com [ / ], pincéis circular/quadrado, dureza e encaixe na malha, acabamento suave/facetado, edição de resolução com reamostragem e até oito camadas de cor pintáveis (pintar/apagar, recolorir, opacidade, visibilidade e ordem). Máscaras e alturas persistem e participam do histórico.

**Atualização estrutural de V2:** terreno esculpido, pisos com furos, paredes de contorno compartilhadas, junções anguladas/T, andares/camadas, acessos associados e sockets de parede/teto estão implementados. Polish inclui materiais, orientação, passagem, decoração de canto e luzes. [STRUCTURAL_EVOLUTION.md](STRUCTURAL_EVOLUTION.md) documenta controles e limites.

**Atualização da Fase 3:** construção com pisos poligonais/elevados, janelas posicionadas por clique e arraste com recorte sincronizado, escadas/rampas paramétricas, apoios explícitos em móveis, ocultação/bloqueio herdados de pastas, receitas de escritório/reunião/depósito, regeneração que preserva ajustes/exclusões e seleção múltipla com polish já estão implementados. [PHASE_3.md](PHASE_3.md) documenta uso, schema 2, validação e limites. O restante de V2 continua pendente; LAN e integrações não foram antecipadas.

## 1. Resumo Executivo

O projeto **Tabletop** alcançou com êxito a entrega e estabilização do seu **primeiro Vertical Slice funcional (MVP)**. 

O sistema já é capaz de criar salas 3D a partir do vazio no computador do mestre, aplicar assistência paramétrica (*Quick Build*) com prévia e aceite em transação única, editar manualmente todos os elementos com precisão métrica e *snap*, gerenciar tokens com retratos ou cores, dispor de iluminação ambiente/direcional/pontual/spot com sombras, temperatura Kelvin, cintilação, névoa por distância/altura e bloom opcional e corte de paredes (*cutaway*), além de projetar a visão dos jogadores em segunda tela limpa com câmera independente via `BroadcastChannel`. Toda a persistência conta com histórico completo (*undo/redo*), versionamento com detecção de conflitos (HTTP 409), gravação atômica com rotação de backups e recuperação de falhas via IndexedDB.

Este relatório compara o estado atual do código-fonte em relação aos objetivos traçados nos documentos arquiteturais para mapear com clareza **o que já está pronto** e **o que permanece pendente** para os marcos seguintes (fechamento de MVP, V2, V3 e além).

---

## 2. O que está IMPLEMENTADO

### 2.1. Domínio, Geometria e Contratos (`src/domain/`)
- **Contrato de Documentos v2 (`documents.js`):** Cenas/mapas, estruturas, atores/tokens, luzes, câmeras e composições com slots persistentes. Migração explícita de v1 em memória, preservando IDs/revisões; salvar grava v2 com backup do original.
- **Coordenadas e Snapping Métrico (`coords.js`):**
  - Espaço 3D em metros com eixo Y para cima e pivot na base dos objetos.
  - Grade customizável em tamanho e visibilidade, com suporte a coordenadas negativas e origem deslocada.
  - Snap sensível ao *footprint* dos tokens (1×1 m, 2×2 m, etc.). Tecla `Alt` permite movimentação livre em tempo real sem alterar a grade.
  - Funções de conversão matemática entre ângulos de Euler (Yaw) e quatérnions.
- **Validação Estrutural e Tipagem (`validation.js`):** Validação profunda que rejeita dados com valores não finitos (`NaN`/`Infinity`), referências órfãs, extensões não permitidas ou mídias *inline* em base64.
- **Presets de Ambiente (`environments.js`):** Oito presets: dia, tarde, noite, neblina, chuva, pântano, calor e neutro, com sol/lua, Kelvin/HSV, exposição, preenchimento, céu/nuvens e clima. Biblioteca de ambientes personalizados com snapshots independentes e prévia/diff. Fog linear/exponencial, névoa homogênea por altura e bloom têm controles próprios; ver [ENVIRONMENTS.md](ENVIRONMENTS.md) e [LIGHTING.md](LIGHTING.md).

### 2.2. Estado, Comandos e Histórico (`src/state/`)
- **Arquitetura de Comandos Puros (`commands.js`):** Todas as mutações no documento acontecem via comandos registrados (`entity.add`, `entity.update`, `entity.remove`, `entity.duplicate`, `group.add`, `group.update`, `group.remove`, `token.add`, `token.update`, `token.remove`, `token.duplicate`, `light.add`, `light.update`, `light.remove`, `environment.apply`, `camera.save`, `camera.remove`, `door.setAngle`, `proposal.accept`, `grid.update`).
- **Undo/Redo Transacional (`scene-store.js`):**
  - Histórico determinístico de desfazer/refazer.
  - Suporte a comandos compostos: operações assistidas (como aceitar uma sala inteira) entram no histórico como um único passo atômico, desfeito de uma só vez.
  - Controle de revisão numérica local e sinalização de modificações (*dirty state*).

### 2.3. Autoria e Assistência — Smart Build (`src/authoring/`)
- **Construção estrutural:** pisos poligonais côncavos e plataformas elevadas; desenho repetível na altura de construção, independente do apoio ativo; janelas posicionadas por clique, arraste no plano da parede e edição numérica, com vão físico sincronizado; escadas/rampas paramétricas com dimensões, desnível, rotação, material e apoio de tokens.
- **Fase 3 (`furnishing.js`, `polish.js`):** Templates de escritório, reunião e depósito, distribuição limitada de móveis/luzes, prévia de alterações/remoções e avisos de resultado parcial. Regeneração preserva campos manuais, itens bloqueados e exclusões. Alinhamento/distribuição/variação de rotação operam sobre seleção múltipla e são uma transação de histórico.
- **Quick Build / Smart Build Inicial (`quick-build.js`):**
  - Geração paramétrica de salas a partir de medidas digitadas ou retângulo desenhado com o mouse.
  - Cria piso dimensional, 4 paredes retas com espessura e altura parametrizadas.
  - Geração de vão físico real na parede frontal com porta hospedada dotada de dobradiça e ângulo de abertura editável.
  - Adição opcional de ponto de luz central.
  - O resultado é gerado como uma **proposta imutável** (*proposal*) com prévia transparente no 3D, exigindo confirmação explícita antes de entrar no documento oficial. Todos os itens aceitos permanecem 100% editáveis de forma individual.

### 2.4. Renderização 3D e Câmeras (`src/render/`)
- **Viewport Three.js / WebGL 2 (`renderer.js`):**
  - Renderizador PBR com iluminação dinâmica, sombras direcionais e mapeamento de tons.
  - Sistema de *gizmo* interativo para translação, rotação e escala (com quarto eixo/seta diagonal amarela para escala proporcional e uniforme nos três eixos).
  - Atalhos de teclado operacionais no canvas: **Q** (selecionar), **G** (mover), **R** (rotacionar), **V** (escala), **F** (enquadrar seleção), **Ctrl+C / Ctrl+V** (copiar e colar), **Ctrl+D** (duplicar), **Ctrl+Z / Ctrl+Y** (desfazer/refazer) e **Ctrl+S** (salvar).
  - Navegação WASD/Page Up/Down com inércia e Shift; Espaço sobe e Ctrl desce na perspectiva; zoom, pan e órbita podem ocorrer enquanto anda. Velocidade e lente editáveis; transições por alvo/distância/ângulo/FOV ou altura ortográfica, interrompíveis, com corte imediato e respeito a reduzir movimento. Render sob demanda continua durante o movimento.
  - Controle de visualização: Perspectiva 3D livre com órbita (botão direito) e pan (botão do meio/scroll), e visão superior tática 2D (*Top View*).
  - *Cutaway* inteligente: paredes frontais sofrem corte visual automático de altura para permitir que o mestre e jogadores enxerguem o interior da sala sem obstrução visual da câmera.
- **Objetos de Cena e Estruturas (`scene-objects.js`):**
  - Geração de malhas para pisos retangulares/poligonais, escadas/rampas e paredes com recortes de portas/janelas, portas animáveis e luzes pontuais.
  - Tokens estilizados em cilindro/base física com anéis de cor ou cartões verticais (*standees*) com imagens.
- **Cache e Ingestão de Modelos (`asset-cache.js`):**
  - Carregador seguro de GLTF/GLB estático com centralização automática na base e normalização de escala.
  - Bloqueio de malhas animadas, dependências externas e extensões não suportadas.
  - Cache de texturas e imagens locais (PNG, JPEG, WebP).

### 2.5. Experiência do Mestre e UI (`src/app/application.js`)
- **Painéis de Controle:**
  - Aba **Construir:** Dimensões rápidas de sala, adição manual de pisos, paredes, portas, janelas, plataformas, escadas/rampas, tokens e luzes, além de Smart Build.
  - Aba **Assets:** Catálogo com 161 modelos originais locais, prévias e paginação; categorias hierárquicas, épocas, cenários, busca, filtros por múltiplas tags, favoritos e classificação editável persistente. Importação de imagens/GLB estático preservada. Ver [ASSET_LIBRARY.md](ASSET_LIBRARY.md).
  - Aba **Cena:** Oito presets e biblioteca de ambientes, controles diretos de sol/lua, Kelvin/HSV, céu/nuvens e clima, salvamento de enquadramentos de câmera, lançamento da segunda janela para projetor, e **gerenciamento hierárquico da árvore de cena** com suporte a pastas/grupos (+ Nova Pasta, renomear, excluir), organização via arrastar e soltar (*drag & drop*) e renomeação direta de objetos.
- **Menu de Contexto Rápido:**
  - Botão direito sobre um objeto no 3D seleciona e abre menu com **Renomear**, **Duplicar** e **Deletar** somente ao soltar sem arrastar; órbita não seleciona. A árvore também oferece o menu de contexto.
- **Inspetor Lateral Completo:**
  - Edição numérica de coordenadas X, Y, Z, rotação Yaw e escala em todos os eixos.
  - Controle de abertura de portas (ângulo interativo), posição/peitoril de janelas e troca da parede hospedeira.
  - Dimensões e desnível de escadas/rampas; quantidade de degraus e escolha explícita do apoio para tokens.
  - Seleção e movimentação rápida de pasta/grupo para qualquer entidade.
  - Ajuste de cores de tokens e parâmetros de luzes (tipo, intensidade, alcance, cor/Kelvin, direção spot, cone, penumbra, sombras e cintilação).
  - Ferramentas de cópia e colagem (`Ctrl+C` / `Ctrl+V`), duplicação (`Ctrl+D`) e exclusão (`Delete`/`Backspace`).
- **Interface Gráfica de Gestão da Mesa (Painel Flutuante Multitabs, Não-Bloqueante e Arrastável):**
  - **Design Não-Bloqueante & Arrastável:** O painel não trava a tela nem aplica camada escura, permitindo que o mestre veja a mesa 3D, inspecione a sala, orbite a câmera e selecione onde colocar tokens. O cabeçalho pode ser arrastado com o mouse para reposicionar o painel livremente, e o fechamento responde imediatamente pelo botão **X**, pela tecla <kbd>Esc</kbd> ou ao alternar pelo botão do cabeçalho.
  - **Aba Cenas:** Listagem de todas as cenas salvas no servidor local, abertura rápida, duplicação e exclusão com segurança de revisão.
  - **Aba Mapas (`MapDocument`):** Gerenciamento completo do acervo de mapas estruturais. Permite salvar a estrutura da cena atual como um mapa modelo reutilizável (`createMapFromScene`), criar novas cenas instantaneamente a partir de um mapa (`createSceneFromMap`), abrir mapas para edição direta e criar novos mapas em branco.
  - **Aba Tokens:** Catálogo visual de personagens com arquétipos padrão (Guerreiro, Mago, Ladino, Clérigo, Monstro, NPC) e retratos customizados importados pelo usuário, com posicionamento imediato com 1 clique no piso 3D.
  - **Aba Documentos:** Central de arquivos para o mestre. Permite baixar/exportar o documento ativo completo em `.json` e carregar/importar arquivos `.json` locais de cenas ou mapas com validação automática de esquema.

### 2.6. Apresentação e Segunda Janela para Projetor (`src/app/presentation.js`)
- **Modo Apresentação Embutido:** Permite alternar o editor para modo de visualização limpa em tela cheia na própria máquina.
- **Janela Dedicada do Projetor:**
  - Abertura de segunda janela via botão dedicado.
  - Comunicação via `BroadcastChannel`.
  - **Câmera Publicada Independente:** O mestre pode navegar livremente pela sala em seu monitor para fazer edições sem afetar o enquadramento exibido aos jogadores no projetor. A câmera dos jogadores só muda quando o mestre publica explicitamente um novo enquadramento.
  - **Projeção Filtrada e Segura:** O snapshot transmitido limpa anotações, elementos ocultos, entidades de suporte e metadados confidenciais antes de renderizar na tela pública.

### 2.7. Backend, Persistência e Segurança (`server/` e `src/data/`)
- **Servidor Local Node.js / Express:**
  - Endpoints REST para gerenciamento de cenas (`/api/tabletop/scenes`), mapas (`/api/tabletop/maps`) e assets (`/api/tabletop/assets`).
  - Gravação atômica em disco (escrita em arquivo temporário seguida de renomeação atômica).
  - Rotação automática dos últimos 5 backups para cada cena alterada.
  - Controle de concorrência otimista com verificação de revisão (retorno HTTP 409 Conflict se outra aba tentar sobrescrever dados defasados).
  - Ingestão segura de arquivos com limite de tamanho (25 MB para assets, 5 MB para documentos) e validação de extensões.
  - Proteção CSRF de escrita com autorização dinâmica de origens locais (loopback `localhost`, `127.0.0.1`, `[::1]` em qualquer porta e variáveis de ambiente).
- **Armazenamento de Rascunho Local (`drafts.js`):**
  - Rascunhos automáticos salvos no IndexedDB por aba.
  - Modal de recuperação no carregamento caso o navegador feche inesperadamente ou falhe a gravação no disco.

### 2.8. Testes Automatizados e Qualidade
- **131 testes unitários e de integração (`npm test`):** Regras implementadas de domínio, snap, cenas/mapas, aberturas, projeção, pastas, histórico, concorrência e backups; Fase 3 acrescenta migração, polígonos côncavos, janelas empilhadas, apoios/ciclos, regeneração com overrides/exclusões, conservação de dependentes e polish; as correções acrescentam recorte de janela movida em parede rotacionada, bloqueio da parede hospedeira, geometria/validação de acessos e altura dos tokens após snap/edição; catálogo acrescenta resolução dos 161 modelos/prévias, filtros combinados, metadados validados, concorrência, persistência e referências preservadas; câmera acrescenta direção relativa/superior, normalização de diagonais, integração temporal da velocidade, Espaço/ambos os Ctrl na perspectiva e trajetos sem colapso do raio. A iluminação acrescenta validação/Kelvin, histórico, flicker determinístico, direção do spot/socket, regeneração e projeção filtrada; ambientes acrescentam HSV, snapshots, biblioteca/concorrência/backups, vínculos por horário, duplicação/projeção, materiais por slot e partículas determinísticas. Materiais/efeitos acrescentam cinco testes para rejeição atômica, histórico/duplicação/projeção, limites de emissores, máscaras texturizadas/reamostragem, isolamento de acabamento, atlas compartilhado e descarte. Caminhos estáticos acrescentam um teste para base por diretório e URLs de assets/projetor. Personalização acrescenta três testes para parâmetros validados/histórico/mapas/projeção, desenhos determinísticos de madeira/metal e atlas compactos com compartilhamento/liberação por referência.
- **17 testes E2E com Playwright (`npm run test:e2e`):** Criação/edição, assets, apresentação, recuperação entre abas e fluxos da Fase 3 e da evolução estrutural pela UI, incluindo desenho de dois polígonos sem reload, janela colocada por clique e arrastada com undo/redo, escadas/rampas e tokens apoiados; comparação do documento após reiniciar navegador e servidor; biblioteca acrescenta filtros, tags personalizadas, favoritos, novos props e classificação de importados após reinício. Execução sequencial com Chromium headless e WebGL por software; inclui composição mesa + lamparina, transformações conjuntas e desancoragem pela pasta. O E2E de câmera cobre WASD durante zoom/pan/órbita, seleção no release sem arraste, altura com Espaço/ambos os Ctrl, foco/atalhos, lente, publicação independente, transições sem reinício por edições, pausa/corte, interrupção, redução de movimento e persistência de presets. Os dois E2E de iluminação acrescentam edição/persistência após reinício, pausa/movimento reduzido, qualidade independente e descarte de buffers, além de pixels WebGL de profundidade/volume/bloom. Os dois E2E de ambientes acrescentam presets/Kelvin/HSV, slots de materiais, instâncias independentes, janelas/luzes por horário, nuvens/partículas, pausa/qualidade, biblioteca/prévia, câmera publicada e fidelidade após reinício; pixels WebGL confirmam sol/lua, nuvens e chuva. Câmera/autoria/ambientes foram repetidos após ajustar o encerramento da órbita com animação contínua. Os dois E2E de materiais/efeitos acrescentam edição, terreno texturizado, fogo/fumaça, pausa/qualidade, instâncias por material, reabertura e câmera independente; WebGL compara pixels dos oito materiais, mistura de máscaras e animação, além da liberação das texturas. Neste incremento, os três E2E de materiais/efeitos e terreno foram executados; os dois de materiais/efeitos foram repetidos após a revisão final. Os casos verificam controles de personalização, persistência/projetor, máscaras, recoloração, brilho/saturação, padrões de madeira/metal, compatibilidade com documentos sem os novos campos, oito camadas personalizadas e descarte. Os dois novos E2E de Pages/IndexedDB verificam publicação estática sem API, paths/imports/projetor/reabertura/isolamento e concorrência/falhas atômicas. No incremento de Pages passaram esses dois e os roteiros de biblioteca/recuperação local; a suíte completa anterior de 14 foi validada na entrega de materiais/efeitos. Não representa benchmark no notebook/projetor.

---

### 2.9. Evolução Estrutural e Polish (`STRUCTURAL_EVOLUTION.md`)
- **Terreno:** heightmap editável com pincéis de elevar/rebaixar/suavizar/nivelar, formato/dureza, camadas de cor, ajuste numérico e apoios sincronizados aos triângulos da malha. Cada traço é uma operação cancelável de histórico.
- **Recortes e paredes:** furos físicos em pisos retangulares/poligonais; prévia de paredes de contorno com reutilização de segmentos colineares completos/parciais; junções anguladas por mitras limitadas e terminações em T.
- **Andares e camadas:** nome/altura/visibilidade/bloqueio, adoção da construção existente, cópia de construção com novos IDs, movimento mundial sem deslocamento duplicado e isolamento temporário no editor. Escadas/rampas acompanham andares associados.
- **Ancoragem estrutural:** props/luzes em sockets locais de paredes ou na face inferior de pisos superiores, com transporte/deleção dos dependentes e edição numérica.
- **Polish local:** paletas de material por instância, frente voltada à referência, revisão de folgas com deslocamentos propostos, luminária em canto livre, distribuição/normalização de luzes e enquadramento da referência. Prévia com motivos/conflitos, preservação de protegidos e aceite atômico.
- **Persistência:** campos opcionais do schema 2 validados e preservados em cenas/mapas, duplicação, backups e reinício; projeção pública filtra níveis/camadas e dependentes privados.

---

### 2.10. Iluminação e Imersão Avançada ([LIGHTING.md](LIGHTING.md))
- **Spot e temperatura:** fontes editáveis por tipo, posição, direção, cone/penumbra, alcance, estado e sombra; Kelvin aproximado convertido para a cor sRGB salva. Cor direta desativa Kelvin. Spots usam gizmo, sockets parede/teto com direção relativa ao host, composições e polish.
- **Flicker:** padrões determinísticos para vela/tocha e fluorescente defeituosa, amplitude/frequência/seed, pausa global e desligamento por fonte; avaliação visual sem comandos ou salvamento por frame. Abas ocultas e movimento reduzido pausam a animação.
- **Fog e volume:** névoa linear/exponencial por distância; camada volumétrica homogênea por altura, densidade, cor e distância máxima. Integração analítica do raio até a primeira geometria opaca, nas duas projeções. Feixes, espalhamento e sombras volumétricas continuam como extensão futura.
- **Bloom e qualidade:** pipeline opcional com OutputPass, buffers limitados a pixel ratio 1 e mips reduzidos; desligamento local independente por janela e descarte dos recursos ao desligar/destruir. Fog de distância permanece disponível.
- **Dados e apresentação:** campos opcionais do schema 2, com validação profunda, undo/redo, mapas/cenas/duplicação e filtragem de fontes privadas. Editar look não publica câmera nem reinicia transições do projetor.
- **Validação final em 4 de outubro:** build, 107 testes unitários/de integração e dez E2E passaram. Os dois E2E de iluminação foram repetidos após o ajuste de yaw que preserva a inclinação do spot. Nove testes novos de domínio/renderização e dois E2E cobrem edição pela UI, parâmetros preservados após reinício, animação sem mudança no documento, pausa/movimento reduzido, recursos GPU sem acumulação e pixels reais de profundidade/volume/bloom. A avaliação presencial no notebook/projetor permanece pendente.

---

### 2.11. Ambientes, horários e clima (`ENVIRONMENTS.md`)

- **Controles diretos:** sol/lua, intensidade, Kelvin, RGB/HSV, altitude/azimute, sombras, exposição e preenchimento na aba Cena.
- **Presets e céu:** dia, tarde, noite, neblina, chuva, pântano, calor e neutro; céu procedural com sol/lua, estrelas e nuvens editáveis/animadas.
- **Clima:** emissor global de chuva, poeira, brasas ou fumaça suave, limitado a 3.000 partículas por região/seed; geometria em lote, animação temporal, pausa/movimento reduzido e qualidade independente por janela. Partículas não colidem com tetos/paredes.
- **Reação ao horário:** janelas de vidro acesas à noite; vínculos de materiais por slot e estado de luzes por dia/noite, sem modificar assets compartilhados. Ajustes de material explícitos têm precedência; emissão não substitui luz local.
- **Biblioteca:** EnvironmentDocument validado no servidor, criação/atualização/exclusão/duplicação, revisão/conflito/backups, snapshots independentes da cena e prévia/diff sem publicar no projetor. Vínculos por instância acompanham histórico, duplicação e filtragem de dados privados.
- **Validação final:** Build de produção, 118 testes unitários/de integração e os 12 roteiros E2E verificados com sucesso. Após corrigir o encerramento da órbita durante animação contínua, os roteiros de câmera, autoria e ambientes foram repetidos e passaram. Uso e limites: [ENVIRONMENTS.md](ENVIRONMENTS.md).

---

### 2.12. Materiais Texturizados e Efeitos Locais ([MATERIALS.md](MATERIALS.md))

- **Biblioteca local:** oito texturas procedurais originais com cor/altura/rugosidade; projeção em três eixos e tamanho em metros, aplicação em estruturas e em um material nomeado do objeto, mantendo instâncias independentes.
- **Terreno:** até oito camadas de cor/textura misturadas por máscara, com escala, ordem, visibilidade e opacidade; pintura, reamostragem e histórico preservados.
- **Fogo/fumaça:** emissores vinculados a props, planos de partículas desenhados em lote, turbulência, expansão/desvanecimento e seed; fogueira com luz pontual cintilante. Controles no inspetor e colocação em Construir → Peças avulsas.
- **Dados e custo:** campos opcionais validados, persistência/duplicação/projeção filtrada, 512 partículas por emissor, 32 emissores ativos e 4.096 partículas locais por documento; pausa/movimento reduzido e qualidade independente. Texturas compartilhadas por viewport e recursos de emissores descartados ao reconstruir/destruir.
- **Validação:** build, 123 testes unitários/de integração e a suíte de 14 E2E passaram; cinco roteiros afetados foram repetidos após a revisão de acabamento/seleção. Os dois E2E de materiais/efeitos passaram novamente após o último ajuste de chamas/overrides; detalhes no [andamento](../progress.md). Sem benchmark presencial.

---

### 2.13. Personalização das Texturas ([MATERIALS.md](MATERIALS.md))

- **Cor e acabamento:** recoloração que preserva detalhes, paleta original/multiplicação, brilho para escurecer/clarear, contraste/saturação, rotação e densidade/seed.
- **Madeira:** tábuas por repetição, orientação horizontal/vertical, juntas e veios, madeira contínua e parquet em blocos.
- **Metal:** escovado, liso, chapa xadrez, ondulado e enferrujado; desgaste/oxidação, rugosidade e resposta metálica local na ferrugem.
- **Autoria e dados:** controles compartilhados por material/camada do terreno, blocos avançados conservados abertos ao editar, campos opcionais com validação e padrões compatíveis com cenas antigas. Máscaras, histórico, mapas/duplicação, salvamento e projetor conservados.
- **Custo e validação:** cache CPU limitado e atlas compactos compartilhados/liberados por referência. Build, 126 testes de domínio/integração e três E2E afetados passaram; materiais/efeitos repetidos após a revisão final. Sem benchmark presencial.

---

### 2.14. GitHub Pages e Persistência no Navegador ([GITHUB_PAGES.md](GITHUB_PAGES.md))

- **Hospedagem estática:** build com base relativa em `dist-pages/`, caminhos de assets/favicons/projetor seguindo o diretório publicado, 161 modelos/prévias e workflow oficial de Pages com build/testes. API Node continua disponível no modo local.
- **Biblioteca pessoal:** IndexedDB para cenas/mapas/ambientes, PNG/JPEG/WebP e GLB estático, classificação/favoritos. Campos/refs validados; URLs Blob são temporárias e recriadas ao reabrir.
- **Persistência e separação:** revisão conferida e escrita/backups limitados na mesma transação, conflitos entre abas, recuperação local e namespaces por origem/diretório. Salvamento identifica o navegador; projetor mantém protocolo e câmera independente.
- **Validação:** dois builds, 127 testes de domínio/integração e quatro E2E afetados passaram: Pages/IndexedDB, biblioteca e recuperação. Teste estático sem API em subdiretório, raiz e segundo diretório; fechamento/reabertura, imports/projetor e rollback por falta de espaço.
- **Publicação e limites:** workflow pronto para envio/configuração em Settings → Pages → GitHub Actions; não há sincronização entre computadores. O JSON não empacota imports, e transporte de cena+assets continua como pendência.

---

### 2.15. Composição de terreno e rochas

- **Superfícies:** rocha natural fraturada/estratificada/granito com fissuras e neve procedural, com os ajustes de textura existentes. Dez superfícies no acervo; pedra em blocos conserva o desenho anterior.
- **Terreno:** pintura ou distribuição automática por faces superiores/encostas/toda a superfície, com inclinação, altura mundial, transições, irregularidade/tamanho de manchas e seed. Máscaras são guardadas ao mudar de modo; resampling/histórico/apoios preservados.
- **Cobertura:** textura/cor/quantidade/relevo independentes sobre materiais originais de estruturas/props/GLBs, por slot. Usa normais transformadas e não acrescenta geometria/draw calls; sem simulação de acúmulo ou teste de exposição ao céu.
- **Ponto de partida:** botão Montanha · rocha e neve em Terreno e relevo, com alturas e camadas comuns editáveis e trilha pintada.
- **Validação:** builds local/Pages, 131 testes unitários/de integração e seis E2E afetados passaram. UI, pixels WebGL, história, mapas, salvamento/reabertura, projetor independente, pintura e Pages. Captura revisada: test-results/mountain-surfaces.png. Suíte completa de 17 E2E não repetida neste incremento; sem benchmark presencial.
- **Uso e limites:** [MATERIALS.md](MATERIALS.md). Geometria detalhada de rochas, acúmulo físico, água/gelo, neve caindo e distribuição de vegetação continuam futuros; Ficha/Jukebox adiados.

## 3. O que está PENDENTE

Esta seção contém somente trabalho ainda não concluído. Recursos entregues estão na seção 2; a tabela da seção 4 reúne a cobertura de ambos. As lacunas para montar cenários com o detalhe das referências visuais estão em [VISUAL_TARGET.md](VISUAL_TARGET.md).

### 3.1. Pendências Imediatas (Fechamento e Consolidação do MVP)

1. **Pacote de Transporte de Cenas e Assets (Opcional):**
   - Exportação e importação de cenas completas acompanhadas de seus respectivos arquivos de assets (imagens e GLBs) em um arquivo empacotado (.zip ou manifesto), para transporte entre computadores.

---

### 3.2. Pendências do Marco V2 (Autoria Assistida & Apresentação Reutilizável)

1. **Smart Build Avançado e Prefabs Paramétricos (`MAP_AUTHORING.md` - Seções 10 a 13):**
   - Novas receitas de quarto/cela/laboratório e prefabs definidos pelo usuário.
   - Auto-layout entre cômodos e solver geral de circulação.
   - Biblioteca geral de receitas e variantes reutilizáveis.
2. **Evoluções adicionais da Biblioteca (`MAP_AUTHORING.md` - Seção 15):**
   - Coleções formais além de tags/favoritos e presets nomeados de texturas/materiais por asset; personalização procedural por instância/camada está entregue em §2.13.
   - Sockets específicos por asset e metadados para fixação automática.
   - Suporte a importação de modelos glTF com diretórios de texturas externas.
3. **Extensões futuras de imersão (`IMMERSION.md` - Seções 7 a 9):**
   - Múltiplas regiões de chuva/poeira/brasas e colisão de partículas.
   - Volumetria com feixes, densidade variável, sombras e espalhamento por fonte, condicionada a benchmark.
   - Efeitos adicionais e medição de bloom/sombras no notebook e projetor reais.
4. **Câmera Cinematográfica (`IMMERSION.md` - Seção 10):**
   - Acompanhamento automático de tokens em movimento, caminhos/colisão de câmera e avaliação presencial no projetor.
5. **Integrações Externas Reservadas (`ARCHITECTURE.md` - Seção 11 e `src/integrations/README.md`):**
   - **Integração com a Ficha de Personagens:** Conexão com o servidor da ficha para leitura de fichas por `actorId` e sincronização bidirecional de recursos (PV, Sanidade, Pontos de Esforço), sem que o Tabletop assuma autoridade indevida sobre o sistema de regras.
   - **Integração com o Jukebox de Áudio:** Fachada de comunicação via WebSocket/HTTP para enviar gatilhos de cenas musicais (*audioCue*) diretamente da cena do Tabletop, reagindo a transições sem poluir o histórico de *undo/redo* visual.

---

### 3.3. Pendências do Marco V3 (Grandes Cenários & Rede Local LAN)

1. **Otimizações para Cenários Extensos:**
   - Implementação de *Level of Detail* (LOD) dinâmico para modelos 3D distantes.
   - Instanciamento em lote (*hardware instancing*) para elementos estruturais repetitivos.
   - Particionamento espacial e *streaming* de áreas do mapa sob demanda.
2. **Sessão Multiusuário em Rede Local (LAN para Jogadores):**
   - Servidor autoritativo de sessão local com pareamento por código PIN ou QR Code no Wi-Fi.
   - Visualizador web responsivo e leve (vista tática 2D ou 3D leve) acessível por smartphones ou tablets dos jogadores.
   - Gerenciamento de permissões: cada jogador só pode mover e inspecionar o seu próprio token.
   - Protocolo com identificadores de comando únicos (*commandId*), ordenação e tolerância a reconexões.

---

### 3.4. Futuro e Recursos Condicionados a Validação

1. **Névoa de Guerra Dinâmica (*Fog of War*):**
   - Cálculo de visibilidade e linha de visão (LoS) em tempo real calculada a partir dos tokens dos jogadores, sem misturar iluminação com regras de sigilo.
2. **Importadores de Outros VTTs:**
   - Suporte a leitura de pacotes exportados por ferramentas como Universal VTT (`.dd2vtt`), Foundry VTT ou Dungeondraft.
3. **Assistência por Inteligência Artificial (Offline):**
   - Modelos locais leves para auxílio semântico em descrição de salas ou geração procedural de mobília a partir de comandos em linguagem natural.
4. **Migração de Banco de Dados:**
   - Adoção de SQLite caso a escala de documentos e assets ultrapasse o rendimento do sistema de arquivos JSON atual.

---

### 3.5. Lacunas para Cenários com o Detalhe das Referências Visuais

Prioridades de conteúdo e autoria identificadas na comparação das sete imagens fornecidas com o código atual; são propostas de trabalho atualizadas após a implementação de materiais/efeitos locais. Escopo e critérios: [VISUAL_TARGET.md](VISUAL_TARGET.md).

1. **Conteúdo visual:** kits coerentes de modelos detalhados/texturizados para interiores, cidade, ruínas e exterior; materiais de madeira, metal, concreto e tecido com desgaste; pequenos objetos de decoração e miniaturas estáticas de corpo inteiro.
2. **Materiais e superfícies:** importação de texturas avulsas/fotográficas e coleções nomeadas; manchas e desgaste por decals; controle de umidade e poças/água.
3. **Montagem:** biblioteca de prefabs do usuário e pincel de distribuição de vegetação/entulho com variação e apoio no terreno.
4. **Miniaturas 3D:** fluxo dedicado de vinculação ao personagem/token, escala e footprint; rig, poses editáveis e animação como evolução separada.
5. **Acabamento e escala:** avaliar oclusão ambiente e iluminação/reflexos de ambiente e otimizações para cenas densas, com medição no notebook/projetor.

---

## 4. Tabela de Cobertura e Progresso

| Módulo / Funcionalidade | Planejado em | Status Atual | Localização no Código |
| :--- | :--- | :--- | :--- |
| **Piso, Paredes e Sala Inicial** | `MAP_AUTHORING.md` §7 | **Concluído** | `src/domain/documents.js`, `src/render/scene-objects.js` |
| **Porta Física com Vão e Giro** | `MAP_AUTHORING.md` §7.3 | **Concluído** | `src/render/scene-objects.js`, `src/app/application.js` |
| **Grid e Snap Métrico** | `MAP_AUTHORING.md` §6 | **Concluído** | `src/domain/coords.js` |
| **Edição Manual (Mover, Rotacionar, Escalar)** | `MAP_AUTHORING.md` §5 | **Concluído** (Atalhos: G, R, V) | `src/render/renderer.js`, `src/app/application.js` |
| **Tokens e Retratos** | `ARCHITECTURE.md` §6.5 | **Concluído** | `src/domain/documents.js`, `src/render/scene-objects.js` |
| **Catálogo de Móveis Básico** | `ROADMAP.md` §3.1 | **Concluído e ampliado** (161 itens locais) | `public/assets/`, `src/app/application.js` |
| **Ingestão de Imagens e GLB** | `ARCHITECTURE.md` §8 | **Concluído** (GLB estático) | `src/render/asset-cache.js`, `server/app.js` |
| **Quick Build (Sala com Porta/Luz)** | `MAP_AUTHORING.md` §3 | **Concluído** | `src/authoring/quick-build.js` |
| **Luzes e Presets de Ambiente** | `IMMERSION.md` §4, §7 | **Concluído** (8 presets e biblioteca personalizada) | `src/domain/environments.js`, `src/render/renderer.js`; [ENVIRONMENTS.md](ENVIRONMENTS.md) |
| **Câmera, Enquadramento e Cutaway** | `IMMERSION.md` §10 | **Concluído** | `src/render/renderer.js` |
| **Apresentação e Janela Projetor** | `IMMERSION.md` §11 | **Concluído** (Câmera independente) | `src/app/presentation.js` |
| **Histórico e Undo/Redo** | `ARCHITECTURE.md` §7 | **Concluído** | `src/state/scene-store.js` |
| **Persistência, Conflito 409 e Backups** | `ARCHITECTURE.md` §9 | **Concluído** | `server/app.js`, `src/data/api.js` |
| **Rascunho e Recuperação Local** | `ARCHITECTURE.md` §9 | **Concluído** (IndexedDB) | `src/data/drafts.js` |
| **Pacote de Transporte de Arquivos** | `ROADMAP.md` §3.1 | **Opcional / Pendente** | Exportação empacotada de cena + assets em arquivo único |
| **Interface Dedicada para Mapas** | `ARCHITECTURE.md` §6.3 | **Concluído** | `src/app/application.js`, `src/domain/documents.js` |
| **Biblioteca de Tokens e Documentos** | `ARCHITECTURE.md` §6.5 | **Concluído** | Abas dedicadas no modal de Gestão da Mesa |
| **Pisos Poligonais e Janelas por Clique/Arraste** | `MAP_AUTHORING.md` §7.4 | **Concluído** | `geometry.js`, `scene-objects.js`, `application.js` |
| **Escadas e Rampas Paramétricas** | `MAP_AUTHORING.md` §7–8 | **Concluído** (dimensões, desnível, degraus e apoio de tokens) | `documents.js`, `scene-objects.js`, `application.js`, `commands.js` |
| **Plataformas e Apoios Explícitos** | `MAP_AUTHORING.md` §8 | **Concluído** (planos horizontais) | `commands.js`, `renderer.js` |
| **Visibilidade/Bloqueio de Pastas** | `MAP_AUTHORING.md` §8 | **Concluído** (herdado) | `geometry.js`, `presentation.js` |
| **Junções/Paredes Compartilhadas e Modelo de Andares**| `MAP_AUTHORING.md` §8 | **Concluído** (segmentos colineares, mitras/T, níveis e acessos) | `structures.js`, `commands.js`, `renderer.js` |
| **Auto-Decoration e Prefabs Avançados** | `MAP_AUTHORING.md` §10-12 | **Parcial** (3 receitas, diff, iluminação) | `furnishing.js`; biblioteca geral pendente |
| **Seleção Múltipla e Polish** | `MAP_AUTHORING.md` §14 | **Concluído** (materiais, orientação, passagens, cantos e luzes) | `polish.js`, `renderer.js` |
| **Terreno Esculpido e Furos em Pisos** | `MAP_AUTHORING.md` §7 | **Concluído** (heightmap limitado e recortes poligonais) | `terrain.js`, `geometry.js`, `scene-objects.js` |
| **Camadas e Sockets Estruturais** | `MAP_AUTHORING.md` §8–9 | **Concluído** (parede/teto) | `commands.js`, `application.js` |
| **Luz Spot, Flicker e Temperatura** | `IMMERSION.md` §4 | **Concluído** | `lighting.js`, `validation.js`, `lighting-panels.js`; [LIGHTING.md](LIGHTING.md) |
| **Fog de Distância, Volume por Altura e Bloom** | `IMMERSION.md` §8, §9 | **Concluído** (volume homogêneo limitado pela profundidade, bloom opcional) | `renderer.js`, `effects.js`; [LIGHTING.md](LIGHTING.md) |
| **Céu, Sol/Lua, Nuvens e Clima Global** | `ENVIRONMENTS.md` | **Concluído** (emissor global limitado) | `src/render/atmosphere.js`, `src/render/renderer.js` |
| **Materiais e Luzes por Horário** | `ENVIRONMENTS.md` | **Concluído** (vínculos por instância e janelas emissivas) | `src/render/atmosphere.js`, `src/domain/lighting.js`, `src/render/renderer.js` |
| **Texturas de Superfície e Mistura no Terreno** | `MATERIALS.md` | **Concluído** (8 materiais locais, até 8 camadas) | `surface-materials.js`, `material-panels.js`, `scene-objects.js` |
| **Personalização de Texturas** | `MATERIALS.md` | **Concluído** (cor/brilho/rotação, madeira, metal e camadas) | `materials.js`, `surface-pixels.js`, `surface-materials.js`, `material-panels.js` |
| **Fogo/Fumaça por Objeto e Luz da Fogueira** | `MATERIALS.md` | **Concluído** (emissores limitados, pausa/qualidade) | `local-effects.js`, `renderer.js`, `application.js` |
| **Navegação WASD e Transições Suaves de Câmera** | `IMMERSION.md` §10 | **Concluído** (duração, pausa/corte, lente e projetor independente) | `camera-motion.js`, `renderer.js`, `application.js`; [CAMERA.md](CAMERA.md) |
| **Acompanhamento de Tokens e Caminhos de Câmera** | `IMMERSION.md` §10 | **Pendente** | Incrementos posteriores; avaliação presencial pendente |
| **GitHub Pages e Biblioteca no Navegador** | `GITHUB_PAGES.md` | **Concluído** (build/workflow, paths, IndexedDB e projetor) | `paths.js`, `browser-repository.js`, `api.js`, `.github/workflows/pages.yml` |
| **Integração com Jukebox e Ficha** | `ARCHITECTURE.md` §11 | **Pendente** | Fronteiras definidas em `src/integrations/` |
| **Sessão LAN e Suporte a Celulares** | `ROADMAP.md` §5 | **Pendente** | Previsto para V3 |
| **Fog of War com Linha de Visão** | `ROADMAP.md` §6 | **Pendente** | Condicionado a validação futura |

---

## 5. Próximos Passos Recomendados

Para aproximar os mapas das referências fornecidas, a ordem recomendada é:

1. **Interior piloto:** montar um escritório pequeno com modelos GLB estáticos texturizados, objetos de decoração e miniaturas estáticas, ajustando escala, apoio, luzes e enquadramento. Validar salvamento/reabertura e apresentação no notebook/projetor.
2. **Autoria reutilizável e materiais:** biblioteca de prefabs, materiais autorais/fotográficos e aplicação de desgaste; produzir um pátio urbano com fachadas, vegetação e versões tarde/noite.
3. **Exterior detalhado:** distribuição de vegetação/entulho, materiais específicos, umidade e poças; medir custo antes de aumentar densidade.
4. **Efeitos e acabamento:** avaliar oclusão ambiente, reflexos, LOD/instanciamento e volumetria conforme o resultado e o hardware.

O pacote de transporte, integrações e LAN continuam no planejamento, com prioridade independente do objetivo visual. A proposta detalhada está em [VISUAL_TARGET.md](VISUAL_TARGET.md).

Integração Git do Pages: quatro commits remotos conciliados com a implementação local; workflow único pages.yml, base relativa e remoção de data/ do .gitignore preservada. Build estático e 127 testes passaram após o merge.

Prioridade visual atual: primeiro mapa de montanha com construções antigas, conforme VISUAL_TARGET.md. Neve acumulada, água e kit detalhado são lacunas específicas; Jukebox/Ficha adiados. Análise documental registrada em progress.md, sem implementação neste incremento.
