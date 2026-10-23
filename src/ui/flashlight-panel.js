import { FLASHLIGHT_DEFAULTS } from '../domain/cinematics.js';

/** The flashlight a character carries: off until switched on, then every setting of its beam. */
export function flashlightPanel(flashlight, { numberField: n, colorField: c, checkField: b }) {
  const f = { ...FLASHLIGHT_DEFAULTS, ...flashlight }, on = Boolean(flashlight?.enabled);
  const settings = flashlight ? `${c('flashlight-color', 'Cor da luz', f.color)}${n('flashlight-intensity', 'Força', f.intensity, { min: 0, max: 300, step: 1 })}${n('flashlight-distance', 'Alcance · m', f.distance, { min: 1, max: 60, step: .5 })}
    ${n('flashlight-angle', 'Abertura do facho · graus', Math.round(f.angle * 180 / Math.PI), { min: 5, max: 75, step: 1 })}${n('flashlight-penumbra', 'Borda suave · %', Math.round(f.penumbra * 100), { min: 0, max: 100, step: 5 })}
    ${n('flashlight-pitch', 'Inclinação para baixo · graus', f.pitch, { min: -30, max: 60, step: 1 })}${n('flashlight-height', 'Altura da mão · m', f.height, { min: .2, max: 3, step: .05 })}${b('flashlight-shadow', 'Projetar sombras', f.shadow)}` : '';
  return `<section><span class="eyebrow">LANTERNA</span>${b('flashlight-enabled', 'Lanterna acesa', on)}${settings}<p class="microcopy">O facho aponta para a frente do personagem: gire o token (R) para mirar. Com névoa iluminada ligada em Ambiente, o facho aparece no ar.</p></section>`;
}
