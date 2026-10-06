/** Original, self-contained detailed vegetation and metric expedition props. */
export function addWinterDetail({add,timeless,ancient}) {
  const ids=new Set(),bark={texture:'bark',textureSize:.65,textureBrightness:.68,relief:.025},wood={texture:'wood',woodPattern:'grain',textureSize:.8,textureBrightness:.72,relief:.016},leaves={texture:'foliage',textureSize:.28,textureBrightness:.65,textureColorMode:'replace',textureColor:'#284c39',relief:.003},iron={texture:'metal',metalPattern:'brushed',textureSize:.4,textureColorMode:'replace',textureColor:'#454c4d',textureBrightness:.6,relief:.008};
  const branch=(points,radius,seed,forks=0)=>({shape:'branch',points,radius,tipRadius:Math.max(.002,radius*.09),segments:16,sides:7,seed,forks,material:'wood',surface:bark,position:[0,0,0]});
  const board=(size,position,seed,rotation,damage=.28)=>({shape:'timber',size,position,seed,damage,material:'wood',surface:wood,...(rotation?{rotation}:{})});
  const metal=(size,position,rotation)=>({shape:'box',size,position,material:'metal',surface:iron,...(rotation?{rotation}:{})});
  const model=(id,name,parts,vegetation=false,description='')=>{add(id,name,vegetation?'Exterior / Vegetação detalhada':'Exterior / Expedição',vegetation?timeless:ancient,['Montanha','Floresta','Acampamento','Ruínas'],vegetation?['vegetação','natureza','inverno','detalhada']:['madeira','expedição','inverno','detalhado'],parts,description);ids.add(`builtin-${id}`);};
  function tree(id,name,height,width,seed,pine=false) {
    let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    const parts=[branch([[0,0,0],[.05,height*.3,-.04],[-.07,height*.66,.05],[.03,height,0]],.17,seed)];
    for(let i=0;i<5;i++){const a=i*2.399;parts.push(branch([[0,.22,0],[Math.cos(a)*.27,.08,Math.sin(a)*.27],[Math.cos(a)*.55,0,Math.sin(a)*.55]],.065,seed+i));}
    for(let tier=0;tier<8;tier++) {
      const count=pine?(tier<2?3:tier<6?5:3):(tier<5?5:3),y=height*((pine?.22:.14)+tier*(pine?.092:.105)),spread=width*.5*(pine?(.6+.4*Math.sin((tier+1)/9*Math.PI))*(1-tier/11):(1-tier/9));
      for(let j=0;j<count;j++) {
        const a=j*Math.PI*2/count+tier*2.399+(random()-.5)*.5,length=spread*(.83+random()*.26),rise=.08+random()*.12,offset=(random()-.5)*height*.04;
        const b=branch([[0,0,0],[length*.45,-.13,0],[length,.04+rise,.04]],.045*(1-tier/10),seed+tier*29+j*7,2);b.position=[0,y+offset,0];b.rotation=[0,-a,0];parts.push(b);
        parts.push({shape:'conifer',size:[length*1.1,.35+spread*.13,spread*.76],count:54,seed:seed+tier*47+j*13,position:[Math.cos(a)*length*.64,y+offset-.16,Math.sin(a)*length*.64],rotation:[0,-a,(random()-.5)*.1],material:'green',surface:leaves});
      }
    }
    parts.push({shape:'conifer',size:[.42,.55,.42],count:36,seed:seed+571,position:[.03,height-.35,0],material:'green',surface:leaves});
    model(id,name,parts,true,'Copa cheia com agulhas em volume, ramos curvos afilados e raízes. Variação por seed e neve orgânica sobre envelopes de galhos; não usa transparência.');
  }
  tree('dense-alpine-fir','Abeto denso · galhos e agulhas volumosos',5.1,3.6,1103);
  tree('dense-mountain-pine','Pinheiro denso · copa irregular',4.2,4.1,1301,true);
  model('forked-dead-branch','Galho seco · curvo e bifurcado',[branch([[-.7,.08,0],[-.2,.2,.13],[.4,.12,-.06],[1,.4,.2]],.065,1607,5),branch([[.15,.17,.01],[.37,.42,-.18],[.51,.62,-.3]],.029,1621,2)],true,'Madeira curvada, ramificações secundárias, afilamento e pontas maciças; ajuste seed, escala e rotação.');
  const roots=[];for(let i=0;i<5;i++){const a=i*2.399;roots.push(branch([[0,.42,0],[Math.cos(a)*.35,.3,Math.sin(a)*.25],[Math.cos(a)*.7,.08,Math.sin(a)*.52],[Math.cos(a+.2)*1.05,0,Math.sin(a+.2)*.8]],.085,1801+i*17,2));}
  model('twisted-mountain-roots','Raízes torcidas · ramificações naturais',roots,true,'Raízes curvas entrelaçadas e afiladas para afloramentos, margens e bases de árvores.');
  const bush=[];for(let i=0;i<7;i++){const a=i*2.399;bush.push(branch([[0,0,0],[Math.cos(a)*.12,.2,Math.sin(a)*.1],[Math.cos(a)*.35,.52+(i%3)*.08,Math.sin(a)*.3]],.018,1951+i*17,3));}
  model('winter-dry-shrub','Arbusto seco · ramos emergindo da neve',bush,true,'Ramos finos curvos e bifurcados com alturas distintas; útil para neve rasa e trilhas.');
  const barrel=[];
  for(let i=0;i<18;i++)barrel.push({shape:'stave',height:.95,radius:.43,start:i*Math.PI*2/18+.007,end:(i+1)*Math.PI*2/18-.007,thickness:.035,segments:8,material:'wood',surface:wood,position:[0,0,0]});
  for(const y of [.1,.29,.64,.83])for(let i=0;i<4;i++)barrel.push({shape:'stave',height:.045,radius:.43*(.79+.21*Math.max(Math.sin(Math.PI*y/.95),Math.sin(Math.PI*(y+.045)/.95)))+.012,bulge:0,start:i*Math.PI/2,end:(i+1)*Math.PI/2,thickness:.013,segments:4,angularSegments:8,material:'metal',surface:iron,position:[0,y,0]});
  for(const y of [.025,.92])barrel.push({shape:'cylinder',radiusTop:.334,radiusBottom:.334,height:.045,segments:36,position:[0,y,0],material:'wood',surface:{...wood,woodPattern:'planks',woodBoards:5}});
  barrel.push({shape:'cylinder',radiusTop:.035,radiusBottom:.035,height:.018,segments:10,position:[.12,.953,0],material:'dark'});
  model('wooden-expedition-barrel','Barril de madeira · aduelas e aros',barrel,false,'Silhueta abaulada, 18 aduelas sólidas, quatro cintas metálicas e tampas. Madeira e ferro em slots separados.');
  function crate(id,name,closed) {
    const p=[];for(let i=0;i<5;i++)p.push(board([1.16,.06,.17],[0,.06,-.36+i*.18],2101+i));
    for(const z of [-.46,.46])for(let row=0;row<3;row++)p.push(board([1.2,.065,.14],[0,.17+row*.15,z],2201+row+(z>0?9:0),[Math.PI/2,0,0]));
    for(const x of [-.565,.565])for(let row=0;row<3;row++)p.push(board([.94,.065,.14],[x,.17+row*.15,0],2301+row+(x>0?7:0),[Math.PI/2,0,Math.PI/2]));
    for(const x of [-.49,.49])for(const z of [-.41,.41]){p.push(board([.53,.06,.08],[x,.27,z],2401,[0,0,Math.PI/2],0));for(const y of [.18,.47])p.push({shape:'cylinder',radiusTop:.009,radiusBottom:.009,height:.015,segments:6,position:[x,y,z+Math.sign(z)*.065],rotation:[Math.PI/2,0,0],material:'metal',surface:iron});}
    for(const z of [-.485,.485])p.push(metal([1.22,.024,.035],[0,.54,z]));
    if(closed){for(let i=0;i<5;i++)p.push(board([1.2,.055,.18],[0,.56,-.36+i*.18],2501+i));for(const z of [-.28,.28])p.push(board([1.24,.035,.065],[0,.61,z],2551));p.push(metal([.09,.1,.03],[.3,.55,.49]));}
    model(id,name,p,false,closed?'Tábuas com espessura, tampa reforçada, pregos e ferragens.':'Caixa vazada com fundo, tábuas, cantos, pregos e borda metálica; não é uma caixa wireframe.');
  }
  crate('old-open-crate','Caixa antiga aberta · tábuas e interior',false);
  crate('old-closed-crate','Caixa antiga fechada · tampa e ferragens',true);
  const debris=[board([1.7,.09,.23],[0,.12,0],2701,[.08,.22,.07],.9),board([1.2,.08,.21],[.15,.16,.18],2713,[-.06,-.7,-.05],.8),board([.8,.065,.16],[-.2,.08,-.2],2729,[0,1.1,0],.9),metal([.13,.025,.035],[.45,.19,0],[0,.3,.05])];
  model('broken-timber-pile','Destroços de madeira · tábuas partidas',debris,false,'Tábuas sólidas com lascas na silhueta, espessuras variadas e sobreposição irregular.');
  return ids;
}
