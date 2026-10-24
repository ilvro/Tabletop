# Tabletop — andamento

Atualizado em 24 de outubro de 2026. Histórico geral: [PROGRESSO.md](PROGRESSO.md) e [relatório detalhado](docs/PROGRESSO.md).

## Implementação do plano de desempenho (24 de outubro) — em andamento

Plano: [docs/PLANO_DESEMPENHO_2026-10-24.md](docs/PLANO_DESEMPENHO_2026-10-24.md).

- **Fase 0 — Baseline na RX 580 (concluída):**
  - `diagnostics.measure` adicionado em `renderer.js` para `figures`, `updateCutaway`, `pages.sync`, `descriptors`, `matrixWorld`, `cutawayCasters` e `prepareOcclusion`; decomposição de carga com `performance.mark`/`measure` (`fetch`, `tile`, `recipe`, `setDocument`, `firstFrame`, `shaderWarmup`).
  - Baseline salva em [docs/benchmarks/frames-2026-10-24.json](docs/benchmarks/frames-2026-10-24.json) (RX 580, 1600×900, 150 quadros por câmera, com e sem `occlusion` + `silhouettes` + céu noturno/aurora + 8 figuras):
    - **Backrooms** (salão): 808 chamadas, p50 12,3 ms / p95 31,4 ms (CPU 7,5 ms, GPU 8,1 ms); tático+noite+8 figuras: 893 chamadas, p50 14,8 ms / p95 18,4 ms; carga 1,78 s.
    - **Casa de bairro** (jardim): 602 chamadas, p50 12,1 ms / p95 15,8 ms (CPU 8,8 ms, GPU 6,3 ms); tático+noite+8 figuras: 686 chamadas, p50 17,2 ms / p95 22,4 ms; carga 3,31 s.
    - **Igreja Antiga** (desfiladeiro / nave): 933 / 549 chamadas, p50 23,9 / 34,2 ms (CPU 19,5 / 29,1 ms, GPU 16,5 / 27,0 ms); tático+noite+8 figuras: p50 47,2 / 41,0 ms; carga fria 5,24 s (`setDocument` 571 ms, 11 tiles 939 ms, 67 receitas 1 250 ms, `shaderWarmup` 721 ms) vs. quente 2,39 s; com oclusão ligada na 1ª vez a carga salta para 19,86 s pela recompilação de shaders (`makeOccluder`).
    - **Montanha** (subida): 167 chamadas, p50 4,7 ms / p95 9,0 ms (CPU 3,0 ms, GPU 6,8 ms); tático+noite+8 figuras: 252 chamadas, p50 7,8 ms; carga 15,56 s (86 receitas = 3,51 s, 12 tiles = 1,08 s).
    - **Templo gelado** (ravina / salão / biblioteca / visão geral): 2 494 / 2 147 / 1 310 / 1 282 chamadas, p50 55,1 / 50,7 / 34,3 / 39,4 ms (CPU 43,4 / 39,0 / 23,0 / 28,4 ms, GPU 19,5 / 23,7 / 19,1 / 17,3 ms); tático+noite+8 figuras no salão: p50 52,7 ms / p95 64,5 ms; carga fria 16,90 s (`setDocument` 1 215 ms, 18 tiles 2 024 ms, 112 receitas 2 635 ms, `shaderWarmup` 2 963 ms, `firstFrame` 3 913 ms) vs. quente 7,93 s.
    - Perfil de CPU (`profile-frames.js`): `updateMatrixWorld` é a maior função isolada de script (8,3% no salão do templo, 8,7% na igreja); no salão do templo, por quadro (p50/p95): `shareMaterials` 2,6/4,3 ms, `matrixWorld` 2,4/4,2 ms, `boundLights`/`descriptors` 2,1/3,3 ms, `cutawayCasters` 0,8/1,5 ms, `updateCutaway` 0,7/1,0 ms.
- **Em andamento:** Fase 1 (carregamento de cena: 1.1 tiles em worker pool, 1.2 cache persistente IndexedDB, 1.3 upload parcial do atlas, 1.5 `setDocument` fatiado e paredes sem O(W²), 1.6 variante de shader da oclusão, 1.4 geometria das receitas em worker), seguida de Fase 2, Fase 3 e Fase 4.

## Plano de desempenho (24 de outubro) — plano escrito, nada implementado

Pedido: analisar o projeto e planejar melhorias de desempenho, para outro agente implementar. Plano em [docs/PLANO_DESEMPENHO_2026-10-24.md](docs/PLANO_DESEMPENHO_2026-10-24.md): baseline dos recursos recentes na GPU; carregamento (tiles procedurais e geometria das receitas em workers com cache IndexedDB, upload parcial do atlas, `setDocument` fatiado, paredes sem O(W²), variante de shader da oclusão); CPU por frame (matrizes, cutaway, alocações); descarte por cômodo com portais; `DoubleSide` padrão; divisão do bundle e do projetor. Medido em Node: tiles de 130–237 ms cada (~4,5 s no templo), receitas de árvores de 170–365 ms. Nada medido na GPU nesta análise.

## Plano dos tutoriais (24 de outubro) — plano escrito, nada implementado

Pedido: ver quais recursos precisam de tutorial e planejar tutoriais intuitivos, fáceis e úteis. Plano em [docs/PLANO_TUTORIAIS.md](docs/PLANO_TUTORIAIS.md): só 34 das 129 ações da interface aparecem em alguma lição, e a leitura tática inteira, o projetor, o terreno, a paisagem e os andares não têm lição. Propõe três formatos (dica, lição, projeto), cena de treino automática, retorno "quase lá", ajuda em degraus, passos "agora sozinho", "?" nas tarefas, prévia do resultado e sete etapas.

## Câmera ao vivo, sliders e leitura tática (23 de outubro) — concluído

Pedido: os sliders voltavam à posição original durante o tutorial de iluminação; câmera cinematográfica ao vivo (não só tomadas gravadas); implementar o PLANO_TATICO_BG3, cada parte num commit.

**Feito (commits separados)**

- `3aae02a` **Sliders da Ambientação:** com um arraste de mouse real, o navegador solta o ponteiro antes de o slider avisar a mudança; a janela redesenhava no soltar e punha o valor antigo de volta (o novo era gravado, mas a tela e o projetor mostravam o antigo). Agora redesenha depois de gravar. A aba Ambiente (38 sliders) estava correta. Teste com arraste real em `tests/e2e/live-camera.test.js`.
- `781430e` **Câmera ao vivo:** botão **Ao vivo** na barra de câmera e tecla **L**; ligada, a câmera de trabalho ganha peso de cinema (suavidade ≥ 55%) e o projetor a acompanha. Roda com inércia (dolly), **Z/C** orbitam, clique duplo olha um ponto. Ctrl+Z/C continuam de edição.
- `0973e30` **Paredes que se abrem e silhuetas** (`look.rendering.occlusion/silhouettes`, opcionais fora de `RENDERING_DEFAULTS` para não mudar as cenas geradas).
- `59ccead` **Iniciativa** (`sessionState.initiative`): Tomadas → Sessão → Combate, N passa o turno, faixa de retratos no editor e no projetor, anel pulsante, câmera até a vez.
- `5129407` **Trilha de movimento** (`actor.speed`, `layout.grid.diagonal`): metros, quadrados e alcance; corrigido também o deslize de tokens no projetor separado, que nunca acontecia (pastas comparadas por identidade forçavam reconstrução).
- `d605389` **Áreas de efeito** (`sessionState.areas`): círculo, cone, linha e quadrado arrastados no chão, anel em quem tocam.
- `0d6c01a` **Destacar interativos (H)** e **selos de estado** sobre o nome.
- (este commit) **Zoom tático:** Tomadas → Câmera cinematográfica → Inclinar com o zoom.
- Uso: [docs/LEITURA_TATICA.md](docs/LEITURA_TATICA.md), [docs/CINEMATOGRAFIA.md](docs/CINEMATOGRAFIA.md).

**Validação:** 387 testes unitários/de integração na árvore de cada commit (índice extraído e testado isolado, sem as mudanças das outras sessões); E2E novos passam: `live-camera` (3), `occlusion` (pixels), `initiative`, `movement-trail`, `effect-areas`, `highlight`; `camera`, `cinematics` e `shots` repetidos depois da câmera ao vivo. Capturas conferidas: parede aberta e silhueta, área no projetor, contorno dourado e selo FERIDO.

**Pendências reais:** a trilha no editor (arraste com o gizmo) não tem teste automatizado, só o projetor; o contorno de interativos atravessa paredes de propósito, mas modelos muito detalhados geram muitas arestas (limite de 400 linhas); nada foi medido no hardware real. Outras sessões editavam ao mesmo tempo `application.js`, `renderer.js`, `validation.js`, `commands.js` e `styles.css`; cada commit levou só os trechos desta sessão.

## Personagens 2D e planos (23 de outubro) — concluído

Pedido: commit do que foi feito; personagens 2D de verdade; descrever os recursos inspirados no BG3 com plano; plano da integração Ficha ↔ Tabletop; plano de documentos interagíveis (estilo Resident Evil / Enigma do Medo).

**Feito**

- Commit `46e7021` (o restante já estava em `5c6258f` e `2f3312e`): reconciliação que preserva o campo sendo digitado (miniaturas de tomadas apagavam o Desfoque digitado), teste de tutoriais com mais tempo para lições `heavy`, remoção da cópia de diagnóstico.
- **Figuras recortadas** (`src/domain/figures.js`, `src/render/figures.js`, `src/ui/figure-panel.js`): `token.figure` com recorte automático das margens transparentes, giro para a câmera de cada janela, altura, base anel/pedestal/nenhuma, contorno por dilatação da silhueta, luz na borda, estados (ferido, morrendo, inconsciente, morto, enlouquecendo) por shader; material próprio por figura (o compartilhamento de materiais não mistura estados). Tokens novos com retrato nascem como figura. Testes: `tests/figures.test.js`.
- Planos: [PLANO_TATICO_BG3.md](docs/PLANO_TATICO_BG3.md), [PLANO_INTEGRACAO_FICHA.md](docs/PLANO_INTEGRACAO_FICHA.md), [PLANO_DOCUMENTOS_INTERATIVOS.md](docs/PLANO_DOCUMENTOS_INTERATIVOS.md).
- E2E: `repeated-placement` estava instável também antes desta entrega (o clique caía no botão Duplicar do painel ainda fechando na tela estreita); o teste agora espera o ponto ficar livre — 6 de 6 execuções passaram, inclusive o modo Pages, que falhava antes. `panel-consistency` atualizado para o grupo "Câmera".

**Validação:** 381 testes unitários/de integração; builds local e Pages; E2E `actor-hero`, `repeated-placement` (servidor e Pages), `cinematics` e a lição "Dirigir a cena ao vivo" passam. Conferido em capturas: três figuras numa cena de dia (contorno, sombra recortada, morrendo avermelhado, morto deitado, enlouquecendo ondulando) e no Galpão à noite (luz vermelha na figura, luz de borda), e Close enquadrando o rosto com o fundo desfocado. Uma primeira versão tinha um segundo plano de contorno na frente do retrato, que deixava a figura preta; corrigido (o contorno é só o anel, atrás).

**Pendências reais:** remoção de fundo para retratos sem transparência (só o recorte de margens transparentes existe); ícone de condição acima do token (plano BG3, fase 5); nenhuma pessoa avaliou o visual; desempenho das figuras com muitas personagens no hardware real não medido.

## Tutoriais: pastas e "Dirigir a cena ao vivo" (22 de outubro) — concluído

Pedido: adaptar os tutoriais às novidades de câmera e cinematografia e organizá-los em pastas (por exemplo, o galpão numa pasta).

**Feito**

- Pastas na lista de tutoriais (`LESSON_FOLDERS` em `src/tutorial/tutor.js`, `folder` em cada lição): Fundamentos, Luz e câmera, Galpão abandonado. Dentro da pasta o título perde o prefixo ("1 · A casca"); pasta toda concluída fecha.
- Lição nova **Dirigir a cena ao vivo** (pasta Luz e câmera, 25 passos) na Casa de bairro: Ambientação com transição Tarde → Noite, sol baixo, névoa fina escura, névoa iluminada; personagem com lanterna no jardim; Close com desfoque, tomada com foco, Seguir. Condições novas em `conditions.js` e estado novo em `tutorialState()` (janela de documentos e de ambientação, câmera de trabalho, seguir).
- Primeiros passos, Iluminação e ambientação e Galpão 4: textos de explicação apontam para a Ambientação, Close/Lanterna e a lição nova (passos e valores iguais).
- Testes: `tests/tutorials.test.js` (condições novas, pastas; regra de alvos aceita `data-open-example` e `data-ambience*`); `tests/e2e/tutorials.test.js` com o gesto `set` para sliders.

**Validação:** resultado final renderizado e conferido (a primeira versão com névoa 0,04 clara deixava a cena leitosa; trocada por 0,025 azul-escura); a lição passa no E2E do primeiro ao último passo. Para isso, o teste ganhou mais tempo e cliques sem esperar quadros em lições `heavy` (a Casa de bairro à noite leva segundos por quadro no SwiftShader), e a reconciliação dos painéis passou a preservar o campo sendo digitado (as miniaturas das tomadas apagavam o Desfoque digitado: bug real).

## Câmera e cinematografia ao vivo (22 de outubro) — concluído

Pedido: chegar perto do tabletop de Ordem Paranormal (Hexatombe) em câmera e cinematografia — um painel de ambientação com sliders como o "Variáveis da Sessão" mostrado no Revelando Hexatombe, câmera mais fluida e cinematográfica, desfoque de fundo com foco no token, câmera que segue o token e lanterna. Dados 3D ficam para a integração futura com a Ficha. Análise anterior e plano geral: [docs/PLANO_MESA_AO_VIVO.md](docs/PLANO_MESA_AO_VIVO.md).

**Plano desta entrega**

1. **Ambientação ao vivo** — janela flutuante com horários (Dia, Tarde, Noite e ambientes salvos) aplicados com transição de N segundos, e sliders de luz, céu, nuvens, névoa, clima e brilho com trilhos H/S/V. Arrastar mostra a mudança no editor e no projetor sem reconstruir a cena (caminho leve no renderer); soltar grava um passo de desfazer.
2. **Câmera fluida** — curva de transição mais suave, suavidade de navegação ajustável e "Câmera ao vivo": opção explícita, desligada por padrão, em que o projetor acompanha a câmera de trabalho amortecida. Movimentos automáticos na tomada: órbita lenta, aproximação e câmera na mão.
3. **Foco / profundidade de campo** — passe de desfoque que usa a profundidade já desenhada; foco num token ou objeto, com troca de foco suave; guardado na tomada.
4. **Seguir token** — a câmera (de trabalho ou publicada) acompanha um token com suavização; no projetor, o token desliza até a nova posição em vez de pular.
5. **Lanterna** — `token.flashlight`: spot com sombra preso ao personagem, apontando para a frente dele, dentro do orçamento de luzes; liga e desliga pelo cartão do personagem.

**Feito**

- `src/domain/cinematics.js`: contratos opcionais `token.flashlight` e `cameraPresets[].focus/follow/motion` (validados em `validation.js`), `mixLook` (transição entre atmosferas: cores em luz linear, névoa/bloom entram do zero, clima troca com fade, luz principal por slerp), `smootherstep`, `approach` e `closeUpSpots`. Tomadas esquecem alvo de foco/seguir removido (`releaseShotTargets` em `commands.js`).
- `src/render/cinema.js`: foco com troca suave, seguir token, órbita lenta / aproximação / câmera na mão, meta suavizada para a câmera ao vivo do projetor, token que desliza com pequeno pulo no projetor, lanterna como spot no orçamento de luzes (prioridade 30, sombra preferencial), nome do token que some perto da lente.
- `src/render/depth-of-field.js` + `effects.js`: desfoque por profundidade que lê a profundidade já desenhada (sem segundo desenho da cena), 16/32/48 amostras por qualidade. Desenha num alvo próprio e copia: escrever no alvo cuja profundidade é amostrada é um laço de realimentação que o WebGL recusa (quadro preto conforme a paridade dos passes — visto na Casa de bairro).
- `renderer.js`: `setLiveLook` (sliders e transições sem reconstruir a cena; `atmosphere.tune` muda só uniforms), `setFocus/setFollow/setCameraMotion/setCameraGoal/setNavigationSmoothing/pointOf/clearance`; transições com curva quíntica. Retrato do token passou de `MeshBasicMaterial` para material com luz (emissão mínima de 22% para ler no escuro), sombra recortada (`customDepthMaterial`) e alpha-to-coverage.
- Janela **Ambientação ao vivo** (trilho → Ambientação; `src/app/live/ambience.js`, `src/ui/ambience-panel.js`): horários e ambientes salvos com transição de 0–20 s, sliders de luz, céu, nuvens, névoa, clima e halo com trilhos H/S/V; arrastar mostra no editor e no projetor (mensagem `look`), soltar grava um passo de desfazer.
- Tomadas → **Foco, seguir e movimento** e **Câmera ao vivo** (`src/ui/cinema-panel.js`; mensagem `live-camera`, opt-in, desliga ao trocar de cena; foco/seguir de algo "só mestre" não sai para o projetor); suavidade do movimento; cartão do personagem com **Close** (procura um lado com visão livre por raio), **Seguir** e **Lanterna**; seção LANTERNA na aba Luz.
- Docs: [CINEMATOGRAFIA.md](docs/CINEMATOGRAFIA.md) (uso, contratos, limites), [INTEGRACAO_FICHA.md](docs/INTEGRACAO_FICHA.md) (análise da integração com a Ficha, sem implementação), README, CAMERA.md, PLANO_MESA_AO_VIVO.md.
- Testes: `tests/cinematics.test.js` (11) e `tests/e2e/cinematics.test.js` (look ao vivo chega ao projetor antes de gravar, transição com um desfazer, lanterna no orçamento, Close com foco publicado, seguir e soltar com WASD, câmera ao vivo liga/desliga). `shots.test.js` atualizado para o novo grupo "Câmera".

**Validação:** 372 testes unitários/de integração passam (`npm test` + `tests/cinematics.test.js`); builds local e Pages; E2E `cinematics`, `camera`, `shots` e `actor-hero` passam. Conferido em capturas no Galpão e na Casa de bairro (Close com fundo desfocado, lanterna, painel, transição para Noite). Rodada de regressão E2E de 16 arquivos interrompida a pedido: dos 26 casos, 15 passaram e 11 falharam (command-palette, controls, dynamic-lighting pixels, lighting pages, editor, effects-sharpness, céu procedural, névoa/bloom, panel-consistency, repeated-placement pages, tutorial de iluminação). O `dist` foi reconstruído no meio dessa rodada, o que pode ter causado parte das falhas; ainda não foram reexecutadas isoladamente para separar as causadas por esta entrega.

**Pendências reais:** reexecutar isoladamente os 11 E2E que falharam e corrigir os que forem desta entrega (suspeitos: mudança do material do retrato e efeitos/composer); desempenho do desfoque e da câmera ao vivo no notebook/projetor reais não medido (só SwiftShader); durante o arraste/transição a luz refletida das zonas e as janelas noturnas só mudam ao gravar; dados 3D adiados para a integração com a Ficha; retratos ainda são planos fixos (sem girar para a câmera, contorno nem estados — fase 1 do plano geral); nenhuma pessoa avaliou o visual.

## Cor do tema nas configurações e `?` no HUD (20 de outubro) — concluído

Pedido: ver se havia melhoria de UI pendente e permitir trocar a paleta do site, que era só âmbar.

**Feito**

- `src/ui/ui-theme.js`: sete paletas (Tungstênio padrão, Cobre, Rosa, Musgo, Jade, Petróleo, Céu) e cor personalizada; `paletteTokens` deriva destaque, hover e tinta, clareando cores escuras até 7:1 (tinta) e 4,5:1 (sobre os painéis). Preferência em `localStorage` (`tabletop-ui-theme`, com o escopo do diretório), aplicada no `:root` do editor e da janela do projetor e sincronizada entre abas (`storage`).
- Trilho ganhou **Ajustes** (`data-action="settings"`, ícone `gear`) com a janela **Aparência**: amostras, seletor de cor (prévia ao arrastar, grava ao soltar), **Seguir a luz principal da cena** e Restaurar padrão. Ctrl+K encontra "Configurações" e "Cor do tema da interface".
- `--scene-accent`, cartazes, cartela do projetor e o contorno de retrato caem na cor do tema (antes `#e3b878` fixo) e, com "Seguir a luz" desligado, usam só ela.
- Pendência do rework: botão `?` no HUD (`.hud-help`, ao lado do resumo da cena; some no layout compacto, como o Atalhos do trilho).
- Testes: `tests/theme.test.js` (contraste de todas as paletas e de cores extremas, Tungstênio idêntico ao CSS, normalização); E2E novo `tests/e2e/ui-theme.test.js` (troca, botão segue o tema, documento intocado, recarregar, personalizada clareada, restaurar, `?` do HUD).

**Validação:** 355 testes unitários/de integração passam; builds local e Pages; E2E `ui-theme`, `shell`, `command-palette`, `motion` e `panel-consistency` passam. `pages` falha no caso do catálogo (`pages.test.js:41`, espera da contagem de assets) — falha igual no commit anterior, sem estas mudanças; não é desta alteração e não foi corrigida. Capturas conferidas com Céu e Rosa.

**Pendências reais:** com "Seguir a luz" ligado (padrão), cenas de luz quente continuam com claquete e cantoneiras âmbar; a cor do tema não muda o fundo nem o 3D. Nenhuma pessoa avaliou as paletas.

## Interruptores de luz e salas de moradia do templo (20 de outubro) — concluído

Pedido: o templo não tinha quartos, área de refeição nem biblioteca reconhecíveis; todas as luzes devem poder ser desligadas por sala e individualmente, com uma feature geral se necessário.

**Feito — interruptores (feature geral)**

