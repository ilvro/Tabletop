import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createScene, createEntity, validateDocument, duplicateDocument, createMapFromScene, createSceneFromMap } from '../src/domain/documents.js';
import { SURFACE_MATERIALS, surfacePatch, LOCAL_EFFECT_DEFAULTS, smokeDefaults } from '../src/domain/materials.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { projectPresentation } from '../src/app/presentation.js';
import { createSurfaceLibrary, applySurfaceTextures, generateSurfaceAtlas } from '../src/render/surface-materials.js';
import { createLocalEffect, updateLocalEffect } from '../src/render/local-effects.js';
import { createTerrain, applyMaterialOverrides } from '../src/render/scene-objects.js';
import { disposeObject } from '../src/render/asset-cache.js';
import { paintTerrain, resampleTerrain } from '../src/authoring/terrain.js';

test('surface edits are atomic, undoable and survive map conversion/duplication/public filtering', () => {
  const store=createSceneStore(createScene()), floor=createEntity('floor'), fire=createEntity('prop',{localEffect:LOCAL_EFFECT_DEFAULTS}), secret=createEntity('prop',{audience:'gm',localEffect:smokeDefaults()});
  for(const entity of [floor,fire,secret]) store.execute('entity.add',{entity});
  const before=structuredClone(store.document);
  for(const preset of SURFACE_MATERIALS) { store.execute('entity.update',{id:floor.id,patch:{material:surfacePatch(preset.id)}}); validateDocument(store.document); store.undo(); assert.deepEqual(store.document,before); }
  store.execute('entity.update',{id:floor.id,patch:{material:surfacePatch('wood')}});
  store.execute('entity.update',{id:fire.id,patch:{localEffect:{speed:2}}}); assert.equal(store.document.layout.entities[fire.id].localEffect.count,96);
  for(const patch of [{material:{texture:'http://example.com/file'}},{material:{textureSize:0}},{material:{relief:1}},{localEffect:{count:1.5}},{localEffect:{size:[1,0,1]}},{localEffect:{seed:-1}},{localEffect:{speed:NaN}}]) {
    const doc=structuredClone(store.document); assert.throws(()=>store.execute('entity.update',{id:fire.id,patch})); assert.deepEqual(store.document,doc);
  }
  for(const scene of [duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document))]) {
    validateDocument(scene); assert.ok(Object.values(scene.layout.entities).some(e=>e.material.texture==='wood')); assert.ok(Object.values(scene.layout.entities).some(e=>e.localEffect?.speed===2));
  }
  const publicDoc=projectPresentation(store.document); validateDocument(publicDoc); assert.equal(publicDoc.layout.entities[secret.id],undefined); assert.deepEqual(publicDoc.layout.entities[fire.id].localEffect,store.document.layout.entities[fire.id].localEffect);
});

test('local emitters have validated aggregate and per-emitter resource limits', () => {
  const scene=createScene();
  for(let i=0;i<8;i++) { const e=createEntity('prop',{localEffect:{...LOCAL_EFFECT_DEFAULTS,count:512}}); scene.layout.entities[e.id]=e; }
  validateDocument(scene);
  const extra=createEntity('prop',{localEffect:{...LOCAL_EFFECT_DEFAULTS,count:1}}); scene.layout.entities[extra.id]=extra; assert.throws(()=>validateDocument(scene),/4096/);
  extra.localEffect.enabled=false; validateDocument(scene);
});

test('terrain texture painting preserves masks, ordering, resampling and old color-only documents', () => {
  const scene=createScene(), terrain=createEntity('terrain',{segments:4}); scene.layout.entities[terrain.id]=terrain; validateDocument(scene);
  terrain.paintLayers[0].texture='grass'; terrain.paintLayers[0].textureSize=1; terrain.paintLayers[0].color='#ffffff';
  terrain.paintLayers.push({id:'mud-layer',name:'Lama',texture:'mud',textureSize:2,color:'#ffffff',opacity:.8,visible:true,weights:Array(25).fill(0)});
  terrain.paintLayers=paintTerrain(terrain,[0,0,0],{mode:'paint',layerId:'mud-layer',radius:4,strength:1}); validateDocument(scene);
  const view=createTerrain(terrain), library=createSurfaceLibrary();
  try { applySurfaceTextures(view,terrain,library); const mesh=view.children[0]; assert.ok(mesh.geometry.attributes.surfaceMaskA.array.some(v=>v>0)); assert.deepEqual(mesh.material.userData.surface.layers,['grass','mud']); assert.equal(mesh.material.vertexColors,false); }
  finally {disposeObject(view);library.dispose();}
  Object.assign(terrain,resampleTerrain(terrain,8)); validateDocument(scene); assert.equal(terrain.paintLayers[1].weights.length,81); assert.equal(terrain.paintLayers[1].texture,'mud');
});

