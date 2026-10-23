# Mesa ao vivo — plano para chegar ao nível do tabletop de Ordem Paranormal

> **Situação (22/10, noite):** entregue a parte de câmera e cinematografia — foco/desfoque, seguir token, close, movimentos, câmera ao vivo (fase 5, itens 1–2 e parte do 3), ambientação ao vivo com transições, lanterna, retratos iluminados com sombra recortada e token que desliza no projetor (parte da fase 1). Veja [CINEMATOGRAFIA.md](CINEMATOGRAFIA.md). **Dados 3D (fase 4) adiados** até a integração com a Ficha: [INTEGRACAO_FICHA.md](INTEGRACAO_FICHA.md).

Data: 22 de outubro de 2026. Plano para outro agente implementar, fase por fase. Escrito a partir de uma leitura do código (`src/`, 361 testes unitários passando) e de pesquisa sobre o tabletop de Ordem Paranormal (Hexatombe), Baldur's Gate 3, Mini Kraken (erpg.app) e Sigil (D&D Beyond).

## 0. Regras para quem implementa

Leia antes de começar e siga em todas as fases:

1. **AGENTS.md**: atualize `progress.md` durante o trabalho e, ao concluir uma fase, os resumos em `PROGRESSO.md` e `docs/PROGRESSO.md`. **Preserve a separação entre câmera de trabalho e câmera publicada.** Nada do que se faz na mesa de trabalho pode mudar o projetor sem uma ação explícita de publicar ou disparar.
2. **Assistência, não presets.** Qualquer recurso assistido parte do que já existe na cena: lê, deduz a intenção, reaproveita as peças do usuário e sugere o próximo passo. Nunca remove nem sobrescreve o que o usuário fez. Tudo que for gerado continua editável. Receitas são conhecimento do assistente, não o produto.
3. **Resultado bonito e verificado.** Se uma fase tiver tutorial ou cena de exemplo, desenhe o resultado final primeiro, renderize e compare antes de escrever os passos. Lições definem os valores reais (cor, força, alcance, tamanho) e marcam onde clicar (`spot` do tutor).
4. **Contratos do projeto.** Todo campo novo de documento é opcional, validado em `src/domain/validation.js` e, quando ausente, mantém a aparência anterior. Toda edição durável passa por `src/state/commands.js`, com um passo de desfazer por gesto. O que é só do mestre passa pelo filtro de `projectPresentation` (`src/app/presentation.js`) **antes** de ir para o projetor.
5. **Não aumente `src/app/application.js`** (2.956 linhas). Código novo vai em módulos próprios (`src/app/live/`, `src/render/figures.js` etc.). `application.js` só ganha a ligação mínima.
6. **Estilo.** Siga o estilo do módulo que está editando: comentários curtos em inglês, interface em português.
7. **Validação de cada fase:** `npm test`, os E2E afetados (`npm run test:e2e` filtrado), `npm run build` e `npm run build:pages`, e capturas comparando antes e depois, no editor e no projetor.
8. Integrar com a Ficha (`../Ficha teste - Ordem II`) ou com o Jukebox (`../Jukebox`) **muda outros projetos**. Só faça isso na fase 7 e só com autorização explícita do usuário.

## 1. Diagnóstico

### 1.1 Onde o Tabletop já está no nível (ou acima)

- **Autoria**: construção assistida (salas, prédio, entorno), terreno e escultura, pisos, andares, portas e janelas com vão real, mais de 350 assets originais, cabos, decalques, telas animadas.
- **Imersão**: iluminação dinâmica (spot, Kelvin, flicker, zonas, projeções de vitral), névoa de altura, bloom, GTAO, reflexos, desgaste de material, umidade, clima e partículas, horário do dia.
- **Apresentação**: projetor em segunda janela com câmera publicada independente, filtro "só mestre", tomadas (shots) com ensaio e ao vivo, transições de câmera, interruptores de luz.
- **Robustez**: revisões, backups, rascunho, conflito entre abas, modo GitHub Pages e uma boa base de testes.

### 1.2 O que separa o Tabletop do tabletop de Ordem

