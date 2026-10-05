import * as THREE from 'three';
import {snowDepth,snowWeight,snowShapeOptions} from '../domain/snow.js';

// A connected top and bottom plus boundary skirts, rather than eight triangles per source face.
export const SNOW_DEPOSIT_FACES=12000;
export function createSnowDeposit(meshes,coverage,exposure,inverseWorld,slot='base') {
  const points=[],faces=[],normals=[],welded=new Map();
  const key=p=>p.map(v=>Math.round(v*1e5)).join(':');
  const insert=p=>{const k=key(p);let id=welded.get(k);if(id===undefined){id=points.length;points.push(p);normals.push(new THREE.Vector3());welded.set(k,id);}return id;};
  // Weld even non-indexed recipe batches, in world space. Normals are accumulated before
  // slope filtering so a shared vertex has one deposit depth on both neighbouring faces.
  for(const mesh of meshes) {
    const g=mesh.geometry,p=g.attributes.position,index=g.index,count=index?.count??p.count;
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const slots=materials.map(m=>m.name||mesh.userData.materialSlot||'base');
    if(slot!=='base'&&!slots.includes(slot))continue;
    for(let i=0;i<count;i+=3) {
      if(slot!=='base'&&materials.length>1){const group=g.groups.find(t=>i>=t.start&&i<t.start+t.count);if(group&&slots[group.materialIndex]!==slot)continue;}
      const ps=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
      const ids=ps.map(p=>insert(p.toArray())),n=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0]));
      if(n.lengthSq()<1e-16)continue;
      ids.forEach(id=>normals[id].add(n));faces.push(ids);
    }
  }
  normals.forEach(n=>n.normalize());
  const neighbours=Array.from({length:points.length},()=>new Set());
  for(const ids of faces)for(let i=0;i<3;i++){neighbours[ids[i]].add(ids[(i+1)%3]);neighbours[ids[(i+1)%3]].add(ids[i]);}
  // Deposition responds to the broad supporting slope, not every chip in the rock.
  for(let pass=0;pass<2;pass++) {
    const next=normals.map((n,i)=>{const a=n.clone().multiplyScalar(2);for(const j of neighbours[i])a.add(normals[j]);return a.normalize();});
    next.forEach((n,i)=>normals[i].copy(n));
  }
  let selected=[];let longest=0;
  const normal=ids=>new THREE.Vector3(...points[ids[1]]).sub(new THREE.Vector3(...points[ids[0]])).cross(new THREE.Vector3(...points[ids[2]]).sub(new THREE.Vector3(...points[ids[0]]))).normalize();
  const exposed=p=>coverage.exposedOnly===false?1:exposure(p);
  for(const ids of faces) {
    const n=normal(ids);if(n.y<=.08)continue;
    const center=[0,1,2].map(axis=>ids.reduce((sum,i)=>sum+points[i][axis],0)/3);
    const slope=ids.reduce((sum,id)=>sum+normals[id].y,0)/3;
    if(snowWeight(center,slope,coverage)<.12||!exposed(center))continue;
    selected.push(ids);
    for(let i=0;i<3;i++)longest=Math.max(longest,new THREE.Vector3(...points[ids[i]]).distanceTo(new THREE.Vector3(...points[ids[(i+1)%3]])));
  }
  // Tiny isolated facets produce white triangular flecks rather than snow masses.
  // Keep substantial connected patches; the material still supplies powder-scale detail.
  const faceLinks=Array.from({length:selected.length},()=>[]),owner=new Map();
  selected.forEach((ids,i)=>{for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],k=a<b?`${a}:${b}`:`${b}:${a}`;if(owner.has(k)){const other=owner.get(k);faceLinks[i].push(other);faceLinks[other].push(i);}else owner.set(k,i);}});
  const seen=new Set(),keep=[];
  for(let i=0;i<selected.length;i++)if(!seen.has(i)) {
    const patch=[],stack=[i];let area=0;seen.add(i);
    while(stack.length){const j=stack.pop();patch.push(selected[j]);const [a,b,c]=selected[j].map(id=>new THREE.Vector3(...points[id]));area+=b.sub(a).cross(c.sub(a)).length()/2;for(const k of faceLinks[j])if(!seen.has(k)){seen.add(k);stack.push(k);}}
    if(patch.length>=6||area>coverage.physicalThickness**2*2)keep.push(...patch);
  }
  selected=keep;
  // Do not truncate a large mesh into arbitrary islands; omit refinement when over budget.
  // Source meshes themselves are bounded by the rock/sculpt limits.
  for(let level=0;level<2&&longest>.35&&selected.length*4<=SNOW_DEPOSIT_FACES;level++) {
    const edges=new Map();const midpoint=(a,b)=>{
      const k=a<b?`${a}:${b}`:`${b}:${a}`;if(edges.has(k))return edges.get(k);
      const p=points[a].map((v,i)=>(v+points[b][i])/2),id=insert(p);
      normals[id].copy(normals[a]).add(normals[b]).normalize();edges.set(k,id);return id;
    };
    selected=selected.flatMap(([a,b,c])=>{const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);return [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]];});longest/=2;
  }
  if(!selected.length)return null;
  const used=[...new Set(selected.flat())],remap=new Map(used.map((v,i)=>[v,i])),upper=[],lower=[],indices=[],boundary=new Map();
  const boundaryIds=new Set(),edgeFaces=new Map(),patchNeighbours=new Map(used.map(id=>[id,new Set()]));
  for(const ids of selected)for(let i=0;i<3;i++){const a=ids[i],b=ids[(i+1)%3],k=a<b?`${a}:${b}`:`${b}:${a}`;patchNeighbours.get(a).add(b);patchNeighbours.get(b).add(a);if(edgeFaces.has(k))edgeFaces.delete(k);else edgeFaces.set(k,[a,b]);}
  for(const edge of edgeFaces.values())edge.forEach(id=>boundaryIds.add(id));
  let feather=new Map(used.map(id=>[id,boundaryIds.has(id)?0:1]));
  for(let pass=0;pass<2;pass++)feather=new Map(used.map(id=>[id,boundaryIds.has(id)?0:(feather.get(id)+[...patchNeighbours.get(id)].reduce((sum,j)=>sum+feather.get(j),0))/(patchNeighbours.get(id).size+1)]));
  for(const id of used) {
    const p=points[id],n=normals[id].toArray();
    const depth=Math.max(.002,snowDepth(p,n,coverage)*exposed(p)*feather.get(id));
    // Lift slightly to prevent z fighting, with a shared depth at every welded vertex.
    lower.push(...new THREE.Vector3(p[0],p[1]+.003,p[2]).applyMatrix4(inverseWorld).toArray());
    upper.push(...new THREE.Vector3(p[0],p[1]+.003+depth,p[2]).applyMatrix4(inverseWorld).toArray());
  }
  const bottom=used.length;
  for(const face of selected) {
    const ids=face.map(id=>remap.get(id));indices.push(...ids,ids[2]+bottom,ids[1]+bottom,ids[0]+bottom);
    for(let i=0;i<3;i++) {
      const a=ids[i],b=ids[(i+1)%3],k=a<b?`${a}:${b}`:`${b}:${a}`;
      if(boundary.has(k))boundary.delete(k);else boundary.set(k,[a,b]);
    }
  }
  for(const [a,b] of boundary.values())indices.push(b,a,a+bottom,b,a+bottom,b+bottom);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([...upper,...lower],3));geometry.setIndex(indices);
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const options=snowShapeOptions(coverage);
  geometry.userData.snowDeposit={topFaces:selected.length,boundaryEdges:boundary.size,vertices:used.length,windDirection:options.snowWindDirection,drift:options.snowDrift};
  return geometry;
}
