import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createScene, createEntity, createLight, validateDocument } from '../src/domain/documents.js';
import { applyEnvironment } from '../src/domain/environments.js';
import { surfacePatch, coverageDefaults, layerSurfacePatch } from '../src/domain/materials.js';
import { terrainHeightAt } from '../src/domain/geometry.js';
import { rockDefaults } from '../src/domain/rocks.js';
import { recipeInstance, disposeObject } from '../src/render/asset-cache.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixedDate = '2026-10-05T15:00:00.000Z';
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = (a,b,x) => { const t=clamp((x-a)/(b-a)); return t*t*(3-2*t); };
const yaw = angle => [0, Math.sin(angle/2), 0, Math.cos(angle/2)];
const riverX = z => -4.4 + Math.sin(z*.095)*.5;
export const mountainTrailX = z => 3.2 + .8*Math.sin(z*.12);

/** Saved ordinary entities, not a live generator: every piece can be edited in the UI. */
export function createMountainExample(catalog) {
  let sequence = 1;
  const uuid = () => `c1000000-0000-4000-8000-${String(sequence++).padStart(12,'0')}`;
  const assets = new Map(catalog.map(asset=>[asset.id,asset]));
  const scene = applyEnvironment(createScene('Subida da montanha · caverna e ruínas'), 'fog');
  Object.assign(scene, { id: uuid(), createdAt: fixedDate, updatedAt: fixedDate });
  scene.layout.grid.visible = false; scene.layout.grid.snap = false;
  scene.look.background = '#bdc7c8';
  scene.look.fill = { skyColor:'#c8d5dc', groundColor:'#565c5b', intensity:.85 };
  scene.look.sky.enabled = false;
  scene.look.daylight.exposure = 1.05;
  Object.assign(scene.look.fog, { mode:'exp2', color:'#bdc7c8', density:.027 });
  scene.look.volumetricFog.enabled = false;
  scene.look.bloom.enabled = false;
  scene.look.weather.type = 'none';
  const key = createLight({ id:uuid(), name:'Luz fria entre as nuvens', role:'key', type:'directional',
    position:[8,22,-16], rotation:[-.3,-.1,0,.9486832980505138],
    color:'#e0e9ef', intensity:1.65, distance:0, shadowEnabled:true });
  scene.look.lights = { [key.id]: key };
  const group = name => { const id=uuid();scene.layout.groups[id]={id,name,parentId:null,locked:false,audience:'all',visible:true};return id; };
  const groundGroup=group('01 · Subida, lago e gelo'),cliffGroup=group('02 · Paredões e encostas'),ruinGroup=group('03 · Ruínas antigas'),woodGroup=group('04 · Madeira e lanternas'),plantGroup=group('05 · Vegetação'),detailGroup=group('06 · Rochas e destroços');
  const add = entity => {scene.layout.entities[entity.id]=entity;return entity;};
  const snow = (thickness=.05, amount=.95) => ({...coverageDefaults(),amount,physicalThickness:thickness,
    exposedOnly:false,slopeAngle:55,slopeFade:12,variation:.22,variationSize:1.6,color:'#e6ebed',seed:73});
  const rockMaterial = {...surfacePatch('rock'),textureColorMode:'replace',textureColor:'#65706e',
    rockPattern:'fractured',textureSize:2.2,textureBrightness:.83,textureContrast:1.2,rockCracks:.8,relief:.1,coverage:snow(0)};
  const segments=64,width=40,length=58,heights=[],weights=[];
  for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++) {
    const x=(col/segments-.5)*width,z=(row/segments-.5)*length;
    // The trail climbs ten metres; the right hillside rises above it, rather than forming a second wall.
    const climb=.18+.22*Math.max(0,18-z)+1.3*smooth(2,24,18-z);
    const hillside=8*smooth(6.5,17,x)*(1-.35*smooth(15,28,z));
    let height=climb+hillside+.06*Math.sin(x*1.8+z*.35)*Math.cos(z*.65);
    // Small low pool in the foreground, not a river through the full length of a valley.
    const pool=(1-smooth(1.7,3,Math.abs(x-riverX(z))))*smooth(8.5,12,z);
    height=height*(1-pool)-1.15*pool;
    // A side alcove sits on a lower flat ledge: terrain must not fill its hollow volume.
    const cave=(1-smooth(3.5,4.8,Math.abs(x+8.6)))*(1-smooth(3.5,4.8,Math.abs(z-7.8)));
    height=height*(1-cave)+.22*cave;
    // Ravine below the elevated bridge. The continuous ascent stays open on its right.
    const ravine=(1-smooth(2.6,3.9,Math.abs(x+2.5)))*(1-smooth(1.8,3.7,Math.abs(z+3)));
    height-=ravine*5.5;
    heights.push(Number(height.toFixed(4)));
    const trail=mountainTrailX(z);
    weights.push(Number((Math.exp(-(((x-trail)/1.1)**2))*(.18+.15*Math.sin(z*.4)**2)).toFixed(4)));
  }
  const terrain=add(createEntity('terrain',{id:uuid(),name:'Encosta nevada · trilha e leito esculpidos',groupId:groundGroup,width,length,segments,heights,
    material:{...rockMaterial,textureColor:'#71756e',coverage:{...snow(.12,.98),slopeAngle:42,variation:.12,variationSize:3}},
    paintLayers:[{id:uuid(),name:'Terra exposta no caminho',...layerSurfacePatch('mud'),textureColorMode:'replace',textureColor:'#635d50',opacity:.65,visible:true,weights}]}));
  const ground = (x,z) => terrainHeightAt(terrain,[x,0,z]);
  const prop = (id,x,z,scale=[1,1,1],angle=0,options={}) => {
    const asset=assets.get(`builtin-${id}`);if(!asset)throw new Error(`Asset ausente: ${id}`);
    const shape=rockDefaults(asset.id);
    return add(createEntity('prop',{id:uuid(),name:asset.name,assetRef:{id:asset.id,revision:asset.revision},
      position:[x,ground(x,z),z],rotation:yaw(angle),scale,footprint:asset.footprint,
      ...(asset.supportHeight?{supportHeight:asset.supportHeight}:{}),
      ...(shape?{rockShape:{...shape,detail:4},material:rockMaterial}:{}),...options}));
  };
  const left=[],right=[];
  for(let z=12;z<=27;z+=3) {left.push([riverX(z)-1.45,z]);right.push([riverX(z)+1.45,z]);}
  add(createEntity('water',{id:uuid(),name:'Lago glacial na base da subida',groupId:groundGroup,position:[0,-.3,0],vertices:[...left,...right.reverse()],depth:.7,
    material:{color:'#356268',roughness:.28,metalness:.05},water:{opacity:.88,waveHeight:.025,waveScale:2.5,speed:.35,direction:180}}));
  add(createEntity('water',{id:uuid(),name:'Gelo junto à margem do lago',groupId:groundGroup,position:[-3.4,-.27,19],vertices:[[-.8,-2],[.15,-1.8],[.55,.3],[.15,1.7],[-.7,1.3]],depth:.13,
    material:{...surfacePatch('ice'),color:'#b6ccd0',coverage:snow(.025,.45)},water:{state:'ice',waveHeight:0,opacity:.87}}));
  const caveAngle=.6;
  const backingDistance=assets.get('builtin-mountain-cave-mouth').bounds[2]/2+assets.get('builtin-mountain-cliff-face').bounds[2]*1.5/2-.15;
  const backingX=-8.6-Math.sin(caveAngle)*backingDistance,backingZ=7.8-Math.cos(caveAngle)*backingDistance;
  const walls=[[-12.2,19,[1.25,1.3,1.65],1.55,407],[backingX,backingZ,[1.1,1.5,1.5],caveAngle,513],[-12,-15,[1.4,1.8,1.8],1.45,719]];
  const cliffFaces=walls.map(([x,z,scale,angle,seed])=>prop('mountain-cliff-face',x,z,scale,angle,{groupId:cliffGroup,
    ...(seed===513?{position:[x,.22,z]}:{}),
    material:{...rockMaterial,coverage:snow(z>15?.09:0)},
    rockShape:{...rockDefaults('builtin-mountain-cliff-face'),seed,detail:6,terraces:3+(seed%3),overhang:.18+(seed%4)*.06,erosion:.9,irregularity:.86}}));
  prop('mountain-cave-mouth',-8.6,7.8,[1,1,1],caveAngle,{name:'Caverna lateral · entrada aberta',groupId:cliffGroup,
    position:[-8.6,.34,7.8],material:{...rockMaterial,textureSlot:'stone',rockPattern:'strata',textureColor:'#444c4c',textureBrightness:.7,coverage:snow(0,.9)}});
  prop('mountain-cliff-overhang',8.5,8,[1.1,.35,1.05],-.5,{groupId:cliffGroup,material:{...rockMaterial,coverage:snow(.08)},rockShape:{...rockDefaults('builtin-mountain-cliff-overhang'),terraces:3,overhang:.4,erosion:.9,detail:6}});
  for(const [x,z,scale,seed] of [[-7.7,-5,[1.1,.95,1.1],1703],[-10,-26,[1.5,1.5,1.4],1811],[14,-24,[1.2,1.4,1.3],1993]])
    prop('mountain-rock-spire',x,z,scale,.12,{groupId:cliffGroup,rockShape:{...rockDefaults('builtin-mountain-rock-spire'),seed,detail:4}});
  const masonry={...surfacePatch('rock'),textureColorMode:'replace',textureColor:'#75796f',textureSize:1.3,textureBrightness:.85,relief:.08,coverage:snow(0,.96)};
  // Towers are staggered along the ascent, with a high bridge visible ahead.
  const leftTower=prop('mountain-ruin-high-wall',-7,-5.7,[1.05,1.3,1.05],-.08,{groupId:ruinGroup,material:masonry});
  const rightTower=prop('mountain-ruin-high-wall',9,-19,[1.15,1.65,1.15],.16,{groupId:ruinGroup,material:masonry});
  prop('mountain-ruin-corner',8,-11,[1.6,1.6,1.3],Math.PI,{groupId:ruinGroup,material:masonry});
  prop('ruin-stone-arch',3.7,-23,[1.1,1.1,1.15],0,{groupId:ruinGroup,material:masonry});
  for(let i=0;i<3;i++)prop('ruin-masonry-wall',8.4,-9-i*4,[1.3,1.25,1.2],Math.PI/2,{groupId:ruinGroup,material:masonry});
  const agedWood={...surfacePatch('wood'),textureColorMode:'replace',textureColor:'#514837',woodPattern:'grain',woodGrain:.9,textureBrightness:.6,coverage:snow(.03,.8)};
  const bridgeY=(ground(-7,-3)+ground(2,-3))/2;
  prop('mountain-timber-bridge',-2.5,-3,[1.25,1,2.56],Math.PI/2,{name:'Ponte elevada à frente da subida',groupId:woodGroup,material:agedWood,position:[-2.5,bridgeY-.58,-3]});
  add(createEntity('floor',{id:uuid(),name:'Tabuleiro de apoio da ponte elevada',groupId:woodGroup,position:[-2.5,bridgeY,-3],width:9.9,length:2.5,thickness:.04,
    material:{...agedWood,coverage:snow(.025,.8)}}));
  // Stone piers meet the beams, while the ravine remains visible below the deck.
  const pierScale=2.2,pierHeight=assets.get('builtin-ruin-masonry-wall').bounds[1]*pierScale;
  for(const x of [-5.5,.5])prop('ruin-masonry-wall',x,-3,[.8,pierScale,1.6],Math.PI/2,{groupId:ruinGroup,material:masonry,position:[x,bridgeY-pierHeight-.4,-3]});
  prop('mountain-timber-platform',8,-15,[1.7,1.3,1.25],.15,{groupId:woodGroup,material:agedWood});
  for(const z of [5,-2,-9])prop('mountain-rope-post',mountainTrailX(z)-1.8,z,[1.1,1.2,1.1],0,{groupId:woodGroup,material:agedWood});
  // Offline authoring uses the same recipe geometry as the renderer to mount brackets on actual faces.
  // Nothing is regenerated or attached dynamically when a user opens the saved scene.
  for(const [wall,localX,localY] of [[cliffFaces[0],1.1,2.7], [leftTower,-1.35,2.8], [rightTower,-1.35,2.5]]) {
    const asset=assets.get(wall.assetRef.id),recipe=JSON.parse(readFileSync(path.join(root,'public',asset.url),'utf8'));
    const model=recipeInstance(recipe,wall.rockShape,asset.bounds),wrapper=new THREE.Group();wrapper.add(model);
    wrapper.position.fromArray(wall.transform.position);wrapper.quaternion.fromArray(wall.transform.rotation);wrapper.scale.fromArray(wall.transform.scale);wrapper.updateMatrixWorld(true);
    const normal=new THREE.Vector3(0,0,1).applyQuaternion(wrapper.quaternion),origin=new THREE.Vector3(localX,localY,20).applyMatrix4(wrapper.matrixWorld);
    let hit;
    try {hit=new THREE.Raycaster(origin,normal.clone().negate()).intersectObject(wrapper,true)[0];if(!hit)throw new Error(`Sem apoio para lanterna: ${wall.name}`);}
    finally {disposeObject(wrapper);}
    const scale=1.5,angle=Math.atan2(normal.x,normal.z)-Math.PI/2;
    const position=hit.point.clone().addScaledVector(normal,.5025*scale+.02);position.y-=.4975*scale;
    const lantern=prop('mountain-round-lantern',position.x,position.z,[scale,scale,scale],angle,{groupId:woodGroup,position:position.toArray()});
    const socket=new THREE.Vector3(.3475,.1925,0).multiplyScalar(scale).applyQuaternion(new THREE.Quaternion(...lantern.transform.rotation)).add(position);
    const light=createLight({id:uuid(),name:'Lanterna arredondada · âmbar',type:'point',groupId:woodGroup,position:socket.toArray(),
      temperature:2500,intensity:14,distance:7,shadowEnabled:false});scene.look.lights[light.id]=light;
  }
  for(const [x,z,scale,seed] of [[9,16,1.55,2371],[12,5,1.4,2437],[10,-7,1.7,2671],[-13,22,1.85,2731],[-15,-5,1.5,2819],[12,-20,1.7,2957],[-10,-23,1.8,3037]])
    prop('alpine-fir',x,z,[scale,scale,scale],seed*.03,{groupId:plantGroup,vegetationSeed:seed,material:{textureSlot:'green',coverage:{...snow(0,.97),mode:'all',variation:.16}}});
  prop('bare-mountain-tree',7,-2,[1.3,1.4,1.3],.4,{groupId:plantGroup,material:{coverage:snow(.035,.65)}});
  prop('mountain-uprooted-stump',-.2,8,[1.4,1.1,1.3],-.6,{groupId:detailGroup,material:agedWood});
  prop('mountain-cart-wreck',5.7,14,[1.4,1.3,1.4],-.3,{groupId:detailGroup,material:agedWood});
  prop('mountain-cart-wreck',6.5,-1,[1.1,.9,1.1],.65,{groupId:detailGroup,material:agedWood});
  let seed=731;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<20;i++) {
    const z=-24+random()*48,x=i%3===0?-11-random()*2:5.7+random()*5.5,s=.18+random()*.45;
    prop(i%4===0?'granite-boulder':'mountain-boulder',x,z,[s*(1+random()),s*.65,s],random()*6.28,{groupId:detailGroup,rockShape:{...rockDefaults(i%4===0?'builtin-granite-boulder':'builtin-mountain-boulder'),detail:3,seed:Math.floor(random()*60000)}});
  }
  for(let i=0;i<25;i++) {
    const z=-22+random()*46,x=5.3+random()*5.8,s=.4+random()*.7;
    prop('dry-grass',x,z,[s,.5+random()*.5,s],random()*6.28,{groupId:plantGroup,vegetationSeed:Math.floor(random()*60000)});
  }
  for(const [name,position,target,fov,projection,height] of [
    ['01 · Subida, caverna e ponte',[3.5,4,28],[-3.5,7.5,-7],59,'perspective',28],
    ['02 · Entrada lateral da caverna',[-3,2.6,15],[-8.2,2.3,7],59,'perspective',28],
    ['03 · Ponte e continuação da subida',[3.5,7,1],[-1,10,-15],60,'perspective',28],
    ['04 · Visão geral para construir',[32,38,38],[0,5,-2],55,'perspective',50],
    ['05 · Mapa superior',[0,65,0],[0,5,-.001],55,'orthographic',62],
  ]) {const id=uuid();scene.cameraPresets[id]={id,name,position,target,fov,projection,orthographicHeight:height};}
  return validateDocument(scene);
}

