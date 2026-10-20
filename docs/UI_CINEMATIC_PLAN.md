# Rework cinematográfico da interface — plano de implementação

Elaborado em 15 de outubro de 2026. Continua o [plano de reformulação da interface](UI_REWORK_PLAN.md), cujas etapas 1, 2 e 4 já foram entregues (controles, material com amostras, painel esquerdo). As etapas pendentes daquele plano (3, 5, 6, 7 e 8) foram absorvidas aqui, com a direção visual nova.

**Objetivo.** Dar ao Tabletop a linguagem visual das fichas cinematográficas do projeto *Ficha teste - Ordem II* (`/home/ilvro/Documents/Projects/Ficha teste - Ordem II`), para que os dois, o Jukebox e um futuro plugin do Obsidian pareçam um só ecossistema. Ao mesmo tempo, o Tabletop deve ter identidade própria e ficar mais fácil de usar. A metáfora do Tabletop é a **mesa de direção**: a cena é o set, os enquadramentos são **tomadas**, o projetor está **ao vivo** e o editor é o **ensaio**.

**Referências visuais** (capturas desta análise, 1600×950): [references/ui/cinematic/](references/ui/cinematic/)

| Arquivo | O que mostra |
|---|---|
| `ficha-cinematica-personagem.jpg` | Ficha cinematográfica: nome em serifada vermelha gigante, etiquetas "rasgadas", personagem recortado com contorno de luz, linhas de moldura nas bordas, carrossel de seleção embaixo |
| `ficha-navegador.jpg` | Trilho de ícones de 80 px + gaveta de navegação com busca Ctrl+K, filtros e pastas |
| `ficha-ameaca-livro.jpg` | Ficha de ameaça: etiquetas rasgadas pretas, tipografia editorial |
| `tabletop-atual-*.jpg` | Interface atual do Tabletop: início, Abrir, Construir, objeto selecionado, Ambiente, material |

---

## 0. Regras para quem implementa

1. **Leia antes**: `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/EDITOR_UI.md`, `docs/UI_REWORK_PLAN.md` e este plano inteiro. Para a Ficha, leia `src/systems/original/original-views.js` (função `renderCinematicOriginal`, a partir da linha ~913) e as regras `.cinematic-*` em `src/styles.css`. **Não edite nada no projeto da Ficha nem no Jukebox.**
2. **Formato do documento intocado.** Nenhuma fase muda `src/domain/documents.js`, `src/domain/validation.js` ou os comandos de `src/state/commands.js`. Tudo que é novo e não pertence à cena (aba aberta, tomada ensaiada, cartela de título) é estado de sessão do editor ou `localStorage` (sempre dentro de `try/catch`, como em `src/tutorial/tutor.js`).
3. **Câmera de trabalho × câmera publicada.** Navegar, ensaiar uma tomada ou abrir uma cena por link **nunca** publica no projetor. Só publicam as ações explícitas que já publicam hoje (`publishCamera`, `data-camera`, `data-camera-cut`, `publish-camera`, `camera-cut`, `camera-stop`) e as novas ações de "cortar" da fase 5.
4. **Contratos de seletor preservados.** Os testes E2E, os scripts de captura e as lições dos tutoriais dependem destes nomes. Eles continuam existindo com o mesmo significado, mesmo que o elemento mude de lugar:
   - `data-field`, `data-action`, `data-choice`, `data-hex`, `data-range`, `data-select`, `data-open`, `data-open-example`, `data-open-map`, `data-camera`, `data-camera-cut`, `data-camera-delete`, `data-environment`, `data-environment-preview`, `data-asset`, `data-dialog-tab`
   - `data-tab="build|elements|scene|assets"` dentro de um elemento com classe `tabs`, com `aria-pressed` na aba ativa (lido em `tests/e2e/asset-library.test.js:84`)
   - ids `side-content`, `inspector-content`, `scene-name`, `save-status`, `undo`, `redo`, `gesture-hint`, `tool-context`, `proposal-bar`, `tutorial-center`, `notice`, `viewport`, `view-tag`, `scene-summary`, `context-menu`, `assets-dialog`, `documents-dialog`, `asset-file`, `document-json-file`
   - classes `app-shell`, `app-header`, `sidebar-collapsed`, `inspector-collapsed`, `tool-strip`, `viewport-bottom .camera-strip`, `task-heading`, `object-title strong`, `floating-window`
   - ações `sidebar-toggle` e `inspector-toggle` (21 usos em 10 arquivos de teste)
5. **Atenção a `innerText`.** Os testes leem `.object-title strong` com `innerText()`, e o Chromium aplica `text-transform` ao `innerText`. Por isso o nome do objeto **não** pode usar `text-transform: uppercase`. `.task-heading` é lido com `allTextContents()` (que ignora o CSS) e pode ficar em maiúsculas via CSS. Nunca troque o texto no HTML por maiúsculas.
6. **Mudanças de teste permitidas** (só estas; qualquer outra tem que ser justificada em `progress.md`):
   - `tests/e2e/controls.js` → `reveal()` passa a conhecer a aba `shots` e as abas do inspetor (fase 3, código pronto abaixo);
   - `tests/e2e/tutorials.test.js:24` → `.app-header [data-action="tutorials"]` vira `[data-action="tutorials"]` (fase 2);
   - `tests/e2e/panel-consistency.test.js:23` → os títulos de Ambiente passam a ser `['Atmosfera']`, e um novo teste cobre a aba Tomadas (fase 5);
   - `scripts/capture-ui.js` e `scripts/capture-industrial.js` → novos seletores de aba.
7. **Sem dependências novas.** O projeto é JS puro com HTML gerado por funções e reconciliado no lugar (`src/ui/reconcile.js`). Nada de framework, biblioteca de componentes nem fonte por CDN (o build do GitHub Pages precisa funcionar offline com `base: './'`).
8. **Estilo de código.** Siga o arquivo vizinho: comentários em inglês, curtos, no estilo de `src/ui/controls.js`; textos de interface em pt-BR. Funções puras em módulos próprios, cobertas por `tests/*.test.js` (`node --test`).
9. **Movimento.** Toda animação nova respeita `prefers-reduced-motion: reduce`: some ou vira troca instantânea. Animações só de `opacity`/`transform`. Nunca `filter: blur` nem animação de altura em painel.
10. **Ao terminar cada fase:**
    - `npm test`
    - os E2E da fase (listados nela), com `node --test --test-concurrency=1 tests/e2e/<arquivo>.test.js`
    - `npm run build && node scripts/capture-ui.js docs/references/ui/cinematic/fase-N` e comparação com as capturas `tabletop-atual-*` e `ficha-*`
    - atualizar `progress.md` (feito, validação, pendências reais) e a seção **Andamento** no fim deste plano
    - **não** fazer commit sem pedido do usuário

---

## 1. Ponto de partida

### O que já está bom (manter)

- O kit de controles (`src/ui/controls.js`): faixa, medida, segmentos e amostras, todos escrevendo num campo nativo com `data-field`. Um arraste vira um passo de desfazer.
- Amostras de textura geradas pelo próprio gerador (`src/ui/swatches.js`).
- O painel esquerdo em três lugares (Construir · Elementos · Ambiente), as tarefas em um só nível (`taskList` em `src/ui/panel-disclosures.js`) e a busca e o filtro de Elementos.
- As janelas flutuantes (`src/ui/floating-window.js`) e os tutoriais com anel, ponto e cartão (`src/tutorial/tutor.js`).

### O que as capturas e o código mostram

| # | Problema | Evidência |
|---|---|---|
| 1 | **Visual genérico.** Escuro neutro com âmbar, sem relação com a Ficha. A fonte declarada (`Inter`) nem é carregada e cai na fonte do sistema. | `src/ui/styles.css`: só 3 variáveis CSS (`--accent`, `--muted`, `--border`) e **318** cores literais; nenhum `@font-face` |
| 2 | **Texto pequeno.** 79 declarações entre 7 e 11 px; eyebrows de 7–9 px em cinza sobre cinza. | `grep font-size src/ui/styles.css` |
| 3 | **Cabeçalho sobrecarregado.** Marca, nome da cena, 2 alternadores (Ferramentas/Propriedades) que parecem botões de ação, status e 7 botões (Nova, Abrir, Assets, Tutoriais, Apresentar, Salvar). | `tabletop-atual-03-construir.jpg` |
| 4 | **Moldura demais em volta da cena.** Cabeçalho de 76 px + rodapé de 31 px + barra de ferramentas + barra de câmera + dica de gestos + selo "Visão do mestre". Atalhos aparecem em dois lugares (rodapé e dica). A cena fica com ~1000×840 de 1600×950. | `application.js:84-106` |
| 5 | **Ferramentas sem nome.** 8 ícones sem rótulo na barra sobre a cena. | `tool-strip` |
| 6 | **Inspetor ainda é uma coluna longa.** Organização, Superfície de apoio, Andar/camada, Fixar, Escala visual e Material empilhados; o nome do objeto aparece duas vezes (título e campo "Nome"). A etapa 3 do plano anterior não foi feita. | `tabletop-atual-05-objeto.jpg`; `buildInspector` em `application.js:905` |
| 7 | **Selo "Visão do mestre" fixo e sem informação.** Não diz se há projetor conectado nem se a câmera do projetor é a mesma do editor, que é a distinção mais importante do produto (`AGENTS.md`). | `#view-tag` com texto fixo |
| 8 | **Enquadramento salvo sempre publica.** Clicar numa câmera salva move o editor **e** publica (`application.js:2335-2339`); não há como ensaiar uma tomada sem mostrá-la aos jogadores. | handler de `data-camera` |
| 9 | **Abrir é uma lista de texto com caixas vazias.** "Gerando prévia…" num retângulo escuro grande; título pequeno. | `tabletop-atual-02-abrir.jpg` |
| 10 | **Início genérico.** Cartão "Sua próxima história começa aqui" com um único caminho (desenhar sala). Exemplos e cenas salvas ficam escondidos em Abrir. | `tabletop-atual-01-inicio.jpg` |
| 11 | **Projetor sem acabamento.** `<select>` com estilo inline e botões sempre visíveis sobre a imagem projetada. | `startPresentation`, `application.js:2621` |
| 12 | **Não há como procurar um controle.** | — |
| 13 | **`application.js` monolítico** (2660 linhas, linhas de até 2200 caracteres). Toda mudança de interface passa por ele. | — |

---

## 2. Direção: a mesa de direção

### O que vem da Ficha (o DNA do ecossistema)

