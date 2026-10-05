# Tabletop no GitHub Pages

O build estático oferece editor, 188 assets locais, materiais/efeitos, cenas/mapas/ambientes, importação de PNG/JPEG/WebP e GLB estático, classificação/favoritos, histórico, recuperação e apresentação. Funciona em `https://<usuário>.github.io/<repositório>/` e em domínio próprio, com caminhos relativos ao diretório publicado.

## Publicar com GitHub Actions

1. Envie o código, incluindo `.github/workflows/pages.yml`, para a branch padrão do repositório (`main` ou `master`).
2. No GitHub, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Em **Actions**, execute **Publicar Tabletop no GitHub Pages** ou faça um novo push na branch padrão. O workflow instala dependências, testa, executa `npm run build:pages` e publica **somente `dist-pages/`**.
4. Abra a URL apresentada pelo job de publicação. O caminho e o nome do repositório não precisam ser fixados no código.

O conteúdo publicado é o build, não a pasta do código-fonte nem `docs/`. O workflow segue as ações oficiais de [publicação estática](https://github.com/actions/starter-workflows/blob/main/pages/static.yml) e o fluxo descrito em [configurar a origem de publicação](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Conferir o build localmente

```bash
npm ci
npm run build:pages
npm run preview:pages
```

Abra a URL indicada pelo preview. `dist-pages/` também pode ser servido por qualquer hospedagem de arquivos estáticos. `npm run build` e `npm start` conservam o modo com servidor Node e dados em `data/`.

## Onde ficam os dados

No Pages, **Salvar guarda nesta instalação do navegador**, em IndexedDB. Cenas, mapas, ambientes, arquivos importados e classificação/favoritos persistem após fechar e reabrir o navegador. O cabeçalho e a biblioteca identificam esse modo. Publicar uma nova versão do site não substitui a biblioteca pessoal.

- Cada origem e diretório de publicação têm biblioteca, última cena e rascunhos separados. Mudar domínio ou nome/caminho do repositório cria outro espaço; os dados anteriores continuam no endereço antigo.
- As revisões são conferidas na mesma transação que grava o documento. Duas abas que salvam a mesma revisão não sobrescrevem silenciosamente uma à outra; a segunda recebe conflito. A última versão em edição continua no rascunho.
- As cinco revisões anteriores ficam em backups limitados dentro da base local. Recuperação de trabalho não salvo continua por aba.
- Arquivos importados ficam como Blobs na base; URLs temporárias são recriadas ao reabrir. Imagens têm decodificação verificada; GLBs devem ser estáticos, com recursos internos, sem rig/compressão/extensões não suportadas. Limite de 25 MB por arquivo.
- O projetor funciona em outra janela do mesmo navegador/origem por BroadcastChannel, com câmera independente. O site não transmite uma sessão pela internet nem sincroniza automaticamente entre computadores.
- Em **Abrir → Documentos**, use **Baixar Cena/Mapa** para guardar ou transferir o JSON. Assets internos acompanham qualquer instalação. O JSON referencia arquivos importados por ID e não embute suas imagens/GLBs; transporte empacotado de cena + arquivos continua como pendência.
- Limpar os dados do site remove essa biblioteca. Navegação privada pode descartar os dados ao fechar. Falta de espaço ou armazenamento bloqueado impede confirmar o salvamento e mantém a indicação de alterações locais.

Esses limites decorrem do armazenamento escolhido: [GitHub Pages serve arquivos estáticos](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), sem executar a API Node do projeto. Nenhuma cena ou arquivo pessoal é enviado ao repositório GitHub pelo editor.

## Implementação e verificação

`vite.config.js` gera base `./` e seleciona persistência no navegador em modo `pages`. `paths.js` resolve catálogo/assets/favicons/projetor no diretório da aplicação; `browser-repository.js` implementa a interface do repositório com validação, referências, revisão, transações e descarte de URLs temporárias. `api.js` mantém a API local; builds normais também reconhecem o domínio `github.io`.

Builds em `dist/` e `dist-pages/` são independentes. Teste estático: `node --test tests/e2e/pages.test.js` depois de `npm run build:pages`. O servidor da fixture serve apenas arquivos, sem `/api/tabletop`, no subdiretório `/Tabletop/`. Testes verificam UI real, biblioteca/importação, salvamento/reabertura, mapas/ambientes, projetor, isolamento de diretórios e conflitos/falhas atômicas. Resultado atualizado em [progress.md](../progress.md).

Arquitetura/vegetação alpina, distribuição, água/gelo e neve com espessura usam recursos locais e documentos serializáveis; disponíveis no build estático. Uso: [LANDSCAPE.md](LANDSCAPE.md).

Escultura manual dos paredões/rochas com pincel também funciona no build estático: traços locais persistem em IndexedDB e são conservados ao reabrir e publicar conteúdo no projetor. Uso e limites: [ROCK_SCULPT.md](ROCK_SCULPT.md).

## Exemplos incluídos

Abrir → Cenas contém exemplos distribuídos junto ao site. JSON e prévia ficam em `public/scenes/`, com URLs relativas ao diretório publicado. Carregar cria uma cópia editável sem chamar API; Salvar guarda a cópia no IndexedDB. A passagem da montanha e a nova ruína alta são locais. [EXAMPLE_SCENES.md](EXAMPLE_SCENES.md).
