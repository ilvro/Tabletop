# Ambientes, horários e clima

Implementado em 4 de outubro de 2026. Abra **Cena**: os presets e os controles de sol/lua ficam diretamente nessa aba. Complementa [LIGHTING.md](LIGHTING.md) e [CAMERA.md](CAMERA.md).

## Preparar uma cena

Clique em **Dia**, **Tarde**, **Noite**, **Neblina**, **Chuva**, **Pântano**, **Calor** ou **Estúdio neutro**. Cada preset troca luz principal, preenchimento, exposição, céu, clima, névoa e bloom. Objetos, posições, tokens, luzes locais, ajustes de materiais e câmeras são preservados. Uma luz principal bloqueada exige desbloqueio antes da troca.

**Prévia** experimenta a atmosfera no editor e apresenta as configurações afetadas, janelas/vínculos e luzes locais preservadas. **Cancelar** restaura a aparência; **Aplicar ambiente** aceita em uma entrada do histórico. A prévia não altera o documento nem transmite o look ao projetor. Uma edição da cena cancela a prévia obsoleta.

As imagens fornecidas pelo mestre orientaram a tarde alaranjada e a noite azul com lua/janelas acesas. Não há reprodução dos assets nem suposição sobre o código da ferramenta de referência.

## Sol, lua, cores e céu

Em **Sol / lua e cor da luz**, ajuste intensidade, temperatura Kelvin, cor e matiz/saturação/brilho (**HSV**), exposição e preenchimento. Kelvin armazena uma cor sRGB aproximada; editar cor ou HSV desliga Kelvin. Brilho HSV é o brilho da cor; intensidade é a força emitida pela fonte. **Direção e sombras** contém altitude e direção horizontal da luz principal. O disco celeste acompanha essa direção.

**Horário da cena** determina sol/lua, estrelas e vínculos de objetos. Para mudar o conjunto completo de cores/intensidades, use o preset correspondente. Alterar somente o horário preserva seus ajustes artísticos de iluminação.

Em **Céu e nuvens**, ajuste gradiente de céu/horizonte, disco de sol/lua, estrelas noturnas e nuvens: cor, cobertura, opacidade, velocidade, escala e seed. O céu é procedural, com textura aproximada da lua. Não é um mapa HDR de reflexos nem uma simulação astronômica. Desligar o céu revela a cor de fundo. **Enquadrar sol / lua** aponta a câmera de trabalho para o astro, sem publicar no projetor; **Enquadrar mapa** retorna ao mapa. A órbita permite olhar acima do horizonte. O horizonte aparece quando a câmera olha acima do chão; a vista superior continua mostrando o mapa.

## Chuva e partículas

Em **Clima e partículas**, escolha chuva, poeira, brasas ou fumaça suave. Ajuste quantidade, cor, opacidade, tamanho e velocidade. **Região, vento e seed** define centro X/Z, altura base Y, largura/altura/profundidade e vento horizontal.

Cada janela usa um emissor com até 3.000 partículas, em uma única geometria: segmentos para chuva e pontos suaves para os demais efeitos. O padrão inicial é determinístico pela seed e o movimento é calculado pelo tempo; não grava frames no histórico. A região permanece nas coordenadas da cena e não segue a câmera.

**Pausar efeitos animados**, movimento reduzido do navegador e abas ocultas pausam nuvens, clima e flicker. **Volume, bloom, clima e nuvens nesta janela** reduz o custo localmente, preservando céu, luzes e névoa de distância. O projetor tem seu próprio botão de qualidade. Recursos do emissor/céu são descartados ao trocar a configuração ou fechar a janela.

Chuva não colide com telhados e paredes: configure a região nas áreas externas. Fumaça é um efeito de pontos suaves, sem fluidos, colisão ou sombras volumétricas. Há um emissor global de clima por cena e emissores locais de fogo/fumaça vinculados a objetos ([MATERIALS.md](MATERIALS.md)); múltiplas regiões de chuva/poeira/brasas e colisão continuam como extensão. Benchmark no notebook/projetor real permanece pendente.

## Objetos que acendem à noite

**Acender janelas de vidro à noite** controla globalmente as janelas paramétricas de vidro, com cor e intensidade emissiva. Molduras, barras e vãos vazios não acendem.

Para um prédio/prop importado, selecione o objeto e abra **Reagir ao horário · dia / noite** no inspetor. Ative o vínculo, escolha noite, dia/tarde ou todos os horários, e selecione o material das janelas pelo nome/slot do modelo. Defina a cor e o brilho quando aceso. **Todos os materiais** ilumina toda a instância; escolha um material específico para deixar paredes intactas. Se janelas e paredes compartilham o mesmo material, separe-os no modelo para controlar somente as janelas.

Luzes pontuais, spots e direcionais podem ligar apenas de dia ou à noite pelo mesmo painel; suas intensidades/cores continuam nos controles de iluminação. O vínculo respeita o estado ligado/desligado da fonte.

Os vínculos pertencem à instância na cena e não modificam assets compartilhados. Ajustes explícitos de material da cena têm precedência. Remover um vínculo individual de janela restaura a regra global; deixar o vínculo individual desativado suprime essa regra para a janela. Emissão deixa o material luminoso e pode produzir bloom; para iluminar os arredores, use também uma fonte de luz.

## Meus ambientes

Abra **Meus ambientes → Salvar atmosfera como novo ambiente**. A biblioteca persiste no servidor local em `data/environments/`, com validação, revisões, conflitos e backups. Selecione um ambiente para aplicar, experimentar, atualizar com a aparência atual ou excluir.

Um `EnvironmentDocument` de schema 2 guarda somente aparência global e parâmetros independentes da luz principal. Geometria, tokens, assets, câmeras, ajustes locais e vínculos por objeto continuam no mapa/cena. O carregamento de JSON da mesa aceita mapas/cenas e rejeita um arquivo de ambiente sem substituir o trabalho aberto. Ao aplicar, a cena recebe uma cópia concreta e registra ID/revisão de origem; atualizar/excluir a biblioteca não altera cenas anteriores. A duplicação de cenas, andares, objetos e composições conserva os vínculos com os IDs correspondentes. Dados privados continuam filtrados da apresentação.

## Verificação

Testes protegem conversão HSV, presets/snapshots, cores manuais de documentos antigos, bloqueios, histórico, vínculos/duplicação/projeção, validação e geometria determinística. O servidor verifica CRUD, concorrência, revisão, backups e reinício. Os roteiros de navegador verificam controles visíveis, materiais por slot, instâncias independentes, dia/noite, pausa/qualidade, biblioteca/prévia, reinício e câmera publicada independente. Um teste WebGL verifica pixels de sol/lua, nuvens animadas e chuva, além de descarte de geometrias.

Validação final: Build de produção, 118 testes unitários/de integração e os 12 roteiros E2E verificados com sucesso. Após corrigir o encerramento da órbita durante animação contínua, os roteiros de câmera, autoria e ambientes foram repetidos e passaram. Execução em Chromium headless com WebGL por software; avaliação presencial no notebook/projetor continua pendente.

## Materiais e efeitos por objeto

Texturas de madeira/pedra/grama/metal/areia e outras superfícies, pintura de texturas no terreno e emissores locais de fogo/fumaça estão disponíveis no inspetor e em Construir. Compartilham pausa/qualidade por janela com a atmosfera, e acompanham o objeto independentemente do preset de horário. Veja [MATERIALS.md](MATERIALS.md).
