# Ficha ↔ Tabletop — plano de implementação

Data: 23 de outubro de 2026. Plano para implementar; a análise do que existe está em [INTEGRACAO_FICHA.md](INTEGRACAO_FICHA.md). Mudar a Ficha (`../Ficha teste - Ordem II`) faz parte deste plano, mas cada mudança lá é pequena, isolada num módulo próprio e desligada por padrão.

## 1. Objetivo

Na sessão, a ficha e a mesa se comportam como um sistema só:

- **Personagens:** um token sabe de qual ficha é. O projetor mostra PV e PD, o retrato vem da ficha e o estado da figura acompanha os recursos (PV 0 → morrendo).
- **Ameaças:** uma ameaça da Ficha entra na mesa já com arte, deslocamento e defesa, e a **introdução da ameaça** (`introTitle`, `introText`, `introImage`) vira uma apresentação cinematográfica no projetor.
- **Rolagens:** o que se rola na Ficha aparece no projetor, grande e no clima de Ordem. Rolagem secreta fica só com o mestre.
- **Autoridade:** a Ficha continua dona dos números. A mesa só lê; escrever (dano aplicado pela mesa) é a última fase, e só depois de a Ficha gravar por ID.

## 2. O que existe nos dados da Ficha e como a mesa usa

| Campo da Ficha | Uso na mesa |
| --- | --- |
| `id`, `name`, `systemMode` (`ordem2`, `original`, `threat`) | Vínculo `actor.sheetRef`, nome do token, tipo de cartão |
| `pv/maxPv/pvTemp`, `pd/maxPd/pdTemp` (personagem) | Barras no cartão do projetor; PV ≤ 0 → estado *morrendo*; PD ≤ 25% → *enlouquecendo* (sugestão, o mestre confirma) |
| `pv/pvMax`, `defesa`, `deslocamento.metros`, `condicoesAtivas` (ameaça) | Barra de PV (mostrável ou não), deslocamento para a trilha de movimento ([PLANO_TATICO_BG3.md](PLANO_TATICO_BG3.md)), ícones de condição |
| `tokenImage` + `cinematicToken*` / `cinematicOutline*` | Retrato da figura recortada, com o mesmo enquadramento e contorno da ficha |
| `hasIntro`, `introTitle`, `introText`, `introImage`, `themeColor`, `elementoDestaque` | **Apresentação da ameaça** no projetor: cartela com a arte, o título e o texto, na cor do elemento (sangue, morte, conhecimento, energia, medo) |
| `presenca` (DT, dano mental) | Lembrete para o mestre quando a ameaça é revelada; efeito de tela opcional de "presença perturbadora" (distorção curta) |
| `notasMestre` | Só no editor do mestre, nunca no projetor |
| Rolagem (`roll()` em `app.js`): título, dados, modificador, total, modo | Cartão de rolagem no projetor e registro no painel Ao Vivo |

## 3. Transporte

O servidor local do Tabletop vira o ponto de encontro (detalhes em [INTEGRACAO_FICHA.md](INTEGRACAO_FICHA.md) §2):

- `POST /api/bridge/events` (CORS só para a origem configurada da Ficha; `Access-Control-Allow-Private-Network` para a Ficha no GitHub Pages).
- `GET /api/bridge/stream` (SSE) para o editor. O editor repassa ao projetor pelo `BroadcastChannel` que já existe, **depois** de filtrar (secretos e notas do mestre ficam).
- O modo Pages do Tabletop, sem servidor, usa `window.postMessage` entre a mesa e uma Ficha aberta pelo botão do trilho (`ECOSYSTEM_APPS` em `src/ui/ecosystem.js`).

Eventos (todos com `version`, `sheetId`, `at`):

```js
{ type: 'sheet.snapshot', sheets: [ { id, name, systemMode, pv, maxPv, pvTemp, pd, maxPd, pdTemp, defesa, deslocamento, condicoesAtivas, portraitHash } ] }
{ type: 'sheet.changed',  sheet: { ...os mesmos campos } }
{ type: 'sheet.portrait', sheetId, hash, image: 'data:image/webp;base64,…' }   // só quando o hash muda
{ type: 'threat.intro',   sheetId, title, text, image?, color }               // botão "Apresentar na mesa" na ameaça
{ type: 'roll',           sheetId, title, dice: [{ sides, value }], modifier, total, rollMode, secret }
```

## 4. Fases

### Fase A — Ponte e vínculo (base de tudo)

**Ficha:** `src/bridge.js` com `connect(url)`, `publish(event)`, fila com reenvio e um indicador "Mesa conectada" no cabeçalho. Configurações → "Endereço da mesa" (desligado por padrão). Ao conectar, envia `sheet.snapshot`; ao salvar uma ficha, envia `sheet.changed` só com os campos de mesa.

