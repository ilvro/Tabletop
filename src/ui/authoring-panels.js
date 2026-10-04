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
    <details><summary>Como usar pisos, recortes e paredes</summary><p class="microcopy">Janela: clique na parede em 3D e arraste com Mover (G). Escada/rampa: clique no apoio e ajuste no inspetor.</p>
    <p class="microcopy">Recortar piso: selecione um piso, desenhe um contorno dentro dele e pressione Enter. O vão atravessa a espessura do piso, como uma abertura para escada ou pátio.</p><p class="microcopy">Paredes do contorno: selecione um piso e revise as paredes propostas. Bordas coincidentes de pisos vizinhos reaproveitam a parede existente. Encontros de paredes em L ou T são ajustados automaticamente, inclusive em ângulos oblíquos.</p><p class="microcopy">Contorno: clique nos vértices, Enter conclui e Backspace remove o último. O desenho usa a altura de construção, mesmo fora do apoio selecionado.</p></details>
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
  return `<section><span class="eyebrow">TERRENO E RELEVO</span><div class="field-grid">${number('terrain-new-width', 'Largura · m', options.width, 1, 1000)}${number('terrain-new-length', 'Comprimento · m', options.length, 1, 1000)}</div>${number('terrain-new-segments', 'Detalhe do relevo · divisões por eixo', options.segments, 2, 64)}<button data-action="terrain-add" class="wide">Criar terreno</button><p class="microcopy">Depois de criar, os quatro pincéis aparecem no topo do inspetor à direita. Escolha um, clique em Ativar pincel e arraste no terreno. Pisos de edifícios permanecem superfícies independentes.</p></section>`;
}