- `src/domain/light-switch.js`: alcance (`switchTargets`: luzes próprias de objetos e luzes avulsas de uma pasta com subpastas, ou por ids; nunca a luz do ambiente), estado (`switchState`: none/on/off/mixed) e `recordLightOn`.
- Comando `lights.switch` (`src/state/commands.js`): `{ groupId | ids, enabled }`, um passo de desfazer, só muda `enabled`; permitido em pastas/objetos bloqueados, como ocultar.
- `src/render/bound-light.js`: luz apagada (ou fora da fase) zera o brilho dos materiais do modelo e esconde os slots `flame`/`fire`; ao acender, restaura. Antes, apagar a fonte deixava o modelo brilhando.
- Árvore de Elementos (`src/app/application.js`, estilos em `styles.css`): lâmpada no cabeçalho de cada pasta com luzes (âmbar/apagada/tracejada) e em cada linha com luz; o clique não seleciona a linha. Mudanças de luz agora redesenham só a árvore, para as lâmpadas acompanharem inspetor e desfazer.
- Testes: `tests/light-switch.test.js`, `tests/light-switch-render.test.js`, `tests/e2e/light-switch.test.js`. Docs: [DYNAMIC_LIGHTING.md](docs/DYNAMIC_LIGHTING.md#acender-e-apagar-luzes-interruptores), EDITOR_UI.md.

**Feito — templo**

- Alojamento virou **Dormitório dos guerreiros** (3 celas + 5 camas, mesa comum, lareira). Novas salas a leste: **Biblioteca** (18 × 16 × 10 m, corredores de estantes, galerias em dois lados ligadas ao mezanino do arquivo, mesa de leitura, púlpito, lustres), **Salão de banquete** (2 mesas longas postas, mesa alta com trono em estrado, lareira grande, lustres), **Cozinha**, **Ala dos quartos** com 3 **quartos de sacerdotes** e a **Câmara do jarl**.
- Todo objeto cujo modelo brilha recebe luz própria (lida dos materiais do modelo no gerador): runas, consoles, engrenagens, cristais, lanternas, e luz de fogo/vela para lareiras, braseiros, caldeirões, lustres e velas. O que já queimou começa apagado (21 objetos). Salas pequenas compartilham zona (15 zonas). Tetos em lajes maiores (200 → 52).
- 838 elementos, 30 câmeras. Revisão das novas vistas no renderizador de apresentação, inclusive banquete e biblioteca acesos × apagados.

**Validação:** 361 testes unitários/de integração; builds local e Pages; 13 E2E (iluminação dinâmica e de autoria nos dois modos, painéis, capas e exemplos nos dois modos, interruptores na árvore, atmosfera) passaram.

**Pendências reais:** desempenho — o editor percorre todos os objetos a cada quadro, mesmo atrás das paredes: a vista do salão leva ~52 ms por quadro (era ~24 ms antes do complexo) e a capa em Abrir ~13 s. Precisa de descarte por sala/oclusão no motor. Com muitas luzes acesas perto, só as mais relevantes iluminam (orçamento 8/16). Zonas não mudam com o interruptor.

## Templo gelado: salas redesenhadas e porta do abismo (20 de outubro) — concluído

Pedido: salas mais desenvolvidas (estavam básicas, pequenas e lineares); o abismo fica como está, com uma porta de pedra com runa nórdica.

**Feito**

- Modelos novos em `library-nordic-depths.js` (352 no total; anteriores idênticos): porta de pedra rúnica (Othala no lintel, Algiz e Tiwaz nas lajes abertas), balaustrada de bronze, estátua de guardião.
- Seção 9 de `scripts/frozen-temple-scene.js` reescrita: circuito em dois níveis (átrio → máquinas → escada de serviço → forja → salão dos ancestrais → caverna → guardiões → átrio; arquivo → alojamento → despensa → caverna), com becos (fenda de cristais, depósito de minério). Níveis dentro das salas: estrado e balcão no átrio, poço com furo no piso na sala de máquinas, mezanino no arquivo, celas com muretas no alojamento, escadaria monumental no salão dos ancestrais, canal com ponte na forja. Caverna como piso em polígono com parede por lado. O abismo ficou nas mesmas coordenadas e sem mudanças; o corredor até ele agora vira para o norte e termina na porta rúnica. 675 elementos, 23 câmeras, 15 zonas, 32 combinações de textura.
- Desempenho: `rebuildSnow` (`src/render/renderer.js`) indexava todos os triângulos da cena para o teste de exposição ao céu sempre que havia neve física, mesmo quando nenhuma cobertura usa "só exposta" (as únicas que consultam o teste). Agora o índice é feito na primeira consulta; resultado igual em todas as cenas. Caixas dentro da montanha e o terreno da montanha ficaram sem neve com espessura. A capa do templo na janela Abrir passou de ~16 s para ~10 s nesta máquina.
- Revisão das vistas no renderizador em modo de apresentação; câmeras que caíam dentro de escadas, estátuas e lanternas foram reposicionadas, a tina da forja trocada por pedra com água escura.
- Testes: `frozen-temple-scene.test.js` atualizado (salas, níveis internos, furo, polígono, duas descidas de 6 m, porta rúnica, sete voltas); `library-reconstruction` (352). O contrato da porta rúnica foi recriado depois de baixar a runa do lintel, e `contracts.json` reordenado como o catálogo.

**Validação:** 355 testes unitários/de integração passaram; builds local e Pages; E2E de capas (servidor, Pages, cache) passaram. O E2E "montanha no servidor" falhou uma vez e passou em duas repetições seguidas nos dois modos. Depois da mudança no renderizador: 355 testes e os 6 E2E de neve (paisagem, inverno orgânico, isolamento da neve sob telhados) passaram.

**Pendências reais:** abrir a cena ainda leva 16–20 s nesta máquina (a medição oscila bastante) e as vistas externas chegam a 42 ms por quadro (o complexo é desenhado atrás das paredes, sem oclusão). O E2E "mountain example loads a private scene" oscila entre servidor e Pages; não foi confirmado se a causa é a capa mais pesada desta cena na janela Abrir.

## Templo gelado: complexo dentro da montanha (20 de outubro) — concluído

Pedido: depois do portão, algo muito maior — várias salas abandonadas, tecnologia "nórdica", pinturas rupestres nas paredes, um trecho que desce para dentro da montanha, e uma sala isolada que leva a um corredor até um abismo gigante com escada em espiral descendo para o escuro. O exterior e o salão (aprovados) não mudaram.

**Feito**

- Kit `scripts/library-nordic-depths.js`, 14 modelos (349 no total; anteriores idênticos): console, engrenagens de parede, coluna condutora, forja rúnica, pedra rúnica, estante de tábuas, círculo no piso, porta-cofre circular, cápsula de estase, lanterna rúnica, uma volta da escada em espiral e três pinturas rupestres (caçada, anel, descida).
- `scripts/frozen-temple-scene.js` reescrito: o santuário de gelo deu lugar a dez cômodos (átrio rúnico com o anel, máquinas, arquivo, alojamento, corredor, galeria rupestre, descida de 6 m com escadaria, forja profunda, sala isolada, corredor do abismo) feitos com Construir → Sala, vãos nas paredes que se tocam, teto de lajes, zona de ambiente por sala; abismo de 33 × 70 m com parede de 24 trechos, sete voltas de escada (56 m), lanternas e veios de cristal cada vez mais fracos e uma luz fria vinda do alto; segundo terreno (montanha) cobrindo o complexo, que encontra a caverna no portão. 401 elementos, 16 câmeras, uma pasta por sala.
- Desempenho: a primeira versão levava 44 s para abrir (125 combinações de textura, uma semente por objeto). Materiais passaram a uma paleta curta (27 combinações): ~12 s; quadros de 9 a 37 ms por câmera nesta máquina.
- `capture-frozen-temple.js` captura também a planta sem a montanha. Revisão em quatro rodadas: escada posicionada pelo centro (estava dentro da forja), lanternas e castiçal afastados das câmeras, salas e abismo mais claros, galeria com as lanternas da expedição junto às pinturas. Na captura do editor o **Ver interior** esconde as paredes da galeria; a revisão final foi feita no renderizador em modo de apresentação.
- Testes: `tests/frozen-temple-scene.test.js` (salas, vãos, escada de 6 m, sete voltas a 8 m, pinturas, luzes quentes só da expedição e da forja, até 16 zonas, paleta de materiais ≤ 32); contagem da biblioteca em `library-reconstruction` (349).

**Validação:** 353 testes unitários/de integração passaram; builds local e Pages; E2E de capas de exemplo (servidor, Pages, cache) e de carregamento de exemplos passaram. Suíte E2E completa não repetida.

**Pendências reais:** abrir a cena leva ~12 s nesta máquina (o dobro do Galpão); as rochas com forma própria e a neve física são o resto do custo. A planta superior exige ocultar a pasta da montanha. A luz que desce pelo centro do abismo quase não aparece nas capturas. Sem tutorial de recriação.

## Templo gelado: cena de exemplo e kit (19 de outubro) — concluído

Pedido: cenário do templo da imagem de referência (salão de pilares, grade levadiça, caixas e barricadas) situado numa caverna de neve, mais realista e no estilo atual. Referência em `docs/references/scenes/templo-gelado.png`.

**Feito**

- Kit `scripts/library-frozen-temple.js`, 9 modelos (335 no total; os 326 anteriores idênticos): pilar escalonado com argola, portal em arco com recesso, grade levadiça em arco, nicho de porta com pilastras, anel rúnico, grade de alçapão, barricada de estacas cruzadas, pingentes de gelo e cristais luminosos. Registrado em `generate-library.js`.
- Cena `scripts/frozen-temple-scene.js` → `public/scenes/templo-gelado.json` (`generate-frozen-temple-scene.js`), 103 elementos, seis câmeras, seis pastas; entrada na galeria (`src/data/example-scenes.js`). Caverna como terreno com paredões orgânicos, salão 14 × 20 × 9 m, santuário de gelo atrás da grade, ravina de entrada; luz principal ciano do anel com sombra das barras, rebatimento frio da neve, dois braseiros quentes, fresta no teto, névoa volumétrica e neve caindo.
- `scripts/capture-frozen-temple.js` (seis câmeras + comparação com a referência), revisado em três rodadas: salão escuro demais → preenchimento e rebatimento; câmera e pilares reposicionados para o enquadramento da referência; pingentes reduzidos; cristais e véu do anel deixaram de estourar; rochas soltas que flutuavam trocadas por paredões enterrados no terreno.
- `tests/frozen-temple-scene.test.js` (conteúdo, luzes, reprodução pelo gerador, cópia independente); contagens de `library-reconstruction` (335) e da galeria (`house-scene`) atualizadas.

**Validação:** 352 testes unitários/de integração passaram; build local e Pages (a cena vai para `dist-pages/scenes/`); E2E de capas de exemplo (servidor e Pages, cache) e de carregamento de exemplos passaram; o caso "montanha no servidor" falhou uma vez por tempo e passou nas repetições seguintes, sem relação com esta cena. Suíte E2E completa não repetida.

**Pendências reais:** sem tutorial de recriação (o gerador já segue a ordem de montagem, como o do galpão). O heightmap não faz teto de caverna: o "teto" da caverna é escuro (sem céu) e o salão tem lajes de pedra. A neve cai também sob o teto (não há colisão de flocos), o que aqui funciona como poeira de gelo.

## Rework cinematográfico da interface (15–16 de outubro)

Plano: [docs/UI_CINEMATIC_PLAN.md](docs/UI_CINEMATIC_PLAN.md). Guia de uso: [docs/EDITOR_UI.md](docs/EDITOR_UI.md#mesa-de-direção-rework-cinematográfico). Sistema visual: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Capturas em `docs/references/ui/cinematic/` (`fase-1` a `fase-4`, `final` a 1600×950 e `final-800` a 800×900).

**Feito (F0–F10, todas as fases)**

- **F0** `src/ui/shell.js` (HTML do editor fora de `application.js`) e `src/ui/theme.css`; `scripts/audit-css-tokens.js` trocou as 316 cores literais de `styles.css` por tokens (0 literais; o teste aceita ≤ 15); os `style=` de cor dos módulos viraram classes/variável.
- **F1** paleta preto-azulada com âmbar, Hanken Grotesk empacotada (URLs relativas: funciona no Pages), serifada nos nomes, etiquetas rasgadas nos títulos de tarefa/abas, escala tipográfica sem nada abaixo de 11 px, foco visível. `tests/theme.test.js` (tamanhos, contraste, cores).
- **F2** trilho + claquete (tipo, nome, TOMADA n, salvamento, copiar link, desfazer/refazer, selo) + palco com ferramentas na vertical, cantoneiras de visor, HUD único e folha de atalhos (`src/ui/shortcuts.js`, conferida contra o `keydown`); `--scene-accent` pela luz principal (`src/ui/scene-accent.js`); selo `ENSAIO` / `● AO VIVO` / `ENSAIO · projetor em outra tomada` / `PRÉVIA DO PROJETOR` (`src/app/view-state.js`); layout compacto (≤ 900 px) com trilho embaixo e folhas.
- **F3** cabeçalho do inspetor (tipo, nome serifado, nível · pasta, ações) e abas Posição/Aparência/Luz/Organização (`src/ui/inspector-tabs.js`, títulos coletados do inspetor de cada tipo nas cenas de exemplo); `revealNode` (tutor, paleta e testes).
- **F4** janela Abrir mais larga com cartazes (`src/ui/posters.js`), tela de início (continuar, exemplos, do zero) e corte de cena em barras.
- **F5** aba **Tomadas**: película com miniaturas (fila ociosa, uma por vez, só com a aba visível), **Ensaiar** (só editor) × **Transição**/**Corte**, carrossel com teclado (setas, Enter, Shift+Enter, 1–9); Ambiente ficou só com Atmosfera; lições apontam para `tab: 'shots'`.
- **F6** projetor: controles agrupados que somem em 2,5 s, cartela de título (mensagem `title` no canal, sanitizada) e barras de cinema 2,39:1; nada disso entra no documento.
- **F7** cartão de personagem (retrato com contorno de luz, filtro SVG na cor da cena) e avatares na árvore.
- **F8** Ctrl+K (`src/ui/command-index.js`, `command-palette.js`): ações, controles da seleção, tarefas (`src/ui/task-definitions.js`), elementos, assets, cenas, tutoriais e "onde fica"; `?` abre os atalhos.
- **F9** barra de ações ao lado do objeto selecionado (some em arraste, ferramentas de desenho, apresentação e tutoriais).
- **F10** `docs/DESIGN_SYSTEM.md`, links `?scene=`, `?scene=&shot=` (só ensaia), `?example=`, `?map=` com o endereço acompanhando a cena e botão de copiar link, `src/ui/ecosystem.js` (vazio).

**Diferenças em relação ao plano** (todas por contrato de teste ou por conta da medição)

1. Clicar na aba ativa do trilho **não** recolhe a gaveta (os testes clicam na aba ativa o tempo todo, via `reveal`): o recolhimento é por **duplo clique** na aba ativa ou pela alça na borda da cena. As alças `sidebar-toggle` e `inspector-toggle` ficam no palco, não dentro dos painéis, porque os testes as clicam com o painel recolhido.
2. Gaveta 288 px e inspetor 320 px (plano: 320 e 340). A meta "cena ≥ 1170×898" do plano não é alcançável com trilho + painéis abertos (1600 − 64 − 288 − 320); medido: **928×898** (antes ~1000×840), e a cena ocupa a largura toda com os painéis recolhidos.
3. Início: os cartazes usam `data-welcome-open` / `data-welcome-example` (e não `data-open*`) para não duplicar seletores que os testes clicam com a janela Abrir aberta. Nos cartazes de Abrir o atributo de abrir fica no botão que envolve imagem e texto, mantendo `[data-open] img` e `.scene-thumbnail`.
4. Miniaturas de tomada em 480×270 (reaproveitam `createScenePreviewRenderer`; o plano dizia 320×180) e geradas só com a aba Tomadas visível, uma por vez e com pausa entre elas, para não competir com a edição (cada miniatura é uma renderização completa da cena). A tela de início não gera prévias com `?diagnostics`.
5. Ação do cabeçalho "enquadrar" é `frame-selection` (já existe `frame` na barra da câmera); a barra de seleção usa `data-bar`, para não duplicar `object-delete`/`object-duplicate`.
6. A animação do foco de campo (`.reveal-flash`) anima `outline-color`, não `opacity`/`transform`; o resto respeita a regra 9.
7. `server/app.js` aceita `TABLETOP_DIST` (só para rodar os E2E contra um build à parte).

**Mudanças de teste além da regra 0.6** (todas explicadas): `controls.test.js` (o ajudante `open` troca de aba do inspetor), `editor.test.js` (cor da luz via `reveal`; a aba muda quando o teste mexe na posição), `tutorials.test.js` (`.first()`: o botão Tutoriais do trilho e o "Fechar" do centro têm o mesmo `data-action`), `house-scene`/`backrooms-scene` (contagem de exemplos 4 → 5: **já falhavam antes** porque a Subida da montanha virou o quinto exemplo; confirmado no commit anterior), `panel-consistency` e `controls.js` como previsto. Lições: o passo "Rotação Y e Cor" das mesas/computadores do galpão virou dois passos (campos em abas diferentes) e os passos de várias posições/luz só avançam com todos os valores (antes avançavam no primeiro, e a aba do inspetor trocava e escondia o campo seguinte); `tutorials.test.js` abre a aba do campo antes de cada gesto; o texto de "Salvar enquadramento atual" e o da visita guiada foram atualizados.

**Validação**: `npm test` 350 passam (322 antes; novos: tema, selo, destaque da cena, abas, cartazes, tomadas, miniaturas, personagem, índice de busca). Sete E2E novos (`shell`, `shots`, `actor-hero`, `command-palette`, `links`, `selection-bar`, `motion`) e a suíte E2E inteira rodada em builds à parte (`TABLETOP_DIST`); últimos resultados: tudo passa, exceto o que está listado em "Pendências". Antes do rework, `assisted-rooms`, `backrooms-scene`, `house-scene` e `church-scene` já falhavam no commit anterior (contagem de exemplos 4 × 5 e esperas); os dois primeiros de contagem foram corrigidos e passam. Testes sensíveis a carga (`repeated-placement`, os tutoriais do galpão encadeados, `material-wear`, `example-scenes`) falharam uma vez com duas suítes em paralelo e passaram isolados. Pages: build com fontes por URL relativa (`./hanken-grotesk-*.woff2`); `document.fonts.check` verificado no E2E `motion`. A barra de seleção só aparece 350 ms depois de uma seleção/clique para nunca ficar sob o próximo clique (`repeated-placement`, `cables` e os tutoriais pegaram isso).

**Pendências reais**: avaliação com uma pessoa; ~~botão `?` no HUD~~ (feito em 20 de outubro); o benchmark `scripts/benchmark-editor-performance.js` não foi repetido nesta máquina (SwiftShader, sem GPU: não mede FPS real); as dicas de "onde fica" foram conferidas pelos títulos de seção, só "rejunte" tem E2E; hierarquia de seções do inspetor para luzes pontuais/spot e tokens foi deduzida do código, não de uma cena com esses tipos.

## Tutoriais: iluminação e o galpão passo a passo (15 de outubro)

**Feito**

- Primeira versão revisada a pedido do usuário (luz sem coerência nem profundidade; galpão sem indicação de onde pôr as peças e muito diferente do exemplo). Agora: lição **Iluminação e ambientação** (48 passos, capela à noite pela receita das cenas de exemplo) e **Galpão abandonado** em três partes encadeadas (39 + 57 + 27 passos) com os valores do exemplo. Detalhes em [docs/TUTORIAL_PLAN.md](docs/TUTORIAL_PLAN.md).
- Motor: ponto pulsando na cena onde clicar; etapas no cartão; lições que continuam outra (`continues`), com aviso na lista; condições de valor exato (`has`, `lookIs`, `moonIs`), peça selecionada, apoio ativo, origem do material copiado.
- Editor: clique no tampo de mesa/altar coloca em cima (`src/render/renderer.js`, `supportPoint`); luz de janela nasce no vidro apontada para dentro (`illuminationDefaults` + `windowInward`).
- E2E genérico: `select`, `click` com seletor, vários gestos por passo e lições encadeadas.

**Validação**: unitários 321 passam (novo: luz de janela apontada para dentro). E2E `tutorials` percorre as seis lições do primeiro ao último passo; as partes 2 e 3 do galpão rodam encadeadas desde a parte 1 (a 3 leva ~40 min no Chromium por software; o limite por passo subiu para 25 s). O resultado da lição do galpão foi renderizado da câmera Olhos e comparado com a cena de exemplo: mesmas paredes, piso molhado com reflexo vermelho, letreiro, terminal e fluorescente no quadro; faltam as repetições opcionais (tubos, eletrocalhas, faixa alta, mais cabos). A capela da lição de luz foi conferida da altura dos olhos. Nenhuma pessoa seguiu as versões novas ainda.

**Revisão 3 (22 de outubro)**: passos com uma ação e condição completa (o E2E falha se um passo terminar antes da última ação); posicionamento com G/R/V até o ponto marcado, com tolerância; cores pelo seletor, aceitando a mesma família de cor; tutor abre o painel recolhido; galpão em quatro partes, sem listas de coordenadas, laje única esticada para cobrir o galpão. Validação: unitários 361; E2E `tutorials` com as sete lições do primeiro ao último passo (as partes do galpão encadeadas desde a parte 1), sem passo que se complete antes da última ação e sem passos já cumpridos pelo padrão. Ninguém seguiu esta versão ainda. Detalhes em [docs/TUTORIAL_PLAN.md](docs/TUTORIAL_PLAN.md).

**Revisão 2 (mesmo dia)**: caixa de código hexadecimal ao lado de toda cor; o cartão do tutor não cobre mais os outros campos de um passo (o anel envolve todos). Unitários 322; as duas lições conferidas em capturas nos passos apontados pelo usuário.

**Pendências reais**: avaliação com uma pessoa; lições de recriar Igreja Antiga, Backrooms e Casa de bairro.

## Galpão industrial mais alto e mais cheio (14 de outubro)

**Feito**

- Pé-direito de 9 m. Mezanino de 4,2 m ao longo da parede esquerda (piso como plataforma, escada de 22 degraus, guarda-corpo e pilares), com caixa-d'água, tambores e caixa em cima; tubulação nas paredes em 3, 4,2 e 6,2 m; duto e eletrocalhas descidos para dar camadas de altura; armários, quadros elétricos, gerador, cilindros, caixas empilhadas, palete e carrinho; um fluorescente fraco sob o mezanino.
- A grade do editor vem escondida na cena (as linhas brancas de 1 m sobre o piso eram a grade, não a textura).
- Escada e mezanino em pintura sobre ferrugem (a chapa xadrez faiscava em blocos com a luz); relevo das paredes menor; bloom e risco mais contidos; névoa menos iluminada.

**Validação**: unitários 320; captura por software (`eye.png`, `screen-2m.png`) conferida.

## Galpão industrial refeito para ficar perto da referência (14 de outubro)

**Feito**

- `scripts/industrial-scene.js` reescrito em 13 etapas na ordem de montagem no editor (base do tutorial futuro): pé-direito de 6,5 m com colunas e prumadas esticadas; paredes de concreto escuro com sujeira; piso de pedra escura molhado; terminal de computador virado para a câmera; faixas de alerta em três paredes e em duas alturas; letreiro sobre o portão; cabos que cairiam na bancada retirados; luz de noite com dois fluorescentes e o vermelho do portão; bloom e risco contidos; câmera **Olhos** no enquadramento da referência.
- Brilho menor de toda tela (emissão 1,15; perfil Tela / monitor com intensidade 4 e luz a 50 cm do vidro) e risco de lente com metade da força.
- A frente da tela agora é achada por raios (o lado aberto), não pelas caixas: no terminal de computador o teclado à frente fazia a tela "olhar" para trás.
- Corrigido: mudar a luz principal numa cena com decalques ou objetos fixos travava (`environment.key.update` mexia num documento já congelado).

**Validação**

- Unitários: 320 passam (novo: luz principal com decalques colados).
- Conferência em imagem por software: `eye.png`, `screen-2m.png` e a comparação lado a lado regravada em `docs/references/scenes/galpao-industrial-comparacao.png`.

**Pendências reais**: o monitor fica menor que o da referência; não há chuvisco sob o texto; vegetação e sujeira em primeiro plano são poucas.

## Resíduos do item 3, itens 4 a 7 do galpão (14 de outubro)

**Feito**

- **Cabos:** sombra só na qualidade alta; a ferramenta **Cabo** aceita clique em viga, duto, topo de objeto, parede e teto, além do chão; **Cabos no teto** entra nos estados Abandonado e Futurista do assistente (e Arrumado os retira).
- **Piso molhado** (`src/domain/wetness.js`, `src/render/wetness.js`): campo `material.wet` em qualquer superfície, painel **Molhado**; escurece, baixa a rugosidade e junta poças planas.
- **Reflexos de superfície** (`src/render/screen-reflections.js`, `src/render/effects.js`): passo de tela em meia resolução que reflete a imagem nas superfícies molhadas, antes da névoa e do bloom; só em equilibrada e alta.
- **Risco de lente** (`src/render/anamorphic.js`): `bloom.streak` e `streakLength`, saído do high-pass do bloom.
- **Faíscas e gotejamento** (`src/domain/local-effects.js`, `src/render/local-effects.js`): rajadas irregulares com clarão de luz, gotas que pendem, caem e somem no piso; botões **Faíscas** e **Goteira**.
- **Cena pronta e tutorial:** `scripts/industrial-scene.js` monta o galpão só com comandos do editor; cena de exemplo **Galpão industrial** (101 elementos, 5 câmeras), modelo novo de laje de cobertura (326 modelos) e lição **Galpão industrial** com condições novas em `src/tutorial/conditions.js`.
- Comparação com a referência em `docs/references/scenes/galpao-industrial-comparacao.png` e seção nova em `docs/GALPAO_INDUSTRIAL_ANALISE.md`.

**Validação**

- Unitários: 319 passam (novos: `wetness`, `local-effects`, `industrial-scene`, estados do cômodo com cabos; os da biblioteca passam a 326 modelos e os exemplos gerados foram regerados).
- E2E novo `wet-effects`: piso molhado, reflexos e risco ligados pela interface, sombra de cabos por qualidade, clarão das faíscas, goteira e pausa, salvar e reabrir, sem erros de página. A lição **Galpão industrial** passa inteira em `tutorials`.
- E2E rodados e passando (51 casos): `tutorials` (3 lições), `wet-effects`, `screens-decals`, `cables`, `assisted-rooms`, `materials-effects`, `environments`, `dynamic-lighting`, `effects-sharpness`, `example-previews`, `panel-consistency`, `editor-ui`, `asset-library`, `lighting`, `material-sharing`, `performance`, `pages` (depois de refazer `dist-pages`). Os demais não foram repetidos.
- Conferência em imagem (software, 1200 × 740): `gate.png` mostra o risco horizontal na luz vermelha, o ladrilho molhado com o reflexo vermelho e a cobertura; `wet-only.png` mostra a cena aceitável só com o degrau de umidade; sonda de cintilação de decalques de novo com 0 pixels errados em 62 317.

**Encontrado na validação**

- O passo de reflexos limpava o quadro ao somar o reflexo (tela preta e sem profundidade para a névoa); agora soma sem limpar.
- Os exemplos gerados (Backrooms e estudos de iluminação) carregavam os padrões de renderização antigos e foram regerados.
- A porta e as paredes tapam objetos na vista de perspectiva padrão; o E2E clica em objetos pela vista superior.

**Pendências reais**: nenhuma medida de FPS numa GPU (o ambiente aqui é por software); o reflexo só vê o que está na imagem; as pontas de cabo não ficam ancoradas ao que foram coladas; o tutorial é longo (cerca de 30 passos); a cena de exemplo é mais clara que a referência.

## Tela com conteúdo, decalques e listras de alerta — itens 1 e 2 do galpão (14 de outubro)

**Feito**

- **Tela com conteúdo** (`src/domain/screens.js`, `src/render/screens.js`, `src/ui/screen-panel.js`): campo opcional `screen` em qualquer modelo com o material `screen`. Texto de até 6 linhas, barra de progresso, imagem da biblioteca ou chuvisco, desenhados num canvas de 512 × 384 px (256 × 192 por software) usado como mapa de emissão, com shader de tubo (curvatura, linhas, ruído, vinheta, cintilação). Canvas compartilhado por conteúdo igual, redesenho a no máximo 10 por segundo, tudo função do tempo dos efeitos (a pausa congela). Acender a tela liga o perfil de luz **Tela / monitor**, sem sombra, com a cor média do conteúdo.
- **Decalques** (`src/domain/decals.js`, `src/render/decals.js`, `src/ui/decal-panel.js`): modelo `builtin-decal` e campo `decal` (texto em canvas, imagem ou faixa de material; tamanho, opacidade, desgaste apagado e riscado). Colado por clique em parede, piso ou objeto (ferramenta nova, botão **Decalque** em Peças avulsas e o modelo na biblioteca) com o socket novo `surface` de `anchor`: acompanha o suporte, some com ele e é duplicado com ele. Mover desliza no plano; Rotacionar e **Giro no plano** giram na normal. Plano 2 mm acima da face, deslocamento de polígono (-1, -4), sem escrever profundidade; some junto com a parede em "Ver interior".
- **Material Listras de alerta** (`hazard`): ângulo, largura de cada listra, duas cores e desgaste; vale em parede, piso, modelo e decalque. O modelo "Faixa de alerta de parede" passou a usá-lo.
- `imageRef` (imagem de tela e de decalque) entra nas verificações de asset do servidor, do navegador e da apresentação.
- `scripts/capture-industrial.js` agora põe a tela no monitor, o letreiro, a marca na carcaça e as faixas de alerta; captura o monitor a 2 m e uma sonda de cintilação dos decalques.
- Documentado em [docs/ASSET_LIBRARY.md](docs/ASSET_LIBRARY.md); andamento e diferenças em [docs/GALPAO_INDUSTRIAL_PLANO.md](docs/GALPAO_INDUSTRIAL_PLANO.md).

**Validação**

- Unitários: 311 passam (21 novos: `screens` 9, `decals` 10, mais `surface-families` e `server`; o da biblioteca passou a 325 modelos).
- E2E novo `screens-decals`: clique do decalque na parede do fundo e na carcaça do monitor, edição, faixa de material, parede e decalque com o material, mover a parede e o monitor, desfazer, tela com imagem da biblioteca, pausa congela, salvar, reabrir e apresentar, sem erros de página.
- E2E rodados e passando (38 casos): `screens-decals`, `cables`, `assisted-rooms`, `asset-library`, `environments`, `materials-effects`, `material-sharing`, `material-transfer`, `material-wear`, `dynamic-lighting`, `panel-consistency`, `editor-ui`, `editor`, `performance`, `tutorials`, `pages` (depois de refazer `dist-pages`), `controls`, `lighting`. Os demais não foram repetidos.
- Conferência em imagem (rasterizador por software, 1200 × 740): `screen-2m.png` mostra "BOOTING.", "SYS 4" e a barra legíveis a 2 m, com a mesa iluminada de verde; `eye.png` mostra letreiro, faixas de alerta em duas paredes e a marca "NS-04". Sonda de cintilação: 62 317 pixels dentro de painéis opacos de decalque, em duas vistas com 0,5° de diferença, e 0 fora da cor do painel.

**Encontrado na validação**

- Editar só o efeito de tubo recriava o canvas e zerava o desenho; o canvas agora é mantido durante o novo vínculo.
- Na câmera de perspectiva padrão a porta da sala tapava o monitor e o clique do decalque (corretamente) recusava a porta como suporte; o E2E usa a vista de topo para esse clique.
- A grade encaixa a parede onde ela cai, então "mover a parede 1 m" move menos; o E2E compara o decalque com o deslocamento real da parede.
- O vidro da tela com brilho alto refletia a luz própria como um clarão sobre o texto; ficou mais fosco (rugosidade 0,55).
- Ao trocar a faixa de alerta por uma placa com o material, o volume dela teve de continuar o do contrato da biblioteca (0,016 m de espessura).

**Pendências reais**: a conferência foi feita por software, não numa GPU; as bordas chanfradas da tela emitem um pouco (1 a 2 cm); decalque em superfície curva continua fora; pisos molhados, brilho de lente, faíscas e a cena pronta seguem por fazer (itens 4 a 7).

## Kit industrial e cabos pendentes — concluídos (13 de outubro)

**Feito**

- 22 modelos em `scripts/library-industrial.js` mais o modelo de cabos (324 no total): tubos e conexões, duto, suportes, eletrocalha, coluna, portão, faixa de alerta, luz de aviso, luminária fluorescente, mesa e estante de aço, entulho, papéis, mato e trepadeira.
- Cabos pendentes (`src/domain/cables.js`): objeto com campo `cable`, desenhado no renderizador a partir dos ajustes; validação; painel **Cabo** em Propriedades (`src/ui/cable-panel.js`).
- Três entradas: ferramenta **Cabo** de dois cliques em Peças avulsas, o modelo na biblioteca e **Cabos no teto** no assistente de cômodo (`proposeRoomCables` em `src/authoring/room-ambience.js`).
- `scripts/capture-industrial.js` monta um galpão com o kit e captura de fora e da altura dos olhos.
- Documentado em [docs/ASSET_LIBRARY.md](docs/ASSET_LIBRARY.md); andamento em [docs/GALPAO_INDUSTRIAL_PLANO.md](docs/GALPAO_INDUSTRIAL_PLANO.md).

**Validação**

- Unitários: 290 passam (3 novos de cabos; o da biblioteca passou a 324 modelos).
- E2E novo `cables`: dois cliques, edição no painel, desfazer, colocação pela biblioteca, cabos do assistente e salvar.
- Conferência em imagem: folhas dos 22 modelos e o galpão de demonstração na GPU.
- E2E rodados e passando (21 casos): `cables`, `asset-library`, `assisted-rooms`, `editor-ui`, `panel-consistency`, `pages`, `controls`, `performance`, `tutorials`. Os demais não foram repetidos.

**Encontrado na validação**

- O entulho saiu primeiro como pedras arredondadas; refeito como pedaços de laje. A ferrugem dos tubos estava laranja demais; pintura escurecida e menos lascas.
- Regravar `slots.json` à mão mudou a formatação do arquivo inteiro; restaurado do repositório.

**Pendências reais**: o galpão de demonstração não tem teto; as pontas do cabo não encaixam em vigas nem em objetos; sombra de cabos em todas as qualidades; tela com conteúdo, decalques e piso molhado continuam por fazer.

## Correções vistas no tutorial e plano técnico do galpão (13 de outubro)

**Feito**

- **Gramado sumindo no fundo:** o plano de fundo do editor ficava a 2,5 cm abaixo de zero e o terreno do entorno a 4 cm; o gramado e a rua afundavam nele. O plano de fundo agora fica sempre abaixo de qualquer piso (`src/render/renderer.js`).
- **Construção vizinha:** o entorno passa a ler outras construções próximas. A que está ao lado ou atrás entra inteira no terreno, com muro e plantas contornando; a que está na frente da porta faz o quintal parar antes dela e a rua não é criada, com aviso (`src/authoring/surroundings.js`).
- **Prédio novo:** quando a entrada daria para o que já existe na cena, o prédio vai para o outro lado.
- **Telhado:** as empenas do modelo preenchem todo o vão sob as telhas; o prédio assenta o telhado para as telhas tocarem o topo das paredes laterais e as empenas ficarem sobre as paredes das pontas, em qualquer tamanho (`scripts/library-residential.js`, `src/authoring/building.js`).
- **Grama:** textura refeita (folhas em duas direções, sem manchas grandes por ladrilho) e variação em coordenadas de mundo no shader, para não repetir de metro em metro. Vale para todo gramado, inclusive terrenos pintados.
- Último passo da lição Construção assistida aponta como refinar gramado e muros em Propriedades.
- Plano técnico da cena do galpão em [docs/GALPAO_INDUSTRIAL_PLANO.md](docs/GALPAO_INDUSTRIAL_PLANO.md).

**Validação**

- Unitários: 287 passam (1 novo sobre construções vizinhas; o do telhado passou a medir o encaixe).
- Conferência em imagem na GPU: casa com entorno e a cena final do tutorial.
- E2E rodados e passando: `assisted-rooms` (6), `house-scene`, `example-scenes`, `terrain-paint`, `materials-effects`, `tutorials`. Na bateria, a lição Primeiros passos falhou uma vez no clique de colocar a mesa (a janela de Assets ainda fechava sobre o ponto); o teste passou a esperar o ponto livre e passou três vezes seguidas. Os demais E2E não foram repetidos.

**Pendências reais**: a variação larga da grama é discreta; a rua deixa de existir quando há construção na frente, sem alternativa de contorno; o galpão continua não construído.

## Tutorial "Primeiros passos" e análise do galpão — concluídos (13 de outubro)

**Feito**

- Lição **Primeiros passos** (29 passos) em `src/tutorial/lessons.js`: regiões da tela, prévia e confirmação, câmera, Assets, seleção, Propriedades, ferramentas, desfazer/refazer, Elementos, Ambiente, token, enquadramento, Apresentar e Salvar.
- Condições novas em `src/tutorial/conditions.js` (seleção, ferramenta, vista, desfazer, ambiente, tokens, câmeras, apresentação, salvo) e o estado correspondente em `tutorialState`.
- Análise da cena de referência do galpão industrial em [docs/GALPAO_INDUSTRIAL_ANALISE.md](docs/GALPAO_INDUSTRIAL_ANALISE.md): o que já dá para fazer, o que falta de modelos e de técnica, e a ordem sugerida.

**Validação**

- Unitários: 286 passam.
- E2E `tutorials`: as duas lições percorridas do primeiro ao último passo. Um passo da lição nova passa sozinho (a mesa já aparece na biblioteca antes da busca).
- Conferência visual de 10 passos da lição nova, incluindo o modo Apresentar.

**Pendências reais**: a cena do galpão não foi construída; depende de modelos e recursos listados na análise. Os demais E2E não foram repetidos.

## Tutorial, primeira lição — concluída (13 de outubro)

**Feito**

- Motor de tutorial (`src/tutorial/`): lições como dados, alvo por identificador da interface, passo concluído por condição sobre o estado. Botão **Tutoriais** na barra superior com a lista de lições e progresso salvo no navegador.
- Lição **Construção assistida**, 26 passos, da sala vazia à casa mobiliada com entorno.
- O convite da cena vazia sai da frente enquanto uma lição roda; em alvos do tamanho da cena o cartão vai para a borda direita.
- Andamento e decisões em [docs/TUTORIAL_PLAN.md](docs/TUTORIAL_PLAN.md).

**Validação**

- Unitários: 286 passam (2 novos).
- E2E rodados e passando: `tutorials` (a lição inteira, do primeiro ao último passo), `assisted-rooms` (6), `editor-ui`, `panel-consistency`, `controls`. Os demais não foram repetidos.
- Conferência visual da lista e de 11 passos no editor real.

**Encontrado na validação**

- O botão novo estourava a barra superior em 390 px; nessa largura ele mostra só o ícone.
- O passo de confirmar a sala dizia "Aceitar proposta", mas o botão se chama "Criar sala"; os passos de confirmação passaram a apontar o botão destacado.
- Aba Construir e tarefa Sala já abrem prontas numa cena nova, então os passos 2 e 3 passam sozinhos.

**Pendências reais**: etapas 3 a 5 do plano; lições de recriar cenas prontas (aguardam as duas cenas); a lição pede cena vazia apenas por aviso; a bateria E2E completa não foi rodada.

## Biblioteca e época futurista — concluídas (13 de outubro)

**Feito**

- 30 modelos em `scripts/library-future.js`, registrados em `generate-library.js` com a época `Futurista`; contratos e slots novos em `scripts/library-source/`.
- Época Futurista em `src/domain/room-eras.js`; cinco receitas (ponte de comando, alojamento, enfermaria da base, sala do reator, compartimento de carga); prédio Base; luz fria com painéis de teto do kit; paredes pintadas, piso de placas, portas de metal, sem cortinas nem telhado de telhas; entorno com barreira de energia, postes, veículo flutuante, torreta, antena e painéis solares.
- Documentado em [docs/ASSET_LIBRARY.md](docs/ASSET_LIBRARY.md) e [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**

- Unitários: 284 passam (2 novos; o teste da biblioteca passou a 301 modelos). Nenhum arquivo dos modelos anteriores mudou.
- E2E rodados e passando: `asset-library`, `assisted-rooms` (6 casos), `pages`. Os demais não foram repetidos.
- Conferência visual das duas folhas de modelos e de uma base, por dentro e com entorno, no editor real.

**Encontrado na validação**

- O contêiner tinha faces coincidentes que cintilavam; corrigido, o que exigiu recriar o contrato dele e reordenar `contracts.json`.
- As receitas futuristas entravam nas épocas Antiga e Medieval com peças futuristas; a época do modelo passou a ser filtrada também nesse sentido.
- A primeira base saiu com portas de madeira, cortinas e telhado de telhas; corrigido (portas de metal, sem cortinas, sem telhado).

**Pendências reais**: a base não tem cobertura própria; sem escotilhas, portas de correr ou peças de casco para nave; capela e sala de ritual ficam só com o que é atemporal nessa época.

## Biblioteca e época medieval — concluídas (13 de outubro)

**Feito**

- 27 modelos em `scripts/library-medieval.js`, registrados em `generate-library.js` com a época `Medieval`; contratos e slots novos em `scripts/library-source/`. O gerador passou a criar o contrato de um modelo na primeira vez que o vê.
- Época Medieval em `src/domain/room-eras.js` (`beforeElectricity` substitui as comparações com a época antiga em luz, prédio e entorno); quatro receitas (taverna, sala do trono, ferraria, arsenal); dois tipos de prédio (taverna, fortaleza) que trazem a própria época; fontes de chama do kit na luz; paliçada, placa, barraca ou pelourinho e boneco de treino no entorno.
- Documentado em [docs/ASSET_LIBRARY.md](docs/ASSET_LIBRARY.md) e [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**

- Unitários: 282 passam (2 novos; o teste da biblioteca passou de 244 para 271 modelos). Os 244 modelos anteriores não mudaram: nenhum arquivo deles foi alterado pela regeneração.
- E2E rodados e passando: `asset-library`, `assisted-rooms` (6 casos), `church-kit`, `pages`. Os demais não foram repetidos.
- Conferência visual das duas folhas de modelos e de uma taverna com entorno e uma fortaleza no editor real.

**Encontrado na validação**

- A forja passava do limite de oito lotes por modelo (nove materiais); reduzida para sete.
- O caso de ponta a ponta "completar o que existe" falhou uma vez por tempo com renderização por software, pelo mesmo motivo do caso do entorno; passou a erguer a casa sem luz e sem telhado e ficou estável em duas execuções (cerca de 50 s).

**Pendências reais**: sem modelos futuristas; sem muralha, torre, portão ou telhado de palha; sem pessoas nem animais; laboratório, monitoramento, mercado e enfermaria ficam ralos na época medieval.

## Construção assistida — etapa 6, terreno e entorno, concluída (13 de outubro)

**Feito**: `src/authoring/surroundings.js` (`proposeSurroundings`, `inferSetting`, cinco entornos), tarefa *Entorno do prédio* em Construir → Paisagem com prévia que acompanha o painel; pisos do entorno ignorados pela leitura do prédio; correção do "cômodo atual" ao aceitar propostas; `scripts/capture-building.js` aceita `tipo@entorno`. Detalhes e limites em [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**: 280 unitários passam (4 novos em `tests/surroundings.test.js`). E2E: `assisted-rooms` (6 casos), `editor-ui` e `terrain-paint` passam; os demais não foram repetidos. Conferência visual de casa urbana, igreja com cemitério e casa antiga rural. Medido na placa de vídeo real: 60 quadros por segundo com casa e entorno, 0,8 s para aceitar o entorno.

**Encontrado na validação**

- O caso de ponta a ponta do entorno estourava o tempo com renderização por software: uma casa iluminada mais o quintal cai para cerca de 1 quadro por segundo nesse modo. O teste passou a erguer a casa sem luz e sem telhado (45 s, estável em duas execuções). Na placa de vídeo o problema não existe, mas vale como aviso para máquinas sem aceleração.
- A contagem de "objetos que você tinha do lado de fora" incluía telhado, luminárias de teto e peças de parede; corrigido.

**Pendências reais**: terreno plano (não esculpível); um prédio por vez, sem quarteirão; rua só em frente ao lote; lote sempre retangular; entorno não se ajusta sozinho quando o prédio é ampliado; portão é só um vão. Próxima: etapa 7 (cena pronta).

## Objetos de teto ocultos com os telhados (12 de outubro)

**Feito**: com os telhados ocultos, luminárias e outros objetos de teto somem e a luz deles continua (`hangsFromCeiling` em `renderer.js`).

**Validação**: 276 unitários passam; E2E `house-scene`, `dynamic-lighting` e `backrooms-scene` passam; conferência visual numa casa à noite. Sem teste automático específico.

## Encaixar cômodo por dentro de um prédio existente (12 de outubro)

Motivo: o usuário esperava que acrescentar um cômodo adaptasse o interior; isso não existia para prédio construído, só ampliar para fora.

**Feito**: `proposeRedivide` (mesmo contorno, interior dividido de novo, cômodos mantidos no lugar e na ordem), como ação principal do modo *Mudar um prédio* e do botão *Criar …* do assistente, com queda automática para ampliar quando não cabe; `roomKind` pela receita; largura mínima por tipo de cômodo.

**Validação**: 276 unitários passam (1 novo). E2E `assisted-rooms` (5 casos, o quarto estendido) e `phase3` passam; os demais não foram repetidos. Conferência numérica das posições antes e depois; a conferência visual pegou dois defeitos corrigidos nesta mesma mudança (cômodos trocando de lado e mobília de um tipo ficando em cômodo de outro).

**Pendências reais**: só prédios retangulares; não se escolhe a posição do cômodo novo no prédio pronto; arrastar cômodo para posição livre e redimensionar continuam em aberto.

## Painel Prédio — qualidade de uso (12 de outubro)

**Feito**: dois modos com uma planta cada (*Novo prédio* / *Ampliar um prédio*), seguindo a seleção; arrastar troca, clicar seleciona, Delete remove da planta; `proposeRemoveRoom` para tirar um cômodo de um prédio sem abrir os vizinhos, usado quando se exclui o piso de um cômodo.

**Validação**: 275 unitários passam (1 novo). E2E `assisted-rooms` (5 casos, atualizados) passa; os demais arquivos não foram repetidos depois desta mudança. Captura dos dois modos conferida.

**Pendências reais**: itens de qualidade de uso ainda em aberto: arrastar um cômodo para uma posição livre da planta, redimensionar cômodos, e prévia durante o arraste do contorno.

## Construção assistida — correções após o uso (12 de outubro)

**Feito**: corrigido o desenho de sala/contorno, que só funcionava sobre o piso ativo (`supportPoint` no plano de trabalho em `renderer.js`); arrastar e soltar para trocar cômodos na planta; *Ampliar o contorno* abre a prévia.

**Validação**: 274 unitários passam. E2E rodados e passando: `assisted-rooms` (5 casos; o do contorno desenhado agora cobre chão livre com outro piso ativo, arraste na planta e prévia ao ampliar), `assemblies`, `editor`, `phase3`. A bateria completa não foi repetida.

## Construção assistida — ajustes após uso, concluídos (11 de outubro)

**Feito**: botão *Telhados* com ocultação automática na vista superior (`setRoofsHidden` no renderer); planta clicável para trocar cômodos e, no prédio construído, selecionar o piso; lugares numerados para o cômodo novo (`addRoomSpots`); *Ampliar o contorno* quando a lista não cabe (`outlineThatFits`); épocas em `src/domain/room-eras.js` aplicadas a mobília, estados, luz e prédio. Detalhes e limites em [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**: 274 unitários passam (2 novos em `tests/room-eras.test.js`). E2E rodados e passando: `assisted-rooms` (5 casos, estendidos), `camera`, `editor-ui`, `editor`, `house-scene`, `panel-consistency`, `phase3`, `terrain-paint`; a bateria completa não foi repetida. Conferência visual de casa e bar na época antiga à noite.

**Pendências reais**: a biblioteca não tem modelos futuristas nem mobília propriamente medieval (trabalho de modelagem); troca de cômodos só dentro do esquema entrada + corredor; lugares do cômodo novo limitados aos que o assistente propõe.

## Tutorial — plano entregue (11 de outubro)

Plano em [docs/TUTORIAL_PLAN.md](docs/TUTORIAL_PLAN.md): lições como dados, alvos pelos identificadores da interface, avanço por condição sobre o estado da cena, um motor único e um teste genérico que executa todas as lições para que não envelheçam. Cinco etapas e oito lições previstas. Nada implementado ainda.

## Construção assistida — programa da pessoa e contorno na cena, concluído (11 de outubro)

**Feito**: lista de cômodos e cômodo de entrada editáveis (`planBuilding` com `custom`), planta em escala no painel, *Desenhar o contorno na cena* reaproveitando a ferramenta de desenhar sala, prévia que acompanha o painel. Detalhes e limites em [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**: 272 unitários passam (1 novo). E2E rodados e passando: `assisted-rooms` (5 casos, um deles com a verificação de texto atualizada para a lista de cômodos), `editor-ui`, `editor`, `panel-consistency`, `phase3`, `terrain-paint`; a bateria completa não foi repetida. Captura do painel com prévia aberta conferida.

**Pendências reais**: contorno desenhado só alinhado aos eixos; prévia só ao soltar o arraste; tamanho e vizinhança de cada cômodo não são escolhidos pela pessoa.

## Construção assistida — completar o que já está construído, concluído (11 de outubro)

Motivo: o usuário apontou que "Prédio" parecia presets e perguntou se dava para incluir em algo já construído; não dava.

**Feito**: `proposeBuilding` reescrito para trabalhar sobre o que existe no contorno (paredes mantidas e completadas, porta existente como entrada, planta escolhida pelos móveis, objetos passam ao cômodo onde estão); `proposeAddRoom`; passos de preparação `rehoming` em `proposal.accept`; botões *Criar* na leitura do prédio e grupo *Acrescentar cômodo* no painel. Detalhes e limites em [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**: 271 unitários passam (2 novos). E2E rodados e passando: `assisted-rooms` (4 casos), `assemblies`, `editor-ui`, `editor`, `panel-consistency`, `phase3`, `structural-evolution`, `terrain-paint`; a bateria completa não foi repetida. Conferência visual no editor real de uma casca com quatro móveis completada e com garagem acrescentada.

**Pendências reais**: itens 3 e 4 combinados com o usuário (escolher o programa de cômodos; posicionar o contorno direto na cena) não iniciados; cômodos existentes dentro do contorno não entram na planta; orientação dos móveis não pesa na escolha.

## Construção assistida — etapa 5, prédio a partir do contorno, concluída (11 de outubro)

**Feito**: `src/authoring/building.js` (`planBuilding`, `proposeBuilding`, `describeBuilding`, sete programas de prédio); tarefa *Prédio* no painel Construir; leitura do prédio no Assistente de cômodo; limites de fontes e luminárias em `proposeRoomLighting`; `scripts/capture-building.js`. Detalhes e limites em [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**: 269 unitários passam (5 novos em `tests/building.test.js`). E2E rodados e passando: `assisted-rooms` (3 casos), `controls`, `editor-ui`, `editor`, `panel-consistency`, `phase3`, `structural-evolution`, `terrain-paint`; a bateria completa não foi repetida. Conferência visual de uma casa e uma delegacia de 16 × 9 m no editor real; os outros cinco tipos só passaram pelos testes.

**Pendências reais**: só contorno retangular e um pavimento; contorno precisa estar vazio; uma única família de planta; telhado esticado; dependência de autoria → estado em `building.js`; cômodo que falta ainda não é criado com um clique. Próximas etapas: 6 (terreno e entorno) e 7 (cena pronta).

## Construção assistida — etapa 4, ambientar, concluída (11 de outubro)

**Feito**: `src/authoring/room-ambience.js` com `roomMood`, `proposeRoomLighting`, `suggestAtmosphere` e `proposeRoomDetails`; `wallSocket` em `room-layout.js` e orientação de encaixe para objetos (`commands.js`, `validation.js`); grupos Luz do cômodo e Detalhes no painel do assistente. Detalhes e limites em [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**: 264 unitários passam (4 novos em `tests/room-ambience.test.js`). E2E rodados e passando: `assisted-rooms`, `controls`, `dynamic-lighting`, `editor-ui`, `panel-consistency`, `phase3`, `structural-evolution`; a bateria completa não foi repetida. Calibragem visual em três rodadas no editor real: a primeira estourava o laboratório e deixava o ritual escuro; corrigido com intensidades menores, teto de quatro fontes por cômodo e prioridades.

**Pendências reais**: luminárias sem vínculo com teto; heurística do nome "Luz — "; limite global de luzes em cenas com muitos cômodos; calibragem só em cômodos de 7 × 6 m. Próxima etapa: 5 (prédio a partir do contorno), onde o assistente passa a entender o conjunto de cômodos.

## Construção assistida — etapa 3 e leitura do cômodo concluídas (11 de outubro)

Orientação do usuário: não quer presets prontos; quer um assistente que entenda o que está sendo feito, se adapte e ajude.

**Feito**: `room-insight.js` (deduz o cômodo pelas peças, lista o que falta, avisa de passagem bloqueada, sobreposição e falta de luz); aproveitamento das peças da pessoa em `furnishing.js`; `room-state.js` com cinco estados que transformam o que existe; painel *Assistente de cômodo*. Detalhes e limites em [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**: 260 unitários passam (5 novos em `tests/room-state.test.js`). E2E rodados e passando: `assisted-rooms` (2 casos), `controls`, `editor-ui`, `editor`, `panel-consistency`, `phase3`, `structural-evolution`, `terrain-paint`; a bateria completa não foi repetida. Conferência visual de seis cômodos com estado no editor real.

**Pendências reais**: Arrumado não devolve posições; estados não mexem em luz/atmosfera; sem peças tombadas; reconhecimento por modelo exato; leitura só por cômodo. Próxima etapa: 4 (ambientar: luz, atmosfera, itens de parede vinculados).

## Construção assistida — etapas 1 e 2 concluídas (11 de outubro)

**Feito**: solucionador de regras (`src/authoring/room-layout.js`), 26 receitas como dados (`src/domain/room-recipes.js`), `furnishing.js` religado a eles mantendo proposta, preservação e luzes; painel com cômodos agrupados e "Ver outra arrumação"; scripts `review-rooms.js` e `capture-rooms.js`. Detalhes e diferenças em [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md).

**Validação**: 255 unitários passam (4 novos em `tests/room-recipes.test.js`). E2E rodados: `assisted-rooms` (novo), `phase3`, `structural-evolution`, `editor-ui`, `terrain-paint`, todos passando; a bateria completa não foi repetida. Conferência visual de 12 cômodos no editor real: orientação dos modelos, objetos sobre móveis e itens de parede corretos.

**Pendências reais**: sem miniaturas nem variações lado a lado; itens de parede sem vínculo com a parede; sem folga na frente de móveis; 14 cômodos não foram conferidos em 3D, só em planta. Próximas etapas: 3 (estado do lugar) e 4 (ambientar).

## Construção assistida — plano entregue (11 de outubro)

Plano em [docs/ASSISTED_BUILD_PLAN.md](docs/ASSISTED_BUILD_PLAN.md). Diagnóstico: três receitas de mobília com posições fixas e cinco modelos dos 244; nada conhece paredes, janelas, estado do lugar ou prédio inteiro. Oito etapas, começando por receitas por regras e catálogo de cômodos. Também nesta data: `npm run dev` passa a usar a próxima porta livre quando a 5173 está ocupada.

## Interface — etapa 4, painel esquerdo, concluída (11 de outubro)

Motivo: depois das etapas 1 e 2, Construir e Cena continuavam confusas (três níveis de recolhimento, títulos de efeito, lista de elementos no fim da aba Cena).

**Feito**

- Abas **Construir · Elementos · Ambiente**; *Assets* virou botão no cabeçalho.
- `taskList` (`src/ui/panel-disclosures.js`): títulos simples e um só nível de tarefas, cada uma com nome e uma linha de descrição. Usado em Construir e Ambiente.
- Elementos: busca por nome, filtro por tipo, pastas recolhíveis (abrem sozinhas ao selecionar algo dentro), nomes em duas linhas, andar só quando há mais de um. Documento no fim da aba.
- Ambientes prontos como cartões com a prévia em ícone dentro do cartão.
- Captura: `docs/references/ui/depois-painel-esquerdo.jpg`; `scripts/capture-ui.js` cobre as abas novas.

**Validação**

- Unitários: 251 passam.
- E2E: os testes que selecionavam pela lista abrem Elementos; `reveal` (`tests/e2e/controls.js`) abre também a aba lateral onde o controle mora. A bateria completa foi interrompida pelo fim da sessão com 67 aprovados e 2 falhas; as duas (ambientes e Pages) e os arquivos que não tinham rodado (evolução estrutural, autoria e pintura de terreno, sondas de zona) foram repetidos e passam. Não houve uma rodada única completa e limpa depois das últimas correções de teste.
- O teste de Pages tinha duas corridas próprias, expostas agora e corrigidas no teste: esperava a dica "Clique no piso", que já estava na tela pelo token anterior, e conferia a miniatura antes de carregar. Depois da correção: 4 execuções seguidas aprovadas.

**Pendências reais**

- Pastas começam abertas (o plano previa recolhidas); ver justificativa no plano.
- Etapas 3 (propriedades em abas), 5 (busca de comandos e ferramentas com nome), 6, 7 e 8 não iniciadas.

## Interface — etapas 1 e 2 concluídas (11 de outubro)

**Feito**

- `src/ui/controls.js`: `numberField` escolhe entre faixa (deslizante + valor, até 400 passos) e medida (rótulo à esquerda, campo com unidade como sufixo); `choiceField` mostra poucas opções como segmentos, botões ou amostras; `bindControls` liga deslizantes e botões ao campo nativo, que continua sendo o único com `data-field`. Um arraste grava ao soltar: um passo de desfazer.
- `src/ui/swatches.js`: amostras das texturas procedurais a 96 px (`generateSurfaceTile(settings, size)`), desenhadas em tempo ocioso e guardadas no navegador.
- `src/ui/material-panels.js`: grade de amostras para a textura (objeto, base e camadas do terreno); padrão/trama/assentamento/acabamento por miniatura; grupos Desenho e Cor visíveis, só Ajustes finos recolhido; tipo e local do desgaste por botões.
- Segmentos em: tipo de luz, névoa, horário da cena, clima, ativação por horário, estado da água, fogo/fumaça, densidade da sala e listas curtas da iluminação dinâmica.

**Validação**

- Unitários: 251 passam (5 novos em `tests/controls.test.js`).
- E2E completo após `npm run build` e `build:pages`: 70 de 72 na primeira rodada; as duas falhas (terreno e Pages) vinham de uma regra de CSS que escondia o deslizante "Dureza das bordas" do pincel. Corrigida; terreno, Pages, escultura de rocha e pincéis salvos repetidos e passando, junto com o novo `tests/e2e/controls.test.js`. A bateria inteira não foi repetida depois dessa correção de uma linha de CSS.
- Captura depois: `docs/references/ui/depois-07-material-azulejo.jpg`.

**Pendências reais desta etapa**

- O deslizante atualiza o número durante o arraste e a cena só ao soltar; pré-visualização contínua pede agrupamento de edições no histórico.
- Painel de pincel do terreno/rocha usa campo numérico próprio e não recebeu o conjunto novo.
- Material da cobertura, distribuição da superfície e listas de tamanho variável continuam como lista.
- Desgaste sem amostra em imagem (é calculado no shader).

## Reformulação da interface — plano entregue (10 de outubro)

Plano em [docs/UI_REWORK_PLAN.md](docs/UI_REWORK_PLAN.md), a partir do relato de uso e de capturas da interface atual (`scripts/capture-ui.js`; três em `docs/references/ui/`). Diagnóstico: coluna longa de caixas de texto, controles de padrão das texturas a dois níveis de recolhimento, textura escolhida por nome sem amostra, painel esquerdo com três funções e lista de elementos no fim da rolagem, ferramentas sem nome, texto de 8–12 px, sem busca. Oito etapas, das quais as duas primeiras (conjunto de controles e material com amostras) atacam a queixa das texturas.

## Fidelidade visual — etapas 1 a 3 concluídas (10 de outubro)

Plano e andamento em [docs/VISUAL_FIDELITY_PLAN.md](docs/VISUAL_FIDELITY_PLAN.md).

Etapa 3, parte 1, famílias de acabamento: seis texturas procedurais novas (tecido, couro, reboco/parede pintada, azulejo/ladrilho, carpete/tapete, pintura sobre metal ou madeira) e envelhecimento da madeira, todas com padrão configurável no painel de material (18 opções novas, validadas no documento) e aplicáveis a qualquer superfície. Ao recolorir, rejunte, lascas e substrato mantêm a própria cor (máscara no canal alfa do atlas). A biblioteca usa tecido em estofados (16 modelos), pintura com lascas em carcaças coloridas (31) e couro na mala. Atlas padrão passa a ser preenchido sob demanda. Tempo de quadro na RX 580 inalterado. Uso em [docs/MATERIALS.md](docs/MATERIALS.md#famílias-de-acabamento). Validação: `tests/surface-families.test.js` (opções validadas, cada opção altera a textura, repetição sem emenda, máscara de recoloração, atlas sob demanda, controle no painel para cada opção), 243 testes unitários, builds local/Pages e 18 roteiros E2E de materiais aprovados (todos os presets alteram pixels reais, materiais/efeitos pela interface, transferência, desgaste, pintura de terreno, biblioteca, Casa, equivalência de materiais, desempenho). Os controles novos são gerados pelo mesmo mecanismo dos antigos e conferidos no teste do painel; não houve roteiro de cliques específico numa família nova.

Etapa 3, parte 2, desgaste nas bordas: local **Bordas e quinas** e tipo **Uso · material exposto** no desgaste do material, com largura da faixa configurável (`wear.edgeWidth`, opcional no documento). `src/render/wear-edges.js` deriva, uma vez por modelo e só quando esse local é usado, uma geometria em que cada vértice guarda a distância às linhas de vinco da sua face; funciona em modelos da biblioteca, pisos, paredes e GLB. Limites: superfícies arredondadas não têm aresta e não recebem a faixa; rocha esculpível e terreno com camadas ficam de fora; sujeira em reentrâncias medida pela geometria e desgaste de fábrica nos modelos não foram feitos. Validação: `tests/wear-edges.test.js` (distância exata à aresta em caixas, chanfros, superfícies lisas e folhas abertas; campo opcional e controle no painel), 246 testes unitários, builds local/Pages e 16 roteiros E2E aprovados (desgaste por pixels e pela interface, materiais/efeitos, transferência, equivalência de materiais, desempenho, Igreja). O local novo foi conferido por prancha renderizada na GPU, não por um roteiro de cliques próprio.

Etapa 1, nitidez com efeitos ligados: o alvo dos efeitos tem multisampling 4× fora da qualidade Econômica e sua resolução segue a qualidade da janela (Econômica até 1×, Equilibrada/Personalizada até 1,25×, Alta até 1,6×); antes, ligar AO, bloom ou névoa desenhava sem antialiasing e a 1× em qualquer tela. Custo medido na RX 580: 1–2 ms por quadro em tela comum; em tela 2× na Igreja (névoa e bloom), 18 ms antes, 23 ms em Equilibrada e 32 ms em Alta. Validação: `tests/e2e/effects-sharpness.test.js`, 237 testes unitários, builds local/Pages e 21 roteiros E2E de efeitos aprovados.

Etapa 2, luz refletida por zona: campo opcional `lightingZone.indirect` (0–1, "Luz refletida pelo ambiente" no painel). Uma sonda por zona (`src/render/zone-probes.js`) captura o entorno e fornece cor e direção da luz ambiente, escaladas para o brilho configurado na zona; a captura não enxerga o próprio resultado e é refeita, só para zonas em vista e uma por quadro, quando a cena fica parada 350 ms após mudança no que é desenhado. Qualidade Econômica não usa o recurso; em navegador que desenha por software ele e o multisampling da etapa 1 ficam desligados, e em qualquer máquina uma captura acima de 1,5 s o desliga na janela. Zonas de documentos existentes não mudam; zonas novas nascem com 0,6; Backrooms, Casa, Igreja e os quatro estudos de iluminação foram regenerados. Custo na RX 580: 25–125 ms por zona capturada, 0,2–0,5 s uma vez por cena na primeira captura; tempo de quadro em regime inalterado; em WebGL por software cada captura custa de 0,2 s a vários segundos. Duas abordagens medidas e descartadas: usar a intensidade lida pela sonda (estourava a Igreja e escurecia a Casa) e selecionar luzes por zona na captura (recompila todos os programas de shader).

Validação da etapa 2: `tests/e2e/zone-probes.test.js`, teste de domínio do campo, 238 testes unitários, builds local/Pages e 29 roteiros E2E aprovados (sondas, nitidez, Backrooms, Casa, Igreja, iluminação dinâmica e autoria, materiais/efeitos, equivalência de materiais, desempenho, capas, editor). Os roteiros da Igreja e da Casa chegaram a estourar o limite de 360 s com a luz refletida ativa em WebGL por software; passaram depois de desligar o recurso e o multisampling nesse tipo de renderizador (Igreja 241 s, Casa 158–186 s). Comparações em `docs/references/visual-plan/`.

Pendente: etapa 4 (modelos-herói em GLB), 5 (decalques, reflexos locais, miniaturas). Limites da etapa 2: uma sonda por zona, sem oclusão dentro dela, posicionada no centro (um móvel ali domina o que ela enxerga); a captura usa as luzes acesas para a câmera atual; efeito discreto em cenas com pouca luz direta, como a Casa; capas e miniaturas capturam as sondas com as luzes acesas no momento, sem a seleção por zona. A ampliação do AO de meia resolução ainda não respeita bordas.

## Desempenho de renderização em escala — etapas 1 a 4 concluídas (10 de outubro)

Plano e medições em [docs/RENDER_SCALE_PLAN.md](docs/RENDER_SCALE_PLAN.md); o plano visual que vem depois está em [docs/VISUAL_FIDELITY_PLAN.md](docs/VISUAL_FIDELITY_PLAN.md).

Concluído: medição reproduzível (custo estático, tempo de quadro, perfil de CPU e capturas na GPU da máquina); retirada do refinamento sem efeito visível; geometria indexada por soldagem de vértices; uniforms das zonas de iluminação em arrays planos; cache de modelos ampliado para 128 assets; materiais compartilhados durante o desenho entre malhas idênticas, inclusive peças com desgaste; matrizes de mundo atualizadas uma vez por quadro; oclusão ambiente lendo a profundidade do próprio quadro em vez de redesenhar a cena.

Medidas: Backrooms 590 mil → 259 mil triângulos e 1,77 mi → 458 mil vértices; Igreja 1,76 mi → 1,34 mi triângulos e 5,3 mi → 1,4 mi vértices. Tempo de quadro na RX 580 com câmera em movimento (p50, primeira câmera), da primeira medição no hardware até agora: Backrooms 26,6 → 9,4 ms, Casa 21,0 → 10,2 ms, Igreja 37,1 → 17,4 ms, Montanha 3,9 → 3,6 ms. As medições variam cerca de 2 ms com a carga da máquina. Chamadas de desenho nas cenas com AO caíram pela metade (Igreja 1 787 → 933).

Como funciona o compartilhamento: o material é trocado apenas durante o quadro e devolvido em seguida, de modo que edição, seleção e miniaturas continuam operando no material próprio de cada instância. AO: capturas antes/depois em cinco vistas diferem 0,17–0,27% (RMS); tokens de imagem com recorte por alfa passam a participar da oclusão, rótulos e auxiliares continuam fora.

Validação: 237 testes unitários/de integração e builds local/Pages aprovados. E2E: 36 roteiros após as etapas 2–3 e os arrays planos; 31 após o compartilhamento de materiais, com duas correções (materiais que não são padrão quebravam o agrupamento; o teste de transferência de material esperava que só o slot colado tivesse textura, o que deixou de valer desde que a caixa reconstruída traz madeira nas tábuas); 20 após o AO (iluminação dinâmica com pixels de AO, equivalência de quadro, desempenho, materiais/efeitos, capas, Backrooms, Igreja, editor), todos aprovados. Os E2E de interface usam `dist/`; é preciso `npm run build` antes. A cena da montanha foi regenerada pelo seu gerador, pois os envelopes dos kits voltaram aos valores originais.

Pendente: vidro de dupla face (o three.js verifica o programa a cada quadro), 5 (instanciamento, a decidir por medição), 6 (LOD e sombras econômicas), 7 (descarte por cômodo). A Igreja fica em torno de 57 quadros por segundo em movimento nas vistas mais pesadas. Emendas coplanares podem trocar de superfície em linhas de um pixel porque a ordem de desenho segue o material. Não há medição com editor e projetor abertos ao mesmo tempo.

## Reconstrução da biblioteca inteira — concluída (8 de outubro)

Escopo: substituir os 244 modelos distribuídos preservando IDs, envelopes métricos, footprints, apoios e slots públicos de material. Geração determinística a partir de fontes imutáveis em `scripts/library-source/`; o catálogo registra `geometryEdition` e `contentHash`, e as capas/caches derivados passam a depender do hash.

Entregue: 171 modelos dedicados, incluindo os 161 props originais (índices 0–160) e dez complementos de casa/Backrooms/cemitério; os 73 restantes são os kits recentes de montanha, igreja e casa, que conservam suas fontes detalhadas e recebem chanfros, perfis torneados e subdivisão. A primeira passagem havia refeito 58 modelos; os outros 113 foram modelados nesta etapa em cinco ateliês (`scripts/library-atelier-*.js`: casa/comércio, tecnologia/saúde, oficina/rua/campo, igreja/cemitério/paranormal, complementos) sobre um kit comum de componentes (`library-atelier-kit.js`: rodas, rodízios, puxadores, portas almofadadas, venezianas, velas, correntes, manômetros, chamas).

Primitivas novas em `src/render/crafted-geometry.js`: caixa afunilada (`taper`), caixa de cantos arredondados (`round`), torno parcial (`arc`/`start`) e torno facetado (`faceted`, para cristais). Receitas antigas continuam válidas.

Materiais: o acabamento automático de madeira deixou de reduzir contraste (tornava a madeira rosada); metais deixaram de receber textura e metalicidade alta, porque reflexos vêm desligados por padrão e superfícies totalmente metálicas ficavam pretas — a metalicidade das receitas agora é limitada a 0,5. Modelos dedicados não recebem estofamento automático (`cloth` também é slot de tinta) e podem declarar acabamentos extras (vidro translúcido, latão, cobre, terra, fluido, véu) sem substituir slots públicos; slots nomeados por cor (`rust` como tinta laranja ou terra) podem ser declarados foscos.

Validação: 234 testes unitários/de integração e builds local/Pages aprovados. Testes novos conferem as primitivas, o plano de apoio de doze móveis, metalicidade máxima e a permanência de todos os slots públicos originais (`scripts/library-source/slots.json`); quatro slots perdidos na primeira passagem foram restaurados. Orçamentos: até 200 peças, 8 lotes e 65 mil triângulos por modelo; acervo com 1,36 milhão de triângulos, média de 5,5 mil nos props originais (a tesselação acompanha o tamanho da peça). Pranchas de todos os 244 modelos revisadas em iluminação neutra sem ambiente (`node scripts/review-library.js [ids]`, saída em `test-results/library-review/`). 21 roteiros E2E afetados aprovados em servidor e Pages (biblioteca, editor, Backrooms, Igreja, Casa, montanha, capas dos exemplos, desempenho e colocação repetida; `test-results/library-e2e.log`), executados sobre o mesmo catálogo final (hash de conteúdo idêntico após a limpeza de código). Comparação antes/depois de vinte modelos em `test-results/library-review/before.png` e `after.png`.

Correção das miniaturas (8 de outubro): as prévias ordenavam triângulos pelo centro, e as faces grandes das caixas chanfradas eram pintadas sobre peças à frente (pia, banheira, televisão). `scripts/recipe-thumbnail.js` passou a rasterizar com buffer de profundidade, mostra o interior de cascas abertas e mistura vidro translúcido; todas as 244 prévias foram regeneradas, sem alterar receitas nem hashes.

Limites reais: geometria procedural por primitivas, sem escultura orgânica nem texturas pintadas — aproxima a leitura e a densidade de detalhe, não iguala modelos autorais com PBR fotográfico. O envelope é ajustado por escala não uniforme; modelos cuja proporção própria difere do envelope (correntes com 2,5 cm de profundidade, por exemplo) ficam achatados nesse eixo. Kits de igreja/montanha não foram remodelados. Média de triângulos por prop subiu de ~1 mil para ~5,5 mil; cenas densas dependem de medição no projetor, e instanciamento/LOD continuam pendentes. Não há alteração de câmera ou pós-processamento.

## Backrooms — concluídas (8 de outubro)

Labirinto de 36 × 30 m com oito setores, corredores conectados, rotas alternativas, teto modular e fluorescentes. Gerador determinístico, 436 entidades e três modelos próprios implementados (catálogo de 244). Quatro testes direcionados passaram: conectividade, vãos reais, pisos, receitas e projeção sem teto. Cinco vistas revisadas, 228 testes de domínio/integração e builds local/Pages aprovados. Dois fluxos E2E completos aprovados em servidor/Pages: galeria, edição de luz sem recriar recursos, histórico, teto, câmera independente do projetor, salvar/reabrir e nova cópia do original.

Evidências: `test-results/backrooms-unit.log` (quatro), `backrooms-all-unit.log` (228), `backrooms-build{,-pages}.log`, `backrooms-e2e.log` (dois) e capturas `backrooms-view-*.png`. Os primeiros testes detectaram uma divisória atravessando o vão; ela foi reposicionada. O teste de projeção foi ajustado para verificar a exclusão correta do teto oculto. Sem alteração do renderizador, cenas pessoais ou publicação automática de câmera. E2E geral não repetido; capturas em SwiftShader não medem desempenho em GPU física. [Uso e montagem](docs/BACKROOMS.md).

## Casa de bairro e revisão da galeria — concluídas (8 de outubro)

Escolhido o piloto do plano: lote 24 × 30 m com casa térrea mobiliada, dois quartos, sala/jantar, cozinha, banheiro, lavanderia, garagem e quintal. Cena com 171 entidades, nove complementos residenciais (catálogo de 241) e cinco câmeras. Revisão visual das cinco câmeras concluída, 224 testes de domínio/integração e builds local/Pages aprovados. Dois E2E completos aprovados (servidor e Pages): galeria, edição de luz sem recriar recursos, histórico, cobertura, câmeras independentes, salvamento/reabertura e nova cópia do original. Passagem de Inverno removida e quatro estudos de luz transferidos para fixtures de desenvolvimento. Cópias pessoais preservadas.

Rotas de 70 cm amostradas em duas alturas por raycast, incluindo paredes, folhas e mobiliário. Corrigidas interferências nas portas da sala, lavanderia e garagem; cobertura manual documentada. Estudos técnicos movidos sem alteração de conteúdo; ferramentas de auditoria adaptadas, gerador antigo da ponte e seus patchers removidos. [Uso e montagem](docs/CASA_DE_BAIRRO.md).

Evidências: `test-results/house-all-unit.log` (224), `house-unit.log` (quatro testes direcionados finais), `house-lighting-fixtures.log` (dez), `house-e2e-final.log` (dois), `house-build{,-pages}.log`, `house-preview*.log`, `house-view-*.png` e `house-{exterior,editor,plan}-{server,pages}.png`. A primeira execução gráfica encontrou uma chamada inexistente de `ready()` na API de diagnóstico do projetor; o roteiro foi corrigido para aguardar os modelos pelos diagnósticos disponíveis e ambos os fluxos passaram. Auditoria CPU com fixtures relocadas concluída em `house-fixture-audit.json`. Suíte E2E geral e desempenho em GPU física não medidos nesta entrega.

## Nitidez da Igreja Antiga — corrigida (8 de outubro)

Alvenaria de blocos restaurada em paredes, pilares, arcadas, balcões e empenas; piso voltou a um padrão menor. Desgaste reduzido/concentrado na base. Bloom reduzido de 0,30 para 0,10, raio 0,15 e limiar 1,35; preenchimento da nave aumentado e névoa interna reduzida à metade. Nave centralizada com FOV 60°, câmeras internas de detalhe também menos abertas. Cena regenerada. Testes direcionados do kit/cena e builds local/Pages aprovados. Quatro capturas internas conferidas no renderizador real, sem erros de assets; edição de luz preserva os recursos. Logs `test-results/church-clarity-{unit,build,build-pages,preview}.log`; capturas `church-view-04.png` a `church-view-07.png`. A suíte E2E completa não foi repetida nesta correção de acabamento.

## Reconstrução visual da Igreja Antiga — concluída (7 de outubro)

Reconstrução visual da Igreja Antiga entregue em 7 de outubro: 423 elementos editáveis, dez câmeras, oito modelos novos (kit com 30; catálogo com 232). Cobertura de duas águas/tesouras, vitrais com chumbo nas duas faces, retábulo e efígie monumentais, relicário espinhado, árvores ramificadas, materiais envelhecidos e banquete deslocado. Carregar novamente em Abrir → Cenas → Cenas de exemplo → Igreja Antiga; cópias pessoais preservadas. 220 testes de domínio/integração e builds local/Pages aprovados; fluxos da cena completa aprovados no servidor e Pages. Três E2E do kit aprovados após correções, completando cinco E2E afetados aprovados por suíte; dez testes direcionados repetidos após os ajustes finais também passaram. Acabamento original procedural, sem equivalência aos modelos oficiais; cobertura manual e desempenho presencial continuam como limites.

Revisão visual das dez câmeras no viewport real concluída; capturas finais de exterior, fachada e nave conferidas após ajustar lua, preenchimento e prioridade das velas. Enquadramento da sala de correntes afastado da folha da porta. Novas receitas em `scripts/library-church-reconstruction.js`; cena determinística em `public/scenes/igreja-antiga.json`. Kit anterior e cenas pessoais preservados.

Primeira execução gráfica: cena completa aprovada em servidor/Pages; três testes do kit encontraram paginação (24 itens iniciais) e uma chamada de material redundante no novo vitral. Teste usa agora “Mostrar mais assets”; chumbo interno/externo compartilha a mesma superfície. Repetição do render isolado aprovada: 30 modelos, máximo de seis chamadas e 11.532 triângulos por modelo, recursos descartados corretamente. Três E2E do kit aprovados na repetição. Sem alteração do renderizador ou do fluxo de publicação de câmera.

Evidências: `test-results/church-reconstruction-unit.log` (220), `church-reconstruction-unit-final.log` (10 direcionados), `church-reconstruction-e2e-initial.log` (dois fluxos da cena aprovados; três falhas iniciais do kit documentadas), `church-reconstruction-kit-final.log` (três aprovações), builds `church-reconstruction-build{,-pages}.log` e capturas `church-view-*.png`. Suíte E2E geral não repetida; desempenho em GPU física não medido.

## Capas dinâmicas e plano de cenas padrão — concluídos (7 de outubro)

Removidas as sete capas JPG de `public/scenes` e os apontamentos no catálogo. Exemplos visíveis usam a fila compartilhada de renderização a partir do JSON, com cancelamento ao fechar/carregar e cache derivado IndexedDB limitado a 32 imagens, separado da biblioteca pessoal. Conteúdo e revisões dos assets invalidam o cache. Cenas pessoais conservam geração automática sem escolher imagem. Scripts de revisão escrevem somente em `test-results`.

Entregue [plano de cenas padrão completas](docs/DEFAULT_SCENES_PLAN.md): casa, escritório/arquivo, armazém, bar, clínica, rua/loja, posto policial e sítio; revisão de igreja/montanha e futura separação dos estudos técnicos. Contém plantas propostas, escopo funcional, etapas, acabamento, câmeras e aceitação. Os novos cenários ainda não foram construídos.

Capas pessoais aprovadas em servidor/Pages após corrigir o contador interno de frames e a concorrência dos previews. Cena antiga com modelo assíncrono aprovada após observar visibilidade na rolagem e promover jobs pendentes; teste com 200 cenas/fila cheia aprovado. Validação: 220 testes de domínio/integração, builds local/Pages e 15 E2E afetados aprovados por suíte/repetições. Capturas móveis conferidas; nenhuma capa JPG distribuída. Medição complementar do editor com/sem projetor concluída: controles estáveis, nenhuma invalidação global/frame de sombra na renomeação e nenhum erro; resultados e limitações em `docs/benchmarks/performance-implemented-editor-2026-10-07.json`.

## Implementação do plano de desempenho — código entregue e validado (7 de outubro)

Código das oito etapas entregue: diagnóstico opt-in; setters/invalidações; UI e projeção seletivas; capas fora do canvas; pincel/buffers/normais e picking; histórico compartilhado; uniforms/caches; assets/neve/índices servidor e Pages. [Implementação, uso, limites e reversão](docs/PERFORMANCE_IMPLEMENTATION.md). Histórico de 150 entradas, visual, autoria, recuperação, privacidade e câmera independente conservados. Validação: 220 testes de domínio/integração, builds local/Pages e 15 E2E afetados aprovados por suíte/repetições. A execução gráfica integral anterior teve 57/60 aprovações; os três casos falhos foram corrigidos e aprovados nas repetições. A integração das capas também foi repetida após corrigir a interferência entre viewports e a prioridade na rolagem. A suíte integral não foi repetida após os últimos ajustes. Calibração presencial depende do notebook/projetor reais.

Medições finais: [CPU](docs/benchmarks/performance-implemented-cpu-2026-10-07.json) — igreja, renomear p95 de 46,16 para 15,76 ms; intensidade de 46,97 para 13,30 ms; heap retido após 150 edições de 133.150.832 para 747.888 bytes (~99,4% menor), sem representar RAM total do navegador. [Editor real](docs/benchmarks/performance-implemented-editor-2026-10-07.json) — capela, handlers p95 renomear de 31,60/32,70 ms e intensidade de 27,20/17,20 ms, sem/com projetor. Sem baseline anterior de UI; não comparar com o store isolado. Intervalos de duas rAF permanecem altos em SwiftShader (até p95 de ~10 s), incluindo renderização/capas, sem equivalência a apresentação física ou a desempenho do notebook. Metas presenciais continuam abertas.

Logs finais: `test-results/example-previews-unit-final.log`, `example-previews-build{,-pages}.log`, `example-previews-e2e-final.log`, `performance-e2e-corrections.log`, `performance-and-covers-e2e-accepted.log` (11 aprovações; o caso antigo de fila foi corrigido depois), `older-cover-e2e-final.log` e `performance-editor-final.log`. Verificada captura com conteúdo real após descarte de outros viewports, prioridade de cartões visíveis em fila cheia, JPEG decodificado, cancelamento/descarte ao fechar, cache limitado/persistente e invalidação por conteúdo. Não repetida a suíte gráfica completa após os ajustes finais.

## Auditoria de desempenho e planos de otimização — concluídos (7 de outubro)

Entregues [análise com evidências](docs/PERFORMANCE_ANALYSIS.md), [plano em oito etapas](docs/PERFORMANCE_PLAN.md), diagnóstico reproduzível `scripts/audit-performance.js` e [baseline JSON](docs/benchmarks/performance-2026-10-07.json). Identificados: invalidação global de sombras pelo setter de isolamento a cada edição, snapshots/serializações integrais, reconstrução de painéis, envio completo ao projetor, capas síncronas, recriação do terreno no pincel, dependências amplas de paredes, atualizações estáticas por frame, variantes de shader e limites de seleção/neve/acervo. Distinguem-se mecanismos confirmados, operações medidas e hipóteses de escala. Na auditoria inicial ainda não havia otimização de runtime aplicada; implementação entregue no incremento descrito acima. Trabalho anterior da igreja preservado.

Medições: quatro cenas em CPU; capela e igreja em viewport isolado Chromium/SwiftShader de 960 × 640, DPR 1 e movimento reduzido. Igreja: renomeação no store p50/p95 de 41,70/46,16 ms antes de UI/render; 150 renomeações retiveram cerca de 127 MiB adicionais após GC em Node. Reaplicar o documento no viewport teve p50 de 18,70 ms; edição de intensidade preservou todos os objetos/programas/recursos nas duas fixtures. Capas mostraram bloqueios expressivos no renderer por software, sem inferência de FPS ou segundos no notebook. Plano preserva detalhe, efeitos, ferramentas, histórico, recuperação, privacidade e câmeras independentes; naquele marco, o próximo incremento recomendado era baseline do fluxo real + setters/invalidação idempotentes.

Validação: **204 testes de domínio/integração aprovados**, diagnóstico CPU/navegador concluído, sintaxe do script, links locais e consistência do JSON conferidos. Logs em `test-results/performance-{audit.json,unit-final.log}`. A primeira suíte na sandbox encerrou o teste de servidor; repetida com loopback, passou integralmente. Builds e suíte E2E não repetidos nesta auditoria documental/instrumentação isolada. Pendências registradas na auditoria inicial: implementar as etapas priorizadas (entregues no incremento acima) e medir UI/animação contínua e editor + apresentação no notebook/projetor reais; as propostas não foram apresentadas como ganhos já entregues.

## Igreja Antiga e exterior — concluído (7 de outubro)

Disponível em **Abrir → Cenas → Cenas de exemplo → Igreja Antiga · templo e vale dos vampiros**, com cópia independente e ainda não salva. Cena comum de schema 2 com **379 elementos, 12 pastas, quatro andares e dez câmeras**. Nave/banquete/ritual, vitrais/arcadas/balcões, galerias, duas escadas de retorno, sala de correntes/sacristia, fachada de três portais/torre/cobertura e vale com caminho ascendente, paredões, árvores secas e horizonte violeta. Onze fontes vinculadas e seis zonas usam a iluminação reutilizável da engine, sem código de luz específico do mapa. [Uso, medidas, câmeras e limites](docs/IGREJA_ANTIGA_CENA.md).

Quatro complementos reutilizáveis — empena ogival, alvenaria vazada para vitral, cruz dupla e prato/cálice — elevam o kit a **22 peças** e o catálogo a **224 modelos**. Coberturas em pasta/camada próprias para ocultação manual; apoios poligonais seguem as lajes curvas dos seis balcões. A nave mede 19 × 35 m, as galerias ficam 5,8 m acima dela e o terreno principal ocupa 128 × 144 m. A ligação dos anexos, escadas e medidas são adaptações das partes não mostradas nas seis referências. Campanário superior cenográfico; estado anterior ao incêndio; acabamento procedural. Cenas pessoais e exemplos anteriores preservados.

Validação: **204 testes de domínio/integração, builds local/Pages e cinco E2E afetados aprovados** — três do kit (pixels/descarte e autoria nos dois modos) e dois da igreja completa. Conferidos reprodução do JSON, referências/cópias/cena↔mapa/projeção, caminho ascendente, árvores fora dos acessos/construções, portas reais, escadas entre níveis, apoio curvo, vãos dos vitrais, passagem de um metro ao lado do altar para a sacristia, histórico e visibilidade. Na interface: galeria/capa, alteração de intensidade sem recriar objetos, undo/redo, tetos, navegação livre independente e publicação explícita de enquadramentos, salvar/reabrir e original preservado; cartão em 390 px e ausência de APIs de servidor no Pages.

Dez vistas inspecionadas no viewport real, com revisão final de exterior/nave/planta e capa de 480 × 270. A revisão corrigiu alvenaria junto às portas superiores, contato dos pisos semicirculares, altura livre da torre baixa, enquadramentos obstruídos por folhas abertas, cadeiras tombadas, árvore dentro da torre e largura livre da passagem da sacristia. Na qualidade equilibrada, até oito fontes locais e cinco vistas de sombra spot de 512 px; primeira passagem de dez vistas com pico aproximado de 5 mil chamadas/1,5 milhão de triângulos, incluindo sombras/efeitos, e até 46 texturas. Medidas em SwiftShader com compilação e invalidação durante navegação, sem equivalência a FPS presencial.

Arquivos: `public/scenes/igreja-antiga.json` (capa dinâmica, sem JPG distribuído), `scripts/generate-church-scene.js`, `scripts/library-church-scene.js`, `scripts/preview-church-scene.js`. Logs: `test-results/church-unit-all.log`, `church-e2e.log` (três regressões do kit aprovadas; espera inicial dos testes do mapa corrigida), `church-e2e-final.log`, `church-preview.log`, `church-preview-final.log` e `church-build{,-pages}.log`. Capturas `church-view-*.png` e `church-{exterior,editor,plan}-{server,pages}.png`. Os testes iniciais foram ajustados para contar IDs de rochas em vez de submalhas, aguardar reflow em 390 px e distinguir navegação livre de escolha explícita de enquadramento. Uma captura paralela ao E2E excedeu o tempo em SwiftShader; a revisão final usa uma sessão de renderização por vez.

Limites reais: acabamento/proporções não constituem réplica fiel ou planta oficial; demais imagens da galeria não inspecionadas; cobertura manual, sem cutaway automático de props; campanário cenográfico, sem colisão/linha de visão/regras de combate/LOD automático. A validação presencial no notebook/projetor e a aceitação estética permanecem abertas. Não foi repetida a suíte E2E completa do projeto.

## Iluminação dinâmica reutilizável — implementação inicial concluída (6 de outubro)

Implementados perfis por objeto (vela/tocha/lâmpada/fluorescente/janela/ritual), origem numérica ou clicada, guias, emissão por slot, parâmetros fixáveis, clipboard, prévia/undo e biblioteca pessoal IndexedDB nos modos servidor/Pages. Zonas de caixa com prioridade/transição substituem preenchimento e névoa por posição; densidade zero limpa o volume global. Presets acolhedor/ritual/fluorescente e quatro estudos editáveis em Abrir: capela, taverna, escritório e rua chuvosa. [Guia e limites](docs/DYNAMIC_LIGHTING.md); [estado das etapas](docs/DYNAMIC_LIGHTING_PLAN.md).

Renderer incremental por identidade, pool limitado por tipo, seleção de fontes com retenção, orçamento de vistas de sombra e cache por influência. Foco estabilizado das sombras direcionais, casters das paredes paramétricas ocultas pelo recorte, projeções procedurais de vitral/grades/folhagem, reflexos PMREM procedurais, GTAO com intensidade/raio e névoa iluminada por profundidade. Qualidade local por janela, revisão temporária de legibilidade e fontes privadas filtradas antes da derivação; documentos antigos e câmera publicada preservados.

Validação final: **198 testes de domínio/integração, builds local/Pages e 19 casos E2E afetados aprovados**, por suíte e repetições. Incluem três novos de iluminação (pixels/descarte e autoria servidor/Pages), composições, câmera, ambientes, iluminação legada, desgaste, materiais/efeitos, Pages/IndexedDB, isolamento da neve, estruturas e pintura de terreno. Conferidos parâmetros fixados, biblioteca/concorrência, prévia sem publicação, origem por clique, histórico, privacidade, qualidade/câmera independentes, persistência e layout de 430 px. GPU confirma projeções/oclusão/fallback, AO/reflexos, região sem névoa, exterior isolado, espalhamento zero equivalente ao legado e recuperação da baseline de memória após descarte.

As verificações dos quatro estudos confirmaram edição de intensidade sem recriar objetos, inclusive paredes com vãos; prévia de construção também conferida. Quatro JSONs e quatro prévias conferidos nos dois builds. Capturas desktop/430 px e dos estudos inspecionadas; métricas em `test-results/lighting-examples-metrics.json` são CPU em SwiftShader, incluindo compilação, sem representar FPS presencial. A revisão corrigiu dependências geométricas excessivas das paredes, prévia de construção, cache ao reativar fontes e diagnóstico inicial do projetor. Os roteiros antigos receberam o caminho completo das dependências dos efeitos e a contagem do catálogo atual. Logs finais: `test-results/lighting-unit-final.log`, `lighting-acceptance-final.log`, `lighting-legacy-gpu-final.log`, `lighting-regressions.log` e `lighting-build{,-pages}-final.log`; os três insucessos iniciais das regressões passaram nas repetições registradas.

Limites: uma fonte por host, biblioteca neste navegador/endereço, até 16 zonas de caixa, reflexos globais aproximados, quatro fontes e duas sombras spot na névoa. Pontuais não ocluem o espalhamento no ar. Conexões por aberturas, zonas poligonais, HDR/probes, otimizações por índice espacial/transições e calibração em notebook/projetor continuam futuras. A capela é um estudo; igreja completa/vale foram entregues no incremento seguinte. A suíte E2E completa do projeto não foi repetida.

## Desgaste por material e plano de iluminação — concluído (6 de outubro)

**Implementado:** Material → Desgaste do material, com sujeira/escorrimentos, ferrugem, musgo, fuligem e rachaduras aparentes. Camada procedural sobre a textura existente; respeita slots e permite peça inteira, base, topo ou região local com centro/raio/suavidade. Intensidade, tamanho, cor, rugosidade, metalicidade, relevo e seed editáveis. Acompanha movimento/rotação/escala, preserva mapas UV/PBR originais e segue clipboard, histórico, duplicação/mapas, JSON, salvamento e projeção filtrada. Nenhum novo asset de desgaste. Guia: [docs/MATERIAL_WEAR.md](docs/MATERIAL_WEAR.md).

Uma camada por instância/slot escolhido, sem geometrias/texturas/passes adicionais; o custo é cálculo por fragmento. Superfícies planas usam centro nos eixos sem extensão e base/topo abrangem o plano. Água líquida, camadas pintadas do terreno e overrides parciais legados não oferecem a camada. Pintura livre, múltiplas marcas independentes e danos geométricos permanecem futuros; materiais não PBR personalizados não recebem o shader.

**Plano elaborado nesta etapa, implementado no incremento seguinte:** [docs/DYNAMIC_LIGHTING_PLAN.md](docs/DYNAMIC_LIGHTING_PLAN.md). Evolução da engine em etapas: medição/contrato, reconciliação incremental e orçamento de fontes/sombras, perfis vinculados a qualquer asset, regiões internas/externas simultâneas, projeções de vitrais/reflexos/AO e névoa iluminada. Controles simples e avançados, parâmetros fixáveis, biblioteca com snapshots, prévia/undo, qualidade independente por janela e critérios de privacidade/custo/aceitação. Primeira entrega recomendada: etapas 0–2; igreja, taverna, rua e escritório como fixtures. Não requer reescrever a engine nem presume GI automática.

Validação final: **188 testes de domínio/integração, builds local/Pages e cinco E2E afetados aprovados** (três novos de desgaste e duas regressões de materiais/efeitos). Pixels dos cinco estilos, região/slot isolados, mapas preservados, intensidade zero/desativação equivalentes ao original, composição com textura/cobertura, plano sem extensão Y e descarte GPU. UI servidor/Pages: controles, mudança de estilo conservando distribuição, clipboard, undo/redo, salvar/reabrir, tela de 430 px e projetor com câmera independente. Capturas inspecionadas: `test-results/material-wear-sheet.png`, `material-wear-assets.png` e `material-wear-{server,pages}{,-mobile}.png`. Mesma contagem de texturas/chamadas entre original e desgaste na fixture; baseline GPU recuperada após descarte. As primeiras fixtures foram ajustadas ao enquadramento da região, inicialização PBR e abertura do painel compacto; a superfície plana ganhou tratamento próprio no shader. Logs finais em `test-results/material-wear-{unit,e2e,build,build-pages}.log`. A suíte E2E completa não foi repetida; WebGL por software não estabelece desempenho presencial.

## Kit da Igreja Antiga — concluído (6 de outubro)

**18 assets originais locais**, catálogo com **220 modelos**. Em Assets, buscar **igreja antiga** ou filtrar **kit gótico**. Arquitetura: pilar fasciculado, arcadas semicircular/ogival vazadas, balcão semicircular, balaustrada, vitral translúcido, nervuras/cobertura modulares, contraforte, pináculo e torre. Peças características: Dama de Ferro aberta, Serafim decapitado, cadeira pontiaguda, pendão, correntes/ganchos, mesa longa com apoio e candelabro. Materiais separados e prévias compactas geradas da geometria. Perfis XY sólidos validados e opacidade opcional de receitas acrescentados, conservando assets antigos. Uso e avaliação: [docs/CHURCH_KIT.md](docs/CHURCH_KIT.md).

**Desgaste localizado:** o kit exemplifica tecido rasgado, pescoço fraturado, oxidação e região escurecida no pilar. O incremento posterior acrescentou desgaste procedural no material, inclusive em região ajustável. Pintura livre, inscrições/imagens e múltiplas marcas independentes ainda exigem ferramentas próprias de máscaras ou decals. [Uso da camada reutilizável](docs/MATERIAL_WEAR.md).

Validação: **185 testes de domínio/integração aprovados**, incluindo quatro novos de perfis, catálogo/limites, vãos/apoios e documentos/histórico/projeção; **builds local/Pages aprovados**. **Três E2E novos aprovados**: renderização/pixels dos 18 modelos, isolamento do vidro e descarte GPU; biblioteca/colocação/histórico/material nomeado/salvar/reabrir/projetor no servidor e no Pages. Câmera publicada permaneceu independente. Capturas reais inspecionadas em `test-results/church-kit-sheet.png`, `test-results/builtin-church-*.png` e `test-results/church-kit-pages.png`. Até cinco malhas por modelo; máximo observado de seis chamadas (vidro translúcido em dois passes) e 11.532 triângulos por peça. Recursos de assets foram liberados; textura interna PBR do renderer permanece na baseline. WebGL por software não estabelece FPS no notebook/projetor. A suíte E2E completa não foi executada.

As primeiras execuções exigiram loopback fora da sandbox; os ajustes do roteiro alinharam reaplicação de texturas à reinstalação de materiais do renderer, contagem de materiais agrupados, diagnóstico `options` e baseline PBR. A revisão visual reduziu ferrugem excessiva e retirou alvenaria da estátua. Resultados acima são da execução final.

Limites: modelos originais estilizados, sem afirmar reprodução fiel; arcos/vitral não recortam paredes, cobertura usa ocultação manual e vidro não projeta luz colorida. Balcão curvo exige piso poligonal de apoio, sem apoio retangular fictício. **O mapa completo continua pendente**; o kit pode ser utilizado em qualquer cena.

## Igreja Antiga — análise anterior ao kit; construção pendente (6 de outubro)

Após o bloqueio HTTP 403 dos 18 arquivos da wiki, o usuário forneceu seis imagens, agora visualmente inspecionadas. Confirmadas nave alta com arcadas/balcões curvos/cobertura nervurada, conjunto ritual, sala de correntes e exterior sobre platô com paredões, árvores secas e horizonte em névoa violeta. Não se afirma inspeção das demais vistas. A base permite aproximação jogável; faltam assets característicos e acabamento, além de melhorias em janelas/cobertura. [Análise e plano](docs/IGREJA_ANTIGA_ANALISE.md).

O plano distingue interior, área externa de circulação e horizonte 3D. Medidas propostas para estudo: nave de 20 × 35 m e área principal de 100 × 140 m, sem atribuí-las à obra. Terreno limitado a 64 divisões e uma altura por X/Z requer rochas/apoios independentes; `setDocument` ainda reconstrói o conteúdo. Priorizar um recorte da nave/platô e medir edição/editor/projetor antes de expandir, considerando LOD/instanciamento conforme os resultados. As seis imagens já bastam para planejar esse protótipo; outras vistas refinam as partes não mostradas.

Validação por inspeção visual dos anexos e do código/documentos. Nenhum cenário, asset ou código da aplicação alterado; builds/testes não executados nesta etapa documental. Protótipo e construção continuam pendentes porque as lacunas técnicas/de conteúdo persistem.

## Régua — concluída em 6 de outubro

**Régua (M)** na barra da cena mede com dois cliques ou arraste de mouse/toque. Mostra distância no plano XZ, distância em 3D, desnível assinado e equivalência física em células do grid, com duas casas decimais. Tokens usam o centro lógico da base; demais pontos usam superfícies visíveis ou o plano na altura de construção. Snap próprio opcional, inicialmente desligado, respeita origem/célula e Alt; centros de tokens permanecem exatos. Outra medição substitui a anterior, Limpar mantém a ferramenta, e Esc/Q/Concluir encerra. Em telas estreitas, painéis se recolhem e a barra de ferramentas permite rolagem horizontal. Guia: [docs/RULER.md](docs/RULER.md).

A linha, os marcadores e o rótulo são temporários: sem entidades, seleção, histórico, salvamento ou publicação no projetor; capas excluem os auxiliares 3D. A câmera pode navegar com a medida fixada. Alterações de documento, troca de andar isolado, apresentação e saída da ferramenta limpam a régua; cancelamento de captura restaura a medida anterior. Cálculo físico isolado em `src/domain/measurement.js`, com visual e estado transitórios em `src/render/ruler.js`.

Validação: **181 testes de domínio/integração e builds local/Pages aprovados**, incluindo três novos testes de distâncias, alturas, células, validação de pontos e formatação. **Quatro E2E afetados aprovados**: os dois novos da régua (servidor/Pages), regressão da câmera e regressão do editor/apresentação/salvar/reabrir/imports. Conferidos prévia/fixação/substituição, centros exatos inclusive com snap, desníveis positivos/negativos, terreno inclinado, objetos bloqueados/ocultos, plano fora dos objetos, origem/célula/Alt, cancelamento de captura, Limpar/Esc/Q/Concluir, foco em texto, câmera/projetor independentes, apresentação na mesma janela, substituição do documento e toque real em 430 px. Capturas finais desktop/compactas inspecionadas em `test-results/ruler-{server,pages}.png` e `ruler-{server,pages}-mobile.png`. A primeira fixture foi corrigida para ocultar pela camada, conforme o schema. A regressão antiga do editor precisou aguardar o nome do asset importado, pois a dica genérica já estava ativa desde a colocação repetida; a repetição passou. A suíte E2E completa não foi executada.

Regras específicas de combate (diagonais, alcance entre bordas, terreno difícil, obstáculos/linha de visão e consumo de movimento), trajetos com vários segmentos e compartilhamento da régua com jogadores continuam futuros. As células exibidas são uma equivalência física fracionária, sem arredondamento tático.

## Colocação repetida de assets — concluída em 6 de outubro

**Assets → Colocação repetida** começa marcada e também aparece na barra sobre a cena, junto do nome do asset. Escolher um card mantém o asset ativo após cada inserção; Esc/Q/Concluir ou outra ferramenta encerra. Desmarcar permite uma cópia e passa para Mover. Cada clique cria IDs próprios e uma entrada independente de histórico, conservando apoio, snap/Alt, andar e camada atuais; falhas não encerram a colocação. Trocar o card conserva filtros e muda o asset em uso. Imports e retratos de assets usam o mesmo fluxo, com ator/token independente por clique. Em tela estreita, repetir recolhe os painéis e cada inserção mantém o cenário livre. Uso: [docs/ASSET_LIBRARY.md](docs/ASSET_LIBRARY.md#colocação-repetida).

Validação: **178 testes de domínio/integração e builds local/Pages aprovados**. **Três E2E afetados aprovados**: regressão da biblioteca (filtros/classificação/favoritos/import/reinício) e dois novos de colocação repetida, no servidor e no Pages. Conferidos três cliques com IDs distintos, camada bloqueada, apoio elevado/andar/camada, snap e Alt, undo/redo sem encerrar, clique fora do apoio, troca de asset, opção única e sincronização biblioteca/barra, Esc/Q/Concluir, retratos independentes, câmera do projetor preservada, tela de 430 px e salvar/reabrir. Fixtures/roteiro foram ajustados aos campos opcionais, nome do catálogo, tolerância de raycast, referência do retrato no ator e enquadramento do piso; a execução final dos dois novos passou. Capturas desktop e compactas inspecionadas em `test-results/repeated-placement-{server,pages}.png` e `repeated-placement-{server,pages}-mobile.png`. A suíte E2E completa não foi repetida.

A preferência é da sessão: recarregar restaura repetição marcada, sem asset ativo. Cópias usam os padrões do asset e não herdam edições da instância anterior. Colocação por nome de tokens e comandos avulsos de luz/escada/rampa continuam individuais; distribuição automática, variantes por traço e assets recentes ficam para incrementos próprios.

## Presets pessoais de pincéis — concluído em 6 de outubro

**Propriedades → Pincel de superfície → Meus pincéis**: salvar com nome, aplicar, atualizar ajustes, renomear e excluir. Listas separadas de terreno/rocha, com até 100 presets no total, nomes validados e proteção contra duplicatas/alterações concorrentes. Biblioteca IndexedDB por endereço/caminho do navegador, independente das cenas e disponível no servidor local e no Pages. Guarda ferramenta, tamanho, força/dureza e opções específicas do terreno (formato/encaixe/proteção, nivelamento, formação rochosa ou água), preservando a camada atual. Aplicar não muda documento/histórico/câmeras nem ativa automaticamente a ferramenta parada. Guia: [docs/BRUSH_PRESETS.md](docs/BRUSH_PRESETS.md).

Validação: **178 testes de domínio/integração aprovados**, incluindo cinco novos para captura de todos os modos, isolamento/contexto, incompatibilidades, validação, armazenamento indisponível e escape da interface; builds local/Pages aprovados. **Quatro E2E afetados aprovados**: dois novos de presets (servidor e Pages), mais regressões de pintura de terreno e escultura de rochas. Conferidos CRUD, nomes duplicados, revisão entre abas, falha de gravação sem sobrescrever, reutilização em outra cena/camada, reload, traço real/undo e projetor independente. Os roteiros novos precisaram abrir explicitamente a cena na segunda aba e o painel Ferramentas recolhido na tela estreita; a repetição final dos dois passou. Capturas desktop e 430 px em `test-results/brush-presets-{server,pages}.png` e `brush-presets-{server,pages}-mobile.png`, com interface inspecionada. A suíte E2E completa não foi repetida.

Limites: biblioteca neste navegador/endereço, sem exportação/importação ou sincronização entre dispositivos; limpar os dados do site remove os presets. Para enxergar adições de outra aba, recarregar; atualizações/exclusões antigas são recusadas e atualizam a lista. Presets de materiais, neve e distribuição de vegetação permanecem fora deste incremento.

## Conta-gotas e copiar/colar materiais — concluído em 6 de outubro

Controles no inspetor e conta-gotas na barra 3D; I amostra, Ctrl+Shift+C copia e Ctrl+Shift+V cola. Clipboard de materiais separado de objetos, com configurações de textura, acabamento e cobertura; destino conserva material nomeado ou alcance base/camada do terreno. Camadas preservam máscaras/distribuição; seleção múltipla é uma transação de histórico, com validação de bloqueios e remoção de parâmetros opcionais antigos. Amostrar não muda documento/seleção; Esc/Q cancela. Apoios acompanham neve física no terreno. Uso e limites em [docs/MATERIALS.md](docs/MATERIALS.md#conta-gotas-e-copiarcolar-materiais).

Validação: 173 testes de domínio/integração aprovados (quatro novos para transferência, isolamento, histórico/atomicidade, bloqueios, máscaras e apoios); builds local e Pages aprovados. Dois E2E novos, um por modo, passaram e foram repetidos após acrescentar material nomeado e conferir o layout: conta-gotas/atalhos/cancelamento, origem bloqueada, seleção preservada, base/camada, colagem múltipla, isolamento do material `strap` de uma caixa, undo/redo, salvamento/reabertura e câmera independente do projetor. Capturas em `test-results/material-transfer-server.png` e `test-results/material-transfer-pages.png`. Clipboard só nesta aba; texturas/cores originais de assets não são extraídas, e camadas recebem apenas os campos que suportam. A suíte E2E completa e benchmark presencial não foram repetidos.

## Análise de pendências e qualidade de vida — concluída

Revisão de código, documentação e prévia distribuída, incluindo capas automáticas presentes no workspace. Diagnóstico e sugestões priorizadas em [docs/AUDITORIA_2026-10-05.md](docs/AUDITORIA_2026-10-05.md). Confirmado no Chromium: importar JSON com ID já existente pode mostrar salvo sem gravar e sem manter rascunho. Correção continua pendente. Reconstrução integral do renderer por atualização/salvamento e custo de snapshots merecem medição; transporte, restauração acessível de backups, reutilização e acabamento visual têm próximos passos registrados. Nenhuma sugestão foi implementada nesta análise.

Validação: 169 testes de domínio/integração e builds local/Pages aprovados; reprodução de importação com fixture temporária e inspeção da imagem do renderer. Primeira execução dos testes impedida pela restrição de portas locais, execução autorizada aprovada. Suíte E2E completa, benchmark presencial e aceitação visual não executados.

## Prévia automática de cada cena — implementada e verificada

- [x] Capturar o cenário renderizado sem grid, gizmos ou seleção, sem modificar câmera/documento/projetor.
- [x] Incluir a cena em criação no menu Abrir e atualizar sua imagem após edições.
- [x] Guardar a capa derivada separadamente do histórico; criar/duplicar/importar/mapas e cenas antigas recebem prévias automaticamente.
- [x] Verificar imagens reais, atualização, criação sem salvar, persistência, conflitos e descarte no navegador; concluir guias/resumos.

Uso: **Abrir → Cenas**. Toda cena criada recebe captura própria, inclusive antes de salvar; edição atualiza após cerca de um segundo de pausa. Inclui cópias, JSON importado e cenas criadas a partir de mapas. Mapas do acervo também têm capas. Documentos antigos sem imagem são capturados em segundo plano, aguardando modelos, com primeiro enquadramento salvo ou vista do conjunto. A captura não modifica/publica câmera, não entra no undo e não bloqueia Salvar. Imagens de 480 × 270 ficam fora do documento, com revisão verificada, duplicação/exclusão e cache limitada; atualização de imagem conserva foco/rolagem da janela. Guia: [docs/EXAMPLE_SCENES.md](docs/EXAMPLE_SCENES.md#imagem-automática-de-cada-cena).

Validação: **169 testes de domínio/integração aprovados**, builds local/Pages e cinco casos de navegador verificados: três novos de capas (servidor, Pages e acervo antigo) e dois de regressão Pages/IndexedDB. Capturas reais em `test-results/scene-previews-server.png` e `scene-previews-pages.png`. Conferidos pixels da cena, salvamento/reabertura, criação antes de salvar, mapas/importação/duplicação, tela estreita, espera de assets, descarte do viewport temporário e independência de documento/câmeras. O teste ampliado do projetor precisou abrir o painel Cena antes de clicar no botão oculto; após corrigir o roteiro, os três testes de capas passaram. Um teste de concorrência confirma que uma captura salva atrasada não substitui a imagem das edições posteriores, e prévias de ambientes não aceitas não viram a capa. O roteiro de persistência confere o metadado salvo, pois uma nova captura pode trocar a URL exibida por imagem em memória. A suíte completa de navegador não foi repetida.

## Reconstrução integral da montanha — entregue e validada

- [x] Substituir a composição por um snapshot novo: **101 elementos e quatro luzes**, **48 × 62 m**, seis pastas desbloqueadas e cinco câmeras.
- [x] Modelar trilha ascendente com relevo espacial em várias escalas, lago irregular com leito escavado, caverna lateral livre e ponte elevada sobre uma ravina real.
- [x] Usar paredões/rochas orgânicos, quatro abetos densos/um pinheiro denso, neve de copa, caixas/barril/tábuas/raízes/arbustos e lanternas circulares conectadas.
- [x] Ativar tempestade com 2.700 flocos, queda/vento/rajadas, névoa fria e contraste quente das lanternas.
- [x] Revisar as cinco câmeras e a tempestade em movimento no renderizador real; atualizar a prévia distribuída.
- [x] Validar cópia independente em Abrir, carregamento de modelos, edição/histórico, persistência, servidor/Pages e câmera independente do projetor.
- [x] Sincronizar os guias e resumos; retirar entregas das pendências atuais.

Uso: **Abrir → Cenas → Cenas de exemplo → Subida da montanha · caverna e ruínas**. Cada carregamento cria uma cópia editável; originais e cópias pessoais anteriores ficam preservados. Gerador em `scripts/mountain-example.js`, JSON/prévia em `public/scenes/`; o outro exemplo de ponte não é regenerado pelo comando de manutenção. Guia: [docs/EXAMPLE_SCENES.md](docs/EXAMPLE_SCENES.md).

Revisão visual: rocha deslocada para liberar a caverna; árvore afastada da borda; props inclinados com o chão e boulders assentados pela área de contato; irregularidade dos paredões reduzida para evitar pontas excessivas; lanterna reposicionada na face visível. Comparação com sombras desligadas confirmou que as faixas no chão eram auto-sombreamento. `normalBias` direcional agora acompanha o tamanho de texel no mundo, limitado entre 0,035 e 0,18 m, sem aumentar a resolução. Recorte final conferido sem as faixas. Vistas de autoria usam a qualidade local desligada para revelar o conjunto sem névoa, preservando o ambiente salvo/projetor. Arco antigo com pedras espaçadas substituído por ruína de torre; piso da caverna aproximado do chão e caixas parcialmente enterradas na neve.

Validação: 167 testes de domínio/integração aprovados; nove testes de iluminação repetidos após a correção das sombras. Builds local/Pages aprovados. Oito cenários E2E afetados passaram nesta etapa: vegetação/pixels/descarte, exemplo no servidor e no Pages, três casos de rocha/neve/precipitação e dois de Pages/IndexedDB. Dois E2E de iluminação também foram repetidos. Cinco testes do exemplo passaram novamente após os últimos ajustes de composição. O roteiro móvel do exemplo foi corrigido para conferir os dois cartões da galeria, após falha por seleção ambígua; o caso Pages foi repetido. A suíte completa de navegador não foi repetida. Os raycasts da entrada foram ampliados para três alturas/larguras. Conferidos subida, margem/leito, apoios/vãos, fixação das lanternas/luzes, determinismo e cópias independentes. Todas as referências/modelos/prévias do catálogo e o JSON/JPEG do exemplo foram conferidos nos dois builds; nenhum diagnóstico de falha no mapa renderizado.

Capturas finais: `test-results/mountain-example-reference.png`, `-cave.png`, `-bridge.png`, `-wide.png`, `-top.png`; tempestade animada em `-storm-a.png`/`-storm-b.png`. Recorte principal: **105 objetos, 167 chamadas, 747.504 triângulos, 17 texturas**. Compartilhar o acabamento mineral reduziu as texturas de 55 para 17 durante a revisão; o recorte anterior à reconstrução tinha aproximadamente 222 mil triângulos. Os contadores incluem as passagens de renderização, inclusive sombras; não são uma contagem de triângulos únicos. Essa ampliação tem custo real. Chromium/SwiftShader verifica funcionamento, sem estabelecer FPS no notebook/projetor. A animação de neve foi observada com relógio de efeitos avançando; movimento reduzido continua pausando.

O mapa está pronto para carregar e editar. O acabamento continua procedural e estilizado: materiais fotográficos/desgaste regional, pintura local dos depósitos nas rochas, contato/reflexos e otimizações conforme benchmark permanecem futuros. Não declarar paridade com a referência ou com Ordem Paranormal por contagem de assets/testes; a aceitação visual pelo usuário ainda precisa ocorrer.

## Vegetação e objetos detalhados — implementados e verificados no navegador

- [x] Acrescentar abeto/pinheiro densos com agulhas em volume, ramos curvos afilados/bifurcados e variação por seed, preservando as plantas anteriores.
- [x] Acrescentar galho seco, raízes torcidas e arbusto seco; madeira com pontas maciças, sem hastes retas como forma dominante.
- [x] Acrescentar barril abaulado com 18 aduelas/aros, caixas antigas abertas/fechadas e tábuas partidas com espessura e ferragens.
- [x] Integrar neve de copa por envelopes de ramos, slots/exposição/vento e descarte, com orçamento de refinamento menor que o das rochas.
- [x] Integrar as cinco plantas à distribuição editável; iniciar com seis abetos densos e manter alternativas leves para fundo.
- [x] Compactar as nove prévias offline em PNG embutido em SVG local; atualizar guias e resumos.

Catálogo de **202 assets**: nove peças novas, sem alterar os arquivos dos 193 anteriores. Árvores com duas malhas e menos de 65 mil triângulos; neve em uma malha adicional. Prévia de cada árvore caiu de aproximadamente 2 MB para 12–14 KB. Guia e nomes para busca: [docs/WINTER_DETAIL.md](docs/WINTER_DETAIL.md).

Validação: 152 testes offline de domínio/geometria/integração passaram, excluindo `server.test.js` que abre portas. Quatro testes novos cobrem fechamento/orientação, buffers completos, bounds/base/seed, volume da copa, orçamento, vãos por raycast, abaulamento do barril, prévias PNG válidas/compactas, slot/exposição/descarte da neve e autoria/histórico/duplicação/projeção. Após a inspeção, corrigidas tampas dos ramos, buffers de normais após acrescentar vértices, tábuas/cantos da caixa, aros que entravam na madeira e suporte de neve mais suave. Após os últimos ajustes, 18 testes afetados (catálogo/paisagem/rocha/neve/novas peças) e os builds local/Pages passaram novamente; os 202 modelos e 202 prévias foram conferidos idênticos a public nos dois builds. Inspeção geométrica/CPU das nove peças em `test-results/winter-detail-catalog-cpu.png`; não é captura PBR do site.

Comparação GPU seca/nevada e descarte concluídos: um teste de navegador aprovado, com capturas reais em `test-results/winter-detail-dry.png` e `winter-detail-snow.png`. Recorte nevado: 20 chamadas, 159.152 triângulos, cinco texturas; depósitos de copa com 9.176/8.380 triângulos. O roteiro reaplicava o shader aos mesmos materiais e foi corrigido para evitar a falsa falha de folhagem. A autenticação da revisão automática voltou a funcionar. Mapa reconstruído e revisão no renderizador concluídos no incremento acima; benchmark presencial continua futuro.

## Base técnica de rocha e neve orgânicas — implementada

- [x] Formações orgânicas separadas das geometrias antigas, fraturas/erosão em três dimensões e dois assets próprios.
- [x] Padrão mineral com variação espacial ampla, preservando materiais anteriores.
- [x] Depósitos conectados de neve com espessura/vento; parâmetros opcionais, editor e altura de apoio do terreno.
- [x] Queda de neve corrigida, variação de flocos, deriva e rajadas no emissor GPU.
- [x] Prévia real ausente do outro exemplo corrigida e diagnósticos de assets acrescentados.

A base passou anteriormente por 163 testes unitários/de integração e sete roteiros de navegador (geometria/neve, editor/Pages/projetor e regressão de paisagem/IndexedDB). Os últimos ajustes foram depois conferidos nos testes de domínio e nos três E2E de rocha/neve/precipitação, junto da reconstrução acima. Guia: [docs/ORGANIC_WINTER.md](docs/ORGANIC_WINTER.md).

Pendências reais do objetivo visual: materiais autorais/fotográficos/desgaste regional, pintura localizada de depósitos nas rochas, aceitação visual do novo mapa e benchmark presencial. Servidor/Pages e novas peças já foram conferidos no navegador. Simulação contínua de depósito/derretimento e LOD/instanciamento entre árvores não estão implementados. Paridade visual com a referência ainda não foi atingida nem declarada.

## Rocha orgânica e reconstrução completa — histórico do planejamento

- [x] Reavaliar a entrega após a rejeição visual do usuário; separar funcionamento de semelhança com a referência.
- [x] Investigar os geradores de rocha, terreno, neve, vegetação e clima; verificar as 19 receitas usadas pelo exemplo.
- [x] Elaborar sequência, contratos afetados e critérios visuais em [docs/ORGANIC_WINTER_PLAN.md](docs/ORGANIC_WINTER_PLAN.md).

O usuário considerou a cena insatisfatória: paredões com ondas regulares, neve uniforme/sem tempestade, vegetação rala, galhos cilíndricos e objetos pouco legíveis. O código confirma faixas horizontais repetidas nos paredões, rampa quase uniforme, neve geométrica feita de prismas por triângulo e clima desligado no exemplo. A opção de neve já existe no emissor, mas o shader dá a ela o sentido vertical das partículas ascendentes.

Auditoria desta etapa: 19 receitas distintas instanciadas sem erro ou vértices não finitos; no navegador local, os 19 arquivos responderam HTTP 200, sem aviso de falha ao carregar a cena. A atmosfera reportou zero partículas e clima `none`. Houve HTTP 404 na prévia `scenes/icewind-bridge.jpg` do outro cartão da galeria, separado dos modelos desta cena. O catálogo tem caixa de madeira e tambor industrial, mas a montagem não contém caixas/barris. Falhas dos objetos no ambiente relatado pelo usuário ainda precisam de reprodução; esta auditoria não validou novamente o Pages. O roteiro de auditoria foi corrigido para aceitar a confirmação de descarte da cena vazia inicial.

Próximo marco: paredão orgânico com material detalhado, preservando escultura manual e mapas antigos. Depois: depósitos de neve conectados/tempestade, abeto volumoso/galhos naturais/caixas e barris de madeira, e reconstrução integral da cena. Comparar recortes no renderizador antes de ampliar o mapa; testes funcionais não substituem aceitação visual. Esse foi o estado no diagnóstico inicial. Rocha/neve orgânicas e vegetação/objetos detalhados foram implementados nos incrementos acima; a reconstrução da composição foi entregue no incremento acima.

## Revisão anterior · subida, caverna e lanternas — entrega funcional, objetivo visual não atingido

- [x] Identificar a corrente interrompida e corrigir a leitura da referência: encosta ascendente, caverna lateral e ponte elevada.
- [x] Acrescentar lanterna arredondada e entrada de caverna com vão real; corrigir a corrente da lanterna existente.
- [x] Distribuir a montagem anterior com relevo ascendente e encaixes; revisar suas câmeras e prévia. O acabamento foi rejeitado e substituído pela reconstrução acima.
- [x] Validar geometria, apoios, carregamento/Pages e persistência; sincronizar guias e resumos.

A revisão tem 85 elementos em 40 × 58 m, com subida de aproximadamente dez metros, três lanternas circulares e cinco câmeras. Suportes encaixados por raycast na geometria dos paredões/ruínas; luzes posicionadas nos núcleos. Suíte final de 159 testes de domínio/integração aprovada; os cinco testes do exemplo passaram novamente depois de afastar a torre do acesso à ponte e limitar os pilares abaixo das vigas. Verificados encaixes dos suportes/luzes, subida, passagem da ponte livre de alvenaria e vazio da caverna. Quatro cenários E2E afetados aprovados: exemplo no servidor, exemplo no Pages, catálogo/importação/salvamento/projetor sob /Tabletop/ sem API e repositório IndexedDB/conflitos. Após os últimos ajustes da ponte e do paredão da caverna, os cinco testes do exemplo e o fluxo completo do exemplo no Pages passaram novamente. Cópias independentes, edição/histórico, salvar/reabrir e câmera do projetor independente verificados. A suíte completa de navegador não foi repetida.

A montagem anterior foi interpretada como vale/corredor e foi substituída no exemplo distribuído. Cópias pessoais já salvas permanecem independentes. A revisão usa entidades comuns e dois assets originais; a caverna é um abrigo modular com teto, laterais e fundo, sem alterar o contrato de uma altura por X/Z do terreno.

Capturas finais revisadas: `test-results/mountain-example-reference.png` e `test-results/mountain-example-cave.png`; prévia real atualizada em `public/scenes/snowy-mountain-pass.jpg`. Builds local/Pages aprovados após incluir a prévia final; JSON, modelos e imagem conferidos idênticos a public nos dois builds. Recorte com movimento reduzido: 156 chamadas de desenho, 222.058 triângulos e 17 texturas. Sem benchmark presencial. O acabamento continua estilizado; materiais autorais, desgaste/neve regional, vegetação densa e contato/reflexos continuam no plano de [docs/EXAMPLE_SCENES.md](docs/EXAMPLE_SCENES.md). Jukebox/Ficha permanecem adiados. Guias e três relatórios de progresso sincronizados.

## Cena de exemplo · primeira montagem — histórico, substituída pela revisão acima

- [x] Compor terreno nevado, leito e rio, paredões, ruínas, madeira, vegetação e enquadramentos com entidades comuns/editáveis.
- [x] Disponibilizar exemplo em Abrir como cópia independente, com prévia real e caminhos compatíveis com Pages.
- [x] Revisar a composição no renderizador, corrigir montagem e verificar apoios, persistência e projetor.
- [x] Sincronizar documentação e registrar limitações e próximos passos constatados na cena.

Montagem revisada com 93 elementos, cinco câmeras e seis pastas. Um asset de ruína alta foi acrescentado para evitar esticar as fiadas da torre pequena; os 188 assets anteriores mantêm arquivos e IDs. O original distribuído fica separado das cenas pessoais; carregar cria um rascunho novo sem sobrescrever documentos. Validação final: suíte de 157 testes unitários/de integração, builds local/Pages e quatro cenários E2E afetados aprovados: exemplo no servidor, exemplo no Pages, fluxo anterior de Pages/imports/projetor e repositório IndexedDB/conflitos. Os três testes do novo arquivo foram repetidos após distribuir a neve entre volume próximo e cobertura visual de fundo. Verificados terreno/leito, referências locais, determinismo, janela real da nova ruína, cópias independentes, edição/undo/redo, salvar/reabrir, original preservado, erro de fetch sem perder a cena, URLs sob /Tabletop/ sem API e câmera independente do projetor. Galeria de 390 px revisada em `test-results/example-gallery-mobile.png`. A suíte completa de navegador não foi repetida.

As primeiras execuções ajustaram comparação de câmera para tolerância numérica, espera pela lista assíncrona e indicador de alterações oculto no cabeçalho compacto. O cartão recebeu limites de largura e a verificação espera o reposicionamento da janela ao mudar de tamanho. A execução animada simultânea ficou pesada em SwiftShader; os fluxos completos passaram com movimento reduzido, sem alterar o JSON da cena. O teste da suíte pelo sandbox não abriu portas; a chamada direta autorizada de `node --test` passou.

Captura revisada: `test-results/mountain-example-reference.png`; prévia real em `public/scenes/snowy-mountain-pass.jpg`. Neve com volume concentrada no primeiro plano: recorte passou de 208 chamadas/433.856 triângulos para 170 chamadas/279.944 triângulos, com 15 texturas, sem benchmark presencial. A composição permanece estilizada; plano de edição incremental, materiais/desgaste regional, vegetação e contato/água em [docs/EXAMPLE_SCENES.md](docs/EXAMPLE_SCENES.md), comunicado antes de implementar novas ferramentas.

## Escultura direta nas superfícies — concluída

- [x] Pincel por raycast em rochas/paredões, incluindo faces verticais e topo; conservar controles paramétricos.
- [x] Elevar/rebaixar, projetar/recuar, suavizar e aplainar; cursor orientado pela superfície, prévia durante arraste e um traço por undo.
- [x] Persistir traços locais, refinar a malha com orçamento fixo, conservar escala/rotação/material/neve e cancelar sem gravar.
- [x] Unificar ativação T para terreno/rocha, permitir trocar a superfície apontada sem forçar o terreno selecionado e tornar o pincel visível nas propriedades.
- [x] Validar deformação/limites, histórico/mapas/Pages/projetor, recursos e revisar um recorte; sincronizar guias e resumos.

Validação final: 154 testes unitários/de integração, builds local/Pages e cinco cenários E2E afetados passaram: editor/projetor, dois de Pages/IndexedDB, pixels/descarte e regressão de pintura/terreno. Verificados topo/face, troca de superfície, cancelamento, undo/redo, duplicação, salvar/reabrir e ativação T com apenas rochas em composição ancorada, sem terreno. Cache CPU limitado a seis templates, com clones independentes e prune/destruição, validado. Captura revisada: `test-results/rock-sculpt-editor.png`. A suíte completa de navegador não foi repetida neste incremento; Chromium/WebGL por software verifica funcionamento, sem estabelecer desempenho no hardware real. Uso e limites: [docs/ROCK_SCULPT.md](docs/ROCK_SCULPT.md).

A escultura de malha mantém a topologia fechada do asset; não é um sistema de voxels, união booleana ou abertura de cavernas. Pintura de camadas/água conserva o fluxo de terreno. O objetivo imediato é desenhar e corrigir formas locais diretamente nas superfícies, inclusive onde a seed atual abaixa um pico.

## Paredões e kit de montanha — concluído

- [x] Malhas próprias de paredão/pináculo, com faces verticais, topo quebrado e saliências/reentrâncias reais. As quatro rochas anteriores conservam sua geometria.
- [x] Controles de saliências, camadas e erosão por instância; campos opcionais validados, histórico, materiais/neve e dimensões/base conservados.
- [x] Quatro formações geológicas e oito complementos de ruínas/madeira/cordas/lanterna/raízes/destroços, com materiais locais e prévias. Catálogo de 188 assets; os 176 arquivos anteriores permanecem iguais.
- [x] Validar fechamento/orientação/raycast, vãos, escala, apoio da plataforma, GPU, edição/salvamento/projetor e GitHub Pages; revisar recorte e conjunto das peças.
- [x] Sincronizar guias, arquitetura, visual target e os três resumos, separando entregas de pendências.

Validação final: 150 testes unitários/de integração, builds local/Pages e cinco cenários E2E afetados passaram. GPU/pixels/descarte foi repetido após conferir o seed da segunda face do canto e acrescentar a prévia conjunta das 12 peças. Verificados extremos, malhas fechadas e orientadas, tampas sem T-junctions, faces inferiores reais, bounds/base, determinismo e concordância entre prévia/instância padrão; janela e interior vazados, elos vazados, tabuleiro com apoio; edições inválidas atômicas, undo/redo/reset/duplicação/mapas/JSON, salvamento/reabertura e projetor com câmera independente. Pages coloca/edita/persiste o novo paredão sem API. As oito peças complementares usam até quatro draw calls cada no recorte isolado e liberam geometria ao remover.

Capturas revisadas: `test-results/mountain-kit.png` (editor, ruína/neve/plataforma) e `test-results/mountain-kit-catalog.png` (12 peças). A revisão levou a camadas com alturas/projeções variadas, fissuras e blocos angulares de alvenaria. O primeiro fixture foi corrigido para ambiente completo; o roteiro antigo de montanha excedeu o tempo quando dois navegadores estavam concorrendo, e passou em sequência (125 s). A suíte completa de navegador não foi repetida neste incremento. Chromium/WebGL por software verifica funcionamento, sem estabelecer desempenho no notebook/projetor reais.

Uso e limites em [docs/MOUNTAIN_KIT.md](docs/MOUNTAIN_KIT.md). Paredões continuam cenográficos; terreno mantém uma altura por X/Z. Lanternas exigem luz local e cordas são estáticas. Materiais fotográficos/decals, montes locais de neve e acabamento de contato/água seguem próximos incrementos; as novas peças foram retiradas das lacunas do visual target. Ficha/Jukebox continuam adiados.

## Consistência dos demais painéis e animações — concluída

- [x] Agrupar Cena em Atmosfera, Câmera e apresentação, Elementos e documento, com tarefas recolhíveis.
- [x] Padronizar indicadores e títulos recolhíveis também nas propriedades de objetos e luzes, conservando abertura, foco e rolagem nas edições.
- [x] Trocar fade de entrada por transições controladas de 100 ms na abertura e 80 ms no fechamento de Assets/Abrir; permitir reabertura durante a saída e respeitar movimento reduzido.
- [x] Preservar o painel de edição ao importar assets, restaurar foco/rolagem em composições e cancelar fades em curso ao ativar movimento reduzido.
- [x] Validar navegação, fechamento/reabertura, propriedades, histórico e câmera no navegador; sincronizar guias e resumos.

Validação final: 147 testes unitários/de integração e builds local/GitHub Pages passaram na versão final. Os 25 cenários E2E foram aprovados entre a suíte completa e repetições dos fluxos afetados. A suíte inicial aprovou 23/25: controles principais de Água/Gelo passaram a iniciar abertos e o roteiro Pages abre explicitamente a tarefa; o teste de recursos passou a esperar o frame do mestre antes de medir texturas, independentemente do projetor. A repetição de oito cenários aprovou sete; a nova asserção de importação foi corrigida para comparar a aba realmente selecionada após recarregar (Construir), e a biblioteca passou na repetição final.

Verificados: grupos/tarefas de Cena, abertura por teclado, estado conservado nas edições e trocas de aba, propriedades de objetos/luzes/composições, histórico, câmera do projetor independente, importação sem trocar o painel de edição, janelas com fade de 100/80 ms, saída sem interação, cancelamento/reabertura durante fechamento, foco devolvido, limites de Abrir, telas de 390 px e movimento reduzido. Fades de tarefas não reiniciam ao editar parâmetros. Capturas revisadas: `test-results/panel-consistency.png` e `panel-consistency-mobile.png`. Guia atualizado: [docs/EDITOR_UI.md](docs/EDITOR_UI.md), com os caminhos de câmera, iluminação, ambientes e assets sincronizados. Testes de navegador em Chromium/WebGL por software; servidores locais executados fora do sandbox após `listen EPERM`.

## Reformulação dos fluxos de edição — concluída

- [x] Construção organizada por contexto (Paisagem, Construções, Personagens e Organização), com feedback da ferramenta ativa.
- [x] Assets e Abrir em janelas flutuantes arrastáveis, utilizáveis por teclado e ajustadas à tela.
- [x] Alcance explícito dos materiais: camada selecionada versus base do terreno, com edição e pintura acessíveis.
- [x] Água integrada ao pincel: contorno comum e leito rebaixado em uma transação; ajuste revisável para água existente.
- [x] Legibilidade, foco, telas estreitas e animações curtas com respeito a movimento reduzido.
- [x] Validar histórico, persistência, câmera independente e fluxos no navegador; atualizar guias e resumos.

Validação final: 147 testes unitários/de integração passaram; builds local e GitHub Pages passaram. Os 24 cenários E2E foram aprovados entre a suíte completa e repetições dos casos afetados. A suíte inicial teve 21/24: dois roteiros foram adaptados à nova navegação (biblioteca que fecha ao escolher e tamanho do terreno em seção própria); o novo roteiro ganhou espera da abertura assíncrona e revelou a sobreposição dos painéis em tela estreita, corrigida e validada. A repetição de oito casos aprovou sete antes da correção estreita; os quatro casos finais (UI, biblioteca e dois de Pages) passaram na versão final.

Verificados: alteração de textura/padrão de uma camada sem mudar base, outras camadas ou máscaras; janelas com arraste/setas, foco/fechamento e documento/câmera intactos; pincel de água com proposta/cancelamento, leito abaixo de ondas/neve, apoios e rejeição atômica de dependentes bloqueados, undo/redo, ajuste de água existente e salvamento/reabertura; painéis exclusivos em 390 px, restauração de desktop, ausência de overflow horizontal, limites das janelas e movimento reduzido. Pages conservou catálogo/importação/armazenamento/projetor sem API. Capturas revisadas: `test-results/editor-ui.png`, `editor-ui-assets.png`, `editor-ui-mobile.png` e `editor-ui-mobile-assets.png`.

Guia e limites: [docs/EDITOR_UI.md](docs/EDITOR_UI.md). Água usa nível horizontal, resolução do terreno e contornos de até 64 vértices, sem união automática entre traços. Não há benchmark presencial; WebGL por software verifica funcionamento. Ficha/Jukebox continuam adiados.

## Conflitos com o navegador — concluído

- [x] Bloquear menu nativo por captura na área 3D, incluindo overlays, e padrões de botões direito/meio no canvas.
- [x] Disponibilizar Tela cheia no editor com Keyboard Lock de WASD e suas combinações, preservando Esc para saída e liberando captura ao sair.
- [x] Avisar quando captura é recusada ou indisponível; Page Down desce sem Ctrl.
- [x] Validar build, testes e E2E de câmera com Shift + mouse, fullscreen e captura recusada/ausente.

Validação: build, 98 testes unitários/de integração e E2E de câmera passaram. O E2E confirmou Shift durante navegação e arrastes, cancelamento de contexto no canvas/overlays, fullscreen real, foco no canvas, solicitação de captura WASD, liberação ao sair e avisos de recusa/ausência de API, além da publicação independente. A janela do mestre é trazida à frente antes de solicitar fullscreen após o teste do projetor.

Limite: preventDefault sozinho não garante bloquear Ctrl+W em uma aba normal. Captura real depende de fullscreen iniciado pelo botão, suporte/permissão do Chrome e teclas permitidas pelo sistema operacional. E2E headless simula a fronteira de permissão de Keyboard Lock; validação dessa permissão e atalhos reservados no Chrome com interface permanece presencial.

## Ctrl combinado com navegação — concluído

- [x] Dar prioridade a Ctrl+WASD na perspectiva com foco no canvas, bloqueando atalhos do navegador/editor sem limpar o movimento.
- [x] Preservar Shift durante descida e manter atalhos de edição fora desse contexto.
- [x] Validar Ctrl antes/depois de WASD, teclas repetidas, foco e atalhos de edição; atualizar os resumos.

Validação: 98 testes unitários/de integração, build e E2E de câmera passaram. O navegador confirmou deslocamento e descida simultâneos com Ctrl+A/D/S/W, cancelamento dos padrões do navegador inclusive nas repetições, movimento preservado ao soltar Ctrl, Ctrl direito + Shift com W já pressionado, documento inalterado durante navegação, Ctrl+A em campo de texto e Ctrl+S fora do canvas. A câmera publicada permanece independente.

## Ajustes dos controles de câmera — concluídos

- [x] Identificar interrupção de WASD ao iniciar controles do mouse e seleção pelo evento de contexto.
- [x] Preservar navegação durante zoom, pan e órbita; selecionar com botão direito somente no release sem arraste.
- [x] Adicionar Espaço/Ctrl para subir/descer na perspectiva, preservando atalhos de edição.
- [x] Validar regressões no navegador, testes e build; sincronizar documentação.

Validação deste ajuste: 98 testes unitários/de integração, build e E2E de câmera passaram. O navegador verificou WASD durante roda/pan/órbita e após soltar o mouse, ausência de seleção/menu no press e em arrastes que retornam ao ponto inicial, seleção/menu no release, Espaço e ambos os Ctrl na perspectiva e Ctrl+D preservado. O mesmo E2E confirmou novamente foco, transições, persistência e publicação independente. Servidores locais/Chromium executados fora do sandbox após bloqueio de loopback (`listen EPERM`).

## Câmera cinematográfica — incremento concluído

- [x] Ler contexto de arquitetura, imersão, autoria, roadmap e relatórios; conferir renderer, atalhos e publicação.
- [x] Navegação WASD relativa à câmera, aceleração/desaceleração suaves e Shift para movimento rápido; Page Up/Down altera altura.
- [x] Resolver conflito: G mover, R girar e V escalar; instruções da interface atualizadas.
- [x] Transições suaves entre enquadramentos, duração configurável, interrupção e corte imediato.
- [x] Controle de lente e navegação também na vista superior.
- [x] Projetor independente, com transições somente após publicação explícita e sem reinício ao editar conteúdo.
- [x] Validar comportamento com testes e build; documentar controles e limites.

Validação: 97 testes unitários/de integração, build e oito E2E passaram. O E2E de câmera foi repetido após a revisão final e também confirmou WASD na apresentação na mesma janela, restauração da câmera de trabalho e publicação do ponto apresentado ao voltar à edição. Chromium headless com WebGL por software; avaliação no notebook/projetor real permanece pendente. Controles/limites documentados em [docs/CAMERA.md](docs/CAMERA.md).

Último ajuste validado com build e E2E de câmera: transições atualizam lente/frustum sem redimensionar o buffer de desenho quando o viewport conserva seu tamanho. Captura final: `test-results/camera-controls.png`.

## Iluminação e imersão avançada — concluída

- [x] Conferir arquitetura, especificação de imersão e implementação atual; preservar os ajustes locais de câmera.
- [x] Luz spot editável (direção, cone, penumbra, alcance e sombras) e temperatura Kelvin com cor reproduzível.
- [x] Flicker determinístico com seed, amplitude/frequência e pausa, sem gravar frames no histórico.
- [x] Fog de distância, névoa volumétrica por altura e bloom opcional, com controles e descarte de recursos GPU.
- [x] Validar comandos, persistência, projeção, renderização e fluxos pela interface; sincronizar os relatórios.

Validação final em 4 de outubro: build de produção, 107 testes unitários/de integração e os dez E2E passaram. Os dois E2E de iluminação foram repetidos após o ajuste final de rotação numérica, confirmando que o yaw conserva a inclinação do spot. Verificados: edição, Kelvin/cor, animação sem mudar documento/histórico, pausa/movimento reduzido, fog/volume/bloom, descarte de buffers, qualidade e câmera independentes do projetor e fidelidade após reiniciar navegador/servidor. Pixels WebGL confirmam limite de profundidade, câmeras perspectiva/ortográfica, distância máxima do volume e limiar de bloom. Uso e limites: [docs/LIGHTING.md](docs/LIGHTING.md).

Spots, Kelvin, flicker, fog de distância, névoa por altura e bloom saíram das pendências. A névoa volumétrica entregue é uma camada homogênea limitada pela geometria opaca; feixes e sombras volumétricas continuam futuros. A avaliação presencial no notebook/projetor permanece necessária.

## Ambientes, horários e clima — concluídos

- [x] Conferir os limites atuais: controles da luz principal escondidos no inspetor e presets restritos a fundo/preenchimento/luz.
- [x] Expor sol/lua, temperatura, intensidade, direção e HSV na aba Cena.
- [x] Presets de dia, tarde, noite, neblina, chuva, pântano e calor; céu com sol/lua, estrelas e nuvens editáveis.
- [x] Chuva e partículas em região configurável, com animação determinística, pausa e qualidade local.
- [x] Vínculos de dia/noite para materiais e luzes, incluindo janelas acesas, sem modificar assets compartilhados.
- [x] Biblioteca de ambientes personalizados no servidor, reutilização independente da cena e prévia/diff.
- [x] Validar histórico, dados, sigilo, reinício e projetor independente; sincronizar os relatórios.

Referências visuais fornecidas pelo usuário: tarde alaranjada e noite azul com lua/janelas acesas. Essas imagens orientam comportamento e composição; não estabelecem a implementação interna da ferramenta de referência. Controles e limites: [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

Validação final: Build de produção, 118 testes unitários/de integração e os 12 roteiros E2E verificados com sucesso. Após corrigir o encerramento da órbita durante animação contínua, os roteiros de câmera, autoria e ambientes foram repetidos e passaram. Verificados controles diretos, materiais por slot/instâncias independentes, janelas/luzes por horário, biblioteca e snapshots após reiniciar, prévia local/aceite, pausa/movimento reduzido, qualidade local, enquadramento de céu sem publicar câmera e pixels WebGL de sol/lua, nuvens e chuva. Capturas em `test-results/environment-afternoon.png`, `environment-night.png` e `environment-night-sky.png`.

Revisão final validada: importar um EnvironmentDocument não substitui a mesa; store/histórico e recibos de salvamento rejeitam o tipo de documento incompatível sem alterar cena ou histórico. A suíte de 118 testes e os dois E2E de ambientes passaram novamente após essa proteção.

Biblioteca de ambientes e emissor global de clima/partículas saíram das pendências. Múltiplos emissores associados a objetos/áreas, colisão de partículas, feixes/sombras volumétricas e benchmark presencial permanecem futuros.

## Biblioteca — terceira ampliação concluída

- [x] Inspecionar pipeline: receitas de primitivas em `scripts/generate-library.js`/`library-expansion.js`, pivot na base, footprints/apoios e prévias SVG.
- [x] Adicionar 34 assets originais em `scripts/library-expansion-3.js` (casarão/sótão, asilo/necrotério, cemitério, rua, rural, comércio e investigação), sem alterar materiais nem modelos existentes.
- [x] Regenerar catálogo/modelos/prévias e revisar visualmente as prévias; sincronizar contagens (161 assets, 155 além do kit) na documentação.

Validação: 107 testes unitários/de integração, build e E2E da biblioteca (paginação completa com 161 cards) passaram. A regeneração apenas acrescentou registros ao catálogo; os 127 modelos/prévias anteriores ficaram idênticos.

## Revisão das pendências e referências visuais — concluída

- [x] Remover recursos entregues da seção de pendências do relatório detalhado; corrigir as menções antigas a três presets para os oito atuais.
- [x] Comparar as sete imagens fornecidas com os recursos e limites do código, distinguindo conteúdo visual, ferramentas de autoria e acabamento de renderização.
- [x] Registrar lacunas e uma ordem recomendada com critérios de conclusão em [docs/VISUAL_TARGET.md](docs/VISUAL_TARGET.md); sincronizar os três arquivos de progresso.

Resultado: a maior diferença visual está nos modelos/materiais detalhados e na composição. GLBs estáticos texturizados permitem começar um interior piloto com a base existente. Na análise inicial, texturas para estruturas/terreno, prefabs de usuário, distribuição de vegetação, miniaturas 3D pela interface, poças e efeitos locais foram apontados como trabalho futuro; materiais e emissores por objeto são tratados no incremento abaixo.

Validação desta revisão: consistência das seções e links locais da documentação; nenhum código alterado. As contagens de testes acima registram as validações anteriores.

## Materiais texturizados e efeitos locais — concluídos

Plano de implementação autorizado em 4 de outubro:

1. [x] Biblioteca local de madeira, pedra, grama, metal, areia, tijolo, concreto e lama, com cor, rugosidade e relevo aparente; aplicação em estruturas/objetos por material e mistura nas camadas do terreno.
2. [x] Controles de material, escala e relevo no inspetor, preservando documentos antigos, histórico, duplicação e apresentação.
3. [x] Fogo e fumaça vinculados a objetos, com partículas animadas, luz do fogo, limites de custo, pausa e qualidade por janela.
4. [x] Validar domínio, renderização real no navegador, edição/salvamento/projetor e descarte; documentar uso e atualizar as pendências reais.

Validação final: build e 123 testes unitários/de integração passaram, assim como a suíte completa de 14 E2E. Após revisar acabamento por material, veios/filtro das texturas e seleção da fumaça, os cinco E2E de ambientes, materiais/efeitos e pintura do terreno passaram novamente. Os dois E2E de materiais/efeitos foram repetidos após o último ajuste de composição das chamas e preservação dos overrides de cena, e passaram.

Verificados: oito materiais com pixels distintos, mistura no terreno, isolamento de cor/acabamento por material, prioridade de overrides, colocação/duplicação, animação sem editar histórico, pausa/movimento reduzido, qualidade por janela, câmera publicada independente e fidelidade após reiniciar navegador/servidor. Atlas e recursos dos emissores têm descarte verificado. Captura revisada: `test-results/materials-fire-smoke.png`. Servidores locais/Chromium executados fora do sandbox após bloqueio de loopback (`listen EPERM`); WebGL por software, sem benchmark presencial. Uso e limites: [docs/MATERIALS.md](docs/MATERIALS.md).

Texturas em estruturas/objetos, mistura no terreno e emissores de fogo/fumaça por objeto ficam nas entregas. Importação de texturas avulsas/fotográficas, decals, múltiplas regiões de chuva/poeira/brasas e colisão continuam como pendências reais.

## Personalização dos materiais — concluída

Pedido de 4 de outubro de 2026: tornar o desenho e a cor das texturas editáveis. Plano: controles de recoloração, brilho, contraste, saturação e rotação; quantidade/orientação/juntas/veios da madeira; padrões e desgaste do metal; densidade e seed das demais superfícies. Os ajustes serão opcionais para preservar documentos existentes e estarão disponíveis em materiais e camadas do terreno.

Entregue: recoloração preservando detalhes, paleta original/multiplicação, brilho/contraste/saturação, rotação, densidade e seed; madeira com tábuas por repetição, orientação, juntas/veios, madeira contínua e parquet; metal escovado/liso/xadrez/ondulado/enferrujado e oxidação. Controles por material e camada do terreno; opções avançadas conservam sua abertura durante a edição. Campos opcionais preservam documentos antigos, máscaras, histórico, duplicação/mapas, JSON, salvamento e projetor.

Atlas personalizados compactos compartilham desenhos equivalentes e são liberados ao descartar seu último material; cache CPU limitado a 32 tiles. Cor e orientação usam parâmetros de shader. Uso e limites em [docs/MATERIALS.md](docs/MATERIALS.md); roteiro manual em [docs/TESTAR_CONSTRUCAO.md](docs/TESTAR_CONSTRUCAO.md).

Validação final: build, 126 testes unitários/de integração e três E2E afetados passaram. Os oito testes específicos e dois E2E de materiais/efeitos foram repetidos após a revisão final e passaram. Pixels WebGL verificam recoloração verde, escurecimento, saturação zero, padrões distintos de madeira/metal, compatibilidade sem os novos campos, base com oito camadas personalizadas e descarte. UI verifica controles, desfazer/refazer, máscaras, reinício/salvamento, projetor e câmera independente. Captura revisada: `test-results/custom-materials.png`. WebGL por software; sem benchmark presencial. Resumos PROGRESSO.md e docs/PROGRESSO.md sincronizados.

## GitHub Pages — concluído

Pedido de 4 de outubro de 2026: corrigir assets ausentes e permitir uso normal em hospedagem estática. Diagnóstico: caminhos absolutos apontam à raiz do domínio e a biblioteca/persistência dependem de `/api/tabletop`, que só existe no servidor Node local. Plano: caminhos relativos ao diretório publicado, repositório IndexedDB para cenas/mapas/ambientes/assets/classificação, manutenção do backend local, build/workflow do Pages e teste de navegador servindo apenas arquivos em subdiretório.

Entregue: base relativa do build e resolução de catálogo/assets/favicons/projetor no diretório publicado; biblioteca IndexedDB para cenas/mapas/ambientes/imports/classificação, com validação de documentos/referências, revisões e conflitos entre abas, transações com backups limitados e URLs Blob temporárias recriadas ao reabrir. Biblioteca, rascunhos e última cena ficam isolados por origem/diretório; UI identifica salvamento no navegador. O modo com API Node continua disponível. Build estático em dist-pages/, preview e workflow de GitHub Pages prontos.

Validação final: builds local e estático, 127 testes unitários/de integração e quatro E2E afetados passaram (Pages/IndexedDB, biblioteca e recuperação local). O teste estático serviu arquivos em /Tabletop/ sem API, verificando paths HTTP, previews/modelos, imports PNG/GLB, cenas/mapas/ambientes, salvamento após fechar/reabrir navegador, projetor/câmera independente e isolamento em outro diretório/raiz. Transações verificaram conflitos de documentos/classificação, refs inválidas, backups limitados e rollback em falha de espaço. Os 161 modelos e suas prévias estão presentes no build. Captura: test-results/github-pages.png. Chromium/WebGL por software; sem benchmark presencial.

Uso/publicação e limites em [docs/GITHUB_PAGES.md](docs/GITHUB_PAGES.md); README/arquitetura e resumos PROGRESSO.md/docs/PROGRESSO.md sincronizados. Workflow validado localmente; envio do código e seleção de GitHub Actions em Settings → Pages são necessários para atualizar a publicação online. Dados pessoais ficam neste navegador; transporte de cena+assets e sincronização entre computadores continuam fora desta entrega.

## Pendências atuais

Somente trabalho ainda não concluído. A prioridade visual está em [docs/ORGANIC_WINTER_PLAN.md](docs/ORGANIC_WINTER_PLAN.md), complementando [docs/VISUAL_TARGET.md](docs/VISUAL_TARGET.md).

- Obter aceitação visual do novo mapa; refinar os pontos concretos identificados nessa revisão.
- Materiais autorais/fotográficos, pintura livre/múltiplas marcas de desgaste e depósitos locais editáveis nas rochas. Desgaste procedural regional já disponível.
- Medir edição/renderização no notebook/projetor reais; otimizar conforme os resultados.
- Expansão de conteúdo autoral/decoração e miniaturas estáticas para o mapa piloto; avaliação visual em câmera próxima.
- Texturas fotográficas específicas, importação de texturas avulsas/variantes e decals de desgaste/sujeira.
- Pincel regional de distribuição e entulho; umidade, reflexos dos objetos na água e refinamento da neve em apoios anotados de props/pisos/gelo.
- Fluxo dedicado de miniaturas 3D vinculadas a personagens/tokens; rig, poses e animação como evolução posterior.
- Acabamento de contato/reflexos e otimizações para cenas densas (LOD, instanciamento e particionamento/streaming), conforme medição.
- Acompanhamento automático de tokens; caminhos de câmera e colisão com paredes.
- Avaliação presencial do movimento/legibilidade no notebook e projetor.
- Pacote único de cena + assets (opcional).
- Receitas e prefabs adicionais e auto-layout entre cômodos.
- Coleções/variantes de assets, sockets específicos por asset e glTF com texturas externas.
- LAN, conforme [roadmap](docs/ROADMAP.md). Integrações Ficha/Jukebox adiadas por orientação do usuário.
- Volumetria com sombras/espalhamento por luz, múltiplas regiões de chuva/poeira/brasas, colisão de partículas e efeitos adicionais dependentes de benchmark.

## Integração das alterações remotas — concluída

Os quatro commits remotos foram integrados preservando a remoção de data/ do .gitignore. A base relativa continua atendendo /Tabletop/ e outros diretórios. O workflow antigo foi substituído pelo pages.yml, evitando duas publicações concorrentes e mantendo Node 22, build:pages e persistência no navegador. Validação: build:pages e os 127 testes unitários/de integração passaram após a resolução dos conflitos. Integração registrada em um merge, preservando os históricos local e remoto.

## Análise do primeiro mapa de montanha — concluída

Referência e prioridades registradas em docs/VISUAL_TARGET.md. O piloto atual substitui a prioridade anterior de escritório: trilha, ruína, paredão e pinheiros. Lacunas apontadas nesta análise: kit detalhado de montanha/arquitetura antiga, neve acumulada/material próprio, água, distribuição de vegetação e prefabs. Material de neve e cobertura visual foram entregues no incremento de composição abaixo; volume físico continua futuro. Pintura branca, terreno esculpido, estruturas, importação GLB, névoa e iluminação já permitem uma primeira versão simplificada. Jukebox e Ficha ficam adiados. Revisão documental; nenhum recurso novo implementado ou teste de código executado nesta análise.

## Composição de terreno e rochas — concluída

Plano autorizado: acrescentar rocha natural e neve ao acervo procedural; distribuir camadas do terreno por inclinação/altura com transições e variação em metros; aplicar cobertura independente (por exemplo neve nas faces superiores) em rochas/estruturas/GLBs. Preservar pintura manual, materiais existentes, apoios, histórico, salvamento e projetor. Validar pixels WebGL, controles e persistência antes de concluir. Este incremento melhora superfícies; água, kits detalhados e geometria de acúmulo continuam posteriores.


Entregue: dez superfícies locais, com rocha natural fraturada/estratificada/granito e neve; fissuras, densidade, seed, cor/brilho e relevo editáveis. Camadas do terreno agora alternam entre pintura manual e distribuição automática por faces superiores, encostas ou toda a superfície, com limite/transição de inclinação e altura mundial, irregularidade/tamanho de manchas/seed. Máscaras manuais, ordem/opacidade, reamostragem e apoios permanecem preservados. Cobertura independente sobre material original de estruturas/props/GLBs, por slot, com textura/cor/quantidade/relevo próprios. Normais corretas sob rotação/escala não uniforme e facetas.

Construir → Terreno e relevo → Montanha · rocha e neve cria um terreno comum com alturas, rocha, neve automática e trilha manual, sem regeneração posterior ou alteração de outras entidades. UI mantém as opções recolhíveis abertas; pintura em camada automática orienta retornar à pintura manual.

Validação final: builds local/Pages, 131 testes unitários/de integração e seis E2E afetados passaram (materiais/efeitos/UI/pixels, montanha, pintura do terreno e os dois de Pages/IndexedDB). Pixels verificam neve clara sobre base escura, laterais e faces inferiores expostas, quantidade zero, limite de altura, manchas/seed, normais transformadas e distribuição automática com máscara manual vazia. UI verifica edição, undo/redo, salvamento/reabertura, cobertura/presets no projetor sem mudar sua câmera, botão de montanha e regressão de pintura. Captura revisada: test-results/mountain-surfaces.png. A suíte completa de 17 E2E não foi repetida neste incremento; Chromium/WebGL por software não estabelece benchmark presencial.

Limites: cobertura visual sem volume físico ou teste de exposição ao céu; objetos sob teto também podem receber cobertura. Os modelos antigos de rochas conservam suas formas simplificadas; o novo kit de malhas irregulares foi entregue no incremento abaixo. Água/gelo, neve caindo, vegetação distribuída, decals e benchmark continuam pendentes. Uso em docs/MATERIALS.md; VISUAL_TARGET.md e resumos sincronizados. Jukebox/Ficha permanecem adiados.

## Geometria de rochas e paredões — concluída

Plano de 5 de outubro: acrescentar um kit original de rochas irregulares, granito, paredão estratificado e entulho; preservar todos os assets anteriores. Gerar malhas fechadas com limites de detalhe e dimensões métricas, pivot na base e prévias da própria geometria. Expor forma/irregularidade/detalhe/seed por instância, conservando transform, materiais, neve, histórico, mapas e apresentação. Validar geometria/raycast, biblioteca, edição/reabertura/projetor e Pages; atualizar visual target e resumos. Água, acúmulo físico de neve e integração Ficha/Jukebox continuam posteriores.


Entregue em 5 de outubro: quatro assets adicionais (Rocha fraturada, Matacão de granito, Paredão estratificado e Entulho rochoso), totalizando 165. Malhas fechadas e soldadas com volumes/faces irregulares, ondulações e estratos; limites de detalhe, bounds métricos, pivot na base e prévias SVG da geometria real. Todos os 161 registros/modelos/prévias anteriores permaneceram idênticos. Geometria da rocha expõe formação, irregularidade, detalhe 2–8, seed e restauração por instância. Colocação aplica rocha natural/padrão correspondente; edição conserva dimensões/base, transform, material/neve, histórico, duplicação, mapas, JSON e projeção filtrada. Cache conserva receitas; cada instância possui e descarta suas malhas/materiais.

Validação final: builds local/Pages, 134 testes unitários/de integração e sete E2E afetados passaram (montanha/UI/projetor, pixels/descarte de rochas, dois Pages/IndexedDB, biblioteca e dois materiais/efeitos). Verificados fechamento de bordas, números finitos, raycast, bounds/base com mudanças de seed/forma/detalhe, determinismo, comandos inválidos atômicos, formas diferentes em pixels WebGL, detalhe/cobertura de neve e liberação de recursos. UI verifica colocar pela biblioteca, editar/restaurar/undo/duplicar, salvamento/reabertura e geometria recebida pelo projetor sem alterar a câmera; Pages salva/reabre uma rocha personalizada sem API. Após reduzir o trabalho da geração, builds, suíte de 134 e o E2E de pixels foram repetidos; os três testes específicos passaram novamente após revisão do tratamento de falhas. Captura revisada: test-results/mountain-rock-geometry.png. A suíte completa de 18 E2E não foi repetida; WebGL por software não representa benchmark presencial.

Pendências de conteúdo: ampliar variedade/decoração, decals e neve caindo; kit alpino, água/gelo e acúmulo físico/exposição ao céu foram entregues no incremento seguinte; distribuição/LOD/instanciamento conforme medição. O novo kit é cenográfico, sem apoio automático de tokens, colisão de câmera, escultura livre ou geração de cavernas. Uso em docs/ASSET_LIBRARY.md; VISUAL_TARGET.md, README, Pages, arquitetura e resumos sincronizados. Ficha/Jukebox continuam adiados.

## Autoria de terreno natural — concluída

Revisão de 5 de outubro: distinguir alvenaria de rocha natural, esculpir relevo contínuo sem repetir assets, tornar área/expansão visíveis, apresentar a montanha como preset manualmente editável e impedir interseção com pisos existentes. Preservar alturas/máscaras/apoios, histórico, salvamento e câmera independente do projetor; verificar microrelevo em pixels e revisar documentação.

Entregue: pincel Esculpir rocha natural com formações fraturada/estratificada/granito, força, tamanho em metros e seed, variando pela posição mundial. Altera alturas comuns e apoios sem mudar pintura; repassar acumula o efeito. Área do terreno fora das opções avançadas, com expansão/recorte em metros (continua bordas, reamostra alturas/máscaras) ou alongamento explícito; centro X/Z na criação. Circular/bordas suaves para encostas, quadrado/duro/nivelar para patamares; Piso/Plataforma para alvenaria regular. Suave/Facetas altera iluminação, não alturas. Pedra · blocos de alvenaria conserva ID/desenho e distingue Rocha natural.

Montanha é preset assistido com prévia/aceitar/cancelar, sem escrita antes de aceitar nem gerador vinculado; mesma composição pode ser montada manualmente. Respeitar pisos na criação/pincéis limita relevo sob contornos sólidos rotacionados/poligonais, respeitando furos grandes, com margem de triângulo/transição idempotente; no traço, limita somente vértices alterados. Prévia · ajustar sob construções corrige terrenos existentes, sem mover estruturas independentes. Relevo aparente explicado/desativado sem textura: simula detalhes de iluminação, não volume. Corrigidas linhas nas repetições do atlas, usando derivadas antes do wrap e margem conforme o mip, sem contaminação por tiles vizinhos.

Validação final: builds local/Pages, 137 testes unitários/de integração e nove E2E afetados passaram após a revisão final (montanha/UI/projetor e geometria/pixels, autoria de terreno/UI e microrelevo/filtro, pintura, dois materiais/efeitos e dois Pages/IndexedDB). Domínio verifica campo coerente/determinismo/variações/raycast/apoios, expansão em metros versus alongamento e máscaras/histórico/mapas, proteção sob pisos rotacionados/côncavos com furos, triângulos e idempotência. UI verifica prévia sem escrita/cancelamento, preset em X/Z com proteção, escultura/undo, expansão/alongamento, controle de microrelevo, salvamento/reabertura e câmera independente após aguardar o primeiro enquadramento do projetor. Pixels confirmam microrelevo em base/camadas, geometria preservada, cor lisa sem efeito e tile constante com vizinhos contrastantes em três escalas. Captura final revisada: test-results/terrain-authoring.png, sem as linhas de repetição. A suíte completa de 20 E2E não foi repetida; WebGL por software não representa benchmark presencial.

Limites e pendências reais: heightmap até 64 divisões e uma altura por XZ, sem saliências/cavernas; reamostragem pode perder detalhes. Proteção é operação sobre pisos existentes, sem vínculo/solver de colisão ou proteção contra props/GLBs; mudanças numéricas, de tamanho/malha/posição e novas construções exigem revisão/reaplicação. Ampliações continuam bordas sem encaixe automático entre terrenos. Kit alpino, água/gelo e neve física entregues no incremento seguinte; decals e expansão de conteúdo continuam pendentes; Ficha/Jukebox adiados. MATERIALS.md, STRUCTURAL_EVOLUTION.md, TESTAR_CONSTRUCAO.md, VISUAL_TARGET.md, arquitetura e resumos sincronizados.

## Paisagem de montanha: arquitetura, vegetação, água/gelo e neve física — concluída

Plano executado: kit original de arquitetura antiga com vãos/arquivoltas, alvenaria irregular e madeira texturizada; vegetação ramificada/folhagem com variações e distribuição assistida editável; superfícies de água animada e gelo com contorno/dimensões/estado/espessura, mantendo apoios coerentes; neve física opcional no terreno e nas faces superiores de objetos, com exposição ao céu. Preservar os 165 assets anteriores e documentos antigos, histórico/mapas/salvamento/Pages, descarte de recursos e câmera independente. Validar domínio, geometria/raycast/apoios, pixels WebGL, edição/propostas/persistência/projetor e regressões antes de concluir. Ficha/Jukebox continuam adiados.

Entregue: 11 assets originais adicionais (alvenaria irregular, arco com vão, contraforte, passarela, telhado, lanterna e cinco plantas alpinas), texturas de casca/folhagem/gelo e geometria de plantas variável. Paisagem ganhou distribuição com prévia editável e superfícies poligonais de água/gelo. Cobertura de neve aceita espessura real; o terreno preserva suas alturas base e atualiza apoios sobre a camada, enquanto objetos recebem malhas de cobertura e verificam exposição ao céu. Máscara de exposição do terreno é persistida e pode ser recalculada depois de alterar abrigos.

Verificações iniciais concluídas: 143 testes unitários/de integração aprovados e os dois novos E2E passaram. O navegador confirmou controles de paisagem, distribuição sem escrita antes de aceitar/cancelar, undo/redo, água por desenho, gelo, neve com espessura/exposição, persistência/reabertura e projetor com câmera independente. Pixels WebGL confirmaram mudanças de ondas, gelo e geometria nevada, pausa e descarte de recursos relativo à linha de base. Otimizado o teste vertical de exposição por índice espacial dos triângulos das copas, preservando frestas/vãos reais. Captura revisada em perspectiva: test-results/alpine-landscape.png.

Revisão adicional: isolamento visual de andares não altera abrigo/exposição nem remove coberturas de neve ao reconstruir a cena; seleção aceita também o volume acrescentado. Novo teste de navegador aprovado. Acrescentados testes de vãos reais no teto e aplicação por slot, corrigindo o tratamento dos grupos de uma geometria com material único. A regressão de pixels identificou uma expectativa antiga de dez superfícies; atualizada para o catálogo atual de treze e aprovada na repetição. Pages ganhou verificação explícita de gelo/neve e uma planta ramificada variável, além do acervo/IndexedDB já verificados.

Validação final: builds local e Pages aprovados; 144 testes unitários/de integração e 23 roteiros E2E aprovados por suíte e repetições. A suíte de 22 concluiu com uma falha de expectativa antiga (dez versus treze materiais), corrigida; sete casos afetados foram repetidos na versão final e passaram (paisagem/UI, paisagem/pixels, materiais/UI, materiais/pixels, Pages/UI, Pages/IndexedDB e isolamento/seleção da neve). O novo teste de isolamento amplia a suíte para 23. Pages verificou gelo com neve e abeto com seed personalizados, salvamento/reabertura e assets dentro do caminho do repositório. Catálogo preserva exatamente os 165 registros anteriores; 176 IDs únicos, e receitas/prévias anteriores sem alteração. Links locais e git diff --check aprovados. Captura final revisada: test-results/alpine-landscape.png. WebGL por software não representa benchmark presencial.

Pendências remanescentes deste objetivo: expansão de espécies/decoração/conteúdo autoral, pincel regional/entulho, texturas fotográficas/decals, acúmulo temporal/derretimento da neve, suporte à camada de neve nos apoios anotados de props/pisos/gelo, reflexos/refração da cena na água e desempenho/LOD/instanciamento para mapas densos. Máscara de exposição do terreno deve ser recalculada após alterar abrigos/tamanho/posição; a geometria conserva a resolução do heightmap. Guias e três relatórios de progresso sincronizados; uso em [docs/LANDSCAPE.md](docs/LANDSCAPE.md). Ficha/Jukebox continuam adiados.

## Revisão de qualidade e consistência dos assets — concluída

Pedido de 22 de outubro: melhorar a qualidade dos assets e corrigir inconsistências. Revisadas as 18 pranchas de `node scripts/review-library.js` (352 modelos) e auditado o catálogo (campos, arquivos, pegadas × envelopes, apoios, tags, nomes, categorias, procedência).

Entregue:
- Nove modelos refeitos nos ateliês, mantendo IDs, envelopes contratados, apoios e slots: máscara cerimonial, crânio sobre pedestal, moita, afloramento rochoso, mureta desmoronada, relicário e muro/arco/contraforte de ruína (blocos talhados no lugar de seixos empilhados com vãos). Antes e depois conferidos na mesma prancha.
- Cruz dupla renomeada de "de ferro" para "rubra" (o modelo e a fachada da Igreja Antiga são vermelhos e emissivos); nomes das duas instâncias na cena atualizados.
- Categorias: casa de bairro por função (Mobiliário / Cozinha, Decoração, Iluminação; Casa / Estrutura para telhado e piso); vegetação alpina/detalhada unidas em Exterior / Vegetação; mureta e coluna quebrada em Arquitetura / Ruínas. As novas categorias preservam a família do reconstrutor; a lavadora foi para Cozinha porque "Equipamentos" a mudaria para a família de instrumentos.
- Kit inicial com descrições próprias e a procedência comum; slot `dark` do afloramento/mureta como pedra escura com textura de rocha.
- Documentação: README e ASSET_LIBRARY com a contagem atual (352), seção da revisão em ASSET_LIBRARY, categorias em WINTER_DETAIL/MOUNTAIN_KIT, resumos PROGRESSO.md e docs/PROGRESSO.md.

Validação: regeneração comparada ao HEAD — só os dez arquivos de modelo previstos mudaram (nove refeitos + nome da cruz), envelopes iguais aos contratos e nenhuma geometria com NaN; 374 testes unitários aprovados; E2E asset-library, landscape, example-previews e winter-detail aprovados (7/7); example-scenes, mountain-kit, church-kit e Igreja no modo Pages aprovados. Falhas anteriores a esta revisão, não relacionadas: house-scene (server e Pages) espera 5 cenas na galeria, mas são 6 desde o Templo gelado (20/10); church-scene no modo servidor estoura o tempo também numa cópia limpa do HEAD.

Pendências desta frente: o pinheiro e a árvore frondosa antigos continuam ralos e o toco de árvore, liso; padronizar o formato dos nomes ("Kit · peça" só nos kits recentes) exigiria renomear dezenas de assets e foi deixado como decisão do usuário.

## Árvores refeitas e padronização dos nomes — concluída

Pedido de 23 de outubro: refazer pinheiro, árvore frondosa e toco e padronizar os nomes, verificando tutoriais e cenas de preset.

Entregue:
- Pinheiro (dez andares cônicos de galhos pendentes com tufos de agulhas, 52 mil triângulos, dentro do limite de 65 mil), árvore frondosa (tronco que se divide em quatro pernadas, copa larga e baixa) e toco (casca, corte com anéis, lascas e raízes abertas). Troncos e raízes com textura de casca no lugar do veio de tábua; copas com textura de folhagem. Envelopes e slots preservados.
- Convenção "Objeto · detalhe", sem prefixo de kit: 54 nomes renomeados (Igreja, Nórdico, Templo, Backrooms, Casa), quatro reescritos para evitar colisão; tags inglesas dos kits casa/Backrooms traduzidas. IDs inalterados.
- Dependências atualizadas: nomes das entidades nas cenas de exemplo (backrooms 158, casa 1, igreja 175, templo gelado 201), fixture do estudo de iluminação, texto do passo do candelabro no tutorial, teste do templo gelado (agora por ID do asset). Corrigido também um texto antigo de tutorial ("Portão industrial" → nome real do card).
- Novo `tests/asset-names.test.js`: nomes únicos, sem prefixo de kit, tags em português, cenas sem rótulos antigos do catálogo e todos os passos de busca/clique dos tutoriais coerentes com o catálogo.
- Convenção documentada em docs/ASSET_LIBRARY.md (Nomes dos assets); resumos PROGRESSO sincronizados.

Validação: 377 testes unitários aprovados (incluindo o novo); E2E asset-library, church-kit, example-previews, dynamic-lighting, winter-detail, landscape e os tutoriais com assets aprovados. Falhas não relacionadas: backrooms-scene espera 5 cenas na galeria (são 6) e o tutorial "Dirigir a cena ao vivo" (passo de câmera, área em depuração em outra sessão).

## Fogo, chuva e neblina mais realistas — concluído

Pedido de 23 de outubro: o fogo e a chuva não pareciam realistas. Nova bancada `scripts/review-effects.js` (fogueira à noite, chuva com vento, vale com neblina, pelos módulos reais) usada para comparar antes e depois.

Entregue:
- Fogo: línguas que nascem num disco, sobem com flutuação, convergem e oscilam com a altura; contorno em lágrima recortado por ruído ascendente; cor por temperatura derivada da cor do efeito; mistura aditiva com brilho normalizado pela quantidade; ~7% de brasas; luz com cintilação irregular e leve balanço. Antes: coluna única branca e estourada.
- Chuva: fitas voltadas para a câmera na direção da velocidade (queda + vento), comprimento por borrão de movimento e variação por gota, cabeça mais clara, espessura mínima de 1 px com gotas distantes mais tênues, respingos em anel no chão da região. Antes: segmentos verticais de 1 px que ignoravam o vento.
- Neblina volumétrica: densidade cheia até metade da altura e queda exponencial acima (integral analítica, mesmo custo), bancos de densidade presos ao mundo e brilho na direção da luz direcional; o mesmo perfil nas zonas locais e na luz volumétrica. Antes: placa uniforme com topo reto.
- Documentação em ENVIRONMENTS.md e MATERIALS.md.

Validação: 381 testes unitários (teste de geometria da chuva atualizado para as fitas e respingos); E2E environments (inclui pixels de chuva e céu), materials-effects (fogo/fumaça locais), wet-effects, effects-sharpness, organic-winter e dynamic-lighting aprovados (12/12; o teste de UI de ambientes estourou o tempo uma vez com outra suíte rodando em paralelo e passou sozinho).

Limites: respingos na altura base da região (não seguem terreno nem telhados); bancos de névoa estáticos.

## Céu mais realista e aurora — concluído

Pedido de 23 de outubro: céu mais realista (estrelas simples demais) e opções de ambientação customizáveis, como aurora boreal. Nova bancada `scripts/review-sky.js` (noite ampla, zênite, lua cheia e crescente, Via Láctea, duas auroras, tarde e dia) usada para comparar antes e depois.

Entregue:
- Estrelas: antes eram quadradinhos da grade 3D, todos do mesmo brilho e cor. Agora são pontos redondos de ~1 px numa grade por face de cubo com busca 3×3, brilho em lei de potência, cor por temperatura, halo só nas mais fortes, cintilação mais forte no horizonte e extinção pelo ar. Uma segunda população densa e fraca forma a Via Láctea.
- Via Láctea (faixa com manchas, bojo quente, fendas de poeira), airglow no horizonte, estrelas cadentes, lua com mares, borda escurecida e fase (a lua cheia apaga estrelas fracas), clarão de espalhamento em torno do sol.
- Aurora: cortinas dobradas com raios verticais marchadas em altura; cor da base/topo, intensidade, altura, direção e movimento. Some ou surge aos poucos nas transições de ambiente.
- Estrelas/aurora somem sobre céu pintado claro; nuvens sem as faixas verticais perto do horizonte (projeção contínua e oitavas suavizadas).
- UI: Atmosfera ganhou "Sol e lua" (fase), "Estrelas e Via Láctea" e "Aurora"; painel ao vivo ganhou "Céu noturno" e a hora "Aurora". Novo preset Aurora boreal.
- Campos novos opcionais em `SKY_NIGHT_DEFAULTS` + `skySettings()`; cenas guardadas e geradas não mudam.
- Docs: ENVIRONMENTS.md (Céu noturno e aurora), resumos PROGRESSO.

Limites: a aurora não ilumina a cena; sem constelações reais; cintilação/aurora/meteoros mantêm o quadro animado (a pausa de efeitos para).

Validação: 384 testes unitários (3 novos em `tests/night-sky.test.js`: campos opcionais/validação, preset Aurora com transição gradual, painel ao vivo); E2E de pixels do céu (sol/lua, nuvens, chuva) aprovado; bancada `review-sky.js` conferida quadro a quadro. O E2E de UI de ambientes estourou o tempo duas vezes com outras sessões rodando Chromium por software em paralelo; uma cópia limpa do HEAD também falhou nas mesmas condições. Repetir com a máquina livre. Custo medido no renderizador por software: estrelas +5% sobre a noite sem estrelas; aurora ≈ 2× o custo do céu.

## Documentos e objetos inspecionáveis — concluído

Pedido de 23 de outubro: implementar [docs/PLANO_DOCUMENTOS_INTERATIVOS.md](docs/PLANO_DOCUMENTOS_INTERATIVOS.md). Uso e contrato final em [docs/DOCUMENTOS_INTERATIVOS.md](docs/DOCUMENTOS_INTERATIVOS.md).

Entregue (as cinco fases do plano):
- Fase 1 — camada de inspeção (`src/render/inspection.js`): clone com geometria e materiais compartilhados numa cena própria desenhada depois da principal; voo de 0,7 s em arco (smootherstep), luz de estúdio (principal, preenchimento, contraluz, hemisférica e ambiente de sala), vinheta, mancha de sombra atrás do objeto; fundo com a profundidade de campo existente (foco a 12 cm, abertura 1,5) e congelado numa textura quando o objeto assenta; arrastar com inércia, roda com zoom no cursor, deslocar, clique duplo volta, Esc devolve. Clique duplo inspeciona documentos e objetos de até 60 cm (registrado antes do "olhar o ponto"); lupa no cartão e Inspecionar no menu de contexto para qualquer prop.
- Fase 2 — contrato `inspectable` (`src/domain/inspectables.js`, validação, comandos), páginas desenhadas em canvas com cinco papéis e bordas rasgadas por transparência (`src/render/page-textures.js`), UV do slot `page` projetada sobre a folha com verso espelhado, troca de página, F vira a folha, Ler em tela cheia; kit de 7 papéis (`scripts/library-documents.js`, 359 modelos); seção Inspecionável na Aparência.
- Fase 3 — projetor: mensagem `inspect` (rotação, zoom, deslocamento, página, leitura) suavizada, Mostrar aos jogadores revela antes de enviar, Soltar no projetor, filtro do conteúdo secreto em `projectPresentation`/`presentationAssets`.
- Fase 4 — `sessionState.found`, comandos `clue.reveal`/`clue.forget`, seção Pistas reveladas em Tomadas → Sessão (reabrir no projetor, ver, esquecer).
- Fase 5 — tutorial Luz e câmera → Pistas e documentos (envelope na mesa de investigação da Casa de bairro).

Desvio do plano: o estado da inspeção em curso não vai para `sessionState.inspected`; fica no editor e é reenviado a um projetor que se reconecta.

Validação: 395 testes unitários aprovados (5 novos em `tests/inspectables.test.js`); E2E `inspection` (novo), `cinematics` (clique duplo de câmera continua) e `screens-decals` aprovados; tutorial Pistas e documentos seguido do primeiro ao último passo; bancada visual no navegador (carta envelhecida na mesa: frente, verso, página 2, giro, projetor igual ao editor depois de assentar). Coordenação com a sessão do plano tático (iniciativa) nos mesmos arquivos: `sessionState` aceita `doors`, `found` e `initiative`.

Pendências: sombra projetada real no fundo; arrastar imagens da biblioteca direto para a página.
