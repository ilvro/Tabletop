import {box as b,cylinder as c,ellipsoid as e,ring as r,turned as t,curve,profile as p,frame} from './library-craft-parts.js';

// Darker weathered stone in the `dark` slot of rock piles, with the same mineral texture as `stone`.
const PI=Math.PI;
const darkStone={texture:'rock',textureSize:1.4,relief:.006,rockPattern:'granite',rockCracks:.08,textureColor:'#55534d',textureColorMode:'replace'};

export function craftSpecial(id,recipe,[w,h,d]) {
  if(id==='blood-pool') {
    const contour=Array.from({length:40},(_,i)=>{const a=i*Math.PI/20,k=.7+.1*Math.sin(a*3)+.08*Math.cos(a*7);return [Math.cos(a)*w*.48*k,Math.sin(a)*d*.48*k];});
    return {parts:[p(contour,.005,[0,.0025,0],'red',[Math.PI/2,0,0]),p(contour.map(([x,z])=>[x*.73,z*.78]),.005,[0,.004,0],'rust',[Math.PI/2,0,0]),...Array.from({length:5},(_,i)=>c(.012+i*.004,.005,[(i-2)*w*.12,.0025,d*.43+(i%2)*d*.04],'red'))],method:'contorno orgânico de líquido com borda irregular e gotas separadas'};
  }
  if(id==='rock') {
    const stone=(size,position,seed,material='stone',yaw=0)=>({shape:'rock',form:'fractured',size,position,seed,detail:4,irregularity:.75,material,rotation:[0,yaw,0],...(material==='dark'?{surface:darkStone}:{})});
    // A dominant boulder, a leaning companion and smaller stones, with darker weathered pebbles.
    const parts=[stone([w*.5,h,d*.6],[-w*.15,0,-d*.08],182,'stone',.4),stone([w*.34,h*.66,d*.48],[w*.24,0,d*.02],193,'stone',-.6),
      stone([w*.28,h*.36,d*.32],[-w*.02,0,d*.3],204,'stone',1.1),stone([w*.16,h*.26,d*.2],[w*.4,0,-d*.3],215,'stone',.3),stone([w*.14,h*.2,d*.16],[-w*.41,0,d*.3],226,'stone',2)];
    for(const [i,[x,z,r]] of [[.14,.4,.07],[-.3,-.38,.06],[.35,.32,.05],[-.06,-.42,.045]].entries())parts.push(stone([w*r,h*r*1.1,d*r*1.3],[x*w,0,z*d],237+i*11,'dark',i));
    return {parts,method:'afloramento com blocos fraturados de alturas diferentes e cascalho escuro'};
  }
  if(id==='broken-wall') {
    const block=(size,position,seed,material='stone',rotation)=>({shape:'rock',form:'cliff',terraces:1,overhang:.08,erosion:.4,irregularity:.5,detail:2,fixedRock:true,size,position,seed,material,...(rotation?{rotation}:{}),...(material==='dark'?{surface:darkStone}:{})});
    const parts=[],z=-d*.2,course=.255;
    // Dry-stone courses that step down to the right where the wall gave way.
    for(const [row,xs] of [[-.79,-.46,-.13,.2,.53],[-.8,-.47,-.14,.18],[-.79,-.47]].entries())
      for(const [i,x] of xs.entries())parts.push(block([.31+(i%2)*.02,.24,.36],[x,row*course,z+Math.sin(row*5+i*3)*.015],301+row*13+i));
    parts.push(block([.26,.2,.3],[-.17,2*course,z-.02],344,'stone',[0,.15,-.22]));
    // Fallen stones in front of the gap.
    parts.push(block([.3,.22,.3],[.78,0,.04],351,'stone',[0,.5,0]),block([.28,.2,.26],[.36,0,.24],362,'stone',[.18,.9,.08]),block([.24,.17,.22],[-.2,0,.27],373,'dark',[0,-.4,.1]));
    for(const [i,[x,zz,s]] of [[.62,.3,.13],[.05,.33,.1],[.9,-.2,.11],[-.55,.3,.09]].entries())parts.push({shape:'rock',form:'fractured',size:[s,s*.7,s*1.1],position:[x,0,zz],seed:381+i*7,detail:3,irregularity:.8,material:i%2?'dark':'stone',...(i%2?{surface:darkStone}:{})});
    return {parts,method:'mureta de pedra seca em fiadas, desmoronada para um lado, com blocos caídos e cascalho'};
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
    // Carved face lying on its back: forehead towards -Z, chin towards +Z, the face looking up.
    const parts=[e([w*.84,h*.7,d*.96],[0,h*.35,0],'wood'),e([w*.1,h*.36,d*.28],[0,h*.64,d*.03],'wood'),e([w*.24,h*.14,d*.06],[0,h*.64,d*.25],'black'),
      p([[0,-d*.05],[w*.04,0],[0,d*.05],[-w*.04,0]],h*.12,[0,h*.66,-d*.32],'paper',[PI/2,0,0])];
    for(const s of [-1,1])parts.push(e([w*.22,h*.3,d*.12],[s*w*.19,h*.58,-d*.1],'black',[0,s*.3,0]),e([w*.3,h*.26,d*.08],[s*w*.18,h*.7,-d*.2],'wood',[0,s*.28,0]),
      e([w*.04,h*.1,d*.24],[s*w*.2,h*.66,d*.08],'red'),e([w*.04,h*.1,d*.18],[s*w*.3,h*.62,d*.05],'red'),curve([[s*w*.4,h*.3,-d*.06],[s*w*.48,h*.14,d*.05],[s*w*.44,h*.05,d*.2]],.005,'dark'));
    return {parts,method:'máscara entalhada deitada: rosto abaulado, sobrancelhas, nariz, olhos e boca vazados, pintura ritual e amarras'};
  }
  return null;
}
