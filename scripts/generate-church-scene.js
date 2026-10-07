import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {createScene,createEntity,createLight,validateDocument} from '../src/domain/documents.js';
import {applyEnvironment} from '../src/domain/environments.js';
import {surfacePatch} from '../src/domain/materials.js';
import {wearDefaults} from '../src/domain/wear.js';
import {rockDefaults} from '../src/domain/rocks.js';
import {terrainHeightAt} from '../src/domain/geometry.js';
import {illuminationDefaults,ZONE_DEFAULTS} from '../src/domain/dynamic-lighting.js';

export const CHURCH = Object.freeze({id:'igreja-antiga',name:'Igreja Antiga · templo e vale dos vampiros',center:[-12,18.8,-10],width:19,length:35,galleryHeight:5.8,roofHeight:11.375});
export const CHURCH_APPROACH = Object.freeze([[20,0,65],[16,5,55],[5,11,44],[-8,16,34],[-12,18.08,26],[-12,18.08,16]]);
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const yaw=a=>[0,Math.sin(a/2),0,Math.cos(a/2)];
const aim=(direction)=>new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(...direction).normalize()).toArray();
const round=v=>Number(v.toFixed(5));

export function churchApproachAt(x,z) {
  let closest={distance:Infinity,height:0};
  for(let i=1;i<CHURCH_APPROACH.length;i++) {
    const a=CHURCH_APPROACH[i-1],b=CHURCH_APPROACH[i],dx=b[0]-a[0],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz));
    const distance=Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz);
    if(distance<closest.distance)closest={distance,height:a[1]+t*(b[1]-a[1])};
  }
  return closest;
}

