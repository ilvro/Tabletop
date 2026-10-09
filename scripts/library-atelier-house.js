import {b,c,e,r,t,rb,tb,lathe,fire,curve,p,along,polar,slab,surf,withSurface,plain,pull,knob,panel,spin,finishes} from './library-atelier-kit.js';

const PI=Math.PI,FLAT=[PI/2,0,0];

// House and Backrooms complements, plus two close-up props rebuilt from scratch.
export function craftHouse(id,recipe,[w,h,d]) {
  const P=[],S=recipe.supportHeight,done=(method,...extra)=>({parts:P,method,sized:true,...(extra.length?{materials:finishes(...extra)}:{})});
  switch(id) {
  case 'angel-statue': {
    const z=.03,wing=(s,k,back)=>p([[0,0],[.06,.3],[.16,.45],[.24,.42],[.25,.2],[.2,-.1],[.14,-.4],[.07,-.62],[.02,-.4]].map(([x,y])=>[s*x*k,y*k]),.035,[s*.05,1.25,-.12-back],'stone',[0,-s*.5,0]);
    P.push(rb([.62,.08,.62],[0,.04,z],'stone',.012),b([.5,.36,.5],[0,.26,z],'stone'),rb([.6,.06,.6],[0,.47,z],'stone',.012),b([.3,.16,.012],[0,.27,z+.252],'stone'),rb([.44,.03,.44],[0,.095,z],'stone',.008));
    // Robed figure with bowed head, hands to the face and folded wings.
    P.push(t([[0,0],[.2,0],[.21,.03],[.17,.2],[.13,.45],[.11,.62],[.13,.7],[.15,.78],[.12,.86],[.07,.9],[0,.9]],[0,.5,z],'stone'),...polar(9,1,(u,v)=>curve([[u*.2,.52,z+v*.2],[u*.145,.86,z+v*.145],[u*.11,1.12,z+v*.11]],.018,'stone'),.2));
    P.push(e([.34,.14,.2],[0,1.34,z],'stone'),e([.15,.18,.16],[0,1.49,z+.07],'stone',[.45,0,0]),e([.17,.2,.15],[0,1.5,z+.02],'stone',[.2,0,0]),e([.13,.06,.07],[0,1.46,z+.15],'stone'));
    for(const s of [-1,1])P.push(curve([[s*.16,1.34,z+.02],[s*.17,1.18,z+.11],[s*.08,1.36,z+.17],[s*.04,1.45,z+.16]],.04,'stone'),wing(s,1,0),wing(s,.8,.035),wing(s,.6,.07));
    return done('anjo que chora sobre pedestal moldurado, com túnica drapeada, cabeça inclinada, mãos no rosto e asas em camadas');
  }
  case 'kerosene-lantern': {
    P.push(t([[0,0],[.07,0],[.078,.012],[.078,.05],[.06,.065],[.035,.07],[0,.07]],[0,0,0],'metal'),c(.03,.03,[0,.085,0],'dark'),c(.004,.04,[.045,.085,0],'metal','x'),c(.012,.006,[.066,.085,0],'metal','x'),c(.012,.012,[-.045,.066,.03],'metal'));
    P.push({...t([[.03,0],[.05,.03],[.056,.07],[.045,.12],[.032,.14]],[0,.1,0],'pane'),segments:20},fire(0,.1,0,.014,.065),t([[.034,0],[.045,.01],[.03,.04],[.02,.05],[.022,.06],[0,.065]],[0,.24,0],'metal'),...[.14,.2].map(y=>({...r(.055,.003,[0,y,0],'dark',FLAT),segments:16})));
    for(const s of [-1,1])P.push(curve([[s*.07,.06,0],[s*.075,.15,0],[s*.07,.24,0],[s*.03,.285,0]],.005,'dark'));
    P.push(curve([[-.072,.2,0],[-.07,.3,0],[0,h-.006,0],[.07,.3,0],[.072,.2,0]],.005,'dark'));
    return done('lampião com tanque, queimador e regulador de pavio, globo de vidro com chama, chaminé, guarda de arame e alça','pane');
  }
  case 'house-range': {
    const z=.285,top=.875;
    P.push(rb([.64,.82,.62],[0,.43,-.04],'ivory',.012),b([.58,.03,.56],[0,.015,-.04],'dark'),rb([w,.035,.66],[0,top-.0175,-.03],'metal',.008));
    for(const x of [-.17,.17])for(const q of [-.2,.14])P.push(c(.05,.012,[x,top+.006,q],'dark'),{...r(.075,.006,[x,top+.008,q],'dark',FLAT),segments:16},...[0,1].map(i=>b([.2,.022,.012],[x,top+.02,q],'dark',[0,i*PI/2+PI/4,0])));
    P.push(b([.62,.09,.03],[0,.78,z],'ivory'),...along(5,-.22,.22).map(x=>knob([x,.78,z+.014],.022,'dark')),rb([.6,.5,.04],[0,.44,z+.005],'dark',.012),rb([.44,.26,.008],[0,.45,z+.027],'glass',.01),pull(0,.71,z+.02,.5,'metal',.04,false,.011));
    P.push(rb([.6,.12,.03],[0,.1,z],'ivory',.008),b([.3,.012,.008],[0,.14,z+.016],'dark'),...[-.24,.24].map(x=>b([.02,.02,.02],[x,.71,z+.03],'metal')));
    return done('fogão com quatro queimadores e trempes, botões, porta de forno envidraçada com puxador e gaveta inferior');
  }
  case 'house-washer': {
    const z=.295;
    P.push(rb([.65,.87,.64],[0,.455,-.025],'ivory',.02),rb([w,.03,.67],[0,h-.015,-.02],'ivory',.01),b([.6,.03,.58],[0,.015,-.025],'dark'),c(.15,.004,[0,.43,z+.003],'dark','z'));
    P.push(lathe([[.16,0],[.235,0],[.235,.025],[.2,.045],[.16,.03]],[0,.43,z],'metal','z'),lathe([[0,.05],[.09,.045],[.16,.02],[.165,0]],[0,.43,z+.005],'glass','z'),rb([.03,.1,.03],[.215,.43,z+.035],'ivory',.01),c(.016,.08,[-.235,.43,z+.012],'metal'));
    P.push(b([.63,.12,.02],[0,.79,z+.005],'ivory'),rb([.2,.07,.012],[-.2,.79,z+.016],'ivory',.006),b([.14,.008,.006],[-.2,.775,z+.023],'dark'),b([.12,.035,.006],[0,.79,z+.017],'dark'),knob([.2,.79,z+.014],.035,'metal'),...[-.04,0,.04].map(x=>c(.008,.006,[x+.0,.755,z+.017],'metal','z')));
    P.push(rb([.1,.06,.008],[.24,.08,z],'ivory',.004),b([.08,.006,.004],[.24,.1,z+.005],'dark'),...[-.1,.08].map(x=>curve([[x,.8,-.345],[x+.03,.5,-.35],[x,.05,-.345]],.012,'dark')));
    return done('máquina de lavar com porta de escotilha, aro metálico, painel com gaveta de sabão, seletor, filtro e mangueiras');
  }
  case 'house-counter': {
    const z=.275;
    P.push(b([1.12,.08,.5],[0,.04,-.02],'dark'),b([1.2,.74,.58],[0,.45,-.03],'green'),rb([w,.045,d],[0,S-.0225,0],'ivory',.014));
    for(const s of [-1,1])P.push(rb([.56,.13,.03],[s*.295,.74,z],'green',.006),pull(s*.295,.74,z+.015,.2,'metal',.025),...panel(.56,.52,[s*.295,.4,z],'green',{depth:.03}),pull(-s*.07,.52,z+.015,.14,'metal',.028,true));
    P.push(b([.02,.72,.012],[0,.45,z-.012],'dark'));
    return done('balcão com tampo boleado, gavetas, portas almofadadas com puxadores e rodapé recuado');
  }
  case 'house-plant': {
    const veins=surf(recipe,'leaf','foliage',{textureSize:.3,relief:.01}),leaf=(L,W)=>[[0,0],[W*.35,L*.2],[W*.5,L*.5],[W*.3,L*.82],[0,L],[-W*.3,L*.82],[-W*.5,L*.5],[-W*.35,L*.2]];
    P.push(t([[0,0],[.2,0],[.22,.02],[.275,.36],[.3,.37],[.3,.42],[.265,.42],[.255,.38]],[0,0,0],'clay'),t([[0,0],[.28,0],[.3,.02],[.3,.03],[0,.03]],[0,0,0],'clay'),c(.26,.01,[0,.385,0],'soil'));
    for(let i=0;i<14;i++) {
      const a=i*2.399,tier=i%3,reach=[.16,.12,.06][tier],top=[.72,.95,1.12][tier],L=[.26,.24,.22][tier],pitch=[1.05,.7,.3][tier]+(i%2)*.1,u=Math.sin(a),v=Math.cos(a);
      P.push(curve([[u*.03,.39,v*.03],[u*reach*.5,top*.72,v*reach*.5],[u*reach,top,v*reach]],.008,'leaf'),...withSurface([p(leaf(L,L*.5),.008,[u*reach,top,v*reach],'leaf',spin(['x',pitch],['y',a]))],veins));
    }
    return done('vaso de barro com pires, terra e planta de hastes arqueadas com folhas largas nervuradas');
  }
  case 'house-ceiling-lamp': {
    P.push(t([[0,h],[.27,h],[.27,.085],[.25,.075],[0,.075]],[0,0,0],'metal'),{...r(.262,.008,[0,.082,0],'metal',FLAT),segments:32},t([[0,.012],[.1,.018],[.19,.04],[.235,.066],[.24,.08]],[0,0,0],'light'),t([[0,0],[.012,0],[.016,.012],[0,.014]],[0,0,0],'metal'),...polar(3,.245,(u,v,a)=>b([.02,.02,.012],[u,.07,v],'metal',[0,-a,0])));
    return done('plafon de vidro leitoso abaulado com base metálica, aro, presilhas e arremate central');
  }
  case 'house-curtain': {
    const drape=(x0,x1)=>slab([...along(17,x0,x1).map((x,i)=>[x,Math.sin(i*PI/2)*.042]),...along(17,x1,x0).map((x,i)=>[x,Math.sin((16-i)*PI/2)*.042-.012])],1.62,.83,'ivory');
    for(const s of [-1,1])P.push(drape(s*.56,s*.98),...along(7,.58,.96).map(x=>({...r(.026,.004,[s*x,1.69,0],'wood',[0,PI/2,0]),segments:12})),t([[0,0],[.022,0],[.03,.02],[.022,.045],[0,.05]],[s*1.01,1.69,0],'wood',[0,0,-s*PI/2]),b([.03,.05,.05],[s*.5,1.69,-.03],'wood'),rb([.46,.05,.075],[s*.77,.72,0],'ivory',.02));
    P.push(c(.018,2.02,[0,1.69,0],'wood','x'));
    return done('cortinas onduladas presas por abraçadeiras, varão de madeira com argolas, suportes e ponteiras torneadas');
  }
  case 'house-place-setting': {
    P.push(t([[0,0],[.09,0],[.14,.018],[.14,.022],[.13,.02],[.09,.008],[.07,.006],[0,.006]],[-.01,0,.02],'metal'),b([.085,.005,.2],[-.165,.0025,.02],'paper'),b([.085,.004,.1],[-.165,.0065,.07],'paper'));
    P.push(b([.014,.004,.11],[-.165,.01,.06],'metal'),...along(4,-.012,.012).map(x=>b([.004,.003,.05],[-.165+x,.01,-.04],'metal')),b([.03,.003,.03],[-.165,.01,-.005],'metal'),b([.014,.004,.09],[.165,.002,.08],'metal'),tb([.02,.003,.11],[.165,.002,-.02],'metal',[1,1]));
    P.push({...t([[0,0],[.032,0],[.04,h],[.036,h],[.029,.008],[0,.008]],[.165,0,-.125],'glass'),segments:20});
    return done('prato com aba, copo, garfo de quatro dentes e faca sobre guardanapo dobrado');
  }
  case 'backrooms-fluorescent': {
    P.push(b([w,.02,d],[0,h-.01,0],'frame'),...[-1,1].flatMap(s=>[b([.04,.09,d*.92],[s*.6,.055,0],'frame'),...plain([b([1.16,.09,.012],[0,.062,s*.2],'tile',[s*.45,0,0])]),b([1.2,.03,.008],[0,.015,s*.225],'frame'),c(.016,1.1,[0,.045,s*.11],'tube','x'),...[-1,1].map(q=>b([.02,.045,.03],[q*.565,.062,s*.11],'frame'))]));
    P.push(...plain([tb([1.12,.05,.1],[0,.075,0],'tile',[1,1.8])]),...along(11,-.52,.52).map(x=>b([.006,.03,d*.92],[x,.015,0],'frame')));
    return done('luminária de embutir com refletores inclinados, duas lâmpadas tubulares em soquetes e grelha difusora');
  }
  }
  return null;
}
