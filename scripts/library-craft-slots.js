import {box,cylinder} from './library-craft-parts.js';

// Material names are public editor handles. Keep the old handles on their
// corresponding components when a silhouette is replaced.
export function retainCraftSlots(id,parts,[w,h,d]) {
  const remaps={desk:{dark:'edge'},crate:{wood:'board',metal:'strap'},wardrobe:{brass:'metal'},coffin:{brass:'metal'},candles:{black:'dark'},armchair:{cloth:'red'},'bedside-table':{brass:'metal'},dresser:{brass:'metal'},'restaurant-booth':{cloth:'red',dark:'paper',wood:'dark'},typewriter:{paper:'white'},sedan:{glass:'screen',paper:'white'},'delivery-van':{glass:'screen'},'police-car':{paper:'white'},'card-catalog':{brass:'metal'}};
  for(const p of parts)p.material=remaps[id]?.[p.material]??p.material;
  if(id==='crate')for(const p of parts)if(p.shape==='box'&&p.size[0]===.055)p.material='brace';
  if(id==='lamp'){parts[0].profile=parts[0].profile.filter(([,y])=>y<=.15);parts[0].profile.push([0,.15]);parts[0].material='dark';parts.push(cylinder(w*.045,h*.68,[0,h*.44,0],'brass'));}
  if(['wardrobe','bedside-table','dresser','card-catalog'].includes(id))for(const p of parts)if(p.shape==='box'&&p.size[2]<.03&&p.position[2]>d*.4)p.material='dark';
  if(id==='card-catalog')for(let row=0;row<5;row++)for(let col=0;col<4;col++)parts.push(box([w*.08,h*.019,.006],[(col-1.5)*w*.89/4,h*.06+.045+(row+.5)*(h*.94-.16)/5+h*.022,d*.49],'paper'));
  if(id==='barrel')parts.push(cylinder(w*.465,.008,[0,.004,0],'dark'));
  if(id==='gurney')parts.find(p=>p.cushion&&p.size[2]<d*.4).material='cloth';
  if(id==='coffin')parts[0].material='dark';
  if(id==='rock'||id==='broken-wall')parts.at(-1).material='dark';
  if(id==='toilet')parts.push(cylinder(.017,.006,[0,h*.32,d*.12],'dark'));
  if(id==='typewriter'){parts.find(p=>p.shape==='cylinder').material='metal';parts.find(p=>p.shape==='box'&&p.rotation).material='paper';}
  if(id==='laptop')parts.find(p=>p.shape==='box'&&p.size[2]>d*.35).material='metal';
  if(id==='dead-tree')parts[0].material='dark';
  if(id==='ritual-mask')parts.push(box([w*.22,h*.035,d*.025],[0,h*.665,d*.23],'red'),box([w*.06,h*.035,d*.08],[0,h*.665,d*.3],'paper'));
  if(id==='stone-sarcophagus'){parts.at(-1).material='dark';parts.push(box([w*.25,.005,d*.08],[0,h*.967,d*.19],'paper'));}
  if(id==='delivery-van')parts[0].material='cloth';
  if(id==='body-bag')parts.push(box([w*.22,.002,d*.038],[w*.18,h*.89,-d*.24],'white'));
  if(id==='church-pointed-chair')for(const s of [-1,1])parts.push(cylinder(.012,.006,[s*w*.3,h*.32,d*.35],'brass',.012,[Math.PI/2,0,0]));
  return parts;
}
