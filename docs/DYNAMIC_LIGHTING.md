# Iluminação dinâmica

Implementada em 6 de outubro de 2026 sobre o renderer WebGL existente. Perfis por objeto, zonas espaciais, orçamento por janela e acabamento funcionam com os mesmos assets e comandos de histórico. Complementa [LIGHTING.md](LIGHTING.md), [ENVIRONMENTS.md](ENVIRONMENTS.md) e o [plano e estado das etapas](DYNAMIC_LIGHTING_PLAN.md).

## Começar

1. Em **Cena → Atmosfera → Ambientes e horários**, escolha **Interior acolhedor**, **Horror ritual** ou **Interior fluorescente**, além dos ambientes anteriores. Os presets oferecem valores iniciais editáveis e conservam objetos/fontes locais.
2. Selecione um objeto e abra **Luz neste objeto** nas Propriedades. Escolha **Vela / candelabro**, **Tocha / lareira**, **Lâmpada acolhedora**, **Fluorescente**, **Janela / vitral** ou **Luz ritual**. Ajuste cor, força, alcance e política de sombras.
3. Abra **Origem, direção e emissão**. Digite coordenadas locais ou use **Escolher origem clicando no objeto**. O marcador e a esfera/cone mostram origem e alcance somente no editor. Escolha um material luminoso pelo slot; emissão e luz incidente têm intensidades separadas.
4. Para uma sala, selecione seu piso e ative **Zona de ambiente**. Ajuste largura, altura, profundidade, centro, preenchimento e névoa. O contorno aparece quando o objeto está selecionado. Uma caixa não identifica automaticamente paredes ou portas.
5. Em **Cena → Atmosfera → Iluminação dinâmica e qualidade**, habilite os acabamentos desejados. Use **Revisão de legibilidade** para clarear temporariamente a janela de trabalho sem mudar o mapa ou o projetor.

Quatro estudos comuns e totalmente editáveis estão em **Abrir → Cenas → Cenas de exemplo**: capela ritual, taverna, escritório e rua chuvosa. A capela é um recorte de estudo do kit, não a reprodução completa da Igreja Antiga e de seu vale. Cada estudo tem enquadramentos geral, superior e interno. As animações começam pausadas para facilitar a comparação; desmarque **Pausar efeitos animados** para animar cintilação/chuva.

## Perfis, ajustes e biblioteca pessoal

O perfil aplica valores iniciais. Campos editados ficam fixados; em **Ajustes avançados e parâmetros fixados**, desmarque um campo para permitir que **Reaplicar perfil aos parâmetros livres** o recalcule. Origem e direção são conservadas. Assistida/Manual registram sua intenção de autoria; nenhuma alteração automática ocorre por frame ou ao carregar o mapa. Reaplicar é uma ação explícita em ambos os modos.

Os controles avançados incluem pontual/spot, abertura, penumbra, projeção/seed/rotação, dia/noite, prioridade, resolução solicitada e cintilação. O perfil fluorescente começa sem cintilação. Movimento reduzido, pausa e abas ocultas preservam as fontes estáticas.

**Copiar/Colar iluminação** transfere uma cópia dos valores locais, sem alterar o material inteiro. É possível colar em um objeto que ainda não tem fonte. **Sem fonte vinculada** remove a configuração; ela não reaparece sozinha. Cada objeto recebe uma fonte; um candelabro compartilha essa fonte entre suas velas. Para fontes independentes, use outros objetos ou as luzes manuais existentes.

Em **Meus perfis de iluminação**, salve, aplique, experimente, atualize, renomeie ou exclua um perfil. Até 100 perfis, com nomes únicos e revisão para detectar alterações concorrentes em outras abas. A biblioteca usa IndexedDB **no navegador/endereço atual, tanto no servidor quanto no Pages**, seguindo a biblioteca pessoal de pincéis. Não sincroniza dispositivos nem faz parte dos backups do servidor. Os valores aplicados ficam no mapa/cena e acompanham seu JSON, mesmo que a biblioteca pessoal seja apagada.

**Experimentar** um perfil pessoal ou desligar temporariamente uma fonte não modifica o documento nem transmite a prévia ao projetor. **Aplicar iluminação** aceita em um undo; **Cancelar** restaura o look. Uma edição cancela a prévia anterior. Edições, aplicação, remoção e cópia respeitam bloqueios e histórico; duplicações/andares/composições conservam coordenadas locais. Os controles numéricos continuam disponíveis para teclado e telas estreitas.

## Zonas e sombras

Até 16 caixas por documento, vinculadas às instâncias. A influência é calculada na posição mundial dos fragmentos: interior e exterior coexistem na mesma câmera, inclusive quando um objeto atravessa a borda. Maior prioridade prevalece nas sobreposições; a transição ocorre dentro dos limites da caixa. O preenchimento local substitui o difuso global nessa região. A névoa local substitui a densidade do volume horizontal na região, sem somar as duas densidades. Densidade zero abre uma área limpa dentro da névoa global.

Zonas seguem transformações/escala do objeto e são filtradas com ele na apresentação. O volume é artístico: não calcula conexões entre cômodos, exposição ao céu ou transmissão por portas. As sombras das malhas reais continuam responsáveis pela oclusão direta. Portas paramétricas abertas alteram a geometria que produz sombra; janelas/vãos reais continuam vazados.

