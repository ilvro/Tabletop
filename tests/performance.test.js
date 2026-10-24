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
import { GEOMETRY_VERSION, assembleRecipeGroup, buildRecipeGeometryPayload, createAssetCache, disposeObject, ensureRecipePayload, recipeInstance } from '../src/render/asset-cache.js';
import { SURFACE_GENERATOR_VERSION, clearSurfaceTileMemoryCache, ensureTile, generateSurfaceTile } from '../src/render/surface-pixels.js';
import { createSurfaceLibrary } from '../src/render/surface-materials.js';
import { createDerivedCache } from '../src/data/derived-cache.js';
import { createWallIndex, wallJoinProfile } from '../src/authoring/structures.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { paintTerrain, sculptTerrain } from '../src/authoring/terrain.js';
import { DocumentStorage, atomicWrite } from '../server/storage.js';
import { applyBoundEmission, updateBoundLights } from '../src/render/bound-light.js';
import { createCutawayShadows } from '../src/render/cutaway-shadows.js';
import { createPortalCulling } from '../src/render/portal-culling.js';
import { isOccluder, isOccluderCandidate, makeOccluder } from '../src/render/occlusion.js';
import { createMaterialSharing } from '../src/render/material-sharing.js';
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

test('diagnostics marks decompose tile and recipe generation',()=>{
  const prev=globalThis.location;globalThis.location={search:'?diagnostics'};
  performance.clearMarks();performance.clearMeasures();
  try{
    generateSurfaceTile({texture:'wood'},32);
    const g=recipeInstance({materials:{base:{color:'#fff'}},parts:[{shape:'box',size:[1,1,1],material:'base'}]});
    disposeObject(g);
    const names=performance.getEntriesByType('measure').map(e=>e.name);
    assert.ok(names.includes('tabletop:tile'));assert.ok(names.includes('tabletop:recipe'));
  }finally{globalThis.location=prev;performance.clearMarks();performance.clearMeasures();}
});

test('ensureTile deduplicates concurrent requests, persists to derived cache and async surface library resolves identical pixels',async()=>{
  clearSurfaceTileMemoryCache();
  assert.ok(Number.isInteger(SURFACE_GENERATOR_VERSION) && SURFACE_GENERATOR_VERSION >= 1);
  // Fake IndexedDB backed by an in-memory map to verify persistence + LRU eviction.
  const stores = new Map([['surface-tiles', new Map()], ['recipe-geometries', new Map()]]);
  let reads = 0, writes = 0;
  const fakeCache = {
    async read(store, key) { reads++; return stores.get(store)?.get(key) ?? null; },
    async write(store, key, value) { writes++; stores.get(store)?.set(key, value); return true; },
  };
  const settings = { texture: 'stone', textureSeed: 17, patternDensity: 1.2 };
  const [p1, p2] = [ensureTile(settings, { priority: 1, cache: fakeCache }), ensureTile(settings, { priority: 0, cache: fakeCache })];
  const [t1, t2] = await Promise.all([p1, p2]);
  assert.equal(t1, t2);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  const direct = generateSurfaceTile(settings);
  assert.deepEqual([...t1.albedo], [...direct.albedo]);
  assert.deepEqual([...t1.details], [...direct.details]);
  assert.equal(t1.luma, direct.luma);
  // Evict in-memory LRU and verify second call hits persistent cache without regenerating.
  clearSurfaceTileMemoryCache();
  const fromDisk = await ensureTile(settings, { cache: fakeCache });
  assert.equal(reads, 2);
  assert.equal(writes, 1);
  assert.deepEqual([...fromDisk.albedo], [...direct.albedo]);
  // Verify createDerivedCache gracefully degrades when indexedDB is missing.
  const noIdb = createDerivedCache({ indexedDB: null });
  assert.equal(await noIdb.read('surface-tiles', 'k'), null);
  assert.equal(await noIdb.write('surface-tiles', 'k', { a: 1 }), false);
  // Verify async surface library fills placeholder then resolves to exact sync pixels.
  clearSurfaceTileMemoryCache();
  let updates = 0;
  const asyncLib = createSurfaceLibrary({ async: true, cache: fakeCache, onUpdate: () => updates++ });
  const syncLib = createSurfaceLibrary({ async: false });
  const matA = new THREE.MeshStandardMaterial(), matB = new THREE.MeshStandardMaterial();
  const custom = [{ texture: 'brick', textureSeed: 9 }];
  const entryA = asyncLib.acquire(custom, matA);
  await asyncLib.ready();
  const entryB = syncLib.acquire(custom, matB);
  assert.ok(updates >= 1);
  assert.deepEqual([...entryA.albedo.image.data], [...entryB.albedo.image.data]);
  assert.deepEqual([...entryA.details.image.data], [...entryB.details.image.data]);
  matA.dispose(); matB.dispose(); asyncLib.dispose(); syncLib.dispose();
});

