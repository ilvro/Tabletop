import { localPoint, worldPoint, floorContour, pointInPolygon } from '../domain/geometry.js';
import { ValidationError } from '../domain/validation.js';

function brushSettings(options = {}) {
  const settings = { mode: 'raise', radius: 2, strength: .25, target: 0, shape: 'circle', hardness: 0, snap: false, rockPattern: 'fractured', rockSize: 3, rockSeed: 42, ...options };
  const { mode, radius, strength, target, shape, hardness, snap, rockPattern, rockSize, rockSeed } = settings;
  if (!['raise','lower','smooth','flatten','rock','paint','erase','water'].includes(mode) || !['circle','square'].includes(shape) || !Number.isFinite(radius) || radius <= 0 || radius > 100 || !Number.isFinite(strength) || strength <= 0 || strength > 10 || !Number.isFinite(target) || !Number.isFinite(hardness) || hardness < 0 || hardness > 1 || typeof snap !== 'boolean' || !['fractured','strata','granite'].includes(rockPattern) || !Number.isFinite(rockSize) || rockSize < .1 || rockSize > 100 || !Number.isInteger(rockSeed) || rockSeed < 0 || rockSeed > 65535) throw new ValidationError('Pincel de terreno inválido.');
  return settings;
}

const fract = v => v-Math.floor(v);
function rockNoise(x,z,seed) {
  const ix=Math.floor(x), iz=Math.floor(z), smooth=v=>{v=fract(v);return v*v*(3-2*v);};
  const fx=smooth(x), fz=smooth(z), at=(a,b)=>fract(Math.sin((ix+a)*127.1+(iz+b)*311.7+seed*19.19)*43758.5453);
  return (at(0,0)*(1-fx)+at(1,0)*fx)*(1-fz)+(at(0,1)*(1-fx)+at(1,1)*fx)*fz;
}

/** A continuous world-space field, so adjacent stamps do not repeat the same rock silhouette. */
export function rockyHeight(x,z,{rockPattern='fractured',rockSize=3,rockSeed=42}={}) {
  x/=rockSize;z/=rockSize;
  const broad=rockNoise(x,z,rockSeed), detail=rockNoise(x*4,z*4,rockSeed+17);
  if(rockPattern==='strata') {
    const h=(broad*.8+rockNoise(x*.4,z*.4,rockSeed+31)*.2)*5;
    const step=fract(h), transition=Math.max(0,Math.min(1,(step-.75)/.25));
    return ((Math.floor(h)+transition*transition*(3-2*transition))/5-.5)*2;
  }
  if(rockPattern==='granite') return (broad-.5)*1.6+(detail-.5)*.25;
  const ridges=1-Math.abs(broad*2-1);
  return (ridges-.6)*1.8+(detail-.5)*.35;
}

export function terrainBrushCenter(terrain, position, options = {}) {
  const point = localPoint(terrain, position);
  if (options.snap) {
    point[0] = (Math.round((point[0] / terrain.width + .5) * terrain.segments) / terrain.segments - .5) * terrain.width;
    point[2] = (Math.round((point[2] / terrain.length + .5) * terrain.segments) / terrain.segments - .5) * terrain.length;
  }
  return point;
}

function weightAt(terrain, index, point, settings) {
  const n = terrain.segments, x = index % (n + 1), z = Math.floor(index / (n + 1));
  const dx = Math.abs((x / n - .5) * terrain.width - point[0]), dz = Math.abs((z / n - .5) * terrain.length - point[2]);
  const distance = settings.shape === 'square' ? Math.max(dx, dz) : Math.hypot(dx, dz);
  if (distance > settings.radius) return 0;
  if (distance <= settings.radius * settings.hardness) return 1;
  const t = 1 - (distance - settings.radius * settings.hardness) / (settings.radius * (1 - settings.hardness));
  return t * t * (3 - 2 * t);
}