| Elemento da Ficha | Onde está lá | Como entra no Tabletop |
|---|---|---|
| Fundo preto-azulado com vinheta | `.cinematic-page:before` | Fundo do app, do trilho e das gavetas; vinheta só na moldura da cena |
| Serifada maiúscula para nomes (Georgia, 700) | `.cinematic-name h1` | Nome da cena na claquete, títulos de gaveta, nome do objeto (sem maiúsculas, ver regra 5), cartazes e cartela do projetor |
| **Etiqueta rasgada** (`clip-path` irregular) em cor de destaque | `.cinematic-left h2`, `.cinematic-section-heading span` | Títulos de grupo de tarefas, tipo do objeto, tipo de documento, abas da janela Abrir |
| Linhas finas de moldura nas bordas | `.cinematic-frame` | Cantoneiras de visor em volta da cena (versão do Tabletop, abaixo) |
| Destaque por documento (`--cinematic-accent` vem da classe ou da cor-tema) | `renderCinematicOriginal(..., accent)` | `--scene-accent` derivado da luz da cena |
| Hanken Grotesk para texto corrido | `@font-face` em `src/styles.css` | Fonte de interface |
| Personagem recortado com contorno de luz (filtro SVG) | `#token-controlled-outline` em `index.html` | Retrato do personagem no inspetor (fase 7) |
| Carrossel de seleção com anterior, atual e próximo | dock "Seleção de receptáculo" | Dock de tomadas no modo apresentação (fase 5) |
| Trilho de ícones + gaveta com busca Ctrl+K | `workspace-sidebar.js` | Trilho + gaveta (fase 2) e paleta Ctrl+K (fase 8) |

### O que é só do Tabletop (não copiar da Ficha)

| Tabletop | No lugar de (Ficha) |
|---|---|
| **Âmbar tungstênio** (`#e3b878`, a cor que o projeto já usa) como cor da marca | vermelho-sangue `#e91d25` |
| **Cantoneiras de visor**: quatro "L" nos cantos da cena, como numa câmera | moldura rasgada de bordas verticais |
| **Claquete**: nome da cena + tipo + "TOMADA n" (a revisão) + estado de gravação | cabeçalho de identidade da ficha |
| **REC / ENSAIO**: selo vivo dizendo se o projetor está conectado e se mostra o mesmo que o editor | — |
| **Película de tomadas** com miniaturas das câmeras salvas | lista de cards |
| **Corte de cena**: barras de letterbox que fecham e abrem ao trocar de cena | tremor "glitch" com som |
| **Cartela de título** no projetor | — |
| Rasgado **só** em etiquetas e títulos; botões, campos e cartões ficam retos e limpos (é uma ferramenta de edição usada por horas) | rasgado em quase tudo |

Também não trazer da Ficha: atmosfera crítica (vinhetas por PV), batimento cardíaco e sons, fundo de mapa texturizado, glitch.

---

## 3. Sistema visual

### 3.1 Arquivo de tokens

Criar `src/ui/theme.css`, importado na **primeira linha** de `src/ui/styles.css` (`@import './theme.css';`; o Vite resolve). Ele tem duas camadas: `eco` (copiável sem mudança para Ficha, Jukebox e plugin) e `tt` (específica do Tabletop).

```css
/* --- eco: shared by the Mesa ecosystem; keep app-agnostic --- */
@font-face { font-family: 'Hanken Grotesk'; src: url('./fonts/hanken-grotesk.woff2') format('woff2'); font-weight: 300 800; font-style: normal; font-display: swap; }
@font-face { font-family: 'Hanken Grotesk'; src: url('./fonts/hanken-grotesk-ext.woff2') format('woff2'); font-weight: 300 800; font-style: normal; font-display: swap; unicode-range: U+0100-024F, U+1E00-1EFF; }
:root {
  --eco-font-display: Georgia, 'Times New Roman', serif;
  --eco-font-ui: 'Hanken Grotesk', 'Segoe UI', system-ui, sans-serif;
  --eco-font-mono: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  --eco-black: #07080c;
  --eco-torn: polygon(2% 6%, 93% 0, 100% 11%, 95% 48%, 100% 91%, 8% 100%, 0 90%, 3% 54%, 0 17%);
  --eco-torn-soft: polygon(0 8%, 100% 0, 97% 92%, 3% 100%);
  --eco-ease: cubic-bezier(.16, 1, .3, 1);
  --eco-fast: 120ms; --eco-mid: 220ms; --eco-slow: 380ms;
  --eco-fs-11: 11px; --eco-fs-12: 12px; --eco-fs-13: 13px; --eco-fs-14: 14px; --eco-fs-16: 16px;
  --eco-fs-20: 20px; --eco-fs-26: 26px; --eco-fs-34: 34px;
  --eco-space-1: 4px; --eco-space-2: 8px; --eco-space-3: 12px; --eco-space-4: 16px; --eco-space-5: 24px; --eco-space-6: 32px;
  --eco-radius-s: 3px; --eco-radius-m: 6px; --eco-radius-l: 10px;
}
/* --- tt: Tabletop --- */
:root {
  color-scheme: dark;
  --tt-bg: #0d0f14;          /* app background, rail */
  --tt-surface-1: #13151c;   /* drawers, inspector, slate */
  --tt-surface-2: #1a1d26;   /* cards, inputs */
  --tt-surface-3: #232735;   /* hover, pressed */
  --tt-line: #2b2f3d;
  --tt-line-strong: #3b4052;
  --tt-text: #eceae4;
  --tt-text-2: #b9bbc4;
  --tt-muted: #8b8f9c;       /* >= 4.5:1 on surface-1 */
  --tt-accent: #e3b878;      /* brand: tungsten */
  --tt-accent-strong: #f0ca91;
  --tt-accent-ink: #1d1a14;  /* text on accent */
  --tt-accent-wash: color-mix(in srgb, var(--tt-accent) 14%, transparent);
  --tt-rec: #e5483d;         /* live on projector */
  --tt-gm: #a48cf0;          /* GM-only content */
  --tt-ok: #79b38c; --tt-warn: #e0a24a; --tt-danger: #e2574c;
  --scene-accent: var(--tt-accent); /* overwritten per scene, see 3.4 */
  --rail-w: 64px; --drawer-w: 320px; --inspector-w: 340px; --slate-h: 52px;
}
```

- **Fontes:** copie `public/fonts/hanken-grotesk.woff2` e `hanken-grotesk-ext.woff2` da Ficha para `src/ui/fonts/`. As URLs relativas fazem o Vite empacotar e versionar os arquivos, e isso funciona no build do Pages (`base: './'`); **não** use `public/` com URL absoluta. Crie `src/ui/fonts/README.md` com uma linha: "Hanken Grotesk, SIL Open Font License 1.1 (Google Fonts)".
- **Escala tipográfica**, com mínimos obrigatórios: 11 px apenas em eyebrow maiúsculo com `font-weight: 700` e `letter-spacing: .12em`; 12 px para rótulo; 13 px para valor e texto corrido; 14 px para nome de tarefa; 16 px para título de painel; 20, 26 e 34 px para display. Nenhum `font-size` abaixo de 11 px no CSS final (há teste na fase 1).

### 3.2 Primitivas (em `src/ui/theme.css`, depois dos tokens)

```css
.tt-display { font-family: var(--eco-font-display); font-weight: 700; letter-spacing: -.01em; line-height: 1.02; color: var(--tt-text); }
.tt-eyebrow { font: 700 var(--eco-fs-11)/1.2 var(--eco-font-ui); letter-spacing: .12em; text-transform: uppercase; color: var(--tt-muted); }
/* Torn tag: headings and kinds only, never on buttons or inputs. */
.tt-tag { display: inline-block; width: max-content; padding: 5px 14px 6px; background: var(--tag-bg, var(--tt-accent)); color: var(--tag-ink, var(--tt-accent-ink));
  font: 700 var(--eco-fs-13)/1.1 var(--eco-font-display); letter-spacing: .04em; text-transform: uppercase; clip-path: var(--eco-torn); }
.tt-tag.is-scene { --tag-bg: var(--scene-accent); }
.tt-tag.is-dark { --tag-bg: var(--eco-black); --tag-ink: var(--tt-text); }
.tt-tag.is-gm { --tag-bg: var(--tt-gm); --tag-ink: #120d22; }
.tt-tag.is-small { padding: 3px 10px 4px; font-size: var(--eco-fs-11); }
/* Accent rule that fades out, under drawer and inspector headings. */
.tt-rule { height: 1px; background: linear-gradient(90deg, color-mix(in srgb, var(--scene-accent) 70%, transparent), transparent 85%); }
/* Viewfinder corners; the host must be position:relative. */
.tt-brackets { position: absolute; inset: 14px; pointer-events: none; z-index: 1;
  --b: color-mix(in srgb, var(--scene-accent) 65%, transparent); --l: 28px;
  background:
    linear-gradient(var(--b), var(--b)) top left / var(--l) 1.5px no-repeat, linear-gradient(var(--b), var(--b)) top left / 1.5px var(--l) no-repeat,
    linear-gradient(var(--b), var(--b)) top right / var(--l) 1.5px no-repeat, linear-gradient(var(--b), var(--b)) top right / 1.5px var(--l) no-repeat,
    linear-gradient(var(--b), var(--b)) bottom left / var(--l) 1.5px no-repeat, linear-gradient(var(--b), var(--b)) bottom left / 1.5px var(--l) no-repeat,
    linear-gradient(var(--b), var(--b)) bottom right / var(--l) 1.5px no-repeat, linear-gradient(var(--b), var(--b)) bottom right / 1.5px var(--l) no-repeat; }
/* Big call to action only (start screen, empty states). */
.cta { clip-path: var(--eco-torn-soft); font-family: var(--eco-font-display); font-weight: 700; letter-spacing: .04em; text-transform: uppercase; min-height: 44px; padding: 10px 22px; }
/* Tooltip with shortcut: <button data-tip="Mover" data-key="G"> */
[data-tip] { position: relative; }
[data-tip]:hover::after, [data-tip]:focus-visible::after { content: attr(data-tip) '  ' attr(data-key); position: absolute; left: calc(100% + 10px); top: 50%; translate: 0 -50%;
  white-space: pre; padding: 5px 9px; border-radius: var(--eco-radius-s); background: var(--eco-black); color: var(--tt-text); font: 600 var(--eco-fs-12) var(--eco-font-ui); z-index: 50; pointer-events: none; }
[data-tip-side="top"]:hover::after, [data-tip-side="top"]:focus-visible::after { left: 50%; top: auto; bottom: calc(100% + 8px); translate: -50% 0; }
```

### 3.3 Componentes base (reestilizar em `styles.css`; os nomes de classe ficam)

