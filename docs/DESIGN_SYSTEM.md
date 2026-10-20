# Sistema visual da Mesa

Linguagem compartilhada entre o Tabletop, as fichas cinematográficas (*Ficha teste - Ordem II*), o Jukebox e um futuro plugin do Obsidian. A implementação vive em [src/ui/theme.css](../src/ui/theme.css), em duas camadas: **`eco`** (copiável sem mudança para outro projeto) e **`tt`** (específica do Tabletop). Origem do desenho: [UI_CINEMATIC_PLAN.md](UI_CINEMATIC_PLAN.md).

## Tokens `eco`

| Token | Valor | Uso |
|---|---|---|
| `--eco-font-display` | Georgia, serifada | nomes, títulos, cartazes, cartela do projetor; sempre 700 |
| `--eco-font-ui` | Hanken Grotesk (empacotada em `src/ui/fonts/`, SIL OFL 1.1) | texto de interface |
| `--eco-font-mono` | ui-monospace | números de tomada, teclas |
| `--eco-black` | `#07080c` | fundo de cartela, dica, barras de corte |
| `--eco-torn` / `--eco-torn-soft` | `clip-path` | etiqueta rasgada; botão de chamada |
| `--eco-ease`, `--eco-fast/mid/slow` | `cubic-bezier(.16,1,.3,1)`, 120/220/380 ms | movimento (só `opacity` e `transform`) |
| `--eco-fs-11 … 34` | 11, 12, 13, 14, 16, 20, 26, 34 px | escala tipográfica; 11 px só em eyebrow maiúsculo |
| `--eco-space-1 … 6` | 4 … 32 px | espaçamento |
| `--eco-radius-s/m/l` | 3, 6, 10 px | raios |

## Tokens por aplicação

| Aplicação | Cor da marca | Fonte de `--scene-accent` / `--cinematic-accent` |
|---|---|---|
| Tabletop | âmbar `#e3b878` | luz principal da cena (`sceneAccent`, [src/ui/scene-accent.js](../src/ui/scene-accent.js)) |
| Ficha | vermelho `#e91d25` | classe ou cor-tema da ficha |
| Jukebox | a definir (sugestão: azul-petróleo `#5fb3b3`) | cena musical ativa |
| Plugin Obsidian | herda o tema do Obsidian | — |

Camada `tt`: `--tt-bg`, `--tt-surface-1/2/3`, `--tt-line`, `--tt-line-strong`, `--tt-text`, `--tt-text-2`, `--tt-muted`, `--tt-accent`, `--tt-accent-strong`, `--tt-accent-ink`, `--tt-rec` (ao vivo), `--tt-gm` (só mestre), `--tt-ok/warn/danger`. `tests/theme.test.js` garante contraste (`--tt-muted` sobre `--tt-surface-1` ≥ 4,5; `--tt-text` sobre `--tt-bg` ≥ 12) e nenhuma fonte abaixo de 11 px.

Botões, foco, deslizantes e abas usam sempre `--tt-accent`; só claquete, cantoneiras, regras sob títulos, película de tomadas, retrato e cartela usam `--scene-accent`.

## Primitivas

| Primitiva | Equivalente na Ficha | Diferença que fica |
|---|---|---|
| `.tt-display` | `.cinematic-name h1` | no Tabletop o nome nunca usa `text-transform` (os testes leem `innerText`) |
| `.tt-tag` (etiqueta rasgada) | `.cinematic-section-heading span`, `.cinematic-left h2` | só em títulos e tipos; botões, campos e cartões ficam retos |
| `.tt-eyebrow` | rótulos de seção | — |
| `.tt-rule` | filete sob o título | degradê na cor da cena |
| `.tt-brackets` | `.cinematic-frame` | quatro "L" de visor, não bordas verticais rasgadas |
| `.cta` | botões de chamada | só tela de início e estados vazios |
| `[data-tip]` + `data-key` | — | dica com atalho ao lado; `data-tip-side="top"` |

Não vêm da Ficha: atmosfera crítica por PV, batimento e sons, fundo de mapa texturizado, glitch.

## Mapeamento para o Obsidian

| Mesa | Obsidian |
|---|---|
| `--eco-font-ui` | `--font-interface` |
| `--tt-accent` | `--interactive-accent` |
| `--tt-surface-1` | `--background-secondary` |
| `--tt-bg` | `--background-primary` |
| `--tt-text` | `--text-normal` |
| `--tt-muted` | `--text-muted` |

O plugin deve usar as variáveis do Obsidian e acrescentar só as primitivas `eco` (etiqueta rasgada, display).

## Extração futura

Quando o segundo projeto adotar os tokens, mover a camada `eco` de `theme.css` para um pacote local compartilhado (por exemplo `../mesa-ui/eco.css`, consumido por caminho relativo ou `file:` no `package.json`). Não foi feito: hoje só o Tabletop os usa.

## Integração

### Links diretos

Úteis em notas do Obsidian; abrem a cena no editor.

| Endereço | Efeito |
|---|---|
| `?scene=<id>` | abre uma cena salva |
| `?scene=<id>&shot=<idDaTomada>` | abre e **ensaia** a tomada; só a câmera de trabalho, **nunca** publica no projetor |
| `?example=<id>` | carrega uma cena de exemplo como cópia |
| `?map=<id>` | abre um mapa |

Id inválido avisa e inicia normalmente. O endereço acompanha a cena aberta (`history.replaceState`, preservando `?diagnostics`); o botão de cópia na claquete copia o link da cena salva.

### Vagas no trilho

[src/ui/ecosystem.js](../src/ui/ecosystem.js): `ECOSYSTEM_APPS = []`, formato `{ id, label, url, icon }`. Vazio por padrão; com itens, o trilho mostra um botão por app (nova aba, `rel="noopener"`).

### Contratos futuros (nada disto existe ainda)

- **Ficha → personagem:** campo `actor.sheetRef = { app: 'ficha-ordem-ii', sheetId }`. Exige mudança em `documents.js`, `validation.js` e migração; o cabeçalho já aceita `actorHero(..., { sheetSlot })` para PV/PD e "Abrir ficha".
- **Jukebox → cena:** `audioCue` é reservado e a validação hoje exige `null` (`src/domain/validation.js`). Formato proposto: `{ app: 'jukebox', sceneId, fade: seconds }`, disparado ao cortar uma tomada.
- **Barramento entre apps na mesma máquina:** `BroadcastChannel('mesa:<topic>')` com `{ version: 1, from: '<app>', type, payload }`; tópicos `scene`, `shot`, `actor`, `audio`. O Tabletop já usa `tabletop-presentation-<id>` para o projetor (mensagens `snapshot`, `camera`, `view`, `title`); não misturar.
- **Plugin Obsidian:** lê cenas pela API local e insere links `http://127.0.0.1:3001/?scene=<id>&shot=<id>`. Endpoints reais (`server/app.js`): `GET /api/tabletop/scenes`, `GET /api/tabletop/scenes/:id`, `GET /api/tabletop/scenes/:id/preview` (mesmas rotas para `maps` e `environments`), `GET /api/tabletop/assets`, `GET /api/tabletop/health`.
