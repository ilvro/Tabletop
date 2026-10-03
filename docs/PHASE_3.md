# Fase 3 — construção e autoria assistida

Entrega de 3 de outubro de 2026. Primeiro incremento da evolução de autoria descrita no marco V2 do [roadmap](ROADMAP.md), sobre as funcionalidades registradas pelo Gemini em [PROGRESSO.md](PROGRESSO.md). O Tabletop continua operado pelo mestre, com apresentação local para projetor.

## O que funciona

- **Pisos poligonais:** desenhar de 3 a 64 vértices, inclusive contornos côncavos, repetidamente sem reload; o desenho usa a altura de construção, independente dos limites do apoio ativo; editar coordenadas locais, dimensões, espessura e material. Contornos cruzados ou degenerados são rejeitados sem alterar a cena.
- **Plataformas e alturas:** pisos podem ter alturas diferentes. O plano de trabalho e o apoio ativo são escolhas explícitas; colocar um token sobre uma superfície sobreposta não escolhe silenciosamente outro andar.
- **Janelas hospedadas:** colocação por clique no centro desejado e arraste com Mover (W) no plano da parede (Alt desliga snap); o vão é reconstruído junto com a janela durante o arraste. Edição numérica de largura/altura, peitoril, posição, parede hospedeira e representação em vidro, grades ou abertura livre. Portas e janelas podem compartilhar coordenada horizontal se seus vãos não se sobrepuserem verticalmente. Redimensionar a parede não pode invalidar uma abertura.
- **Escadas e rampas:** estruturas paramétricas colocadas por clique, com largura, comprimento, desnível, rotação, material e quantidade de degraus (escada). Sobem no sentido Z local positivo a partir da base Y. São apoios explícitos para tokens; a altura acompanha o degrau/inclinação após snap, movimento e edição.
- **Apoios de móveis:** props podem oferecer uma superfície horizontal anotada. A mesa do catálogo informa seu tampo. Tokens, props e luzes apoiados acompanham translação/rotação do móvel; mudanças de altura do apoio também os deslocam. Referências cíclicas são rejeitadas. Excluir o apoio remove dependentes na mesma operação, recuperável por undo.
- **Pastas:** visibilidade e bloqueio herdados, com organização de entidades, tokens e luzes. A apresentação filtra conjuntos ocultos e dependências antes de transmitir dados; também remove metadados de geração.
- **Smart Build:** escritório, reunião e depósito usando os seis assets existentes. Densidade, cadeiras, variação e luzes têm parâmetros próprios; a busca de posicionamento é limitada, respeita contorno, folgas, props existentes e passagem da porta. Não estica móveis. O resultado parcial informa itens que não cabem e conflitos com posições manuais. Iluminação gerada tem orçamento máximo de nove pontos sem sombras.
- **Regeneração:** slots persistentes identificam móveis/luzes. Campos alterados manualmente — nome, material, asset, posição, escala e rotação — são preservados separadamente. Itens excluídos só reaparecem com “Restaurar itens excluídos”. Trocar a receita remove resultados anteriores intactos; itens editados, bloqueados ou com dependentes são mantidos e desvinculados. “Desvincular receita” conserva a composição materializada.
- **Polish:** Shift+clique no viewport/árvore seleciona vários props/tokens; alinhar pivôs/bordas em X/Z, distribuir espaços mantendo extremidades e variar rotação com seed. Variação preserva inclinação e escala. O footprint físico de token independe de sua escala visual. Ajustar um apoio e seus filhos juntos é rejeitado.

Todas as propostas oferecem prévia, aceite e cancelamento. Aceitar é um passo de histórico; prévias obsoletas são rejeitadas. Undo/redo restaura os IDs e os resultados aceitos sem gerar novamente. Duplicação de documento/piso remapeia referências e slots, inclusive exclusões registradas. Conversão cena/mapa mantém receitas editáveis.

## Usar

Executar `npm run dev` em `Tabletop/`; abrir `http://127.0.0.1:5173`. Produção local: `npm run build` e `npm start`, em `http://127.0.0.1:3001`. Portas, instalação e diretório de dados estão em [VERTICAL_SLICE.md](VERTICAL_SLICE.md).

