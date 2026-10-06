# Presets pessoais de pincéis

Disponível desde 6 de outubro de 2026, no servidor local e no Pages.

1. Selecione um terreno ou uma rocha/paredão esculpível.
2. Em **Propriedades → Pincel de superfície**, ajuste a ferramenta, o tamanho, a força e as bordas.
3. Abra **Meus pincéis · terreno** ou **Meus pincéis · rocha**, escreva um nome e clique **Salvar novo**.
4. Em qualquer cena, selecione uma superfície do mesmo tipo, escolha o preset em **Pincéis salvos** e clique **Usar pincel selecionado**. Se o pincel estiver parado, use **Ativar pincel / Esculpir esta superfície** ou **T** para começar.

Escolher um item na lista preenche o nome; **Usar pincel selecionado** restaura os ajustes. **Atualizar ajustes** substitui as configurações do preset selecionado pelos valores atuais, mantendo seu nome. **Renomear** usa o campo Nome do pincel e conserva os ajustes salvos. **Salvar novo** cria outro preset; **Excluir preset** remove apenas o item da biblioteca, sem alterar a cena ou os ajustes em uso.

## O que é salvo

| Superfície | Configurações |
| --- | --- |
| Terreno | Ferramenta, raio/metade do lado, força/intensidade, dureza, formato, encaixe na malha e proteção de pisos. |
| Nivelar terreno | Também a altura desejada em metros no mundo. |
| Esculpir rocha natural no terreno | Também o padrão, tamanho das formações e seed. |
| Água no terreno | Também nível da água em metros no mundo e profundidade do leito; formato circular sem encaixe. |
| Rocha/paredão | Ferramenta, raio, força/intensidade e dureza. O pincel acompanha a face; Aplainar usa a face clicada. |

As listas de terreno e rocha são separadas. Nomes precisam ter de 1 a 80 caracteres; o mesmo nome pode existir uma vez em cada lista. O limite é de 100 presets no total.

A camada de pintura permanece a escolhida no terreno atual. Para pintar, escolha uma camada visível com distribuição **Pintura manual**. Presets não incluem texturas, cores, máscaras pintadas, geometrias ou vínculos com objetos. Aplicar ou administrar presets não muda o documento, não cria entradas no histórico e não publica câmeras. Os traços continuam com o desfazer habitual.

## Onde ficam os pincéis

A biblioteca fica no armazenamento deste navegador, por endereço e caminho da aplicação. Continua disponível após recarregar ou fechar o navegador e em outras cenas do mesmo endereço. Não exige salvar a cena. Outros navegadores, perfis, dispositivos, portas ou instalações em caminhos diferentes possuem bibliotecas próprias. Limpar os dados do site apaga a biblioteca; o JSON de uma cena e os backups do servidor não incluem presets. Exportação/importação de presets ainda não está disponível.

Gravações só são anunciadas como salvas depois de confirmadas pelo navegador. Falhas de armazenamento mostram uma mensagem e permitem tentar novamente. Alterar ou excluir uma revisão que mudou em outra aba é recusado e a lista é atualizada; selecione o item novamente para trabalhar com a versão atual. Para ver outros presets adicionados em outra aba, recarregue a página. Uma lista antiga não permite sobrescrever uma revisão mais recente silenciosamente.
