# Tabletop — Relatório de Progresso e Planejamento

**Data:** 3 de outubro de 2026  
**Status do Projeto:** Vertical Slice (MVP Funcional) Concluído e Validado  
**Documentos de Referência:** [`ROADMAP.md`](ROADMAP.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`MAP_AUTHORING.md`](MAP_AUTHORING.md), [`IMMERSION.md`](IMMERSION.md), [`VERTICAL_SLICE.md`](VERTICAL_SLICE.md) e [`INVESTIGACAO_E_ARQUITETURA.md`](../INVESTIGACAO_E_ARQUITETURA.md).

---

## 1. Resumo Executivo

O projeto **Tabletop** alcançou com êxito a entrega e estabilização do seu **primeiro Vertical Slice funcional (MVP)**. 

O sistema já é capaz de criar salas 3D a partir do vazio no computador do mestre, aplicar assistência paramétrica (*Quick Build*) com prévia e aceite em transação única, editar manualmente todos os elementos com precisão métrica e *snap*, gerenciar tokens com retratos ou cores, dispor de iluminação ambiente/direcional/pontual com sombras e corte de paredes (*cutaway*), além de projetar a visão dos jogadores em segunda tela limpa com câmera independente via `BroadcastChannel`. Toda a persistência conta com histórico completo (*undo/redo*), versionamento com detecção de conflitos (HTTP 409), gravação atômica com rotação de backups e recuperação de falhas via IndexedDB.

Este relatório compara o estado atual do código-fonte em relação aos objetivos traçados nos documentos arquiteturais para mapear com clareza **o que já está pronto** e **o que permanece pendente** para os marcos seguintes (fechamento de MVP, V2, V3 e além).

---

## 2. O que está IMPLEMENTADO

### 2.1. Domínio, Geometria e Contratos (`src/domain/`)
- **Contrato de Documentos v1 (`documents.js`):** Schema rigoroso para cenas (`SceneDocument`), mapas (`MapDocument`), entidades estruturais (`EntityRecord`), atores (`ActorRecord`), tokens (`TokenRecord`), luzes (`LightRecord`) e presets de câmera (`CameraPreset`).
- **Coordenadas e Snapping Métrico (`coords.js`):**
  - Espaço 3D em metros com eixo Y para cima e pivot na base dos objetos.
  - Grade customizável em tamanho e visibilidade, com suporte a coordenadas negativas e origem deslocada.
  - Snap sensível ao *footprint* dos tokens (1×1 m, 2×2 m, etc.). Tecla `Alt` permite movimentação livre em tempo real sem alterar a grade.
  - Funções de conversão matemática entre ângulos de Euler (Yaw) e quatérnions.
- **Validação Estrutural e Tipagem (`validation.js`):** Validação profunda que rejeita dados com valores não finitos (`NaN`/`Infinity`), referências órfãs, extensões não permitidas ou mídias *inline* em base64.
- **Presets de Ambiente (`environments.js`):** Definições de iluminação e atmosfera para os presets `warm` (acolhedor), `moonlight` (luar) e `neutral` (neutro), integrando luz ambiente, sol direcional, cor de fundo e neblina.

### 2.2. Estado, Comandos e Histórico (`src/state/`)
- **Arquitetura de Comandos Puros (`commands.js`):** Todas as mutações no documento acontecem via comandos registrados (`entity.add`, `entity.update`, `entity.remove`, `entity.duplicate`, `group.add`, `group.update`, `group.remove`, `token.add`, `token.update`, `token.remove`, `token.duplicate`, `light.add`, `light.update`, `light.remove`, `environment.apply`, `camera.save`, `camera.remove`, `door.setAngle`, `proposal.accept`, `grid.update`).
- **Undo/Redo Transacional (`scene-store.js`):**
  - Histórico determinístico de desfazer/refazer.
  - Suporte a comandos compostos: operações assistidas (como aceitar uma sala inteira) entram no histórico como um único passo atômico, desfeito de uma só vez.
  - Controle de revisão numérica local e sinalização de modificações (*dirty state*).

