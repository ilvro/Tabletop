# Paredões e kit de montanha

Incremento de 5 de outubro de 2026, para a referência de trilha nevada entre paredões e construções antigas. Andamento: [progress.md](../progress.md).

## Escopo implementado

1. Geometria fechada de paredão e pináculo, com faces verticais, bordas quebradas e saliências/reentrâncias reais. As formações antigas conservam seus IDs, formas e parâmetros.
2. Saliências, quantidade de camadas e erosão editáveis por instância, mantendo seed, detalhe, dimensões, material, cobertura e histórico. Campos novos são opcionais nos documentos existentes.
3. Quatro formações: face de paredão, canto de desfiladeiro, saliência rochosa e pináculo; oito complementos: torre arruinada, canto de alvenaria, plataforma, corda suspensa, poste de corda, lanterna de parede, raízes/toco e destroços de madeira. Tudo original/local, com materiais nomeados, prévias e pivot na base.
4. Recorte com paredão, ruína, neve e plataforma revisado, com topologia/raycast, vãos reais, parâmetros extremos, recursos de renderização, edição/undo, salvamento/reabertura, projetor independente e distribuição estática no Pages validados.

## Limites desta etapa

Paredões são volumes de assets; o terreno continua com uma altura por X/Z. Não oferece escultura livre de cavernas, colisão exata/navegação automática em malhas ou união booleana entre peças. Camadas de neve e materiais existentes são reutilizados. Slots emissivos de lanternas exigem luz local para iluminar o entorno. Cordas são cenográficas, sem física. Apoios são explícitos; somente uma plataforma com tabuleiro plano recebe apoio anotado neste kit.

Este incremento melhora silhuetas e montagem. Materiais fotográficos/PBR avulsos, decals, montes locais de neve, oclusão ambiente/reflexos e otimizações de cenas densas continuam pendentes, conforme [VISUAL_TARGET.md](VISUAL_TARGET.md).

Escultura manual diretamente em faces, topos e saliências com pincel **T**: [ROCK_SCULPT.md](ROCK_SCULPT.md). Os parâmetros deste kit continuam disponíveis.

## Usar no editor

Em **Assets**, busque **paredão natural**, **pináculo** ou **kit de montanha**. As quatro formações estão em Exterior / Montanha; os complementos em Arquitetura / Ruínas, Arquitetura / Madeira e Exterior / Vegetação alpina.

| Peça | Uso |
| --- | --- |
| Paredão natural · face quebrada | Trechos largos, face principal para +Z |
| Paredão natural · canto de desfiladeiro | Encontro em L, faces para +Z / +X |
| Paredão natural · saliência profunda | Bordas projetadas, faces inferiores e abrigos |
| Pináculo natural · torre de rocha | Silhueta alta e estreita, afunilada no topo |
| Torre arruinada · janela e interior aberto | Fragmento em U, fundo e janela vazados |
| Canto de ruína · pedras antigas | Encontro de muros com juntas e topo quebrado |
| Plataforma de montanha · tabuleiro com apoios | Tábuas, pés e escoras; apoio plano a 1,2 m da base |
| Corda suspensa · trecho curvo | Trecho com flecha entre ancoragens; estático |
| Poste de trilha · cordas e ferragens | Amarração/argola para os trechos de corda |
| Lanterna de parede · suporte e corrente | Braço, escora, elos vazados e núcleo emissivo |
| Toco quebrado · raízes expostas | Raízes curvas, casca e lascas |
| Destroços de carroça · madeira e rodas | Tábuas quebradas, eixo, aros e raios |

Selecione a formação e abra **Geometria da rocha** em Propriedades. **Saliências e reentrâncias (0–1)** altera a profundidade das bordas e sua face inferior; **Camadas (1–12)** altera a quantidade de estratos geométricos; **Erosão (0–1)** quebra a frente com fissuras verticais. **Irregularidade**, **Detalhe (2–8)** e **Seed** continuam disponíveis. Paredão e pináculo também podem ser escolhidos em Forma do volume nas rochas anteriores. Formas antigas conservam suas malhas e documentos sem campos novos continuam válidos.

