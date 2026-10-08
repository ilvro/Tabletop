// Metric residential complements, original geometry and local procedural surfaces.
export function addResidentialLibrary({add,modern}) {
  const ids=new Set();
  const materials={ivory:{color:'#e7e0cf',roughness:.78},green:{color:'#436958',roughness:.85},wood:{color:'#815d3e',roughness:.85},dark:{color:'#252e30',roughness:.6},metal:{color:'#899491',roughness:.4,metalness:.6},glass:{color:'#384e51',roughness:.25},clay:{color:'#ad5f3d',roughness:.95},leaf:{color:'#46663b',roughness:1},soil:{color:'#443529',roughness:1},light:{color:'#fff1cc',emissive:'#ffe1a2',emissiveIntensity:.5,roughness:.7}};
  const b=(size,position,material='ivory',rotation)=>({shape:'box',size,position,material,...(rotation?{rotation}:{})});
  const c=(radius,height,position,material='metal',radiusTop=radius,rotation)=>({shape:'cylinder',radiusTop,radiusBottom:radius,height,position,material,segments:16,...(rotation?{rotation}:{})});
  const profile=(contour,depth,position,material)=>({shape:'profile',contour,depth,position,material});
  const model=(id,name,parts,description,supportHeight)=>{const a=add('house-'+id,name,'Casa / Complementos',modern,['Casa','Vila'],['casa de bairro','residencial',id],parts,description,supportHeight);a.materials=materials;ids.add(a.id);};
  const roofContour=[[-6.5,0],[0,2.3],[6.5,0],[6.5,.14],[0,2.44],[-6.5,.14]];
  model('roof','Casa · telhado de duas águas',[
    profile(roofContour,16,[0,0,0],'clay'),
    ...Array.from({length:33},(_,i)=>profile(roofContour.map(([x,y])=>[x,y+.045]),.035,[0,0,-8+i*.5],'clay')),
    ...[-7.5,7.5].map(z=>profile([[-6,0],[6,0],[0,2.12]],.2,[0,0,z],'ivory')),
    c(.15,16,[0,2.4,0],'clay',.15,[Math.PI/2,0,0]),
    ...[-6.5,6.5].map(x=>b([.1,.2,16],[x,0,0],'wood')),
  ],'Cobertura de 13 × 16 m, cumeeira, fiadas e empenas. Ocultar a camada Coberturas para jogar em planta.');
  model('range','Fogão doméstico de quatro bocas',[
    b([.64,.84,.64],[0,.42,0]),b([.6,.42,.035],[0,.37,.33],'dark'),b([.44,.25,.01],[0,.37,.35],'glass'),b([.48,.035,.06],[0,.64,.365],'metal'),b([.66,.035,.66],[0,.858,0],'metal'),
    ...[-.17,.17].flatMap(x=>[-.17,.17].flatMap(z=>[c(.1,.018,[x,.885,z],'dark'),b([.25,.014,.025],[x,.899,z],'dark'),b([.025,.014,.25],[x,.899,z],'dark')])),
    ...[-.21,-.07,.07,.21].map(x=>c(.025,.02,[x,.75,.34],'dark',.025,[Math.PI/2,0,0])),
  ],'Fogão esmaltado com forno, grelhas e quatro queimadores.');
  model('washer','Máquina de lavar frontal',[
    b([.65,.87,.65],[0,.435,0]),b([.67,.04,.67],[0,.89,0]),c(.23,.04,[0,.43,.34],'metal',.23,[Math.PI/2,0,0]),c(.185,.045,[0,.43,.36],'glass',.185,[Math.PI/2,0,0]),b([.2,.06,.02],[-.16,.77,.34],'dark'),c(.035,.025,[.18,.77,.34],'metal',.035,[Math.PI/2,0,0]),
  ],'Lavadora com escotilha e painel, tampo utilizável.',.91);
  model('counter','Balcão de cozinha com armário',[
    b([1.2,.82,.6],[0,.41,0],'green'),b([1.26,.06,.66],[0,.85,0]),...[-.3,.3].flatMap(x=>[b([.57,.69,.025],[x,.43,.315],'green'),b([.025,.16,.04],[x+(x<0?.2:-.2),.56,.34],'metal')]),b([1.12,.08,.5],[0,.04,0],'dark'),
  ],'Armário baixo verde com bancada de pedra clara.',.88);
  model('plant','Vaso de folhagem',[
    c(.22,.4,[0,.2,0],'clay',.28),c(.29,.06,[0,.38,0],'clay'),c(.24,.015,[0,.41,0],'soil'),
    ...Array.from({length:11},(_,i)=>{const a=i*2.4,r=.17+(i%3)*.06;return {...profile([[0,-.33],[-.09,-.08],[-.1,.12],[0,.36],[.1,.12],[.09,-.08]],.016,[Math.cos(a)*r,.7+(i%3)*.16,Math.sin(a)*r],'leaf'),rotation:[.4*Math.sin(a),a,.4*Math.cos(a)]};}),
  ],'Vaso de barro com folhas alongadas; decoração de interiores e jardins.');
  model('ceiling-lamp','Plafon de vidro leitoso',[
    c(.27,.055,[0,.11,0],'metal'),c(.23,.07,[0,.055,0],'light',.26),
  ],'Plafon baixo. Associe uma fonte abaixo da lente para iluminar o cômodo.');
  model('curtain','Cortinas abertas de algodão',[
    c(.018,2.12,[0,1.72,0],'wood',.018,[0,0,Math.PI/2]),
    ...[-1,1].flatMap(s=>Array.from({length:6},(_,i)=>c(.035,1.65,[s*(.62+i*.055),.83,Math.sin(i*1.8)*.025],'ivory'))),
  ],'Par de cortinas abertas com pregas e varão; vão central livre.');
  model('place-setting','Prato, copo e talheres',[
    c(.14,.018,[0,.009,0]),c(.115,.009,[0,.021,0]),c(.04,.11,[.18,.055,-.15],'glass'),b([.017,.01,.21],[-.19,.006,0],'metal'),b([.017,.01,.21],[.19,.006,0],'metal'),
  ],'Louça cotidiana sem conteúdo narrativo, para mesas e bancadas.');
  model('tile-floor','Piso cerâmico · módulo de 5 m',[
    b([5,.005,5],[0,.0025,0],'metal'),
    ...Array.from({length:100},(_,i)=>b([.494,.01,.494],[(i%10-4.5)*.5,.01,(Math.floor(i/10)-4.5)*.5],'ivory')),
  ],'Placas quadradas com juntas reais; escale o módulo ao tamanho do cômodo.',.015);
  return ids;
}
