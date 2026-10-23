import { FIGURE_DEFAULTS, FIGURE_STATES, FIGURE_BASES } from '../domain/figures.js';

/** How a character with a portrait stands in the scene; nothing to set for a token drawn as a coloured disc. */
export function figurePanel(figure, { numberField: n, colorField: c, checkField: b, choiceField: choose }) {
  const f = { ...FIGURE_DEFAULTS, ...figure };
  const settings = figure ? `${choose('figure-state', 'Estado', f.state, FIGURE_STATES)}
    ${b('figure-facing', 'Girar para a câmera', f.facing === 'camera')}${n('figure-height', 'Altura · m', f.height, { min: .3, max: 3, step: .05 })}
    ${choose('figure-base', 'Base', f.base, FIGURE_BASES)}
    ${b('figure-outline', 'Contorno', f.outline)}${f.outline ? `${c('figure-outlineColor', 'Cor do contorno', f.outlineColor)}${n('figure-outlineWidth', 'Espessura do contorno · cm', Math.round(f.outlineWidth * 1000) / 10, { min: .2, max: 8, step: .1 })}` : ''}
    ${n('figure-rim', 'Luz na borda · %', Math.round(f.rim * 100), { min: 0, max: 100, step: 5 })}${f.rim > 0 ? c('figure-rimColor', 'Cor da luz na borda', f.rimColor) : ''}` : '';
  return `<section><span class="eyebrow">FIGURA</span>${b('figure-enabled', 'Figura recortada · retrato em pé, iluminado', Boolean(figure))}${settings}
    <p class="microcopy">O retrato é cortado nas margens transparentes, fica de pé na base, recebe a luz da cena e gira para a câmera de cada janela. Estado: ferido avermelha, morrendo pulsa, inconsciente e morto deitam, enlouquecendo distorce.</p></section>`;
}
