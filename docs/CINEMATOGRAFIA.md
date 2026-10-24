# Cinematografia ao vivo

Entregue em 22 de outubro de 2026. Ambientação com sliders durante a sessão, câmera mais fluida, foco com fundo desfocado, câmera que segue um personagem, câmera ao vivo no projetor e lanterna. Referência: o painel "Variáveis da Sessão" e a mesa 3D mostrados no Revelando Hexatombe. Andamento: [progress.md](../progress.md). Controles básicos de câmera: [CAMERA.md](CAMERA.md).

## Ambientação ao vivo

**Trilho → Ambientação** (ou Ctrl+K → "Ambientação ao vivo") abre uma janela flutuante que fica sobre a mesa durante a sessão.

- **Hora do dia:** Dia, Tarde, Noite, Neblina, Chuva, Ritual e os ambientes salvos em *Ambiente → Meus ambientes*. Escolha a duração (corte, 2, 5, 10 ou 20 s): a cena viaja até lá no editor e no projetor, com cores misturadas em luz linear, névoa e halo entrando aos poucos, o sol girando e o clima trocando com fade. Ao chegar, a troca é gravada como **um** passo de desfazer. "Chegar agora" encerra a viagem; qualquer outra edição durante a viagem a interrompe onde está.
- **Sliders:** exposição; sol/lua (força, altura, direção e cor H/S/V); luz ambiente; cor do céu e do horizonte; nuvens (cobertura, opacidade, velocidade, padrão e cor); névoa baixa (densidade, altura), névoa à distância e cor da névoa; clima (tipo, intensidade, velocidade, vento); halo das luzes.
- **Arrastar** mostra o resultado no editor e no projetor sem gravar e sem reconstruir a cena. **Soltar** grava um passo de desfazer.
- Clima ligado a partir de "Nada" começa onde a câmera está olhando, numa região de 40 × 14 × 40 m.

Limite: durante o arraste e a viagem, a luz refletida nas salas (zonas) continua a da cena gravada e é recalculada quando a mudança é gravada. Janelas acesas à noite mudam ao gravar.

## Câmera mais fluida

Em **Tomadas → Câmera cinematográfica**:

- **Suavidade do movimento** (0–100%): de 0 (resposta imediata, como antes) a 100 (a câmera pesa como um dolly: arranca e para devagar no WASD e na órbita). É uma preferência da sessão.
- As transições entre tomadas usam uma curva quíntica: começam e terminam sem tranco.

## Foco, seguir e movimento

Em **Tomadas → Foco, seguir e movimento**, valem para a câmera de trabalho e entram na tomada ao salvar:

- **Desfocar o fundo:** profundidade de campo. **Focar em** um token ou no objeto selecionado (o foco acompanha o alvo e muda devagar, como um foquista) ou numa distância fixa. **Desfoque** controla o quanto o fundo e o primeiro plano derretem.
- **Seguir personagem:** a câmera mantém o enquadramento enquanto o token anda. Órbita e zoom continuam funcionando; WASD solta a câmera.
- **Movimento automático:** órbita lenta, aproximação lenta ou câmera na mão, com intensidade. No editor, mexer na câmera desliga o movimento; no projetor, ele continua até a próxima tomada.

No **cartão do personagem** (selecione o token):

- **Close:** enquadra o rosto em três-quartos, com lente longa e fundo desfocado. Se uma parede ou coluna estiver na frente, procura outro lado livre. É um ensaio: publique, salve como tomada ou use a câmera ao vivo para mostrar.
- **Seguir:** liga e desliga o acompanhamento.
- **Lanterna:** acende e apaga a lanterna do personagem.

No projetor, um token movido desliza até a nova posição com um passo curto em vez de saltar. O nome sobre o token some quando a câmera chega perto.

## Câmera ao vivo

**L** (ou o botão **Ao vivo**, na barra de câmera da cena) liga e desliga. Ligada, a sua câmera de trabalho vira a câmera da transmissão: o projetor a acompanha com atraso suave, e a navegação ganha peso de cinema (suavidade de pelo menos 55%, que volta ao valor anterior ao desligar). Para filmar ao vivo:

