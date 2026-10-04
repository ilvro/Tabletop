# Evolução estrutural e polish

Entregue em 3 de outubro de 2026. Este incremento acrescenta relevo, recortes, paredes de contorno, andares/camadas e ancoragem, além das operações locais de polish. Tudo é materializado no documento e participa de undo/redo, salvamento, mapas reutilizáveis e projeção pública.

Para testar pela interface, siga [Roteiro de construção e ajustes](TESTAR_CONSTRUCAO.md), com passos e resultados esperados. A aba Construir agora agrupa os controles por tarefa em blocos recolhíveis ordenados alfabeticamente.

## Terreno

Em **Construir → Terreno e relevo**, escolha largura/comprimento em metros e resolução de 2 a 64 divisões por eixo. **Criar terreno** cria uma superfície independente dos pisos do prédio.

Selecione o terreno, ajuste raio/força e ative o pincel com **T** ou pelo botão no inspetor. **T** alterna entre pincel e seleção; **[**/**]** mudam seu tamanho. Há **Elevar**, **Rebaixar**, **Suavizar** e **Nivelar**. A altura de nivelamento é Y mundial; as alturas da malha são locais ao Y do terreno. O contorno circular ou quadrado mostra a área do pincel. Arrastar produz uma prévia; soltar aplica um único comando. **Esc** cancela o traço e **Q** volta à seleção. O inspetor também permite editar uma altura pelo índice do vértice, ordenado por linhas de Z e depois X.

Tokens, objetos com apoio explícito, decoração sobre móveis e luzes acompanham o relevo confirmado. O cálculo de altura usa os mesmos dois triângulos de cada célula que a malha renderizada. Ao salvar, persistem as alturas, sem regeneração a partir do pincel.

O terreno é um heightmap limitado a 65 × 65 vértices: permite colinas, vales e montanhas com uma altura por posição XZ. Cavernas, saliências, erosão, importação de imagens de altura e streaming não fazem parte deste incremento. Pontes e pisos sobrepostos continuam entidades independentes. A resolução pode ser alterada depois com reamostragem de alturas e máscaras de pintura; reduzir a resolução pode perder detalhes e é desfeito por Ctrl+Z. Alterar largura/comprimento mantém a malha existente.

Os pincéis oferecem formato circular/quadrado, dureza de 0 a 100% e encaixe nos vértices da malha. Dureza máxima aplica força uniforme na área, permitindo platôs quadrados com **Nivelar**. O contorno do cursor usa o mesmo centro encaixado e orientação local do traço. **Facetas marcadas** muda a iluminação das faces, preservando a geometria de apoio.

O terreno oferece até oito `paintLayers`, cada uma com ID, nome, cor, opacidade, visibilidade e máscara por vértice. **Pintar** aumenta a cobertura da camada selecionada; **Apagar** diminui e revela as camadas inferiores. Alterar a cor não altera a máscara. A pintura não desloca apoios nem altera alturas; cancelamento, histórico, duplicação e persistência preservam as máscaras. Terrenos antigos sem camadas continuam com sua cor de material. A camada inicial **Grama** cobre todo o terreno novo, e novas camadas começam vazias. Cores são interpoladas entre vértices, sem texturas externas ou vegetação automática.

## Pisos recortados e paredes

Selecione um piso retangular ou poligonal e use **Recortar piso · vão de escada / pátio** no inspetor (também em **Construir → Pisos, paredes e acessos**). Desenhe o contorno interno e conclua com **Enter**. O desenho usa a altura do piso e converte os pontos para suas coordenadas locais, incluindo pisos rotacionados. Furos aparecem no inspetor para edição numérica e remoção. Há até 16 furos de até 64 vértices; eles devem ficar estritamente dentro do piso, sem tocar ou cruzar os demais contornos. O recorte é físico, útil para poços, pátios e vãos de escada. As receitas de mobiliário respeitam essas regiões sem apoio.

**Paredes do contorno** apresenta uma proposta para os segmentos do contorno externo. O gerador reaproveita intervalos colineares existentes, inclusive compartilhamento parcial entre cômodos, preservando IDs, portas e janelas. Divergências de altura/espessura e paredes protegidas aparecem no relatório. Aceitar é uma transação. Paredes compartilhadas registram `floorIds`; não são dependentes exclusivos de um dos pisos. Excluir um piso remove seu vínculo e conserva a parede compartilhada. Mover o andar movimenta suas estruturas; mover um piso isolado não redesenha automaticamente os limites compartilhados.

A renderização calcula encontros angulados por mitras limitadas e terminações em T. Aberturas continuam recortadas na parede hospedeira. O cálculo atende segmentos retos no mesmo plano de base; paredes curvas, CSG geral, encontros em alturas diferentes e redes topológicas arbitrárias continuam fora do escopo. O contorno do piso é a linha de referência das novas paredes, e o gerador não substitui silenciosamente paredes paralelas deslocadas dessa linha.

## Construção de vários andares

Em **Construir → Andares e camadas**, crie um andar na altura de construção. O primeiro pode adotar a geometria existente nessa altura e seus dependentes. Selecione um andar para mudar a altura de construção e criar pisos, salas e estruturas associados a ele. Cada objeto também oferece associação explícita a andar/camada no inspetor.

Editar a altura de um andar desloca seus transforms mundiais e dependentes uma única vez. **Copiar construção** cria um andar 3 m acima, com novos IDs para pisos, paredes, aberturas, móveis e luzes. Os personagens, o terreno e os acessos entre níveis permanecem na origem. As cópias de móveis são independentes da receita original; o mestre pode gerar uma nova receita no piso copiado. Os vínculos de apoio, ancoragem, materiais e furos são conservados.

Escadas e rampas associam automaticamente origem/destino quando há níveis compatíveis. Na colocação sobre um piso de andar, a UI usa o próximo nível superior e ajusta o desnível. O inspetor permite escolher os dois níveis. Quando ambos estão associados, altura/base acompanham as alturas dos andares; para ajustar manualmente o desnível ou Y, retire uma associação. A direção continua sendo Z local positivo, editável por rotação. O acesso oferece apoio de tokens, sem simular movimento ou regras arquitetônicas de acessibilidade.

**Isolar no editor** é um filtro temporário e não muda o documento ou a audiência dos jogadores. Acessos que conectam o nível isolado permanecem acessíveis. **Visível/Oculto** persiste e afeta a apresentação. Andares e camadas podem bloquear edição; para remover sua organização, **Desvincular** mantém os objetos e suas posições. Camadas são semânticas, independentes das pastas; uma camada “Tetos” pode reunir os pisos superiores que se deseja ocultar. Segredos continuam controlados por audiência, separadamente da vista de trabalho.

## Fixação em parede / teto

Props e luzes locais oferecem **Fixar em parede / teto → Fixar em**. Um socket de parede recebe X/Y/Z locais; **Teto sob piso** usa a face inferior do piso superior, descontando sua espessura. A ancoragem substitui o apoio explícito, acompanha posição/rotação do host e pode ser editada numericamente ou removida sem deslocar o objeto. Excluir o host remove seus dependentes no mesmo histórico; undo restaura tudo. Bloqueios do host protegem a ancoragem.

Este incremento oferece sockets estruturais de parede/teto. Um editor de sockets por asset, categorias de compatibilidade e ingestão de anchors do catálogo continuam na ampliação da biblioteca.

## Polish e ajustes finos

O inspetor mostra **Alinhar e ajustar objetos**, com somente as opções relevantes e instruções para cada operação, para seleção simples ou múltipla (**Shift+clique**). As operações geram uma prévia com contagem, itens preservados, motivos e conflitos. **Cancelar** conserva o documento; **Aceitar** aplica um passo de histórico e rejeita propostas obsoletas.

| Operação | Comportamento |
| --- | --- |
| Alinhar / distribuir | Usa pivôs/bordas e distribui intervalos sem mover as extremidades. Inclui luzes locais. |
| Variar rotação | Variação determinística limitada, conservando inclinações manuais. |
| Variar materiais | Paletas natural, industrial e envelhecida por instância, sem alterar dimensões. A prévia mostra as cores propostas. |
| Orientar para referência | Orienta a frente dos props selecionados para uma mesa/objeto escolhido. |
| Liberar passagens | Identifica props selecionados que invadem folgas de portas e acessos e sugere deslocamentos próximos, respeitando piso/furos e outros props. Reporta falta de espaço. |
| Decorar canto | Propõe uma luminária do catálogo em um canto livre do piso escolhido. |
| Uniformizar luzes | Usa a cor da primeira fonte e a intensidade média das luzes locais selecionadas. |
| Enquadrar referência | Ajusta somente a câmera de trabalho ao piso/objeto escolhido. Publicação da câmera continua explícita. |

As novas operações preservam itens bloqueados e ancorados, registrando o motivo. Folgas de passagem são parâmetros de autoria; a busca é local e limitada a 96 candidatos por prop. Não é um solver geral de circulação. Decoração de canto usa o catálogo local existente e não amplia receitas/prefabs. Paletas alteram cor/rugosidade/metalicidade; não acrescentam texturas externas.

## Contrato e validação

O schema 2 passa a aceitar campos opcionais; documentos antigos continuam carregando sem migração destrutiva. `layout.levels` contém ID/nome/elevação/visibilidade/bloqueio/audiência; `layout.layers` usa os mesmos campos sem elevação. Entidades, tokens e luzes podem referenciar `levelId` e `layerId`. Acessos têm `fromLevelId`/`toLevelId`, pisos podem ter `holes`, paredes têm `floorIds`, terreno tem dimensões/`segments`/`heights`, `flatShading` opcional e `paintLayers` opcionais (`id`, `name`, `color`, `opacity`, `visible`, `weights`) e props/luzes podem ter `anchor: { hostId, socket, offset }`.

Validação rejeita referências ausentes, ciclos de apoio/ancoragem, alturas não finitas, malhas incompatíveis, furos inválidos e acessos que não respeitam os níveis. A duplicação de documento remapeia também os novos IDs/referências. A projeção filtra andares/camadas secretos ou ocultos e dependentes, e limpa vínculos com objetos removidos.

Verificação: **92 testes unitários/de integração**, incluindo raycasts na geometria real, e **sete testes E2E**, executados sequencialmente. O novo fluxo percorre escultura/cancelamento, ajuste numérico, recorte, contorno repetido, cópia/altura/isolamento de andar, acesso associado, ancoragem, material, save/reload, apresentação e pintura de neve com rastros de grama. Há também teste de persistência após reinício do servidor e duplicação. Capturas ficam em `test-results/structural-evolution.png`, `test-results/structural-presentation.png` e `test-results/terrain-paint.png`. WebGL por software no Chromium não representa benchmark no notebook/projetor.

A fixação em grupo está disponível em **Shift+seleção → botão direito → Fixar em parede / teto…**. Escolha a parede/piso-teto, revise a prévia e aceite. A seleção é preservada no menu da cena e da árvore. A operação é uma única transação, conserva objetos bloqueados e coloca objetos/luzes junto à face mais próxima da parede ou abaixo do piso. A prévia corresponde às posições aceitas. **Alinhar e ajustar…** no mesmo menu abre as operações de composição.

## Composições ancoradas

**Ancorar objetos juntos** une uma seleção numa pasta com `anchored: true` e `transform`. Clicar em qualquer membro seleciona a composição inteira; mover, girar no eixo Y, redimensionar uniformemente, duplicar e copiar/colar operam sobre a unidade. **Desancorar objetos**, disponível na pasta, menu e inspetor, remove o vínculo da composição preservando sua pasta, objetos, posições e apoios originais. Não há fusão destrutiva das malhas.

A composição tem um pivô na média das posições dos membros quando é criada; os objetos permanecem materializados em coordenadas mundiais. O adaptador Three.js monta um nó de transformação preservando a pose mundial de cada membro, enquanto o domínio aplica o mesmo delta a todos em uma única operação de histórico. Dependentes de apoio são incluídos na transformação sem deslocamento duplo. Composições podem conter outras composições; a seleção resolve a unidade mais externa. Escala é uniforme para preservar posições relativas sem introduzir cisalhamento. Fixações em parede/teto continuam independentes: quando um objeto está fixado a um suporte externo à seleção, inclua esse suporte ou solte a fixação antes de unir/mover a composição.

Testes específicos: `tests/assemblies.test.js` e `tests/e2e/assemblies.test.js`, incluindo mesa + lamparina, arraste de um membro movendo o conjunto, rotação/tamanho, copiar/excluir/colar, desancorar pela pasta, undo/redo e save/reload. Captura: `test-results/assemblies.png`.