export function terrainInspector(record, brush, cell, active = false, advanced = false, layerEditor = false) {
  const layers = record.paintLayers ?? [], layer = layers.find(entry => entry.id === brush.layerId);
  const painting = ['paint','erase'].includes(brush.mode), blend = ['smooth','flatten','paint','erase'].includes(brush.mode);
  return `<section class="terrain-controls"><span class="eyebrow">PINCEL DE TERRENO · T</span>
    <label class="field"><span>Ferramenta</span><select data-field="brush-mode">${[['raise','Elevar'],['lower','Rebaixar'],['smooth','Suavizar'],['flatten','Nivelar'],['paint','Pintar camada de cor'],['erase','Apagar pintura da camada']].map(([v,l]) => option(v,l,brush.mode)).join('')}</select></label>
    ${brush.mode === 'flatten' ? number('brush-target','Altura desejada · m no mundo',brush.target,undefined,undefined,.1) : ''}
    <div class="field-grid">${number('brush-radius',brush.shape === 'square' ? 'Metade do lado · m' : 'Raio · m',brush.radius,.1,100,.1)}${number('brush-strength',blend ? 'Intensidade · 0–1' : 'Força · m',brush.strength,.01,blend ? 1 : 10,.05)}</div>
    <div class="field-grid"><label class="field"><span>Formato</span><select data-field="brush-shape">${option('circle','Circular',brush.shape)}${option('square','Quadrado',brush.shape)}</select></label><label class="field"><span>Dureza · ${Math.round((brush.hardness ?? 0) * 100)}%</span><input type="range" data-field="brush-hardness" value="${brush.hardness ?? 0}" min="0" max="1" step=".05" aria-label="Dureza das bordas"/></label></div>
    ${check('brush-snap','Encaixar pincel na malha',brush.snap ?? false)}
    <p class="microcopy">Dureza baixa cria bordas suaves; 100% aplica a mesma força em toda a área. Quadrado + 100% + encaixe cria áreas retas. A malha define o detalhe possível.</p>
    <button data-action="${active ? 'terrain-stop' : 'terrain-sculpt'}" class="wide primary">${active ? 'Parar pincel · Q / T' : 'Ativar pincel · T'}</button><p class="microcopy">Arraste com o botão esquerdo. Um traço = um desfazer. Esc cancela. [ e ] diminuem/aumentam o tamanho com o pincel ativo.</p>
    <span class="eyebrow">CAMADAS DE COR</span><label class="field"><span>Camada para pintar</span><select data-field="terrain-paint-layer">${!layers.length ? option('', 'Crie uma camada', '') : layers.map(entry => option(entry.id, `${entry.name}${entry.visible ? '' : ' · oculta'}`, brush.layerId)).join('')}</select></label>
    <button data-action="terrain-layer-add" class="wide" ${layers.length >= 8 ? 'disabled' : ''}>Nova camada de cor</button>
    <p class="microcopy">${painting ? 'Pinte nesta camada; Apagar revela as cores de baixo.' : 'Escolha Pintar camada de cor na ferramenta para aplicar a camada.'} As últimas camadas cobrem as anteriores. Alterar uma cor depois preserva a região pintada.</p>
    ${layer ? `<details data-disclosure="terrain-layer-editor" ${layerEditor ? 'open' : ''}><summary>Editar cor e propriedades de ${esc(layer.name)}</summary><label class="field"><span>Nome da camada</span><input data-field="terrain-layer-name" value="${esc(layer.name)}" maxlength="256"/></label><label class="field color-field"><span>Cor da camada</span><input type="color" data-field="terrain-layer-color" value="${esc(layer.color)}"/></label>${number('terrain-layer-opacity','Opacidade · 0–1',layer.opacity,0,1,.05)}${check('terrain-layer-visible','Mostrar camada',layer.visible)}<div class="construction-grid"><button data-action="terrain-layer-front" ${layers.at(-1)?.id === layer.id ? 'disabled' : ''}>Trazer à frente</button><button data-action="terrain-layer-back" ${layers[0]?.id === layer.id ? 'disabled' : ''}>Enviar atrás</button></div><button data-action="terrain-layer-remove" class="wide danger">Remover esta camada</button></details>` : ''}
    <details data-disclosure="terrain-advanced" ${advanced ? 'open' : ''}><summary>Acabamento, malha e alturas exatas</summary><label class="field"><span>Acabamento do relevo</span><select data-field="terrain-shading">${option('smooth','Suave',record.flatShading ? 'faceted' : 'smooth')}${option('faceted','Facetas marcadas',record.flatShading ? 'faceted' : 'smooth')}</select></label>${number('terrain-resolution','Divisões por eixo',record.segments,2,64)}<p class="microcopy">Menos divisões dão faces maiores. A alteração reamostra alturas e pintura; reduzir o detalhe pode apagar detalhes pequenos. Ctrl+Z restaura.</p><div class="field-grid">${number('width','Largura · m',record.width,.1,1000)}${number('length','Comprimento · m',record.length,.1,1000)}</div><label class="field color-field"><span>Cor de fundo · sob as camadas</span><input type="color" data-field="material-color" value="${esc(record.material.color)}"/></label>${number('material-roughness','Rugosidade',record.material.roughness,0,1,.1)}<span class="eyebrow">ALTURA DE UM VÉRTICE</span>${number('terrain-cell','Índice do vértice',cell,0,record.heights.length-1)}${number('terrain-height','Altura local · m',record.heights[cell] ?? 0,-1000,1000,.05)}<p class="microcopy">${record.segments + 1} × ${record.segments + 1} vértices, por linhas de Z e depois X. Altura local somada ao Y do terreno.</p></details></section>`;
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
  const mode = options.mode;
  const tips = {
    align: 'Selecione primeiro o objeto que ficará parado, depois os demais com Shift. Escolha X (lado a lado) ou Z (frente/fundo) e alinhe os centros ou uma borda.',
    distribute: 'Selecione pelo menos três objetos. Os dois extremos ficam parados; os intermediários recebem espaçamento uniforme no eixo escolhido.',
    rotation: 'Selecione pelo menos dois objetos. Cada um recebe uma pequena variação de rotação dentro do limite escolhido.',
    material: 'Selecione objetos com material editável. A paleta altera cores e acabamento, preservando suas dimensões.',
    passage: 'Selecione móveis apoiados em um piso com portas, escadas ou rampas. A prévia tenta afastá-los das passagens com a folga escolhida.',
    facing: 'Selecione os móveis que deseja girar e escolha a mesa ou objeto para o qual devem apontar.',
    corner: 'Selecione um piso ou escolha-o como referência. A prévia procura um canto livre para uma luminária.',
    lighting: 'Selecione luzes locais. Elas receberão a cor da primeira luz selecionada e a intensidade média da seleção.',
  };
  const minimum = mode === 'distribute' ? 3 : ['align','rotation'].includes(mode) ? 2 : 1;
  return `<section id="selection-adjustments"><span class="eyebrow">AJUSTES · ${count} SELECIONADOS</span><h2>Alinhar e ajustar objetos</h2>
    <label class="field"><span>O que deseja fazer?</span><select data-field="polish-mode">${[['align', 'Alinhar'], ['distribute', 'Distribuir espaços / luminárias'], ['rotation', 'Variar rotação'], ['material', 'Variar materiais'], ['passage', 'Liberar passagens'], ['facing', 'Orientar para mesa / referência'], ['corner', 'Decorar um canto'], ['lighting', 'Uniformizar luzes']].map(([v, l]) => option(v, l, mode)).join('')}</select></label>
    <p class="microcopy">${tips[mode]}</p>
    ${['align','distribute'].includes(mode) ? `<div class="field-grid"><label class="field"><span>Eixo</span><select data-field="polish-axis">${option('x', 'X · esquerda / direita', options.axis)}${option('z', 'Z · frente / fundo', options.axis)}</select></label>${mode === 'align' ? `<label class="field"><span>Alinhar por</span><select data-field="polish-alignment">${[['center', 'Centro'], ['min', 'Borda menor'], ['max', 'Borda maior']].map(([v, l]) => option(v, l, options.alignment)).join('')}</select></label>` : ''}</div>` : ''}
    ${mode === 'rotation' ? number('polish-angle', 'Variação máxima · °', options.angle, 0, 30) : ''}
    ${['rotation','material','corner'].includes(mode) ? number('polish-seed','Variação',options.seed,0,4294967295) : ''}
    ${mode === 'material' ? `<label class="field"><span>Paleta de materiais</span><select data-field="polish-palette">${Object.entries(MATERIAL_PALETTES).map(([v,p]) => option(v,p.name,options.palette)).join('')}</select></label>` : ''}
    ${mode === 'passage' ? number('polish-clearance','Folga de passagem · m',options.clearance,.1,5,.1) : ''}
    ${['facing','corner'].includes(mode) ? `<label class="field"><span>${mode === 'corner' ? 'Piso para decoração' : 'Objeto de referência'}</span><select data-field="polish-referenceId">${option('','Selecione uma referência',options.referenceId ?? '')}${Object.values(document?.layout.entities ?? {}).filter(e => mode === 'corner' ? e.kind === 'floor' : e.kind === 'prop').map(e => option(e.id,e.name,options.referenceId)).join('')}</select></label><button data-action="polish-frame" class="wide quiet">Enquadrar referência</button>` : ''}
    ${count < minimum ? `<p class="microcopy">Esta operação precisa de pelo menos ${minimum} objetos. Use Shift+clique na cena ou na árvore.</p>` : ''}
    <button data-action="polish-preview" class="wide primary" ${count >= minimum ? '' : 'disabled'}>Ver prévia dos ajustes</button><p class="microcopy">Revise na cena, depois Aceitar ou Cancelar. Ctrl+Z desfaz os ajustes aceitos. Objetos bloqueados ou fixados são preservados.</p></section>`;
}

