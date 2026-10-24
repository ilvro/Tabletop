import { escapeHTML as esc, icon } from './icons.js';

const nameOf = (doc, tokenId) => doc.actors?.[doc.tokens?.[tokenId]?.actorId]?.name ?? 'Personagem';
const colorOf = (doc, tokenId) => doc.tokens?.[tokenId]?.visualOverride?.color ?? doc.actors?.[doc.tokens?.[tokenId]?.actorId]?.color ?? '#9aa3ad';

/** The turn order in Tomadas: start a combat, type the values, pass the turn. `camera` is whether the camera goes to the turn. */
export function initiativePanel(doc, { camera = false } = {}) {
  const initiative = doc.sessionState?.initiative, tokens = Object.keys(doc.tokens ?? {});
  if (!initiative) return `<section><span class="eyebrow">INICIATIVA</span>
    <p class="microcopy">${tokens.length ? 'Começa com todos os personagens da cena; depois digite o valor de cada um e a ordem se arruma sozinha.' : 'Coloque personagens na cena para começar um combate.'}</p>
    <button type="button" data-action="initiative-start" class="wide accent-outline" ${tokens.length ? '' : 'disabled'}>${icon('token', 16)}<span>Começar combate</span></button></section>`;
  const missing = tokens.filter(id => !initiative.order.some(entry => entry.tokenId === id));
  return `<section><span class="eyebrow">INICIATIVA · RODADA ${initiative.round}</span>
    <ol class="initiative-list">${initiative.order.map((entry, index) => `<li class="${index === initiative.current ? 'is-turn' : ''}" style="--token-color:${esc(colorOf(doc, entry.tokenId))}">
      <i></i><span>${esc(nameOf(doc, entry.tokenId))}</span>
      <input type="number" step="1" value="${entry.value}" data-initiative-value="${esc(entry.tokenId)}" aria-label="Iniciativa de ${esc(nameOf(doc, entry.tokenId))}" />
      <button type="button" class="icon-button quiet" data-initiative-remove="${esc(entry.tokenId)}" aria-label="Tirar ${esc(nameOf(doc, entry.tokenId))} do combate">${icon('close', 14)}</button></li>`).join('')}</ol>
    <div class="field-grid"><button type="button" data-action="initiative-prev" class="quiet">Anterior</button><button type="button" data-action="initiative-next" class="primary" title="Próximo turno (N)">Próximo turno</button></div>
    ${missing.length ? `<button type="button" data-action="initiative-add" class="wide quiet">Incluir ${missing.length === 1 ? 'o personagem que falta' : `os ${missing.length} personagens que faltam`}</button>` : ''}
    <label class="check"><input type="checkbox" data-field="initiative-camera" ${camera ? 'checked' : ''}/><span>Câmera vai até quem tem a vez</span></label>
    <button type="button" data-action="initiative-end" class="wide quiet danger">Encerrar combate</button>
    <p class="microcopy">N passa o turno. O projetor mostra a ordem no topo e um anel pulsa sob quem tem a vez; personagens só do mestre não aparecem lá.</p></section>`;
}

/** The strip of portraits over the stage and on the projector: whose turn it is, and who comes next. */
export function initiativeStrip(doc, portraitOf) {
  const initiative = doc.sessionState?.initiative;
  if (!initiative?.order.length) return '';
  const count = initiative.order.length, shown = Array.from({ length: Math.min(count, 7) }, (_, k) => initiative.order[(initiative.current + k) % count]);
  return `<div class="initiative-round">Rodada ${initiative.round}</div>${shown.map((entry, k) => {
    const portrait = portraitOf(entry.tokenId);
    return `<div class="initiative-card ${k === 0 ? 'is-turn' : ''}" style="--token-color:${esc(colorOf(doc, entry.tokenId))}">${portrait ? `<img src="${esc(portrait)}" alt="" />` : `<span class="initiative-initial">${esc(nameOf(doc, entry.tokenId).slice(0, 1))}</span>`}<small>${esc(nameOf(doc, entry.tokenId))}</small></div>`;
  }).join('')}`;
}
