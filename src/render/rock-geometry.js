import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROCK_FORMS, ROCK_RANGES } from '../domain/rocks.js';

const fract=x=>x-Math.floor(x);
const hash=(x,y,z,seed)=>fract(Math.sin(x*127.1+y*311.7+z*74.7+seed*19.19)*43758.5453);
function noise(x,y,z,seed) {
  const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z);
  const smooth=v=>{v=fract(v);return v*v*(3-2*v);}, fx=smooth(x),fy=smooth(y),fz=smooth(z);
  const at=(a,b,c)=>hash(ix+a,iy+b,iz+c,seed), mix=THREE.MathUtils.lerp;
  return mix(mix(mix(at(0,0,0),at(1,0,0),fx),mix(at(0,1,0),at(1,1,0),fx),fy),mix(mix(at(0,0,1),at(1,0,1),fx),mix(at(0,1,1),at(1,1,1),fx),fy),fz);
}

/** Closed welded meshes with stable metric bounds; no scene/document state or GPU allocation. */
export function createRockGeometry({size=[2,1.6,1.5],form='fractured',seed=17,irregularity=.65,detail=5}={}) {
  if(!Array.isArray(size)||size.length!==3||size.some(v=>!Number.isFinite(v)||v<=0||v>100)) throw new Error('Dimensões da rocha inválidas.');
  for(const [key,[min,max]] of Object.entries(ROCK_RANGES)) {
    const value={seed,irregularity,detail}[key];
    if(!Number.isFinite(value)||value<min||value>max||key!=='irregularity'&&!Number.isInteger(value)) throw new Error('Parâmetros da rocha inválidos.');
  }
  if(!ROCK_FORMS.includes(form)) throw new Error('Formação da rocha inválida.');
  const source=new THREE.IcosahedronGeometry(1,detail);
  source.deleteAttribute('normal');source.deleteAttribute('uv');
  const geometry=mergeVertices(source,1e-5);source.dispose();
  const vertices=geometry.attributes.position;
  const fractures=Array.from({length:7},(_,plane)=>{
    const a=hash(plane,0,0,seed)*Math.PI*2,b=hash(plane,1,0,seed)*1.6-.8;
    return {normal:new THREE.Vector3(Math.cos(a),b,Math.sin(a)).normalize(),distance:.78+hash(plane,2,0,seed)*.15};
  });
  for(let i=0;i<vertices.count;i++) {
    const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);
    const broad=noise(x*1.8,y*1.8,z*1.8,seed)-.5, small=noise(x*6,y*6,z*6,seed+13)-.5;
    let radius=1+irregularity*(broad*.65+small*.13), dx=x,dy=y,dz=z;
    if(form==='fractured') {
      // Intersect a sphere-like volume with seeded planes for broken faces, not cylinders.
      for(const {normal,distance} of fractures) {
        const dot=x*normal.x+y*normal.y+z*normal.z;
        if(dot>0) radius=Math.min(radius,distance/dot);
      }
      dx+=irregularity*y*.14;dz+=irregularity*Math.sin(y*3+seed)*.09;
    } else if(form==='strata') {
      const band=Math.sin(y*18+noise(x*2,0,z*2,seed)*1.1);
      radius+=irregularity*(Math.tanh(band*3)*.09);
      dx+=irregularity*y*.28;dz+=irregularity*y*.1;
    }
    vertices.setXYZ(i,dx*radius,dy*radius,dz*radius);
  }
  // Each variant keeps its annotated footprint/base even after editing its shape.
  geometry.computeBoundingBox();const bounds=geometry.boundingBox, extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  for(let i=0;i<vertices.count;i++) vertices.setXYZ(i,(vertices.getX(i)-center.x)*size[0]/extent.x,(vertices.getY(i)-bounds.min.y)*size[1]/extent.y,(vertices.getZ(i)-center.z)*size[2]/extent.z);
  vertices.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData.rock={size:[...size],form,seed,irregularity,detail};
  return geometry;
}