test('createWallIndex matches full wallJoinProfile results across a 120-wall grid',()=>{
  const walls = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 10; col++) {
      walls.push(createEntity('wall', { position: [col * 4, 0, row * 4], rotation: quaternionFromYaw(0), length: 4, thickness: .2 }));
      walls.push(createEntity('wall', { position: [col * 4, 0, row * 4], rotation: quaternionFromYaw(90), length: 4, thickness: .2 }));
    }
  }
  const index = createWallIndex(walls);
  const fullIndex = { near: () => walls };
  for (const wall of walls) {
    assert.deepEqual(wallJoinProfile(wall, index), wallJoinProfile(wall, fullIndex));
  }
});

test('createCutawayShadows and updateBoundLights skip world matrix recomputation when matricesDirty is false',()=>{
  const scene = new THREE.Scene();
  const cutaway = createCutawayShadows(scene);
  const wallRecord = createEntity('wall', { position: [2, 0, 3], length: 4 });
  const wallObj = new THREE.Group();
  wallObj.position.set(2, 0, 3);
  wallObj.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  const objects = new Map([[wallRecord.id, wallObj]]);
  const records = new Map([[wallRecord.id, wallRecord]]);
  const wallsList = [{ id: wallRecord.id, object: wallObj, record: wallRecord }];
  let worldUpdates = 0;
  const origUpdate = wallObj.updateWorldMatrix.bind(wallObj);
  wallObj.updateWorldMatrix = (...args) => { worldUpdates++; return origUpdate(...args); };
  wallObj.visible = false;
  assert.equal(cutaway.update(objects, records, true, () => true, wallsList, true), true);
  assert.equal(worldUpdates, 1);
  // Steady frame with matricesDirty = false: no matrix recomputation, only visibility check.
  assert.equal(cutaway.update(objects, records, true, () => true, wallsList, false), false);
  assert.equal(worldUpdates, 1);
  wallObj.visible = true;
  assert.equal(cutaway.update(objects, records, true, () => true, wallsList, false), true);
  assert.equal(worldUpdates, 1);
  cutaway.dispose();

  // Verify updateBoundLights skips host.updateWorldMatrix when matricesDirty is false and generation/config match.
  const doc = createScene('Luzes');
  const prop = createEntity('prop', { position: [1, 2, 3], illumination: { enabled: true, type: 'point', color: '#ffcc88', intensity: 2, distance: 8, position: [0, 0.5, 0], rotation: [0, 0, 0, 1], phase: 'always', emissionSlot: 'none', emissionIntensity: 1, shadowPolicy: 'off' } });
  doc.layout.entities[prop.id] = prop;
  Object.freeze(prop.illumination);
  Object.freeze(doc.layout.entities);
  const hostObj = new THREE.Group();
  let hostMatrixUpdates = 0;
  const origHostUpdate = hostObj.updateWorldMatrix.bind(hostObj);
  hostObj.updateWorldMatrix = (...args) => { hostMatrixUpdates++; return origHostUpdate(...args); };
  const propObjects = new Map([[prop.id, hostObj]]);
  const bindings = new Map();
  updateBoundLights(doc, propObjects, bindings, 0, false, () => true, 1, () => null, true);
  assert.equal(hostMatrixUpdates, 1);
  updateBoundLights(doc, propObjects, bindings, 0.1, false, () => true, 1, () => null, false);
  assert.equal(hostMatrixUpdates, 1);
});

