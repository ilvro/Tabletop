import re
import os

gen_file = '/home/ilvro/Documents/Projects/Tabletop/scripts/generate-example-scenes.js'
with open(gen_file, 'r') as f:
    content = f.read()

new_func = """
export function createIcewindBridgeExample(catalog) {
  let sequence = 2000;
  const uuid = () => `c2000000-0000-4000-8000-${String(sequence++).padStart(12,'0')}`;
  const assets = new Map(catalog.map(asset=>[asset.id,asset]));
  const scene = applyEnvironment(createScene('Passagem de Inverno · Ponte e Névoa'), 'fog');
  Object.assign(scene, { id: uuid(), createdAt: fixedDate, updatedAt: fixedDate });
  scene.layout.grid.visible = false; scene.layout.grid.snap = false;
  
  scene.look.background = '#d9e2e5';
  scene.look.fill = { skyColor:'#e4edf0', groundColor:'#656f70', intensity: 1.1 };
  scene.look.sky.enabled = false;
  scene.look.daylight.exposure = 1.1;
  Object.assign(scene.look.fog, { mode:'exp2', color:'#d9e2e5', density:.065 });
  scene.look.volumetricFog.enabled = true;
  scene.look.bloom.enabled = true;
  scene.look.weather.type = 'snow';
  
  const key = createLight({ id:uuid(), name:'Luz difusa da névoa', role:'key', type:'directional',
    position:[5,15,-10], rotation:[-.2,-.4,0,.9],
    color:'#ffffff', intensity:0.8, distance:0, shadowEnabled:true });
  scene.look.lights = { [key.id]: key };

  const add = entity => {scene.layout.entities[entity.id]=entity;return entity;};
  const group = name => { const id=uuid();scene.layout.groups[id]={id,name,parentId:null,locked:false,audience:'all',visible:true};return id; };
  
  const groundGroup=group('01 · Chão nevado'), cliffGroup=group('02 · Paredões'), bridgeGroup=group('03 · Ponte Pênsil'), detailGroup=group('04 · Destroços e Vegetação'), lightGroup=group('05 · Iluminação');

  const snow = (thickness=.08, amount=.98) => ({...coverageDefaults(),amount,physicalThickness:thickness,
    exposedOnly:false,slopeAngle:60,slopeFade:15,variation:.2,variationSize:1.5,color:'#f0f5f7',seed:42});
  const rockMaterial = {...surfacePatch('rock'),textureColorMode:'replace',textureColor:'#525c5d',
    rockPattern:'fractured',textureSize:2.5,textureBrightness:.9,textureContrast:1.2,rockCracks:.9,relief:.15,coverage:snow(0)};
    
  const segments=50,width=50,length=60,heights=[],weights=[];
  for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++) {
    const x=(col/segments-.5)*width, z=(row/segments-.5)*length;
    const sides = smooth(4, 15, Math.abs(x)) * 8;
    const noise = .1 * Math.sin(x*1.5+z*.5) + .15 * Math.cos(x*.4-z*.8);
    const height = sides + noise - 1.0; 
    heights.push(Number(height.toFixed(4)));
    weights.push(0);
  }
  
  const terrain=add(createEntity('terrain',{id:uuid(),name:'Vale nevado',groupId:groundGroup,width,length,segments,heights,
    material:{...rockMaterial,textureColor:'#666d6c',coverage:{...snow(.15,1.0),slopeAngle:35,variation:.1,variationSize:4}},
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

  const masonry={...surfacePatch('rock'),textureColorMode:'replace',textureColor:'#6a726f',textureSize:1.5,textureBrightness:.8,relief:.1,coverage:snow(0,.98)};
  const towerScale = [1.8, 3.5, 1.8];
  prop('mountain-ruin-high-wall', -12, 5, towerScale, Math.PI/4, {groupId:cliffGroup, material:masonry, rockShape:{...rockDefaults('builtin-mountain-ruin-high-wall'), detail:6}});
  prop('mountain-cliff-face', -14, 0, [1.5, 2.5, 1.5], -Math.PI/6, {groupId:cliffGroup, material:rockMaterial});
  prop('mountain-cliff-face', -15, 10, [1.8, 2.0, 1.8], Math.PI/3, {groupId:cliffGroup, material:rockMaterial});
  
  prop('mountain-cliff-face', 14, 0, [1.6, 2.2, 1.6], Math.PI/5, {groupId:cliffGroup, material:rockMaterial});
  prop('mountain-cliff-face', 16, 12, [1.8, 1.9, 1.5], -Math.PI/4, {groupId:cliffGroup, material:rockMaterial});
  prop('mountain-cliff-face', 15, -10, [1.5, 2.5, 1.5], -Math.PI/2, {groupId:cliffGroup, material:rockMaterial});

  const agedWood={...surfacePatch('wood'),textureColorMode:'replace',textureColor:'#40382d',woodPattern:'grain',woodGrain:1,textureBrightness:.5,coverage:snow(.05,.9)};
  prop('mountain-rope-post', -8, 5, [1.5, 1.5, 3.5], Math.PI/2, {name:'Viga da torre', groupId:cliffGroup, material:agedWood, position:[-8, 14, 5]});
  
  const lanternY = 12.5;
  prop('mountain-round-lantern', -6, 5, [2, 2, 2], 0, {groupId:lightGroup, position:[-6, lanternY, 5]});
  const fireLight = createLight({id:uuid(),name:'Fogo da lanterna',type:'point',groupId:lightGroup,position:[-6, lanternY+0.5, 5],
      temperature:2000,intensity:25,distance:15,shadowEnabled:false});
  scene.look.lights[fireLight.id]=fireLight;

  prop('mountain-timber-bridge', 0, -25, [1.5, 1.0, 4.0], Math.PI/2, {groupId:bridgeGroup, material:agedWood, position:[0, 18, -25]});
  prop('mountain-timber-bridge', -8, -25, [1.5, 1.0, 4.0], Math.PI/2, {groupId:bridgeGroup, material:agedWood, position:[-10, 18.5, -25]});
  prop('mountain-timber-bridge', 8, -25, [1.5, 1.0, 4.0], Math.PI/2, {groupId:bridgeGroup, material:agedWood, position:[10, 18.5, -25]});
  
  prop('mountain-rope-post', -5, -24, [1.2, 5.0, 1.2], 0, {groupId:bridgeGroup, material:agedWood, position:[-5, 8, -24]});
  prop('mountain-rope-post', 5, -24, [1.2, 5.0, 1.2], 0, {groupId:bridgeGroup, material:agedWood, position:[5, 8, -24]});
  prop('mountain-rope-post', -5, -26, [1.2, 5.0, 1.2], 0, {groupId:bridgeGroup, material:agedWood, position:[-5, 8, -26]});
  prop('mountain-rope-post', 5, -26, [1.2, 5.0, 1.2], 0, {groupId:bridgeGroup, material:agedWood, position:[5, 8, -26]});

  prop('alpine-fir', 9, 2, [1.8, 1.8, 1.8], Math.PI/3, {groupId:detailGroup, material:{coverage:{...snow(.0,1.0),mode:'all',variation:.1}}});
  prop('mountain-cart-wreck', 7, -2, [1.5, 1.5, 1.5], -Math.PI/4, {groupId:detailGroup, material:agedWood});
  prop('mountain-uprooted-stump', 4, 3, [1.3, 1.3, 1.3], Math.PI/6, {groupId:detailGroup, material:agedWood});
  
  for(let i=0;i<3;i++) {
    prop('mountain-timber-platform', 4 + i*2, 6 + i, [0.8, 0.8, 0.8], Math.random()*Math.PI, {name:'Madeira quebrada', groupId:detailGroup, material:agedWood});
  }

  for(let i=0;i<8;i++) {
    const x = -8 + Math.random()*16, z = 5 + Math.random()*10, s = 0.5 + Math.random()*0.8;
    if (x > -3 && x < 3) continue;
    prop('mountain-boulder', x, z, [s, s*0.7, s], Math.random()*6.28, {groupId:detailGroup});
  }

  for(const [name,position,target,fov,projection,height] of [
    ['01 · Vista da Passagem', [3, 4, 15], [-2, 8, -10], 55, 'perspective', 28],
    ['02 · Torre e Lanterna', [-2, 3, 12], [-8, 12, 5], 55, 'perspective', 28],
    ['03 · Ponte Distante', [0, 5, 5], [0, 16, -25], 45, 'perspective', 28]
  ]) {
    const id=uuid();
    scene.cameraPresets[id]={id,name,position,target,fov,projection,orthographicHeight:height};
  }

  return validateDocument(scene);
}

"""

