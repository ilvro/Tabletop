# Régua

Atualizado em 6 de outubro de 2026.

Use o botão **Régua** na barra da cena ou o atalho **M**. Clique na origem, mova o ponteiro para ver a prévia e clique no destino para fixar a medida. Também é possível arrastar da origem ao destino com mouse ou toque. Depois de fixar, outro clique inicia uma nova medição. **Limpar** apaga a medida e mantém a ferramenta; **Esc**, **Q**, **Concluir** ou outra ferramenta encerram.

A linha e os dois marcadores aparecem sobre a cena. O resultado detalhado fica na barra da ferramenta, e um rótulo acompanha o meio da linha durante a navegação da câmera. Em telas estreitas, ativar a régua recolhe os painéis, e o toque mede sem deslocar a câmera nem abrir propriedades.

## Medidas e pontos

As coordenadas do mapa são em metros, com Y para cima. A régua apresenta:

| Valor | Significado |
| --- | --- |
| Plano | Distância euclidiana em XZ, desconsiderando altura. |
| 3D | Distância em linha reta entre os pontos, incluindo altura. |
| Desnível | Altura do destino menos a altura da origem; positivo indica subida. |
| Células (plano) | Distância no plano dividida pelo tamanho atual da célula, sem arredondamento tático. |

Os cálculos conservam a precisão das coordenadas; a interface exibe duas casas decimais. Por exemplo, um deslocamento de 3 m em X e 4 m em Z mede 5 m no plano. Com mais 12 m de altura, mede 13 m em 3D.

Ao apontar para um token, os pontos usam o **centro lógico da base**, independente do formato do retrato, da altura do rótulo e do tamanho da miniatura. Nos demais objetos, usam a superfície visível atingida: piso, plataforma, terreno, escada, rampa, parede ou prop. Fora dos objetos, usam o plano na **altura de construção atual**. Elementos ocultos ou fora do andar isolado não recebem pontos; objetos bloqueados podem ser medidos.

**Encaixar no grid** começa desmarcado e é uma preferência da sessão independente do snap de autoria. Quando marcado, encaixa XZ na origem e no tamanho de célula da cena, preservando a altura atingida. **Alt** permite um ponto livre durante o gesto. Centros de tokens permanecem exatos, inclusive quando não estão alinhados ao grid. Mudar essa opção afeta os próximos pontos.

## Cena e combate

A medição é temporária e pertence à visão do mestre. Não cria entidades nem comandos, não altera seleção, histórico ou estado salvo e não publica a câmera nem a linha para a segunda tela. As capas automáticas excluem a linha e os marcadores. Sair da ferramenta, alterar/recarregar a cena, trocar o andar isolado ou entrar em apresentação apaga a medição. Cancelar a captura de um arraste restaura a última medida confirmada.

Essa base fornece distâncias físicas para uma futura integração de combate. Regras de diagonais, alcance entre bordas de bases, trajetos com vários segmentos, terreno difícil, obstáculos, linha de visão e consumo de movimento dependem do sistema/livro e ainda precisam de implementação própria. A linha atual mede o segmento direto entre os pontos, mesmo quando atravessa uma parede.
