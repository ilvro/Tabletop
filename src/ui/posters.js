import { escapeHTML as esc } from './icons.js';

/** Two letters for the placeholder of a poster without a preview yet. */
export const initials = name => String(name ?? '').split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 2).map(word => word[0].toLocaleUpperCase('pt-BR')).join('') || '·';

/** The picture of a poster: the preview when it exists, otherwise a placeholder that says what it will be. */
export function posterImage(name, image) {
  return image
    ? `<img class="scene-thumbnail" src="${esc(image)}" alt="Prévia de ${esc(name)}" width="480" height="270" loading="lazy" />`
    : `<span class="scene-thumbnail scene-thumbnail-pending" role="img" aria-label="Gerando prévia"><span class="poster-initials" aria-hidden="true">${esc(initials(name))}</span></span>`;
}

/**
 * A poster for a scene, an example or a map. The open attribute (`data-open`, `data-open-example`, `data-open-map`) stays on the
 * main button, which holds the picture and the text, so the whole poster is one target; secondary actions sit beside it.
 */
export function posterMarkup({ tag, tagClass = '', name, meta = '', text = '', image, open, accent = '', badge = '', cta = '', actions = '', actionsHidden = false, className = '' }) {
  return `<article class="item-card poster ${className}" ${accent ? `style="--poster-accent:${esc(accent)}"` : ''}>
    <button type="button" class="item-card-main poster-main" ${open}>
      <span class="poster-image">${posterImage(name, image)}</span>
      <span class="poster-body scene-card-description">
        <span class="poster-tags"><span class="tt-tag is-small">${esc(tag)}</span>${badge}</span>
        <strong class="tt-display">${esc(name)}</strong>
        ${meta ? `<small class="poster-meta">${esc(meta)}</small>` : ''}
        ${text ? `<span class="poster-text">${esc(text)}</span>` : ''}
        ${cta ? `<b class="poster-cta">${esc(cta)}</b>` : ''}
      </span>
    </button>
    ${actions ? `<div class="item-card-actions poster-actions" ${actionsHidden ? 'hidden' : ''}>${actions}</div>` : ''}
  </article>`;
}
