# Esculpir terreno e paredões com pincel

Implementação de 5 de outubro de 2026. Complementa [MOUNTAIN_KIT.md](MOUNTAIN_KIT.md), mantendo os parâmetros de formação, camadas, erosão, detalhe e seed. O objetivo é corrigir picos e desenhar saliências locais diretamente no cenário.

## Começar pela superfície

1. Coloque um paredão/rocha geológica em **Assets** e selecione a peça.
2. Em Propriedades, o painel **Pincel de superfície** começa aberto, acima dos parâmetros de geometria. Clique **Esculpir esta superfície** ou pressione **T** com foco no cenário.
3. Aponte para o topo, uma face vertical ou a parte inferior de uma saliência. O círculo gira para acompanhar a face atingida. Arraste com o botão esquerdo e solte para confirmar.
4. **Q/T** conclui o uso do pincel; **Esc** cancela o traço atual e retorna à seleção. **[ / ]** altera o raio. **Ctrl+Z** desfaz o traço inteiro.

O pincel geométrico reconhece a superfície apontada. Você pode começar no terreno e clicar num paredão, ou começar num paredão e continuar no terreno; a peça atingida passa a ser selecionada. Cada traço trabalha na peça onde começou; solte e comece outro ao atravessar a junção. Elementos bloqueados e objetos à frente impedem esculpir através deles. Composições ancoradas permitem selecionar diretamente a rocha ao usar o pincel, conservando a composição.

Pintura/apagamento de **camadas de material** e criação de **água** continuam operações do terreno. O novo pincel nas rochas altera a geometria; material por slot e cobertura de neve continuam em Material e textura. Escultura de material regional nas rochas permanece uma extensão futura.

## Ferramentas

| Ferramenta | Rocha/paredão | Terreno |
| --- | --- | --- |
| Elevar / Rebaixar | Muda a altura do ponto escolhido, incluindo o topo de um pico | Eleva/rebaixa as alturas |
| Projetar / Recuar face | Desloca para fora/para dentro, seguindo a face atingida | Eleva/rebaixa |
| Suavizar | Suaviza vértices vizinhos na região do círculo | Suaviza alturas vizinhas |
| Aplainar | Aproxima a região do plano da face inicialmente clicada; mantém esse plano ao arrastar | Usa a altura desejada do painel de terreno |

Raio é medido em metros no mundo, incluindo rotação e escala não uniforme. Dureza controla o falloff das bordas; comece com raio de 1–2 m e dureza baixa para resultados naturais. Força é o deslocamento desejado por amostra, reduzido nas bordas e limitado pela dimensão do pincel/validade das faces. Suavizar/Aplainar usam intensidade 0–1.

Para corrigir um ponto baixo produzido pela seed, use **Elevar** no topo daquele ponto. Para uma borda avançar sobre a trilha, use **Projetar face** na lateral. **Recuar face** cria uma reentrância sem baixar a peça inteira. Varie o gesto e suavize as transições para reduzir a repetição das camadas procedurais.

## Parâmetros e edição manual

A posição, escala, rotação, material e parâmetros da rocha permanecem. A escultura é guardada em coordenadas locais: acompanha a peça ao mover/duplicar e é conservada em histórico, mapas, JSON, servidor/Pages e projetor. Conteúdo é publicado sem alterar automaticamente a câmera do projetor.

As edições manuais são reaplicadas depois da formação paramétrica. Mudar seed/formação/detalhe continua possível e pode alterar como os traços se encontram com a nova base. **Restaurar forma do modelo** restaura os parâmetros; **Limpar escultura manual** remove somente os traços e pode ser desfeito. O pivot inicial permanece: a forma esculpida não é recentrada ou redimensionada de volta ao tamanho original. O footprint se expande de modo conservador ao confirmar o traço; limpar restaura o footprint do catálogo.

Durante o arraste a cobertura visual acompanha a malha; a neve com espessura é recalculada ao confirmar. Traços descartados retornam à geometria anterior. Pisos/construções não têm proteção automática contra a escultura de rocha: revise o encontro; a proteção de pisos do terreno conserva seu comportamento.

## Geometria, custo e limites

- Disponível nas dez rochas/paredões geológicos, incluindo as duas formações orgânicas de [ORGANIC_WINTER.md](ORGANIC_WINTER.md). Não é um editor de qualquer GLB ou de alvenaria/móveis.
- A malha ganha até duas subdivisões quando começa a escultura, mantendo bordas soldadas/fechadas e até 48 mil triângulos por peça. Pincéis menores que o espaçamento dos vértices podem não alterar um ponto; aumente o raio ou ajuste os parâmetros/base. Peças grandes devem ser compostas de módulos para preservar detalhe.
- Até 512 amostras por peça. Movimentos são amostrados por distância e cada traço vira uma única edição. Prévia modifica buffers existentes; não recarrega assets nem cria texturas a cada movimento.
- Deformações que inverteriam/colapsariam faces são reduzidas. A topologia permanece; não abre túneis/cavernas, não une peças/terreno por booleans nem garante ausência de toda auto-interseção em deformações extremas.
- Um cache CPU de até seis resultados evita repetir histórias longas ao editar outros elementos. Cada instância possui sua geometria/material; clones e templates são liberados por prune/remoção/destruição. Custo de neve e de múltiplos objetos continua relevante.
- Apoio de tokens não é inferido da malha esculpida. Use terreno/pisos/acessos nas áreas transitáveis, como antes.

Validação: 154 testes unitários/de integração, builds local e GitHub Pages e cinco cenários E2E afetados aprovados (editor/projetor, dois de Pages/IndexedDB, pixels/descarte e pintura de terreno). Captura do editor revisada; testes em Chromium/WebGL por software, sem benchmark no hardware real.

Validação e pendências atuais são registradas em [progress.md](../progress.md). Esta etapa permite compor e corrigir o relevo da referência diretamente na superfície; materiais autorais, decals, pintura regional em rochas, neve localizada e acabamento de contato/água continuam incrementos posteriores.
