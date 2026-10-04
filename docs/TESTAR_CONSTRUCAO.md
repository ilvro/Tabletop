# Roteiro para testar construção e ajustes

Na aba **Construir**, há um único conjunto de blocos em ordem alfabética: **Andares e camadas**, **Grid e precisão**, **Mobiliar cômodo**, **Peças avulsas**, **Personagens**, **Pisos, paredes e acessos**, **Sala** e **Terreno e relevo**. Clique no título para abrir ou recolher a tarefa. O inspetor à direita acompanha a seleção; a aba **Cena** permite selecionar pela lista quando há objetos sobrepostos.

## 1. Criar uma colina e um vale

1. Abra **Construir → Terreno e relevo**. Para começar, mantenha 20 × 20 m e 32 divisões. Clique em **Criar terreno**.
2. O terreno fica selecionado. No topo do inspetor à direita, abaixo do nome, aparece **Pincel de terreno · T**. Escolha **Elevar** e pressione **T**, ou clique em **Ativar pincel · T**.
3. Arraste com o botão esquerdo sobre o terreno. O círculo mostra o raio; ao soltar, a alteração é confirmada. Você deve ver uma colina. **Ctrl+Z** desfaz todo esse traço.
4. Escolha **Rebaixar** e arraste numa área plana para criar um vale. **Suavizar** reduz diferenças entre alturas. **Nivelar** aproxima a região da altura indicada; esse campo aparece somente nesse pincel e usa metros no mundo.
5. Pressione **T** novamente, clique em **Parar pincel · Q / T** ou pressione **Q** para selecionar objetos novamente. **Esc** durante um traço o cancela.

A força controla quanto cada aplicação altera o terreno; um arraste longo pode acumular mais alteração. Em **Acabamento, malha e alturas exatas**, há a edição de um vértice por índice, caso você precise de uma altura exata. Isso é opcional para testar os pincéis.

## Pincéis quadrados, platôs e facetas

1. Escolha **Nivelar** e informe a altura desejada no mundo (por exemplo, 2 m).
2. Use **Intensidade = 1**, **Formato = Quadrado**, **Dureza = 100%** e marque **Encaixar pincel na malha**.
3. Pressione **T** e arraste. A área interna recebe uma altura uniforme; as bordas seguem a resolução da malha. **[** e **]** ajustam o tamanho do pincel ativo.
4. Em **Acabamento, malha e alturas exatas**, escolha **Facetas marcadas**. Menos divisões por eixo produzem faces maiores; mais divisões dão controle de detalhes menores.
5. Para voltar a colinas suaves, use **Circular**, dureza baixa e acabamento **Suave**.

O formato é a área afetada pelo pincel. A dureza controla a transição da força até sua borda. O encaixe usa os vértices do terreno e seus eixos locais, inclusive em terreno rotacionado, independentemente do snap de objetos no grid. Um pincel menor que a distância entre vértices pode não atingir nenhum deles sem encaixe. Diminuir a resolução pode perder detalhes pequenos; **Ctrl+Z** restaura a malha e pintura anteriores.

## Pintar neve com rastros de grama

1. Um terreno novo começa com a camada **Grama**. Na seção **Camadas de cor**, clique em **Nova camada de cor**; a nova camada fica selecionada e a ferramenta muda para **Pintar camada de cor**.
2. Em **Editar cor e propriedades**, dê o nome **Neve** e escolha uma cor branca. A máscara começa vazia, então a grama ainda aparece.
3. Pressione **T** e pinte somente onde deve haver neve. A pintura não muda as alturas do terreno.
4. Escolha **Apagar pintura da camada** e passe um pincel pequeno onde quer deixar rastros. Isso revela a grama que ficou embaixo.
5. Troque a cor da camada **Neve** para outra cor: somente as regiões pintadas mudam. Você pode alterar a opacidade, ocultar uma camada, reordená-la ou removê-la. Tudo pode ser desfeito.

Até oito camadas de cor são compostas em ordem; as últimas cobrem as primeiras. São camadas de pintura sobre a mesma malha, independentes das camadas de organização da cena. Apagar uma camada não remove alturas nem a pintura das outras. As cores são interpoladas entre vértices; a resolução da malha limita a largura e precisão dos rastros. Essas camadas aplicam cores, sem texturas de neve/grama ou vegetação automática.