| Componente | Novo estilo |
|---|---|
| `button` | fundo `--tt-surface-2`, borda `--tt-line`, raio `--eco-radius-m`, `--eco-fs-13`, altura mínima 34 px; hover `--tt-surface-3` com borda `--tt-line-strong` |
| `.primary` | fundo `--tt-accent`, texto `--tt-accent-ink`, peso 700; hover `--tt-accent-strong` |
| `.quiet` | transparente; hover `--tt-surface-3` |
| `input`, `select`, `textarea` | fundo `--tt-surface-2`, borda `--tt-line`; foco com `outline: 2px solid var(--tt-accent); outline-offset: 2px`; valores numéricos com `tabular-nums` |
| `input[type=range]` (do `numberField`) | trilho de 3 px em `--tt-line-strong`, preenchimento em `--tt-accent` (via `accent-color`), polegar de 14 px |
| `.segments`, `.chips`, `.swatches` (de `choiceField`) | ativo com borda e texto `--tt-accent` e fundo `--tt-accent-wash` |
| `.task-heading` (h3 de `taskList`) | vira `.tt-tag.is-small` + margem superior de 22 px. Mantém o texto original (o teste lê com `allTextContents`) |
| `details.task > summary` | nome em 14 px/600 `--tt-text`, descrição 12 px `--tt-muted`; chevron em `--tt-accent`; aberto ganha barra de 2 px à esquerda em `--tt-accent` |
| `.eyebrow` (títulos de `section`) | igual a `.tt-eyebrow` |
| `.floating-window` | fundo `--tt-surface-1`, borda `--tt-line`, sombra `0 24px 60px #000a`, cabeçalho com título `.tt-display` 20 px |
| `.tutor-card` | fundo `--eco-black` com borda superior de 2 px em `--scene-accent`; eyebrow da lição como `.tt-tag.is-small` |
| barras de rolagem | `scrollbar-color: var(--tt-line-strong) transparent` |

### 3.4 Destaque da cena (`--scene-accent`)

Criar `src/ui/scene-accent.js` com uma função pura:

```js
/** The scene's own accent: the key light's colour made readable on dark UI; the brand accent when the light is grey. */
export function sceneAccent(look, fallback = '#e3b878') { /* … */ }
```

- **Entrada:** `doc.look ?? doc.defaultLook`. **Fonte da cor**, nesta ordem: a luz com `role === 'key'` (o mesmo critério de `moon()` em `src/tutorial/conditions.js`); se não houver, a cor da névoa ou do céu do ambiente (procure os campos reais em `src/domain/environments.js`); se não houver nada, o `fallback`.
- **Transformação:** converter para HSL; se a saturação for menor que 0,12, devolver o `fallback`; senão limitar a saturação a [0,35; 0,75] e a luminosidade a [0,62; 0,72] e devolver em `#rrggbb`.
- **Aplicação:** no `updateView`, `root.querySelector('.app-shell').style.setProperty('--scene-accent', sceneAccent(look))`, só quando o valor muda.
- **Onde aparece:** claquete, cantoneiras, regra sob títulos, película de tomadas, retrato do personagem, cartela do projetor. Botões, foco, deslizantes e abas continuam em `--tt-accent`, para que os controles não mudem de cor entre cenas.
- **Teste:** `tests/scene-accent.test.js` com luz quente, luz fria azul, luz branca (devolve o fallback), sem luzes e luminosidade extrema.

---

## 4. Nova estrutura da tela

```
┌────┬──────────────────────────────────────────────────────────────────────────────┐
│ T  │ [CENA] CASA DE BAIRRO · JARDIM E QUINTAL   TOMADA 12 · ● salvo   ↶ ↷  ◉ AO VIVO  [Apresentar] [Salvar] │ ← claquete 52px (.app-header)
│────├───────────────┬──────────────────────────────────────────┬───────────────────┤
│ ⌂  │ [CONSTRUIR] « │ ⌜                                     ⌝ │ [OBJETO]        ⇥ │
│ ☰  │ ───────────── │ ▣ Selecionar Q                          │ Sofá de sala       │ ← nome em serifada 26px
│ ☀  │ [CONSTRUÇÕES] │ ✥ Mover G                               │ ⌖ ⧉ 🗑            │
│ 🎬 │  Sala       › │ ⟳ Girar R          cena 3D              │ Posição│Aparência│ │
│ ── │  Prédio     › │ ⤢ Escala V                              │ Luz│Organização   │
│ ▦  │ [PAISAGEM]    │ ─                                       │ ┌───────────────┐ │
│ 📂 │  Terreno    › │ 📏 Régua M                              │ │ X  Y  Z       │ │
│ ── │  …            │ 💧 Conta-gotas I                        │ └───────────────┘ │
│ ?  │               │ ⌞      dica de gesto / colocação      ⌟ │                   │
│ 🎓 │               │ [Persp][Sup][Enq] [Interior][Telhados] [⛶] · 171 elementos · grid 1 m · ? │ ← HUD
│ •  │               │                                          │                   │
└────┴───────────────┴──────────────────────────────────────────┴───────────────────┘
 trilho  gaveta 320     palco                                     inspetor 340
```

### 4.1 Grade

```css
.app-shell { display: grid; height: 100dvh; background: var(--tt-bg);
  grid-template-columns: var(--rail-w) var(--drawer-w) minmax(0, 1fr) var(--inspector-w);
  grid-template-rows: var(--slate-h) minmax(0, 1fr);
  grid-template-areas: "rail slate slate slate" "rail drawer stage inspector"; }
.app-shell.sidebar-collapsed { --drawer-w: 0px; }
.app-shell.inspector-collapsed { --inspector-w: 0px; }
.rail { grid-area: rail; } .app-header { grid-area: slate; } .sidebar { grid-area: drawer; } .workspace { grid-area: stage; } .inspector { grid-area: inspector; }
```

- A gaveta e o inspetor recolhidos ficam com `overflow: hidden; visibility: hidden` quando a largura é 0, para não receberem foco.
- **≤ 900 px** (o `compactLayout` existente): o trilho vira barra inferior de 56 px (`grid-template-areas: "slate" "stage" "rail"`), e gaveta e inspetor abrem como folhas sobre a cena, uma por vez. A lógica das classes `*-collapsed` em `application.js:162-176` continua.

### 4.2 Trilho (`<nav class="rail">`)

De cima para baixo:

1. **Marca**: `<a class="brand">` com o "T" em `--tt-accent`, recorte `--eco-torn-soft`, 40×40 px. Mantém o link atual.
2. **Lugares de edição**, dentro de `<div class="tabs rail-tabs" role="toolbar" aria-label="Painéis">`. Cada um é um botão com ícone de 22 px e rótulo de 11 px abaixo; o ativo tem `aria-pressed="true"`, barra de 3 px à esquerda em `--tt-accent` (como `.nav-btn.active:before` da Ficha) e ícone em `--tt-accent`. Mantenha o `aria-pressed` que o código já usa.
   - `data-tab="build"` Construir (ícone `room`)
   - `data-tab="elements"` Elementos (ícone novo `layers`)
   - `data-tab="scene"` Ambiente (`sun`)
   - `data-tab="shots"` **Tomadas** (`camera`), nova na fase 5. Até lá, não renderizar.
3. Separador.
4. **Janelas:** `data-tab="assets"` Assets (`frame`, mantém `aria-controls="assets-dialog"`), `data-action="open"` Abrir (`folder`), `data-action="new"` Nova (`plus`).
5. Espaço flexível.
6. **Ajuda:** `data-action="command-palette"` Buscar (`search`, novo, fase 8), `data-action="shortcuts"` Atalhos (`?`, fase 8), `data-action="tutorials"` Tutoriais (ícone novo `cap`; mantém `aria-expanded` e `aria-controls="tutorial-center"`).
7. **Armazenamento:** `<span class="storage-dot" title="Sua mesa, no seu computador.">` (ou o texto do navegador). Substitui o rodapé `.sidebar-footer`.

Todos os botões do trilho têm `data-tip` e, quando houver, `data-key`. Clicar na aba que já está ativa recolhe ou abre a gaveta: chame o mesmo código de `case 'sidebar-toggle'` (`application.js:2097`), extraído para `togglePanel('sidebar')`.

### 4.3 Gaveta (`<aside class="sidebar">`)

- **Cabeçalho:** `.tt-tag` com o nome do lugar (CONSTRUIR, ELEMENTOS, AMBIENTE, TOMADAS) + botão `«` com `data-action="sidebar-toggle"` e `aria-controls="side-content"`; abaixo, `.tt-rule`.
- **Corpo:** `#side-content`, sem mudanças de conteúdo nesta fase.

### 4.4 Claquete (`<header class="app-header">`)

Altura 52 px, fundo `--tt-surface-1`, borda inferior `--tt-line`.

- **Esquerda:**
  - `.tt-tag.is-small.is-scene` com CENA ou MAPA (reaproveita a lógica de `#doc-type-eyebrow`; o id pode virar o da etiqueta);
  - `#scene-name` em `.tt-display` 20 px, sem maiúsculas (o usuário digita ali);
  - `<span class="take">TOMADA <b>12</b></span>` em `--eco-font-mono` 12 px `--tt-muted`, onde 12 é `store.document.revision` (ou "RASCUNHO" sem revisão);
  - `#save-status` (mantém id e classes `unsaved`).
- **Direita:**
  - `#undo` e `#redo` (saem da barra de ferramentas; mantêm `data-action`, `id`, `title` e `aria-label`);
  - selo `#view-tag` (4.6);
  - `data-action="present"` **Apresentar**;
  - `data-action="save"` **Salvar** (`.primary` só quando houver alterações não salvas; senão `.quiet`).
- **Somem do cabeçalho:** os alternadores Ferramentas e Propriedades (viram `«` na gaveta e `⇥` no inspetor), Nova, Abrir, Assets e Tutoriais (vão para o trilho).
- No modo apresentação, `.app-header` continua sendo escondida (teste `editor.test.js:162`).

### 4.5 Palco (`<main class="workspace">`)

- `<div class="tt-brackets" aria-hidden="true"></div>` como primeiro filho depois de `#viewport`.
- **Barra de ferramentas** (`.tool-strip`): vertical, presa no canto superior esquerdo do palco (`left: 14px; top: 14px`), botões de 40×40 com `data-tip` e `data-key`, em grupos (Selecionar, Mover, Girar, Escala | Régua, Conta-gotas). O teste da régua exige `x + width <= 430`, e o layout vertical cumpre isso.
- **HUD inferior** (`.viewport-bottom`): uma só barra com `.camera-strip` à esquerda (mesmos botões); à direita `#scene-summary` (sai do rodapé) e o botão `?` de atalhos. `#gesture-hint` vira legenda centralizada **acima** do HUD. O conteúdo continua sendo escrito pelo código atual, porque os testes leem "Clique no piso"; o texto fixo de gestos só aparece quando nenhuma outra dica está ativa.
- **Remover** `<footer class="statusbar">`. O texto de atalhos vai para a folha de atalhos (fase 8).
- `#tool-context`, `#proposal-bar`, `#tutorial-center` e `#notice` continuam onde estão, com o novo visual.

