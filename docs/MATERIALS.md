# Materiais texturizados, fogo e fumaça

Implementação em 4 de outubro de 2026. As configurações acompanham mapas/cenas, histórico, duplicação, JSON, salvamento e apresentação. Documentos antigos continuam válidos; nenhum material é aplicado automaticamente a construções antigas.

## Aplicar uma textura

Selecione piso, parede, porta, janela, escada, rampa, terreno ou objeto. No inspetor, abra **Material e textura** e escolha madeira, pedra, grama, metal, areia, tijolo, concreto ou lama.

A escolha aplica a cor branca de matiz e o acabamento inicial do material. Depois ajuste:

- **Tamanho do padrão · m:** tamanho de uma repetição. Menor produz detalhes menores; maior amplia o padrão.
- **Relevo aparente · m:** intensidade do detalhe na iluminação, sem alterar geometria, colisão ou apoio.
- **Cor / matiz**, **Rugosidade** e **Metalicidade:** personalizam o acabamento. A textura já possui variação local de rugosidade.
- Em objetos da biblioteca/GLB, **Aplicar acabamento em** permite escolher um material nomeado, como `wood`, conservando textura, cor e acabamento dos outros. **Todos os materiais** aplica a textura ao conjunto.

**Sem textura adicional** remove a substituição e volta a usar os mapas originais de um GLB, conservando seus ajustes de cor/rugosidade/metalicidade. Documentos e assets compartilhados não são modificados por outra instância.

As oito texturas são procedurais originais, geradas localmente, com cor, altura e rugosidade. Não dependem de internet ou downloads. São um primeiro acervo de superfícies; modelos detalhados e materiais fotográficos específicos continuam úteis para aproximar as referências.

## Pintar materiais no terreno

Selecione o terreno e use **Camadas de cor e textura** no topo do inspetor:

1. Escolha a camada e abra **Editar material e propriedades**.
2. Selecione a textura e o tamanho do padrão. Escolher uma textura reinicia a matiz da camada para branco, preservando a área pintada.
3. Para uma segunda superfície, use **Nova camada de material**, escolha outra textura e use **Pintar camada** com o pincel sobre o terreno.
4. **Apagar** revela as camadas de baixo. Opacidade, visibilidade e ordem continuam disponíveis; a última camada cobre as anteriores.

Até oito camadas podem misturar cores e texturas. As máscaras continuam acompanhando a malha ao esculpir ou alterar sua resolução. Um traço é uma operação de desfazer; Esc cancela. O relevo aparente e a rugosidade geral ficam em **Material e textura**. A textura geral serve de base para as camadas; camadas só de cor podem colori-la.

## Colocar fogo e fumaça

Em **Construir → Peças avulsas**, escolha **Fogueira** ou **Fumaça** e clique na superfície de apoio ativa. Selecionar um piso/terreno muda esse apoio; clique dentro dele ou escolha outro em **Estruturas e apoio**.

A fogueira usa o modelo existente de troncos/pedras com chamas animadas e luz pontual cintilante. Fumaça cria um emissor sem modelo visível. Também é possível selecionar qualquer objeto e escolher **Fogo e fumaça → Efeito neste objeto**.

O inspetor controla largura/altura/profundidade, deslocamento local, quantidade de partículas, velocidade, opacidade, cor e seed. O fogo tem **Intensidade da luz do fogo**; zero desliga sua luz. **Ocultar modelo** permite usar apenas o efeito. **Sem efeito** desativa a emissão.

O efeito acompanha posição, rotação, escala, apoio e composição do objeto. Duplicar cria outra instância com a configuração copiada. A seed conserva a variação, e a animação não grava frames no documento/histórico.

Na aba **Cena**, **Pausar efeitos animados** congela os efeitos. Movimento reduzido também pausa, e abas ocultas suspendem os frames. O controle de qualidade de volume/bloom/clima nesta janela também desliga as partículas locais; a luz do fogo permanece estática. A escolha de qualidade é independente no projetor e não edita o mapa.

## Dados, renderização e limites

- `material.texture` guarda um ID local ou `none`; `textureSize` aceita 0,05–50 m, `relief` 0–0,2 m e `textureSlot` identifica o material do objeto. A validação aceita esses campos opcionais e rejeita IDs/valores inválidos.
- Camadas do terreno aceitam `texture`/`textureSize` além de suas cores e máscaras. Misturam cor, altura aparente e rugosidade na renderização.
- As superfícies usam projeção em três eixos e escala em coordenadas mundiais. Isso evita esticar texturas em paredes e terrenos sem UV, mas mover objetos pode deslocar o padrão sobre eles. Texturas autorais com UV continuam disponíveis no GLB original.
- Cada viewport possui duas texturas compartilhadas do acervo, geradas sob demanda e liberadas ao destruir a janela. Edição não cria uma cópia das imagens para cada objeto.
- `prop.localEffect` persiste configuração e deslocamento do emissor. O limite é 512 partículas por emissor, 32 emissores ativos e 4.096 partículas locais por documento. Emissores desativados não alocam partículas no viewport. O clima global conserva seu limite independente.
- Partículas são planos voltados para a câmera, desenhados em lote por emissor, com turbulência, expansão/desvanecimento da fumaça e cor de chama variando durante a vida. São efeitos visuais, sem simulação de fluidos, propagação de incêndio, colisão com tetos/paredes ou sombras volumétricas.
- A luz do fogo não projeta sombras próprias e pode atravessar paredes. Luzes pontuais/spot com sombra podem ser adicionadas separadamente quando necessário.

Modelos fotográficos, upload de texturas avulsas/variantes da biblioteca, decals, vegetação distribuída, poças/reflexos e benchmark presencial seguem como evolução. Uso de iluminação e ambiente: [LIGHTING.md](LIGHTING.md) e [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Validação

Os testes de domínio cobrem rejeição atômica, histórico, duplicação/mapas, filtragem de emissores privados, máscaras/reamostragem do terreno, isolamento por material, seeds e descarte. Os testes de navegador cobrem controles reais, colocação, pausa/qualidade, reabertura e projetor independente. A verificação WebGL compara pixels dos oito materiais, terreno misturado e fogo/fumaça animados, e verifica a liberação das texturas do acervo.

Os resultados finais desta implementação são registrados em [progress.md](../progress.md). Captura do fluxo: `test-results/materials-fire-smoke.png`. Chromium com WebGL por software não representa benchmark no notebook/projetor.
