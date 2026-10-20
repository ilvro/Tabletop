import { icon, escapeHTML as esc } from './icons.js';

const pad = number => String(number).padStart(2, '0');
const frame = (thumbnails, camera, index, live) => {
  const image = thumbnails?.(camera);
  return `<div class="shot-frame">${image ? `<img src="${esc(image)}" alt="" width="320" height="180" />` : `<span class="shot-placeholder" aria-hidden="true">${icon('camera', 22)}</span>`}<span class="shot-number">${pad(index + 1)}</span>${live ? '<span class="rec"><i></i>AO VIVO</span>' : ''}</div>`;
};

/**
 * The film strip: every saved camera is a shot with a thumbnail. `publishedId` is the shot on air, `rehearsedId` the one the editor
 * is looking at without showing it; `live` says whether a projector is connected, so "ao vivo" is never claimed with nobody watching.
 */
export function shotsPanel(doc, { publishedId = null, rehearsedId = null, live = false, thumbnails = null } = {}) {
  const cameras = Object.values(doc.cameraPresets ?? {});
  return `<section><span class="eyebrow">TOMADAS</span>
    <button type="button" data-action="camera-save" class="wide"><span>Salvar enquadramento atual</span></button>
    <div class="shots">${cameras.map((camera, index) => {
      const onAir = live && camera.id === publishedId, rehearsed = camera.id === rehearsedId;
      return `<article class="shot ${onAir ? 'is-live' : ''} ${rehearsed ? 'is-rehearsed' : ''}" data-shot="${esc(camera.id)}">
        ${frame(thumbnails, camera, index, onAir)}
        <strong>${esc(camera.name)}</strong>
        <div class="shot-actions">
          <button type="button" data-camera-rehearse="${esc(camera.id)}" title="Ver só no editor, sem mostrar aos jogadores">Ensaiar</button>
          <button type="button" data-camera="${esc(camera.id)}" class="primary" title="Mover e mostrar no projetor com a transição escolhida">Transição</button>
          <button type="button" data-camera-cut="${esc(camera.id)}" title="Cortar para esta tomada no projetor" aria-label="Cortar para ${esc(camera.name)}">Corte</button>
          <button type="button" data-camera-delete="${esc(camera.id)}" class="quiet danger" aria-label="Excluir tomada ${esc(camera.name)}">${icon('trash', 14)}</button>
        </div>
      </article>`;
    }).join('') || '<p class="microcopy">Prepare uma câmera na cena e salve: cada enquadramento vira uma tomada que você ensaia e corta para os jogadores.</p>'}</div>
  </section>`;
}

/** The three-frame carousel shown while presenting: previous, current and next shot. */
export function shotDockMarkup(doc, { index = 0, publishedId = null, thumbnails = null } = {}) {
  const cameras = Object.values(doc.cameraPresets ?? {});
  if (!cameras.length) return '';
  const at = Math.min(Math.max(index, 0), cameras.length - 1), around = [[at - 1, 'prev'], [at, 'current'], [at + 1, 'next']];
  return `<button type="button" class="dock-arrow" data-dock-step="-1" aria-label="Tomada anterior" ${at === 0 ? 'disabled' : ''}>‹</button>
    <div class="dock-frames">${around.map(([position, role]) => {
      const camera = cameras[position];
      return camera ? `<button type="button" class="dock-frame is-${role} ${camera.id === publishedId ? 'is-live' : ''}" data-dock-select="${position}" aria-label="Tomada ${position + 1}: ${esc(camera.name)}">${frame(thumbnails, camera, position, camera.id === publishedId)}<strong>${esc(camera.name)}</strong></button>` : `<span class="dock-frame is-${role} is-empty"></span>`;
    }).join('')}</div>
    <button type="button" class="dock-arrow" data-dock-step="1" aria-label="Próxima tomada" ${at === cameras.length - 1 ? 'disabled' : ''}>›</button>
    <p class="dock-legend">‹ › escolher · Enter transição · Shift+Enter corte · 1–9 corte direto</p>
    <button type="button" class="dock-close quiet" data-dock-hide aria-label="Esconder tomadas">×</button>`;
}
