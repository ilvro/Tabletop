import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMountainExample,mountainTrailX} from '../scripts/generate-example-scenes.js';
import {EXAMPLE_SCENES,loadExampleScene} from '../src/data/example-scenes.js';
import {validateDocument,createMapFromScene} from '../src/domain/documents.js';
import {terrainHeightAt} from '../src/domain/geometry.js';
import {createSceneStore} from '../src/state/scene-store.js';
import {projectPresentation} from '../src/app/presentation.js';
import * as THREE from 'three';
import {recipeInstance,disposeObject} from '../src/render/asset-cache.js';

test('bundled mountain scene is reproducible, self-contained, editable with an ascending trail, side cave and elevated bridge',async()=>{
  const {assets}=JSON.parse(await readFile('public/assets/catalog.json','utf8'));
  const original=JSON.parse(await readFile('public/scenes/snowy-mountain-pass.json','utf8'));
  assert.deepEqual(createMountainExample(assets),original);assert.equal(validateDocument(original),original);
  const entities=Object.values(original.layout.entities),terrain=entities.find(e=>e.kind==='terrain'),water=entities.find(e=>e.kind==='water'&&e.water.state==='water');
  const catalog=new Map(assets.map(a=>[a.id,a]));
  for(const e of entities) {
    assert.equal(e.locked,false);assert.equal(e.audience,'all');
    if(e.assetRef)assert.equal(catalog.get(e.assetRef.id)?.revision,e.assetRef.revision);
  }
  assert.equal(entities.length,85);assert.equal(Object.keys(original.cameraPresets).length,5);
  assert.ok(terrain.material.coverage.physicalThickness>0);assert.ok(terrain.paintLayers.some(layer=>layer.weights.some(w=>w>0)));
  // Check a centerline and near both edges at every saved river cross-section.
  for(let z=12;z<=27;z+=1.5) {
    const x=-4.4+Math.sin(z*.095)*.5;
    for(const offset of [-1.35,0,1.35])assert.ok(terrainHeightAt(terrain,[x+offset,0,z])<water.transform.position[1]-water.water.waveHeight,`bed under water at ${z}, ${offset}`);
    assert.ok(terrainHeightAt(terrain,[x+3.4,0,z])>water.transform.position[1]+water.water.waveHeight,'dry walkable bank');
  }
  assert.ok(terrainHeightAt(terrain,[mountainTrailX(-23),0,-23])-terrainHeightAt(terrain,[mountainTrailX(23),0,23])>9,'route visibly climbs the mountainside');
  const bridge=entities.find(e=>e.name==='Tabuleiro de apoio da ponte elevada');
  for(const x of [-7.4,2.4])assert.ok(Math.abs(terrainHeightAt(terrain,[x,0,-3])-bridge.transform.position[1])<.22,'bridge ends meet the approaches');
  assert.ok(bridge.transform.position[1]-terrainHeightAt(terrain,[-2.5,0,-3])>4,'bridge spans a genuine ravine');
  const cave=entities.find(e=>e.assetRef?.id==='builtin-mountain-cave-mouth');
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...cave.transform.position),new THREE.Quaternion(...cave.transform.rotation),new THREE.Vector3(...cave.transform.scale));
  for(const x of [-1,0,1])for(const z of [-2,0,2]) {
    const p=new THREE.Vector3(x,0,z).applyMatrix4(matrix);
    assert.ok(terrainHeightAt(terrain,[p.x,0,p.z])<p.y+.05,'terrain does not fill cave recess');
  }
  assert.equal(entities.filter(e=>e.assetRef?.id==='builtin-mountain-round-lantern').length,3);
  const mountingSurfaces=[];
  try {
    for(const e of entities.filter(e=>['builtin-mountain-cliff-face','builtin-mountain-ruin-high-wall','builtin-ruin-masonry-wall'].includes(e.assetRef?.id))) {
      const asset=catalog.get(e.assetRef.id),recipe=JSON.parse(await readFile(`public${asset.url}`,'utf8'));
      const wrapper=new THREE.Group();wrapper.add(recipeInstance(recipe,e.rockShape,asset.bounds));
      wrapper.position.fromArray(e.transform.position);wrapper.quaternion.fromArray(e.transform.rotation);wrapper.scale.fromArray(e.transform.scale);wrapper.updateMatrixWorld(true);mountingSurfaces.push(wrapper);
    }
    for(const x of [-7,-5.5,-3,0,.5,2])for(const z of [-3.8,-3,-2.2]) {
      const ray=new THREE.Raycaster(new THREE.Vector3(x,bridge.transform.position[1]+.06,z),new THREE.Vector3(0,1,0),0,.5);
      assert.equal(ray.intersectObjects(mountingSurfaces,true).length,0,'bridge route is not blocked by masonry or piers');
    }
    const caveFront=new THREE.Vector3(0,1.5,4).applyMatrix4(matrix),intoCave=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(...cave.transform.rotation));
    assert.equal(new THREE.Raycaster(caveFront,intoCave,0,5.5).intersectObjects(mountingSurfaces,true).length,0,'surrounding cliffs do not fill the cave opening');
    for(const lantern of entities.filter(e=>e.assetRef?.id==='builtin-mountain-round-lantern')) {
      const q=new THREE.Quaternion(...lantern.transform.rotation),p=new THREE.Vector3(...lantern.transform.position),scale=new THREE.Vector3(...lantern.transform.scale);
      const normal=new THREE.Vector3(1,0,0).applyQuaternion(q);
      const plate=new THREE.Vector3(-.5025,.4975,0).multiply(scale).applyQuaternion(q).add(p);
      const hits=new THREE.Raycaster(plate.clone().addScaledVector(normal,.2),normal.clone().negate(),0,.4).intersectObjects(mountingSurfaces,true);
      assert.ok(hits.length>0,'bracket meets a real rock/masonry surface');assert.ok(Math.abs(hits[0].distance-.22)<1e-5,'wall enters wooden mounting plate');
      const socket=new THREE.Vector3(.3475,.1925,0).multiply(scale).applyQuaternion(q).add(p);
      assert.ok(Object.values(original.look.lights).some(light=>light.type==='point'&&new THREE.Vector3(...light.position).distanceTo(socket)<1e-6),'warm light is centered inside round body');
    }
  } finally {mountingSurfaces.forEach(disposeObject);}
  const store=createSceneStore(original);const rock=entities.find(e=>e.rockShape);
  store.execute('entity.update',{id:rock.id,patch:{rockShape:{...rock.rockShape,seed:100}},snap:false});assert.equal(store.document.layout.entities[rock.id].rockShape.seed,100);store.undo();assert.deepEqual(store.document.layout,original.layout);
  validateDocument(createMapFromScene(original));validateDocument(projectPresentation(original));
});