### 2.3. Autoria e Assistência — Smart Build (`src/authoring/`)
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
  - Atalhos de teclado operacionais no canvas: **Q** (selecionar), **W** (mover), **R** (rotacionar), **S** (escala), **F** (enquadrar seleção), **Ctrl+C / Ctrl+V** (copiar e colar), **Ctrl+D** (duplicar), **Ctrl+Z / Ctrl+Y** (desfazer/refazer) e **Ctrl+S** (salvar).
  - Controle de visualização: Perspectiva 3D livre com órbita (botão direito) e pan (botão do meio/scroll), e visão superior tática 2D (*Top View*).
  - *Cutaway* inteligente: paredes frontais sofrem corte visual automático de altura para permitir que o mestre e jogadores enxerguem o interior da sala sem obstrução visual da câmera.
- **Objetos de Cena e Estruturas (`scene-objects.js`):**
  - Geração de malhas para pisos, paredes com recorte de abertura e vãos de porta, portas animáveis e luzes pontuais.
  - Tokens estilizados em cilindro/base física com anéis de cor ou cartões verticais (*standees*) com imagens.
- **Cache e Ingestão de Modelos (`asset-cache.js`):**
  - Carregador seguro de GLTF/GLB estático com centralização automática na base e normalização de escala.
  - Bloqueio de malhas animadas, dependências externas e extensões não suportadas.
  - Cache de texturas e imagens locais (PNG, JPEG, WebP).

### 2.5. Experiência do Mestre e UI (`src/app/application.js`)
- **Painéis de Controle:**
  - Aba **Construir:** Dimensões rápidas de sala, adição manual de pisos, paredes, portas, tokens e luzes.
  - Aba **Assets:** Catálogo local com 6 móveis pré-fabricados originais (mesa, cadeira, arquivo, caixa, luminária e tapete) e importador de arquivos do computador.
  - Aba **Cena:** Seleção de ambientes luminosos (acolhedor, luar, neutro), salvamento de enquadramentos de câmera, lançamento da segunda janela para projetor, e **gerenciamento hierárquico da árvore de cena** com suporte a pastas/grupos (+ Nova Pasta, renomear, excluir), organização via arrastar e soltar (*drag & drop*) e renomeação direta de objetos.
- **Menu de Contexto Rápido:**
  - Clique com botão direito (ou menu de opções na árvore) sobre qualquer objeto no 3D ou na árvore abre menu com **Renomear**, **Duplicar** e **Deletar**.
- **Inspetor Lateral Completo:**
  - Edição numérica de coordenadas X, Y, Z, rotação Yaw e escala em todos os eixos.
  - Controle de abertura de portas (ângulo interativo).
  - Seleção e movimentação rápida de pasta/grupo para qualquer entidade.
  - Ajuste de cores de tokens e parâmetros de luzes (intensidade, raio, cor).
  - Ferramentas de cópia e colagem (`Ctrl+C` / `Ctrl+V`), duplicação (`Ctrl+D`) e exclusão (`Delete`/`Backspace`).

### 2.6. Apresentação e Segunda Janela para Projetor (`src/app/presentation.js`)
- **Modo Apresentação Embutido:** Permite alternar o editor para modo de visualização limpa em tela cheia na própria máquina.
- **Janela Dedicada do Projetor:**
  - Abertura de segunda janela via botão dedicado.
  - Comunicação via `BroadcastChannel`.
  - **Câmera Publicada Independente:** O mestre pode navegar livremente pela sala em seu monitor para fazer edições sem afetar o enquadramento exibido aos jogadores no projetor. A câmera dos jogadores só muda quando o mestre publica explicitamente um novo enquadramento.
  - **Projeção Filtrada e Segura:** O snapshot transmitido limpa anotações, elementos ocultos, entidades de suporte e metadados confidenciais antes de renderizar na tela pública.

