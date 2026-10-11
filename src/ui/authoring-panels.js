import { textureSelect, textureCustomization, distributionPanel } from './material-panels.js';
import { choiceField } from './controls.js';
import { escapeHTML as esc } from './icons.js';
import { ROOM_TEMPLATES } from '../authoring/furnishing.js';
import { ROOM_GROUPS } from '../domain/room-recipes.js';
import { ROOM_STATES } from '../domain/room-states.js';
import { ROOM_MOODS } from '../authoring/room-ambience.js';
import { BUILDING_TYPES, planBuilding } from '../authoring/building.js';
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
  return `<section><span class="eyebrow">TERRENO E RELEVO</span><div class="field-grid">${number('terrain-new-width', 'Largura · m', options.width, 1, 1000)}${number('terrain-new-length', 'Comprimento · m', options.length, 1, 1000)}</div><div class="field-grid">${number('terrain-new-x','Centro X · m',options.x??0,-10000,10000,.5)}${number('terrain-new-z','Centro Z · m',options.z??0,-10000,10000,.5)}</div>${number('terrain-new-segments', 'Detalhe do relevo · divisões por eixo', options.segments, 2, 64)}${check('terrain-new-protectFloors','Respeitar pisos das construções',options.protectFloors??true)}<button data-action="terrain-add" class="wide primary">Criar terreno</button><p class="microcopy">Começa plano, na altura de construção. O tamanho inicial é 20 × 20 m; pode ser alterado aqui ou expandido no inspetor depois. Mais divisões permitem detalhes menores.</p><details data-disclosure="terrain-presets"><summary>Presets de paisagem · construção assistida</summary><button data-action="terrain-mountain" class="wide">Prévia · Montanha · rocha e neve</button><p class="microcopy">Combina relevo, rocha natural, neve por inclinação e trilha. Revise e aceite a prévia. É um ponto de partida: você pode montar a mesma composição manualmente, e tudo permanece editável, sem regeneração vinculada.</p></details><p class="microcopy">Os pincéis aparecem no topo do inspetor à direita. Pisos e terreno são superfícies independentes; Respeitar pisos rebaixa o terreno sob as construções existentes.</p></section>`;
}

