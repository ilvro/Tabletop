# Leitura tática

Recursos de sessão inspirados em Baldur's Gate 3, para mostrar com clareza onde cada um está e o que pode fazer sem perder o clima da cena. Plano e ordem: [PLANO_TATICO_BG3.md](PLANO_TATICO_BG3.md). Andamento: [progress.md](../progress.md).

## Paredes que se abrem e silhuetas

Em **Ambiente → Iluminação dinâmica e qualidade**:

- **Abrir paredes em volta dos personagens:** paredes, telhados, forros de andares acima e objetos com mais de 1,4 m que ficam entre a câmera e um personagem se abrem num círculo pontilhado em volta dele, do pé à cabeça. Só abre o que está na frente; o resto da cena continua inteiro. As sombras não mudam.
- **Silhueta de personagens atrás de obstáculos:** quem fica atrás de algo aparece por cima dele como silhueta translúcida na cor do personagem (o recorte da figura, ou a base para tokens sem retrato).

As duas opções ficam na cena (`look.rendering.occlusion`, `look.rendering.silhouettes`) e valem em cada janela, inclusive no projetor, com a câmera daquela janela. No editor, convivem com **Ver interior**, que continua tirando as paredes voltadas para a câmera.

Limites: até 8 personagens por quadro; o círculo tem 1,2 m de raio em volta do meio do corpo.