## 2. Ancorar objetos juntos: mesa + lamparina

1. Coloque uma mesa e uma lamparina na cena. Selecione os dois com **Shift+clique**, na cena ou na lista da aba **Cena**.
2. Clique com o botão direito em um dos selecionados e escolha **Ancorar objetos juntos**. A mesma ação aparece no inspetor da seleção múltipla.
3. Uma pasta **ancorada** surge na aba **Cena**. Os objetos mantêm suas posições. Clicar em qualquer membro seleciona a composição inteira.
4. Use **G** para mover, **R** para girar ou **V** para alterar seu tamanho uniforme. Os campos do inspetor também afetam todos os objetos juntos. Duplicar e copiar/colar conservam o conjunto como uma unidade independente.
5. Na pasta, clique em **Desancorar objetos** (também disponível no menu de contexto e no inspetor). Os objetos mantêm as posições e ficam selecionáveis individualmente; a pasta continua para organização. **Ctrl+Z** restaura a ancoragem.

A composição preserva os objetos e seus vínculos originais, incluindo apoios. A união, as transformações e a desancoragem podem ser desfeitas; a composição também é preservada ao salvar e reabrir. Objetos bloqueados não podem ser unidos ou transformados pela composição.

## Fixação adicional numa parede ou teto

**Fixar em parede / teto** vincula objetos à face de uma parede ou piso superior. Esse comando tem seu próprio fluxo de prévia. **Ancorar objetos juntos** cria a composição descrita acima.

1. Coloque dois objetos da biblioteca ou luzes locais. Selecione-os com **Shift+clique** na cena ou na lista da aba **Cena**.
2. Opcionalmente inclua a parede na seleção. Clique com o botão direito sobre um dos selecionados e escolha **Fixar em parede / teto…**. A seleção múltipla é conservada.
3. No inspetor, escolha **Fixar em**. Se você incluiu uma parede ou piso na seleção, ele já aparece como referência. Para teto, escolha o **piso do andar de cima**; a fixação usa sua face inferior.
4. Clique em **Ver prévia da fixação**. Objetos serão colocados junto à face da parede mais próxima, ou abaixo do piso escolhido. Eles acompanham também a rotação do suporte. Revise e escolha **Aceitar proposta** ou **Cancelar**.
5. Selecione a parede/piso e mude X em 1 m. Os objetos fixados devem acompanhá-lo. **Ctrl+Z** desfaz o movimento; outro desfazer desfaz a fixação em grupo.

A fixação vale para objetos da biblioteca e luzes locais. Pisos e paredes da seleção servem de referência; tokens não são fixados. Objetos bloqueados são preservados. Para soltar, selecione o objeto e escolha **Livre** em **Fixar em**. A mesma opção fica nas propriedades de uma seleção simples.

## 3. Alinhar e ajustar objetos

1. Coloque três cadeiras. Selecione primeiro a cadeira que será a referência e acrescente as demais com Shift.
2. Clique com o botão direito e escolha **Alinhar e ajustar…**, ou use o bloco com esse nome no inspetor da seleção múltipla.
3. Escolha **Alinhar**, eixo **X** ou **Z** e **Centro**. **Ver prévia dos ajustes** deve mostrar as demais alinhadas ao primeiro objeto, que fica parado. Cancele para comparar; depois aceite.
4. Experimente **Distribuir espaços / luminárias** com três objetos. Os extremos ficam parados e o objeto intermediário recebe espaçamento uniforme. É necessário ter pelo menos três selecionados.
5. Experimente **Variar materiais**. Somente paleta/variação aparecem; **Orientar para mesa / referência** mostra a escolha da referência, e **Liberar passagens** mostra a folga. Cada operação traz suas próprias instruções no inspetor.

## 4. Abrir um vão de escada num piso

1. Crie um piso em **Peças avulsas → Piso** e deixe-o selecionado. Se estiver sobre outro piso/terreno, use **Cena** para garantir a seleção correta.
2. No inspetor, clique em **Recortar piso · vão de escada / pátio**. Use a câmera **Superior** para enxergar o desenho.
3. Clique em quatro cantos de um quadrado **inteiramente dentro do piso**, sem tocar sua borda. Pressione **Enter**.
4. Você deve ver através do piso nessa região. O recorte remove também a espessura: é um vão real da geometria, útil para uma escada atravessar o piso do andar superior ou para um pátio aberto.
5. Abra **Recortes do piso → Furo 1** para ajustar os cantos numericamente ou remover o recorte. **Ctrl+Z** também restaura o piso.

