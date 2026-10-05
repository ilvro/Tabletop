import {rockDefaults} from './rocks.js';

export const ROCK_SCULPT_LIMIT=512;
export const ROCK_SCULPT_TRIANGLES=48000;
export const ROCK_SCULPT_MODES=['raise','lower','push','pull','smooth','flatten'];
export const isSculptableRock=record=>record?.kind==='prop'&&!!rockDefaults(record.assetRef?.id);

/** JSON boundary shared by command validation and runtime replay, with no renderer dependency. */
export function assertRockSculpt(value) {
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
  const vec=(v,min,max)=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&n>=min&&n<=max);
  if(!object(value)||Object.keys(value).some(k=>k!=='stamps')||!Array.isArray(value.stamps)||value.stamps.length>ROCK_SCULPT_LIMIT)throw new Error('Escultura de rocha inválida (máximo de 512 amostras).');
  for(const s of value.stamps) {
    if(!object(s)||Object.keys(s).some(k=>!['mode','center','radius','normal','delta','blend','plane','hardness'].includes(k))||!ROCK_SCULPT_MODES.includes(s.mode)||!vec(s.center,-10000,10000)||!vec(s.radius,.000001,1000000)||!vec(s.normal,-1,1)||Math.abs(Math.hypot(...s.normal)-1)>.001||!vec(s.delta,-10000,10000)||!Number.isFinite(s.blend)||s.blend<0||s.blend>1||!vec(s.plane,-10000,10000)||!Number.isFinite(s.hardness)||s.hardness<0||s.hardness>1)throw new Error('Amostra de escultura inválida.');
  }
  return value;
}