test('createPortalCulling builds cells and portals, culls unseen rooms and restores visibility on pause and end', async () => {
  const doc = JSON.parse(await readFile(path.resolve('public/scenes/templo-gelado.json'), 'utf8'));
  const objects = new Map();
  for (const [id, record] of Object.entries(doc.layout.entities)) {
    const group = new THREE.Group();
    if (record.transform?.position) group.position.fromArray(record.transform.position);
    if (record.transform?.rotation) group.quaternion.fromArray(record.transform.rotation);
    if (record.transform?.scale) group.scale.fromArray(record.transform.scale);
    group.updateMatrixWorld(true);
    objects.set(id, group);
  }
  const culling = createPortalCulling();
  culling.setDocument(doc, objects);
  const initialInfo = culling.info();
  assert.equal(initialInfo.cells, 24);
  assert.ok(initialInfo.portals >= 50);

  const preset = Object.values(doc.cameraPresets).find(c => c.name === 'Salão · olhos');
  const cam = new THREE.PerspectiveCamera(preset.fov, 16 / 9, 0.08, 420);
  cam.position.fromArray(preset.position);
  cam.lookAt(...preset.target);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();

  // Disabled when cutaway or roofsHidden is active
  assert.equal(culling.begin(cam, { cutaway: true }), 0);
  assert.equal(culling.begin(cam, { cutaway: false, roofsHidden: true }), 0);

  // Active in perspective indoor view with cutaway=false
  const culled = culling.begin(cam, { cutaway: false, roofsHidden: false });
  assert.ok(culled > 500, `expected > 500 culled entities in Salão · olhos, got ${culled}`);
  assert.equal(culling.info().activeCell, 'Piso — Salão do templo');
  assert.equal(culling.info().visibleCells, 4);

  // Pause restores visibility during shadow pass, resume re-applies culling, end restores all
  let hiddenCount = [...objects.values()].filter(o => !o.visible).length;
  assert.equal(hiddenCount, culled);
  culling.pause();
  assert.equal([...objects.values()].filter(o => !o.visible).length, 0);
  culling.resume();
  assert.equal([...objects.values()].filter(o => !o.visible).length, culled);
  culling.end();
  assert.equal([...objects.values()].filter(o => !o.visible).length, 0);
});

