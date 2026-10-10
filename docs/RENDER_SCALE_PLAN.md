# Plano de desempenho de renderização em escala

Elaborado em 8 de outubro de 2026, depois da reconstrução da biblioteca. Complementa o [plano de otimização de edição](PERFORMANCE_PLAN.md), que tratou de invalidações, histórico e interface; este trata do custo de desenhar cenas densas. Andamento em [progress.md](../progress.md).

## Contrato de preservação

Aparência, seleção e edição individual de cada objeto, histórico, salvamento, projetor com câmera independente e personalização de material por instância permanecem. Nenhuma etapa muda documentos de cena.

## Linha de base

Triângulos e chamadas de desenho somados por instância a partir de `public/assets/construction-audit.json` (props com asset; terreno, paredes e pisos não entram).

| Cena | Triângulos antes da reconstrução | Depois | Chamadas antes → depois | Maior custo |
| --- | --- | --- | --- | --- |
| Backrooms | 156 mil | 590 mil | 898 → 668 | papel de parede ×87 (254 mil), forro ×120 (137 mil) |
| Casa de bairro | 37 mil | 418 mil | 551 → 282 | arbustos ×7 (88 mil), vasos ×9 (51 mil) |
| Igreja Antiga | 995 mil | 1,76 milhão | 898 → 618 | árvore do desfiladeiro ×68 (685 mil) |
| Passagem da montanha | 799 mil | 967 mil | 136 → 136 | rochas orgânicas ×27 (311 mil) |

Os testes automatizados usam WebGL por software e não medem capacidade no hardware de uso.

## O que a medição no hardware mostrou

`node scripts/benchmark-frames.js` mede tempo de quadro pelo mesmo viewport do aplicativo, em Chromium com a GPU da máquina (Radeon RX 580, 1600×900), movendo a câmera a cada quadro; `node scripts/profile-frames.js [cena]` mostra onde vai o tempo de script.

- **O tempo de quadro acompanha as chamadas de desenho, não os triângulos.** A montanha desenha 942 mil triângulos em 184 chamadas a 3,7 ms; a Igreja leva 28 ms com 1 787 chamadas. A GPU tem folga (cerca de 10 ms na Igreja); o limite é o CPU preparando cada chamada.
- **Cada instância tem material próprio**, então o three.js reenvia todos os uniforms a cada chamada. O maior custo isolado eram as matrizes das zonas de iluminação, copiadas elemento a elemento por material (19% do tempo de script).
- **AO dobra as chamadas:** o passe de oclusão redesenha a cena inteira para obter normais.
- Sombras ficam em cache e pesam pouco em regime (11 quadros de sombra em 215).

Portanto as etapas que reduzem chamadas ou o custo por chamada (5 e a nova 4) valem mais que reduzir triângulos (6).

## Etapas

1. **Medição reproduzível.** `scripts/measure-scenes.js` soma triângulos, vértices e chamadas por cena e lista os maiores custos; a tabela acima passa a ser regenerável. Medição de tempo de frame no notebook com editor e projetor continua manual (`?diagnostics`).
2. **Retirar refinamento sem efeito visível.** O refinamento automático dos kits acrescenta subdivisão a módulos planos e muito repetidos (papel de parede, forro, árvores). Limitar por família/peça, sem alterar silhueta.
3. **Geometria indexada.** O agrupamento por material converte tudo para três vértices por triângulo. Soldar vértices equivalentes (posição, normal e UV) depois de agrupar reduz memória e custo de vértice, inclusive no passe de sombra.
4. **Custo por chamada.** Uniforms compartilhados em arrays planos; materiais compartilhados entre instâncias idênticas, com cópia ao personalizar, para o three.js não reenviar uniforms entre chamadas consecutivas; avaliar normais do AO sem redesenhar a cena.
5. **Instanciamento.** Instâncias do mesmo asset sem personalização de material ou geometria são desenhadas em lotes (`InstancedMesh`), mantendo seleção, edição e histórico individuais; uma peça sai do lote ao ser personalizada.
6. **Níveis de detalhe e sombras econômicas.** Receita simplificada por modelo, trocada por distância e usada em sombras; peças miúdas deixam de projetar sombra. Só depois de 4 e 5, porque a GPU ainda tem folga.
7. **Descarte por cômodo/andar.** Não desenhar zonas fechadas fora de vista, a partir do isolamento de andares existente.

