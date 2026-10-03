# Tabletop — autoria de mapas

Data: 3 de outubro de 2026. Proposta de Fase 2, sem implementação. Contratos gerais em [ARCHITECTURE.md](ARCHITECTURE.md), apresentação em [IMMERSION.md](IMMERSION.md) e entregas em [ROADMAP.md](ROADMAP.md).

## 1. Filosofia: assistência com liberdade

O editor deve atender tanto à preparação rápida quanto ao trabalho cuidadoso de design de ambientes. Automatizar operações repetitivas não pode esconder transformações, materiais, luzes, câmeras ou propriedades do resultado.

Quick Build, Assisted Build e Expert Build são três formas de usar o mesmo editor. O mestre pode alternar entre elas a qualquer momento, inclusive dentro da mesma sala. Não existe formato simplificado nem entidade “automática” que só um gerador possa editar.

Controle completo significa autoria de layout, estruturas, composição, transforms, aparência, iluminação e apresentação. Importar um modelo não cria automaticamente um editor de vértices, UV, rigging ou escultura equivalente ao Blender. A geometria original pode ser preparada externamente; dentro do Tabletop suas instâncias e seus materiais continuam editáveis.

## 2. Referências de pesquisa e conclusões

| Fonte primária | Fato documentado | Aplicação proposta |
| --- | --- | --- |
| [Blender 4.2 — snapping](https://docs.blender.org/manual/en/4.2/editors/3dview/controls/snapping.html) | Distingue ponto que encaixa, alvo de encaixe e alinhamento/incremento. | Expor políticas separadas para token, pivot, extremidade de parede e superfície. |
| [Three.js — TransformControls](https://threejs.org/docs/pages/TransformControls.html) | Oferece mover/girar/escalar, espaço local/global, snap e eventos de interação. | Usar o gizmo como entrada de comandos; validação e histórico pertencem ao produto. |
| [Unity ProBuilder 6 — PolyShape](https://docs.unity3d.com/Packages/com.unity.probuilder@6.0/manual/polyshape.html) | Desenho de contorno, extrusão e edição posterior de forma/altura. | Autoria de estruturas por parâmetros e preview de medidas. |
| [Unity — prefab overrides](https://docs.unity3d.com/6000.0/Documentation/Manual/PrefabInstanceOverrides.html) | Instâncias podem manter alterações sobre o prefab de origem. | Preservar escolhas manuais ao revisar uma receita; não exigir instâncias vinculadas no MVP. |
| [Epic — Level Instancing](https://dev.epicgames.com/documentation/en-us/unreal-engine/level-instancing-in-unreal-engine) | Reutiliza conjuntos e permite edição contextual, com propagação para instâncias. | No Tabletop, preferir cópia independente inicialmente; atualizações posteriores terão diff explícito. |
| [Merrell et al. — Interactive Furniture Layout, 2011](https://graphics.stanford.edu/projects/furniture/) | Pesquisa combina manipulação manual e sugestões por critérios funcionais/visuais. | Usar regras pequenas e explicáveis; não adotar seu otimizador complexo como requisito do slice. |
| [Epic — PCG Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-overview) | Dados procedurais incluem transforms, bounds, seed e atributos. | Separar candidatos espaciais do renderer e avaliar metadados antes de criar entidades. |

Essas ferramentas são referências de interação e organização de dados. Não são dependências de runtime nem indicação de como Ordem implementa seu tabletop. As seções seguintes são propostas próprias.

## 3. Quick Build

Fluxo inicial: desenhar um retângulo no chão, conferir largura/comprimento, escolher porta e preset visual, revisar a prévia e aceitar “Criar sala”.

A medida mostrada representa o **espaço interno utilizável**. A espessura das paredes cresce para fora desse limite. O preview apresenta também a dimensão externa quando relevante, evitando que “5 × 7 m” tenha interpretações diferentes.

Resultado do MVP: piso, quatro paredes, abertura com porta, região da sala e ponto de partida de iluminação. Biblioteca pequena oferece props para colocação rápida. Mobiliar/decorar automaticamente entra nas versões seguintes; a estrutura inicial já é um Smart Build contextual útil.

Depois de aceitar, o mestre pode selecionar uma parede, mover a porta ao longo dela, redimensionar piso/sala, substituir material, mudar luz, mover um móvel e desfazer a operação. A sala não vira uma mesh única opaca.

Evolução: escolher uso — quarto, escritório, corredor — e densidade; receber uma composição com mobiliário principal, acessórios, decoração e iluminação. Um pacote pode ser aceito junto ou por partes, mas cada aceitação é uma transação coerente.

## 4. Assisted Build

O mestre constrói manualmente e solicita ajuda sobre seleção ou região. As sugestões aparecem com verbo, motivo e preview: “Adicionar luminária: esta área ainda não tem uma fonte local”, “Distribuir cadeiras: há espaço junto à mesa”, “Decorar parede: trecho disponível sem abertura”.

Aceitar, rejeitar, variar parâmetros ou editar a prévia são opções comuns. A UI não interrompe continuamente o trabalho; sugestões ficam no painel contextual ou são pedidas por comando. O nível de automação é preferência do mestre.

Exemplos de contexto futuro:

| Contexto confirmado | Sugestão | Verificação espacial |
| --- | --- | --- |
| Retângulo fechado em ferramenta de área | Criar sala, piso ou área aberta. | Dimensões, nível de apoio e aberturas escolhidas. |
| Cama com categoria/anchors anotados | Criado-mudo, luminária, tapete, armário. | Laterais disponíveis, passagem e suporte. |
| Área com uso “escritório” | Mesa, cadeira, computador, estante. | Mesa primeiro; acessórios no tampo; espaço de uso da cadeira. |
| Corredor identificado pelo autor | Distribuir luminárias, portas e quadros. | Eixo, paredes disponíveis e passagem reservada. |
| Sala marcada “abandonada” | Variantes gastas e decoração coerente. | Densidade limitada e acessos preservados. |

Reconhecer um retângulo permite sugerir uma sala; não autoriza concluir que qualquer desenho seja uma sala. Nome e semântica são confirmados pelo autor, especialmente em assets importados.

## 5. Expert / Free Build

Viewport central, biblioteca, árvore de entidades/layers e inspector completo. O mestre pode colocar qualquer asset, mover livremente, usar valores numéricos, girar, escalar, alterar altura, escolher espaço local/global, materiais por slot, luzes, ambiente, câmeras e propriedades avançadas.

Grid, snap e assistência são opcionais. O inspector e as ferramentas manipulam as mesmas entidades produzidas pelo Quick Build. Seleção múltipla, duplicação e alinhamento evoluem sem criar outro modelo de documento.

Props podem sobrepor-se por decisão artística. Alertas de circulação/colisão aproximada são consultivos na edição livre. Dados impossíveis — dimensões não positivas, referências ausentes ou porta que não cabe na parede — exigem correção ou conversão explícita para um prop independente.

Campos numéricos devem exibir unidades, espaço de coordenadas e apoio selecionado. `Esc` cancela o gesto; confirmar aplica uma entrada de histórico. Perda de captura do ponteiro cancela o preview incompleto e restaura o estado confirmado.

## 6. Grid e snapping

### 6.1. Configuração

Grid quadrado inicial, origem configurável em XZ, célula inicial editável de 1 m. Esse valor é conveniência de autoria, sem alegação de regra oficial de deslocamento. Alterar a célula não escala o mapa nem modifica posições existentes.

Separar:

- exibição do grid;
- snap absoluto ao grid;
- passos relativos de deslocamento/rotação;
- apoio em superfície;
- encaixe por anchors de peças modulares, na V2.

Um atalho temporário desliga snap durante o gesto; o estado visível informa que está livre. Exibir distância, altura, ponto de apoio e âncora durante colocação. TransformControls auxilia o gesto, mas contas de footprint/origem pertencem ao domínio.

### 6.2. Coordenadas negativas e footprints

Para uma coordenada `p`, origem `o` e passo positivo `s`, a célula sob o ponto é `floor((p − o) / s)`. Truncar para zero associa posições negativas à célula errada: com origem zero e passo 1 m, −0,2 está na célula −1.

Para alinhar o centro de um footprint de `n` células a bordas do grid, os centros possíveis são `o + s × (k + n/2)`, com `k` inteiro. Escolher o mais próximo equivale a usar `k = floor((p − o)/s − n/2 + 0,5)`. Em empate exato essa fórmula escolhe o índice maior; usar a mesma política nos dois eixos e no inspector.

| Footprint | Centros possíveis com origem 0 e célula 1 m |
| --- | --- |
| 1 × 1 | … −1,5; −0,5; 0,5; 1,5 … em X e Z. |
| 2 × 2 | … −2; −1; 0; 1; 2 … em X e Z. |
| 2 × 1 | Centros inteiros em X e meios inteiros em Z. |

Token encaixa pela base e footprint, prop pelo pivot/anchor selecionado, parede pela extremidade. Na rotação de 90° um footprint retangular troca os eixos; rotação arbitrária pode alinhar a base por posição sem prometer ocupação exata em células.

Footprints em metros que não sejam múltiplos da célula usam pivot/apoio e alerta de alinhamento, sem arredondar silenciosamente a dimensão física. Futura regra de deslocamento discreto é outro contrato, separado do snap do editor.

### 6.3. Altura e apoio

Y é altura; surfaceId identifica o apoio. O MVP usa um piso jogável e o chão de trabalho. Em mapas com sobreposição, escolher andar/superfície antes de colocar token; um clique no prédio não escolhe automaticamente o telhado.

Snapping de apoio posiciona a base; a altura visual do recorte/modelo não muda o footprint. Offset acima da superfície é editável. Ao mover um piso, o comando deve identificar objetos vinculados e mostrar quais apoios acompanham a mudança; o mestre pode desvincular um objeto.

## 7. Pisos, paredes, portas e janelas

### 7.1. Pisos e terreno

MVP: piso retangular com largura, comprimento, espessura, altura e material editáveis. Persistir parâmetros e ID da superfície; renderer reconstrói geometria. Não depender de mapa demonstrativo para criar do vazio.

V2: contornos poligonais, plataformas, escadas como assets/estruturas anotadas, recortes e superfícies sobrepostas. Terreno com elevação pode evoluir por heightmap, mas um heightmap não substitui pisos de prédio ou ponte.

Textura recebe escala física/repetição quando suportada. Redimensionar piso não deve esticar automaticamente todas as texturas; a política de UV/repetição precisa ser definida para cada superfície paramétrica.

### 7.2. Paredes

MVP: segmentos retos parametrizados por comprimento, altura, espessura e transform. Extremidade inicial é a referência local para medir aberturas. Materiais internos/externos podem ganhar slots sem reescrever a identidade da parede.

Para sala retangular, adotar encontros de canto calculados pelo gerador: duas paredes longitudinais cobrem os cantos e as transversais terminam entre elas, sem volumes coplanares duplicados. Mostrar contorno interno; preservar uma regra estável ao redimensionar. União automática entre salas e encontros arbitrários entra na V2.

Transformar o grupo/sala recalcula posições e orientações das estruturas em um comando composto. Redimensionar uma sala não escala móveis indiscriminadamente. Mostrar quais estruturas e aberturas mudarão; objetos existentes permanecem até a revisão explícita de layout.

### 7.3. Abertura e porta

A abertura é informação semântica da parede; o modelo da porta é sua representação visual. No slice o registro da porta contém a abertura hospedada. A partir dele o renderer cria as partes da parede ao redor do vão e a folha com pivot na dobradiça.

Posição da abertura é distância em metros desde o início da parede. Largura, altura e soleira precisam caber; aberturas na mesma parede não podem se interceptar de forma inválida. Alterar comprimento mantendo a referência inicial preserva essa distância; se deixar de caber, preview sinaliza conflito.

O autor escolhe dobradiça e lado de abertura. Ângulo inicial pertence ao mapa; ângulo atual da sessão fica em sessionState. Alterar estado não altera a abertura nem o mapa original.

Mover porta ao longo da parede atualiza parâmetros; mudar de parede exige reassociação válida. Apagar parede informa portas dependentes e as remove/converte no mesmo comando. Undo restaura geometria, parâmetros e IDs. Uma porta prop sem parede pode ser usada livremente, mas não finge abrir uma passagem.

### 7.4. Janelas e evolução estrutural

V2 usa o mesmo conceito de abertura para janela: parede hospedeira, posição, dimensões, peitoril, moldura e material de vidro. Representação visual, passagem e comportamento de sessão são decisões distintas.

Não iniciar com booleanos CSG gerais. Para vãos retangulares em paredes retas, construir segmentos ao redor é um caminho pequeno e verificável. Paredes curvas, aberturas irregulares e edição topológica exigirão formatos/ferramentas próprios, se forem necessários ao produto.

## 8. Alturas, andares, layers e grupos

`levelId` organiza um andar; `surfaceId` identifica onde algo está apoiado. Duas superfícies podem compartilhar XZ e ter alturas diferentes. A árvore oferece isolar andar, bloquear edição, ocultar teto/parede para apresentação e organizar props/luzes.

No MVP há um andar e grupos organizacionais. Na V2, andares recebem ID, nome e altura de referência. Transforms continuam mundiais até uma migração deliberada para hierarquia local; “mover andar” aplica um comando explícito às entidades associadas, sem dupla autoridade sobre Y.

Ocultação para enxergar a sala é filtro de apresentação. `audience: gm` protege um segredo da cena. Isolar um andar no editor não revela automaticamente entidades aos jogadores nem modifica a audiência delas.

Agrupar e desfazer grupo conserva IDs dos filhos. Instancing de props é otimização do renderer; seleção e edição continuam por ID de entidade, mesmo que várias instâncias usem a mesma geometria.

## 9. Props e construção modular

Props usam transform livre e referência de asset. Tamanho visual, footprint, pivot, frente e volume de uso são informações distintas. Uma cama com mesh grande não deve reservar o mesmo espaço que uma ilustração de token inclinada.

Na V2, anchors/sockets identificados por ID permitem encaixar parede, luminária ou móvel por relações compatíveis. Superfícies de suporte anotadas permitem colocar decoração sobre mesa e livros em prateleira. Não inferir essas funções apenas da bounding box de um GLB.

Edição de material por instância cria override próprio; não muda todas as cópias da biblioteca. Substituir prop pode manter transform/apoio, mas preview verifica diferença de bounds e clearances. Duplicação remapeia vínculos internos do conjunto.

## 10. Prefabs, templates e receitas paramétricas

| Recurso | Função | Política inicial |
| --- | --- | --- |
| Prefab de composição | Conjunto pequeno: mesa/cadeiras, luminária/luz ou estante/livros. | Materializar entidades com novos IDs. |
| Template | Ponto de partida maior: escritório, casa, mapa ou cena. | Cópia independente com origem registrada. |
| Receita paramétrica | Adaptar composição a medidas, contexto e estilo. | Propor entidades concretas e guardar resultado, parâmetros e versão. |

Uma receita de quarto aceita largura/comprimento internos, aberturas, estilo, densidade, quantidade desejada e preset de luz. Não estica uma mesh de quarto pronto: escolhe composição que caiba.

Em 5 × 7 m pode posicionar mobiliário principal e poucos acessórios. Em 8 × 10 m pode mudar relações, escolher variante e incluir zona adicional. Essas medidas ilustram parâmetros, sem garantir que qualquer kit real caiba nelas. As dimensões dos assets e os acessos decidem o resultado.

Ordem de resolução: estrutura/aberturas → zonas livres/circulação → móveis principais → acessórios relacionados → decoração → iluminação. Estilo normal, luxuoso, industrial, hospitalar ou abandonado altera catálogo e preferências; nenhuma classificação obriga todos os assets a possuir essas variantes.

MVP não precisa de editor de grafos nem biblioteca completa de prefabs. Uma receita interna de sala prova o fluxo. V2 acrescenta conjuntos e regras locais; V3 amplia composição paramétrica entre áreas.

## 11. Smart Build: contexto e proposta

Cada regra tem ID/versão, contexto, requisitos, parâmetros, gerador de candidatos, restrições, critérios de preferência e mensagem de explicação. O domínio recebe snapshot da seleção/área e catálogo de metadados; devolve proposta serializável de mudanças.

Algoritmo conceitual:

1. Capturar documento, versão local, área, superfície e objetos existentes.
2. Encontrar regras compatíveis com intenção confirmada e tags.
3. Ordenar assets elegíveis de forma estável.
4. Gerar candidatos por anchors, perímetros, eixo da área ou amostragem.
5. Rejeitar candidatos sem apoio, fora do escopo ou sobrepostos a ocupações/folgas reservadas.
6. Classificar por alinhamento, proximidade, variedade, estilo e legibilidade.
7. Produzir entidades, alterações, omissões e motivos.
8. Mostrar preview e permitir variar parâmetros/seed, aceitar ou cancelar.
9. Revalidar a versão local e aplicar o lote como uma transação.

No v1, retângulos orientados no plano XZ com intervalos de altura são suficientes para ocupação aproximada. Um livro sobre mesa não colide automaticamente com a mesa por compartilhar XZ: o apoio e a faixa vertical explicam sua relação.

Restrições fortes validam dados, apoio e limites do escopo da geração. Preferências estéticas pontuam candidatos. Folgas de uso/circulação são parâmetros de autoria, sem alegar norma arquitetônica ou regra oficial de RPG. O autor pode relaxá-las ou mover livremente o resultado.

Busca é limitada por candidatos/tentativas/iterações, com cancelamento e preview assíncrono quando necessário. Não repetir indefinidamente. Se só couberem três cadeiras, explicar a omissão da quarta e oferecer uma proposta reduzida antes do aceite; não concluir uma transação parcialmente em silêncio.

## 12. Procedural placement, auto-layout e auto-decoration

| Caso | Método proposto | Controles editáveis |
| --- | --- | --- |
| Cadeiras em mesa | Anchors ou distribuição no perímetro, orientação voltada à mesa e acesso reservado. | Quantidade, espaçamento, lados, modelo e posição de cada cadeira. |
| Livros em estante | Slots de prateleira e soma de larguras, com variação limitada. | Densidade, altura/inclinação, materiais e livros individuais. |
| Pequenos objetos | Amostragem em superfícies de apoio com exclusão de bordas/ocupações. | Região, orçamento de detalhes, seed e itens preservados. |
| Luminárias | Candidatos em teto/parede/anchors e distribuição por eixo. | Fonte visual, tipo de luz, cor, intensidade e sombra individual. |
| Floresta | Amostragem com distância mínima e áreas de exclusão para caminhos. | Espécies, densidade, escala, rotação e árvores por ID. |
| Sala abandonada | Conjuntos de variantes/entulho por zonas, preservando acessos. | Estilo, densidade, zonas, materiais e elementos individuais. |

A [distribuição de pontos do Blender](https://docs.blender.org/manual/en/4.3/modeling/geometry_nodes/point/distribute_points_on_faces.html) documenta modos aleatório/Poisson Disk, seed e distância mínima. Para o Tabletop, essa técnica é candidata a scattering; depois de amostrar centros, ainda é necessário verificar footprints transformados de árvores e props assimétricos.

Auto-layout reorganiza o escopo selecionado, preservando itens protegidos. Auto-decoration acrescenta conjuntos pequenos sobre o layout existente. Auto-lighting gera um ponto de partida visual. São ações separadas; solicitar decoração não reorganiza móveis sem informar.

## 13. Regeneração, identidade e preservação manual

Guardar o resultado materializado é obrigatório. Seed isolada não garante reprodução: algoritmo, catálogo e dimensões podem mudar. A proveniência futura registra versão da regra, parâmetros, seed, assets/revisões e assinatura das entradas espaciais relevantes.

Geradores usam ordenação estável e sub-seeds por papel semântico. Limite de tempo permite cancelar, mas não determina silenciosamente um resultado diferente em outra máquina. Redo usa o delta aceito, não executa novamente a busca.

Na V2, cada item gerado recebe `generationId` e slot lógico estável, como `bed.main` ou `table.chair.north.1`, associado ao UUID da entidade. Esses papéis não substituem identidade. Regenerar compara proposta nova com o conjunto atual:

- mesmo slot conserva ID;
- novo slot recebe ID;
- campo alterado manualmente vira override/proteção;
- exclusão manual suprime o slot para ele não reaparecer sem escolha;
- item removido da receita mas editado pelo autor é preservado como desvinculado, com aviso;
- conflito espacial de um item preservado fica visível para resolução.

“Preservar na regeneração” é diferente de bloquear edição. Operações disponíveis: variar itens não modificados, regenerar preservando mudanças, revisar substituição das mudanças e desvincular receita. Desvincular também pode ser desfeito.

No MVP, a receita materializa uma cópia independente; regeneração sofisticada não é oferecida. O autor modifica o resultado diretamente ou aceita outra proposta em escopo escolhido. A UI não anuncia preservação automática de overrides ainda inexistentes.

## 14. Ferramentas de polish

Polish oferece ajustes locais com preview, nunca uma revisão invisível do mapa inteiro:

- alinhar cadeira à mesa e distribuir intervalos;
- escolher variações de material sem mudar dimensões;
- reduzir detalhes que bloqueiam passagem;
- preencher um canto selecionado;
- distribuir luminárias e ajustar um preset de luz;
- sugerir enquadramento de área.

Cada ação mostra itens afetados e motivo. Pode preservar seleção ou itens protegidos. Atmosfera e iluminação seguem os mesmos comandos de look descritos em [IMMERSION.md](IMMERSION.md); não há algoritmo separado de luz “automática” que impeça edição manual.

## 15. Biblioteca, importação e metadados

Busca por nome/tags, categorias, preview, favoritos e coleções ajudam tanto a colocação manual quanto o Smart Build. O MVP prioriza catálogo pequeno curado e busca simples; organização avançada entra na V2.

Importação oferece preview com referência métrica, ajuste de unidade/escala, frente, pivot/base e slots de material. Preserva o original e registra a normalização. Dimensões geométricas podem ser calculadas; categoria cadeira/luminária, superfície de apoio e folga de uso precisam de anotação ou confirmação.

Metadados básicos: categoria, tags, bounds, pivot, orientação, footprint e materiais. Metadados V2: anchors com IDs, superfícies de suporte, clearances, contextos compatíveis e variantes. Uma luminária pode incluir anchor da fonte e sugestão de luz, distinguindo prop, emissive e iluminação real.

Um asset externo pode participar das sugestões assim que tiver os requisitos da regra, independentemente de vir da biblioteca interna. Assets incompletos continuam colocáveis manualmente. Importação não inventa portas funcionais ou áreas jogáveis dentro de um cenário GLB; o autor anota essas funções.

MVP aceita imagens e um caminho de GLB estático com extensões suportadas. V2 coleta dependências de glTF, texturas e decoders locais. Não prometer importação nativa de `.blend`, projetos Unity ou formatos de outros VTTs sem um importador específico.

## 16. Undo/redo e persistência

Preview é transitório, sem autosave. Aceitar proposta aplica comando composto com deltas concretos, IDs e referências. Criar uma sala inteira é uma entrada; undo não deixa parede, porta ou luz órfã. Movimentos contínuos guardam começo/fim do gesto.

Se a cena mudar enquanto uma sugestão está aberta, recalcular ou mostrar conflito antes do commit. Falha de validação não aplica metade do lote. Undo/redo restaura parâmetros, materiais, geração e supressões implementadas; nunca dispara cue musical.

Salvar guarda entidades, parâmetros, look e referências de assets, sem meshes/DOM ou URLs temporárias. Reabrir não gera novamente a sala. Duplicar conjunto remapeia referências locais e mantém assets compartilhados.

Rascunhos e conflitos de revisão seguem [ARCHITECTURE.md](ARCHITECTURE.md). Autosave pode confirmar o documento final, mas não garante histórico entre reinícios. Asset precisa estar em armazenamento gerenciado antes de ser tratado como referência durável.

## 17. Validação da experiência

No piloto, partir do vazio e criar uma sala utilizável; editar um resultado automático; colocar tokens/props; preparar luz e câmera; salvar, fechar e reabrir. Usar o limite de dez minutos mencionado pelo usuário como exercício de produto, não como promessa de tempo garantido.

Registrar tempo total, correções manuais, sugestões aceitas/rejeitadas, clareza do apoio/snap e legibilidade no projetor. Uma sessão de autoria detalhada também precisa funcionar: alterar medidas, transformar livremente, ajustar materiais/luzes e substituir assets sem esbarrar em conteúdo bloqueado.

Testes essenciais futuros: snap negativo/multicélula e empate; criação/undo/redo de sala; abertura real; resize/delete com dependências; duplicação com remapeamento; save/load equivalente; recuperação de rascunho; importação persistente; proposta obsoleta rejeitada antes do commit.

## 18. IA futura e limites

IA poderá sugerir tags de asset, interpretar intenção textual, recomendar paletas ou aprender preferências a partir de composições aprovadas. A [síntese de arranjos por exemplos de Fisher et al., 2012](https://graphics.stanford.edu/projects/scenesynth/) demonstra uma direção orientada a dados; exigiria catálogo/treinamento e curadoria próprios.

Qualquer IA deverá produzir o mesmo formato de proposta usado pelas regras. Validação espacial, assets existentes, preview, revisão e aceite continuam obrigatórios. Inferências semânticas precisam de confirmação. Operação presencial offline e autoria completa não dependem de serviço generativo.

Primeiras decisões fixadas: medidas internas de sala, paredes retas e aberturas retangulares, transforms mundiais, um andar no MVP, cópia independente de receita e liberdade manual sobre resultados. Validar depois: interação com trackpad, kits reais, folgas úteis à mesa, encontros não retangulares e necessidade de receitas maiores.
