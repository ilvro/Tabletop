import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createScene,createEntity,createLight,validateDocument} from '../src/domain/documents.js';
import {applyEnvironment} from '../src/domain/environments.js';
import {surfacePatch,coverageDefaults,layerSurfacePatch} from '../src/domain/materials.js';
import {terrainHeightAt,pointInPolygon} from '../src/domain/geometry.js';
import {rockDefaults} from '../src/domain/rocks.js';
import {recipeInstance,disposeObject} from '../src/render/asset-cache.js';
import {createExposureTest,snowOccluders} from '../src/render/physical-snow.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a*(1-t)+b*t;
const yaw=a=>[0,Math.sin(a/2),0,Math.cos(a/2)];
const root=new URL('../public/',import.meta.url);
const hash=(x,z,seed)=>{const n=Math.sin(x*127.1+z*311.7+seed*19.19)*43758.5453;return n-Math.floor(n);};
function noise(x,z,seed) {const a=Math.floor(x),b=Math.floor(z),u=smooth(0,1,x-a),v=smooth(0,1,z-b);return mix(mix(hash(a,b,seed),hash(a+1,b,seed),u),mix(hash(a,b+1,seed),hash(a+1,b+1,seed),u),v)*2-1;}
function relief(x,z) {const wx=x+noise(x*.1,z*.1,37)*2.6,wz=z+noise(x*.1,z*.1,53)*2.6;return noise(wx*.065,wz*.065,73)*1.5+noise(wx*.19,wz*.19,97)*.65+noise(wx*.53,wz*.53,113)*.24+noise(wx*1.1,wz*1.1,139)*.09;}
const pathNodes=[[31,3.4],[21,3.3],[12,2.7],[3,4.4],[-8,4.2],[-19,6.6],[-31,8.4]];
export function mountainTrailX(z) {for(let i=0;i<pathNodes.length-1;i++){const [a,x]=pathNodes[i],[b,y]=pathNodes[i+1];if(z>=b)return mix(x,y,smooth(a,b,z));}return pathNodes.at(-1)[1];}
export const MOUNTAIN_POOL=[[-8.3,28.8],[-8.7,24],[-7.3,18.8],[-5.4,14.8],[-3.5,14.1],[-2.1,17.9],[-2.6,22.5],[-1.5,28.6],[-4.8,30]];
function distanceToPolygon(x,z,polygon) {if(pointInPolygon([x,z],polygon))return 0;return Math.min(...polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}));}

