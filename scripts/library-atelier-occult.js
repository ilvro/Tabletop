import {b,c,e,r,t,rb,tb,lathe,rock,curve,p,cushion,frame,along,polar,slab,surf,withSurface,candle,chain,spin,finishes,TAU} from './library-atelier-kit.js';

const PI=Math.PI,FLAT=[PI/2,0,0];

// Church, cemetery and paranormal set pieces.
export function craftOccult(id,recipe,[w,h,d]) {
  const P=[],S=recipe.supportHeight,done=(method,...extra)=>({parts:P,method,sized:true,...(extra.length?{materials:finishes(...extra)}:{})});
  switch(id) {
  case 'confessional': {
    const z=.45;
    P.push(rb([w,.08,d],[0,.04,0],'wood',.01),b([1.1,1.9,.05],[0,1.03,-z],'wood'),...[-1,1].flatMap(s=>[b([.05,1.9,.9],[s*.55,1.03,0],'wood'),b([.1,1.9,.06],[s*.5,1.03,z],'wood'),...[.55,1.4].flatMap(y=>frame(.6,.6,.012,[0,y,0],'wood',.05).map(q=>({...q,position:[s*.581,q.position[1],q.position[0]],size:[q.size[2],q.size[1],q.size[0]]})))]));
    P.push(p([[-.45,0],[-.45,.3],[.45,.3],[.45,0],[.36,0],[.25,.14],[0,.22],[-.25,.14],[-.36,0]],.05,[0,1.68,z],'wood'),rb([w,.07,d],[0,2.015,0],'wood',.012),b([w*.94,.03,d*.94],[0,1.97,0],'wood'),p([[-.5,0],[.5,0],[0,.03]],.06,[0,2.05,z-.02],'wood'));
    // Brass rod with a half-drawn pleated curtain; lattice above, kneeler and seat inside.
    P.push(c(.012,.82,[0,1.63,z-.02],'brass','x'),...along(8,-.38,.18).map((x,i)=>rb([.085,1.46,.03],[x,.88,z-.02],'red',.012,[0,i%2?.5:-.5,0])),...along(8,-.38,.18).map(x=>r(.018,.004,[x,1.63,z-.02],'brass',[0,PI/2,0])),b([.5,.02,.012],[-.1,.17,z-.012],'brass'));
    P.push(...along(5,-.28,.28).flatMap(x=>[b([.014,.3,.012],[x,1.78,z+.005],'wood',[0,0,.6]),b([.014,.3,.012],[x,1.78,z+.008],'wood',[0,0,-.6])]),b([.9,.05,.4],[0,.5,-.22],'wood'),b([.9,.42,.04],[0,.29,-.04],'wood'),rb([.7,.1,.2],[0,.13,.25],'wood',.01),cushion([.62,.05,.17],[0,.2,.25],'red'));
    for(const s of [-1,1])P.push(t([[0,0],[.03,0],[.03,.012],[.014,.02],[.026,.035],[0,.045]],[s*.54,2.05,z-.04],'wood'));
    return done('confessionário com laterais almofadadas, arco entalhado, treliça, cortina plissada em varão, genuflexório e banco','brass');
  }
  case 'lectern': {
    const tilt=[-.2,0,0],on=(q,lift=0)=>[1.13+Math.sin(.2)*q+Math.cos(.2)*lift,q*Math.cos(.2)-Math.sin(.2)*lift];
    P.push(rb([.6,.05,d],[0,.025,0],'wood',.01),rb([.48,.04,.4],[0,.07,0],'wood',.008),b([.3,.88,.26],[0,.53,0],'wood'),...[-1,1].flatMap(s=>[-1,1].map(q=>c(.018,.88,[s*.15,.53,q*.13],'wood'))),tb([.34,.08,.3],[0,1.01,0],'wood',[1.5,1.3]));
    P.push(p([[-.1,0],[-.1,.42],[0,.56],[.1,.42],[.1,0],[.07,0],[.07,.4],[0,.5],[-.07,.4],[-.07,0]],.014,[0,.2,.137],'wood'),b([.03,.3,.012],[0,.46,.136],'wood'),b([.12,.03,.012],[0,.5,.136],'wood'));
    P.push(rb([w,.045,d],[0,1.13,0],'wood',.01,tilt),b([w*.94,.03,.02],[0,on(-.235,.035)[0],on(-.235,.035)[1]],'wood',tilt));
    // Open missal with a ribbon marker.
    for(const s of [-1,1])P.push(b([.2,.012,.3],[s*.1,on(.0,.03)[0],on(0,.03)[1]],'dark',spin(['z',s*.04],['x',-.2])),rb([.185,.02,.28],[s*.098,on(0,.045)[0],on(0,.045)[1]],'paper',.008,spin(['z',s*.07],['x',-.2])),...along(5,-.09,.09).map(q=>b([.14,.002,.008],[s*.1,on(q,.058)[0],on(q,.058)[1]],'dark',spin(['z',s*.07],['x',-.2]))));
    P.push(b([.014,.003,.36],[.01,on(-.03,.058)[0],on(-.03,.058)[1]],'red',tilt));
    return done('púlpito com coluna de colunelos e arco em relevo, capitel, estante inclinada com batente e missal aberto');
  }
  case 'gravestone': {
    const lean=[0,0,.035];
    P.push(rb([w,.12,d],[0,.06,0],'stone',.015),rb([.7,.06,.3],[0,.15,0],'stone',.01),p([[-.3,0],[-.3,.52],[-.26,.58],[-.2,.6],[-.17,.69],[-.1,.76],[0,.79],[.1,.76],[.17,.69],[.2,.6],[.26,.58],[.3,.52],[.3,0]],.16,[0,.18,0],'stone',lean));
    P.push(b([.05,.3,.012],[-.02,.72,.085],'dark',lean),b([.2,.05,.012],[-.022,.77,.085],'dark',lean),rb([.34,.1,.01],[-.008,.4,.085],'paper',.004,lean),...[.425,.4,.375].map((y,i)=>b([.26-i*.05,.008,.004],[-.008,y,.092],'dark',lean)),curve([[.2,.3,.083],[.14,.45,.083],[.19,.56,.083],[.12,.66,.083]],.005,'dark'));
    // Moss, grass and a dried bouquet.
    P.push(e([.2,.03,.1],[-.12,.965-.02,.0],'green'),e([.16,.04,.2],[.3,.125,.14],'green'),e([.22,.03,.12],[-.28,.125,-.2],'green'),e([.1,.12,.03],[-.26,.3,.08],'green'),...[[-.36,.24],[.36,-.22]].map(([x,zz],i)=>({shape:'foliage',style:'grass',size:[.2,.16,.16],position:[x,.12,zz],count:14,seed:60+i,material:'green'})));
    P.push(...[-.03,0,.03].map((q,i)=>curve([[.1+q,.185,.2],[.16+q,.2,.14],[.24+q*2,.215,.1-i*.02]],.005,'green')),...[[.25,.22,.1],[.3,.225,.07],[.27,.23,.13]].map(q=>e([.035,.03,.035],q,'red')));
    return done('lápide de topo recortado e levemente tombada, com cruz, placa gravada, rachadura, musgo e flores secas');
  }
  case 'ritual-altar': {
    const top=S,slabY=top-.075;
    for(const s of [-1,1])P.push(rb([.46,.06,.7],[s*.5,.03,0],'stone',.012),tb([.4,.74,.62],[s*.5,.43,0],'stone',[.85,.9]),rb([.44,.05,.66],[s*.5,.825,0],'stone',.012),r(.1,.012,[s*.5,.45,.296],'stone'),...[0,1,2].map(i=>b([.012,.17,.012],[s*.5,.45,.298],'stone',[0,0,i*PI/3])));
    P.push(rb([w,.15,.78],[0,slabY,0],'stone',.02),b([.5,h-top,.78],[0,(h+top)/2,0],'red'),b([.5,.3,.012],[0,top-.15,.396],'red'),...along(6,-.22,.22).map(x=>b([.012,.05,.008],[x,top-.32,.396],'red')),...[-.3,.3].map(z=>b([1.3,.003,.02],[0,top+.001,z],'dark')));
    P.push(...along(7,-.66,.66).filter((x,i)=>i!==3).flatMap((x,i)=>[b([.012,.07,.006],[x,slabY,.392],'dark',[0,0,i%2?.5:-.3]),b([.012,.05,.006],[x+.02,slabY+.01,.392],'dark',[0,0,i%3?-.9:.9])]));
    // Offerings beneath the slab: guttered candles and a skull.
    for(const [x,z,hh] of [[-.16,.26,.2],[-.08,.32,.11],[.1,.3,.16],[.2,.24,.08],[.02,.2,.26]])P.push(...candle(x,0,z,.022,hh),c(.045,.006,[x,.003,z],'wax'));
    P.push(e([.17,.15,.2],[-.02,.085,-.05],'paper'),e([.12,.07,.1],[-.02,.04,.03],'paper'),...[-.035,.035].map(x=>e([.04,.045,.03],[-.02+x,.09,.04],'dark')),rock([.12,.06,.1],[.74,0,.36],'stone',9,'fractured'));
    return done('altar de pedra com apoios talhados, sigilos em relevo, canaletas, inscrições, toalha com franja, velas e crânio');
  }
  case 'ritual-circle': {
    const band=(r0,r1)=>({...t([[r0,0],[r0,.007],[r1,.007],[r1,0]],[0,0,0],'red'),segments:48}),line=(a,bb,width=.03)=>b([Math.hypot(bb[0]-a[0],bb[1]-a[1]),.007,width],[(a[0]+bb[0])/2,.0035,(a[1]+bb[1])/2],'red',[0,-Math.atan2(bb[1]-a[1],bb[0]-a[0]),0]);
    const R=.96,star=Array.from({length:5},(_,i)=>[Math.cos(PI/2+i*TAU/5)*R,-Math.sin(PI/2+i*TAU/5)*R]);
    P.push(band(1.17,1.2175),band(1.0,1.03),band(.36,.385),{...t([[0,0],[.05,0],[.05,.007],[0,.007]],[0,0,0],'red'),segments:16});
    for(let i=0;i<5;i++)P.push(line(star[i],star[(i+2)%5]),{...band(.07,.095),position:[star[i][0],0,star[i][1]]});
    P.push(...[0,1,2].map(i=>line([Math.cos(-PI/2+i*TAU/3)*.36,-Math.sin(-PI/2+i*TAU/3)*.36],[Math.cos(-PI/2+(i+1)*TAU/3)*.36,-Math.sin(-PI/2+(i+1)*TAU/3)*.36],.02)),line([-.12,0],[.12,0],.02),line([-.1,.03],[0,-.05],.016),line([.1,.03],[0,-.05],.016));
    // Glyphs between the two outer rings, each from two or three strokes.
    for(let i=0;i<20;i++) {
      const a=i*TAU/20+.08,u=[Math.cos(a),Math.sin(a)],v=[-u[1],u[0]],at=(q,s)=>[u[0]*(1.1+q)+v[0]*s,u[1]*(1.1+q)+v[1]*s];
      P.push(line(at(-.045,0),at(.045,(i%3-1)*.03),.016),line(at((i%4-1.5)*.02,-.035),at((i%2?.03:-.03),.035),.014));
      if(i%3===0)P.push({...band(.012,.024),position:[at(.02,.045)[0],0,at(.02,.045)[1]],segments:10});
    }
    P.push(...[[.6,.3,.03],[.66,.38,.018],[-.5,-.62,.026],[-.44,-.7,.014],[.2,-.75,.02]].map(([x,z,q])=>c(q,.006,[x,.003,z],'red')));
    return done('círculo ritual com anéis duplos, pentagrama, sigilo central, vinte glifos traçados e respingos');
  }
  case 'obelisk': {
    const taper=.72,face=y=>.25*(1-(y-.18)/1.62*(1-taper)),tilt=Math.atan(.25*(1-taper)/1.62);
    P.push(rb([w,.1,d],[0,.05,0],'stone',.015),rb([.64,.08,.64],[0,.14,0],'stone',.012),tb([.5,1.62,.5],[0,.99,0],'dark',[taper,taper]),tb([.36,.46,.36],[0,2.03,0],'stone',[.04,.04]),b([.4,.03,.4],[0,1.8,0],'stone'));
    for(let k=0;k<4;k++)along(5,.5,1.56).forEach((y,i)=>{
      const slot=i===4?'violet':'paper',turn=spin(['x',-tilt],['y',k*PI/2]),at=(x,dy=0)=>{const zz=face(y+dy)+.004,a=k*PI/2;return [x*Math.cos(a)+zz*Math.sin(a),y+dy,-x*Math.sin(a)+zz*Math.cos(a)];};
      if((i+k)%3===0)P.push({...r(.035,.006,at(0),slot,turn),segments:12},b([.008,.05,.006],at(0),slot,turn));
      else if((i+k)%3===1)P.push(b([.12,.012,.006],at(0,.025),slot,turn),b([.012,.06,.006],at(-.03,-.01),slot,turn),b([.012,.06,.006],at(.03,-.01),slot,turn));
      else P.push(b([.012,.09,.006],at(-.04),slot,spin(['z',.5],['x',-tilt],['y',k*PI/2])),b([.012,.09,.006],at(.04),slot,spin(['z',-.5],['x',-tilt],['y',k*PI/2])),b([.1,.012,.006],at(0,-.045),slot,turn));
    });
    P.push(curve([[.1,1.2,face(1.2)+.003],[.06,1.05,face(1.05)+.003],[.11,.9,face(.9)+.003],[.05,.72,face(.72)+.003]],.005,'black'),rock([.2,.12,.16],[.3,.18,.26],'dark',17,'fractured'),rock([.12,.07,.1],[-.28,.1,.33],'dark',19,'fractured'));
    return done('obelisco afilado com base em degraus, piramídio, glifos em relevo nas quatro faces, fileira luminosa e fissura');
  }
  case 'chains': {
    const link=.03,run=(x,bottom)=>Array.from({length:Math.round((h-.03-bottom)/(link*1.45))},(_,i)=>({...r(link,link*.24,[x,h-.03-(i+.5)*link*1.45,0],i%3===1?'dark':'metal',[0,i%2?.5:-.5,0]),segments:10,sides:5}));
    P.push(b([w,.02,d],[0,h-.01,0],'dark'),...[-.036,.036].map(x=>c(.012,.02,[x,h-.025,0],'dark')),...run(-.036,.09),...run(.036,.42));
    P.push({...r(.036,.008,[-.036,.045,0],'dark'),segments:14},b([.02,.03,.014],[-.036,.085,0],'dark'),curve([[.036,.42,0],[.036,.36,0],[.05,.33,0],[.062,.36,0]],.007,'dark'));
    return done('correntes de elos entrelaçados presas a uma chapa, com algema e gancho nas pontas');
  }
  case 'crystal': {
    const shard=(x,z,radius,height,slot,tilt,y=.06)=>({...t([[0,0],[radius*.8,0],[radius,height*.16],[radius*.86,height*.74],[0,height]],[x,y,z],slot,tilt),segments:6,faceted:true});
    P.push(rock([w*.96,.13,d*.94],[0,0,0],'stone',11,'fractured'),rock([.18,.1,.16],[.16,.02,.12],'stone',13,'fractured'),rock([.14,.08,.14],[-.17,.02,-.1],'stone',15,'fractured'));
    P.push(shard(-.02,0,.085,.61,'violet',[.04,0,.05]),shard(.13,.05,.06,.38,'violet',[.1,0,-.3]),shard(-.15,-.03,.055,.3,'screen',[-.15,0,.35]),shard(.03,.12,.04,.24,'screen',[.5,0,-.05]),shard(.05,-.12,.045,.28,'violet',[-.45,0,-.1]),shard(-.1,.1,.03,.17,'violet',[.4,0,.4]),shard(.2,-.06,.03,.16,'screen',[-.2,0,-.55]));
    // Splinters hanging in the air above the cluster.
    P.push(...[[.17,.5,.1,.5],[-.18,.46,.06,1.9],[.1,.58,-.12,3.1],[-.1,.6,-.14,4.2]].map(([x,y,z,a],i)=>({...t([[0,-.035],[.014,0],[0,.035]],[x,y,z],i%2?'screen':'violet',[a,0,a*.7]),segments:4,faceted:true})));
    return done('fragmentos anômalos em prismas lapidados sobre rocha fraturada, com lascas suspensas no ar');
  }
  case 'ritual-book': {
    P.push(rb([w,.02,d],[0,.01,0],'dark',.006),...[0,1,2,3].map(i=>b([.288-(i%2)*.004,.0165,.39-(i%2)*.006],[.008,.028+i*.0165,0],'paper')),rb([.03,.108,d],[-.146,.057,0],'red',.014),...along(4,-.15,.15).map(z=>rb([.036,.112,.016],[-.146,.057,z],'dark',.006)),rb([w,.02,d],[0,.104,0],'red',.006));
    P.push(...[-1,1].flatMap(s=>[rb([.05,.024,.05],[.136,.104,s*.186],'metal',.004),b([.045,.012,.05],[.14,.057,s*.1],'dark'),rb([.012,.03,.035],[.162,.06,s*.1],'metal',.004),b([.1,.004,.05],[.1,.116,s*.1],'dark')]));
    // Sigil inlaid on the cover and a ribbon marker.
    P.push({...r(.055,.006,[.01,.114,0],'metal',FLAT),segments:20},...[0,1,2].map(i=>b([.09,.005,.008],[.01+Math.cos(i*TAU/3+PI/2)*.016,.1145,Math.sin(i*TAU/3+PI/2)*.016],'metal',[0,i*TAU/3,0])),e([.022,.01,.022],[.01,.116,0],'metal'),b([.014,.003,.05],[.06,.062,d/2+.012],'red',[.25,0,0]));
    return done('grimório com lombada de nervuras, bloco de páginas, cantoneiras, fechos com presilhas e sigilo metálico na capa');
  }
  case 'iron-fence': {
    P.push(...[-1,1].flatMap(s=>[b([.075,1.36,.075],[s,.68,0],'stone'),tb([.075,.09,.075],[s,1.405,0],'stone',[.1,.1])]),...[.3,.42,.98].map(y=>b([2,.035,.03],[0,y,0],'dark')),...along(9,-.84,.84).map(x=>({...r(.045,.008,[x,.36,0],'dark'),segments:14})));
    along(9,-.84,.84).forEach((x,i)=>{
      const bent=i===6?[0,0,.1]:undefined;
      P.push({...c(.011,1.2,[x+(bent?-.05:0),.68,0],'dark'),...(bent?{rotation:bent}:{})},{...t([[0,0],[.022,.03],[.008,.1],[0,.13]],[x+(bent?-.11:0),1.28,0],'metal'),segments:8,...(bent?{rotation:bent}:{})});
      if(i<8&&i!==3)P.push(c(.008,.64,[x+.105,.74,0],'dark'),e([.03,.03,.03],[x+.105,1.07,0],'dark'));
      if(i%2===0&&i<8)P.push(curve([[x+.02,1.0,0],[x+.07,1.1,0],[x+.105,1.16,0],[x+.14,1.1,0],[x+.19,1.0,0]],.006,'dark'));
    });
    return done('grade de cemitério com pilaretes de pedra, lanças, barras intermediárias com pinhas, faixa de argolas, volutas e uma barra torta');
  }
  case 'mausoleum': {
    const blocks=surf(recipe,'stone','stone',{textureSize:1.3,relief:.02}),z=.7;
    P.push(rb([w,.1,d],[0,.05,0],'stone',.015),rb([2.2,.1,1.75],[0,.15,0],'stone',.012),...withSurface([b([1.9,2.2,.2],[0,1.3,-z],'stone'),...[-1,1].flatMap(s=>[b([.2,2.2,1.6],[s*.95,1.3,0],'stone'),b([.55,2.2,.2],[s*.675,1.3,z],'stone')]),b([.8,.5,.2],[0,2.15,z],'stone')],blocks));
    P.push(rb([w,.2,d],[0,2.5,0],'stone',.02),b([2.2,.05,1.75],[0,2.385,0],'stone'),p([[-1.15,0],[1.15,0],[0,.16]],d,[0,2.6,0],'stone'),...[-1,1].map(s=>b([1.17,.02,d*.99],[s*.575,2.692,0],'dark',[0,0,-s*.138])),b([.9,.1,.012],[0,2.5,d/2-.004],'metal'));
    // Bronze double door with cross reliefs and ring pulls.
    for(const s of [-1,1])P.push(rb([.39,1.68,.06],[s*.2,1.05,z-.04],'dark',.01),...frame(.3,1.5,.012,[s*.2,1.05,z-.008],'dark',.03),b([.035,.3,.012],[s*.2,1.35,z-.004],'metal'),b([.14,.035,.012],[s*.2,1.4,z-.004],'metal'),{...r(.05,.01,[s*.07,.95,z+.004],'metal'),segments:14},...[.5,1.6].map(y=>c(.02,.14,[s*.4,y,z-.02],'metal')));
    for(const s of [-1,1])P.push(t([[0,0],[.13,0],[.13,.05],[.1,.07],[.095,.1],[.085,1.9],[.1,1.93],[.13,1.96],[.13,2.0],[0,2.0]],[s*.9,.2,.82],'stone'),t([[0,0],[.09,0],[.07,.03],[.12,.14],[.11,.24],[.06,.28],[.085,.34],[0,.34]],[s*.55,.2,.82],'stone'),e([.3,.05,.2],[s*.8,.215,.5],'green'),b([.16,.5,.02],[s*1.052,1.5,0],'dark'),...[-.04,.04].map(q=>c(.008,.5,[s*1.058,1.5,q],'metal')));
    P.push({...r(.07,.012,[0,2.66,d/2+.002],'metal'),segments:16},e([.4,.04,.3],[-.7,.21,.7],'green'));
    return done('mausoléu com escadaria, colunas, alvenaria aparelhada, frontão, portas de bronze com cruzes, urnas e janelas gradeadas');
  }
  case 'ruined-column': {
    const x=-.24;
    P.push(rb([.65,.12,.65],[x,.06,0],'stone',.015),t([[0,0],[.3,0],[.31,.03],[.27,.06],[.26,.09],[.24,.1],[0,.1]],[x,.12,0],'stone'),t([[.235,0],[.23,.5],[.205,.95]],[x,.22,0],'stone'),...polar(12,.228,(u,v)=>c(.022,.92,[x+u*.97,.68,v*.97],'stone',null,.018)));
    P.push(rock([.44,.24,.44],[x,1.13,0],'stone',7,'fractured'),c(.19,.4,[.36,.19,.12],'stone','x',.165),...polar(10,.18,(u,v)=>c(.018,.38,[.36,.19+u,.12+v],'stone','x')),rock([.2,.22,.3],[.46,.02,.12],'stone',23,'fractured',[0,.4,0]));
    P.push(rb([.3,.07,.3],[.1,.035,-.2],'stone',.01,[0,.5,0]),rock([.16,.1,.14],[.3,0,-.22],'stone',25,'fractured'),rock([.12,.07,.1],[-.02,0,.24],'stone',27,'fractured'),rock([.1,.06,.12],[.46,0,-.12],'stone',29,'fractured'));
    return done('coluna quebrada com base moldurada, caneluras, topo fraturado, tambor caído e entulho');
  }
  case 'reliquary': {
    const z=.095;
    P.push(...[-1,1].flatMap(s=>[-1,1].map(q=>e([.04,.04,.04],[s*.15,.02,q*.1],'metal'))),rb([w,.035,d],[0,.045,0],'metal',.008),b([.29,.18,.19],[0,.15,0],'dark'),...[-1,1].flatMap(s=>[-1,1].map(q=>c(.014,.18,[s*.145,.15,q*z],'paper'))));
    P.push(rb([.35,.02,.25],[0,.249,0],'metal',.006),p([[-.125,0],[.125,0],[0,.052]],.34,[0,.258,0],'metal',[0,PI/2,0]),b([.04,.13,.012],[0,.16,z+.003],'paper'),b([.13,.04,.012],[0,.175,z+.003],'paper'),b([.28,.005,.185],[0,.2415,0],'violet'));
    // Sealed: iron bands, padlock and wax seals.
    P.push(...[-.09,.09].map(x=>b([.014,.2,.2],[x,.155,0],'metal')),rb([.04,.045,.018],[0,.09,z+.012],'metal',.006),{...r(.014,.004,[0,.118,z+.012],'metal'),segments:10},...[-.09,.09].map((x,i)=>c(.02,.006,[x,.2-i*.07,z+.006],'red','z')));
    return done('relicário com tampa em duas águas, pilastras, cruz frontal, cintas de ferro, cadeado, lacres de cera e fresta luminosa');
  }
  case 'effigy': {
    const straw=surf(recipe,'paper','grass',{textureSize:.3,relief:.02});
    P.push(c(.03,1.45,[0,.725,0],'wood'),c(.025,w,[0,1.3,0],'wood','x'),...[-1,1].map(s=>({...r(.036,.008,[s*.02,1.3,0],'wood',[0,PI/2,.6*s]),segments:10})));
    P.push(...withSurface([t([[.135,0],[.125,.1],[.075,.33],[.065,.36]],[0,.44,0],'paper'),t([[.065,0],[.11,.12],[.125,.4],[.08,.56],[0,.6]],[0,.8,0],'paper'),...[-1,1].map(s=>({...t([[.05,0],[.062,.3],[.04,.4],[.075,.49]],[s*.06,1.3,0],'paper'),rotation:[0,0,-s*PI/2]}))],straw));
    P.push(...withSurface([e([.26,.3,.24],[0,1.55,0],'paper')],surf(recipe,'paper','sand',{textureSize:.25,relief:.006})),{...r(.07,.01,[0,1.41,0],'wood',FLAT),segments:12},t([[.07,0],[.072,.06]],[0,.79,0],'red'),b([.04,.2,.01],[.05,.7,.07],'red',[0,0,.15]),b([.035,.16,.01],[.085,.72,.065],'red',[0,0,.3]));
    // Stitched face and a mark daubed on the chest.
    P.push(...[-1,1].flatMap(s=>[b([.05,.008,.006],[s*.055,1.58,.115],'black',[0,0,.78]),b([.05,.008,.006],[s*.055,1.58,.115],'black',[0,0,-.78])]),b([.12,.006,.006],[0,1.49,.112],'black'),...along(5,-.045,.045).map(x=>b([.006,.035,.006],[x,1.49,.113],'black')));
    P.push({...r(.05,.007,[0,1.14,.126],'red'),segments:14},b([.008,.11,.006],[0,1.14,.127],'red'),b([.08,.008,.006],[0,1.16,.127],'red'),{shape:'foliage',style:'grass',size:[.3,.14,.26],position:[0,.36,0],count:26,seed:44,material:'paper'});
    return done('efígie de palha amarrada em cruz, com cabeça de saco costurada, faixa, braços em feixes e marca pintada no peito');
  }
  case 'anomalous-portal': {
    for(const s of [-1,1]) {
      P.push(rb([.42,.1,d],[s*.85,.05,0],'stone',.015));
      for(let i=0;i<5;i++) {
        const y=.1+.19+i*.385,j=((i*7+(s>0?3:0))%5-2);
        P.push(rb([.27-(i%2)*.02,.37,.36-(i%3)*.02],[s*.85+j*.008,y,j*.006],'dark',.018,[0,j*.04,0]),...(i<4?[b([.2,.014,.3],[s*.85,y+.192,0],'violet')]:[]));
        if(i%2===0)P.push(b([.012,.12,.008],[s*.85-.04,y,.185],'violet',[0,0,.4]),b([.012,.12,.008],[s*.85+.03,y,.185],'violet',[0,0,-.5]),b([.09,.012,.008],[s*.85,y-.05,.185],'violet'));
      }
      P.push(b([.03,1.86,.02],[s*.705,1.05,.1],'violet'),rb([.64,.24,.36],[s*.68,2.12,0],'dark',.018,[0,-s*.03,s*.02]),b([.014,.22,.3],[s*.34,2.12,0],'violet'));
    }
    P.push(tb([.66,.26,.38],[0,2.1,0],'dark',[1.12,1]),b([1.4,.02,.03],[0,1.975,.1],'violet'),b([1.44,1.87,.008],[0,1.04,0],'veil'));
    // Fragments that never fell.
    P.push(...[[-.5,1.86,.14,.5],[.42,1.82,-.12,1.3],[.56,1.66,.16,2.2],[-.4,1.7,-.15,.9]].map(([x,y,z,a],i)=>rb([.09-i*.012,.07,.08],[x,y,z],'dark',.012,[a,a*.6,a*.3])));
    return done('arco de blocos de obsidiana desalinhados com juntas e runas luminosas, véu translúcido e fragmentos suspensos','veil');
  }
  case 'spirit-board': {
    const y=.0125,mark=(x,z,turn,size=[.012,.002,.02])=>b(size,[x,y+.001,z],'black',[0,turn,0]);
    P.push(rb([w,.012,d],[0,.006,0],'paper',.004),...[.012,.022].flatMap((q,i)=>[...[-1,1].map(s=>b([w-q*2,.0015,i?.002:.004],[0,y,s*(d/2-q)],'dark')),...[-1,1].map(s=>b([i?.002:.004,.0015,d-q*2],[s*(w/2-q),y,0],'dark'))]));
    for(const [radius,n,span] of [[.2,13,.95],[.15,13,.95]])for(let i=0;i<n;i++) {
      const a=(i/(n-1)-.5)*span*2,x=Math.sin(a)*radius*1.05,z=.2-Math.cos(a)*radius-.055;
      P.push(i%4===1?{...r(.01,.002,[x,y+.001,z],'black',FLAT),segments:8}:mark(x,z,-a),...(i%3===0?[mark(x+.006,z+.004,-a+1.2,[.008,.002,.012])]:[]));
    }
    P.push(...along(10,-.13,.13).map((x,i)=>mark(x,.085,i%2?.3:-.2,[.008,.002,.016])),...along(5,-.05,.05).map((x,i)=>mark(x,.125,i%2?0:.5,[.01,.002,.014])));
    // Sun and moon in the corners; heart-shaped planchette with a viewing hole.
    P.push(c(.026,.003,[-.19,y+.0005,-.11],'wax'),...polar(8,.038,(u,v,a)=>b([.014,.002,.004],[-.19+u,y+.001,-.11+v],'wax',[0,-a,0])),c(.026,.003,[.19,y+.0005,-.11],'wax'),c(.022,.0035,[.2,y+.0005,-.115],'paper'));
    const turn=.5,px=.06,pz=.03;
    P.push(p([[0,-.065],[.036,-.03],[.046,.01],[.03,.042],[0,.03],[-.03,.042],[-.046,.01],[-.036,-.03]].map(([x,z])=>[x,-z]),.006,[px,.026,pz],'wood',spin(['x',-PI/2],['y',turn])),{...r(.012,.003,[px,.03,pz],'white',FLAT),segments:10},c(.011,.002,[px,.0295,pz],'white'),...[[0,-.05],[.03,.025],[-.03,.025]].map(([x,z])=>c(.004,.012,[px+x*Math.cos(turn)+z*Math.sin(turn),.018,pz-x*Math.sin(turn)+z*Math.cos(turn)],'wood')));
    return done('tabuleiro com filetes, arcos de letras e algarismos traçados, sol e lua, e prancheta em coração com visor');
  }
  case 'cage': {
    const z=.57,cz=-.01;
    P.push(rb([1.2,.06,1.2],[0,.03,cz],'dark',.01),rb([1.2,.05,1.2],[0,1.4,cz],'dark',.01),...[-1,1].flatMap(s=>[-1,1].map(q=>b([.06,1.32,.06],[s*.57,.72,cz+q*.57],'dark'))),...[-1,1].flatMap(s=>[b([1.1,.04,.04],[0,.7,cz+s*.57],'dark'),b([.04,.04,1.1],[s*.57,.7,cz],'dark')]));
    for(const s of [-1,1])P.push(...along(6,-.4,.4).map(q=>c(.014,1.32,[s*.57,.72,cz+q],'metal')),...along(6,-.4,.4).filter((q,i)=>s<0||i<1||i>4).map(q=>c(.014,1.32,[q,.72,cz+s*.57],'metal')));
    // Door with its own frame, hinges and lock, chained shut.
    P.push(...frame(.56,1.2,.045,[0,.7,z+.012],'dark',.04),...along(3,-.14,.14).map(x=>c(.012,1.14,[x,.7,z+.012],'metal')),...[.3,1.1].map(y=>c(.02,.1,[-.3,y,z+.012],'dark')),rb([.09,.14,.07],[.27,.7,z+.014],'dark',.01),c(.012,.075,[.27,.72,z+.016],'black','z'));
    P.push(...chain([-.5,1.02,z+.05],[.5,.46,z+.05],.03,'metal'),rb([.07,.08,.03],[.02,.7,z+.085],'brass',.008),{...r(.022,.006,[.02,.75,z+.085],'metal'),segments:10});
    // Paper wards on the bars and a floor shackle inside.
    for(const [x,y,turn] of [[-.42,1.05,.08],[.42,.9,-.1],[-.14,.34,.05],[.36,.3,.12]])P.push(b([.075,.22,.004],[x,y,z+.03],'paper',[0,0,turn]),b([.012,.14,.003],[x,y,z+.034],'red',[0,0,turn]),b([.045,.012,.003],[x,y+.05,z+.034],'red',[0,0,turn]),b([.045,.012,.003],[x,y-.03,z+.034],'red',[0,0,turn+.4]));
    P.push({...r(.04,.01,[0,.075,cz],'metal',[0,.5,0]),segments:12},...chain([0,.08,cz],[.25,.07,cz+.2],.022,'metal'),{...r(.05,.012,[.29,.075,cz+.23],'metal',FLAT),segments:14});
    return done('jaula com barras individuais, porta acorrentada com cadeado, selos de papel e grilhão preso ao piso','brass');
  }
  case 'grave-cross': {
    const soil=surf(recipe,'rust','mud',{textureSize:.6,relief:.03,textureBrightness:.42,textureSaturation:.55}),lean=[.05,0,.035];
    P.push(...withSurface([rock([w*.97,.2,1.56],[0,0,.05],'rust',21,'rounded',null,.3),rock([.5,.16,1.25],[0,.1,.08],'rust',22,'rounded',null,.35)],soil));
    P.push(...Array.from({length:12},(_,i)=>{const a=i*TAU/12+.2,x=Math.cos(a)*.31,z=.05+Math.sin(a)*.74;return rock([.11+(i%3)*.02,.07+(i%2)*.02,.1],[x,0,z],'stone',50+i,'rounded',[0,a,0]);}));
    P.push(b([.08,h,.06],[0,h/2,-.76],'wood',lean),b([.5,.08,.05],[0,.8,-.725],'wood',[.05,0,.06]),curve([[-.04,.76,-.69],[.05,.84,-.69]],.006,'paper'),curve([[.04,.76,-.69],[-.05,.84,-.69]],.006,'paper'),b([.26,.12,.012],[0,.56,-.71],'paper',[.05,0,-.05]),...[.58,.55].map((y,i)=>b([.18-i*.05,.01,.004],[0,y,-.702],'dark',[.05,0,-.05])));
    P.push(...[[-.3,-.5],[.3,.2],[-.26,.6],[.22,-.62]].map(([x,z],i)=>({shape:'foliage',style:'grass',size:[.18,.16,.18],position:[x,0,z],count:14,seed:30+i,material:'green'})),e([.22,.02,.3],[.08,.2,.3],'green'));
    return {...done('cova com montículo de terra, pedras de contorno, cruz de madeira amarrada e tombada, placa e tufos de capim'),matte:['rust']};
  }
  case 'open-grave': {
    const soil=surf(recipe,'rust','mud',{textureSize:.7,relief:.03,textureBrightness:.42,textureSaturation:.55}),px=-.47;
    P.push(b([.84,.02,1.74],[px,.01,0],'black'),slab([[-.22,-.72],[.22,-.72],[.33,-.3],[.24,.72],[-.24,.72],[-.33,-.3]].map(([x,z])=>[px+x,z]),.03,.035,'wood'),b([.04,.008,.5],[px,.055,-.2],'metal'),b([.22,.008,.04],[px,.055,-.32],'metal'));
    // Berms of thrown earth around the pit, the spoil heap and loose clods.
    P.push(...withSurface([...[-1,1].flatMap(s=>[tb([.3,.2,1.9],[px+s*.57,.1,0],'rust',[.4,.94]),tb([1.44,.18,.28],[px,.09,s*.99],'rust',[.92,.4])]),
      rock([1.05,.52,1.2],[.6,0,0],'rust',5,'rounded',null,.3),rock([.6,.3,.7],[.56,.36,.02],'rust',6,'rounded',null,.3),
      ...[[.2,.9,.16],[.95,-.75,.2],[1.0,.7,.14],[.3,-.85,.12],[-.3,1.0,.1],[-1.02,.4,.12],[-.95,-.6,.15],[.05,.3,.1],[-.5,-.98,.12]].map(([x,z,q],i)=>rock([q,q*.6,q],[x,z===.3?.18:Math.abs(z)>.9||x<-.9?.14:0,z],'rust',8+i,'fractured'))],soil));
    // Shovel planted in the spoil heap.
    const tilt=[0,0,-.22],sx=.56,sy=.55;
    P.push({...c(.02,.84,[sx+.093,sy+.41,0],'wood'),rotation:tilt},p([[-.11,0],[-.12,.2],[-.05,.26],[.05,.26],[.12,.2],[.11,0],[0,-.1]],.008,[sx,sy-.14,0],'metal',spin(['y',PI/2],['z',-.22])),{...r(.055,.014,[sx+.2,h-.07,0],'wood',[0,PI/2,0]),segments:14});
    return {...done('cova aberta com caixão ao fundo, bordas e monte de terra revolvida, torrões e pá fincada'),matte:['rust']};
  }
  case 'ritual-candelabra': {
    P.push(...polar(3,1,(u,v)=>[curve([[0,.17,0],[u*.12,.1,v*.12],[u*.24,.025,v*.24]],.014,'dark'),e([.05,.035,.05],[u*.24,.018,v*.24],'dark')],PI/2),t([[0,0],[.03,0],[.03,.03],[.016,.05],[.014,.3],[.04,.33],[.04,.36],[.014,.39],[.012,.68],[.035,.71],[.012,.74],[.012,.92],[0,.92]],[0,.15,0],'dark'));
    P.push({...r(.07,.006,[0,.7,0],'dark'),segments:16},...[0,1,2].map(i=>({...c(.004,.14,[0,.7,0],'dark'),rotation:[0,0,i*PI/3]})));
    for(const [x,cup,tall] of [[-.3,1.0,.14],[-.15,1.07,.18],[0,1.12,.2],[.15,1.07,.13],[.3,1.0,.17]]) {
      if(x)P.push(curve([[0,.9+Math.abs(x)*.1,0],[x*.5,.86+Math.abs(x)*.2,0],[x,cup-.06,0],[x,cup,0]],.011,'dark'),tb([.016,.05,.016],[x*.55,.93,0],'dark',[.1,.1]));
      P.push(lathe([[0,0],[.026,0],[.04,.014],[.042,.02]],[x,cup,0],'dark',null,{segments:12}),...candle(x,cup+.008,0,.016,tall),e([.012,.06,.012],[x-.014,cup-.02,.006],'wax'));
    }
    return done('candelabro de cinco braços com pés em garra, haste torneada, sigilo em anel, espinhos e velas escorridas');
  }
  case 'containment-pod': {
    const cz=-.02,R=.39;
    P.push(t([[0,0],[.5,0],[.5,.06],[.47,.1],[.47,.14],[.43,.16],[0,.16]],[0,0,cz],'dark'),t([[R,0],[R,1.6]],[0,.16,cz],'pane'),c(R-.03,1.56,[0,.96,cz],'fluid'),t([[0,0],[.5,0],[.5,.03],[.45,.08],[.3,.13],[0,.13]],[0,h-.13,cz],'metal'));
    P.push(...polar(4,.43,(u,v)=>c(.022,1.6,[u,.96,cz+v],'metal'),PI/4),...[.5,1.0,1.5].map(y=>({...r(R+.012,.014,[0,y,cz],'metal',FLAT),segments:32})),...[.2,1.72].map(y=>({...r(R-.06,.02,[0,y,cz],'screen',FLAT),segments:28})));
    // Something suspended in the fluid, tethered by feed lines.
    P.push(e([.2,.4,.16],[0,1.02,cz],'soot'),e([.15,.17,.15],[0,1.32,cz+.02],'soot',[.3,0,0]),...[-1,1].flatMap(s=>[e([.06,.4,.06],[s*.13,.92,cz+.02],'soot',[0,0,s*.25]),e([.07,.44,.07],[s*.06,.6,cz+.03],'soot',[.2,0,s*.08])]),curve([[0,1.42,cz],[.05,1.55,cz-.05],[0,1.74,cz]],.008,'black'),curve([[.05,1.1,cz-.08],[.15,1.4,cz-.12],[.1,1.74,cz-.1]],.006,'black'));
    P.push(...[[.1,.5,.1],[-.14,.8,-.1],[.18,1.3,0],[-.06,1.5,.14],[.02,.34,-.12]].map(([x,y,z],i)=>({...e([.03-i*.003,.03-i*.003,.03-i*.003],[x,y,cz+z],'screen'),segments:8})));
    P.push(rb([.24,.12,.07],[0,.1,.455],'dark',.012),b([.1,.05,.006],[-.05,.11,.492],'screen'),...[.03,.06,.09].map(x=>e([.016,.016,.012],[x,.11,.492],'violet')),...[-1,1].map(s=>e([.04,.04,.04],[s*.3,.17,cz+.3],'violet')),...[-1,1].map(s=>curve([[s*.2,1.8,cz-.4],[s*.3,1.2,cz-.47],[s*.28,.5,cz-.47],[s*.36,.1,cz-.42]],.02,'black')));
    return done('cápsula de vidro com fluido translúcido, vulto suspenso e tubos, anéis luminosos, estrutura de reforço e console','pane','fluid','soot');
  }
  }
  return null;
}
