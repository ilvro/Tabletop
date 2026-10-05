import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROCK_FORMS, ROCK_RANGES, CLIFF_DEFAULTS, CLIFF_RANGES } from '../domain/rocks.js';

const fract=x=>x-Math.floor(x);
const hash=(x,y,z,seed)=>fract(Math.sin(x*127.1+y*311.7+z*74.7+seed*19.19)*43758.5453);
function noise(x,y,z,seed) {
  const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z);
  const smooth=v=>{v=fract(v);return v*v*(3-2*v);}, fx=smooth(x),fy=smooth(y),fz=smooth(z);
  const at=(a,b,c)=>hash(ix+a,iy+b,iz+c,seed), mix=THREE.MathUtils.lerp;
  return mix(mix(mix(at(0,0,0),at(1,0,0),fx),mix(at(0,1,0),at(1,1,0),fx),fy),mix(mix(at(0,0,1),at(1,0,1),fx),mix(at(0,1,1),at(1,1,1),fx),fy),fz);
}

/** Closed welded meshes with stable metric bounds; no scene/document state or GPU allocation. */
export function createRockGeometry({size=[2,1.6,1.5],form='fractured',seed=17,irregularity=.65,detail=5,overhang=CLIFF_DEFAULTS.overhang,terraces=CLIFF_DEFAULTS.terraces,erosion=CLIFF_DEFAULTS.erosion}={}) {
  if(!Array.isArray(size)||size.length!==3||size.some(v=>!Number.isFinite(v)||v<=0||v>100)) throw new Error('Dimensões da rocha inválidas.');
  for(const [key,[min,max]] of Object.entries(ROCK_RANGES)) {
    const value={seed,irregularity,detail}[key];
    if(!Number.isFinite(value)||value<min||value>max||key!=='irregularity'&&!Number.isInteger(value)) throw new Error('Parâmetros da rocha inválidos.');
  }
  if(!ROCK_FORMS.includes(form)) throw new Error('Formação da rocha inválida.');
  for(const [key,[min,max]] of Object.entries(CLIFF_RANGES)) {
    const value={overhang,terraces,erosion}[key];
    if(!Number.isFinite(value)||value<min||value>max||key==='terraces'&&!Number.isInteger(value)) throw new Error('Parâmetros de paredão inválidos.');
  }
  if(form==='cliff'||form==='spire') return cliffGeometry({size,form,seed,irregularity,detail,overhang,terraces,erosion});
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

/** Layered slab rings keep the back/sides closed, while the front has real shelves and undercuts.
 * Each ring is a simple X/Z polygon. No two height rings cross, including at parameter extremes. */
function cliffGeometry(params) {
  const {size,form,seed,irregularity,detail,overhang,terraces,erosion}=params;
  const columns=detail*2+2, perimeter=(columns+1)*2, positions=[],indices=[];
  const weights=Array.from({length:terraces},(_,i)=>.65+hash(i,7,0,seed)*.7),total=weights.reduce((a,b)=>a+b,0);
  const rings=[{t:0,lip:0,span:weights[0]/total}];let base=0;
  for(let band=0;band<terraces;band++) {
    const span=weights[band]/total;
    for(const [fraction,lip] of [[.48,-.12],[.68,.32],[.82,.34],[1,0]]) rings.push({t:base+fraction*span,lip,span});
    base+=span;
  }
  for(const {t,lip,span} of rings) {
    const taper=form==='spire'?1-.78*t:1-.06*t;
    for(let edge=0;edge<2;edge++)for(let i=0;i<=columns;i++) {
      const col=edge?columns-i:i,u=col/columns;
      // Fixed vertical seams, broad fractures and different broken tops per column.
      const seam=hash(col,0,0,seed)-.5, top=1-irregularity*.32*noise(u*3,1,edge,seed+5);
      const x=(u-.5)*taper+irregularity*.11*taper*Math.sin(t*7+seed)*Math.sin(u*Math.PI);
      const cut=(noise(u*4,t*5,edge,seed)-.5)*irregularity*.3;
      const shelf=.2+.8*noise(u*4,t*terraces*.7,0,seed+7);
      const height=t*top+Math.sin(t*Math.PI)*span*irregularity*.045*(noise(u*5,t*3,edge,seed)-.5);
      let z=edge?-.45+cut*.5:.25+seam*erosion*.22+cut+lip*overhang*shelf;
      z*=taper;
      positions.push(x,height,z);
    }
  }
  for(let row=0;row<rings.length-1;row++)for(let col=0;col<perimeter;col++) {
    const a=row*perimeter+col,b=row*perimeter+(col+1)%perimeter,c=b+perimeter,d=a+perimeter;
    indices.push(a,b,d,b,c,d);
  }
  // Cap corresponding front/back columns directly, retaining collinear boundary vertices.
  // General polygon triangulation can drop those vertices, leaving T-junctions at zero erosion.
  for(const row of [0,rings.length-1])for(let col=0;col<columns;col++) {
    const offset=row*perimeter,a=offset+col,b=a+1,d=offset+perimeter-1-col,c=d-1;
    indices.push(...(row===0?[a,c,b,a,d,c]:[a,b,c,a,c,d]));
  }
  // Winding is fixed as one closed shell, rather than relying on double-sided materials.
  let volume=0;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<indices.length;i+=3) {
    a.fromArray(positions,indices[i]*3);b.fromArray(positions,indices[i+1]*3);c.fromArray(positions,indices[i+2]*3);
    volume+=a.dot(b.cross(c));
  }
  if(volume<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
  geometry.computeBoundingBox();const bounds=geometry.boundingBox,extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),vertices=geometry.attributes.position;
  for(let i=0;i<vertices.count;i++)vertices.setXYZ(i,(vertices.getX(i)-center.x)*size[0]/extent.x,(vertices.getY(i)-bounds.min.y)*size[1]/extent.y,(vertices.getZ(i)-center.z)*size[2]/extent.z);
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData.rock=structuredClone(params);geometry.userData.faceted=true;
  return geometry;
}
