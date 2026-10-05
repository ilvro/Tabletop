import { distributionOptions } from './materials.js';
import { rotateXZ, yawFromQuaternion } from './coords.js';
const clamp = v => Math.max(0,Math.min(1,v));
const smooth = (a,b,v) => {const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const fract = v => v-Math.floor(v);
const hash = (x,y,z) => fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
function noise(p) {
  const a=p.map(Math.floor), t=p.map(v=>{const f=fract(v);return f*f*(3-2*f);});
  let result=0;for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)result+=hash(a[0]+x,a[1]+y,a[2]+z)*(x?t[0]:1-t[0])*(y?t[1]:1-t[1])*(z?t[2]:1-t[2]);
  return result;
}
/** Same slope, altitude and mottling field as the surface shader, evaluated before displacement. */
export function snowWeight(position, normalY, settings) {
  const d=distributionOptions(settings), n=noise(position.map((v,i)=>v/d.variationSize+d.seed*[.013,.027,.019][i]));
  const angle=Math.acos(Math.max(-1,Math.min(1,normalY)))*180/Math.PI+(n-.5)*d.variation*45;
  let w=d.mode==='all'?1:smooth(d.slopeAngle-d.slopeFade*.5,d.slopeAngle+d.slopeFade*.5,angle);
  if(d.mode==='top')w=1-w;
  if(d.heightEnabled)w*=smooth(d.minHeight-d.heightFade*.5,d.minHeight+d.heightFade*.5,position[1]+(n-.5)*d.variation*d.heightFade);
  return clamp(w*(1-d.variation*.5+d.variation*.5*n))*(settings.amount??1);
}
export const hasPhysicalSnow = record => record?.material?.coverage?.texture==='snow' && record.material.coverage.physicalThickness>0;
/** Optional: old scenes retain the original layer. Wind is an authoring field, not a simulation clock. */
export const SNOW_SHAPE_DEFAULTS=Object.freeze({snowStyle:'legacy',snowDrift:.65,snowDriftScale:2,snowWindDirection:0});
export const SNOW_SHAPE_RANGES={snowDrift:[0,1],snowDriftScale:[.2,20],snowWindDirection:[0,360]};
export const snowShapeOptions=c=>({...SNOW_SHAPE_DEFAULTS,...c});
export function snowDriftFactor(position,normal,settings) {
  if(settings.snowStyle!=='organic')return 1;
  const c=snowShapeOptions(settings),angle=c.snowWindDirection*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),scale=c.snowDriftScale;
  const [x,y,z]=position,q=[(x*cos+z*sin)/scale,y/scale,(z*cos-x*sin)/scale];
  const seed=(c.seed??42)*.037;
  const broad=noise([q[0]*.8+seed,q[1]*.65,q[2]*1.7+seed]),fine=noise(q.map((v,i)=>v*3.7+seed+i*9));
  const lee=Math.max(0,-normal[0]*cos-normal[2]*sin);
  return 1+c.snowDrift*((broad-.5)*.85+(fine-.5)*.2+lee*.45);
}
export const snowDepth=(position,normal,c)=>c.physicalThickness*snowWeight(position,normal[1],c)*snowDriftFactor(position,normal,c);
const cache=new WeakMap();
export function terrainSnow(terrain) {
  const c=terrain.material.coverage;
  if(!hasPhysicalSnow(terrain))return {heights:terrain.heights,weights:null};
  const signature=JSON.stringify([c,terrain.width,terrain.length,terrain.segments,terrain.transform]);
  const old=cache.get(terrain);if(old?.signature===signature && old.base===terrain.heights && old.mask===terrain.snowMask)return old;
  const n=terrain.segments, normals=Array.from({length:terrain.heights.length},()=>[0,0,0]);
  const p=i=>[(i%(n+1)/n-.5)*terrain.width,terrain.heights[i],(Math.floor(i/(n+1))/n-.5)*terrain.length];
  for(let z=0;z<n;z++)for(let x=0;x<n;x++) {
    const a=z*(n+1)+x,b=a+1,k=a+n+1,d=k+1;
    for(const ids of [[a,k,b],[b,k,d]]) {
      const [o,u,v]=ids.map(p), e=u.map((t,i)=>t-o[i]),f=v.map((t,i)=>t-o[i]),q=[e[1]*f[2]-e[2]*f[1],e[2]*f[0]-e[0]*f[2],e[0]*f[1]-e[1]*f[0]];
      for(const i of ids)for(let j=0;j<3;j++)normals[i][j]+=q[j];
    }
  }
  const yaw=yawFromQuaternion(terrain.transform.rotation);
  const depths=[];
  const weights=terrain.heights.map((h,i)=> {
    const world=rotateXZ(p(i),yaw).map((v,j)=>v+terrain.transform.position[j]);
    const length=Math.hypot(...normals[i]),localNormal=normals[i].map(v=>v/length),normal=rotateXZ(localNormal,yaw),mask=c.exposedOnly!==false?(terrain.snowMask?.[i]??1):1;
    const weight=snowWeight(world,normal[1],c)*mask;depths.push(c.physicalThickness*weight*snowDriftFactor(world,normal,c));return weight;
  });
  const result={signature,base:terrain.heights,mask:terrain.snowMask,weights,heights:terrain.heights.map((h,i)=>h+depths[i])};cache.set(terrain,result);return result;
}
export const physicalSnowHeights = terrain => terrainSnow(terrain).heights;
