# Tabletop — imersão e apresentação

Data: 3 de outubro de 2026. Pesquisa e proposta da Fase 2; nenhuma cena, efeito ou integração foi implementado. [Arquitetura](ARCHITECTURE.md), [autoria](MAP_AUTHORING.md) e [roadmap](ROADMAP.md) completam esta especificação.

## 1. Filosofia visual

Imersão é parte do produto desde o primeiro slice. A cena deve comunicar escala, uso do espaço, atmosfera e posição dos personagens, além de representar geometria. Um hospital é reconhecido por materiais, mobiliário, proporções e luz; noite, emergência e abandono mudam sua leitura.

A referência de Ordem orienta apresentação de mesa 3D; Baldur's Gate orienta composição, escala e atmosfera. Essas referências não definem fidelidade gráfica garantida nem exigem um RPG completo, simulação de combate ou exploração cinematográfica contínua.

Priorizar ganho perceptível por custo: escala consistente, composição, materiais coerentes, luz principal/preenchimento, contato com o chão e câmera preparada. Efeitos complementam essa base. Todas as luzes, presets e resultados automáticos precisam de controle manual.

O usuário prevê notebook intermediário com GPU e provavelmente projetor. O mestre controla a cena; interação por celulares no Wi-Fi é opcional. Portanto, legibilidade à distância e facilidade de condução são critérios tão relevantes quanto a imagem no monitor de edição.

## 2. Tabletop de Ordem: evidências e limites

### 2.1. Informação publicada oficialmente

