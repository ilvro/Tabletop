import {box as b,cylinder as c,curve,profile as p,cushion,frame,spindle} from './library-craft-parts.js';

export function craftFurniture(id,recipe,[w,h,d]) {
  if(['bookshelf','wardrobe','dresser','bedside-table','card-catalog'].includes(id)) {
    const parts=[],bookcase=id==='bookshelf',drawers=['dresser','bedside-table','card-catalog'].includes(id),base=bookcase?0:h*.06;
    const wood='wood';
    parts.push(b([w*.94,.055,d*.94],[0,base+.0275,0],wood),b([w*.91,h-base-.09,.025],[0,(h+base-.09)/2,-d*.44],wood),b([w,.055,d],[0,h-.0275,0],wood),b([w*.97,.035,d*.98],[0,h-.072,0],wood));
    for(const s of [-1,1])parts.push(b([.045,h-base-.09,d*.92],[s*(w*.46-.0225),(h+base-.09)/2,0],wood));
    if(bookcase) {
      for(let row=0;row<4;row++) {
        const y=.08+row*(h-.18)/4;parts.push(b([w*.9,.025,d*.88],[0,y,0],wood));
        for(let i=0;i<9;i++) {
          const x=-w*.39+i*w*.086,bh=(h-.2)/4*(.64+(i%3)*.095),bw=w*(.049+(i%2)*.014),z=d*.035,color=['red','dark','wood'][i%3];
          parts.push(b([bw,bh,d*.6],[x,y+.015+bh/2,z],color,null,.003));
          parts.push(b([bw*.84,bh*.95,d*.55],[x,y+.015+bh/2,z-.02],'paper'));
          for(const v of [.15,.8])parts.push(b([bw+.002,.009,.006],[x,y+.015+bh*v,z+d*.305],'brass'));
        }
      }
    } else if(drawers) {
      const rows=id==='bedside-table'?2:id==='card-catalog'?5:4,cols=id==='card-catalog'?4:2;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++) {
        const dx=w*.89/cols,dy=(h-base-.16)/rows,x=(col-(cols-1)/2)*dx,y=base+.045+(row+.5)*dy;
        parts.push(b([dx-.012,dy-.012,.028],[x,y,d*.467],wood));
        parts.push(...frame(dx-.044,dy-.042,.008,[x,y,d*.485],wood,.011));
        parts.push(curve([[x-dx*.16,y+.008,d*.49],[x-dx*.16,y-.014,d*.515],[x+dx*.16,y-.014,d*.515],[x+dx*.16,y+.008,d*.49]],.006,'brass'));
      }
    } else {
      for(const s of [-1,1]) {
        const x=s*w*.227;parts.push(...frame(w*.445,h-base-.17,.047,[x,(h+base-.09)/2,d*.464],wood,.045));
        parts.push(b([w*.353,h-base-.262,.022],[x,(h+base-.09)/2,d*.459],wood));
        for(const y of [h*.31,h*.7])parts.push(...frame(w*.31,h*.26,.01,[x,y,d*.478],wood,.014));
        parts.push(c(.018,.015,[s*w*.055,h*.47,d*.494],'brass',.018,[Math.PI/2,0,0]));
        for(const y of [h*.22,h*.79])parts.push(b([.02,.065,.015],[s*w*.428,y,d*.485],'brass'));
      }
    }
    if(base)for(const x of [-1,1])for(const z of [-1,1])parts.push(spindle(base,.035,[x*w*.42,0,z*d*.4],wood));
    return {parts,method:'móvel de marcenaria refeito: carcaça, cornija, painéis, prateleiras ou gavetas com puxadores'};
  }
  if(['single-bed','bunk-bed','gurney'].includes(id)) {
    const medical=id==='gurney',bunk=id==='bunk-bed',parts=[],levels=bunk?[h*.25,h*.795]:[medical?(recipe.supportHeight??h*.82):recipe.supportHeight??h*.54];
    for(const y of levels){parts.push(b([w*.88,.055,d*.9],[0,y-.16,0],'metal'),cushion([w*.87,.145,d*.9],[0,y-.075,0],medical?'white':'cloth'),cushion([w*.61,.075,d*.2],[0,y+.032,-d*.31],'white'));
      // Folded blanket lies below the support plane, so props do not float.
      if(!medical)parts.push(b([w*.85,.009,d*.36],[0,y-.0045,d*.26],'cloth',null,.003));
    }
    for(const x of [-1,1])for(const z of [-1,1])parts.push(c(.024,h-.022,[x*w*.44,(h-.022)/2,z*d*.445],'metal'),c(.036,.022,[x*w*.44,h-.011,z*d*.445],'metal'));
    for(const z of [-1,1]) {
      const rail=medical?h*.95:bunk?h*.98:h*.96;parts.push(curve([[-w*.44,rail-.05,z*d*.445],[-w*.4,rail,z*d*.445],[w*.4,rail,z*d*.445],[w*.44,rail-.05,z*d*.445]],.021,'metal'));
      for(const x of [-.3,-.15,0,.15,.3])parts.push(c(.009,h*.28,[x*w,rail-h*.16,z*d*.445],'metal'));
    }
    if(bunk)for(let i=0;i<5;i++)parts.push(b([w*.75,.025,.025],[0,h*(.12+i*.135),d*.48],'metal'));
    if(medical)for(const x of [-1,1])for(const z of [-1,1])parts.push(c(.075,.04,[x*w*.39,.075,z*d*.39],'black',.075,[0,0,Math.PI/2]));
    return {parts,method:'cama/maca com estrutura tubular, cabeceiras curvas e colchão separado'};
  }
  if(id==='church-pew') {
    const parts=[b([w*.96,.065,d*.82],[0,(recipe.supportHeight??.45)-.0325,d*.055],'wood'),b([w*.95,h*.42,.038],[0,h*.72,-d*.34],'wood',[-.10,0,0])];
    for(const s of [-1,1]) {
      parts.push(p([[-d*.49,0],[d*.48,0],[d*.48,h*.15],[d*.35,h*.27],[d*.35,h*.47],[d*.42,h*.5],[d*.40,h*.61],[d*.2,h*.65],[d*.13,h*.52],[-d*.26,h*.52],[-d*.29,h*.94],[-d*.38,h],[-d*.48,h*.93]],.075,[s*w*.475,0,0],'wood',[0,Math.PI/2,0]));
      parts.push(b([.022,.085,d*.6],[s*w*.475,h*.25,0],'wood'));
    }
    parts.push(b([w*.87,.07,.055],[0,h*.2,0],'wood'));
    for(let i=0;i<4;i++)parts.push(...frame(w*.205,h*.29,.014,[(i-1.5)*w*.224,h*.72,-d*.304],'wood',.017));
    return {parts,method:'banco eclesiástico com laterais recortadas e painéis de encosto'};
  }
  if(id==='crate') {
    const parts=[],th=.035;
    for(let i=0;i<5;i++) {
      const y=(i+.5)*h/5;parts.push(...[-1,1].flatMap(s=>[b([w-th*2,h/5-.004,th],[0,y,s*(d-th)/2],'wood'),b([th,h/5-.004,d-th*2],[s*(w-th)/2,y,0],'wood')]));
    }
    for(let i=0;i<5;i++)parts.push(b([w/5-.003,th,d],[-w/2+(i+.5)*w/5,h-th/2,0],'wood'));
    for(const x of [-1,1])for(const z of [-1,1]){
      parts.push(b([.055,h,.055],[x*(w/2-.0275),h/2,z*(d/2-.0275)],'wood'));
      for(const y of [h*.13,h*.85])parts.push(c(.006,.004,[x*(w/2-.0275),y,z*(d/2+.001)],'metal',.006,[Math.PI/2,0,0]));
    }
    return {parts,method:'caixa montada em tábuas com juntas, cantoneiras de madeira e pregos'};
  }
  return null;
}