### 2.7. Backend, Persistência e Segurança (`server/` e `src/data/`)
- **Servidor Local Node.js / Express:**
  - Endpoints REST para gerenciamento de cenas (`/api/tabletop/scenes`) e assets (`/api/tabletop/assets`).
  - Gravação atômica em disco (escrita em arquivo temporário seguida de renomeação atômica).
  - Rotação automática dos últimos 5 backups para cada cena alterada.
  - Controle de concorrência otimista com verificação de revisão (retorno HTTP 409 Conflict se outra aba tentar sobrescrever dados defasados).
  - Ingestão segura de arquivos com limite de tamanho (25 MB para assets, 5 MB para documentos) e validação de extensões.
  - Proteção CSRF de escrita com autorização dinâmica de origens locais (loopback `localhost`, `127.0.0.1`, `[::1]` em qualquer porta e variáveis de ambiente).
- **Armazenamento de Rascunho Local (`drafts.js`):**
  - Rascunhos automáticos salvos no IndexedDB por aba.
  - Modal de recuperação no carregamento caso o navegador feche inesperadamente ou falhe a gravação no disco.

### 2.8. Testes Automatizados e Qualidade
- **32 testes unitários e de integração (`npm test`):** Cobertura completa de regras de domínio, snap, dependências estruturais, cálculo de aberturas de portas, projeção filtrada, 4º eixo de escala proporcional, gerenciamento de pastas e renomeação com histórico transacional, concorrência no servidor e rotação de backups.
- **Testes de ponta a ponta (E2E) com Playwright (`npm run test:e2e`):** Validação em navegador real do fluxo completo de criação de sala do vazio, aceite de Smart Build, manipulação de tokens/móveis, salvamento, reinício de servidor e sincronização de janelas.

---

## 3. O que está PENDENTE

O planejamento dos documentos arquiteturais (`ROADMAP.md`, `ARCHITECTURE.md`, `MAP_AUTHORING.md` e `IMMERSION.md`) divide as entregas em marcos claros. Abaixo estão detalhadas todas as funcionalidades pendentes, separadas por fase.

### 3.1. Pendências Imediatas (Fechamento e Consolidação do MVP)

1. **Pacote de Transporte de Cenas e Assets:**
   - *Planejado:* Exportação e importação de cenas completas acompanhadas de seus respectivos arquivos de assets (imagens e GLBs) em um arquivo empacotado ou manifesto de pasta.
   - *Status atual:* O salvamento persiste apenas no disco local dentro da pasta `data/`. Para mover um projeto entre computadores, é necessário copiar manualmente o diretório de dados inteiro.
2. **Interface Gráfica para Gestão de Mapas (`MapDocument`):**
   - *Planejado:* Uma UI desacoplada para salvar apenas a geometria estrutural de um local (o "Mapa") e poder criar múltiplas "Cenas" a partir dele com diferentes iluminações, móveis e tokens.
   - *Status atual:* A API do backend já implementa o modelo de mapas, mas a interface do usuário está focada exclusivamente na manipulação de cenas completas.
3. **Piloto Presencial e Validação com Usuário:**
   - *Planejado:* Exercício cronometrado de criação de cenário a partir do vazio em até 10 minutos pelo mestre, avaliando agilidade de criação e facilidade de manipulação.
   - *Status atual:* Os fluxos foram testados tecnicamente via Chromium e testes de integração, mas falta a sessão de validação prática no hardware real do usuário.
4. **Benchmark de Desempenho com Áudio Concorrente:**
   - *Planejado:* Medição de taxa de quadros (FPS), uso de CPU/GPU e consumo de memória em um notebook intermediário executando o Tabletop (duas janelas abertas) concomitantemente com o sistema de som (Jukebox) reproduzindo trilhas de fundo.
   - *Status atual:* O ambiente foi testado com renderização de software (SwiftShader) em ambiente headless; falta o ensaio no dispositivo final.

---

### 3.2. Pendências do Marco V2 (Autoria Assistida & Apresentação Reutilizável)

