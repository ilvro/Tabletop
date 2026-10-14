import { DECAL_KINDS, DECAL_FONTS, DECAL_RANGES, DECAL_TEXT_LIMIT, decalSpinAngle } from '../domain/decals.js';
import { escapeHTML as esc } from './icons.js';

/** The settings of a decal: what it says or shows, how big it is, how worn, and how it is turned on its face. */
export function decalPanel(record, host, imageAssets, { numberField, colorField, checkField, choiceField }) {
  const decal = record.decal; if (!decal) return '';
  const text = decal.kind === 'text' ? `<label class="field"><span class="field-label">Texto</span><input type="text" maxlength="${DECAL_TEXT_LIMIT}" data-field="decal-text" value="${esc(decal.text)}" /></label>
    ${choiceField('decal-font', 'Fonte', decal.font, DECAL_FONTS)}${colorField('decal-textColor', 'Cor das letras', decal.textColor)}
    ${checkField('decal-background-on', 'Fundo sólido', decal.background !== null)}${decal.background !== null ? colorField('decal-background', 'Cor do fundo', decal.background) : ''}` : '';
  const image = decal.kind === 'image' ? `<label class="field"><span class="field-label">Imagem da biblioteca</span><select data-field="decal-imageRef">${imageAssets.length ? '' : '<option value="">Nenhuma imagem importada</option>'}${imageAssets.map(asset => { const value = `${asset.id}@${asset.revision ?? 1}`; return `<option value="${esc(value)}" ${decal.imageRef && `${decal.imageRef.id}@${decal.imageRef.revision}` === value ? 'selected' : ''}>${esc(asset.name)}</option>`; }).join('')}</select></label>` : '';
  const hint = decal.kind === 'surface' ? '<p class="microcopy">Faixa do material escolhido em Material e textura: por padrão, listras de alerta. Estique até o comprimento da parede em Tamanho.</p>' : '';
  const size = DECAL_RANGES.size;
  return `<section><span class="eyebrow">DECALQUE</span>${choiceField('decal-kind', 'Conteúdo', decal.kind, DECAL_KINDS)}${text}${image}${hint}
    <div class="field-grid">${numberField('decal-size-0', 'Largura · m', decal.size[0], { min: size[0], max: size[1], step: .05 })}${numberField('decal-size-1', 'Altura · m', decal.size[1], { min: size[0], max: size[1], step: .05 })}</div>
    ${host ? numberField('decal-spin', 'Giro no plano · graus', Number(decalSpinAngle(host, record.anchor).toFixed(2)), { min: -180, max: 180, step: 5 }) : ''}
    ${numberField('decal-opacity', 'Opacidade · %', Math.round(decal.opacity * 100), { min: 0, max: 100, step: 5 })}
    <div class="control-group"><span class="eyebrow">DESGASTE</span>${numberField('decal-wear-faded', 'Apagado · %', Math.round(decal.wear.faded * 100), { min: 0, max: 100, step: 5 })}${numberField('decal-wear-scratched', 'Riscado · %', Math.round(decal.wear.scratched * 100), { min: 0, max: 100, step: 5 })}${numberField('decal-wear-seed', 'Variação do desgaste · semente', decal.wear.seed, { min: 0, max: 65535, step: 1 })}</div>
    <p class="microcopy">Arraste com Mover (G) para deslizar sobre a superfície e com Rotacionar (R) para girar. O decalque acompanha a parede, o piso ou o objeto em que está colado.</p></section>`;
}