### 4.6 Selo de estado (`#view-tag`)

Função `viewState()` em `application.js`, perto de `publishCamera`:

| Condição | Texto | Estilo |
|---|---|---|
| `isPresentation` | `PRÉVIA DO PROJETOR` | `.tt-tag.is-small` com `--tt-rec` |
| algum projetor conectado (`receivers` com batimento há menos de 20 s) e câmera de trabalho ≈ publicada | `● AO VIVO` | ponto `--tt-rec` pulsando (2 s; estático com movimento reduzido) |
| projetor conectado e câmera de trabalho ≠ publicada | `ENSAIO · projetor em outra tomada` | contorno `--tt-rec` |
| sem projetor | `ENSAIO` | `--tt-muted` |

- "≈" compara posição e alvo da câmera com tolerância de 1 cm e FOV igual.
- Recalcular no `message` do canal (`ready`, `heartbeat`, `closed`), em `publishCamera`, ao alternar `present` e no fim de cada movimento de câmera. Use `requestAnimationFrame` com descarte: no máximo uma atualização por quadro, e só escrever no DOM se o texto mudar.
- Clicar no selo quando está em "ENSAIO · projetor em outra tomada" publica a câmera atual (o mesmo que `publish-camera`), com `title` explicando isso.

### 4.7 Inspetor (`<aside class="inspector">`)

- **Cabeçalho do painel:** `PROPRIEDADES` como `.tt-eyebrow` + botão `⇥` com `data-action="inspector-toggle"` e `aria-controls="inspector-content"`.
- **Conteúdo:** fase 3.

---

## 5. Fases

Ordem: F0 → F1 → F2 → F3 → (F4, F5, F7 em qualquer ordem) → F6 (depende de F5) → F8 (depende de F3) → F9 (opcional) → F10. Cada fase pode ser entregue sozinha.

### F0 — Fundação, sem mudança visual intencional

**Objetivo:** tirar o HTML do shell de `application.js` e trocar as cores literais por tokens, para que as fases seguintes mexam em um lugar só.

**Passos**

1. Criar `src/ui/shell.js` com:
   - `export function shellMarkup({ storage, homeURL })`, que devolve **literalmente** o HTML hoje em `application.js:84-127`;
   - o helper `button` (`application.js:71`), exportado.
   
   Em `application.js`: `root.innerHTML = shellMarkup({ storage: repository.storage, homeURL: applicationURL('') })` e `import { button } from '../ui/shell.js'`. Rodar `grep -n "button(" src/app/application.js` para garantir que todos os usos continuam importados.
2. Criar `src/ui/theme.css` com a camada `eco` e a camada `tt` **provisória**, com os valores atuais:

   | Token provisório | Valor atual |
   |---|---|
   | `--tt-bg` | `#171c20` |
   | `--tt-surface-1` | `#20262a` |
   | `--tt-surface-2` | `#292f34` |
   | `--tt-surface-3` | `#353d42` |
   | `--tt-line` | `#343a3e` |
   | `--tt-line-strong` | `#42494e` |
   | `--tt-text` | `#ece8df` |
   | `--tt-text-2` | `#c0c6c5` |
   | `--tt-muted` | `#8e999f` |
   | `--tt-accent` | `#e3b878` |
   | `--tt-accent-strong` | `#f0ca91` |
   | `--tt-accent-ink` | `#272922` |

3. Escrever `scripts/audit-css-tokens.js` (Node, sem dependências): lista cada cor literal de `src/ui/styles.css` com contagem e sugere o token mais próximo pela distância em RGB. Rodar, revisar e substituir. Regras:
   - fundos pela faixa de luminância → `surface-*`;
   - bordas → `line*`;
   - texto → `text*` ou `muted`;
   - família âmbar (`#e4c38e #efcd97 #ebcb99 #f0d5a4 #dec49a #bd9d68`) → `--tt-accent` ou `--tt-accent-strong`;
   - fundos tingidos de âmbar (`#312d25 #3a3327 #423726`) → `color-mix(in srgb, var(--tt-accent) N%, var(--tt-surface-1))`.
   
   Cores **semânticas** (verde de salvo, vermelho de excluir, cores de pré-visualização de ambiente) viram `--tt-ok`, `--tt-danger` e assim por diante. Ficam como literais **só** cores que representam dados (ex.: amostra de cor de luz).
4. Mover para classes os 4 `style="…color|background…"` dos módulos JS (`grep -rn 'style="[^"]*\(color\|background\)' src --include=*.js`).
5. `--muted`, `--border` e `--accent` antigos viram apelidos (`--accent: var(--tt-accent)` etc.) até o fim da F2; depois, remover.

**Aceite:** `grep -cE '#[0-9a-fA-F]{3,8}\b' src/ui/styles.css` ≤ 15; `npm test` passa; capturas da F0 praticamente idênticas a `tabletop-atual-*`.

**E2E:** `editor-ui`, `panel-consistency`, `controls`, `editor`.

---

### F1 — Identidade visual

**Objetivo:** aplicar a paleta, as fontes e as primitivas. Nenhuma mudança de estrutura.

**Passos**

1. Trocar os valores provisórios da F0 pelos definitivos da seção 3.1 e adicionar as fontes (3.1).
2. Adicionar as primitivas da seção 3.2 e reestilizar os componentes da tabela 3.3.
3. Aplicar a escala tipográfica: `node -e` ou um script que liste os `font-size` < 11 px e substitua por `var(--eco-fs-11)` (só eyebrow) ou `var(--eco-fs-12)`. Todo `font-size` passa a usar token.
4. `body { font-family: var(--eco-font-ui); font-size: var(--eco-fs-13); background: var(--tt-bg); color: var(--tt-text); }`.
5. Títulos `h2` (já em Georgia) → `.tt-display`.
6. **Janela Abrir:** abas `dialog-tabs` com o ativo como `.tt-tag.is-small`, os outros em texto `--tt-muted`.
7. **Teste novo `tests/theme.test.js`:** lê `src/ui/styles.css` e `src/ui/theme.css` e verifica:
   - nenhum `font-size` literal abaixo de 11 px;
   - `--tt-muted` sobre `--tt-surface-1` com contraste ≥ 4,5 (função de luminância relativa WCAG no próprio teste);
   - `--tt-text` sobre `--tt-bg` ≥ 12.

**Aceite:** as capturas mostram tipografia Hanken + títulos serifados, as etiquetas de grupo de tarefa rasgadas em âmbar e texto mínimo legível. O build do Pages (`npm run build:pages && npm run preview:pages`) carrega as fontes (conferir na aba Network ou com `document.fonts.check('13px "Hanken Grotesk"')` no E2E `pages`).

**E2E:** `editor-ui`, `panel-consistency`, `controls`, `tutorials` (o anel do tutor continua alinhado), `pages`.

---

### F2 — Shell: trilho, gaveta, claquete e palco

**Objetivo:** a estrutura da seção 4.

**Arquivos:** `src/ui/shell.js`, `src/ui/styles.css`, `src/ui/icons.js` (ícones novos `layers`, `search`, `cap`, `help`, `rec`; mesmo estilo: traço 1,65, `viewBox` 0 0 24 24), `application.js` (handlers), `src/ui/shortcuts.js` (novo).

**Passos**

1. **`src/ui/shortcuts.js`**, fonte única dos atalhos:
   ```js
   export const SHORTCUTS = [
     { group: 'Ferramentas', items: [['Q', 'Selecionar'], ['G', 'Mover'], ['R', 'Girar'], ['V', 'Escala'], ['M', 'Régua'], ['I', 'Conta-gotas'], ['T', 'Esculpir terreno'], ['F', 'Enquadrar seleção']] },
     { group: 'Câmera', items: [['W A S D', 'Andar'], ['Shift', 'Mais rápido'], ['Espaço / Ctrl', 'Subir / descer'], ['Page Up / Down', 'Altura'], ['Botão direito', 'Órbita'], ['Scroll', 'Zoom']] },
     { group: 'Edição', items: [['Ctrl+Z', 'Desfazer'], ['Ctrl+Shift+Z / Ctrl+Y', 'Refazer'], ['Ctrl+D', 'Duplicar'], ['Ctrl+C / V', 'Copiar / colar objeto'], ['Ctrl+Shift+C / V', 'Copiar / colar material'], ['Delete', 'Excluir'], ['Ctrl+S', 'Salvar'], ['Esc', 'Cancelar / sair']] },
     { group: 'Encontrar', items: [['Ctrl+K', 'Buscar qualquer coisa'], ['?', 'Esta lista']] },
   ];
   export const keyFor = label => SHORTCUTS.flatMap(g => g.items).find(([, name]) => name === label)?.[0] ?? '';
   ```
   Confira cada atalho contra o `keydown` em `application.js:2492` e o controle de câmera em `src/render/renderer.js`. A lista tem que dizer a verdade.
2. **Reescrever `shellMarkup`** com trilho, claquete, palco e inspetor (seção 4), mantendo todos os ids, classes e `data-*` da regra 0.4. `.tabs` agora fica dentro do trilho. `#doc-type-eyebrow` vira a etiqueta da claquete. Os diálogos (`documents-dialog`, `assets-dialog`, `recovery-dialog`, etc.) continuam iguais.
3. **Handlers:**
   - `togglePanel(key)` extraído do `case 'sidebar-toggle'`;
   - clique na aba ativa do trilho → `togglePanel('sidebar')`;
   - em `syncPanelToggles`, sincronizar `aria-expanded` dos botões `«`/`⇥` **e** do botão da aba ativa;
   - `data-action="tutorials"` continua com o mesmo handler, só mudou de lugar.