O tabletop de Ordem é uma **ferramenta de transmissão ao vivo**. O Tabletop hoje é um **editor de cenas com projetor**. As matérias sobre Hexatombe falam em "cenários em 3D, personagens 2D aprimorados", imersão "cinematográfica", iluminação e som integrados à narrativa (painéis de LED). A Jambô destacou "enquadramentos imersivos e clareza das ações". A imagem oficial de julho de 2025 mostra miniaturas em alturas diferentes, sombras no chão e uma árvore "Wall / Floor 1 / Floor 2 / Floor 3". Nada disso diz qual engine usam. O que dá para tirar é o que importa na experiência:

| Pilar de Ordem | Situação no Tabletop | Lacuna |
| --- | --- | --- |
| Personagens 2D que fazem parte da cena | Token de imagem é um plano fixo com `MeshBasicMaterial` (`renderer.js`, cerca da linha 599). Não recebe luz nem projeta sombra recortada, não gira para a câmera e não tem contorno nem estados. | **Crítica.** Numa cena escura de terror, o retrato "brilha" e parece colado por cima. |
| Direção ao vivo (um botão = um momento) | Tomadas, interruptores e portas existem, mas cada coisa é uma ação separada. Não há como disparar "apagão + porta abre + câmera no corredor + som" de uma vez. | **Crítica.** |
| Camada de informação na tela (dados, fichas, títulos) | Não existe. O projetor mostra só o 3D. | **Alta.** Rolagens são o centro de toda sessão de Ordem. |
| Revelar e ocultar ao vivo | Visibilidade e "só mestre" funcionam, mas o objeto aparece e some sem transição, e não existe revelação por sala. | **Alta.** |
| Câmera de personagem (close, foco) | Há presets e transições, mas não há close automático de um personagem, profundidade de campo, câmera seguindo token nem tremor. | **Média-alta.** |
| Leitura tática (BG3) | Existe régua. Não há trilha de movimento com distância, áreas de efeito nem iniciativa. Paredes que tapam o token não somem sozinhas. | **Média.** |
| Som e luz física integrados | `audioCue` está reservado no schema, mas não há ponte com o Jukebox nem saída para luzes da sala. | **Média** (depende de outros projetos). |

### 1.3 Problemas e dívidas no projeto atual

1. **Bug aberto da auditoria de 5/10**: importar JSON com um ID já existente pode mostrar "salvo" sem gravar e sem manter rascunho (`docs/AUDITORIA_2026-10-05.md`). Não há registro de correção no `progress.md`. Confirmar e corrigir. É perda de trabalho.
2. **Arquivos-deus**: `application.js` com 2.956 linhas (93 delas com mais de 300 caracteres) e `renderer.js` com 1.532 (27 linhas acima de 300). Cada fase nova fica mais cara e arriscada. Não faça uma refatoração grande: **extraia o que for tocar** (ver regra 5).
3. **`progress.md` com 172 KB**: o AGENTS.md manda ler e atualizar esse arquivo, e ele já custa muito contexto a cada sessão. Há ainda três resumos paralelos (`progress.md`, `PROGRESSO.md`, `docs/PROGRESSO.md`).
4. **Lixo no repositório**: `t1.png` está versionado na raiz, e há diretórios de dados por porta (`5000/`, `6700/`) fora do `.gitignore`.
5. **Sem pacote de transporte**: não dá para exportar uma cena com os assets para outra máquina (pendente desde o MVP). Isso limita compartilhar cenas e fazer backup.
6. **Nunca medido no hardware real**: todo marco de desempenho diz "calibração presencial pendente", e as medições foram feitas em SwiftShader. Com mais efeitos ao vivo (fase 3), isso vira risco.
7. **glTF com texturas e dependências** ainda pendente. Sem isso, o usuário não consegue trazer assets CC0 de alta qualidade (Poly Haven, Quaternius, Kenney), que é o caminho mais curto para chegar à fidelidade de Ordem em props específicos.

### 1.4 O que aproveitar das outras referências

