import { escapeHTML as esc } from './icons.js';
import { numberField, checkField, choiceField } from './controls.js';
import { FOCUS_DEFAULTS, MOTION_DEFAULTS } from '../domain/cinematics.js';

/**
 * Focus, follow and slow moves of the working camera, then the live camera. `targets` lists `[id, name]` of what can be
 * focused or followed (tokens, then the selected object); saving the camera keeps these settings in the shot.
 */
export function cinemaPanel(camera, { targets = [], names = {}, live = { enabled: false, smoothing: .6 } } = {}) {
  const focus = { ...FOCUS_DEFAULTS, ...camera.focus }, motion = { ...MOTION_DEFAULTS, ...camera.motion };
  const options = (selected, none) => {
    const list = selected && !targets.some(([key]) => key === selected) ? [...targets, [selected, names[selected] ?? 'Objeto']] : targets;
    return `<option value="">${none}</option>${list.map(([key, name]) => `<option value="${esc(key)}" ${selected === key ? 'selected' : ''}>${esc(name)}</option>`).join('')}`;
  };
  return `<section><span class="eyebrow">FOCO E MOVIMENTO</span>
      ${checkField('camera-focus-enabled', 'Desfocar o fundo · profundidade de campo', focus.enabled)}
      ${focus.enabled ? `<label class="field"><span>Focar em</span><select data-field="camera-focus-target">${options(focus.targetId, 'Distância fixa')}</select></label>
        ${numberField('camera-focus-aperture', 'Desfoque · %', Math.round(focus.aperture * 100), { min: 0, max: 100, step: 5 })}
        ${focus.targetId ? '' : numberField('camera-focus-distance', 'Distância do foco · m', Math.round(focus.distance * 10) / 10, { min: .2, max: 200, step: .1 })}` : ''}
      <label class="field"><span>Seguir personagem</span><select data-field="camera-follow">${options(camera.follow?.targetId ?? null, 'Ninguém')}</select></label>
      ${choiceField('camera-motion', 'Movimento automático', motion.type, [['none', 'Parada'], ['orbit', 'Órbita lenta', 'Órbita'], ['push', 'Aproximação lenta', 'Aproximar'], ['handheld', 'Câmera na mão', 'Na mão']])}
      ${motion.type !== 'none' ? numberField('camera-motion-speed', 'Intensidade do movimento', motion.speed, { min: .1, max: 4, step: .1 }) : ''}
      <p class="microcopy">O foco acompanha o alvo e muda devagar, como um foquista. Seguir mantém o enquadramento enquanto o token anda; WASD solta a câmera. Salvar câmera atual guarda foco, seguir e movimento na tomada.</p>
    </section>
    <section><span class="eyebrow">CÂMERA AO VIVO</span>
      ${checkField('camera-live', 'Projetor acompanha minha câmera', live.enabled)}
      ${numberField('camera-live-smoothing', 'Suavidade no projetor · s', live.smoothing, { min: .1, max: 2, step: .05 })}
      <p class="microcopy">Desligado, só tomadas e Publicar mudam o projetor. Ligado, o projetor segue você com atraso suave: seus movimentos viram travellings. A opção desliga ao trocar de cena.</p>
    </section>`;
}