4. **Claquete:** função `renderSlate()`, chamada de `updateView`, escreve tipo, revisão (`TOMADA n`) e classe do Salvar. Use `textContent` e `classList`; nada de `innerHTML` a cada mudança.
5. **Selo de estado:** implementar `viewState()` e `renderViewTag()` (4.6).
6. **Palco:** barra vertical; HUD com `#scene-summary`; remover `.statusbar` e `.sidebar-footer`; `#gesture-hint` como legenda.
7. **Teste:** `tests/e2e/tutorials.test.js:24` → `[data-action="tutorials"]`.
8. **Novo E2E `tests/e2e/shell.test.js`:**
   - trilho com 3 lugares + Assets + Abrir + Nova + Tutoriais;
   - clicar 2× em Construir recolhe e reabre a gaveta (`.app-shell.sidebar-collapsed` alterna);
   - `#undo` e `#redo` dentro de `.app-header`;
   - `#view-tag` diz `ENSAIO` sem projetor; abrir `presentation-window` (popup do Playwright, como em `editor.test.js:147`) passa a `● AO VIVO`; mover a câmera com WASD passa a `ENSAIO · projetor em outra tomada`; clicar no selo volta a `AO VIVO`;
   - largura 800 px: trilho embaixo, gaveta e inspetor fechados, abrir um fecha o outro.

**Aceite:** área da cena em 1600×950 ≥ 1170×898 (antes ~1000×840), medida com `page.locator('#viewport').boundingBox()` no E2E novo, com gaveta e inspetor abertos.

**E2E:** suíte inteira (`npm run test:e2e`). É a fase que mais mexe em posição; rode tudo e corrija as quebras sem mudar o significado dos testes.

---

### F3 — Inspetor cinematográfico: cabeçalho e abas

**Objetivo:** etapa 3 do plano anterior, com o cabeçalho no estilo da ficha.

**Arquivos:** `src/ui/inspector-tabs.js` (novo), `application.js` (`buildInspector`, `organizeInspector`), `styles.css`, `tests/e2e/controls.js`, `src/tutorial/tutor.js`.

**Passos**

1. **Cabeçalho** (`.object-title.inspector-hero`), mantendo `.object-title strong` = nome:
   ```html
   <div class="object-title inspector-hero">
     <span class="tt-tag is-small">OBJETO</span>            <!-- TOKEN / LUZ / PISO / PAREDE / PORTA / JANELA / TERRENO / ÁGUA / COMPOSIÇÃO -->
     <strong class="tt-display">Sofá de sala</strong>        <!-- 26px, no uppercase (rule 0.5) -->
     <small class="hero-meta">Térreo · 03 · Sala e jantar</small>   <!-- level · folder, when present -->
     <div class="hero-actions">
       <button data-action="frame" data-tip="Enquadrar" data-key="F">…</button>
       <button data-action="object-duplicate" data-tip="Duplicar" data-key="Ctrl+D">…</button>
       <button data-action="object-delete" class="danger" data-tip="Excluir" data-key="Delete">…</button>
     </div>
   </div>
   ```
   - Objeto marcado "Somente para o mestre": `.tt-tag.is-gm` "SÓ MESTRE" ao lado do tipo.
   - O campo `Nome` (`data-field` atual) continua existindo e vai para a aba Organização. O cabeçalho fica só para leitura; o duplo clique no nome foca esse campo.
   - Use o rótulo de tipo já calculado em `showContextMenu` (`application.js:292`), extraído para `kindLabel(found)` e reaproveitado nos dois lugares.
2. **`src/ui/inspector-tabs.js`:**
   ```js
   export const INSPECTOR_TABS = [
     { id: 'position', label: 'Posição', icon: 'move' },
     { id: 'look', label: 'Aparência', icon: 'eyedropper' },
     { id: 'light', label: 'Luz', icon: 'light' },
     { id: 'organize', label: 'Organização', icon: 'folder' },
   ];
   const RULES = [
     ['position', /^(POSIÇÃO|DIMENSÕES|ESCALA VISUAL|CONTORNO LOCAL|ABERTURA NA PAREDE|ABERTURAS E PAREDES|JANELA HOSPEDADA|ACESSO ENTRE ALTURAS|ANDARES CONECTADOS|RECORTES DO PISO|FIXAR|SUPERFÍCIE DE APOIO|BASE · METROS|ÁREA DO TERRENO|ALTURA DE UM VÉRTICE)/],
     ['look', /^(PINCEL DE SUPERFÍCIE|MATERIAL|MATERIAIS DA SELEÇÃO|COR|CORES|DESENHO|DESGASTE|TELA$|DECALQUE|VEGETAÇÃO|GEOMETRIA DA ROCHA|ÁGUA \/ GELO|EFEITO LOCAL|EFEITO DE TUBO|FOGO E FUMAÇA|CABO|LINHAS|BARRA DE PROGRESSO|DETALHES)/],
     ['light', /^(ILUMINAÇÃO|LUZ NESTE OBJETO|LUZ DO CÔMODO|ZONA DE AMBIENTE|OBJETOS QUE ACENDEM)/],
     ['organize', /^(ORGANIZAÇÃO|ANDAR \/ CAMADA|APRESENTAÇÃO)/],
   ];
   /** Which tab a section belongs to, by its eyebrow title; null when unmapped. */
   export const inspectorTabFor = title => RULES.find(([, rule]) => rule.test(String(title).trim().toUpperCase()))?.[0] ?? null;
   ```
   **Antes de fechar a lista**, descubra os títulos reais: selecione na cena da Casa de bairro, da Igreja e do Galpão um exemplo de cada tipo (prop, luz, piso, parede, porta, janela, água, rocha, tela, decalque, cabo, vegetação, terreno) e registre no console os `section > .eyebrow` do inspetor. Ajuste `RULES` até nenhum ficar sem aba. Títulos com prefixo variável (`AJUSTES · …`, `FIXAR / ANCORAR · …`, `LINHAS · ATÉ …`) usam `^`. Painéis que acrescentam um `<details>` fora de `section` (ex.: `details.object-adjustments` "Alinhar e ajustar objetos") vão para `position`.
3. **`organizeInspector`** (`application.js:990`), depois de `sectionDisclosure`:
   - para cada `details` de primeiro nível, `node.dataset.inspectorTab = inspectorTabFor(title) ?? 'look'` (em dev, `console.warn` para título sem aba);
   - montar a barra `<div class="inspector-tabs" role="tablist">` só com as abas que têm conteúdo, botões `role="tab"`, `aria-selected` e `data-inspector-tab-button="<id>"`, inserida logo depois do cabeçalho; posição `sticky; top: 0`, fundo `--tt-surface-1`;
   - aba ativa: `inspectorTab.get(kindKey) ?? primeira disponível`, com `kindKey = found.type === 'entity' ? record.kind : found.type`. `inspectorTab` é um `Map` de sessão declarado junto de `inspectorDisclosures` (`application.js:139`);
   - seções de outras abas recebem `hidden`;
   - na aba ativa, abrir por padrão todas as seções quando forem até 2; senão manter a regra `expanded` atual;
   - clique em `[data-inspector-tab-button]` → `inspectorTab.set(kindKey, id)` e alterna o `hidden` **sem** reconstruir o inspetor;
   - **forçar aba:** com o pincel ativo (`tool === 'terrain'`), `look`; para luzes (`type === 'light'`), `light` na primeira seleção.
   - **Terreno:** `record.kind === 'terrain'` continua sem abas (fluxo próprio), mas ganha o cabeçalho. **Seleção múltipla:** cabeçalho "N OBJETOS" (`.tt-tag` "SELEÇÃO"), sem abas.
4. **Revelar campo** (usado pelo tutor, pela paleta e pelos testes). Função `revealNode(node)` em `src/ui/reveal.js`:
   ```js
   /** Bring a control into reach: its side tab, inspector tab and enclosing disclosures. */
   export function revealNode(node, { openTab } = {}) {
     const pane = node.closest('[data-inspector-tab]');
     if (pane?.hidden) node.ownerDocument.querySelector(`[data-inspector-tab-button="${pane.dataset.inspectorTab}"]`)?.click();
     for (let parent = node.parentElement; parent; parent = parent.parentElement)
       if (parent.tagName === 'DETAILS' && !parent.open) parent.querySelector(':scope > summary')?.click();
     node.scrollIntoView({ block: 'center' });
   }
   ```
   O `open` do tutor (`src/tutorial/tutor.js:40`) passa a usar `revealNode` (a parte de aba lateral continua com `host.open(tab)`).
5. **`tests/e2e/controls.js` → `reveal()`:**
   ```js
   for (const tab of ['scene', 'shots', 'elements', 'build']) { const button = page.locator(`.tabs [data-tab="${tab}"]`); if (!await button.count()) continue; await button.click(); if (await node.count()) break; }
   …
   await node.evaluate(element => {
     const pane = element.closest('[data-inspector-tab]');
     if (pane?.hidden) document.querySelector(`[data-inspector-tab-button="${pane.dataset.inspectorTab}"]`)?.click();
     /* existing details loop */
   });
   ```
6. **Teste novo `tests/inspector-tabs.test.js`:** todo título da lista da seção 1 e da lista coletada no passo 2 tem aba; `inspectorTabFor('Organização') === 'organize'`; `inspectorTabFor('xyz') === null`.

**Aceite (tarefa de referência):** com o sofá selecionado, chegar em Material sem rolar: 1 clique (aba Aparência), antes ~3 recolhíveis + rolagem. Capturas `05-objeto` e `07-material` refeitas.

**E2E:** `controls`, `material-transfer`, `screens-decals`, `wet-effects`, `materials-effects`, `material-wear`, `lighting`, `dynamic-lighting`, `tutorials`, `panel-consistency`, `editor`; depois a suíte inteira.

---

### F4 — Galeria (Abrir) e tela de início

**Arquivos:** `renderDialogContent` em `application.js:1333` (e os auxiliares que montam os cartões de cena, mapa e exemplo), `styles.css`, `shell.js` (`#welcome`).

**Passos**

1. **Janela Abrir mais larga:** `width: min(1120px, calc(100vw - 120px))`, `height: min(820px, calc(100dvh - 96px))`.
2. **Cartaz** (`.poster`), no lugar do cartão atual de cena, exemplo e mapa:
   ```html
   <article class="poster" style="--poster-accent:#…">          <!-- sceneAccent of that doc when known, else brand -->
     <div class="poster-image"><img …> | <div class="poster-placeholder"><span>CB</span></div></div>
     <div class="poster-body">
       <span class="tt-tag is-small">EXEMPLO</span>            <!-- EXEMPLO / MINHA CENA / MAPA -->
       <h3 class="tt-display">Casa de bairro · jardim e quintal</h3>
       <p class="poster-meta">Tomada 12 · editada 15 out</p>
       <p class="poster-text">…descrição atual…</p>
       <div class="poster-actions"><button data-open-example="…" class="primary">Carregar cena</button> …ações atuais…</div>
     </div>
   </article>
   ```
   - Imagem em 16:9, `object-fit: cover`, gradiente inferior `linear-gradient(transparent 40%, #000c)`. O título fica sobre o gradiente em telas largas e abaixo da imagem em telas estreitas.
   - Grade `repeat(auto-fill, minmax(320px, 1fr))`, `gap: 18px`.
   - **Mantenha** os mesmos `data-open`, `data-open-example`, `data-open-map`, `data-instantiate-map` e demais ações nos mesmos botões; os testes clicam neles.
   - O placeholder mostra as iniciais do nome em `.tt-display` 54 px com 12% de opacidade e uma linha que varre (1,6 s; estática com movimento reduzido). O texto "Gerando prévia…" vira `aria-label`.
   - `observeGalleryCards` continua funcionando (ele observa os cartões para gerar prévias): passe a observar `.poster`.