export function terrainInspector(record, brush, cell, active = false, advanced = false, layerEditor = false, resizeMode='extend', materialTarget='layer', basePanel='', transferControls='', presetsPanel='') {
  const layers = record.paintLayers ?? [], layer = layers.find(entry => entry.id === brush.layerId);
  const painting = ['paint','erase'].includes(brush.mode), blend = ['smooth','flatten','paint','erase'].includes(brush.mode);
  const materials=`    <div class="material-scope"><span class="eyebrow">MATERIAL · ESCOLHA O ALCANCE</span><label class="field"><span>Editar material de</span><select data-field="terrain-material-target">${option('base','Base · terreno inteiro',materialTarget==='base'?'base':brush.layerId)}${layers.map(entry=>option(entry.id,`Camada · ${entry.name}`,materialTarget==='base'?'base':brush.layerId)).join('')}</select></label>
${transferControls}<button data-action="terrain-layer-add" class="wide" ${layers.length >= 8 ? 'disabled' : ''}>Nova camada de material</button><p class="scope-hint">Cada camada tem sua própria textura e cor. Pintura manual aparece somente onde você passa o pincel; distribuição automática usa inclinação e altura. Camadas superiores cobrem as inferiores.</p></div>
    ${materialTarget==='base'?basePanel:''}
    ${layer ? `<details data-disclosure="terrain-layer-editor" ${layerEditor ? 'open' : ''}><summary>Somente camada · ${esc(layer.name)}</summary><p class=scope-hint>Estas alterações afetam apenas esta camada, sem mudar a base ou as demais. Para aplicar em uma região, escolha Pintura manual e use Pintar esta camada.</p><button data-action="terrain-paint-selected" class="wide primary">Pintar esta camada</button><label class="field"><span>Nome da camada</span><input data-field="terrain-layer-name" value="${esc(layer.name)}" maxlength="256"/></label><label class="field color-field"><span>Cor da camada</span><input type="color" data-field="terrain-layer-color" value="${esc(layer.color)}"/></label>${textureSelect('terrain-layer-texture',layer.texture)}${layer.texture && layer.texture!=='none'?number('terrain-layer-textureSize','Tamanho do padrão · m',layer.textureSize??2,.05,50,.1):''}${textureCustomization('terrain-layer-',layer,{numberField:(f,l,v,o)=>number(f,l,v,o.min,o.max,o.step),colorField:(f,l,v)=>`<label class="field color-field"><span>${l}</span><input type="color" data-field="${f}" value="${esc(v)}"/></label>`})}${distributionPanel('terrain-distribution-',layer.distribution,{numberField:(f,l,v,o)=>number(f,l,v,o.min,o.max,o.step)})}${number('terrain-layer-opacity','Opacidade · 0–1',layer.opacity,0,1,.05)}${check('terrain-layer-visible','Mostrar camada',layer.visible)}<div class="construction-grid"><button data-action="terrain-layer-front" ${layers.at(-1)?.id === layer.id ? 'disabled' : ''}>Trazer à frente</button><button data-action="terrain-layer-back" ${layers[0]?.id === layer.id ? 'disabled' : ''}>Enviar atrás</button></div><button data-action="terrain-layer-remove" class="wide danger">Remover esta camada</button></details>` : ''}
`;
  const controls=`<div class="terrain-brush"><span class="eyebrow">PINCEL DE SUPERFÍCIE · T</span>
    ${presetsPanel}
    <label class="field"><span>Ferramenta</span><select data-field="brush-mode">${[['raise','Elevar'],['lower','Rebaixar'],['push','Projetar superfície'],['pull','Recuar superfície'],['smooth','Suavizar'],['flatten','Nivelar'],['rock','Esculpir rocha natural'],['paint','Pintar camada · cor e textura'],['erase','Apagar pintura da camada'],['water','Água · escavar e preencher']].map(([v,l]) => option(v,l,brush.mode)).join('')}</select></label>
    ${painting?`    <label class="field"><span>Camada para o pincel de pintura</span><select data-field="terrain-paint-layer">${!layers.length ? option('', 'Crie uma camada', '') : layers.map(entry => option(entry.id, `${entry.name}${entry.visible ? '' : ' · oculta'}`, brush.layerId)).join('')}</select></label>`:''}
    ${brush.mode === 'water' ? `${number('brush-waterLevel','Nível da água · m no mundo',brush.waterLevel??record.transform.position[1]+.05,-1000,1000,.05)}${number('brush-waterDepth','Profundidade do leito · m',brush.waterDepth??.6,.1,20,.1)}<p class=scope-hint>Arraste para desenhar. Ao soltar, revise o contorno e o leito na prévia e aceite. Evita pisos e deixa margem para ondas e neve. Um aceitar = um desfazer.</p>` : ''}
    ${brush.mode === 'flatten' ? number('brush-target','Altura desejada · m no mundo',brush.target,undefined,undefined,.1) : ''}
    ${brush.mode==='rock'?`<label class="field"><span>Formação do relevo rochoso</span><select data-field="brush-rockPattern">${[['fractured','Fraturado · cristas e fissuras'],['strata','Estratificado · patamares'],['granite','Granito · ondulações']].map(([v,l])=>option(v,l,brush.rockPattern??'fractured')).join('')}</select></label>${number('brush-rockSize','Tamanho das formações · m',brush.rockSize??3,.1,100,.25)}${number('brush-rockSeed','Variação do relevo · seed',brush.rockSeed??42,0,65535)}<p class="microcopy">Muda as alturas reais, sem repetir assets. O desenho varia pela posição no mapa; repassar aumenta o relevo. Aplique também Rocha natural na camada para obter o acabamento. Tamanho menor que uma célula da malha não produz detalhe suficiente.</p>`:''}
    <div class="field-grid">${number('brush-radius',brush.shape === 'square' ? 'Metade do lado · m' : 'Raio · m',brush.radius,.1,100,.1)}${brush.mode!=='water'?number('brush-strength',blend ? 'Intensidade · 0–1' : 'Força · m',brush.strength,.01,blend ? 1 : 10,.05):''}</div>
    ${brush.mode!=='water'?`    <div class="field-grid"><label class="field"><span>Formato${brush.mode==='water'?' · circular para água':''}</span><select data-field="brush-shape" ${brush.mode==='water'?'disabled':''}>${option('circle','Circular',brush.shape)}${option('square','Quadrado',brush.shape)}</select></label><label class="field"><span>Dureza · ${Math.round((brush.hardness ?? 0) * 100)}%</span><input type="range" data-field="brush-hardness" value="${brush.hardness ?? 0}" min="0" max="1" step=".05" aria-label="Dureza das bordas"/></label></div>
    ${check('brush-snap','Encaixar pincel na malha',brush.snap ?? false)}
    <p class="microcopy">Circular com dureza baixa ajuda em encostas naturais. Quadrado + 100% + encaixe + Nivelar cria patamares; a malha ainda tem triângulos nas bordas. Para pavimento de alvenaria com espessura e limites retos, use um Piso/Plataforma com Pedra · blocos de alvenaria.</p>
`:''}
    ${!painting && brush.mode!=='water'?check('brush-protectFloors','Respeitar pisos ao esculpir',brush.protectFloors??true):''}
    <button data-action="${active ? 'terrain-stop' : 'terrain-sculpt'}" class="wide primary">${active ? 'Parar pincel · Q / T' : 'Ativar pincel · T'}</button><p class="microcopy">Arraste com o botão esquerdo. ${brush.mode==='water'?'Solte para revisar, depois aceite; uma proposta = um desfazer.':'Um traço = um desfazer.'} Esc cancela. [ e ] diminuem/aumentam o tamanho com o pincel ativo.</p>
</div>`;
  return `<section class="terrain-controls">${active?controls+materials:materials+controls}    <details class=terrain-area data-disclosure=terrain-area><summary>Tamanho e limites do terreno</summary><span class="eyebrow">ÁREA DO TERRENO</span><label class="field"><span>Ao alterar o tamanho</span><select data-field="terrain-resize-mode">${option('extend','Expandir / recortar · preservar escala do relevo',resizeMode)}${option('stretch','Esticar · redimensionar o relevo',resizeMode)}</select></label><div class="field-grid">${number('width','Largura · m',record.width,.1,1000)}${number('length','Comprimento · m',record.length,.1,1000)}</div><p class="microcopy">Expandir acrescenta área em torno do centro, continuando alturas e pintura das bordas. Reamostra para manter o detalhe até 64 divisões; nesse limite há perda de resolução. Reduzir recorta a área. Esticar conserva as amostras e alonga todo o desenho. Ctrl+Z restaura.</p><button data-action="terrain-protect-floors" class="wide">Prévia · ajustar sob construções</button>
    </details><details data-disclosure="terrain-advanced" ${advanced ? 'open' : ''}><summary>Acabamento, malha e alturas exatas</summary><label class="field"><span>Iluminação das faces</span><select data-field="terrain-shading">${option('smooth','Suave · encostas e solo',record.flatShading ? 'faceted' : 'smooth')}${option('faceted','Facetas marcadas · rocha',record.flatShading ? 'faceted' : 'smooth')}</select></label>${number('terrain-resolution','Divisões por eixo',record.segments,2,64)}<p class="microcopy">Suave/Facetas muda a iluminação, sem mudar alturas. Menos divisões dão faces maiores. Alterar a resolução reamostra alturas e pintura; reduzir pode apagar detalhes pequenos. Células atuais: ${(record.width/record.segments).toFixed(2)} × ${(record.length/record.segments).toFixed(2)} m.</p><span class="eyebrow">ALTURA DE UM VÉRTICE</span>${number('terrain-cell','Índice do vértice',cell,0,record.heights.length-1)}${number('terrain-height','Altura local · m',record.heights[cell] ?? 0,-1000,1000,.05)}<p class="microcopy">${record.segments + 1} × ${record.segments + 1} vértices, por linhas de Z e depois X. Altura local somada ao Y do terreno. A edição exata não aplica a proteção automática de pisos.</p></details>${materialTarget!=='base'?basePanel:''}</section>`;
}