test('procedural atlases are distinct and shared only within a viewport, with slot isolation and explicit disposal', () => {
  const atlas=generateSurfaceAtlas(); assert.equal(atlas.albedo.length,256*256*8*4); assert.notDeepEqual(atlas.albedo.slice(0,256*256*4),atlas.albedo.slice(256*256*4,256*256*8));
  const library=createSurfaceLibrary(), group=new THREE.Group();
  for(const slot of ['wood','metal']) { const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'#eeeeee',roughness:.22,metalness:.9})); mesh.userData.materialSlot=slot; group.add(mesh); }
  const other=group.children[0].material.clone(), prop=createEntity('prop',{material:{...surfacePatch('wood'),textureSlot:'wood'}});
  try { applyMaterialOverrides(group,prop.material,undefined,true); applySurfaceTextures(group,prop,library); assert.equal(group.children[1].material.roughness,.22); assert.equal(group.children[1].material.metalness,.9); assert.equal(group.children[0].material.userData.surface.texture,'wood'); assert.equal(group.children[1].material.userData.surface,undefined); assert.equal(other.userData.surface,undefined);
    const named=[new THREE.MeshStandardMaterial({roughness:.25}),new THREE.MeshStandardMaterial({roughness:.3})]; named[0].name='wood'; named[1].name='metal';
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(),named); mesh.userData.materialSlot='base';
    applyMaterialOverrides(mesh,prop.material,{base:{emissiveIntensity:3}},true); assert.equal(named[1].roughness,.3); assert.equal(named[0].emissiveIntensity,3); assert.equal(named[1].emissiveIntensity,3); disposeObject(mesh);
    assert.equal(library.get(),library.get()); let disposed=0; library.get().albedo.addEventListener('dispose',()=>disposed++); library.get().details.addEventListener('dispose',()=>disposed++); disposeObject(group); assert.equal(disposed,0); library.dispose(); assert.equal(disposed,2);
  } finally {other.dispose();library.dispose();}
});

test('local fire/smoke use deterministic quads, local transforms, a real fire light and local quality/pause', () => {
  const first=createLocalEffect(LOCAL_EFFECT_DEFAULTS), second=createLocalEffect(LOCAL_EFFECT_DEFAULTS), smoke=createLocalEffect(smokeDefaults());
  try { const a=first.userData.localEffect,b=second.userData.localEffect; assert.deepEqual(a.particles.geometry.attributes.effectSeed.array,b.particles.geometry.attributes.effectSeed.array); assert.equal(a.particles.geometry.instanceCount,96); assert.ok(a.light.isPointLight); assert.equal(smoke.userData.localEffect.light,undefined);
    assert.equal(updateLocalEffect(first,1,true,false),true); assert.equal(updateLocalEffect(first,1,true,true),false); assert.equal(a.particles.material.uniforms.time.value,1);
    updateLocalEffect(first,2,false,false); assert.equal(a.particles.visible,false); assert.equal(a.light.intensity,LOCAL_EFFECT_DEFAULTS.lightIntensity);
    first.visible=false; assert.equal(updateLocalEffect(first,2,true,false),false);
    let disposed=0; a.particles.geometry.addEventListener('dispose',()=>disposed++); a.particles.material.addEventListener('dispose',()=>disposed++); disposeObject(first); assert.equal(disposed,2);
  } finally {[first,second,smoke].forEach(o=>disposeObject(o));}
});