Ordem: 1 → 2 → 3 → 4 concluídas (resta apenas o vidro de dupla face); 5 é a de maior ganho restante e maior risco (seleção, histórico, projetor, personalização por instância) e deve ser decidida por medição, agora que as cenas de exemplo ficam perto ou acima de 60 quadros por segundo.

## Critérios de conclusão por etapa

Testes unitários e E2E afetados aprovados, builds local/Pages, tabela da linha de base atualizada, pranchas dos modelos alterados revisadas e registro em `progress.md` com o que foi medido e o que não foi.

## Andamento

### 8 de outubro — etapas 1 a 3 e início da 4

- **Etapa 1:** `scripts/measure-scenes.js` (custo estático), `scripts/benchmark-frames.js` (tempo de quadro na GPU) e `scripts/profile-frames.js` (perfil de CPU).
- **Etapa 2:** o refinamento automático deixou de aumentar a densidade de rochas, ramos, agulhas e folhas, de chanfrar peças com menos de 2 cm e os módulos das Backrooms, e de biselar perfis; cilindros, tornos e esferas usam lados conforme o raio em toda a biblioteca. Os envelopes dos kits voltaram aos originais.
- **Etapa 3:** `weldVertices` indexa os lotes depois do agrupamento (rochas esculpíveis e proxies de neve mantêm a ordem dos vértices). Custo de montar os 244 modelos: 4,0 s → 4,7 s.
- **Etapa 4 (parte):** uniforms das zonas de iluminação em `Float32Array`; cache de modelos por asset ampliado de 32 para 128, porque Casa e Igreja usam 44 e 43 assets distintos e reconstruíam modelos expulsos.

Custo estático das cenas (props com asset):

| Cena | Triângulos: reconstrução → agora | Vértices: reconstrução → agora |
| --- | --- | --- |
| Backrooms | 590 mil → 259 mil | 1 769 mil → 458 mil |
| Casa de bairro | 418 mil → 319 mil | 1 253 mil → 372 mil |
| Igreja Antiga | 1 760 mil → 1 344 mil | 5 279 mil → 1 403 mil |
| Passagem da montanha | 967 mil → 828 mil | 2 902 mil → 1 997 mil |

Tempo de quadro na RX 580 (p50, primeira câmera de cada cena; antes = depois das etapas 2–3 e antes dos arrays planos, não há medição de hardware anterior a elas):

| Cena | Chamadas | Antes | Agora |
| --- | --- | --- | --- |
| Backrooms · O salão amarelo | 1 611 | 26,6 ms | 19,4 ms |
| Casa · Chegada pelo jardim | 1 179 | 21,0 ms | 15,8 ms |
| Igreja · sobre o desfiladeiro | 1 787 | 37,1 ms | 28,3 ms |
| Montanha · Subida, caverna e ponte | 167 | 3,9 ms | 4,9 ms |

Resultado completo em `test-results/frame-benchmark.txt`. A Igreja ainda fica abaixo de 60 quadros por segundo com câmera em movimento; a etapa 4 (materiais compartilhados) e a 5 atacam isso. Com a câmera parada o renderizador não redesenha.

### 9 de outubro — etapa 4: materiais compartilhados

- **`src/render/material-sharing.js`:** durante o desenho de um quadro, malhas de aparência idêntica usam um único objeto de material; ao terminar, cada malha volta a ter o seu. Edição, seleção, miniaturas e capas nunca veem um material compartilhado, então nenhum ponto de autoria precisou de cópia ao personalizar. A identidade reúne chave do programa, `userData` (textura, desgaste), mapas e os valores que a autoria altera sem recompilar (cor, emissão, rugosidade, metalicidade, opacidade). Uma impressão numérica por malha detecta edições entre quadros; o agrupamento só é refeito quando algo muda.
- **Não compartilham:** terreno com camadas, cobertura (neve) e materiais transparentes de dupla face, que o three.js desenha em dois passes e marca para atualização a cada quadro.
- **Desgaste:** `applyMaterialWear` registra o referencial local da camada em `userData.wearSpace`, o que permite compartilhar peças envelhecidas iguais (158 props e 75 estruturas na Igreja).
- **Matrizes de mundo** atualizadas uma vez por quadro, e não a cada passe (cor, AO, sombras).
- `viewport.setMaterialSharing(false)` desliga o recurso para diagnóstico; `getInfo().materialSharing` informa malhas, compartilhadas e reagrupamentos.

