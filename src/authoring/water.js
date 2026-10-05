import { createEntity, id } from '../domain/documents.js';
import { localPoint, worldPoint, floorContour, pointInPolygon, polygonIsSimple, polygonSize, isLocked } from '../domain/geometry.js';
import { ValidationError } from '../domain/validation.js';

const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function distance(point,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz);
}
const edgeDistance = (p,ring) => Math.min(...ring.map((a,i)=>distance(p,a,ring[(i+1)%ring.length])));
const ringIn = (record,terrain) => floorContour(record).map(([x,z])=>{const p=localPoint(terrain,worldPoint(record,[x,0,z]));return [p[0],p[2]];});
function overlaps(a,b) {
  if(a.some(p=>pointInPolygon(p,b)) || b.some(p=>pointInPolygon(p,a))) return true;
  return a.some((p,i)=>b.some((q,j)=>cross(p,a[(i+1)%a.length],q)*cross(p,a[(i+1)%a.length],b[(j+1)%b.length])<0 && cross(q,b[(j+1)%b.length],p)*cross(q,b[(j+1)%b.length],a[(i+1)%a.length])<0));
}

/** Conservative clearance for every triangle under the water, including waves and physical snow. */
export function waterBedHeights(terrain,waters,entities) {
  const rings=waters.map(w=>({ring:ringIn(w,terrain),y:w.transform.position[1],depth:w.depth,wave:w.water.state==='ice'?0:w.water.waveHeight}));
  const floors=Object.values(entities).filter(e=>e.kind==='floor').map(f=>ringIn(f,terrain));
  if(rings.some(({ring})=>floors.some(f=>overlaps(ring,f)))) throw new ValidationError('A água atravessa uma construção. Mova ou redesenhe o contorno fora dos pisos antes de ajustar o leito.');
  const cell=Math.hypot(terrain.width/terrain.segments,terrain.length/terrain.segments);
  const snow=terrain.material.coverage?.texture==='snow'?(terrain.material.coverage.physicalThickness??0):0;
  return terrain.heights.map((h,i)=>{
    const p=[(i%(terrain.segments+1)/terrain.segments-.5)*terrain.width,(Math.floor(i/(terrain.segments+1))/terrain.segments-.5)*terrain.length];
    let result=h;
    for(const {ring,y,depth,wave} of rings) {
      const d=pointInPolygon(p,ring)?0:edgeDistance(p,ring);
      if(d>cell*2)continue;
      // Keep a fully cleared triangle-wide margin, then a gentle bank transition.
      const weight=Math.min(1,Math.max(0,2-d/cell));
      const cap=y-terrain.transform.position[1]-Math.max(.1,depth)-wave-snow-.03;
      result=Math.min(result,h+(Math.min(h,cap)-h)*weight);
    }
    return result;
  });
}

function proposal(terrain,waters,heights,version,create=true) {
  return {id:id(),expectedEditVersion:version,label:create?'Pintar água e escavar leito':'Ajustar leito da água',entities:create?waters:[],lights:[],groups:[],areas:[],updates:[{kind:'entity',id:terrain.id,patch:{heights}}],removals:[],report:{reasons:[`${waters.length} superfície(s) de água; leito ajustado no terreno ${terrain.name}.`,`O nível é horizontal. Revise margens e apoios: aceitar altera água e relevo em uma única operação desfazível.`]}};
}
export function proposeWaterBed(document,terrainId,waterId,version) {
  const terrain=document.layout.entities[terrainId],water=document.layout.entities[waterId];
  if(terrain?.kind!=='terrain' || water?.kind!=='water' || isLocked(document,terrain)||isLocked(document,water))throw new ValidationError('Escolha água e terreno desbloqueados.');
  const ring=ringIn(water,terrain);
  if(ring.some(p=>Math.abs(p[0])>terrain.width/2 || Math.abs(p[1])>terrain.length/2))throw new ValidationError('O contorno deve ficar dentro do terreno escolhido. Expanda o terreno ou ajuste a água.');
  return proposal(terrain,[water],waterBedHeights(terrain,[water],document.layout.entities),version,false);
}

