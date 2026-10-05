import test from 'node:test';
import assert from 'node:assert/strict';
import { createScene, createEntity, validateDocument, duplicateDocument, createMapFromScene, createSceneFromMap } from '../src/domain/documents.js';
import { surfacePatch, coverageDefaults, distributionOptions } from '../src/domain/materials.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { projectPresentation } from '../src/app/presentation.js';
import { resampleTerrain, paintTerrain } from '../src/authoring/terrain.js';
import { generateSurfaceTile } from '../src/render/surface-pixels.js';
import { createMountainTerrain } from '../src/authoring/mountain.js';

test('mountain starter materializes editable terrain, automatic snow and manual trail without a live generator dependency',()=>{
  const scene=createScene(), terrain=createMountainTerrain({width:24,length:30,segments:24,position:[0,3,0]});
  scene.layout.entities[terrain.id]=terrain;validateDocument(scene);
  assert.ok(Math.max(...terrain.heights)-Math.min(...terrain.heights)>4);
  assert.equal(terrain.paintLayers[1].distribution.mode,'top');assert.ok(terrain.paintLayers[2].weights.some(w=>w>0));
  const same=createMountainTerrain({width:24,length:30,segments:24});assert.deepEqual(terrain.heights,same.heights);
  const store=createSceneStore(scene),before=structuredClone(store.document);
  store.execute('entity.update',{id:terrain.id,patch:{heights:terrain.heights.map(h=>h+.5)}});store.undo();assert.deepEqual(store.document,before);
});

test('surface composition survives history, map reuse, duplication, JSON and filtered presentation; invalid edits are atomic',()=>{
  const store=createSceneStore(createScene()), rock=createEntity('prop',{material:{...surfacePatch('rock'),coverage:coverageDefaults()}}), terrain=createEntity('terrain',{segments:4});
  terrain.paintLayers[0].texture='rock';
  terrain.paintLayers.push({id:'snow',name:'Neve',color:'#ffffff',opacity:.9,visible:true,texture:'snow',weights:Array(25).fill(0),distribution:{...distributionOptions(),mode:'top',heightEnabled:true,minHeight:3}});
  store.execute('entity.add',{entity:rock});store.execute('entity.add',{entity:terrain});
  const before=structuredClone(store.document);
  store.execute('entity.update',{id:rock.id,patch:{material:{coverage:{...rock.material.coverage,amount:.4}}}});
  store.undo();assert.deepEqual(store.document,before);store.redo();assert.equal(store.document.layout.entities[rock.id].material.coverage.amount,.4);
  for(const coverage of [{...coverageDefaults(),mode:'paint'},{...coverageDefaults(),slopeFade:0},{...coverageDefaults(),minHeight:NaN},{...coverageDefaults(),texture:'external'},{...coverageDefaults(),seed:1.5},{...coverageDefaults(),amount:2}]) {
    const snapshot=structuredClone(store.document);assert.throws(()=>store.execute('entity.update',{id:rock.id,patch:{material:{coverage}}}));assert.deepEqual(store.document,snapshot);
  }
  for(const document of [JSON.parse(JSON.stringify(store.document)),duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document)),projectPresentation(store.document)]) {
    validateDocument(document);const entities=Object.values(document.layout.entities);
    assert.equal(entities.find(e=>e.kind==='prop').material.coverage.amount,.4);assert.equal(entities.find(e=>e.kind==='terrain').paintLayers[1].distribution.minHeight,3);
  }
  store.execute('entity.update',{id:rock.id,patch:{audience:'gm'}});assert.equal(projectPresentation(store.document).layout.entities[rock.id],undefined);
  store.execute('entity.update',{id:rock.id,patch:{material:{coverage:null}}});validateDocument(store.document);
});

test('automatic terrain distribution preserves manual masks and supports returning to painting and resampling',()=>{
  const terrain=createEntity('terrain',{segments:4});terrain.paintLayers[0].distribution={...distributionOptions(),mode:'steep'};
  const masks=structuredClone(terrain.paintLayers[0].weights);
  assert.throws(()=>paintTerrain(terrain,[0,0,0],{mode:'erase',layerId:terrain.paintLayers[0].id}),/automática/);
  const larger={...terrain,...resampleTerrain(terrain,8)};
  assert.equal(larger.paintLayers[0].distribution.mode,'steep');assert.equal(larger.paintLayers[0].weights.length,81);
  terrain.paintLayers[0].distribution.mode='paint';terrain.paintLayers=paintTerrain(terrain,[0,0,0],{mode:'erase',layerId:terrain.paintLayers[0].id,radius:4});
  assert.notDeepEqual(terrain.paintLayers[0].weights,masks);
  const scene=createScene();scene.layout.entities[terrain.id]=terrain;validateDocument(scene);
  terrain.paintLayers[0].distribution.variationSize=0;assert.throws(()=>validateDocument(scene));
});

test('natural rock formations and snow have independent deterministic albedo and relief without changing masonry',()=>{
  const rock=generateSurfaceTile({texture:'rock'}), snow=generateSurfaceTile({texture:'snow'}), masonry=generateSurfaceTile({texture:'stone'});
  assert.deepEqual(generateSurfaceTile({texture:'rock'}),rock);assert.notDeepEqual(rock.albedo,masonry.albedo);assert.notDeepEqual(rock.details,snow.details);
  for(const rockPattern of ['strata','granite']) assert.notDeepEqual(generateSurfaceTile({texture:'rock',rockPattern}).details,rock.details);
  assert.notDeepEqual(generateSurfaceTile({texture:'rock',rockCracks:0}).details,rock.details);
  assert.notDeepEqual(generateSurfaceTile({texture:'rock',textureSeed:43}).albedo,rock.albedo);
  const mean=tile=>tile.albedo.reduce((sum,v,i)=>sum+(i%4===3?0:v),0)/(256*256*3);
  assert.ok(mean(snow)>mean(rock)*1.5,'snow remains substantially lighter than natural rock');
});