O vão só corta o piso selecionado: outro piso ou terreno abaixo pode continuar visível. O recorte não cria escada automaticamente.

## 5. Compartilhar paredes e ver encontros em T

**Parede compartilhada** significa uma única parede entre dois cômodos contíguos, em vez de duas sobrepostas. **Encontro em T** é onde uma divisória termina na lateral de outra parede; os ajustes das pontas são automáticos, inclusive para paredes oblíquas.

1. Em **Peças avulsas**, crie um piso e ajuste suas dimensões para 6 × 6 m, posição X=0, Z=0.
2. No inspetor desse piso, clique em **Criar paredes do contorno**, revise e aceite. As quatro bordas recebem paredes.
3. Crie outro piso 6 × 6 m em X=6, Z=0, na mesma altura. Gere e aceite suas paredes do contorno.
4. A borda em X=3 é comum aos dois pisos. Na lista da cena, devem existir **sete paredes**, em vez de oito. Gerar o contorno novamente não deve duplicá-las.
5. Selecione o piso da esquerda e crie uma parede avulsa. Ajuste posição X=0, Y=0, Z=0, rotação Y=0 e comprimento=3. Ela termina na parede compartilhada em X=3, formando um T. Veja o encontro por cima e em perspectiva. Não há um botão para “junção em T”: o acabamento é calculado ao renderizar.

Use pisos poligonais para experimentar cantos oblíquos. Paredes com alturas/espessuras incompatíveis ou bloqueadas aparecem no relatório para revisão. Mover um piso isoladamente não redesenha suas paredes compartilhadas.

## 6. Construir um segundo andar e conectar acessos

1. Abra **Andares e camadas → Novo andar** após construir o térreo na altura 0. O primeiro andar adota a construção existente nessa altura.
2. Clique em **Copiar construção**. Surge um andar 3 m acima com uma cópia editável. **Isolar no editor** facilita trabalhar nele; **Mostrar todos** permite comparar os dois.
3. Recorte um vão no piso superior. Selecione o andar de baixo em **Andar de construção**, depois coloque uma escada em **Pisos, paredes e acessos → Escada**.
4. No inspetor da escada, confira **Origem** e **Destino** em **Andares conectados**. Se necessário, escolha os dois andares explicitamente.
5. Mude a altura do andar superior para 4 m. O piso superior sobe e o desnível da escada associada acompanha a alteração. Ajuste posição, rotação e comprimento para a escada chegar ao vão.

Recorte, posicionamento do acesso e associação dos andares são ações separadas. A escada/rampa não cria nem procura automaticamente um vão no piso superior.


## 7. Personalizar madeira, metal e terreno

1. Selecione um piso e abra **Material e textura → Madeira**. Escolha 8 tábuas por repetição, orientação vertical, juntas de 5% e brilho 0,6. Observe tábuas mais estreitas/escuras; alterne para horizontal e parquet.
2. Escolha **Cor da textura**. A aplicação passa para **Recolorir · preservar detalhes**; veios/juntas continuam visíveis. Em **Contraste, saturação e variação**, saturação 0 retira a cor e seed produz outro desenho. O bloco continua aberto após cada alteração.
3. Selecione um objeto e escolha **Metal**. Compare escovado, liso, chapa xadrez, ondulado e enferrujado; varie desgaste, tamanho e rotação. Em objetos com materiais nomeados, escolha apenas um em **Aplicar acabamento em**.
4. No terreno, escolha a camada e abra **Editar material e propriedades**. Os mesmos controles personalizam a camada; trocar cor/desenho conserva a região pintada.
5. Desfaça/refaça, salve e reabra a cena. As configurações devem permanecer. Abra o projetor e edite a madeira: o material muda e a câmera publicada conserva seu enquadramento.

Quantidade de tábuas é por repetição, não por objeto inteiro. Relevo altera a iluminação aparente; não muda geometria ou colisão. Detalhes em [MATERIALS.md](MATERIALS.md).