/** Ordinary schema-2 entities; the generator is never needed to edit/play the result. */
export function createChurchScene(catalog) {
  let sequence=1,randomState=72891;
  const uuid=()=>`d4000000-0000-4000-8000-${String(sequence++).padStart(12,'0')}`;
  const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
  const scene=applyEnvironment(createScene(CHURCH.name),'ritual'),assets=new Map(catalog.map(a=>[a.id,a]));
  Object.assign(scene,{id:uuid(),createdAt:'2026-10-07T12:00:00.000Z',updatedAt:'2026-10-07T12:00:00.000Z'});
  scene.layout.grid={...scene.layout.grid,cellSize:1.5,visible:false,snap:false};
  scene.look.effectsPaused=true;
  scene.look.fill={skyColor:'#c09bd2',groundColor:'#49314b',intensity:.55};
  scene.look.background='#362344';scene.look.daylight={phase:'night',exposure:1.12};
  Object.assign(scene.look.sky,{enabled:true,topColor:'#24112f',horizonColor:'#89529f',cloudColor:'#ac81bf',cloudCoverage:.28,cloudOpacity:.19,discSize:.065,cloudSpeed:.008,seed:47});
  Object.assign(scene.look.fog,{enabled:true,mode:'linear',color:'#885c9e',near:85,far:255});
  Object.assign(scene.look.volumetricFog,{enabled:true,color:'#87518f',density:.017,baseHeight:-24,height:39,maxDistance:180});
  Object.assign(scene.look.bloom,{enabled:true,strength:.18,radius:.35,threshold:1});
  scene.look.rendering={reflections:true,reflectionIntensity:.2,ao:true,aoIntensity:.28,aoRadius:.55,volumetricLights:true,volumeStrength:.35,cutawayShadows:true};
  const moon=createLight({id:uuid(),name:'Lua violeta sobre o vale',role:'key',type:'directional',position:[-20,60,-45],rotation:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-.4,.55,-.75).normalize()).toArray(),color:'#cfb4e5',intensity:1.15,shadowEnabled:true});
  scene.look.lights={[moon.id]:moon};
  scene.layout.levels={};scene.layout.layers={};
  const organizational=(collection,name,extra={})=>{const id=uuid();scene.layout[collection][id]={id,name,visible:true,locked:false,audience:'all',...extra};return id;};
  const levels={land:organizational('levels','Vale e aproximação',{elevation:0}),nave:organizational('levels','Igreja · térreo',{elevation:18.8}),half:organizational('levels','Escadas · patamar',{elevation:21.7}),gallery:organizational('levels','Igreja · galerias',{elevation:24.6})};
  const roofLayer=organizational('layers','Coberturas · ocultar para vista superior');
  const horizonLayer=organizational('layers','Horizonte · montanhas cenográficas');
  const groups={};
  for(const [key,name]of Object.entries({land:'01 · Vale, platô e caminho',cliffs:'02 · Paredões e abismos',vegetation:'03 · Árvores secas e entulho',structure:'04 · Nave e fachada',arcades:'05 · Arcadas, pilares e vitrais',galleries:'06 · Galerias e balcões',stairs:'07 · Torres e acessos',ritual:'08 · Banquete e conjunto ritual',hooks:'09 · Sala das correntes',sacristy:'10 · Sacristia',roof:'11 · Coberturas (ocultar para planta)',horizon:'12 · Horizonte distante'}))groups[key]=organizational('groups',name,{parentId:null});
  const world=(x,y,z)=>[CHURCH.center[0]+x,CHURCH.center[1]+y,CHURCH.center[2]+z];
  const add=(kind,options)=>{const e=createEntity(kind,{id:uuid(),...options});scene.layout.entities[e.id]=e;return e;};
  const prop=(id,position,options={})=>{
    const a=assets.get('builtin-'+id);if(!a)throw new Error('Asset necessário ausente: '+id);
    return add('prop',{name:a.name,assetRef:{id:a.id,revision:a.revision},footprint:a.footprint,...(a.supportHeight?{supportHeight:a.supportHeight}:{}),position,...options});
  };
  const wear=(seed,amount=.32,placement='base')=>({...wearDefaults('grime'),seed,amount,size:1.8,placement,color:'#3e3034'});
  const stone={...surfacePatch('stone'),textureColorMode:'replace',textureColor:'#aaa09b',textureSize:1.5,textureBrightness:.85,textureContrast:.9,relief:.018,wear:wear(18,.3)};
  const paving={...stone,textureColor:'#817779',textureSize:1.1,textureBrightness:.9,wear:wear(50,.22,'all')};
  const rock={...surfacePatch('rock'),rockPattern:'organic',textureColorMode:'replace',textureColor:'#66606c',textureSize:4,textureBrightness:.85,textureContrast:1.2,rockCracks:.82,relief:.035};
  const source=(profile,extra={})=>({...illuminationDefaults(profile,{kind:'prop'}),...extra});
  const zone=(extra)=>({...structuredClone(ZONE_DEFAULTS),...extra});
  const floor=(name,x,y,z,width,length,extra={})=>add('floor',{name,position:world(x,y,z),width,length,material:paving,groupId:groups.structure,levelId:levels.nave,...extra});
  const wall=(name,x,y,z,length,rotation=0,height=CHURCH.roofHeight,extra={})=>add('wall',{name,position:world(x,y,z),length,rotation:yaw(rotation),height,thickness:.48,material:stone,groupId:groups.structure,levelId:levels.nave,...extra});
  const opening=(host,name,offset,width,height,extra={})=>add('door',{name,wallId:host.id,offset,width,height,initialAngle:Math.PI/2,material:{...surfacePatch('wood'),textureColorMode:'replace',textureColor:'#30232b',roughness:.9},groupId:host.groupId,levelId:host.levelId,...extra});

  // A broad editable heightfield carries the route; independent cliffs supply vertical silhouettes.
  const segments=64,width=128,length=144,heights=[],weights=[];
  for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++) {
    const x=(col/segments-.5)*width,z=(row/segments-.5)*length+6;
    const rough=1.4*Math.sin(x*.18+z*.12)+.9*Math.cos(z*.32-x*.1)+.35*Math.sin(x*.81+z*.53);
    let h=-7+rough-13*Math.exp(-((x-22)**2/180+(z-23)**2/480));
    const outside=Math.max(Math.abs(x+12)-22,Math.abs(z+9)-28);
    h=h*smooth(-1,8,outside)+18.08*(1-smooth(-1,8,outside));
    const path=churchApproachAt(x,z),blend=1-smooth(2.8,6.5,path.distance);
    h=h*(1-blend)+(path.height+.08*Math.sin(z*.6))*blend;
    // Keep the entire church footprint and the forecourt level, below the authored slabs.
    if(x>-32&&x<8&&z>-34&&z<17)h=18.08;
    heights.push(round(h));weights.push(round((1-smooth(1.8,3.8,path.distance))*.78));
  }
  const terrain=add('terrain',{name:'Vale rochoso · caminho ascendente esculpido',position:[0,0,6],width,length,segments,heights,material:rock,paintLayers:[{id:uuid(),name:'Trilha de terra seca',color:'#9e8a8e',opacity:.7,visible:true,weights}],groupId:groups.land,levelId:levels.land});
  const ground=(x,z)=>terrainHeightAt(terrain,[x,0,z]);
  const courtyard=floor('Adro · apoio do platô',0,-.6,19,30,12,{vertices:[[-15,-6],[12,-6],[15,-3],[14,5],[8,6],[-15,5]],thickness:.22,groupId:groups.land});
  floor('Fundação da igreja',0,-.12,-.1,20,36,{thickness:.9});
  const nave=floor('Nave · piso de combate',0,0,0,19,35,{thickness:.22});
  nave.lightingZone=zone({position:[0,6.6,0],size:[19.1,14,35.2],blend:.65,priority:30,color:'#db5965',intensity:.3,fogColor:'#8c2035',fogDensity:.012});
  courtyard.lightingZone=zone({position:[0,-10,5],size:[65,19,64],blend:4,priority:5,color:'#b37cbd',intensity:.5,fogColor:'#a85d9d',fogDensity:.024});
  add('stairs',{name:'Degraus da entrada principal',position:world(0,-.6,19),width:6,length:3,height:.6,steps:4,rotation:yaw(Math.PI),material:stone,groupId:groups.land,levelId:levels.nave});

  // Closed lower walls, true doors, and upper stone infills with true pointed openings.
  const left=wall('Parede inferior · lado da torre',-9.5,0,-17.5,35,-Math.PI/2,5.8);
  const right=wall('Parede inferior · sala das correntes',9.5,0,-17.5,35,-Math.PI/2,5.8);
  opening(left,'Porta da torre e escada esquerda',28.5,1.7,2.8);
  opening(right,'Porta da escada direita',28.5,1.7,2.8);
  opening(right,'Porta da sala de correntes',8,1.65,2.65);
  const front=wall('Fachada · três portais',-9.5,0,17.5,19,0,6.2);
  opening(front,'Porta principal aberta',9.5,3.4,4.7);
  opening(front,'Portal esquerdo aberto',3.5,1.8,3.4);
  opening(front,'Portal direito aberto',15.5,1.8,3.4,{hinge:'right'});
  prop('church-pointed-arch',world(0,0,17.8),{scale:[1.12,.94,.7],groupId:groups.structure,levelId:levels.nave});
  for(const x of [-6,6])prop('church-round-arcade',world(x,0,17.77),{scale:[.52,.7,.7],groupId:groups.structure,levelId:levels.nave});
  const back=wall('Cabeceira · parede do altar',-9.5,0,-17.5,19,0,CHURCH.roofHeight);
  opening(back,'Passagem para a sacristia',15.5,1.65,2.7);
  const bayCenters=[-13.75,-8.25,-2.75,2.75,8.25,13.75];
  const pierPositions=[-16.5,-11,-5.5,0,5.5,11,16.5];
  for(const sign of [-1,1]) {
    const angle=sign*Math.PI/2;
    let start=-17.5;
    for(const z of [...bayCenters,18.88]) {
      const end=z-1.38;
      const section=wall('Alvenaria entre vitrais',sign*9.5,5.8,start,end-start,-Math.PI/2,5.575,{levelId:levels.gallery});
      if(start<11&&end>11)opening(section,'Acesso superior da galeria',11-start,1.7,2.7);
      if(z<17.5) {
        wall('Peitoril sob o vitral',sign*9.5,5.8,z-1.38,2.76,-Math.PI/2,.4,{levelId:levels.gallery});
        prop('church-window-spandrel',world(sign*9.5,6.2,z),{rotation:yaw(angle),scale:[1.15,1.15,1],groupId:groups.arcades,levelId:levels.gallery});
        prop('church-stained-window',world(sign*9.5,6.2,z),{name:`Vitral ${sign<0?'esquerdo':'direito'} · vão ${bayCenters.indexOf(z)+1}`,rotation:yaw(angle),scale:[1.15,1.15,1],groupId:groups.arcades,levelId:levels.gallery,
          ...(Math.abs(z)===8.25?{illumination:source('window',{color:'#ff394f',position:[0,2.1,-.45],rotation:aim([0,-.5,-1]),intensity:145,distance:19,priority:11,shadowPolicy:'priority',mapSize:512,projectionSeed:sign<0?47:93})}:{})});
      }
      start=z+1.38;
    }
    for(const z of pierPositions) {
      prop('church-clustered-pier',world(sign*7.35,0,z),{scale:[.8,5.8/5.4,.8],groupId:groups.arcades,levelId:levels.nave,material:{textureSlot:'limestone',wear:wear(300+Math.round(z*10)+sign,.3)}});
      prop('church-clustered-pier',world(sign*9.2,5.8,z),{scale:[.5,5.575/5.4,.5],groupId:groups.arcades,levelId:levels.gallery});
      prop('church-buttress',world(sign*10.3,0,z),{rotation:yaw(sign>0?Math.PI:0),scale:[1,1.8,1.1],groupId:groups.structure,levelId:levels.nave});
      prop('church-pinnacle',world(sign*10.25,10.9,z),{scale:[1.15,1.15,1.15],groupId:groups.structure,levelId:levels.gallery});
    }
    for(const z of bayCenters)prop('church-round-arcade',world(sign*7.35,0,z),{rotation:yaw(angle),scale:[1.2,1.05,.85],groupId:groups.arcades,levelId:levels.nave});
  }
  let frontStart=-9.5;
  for(const x of [-5.4,0,5.4,10.88]) {
    wall('Fachada alta entre vitrais',frontStart,6.2,17.5,x-1.38-frontStart,0,5.175,{levelId:levels.gallery});
    if(x<9.5) {
      for(const id of ['church-window-spandrel','church-stained-window'])prop(id,world(x,6.2,17.5),{scale:[1.15,1.15,1],groupId:groups.arcades,levelId:levels.gallery});
    }
    frontStart=x+1.38;
  }
  for(const z of [-17.5,17.5])prop('church-ogival-gable',world(0,11.375,z),{scale:[1.85,1,1],rotation:yaw(z<0?Math.PI:0),groupId:groups.structure,levelId:levels.gallery});
  prop('church-double-cross',world(0,18.8,17.8),{scale:[1.25,1.25,1.25],groupId:groups.structure,levelId:levels.gallery});

  // Side walkways and front gallery leave the complete central nave empty above the banqueting table.
  for(const sign of [-1,1]) {
    const gallery=floor(`Galeria ${sign<0?'esquerda':'direita'} · apoio`,sign*8.4,5.8,0,2.2,35,{groupId:groups.galleries,levelId:levels.gallery,thickness:.22});
    for(const z of [-11,0,11]) {
      const angle=-sign*Math.PI/2;
      prop('church-curved-balcony',world(sign*7.4,5.8-1.14*1.1,z),{rotation:yaw(angle),scale:[1.05,1.1,.85],groupId:groups.galleries,levelId:levels.gallery,surfaceId:null});
      const contour=Array.from({length:17},(_,i)=>[round(Math.cos(i*Math.PI/16)*2.1),round(Math.sin(i*Math.PI/16)*1.7)]);
      floor('Balcão curvo · apoio no contorno real',sign*(7.4+assets.get('builtin-church-curved-balcony').bounds[2]/2*.85),5.805,z,4.2,1.7,{vertices:contour,rotation:yaw(angle),thickness:.035,groupId:groups.galleries,levelId:levels.gallery,surfaceId:gallery.id});
    }
    for(const z of [-16,-5.5,5.5,16])prop('church-balustrade',world(sign*7.3,5.8,z),{rotation:yaw(Math.PI/2),scale:[Math.abs(z)===16?.65:2.1,1,1],groupId:groups.galleries,levelId:levels.gallery,surfaceId:gallery.id});
  }
  const frontGallery=floor('Galeria sobre a entrada · apoio',0,5.8,16.15,19,2.7,{groupId:groups.galleries,levelId:levels.gallery});
  for(const x of [-6,-3,0,3,6])prop('church-balustrade',world(x,5.8,14.8),{groupId:groups.galleries,levelId:levels.gallery,surfaceId:frontGallery.id});
  for(const z of [-15,-10,-5,0,5,10,15]) {
    prop('church-vault-ribs',world(0,11.35,z),{scale:[1.87,1,1.25],groupId:groups.roof,levelId:levels.gallery,layerId:roofLayer});
    prop('church-roof-shell',world(0,11.375,z),{scale:[1.85,1,1.25],groupId:groups.roof,levelId:levels.gallery,layerId:roofLayer,material:{textureSlot:'limestone',wear:wear(800+z,.25,'all')}});
  }

  // Two real switchback stairs link the nave with the side galleries. Belfry crown is scenic.
  for(const sign of [-1,1]) {
    const x=sign*12.1;
    floor('Torre · vestíbulo de acesso',x,0,12.6,5.2,5.2,{groupId:groups.stairs});
    wall('Torre · parede exterior',sign*14.7,0,10,5.2,-Math.PI/2,sign<0?10.9:8.8,{groupId:groups.stairs});
    wall('Torre · parede posterior',x-2.6,0,10,5.2,0,sign<0?10.9:8.8,{groupId:groups.stairs});
    const entry=wall('Torre · porta exterior',x-2.6,0,15.2,5.2,0,sign<0?10.9:8.8,{groupId:groups.stairs});
    opening(entry,'Porta lateral da torre',2.6,1.8,2.8);
    add('stairs',{name:'Escada da galeria · primeiro lance',position:world(x+sign*1.25,0,12.4),width:1.65,length:3.6,height:2.9,steps:16,material:stone,groupId:groups.stairs,levelId:levels.nave,fromLevelId:levels.nave,toLevelId:levels.half});
    floor('Escada · patamar de retorno',x,2.9,14.65,4.3,.95,{groupId:groups.stairs,levelId:levels.half});
    add('stairs',{name:'Escada da galeria · segundo lance',position:world(x-sign*1.25,2.9,12.4),rotation:yaw(Math.PI),width:1.65,length:3.6,height:2.9,steps:16,material:stone,groupId:groups.stairs,levelId:levels.half,fromLevelId:levels.half,toLevelId:levels.gallery});
    floor('Escada · patamar da galeria',x,5.8,10.65,5.2,1.3,{groupId:groups.stairs,levelId:levels.gallery});
    if(sign<0) {
      prop('church-bell-tower',world(x,10.9,12.6),{scale:[1.2,1,1.2],groupId:groups.roof,layerId:roofLayer,levelId:levels.gallery});
      prop('bell',world(x,16.3,12.6),{scale:[1.6,1.6,1.6],groupId:groups.roof,layerId:roofLayer,levelId:levels.gallery});
    }else {
      prop('church-roof-shell',world(x,8.8,12.6),{scale:[.52,.48,1.3],groupId:groups.roof,levelId:levels.gallery,layerId:roofLayer});
      for(const z of [10,15.2])prop('church-ogival-gable',world(x,8.8,z),{scale:[.52,.48,1],groupId:groups.stairs,levelId:levels.gallery});
    }
  }

  // Nave dressing: a coherent pre-fire state, displaced pews and an intact central banquet.
  const altar=floor('Presbitério · patamar do ritual',0,.9,-13.2,11,8.6,{groupId:groups.ritual,thickness:.9});
  add('stairs',{name:'Degraus do presbitério',position:world(0,0,-7.9),rotation:yaw(Math.PI),width:9,length:2,height:.9,steps:6,material:stone,groupId:groups.ritual,levelId:levels.nave});
  prop('church-headless-seraph',world(0,.9,-15.9),{groupId:groups.ritual,levelId:levels.nave,surfaceId:altar.id,material:{textureSlot:'limestone',wear:wear(601,.24)},illumination:source('ritual',{type:'spot',position:[0,6,1.9],rotation:aim([0,-1,-.17]),intensity:165,distance:14,angle:Math.PI/3,priority:12,shadowPolicy:'priority',mapSize:512})});
  prop('church-iron-maiden',world(0,.9,-10.8),{groupId:groups.ritual,levelId:levels.nave,surfaceId:altar.id});
  prop('church-double-cross',world(0,7.1,-17.2),{scale:[1.5,1.5,1.5],groupId:groups.ritual,levelId:levels.nave,material:{textureSlot:'iron',emissive:'#ff0d24',emissiveIntensity:3}});
  const altarTable=prop('ritual-altar',world(0,.9,-14.4),{scale:[1.8,1,1.3],groupId:groups.ritual,levelId:levels.nave,surfaceId:altar.id});
  prop('ritual-book',world(.35,1.91,-14.4),{rotation:yaw(.15),groupId:groups.ritual,levelId:levels.nave,surfaceId:altarTable.id});
  prop('ritual-circle',world(0,.905,-11),{scale:[1.6,1,1.6],groupId:groups.ritual,levelId:levels.nave,surfaceId:altar.id});
  for(const x of [-4.8,4.8])prop('church-ritual-banner',world(x,3.8,-17.05),{scale:[1.35,1.6,1],groupId:groups.ritual,levelId:levels.nave});
  const tables=[4.5,-.9].map(z=>prop('church-banquet-table',world(0,0,z),{name:'Mesa do banquete · tampo contínuo',groupId:groups.ritual,levelId:levels.nave,surfaceId:nave.id}));
  for(let i=0;i<8;i++) {
    const z=-2.9+i*1.3,table=tables[z>1.8?0:1];
    for(const sign of [-1,1]) {
      prop('church-pointed-chair',world(sign*1.38,0,z),{rotation:yaw(-sign*Math.PI/2),groupId:groups.ritual,levelId:levels.nave,surfaceId:nave.id});
      prop('church-banquet-setting',world(sign*.38,1.04,z),{rotation:yaw(-sign*Math.PI/2),scale:[.9,.9,.9],groupId:groups.ritual,levelId:levels.nave,surfaceId:table.id});
    }
  }
  for(const z of [-2.5,0,2.5,5,7])prop('church-candelabra',world(0,1.04,z),{groupId:groups.ritual,levelId:levels.nave,surfaceId:tables[z>1.8?0:1].id,...([0,5].includes(z)?{illumination:source('candle',{position:[0,1.15,0],color:'#ff8a60',intensity:32,distance:9,shadowPolicy:'off',priority:10})}:{})});
  for(const x of [-3.5,3.5])for(const z of [-16,-13.8,-10])prop('candles',world(x,.9,z),{scale:[1.35,1.35,1.35],groupId:groups.ritual,levelId:levels.nave,surfaceId:altar.id});
  for(const sign of [-1,1])for(const z of [-3,2.6,8.5,12])prop('church-pew',world(sign*(4.6+random()*.4),0,z),{rotation:yaw(sign*(.15+random()*.4)),groupId:groups.ritual,levelId:levels.nave,surfaceId:nave.id});
  for(const [x,z,angle]of [[-4.7,7.5,.8],[4.4,10,-.5],[-5,-5.4,.4]])prop('church-pointed-chair',world(x,.36,z),{rotation:new THREE.Quaternion().setFromEuler(new THREE.Euler(0,angle,Math.PI/2)).toArray(),groupId:groups.ritual,levelId:levels.nave,surfaceId:nave.id});
  for(const sign of [-1,1])for(const z of [-8.2,8.2])prop('church-ritual-banner',world(sign*7.15,6.5,z),{rotation:yaw(-sign*Math.PI/2),scale:[.9,1,1],groupId:groups.galleries,levelId:levels.gallery});

  // The low room's position and its connection are an adaptation of the unseen plan.
  const hooks=floor('Sala de correntes · piso',13.5,0,-9.5,8,9,{groupId:groups.hooks});
  hooks.lightingZone=zone({position:[0,1.8,0],size:[8.2,3.8,9.2],priority:40,blend:.3,color:'#c62f42',intensity:.34,fogColor:'#881b2e',fogDensity:.018});
  wall('Correntes · parede dos ganchos',17.5,0,-14,9,-Math.PI/2,3.6,{groupId:groups.hooks,material:{...stone,wear:wear(718,.7,'all')}});
  for(const z of [-14,-5])wall('Correntes · parede transversal',9.5,0,z,8,0,3.6,{groupId:groups.hooks});
  floor('Correntes · teto baixo',13.5,3.6,-9.5,8.3,9.3,{layerId:roofLayer,groupId:groups.roof,thickness:.22});
  for(const z of [-11.5,-7.3])prop('church-hook-rack',world(17.16,1.25,z),{rotation:yaw(-Math.PI/2),groupId:groups.hooks,levelId:levels.nave,material:{textureSlot:'iron',wear:{...wearDefaults('rust'),amount:.5,seed:718}}});
  const hookTable=prop('church-banquet-table',world(12.5,0,-10),{scale:[1,1,.8],groupId:groups.hooks,levelId:levels.nave,surfaceId:hooks.id});
  prop('ritual-book',world(12.5,1.04,-10.8),{groupId:groups.hooks,levelId:levels.nave,surfaceId:hookTable.id});
  prop('church-candelabra',world(12.5,1.04,-8.6),{groupId:groups.hooks,levelId:levels.nave,surfaceId:hookTable.id,illumination:source('ritual',{position:[0,1.1,0],intensity:42,distance:8,shadowPolicy:'off'})});
  prop('old-closed-crate',world(16.3,0,-12.9),{groupId:groups.hooks,levelId:levels.nave,surfaceId:hooks.id});
  prop('restraint-chair',world(15.8,0,-6.3),{rotation:yaw(Math.PI),groupId:groups.hooks,levelId:levels.nave,surfaceId:hooks.id});
  const sacristy=floor('Sacristia · piso de apoio',3,0,-20.25,13,5.5,{groupId:groups.sacristy});
  sacristy.lightingZone=zone({position:[0,1.8,0],size:[13,3.6,5.5],priority:40,blend:.3,color:'#966975',intensity:.25,fogDensity:0});
  wall('Sacristia · fundo',-3.5,0,-23,13,0,3.6,{groupId:groups.sacristy});
  for(const x of [-3.5,9.5])wall('Sacristia · lateral',x,0,-23,5.5,-Math.PI/2,3.6,{groupId:groups.sacristy});
  floor('Sacristia · cobertura',3,3.6,-20.25,13.4,5.9,{groupId:groups.roof,layerId:roofLayer});
  prop('bookshelf',world(-2,0,-22.4),{groupId:groups.sacristy,levelId:levels.nave,surfaceId:sacristy.id});
  prop('coffin',world(1,0,-21.2),{rotation:yaw(.1),groupId:groups.sacristy,levelId:levels.nave,surfaceId:sacristy.id});
  prop('old-open-crate',world(7.8,0,-22),{groupId:groups.sacristy,levelId:levels.nave,surfaceId:sacristy.id});
  prop('candles',world(-1.8,1.9,-22.4),{groupId:groups.sacristy,levelId:levels.nave,illumination:source('candle',{position:[0,.3,0],intensity:18,distance:7,shadowPolicy:'off'})});

  const cliff=(name,x,y,z,scale,angle,seed,id='organic-cliff')=>prop(id,[x,y,z],{name,scale,rotation:yaw(angle),rockShape:{...rockDefaults('builtin-'+id),seed,detail:4},material:rock,groupId:groups.cliffs,levelId:levels.land});
  for(const [x,z,angle]of [[-36,-23,-Math.PI/2],[-36,-3,-Math.PI/2],[-34,15,-.8],[-17,18,0],[2,16,.2],[11,-3,Math.PI/2],[10,-24,Math.PI/2],[-14,-37,Math.PI]])cliff('Paredão que sustenta o templo',x,-8,z,[2.6,3.65,1.6],angle,1000+sequence);
  for(const [x,z,height,angle]of [[34,24,4,.5],[44,-7,4.8,.3],[22,-37,3.7,.9],[-50,30,3.9,-.8],[40,48,3.3,-.4]])cliff('Monólito separado pelo desfiladeiro',x,-11,z,[1.8,height,2],angle,2000+sequence);
  for(const [x,z]of [[27,10],[30,45],[-42,-41],[-46,50]])cliff('Agulha rochosa do vale',x,ground(x,z)-.4,z,[1.7,3.3,1.8],random()*Math.PI,3000+sequence,'mountain-rock-spire');
  // Crimson light below the plateau suggests the reference glow, without inventing lava.
  for(const [x,z]of [[3,25],[15,10]]) {
    const e=cliff('Afloramento rubro sob o platô',x,-5,z,[1.5,1.7,1.3],.3,4000+sequence,'organic-rock');
    e.illumination=source('ritual',{position:[0,2.1,1],intensity:95,distance:17,shadowPolicy:'off',priority:10,color:'#fb1738'});
    e.lightingZone=zone({position:[0,2,0],size:[18,12,18],blend:3,priority:8,color:'#a72d49',intensity:.45,fogColor:'#c33869',fogDensity:.028});
  }
  const trees=[[-27,18],[-2,23],[1,36],[-18,34],[15,52],[28,58],[-30,32],[4,50],[-29,3],[-31,-24],[8,-20],[16,-13]];
  for(let i=0;i<38;i++) {
    const x=-57+random()*114,z=-55+random()*122,path=churchApproachAt(x,z);
    if(path.distance<4.5||x>-33&&x<8&&z>-35&&z<18||Math.hypot(x-34,z-24)<11)continue;
    trees.push([x,z]);
  }
  for(const [i,[x,z]]of trees.filter(([x,z])=>churchApproachAt(x,z).distance>=4.5).entries()) {
    const scale=1.4+random()*1.05;
    prop(i%4===0?'dead-tree':'bare-mountain-tree',[x,ground(x,z),z],{name:'Árvore seca do vale',scale:[scale,scale*1.25,scale],rotation:yaw(random()*Math.PI*2),groupId:groups.vegetation,levelId:levels.land,material:{textureSlot:'wood',wear:{...wearDefaults('grime'),color:'#29222c',amount:.2,seed:i+1}}});
  }
  for(let i=0;i<15;i++) {
    const z=19+random()*43,p=CHURCH_APPROACH[Math.floor(random()*4)],x=p[0]+(random()>.5?1:-1)*(4.6+random()*3),y=ground(x,z);
    if(churchApproachAt(x,z).distance<3.5)continue;
    prop(i%3===0?'forked-dead-branch':'rock-scree',[x,y,z],{scale:[1+random(),.7+random(),1+random()],rotation:yaw(random()*6.28),...(i%3?{rockShape:{...rockDefaults('builtin-rock-scree'),seed:i+600,detail:3},material:rock}:{}),groupId:groups.vegetation,levelId:levels.land});
  }
  // Far scenery has deliberately lower density and no source lights.
  for(const [i,[x,z,w,d,angle]]of [[-100,-50,65,95,.3],[80,-67,70,100,-.3],[-30,-110,105,50,0],[-105,43,50,85,.2],[100,45,55,90,-.2]].entries()) {
    const n=20,h=[];
    for(let row=0;row<=n;row++)for(let col=0;col<=n;col++) {
      const u=col/n,v=row/n,envelope=Math.sin(Math.PI*u)**.6*Math.sin(Math.PI*v)**.6;
      const ridge=17+14*Math.abs(Math.sin(u*18+i))+8*Math.abs(Math.sin(u*39+v*13+i));
      h.push(round(-14+envelope*ridge+2*Math.sin(u*41+v*17)));
    }
    add('terrain',{name:'Cordilheira distante · plano '+(i+1),position:[x,0,z],rotation:yaw(angle),width:w,length:d,segments:n,heights:h,paintLayers:[],material:{...rock,textureColor:['#65566e','#77627c','#705879','#56475f','#64516d'][i],textureSize:8,relief:.01},groupId:groups.horizon,layerId:horizonLayer,levelId:levels.land});
  }
  const cameras=[
    ['01 · Igreja sobre o desfiladeiro',[-64,51,78],[-10,27,-5],48,'perspective',100],
    ['02 · Caminho de aproximação',[10,18,62],[-15,31,0],55,'perspective',80],
    ['03 · Fachada e torre',world(-25,9,37),world(-2,9,13),52,'perspective',60],
    ['04 · Nave em direção ao altar',world(0,3.1,13.2),world(0,4.1,-12),64,'perspective',40],
    ['05 · Galeria em direção à entrada',world(4.6,7.2,-12.5),world(0,4.5,14.5),66,'perspective',40],
    ['06 · Dama de Ferro e Serafim',world(3.5,3,-6),world(0,3.3,-13.5),56,'perspective',30],
    ['07 · Sala de correntes',world(14.5,1.9,-5.9),world(17,1.8,-10.5),64,'perspective',20],
    ['08 · Sacristia',world(7.7,2.1,-21.2),world(-2,1.3,-21.8),62,'perspective',20],
    ['09 · Planta da igreja (ocultar Coberturas)',world(0,68,.01),world(0,0,0),50,'orthographic',48],
    ['10 · Vale e percurso superior',[-10,125,15],[-10,0,14.99],50,'orthographic',160],
  ];
  for(const [name,position,target,fov,projection,orthographicHeight]of cameras) {const id=uuid();scene.cameraPresets[id]={id,name,position,target,fov,projection,orthographicHeight};}
  return validateDocument(scene);
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const {assets}=JSON.parse(await readFile(new URL('../public/assets/catalog.json',import.meta.url),'utf8'));
  const scene=createChurchScene(assets);await mkdir(new URL('../public/scenes/',import.meta.url),{recursive:true});
  await writeFile(new URL('../public/scenes/igreja-antiga.json',import.meta.url),JSON.stringify(scene,null,2)+'\n');
  console.log(`Igreja Antiga: ${Object.keys(scene.layout.entities).length} elementos, ${Object.keys(scene.cameraPresets).length} câmeras.`);
}
