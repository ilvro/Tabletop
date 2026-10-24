import { foundClues } from '../domain/inspectables.js';
import { escapeHTML as esc } from './icons.js';

/**
 * The session's clue archive: what was revealed to the players, in order. Any of them goes
 * back to the projector with one click; forgetting one makes its secret content secret again.
 */
export function cluePanel(doc, { onProjector = null, connected = false } = {}) {
  if (doc.documentType !== 'scene') return '<section><span class="eyebrow">PISTAS REVELADAS</span><p class="microcopy">Pistas pertencem a cenas: salve este mapa como cena para revelar documentos aos jogadores.</p></section>';
  const clues = foundClues(doc).map(id => doc.layout.entities[id]).filter(Boolean);
  const showing = onProjector && doc.layout.entities[onProjector];
  const list = clues.length ? `<ol class="clue-list">${clues.map(entity => `<li><span title="${esc(entity.inspectable?.title || entity.name)}">${esc(entity.inspectable?.title || entity.name)}</span>
      <button data-action="clue-show" data-id="${esc(entity.id)}" class="quiet" ${connected ? '' : 'disabled title="Abra a segunda tela primeiro"'}>Projetor</button>
      <button data-action="clue-inspect" data-id="${esc(entity.id)}" class="quiet">Ver</button>
      <button data-action="clue-forget" data-id="${esc(entity.id)}" class="quiet danger" title="Volta a ser secreta no projetor">Esquecer</button></li>`).join('')}</ol>`
    : '<p class="microcopy">Nenhuma pista revelada ainda. Inspecione um documento (clique duplo) e use <b>Mostrar aos jogadores</b>.</p>';
  return `<section><span class="eyebrow">PISTAS REVELADAS</span>${showing ? `<p class="microcopy">No projetor agora: <b>${esc(showing.inspectable?.title || showing.name)}</b>.</p><button data-action="projector-inspect-close" class="wide quiet">Recolher do projetor</button>` : ''}${list}<p class="microcopy">Revelar entra no histórico (Ctrl+Z desfaz) e fica salvo com a cena.</p></section>`;
}
