# Tabletop — vertical slice

Implementação de 3 de outubro de 2026. Fundação funcional para preparar uma sala e apresentá-la no computador do mestre/projetor. A avaliação de rapidez e qualidade na máquina da mesa continua sendo um piloto com o usuário.

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

Verificação desta entrega: build de produção concluído, 30 testes de domínio/projeção/geometria/servidor e dois testes de navegador aprovados. O roteiro completo comparou o documento no disco após reiniciar servidor e navegador, verificou imagem/GLB persistentes e câmera independente; o outro roteiro verificou conflito 409, rascunhos de duas abas, restauração e edição durante a cópia. Chromium headless usou WebGL por software; isso não mede o desempenho do notebook/projetor.

Roteiro manual: desenhar uma sala ou preencher medidas → escolher porta/luz → ver prévia e criar → clicar em um elemento e mover/girar → colocar token e móveis → ajustar ambiente/luz → desfazer/refazer → salvar câmera e cena → encerrar/reiniciar servidor e navegador → abrir a cena salva. Em **Cena**, abrir segunda tela, arrastá-la ao projetor e publicar um enquadramento; orbitar no editor deve manter a câmera publicada. **Apresentar** oferece a alternativa na mesma janela.

Atalhos: Q selecionar, W mover, E girar, R escalar, F enquadrar; Ctrl/Cmd+S salvar, Ctrl/Cmd+Z desfazer, Ctrl/Cmd+Shift+Z refazer, Ctrl/Cmd+D duplicar seleção. Mouse direito orbita; botão do meio move a câmera. Esc cancela colocação/prévia ou sai da apresentação.

## Decisões e pontos de extensão

`src/domain/` guarda documentos/coordenadas/validação sem Three.js ou DOM; `src/state/` aplica comandos e histórico; `src/render/` mantém objetos e recursos de runtime. O renderer publica um transform ao terminar um gesto. `src/data/` confirma persistência e mantém rascunhos; o documento não contém meshes ou imagens base64.

`src/authoring/quick-build.js` é a primeira receita: produz uma proposta concreta, sem modificar o documento. Futuras receitas/prefabs, procedural placement, Smart Build, auto-decoration e auto-lighting podem produzir a mesma proposta para preview e `proposal.accept`, mantendo validação e undo. O slice não implementa um motor genérico nem regeneração por diff.

O schema 1 implementa um subconjunto funcional dos contratos arquiteturais. A UI trabalha com cenas; a API já guarda mapas, mas não há editor separado de mapas ou biblioteca de ambientes. Atores são locais. Comandos levam identidade/revisão local; sincronização autoritativa em rede exigirá sequência e deduplicação no servidor de sessão. [Fronteiras de integração](../src/integrations/README.md) reservam os contratos; não há integração real ou controles simulados.

## Limitações e próximos passos

GLB deve ser estático, autocontido, sem rig/animação, dependências externas ou compressão; o importador admite glTF core e `KHR_materials_unlit`/`KHR_materials_variants`. Normalização centraliza a base sem redimensionar silenciosamente. Upload máximo: 25 MB; documentos: 5 MB. Props não têm colisão física automática; a luminária decorativa recebe iluminação pela edição de luzes.

Histórico e câmera livre são de runtime; salvar um enquadramento é necessário para restaurá-lo. Excluir entidades admite undo; excluir um documento salvo usa confirmação e backup no disco. Não há gerenciamento de exclusão de assets. Um processo de servidor por diretório de dados; travas não coordenam servidores distintos. A recuperação depende do armazenamento do navegador; salvamento em disco é explícito.

Segunda janela usa BroadcastChannel na mesma origem e acompanha o mestre enquanto a conexão local existe. Pop-ups precisam ser permitidos. Este slice opera em loopback; não entrega acesso de celulares, autenticação LAN ou fog of war. Também ficam para depois: prefabs completos, auto-decoration, múltiplos andares, partículas, volumetria, pós-processamento pesado, biblioteca de ambientes e exportação/importação de pacote completo.

Próximos passos: piloto cronometrado no notebook/projetor, ajustar legibilidade/gestos e medir custo gráfico; depois transporte de documentos/assets e autoria reutilizável. Jukebox e Ficha não foram modificados. Benchmark com música e dispositivos reais permanece pendente, sem promessa de FPS.