- **Baldur's Gate 3**: câmera tática que aproxima até o nível do personagem; paredes e tetos somem quando tapam o personagem, e ele aparece em silhueta atrás de obstáculos; trilha de movimento com custo; áreas de efeito desenhadas no chão; barra de iniciativa com retratos; rolagem de d20 dramática no centro da tela; destaque de objetos interativos com uma tecla.
- **Mini Kraken (erpg.app)**: mesa 3D no navegador e como Activity do Discord, sem configuração; paredes e "zonas de combate"; dados 3D e animador de tokens como recursos premium; editor de handouts (cartas, jornais, pistas) com dezenas de modelos. A lição é que handouts e entrada sem atrito valem muito para o mestre.
- **Sigil (D&D Beyond, Unreal Engine 5)**: construtor de níveis 3D e criador de miniaturas. O time foi demitido em março de 2025 e o produto será encerrado no fim de outubro de 2026. A lição é não virar um "jogo" pesado. O Tabletop deve continuar leve, no navegador, focado em montar rápido e dirigir bem.

## 2. Fases

A ordem segue o ganho visível por esforço. Cada fase entrega algo usável sozinha.

---

### Fase 0 — Higiene e confiabilidade (pequena, fazer primeiro)

1. Reproduzir e corrigir o bug de importação de JSON com ID existente. O teste de recuperação/importação precisa provar que nunca aparece "salvo" sem gravar e que o rascunho é mantido.
2. Mover as entradas de `progress.md` anteriores a 15/10 para `docs/historico/progress-2026-10.md`, deixando no topo um índice de uma linha por marco. Ajustar o AGENTS.md para dizer que o histórico está arquivado. **Não apagar conteúdo.**
3. `git rm t1.png`; adicionar `/[0-9]*/` (diretórios de dados por porta) ao `.gitignore`, depois de confirmar que só contêm dados locais.
4. Criar `src/app/live/` e `src/render/figures.js` vazios de lógica, só com a ligação mínima, para receber as fases seguintes.

**Aceite:** testes verdes, e o bug coberto por um teste E2E novo.

---

### Fase 1 — Personagens 2D de verdade (standees)

**Objetivo:** um retrato importado vira uma figura recortada que pertence à cena: recebe a luz das velas, projeta sombra com o formato da silhueta, fica de pé numa base e continua legível no projetor.

**Contrato (opcional em token e em actor, por herança token → actor):**

```js
figure: {
  mode: 'standee' | 'disc' | 'model',   // ausente = comportamento atual
  facing: 'camera' | 'fixed',           // 'camera' = billboard cilíndrico (só gira em Y)
  height: 1.7,                          // metros; largura vem do aspecto da imagem
  lit: 1,                               // 0 = sem luz (como hoje), 1 = PBR completo
  legibility: 0.25,                     // piso de emissão para não sumir no escuro (0–1)
  outline: { color: '#000000', width: 0.02 } | null,
  rim: { color: '#ffd9a0', strength: 0.4 } | null,
  base: 'ring' | 'plinth' | 'none',
  state: 'normal' | 'ferido' | 'morrendo' | 'inconsciente' | 'morto' | 'enlouquecendo'
}
```

**Renderização (`src/render/figures.js`):**

- Plano com `MeshStandardMaterial` (`alphaTest`, `alphaToCoverage` quando houver MSAA) e mistura de `lit` com emissão mínima em `onBeforeCompile`.
- Sombra recortada: `customDepthMaterial`/`customDistanceMaterial` com o mesmo `map` e `alphaTest`. A sombra precisa ter a forma do personagem, não de um retângulo.
- Billboard **por viewport**: o projetor e o editor têm câmeras diferentes, então a rotação é calculada em `onBeforeRender` com a câmera que está desenhando. O documento nunca recebe essa rotação. A seleção e o gizmo usam a orientação lógica do token.
- Contorno: segundo plano atrás, com a mesma alpha dilatada no shader (amostrar a alpha em 8 direções), na cor do contorno.
- Rim light: termo de Fresnel falso no shader, só na borda da alpha, para descolar a figura do fundo.
- Estados: `ferido` = leve tinta vermelha; `morrendo` = pulso vermelho lento mais dessaturação; `inconsciente` = figura deitada (rotação de 80° no eixo local) com a sombra acompanhando; `morto` = deitada, dessaturada e escurecida; `enlouquecendo` = distorção de UV sutil e animada (respeitar `prefers-reduced-motion`).
- **Movimento animado só na apresentação:** quando o transform de um token muda, o projetor interpola em 350–600 ms com um pequeno "pulo" (arco de 6–10 cm). O editor continua instantâneo. Nada disso entra no documento nem no histórico.
- Leve "respiração" opcional (escala Y ±0,6%, período de 4 s), desligada com movimento reduzido.

