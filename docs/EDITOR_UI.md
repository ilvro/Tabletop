# Editor: construção, materiais e janelas

Atualizado em 5 de outubro de 2026. Este guia descreve a interface implementada; resultados de validação em [progress.md](../progress.md).

## Encontrar uma ferramenta

**Construir** organiza tarefas em quatro contextos: **Paisagem** (terreno, água e vegetação), **Construções** (sala, superfícies/acessos, peças e mobiliário), **Personagens** e **Organização** (andares, camadas de organização e grid). As tarefas conservam sua abertura durante edições. Selecionar terreno torna Paisagem acessível. **Cena** usa o mesmo padrão de grupos e tarefas recolhíveis: **Atmosfera** (ambientes/horários, sol/lua, céu, clima, objetos noturnos e névoa/bloom/qualidade), **Câmera e apresentação** (navegação, enquadramentos e publicação), **Elementos e documento** (árvore de objetos, pastas e cópia da cena).

Ao ativar um desenho, colocação ou pincel, a barra sobre a cena informa a ferramenta e permite voltar à seleção. Um pincel ativo mostra seus controles primeiro nas Propriedades. **Ferramentas** e **Propriedades**, no cabeçalho, recolhem os painéis para liberar espaço; ao entrar em telas estreitas os painéis se recolhem e podem ser abertos sobre a cena, um por vez. Selecionar um objeto abre suas propriedades nessa tela. Ao ampliar a janela, a abertura dos painéis de desktop é restaurada. O suporte da câmera continua mouse/teclado; isto não implementa navegação 3D por gestos de toque.

## Propriedades de objetos e luzes

Posição, dimensões, material, iluminação, apoio, organização e apresentação usam títulos recolhíveis com o mesmo indicador de abertura de Construir/Cena. Posição, dimensões e os controles principais de iluminação/material/água começam abertos; organização, vínculos e operações auxiliares começam recolhidos. O terreno conserva seu fluxo específico de pincéis e alcance por camada/base. A abertura das tarefas de Cena e propriedades é conservada durante edições e trocas de painel na sessão. Os estados não entram no documento, no histórico ou na câmera publicada. Campos em edição e rolagem são conservados durante a atualização dos controles, inclusive em composições ancoradas; selecionar outro objeto retorna ao início de suas propriedades.

## Assets e Abrir

**Assets** abre uma biblioteca flutuante. Busque, filtre, importe, classifique ou favorite como antes. Escolher um asset fecha a janela para liberar a colocação na cena; abrir novamente conserva os filtros. Importar um arquivo conserva o painel Construir/Cena que estava por baixo da biblioteca. **Abrir** reúne cenas, mapas, tokens e documentos em outra janela flutuante.

Arraste pelo título. Pelo teclado, foque o título com Tab e use as setas (10 px; Shift = 40 px). **↺** reposiciona a janela; **×** ou Esc fecha. As janelas não bloqueiam o restante do editor, ficam dentro da tela ao redimensionar e guardam sua posição somente neste navegador. Mover uma janela não altera histórico, documento ou câmera publicada. A abertura tem fade de **100 ms** e o fechamento de **80 ms**, também por Esc e ao escolher um asset. Durante a saída, a janela já deixa de receber foco/cliques; reabrir antes de terminar cancela a saída. Movimento reduzido torna abertura/fechamento imediatos. Janelas de recuperação/classificação continuam modais quando necessário.

## Material de uma camada

Selecione o terreno e use **Material · escolha o alcance → Editar material de**:

- **Camada · nome** abre **Somente camada · nome**. Textura, cor, tamanho do padrão, distribuição e opacidade afetam essa camada; a máscara pintada e as outras camadas ficam guardadas. **Personalizar cor e padrão** expõe tábuas/veios, desenho do metal, brilho e variações.
- **Base · terreno inteiro** abre **Material base · terreno inteiro**. A textura de fundo aparece onde as camadas não a cobrem; o bloco também contém ajustes gerais de acabamento. Relevo aparente e cobertura física de neve são parâmetros do terreno completo e estão identificados nesse bloco.

