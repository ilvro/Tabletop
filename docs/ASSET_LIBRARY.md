# Catálogo de assets e classificação

Implementado em 3 de outubro de 2026. A aba **Assets** oferece **161 modelos 3D locais**, incluindo os seis objetos do kit inicial e **155 novos assets originais**, com prévias, escala em metros e pivot na base. O foco é investigação e horror paranormal para mesas de Ordem Paranormal. Os modelos e símbolos são originais do Tabletop. A segunda ampliação acrescentou 66 objetos, incluindo veículos e novos kits de interiores, comércio, laboratório, indústria e ruínas. A terceira ampliação (4 de outubro) acrescentou 34 objetos: casarão/sótão, asilo e necrotério, cemitério, rua, rural e equipamentos de investigação.

## Acervo

| Família | Exemplos e usos |
| --- | --- |
| Mobiliário | Mesa rústica, banco, estante, cama de ferro, beliche, sofá, guarda-roupa, cozinha/banheiro, poltrona, cômoda, espelho, relógio de pêndulo, radiador, ventilador e piano. |
| Tecnologia | Televisão de tubo, telefone, rádio, computador, vigilância, servidores, máquina de escrever, gravador de rolo, VHS, central de monitores, osciloscópio, notebook, projetor de slides e antena. |
| Industrial | Gerador, tambor, bancada, armários, palete, paleteira, carrinho de ferramentas, válvula, quadro elétrico, reservatório, bomba de combustível e cavalete de extração. |
| Saúde | Maca, cadeira de rodas, microscópio, carrinho e soro, centrífuga, frascos, tubos de ensaio, oxigênio, mesa de autópsia, gavetas de necrotério e luminária cirúrgica. |
| Religioso | Banco de igreja, confessionário, púlpito, sino, lápide, caixão e mausoléu. |
| Paranormal | Altar, velas, círculo original, obelisco, correntes, cristais e livro, cápsula de contenção, máscara, relicário, sarcófago, crânio, efígie e arco anômalo. |
| Exterior | Árvores, rochas, poço, palha, carroça, barraca, fogueira, árvore seca, toco, arbustos, grade de cemitério, coluna quebrada e mureta desmoronada. |
| Urbano | Poste, caçamba, barreira de concreto, cone e grade de drenagem. |
| Investigação | Quadro de pistas, maleta de perícia, documentos, mala antiga, cofre e estojo tático. |
| Comercial | Balcão de recepção, caixa registradora, vitrine, máquina de bebidas, gôndola, banco de lanchonete, banqueta, sinuca e carteira escolar. |
| Veículos | Carro de passeio, furgão de carga, ambulância, viatura de investigação, motocicleta, bicicleta e barco a remo. |
| Terceira ampliação | Cadeira de balanço, lareira, cabideiro, fichário de biblioteca, berço, cavalo de balanço, gramofone, globo, lustre, lampião, tabuleiro espiritual, jaula, cadeira de contenção, biombo, saco mortuário, poça de sangue, cova com cruz, cova aberta, anjo de cemitério, candelabro ritual, cerca de madeira, bomba d’água, lenha, carrinho de mão, orelhão, ponto de ônibus, hidrante, lixeira, carrinho de supermercado, fliperama, quadro-negro, grade de cela e filmadora em tripé. |

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

Os modelos são receitas estáticas de primitivas, com materiais próprios e prévias SVG geradas da mesma geometria. Execute `node scripts/generate-library.js` na raiz para regenerar os 155 modelos novos, suas prévias e o catálogo. Os IDs do kit inicial permanecem iguais; footprints antigos foram corrigidos para abranger a geometria.

Mesas, bancos, cama, pia, bancada, maca, carrinhos, altar e outros móveis têm altura de apoio anotada. A segunda ampliação inclui apoios na mesa de centro, criado-mudo, cômoda, balcão, vitrine, carteira escolar, mesa de autópsia, palete e toco. Veículos, dispositivos, móveis fechados e túmulos são estáticos e cenográficos; portas e mecanismos não possuem interação automática. Props de parede/teto usam a fixação manual do inspetor. A terceira ampliação anota apoio no fichário de biblioteca. Velas, cristais, fogueira, poste, lareira, lustre, candelabro, lampião, fliperama e luz da filmadora têm emissive estático na receita. Novas fogueiras colocadas pelo editor recebem chamas animadas e luz própria; outros objetos podem receber fogo/fumaça pelo inspetor. Instâncias antigas conservam sua aparência até edição explícita. Texturas locais também podem substituir um material nomeado do objeto: [MATERIALS.md](MATERIALS.md).

Esta entrega inclui catálogo, categorias hierárquicas, busca, tags editáveis, épocas/cenários e favoritos. Continuam pendentes coleções formais além de tags/favoritos, variantes de textura por asset, sockets específicos com fixação automática, receitas/prefabs adicionais e importação glTF com dependências externas. Imagens e GLB estático autocontido continuam importáveis.

## Verificação

`npm test` valida modelos/prévias, bounds/footprints/apoios, filtros, metadados, persistência, concorrência e conservação das referências de cenas. `tests/e2e/asset-library.test.js` percorre filtros, edição de tags, favoritos, paginação completa, filtros de veículos, colocação de moto e maca, importação e reinício do navegador/servidor; captura em `test-results/asset-library.png`. O teste do editor existente cobre o kit original, apresentação e save/reload. Chromium com WebGL por software não é um benchmark no projetor.
