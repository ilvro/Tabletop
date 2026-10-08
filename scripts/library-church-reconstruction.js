import * as THREE from 'three';

// New recipes keep the earlier kit (and personal scenes using it) intact.
export function addChurchReconstruction({add, historic, assets}) {
  const ids = new Set();
  const stone = {texture:'concrete',textureSize:2.7,textureColorMode:'replace',textureColor:'#8d7565',textureContrast:1.4,relief:.025};
  const wood = {texture:'wood',woodPattern:'grain',textureSize:2,textureColorMode:'replace',textureColor:'#35201c',relief:.018};
  const materials = {stone:{color:'#95806b',roughness:.96},wood:{color:'#39251e',roughness:.9},iron:{color:'#181418',metalness:.65,roughness:.7}};
  const box = (size,position,material='stone')=>({shape:'box',size,position,material,surface:material==='stone'?stone:material==='wood'?wood:undefined});
  const profile = (contour,depth,position=[0,0,0],material='stone')=>({shape:'profile',contour,depth,position,material,surface:material==='stone'?stone:undefined});
  const beam = (a,b,width,material='wood')=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    return {...box([width,delta.length(),width],start.add(end).multiplyScalar(.5).toArray(),material),rotation:new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())).toArray().slice(0,3)};
  };
  const model=(id,name,parts,description,mats=materials)=>{
    const record=add('church-'+id,'Igreja · '+name,'Arquitetura / Igreja antiga',historic,['Igreja','Horror gótico'],['igreja antiga','kit gótico','reconstrução'],parts,description);
    record.materials=mats;ids.add(record.id);
  };
  model('pitched-roof','cobertura de duas águas',[
    profile([[-9.8,0],[0,4.5],[9.8,0],[9.8,.3],[0,4.84],[-9.8,.3]],5),
  ],'Módulo de 5 m com intradorso inclinado, vão de 19,6 m e cumeeira a 4,84 m. Ocultar com a camada Coberturas.');
  model('timber-truss','tesoura e mísulas da nave',[
    beam([-9.4,.25,0],[0,4.55,0],.3),beam([0,4.55,0],[9.4,.25,0],.3),
    ...[-1,1].flatMap(s=>[beam([s*9.1,0,0],[s*9.1,2.4,0],.3),beam([s*9.1,.15,0],[s*6.1,1.8,0],.23),box([.7,.32,.85],[s*9.1,.16,0])]),
    beam([0,4.45,-2.5],[0,4.45,2.5],.25),
  ],'Tesoura aparente de madeira com escoras laterais; mantém o centro da nave aberto.');
  model('pitched-gable','empena triangular do templo',[
    profile([[-9.8,0],[9.8,0],[0,4.84]],.5),
    beam([-9.8,.12,.12],[0,4.66,.12],.23,'stone'),beam([0,4.66,.12],[9.8,.12,.12],.23,'stone'),
  ],'Fechamento triangular para a cobertura de duas águas, com moldura inclinada.');

  const original=assets.find(a=>a.id==='builtin-church-stained-window');
  const parts=structuredClone(original.parts);
  // Dense lozenges and quatrefoils are real leadwork, visible from both sides.
  for(let row=0;row<8;row++)for(let col=0;col<4;col++){
    const x=-.69+col*.46,y=.25+row*.38;
    if(y>2.5&&Math.abs(x)>.5)continue;
    parts.push({shape:'rope',points:[[x,y-.18,0],[x+.21,y,0],[x,y+.18,0],[x-.21,y,0],[x,y-.18,0]],radius:.017,segments:4,sides:5,position:[0,0,.065],material:'iron'});
  }
  for(const x of [-.46,0,.46])for(const y of [.63,1.39,2.15])parts.push({shape:'ring',radius:.09,tube:.017,segments:12,sides:5,position:[x,y,.07],material:'iron'});
  // Leadwork on the inner face must sit in front of the translucent pane too.
  for(const part of [...parts])if(part.material==='iron'){
    const inner=structuredClone(part);inner.position[2]=-.12-part.position[2];parts.push(inner);
  }
  const leadSurface=original.parts.find(part=>part.material==='iron').surface;
  for(const part of parts)if(part.material==='iron')part.surface=structuredClone(leadSurface);
  const glassMaterials=structuredClone(original.materials);
  glassMaterials.glass={color:'#a90b10',emissive:'#ff2014',emissiveIntensity:.9,roughness:.45,opacity:.82};
  glassMaterials.iron={color:'#100b0d',metalness:.25,roughness:.9};
  model('tracery-window','vitral rubro de losangos e rosáceas',parts,'Vitral ogival com rede de chumbo, lancetas, losangos e rosáceas em geometria; escala do vão do kit original.',glassMaterials);

  const retable=[box([10.2,.4,1],[0,.2,0]),box([8.8,.25,.8],[0,.52,0])];
  for(const sign of [-1,1]){
    retable.push(box([.65,7.8,.62],[sign*4.1,4.5,0]),box([1,.35,1],[sign*4.1,8.2,0]));
    retable.push(profile([[0,0],[.7,.25],[1.1,1.3],[.75,1.7],[.4,1],[0,.8]].map(([x,y])=>[sign*x,y]),.28,[sign*4.05,7.95,0]));
  }
  const contour=[[-4.5,8.3],[-3.7,9.25],[-2.5,9.65],[-1.3,10.2],[0,10.55],[1.3,10.2],[2.5,9.65],[3.7,9.25],[4.5,8.3],[3.7,8.6],[2.5,9.1],[1.3,9.65],[0,10],[ -1.3,9.65],[-2.5,9.1],[-3.7,8.6]];
  retable.push(profile(contour,.4));
  model('altar-retable','retábulo monumental vazio',retable,'Moldura de pedra envelhecida para a estátua e cruz, aberta ao centro, com 10,55 m de altura.');

  const tree=[];
  const branch=(points,radius,seed)=>({shape:'branch',points,radius,tipRadius:radius*.055,segments:12,sides:7,seed,forks:0,position:[0,0,0],material:'wood',surface:{texture:'bark',textureSize:1.2,textureColorMode:'replace',textureColor:'#302a30',relief:.035}});
  tree.push(branch([[0,0,0],[.18,2,0],[-.15,4,.2],[.3,6.2,.1],[.15,8,.25]],.3,61));
  for(let i=0;i<11;i++){
    const angle=i*2.399,y=1.8+i*.42,length=3.6-i*.16;
    const a=[.12,y,.1],b=[Math.cos(angle)*length*.6,y+1,Math.sin(angle)*length*.6],c=[Math.cos(angle)*length,y+2.6,Math.sin(angle)*length];
    tree.push(branch([a,b,c,[c[0]*1.05,c[1]+1,c[2]*1.08]],.12-i*.006,70+i));
    for(let j=0;j<3;j++){
      const t=.3+j*.2,start=a.map((v,k)=>v+(b[k]-v)*t*1.4),side=angle+(j%2?-.65:.75);
      const tip=[start[0]+Math.cos(side)*(1.1+j*.2),start[1]+1.5+j*.3,start[2]+Math.sin(side)*(1.1+j*.2)];
      tree.push(branch([start,[(start[0]+tip[0])*.5,tip[1]-.8,(start[2]+tip[2])*.5],tip],.045,100+i*3+j));
    }
  }
  model('ravine-tree','árvore retorcida do desfiladeiro',tree,'Árvore seca de 8 m, tronco tortuoso e ramificação assimétrica, sem folhagem.');

  const effigy=[box([2.5,.35,1.5],[0,.175,0]),box([2,.25,1.2],[0,.475,0])];
  const robe=[[-1.55,.6],[-.92,1.9],[-.65,3.6],[-.42,4.4],[-1.05,5.6],[-.6,5.9],[-.26,5.55],[.26,5.55],[.6,5.9],[1.05,5.6],[.42,4.4],[.65,3.6],[.92,1.9],[1.55,.6],[.3,.8],[0,.6],[-.3,.8]];
  effigy.push(profile(robe,.75,[0,0,0]));
  for(let i=0;i<9;i++){
    const x=(i-4)*.22;
    effigy.push({shape:'rope',points:[[x*1.5,.65,.45],[x*1.15,1.5,.4],[x*.72,3,.4],[x*.45,4.25,.4]],radius:.065,segments:14,sides:6,position:[0,0,0],material:'stone',surface:stone});
  }
  for(const sign of [-1,1]){
    effigy.push(beam([sign*.65,5.5,0],[sign*2.15,6.2,.12],.28,'stone'),beam([sign*2.15,6.2,.12],[sign*3.65,6.7,.05],.2,'stone'));
    for(let i=0;i<4;i++)effigy.push(beam([sign*3.6,6.7,.05],[sign*(3.8+i*.14),6.8+(i%2)*.3,.08],.055,'stone'));
    const wing=[[.5,5.1],[1.4,6.65],[2.6,6.75],[4.9,7.7],[4.5,6.9],[3.65,6.6],[4,6.1],[2.8,5.65],[3,5.2],[1.8,4.8]];
    effigy.push(profile(wing.map(([x,y])=>[sign*x,y]),.2,[0,0,-.38]));
    for(let i=0;i<12;i++){
      const x=1+i*.25,y=5+i*.11;
      effigy.push(profile([[x,y],[x+.22,y+.7],[x+1.15,y+1.2],[x+.75,y+.45]].map(([x,y])=>[sign*x,y]),.075,[0,0,-.2]));
    }
  }
  model('seraph-effigy','efígie decapitada do altar',effigy,'Figura monumental de 7,7 m com vestes em pregas, braços estendidos, asas fragmentadas e pescoço sem cabeça. Interpretação da silhueta das referências.');

  const maidenOriginal=assets.find(a=>a.id==='builtin-church-iron-maiden'),maiden=structuredClone(maidenOriginal.parts);
  for(const y of [.7,1.1,1.55,2]){
    maiden.push({shape:'ring',radius:.82,tube:.045,segments:24,sides:6,rotation:[Math.PI/2,0,0],position:[0,y,0],material:'iron'});
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      maiden.push(beam([Math.cos(a)*.75,y,Math.sin(a)*.75],[Math.cos(a)*1.03,y+.14,Math.sin(a)*1.03],.055,'iron'));
    }
  }
  maiden.push({shape:'sphere',radius:.17,position:[0,2.55,-.12],material:'ruby'});
  model('spiked-reliquary','Dama de Ferro com aros espinhados',maiden,'Relicário aberto com quatro aros, espinhos radiais e medalhão rubro no halo.',{...maidenOriginal.materials,ruby:{color:'#771018',emissive:'#d41420',emissiveIntensity:.8,roughness:.3}});
  return ids;
}
