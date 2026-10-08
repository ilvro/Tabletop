# Plano de cenas padrão completas

Proposta de 7 de outubro de 2026. Atualizado em 8 de outubro: o piloto **Casa de bairro** foi construído; os outros sete locais continuam planejados. [Entrega e uso](CASA_DE_BAIRRO.md). Referências: [arquitetura](ARCHITECTURE.md), [autoria](MAP_AUTHORING.md), [objetivo visual](VISUAL_TARGET.md), [iluminação](DYNAMIC_LIGHTING.md) e [desempenho](PERFORMANCE_PLAN.md).

## Objetivo

Abrir uma cena padrão deve entregar um lugar reconhecível, utilizável em uma sessão e inteiramente editável. O mestre escolhe o cenário, posiciona seus personagens e pode apresentar. Não precisa completar o prédio, fabricar pisos de apoio, arrumar portas obstruídas ou escolher uma imagem de capa.

O catálogo inicial deve atender investigação e horror contemporâneo, com locais cotidianos que também sirvam a outras campanhas. A atmosfera pode variar sem transformar todos os lugares em templos ou salas de teste de luz. As medidas são propostas de autoria em metros, sujeitas à revisão da planta.

## Situação atual e destino dos exemplos

| Conteúdo atual | Avaliação | Destino proposto |
| --- | --- | --- |
| Igreja Antiga | Cena extensa, com nave, anexos, galerias e exterior; cobertura manual e campanário cenográfico documentados. | Manter como cenário especial; revisar circulação, apoios, materiais e enquadramentos com a régua de aceitação abaixo. |
| Subida da montanha | Trajeto completo com caverna, ponte e ruínas; limites de terreno/apoio documentados. | Manter como cenário natural; conferir rota de tokens e vistas de sessão. |
| Passagem de Inverno | Exemplo antigo de ponte e torre. | Removido da galeria e dos arquivos públicos em 8 de outubro, a pedido do usuário. Cópias pessoais preservadas. |
| Capela, taverna, escritório e rua de iluminação | Estudos técnicos úteis para validar fontes, zonas e materiais; não representam locais completos. | Transferidos para `tests/fixtures/scenes/` em 8 de outubro; fora da galeria e dos builds. Testes e ferramentas de diagnóstico preservados. |

A separação da galeria foi concluída junto com a casa; a galeria inclui casa, igreja e montanha. Backrooms foi acrescentada posteriormente a pedido do usuário, como cena temática adicional ([uso](BACKROOMS.md)). A correção das capas já foi implementada: os exemplos usam seus JSONs e o renderizador do Tabletop, assim como cenas pessoais; não dependem de JPGs distribuídos.

## Primeira coleção

