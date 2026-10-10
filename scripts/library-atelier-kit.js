import * as THREE from 'three';
import {sidesFor,box,cylinder,ellipsoid,ring,turned,curve,profile,cushion,frame,spindle} from './library-craft-parts.js';

// Assemblies shared by the authored models: every helper returns recipe parts
// in metres, so a model reads as joinery and hardware instead of coordinates.
export {box as b,ring as r,curve,profile as p,cushion,frame,spindle};
const sides=sidesFor;
export const e=(size,position,material,rotation)=>({...ellipsoid(size,position,material,rotation),segments:Math.max(8,sides(Math.max(...size)/2))});
export const t=(points,position,material,rotation)=>({...turned(points,position,material,rotation),segments:sides(Math.max(...points.map(q=>q[0])))});
export const AX={x:[0,0,-Math.PI/2],z:[Math.PI/2,0,0]};
export const TAU=Math.PI*2;
export const c=(radius,height,position,material='metal',axis,top=radius)=>({...cylinder(radius,height,position,material,top,AX[axis]),segments:sides(Math.max(radius,top))});
export const rb=(size,position,material,radius=.02,rotation)=>({...box(size,position,material,rotation),bevel:Math.min(radius,Math.min(...size)*.49),round:true});
export const tb=(size,position,material,taper,rotation)=>({...box(size,position,material,rotation),taper});
export const lathe=(points,position,material,axis,extra)=>({...t(points,position,material,AX[axis]),...extra});
export const rock=(size,position,material='stone',seed=1,form='rounded',rotation,irregularity=.6)=>({shape:'rock',form,size,position,seed,detail:4,irregularity,fixedRock:true,material,...(rotation?{rotation}:{})});
export const along=(n,a,b)=>Array.from({length:n},(_,i)=>n===1?(a+b)/2:a+(b-a)*i/(n-1));
export const polar=(n,radius,fn,phase=0)=>Array.from({length:n},(_,i)=>{const a=phase+i*TAU/n;return fn(Math.cos(a)*radius,Math.sin(a)*radius,a,i);}).flat();
// Flat silhouette standing in the ZY plane (side panels, brackets, rockers).
export const side=(contour,thickness,x,material)=>profile(contour,thickness,[x,0,0],material,[0,-Math.PI/2,0]);
// Flat silhouette lying on XZ (table tops, lids, pools).
export const slab=(contour,thickness,y,material)=>profile(contour.map(([x,z])=>[x,-z]),thickness,[0,y,0],material,[-Math.PI/2,0,0]);
export const surf=(recipe,slot,texture,options={})=>({texture,textureColor:recipe.materials[slot]?.color??'#888888',textureColorMode:'replace',...options});
export const withSurface=(parts,surface)=>{for(const part of [parts].flat())part.surface=surface;return parts;};

