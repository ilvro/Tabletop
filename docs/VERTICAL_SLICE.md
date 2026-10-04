# Tabletop — vertical slice

Implementação de 3 de outubro de 2026. Fundação funcional para preparar uma sala e apresentá-la no computador do mestre/projetor. A avaliação de rapidez e qualidade na máquina da mesa continua sendo um piloto com o usuário.

Evolução posterior: gestão de mapas/tokens/documentos, pastas, renomeação e clipboard. A [Fase 3](PHASE_3.md) acrescenta pisos poligonais/elevados com desenho repetível, janelas por clique/arraste, escadas/rampas paramétricas, apoios em móveis, receitas regeneráveis e polish com seleção múltipla. O schema atual é 2, com migração de v1 ao carregar.

## Implementado

- Aplicação JavaScript/Vite, viewport Three.js/WebGL 2, perspectiva e vista superior, orbit/pan/zoom, enquadramento e câmeras salvas.
- Cena inicialmente vazia; grid editável; piso, paredes e porta com vão real, dobradiça e ângulo de abertura.
- Seleção por clique/lista, arraste/manipuladores, posição/rotação numéricas, escala de props/tokens, dimensões de estruturas, materiais, duplicação/exclusão e bloqueio de edição.
- Snap configurável em metros, com footprint de token, coordenadas negativas e Alt para movimento livre.
- Quick Build por medidas ou retângulo desenhado: prévia, porta/luz opcionais, aceite/cancelamento. A sala aceita vira uma transação de histórico; seus elementos continuam editáveis.
- Tokens locais com nome/cor/retrato; seis assets originais distribuídos localmente: mesa, cadeira, arquivo, caixa, luminária e tapete. Busca e importação de PNG/JPEG/WebP e GLB estático.
- Preenchimento, luz direcional com sombra e luzes pontuais editáveis. Presets acolhedor, luar e neutro preservam luzes pontuais existentes. Materiais foscos e corte visual de paredes para enxergar o interior.
- Master View, modo de apresentação na mesma aplicação e segunda janela local limpa. A câmera publicada é independente da câmera de edição. A projeção filtra elementos/apoios/atores e referências de assets ocultos antes de transmitir o snapshot.
- Comandos, undo/redo, IDs estáveis, salvar/listar/carregar, copiar a cena atual e excluir cenas salvas. Servidor com revisão, conflito, escrita temporária/rename e cinco backups por documento. Rascunho IndexedDB por aba, com recuperação explícita.

## Executar

Requer Node.js 22.12 ou superior e navegador com WebGL 2. Dentro de `Tabletop/`:

```bash
npm ci
npm run dev
```

Abrir **http://127.0.0.1:5173**. O comando inicia frontend e backend local, encerrados com Ctrl+C. Para usar o build:

```bash
npm run build
npm start
```

Abrir **http://127.0.0.1:3001**. Dados ficam em `data/scenes/`, `data/assets/` e `data/backups/`, fora do bundle/Git. `TABLETOP_DATA_DIR` altera o diretório; `TABLETOP_PORT` altera a porta do backend; `TABLETOP_UI_PORT` altera a porta do frontend em desenvolvimento. Se outro projeto já usar 5173, executar `TABLETOP_UI_PORT=5180 npm run dev` e abrir **http://127.0.0.1:5180**. Preservar o diretório de dados completo para manter os assets importados.

## Testar

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Se Chromium já estiver instalado, indicar seu executável em `TABLETOP_BROWSER_PATH` antes de `npm run test:e2e`. Os testes de navegador usam dados temporários e geram imagens em `test-results/`; não alteram suas cenas.

Verificação atual: build de produção concluído, 55 testes de domínio/projeção/geometria/servidor e três testes de navegador aprovados. Cobrem o slice, conflitos/recuperação e a Fase 3, incluindo regeneração preservada e fidelidade após reiniciar servidor e navegador. Chromium headless usou WebGL por software; isso não mede o desempenho do notebook/projetor.