/** The cursor follows the same local axes and snapped center as the actual stamp. */
export function terrainBrushOutline(terrain, position, options = {}) {
  const settings = brushSettings(options), center = terrainBrushCenter(terrain, position, settings);
  return Array.from({ length: 49 }, (_, i) => {
    const angle = i / 48 * Math.PI * 2;
    let dx = Math.cos(angle), dz = Math.sin(angle);
    if (settings.shape === 'square') { const edge = Math.max(Math.abs(dx), Math.abs(dz)); dx /= edge; dz /= edge; }
    return worldPoint(terrain, [center[0] + dx * settings.radius, 0, center[2] + dz * settings.radius]);
  });
}

/** One stamp is pure; a pointer gesture collects stamps into one undoable edit. */
export function sculptTerrain(terrain, position, options = {}) {
  const settings = brushSettings(options), { mode, strength, target } = settings;
  if (terrain.kind !== 'terrain' || ['paint','erase','water'].includes(mode)) throw new ValidationError('Ferramenta de relevo inválida.');
  const point = terrainBrushCenter(terrain, position, settings), n = terrain.segments, before = terrain.heights;
  return before.map((height, index) => {
    const weight = weightAt(terrain, index, point, settings); if (!weight) return height;
    const x = index % (n + 1), z = Math.floor(index / (n + 1));
    let result;
    if (mode === 'rock') {
      const p=worldPoint(terrain,[(x/n-.5)*terrain.width,0,(z/n-.5)*terrain.length]);
      result=height+rockyHeight(p[0],p[2],settings)*strength*weight;
    } else if (mode === 'raise' || mode === 'lower') result = height + (mode === 'raise' ? 1 : -1) * strength * weight;
    else {
      const neighbors = [];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx <= n && z + dz >= 0 && z + dz <= n) neighbors.push(before[(z + dz) * (n + 1) + x + dx]);
      const desired = mode === 'flatten' ? target - terrain.transform.position[1] : neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      result = height + (desired - height) * Math.min(1, strength) * weight;
    }
    return Math.max(-1000, Math.min(1000, result));
  });
}

/** Paint changes only the active mask; erasing reveals the layers underneath. */
export function paintTerrain(terrain, position, options = {}) {
  const settings = brushSettings(options);
  const layer = terrain.paintLayers?.find(entry => entry.id === settings.layerId);
  if (terrain.kind !== 'terrain' || !['paint','erase'].includes(settings.mode) || !layer || !layer.visible) throw new ValidationError('Escolha uma camada de cor visível para pintar.');
  if (layer.distribution && layer.distribution.mode !== 'paint') throw new ValidationError('Esta camada usa distribuição automática. Escolha Pintura manual em Editar material para pintar ou apagar.');
  const point = terrainBrushCenter(terrain, position, settings);
  return terrain.paintLayers.map(entry => entry.id !== layer.id ? structuredClone(entry) : { ...structuredClone(entry), weights: entry.weights.map((weight, index) => Math.max(0, Math.min(1, weight + (settings.mode === 'erase' ? -1 : 1) * Math.min(1, settings.strength) * weightAt(terrain, index, point, settings)))) });
}

/** Resampling preserves both height and paint masks when changing mesh detail. */
export function resampleTerrain(terrain, segments) {
  if (!Number.isInteger(segments) || segments < 2 || segments > 64) throw new ValidationError('O terreno aceita de 2 a 64 divisões por eixo.');
  const sample = values => Array.from({ length: (segments + 1) ** 2 }, (_, index) => {
    const x = index % (segments + 1) / segments * terrain.segments, z = Math.floor(index / (segments + 1)) / segments * terrain.segments;
    const x0 = Math.floor(x), z0 = Math.floor(z), x1 = Math.min(terrain.segments, x0 + 1), z1 = Math.min(terrain.segments, z0 + 1), tx = x - x0, tz = z - z0;
    const at = (x, z) => values[z * (terrain.segments + 1) + x];
    return (at(x0,z0) * (1-tx) + at(x1,z0) * tx) * (1-tz) + (at(x0,z1) * (1-tx) + at(x1,z1) * tx) * tz;
  });
  return { segments, heights: sample(terrain.heights), ...(terrain.snowMask?{snowMask:sample(terrain.snowMask)}:{}), ...(terrain.paintLayers ? { paintLayers: terrain.paintLayers.map(layer => ({ ...structuredClone(layer), weights: sample(layer.weights) })) } : {}) };
}

