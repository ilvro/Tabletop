import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createScene,createEntity,validateDocument} from '../src/domain/documents.js';
import {applyEnvironment} from '../src/domain/environments.js';
import {surfacePatch} from '../src/domain/materials.js';
import {illuminationDefaults,ZONE_DEFAULTS} from '../src/domain/dynamic-lighting.js';

export const BACKROOMS={id:'backrooms',name:'Backrooms · corredores e salas esquecidas',cols:12,rows:10,cell:3};
export const SECTORS=[
  {id:'lobby',name:'01 · Salão amarelo e pilares',x:0,z:7,w:4,d:3},
  {id:'office',name:'02 · Escritório vazio',x:0,z:0,w:4,d:4},
  {id:'meeting',name:'03 · Reunião sem participantes',x:5,z:0,w:3,d:3},
  {id:'archive',name:'04 · Arquivo abandonado',x:9,z:0,w:3,d:3},
  {id:'dark',name:'05 · Sala sem luz',x:0,z:4,w:3,d:2},
  {id:'partitions',name:'06 · Sala de divisórias',x:5,z:4,w:3,d:3},
  {id:'service',name:'07 · Manutenção',x:9,z:5,w:3,d:2},
  {id:'waiting',name:'08 · Espera interminável',x:8,z:8,w:4,d:2},
];
export const cellCenter=(x,z)=>[-18+(x+.5)*3,-15+(z+.5)*3];
const edgeKey=(a,b)=>[Math.min(a,b),Math.max(a,b)].join(':');
const yaw=a=>[0,Math.sin(a/2),0,Math.cos(a/2)];

/** Contract rooms first, then connect every remaining cell with a seeded spanning tree. */
export function backroomsPlan(){
  const {cols,rows}=BACKROOMS,owner=Array(cols*rows).fill(null),parent=owner.map((_,i)=>i),open=new Set();let seed=71308;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const root=a=>parent[a]===a?a:(parent[a]=root(parent[a]));
  const connect=(a,b)=>{parent[root(a)]=root(b);open.add(edgeKey(a,b));};
  for(const s of SECTORS)for(let z=s.z;z<s.z+s.d;z++)for(let x=s.x;x<s.x+s.w;x++)owner[z*cols+x]=s.id;
  const edges=[];for(let z=0;z<rows;z++)for(let x=0;x<cols;x++)for(const [dx,dz]of [[1,0],[0,1]])if(x+dx<cols&&z+dz<rows){const a=z*cols+x,b=(z+dz)*cols+x+dx;edges.push([a,b]);if(owner[a]&&owner[a]===owner[b])connect(a,b);}
  for(let i=edges.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[edges[i],edges[j]]=[edges[j],edges[i]];}
  for(const [a,b]of edges)if(root(a)!==root(b))connect(a,b);
  let loops=0;for(const [a,b]of edges)if(!open.has(edgeKey(a,b))&&!owner[a]&&!owner[b]&&loops++<9)open.add(edgeKey(a,b));
  // Long spines give recognizable corridors; cross-links and side branches form loops.
  for(const x of [4,8])for(let z=0;z<9;z++)open.add(edgeKey(z*cols+x,(z+1)*cols+x));
  for(const z of [3,7])for(let x=4;x<11;x++)open.add(edgeKey(z*cols+x,z*cols+x+1));
  return {owner,open,edges};
}