3. **Tela de início** (substitui o conteúdo de `#welcome`, mostrada quando `sceneEmpty()`):
   - título `.tt-display` 34 px "Qual é a próxima cena?";
   - **Continuar**: cartaz grande da cena salva mais recente (`savedScenes` por `updatedAt`), com `data-open`. Se não houver cena salva, não aparece;
   - **Cenas de exemplo**: faixa horizontal com 3–4 cartazes pequenos (`data-open-example`) + "Ver todas" (`data-action="open"`);
   - **Começar do zero**: `data-action="room-draw"` (`.cta.primary`, o mesmo botão e texto de hoje: "Desenhar minha primeira sala") + "Prédio por contorno" (abre Construir → Prédio pelo mesmo caminho que `host.open('build')` + abrir a tarefa) + "Aprender o básico" (`data-action="tutorials"`).
   - fundo: a própria cena vazia com vinheta; caixa sem cartão pesado, só um degradê `--eco-black` à esquerda.
4. **Corte de cena:** `<div class="stage-cut" aria-hidden="true"><i></i><i></i></div>` no palco. Ao abrir cena, exemplo ou mapa: adicionar `.closing` (barras de 0 a 14vh em 120 ms, `--eco-ease`), aguardar `viewport.ready()` e trocar para `.opening` (220 ms). Com movimento reduzido, nada. Nunca bloquear entrada (`pointer-events: none`).

**Aceite:** abrir um exemplo a partir do início em 1 clique (antes: Abrir → rolar → Carregar = 2 cliques + rolagem). Capturas `01-inicio` e `02-abrir`.

**E2E:** `example-scenes`, `example-previews`, `scene-previews`, `editor`, `recovery`, `pages`.

---

### F5 — Tomadas: câmeras como película, ensaio × ao vivo

**Objetivo:** câmeras salvas viram tomadas com miniatura; dá para **ensaiar** (só no editor) ou **cortar** (publicar). No modo apresentação, um dock no estilo do carrossel da Ficha.

**Arquivos:** `shell.js` (aba `shots`), `application.js` (`buildSidebar`: mover o grupo "Câmera e apresentação" de Ambiente para Tomadas), `src/ui/shots-panel.js` (novo), `src/app/shot-thumbnails.js` (novo), `src/render/scene-preview.js` (parâmetro de câmera), `src/tutorial/lessons.js`, `styles.css`.

**Passos**

1. **Aba Tomadas** (`data-tab="shots"`), com dois grupos de `taskList`:
   - **Tomadas:** a película (passo 3) + "Salvar enquadramento atual" (`data-action="camera-save"`, mesmo botão);
   - **Projetor:** os controles de "Câmera e apresentação" que hoje estão em Ambiente (navegação, transições, abrir segunda tela `presentation-window`, `publish-camera`, `camera-cut`, `camera-stop`, qualidade do projetor), **sem mudar os `data-*`**.
   
   Ambiente fica só com Atmosfera. Em `src/tutorial/lessons.js`, troque `tab: 'scene'` por `tab: 'shots'` em todo passo cujo `target` seja de câmera ou projetor (`grep -n "camera-\|presentation" src/tutorial/lessons.js`). A condição `tab` de `conditions.js` funciona sem mudança.
2. **Miniaturas** (`src/app/shot-thumbnails.js`):
   - `createScenePreviewRenderer().render(document, assets, signal, { camera } = {})`: com `camera`, usar `viewport.setCamera(camera)` no lugar do primeiro preset (mudança mínima em `scene-preview.js`);
   - fila própria, um trabalho por vez, `requestIdleCallback` (com fallback `setTimeout(…, 200)`), cache `Map` com chave `${doc.id}:${camera.id}:${doc.revision}:${hash(JSON.stringify(camera))}` e no máximo 48 entradas;
   - renderizar em 320×180;
   - cancelar tudo ao trocar de documento;
   - **não** gerar durante arraste de ferramenta nem com `isPresentation` ativo (custo no notebook do projetor).
3. **Película** (`shotsPanel(doc, { publishedId, rehearsedId, thumbnails })` em `src/ui/shots-panel.js`, HTML puro): para cada `cameraPreset`, na ordem de `Object.values`:
   ```html
   <article class="shot ${published?'is-live':''} ${rehearsed?'is-rehearsed':''}">
     <div class="shot-frame"><img|placeholder><span class="shot-number">01</span>${published?'<span class="rec">● AO VIVO</span>':''}</div>
     <strong>Enquadramento 1</strong>
     <div class="shot-actions">
       <button data-camera-rehearse="ID">Ensaiar</button>
       <button data-camera="ID" class="primary">Transição</button>
       <button data-camera-cut="ID">Corte</button>
       <button data-camera-delete="ID" class="quiet danger" aria-label="Excluir tomada">…</button>
     </div>
   </article>
   ```
   - Borda da tomada no ar em `--tt-rec`; da ensaiada, em `--scene-accent`.
   - `publishedId`: guardar o id do preset em `publishCamera` quando a publicação vier de um preset (novo parâmetro opcional `presetId`); qualquer outra publicação limpa o id.
4. **Ensaiar:** novo handler para `data-camera-rehearse`: `viewport.setCamera(preset, { duration: cameraDuration })`, `rehearsedId = id`, **sem** `publishCamera`. O selo de estado (4.6) mostra "ENSAIO · projetor em outra tomada" se houver projetor.
5. **Dock de apresentação** (`#shot-dock`, no palco, visível quando `isPresentation` ou projetor conectado e a aba não é Tomadas; o usuário pode esconder pelo `×`, preferência de sessão):
   - três quadros como o carrossel da Ficha: anterior (escala .82, opacidade .55), atual (1.0, borda `--tt-rec` se no ar) e próximo; setas `‹ ›` nas laterais; legenda "‹ › escolher · Enter transição · Shift+Enter corte · 1–9 corte direto";
   - teclado, tratado **antes** de `if (isPresentation) return;` em `application.js:2510` e só quando o dock está visível e o foco não está em campo de texto: `ArrowLeft`/`ArrowRight` mudam a seleção do dock (não publicam), `Enter` = Transição, `Shift+Enter` = Corte, `1`–`9` = Corte direto na tomada N.
6. **Testes:**
   - `panel-consistency` (Ambiente = `['Atmosfera']`, Tomadas = `['Tomadas', 'Projetor']`);
   - novo `tests/e2e/shots.test.js`:
     - salvar 2 câmeras;
     - abrir o projetor (popup);
     - "Ensaiar" a 2ª não muda a câmera do popup (`window.__tabletop.camera()` no popup com `?diagnostics`);
     - "Corte" na 2ª muda imediatamente;
     - no modo apresentação, `2` corta para a 2ª e `ArrowLeft` + `Enter` faz transição para a 1ª;
     - miniatura aparece (`img` com `naturalWidth > 0`) em até 10 s.
   - unitário para `shotsPanel` (marcação de ao vivo e ensaiada).

**Aceite:** é possível ensaiar qualquer tomada sem que os jogadores vejam; o mestre sempre sabe qual tomada está no ar.

**E2E:** `shots`, `camera`, `panel-consistency`, `tutorials`, `editor`, `house-scene`, `church-scene` (as cenas com dez câmeras).

---

### F6 — Projetor: janela limpa, cartela de título

**Arquivos:** `startPresentation` (`application.js:2621`), `src/ui/projector.css` (novo, importado em `styles.css`), `src/ui/shots-panel.js` (controle da cartela), `application.js` (`sendPresentation`).

**Passos**

1. **Controles do projetor:** tirar o `style=""` inline do `<select id="presentation-quality">` e agrupar `#presentation-quality`, `#presentation-effects` e `#presentation-fullscreen` em `<div class="projector-controls">` (canto inferior direito, fundo `--eco-black` com 70% de opacidade, raio `--eco-radius-m`). Somem após 2,5 s sem mover o mouse (`body.controls-idle`, com `cursor: none`); qualquer `mousemove` ou tecla traz de volta. Mesmos ids.
2. **Cartela de título:** mensagem nova no canal, sem mudar a `version`:
   ```js
   { version: 1, sessionId, type: 'title', titleSequence, title, subtitle, accent, duration }   // duration in s, 2–12
   ```
   - **Recebedor:** antes do filtro de tipos em `channel.onmessage`, `if (data.type === 'title') { if (data.titleSequence > lastTitle) { lastTitle = data.titleSequence; showTitleCard(data); } return; }`. Validar strings com até 120 caracteres e `accent` com `/^#[0-9a-f]{6}$/i`; ignorar o resto.
   - **Visual** (`.title-card`, centrada no terço inferior): `.tt-tag` com o subtítulo (se houver) e o título em `.tt-display`, `font-size: clamp(36px, 6vw, 96px)`, maiúsculas, `text-shadow: 0 4px 30px #000`, regra de 2 px em `accent` que cresce de 0 a 40% da largura. Entrada de 500 ms (opacidade + `translateY(12px)`), permanência de `duration` e saída de 700 ms. Com movimento reduzido, só opacidade.
   - **Emissor:** no grupo Projetor da aba Tomadas, "Cartela de título" com campos `title-card-title` (padrão: nome da cena), `title-card-subtitle` (padrão: vazio) e `title-card-duration` (4 s, `numberField` 2–12), e o botão `data-action="title-card"` "Mostrar no projetor" (desabilitado sem projetor conectado). Estado só de sessão: não vai para o documento nem para o histórico. O `accent` enviado é o `sceneAccent` atual.
3. **Barras de cinema (opcional desta fase):** caixa `data-field="projector-letterbox"` no grupo Projetor; envia `letterbox: true|false` junto da mensagem `view` existente; o recebedor mostra duas faixas pretas para 2,39:1. Só de sessão.
4. **E2E** em `shots.test.js`: com o popup aberto, enviar a cartela e verificar `.title-card` visível no popup com o texto; a cartela some depois de `duration + 1` s.

**Aceite:** nenhum controle fica visível sobre a imagem do projetor depois de 3 s parado.

