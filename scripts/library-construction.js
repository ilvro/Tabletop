import * as THREE from 'three';
import {box, cylinder, ring, frame, CRAFT_MATERIALS} from './library-craft-parts.js';
import {craftModel} from './library-craft-models.js';
import {retainCraftSlots} from './library-craft-slots.js';
import {ROCK_PRESETS} from '../src/domain/rocks.js';

const hash=s=>[...s].reduce((a,c)=>(Math.imul(a,31)+c.charCodeAt(0))>>>0,713)%65536;
const woodenSlots=/wood|timber|frame|edge|bark|trunk|beam|oak|board|brace/;
const stoneSlots=/stone|masonry|concrete|plaster|rock|clay|tile|ivory/;
const metalSlots=/metal|brass|iron|rust|steel|lead|copper|shell|drawer/;
const textileSlots=/cloth|fabric|velvet|leather|curtain/;

function finish(material,kind) {
  if(kind==='wood')return {texture:'wood',textureSize:1.8,relief:.004,woodPattern:'grain',woodGrain:.4,woodGap:0,textureColor:material.color,textureColorMode:'replace',textureBrightness:1};
  if(kind==='stone')return {texture:'rock',textureSize:1.4,relief:.006,rockPattern:'granite',rockCracks:.08,textureColor:material.color,textureColorMode:'replace'};
  return null;
}

function family(asset) {
  if(asset.id.includes('backrooms'))return 'liminal';
  if(/Vegetação/.test(asset.category))return 'botanical';
  if(/Montanha|Natureza/.test(asset.category))return 'geological';
  if(/Veículos/.test(asset.category))return 'vehicle';
  if(/Arquitetura|Ruínas/.test(asset.category))return 'architecture';
  if(/Paranormal|Ritual|Religioso/.test(asset.category))return 'ritual';
  if(/Tecnologia|Equipamentos|Instrumentos/.test(asset.category))return 'instrument';
  if(/Industrial|Urbano|Saúde/.test(asset.category))return 'fabrication';
  return 'interior';
}

/** Rebuild construction, not a runtime quality toggle. Every catalogue entry is
 * emitted once, from an immutable source, with reproducible geometry/materials.
 * Original envelopes are retained so saved arrangements continue to fit. */