export function createBackroomsScene(catalog){
  let sequence=1;const uuid=()=>`f6000000-0000-4000-8000-${String(sequence++).padStart(12,'0')}`;
  const scene=applyEnvironment(createScene(BACKROOMS.name),'office'),assets=new Map(catalog.map(a=>[a.id,a])),plan=backroomsPlan();
  Object.assign(scene,{id:uuid(),createdAt:'2026-10-08T22:00:00.000Z',updatedAt:'2026-10-08T22:00:00.000Z'});
  scene.look.lights={};scene.look.sky.enabled=false;scene.look.background='#24251b';scene.look.fill={skyColor:'#e9e2b2',groundColor:'#817651',intensity:1.5};scene.look.daylight.exposure=1.12;
  scene.look.bloom.enabled=false;scene.look.fog.enabled=false;scene.look.volumetricFog.enabled=false;scene.look.effectsPaused=true;
  scene.look.rendering={...scene.look.rendering,ao:true,aoIntensity:.22,aoRadius:.32,reflections:false,volumetricLights:false};
  scene.layout.grid={...scene.layout.grid,visible:false,snap:false};scene.layout.layers={};scene.layout.levels={};
  const org=(type,name,extra={})=>{const id=uuid();scene.layout[type][id]={id,name,visible:true,locked:false,audience:'all',...extra};return id;};
  const level=org('levels','Pavimento sem janelas',{elevation:0}),roof=org('layers','Coberturas · ocultar para planta');
  const groups=Object.fromEntries(SECTORS.map(s=>[s.id,org('groups',s.name,{parentId:null})]));
  groups.halls=org('groups','09 · Corredores e becos',{parentId:null});groups.roof=org('groups','10 · Coberturas',{parentId:null});
  const material=(color,size,contrast=.4)=>({...surfacePatch('concrete'),textureColorMode:'replace',textureColor:color,textureSize:size,textureContrast:contrast,roughness:1,relief:.004});
  const paper=material('#d3bf77',1.3,.22),carpet=material('#a29458',.3,.6),ceiling=material('#cbc8ae',.5,.15);
  const add=(kind,opts)=>{const e=createEntity(kind,{id:uuid(),levelId:level,...opts});scene.layout.entities[e.id]=e;return e;};
  const prop=(asset,x,y,z,group='halls',extra={})=>{const a=assets.get('builtin-'+asset);if(!a)throw Error(asset);return add('prop',{name:a.name,assetRef:{id:a.id,revision:a.revision},footprint:a.footprint,...(a.supportHeight?{supportHeight:a.supportHeight}:{}),position:[x,y,z],groupId:groups[group],...extra});};
  const floor=(name,x,z,width,length,group,mat=carpet)=>add('floor',{name,position:[x,0,z],width,length,thickness:.15,material:mat,groupId:groups[group]});
  const wall=(x,z,horizontal,group='halls',length=3,height=2.8)=>{
    const rotation=yaw(horizontal?0:-Math.PI/2);
    const e=add('wall',{name:'Parede amarela · '+group,position:[x,0,z],rotation,length,height,thickness:.2,material:paper,groupId:groups[group]});
    if(height===2.8)prop('backrooms-wallpaper',x+(horizontal?length/2:0),0,z+(horizontal?0:length/2),group,{rotation,scale:[length/3,1,1],name:'Papel de parede e rodapé'});
    return e;
  };
  const source=(x,z,key,dark=false)=>prop('backrooms-fluorescent',x,2.66,z,key,{name:dark?'Fluorescente apagada':'Fluorescente · '+key,...(dark?{material:{textureSlot:'tube',emissive:'#000000',emissiveIntensity:0}}:{illumination:{...illuminationDefaults('fluorescent',{kind:'prop'}),position:[0,-.08,0],color:key==='service'?'#d9ecdf':'#fff2b2',intensity:45,distance:12,angle:1.25,penumbra:.8,shadowPolicy:'auto'}})});
  for(const s of SECTORS){
    const x=-18+(s.x+s.w/2)*3,z=-15+(s.z+s.d/2)*3;
    const mat=s.id==='service'?material('#8a9487',1,.3):s.id==='archive'?material('#9c9982',.35,.5):carpet;
    const f=floor(s.name+' · piso',x,z,s.w*3,s.d*3,s.id,mat);
    f.lightingZone={...structuredClone(ZONE_DEFAULTS),position:[0,1.4,0],size:[s.w*3+.2,3.1,s.d*3+.2],blend:.15,intensity:s.id==='dark'?.22:s.id==='archive'?.7:.95,color:s.id==='service'?'#cedace':'#e1d59b'};
    source(x,z,s.id,s.id==='dark');
  }
  // All internal openings are missing wall segments, not painted doors or closed arches.
  for(let z=0;z<10;z++)for(let x=0;x<12;x++){
    const i=z*12+x,[cx,cz]=cellCenter(x,z),key=plan.owner[i]??'halls';
    if(!plan.owner[i])floor('Corredor · '+(x+1)+'/'+(z+1),cx,cz,3,3,key);
    if(x===0)wall(cx-1.5,cz-1.5,false,key);if(z===0)wall(cx-1.5,cz-1.5,true,key);
    if(x===11||!plan.open.has(edgeKey(i,i+1)))wall(cx+1.5,cz-1.5,false,key);
    if(z===9||!plan.open.has(edgeKey(i,i+12)))wall(cx-1.5,cz+1.5,true,key);
    prop('backrooms-ceiling',cx,2.8,cz,'roof',{layerId:roof,material:{...ceiling,textureSlot:'tile'}});
    // Emissive tubes repeat through the maze; only eight fixtures author actual sources.
    if((x+z)%3===0&&key!=='dark')prop('backrooms-fluorescent',cx,2.66,cz,key);
  }
  // A local source gives the winding corridors a real light without exceeding balanced budget.
  source(...cellCenter(4,6),'halls');
  for(const [x,z,key]of [[-15,9,'lobby'],[-9,9,'lobby'],[-12,12,'lobby'],[-15,-12,'office'],[-9,-12,'office'],[-15,-6,'office'],[-9,-6,'office']]){
    add('wall',{name:'Pilar quadrado · '+key,position:[x-.32,0,z],length:.64,height:2.8,thickness:.64,material:paper,groupId:groups[key]});
  }
  // Sparse occupation: the repeating empty space remains the principal subject.
  prop('desk',-16.5,0,-14.35,'office');prop('telephone',-16.5,.82,-14.35,'office');prop('chair',-16.5,0,-13.35,'office',{rotation:yaw(Math.PI)});
  const table=prop('dining-table',1.5,0,-10.5,'meeting',{scale:[1.5,1,1.3]});
  for(const x of [0,1.5,3])for(const z of [-9.4,-11.6])prop('chair',x,0,z,'meeting',{rotation:yaw(z<-10?0:Math.PI)});
  prop('documents',1.5,table.supportHeight,-10.5,'meeting',{surfaceId:table.id});
  for(const x of [10.5,12,13.5,15,16.5])prop('cabinet',x,0,-14.5,'archive');
  for(const x of [12,15])for(const z of [-12,-9])prop('bookshelf',x,0,z,'archive');
  for(const [x,z,h]of [[-.6,0,true],[3,2.4,false],[-.6,3,true]])wall(x,z,h,'partitions',1.2,1.9);
  prop('power-panel',17.82,1.1,1.5,'service',{rotation:yaw(-Math.PI/2)});prop('pipe-valve',17.65,0,3,'service',{rotation:yaw(-Math.PI/2)});prop('water-pump',16.6,0,4.9,'service');prop('tool-chest',10,0,4.8,'service');
  for(const x of [7.5,10.5,13.5,16.5])prop('chair',x,0,14.2,'waiting',{rotation:yaw(Math.PI)});
  prop('coffee-table',12,0,12,'waiting');prop('telephone',12,.42,12,'waiting');prop('trash-can',17.4,0,13.5,'waiting');
  prop('armchair',-16.8,0,.8,'dark',{rotation:yaw(.35)});
  const cameras=[
    ['01 · O salão amarelo',[-15,1.65,13.4],[-10,1.45,7],60,'perspective',30],
    ['02 · Corredor sem fim',[-4.2,1.65,11.5],[-4.5,1.55,-12],62,'perspective',30],
    ['03 · Reunião sem participantes',[-1.9,1.7,-7.1],[1.5,1,-11],60,'perspective',30],
    ['04 · Arquivo abandonado',[10,1.7,-7],[14,1.25,-12],60,'perspective',30],
    ['05 · Planta · oculte Coberturas',[0,45,.01],[0,0,0],50,'orthographic',34],
  ];
  for(const [name,position,target,fov,projection,orthographicHeight]of cameras){const id=uuid();scene.cameraPresets[id]={id,name,position,target,fov,projection,orthographicHeight};}
  return validateDocument(scene);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const {assets}=JSON.parse(await readFile(new URL('../public/assets/catalog.json',import.meta.url),'utf8')),scene=createBackroomsScene(assets);
  await writeFile(new URL('../public/scenes/backrooms.json',import.meta.url),JSON.stringify(scene,null,2)+'\n');console.log(Object.keys(scene.layout.entities).length+' entidades nas Backrooms.');
}
