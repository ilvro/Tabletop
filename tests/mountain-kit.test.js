import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createRockGeometry} from '../src/render/rock-geometry.js';
import {createRopeGeometry,createRingGeometry} from '../src/render/mountain-primitives.js';
import {recipeInstance,disposeObject} from '../src/render/asset-cache.js';
import {rockDefaults} from '../src/domain/rocks.js';
import {createScene,createEntity,validateDocument,duplicateDocument,createMapFromScene,createSceneFromMap} from '../src/domain/documents.js';
import {createSceneStore} from '../src/state/scene-store.js';
import {projectPresentation} from '../src/app/presentation.js';
import {supportHeightAt} from '../src/domain/geometry.js';

const vector=(p,i)=>new THREE.Vector3().fromBufferAttribute(p,i);
test('cliff shells stay manifold, outward and bounded at extreme settings; shelves have real undersides',()=>{
  for(const form of ['cliff','spire'])for(const settings of [{},{terraces:1,overhang:0,erosion:0,irregularity:0,detail:2},{terraces:12,overhang:1,erosion:1,irregularity:1,detail:8,seed:65535}]) {
    const g=createRockGeometry({form,...settings}),p=g.attributes.position,index=g.index.array,edges=new Map();let volume=0;
    assert.ok(index.length/3<4000);assert.ok(p.array.every(Number.isFinite));assert.ok(g.attributes.normal.array.every(Number.isFinite));
    for(let i=0;i<index.length;i+=3) {
      const a=vector(p,index[i]),b=vector(p,index[i+1]),c=vector(p,index[i+2]);assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length()>1e-10);
      volume+=a.dot(b.clone().cross(c));
      for(let j=0;j<3;j++){const a=index[i+j],b=index[i+(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;const entry=edges.get(key)??{count:0,winding:0};entry.count++;entry.winding+=a<b?1:-1;edges.set(key,entry);}
    }
    assert.ok([...edges.values()].every(e=>e.count===2&&e.winding===0),'closed shell, consistent winding');assert.ok(volume>0);
    const extent=g.boundingBox.getSize(new THREE.Vector3());assert.ok(extent.distanceTo(new THREE.Vector3(2,1.6,1.5))<1e-6);assert.equal(g.boundingBox.min.y,0);
    const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.FrontSide}));assert.ok(new THREE.Raycaster(new THREE.Vector3(0,4,0),new THREE.Vector3(0,-1,0)).intersectObject(mesh).length);
    mesh.material.dispose();g.dispose();
  }
  const plain=createRockGeometry({form:'cliff',overhang:0,irregularity:0,erosion:0}),ledge=createRockGeometry({form:'cliff',overhang:1,irregularity:0,erosion:0});
  // An underside on the front is a geometric surface, not a normal-map illusion.
  let undersides=0;const p=ledge.attributes.position,idx=ledge.index.array;
  for(let i=0;i<idx.length;i+=3){const a=vector(p,idx[i]),b=vector(p,idx[i+1]),c=vector(p,idx[i+2]),n=b.clone().sub(a).cross(c.clone().sub(a));if(n.y<-.001&&n.z>.001)undersides++;}
  assert.ok(undersides>20);assert.notDeepEqual(plain.attributes.position.array,ledge.attributes.position.array);
  const baseline=createRockGeometry({form:'cliff'});
  for(const patch of [{seed:321},{terraces:9},{erosion:1},{detail:8}]) {const g=createRockGeometry({form:'cliff',...patch});assert.notDeepEqual(g.attributes.position.array,baseline.attributes.position.array);g.dispose();}baseline.dispose();
  plain.dispose();ledge.dispose();
  for(const patch of [{overhang:2},{erosion:NaN},{terraces:1.2},{terraces:13}])assert.throws(()=>createRockGeometry({form:'cliff',...patch}));
});