**E2E:** `shots`, `editor`, `camera`, `pages` (a apresentação no Pages usa o mesmo `BroadcastChannel`).

---

### F7 — Cartão de personagem (token)

**Objetivo:** selecionar um personagem no Tabletop deve lembrar a ficha cinematográfica. É também o ponto de encontro futuro com a Ficha.

**Arquivos:** `buildInspector` (ramo `type === 'token'`), `src/ui/actor-hero.js` (novo), `shell.js` (filtro SVG), `styles.css`, `renderSceneTreeIfVisible` (`application.js:822`).

**Passos**

1. **Filtro SVG:** adicionar ao `shellMarkup`, uma vez, um `<svg width="0" height="0" aria-hidden="true">` com `<filter id="tt-rim-light">` portado de `#token-controlled-outline` (`index.html` da Ficha): sombra ambiente + contorno dilatado e deslocado à esquerda + mistura. Diferenças: `flood-color` vem de `--scene-accent` (atualize o atributo do `feFlood` por JS quando o destaque mudar; o atributo de filtro SVG não lê variáveis CSS de forma confiável) e `flood-opacity` fixo em 0,55.
2. **Cabeçalho de personagem** (`actorHero(actor, token, portraitURL)` em `src/ui/actor-hero.js`), substitui `.inspector-hero` para tokens:
   ```html
   <div class="object-title inspector-hero actor-hero">
     <div class="actor-portrait"><img src="…" alt="" style="filter:url(#tt-rim-light)"></div>   <!-- or placeholder silhouette (icon token 54px) -->
     <span class="tt-tag is-small is-scene">PERSONAGEM</span>
     <strong class="tt-display">Alan</strong>
     <small class="hero-meta">No projetor · visível</small>  <!-- or "Só mestre", with .tt-tag.is-gm -->
     <div class="hero-actions">…same as F3…</div>
   </div>
   ```
   - Retrato: altura 220 px, `object-fit: contain`, `object-position: bottom`, máscara inferior `linear-gradient(#000 70%, transparent)` para fundir com o painel.
   - **URL do retrato:** descubra como o asset do ator (`actor.assetRef`) é resolvido para imagem (`grep -n "assetRef" src/render/scene-objects.js src/domain/asset-library.js` e o `src` das miniaturas em `src/ui/asset-library-panel.js`) e reutilize a mesma função. Se o asset for um modelo `.glb` sem imagem, use a miniatura da biblioteca; se não houver nenhuma, a silhueta.
3. **Elementos:** linhas de token na árvore ganham avatar redondo de 22 px com o retrato (`object-fit: cover`, `object-position: top`), como os avatares do trilho da Ficha.
4. **Espaço reservado para a Ficha:** `actorHero` aceita `options.sheetSlot` (string HTML). Por padrão vazio; a fase 10 diz quando usar. Não renderize botão desabilitado "em breve".

**E2E:** em `editor.test.js` (que já cria tokens) ou num `tests/e2e/actor-hero.test.js` novo: importar o retrato PNG (como em `pages.test.js:56`), colocar o token, selecionar, verificar `.actor-hero img` carregado e `.object-title strong` com o nome. `repeated-placement`, `asset-library`.

---

### F8 — Encontrar: paleta Ctrl+K e folha de atalhos

**Objetivo:** etapa 5 do plano anterior. Digitar "rejunte", "neve", "noite" ou "sofá" e chegar lá. É o mesmo gesto do navegador da Ficha (Ctrl+K), coerente no ecossistema.

**Arquivos:** `src/ui/command-index.js` (puro), `src/ui/command-palette.js` (DOM), `application.js` (fontes e execução), `shell.js` (`<dialog id="command-palette">` e `<dialog id="shortcuts-sheet">`), `styles.css`.

**Passos**

1. **`command-index.js`** (puro, testável):
   ```js
   export const normalize = text => String(text).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
   /** 0 when absent; prefix 3, word start 2, inside 1; keywords count half. */
   export function score(entry, query) { … }
   export function search(entries, query, limit = 40) { … }   // stable by score, then group order, then label
   export const GROUPS = ['Ações', 'Nesta seleção', 'Tarefas', 'Elementos', 'Assets', 'Cenas', 'Tutoriais', 'Onde fica'];
   export const WHERE = [ /* curated hints for controls that only exist with a selection */
     { label: 'Rejunte do azulejo', keywords: 'junta azulejo ladrilho', hint: 'Selecione um piso ou parede → Aparência → textura Azulejo → Desenho' },
     { label: 'Neve no terreno', keywords: 'inverno gelo', hint: 'Selecione o terreno → Material base · terreno inteiro → Cobertura de neve' },
     // ~20 entradas: rejunte, neve, sombra de luz, névoa, hora do dia, chuva, porta, telhado, bloom, ferrugem, musgo, sujeira,
     // luz que acende à noite, câmera/tomada, projetor, grid, andar, camada, pincel, água/rio, escada, vitral
   ];
   ```
   **Escreva os caminhos do `WHERE` conferindo na interface** (depois da F3); cada um tem que levar ao controle real.
2. **Fontes** (montadas a cada abertura, baratas):
   - **Ações:** tabela estática em `application.js` com `[label, keywords, run]` cobrindo Salvar, Nova, Abrir, Assets, Apresentar, Abrir projetor, Publicar câmera, cada ferramenta (Q, G, R, V, M, I, T), Enquadrar, Ver interior, Telhados, Vista superior, Tela cheia, Tutoriais, Atalhos e cada lugar do trilho. `run` chama `act(name)` ou `setTool`.
   - **Tarefas:** as definições de `taskList` de Construir, Ambiente e Tomadas (título + descrição). `run`: muda de aba lateral, abre o `details` da tarefa e chama `revealNode` nele.
   - **Nesta seleção:** cada `[data-field]` de `#inspector-content` com rótulo (`.field-label` ou texto do `label`), mais o título da seção como contexto. `run`: `revealNode(field)`, foco e destaque (`.reveal-flash`: contorno de 2 px em `--tt-accent` que some em 1,2 s).
   - **Elementos:** entidades, tokens e luzes do documento pelo nome. `run`: `selectObject(id)` + `act('frame')`.
   - **Assets:** nome e tags (`assets`). `run`: `beginAssetPlacement(asset)`.
   - **Cenas:** salvas e exemplos. `run`: `openScene` / `openExample`.
   - **Tutoriais:** títulos de `LESSONS`. `run`: o mesmo caminho do centro de tutoriais.
   - **Onde fica:** `WHERE`. `run`: mostra o `hint` num `notify`; se o controle existir na seleção atual, revela-o.
3. **Paleta** (`<dialog id="command-palette" class="command-palette">`, aberto com `show()`, não modal, posicionado a 16vh do topo, 640 px):
   - campo com placeholder "Buscar ações, controles, elementos, assets, cenas…";
   - lista agrupada com o nome do grupo como `.tt-eyebrow`; navegação ↑↓, Enter, Esc; clique; `aria-activedescendant`;
   - vazia, mostra "Ações" e as 5 últimas escolhas (sessão);
   - abre com Ctrl/Cmd+K **mesmo com foco em campo** (prevenir o padrão), pelo botão do trilho e por `data-action="command-palette"`;
   - Esc fecha e devolve o foco ao elemento anterior;
   - o `keydown` global (`application.js:2492`) ignora teclas enquanto a paleta está aberta (já ignora `.floating-window`; adicione `.command-palette`).
4. **Folha de atalhos:** `?` (fora de campos de texto) ou o botão do trilho/HUD abre `#shortcuts-sheet`, renderizada a partir de `SHORTCUTS` em colunas por grupo, com `<kbd>` estilizado (`--tt-surface-2`, borda inferior de 2 px `--tt-line-strong`).
5. **Testes:**
   - `tests/command-index.test.js`: acentos ("nevoa" acha "Névoa"), ordem por prefixo, `limit`, grupos;
   - `tests/e2e/command-palette.test.js`:
     - Ctrl+K com foco no nome da cena abre a paleta;
     - "sof" + Enter seleciona o Sofá de sala (cena da Casa);
     - com o piso selecionado e a textura Azulejo, "rejunte" + Enter revela e foca o campo de largura do rejunte (descubra o `data-field` real em `src/ui/material-panels.js`);
     - "noite" lista o ambiente Noite;
     - Esc fecha.

**Aceite (tarefas de referência):** achar e selecionar o sofá em 2 ações (Ctrl+K, "sof", Enter); chegar ao rejunte com o piso selecionado em 1 busca.

**E2E:** `command-palette`, `controls`, `editor`, `tutorials` (o tutor não pode ser atrapalhado pela tecla `?`).

---

### F9 — Barra de contexto na cena (opcional)

Etapa 6 do plano anterior. Só depois de F3 e F8, e só se as capturas mostrarem que não polui a cena.

- `<div id="selection-bar" class="selection-bar" role="toolbar">`, posicionada acima do centro superior da caixa do objeto selecionado com `viewport.project(position)` (`src/render/renderer.js:1467`; confirme que o método está exposto no objeto devolvido por `createViewport`).
- **Botões:** Mover (G), Girar (R), Aparência (abre a aba `look`), Luz (aba `light`, só se houver), Duplicar e Excluir.
- **Atualização:** só por `requestAnimationFrame` enquanto há seleção e a câmera se move (assine o mesmo evento que move o gizmo; procure como o renderer notifica mudança de câmera). Escondida durante arraste, com ferramenta de desenho, pincel ou régua, em `isPresentation` e com seleção múltipla. Se a projeção sair da tela, esconda.
- **E2E:** visível com o sofá selecionado; some com Mover em arraste; "Aparência" abre a aba.

---

### F10 — Costuras para o ecossistema

Nada aqui integra os projetos ainda. São pontos de encaixe baratos, para que a integração futura não exija outro rework.

1. **`docs/DESIGN_SYSTEM.md`:**
   - **Tokens `eco`:** tabela nome → valor → uso.
   - **Tokens por aplicação:**

     | Aplicação | Cor da marca | Fonte de `--scene-accent` / `--cinematic-accent` |
     |---|---|---|
     | Tabletop | âmbar `#e3b878` | luz principal da cena |
     | Ficha | vermelho `#e91d25` | classe ou cor-tema da ficha |
     | Jukebox | a definir (sugestão: azul-petróleo `#5fb3b3`) | cena musical ativa |
     | Plugin Obsidian | herda o tema do Obsidian | — |

   - **Primitivas:** `.tt-tag` ↔ `.cinematic-section-heading span` da Ficha, `.tt-display` ↔ `.cinematic-name h1`, etc. Diga o que ainda difere.
   - **Mapeamento para o Obsidian:** `--eco-font-ui` → `--font-interface`, `--tt-accent` → `--interactive-accent`, `--tt-surface-1` → `--background-secondary`, `--tt-bg` → `--background-primary`, `--tt-text` → `--text-normal`, `--tt-muted` → `--text-muted`. O plugin deve usar as variáveis do Obsidian e só acrescentar as primitivas `eco` (etiqueta rasgada, display).
   - **Extração futura:** quando o segundo projeto adotar os tokens, mover a camada `eco` de `theme.css` para um pacote local compartilhado (ex.: `../mesa-ui/eco.css`, consumido por caminho relativo ou `file:` no `package.json`). Não fazer agora.
