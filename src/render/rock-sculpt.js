import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {assertRockSculpt,ROCK_SCULPT_TRIANGLES} from '../domain/rock-sculpt.js';

const v=(p,i)=>new THREE.Vector3().fromBufferAttribute(p,i);
function subdivide(source,levels) {
  // Weld by position, retaining a closed shell even for batched, non-indexed flat-shaded meshes.
  const raw=source.clone();raw.deleteAttribute('normal');raw.deleteAttribute('uv');
  let geometry=mergeVertices(raw,1e-6);raw.dispose();
  for(let level=0;level<levels;level++) {
    const positions=Array.from(geometry.attributes.position.array),triangles=[],midpoints=new Map(),idx=geometry.index.array;
    const midpoint=(a,b)=>{const key=a<b?`${a}:${b}`:`${b}:${a}`;if(midpoints.has(key))return midpoints.get(key);const id=positions.length/3;for(let axis=0;axis<3;axis++)positions.push((positions[a*3+axis]+positions[b*3+axis])/2);midpoints.set(key,id);return id;};
    for(let i=0;i<idx.length;i+=3){const [a,b,c]=idx.slice(i,i+3),ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);triangles.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
    const next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));next.setIndex(triangles);geometry.dispose();geometry=next;
  }
  geometry.computeVertexNormals();return geometry;
}

/** Bake recipe normalization in entity coordinates once; no changes to the entity transform. */
export function prepareRockSculpt(root) {
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),meshes=[];
  root.traverse(m=>{if(m.isMesh&&(m.geometry.userData.rock||m.geometry.userData.rocks||m.geometry.userData.sculptPrepared))meshes.push(m);});
  const unprepared=meshes.filter(m=>!m.geometry.userData.sculptPrepared);
  let total=meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0),levels=0;
  if(unprepared.length===meshes.length)while(levels<2&&total*4<=ROCK_SCULPT_TRIANGLES){levels++;total*=4;}
  for(const mesh of unprepared) {
    const source=mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)),metadata=structuredClone(mesh.geometry.userData);
    const geometry=subdivide(source,levels);source.dispose();mesh.geometry.dispose();geometry.userData={...metadata,sculptPrepared:true};mesh.geometry=geometry;
    mesh.removeFromParent();root.add(mesh);mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);
    const neighbors=Array.from({length:geometry.attributes.position.count},()=>new Set()),index=geometry.index.array;
    for(let i=0;i<index.length;i+=3)for(let j=0;j<3;j++){const a=index[i+j],b=index[i+(j+1)%3];neighbors[a].add(b);neighbors[b].add(a);}
    // Runtime only, never JSON or asset cache data.
    mesh.userData.sculptNeighbors=neighbors.map(set=>[...set]);
  }
  root.updateMatrixWorld(true);return meshes;
}

/** Uniform local stamp data follows rotation/scale; ellipse radii represent a world-space sphere. */
export function rockBrushStamp(record,point,normal,brush,plane=point) {
  const q=new THREE.Quaternion().fromArray(record.transform.rotation),inverse=q.clone().invert(),scale=new THREE.Vector3(...record.transform.scale),origin=new THREE.Vector3(...record.transform.position);
  const local=p=>new THREE.Vector3(...p).sub(origin).applyQuaternion(inverse).divide(scale).toArray();
  const facing=new THREE.Vector3(...normal).applyQuaternion(inverse).multiply(scale).normalize();
  const mode=['raise','lower','push','pull','smooth','flatten'].includes(brush.mode)?brush.mode:'push';
  const direction=['raise','lower'].includes(mode)?new THREE.Vector3(0,1,0):new THREE.Vector3(...normal);
  direction.applyQuaternion(inverse).divide(scale);
  const amount=Math.min(brush.strength,brush.radius*.15)*(mode==='lower'||mode==='pull'?-1:1);
  const stamp={mode,center:local(point),radius:scale.toArray().map(s=>brush.radius/s),normal:facing.toArray(),delta:direction.multiplyScalar(amount).toArray(),blend:Math.min(1,brush.strength),plane:local(plane),hardness:brush.hardness??0};
  // Flatten retains the clicked plane throughout a drag.
  return assertRockSculpt({stamps:[stamp]}).stamps[0];
}

