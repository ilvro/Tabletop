# Etapa 5 — Armazenamento

Leia antes: `00-LEIA-PRIMEIRO.md`, `etapa-02-modelo-de-dados.md` (formato), `server/app.js` (como as rotas de `scenes`, `maps` e `environments` são registradas, e `createApp`), `server/storage.js` (`atomicWrite`, `readJSON`, `HttpError`, `checkRevision`), `server/handout-paths.js` (etapa 1), `src/data/api.js` (`request`, `json`, `browserMode`), `tests/server.test.js` (o estilo dos testes de servidor).

## Objetivo

1. Guardar os documentos que a pessoa cria (JSON) com revisão, como as cenas.
2. Servir a **biblioteca privada** (modelos, elementos, fontes) de `handoutLibraryDir()`, só para leitura, sem nunca sair dessa pasta.
3. Um cliente em `src/data/handouts-api.js` para o ateliê usar.

## Onde fica cada coisa

| O quê | Onde | No git? |
|---|---|---|
| Documentos da pessoa | `<dataDir>/handouts/<id>.json` e `<dataDir>/handouts/<id>.preview.webp` | como as cenas (a pasta `data/` é do usuário) |
| Biblioteca | `handoutLibraryDir()` = `data-private/handouts/` | **não** |

## Formato da biblioteca (escrito pelas etapas 8 e 12; aqui só lido)

`<biblioteca>/library.json`:

```js
{
  schema: 1,
  generatedAt: '2026-10-24T12:00:00Z',
  items: [
    { id: 'el-sangue-respingo-07', kind: 'element', name: 'Respingo de sangue 7', category: 'Sangue', tags: ['sangue', 'respingo'],
      file: 'elements/el-sangue-respingo-07.webp', preview: 'previews/el-sangue-respingo-07.webp', width: 1600, height: 1210,
      source: { bundle: 'Assets 01-2023', path: 'Assets/2023/01-2023/Sangue/Sangue (7).png' } },
    { id: 'font-kingthings-trypewriter-2', kind: 'font', name: 'Kingthings Trypewriter 2', category: 'Máquina de escrever', tags: [],
      file: 'fonts/font-kingthings-trypewriter-2.ttf', family: 'KingthingsTrypewriter2', weight: 400, style: 'normal', source: { … } },
    { id: 'tpl-policial-relatorio', kind: 'template', name: 'Relatório policial', category: 'Policial', tags: ['uv'],
      file: 'templates/tpl-policial-relatorio.json', preview: 'previews/tpl-policial-relatorio.webp', width: 1240, height: 1754, source: { … } },
    { id: 'tpl-policial-relatorio--03', kind: 'layer', name: 'Amassado', file: 'templates/tpl-policial-relatorio/03.webp', width: 1240, height: 1754 }
  ]
}
```

`kind: 'layer'` são as imagens das camadas de um modelo: servidas como qualquer arquivo, mas **não** aparecem na listagem normal.

## Rotas (em `server/handouts.js`, registradas por `createApp`)

`createApp` ganha a opção `handoutsDir = handoutLibraryDir()` e chama `registerHandoutRoutes(app, { dataDir, handoutsDir })`. **Registre as rotas da biblioteca antes das rotas com `:id`** (senão `/handouts/library` cai em `/handouts/:id`).