export function wheel(radius,width,position,{tire='black',hub='metal',axis='x',rim=.6}={}) {
  const k=width/2,q=radius*rim;
  return [lathe([[q,-k],[radius*.93,-k],[radius,-k*.5],[radius,k*.5],[radius*.93,k],[q,k]],position,tire,axis),
    lathe([[0,-k*.55],[q*.3,-k*.7],[q*.36,-k*.45],[q*.9,-k*.5],[q,-k*.75],[q,k*.75],[q*.9,k*.5],[q*.36,k*.45],[q*.3,k*.7],[0,k*.55]],position,hub,axis)];
}
export function spokedWheel(radius,tube,position,{tire='black',metal='metal',axis='x',spokes=6,hub=.1}={}) {
  const parts=[ring(radius-tube,tube,position,tire,axis==='x'?[0,Math.PI/2,0]:undefined),c(radius*hub,tube*3,position,metal,axis)];
  for(let i=0;i<spokes;i++){const a=i*Math.PI/spokes;parts.push({...cylinder(.004,(radius-tube)*2,position,metal,.004,axis==='x'?[a,0,0]:[0,0,a]),segments:6});}
  return parts;
}
export const caster=(x,z,radius,fork='metal',tire='black')=>[c(radius*.35,radius*.5,[x,radius*2.25,z],fork),box([radius*.9,radius*1.3,radius*.3],[x,radius*1.5,z],fork),...wheel(radius,radius*.6,[x,radius,z+radius*.25],{tire,hub:fork})];
// U-shaped bar standing proud of a face that looks towards +Z.
export const pull=(x,y,z,length,material='metal',out=.028,vertical=false,radius=.006)=>{const k=length/2;return curve(vertical?[[x,y-k,z],[x,y-k*.9,z+out],[x,y+k*.9,z+out],[x,y+k,z]]:[[x-k,y,z],[x-k*.9,y,z+out],[x+k*.9,y,z+out],[x+k,y,z]],radius,material);};
export const knob=(position,radius,material='metal',axis='z')=>lathe([[0,0],[radius*.45,0],[radius*.4,radius*.6],[radius,radius*.9],[radius,radius*1.4],[radius*.6,radius*1.8],[0,radius*1.85]],position,material,axis,{segments:16});
export const bolts=(points,radius,material='metal',axis='z')=>points.map(position=>lathe([[0,0],[radius,0],[radius,radius*.5],[radius*.5,radius*.9],[0,radius*.9]],position,material,axis,{segments:8}));
// Framed door or wainscot panel with a recessed, raised field (six parts).
export function panel(w,h,[x,y,z],material='wood',{depth=.024,border=Math.min(w,h)*.16,field=material}={}) {
  return [...frame(w,h,depth,[x,y,z],material,border),box([w-border*2,h-border*2,depth*.45],[x,y,z-depth*.2],field),
    box([w-border*3.1,h-border*3.1,depth*.5],[x,y,z+depth*.05],field,null,depth*.2)];
}
export const louvers=(w,h,[x,y,z],count,material='black',depth=.008)=>along(count,y-h/2+h/count/2,y+h/2-h/count/2).map(v=>box([w,h/count*.5,depth],[x,v,z],material,[.5,0,0]));
export const gauge=([x,y,z],radius,rim='metal',face='paper',needle='black')=>[c(radius,.012,[x,y,z],rim,'z'),c(radius*.84,.014,[x,y,z],face,'z'),box([radius*.08,radius*.75,.004],[x+radius*.2,y+radius*.2,z+.008],needle,[0,0,-.75])];
export function candle(x,y,z,radius,height,wax='wax',flame='flame') {
  return [lathe([[0,0],[radius,0],[radius,height-radius*.5],[radius*1.12,height-radius*.2],[radius*.8,height],[radius*.5,height-radius*.25],[0,height-radius*.3]],[x,y,z],wax,null,{segments:12}),
    e([radius*.5,radius*2.2,radius*.5],[x+radius*.9,y+height-radius*1.4,z],wax),
    c(.002,radius*.9,[x,y+height+radius*.1,z],'black'),e([radius*.9,radius*2.6,radius*.9],[x,y+height+radius*1.7,z],flame)];
}
// Chain of interlocked links between two points.
export function chain(from,to,linkRadius,material='metal') {
  const start=new THREE.Vector3(...from),u=new THREE.Vector3(...to).sub(start),length=u.length(),count=Math.max(2,Math.round(length/(linkRadius*1.45)));u.normalize();
  const n1=new THREE.Vector3().crossVectors(u,Math.abs(u.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),n2=new THREE.Vector3().crossVectors(u,n1);
  return Array.from({length:count},(_,i)=>{
    const euler=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),i%2?n1:n2));
    return {...ring(linkRadius,linkRadius*.24,start.clone().addScaledVector(u,length*(i+.5)/count).toArray(),material,[euler.x,euler.y,euler.z]),segments:10,sides:5};
  });
}
export const planks=(w,thickness,d,[x,y,z],count,material='wood',gap=.004)=>along(count,z-d/2+d/count/2,z+d/2-d/count/2).map((v,i)=>box([w-(i%2)*.006,thickness,d/count-gap],[x,y,v],material));
// Finishes beside the public slots; a model lists the ones it uses.
export const FINISH={
  pane:{color:'#b9d0d2',opacity:.28,roughness:.06,metalness:.1},chrome:{color:'#c6cccd',roughness:.18,metalness:.95},
  leather:{color:'#4a3024',roughness:.58},copper:{color:'#a5673f',roughness:.36,metalness:.85},soil:{color:'#4b3a2c',roughness:1},
  ember:{color:'#ff8a3c',emissive:'#ff5a1c',emissiveIntensity:1.1},brass:{color:'#a28a54',roughness:.39,metalness:.8},
  soot:{color:'#141312',roughness:.95},cream:{color:'#d9cfb4',roughness:.55},felt:{color:'#2f5a3c',roughness:1},
};
export const finishes=(...names)=>Object.fromEntries(names.filter(name=>FINISH[name]).map(name=>[name,FINISH[name]]));
// Euler angles for rotations applied in order around world axes.
export function spin(...steps) {
  const q=new THREE.Quaternion(),axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
  for(const [axis,angle] of steps)q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axes[axis]),angle));
  const euler=new THREE.Euler().setFromQuaternion(q);return [euler.x,euler.y,euler.z];
}
// Crescent in (z,y) for rockers: `rise` at both ends, resting on y=0 at the centre.
export const crescent=(length,rise,thickness,steps=10)=>[...along(steps+1,-length/2,length/2).map(z=>[z,rise*(2*z/length)**2]),...along(steps+1,length/2,-length/2).map(z=>[z,rise*(2*z/length)**2+thickness])];
// Opt a part out of the automatic slot finish (leather in a `wood` slot, etc.).
export const plain=parts=>withSurface(parts,{texture:'none'});
// Teardrop tongue of fire; `flame` slots are emissive.
export const fire=(x,y,z,radius,height,material='flame',rotation)=>({...turned([[0,0],[radius*.75,height*.1],[radius,height*.3],[radius*.7,height*.6],[radius*.25,height*.88],[0,height]],[x,y,z],material,rotation),segments:10});
FINISH.fluid={color:'#2f7f86',emissive:'#1f6f78',emissiveIntensity:.35,opacity:.34,roughness:.1};
FINISH.veil={color:'#6a4a9a',emissive:'#6b3fa0',emissiveIntensity:.3,opacity:.1,roughness:.3};