Roteiro manual: desenhar uma sala ou preencher medidas → escolher porta/luz → ver prévia e criar → clicar em um elemento e mover/girar → colocar token e móveis → ajustar ambiente/luz → desfazer/refazer → salvar câmera e cena → encerrar/reiniciar servidor e navegador → abrir a cena salva. Em **Cena**, abrir segunda tela, arrastá-la ao projetor e publicar um enquadramento; orbitar no editor deve manter a câmera publicada. **Apresentar** oferece a alternativa na mesma janela.

Atalhos: WASD move a câmera, Shift acelera, Page Up/Down altera altura; Q selecionar, G mover objetos, R girar, V escalar, F enquadrar; Shift+clique seleciona vários; Ctrl/Cmd+C e Ctrl/Cmd+V copiam/colam; Ctrl/Cmd+S salva, Ctrl/Cmd+Z desfaz, Ctrl/Cmd+Shift+Z refaz, Ctrl/Cmd+D duplica seleção. Mouse direito orbita; botão do meio move a câmera. Esc cancela colocação/prévia ou sai da apresentação. Piso poligonal: Enter conclui e Backspace remove o último vértice.

Câmera cinematográfica: em **Cena**, ajustar velocidade, lente e duração; ativar enquadramentos salvos, interromper ou cortar a transição. A navegação livre conserva a câmera do projetor. Controles/limites em [CAMERA.md](CAMERA.md).

## Decisões e pontos de extensão

`src/domain/` guarda documentos/coordenadas/validação sem Three.js ou DOM; `src/state/` aplica comandos e histórico; `src/render/` mantém objetos e recursos de runtime. O renderer publica um transform ao terminar um gesto. `src/data/` confirma persistência e mantém rascunhos; o documento não contém meshes ou imagens base64.

`src/authoring/quick-build.js` produz a sala como proposta sem modificar o documento. `furnishing.js` acrescenta decoração/iluminação e regeneração por diff; `polish.js` produz ajustes. Novas receitas/prefabs podem usar a mesma proposta para preview e `proposal.accept`, mantendo validação e undo. A entrega não implementa um motor procedural genérico.

O schema atual é 2; v1 é migrado em memória e só regravado ao salvar explicitamente. A UI trabalha com cenas/mapas e permite converter/instanciar mapas. Biblioteca de ambientes continua pendente. Atores são locais. Comandos levam identidade/revisão local; sincronização autoritativa em rede exigirá sequência e deduplicação no servidor de sessão. [Fronteiras de integração](../src/integrations/README.md) reservam os contratos; não há integração real ou controles simulados.

## Limitações e próximos passos

GLB deve ser estático, autocontido, sem rig/animação, dependências externas ou compressão; o importador admite glTF core e `KHR_materials_unlit`/`KHR_materials_variants`. Normalização centraliza a base sem redimensionar silenciosamente. Upload máximo: 25 MB; documentos: 5 MB. Props não têm colisão física automática; a luminária decorativa recebe iluminação pela edição de luzes.

Histórico e câmera livre são de runtime; salvar um enquadramento é necessário para restaurá-lo. Excluir entidades admite undo; excluir um documento salvo usa confirmação e backup no disco. Não há gerenciamento de exclusão de assets. Um processo de servidor por diretório de dados; travas não coordenam servidores distintos. A recuperação depende do armazenamento do navegador; salvamento em disco é explícito.

Segunda janela usa BroadcastChannel na mesma origem e acompanha o mestre enquanto a conexão local existe. Pop-ups precisam ser permitidos. Este slice opera em loopback; não entrega acesso de celulares, autenticação LAN ou fog of war. A Fase 3 já oferece decoração assistida limitada e a evolução estrutural inclui andares/acessos. Iluminação e ambientes incluem partículas em região editável, céu/nuvens, névoa por altura, bloom e biblioteca persistente ([ENVIRONMENTS.md](ENVIRONMENTS.md)). Ficam para depois prefabs gerais, múltiplos emissores ligados a objetos/áreas, volumetria com sombras, pós-processamento pesado e exportação/importação de pacote completo.

Próximos passos: piloto cronometrado no notebook/projetor, ajustar legibilidade/gestos e medir custo gráfico; depois transporte de documentos/assets e autoria reutilizável. Jukebox e Ficha não foram modificados. Benchmark com música e dispositivos reais permanece pendente, sem promessa de FPS.
