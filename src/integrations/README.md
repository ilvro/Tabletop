# Fronteiras reservadas

O slice não conecta Jukebox ou Ficha. Nenhum controle de integração aparece na UI.

Um futuro adaptador musical recebe comandos de sessão explícitos e retorna prontidão, capacidades e resultado confirmado por requestId. A referência persistida é audioCue; load, autosave e undo não disparam comandos externos.

Um futuro adaptador de fichas recebe provider + collectionId + sheetId, lê projeções com revisão e envia comandos de recursos para a autoridade da ficha. O domínio de mapa/token não guarda uma segunda autoridade de PV/PD.

Esses adaptadores serão compostos na aplicação. Não entram no renderer nem no reducer de comandos visuais. Ver docs/ARCHITECTURE.md para contratos de integração e autorização.
