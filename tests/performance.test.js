import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createScene, createEntity } from '../src/domain/documents.js';
import { validateDocument } from '../src/domain/validation.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { createDraft, finishDraft, cloneValue, isTrustedSnapshot } from '../src/state/immutable.js';
import { projectPresentation } from '../src/app/presentation.js';
import { createLatestJob } from '../src/data/latest-job.js';
import { createScenePreviews } from '../src/app/scene-previews.js';
import { createTerrain, updateTerrain, syncTerrainPicking } from '../src/render/scene-objects.js';
import { createAssetCache, disposeObject } from '../src/render/asset-cache.js';
import { paintTerrain, sculptTerrain } from '../src/authoring/terrain.js';
import { DocumentStorage, atomicWrite } from '../server/storage.js';
import { applyBoundEmission } from '../src/render/bound-light.js';
import * as THREE from 'three';

test('150 immutable history entries share terrain data and remain reversible and atomic',()=>{
  const scene=createScene('Histórico'),terrain=createEntity('terrain',{segments:8});scene.layout.entities[terrain.id]=terrain;
  const store=createSceneStore({...scene,revision:1}),original=store.document,entity=original.layout.entities[terrain.id],events=[];
  store.subscribe(e=>events.push(e));
  for(let i=0;i<150;i++)store.execute('entity.update',{id:terrain.id,patch:{name:`Nome ${i}`}});
  assert.equal(store.document.layout.entities[terrain.id].heights,entity.heights);
  assert.equal(store.document.layout.entities[terrain.id].paintLayers,entity.paintLayers);
  assert.equal(store.document.look,original.look);assert.ok(isTrustedSnapshot(store.document));
  assert.throws(()=>{store.document.layout.entities[terrain.id].heights[0]=3;},TypeError);
  const current=store.document,version=store.editVersion;
  assert.throws(()=>store.execute('entity.update',{id:terrain.id,patch:{width:-1}}));
  assert.equal(store.document,current);assert.equal(store.editVersion,version);
  for(let i=0;i<150;i++)store.undo();assert.deepEqual(store.document,original);assert.equal(store.dirty,false);
  for(let i=0;i<150;i++)store.redo();assert.equal(store.document.layout.entities[terrain.id].name,'Nome 149');
  assert.deepEqual(events[0].changes.categories,['metadata']);assert.deepEqual(events[0].changes.entities,[terrain.id]);
  const sent=store.document,sentVersion=store.editVersion;
  store.execute('entity.update',{id:terrain.id,patch:{name:'Depois do envio'}});
  store.markSaved({...sent,revision:2},sentVersion);assert.equal(store.dirty,true);store.undo();assert.equal(store.dirty,false);
  assert.equal(store.document.revision,2);
  const invalid=Object.freeze({...scene,name:42});assert.throws(()=>validateDocument(invalid));
  store.dispose();
});

test('nested array drafts, inserted records and clones publish plain detached JSON',()=>{
  const base={list:[{value:1},{value:2}],stable:{x:7}};
  const draft=createDraft(base);draft.list.reverse();draft.list[0].value=9;draft.list.push({nested:draft.stable});
  const copy=cloneValue(draft),result=finishDraft(draft);
  assert.deepEqual(copy,{list:[{value:9},{value:1},{nested:{x:7}}],stable:{x:7}});
  assert.deepEqual(structuredClone(result),copy);assert.equal(base.list[1].value,2);assert.equal(result.stable,base.stable);
  assert.equal(result.list[2].nested,base.stable);copy.stable.x=0;assert.equal(result.stable.x,7);
  assert.equal(finishDraft(createDraft(Object.freeze(result))),result);
});

test('cached public snapshots stay immutable, private and independent from later edits',()=>{
  const scene=createScene('Pública'),secret=createEntity('floor',{audience:'gm'});scene.layout.entities[secret.id]=secret;
  const store=createSceneStore(scene),first=projectPresentation(store.document);
  assert.equal(projectPresentation(store.document),first);assert.equal(first.layout.entities[secret.id],undefined);
  assert.throws(()=>{first.name='Corrompido';},TypeError);
  store.execute('scene.rename',{name:'Atualizada'});
  const second=projectPresentation(store.document);assert.equal(second.name,'Atualizada');assert.equal(first.name,'Pública');
  store.dispose();
});

