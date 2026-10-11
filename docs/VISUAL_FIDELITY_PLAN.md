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

### 10 de outubro — etapa 2: luz refletida por zona

Cada zona de ambiente ganhou o campo opcional **Luz refletida pelo ambiente** (`lightingZone.indirect`, 0 a 1). Com ele acima de zero, uma sonda no interior da zona captura o que está em volta (seis vistas de 16 px) e resume em quatro coeficientes de harmônicos esféricos: a cor média da luz que chega ali e de que lado ela vem. As superfícies da zona passam a receber esse ambiente no lugar de parte do preenchimento uniforme: o forro pega a cor do piso, paredes próximas de uma fonte quente esquentam, faces viradas para o lado iluminado ficam mais claras que as opostas.

Decisões:

- **O brilho continua sendo o do autor.** Uma sonda única mede mal a intensidade (ao lado de uma vela lê muito mais que a sala; numa sala com pouca luz direta lê preto: na primeira versão a Igreja estourou e a Casa escureceu). A sonda fornece cor e direção, escaladas para o brilho configurado na zona, e a parte direcional é limitada a 45% da média para nenhuma face ficar sem ambiente.
- **Sem realimentação.** A captura enxerga luz direta mais o preenchimento uniforme, nunca o próprio resultado.
- **Quando recalcula.** Depois que a cena fica parada por 350 ms após uma mudança no que é desenhado (entidades, ambiente, modelos e texturas que chegam depois; tokens, câmeras e estado de sessão não contam), uma zona por quadro e só as zonas em vista: a primeira captura de um cômodo desenha tudo o que há em volta dele. Ferramentas que precisam do quadro pronto chamam `viewport.settleReflectedLight()`; capas e miniaturas capturam antes de fotografar.
- **Luzes fora do orçamento da vista.** A captura usa as luzes acesas para a câmera atual. Escolher luzes por zona muda quantas projetam sombra, e o three.js recompila todos os programas quando essa contagem muda (até 350 ms na GPU e mais de um minuto em WebGL por software, medido e descartado). Em troca, a zona é capturada de novo quando uma fonte que a alcança acende pela primeira vez.
- **Qualidade Econômica** não usa luz refletida: as zonas ficam no preenchimento uniforme.
- **Sem GPU, fica desligada.** Quando o navegador desenha por software (SwiftShader, llvmpipe), cada captura leva segundos e travaria a edição a cada mudança: a luz refletida não é usada, e o alvo dos efeitos da etapa 1 volta ao modo sem multisampling. Em qualquer outra máquina, uma captura acima de 1,5 s desliga o recurso naquela janela até recarregar; `getInfo().zoneProbes.disabled` informa. Na RX 580 a captura mais lenta medida foi de 0,53 s. Os testes automatizados rodam em software e pedem os caminhos completos com `?hardware`.
- **Documentos existentes** não têm o campo e mantêm o preenchimento uniforme. Zonas novas nascem com 0,6; Backrooms, Casa, Igreja e os estudos de iluminação foram regenerados com 0,6.

Custo medido na RX 580: 25–125 ms por zona capturada, e 0,2–0,5 s uma única vez por cena, na primeira captura, porque ela desenha (e envia à GPU) o que a câmera ainda não tinha visto. Tempo de quadro em regime sem mudança mensurável (Igreja 18,6 ms; Backrooms 10,4 ms). Em WebGL por software cada captura custa de 0,2 s a vários segundos; os testes automatizados sentem isso.

Antes e depois (esquerda sem, direita com 0,6): [Backrooms](references/visual-plan/reflected-light-backrooms.jpg), [nave da Igreja](references/visual-plan/reflected-light-igreja.jpg). Nas Backrooms o forro deixa o cinza-esverdeado e assume o amarelo do carpete; na Igreja os pilares e arcos recebem o tom das velas. Na Casa o efeito é discreto (paredes levemente aquecidas pelo piso de madeira): a cena tem pouca luz direta, e isso é assunto de iluminação da cena, não da sonda.