/** Entirely new composition, saved as ordinary editable scene entities. */
export function createMountainExample(catalog) {
  let sequence=1;const uuid=()=>`c1000000-0000-4000-8000-${String(sequence++).padStart(12,'0')}`;
  const assets=new Map(catalog.map(a=>[a.id,a])),scene=applyEnvironment(createScene('Subida da montanha · caverna e ruínas'),'fog');
  Object.assign(scene,{id:uuid(),createdAt:'2026-10-05T15:00:00.000Z',updatedAt:'2026-10-05T15:00:00.000Z'});
  scene.layout.grid.visible=false;scene.layout.grid.snap=false;
  scene.look.background='#d0dbdf';scene.look.fill={skyColor:'#d4e0e6',groundColor:'#37454b',intensity:1.05};
  scene.look.sky.enabled=false;scene.look.daylight.exposure=.92;
  Object.assign(scene.look.fog,{mode:'exp2',color:'#d0dbdf',density:.033});
  scene.look.volumetricFog.enabled=false;scene.look.bloom.enabled=false;
  scene.look.weather={type:'snow',count:2700,center:[0,-1,0],size:[46,28,58],color:'#e5f2f7',opacity:.8,particleSize:.065,speed:3.2,wind:[-3.5,1.4],seed:417};
  const key=createLight({id:uuid(),name:'Luz fria difusa entre as nuvens',role:'key',type:'directional',position:[-5,25,8],rotation:[-.35,-.12,0,Math.sqrt(1-.35**2-.12**2)],color:'#dce9f0',intensity:1.9,distance:0,shadowEnabled:true});
  scene.look.lights={[key.id]:key};
  const group=name=>{const id=uuid();scene.layout.groups[id]={id,name,parentId:null,locked:false,audience:'all',visible:true};return id;};
  const groundGroup=group('01 · Encosta, trilha e lago'),cliffGroup=group('02 · Rocha orgânica e caverna'),ruinGroup=group('03 · Ruínas na subida'),woodGroup=group('04 · Ponte e lanternas'),plantGroup=group('05 · Vegetação nevada'),detailGroup=group('06 · Expedição e destroços');
  const add=e=>{scene.layout.entities[e.id]=e;return e;};
  const snow=(thickness=.08,amount=.85,seed=73)=>({...coverageDefaults(),snowStyle:'organic',snowDrift:.75,snowDriftScale:2.7,snowWindDirection:158,amount,physicalThickness:thickness,exposedOnly:true,slopeAngle:58,slopeFade:22,variation:.23,variationSize:2.2,color:'#e1ebef',relief:.0015,seed});
  const rockMaterial={...surfacePatch('rock'),rockPattern:'organic',textureSize:2.4,textureSeed:43,textureColorMode:'replace',textureColor:'#424f51',textureBrightness:.75,textureContrast:1.1,relief:.018,rockCracks:.65,coverage:snow(.14,.78)};
  const cavePosition=[-9.5,1.15,14],caveAngle=.78;
  const width=48,length=62,segments=64,heights=[],weights=[],snowMask=[];
  const climb=z=>{const d=Math.max(0,23-z);return .22+.17*d+1.45*smooth(4,19,d)+.7*smooth(26,45,d);};
  for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++) {
    const x=(col/segments-.5)*width,z=(row/segments-.5)*length,trail=mountainTrailX(z),nearPath=1-smooth(.7,2.9,Math.abs(x-trail));
    let h=climb(z)+5.2*smooth(6.4,21,x)*(1-.4*smooth(12,30,z))+relief(x,z)*(1-.88*nearPath);
    // Flatten both landings in one band before opening the ravine, retaining sculpted banks.
    const landing=(1-smooth(1.15,2.65,Math.abs(z+4)))*(1-smooth(7.3,9.6,Math.abs(x+2.5)));
    h=mix(h,climb(-4),landing);
    const gorge=(1-smooth(2.1,3.65,Math.abs(x+2.5)))*(1-smooth(1.4,3.6,Math.abs(z+4)));
    h-=gorge*(4.8+.6*noise(x*.3,z*.3,181));
    // Irregular pool plus a sub-cell margin: the rendered triangles stay below its surface.
    const pool=1-smooth(.1,1.45,distanceToPolygon(x,z,MOUNTAIN_POOL));
    // Explicitly keep the cave recess free. The heightmap cannot cut a roof or overhang.
    const dx=x-cavePosition[0],dz=z-cavePosition[2],lx=dx*Math.cos(caveAngle)-dz*Math.sin(caveAngle),lz=dx*Math.sin(caveAngle)+dz*Math.cos(caveAngle);
    const cave=(1-smooth(2.5,4.1,Math.abs(lx)))*(1-smooth(3.5,5,Math.abs(lz)));
    h=mix(h,cavePosition[1]-.11,cave);h=mix(h,-1.2+noise(x*.6,z*.6,197)*.12,pool);heights.push(Number(h.toFixed(4)));
    weights.push(Number((Math.exp(-(((x-trail)/.82)**2))*(.12+.28*(noise(x*.4,z*.4,211)+1)*.5)).toFixed(4)));
    snowMask.push(Math.abs(lx)<2.1&&Math.abs(lz)<3.2?0:1);
  }
  const terrain=add(createEntity('terrain',{id:uuid(),name:'Encosta orgânica · trilha, taludes e lago esculpidos',groupId:groundGroup,width,length,segments,heights,snowMask,
    material:{...rockMaterial,relief:.004,textureColor:'#59615b',coverage:{...snow(.2,.97),slopeAngle:43,variation:.17,variationSize:3.4}},paintLayers:[{id:uuid(),name:'Terra e desgaste da trilha',...layerSurfacePatch('mud'),textureColorMode:'replace',textureColor:'#5e574b',opacity:.64,visible:true,weights}]}));
  const ground=(x,z)=>terrainHeightAt(terrain,[x,0,z]);
  const prop=(id,x,z,scale=[1,1,1],angle=0,options={})=>{const asset=assets.get(`builtin-${id}`);if(!asset)throw new Error(`Asset ausente: ${id}`);const shape=rockDefaults(asset.id);return add(createEntity('prop',{id:uuid(),name:asset.name,assetRef:{id:asset.id,revision:asset.revision},position:[x,ground(x,z),z],rotation:yaw(angle),scale,footprint:asset.footprint,...(asset.supportHeight?{supportHeight:asset.supportHeight}:{}),...(shape?{rockShape:shape,material:rockMaterial}:{}),...options}));};
  add(createEntity('water',{id:uuid(),name:'Lago glacial · margem irregular',groupId:groundGroup,position:[0,-.28,0],vertices:MOUNTAIN_POOL,depth:.8,material:{color:'#27565d',roughness:.32,metalness:.04},water:{opacity:.93,waveHeight:.018,waveScale:3.5,speed:.35,direction:160}}));
  add(createEntity('water',{id:uuid(),name:'Placa de gelo quebrada junto à margem',groupId:groundGroup,position:[-3.6,-.245,24],vertices:[[-.4,-3],[.7,-2.1],[.4,-.4],[.8,1.4],[-.7,2.1],[-1.2,.4]],depth:.13,material:{...surfacePatch('ice'),color:'#b2cbd3',coverage:snow(.025,.6)},water:{state:'ice',waveHeight:0,opacity:.86}}));
  const cliff=(x,z,scale,angle,seed,burial=1.5)=>prop('organic-cliff',x,z,scale,angle,{groupId:cliffGroup,position:[x,ground(x,z)-burial,z],rockShape:{...rockDefaults('builtin-organic-cliff'),seed,detail:6,irregularity:.58,erosion:.6,overhang:.32},material:{...rockMaterial,coverage:snow(.15,.78,seed)}});
  const foregroundCliff=cliff(-12.8,23,[1.4,2.15,2.5],1.52,1709,2.1);
  cliff(-13.5,6,[1.3,1.75,2.1],1.2,1877,2.2);
  cliff(-12.7,-13,[1.55,1.4,2.4],1.7,1999,2.3);
  const cave=prop('mountain-cave-mouth',cavePosition[0],cavePosition[2],[1,1,1],caveAngle,{name:'Caverna lateral · passagem e abrigo reais',groupId:cliffGroup,position:cavePosition,material:{...rockMaterial,textureSlot:'stone',textureColor:'#354449',coverage:snow(.065,.65)}});
  const caveMaterial={...terrain.material};delete caveMaterial.coverage;
  add(createEntity('floor',{id:uuid(),name:'Apoio no interior da caverna',groupId:groundGroup,position:[cavePosition[0],cavePosition[1]-.075,cavePosition[2]],rotation:yaw(caveAngle),width:2.9,length:5.2,thickness:.035,material:caveMaterial}));
  const caveMatrix=new THREE.Matrix4().compose(new THREE.Vector3(...cavePosition),new THREE.Quaternion(...cave.transform.rotation),new THREE.Vector3(1,1,1));
  for(const [x,y,z,size,seed] of [[-2.6,.05,2.25,[1.9,2.1,2.4],2213],[2.6,.05,2.1,[1.8,2.8,2.2],2269],[-1.2,4,2,[2.9,1.4,2.4],2311],[1.15,4.1,2.05,[2.4,1.6,2.5],2377]]) {const p=new THREE.Vector3(x,y,z).applyMatrix4(caveMatrix);prop('organic-rock',p.x,p.z,size.map((v,i)=>v/assets.get('builtin-organic-rock').bounds[i]),seed*.13,{groupId:cliffGroup,position:p.toArray(),rockShape:{...rockDefaults('builtin-organic-rock'),seed,detail:4,irregularity:.95,erosion:.85},material:{...rockMaterial,coverage:snow(.15,.8,seed)}});}
  const masonry={...surfacePatch('rock'),rockPattern:'fractured',textureSize:1.1,textureColorMode:'replace',textureColor:'#5c6460',textureBrightness:.82,relief:.055,coverage:snow(.04,.82)};
  const leftTower=prop('mountain-ruin-high-wall',-7.4,-11,[.88,1.5,.95],-.1,{name:'Torre antiga · ruína no lado esquerdo',groupId:ruinGroup,material:masonry});
  const rightTower=prop('mountain-ruin-high-wall',10.5,-23,[1.05,1.7,1.05],.12,{groupId:ruinGroup,material:{...masonry,coverage:snow(0,.85)}});
  prop('mountain-ruin-corner',11.8,-9,[1.25,1.35,1.25],Math.PI,{groupId:ruinGroup,material:masonry});
  prop('mountain-ruin-tower',6.7,-25,[1.1,1.1,1.2],.1,{groupId:ruinGroup,material:{...masonry,coverage:snow(0)}});
  for(const [x,z,scale] of [[10.9,-14,1.3],[12.4,-19,1.4],[14.1,-26,1.4]])prop('ruin-masonry-wall',x,z,[scale,1.15,1.2],1.6,{groupId:ruinGroup,material:masonry});
  const agedWood={...surfacePatch('wood'),textureColorMode:'replace',textureColor:'#514b3c',woodPattern:'grain',woodGrain:.9,textureBrightness:.68,relief:.02,coverage:snow(.035,.7)};
  const bridgeY=(ground(-7.4,-4)+ground(2.4,-4))/2+.015;
  prop('mountain-timber-bridge',-2.5,-4,[1.22,1,2.55],Math.PI/2,{name:'Ponte elevada à frente da trilha',groupId:woodGroup,material:agedWood,position:[-2.5,bridgeY-.565,-4]});
  const bridge=add(createEntity('floor',{id:uuid(),name:'Tabuleiro de apoio da ponte elevada',groupId:woodGroup,position:[-2.5,bridgeY,-4],width:9.8,length:2.44,thickness:.03,material:{...agedWood,coverage:snow(0,.74)}}));
  const pierHeight=assets.get('builtin-ruin-masonry-wall').bounds[1]*2.35;
  for(const x of [-6,.8])prop('ruin-masonry-wall',x,-4,[.62,2.35,1.4],Math.PI/2,{name:'Pilar abaixo das vigas da ponte',groupId:ruinGroup,position:[x,bridgeY-pierHeight-.29,-4],material:masonry});
  prop('mountain-timber-platform',10.8,-15,[1.3,1,1.1],.13,{groupId:woodGroup,material:agedWood});
  for(const [x,z] of [[1.2,8],[2.3,-1],[3.4,-12]])prop('mountain-rope-post',x,z,[1,1.08,1],.12,{groupId:woodGroup,material:agedWood});
  // Mount brackets on the actual recipe/silhouette instead of guessing the face distance.
  const instance=e=>{const asset=assets.get(e.assetRef.id),r=JSON.parse(readFileSync(fileURLToPath(new URL(asset.url.slice(1),root)),'utf8')),wrapper=new THREE.Group();wrapper.add(recipeInstance(r,e.rockShape,asset.bounds));wrapper.position.fromArray(e.transform.position);wrapper.quaternion.fromArray(e.transform.rotation);wrapper.scale.fromArray(e.transform.scale);wrapper.updateMatrixWorld(true);return wrapper;};
  for(const [wall,localX,localY] of [[foregroundCliff,2.8,2.25],[leftTower,-1.2,2.8],[rightTower,-1.3,2.2]]) {
    const wrapper=instance(wall),normal=new THREE.Vector3(0,0,1).applyQuaternion(wrapper.quaternion),origin=new THREE.Vector3(localX,localY,20).applyMatrix4(wrapper.matrixWorld);let hit;
    try{hit=new THREE.Raycaster(origin,normal.clone().negate()).intersectObject(wrapper,true)[0];if(!hit)throw new Error(`Sem superfície para lanterna: ${wall.name}`);}finally{disposeObject(wrapper);}
    const scale=1.4,angle=Math.atan2(normal.x,normal.z)-Math.PI/2,position=hit.point.clone().addScaledVector(normal,.5025*scale+.02);position.y-=.4975*scale;
    const lantern=prop('mountain-round-lantern',position.x,position.z,[scale,scale,scale],angle,{groupId:woodGroup,position:position.toArray()});
    const socket=new THREE.Vector3(.3475,.1925,0).multiplyScalar(scale).applyQuaternion(new THREE.Quaternion(...lantern.transform.rotation)).add(position),light=createLight({id:uuid(),name:'Lanterna arredondada · luz âmbar',type:'point',groupId:woodGroup,position:socket.toArray(),temperature:2450,intensity:12,distance:6.5,shadowEnabled:false});scene.look.lights[light.id]=light;
  }
  for(const [x,z,s,seed] of [[10.4,14.5,1.15,2503],[15,4,1.25,2591],[-16,23,1.8,2677],[14,-17,1.15,2719]])prop('dense-alpine-fir',x,z,[s,s,s],seed*.13,{groupId:plantGroup,vegetationSeed:seed,material:{textureSlot:'green',coverage:{...snow(.085,.82,seed),slopeAngle:67,slopeFade:25}}});
  prop('dense-mountain-pine',17,-28,[1.2,1.2,1.2],1.5,{groupId:plantGroup,vegetationSeed:2801,material:{textureSlot:'green',coverage:snow(.065,.8)}});
  for(const [x,z,s,seed] of [[-18,3,1.4,2917],[-18,-23,1.8,3001],[18,-9,1.5,3067],[20,24,1.7,3119]])prop('alpine-fir',x,z,[s,s,s],seed*.09,{groupId:plantGroup,vegetationSeed:seed,material:{textureSlot:'green',coverage:snow(0,.88)}});
  const aligned=(x,z,angle)=>{const d=.6,dx=(ground(x+d,z)-ground(x-d,z))/(2*d),dz=(ground(x,z+d)-ground(x,z-d))/(2*d),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-dx,1,-dz).normalize()),tilt=q.angleTo(new THREE.Quaternion());if(tilt>.24)q.slerp(new THREE.Quaternion(),1-.24/tilt);return q.multiply(new THREE.Quaternion(...yaw(angle))).toArray();};
  for(const [id,x,z,scale,angle] of [['old-open-crate',6.5,20.2,[1.5,1.4,1.3],-.3],['wooden-expedition-barrel',7.8,18.6,[1,1,1],.5],['old-closed-crate',5.7,7.1,[1,1,1],.8],['broken-timber-pile',6.8,16.5,[1.3,1,1.3],.3],['broken-timber-pile',5.4,5.4,[1.2,1,1.2],-.65]])prop(id,x,z,scale,angle,{groupId:detailGroup,position:[x,ground(x,z)-.16,z],rotation:aligned(x,z,angle),material:{textureSlot:'wood',coverage:snow(.035,.62)}});
  for(const [id,x,z,scale,angle,seed] of [['twisted-mountain-roots',3,13,[1.4,1.6,1.4],-.4,3203],['forked-dead-branch',5.4,22.5,[1.3,1,1.3],-.8,3251],['forked-dead-branch',8.6,7.1,[1.2,1.1,1.2],1.3,3301]])prop(id,x,z,scale,angle,{groupId:detailGroup,vegetationSeed:seed,material:{coverage:snow(.025,.5)}});
  prop('mountain-cart-wreck',8.3,10.7,[1.25,1.15,1.25],-.38,{groupId:detailGroup,material:{textureSlot:'wood',coverage:snow(.04,.72)}});
  let state=417;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const seated=(x,z,s)=>Math.min(ground(x,z),...[-1,1].flatMap(a=>[-1,1].map(b=>ground(x+a*s*1.2,z+b*s))))-.4*s;
  for(const [x,z,s,seed] of [[9.4,13.5,1.55,3433],[4.1,12.5,1.1,3511],[9.2,5.7,1.2,3571],[-5.7,26,1.2,3613],[-9,23,1.3,3691],[9.8,-3,1.5,3761]])prop('organic-rock',x,z,[s,s*.62,s*1.25],seed*.11,{groupId:detailGroup,position:[x,seated(x,z,s),z],rockShape:{...rockDefaults('builtin-organic-rock'),seed,detail:4,irregularity:.9,erosion:.8},material:{...rockMaterial,coverage:snow(.13,.87,seed)}});
  for(let i=0;i<17;i++){const z=-27+random()*53,x=i%4===0?-13-random()*4:6.2+random()*10,s=.2+random()*.48,seed=Math.floor(random()*60000);prop('organic-rock',x,z,[s*(1+random()),s*.6,s],random()*6.28,{groupId:detailGroup,position:[x,seated(x,z,s),z],rockShape:{...rockDefaults('builtin-organic-rock'),detail:2,seed},material:{...rockMaterial,coverage:snow(0,.78,seed)}});}
  for(let i=0;i<30;i++){const z=-21+random()*47,x=5.5+random()*10,s=.38+random()*.56;prop(i%3===0?'winter-dry-shrub':'dry-grass',x,z,[s,.5+random()*.45,s],random()*6.28,{groupId:plantGroup,vegetationSeed:Math.floor(random()*60000)});}
  // Save real shelter in the terrain mask. Only roofs/bridge are needed here, not every needle.
  const shelters=[instance(cave),instance(Object.values(scene.layout.entities).find(e=>e.name==='Ponte elevada à frente da trilha'))];
  try{const exposed=createExposureTest(snowOccluders(shelters));terrain.snowMask=heights.map((h,i)=>snowMask[i]*exposed([(i%(segments+1)/segments-.5)*width,h+.005,(Math.floor(i/(segments+1))/segments-.5)*length]));}finally{shelters.forEach(disposeObject);}
  // Keep the explicit cave/bridge supports independent; terrain snow remains derived/editable.
  for(const [name,position,target,fov,projection,height] of [
    ['01 · Subida, caverna e ponte',[5.6,3.6,28],[-3.5,6.6,-5],57,'perspective',28],
    ['02 · Entrada lateral da caverna',[-4.9,3.3,18.6],[-9.5,2.8,14],57,'perspective',28],
    ['03 · Ponte e continuação da subida',[3.8,9.2,1],[-.7,11,-16],58,'perspective',28],
    ['04 · Visão geral para construir',[38,43,44],[0,6,-1],52,'perspective',62],
    ['05 · Mapa superior',[0,75,0],[0,6,-.001],55,'orthographic',66]
  ]){const id=uuid();scene.cameraPresets[id]={id,name,position,target,fov,projection,orthographicHeight:height};}
  return validateDocument(scene);
}
