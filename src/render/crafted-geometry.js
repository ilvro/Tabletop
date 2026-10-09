import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Construction primitives for the second library. Dimensions are the outside
// envelope, including bevels. No per-frame deformation or external dependencies.
export function craftedBox(part) {
  const {size, bevel = 0, cushion = false, round = false, taper} = part;
  if (!Array.isArray(size) || size.length !== 3 || size.some(v => !Number.isFinite(v) || v <= 0) ||
      !Number.isFinite(bevel) || bevel < 0 || bevel > Math.min(...size) / 2) throw new Error('Chanfro inválido.');
  if (taper !== undefined && (!Array.isArray(taper) || taper.length !== 2 || taper.some(v => !Number.isFinite(v) || v < .02 || v > 4))) throw new Error('Afunilamento inválido.');
  const soft = cushion || round;
  const geometry = !bevel ? new THREE.BoxGeometry(...size) : soft ? new RoundedBoxGeometry(...size, cushion ? 3 : 2, bevel) : chamferBox(size,bevel);
  const p = geometry.attributes.position;
  if (cushion && bevel) {
    // Shallow sewn channels along the long axis; avoid the edges and base.
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y <= 0) continue;
      const edge = Math.max(0, 1 - (2*x/size[0])**8) * Math.max(0, 1 - (2*z/size[2])**8);
      p.setY(i, y - Math.min(size[1]*.08,.012) * edge * (.5+.5*Math.cos(x/size[0]*Math.PI*6)));
    }
    geometry.computeVertexNormals();
  }
  if (taper) {
    // Legs, hoods and plinths: the top face is scaled, the base keeps `size`.
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i)/size[1] + .5;
      p.setXYZ(i, p.getX(i)*(1+(taper[0]-1)*t), p.getY(i), p.getZ(i)*(1+(taper[1]-1)*t));
    }
    if (!soft) geometry.computeVertexNormals();
  }
  return geometry;
}

// 44 triangles, independent of the length of the board. A grid-subdivided
// rounded cube wastes hundreds of coplanar triangles on each piece of masonry.
function chamferBox(size,radius) {
  const h=size.map(v=>v/2),c=h.map(v=>v-radius),positions=[],uv=[];
  function face(points) {
    const vertices=points.map(p=>new THREE.Vector3(...p));
    const n=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
    const center=vertices.reduce((a,p)=>a.add(p),new THREE.Vector3());
    if(n.dot(center)<0)vertices.reverse();
    for(let i=1;i<vertices.length-1;i++)for(const p of [vertices[0],vertices[i],vertices[i+1]]){positions.push(...p.toArray());uv.push(p.x/size[0]+.5,p.y/size[1]+.5);}
  }
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]) {
    const others=[0,1,2].filter(a=>a!==axis);
    face([[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{const p=[0,0,0];p[axis]=sign*h[axis];p[others[0]]=u*c[others[0]];p[others[1]]=v*c[others[1]];return p;}));
  }
  for(let free=0;free<3;free++)for(const s of [-1,1])for(const t of [-1,1]) {
    const [a,b]=[0,1,2].filter(i=>i!==free);
    face([[1,0],[-1,0],[-1,1],[1,1]].map(([end,side])=>{const p=[0,0,0];p[free]=end*c[free];p[a]=s*(side?c[a]:h[a]);p[b]=t*(side?h[b]:c[b]);return p;}));
  }
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])face([0,1,2].map(a=>[x,y,z].map((s,i)=>s*(i===a?h[i]:c[i]))));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();return geometry;
}

export function turnedGeometry({profile, segments = 32, arc = Math.PI*2, start = 0, faceted = false}) {
  if (!Array.isArray(profile) || profile.length < 2 || profile.length > 48 ||
      profile.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v)) || p[0] < 0) ||
      !Number.isInteger(segments) || segments < 3 || segments > 64 ||
      !Number.isFinite(arc) || arc <= 0 || arc > Math.PI*2 + 1e-9 || !Number.isFinite(start)) throw new Error('Perfil torneado inválido.');
  const geometry = new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), segments, start, arc);
  // Crystals and cut stone: few sides, shaded per face.
  if (faceted) geometry.userData.faceted = true;
  return geometry;
}

export function ellipsoidGeometry({size, segments = 24}) {
  if (!Array.isArray(size) || size.length !== 3 || size.some(v => !Number.isFinite(v) || v <= 0) ||
      !Number.isInteger(segments) || segments < 8 || segments > 48) throw new Error('Volume orgânico inválido.');
  return new THREE.SphereGeometry(1, segments, Math.ceil(segments*.66)).scale(...size.map(v=>v/2));
}
