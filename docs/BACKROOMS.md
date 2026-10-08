# Backrooms · corredores e salas esquecidas

Cena original inspirada na estética das Backrooms, construída em 8 de outubro de 2026. Abra em **Abrir → Cenas → Cenas de exemplo → Backrooms · corredores e salas esquecidas**. O carregamento cria uma cópia editável; Salvar guarda essa cópia sem modificar o exemplo.

O pavimento mede **36 × 30 m**, com teto a **2,8 m**, corredores de **3 m**, 436 entidades e cinco câmeras. Dois eixos longos e duas travessas conectam ramificações, becos e oito setores. A planta possui circuitos para retornar por outro caminho; todos os setores são acessíveis. Não contém saída automática, monstros, tokens, eventos aleatórios ou som embutido.

| Setor | Composição |
| --- | --- |
| Salão amarelo | Pilares repetidos, carpete ocre e papel de parede com losangos. |
| Escritório vazio | Salão amplo com pilares e uma estação de trabalho isolada. |
| Reunião | Mesa, seis cadeiras e documentos sem narrativa predefinida. |
| Arquivo | Arquivos metálicos, estantes e circulação entre os conjuntos. |
| Sala sem luz | Luminária apagada, preenchimento reduzido e uma poltrona isolada. |
| Divisórias | Barreiras baixas que fragmentam o espaço sem fechar as rotas. |
| Manutenção | Piso cinza, painel elétrico, válvula, bomba e caixa de ferramentas. |
| Espera | Cadeiras repetidas, mesa e telefone. |

As câmeras mostram salão, corredor longo, reunião, arquivo e planta. Para a câmera **05 · Planta**, oculte a pasta **10 · Coberturas** ou a camada **Coberturas · ocultar para planta**. Os forros são módulos separados; a ocultação é manual e reversível. Navegar com a câmera de trabalho não publica automaticamente no projetor.

Paredes, pisos e objetos permanecem entidades normais. As passagens são lacunas reais entre segmentos de parede. A conectividade dos 120 células da grade e faixas de 90 cm através dos vãos são verificadas por testes de geometria; isso não acrescenta colisão/pathfinding ao editor. O teto usa placas com juntas geométricas, e as paredes recebem módulos de decoração nas duas faces.

As fluorescentes repetidas têm tubos emissivos. Oito luminárias também emitem luz dinâmica, dentro do orçamento da qualidade Equilibrada; zonas locais mantêm os ambientes legíveis. Bloom e névoa estão desligados. Efeitos começam pausados e as lâmpadas não piscam por padrão. A iluminação pode ser editada, desativada ou substituída pelos controles existentes.

Três modelos locais novos — papel de parede/rodapé, forro e fluorescente dupla — elevam o catálogo para 244 assets. A cena não depende de imagens ou modelos remotos.

Regeneração: `node scripts/generate-library.js` e `node scripts/generate-backrooms-scene.js`. Revisão visual: `node scripts/preview-backrooms-scene.js`. Capturas e logs ficam em `test-results/backrooms-*`. Testes específicos: `tests/backrooms-scene.test.js` e `tests/e2e/backrooms-scene.test.js`.

Validação concluída: 228 testes de domínio/integração (incluindo quatro específicos), builds local e Pages e dois E2E completos aprovados. Os E2E verificam histórico, teto ocultável, salvamento/reabertura e independência da câmera publicada. Cinco vistas revisadas em Chromium/SwiftShader; sem medição de desempenho em GPU física.
