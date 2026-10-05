import { rockDefaults, CLIFF_DEFAULTS } from '../domain/rocks.js';

export function rockPanel(record,{numberField}) {
  const defaults=rockDefaults(record.assetRef?.id);if(!defaults) return '';
  const r=record.rockShape??defaults;
  return `<section><span class="eyebrow">GEOMETRIA DA ROCHA</span>
    <label class="field"><span>Formação do volume</span><select data-field="rock-form">${[['organic','Rocha orgânica · fraturas locais'],['organic-cliff','Paredão orgânico · volume irregular'],['fractured','Fraturada'],['rounded','Arredondada / granito'],['strata','Estratificada'],['cliff','Paredão · faces e saliências'],['spire','Pináculo · torre natural']].map(([v,l])=>`<option value="${v}" ${r.form===v?'selected':''}>${l}</option>`).join('')}</select></label>
    ${numberField('rock-irregularity','Irregularidade do volume · 0–1',r.irregularity,{min:0,max:1,step:.05})}
    ${numberField('rock-detail','Detalhe da malha · 2–8',r.detail,{min:2,max:8,step:1})}
    ${numberField('rock-seed','Variação da forma · seed',r.seed,{min:0,max:65535,step:1})}
    ${r.form.startsWith('organic')?`${numberField('rock-erosion','Fraturas e erosão local · 0–1',r.erosion??CLIFF_DEFAULTS.erosion,{min:0,max:1,step:.05})}${r.form==='organic-cliff'?numberField('rock-overhang','Saliências locais · 0–1',r.overhang??CLIFF_DEFAULTS.overhang,{min:0,max:1,step:.05}):''}<p class="microcopy">Massas e fraturas variam nos três eixos, sem fileiras de camadas. Use o pincel T para ajustar um ponto. Em Material e textura → Personalizar, escolha Rocha orgânica para o acabamento.</p>`:''}
    ${['cliff','spire'].includes(r.form)?`${numberField('rock-overhang','Saliências e reentrâncias · 0–1',r.overhang??CLIFF_DEFAULTS.overhang,{min:0,max:1,step:.05})}${numberField('rock-terraces','Camadas do paredão · 1–12',r.terraces??CLIFF_DEFAULTS.terraces,{min:1,max:12,step:1})}${numberField('rock-erosion','Erosão das faces · 0–1',r.erosion??CLIFF_DEFAULTS.erosion,{min:0,max:1,step:.05})}<p class="microcopy">Saliências mudam o volume, inclusive a face inferior das bordas. Erosão quebra as faces; não é apenas relevo da textura. A face principal aponta para +Z; gire a peça para orientar o paredão.</p>`:''}
    <button data-action="rock-reset" class="wide">Restaurar forma do modelo</button>
    <p class="microcopy">Muda a geometria desta instância. Dimensões/base, posição, material e neve são preservados. Use escala X/Y/Z para dimensionar. O detalhe maior aumenta o custo; estas rochas são cenográficas e não oferecem apoio automático de tokens.</p></section>`;
}