**Importação:** ao importar um retrato, cortar margens transparentes automaticamente. Se a imagem não tiver alpha, oferecer remoção de fundo simples por cor da borda (flood fill com tolerância e prévia). Não usar modelos de ML.

**UI:** no cartão do personagem (`src/ui/actor-hero.js` e o inspetor do token), uma seção "Figura" com prévia e um seletor de estado com ícones. O estado também precisa ser alterável pela fase 2 (ao vivo).

**Aceite:**
- Captura com o mesmo retrato na Igreja Antiga à noite e no Galpão: a figura fica mais escura longe da luz, mostra a cor das luzes próximas e projeta sombra com silhueta.
- No projetor, a figura gira para a câmera publicada enquanto o editor, com outra câmera, mostra a figura virada para a câmera dele.
- Tokens antigos (sem `figure`) ficam idênticos em pixels.
- Testes de validação para o contrato; E2E com troca de estado, persistência e projetor.

---

### Fase 2 — Modo Ao Vivo: deixas (cues)

**Objetivo:** o mestre prepara "momentos" e os dispara com uma tecla durante a sessão, como um operador de luz e câmera.

**Contrato (cena):**

```js
cues: {
  [id]: {
    id, name, key: '1'..'9' | 'F1'.. | null, order, color,
    steps: [
      { type: 'camera',     shotId, transition: 'cut' | 'smooth' | 'fade', duration },
      { type: 'visibility', targets: [ids], visible: true|false, fade: 0.8 },
      { type: 'light',      targets: [ids|groupIds], on: true|false, flicker: 0.4 },  // usa light-switch existente
      { type: 'door',       id, angle },
      { type: 'figure',     tokenId, state },
      { type: 'environment',environmentId | snapshot, duration },  // interpolar look
      { type: 'effect',     preset: 'shake'|'blood'|'paranormal'|'blackout'|'flash', duration, strength },
      { type: 'overlay',    ... }   // fase 3
      { type: 'audio',      jukeboxSceneId }   // fase 7; até lá, inerte e marcado como "não conectado"
    ],
    delayMs: [] // atraso opcional por passo, para encadear (luz apaga → 0,6 s → porta abre)
  }
}
```

**Estado ao vivo vs. autoria:** disparar uma deixa altera `sessionState` (estendido: `visibility`, `lights`, `figures`, `revealedAreas`, além de `doors`) e **não** o layout nem o histórico de autoria. Ter um histórico de sessão separado, com "voltar deixa" (Ctrl+Z dentro do painel Ao Vivo). Um botão "Restaurar estado inicial da cena" zera o `sessionState`. Validar e filtrar o `sessionState` em `projectPresentation`, para que um alvo "só mestre" nunca vaze.

**Renderer:** suporte a fade de visibilidade por objeto (opacidade animada com material clonado só durante o fade e devolvido ao final) e interpolação de `look` entre dois estados (cores, intensidades, névoa e exposição; não interpolar o que for discreto).

**Criação assistida de deixas** (a parte mais importante, conforme a regra 2): "Gravar deixa" compara o estado atual da cena ao vivo com o estado de antes e propõe os passos (o que acendeu, apagou, abriu, apareceu, qual tomada está no ar). O mestre ensaia na mesa de trabalho e grava o momento. Não montar a deixa campo por campo.

**Painel Ao Vivo (`src/app/live/live-panel.js`):** grade de deixas com tecla, cor e miniatura (reusar `shot-thumbnails.js`), lista de cenas da sessão com **pré-carregamento da próxima** (assets e geometrias em cache antes de trocar) e transições entre cenas (fade para preto, corte, as barras de `stage-cut.js`). Teclas só funcionam com foco no palco ou no painel, nunca dentro de inputs.