| Prioridade / cena | Escopo da planta | Conteúdo obrigatório e possibilidades de sessão |
| --- | --- | --- |
| P1 · Casa de bairro — entregue | Lote aproximado de 24 × 30 m; térreo, quintal e garagem. | Sala, cozinha, banheiro, dois quartos, área de serviço, muros e entradas frontal/lateral. Mobiliário com uso coerente, circulação entre cômodos, cortinas e objetos pessoais. Investigação doméstica, busca e encontro social. |
| P1 · Escritório e arquivo | Andar de aproximadamente 26 × 20 m, com acesso comum. | Recepção, sala de trabalho, reunião, arquivo, copa e sanitários; mesas/cadeiras, armários, computadores e documentos como props. Corredores legíveis e duas rotas de circulação quando a planta permitir. Investigação e infiltração. Substitui o estudo fluorescente como exemplo de local completo. |
| P1 · Armazém e doca | Lote de aproximadamente 36 × 30 m; galpão com pequeno escritório. | Carga/descarga, corredores entre estantes, estoque, escritório, sanitário e pátio; caixas/paletes/carrinho, portas de serviço e acesso de carga. Áreas abertas, cobertura visual e rotas alternativas. |
| P2 · Bar ou taverna | Aproximadamente 22 × 18 m, mais acesso externo. | Salão, balcão, cozinha, depósito e sanitários; mesas em arranjo utilizável, louças, barris/garrafas e área de atendimento. Conversa, investigação e conflito sem mobiliário bloqueando todas as passagens. Tema contemporâneo inicial; variante histórica só se houver conteúdo próprio. |
| P2 · Clínica pequena | Aproximadamente 28 × 22 m, um andar completo. | Espera, recepção, dois consultórios, enfermaria, estoque e sanitários. Macas, armários, instrumentos e sinalização sem dados reais de pacientes. Investigações e resgate; não apresentar corredores vazios como hospital completo. |
| P2 · Rua com comércio | Quadra recortada de aproximadamente 50 × 35 m. | Calçadas, cruzamento/acesso lateral, fachadas e uma loja realmente acessível; caixa, prateleiras e depósito. Demais fachadas identificadas como cenário de fundo. Poste, lixeira, vegetação e objetos urbanos em contato com o chão. |
| P3 · Posto policial | Aproximadamente 30 × 24 m. | Recepção, trabalho, entrevista, arquivo de evidências, sanitários e acesso de serviço. Props de investigação e circulação clara. Cela é opcional conforme o escopo definido, sem prometer uma delegacia inteira em um recorte. |
| P3 · Sítio e celeiro | Área jogável aproximada de 60 × 60 m, com horizonte separado. | Casa simples, celeiro, pátio, cerca, poço ou reservatório e caminhos entre edifícios. Relevo moderado, árvores em posições úteis e abrigo acessível. Investigação rural e exploração. |

A coleção tem oito locais novos e dois cenários especiais existentes sujeitos à revisão. Cemitério, estação e fábrica abandonada ficam para uma expansão depois da aceitação da primeira coleção. A fábrica exige kit e composição próprios; não será um armazém com a luz recolorida.

## Contrato de cada entrega

Cada cena deve conter uma planta que faça sentido para o lugar, com pelo menos uma sequência de espaços conectados e um objetivo espacial claro: chegar a uma sala, atravessar a área, acessar um estoque ou explorar um anexo. As rotas têm largura compatível com a escala dos tokens. Vãos, pisos, escadas e transições são conferidos na geometria real. O editor não oferece colisão/pathfinding completos; a revisão não deve prometer essas funções.

Arquitetura, mobiliário e detalhes têm três camadas de autoria: estrutura funcional, objetos de uso e marcas de ocupação. A última inclui desgaste localizado, ferramentas, papéis, louças, fios ou vegetação conforme o cenário. Evitar repetição uniforme, objetos flutuantes, mesas sem acesso, portas diante de paredes sólidas e excesso de decoração que impeça a leitura da mesa. Materiais e formas seguem o objetivo visual; geometria de teste não é acabamento final.

Todos os elementos são entidades comuns, com pastas por setor e função, nomes úteis, andares/camadas corretos e referências locais válidas. Coberturas ficam em pasta/camada própria para ocultação manual. Somente o horizonte puramente cenográfico pode ficar bloqueado por padrão, com indicação clara. Não depender de links externos para abrir no servidor ou no Pages.

Cada cena inclui de três a cinco enquadramentos úteis: entrada/visão principal, área interna representativa, segundo setor e planta superior; uma vista adicional só quando necessária. A primeira câmera identifica o local e serve à capa dinâmica. Enquadrar o ambiente, sem selecionar um arquivo de imagem. A captura não muda a câmera publicada nem o histórico. A cena deve continuar carregável enquanto sua capa é gerada.

A iluminação revela o espaço e dá identidade ao lugar; fontes correspondem a luminárias, janelas ou emissores existentes. Zonas internas/externas e materiais são revisados em conjunto. Oferecer primeiro uma atmosfera legível. Variações de dia/noite, chuva ou tensão são ambientes reutilizáveis aplicados explicitamente, preservando a geometria; não multiplicar cartões do mesmo mapa só para trocar luzes. Não introduzir scripts de eventos, narrativa obrigatória ou tokens privados em exemplos públicos. Personagens e segredos são adicionados pelo mestre.

