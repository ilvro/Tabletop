# Casa de bairro

Cena piloto do [plano de cenas padrão](DEFAULT_SCENES_PLAN.md), construída em 8 de outubro de 2026. Disponível em **Abrir → Cenas → Cenas de exemplo → Casa de bairro · jardim e quintal**. Abrir cria uma cópia independente; use Salvar para guardá-la.

O lote mede **24 × 30 m**. A casa térrea ocupa 12 × 15 m, com garagem lateral de 6 × 8 m, varanda, jardim frontal, passagem lateral e pátio no quintal. São **171 elementos editáveis**, dez pastas por setor e cinco câmeras. Nenhum token, segredo ou enredo vem predefinido.

| Setor | Organização e uso |
| --- | --- |
| Sala e jantar | Sofá, poltrona, tapete, TV, estante, mesa com quatro lugares e cortinas abertas. |
| Corredor | Liga a sala aos dois quartos, banheiro, cozinha e quintal. |
| Quarto de casal | Cama larga, guarda-roupa, cômoda, mesa de cabeceira, telefone e mala. |
| Quarto e estudo | Cama, mesa com laptop/documentos, cadeira, estante e guarda-roupa. |
| Cozinha | Pia, bancadas, fogão de quatro bocas e geladeira; acesso pela sala e corredor. |
| Banheiro e lavanderia | Chuveiro, vaso, pia e espelho; lavanderia separada com lavadora, tanque, armário e saída para o quintal. |
| Garagem | Carro, bancada de ferramentas, bicicleta e painel; entrada de veículos e ligação com a sala. |
| Exterior | Muros baixos, portões, caminhos, árvores, canteiros, vasos, banco e carrinho de mão. |

As portas recortam as paredes e começam abertas. As folhas da passagem da sala abrem para a sala, liberando as entradas dos quartos. Pisos servem de apoio para tokens; objetos sobre mesas mantêm vínculo com o móvel. A verificação geométrica amostra passagens e rotas de 70 cm em duas alturas, incluindo móveis e folhas abertas. O editor continua sem colisão/pathfinding completos.

Para a vista superior, oculte a pasta **10 · Coberturas** ou a camada **Coberturas · ocultar para planta** e escolha a câmera **05 · Planta**. Telhado, forros e coberturas da varanda/garagem ficam juntos. A mudança é manual e reversível; navegar com a câmera de trabalho não publica automaticamente no projetor.

As demais câmeras mostram chegada pelo jardim, sala, cozinha e quarto de estudo. A primeira gera a capa dinâmica. A iluminação usa luz do dia, zonas de preenchimento e oito plafons vinculados às fontes; bloom e névoa estão desligados. As peças são modelos procedurais locais, sem imagens externas ou iluminação pintada.

Nove complementos residenciais entram na biblioteca: telhado, fogão doméstico, lavadora, balcão, vaso, plafon, cortinas, louça e piso cerâmico modular. Na entrega da casa, o catálogo totalizava 241 assets. Seus modelos e superfícies podem ser editados com os controles existentes.

Regeneração: `node scripts/generate-library.js` e `node scripts/generate-house-scene.js`. Revisão no viewport: `node scripts/preview-house-scene.js`, com capturas e métricas em `test-results/house-*`. Testes: `tests/house-scene.test.js` e `tests/e2e/house-scene.test.js`; construir servidor e Pages antes do E2E.

Validação: 224 testes de domínio/integração, quatro testes direcionados finais e dois fluxos E2E completos (servidor/Pages) aprovados; ambos os builds incluem apenas os três exemplos atuais. Cinco enquadramentos conferidos no viewport. Salvamento/reabertura, histórico, cobertura e independência da câmera publicada verificados. Capturas em SwiftShader demonstram funcionamento, sem medição de desempenho em GPU física.