test('new high ruin has a real window/open back, base pivot and bounded merged geometry',async()=>{
  const {assets}=JSON.parse(await readFile('public/assets/catalog.json','utf8')),asset=assets.find(a=>a.id==='builtin-mountain-ruin-high-wall');
  const recipe=JSON.parse(await readFile(`public${asset.url}`,'utf8'));assert.ok(recipe.parts.length<=200);
  const model=recipeInstance(recipe);model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.min.y)<.00001);assert.ok(bounds.max.y>7.5);assert.ok(model.children.length<=2);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,4,4),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(model,true).length,0);
  ray.ray.origin.x=1.5;assert.ok(ray.intersectObject(model,true).length>0);
  model.traverse(mesh=>{if(mesh.geometry)assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));});disposeObject(model);
});

test('round lantern has a circular body and connected chain/bail; older square lantern is also connected',async()=>{
  for(const id of ['mountain-round-lantern','mountain-wall-lantern']) {
    const recipe=JSON.parse(await readFile(`public/assets/models/${id}.json`,'utf8'));
    const rings=recipe.parts.filter(p=>p.shape==='ring'),flame=recipe.parts.find(p=>p.material==='flame');
    const lowest=rings.reduce((a,b)=>a.position[1]<b.position[1]?a:b);
    const model=recipeInstance(recipe);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);assert.ok(Math.abs(bounds.min.y)<1e-6);assert.ok(model.children.length<=4);
    if(id==='mountain-round-lantern') {
      assert.equal(flame.shape,'cylinder');
      assert.ok(recipe.parts.some(p=>p.shape==='cylinder'&&p.radiusBottom>.2&&p.radiusTop<.05),'conical round lid');
      assert.ok(Math.abs(flame.position[0]-.3475)<1e-6);assert.ok(Math.abs(flame.position[1]-.1925)<1e-6);
      const chain=rings.filter(p=>Math.abs(p.radius-.034)<1e-8).sort((a,b)=>b.position[1]-a.position[1]);
      for(let i=1;i<chain.length;i++)assert.ok(chain[i-1].position[1]-chain[i].position[1]<chain[i-1].radius+chain[i].radius,'neighboring links overlap');
      assert.ok(chain.at(-1).position[1]-chain.at(-1).radius<lowest.position[1]+lowest.radius,'chain reaches bail');
      const lid=recipe.parts.find(p=>p.shape==='cylinder'&&p.radiusBottom>.2&&p.radiusTop<.05);
      assert.ok(lowest.position[1]-lowest.radius-lowest.tube<lid.position[1]+lid.height/2,'bail enters lid');
      const bracket=recipe.parts.find(p=>p.shape==='box'&&p.size[0]>1);
      const anchor=rings.find(p=>p.radius===.04);
      assert.ok(anchor.position[1]+anchor.radius+anchor.tube>bracket.position[1]-bracket.size[1]/2,'upper ring enters bracket');
    } else {
      const lid=recipe.parts.filter(p=>p.shape==='box'&&p.material==='metal').sort((a,b)=>b.position[1]-a.position[1])[0];
      assert.ok(lowest.position[1]-lowest.radius-lowest.tube<lid.position[1]+lid.size[1]/2,'square lantern bail enters roof');
      const chain=rings.filter(p=>p.radius===.034).sort((a,b)=>a.position[1]-b.position[1]);
      assert.ok(chain[0].position[1]-chain[0].radius<lowest.position[1]+lowest.radius,'last link reaches bail');
    }
    disposeObject(model);
  }
});

