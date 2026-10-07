import * as THREE from 'three';
export function createProjectionLibrary() {
  const entries=new Map();
  return {
    acquire(pattern,seed=42,rotation=0){if(!pattern||pattern==='none')return null;const key=[pattern,seed,rotation].join(':');let entry=entries.get(key);
      if(!entry){const n=128,data=new Uint8Array(n*n*4),r=rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);let random=seed>>>0;const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};const leaves=Array.from({length:28},()=>[rand(),rand(),.03+rand()*.12]);const palette=[[230,35,70],[55,90,255],[255,165,45],[180,60,240]];
        for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=(x/n-.5)*c-(y/n-.5)*s+.5,v=(x/n-.5)*s+(y/n-.5)*c+.5;let rgb=[255,255,255];
          if(pattern==='bars'){const frame=Math.min(Math.abs(u*7-Math.round(u*7)),Math.abs(v*7-Math.round(v*7)));rgb=frame<.09?[5,5,5]:rgb;}
          else if(pattern==='stained'){const a=u*6,b=v*8,edge=Math.min(a-Math.floor(a),b-Math.floor(b));rgb=edge<.08?[2,2,2]:palette[(Math.floor(a)+Math.floor(b)*3+seed)%4]??palette[0];}
          else {const dark=leaves.some(([a,b,r])=>((u-a)/r)**2+((v-b)/(r*.6))**2<1);rgb=dark?[15,25,15]:rgb;}
          data.set([...rgb,255],(y*n+x)*4);
        }
        const texture=new THREE.DataTexture(data,n,n);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;entry={texture,refs:0,key};entries.set(key,entry);
      }entry.refs++;return entry;
    },
    release(entry){if(entry&&--entry.refs===0){entry.texture.dispose();entries.delete(entry.key);}},
    dispose(){for(const e of entries.values())e.texture.dispose();entries.clear();},
    get size(){return entries.size;},
  };
}
