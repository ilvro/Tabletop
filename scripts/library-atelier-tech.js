import {b,c,e,r,t,rb,lathe,curve,cushion,frame,along,polar,side,surf,withSurface,plain,wheel,caster,pull,knob,bolts,louvers,gauge,finishes,TAU} from './library-atelier-kit.js';

const PI=Math.PI,FLAT=[PI/2,0,0];

// Electronics, investigation gear and medical equipment.
export function craftTech(id,recipe,[w,h,d]) {
  const P=[],S=recipe.supportHeight,done=(method,...extra)=>({parts:P,method,sized:true,...(extra.length?{materials:finishes(...extra)}:{})});
  switch(id) {
  case 'security-camera': {
    const back=-d/2;
    P.push(rb([.16,.28,.03],[0,.14,back+.015],'metal',.01),...bolts([-1,1].flatMap(s=>[-1,1].map(q=>[s*.055,.14+q*.11,back+.03])),.009,'dark'));
    P.push(curve([[0,.13,back+.03],[0,.15,-.13],[0,.2,-.07]],.014,'dark'),e([.05,.05,.05],[0,.205,-.07],'dark'),rb([.11,.1,.3],[0,.265,.04],'white',.03),rb([.15,.012,.37],[0,.326,.05],'white',.005));
    P.push(lathe([[0,0],[.047,0],[.047,.03],[.04,.035],[.036,.02],[0,.02]],[0,.265,.185],'black','z'),e([.06,.06,.02],[0,.265,.205],'black'),e([.012,.012,.012],[.036,.232,.19],'red'),curve([[.02,.22,-.1],[.05,.16,-.15],[.03,.08,back+.03]],.005,'black'));
    return done('câmera com suporte articulado, proteção solar, objetiva embutida, LED e cabo até a placa de parede');
  }
  case 'server-rack': {
    const z=d*.43;
    P.push(rb([w,h-.06,d*.93],[0,.06+(h-.06)/2,-d*.035],'dark',.012),b([w*.94,.06,d*.86],[0,.03,-d*.035],'black'),...frame(w*.98,h-.1,.03,[0,h/2+.03,z+.01],'dark',.035));
    for(let i=0;i<12;i++) {
      const y=.2+i*.135,led=i%3?'screen':'violet';
      P.push(rb([.56,.115,.03],[0,y,z],'black',.006),b([.012,.012,.006],[.22,y+.025,z+.018],led),b([.012,.012,.006],[.195,y+.025,z+.018],i%4?'screen':led));
      P.push(i%4===1?b([.34,.07,.004],[-.07,y,z+.016],'dark'):b([.3,.006,.004],[-.08,y-.02,z+.016],'dark'),...(i%2?[]:[-1,1].map(s=>b([.012,.075,.02],[s*.265,y,z+.022],'metal'))));
    }
    // Fan grilles on the roof and a loom of patch cables down one side.
    for(const x of [-.15,.15])P.push(r(.11,.008,[x,h+.002,-.1],'black',FLAT),r(.06,.006,[x,h+.002,-.1],'black',FLAT),c(.025,.012,[x,h,-.1],'black'));
    for(const [x,drop] of [[.29,.9],[.3,1.25],[.31,.6]])P.push(curve([[x,1.75,z+.02],[x+.02,1.75-drop*.4,z+.045],[x,1.75-drop,z+.02]],.006,drop>1?'violet':'black'));
    return done('rack com servidores em bandejas individuais, LEDs de estado, alças, ventilação no teto e cabos de manobra');
  }
  case 'reel-recorder': {
    const z=d*.25;
    P.push(rb([w,h,d*.72],[0,h/2,-d*.14],'dark',.02),b([w*.94,h*.94,.012],[0,h/2,d*.222],'black'));
    for(const s of [-1,1]) {
      const x=s*.12;
      P.push(c(.074,.02,[x,.34,z],'dark','z'),c(.105,.008,[x,.34,z+.014],'metal','z'),...polar(3,.062,(u,v)=>c(.03,.01,[x+u,.34+v,z+.015],'black','z'),s),c(.026,.03,[x,.34,z+.02],'dark','z'),c(.01,.04,[x,.34,z+.02],'metal','z'));
      P.push(c(.012,.03,[s*.19,.215,z+.01],'metal','z'),rb([.1,.055,.008],[s*.105,.115,z],'black',.004),b([.086,.04,.006],[s*.105,.115,z+.004],'screen'),b([.003,.03,.004],[s*.105+.012,.112,z+.008],'black',[0,0,-.5]));
    }
    P.push(curve([[-.2,.3,z+.01],[-.19,.2,z+.01],[0,.19,z+.01],[.19,.2,z+.01],[.2,.3,z+.01]],.005,'dark'),rb([.13,.05,.03],[0,.185,z+.01],'metal',.008),c(.014,.03,[.07,.215,z+.012],'black','z'));
    P.push(...along(5,-.19,.19).map(x=>knob([x,.045,z-.004],.016,'white')),pull(0,h-.04,z,.2,'metal',.02));
    return done('gravador com carretéis vazados, fita no percurso das cabeças, medidores VU e botões giratórios');
  }
  case 'vhs-recorder': {
    const z=d*.47;
    P.push(rb([w,.078,d*.95],[0,.047,-.008],'dark',.01),...[-1,1].flatMap(s=>[-1,1].map(q=>c(.016,.01,[s*w*.4,.005,q*d*.36],'black'))),b([w*.98,.064,.012],[0,.046,z],'black'));
    P.push(rb([.2,.028,.006],[-.07,.06,z+.007],'dark',.004),b([.085,.022,.004],[.13,.06,z+.008],'screen'),...along(5,-.16,.02).map(x=>b([.024,.01,.006],[x,.027,z+.008],'paper',null,.002)),c(.014,.008,[.14,.03,z+.008],'dark','z'));
    P.push(...along(7,-.12,.12).map(x=>b([.018,.003,.1],[x,.0865,-.07],'black')));
    // Two loose cassettes left on the lid.
    for(const [x,zz,turn] of [[.09,-.02,.12],[-.1,.03,-.3]])P.push(rb([.19,.026,.105],[x,.099,zz],'black',.004,[0,turn,0]),b([.11,.002,.05],[x,.113,zz],'paper',[0,turn,0]),...[-.035,.035].map(q=>({...c(.015,.003,[x+q*Math.cos(turn),.1125,zz-q*Math.sin(turn)],'dark')})));
    return done('videocassete com porta de fita, visor, teclas, grelha de ventilação e duas fitas etiquetadas');
  }
  case 'surveillance-monitor': {
    P.push(rb([w,.045,d],[0,.7275,0],'metal',.01),...[-1,1].flatMap(s=>[-1,1].map(q=>b([.05,.705,.05],[s*.7,.3525,q*.25],'metal'))),b([1.36,.3,.02],[0,.5,-.26],'metal'),...[-1,1].map(q=>b([1.36,.04,.03],[0,.12,q*.25],'metal')));
    P.push(rb([.4,.5,.5],[.45,.45,0],'metal',.008),...[.28,.45,.62].flatMap(y=>[rb([.36,.14,.02],[.45,y,.252],'dark',.005),pull(.45,y,.262,.14,'metal',.02)]));
    for(const x of [-.38,.38])for(const y of [.99,1.44]) {
      P.push(rb([.62,.4,.34],[x,y,-.07],'dark',.03),rb([.5,.33,.02],[x-.04,y,.1],'black',.012),rb([.46,.29,.02],[x-.04,y,.108],'screen',.03),...[-.07,.07].map(q=>knob([x+.262,y+q,.1],.014,'metal')),b([.03,.008,.004],[x+.262,y-.15,.102],'screen'));
      if(y<1)P.push(...[-1,1].map(s=>b([.04,.04,.3],[x+s*.24,.77,-.07],'black')));
    }
    // Operator console and the cable drop behind the bank.
    P.push(rb([.56,.05,.19],[-.1,.785,.19],'dark',.012,[.2,0,0]),...along(6,-.3,.02).map((x,i)=>b([.03,.012,.03],[x,.815,.2],i%3?'metal':'screen',[.2,0,0])),c(.005,.06,[.12,.83,.2],'metal'),e([.026,.026,.026],[.12,.865,.2],'black'));
    for(const x of [-.5,-.2,.3])P.push(curve([[x,1.3,-.25],[x+.04,1,-.29],[x-.02,.76,-.27]],.006,'black'));
    return done('central com quatro monitores de tubo, mesa com gaveteiro, console do operador e cabos');
  }
  case 'oscilloscope': {
    const z=d*.44,bh=h*.86;
    P.push(rb([w,bh,d*.9],[0,bh/2+.012,-.01],'metal',.015),...[-1,1].flatMap(s=>[-1,1].map(q=>c(.016,.012,[s*w*.4,.006,q*d*.35],'black'))),...frame(w*.98,bh*.96,.02,[0,bh/2+.012,z],'black',.012));
    P.push(rb([.21,.17,.01],[-.08,.125,z+.004],'black',.02),rb([.19,.15,.012],[-.08,.125,z+.008],'screen',.03),...along(9,-.16,0).map((x,i)=>b([.022,.004,.003],[x,.125+Math.sin(i*.9)*.035,z+.016],'white',[0,0,Math.cos(i*.9)*.9])));
    P.push(knob([.085,.175,z+.008],.022,'black'),knob([.155,.175,z+.008],.022,'black'),...[.07,.115,.16].flatMap(x=>[knob([x,.115,z+.008],.012,'black'),c(.01,.02,[x,.05,z+.012],'white','z')]),b([.012,.03,.012],[.18,.08,z+.012],'white',[.4,0,0]));
    P.push(curve([[-.13,bh,0],[-.11,h-.006,0],[.11,h-.006,0],[.13,bh,0]],.008,'black'));
    return done('osciloscópio com tela e traço senoidal, seletores, conectores, alça e pés');
  }
  case 'projector': {
    const tray=[0,.205,-.08];
    P.push(rb([w,.14,d*.7],[0,.1,-.05],'metal',.02),...[-1,1].flatMap(s=>[c(.02,.03,[s*.12,.015,-.15],'black'),c(.014,.03,[s*.1,.015,.07],'black')]),c(.125,.05,tray,'dark'),c(.045,.06,[0,.235,-.08],'black'),r(.125,.005,[0,.232,-.08],'metal',FLAT));
    P.push(...polar(24,.092,(u,v,a)=>b([.004,.012,.05],[u,.232,-.08+v],'black',[0,-a+PI/2,0])));
    P.push(lathe([[0,0],[.045,0],[.045,.08],[.055,.08],[.055,.125],[.042,.125],[.04,.11],[0,.11]],[0,.1,.075],'black','z'),c(.036,.004,[0,.1,.19],'screen','z'),...louvers(.09,.07,[-.11,.1,d*.3+.002],4,'black',.004));
    P.push(...[-.03,0,.03].map(x=>c(.009,.008,[.11+x*.5,.172,-.17+x],'dark')),curve([[-.1,.08,-.19],[-.14,.03,-.2],[-.16,.006,-.15]],.005,'black'));
    return done('projetor com carrossel de slides ranhurado, objetiva telescópica, grelha de ventilação e pés reguláveis');
  }
  case 'antenna': {
    P.push(rb([.55,.05,.55],[0,.025,0],'dark',.012),...polar(4,.33,(u,v)=>rb([.14,.06,.14],[u,.08,v],'dark',.02),PI/4),c(.035,1.25,[0,.67,0],'metal'),c(.045,.05,[0,1.28,0],'dark'),c(.024,1.3,[0,1.93,0],'metal'));
    P.push(...polar(4,.25,(u,v)=>curve([[0,1.25,0],[u,.06,v]],.005,'metal'),PI/4),rb([.1,.14,.07],[0,.95,.06],'dark',.012),curve([[0,.95,.1],[.04,.6,.08],[-.03,.3,.07],[.05,.06,.12]],.006,'black'));
    // Yagi array on a boom, a UHF grid reflector above and a lightning spike.
    P.push(c(.014,d,[0,1.9,0],'metal','z'),...along(5,-.24,.24).map((z,i)=>c(.008,w*(1-i*.11),[0,1.9,z],'metal','x')),...[-1,1].map(s=>e([.022,.022,.022],[s*w/2,1.9,-.24],'dark')));
    P.push(...along(5,-.2,.2).map(x=>c(.005,.36,[x,2.3,-.05],'metal')),...along(4,2.14,2.46).map(y=>c(.005,.42,[0,y,-.05],'metal','x')),...[-1,1].map(s=>curve([[s*.02,2.3,.06],[s*.14,2.36,.06],[s*.14,2.24,.06],[s*.02,2.3,.06+.004]],.005,'metal')),c(.008,.11,[0,2.3,.005],'metal','z'));
    P.push(lathe([[0,0],[.02,0],[.006,.06],[.003,.11],[0,.112]],[0,h-.112,0],'metal'),e([.03,.03,.03],[0,2.57,0],'dark'));
    return done('antena com mastro telescópico estaiado, conjunto Yagi, refletor em grade, caixa de junção e para-raios');
  }
  case 'safe': {
    const z=d*.4;
    P.push(rb([w,h-.04,d*.88],[0,.04+(h-.04)/2,-d*.06],'dark',.025),b([w*.92,.04,d*.8],[0,.02,-d*.06],'black'),rb([.56,.74,.05],[0,.44,z],'metal',.015),...frame(.5,.68,.008,[0,.44,z+.027],'dark',.012));
    P.push(...[.22,.66].map(y=>c(.022,.12,[-.3,y,z+.005],'dark')),...bolts([-1,1].flatMap(s=>[-1,1].map(q=>[s*.2,.44+q*.29,z+.03])),.012,'dark'));
    P.push(lathe([[0,0],[.075,0],[.075,.015],[.05,.02],[.05,.04],[.03,.045],[0,.045]],[.12,.52,z+.025],'black','z'),r(.082,.004,[.12,.52,z+.028],'dark'),...polar(12,.066,(u,v)=>b([.004,.012,.003],[.12+u,.52+v,z+.041],'metal',[0,0,Math.atan2(v,u)+PI/2])));
    // Three-spoke bolt wheel.
    P.push(c(.03,.045,[-.12,.36,z+.045],'dark','z'),...[0,1,2].flatMap(i=>{const a=i*TAU/3+.4;return [{...c(.009,.11,[-.12+Math.cos(a)*.055,.36+Math.sin(a)*.055,z+.055],'dark'),rotation:[0,0,a-PI/2]},e([.03,.03,.03],[-.12+Math.cos(a)*.11,.36+Math.sin(a)*.11,z+.055],'dark')];}));
    P.push(rb([.18,.045,.006],[0,.72,z+.028],'brass',.003));
    return done('cofre com porta rebaixada, disco de segredo graduado, volante de três raios, dobradiças e placa','brass');
  }
  case 'weapon-case': {
    const z=d*.45,cz=-.012;
    P.push(rb([w,.1,d*.92],[0,.05,cz],'green',.025),rb([w,.082,d*.92],[0,.143,cz],'green',.025),b([w*.99,.008,d*.91],[0,.1,cz],'black'),...along(4,-.13,.11).map(q=>rb([.56,.008,.03],[0,.186,q],'green',.004)));
    P.push(...[-.35,.35].map(x=>b([.045,.186,d*.93],[x,.095,cz],'black')),...[-1,1].flatMap(s=>[-1,1].map(q=>rb([.07,.17,.07],[s*(w/2-.03),.092,cz+q*(d*.46-.03)],'black',.03))));
    P.push(...[-.42,-.22,.22,.42].flatMap(x=>[rb([.05,.07,.014],[x,.105,z+.004],'metal',.005),b([.04,.02,.01],[x,.13,z+.012],'black')]),pull(0,.085,z,.2,'black',.02,false,.008),...[-.1,.1].map(x=>rb([.03,.03,.02],[x,.085,z+.004],'metal',.006)));
    P.push(...[-.3,.3].map(x=>c(.012,.06,[x,.1,cz-d*.46],'metal','x')),c(.012,.008,[.28,.11,z+.004],'metal','z'));
    return done('estojo rígido com tampa nervurada, cantoneiras, quatro fechos, alça e dobradiças');
  }
  case 'evidence-board': {
    const z=.004,cork=surf(recipe,'wood','sand',{textureSize:.35,relief:.004});
    P.push(...withSurface([b([w-.08,h-.08,.02],[0,h/2,-.012],'wood')],cork),...frame(w,h,.045,[0,h/2,-.008],'wood',.05),b([w*.98,h*.98,.008],[0,h/2,-d/2+.004],'dark'));
    const pins=[];
    const pin=(x,y)=>{pins.push([x,y]);P.push(e([.018,.018,.018],[x,y,z+.014],'red'));};
    for(const [x,y,turn] of [[-.52,.7,-.1],[-.2,.74,.06],[.1,.64,-.05],[.42,.76,.12],[.55,.36,-.08]]){P.push(rb([.15,.18,.004],[x,y,z],'white',.002,[0,0,turn]),b([.125,.115,.003],[x-Math.sin(turn)*-.02,y+.02,z+.003],'dark',[0,0,turn]));pin(x,y+.075);}
    for(const [x,y,ww,hh,turn] of [[-.5,.3,.24,.3,.07],[-.16,.33,.2,.27,-.06],[.22,.3,.34,.26,.03]]){P.push(b([ww,hh,.003],[x,y,z-.001],'paper',[0,0,turn]),...along(4,y+hh*.3,y-hh*.3).map((v,i)=>b([ww*(i?.7:.5),.012,.002],[x-(i?0:ww*.1),v,z+.002],'dark',[0,0,turn])));pin(x,y+hh*.42);}
    P.push(r(.055,.005,[.26,.27,z+.004],'red'),...[[-.33,.52],[.33,.52],[.62,.6]].map(([x,y],i)=>b([.075,.075,.003],[x,y,z],'paper',[0,0,i*.2-.2])));
    // Red yarn between the pins.
    for(const [i,j] of [[0,1],[1,2],[2,3],[2,7],[0,5],[3,4],[6,7]])P.push(curve([[pins[i][0],pins[i][1],z+.02],[(pins[i][0]+pins[j][0])/2,(pins[i][1]+pins[j][1])/2-.015,z+.024],[pins[j][0],pins[j][1],z+.02]],.005,'red'));
    return done('quadro de cortiça com fotos, recortes, mapa marcado, alfinetes e fios ligando as pistas');
  }
  case 'evidence-case': {
    const z=d*.42,cz=-.02;
    P.push(rb([w,.12,d*.88],[0,.06,cz],'dark',.015),rb([w,.085,d*.88],[0,.165,cz],'metal',.015),b([w+.004,.012,d*.88+.004],[0,.122,cz],'black'),...along(3,-.1,.06).map(q=>rb([w*.8,.008,.035],[0,.21,q],'metal',.004)));
    P.push(...[-1,1].flatMap(s=>[-1,1].map(q=>rb([.03,.2,.03],[s*(w/2-.012),.105,cz+q*(d*.44-.012)],'metal',.008))),...[-.15,.15].flatMap(x=>[rb([.045,.055,.012],[x,.125,z+.006],'metal',.004),c(.006,.006,[x,.11,z+.013],'black','z')]));
    P.push(pull(0,.09,z,.16,'black',.04,false,.009),...[-.08,.08].map(x=>rb([.025,.025,.02],[x,.09,z+.004],'metal',.005)),b([.2,.05,.003],[-.1,.06,z+.002],'paper'),...[-.2,.2].map(x=>c(.01,.05,[x,.122,cz-d*.44],'metal','x')));
    return done('maleta de alumínio com cantoneiras, perfil de vedação, fechos com chave, alça e etiqueta');
  }
  case 'documents': {
    for(let i=0;i<6;i++)P.push(b([.22,.009,.3],[-.12+(i%3-1)*.004,.0046+i*.0092,-.05+(i%2)*.006],i%3?'paper':'white',[0,(i%3-1)*.035,0]));
    P.push(rb([.23,.006,.31],[-.12,.059,-.05],'red',.002),b([.06,.006,.02],[-.05,.059,.112],'red'),b([.11,.002,.045],[-.14,.063,-.1],'white'),b([.012,.004,.31],[-.2,.064,-.05],'dark'),b([.23,.004,.012],[-.12,.064,.02],'dark'));
    for(let i=0;i<4;i++)P.push(b([.21,.008,.29],[.11,.004+i*.0082,.035],i%2?'paper':'white',[0,.18+(i-1.5)*.03,0]));
    P.push(b([.2,.002,.28],[.13,.034,.02],'white',[0,-.12,0]),b([.09,.003,.11],[.09,.036,.09],'dark',[0,.4,0]),b([.1,.0035,.12],[.09,.0355,.09],'white',[0,.4,0]),{...c(.005,.14,[.16,.04,-.06],'black'),rotation:[PI/2,0,.8]},...along(5,-.07,.07).map(q=>b([.13,.0015,.006],[.13,.0355,-.02+q],'dark',[0,-.12,0])));
    return done('pilhas de papéis desalinhados, pasta amarrada com etiqueta, folhas datilografadas, fotografia e caneta');
  }
  case 'suitcase': {
    const bh=.4,z=d*.46;
    P.push(...plain([rb([w,bh,d*.92],[0,bh/2,0],'wood',.035)]),b([w+.004,bh+.004,.008],[0,bh/2,0],'dark'),...[-.2,.2].flatMap(x=>[rb([.035,bh+.008,d*.96],[x,bh/2,0],'dark',.004),rb([.05,.04,.008],[x,.3,d*.48+.002],'metal',.003)]));
    for(const x of [-1,1])for(const y of [0,1])for(const q of [-1,1])P.push(rb([.06,.06,.06],[x*(w/2-.028),.03+y*(bh-.06),q*(d*.46-.028)],'metal',.022));
    P.push(...[-.1,.1].flatMap(x=>[rb([.05,.02,.03],[x,bh+.008,.02],'metal',.005),r(.014,.004,[x*.95,bh+.02,0],'metal',[0,PI/2,0])]),curve([[-.095,bh+.02,0],[-.08,h-.012,0],[.08,h-.012,0],[.095,bh+.02,0]],.011,'dark'));
    P.push(c(.045,.003,[.2,.13,z+.001],'paper','z'),b([.11,.07,.003],[-.02,.22,z+.001],'red',[0,0,.2]),b([.09,.05,.003],[-.22,.1,z+.001],'paper',[0,0,-.12]),b([.05,.08,.004],[.12,bh-.03,z+.01],'paper',[0,0,.3]));
    return done('mala de couro com cintas afiveladas, cantoneiras metálicas, fechos, alça e etiquetas de viagem');
  }
  case 'camera-tripod': {
    const R=.36;
    P.push(...polar(3,1,(u,v)=>[curve([[u*.03,1.2,v*.03],[u*R*.5,.62,v*R*.5]],.016,'black'),curve([[u*R*.48,.66,v*R*.48],[u*R,.025,v*R]],.011,'metal'),c(.02,.05,[u*R*.5,.63,v*R*.5],'black'),e([.05,.035,.05],[u*R,.018,v*R],'black'),curve([[0,.8,0],[u*R*.4,.74,v*R*.4]],.005,'metal')],PI/2));
    P.push(c(.014,.5,[0,1,0],'metal'),c(.04,.05,[0,1.23,0],'black'),c(.03,.04,[0,.8,0],'black'),rb([.08,.02,.13],[0,1.27,0],'black',.006),curve([[.02,1.25,-.02],[.09,1.2,-.16],[.12,1.17,-.24]],.008,'black'),c(.014,.08,[.125,1.16,-.26],'black','z'));
    // Camcorder: lens, viewfinder, microphone and recording light.
    P.push(rb([.13,.16,.32],[0,1.36,-.03],'dark',.02),lathe([[0,0],[.045,0],[.045,.07],[.055,.07],[.055,.11],[.045,.11],[.04,.1],[0,.1]],[0,1.36,.13],'black','z'),c(.038,.004,[0,1.36,.232],'screen','z'));
    P.push(rb([.035,.035,.12],[-.085,1.41,-.11],'black',.008),e([.045,.045,.03],[-.085,1.41,-.175],'black'),c(.015,.11,[.03,1.475,.05],'black','z'),b([.012,.03,.012],[.03,1.45,.03],'black'),e([.012,.012,.012],[.045,1.42,.135],'flame'),curve([[-.04,1.44,-.12],[-.02,1.47,-.04],[-.04,1.44,.05]],.008,'dark'),rb([.1,.09,.04],[0,1.36,-.205],'black',.01));
    return done('filmadora em tripé de pernas telescópicas com travas, cabeça com manopla, objetiva, visor, microfone e luz de gravação');
  }
  case 'jail-bars': {
    P.push(...[-1.1,1.1].map(x=>b([.1,h,.1],[x,h/2,0],'dark')),rb([w,.08,.09],[0,h-.04,0],'dark',.01),b([w,.06,.09],[0,.03,0],'dark'),b([1.02,.05,.05],[-.56,1.1,0],'dark'),b([1.02,.05,.05],[-.56,2,0],'dark'));
    P.push(...along(6,-.98,-.14).map(x=>c(.016,2.26,[x,1.19,0],'metal')));
    // Sliding door hung from a top track, with lock box and pull.
    P.push(...[.0,1.0].map(x=>b([.05,2.2,.06],[x,1.16,.0],'dark')),...[.1,1.1,2.22].map(y=>b([1.05,.05,.06],[.5,y,0],'dark')),...along(6,.14,.86).map(x=>c(.016,2.1,[x,1.16,0],'metal')),rb([1.16,.05,.02],[.5,2.3,.036],'metal',.008),...[.2,.8].map(x=>c(.03,.012,[x,2.28,.036],'metal','z')));
    P.push(rb([.13,.22,.09],[.02,1.1,0],'metal',.012),c(.014,.095,[.02,1.13,0],'black','z'),b([.008,.03,.095],[.02,1.1,0],'black'),pull(.06,1.3,.03,.16,'metal',.012,true,.006),...[.5,1.2,1.9].map(y=>c(.024,.12,[1.04,y,0],'dark')));
    return done('grade de cela com trecho fixo, porta em trilho, travessas, caixa de fechadura e barras individuais');
  }
  case 'microscope': {
    const tilt=[.35,0,0],ax=(k)=>[0,.35+Math.cos(.35)*k,.04+Math.sin(.35)*k];
    P.push(rb([w,.035,d],[0,.0175,0],'dark',.014),side([[-.1,.035],[-.05,.035],[-.05,.2],[-.06,.28],[-.03,.33],[.03,.34],[.03,.4],[-.05,.4],[-.1,.33]],.04,0,'metal'));
    P.push(rb([.16,.012,.14],[0,.19,.02],'dark',.004),c(.012,.014,[0,.19,.03],'black'),b([.075,.003,.025],[0,.198,.03],'white'),...[-1,1].map(s=>b([.012,.004,.07],[s*.05,.2,.02],'metal',[0,s*.5,0])),c(.025,.04,[0,.163,.03],'metal'),{...c(.03,.012,[0,.065,.03],'white'),rotation:[-.5,0,0]});
    P.push({...c(.022,.17,ax(0),'white'),rotation:tilt},{...c(.016,.045,ax(.105),'black'),rotation:tilt},{...c(.034,.02,ax(-.092),'metal'),rotation:tilt});
    P.push(...[[-.02,.0],[.02,.0],[0,.03]].map(([x,q],i)=>({...c(.009,.03+i*.008,[x,ax(-.118)[1]-i*.004,ax(-.118)[2]+q-.01],i?'metal':'black'),rotation:[.35+q*8,0,-x*12]})));
    for(const s of [-1,1])P.push(c(.028,.016,[s*.03,.24,-.075],'black','x'),c(.016,.02,[s*.046,.24,-.075],'metal','x'));
    return done('microscópio com braço curvo, platina com presilhas, revólver de objetivas, tubo inclinado e botões de foco');
  }
  case 'medical-cart': {
    for(const x of [-1,1])for(const z of [-1,1])P.push(c(.014,S-.1,[x*.32,(S+.1)/2-.02,z*.22],'metal'),...caster(x*.32,z*.22,.035,'metal','black'),c(.006,.05,[x*.33,S+.025,z*.23],'metal'));
    P.push(rb([w,.03,d],[0,S-.015,0],'metal',.01),...[-1,1].map(s=>c(.006,d-.04,[s*.33,S+.05,0],'metal','z')),c(.006,.66,[0,S+.05,-.23],'metal','x'));
    P.push(rb([.5,.1,.42],[0,S-.085,0],'metal',.008),rb([.46,.075,.012],[0,S-.085,.214],'black',.004),pull(0,S-.085,.22,.16,'metal',.02));
    for(const y of [.5,.2])P.push(rb([w*.92,.02,d*.9],[0,y,0],'metal',.008),...[-1,1].map(s=>b([w*.92,.03,.008],[0,y+.02,s*d*.44],'metal')));
    P.push(c(.01,.36,[.375,S+.01,0],'metal','z'),...[-.15,.15].map(z=>c(.008,.05,[.35,S+.005,z],'metal','x')));
    // Instruments laid out on a cloth, kidney dish and bottles.
    P.push(b([.26,.004,.2],[-.14,S+.002,.03],'white'),...[-.06,0,.06].map((q,i)=>b([.012,.004,.13+i*.02],[-.14+q,S+.006,.03],'metal',[0,q*3,0])),lathe([[0,0],[.07,0],[.085,.035],[.08,.035],[.066,.006],[0,.006]],[.17,S,-.08],'white'));
    P.push(t([[0,0],[.025,0],[.025,.035],[.01,.045],[.01,.055],[0,.055]],[.2,S,.1],'white'),c(.011,.012,[.2,S+.054,.1],'black'),lathe([[0,0],[.1,0],[.13,.07],[.125,.07],[.095,.008],[0,.008]],[-.1,.51,0],'metal'),rb([.16,.1,.12],[.16,.56,.04],'white',.01),rb([.2,.12,.16],[0,.27,0],'white',.012));
    return done('carrinho com rodízios, tampo com gradil, gaveta, prateleiras com borda, instrumentos, cuba e frascos');
  }
  case 'iv-stand': {
    P.push(...polar(5,1,(u,v)=>[curve([[0,.075,0],[u*.08,.06,v*.07],[u*.16,.035,v*.14]],.009,'metal'),e([.04,.04,.04],[u*.16,.02,v*.14],'black')],.3),c(.02,.06,[0,.08,0],'metal'));
    P.push(c(.012,1,[0,.58,0],'metal'),c(.018,.05,[0,1.07,0],'metal'),knob([.018,1.07,0],.012,'black','x'),c(.008,.62,[0,1.39,0],'metal'));
    P.push(curve([[-.17,1.65,0],[-.165,1.7,0],[-.12,1.705,0],[0,1.7,0],[.12,1.705,0],[.165,1.7,0],[.17,1.65,0]],.006,'metal'),curve([[0,1.7,-.14],[0,1.705,-.1],[0,1.7,0],[0,1.705,.1],[0,1.7,.14]],.006,'metal'));
    // Half-empty bag, drip chamber and a line coiled around the pole.
    P.push(rb([.11,.2,.035],[.12,1.5,0],'white',.02),r(.012,.003,[.12,1.61,0],'metal'),b([.075,.07,.004],[.12,1.5,.02],'paper'),c(.012,.05,[.12,1.37,0],'white'),curve([[.12,1.345,0],[.13,1.1,.03],[.07,.9,.05],[.03,.75,.02],[.05,.6,-.02]],.005,'white'),b([.02,.03,.014],[.125,1.15,.025],'black'));
    return done('suporte de cinco pés com rodízios, haste telescópica, ganchos, bolsa de soro, câmara de gotejamento e equipo');
  }
  case 'centrifuge': {
    const z=d*.43;
    P.push(rb([w,.2,d*.9],[0,.1,-.02],'white',.03),...[-1,1].flatMap(s=>[-1,1].map(q=>c(.02,.012,[s*w*.38,.004,q*d*.35-.02],'black'))),lathe([[0,0],[.18,0],[.165,.022],[.1,.045],[0,.05]],[0,.2,-.03],'dark'),r(.18,.006,[0,.203,-.03],'metal',FLAT));
    P.push(c(.02,.02,[0,.26,-.03],'black'),rb([.12,.02,.03],[0,.205,-.2],'metal',.006),b([.28,.075,.006],[-.03,.1,z+.003],'black'),b([.1,.035,.004],[-.1,.11,z+.007],'screen'),knob([.02,.1,z+.004],.016,'metal'),knob([.08,.1,z+.004],.016,'metal'));
    P.push(e([.014,.014,.014],[.15,.12,z+.004],'red'),...louvers(.26,.035,[-.03,.035,z+.004],3,'black',.004));
    return done('centrífuga com tampa abaulada e aro, painel com visor, seletores, luz de operação e ventilação');
  }
  case 'specimen-jars': {
    [[-.14,.17],[0,.21],[.14,.24]].forEach(([x,jh],i)=>{
      const q=.05;
      P.push(lathe([[0,0],[q,0],[q+.003,.01],[q+.003,jh-.03],[q-.008,jh-.012],[q-.008,jh]],[x,0,0],'pane'),c(q-.004,jh*.76,[x,jh*.38+.004,0],'screen'),lathe([[0,0],[q,0],[q,.018],[q-.004,.022],[0,.022]],[x,jh,0],'metal',null,{segments:16}),b([.06,.05,.002],[x,jh*.4,q+.004],'paper'));
      if(i===0)P.push(e([.06,.05,.07],[x,.08,0],'paper'),e([.03,.045,.066],[x-.012,.085,0],'paper'));
      if(i===1)P.push(e([.045,.045,.045],[x,.1,0],'white'),e([.02,.02,.012],[x,.1,.02],'black'),curve([[x,.085,-.01],[x+.012,.05,-.015],[x-.006,.02,-.008]],.005,'red'));
      if(i===2)P.push(curve([[x-.02,.02,0],[x+.02,.07,.01],[x-.015,.12,-.01],[x+.01,.165,0]],.008,'red'));
    });
    return done('frascos de vidro com líquido luminoso, tampas rosqueadas, etiquetas e espécimes conservados','pane');
  }
  case 'chemical-rack': {
    P.push(rb([w,.02,d],[0,.01,0],'metal',.006),b([w,.012,d],[0,.11,0],'metal'),...[-1,1].map(s=>b([.02,.1,d*.9],[s*.17,.06,0],'metal')));
    const tube=(x,z,fill,liquid)=>P.push(lathe([[0,0],[.008,.004],[.011,.012],[.011,.17],[.013,.175]],[x,.03,z],'pane',null,{segments:12}),r(.014,.003,[x,.117,z],'metal',FLAT),...(fill?[c(.009,fill,[x,.036+fill/2,z],liquid)]:[]));
    along(6,-.13,.13).forEach((x,i)=>tube(x,.035,[.09,.12,.05,.1,.07,.13][i],i%2?'red':'screen'));
    along(6,-.13,.13).forEach((x,i)=>{if(i%2===0)tube(x,-.035,i===2?0:.08,'violet');else P.push(r(.014,.003,[x,.117,-.035],'metal',FLAT));});
    return done('estante com tubos de ensaio de vidro, níveis de reagente diferentes e furos vazios','pane');
  }
  case 'oxygen-tank': {
    P.push(t([[0,0],[.13,0],[.155,.02],[.16,.05],[.16,.82],[.14,.9],[.08,.95],[.05,.96],[.05,1],[0,1]],[0,0,0],'green'),t([[.13,0],[.165,0],[.165,.06],[.16,.06]],[0,0,0],'dark'),t([[.161,.82],[.141,.9],[.081,.95],[.051,.962]],[0,0,0],'white'));
    P.push({...t([[.162,0],[.162,.14]],[0,.45,0],'white'),arc:1.5,start:-.75,segments:12},{...t([[.163,0],[.163,.02]],[0,.56,0],'dark'),arc:1.1,start:-.55,segments:10});
    P.push(c(.06,.03,[0,1.005,0],'metal'),rb([.06,.07,.06],[0,1.05,0],'metal',.01),c(.01,.07,[0,1.115,0],'metal'),t([[0,0],[.05,0],[.056,.008],[.05,.016],[0,.016]],[0,h-.016,0],'dark'),...polar(6,.052,(u,v)=>e([.016,.016,.016],[u,h-.008,v],'dark')));
    P.push(c(.02,.08,[.065,1.05,0],'metal','x'),...gauge([.075,1.1,.03],.04,'metal','white','black'),...gauge([-.01,1.06,.04],.028,'metal','white','black'),curve([[.105,1.05,0],[.15,.9,.04],[.13,.65,.11],[.05,.5,.15]],.007,'dark'),lathe([[.012,0],[.035,.03],[.045,.07]],[.04,.43,.15],'white',null,{segments:12}));
    return done('cilindro com ombro pintado, colar, válvula de volante, regulador com dois manômetros, mangueira e rótulo');
  }
  case 'autopsy-table': {
    P.push(b([.8,.03,2.05],[0,S-.015,0],'metal'),...[-1,1].map(s=>rb([.03,h-S+.03,2.1],[s*.4125,(h+S-.03)/2,0],'metal',.01)),...[-1,1].map(s=>rb([w,h-S+.03,.03],[0,(h+S-.03)/2,s*1.035],'metal',.01)));
    P.push(...along(4,-.24,.24).map(x=>b([.012,.002,1.7],[x,S+.001,0],'dark')),c(.03,.004,[0,S+.002,.86],'black'),rb([.2,.055,.12],[0,S+.0275,-.86],'black',.02),b([.7,.06,1.9],[0,S-.06,0],'dark'));
    for(const z of [-.6,.6])P.push(c(.06,.72,[0,.4,z],'metal'),rb([.56,.04,.3],[0,.02,z],'dark',.01),c(.085,.04,[0,.06,z],'metal'),c(.08,.03,[0,S-.1,z],'metal'));
    P.push(c(.02,1.2,[0,.25,0],'metal','z'),rb([.12,.03,.2],[.25,.05,-.6],'black',.008,[.2,0,0]),curve([[0,S-.09,.86],[0,.6,.9],[.04,.32,.92]],.014,'dark'),lathe([[0,0],[.09,0],[.11,.26],[.105,.26],[.085,.01],[0,.01]],[.04,0,.92],'metal'),curve([[-.07,.24,.92],[.04,.36,.92],[.15,.24,.92]],.005,'metal'));
    return done('mesa de autópsia com cuba rebaixada, canaletas, ralo com dreno e balde, apoio de cabeça e colunas com pedal');
  }
  case 'mortuary-cabinet': {
    const z=1.03;
    P.push(rb([w,h-.06,2.1],[0,.06+(h-.06)/2,-.04],'metal',.015),b([w*.96,.06,2.02],[0,.03,-.04],'dark'),b([.04,h-.1,.02],[0,h/2+.03,z-.01],'metal'),b([w*.96,.04,.02],[0,.8,z-.01],'metal'));
    for(const x of [-.42,.42])for(const y of [.43,1.17]) {
      const s=Math.sign(x);
      P.push(rb([.76,.66,.05],[x,y,z],'dark',.02),...frame(.66,.56,.008,[x,y,z+.027],'dark',.03),rb([.05,.22,.03],[x-s*.3,y,z+.04],'metal',.01),pull(x-s*.3,y,z+.05,.2,'metal',.05,true,.012));
      P.push(...[-.2,.2].map(q=>c(.02,.11,[x+s*.38,y+q,z+.01],'metal')),...frame(.14,.09,.008,[x+s*.12,y+.2,z+.03],'metal',.012),b([.12,.07,.004],[x+s*.12,y+.2,z+.028],'paper'));
    }
    P.push(...gauge([0,1.5,z+.004],.045,'metal','paper','black'),...bolts(along(6,-.8,.8).flatMap(x=>[[x,h-.05,z-.004],[x,.1,z-.004]]),.012,'dark'),...along(5,-.5,.5).map(q=>b([.5,.012,.05],[0,h+.002,q-.3],'dark')));
    return done('câmara mortuária de quatro portas com guarnição, alavancas de trinco, dobradiças, porta-etiquetas e termômetro');
  }
  case 'surgical-lamp': {
    const hx=.23,hy=1.27;
    P.push(t([[0,0],[.14,0],[.15,.015],[.12,.035],[.03,.05],[0,.05]],[-.34,0,0],'dark'),...polar(5,.13,(u,v)=>e([.045,.035,.045],[-.34+u,.018,v],'dark')),c(.018,1.22,[-.34,.66,0],'metal'),c(.026,.06,[-.34,.9,0],'dark'),knob([-.315,.9,0],.014,'dark','x'));
    P.push(curve([[-.34,1.25,0],[-.3,1.36,0],[-.1,1.385,0],[.14,1.38,0],[hx,1.345,0]],.014,'metal'),e([.06,.06,.06],[-.34,1.27,0],'dark'),c(.03,.05,[hx,1.335,0],'dark'));
    // Dished head with reflector, five lenses and a sterile grip.
    P.push(t([[0,.055],[.08,.05],[.19,.02],[.24,0],[.25,0],[.2,.03],[.08,.065],[0,.07]],[hx,hy,0],'white'),t([[0,.048],[.08,.043],[.19,.014],[.236,-.004]],[hx,hy,0],'metal'),r(.245,.007,[hx,hy,0],'metal',FLAT));
    P.push(c(.05,.008,[hx,hy+.012,0],'flame'),...polar(4,.14,(u,v)=>c(.045,.008,[hx+u,hy+.004,v],'flame')),c(.012,.07,[hx,hy-.02,0],'white'),c(.018,.012,[hx,hy-.05,0],'white'));
    return done('foco cirúrgico com base lastreada, coluna regulável, braço curvo, cúpula refletora de cinco lâmpadas e manopla');
  }
  case 'restraint-chair': {
    for(const s of [-1,1]) {
      P.push(b([.07,.46,.07],[s*.2,.25,.17],'wood'),b([.07,.46,.07],[s*.2,.25,-.17],'wood'),b([.08,.04,d],[s*.2,.02,0],'wood'),rb([.08,.045,.46],[s*.31,.72,.01],'wood',.01),b([.06,.22,.06],[s*.31,.6,.19],'wood'),b([.06,.22,.06],[s*.31,.6,-.15],'wood'));
      P.push(b([.1,.07,.055],[s*.31,.722,.12],'dark'),rb([.035,.03,.012],[s*.31,.76,.12],'metal',.004),b([.09,.055,.09],[s*.2,.16,.17],'dark'),rb([.03,.03,.012],[s*.2,.16,.218],'metal',.004),...bolts([[s*.2,.65,-.162],[s*.2,1.15,-.162]],.012,'metal'));
    }
    P.push(rb([.56,.07,.46],[0,.48,.0],'wood',.01),...[-.185,0,.185].map(x=>b([.175,.8,.05],[x,.9,-.21],'wood')),...[.65,1.15].map(y=>b([.56,.07,.03],[0,y,-.175],'wood')),b([.48,.03,.12],[0,.09,.19],'wood'));
    P.push(cushion([.3,.16,.07],[0,1.32,-.165],'cloth'),curve([[-.15,1.32,-.15],[-.12,1.32,-.03],[.12,1.32,-.03],[.15,1.32,-.15]],.008,'metal'),b([.52,.06,.012],[0,.98,-.178],'dark'),rb([.05,.045,.014],[.06,.98,-.168],'metal',.004),b([.2,.05,.01],[-.18,.52,.1],'dark',[0,.3,0]),b([.2,.05,.01],[.18,.52,.1],'dark',[0,-.3,0]));
    return done('cadeira de contenção em pranchas com travessas aparafusadas, correias de pulso, tornozelo e peito e apoio de cabeça');
  }
  case 'privacy-screen': {
    for(const [cx,cz,turn] of [[0,-.14,0],[.56,0,-.5],[-.56,0,.5]]) {
      const u=[Math.cos(turn),-Math.sin(turn)],at=(s,y)=>[cx+u[0]*s,y,cz+u[1]*s];
      P.push(...[-.27,.27].flatMap(s=>[c(.012,1.6,at(s,.85),'metal'),e([.03,.03,.03],at(s,h-.015),'metal'),e([.055,.045,.055],at(s,.0225),'black')]));
      P.push(...[.28,1.62].map(y=>({...c(.01,.54,at(0,y),'metal'),rotation:[0,turn,PI/2]})),...along(6,-.22,.22).map((s,i)=>b([.1,1.3,.006],at(s,.95),'white',[0,turn+(i%2?.32:-.32),0])));
    }
    P.push(...[-.28,.28].flatMap(x=>[.5,1.4].map(y=>c(.016,.05,[x,y,-.14],'black'))));
    return done('biombo de três folhas com tecido plissado, caixilhos tubulares, dobradiças e ponteiras');
  }
  case 'locker': {
    const z=.235;
    P.push(rb([w,h-.08,.5],[0,.08+(h-.08)/2,-.03],'metal',.008),...[-1,0,1].flatMap(s=>[-1,1].map(q=>b([.04,.08,.04],[s*(w/2-.03),.04,q*.2-.03],'metal'))),rb([w,.03,.52],[0,h-.015,-.02],'metal',.008));
    for(const [i,x] of [-.4,0,.4].entries()) {
      P.push(rb([.37,1.68,.022],[x,.95,z],'cloth',.006),...frame(.31,.95,.006,[x,.78,z+.013],'cloth',.012),...louvers(.24,.12,[x,1.62,z+.013],5,'black',.006),...louvers(.24,.07,[x,.2,z+.013],3,'black',.006));
      P.push(rb([.04,.13,.025],[x+.135,.98,z+.018],'dark',.008),r(.012,.004,[x+.135,.93,z+.034],'metal',[0,PI/2,0]),b([.06,.035,.003],[x,1.44,z+.013],'metal'),...[.3,.95,1.6].map(y=>c(.008,.08,[x-.185,y,z+.01],'metal')));
      if(i!==1)P.push(rb([.035,.04,.016],[x+.135,.895,z+.034],'brass',.005));
    }
    return done('armários com portas de venezianas, vincos estampados, trincos com cadeado, dobradiças e plaquetas numeradas','brass');
  }
  }
  return null;
}
