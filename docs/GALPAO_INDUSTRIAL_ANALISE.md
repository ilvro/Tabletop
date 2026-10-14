# Galpão industrial abandonado — análise da referência

Referência: [references/scenes/galpao-industrial.png](references/scenes/galpao-industrial.png). Destino: cena pronta e tutorial guiado de recriação. Análise de 13 de outubro de 2026; nada desta cena foi construído ainda.

## O que a imagem tem

Galpão escuro visto da altura dos olhos. Em primeiro plano, um monitor de tubo ligado ("BOOTING.." e barra de progresso) sobre uma mesa de metal. Uma luminária fluorescente fria no teto, uma luz vermelha ao fundo com reflexo alongado no piso molhado, névoa. Feixes de cabos pendurados em arco por todo o teto, tubulação grossa, faixas amarelo-e-pretas nas paredes, porta industrial com letreiro, barris, mesas, entulho e mato crescendo.

## O que já dá para fazer hoje

| Elemento | Como |
| --- | --- |
| Casca do galpão, pé-direito alto | Sala por medidas ou contorno; paredes e teto em concreto/tijolo |
| Contraste azul frio × vermelho | Duas fontes locais com cor própria; ambiente "Horror ritual" como partida |
| Fluorescente falhando | Modelo `backrooms-fluorescent` + cintilação "Fluorescente defeituosa" |
| Névoa com luz | Névoa volumétrica e névoa iluminada (até 4 fontes) |
| Brilho das fontes | Bloom |
| Sujeira, ferrugem, musgo | Desgaste aplicado ao material |
| Monitor, mesa, barris, caixas, válvula, gerador, quadro de força, armário, correntes, mato | Modelos existentes (`crt-tv`, `workbench`, `barrel`, `crate`, `pipe-valve`, `generator`, `power-panel`, `locker`, `chains`, `dry-grass`, `house-plant`) |
| Câmera baixa em primeira pessoa | Câmera livre e enquadramento salvo |

Com isso sai um galpão escuro reconhecível, mas não a imagem: faltam justamente as peças que dão a identidade dela.

## O que falta

**Modelos (o grosso do trabalho)**

1. **Cabos pendentes**: feixes em catenária entre dois pontos do teto. É o elemento mais marcante e não existe nada parecido. Ideal: peça paramétrica (dois pontos, folga, quantidade de fios), não modelo fixo.
2. **Tubulação industrial**: trechos retos, curvas, flanges e suportes, para montar linhas no teto e nas paredes. Hoje só há a válvula.
3. **Faixa de segurança amarelo-e-preta**: rodameio de parede e fita. Pode ser um material novo ("listras de alerta") aplicado a uma faixa.
4. **Porta industrial** de duas folhas, com batente pesado.
5. **Vegetação invasora**: trepadeira pendente do teto e tufos nascendo do piso.
6. **Entulho**: placas de piso soltas, pedaços de concreto, papel.
7. **Mesa e estante de metal** em tubo, mais leves que a bancada atual.

**Técnico**

8. **Tela com conteúdo**: o monitor precisa mostrar texto e barra de progresso, emitir luz e, de preferência, animar. Hoje um objeto pode ser emissivo, mas não há como pôr uma imagem ou texto numa tela.
9. **Letreiro / decalque**: texto ou imagem colada na parede e na carcaça do monitor. Não há decalques.
10. **Piso molhado**: o reflexo vermelho alongado pede um acabamento de piso úmido (rugosidade baixa com variação) em ladrilho. Os reflexos atuais são do ambiente, não refletem os objetos nem as luzes da sala como espelho; o brilho especular das fontes pontuais chega perto, um reflexo de tela (SSR) chegaria ao resultado da referência.
11. **Brilho de lente**: o risco horizontal na luz vermelha. O bloom dá o halo, não o risco anamórfico.
12. **Faíscas / água espirrando** junto ao monitor: os efeitos locais atuais são chama e fumaça.

## Ordem sugerida

1. Kit industrial de modelos (itens 2 a 7) pelo mesmo caminho das bibliotecas medieval e futurista.
2. Cabos paramétricos (item 1).
3. Tela com conteúdo e decalques (itens 8 e 9), que servem a qualquer cena.
4. Piso molhado (item 10), depois brilho de lente e faíscas (11 e 12), que são acabamento.
5. Montar a cena, comparar com a referência lado a lado, e só então escrever o tutorial de recriação.

Sem os itens 1, 2, 3 e 8 a cena não se parece com a referência. Os itens 10 a 12 separam "parecido" de "tão bom quanto".