2. **Links diretos** (úteis para notas do Obsidian):
   - `?scene=<id>` abre uma cena salva; `?scene=<id>&shot=<presetId>` abre e **ensaia** a tomada (só a câmera de trabalho; nunca publica, regra 0.3); `?example=<id>` carrega o exemplo; `?map=<id>` abre o mapa;
   - ler em `startApplication` depois da inicialização, reaproveitando `openScene`, `openExample` e `openMap`;
   - id inválido → `notify` e início normal;
   - ao abrir ou salvar uma cena, `history.replaceState` atualiza a URL para `?scene=<id>`, preservando `?diagnostics`;
   - "Copiar link da cena" no menu de contexto da claquete (clique direito em `#scene-name`, ou um `⋯` ao lado), usando `navigator.clipboard.writeText` com `notify` de confirmação;
   - **E2E** em `editor.test.js`: abrir `?scene=<id>` carrega a cena; `&shot=` não publica (popup aberto antes mantém a câmera).
3. **Vagas no trilho:** `src/ui/ecosystem.js` com `export const ECOSYSTEM_APPS = [];` (formato `{ id, label, url, icon }`). Se a lista não estiver vazia, o trilho mostra, entre Ajuda e o ponto de armazenamento, um grupo "Mesa" com um botão por app, que abre `url` em nova aba (`target="_blank" rel="noopener"`). Vazio por padrão: nada aparece.
4. **Contratos futuros** (só documentar, em `docs/DESIGN_SYSTEM.md` § Integração):
   - **Ficha → personagem:** campo `actor.sheetRef = { app: 'ficha-ordem-ii', sheetId }`. Exige mudança em `documents.js` e `validation.js` e migração; usar `actorHero(..., { sheetSlot })` para mostrar PV/PD e "Abrir ficha".
   - **Jukebox → cena:** `audioCue` já é reservado e hoje a validação exige `null` (`validation.js:553`). Formato proposto: `{ app: 'jukebox', sceneId, fade: seconds }`, disparado ao cortar uma tomada.
   - **Barramento entre apps na mesma máquina:** `BroadcastChannel('mesa:<topic>')` com `{ version: 1, from: '<app>', type, payload }`; tópicos `scene`, `shot`, `actor`, `audio`. O Tabletop já usa `tabletop-presentation-<id>` para o projetor; não misturar.
   - **Plugin Obsidian:** lê cenas pela API local (`/api/tabletop/scenes`, ver `server/app.js`) e insere links `http://127.0.0.1:3001/?scene=<id>&shot=<id>`. Liste os endpoints reais.

---

## 6. Validação geral

**Tarefas de referência:** medir cliques e rolagens antes (interface atual) e depois de cada fase que as afeta. Registrar na seção Andamento.

| Tarefa | Antes (medir) | Meta |
|---|---|---|
| Trocar o piso para azulejo hexagonal com rejunte largo | | piso selecionado → aba Aparência → amostra → Hexagonal → deslizante (4 cliques, sem rolagem) |
| Achar e selecionar "Sofá de sala" | | Ctrl+K, "sof", Enter |
| Mudar a hora para noite | | Ambiente → cartão Noite (2) |
| Salvar um enquadramento e cortar para ele no projetor | | Tomadas → Salvar → Corte (3) |
| Ensaiar outra tomada sem mostrar aos jogadores | impossível | Ensaiar (1) |
| Abrir uma cena de exemplo ao iniciar | | 1 clique no início |
| Ferrugem nas bordas de um objeto | | objeto → Aparência → Desgaste → Ferrugem → Bordas |
| Saber se o projetor mostra o que vejo | impossível | selo de estado sempre visível |

**Capturas:** atualize `scripts/capture-ui.js` para também capturar Tomadas, o inspetor em cada aba, a paleta aberta com "rejunte", a folha de atalhos e o popup do projetor com a cartela. Gere em 1600×950 e em 800×900.

**Comparação lado a lado:** monte as capturas finais ao lado de `ficha-cinematica-personagem.jpg` (`magick montage`). O ar de família deve ser evidente (serifada, etiquetas rasgadas, fundo preto-azulado, cantoneiras/moldura), e as diferenças também (âmbar, ferramenta limpa, película de tomadas). Se parecer cópia (vermelho, rasgado em botões), corrija.

**Desempenho:** rode `scripts/benchmark-editor-performance.js` antes da F2 e depois da F5. O inspetor com abas não pode ficar mais lento que hoje (`performanceDiagnostics.measure('inspector')`); as miniaturas de tomadas não podem derrubar o FPS do editor em mais de 5% durante a geração (meça com a cena da Igreja, que tem dez câmeras).

**Acessibilidade:**
- todo botão só com ícone tem `aria-label` (as dicas não substituem);
- abas com `role="tab"` e setas ←/→ entre elas;
- foco visível em tudo;
- contraste testado (F1);
- movimento reduzido verificado com `page.emulateMedia({ reducedMotion: 'reduce' })` num E2E (corte de cena, cartela e ponto AO VIVO sem animação).

---

## 7. Riscos

| Risco | Mitigação |
|---|---|
| `application.js` grande demais para editar com segurança | F0 extrai o shell; cada fase nova cria módulos (`inspector-tabs.js`, `shots-panel.js`, `command-index.js`, …) e deixa em `application.js` só a ligação |
| A reconciliação (`reconcileElement`) desfaz o `hidden` das abas ou o estado da paleta | abas aplicadas dentro de `buildInspector`/`organizeInspector` (no `desired`, antes de reconciliar); paleta e dock ficam fora de `#side-content` e `#inspector-content` |
| Testes quebram por posição ou visibilidade (tool strip, HUD) | F2 roda a suíte inteira; as mudanças de teste permitidas estão na regra 0.6 |
| Tutoriais apontam para controles que mudaram de aba | `revealNode` no tutor (F3), `tab: 'shots'` nas lições (F5), E2E `tutorials` em F1, F2, F3, F5 e F8 |
| `innerText` com maiúsculas quebra testes | regra 0.5 |
| Miniaturas de tomadas pesam no notebook | fila única, ociosa, 320×180, nunca em apresentação, cache limitado |
| Fontes não carregam no Pages | URLs relativas em `src/ui/fonts/`, verificadas no E2E `pages` |
| Cor de destaque da cena ilegível (luz muito escura ou saturada) | `sceneAccent` limita saturação e luminosidade e cai no âmbar com luz cinza; teste unitário |
| Atalhos novos (`?`, `1`–`9`, setas) conflitam com câmera e tutor | `?` só fora de campos; `1`–`9` e setas só com o dock visível; verificar contra WASD/Espaço/Ctrl do renderer |

## 8. Fora do escopo

- Mudar o formato do documento, comandos ou histórico.
- Integrar de fato Ficha, Jukebox ou Obsidian (F10 só prepara).
- Tema claro e tradução.
- Navegação 3D por toque.
- Mexer nos projetos Ficha e Jukebox.

---

## Andamento

### 15–16 de outubro de 2026 — implementação F0–F10

Todas as fases foram implementadas em sequência (F9 incluída). O detalhe por fase, as diferenças em relação ao plano e as pendências estão em [progress.md](../progress.md#rework-cinematográfico-da-interface-1516-de-outubro); o resultado para quem usa está em [EDITOR_UI.md](EDITOR_UI.md) e o sistema visual em [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

**Capturas** (`node scripts/capture-ui.js <pasta> <largura> <altura>`): `references/ui/cinematic/fase-1` a `fase-4` (estado ao fim de cada fase), `final` (1600×950) e `final-800` (800×900), com Tomadas, o inspetor em cada aba, a paleta com "rejunte", a folha de atalhos e o popup do projetor com a cartela.

**Diferenças em relação ao plano**

| Plano | Feito | Por quê |
|---|---|---|
| Clicar na aba ativa do trilho recolhe a gaveta | duplo clique na aba ativa, ou a alça na borda da cena | os testes clicam na aba ativa o tempo todo (`reveal`) |
| `«` e `⇥` dentro dos painéis | alças `sidebar-toggle`/`inspector-toggle` na borda do palco | os testes clicam nelas com o painel recolhido (visibilidade) |
| Gaveta 320 px, inspetor 340 px | 288 px e 320 px | cena 928×898 em 1600×950; a meta de 1170 px de largura não cabe com trilho e os dois painéis abertos |
| Cartazes do início com `data-open*` | `data-welcome-open` / `data-welcome-example` | seletores duplicados quebrariam os testes (strict mode) |
| Miniaturas 320×180 | 480×270, só com a aba Tomadas visível | reaproveita o renderizador de prévias; cada uma é uma renderização completa |
| Ação `frame` no cabeçalho | `frame-selection` | `frame` já existe na barra da câmera |

**Tarefas de referência** (cliques contados na interface, não medidos por instrumento):

| Tarefa | Antes | Agora |
|---|---|---|
| Piso → azulejo hexagonal com rejunte largo | selecionar, abrir Material e textura, Azulejo, abrir opções do padrão, Hexagonal, deslizante, com rolagem | selecionar piso → Aparência → Azulejo → Hexagonal → deslizante (5 cliques, tudo na primeira tela do inspetor) |
| Achar e selecionar "Sofá de sala" | Elementos, buscar, clicar | Ctrl+K, `sof`, Enter (E2E `command-palette`) |
| Mudar a hora para noite | Ambiente → cartão Noite (2) | igual (2); também por Ctrl+K `noite` |
| Salvar um enquadramento e cortar para ele | Ambiente → rolar → Salvar → Corte | Tomadas → Salvar → Corte (3) (E2E `shots`) |
| Ensaiar outra tomada sem mostrar aos jogadores | impossível | Ensaiar (1) (E2E `shots`) |
| Abrir uma cena de exemplo ao iniciar | Abrir → rolar → Carregar | 1 clique no cartaz do início |
| Saber se o projetor mostra o que vejo | impossível | selo de estado sempre visível (E2E `shell`) |

**Validação**: ver [progress.md](../progress.md#rework-cinematográfico-da-interface-1516-de-outubro).
