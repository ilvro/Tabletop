import { escapeHTML as esc } from './icons.js';
import { ROOM_TEMPLATES } from '../authoring/furnishing.js';
import { isSupport } from '../domain/geometry.js';
import { MATERIAL_PALETTES } from '../authoring/polish.js';

const number = (field, label, value, min, max, step = 1) => `<label class="field"><span>${label}</span><input type="number" data-field="${field}" value="${value}" step="${step}" ${min === undefined ? '' : `min="${min}"`} ${max === undefined ? '' : `max="${max}"`}/></label>`;
const option = (value, label, current) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`;
const check = (field, label, checked) => `<label class="check"><input type="checkbox" data-field="${field}" ${checked ? 'checked' : ''}/><span>${label}</span></label>`;

export function constructionPanel(document, { surfaceId, height, polygon }) {
  const supports = Object.values(document.layout.entities).filter(isSupport);
  return `<section><span class="eyebrow">ESTRUTURAS E APOIO</span><div class="construction-grid"><button data-action="window-add">Janela</button><button data-action="platform-add">Plataforma</button><button data-action="polygon-draw">Piso poligonal</button><button data-action="floor-hole">Recortar piso</button><button data-action="contour-walls">Paredes do contorno</button><button data-action="stairs-place">Escada</button><button data-action="ramp-place">Rampa</button>${polygon ? '<button data-action="polygon-finish" class="primary">Concluir contorno</button>' : ''}</div>
    <p class="microcopy">Janela: clique na parede em 3D e arraste com Mover (W). Escada/rampa: clique no apoio e ajuste no inspetor.</p>
    <p class="microcopy">Contorno: clique nos vértices, Enter conclui e Backspace remove o último. O desenho usa a altura de construção, mesmo fora do apoio selecionado.</p>
    ${number('build-height', 'Altura de construção · m', height, undefined, undefined, .1)}
    <label class="field"><span>Apoio para colocação</span><select data-field="active-surface">${option('', 'Plano de trabalho', surfaceId ?? '')}${supports.map(e => option(e.id, `${e.name} · ${e.transform.position[1]} m`, surfaceId)).join('')}</select></label>
    <p class="microcopy">Escolha o piso antes de colocar objetos em superfícies sobrepostas.</p></section>`;
}

export function levelsPanel(document, { levelId, layerId, isolated }) {
  const levels = Object.values(document.layout.levels ?? {}).sort((a,b) => a.elevation - b.elevation);
  const layers = Object.values(document.layout.layers ?? {});
  return `<section><span class="eyebrow">ANDARES E CAMADAS</span><label class="field"><span>Andar de construção</span><select data-field="active-level">${option('', 'Sem andar', levelId ?? '')}${levels.map(l => option(l.id, `${l.name} · ${l.elevation} m`, levelId)).join('')}</select></label>
    <div class="construction-grid"><button data-action="level-add">Novo andar</button><button data-action="level-duplicate" ${levelId ? '' : 'disabled'}>Copiar construção</button><button data-action="level-isolate" ${levelId ? '' : 'disabled'} aria-pressed="${isolated}">${isolated ? 'Mostrar todos' : 'Isolar no editor'}</button></div>
    <p class="microcopy">O andar define a altura de construção. Isolar muda só sua vista; Visível controla também a apresentação. Copiar conserva IDs novos e não duplica personagens.</p>
    ${levels.map(l => `<div class="semantic-row"><label class="field"><span>Nome do andar</span><input data-field="level-name-${l.id}" value="${esc(l.name)}" maxlength="256"/></label>${number(`level-elevation-${l.id}`, 'Altura · m', l.elevation, undefined, undefined, .1)}<div class="construction-grid"><button data-action="level-visible" data-id="${l.id}" aria-pressed="${l.visible}">${l.visible ? 'Visível' : 'Oculto'}</button><button data-action="level-lock" data-id="${l.id}">${l.locked ? 'Desbloquear' : 'Bloquear'}</button><button data-action="level-remove" data-id="${l.id}">Desvincular andar</button></div></div>`).join('')}
    <label class="field"><span>Camada de construção</span><select data-field="active-layer">${option('', 'Sem camada', layerId ?? '')}${layers.map(l => option(l.id, l.name, layerId)).join('')}</select></label><button data-action="layer-add" class="wide">Nova camada</button>
    ${layers.map(l => `<div class="semantic-row"><label class="field"><span>Nome da camada</span><input data-field="layer-name-${l.id}" value="${esc(l.name)}" maxlength="256"/></label><div class="construction-grid"><button data-action="layer-visible" data-id="${l.id}">${l.visible ? 'Visível' : 'Oculta'}</button><button data-action="layer-lock" data-id="${l.id}">${l.locked ? 'Desbloquear' : 'Bloquear'}</button><button data-action="layer-remove" data-id="${l.id}">Desvincular</button></div></div>`).join('')}</section>`;
}

export function terrainPanel(options) {
  return `<section><span class="eyebrow">TERRENO E RELEVO</span><div class="field-grid">${number('terrain-new-width', 'Largura · m', options.width, 1, 1000)}${number('terrain-new-length', 'Comprimento · m', options.length, 1, 1000)}</div>${number('terrain-new-segments', 'Divisões por eixo', options.segments, 2, 64)}<button data-action="terrain-add" class="wide">Criar terreno</button><p class="microcopy">Selecione o terreno para elevar, rebaixar, suavizar ou nivelar com o pincel. Pisos de edifícios permanecem superfícies independentes.</p></section>`;
}

export function terrainInspector(record, brush, cell) {
  return `<section><span class="eyebrow">ESCULPIR RELEVO</span><label class="field"><span>Pincel</span><select data-field="brush-mode">${[['raise','Elevar'],['lower','Rebaixar'],['smooth','Suavizar'],['flatten','Nivelar']].map(([v,l]) => option(v,l,brush.mode)).join('')}</select></label><div class="field-grid">${number('brush-radius','Raio · m',brush.radius,.1,100,.1)}${number('brush-strength','Força por amostra · m',brush.strength,.01,10,.05)}</div>${number('brush-target','Altura de nivelamento · Y',brush.target,undefined,undefined,.1)}<button data-action="terrain-sculpt" class="wide primary">Ativar pincel</button><p class="microcopy">Arraste no terreno; cada traço é uma operação de histórico. Esc cancela. Use Q para voltar à seleção.</p>
    <div class="field-grid">${number('width','Largura · m',record.width,.1,1000)}${number('length','Comprimento · m',record.length,.1,1000)}</div><span class="eyebrow">AJUSTE FINO DA MALHA</span>${number('terrain-cell','Índice do vértice',cell,0,record.heights.length-1)}${number('terrain-height','Elevação local · m',record.heights[cell] ?? 0,-1000,1000,.05)}<p class="microcopy">${record.segments + 1} × ${record.segments + 1} vértices, ordenados por linhas de Z e depois X. Altura local somada ao Y do terreno.</p></section>`;
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

export function polishPanel(count, options, document) {
  return `<section><span class="eyebrow">POLISH · ${count} SELECIONADOS</span><h2>Ajustar composição.</h2><p class="muted">Shift+clique na cena ou árvore seleciona vários. Alinhar usa o primeiro elemento selecionado como referência.</p>
    <label class="field"><span>Operação</span><select data-field="polish-mode">${[['align', 'Alinhar'], ['distribute', 'Distribuir espaços / luminárias'], ['rotation', 'Variar rotação'], ['material', 'Variar materiais'], ['passage', 'Liberar passagens'], ['facing', 'Orientar para mesa / referência'], ['corner', 'Decorar um canto'], ['lighting', 'Uniformizar luzes']].map(([v, l]) => option(v, l, options.mode)).join('')}</select></label>
    <div class="field-grid"><label class="field"><span>Eixo</span><select data-field="polish-axis">${option('x', 'X', options.axis)}${option('z', 'Z', options.axis)}</select></label><label class="field"><span>Alinhamento</span><select data-field="polish-alignment">${[['center', 'Pivôs'], ['min', 'Borda menor'], ['max', 'Borda maior']].map(([v, l]) => option(v, l, options.alignment)).join('')}</select></label></div>
    <div class="field-grid">${number('polish-angle', 'Variação máxima · °', options.angle, 0, 30)}${number('polish-seed', 'Variação', options.seed, 0, 4294967295)}</div>
    <label class="field"><span>Paleta de materiais</span><select data-field="polish-palette">${Object.entries(MATERIAL_PALETTES).map(([v,p]) => option(v,p.name,options.palette)).join('')}</select></label>${number('polish-clearance','Folga de passagem · m',options.clearance,.1,5,.1)}
    <label class="field"><span>Referência / piso para decoração</span><select data-field="polish-referenceId">${option('','Selecione uma referência',options.referenceId ?? '')}${Object.values(document?.layout.entities ?? {}).filter(e => ['floor','prop'].includes(e.kind)).map(e => option(e.id,e.name,options.referenceId)).join('')}</select></label>
    <button data-action="polish-preview" class="wide primary" ${count ? '' : 'disabled'}>Revisar ajustes</button><button data-action="polish-frame" class="wide quiet">Enquadrar referência</button><p class="microcopy">As extremidades ficam fixas na distribuição. Materiais e decoração preservam dimensões; passagens usam uma busca local limitada. Revise os motivos antes de aceitar.</p></section>`;
}

export function proposalReport(proposal) {
  const report = proposal.report ?? {}, summary = `${proposal.entities?.length ?? 0} objetos · ${proposal.lights?.length ?? 0} luzes · ${proposal.updates?.length ?? 0} ajustes · ${proposal.removals?.length ?? 0} remoções`;
  const messages = [...(report.reasons ?? []), ...(report.omissions ?? []), ...(report.conflicts ?? [])];
  return `<p>${summary}</p><p>${report.kept?.length ?? 0} preservados · ${report.suppressed?.length ?? 0} excluídos mantidos</p>${messages.length ? `<details open><summary>Detalhes dos ajustes (${messages.length})</summary><ul>${messages.map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>` : ''}`;
}
