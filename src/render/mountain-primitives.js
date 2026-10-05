import * as THREE from 'three';

/** Bounded, static curves for ropes and roots; no physics or per-frame geometry updates. */
export function createRopeGeometry({points,radius=.025,segments=24,sides=6}) {
  if(!Array.isArray(points)||points.length<2||points.length>16||points.some(p=>!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isFinite(v)||Math.abs(v)>100)))throw new Error('Trajeto de corda inválido.');
  if(!Number.isFinite(radius)||radius<.005||radius>.3||!Number.isInteger(segments)||segments<2||segments>64||!Number.isInteger(sides)||sides<3||sides>12)throw new Error('Detalhe de corda inválido.');
  if(points.some((p,i)=>i&&new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...points[i-1]))<.001))throw new Error('Pontos de corda repetidos.');
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  return new THREE.TubeGeometry(curve,segments,radius,sides,false);
}
export function createRingGeometry({radius=.08,tube=.012,segments=12,sides=6}) {
  if(!Number.isFinite(radius)||radius<.01||radius>5||!Number.isFinite(tube)||tube<.002||tube>=radius||!Number.isInteger(segments)||segments<6||segments>48||!Number.isInteger(sides)||sides<3||sides>12)throw new Error('Argola inválida.');
  return new THREE.TorusGeometry(radius,tube,sides,segments);
}