Crie **Nova camada de material**, escolha a textura e use **Pintar esta camada**. Na distribuição, **Pintura manual** usa o pincel; os demais modos distribuem o acabamento por inclinação/altura. Apagar pintura revela as camadas de baixo. Camadas de **material do terreno** e camadas de **organização dos objetos** são conceitos diferentes.

**Tamanho e limites do terreno** reúne expansão/recorte versus esticar. Malha e alturas exatas ficam em ajustes avançados. O terreno continua um campo de alturas: uma altura por X/Z, no máximo 64 divisões por eixo. Para cavernas, tetos, degraus exatos e faces verticais, combine estruturas e assets.

## Pincel de água e interseções

Selecione terreno; em **Paisagem** use **Pintar água e escavar leito**, ou escolha **Água · escavar e preencher** na ferramenta do pincel. Ajuste **Raio**, **Nível da água** em metros no mundo e **Profundidade do leito**. Arraste sobre o terreno, solte, revise e **Aceite a proposta**. Esc durante o traço cancela; cancelar a proposta não escreve nada. A aceitação cria contornos de água editáveis e rebaixa o terreno em uma única operação desfazível. Apoios vinculados ao terreno acompanham suas alturas, respeitando bloqueios e validação transacional.

O traço é circular e usa a resolução do terreno. O leito conserva uma margem de um triângulo além do contorno, folga para ondas e a espessura máxima de neve, com transição nas margens. O pincel evita pisos de construções. Não aceita uma superfície que envolva/atravesse um piso, nem contornos inválidos ou com mais de 64 vértices; nesses casos faça traços menores. Traços podem produzir até oito superfícies separadas. Não há união automática entre diferentes traços, nem ilhas/furos no contorno de água.

Para uma água já criada/desenhada, selecione-a, escolha **Terreno do leito** e use **Prévia · rebaixar leito sob esta água**. Use novamente depois de alterar nível, profundidade, ondas ou geometria. O ajuste é explícito; água não fica vinculada a uma escavação automática. **Criar água** e **Desenhar rio / lago** continuam disponíveis para colocação livre na altura de construção.

O nível é horizontal, sem solver de inundação, corrente física ou cascatas. Escavação é limitada à malha do terreno e pode ficar larga em baixa resolução. Construções sem piso e geometrias de props exigem revisão manual. Para neve/água/gelo e seus limites de renderização, veja [LANDSCAPE.md](LANDSCAPE.md).

## Fluidez e acessibilidade

Controles têm unidades, labels, foco visível, texto com quebra e contraste maior. Botões têm alvos maiores em telas estreitas. Arraste de janela usa captura de ponteiro, `requestAnimationFrame` e somente transformação CSS; não recria a cena 3D durante a movimentação. As janelas animam somente opacidade na abertura e no fechamento; tarefas têm fade de 100 ms apenas ao serem abertas pelo usuário, sem reiniciar o efeito a cada edição. Não há animação de altura nem desfoque de fundo nas janelas flutuantes. `prefers-reduced-motion` desliga transições/animações da interface, inclusive as controladas por JavaScript. Estas escolhas não substituem benchmark no notebook/projetor de uso.

## Escultura de superfícies

Rocha/paredão geológico selecionado mostra Pincel de superfície aberto no topo de Propriedades. Esculpir esta superfície/T ativa o mesmo fluxo usado no terreno; o cursor acompanha a face atingida e permite elevar/rebaixar, projetar/recuar, suavizar e aplainar. Um traço = um desfazer; Esc cancela e retorna à seleção. Pintura de camadas/água conserva seu alcance no terreno. Controles paramétricos e materiais continuam disponíveis. Uso e limites: [ROCK_SCULPT.md](ROCK_SCULPT.md).

## Cenas de exemplo em Abrir

Cenas de exemplo ficam acima das cenas pessoais, com uma prévia real. Carregar abre uma cópia independente ainda não salva; Salvar cria um registro pessoal e o original continua disponível. A passagem da montanha oferece cinco enquadramentos, terreno/água/neve e peças editáveis, organizadas em pastas. [EXAMPLE_SCENES.md](EXAMPLE_SCENES.md) documenta o uso e os próximos passos visuais.
