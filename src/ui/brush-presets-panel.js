import { escapeHTML as esc } from './icons.js';

export function brushPresetsPanel(surface, presets, state, busy, error) {
  const entries = presets.filter(preset => preset.surface === surface);
  const selected = entries.some(preset => preset.id === state.selectedId);
  return `<details data-texture-options="brush-presets" class="brush-presets"><summary>Meus pincéis · ${surface === 'terrain' ? 'terreno' : 'rocha'}</summary>
    <label class="field"><span>Pincéis salvos</span><select data-field="preset-selection" ${busy ? 'disabled' : ''}>
      <option value="">${entries.length ? 'Escolha um pincel' : 'Nenhum pincel salvo'}</option>
      ${entries.map(preset => `<option value="${esc(preset.id)}" ${preset.id === state.selectedId ? 'selected' : ''}>${esc(preset.name)}</option>`).join('')}
    </select></label>
    <button type="button" data-action="brush-preset-apply" class="wide" ${busy || !selected ? 'disabled' : ''}>Usar pincel selecionado</button>
    <label class="field"><span>Nome do pincel</span><input type="text" data-field="preset-name" maxlength="80" value="${esc(state.name)}" placeholder="Ex.: relevo suave" ${busy ? 'disabled' : ''}/></label>
    <div class="brush-preset-actions">
      <button type="button" data-action="brush-preset-save" ${busy ? 'disabled' : ''}>Salvar novo</button>
      <button type="button" data-action="brush-preset-update" ${busy || !selected ? 'disabled' : ''}>Atualizar ajustes</button>
      <button type="button" data-action="brush-preset-rename" ${busy || !selected ? 'disabled' : ''}>Renomear</button>
      <button type="button" data-action="brush-preset-delete" ${busy || !selected ? 'disabled' : ''}>Excluir preset</button>
    </div>
    <p class="microcopy">${busy ? 'Aguarde… ' : ''}Salvos neste navegador, disponíveis em todas as suas cenas. ${surface === 'terrain' ? 'A camada de pintura é escolhida na cena atual. ' : ''}Atualizar substitui os ajustes do preset selecionado; Excluir remove apenas o preset.</p>
    ${error ? `<p class="microcopy" role="status">${esc(error)}</p>` : ''}
  </details>`;
}
