# Câmera cinematográfica

Implementada em 3 de outubro de 2026. O mestre controla a câmera de trabalho; o projetor recebe somente enquadramentos publicados. Andamento e pendências: [progress.md](../progress.md).

## Navegação

Clique na mesa para dar foco ao viewport. Funciona na perspectiva, na vista superior e na apresentação na mesma janela.

| Controle | Ação |
| --- | --- |
| W / S | Avançar / recuar no plano do mapa, conforme o ângulo da câmera. |
| A / D | Deslocar lateralmente, conforme o ângulo da câmera. |
| Shift + movimento | Triplicar a velocidade. |
| Page Up / Page Down | Subir / descer a câmera e o ponto de foco. |
| Espaço / Ctrl esquerdo ou direito | Subir / descer na perspectiva. |
| Botão direito + arraste | Orbitar com desaceleração suave. |
| Botão direito sem arraste | Selecionar o objeto e abrir seu menu somente ao soltar. |
| Botão do meio + arraste | Deslocar no plano do mapa. |
| Roda | Aproximar / afastar. |
| F / Enquadrar | Enquadrar a seleção; sem seleção, enquadrar a construção visível. |
| Q / G / R / V | Selecionar / mover objetos / girar / escalar. |

WASD não muda a ferramenta nem o documento. Zoom, pan e órbita preservam as teclas pressionadas e podem ocorrer durante o movimento. Arrastar com o botão direito não seleciona objetos nem abre menus, mesmo se o ponteiro retornar ao ponto inicial.

Diagonais têm a mesma velocidade dos movimentos retos. Ao soltar as teclas, a câmera desacelera; ao sair do viewport, trocar de janela, usar Cmd/Alt ou executar um atalho de edição com Ctrl, as teclas e a velocidade são limpas. Durante arraste de objetos/gizmo/pincel, a navegação fica suspensa.

Na perspectiva com foco no canvas, Ctrl desce e combina com WASD e Shift, independentemente da ordem em que as teclas são pressionadas. Ctrl+A/D/S/W são controles de câmera nesse contexto: não selecionam texto, duplicam objetos, salvam a cena nem acionam atalhos do navegador. Soltar Ctrl conserva o movimento das demais teclas. Para salvar ou duplicar, use os botões ou dê foco a outro controle do editor antes do atalho. Campos de texto conservam Ctrl+A e os demais atalhos nativos; Ctrl+V/C/Z e outros atalhos de edição continuam disponíveis.

## Preparar e apresentar um enquadramento

Em **Cena → Câmera cinematográfica**:

1. Ajuste **Velocidade** (0,2–40 m/s) e **Lente** (FOV vertical de 20–90 graus). Um FOV menor concentra o enquadramento; maior inclui mais cenário. Na vista superior, o FOV prepara a lente usada ao retornar à perspectiva.
2. Escolha **Troca de enquadramento**: corte imediato, 0,6 s, 1,2 s, 2,5 s ou 4 s.
3. Navegue e use **Salvar câmera atual**. O preset guarda posição, alvo, projeção e lente/altura ortográfica nos campos existentes do schema 2. É preciso salvar a cena para conservá-lo no disco.
4. Clique no nome de um enquadramento para ativá-lo no editor e publicá-lo com a duração escolhida. O botão de câmera ao lado do nome corta diretamente para esse preset.
5. **Publicar câmera atual** publica o ponto atual para a segunda tela. **Parar transição** conserva e publica o ponto intermediário; **Cortar agora** chega imediatamente ao destino da transição e o publica.

Posição do alvo, distância, ângulo e lente/altura ortográfica são interpolados com entrada/saída suaves. A rotação usa o caminho angular mais curto e mantém distância ao ponto de foco durante a troca. Não se trata de um sistema de detecção de obstáculos.

WASD, mouse, enquadramento manual e mudança de lente interrompem uma transição na câmera de trabalho. Essa intervenção local mantém a transição publicada independente; use **Parar transição** ou **Cortar agora** para intervir também na segunda tela. Escape interrompe localmente e continua cancelando ferramentas/saindo da apresentação como antes.

A troca entre perspectiva e ortográfica usa corte. A preferência de acessibilidade **reduzir movimento** do navegador também usa corte no respectivo viewport. A primeira conexão/reabertura do projetor recebe diretamente o último destino publicado. Alterações de objetos, luzes ou nome da cena não reiniciam a câmera publicada; o contador de publicação é independente do contador de snapshots.

A janela dedicada do projetor não aceita navegação por mouse/teclado. A apresentação na mesma janela continua navegável pelo mestre; voltar à edição restaura a câmera de trabalho e publica o ponto em que terminou a apresentação. Velocidade e duração são ajustes da sessão; só os enquadramentos salvos são dados do documento. Não há comandos de histórico ou gravação por frame. O renderer continua trabalhando sob demanda e mantém frames enquanto há movimento.

## Validação e limites

`tests/camera-motion.test.js` verifica direção relativa/diagonal/superior, Espaço/ambos os Ctrl somente na perspectiva, integração temporal da velocidade e trajetos sem colapso do raio. `tests/e2e/camera.test.js` exercita teclado real, movimento simultâneo com zoom/pan/órbita, seleção/menu no release sem arraste, altura com Espaço/Ctrl, foco, ferramentas, lentes, publicação, cortes/interrupções, redução de movimento e câmeras salvas após reload. O E2E do editor aguarda a desaceleração da órbita antes de comparar publicação.

Permanecem pendentes acompanhamento automático de tokens, caminhos de câmera, colisão com paredes e avaliação visual no notebook/projetor real. O foco usa os bounds dos objetos/áreas construídas; não acrescenta vínculos persistentes de acompanhamento. Os testes com WebGL por software não medem desempenho ou qualidade no equipamento da mesa.

Referência de API: [OrbitControls do Three.js](https://threejs.org/docs/pages/OrbitControls.html). Contexto e intenção visual: [IMMERSION.md §10](IMMERSION.md#10-câmera-enquadramento-e-transições).