Rotacione para orientar a frente e ajuste escala X/Y/Z para dimensões diferentes. Parâmetros conservam bounds, pivot na base e transformação/material/neve. Blocos de entulho das peças novas mantêm sua forma ao editar o paredão. **Restaurar forma do modelo** restaura os valores do catálogo; undo/redo e duplicação conservam os ajustes.

Para a referência, comece com duas faces de seeds diferentes formando o paredão, um canto na curva e um pináculo ao fundo. Coloque ruínas e madeira em níveis diferentes e use terreno para a trilha. Acenda a lanterna com uma luz pontual quente posicionada no núcleo; o material emissivo sozinho não ilumina as superfícies próximas. Cobertura de neve permanece em **Material e textura**. Agrupe composições com Ancorar objetos juntos para mover ruína, lanterna e luz como unidade.

## Custo e compatibilidade

Paredões/pináculos têm menos de 4000 triângulos por componente no máximo; detalhe/camadas menores reduzem o custo. Receitas novas agrupam malhas por slot, superfície e tipo de sombreamento, sem animação/atualização de geometria por frame. A torre usa blocos separados na receita, mas poucos lotes na GPU. Instâncias editáveis possuem seus recursos e são descartadas ao reconstruir/remover. Neve com espessura pode dominar o custo: limite sua espessura/densidade e quantidade de objetos antes de ampliar o mapa.

Os 176 assets anteriores mantêm IDs, arquivos e aparência; 12 receitas/prévias locais elevam o catálogo a 188. Materiais procedurais reutilizam o pipeline local; não há downloads ou dependência de API para o kit no Pages. Cenas existentes não são substituídas automaticamente.

## Validação

150 testes unitários/de integração e cinco fluxos E2E afetados aprovados, além dos builds local/Pages. Pixels WebGL variam com saliências/camadas/erosão; receitas liberam seus recursos e complementos usam até quatro draw calls isolados. Capturas: `test-results/mountain-kit.png` e `test-results/mountain-kit-catalog.png`. Ambiente Chromium/WebGL por software; medição presencial continua pendente. Histórico e correções da execução em [progress.md](../progress.md).

## Complemento da cena de exemplo

O piloto de montanha acrescenta uma ruína alta com fiadas proporcionais e janela real, elevando o catálogo a 189 assets. O kit original acima mantém os arquivos e as dimensões. A composição pronta está em Abrir → Cenas → Cenas de exemplo; [EXAMPLE_SCENES.md](EXAMPLE_SCENES.md) descreve montagem, uso e limites.

## Revisão da encosta, caverna e lanternas

Dois assets originais adicionais elevam o catálogo atual a 191:

- **Lanterna arredondada · tampa cônica e corrente**: corpo circular, oito hastes, tampa cônica, alça e corrente de elos intercalados. A argola superior entra no braço de madeira; a última argola liga a corrente à tampa. Acrescente luz pontual no centro emissivo, como no exemplo.
- **Entrada de caverna · abrigo rochoso**: entrada para +Z com seções de arco, volumes rochosos irregulares, laterais, teto e fundo escuro recuado. A abertura é realmente vazada. Use sobre terreno nivelado; a peça não escava nem protege automaticamente o heightmap. É um abrigo cenográfico, não uma ferramenta de cavernas ou um apoio anotado.

A lanterna de parede quadrada recebeu dois elos e uma argola inferior para corrigir a corrente interrompida. Conserva o ID, o pivot e as dimensões. Os demais modelos anteriores não mudaram. O exemplo distribuído agora representa uma subida da montanha, com caverna lateral e ponte elevada; cópias pessoais não são substituídas. Uso em [EXAMPLE_SCENES.md](EXAMPLE_SCENES.md).

Validação da revisão: suíte de 159 testes de domínio/integração, quatro cenários E2E afetados e builds local/Pages aprovados. Os cinco testes do exemplo e o fluxo completo do exemplo no Pages passaram novamente após os encaixes finais: passagem da ponte livre de alvenaria, apoios, vazio da caverna, suporte de madeira sobre a superfície real e luz no corpo das lanternas. Capturas do renderizador em `test-results/mountain-example-reference.png` e `test-results/mountain-example-cave.png`. A suíte completa de navegador não foi repetida.
