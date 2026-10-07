import { FLICKER_DEFAULTS } from './lighting.js';

export const LIGHT_PROFILES = [
  { id:'candle', name:'Vela / candelabro', color:'#ffbf75', intensity:12, distance:5, type:'point', animated:true },
  { id:'torch', name:'Tocha / lareira', color:'#ffa35b', intensity:55, distance:9, type:'point', animated:true },
  { id:'lamp', name:'Lâmpada acolhedora', color:'#ffe0ad', intensity:70, distance:10, type:'point' },
  { id:'fluorescent', name:'Fluorescente', color:'#dcecff', intensity:95, distance:12, type:'spot' },
  { id:'window', name:'Janela / vitral', color:'#dddfff', intensity:120, distance:18, type:'spot', projection:'stained' },
  { id:'ritual', name:'Luz ritual', color:'#ff2540', intensity:85, distance:12, type:'point' },
];
export const QUALITY = {
  economy:{name:'Econômica',locals:4,shadowViews:2,mapSize:512,steps:8},
  balanced:{name:'Equilibrada',locals:8,shadowViews:6,mapSize:1024,steps:12},
  high:{name:'Alta',locals:16,shadowViews:12,mapSize:1024,steps:20},
  custom:{name:'Personalizada',locals:8,shadowViews:6,mapSize:1024,steps:12},
};
export const PROJECTIONS = ['none','stained','bars','leaves'];
export const RENDERING_DEFAULTS = { reflections:false, reflectionIntensity:.35, ao:false, aoIntensity:.35, aoRadius:.6, volumetricLights:false, volumeStrength:.5, cutawayShadows:false };
export const ZONE_DEFAULTS = { enabled:true, position:[0,2,0], size:[8,4,8], blend:.5, priority:10, color:'#adbfdb', intensity:.35, fogColor:'#9daac2', fogDensity:0 };
export const LIGHT_PIN_FIELDS = ['color','intensity','distance','position','rotation','emissionSlot','emissionIntensity','phase','flicker','shadowPolicy','mapSize','priority','projection','projectionSeed','projectionRotation','angle','penumbra'];
export function illuminationDefaults(profile='candle', host={}, current=null) {
  const p=LIGHT_PROFILES.find(p=>p.id===profile);if(!p)throw new Error('Perfil de iluminação inválido.');
  const next={enabled:true,profile,mode:'assisted',type:p.type,color:p.color,intensity:p.intensity,distance:p.distance,position:[0,host.supportHeight??(host.kind==='prop'?.8:2.2),0],rotation:[0,0,0,1],angle:Math.PI/4,penumbra:.5,phase:'always',emissionSlot:'none',emissionIntensity:1.5,
    flicker:{...FLICKER_DEFAULTS,pattern:profile==='fluorescent'?'fluorescent':'candle',enabled:!!p.animated,amplitude:.12},priority:10,shadowPolicy:'auto',mapSize:1024,projection:p.projection??'none',projectionSeed:42,projectionRotation:0,pinned:[]};
  if(current){next.position=structuredClone(current.position);next.rotation=structuredClone(current.rotation);next.pinned=[...current.pinned];for(const key of current.pinned)next[key]=structuredClone(current[key]);}
  if(next.projection!=='none')next.type='spot';
  return next;
}
export function lightPhaseActive(config,look) {return config?.enabled!==false && (config.phase==='always'||(config.phase==='night')===(look.daylight?.phase==='night'));}
export function illuminationPatch(current,field,value,host) {
  if(field==='profile')return value==='none'?null:illuminationDefaults(value,host,current);
  if(!current)throw new Error('Escolha um perfil de iluminação.');
  const next=structuredClone(current);
  if(field.startsWith('position-'))next.position[Number(field.slice(-1))]=value;
  else if(field.startsWith('flicker-'))next.flicker[field.slice(8)]=value;
  else if(field.startsWith('pin-')){const key=field.slice(4);next.pinned=next.pinned.filter(k=>k!==key);if(value)next.pinned.push(key);}
  else if(field==='angle')next.angle=value*Math.PI/360;
  else next[field]=value;
  const pin=field.startsWith('position-')?'position':field.startsWith('flicker-')?'flicker':field;
  if(!field.startsWith('pin-')&&LIGHT_PIN_FIELDS.includes(pin)&&!next.pinned.includes(pin))next.pinned.push(pin);
  return next;
}

/** Pure budget selection; stable IDs and a retention bonus avoid changes near equal scores. */
export function selectLightBudget(candidates,quality,previous=new Set()) {
  const sorted=candidates.filter(c=>c.active&&c.score>0).map(c=>({...c,score:c.score*(previous.has(c.id)?1.2:1)+(c.priority??0)*1000})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const selected=sorted.slice(0,quality.locals);let views=0;
  const shadows=new Set();
  for(const c of [...selected].sort((a,b)=>(b.shadowPolicy==='priority')-(a.shadowPolicy==='priority')||b.score-a.score)){
    const cost=c.type==='point'?6:1;
    if(c.shadowPolicy!=='off'&&c.shadowEnabled!==false&&views+cost<=quality.shadowViews){views+=cost;shadows.add(c.id);}
  }
  return {selected,shadows,views,omitted:sorted.length-selected.length};
}
