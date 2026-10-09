import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {craftedBox,turnedGeometry,ellipsoidGeometry} from '../src/render/crafted-geometry.js';
import {recipeInstance,disposeObject} from '../src/render/asset-cache.js';

const read=async path=>JSON.parse(await readFile(path,'utf8'));
test('all 244 rebuilt models keep the placement contract and have complete bounded geometry',async()=>{
  const {assets}=await read('public/assets/catalog.json'),contracts=(await read('scripts/library-source/contracts.json')).assets,audit=(await read('public/assets/construction-audit.json')).assets;
  assert.equal(assets.length,244);assert.deepEqual(assets.map(a=>a.id),contracts.map(a=>a.id));assert.equal(audit.length,244);
  for(const [index,asset] of assets.entries()) {
    const original=contracts[index],recipe=await read('public'+asset.url),object=recipeInstance(recipe);
    try {
      assert.deepEqual(asset.footprint,original.footprint,asset.id);assert.equal(asset.supportHeight,original.supportHeight,asset.id);
      assert.equal(asset.geometryEdition,2);assert.equal(recipe.design.edition,2);assert.ok(recipe.design.methods.length>0,asset.id);
      assert.equal(asset.contentHash,createHash('sha256').update(JSON.stringify(recipe)).digest('hex'),asset.id);
      let triangles=0;
      object.traverse(mesh=>{if(mesh.isMesh){for(const attr of ['position','normal','uv'])assert.ok(mesh.geometry.attributes[attr].array.every(Number.isFinite),asset.id+' '+attr);triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;}});
      assert.equal(triangles,audit[index].triangles);assert.ok(triangles<65000,asset.id+' triangle budget');assert.ok(object.children.length<=8,asset.id+' batch budget');
      const bounds=new THREE.Box3().setFromObject(object);assert.ok(Math.abs(bounds.min.y)<1e-6);assert.ok(Math.abs(bounds.min.x+bounds.max.x)<1e-6);assert.ok(Math.abs(bounds.min.z+bounds.max.z)<1e-6);
      if(original.bounds)bounds.getSize(new THREE.Vector3()).toArray().forEach((v,i)=>assert.ok(Math.abs(v-original.bounds[i])<.001,asset.id+' envelope'));
    }finally{disposeObject(object);}
  }
});

test('economical chamfers are closed, outward-facing and stay in the exact dimensional envelope',()=>{
  const geometry=craftedBox({size:[2,.1,.7],bevel:.009}),p=geometry.attributes.position,edges=new Map();
  try {
    assert.equal(p.count/3,44);const key=v=>v.toArray().map(n=>n.toFixed(5)).join(',');let volume=0;
    for(let i=0;i<p.count;i+=3){const [a,b,c]=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j)),n=b.clone().sub(a).cross(c.clone().sub(a));assert.ok(n.length()>1e-8);assert.ok(n.dot(a.clone().add(b).add(c))>0);volume+=a.dot(b.clone().cross(c))/6;for(const [u,v]of[[a,b],[b,c],[c,a]]){const edge=[key(u),key(v)].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}}
    assert.ok(volume>.13&&volume<.14);assert.ok([...edges.values()].every(n=>n===2));geometry.computeBoundingBox();geometry.boundingBox.getSize(new THREE.Vector3()).toArray().forEach((v,i)=>assert.ok(Math.abs(v-[2,.1,.7][i])<1e-6));
  }finally{geometry.dispose();}
  for(const options of [{size:[1,1,1],bevel:-1},{size:[1,1,1],bevel:.6},{size:[1,NaN,1]}])assert.throws(()=>craftedBox(options));
  assert.throws(()=>turnedGeometry({profile:[[0,0],[-1,1],[0,2]]}));assert.throws(()=>ellipsoidGeometry({size:[1,0,1]}));
});

test('replacement tables retain the support plane and hollow props retain their actual cavities',async()=>{
  const {assets}=await read('public/assets/catalog.json');
  for(const id of ['desk','dining-table','bench','coffee-table','church-banquet-table','cabinet','bell','toilet','rowboat']) {
    const asset=assets.find(a=>a.id==='builtin-'+id),object=recipeInstance(await read('public'+asset.url));object.updateMatrixWorld(true);
    try {
      const hits=new THREE.Raycaster(new THREE.Vector3(0,asset.bounds[1]+1,0),new THREE.Vector3(0,-1,0)).intersectObject(object,true);
      if(['desk','dining-table','bench','coffee-table','church-banquet-table'].includes(id))assert.ok(Math.abs(hits[0].point.y-asset.supportHeight)<.001,id);
      if(id==='rowboat'){const hit=new THREE.Raycaster(new THREE.Vector3(0,asset.bounds[1]+1,asset.bounds[2]*.15),new THREE.Vector3(0,-1,0)).intersectObject(object,true)[0];assert.ok(hit.point.y<asset.bounds[1]*.3,'open hull');}
      if(id==='bell'){const hit=new THREE.Raycaster(new THREE.Vector3(asset.bounds[0]*.3,-.1,0),new THREE.Vector3(0,1,0)).intersectObject(object,true)[0];assert.ok(hit.point.y>.025,'bell interior');}
    }finally{disposeObject(object);}
  }
});

