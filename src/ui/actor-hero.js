import { icon, escapeHTML as esc } from './icons.js';

/** The portrait of a character, lit from the side like the cinematic sheets; a silhouette when there is no image. */
export const actorPortrait = portraitURL => portraitURL
  ? `<div class="actor-portrait"><img src="${esc(portraitURL)}" alt="" /></div>`
  : `<div class="actor-portrait is-silhouette" aria-hidden="true">${icon('token', 54)}</div>`;

/**
 * The inspector header of a character. `actions` is the shared row of hero buttons; `options.sheetSlot` is HTML reserved
 * for a linked character sheet (empty by default: nothing is shown for a sheet that is not there).
 */
export function actorHero(actor, token, portraitURL, actions, { sheetSlot = '' } = {}) {
  const secret = token.audience === 'gm';
  return `<div class="object-title inspector-hero actor-hero">${actorPortrait(portraitURL)}
    <span class="hero-tags"><span class="tt-tag is-small is-scene">PERSONAGEM</span>${secret ? '<span class="tt-tag is-small is-gm">SÓ MESTRE</span>' : ''}</span>
    <strong class="tt-display">${esc(actor.name)}</strong>
    <small class="hero-meta">${secret ? 'Só o mestre vê' : 'No projetor · visível'}</small>
    ${sheetSlot}${actions}</div>`;
}

/** The round avatar of a token row in the elements list. */
export const actorAvatar = portraitURL => portraitURL ? `<img class="tree-avatar" src="${esc(portraitURL)}" alt="" width="22" height="22" loading="lazy" />` : '';
