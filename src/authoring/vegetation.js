import { createEntity, id } from '../domain/documents.js';
import { isVegetationAsset } from '../domain/landscape.js';
import { worldPoint, supportHeightAt, worldFootprint, footprintsOverlap, floorContour, localPoint, isLocked } from '../domain/geometry.js';
import { quaternionFromYaw } from '../domain/coords.js';
import { ValidationError } from '../domain/validation.js';
export function proposeVegetation(document,options,expectedEditVersion,catalog) {
  const {terrainId,assetId='builtin-dense-alpine-fir',count=6,seed=42,scaleMin=.7,scaleMax=1.2,slopeMax=35}=options;
  const terrain=document.layout.entities[terrainId],asset=catalog.find(a=>a.id===assetId);
  if(terrain?.kind!=='terrain' || isLocked(document,terrain) || !isVegetationAsset(assetId) || !asset || !Number.isInteger(count)||count<1||count>128||!Number.isInteger(seed)||seed<0||seed>65535||![scaleMin,scaleMax,slopeMax].every(Number.isFinite)||scaleMin<.1||scaleMax<scaleMin||scaleMax>5||slopeMax<0||slopeMax>70)throw new ValidationError('Escolha terreno desbloqueado, vegetação e parâmetros válidos.');
  let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const entities=[], occupied=Object.values(document.layout.entities).filter(e=>e.kind==='prop').map(e=>worldFootprint(e,.15)), floors=Object.values(document.layout.entities).filter(e=>e.kind==='floor');
  const water=Object.values(document.layout.entities).filter(e=>e.kind==='water');
  for(let attempts=0;entities.length<count && attempts<count*80;attempts++) {
    const scale=scaleMin+random()*(scaleMax-scaleMin),position=worldPoint(terrain,[(random()-.5)*terrain.width,0,(random()-.5)*terrain.length]);position[1]=supportHeightAt(terrain,position);
    const entity=createEntity('prop',{name:asset.name,assetRef:{id:asset.id,revision:asset.revision},footprint:asset.footprint,position,scale:[scale,scale,scale],rotation:quaternionFromYaw(random()*360),surfaceId:terrain.id,vegetationSeed:Math.floor(random()*65536),...(terrain.layerId!==undefined?{layerId:terrain.layerId}:{}),...(terrain.levelId!==undefined?{levelId:terrain.levelId}:{})});
    const footprint=worldFootprint(entity,.15), local=footprint.map(([x,z])=>localPoint(terrain,[x,0,z]));
    if(local.some(p=>Math.abs(p[0])>terrain.width/2 || Math.abs(p[2])>terrain.length/2))continue;
    if(occupied.some(p=>footprintsOverlap(p,footprint)))continue;
    // Conservative exclusion of the whole floor footprint, including roofed courtyards and concave shapes.
    if([...floors,...water].some(f=>footprintsOverlap(floorContour(f).map(([x,z])=>{const p=worldPoint(f,[x,0,z]);return [p[0],p[2]];}),footprint)))continue;
    const h=position[1], sample=.4;
    const dx=(supportHeightAt(terrain,[position[0]+sample,h,position[2]])-supportHeightAt(terrain,[position[0]-sample,h,position[2]]))/(sample*2), dz=(supportHeightAt(terrain,[position[0],h,position[2]+sample])-supportHeightAt(terrain,[position[0],h,position[2]-sample]))/(sample*2);
    if(Math.atan(Math.hypot(dx,dz))*180/Math.PI>slopeMax)continue;
    occupied.push(footprint);entities.push(entity);
  }
  if(!entities.length)throw new ValidationError('Não há espaço adequado. Amplie o terreno, reduza escala/quantidade ou permita encostas maiores.');
  return {id:id(),expectedEditVersion,label:'Distribuir vegetação',entities,lights:[],groups:[],areas:[],updates:[],removals:[],report:{reasons:[`${entities.length} de ${count} plantas propostas; respeita bordas, construções, água, objetos e inclinação.`,`Variações de geometria, escala e rotação com seed ${seed}. Cada planta permanece editável; aceitar = um desfazer.`]}};
}