| Método e rota | Resposta |
|---|---|
| `GET /api/tabletop/handouts/library` | `{ available: true, generatedAt, items: [...] }` sem os `kind: 'layer'`; `{ available: false, items: [] }` se `library.json` não existe |
| `GET /api/tabletop/handouts/library/:itemId` | o item; para `template`, o item mais `handout` (o JSON do arquivo `file`) |
| `GET /api/tabletop/handouts/library/:itemId/file` | o arquivo `file` do item (para `template`, devolve a prévia) com `Content-Type` pela extensão (`.webp`, `.png`, `.jpg`, `.ttf` `font/ttf`, `.otf` `font/otf`, `.woff2` `font/woff2`, `.json`) e `Cache-Control: public, max-age=31536000, immutable` |
| `GET /api/tabletop/handouts/library/:itemId/preview` | o arquivo `preview` |
| `GET /api/tabletop/handouts` | lista de resumos `{ id, name, category, tags, revision, updatedAt, preview: 'api/tabletop/handouts/<id>/preview' \| null }`, mais recente primeiro |
| `GET /api/tabletop/handouts/:id` | o documento |
| `POST /api/tabletop/handouts` `{ handout }` | `201`, grava com `revision: 1`, devolve o documento |
| `PUT /api/tabletop/handouts/:id` `{ handout, expectedRevision }` | `409` se a revisão não bate (use `checkRevision`); grava com `revision + 1` |
| `DELETE /api/tabletop/handouts/:id?expectedRevision=n` | `204`; apaga JSON e prévia |
| `PUT /api/tabletop/handouts/:id/preview` `{ image: 'data:image/webp;base64,…' }` | grava a prévia (WebP ou PNG, até 2 MB) |
| `GET /api/tabletop/handouts/:id/preview` | a prévia |

Segurança (teste cada uma):

- `id` de documento: `documentId` de `server/storage.js`; `itemId`: `/^[a-z0-9][a-z0-9-]{0,119}$/`.
- O caminho final do arquivo é `path.resolve(handoutsDir, item.file)`; recuse com `404` se ele não começar com `handoutsDir + path.sep` (proteção contra `../`, mesmo vindo do manifesto).
- Valide o documento com `validateHandout` antes de gravar (`422` com a mensagem).
- `library.json` é lido uma vez e guardado em cache pela data de modificação do arquivo (`stat`), para não reler a cada pedido.

## Cliente (`src/data/handouts-api.js`)

```js
export const handoutRepository = {
  storage,                      // 'server' | 'browser'
  list(), read(id), create(handout), save(handout), remove(handout), savePreview(handout, dataUrl),
  library(),                    // { available, items }
  libraryItem(id),              // item (com handout se for modelo)
  fileURL(id), previewURL(id),  // URLs com applicationURL
};
```

No modo navegador (`browserMode`, GitHub Pages): documentos em IndexedDB (banco `tabletop-handouts-v1`, store `handouts`, chave `id`; mesma semântica de revisão, conflito lança `ApiError` 409) e `library()` devolve `{ available: false, items: [] }`. Siga o estilo de `src/data/browser-repository.js`.

## Testes

`tests/handouts-server.test.js` (servidor real com `createApp({ dataDir: tmp, handoutsDir: tmpLib })`, como `tests/server.test.js`):

1. Sem `library.json`: `GET …/library` → `{ available: false, items: [] }`.
2. Com um `library.json` de teste (escreva no `tmpLib` um elemento, uma fonte, um modelo e uma camada, com arquivos pequenos): a listagem tem 3 itens (sem a camada); `…/library/<camada>/file` funciona; o modelo vem com `handout`.
3. Arquivos: `Content-Type` certo para `.webp` e `.ttf`; `Cache-Control` imutável.
4. Item com `file: '../../segredo.txt'` no manifesto → `404`. `itemId` com `..` ou `/` → `404`.
5. CRUD: criar → revisão 1; salvar com revisão errada → `409`; salvar certo → revisão 2; listar mostra o nome; apagar → `204` e some da lista.
6. Documento inválido (`validateHandout` falha) → `422`.
7. Prévia: `PUT` com data URL PNG pequena → `GET` devolve `image/png`.

## Pronto quando

- [ ] Testes passam; `npm test` inteiro passa (inclusive `tests/server.test.js`).
- [ ] `curl http://127.0.0.1:3001/api/tabletop/handouts/library` responde `available: false` num checkout limpo.

## Não faça

- Não escreva nada em `handoutsDir` pelo servidor: a biblioteca só é escrita pelos scripts de importação.
- Não liste arquivos do HD original pelo servidor.
