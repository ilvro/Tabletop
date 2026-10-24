# Documentos e objetos interagíveis — plano de implementação

Data: 23 de outubro de 2026. **Implementado** em 23 de outubro: uso, contrato final e desvios do plano em [DOCUMENTOS_INTERATIVOS.md](DOCUMENTOS_INTERATIVOS.md).

## 1. A ideia

Como em Resident Evil ou em Enigma do Medo: um papel em cima de uma mesa, uma foto na parede, um diário no chão. O mestre (ou o projetor, numa deixa) **interage** com o objeto. Ele sai do lugar e "voa" até a frente da câmera, girando para ficar de frente. O resto da cena desfoca e escurece, e só aquele objeto fica nítido, iluminado como numa vitrine. Dá para girar, aproximar, virar a página e ler. Ao fechar, o objeto volta voando para onde estava.

Serve para pistas, cartas, recortes de jornal, fotos, mapas, chaves e artefatos: tudo o que, numa sessão de Ordem, o mestre hoje mostra fora da mesa (uma imagem colada no chat, um PDF).

## 2. O que já existe e ajuda

- Profundidade de campo (`src/render/depth-of-field.js`) e o caminho de "look ao vivo": o desfoque e o escurecimento do fundo saem quase de graça.
- Câmera publicada, câmera ao vivo e o canal do projetor: o projetor pode mostrar a mesma inspeção que o mestre controla.
- Decalques e telas com texto (`decals.js`, `screens.js`): já desenham texto e imagem em superfícies; servem para gerar o papel de uma carta escrita na própria mesa.
- Figuras recortadas (`figures.js`): o recorte por transparência serve para papéis com bordas rasgadas.

## 3. Contrato

Campo opcional em props (`entity.inspectable`), validado:

```js
inspectable: {
  kind: 'document' | 'object',          // papel com páginas, ou um objeto 3D para girar
  title: 'Carta de Gustav',             // aparece na cartela da inspeção
  pages: [                              // documentos: frente e verso, ou várias folhas
    { imageRef: { id, revision } | null, text: '…' | null, back: { imageRef, text } | null }
  ],
  paper: 'plain' | 'aged' | 'photo' | 'newspaper' | 'notebook',   // acabamento quando a página é texto
  hold: { distance: .45, pitch: 0 },    // como fica na frente da câmera (ajustável)
  secretUntilRevealed: true             // o conteúdo só vai ao projetor depois de revelado
}
```

- O **modelo** do objeto continua sendo o asset (papel, envelope, livro, foto, chave…). Um kit novo de "documentos" na biblioteca: folha A4, folha amassada, envelope, polaroid, recorte de jornal, caderno aberto, pasta de arquivo, todos com um slot de material `page` que recebe a imagem ou o texto.
- `sessionState.inspected`: `{ entityId, page, revealed }` quando o projetor está mostrando uma inspeção. `sessionState.found`: as pistas já reveladas, para um "arquivo de pistas" da sessão.
- O conteúdo (imagens e texto) passa pelo filtro do projetor: com `secretUntilRevealed`, a página só é enviada no momento da revelação.

## 4. Experiência

**No editor (preparar):** selecionar um prop → aba Aparência → seção **Inspecionável**: tipo, título, páginas (arrastar imagens importadas ou escrever o texto com o tipo de papel), prévia da inspeção.

**Na sessão (mostrar):**
1. Clique duplo no objeto (ou botão **Inspecionar** no cartão, ou uma deixa do painel Ao Vivo).
2. O objeto voa até a frente da câmera em ~0,7 s, por um arco suave (curva quíntica, como as transições de câmera), girando para ficar de frente, com uma sombra leve no fundo.
3. O fundo desfoca (profundidade de campo forte) e escurece (vinheta). O objeto ganha uma luz de estúdio própria (principal, preenchimento e contraluz), para ler bem mesmo numa cena escura.
4. Controles: **arrastar** gira (trackball com inércia), **roda** aproxima até ver o detalhe, **duplo clique** volta ao enquadramento, **setas** ou botões trocam a página, **F** vira a folha (verso). **Esc** devolve o objeto ao lugar, voando de volta.
5. **Mostrar aos jogadores:** o projetor faz a mesma inspeção; giro, zoom e página do mestre são enviados ao vivo (mensagem `inspect` com quaternion, zoom e página, suavizada no projetor como a câmera ao vivo). O mestre pode também "soltar" a inspeção no projetor e continuar no editor.

## 5. Técnica

- **Camada de inspeção** (`src/render/inspection.js`): uma cena Three.js separada, desenhada **depois** da principal no mesmo canvas (sem limpar a cor), com câmera própria colada à câmera de trabalho/publicada.
  - O objeto é **clonado** (geometria e materiais compartilhados) para a camada; o original fica escondido durante a inspeção e volta ao fechar. O documento nunca muda.
  - Luz de estúdio própria na camada (três luzes fixas em relação à câmera) e `environment` simples, para metal e vidro.
- **Fundo:** ao abrir, a principal continua desenhando com o desfoque (`effects.setFocus` com abertura máxima e foco a 0,1 m) e uma vinheta escura num passe de tela. Opcional: congelar o fundo numa textura (um quadro) para poupar a GPU durante a leitura.
- **Voo:** posição e rotação interpoladas do transform mundial do objeto até o "ponto de leitura" (na frente da câmera, a `hold.distance`), com escala que preenche ~70% da altura da tela. Na volta, o caminho inverso.
- **Página:** o slot `page` recebe uma `CanvasTexture`. Imagem: a imagem do asset. Texto: renderizado num canvas 2048 px com a tipografia do tipo de papel (como `screens.js` faz com linhas), com papel envelhecido procedural (manchas e bordas, reaproveitando o desgaste de material). O verso é um segundo plano ou um segundo slot.
- **Leitura confortável:** além do 3D, o botão **Ler** mostra a página como imagem nítida em tela cheia sobre o desfoque (overlay DOM), útil para textos longos no projetor.
- **Desempenho:** a camada tem um único objeto; o custo é o desfoque da principal, que já existe. Sem novas texturas por quadro.

## 6. Fases

1. **Inspeção local de objetos** (M): camada de inspeção, voo de ida e volta, giro, zoom, fundo desfocado e escurecido, Esc. Funciona com qualquer prop, sem contrato novo (clique duplo → inspecionar).
2. **Documentos** (M): contrato `inspectable`, kit de papéis na biblioteca, páginas de imagem e de texto com acabamento, troca de página, verso, botão **Ler**.
3. **Projetor** (M): mostrar aos jogadores, mensagem `inspect` ao vivo, filtro de conteúdo secreto, revelar.
4. **Arquivo de pistas** (P): `sessionState.found`; painel com as pistas já reveladas da sessão; reabrir qualquer uma no projetor.
5. **Tutorial** (P): "Pistas e documentos", na pasta Luz e câmera ou numa pasta "Sessão", montando uma carta na Casa de bairro e mostrando no projetor.

## 7. Testes

- Unidade: contrato `inspectable`, filtro do projetor (conteúdo secreto ausente antes de revelar), geração da página de texto (tamanho e quebra de linha).
- E2E: clique duplo abre a inspeção, documento não muda, Esc devolve o objeto à posição exata, giro e página chegam ao projetor, conteúdo secreto não chega antes de revelar.
- Visual: captura de uma carta na mesa da Casa de bairro à noite (a lanterna da Lia ilumina a mesa) antes e durante a inspeção, comparando leitura e clima.
