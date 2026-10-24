# Etapa 1 — Preparação

Leia antes: `AGENTS.md`, `00-LEIA-PRIMEIRO.md`, `package.json`, `.gitignore`, `server/app.js` (só as linhas 1–60, para ver como `projectDir` e `dataDir` são definidos).

## Objetivo

Deixar o terreno pronto: uma pasta **privada** para a biblioteca, as três dependências dos scripts de importação e o esqueleto de pastas. Nenhuma funcionalidade visível.

## Entregas

### 1. Pasta privada

- Acrescente ao `.gitignore` a linha `/data-private/`.
- A biblioteca mora em `TABLETOP_HANDOUTS_DIR`; sem a variável, em `<raiz do projeto>/data-private/handouts`.
- Crie `server/handout-paths.js`:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Where the private document library lives: never inside the repository's tracked folders or the public build. */
export function handoutLibraryDir(env = process.env) {
  return path.resolve(env.TABLETOP_HANDOUTS_DIR || path.join(projectDir, 'data-private', 'handouts'));
}

/** The folders of the library, created on demand by the import scripts. */
export const LIBRARY_FOLDERS = Object.freeze({ elements: 'elements', templates: 'templates', fonts: 'fonts', previews: 'previews', reports: 'reports' });
```

### 2. Dependências (só para os scripts)

Em `devDependencies`, com versão exata (o projeto fixa versões):

| Pacote | Versão | Para quê |
|---|---|---|
| `ag-psd` | `30.2.0` | ler PSD e PSB (camadas, texto, objetos inteligentes) |
| `sharp` | `0.35.5` | redimensionar e gravar WebP/PNG, prévias |
| `fflate` | `0.8.3` | abrir os `.zip` de fontes dos pacotes |

Rode `npm install`. Confirme que nenhum arquivo de `src/` importa esses pacotes (eles **não** podem ir para o navegador).

### 3. Esqueleto

```
scripts/handouts/
  lib/
    psd-canvas.js     # etapa 10
  import-elements.js  # etapa 8
  psd-report.js       # etapa 10
  import-psd.js       # etapa 12
```

Nesta etapa crie só `scripts/handouts/lib/` com um `README.md` de três linhas dizendo o que cada script fará e que eles leem do HD e escrevem só em `handoutLibraryDir()`.

Em `package.json`, acrescente (os scripts ainda não existem; tudo bem):

```json
"handouts:elements": "node scripts/handouts/import-elements.js",
"handouts:psd-report": "node --max-old-space-size=8192 scripts/handouts/psd-report.js",
"handouts:psd-import": "node --max-old-space-size=8192 scripts/handouts/import-psd.js"
```

### 4. Teste de proteção

Crie `tests/handouts-privacy.test.js`:

- `.gitignore` contém a linha `/data-private/`;
- `handoutLibraryDir({})` termina em `data-private/handouts` e `handoutLibraryDir({ TABLETOP_HANDOUTS_DIR: '/x/y' })` é `/x/y`;
- nenhum arquivo em `src/` contém `from 'ag-psd'`, `from 'sharp'` ou `from 'fflate'` (leia os arquivos com `fs` e procure as strings);
- `vite.config.js` não menciona `data-private`.

## Pronto quando

- [ ] `npm test` passa, inclusive o teste novo.
- [ ] `git status` não mostra nada dentro de `data-private/` mesmo depois de criar um arquivo de teste lá (crie, confira, apague).
- [ ] `npm run build` funciona e `dist/` não contém `ag-psd`, `sharp` nem `fflate` (`grep -r "ag-psd" dist/ | wc -l` dá 0).

## Não faça

- Não copie nada do HD nesta etapa.
- Não crie rotas no servidor (etapa 5).
- Não toque em `src/`.
