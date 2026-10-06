# Vegetação e objetos detalhados de inverno

Implementado em 5 de outubro de 2026. Nove peças originais elevam o catálogo a **202 assets**; os 193 modelos/prévias anteriores permanecem iguais. As peças já compõem o novo exemplo de montanha; montagem e uso em [EXAMPLE_SCENES.md](EXAMPLE_SCENES.md).

## Encontrar e usar

Em **Assets**, procure os nomes abaixo. As plantas ficam em **Exterior / Vegetação detalhada**; os objetos, em **Exterior / Expedição**. Todos têm escala métrica, pivot na base, materiais separados e arquivos locais compatíveis com Pages.

| Peça | Detalhes |
| --- | --- |
| Abeto denso · galhos e agulhas volumosos | Copa assimétrica com agulhas em várias direções, tronco curvo, raízes e ramos afilados/bifurcados |
| Pinheiro denso · copa irregular | Copa mais larga e alta no tronco, com distribuição distinta do abeto |
| Galho seco · curvo e bifurcado | Curvatura, afilamento, ramos secundários e pontas maciças |
| Raízes torcidas · ramificações naturais | Cinco raízes entrelaçadas com bifurcações |
| Arbusto seco · ramos emergindo da neve | Ramos curvos com alturas distintas |
| Barril de madeira · aduelas e aros | Silhueta abaulada, 18 aduelas com espessura, quatro aros metálicos, tampas e tampão |
| Caixa antiga aberta · tábuas e interior | Fundo, paredes com espessura, pregos, cantos e bordas; vão superior real |
| Caixa antiga fechada · tampa e ferragens | Tampa reforçada, tábuas individuais e fecho |
| Destroços de madeira · tábuas partidas | Madeira com espessura e lascas na silhueta, sobreposta em ângulos diferentes |

As cinco plantas novas também aparecem em **Construir → Paisagem → Água e vegetação → Distribuir vegetação**. A proposta inicial usa seis abetos densos; quantidade, escala, seed e inclinação continuam editáveis antes de aceitar. As plantas alpinas anteriores continuam disponíveis para planos distantes.

Selecione uma planta e altere **Variação da vegetação** nas propriedades: seed muda agulhas, irregularidades dos ramos e inclinação dos agrupamentos, preservando dimensões e base. Escala/rotação continuam independentes. Não há ainda um pincel para desenhar cada galho ou controle de densidade por árvore.

## Materiais e neve

Em **Propriedades → Material e textura → Aplicar acabamento em**, escolha `wood` para madeira/casca, `green` para agulhas ou `metal` para ferragens. Os slots permitem recolorir madeira ou metal sem substituir o outro acabamento. As tampas do barril têm um padrão de tábuas próprio.

Para um abeto nevado, escolha `green`, ative cobertura **Neve**, selecione **Depósitos orgânicos · contínuos** e comece com espessura **0,10–0,15 m**, inclinação de **60–65°** e transição suave. Ajuste quantidade, vento e tamanho das manchas. Usar todos os materiais também inclui o tronco e os ramos expostos; selecione `green` para concentrar na copa.

A neve acompanha um envelope superior simplificado de cada ramo com agulhas, formando depósitos entrelaçados em vez de um prisma por agulha. O envelope não é uma superfície visível ou persistida separadamente: é reconstruído junto com a receita. Depósitos respeitam slot, inclinação, espessura, vento e exposição à geometria real. Mudar seed, escala ou cobertura regenera o resultado; abrigos bloqueiam neve. Não há simulação temporal de derretimento/queda de neve dos galhos nem alteração dos apoios anotados dos objetos.

## Custo e validação

Agulhas usam geometria opaca, sem alpha, e as receitas agrupam partes pelo acabamento. As árvores usam duas malhas de material e menos de 65 mil triângulos cada; a neve acrescenta uma malha. Nos fixtures locais, a cobertura da copa permanece abaixo de 18 mil triângulos. O refinamento de envelopes tem alvo de seis mil faces superiores; esse alvo não é um limite universal para GLBs importados ou malhas arbitrárias.

As novas prévias rasterizam as mesmas faces da receita offline em PNG embutido num SVG local. Evitam baixar/desenhar dois megabytes de polígonos por árvore na biblioteca. Não usam rede, imagens da referência ou dependências extras de geração. Materiais detalhados continuam procedurais; não são mapas fotográficos.

Verificados fechamento/orientação dos volumes, determinismo, finitude, dimensões/base, volume da copa, limites de triângulos/malhas, caixa aberta/fechada por raycast, abaulamento do barril, slots/exposição/descarte da neve e autoria/histórico/duplicação/projeção. Builds local e Pages aprovados; validação offline registrada em [progress.md](../progress.md).

A comparação seca/nevada e o descarte GPU passaram no Chromium/SwiftShader, em [winter-detail.test.js](../tests/e2e/winter-detail.test.js). Capturas reais: `test-results/winter-detail-dry.png` e `winter-detail-snow.png`. O recorte nevado de duas árvores e objetos registrou 20 chamadas, 159.152 triângulos e cinco texturas; os dois depósitos de copa têm 9.176 e 8.380 triângulos. O roteiro foi corrigido para aplicar o shader uma vez a cada material, evitando uma falsa falha de folhagem na comparação. A falha anterior de autenticação foi resolvida; não permanece como impedimento. Desempenho no hardware de uso, LOD/instanciamento entre árvores e acabamento fotográfico continuam futuros. Plano geral: [ORGANIC_WINTER_PLAN.md](ORGANIC_WINTER_PLAN.md).