export function createIcewindBridgeExample(catalog) {
  let sequence = 2000;
  const uuid = () => `c2000000-0000-4000-8000-${String(sequence++).padStart(12,'0')}`;
  const assets = new Map(catalog.map(asset=>[asset.id,asset]));
  const scene = applyEnvironment(createScene('Passagem de Inverno · Ponte e Névoa'), 'fog');
  Object.assign(scene, { id: uuid(), createdAt: fixedDate, updatedAt: fixedDate });
  scene.layout.grid.visible = false; scene.layout.grid.snap = false;
  
  scene.look.background = '#d0d8da';
  scene.look.fill = { skyColor:'#e4edf0', groundColor:'#4f595a', intensity: 1.15 };
  scene.look.sky.enabled = false;
  scene.look.daylight.exposure = 1.2;
  Object.assign(scene.look.fog, { mode:'exp2', color:'#d0d8da', density:.055 });
  scene.look.volumetricFog.enabled = true;
  scene.look.bloom.enabled = true;
  scene.look.weather = { type: 'snow', count: 2500, center: [0, 15, 0], size: [60, 40, 60], color: '#ffffff', opacity: 0.6, particleSize: 0.08, speed: 6.0, wind: [15, 5], seed: 42 };
  
  const key = createLight({ id:uuid(), name:'Luz difusa da névoa', role:'key', type:'directional',
    position:[10,25,-15], rotation:[-0.2, -0.4, 0, 0.8944271909999159],
    color:'#ffffff', intensity:0.8, distance:0, shadowEnabled:true });
  scene.look.lights = { [key.id]: key };

  const add = entity => {scene.layout.entities[entity.id]=entity;return entity;};
  const group = name => { const id=uuid();scene.layout.groups[id]={id,name,parentId:null,locked:false,audience:'all',visible:true};return id; };
  
  const groundGroup=group('01 · Relevo Nevado'), cliffGroup=group('02 · Paredões e Ruínas'), bridgeGroup=group('03 · Ponte Pênsil Quebrada'), detailGroup=group('04 · Assentamento e Vegetação'), lightGroup=group('05 · Iluminação');

  const snow = (thickness=.08, amount=.98) => ({...coverageDefaults(),amount,physicalThickness:thickness,
    exposedOnly:false,slopeAngle:65,slopeFade:20,variation:.9,variationSize:4.5,color:'#f0f5f7',seed:1337});
  const rockMaterial = {...surfacePatch('rock'),textureColorMode:'replace',textureColor:'#454c4d',
    rockPattern:'fractured',textureSize:3.0,textureBrightness:.8,textureContrast:1.3,rockCracks:.95,relief:.15,coverage:snow(0)};
    
  const segments=64,width=60,length=80,heights=[],weights=[];
  for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++) {
    const x=(col/segments-.5)*width, z=(row/segments-.5)*length;
    const pathZ = Math.max(-10, Math.min(30, z));
    const pathSlope = smooth(30, -10, pathZ) * 15; 
    const isPlateau = smooth(0, -20, z) * smooth(10, 20, x);
    const chasm = smooth(10, -5, x) * smooth(0, -30, z) * -20;
    const base = pathSlope + isPlateau * 5 + chasm;
    const noise = 0.5 * Math.sin(x*1.1+z*.6) + 1.2 * Math.cos(x*.3-z*.4) + 0.3 * Math.sin(x*3.2+z*2.5);
    heights.push(Number((base + noise).toFixed(4)));
    weights.push(0);
  }
  
  const terrain=add(createEntity('terrain',{id:uuid(),name:'Encosta rochosa',groupId:groundGroup,width,length,segments,heights,
    material:{...rockMaterial,textureColor:'#5c6362',coverage:{...snow(.25,1.0),slopeAngle:45,variation:1.0,variationSize:6}},
    paintLayers:[]}));
    
  const ground = (x,z) => terrainHeightAt(terrain,[x,0,z]);
  
  const prop = (id,x,z,scale=[1,1,1],angle=0,options={}) => {
    const asset=assets.get(`builtin-${id}`);if(!asset)throw new Error(`Asset ausente: ${id}`);
    const shape=rockDefaults(asset.id);
    return add(createEntity('prop',{id:uuid(),name:asset.name,assetRef:{id:asset.id,revision:asset.revision},
      position:[x,ground(x,z),z],rotation:yaw(angle),scale,footprint:asset.footprint,
      ...(asset.supportHeight?{supportHeight:asset.supportHeight}:{}),
      ...(shape?{rockShape:{...shape,detail:4},material:rockMaterial}:{}),...options}));
  };

  const masonry={...surfacePatch('rock'),textureColorMode:'replace',textureColor:'#5a625f',textureSize:1.5,textureBrightness:.75,relief:.15,coverage:snow(0,.98)};
  
  prop('mountain-ruin-high-wall', -15, -25, [2.5, 4.5, 2.5], Math.PI/3, {groupId:cliffGroup, material:masonry});
  prop('mountain-cliff-face', -18, -25, [2.0, 3.5, 2.0], -Math.PI/6, {groupId:cliffGroup, material:rockMaterial});
  
  prop('mountain-cliff-face', 22, -15, [1.8, 2.5, 1.8], Math.PI/4, {groupId:cliffGroup, material:rockMaterial});
  prop('mountain-cliff-face', 25, 5, [2.2, 3.0, 1.5], -Math.PI/4, {groupId:cliffGroup, material:rockMaterial});

  const agedWood={...surfacePatch('wood'),textureColorMode:'replace',textureColor:'#352e25',woodPattern:'grain',woodGrain:1,textureBrightness:.4,coverage:snow(.08,.95)};
  
  const lanternY = ground(12, 0) + 4.5;
  prop('mountain-rope-post', 12, 0, [1.5, 1.5, 2.5], -Math.PI/4, {name:'Viga do assentamento', groupId:detailGroup, material:agedWood, position:[12, lanternY + 1.5, 0]});
  prop('mountain-round-lantern', 10, -2, [2, 2, 2], 0, {groupId:lightGroup, position:[10, lanternY, -2]});
  const fireLight = createLight({id:uuid(),name:'Fogo da lanterna',type:'point',groupId:lightGroup,position:[10, lanternY+0.5, -2],
      temperature:2200,intensity:35,distance:20,shadowEnabled:false});
  scene.look.lights[fireLight.id]=fireLight;

  prop('mountain-timber-bridge', -2, -15, [1.8, 1.0, 3.0], Math.PI/2 - 0.5, {groupId:bridgeGroup, material:agedWood, position:[-6, ground(-6,-15) + 5, -15], rotation: [-0.6, 0, 0, 0.8]}); 
  prop('mountain-timber-bridge', 5, -15, [1.8, 1.0, 4.0], Math.PI/2, {groupId:bridgeGroup, material:agedWood, position:[4, ground(10,-15), -15]});
  
  for(let i=0;i<6;i++) {
    const x = 12 + Math.random()*8, z = 0 + Math.random()*12;
    prop('crate', x, z, [1.2, 1.2, 1.2], Math.random()*Math.PI, {groupId:detailGroup, material:agedWood});
  }
  for(let i=0;i<4;i++) {
    const x = 14 + Math.random()*5, z = -2 + Math.random()*8;
    prop('barrel', x, z, [1.1, 1.1, 1.1], Math.random()*Math.PI, {groupId:detailGroup, material:agedWood});
  }
  prop('mountain-cart-wreck', 10, 8, [1.6, 1.6, 1.6], -Math.PI/3, {groupId:detailGroup, material:agedWood});
  
  for(let i=0;i<18;i++) {
    const x = 5 + Math.random()*22, z = 10 + Math.random()*25;
    const s = 1.5 + Math.random()*1.2;
    prop('alpine-fir', x, z, [s, s*1.1, s], Math.random()*Math.PI, {groupId:detailGroup, material:{coverage:{...snow(.0,1.0),mode:'all',variation:.25}}});
  }

  for(let i=0;i<12;i++) {
    const x = -8 + Math.random()*30, z = 2 + Math.random()*30;
    const s = 0.6 + Math.random()*1.2;
    prop('mountain-boulder', x, z, [s, s*0.8, s], Math.random()*6.28, {groupId:detailGroup});
  }

  for(const [name,position,target,fov,projection,height] of [
    ['01 · A Subida e a Ponte Quebrada', [12, 18, 25], [2, 15, -15], 60, 'perspective', 28],
    ['02 · Assentamento na Encosta', [20, 22, 15], [10, 16, -5], 55, 'perspective', 28],
    ['03 · Ruínas e Abismo', [-5, 15, 0], [-15, 10, -25], 50, 'perspective', 28]
  ]) {
    const id=uuid();
    scene.cameraPresets[id]={id,name,position,target,fov,projection,orthographicHeight:height};
  }

  return validateDocument(scene);
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {assets}=JSON.parse(await readFile(path.join(root,'public/assets/catalog.json'),'utf8'));
  const scene=createMountainExample(assets),directory=path.join(root,'public/scenes');
  await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'snowy-mountain-pass.json'),JSON.stringify(scene,null,2)+'\n');
  
  const icewindScene = createIcewindBridgeExample(assets);
  await writeFile(path.join(directory,'icewind-bridge.json'),JSON.stringify(icewindScene,null,2)+'\n');
  console.log(`Cena Icewind gerada: ${Object.keys(icewindScene.layout.entities).length} elementos.`);

  console.log(`Cena de exemplo gerada: ${Object.keys(scene.layout.entities).length} elementos, ${Object.keys(scene.cameraPresets).length} câmeras.`);
}
