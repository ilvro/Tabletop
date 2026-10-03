# Tabletop — Progresso do Projeto

O relatório detalhado de progresso, comparando o que já foi implementado no código-fonte contra o planejamento arquitetural dos documentos `.md` (`ROADMAP.md`, `ARCHITECTURE.md`, `MAP_AUTHORING.md`, `IMMERSION.md`, `VERTICAL_SLICE.md`), está documentado em:

👉 **[`docs/PROGRESSO.md`](docs/PROGRESSO.md)**

### Sumário Rápido

- **Status:** Vertical Slice (MVP Funcional) entregue e validado com 32 testes automatizados e suíte E2E via Playwright.
- **Implementado:** Autoria do vazio, sala retangular, vão e porta real articulável, grid métrico com snap e footprints, edição manual completa (W: mover, R: rotacionar, S: escalar nos 3 eixos ou proporcionalmente via 4º eixo diagonal, F: enquadrar, Ctrl+C / Ctrl+V: copiar e colar, Ctrl+D: duplicar, menu de contexto com Renomear / Duplicar / Deletar via botão direito no 3D e na árvore), gerenciamento de pastas e organização hierárquica na aba Cena com drag & drop, renomeação rápida de objetos, tokens/retratos, catálogo de 6 assets locais, ingestão de imagens e GLB estático, Quick/Smart Build com proposta e transação atômica, 3 presets de iluminação e ambiente, cutaway de paredes, Master View com segunda janela para projetor via `BroadcastChannel` (câmera independente e projeção limpa de segredos), gravação atômica, controle de concorrência com revisão (409), 5 backups por cena e rascunhos em IndexedDB por aba.
- **Pendências Próximas (Fechamento do MVP):** Pacote de transporte (exportação/importação com assets juntos), UI gráfica para reutilização de Mapas (`MapDocument`), validação prática em sessão cronometrada e benchmark em hardware real com áudio (Jukebox).
- **Pendências Futuras (V2 & V3):** Janelas com recorte, pisos poligonais, múltiplos andares, auto-decoration/auto-layout, luz spot/flicker/fog de distância, transições cinematográficas de câmera, integrações externas (Ficha de personagens e Jukebox) e modo LAN para celulares de jogadores.