**Aceite:**
- Exemplo na Igreja Antiga: deixa "Apagão" (velas apagam com flicker, névoa sobe, câmera corta para o altar, figura do vilão aparece com fade) disparada com uma tecla. O projetor chega lá em menos de 1 s, e "voltar deixa" restaura tudo.
- Salvar com estado ao vivo e reabrir mantém ou zera o estado conforme a escolha. A autoria permanece intacta.
- Teste de privacidade: deixa que revela um objeto "só mestre" mostra o objeto somente após o disparo, e o pacote enviado ao projetor antes do disparo não contém esse objeto.

---

### Fase 3 — Camada do projetor (overlay cinematográfico)

**Objetivo:** tudo o que não é o mundo 3D, mas que a transmissão mostra: rolagens, fichas, títulos, iniciativa e efeitos de tela.

- Camada DOM própria na janela do projetor (`src/app/live/overlay.js` + `src/ui/overlay.css`), com estilo da Ficha e do design system (`docs/DESIGN_SYSTEM.md`).
- Mensagens novas no canal `BroadcastChannel` que já existe (`application.js`, por volta das linhas 333 e 811), versionadas (`type: 'overlay'`). O overlay **não** vai para o documento. Só o que precisar persistir (layout dos cartões, por exemplo) fica num campo opcional `overlayPrefs`.
- Componentes:
  - **Cartela de título** (nome do local, data e hora, "Capítulo 3"), com entrada e saída animadas.
  - **Legenda/fala** para NPCs (nome e texto, máquina de escrever opcional).
  - **Cartões de personagem**: retrato, PV, SAN e PE em barras, condições. Valores locais até a fase 7 e claramente marcados como locais (sem fingir sincronia com a Ficha).
  - **Barra de iniciativa** com retratos e destaque do turno atual. O token ativo ganha um anel pulsante no 3D.
  - **Efeitos de tela** (passes leves em `effects.js`, ou CSS quando bastar): vinheta pulsante de sangue, tremor de câmera (no projetor, aplicado à câmera publicada sem alterá-la no documento), flash, fade para preto, "paranormal" (aberração cromática, distorção e granulação) para Ordem, dessaturação para sanidade baixa. Todos com intensidade e duração e com respeito a movimento reduzido.
  - **Handouts** (inspirado no Mini Kraken): mostrar uma imagem (carta, foto, recorte de jornal) em tela cheia sobre a cena, com papel envelhecido opcional. Imagem importada como asset; pode ser "só mestre" até o disparo.
- Tudo disparável pelo painel Ao Vivo e como passo `overlay` de uma deixa.

**Aceite:** captura do projetor com cartela, cartões e iniciativa legíveis a 3 m numa tela de 1080p (fonte mínima de 28 px para nomes). Efeitos não derrubam o FPS mais do que 10% no perfil "médio" (medir com `src/diagnostics/performance.js`).

---

### Fase 4 — Dados 3D no projetor

- Trazer `dice3d.js` da Ficha (`../Ficha teste - Ordem II/src/dice3d.js`) como **cópia adaptada** para `src/app/live/dice.js`, sem importar o projeto. Trocar `PCFSoftShadowMap` por `PCFShadowMap` (removido no r186, ver `docs/IMMERSION.md` §3).
- Renderizar os dados numa camada própria por cima da cena (cena Three.js separada com fundo transparente, ou dentro do overlay) para não reconstruir a cena principal.
- Regras de Ordem: teste de atributo = N d20, fica o maior; atributo 0 = 2 d20, fica o menor; perícia somada; crítico pela margem da arma; dados de dano com fórmula (`2d6+3`). Parser de fórmula pequeno e testado (`src/domain/dice.js`, sem DOM).
- Resultado grande no centro (como o d20 do BG3), cor de sucesso, falha, crítico e desastre, e registro das últimas rolagens no painel do mestre. Rolagem secreta: só o mestre vê; no projetor não aparece nada.
- O resultado é sorteado **antes** da animação, com `crypto.getRandomValues`, e a física só encena esse valor. Isso garante que o número mostrado é o número rolado.