test('authored construction primitives: tapered and rounded boxes, partial and faceted lathes',()=>{
  const size=g=>{g.computeBoundingBox();return g.boundingBox.getSize(new THREE.Vector3()).toArray();};
  const taper=craftedBox({size:[.4,1,.6],taper:[.5,.25]}),p=taper.attributes.position;
  try {
    // The base keeps the stated size; only the top face is scaled.
    for(let i=0;i<p.count;i++){const top=p.getY(i)>0;assert.ok(Math.abs(Math.abs(p.getX(i))-(top?.1:.2))<1e-6);assert.ok(Math.abs(Math.abs(p.getZ(i))-(top?.075:.3))<1e-6);}
    assert.ok(p.array.every(Number.isFinite)&&taper.attributes.normal.array.every(Number.isFinite));
  }finally{taper.dispose();}
  const round=craftedBox({size:[.3,.2,.1],bevel:.03,round:true});
  try{size(round).forEach((v,i)=>assert.ok(Math.abs(v-[.3,.2,.1][i])<1e-6));}finally{round.dispose();}
  const half=turnedGeometry({profile:[[.2,0],[.2,1]],segments:8,arc:Math.PI,start:-Math.PI/2}),full=turnedGeometry({profile:[[.2,0],[.2,1]],segments:8,faceted:true});
  try {
    // A half shell opened towards +Z stays behind the XY plane on that side.
    assert.ok(size(half)[2]<.21&&size(full)[2]>.39);assert.equal(full.userData.faceted,true);assert.equal(half.userData.faceted,undefined);
  }finally{half.dispose();full.dispose();}
  for(const options of [{size:[1,1,1],taper:[1]},{size:[1,1,1],taper:[0,1]},{size:[1,1,1],taper:[1,9]}])assert.throws(()=>craftedBox(options));
  for(const options of [{profile:[[.1,0],[.1,1]],arc:0},{profile:[[.1,0],[.1,1]],arc:7},{profile:[[.1,0]]},{profile:[[.1,0],[.1,1]],segments:2}])assert.throws(()=>turnedGeometry(options));
});

test('every catalogue model is authored or a refined kit, and furniture keeps its annotated support plane',async()=>{
  const {assets}=await read('public/assets/catalog.json'),audit=(await read('public/assets/construction-audit.json')).assets;
  // The 161 original props are all dedicated models; later kits keep their own detailed sources.
  assert.deepEqual(audit.slice(0,161).filter(a=>a.reconstruction!=='model').map(a=>a.id),[]);
  assert.ok(audit.filter(a=>a.reconstruction==='model').length>=171);
  for(const id of ['workbench','medical-cart','ritual-altar','hay-bale','reception-counter','display-case','classroom-desk','autopsy-table','pallet','tool-chest','house-washer','house-counter']) {
    const asset=assets.find(a=>a.id==='builtin-'+id),recipe=await read('public'+asset.url),object=recipeInstance(recipe);object.updateMatrixWorld(true);
    try {
      // Somewhere on the footprint a surface lies on the annotated plane, and it faces up.
      const hits=[];
      for(const u of [-.3,0,.3])for(const v of [-.3,0,.3])hits.push(...new THREE.Raycaster(new THREE.Vector3(u*asset.bounds[0],asset.bounds[1]+1,v*asset.bounds[2]),new THREE.Vector3(0,-1,0)).intersectObject(object,true));
      assert.ok(hits.some(hit=>Math.abs(hit.point.y-asset.supportHeight)<.004),id+' support plane');
      assert.ok(recipe.parts.every(part=>recipe.materials[part.material]),id+' materials');
    }finally{disposeObject(object);}
  }
});

test('materials stay legible without an environment map and public slots survive',async()=>{
  const {assets}=await read('public/assets/catalog.json');
  for(const asset of assets) {
    const recipe=await read('public'+asset.url),before=await read('scripts/library-source/slots.json');
    for(const [slot,material] of Object.entries(recipe.materials))assert.ok((material.metalness??0)<=.5,asset.id+' '+slot+' metalness');
    for(const slot of before[asset.id]??[])assert.ok(recipe.materials[slot],asset.id+' keeps slot '+slot);
  }
});
