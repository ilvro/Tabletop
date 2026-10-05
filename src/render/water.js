import * as THREE from 'three';
import { createFloor, applyTransform, tagEntity } from './scene-objects.js';
import { floorContour } from '../domain/geometry.js';
import { surfacePatch } from '../domain/materials.js';

/** Polygon geometry supports river bends; bounded waves preserve the authored contour. */
export function createWater(entity) {
  if(entity.water.state==='ice')return createFloor({...entity,kind:'floor',thickness:entity.depth,material:{...surfacePatch('ice'),...entity.material,texture:entity.material.texture&&entity.material.texture!=='none'?entity.material.texture:'ice'}});
  const shape=new THREE.Shape(floorContour(entity).map(([x,z])=>new THREE.Vector2(x,-z)));
  let geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);
  // Subdivide long triangles locally; no rectangle extends beyond a river's contour.
  let positions=Array.from(geometry.getAttribute('position').array), triangles=geometry.index?Array.from(geometry.index.array):positions.map((_,i)=>i).filter(i=>i%3===0).map(i=>i/3);
  for(let pass=0;pass<5;pass++) {
    const result=[];for(let i=0;i<triangles.length;i+=3){const [a,b,c]=triangles.slice(i,i+3).map(k=>positions.slice(k*3,k*3+3));const add=(u,v,w)=>{const k=result.length/3;result.push(...u,...v,...w);return k;};const ab=a.map((v,j)=>(v+b[j])/2),bc=b.map((v,j)=>(v+c[j])/2),ca=c.map((v,j)=>(v+a[j])/2);add(a,ab,ca);add(ab,b,bc);add(ca,bc,c);add(ab,bc,ca);}
    positions=result;triangles=Array.from({length:positions.length/3},(_,i)=>i);
    if(triangles.length>30000)break;
  }
  geometry.dispose();geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.boundingBox.min.y-=entity.water.waveHeight;geometry.boundingBox.max.y+=entity.water.waveHeight;geometry.computeBoundingSphere();geometry.boundingSphere.radius+=entity.water.waveHeight;
  const w=entity.water, angle=w.direction*Math.PI/180;
  const uniforms={waterTime:{value:0},waterAmplitude:{value:w.waveHeight},waterScale:{value:w.waveScale},waterDirection:{value:new THREE.Vector2(Math.cos(angle),Math.sin(angle))}};
  const material=new THREE.MeshPhysicalMaterial({color:new THREE.Color(entity.material.color).multiplyScalar(Math.exp(-entity.depth*.055)),roughness:.22,metalness:.05,transparent:true,opacity:w.opacity,depthWrite:false,side:THREE.DoubleSide,clearcoat:.9,clearcoatRoughness:.12});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    const declarations='uniform float waterTime, waterAmplitude, waterScale; uniform vec2 waterDirection;\n';
    shader.vertexShader=declarations+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>\nfloat k=6.2831853/waterScale; vec2 dir=waterDirection; vec2 across=vec2(-dir.y,dir.x); float phase=dot(position.xz,dir)*k-waterTime; float phase2=dot(position.xz,across)*k*.73+waterTime*.7; vec2 grad=waterAmplitude*(.65*cos(phase)*k*dir+.35*cos(phase2)*k*.73*across); objectNormal=normalize(vec3(-grad.x,1.0,-grad.y));`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed.y+=waterAmplitude*(.65*sin(phase)+.35*sin(phase2));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float fresnel=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),3.0); outgoingLight=mix(outgoingLight,vec3(.48,.64,.72),fresnel*.35);\n#include <opaque_fragment>`);
  };
  const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.userData.waterUniforms=uniforms;mesh.userData.materialSlot='base';
  const group=new THREE.Group();group.add(mesh);group.userData.waterRecord=entity;applyTransform(group,entity.transform);return tagEntity(group,entity.id);
}
export function updateWater(object,time,paused) {
  const w=object.userData.waterRecord?.water;if(!w || w.state!=='water')return false;
  object.traverse(child=>{if(child.userData.waterUniforms)child.userData.waterUniforms.waterTime.value=time*w.speed;});
  return !paused && w.waveHeight>0 && w.speed>0;
}
