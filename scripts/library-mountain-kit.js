import { rockDefaults } from '../src/domain/rocks.js';

/** Original local geometry. No downloaded models/textures; names remain stable catalog IDs. */
export function addMountainKit({add,timeless,ancient}) {
  const ids=new Set();
  const stone={texture:'rock',textureSize:2.4,rockPattern:'strata',textureBrightness:1.05,relief:.045};
  const masonry={...stone,rockPattern:'fractured',textureSize:1.3,textureBrightness:1.2};
  const wood={texture:'wood',textureSize:1.4,woodPattern:'grain',textureBrightness:.7,relief:.025};
  const bark={texture:'bark',textureSize:1,textureBrightness:.7,relief:.035};
  const box=(size,position,material='wood',surface=wood,rotation)=>({shape:'box',size,position,material,surface,...(rotation?{rotation}:{})});
  const ring=(radius,tube,position,rotation=[0,0,0],material='metal')=>({shape:'ring',radius,tube,segments:16,sides:6,position,rotation,material});
  const rope=(points,radius=.03,material='paper',surface=null)=>({shape:'rope',points,radius,segments:24,sides:6,position:[0,0,0],material,surface});
  const rubble=(size,position,seed)=>({shape:'rock',size,position,form:'fractured',seed,detail:2,irregularity:.75,fixedRock:true,material:'stone',surface:masonry});
  const block=(size,position,seed)=>({...rubble(size,position,seed),form:'cliff',terraces:1,overhang:.08,erosion:.4,irregularity:.5});
  function model(id,name,parts,category,description,geology=false,supportHeight) {
    add(id,name,category,geology?timeless:ancient,['Montanha','Ruínas','Trilha nevada'],['montanha',...(geology?['rocha','geologia','paredão']:['kit de montanha','cenário'])],parts,description,supportHeight);
    ids.add(`builtin-${id}`);
  }
  function cliff(id,size,position=[0,0,0],rotation,seedOffset=0) {
    const defaults=rockDefaults(`builtin-${id}`);
    return {shape:'rock',...defaults,seed:(defaults.seed+seedOffset)%65536,size,position,seedOffset,material:'stone',surface:stone,...(rotation?{rotation}:{})};
  }
  model('mountain-cliff-face','Paredão natural · face quebrada',[
    cliff('mountain-cliff-face',[8,7,3]),rubble([1.7,.65,1.2],[-2.8,0,1.35],137),rubble([1.2,.8,1],[2.6,0,1.3],138)
  ],'Exterior / Montanha','Face vertical com saliências, reentrâncias, fissuras e topo irregular. Frente +Z; edite camadas, erosão e seed.',true);
  model('mountain-cliff-corner','Paredão natural · canto de desfiladeiro',[
    cliff('mountain-cliff-corner',[6,6,2],[-1.7,0,-1.6]),cliff('mountain-cliff-corner',[6,5.6,2],[-3.7,0,.4],[0,Math.PI/2,0],19)
  ],'Exterior / Montanha','Duas faces em L com canto aberto, útil para corredores, curvas e encontros de paredões. Frente +Z / +X.',true);
  model('mountain-cliff-overhang','Paredão natural · saliência profunda',[
    cliff('mountain-cliff-overhang',[6,5,4]),rubble([1.6,.5,1.3],[-2,0,1.8],215)
  ],'Exterior / Montanha','Camadas projetadas e faces inferiores reais para bordas, abrigos e neve sobre saliências. Não cria apoio automático de tokens.',true);
  model('mountain-rock-spire','Pináculo natural · torre de rocha',[
    cliff('mountain-rock-spire',[3,9,2.8]),rubble([1.4,.7,1.2],[1,0,.5],253)
  ],'Exterior / Montanha','Formação alta que afina no topo, com camadas quebradas. Varie seed, dimensões e erosão para quebrar repetição.',true);

  // U-shaped tower fragment, with an open back and a genuine window between masonry blocks.
  const tower=[];
  for(let row=0;row<8;row++)for(let col=0;col<7;col++) {
    if(row>=3&&row<=5&&col>=2&&col<=4)continue;
    if(row===7&&col>=3)continue;
    tower.push(block([.45,.38,.6],[-1.5+col*.5,row*.41,0],311+row*13+col));
  }
  for(const sign of [-1,1])for(let row=0;row<7;row++)for(let col=0;col<5;col++) {
    if(row>5&&col>2)continue;
    tower.push(block([.6,.38,.45],[sign*1.6,row*.41,-.5-col*.5],433+row*13+col+(sign+1)*17));
  }
  model('mountain-ruin-tower','Torre arruinada · janela e interior aberto',tower,'Arquitetura / Ruínas','Fragmento em U com vão de janela e topo quebrado. Interior e fundo abertos; escale e combine com arcos/muros. Cenográfico.');
  const corner=[];
  for(let row=0;row<5;row++)for(let col=0;col<5;col++) {
    if(row===4&&col>2)continue;
    corner.push(block([.58,.35,.58],[-1.4+col*.6,row*.38,0],571+row*9+col));
    if(col)corner.push(block([.58,.35,.58],[-1.4,row*.38,-col*.6],651+row*9+col));
  }
  model('mountain-ruin-corner','Canto de ruína · pedras antigas',corner,'Arquitetura / Ruínas','Alvenaria em L, juntas abertas e alturas variadas para bases de torres e muros antigos.');

  const platform=Array.from({length:10},(_,i)=>box([3,.12,.28],[0,1.14,-1.35+i*.3]));
  for(const x of [-1.12,1.12]) {
    platform.push(box([.2,.3,3],[x,.92,0]));
    for(const z of [-1.12,1.12]) {
      platform.push(box([.18,1.1,.18],[x,.55,z]));
      platform.push(box([.12,.9,.12],[x,.52,z*.7],'wood',wood,[z>0?.7:-.7,0,0]));
    }
  }
  model('mountain-timber-platform','Plataforma de montanha · tabuleiro com apoios',platform,'Arquitetura / Madeira','Tábuas, vigas, pés e escoras. Tabuleiro plano a 1,2 m da base; oferece apoio anotado para tokens.',false,1.2);
  model('mountain-rope-span','Corda suspensa · trecho curvo',[
    rope([[-2.5,.75,0],[-1.25,.2,0],[0,0,0],[1.25,.2,0],[2.5,.75,0]]),ring(.065,.015,[-2.5,.75,0]),ring(.065,.015,[2.5,.75,0])
  ],'Arquitetura / Madeira','Corda com flecha real entre ancoragens. Use escala/rotação e postes; peça estática sem física.');
  model('mountain-rope-post','Poste de trilha · cordas e ferragens',[
    box([.18,1.7,.18],[0,.85,0]),ring(.11,.027,[0,1.22,0],[Math.PI/2,0,0],'paper'),ring(.11,.027,[0,1.3,0],[Math.PI/2,0,0],'paper'),ring(.08,.015,[.13,1.27,0],[0,Math.PI/2,0]),box([.32,.1,.32],[0,.05,0],'stone',masonry)
  ],'Arquitetura / Madeira','Poste amarrado com argola lateral para cordas de trilha; combine com corda suspensa.');
  const lantern=[box([.16,.85,.16],[0,1.05,0]),box([.86,.12,.16],[.35,1.45,0]),box([.1,.65,.1],[.25,1.18,0],'wood',wood,[0,0,-.7])];
  for(let i=0;i<7;i++)lantern.push(ring(.034,.008,[.68,1.35-i*.05,0],[0,i%2*Math.PI/2,0]));
  lantern.push(ring(.027,.008,[.68,1.063,0],[0,Math.PI/2,0]));
  for(const y of [.77,1.02])lantern.push(box([.3,.035,.28],[.68,y,0],'metal',null));
  for(const x of [-.12,.12])for(const z of [-.11,.11])lantern.push(box([.02,.25,.02],[.68+x,.895,z],'metal',null));
  lantern.push(box([.13,.17,.13],[.68,.895,0],'flame',null));
  model('mountain-wall-lantern','Lanterna de parede · suporte e corrente',lantern,'Arquitetura / Madeira','Braço de madeira, escora, elos vazados e núcleo emissivo. Posicione na parede e acrescente luz pontual quente para iluminar o entorno.');
  const cylinder=(bottom,top,height,position,material='dark')=>({shape:'cylinder',radiusBottom:bottom,radiusTop:top,height,segments:24,position,material});
  const roundLantern=[box([.16,.85,.16],[0,1.05,0]),box([1.06,.12,.16],[.45,1.5,0]),box([.1,.75,.1],[.32,1.19,0],'wood',wood,[0,0,-.85]),
    ring(.04,.009,[.85,1.435,0],[0,Math.PI/2,0]),
    cylinder(.19,.21,.055,[.85,.58,0]),cylinder(.21,.18,.055,[.85,.905,0]),
    cylinder(.235,.035,.16,[.85,1.005,0]),cylinder(.035,.025,.035,[.85,1.095,0]),
    ring(.065,.009,[.85,1.125,0],[0,Math.PI/2,0]),cylinder(.105,.085,.25,[.85,.745,0],'flame')];
  for(let i=0;i<5;i++)roundLantern.push(ring(.034,.008,[.85,1.395-i*.05,0],[0,i%2*Math.PI/2,0]));
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    roundLantern.push(cylinder(.011,.011,.3,[.85+Math.cos(a)*.175,.745,Math.sin(a)*.175]));
  }
  model('mountain-round-lantern','Lanterna arredondada · tampa cônica e corrente',roundLantern,'Arquitetura / Madeira',
    'Corpo circular, oito hastes, tampa cônica, alça e elos conectados ao braço de madeira. Núcleo emissivo; acrescente luz pontual no centro do corpo.');

  // Three overlapping rocky arch sections enclose a real recess, with an open front.
  // No heightfield is filled into the opening; the rear wall closes the scenic alcove.
  const cave=[];
  for(let section=0;section<3;section++) {
    const z=-section*2;
    for(const sign of [-1,1])for(let row=0;row<3;row++)cave.push(block([1.3,.88,2.15],[sign*2.45,.44+row*.75,z],5107+section*37+row+(sign+1)*7));
    for(let i=0;i<14;i++)cave.push({shape:'arch',innerRadius:1.8+.09*Math.sin(i*2.1+section),outerRadius:3+.12*Math.sin(i*1.3+section),
      start:i*Math.PI/14-.012,end:(i+1)*Math.PI/14+.012,depth:2.15,segments:3,position:[0,2.05,z],material:'stone',surface:stone});
  }
  cave.push(box([6,4.3,.4],[0,2.15,-5.15],'black',null));
  for(let i=0;i<11;i++) {
    const angle=i*Math.PI/10;
    cave.push(rubble([1.4,1.3,1.5],[Math.cos(angle)*2.75,2.05+Math.sin(angle)*2.75,.25],5411+i));
  }
  for(const sign of [-1,1])for(let i=0;i<4;i++)cave.push(rubble([.9,.45,.75],[sign*(2+i*.3),.16,-.5+i*.5],5309+i+(sign+1)*11));
  model('mountain-cave-mouth','Entrada de caverna · abrigo rochoso',cave,'Exterior / Montanha',
    'Boca aberta para +Z, teto e paredes reais, recessos de aproximadamente seis metros e fundo fechado. Posicione sobre terreno plano; não escava automaticamente o terreno.');
  const roots=[{shape:'cylinder',radiusBottom:.35,radiusTop:.27,height:.8,segments:9,position:[0,.4,0],material:'wood',surface:bark}];
  for(let i=0;i<7;i++) {
    const a=i*Math.PI*2/7,cos=Math.cos(a),sin=Math.sin(a),length=.9+(i%3)*.2;
    roots.push(rope([[cos*.18,.25,sin*.18],[cos*.55,.14,sin*.55],[cos*length,.07,sin*length]],.065,'wood',bark));
    roots.push(box([.05,.35+(i%3)*.09,.08],[cos*.22,.85,sin*.22],'wood',wood,[.15*cos,a,.2*sin]));
  }
  model('mountain-uprooted-stump','Toco quebrado · raízes expostas',roots,'Exterior / Vegetação alpina','Tronco partido, lascas e raízes curvas para bordas de ruínas, trilhas e paredões.');
  const wreck=[];
  for(let i=0;i<8;i++)wreck.push(box([.22,.07,1.4+(i%3)*.2],[(i-3.5)*.22,.09+(i%2)*.08,(i%3)*.13],'wood',wood,[0,(i-4)*.08,(i%3-.8)*.1]));
  for(const x of [-.83,.83]) {
    wreck.push(ring(.4,.055,[x,.43,.6],[0,Math.PI/2,.2],'wood'));
    for(let i=0;i<4;i++)wreck.push(box([.045,.72,.045],[x,.43,.6],'wood',wood,[i*Math.PI/4,0,0]));
  }
  wreck.push(box([1.9,.1,.12],[0,.34,.6]),box([.12,.1,1.8],[.3,.11,-.6],'wood',wood,[0,-.4,0]));
  model('mountain-cart-wreck','Destroços de carroça · madeira e rodas',wreck,'Arquitetura / Madeira','Tábuas partidas, eixo e rodas com aro e raios para trilhas abandonadas.');
  // Tall shell with stone courses at natural scale, rather than a stretched small tower.
  const highWall=[];
  for(let row=0;row<22;row++)for(let col=0;col<6;col++) {
    if(row>=6 && row<=16 && col>=2 && col<=3)continue;
    if(row>20+(col%3))continue;
    const jitter=Math.sin(row*19+col*7),width=.695+(col%3)*.005;
    highWall.push(box([width,.345,.65+(col%3)*.02],[-1.8+col*.72+(row%2)*.025,row*.36+.175,jitter*.025],
      'stone',{...masonry,textureBrightness:.95},[jitter*.018,0,jitter*.01]));
  }
  for(const sign of [-1,1])for(let row=0;row<20;row++)for(let col=0;col<2;col++) {
    if(row>17 && col>0)continue;
    highWall.push(box([.65,.345,.695],[sign*1.82,row*.36+.175,-.65-col*.72],'stone',{...masonry,textureBrightness:.95}));
  }
  for(let i=0;i<7;i++)highWall.push(rubble([.35+(i%3)*.1,.18,.3],[i*.48-1.6,0,.7+(i%2)*.2],877+i));
  model('mountain-ruin-high-wall','Ruína alta de montanha · torre partida',highWall,'Arquitetura / Ruínas',
    'Alvenaria alta com 22 fiadas de pedra, janela vertical real, laterais e fundo aberto. Feita para a cena de desfiladeiro; evita esticar as pedras de uma torre pequena.');
  return ids;
}