- **Roda do mouse:** aproximação e afastamento com inércia, como um dolly; a câmera continua deslizando um pouco depois do último toque.
- **Z / C** (segurar): órbita lenta em volta do ponto olhado, com aceleração e frenagem suaves; com Shift, mais rápida. Seguir um personagem continua valendo durante a órbita.
- **Clique duplo** num ponto da cena: a câmera desliza até olhar para ele, mantendo distância e ângulo.
- **WASD**, botão direito e Close continuam como antes; movimentos automáticos (órbita lenta, câmera na mão) podem rodar por cima.

Ctrl+Z, Ctrl+C e os demais atalhos com Ctrl continuam sendo de edição, mesmo com o foco na cena.

**Tomadas → Câmera ao vivo → Projetor acompanha minha câmera.** Desligada por padrão. Ligada, o projetor segue a câmera de trabalho com atraso suave (0,1–2 s), e os movimentos do mestre viram travellings. Desligar deixa o projetor onde está. A opção desliga sozinha ao trocar de cena. Sem ela, valem as regras de sempre: só tomadas e "Publicar" mudam o projetor.

Foco e seguir que apontam para algo "só mestre" não são enviados ao projetor.

## Lanterna

Na aba **Luz** do token, seção **LANTERNA**: acesa, cor, força, alcance, abertura do facho, borda suave, inclinação, altura da mão e sombras. O facho sai da mão do personagem e aponta para a frente dele (gire o token com R para mirar). Com **névoa iluminada** ligada em Ambiente, o facho aparece no ar. A lanterna entra no orçamento de luzes com prioridade alta e sombra preferencial.

## Personagens 2D (figuras recortadas)

Um token com retrato pode ficar de pé na cena como uma figura de papel recortado: **Propriedades → Aparência → FIGURA**. Tokens novos com retrato já nascem como figura; os antigos ganham a opção com um clique.

- **Recorte automático:** as margens transparentes do retrato são ignoradas, então os pés ficam na base, sem flutuar.
- **Girar para a câmera:** a figura gira só em volta do eixo vertical para cada janela; o editor e o projetor a veem de frente ao mesmo tempo, e o documento não muda. Desligado, ela fica na rotação do token.
- **Altura** em metros, **base** (anel colorido, pedestal escuro ou nenhuma), **contorno** (cor e espessura) e **luz na borda** (um brilho onde a silhueta termina, que descola a figura do fundo).
- **Estado:** ferido (avermelha), morrendo (pulsa em vermelho e perde cor), inconsciente (deita), morto (deita, sem cor e mais escuro), enlouquecendo (o desenho ondula). Com movimento reduzido, nada pulsa nem ondula.
- A figura recebe a luz da cena e projeta sombra com a forma da silhueta.

Contrato: `token.figure = { facing: camera | fixed, height, outline, outlineColor, outlineWidth, rim, rimColor, base: ring | plinth | none, state: normal | hurt | dying | unconscious | dead | maddened }` (`src/domain/figures.js`). Sem `figure`, o retrato fica como antes.

## Retratos iluminados

Retratos de tokens agora recebem a luz da cena (inclusive a de lanternas) e projetam sombra no formato da silhueta. Para continuarem legíveis no escuro, nunca ficam abaixo de cerca de 20% das próprias cores.

## Contratos

Campos opcionais e validados (`src/domain/cinematics.js`). Documentos antigos não mudam.

| Campo | Conteúdo |
| --- | --- |
| `token.flashlight` | `{ enabled, color, intensity, distance, angle (rad), penumbra, pitch (graus), height (m), shadow }` |
| `cameraPresets[id].focus` | `{ enabled, targetId \| null, distance, aperture (0–1) }` |
| `cameraPresets[id].follow` | `{ targetId }` |
| `cameraPresets[id].motion` | `{ type: none \| orbit \| push \| handheld, speed (0–4) }` |

Remover o alvo de uma tomada mantém o enquadramento e esquece o alvo. Mensagens novas para o projetor: `look` (atmosfera ao vivo, sem gravar) e `live-camera`.

## Validação e limites

`tests/cinematics.test.js` (contratos, transição de atmosfera, painel e sliders) e `tests/e2e/cinematics.test.js` (projetor recebe o look antes de gravar, transição com um passo de desfazer, lanterna no orçamento, Close com foco publicado, seguir e soltar, câmera ao vivo liga e desliga). Conferido visualmente no Galpão e na Casa de bairro em renderização por software.

Limites: o desfoque é um passe de tela (um objeto muito fino na frente de um fundo distante pode mostrar uma borda); não há detecção de colisão no trajeto entre tomadas; o desempenho no notebook/projetor reais não foi medido.
