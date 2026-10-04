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