## Produção em etapas

1. **Inventário e plantas:** revisar os três exteriores/igreja existentes, desenhar plantas dos oito locais e mapear quais assets atuais servem a cada função. Listar lacunas de silhueta/material e produzir complementos reutilizáveis antes da decoração. Registrar medidas, rotas e fronteira entre área acessível e fundo cenográfico.
2. **Piloto da casa:** montar uma casa inteira com mobiliário, exterior, cobertura removível, luz e câmeras. Fazer uma sessão curta de teste: entrada, deslocamento de tokens, inspeção de cômodos, mudança de vista, ocultação de teto, edição e apresentação. Revisar tanto usabilidade quanto acabamento antes de usar como padrão de produção.
3. **Completar P1:** produzir escritório/arquivo e armazém. Validar interior com várias salas, grande área aberta, vãos, apoio e luz em cenários diferentes. Cada cena passa pelos mesmos critérios do piloto.
4. **Completar P2:** bar, clínica e rua com loja. Compartilhar assets, sem reciclar a planta. Conferir ligação interior/exterior e diferenças de ocupação, materiais e mobiliário.
5. **Completar P3 e revisar especiais:** posto policial e sítio; revisão de igreja/montanha e decisão sobre a ponte. Só publicar no catálogo principal o conteúdo aprovado.
6. **Organizar e entregar o catálogo:** nomes de lugares no grupo principal; estudos técnicos em seção secundária ou apenas nas fixtures. Textos curtos indicam o conteúdo acessível e limites relevantes. Testar catálogo, cópias e cache nos dois modos; atualizar a documentação e registrar as capturas de revisão em `test-results`, fora de `public/scenes`.

Cada etapa entrega JSON editável, complementos de assets necessários, roteiro de revisão e resultados. Geradores determinísticos podem ajudar a manutenção; o usuário final não precisa executá-los. Não fixar prazo antes do inventário e da aprovação visual do piloto.

## Aceitação por cena

| Área | Critério verificável |
| --- | --- |
| Uso imediato | Carregar uma cópia permite iniciar a sessão com tokens, sem reparar estrutura, apoio ou enquadramento. Reabrir o padrão preserva o original. |
| Planta | Portas abrem em vãos reais; rotas e escadas conectam áreas indicadas; pisos de apoio cobrem a área caminhável. Conferir tokens nas transições e a visão superior. |
| Conteúdo | Setores e mobiliário correspondem à função do lugar. Não há objetos de diagnóstico no cenário final. Fundos inacessíveis são descritos como tais. |
| Visual | Revisar entrada, interior e planta no viewport real, incluindo contato com piso, escala, repetição, materiais, luz e teto oculto. Comparar com `VISUAL_TARGET.md`; registrar limitações sem declarar paridade inexistente. |
| Edição | Selecionar e alterar peças representativas, materiais e luzes; ocultar cobertura; undo/redo; salvar, recarregar, duplicar e exportar/importar. |
| Apresentação | Câmera de trabalho e publicada independentes; presets explícitos funcionam; interface, seleção e dados privados não aparecem na projeção/capa. |
| Capa | Gerada do JSON automaticamente, em 480 × 270, sem JPG de cena distribuído ou campo obrigatório de imagem. Conteúdo/asset alterado invalida o cache; biblioteca continua utilizável durante a geração. |
| Persistência | Servidor e Pages abrem referências locais, preservam cópias pessoais e não sobrescrevem o padrão. JSON exportado permanece suficiente para reconstruir a cena. |
| Desempenho | Medir abrir, editar, pincel quando aplicável, capas e editor + projetor no hardware alvo. Conferir biblioteca com 10/50/200 cenas e cache limitado. Contagens de geometria/luzes orientam revisão; não reduzir detalhe ou desligar efeitos automaticamente para aprovar. |

Testes automatizados verificam referências, schema, cópia, persistência e invariantes funcionais. A revisão visual e o teste de sessão continuam obrigatórios: um JSON válido ou uma medição em SwiftShader não aprovam um cenário por si só.
