# Tabletop — andamento

Atualizado em 4 de outubro de 2026. Histórico geral: [PROGRESSO.md](PROGRESSO.md) e [relatório detalhado](docs/PROGRESSO.md).

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

## Pendências atuais

- Acompanhamento automático de tokens; caminhos de câmera e colisão com paredes.
- Avaliação presencial do movimento/legibilidade no notebook e projetor.
- Pacote único de cena + assets (opcional).
- Receitas e prefabs adicionais, biblioteca reutilizável de ambientes e auto-layout entre cômodos.
- Coleções/variantes de assets, sockets específicos por asset e glTF com texturas externas.
- Integrações Ficha/Jukebox e LAN, conforme [roadmap](docs/ROADMAP.md).
- Volumetria com sombras/espalhamento por luz, partículas e efeitos adicionais dependentes de benchmark.
