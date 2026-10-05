import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const fract=v=>v-Math.floor(v);
const hash=(x,y,z,s)=>fract(Math.sin(x*127.1+y*311.7+z*74.7+s*19.19)*43758.5453);
function noise(x,y,z,seed) {
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const smooth=v=>{const f=fract(v);return f*f*(3-2*f);},tx=smooth(x),ty=smooth(y),tz=smooth(z);
  let sum=0;
  for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)sum+=hash(ix+a,iy+b,iz+c,seed)*(a?tx:1-tx)*(b?ty:1-ty)*(c?tz:1-tz);
  return sum*2-1;
}
function field(p,seed) {
  // Warping breaks the alignment of the underlying lattice across all three axes.
  const q=p.map((v,i)=>v+.34*noise(p[0]*1.7+19*i,p[1]*1.7,p[2]*1.7,seed+i*7));
  return {q,broad:noise(...q,seed+31),medium:noise(...q.map(v=>v*3.7),seed+53),
    fine:noise(...q.map(v=>v*10.3),seed+71),grain:noise(...q.map(v=>v*25.9),seed+97)};
}

/** Star-shaped, closed formations. Noise changes volumes rather than making repeated height rings.
 * Positive radial displacements retain topology; callers retain the same metric/base contract. */
export function createOrganicRock(params) {
  const {size,form,detail,seed,irregularity,erosion,overhang}=params,cliff=form==='organic-cliff';
  const source=cliff?new THREE.BoxGeometry(2,2,2,detail*4+8,detail*5+8,detail*2+4):new THREE.IcosahedronGeometry(1,detail*3+5);
  source.deleteAttribute('normal');source.deleteAttribute('uv');
  const geometry=mergeVertices(source,1e-5);source.dispose();
  const p=geometry.attributes.position;
  const planes=Array.from({length:11},(_,i)=>{
    const angle=hash(i,1,0,seed)*Math.PI*2,ny=hash(i,2,0,seed)*1.8-.9;
    return {normal:new THREE.Vector3(Math.cos(angle),ny,Math.sin(angle)).normalize(),distance:.73+hash(i,3,0,seed)*.35};
  });
  for(let i=0;i<p.count;i++) {
    const base=new THREE.Vector3().fromBufferAttribute(p,i),direction=base.clone().normalize(),sourceY=base.y;
    if(cliff) {
      // Rounded edges on a slab, rather than a sphere scaled into a tall potato.
      const x=base.x,y=base.y,z=base.z;
      const rounded=new THREE.Vector3(x*Math.sqrt(1-y*y/2-z*z/2+y*y*z*z/3),y*Math.sqrt(1-z*z/2-x*x/2+z*z*x*x/3),z*Math.sqrt(1-x*x/2-y*y/2+x*x*y*y/3));
      base.lerp(rounded,.38);
    }
    const f=field(base.toArray(),seed);
    // Sparse joint grooves intersect at different orientations and heights. No sine strata.
    const joint=1-THREE.MathUtils.smoothstep(Math.abs(noise(f.q[0]*5.1,f.q[1]*4.3,f.q[2]*5.7,seed+149)),.025,.18);
    let radius=1+irregularity*(f.broad*.35+f.medium*.17+f.fine*.06+f.grain*.018-erosion*joint*.055);
    if(!cliff)for(const plane of planes) {
      const dot=direction.dot(plane.normal);
      if(dot>0)radius=Math.min(radius,1-irregularity+irregularity*plane.distance/dot);
    }
    if(cliff) {
      // Local protrusions/recesses use the full field, so neighbouring shelves don't line up.
      radius+=overhang*irregularity*.16*f.medium*(.5+.5*Math.abs(base.z));
      const taper=1-.12*(base.y+1)/2;
      base.x*=taper;base.z*=taper;
    }
    base.multiplyScalar(Math.max(.5,radius));
    if(cliff) {
      // A flat buried sole lets a wall meet terrain without balancing on one tiny vertex.
      // Only the bottom band is constrained; exposed silhouettes remain irregular.
      if(sourceY<-.75)base.y=THREE.MathUtils.lerp(-1,base.y,THREE.MathUtils.smoothstep(sourceY,-1,-.75));
      base.y=Math.max(-1,base.y);
    }
    p.setXYZ(i,base.x,base.y,base.z);
  }
  geometry.computeBoundingBox();const box=geometry.boundingBox,extent=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  for(let i=0;i<p.count;i++)p.setXYZ(i,(p.getX(i)-center.x)*size[0]/extent.x,(p.getY(i)-box.min.y)*size[1]/extent.y,(p.getZ(i)-center.z)*size[2]/extent.z);
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData.rock=structuredClone(params);
  return geometry;
}
