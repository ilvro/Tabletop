/** Original modular ruins and botanical meshes, with offline surface defaults and merged draw calls. */
export function addAlpineLibrary({add,timeless,ancient}) {
  const stone={texture:'rock',textureSize:2,rockPattern:'fractured',textureBrightness:1.3,relief:.06};
  const wood={texture:'wood',textureSize:1.5,woodPattern:'grain',textureBrightness:.8,relief:.025};
  const bark={texture:'bark',textureSize:1.2,relief:.035};
  const leaves={texture:'foliage',textureSize:.6,relief:.008};
  const box=(size,position,material='stone',surface=stone,rotation)=>({shape:'box',size,position,material,surface,...(rotation?{rotation}:{})});
  const cylinder=(radius,height,position,material='wood',surface=bark,rotation)=>({shape:'cylinder',radiusBottom:radius,radiusTop:radius*.55,height,segments:9,position,material,surface,...(rotation?{rotation}:{})});
  const model=(id,name,parts,category,description,vegetation=false)=>{
    add(id,name,category,vegetation?timeless:ancient,['Montanha','Ruínas','Floresta'],[...(vegetation?['vegetação','natureza']:['arquitetura','ruína','alvenaria']),'montanha'],parts,description);
    return {id,mergeParts:true};
  };
  const ids=[];
  // Cut blocks with worn faces (the ruin tower's masonry), laid in courses with narrow joints.
  const block=(size,position,seed,rotation)=>({shape:'rock',size,position,form:'cliff',terraces:1,overhang:.08,erosion:.4,irregularity:.5,detail:2,seed,fixedRock:true,material:'stone',surface:stone,...(rotation?{rotation}:{})});
  const wall=[];for(let row=0;row<5;row++)for(let col=0;col<7;col++) {
    const w=.54+(col%3)*.02,x=-1.7+col*.56+(row%2)*.06,y=row*.38;
    if(row===4 && col>3 || row===3 && col===6)continue;
    wall.push(block([w,.37,.55-(col+row)%2*.04],[x,y,0],31+row*9+col));
  }
  ids.push(model('ruin-masonry-wall','Muro de ruína · alvenaria irregular',wall,'Arquitetura / Ruínas','Blocos talhados e gastos em fiadas, com juntas estreitas e topo quebrado. Material de rocha original; combine módulos por rotação/escala.'));
  const arch=[];for(const sign of [-1,1]) {
    for(let row=0;row<5;row++)arch.push(block([.48,.38,.6+(row%2)*.02],[sign*1.3,row*.39,0],73+row+(sign+1)*13));
    arch.push(box([.48,.1,.66],[sign*1.3,2,0]));
  }
  for(let i=0;i<11;i++)arch.push({shape:'arch',innerRadius:1.04,outerRadius:1.52,start:i*Math.PI/11+.01,end:(i+1)*Math.PI/11-.01,depth:.66,segments:2,position:[0,2.05,0],material:'stone',surface:stone});
  ids.push(model('ruin-stone-arch','Arco de pedra · passagem antiga',arch,'Arquitetura / Ruínas','Aduelas curvas com vão real sobre impostas e pilares de blocos talhados. Cenográfico: não substitui paredes/portas estruturais.'));
  const buttress=[box([1,.13,1.1],[0,.065,0])];
  // Courses of two blocks that narrow and step back towards the wall behind (-Z).
  for(let i=0;i<7;i++){const w=.8-i*.06,d=.9-i*.07;for(const s of [-1,1])buttress.push(block([w/2-.01,.34,d],[s*w/4,.1+i*.33,-i*.025],102+i*2+(s+1)/2));}
  ids.push(model('ruin-buttress','Contraforte de ruína',buttress,'Arquitetura / Ruínas','Pilar escalonado em fiadas de blocos talhados, recuando para trás (−Z), para torres, corredores e fachadas.'));
  const bridge=Array.from({length:12},(_,i)=>box([2,.11,.27],[0,.5,-1.65+i*.3],'wood',wood));
  for(const sign of [-1,1]) {
    bridge.push(box([.15,.25,3.9],[sign*.8,.31,0],'wood',wood));
    for(const z of [-1.5,0,1.5])bridge.push(box([.12,1.35,.12],[sign*1.03,.675,z],'wood',wood));
    bridge.push(box([.08,.08,3.5],[sign*1.03,1.15,0],'wood',wood));
  }
  ids.push(model('mountain-timber-bridge','Passarela antiga · tábuas e corrimão',bridge,'Arquitetura / Madeira','Tábuas individuais, vigas e corrimão. Coloque um piso/plataforma de apoio sobre o tabuleiro para tokens.'));
  const roof=[];for(const sign of [-1,1])for(let i=0;i<8;i++)roof.push(box([.36,.09,1.9],[i*.39-1.36,1.05,sign*.7],'wood',wood,[sign*.6,0,0]));
  for(const x of [-1.5,1.5])roof.push(box([.13,.9,.13],[x,.45,0],'wood',wood));
  roof.push(box([3.3,.15,.15],[0,1.5,0],'wood',wood));
  ids.push(model('mountain-roof','Telhado rústico · duas águas',roof,'Arquitetura / Madeira','Cobertura inclinada com tábuas e cumeeira, útil para abrigos e pórticos. Recebe neve física conforme exposição.'));
  const lantern=[box([.14,1.5,.14],[0,.75,0],'wood',wood),box([.7,.1,.12],[.27,1.5,0],'wood',wood),cylinder(.012,.35,[.52,1.33,0],'metal',null)];
  for(const y of [.93,1.13])lantern.push(box([.28,.05,.24],[.52,y,0],'metal',null));
  for(const x of [-.11,.11])for(const z of [-.09,.09])lantern.push(box([.02,.24,.02],[.52+x,1.03,z],'metal',null));
  lantern.push(box([.14,.15,.12],[.52,1.03,0],'flame',null));
  ids.push(model('mountain-lantern-post','Lanterna de trilha · suporte rústico',lantern,'Arquitetura / Madeira','Armação vazada e núcleo emissivo. Adicione luz pontual para iluminar a trilha.'));

  function tree(id,name,height,width,seed,bare=false) {
    const parts=[cylinder(.14,height,[0,height/2,0]),...Array.from({length:5},(_,i)=>cylinder(.025,.7,[Math.cos(i*1.25)*.25,.12,Math.sin(i*1.25)*.25],'wood',bark,[0,0,1.3]))];
    for(let tier=0;tier<6;tier++)for(let j=0;j<6;j++) {
      const angle=j*Math.PI/3+tier*.47,length=width*(1-tier/7)*.47,y=.7+tier*(height-.9)/6;
      parts.push(cylinder(.035*(1-tier/8),length,[Math.cos(angle)*length/2,y,Math.sin(angle)*length/2],'wood',bark,[0,-angle,Math.PI/2-.15]));
      if(!bare)parts.push({shape:'foliage',style:'needles',size:[length*1.1,.35+(5-tier)*.05,length*.65],count:160,seed:seed+tier*37+j*11,position:[Math.cos(angle)*length*.6,y-.1,Math.sin(angle)*length*.6],rotation:[0,-angle,0],material:'green',surface:leaves});
      else parts.push(cylinder(.013,length*.6,[Math.cos(angle)*length*.9,y+.08,Math.sin(angle)*length*.9],'wood',bark,[.1,-angle,1.0]));
    }
    ids.push(model(id,name,parts,'Exterior / Vegetação','Tronco com casca, raízes e ramificação; folhagem com lâminas individuais. Variação geométrica editável, sem volumes cônicos de copa.',true));
  }
  tree('alpine-fir','Abeto alpino · ramificado',4.5,3.2,71);
  tree('alpine-pine','Pinheiro de montanha · ramificado',3.5,3.4,113);
  tree('bare-mountain-tree','Árvore seca de montanha',3.8,2.8,151,true);
  ids.push(model('alpine-fern','Samambaia alpina',Array.from({length:4},(_,i)=>({shape:'foliage',style:'fern',size:[.7,.65,.7],count:8,seed:211+i,position:[Math.cos(i*1.7)*.2,0,Math.sin(i*1.7)*.2],material:'green',surface:leaves})),'Exterior / Vegetação','Frondes curvadas e folíolos individuais para bordas de rochas e ruínas.',true));
  ids.push(model('dry-grass','Tufo de capim seco',Array.from({length:3},(_,i)=>({shape:'foliage',style:'grass',size:[.55,.65,.55],count:32,seed:311+i,position:[i*.15,0,i*.08],material:'paper',surface:{...leaves,textureColorMode:'replace',textureColor:'#92805b',textureSaturation:.5}})),'Exterior / Vegetação','Lâminas curvas separadas, com variação de altura e direção, para trilhas e neve.',true));
  return new Set(ids.map(x=>`builtin-${x.id}`));
}