test('optional cliff settings survive history, documents/maps and projector; invalid edits are atomic',()=>{
  const scene=createScene(),entity=createEntity('prop',{assetRef:{id:'builtin-mountain-cliff-face',revision:1},rockShape:rockDefaults('builtin-mountain-cliff-face')});scene.layout.entities[entity.id]=entity;
  const store=createSceneStore(scene),before=structuredClone(scene);store.execute('entity.update',{id:entity.id,patch:{rockShape:{...entity.rockShape,overhang:.9,terraces:9,erosion:.8}}});
  store.undo();assert.deepEqual(store.document,before);store.redo();
  for(const doc of [JSON.parse(JSON.stringify(store.document)),duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document)),projectPresentation(store.document)]) {validateDocument(doc);assert.equal(Object.values(doc.layout.entities)[0].rockShape.terraces,9);}
  for(const patch of [{overhang:-.1},{erosion:Infinity},{terraces:2.5},{terraces:13}]){const before=structuredClone(store.document);assert.throws(()=>store.execute('entity.update',{id:entity.id,patch:{rockShape:{...entity.rockShape,...patch}}}));assert.deepEqual(store.document,before);}
  const old=structuredClone(store.document);delete old.layout.entities[entity.id].rockShape.overhang;delete old.layout.entities[entity.id].rockShape.terraces;delete old.layout.entities[entity.id].rockShape.erosion;validateDocument(old);
});

test('mountain kit has real window and corner gaps, bounded batches, rope/chain holes and flat token support',async()=>{
  const catalog=JSON.parse(await readFile('public/assets/catalog.json','utf8'));
  const load=async id=>{const record=catalog.assets.find(a=>a.id===`builtin-${id}`);return {record,recipe:JSON.parse(await readFile(`public${record.url}`,'utf8'))};};
  const {record:towerRecord,recipe:towerRecipe}=await load('mountain-ruin-tower'),tower=recipeInstance(towerRecipe);tower.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,1.85,4),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(tower,true).length,0,'window and back are open');ray.ray.origin.x=1.5;assert.ok(ray.intersectObject(tower,true).length,'side wall remains solid');
  assert.ok(tower.children.length<=2);assert.ok(towerRecord.bounds[1]>3);disposeObject(tower);
  const {record,recipe}=await load('mountain-timber-platform'),platform=recipeInstance(recipe);platform.updateMatrixWorld(true);
  const hit=new THREE.Raycaster(new THREE.Vector3(0,3,.15),new THREE.Vector3(0,-1,0)).intersectObject(platform,true)[0];assert.ok(Math.abs(hit.point.y-record.supportHeight)<.001);
  const prop=createEntity('prop',{assetRef:{id:record.id,revision:1},footprint:record.footprint,supportHeight:record.supportHeight});assert.equal(supportHeightAt(prop,[0,0,0]),record.supportHeight);disposeObject(platform);
  const {recipe:cliffRecipe}=await load('mountain-cliff-face'),base=recipeInstance(cliffRecipe),variant=recipeInstance(cliffRecipe,{...rockDefaults('builtin-mountain-cliff-face'),terraces:10});
  const fixedBase=base.children.find(c=>!c.material.flatShading),fixedVariant=variant.children.find(c=>!c.material.flatShading);assert.deepEqual(fixedBase.geometry.attributes.position.array,fixedVariant.geometry.attributes.position.array,'talus does not become a cliff when editing');assert.ok(base.children.length<=2);disposeObject(base);disposeObject(variant);
  const ring=createRingGeometry({}),mesh=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));assert.equal(new THREE.Raycaster(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)).intersectObject(mesh).length,0,'chain center is hollow');mesh.material.dispose();ring.dispose();
  const rope=createRopeGeometry({points:[[-2,1,0],[0,0,0],[2,1,0]]});rope.computeBoundingBox();assert.ok(rope.boundingBox.min.y<.05);assert.ok(rope.attributes.position.array.every(Number.isFinite));rope.dispose();
  for(const p of [{points:[[0,0,0],[0,0,0]]},{points:[[0,0,0],[1,0,0]],segments:10000}])assert.throws(()=>createRopeGeometry(p));
});
