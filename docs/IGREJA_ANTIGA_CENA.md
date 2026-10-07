# Igreja Antiga — templo e vale dos vampiros

Montagem de 7 de outubro de 2026, disponível em **Abrir → Cenas → Cenas de exemplo → Igreja Antiga · templo e vale dos vampiros**. Carregar cria uma cópia independente e ainda não salva; use **Salvar** para guardá-la no servidor local ou neste navegador no Pages. As cenas pessoais existentes permanecem iguais.

A capa deste cenário é gerada automaticamente pelo Tabletop a partir da cena, sem imagem pré-pronta. [Funcionamento das prévias](EXAMPLE_SCENES.md#imagem-automática-de-cada-cena).

## Composição

O cenário reúne nave, banquete, presbitério, Dama de Ferro, Serafim decapitado, pendões, vitrais, arcadas inferiores, seis balcões semicirculares, galerias laterais e sobre a entrada, duas escadas, sala de correntes e sacristia. O exterior tem fachada de três portais, torre assimétrica, contrafortes, pináculos e cobertura fechada; platô elevado, caminho ascendente, paredões, monólitos separados por desfiladeiros, árvores secas e cordilheiras distantes completam o vale violeta.

São **379 elementos, 12 pastas, quatro andares e dez enquadramentos**. A nave mede **19 × 35 m**, com piso a **18,8 m** no mundo; galerias a **5,8 m** acima desse piso. O relevo principal ocupa **128 × 144 m** e o horizonte cenográfico amplia o conjunto para aproximadamente 250 m. Essas são medidas propostas para esta montagem, não medidas oficiais deduzidas das referências. A célula está configurada em 1,5 m, com grid e snap inicialmente desligados; a régua pode medir distâncias físicas, sem aplicar regras de combate automaticamente.

A versão representa a ocupação ritual antes do incêndio. Baseia-se nas seis imagens anexadas e na descrição recuperada na [análise anterior](IGREJA_ANTIGA_ANALISE.md). A posição da sala de correntes, sacristia, ligações e escadas é uma adaptação de autoria: as referências não mostram uma planta completa. Modelos, símbolos e texturas são originais/procedurais; o acabamento não reproduz fielmente os modelos da série. As outras imagens bloqueadas da galeria não foram inspecionadas.

## Navegar e jogar

Em **Cena → Enquadramentos**, escolha:

| Câmera | Conteúdo |
| --- | --- |
| 01 · Igreja sobre o desfiladeiro | Vista inicial do templo, platô e vale. |
| 02 · Caminho de aproximação | Entrada vista da subida, com lua e névoa. |
| 03 · Fachada e torre | Três portais, vitrais e torre assimétrica. |
| 04 · Nave em direção ao altar | Banquete, arcadas e conjunto ritual. |
| 05 · Galeria em direção à entrada | Balcões, cobertura nervurada e fachada interna. |
| 06 · Dama de Ferro e Serafim | Detalhe do presbitério. |
| 07 · Sala de correntes | Ganchos, mesa e ambiente baixo. |
| 08 · Sacristia | Caixão, estante e área de apoio. |
| 09 · Planta da igreja | Vista ortográfica para jogar, com cobertura oculta. |
| 10 · Vale e percurso superior | Organização do exterior e caminho. |

As câmeras não alteram a visibilidade das coberturas. Para jogar em planta, oculte a pasta **11 · Coberturas (ocultar para planta)** pelo botão de olho em **Cena → Elementos da cena**. Também é possível ocultar a camada **Coberturas · ocultar para vista superior** na organização da construção. Isso remove cascas do telhado, nervuras, tetos dos anexos e coroamento do campanário; pisos, galerias e paredes permanecem editáveis. Religue para apreciar o exterior e a abóbada. O controle é manual, com undo/redo.

O botão **Ver interior** controla o recorte das paredes. Desative-o para conferir a fachada fechada; o recorte não remove os props do telhado. Para ver todo o mapa sem a atmosfera, desligue temporariamente **Névoa e efeitos nesta janela**. Essa preferência e a qualidade de iluminação pertencem à janela; a visibilidade de pastas/camadas pertence ao documento e acompanha a apresentação.

Uma passagem de um metro ao lado do presbitério dá acesso à sacristia sem atravessar o altar elevado. Os pisos da nave, presbitério, galerias, patamares, anexos e adro são apoios reais. Os balcões têm pisos poligonais que acompanham suas lajes curvas, sem apoio fora do contorno. As duas escadas têm lances de 2,9 m e patamares de retorno, com ligações entre andares. O campanário acima das escadas é cenográfico e não oferece um segundo interior acessível. Não há tokens pré-colocados, bloqueio automático de movimento, linha de visão ou alcance de combate.

A navegação do mestre conserva a câmera publicada. Escolher um enquadramento salvo também o publica; seu botão de corte publica sem transição. Use **Publicar câmera atual** para enviar uma posição obtida por navegação livre.

## Editar o cenário

Todas as peças usam os controles comuns de seleção, transformação, materiais, desgaste, duplicação, histórico e salvamento. As pastas separam terreno, paredões, vegetação, estrutura, arcadas/vitrais, galerias, torres/escadas, ritual/banquete, sala de correntes, sacristia, cobertura e horizonte. Alterar terreno ou mover arquitetura posteriormente exige revisar seus contatos e apoios: a autoria não cria ligações geométricas automáticas entre props e paredes.

O kit recebeu quatro complementos reutilizáveis: **empena ogival maciça**, **alvenaria com vão ogival**, **cruz dupla de ferro** e **prato/cálice de banquete**. Busque **igreja antiga** nos Assets para encontrar as **22 peças**; o catálogo total passa a 224 modelos. Os vitrais ficam em aberturas reais compostas por alvenaria segmentada e perfis vazados. Isso não acrescenta um tipo novo de janela estrutural ogival. [Guia do kit](CHURCH_KIT.md).

## Iluminação e custo

A montagem usa a [iluminação dinâmica da engine](DYNAMIC_LIGHTING.md): lua direcional, onze fontes vinculadas a objetos e seis zonas de ambiente. Quatro spots de vitral projetam cor na nave; uma spot atende o conjunto ritual; fontes compartilhadas iluminam banquete, anexos e dois afloramentos vermelhos no vale. A zona da nave substitui a névoa global pela atmosfera vermelha local. Desgaste procedural aparece em alvenaria, pilares, cobertura e ferragens. Não há shader ou iluminação específica programada para este mapa. As animações começam pausadas; desmarque **Pausar efeitos animados** para ativar cintilação e movimento das nuvens.

O perfil **Equilibrada** seleciona até oito fontes locais e seis vistas de sombra. Nas capturas, foram usadas até oito fontes e cinco vistas spot, de 512 px; algumas fontes ficam fora do orçamento conforme a câmera. Chamas continuam emissivas mesmo quando sua luz é omitida. Use **Econômica** no editor/projetor se necessário. O horizonte tem menor densidade e uma camada própria para ocultação; não existe LOD/streaming automático. Na revisão das dez vistas, o maior frame registrado somou aproximadamente 5 mil chamadas e 1,5 milhão de triângulos, incluindo passes de sombras/efeitos, com até 46 texturas. São medidas de SwiftShader, com compilação/invalidação durante a troca de câmeras; não equivalem a FPS ou custo estável em GPU física.

## Regeneração e verificação

O arquivo pronto é `public/scenes/igreja-antiga.json`; o gerador não é necessário para carregar, editar, exportar ou jogar. Para manutenção:

```sh
node scripts/generate-library.js
node scripts/generate-church-scene.js
node scripts/preview-church-scene.js
npm run build
npm run build:pages
```

O roteiro de prévia usa o viewport real, captura as dez câmeras e gera a capa de 480 × 270. Nas duas vistas superiores, oculta a camada de coberturas. Recortes e métricas ficam em `test-results/church-view-*.png` e `church-metrics.json`. Argumentos numéricos permitem revisar apenas algumas câmeras, por exemplo `node scripts/preview-church-scene.js 4 7`.

Testes conferem reprodução determinística, cópias independentes, referências, conversão cena/mapa, percurso ascendente, árvores fora dos acessos/construções, portas vazadas, passagem da sacristia, escadas, contato dos apoios dos balcões, vãos dos vitrais, visibilidade e histórico. Fluxos de navegador verificam a galeria, edição de fonte sem recriar objetos, cobertura, salvar/reabrir e projetor com câmera independente em servidor e Pages. **204 testes de domínio/integração, builds local/Pages e cinco E2E afetados aprovados**, incluindo os três do kit e os dois do mapa completo. Resultados finais em [progress.md](../progress.md). SwiftShader valida funcionamento e custo geométrico; o desempenho em notebook/projetor precisa de medição presencial. A aceitação estética das proporções e do acabamento continua aberta ao uso e às próximas referências.