1. **Evolução Estrutural da Construção (`MAP_AUTHORING.md` - Seções 7 e 8):**
   - Pisos poligonais, plataformas e desníveis no terreno.
   - Janelas com recortes físicos na parede e opções de vidraça transparente ou grades.
   - Encontros de paredes e junções não retangulares (*corner joins* angulados ou em "T").
   - Suporte a múltiplos andares no mesmo mapa, com controle de visibilidade por nível e escadas/rampas.
   - Camadas e grupos organizacionais (*layers/groups*) para ocultar ou travar conjuntos de objetos.
   - Superfícies de apoio explícitas (objetos colocados em cima de mesas ou estantes que acompanham o movimento do móvel de suporte).
2. **Smart Build Avançado e Prefabs Paramétricos (`MAP_AUTHORING.md` - Seções 10 a 13):**
   - Biblioteca de templates e receitas de cômodos completos (ex.: quarto, escritório, cela, laboratório).
   - *Auto-decoration* e *auto-layout:* Distribuição contextual de móveis (ex.: colocar cadeiras automaticamente ao redor de uma mesa; posicionar cama encostada na parede com criados-mudos).
   - Distribuição de iluminação inteligente com base na área do cômodo.
   - Regeneração de composições com preservação de alterações manuais através de algoritmo de *diff* (manter objetos movidos ou trocados pelo mestre mesmo após reexecutar o gerador).
3. **Ferramentas de Polish e Ajustes Finos (`MAP_AUTHORING.md` - Seção 14):**
   - Ferramentas de alinhamento e distribuição uniforme de objetos.
   - Variação randômica sutil de rotação para evitar o aspecto artificialmente alinhado de cenas repetitivas.
4. **Catálogo de Assets e Biblioteca Expandida (`MAP_AUTHORING.md` - Seção 15):**
   - Sistema de categorias hierárquicas, tags temáticas e busca textual no catálogo.
   - Coleções de favoritos e variantes de texturas/materiais por asset.
   - Metadados de ancoragem (*anchors/sockets*) para fixação automática de itens em paredes ou tetos.
   - Suporte a importação de modelos glTF com diretórios de texturas externas.
5. **Iluminação e Imersão Avançada (`IMMERSION.md` - Seções 4 a 9):**
   - Luzes do tipo *Spot* (holofote/foco cônico) com ângulo de abertura e suavidade de penumbra configuráveis.
   - Simulação de temperatura de cor de iluminação em escala Kelvin.
   - Efeitos de cintilação animada (*flicker*) para tochas, velas e lâmpadas fluorescentes defeituosas.
   - Névoa volumétrica e *fog* de distância configurável no ambiente.
   - Efeitos leves de pós-processamento opcionais (como *bloom* sutil calibrado para não pesar a GPU).
6. **Câmera Cinematográfica (`IMMERSION.md` - Seção 10):**
   - Transições suaves e interpoladas entre enquadramentos de câmera salvos, com opção de corte imediato ou interrupção pelo mestre.
   - Modo de acompanhamento automático de tokens em movimento.
7. **Integrações Externas Reservadas (`ARCHITECTURE.md` - Seção 11 e `src/integrations/README.md`):**
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

## 4. Tabela de Cobertura e Progresso

