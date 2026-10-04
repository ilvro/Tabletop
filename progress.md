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

## Pendências atuais

Somente trabalho ainda não concluído. A prioridade visual proposta está em [docs/VISUAL_TARGET.md](docs/VISUAL_TARGET.md).

- Kits de modelos detalhados/texturizados, decoração e miniaturas estáticas para um mapa piloto; avaliação visual em câmera próxima.
- Texturas fotográficas específicas, importação de texturas avulsas/variantes e decals de desgaste/sujeira.
- Pincel de distribuição de vegetação/entulho, umidade e poças/água.
- Fluxo dedicado de miniaturas 3D vinculadas a personagens/tokens; rig, poses e animação como evolução posterior.
- Acabamento de contato/reflexos e otimizações para cenas densas (LOD, instanciamento e particionamento/streaming), conforme medição.
- Acompanhamento automático de tokens; caminhos de câmera e colisão com paredes.
- Avaliação presencial do movimento/legibilidade no notebook e projetor.
- Pacote único de cena + assets (opcional).
- Receitas e prefabs adicionais e auto-layout entre cômodos.
- Coleções/variantes de assets, sockets específicos por asset e glTF com texturas externas.
- Integrações Ficha/Jukebox e LAN, conforme [roadmap](docs/ROADMAP.md).
- Volumetria com sombras/espalhamento por luz, múltiplas regiões de chuva/poeira/brasas, colisão de partículas e efeitos adicionais dependentes de benchmark.