/** A whole building from an outline: the person gives the shape, the assistant the plan. */
export function buildingPanel(document, options, roomFloorId) {
  const floors = Object.values(document.layout.entities).filter(e => e.kind === 'floor' && !e.vertices);
  const outline = document.layout.entities[options.floorId], [w, l] = outline ? [outline.width, outline.length] : [options.width, options.length];
  return `<section><span class="eyebrow">PRÉDIO</span>
    <label class="field"><span>Contorno</span><select data-field="building-floorId">${option('', 'Novo, por medidas', options.floorId ?? '')}${floors.map(f => option(f.id, `${f.name} · ${f.width.toFixed(1)} × ${f.length.toFixed(1)} m`, options.floorId)).join('')}</select></label>
    ${outline ? '' : `<div class="field-grid">${number('building-width', 'Largura · m', options.width, 4, 60, .5)}${number('building-length', 'Comprimento · m', options.length, 3, 60, .5)}</div>`}
    ${choiceField('building-type', 'Tipo de prédio', options.type, BUILDING_TYPES.map(type => [type.id, type.name]))}
    <p class="microcopy">${esc(buildingSummary(options.type, w, l, options.seed))}</p>
    ${check('building-furnish', 'Mobiliar os cômodos', options.furnish)}${check('building-lighting', 'Iluminar', options.lighting)}${check('building-roof', 'Telhado', options.roof)}
    <button class="wide accent-outline" data-action="building-preview">Prévia do prédio</button>
    <button class="wide quiet" data-action="building-variation">Ver outra planta</button>
    <p class="microcopy">Desenhe um piso retangular e escolha-o como contorno, ou dê as medidas. Se o contorno já tem paredes, portas ou móveis seus, eles ficam: a planta é escolhida para que cada móvel caia no cômodo certo, só as paredes que faltam são erguidas e a sua porta vira a entrada.</p>
    <div class="control-group"><span class="eyebrow">ACRESCENTAR CÔMODO</span>
    <p class="microcopy">${roomFloorId && document.layout.entities[roomFloorId] ? `Ao prédio de <strong>${esc(document.layout.entities[roomFloorId].name)}</strong>: encosta num lado livre, usa a parede que já existe e abre a porta.` : 'Selecione um cômodo do prédio que quer ampliar.'}</p>
    <label class="field"><span>Cômodo novo</span><select data-field="building-addTemplate">${ROOM_GROUPS.map(group => `<optgroup label="${esc(group)}">${ROOM_TEMPLATES.filter(t => t.group === group).map(t => option(t.id, t.name, options.addTemplate)).join('')}</optgroup>`).join('')}</select></label>
    <button class="wide accent-outline" data-action="building-add-room" ${roomFloorId ? '' : 'disabled'}>Prévia do cômodo novo</button></div></section>`;
}
function buildingSummary(type, width, length, seed) {
  try { const plan = planBuilding(type, Math.max(width, length), Math.min(width, length), seed), names = plan.rooms.map(room => ROOM_TEMPLATES.find(t => t.id === room.key)?.name.toLowerCase() ?? room.key); return `Neste contorno cabem: ${names.join(', ')}${plan.corridor ? ', com corredor' : ''}.${plan.dropped ? ` Maior, caberiam mais ${plan.dropped}.` : ''}`; }
  catch (error) { return error.message; }
}

