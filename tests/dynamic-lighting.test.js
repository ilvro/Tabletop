import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LIGHT_PROFILES,QUALITY,ZONE_DEFAULTS,illuminationDefaults,illuminationPatch,lightPhaseActive,selectLightBudget} from '../src/domain/dynamic-lighting.js';
import {createScene,createEntity,createLight,createMapFromScene,createSceneFromMap,duplicateDocument,validateDocument} from '../src/domain/documents.js';
import {applyEnvironment,createEnvironmentFromLook} from '../src/domain/environments.js';
import {createSceneStore} from '../src/state/scene-store.js';
import {projectPresentation} from '../src/app/presentation.js';
import {createLightManager} from '../src/render/light-manager.js';
import {createLightingZones} from '../src/render/lighting-zones.js';
import {createProjectionLibrary} from '../src/render/light-projections.js';
import {applyBoundEmission,updateBoundLights} from '../src/render/bound-light.js';
import {createCutawayShadows} from '../src/render/cutaway-shadows.js';
import {focusDirectionalShadow} from '../src/render/directional-shadows.js';
import {createLightObject} from '../src/render/lighting.js';
import {disposeObject} from '../src/render/asset-cache.js';
import {readFile} from 'node:fs/promises';
import {LIGHTING_EXAMPLES,createLightingExample} from '../scripts/lighting-examples.js';

test('profiles are valid snapshots, recalculate only free parameters and respect phases',()=>{
  for(const p of LIGHT_PROFILES){const s=createScene(),e=createEntity('prop',{illumination:illuminationDefaults(p.id)});s.layout.entities[e.id]=e;validateDocument(s);}
  const a=illuminationPatch(illuminationDefaults('candle'),'intensity',33),b=illuminationPatch(a,'position-0',2),c=illuminationPatch(b,'flicker-enabled',false);
  const next=illuminationDefaults('window',{},c);assert.equal(next.intensity,33);assert.deepEqual(next.position,[2,2.2,0]);assert.equal(next.flicker.enabled,false);assert.equal(next.projection,'stained');
  const unpinned=illuminationPatch(next,'pin-intensity',false);assert.equal(illuminationDefaults('window',{},unpinned).intensity,120);
  const projected=illuminationPatch(next,'projection','bars');assert.equal(illuminationDefaults('candle',{},projected).type,'spot');
  assert.equal(lightPhaseActive({...a,phase:'night'},{daylight:{phase:'night'}}),true);assert.equal(lightPhaseActive({...a,phase:'day'},{daylight:{phase:'night'}}),false);
  assert.equal(illuminationPatch(a,'profile','none'),null);
});

test('bound sources and zones survive duplication/maps/history and inherit projection privacy',()=>{
  const s=createScene(),a=createEntity('floor',{illumination:illuminationDefaults('ritual'),lightingZone:structuredClone(ZONE_DEFAULTS)}),hidden=createEntity('prop',{audience:'gm',illumination:illuminationDefaults('torch'),lightingZone:structuredClone(ZONE_DEFAULTS)});
  for(const e of [a,hidden])s.layout.entities[e.id]=e;const store=createSceneStore(s);
  store.execute('entity.duplicate',{id:a.id});assert.equal(Object.values(store.document.layout.entities).filter(e=>e.illumination).length,3);store.undo();assert.deepEqual(store.document,s);store.redo();
  for(const doc of [duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document)),JSON.parse(JSON.stringify(store.document))]){validateDocument(doc);assert.equal(Object.values(doc.layout.entities).filter(e=>e.lightingZone).length,3);}
  const publicDoc=projectPresentation(store.document);assert.equal(publicDoc.layout.entities[hidden.id],undefined);validateDocument(publicDoc);
  const before=structuredClone(store.document),version=store.editVersion;
  for(const bad of [{intensity:Infinity},{projection:'bars',type:'point'},{mapSize:4096},{pinned:['arbitrary']},{phase:'sometimes'},{projectionSeed:.5}]){assert.throws(()=>store.execute('entity.update',{id:a.id,patch:{illumination:{...a.illumination,...bad}},snap:false}));assert.deepEqual(store.document,before);assert.equal(store.editVersion,version);}
  store.execute('entity.update',{id:a.id,patch:{locked:true}});assert.throws(()=>store.execute('entity.update',{id:a.id,patch:{illumination:null}}),/bloquead/);
});

