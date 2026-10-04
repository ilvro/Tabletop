import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createScene, createEntity, createLight, createLevel, createMapFromScene, createSceneFromMap, duplicateDocument, validateDocument } from '../src/domain/documents.js';
import { ENVIRONMENTS, applyEnvironment, createEnvironmentFromLook, primaryLight, environmentDiff } from '../src/domain/environments.js';
import { BINDING_DEFAULTS, WEATHER_DEFAULTS, colorToHSV, hsvToColor, environmentBindingActive } from '../src/domain/lighting.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { projectPresentation } from '../src/app/presentation.js';
import { createWeatherGeometry, applyEnvironmentMaterials, materialSlots, createAtmosphere } from '../src/render/atmosphere.js';
import { createWall, createWindow, applyMaterialOverrides } from '../src/render/scene-objects.js';
import { disposeObject } from '../src/render/asset-cache.js';

test('HSV round trips RGB including greys, hue boundaries and saturated colors', () => {
  for (const color of ['#000000','#ffffff','#808080','#f68a41','#0010ff','#20c479','#ff0000']) assert.equal(hsvToColor(colorToHSV(color)),color);
  assert.equal(hsvToColor({hue:360,saturation:1,value:1}),'#ff0000');
});

test('all builtin environments are independent valid snapshots preserving geometry, cameras and local overrides', () => {
  const scene = createScene(), prop = createEntity('prop'), light = createLight({intensity:42});
  scene.layout.entities[prop.id]=prop; scene.look.lights[light.id]=light;
  scene.look.materialAdjustments[prop.id]={base:{color:'#aabbcc'}};
  scene.look.environmentBindings={[prop.id]:{...BINDING_DEFAULTS}};
  const before=structuredClone(scene);
  for(const preset of ENVIRONMENTS) {
    const next=applyEnvironment(scene,preset.id); validateDocument(next);
    assert.deepEqual(next.layout,scene.layout); assert.deepEqual(next.cameraPresets,scene.cameraPresets);
    assert.deepEqual(next.look.lights[light.id],light); assert.deepEqual(next.look.materialAdjustments,scene.look.materialAdjustments);
    assert.deepEqual(next.look.environmentBindings,scene.look.environmentBindings);
    assert.equal(environmentDiff(scene,next).localLights,1);
    assert.ok(primaryLight(next.look)); assert.deepEqual(scene,before);
  }
  const night=applyEnvironment(scene,'moonlight'); assert.equal(night.look.daylight.phase,'night');
  const snapshot=createEnvironmentFromLook(night,'Minha noite'); validateDocument(snapshot);
  assert.equal(snapshot.settings.keyLight.id,undefined); assert.equal(snapshot.layout,undefined);
  snapshot.settings.keyLight.intensity=3; assert.notEqual(primaryLight(night.look).intensity,3);
  const applied=applyEnvironment(scene,snapshot); snapshot.settings.sky.topColor='#ff0000'; assert.notEqual(applied.look.sky.topColor,'#ff0000');
  const copy=duplicateDocument(snapshot); assert.notEqual(copy.id,snapshot.id); assert.deepEqual(copy.settings,snapshot.settings);
});

test('principal light controls use one history entry, enforce locks and Kelvin/color rules', () => {
  const store=createSceneStore(createScene()); store.execute('environment.key.update',{patch:{temperature:3000}});
  const light=primaryLight(store.document.look), before=structuredClone(store.document);
  store.execute('environment.key.update',{patch:{color:'#00ff00'}}); assert.equal(primaryLight(store.document.look).temperature,null);
  store.undo(); assert.deepEqual(store.document,before); store.redo();
  store.execute('light.update',{id:light.id,patch:{locked:true}});
  const locked=structuredClone(store.document); assert.throws(()=>store.execute('environment.apply',{presetId:'moonlight'}),/Desbloqueie/); assert.deepEqual(store.document,locked);
});

test('bindings survive duplication/conversion/history and secret bindings are omitted from public projection', () => {
  const store=createSceneStore(createScene()), level=createLevel(), prop=createEntity('prop',{levelId:level.id}), secret=createEntity('prop',{audience:'gm'}), light=createLight({levelId:level.id});
  store.execute('level.add',{level}); store.execute('entity.add',{entity:prop}); store.execute('entity.add',{entity:secret}); store.execute('light.add',{light});
  for(const target of [prop,secret,light]) store.execute('environment.binding.update',{id:target.id,binding:{...BINDING_DEFAULTS}});
  const before=structuredClone(store.document); store.execute('entity.duplicate',{id:prop.id});
  assert.equal(Object.keys(store.document.look.environmentBindings).length,4); store.undo(); assert.deepEqual(store.document,before); store.redo();
  store.execute('level.duplicate',{id:level.id});
  assert.equal(Object.keys(store.document.look.environmentBindings).length,7);
  for(const scene of [duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document))]) { validateDocument(scene); assert.equal(Object.keys(scene.look.environmentBindings).length,7); }
  const projected=projectPresentation(store.document); assert.equal(projected.look.environmentBindings[secret.id],undefined); validateDocument(projected);
  store.execute('light.remove',{id:light.id}); assert.equal(store.document.look.environmentBindings[light.id],undefined);
  store.execute('entity.remove',{id:prop.id}); assert.equal(store.document.look.environmentBindings[prop.id],undefined);
});

