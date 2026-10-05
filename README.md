# Tabletop

Editor 3D local para preparar cenas e apresentá-las no projetor. O vertical slice inclui sala, porta, tokens, mobiliário, iluminação, histórico e persistência no computador do mestre.

Com Node.js 22.12+:

```bash
npm ci
npm run dev
```

Abrir http://127.0.0.1:5173. Para produção local: `npm run build` e `npm start`, em http://127.0.0.1:3001.

Ver [execução, testes e limitações](docs/VERTICAL_SLICE.md), [construção/Smart Build/polish da Fase 3](docs/PHASE_3.md) e [roadmap](docs/ROADMAP.md). A biblioteca tem 191 assets originais, com categorias, épocas, cenários, tags editáveis e favoritos. Veja [catálogo e classificação](docs/ASSET_LIBRARY.md).

Câmera: WASD navega, Shift acelera, Page Up/Down altera altura; na perspectiva, Espaço sobe e Ctrl desce. Zoom, pan e órbita podem ser usados enquanto anda. Botão direito seleciona ao soltar sem arrastar. G/R/V movem/giram/escalam objetos. Lente, velocidade e transições ficam em **Cena**: [controles](docs/CAMERA.md). [Andamento e pendências](progress.md).

Dados do servidor local ficam em `data/`, ignorados pelo Git. Jukebox e Ficha continuam independentes.

**GitHub Pages:** `npm run build:pages` gera `dist-pages/`, com assets e persistência no navegador, sem API Node. `npm run preview:pages` permite conferir. O workflow `.github/workflows/pages.yml` publica o build; escolha **Settings → Pages → Source → GitHub Actions** no repositório. Uso, armazenamento e limites em [GITHUB_PAGES.md](docs/GITHUB_PAGES.md).

Ambientes: **Cena** oferece presets de dia/tarde/noite, neblina, chuva, pântano e calor, com sol/lua, Kelvin/HSV, céu/nuvens, partículas e biblioteca própria. Objetos podem acender por horário: [controles e limites](docs/ENVIRONMENTS.md).

Paisagem de montanha: kit modular de ruínas/plantas ramificadas, distribuição com prévia, rios/lagos editáveis, gelo com apoio e neve com espessura. Controles e limites: [docs/LANDSCAPE.md](docs/LANDSCAPE.md).

Escultura direta de terreno e paredões com pincel **T**, mantendo geometria paramétrica, materiais e histórico: [guia de escultura](docs/ROCK_SCULPT.md).

Cena editável de subida da montanha com caverna lateral, ponte elevada e lanternas arredondadas em **Abrir → Cenas → Cenas de exemplo**: [guia das cenas de exemplo](docs/EXAMPLE_SCENES.md).
