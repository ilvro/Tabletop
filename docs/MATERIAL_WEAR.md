# Desgaste aplicado ao material

Implementado em 6 de outubro de 2026. A instância recebe uma camada procedural configurável sobre seu material; nenhum asset de mancha precisa ser colocado. Funciona em props/GLBs com materiais PBR compatíveis, pisos, paredes, acessos e material base do terreno. Não modifica o modelo compartilhado.

## Uso

1. Selecione o objeto e abra **Propriedades → Material → Desgaste do material**.
2. Em modelos com vários materiais, escolha primeiro **Aplicar acabamento em**: madeira, ferro, pedra ou outro slot. **Todos os materiais** aplica a camada em toda a instância.
3. Escolha **Sujeira e escorrimentos**, **Ferrugem**, **Musgo**, **Fuligem** ou **Rachaduras aparentes**.
4. Ajuste intensidade e tamanho das manchas. Em **Onde aplicar**, escolha peça inteira, base, topo ou região localizada.
5. A região usa centro X/Y/Z em porcentagem dos limites locais do modelo, raio e suavidade. O volume é elipsoidal nas dimensões do objeto; pode atingir mais de uma face e não cria uma imagem plana colada à parede.
6. Em **Cor, acabamento e variação**, ajuste cor, rugosidade, metalicidade, microrelevo e seed. Trocar o estilo conserva intensidade, posição, escala e seed, aplicando o acabamento inicial do novo estilo.

**Desgaste ligado** permite comparar preservando os valores; intensidade zero também desliga o shader da camada. **Sem desgaste** remove a configuração; desfazer recupera. Copiar/colar material e o conta-gotas transportam a camada junto dos outros ajustes, respeitando o slot do destino. Camadas pintadas do terreno recebem somente seus campos compatíveis, sem transportar desgaste; selecione o material **base** para usar a feature no terreno. Histórico, duplicação, mapa/cena, JSON, salvamento e projetor conservam a configuração.

O tamanho usa metros do modelo antes da escala da instância. Mover/girar o objeto ou seu grupo mantém o padrão preso à peça; escalar também amplia/reduz as manchas. A posição relativa da região é recalculada sobre os limites da geometria se o modelo for substituído ou esculpido. Não há marcas persistidas por triângulo.

## Composição e limites

A camada altera cor, rugosidade, metalicidade, brilho emissivo e normal aparente depois da textura original/cobertura. Mantém mapas UV, normais e acabamento de modelos importados enquanto nenhuma textura substituta for escolhida. Texturas procedurais do Tabletop também podem receber desgaste. A cobertura visual é composta antes do desgaste; neve física continua sendo uma malha de depósito separada.

Há **uma camada por material da instância**, aplicada ao slot escolhido. Não é possível configurar estilos independentes em vários slots da mesma instância simultaneamente por este painel. Materiais originais, partes rompidas e desgaste fixo de uma receita continuam existindo sob essa camada.

Rachaduras e microrelevo são alterações de iluminação: não criam buracos, lascas, volumes, colisões ou novos apoios. O musgo não cria vegetação geométrica. Base/topo usam altura local, sem simular chuva, gravidade após inclinar a peça, curvatura ou acúmulo em cavidades. Em superfícies perfeitamente planas sem extensão vertical, ambos abrangem a superfície; eixos sem extensão usam o centro da região. A distribuição é procedural e não identifica semanticamente onde há metal ou umidade; selecione o slot apropriado.

Pintura livre com pincel, múltiplas manchas independentes, símbolos/imagens enviados pelo usuário, histórico de danos físicos e máscaras por triângulo permanecem extensões futuras. Água líquida usa shader próprio e não oferece o painel; gelo sólido aceita. Materiais incompatíveis com `MeshStandardMaterial`/`MeshPhysicalMaterial`, como materiais sem iluminação personalizados, não recebem a camada.

## Implementação e validação

[`domain/wear.js`](../src/domain/wear.js) define estilos, valores iniciais e edição de porcentagens; a validação exige enums, cores e limites finitos. `material.wear` é opcional; ausência/null não muda documentos antigos. Tipos são `grime`, `rust`, `moss`, `scorch`, `cracks`; distribuição `all`, `base`, `top`, `region`. Seed inteira 0–65.535; tamanho 0,05–50; intensidade/rugosidade/metalicidade 0–1; microrelevo 0–0,1 m; centro 0–1 por eixo; raio 0,01–2; suavidade 0,01–1. Desgaste não é aceito nos overrides parciais legados de `look.materialAdjustments`.

[`render/material-wear.js`](../src/render/material-wear.js) compõe o shader PBR existente com coordenadas relativas ao objeto. Todos os estilos compartilham programa com uniforms; não há atlas, textura extra, mesh ou passe dedicado. O custo é cálculo por fragmento dos materiais selecionados. A atualização normal ainda reinstala materiais pelo fluxo atual de `setDocument`; otimização incremental é parte do [plano de iluminação](DYNAMIC_LIGHTING_PLAN.md).

Testes de domínio protegem compatibilidade, faixas, slots, mapas importados, transformação, transferência, bloqueios, histórico e projeção filtrada. O teste WebGL compara pixels dos cinco estilos, região confinada, slot preservado, intensidade zero/desativação, composição com textura/cobertura, superfícies perfeitamente planas e liberação de recursos. Os roteiros de servidor/Pages verificam controles reais, mudança de estilo, copiar/colar, undo/redo, salvar/reabrir, tela estreita e câmera independente do projetor. Capturas: `test-results/material-wear-sheet.png`, `material-wear-assets.png` (pilar, mesa e Dama de Ferro antes/depois) e `material-wear-{server,pages}{,-mobile}.png`. Execução e resultados finais em [progress.md](../progress.md); testes por software não estabelecem orçamento de FPS no equipamento da mesa.
