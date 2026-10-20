import { icon, escapeHTML as esc } from './icons.js';

/** Other apps of the same table (Ficha, Jukebox…), shown in the rail when there is any. `{ id, label, url, icon }`. Empty by default. */
export const ECOSYSTEM_APPS = [];

export const ecosystemRail = (apps = ECOSYSTEM_APPS) => apps.length
  ? `<div class="rail-group rail-apps" aria-label="Mesa">${apps.map(app => `<a class="rail-btn" href="${esc(app.url)}" target="_blank" rel="noopener" data-tip="${esc(app.label)}" aria-label="${esc(app.label)}">${icon(app.icon ?? 'frame', 22)}<span>${esc(app.label)}</span></a>`).join('')}</div>`
  : '';