test('draft writer keeps one active transaction and the latest of 50 pending states',async()=>{
  let release;const blocked=new Promise(resolve=>{release=resolve;}),written=[],errors=[];
  const queue=createLatestJob(async value=>{written.push(value);if(value===0)await blocked;if(value===50)throw Error('falha');},error=>errors.push(error.message));
  queue.push(0);for(let i=1;i<=50;i++)queue.push(i);release();await queue.idle();assert.deepEqual(written,[0,50]);
  await queue.push(51);assert.deepEqual(written,[0,50,51]);assert.deepEqual(errors,['falha']);
});

test('painting and sculpting retain GPU buffers and exactly match a fresh terrain',()=>{
  let entity=createEntity('terrain',{segments:8,width:8,length:8});const object=createTerrain(entity),mesh=object.children[0];
  const geometry=mesh.geometry,material=mesh.material,position=geometry.attributes.position;
  entity={...entity,paintLayers:paintTerrain(entity,[0,0,0],{mode:'paint',layerId:entity.paintLayers[0].id,radius:2,strength:.7})};
  assert.deepEqual(updateTerrain(object,entity),{spatial:false});
  const attributes={...geometry.attributes};
  entity={...entity,heights:sculptTerrain(entity,[0,0,0],{radius:2,strength:.4})};
  assert.deepEqual(updateTerrain(object,entity),{spatial:true});
  assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);assert.equal(geometry.attributes.position,position);
  const fresh=createTerrain(entity);
  for(const [key,attribute]of Object.entries(geometry.attributes)){
    assert.equal(attribute,attributes[key]);assert.deepEqual([...attribute.array],[...fresh.children[0].geometry.attributes[key].array],key);
  }
  disposeObject(object);disposeObject(fresh);
});

test('recipe geometry is shared until the last instance and template release; materials are private',async()=>{
  const recipe={materials:{base:{color:'#ffffff'}},parts:[{shape:'box',size:[1,1,1],material:'base'}]},cache=createAssetCache();
  const record={id:'shared',revision:1,type:'recipe',url:`data:application/json,${encodeURIComponent(JSON.stringify(recipe))}`};
  const a=await cache.createInstance(record),b=await cache.createInstance(record),geometry=a.children[0].geometry;
  assert.equal(geometry,b.children[0].geometry);assert.notEqual(a.children[0].material,b.children[0].material);
  let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
  cache.prune([]);assert.equal(disposed,0);disposeObject(a);assert.equal(disposed,0);disposeObject(b);assert.equal(disposed,1);cache.destroy();assert.equal(disposed,1);
  const nestedCache=createAssetCache(),root=new THREE.Group(),c=await nestedCache.createInstance(record),d=await nestedCache.createInstance(record),shared=c.children[0].geometry;
  let nestedDisposed=0;shared.addEventListener('dispose',()=>nestedDisposed++);root.add(c,d);nestedCache.prune([]);disposeObject(root);assert.equal(nestedDisposed,1);nestedCache.destroy();assert.equal(nestedDisposed,1);
});

test('picking uses the latest sculpted heights before the GPU upload and normals match a complete rebuild',()=>{
  let entity=createEntity('terrain',{segments:32,width:16,length:16}),object=createTerrain(entity);object.updateMatrixWorld(true);
  const geometry=object.children[0].geometry,version=geometry.attributes.position.version;
  for(const [x,z]of [[0,0],[1,0],[7.8,7.8],[-7.8,-7.8],[1,-2]]){
    entity={...entity,heights:sculptTerrain(entity,[x,0,z],{radius:1,strength:3})};assert.equal(syncTerrainPicking(object,entity),true);
    const fresh=createTerrain(entity);fresh.updateMatrixWorld(true);
    const ray=new THREE.Raycaster(new THREE.Vector3(x,30,z),new THREE.Vector3(0,-1,0));
    assert.deepEqual(ray.intersectObject(object,true)[0].point.toArray(),ray.intersectObject(fresh,true)[0].point.toArray());
    assert.equal(geometry.attributes.position.version,version);
    disposeObject(fresh);
  }
  updateTerrain(object,entity);const fresh=createTerrain(entity);
  assert.deepEqual([...geometry.attributes.normal.array],[...fresh.children[0].geometry.attributes.normal.array]);
  assert.ok(geometry.attributes.position.version>version);disposeObject(object);disposeObject(fresh);
});

