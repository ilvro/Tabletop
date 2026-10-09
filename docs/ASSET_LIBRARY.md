# Catálogo de assets e classificação

Implementado em 3 de outubro de 2026. A aba **Assets** oferece **224 modelos 3D locais**, incluindo os seis objetos do kit inicial e **218 novos assets originais**, com prévias, escala em metros e pivot na base. O foco é investigação e horror paranormal para mesas de Ordem Paranormal. Os modelos e símbolos são originais do Tabletop. A segunda ampliação acrescentou 66 objetos, incluindo veículos e novos kits de interiores, comércio, laboratório, indústria e ruínas. A terceira ampliação (4 de outubro) acrescentou 34 objetos: casarão/sótão, asilo e necrotério, cemitério, rua, rural e equipamentos de investigação.

O kit da Igreja Antiga acrescenta **18 peças arquitetônicas e rituais**: arcos vazados, pilar, balcão curvo, balaustrada, vitral, cobertura/nervuras, contraforte, pináculo, torre e peças características do banquete/ritual. Procure **igreja antiga**; uso, apoios e avaliação do desgaste localizado em [CHURCH_KIT.md](CHURCH_KIT.md).

O kit orgânico inclui **Rocha orgânica · afloramento irregular** e **Paredão orgânico · fraturas e erosão**, com formas editáveis próprias e padrão mineral de rocha. Escultura e neve orgânica: [ORGANIC_WINTER.md](ORGANIC_WINTER.md).

No GitHub Pages, o mesmo catálogo é servido pelo build estático; imports, classificação e favoritos ficam no navegador, com persistência após reabrir. No modo Node ficam no servidor local. Publicação e limites de transporte: [GITHUB_PAGES.md](GITHUB_PAGES.md).

## Acervo

| Família | Exemplos e usos |
| --- | --- |
| Mobiliário | Mesa rústica, banco, estante, cama de ferro, beliche, sofá, guarda-roupa, cozinha/banheiro, poltrona, cômoda, espelho, relógio de pêndulo, radiador, ventilador e piano. |
| Tecnologia | Televisão de tubo, telefone, rádio, computador, vigilância, servidores, máquina de escrever, gravador de rolo, VHS, central de monitores, osciloscópio, notebook, projetor de slides e antena. |
| Industrial | Gerador, tambor, bancada, armários, palete, paleteira, carrinho de ferramentas, válvula, quadro elétrico, reservatório, bomba de combustível e cavalete de extração. |
| Saúde | Maca, cadeira de rodas, microscópio, carrinho e soro, centrífuga, frascos, tubos de ensaio, oxigênio, mesa de autópsia, gavetas de necrotério e luminária cirúrgica. |
| Religioso | Banco de igreja, confessionário, púlpito, sino, lápide, caixão e mausoléu. |
| Paranormal | Altar, velas, círculo original, obelisco, correntes, cristais e livro, cápsula de contenção, máscara, relicário, sarcófago, crânio, efígie e arco anômalo. |
| Exterior | Árvores, rochas, poço, palha, carroça, barraca, fogueira, árvore seca, toco, arbustos, grade de cemitério, coluna quebrada e mureta desmoronada. |
| Urbano | Poste, caçamba, barreira de concreto, cone e grade de drenagem. |
| Investigação | Quadro de pistas, maleta de perícia, documentos, mala antiga, cofre e estojo tático. |
| Comercial | Balcão de recepção, caixa registradora, vitrine, máquina de bebidas, gôndola, banco de lanchonete, banqueta, sinuca e carteira escolar. |
| Veículos | Carro de passeio, furgão de carga, ambulância, viatura de investigação, motocicleta, bicicleta e barco a remo. |
| Terceira ampliação | Cadeira de balanço, lareira, cabideiro, fichário de biblioteca, berço, cavalo de balanço, gramofone, globo, lustre, lampião, tabuleiro espiritual, jaula, cadeira de contenção, biombo, saco mortuário, poça de sangue, cova com cruz, cova aberta, anjo de cemitério, candelabro ritual, cerca de madeira, bomba d’água, lenha, carrinho de mão, orelhão, ponto de ônibus, hidrante, lixeira, carrinho de supermercado, fliperama, quadro-negro, grade de cela e filmadora em tripé. |

