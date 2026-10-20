import { icon, escapeHTML as esc } from './icons.js';
import { ecosystemRail } from './ecosystem.js';

export const button = (action, label, glyph, className = '', extra = '') => `<button type="button" data-action="${action}" class="${className}" ${extra}>${glyph ? icon(glyph) : ''}<span>${label}</span></button>`;

const railTab = (tab, label, glyph) => `<button type="button" data-tab="${tab}" class="rail-btn" data-tip="${label}" aria-label="${label}">${icon(glyph, 22)}<span>${label}</span></button>`;
const railAction = (action, label, glyph, extra = '') => `<button type="button" data-action="${action}" class="rail-btn" data-tip="${label}" aria-label="${label}" ${extra}>${icon(glyph, 22)}<span>${label}</span></button>`;
const toolButton = (tool, label, glyph, key, active = '', extra = '') => button(`tool-${tool}`, '', glyph, `icon-button${active}`, `data-tip="${label}" data-key="${key}" aria-label="${label}"${extra}`);

/** The static markup of the editor shell; every dynamic part is filled in by the application. */
export function shellMarkup({ storage, homeURL }) {
  return `
    <svg class="svg-defs" width="0" height="0" aria-hidden="true"><defs>
      <filter id="tt-rim-light" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="ambientBlur" /><feOffset in="ambientBlur" dx="0" dy="12" result="ambientOffset" />
        <feFlood flood-color="#000000" flood-opacity="0.8" result="shadowColor" /><feComposite in="shadowColor" in2="ambientOffset" operator="in" result="ambientShadow" />
        <feMorphology in="SourceAlpha" operator="dilate" radius="1.8" result="dilated" /><feOffset in="dilated" dx="-2.5" dy="0" result="shiftedDilated" />
        <feGaussianBlur in="shiftedDilated" stdDeviation="1.5" result="fadedOutline" /><feComposite in="fadedOutline" in2="SourceAlpha" operator="out" result="outerRim" />
        <feFlood id="tt-rim-flood" flood-color="#e3b878" flood-opacity="0.55" result="outlineColor" /><feComposite in="outlineColor" in2="outerRim" operator="in" result="coloredRim" />
        <feMerge><feMergeNode in="ambientShadow" /><feMergeNode in="coloredRim" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter></defs></svg>
    <div class="app-shell">
      <nav class="rail" aria-label="Navegação">
        <a class="brand" href="${esc(homeURL)}" aria-label="Tabletop" data-tip="Tabletop"><span class="brand-mark">T</span></a>
        <div class="tabs rail-tabs" role="toolbar" aria-label="Painéis">
          ${railTab('build', 'Construir', 'room')}${railTab('elements', 'Elementos', 'layers')}${railTab('scene', 'Ambiente', 'sun')}${railTab('shots', 'Tomadas', 'camera')}
        </div>
        <i class="rail-sep"></i>
        <div class="rail-group">
          <button type="button" data-tab="assets" class="rail-btn" aria-controls="assets-dialog" aria-expanded="false" data-tip="Assets" aria-label="Assets: modelos, texturas e retratos">${icon('frame', 22)}<span>Assets</span></button>
          ${railAction('open', 'Abrir', 'folder')}${railAction('new', 'Nova', 'plus')}
        </div>
        <span class="rail-spacer"></span>
        <div class="rail-group">
          ${railAction('command-palette', 'Buscar', 'search', 'data-key="Ctrl+K"')}${railAction('shortcuts', 'Atalhos', 'help', 'data-key="?"')}
          ${railAction('tutorials', 'Tutoriais', 'cap', 'aria-expanded="false" aria-controls="tutorial-center"')}
        </div>
        ${ecosystemRail()}
        <span class="storage-dot sidebar-footer" title="${storage === 'browser' ? 'Dados salvos neste navegador.' : 'Sua mesa, no seu computador.'}"><i class="local-dot"></i><span class="sr-only">${storage === 'browser' ? 'Dados salvos neste navegador.' : 'Sua mesa, no seu computador.'}</span></span>
      </nav>
      <header class="app-header">
        <span id="doc-type-eyebrow" class="tt-tag is-small is-scene">CENA</span>
        <input id="scene-name" class="tt-display" aria-label="Nome da cena" maxlength="256" disabled />
        <span id="take" class="take" aria-label="Revisão">RASCUNHO</span>
        <button type="button" data-action="copy-link" class="icon-button" data-tip="Copiar link da cena" data-tip-side="bottom" aria-label="Copiar link da cena">${icon('copy', 16)}</button>
        <span id="save-status" role="status" class="save-status"></span>
        <div class="slate-center"><button type="button" id="view-tag" class="view-tag" data-action="view-tag"><i class="view-dot"></i><span>ENSAIO</span></button></div>
        <div class="header-actions">
          ${button('undo', '', 'undo', 'icon-button', 'title="Desfazer (Ctrl+Z)" aria-label="Desfazer" id="undo"')}${button('redo', '', 'redo', 'icon-button', 'title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" id="redo"')}
          ${button('present', 'Apresentar', 'display', 'quiet')}${button('save', 'Salvar', 'save', 'primary', 'id="save-scene"')}
        </div>
      </header>
      <aside class="sidebar">
        <div class="drawer-heading"><span id="drawer-title" class="tt-tag">CONSTRUIR</span></div>
        <div class="tt-rule"></div>
        <div id="side-content" class="side-content"></div>
      </aside>
      <main class="workspace">
        <div id="viewport" aria-label="Viewport 3D"></div>
        <div class="tt-brackets" aria-hidden="true"></div>
        <div class="tool-strip" role="toolbar" aria-label="Ferramentas">${toolButton('select', 'Selecionar', 'cursor', 'Q', ' active')}${toolButton('move', 'Mover', 'move', 'G')}${toolButton('rotate', 'Rotacionar', 'rotate', 'R')}${toolButton('scale', 'Escala', 'scale', 'V')}<i></i>${toolButton('measure', 'Régua', 'ruler', 'M', '', ' aria-pressed="false"')}${button('material-eyedropper', '', 'eyedropper', 'icon-button', 'data-tip="Conta-gotas" data-key="I" aria-label="Conta-gotas" aria-pressed="false"')}</div>
        <button type="button" data-action="sidebar-toggle" class="edge-toggle edge-left" aria-expanded="true" aria-controls="side-content" aria-label="Mostrar ou ocultar o painel de ferramentas">${icon('panel-left', 16)}</button>
        <button type="button" data-action="inspector-toggle" class="edge-toggle edge-right" aria-expanded="true" aria-controls="inspector-content" aria-label="Mostrar ou ocultar as propriedades">${icon('panel-right', 16)}</button>
        <div id="welcome" class="welcome-card"></div>
        <div id="selection-bar" class="selection-bar" role="toolbar" aria-label="Ações do objeto" hidden></div>
        <div id="shot-dock" class="shot-dock" role="group" aria-label="Tomadas" hidden></div>
        <div class="stage-cut" aria-hidden="true"><i></i><i></i></div>
        <aside id="tutorial-center" class="tutorial-center" aria-label="Tutoriais" hidden></aside><div id="tool-context" class="tool-context" hidden></div><div id="proposal-bar" class="proposal-bar" hidden></div>
        <span id="gesture-hint" class="gesture-hint">WASD: câmera · Shift: rápido · Direito: órbita · Scroll: zoom</span>
        <div class="viewport-bottom"><div class="camera-strip">${button('perspective', 'Perspectiva', 'camera', 'quiet active')}${button('top', 'Superior', 'floor', 'quiet')}${button('frame', 'Enquadrar', 'frame', 'quiet')}${button('cutaway', 'Ver interior', 'eye', 'quiet active', 'aria-pressed="true"')}${button('roofs', 'Telhados', 'room', 'quiet active', 'aria-pressed="true" title="Mostrar ou ocultar telhados e forros enquanto edita"')}${button('fullscreen', 'Tela cheia', 'frame', 'quiet', 'title="Capturar WASD e suas combinações em tela cheia; Esc sai" aria-pressed="false"')}</div><span id="scene-summary" class="scene-summary">Preparando sua mesa…</span></div>
        <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>
      </main>
      <aside class="inspector"><div class="panel-heading"><span class="tt-eyebrow">PROPRIEDADES</span></div><div class="tt-rule"></div><div id="inspector-content"></div></aside>
    </div>
    <div id="presentation-controls" hidden><span id="presentation-name"></span>${button('present', 'Voltar à edição', 'close', 'quiet')}${button('fullscreen', 'Tela cheia', 'frame', 'quiet')}</div>
    <dialog id="documents-dialog" class="library-dialog floating-window" aria-labelledby="documents-title">
      <div class="dialog-header">
        <div class="dialog-title-group" data-window-handle tabindex="0" role="group" aria-label="Mover janela Abrir: arraste ou use as setas">
          <span class="eyebrow">BIBLIOTECA & GESTÃO</span>
          <h2 id="documents-title">Abrir e gerenciar</h2>
        </div>
        <button type="button" data-window-reset class="quiet" aria-label="Reposicionar janela Abrir" title="Reposicionar janela">↺</button><button type="button" id="close-library-dialog" data-action="close-dialog" class="icon-button dialog-close-btn" aria-label="Fechar painel" title="Fechar (Esc)">
          ${icon('close', 18)}
        </button>
      </div>
      <nav class="dialog-tabs">
        <button type="button" data-dialog-tab="scenes" class="active">${icon('room', 14)} Cenas</button>
        <button type="button" data-dialog-tab="maps">${icon('floor', 14)} Mapas</button>
        <button type="button" data-dialog-tab="tokens">${icon('token', 14)} Tokens</button>
        <button type="button" data-dialog-tab="documents">${icon('folder', 14)} Documentos</button>
      </nav>
      <div id="documents-tab-content" class="dialog-tab-content"></div>
    </dialog>
    <dialog id="assets-dialog" class="floating-window assets-window" aria-labelledby="assets-title">
      <div class="dialog-header"><div data-window-handle class="dialog-title-group" tabindex="0" role="group" aria-label="Mover janela Assets: arraste ou use as setas"><span class="eyebrow">BIBLIOTECA · ARRASTE PARA MOVER</span><h2 id="assets-title">Assets</h2></div><button type="button" data-window-reset class="quiet" aria-label="Reposicionar janela Assets">↺</button><button type="button" data-action="assets-close" class="icon-button" aria-label="Fechar Assets">${icon('close',18)}</button></div>
      <div id="assets-content" class="window-content"></div>
    </dialog>
    <dialog id="command-palette" class="command-palette" aria-label="Buscar"><input id="palette-input" type="text" role="combobox" aria-expanded="false" aria-controls="palette-list" aria-autocomplete="list" placeholder="Buscar ações, controles, elementos, assets, cenas…" autocomplete="off" spellcheck="false" /><ul id="palette-list" role="listbox" aria-label="Resultados"></ul></dialog>
    <dialog id="shortcuts-sheet" class="shortcuts-sheet" aria-label="Atalhos de teclado"></dialog>
    <dialog id="asset-metadata-dialog" aria-label="Classificar asset"></dialog>
    <dialog id="recovery-dialog"><span class="eyebrow">RECUPERAÇÃO LOCAL</span><h2>Há trabalho não salvo</h2><p id="recovery-description"></p><div class="dialog-actions">${button('discard-draft', 'Descartar rascunho', '', 'quiet')}${button('restore-draft', 'Restaurar trabalho', 'undo', 'primary')}</div></dialog>
    <div id="context-menu" class="context-menu" hidden></div>
    <input id="asset-file" type="file" accept="image/png,image/jpeg,image/webp,.glb" hidden />
    <input id="document-json-file" type="file" accept=".json,application/json" hidden />`;
}