if 'createIcewindBridgeExample' not in content:
    content = content.replace('if(process.argv[1]', new_func + '\nif(process.argv[1]')

# Now inject the execution
exec_block = """
  const icewindScene = createIcewindBridgeExample(assets);
  await writeFile(path.join(directory,'icewind-bridge.json'),JSON.stringify(icewindScene,null,2)+'\\n');
  console.log(`Cena Icewind gerada: ${Object.keys(icewindScene.layout.entities).length} elementos.`);
"""
if 'icewind-bridge.json' not in content:
    content = content.replace('console.log(`Cena de exemplo gerada', exec_block + '\n  console.log(`Cena de exemplo gerada')

with open(gen_file, 'w') as f:
    f.write(content)

data_file = '/home/ilvro/Documents/Projects/Tabletop/src/data/example-scenes.js'
with open(data_file, 'r') as f:
    data_content = f.read()

new_entry = """  Object.freeze({ id: 'icewind-bridge', name: 'Passagem de Inverno · Ponte e Névoa',
    description: 'Um vale nevado e escuro com uma ponte gigantesca ao fundo e uma torre em ruínas.',
    file: 'scenes/icewind-bridge.json', preview: 'scenes/icewind-bridge.jpg' }),
"""
if 'icewind-bridge' not in data_content:
    data_content = data_content.replace(']);', new_entry + ']);')

with open(data_file, 'w') as f:
    f.write(data_content)
