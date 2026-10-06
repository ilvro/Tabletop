# Catálogo de assets e classificação

Implementado em 3 de outubro de 2026. A aba **Assets** oferece **202 modelos 3D locais**, incluindo os seis objetos do kit inicial e **196 novos assets originais**, com prévias, escala em metros e pivot na base. O foco é investigação e horror paranormal para mesas de Ordem Paranormal. Os modelos e símbolos são originais do Tabletop. A segunda ampliação acrescentou 66 objetos, incluindo veículos e novos kits de interiores, comércio, laboratório, indústria e ruínas. A terceira ampliação (4 de outubro) acrescentou 34 objetos: casarão/sótão, asilo e necrotério, cemitério, rua, rural e equipamentos de investigação.

As duas peças mais recentes são **Rocha orgânica · afloramento irregular** e **Paredão orgânico · fraturas e erosão**, com formas editáveis próprias e padrão mineral de rocha. Escultura e neve orgânica: [ORGANIC_WINTER.md](ORGANIC_WINTER.md).

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
5. Clique no card e depois no apoio da cena. A colocação usa snap, andares/camadas e histórico existentes. Imagens importadas continuam sendo retratos de tokens.

São exibidos 24 cards por vez; **Mostrar mais assets** acrescenta outros 24. Prévias carregam sob demanda e modelos 3D carregam quando usados na cena.

## Classificar e favoritar

Clique em **Tags** para editar categoria, época, cenários e tags de qualquer asset, interno ou importado. Use **/** nas categorias e vírgulas entre tags/cenários. Há sugestões de categorias e épocas já existentes. Tags livres permitem coleções como `campanha do grupo`, `mansão`, `abandonado` ou `pista principal`, além dos temas `sangue`, `morte`, `conhecimento`, `energia` e `medo` usados no kit.

Cada campo de tags/cenários aceita até 32 valores com 60 caracteres; categoria e época aceitam até 80 caracteres. Tags equivalentes por acentos/maiúsculas são deduplicadas. Remover todas as tags é permitido. A estrela do card alterna o favorito; também é possível salvá-lo no formulário.

O servidor guarda as classificações em **`data/asset-metadata/<id>.json`**, com gravação atômica, revisão de metadados e serialização por asset. Se outra aba alterar a classificação, a gravação retorna conflito; feche e reabra o editor para carregar a versão atual antes de salvar. A revisão de metadados é independente da revisão da geometria referenciada pelas cenas.

Backup deve incluir `data/` inteiro, com `assets/` e `asset-metadata/`. Tags e favoritos sobrevivem ao reinício do navegador e do servidor e não acrescentam campos ao schema das cenas.

A projeção dos jogadores recebe os dados necessários à renderização dos assets usados, sem classificação, favoritos ou descrições da biblioteca que possam revelar pistas do mestre.

## Modelos e limites

Os modelos são receitas estáticas de primitivas e malhas geológicas procedurais, com materiais próprios e prévias SVG geradas da mesma geometria. Execute `node scripts/generate-library.js` na raiz para regenerar os 159 modelos adicionais, suas prévias e o catálogo. Os IDs do kit inicial permanecem iguais; footprints antigos foram corrigidos para abranger a geometria.

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
