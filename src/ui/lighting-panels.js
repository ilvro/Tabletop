import { FOG_DEFAULTS, VOLUME_DEFAULTS, BLOOM_DEFAULTS, FLICKER_DEFAULTS } from '../domain/lighting.js';
import { Euler, Quaternion } from 'three';

export function atmospherePanel(look, effectsEnabled, { numberField: n, colorField: c, checkField: b }) {
  const fog = { ...FOG_DEFAULTS, ...look.fog }, volume = { ...VOLUME_DEFAULTS, ...look.volumetricFog }, bloom = { ...BLOOM_DEFAULTS, ...look.bloom };
  return `<section><span class="eyebrow">ATMOSFERA E EFEITOS</span>
    ${b('effects-paused', 'Pausar cintilação', look.effectsPaused)}
    <details><summary>Névoa de distância</summary>${b('fog-enabled', 'Ativar névoa de distância', fog.enabled)}
    <label class="field"><span>Tipo de névoa</span><select data-field="fog-mode"><option value="linear" ${fog.mode === 'linear' ? 'selected' : ''}>Linear</option><option value="exp2" ${fog.mode === 'exp2' ? 'selected' : ''}>Exponencial</option></select></label>
    ${c('fog-color', 'Cor da névoa', fog.color)}${n('fog-near', 'Início · m', fog.near, { min: 0 })}${n('fog-far', 'Fim · m', fog.far, { min: .1 })}${n('fog-density', 'Densidade exponencial', fog.density, { min: 0, max: 1, step: .005 })}</details>
    <details><summary>Névoa volumétrica por altura</summary>${b('volume-enabled', 'Ativar volume de névoa', volume.enabled)}${c('volume-color', 'Cor do volume', volume.color)}${n('volume-density', 'Densidade do volume', volume.density, { min: 0, max: 1, step: .01 })}${n('volume-baseHeight', 'Base · altura em m', volume.baseHeight)}${n('volume-height', 'Espessura vertical · m', volume.height, { min: .1, max: 1000 })}${n('volume-maxDistance', 'Distância máxima · m', volume.maxDistance, { min: 1, max: 1200 })}<p class="microcopy">Camada horizontal de névoa. A geometria limita o volume visível; não cria feixes ou sombras volumétricas.</p></details>
    <details><summary>Halo luminoso · bloom</summary>${b('bloom-enabled', 'Ativar bloom', bloom.enabled)}${n('bloom-strength', 'Força do halo', bloom.strength, { min: 0, max: 1 })}${n('bloom-radius', 'Raio do halo', bloom.radius, { min: 0, max: 1 })}${n('bloom-threshold', 'Limiar de brilho', bloom.threshold, { min: 0, max: 10 })}</details>
    ${b('viewport-effects', 'Volume e bloom nesta janela', effectsEnabled)}<p class="microcopy">Cada janela pode desligar volume e bloom para reduzir o custo. A preferência por movimento reduzido pausa a cintilação.</p></section>`;
}

export function lightPanel(record, { numberField: n, colorField: c, checkField: b }) {
  const flicker = { ...FLICKER_DEFAULTS, ...record.flicker };
  const pitch = new Euler().setFromQuaternion(new Quaternion(...record.rotation), 'YXZ').x * 180 / Math.PI;
  return `<section><span class="eyebrow">ILUMINAÇÃO</span>
    <label class="field"><span>Tipo de luz</span><select data-field="light-type">${[['point','Pontual'],['spot','Spot · foco cônico'],['directional','Direcional']].map(([type, label]) => `<option value="${type}" ${record.type === type ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
    ${b('light-enabled', 'Luz ligada', record.enabled !== false)}${c('light-color', 'Cor da fonte', record.color)}
    ${b('light-useTemperature', 'Usar temperatura Kelvin', record.temperature != null)}${record.temperature != null ? n('light-temperature', 'Temperatura · K', record.temperature, { min: 1000, max: 40000, step: 100 }) : ''}
    ${n('light-intensity', 'Intensidade', record.intensity, { min: 0, step: record.type === 'directional' ? .1 : 5 })}
    ${record.type !== 'directional' ? n('light-distance', 'Alcance · m (0 = ilimitado)', record.distance, { min: 0, step: 1 }) : ''}
    ${record.type !== 'point' ? n('light-pitch', 'Inclinação · graus', pitch, { min: -89, max: 89, step: 5 }) : ''}
    ${record.type === 'spot' ? n('light-angle', 'Abertura total · graus', record.angle * 360 / Math.PI, { min: 2, max: 180, step: 5 }) + n('light-penumbra', 'Suavidade da borda', record.penumbra, { min: 0, max: 1 }) : ''}
    ${b('light-shadow', 'Projetar sombras', record.shadowEnabled)}
    <details><summary>Cintilação · flicker</summary>${b('flicker-enabled', 'Animar cintilação', flicker.enabled)}
    <label class="field"><span>Padrão</span><select data-field="flicker-pattern"><option value="candle" ${flicker.pattern === 'candle' ? 'selected' : ''}>Vela / tocha suave</option><option value="fluorescent" ${flicker.pattern === 'fluorescent' ? 'selected' : ''}>Fluorescente defeituosa</option></select></label>
    ${n('flicker-amplitude', 'Variação de intensidade', flicker.amplitude, { min: 0, max: 1 })}${n('flicker-frequency', 'Frequência · Hz', flicker.frequency, { min: .1, max: 20 })}${n('flicker-seed', 'Seed do padrão', flicker.seed, { min: 0, max: 2147483647, step: 1 })}</details></section>`;
}
