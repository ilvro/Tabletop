# Integração Ficha ↔ Tabletop — análise

Data: 22 de outubro de 2026. Análise para uma entrega futura. Nada aqui está implementado, e nada altera a Ficha (`../Ficha teste - Ordem II`) sem um pedido explícito.

## 1. O que existe hoje na Ficha

| Ponto | Situação no código | Consequência |
| --- | --- | --- |
| Identidade | Cada ficha tem `id` estável (`sheet-<tempo>-<sufixo>`), `name`, `folderId`. | Dá para vincular um ator do Tabletop a uma ficha por ID, não por nome. |
| Recursos | `pv/maxPv/pvTemp`, `pd/maxPd/pdTemp`, `attributes`, `skills`, `level`, `profile`. | O que a mesa mostra no projetor (barras, condições) já existe. |
| Retrato | `tokenImage` como data URL (webp) e ajustes `cinematicToken*`/`cinematicOutline*`. | O retrato do token pode vir da ficha, com o mesmo recorte e contorno. |
| Persistência | Em desenvolvimento, `POST /api/sheets` grava **o array inteiro** em `sheets.json`; no Pages, IndexedDB/localStorage. | Escrever recursos a partir da mesa hoje sobrescreveria fichas abertas em outra aba. Só leitura é segura. |
| Dados 3D | `rollDice3d(configs, title, modifier, audio, rollMode)` em `src/dice3d.js`; toda rolagem passa por `roll()` em `app.js` (≈ linha 3836), que registra no histórico. | Um único ponto para publicar cada rolagem. |
| Origem | Vite em outra porta (ou GitHub Pages). | `BroadcastChannel` não atravessa origens: a ponte precisa de outro transporte. |

## 2. Desenho proposto

**Autoridade:** a Ficha continua dona das fichas e das rolagens. O Tabletop só lê e mostra. Nada de PV entra no documento da cena: o ator guarda só o vínculo.

```js
actor.sheetRef = { provider: 'ficha-ordem', sheetId: 'sheet-…' }   // opcional, validado
```

**Transporte: o servidor local do Tabletop vira o ponto de encontro.**

- `POST /api/bridge/events`: a Ficha publica eventos (`sheet.snapshot`, `sheet.changed`, `roll`). Precisa de CORS restrito à origem da Ficha. Se a Ficha estiver no Pages (https), precisa também do cabeçalho `Access-Control-Allow-Private-Network`, porque o Chrome trata `127.0.0.1` como confiável, mas faz *preflight* de rede privada.
- `GET /api/bridge/stream` (SSE): editor e projetor do Tabletop recebem os eventos. O editor repassa ao projetor pelo canal que já existe, já filtrado (rolagem secreta não sai do editor).
- O modelo de *push* funciona com a Ficha em dev e no Pages; ler `sheets.json` direto só funcionaria em dev.
- No modo GitHub Pages do Tabletop (sem servidor), a alternativa é `window.postMessage` entre janelas abertas uma pela outra (botão "Abrir Ficha" no trilho, já previsto em `src/ui/ecosystem.js`).

**Mudanças mínimas na Ficha (quando autorizadas):**

1. Um módulo `bridge.js` com `publish(type, payload)`, desligado por padrão e com o endereço da mesa nas configurações.
2. Em `roll()`: depois de `rollDice3d` resolver, publicar `{ type: 'roll', sheetId, title, dice: breakdown, modifier, total, rollMode, secret }`.
3. No salvamento de uma ficha: publicar `sheet.changed` só com os campos de mesa (`id, name, pv, maxPv, pvTemp, pd, maxPd, pdTemp, tokenImage?`), não o array.

## 3. O que a integração habilita no Tabletop

| Recurso | Como usa a ponte |
| --- | --- |
| Rolagem no projetor | O evento `roll` mostra o resultado grande no projetor (overlay), no estilo do d20 do BG3. Opcional: reencenar os dados 3D com os valores já sorteados, adaptando `dice3d.js` para aceitar o resultado em vez de sorteá-lo (o número mostrado é sempre o rolado na ficha). |
| Cartões de personagem | Barras de PV/PD por ator vinculado, atualizadas por `sheet.changed`. |
| Estado do token | PV ≤ 0 → "morrendo"; PD baixo → "enlouquecendo"; usa os estados da figura (plano geral, fase 1). |
| Retrato | "Usar retrato da ficha" importa `tokenImage` como asset do Tabletop e reaproveita o enquadramento cinematográfico da ficha. |
| Close automático | Ao rolar, a mesa pode sugerir (não executar) o Close do personagem que rolou, já que Close, foco e câmera ao vivo existem. |

## 4. Ordem sugerida

1. Ponte de leitura (`sheet.snapshot` / `sheet.changed`) + `actor.sheetRef` + "vincular ficha" no cartão do personagem.
2. Rolagens: evento `roll` → overlay no projetor, com secreto respeitado.
3. Retrato vindo da ficha.
4. Só depois, se fizer falta: escrita (dano aplicado pela mesa). Antes disso, a Ficha precisa de gravação por ID com revisão, em vez do array inteiro.

## 5. Riscos

- **Duas abas da Ficha abertas** sobrescrevem `sheets.json` uma da outra. O problema já existe e não é da ponte, mas fica mais visível.
- **Tamanho:** `tokenImage` em data URL é grande (centenas de KB). Mande o retrato só quando ele mudar, e por hash.
- **Rede privada / HTTPS:** testar Ficha no Pages → Tabletop local no Chrome e no Firefox antes de prometer.