/** The room assistant: what it understood, what it can complete, and the state to leave the place in. */
export function smartBuildPanel(document, options, floorId, existing, insight, stateOptions = { state: 'abandoned', intensity: .6, seed: 1 }, ambience = { mood: 'auto', amount: .6, seed: 1 }) {
  const floors = Object.values(document.layout.entities).filter(e => e.kind === 'floor'), recipe = ROOM_TEMPLATES.find(t => t.id === options.template);
  const guess = insight?.inferred ?? [], state = ROOM_STATES.find(entry => entry.id === stateOptions.state);
  const reading = !insight ? '' : `<div class="assistant-reading" aria-live="polite">${guess.length
    ? `<p>Pelo que já está aqui, isto parece <strong>${esc(guess[0].name.toLowerCase())}</strong>.</p>${guess.length > 1 ? `<div class="chips">${guess.map(entry => `<button type="button" data-action="smart-pick" data-id="${entry.id}" class="${entry.id === options.template ? 'active' : ''}">${esc(entry.name)}</button>`).join('')}</div>` : ''}`
    : ''}${insight.building?.type ? `<p class="assistant-building">Com os cômodos vizinhos, forma <strong>${esc(insight.building.type.name.toLowerCase())}</strong> de ${insight.building.rooms.length} cômodos${insight.building.missing.length ? `; ainda não tem ${esc(insight.building.missing.map(room => room.name.toLowerCase()).join(', '))}` : ''}.</p>${insight.building.missing.length ? `<div class="chips">${insight.building.missing.map(room => `<button type="button" data-action="building-add-room" data-id="${room.id}">Criar ${esc(room.name.toLowerCase())}</button>`).join('')}</div>` : ''}` : ''}${insight.notes.length ? `<ul class="assistant-notes">${insight.notes.map(note => `<li class="${note.kind}">${esc(note.text)}${note.id ? ` <button type="button" class="quiet" data-action="assist-select" data-id="${note.id}">Mostrar</button>` : ''}</li>`).join('')}</ul>` : ''}</div>`;
  return `<section><span class="eyebrow">SMART BUILD</span>
    <label class="field"><span>Piso / espaço</span><select data-field="smart-floor">${option('', 'Selecione um piso', floorId ?? '')}${floors.map(f => option(f.id, f.name, floorId)).join('')}</select></label>
    ${reading}
    <div class="control-group"><span class="eyebrow">MOBILIAR</span>
    <label class="field"><span>Tipo de cômodo</span><select data-field="smart-template">${ROOM_GROUPS.map(group => `<optgroup label="${esc(group)}">${ROOM_TEMPLATES.filter(t => t.group === group).map(t => option(t.id, t.name, options.template)).join('')}</optgroup>`).join('')}</select></label>
    ${choiceField('smart-density','Quantidade de objetos',options.density,[['sparse','Poucos objetos','Poucos'],['normal','Normal'],['dense','Mais objetos','Muitos']])}
    <div class="field-grid">${recipe?.seats ? number('smart-chairs', 'Cadeiras', options.chairs, 1, 8) : ''}${number('smart-seed', 'Variação', options.seed, 0, 4294967295)}</div>
    ${check('smart-lighting', 'Distribuir iluminação', options.lighting)}${existing ? check('smart-restoreDeleted', 'Restaurar itens excluídos', options.restoreDeleted) : ''}
    <button class="wide accent-outline" data-action="smart-preview" ${floorId ? '' : 'disabled'}>${existing ? 'Revisar regeneração' : insight?.count ? 'Completar o que falta' : 'Prévia do mobiliário'}</button>
    <button class="wide quiet" data-action="smart-variation" ${floorId ? '' : 'disabled'}>Ver outra arrumação</button>
    <p class="microcopy">O que você já colocou é aproveitado e não sai do lugar: as peças novas se arrumam em volta. Portas e janelas ficam livres.${existing ? ' Posições, nomes e materiais editados são preservados; exclusões não reaparecem sem sua escolha.' : ''}</p>
    ${existing ? '<button class="wide quiet" data-action="smart-detach">Desvincular receita</button>' : ''}</div>
    <div class="control-group"><span class="eyebrow">ESTADO DO LUGAR</span>
    ${choiceField('state-state','Como o lugar foi deixado',stateOptions.state,ROOM_STATES.map(entry => [entry.id, entry.name]))}
    <p class="microcopy">${esc(state.description)}</p>
    ${stateOptions.state === 'tidy' ? '' : `<label class="field range-field"><span class="field-label">Intensidade</span><span class="value-box"><input type="number" data-field="state-intensity" value="${Math.round(stateOptions.intensity * 100)}" min="0" max="100" step="5"/><i>%</i></span><input type="range" data-range="state-intensity" value="${Math.round(stateOptions.intensity * 100)}" min="0" max="100" step="5" tabindex="-1" aria-hidden="true"/></label>`}
    <button class="wide accent-outline" data-action="state-preview" ${floorId ? '' : 'disabled'}>Prévia do estado</button>
    ${stateOptions.state === 'tidy' ? '' : `<button class="wide quiet" data-action="state-variation" ${floorId ? '' : 'disabled'}>Ver outra versão</button>`}
    <p class="microcopy">Age sobre o que existe: seus móveis podem ser gastos, tirados do lugar ou afastados, nunca removidos. O que o estado acrescenta é trocado pelo próximo estado e sai com Arrumado.</p></div>
    <div class="control-group"><span class="eyebrow">LUZ DO CÔMODO</span>
    <label class="field"><span>Clima da luz</span><select data-field="ambience-mood">${ROOM_MOODS.map(mood => option(mood.id, mood.id === 'auto' && insight?.mood ? `Automática · ${insight.mood.name.toLowerCase()}` : mood.name, ambience.mood)).join('')}</select></label>
    <p class="microcopy">${esc(ambience.mood === 'auto' && insight?.mood ? `${insight.mood.description} Escolhida porque ${insight.mood.reason}.` : ROOM_MOODS.find(mood => mood.id === ambience.mood).description)}</p>
    <button class="wide accent-outline" data-action="light-preview" ${floorId ? '' : 'disabled'}>Prévia da iluminação</button>
    <p class="microcopy">Acende os abajures, velas, telas e lareiras que estão no cômodo e só pendura luminárias no teto onde eles não bastam. Luzes que você configurou não são alteradas.</p>
    ${insight?.atmosphere ? `<div class="assistant-suggestion"><p>Para a cena inteira, combina com <strong>${esc(insight.atmosphere.name.toLowerCase())}</strong>.</p><div class="field-grid"><button type="button" data-environment-preview="${insight.atmosphere.id}">Prévia</button><button type="button" data-environment="${insight.atmosphere.id}">Aplicar</button></div></div>` : ''}</div>
    <div class="control-group"><span class="eyebrow">DETALHES</span>
    <label class="field range-field"><span class="field-label">Quantidade</span><span class="value-box"><input type="number" data-field="ambience-amount" value="${Math.round(ambience.amount * 100)}" min="0" max="100" step="5"/><i>%</i></span><input type="range" data-range="ambience-amount" value="${Math.round(ambience.amount * 100)}" min="0" max="100" step="5" tabindex="-1" aria-hidden="true"/></label>
    <button class="wide accent-outline" data-action="details-preview" ${floorId ? '' : 'disabled'}>Prévia dos detalhes</button>
    <button class="wide quiet" data-action="details-variation" ${floorId ? '' : 'disabled'}>Ver outra versão</button>
    <p class="microcopy">Cortinas nas janelas, tapete sob o móvel principal, peças nas paredes e cantos vazios e objetos sobre tampos livres. Só acrescenta o que ainda não existe.</p></div></section>`;
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
