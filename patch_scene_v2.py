import re

gen_file = '/home/ilvro/Documents/Projects/Tabletop/scripts/generate-example-scenes.js'
with open(gen_file, 'r') as f:
    content = f.read()

# Remove the old createIcewindBridgeExample
content = re.sub(r'export function createIcewindBridgeExample.*?return validateDocument\(scene\);\n}', '', content, flags=re.DOTALL)

new_func = """
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
  // Use the newly added snow particle effect
  scene.look.weather = { type: 'snow', count: 2500, center: [0, 15, 0], size: [60, 40, 60], color: '#ffffff', opacity: 0.6, particleSize: 0.08, speed: 6.0, wind: [15, 5], seed: 42 };
  
  const key = createLight({ id:uuid(), name:'Luz difusa da névoa', role:'key', type:'directional',
    position:[10,25,-15], rotation:[-0.2, -0.4, 0, 0.8944271909999159],
    color:'#ffffff', intensity:0.8, distance:0, shadowEnabled:true });
  scene.look.lights = { [key.id]: key };

  const add = entity => {scene.layout.entities[entity.id]=entity;return entity;};
  const group = name => { const id=uuid();scene.layout.groups[id]={id,name,parentId:null,locked:false,audience:'all',visible:true};return id; };
  
  const groundGroup=group('01 · Relevo Nevado'), cliffGroup=group('02 · Paredões e Ruínas'), bridgeGroup=group('03 · Ponte Pênsil Quebrada'), detailGroup=group('04 · Assentamento e Vegetação'), lightGroup=group('05 · Iluminação');

  // Much higher variation size and strength to look very natural and chaotic on the rocks
  const snow = (thickness=.08, amount=.98) => ({...coverageDefaults(),amount,physicalThickness:thickness,
    exposedOnly:false,slopeAngle:65,slopeFade:20,variation:.9,variationSize:4.5,color:'#f0f5f7',seed:1337});
  const rockMaterial = {...surfacePatch('rock'),textureColorMode:'replace',textureColor:'#454c4d',
    rockPattern:'fractured',textureSize:3.0,textureBrightness:.8,textureContrast:1.3,rockCracks:.95,relief:.25,coverage:snow(0)};
    
  const segments=80,width=60,length=80,heights=[],weights=[];
  // Steep climb that plateaus, with rough noise
  for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++) {
    const x=(col/segments-.5)*width, z=(row/segments-.5)*length;
    
    // Y-axis path slope: climbs steeply then plateaus around z = -10
    const pathZ = Math.max(-10, Math.min(30, z));
    const pathSlope = smooth(30, -10, pathZ) * 15; 
    
    // Ravine in the middle. We want a plateau on the left/right, and a chasm down the middle near the bridge.
    // Let's make the center-right the climb, and left is the chasm.
    // No, Tomb Raider Soviet Installation: steep climb on the side leading to a plateau.
    const isPlateau = smooth(0, -20, z) * smooth(10, 20, x); // top right is a high plateau
    const chasm = smooth(10, -5, x) * smooth(0, -30, z) * -20; // top left is a deep chasm
    
    const base = pathSlope + isPlateau * 5 + chasm;
    
    // Fractal noise for natural chaotic terrain
    const noise = 0.5 * Math.sin(x*1.1+z*.6) + 1.2 * Math.cos(x*.3-z*.4) + 0.3 * Math.sin(x*3.2+z*2.5);
    
    heights.push(Number((base + noise).toFixed(4)));
    weights.push(0);
  }
  
  const terrain=add(createEntity('terrain',{id:uuid(),name:'Encosta rochosa',groupId:groundGroup,width,length,segments,heights,
    material:{...rockMaterial,textureColor:'#5c6362',coverage:{...snow(.25,1.0),slopeAngle:45,variation:1.5,variationSize:6}},
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
  
  // Left giant tower ruing (The ancient ruin destination)
  prop('mountain-ruin-high-wall', -15, -25, [2.5, 4.5, 2.5], Math.PI/3, {groupId:cliffGroup, material:masonry});
  prop('mountain-cliff-face', -18, -25, [2.0, 3.5, 2.0], -Math.PI/6, {groupId:cliffGroup, material:rockMaterial});
  
  // Right side cliffs blocking the plateau
  prop('mountain-cliff-face', 22, -15, [1.8, 2.5, 1.8], Math.PI/4, {groupId:cliffGroup, material:rockMaterial});
  prop('mountain-cliff-face', 25, 5, [2.2, 3.0, 1.5], -Math.PI/4, {groupId:cliffGroup, material:rockMaterial});

  const agedWood={...surfacePatch('wood'),textureColorMode:'replace',textureColor:'#352e25',woodPattern:'grain',woodGrain:1,textureBrightness:.4,coverage:snow(.08,.95)};
  
  // Lantern on the right plateau
  const lanternY = ground(12, 0) + 4.5;
  prop('mountain-rope-post', 12, 0, [1.5, 1.5, 2.5], -Math.PI/4, {name:'Viga do assentamento', groupId:detailGroup, material:agedWood, position:[12, lanternY + 1.5, 0]});
  prop('mountain-round-lantern', 10, -2, [2, 2, 2], 0, {groupId:lightGroup, position:[10, lanternY, -2]});
  const fireLight = createLight({id:uuid(),name:'Fogo da lanterna',type:'point',groupId:lightGroup,position:[10, lanternY+0.5, -2],
      temperature:2200,intensity:35,distance:20,shadowEnabled:false});
  scene.look.lights[fireLight.id]=fireLight;

  // Huge Broken Bridge spanning from plateau (right) to ruins (left)
  // Broken part hanging down
  prop('mountain-timber-bridge', -2, -15, [1.8, 1.0, 3.0], Math.PI/2 - 0.5, {groupId:bridgeGroup, material:agedWood, position:[-6, ground(-6,-15) + 5, -15], rotation: [-0.6, Math.PI/2, 0, 1]}); 
  prop('mountain-timber-bridge', 5, -15, [1.8, 1.0, 4.0], Math.PI/2, {groupId:bridgeGroup, material:agedWood, position:[4, ground(10,-15), -15]});
  
  // Assentamento elements on plateau (crates, barrels, wrecks)
  for(let i=0;i<6;i++) {
    const x = 12 + Math.random()*8, z = 0 + Math.random()*12;
    prop('crate', x, z, [1.2, 1.2, 1.2], Math.random()*Math.PI, {groupId:detailGroup, material:agedWood});
  }
  for(let i=0;i<4;i++) {
    const x = 14 + Math.random()*5, z = -2 + Math.random()*8;
    prop('barrel', x, z, [1.1, 1.1, 1.1], Math.random()*Math.PI, {groupId:detailGroup, material:agedWood});
  }
  prop('mountain-cart-wreck', 10, 8, [1.6, 1.6, 1.6], -Math.PI/3, {groupId:detailGroup, material:agedWood});
  
  // Extremely dense forest patches
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
"""

if 'createIcewindBridgeExample' not in content:
    content = content.replace('if(process.argv[1]', new_func + '\nif(process.argv[1]')

with open(gen_file, 'w') as f:
    f.write(content)