1. Em **Construir**, criar a sala com Quick Build e aceitar. Em **Smart Build**, escolher piso, receita e parâmetros; revisar/aceitar mobiliário.
2. Mover/renomear um móvel e excluir outro. Revisar regeneração: os ajustes permanecem e a exclusão não reaparece. Ativar restauração se desejar.
3. Clicar **Janela** em **Construir → Estruturas e apoio** e clicar no centro desejado na parede, em vista 3D. Arrastar com **Mover (W)** para mudar posição/peitoril e deslocar o recorte junto; Alt permite ajuste livre. Editar medidas ou trocar a parede no inspetor. Sobreposições com portas/janelas são rejeitadas sem alterar o documento.
4. Definir altura de construção e clicar **Piso poligonal**. Clicar nos vértices; Enter conclui, Backspace remove o último e Esc cancela. É possível começar outro polígono imediatamente, inclusive fora do piso anterior. Plataforma cria um piso retangular de 3×3 m, que pode ser ajustado.
5. Em **Construir → Estruturas e apoio**, clicar **Escada** ou **Rampa**, depois clicar no apoio para colocar. Editar largura/comprimento/desnível e degraus no inspetor; **R** orienta a subida. Para colocar tokens em um acesso, selecioná-lo em **Apoio para colocação**.
6. Escolher **Apoio para colocação** antes de colocar tokens/assets. O inspector também permite reassociar objetos e anotar a altura do apoio de um prop.
7. Shift+selecionar móveis e usar o painel **Polish**. Revisar, cancelar ou aceitar; testar desfazer/refazer.
8. Salvar, encerrar navegador/servidor, reabrir e conferir cena/receita. Ocultar uma pasta também a remove da apresentação.

## Contratos e implementação

O schema passa a **2**. `migrations.js` valida e transforma documentos v1 em memória, preservando identidade, revisão e dados. Ler não regrava arquivos: o próximo salvamento explícito grava v2 e incrementa revisão, mantendo um backup com o documento original. Builds antigos só leem v1; preservar backups ao retornar a um build anterior.

Novos dados: `floor.vertices` em XZ local, `window`, `stairs`/`ramp` com dimensões/desnível (`stairs.steps`), `prop.supportHeight`, referências de apoio/grupo em tokens/luzes, `group.visible` e `layout.compositions`. Cada composição guarda área, receita/versão/parâmetros e slots com ID/tipo/baseline. Baselines são dados históricos; um slot sem entidade representa exclusão deliberada. Assets continuam separados e referenciados por ID/revisão.

`geometry.js` concentra contornos, footprints e grupos; `furnishing.js` materializa decoração/iluminação e aplica diff; `polish.js` produz ajustes. Ambos devolvem propostas sem DOM/Three.js ou mutação do documento. `proposal.accept` aplica inclusões, atualizações, remoções e proveniência de forma atômica. Futuras receitas/prefabs podem produzir o mesmo contrato. O renderer constrói malhas e previews desses dados; não decide regras de regeneração.

## Validação e limites

**Build aprovado; 55 testes de domínio, geometria, projeção e servidor; três testes de navegador.** Incluem migração sem escrita implícita, backup v1, abertura física empilhada, triangulação côncava, apoios e ciclos, receita parcial, overrides/exclusões, conservação de dependentes, slots após duplicação/reinício, polish e rejeição de proposta obsoleta. Incluem também janela movida com recorte em parede rotacionada, validação de acessos, alturas após snap e dependentes sobre acessos editados.

O E2E da Fase 3 verifica dois pisos poligonais sem reload, cancelamento de desenho, janela colocada por clique/arrastada com undo/redo e escadas/rampas com token apoiado; usa interações reais de mouse/campos e compara o documento após reiniciar navegador e servidor. Imagens de mestre/apresentação ficam em `test-results/phase3-*.png`. Testes usam dados temporários. Executar `npm test`, `npm run build` e `npm run test:e2e`; Chromium existente pode ser indicado por `TABLETOP_BROWSER_PATH`.

Ainda não há junções anguladas/T automáticas, paredes compartilhadas, modelo completo de andares ou terreno esculpido. Escadas/rampas já existem como estruturas independentes; a associação a andares e a ocultação por nível continuam pendentes. A altura/apoio explícito é a base para esses recursos. Polígonos não têm furos internos nem geração automática de paredes no contorno. Apoios anotados em móveis são planos horizontais; escadas/rampas oferecem altura variável pela posição; não há sockets, física ou colisão manual automática. Durante arraste, tokens vinculados a escadas/rampas acompanham a altura local; os demais objetos mantêm o plano inicial. Mudar apoio é uma escolha no inspetor. Não há navegação automática entre apoios/andares.

As receitas usam o catálogo atual e footprints retangulares, com busca local e parcial. Não constituem um solver geral de circulação: avisos exigem revisão, e mudanças manuais podem criar sobreposições. Alterar um piso não reconstrói suas paredes; a área de geração acompanha dimensões, enquanto estruturas seguem edição explícita. Luzes existentes permanecem ao mobiliar; intensidade final deve ser ajustada pelo mestre.

Validação gráfica ocorreu em Chromium headless com WebGL por software. Não é benchmark da GPU/projetor. Não foram implementados LAN, novas integrações, efeitos cinematográficos ou transporte ZIP; Jukebox e Ficha permaneceram intactos.

Próximos incrementos: junções e paredes compartilhadas; níveis e associação dos acessos aos andares; catálogo/anchors e prefabs reutilizáveis; câmera/iluminação conforme avaliação no projetor. Esses itens continuam pendentes no roadmap.
