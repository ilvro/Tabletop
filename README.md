# Tabletop

Editor 3D local para preparar cenas e apresentá-las no projetor. O vertical slice inclui sala, porta, tokens, mobiliário, iluminação, histórico e persistência no computador do mestre.

Com Node.js 22.12+:

```bash
npm ci
npm run dev
```

Abrir http://127.0.0.1:5173. Para produção local: `npm run build` e `npm start`, em http://127.0.0.1:3001.

Ver [execução, testes e limitações](docs/VERTICAL_SLICE.md), [construção/Smart Build/polish da Fase 3](docs/PHASE_3.md) e [roadmap](docs/ROADMAP.md). A biblioteca tem 161 assets originais, com categorias, épocas, cenários, tags editáveis e favoritos. Veja [catálogo e classificação](docs/ASSET_LIBRARY.md).

Câmera: WASD navega, Shift acelera, Page Up/Down altera altura; na perspectiva, Espaço sobe e Ctrl desce. Zoom, pan e órbita podem ser usados enquanto anda. Botão direito seleciona ao soltar sem arrastar. G/R/V movem/giram/escalam objetos. Lente, velocidade e transições ficam em **Cena**: [controles](docs/CAMERA.md). [Andamento e pendências](progress.md).

Dados locais ficam em `data/`, ignorados pelo Git. Jukebox e Ficha continuam independentes.

Ambientes: **Cena** oferece presets de dia/tarde/noite, neblina, chuva, pântano e calor, com sol/lua, Kelvin/HSV, céu/nuvens, partículas e biblioteca própria. Objetos podem acender por horário: [controles e limites](docs/ENVIRONMENTS.md).