**Aceite:** testes do parser e das regras; E2E rolando no editor e vendo no projetor; rolagem secreta não gera nenhuma mensagem para o projetor.

---

### Fase 5 — Câmera de personagem e leitura da cena (BG3)

1. **Close de personagem:** botão "Close" no token gera uma tomada enquadrando o rosto da figura (terço superior da imagem), com FOV longo (35–50 mm equivalente) e **profundidade de campo** (BokehPass ou passe próprio leve, ligado só nessa tomada). A tomada é editável e salva como qualquer outra.
2. **Seguir token:** a tomada pode ter `follow: tokenId`, e a câmera publicada acompanha o movimento animado da fase 1 com suavização.
3. **Paredes que somem (oclusão automática):** na apresentação, paredes e props marcados como `occluder` entre a câmera e os tokens visíveis ficam transparentes ou recortados (dither em círculo ao redor do token, estilo BG3). Reaproveitar a lógica de cutaway e telhados já existente. Os personagens atrás de obstáculos aparecem em **silhueta** (segundo desenho com `depthFunc` invertido e cor sólida).
4. **Gradação de cor por tomada:** `shot.grade = { lut | {lift, gamma, gain, saturation, temperature} }` aplicado no `OutputPass`. Começar com controles simples. LUT `.cube` importável é opcional.
5. **Pilha de andares visível no projetor:** como a árvore "Wall / Floor 1 / Floor 2 / Floor 3" de Ordem, um controle no Ao Vivo para mostrar até o andar N e alternar as paredes (cortadas, baixas ou inteiras). Reaproveitar `levels`.

**Aceite:** close com desfoque bonito no Galpão (comparar com o original e com e sem efeito). Token atrás de uma parede aparece em silhueta no projetor e não no editor (o editor tem seu próprio controle).

---

### Fase 6 — Exploração e ferramentas táticas

1. **Revelar por área:** `areas` já existe. Adicionar `sessionState.revealedAreas`. No projetor, áreas não reveladas ficam escuras (o conteúdo nem é enviado se estiver marcado como "esconder até revelar"). Revelar aplica fade de 1 s. Ação rápida: clicar numa sala no painel Ao Vivo. Também como passo de deixa.
2. **Trilha de movimento:** arrastar token mostra a linha, a distância em metros e em quadrados (com a régua existente, `src/render/ruler.js`) e uma cor de alcance opcional (deslocamento do personagem).
3. **Áreas de efeito:** círculo, cone, linha e quadrado com tamanho em metros. Decalque projetado no chão, visível no projetor. Somem com um clique ou ao fim do turno.
4. **Destacar interativos:** tecla para mostrar portas, objetos marcados como `interactive` e itens com contorno no projetor (estilo Alt do BG3).

**Aceite:** E2E de revelar sala com privacidade (conteúdo não revelado ausente do pacote do projetor). Medidas da trilha batem com a régua.

---

### Fase 7 — Integrações (só com autorização do usuário)

Seguir o desenho de `docs/ROADMAP.md` §4 e `docs/ARCHITECTURE.md` §3 e §11, nesta ordem:

1. **Ficha (leitura):** cartões do overlay e dados lendo PV, SAN, PE, atributos e perícias da Ficha por ID e revisão. Escrita (dano aplicado pelo Tabletop) só depois de a Ficha ter um repositório por ID. Hoje ela grava o array inteiro.
2. **Jukebox:** passo `audio` das deixas chamando uma fachada com retorno confirmado. Mostrar erro real (biblioteca ausente, áudio bloqueado, timeout), nunca sucesso fictício.
3. **Luz física da sala (opcional, o equivalente doméstico aos painéis de LED de Hexatombe):** endpoint no servidor local que publica a cor dominante e a intensidade da tomada no ar (amostrada do render do projetor a 4 Hz) para WLED ou Home Assistant via HTTP. Desligado por padrão, sem dependência nova.

---

### Fase 8 — Montar no nível de Ordem com pouco esforço