test('zones enforce bounded counts and legacy environment snapshots remain usable',()=>{
  const s=createScene();for(let i=0;i<16;i++){const e=createEntity('floor',{lightingZone:structuredClone(ZONE_DEFAULTS)});s.layout.entities[e.id]=e;}validateDocument(s);
  const extra=createEntity('floor',{lightingZone:structuredClone(ZONE_DEFAULTS)});s.layout.entities[extra.id]=extra;assert.throws(()=>validateDocument(s),/16/);delete s.layout.entities[extra.id];
  s.look.rendering={ao:true};const preset=createEnvironmentFromLook(s);assert.equal(preset.settings.rendering.ao,true);assert.equal(applyEnvironment(createScene(),preset).look.rendering.ao,true);
  delete preset.settings.rendering;validateDocument(preset);assert.equal(applyEnvironment(s,preset).look.rendering.ao,true);
});

test('budget respects frustum eligibility, hysteresis and six-view point shadow cost',()=>{
  const source=(id,type='spot',score=1)=>({id,type,score,active:true,priority:0,shadowEnabled:true,shadowPolicy:'auto'});
  const result=selectLightBudget([source('a','point'),source('b'),source('c'),{...source('d'),active:false},{...source('e'),score:0}],{locals:3,shadowViews:2});
  assert.equal(result.shadows.has('a'),false);assert.deepEqual([...result.shadows],['b','c']);assert.equal(result.views,2);
  assert.equal(selectLightBudget([source('a','spot',1),source('b','spot',1.1)],{locals:1,shadowViews:0},new Set(['a'])).selected[0].id,'a');
  const priority={...source('p'),shadowPolicy:'priority'};assert.equal([...selectLightBudget([source('a'),priority],{locals:2,shadowViews:1}).shadows][0],'p');
});

test('runtime retains slots and shadow caches on color/intensity, invalidates bounded casters and handles type changes',()=>{
  const scene=new THREE.Scene(),manager=createLightManager(scene),camera=new THREE.PerspectiveCamera(60,1,.1,100);camera.position.set(0,4,8);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const wrapper=new THREE.Group();wrapper.updateMatrixWorld();const source=new THREE.PointLight('#ffffff',20,8),record={type:'point',distance:8,priority:10,shadowEnabled:true};
  const descriptor={id:'a',wrapper,source,record};manager.update([descriptor],camera,new THREE.Vector3());const light=manager.volumeLights()[0];light.shadow.map={dispose(){},fake:true};light.shadow.needsUpdate=false;
  source.intensity=25;source.color.set('#ff0000');manager.update([descriptor],camera,new THREE.Vector3());assert.equal(manager.volumeLights()[0],light);assert.equal(light.shadow.needsUpdate,false);
  manager.invalidate([new THREE.Box3(new THREE.Vector3(100,100,100),new THREE.Vector3(101,101,101))]);manager.update([descriptor],camera,new THREE.Vector3());assert.equal(light.shadow.needsUpdate,false);
  manager.invalidate([new THREE.Box3(new THREE.Vector3(-1,0,-1),new THREE.Vector3(1,1,1))]);manager.update([descriptor],camera,new THREE.Vector3());assert.equal(light.shadow.needsUpdate,true);
  manager.update([{...descriptor,record:{...record,type:'spot',angle:Math.PI/4,projection:'bars'}}],camera,new THREE.Vector3());assert.equal(manager.volumeLights()[0].isSpotLight,true);assert.equal(manager.info().projectionTextures,1);
  manager.update([],camera,new THREE.Vector3());assert.equal(manager.info().projectionTextures,0);manager.setQuality('economy');assert.equal(manager.quality.locals,QUALITY.economy.locals);assert.throws(()=>manager.setQuality('custom',{locals:99}));manager.dispose();assert.equal(scene.children.length,0);
});

