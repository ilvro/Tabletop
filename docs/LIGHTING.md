# Iluminação e imersão avançada

Implementado em 3 de outubro de 2026; validação final concluída em 4 de outubro. As configurações pertencem ao `look` da cena ou ao `defaultLook` do mapa, participam de undo/redo e acompanham o documento salvo, duplicado, exportado em JSON e apresentado. Documentos antigos de schema 2 continuam válidos sem esses campos opcionais.

Para **sol/lua, Kelvin/HSV direto na aba Cena, horários, céu, nuvens, chuva e objetos que acendem à noite**, veja [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Luzes

Em **Construir → Peças avulsas**, escolha **Luz pontual** ou **Luz spot** e clique no piso. A fonte nasce 2,2 m acima do apoio. Selecione a luz no canvas ou na árvore da aba Cena e use o inspetor:

- **Tipo de luz:** pontual, spot ou direcional. A troca conserva ID, posição e os ajustes comuns; cone e penumbra só existem em spot.
- **Luz ligada**, cor, intensidade, alcance e sombras. Alcance zero significa ilimitado nas fontes locais.
- **Temperatura Kelvin:** 1.000–40.000 K, convertida aproximadamente para sRGB e salva com a cor resultante. Editar a cor diretamente desativa Kelvin. Presets de ambiente substituem cor/temperatura apenas da luz principal vinculada.
- **Direção:** Rotação Y e Inclinação em graus, ou gizmo **R**. O spot aponta para baixo com rotação zero. A direção real deriva de um alvo transformado junto da luz. Abertura total de 2–180°; penumbra de 0–1.
- **Cintilação:** padrões Vela/tocha suave e Fluorescente defeituosa, amplitude 0–1, frequência 0,1–20 Hz e seed inteiro. Desmarcar a animação restaura a intensidade base.

Spots também aceitam fixação em parede/teto, seleção em composição, cópia e polish. A inclinação editada após fixar fica relativa ao host e acompanha seu movimento/rotação. A conversão de uma fonte fixada para direcional exige soltá-la antes.

Sombras são opcionais por fonte, com mapas de 1.024 pixels. Sombras pontuais exigem seis vistas; prefira poucos focos com sombra e fontes decorativas sem sombra. Cintilação altera a intensidade e conserva o mapa de oclusão até uma mudança espacial. Luz sem sombra pode atravessar paredes.

## Atmosfera

Na aba **Cena → Atmosfera e efeitos**, abra o controle correspondente:

| Efeito | Parâmetros e comportamento |
| --- | --- |
| Névoa de distância | Linear por início/fim em metros ou exponencial por densidade, com cor e ativação. O fim deve ser maior que o início. |
| Névoa volumétrica por altura | Camada horizontal definida por altura base, espessura vertical, densidade, cor e distância máxima. Integra a extensão do raio dentro da camada até a primeira superfície opaca, nas câmeras perspectiva e superior. |
| Bloom | Halo para regiões acima do limiar de brilho linear, força e raio de 0–1. Desligado por padrão; o limiar inicial 1 favorece fontes brilhantes. |
| Pausar efeitos animados | Congela o relógio visual desta janela. Retomar conserva a fase; o documento guarda apenas a configuração e o estado de pausa. |

Comece com densidade baixa e avalie os personagens e passagens no enquadramento escolhido. A névoa pode ser colorida independentemente do fundo; aplicar um preset de ambiente preserva os ajustes locais de atmosfera e as fontes locais.

## Apresentação e custo

O projetor recebe as configurações filtradas, com fontes privadas excluídas. Editar atmosfera não publica a câmera de trabalho nem reinicia a transição publicada.

**Volume, bloom, clima e nuvens nesta janela** (incluindo partículas locais de fogo/fumaça) desliga esses efeitos só no viewport atual. No projetor, o botão de luz ao lado de Tela cheia oferece o mesmo controle. Cada janela conserva sua escolha durante atualizações da cena; isso não altera o documento nem é salvo como qualidade da cena. O fog de distância continua disponível.

O pipeline opcional cria buffers somente quando necessário, limita-os a um pixel físico por pixel CSS, usa bloom com mips reduzidos e libera os recursos ao desligar os efeitos ou destruir o viewport. A saída usa `OutputPass` para uma única conversão de cor/tone mapping. Cenas estáticas renderizam sob demanda; cintilação, nuvens e partículas visíveis/ativas ou movimento de câmera mantêm frames. Abas ocultas interrompem a animação, e a preferência de movimento reduzido pausa os efeitos animados. O relógio visual é local a cada viewport e não sincroniza música nem garante fases idênticas entre janelas.

## Limites e validação

A volumetria entregue é uma camada homogênea com integração analítica e cor constante. Não calcula feixes de luz, espalhamento por fonte, sombras dentro da névoa, densidade variável, fluidos ou simulação física de fumaça. Fogo/fumaça visual vinculados a objetos estão disponíveis em [MATERIALS.md](MATERIALS.md). Superfícies transparentes que não escrevem profundidade não limitam a camada. Fog e escuridão não implementam fog of war ou sigilo.

Não há benchmark presencial de GPU, notebook, projetor ou Jukebox simultâneo. O bloom é opcional e o controle local permite avaliar seu custo antes de usá-lo na sessão.

Validação automatizada: comandos e rejeição atômica de configurações inválidas; Kelvin/cor e undo/redo; padrões determinísticos; transformação do alvo spot; direção relativa ao socket; regeneração de receitas preservando efeitos; conversão mapa/cena e projeção filtrada. O E2E verifica edição real, animação sem alterar histórico, pausa/movimento reduzido, descarte de buffers, projetor independente e reabertura após reinício. Uma segunda verificação WebGL compara pixels para profundidade, câmeras, limite do volume e limiar de bloom.