test('emission cache accepts an unlit asset and restores its material when illumination is removed',()=>{
  const object=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({emissive:'#112233',emissiveIntensity:.2})),look=createScene().look;
  applyBoundEmission(object,{},look);applyBoundEmission(object,{},look);
  const config={enabled:true,phase:'always',color:'#ff0000',emissionIntensity:2,emissionSlot:'base'};
  applyBoundEmission(object,{illumination:config},look);assert.equal(object.material.emissiveIntensity,2);
  applyBoundEmission(object,{},look);assert.equal(object.material.emissiveIntensity,.2);assert.equal(object.material.emissive.getHexString(),'112233');disposeObject(object);
});

test('gallery work is bounded, visible cards lead and closing cancels all queued work',async()=>{
  const scene={...createScene('Atual'),revision:1},docs=Array.from({length:200},(_,i)=>({...createScene(`Cena ${i}`),revision:1}));
  let release;const blocked=new Promise(resolve=>{release=resolve;}),started=[],saved=[],errors=[];
  const previews=createScenePreviews({current:()=>({document:scene,version:1,dirty:false}),assets:()=>[],viewport:{ready:async()=>{}},
    repository:{read:async id=>docs.find(doc=>doc.id===id),savePreview:async doc=>saved.push(doc.id)},
    renderPreview:async(doc,_assets,signal)=>{started.push(doc.id);await blocked;return signal.aborted?null:'cover';},onUpdate(){},onError:e=>errors.push(e)});
  previews.ensure(docs,{visibleIds:new Set([docs[199].id])});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(started[0],docs[199].id);assert.ok(previews.info().queued<=32);assert.ok(previews.info().backlog>100);
  previews.cancelLibrary();release();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(previews.info().queued,0);assert.equal(previews.info().backlog,0);assert.equal(previews.info().running,false);
  assert.deepEqual(saved,[]);assert.deepEqual(errors,[]);previews.dispose();
});

test('server summaries rebuild after restart, corruption and external edits at 10/50/200 scenes',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tabletop-index-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  let storage=new DocumentStorage(dir);await storage.init();const docs=[];
  for(const count of [10,50,200]){
    while(docs.length<count){const doc={...createScene(`Cena ${docs.length}`),revision:1};docs.push(doc);await storage.write('scenes',doc);}
    const [a,b]=await Promise.all([storage.list('scenes'),storage.list('scenes')]);assert.equal(a.length,count);assert.deepEqual(a,b);
  }
  storage=new DocumentStorage(dir);await storage.init();assert.equal((await storage.list('scenes')).length,200);
  const doc={...docs[0],name:'Alteração externa',revision:2};await atomicWrite(storage.file('scenes',doc.id),JSON.stringify(doc));
  assert.equal((await storage.list('scenes')).find(d=>d.id===doc.id).name,doc.name);
  await storage.writePreview('scenes',doc.id,'data:image/jpeg;base64,/9j/2Q==',2);
  assert.equal((await storage.list('scenes')).find(d=>d.id===doc.id).previewRevision,2);
  const indexFile=path.join(dir,'.summaries','scenes',`${doc.id}.json`);await writeFile(indexFile,'bad json');storage=new DocumentStorage(dir);
  assert.equal((await storage.list('scenes')).find(d=>d.id===doc.id).revision,2);assert.equal(JSON.parse(await readFile(indexFile,'utf8')).summary.name,doc.name);
  const invalid=JSON.parse(await readFile(indexFile,'utf8'));delete invalid.summary.updatedAt;await writeFile(indexFile,JSON.stringify(invalid));storage=new DocumentStorage(dir);
  const summaries=await storage.list('scenes');assert.equal(summaries.find(d=>d.id===doc.id).name,doc.name);summaries.find(d=>d.id===doc.id).name='Mutação do consumidor';
  assert.equal((await storage.list('scenes')).find(d=>d.id===doc.id).name,doc.name);
  await unlink(storage.file('scenes',doc.id));assert.equal((await storage.list('scenes')).length,199);
});