Limites: uma sonda por zona, sem oclusão dentro dela (um canto atrás de um móvel recebe o mesmo ambiente do resto da sala); a sonda fica no centro da zona, a até 1,6 m do piso, e se houver um móvel ali ela enxerga mais o móvel que o piso (na sala de reunião das Backrooms, a mesa); zonas fora da vista só são capturadas quando a câmera chega; cintilação de velas não dispara recaptura; fora de zonas nada muda.

Validação: `tests/e2e/zone-probes.test.js` (zonas em vista capturadas, forro aquece e mantém o brilho, cena parada não recaptura, edição do piso muda o forro, voltar ao original reproduz o quadro) e teste de domínio do campo.

### 10 de outubro — etapa 3 (parte 1): famílias de acabamento

Seis famílias novas de textura procedural (tecido, couro, reboco, azulejo, carpete, pintura) e envelhecimento da madeira, todas com padrão configurável no painel de material e validadas no documento: 18 opções novas entre listas e intervalos. Uso e tabela de controles em [MATERIALS.md](MATERIALS.md#famílias-de-acabamento); amostras em [surface-families.png](references/visual-plan/surface-families.png).

- **Máscara de recoloração.** O canal alfa do atlas diz quanto da cor escolhida cada ponto aceita, para que rejunte, lascas e substrato mantenham a própria cor ao recolorir.
- **Biblioteca.** Acabamento decidido por slot, para não aumentar lotes: tecido onde o slot tem almofada (16 modelos), pintura com lascas em slots coloridos de máquinas, veículos e equipamentos (31), couro em slots de couro.
- **Atlas padrão preenchido sob demanda.** Gerar as dezenove texturas de uma vez bloqueava a página por cerca de 2,3 s; agora cada preset é gerado na primeira vez em que é usado.
- **Documentos.** Escolher uma textura grava as opções gerais, as de madeira/metal/rocha como antes e as da família escolhida; cenas existentes e geradores produzem os mesmos arquivos.

Medição na RX 580: tempo de quadro inalterado (Backrooms 10,7 ms, Casa 10,5 ms, Igreja 19,7 ms, Montanha 4,4 ms).

Validação: `tests/surface-families.test.js` (opções editáveis e validadas, cada opção altera a textura, repetição sem emenda, máscara de recoloração, atlas sob demanda) e os testes existentes de materiais, que percorrem todos os presets.

Falta na etapa 3: desgaste que segue a geometria (bordas gastas, sujeira em reentrâncias). A geometria dos modelos tem arestas vivas por face, então a curvatura não pode ser medida na tela; exige marcar chanfros e cantos ao gerar os modelos.

### 10 de outubro — etapa 3 (parte 2): desgaste nas bordas

O desgaste ganhou o local **Bordas e quinas** e o tipo **Uso · material exposto**. A curvatura não pode ser medida na tela porque os modelos têm faces planas com arestas vivas; em vez disso, `src/render/wear-edges.js` deriva uma geometria em que cada vértice guarda a distância até quatro linhas de vinco que delimitam a sua face. A distância a uma linha é linear dentro de uma face plana, então o shader obtém por interpolação a distância exata até a aresta mais próxima, mesmo em caixas de dois triângulos por lado. A geometria derivada é calculada uma vez por modelo, só quando esse local é usado, e compartilhada pelas cópias; a largura da faixa (`wear.edgeWidth`) é opcional no documento. Uso e limites em [MATERIALS.md](MATERIALS.md#desgaste-nas-bordas); amostras em [edge-wear.png](references/visual-plan/edge-wear.png).

Não foi feito: sujeira em reentrâncias medida pela geometria (exigiria oclusão por vértice calculada na geração dos modelos) e desgaste de fábrica nos modelos da biblioteca, porque o desgaste pertence ao objeto na cena, não à receita do modelo.

Com isso a etapa 3 está concluída no que foi planejado, com essas duas ressalvas.