test('emission restores materials, while source transformation and zones follow scaled hosts',()=>{
  const s=createScene(),e=createEntity('prop',{illumination:{...illuminationDefaults('lamp'),position:[1,2,3],emissionSlot:'glass'}});s.layout.entities[e.id]=e;
  const host=new THREE.Group();host.position.set(5,0,0);host.scale.set(2,2,2);const material=new THREE.MeshStandardMaterial({emissive:'#123456',emissiveIntensity:.3});material.name='glass';host.add(new THREE.Mesh(new THREE.BoxGeometry(),material));host.updateMatrixWorld();const objects=new Map([[e.id,host]]),bindings=new Map();
  const [d]=updateBoundLights(s,objects,bindings,0,true);assert.deepEqual(new THREE.Vector3().setFromMatrixPosition(d.wrapper.matrixWorld).toArray(),[7,4,6]);assert.equal(material.emissiveIntensity,1.5);
  applyBoundEmission(host,{...e,illumination:null},s.look);assert.equal(material.emissive.getHexString(),'123456');assert.equal(material.emissiveIntensity,.3);
  e.lightingZone=structuredClone(ZONE_DEFAULTS);const zones=createLightingZones();zones.update(s,objects);assert.equal(zones.uniforms.zoneCount.value,1);assert.deepEqual(new THREE.Vector3(5,4,0).applyMatrix4(new THREE.Matrix4().fromArray(zones.uniforms.zoneInverse.value,0)).toArray(),[0,0,0]);
  host.visible=false;zones.update(s,objects);assert.equal(zones.uniforms.zoneCount.value,0);disposeObject(host);
});

test('projection textures are deterministic, reference-counted and disposed after last source',()=>{
  const library=createProjectionLibrary(),a=library.acquire('stained',42,0),b=library.acquire('stained',42,0),c=library.acquire('stained',43,0);assert.equal(a,b);assert.equal(library.size,2);assert.notDeepEqual(a.texture.image.data,c.texture.image.data);
  let disposed=0;a.texture.addEventListener('dispose',()=>disposed++);library.release(a);assert.equal(disposed,0);library.release(b);assert.equal(disposed,1);library.release(c);assert.equal(library.size,0);assert.equal(library.acquire('none'),null);library.dispose();
});

test('cutaway proxies share geometry and preserve walls only in the shadow camera',()=>{
  const scene=new THREE.Scene(),caster=createCutawayShadows(scene),wall=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());wall.visible=false;
  const objects=new Map([['wall',wall]]),records=new Map([['wall',{kind:'wall'}]]);caster.update(objects,records,true,()=>true);const proxy=scene.children[0];assert.equal(proxy.geometry,wall.geometry);assert.equal(proxy.layers.test(new THREE.PerspectiveCamera().layers),false);assert.equal(proxy.visible,true);
  caster.update(objects,records,true,()=>false);assert.equal(proxy.visible,false);caster.dispose();assert.equal(scene.children.length,0);disposeObject(wall);
});

test('sun/moon shadows fit the useful view, preserve direction and ignore sub-texel movement',()=>{
  const wrapper=createLightObject(createLight({type:'directional',rotation:new THREE.Quaternion().setFromEuler(new THREE.Euler(.5,.4,0)).toArray()}),{helper:false}),camera=new THREE.PerspectiveCamera(50,1,.1,500),bounds=new THREE.Box3(new THREE.Vector3(-100,-1,-100),new THREE.Vector3(100,20,100)),target=new THREE.Vector3();camera.position.set(0,12,15);wrapper.updateMatrixWorld(true);
  const light=wrapper.userData.source,before=light.target.getWorldPosition(new THREE.Vector3()).sub(light.getWorldPosition(new THREE.Vector3())).normalize();
  assert.equal(focusDirectionalShadow(wrapper,bounds,camera,target,1024),true);const direction=light.target.getWorldPosition(new THREE.Vector3()).sub(light.getWorldPosition(new THREE.Vector3())).normalize();assert.ok(direction.distanceTo(before)<1e-8);assert.ok(light.userData.shadowFocus.radius<48);
  assert.equal(focusDirectionalShadow(wrapper,bounds,camera,target,1024),false);assert.equal(focusDirectionalShadow(wrapper,bounds,camera,new THREE.Vector3(1e-8,0,0),1024),false);
  assert.equal(focusDirectionalShadow(wrapper,bounds,camera,new THREE.Vector3(10,0,0),512),true);assert.equal(light.shadow.mapSize.x,512);disposeObject(wrapper);
});

test('four lighting studies are reproducible ordinary editable documents with local profiles and zones',async()=>{
  const {assets}=JSON.parse(await readFile('public/assets/catalog.json','utf8'));for(const item of LIGHTING_EXAMPLES){const expected=JSON.parse(await readFile(`tests/fixtures/scenes/${item.id}.json`,'utf8')),actual=createLightingExample(assets,item.style);assert.deepEqual(actual,expected);validateDocument(actual);assert.equal(Object.keys(actual.cameraPresets).length,3);assert.ok(Object.values(actual.layout.entities).some(e=>e.illumination));assert.ok(Object.values(actual.layout.entities).some(e=>e.lightingZone));assert.ok(Object.values(actual.layout.entities).every(e=>!e.locked));}
});
