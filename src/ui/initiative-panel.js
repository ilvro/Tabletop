import { escapeHTML as esc, icon } from './icons.js';
import { AREA_SHAPES, AREA_COLORS } from '../domain/areas.js';
import { numberField, choiceField } from './controls.js';

const nameOf = (doc, tokenId) => doc.actors?.[doc.tokens?.[tokenId]?.actorId]?.name ?? 'Personagem';
const colorOf = (doc, tokenId) => doc.tokens?.[tokenId]?.visualOverride?.color ?? doc.actors?.[doc.tokens?.[tokenId]?.actorId]?.color ?? '#9aa3ad';

/** The turn order in Tomadas: start a combat, type the values, pass the turn. `camera` is whether the camera goes to the turn. */
export function initiativePanel(doc, { camera = false, extra = '' } = {}) {
  const initiative = doc.sessionState?.initiative, tokens = Object.keys(doc.tokens ?? {});
  if (!initiative) return `<section class="initiative-panel"><span class="tt-tag is-small">Iniciativa</span>
    <p class="microcopy">${tokens.length ? 'Começa com todos os personagens da cena; depois digite o valor de cada um e a ordem se arruma sozinha.' : 'Coloque personagens na cena para começar um combate.'}</p>
    <button type="button" data-action="initiative-start" class="wide cta" ${tokens.length ? '' : 'disabled'}>${icon('token', 16)}<span>Começar combate</span></button>${extra}</section>`;
  const missing = tokens.filter(id => !initiative.order.some(entry => entry.tokenId === id));
  // As on the sheets: the name in the display face, the value in a die-like hexagon, the turn marked by a torn tag.
  return `<section class="initiative-panel"><header class="initiative-head"><span class="tt-tag is-small">Iniciativa</span><span class="initiative-round-badge"><small>Rodada</small><b>${initiative.round}</b></span></header>
    <ol class="initiative-list">${initiative.order.map((entry, index) => `<li class="${index === initiative.current ? 'is-turn' : ''}" style="--token-color:${esc(colorOf(doc, entry.tokenId))}">
      <b class="initiative-order">${index + 1}</b><span class="initiative-name">${esc(nameOf(doc, entry.tokenId))}${index === initiative.current ? '<em class="tt-tag is-small">Vez</em>' : ''}</span>
      <label class="initiative-hex"><input type="number" step="1" value="${entry.value}" data-initiative-value="${esc(entry.tokenId)}" aria-label="Iniciativa de ${esc(nameOf(doc, entry.tokenId))}" /></label>
      <button type="button" class="icon-button quiet" data-initiative-remove="${esc(entry.tokenId)}" aria-label="Tirar ${esc(nameOf(doc, entry.tokenId))} do combate">${icon('close', 14)}</button></li>`).join('')}</ol>
    <div class="field-grid initiative-actions"><button type="button" data-action="initiative-prev" class="quiet">Anterior</button><button type="button" data-action="initiative-next" class="primary" title="Próximo turno (N)">Próximo turno <kbd>N</kbd></button></div>
    ${missing.length ? `<button type="button" data-action="initiative-add" class="wide quiet">Incluir ${missing.length === 1 ? 'o personagem que falta' : `os ${missing.length} personagens que faltam`}</button>` : ''}
    <label class="check"><input type="checkbox" data-field="initiative-camera" ${camera ? 'checked' : ''}/><span>Câmera vai até quem tem a vez</span></label>
    <button type="button" data-action="initiative-end" class="wide quiet danger">Encerrar combate</button>
    <p class="microcopy">N passa o turno. O projetor mostra a ordem no topo e um anel pulsa sob quem tem a vez; personagens só do mestre não aparecem lá.</p>${extra}</section>`;
}

/**
 * The strip over the stage and on the projector, after the sheets' selection carousel: the round in a torn tag, whoever
 * has the turn in a tall card with the portrait (or the initial) lit in their colour, then the next ones, smaller.
 */
export function initiativeStrip(doc, portraitOf) {
  const initiative = doc.sessionState?.initiative;
  if (!initiative?.order.length) return '';
  const count = initiative.order.length, shown = Array.from({ length: Math.min(count, 7) }, (_, k) => initiative.order[(initiative.current + k) % count]);
  return `<div class="initiative-round"><span class="tt-tag is-small">Rodada</span><b>${initiative.round}</b></div><div class="initiative-cards">${shown.map((entry, k) => {
    const portrait = portraitOf(entry.tokenId), name = nameOf(doc, entry.tokenId);
    return `<div class="initiative-card ${k === 0 ? 'is-turn' : k === 1 ? 'is-next' : ''}" style="--token-color:${esc(colorOf(doc, entry.tokenId))}">${k === 0 ? '<span class="initiative-label">Vez de</span>' : k === 1 ? '<span class="initiative-label">Próximo</span>' : ''}
      <div class="initiative-face">${portrait ? `<img src="${esc(portrait)}" alt="" />` : `<span class="initiative-initial">${esc(name.slice(0, 1))}</span>`}</div><small>${esc(name)}</small><i class="initiative-value">${entry.value}</i></div>`;
  }).join('')}</div>`;
}

const shapeName = id => AREA_SHAPES.find(([key]) => key === id)?.[1] ?? id;
const metres = value => `${Math.round(value * 10) / 10}`.replace('.', ',');
/** Areas of effect: the shape, colour and label of the next one, the button that draws it, and the ones on the floor. */
export function areasPanel(doc, tool, drawing = false) {
  const areas = doc.sessionState?.areas ?? [];
  return `<div class="combat-areas"><span class="tt-tag is-small">Áreas de efeito</span>
    ${choiceField('area-shape', 'Forma', tool.shape, AREA_SHAPES)}
    <div class="area-colors" role="radiogroup" aria-label="Cor da área">${AREA_COLORS.map(color => `<button type="button" role="radio" aria-checked="${tool.color === color}" class="${tool.color === color ? 'active' : ''}" data-area-color="${color}" style="--swatch:${color}" aria-label="Cor ${color}"></button>`).join('')}</div>
    ${tool.shape === 'line' ? numberField('area-width', 'Largura da linha · m', tool.width, { min: .5, max: 10, step: .5 }) : ''}
    <label class="field"><span>Rótulo</span><input type="text" data-field="area-label" value="${esc(tool.label)}" maxlength="80" placeholder="Bola de fogo, gás, explosão…" autocomplete="off" /></label>
    <button type="button" data-action="area-draw" class="wide ${drawing ? 'active' : 'accent-outline'}">${icon('ruler', 16)}<span>${drawing ? 'Arraste no chão…' : 'Desenhar área no chão'}</span></button>
    <p class="microcopy">Arraste a partir do centro (círculo, quadrado) ou da origem (cone, linha) até o alcance. Quem a área toca ganha um anel na cor dela, também no projetor.</p>
    ${areas.length ? `<ul class="area-list">${areas.map(area => `<li style="--swatch:${esc(area.color)}"><i></i><span>${esc(area.label || shapeName(area.shape))} · ${metres(area.size)} m</span><button type="button" class="icon-button quiet" data-area-remove="${esc(area.id)}" aria-label="Apagar a área ${esc(area.label || shapeName(area.shape))}">${icon('close', 14)}</button></li>`).join('')}</ul>
    <button type="button" data-action="areas-clear" class="wide quiet">Apagar todas as áreas</button>` : ''}</div>`;
}
