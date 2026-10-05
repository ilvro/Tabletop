import * as THREE from 'three';
import { hasPhysicalSnow, snowWeight } from '../domain/snow.js';
import { surfacePatch } from '../domain/materials.js';
import { applySurfaceMaterial } from './surface-materials.js';

export function snowOccluders(objects) {
  const result=[];for(const object of objects) object.traverse(child=>{
    if(child.isMesh && !child.userData.decorative && !child.userData.waterUniforms && child.geometry?.attributes.position)result.push({mesh:child,bounds:new THREE.Box3().setFromObject(child)});
  });return result;
}
/** Vertical sky test against actual roof/arch geometry, including branches of the same tree. */
export function createExposureTest(occluders) {
  // Vertical rays need only XZ projection and barycentric height. A local grid avoids
  // scanning every needle of a merged canopy for every snow triangle.
  const indexed=occluders.map(({mesh,bounds})=>{
    const size=bounds.getSize(new THREE.Vector3()),cell=Math.max(.15,Math.max(size.x,size.z)/24),bins=new Map(),p=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?.count??p.count;
    for(let i=0;i<count;i+=3) {
      const [a,b,c]=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld).toArray());
      const det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(det)<1e-10)continue;
      const tri={a,b,c,det,maxY:Math.max(a[1],b[1],c[1])};
      const minX=Math.floor((Math.min(a[0],b[0],c[0])-bounds.min.x)/cell),maxX=Math.floor((Math.max(a[0],b[0],c[0])-bounds.min.x)/cell),minZ=Math.floor((Math.min(a[2],b[2],c[2])-bounds.min.z)/cell),maxZ=Math.floor((Math.max(a[2],b[2],c[2])-bounds.min.z)/cell);
      for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){const key=`${x}:${z}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(tri);}
    }
    return {bounds,cell,bins};
  });
  return ([x,y,z])=> {
    for(const {bounds:b,cell,bins} of indexed) {
      if(x<b.min.x || x>b.max.x || z<b.min.z || z>b.max.z || b.max.y<=y+.008)continue;
      const triangles=bins.get(`${Math.floor((x-b.min.x)/cell)}:${Math.floor((z-b.min.z)/cell)}`)??[];
      for(const {a,b,c,det,maxY} of triangles) {
        if(maxY<=y+.008)continue;
        const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/det,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/det,w=1-u-v;
        if(u>=-1e-7 && v>=-1e-7 && w>=-1e-7 && u*a[1]+v*b[1]+w*c[1]>y+.008)return 0;
      }
    }
    return 1;
  };
}
export function clearPhysicalSnow(object) {
  const remove=[];object.traverse(child=>{if(child.userData.physicalSnow)remove.push(child);});
  for(const mesh of remove){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
}
/** Closed vertical coats follow upward triangles, retaining rock, roof and leaf silhouettes. */
export function addPhysicalSnow(object,record,library,exposure) {
  if(!hasPhysicalSnow(record) || record.kind==='terrain' || record.water?.state==='water')return {triangles:0};
  const c=record.material.coverage, selected=record.material.textureSlot, positions=[], matrix=new THREE.Matrix4().copy(object.matrixWorld).invert();
  const meshes=[];object.traverse(child=>{if(child.isMesh && !child.userData.decorative && child.geometry?.attributes.position)meshes.push(child);});
  const exposedCache=new Map();
  const exposed=p=> {if(c.exposedOnly===false)return 1;const key=p.map(v=>Math.round(v*20)).join(',');if(!exposedCache.has(key))exposedCache.set(key,exposure(p));return exposedCache.get(key);};
  const emit=(a,b,d)=>{for(const p of [a,b,d])positions.push(...new THREE.Vector3(...p).applyMatrix4(matrix).toArray());};
  let coats=0;
  const coat=(a,b,d,level=0)=> {
    if(coats>=6000)return;
    const ab=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),ad=new THREE.Vector3(...d).sub(new THREE.Vector3(...a)),normal=ab.clone().cross(ad).normalize();if(normal.y<=.05)return;
    const longest=Math.max(ab.length(),ad.length(),new THREE.Vector3(...b).distanceTo(new THREE.Vector3(...d)));
    if(longest>1.25 && level<3){const mid=(x,y)=>x.map((v,i)=>(v+y[i])/2),u=mid(a,b),v=mid(b,d),w=mid(d,a);for(const t of [[a,u,w],[u,b,v],[w,v,d],[u,v,w]])coat(...t,level+1);return;}
    const center=a.map((v,i)=>(v+b[i]+d[i])/3);
    if(!exposed(center))return;
    const lower=[a,b,d].map(p=>[p[0],p[1]+.003,p[2]]);
    const upper=[a,b,d].map(p=>[p[0],p[1]+.003+c.physicalThickness*snowWeight(p,normal.y,c)*exposed(p),p[2]]);
    if(upper.every((p,i)=>p[1]-lower[i][1]<.002))return;
    emit(...upper);emit(lower[2],lower[1],lower[0]);
    for(let i=0;i<3;i++){const j=(i+1)%3;emit(lower[i],lower[j],upper[j]);emit(lower[i],upper[j],upper[i]);}coats++;
  };
  for(const mesh of meshes) {
    const slots=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>m.name || mesh.userData.materialSlot || 'base');
    if(selected && selected!=='base' && !slots.includes(selected))continue;
    const g=mesh.geometry, p=g.attributes.position, count=g.index?.count??p.count;
    for(let i=0;i<count;i+=3){if(coats>=6000)break;const ids=[0,1,2].map(j=>g.index?g.index.getX(i+j):i+j);if(selected && selected!=='base' && Array.isArray(mesh.material) && g.groups.length){const group=g.groups.find(t=>i>=t.start && i<t.start+t.count);if(group && slots[group.materialIndex]!==selected)continue;}
      coat(...ids.map(id=>new THREE.Vector3().fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld).toArray()));
    }
  }
  if(!positions.length)return {triangles:0};
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const settings={...surfacePatch('snow'),color:c.color,textureSize:c.textureSize,relief:c.relief};
  const material=new THREE.MeshStandardMaterial({color:c.color,roughness:.86});applySurfaceMaterial(material,settings,library);
  const snow=new THREE.Mesh(geometry,material);snow.castShadow=true;snow.receiveShadow=true;snow.userData={decorative:true,physicalSnow:true,entityId:record.id};object.add(snow);
  return {triangles:positions.length/9};
}