**Tabletop:**
- `server/bridge.js`: as duas rotas, sem persistir nada (a mesa guarda só o último snapshot em memória).
- `src/data/bridge.js` (cliente SSE com reconexão) e `src/domain/sheets.js` (normaliza os campos acima, sem DOM, com testes).
- Contrato: `actor.sheetRef = { provider: 'ficha-ordem', sheetId }`, opcional e validado. Os números **não** entram no documento; ficam num cache de sessão (`sheetCache`), reidratado pela ponte.
- No cartão do personagem: "Vincular ficha…" (lista de fichas conectadas, filtrável por pasta). Com vínculo: nome e retrato podem vir da ficha (botão, não automático).
- Arrastar uma ficha da lista para a cena cria o token já vinculado, como figura recortada.

**Aceite:** ficha conectada aparece na lista; vincular; mudar PV na Ficha atualiza o cartão do editor em menos de 1 s; desconectar mostra "Ficha desconectada" sem apagar nada.

### Fase B — Cartões e estados no projetor

- Overlay do projetor (`src/app/live/overlay.js`, camada DOM sobre o 3D): cartões de personagem com retrato, PV e PD em barras e condições, na lateral ou no rodapé. O mestre escolhe quais aparecem e se a PV das ameaças é mostrada.
- Regras de estado em `src/domain/sheets.js`: PV ≤ 0 → *morrendo*; PV 0 após fim do combate → *inconsciente*; PD baixo → *enlouquecendo*. A mesa **sugere** a troca de estado da figura no painel Ao Vivo, e um clique aplica (a figura é dado da cena, a ficha é fonte).
- Efeito de tela opcional quando um personagem cai a PD crítico (dessaturação e distorção curtas no projetor).

### Fase C — Rolagens no projetor

- **Ficha:** em `roll()`, depois de `rollDice3d` resolver, publicar `roll`. "Rolagem secreta" ganha um interruptor na Ficha (publica com `secret: true`).
- **Tabletop:** cartão de rolagem no projetor, com título, dados individuais (destacando o maior na rolagem de "fica o maior"), modificador e total grandes, na cor do personagem (`diceColor`/`themeColor`). Crítico e desastre com cor própria. Some depois de alguns segundos ou no próximo evento.
- Opção "Close em quem rolou": a mesa **sugere** (botão no aviso do editor), não executa sozinha.
- Mais tarde: reencenar os dados 3D no projetor com os valores já sorteados (adaptar `dice3d.js` para receber o resultado). O número mostrado é sempre o da Ficha.

### Fase D — Ameaças entram em cena

- Arrastar uma ameaça da lista cria o token (figura recortada, base *pedestal*, tamanho pela categoria `tamanho`: Pequeno 1 m, Médio 1,7 m, Grande 2,6 m…), começando como "só mestre".
- **Revelar ameaça** (no cartão ou numa deixa do painel Ao Vivo): o token deixa de ser "só mestre", a câmera pode fazer um close, e o projetor mostra a apresentação (`threat.intro`): a arte em tela cheia escurecida, título e texto na tipografia da ficha, na cor do elemento, saindo depois de alguns segundos ou com um clique.
- Lembrete de presença perturbadora para o mestre (DT e dano), sem rolar nada sozinho.

### Fase E — Escrita (só se fizer falta)

- **Pré-requisito na Ficha:** gravar uma ficha por ID com revisão (`PUT /api/sheets/:id` com `expectedRevision`), em vez de reescrever o array inteiro. Sem isso, a mesa não escreve.
- Mesa: aplicar dano ou cura pelo cartão (com desfazer de sessão), enviando um comando à Ficha (`sheet.adjust { sheetId, field, delta, expectedRevision }`). A Ficha aplica e responde com `sheet.changed`; conflito aparece como aviso, nunca como sobrescrita.

## 5. Testes

- Tabletop: unidade para `sheets.js` (normalização, regras de estado), contrato `sheetRef`; servidor (CORS, eventos inválidos recusados, SSE); E2E com uma Ficha falsa publicando eventos (vincular, PV mudando no cartão do projetor, rolagem secreta que não chega ao projetor).
- Ficha: unidade para `bridge.js` (fila, reenvio, campos enviados); teste manual com as duas abertas.
- Privacidade: um teste garante que `notasMestre`, rolagens secretas e PV de ameaça escondida nunca aparecem em mensagens para o projetor.

## 6. Ordem e tamanho

A (M) → C (M) → B (M) → D (M) → E (G, opcional). As rolagens no projetor (C) vêm antes dos cartões porque são o que mais aparece numa sessão de Ordem.