test('buildRecipeGeometryPayload and ensureRecipePayload preserve attributes byte-for-byte across all 359 catalog recipes', async () => {
  assert.equal(GEOMETRY_VERSION, 2);
  const { assets } = JSON.parse(await readFile(path.resolve('public/assets/catalog.json'), 'utf8'));
  const recipes = assets.filter(a => a.type === 'recipe');
  assert.ok(recipes.length >= 359, `expected >= 359 recipes, got ${recipes.length}`);
  const store = new Map();
  const fakeCache = {
    async read(s, k) { return store.get(`${s}:${k}`) ?? null; },
    async write(s, k, v) { store.set(`${s}:${k}`, structuredClone(v)); return true; },
  };
  let frontMeshes = 0, doubleMeshes = 0;
  for (const record of recipes) {
    const recipe = JSON.parse(await readFile(path.resolve('public' + record.url), 'utf8'));
    const syncGroup = recipeInstance(recipe, null, record.bounds, null);
    const payload = await ensureRecipePayload(recipe, { assetKey: record.id, metricBounds: record.bounds, cache: fakeCache });
    const cachedPayload = await ensureRecipePayload(recipe, { assetKey: record.id, metricBounds: record.bounds, cache: fakeCache });
    const asyncGroup = assembleRecipeGroup(recipe, cachedPayload);
    assert.equal(asyncGroup.children.length, syncGroup.children.length, `children mismatch on ${record.id}`);
    assert.deepEqual(asyncGroup.scale.toArray(), syncGroup.scale.toArray(), `scale mismatch on ${record.id}`);
    assert.deepEqual(asyncGroup.position.toArray(), syncGroup.position.toArray(), `position mismatch on ${record.id}`);
    for (let i = 0; i < syncGroup.children.length; i++) {
      const aMesh = asyncGroup.children[i];
      const bMesh = syncGroup.children[i];
      assert.equal(aMesh.material.side, bMesh.material.side);
      if (aMesh.material.side === THREE.FrontSide) frontMeshes++;
      else doubleMeshes++;
      if (aMesh.material.transparent) assert.equal(aMesh.material.forceSinglePass, true);
      const a = aMesh.geometry;
      const b = bMesh.geometry;
      for (const name of Object.keys(b.attributes)) {
        assert.ok(a.attributes[name], `missing attribute ${name} on ${record.id}`);
        assert.equal(a.attributes[name].array.byteLength, b.attributes[name].array.byteLength);
        assert.equal(Buffer.compare(Buffer.from(a.attributes[name].array.buffer), Buffer.from(b.attributes[name].array.buffer)), 0, `attribute ${name} bytes differ on ${record.id}`);
      }
      if (b.index) {
        assert.ok(a.index, `missing index on ${record.id}`);
        assert.equal(Buffer.compare(Buffer.from(a.index.array.buffer), Buffer.from(b.index.array.buffer)), 0, `index bytes differ on ${record.id}`);
      }
      assert.deepEqual(a.userData, b.userData, `userData mismatch on ${record.id}`);
    }
    disposeObject(syncGroup);
    disposeObject(asyncGroup);
    void payload;
  }
  assert.ok(frontMeshes > 1000, `expected > 1000 FrontSide meshes, got ${frontMeshes}`);
  assert.ok(doubleMeshes > 100, `expected > 100 DoubleSide meshes, got ${doubleMeshes}`);
});

test('isOccluderCandidate pre-identifies occluders, isOccluder reuses pickBounds, and transparent glass shares materials', () => {
  assert.equal(isOccluderCandidate({ kind: 'wall' }), true);
  assert.equal(isOccluderCandidate({ kind: 'prop', assetRef: { id: 'builtin-church-vault-ribs' } }), true);
  assert.equal(isOccluderCandidate({ kind: 'prop', transform: { scale: [1, 1, 1] } }, { bounds: [1, 2.2, 1] }), true);
  assert.equal(isOccluderCandidate({ kind: 'prop', transform: { scale: [1, 1, 1] } }, { bounds: [0.3, 0.25, 0.3] }), false);

  const mat = new THREE.MeshStandardMaterial();
  makeOccluder(mat);
  const keyBefore = mat.customProgramCacheKey();
  const vBefore = mat.version;
  makeOccluder(mat);
  assert.equal(mat.customProgramCacheKey(), keyBefore);
  assert.equal(mat.version, vBefore);
  mat.dispose();

  const pickBounds = new WeakMap();
  const propObj = new THREE.Group();
  const cachedBox = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 2.5, 1));
  pickBounds.set(propObj, cachedBox);
  assert.equal(isOccluder({ kind: 'prop' }, propObj, 0, pickBounds), true);

  // Transparent glass with forceSinglePass=true is now eligible for material sharing
  const sharing = createMaterialSharing();
  const root = new THREE.Group();
  const g = new THREE.BoxGeometry(1, 1, 0.02);
  const m1 = new THREE.MeshStandardMaterial({ color: '#99bbcc', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true });
  const m2 = m1.clone();
  root.add(new THREE.Mesh(g, m1), new THREE.Mesh(g, m2));
  assert.equal(sharing.begin(root), 1);
  sharing.end();
  g.dispose(); m1.dispose(); m2.dispose();
});
