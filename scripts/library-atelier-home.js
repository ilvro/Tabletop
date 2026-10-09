import {b,c,e,r,t,rb,tb,lathe,fire,curve,p,cushion,frame,spindle,along,polar,side,surf,withSurface,pull,knob,bolts,panel,louvers,gauge,candle,chain,spin,crescent,finishes,TAU} from './library-atelier-kit.js';

const PI=Math.PI,FLAT=[PI/2,0,0];

// Domestic, commercial and leisure furniture. Fronts face +Z, bases sit on y=0
// and every model fills the catalogue envelope [w,h,d].
export function craftHome(id,recipe,[w,h,d]) {
  const P=[],S=recipe.supportHeight,done=(method,...extra)=>({parts:P,method,sized:true,...(extra.length?{materials:finishes(...extra)}:{})});
  switch(id) {
  case 'stove': {
    const top=.76,z=d*.45;
    P.push(rb([w*.97,.07,d*.95],[0,.035,0],'stone',.012),...withSurface([b([w*.93,top-.13,d*.9],[0,.07+(top-.13)/2,0],'stone')],surf(recipe,'stone','brick',{textureSize:.9,relief:.02})));
    P.push(rb([w,.06,d],[0,top-.03,0],'black',.018),b([w*.95,.02,d*.93],[0,top-.07,0],'dark'));
    for(const x of [-.34,.34])P.push(c(.17,.012,[x,top+.006,-.01],'metal'),r(.115,.007,[x,top+.013,-.01],'black',FLAT),r(.06,.006,[x,top+.013,-.01],'black',FLAT),c(.022,.02,[x,top+.02,-.01],'black'));
    // Firebox door with draught slots, ash drawer and oven door.
    P.push(rb([.44,.36,.04],[-.28,.42,z],'black',.015),...louvers(.26,.07,[-.28,.32,z+.022],4,'metal'),pull(-.12,.44,z+.02,.16,'metal',.03,true),...bolts([[-.47,.52,z+.02],[-.47,.32,z+.02]],.014,'metal'));
    P.push(rb([.44,.09,.035],[-.28,.15,z],'black',.01),knob([-.28,.15,z+.017],.018,'metal'));
    P.push(rb([.56,.5,.04],[.33,.36,z],'black',.015),rb([.36,.2,.012],[.33,.4,z+.018],'dark',.004),pull(.33,.56,z+.02,.38,'metal',.03),...gauge([.33,.2,z+.02],.035,'dark','metal','black'));
    P.push(curve([[-w*.46,top-.045,z+.03],[0,top-.045,z+.038],[w*.46,top-.045,z+.03]],.011,'metal'),...[-1,1].map(s=>c(.008,.05,[s*w*.4,top-.045,z+.012],'metal','z')));
    P.push(c(.1,h-top-.12,[.47,top+(h-top-.12)/2,-.21],'dark'),c(.118,.05,[.47,top+.025,-.21],'black'),c(.112,.035,[.47,1.5,-.21],'black'),knob([.47,1.2,-.11],.02,'metal'));
    P.push(lathe([[0,.12],[.07,.1],[.17,.02],[.17,0],[0,0]],[.47,h-.12,-.21],'black'),...polar(3,.085,(x,zz)=>c(.008,.06,[.47+x,h-.14,-.21+zz],'metal')));
    return done('fogão de alvenaria com chapa de ferro, portas de fornalha, gaveta de cinzas e chaminé com chapéu');
  }
  case 'fridge': {
    const z=d*.4;
    P.push(rb([w,h-.05,d*.84],[0,.05+(h-.05)/2,-d*.08],'white',.05),b([w*.9,.05,d*.78],[0,.025,-d*.08],'dark'),...louvers(w*.7,.04,[0,.03,d*.33],3,'metal'));
    P.push(rb([w*.96,.95,.06],[0,.555,z],'white',.028),rb([w*.96,.5,.06],[0,1.31,z],'metal',.028),b([w*.9,.012,.03],[0,1.045,z-.02],'dark'));
    P.push(pull(.26,.86,z+.03,.3,'dark',.04,true,.009),pull(.26,1.2,z+.03,.2,'dark',.04,true,.009),rb([.13,.03,.008],[-.14,1.47,z+.031],'dark',.004));
    for(const y of [.14,.98,1.1,1.52])P.push(c(.014,.07,[-w*.47,y,z+.012],'dark'));
    // Condenser coil on the back and levelling feet.
    for(const s of [-1,1])P.push(curve(along(8,.3,1.35).map((y,i)=>[s*((i%2?.26:.04)),y,-d/2+.012]),.007,'dark'),c(.025,.03,[s*w*.4,.015,d*.25],'dark'),c(.025,.03,[s*w*.4,.015,-d*.4],'dark'));
    return done('geladeira de cantos arredondados com portas independentes, puxadores cromados, dobradiças e serpentina');
  }
  case 'mirror': {
    const fh=h*.9,y=fh/2;
    P.push(b([w*.96,fh*.98,.012],[0,y,-d/2+.006],'wood'),...frame(w,fh,d*.62,[0,y,-d*.19],'wood',.07),b([w-.13,fh-.13,.012],[0,y,-d*.1],'metal'));
    P.push(...frame(w-.11,fh-.11,d*.3,[0,y,d*.18],'paper',.016),...frame(w-.02,fh-.02,d*.2,[0,y,d*.2],'wood',.014));
    P.push(p([[-w*.38,0],[-w*.33,.045],[-w*.14,.055],[-w*.07,h*.085],[0,h*.1],[w*.07,h*.085],[w*.14,.055],[w*.33,.045],[w*.38,0]],d*.5,[0,fh,-d*.1],'wood'),lathe([[0,0],[.04,0],[.045,.008],[.025,.018],[0,.022]],[0,fh+.035,d*.14],'paper','z'));
    for(const x of [-1,1])for(const v of [-1,1])P.push(lathe([[0,0],[.03,0],[.032,.008],[.018,.016],[0,.02]],[x*(w/2-.035),y+v*(fh/2-.035),d*.3],'paper','z',{segments:12}));
    return done('espelho com moldura em camadas, friso dourado, rosetas nos cantos e frontão entalhado','brass');
  }
  case 'grandfather-clock': {
    const z=d*.4;
    P.push(rb([w*.92,.07,d*.94],[0,.035,0],'wood',.01),b([w*.84,.36,d*.84],[0,.25,0],'wood'),...panel(w*.62,.26,[0,.25,d*.42+.012],'wood'),b([w*.9,.03,d*.9],[0,.445,0],'wood'));
    P.push(b([w*.64,.82,d*.66],[0,.87,0],'wood'),...frame(w*.52,.74,.03,[0,.87,d*.33+.015],'wood',.05),b([w*.42,.64,.01],[0,.87,d*.33],'dark'));
    // Pendulum, weights and their chains behind the trunk door.
    P.push(c(.005,.52,[0,.95,d*.33+.012],'metal'),lathe([[0,-.008],[.05,-.005],[.058,0],[.05,.005],[0,.008]],[0,.66,d*.33+.014],'metal','z'));
    for(const [x,y] of [[-.075,.98],[.075,.84]])P.push(c(.02,.14,[x,y,d*.33+.012],'metal'),c(.003,1.25-y,[x,(1.25+y)/2+.04,d*.33+.012],'metal'));
    P.push(b([w*.92,.035,d*.94],[0,1.297,0],'wood'),b([w*.82,.4,d*.82],[0,1.51,0],'wood'),c(.175,.016,[0,1.51,z+.008],'metal','z'),c(.155,.018,[0,1.51,z+.01],'paper','z'));
    P.push(...polar(12,.125,(x,y,a,i)=>b([i%3?.006:.011,.028,.004],[x,1.51+y,z+.021],'black',[0,0,a-PI/2])),b([.012,.1,.004],[.022,1.548,z+.024],'black',[0,0,-.52]),b([.008,.135,.004],[-.045,1.555,z+.026],'black',[0,0,.78]),c(.012,.012,[0,1.51,z+.026],'metal','z'));
    for(const s of [-1,1])P.push(spindle(.385,.022,[s*w*.37,1.315,z-.01],'wood'),t([[0,0],[.016,0],[.016,.012],[.009,.02],[.02,.04],[.008,.06],[0,.075]],[s*w*.4,1.74,d*.2],'wood'));
    P.push(b([w*.94,.03,d*.96],[0,1.705,0],'wood'),rb([w,.035,d],[0,1.737,0],'wood',.008));
    P.push(p([[-w*.48,0],[-w*.48,.025],[-w*.2,.085],[-w*.1,.05],[-w*.06,.02],[w*.06,.02],[w*.1,.05],[w*.2,.085],[w*.48,.025],[w*.48,0]],d*.5,[0,1.752,d*.2],'wood'),t([[0,0],[.018,0],[.018,.016],[.01,.026],[.026,.052],[.01,.078],[0,.098]],[0,1.752,d*.2],'wood'));
    return done('relógio de coluna com mostrador graduado, pêndulo e pesos atrás da porta, colunas torneadas e frontão');
  }
  case 'shower': {
    const tile=surf(recipe,'stone','stone',{textureSize:.55,relief:.008}),back=-d/2;
    P.push(...withSurface([b([w,h,.05],[0,h/2,back+.025],'stone'),b([.05,h,d-.05],[-w/2+.025,h/2,.025],'stone')],tile));
    P.push(rb([w-.05,.06,d-.05],[.025,.03,.025],'white',.02),b([w-.05,.05,.04],[.025,.08,d/2-.02],'white'),b([.04,.05,d-.09],[w/2-.02,.08,.005],'white'),c(.04,.006,[.05,.062,.05],'metal'),r(.022,.004,[.05,.066,.05],'metal',FLAT));
    P.push(curve([[0,1.1,back+.07],[0,1.72,back+.07],[0,1.92,back+.12],[0,1.93,back+.3],[0,1.88,back+.35]],.012,'metal'),lathe([[0,0],[.02,0],[.03,-.02],[.095,-.05],[.095,-.062],[0,-.062]],[0,1.885,back+.35],'metal'));
    P.push(c(.055,.012,[0,1.1,back+.056],'metal','z'),...[-.13,.13].map(x=>knob([x,1.1,back+.05],.03,'metal')),...[-.13,.13].map(x=>c(.035,.008,[x,1.1,back+.054],'metal','z')));
    P.push(rb([.22,.02,.1],[.24,1.25,back+.1],'white',.008),e([.09,.035,.06],[.24,1.275,back+.1],'white'),curve([[-w/2+.05,1.45,.2],[-w/2+.09,1.45,.2],[-w/2+.09,1.5,.2]],.007,'metal'));
    // Fixed glass side with its aluminium frame; the front stays open.
    P.push(b([.012,h-.13,d-.08],[w/2-.03,h/2+.045,.015],'pane'),b([.028,h-.08,.028],[w/2-.03,h/2+.04,d/2-.014],'metal'),b([.028,.028,d-.05],[w/2-.03,h-.014,.025],'metal'),b([w-.05,.028,.028],[.025,h-.014,d/2-.014],'metal'));
    return done('box com paredes azulejadas, base com borda e ralo, registros, chuveiro em pescoço de ganso e lateral de vidro','pane');
  }
  case 'radiator': {
    for(const x of along(9,-w*.44,w*.3))P.push(rb([.07,.54,d*.92],[x,.36,0],'metal',.03),e([.07,.09,d*.92],[x,.615,0],'metal'),c(.012,d*.94,[x,.36,0],'dark','z'));
    P.push(c(.024,w*.76,[-w*.07,.15,0],'metal','x'),c(.024,w*.76,[-w*.07,.57,0],'metal','x'));
    for(const x of [-w*.44,w*.3])P.push(tb([.06,.09,d],[x,.045,0],'dark',[.7,.6]));
    P.push(c(.02,.13,[w*.4,.15,0],'dark','x'),lathe([[0,0],[.02,0],[.02,.03],[.038,.036],[.04,.06],[.02,.066],[0,.066]],[w*.44,.16,0],'dark'),c(.014,.15,[w*.47,.075,0],'dark'),knob([-w*.47,.57,0],.014,'dark','x'));
    return done('radiador de ferro fundido em colunas, com tubos coletores, pés, registro e purgador');
  }
  case 'desk-fan': {
    const y=.41,R=w/2-.006;
    P.push(rb([.3,.032,d*.95],[0,.016,0],'dark',.014),knob([.09,.03,.05],.014,'metal',null),c(.022,.2,[0,.13,-.03],'metal'),e([.062,.062,.062],[0,.25,-.03],'dark'),c(.018,.14,[0,.32,-.03],'metal'));
    P.push(lathe([[0,-.085],[.05,-.08],[.07,-.05],[.075,0],[.06,.03],[0,.035]],[0,y,-.035],'dark','z'),r(R,.005,[0,y,.095],'metal'),r(R,.005,[0,y,.015],'metal'),r(.09,.004,[0,y,.108],'metal'),c(.04,.008,[0,y,.112],'metal','z'));
    P.push(...polar(12,1,(u,v)=>curve([[u*R,y+v*R,.095],[u*R*.62,y+v*R*.62,.108],[u*.04,y+v*.04,.112]],.005,'metal')),...polar(8,1,(u,v)=>curve([[u*R,y+v*R,.015],[u*R*.6,y+v*R*.6,-.01],[u*.07,y+v*.07,-.03]],.005,'metal')));
    for(let i=0;i<4;i++){const a=i*PI/2+.3;P.push(e([.075,.15,.012],[-Math.sin(a)*.095,y+Math.cos(a)*.095,.055],'cloth',spin(['y',.45],['z',a])));}
    P.push(c(.02,.06,[0,y,.055],'dark','z'));
    return done('ventilador com gaiola de arame, pás inclinadas, carcaça do motor e base com seletor');
  }
  case 'rocking-chair': {
    const lean=[-.14,0,0];
    for(const s of [-1,1]) {
      P.push(side(crescent(d,.11,.04),.035,s*.25,'wood'),spindle(.39,.022,[s*.25,.035,.2],'wood'),spindle(.39,.022,[s*.25,.045,-.24],'wood'));
      P.push(b([.038,.74,.038],[s*.24,.8,-.3],'wood',lean),rb([.055,.03,.46],[s*.275,.66,-.04],'wood',.012),spindle(.21,.018,[s*.275,.445,.16],'wood'),c(.012,.44,[s*.25,.2,-.02],'wood','z'));
    }
    P.push(rb([.5,.04,.48],[0,.43,-.02],'wood',.015),cushion([.42,.05,.4],[0,.475,-.01],'red'),c(.012,.5,[0,.2,.2],'wood','x'),c(.012,.5,[0,.2,-.24],'wood','x'),b([.46,.05,.03],[0,.53,-.262],'wood',lean));
    P.push(p([[-.29,0],[-.29,.07],[-.15,.11],[0,.125],[.15,.11],[.29,.07],[.29,0]],.035,[0,1.03,-.332],'wood',lean),...along(5,-.17,.17).map(x=>b([.045,.5,.014],[x,.79,-.298],'wood',lean)),cushion([.36,.3,.05],[0,.74,-.262],'red',lean));
    return done('cadeira de balanço com esquis curvos, pernas torneadas, braços, ripas e travessa de encosto recortada');
  }
  case 'fireplace': {
    const brick=surf(recipe,'red','brick',{textureSize:1.1,relief:.03});
    P.push(rb([w*.98,.06,d],[0,.03,0],'stone',.012),...withSurface([...[-1,1].map(s=>b([.36,1.1,.5],[s*.65,.61,-.1],'red')),b([1.66,.28,.5],[0,1.3,-.1],'red'),tb([1.5,.86,.46],[0,1.975,-.13],'red',[.76,.92])],brick));
    P.push(...withSurface(along(9,-.42,.42).map(x=>b([.085,.2,.03],[x,1.24,.155],'red')),brick),tb([.14,.24,.05],[0,1.25,.16],'stone',[1.3,1]),rb([1.18,.05,.44],[0,2.405,-.13],'stone',.01));
    P.push(rb([w,.07,.62],[0,1.495,-.06],'wood',.015),b([w*.94,.05,.56],[0,1.435,-.08],'wood'),b([w*.9,.03,.52],[0,1.4,-.1],'wood'));
    for(const s of [-1,1])P.push(side([[.15,1.16],[.15,1.385],[.3,1.385],[.3,1.34],[.2,1.28],[.18,1.16]],.1,s*.72,'wood'));
    P.push(b([.96,1.1,.04],[0,.61,-.33],'black'),...[-1,1].map(s=>b([.03,1.1,.42],[s*.465,.61,-.12],'black')),b([.94,.02,.46],[0,.07,-.1],'black'));
    // Iron grate, logs and fire.
    P.push(...along(6,-.3,.3).map(x=>c(.011,.36,[x,.17,-.08],'dark','z')),...[-.25,.09].map(z=>c(.014,.7,[0,.17,z],'dark','x')),...[-1,1].flatMap(s=>[-.25,.09].map(z=>c(.012,.11,[s*.32,.115,z],'dark'))));
    P.push(c(.06,.56,[0,.25,-.12],'wood','x'),c(.05,.5,[.03,.24,.0],'wood','x'),{...c(.045,.46,[-.02,.33,-.06],'wood'),rotation:[0,.3,PI/2]});
    P.push(fire(-.14,.3,-.08,.07,.34),fire(.02,.3,-.1,.09,.5),fire(.18,.29,-.06,.06,.3),fire(-.03,.3,-.02,.05,.24,'flame',[.15,0,.1]),e([.3,.05,.14],[0,.2,-.06],'flame'));
    P.push(lathe([[0,0],[.07,0],[.07,.012],[.012,.03],[.01,.72],[.03,.74],[0,.76]],[.8,.06,.3],'dark'),...[-.03,.03].map((x,i)=>({...c(.005,.56,[.8+x,.42,.3+(i?.02:-.02)],'dark'),rotation:[0,0,x*2]})));
    return done('lareira de tijolos com verga em fiada de pé, console de madeira com mísulas, grelha de ferro, lenha e atiçadores');
  }
  case 'coat-rack': {
    P.push(t([[0,0],[.035,0],[.035,.3],[.026,.34],[.022,.42],[.026,.9],[.032,.93],[.022,.97],[.022,1.72],[.035,1.75],[.02,1.79],[.03,1.84],[0,1.885]],[0,0,0],'wood'));
    P.push(...polar(4,1,(u,v)=>[curve([[u*.02,.32,v*.02],[u*.12,.14,v*.11],[u*.225,.02,v*.21]],.016,'wood'),e([.05,.03,.05],[u*.225,.015,v*.21],'wood')]));
    P.push(...polar(6,1,(u,v)=>[curve([[u*.02,1.6,v*.02],[u*.11,1.61,v*.1],[u*.17,1.7,v*.155]],.009,'wood'),e([.03,.03,.03],[u*.17,1.71,v*.155],'wood')],PI/6));
    // A coat and a hat left behind.
    P.push({...rb([.3,.74,.09],[.02,1.27,.12],'dark',.04),taper:[.72,1]},e([.2,.08,.1],[.02,1.63,.11],'dark'),...[-1,1].map(s=>e([.085,.62,.085],[.02+s*.165,1.24,.11],'dark',[0,0,s*.07])),b([.012,.5,.008],[.02,1.3,.168],'black'));
    P.push({...t([[0,0],[.14,0],[.14,.012],[.085,.02],[.08,.09],[.06,.1],[0,.1]],[-.15,1.72,-.09],'black'),rotation:[.25,0,.45]});
    return done('cabideiro torneado com pés e ganchos curvos, casaco pendurado e chapéu');
  }
  case 'crib': {
    for(const x of [-1,1])for(const z of [-1,1])P.push(spindle(1,.028,[x*.345,0,z*.615],'wood'));
    for(const s of [-1,1]) {
      P.push(b([.03,.045,1.2],[s*.345,.93,0],'wood'),b([.03,.045,1.2],[s*.345,.36,0],'wood'),...along(10,-.5,.5).map(z=>c(.008,.55,[s*.345,.645,z],'wood')));
      P.push(p([[-.33,0],[-.33,.44],[-.2,.52],[0,.56],[.2,.52],[.33,.44],[.33,0]].map(([x,y])=>[x,y*(s<0?1:.72)]),.022,[0,.36,s*.615],'wood'),b([.6,.04,.03],[0,.36,s*.615],'wood'));
    }
    P.push(b([.66,.03,1.2],[0,.38,0],'wood'),cushion([.63,.09,1.17],[0,.44,0],'white'),cushion([.36,.06,.24],[0,.515,-.42],'white'),cushion([.61,.045,.62],[0,.5,.24],'cloth'),rb([.61,.03,.12],[0,.525,-.06],'cloth',.014));
    return done('berço com postes torneados, grades de varetas, cabeceiras recortadas, colchão e manta dobrada');
  }
  case 'rocking-horse': {
    for(const s of [-1,1]) {
      P.push(side(crescent(d,.1,.035),.022,s*.085,'wood'));
      for(const f of [-1,1])P.push({...c(.02,.44,[s*.06,.27,f*.23],'wood',null,.03),rotation:[f*.22,0,0]});
      P.push(e([.02,.02,.02],[s*.05,.915,.43],'black'),tb([.03,.05,.03],[s*.035,.955,.33],'paper',[.2,.2]));
    }
    P.push(...[-.3,.3].map(z=>c(.012,.19,[0,.075,z],'wood','x')),e([.19,.24,.6],[0,.56,-.02],'paper'),e([.13,.38,.2],[0,.76,.25],'paper',[.55,0,0]),e([.11,.14,.3],[0,.895,.39],'paper',[.5,0,0]));
    P.push(side([[.08,.66],[.05,.72],[.13,.85],[.24,.95],[.32,.975],[.29,.9],[.2,.8],[.15,.7]],.022,0,'dark'),curve([[0,.6,-.31],[0,.62,-.42],[0,.45,-.48],[0,.3,-.47]],.02,'dark'));
    P.push(cushion([.2,.045,.24],[0,.685,-.05],'red'),b([.012,.2,.03],[.098,.58,-.05],'dark'),b([.012,.2,.03],[-.098,.58,-.05],'dark'),c(.012,.2,[0,.87,.33],'wood','x'),b([.118,.02,.012],[0,.865,.47],'red',[.5,0,0]));
    return done('cavalo de balanço com corpo e pescoço modelados, crina, cauda, sela e esquis curvos');
  }
  case 'gramophone': {
    const x=-.06,z=-.01,aim=.95;
    P.push(rb([.38,.03,.38],[x,.015,z],'wood',.008),b([.35,.11,.35],[x,.085,z],'wood'),rb([.38,.025,.38],[x,.152,z],'wood',.008),...panel(.24,.08,[x,.085,z+.176],'wood'));
    P.push(c(.155,.012,[x,.171,z],'metal'),c(.148,.005,[x,.18,z],'black'),...[.07,.1,.125].map(q=>r(q,.002,[x,.183,z],'black',FLAT)),c(.045,.006,[x,.181,z],'red'),c(.005,.022,[x,.19,z],'metal'));
    P.push(c(.008,.06,[.15,.09,.04],'metal','x'),curve([[.17,.09,.04],[.2,.09,.04],[.215,.06,.04],[.215,.035,.04]],.006,'metal'),c(.012,.045,[.232,.03,.04],'black','x'));
    P.push(c(.025,.03,[.08,.18,-.14],'metal'),curve([[.08,.2,-.14],[.06,.212,-.08],[0,.205,-.02],[-.02,.196,0]],.007,'metal'),c(.022,.012,[-.02,.196,0],'metal','x'));
    // Flared horn on a bent neck.
    P.push(curve([[.08,.2,-.14],[.09,.3,-.17],[.1,.38,-.15],[.1,.42,-.11]],.016,'wax'),{...t([[.016,0],[.022,.07],[.038,.14],[.07,.2],[.115,.245],[.155,.268],[.16,.28]],[.1,.415,-.115],'wax'),rotation:[aim,0,0]});
    P.push(r(.16,.004,[.1,.415+Math.cos(aim)*.28,-.115+Math.sin(aim)*.28],'wax',[aim-PI/2,0,0]));
    return done('gramofone com corneta em campânula, prato e disco com sulcos, braço fonográfico e manivela');
  }
  case 'globe': {
    const y=.385,R=.16;
    P.push(t([[0,0],[.11,0],[.115,.012],[.09,.03],[.03,.045],[.022,.1],[.03,.12],[.012,.14],[0,.14]],[0,0,0],'wood'),c(.008,.08,[0,.17,0],'wax'),r(R+.014,.006,[0,y,0],'wax'),{...c(.004,R*2+.03,[0,y,0],'wax'),rotation:[0,0,-.41]});
    P.push({...e([R*2,R*2,R*2],[0,y,0],'cloth'),segments:32});
    // Continents as shallow spherical caps hugging the ocean.
    for(const [tilt,lon,size] of [[.8,0,.3],[1.05,.3,.22],[1.3,-.1,.16],[1.7,1.2,.26],[2.05,1.35,.2],[2.3,1.2,.12],[.75,2.3,.32],[1,2.75,.26],[1.25,2.2,.18],[1.6,3.4,.24],[1.95,3.55,.16],[.6,4.2,.24],[.9,4.6,.3],[1.2,4.3,.2],[1.75,5.2,.28],[2.1,5.4,.2],[2.4,5.25,.12],[1.1,5.8,.16],[2.8,2,.3]])
      P.push({...t(along(6,0,size).map(a=>[Math.sin(a)*(R+.004),Math.cos(a)*(R+.004)]),[0,y,0],'paper'),rotation:spin(['z',-tilt],['y',lon]),segments:16});
    return done('globo com continentes em relevo, meridiano de latão, eixo inclinado e base torneada');
  }
  case 'piano': {
    const front=.03;
    P.push(rb([w,.1,.4],[0,.05,-.135],'dark',.01),b([w*.97,h-.135,.34],[0,.1+(h-.135)/2,-.15],'dark'),rb([w,.035,.4],[0,h-.0175,-.135],'dark',.012));
    for(const s of [-1,1])P.push(...panel(.6,.24,[s*.33,.92,front],'dark'),rb([.07,.11,.3],[s*.665,.735,.17],'dark',.015),spindle(.66,.04,[s*.62,0,.28],'wood'),rb([.09,.04,.36],[s*.62,.02,.15],'dark',.01));
    P.push(...panel(1.2,.42,[0,.36,front],'dark'),rb([w*.92,.07,.34],[0,.705,.17],'wood',.012),b([1.26,.11,.02],[0,.81,.045],'dark',[-.18,0,0]),b([.56,.02,.045],[0,.79,.07],'wood'));
    for(let i=0;i<26;i++) {
      const x=-.6+(i+.5)*1.2/26;P.push(b([.043,.022,.15],[x,.752,.215],'white',null,.003));
      if(i<25&&[0,1,3,4,5].includes(i%7))P.push(b([.024,.022,.09],[x+.023,.768,.186],'black',null,.003));
    }
    P.push(...[-.08,0,.08].map(x=>rb([.03,.012,.09],[x,.03,.1],'brass',.005)),b([.3,.07,.02],[0,.035,.05],'dark'));
    // Candle sconces on the upper panel.
    for(const s of [-1,1])P.push(curve([[s*.56,.86,front+.01],[s*.57,.84,front+.07],[s*.58,.87,front+.1]],.006,'brass'),lathe([[0,0],[.025,.004],[.03,.012]],[s*.58,.875,front+.1],'brass'),...candle(s*.58,.88,front+.1,.009,.08));
    return done('piano de armário com teclas individuais, painéis almofadados, pedais de latão e arandelas de vela','brass');
  }
  case 'chandelier': {
    const R=w/2-.04,hub=.07;
    P.push(e([.03,.07,.03],[0,.035,0],'metal'),t([[0,0],[.02,0],[.035,.03],[.02,.06],[.03,.12],[.07,.18],[.075,.22],[.03,.27],[.02,.34],[.04,.38],[.015,.42],[0,.42]],[0,hub,0],'metal'));
    P.push(...chain([0,hub+.42,0],[0,h-.03,0],.03,'dark'),lathe([[0,0],[.03,0],[.06,.02],[.06,.03],[0,.03]],[0,h-.03,0],'dark'));
    P.push(...polar(6,1,(u,v)=>[curve([[u*.06,.26,v*.06],[u*R*.5,.17,v*R*.5],[u*R*.82,.2,v*R*.82],[u*R,.3,v*R]],.009,'metal'),lathe([[0,0],[.028,0],[.045,.012],[.047,.017]],[u*R,.305,v*R],'metal',null,{segments:12}),c(.013,.03,[u*R,.325,v*R],'metal'),
      ...candle(u*R,.335,v*R,.011,.12),curve([[u*.03,.44,v*.03],[u*.1,.5,v*.1],[u*.13,.43,v*.13]],.006,'dark')]));
    return done('lustre de seis braços em S com arandelas, velas escorridas, corpo torneado e corrente');
  }
  case 'classroom-desk': {
    for(const s of [-1,1]) {
      const x=s*.22;
      P.push(curve([[x,S-.05,-.44],[x,.03,-.44],[x,.013,-.38],[x,.013,.38],[x,.03,.445],[x,.4,.445],[x,h-.03,.465]],.013,'metal'),c(.013,S-.07,[x,(S-.07)/2+.02,-.08],'metal'),c(.013,.4,[x,.215,.07],'metal'));
      P.push(b([.012,.1,.36],[s*.26,S-.09,-.24],'metal'),c(.011,.4,[x,.42,.26],'metal','z'));
    }
    P.push(rb([w,.035,.45],[0,S-.0175,-.24],'wood',.012),rb([.52,.012,.36],[0,S-.14,-.24],'metal',.004),b([.52,.1,.012],[0,S-.09,-.42],'metal'),c(.02,.004,[.22,S-.001,-.42],'metal'));
    P.push(rb([.45,.03,.4],[0,.44,.25],'wood',.012),rb([.45,.2,.025],[0,h-.1005,.458],'wood',.012,[.06,0,0]),c(.011,.44,[0,.1,-.44],'metal','x'),c(.011,.44,[0,.1,.445],'metal','x'));
    return done('carteira escolar de tubo curvado contínuo, tampo com porta-livros, assento e encosto de madeira');
  }
  case 'chalkboard': {
    const y=h/2+.02,z=-.008;
    P.push(b([w-.1,h-.14,.02],[0,y,-.02],'green'),...frame(w,h-.04,.05,[0,y,-.025],'wood',.06),...frame(w-.11,h-.15,.012,[0,y,.004],'wood',.012));
    P.push(rb([w*.95,.025,.085],[0,.0125,.01],'wood',.008),b([w*.95,.022,.012],[0,.034,.046],'wood'),...[-.3,-.2,.1].map(x=>c(.007,.07,[x,.032,.02],'white','x')),rb([.13,.035,.05],[.5,.042,.012],'wood',.008),b([.125,.012,.045],[.5,.031,.012],'white'));
    // Chalk diagram: a warded circle and a few lines of notes.
    P.push(r(.17,.005,[-.48,.56,z],'white'),r(.11,.005,[-.48,.56,z],'white'),...polar(3,.17,(u,v,a)=>curve([[-.48+u,.56+v,z],[-.48+Math.cos(a+TAU/3)*.17,.56+Math.sin(a+TAU/3)*.17,z]],.005,'white'),PI/2));
    for(const [x0,x1,yy] of [[.05,.72,.8],[.05,.6,.7],[.05,.68,.6],[.2,.5,.42],[.05,.4,.3]])P.push(curve(along(5,x0,x1).map((x,i)=>[x,yy+(i%2?.012:-.008),z]),.005,'white'));
    P.push(curve([[-.25,.58,z],[-.1,.62,z],[.02,.6,z]],.005,'white'));
    return done('quadro-negro com moldura dupla, calha de giz, apagador e anotações desenhadas a giz');
  }
  case 'bar-stool': {
    P.push(t([[0,0],[.21,0],[.22,.012],[.2,.03],[.08,.05],[.045,.08],[0,.08]],[0,0,0],'dark'),c(.025,.64,[0,.4,0],'metal'),t([[0,0],[.045,0],[.045,.03],[.03,.05],[0,.05]],[0,.08,0],'metal'));
    P.push(r(.16,.011,[0,.3,0],'metal',FLAT),...[0,1,2].map(i=>({...c(.008,.32,[0,.3,0],'metal'),rotation:[0,i*PI/3,PI/2]})),t([[0,0],[.04,0],[.06,.04],[.12,.06],[0,.06]],[0,.675,0],'metal'));
    P.push(c(.2,.035,[0,.7525,0],'metal'),t([[0,0],[.205,0],[.22,.012],[.22,.03],[.19,.052],[.1,.06],[0,.056]],[0,.75,0],'red'),r(.214,.005,[0,.772,0],'dark',FLAT),c(.014,.006,[0,.807,0],'dark'));
    return done('banqueta com base em trombeta, coluna cromada, aro de apoio para os pés e assento estofado com vivo');
  }
  case 'pool-table': {
    const bed=.79;
    for(const [x,z] of [[-.95,-.48],[.95,-.48],[-.95,.48],[.95,.48],[0,-.5],[0,.5]])P.push(t([[0,0],[.07,0],[.075,.03],[.05,.06],[.06,.2],[.085,.4],[.09,.5],[.07,.56],[.085,.62],[0,.62]],[x,0,z],'wood'));
    P.push(b([2.12,.03,1.17],[0,.765,0],'wood'),b([2.0,.014,1.06],[0,bed-.005,0],'green'));
    for(const s of [-1,1]) {
      P.push(b([2.1,.14,.05],[0,.69,s*.58],'wood'),b([.05,.14,1.15],[s*1.05,.69,0],'wood'),...[-.55,.55].flatMap(x=>panel(.8,.09,[x,.69,s*.607],'wood',{depth:.012,border:.014})));
      P.push(rb([.1,.06,.98],[s*1.05,.825,0],'wood',.012),b([.045,.035,.9],[s*.985,.81,0],'green',[0,0,s*.4]),...[-.33,0,.33].map(z=>c(.008,.003,[s*1.05,.856,z],'white')));
      for(const x of [-.52,.52])P.push(rb([.9,.06,.1],[x,.825,s*.575],'wood',.012),b([.84,.035,.045],[x,.81,s*.51],'green',[-s*.4,0,0]),...[-.25,0,.25].map(q=>c(.008,.003,[x+q,.856,s*.575],'white')));
      for(const x of [-1.03,0,1.03])P.push(lathe([[.058,0],[.06,-.02],[.045,-.09],[0,-.1]],[x,.8,s*(x?.555:.585)],'black',null,{segments:12}),r(.06,.008,[x,.835,s*(x?.555:.585)],'black',FLAT));
    }
    // A loose rack, the cue ball and a cue left on the cloth.
    let n=0;for(let row=0;row<4;row++)for(let k=0;k<=row;k++,n++)P.push({...e([.057,.057,.057],[.42+row*.051,bed+.03,(k-row/2)*.059],n===4?'black':n%2?'white':'red'),segments:12});
    P.push({...e([.057,.057,.057],[-.55,bed+.03,.08],'white'),segments:12},{...c(.006,1.3,[-.15,bed+.012,-.3],'wood',null,.013),rotation:[0,.35,PI/2]});
    return done('mesa de sinuca com pernas torneadas, tabelas e borrachas, seis caçapas, marcações e bolas');
  }
  case 'reception-counter': {
    const z=d*.4,granite=surf(recipe,'stone','rock',{rockPattern:'granite',textureSize:.8,relief:.003,rockCracks:.05});
    P.push(...withSurface([rb([w,.05,d],[0,S-.025,0],'stone',.02)],granite),b([w*.95,S-.13,d*.8],[0,.08+(S-.13)/2,0],'wood'),b([w*.9,.08,d*.72],[0,.04,0],'dark'));
    P.push(...along(4,-.76,.76).flatMap(x=>panel(.46,.66,[x,.5,z+.012],'wood',{field:'dark'})),b([w*.97,.04,.03],[0,S-.07,z+.015],'wood'),b([w*.97,.07,.03],[0,.115,z+.015],'wood'));
    for(const s of [-1,1])P.push(b([.07,S-.14,.035],[s*1.01,.08+(S-.14)/2,z+.017],'wood'),b([.09,.04,.045],[s*1.01,S-.11,z+.02],'wood'));
    // Staff side: knee space with drawers above an open shelf.
    P.push(b([1.7,.5,.02],[0,.4,-z-.002],'dark'),b([1.7,.02,.3],[0,.42,-z+.14],'wood'),...along(3,-.56,.56).flatMap(x=>[rb([.52,.15,.02],[x,.8,-z-.01],'wood',.006),{...knob([x,.8,-z-.02],.016,'brass'),rotation:[-PI/2,0,0]}]));
    return done('balcão com tampo de granito boleado, frente almofadada com pilastras e gavetas no lado de atendimento','brass');
  }
  case 'display-case': {
    const gy=S+.21,x=w/2-.02,z=d/2-.02;
    P.push(b([w*.92,.06,d*.9],[0,.03,0],'dark'),b([w*.96,.64,d*.92],[0,.38,0],'wood'),...[-.265,.265].flatMap(q=>panel(.48,.5,[q,.38,d*.46+.012],'wood')),rb([w,.035,d],[0,.72,0],'wood',.01),b([w*.94,.022,d*.9],[0,S-.011,0],'dark'));
    for(const s of [-1,1]) {
      P.push(b([w,.022,.022],[0,h-.011,s*(d/2-.011)],'metal'),b([.022,.022,d],[s*(w/2-.011),h-.011,0],'metal'),b([w,.02,.02],[0,S+.01,s*(d/2-.01)],'metal'),b([.02,.02,d],[s*(w/2-.01),S+.01,0],'metal'));
      P.push(b([w-.04,.41,.006],[0,gy,s*z],'pane'),b([.006,.41,d-.04],[s*x,gy,0],'pane'),...[-1,1].map(q=>b([.02,.43,.02],[s*x,gy,q*z],'metal')));
    }
    P.push(b([w-.03,.006,d-.03],[0,h-.014,0],'pane'),c(.012,.012,[w*.3,S+.02,d/2],'metal','z'));
    // Exhibits: a dagger on velvet, an urn and their labels.
    P.push(cushion([.34,.05,.24],[-.22,S+.025,0],'red'),b([.028,.005,.18],[-.22,S+.056,.03],'metal',[0,.5,0]),b([.085,.008,.014],[-.265,S+.057,-.05],'metal',[0,.5,0]),{...c(.009,.07,[-.283,S+.058,-.083],'dark'),rotation:spin(['x',PI/2],['y',.5])});
    P.push(t([[0,0],[.03,0],[.022,.015],[.05,.07],[.045,.11],[.02,.13],[.03,.16],[0,.16]],[.27,S,-.04],'metal'),...[[-.22,.2],[.27,.14]].map(([q,v])=>tb([.09,.045,.03],[q,S+.022,v],'paper',[1,.15])));
    return done('vitrine com caixa de vidro em caixilhos, base almofadada e peças expostas com etiquetas','pane');
  }
  case 'supermarket-shelf': {
    const back=-d/2;
    P.push(b([w*.97,h-.05,.02],[0,h/2+.02,back+.01],'metal'),...[-1,1].map(s=>rb([.05,h,.08],[s*(w/2-.025),h/2,back+.05],'metal',.008)),b([w,.12,d],[0,.06,0],'metal'),rb([w,.02,d],[0,.13,0],'metal',.006),b([w,.03,d*.3],[0,h-.015,back+.07],'metal'));
    for(const y of [.5,.87,1.24])P.push(b([w-.1,.02,d*.8],[0,y,d*.04],'metal'),b([w-.1,.035,.008],[0,y-.005,d*.44],'paper'),...[-1,1].map(s=>tb([.012,.08,d*.7],[s*(w/2-.06),y-.05,0],'metal',[1,1])));
    P.push(b([w-.1,.035,.008],[0,.125,d/2-.004],'paper'));
    // Stock with gaps: boxes, tins, bottles and bagged goods.
    along(8,-.56,.56).forEach((x,i)=>{if(i!==5)P.push(rb([.11,.26-(i%3)*.03,.07],[x,.14+(.26-(i%3)*.03)/2,.07],i%2?'paper':'red',.006));});
    along(11,-.58,.58).forEach((x,i)=>{if(i!==3&&i!==4)P.push(c(.036,.1,[x,.56,.1],i%3?'cloth':'red'),...(i%2?[c(.036,.1,[x,.56,.02],'cloth')]:[]));});
    along(9,-.56,.56).forEach((x,i)=>{if(i!==7)P.push(t([[0,0],[.035,0],[.035,.13],[.014,.19],[.014,.23],[0,.23]],[x,.88,.08],i%2?'cloth':'paper'));});
    along(6,-.5,.5).forEach((x,i)=>P.push(i===2?{...rb([.15,.07,.2],[x,1.285,.06],'red',.03),rotation:[0,.3,0]}:rb([.15,.2,.08],[x,1.35,.06],i%2?'red':'paper',.035)));
    return done('gôndola com montantes, prateleiras em mão-francesa, porta-preços e mercadorias variadas com falhas');
  }
  case 'cash-register': {
    const slope=.353,tilt=[PI/2-slope,0,0];
    P.push(rb([w,.11,d*.95],[0,.055,-.01],'metal',.012),rb([w*.86,.075,.012],[0,.055,d*.47],'dark',.005),pull(0,.055,d*.476,.12,'black',.014),tb([w*.9,.16,d*.78],[0,.19,-.04],'dark',[.95,.6]));
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){const q=.16+row*.2;P.push({...c(.014,.014,[(col-2)*.065,.11+.16*q+.004,.108-.059*q+.01],col===4?'black':'white'),rotation:tilt});}
    P.push(rb([w*.62,.09,.075],[0,.325,-.1],'dark',.012),b([w*.52,.055,.006],[0,.33,-.06],'screen'),...[-.07,0,.07].map(x=>b([.045,.03,.004],[x,.38,-.1],'white')),c(.004,.03,[0,.37,-.1],'metal'));
    P.push(c(.012,.04,[w*.46,.2,-.05],'metal','x'),b([.012,.1,.012],[w*.485,.165,-.035],'metal',[.4,0,0]),e([.03,.03,.03],[w*.485,.12,-.015],'black'),c(.026,.055,[-.12,.3,-.14],'white','x'));
    return done('caixa registradora com gaveta, teclado inclinado de teclas redondas, visor, manivela e bobina');
  }
  case 'vending-machine': {
    const z=d*.4,wx=-.1;
    // The cabinet is a shell around the vitrine, so the stock is really inside it.
    P.push(rb([w,h-.04,d*.6],[0,.04+(h-.04)/2,-d*.2],'dark',.02),b([w,.5,d*.3],[0,.29,d*.25],'dark'),b([w,.14,d*.3],[0,h-.07,d*.25],'dark'),b([.045,1.12,d*.3],[-w/2+.0225,1.1,d*.25],'dark'),b([w/2-.19,1.12,d*.3],[(w/2+.19)/2,1.1,d*.25],'dark'),...[-1,1].flatMap(s=>[-1,1].map(q=>c(.03,.04,[s*w*.42,.02,q*d*.38-d*.05],'black'))),...frame(w*.96,h*.94,.03,[0,h*.5+.02,z+.015],'dark',.04));
    P.push(b([.57,1.12,.008],[wx,1.1,z+.012],'pane'),...frame(.6,1.15,.02,[wx,1.1,z+.022],'black',.02));
    along(5,.6,1.46).forEach((y,j)=>{P.push(b([.56,.012,.22],[wx,y,z-.11],'black'));along(5,-.21,.21).forEach((x,i)=>P.push(c(.03,.11,[wx+x,y+.061,z-.06],(i+j)%2?'white':'red')));});
    P.push(rb([.15,.07,.012],[.3,1.5,z+.03],'black',.005),b([.12,.045,.006],[.3,1.5,z+.037],'screen'));
    for(let i=0;i<3;i++)for(let j=0;j<4;j++)P.push(b([.028,.02,.008],[.3+(i-1)*.036,1.38-j*.03,z+.03],'white',null,.003));
    P.push(rb([.05,.1,.012],[.3,1.12,z+.03],'metal',.005),b([.006,.04,.004],[.3,1.13,z+.037],'black'),rb([.12,.03,.012],[.3,.98,z+.03],'black',.005),rb([.1,.07,.03],[.3,.8,z+.022],'black',.01));
    P.push(rb([.6,.2,.02],[wx,.3,z+.025],'black',.01),b([.5,.03,.012],[wx,.36,z+.036],'metal'),b([w*.86,.09,.012],[0,1.72,z+.03],'screen'),b([w*.9,.03,.01],[0,.47,z+.03],'red'));
    return done('máquina de bebidas com vitrine, prateleiras de latas, teclado, moedeiro, gaveta de retirada e letreiro','pane');
  }
  case 'arcade-cabinet': {
    const wi=w-.06,py=1.066;
    for(const s of [-1,1])P.push(side([[-.475,0],[.26,0],[.26,.82],[.475,.9],[.475,1.02],[.2,1.1],[.14,1.52],[.3,1.6],[.3,1.75],[-.475,1.75]],.03,s*(w/2-.015),'dark'));
    P.push(b([wi,1.75,.02],[0,.875,-.465],'dark'),b([wi,.02,.77],[0,1.74,-.09],'dark'),b([wi,.82,.02],[0,.41,.25],'dark'),b([wi,.02,.23],[0,.86,.367],'dark',[-.356,0,0]));
    P.push(rb([.26,.3,.015],[0,.5,.262],'metal',.01),...[-.06,.06].map(x=>rb([.03,.06,.01],[x,.56,.272],'red',.004)),c(.01,.01,[0,.42,.272],'black','z'),...[-.06,.06].map(x=>b([.05,.03,.006],[x,.44,.272],'black')));
    P.push(b([wi,.02,.29],[0,1.06,.337],'black',[.287,0,0]),b([wi,.12,.02],[0,.96,.465],'black'));
    P.push(c(.02,.004,[-.16,py,.36],'black'),c(.006,.07,[-.16,py+.035,.36],'metal'),e([.036,.036,.036],[-.16,py+.08,.36],'red'));
    for(let i=0;i<6;i++){const z=.38-(i%2)*.06;P.push(c(.015,.014,[.0+(i>>1)*.07+(i%2)*.02,1.057+(.337-z)*.29+.012,z],i%2?'white':'red'));}
    P.push(b([wi,.44,.02],[0,1.31,.17],'black',[-.142,0,0]),rb([wi*.8,.33,.014],[0,1.31,.18],'screen',.012,[-.142,0,0]),b([wi,.02,.18],[0,1.56,.22],'black',[-.464,0,0]),...louvers(.3,.05,[0,1.555,.215],4,'metal',.004));
    P.push(b([wi,.13,.012],[0,1.675,.296],'violet'),b([wi,.014,.018],[0,1.608,.3],'metal'),b([wi,.014,.018],[0,1.742,.3],'metal'));
    return done('fliperama com laterais recortadas, tela inclinada, painel com alavanca e botões, letreiro e porta de fichas');
  }
  }
  return null;
}
