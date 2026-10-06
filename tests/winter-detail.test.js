import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import * as THREE from 'three';
import {createBranchGeometry,createConiferGeometry,createTimberGeometry,createStaveGeometry} from '../src/render/botanical-primitives.js';
import {recipeInstance,disposeObject} from '../src/render/asset-cache.js';
import {createSurfaceLibrary} from '../src/render/surface-materials.js';
import {addPhysicalSnow,clearPhysicalSnow,createExposureTest,snowOccluders} from '../src/render/physical-snow.js';
import {coverageDefaults} from '../src/domain/materials.js';
import {createEntity,createScene,validateDocument,duplicateDocument} from '../src/domain/documents.js';
import {createSceneStore} from '../src/state/scene-store.js';
import {projectPresentation} from '../src/app/presentation.js';
import {proposeVegetation} from '../src/authoring/vegetation.js';
const root=new URL('../public/',import.meta.url),catalog=JSON.parse(await readFile(new URL('assets/catalog.json',root),'utf8')).assets;
const load=async id=>{const asset=catalog.find(a=>a.id===`builtin-${id}`);assert.ok(asset,id);return {asset,recipe:JSON.parse(await readFile(new URL(asset.url.slice(1),root),'utf8'))};};
const ray=(obj,origin,direction)=>{obj.updateMatrixWorld(true);return new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction)).intersectObject(obj,true);};
function closed(g) {
  const p=g.attributes.position,index=g.index,ids=new Map(),edges=new Map();let volume=0;
  const point=i=>new THREE.Vector3().fromBufferAttribute(p,i),key=v=>v.toArray().map(x=>Math.round(x*1e5)).join(',');
  for(let i=0;i<(index?.count??p.count);i+=3) {const points=[0,1,2].map(j=>point(index?index.getX(i+j):i+j)),keys=points.map(key);assert.equal(new Set(keys).size,3);assert.ok(new THREE.Vector3().subVectors(points[1],points[0]).cross(new THREE.Vector3().subVectors(points[2],points[0])).length()>1e-9);volume+=points[0].dot(points[1].clone().cross(points[2]))/6;
    for(let j=0;j<3;j++) {for(const k of keys)if(!ids.has(k))ids.set(k,ids.size);const a=ids.get(keys[j]),b=ids.get(keys[(j+1)%3]),k=[Math.min(a,b),Math.max(a,b)].join(':'),e=edges.get(k)??[0,0];e[0]++;e[1]+=a<b?1:-1;edges.set(k,e);}
  }
  assert.ok(volume>0,'outward orientation');for(const edge of edges.values())assert.deepEqual(edge,[2,0]);
}
test('curved branches, staves and chipped boards have closed solid surfaces, deterministic variation and valid limits',()=>{
  const options={points:[[0,0,0],[.4,.2,.1],[1,.65,-.15]],radius:.08,forks:3,seed:73},a=createBranchGeometry(options),b=createBranchGeometry(options),c=createBranchGeometry({...options,seed:74});
  try {closed(a);assert.deepEqual(a.attributes.position.array,b.attributes.position.array);assert.notDeepEqual(a.attributes.position.array,c.attributes.position.array);assert.ok(a.attributes.position.array.every(Number.isFinite));}finally{for(const g of [a,b,c])g.dispose();}
  for(const g of [createStaveGeometry(),createStaveGeometry({bulge:0,end:Math.PI/2}),createTimberGeometry({damage:.9})])try{closed(g);}finally{g.dispose();}
  for(const bad of [{radius:0},{forks:9},{seed:-1},{points:[[0,0,0],[0,0,0]]}])assert.throws(()=>createBranchGeometry({...options,...bad}));
  assert.throws(()=>createConiferGeometry({count:1000}));assert.throws(()=>createStaveGeometry({thickness:2}));
});
test('detailed trees fill a three dimensional canopy within triangle/batch budgets, and open crates retain an actual interior',async()=>{
  for(const id of ['dense-alpine-fir','dense-mountain-pine','forked-dead-branch','twisted-mountain-roots','winter-dry-shrub','wooden-expedition-barrel','old-open-crate','old-closed-crate','broken-timber-pile']) {
    const {asset,recipe}=await load(id),a=recipeInstance(recipe),b=recipeInstance(recipe);
    try {let triangles=0;a.traverse(m=>{if(m.isMesh){triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));assert.equal(m.geometry.attributes.normal.count,m.geometry.attributes.position.count,'complete normal buffer');assert.equal(m.geometry.attributes.uv.count,m.geometry.attributes.position.count);assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));assert.equal(m.material.wireframe,false);}});assert.ok(triangles<65000,`${id}: ${triangles}`);assert.ok(a.children.length<=4,`${id} draw calls`);assert.deepEqual(a.children[0].geometry.attributes.position.array,b.children[0].geometry.attributes.position.array);assert.ok(Math.abs(new THREE.Box3().setFromObject(a).min.y)<1e-6);
      const svg=await readFile(new URL(asset.previewUrl.slice(1),root),'utf8');assert.ok(Buffer.byteLength(svg)<100000,'compact preview');const png=Buffer.from(svg.match(/base64,([A-Za-z0-9+/=]+)/)[1],'base64');assert.equal(png.readUInt32BE(16),320);assert.equal(png.readUInt32BE(20),308);const chunks=[];for(let i=8;i<png.length;){const length=png.readUInt32BE(i);if(png.toString('ascii',i+4,i+8)==='IDAT')chunks.push(png.subarray(i+8,i+8+length));i+=length+12;}assert.equal(inflateSync(Buffer.concat(chunks)).length,(320*3+1)*308);
      if(id.startsWith('dense-')) {const needles=a.children.find(m=>m.userData.materialSlot==='green');assert.ok(needles.geometry.userData.snowProxies.length>=30);assert.ok(triangles>30000);const p=needles.geometry.attributes.position,bins=new Set();for(let i=0;i<p.count;i++)bins.add([Math.floor(p.getX(i)*3),Math.floor(p.getY(i)*3),Math.floor(p.getZ(i)*3)].join(':'));assert.ok(bins.size>300,'canopy volume');const c=recipeInstance(recipe,null,asset.bounds,931);try{assert.notDeepEqual(needles.geometry.attributes.position.array,c.children.find(m=>m.userData.materialSlot==='green').geometry.attributes.position.array);}finally{disposeObject(c);}}
      if(id==='old-open-crate') {const hits=ray(a,[0,2,0],[0,-1,0]);assert.ok(hits.length);assert.ok(hits[0].point.y<.15,'opening reaches bottom');for(const x of [-.57,.57])assert.ok(ray(a,[x,.35,2],[0,0,-1]).length,'thick sides');}
      if(id==='old-closed-crate')assert.ok(ray(a,[0,2,0],[0,-1,0])[0].point.y>.5);
      if(id==='wooden-expedition-barrel'){assert.equal(recipe.parts.filter(p=>p.shape==='stave'&&p.material==='wood').length,18);assert.ok(ray(a,[0,.5,2],[0,0,-1])[0].point.z>ray(a,[0,.04,2],[0,0,-1])[0].point.z+.04,'bulging silhouette');for(const y of [.1225,.3125,.6625,.8525])for(let i=0;i<36;i++){const angle=i*Math.PI/18+.01,x=Math.cos(angle),z=Math.sin(angle);assert.equal(ray(a,[x*2,y,z*2],[-x,0,-z])[0].object.userData.materialSlot,'metal','hoops stay outside staves');}}
    }finally{disposeObject(a);disposeObject(b);}
  }
});
test('bough snow uses bounded connected envelopes, respects slot/roof exposure and releases coats',async()=>{
  const {recipe}=await load('dense-alpine-fir'),tree=recipeInstance(recipe),library=createSurfaceLibrary(),coverage={...coverageDefaults(),snowStyle:'organic',physicalThickness:.13,slopeAngle:65,variation:0,exposedOnly:true,snowDrift:.6,snowDriftScale:2,snowWindDirection:45},record={id:'tree',kind:'prop',material:{coverage,textureSlot:'green'}};
  try {
    tree.updateMatrixWorld(true);const count=addPhysicalSnow(tree,record,library,createExposureTest(snowOccluders([tree]))).triangles;assert.ok(count>1000);assert.ok(count<18000,`snow budget: ${count}`);const coat=tree.children.find(m=>m.userData.physicalSnow);assert.ok(coat.geometry.index);assert.ok(coat.geometry.userData.snowDeposit.topFaces>100);let disposed=0;coat.geometry.addEventListener('dispose',()=>disposed++);clearPhysicalSnow(tree);assert.equal(disposed,1);assert.ok(!tree.children.some(m=>m.userData.physicalSnow));
    assert.equal(addPhysicalSnow(tree,record,library,()=>0).triangles,0,'shelter removes deposits');assert.equal(addPhysicalSnow(tree,{...record,material:{...record.material,textureSlot:'missing'}},library,()=>1).triangles,0,'slot isolation');
  }finally{disposeObject(tree);library.dispose();}
});
test('new detailed vegetation supports authoring, seeds, history, duplication and filtered projection',()=>{
  const scene=createScene(),terrain=createEntity('terrain',{width:40,length:40,segments:4});scene.layout.entities[terrain.id]=terrain;const store=createSceneStore(scene),proposal=proposeVegetation(scene,{terrainId:terrain.id,assetId:'builtin-dense-alpine-fir',count:4,seed:72},store.editVersion,catalog);assert.equal(proposal.entities.length,4);store.execute('proposal.accept',{proposal});const id=proposal.entities[0].id;store.execute('entity.update',{id,patch:{vegetationSeed:963}});validateDocument(store.document);store.undo();assert.equal(store.document.layout.entities[id].vegetationSeed,proposal.entities[0].vegetationSeed);store.redo();assert.equal(store.document.layout.entities[id].vegetationSeed,963);validateDocument(duplicateDocument(store.document));const projected=projectPresentation(store.document);validateDocument(projected);assert.equal(projected.layout.entities[id].vegetationSeed,963);assert.deepEqual(projected.cameraPresets,{});assert.deepEqual(store.document,JSON.parse(JSON.stringify(store.document)));
});
