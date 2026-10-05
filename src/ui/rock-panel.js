import { rockDefaults } from '../domain/rocks.js';

export function rockPanel(record,{numberField}) {
  const defaults=rockDefaults(record.assetRef?.id);if(!defaults) return '';
  const r=record.rockShape??defaults;
  return `<section><span class="eyebrow">GEOMETRIA DA ROCHA</span>
    <label class="field"><span>Formação do volume</span><select data-field="rock-form">${[['fractured','Fraturada'],['rounded','Arredondada / granito'],['strata','Estratificada']].map(([v,l])=>`<option value="${v}" ${r.form===v?'selected':''}>${l}</option>`).join('')}</select></label>
    ${numberField('rock-irregularity','Irregularidade do volume · 0–1',r.irregularity,{min:0,max:1,step:.05})}
    ${numberField('rock-detail','Detalhe da malha · 2–8',r.detail,{min:2,max:8,step:1})}
    ${numberField('rock-seed','Variação da forma · seed',r.seed,{min:0,max:65535,step:1})}
    <button data-action="rock-reset" class="wide">Restaurar forma do modelo</button>
    <p class="microcopy">Muda a geometria desta instância. Dimensões/base, posição, material e neve são preservados. Use escala X/Y/Z para dimensionar. O detalhe maior aumenta o custo; estas rochas são cenográficas e não oferecem apoio automático de tokens.</p></section>`;
}
