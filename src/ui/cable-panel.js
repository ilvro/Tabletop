import { CABLE_MODES, CABLE_RANGES } from '../domain/cables.js';
import { numberField, choiceField } from './controls.js';

/** Settings of a hung cable: where the second end is, how much it sags and what the bundle is made of. */
export function cablePanel(record) {
  const cable = record.cable; if (!cable) return '';
  const drop = cable.mode === 'drop', range = key => ({ min: CABLE_RANGES[key][0], max: CABLE_RANGES[key][1] });
  return `<section><span class="eyebrow">CABO</span>
    ${choiceField('cable-mode', 'Tipo', cable.mode, CABLE_MODES)}
    <div class="axis-fields">${cable.span.map((value, axis) => numberField(`cable-span-${axis}`, ['Vão X', 'Desnível', 'Vão Z'][axis], value, { min: -60, max: 60, step: .1 })).join('')}</div>
    <p class="microcopy">${drop ? 'O cabo cai do ponto de fixação; o comprimento é o tamanho do vão.' : 'A primeira ponta fica na posição do objeto; o vão leva até a segunda. Desnível positivo sobe.'}</p>
    <div class="field-grid">${numberField('cable-sag', drop ? 'Balanço · m' : 'Folga · m', cable.sag, { ...range('sag'), step: .05 })}${numberField('cable-strands', 'Fios', cable.strands, { ...range('strands'), step: 1 })}</div>
    <div class="field-grid">${numberField('cable-radius', 'Espessura · m', cable.radius, { ...range('radius'), step: .002 })}${numberField('cable-spread', 'Desalinho · m', cable.spread, { ...range('spread'), step: .02 })}</div>
    ${numberField('cable-seed', 'Variação', cable.seed, { ...range('seed'), step: 1 })}
  </section>`;
}
