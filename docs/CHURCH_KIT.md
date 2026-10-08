# Kit arquitetônico e ritual da Igreja Antiga

Kit inicial de 6 de outubro, ampliado em 7 de outubro de 2026: **30 assets originais locais**, reutilizáveis e distribuídos na biblioteca, que passa a **232 modelos**. Autoria baseada na composição das seis imagens fornecidas pelo usuário; não são modelos oficiais nem reproduções extraídas da série. A [cena completa do templo e vale](IGREJA_ANTIGA_CENA.md) está disponível na galeria de exemplos.

## Reconstrução pelas referências de 7 de outubro

Oito receitas adicionais em `scripts/library-church-reconstruction.js`: cobertura de duas águas, tesoura de madeira, empena triangular, vitral com chumbo em ambas as faces, retábulo monumental, efígie decapitada com pregas/asas fragmentadas, Dama de Ferro com aros espinhados e árvore retorcida. Os modelos anteriores não foram alterados. A cena usa as novas versões; peças anteriores continuam disponíveis para cenas pessoais.

## Encontrar e usar

Abra **Assets**, procure **igreja antiga** ou filtre a tag **kit gótico**. As peças estão em **Arquitetura / Igreja antiga** e **Ritual / Igreja antiga**. A busca retorna 30 peças; use **Mostrar mais assets** depois dos 24 cartões iniciais. Clique para colocar; colocação repetida, transformações, materiais, copiar/colar, histórico, grupos e salvamento usam os fluxos comuns do editor. Disponível no servidor local e no Pages.

Os modelos usam metros, pivot na base e centro horizontal. Frente padrão +Z; teto e nervuras se repetem no eixo Z. O catálogo contém as dimensões/footprints de cada peça, calculados a partir da geometria. Organize cobertura, arquitetura e decoração em grupos/camadas próprios para controlar visibilidade.

| Arquitetura | Uso |
| --- | --- |
| Pilar fasciculado com capitel | Base, quatro colunelos e capitel, com altura de 5,4 m. |
| Arcada semicircular vazada | Vão inferior arredondado, impostas e moldura dupla. |
| Arco ogival vazado | Vão pontiagudo com duas ordens de moldura. |
| Balcão semicircular com balaústres | Laje, guarda-corpo curvo e escoras, projeção para +Z. |
| Balaustrada reta de pedra | Trecho de aproximadamente 3 m, para galerias e bordas. |
| Vitral ogival vermelho com traceria | Lancetas, medalhão e peças de chumbo/ferro, vidro translúcido emissivo. |
| Nervuras de abóbada cruzada | Vão de 9,6 m, módulo longitudinal de 4 m, sem teto opaco. |
| Cobertura ogival modular | Casca sólida, módulo longitudinal de 4 m e interior livre. |
| Contraforte escalonado | Suporte de fachada em três patamares. |
| Pináculo com florões | Coroamento e agulha quadrangular. |
| Empena ogival maciça | Fecha as extremidades da cobertura mantendo seu perfil. |
| Alvenaria com vão ogival | Preenche os cantos acima do vitral, com abertura real. |
| Torre sineira com vãos abertos | Torre cenográfica de aproximadamente 13 m, com quatro aberturas superiores. |

| Peças características | Uso |
| --- | --- |
| Dama de Ferro com portas abertas | Interior aberto, portas espinhadas, aros e halo radial; estática. |
| Serafim decapitado de pedra | Asas com penas sobrepostas, braços erguidos, veste e pescoço fraturado. |
| Cadeira de espaldar pontiagudo | Assento de madeira e entalhe ogival. |
| Pendão ritual de tecido rasgado | Tecido vinho e cruz dupla original; frente +Z. |
| Correntes e ganchos suspensos | Cinco conjuntos com elos vazados e ganchos curvos. |
| Mesa longa de banquete | Tampo de 5,4 m, cavaletes e travessa, apoio a 1,04 m. |
| Cruz dupla de ferro | Símbolo original de fachada/ritual, com emissão editável. |
| Prato e cálice de banquete | Decoração de tampo, sem luz própria. |
| Candelabro de cinco velas | Chamas emissivas estáticas, sem luz dinâmica automática. |

## Montagem estrutural e apoios

Arcos têm **vazios geométricos reais**, mas são props: não recortam uma parede existente nem são portas funcionais. Para um acesso, deixe o vão livre na montagem das paredes. O vitral também é um modelo avulso; não altera o contorno retangular das janelas estruturais do editor.

O balcão tem topo da laje a **1,14 m da base**, mas seu contorno é semicircular. Ele não declara apoio retangular para tokens, porque isso permitiria apoios fora da laje. Acrescente um **piso poligonal** seguindo o contorno na altura da superfície e associe-o ao andar correto. A mesa possui apoio anotado, adequado a seu tampo retangular. Correntes normalizam a base no gancho mais baixo: eleve a peça ao instalá-la.

Torre, nervuras e cobertura são módulos cenográficos. A torre tem base inferior maciça; para interior navegável, construa paredes, pisos e escadas separados. Coloque cobertura em grupo/camada própria e oculte manualmente para jogar no interior ou em vista superior. Não foi implementado cutaway de telhados.

