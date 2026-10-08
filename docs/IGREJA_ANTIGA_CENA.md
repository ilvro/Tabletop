# Igreja Antiga — templo e vale dos vampiros

Reconstrução visual de 7 de outubro de 2026, com revisão de nitidez em 8 de outubro, disponível em **Abrir → Cenas → Cenas de exemplo → Igreja Antiga · templo e vale dos vampiros**. Carregar cria uma cópia independente e ainda não salva; use **Salvar** para guardá-la no servidor local ou neste navegador no Pages. As cenas pessoais existentes permanecem iguais.

A capa deste cenário é gerada automaticamente pelo Tabletop a partir da cena, sem imagem pré-pronta. [Funcionamento das prévias](EXAMPLE_SCENES.md#imagem-automática-de-cada-cena).

## O que mudou nesta reconstrução

A nova montagem substitui o exemplo anterior. Cópias pessoais já salvas não são migradas: carregue novamente o exemplo e salve uma nova cena para usar esta versão.

- Cobertura de duas águas com tesouras, escoras e empenas triangulares; cumeeira a aproximadamente 16,2 m acima da nave, no lugar da abóbada ogival de cerca de 20 m.
- Vitral com losangos, rosáceas e chumbo nas duas faces, legível tanto por dentro quanto por fora.
- Retábulo de 10,55 m, nova efígie decapitada de 7,7 m com pregas/asas fragmentadas e Dama de Ferro com aros, espinhos e medalhão.
- Alvenaria de blocos, piso com padrão menor, desgaste concentrado nas bases, pendões longos, cadeiras deslocadas e fragmentos junto aos bancos.
- Árvores secas ramificadas próprias, lua no enquadramento do templo e luzes vermelhas/âmbar redistribuídas.

Oito receitas novas preservam as 22 peças anteriores: cobertura, tesoura, empena, vitral, retábulo, efígie, relicário e árvore. O resultado continua sendo uma interpretação em geometria editável, com acabamento procedural; não tem os modelos/texturas originais nem promete equivalência fotográfica à série.

## Revisão de nitidez — 8 de outubro

Restaurados os blocos e juntas nas paredes, pilares, arcadas, balcões e empenas, com desgaste mais leve. A textura do piso passou de 3,8 para 1,3 m por repetição; a alvenaria passou de reboco de 3,2 m para blocos com repetição de 1,5 m. A intensidade do bloom passou de 0,30 para 0,10, com raio 0,15 e limiar 1,35, concentrando o brilho nas fontes luminosas. O preenchimento da nave passou de 0,19 para 0,28 e a densidade da névoa interna de 0,012 para 0,006.

Testes direcionados do kit/cena e builds local/Pages aprovados nesta revisão; quatro vistas internas conferidas no renderizador real, com ausência de erros de assets e preservação de recursos durante edição de luz. Logs em `test-results/church-clarity-{unit,build,build-pages,preview}.log`.

A câmera 04 voltou ao eixo central da nave, a 3,1 m do piso, com FOV 60°. As câmeras 05/06/07 usam 62°/58°/65°, reduzindo a abertura exagerada dos enquadramentos internos. Carregue novamente o exemplo para obter os ajustes em uma nova cópia; uma cena pessoal já salva conserva seu acabamento e suas câmeras.

## Composição

O cenário reúne nave, banquete, presbitério, Dama de Ferro, Serafim decapitado, pendões, vitrais, arcadas inferiores, seis balcões semicirculares, galerias laterais e sobre a entrada, duas escadas, sala de correntes e sacristia. O exterior tem fachada de três portais, torre assimétrica, contrafortes, pináculos e cobertura fechada; platô elevado, caminho ascendente, paredões, monólitos separados por desfiladeiros, árvores secas e cordilheiras distantes completam o vale violeta.

São **423 elementos, 12 pastas, quatro andares e dez enquadramentos**. A nave mede **19 × 35 m**, com piso a **18,8 m** no mundo; galerias a **5,8 m** acima desse piso. O relevo principal ocupa **128 × 144 m** e o horizonte cenográfico amplia o conjunto para aproximadamente 250 m. Essas são medidas propostas para esta montagem, não medidas oficiais deduzidas das referências. A célula está configurada em 1,5 m, com grid e snap inicialmente desligados; a régua pode medir distâncias físicas, sem aplicar regras de combate automaticamente.

A versão representa a ocupação ritual antes do incêndio. Baseia-se nas sete imagens anexadas nesta revisão e na descrição recuperada na [análise anterior](IGREJA_ANTIGA_ANALISE.md). A posição da sala de correntes, sacristia, ligações e escadas é uma adaptação de autoria: as referências não mostram uma planta completa. Modelos, símbolos e texturas são originais/procedurais; o acabamento não reproduz fielmente os modelos da série. As outras imagens bloqueadas da galeria não foram inspecionadas.

## Navegar e jogar

Em **Cena → Enquadramentos**, escolha:

| Câmera | Conteúdo |
| --- | --- |
| 01 · Igreja sobre o desfiladeiro | Vista inicial do templo, platô e vale. |
| 02 · Caminho de aproximação | Entrada vista da subida, com lua e névoa. |
| 03 · Fachada e torre | Três portais, vitrais e torre assimétrica. |
| 04 · Nave em direção ao altar | Banquete, arcadas e conjunto ritual. |
| 05 · Galeria em direção à entrada | Balcões, tesouras da cobertura e fachada interna. |
| 06 · Dama de Ferro e Serafim | Detalhe do presbitério. |
| 07 · Sala de correntes | Ganchos, mesa e ambiente baixo. |
| 08 · Sacristia | Caixão, estante e área de apoio. |
| 09 · Planta da igreja | Vista ortográfica para jogar, com cobertura oculta. |
| 10 · Vale e percurso superior | Organização do exterior e caminho. |

As câmeras não alteram a visibilidade das coberturas. Para jogar em planta, oculte a pasta **11 · Coberturas (ocultar para planta)** pelo botão de olho em **Cena → Elementos da cena**. Também é possível ocultar a camada **Coberturas · ocultar para vista superior** na organização da construção. Isso remove cascas do telhado, tesouras, tetos dos anexos e coroamento do campanário; pisos, galerias e paredes permanecem editáveis. Religue para apreciar o exterior e o teto. O controle é manual, com undo/redo.

O botão **Ver interior** controla o recorte das paredes. Desative-o para conferir a fachada fechada; o recorte não remove os props do telhado. Para ver todo o mapa sem a atmosfera, desligue temporariamente **Névoa e efeitos nesta janela**. Essa preferência e a qualidade de iluminação pertencem à janela; a visibilidade de pastas/camadas pertence ao documento e acompanha a apresentação.

Uma passagem de um metro ao lado do presbitério dá acesso à sacristia sem atravessar o altar elevado. Os pisos da nave, presbitério, galerias, patamares, anexos e adro são apoios reais. Os balcões têm pisos poligonais que acompanham suas lajes curvas, sem apoio fora do contorno. As duas escadas têm lances de 2,9 m e patamares de retorno, com ligações entre andares. O campanário acima das escadas é cenográfico e não oferece um segundo interior acessível. Não há tokens pré-colocados, bloqueio automático de movimento, linha de visão ou alcance de combate.

A navegação do mestre conserva a câmera publicada. Escolher um enquadramento salvo também o publica; seu botão de corte publica sem transição. Use **Publicar câmera atual** para enviar uma posição obtida por navegação livre.

## Editar o cenário

Todas as peças usam os controles comuns de seleção, transformação, materiais, desgaste, duplicação, histórico e salvamento. As pastas separam terreno, paredões, vegetação, estrutura, arcadas/vitrais, galerias, torres/escadas, ritual/banquete, sala de correntes, sacristia, cobertura e horizonte. Alterar terreno ou mover arquitetura posteriormente exige revisar seus contatos e apoios: a autoria não cria ligações geométricas automáticas entre props e paredes.

Busque **igreja antiga** nos Assets para encontrar as **30 peças**; o catálogo total tem **232 modelos**. As oito receitas desta revisão estão em `scripts/library-church-reconstruction.js`. Os vitrais ficam em aberturas reais compostas por alvenaria segmentada e perfis vazados. Isso não acrescenta um tipo novo de janela estrutural ogival. [Guia do kit](CHURCH_KIT.md).

## Iluminação e custo

A montagem usa a [iluminação dinâmica da engine](DYNAMIC_LIGHTING.md): lua direcional, onze fontes vinculadas a objetos e seis zonas de ambiente. Quatro spots de vitral projetam cor na nave; uma spot atende o conjunto ritual; fontes compartilhadas iluminam banquete, anexos e dois afloramentos vermelhos no vale. A zona da nave substitui a névoa global pela atmosfera vermelha local. Desgaste procedural aparece em alvenaria, pilares, cobertura e ferragens. Não há shader ou iluminação específica programada para este mapa. As animações começam pausadas; desmarque **Pausar efeitos animados** para ativar cintilação e movimento das nuvens.

O perfil **Equilibrada** seleciona até oito fontes locais e seis vistas de sombra. Nas capturas, foram usadas até oito fontes e cinco vistas spot, de 512 px; algumas fontes ficam fora do orçamento conforme a câmera. Chamas continuam emissivas mesmo quando sua luz é omitida. Use **Econômica** no editor/projetor se necessário. O horizonte tem menor densidade e uma camada própria para ocultação; não existe LOD/streaming automático. Na primeira revisão das dez vistas desta reconstrução, a planta do vale registrou cerca de 2,83 milhões de triângulos incluindo passes de sombra/efeitos. As métricas por câmera estão em `test-results/church-metrics.json`; os valores variam com as fontes selecionadas e a atualização dos frames. São medidas de SwiftShader, com compilação/invalidação durante a troca de câmeras; não equivalem a FPS ou custo estável em GPU física.

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

Testes conferem reprodução determinística, cópias independentes, referências, conversão cena/mapa, percurso ascendente, árvores fora dos acessos/construções, portas vazadas, passagem da sacristia, escadas, contato dos apoios dos balcões, vãos dos vitrais, visibilidade e histórico. Fluxos de navegador verificam a galeria, edição de fonte sem recriar objetos, cobertura, salvar/reabrir e projetor com câmera independente em servidor e Pages. Validação desta revisão: 220 testes de domínio/integração e builds local/Pages aprovados. Cinco E2E afetados aprovados por suíte (cena completa e 30 modelos em servidor/Pages); dez testes direcionados repetidos após ajustes finais. Detalhes em [progress.md](../progress.md). SwiftShader valida funcionamento, mas desempenho no notebook/projetor depende de medição presencial.
