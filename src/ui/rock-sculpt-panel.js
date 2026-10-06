import {isSculptableRock,ROCK_SCULPT_LIMIT} from '../domain/rock-sculpt.js';

export function rockSculptPanel(record,brush,active,{numberField,presetsPanel=''}) {
  if(!isSculptableRock(record))return '';
  const count=record.rockSculpt?.stamps.length??0;
  return `<section class="terrain-controls"><span class="eyebrow">PINCEL DE SUPERFÍCIE · T</span>
    ${presetsPanel}
    <button data-action="${active?'terrain-stop':'rock-sculpt'}" class="wide primary">${active?'Concluir escultura · Q / T':'Esculpir esta superfície · T'}</button>
    <label class="field"><span>Ferramenta</span><select data-field="brush-mode">${[['raise','Elevar ponto · altura'],['lower','Rebaixar ponto · altura'],['push','Projetar face · para fora'],['pull','Recuar face · para dentro'],['smooth','Suavizar'],['flatten','Aplainar na face clicada']].map(([value,label])=>`<option value="${value}" ${value===brush.mode?'selected':''}>${label}</option>`).join('')}</select></label>
    <div class="field-grid">${numberField('brush-radius','Raio · m',brush.radius,{min:.1,max:100,step:.1})}${numberField('brush-strength',['smooth','flatten'].includes(brush.mode)?'Intensidade · 0–1':'Força · m',brush.strength,{min:.01,max:['smooth','flatten'].includes(brush.mode)?1:10,step:.05})}</div>
    <label class="field"><span>Dureza das bordas</span><input type="range" data-field="brush-hardness" min="0" max="1" step=".05" value="${brush.hardness??0}" aria-label="Dureza das bordas"/></label>
    <p class="microcopy">Arraste onde quer mudar a forma: topo, lateral ou saliência. O círculo acompanha a face. Elevar/Rebaixar atua na altura; Projetar/Recuar segue a face. Um traço = um desfazer; Esc cancela, [ / ] muda o raio. T permite continuar também no terreno.</p>
    <p class="microcopy">${count} / ${ROCK_SCULPT_LIMIT} amostras. A malha ganha detalhe ao esculpir; pincéis maiores ajudam em peças grandes. A escultura é local e mantém posição/material; os parâmetros abaixo continuam disponíveis.</p>
    <button data-action="rock-sculpt-clear" class="wide" ${count?'':'disabled'}>Limpar escultura manual</button>
  </section>`;
}
