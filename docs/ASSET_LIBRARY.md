# Catálogo de assets e classificação

Implementado em 3 de outubro de 2026. A aba **Assets** oferece **61 modelos 3D locais**, incluindo os seis objetos do kit inicial e **55 novos assets originais**, com prévias, escala em metros e pivot na base. O foco é investigação e horror paranormal para mesas de Ordem Paranormal. Os modelos e símbolos são originais do Tabletop.

## Acervo

| Família | Exemplos e usos |
| --- | --- |
| Mobiliário | Mesa rústica, banco, estante, cama de ferro, beliche, sofá, guarda-roupa, fogão a lenha, geladeira, pia e banheira. |
| Tecnologia | Televisão de tubo, telefone de disco, rádio, computador, câmera de vigilância e servidores. |
| Industrial | Gerador, tambor, bancada de oficina e armários de vestiário. |
| Saúde | Maca, cadeira de rodas, microscópio, carrinho de instrumentos e suporte de soro. |
| Religioso | Banco de igreja, confessionário, púlpito, sino, lápide e caixão. |
| Paranormal | Altar, velas, círculo ritualístico original, obelisco, correntes, fragmentos anômalos e livro oculto. |
| Exterior | Árvore, pinheiro, rochas, poço, palha, carroça, barraca e fogueira. |
| Urbano | Poste, caçamba, barreira de concreto e cone. |
| Investigação | Quadro de pistas, maleta de perícia, documentos e mala antiga. |

As épocas incluem **Antiguidade**, **Colonial / século XIX**, **Início do século XX**, **Décadas de 1970–1990**, **Contemporânea** e **Atemporal**. São classificações de uso cenográfico. Os cenários incluem hospital, laboratório, delegacia, bunker, fazenda, floresta, igreja, ruínas e outros.

## Encontrar e colocar

1. Abra **Assets** e busque por nome, descrição, material, uso ou tema. A busca ignora acentos e maiúsculas e combina todas as palavras digitadas.
2. Combine **Categoria**, **Época** e **Cenário**. Uma categoria como **Saúde** inclui **Saúde / Instrumentos** e suas demais subcategorias.
3. Selecione uma ou mais tags no campo **Adicionar filtro de tag**, ou clique nas tags dos cards. Todas as tags selecionadas precisam existir no asset. Clique no **×** para remover um filtro.
4. Use **Somente favoritos** para reunir objetos recorrentes. **Limpar filtros** restaura o acervo inteiro. Os filtros permanecem ao alternar as abas durante a sessão.
5. Clique no card e depois no apoio da cena. A colocação usa snap, andares/camadas e histórico existentes. Imagens importadas continuam sendo retratos de tokens.

São exibidos 24 cards por vez; **Mostrar mais assets** acrescenta outros 24. Prévias carregam sob demanda e modelos 3D carregam quando usados na cena.

## Classificar e favoritar

Clique em **Tags** para editar categoria, época, cenários e tags de qualquer asset, interno ou importado. Use **/** nas categorias e vírgulas entre tags/cenários. Há sugestões de categorias e épocas já existentes. Tags livres permitem coleções como `campanha do grupo`, `mansão`, `abandonado` ou `pista principal`, além dos temas `sangue`, `morte`, `conhecimento`, `energia` e `medo` usados no kit.

Cada campo de tags/cenários aceita até 32 valores com 60 caracteres; categoria e época aceitam até 80 caracteres. Tags equivalentes por acentos/maiúsculas são deduplicadas. Remover todas as tags é permitido. A estrela do card alterna o favorito; também é possível salvá-lo no formulário.

O servidor guarda as classificações em **`data/asset-metadata/<id>.json`**, com gravação atômica, revisão de metadados e serialização por asset. Se outra aba alterar a classificação, a gravação retorna conflito; feche e reabra o editor para carregar a versão atual antes de salvar. A revisão de metadados é independente da revisão da geometria referenciada pelas cenas.

Backup deve incluir `data/` inteiro, com `assets/` e `asset-metadata/`. Tags e favoritos sobrevivem ao reinício do navegador e do servidor e não acrescentam campos ao schema das cenas.

A projeção dos jogadores recebe os dados necessários à renderização dos assets usados, sem classificação, favoritos ou descrições da biblioteca que possam revelar pistas do mestre.

## Modelos e limites

Os modelos são receitas estáticas de primitivas, com materiais próprios e prévias SVG geradas da mesma geometria. Execute `node scripts/generate-library.js` na raiz para regenerar os 55 modelos novos, suas prévias e o catálogo. Os IDs do kit inicial permanecem iguais; footprints antigos foram corrigidos para abranger a geometria.

Mesa rústica, banco, cama, pia, bancada, maca, carrinho e altar têm altura de apoio anotada. Props de parede/teto usam a fixação manual do inspetor. Dispositivos são cenográficos; velas, cristais, fogueira e poste têm emissive estático. Adicione luz real separadamente.

Esta entrega inclui catálogo, categorias hierárquicas, busca, tags editáveis, épocas/cenários e favoritos. Continuam pendentes coleções formais além de tags/favoritos, variantes de textura por asset, sockets específicos com fixação automática, receitas/prefabs adicionais e importação glTF com dependências externas. Imagens e GLB estático autocontido continuam importáveis.

## Verificação

`npm test` valida modelos/prévias, bounds/footprints/apoios, filtros, metadados, persistência, concorrência e conservação das referências de cenas. `tests/e2e/asset-library.test.js` percorre filtros, edição de tags, favoritos, colocação, importação e reinício do navegador/servidor; captura em `test-results/asset-library.png`. O teste do editor existente cobre o kit original, apresentação e save/reload. Chromium com WebGL por software não é um benchmark no projetor.
