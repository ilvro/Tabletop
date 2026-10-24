# Etapa 8 — Importar elementos, símbolos e fontes

Leia antes: `00-LEIA-PRIMEIRO.md` (inclusive "Referências"), `etapa-05-armazenamento.md` (seção "Formato da biblioteca"), `server/handout-paths.js`, `server/storage.js` (`atomicWrite`).

## Objetivo

Um script de linha de comando que lê as imagens soltas, os símbolos e as fontes do *Arquivos Confidenciais* no HD e grava a biblioteca privada: imagens reduzidas em WebP, prévias, fontes e o `library.json`. Pode rodar de novo: só processa o que mudou.

```
npm run handouts:elements -- --source "/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais" [--only assets|symbols|fonts] [--limit 50] [--dry-run]
```

## O que o acervo tem (medido em 24/10/2026)

- `Assets/<ano>/<mês>/<Categoria (n)>/<arquivo>.png|jpg` — 1 723 JPG e 774 PNG; categorias como `Sangue`, `Manchas`, `Fitas`, `Prendedores`, `Polaroides`, `Papéis Amassados`, `Papéis Rasgados e Chamuscados (16 + 100)`, `Texturas de Papel`, `Quadros Ornamentados`, `Doodles`, `Rabiscos Extras`, `Poeira PNG`. Alguns arquivos ficam soltos na pasta do mês (`Doodles (30).png`).
- `Símbolos/<ano>/<mês>/…` — símbolos e marcas em PNG.
- Fontes: `.ttf`/`.otf` soltos e dentro de `.zip`, em `Documentos/Bundle N/Fontes - Bundle N/` (ou `Fonte/`, `Fontes/`) e em `Assets/2024/06-2024 (2º) [Fontes! (100+)]/`.
- `Atribuição*.txt` em algumas pastas.

## Arquivos

```
scripts/handouts/import-elements.js     # CLI: lê argumentos, chama as funções abaixo, imprime um resumo
scripts/handouts/lib/catalog.js         # funções puras: categoria, tags, ids
scripts/handouts/lib/font-names.js      # lê a tabela 'name' e 'OS/2' de TTF/OTF
scripts/handouts/lib/manifest.js        # ler, mesclar e gravar library.json
tests/handouts-import-elements.test.js
```

## Regras

### Categoria, nome, tags, id (`catalog.js`, puro)

```js
export function stripCount(name)            // 'Sangue (14)' → 'Sangue'; 'Papéis Rasgados e Chamuscados (16 + 100)' → 'Papéis Rasgados e Chamuscados'; '06-2024 (2º) [Fontes! (100+)]' → '06-2024'
export const isMonthFolder = name => /^\d{2}-\d{4}/.test(name) || /^\d{4}$/.test(name)
export function categoryOf(relativePath)    // a pasta mais funda que não é de ano/mês, sem contagem; se o arquivo está direto na pasta do mês, o nome do arquivo sem contagem e sem extensão
export function displayName(relativePath)   // 'Sangue (7).png' em 'Sangue' → 'Sangue 7'; nomes com palavras ficam como estão, sem extensão
export function tagsOf(relativePath)        // palavras de categoria e nome, minúsculas, sem números, sem palavras de 1–2 letras, sem repetir, até 12
export function slug(text)                  // minúsculas, sem acento (normalize('NFD') e tirar \p{Diacritic}), não alfanumérico → '-', no máximo 40
export function elementId(relativePath)     // 'el-' + slug(categoria) + '-' + 8 primeiros hex do sha1 do caminho relativo (estável entre execuções)
export function fontId(postscriptName)      // 'font-' + slug(postscriptName)
```

### Imagens

- Extensões `.png`, `.jpg`, `.jpeg`, `.webp`. Ignore arquivos com menos de 1 KB e imagens com mais de 80 megapixels (anote no relatório).
- Gere com `sharp`: `elements/<id>.webp` com lado maior até **2048 px** (`withoutEnlargement`), `quality: 86`, mantendo a transparência; `previews/<id>.webp` com lado maior 320, `quality: 78`.
- Item: `{ id, kind: 'element', name, category, tags, file, preview, width, height, source: { bundle: '<ano>/<mês>', path: '<caminho relativo à pasta --source>', attribution? } }` (largura e altura do arquivo **gerado**).
- **Duplicatas**: calcule o sha1 do conteúdo do arquivo original; se já houver item com o mesmo sha1, não gere outro: some as tags novas ao existente.
- `attribution`: se a pasta tiver um `Atribuição*.txt`, guarde o texto (até 2 000 caracteres).
- Símbolos (`--only symbols`): igual, com categoria `Símbolos` seguida da subpasta, se houver.

