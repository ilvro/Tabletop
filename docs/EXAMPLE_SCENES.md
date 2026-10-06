# Cenas de exemplo

Atualizado em 5 de outubro de 2026. O exemplo de montanha foi reconstruído integralmente com rocha/neve orgânicas, vegetação densa, objetos detalhados e tempestade. A composição substitui a versão rejeitada; continua editável e não representa uma declaração de paridade visual com a referência.

## Carregar e editar

Em **Abrir → Cenas → Cenas de exemplo**, escolha **Subida da montanha · caverna e ruínas**. O carregamento cria uma cópia independente e ainda não salva. Use **Salvar** para guardá-la no servidor local ou, no GitHub Pages, neste navegador. O exemplo original continua disponível; carregá-lo novamente cria outra cópia, sem substituir seu trabalho. Cópias pessoais de versões anteriores permanecem iguais.

A montagem usa entidades comuns: terreno com alturas e camada pintada, água/gelo, rochas esculpíveis, arquitetura, madeira, vegetação, cobertura de neve e luzes. Você pode selecionar cada peça, mudar materiais, esculpir com **T**, excluir, duplicar, salvar ou apresentar. Os objetos ficam em seis pastas desbloqueadas. O mapa é geometria 3D navegável; não usa a imagem de referência como fundo.

## Subida da montanha

**101 elementos e quatro luzes**, em uma área de **48 × 62 metros**. A trilha sinuosa sobe aproximadamente dez metros pela encosta direita; um lago glacial irregular ocupa a base esquerda, a caverna abre lateralmente e uma ponte elevada atravessa a ravina à frente. Três paredões orgânicos ficam no lado esquerdo, com formações, boulders e cobertura variáveis. Ruínas em alturas diferentes e pequenas paredes acompanham a subida.

O relevo combina ruído espacial em quatro escalas com deformação do domínio. A trilha é mais suave localmente; taludes, ravina e margem conservam irregularidade. Neve com espessura e variação pelo vento participa da superfície do terreno. Não há duas paredes paralelas formando uma passarela. O terreno permanece um heightmap de 64 segmentos, com uma altura por X/Z; caverna e saliências usam malhas independentes.

A caverna tem teto, laterais e fundo escuro recuado, um piso explícito para apoio e quatro rochas orgânicas enquadrando a entrada. Há espaço real dentro dela e máscara de neve sob o abrigo. Esculpir o terreno posteriormente não remove automaticamente o teto nem conserva esse interior livre. Rochas/ruínas não inferem colisão ou navegação de tokens.

A ponte tem piso de apoio fino sobre o tabuleiro, extremidades niveladas com os acessos e pilares abaixo das vigas. Selecione o piso como superfície para apoiar tokens. O leito do lago foi escavado com margem suficiente para permanecer abaixo da água e das ondas mesmo entre vértices; o gelo ocupa uma borda.

Três lanternas **arredondadas** têm corpo circular, tampa cônica, hastes, alça e elos conectados. As luzes coincidem com os núcleos emissivos. Suportes foram assentados por raycast sobre a geometria durante a autoria; não acompanham automaticamente o paredão depois de movê-lo.

Quatro abetos densos e um pinheiro denso recebem depósitos nas copas por envelopes de ramos; quatro abetos leves completam os planos distantes. Caixas antigas aberta/fechada, barril abaulado com aduelas/aros, tábuas partidas, raízes, galhos bifurcados, arbustos e capim dão escala ao primeiro plano. Objetos maiores acompanham a inclinação do chão e as rochas são enterradas a partir da altura mínima em sua área de contato. Peças de fundo usam cobertura visual para conter o custo.

A atmosfera tem névoa fria, iluminação difusa e **2.700 flocos de neve**, com queda, vento e rajadas. Volume e bloom ficam desligados. Pausa, movimento reduzido e desativação de efeitos interrompem animações por janela; precipitação e depósitos são controles separados. Não existe simulação contínua de acumulação/derretimento ou colisão dos flocos com tetos.

## Enquadramentos

Em **Cena → Câmera e apresentação → Enquadramentos**:

1. **Subida, caverna e ponte** — composição principal da encosta.
2. **Entrada lateral da caverna** — abertura e abrigo.
3. **Ponte e continuação da subida** — tabuleiro, acesso e ruínas.
4. **Visão geral para construir** — conjunto de massas e terreno.
5. **Mapa superior** — área em projeção ortográfica.

A primeira câmera é carregada no editor. A navegação livre do mestre conserva a câmera publicada no projetor; publicar exige uma ação explícita.

Para trabalhar nas vistas ampla/superior, desligue **Cena → Atmosfera → Névoa e efeitos nesta janela**: revela o conjunto sem névoa/clima/efeitos, sem alterar o ambiente salvo nem o projetor. Religue para avaliar a atmosfera. As capturas de autoria ampla/superior usam esse controle local; as demais mantêm a tempestade e névoa.

## Gerar e acrescentar outros exemplos

O catálogo fica em `src/data/example-scenes.js`. Novos exemplos precisam de nome, descrição, caminhos relativos para JSON/ prévia e cena válida de schema 2 com referências locais. Arquivos ficam em `public/scenes/`; não se acrescentam automaticamente à biblioteca pessoal.

`node scripts/generate-example-scenes.js` materializa deterministicamente a montanha a partir de `scripts/mountain-example.js`. Não regenera o outro exemplo independente de ponte. O gerador é ferramenta de manutenção; não roda ao abrir a cena.

Depois de `npm run build`, `node scripts/preview-example-scene.js` carrega pela interface e captura o renderizador real. Gera `public/scenes/snowy-mountain-pass.jpg` e recortes das cinco câmeras em `test-results/mountain-example-*.png`, além de dois frames da tempestade animada. Refaça os builds local/Pages depois de atualizar a prévia.

## Validação e limites

Os testes de geometria verificam reprodução do JSON, referências, subida, margem/leito do lago, terreno livre na caverna, vazio real do abrigo, ponte sem bloqueios, fixação das lanternas, histórico e cópias independentes. A revisão visual compara os cinco enquadramentos e o contato das peças. Carregamento real, edição, persistência e projetor são verificados nos modos servidor e Pages.

Resultados e medidas finais em [progress.md](../progress.md). WebGL por software verifica funcionamento e custo geométrico; não estabelece FPS no notebook/projetor. O acabamento continua procedural. Materiais fotográficos, desgaste localizado/decals, pintura de depósitos em rochas, contato/reflexos e otimizações de cenas densas permanecem evoluções reais. O mapa está disponível sem esperar por essas extensões.

Guias: [rocha e neve orgânicas](ORGANIC_WINTER.md), [vegetação e objetos](WINTER_DETAIL.md), [plano e estado](ORGANIC_WINTER_PLAN.md) e [objetivos visuais](VISUAL_TARGET.md).