As épocas incluem **Antiguidade**, **Colonial / século XIX**, **Início do século XX**, **Décadas de 1970–1990**, **Contemporânea** e **Atemporal**. São classificações de uso cenográfico. Os cenários incluem hospital, laboratório, delegacia, bunker, fazenda, floresta, igreja, ruínas e outros.

Assets abre uma janela flutuante arrastável, com fade de 100 ms ao abrir e 80 ms ao fechar por botão, Esc ou escolha de asset. A posição e os filtros são conservados; movimento reduzido desliga os fades. Controles de janela e acessibilidade em [EDITOR_UI.md](EDITOR_UI.md).

## Encontrar e colocar

1. Abra **Assets** e busque por nome, descrição, material, uso ou tema. A busca ignora acentos e maiúsculas e combina todas as palavras digitadas.
2. Combine **Categoria**, **Época** e **Cenário**. Uma categoria como **Saúde** inclui **Saúde / Instrumentos** e suas demais subcategorias.
3. Selecione uma ou mais tags no campo **Adicionar filtro de tag**, ou clique nas tags dos cards. Todas as tags selecionadas precisam existir no asset. Clique no **×** para remover um filtro.
4. Use **Somente favoritos** para reunir objetos recorrentes. **Limpar filtros** restaura o acervo inteiro. Os filtros permanecem ao alternar as abas durante a sessão.
5. Clique no card e depois no apoio da cena. **Colocação repetida** começa marcada: cada clique acrescenta outra cópia do mesmo asset. **Esc**, **Q** ou **Concluir** encerra. A colocação usa snap, andares/camadas e histórico existentes. Imagens importadas continuam sendo retratos de tokens, com um token/ator independente por clique.

São exibidos 24 cards por vez; **Mostrar mais assets** acrescenta outros 24. Prévias carregam sob demanda e modelos 3D carregam quando usados na cena.

## Colocação repetida

A opção **Colocação repetida** aparece na biblioteca e na barra sobre a cena, junto do nome do asset ativo. Com ela marcada, a última cópia fica selecionada e o asset continua pronto para o próximo clique. Para trocar o objeto em uso, abra Assets e escolha outro card; a busca e os filtros são conservados. Escolher o asset ou alternar a opção não altera o documento.

Desmarque a opção para colocar uma única cópia e passar automaticamente para Mover. É possível desmarcar durante a colocação: o próximo clique insere uma cópia e encerra. A preferência vale durante a sessão do editor; ao recarregar, a repetição começa marcada e nenhum asset está ativo. Importar um asset e escolher um retrato de asset em Abrir usam a mesma preferência. Tokens criados por nome e ferramentas de luz/escada/rampa continuam com sua colocação individual.

Cada clique confirmado é uma entrada própria no histórico: **Ctrl+Z** remove a última cópia, **Ctrl+Shift+Z** a restaura. Você pode continuar colocando após desfazer/refazer. **Alt** permite posicionar sem snap. O apoio escolhido e as opções atuais de andar/camada continuam valendo a cada inserção; cliques fora desse apoio ou em uma camada bloqueada não criam cópias e mantêm o asset ativo. Cada instância começa com os parâmetros padrão do asset, sem copiar edições feitas na instância anterior.

Em telas estreitas, escolher um asset para repetir recolhe os painéis para liberar o cenário, e inserir cópias não reabre automaticamente Propriedades. Use **Concluir**, então abra **Propriedades** para editar o último objeto, ou escolha Mover/G, Girar/R ou Escala/V. A câmera publicada permanece independente da colocação e da navegação de trabalho.

## Classificar e favoritar