## Materiais e luz

Escolha **Aplicar acabamento em** para editar um material nomeado: `limestone`, `stone`, `carving`, `wornStone`, `wood`, `iron`, `brass`, `cloth`, `glass`, `amberGlass`, `wax`, `flame`, `metal`, `food` ou `ruby`, conforme a peça. A biblioteca utiliza texturas procedurais existentes para alvenaria, madeira, ferro oxidado e microtextura da estátua. Os materiais originais são próprios de cada receita; alterações de uma instância não modificam outra.

O vidro é translúcido, tem emissão e não projeta uma sombra opaca. O vidro sozinho não projeta seu desenho ou sua cor no ambiente. Selecione o modelo e aplique **Luz neste objeto → Janela / vitral** para acrescentar uma spot com padrão procedural editável; escolha a origem/direção para iluminar a nave. O desenho da projeção é independente da geometria do vidro. Nas chamas, use **Vela / candelabro** ou **Tocha / lareira**; uma fonte compartilhada para a mesa pode atender várias velas. Emissão não equivale a uma fonte de luz que ilumina objetos vizinhos.

## Avaliação do desgaste localizado

**Desgaste fixo no asset não exige uma ferramenta geral nova.** A receita pode conter contornos lascados, partes quebradas, manchas geométricas, materiais separados e variações de textura. Este kit já exemplifica pescoço fraturado, tecido rasgado, oxidação do ferro e uma região escurecida na base do pilar. Isso permanece editável por transformação e material, mas a posição desses detalhes pertence à geometria do asset.

**Atualização de 6 de outubro:** o desgaste reutilizável foi implementado como camada do material, em vez de assets de manchas. Oferece cinco estilos, intensidade, escala e distribuição na peça inteira/base/topo ou uma região ajustável. Preserva texturas e slots, acompanha o objeto e pode ser copiado/colado. Uso: [MATERIAL_WEAR.md](MATERIAL_WEAR.md). A região é um volume procedural local; `metalWear` continua sendo uma opção independente do desenho da textura de metal.

Para símbolos/imagens específicos e várias marcas independentes, **decals vinculados à superfície** continuam sendo uma extensão possível: persistir hospedeiro, transformação local, tamanho, variante e material; editar/apagar/duplicar/desfazer; conservar o vínculo ao mover o hospedeiro e tratar sua exclusão. Renderização deve resolver sobreposição, profundidade, normais, visibilidade e descarte. Não são requisito para o desgaste procedural disponível agora.

Pintura livre com pincel ainda exigiria máscaras por superfície/slot, edição e serialização próprias. Decals e essa pintura permanecem futuros. A camada procedural não cria danos geométricos nem estabelece paridade com o acabamento das referências.

A iluminação reutilizável agora oferece fontes vinculadas, zonas de ambiente, projeções de vitral e névoa iluminada. O estudo de **capela ritual** em Abrir combina o kit e esses controles, sem reproduzir o mapa completo. [Uso e limites](DYNAMIC_LIGHTING.md); [entregas e extensões do plano](DYNAMIC_LIGHTING_PLAN.md).

## Implementação e validação

`scripts/library-church-kit.js` e `scripts/library-church-scene.js` geram as receitas e `scripts/generate-library.js` integra catálogo/prévias. Para regenerar, execute `node scripts/generate-library.js`. Prévia compacta rasterizada a partir da geometria real de cada modelo, sem imagens externas. O novo perfil arquitetônico em `src/render/architectural-primitives.js` extruda contornos simples XY de até 64 pontos, com profundidade limitada, normais/UV e validação antes de alocar geometria. Receitas aceitam `profile` e materiais com opacidade opcional; ausência conserva os materiais opacos anteriores.

Partes são agrupadas por material/superfície; até cinco malhas por modelo, com orçamento verificado de menos de 18 mil triângulos por peça. Vidros translúcidos de duas faces acrescentam passes de renderização. Isso não representa instanciamento entre objetos nem um benchmark de FPS. Geometrias e materiais por instância são descartados pelo cache existente; a câmera de trabalho continua independente da publicada.

Testes verificam perfis, vãos, interiores, apoio da mesa, ausência de apoio fictício do balcão, materiais, catálogo, histórico e documentos. Roteiro de navegador verifica pixels/renderização dos 22 modelos, isolamento de materiais, descarte GPU e uso na biblioteca com salvar/reabrir/projetor em servidor e Pages. Resultados finais e capturas em [progress.md](../progress.md). Avaliação da igreja completa em [IGREJA_ANTIGA_ANALISE.md](IGREJA_ANTIGA_ANALISE.md).

Validação do kit inicial (6 de outubro): **185 testes de domínio/integração, três E2E novos e builds local/Pages aprovados**. Máximo observado por modelo na captura isolada: seis chamadas de desenho e 11.532 triângulos; retorno à baseline de recursos após descarte. A suíte E2E completa não foi repetida. Prévia real dos modelos em `test-results/church-kit-sheet.png`; capturas de biblioteca/edição em `test-results/church-kit-{server,pages}.png`.