**Manter sombras das paredes ocultas no recorte** conserva casters separados em uma camada usada apenas pelas câmeras de sombra. Paredes privadas ou desligadas na organização não são conservadas. Portas continuam seguindo seu estado real. O recurso cobre paredes paramétricas; ocultar coberturas/props por recorte exige um incremento posterior.

## Qualidade por janela

| Qualidade | Fontes locais ativas | Vistas de sombra locais | Resolução máxima local/sol | Névoa | AO/espalhamento |
| --- | --- | --- | --- | --- | --- |
| Econômica | 4 | 2 | 512 | 8 passos | Desligados |
| Equilibrada | 8 | 6 | 1.024 | 12 passos | Opcionais |
| Alta | 16 | 12 | 1.024 | 20 passos | Opcionais |
| Personalizada | 1–24 | 0–24 | 512/1.024/2.048 | 12 passos | Opcionais |

Uma sombra pontual consome seis vistas; uma spot, uma. Prioridade, influência no enquadramento e distância ao alvo da câmera selecionam fontes, com preferência de retenção para reduzir trocas. A esfera de alcance pode intersectar a vista mesmo com a origem fora dela. Fontes excedentes permanecem no documento e seus materiais continuam emissivos, mas deixam de iluminar a geometria nessa janela. O painel informa fontes/vistas e excedentes. Reduza alcance ou aumente prioridade da fonte importante quando necessário.

Sombras **Prioritárias** recebem preferência dentro do orçamento de fontes já selecionadas; **Desligadas** não consomem vistas. Fontes sem sombra podem atravessar paredes. Projeções de spot exigem uma sombra ativa; sem orçamento, a fonte usa sua cor sem o desenho. Cor/intensidade/cintilação preservam o cache de sombra; alterações espaciais invalidam as fontes afetadas. Sol/lua têm sombra adicional ao orçamento local, focada na área útil da vista e estabilizada em texels; objetos distantes dessa área podem ficar sem sua sombra.

O projetor tem seu seletor **Econômica/Equilibrada/Alta**, independente do editor. Preferências são da sessão de cada janela e não entram no documento ou histórico. Navegação e qualidade nunca publicam outra câmera. Fontes e zonas são derivadas somente depois de filtrar os objetos privados.

## Acabamento e limites

- **Vitral, grades e folhagem:** projeções procedurais de 128 px com seed/rotação, cache e descarte. A abertura do cone controla o tamanho. São modulações de uma spot, sem refração, cáusticas ou sombra colorida física do vidro.
- **Reflexos:** ambiente procedural pré-filtrado de baixa resolução, recalculado quando o ambiente muda. Realça metais e rugosidade; não reflete os objetos da sala nem oferece SSR, cubemaps locais ou importação HDR.
- **Contatos/AO:** GTAO com buffers em meia resolução, intensidade e raio em metros. Desligado na qualidade econômica. Helpers, efeitos decorativos e materiais transparentes não produzem AO. Não substitui sombras e pode ter artefatos nas bordas/objetos fora da tela.
- **Névoa iluminada:** integração por profundidade antes de bloom/saída, até quatro fontes e duas sombras spot. Pontuais não calculam oclusão no ar; use spots com sombra para feixes bloqueados por teto/parede. Padrões do vitral modulam a luz nas superfícies, não o desenho do feixe na névoa. Amostras limitadas com dither estável podem produzir granulação. Transparências sem escrita de profundidade usam a superfície opaca atrás delas; vidro não é tratado como barreira volumétrica.

A névoa tem no máximo um pixel físico por pixel CSS; a implementação inicial mantém essa resolução para a composição e reduz os passos por qualidade. As amostras se concentram nos intervalos ocupados pela névoa, evitando gastar o orçamento em espaço vazio de mapas grandes. Sem espalhamento/regiões, conserva a integração analítica anterior. Sem névoa global/local, o botão de espalhamento sozinho não cria névoa. Não há histórico temporal ou adaptação automática de exposição.

O pool mantém cardinalidade fixa por tipo (até N pontuais + N spots, com no máximo N ativas no total); fontes ociosas também têm custo de shader. Shadows/projeções ainda podem mudar variantes. Seleção e invalidação usam listas limitadas pelo documento, sem índice espacial de células. Medições em Chromium/SwiftShader verificam correção e reconciliação; não estabelecem FPS no notebook/projetor. Probes, GI, conexões de aberturas, polígonos de zona e calibração presencial continuam pendentes.

## Dados e verificação

Campos opcionais no schema 2: `entity.illumination`, `entity.lightingZone` e `look.rendering`. Documentos antigos permanecem válidos; as novas opções são opt-in. Configurações acompanham mapas/cenas, duplicações, JSON, histórico e persistência. Não são serializados luzes Three.js, texturas, casters, orçamento, preferências de qualidade ou frames.

`npm test` verifica domínio/contratos. `node --test tests/e2e/dynamic-lighting.test.js` verifica pixels, descarte, autoria, biblioteca, prévia, histórico, persistência e projetor no servidor/Pages. `node scripts/lighting-examples.js` regenera somente os quatro novos estudos; `node scripts/render-lighting-examples.js` usa o viewport real para gerar suas prévias, percorrer câmeras/qualidades e registrar identidade de recursos e métricas em `test-results/lighting-examples-metrics.json`. Não interpreta essas métricas como benchmark presencial.
