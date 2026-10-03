import { escapeHTML as esc } from './icons.js';
import { ROOM_TEMPLATES } from '../authoring/furnishing.js';
import { isSupport } from '../domain/geometry.js';

const number = (field, label, value, min, max, step = 1) => `<label class="field"><span>${label}</span><input type="number" data-field="${field}" value="${value}" step="${step}" ${min === undefined ? '' : `min="${min}"`} ${max === undefined ? '' : `max="${max}"`}/></label>`;
const option = (value, label, current) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`;
const check = (field, label, checked) => `<label class="check"><input type="checkbox" data-field="${field}" ${checked ? 'checked' : ''}/><span>${label}</span></label>`;

export function constructionPanel(document, { surfaceId, height, polygon }) {
  const supports = Object.values(document.layout.entities).filter(isSupport);
  return `<section><span class="eyebrow">ESTRUTURAS E APOIO</span><div class="construction-grid"><button data-action="window-add">Janela</button><button data-action="platform-add">Plataforma</button><button data-action="polygon-draw">Piso poligonal</button><button data-action="stairs-place">Escada</button><button data-action="ramp-place">Rampa</button>${polygon ? '<button data-action="polygon-finish" class="primary">Concluir contorno</button>' : ''}</div>
    <p class="microcopy">Janela: clique na parede em 3D e arraste com Mover (W). Escada/rampa: clique no apoio e ajuste no inspetor.</p>
    <p class="microcopy">Contorno: clique nos vértices, Enter conclui e Backspace remove o último. O desenho usa a altura de construção, mesmo fora do apoio selecionado.</p>
    ${number('build-height', 'Altura de construção · m', height, undefined, undefined, .1)}
    <label class="field"><span>Apoio para colocação</span><select data-field="active-surface">${option('', 'Plano de trabalho', surfaceId ?? '')}${supports.map(e => option(e.id, `${e.name} · ${e.transform.position[1]} m`, surfaceId)).join('')}</select></label>
    <p class="microcopy">Escolha o piso antes de colocar objetos em superfícies sobrepostas.</p></section>`;
}

export function smartBuildPanel(document, options, floorId, existing) {
  const floors = Object.values(document.layout.entities).filter(e => e.kind === 'floor');
  return `<section><span class="eyebrow">SMART BUILD</span><h2>Um cômodo pronto para usar.</h2><p class="muted">Mobiliário real, passagem reservada e luzes distribuídas. Revise antes de aceitar.</p>
    <label class="field"><span>Piso / espaço</span><select data-field="smart-floor">${option('', 'Selecione um piso', floorId ?? '')}${floors.map(f => option(f.id, f.name, floorId)).join('')}</select></label>
    <label class="field"><span>Receita</span><select data-field="smart-template">${ROOM_TEMPLATES.map(t => option(t.id, t.name, options.template)).join('')}</select></label>
    <label class="field"><span>Densidade</span><select data-field="smart-density">${[['sparse', 'Poucos objetos'], ['normal', 'Normal'], ['dense', 'Mais objetos']].map(([v, l]) => option(v, l, options.density)).join('')}</select></label>
    <div class="field-grid">${number('smart-chairs', 'Cadeiras · reunião', options.chairs, 1, 8)}${number('smart-seed', 'Variação', options.seed, 0, 4294967295)}</div>
    ${check('smart-lighting', 'Distribuir iluminação', options.lighting)}${existing ? check('smart-restoreDeleted', 'Restaurar itens excluídos', options.restoreDeleted) : ''}
    <button class="wide accent-outline" data-action="smart-preview" ${floorId ? '' : 'disabled'}>${existing ? 'Revisar regeneração' : 'Prévia do mobiliário'}</button>
    ${existing ? '<p class="microcopy">Posições, nomes, materiais e assets editados são preservados. Exclusões não reaparecem sem sua escolha.</p><button class="wide quiet" data-action="smart-detach">Desvincular receita</button>' : ''}</section>`;
}

export function polishPanel(count, options) {
  return `<section><span class="eyebrow">POLISH · ${count} SELECIONADOS</span><h2>Ajustar composição.</h2><p class="muted">Shift+clique na cena ou árvore seleciona vários. Alinhar usa o primeiro elemento selecionado como referência.</p>
    <label class="field"><span>Operação</span><select data-field="polish-mode">${[['align', 'Alinhar'], ['distribute', 'Distribuir espaços'], ['rotation', 'Variar rotação']].map(([v, l]) => option(v, l, options.mode)).join('')}</select></label>
    <div class="field-grid"><label class="field"><span>Eixo</span><select data-field="polish-axis">${option('x', 'X', options.axis)}${option('z', 'Z', options.axis)}</select></label><label class="field"><span>Alinhamento</span><select data-field="polish-alignment">${[['center', 'Pivôs'], ['min', 'Borda menor'], ['max', 'Borda maior']].map(([v, l]) => option(v, l, options.alignment)).join('')}</select></label></div>
    <div class="field-grid">${number('polish-angle', 'Variação máxima · °', options.angle, 0, 30)}${number('polish-seed', 'Variação', options.seed, 0, 4294967295)}</div>
    <button data-action="polish-preview" class="wide primary" ${count >= 2 ? '' : 'disabled'}>Revisar ajustes</button><p class="microcopy">As extremidades ficam fixas na distribuição. Aceitar é uma única operação de histórico; cancelar mantém tudo.</p></section>`;
}

export function proposalReport(proposal) {
  const report = proposal.report ?? {}, summary = `${proposal.entities?.length ?? 0} objetos · ${proposal.lights?.length ?? 0} luzes · ${proposal.updates?.length ?? 0} ajustes · ${proposal.removals?.length ?? 0} remoções`;
  const messages = [...(report.omissions ?? []), ...(report.conflicts ?? [])];
  return `<p>${summary}</p><p>${report.kept?.length ?? 0} preservados · ${report.suppressed?.length ?? 0} excluídos mantidos</p>${messages.length ? `<details open><summary>${messages.length} avisos para revisar</summary><ul>${messages.map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>` : ''}`;
}
