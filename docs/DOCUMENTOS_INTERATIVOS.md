# Documentos e objetos inspecionáveis

Uma carta na mesa, uma foto, um recorte de jornal, uma chave: o mestre pega o objeto e ele voa até a frente da câmera, girando para ficar de frente. O resto da cena desfoca e escurece, e o objeto fica sob uma luz de estúdio própria, legível mesmo numa cena escura. Dá para girar, aproximar, trocar de página, virar a folha e ler. Ao devolver, ele volta voando para onde estava. Plano original: [PLANO_DOCUMENTOS_INTERATIVOS.md](PLANO_DOCUMENTOS_INTERATIVOS.md).

## Preparar no editor

1. Em **Assets**, busque **documento** (ou carta, foto, jornal, caderno): o kit **Documentos / Papéis** tem Folha · A4, Folha · amassada, Envelope · com carta, Foto · instantânea, Recorte · de jornal, Caderno · aberto e Pasta · de arquivo. Cada um tem um slot de material `page`, que mostra a primeira página na mesa.
2. Selecione o objeto → aba **Aparência** → seção **Inspecionável**: marque **Pista inspecionável**.
   - **Tipo**: *Documento* (páginas para ler) ou *Objeto* (só girar e olhar de perto).
   - **Título na inspeção**: a cartela no alto da tela.
   - **Papel**: comum (dobrado em três), envelhecido (manchas, tinta sépia, bordas rasgadas), foto (a imagem cobre a folha; o texto vira legenda à mão), jornal (a primeira linha é a manchete; o resto corre em duas colunas, com borda rasgada) e caderno pautado (linhas azuis, margem vermelha, letra à mão).
   - **Páginas** (até 12): texto (até 3 000 caracteres) e/ou uma imagem importada na biblioteca; **Escrever no verso** acrescenta o verso. O texto quebra as linhas sozinho e a letra diminui até caber.
   - **Secreto até revelar** (ligado por padrão): o projetor recebe uma folha em branco, sem título, até a pista ser mostrada.
   - **Na frente da câmera**: distância (0,2–2 m) e inclinação (−60° a 60°).
   - **Inspecionar · prévia** abre a inspeção ali mesmo.

Qualquer modelo pode ser um documento: sem o slot `page`, ele gira na inspeção e as páginas aparecem em **Ler**.

## Na sessão

- **Abrir**: **E** com o mouse sobre o documento (ou com ele selecionado), ou clique duplo no objeto (documentos e qualquer objeto com até 60 cm; nos maiores, o clique duplo continua olhando para o ponto), o botão de lupa no cartão do objeto ou **Inspecionar** no menu do botão direito.
- **Arrastar** gira (com inércia), **roda** aproxima mantendo o ponto sob o cursor, **Shift + arrastar** ou o botão direito desloca, **clique duplo** volta ao enquadramento.
- **← / →** trocam a página, **F** vira a folha (o verso aparece quando ele fica de frente para a câmera), **Enter** ou **Ler** mostra a página nítida em tela cheia, **Esc** fecha a leitura e depois devolve o objeto.
- Durante a inspeção os outros atalhos ficam suspensos (G/R/V, Delete, WASD); Ctrl+Z continua funcionando.

O documento da cena não muda: o que voa é um clone que divide geometria e materiais com o original, escondido enquanto está fora. O fundo usa a profundidade de campo existente com abertura máxima e foco a 12 cm, mais uma vinheta. Quando o objeto assenta, o quadro de fundo é guardado numa textura e só o objeto é redesenhado enquanto se lê (sem efeitos ligados não há desfoque, e o fundo continua sendo desenhado normalmente).

## Mostrar aos jogadores

Inspecionar no editor não muda o projetor (a câmera de trabalho continua separada da publicada). Com a segunda tela aberta:

- **Mostrar aos jogadores** revela a pista (um passo de desfazer, **Revelar pista**), envia o conteúdo ao projetor e leva a mesma inspeção para lá. Giro, zoom, deslocamento, página e leitura seguem ao vivo, suavizados (mensagem `inspect`). Clicar de novo tira do projetor.
- **Soltar no projetor** fecha a inspeção no editor e deixa o projetor mostrando; recolha em **Tomadas → Sessão → Pistas reveladas**.
- **Devolver** (Esc) fecha nas duas telas.
- Objetos só do mestre não podem ser mostrados.

**Pistas reveladas** (aba Tomadas) lista as pistas em ordem: **Projetor** reabre qualquer uma no projetor, **Ver** inspeciona no editor, **Esquecer** a torna secreta de novo. A lista é salva com a cena (`sessionState.found`).

## Contrato

```js
entity.inspectable = {
  kind: 'document' | 'object',
  title: '',                        // até 80 caracteres
  pages: [{ imageRef: { id, revision } | null, text: string | null, back: { imageRef, text } | null }],
  paper: 'plain' | 'aged' | 'photo' | 'newspaper' | 'notebook',
  hold: { distance: .45, pitch: 0 },
  secretUntilRevealed: true,
}
sessionState.found = [entityId, …]  // opcional; comandos clue.reveal e clue.forget
```

- Só props (não cabos nem decalques). Documentos têm de 1 a 12 páginas; objetos, nenhuma.
- Filtro do projetor (`projectPresentation`): pista secreta não revelada vira uma página em branco sem título; imagens das páginas só entram nos assets enviados quando visíveis; pistas só do mestre nunca saem.
- O estado da inspeção em curso (`entityId`, rotação, zoom, página, leitura) **não** é salvo na cena, diferente do plano: é estado de sessão do editor, reenviado a um projetor que se reconecta. Assim, abrir a cena de novo não reabre uma inspeção esquecida.

## Limites

- A sombra no fundo é uma mancha suave atrás do objeto, não uma sombra projetada na cena.
- O verso usa o mesmo slot da frente, espelhado; modelos com páginas em pé (molduras) também funcionam, mas o kit traz só papéis deitados.
- As imagens são escolhidas numa lista (não há arrastar e soltar da biblioteca para a página).
- A fonte manuscrita depende das fontes do sistema (Segoe Print, Bradley Hand, Comic Neue ou a cursiva padrão).
- Com o fundo congelado, fogo, chuva e telas param de animar enquanto se lê.

Testes: `tests/inspectables.test.js` (contrato, quebra de linha, filtro do projetor, pistas) e `tests/e2e/inspection.test.js` (clique duplo, documento intacto, Esc no lugar exato, página/verso, leitura, segredo no projetor, mostrar, giro e página ao vivo, fechar nas duas telas). Tutorial: **Luz e câmera → Pistas e documentos**.