test('custom texture parameters validate atomically and persist through history, terrain resampling and presentation', () => {
  const store=createSceneStore(createScene()), floor=createEntity('floor'), terrain=createEntity('terrain',{segments:4});
  store.execute('entity.add',{entity:floor}); store.execute('entity.add',{entity:terrain});
  const style={...surfacePatch('wood'),textureColor:'#437c65',textureColorMode:'replace',textureBrightness:.6,textureContrast:1.2,textureSaturation:.8,textureRotation:45,textureSeed:123,woodPattern:'parquet',woodBoards:8,woodDirection:'vertical',woodGap:.08,woodGrain:.8};
  store.execute('entity.update',{id:floor.id,patch:{material:style}}); const edited=structuredClone(store.document);
  store.undo(); assert.equal(store.document.layout.entities[floor.id].material.texture,undefined); store.redo(); assert.deepEqual(store.document,edited);
  for(const material of [{woodBoards:1.5},{woodBoards:33},{woodDirection:'diagonal'},{metalPattern:'mirror'},{metalWear:1.1},{textureColor:'red'},{textureColorMode:'hsl'},{textureBrightness:NaN},{textureContrast:-1},{textureSaturation:3},{textureRotation:361},{textureSeed:1.5},{patternDensity:0},{woodGap:.2},{woodGrain:2}]) {
    assert.throws(()=>store.execute('entity.update',{id:floor.id,patch:{material}})); assert.deepEqual(store.document,edited);
  }
  const {color,roughness,metalness,relief,...layerStyle}=style;
  store.execute('entity.update',{id:terrain.id,patch:{paintLayers:terrain.paintLayers.map(layer=>({...layer,...layerStyle,color:'#ffffff'}))}});
  const painted=store.document.layout.entities[terrain.id];
  const resized=resampleTerrain(painted,8); assert.equal(resized.paintLayers[0].woodBoards,8); assert.equal(resized.paintLayers[0].textureColor,'#437c65'); assert.equal(resized.paintLayers[0].weights.length,81);
  for(const scene of [JSON.parse(JSON.stringify(store.document)),duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document)),projectPresentation(store.document)]) {
    validateDocument(scene); assert.ok(Object.values(scene.layout.entities).some(e=>e.material.woodBoards===8&&e.material.textureColor==='#437c65'));
    assert.ok(Object.values(scene.layout.entities).some(e=>e.paintLayers?.[0].woodPattern==='parquet'));
  }
});

test('wood and metal variants generate deterministic independent patterns while color and direction reuse pixels', async () => {
  const {generateSurfaceTile,surfaceStyleKey}=await import('../src/render/surface-pixels.js');
  const wood=generateSurfaceTile({texture:'wood'});
  for(const patch of [{woodBoards:9},{woodGap:.1},{woodGrain:0},{woodPattern:'grain'},{woodPattern:'parquet'},{textureSeed:12},{patternDensity:2}]) {
    assert.notDeepEqual(generateSurfaceTile({texture:'wood',...patch}).albedo,wood.albedo,JSON.stringify(patch));
  }
  assert.deepEqual(generateSurfaceTile(surfacePatch('wood')),wood);
  assert.deepEqual(generateSurfaceTile({texture:'wood',woodDirection:'vertical',textureColor:'#225544',textureBrightness:.3}),wood);
  assert.equal(surfaceStyleKey({texture:'wood',woodDirection:'vertical'}),surfaceStyleKey({texture:'wood'}));
  const metal=generateSurfaceTile({texture:'metal'});
  for(const metalPattern of ['smooth','diamond','corrugated','rusted']) assert.notDeepEqual(generateSurfaceTile({texture:'metal',metalPattern}).details,metal.details);
  const rust=generateSurfaceTile({texture:'metal',metalPattern:'rusted',metalWear:1}); assert.ok(rust.details.some((v,i)=>i%4===2&&v<255));
  assert.deepEqual(generateSurfaceTile({texture:'metal',metalPattern:'diamond',textureSeed:42}),generateSurfaceTile({texture:'metal',metalPattern:'diamond',textureSeed:42}));
});

test('custom atlases share identical variants, pack nine styles and release after the last material is disposed', () => {
  const library=createSurfaceLibrary(), first=new THREE.MeshStandardMaterial(), second=new THREE.MeshStandardMaterial();
  const settings=[{texture:'wood',woodBoards:8},{texture:'metal',metalPattern:'diamond'}];
  const a=library.acquire(settings,first), b=library.acquire([...settings].reverse(),second);
  assert.equal(a.albedo,b.albedo); assert.equal(a.index(settings[0]),b.index(settings[0])); assert.equal(library.variantCount,1);
  let disposed=0; a.albedo.addEventListener('dispose',()=>disposed++); a.details.addEventListener('dispose',()=>disposed++);
  first.dispose(); assert.equal(disposed,0); second.dispose(); assert.equal(disposed,2); assert.equal(library.variantCount,0);
  const material=new THREE.MeshStandardMaterial(), nine=Array.from({length:9},(_,i)=>({texture:'wood',woodBoards:i+1}));
  const packed=library.acquire(nine,material); assert.equal(packed.albedo.image.width,768); assert.equal(packed.albedo.image.height,768); assert.equal(new Set(nine.map(packed.index)).size,9);
  packed.albedo.addEventListener('dispose',()=>disposed++); library.dispose(); assert.equal(disposed,3); material.dispose(); assert.equal(disposed,3);
  for(let i=1;i<=20;i++) {const m=new THREE.MeshStandardMaterial();library.acquire([{texture:'wood',woodBoards:i}],m);m.dispose();assert.equal(library.variantCount,0);}
  library.dispose();
});