Clique em **Tags** para editar categoria, época, cenários e tags de qualquer asset, interno ou importado. Use **/** nas categorias e vírgulas entre tags/cenários. Há sugestões de categorias e épocas já existentes. Tags livres permitem coleções como `campanha do grupo`, `mansão`, `abandonado` ou `pista principal`, além dos temas `sangue`, `morte`, `conhecimento`, `energia` e `medo` usados no kit.

Cada campo de tags/cenários aceita até 32 valores com 60 caracteres; categoria e época aceitam até 80 caracteres. Tags equivalentes por acentos/maiúsculas são deduplicadas. Remover todas as tags é permitido. A estrela do card alterna o favorito; também é possível salvá-lo no formulário.

O servidor guarda as classificações em **`data/asset-metadata/<id>.json`**, com gravação atômica, revisão de metadados e serialização por asset. Se outra aba alterar a classificação, a gravação retorna conflito; feche e reabra o editor para carregar a versão atual antes de salvar. A revisão de metadados é independente da revisão da geometria referenciada pelas cenas.

Backup deve incluir `data/` inteiro, com `assets/` e `asset-metadata/`. Tags e favoritos sobrevivem ao reinício do navegador e do servidor e não acrescentam campos ao schema das cenas.

A projeção dos jogadores recebe os dados necessários à renderização dos assets usados, sem classificação, favoritos ou descrições da biblioteca que possam revelar pistas do mestre.

## Modelos e limites

Os modelos são receitas estáticas de primitivas e malhas geológicas procedurais, com materiais próprios e prévias SVG geradas da mesma geometria. Execute `node scripts/generate-library.js` na raiz para regenerar os 244 modelos, suas prévias e o catálogo (ver [Reconstrução da biblioteca](#reconstrução-da-biblioteca)). Os IDs do kit inicial permanecem iguais; footprints antigos foram corrigidos para abranger a geometria.

Mesas, bancos, cama, pia, bancada, maca, carrinhos, altar e outros móveis têm altura de apoio anotada. A segunda ampliação inclui apoios na mesa de centro, criado-mudo, cômoda, balcão, vitrine, carteira escolar, mesa de autópsia, palete e toco. Veículos, dispositivos, móveis fechados e túmulos são estáticos e cenográficos; portas e mecanismos não possuem interação automática. Props de parede/teto usam a fixação manual do inspetor. A terceira ampliação anota apoio no fichário de biblioteca. Velas, cristais, fogueira, poste, lareira, lustre, candelabro, lampião, fliperama e luz da filmadora têm emissive estático na receita. Novas fogueiras colocadas pelo editor recebem chamas animadas e luz própria; outros objetos podem receber fogo/fumaça pelo inspetor. Instâncias antigas conservam sua aparência até edição explícita. Texturas locais também podem substituir um material nomeado do objeto: [MATERIALS.md](MATERIALS.md).

Esta entrega inclui catálogo, categorias hierárquicas, busca, tags editáveis, épocas/cenários e favoritos. Continuam pendentes coleções formais além de tags/favoritos, variantes de textura por asset, sockets específicos com fixação automática, receitas/prefabs adicionais e importação glTF com dependências externas. Imagens e GLB estático autocontido continuam importáveis.

## Verificação

`npm test` valida modelos/prévias, bounds/footprints/apoios, filtros, metadados, persistência, concorrência e conservação das referências de cenas. `tests/e2e/asset-library.test.js` percorre filtros, edição de tags, favoritos, paginação completa, filtros de veículos, colocação de moto e maca, importação e reinício do navegador/servidor; captura em `test-results/asset-library.png`. O teste do editor existente cobre o kit original, apresentação e save/reload. Chromium com WebGL por software não é um benchmark no projetor.

## Kit de montanha: geometria editável

Entregue em 5 de outubro de 2026: **Rocha fraturada**, **Matacão de granito**, **Paredão estratificado** e **Entulho rochoso**. Procure esses nomes em Assets, ou filtre por **Exterior / Montanha** e cenário **Montanha**. São quatro modelos originais adicionais; os 161 anteriores conservam seus arquivos, registros, IDs e aparência.

As novas peças usam malhas fechadas de rocha, com faces quebradas, ondulações e estratos de geometria. Não são combinações de cilindros. Prévias SVG são produzidas das mesmas malhas utilizadas no editor. Ao colocar pela biblioteca, recebem o material **Rocha natural** e o padrão correspondente. Cobertura de neve continua opcional em Material e textura.

Selecione uma peça para abrir **Geometria da rocha**:

- **Formação do volume:** fraturada, arredondada/granito, estratificada, paredão ou pináculo.
- **Irregularidade do volume:** controla ondulações e deformação, de 0 a 1.
- **Detalhe da malha:** 2–8; valores maiores acrescentam triângulos. Não modifica o detalhe da textura.
- **Variação da forma · seed:** 0–65535; a mesma configuração reproduz a mesma malha.
- **Restaurar forma do modelo:** restaura apenas os parâmetros da geometria. Material, neve, posição e escala permanecem.

Cada instância guarda seus parâmetros: duplicação, histórico, mapas, JSON, servidor/Pages e apresentação conservam a forma. Alterar a geometria preserva as dimensões anotadas e o pivot na base; use escala X/Y/Z para mudar largura, altura e profundidade. Formação do volume e padrão da textura são controles independentes.

O paredão pode ser combinado com outras peças, girado e redimensionado para formar bordas de trilhas e desfiladeiros. A malha tem saliências reais que o terreno por alturas não representa, mas não é uma ferramenta de escultura livre nem gera cavernas/topologia arbitrária. As peças são cenográficas: não oferecem apoio automático para tokens nem colisão da câmera. Para áreas transitáveis, use terreno, pisos/plataformas e acessos existentes. Neve com espessura e avaliação de exposição está disponível; uso e limites em [LANDSCAPE.md](LANDSCAPE.md).

`rockShape` é um campo opcional de props restrito aos oito IDs geológicos do kit, com `form`, `irregularity`, `detail` e `seed`. A validação rejeita parâmetros inválidos antes de confirmar a edição. As formas anteriores usam até 1620 triângulos por componente; paredões/pináculos usam menos de 4000, inclusive no detalhe máximo; entulho e paredões têm vários componentes. Geometria/material são próprios de cada instância e descartados ao reconstruir/remover; o catálogo em cache conserva a receita, sem geometria compartilhada editável. Custo depende da quantidade e do detalhe; LOD/instanciamento e benchmark presencial continuam futuros.

Pipeline: `scripts/library-mountain.js`, `src/render/rock-geometry.js` e o gerador geral da biblioteca. Os testes conferem fechamento de bordas, números finitos, raycast, bounds/pivot sob variações, determinismo, pixels WebGL, descarte, controles e persistência. Resultados em [progress.md](../progress.md).

## Arquitetura e vegetação alpinas

Onze peças com materiais internos de rocha/madeira/casca/folhagem, arco com vão real, plantas ramificadas e variação geométrica. Distribuição com prévia, água/gelo e neve com volume: [LANDSCAPE.md](LANDSCAPE.md). Os 165 modelos anteriores conservam seus IDs, receitas e aparência.

## Paredões e kit de montanha ampliado

Doze peças acrescentadas em 5 de outubro: quatro formações de paredão/pináculo com geometria própria e oito complementos de ruína/madeira/cordas/lanterna/raízes/destroços. Saliências, camadas e erosão são parâmetros opcionais por instância; materiais e neve permanecem independentes. As peças novas agrupam malhas por material/acabamento para reduzir draw calls. A plataforma oferece apoio anotado no tabuleiro; as demais peças são cenográficas. Lista, controles, composição e limites: [MOUNTAIN_KIT.md](MOUNTAIN_KIT.md).

## Escultura com pincel

As oito peças geológicas também recebem edição manual diretamente na superfície: topo, laterais e saliências. Propriedades → Pincel de superfície/T; o gesto conserva os parâmetros e é salvo na instância. [ROCK_SCULPT.md](ROCK_SCULPT.md) documenta ferramentas, história, custo e limites.

## Asset do piloto de montanha

A cena de exemplo acrescenta **Ruína alta de montanha · torre partida**, em Arquitetura / Ruínas: 22 fiadas, janela vertical vazada, laterais/fundo aberto e geometria agrupada. Evita esticar a torre pequena para simular uma construção alta. Catálogo atual: 191 assets, incluindo também a lanterna arredondada com corrente conectada e a entrada de caverna com vão real. A composição pode ser aberta em Abrir; guia em [EXAMPLE_SCENES.md](EXAMPLE_SCENES.md).

## Vegetação e objetos próximos de inverno

Nove assets acrescentam abeto/pinheiro densos, galho bifurcado, raízes torcidas, arbusto seco, barril de madeira, caixas aberta/fechada e destroços sólidos. Galhos curvos e agulhas em volume; neve por envelopes de ramos, slots independentes e prévias compactas. Os 193 arquivos anteriores permanecem iguais. Uso, custo e limites: [WINTER_DETAIL.md](WINTER_DETAIL.md).

## Complementos da Igreja Antiga

Em 7 de outubro, o kit passou a 22 peças com empena ogival, alvenaria vazada para vitral, cruz dupla e prato/cálice. Busca **igreja antiga**. A [cena completa do templo e vale](IGREJA_ANTIGA_CENA.md) está em Abrir → Cenas de exemplo; carregar cria uma cópia editável independente.

## Reconstrução da biblioteca

Em 8 de outubro de 2026 os 244 modelos foram regenerados (`geometryEdition: 2`). IDs, footprints, envelopes métricos, alturas de apoio e slots públicos de material são os mesmos: cenas e personalizações salvas continuam válidas e passam a exibir a nova geometria.

- **Modelos dedicados (171):** todos os 161 props originais e dez complementos (fogão, lavadora, balcão, vaso, plafon, cortinas, louça, fluorescente das Backrooms, anjo e lampião). Cada um é escrito como montagem — tábuas, saias, pernas torneadas, almofadas, portas almofadadas, puxadores, dobradiças, rodízios, vidro, tubos curvos, correntes — em `scripts/library-atelier-*.js` e `scripts/library-craft-*.js`.
- **Kits refinados (73):** montanha, igreja, casa e Backrooms conservam suas fontes e recebem chanfros, perfis torneados e subdivisão em `scripts/library-construction.js`.

Fontes e contrato ficam em `scripts/library-source/` (`contracts.json`, receitas do kit inicial e `slots.json`); o gerador nunca lê os modelos publicados, portanto regenerar não acumula refinamentos. `public/assets/construction-audit.json` lista família, métodos, peças, lotes e triângulos por modelo.

Para acrescentar ou refazer um modelo dedicado, escreva um `case` no ateliê correspondente retornando `done('descrição', ...acabamentos)`. As peças são posicionadas em metros dentro do envelope `[w,h,d]`, com base em `y=0` e frente em `+Z`; o gerador ajusta o resultado ao envelope exato, então a peça deve ocupá-lo (em móveis com apoio, o ponto mais alto deve coincidir com a altura do envelope). Use os slots de material já existentes no modelo; acabamentos extras vêm de `FINISH` no kit.

Primitivas de receita: `box` (com `bevel`, `round`, `cushion`, `taper`), `lathe` (com `arc`, `start`, `faceted`), `ellipsoid`, `cylinder`, `sphere`, `ring`, `rope`, `profile`, `arch`, `rock`, `branch`, `conifer`, `foliage`, `timber` e `stave`.

Revisão visual: `node scripts/review-library.js` grava pranchas de todos os modelos em `test-results/library-review/`; passe IDs sem o prefixo para revisar alguns (`node scripts/review-library.js stove piano`). A iluminação é neutra e sem mapa de ambiente, como no padrão do aplicativo.

Limites: a geometria é procedural, sem escultura orgânica nem texturas pintadas à mão; metais usam metalicidade moderada para permanecer legíveis sem reflexos. Instanciamento e níveis de detalhe não foram implementados.
