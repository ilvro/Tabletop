# Rocha orgânica e depósitos de neve

Incremento técnico de 5 de outubro de 2026. Plano: [ORGANIC_WINTER_PLAN.md](ORGANIC_WINTER_PLAN.md). Andamento e validação: [progress.md](../progress.md).

## Colocar e esculpir

Em **Assets**, procure **Rocha orgânica · afloramento irregular** ou **Paredão orgânico · fraturas e erosão**, em Exterior / Montanha. São duas peças novas, com IDs próprios; as 191 anteriores conservam seus arquivos. O catálogo passa a 193 assets.

Em **Propriedades → Geometria da rocha**, escolha **Rocha orgânica** ou **Paredão orgânico**. Essas opções também funcionam nas rochas editáveis anteriores. A forma nova não usa fileiras de estratos: combina massas em três dimensões, deformação espacial, fraturas locais e detalhe em várias escalas. Seed e irregularidade variam o volume; erosão quebra a superfície; o paredão também oferece saliências locais. Escala X/Y/Z controla o tamanho sem mover o pivot da base.

Para corrigir uma região, use **Esculpir esta superfície** ou **T**. O pincel aceita topo, lateral e saliências, com o mesmo histórico e persistência de [ROCK_SCULPT.md](ROCK_SCULPT.md). Os controles paramétricos continuam disponíveis.

Geometria e acabamento são independentes. Em **Material e textura**, escolha **Rocha natural → Personalizar cor e padrão → Orgânica · mineral e fissuras locais**. As duas peças novas já usam esse padrão ao colocar. Cor, brilho, fissuras, escala, seed e microrelevo permanecem personalizáveis. O padrão combina detalhe local com um campo mineral em metros no mapa para reduzir a repetição ampla; conserva o pipeline de albedo, altura para normais aparentes e rugosidade. Não contém mapas fotográficos/importados novos.

## Acumular neve na estrutura

1. Selecione a rocha/estrutura e abra **Material e textura → Cobertura sobre a superfície**.
2. Escolha **Neve**, depois **Forma do acúmulo → Depósitos orgânicos · contínuos**.
3. Defina uma espessura maior que zero, por exemplo **0,2 m**. Ajuste **Inclinação limite** para alcançar as saliências desejadas; comece com 50–60° e uma transição suave.
4. Ajuste **Irregularidade dos montes**, **Tamanho dos montes** e **Direção do vento nos depósitos**. Seed e distribuição da cobertura também continuam disponíveis.
5. Conserve **Acumular somente onde há céu aberto** para evitar neve dentro de abrigos. Material por slot permite cobrir apenas a parte escolhida.

O depósito usa uma superfície conectada e fechada, com espessura compartilhada entre vértices e laterais somente nas bordas das manchas. Normais suavizadas determinam a inclinação de apoio; pequenas manchas isoladas são filtradas, bordas afinadas e regiões maiores recebem refinamento. O resultado acompanha a forma esculpida e é recalculado ao confirmar a edição ou alterar objetos/exposição. Durante o arraste, a cobertura física continua oculta conforme o fluxo anterior.

No terreno, a mesma variação de vento/espessura participa das alturas derivadas, sem alterar as alturas base. Apoios ligados ao terreno usam exatamente essa superfície, inclusive após histórico/salvamento. A máscara do terreno conserva o recálculo explícito depois de mover abrigos. Apoios anotados de props/pisos/gelo continuam no contrato anterior: a neve desses objetos é cenográfica.

**Camada simples · original** permanece disponível, e documentos sem `snowStyle` mantêm esse comportamento. Espessura zero continua oferecendo só cobertura visual.

## Neve caindo e vento

Em **Cena → Atmosfera → Clima e partículas**, escolha **Neve**, ajuste quantidade, tamanho, velocidade, opacidade, região e vento. A opção já existia; este incremento corrige a queda e acrescenta tamanhos/velocidades diferentes entre flocos, deriva e rajadas em um único emissor GPU.

Pausa, movimento reduzido e desligamento dos efeitos continuam independentes por janela. Com velocidade e vento zero, os flocos não mudam de posição. Navegar no editor não publica a câmera no projetor.

Precipitação e depósito são controles separados. O vento dos depósitos modifica sua forma persistida; o vento do clima move os flocos. Não existe acumulação contínua por tempo, derretimento, avalanches, colisão de flocos com tetos ou física de neve. “Dinâmico” neste incremento significa precipitação animada e cobertura recalculada a partir da geometria/exposição editadas.

## Dados, custo e limites

- `rockShape.form` aceita `organic` e `organic-cliff`; seed/irregularidade/detalhe/erosão/saliências reutilizam campos existentes. Não há migração obrigatória de schema.
- `material.rockPattern` aceita `organic`; alvenaria conserva sua textura separada.
- `material.coverage` aceita campos opcionais de neve: `snowStyle` (`legacy`/`organic`), `snowDrift` (0–1), `snowDriftScale` (0,2–20 m) e `snowWindDirection` (0–360°). Campos inválidos são rejeitados antes de confirmar/importar/salvar.
- Novas malhas-base têm menos de 20 mil triângulos por peça no detalhe máximo. A escultura conserva seu orçamento de até 48 mil. Refinamento do depósito tenta manter até 12 mil faces superiores; não é um limite geral de triângulos para qualquer GLB importado. Malhas-fonte grandes e muitas coberturas ainda podem custar caro.
- A cobertura não cria geometria por frame. Os buffers do depósito e seus materiais são liberados ao remover/reconstruir; atlas seguem compartilhamento por referência. O emissor de flocos não atualiza posições na CPU a cada frame.
- Terreno continua tendo uma altura por X/Z. Peças de rocha acrescentam volumes, mas não abrem túneis por booleans/voxels nem fornecem navegação automática de tokens.
- Pintura localizada de neve/material nas rochas, mapas PBR fotográficos, vegetação mais detalhada e reconstrução do exemplo continuam nas etapas seguintes. A base técnica não estabelece paridade visual com a referência.

Captura do protótipo no renderizador: `test-results/organic-cliff-prototype.png`, com rocha, neve e lanterna. Testes WebGL por software verificam funcionamento e liberação de recursos; não constituem benchmark do notebook/projetor reais.