test('cave mouth has real open space, a roof and a recessed rear wall with bounded local geometry',async()=>{
  const recipe=JSON.parse(await readFile('public/assets/models/mountain-cave-mouth.json','utf8'));
  assert.ok(recipe.parts.length<=200);const model=recipeInstance(recipe);model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);assert.ok(Math.abs(bounds.min.y)<1e-6);assert.ok(model.children.length<=4);
  const origin=new THREE.Vector3(0,1.5,bounds.max.z+.5),ray=new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1));
  const hits=ray.intersectObject(model,true);assert.ok(hits.length>0);assert.ok(hits[0].distance>5,'rear wall is recessed, opening is not a painted wall');
  ray.far=3;assert.equal(ray.intersectObject(model,true).length,0,'front passage is truly empty');
  ray.ray.origin.x=2.5;assert.ok(ray.intersectObject(model,true).length>0,'rocky side wall');
  ray.ray.origin.set(0,6,0);ray.ray.direction.set(0,-1,0);ray.far=10;assert.ok(ray.intersectObject(model,true).length>0,'roof closes the alcove above');
  disposeObject(model);
});

test('each example load returns an isolated unsaved scene with remapped references and never writes the original',async()=>{
  const original=JSON.parse(await readFile('public/scenes/snowy-mountain-pass.json','utf8')),before=structuredClone(original),urls=[];
  const fetcher=async url=>{urls.push(url);return {ok:true,json:async()=>structuredClone(original)};};
  const first=await loadExampleScene(EXAMPLE_SCENES[0].id,{fetcher}),second=await loadExampleScene(EXAMPLE_SCENES[0].id,{fetcher});
  assert.equal(first.revision,0);assert.notEqual(first.id,original.id);assert.notEqual(first.id,second.id);
  const originalIds=new Set([...Object.keys(original.layout.entities),...Object.keys(original.layout.groups),...Object.keys(original.look.lights),...Object.keys(original.cameraPresets)]);
  for(const id of [...Object.keys(first.layout.entities),...Object.keys(first.layout.groups),...Object.keys(first.look.lights),...Object.keys(first.cameraPresets)])assert.equal(originalIds.has(id),false);
  for(const e of Object.values(first.layout.entities))assert.ok(first.layout.groups[e.groupId]);
  validateDocument(first);assert.deepEqual(original,before);assert.ok(urls.every(url=>url.endsWith('/scenes/snowy-mountain-pass.json')));
  await assert.rejects(()=>loadExampleScene('unknown',{fetcher}),/desconhecida/);
  await assert.rejects(()=>loadExampleScene(EXAMPLE_SCENES[0].id,{fetcher:async()=>({ok:false})}),/carregar/);
  await assert.rejects(()=>loadExampleScene(EXAMPLE_SCENES[0].id,{fetcher:async()=>({ok:true,json:async()=>({})})}));
});
