import {box as b,cylinder as c,ellipsoid as e,ring as r,turned as t,curve,profile as p,frame} from './library-craft-parts.js';

export function craftSpecial(id,recipe,[w,h,d]) {
  if(id==='blood-pool') {
    const contour=Array.from({length:40},(_,i)=>{const a=i*Math.PI/20,k=.7+.1*Math.sin(a*3)+.08*Math.cos(a*7);return [Math.cos(a)*w*.48*k,Math.sin(a)*d*.48*k];});
    return {parts:[p(contour,.005,[0,.0025,0],'red',[Math.PI/2,0,0]),p(contour.map(([x,z])=>[x*.73,z*.78]),.005,[0,.004,0],'rust',[Math.PI/2,0,0]),...Array.from({length:5},(_,i)=>c(.012+i*.004,.005,[(i-2)*w*.12,.0025,d*.43+(i%2)*d*.04],'red'))],method:'contorno orgânico de líquido com borda irregular e gotas separadas'};
  }
  if(id==='rock'||id==='broken-wall') {
    const parts=[];
    for(let i=0;i<(id==='rock'?4:11);i++) {
      const x=id==='rock'?Math.sin(i*2.4)*w*.27:(i%4-1.5)*w*.24,y=id==='rock'?0:Math.floor(i/4)*h*.29;
      parts.push({shape:'rock',form:'fractured',size:[w*(id==='rock'?.48:.255),h*(id==='rock'?.7-i*.1:.32),d*(.65+(i%2)*.15)],position:[x,y,Math.cos(i*2.4)*d*.15],seed:182+i*11,detail:4,irregularity:.8,material:'stone'});
    }
    return {parts,method:'pedras fraturadas com volume irregular e encaixe de alvenaria'};
  }
  if(id==='tent') {
    const parts=[b([w,.016,d],[0,.008,0],'dark')];
    // Two sloping solid canvas panels, a real entrance, ridge pole and guy lines.
    for(const s of [-1,1]) {
      parts.push(p([[0,h],[s*w*.5,.04],[s*w*.49,.02],[0,h-.025]],d,[0,0,0],'cloth'));
      parts.push(p([[0,h],[-w*.5,.035],[-w*.15,.035],[-w*.08,h*.7],[0,h*.82],[w*.08,h*.7],[w*.15,.035],[w*.5,.035]],.012,[0,0,s*d*.485],'cloth'));
      parts.push(c(.012,h,[0,h/2,s*d*.475],'metal'),curve([[s*w*.08,h*.96,s*d*.48],[s*w*.38,h*.45,s*d*.51],[s*w*.5,.04,s*d*.56]],.005,'paper'));
      for(const z of [-.45,.45])parts.push(c(.01,.11,[s*w*.49,.055,z*d],'metal',.01,[0,0,s*.2]));
    }
    return {parts,method:'barraca com cobertura inclinada, entrada aberta, estrutura e estais'};
  }
  if(id==='rowboat') {
    const parts=[],rows=6;
    // Clinker hull: open at the top, curved keel and overlapping solid strakes.
    for(const s of [-1,1])for(let j=0;j<rows;j++) {
      const t0=j/rows,t1=(j+1)/rows,outline=[];
      for(let i=0;i<=12;i++){const q=i/12,z=(q-.5)*d,x=s*w*.49*Math.sin(Math.PI*q)**.65*(.32+t1*.68);outline.push([x,z]);}
      for(let i=12;i>=0;i--){const q=i/12,z=(q-.5)*d,x=s*w*.49*Math.sin(Math.PI*q)**.65*(.32+t0*.68);outline.push([x,z]);}
      // Prevent coincident bow/stern vertices while preserving the pointed hull.
      outline[0][0]+=s*.003;outline[12][0]+=s*.003;
      parts.push(p(outline,.035,[0,h*(.15+t0*.7),0],'wood',[Math.PI/2,0,0]));
    }
    parts.push(b([w*.25,.035,d*.84],[0,.035,0],'wood'));
    for(const z of [-.27,0,.27])parts.push(b([w*(.82-Math.abs(z)*.65),.045,d*.085],[0,h*.69,z*d],'wood'));
    for(const s of [-1,1])parts.push(curve([[0,h*.9,-d*.5],[s*w*.41,h*.89,-d*.25],[s*w*.49,h*.85,0],[s*w*.41,h*.89,d*.25],[0,h*.9,d*.5]],.018,'wood'));
    return {parts,method:'barco com casco aberto de tábuas curvas, quilha, bordas e bancos'};
  }
  if(id==='wheelchair'||id==='motorcycle') {
    const chair=id==='wheelchair',parts=[],wheel=(x,y,z,radius,thickness)=>{
      parts.push(r(radius*.9,radius*.1,[x,y,z],'black',[0,Math.PI/2,0]),r(radius*.77,radius*.022,[x,y,z],'metal',[0,Math.PI/2,0]),c(radius*.14,thickness,[x,y,z],'metal',radius*.14,[0,0,Math.PI/2]));
      for(let i=0;i<12;i++){const a=i*Math.PI/6;parts.push(curve([[x,y,z],[x,y+Math.cos(a)*radius*.76,z+Math.sin(a)*radius*.76]],.005,'metal'));}
    };
    if(chair) {
      for(const s of [-1,1]) {
        wheel(s*w*.44,h*.31,-d*.17,h*.31,.045);wheel(s*w*.31,h*.065,d*.34,h*.065,.025);
        parts.push(curve([[s*w*.34,h*.14,d*.36],[s*w*.34,h*.43,d*.18],[s*w*.34,h*.48,-d*.23],[s*w*.34,h*.94,-d*.28],[s*w*.34,h*.98,-d*.38]],.017,'metal'),b([.055,.05,d*.48],[s*w*.36,h*.66,.025],'black'),b([w*.27,.025,d*.19],[s*w*.17,h*.14,d*.43],'dark'));
      }
      parts.push(b([w*.62,.035,d*.48],[0,h*.48,d*.015],'cloth',null,.01),b([w*.62,h*.43,.04],[0,h*.73,-d*.25],'cloth',[-.08,0,0]));
    } else {
      wheel(0,h*.29,-d*.34,h*.29,w*.2);wheel(0,h*.29,d*.35,h*.29,w*.2);
      parts.push(e([w*.7,h*.28,d*.28],[0,h*.66,d*.08],'red'),b([w*.55,.075,d*.32],[0,h*.69,-d*.2],'black',null,.025),b([w*.48,h*.28,d*.24],[0,h*.39,-d*.03],'metal',null,.018));
      for(const s of [-1,1])parts.push(curve([[s*w*.12,h*.29,d*.35],[s*w*.12,h*.76,d*.24],[s*w*.3,h*.92,d*.24]],.016,'metal'),curve([[s*w*.13,h*.27,-d*.34],[s*w*.23,h*.53,-d*.05],[s*w*.14,h*.66,d*.22]],.016,'dark'),curve([[s*w*.22,h*.38,0],[s*w*.27,h*.23,-d*.15],[s*w*.27,h*.25,-d*.41]],.025,'metal'));
      parts.push(c(w*.15,.035,[0,h*.79,d*.28],'white',w*.15,[Math.PI/2,0,0]));
      for(let i=0;i<6;i++)parts.push(b([w*.52,.009,d*.2],[0,h*.33+i*.025,-d*.03],'dark'));
    }
    return {parts,method:'estrutura tubular reconstruída com pneus, aros e raios vazados'};
  }
  if(id==='body-bag')return {parts:[e([w,h,d],[0,h/2,0],'black'),e([w*.61,h*.87,d*.18],[0,h*.47,-d*.34],'black'),curve([[0,h*.91,-d*.39],[0,h*.995,-d*.2],[0,h*.995,d*.15],[0,h*.87,d*.4]],.005,'metal'),...[-1,1].flatMap(s=>[-.3,0,.3].map(z=>curve([[s*w*.42,h*.4,z*d-.04],[s*w*.55,h*.32,z*d],[s*w*.42,h*.4,z*d+.04]],.009,'black')))],method:'saco com volume orgânico fechado, zíper contínuo e alças'};
  if(id==='ritual-mask') {
    const parts=[p([[-w*.35,-d*.3],[-w*.46,0],[-w*.32,d*.4],[0,d*.5],[w*.32,d*.4],[w*.46,0],[w*.35,-d*.3],[0,-d*.5]],h*.48,[0,h*.4,0],'wood',[Math.PI/2,0,0])];
    for(const s of [-1,1])parts.push(e([w*.22,h*.11,d*.12],[s*w*.21,h*.68,d*.02],'black'),p([[0,0],[s*w*.2,d*.12],[s*w*.29,d*.1]],h*.2,[s*w*.08,h*.68,d*.02],'wood',[Math.PI/2,0,0]));
    parts.push(p([[-w*.07,0],[0,d*.18],[w*.07,0]],h*.35,[0,h*.72,-d*.06],'wood',[Math.PI/2,0,0]),b([w*.26,h*.04,d*.024],[0,h*.665,-d*.25],'dark'));
    return {parts,method:'máscara deitada com contorno facial, sobrancelhas, nariz e aberturas escuras'};
  }
  return null;
}