test('bindings gate light phases and tint only a named material instance', () => {
  const scene=applyEnvironment(createScene(),'moonlight'), prop=createEntity('prop'), object=new THREE.Group();
  for(const name of ['windows','walls']) { const material=new THREE.MeshStandardMaterial(); material.name=name; object.add(new THREE.Mesh(new THREE.BoxGeometry(),material)); }
  scene.look.environmentBindings={[prop.id]:{...BINDING_DEFAULTS,slot:'windows'}};
  try {
    assert.deepEqual(materialSlots(object),['walls','windows']); assert.equal(applyEnvironmentMaterials(object,prop,scene.look),1);
    assert.equal(object.children[0].material.emissive.getHexString(),'ffc86d'); assert.equal(object.children[1].material.emissive.getHex(),0);
    applyMaterialOverrides(object,undefined,{base:{emissive:'#aa0033',emissiveIntensity:3}}); assert.equal(object.children[0].material.emissiveIntensity,3);
    assert.equal(environmentBindingActive(scene.look,{enabled:true,phase:'night'}),true);
    assert.equal(environmentBindingActive(scene.look,{enabled:true,phase:'day'}),false);
    assert.equal(environmentBindingActive(scene.look,{enabled:false,phase:'always'}),false);
  } finally { disposeObject(object); }
});

test('automatic night windows emit from glass only, and individual disabling takes precedence', () => {
  const scene=applyEnvironment(createScene(),'moonlight'), wall=createEntity('wall'), window=createEntity('window',{wallId:wall.id,style:'glass'});
  scene.layout.entities[wall.id]=wall; scene.layout.entities[window.id]=window;
  const object=createWindow(window,wall); try {
    assert.ok(applyEnvironmentMaterials(object,window,scene.look)>0);
    object.traverse(child=>{ if(child.isMesh && child.userData.materialSlot!=='base') assert.equal(child.material.emissive.getHex(),0); });
    scene.look.environmentBindings={[window.id]:{...BINDING_DEFAULTS,enabled:false}}; assert.equal(applyEnvironmentMaterials(object,window,scene.look),0);
  } finally { disposeObject(object); }
});

test('weather geometry is bounded, deterministic, paired for rain and disposed with the atmosphere', () => {
  const config={...WEATHER_DEFAULTS,type:'rain',count:12,seed:42}, a=createWeatherGeometry(config), b=createWeatherGeometry(config), c=createWeatherGeometry({...config,seed:3});
  try {
    assert.deepEqual(a.attributes.position.array,b.attributes.position.array); assert.notDeepEqual(a.attributes.position.array,c.attributes.position.array);
    assert.equal(a.attributes.position.count,24); assert.ok([...a.attributes.position.array].every(v=>v>=0 && v<1));
    for(let i=0;i<24;i+=2) assert.deepEqual([...a.attributes.position.array.slice(i*3,i*3+3)],[...a.attributes.position.array.slice((i+1)*3,(i+1)*3+3)]);
  } finally { a.dispose();b.dispose();c.dispose(); }
  const runtime=new THREE.Scene(), atmosphere=createAtmosphere(runtime), look=applyEnvironment(createScene(),'rain').look;
  atmosphere.configure(look,primaryLight(look)); assert.equal(runtime.children.length,2);
  assert.equal(atmosphere.update(new THREE.PerspectiveCamera(),3,false,600),true);
  assert.equal(atmosphere.update(new THREE.PerspectiveCamera(),3,true,600),false);
  atmosphere.setEnabled(false); assert.equal(atmosphere.info().particles,0); assert.equal(atmosphere.info().sky,true);
  atmosphere.configure({},null); assert.equal(runtime.children.length,0); atmosphere.dispose();
});

test('invalid sky, weather and binding data is rejected atomically', () => {
  const store=createSceneStore(applyEnvironment(createScene(),'rain')), before=structuredClone(store.document), version=store.editVersion;
  for(const patch of [{weather:{count:3001}},{weather:{size:[0,1,1]}},{sky:{seed:1.2}},{daylight:{exposure:0}},{nightWindows:{intensity:21}}]) {
    assert.throws(()=>store.execute('look.update',{patch})); assert.deepEqual(store.document,before); assert.equal(store.editVersion,version);
  }
  const preset=createEnvironmentFromLook(store.document); preset.settings.keyLight.groupId='secret'; assert.throws(()=>validateDocument(preset));
});


test('capturing a legacy look preserves manual color and an absent sky without inventing Kelvin', () => {
  const scene=createScene(), preset=createEnvironmentFromLook(scene);
  assert.equal(preset.settings.keyLight.temperature,null); assert.equal(preset.settings.keyLight.color,primaryLight(scene.look).color);
  assert.equal(preset.settings.sky.enabled,false); validateDocument(preset);
});


test('environment documents cannot replace the editing scene or a save receipt', () => {
  const store=createSceneStore(createScene()), preset=createEnvironmentFromLook(store.document);
  store.execute('entity.add',{entity:createEntity('floor')});
  const before=structuredClone(store.document), version=store.editVersion;
  assert.throws(()=>createSceneStore(preset),/Ambientes/);
  assert.throws(()=>store.replace(preset),/Ambientes/);
  preset.id=store.document.id; assert.throws(()=>store.markSaved(preset,version),/outro tipo/);
  assert.deepEqual(store.document,before);assert.equal(store.editVersion,version);assert.equal(store.canUndo,true);
});
