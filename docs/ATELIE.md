# Ateliê de documentos

O editor de documentos de RPG (*handouts*) é um projeto separado: `/home/ilvro/Documents/Projects/Atelie`. Os dois serão publicados no GitHub Pages da mesma conta (`https://<conta>.github.io/Tabletop/` e `/Atelie/`), na mesma origem.

- Plano e etapas: `../Atelie/docs/plano/00-LEIA-PRIMEIRO.md` (etapas 1–27 e a opcional 29 no Ateliê; identidade e interface em `PLANO-INTERFACE.md`).
- Contrato com o Tabletop: `../Atelie/docs/plano/CONTRATO-TABLETOP.md`. Três caminhos: banco de troca no navegador (`mesa-handouts-v1`) e `BroadcastChannel('mesa:handout')` na mesma origem; janela com `postMessage` entre origens diferentes; HTTP com os servidores locais.
- A integração aqui é a **etapa 28**: `../Atelie/docs/plano/etapa-28-integracao-tabletop.md`. O Tabletop recebe só imagens assadas (PNG) e guarda qual documento as gerou (`design` num lado de página inspecionável); nunca desenha camadas.
