import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createRockGeometry } from '../src/render/rock-geometry.js';
import { recipeInstance, disposeObject } from '../src/render/asset-cache.js';
import { ROCK_PRESETS, rockDefaults } from '../src/domain/rocks.js';
import { createScene, createEntity, duplicateDocument, createMapFromScene, createSceneFromMap, validateDocument } from '../src/domain/documents.js';
import { surfacePatch, coverageDefaults } from '../src/domain/materials.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { projectPresentation } from '../src/app/presentation.js';

test('geological meshes are closed, finite, deterministic, correctly oriented and raycastable with bounded detail',()=>{
  for(const form of ['fractured','rounded','strata']) {
    const geometry=createRockGeometry({form}),again=createRockGeometry({form});
    try {
      assert.deepEqual(geometry.attributes.position.array,again.attributes.position.array);
      assert.ok(geometry.attributes.position.array.every(Number.isFinite));assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
      assert.ok(geometry.index.count/3<=1620);assert.ok(geometry.attributes.normal.array.some(v=>Math.abs(v)>.1));
      const edges=new Map(),index=geometry.index.array;
      for(let i=0;i<index.length;i+=3) for(let j=0;j<3;j++) {const a=index[i+j],b=index[i+(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)??0)+1);}
      assert.ok([...edges.values()].every(count=>count===2),'every welded edge belongs to two triangles');
      const bounds=geometry.boundingBox,size=bounds.getSize(new THREE.Vector3());
      assert.ok(Math.abs(bounds.min.y)<1e-6);assert.ok(Math.abs(size.x-2)<1e-6&&Math.abs(size.y-1.6)<1e-6&&Math.abs(size.z-1.5)<1e-6);
      const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({side:THREE.FrontSide}));
      const ray=new THREE.Raycaster(new THREE.Vector3(0,4,0),new THREE.Vector3(0,-1,0));
      assert.ok(ray.intersectObject(mesh).length>0,'top faces point outwards and can be selected');mesh.material.dispose();
    } finally {geometry.dispose();again.dispose();}
  }
  const first=createRockGeometry(),second=createRockGeometry({seed:23}),fine=createRockGeometry({detail:8}),coarse=createRockGeometry({detail:2});
  assert.notDeepEqual(first.attributes.position.array,second.attributes.position.array);assert.ok(fine.index.count>coarse.index.count);
  for(const g of [first,second,fine,coarse])g.dispose();
  for(const params of [{detail:9},{detail:2.5},{seed:NaN},{size:[2,0,1]},{form:'invalid'},{irregularity:-1}]) assert.throws(()=>createRockGeometry(params));
});

test('new rock recipes retain metric bounds and base pivot when shape, detail and seed change independently',async()=>{
  const {assets}=JSON.parse(await readFile(new URL('../public/assets/catalog.json',import.meta.url),'utf8'));
  for(const id of Object.keys(ROCK_PRESETS)) {
    const record=assets.find(a=>a.id===id),recipe=JSON.parse(await readFile(new URL(`../public${record.url}`,import.meta.url),'utf8'));
    const preview=recipeInstance(recipe),placed=recipeInstance(recipe,rockDefaults(id));
    try {assert.deepEqual(preview.children.map(m=>m.geometry.attributes.position.array),placed.children.map(m=>m.geometry.attributes.position.array),'catalog preview and default instance use the same seeds');} finally {disposeObject(preview);disposeObject(placed);}
    for(const form of ['fractured','rounded','strata']) {
      const instance=recipeInstance(recipe,{...rockDefaults(id),form,seed:123,detail:4},record.bounds);
      try {
        const bounds=new THREE.Box3().setFromObject(instance),size=bounds.getSize(new THREE.Vector3());
        assert.ok(Math.abs(bounds.min.y)<1e-6);
        assert.ok(size.x<=record.footprint[0]+.001&&size.z<=record.footprint[1]+.001);
        for(const [i,extent] of [size.x,size.y,size.z].entries()) assert.ok(Math.abs(extent-record.bounds[i])<1e-5);
      } finally {disposeObject(instance);}
    }
  }
});

test('rock shape changes validate atomically and preserve materials, snow, transforms and history through persistence/projection',()=>{
  const scene=createScene(),rock=createEntity('prop',{assetRef:{id:'builtin-stratified-cliff',revision:1},material:{...surfacePatch('rock'),coverage:coverageDefaults()},rockShape:rockDefaults('builtin-stratified-cliff')});
  scene.layout.entities[rock.id]=rock;const store=createSceneStore(scene),before=structuredClone(store.document);
  store.execute('entity.update',{id:rock.id,patch:{rockShape:{...rock.rockShape,seed:123,detail:4}}});
  assert.deepEqual(store.document.layout.entities[rock.id].material,rock.material);assert.deepEqual(store.document.layout.entities[rock.id].transform,rock.transform);
  store.undo();assert.deepEqual(store.document,before);store.redo();
  for(const patch of [{rockShape:{...rock.rockShape,detail:30}},{rockShape:{...rock.rockShape,seed:1.5}},{rockShape:{...rock.rockShape,irregularity:Infinity}},{assetRef:{id:'builtin-crate',revision:1}}]) {
    const current=structuredClone(store.document);assert.throws(()=>store.execute('entity.update',{id:rock.id,patch}));assert.deepEqual(store.document,current);
  }
  for(const doc of [JSON.parse(JSON.stringify(store.document)),duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document)),projectPresentation(store.document)]) {
    validateDocument(doc);assert.equal(Object.values(doc.layout.entities)[0].rockShape.seed,123);
  }
  store.execute('entity.update',{id:rock.id,patch:{audience:'gm'}});assert.equal(projectPresentation(store.document).layout.entities[rock.id],undefined);
});
