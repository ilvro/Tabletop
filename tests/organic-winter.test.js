import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRockGeometry} from '../src/render/rock-geometry.js';
import {createFloor,createTerrain} from '../src/render/scene-objects.js';
import {createEntity,createScene,duplicateDocument,createMapFromScene,createSceneFromMap,validateDocument} from '../src/domain/documents.js';
import {createSceneStore} from '../src/state/scene-store.js';
import {surfacePatch,coverageDefaults} from '../src/domain/materials.js';
import {terrainSnow} from '../src/domain/snow.js';
import {supportHeightAt} from '../src/domain/geometry.js';
import {createSurfaceLibrary} from '../src/render/surface-materials.js';
import {addPhysicalSnow,clearPhysicalSnow,createExposureTest,snowOccluders} from '../src/render/physical-snow.js';
import {disposeObject} from '../src/render/asset-cache.js';
import {prepareRockSculpt,rockBrushStamp,applyRockStamp} from '../src/render/rock-sculpt.js';
import {projectPresentation} from '../src/app/presentation.js';

const coverage=()=>({...coverageDefaults(),snowStyle:'organic',physicalThickness:.3,snowDrift:.8,snowDriftScale:1.8,snowWindDirection:30,variation:0});
function closed(geometry) {
  const p=geometry.attributes.position,index=geometry.index.array,edges=new Map();let volume=0;
  for(let i=0;i<index.length;i+=3) {
    const [a,b,c]=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index[i+j]));
    assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length()>1e-10,'no degenerate faces');volume+=a.dot(b.clone().cross(c));
    for(let j=0;j<3;j++){const a=index[i+j],b=index[i+(j+1)%3],k=a<b?`${a}:${b}`:`${b}:${a}`,e=edges.get(k)??{count:0,sign:0};e.count++;e.sign+=a<b?1:-1;edges.set(k,e);}
  }
  assert.ok([...edges.values()].every(e=>e.count===2&&e.sign===0),'closed, welded, consistent winding');assert.ok(volume>0,'outward winding');
}
test('organic formations remain closed, bounded and deterministic at extremes and support local sculpting',()=>{
  for(const form of ['organic','organic-cliff'])for(const patch of [{},{seed:65535,detail:8,irregularity:1,erosion:1,overhang:1},{seed:0,detail:2,irregularity:0}]) {
    const settings={form,size:[8,7,3.4],...patch},a=createRockGeometry(settings),b=createRockGeometry(settings);
    try {assert.deepEqual(a.attributes.position.array,b.attributes.position.array);assert.ok(a.index.count/3<48000);assert.ok(a.attributes.position.array.every(Number.isFinite));assert.ok(a.attributes.normal.array.every(Number.isFinite));closed(a);
      assert.ok(a.boundingBox.getSize(new THREE.Vector3()).distanceTo(new THREE.Vector3(...settings.size))<1e-5);assert.equal(a.boundingBox.min.y,0);
      const material=new THREE.MeshStandardMaterial({side:THREE.FrontSide}),mesh=new THREE.Mesh(a,material);mesh.updateMatrixWorld(true);
      const hit=new THREE.Raycaster(new THREE.Vector3(0,3.5,10),new THREE.Vector3(0,0,-1)).intersectObject(mesh)[0];assert.ok(hit,'front surface can be picked');
      const group=new THREE.Group();group.add(mesh);group.updateMatrixWorld(true);const state=prepareRockSculpt(group),before=Array.from(mesh.geometry.attributes.position.array);
      const record=createEntity('prop',{assetRef:{id:'builtin-organic-cliff',revision:1}});
      const stamp=rockBrushStamp(record,hit.point.toArray(),hit.face.normal.toArray(),{mode:'push',radius:1.2,strength:.3,hardness:.2});assert.ok(applyRockStamp(state,stamp));assert.notDeepEqual(Array.from(mesh.geometry.attributes.position.array),before);closed(mesh.geometry);
      material.dispose();if(mesh.geometry!==a)mesh.geometry.dispose();
    } finally {a.dispose();b.dispose();}
  }
});
test('organic deposits share vertices, only skirt boundaries, respond to wind and respect actual shelter',()=>{
  const record=createEntity('floor',{width:4,length:4,material:{...surfacePatch('wood'),coverage:coverage()}}),object=createFloor(record),library=createSurfaceLibrary();object.updateMatrixWorld(true);
  try {
    const result=addPhysicalSnow(object,record,library,()=>1),snow=object.children.find(c=>c.userData.physicalSnow),g=snow.geometry;
    assert.ok(result.triangles);assert.ok(g.index);closed(g);
    const {topFaces,boundaryEdges,vertices}=g.userData.snowDeposit;
    assert.equal(g.index.count/3,2*topFaces+2*boundaryEdges,'no internal walls between adjacent snow triangles');assert.equal(g.attributes.position.count,vertices*2);
    const top=Array.from(g.attributes.position.array.slice(0,vertices*3));assert.ok(new Set(top.filter((_,i)=>i%3===1).map(v=>v.toFixed(4))).size>8,'nonuniform deposition');
    clearPhysicalSnow(object);record.material.coverage.snowWindDirection=220;addPhysicalSnow(object,record,library,()=>1);
    assert.notDeepEqual(object.children.find(c=>c.userData.physicalSnow).geometry.attributes.position.array,g.attributes.position.array);
    clearPhysicalSnow(object);
    const roof=createFloor(createEntity('floor',{width:5,length:5,position:[0,2,0]}));roof.updateMatrixWorld(true);
    try {assert.equal(addPhysicalSnow(object,record,library,createExposureTest(snowOccluders([object,roof]))).triangles,0);}finally {disposeObject(roof);}
  } finally {disposeObject(object);library.dispose();}
});
test('organic snow terrain retains base heights and matches rendered/support surfaces after wind edits',()=>{
  const terrain=createEntity('terrain',{width:8,length:8,segments:16,material:{...surfacePatch('rock'),rockPattern:'organic',coverage:coverage()}});terrain.paintLayers=[];
  const base=[...terrain.heights],derived=terrainSnow(terrain),view=createTerrain(terrain);view.updateMatrixWorld(true);
  try {assert.deepEqual(terrain.heights,base);assert.ok(new Set(derived.heights.map(h=>h.toFixed(4))).size>20);
    for(const p of [[0,3,0],[1.3,3,-.7],[-2.5,3,1.4]]){const hit=new THREE.Raycaster(new THREE.Vector3(...p),new THREE.Vector3(0,-1,0)).intersectObject(view,true)[0];assert.ok(Math.abs(hit.point.y-supportHeightAt(terrain,p))<1e-6);}
    const changed=structuredClone(terrain);changed.material.coverage.snowWindDirection=210;assert.notDeepEqual(terrainSnow(changed).heights,derived.heights);
  }finally {disposeObject(view);}
});
test('optional organic settings persist through history/maps/projection and invalid edits are atomic',()=>{
  const scene=createScene(),rock=createEntity('prop',{assetRef:{id:'builtin-organic-cliff',revision:1},rockShape:{form:'organic-cliff',seed:389,detail:6,irregularity:.9,erosion:.8,overhang:.65},material:{...surfacePatch('rock'),rockPattern:'organic',coverage:coverage()}});scene.layout.entities[rock.id]=rock;
  const store=createSceneStore(scene),before=structuredClone(scene);store.execute('entity.update',{id:rock.id,patch:{material:{coverage:{...coverage(),snowWindDirection:180}}}});store.undo();assert.deepEqual(store.document,before);store.redo();
  for(const doc of [JSON.parse(JSON.stringify(store.document)),duplicateDocument(store.document),createSceneFromMap(createMapFromScene(store.document)),projectPresentation(store.document)]) {validateDocument(doc);const e=Object.values(doc.layout.entities)[0];assert.equal(e.rockShape.form,'organic-cliff');assert.equal(e.material.coverage.snowWindDirection,180);}
  for(const patch of [{snowStyle:'simulation'},{snowDrift:2},{snowDriftScale:0},{snowWindDirection:Infinity},{texture:'grass'}]) {
    const before=structuredClone(store.document);assert.throws(()=>store.execute('entity.update',{id:rock.id,patch:{material:{coverage:{...coverage(),...patch}}}}));assert.deepEqual(store.document,before);
  }
});
