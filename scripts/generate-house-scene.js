import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createScene,createEntity,validateDocument} from '../src/domain/documents.js';
import {applyEnvironment} from '../src/domain/environments.js';
import {surfacePatch} from '../src/domain/materials.js';
import {illuminationDefaults,ZONE_DEFAULTS} from '../src/domain/dynamic-lighting.js';

export const HOUSE={id:'casa-de-bairro',name:'Casa de bairro · jardim e quintal',floorHeight:.22};
const yaw=a=>[0,Math.sin(a/2),0,Math.cos(a/2)];

/** A furnished, connected house; all geometry remains ordinary editable entities. */
export function createHouseScene(catalog) {
  let seq=1;const uuid=()=>`e5000000-0000-4000-8000-${String(seq++).padStart(12,'0')}`;
  const scene=applyEnvironment(createScene(HOUSE.name),'day'),assets=new Map(catalog.map(a=>[a.id,a]));
  Object.assign(scene,{id:uuid(),createdAt:'2026-10-08T12:00:00.000Z',updatedAt:'2026-10-08T12:00:00.000Z'});
  scene.layout.grid={...scene.layout.grid,cellSize:1,visible:false,snap:false};
  scene.look.effectsPaused=true;scene.look.daylight.exposure=1.08;
  scene.look.fill={skyColor:'#d7e1df',groundColor:'#899491',intensity:.95};
  scene.look.bloom={...scene.look.bloom,enabled:false};scene.look.fog.enabled=false;scene.look.volumetricFog.enabled=false;
  scene.look.rendering={...scene.look.rendering,ao:true,aoIntensity:.25,aoRadius:.4,reflections:false,volumetricLights:false};
  Object.assign(scene.look.sky,{topColor:'#779cb6',horizonColor:'#d4dddb',cloudCoverage:.28,cloudOpacity:.25});
  const sun=Object.values(scene.look.lights)[0];sun.id=uuid();sun.intensity=2;sun.color='#fff0d8';sun.temperature=null;scene.look.lights={[sun.id]:sun};
  scene.layout.levels={};scene.layout.layers={};
  const organization=(collection,name,extra={})=>{const id=uuid();scene.layout[collection][id]={id,name,visible:true,locked:false,audience:'all',...extra};return id;};
  const level=organization('levels','Térreo',{elevation:.22});
  const roofLayer=organization('layers','Coberturas · ocultar para planta');
  const groups={};for(const [key,name]of Object.entries({yard:'01 · Jardim e quintal',structure:'02 · Paredes e circulação',living:'03 · Sala e jantar',bed1:'04 · Quarto de casal',bed2:'05 · Quarto e estudo',kitchen:'06 · Cozinha',bath:'07 · Banheiro',laundry:'08 · Lavanderia',garage:'09 · Garagem',roof:'10 · Coberturas'}))groups[key]=organization('groups',name,{parentId:null});
  const mat=(texture,color,size=1)=>({...surfacePatch(texture),textureColorMode:'replace',textureColor:color,textureSize:size,relief:.012,roughness:.9});
  const plaster={...mat('concrete','#e4d8ba',1.8),textureContrast:.18,relief:.003},trim={...mat('wood','#ece1c8',.7),woodPattern:'grain',textureContrast:.2},wood={...mat('wood','#987047',1.2),woodPattern:'parquet'},tile={...plaster,textureColor:'#c5c9bd'},paving=mat('stone','#aaa390',1.3),green={...mat('wood','#497466',1),woodPattern:'grain',textureContrast:.25,woodGrain:.15};
  const add=(kind,opts)=>{const e=createEntity(kind,{id:uuid(),levelId:level,...opts});scene.layout.entities[e.id]=e;return e;};
  const floor=(name,x,z,width,length,material=wood,y=.22,group='structure',extra={})=>add('floor',{name,position:[x,y,z],width,length,thickness:.22,material,groupId:groups[group],...extra});
  const wall=(name,x,z,length,rotation=0,group='structure',extra={})=>add('wall',{name,position:[x,.22,z],rotation:yaw(rotation),length,height:2.9,thickness:.18,material:plaster,groupId:groups[group],...extra});
  const door=(host,name,offset,width=1.1,extra={})=>add('door',{name,wallId:host.id,offset,width,height:2.2,initialAngle:Math.PI/2,material:green,groupId:host.groupId,...extra});
  const window=(host,name,offset,width=1.8,extra={})=>add('window',{name,wallId:host.id,offset,width,height:1.35,sill:1,style:'glass',material:trim,groupId:host.groupId,...extra});
  const prop=(id,x,z,group,extra={})=>{const a=assets.get('builtin-'+id);if(!a)throw new Error('Asset ausente: '+id);return add('prop',{name:a.name,assetRef:{id:a.id,revision:a.revision},footprint:a.footprint,...(a.supportHeight?{supportHeight:a.supportHeight}:{}),position:[x,.22,z],groupId:groups[group],...extra});};
  const top=(id,host,dx=0,dz=0,extra={})=>prop(id,host.transform.position[0]+dx,host.transform.position[2]+dz,'living',{position:[host.transform.position[0]+dx,host.transform.position[1]+host.supportHeight*host.transform.scale[1],host.transform.position[2]+dz],surfaceId:host.id,groupId:host.groupId,...extra});
  const rooms={};
  const room=(key,name,x,z,w,d,material=wood)=>{
    const f=floor(name,x,z,w,d,material,.22,key);rooms[key]=f;
    f.lightingZone={...structuredClone(ZONE_DEFAULTS),position:[0,1.45,0],size:[w,2.9,d],blend:.16,color:'#d6d1bc',intensity:.85};return f;
  };
  floor('Lote · 24 × 30 m',0,0,24,30,mat('grass','#647445',2),0,'yard',{thickness:.3});
  floor('Passeio da rua',0,14,24,2,paving,.035,'yard');
  floor('Entrada de veículos',7,10.5,6,5,paving,.04,'yard');
  floor('Caminho do jardim',-2,11,1.8,4,paving,.04,'yard');
  floor('Passagem lateral',-9.3,-.5,1.6,23,paving,.04,'yard');
  floor('Pátio dos fundos',-2,-10.1,12,3.6,paving,.04,'yard');
  floor('Varanda da entrada',-2,8.1,12,2.2,paving,.22,'yard');
  floor('Degrau da varanda',-2,9.55,2.8,.65,paving,.11,'yard',{thickness:.11});
  floor('Degrau dos fundos',-2,-8.4,2,.6,paving,.11,'yard',{thickness:.11});
  room('living','Sala e jantar · piso',-2,4,12,6);
  room('bed1','Quarto de casal · piso',-5.5,-5.75,5,4.5);
  room('bed2','Quarto e estudo · piso',-5.5,-1.25,5,4.5);
  room('kitchen','Cozinha · piso',1.5,-1,5,4,tile);
  room('bath','Banheiro · piso',.2,-5.5,2.4,5,mat('stone','#c0d1c5',.45));
  room('laundry','Lavanderia · piso',2.7,-5.5,2.6,5,tile);
  room('garage','Garagem · piso',7,4,6,8,mat('concrete','#93918a',2));
  for(const key of ['kitchen','bath','laundry']){const f=rooms[key];prop('house-tile-floor',f.transform.position[0],f.transform.position[2],key,{scale:[f.width/5,1,f.length/5],surfaceId:f.id});}
  floor('Corredor central · piso',-2,-3.5,2,9);
  const front=wall('Fachada',-8,7,12),back=wall('Parede dos fundos',-8,-8,12),left=wall('Parede lateral esquerda',-8,-8,15,-Math.PI/2),right=wall('Parede lateral direita',4,-8,15,-Math.PI/2);
  door(front,'Entrada principal',6,1.25);window(front,'Janela da sala',2.5,2.4);window(front,'Janela do jantar',9.5,2.4);
  door(back,'Porta do quintal',6);door(back,'Saída da lavanderia',10.7,1.05);window(back,'Janela do quarto de casal',2.5);window(back,'Basculante do banheiro',8.2,.8,{height:.65,sill:1.65});
  window(left,'Janela lateral do casal',2.3);window(left,'Janela do quarto e estudo',6.7);window(left,'Janela lateral da sala',11.5,2.2);
  window(right,'Janela da cozinha',6.7,1.8);window(right,'Janela da lavanderia',2,.9,{sill:1.35,height:1});door(right,'Porta interna da garagem',11.4,1.1);
  const hallLeft=wall('Corredor · parede dos quartos',-3,-8,9,-Math.PI/2),hallRight=wall('Corredor · parede cozinha e banheiro',-1,-8,9,-Math.PI/2);
  door(hallLeft,'Porta do quarto de casal',3.25,1.1,{initialAngle:-Math.PI/2});door(hallLeft,'Porta do quarto e estudo',7.65,1.1,{initialAngle:-Math.PI/2});
  door(hallRight,'Porta do banheiro',3.1,1);door(hallRight,'Porta da cozinha',7.6,1.2);
  wall('Divisória entre quartos',-8,-3.5,5);const livingPartition=wall('Sala · parede posterior',-8,1,12);
  door(livingPartition,'Passagem sala e corredor',6,1.6,{initialAngle:-Math.PI/2});door(livingPartition,'Passagem sala e cozinha',10,1.25,{initialAngle:-Math.PI/2});
  const wetPartition=wall('Cozinha · parede posterior',-1,-3,5);door(wetPartition,'Porta da lavanderia',3.8,1.05);
  wall('Divisória banheiro e lavanderia',1.4,-8,5,-Math.PI/2);
  wall('Garagem · ligação com varanda',4,7,1,-Math.PI/2,'garage');
  wall('Garagem · parede lateral',10,0,8,-Math.PI/2,'garage');wall('Garagem · fundos',4,0,6,0,'garage');
  const garageFront=wall('Garagem · entrada',4,8,6,0,'garage');
  door(garageFront,'Portão largo da garagem',3,3.5,{height:2.5,initialAngle:-Math.PI/2});
  // Low boundary walls leave the house recognizable from the first saved view.
  wall('Muro esquerdo do lote',-11.8,-14.8,28,-Math.PI/2,'yard',{height:1.15,position:[-11.8,0,-14.8]});
  wall('Muro direito do lote',11.8,-14.8,28,-Math.PI/2,'yard',{height:1.15,position:[11.8,0,-14.8]});
  wall('Muro do fundo',-11.8,-14.8,23.6,0,'yard',{height:1.5,position:[-11.8,0,-14.8]});
  const street=wall('Mureta frontal',-11.8,13,23.6,0,'yard',{height:1,position:[-11.8,0,13]});
  door(street,'Portão de pedestres',9.8,1.6,{height:1});door(street,'Acesso de veículos · esquerda',17.45,2.65,{height:1});door(street,'Acesso de veículos · direita',20.15,2.65,{height:1,hinge:'right'});
  // Trim is segmented around actual doors, so no decorative strip blocks a threshold.
  for(const host of Object.values(scene.layout.entities).filter(e=>e.kind==='wall'&&e.groupId===groups.structure)) {
    const openings=Object.values(scene.layout.entities).filter(e=>e.kind==='door'&&e.wallId===host.id).sort((a,b)=>a.offset-b.offset);
    const intervals=[];let start=0;for(const d of openings){intervals.push([start,d.offset-d.width/2]);start=d.offset+d.width/2;}intervals.push([start,host.length]);
    for(const [a,b]of intervals)if(b-a>.05){const vertical=Math.abs(host.transform.rotation[1])>.5,p=host.transform.position;wall('Rodapé · '+host.name,p[0]+(vertical?0:a),p[2]+(vertical?a:0),b-a,vertical?-Math.PI/2:0,'structure',{height:.12,thickness:.205,material:trim});}
  }
  const furnishing=(id,x,z,key,extra={})=>prop(id,x,z,key,{surfaceId:rooms[key]?.id,...extra});
  furnishing('sofa',-5.8,5.8,'living',{rotation:yaw(Math.PI),scale:[1.25,1,1],material:{textureSlot:'cloth',color:'#637a65'}});
  furnishing('armchair',-7,3.75,'living',{rotation:yaw(Math.PI/2)});
  const coffee=furnishing('coffee-table',-5.55,4,'living');top('documents',coffee,-.22);top('radio',coffee,.27,-.08,{scale:[.55,.55,.55]});
  furnishing('rug',-5.55,4.1,'living',{scale:[1.45,1,1.6],position:[-5.55,.224,4.1]});
  furnishing('crt-tv',-5.6,1.55,'living');furnishing('bookshelf',-7.66,2,'living',{rotation:yaw(Math.PI/2)});
  const table=furnishing('dining-table',1.6,4.35,'living',{rotation:yaw(Math.PI/2)});
  for(const x of [.55,2.65])for(const z of [3.75,4.95])furnishing('chair',x,z,'living',{rotation:yaw(x<1?Math.PI/2:-Math.PI/2)});
  for(const x of [-.3,.3])for(const z of [-.62,.62])top('house-place-setting',table,x,z,{rotation:yaw(x<0?Math.PI/2:-Math.PI/2)});
  furnishing('coat-rack',-3.4,6.45,'living');
  furnishing('single-bed',-5.95,-6.55,'bed1',{scale:[1.6,1,1],rotation:yaw(Math.PI)});
  const bedside=furnishing('bedside-table',-7.25,-7.1,'bed1');top('telephone',bedside,0,0,{scale:[.75,.75,.75]});
  furnishing('wardrobe',-4.05,-7.35,'bed1');furnishing('dresser',-6.8,-3.98,'bed1',{rotation:yaw(Math.PI)});
  furnishing('suitcase',-7.25,-4.9,'bed1');
  furnishing('single-bed',-6.85,-1.9,'bed2');furnishing('bookshelf',-4.15,-3.19,'bed2');
  const desk=furnishing('desk',-7.2,.35,'bed2',{rotation:yaw(Math.PI)});top('laptop',desk,-.25,0,{rotation:yaw(Math.PI)});top('documents',desk,.4,0);
  furnishing('chair',-7.15,-.65,'bed2',{rotation:yaw(Math.PI)});furnishing('wardrobe',-4.1,.4,'bed2',{rotation:yaw(Math.PI)});
  const counter=furnishing('house-counter',.15,-2.55,'kitchen');top('house-place-setting',counter);
  furnishing('sink',1.45,-2.57,'kitchen');furnishing('house-range',3.55,-2.4,'kitchen',{rotation:yaw(-Math.PI/2)});furnishing('fridge',3.5,.18,'kitchen',{rotation:yaw(-Math.PI/2)});
  const sideCounter=furnishing('house-counter',3.55,-1.2,'kitchen',{rotation:yaw(-Math.PI/2)});top('radio',sideCounter,0,0,{scale:[.6,.6,.6],rotation:yaw(-Math.PI/2)});
  furnishing('shower',.7,-7.3,'bath');furnishing('toilet',-.5,-7.15,'bath');
  furnishing('sink',.99,-4.25,'bath',{rotation:yaw(-Math.PI/2),scale:[.75,1,.8]});
  prop('mirror',1.22,-4.25,'bath',{position:[1.22,1.43,-4.25],rotation:yaw(-Math.PI/2),scale:[.7,.7,.7]});
  furnishing('house-washer',3.56,-6.8,'laundry',{rotation:yaw(-Math.PI/2)});furnishing('sink',3.5,-5.55,'laundry',{rotation:yaw(-Math.PI/2),scale:[.8,1,1]});
  furnishing('cabinet',2.03,-6.1,'laundry',{scale:[.6,.7,.6],rotation:yaw(Math.PI/2)});
  furnishing('sedan',7.25,4.1,'garage',{rotation:yaw(Math.PI),material:{textureSlot:'red',color:'#72878b'}});
  furnishing('workbench',7,.48,'garage');furnishing('tool-chest',9.55,1.7,'garage',{rotation:yaw(-Math.PI/2)});furnishing('bicycle',9.4,5,'garage');
  prop('power-panel',4.22,1.3,'garage',{position:[4.22,1.3,1.3],rotation:yaw(Math.PI/2)});
  // Eight real fixtures keep the balanced lighting budget; ceiling sources face downward.
  for(const [key,x,z,intensity]of [['living',-5.5,4,48],['living',1.6,4.35,38],['bed1',-5.5,-5.5,32],['bed2',-5.4,-1.3,32],['kitchen',1.3,-.8,40],['bath',.15,-5.2,25],['laundry',2.7,-5.2,25],['garage',7,4,45]])prop('house-ceiling-lamp',x,z,key,{position:[x,2.98,z],illumination:{...illuminationDefaults('lamp',{kind:'prop'}),type:'spot',position:[0,-.05,0],intensity,distance:8,angle:1.2,penumbra:.75,shadowPolicy:key==='garage'?'priority':'auto',color:'#fff1d3'}});
  for(const x of [-5.5,1.5])prop('house-curtain',x,6.82,'living',{position:[x,1.03,6.82],scale:[1.3,1,1]});
  for(const [x,z,key]of [[-7.25,6.45,'living'],[3.35,6.5,'living'],[-7.35,-5.1,'bed1'],[-7.35,8.2,'yard'],[3.25,8.2,'yard']])prop('house-plant',x,z,key);
  prop('bench',-5.5,-10.2,'yard',{position:[-5.5,.04,-10.2],rotation:yaw(Math.PI)});
  prop('wheelbarrow',8.8,-12.8,'yard',{position:[8.8,0,-12.8],rotation:yaw(.35)});
  for(const [x,z,s]of [[-9.8,-12.6,1.35],[8.5,-10.3,1.25],[-8,11.2,.9]])prop('tree',x,z,'yard',{position:[x,0,z],scale:[s,s,s]});
  for(const [x,z]of [[-10.2,10.5],[-6,11.8],[-4.3,11.8],[.7,11.8],[2.2,11.8],[6,-13],[7.6,-13]])prop('bushes',x,z,'yard',{position:[x,0,z],scale:[.85,.85,.85]});
  for(const x of [4.8,5.7,6.6,7.5])prop('house-plant',x,-11.7,'yard',{position:[x,0,-11.7],scale:[.8,.8,.8]});
  prop('trash-can',10.6,10.7,'yard',{position:[10.6,.04,10.7]});
  // Complete roof/ceilings share one layer and never attach to the working camera.
  floor('Forro da casa',-2,-.5,12,15,plaster,3.22,'roof',{thickness:.1,layerId:roofLayer});
  prop('house-roof',-2,-.5,'roof',{position:[-2,3.13,-.5],layerId:roofLayer});
  floor('Cobertura da garagem',7,4,6.7,8.7,plaster,3.32,'roof',{thickness:.2,layerId:roofLayer});
  floor('Cobertura da varanda',-2,8.1,12.5,2.35,plaster,3.16,'roof',{thickness:.15,layerId:roofLayer});
  for(const x of [-7.7,3.7])wall('Pilar da varanda',x,8.95,.2,0,'yard',{thickness:.2,height:2.79});
  for(const [name,position,target,projection,orthographicHeight,fov]of [
    ['01 · Chegada pelo jardim',[23,17,30],[-1,1.4,0],'perspective',30,48],
    ['02 · Sala e jantar',[3.25,2.05,3.9],[-4.8,1.15,4.7],'perspective',20,65],
    ['03 · Cozinha',[1.25,2.05,.35],[1.75,1.1,-2.3],'perspective',20,65],
    ['04 · Quarto e estudo',[-4.2,1.95,-.85],[-6.8,1,-1.2],'perspective',20,65],
    ['05 · Planta · oculte Coberturas',[0,40,.01],[0,0,0],'orthographic',34,50],
  ]){const id=uuid();scene.cameraPresets[id]={id,name,position,target,projection,orthographicHeight,fov};}
  return validateDocument(scene);
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const {assets}=JSON.parse(await readFile(new URL('../public/assets/catalog.json',import.meta.url),'utf8'));
  const scene=createHouseScene(assets);await mkdir(new URL('../public/scenes/',import.meta.url),{recursive:true});
  await writeFile(new URL('../public/scenes/casa-de-bairro.json',import.meta.url),JSON.stringify(scene,null,2)+'\n');
  console.log(`Casa de bairro: ${Object.keys(scene.layout.entities).length} elementos e ${Object.keys(scene.cameraPresets).length} câmeras.`);
}
