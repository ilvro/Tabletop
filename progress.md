# Tabletop — andamento

Atualizado em 3 de outubro de 2026. Histórico geral: [PROGRESSO.md](PROGRESSO.md) e [relatório detalhado](docs/PROGRESSO.md).

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

## Pendências preservadas

- Acompanhamento automático de tokens; caminhos de câmera e colisão com paredes.
- Avaliação presencial do movimento/legibilidade no notebook e projetor.
- Pacote único de cena + assets (opcional).
- Receitas/prefabs/ambientes adicionais, variantes e sockets específicos por asset.
- Iluminação/efeitos avançados, integrações Ficha/Jukebox e LAN, conforme [roadmap](docs/ROADMAP.md).