1. **Assistente de direção de fotografia ("olhar de diretor"):** analisa a tomada publicada (histograma de luminância, contraste local, ponto focal, coerência de temperatura das luzes, personagem legível) e propõe correções específicas sobre o que **já está** na cena, por exemplo: "a figura da Agatha está a 4% de luminância; aproximar a vela da mesa 0,8 m ou subir o rim"; "três temperaturas de luz brigando, alinhar a lâmpada fria a 3.200 K?". Cada sugestão vem com prévia e aceite e vira comandos normais. Nada é aplicado sem aceite.
2. **Salvar composição como kit:** selecionar objetos e salvar como prefab pessoal (com luzes, materiais e desgaste) reutilizável em outras cenas, como cópia editável com proveniência. Era pendência do roadmap V2.
3. **glTF com texturas e dependências:** importar `.glb` com texturas embutidas e `.gltf` + pasta (arrastar a pasta), normalizar escala e pivot, gerar miniatura e classificar no catálogo. Isso libera assets CC0 externos de alta qualidade.
4. **Pacote de cena:** exportar e importar `.tabletop` (zip com o documento, os assets referenciados por revisão exata e a capa), nos dois modos (servidor e Pages).
5. **Tutorial "Sua primeira sessão ao vivo"**, seguindo `docs/TUTORIAL_PLAN.md` e a regra 3: monta duas deixas na Igreja Antiga, faz um close com profundidade de campo e uma rolagem no projetor.

---

### Fase 9 — Medição real (precisa do usuário)

Roteiro de benchmark no notebook real com projetor e Jukebox tocando: Igreja Antiga e Templo Gelado, deixas, overlay, dados e efeitos. Registrar FPS (p50/p95), tempo de troca de cena e memória com `src/diagnostics/performance.js`. Definir os perfis baixo/médio/alto a partir disso. Sem essa medição, não declarar metas de desempenho.

## 3. Ordem sugerida e tamanho

| Fase | Impacto para "nível Ordem" | Tamanho |
| --- | --- | --- |
| 0 Higiene | Confiabilidade | P |
| 1 Standees | Muito alto (visual) | M |
| 2 Deixas / Ao Vivo | Muito alto (direção) | G |
| 3 Overlay | Alto | M |
| 4 Dados 3D | Alto | M |
| 5 Câmera de personagem | Alto | M |
| 6 Exploração e tática | Médio | M |
| 7 Integrações | Médio | M (depende de outros projetos) |
| 8 Montagem fácil | Alto (objetivo de "fácil de usar") | G |
| 9 Medição | Necessário | P (com o usuário) |

Se o tempo for curto, **0 → 1 → 2 → 3 → 4** já transformam o Tabletop de "editor com projetor" em "mesa de transmissão".

## 4. Fontes

- [Newsletter Ordem Paranormal, julho de 2025](https://ordemparanormal.com.br/newsletter/julho-2025) e a imagem de desenvolvimento citada em `docs/IMMERSION.md` §2
- [Jambô: impressões de Hexatombe](https://blog.jamboeditora.com.br/hexatombe-primeiras-impressoes-do-primeiro-episodio/)
- [Francês News: Hexatombe com cenários 3D e ferramenta proprietária](https://francesnews.com.br/post/2025/10/25/4355-ordem-paranormal-hexatombe-novo-spin-off-de-cellbit-estreia-com-cenarios-3d-e-tecnologia-de-ponta)
- [GeekPop News: anúncio de Hexatombe](https://geekpopnews.com.br/cellbit-anuncia-estreia-de-ordem-paranormal-hexatombe-o-spin-off-de-sangue/)
- [Mini Kraken (erpg.app)](https://erpg.app/) · [About](https://erpg.app/about/)
- [Sigil e D&D Beyond Maps](https://www.dndbeyond.com/posts/1918-sigil-and-d-d-beyond-maps-what-are-they-and-how-do) · [ferramentas do Sigil (Wargamer)](https://www.wargamer.com/dnd/project-sigil-tools)
- [BG3: Custom Mode (Prima Games)](https://primagames.com/news/baldurs-gate-3-custom-mode-finally-gives-players-missing-immersive-dd-options) · [Native Camera Tweaks e mods de câmera (Nexus)](https://www.nexusmods.com/baldursgate3/mods/742)