### Fontes (`font-names.js`)

```js
/** Family, style and names of a TrueType/OpenType font from its 'name' and 'OS/2' tables; null if it is not one. */
export function readFontNames(buffer)
// → { family, subfamily, postscript, fullName, weight, italic }
// family: nameID 16 se existir, senão 1; subfamily: 17 ou 2; postscript: 6; fullName: 4.
// Prefira registros platformID 3 (Windows, UTF-16BE, languageID 0x0409) e, na falta, platformID 1 (Mac Roman).
// weight: OS/2.usWeightClass (padrão 400); italic: bit 0 de OS/2.fsSelection.
// Aceita assinaturas 0x00010000, 'true', 'OTTO'. Coleções 'ttcf' → null (anote "coleção não suportada").
```

- Procure fontes soltas e dentro de `.zip` (abra com `fflate.unzipSync`, ignore `__MACOSX/` e arquivos começando com `._`).
- `fonts/<fontId>.<ext>`; item `{ id, kind: 'font', name: fullName, category: 'Fontes', tags: [família em minúsculas, nome do pacote], file, family, postscript, weight, style: italic ? 'italic' : 'normal', source: { bundle, path } }`.
- `.woff`/`.woff2`: copie, use o nome do arquivo como `family` e `postscript` (sem ler tabelas), e anote no relatório.
- Mesmo `postscript` encontrado em vários pacotes: guarde só o primeiro.

### Manifesto (`manifest.js`)

```js
export async function readManifest(libraryDir)                 // { schema: 1, generatedAt, items: [] } se não existir
export function mergeItems(manifest, items, { replaceKinds })  // substitui itens de mesmo id; com replaceKinds, remove antes os desses tipos que não vieram de novo
export async function writeManifest(libraryDir, manifest)      // ordena por kind, categoria, nome; grava com atomicWrite; atualiza generatedAt
```

O importador de elementos **nunca** apaga itens `template` e `layer` (da etapa 12).

### Execução incremental e relatório

- `<biblioteca>/state/elements-index.json`: `{ [caminhoRelativo]: { size, mtimeMs, id, sha1 } }`. Arquivo com mesmo tamanho e data é pulado sem ler.
- Ao fim: `reports/elements-<AAAA-MM-DD-HHmm>.json` com `{ scanned, created, updated, skipped, duplicates, errors: [{ path, message }], tooLarge: [...] }` e um resumo de cinco linhas no terminal.
- O HD é lento: leia um arquivo por vez; gere com `sharp` em no máximo 4 tarefas ao mesmo tempo.
- `--dry-run`: não grava nada, só o resumo. `--limit N`: para depois de N arquivos (para testar).
- Erro num arquivo não para o script: vai para `errors`.

## Testes (`tests/handouts-import-elements.test.js`)

1. `stripCount`, `categoryOf`, `displayName`, `tagsOf` com os exemplos de cima, inclusive `Assets/2024/10-2024/Doodles (30).png` → categoria `Doodles`.
2. `elementId` é igual em duas chamadas e diferente para caminhos diferentes; `slug('Papéis Amassados')` é `papeis-amassados`.
3. `readFontNames` com uma fonte mínima montada no próprio teste (cabeçalho sfnt + tabelas `name` e `OS/2` só com os campos usados): família, PostScript, peso 700 e itálico corretos; buffer qualquer → `null`.
4. `mergeItems` substitui por id e, com `replaceKinds: ['element']`, remove elementos antigos sem tocar em `template`.
5. De ponta a ponta numa pasta temporária: gere com `sharp` duas imagens PNG (uma copiada duas vezes com nomes diferentes) e um `.zip` com a fonte de teste do item 3, em `Assets/2023/01-2023/Sangue (2)/` e `Documentos/Bundle 1 - X/Fontes - Bundle 1/`; rode a função principal do script com `--source` nessa pasta e a biblioteca noutra → `library.json` tem 1 elemento (a duplicata virou tag), 1 fonte com o `postscript` certo, os arquivos existem e a prévia tem lado maior 320. Rodar de novo cria 0 e pula 3.

## Pronto quando

- [ ] Testes passam; `npm test` passa.
- [ ] Rodado de verdade com `--limit 200` no acervo do usuário: a biblioteca aparece em `data-private/handouts`, `curl …/api/tabletop/handouts/library` lista os itens, e `git status` continua limpo.
- [ ] Anote no `progress.md` quanto tempo levou o `--limit 200` e o tamanho da pasta gerada, para estimar o acervo inteiro.

## Não faça

- Não leia PSDs (etapas 10–12).
- Não escreva nada fora de `handoutLibraryDir()`. Não modifique nada no HD.