| Módulo / Funcionalidade | Planejado em | Status Atual | Localização no Código |
| :--- | :--- | :--- | :--- |
| **Piso, Paredes e Sala Inicial** | `MAP_AUTHORING.md` §7 | **Concluído** | `src/domain/documents.js`, `src/render/scene-objects.js` |
| **Porta Física com Vão e Giro** | `MAP_AUTHORING.md` §7.3 | **Concluído** | `src/render/scene-objects.js`, `src/app/application.js` |
| **Grid e Snap Métrico** | `MAP_AUTHORING.md` §6 | **Concluído** | `src/domain/coords.js` |
| **Edição Manual (Mover, Rotacionar, Escalar)** | `MAP_AUTHORING.md` §5 | **Concluído** (Atalhos: W, R, S) | `src/render/renderer.js`, `src/app/application.js` |
| **Tokens e Retratos** | `ARCHITECTURE.md` §6.5 | **Concluído** | `src/domain/documents.js`, `src/render/scene-objects.js` |
| **Catálogo de Móveis Básico** | `ROADMAP.md` §3.1 | **Concluído** (6 itens locais) | `public/assets/`, `src/app/application.js` |
| **Ingestão de Imagens e GLB** | `ARCHITECTURE.md` §8 | **Concluído** (GLB estático) | `src/render/asset-cache.js`, `server/app.js` |
| **Quick Build (Sala com Porta/Luz)** | `MAP_AUTHORING.md` §3 | **Concluído** | `src/authoring/quick-build.js` |
| **Luzes e Presets de Ambiente** | `IMMERSION.md` §4, §7 | **Concluído** (3 presets) | `src/domain/environments.js`, `src/render/renderer.js` |
| **Câmera, Enquadramento e Cutaway** | `IMMERSION.md` §10 | **Concluído** | `src/render/renderer.js` |
| **Apresentação e Janela Projetor** | `IMMERSION.md` §11 | **Concluído** (Câmera independente) | `src/app/presentation.js` |
| **Histórico e Undo/Redo** | `ARCHITECTURE.md` §7 | **Concluído** | `src/state/scene-store.js` |
| **Persistência, Conflito 409 e Backups** | `ARCHITECTURE.md` §9 | **Concluído** | `server/app.js`, `src/data/api.js` |
| **Rascunho e Recuperação Local** | `ARCHITECTURE.md` §9 | **Concluído** (IndexedDB) | `src/data/drafts.js` |
| **Pacote de Transporte de Arquivos** | `ROADMAP.md` §3.1 | **Pendente** | Previsto para fechamento do MVP |
| **Interface Dedicada para Mapas** | `ARCHITECTURE.md` §6.3 | **Pendente** | Backend pronto, falta UI de gestão |
| **Validação Presencial e Benchmark** | `ROADMAP.md` §3.3 | **Pendente** | Necessita teste em hardware real |
| **Pisos Poligonais e Janelas** | `MAP_AUTHORING.md` §7.4 | **Pendente** | Previsto para V2 |
| **Paredes Anguladas e Múltiplos Andares**| `MAP_AUTHORING.md` §8 | **Pendente** | Previsto para V2 |
| **Auto-Decoration e Prefabs Avançados** | `MAP_AUTHORING.md` §10-12 | **Pendente** | Previsto para V2 |
| **Luz Spot, Flicker e Temperatura** | `IMMERSION.md` §4 | **Pendente** | Previsto para V2 |
| **Fog de Distância e Pós-Processamento** | `IMMERSION.md` §8, §9 | **Pendente** | Previsto para V2 |
| **Transições Suaves de Câmera** | `IMMERSION.md` §10 | **Pendente** | Previsto para V2 |
| **Integração com Jukebox e Ficha** | `ARCHITECTURE.md` §11 | **Pendente** | Fronteiras definidas em `src/integrations/` |
| **Sessão LAN e Suporte a Celulares** | `ROADMAP.md` §5 | **Pendente** | Previsto para V3 |
| **Fog of War com Linha de Visão** | `ROADMAP.md` §6 | **Pendente** | Condicionado a validação futura |

---

## 5. Próximos Passos Recomendados

Para manter a ordem de implementação técnica eficiente e alinhada ao cronograma:

1. **Completar o Transporte do MVP:** Desenvolver a funcionalidade de exportar/importar um arquivo contendo o documento da cena e todos os assets referenciados por ela, permitindo transportar a mesa entre dispositivos com segurança.
2. **Interface para Biblioteca de Mapas:** Adicionar na barra lateral a alternância entre Cenas e Mapas base, viabilizando reaproveitar a mesma planta baixa para múltiplos momentos de jogo.
3. **Sessão Prática de Validação (Playtest do Mestre):** Montar uma sala real utilizando o sistema atual no computador de mesa conectado a um projetor/segunda tela, avaliando o tempo de construção e a legibilidade à distância.
4. **Entrada nas Estruturas de V2:** Iniciar a implementação das janelas com recorte paramétrico e dos múltiplos andares/plataformas.