export function reconstructAsset(asset,source,bounds) {
  const id=asset.id.slice(8),group=family(asset),recipe=structuredClone(source),seed=hash(id);
  recipe.materials={...structuredClone(CRAFT_MATERIALS),...recipe.materials};
  // Materials retain their public slot names, opacity and emissive semantics.
  for(const [slot,m] of Object.entries(recipe.materials)) {
    if(m.emissiveIntensity||m.opacity<1)continue;
    if(metalSlots.test(slot)) {m.metalness=Math.max(m.metalness??0,.35);m.roughness=Math.min(m.roughness??.6,.46);}
    else if(woodenSlots.test(slot))m.roughness=Math.min(m.roughness??.8,.7);
  }
  const authored=craftModel(id,{...recipe,supportHeight:asset.supportHeight},bounds);
  // Authored models may introduce finishes (glass, brass) beside the public slots.
  if(authored?.materials)recipe.materials={...recipe.materials,...Object.fromEntries(Object.entries(authored.materials).filter(([slot])=>!(slot in source.materials)))};
  // Slots named after a colour (`rust` as orange paint or soil) are not metals.
  for(const slot of authored?.matte??[])Object.assign(recipe.materials[slot],{metalness:0,roughness:.9});
  if(authored)recipe.parts=retainCraftSlots(id,authored.parts,bounds);
  const parts=[],methods=new Set(authored?[authored.method]:[]);
  const remaining=()=>200-parts.length;
  const appendLocal=(parent,children)=>{
    const transform=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(parent.rotation??[0,0,0]))),offset=new THREE.Vector3(...parent.position);
    for(const child of children) {
      child.position=new THREE.Vector3(...child.position).applyMatrix4(transform).add(offset).toArray();
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...(parent.rotation??[0,0,0]))).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...(child.rotation??[0,0,0]))));
      child.rotation=new THREE.Euler().setFromQuaternion(q).toArray().slice(0,3);
      if(parent.surface)child.surface=structuredClone(parent.surface);
      parts.push(child);
    }
  };
  for(const [index,part] of recipe.parts.entries()) {
    const p=structuredClone(part),m=recipe.materials[p.material]??{},slot=p.material??'',room=remaining()-(recipe.parts.length-index);
    const wood=woodenSlots.test(slot)&&group!=='liminal',stone=stoneSlots.test(slot)&&!m.emissiveIntensity,metal=metalSlots.test(slot);
    const fabric=(textileSlots.test(slot)||slot==='red'&&/curtain|banner|confessional/.test(id))&&['interior','ritual','fabrication'].includes(group);
    // Respect explicitly authored finishes in later kits; smooth painted parts
    // remain smooth. Shared settings per slot also keep batching effective.
    if(!p.surface&&!m.emissiveIntensity&&m.opacity!==.72) {
      const surface=finish(m,wood?'wood':stone&&group!=='interior'&&!metal?'stone':null);
      if(surface)p.surface=surface;
    }
    if(p.shape==='box') {
      const [w,h,d]=p.size,min=Math.min(w,h,d);
      // Authored models state their own upholstery; `cloth` is also a paint slot.
      const soft=fabric&&!authored;
      p.bevel=p.bevel??Math.min(min*(soft?.3:stone?.085:.13),soft?.035:stone?.012:.009);
      if(p.cushion)methods.add('estofamento com bordas macias');
      else if(soft&&h>.04&&w>.16&&d>.12){p.cushion=true;methods.add('estofamento com bordas macias');}
      else methods.add('arestas chanfradas');
      // Assembled, inset panels retain real thickness instead of drawing a frame
      // on a solid cube; all parts stay inside the original panel envelope.
      if(!authored&&wood&&w>.28&&h>.3&&d<.13&&room>=4) {
        const border=Math.min(.045,w*.1,h*.1),children=frame(w,h,d,[0,0,0],slot,border);
        children.push(box([w-border*2,h-border*2,d*.48],[0,0,-d*.14],slot,null,Math.min(.004,d*.1)));
        for(const child of children)child.bevel=Math.min(.005,Math.min(...child.size)*.13);
        appendLocal(p,children);methods.add('painéis com montantes e rebaixo');continue;
      }
      if(!authored&&['interior','ritual'].includes(group)&&wood&&w>.6&&d>.25&&h<.16&&h>.025&&room>=3) {
        const count=d>.7?5:3,children=[];
        if(room>=count-1){for(let i=0;i<count;i++)children.push(box([w,h,d/count-.002],[0,0,-d/2+(i+.5)*d/count],slot,null,Math.min(.006,h*.12)));appendLocal(p,children);methods.add('tábuas independentes');continue;}
      }
      parts.push(p);
      // Screws and folded rims belong on instrument enclosure panels, never on
      // upholstery, glass, leaves, stone or arbitrary tiny details.
      if(!authored&&['instrument','fabrication'].includes(group)&&!fabric&&w>.2&&h>.16&&d>.035&&room>=6&&(metal||['dark','black','white'].includes(slot))) {
        const hardware=metal?slot:(recipe.materials.metal?'metal':slot),front=d/2-.001;
        appendLocal(p,[-1,1].flatMap(s=>[-1,1].map(t=>cylinder(Math.min(.008,w*.02),.003,[s*(w/2-.025),t*(h/2-.025),front],hardware,Math.min(.008,w*.02),[Math.PI/2,0,0]))));
        if(w>.35&&h>.25&&d>.2&&room>=11)for(let i=0;i<5;i++)appendLocal(p,[box([w*.34,.005,.003],[-w*.15,h*.22-i*.018,front],'black')]);
        methods.add('fixações e grelhas de carcaça');
      }
      continue;
    }
    if(p.shape==='cylinder') {
      // Rolled/turned lips, with the maximum radius preserved. Cones and tiny
      // stems stay cylinders; hollow shades retain their open-ended contract.
      const radius=Math.max(p.radiusTop,p.radiusBottom),height=p.height;
      if(!p.openEnded&&p.radiusTop/p.radiusBottom>.25&&radius>.022&&height>.012&&!m.emissiveIntensity) {
        const edge=Math.min(height*.1,radius*.12,.012),r0=p.radiusBottom,r1=p.radiusTop;
        p.shape='lathe';p.profile=[[0,-height/2],[Math.max(0,r0-edge),-height/2],[r0,-height/2+edge],[r1,height/2-edge],[Math.max(0,r1-edge),height/2],[0,height/2]];
        // Authored parts already carry a tessellation chosen for their size.
        p.segments=authored?.sized?p.segments:radius>.3?32:24;methods.add('perfis torneados e bordas de chapa');
      } else {if(!authored?.sized)p.segments=Math.max(p.segments??12,24);methods.add('curvas de contorno refinadas');}
    } else if(p.shape==='sphere') {
      if(group==='geological') {p.shape='rock';p.size=[p.radius*2,p.radius*2,p.radius*2];p.position[1]-=p.radius;p.seed=(seed+index)%65536;p.detail=4;p.irregularity=.65;p.form='rounded';methods.add('malha mineral irregular');}
      else if(group==='botanical'&&/green|leaf|foliage/.test(slot)) {p.shape='foliage';p.size=[p.radius*2,p.radius*2,p.radius*2];p.position[1]-=p.radius;p.style='broadleaf';p.count=100;p.seed=(seed+index)%65536;methods.add('folhas individuais em volume');}
      else {p.segments=24;p.rings=16;methods.add('volumes curvos refinados');}
    } else if(p.shape==='rock') {if(ROCK_PRESETS[asset.id])p.refinement=1;else p.detail=Math.min(8,(p.detail??3)+1);methods.add('subdivisão mineral preservando parâmetros de escultura');}
    else if(p.shape==='branch') {p.sides=Math.min(12,(p.sides??7)+1);p.segments=Math.min(48,(p.segments??14)+1);methods.add('ramos afilados com secção refinada');}
    else if(p.shape==='conifer') {p.count=Math.max(12,Math.min(120,(p.count??60)+(id.startsWith('dense-')?-4:1)));methods.add('ramagens com agulhas em volume');}
    else if(p.shape==='foliage') {p.count=Math.min(160,Math.ceil((p.count??32)*1.3));methods.add('densidade e nervuras de folhagem');}
    else if(p.shape==='ring') {p.segments=Math.max(p.segments??12,p.radius<.08?14:24);p.sides=Math.max(p.sides??6,6);methods.add('ferragens curvas com vazios reais');}
    else if(p.shape==='rope') {p.segments=Math.min(64,(p.segments??24)+2);p.sides=Math.max(p.sides??6,6);methods.add('cordas e tubos curvos');}
    else if(p.shape==='profile') {p.edgeBevel=Math.min(.003,p.depth*.12);methods.add('entalhes e bordas de perfis');}
    else if(p.shape==='arch') {p.segments=Math.min(32,(p.segments??8)+4);methods.add('arcos com curva refinada');}
    else if(p.shape==='timber') {p.damage=Math.min(.65,(p.damage??.3)+.04);methods.add('madeira lascada');}
    else if(p.shape==='stave') {p.angularSegments=Math.min(8,(p.angularSegments??3)+1);methods.add('aduelas curvas');}
    parts.push(p);
  }
  if(parts.length>200)throw new Error(`${id}: excedeu orçamento de peças (${parts.length})`);
  recipe.parts=parts;recipe.mergeParts=true;recipe.fitBounds=bounds;
  recipe.design={edition:2,family:group,reconstruction:authored?'model':'components',methods:[...methods],seed};
  // Do not ship the entire global palette for every object.
  // Reflections are off by default: without an environment, a fully metallic
  // surface has no diffuse response and reads as black in ordinary scenes.
  for(const m of Object.values(recipe.materials))if(m.metalness>.5)m.metalness=.5;
  const used=new Set(parts.map(p=>p.material));recipe.materials=Object.fromEntries(Object.entries(recipe.materials).filter(([slot])=>used.has(slot)));
  return recipe;
}