/** Expanding samples in local metres; stretching explicitly keeps normalized heights/masks. */
export function resizeTerrain(terrain,{width=terrain.width,length=terrain.length,mode='extend'}={}) {
  if(terrain.kind!=='terrain' || ![width,length].every(v=>Number.isFinite(v)&&v>=.1&&v<=1000) || !['extend','stretch'].includes(mode)) throw new ValidationError('Dimensões do terreno inválidas (0,1–1000 m).');
  if(mode==='stretch') return {width,length};
  const segments=Math.min(64,Math.max(terrain.segments,Math.ceil(terrain.segments*Math.max(width/terrain.width,length/terrain.length))));
  const sample=values=>Array.from({length:(segments+1)**2},(_,i)=>{
    const x=Math.max(0,Math.min(terrain.segments,((i%(segments+1)/segments-.5)*width/terrain.width+.5)*terrain.segments));
    const z=Math.max(0,Math.min(terrain.segments,((Math.floor(i/(segments+1))/segments-.5)*length/terrain.length+.5)*terrain.segments));
    const x0=Math.floor(x),z0=Math.floor(z),x1=Math.min(terrain.segments,x0+1),z1=Math.min(terrain.segments,z0+1),tx=x-x0,tz=z-z0;
    const at=(a,b)=>values[b*(terrain.segments+1)+a];
    return (at(x0,z0)*(1-tx)+at(x1,z0)*tx)*(1-tz)+(at(x0,z1)*(1-tx)+at(x1,z1)*tx)*tz;
  });
  return {width,length,segments,heights:sample(terrain.heights),...(terrain.snowMask?{snowMask:sample(terrain.snowMask)}:{}),...(terrain.paintLayers?{paintLayers:terrain.paintLayers.map(layer=>({...structuredClone(layer),weights:sample(layer.weights)}))}:{})};
}

function edgeDistance(point,polygon) {
  let distance=Infinity;
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/(dx*dx+dz*dz)));
    distance=Math.min(distance,Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz));
  }
  return distance;
}

/** Cap below solid floor footprints plus a cell-diagonal buffer to protect crossing triangles. */
export function protectTerrainFloors(terrain,entities) {
  const margin=Math.hypot(terrain.width,terrain.length)/terrain.segments, fade=Math.max(1,margin);
  const floors=Object.values(entities).filter(e=>e.kind==='floor').map(floor=>{
    const polygon=floorContour(floor), xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);
    return {floor,polygon,bounds:[Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)]};
  });
  return terrain.heights.map((height,i)=>{
    const p=worldPoint(terrain,[(i%(terrain.segments+1)/terrain.segments-.5)*terrain.width,0,(Math.floor(i/(terrain.segments+1))/terrain.segments-.5)*terrain.length]);
    for(const {floor,polygon,bounds} of floors) {
      const local=localPoint(floor,p), point=[local[0],local[2]], buffer=margin+fade;
      if(point[0]<bounds[0]-buffer||point[0]>bounds[1]+buffer||point[1]<bounds[2]-buffer||point[1]>bounds[3]+buffer) continue;
      const hole=floor.holes?.find(ring=>pointInPolygon(point,ring));
      const distance=hole?edgeDistance(point,hole):pointInPolygon(point,polygon)?0:edgeDistance(point,polygon);
      if(distance>=buffer) continue;
      const cap=Math.max(-1000,Math.min(1000,floor.transform.position[1]-floor.thickness-.04-terrain.transform.position[1]));
      const blend=Math.max(0,Math.min(1,(distance-margin)/fade)), smooth=blend*blend*(3-2*blend);
      // An absolute envelope is idempotent: repeated strokes/previews never dig this margin deeper.
      height=Math.min(height,cap+fade*smooth/Math.max(1e-12,1-smooth));
    }
    return height;
  });
}
