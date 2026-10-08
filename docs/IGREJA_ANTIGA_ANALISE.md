# Igreja Antiga: viabilidade no Tabletop

Análise em 6 de outubro de 2026. Referência solicitada: [Igreja Antiga — Ordem Paranormal Wiki](https://ordemparanormal.fandom.com/wiki/Igreja_Antiga). Objetivo: avaliar uma reconstrução editável para jogo, com interior, exterior e circulação vertical.

**Atualização de 7 de outubro:** a [cena completa da igreja e do vale](IGREJA_ANTIGA_CENA.md) foi montada com o kit, desgaste e iluminação dinâmica. Este documento conserva a análise de referência; as medidas e ligações não mostradas são adaptações de autoria.

**Revisão visual posterior em 7 de outubro:** a nova cena foi reconstruída pelas sete imagens anexadas, com cobertura de duas águas, novos vitrais, efígie, relicário e árvores. A leitura anterior de uma abóbada inteiramente ogival não foi mantida na nave. A descrição abaixo documenta a análise inicial; o estado atual está em [Igreja Antiga — cena](IGREJA_ANTIGA_CENA.md).

## Alcance da análise

O texto completo da página foi recuperado pela API pública da wiki, incluindo descrição, histórico e identificação da galeria. Foram identificados **18 arquivos de imagem**: a imagem principal, 16 vistas numeradas do modelo e uma arte conceitual externa. Os arquivos e seus endereços estão no [inventário de referências](references/igreja-antiga-gallery.json).

Na consulta inicial, os 18 arquivos originais retornaram HTTP 403 e não puderam ser inspecionados. Em seguida, o usuário anexou **seis imagens**, agora analisadas visualmente: sala de correntes/ganchos, nave em direção ao altar, nave em direção à entrada, detalhe do conjunto ritual e duas vistas externas. As observações abaixo combinam essas seis referências com a descrição escrita e a inspeção do projeto. O acesso pelo CDN continua bloqueado; não se afirma revisão visual das outras imagens da galeria. A correspondência individual dos anexos com os nomes dos arquivos não foi verificada.

Os anexos já permitem definir a composição principal e as lacunas técnicas. Não é necessário esperar todas as demais vistas para iniciar um protótipo; espaços e acessos não mostrados precisam ser registrados como decisões de autoria. Medidas, planta completa e desempenho não podem ser deduzidos dessas capturas.

## O que o cenário exige

A descrição estabelece um templo de alvenaria marcado pela verticalidade, com torre assimétrica, janelas ogivais, nave ampla e galerias acima do pavimento principal. A ocupação dos Vampiros acrescenta um banquete central, luz vermelha dos vitrais e um conjunto ritual ao fundo, com Dama de Ferro, figura angelical decapitada e símbolos de Sangue. O estado de abandono e os danos também participam da composição. [Fonte](https://ordemparanormal.fandom.com/wiki/Igreja_Antiga#Descri%C3%A7%C3%A3o).

O histórico serve para escolher o estado da cena. Uma igreja preparada para o encontro, uma versão danificada e a construção incendiada são estados diferentes; misturá-los na montagem inicial perderia coerência. A proposta de autoria é trabalhar primeiro na versão anterior ao incêndio, deixando variações destrutivas para depois. Isso é uma escolha de montagem, não uma planta oficial.

## Leitura das seis imagens fornecidas

| Referência anexa | Observação visual | Consequência para a montagem |
| --- | --- | --- |
| 1. Sala de correntes | Ambiente baixo e estreito, correntes pendentes com ganchos grandes, superfície de apoio junto à parede e mesa com velas; forte desgaste nas superfícies | Criar um ambiente secundário próprio; sua ligação com a nave não aparece na imagem. Correntes/ganchos e sujeira precisam funcionar em câmera próxima. |
| 2. Nave voltada ao altar | Eixo comprido, banquete central, bancos deslocados, arcadas no nível inferior, pilares altos, balcões curvos acima, janelas estreitas, pendões e cobertura nervurada | A arquitetura precisa de módulos verticais coerentes e balcões com piso/guarda-corpo; não basta sobrepor dois salões retangulares. |
| 3. Nave voltada à entrada | Vista elevada esclarece a profundidade, a cobertura e o conjunto de janelas na parede oposta ao altar; o centro permanece aberto entre os níveis | Confirmar o vazio sobre a nave e a leitura nas duas direções. As imagens não provam uma passarela contínua ligando todos os balcões. |
| 4. Conjunto ritual | Objeto metálico com espinhos/aros no primeiro plano, velas e grande figura alada ao fundo, iluminados de vermelho | Dama e figura alada são marcos da composição, exigindo silhuetas próprias. O desfoque limita a identificação dos pequenos detalhes. |
| 5. Exterior elevado | Igreja sobre massa rochosa alta, torres/pináculos, paredões separados por depressões profundas, vegetação seca e várias camadas de montanhas | Tratar igreja, platô e aproximação como uma composição única; construir o relevo com terreno e malhas de rocha independentes. |
| 6. Exterior próximo ao acesso | Árvores secas em primeiro plano, percurso junto ao relevo, igreja acima, brilho vermelho abaixo e horizonte violeta com lua | Dar escala e profundidade com percurso, árvores e planos separados. O brilho não comprova lava ou outra substância específica. |

A imagem 2 mostra arcos arredondados nas arcadas inferiores e vãos mais pontiagudos nos níveis altos: o kit deve preservar essa diferença. Os balcões têm contorno curvo e suportes visíveis; uma galeria reta contínua seria uma adaptação, não uma geometria confirmada. O vermelho domina o interior, enquanto magenta/violeta e névoa separam os planos externos. Esses contrastes são observáveis; as capturas não identificam o algoritmo de luz ou o custo do renderizador de referência.

## Escopo espacial e escala proposta

O conjunto tem **três faixas de detalhe**: interior/ambientes secundários para câmera próxima; platô, caminhos e paredões próximos para circulação e combate; montanhas distantes para horizonte. Todas podem usar geometria 3D, com densidade diferente conforme distância e uso. O alcance visual não precisa ser inteiramente caminhável ou receber o mesmo detalhe.

Para um primeiro estudo de composição, propor uma nave de aproximadamente **20 × 35 m**, dentro de uma área principal de cerca de **100 × 140 m**, mais massas distantes de horizonte. São medidas de autoria, não dimensões extraídas da obra. Ajustar após conferir a escala dos bancos, portas, bases dos tokens e tempo/distância dos percursos. A altura do platô, as escadas de acesso, a torre e os caminhos precisam ser definidos juntos, antes da decoração.

Um terreno de 140 m com 64 divisões tem células de aproximadamente 2,19 m. Serve ao relevo amplo, mas não resolve sozinho bordas de caminho, degraus, penhascos verticais ou saliências. Usar malhas independentes para paredões, pisos/escadas explícitos nos acessos e, se necessário, terrenos menores nas áreas próximas. O heightmap mantém uma altura por X/Z; aumentar sua área não cria cavernas nem penhascos com sobreposição.

## O que já funciona

| Necessidade | Recurso atual | Limite prático |
| --- | --- | --- |
| Nave, altar elevado, dependências e pátio | Pisos retangulares/poligonais, paredes e portas com aberturas reais | A arquitetura estrutural usa paredes retas. |
| Galerias e circulação em dois pavimentos | Andares, pisos com furos, escadas/rampas e apoio de tokens | Os apoios e vínculos precisam ser atribuídos; não há navegação automática de combate. |
| Torre e desníveis externos | Andares, estruturas independentes, terreno, rochas e ruínas | Volume exterior detalhado exige composição ou modelos adicionais. |
| Mesa, assentos, velas, sinos e correntes | Assets existentes e colocação repetida | Os modelos disponíveis são genéricos e não reproduzem todo o mobiliário descrito. |
| Ambiente vermelho e luz de velas | Luzes locais/spot, cor/Kelvin, emissão, flicker, névoa e bloom | Cor de luz configurada não equivale à projeção óptica de um vitral. |
| Preparação de combate | Tokens, grid editável e régua em metros/altura | Alcance, diagonais, obstáculos e movimento continuam dependendo de regras próprias. |
| Apresentação e reutilização | Enquadramentos, projetor independente, salvar como cena/mapa e exemplos distribuídos | Navegar no editor deve continuar sem publicar a câmera automaticamente. |
| Modelos mais complexos | Importação de GLB estático com materiais/texturas incorporados | É necessário produzir ou obter esses modelos; importar não os transforma em estruturas paramétricas. |

Base técnica: [autoria estrutural](STRUCTURAL_EVOLUTION.md), [biblioteca](ASSET_LIBRARY.md), [materiais](MATERIALS.md), [régua](RULER.md) e [exemplos](EXAMPLE_SCENES.md).

## Estado dos recursos e lacunas

### 1. Conteúdo específico da igreja

**Kit inicial implementado em 6 de outubro:** 18 peças originais locais, disponíveis em Assets, com catálogo total de 220 modelos. Inclui Dama de Ferro aberta, Serafim decapitado, cadeira pontiaguda, pendão, correntes/ganchos, mesa/candelabro, pilar, arcos semicircular/ogival, balcão curvo/balaustrada, vitral, nervuras/cobertura, contraforte, pináculo e torre. Uso e limites em [CHURCH_KIT.md](CHURCH_KIT.md).

A lacuna de conteúdo básico foi atendida por modelos reutilizáveis com silhuetas próprias. O mapa foi entregue no incremento de 7 de outubro; isso não estabelece acabamento fiel ou aceitação visual. São interpretações originais das referências; nenhum modelo ou textura oficial foi extraído. A montagem precisa conferir proporções, ornamentação e circulação no conjunto.

### 2. Janelas e vitrais

`createWindow` em [scene-objects.js](../src/render/scene-objects.js) constrói uma moldura retangular e um vidro de transparência uniforme. O vidro não projeta sombra colorida: sua malha tem `castShadow = false`. A cor do material, isoladamente, não tinge o ambiente.

O novo kit oferece arcos e vitral ogivais avulsos, com vidro translúcido emissivo, e permite adicionar luzes vermelhas separadas. Esses props não mudam o contorno dos vãos estruturais. Para uma solução estrutural reutilizável, falta suportar o contorno ogival tanto na janela quanto no recorte da parede. Para projetar o desenho do vitral, seria necessário um recurso de projeção/máscara de luz ou outro tratamento deliberado; aumentar o bloom não resolve isso.

### 3. Cobertura e leitura do interior

`updateCutaway` em [renderer.js](../src/render/renderer.js) trata paredes. Não existe uma categoria de cobertura com ocultação automática para navegação interna ou mapa superior. Um telhado em GLB/prop continua opaco até ser ocultado explicitamente.

Uma primeira montagem pode colocar a cobertura em uma pasta/camada própria e alternar sua visibilidade manualmente. Isso permite jogar hoje. Um recurso de cobertura com recorte apropriado daria consistência às vistas externas, internas e superiores, especialmente no projetor. Não basta excluir o teto e chamar a construção de reprodução completa.

### 4. Acabamento e decoração localizada

**Atualização de 6 de outubro:** o [desgaste por material](MATERIAL_WEAR.md) permite sujeira, ferrugem, musgo, fuligem e rachaduras aparentes em assets existentes, com região local ajustável, sem adicionar modelos de manchas. A camada preserva texturas e respeita slots, com histórico e persistência. O kit conserva tecido rasgado e pescoço fraturado como geometria. Pintura livre, inscrições específicas, múltiplas marcas independentes e danos que alteram a silhueta permanecem extensões; a região procedural não resolve todos esses casos.

As seis imagens confirmam desgaste forte e localizado em paredes, pilares, cobertura e mobiliário. Um único padrão repetido de pedra não representa essas variações. Ainda não há base para afirmar paridade de materiais, renderização ou desempenho com o tabletop da série.

O [plano de iluminação dinâmica](DYNAMIC_LIGHTING_PLAN.md) propõe fontes reutilizáveis vinculadas a assets, zonas simultâneas para nave/vale, orçamento de sombras, projeções de vitrais e névoa iluminada. A implementação inicial da engine está disponível: perfis, zonas em caixa, orçamento, projeções de vitral, reflexos/AO e névoa iluminada. Um estudo de capela editável está na galeria; o mapa completo foi entregue em 7 de outubro; conexões automáticas de aberturas continuam posteriores. Veja [uso e limites](DYNAMIC_LIGHTING.md) e o quadro de estado do plano.

### 5. Exterior amplo e custo de edição

O catálogo já oferece paredões orgânicos, árvores mortas, árvores de montanha sem folhas, raízes e galhos bifurcados. Isso permite começar as massas e a vegetação do exterior. O acabamento dos modelos próximos, a distribuição e a integração com os caminhos precisam de revisão específica; não é preciso criar toda a paisagem a partir do zero.

O projeto ainda não tem LOD/instanciamento/streaming espacial para esse conjunto. A implementação de iluminação passou a reconciliar objetos e fontes incrementalmente em [renderer.js](../src/render/renderer.js). Ajustes de intensidade na igreja completa foram conferidos sem recriar objetos; mudanças geométricas ainda exigem reconstrução dos objetos afetados. Um mapa denso pode prejudicar tanto a navegação quanto o tempo de edição; isso deve ser medido em um recorte antes de multiplicar objetos.

A névoa ajuda a composição, mas não substitui LOD ou descarte de geometria. Uma vela visível pode usar emissão e compartilhar iluminação com um conjunto; não precisa ganhar uma luz dinâmica com sombra individual. Decidir quantidade de luzes/sombras, malhas por módulo e texturas a partir de medições com editor e projetor. O limite anterior da montanha não constitui orçamento garantido para a igreja.

## Decisão de viabilidade

**É possível montar uma versão jogável e aproximada com a base atual. As seis imagens já permitem planejar a composição, mas a reprodução fiel ainda requer conteúdo e acabamento próprios.** O exterior amplia o trabalho de autoria e a necessidade de medir custo; não impõe, por si só, uma troca de motor. O kit arquitetônico e as peças características iniciais foram implementados; o estudo de capela precedeu a montagem completa, agora disponível na galeria.

A análise original não adicionou uma cena. Após o kit, desgaste e iluminação, a montagem completa foi autorizada e entregue em 7 de outubro, com quatro complementos de arquitetura/decoração. As demais vistas podem refinar proporções e acabamento sem bloquear o uso do mapa disponível.

## Sequência concreta para construir (plano original)

1. Usar as seis imagens já analisadas para desenhar a planta de autoria e o percurso externo, registrar medidas propostas e partes não mostradas. Incorporar outras referências quando disponíveis, sem atribuir medidas oficiais ao estudo.
2. Com o kit inicial entregue, compor um trecho de nave com pilar, arcada, balcão curvo/guarda-corpo, janela e nervura da cobertura; compor um trecho de platô/acesso com paredão e árvore seca. Validar silhueta, acabamento próximo e custo. Em seguida, posicionar Dama/Serafim, pendões, assentos e ganchos já disponíveis; refinar a ornamentação conforme a composição. Preservar materiais separados e escala métrica.
3. Montar nave, acessos e galerias como pisos/escadas reais; manter vãos livres e altura dos apoios correta. Separar arquitetura, cobertura, mobiliário, ritual, exterior e iluminação em grupos/camadas.
4. Escolher explicitamente entre cobertura manual para o primeiro mapa ou recurso de ocultação apropriado; entre vitrais cenográficos iluminados e janelas estruturais ogivais.
5. Compor e conferir câmeras de entrada, nave/banquete, altar, galeria, exterior e mapa superior. Acrescentar detalhes depois de validar circulação e silhueta.
6. Disponibilizar como exemplo que cria cópia independente, com capa capturada do renderizador real. Validar edição, tokens nos pavimentos e acessos externos, régua, salvamento/reabertura e projetor em servidor/Pages. Medir geometria, custo de edição e comportamento nas câmeras interna/externa antes de prometer desempenho no equipamento da mesa.

## Validação desta etapa

Inspeção de documentos, catálogo e código; leitura completa da página pela API; inventário das referências; bloqueio do CDN confirmado por HTTP e Chromium; revisão visual dos seis anexos fornecidos posteriormente. A análise inicial foi documental. O incremento posterior implementou o kit de 18 assets e perfis/opacidade de receitas; a validação está registrada em [CHURCH_KIT.md](CHURCH_KIT.md) e [progress.md](../progress.md). O estudo de capela valida a iluminação reutilizável e um recorte do kit. A inspeção das outras vistas da galeria permanece pendente. A construção completa, incluindo vale/galerias/cobertura, está registrada em [IGREJA_ANTIGA_CENA.md](IGREJA_ANTIGA_CENA.md), com revisão das dez câmeras e testes próprios.