Tempo de quadro na RX 580 (p50, primeira câmera), com e sem compartilhamento na mesma sessão (`--no-sharing`), duas rodadas alternadas. A máquina estava em uso (carga média entre 5 e 8), por isso os valores absolutos são maiores que os de 8 de outubro e variam cerca de 2 ms entre rodadas; a comparação lado a lado é a medida confiável:

| Cena | Chamadas | Sem compartilhar | Compartilhando | Redução |
| --- | --- | --- | --- | --- |
| Backrooms · O salão amarelo | 1 611 | 22,8 / 23,6 ms | 17,5 / 16,6 ms | 26% |
| Casa · Chegada pelo jardim | 1 179 | 17,8 / 18,5 ms | 12,9 / 13,4 ms | 28% |
| Igreja · sobre o desfiladeiro | 1 787 | 32,5 / 34,0 ms | 23,4 / 24,9 ms | 27% |
| Montanha · Subida, caverna e ponte | 167 | 5,2 / 5,8 ms | 4,0 / 3,9 ms | 28% |

Na Igreja, 686 de 912 malhas compartilham material. Com a máquina mais livre as mesmas cenas mediram 14,5 ms (Backrooms), 13,4–15,7 ms (Casa) e 22,8–26,7 ms (Igreja): Backrooms e Casa passam de 60 quadros por segundo em movimento; a Igreja fica em torno de 40.

Validação específica: `tests/material-sharing.test.js` (posse restaurada, edição local, exclusões) e `tests/e2e/material-sharing.test.js`, que compara o quadro com e sem compartilhamento nas Backrooms e na nave da Igreja. A ordem de desenho muda com o material, então emendas coplanares podem resolver para a outra superfície em linhas de um pixel; o teste conta apenas diferenças em área.

Restante da etapa 4: o passe de AO redesenha a cena para obter normais (dobra as chamadas). Reaproveitar a profundidade do quadro exige reordenar a cadeia de passes, porque a névoa volumétrica lê a profundidade do mesmo buffer, e muda levemente o AO; fica para uma entrega própria, com comparação de imagens. O vidro de dupla face força verificação de programa a cada quadro. Depois, etapa 5.

Os E2E de interface rodam sobre `dist/`: é preciso `npm run build` antes de executá-los.

### 10 de outubro — etapa 4: AO sem redesenhar a cena

O passe de oclusão ambiente desenhava a cena inteira uma segunda vez para obter profundidade e normais. Agora ele lê a profundidade do próprio quadro e deriva as normais dela (`NORMAL_VECTOR_TYPE 0` do GTAO); o compositor alterna seus dois alvos, então o passe de cena registra a cada quadro qual deles contém a profundidade. A ordem dos passes e a névoa volumétrica não mudaram.

Capturas na GPU com efeitos pausados (`node scripts/capture-views.js <dir> cena:câmeras`), antes e depois, em cinco vistas: diferença RMS de 0,17% a 0,27%; o efeito continua presente (0,65% a 0,87% em relação ao AO desligado).

Diferença de comportamento: o passe antigo excluía objetos transparentes e auxiliares de edição. Rótulos, gizmos e indicadores de luz não escrevem profundidade e continuam fora; vidro translúcido também. Tokens de imagem com recorte por alfa escrevem profundidade onde são opacos e passam a participar da oclusão.

Tempo de quadro na RX 580 (p50, primeira câmera, carga média da máquina 2–3):

| Cena | Chamadas antes → agora | 9 de outubro | Agora |
| --- | --- | --- | --- |
| Backrooms · O salão amarelo | 1 611 → 808 | 14,5–17,5 ms | 9,4 ms |
| Casa · Chegada pelo jardim | 1 179 → 602 | 12,9–15,7 ms | 10,2 ms |
| Igreja · sobre o desfiladeiro | 1 787 → 933 | 22,8–26,7 ms | 17,4 ms |
| Montanha · Subida, caverna e ponte | 167 → 167 | 3,5–4,0 ms | 3,6 ms |

Desde a primeira medição no hardware: Backrooms 26,6 → 9,4 ms, Casa 21,0 → 10,2 ms, Igreja 37,1 → 17,4 ms. Backrooms e Casa ficam em torno de 100 quadros por segundo em movimento; a Igreja em torno de 57 na vista externa e na nave.