export function applyRockStamp(meshes,stamp) {
  let changed=false;
  const normal=new THREE.Vector3(...stamp.normal),center=new THREE.Vector3(...stamp.center),plane=new THREE.Vector3(...stamp.plane);
  for(const mesh of meshes) {
    const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index.array,before=p.array.slice(),candidate=before.slice(),neighbors=mesh.userData.sculptNeighbors;
    for(let i=0;i<p.count;i++) {
      const point=v(p,i),offset=point.clone().sub(center),distance=Math.hypot(...offset.toArray().map((x,j)=>x/stamp.radius[j]));
      if(distance>=1||v(n,i).dot(normal)<.05)continue;
      const t=distance<=stamp.hardness?1:1-(distance-stamp.hardness)/(1-stamp.hardness),weight=t*t*(3-2*t);let delta=new THREE.Vector3(...stamp.delta).multiplyScalar(weight);
      if(stamp.mode==='smooth') {
        const average=new THREE.Vector3();for(const j of neighbors[i])average.add(v(p,j));average.divideScalar(neighbors[i].length||1);delta=average.sub(point).multiplyScalar(weight*stamp.blend*.4);
      } else if(stamp.mode==='flatten')delta=normal.clone().multiplyScalar(-point.clone().sub(plane).dot(normal)*weight*stamp.blend);
      for(let axis=0;axis<3;axis++)candidate[i*3+axis]+=delta.getComponent(axis);
    }
    // Back off the whole stamp when it would flip/collapse a face. Closed topology is conserved.
    let factor=1,valid=false;
    while(factor>=1/128) {
      for(let i=0;i<before.length;i++)p.array[i]=before[i]+(candidate[i]-before[i])*factor;
      valid=true;
      for(let i=0;i<index.length;i+=3) {
        const a=index[i]*3,b=index[i+1]*3,c=index[i+2]*3;
        const cross=array=>{const x=array[b]-array[a],y=array[b+1]-array[a+1],z=array[b+2]-array[a+2],u=array[c]-array[a],w=array[c+1]-array[a+1],v=array[c+2]-array[a+2];return [y*v-z*w,z*u-x*v,x*w-y*u];};
        const old=cross(before),next=cross(p.array),area=old[0]**2+old[1]**2+old[2]**2;
        if(next[0]**2+next[1]**2+next[2]**2<area*.01||next[0]*old[0]+next[1]*old[1]+next[2]*old[2]<=0){valid=false;break;}
      }
      if(valid)break;factor*=.5;
    }
    if(!valid)p.array.set(before);
    else if(p.array.some((x,i)=>Math.abs(x-before[i])>1e-7))changed=true;
    p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  }
  return changed;
}

export function sculptRockInstance(instance,sculpt) {
  assertRockSculpt(sculpt);if(!sculpt.stamps.length)return instance;
  const root=new THREE.Group();root.add(instance);const meshes=prepareRockSculpt(root);
  for(const stamp of sculpt.stamps)applyRockStamp(meshes,stamp);
  return root;
}
export function sculptFootprint(root) {
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),bounds=new THREE.Box3();
  root.traverse(mesh=>{if(mesh.geometry?.userData.sculptPrepared){const p=mesh.geometry.attributes.position,matrix=inverse.clone().multiply(mesh.matrixWorld);for(let i=0;i<p.count;i++)bounds.expandByPoint(v(p,i).applyMatrix4(matrix));}});
  return [Math.max(.01,Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))*2),Math.max(.01,Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))*2)];
}
