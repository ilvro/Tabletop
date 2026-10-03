# Tabletop

Editor 3D local para preparar cenas e apresentá-las no projetor. O vertical slice inclui sala, porta, tokens, mobiliário, iluminação, histórico e persistência no computador do mestre.

Com Node.js 22.12+:

```bash
npm ci
npm run dev
```

Abrir http://127.0.0.1:5173. Para produção local: `npm run build` e `npm start`, em http://127.0.0.1:3001.

Ver [execução, testes e limitações](docs/VERTICAL_SLICE.md) e [roadmap](docs/ROADMAP.md). Dados locais ficam em `data/`, ignorados pelo Git. Jukebox e Ficha continuam independentes.
