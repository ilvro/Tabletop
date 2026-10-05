# Paisagem alpina: arquitetura, vegetação, água/gelo e neve

Implementado em 5 de outubro de 2026. Recursos locais disponíveis também no GitHub Pages, sem buscar texturas externas. Ficha/Jukebox continuam adiados.

O catálogo atual tem 188 peças; o kit adicional de paredões, pináculo, ruínas, madeira, cordas e raízes está em [MOUNTAIN_KIT.md](MOUNTAIN_KIT.md).

## Arquitetura e vegetação

Em **Assets**, busque Montanha ou Ruínas. O catálogo mantém os 165 modelos anteriores e acrescenta 11 peças, totalizando 176 naquele incremento: muro de alvenaria irregular, arco de pedra com vão real, contraforte, passarela de tábuas/corrimão, telhado de duas águas, lanterna de trilha, abeto, pinheiro ramificado, árvore seca, samambaia e capim seco. Alvenaria/aduelas e tábuas são peças geométricas separadas; plantas usam ramificações e lâminas/frondes, com texturas procedurais de casca e folhagem. Materiais internos conservam acabamento por slot; no inspetor, selecione um material para recolorir/substituir sua textura.

O kit é cenográfico: arcos não criam vínculos estruturais de parede/porta, lanternas emissivas precisam de luz pontual para iluminar o entorno. Para tokens atravessarem a passarela, sobreponha um piso/plataforma ao tabuleiro ou anote sua superfície de apoio; o apoio não é inferido da malha.

No inspetor das cinco plantas alpinas, **Variação geométrica** altera ramificação/folhagem por seed e conserva dimensões e base do asset. Escala e rotação continuam editáveis. Cada receita junta partes com acabamento idêntico em poucas malhas; não há LOD nem instanciamento entre diferentes objetos.

Em **Construir → Paisagem → Água e vegetação**, selecione terreno, planta, quantidade, variação, escalas mínima/máxima e inclinação máxima. **Prévia da vegetação** não grava nada; **Aceitar proposta** cria objetos comuns e pode ser desfeito em uma operação. A distribuição evita bordas, pisos, água e footprints dos props existentes, varia escala/rotação/seed e apoia na altura real do terreno, incluindo neve. Pode propor menos plantas quando falta espaço. Não é um solver de colisão: a exclusão de pisos é conservadora, e paredes sem piso, cavernas e interseção exata de copas exigem revisão manual. Limite: 128 plantas por proposta.

## Água e gelo

**Pintar água e escavar leito**, em Paisagem ou no pincel do terreno, agora cria contornos comuns e rebaixa o leito em uma única proposta desfazível. Para águas existentes, escolha Terreno do leito nas Propriedades e revise **Rebaixar leito sob esta água**. Detalhes, limites de contorno, resolução e proteção de construções: [EDITOR_UI.md](EDITOR_UI.md).

Em **Construir → Paisagem → Água e vegetação**, **Criar água** inicia um retângulo; **Desenhar rio / lago** permite um contorno de 3–64 vértices, com Enter para concluir e Esc para cancelar. O desenho usa a altura de construção. No inspetor, ajuste posição, dimensões e vértices; largura/comprimento escalam o contorno proporcionalmente.

**Água líquida** oferece cor, opacidade, comprimento/altura/velocidade/direção das ondas e profundidade de referência. Ondas deformam a superfície e suas normais no GPU, com brilho e resposta às luzes; profundidade escurece a cor. Pausar efeitos, movimento reduzido e aba oculta param o relógio. As ondas não alteram o JSON a cada frame. A profundidade não cria fundo sólido, a corrente não movimenta tokens e água não é superfície de apoio. Transparência usa composição convencional; não há refração/SSR, reflexo dos objetos ou simulação hidrodinâmica. O tom de horizonte no brilho é aproximado.

**Gelo sólido** mantém o contorno e o topo na altura Y, com espessura geométrica para baixo e textura procedural de fissuras. Cor, padrão, microrelevo, rugosidade e cobertura são editáveis no painel de material. Oferece apoio: selecione o gelo como superfície de tokens/objetos. Antes de descongelar, desvincule os elementos apoiados; a validação rejeita a troca com referências pendentes. Ondas ficam guardadas e inativas enquanto congelado. Não há quebra ou derretimento gradual.

## Neve com espessura

Selecione terreno/objeto/estrutura/gelo e abra **Material e textura → Cobertura sobre a superfície** (no terreno, dentro de **Material base · terreno inteiro**). Escolha **Neve**, ajuste quantidade, cor, distribuição por inclinação/altura e **Espessura física da neve · m** (0–1,5 m). Zero mantém o comportamento visual anterior. **Relevo aparente** continua sendo microdetalhe da iluminação, independente da espessura.

No terreno, espessura soma uma camada geométrica às alturas base; inclinação, altura e manchas são calculadas antes de deslocar a superfície. As alturas do relevo original e a pintura permanecem guardadas. Apoios vinculados ao terreno acompanham o topo nevado, incluindo edição de espessura/máscara, undo/redo e movimentação. A borda expõe a espessura da camada. A resolução continua sendo a do heightmap: detalhes menores que uma célula exigem mais divisões.

**Acumular somente onde há céu aberto** usa uma máscara persistida no terreno. Alterar controles da cobertura recalcula a máscara; depois de adicionar/mover abrigos, selecione o terreno e use **Recalcular exposição do terreno**. A operação é explícita e desfazível. Aguarde carregar os modelos antes de recalcular. A máscara é reamostrada com o terreno, não recalculada automaticamente ao mover/expandir suas dimensões; refaça a exposição nesses casos. O renderer exclui o próprio terreno desse teste e considera os vãos reais de telhados/arcos; isolar andares apenas na vista de trabalho conserva os abrigos da cena. Sem máscara, um terreno importado parte de exposição completa até recalcular.

Rochas, plantas, estruturas e GLBs estáticos recebem malhas de neve com topo e laterais sobre triângulos voltados para cima; o slot escolhido é respeitado. O teste vertical de exposição usa geometria real, inclusive ramos superiores, e é atualizado ao mudar/carregar objetos. Desligar a opção permite cobrir faces superiores mesmo sob um teto. Não há depósito nas faces verticais/inferiores, compactação, queda/derretimento ou mudança automática com clima. A cobertura de objetos é cenográfica: apoios anotados de props/pisos/gelo mantêm seu contrato original; só o terreno acompanha sua camada na altura de apoio.

A geometria de cobertura é limitada a 6.000 pequenos prismas por objeto (até 48.000 triângulos adicionais), com subdivisão limitada para grandes faces e raycasts agrupados por posições próximas. Cenas com muitas árvores cobertas exigem medição no notebook/projetor. Recursos por instância e texturas compartilhadas são liberados ao substituir/excluir objetos. Otimização para mapas densos, neve caindo, decals e materiais fotográficos continuam pendentes.

## Validação

Testes verificam contornos/vãos e dimensões, variações determinísticas, exclusão na distribuição, proposta/histórico, validação atômica do descongelamento, espessura/exposição por raycast, apoios do terreno, reamostragem, mapas/JSON/projeção e descarte. Roteiros de navegador verificam os controles, proposta, persistência, câmera independente, pixels reais de ondas/gelo/neve e liberação de GPU. Resultados finais em [progress.md](../progress.md). WebGL por software valida funcionamento e não substitui benchmark no hardware de uso.
