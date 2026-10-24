// Single source of the keyboard shortcuts shown in tooltips and in the shortcut sheet.
// Keep it true: every entry here is handled by the keydown listener in application.js or by the viewport camera.
export const SHORTCUTS = [
  { group: 'Ferramentas', items: [['Q', 'Selecionar'], ['G', 'Mover'], ['R', 'Girar'], ['V', 'Escala'], ['M', 'Régua'], ['I', 'Conta-gotas'], ['T', 'Esculpir terreno'], ['F', 'Enquadrar seleção']] },
  { group: 'Câmera', items: [['W A S D', 'Andar'], ['Shift', 'Mais rápido'], ['Espaço / Ctrl', 'Subir / descer'], ['Page Up / Down', 'Altura'], ['Botão direito', 'Órbita'], ['Z / C', 'Orbitar em volta do ponto olhado'], ['Clique duplo', 'Olhar para um ponto'], ['L', 'Câmera ao vivo no projetor'], ['N', 'Próximo turno (em combate)'], ['H', 'Destacar interativos'], ['E', 'Abrir porta, acender luz ou ler documento (sob o mouse ou selecionado)'], ['Scroll', 'Zoom']] },
  { group: 'Edição', items: [['Ctrl+Z', 'Desfazer'], ['Ctrl+Shift+Z / Ctrl+Y', 'Refazer'], ['Ctrl+D', 'Duplicar'], ['Ctrl+C / V', 'Copiar / colar objeto'], ['Ctrl+Shift+C / V', 'Copiar / colar material'], ['Delete', 'Excluir'], ['Ctrl+S', 'Salvar'], ['Esc', 'Cancelar / sair']] },
  { group: 'Encontrar', items: [['Ctrl+K', 'Buscar qualquer coisa'], ['?', 'Esta lista']] },
];

export const keyFor = label => SHORTCUTS.flatMap(group => group.items).find(([, name]) => name === label)?.[0] ?? '';

/** The shortcut sheet: one column per group, keys as <kbd>. */
export const shortcutsSheetMarkup = () => `<div class="dialog-header"><div><span class="tt-eyebrow">TECLADO</span><h2 class="tt-display">Atalhos</h2></div><button type="button" data-action="shortcuts" class="icon-button" aria-label="Fechar atalhos">✕</button></div>
  <div class="shortcut-columns">${SHORTCUTS.map(({ group, items }) => `<section><span class="tt-tag is-small">${group}</span><dl>${items.map(([keys, name]) => `<div><dt>${keys.split(' / ').map(part => `<kbd>${part}</kbd>`).join(' ')}</dt><dd>${name}</dd></div>`).join('')}</dl></section>`).join('')}</div>`;