/** Rasterize the stroke at terrain resolution, trace its exterior, then retain ordinary polygons. */
export function proposeWaterBrush(document,terrainId,points,options,version) {
  const terrain=document.layout.entities[terrainId],{radius=2,waterLevel=.05,waterDepth=.6}=options;
  if(terrain?.kind!=='terrain'||isLocked(document,terrain)||!Array.isArray(points)||!points.length||points.length>2048||points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))||![radius,waterLevel,waterDepth].every(Number.isFinite)||radius<.1||radius>100||waterDepth<.1||waterDepth>20)throw new ValidationError('Parâmetros do pincel de água inválidos.');
  const n=terrain.segments,dx=terrain.width/n,dz=terrain.length/n;
  if(radius<Math.max(dx,dz)*.6)throw new ValidationError('O pincel é menor que a malha. Aumente o raio ou as divisões do terreno.');
  const path=points.map(p=>{const q=localPoint(terrain,p);return [q[0],q[2]];}),occupied=new Set(),floors=Object.values(document.layout.entities).filter(e=>e.kind==='floor').map(f=>ringIn(f,terrain));
  for(let z=0;z<n;z++)for(let x=0;x<n;x++) {
    const p=[(x+.5)*dx-terrain.width/2,(z+.5)*dz-terrain.length/2];
    let d=path.length===1?Math.hypot(p[0]-path[0][0],p[1]-path[0][1]):Infinity;
    for(let i=1;i<path.length && d>radius;i++) d=Math.min(d,distance(p,path[i-1],path[i]));
    if(d<=radius && !floors.some(f=>pointInPolygon(p,f)||edgeDistance(p,f)<=Math.hypot(dx,dz)))occupied.add(`${x},${z}`);
  }
  const edges=new Map(),key=p=>p.join(',');
  const add=(a,b)=>{const k=key(a);if(!edges.has(k))edges.set(k,[]);edges.get(k).push(b);};
  for(const cell of occupied){const [x,z]=cell.split(',').map(Number);if(!occupied.has(`${x},${z-1}`))add([x,z],[x+1,z]);if(!occupied.has(`${x+1},${z}`))add([x+1,z],[x+1,z+1]);if(!occupied.has(`${x},${z+1}`))add([x+1,z+1],[x,z+1]);if(!occupied.has(`${x-1},${z}`))add([x,z+1],[x,z]);}
  const loops=[];
  while(edges.size) {
    const start=edges.keys().next().value.split(',').map(Number),ring=[],first=key(start);let p=start,previous=[start[0]-1,start[1]];
    for(let steps=0;steps<n*n*4+4;steps++) {
      ring.push(p);const list=edges.get(key(p));if(!list?.length)break;
      const angle=b=>{const incoming=Math.atan2(p[1]-previous[1],p[0]-previous[0]),out=Math.atan2(b[1]-p[1],b[0]-p[0]);return (out-incoming+Math.PI*2)%(Math.PI*2);};
      list.sort((a,b)=>Math.abs(angle(a)-Math.PI/2)-Math.abs(angle(b)-Math.PI/2));
      const q=list.shift();if(!list.length)edges.delete(key(p));previous=p;p=q;if(key(p)===first)break;
    }
    // Positive area is an exterior. Holes are filled; constructs are checked again after tracing.
    const area=ring.reduce((s,a,i)=>s+a[0]*ring[(i+1)%ring.length][1]-a[1]*ring[(i+1)%ring.length][0],0);
    if(area<=0)continue;
    let clean=ring.filter((p,i)=>Math.abs(cross(ring[(i+ring.length-1)%ring.length],p,ring[(i+1)%ring.length]))>1e-8).map(([x,z])=>[x*dx-terrain.width/2,z*dz-terrain.length/2]);
    // Too intricate for the serialized polygon contract: ask for separate strokes instead of changing shape silently.
    if(!polygonIsSimple(clean))throw new ValidationError('Contorno muito complexo. Faça traços menores e separados; cada superfície aceita até 64 vértices.');
    loops.push(clean);
  }
  if(!loops.length || loops.length>8)throw new ValidationError('Não há área livre suficiente. Use um traço menor, longe das construções.');
  const waters=loops.map(vertices=>{
    const position=worldPoint(terrain,[0,0,0]);position[1]=waterLevel;
    const [width,length]=polygonSize(vertices);
    return createEntity('water',{name:'Água · pincel de terreno',position,rotation:terrain.transform.rotation,vertices,width,length,depth:waterDepth,...(terrain.levelId?{levelId:terrain.levelId}:{}),...(terrain.layerId?{layerId:terrain.layerId}:{})});
  });
  return proposal(terrain,waters,waterBedHeights(terrain,waters,document.layout.entities),version);
}