Em julho de 2025, Cellbit anunciou um tabletop interno para substituir dificuldades do uso anterior do Tabletop Simulator e acompanhar uma temporada com muitos mapas 3D. A publicação não descreve engine, protocolo, formato de documentos ou pipeline. [Newsletter oficial](https://ordemparanormal.com.br/newsletter/julho-2025).

A Jambô, em 28 de outubro de 2025, avaliou que a ferramenta favorecia enquadramentos imersivos e clareza das ações. Essa é uma apreciação publicada sobre apresentação, sem especificação técnica. [Impressões de Hexatombe](https://blog.jamboeditora.com.br/hexatombe-primeiras-impressoes-do-primeiro-episodio/).

Também foi localizado o vídeo oficial [REVELANDO — HEXATOMBE](https://www.youtube.com/watch?v=LVBZay042_c), publicado em 1º de fevereiro de 2026, cuja descrição anuncia bastidores e artes. Nesta etapa foi possível consultar metadados, não assistir/analisar a sequência completa; ele não sustenta afirmações técnicas aqui. A [newsletter de fevereiro de 2026](https://ordemparanormal.com.br/newsletter/fevereiro-2026) confirma a existência desse material de produção, sem detalhar a implementação do tabletop.

### 2.2. Comportamento visual observado em imagens

As imagens abaixo foram abertas e inspecionadas visualmente. São amostras estáticas; uma imagem de episódio não demonstra, por si só, qual parte foi renderizada ao vivo.

| Fonte | Observação direta | Limite |
| --- | --- | --- |
| [Imagem oficial de julho de 2025](https://ordemparanormal.com.br/wp-content/uploads/2025/07/image8.jpg) | Miniaturas em alturas diferentes, estrutura com pisos/parede, sombra no chão e árvore “Wall / Floor 1 / Floor 2 / Floor 3”, com ícones de controle. | Não revela a semântica exata dos botões, seleção de apoio ou ocultação por jogador. |
| [Imagem do caixão publicada pela Jambô](https://blog.jamboeditora.com.br/wp-content/uploads/2025/10/image.png) | Objeto central, fundo vermelho, contraste e sombra alongada orientam o olhar. | Não comprova técnica de fog, luz volumétrica ou pipeline de composição. |
| [Imagem de interior publicada pela Jambô](https://blog.jamboeditora.com.br/wp-content/uploads/2025/10/image2.png) | Personagem em primeiro plano, ambiente estreito, detalhes de superfície e fontes aparentes vermelhas criam profundidade. | Não demonstra luz dinâmica, materiais específicos ou custo gráfico. |

### 2.3. Nossa interpretação

Vale combinar uma visão tática legível com enquadramentos de área ou personagem, pisos identificáveis, controle de estruturas que ocultam a ação e atmosferas coerentes. Silhuetas, contraste, materiais e organização dos planos podem comunicar um lugar antes de adicionar muitos efeitos.

Uma sala de terror pode ter um foco visual e passagens legíveis; o mestre escolhe quando mostrar a área completa ou aproximar de um detalhe. No Tabletop, isso se traduz em câmera publicada independente, presets, filtros de apresentação e edição de look.

### 2.4. Hipóteses técnicas e aspectos não demonstrados

Sombras seletivas, fog de distância, emissive, luzes pontuais e billboards são candidatos nossos para efeitos semelhantes no navegador. Não afirmamos que Ordem use essas técnicas. Não foi estabelecido publicamente nas fontes examinadas qual engine usa, como sincroniza jogadores ou como importa seus assets.

Imagens estáticas não permitem avaliar duração/interpolação de transições, comportamento de câmera, flicker, partículas, animação ou interface em operação. Esses itens são requisitos/propostas do nosso produto; não resultados observados nesta pesquisa. Não extrapolar a imagem de desenvolvimento de julho para todos os recursos da versão exibida depois.

## 3. Base técnica de renderização

Manter Three.js r186 como referência inicial, alinhada ao pacote da ficha, com dependências fixadas quando o projeto for criado. O renderer é um adaptador do documento, não o dono da geometria ou do estado da sessão.

WebGL 2 é requisito do renderer escolhido; detectar suporte na abertura e mostrar uma mensagem útil. Essa verificação não mede desempenho, conforme o [guia de compatibilidade](https://threejs.org/manual/pages/webgl-compatibility-check.html).

A revisão do pacote local confirmou os caminhos para luzes, loaders, instancing, LOD e pós-processamento. Há uma incompatibilidade a evitar ao copiar a ficha: `dice3d.js` usa `PCFSoftShadowMap`; o [fonte oficial r186 de WebGLShadowMap](https://github.com/mrdoob/three.js/blob/r186/src/renderers/webgl/WebGLShadowMap.js) avisa que esse modo foi removido e usa PCFShadowMap. Recomendo PCFShadowMap como candidato inicial, sujeito à inspeção no equipamento.

Não exigir WebGPU, TSL ou uma nova engine para o slice. Encapsular renderer e pipeline permite reavaliar tecnologias se o benchmark demonstrar uma limitação concreta.

## 4. Iluminação como ferramenta de autoria

Cada fonte é uma entidade visual serializável em look, com ID, tipo, estado ativo, cor, intensidade e parâmetros pertinentes. O editor mostra helper/gizmo e inspector; a apresentação mostra apenas o efeito e a fonte visual quando houver um prop correspondente.

| Fonte proposta | Controle pertinente | Uso inicial |
| --- | --- | --- |
| Ambiente/hemisphere | Cor de céu/chão e intensidade. | Preenchimento moderado e leitura de sombras. |
| Direcional | Posição/orientação, intensidade, cor e sombra. | Luz principal, volume e referência de direção. |
| Point | Posição, intensidade, cor e alcance. | Luminária local; inicialmente sem sombra. |
| Spot, V2 | Posição, direção, cone, alcance e penumbra. | Feixe de luminária/destaque. |

DirectionalLight e SpotLight calculam direção a partir de um alvo; rotação isolada do objeto não basta. O domínio pode guardar quaternion/direção e o adaptador derivar o alvo. PointLight não tem orientação significativa. [Direcional](https://threejs.org/docs/pages/DirectionalLight.html), [spot](https://threejs.org/docs/pages/SpotLight.html), [point](https://threejs.org/docs/pages/PointLight.html).

O controle de temperatura de cor, na V2, converte Kelvin aproximadamente para a cor final e conserva edição direta de cor. Não misturar temperatura e tint de maneiras que tornem impossível reproduzir a cor salva. Intensidade e alcance são expostos com valores úteis ao autor; a UI não promete simulação fotométrica certificada.

“Iluminar sala” no MVP produz um ponto de partida revisável: preenchimento e fonte local com posição/cor/intensidade. Não altera móveis nem troca música. O mestre pode mover ou remover a fonte, ajustar sombras ou substituir o preset.

Presets posteriores:

| Preset | Intenção visual proposta | Parâmetros que continuam editáveis |
| --- | --- | --- |
| Hospitalar | Preenchimento neutro/frio, distribuição regular de luminárias. | Cor, intensidade, distribuição, materiais. |
| Noturno | Preenchimento menor e focos locais reconhecíveis. | Contraste, alcance, exposição, direção. |
| Terror | Foco dominante, planos separados e sombras escolhidas. | Cor, zonas iluminadas, fog e composição. |
| Emergência | Fontes coloridas em fixtures selecionados. | Quais luzes, padrão e intensidade. |
| Apagão | Desligar fontes vinculadas e manter fontes independentes selecionadas. | Exceções, preenchimento de leitura e cue. |

Uma fixture é um prop; seu emissive é um material; a fonte de luz ilumina; a sombra acrescenta oclusão. Nenhum desses papéis implica automaticamente os demais.

## 5. Sombras e oclusão visual

Sombras acrescentam contato e profundidade, mas implicam passes extras dos objetos participantes; uma point light com sombra pode exigir seis vistas. Isso favorece uma luz principal com sombra e luminárias decorativas sem ela, conforme o [manual de sombras](https://threejs.org/manual/pages/shadows.html).

Política proposta:

- piso recebe sombras; tokens e props relevantes projetam quando útil;
- pequenas decorações não recebem esse custo automaticamente;
- mestre pode escolher sombras por fonte e por entidade;
- qualidade local regula resolução, alcance e atualização dos mapas;
- área coberta pela sombra acompanha a região útil, evitando desperdiçar resolução;
- base/sombra simples de token serve como alternativa de contato.

Sombras de cena estática podem ser atualizadas sob demanda, mas mover token, porta, caster ou luz invalida o mapa pertinente. `autoUpdate`, `needsUpdate`, bias e normalBias são controles disponíveis em [LightShadow](https://threejs.org/docs/pages/LightShadow.html). Não congelar sombras e esquecer de invalidá-las depois da edição.

Luz sem sombra pode atravessar visualmente paredes. Alcance limitado não substitui oclusão arquitetural. Materiais emissivos e environment maps também não conhecem automaticamente o interior fechado de uma sala. O slice deve verificar vazamentos perceptíveis nos enquadramentos reais, sem prometer solução geral de iluminação global.

Fog, escuridão e sombra não fornecem fog of war, visão de personagem ou autorização. Esses sistemas exigem dados e projeções próprios.

## 6. Materiais, textura e gerenciamento de cor

MeshStandardMaterial é a base recomendada para materiais coerentes de pisos/props, com metallic/roughness e mapas apropriados. MeshPhysicalMaterial pode ser opção seletiva para vidro/detalhes que justifiquem recursos mais caros. [Standard](https://threejs.org/docs/pages/MeshStandardMaterial.html), [Physical](https://threejs.org/docs/pages/MeshPhysicalMaterial.html).

Proposta de autoria: biblioteca de materiais com nome/tags, preview, cor base, roughness, metalness, normal, emissive e texturas conforme o tipo suportado. O MVP começa com cor e parâmetros básicos; importados preservam materiais suportados. Instâncias podem ter override por slot sem modificar o original compartilhado.

Emissive faz uma superfície parecer luminosa no pipeline inicial; usar uma fonte explícita para iluminar o entorno. Bloom acrescenta halo e não fornece essa luz. Uma luminária pode reunir prop, material e luz vinculada, todos inspecionáveis.

Definir gerenciamento de cor desde o começo: texturas de cor/emissive em sRGB, mapas de dados sem conversão de cor e cálculos lineares, com saída correta. Não compensar pipeline incorreto aumentando luz. [Guia de color management](https://threejs.org/manual/pages/color-management.html).

Materiais devem comunicar identidade: superfícies limpas e regulares no hospital; variantes gastas e detalhes localizados no abandono; paleta coerente em madeira/pedra de uma casa. Essas são decisões de assets e composição, não um filtro universal.

Texturas gerenciadas preservam original e variantes. Tamanho/resolução é definido pelo uso e pelo benchmark. Para transparência, preferir recorte/alpha test quando a aparência permitir; vidro, fumaça e múltiplas camadas transparentes precisam de teste de ordenação e custo.

## 7. Sistema de ambientes

Mapa conserva o espaço; ambiente define receita de aparência; cena guarda o resultado aplicado, entidades e sessão. Snapshot/proveniência e precedência de materiais seguem [ARCHITECTURE.md](ARCHITECTURE.md).

Uma casa pode ser apresentada como dia, noite, tempestade, apagão, emergência ou sobrenatural. Trocar look não precisa copiar geometria nem mover tokens. Adicionar entulho ou destruir parede é autoria explícita.

Receita de ambiente na V2 pode conter fundo, preenchimento, fontes por papel, configuração de fog, materiais por papel, emissores e pós-processamento solicitado. Bindings associam a receita a fixtures/áreas reais, com preview dos alvos e dos overrides afetados.

O fundo visível e o environment map que afeta materiais são recursos separados, como distingue [Scene](https://threejs.org/docs/pages/Scene.html). O mestre pode ajustar um sem obrigar o outro. Mapas de ambiente ajudam aparência/reflexos, mas não resolvem oclusão de interiores automaticamente.

Salvar o look concreto permite reabrir sem biblioteca ou gerador. Ajustes locais da cena têm precedência definida; substituir ambiente mostra diff. Preset interno do MVP já deve produzir luzes/propriedades comuns, mesmo antes de existir uma biblioteca de EnvironmentDocument.

## 8. Atmosfera, fog, partículas e pequenos efeitos

Fog/FogExp2 oferecem névoa dependente de distância. Não representam densidade por altura, fumaça localizada, espalhamento volumétrico ou visibilidade de jogador. [Fog](https://threejs.org/docs/pages/Fog.html), [FogExp2](https://threejs.org/docs/pages/FogExp2.html).

Prioridades qualitativas propostas; custos precisam ser medidos:

| Técnica | Ganho esperado | Custo/limitação | Etapa |
| --- | --- | --- | --- |
| Paleta, escala e composição | Identidade e profundidade. | Curadoria de assets e autoria. | MVP |
| Luz principal e preenchimento | Volume e leitura. | Quantidade de luzes avaliadas pelos materiais. | MVP |
| Sombra seletiva | Contato e direção. | Passes e memória de mapas. | MVP, opcional |
| Fog de distância | Separação de planos. | Não elimina renderização de geometria escondida. | V2 |
| Emissive | Fonte aparente e contraste. | Não ilumina o entorno sozinho. | MVP/material importado |
| Poeira/brasas em pontos | Movimento ambiental discreto. | Quantidade, tamanho e cobertura em tela. | V2 |
| Chuva, fumaça e fogo em sprites | Atmosfera localizada. | Transparência, overdraw e ordenação. | V2/V3 |
| Feixe aparente por cone/plano | Sugestão de volume de luz. | Pode atravessar paredes ou revelar artefatos. | Experimento V2 |
| Bloom leve | Halo nas fontes. | Buffers/passes e possível perda de contraste. | V2, opcional |
| AO em tela | Contato adicional. | Custo por resolução e artefatos em bordas. | V3, medido |
| Volume raymarched/reflexos em tela | Efeito mais elaborado. | Muitas amostras por pixel e limites de tela. | Futuro |

O [exemplo volumétrico oficial r186](https://github.com/mrdoob/three.js/blob/r186/examples/webgl_volume_perlin.html) mostra viabilidade técnica, sem comprovar custo adequado ao notebook. Não fazer volumetria real requisito para uma sala convincente.

Na V2, emissores receberão formato validado com área/volume, seed, densidade, velocidade, duração, textura e vínculo espacial. Points pode atender poeira/brasas; tamanho de ponto tem limites do hardware, descritos em [PointsMaterial](https://threejs.org/docs/pages/PointsMaterial.html). Partículas orientadas/maiores podem usar billboards instanciados, conforme o teste.

Evitar um mesh, timer ou objeto DOM por partícula. Não simular fluidos para fumaça decorativa. Fogo pode combinar sprite, emissive e oscilação de luz; chuva pode ter região limitada e vento visual, sem dinâmica climática completa.

Flicker e luz animada usam curvas/padrões com seed, amplitude e frequência. Um scheduler visual avalia efeitos ativos; não gera comando/save a cada frame. O mestre pode pausar/desligar efeitos e selecionar variação suave. Tempo visual e tempo musical são separados.

## 9. Pós-processamento

O MVP deve parecer bom sem depender de cadeia de efeitos. Depois, adotar uma cadeia curta, com efeitos desligáveis: correção sutil, bloom limitado e antialiasing medido. Profundidade de campo, grão, glitch e aberração cromática são opções de apresentação, sem comprometer a leitura tática por padrão.

Caso EffectComposer seja escolhido, usar OutputPass para saída/tone mapping conforme o [guia oficial](https://threejs.org/manual/pages/how-to-use-post-processing.html). Encapsular o pipeline; não combinar duas conversões de saída ou dois sistemas de efeitos inadvertidamente.

Qualidade local pode omitir um efeito solicitado pelo look sem alterar a cena. A UI informa o perfil efetivo. Troca de cena libera render targets antigos e mantém dimensões compatíveis com o viewport; buffers do projetor têm custo próprio.

## 10. Câmera, enquadramento e transições

Perspectiva inclinada é o padrão de apresentação. Vista superior ortográfica atende edição precisa e visão tática. “Cinematográfica” é uma configuração de enquadramento/lente/movimento, não outra representação do mapa.

O mestre possui câmera de trabalho. A cena possui presets. A janela do projetor possui câmera publicada. Orbit/pan/zoom do editor não muda o projetor até o mestre publicar ou ativar um enquadramento.

Cada preset guarda ID/nome, projeção, posição/alvo, FOV ou escala ortográfica, alvo opcional token/área e margem de enquadramento. Aspect ratio vem do viewport; não gravar resolução física do projetor como geometria da câmera.

Foco em token/área considera bounds e margem, preservando base e relações espaciais. Se um alvo deixar de existir, usar enquadramento salvo e informar o vínculo ausente. Auto-frame retorna uma proposta que o mestre pode ajustar e salvar.

OrbitControls oferece câmera e limites, conforme sua [documentação](https://threejs.org/docs/pages/OrbitControls.html). Publicação, presets, foco e interpolação pertencem ao Tabletop. Suspender navegação durante manipulação evita conflito de mouse; validar também uso com trackpad.

Transições na V2 são curtas, interrompíveis e desligáveis. Interpolar posição/alvo/FOV quando compatíveis; mudança entre ortográfica/perspectiva pode usar corte explícito. Não atravessar longos trechos de parede sem considerar enquadramento. “Cortar agora” sempre deve estar disponível.

Trocar cena usa preparação de assets/preview antes de publicação. Não limpar o projetor e iniciar carregamento indiscriminado no meio da sessão. O MVP pode usar corte após prontidão; pré-carregamento e transições mais ricas vêm depois, com orçamento de memória.

## 11. Build Mode, Session Mode e projetor

Build Mode: ferramentas, biblioteca, árvore/layers, inspector, luzes/materiais, Smart Build, transform, câmera e undo/redo. Session Mode: viewport, tokens, presets de câmera, cena ativa e controles essenciais do mestre; painel musical só quando houver integração real.

A apresentação local não contém inspector, gizmos, seleção do editor ou notas. Mostrar etiquetas/bases de token conforme legibilidade, com opção de reduzir elementos na imagem. Atalhos de enquadramento e estado de porta ajudam a condução sem abrir painéis grandes.

No modo estendido, editor e projetor usam duas janelas. Em geral são dois contextos WebGL, com possíveis cópias de recursos GPU; cache HTTP/JS não elimina esse custo. Dois viewports no mesmo contexto reutilizam recursos, mas ainda exigem renderizações. Não presumir que a segunda tela é gratuita.

Qualidade do projetor é local: resolução/pixel ratio, efeitos e ajuste de exposição. Não regrava a intenção artística do ambiente. Testar à distância e com luz ambiente da sala; preservar detalhes nas sombras e distinguir tokens. “Noite” precisa continuar jogável mesmo sem pretos profundos do monitor.

A janela recebe snapshot filtrado e enquadramento publicado, depois alterações sequenciadas. Desconexão/reabertura solicita estado atual. Nenhum controle de ocultação por jogador é substituído por simplesmente esconder meshes que já receberam dados secretos.

## 12. Integração visual e sonora com o Jukebox

Jukebox continua a autoridade musical. Tabletop armazena referência a cue; não contém outro player, não replica efeitos e não copia o mix para EnvironmentDocument.

Uma cena hospitalar pode usar iluminação fria, pouco preenchimento, fog e flicker no visual, e uma cena sonora no Jukebox. Outra cena do mesmo mapa pode usar outro look e outra cue. Ambiente pode sugerir áudio durante preparação; a escolha final pertence à cena.

A ponte futura executa `getState`, `listScenes`, `activateScene`, `play`, `stop`, `fadeTo` e `setMasterVolume` dentro da janela proprietária do Jukebox. Protocolo, origem exata e resultados seguem [ARCHITECTURE.md](ARCHITECTURE.md). A ficha e o player existentes não são substituídos.

Antes de vínculos duráveis, introduzir libraryId/trackId nos presets e um namespace estável para cenas sonoras. O ID da cena guardado apenas no localStorage de uma origem não garante disponibilidade em outro navegador. Exportar/migrar cenas sonoras junto da biblioteca escolhida, sem resolver ambiguidades por título.

Fluxo de ativação explícita:

1. Preparar a cena visual e confirmar assets/enquadramento.
2. Consultar Jukebox e validar biblioteca/cue quando a política inclui áudio.
3. Publicar visual e enviar pedido de ativação sonora por requestId.
4. Apresentar retorno confirmado: concluído, parcial, bloqueado, ausente ou indisponível.

Os dois runtimes não formam uma transação atômica. Se o áudio falhar, visual pode continuar com status visível; mestre pode repetir após consultar estado ou trocar cue. Não repetir automaticamente um pedido de resultado desconhecido, reiniciando faixas sem saber.

Sincronia cinematográfica exata não é promessa de postMessage. Para troca coordenada, preparar e acionar próximos no tempo é suficiente inicialmente; agendamento com relógio compartilhado só entra se medições e uso justificarem.

Abrir/editar/salvar/duplicar cena, aplicar ambiente e undo não acionam áudio. Ativação de sessão aciona cue somente conforme política escolhida pelo mestre. Preservar os fluxos de carregamento de arquivos e desbloqueio de áudio no Jukebox.

## 13. Performance e perfis de qualidade

Perfis locais propostos, editáveis por recurso:

| Perfil | Intenção | Recursos regulados |
| --- | --- | --- |
| Essencial | Clareza e baixo custo, inclusive celular futuro. | Resolução menor, sombra simples/seletiva, poucos efeitos. |
| Equilibrado | Padrão inicial para notebook/projetor, após benchmark. | Materiais coerentes, luzes relevantes, sombra principal opcional. |
| Atmosférico | Permitir efeitos medidos e desejados. | Partículas/fog/bloom e sombras adicionais dentro do orçamento. |

Perfis não apagam entidades, não removem parâmetros salvos e não restringem autoria. Qualidade é por viewport, separada de look. Evitar alteração automática de brilho/contraste durante uma cena sem controle do mestre.

Estratégia incremental:

- Compartilhar geometrias/texturas/materiais compatíveis dentro de cada renderer; criar variantes apenas para overrides diferentes.
- Cache por ID/versão de asset e variante, com ownership/contagem de referências.
- Carregar biblioteca e previews sob demanda; não decodificar todos os GLBs/texturas ao abrir.
- Frustum culling e agrupamento espacial; instancing para repetidos quando medido.
- LOD para variantes realmente fornecidas; não supor geração automática de modelo simplificado.
- Limitar sombras, resolução de mapas, pixel ratio e buffers conforme perfil medido.
- Partículas por região e cobertura de tela; transparência extensa merece atenção especial.
- Cancelar carregamentos obsoletos e descarregar recursos ao trocar cena.
- Streaming por regiões/andares somente se o tamanho das cenas justificar; preservar seleção e documento completo.

[InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) reduz draw calls; o renderer mantém mapa de entityId para índice, atualiza bounds e agrupa por região/material. [LOD](https://threejs.org/docs/pages/LOD.html) seleciona variantes por distância. Essas otimizações não retiram IDs/edição individual do documento.

Compressão de geometria/textura e decoders locais podem ser adotados conforme compatibilidade: GLTFLoader/KTX2Loader exigem configuração apropriada. Preservar arquivos originais e validar dependências, conforme [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html) e a estratégia de [assets](ARCHITECTURE.md).

Remover Object3D não libera todas as geometrias, materiais, texturas, bitmaps e render targets. Descartar somente recursos sem donos, conforme o [guia de cleanup](https://threejs.org/manual/pages/cleanup.html). Testar repetidas trocas de cena, inclusive apresentação aberta.

Renderizar sob demanda quando estático; manter atualização durante gestos, damping, transições, flicker e efeitos ativos. O [guia de rendering on demand](https://threejs.org/manual/pages/rendering-on-demand.html) sustenta esse padrão. Reduzir atualização do editor enquanto o projetor apresenta pode economizar trabalho, sem parar ações duráveis.

## 14. Benchmark com cenas reais e áudio

Não há medição que sustente prometer FPS, número de tokens ou tamanho máximo de mapa. As metas numéricas virão dos primeiros resultados na máquina da mesa; não serão inventadas para esta documentação.

Catálogo de cenários reproduzíveis:

| Cena/roteiro | O que revela |
| --- | --- |
| Sala do slice, construída do vazio | Custo base, legibilidade, rapidez e controle manual. |
| Hospital com corredor e mais de um andar, V2 | Luzes locais, paredes/apoios, ocultação e câmera. |
| Área externa/floresta com assets repetidos | Instancing, culling, sombras e partículas. |
| Cenário GLB real com texturas maiores | Download local, decode/upload, shaders, memória e normalização. |

Congelar snapshots, catálogo/seed e roteiro. Registrar máquina, GPU ativa, energia, temperatura quando disponível, navegador/versão, resoluções do notebook/projetor e perfis locais. Comparar carregamento frio e quente.

Medir tempo de abertura, importação, troca de cena/ambiente, save e resposta de interação; distribuição de tempos de frame, long tasks/travamentos; CPU e memória de processo; draw calls, triângulos, programas e contagens de recursos por renderer. `renderer.info` não fornece bytes completos de VRAM e múltiplos passes precisam ser agregados, conforme [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). Usar o [painel Performance do Chrome](https://developer.chrome.com/docs/devtools/performance) ou equivalente do navegador escolhido.

Roteiro: câmera estática, orbit/pan/zoom, arraste/rotação, Smart Build, undo/redo, foco de token, troca de enquadramento e repetidas alternâncias de cena. Avaliar projetor pela distância real dos jogadores, leitura de bases/nomes e contraste sob a iluminação da sala.

Repetir os mesmos roteiros com:

1. Tabletop sozinho.
2. Editor e janela do projetor simultâneos.
3. Jukebox tocando o mix representativo com efeitos/loops/transições.
4. Importação/previews e trabalho musical representativo, incluindo waveform ou edição quando usados na sessão.

Variar uma opção gráfica por vez. Registrar falhas audíveis, atrasos de comando e precisão de loops/fades, além do custo visual. Aceitação combina tarefas responsivas, áudio contínuo e leitura satisfatória; limites de qualidade e metas são fixados após observar esses dados.

Há um caso específico a verificar: o player atual usa requestAnimationFrame em fades/monitoramento de regiões. Navegadores costumam pausar esse callback em contextos ocultos, conforme [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). Testar Jukebox com Tabletop em foco, janela minimizada e projetor ativo. Isso é risco identificado, não falha reproduzida nesta etapa. O scheduler visual do Tabletop não deve funcionar como relógio musical.

## 15. Prioridades e validações pendentes

MVP: escala/material coerentes, luz básica editável, sombra seletiva opcional, câmera perspectiva/superior, enquadramento salvo e apresentação local. O Smart Build fornece estrutura/iluminação simples e permite ajuste manual.

V2: biblioteca de ambientes, spot/flicker, fog, emissores leves, presets/transições e pós-processamento opcional medido; integração real do Jukebox e ficha conforme os contratos. V3: composição atmosférica mais ampla, streaming/LOD quando necessário e LAN móvel opcional. Futuro: volumetria/reflexos avançados e IA somente com ganho demonstrado.

Validar hardware/navegador específicos, legibilidade do projetor, estilo e disponibilidade de assets, número/tipo de fontes relevantes, sombras em interiores e interação com áudio em segundo plano. Não houve benchmark gráfico, teste de reprodução ou validação visual do Tabletop nesta fase; as imagens analisadas são referências externas.
