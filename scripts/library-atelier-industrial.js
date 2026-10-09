import {b,c,e,r,t,rb,tb,lathe,fire,rock,curve,p,frame,along,polar,side,surf,withSurface,wheel,spokedWheel,caster,pull,bolts,panel,gauge,chain,planks,spin,finishes,TAU} from './library-atelier-kit.js';

const PI=Math.PI,FLAT=[PI/2,0,0];

// Workshop, street and countryside props.
export function craftIndustrial(id,recipe,[w,h,d]) {
  const P=[],S=recipe.supportHeight,done=(method,...extra)=>({parts:P,method,sized:true,...(extra.length?{materials:finishes(...extra)}:{})});
  switch(id) {
  case 'generator': {
    for(const s of [-1,1])P.push(curve([[s*.37,.03,-.24],[s*.37,.58,-.24],[s*.37,.63,-.2],[s*.37,.63,.2],[s*.37,.58,.24],[s*.37,.03,.24]],.016,'metal'),c(.016,.74,[0,.03,s*.24],'metal','x'),c(.014,.74,[0,.63,s*.2],'metal','x'),...[-1,1].map(q=>rb([.07,.02,.07],[s*.37,.01,q*.24],'black',.006)));
    P.push(b([.7,.02,.44],[0,.06,0],'dark'),rb([.56,.14,.4],[0,.52,0],'red',.05),t([[0,0],[.04,0],[.045,.008],[.04,.02],[0,.022]],[-.14,.59,0],'black'),c(.03,.008,[.12,.594,0],'metal'),b([.004,.004,.04],[.125,.6,0],'black',[0,.6,0]));
    // Engine with finned head, recoil starter and muffler; alternator and outlet panel.
    P.push(rb([.3,.24,.34],[-.19,.21,0],'dark',.02),...along(6,.34,.42).map(y=>b([.2,.007,.26],[-.19,y,0],'dark')),lathe([[0,0],[.11,0],[.11,.03],[.07,.05],[0,.05]],[-.34,.24,.02],'black','x',{rotation:[0,0,PI/2]}),b([.014,.05,.05],[-.4,.33,.02],'black'));
    P.push(c(.05,.26,[-.14,.14,-.2],'metal','x'),c(.016,.08,[.02,.14,-.2],'metal','x'),rb([.12,.1,.08],[-.2,.36,.19],'black',.015),c(.13,.28,[.2,.24,0],'dark','x'),lathe([[0,0],[.13,0],[.1,.03],[0,.04]],[.34,.24,0],'dark','x'),...along(5,.1,.3).map(x=>r(.132,.004,[x,.24,0],'black',[0,PI/2,0])));
    P.push(rb([.24,.2,.02],[.21,.28,.225],'black',.006),...[-.06,.04].map(x=>c(.028,.008,[.21+x,.32,.236],'metal','z')),b([.03,.04,.012],[.3,.32,.236],'red'),c(.03,.008,[.16,.22,.236],'metal','z'),b([.07,.03,.006],[.26,.22,.236],'metal'));
    return done('gerador em quadro tubular com tanque, motor aletado, partida retrátil, silencioso, alternador e painel de tomadas');
  }
  case 'workbench': {
    const back=-.335;
    P.push(...planks(w,.07,d,[0,S-.035,0],4,'wood',.006),b([w,.03,.012],[0,S-.05,.356],'metal'),...[-1,1].flatMap(s=>[-1,1].map(q=>b([.06,S-.07,.06],[s*.84,(S-.07)/2,q*.29],'metal'))),...[-1,1].map(q=>b([1.62,.05,.03],[0,S-.1,q*.29],'metal')));
    P.push(rb([1.66,.025,.56],[0,.22,0],'metal',.008),rb([.5,.3,.56],[.52,S-.22,0],'metal',.008),...[S-.14,S-.29].flatMap(y=>[rb([.46,.13,.014],[.52,y,.286],'dark',.004),pull(.52,y,.29,.2,'metal',.02)]));
    P.push(b([w,.66,.03],[0,S+.35,back],'rust'),...[-1,1].map(s=>b([.05,.68,.04],[s*.875,S+.34,back+.005],'metal')),b([w,.03,.1],[0,S+.665,back+.04],'metal'));
    // Tools on the pegboard.
    const z=back+.03;
    P.push(c(.014,.3,[-.7,S+.33,z],'wood'),b([.11,.04,.035],[-.7,S+.5,z],'dark'),b([.035,.3,.008],[-.52,S+.36,z],'metal',[0,0,.1]),r(.03,.008,[-.535,S+.53,z],'metal'),p([[0,0],[.42,.03],[.42,.1],[.1,.13],[0,.1]],.006,[-.36,S+.42,z],'metal',[0,0,-.3]),rb([.1,.11,.025],[-.38,S+.47,z],'wood',.02));
    P.push(...[.02,.1,.18].flatMap((x,i)=>[c(.014,.1,[x,S+.5,z],i%2?'dark':'wood'),c(.004,.14+i*.03,[x,S+.38-i*.015,z],'metal')]),r(.09,.012,[.42,S+.42,z],'dark'),...[.62,.72].map((x,i)=>b([.014,.22,.01],[x,S+.4,z],'metal',[0,0,i?.12:-.12])),curve([[-.2,S+.6,z],[-.1,S+.5,z+.01],[-.02,S+.62,z]],.006,'dark'));
    // Bench vise.
    P.push(rb([.16,.05,.2],[.6,S+.025,.2],'dark',.01),b([.14,.11,.04],[.6,S+.1,.14],'dark'),b([.14,.11,.04],[.6,S+.1,.26],'dark'),c(.012,.26,[.6,S+.08,.23],'metal','z'),c(.007,.16,[.6,S+.08,.345],'metal','x'),...[-.08,.08].map(x=>e([.02,.02,.02],[.6+x,S+.08,.345],'metal')));
    P.push(rb([.36,.16,.2],[-.45,.31,.05],'red',.015),curve([[-.55,.39,.05],[-.5,.44,.05],[-.4,.44,.05],[-.35,.39,.05]],.008,'metal'),...[.0,.16].map(x=>t([[0,0],[.07,0],[.07,.15],[.065,.16],[0,.16]],[x,.2325,-.05],'metal')),t([[0,0],[.045,0],[.045,.09],[.015,.12],[.012,.15],[0,.15]],[-.6,S,-.12],'metal'));
    return done('bancada com tampo de pranchas, painel de ferramentas penduradas, torno de bancada, gaveteiro e prateleira');
  }
  case 'pallet': {
    P.push(...[-.35,0,.35].map(z=>b([w,.02,.1],[0,.01,z],'wood')),...[-.5,0,.5].map(x=>b([.09,.085,d],[x,.0625,0],'wood')));
    along(7,-.352,.352).forEach((z,i)=>P.push(b([w-(i%3)*.012,.02+(i%2)*.002,.094],[(i%3-1)*.004,.134-(i%2)*.001+.001,z],'wood',[0,(i%3-1)*.006,0]),...(i%2?[]:bolts([-.5,0,.5].map(x=>[x,.1385,z]),.007,'metal',null))));
    return done('palete com sapatas, longarinas, tábuas de topo desalinhadas e pregos');
  }
  case 'pallet-jack': {
    for(const s of [-1,1])P.push(rb([.16,.05,1.12],[s*.24,.105,.18],'red',.012),tb([.16,.03,.08],[s*.24,.095,.705],'red',[1,.5],[PI/2,0,0]),...wheel(.04,.1,[s*.24,.04,.6],{tire:'black',hub:'metal'}),...wheel(.09,.06,[s*.075,.09,-.6],{tire:'black',hub:'metal'}),b([.05,.08,.3],[s*.24,.14,-.42],'red'));
    P.push(rb([w,.16,.22],[0,.2,-.5],'red',.02),c(.045,.3,[0,.4,-.53],'metal'),c(.03,.12,[0,.6,-.53],'metal'),c(.02,.14,[.1,.33,-.5],'metal'),b([.2,.06,.1],[0,.13,-.6],'metal'));
    P.push({...c(.018,.5,[0,.74,-.6],'metal'),rotation:[-.18,0,0]},r(.105,.014,[0,h-.12,-.655],'black'),b([.05,.09,.016],[0,h-.13,-.655],'red'),b([.03,.02,.1],[0,.54,-.57],'metal'));
    return done('paleteira com garfos chanfrados, roletes, unidade hidráulica, rodas direcionais e timão com alça e gatilho');
  }
  case 'tool-chest': {
    const z=.235;
    for(const x of [-1,1])for(const q of [-1,1])P.push(...caster(x*.32,q*.17,.045,'metal','black'));
    P.push(rb([.75,.69,.46],[0,.475,0],'red',.012),rb([w,.035,d],[0,S-.0175,0],'black',.008),b([.7,.66,.004],[0,.475,z-.003],'dark'));
    let y=.16;for(const hh of [.15,.15,.11,.09,.07,.07]){P.push(rb([.68,hh-.012,.016],[0,y+hh/2,z+.004],'red',.004),b([.66,.014,.02],[0,y+hh-.02,z+.014],'metal'));y+=hh;}
    P.push(curve([[.375,.6,-.1],[.4,.6,-.09],[.4,.6,.09],[.375,.6,.1]],.01,'metal'),c(.012,.008,[.3,.79,z+.008],'metal','z'),...[-1,1].flatMap(s=>[-1,1].map(q=>rb([.04,.69,.04],[s*.365,.475,q*.22],'black',.014))));
    return done('carrinho de ferramentas com seis gavetas de puxador contínuo, cantoneiras, alça lateral e rodízios');
  }
  case 'pipe-valve': {
    const z=-.06,x=-.22;
    P.push(c(.07,1.02,[x,.54,z],'rust'),curve([[x,1,z],[x+.005,1.13,z],[x+.06,1.18,z],[x+.17,1.18,z]],.07,'rust'),c(.07,.42,[.13,1.18,z],'rust','x'));
    P.push(t([[0,0],[.13,0],[.13,.03],[.09,.045],[.09,.07],[0,.07]],[x,0,z],'metal'),...polar(6,.11,(u,v)=>c(.012,.014,[x+u,.037,z+v],'metal')),lathe([[0,0],[.11,0],[.11,.03],[.085,.04],[0,.04]],[.3375,1.18,z],'metal','x'),...polar(6,.092,(u,v)=>c(.011,.014,[.38,1.18+u,z+v],'metal','x')));
    for(const y of [.5,.76])P.push(c(.1,.025,[x,y,z],'metal'),...polar(6,.085,(u,v)=>c(.009,.04,[x+u,y,z+v],'metal')));
    // Gate valve with handwheel, bypass line and pressure gauge.
    P.push(e([.2,.2,.2],[x,.63,z],'metal'),c(.04,.12,[x,.63,.03],'metal','z'),c(.012,.1,[x,.63,.11],'metal','z'),r(.085,.012,[x,.63,.155],'red'),...[0,1].map(i=>({...c(.007,.17,[x,.63,.155],'red'),rotation:[0,0,i*PI/2+.3]})),c(.02,.02,[x,.63,.158],'red','z'));
    P.push(curve([[x+.07,.42,z+.02],[x+.14,.44,z+.06],[x+.15,.63,z+.07],[x+.14,.82,z+.06],[x+.07,.84,z+.02]],.012,'copper'),c(.01,.05,[.12,1.26,z+.05],'metal'),...gauge([.12,1.245,z+.075],.038,'metal','white','black'),b([.14,.3,.012],[x,.25,z-.076],'metal'));
    return done('tubulação flangeada com cotovelo, válvula de gaveta com volante, linha de desvio em cobre e manômetro','copper');
  }
  case 'power-panel': {
    const z=.035;
    P.push(rb([w,h,.13],[0,h/2,-.037],'metal',.01),...frame(w*.98,h*.98,.02,[0,h/2,z],'metal',.035),b([.5,.66,.01],[0,h/2,z-.012],'dark'),...[.5,.27].map(y=>b([.44,.012,.008],[0,y,z-.004],'metal')));
    for(const y of [.5,.27])along(6,-.17,.17).forEach((x,i)=>P.push(rb([.05,.09,.03],[x,y,z+.006],'white',.005),b([.018,.03,.016],[x,y+((i+(y>.4?1:0))%3?.012:-.012),z+.024],'black',[(i%3?-.3:.3),0,0])));
    P.push(rb([.11,.1,.035],[-.14,.66,z+.008],'white',.006),b([.04,.045,.02],[-.14,.672,z+.03],'red',[-.3,0,0]),...gauge([.12,.66,z+.004],.04,'metal','paper','black'),...[.02,.06].map((x,i)=>e([.016,.016,.012],[x-.02,.69,z],i?'screen':'red')),b([.44,.028,.004],[0,.385,z-.005],'paper'),b([.44,.028,.004],[0,.155,z-.005],'paper'));
    // Loom dropping to the gland plate.
    for(const [x,slot] of [[-.2,'black'],[-.16,'red'],[.18,'black'],[.21,'violet']])P.push(curve([[x,.22,z-.004],[x+.01,.12,z+.004],[x*.6,.05,z-.004]],.006,slot));
    P.push(p([[-.045,0],[.045,0],[0,.075]],.006,[.17,.08,z-.004],'paper'),b([.008,.03,.003],[.17,.105,z],'black'),...[.2,.55].map(y=>c(.01,.06,[w/2-.01,y,z+.004],'metal')));
    return done('quadro elétrico com disjuntores individuais, chave geral, medidor, sinaleiros, etiquetas e chicote de cabos');
  }
  case 'water-tank': {
    const R=y=>.64+(y-.03)*.056;
    P.push(t([[0,0],[.62,0],[.64,.03],[.7,1.1],[.72,1.12],[.72,1.16],[.7,1.16]],[0,0,0],'cloth'),...[.3,.58,.86].map(y=>r(R(y)+.004,.016,[0,y,0],'cloth',FLAT)));
    P.push(t([[0,.07],[.2,.062],[.5,.035],[.72,0],[.74,0],[.74,-.03],[.72,-.03]],[0,1.165,0],'dark'),t([[0,0],[.11,0],[.11,.022],[.03,.03],[0,.03]],[0,1.233,0],'metal'),...polar(8,.6,(u,v,a)=>b([.04,.012,.2],[u,1.19,v],'dark',[0,-a+PI/2,0])));
    P.push(c(.06,.03,[.665,.17,0],'metal','x'),c(.03,.1,[.71,.17,0],'metal','x'),e([.07,.07,.07],[.71,.17,0],'metal'),b([.014,.09,.03],[.71,.24,0],'red',[0,0,.5]),c(.035,.2,[-.6,1.02,.36],'metal'),curve([[-.6,.92,.36],[-.66,.5,.4],[-.66,.02,.4]],.03,'metal'));
    return done('reservatório cônico com cintas, tampa abaulada, registro de saída e tubo de extravasão');
  }
  case 'fuel-pump': {
    const x=-.04,z=d*.45;
    P.push(rb([.6,.12,d],[x,.06,0],'dark',.015),rb([.48,.86,d*.82],[x,.55,0],'red',.03),b([.5,.03,d*.86],[x,.985,0],'metal'),rb([.6,.5,d*.9],[x,1.25,0],'white',.04),rb([.5,.03,d*.74],[x,h-.015,0],'red',.01));
    P.push(rb([.44,.22,.012],[x,1.3,z],'black',.008),...[1.335,1.265].flatMap(y=>[b([.3,.055,.004],[x,y,z+.007],'paper'),...along(4,-.09,.09).map(q=>b([.004,.055,.002],[x+q+.0375,y,z+.01],'black'))]),b([.3,.05,.006],[x,1.1,z],'metal'));
    P.push(c(.1,.01,[x,.72,d*.41+.002],'white','z'),c(.07,.012,[x,.72,d*.41+.004],'red','z'),...frame(.4,.36,.008,[x,.38,d*.41+.002],'red',.02),c(.01,.008,[x+.16,.38,d*.41+.006],'metal','z'),b([.48,.05,.006],[x,.15,d*.41+.002],'metal'));
    // Nozzle in its holster and the hose loop.
    P.push(rb([.06,.2,.12],[.23,.85,0],'black',.015),rb([.04,.13,.05],[.275,.9,.02],'black',.012),curve([[.275,.96,.03],[.29,1.01,.08],[.29,.97,.14]],.012,'metal'),curve([[.26,1.2,-.08],[.33,.9,-.1],[.32,.45,-.03],[.3,.5,.05],[.28,.83,.03]],.014,'black'),c(.025,.04,[.26,1.2,-.08],'metal','x'));
    return done('bomba de combustível com mostradores de tambor, emblema, porta de serviço, bico no suporte e mangueira');
  }
  case 'oil-pump': {
    const tilt=[0,0,-.12];
    P.push(...[-.4,.4].map(z=>b([2.4,.12,.16],[-.05,.06,z],'dark')),...along(4,-1.1,1).map(x=>b([.16,.1,.96],[x,.06,0],'dark')));
    for(const s of [-1,1])P.push(curve([[-.5,.12,s*.36],[-.05,1.88,s*.09]],.05,'metal'),curve([[.4,.12,s*.36],[-.05,1.88,s*.09]],.05,'metal'),curve([[-.28,1,s*.22],[.18,1,s*.22]],.03,'metal'),curve([[-.5,1.02,s*.42],[-1.15,2.1,s*.2]],.03,'metal'),c(.3,.08,[-.62,.82,s*.38],'dark','z'),b([.62,.14,.05],[-.68,.7,s*.33],'dark',[0,0,.75]),c(.006,1.18,[1.26,1.35,s*.04],'metal'));
    P.push(c(.07,.36,[-.05,1.92,0],'dark','z'),b([2.3,.16,.18],[-.05,2.02,0],'rust',tilt),b([2.3,.03,.24],[-.05,2.1,0],'rust',tilt),b([2.3,.03,.24],[-.05,1.94,0],'rust',tilt),c(.04,.5,[-1.15,2.12,0],'metal','z'));
    P.push(p([[.95,1.95],[1.08,2.04],[1.22,1.98],[1.3,1.75],[1.28,1.52],[1.16,1.44],[1.04,1.6]],.22,[0,0,0],'rust'),b([.2,.03,.14],[1.26,.78,0],'metal'),c(.015,.5,[1.26,.53,0],'metal'),t([[0,0],[.1,0],[.1,.04],[.06,.06],[.06,.2],[.09,.22],[.09,.28],[.03,.3],[0,.3]],[1.26,0,0],'dark'),c(.035,.4,[1.26,.16,-.24],'dark','z'),r(.06,.01,[1.26,.16,-.36],'red'));
    P.push(rb([.5,.45,.6],[-.8,.38,0],'metal',.03),c(.06,.84,[-.62,.56,0],'dark','z'),c(.13,.3,[-1.1,.28,0],'dark','z'),rb([.5,.4,.06],[-.95,.42,.46],'rust',.04),b([.26,.1,.34],[-1.1,.13,0],'dark'),...bolts([[-.6,.5,.31],[-1,.5,.31],[-.6,.26,.31],[-1,.26,.31]],.02,'dark'));
    return done('cavalete de bombeio com viga oscilante, cabeça de cavalo, torre em A, manivelas com contrapesos, redutor e cabeça de poço');
  }
  case 'dumpster': {
    const lean=.09;
    P.push(tb([1.3,.86,.78],[0,.58,0],'cloth',[1.15,1.2]),...[-1,1].flatMap(s=>[b([1.52,.05,.05],[0,1.02,s*.47],'cloth'),b([.05,.05,.94],[s*.74,1.02,0],'cloth'),rb([.07,.16,.56],[s*.735,.62,0],'dark',.012),...along(4,-.5,.5).map(x=>b([.04,.84,.025],[x,.58,s*.435],'cloth',[s*lean,0,0]))]));
    for(const x of [-1,1])for(const q of [-1,1])P.push(...caster(x*.55,q*.3,.07,'dark','black'));
    P.push(rb([.78,.03,.99],[-.39,1.065,0],'dark',.012),rb([.78,.03,.99],[.39,1.1,0],'dark',.012,[-.12,0,0]),c(.015,1.56,[0,1.06,-.49],'dark','x'),...[-.39,.39].map((x,i)=>pull(x,1.08+i*.09,.46,.3,'dark',.03)));
    P.push(b([.36,.28,.006],[-.2,.66,.446],'paper',[lean,0,0]),p([[0,.1],[.09,-.05],[-.09,-.05]],.006,[-.2,.67,.452],'black',[lean,0,0]),e([.4,.24,.36],[.36,1,.2],'black'),e([.3,.2,.3],[.5,.98,-.15],'black'),e([.08,.06,.08],[.36,1.11,.2],'black'));
    return done('caçamba trapezoidal com nervuras, encaixes de içamento, tampas articuladas, rodízios e sacos à mostra');
  }
  case 'barrier': {
    const face=.153,concrete=surf(recipe,'stone','concrete',{textureSize:1.4,relief:.012});
    P.push(...withSurface([side([[-.325,0],[.325,0],[.325,.08],[.2,.3],[.12,.82],[.1,.85],[-.1,.85],[-.12,.82],[-.2,.3],[-.325,.08]],w,0,'stone')],concrete));
    for(const s of [-1,1])P.push(...along(3,-.6,.6).map(x=>b([.26,.13,.008],[x,.6,s*.158],'paper',spin(['z',-.5],['x',-s*face]))),...[-.5,.5].map(x=>b([.22,.06,.02],[x,.03,s*.318],'dark')),r(.05,.012,[s*(w/2+.004),.5,0],'metal',[0,PI/2,0]),r(.05,.012,[s*(w/2+.004),.25,0],'metal',[0,PI/2,0]));
    P.push(...withSurface([rock([.12,.06,.08],[-.7,.08,.27],'stone',31,'fractured'),rock([.07,.04,.06],[-.55,.08,.28],'stone',33,'fractured'),rock([.1,.05,.07],[.8,.08,-.27],'stone',35,'fractured')],concrete));
    return done('barreira de perfil New Jersey com faixas refletivas, rasgos de içamento, alças de ligação e lascas de concreto');
  }
  case 'traffic-cone': {
    const R=y=>.14-(y-.035)*.105/.485;
    P.push(rb([w,.03,d],[0,.015,0],'black',.012),t([[.15,.03],[.14,.036],[.035,.52],[.03,h],[.022,h]],[0,0,0],'rust'),t([[R(.3)+.002,.3],[R(.39)+.002,.39]],[0,0,0],'white'),t([[R(.44)+.002,.44],[R(.48)+.002,.48]],[0,0,0],'white'),...polar(4,.2,(u,v)=>c(.02,.006,[u,.003,v],'black'),PI/4));
    return {...done('cone oco com base de borracha, colarinhos refletivos e pés'),matte:['rust']};
  }
  case 'streetlamp': {
    const x=-.26;
    P.push(t([[0,0],[.2,0],[.2,.03],[.12,.06],[.09,.4],[.07,.45],[0,.45]],[x,0,0],'dark'),...polar(4,.16,(u,v)=>c(.014,.03,[x+u,.045,v],'metal'),PI/4),b([.07,.16,.01],[x,.24,.098],'metal'),c(.055,2.72,[x,1.79,0],'metal',null,.04),r(.06,.012,[x,.47,0],'dark',FLAT));
    P.push(curve([[x,3.1,0],[x+.02,3.24,0],[x+.16,3.29,0],[x+.36,3.28,0],[x+.46,3.265,0]],.028,'metal'),curve([[x+.04,2.85,0],[x+.2,2.98,0],[x+.26,3.2,0]],.012,'dark'),rb([.42,.08,.24],[.27,3.255,0],'dark',.035),e([.3,.05,.18],[.27,3.21,0],'flame'));
    // Weathered posters taped to the pole.
    P.push(b([.11,.15,.004],[x,1.45,.052],'paper',[0,0,.05]),b([.07,.06,.003],[x,1.475,.055],'dark',[0,0,.05]),b([.1,.12,.004],[x+.004,1.2,.053],'paper',[0,0,-.08]),...[1.52,1.38].map(y=>b([.03,.012,.004],[x,y,.056],'white')));
    return done('poste cônico com base de ferro, braço curvo com mão-francesa, luminária e cartazes colados');
  }
  case 'sewer-grate': {
    P.push(b([.74,.004,.54],[0,.002,0],'black'),...[-1,1].flatMap(s=>[b([w,h,.04],[0,h/2,s*.28],'metal'),b([.04,h,.52],[s*.38,h/2,0],'metal')]),...along(9,-.22,.22).map(z=>b([.72,.028,.022],[0,.016,z],'dark')),...[-.14,.14].map(x=>b([.02,.02,.5],[x,.012,0],'dark')));
    P.push(...bolts([-1,1].flatMap(s=>[-1,1].map(q=>[s*.38,h-.011,q*.28])),.012,'dark',null),b([.07,.036,.02],[0,.018,.3],'metal'));
    return done('grade de ferro com quadro, barras, travessas e parafusos sobre o poço escuro');
  }
  case 'phone-booth': {
    const cy=1.87,cz=.1,gap=1.9,shell=k=>[[0,.48],[.2,.45],[.33,.33],[.375,.1],[.36,-.2],[.3,-.42],[.26,-.45]].map(([q,y])=>[q*k,y*k]);
    P.push(rb([.4,.06,.4],[0,.03,-.34],'stone',.012),c(.045,1.5,[0,.78,-.34],'metal'),...bolts(polar(4,.15,(u,v)=>[[u,.06,-.34+v]],PI/4),.014,'metal',null),b([.08,.1,.16],[0,1.5,-.3],'metal'));
    // Fibreglass egg shell, open towards the user, with its inner lining.
    P.push({...t(shell(1),[0,cy,cz],'rust'),start:gap/2,arc:TAU-gap,segments:28},{...t(shell(.96),[0,cy,cz],'cloth'),start:gap/2,arc:TAU-gap,segments:28});
    P.push(rb([.2,.3,.11],[0,1.72,-.15],'dark',.015),curve([[-.07,1.84,-.08],[-.08,1.76,-.06],[-.08,1.66,-.06],[-.07,1.58,-.08]],.014,'black'),...[1.85,1.57].map(y=>e([.05,.05,.05],[-.07,y,-.08],'black')),curve([[-.07,1.56,-.08],[-.1,1.46,-.05],[-.04,1.44,-.07],[-.02,1.58,-.10]],.005,'black'));
    for(let i=0;i<3;i++)for(let j=0;j<4;j++)P.push(b([.022,.018,.008],[.03+(i-1)*.03,1.76-j*.026,-.092],'white',null,.003));
    P.push(b([.04,.008,.006],[.03,1.82,-.092],'metal'),rb([.06,.04,.012],[.03,1.62,-.092],'metal',.004),b([.3,.012,.14],[0,1.5,-.11],'black'),b([.22,.03,.11],[0,1.52,-.11],'paper'));
    return {...done('orelhão com concha de fibra aberta, forro interno, aparelho com monofone e teclado, prateleira e poste'),matte:['rust']};
  }
  case 'bus-stop': {
    const cx=-.14,back=-.5;
    P.push(side([...along(7,-.65,.65).map(z=>[z,2.3+.09*(1-(z/.65)**2)]),...along(7,.65,-.65).map(z=>[z,2.25+.09*(1-(z/.65)**2)])],2.6,cx,'metal'),...[-1,1].map(s=>b([2.6,.07,.03],[cx,2.28,s*.64],'dark')));
    for(const x of [-1.24,.96])P.push(b([.08,2.3,.08],[x,1.15,back],'metal'),c(.03,2.3,[x,1.15,.5],'metal'),b([.06,.06,1],[x,2.26,0],'metal'));
    P.push(b([2.12,.42,.02],[cx,.38,back],'cloth'),...along(3,-.84,.56).flatMap(x=>[b([.68,1.42,.012],[x,1.33,back],'pane'),b([.03,1.5,.04],[x+.35,1.33,back],'metal')]),b([2.12,.04,.04],[cx,.61,back],'metal'),b([2.12,.04,.04],[cx,2.06,back],'metal'));
    P.push(b([.012,1.5,.9],[-1.24,1.3,0],'pane'),b([.03,.04,.92],[-1.24,.55,0],'metal'));
    // Bench, lit advertising panel, and the stop sign with timetable.
    P.push(...[-.42,-.3,-.18].map(z=>rb([1.5,.03,.1],[-.4,.46,z],'metal',.01)),...[-1,.2].map(x=>b([.05,.45,.3],[x,.225,-.3],'metal')),c(.02,1.5,[-.4,.8,-.45],'metal','x'));
    P.push(...frame(.95,1.3,.07,[.46,1.3,back+.06],'dark',.04),b([.88,1.22,.01],[.46,1.3,back+.08],'paper'),b([.6,.1,.004],[.46,1.75,back+.087],'dark'),b([.5,.4,.004],[.46,1.35,back+.087],'white'),...[.95,.87].map(y=>b([.7,.03,.004],[.46,y,back+.087],'dark')));
    P.push(c(.03,2.5,[1.26,1.25,.45],'metal'),rb([.34,.34,.02],[1.26,2.38,.45],'dark',.05),c(.11,.006,[1.26,2.38,.462],'white','z'),b([.2,.3,.012],[1.26,1.6,.47],'white'),t([[0,0],[.1,0],[.13,.36],[.135,.36]],[1.26,.5,.3],'dark'));
    return done('abrigo de ônibus com cobertura arqueada, fechamento de vidro, banco, painel publicitário e placa com horários','pane');
  }
  case 'fire-hydrant': {
    const nozzle=[[0,0],[.045,0],[.045,.06],[.055,.06],[.055,.09],[.02,.09],[.02,.105],[0,.105]];
    P.push(t([[0,0],[.13,0],[.13,.03],[.1,.05],[.095,.1],[.085,.12],[.085,.5],[.1,.52],[.11,.56],[.1,.6],[.08,.66],[.04,.7],[0,.71]],[0,0,0],'red'),c(.024,.06,[0,.74,0],'metal'),...polar(6,.115,(u,v)=>c(.011,.016,[u,.036,v],'metal')),r(.088,.008,[0,.3,0],'red',FLAT));
    P.push(lathe([[0,0],[.06,0],[.06,.06],[.07,.06],[.07,.1],[.03,.1],[.03,.115],[0,.115]],[0,.42,.06],'red','z'),c(.02,.02,[0,.42,.18],'metal','z'));
    for(const s of [-1,1])P.push({...t(nozzle,[s*.11,.42,0],'red'),rotation:[0,0,-s*PI/2]},c(.014,.016,[s*.222,.42,0],'metal','x'),...chain([s*.21,.39,.02],[s*.085,.27,.03],.012,'metal'));
    return done('hidrante com corpo torneado, três bocais com tampões presos por correntes, porca de manobra e flange aparafusado');
  }
  case 'trash-can': {
    const cz=.03,R=y=>.19+(y-.5)*.07;
    P.push(rb([.16,.02,.16],[0,.01,-.21],'dark',.006),c(.035,1.02,[0,.53,-.21],'dark'),e([.08,.07,.08],[0,1.045,-.21],'dark'),b([.05,.05,.24],[0,.85,-.1],'dark'));
    P.push(...polar(18,1,(u,v,a)=>({...b([.045,.5,.006],[u*R(.75),.75,cz+v*R(.75)],'cloth',spin(['x',-.07],['y',-a+PI/2]))})),c(.19,.02,[0,.5,cz],'cloth'),...[.56,.85,1].map(y=>r(R(y)+.004,.01,[0,y,cz],'dark',FLAT)));
    P.push(t([[0,.06],[.17,.06],[.2,.47],[.225,.5],[.24,.47]],[0,.5,cz],'black',null,{segments:18}),rock([.14,.08,.12],[.03,.97,cz],'paper',5,'fractured'),t([[0,0],[.03,0],[.04,.1],[.042,.1]],[-.08,.96,cz+.04],'white',null,{segments:12}),{...c(.004,.1,[-.08,1.03,cz+.04],'red'),rotation:[.3,0,.2]});
    return done('lixeira de ripas em poste com cintas, saco interno, papel amassado e copo descartado');
  }
  case 'shopping-cart': {
    const loop=k=>({y:.45+k*.45,x:.25+k*.02,f:.4+k*.06,q:-.36-k*.04}),wire=(a,bb)=>curve([a,bb],.005,'metal');
    for(const k of [0,.33,.66,1]){const {y,x,f,q}=loop(k),t0=k===1?.008:.005;P.push(curve([[-x,y,q],[-x,y,f]],t0,'metal'),curve([[x,y,q],[x,y,f]],t0,'metal'),curve([[-x,y,f],[x,y,f]],t0,'metal'),curve([[-x,y,q],[x,y,q]],t0,'metal'));}
    const lo=loop(0),hi=loop(1);
    P.push(...along(7,-1,1).flatMap(u=>[wire([u*lo.x,lo.y,lo.f],[u*hi.x,hi.y,hi.f]),wire([u*lo.x,lo.y,lo.q],[u*hi.x,hi.y,hi.q])]),...along(8,0,1).flatMap(u=>[-1,1].map(s=>wire([s*lo.x,lo.y,lo.q+(lo.f-lo.q)*u],[s*hi.x,hi.y,hi.q+(hi.f-hi.q)*u]))));
    P.push(...along(5,-.2,.2).map(x=>wire([x,lo.y,lo.q],[x,lo.y,lo.f])),...along(3,-.2,.25).map(z=>wire([-lo.x,lo.y,z],[lo.x,lo.y,z])));
    // Chassis, lower rack, handle and child seat flap.
    for(const s of [-1,1])P.push(curve([[s*.22,.12,-.36],[s*.24,.5,-.4],[s*.27,1.0,-.44]],.012,'metal'),curve([[s*.22,.12,-.36],[s*.22,.14,.42]],.012,'metal'),curve([[s*.22,.14,.42],[s*.25,.45,.4]],.01,'metal'),...caster(s*.22,-.34,.05,'metal','black'),...caster(s*.22,.4,.05,'metal','black'));
    P.push(...along(3,-.12,.12).map(x=>wire([x,.14,-.36],[x,.14,.42])),curve([[-.22,.14,.42],[.22,.14,.42]],.012,'metal'),c(.016,w,[0,h-.018,-.44],'red','x'),b([.4,.18,.008],[0,.8,-.34],'red',[.15,0,0]),rb([.07,.04,.05],[.18,h-.03,-.44],'red',.01));
    return done('carrinho de supermercado em arame com cesto afunilado, chassi tubular, grade inferior, alça e rodízios');
  }
  case 'bicycle': {
    const bb=[0,.3,-.08],seat=[0,.78,-.2],head=[0,.86,.3],neck=[0,.72,.33],tube=(a,bb2,q=.014,slot='red')=>curve([a,bb2],q,slot);
    for(const z of [-.52,.52])P.push(...spokedWheel(.33,.016,[0,.33,z],{axis:'x',spokes:8,hub:.09}),r(.3,.007,[0,.33,z],'metal',[0,PI/2,0]),{shape:'arch',innerRadius:.348,outerRadius:.356,start:z<0?.5:.9,end:z<0?2.9:2.5,depth:.05,segments:12,position:[0,.33,z],rotation:[0,-PI/2,0],material:'red'});
    P.push(tube(seat,head),tube(bb,neck,.016),tube(bb,seat,.015),tube(head,neck,.018),c(.012,.14,[0,.84,-.215],'metal'),c(.012,.12,[0,.91,.29],'metal'));
    for(const s of [-1,1])P.push(tube([s*.03,.3,-.1],[s*.045,.33,-.52],.01),tube([s*.02,.76,-.21],[s*.045,.33,-.52],.009),curve([[s*.03,.72,.33],[s*.04,.5,.43],[s*.045,.33,.52]],.011,'red'),b([.012,.17,.02],[s*.07,.3-s*.085,-.08],'metal'),rb([.07,.016,.05],[s*.1,.3-s*.17,-.08],'black',.006),c(.016,.1,[s*.24,.945,.26],'black','x'));
    P.push(e([.14,.05,.26],[0,.9,-.24],'black'),e([.07,.04,.12],[0,.895,-.13],'black'),curve([[-.25,.94,.26],[-.2,.965,.33],[0,.96,.36],[.2,.965,.33],[.25,.94,.26]],.011,'metal'),t([[0,0],[.028,0],[.028,.012],[.014,.026],[0,.028]],[.1,.975,.34],'metal',null,{segments:12}));
    P.push(c(.09,.006,[.05,.3,-.08],'metal','x'),c(.035,.01,[.05,.33,-.52],'metal','x'),b([.006,.012,.45],[.05,.375,-.3],'black',[-.12,0,0]),b([.006,.012,.44],[.05,.245,-.3],'black',[.13,0,0]),rb([.012,.06,.36],[.062,.39,-.28],'red',.005,[-.1,0,0]));
    // Rear rack and kickstand.
    P.push(...[-.05,0,.05].map(x=>tube([x,.7,-.25],[x,.7,-.7],.006,'metal')),...[-1,1].map(s=>tube([s*.05,.7,-.66],[s*.045,.34,-.52],.006,'metal')),tube([.03,.3,-.14],[.14,.02,-.24],.008,'metal'));
    return done('bicicleta com quadro tubular, rodas raiadas, para-lamas, transmissão por corrente, selim, guidão curvo e bagageiro');
  }
  case 'well': {
    const stone=surf(recipe,'stone','rock',{rockPattern:'granite',textureSize:.7,relief:.02,rockCracks:.2});
    for(let course=0;course<2;course++)P.push(...withSurface(polar(11,.6,(u,v,a,i)=>rock([.36,.37,.25],[u,course*.35,v],'stone',70+i+course*13,'fractured',[0,-a+PI/2,0]),course*.28),stone));
    P.push(...withSurface(polar(10,.6,(u,v,a)=>rb([.4,.08,.3],[u,.75,v],'stone',.025,[0,-a+PI/2,0])),stone),t([[.47,0],[.47,.72]],[0,.02,0],'dark'),c(.47,.01,[0,.34,0],'glass'));
    for(const s of [-1,1])P.push(b([.1,.86,.1],[s*.62,1.2,0],'wood'),b([.07,.5,.07],[s*.42,1.33,0],'wood',[0,0,s*.75]),p([[-.6,0],[0,.42],[.6,0]],.04,[s*.72,1.22,0],'wood',[0,PI/2,0]));
    // Windlass with crank, rope and bucket; plank roof.
    P.push(c(.07,1.14,[0,1.08,0],'wood','x'),...along(6,-.12,.12).map(x=>r(.078,.012,[x,1.08,0],'paper',[0,PI/2,0])),c(.008,.42,[.03,.86,.07],'paper'),curve([[.57,1.08,0],[.72,1.08,0],[.74,.95,.04],[.74,.9,.06]],.012,'metal'),c(.018,.1,[.79,.9,.06],'wood','x'));
    P.push(t([[0,0],[.1,0],[.13,.22],[.135,.22]],[.03,.43,.07],'wood',null,{segments:14}),r(.118,.006,[.03,.53,.07],'metal',FLAT),r(.132,.006,[.03,.63,.07],'metal',FLAT),curve([[-.1,.65,.07],[.03,.74,.07],[.16,.65,.07]],.006,'metal'));
    for(const s of [-1,1])P.push(...along(4,.12,.5).map((z,i)=>b([w,.025,.17],[0,1.61-i*.105,s*z],'wood',[s*.62,0,0])));
    P.push(b([w,.05,.06],[0,1.635,0],'wood'));
    return done('poço de pedras irregulares com sarilho, corda enrolada, balde com aros, manivela e telhado de tábuas','glass');
  }
  case 'hay-bale': {
    const straw=surf(recipe,'paper','grass',{textureSize:.45,relief:.02});
    along(8,-.4375,.4375).forEach((x,i)=>P.push(...withSurface([rb([.127,S-(i%3)*.012,.65-(i%2)*.014],[x,(S-(i%3)*.012)/2,0],'paper',.03)],straw)));
    P.push(...[-.3,.3].map(x=>rb([.016,h,d],[x,h/2,0],'wood',.005)),{shape:'foliage',style:'grass',size:[.9,.09,.6],position:[0,S*.5,0],count:36,seed:91,material:'paper'});
    return done('fardo em fatias prensadas com textura de palha, barbantes e fios soltos');
  }
  case 'handcart': {
    const cz=-.53;
    for(const s of [-1,1]) {
      const x=s*.64;
      P.push(r(.37,.03,[x,.4,cz],'dark',[0,PI/2,0]),lathe([[0,-.07],[.05,-.07],[.07,-.03],[.07,.03],[.05,.07],[0,.07]],[x,.4,cz],'wood','x'),...[0,1,2,3,4].map(i=>({...c(.016,.7,[x,.4,cz],'wood'),rotation:[i*PI/5,0,0]})));
      P.push(b([.06,.06,d],[s*.38,.47,0],'wood'),b([.03,.07,1.5],[s*.51,.87,cz],'wood'),b([.03,.07,1.5],[s*.51,.7,cz],'wood'),...along(4,-.68,.68).map(z=>b([.04,.4,.04],[s*.51,.73,cz+z],'wood')),c(.025,.16,[s*.38,.47,1.24],'dark','z'));
    }
    P.push(c(.03,1.3,[0,.4,cz],'dark','x'),...along(5,-.42,.42).map((x,i)=>b([.2,.035,1.5-(i%2)*.02],[x,.53,cz],'wood')),...along(3,-.6,.6).map(z=>b([1.05,.05,.07],[0,.485,cz+z],'wood')),b([1.05,.34,.03],[0,.72,cz-.74],'wood'),b([1.05,.2,.03],[0,.65,cz+.74],'wood'));
    P.push(b([.05,.44,.05],[0,.24,.6],'wood',[.15,0,0]),b([.82,.05,.05],[0,.47,.6],'wood'),e([.42,.24,.56],[-.2,.66,cz-.2],'cloth',[0,.2,0]),e([.4,.22,.5],[.18,.65,cz+.25],'cloth',[0,-.3,0]),e([.36,.2,.44],[-.05,.82,cz+.02],'cloth',[0,1.2,0]),...[[-.2,.78,cz-.42],[.18,.76,cz+.46]].map(q=>e([.07,.07,.07],q,'cloth')));
    return done('carroça com rodas raiadas de madeira, varais, grades de fueiros, descanso e sacos de carga');
  }
  case 'campfire': {
    const stone=surf(recipe,'stone','rock',{rockPattern:'granite',textureSize:.5,relief:.02,rockCracks:.25});
    P.push(...withSurface(polar(10,.42,(u,v,a,i)=>rock([.2,.11+(i%3)*.025,.16],[u,0,v],'stone',40+i,'rounded',[0,-a,0])),stone),c(.33,.012,[0,.006,0],'soot'),...polar(5,.1,(u,v,a)=>({...c(.035,.42,[u,.17,v],'wood'),rotation:spin(['z',.5],['y',-a])}),.3));
    P.push({...c(.04,.46,[-.24,.06,.14],'wood'),rotation:[0,.6,PI/2]},{...c(.035,.4,[.2,.055,-.2],'wood'),rotation:[0,-.4,PI/2]},...polar(5,.1,(u,v)=>e([.06,.06,.06],[u*1.5,.03,v*1.5],'ember'),.3));
    P.push(fire(0,.1,0,.1,.385),fire(.08,.08,.04,.07,.3,'flame',[0,0,-.15]),fire(-.08,.08,-.03,.065,.27,'flame',[0,0,.18]),fire(.02,.08,-.09,.05,.22,'flame',[-.2,0,0]),fire(-.03,.08,.09,.045,.2,'flame',[.2,0,0]),...[[.05,.44,.02],[-.04,.47,-.03],[.01,.48,.05]].map(q=>e([.016,.022,.016],q,'ember')));
    return done('fogueira com anel de pedras roliças, lenha em tenda, cinzas, brasas e chamas em camadas','soot','ember');
  }
  case 'wooden-fence': {
    const z=.05;
    P.push(...[-.95,0,.95].flatMap((x,i)=>[tb([.1,1.04,.1],[x,.52,-.02],'wood',[.86,.86],[0,0,(i-1)*.015]),tb([.086,.06,.086],[x+(i-1)*.014,1.07,-.02],'wood',[.3,.3])]));
    P.push(b([2,.1,.035],[0,.86,z],'wood',[0,0,.008]),b([1.02,.1,.035],[.47,.36,z],'wood',[0,0,-.01]),b([.9,.1,.035],[-.5,.57,z],'dark',[0,0,-.14]),b([.3,.1,.035],[-.82,.36,z],'wood',[0,0,.02]));
    P.push(...bolts([-.95,0,.95].flatMap(x=>[[x,.86,z+.018],[x,.37,z+.018]]),.009,'metal'),curve(along(9,-1,1).map((x,i)=>[x,1+(i%2?.012:-.008)-Math.abs(x)*.02+.02,-.02]),.005,'metal'),...along(7,-.8,.8).map(x=>b([.004,.03,.03],[x,1.01-Math.abs(x)*.02,-.02],'metal',[.6,0,.5])));
    return done('cerca rústica com mourões afilados, tábuas pregadas, uma tábua solta e arame farpado');
  }
  case 'water-pump': {
    const z=-.03,stone=surf(recipe,'stone','rock',{rockPattern:'granite',textureSize:.6,relief:.01,rockCracks:.15});
    P.push(...withSurface([rb([w,.3,.6],[0,.15,z],'stone',.02)],stone),t([[0,0],[.11,0],[.11,.025],[.07,.05],[.065,.5],[.08,.52],[.09,.56],[.09,.72],[.075,.74],[0,.74]],[0,.3,z],'dark'),...polar(4,.09,(u,v)=>c(.012,.016,[u,.33,z+v],'metal'),PI/4));
    P.push(curve([[0,.9,z+.06],[0,.92,.2],[0,.86,.3],[0,.8,.33]],.035,'dark'),b([.03,.14,.09],[0,1.1,z-.03],'dark'),curve([[0,1.1,z+.02],[0,1.17,-.22],[0,h-.03,-.44],[0,1.2,-.58]],.018,'dark'),c(.012,.2,[0,1.05,z+.02],'metal'),e([.05,.05,.05],[0,1.19,-.59],'dark'));
    P.push(t([[0,0],[.11,0],[.14,.24],[.145,.24]],[0,0,.42],'metal',null,{segments:20}),c(.125,.005,[0,.19,.42],'glass'),curve([[-.14,.24,.42],[-.1,.33,.44],[.1,.33,.44],[.14,.24,.42]],.006,'metal'),r(.128,.005,[0,.12,.42],'metal',FLAT));
    return done('bomba manual de ferro fundido com alavanca curva, bica, haste do êmbolo, base de pedra e balde com água','glass');
  }
  case 'log-pile': {
    const bark=slot=>surf(recipe,slot,'bark',{textureSize:.5,relief:.03});let n=0;
    for(const [count,y] of [[4,.09],[3,.25],[2,.41]])for(const z of along(count,-(count-1)*.09,(count-1)*.09)) {
      const slot=n%2?'dark':'wood',len=1.06-(n%3)*.035,x=(n%3-1)*.012,q=.086+(n%2)*.004;n++;
      P.push(...withSurface([c(q,len,[x,y,z],slot,'x')],bark(slot)),...[-1,1].flatMap(s=>[c(q*.9,.012,[x+s*len/2,y,z],'paper','x'),r(q*.45,.003,[x+s*(len/2+.006),y,z],'wood',[0,PI/2,0])]));
    }
    // A split half-log on top and stakes holding the stack.
    P.push(...withSurface([{...lathe([[0,-.5],[.085,-.5],[.085,.5],[0,.5]],[0,.56,.0],'wood','x'),arc:PI,start:-PI/2}],bark('wood')),b([1,.008,.168],[0,.561,0],'paper'),...[-1,1].flatMap(s=>[-.35,.35].map(x=>tb([.05,.6,.05],[x,.3,s*.335],'wood',[.6,.6]))));
    return done('pilha de toras com casca, topos serrados com anéis, meia tora rachada e estacas de contenção');
  }
  case 'wheelbarrow': {
    P.push(...wheel(.18,.08,[0,.18,.63],{tire:'black',hub:'metal'}),c(.012,.2,[0,.18,.63],'metal','x'));
    for(const s of [-1,1])P.push(curve([[s*.08,.18,.63],[s*.2,.36,.2],[s*.27,.5,-.4],[s*.3,.56,-.74]],.02,'wood'),c(.024,.12,[s*.3,.565,-.76],'black','z'),curve([[s*.24,.45,-.28],[s*.27,.2,-.38],[s*.27,.02,-.35]],.012,'metal'),rb([.06,.014,.1],[s*.27,.007,-.35],'metal',.005));
    P.push(c(.01,.54,[0,.2,-.38],'metal','x'),b([.36,.02,.6],[0,.47,.08],'rust'));
    // Tub from four sloped sheets with a rolled rim, carrying a load of earth.
    P.push(b([.5,.33,.02],[0,.62,.44],'rust',[.42,0,0]),b([.46,.3,.02],[0,.61,-.26],'rust',[-.3,0,0]),...[-1,1].map(s=>b([.02,.32,.74],[s*.265,.62,.09],'rust',[0,0,-s*.5])),...[-1,1].map(s=>curve([[s*.34,.765,-.3],[s*.345,.77,.5]],.012,'metal')),curve([[-.34,.765,.5],[.34,.765,.5]],.012,'metal'),curve([[-.34,.765,-.3],[.34,.765,-.3]],.012,'metal'));
    P.push(rock([.52,.2,.72],[0,.57,.09],'soil',3,'rounded'));
    return done('carrinho de mão com caçamba de chapas inclinadas e borda enrolada, varais de madeira, pés e carga de terra','soil');
  }
  }
  return null;
}
