import { INSPECT_KINDS, PAPERS, INSPECT_LIMITS, PAGE_SLOT } from '../domain/inspectables.js';
import { escapeHTML as esc } from './icons.js';

/**
 * Inspecionável: what a prop shows when it is picked up. Pages are written here or take an
 * imported image; the model shows the first page on the table when it has a `page` slot.
 */
export function inspectablePanel(record, slots, imageAssets, { numberField, checkField, choiceField }) {
  if (record.kind !== 'prop' || record.cable || record.decal) return '';
  const spec = record.inspectable;
  const open = '<button data-action="inspect-open" class="wide accent-outline">Inspecionar · prévia</button>';
  if (!spec) return `<section><span class="eyebrow">INSPECIONÁVEL</span>${checkField('inspect-enabled', 'Pista inspecionável · carta, foto, objeto', false)}<p class="microcopy">Na sessão, clique duplo no objeto: ele voa até a câmera, o fundo desfoca e dá para girar, aproximar e ler. Objetos pequenos podem ser inspecionados mesmo sem isto.</p>${open}</section>`;
  const image = (field, ref) => `<label class="field"><span class="field-label">Imagem</span><select data-field="${field}"><option value="">Sem imagem</option>${imageAssets.map(asset => { const value = `${asset.id}@${asset.revision ?? 1}`; return `<option value="${esc(value)}" ${ref && ref.id === asset.id ? 'selected' : ''}>${esc(asset.name)}</option>`; }).join('')}</select></label>`;
  const text = (field, value, label) => `<label class="field"><span class="field-label">${label}</span><textarea rows="5" maxlength="${INSPECT_LIMITS.text}" data-field="${field}" placeholder="Escreva o texto da página">${esc(value ?? '')}</textarea></label>`;
  const side = (i, which, content) => `${text(`inspect-page-${i}-${which}-text`, content.text, which === 'back' ? 'Verso · texto' : 'Texto')}${image(`inspect-page-${i}-${which}-imageRef`, content.imageRef)}`;
  const pages = spec.kind === 'document' ? `<div class="control-group"><span class="eyebrow">PÁGINAS · ATÉ ${INSPECT_LIMITS.pages}</span>${spec.pages.map((page, i) => `
      <fieldset class="inspect-page"><legend>Página ${i + 1}</legend>${side(i, 'front', page)}
        ${page.back ? `${side(i, 'back', page.back)}<button data-action="inspect-back-remove" data-index="${i}" class="quiet">Remover verso</button>` : `<button data-action="inspect-back-add" data-index="${i}" class="quiet">Escrever no verso</button>`}
        <div class="button-row">${spec.pages.length < INSPECT_LIMITS.pages ? `<button data-action="inspect-page-add" data-index="${i}" class="quiet">Nova página depois</button>` : ''}${spec.pages.length > 1 ? `<button data-action="inspect-page-remove" data-index="${i}" class="quiet danger">Remover página</button>` : ''}</div>
      </fieldset>`).join('')}</div>` : '';
  const slot = spec.kind === 'document' && !slots.includes(PAGE_SLOT) ? '<p class="microcopy">Este modelo não tem uma folha para mostrar a página: ele gira na inspeção e as páginas aparecem em <b>Ler</b>. Os modelos de Assets → busque “documento” mostram a primeira página na mesa.</p>' : '';
  return `<section><span class="eyebrow">INSPECIONÁVEL</span>${checkField('inspect-enabled', 'Pista inspecionável · carta, foto, objeto', true)}
    ${choiceField('inspect-kind', 'Tipo', spec.kind, INSPECT_KINDS)}
    <label class="field"><span class="field-label">Título na inspeção</span><input type="text" maxlength="${INSPECT_LIMITS.title}" data-field="inspect-title" value="${esc(spec.title)}" placeholder="${esc(record.name)}" autocomplete="off" /></label>
    ${spec.kind === 'document' ? choiceField('inspect-paper', 'Papel', spec.paper, PAPERS) : ''}
    ${checkField('inspect-secret', 'Secreto até revelar · o projetor só recebe o conteúdo ao mostrar', spec.secretUntilRevealed)}
    ${pages}${slot}
    <div class="control-group"><span class="eyebrow">NA FRENTE DA CÂMERA</span><div class="field-grid">${numberField('inspect-distance', 'Distância · m', spec.hold.distance, { min: INSPECT_LIMITS.distance[0], max: INSPECT_LIMITS.distance[1], step: .05 })}${numberField('inspect-pitch', 'Inclinação · graus', spec.hold.pitch, { min: INSPECT_LIMITS.pitch[0], max: INSPECT_LIMITS.pitch[1], step: 5 })}</div></div>
    ${open}<p class="microcopy">Na inspeção: arraste para girar, roda aproxima, clique duplo volta ao enquadramento, setas trocam a página, F vira a folha, Esc devolve. <b>Mostrar aos jogadores</b> leva a inspeção ao projetor e revela a pista.</p></section>`;
}
