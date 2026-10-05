import { SURFACE_MATERIALS, textureOptions, distributionOptions } from '../domain/materials.js';
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
  return `<details data-texture-options="${prefix}design"><summary>Personalizar cor e padrão</summary>${colorField(prefix+'textureColor','Cor da textura',m.textureColor)}
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
    ${settings.texture==='rock'?`<span class="eyebrow">DESENHO DA ROCHA</span>
      ${select('rockPattern','Formação da rocha',[['fractured','Fraturada'],['strata','Estratificada'],['granite','Granito']])}
      ${number('rockCracks','Intensidade das fissuras · 0–1',0,1,.05)}`:''}
    ${number('textureRotation','Rotação do padrão · graus',0,360,15)}
    <details data-texture-options="${prefix}"><summary>Contraste, saturação e variação</summary>
      ${number('textureContrast','Contraste · 1 original',0,2,.05)}
      ${number('textureSaturation','Saturação · 0 cinza / 1 original',0,2,.05)}
      ${number('patternDensity','Densidade dos detalhes · 1 original',.25,4,.25)}
      ${number('textureSeed','Variação do desenho · seed',0,65535,1)}
    </details></details>`;
}
export function distributionPanel(prefix, settings, {numberField}, paint=true) {
  const d=distributionOptions(settings);
  const modes=[...(paint?[['paint','Pintura manual']]:[]),['top','Faces superiores / pouca inclinação'],['steep','Encostas / muita inclinação'],['all','Toda a superfície']];
  const number=(key,label,min,max,step)=>numberField(prefix+key,label,d[key],{min,max,step});
  return `<label class="field"><span>Distribuição da superfície</span><select data-field="${prefix}mode">${modes.map(([v,l])=>`<option value="${v}" ${d.mode===v?'selected':''}>${l}</option>`).join('')}</select></label>${d.mode!=='paint'?`
    ${d.mode!=='all'?`${number('slopeAngle','Inclinação limite · graus',0,90,1)}${number('slopeFade','Transição da inclinação · graus',.5,45,1)}`:''}
    <label class="check-field"><input type="checkbox" data-field="${prefix}heightEnabled" ${d.heightEnabled?'checked':''}/><span>Limitar pela altura no mapa</span></label>
    ${d.heightEnabled?`${number('minHeight','A partir da altura Y · m',-1000,1000,.5)}${number('heightFade','Transição da altura · m',.01,100,.1)}`:''}
    ${number('variation','Irregularidade da cobertura · 0–1',0,1,.05)}
    ${number('variationSize','Tamanho das manchas · m',.05,100,.25)}${number('seed','Variação da cobertura · seed',0,65535,1)}
    <p class="microcopy">A cobertura acompanha a inclinação e altura reais. As manchas usam metros no mapa. Faces inferiores ficam fora da distribuição por faces superiores.</p>`:''}`;
}
export function coveragePanel(settings, fields, record) {
  const c=settings.coverage;
  return `<details data-texture-options="surface-coverage"><summary>Cobertura sobre a superfície</summary>
    <label class="field"><span>Material da cobertura</span><select data-field="coverage-texture"><option value="none" ${!c?'selected':''}>Sem cobertura</option>${SURFACE_MATERIALS.map(p=>`<option value="${p.id}" ${c?.texture===p.id?'selected':''}>${p.name}</option>`).join('')}</select></label>
    ${c?`${fields.colorField('coverage-color','Cor da cobertura',c.color)}${fields.numberField('coverage-textureSize','Tamanho da textura da cobertura · m',c.textureSize,{min:.05,max:50,step:.1})}${fields.numberField('coverage-amount','Quantidade da cobertura · 0–1',c.amount,{min:0,max:1,step:.05})}${fields.numberField('coverage-relief','Relevo da cobertura · m',c.relief,{min:0,max:.2,step:.005})}${distributionPanel('coverage-',c,fields,false)}${c.texture==='snow'?`${fields.numberField('coverage-physicalThickness','Espessura física da neve · m',c.physicalThickness??0,{min:0,max:1.5,step:.05})}<label class="check"><input type="checkbox" data-field="coverage-exposedOnly" ${c.exposedOnly!==false?'checked':''}/><span>Acumular somente onde há céu aberto</span></label>${record?.kind==='terrain'?'<button data-action="snow-exposure" class="wide">Recalcular exposição do terreno</button>':''}<p class="microcopy">Zero mantém apenas a cobertura visual. Com espessura, terreno e faces superiores ganham volume. O terreno acompanha seus apoios. ${record?.kind==='terrain'?'Recalcule a exposição depois de mover telhados.':'O objeto verifica o céu automaticamente ao alterar a cena.'}</p>`:''}`:''}
    <p class="microcopy">Adiciona neve, grama ou outra superfície sobre o material original. A espessura física está disponível para neve; outras coberturas alteram apenas o acabamento. Em modelos, respeita o material selecionado acima.</p></details>`;
}
export function materialPanel(record,slots,{numberField,colorField}) {
  const m=record.material;
  const hasRelief=(m.texture && m.texture!=='none') || record.kind==='terrain' && record.paintLayers?.some(layer=>layer.visible && layer.texture && layer.texture!=='none');
  let reliefControl=numberField('material-relief','Relevo aparente · microdetalhe em m',m.relief??.03,{min:0,max:.2,step:.005});
  if(!hasRelief) reliefControl=reliefControl.replace('<input','<input disabled');
  return `<section><span class="eyebrow">MATERIAL E TEXTURA</span>${textureSelect('material-texture',m.texture)}${record.kind==='prop'?`<label class="field"><span>Aplicar acabamento em</span><select data-field="material-textureSlot"><option value="base">Todos os materiais</option>${slots.filter(s=>s!=='base').map(s=>`<option value="${esc(s)}" ${m.textureSlot===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label>`:''}${m.texture && m.texture!=='none'?numberField('material-textureSize','Tamanho do padrão · m',m.textureSize??2,{min:.05,max:50,step:.1}):''}${textureCustomization('material-',m,{numberField,colorField})}${reliefControl}<p class="microcopy">${hasRelief?'Simula fissuras e veios na iluminação da textura; é mais visível perto e com luz lateral. Zero desliga esse detalhe. Não eleva a malha nem altera silhueta/apoio.':'Escolha uma textura no material ou numa camada visível para ativar o relevo aparente; cores lisas não têm mapa de detalhe.'}${record.kind==='terrain'?' Para mudar alturas reais, use Elevar, Nivelar ou Esculpir rocha natural. Camadas opacas cobrem a textura base; edite o material da camada para mudar o desenho visível.':''}</p>${coveragePanel(m,{numberField,colorField},record)}${colorField('material-color','Cor / matiz',m.color)}${numberField('material-roughness','Rugosidade',m.roughness,{min:0,max:1,step:.05})}${numberField('material-metalness','Metalicidade',m.metalness,{min:0,max:1,step:.05})}<p class="microcopy">Escolher uma textura aplica sua cor e acabamento iniciais. A cor da textura recolore o desenho; Cor / matiz multiplica o acabamento final. Selecionar outro material reinicia os ajustes da textura. Sem textura adicional restaura a aparência original de modelos importados.</p></section>`;
}
export function localEffectPanel(record,{numberField,colorField,checkField}) {
  const e=record.localEffect;
  return `<section><span class="eyebrow">FOGO E FUMAÇA</span><label class="field"><span>Efeito neste objeto</span><select data-field="effect-type">${[['none','Sem efeito'],['fire','Fogo'],['smoke','Fumaça']].map(([v,l])=>`<option value="${v}" ${(e?.enabled?e.type:'none')===v?'selected':''}>${l}</option>`).join('')}</select></label>${e?.enabled?`${checkField('effect-enabled','Efeito ligado',e.enabled)}${checkField('effect-hideModel','Ocultar modelo e mostrar só o efeito',e.hideModel)}<div class="axis-fields">${e.size.map((v,i)=>numberField(`effect-size-${i}`,['Largura · m','Altura · m','Profundidade · m'][i],v,{min:.1,max:20})).join('')}</div><div class="axis-fields">${e.offset.map((v,i)=>numberField(`effect-offset-${i}`,['X local','Y local','Z local'][i],v)).join('')}</div>${numberField('effect-count','Partículas',e.count,{min:1,max:512,step:1})}${numberField('effect-speed','Velocidade',e.speed,{min:0,max:10,step:.1})}${numberField('effect-opacity','Opacidade',e.opacity,{min:0,max:1,step:.05})}${colorField('effect-color','Cor',e.color)}${numberField('effect-seed','Variação · seed',e.seed,{min:0,max:4294967295,step:1})}${e.type==='fire'?numberField('effect-lightIntensity','Intensidade da luz do fogo',e.lightIntensity,{min:0,max:500,step:1}):''}`:''}<p class="microcopy">O efeito acompanha este objeto. Pausa e qualidade ficam na aba Cena; não há colisão de fumaça com paredes ou tetos.</p></section>`;
}
