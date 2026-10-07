import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createScene,createEntity,validateDocument} from '../src/domain/documents.js';
import {applyEnvironment} from '../src/domain/environments.js';
import {illuminationDefaults,ZONE_DEFAULTS} from '../src/domain/dynamic-lighting.js';
import {surfacePatch} from '../src/domain/materials.js';

export const LIGHTING_EXAMPLES=[
  {id:'lighting-chapel',name:'Iluminação · capela ritual',style:'ritual',description:'Nave vermelha, exterior violeta, vitrais projetados e candelabros. Recorte de estudo editável do kit arquitetônico.'},
  {id:'lighting-tavern',name:'Iluminação · taverna acolhedora',style:'tavern',description:'Madeira, lâmpadas quentes e velas agrupadas, com contatos discretos e reflexos de ambiente.'},
  {id:'lighting-office',name:'Iluminação · escritório fluorescente',style:'office',description:'Spots frios sem cintilação, mesas e terminais. Compare legibilidade, zonas e sombras.'},
  {id:'lighting-street',name:'Iluminação · rua chuvosa',style:'street',description:'Postes com sombras econômicas, asfalto úmido, névoa local e chuva.'},
];
export function createLightingExample(catalog,style){
  const example=LIGHTING_EXAMPLES.find(e=>e.style===style);if(!example)throw new Error('Estudo de luz desconhecido.');
  let sequence=1;const uuid=()=>`c300000${LIGHTING_EXAMPLES.indexOf(example)}-0000-4000-8000-${String(sequence++).padStart(12,'0')}`,yaw=angle=>[0,Math.sin(angle/2),0,Math.cos(angle/2)],assets=new Map(catalog.map(a=>[a.id,a]));
  const scene=applyEnvironment(createScene(example.name),style==='street'?'moonlight':style);Object.assign(scene,{id:uuid(),createdAt:'2026-10-06T15:00:00.000Z',updatedAt:'2026-10-06T15:00:00.000Z'});scene.layout.grid.visible=false;scene.layout.grid.snap=false;
  for(const light of Object.values(scene.look.lights))light.id=uuid();scene.look.lights=Object.fromEntries(Object.values(scene.look.lights).map(l=>[l.id,l]));scene.look.effectsPaused=true;
  const add=(kind,options)=>{const e=createEntity(kind,{id:uuid(),...options});scene.layout.entities[e.id]=e;return e;};
  const prop=(assetId,position,extra={})=>{const asset=assets.get('builtin-'+assetId);if(!asset)throw new Error('Asset ausente: '+assetId);return add('prop',{name:asset.name,assetRef:{id:asset.id,revision:asset.revision},footprint:asset.footprint??[1,1],position,...extra});};
  const source=(profile,options={})=>({...illuminationDefaults(profile,{kind:'prop'}),...options});
  const exterior=add('floor',{name:'Exterior',width:26,length:26,position:[0,-.015,0],material:{...surfacePatch('stone'),color:'#635773',textureSize:2}});
  const room=add('floor',{name:style==='street'?'Rua · volume de névoa':'Interior · zona de ambiente',width:12,length:style==='ritual'?18:12,material:{...surfacePatch(style==='tavern'?'wood':'stone'),color:style==='ritual'?'#a19090':'#8d8a83'}});
  room.lightingZone={...structuredClone(ZONE_DEFAULTS),position:[0,4,0],size:[12,9,room.length],blend:.6,color:style==='ritual'?'#d5243b':style==='tavern'?'#d6a46c':'#aecada',intensity:style==='ritual'?.22:.4,fogColor:style==='ritual'?'#7b263a':'#8193a4',fogDensity:style==='ritual'?.035:style==='street'?.035:0};
  if(style!=='street'){
    for(const [name,position,length,rotation]of [['Fundo',[-6,0,-room.length/2],12,yaw(0)],['Lateral esquerda',[-6,0,-room.length/2],room.length,yaw(-Math.PI/2)],['Lateral direita',[6,0,-room.length/2],room.length,yaw(-Math.PI/2)]])add('wall',{name,position,length,rotation,height:style==='ritual'?7:3.6,material:{...surfacePatch('stone'),color:style==='ritual'?'#968089':'#b2a48e'}});
  }
  if(style==='ritual'){
    scene.look.volumetricFog.enabled=false;scene.look.fill={skyColor:'#ae7fce',groundColor:'#432b53',intensity:.6};
    for(const x of [-5,5])for(const z of [-6,-2,2,6])prop('church-clustered-pier',[x,0,z],{scale:[.7,.7,.7]});
    prop('church-banquet-table',[0,0,-3]);prop('church-headless-seraph',[0,0,-7]);
    for(const x of [-3,3])prop('church-stained-window',[x,0,-8.85],{scale:[.7,.7,.7],illumination:source('window',{position:[0,5,.35],rotation:[-Math.sin(Math.PI/12),0,0,Math.cos(Math.PI/12)],intensity:180,priority:40,shadowPolicy:'priority',projectionSeed:x<0?21:42})});
    for(const x of [-3,3])for(const z of [-3,4])prop('church-candelabra',[x,0,z],{illumination:source('candle',{position:[0,1.8,0],intensity:22,shadowPolicy:'off'})});
    prop('ritual-candelabra',[0,0,-5],{illumination:source('ritual',{position:[0,1.2,0],intensity:80,priority:30})});
  }else if(style==='tavern'){
    for(const x of [-2.5,2.5]){prop('dining-table',[x,0,0]);for(const z of [-1.4,1.4])prop('chair',[x,0,z],{rotation:yaw(z<0?0:Math.PI)});prop('candles',[x,.9,0],{illumination:source('candle',{position:[0,.3,0],intensity:16,shadowPolicy:'off'})});}
    for(const x of [-4,4])prop('kerosene-lantern',[x,1.8,-4],{illumination:source('lamp',{type:'spot',position:[0,.4,0],intensity:95,priority:30,angle:Math.PI/3,shadowPolicy:'priority'})});
    prop('wooden-expedition-barrel',[-4,0,3]);prop('wooden-expedition-barrel',[-4,0,4.5]);
  }else if(style==='office'){
    for(const x of [-2.7,2.7])for(const z of [-2.3,2.3]){prop('desk',[x,0,z]);prop('computer',[x,.8,z]);prop('chair',[x,0,z+1.3]);}
    for(const x of [-3,3])prop('surgical-lamp',[x,0,-4.5],{illumination:source('fluorescent',{position:[0,3,1],intensity:125,angle:Math.PI/3,priority:30,shadowPolicy:'priority'})});
  }else{
    room.material={...surfacePatch('stone'),color:'#515865',roughness:.22,metalness:.15};scene.look.rendering={reflections:true,reflectionIntensity:.4,ao:true,aoIntensity:.3,volumetricLights:true,volumeStrength:.5,cutawayShadows:false};scene.look.weather.type='rain';scene.look.weather.count=350;scene.look.weather.center=[0,4,0];scene.look.weather.size=[16,8,16];scene.look.weather.speed=10;
    for(const x of [-4,4])for(const z of [-4,4])prop('streetlamp',[x,0,z],{illumination:source('lamp',{type:'spot',position:[0,3.4,0],intensity:120,angle:Math.PI/3,priority:30,shadowPolicy:'priority',projection:'leaves'})});
    for(const z of [-3,0,3])prop('barrel',[-5.5,0,z]);for(const x of [-9,9])add('floor',{name:'Calçada',width:5,length:16,position:[x,.15,0],material:{...surfacePatch('stone'),color:'#817e81'}});
  }
  for(const [name,position,target,projection,orthographicHeight]of [['Visão geral',[18,18,24],[0,1,0],'perspective',24],['Vista superior',[0,25,.01],[0,0,0],'orthographic',30],['Dentro do ambiente',[0,2.2,8],[0,2,-4],'perspective',20]]){const id=uuid();scene.cameraPresets[id]={id,name,position,target,projection,orthographicHeight,fov:50};}
  // Exterior has no region; it retains the global fill while the room applies local fill.
  exterior.name='Exterior · preenchimento global';return validateDocument(scene);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const {assets}=JSON.parse(await readFile(new URL('../public/assets/catalog.json',import.meta.url),'utf8'));await mkdir(new URL('../public/scenes/',import.meta.url),{recursive:true});
  for(const item of LIGHTING_EXAMPLES)await writeFile(new URL('../public/scenes/'+item.id+'.json',import.meta.url),JSON.stringify(createLightingExample(assets,item.style),null,2)+'\n');
}
