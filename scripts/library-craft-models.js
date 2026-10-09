import {box as b,cylinder as c,ellipsoid as e,ring as r,turned as t,curve,profile as p,cushion,frame,spindle} from './library-craft-parts.js';
import {craftFurniture} from './library-craft-furniture.js';
import {craftSpecial} from './library-craft-specials.js';
import {craftHome} from './library-atelier-home.js';
import {craftTech} from './library-atelier-tech.js';
import {craftIndustrial} from './library-atelier-industrial.js';
import {craftOccult} from './library-atelier-occult.js';
import {craftHouse} from './library-atelier-house.js';

// Dedicated replacements for silhouettes that cannot be repaired by detailing a
// primitive. Remaining kits are rebuilt component-by-component in construction.
export function craftModel(id,recipe,size) {
  for(const atelier of [craftHome,craftTech,craftIndustrial,craftOccult,craftHouse]){const model=atelier(id,recipe,size);if(model)return model;}
  const furniture=craftFurniture(id,recipe,size);if(furniture)return furniture;
  const special=craftSpecial(id,recipe,size);if(special)return special;
  const [w,h,d]=size;
  if(['tree','pine','dead-tree','bushes','stump'].includes(id)) {
    const parts=[],branch=(points,radius,tipRadius=.006)=>({shape:'branch',points,radius,tipRadius,segments:14,sides:8,seed:713+parts.length,forks:0,material:'wood',position:[0,0,0]});
    if(id==='stump') {
      parts.push(t([[0,0],[w*.28,0],[w*.33,h*.12],[w*.25,h*.33],[w*.22,h],[0,h]],[0,0,0],'wood'),c(w*.205,.007,[0,h-.002,0],'paper'));
      for(let i=1;i<6;i++)parts.push(r(w*.032*i,.003,[0,h+.002,0],'wood',[Math.PI/2,0,0]));
      for(let i=0;i<6;i++){let a=i*Math.PI/3;parts.push(branch([[Math.cos(a)*w*.45,0,Math.sin(a)*d*.45],[Math.cos(a)*w*.22,h*.12,Math.sin(a)*d*.22],[0,h*.35,0]],.04,.015));}
    } else {
      parts.push(branch([[0,0,0],[-w*.03,h*.3,0],[w*.04,h*.63,d*.02],[0,h*.97,0]],Math.min(.23,w*.1),.018));
      const n=id==='pine'?24:id==='dead-tree'?10:16;
      for(let i=0;i<n;i++) {
        const a=i*2.399,y=h*(.28+(i/n)*.6),reach=(id==='pine'?1-i/n*.67:.65+(i%3)*.16)*w*.45;
        const end=[Math.cos(a)*reach,y+h*.07,Math.sin(a)*reach*d/w];
        parts.push(branch([[0,y,0],[end[0]*.5,y+h*.06,end[2]*.5],end],Math.min(.06,w*.018),.006));
        if(id!=='dead-tree')parts.push({shape:id==='pine'?'conifer':'foliage',style:'broadleaf',size:id==='pine'?[w*.66,h*.2,d*.32]:[w*.48,h*.38,d*.46],position:[end[0]*.85,end[1]-h*.07,end[2]*.85],rotation:[0,a,0],count:id==='pine'?38:100,seed:821+i,material:'green'});
        else for(const s of [-1,1])parts.push(branch([[end[0]*.55,y+h*.05,end[2]*.55],[end[0]*.82,y+h*.16,end[2]*.82],[end[0]*(1+s*.12),y+h*.24,end[2]+s*d*.08]],.021,.004));
      }
      for(let i=0;i<5;i++){let a=i*Math.PI*2/5;parts.push(branch([[Math.cos(a)*w*.18,0,Math.sin(a)*d*.18],[Math.cos(a)*w*.08,h*.035,Math.sin(a)*d*.08],[0,h*.14,0]],Math.min(.08,w*.035),.018));}
    }
    return {parts,method:'botânica reconstruída: raízes, bifurcações e folhas/agulhas individuais'};
  }
  if(['crt-tv','radio','computer','typewriter','laptop'].includes(id)) {
    const parts=[],screen=(sw,sh,x,y,z)=>{parts.push(b([sw+.025,sh+.025,.022],[x,y,z],'black',null,.009),b([sw,sh,.025],[x,y,z+.009],'screen',null,.012));};
    if(id==='crt-tv') {
      parts.push(b([w*.95,h*.63,d*.9],[0,h*.34,0],'dark',null,.045),b([w*.93,h*.6,.035],[0,h*.35,d*.45],'wood',null,.015));
      screen(w*.7,h*.46,-w*.065,h*.36,d*.49);
      for(let i=0;i<9;i++)parts.push(b([w*.1,.009,.012],[w*.392,h*(.17+i*.024),d*.481],'black'));
      for(const y of [.48,.6])parts.push(c(w*.035,.027,[w*.386,h*y,d*.49],'metal',w*.035,[Math.PI/2,0,0]));
      for(const s of [-1,1])parts.push(c(.005,h*.47,[s*w*.12,h*.84,-d*.03],'metal',.005,[0,0,s*.47]));
    } else if(id==='radio') {
      parts.push(b([w*.95,h*.5,d*.9],[0,h*.25,0],'wood',null,.025));
      screen(w*.28,h*.055,w*.26,h*.37,d*.47);
      for(let i=0;i<16;i++)parts.push(b([.006,h*.33,.009],[-w*.39+i*w*.035,h*.25,d*.47],'black'));
      for(const x of [.16,.35])parts.push(c(w*.04,.025,[x*w,h*.15,d*.48],'metal',w*.04,[Math.PI/2,0,0]));
      parts.push(c(.005,h*.53,[-w*.34,h*.745,-d*.2],'metal'),curve([[-w*.22,h*.51,0],[-w*.22,h*.6,0],[w*.22,h*.6,0],[w*.22,h*.51,0]],.012,'dark'));
    } else if(id==='typewriter') {
      parts.push(b([w,.06,d],[0,.035,0],'black',null,.02),b([w*.9,h*.34,d*.45],[0,h*.24,-d*.2],'dark',null,.02),c(h*.11,w*.84,[0,h*.58,-d*.28],'black',h*.11,[0,0,Math.PI/2]),b([w*.6,h*.45,.008],[0,h*.77,-d*.34],'paper',[.12,0,0]));
      for(let row=0;row<4;row++)for(let col=0;col<10;col++)parts.push(c(w*.023,.012,[(col-4.5)*w*.08,h*(.15+row*.035),d*(.38-row*.11)],'paper'));
      parts.push(b([w*.44,.013,.025],[0,h*.1,d*.46],'dark'));
    } else {
      const laptop=id==='laptop';
      parts.push(b([w*.91,h*.61,.03],[0,h*.695,-d*.27],'dark',null,.012));screen(w*.85,h*.51,0,h*.695,-d*.245);
      if(!laptop)parts.push(c(w*.027,h*.29,[0,h*.25,-d*.27],'metal'),b([w*.46,.025,d*.44],[0,.014,-d*.27],'dark',null,.008));
      parts.push(b([w*.91,.027,d*.41],[0,.02,d*.21],'dark',null,.007));
      for(let row=0;row<4;row++)for(let col=0;col<12;col++)parts.push(b([w*.055,.007,d*.052],[(col-5.5)*w*.068,.038,d*(.33-row*.073)],'white',null,.002));
      parts.push(b([w*.3,.007,d*.034],[0,.038,d*.41],'black'));
    }
    return {parts,method:'equipamento refeito com molduras, grelhas, controles e teclas individuais'};
  }
  if(id==='candles') {
    const parts=[];
    for(let i=0;i<5;i++) {
      const a=i*2.399,x=Math.cos(a)*w*.28,z=Math.sin(a)*d*.27,cy=h*(.48+i*.075),radius=w*.09;
      parts.push(t([[0,0],[radius*1.15,0],[radius*1.23,.007],[radius,.017],[radius,cy-.015],[radius*.91,cy],[radius*.68,cy-.009],[0,cy-.01]],[x,0,z],'wax'),c(.003,.027,[x,cy+.003,z],'black'),e([radius*.55,h*.1,radius*.5],[x,cy+h*.05,z],'flame'));
      for(let j=0;j<3;j++){const angle=j*2.2+i;parts.push(e([radius*.3,h*(.04+j*.023),radius*.3],[x+Math.cos(angle)*radius*.98,cy-h*(.035+j*.016),z+Math.sin(angle)*radius*.98],'wax'));}
    }
    return {parts,method:'velas torneadas com borda derretida, gotas de cera e pavios'};
  }
  if (['desk','dining-table','bench','coffee-table','church-banquet-table'].includes(id)) {
    const height=recipe.supportHeight??h,top=Math.min(.085,height*.16),parts=[];
    const boards=Math.max(3,Math.round(d/.44)*2+1);
    for(let i=0;i<boards;i++)parts.push(b([w,top,d/boards-.003],[0,height-top/2,-d/2+(i+.5)*d/boards],'wood',null,.008));
    parts.push(...[-1,1].flatMap(s=>[b([w-.13,.12,.035],[0,height-top-.06,s*(d/2-.06)],'wood'),b([.035,.12,d-.12],[s*(w/2-.06),height-top-.06,0],'wood')]));
    for(const x of [-1,1])for(const z of [-1,1]) {
      parts.push(spindle(height-top,.046,[x*(w/2-.085),0,z*(d/2-.085)]));
      parts.push(c(.009,.006,[x*(w/2-.085),height-top-.05,z*(d/2-.036)],'brass',.009,[Math.PI/2,0,0]));
    }
    if(id==='bench'||id==='church-banquet-table')parts.push(b([w-.2,.065,.055],[0,height*.3,0],'wood'),...[-1,1].map(s=>b([.06,.065,d-.18],[s*(w/2-.085),height*.3,0],'wood')));
    if(id==='desk') {
      const dw=w*.3;parts.push(b([dw,.22,d*.7],[w*.28,height-.22,0],'wood'),b([dw-.022,.19,.025],[w*.28,height-.22,d*.35+.013],'wood'));
      parts.push(...frame(dw-.065,.15,.008,[w*.28,height-.22,d*.35+.03],'dark',.012),curve([[w*.28-.07,height-.2,d*.35+.04],[w*.28-.07,height-.22,d*.35+.06],[w*.28+.07,height-.22,d*.35+.06],[w*.28+.07,height-.2,d*.35+.04]],.009,'metal'));
    }
    return {parts,method:'marcenaria: tábuas, saia, pernas torneadas e ferragens'};
  }
  if(id==='chair'||id==='church-pointed-chair') {
    const tall=id!=='chair',seat=tall?h*.29:h*.51,wood=id==='chair'?'frame':'wood',fabric=id==='chair'?'fabric':'red',parts=[];
    for(const x of [-1,1])for(const z of [-1,1])parts.push(spindle(seat-.045,.032,[x*w*.4,0,z*d*.39],wood));
    parts.push(b([w*.96,.06,d*.95],[0,seat-.03,0],wood),cushion([w*.85,.065,d*.81],[0,seat+.025,d*.025],fabric));
    parts.push(...[-1,1].flatMap(s=>[b([.045,h-seat,.048],[s*w*.39,(h+seat)/2,-d*.4],wood),b([.035,.035,d*.8],[s*w*.4,seat*.4,0],wood)]));
    if(tall)parts.push(p([[-w*.37,0],[-w*.37,h*.36],[0,h*.63],[w*.37,h*.36],[w*.37,0],[w*.28,0],[w*.28,h*.33],[0,h*.51],[-w*.28,h*.33],[-w*.28,0]],.035,[0,seat,-d*.4],wood));
    else parts.push(cushion([w*.66,h*.21,.055],[0,h*.83,-d*.4],fabric),...frame(w*.75,h*.27,.035,[0,h*.83,-d*.41],wood,.02));
    for(const x of [-.3,0,.3])parts.push(b([.022,h*.19,.022],[x*w,seat+h*.12,-d*.4],wood));
    return {parts,method:'assento montado, travessas, torneados e encosto vazado'};
  }
  if(['sofa','armchair','restaurant-booth'].includes(id)) {
    const parts=[b([w*.95,h*.17,d*.9],[0,h*.19,0],'wood')],n=id==='sofa'?3:id==='restaurant-booth'?2:1;
    for(const x of [-1,1])for(const z of [-1,1])parts.push(spindle(h*.16,.045,[x*w*.4,0,z*d*.36],'wood'));
    for(let i=0;i<n;i++) {
      const x=-w*.38+(i+.5)*w*.76/n;
      parts.push(cushion([w*.76/n-.012,h*.22,d*.7],[x,h*.4,d*.085],'cloth'),cushion([w*.77/n-.014,h*.5,d*.2],[x,h*.72,-d*.34],'cloth',[-.12,0,0]));
      parts.push(curve([[x-w*.34/n,h*.44,-d*.23],[x-w*.34/n,h*.44,d*.35],[x+w*.34/n,h*.44,d*.35],[x+w*.34/n,h*.44,-d*.23]],.006,'dark'));
    }
    for(const s of [-1,1])parts.push(cushion([w*.13,h*.45,d*.95],[s*w*.435,h*.44,0],'cloth'),r(.014,.003,[s*w*.435,h*.43,d*.478],'brass'));
    return {parts,method:'estofamento separado: almofadas, vivos, braços curvos e pés'};
  }
  if(id==='cabinet') {
    const parts=[b([w,h,d*.9],[0,h/2,-d*.05],'shell',null,.016)];
    for(let i=0;i<4;i++) {
      const y=h*(.16+i*.235);parts.push(b([w*.94,h*.215,.024],[0,y,d*.43],'drawer',null,.006));
      parts.push(...frame(w*.25,.048,.009,[0,y-.035,d*.448],'detail',.009),b([w*.21,.027,.008],[0,y-.035,d*.449],'paper'));
      parts.push(curve([[-w*.12,y+.063,d*.44],[-w*.12,y+.043,d*.49],[w*.12,y+.043,d*.49],[w*.12,y+.063,d*.44]],.01,'detail'));
    }
    parts.push(c(.011,.008,[w*.36,h*.95,d*.46],'detail',.011,[Math.PI/2,0,0]));
    return {parts,method:'arquivo com gavetas separadas, puxadores e porta-etiquetas'};
  }
  if(id==='telephone') {
    const parts=[b([.32,.072,.26],[0,.036,0],'black',null,.025),c(.087,.013,[0,.082,.04],'metal'),c(.067,.015,[0,.087,.04],'black'),c(.035,.018,[0,.089,.04],'paper')];
    for(let i=0;i<10;i++){const a=i*Math.PI*2/11+.3;parts.push(c(.013,.008,[Math.sin(a)*.062,.097,.04+Math.cos(a)*.062],'paper'),c(.009,.01,[Math.sin(a)*.062,.101,.04+Math.cos(a)*.062],'black'));}
    parts.push(curve([[-.14,.14,-.075],[-.09,.185,-.075],[.09,.185,-.075],[.14,.14,-.075]],.027,'black'),...[-1,1].map(s=>e([.09,.072,.09],[s*.14,.135,-.075],'black')));
    const points=Array.from({length:16},(_,i)=>[.15+Math.sin(i*2.6)*.022,.07+i*.003,.09-i*.014]);parts.push(curve(points,.006,'black'));
    return {parts,method:'telefone com disco perfurado, monofone curvo e fio enrolado'};
  }
  if(id==='coffin'||id==='stone-sarcophagus') {
    const m=id==='coffin'?'wood':'stone',outline=[[-w*.32,-d*.5],[-w*.5,-d*.27],[-w*.42,d*.36],[-w*.27,d*.5],[w*.27,d*.5],[w*.42,d*.36],[w*.5,-d*.27],[w*.32,-d*.5]],parts=[];
    parts.push(p(outline,h*.8,[0,h*.4,0],m,[Math.PI/2,0,0]),p(outline.map(([x,z])=>[x*.98,z*.98]),h*.12,[0,h*.9,0],m,[Math.PI/2,0,0]));
    for(const s of [-1,1])for(const z of [-.22,.18,.34])parts.push(curve([[s*w*.41,h*.5,z*d-.045],[s*w*.48,h*.43,z*d-.045],[s*w*.48,h*.43,z*d+.045],[s*w*.41,h*.5,z*d+.045]],.012,'brass'));
    parts.push(b([.035,.008,d*.36],[0,h*.966,-d*.06],'brass'),b([w*.3,.008,.035],[0,h*.966,-d*.13],'brass'));
    return {parts,method:'silhueta funerária octogonal, tampa separada e alças'};
  }
  if(id==='bathtub'||id==='sink'||id==='toilet') {
    if(id==='toilet')return {parts:[t([[0,0],[.16,0],[.18,.04],[.12,.12],[.12,.23],[.22,.32],[.25,.39],[.25,.43],[.21,.44],[.20,.4],[.16,.30],[.06,.25],[0,.25]],[0,0,.1],'white'),b([.38,.55,.15],[0,.46,-.21],'white',null,.025),b([.4,.04,.17],[0,.755,-.21],'white',null,.012),r(.227,.022,[0,.441,.1],'white',[Math.PI/2,0,0]),c(.016,.012,[.12,.65,-.125],'metal',.016,[Math.PI/2,0,0])],method:'louça sanitária com cuba oca, assento e reservatório'};
    const parts=[],bw=id==='sink'?w*.48:w*.9,bd=id==='sink'?d*.65:d*.9,top=recipe.supportHeight??h*.8,base=id==='sink'?top-.14:h*.15,depth=id==='sink'?.14:h*.57;
    if(id==='sink') {
      parts.push(b([w*.95,top-.035,d*.9],[0,(top-.035)/2,0],'wood'),...[-1,1].flatMap(s=>frame(w*.43,top*.77,.025,[s*w*.24,top*.49,d*.46],'wood',.03)));
      for(const s of [-1,1])parts.push(b([(w-bw)/2,.035,d],[s*(w+bw)/4,top-.0175,0],'stone'),b([bw,.035,(d-bd)/2],[0,top-.0175,s*(d+bd)/4],'stone'));
    }
    else for(const x of [-1,1])for(const z of [-1,1])parts.push(spindle(base,.045,[x*bw*.35,0,z*bd*.35],'metal'));
    parts.push(b([bw,.04,bd],[0,base,0],'white',null,.014));
    parts.push(...[-1,1].flatMap(s=>[b([.07,depth,bd],[s*(bw/2-.025),base+depth/2,0],'white',null,.03),b([bw,depth,.07],[0,base+depth/2,s*(bd/2-.025)],'white',null,.03)]));
    parts.push(c(.026,.006,[0,base+.024,0],'metal'),curve([[bw*.3,base+depth,-bd*.39],[bw*.3,h*.96,-bd*.39],[bw*.3,h*.99,-bd*.18],[bw*.3,h*.88,-bd*.15]],.016,'metal'));
    return {parts,method:'cuba realmente aberta, bordas arredondadas, dreno e torneira curva'};
  }
  if(['bell','kerosene-lantern','lamp','barrel'].includes(id)) {
    if(id==='bell')return {parts:[t([[0,h],[w*.08,h],[w*.08,h*.83],[w*.22,h*.77],[w*.27,h*.55],[w*.34,h*.25],[w*.49,h*.11],[w*.5,h*.05],[w*.46,0],[w*.43,h*.04],[w*.3,h*.2],[w*.22,h*.53],[w*.17,h*.66],[0,h*.68]],[0,0,0],'brass'),c(.015,h*.48,[0,h*.41,0],'dark'),e([w*.17,h*.15,w*.17],[0,h*.14,0],'metal')],method:'sino torneado oco com lábio e badalo interno'};
    if(id==='barrel')return {parts:[t([[0,0],[w*.46,0],[w*.48,h*.025],[w*.47,h*.12],[w*.5,h*.15],[w*.5,h*.18],[w*.47,h*.21],[w*.47,h*.77],[w*.5,h*.80],[w*.5,h*.83],[w*.47,h*.86],[w*.48,h*.98],[w*.45,h],[0,h]],[0,0,0],'rust'),r(w*.45,.01,[0,h*.99,0],'metal',[Math.PI/2,0,0]),c(.033,.012,[w*.22,h*.995,0],'metal'),c(.014,.014,[-w*.2,h*.995,0],'metal')],method:'tambor torneado com costuras de chapa, aros e tampões'};
    if(id==='lamp')return {parts:[t([[0,0],[w*.37,0],[w*.39,.025],[w*.32,.07],[w*.13,.09],[w*.07,.15],[w*.05,h*.78],[0,h*.78]],[0,0,0],'brass'),t([[w*.47,h*.78],[w*.5,h*.8],[w*.26,h*.98],[w*.24,h],[w*.22,h],[w*.24,h*.98],[w*.47,h*.8]],[0,0,0],'shade'),...Array.from({length:16},(_,i)=>{let a=i*Math.PI/8;return curve([[Math.cos(a)*w*.48,h*.795,Math.sin(a)*w*.48],[Math.cos(a)*w*.36,h*.9,Math.sin(a)*w*.36],[Math.cos(a)*w*.245,h*.995,Math.sin(a)*w*.245]],.005,'shade');}),e([.08,.11,.08],[0,h*.86,0],'shade')],method:'luminária torneada com cúpula oca, pregas e lâmpada interna'};
    return {parts:[t([[0,0],[w*.39,0],[w*.43,h*.07],[w*.36,h*.13],[w*.27,h*.17],[w*.23,h*.25],[0,h*.25]],[0,0,0],'metal'),t([[w*.23,h*.23],[w*.29,h*.35],[w*.25,h*.59],[w*.17,h*.68],[w*.16,h*.67],[w*.23,h*.58],[w*.27,h*.35],[w*.21,h*.24]],[0,0,0],'glass'),t([[0,h*.65],[w*.3,h*.65],[w*.33,h*.70],[w*.2,h*.75],[w*.14,h*.79],[0,h*.79]],[0,0,0],'metal'),curve([[-w*.32,h*.12,0],[-w*.46,h*.46,0],[-w*.32,h*.72,0],[0,h*.88,0],[w*.32,h*.72,0],[w*.46,h*.46,0],[w*.32,h*.12,0]],.014,'metal'),r(w*.2,.008,[0,h*.89,0],'metal'),e([w*.09,h*.15,w*.09],[0,h*.34,0],'flame')],method:'lampião com reservatório torneado, chaminé e armação curva'};
  }
  if(['sedan','police-car','delivery-van','ambulance'].includes(id)) {
    const van=id==='delivery-van'||id==='ambulance',paint=id==='police-car'?'black':id==='sedan'?'cloth':'white',rw=h*.215,axle=d*.3,parts=[];
    parts.push(b([w*.91,h*.22,d*.98],[0,h*.33,0],paint,null,.055));
    parts.push(p([[-d*.47,h*.41],[-d*.47,h*.56],[-d*.32,h*.62],[-d*.22,h*.89],[d*(van?.39:.22),h*.89],[d*.39,h*.6],[d*.48,h*.53],[d*.48,h*.41]],w*.86,[0,0,0],paint,[0,Math.PI/2,0]));
    for(const s of [-1,1]) {
      for(const z of [-axle,axle]) {
        parts.push(t([[0,-w*.045],[rw*.65,-w*.045],[rw*.93,-w*.037],[rw,-w*.016],[rw,w*.016],[rw*.93,w*.037],[rw*.65,w*.045],[0,w*.045]],[s*w*.45,rw,z],'black',[0,0,Math.PI/2]),c(rw*.61,w*.012,[s*w*.497,rw,z],'metal',rw*.61,[0,0,Math.PI/2]),c(rw*.22,w*.016,[s*w*.501,rw,z],'dark',rw*.22,[0,0,Math.PI/2]));
        for(let j=0;j<5;j++){const a=j*Math.PI*2/5;parts.push(c(.012,.008,[s*w*.505,rw+Math.cos(a)*rw*.4,z+Math.sin(a)*rw*.4],'black',.012,[0,0,Math.PI/2]));}
      }
      for(const z of van?[.12*d]:[-.12*d,.13*d]) {
        parts.push(b([.012,h*.19,d*(van?.25:.205)],[s*w*.435,h*.745,z],'glass',null,.01),b([.013,.018,d*.07],[s*w*.456,h*.53,z],'metal'));
      }
      parts.push(b([w*.08,h*.06,d*.075],[s*w*.46,h*.63,d*.25],paint,null,.014));
      parts.push(b([w*.25,h*.08,.018],[s*w*.29,h*.43,d*.499],'paper',null,.015),b([w*.16,h*.075,.018],[s*w*.34,h*.43,-d*.499],'red',null,.008));
    }
    parts.push(b([w*.7,h*.18,.025],[0,h*.73,d*.299],'glass',[.62,0,0],.01),b([w*.87,h*.055,.04],[0,h*.28,d*.496],'metal'),b([w*.87,h*.055,.04],[0,h*.28,-d*.496],'metal'));
    for(let i=0;i<5;i++)parts.push(b([w*.32,.013,.022],[0,h*.36+i*.022,d*.5],'dark'));
    parts.push(b([w*.2,h*.055,.025],[0,h*.24,d*.5],'paper'));
    if(id==='police-car'||id==='ambulance')parts.push(b([w*.55,.035,d*.1],[0,h*.92,0],'dark'),...[-1,1].map(s=>cushion([w*.23,h*.07,d*.09],[s*w*.145,h*.96,0],s<0?'red':'screen')));
    if(id==='ambulance')for(const s of [-1,1])parts.push(b([.014,h*.18,d*.035],[s*w*.44,h*.68,-d*.23],'red'),b([.014,h*.055,d*.12],[s*w*.44,h*.68,-d*.23],'red'));
    return {parts,method:'carroceria perfilada, vidros separados, pneus torneados, rodas e ferragens'};
  }
  if(id==='rug') {
    const parts=[b([w,.012,d],[0,.006,0],'fabric')];
    for(const inset of [.065,.11,.18])parts.push(...[-1,1].flatMap(s=>[b([w-inset*2,.003,.018],[0,.013,s*(d/2-inset)],'border'),b([.018,.003,d-inset*2],[s*(w/2-inset),.013,0],'border')]));
    for(let i=-3;i<=3;i++)for(let j=-2;j<=2;j++)parts.push(p([[0,.10],[.065,0],[0,-.10],[-.065,0]],.005,[i*w*.105,.012,j*d*.13],'border',[Math.PI/2,0,0]));
    return {parts,method:'tapete com bordadura tripla e motivos geométricos em relevo baixo'};
  }
  if(id==='ritual-mask'||id==='skull-display') {
    const skull=id==='skull-display',m=skull?'paper':'wood',parts=[e([w*.76,h*.68,d*.76],[0,h*.59,0],m),e([w*.57,h*.34,d*.6],[0,h*.24,d*.1],m)];
    for(const s of [-1,1])parts.push(e([w*.25,h*.2,d*.13],[s*w*.21,h*.6,d*.355],'black'),e([w*.34,h*.12,d*.18],[s*w*.2,h*.75,d*.3],m,[0,0,s*-.18]),e([w*.25,h*.19,d*.23],[s*w*.3,h*.37,d*.25],m));
    parts.push(p([[-w*.07,0],[0,h*.15],[w*.07,0]],.025,[0,h*.34,d*.43],'black'));
    for(let i=0;i<8;i++)parts.push(b([w*.048,h*.08,d*.08],[(i-3.5)*w*.06,h*.16,d*.37],skull?'white':m,null,.005));
    if(skull)parts.push(b([w,.045,d],[0,.0225,0],'dark'));
    return {parts,method:'escultura de crânio/máscara: órbitas, maçãs, mandíbula e dentes'};
  }
  return null;
}
