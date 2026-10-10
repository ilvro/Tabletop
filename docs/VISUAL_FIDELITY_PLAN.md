# Plano de fidelidade visual

Elaborado em 8 de outubro de 2026. Objetivo: aproximar as cenas do tabletop mais recente de Ordem Paranormal, a partir das lacunas registradas em [VISUAL_TARGET.md](VISUAL_TARGET.md) e do código atual. As imagens de referência mostram o resultado final, não o motor nem as técnicas; cada etapa deve ser confirmada num piloto. Execução depois do [plano de desempenho em escala](RENDER_SCALE_PLAN.md), respeitando seus orçamentos (lotes, índices, sombras, níveis de detalhe).

## Etapas, por retorno visual

1. **Nitidez com efeitos ligados.** O compositor limita a resolução a 1 pixel por pixel CSS (`src/render/effects.js`) e seu alvo não tem multisampling; ligar AO ou bloom borra a imagem. Alvo com MSAA na resolução do renderizador (até 1,6) e AO em meia resolução com ampliação que respeita bordas.
2. **Iluminação indireta e contato.** Hoje há luz direta e preenchimento uniforme. Capturar irradiância por cômodo/zona (as zonas de iluminação já existem) e usá-la como ambiente local; invalidar ao mudar paredes ou luzes da zona; AO ligado nos presets internos.
3. **Materiais.** Conjunto PBR próprio por família (madeira envernizada/crua, tecido, couro, reboco, azulejo, metal pintado/oxidado, carpete) e desgaste localizado por peça com `material-wear.js`: bordas gastas, sujeira em reentrâncias.
4. **Modelos-herói em GLB.** Cerca de trinta peças de maior presença (estofados, estátuas, vegetação, veículos) substituídas por GLB autoral/CC0 com textura embutida, mantendo ID e slots. A biblioteca procedural continua como preenchimento.
5. **Composição e reflexos.** Decalques (manchas, rachaduras, papéis, poças), objetos pequenos de história e prefabs por cômodo; captura de reflexo local por zona; miniaturas 3D de corpo inteiro.

## Piloto

Dois cômodos das Backrooms com enquadramentos fixos de antes/depois, medidos com projetor aberto. As etapas 1 e 2 são validadas nele antes de reconstruir as demais cenas com 3 → 4 → 5.

## Limite

Igualdade exata depende também dos modelos, texturas e direção de arte originais.

## Andamento

### 10 de outubro — etapa 1: nitidez com efeitos ligados

O alvo dos efeitos (`src/render/effects.js`) passou a ter multisampling 4× fora da qualidade Econômica, e sua resolução deixou de ser fixada em 1 pixel por pixel CSS. Como névoa volumétrica e bloom rodam em cada pixel desse alvo, a resolução segue a qualidade da janela:

| Qualidade | Antialiasing do alvo | Resolução dos efeitos |
| --- | --- | --- |
| Econômica | sem (como antes) | até 1× |
| Equilibrada e Personalizada | 4× | até 1,25× |
| Alta | 4× | a do renderizador (até 1,6×) |

O AO continua em meia resolução, agora da resolução física dos efeitos. `getInfo().effects` informa `samples` e `pixelRatio`.

Custo medido na RX 580 (p50, câmera em movimento, 1600×900): em tela comum (1×) cerca de 1–2 ms por quadro (Backrooms 9,4 → 10,8 ms, Igreja 17,4 → 19,5 ms, dentro da variação de carga da máquina). Em tela de alta densidade (2×), na Igreja, que tem névoa e bloom: 18 ms com o limite antigo, 23 ms em Equilibrada, 32 ms em Alta; nas Backrooms, só com AO, 10,1 → 10,6 ms.

Capturas antes/depois (`node scripts/capture-views.js <dir> [--dpr=2] cena:câmeras`) na sala da Casa: bordas de móveis e linhas do tapete deixam de serrilhar em 1×; em 2× o padrão do tapete e as lombadas dos livros ficam definidos.

Validação: `tests/e2e/effects-sharpness.test.js` confere amostras e resolução por qualidade em tela 2×.

Observação para a etapa 2: nas capturas, a sala da Casa aparece escura e chapada fora do alcance direto das luzes; é o caso que a iluminação indireta por zona deve resolver.
