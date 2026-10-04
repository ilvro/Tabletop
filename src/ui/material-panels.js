import { SURFACE_MATERIALS, textureOptions } from '../domain/materials.js';
import { escapeHTML as esc } from './icons.js';
export function textureSelect(field,value='none') {
  return `<label class="field"><span>Textura / material</span><select data-field="${field}"><option value="none" ${value==='none'?'selected':''}>Sem textura adicional</option>${SURFACE_MATERIALS.map(p=>`<option value="${p.id}" ${value===p.id?'selected':''}>${p.name}</option>`).join('')}</select></label>`;
}
/** Shared by object materials and terrain layers, using the same persisted fields. */
export function textureCustomization(prefix, settings, {numberField, colorField}) {
  if (!settings.texture || settings.texture === 'none') return '';
  const m = textureOptions(settings);
  const select = (key, label, options) => `<label class="field"><span>${label}</span><select data-field="${prefix}${key}">${options.map(([value,name])=>`<option value="${value}" ${m[key]===value?'selected':''}>${name}</option>`).join('')}</select></label>`;
  const number = (key, label, min, max, step, factor=1) => numberField(prefix+key,label,Number((m[key]*factor).toFixed(5)),{min,max,step});
  return `${colorField(prefix+'textureColor','Cor da textura',m.textureColor)}
    ${select('textureColorMode','Aplicação da cor',[['original','Paleta original'],['replace','Recolorir · preservar detalhes'],['tint','Multiplicar pela cor']])}
    ${number('textureBrightness','Brilho · 0 escuro / 1 original / 2 claro',0,2,.05)}
    ${settings.texture==='wood'?`<span class="eyebrow">DESENHO DA MADEIRA</span>
      ${select('woodPattern','Padrão da madeira',[['planks','Tábuas'],['grain','Madeira contínua'],['parquet','Parquet em blocos']])}
      ${m.woodPattern!=='grain'?number('woodBoards','Tábuas por repetição',1,32,1):''}
      ${select('woodDirection','Orientação das tábuas / veios',[['horizontal','Horizontal'],['vertical','Vertical']])}
      ${m.woodPattern!=='grain'?number('woodGap','Largura das juntas · % da tábua',0,15,.5,100):''}
      ${number('woodGrain','Intensidade dos veios · 0–1',0,1,.05)}
      <p class="microcopy">A quantidade vale para cada repetição do padrão, cujo tamanho está em metros acima. A orientação segue os eixos da superfície.</p>`:''}
    ${settings.texture==='metal'?`<span class="eyebrow">DESENHO DO METAL</span>
      ${select('metalPattern','Padrão do metal',[['brushed','Escovado'],['smooth','Liso'],['diamond','Chapa xadrez'],['corrugated','Ondulado'],['rusted','Enferrujado']])}
      ${number('metalWear','Desgaste / oxidação · %',0,100,5,100)}`:''}
    ${number('textureRotation','Rotação do padrão · graus',0,360,15)}
    <details data-texture-options="${prefix}"><summary>Contraste, saturação e variação</summary>
      ${number('textureContrast','Contraste · 1 original',0,2,.05)}
      ${number('textureSaturation','Saturação · 0 cinza / 1 original',0,2,.05)}
      ${number('patternDensity','Densidade dos detalhes · 1 original',.25,4,.25)}
      ${number('textureSeed','Variação do desenho · seed',0,65535,1)}
    </details>`;
}
export function materialPanel(record,slots,{numberField,colorField}) {
  const m=record.material;
  return `<section><span class="eyebrow">MATERIAL E TEXTURA</span>${textureSelect('material-texture',m.texture)}${record.kind==='prop'?`<label class="field"><span>Aplicar acabamento em</span><select data-field="material-textureSlot"><option value="base">Todos os materiais</option>${slots.filter(s=>s!=='base').map(s=>`<option value="${esc(s)}" ${m.textureSlot===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label>`:''}${m.texture && m.texture!=='none'?numberField('material-textureSize','Tamanho do padrão · m',m.textureSize??2,{min:.05,max:50,step:.1}):''}${textureCustomization('material-',m,{numberField,colorField})}${numberField('material-relief','Relevo aparente · m',m.relief??.03,{min:0,max:.2,step:.005})}${colorField('material-color','Cor / matiz',m.color)}${numberField('material-roughness','Rugosidade',m.roughness,{min:0,max:1,step:.05})}${numberField('material-metalness','Metalicidade',m.metalness,{min:0,max:1,step:.05})}<p class="microcopy">Escolher uma textura aplica sua cor e acabamento iniciais. A cor da textura recolore o desenho; Cor / matiz multiplica o acabamento final. Selecionar outro material reinicia os ajustes da textura. Sem textura adicional restaura a aparência original de modelos importados.</p></section>`;
}
export function localEffectPanel(record,{numberField,colorField,checkField}) {
  const e=record.localEffect;
  return `<section><span class="eyebrow">FOGO E FUMAÇA</span><label class="field"><span>Efeito neste objeto</span><select data-field="effect-type">${[['none','Sem efeito'],['fire','Fogo'],['smoke','Fumaça']].map(([v,l])=>`<option value="${v}" ${(e?.enabled?e.type:'none')===v?'selected':''}>${l}</option>`).join('')}</select></label>${e?.enabled?`${checkField('effect-enabled','Efeito ligado',e.enabled)}${checkField('effect-hideModel','Ocultar modelo e mostrar só o efeito',e.hideModel)}<div class="axis-fields">${e.size.map((v,i)=>numberField(`effect-size-${i}`,['Largura · m','Altura · m','Profundidade · m'][i],v,{min:.1,max:20})).join('')}</div><div class="axis-fields">${e.offset.map((v,i)=>numberField(`effect-offset-${i}`,['X local','Y local','Z local'][i],v)).join('')}</div>${numberField('effect-count','Partículas',e.count,{min:1,max:512,step:1})}${numberField('effect-speed','Velocidade',e.speed,{min:0,max:10,step:.1})}${numberField('effect-opacity','Opacidade',e.opacity,{min:0,max:1,step:.05})}${colorField('effect-color','Cor',e.color)}${numberField('effect-seed','Variação · seed',e.seed,{min:0,max:4294967295,step:1})}${e.type==='fire'?numberField('effect-lightIntensity','Intensidade da luz do fogo',e.lightIntensity,{min:0,max:500,step:1}):''}`:''}<p class="microcopy">O efeito acompanha este objeto. Pausa e qualidade ficam na aba Cena; não há colisão de fumaça com paredes ou tetos.</p></section>`;
}