export function proposalReport(proposal) {
  const report = proposal.report ?? {}, summary = `${proposal.entities?.length ?? 0} objetos · ${proposal.lights?.length ?? 0} luzes · ${proposal.updates?.length ?? 0} ajustes · ${proposal.removals?.length ?? 0} remoções`;
  const messages = [...(report.reasons ?? []), ...(report.omissions ?? []), ...(report.conflicts ?? [])];
  return `<p>${summary}</p><p>${report.kept?.length ?? 0} preservados · ${report.suppressed?.length ?? 0} excluídos mantidos</p>${messages.length ? `<details open><summary>Detalhes dos ajustes (${messages.length})</summary><ul>${messages.map(m => `<li>${esc(m)}</li>`).join('')}</ul></details>` : ''}`;
}

export function anchoringPanel(document, ids, hostId) {
  const hosts = Object.values(document.layout.entities).filter(e => ['wall','floor'].includes(e.kind));
  const items = ids.map(key => document.layout.entities[key] ?? (document.look ?? document.defaultLook).lights[key]);
  const count = items.filter(e => e?.kind === 'prop' || ['point', 'spot'].includes(e?.type)).length;
  return `<section id="selection-anchoring"><span class="eyebrow">FIXAR / ANCORAR · ${count} OBJETOS</span><h2>Fixar em uma parede ou teto</h2><p class="microcopy">1. Selecione os objetos com Shift. 2. Escolha a parede ou o piso que servirá de teto. 3. Revise a prévia e aceite.</p><label class="field"><span>Fixar em</span><select data-field="anchor-host">${option('', 'Escolha a parede ou teto', hostId)}${hosts.map(e => option(e.id, `${e.kind === 'wall' ? 'Parede' : 'Teto sob piso'} · ${e.name}`, hostId)).join('')}</select></label><p class="microcopy">Objetos e luzes locais serão colocados junto à face escolhida e acompanharão seus movimentos e rotação. Para um teto, escolha o piso do andar de cima. Paredes e pisos selecionados servem de referência; personagens não são fixados.</p><button class="wide primary" data-action="anchor-preview" ${hostId && count ? '' : 'disabled'}>Ver prévia da fixação</button><p class="microcopy">Para soltar depois, selecione o objeto e escolha Livre em Fixar em.</p><button class="wide quiet" data-action="anchor-close">Voltar às propriedades</button></section>`;
}
