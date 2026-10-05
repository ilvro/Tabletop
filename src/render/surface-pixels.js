import * as THREE from 'three';
import { SURFACE_MATERIALS, surfacePreset, textureOptions } from '../domain/materials.js';

export const TILE_SIZE = 256;
const SIZE = TILE_SIZE;
const fract = x => x - Math.floor(x);
const hash = (x, y, seed = 1) => fract(Math.sin(x * 127.1 + y * 311.7 + seed * 71.3) * 43758.5453);
const smooth = x => x * x * (3 - 2 * x);
function noise(u, v, frequency, seed) {
  const x = u * frequency, y = v * frequency, ix = Math.floor(x), iy = Math.floor(y), fx = smooth(fract(x)), fy = smooth(fract(y));
  const wrap=v=>(v%frequency+frequency)%frequency;
  const at = (dx, dy) => hash(wrap(ix+dx),wrap(iy+dy),seed);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(0,0), at(1,0), fx), THREE.MathUtils.lerp(at(0,1), at(1,1), fx), fy);
}
function fracture(u, v, frequency, seed) {
  const x=u*frequency, y=v*frequency, ix=Math.floor(x), iy=Math.floor(y);
  let first=Infinity, second=Infinity;
  for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++) {
    const hx=((ix+i)%frequency+frequency)%frequency, hy=((iy+j)%frequency+frequency)%frequency;
    const dx=ix+i+.15+.7*hash(hx,hy,seed)-x, dy=iy+j+.15+.7*hash(hx,hy,seed+9)-y;
    const d=Math.hypot(dx,dy);
    if(d<first) {second=first;first=d;} else if(d<second) second=d;
  }
  return Math.max(0,1-(second-first)*18);
}

/** Original seamless procedural tiles: albedo + packed height/roughness/metalness, with no network dependency. */
export function generateSurfaceTile(settings) {
  const preset = surfacePreset(settings.texture), layer = SURFACE_MATERIALS.indexOf(preset), options = textureOptions(settings);
  if (!preset) throw new Error("Material de superfície inválido.");
  const albedo = new Uint8Array(SIZE * SIZE * 4), details = new Uint8Array(albedo.length);
  const seed=options.textureSeed, density=options.patternDensity, frequency=n=>Math.max(1,Math.round(n*density));
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const u = x / SIZE, v = y / SIZE, n = noise(u,v,frequency(8),layer+1+seed), fine = noise(u,v,frequency(64),layer+11+seed), grain = hash(x,y,layer+23+seed);
    let rgb, height = n * .65 + fine * .35, rough = .7 + .3 * fine, metal = 1;
    switch (preset.id) {
      case 'bark': {
        const ridge=Math.sin(u*Math.PI*2*frequency(20)+n*3);
        const furrow=Math.pow(Math.max(0,-ridge),4), value=.65+n*.3-furrow*.28;
        rgb=[115*value,86*value,58*value];height=.65-furrow*.5+fine*.12;rough=.85+fine*.15;break;
      }
      case 'foliage': {
        const main=Math.exp(-Math.abs(u-.5)*70),vein=Math.pow(Math.max(0,Math.cos((v+Math.abs(u-.5)*.8)*Math.PI*2*frequency(12))),18);
        rgb=[28+n*25+vein*9,65+n*48+vein*15,24+n*18];height=.4+main*.15+vein*.06;rough=.7+fine*.25;break;
      }
      case 'ice': {
        const crack=fracture(u+n*.02,v+n*.02,frequency(4),121+seed);
        rgb=[102+n*50+crack*65,165+n*42+crack*40,190+n*38+crack*28];height=.6-crack*.4+fine*.03;rough=.12+crack*.35+fine*.08;break;
      }
      case 'wood': {
        let a=u, b=v;
        if (options.woodPattern==='parquet') {
          a=fract(u*2); b=fract(v*2);
          if ((Math.floor(u*2)+Math.floor(v*2))%2) [a,b]=[b,a];
        }
        const board = options.woodPattern==='grain' ? 0 : Math.floor(b * options.woodBoards);
        const joint = options.woodPattern!=='grain' && fract(b * options.woodBoards) < options.woodGap;
        const fibers = Math.sin(b * Math.PI * 2 * frequency(64) + Math.sin(a * Math.PI * 2) * 1.5 + n * 2);
        const knot = Math.sin(Math.hypot((a-.5)*2, (b-.5)*5) * 55 + n * 5) * Math.exp(-Math.hypot((a-.5)*8, (b-.5)*25));
        const value = joint ? .3 : .78 + .12 * options.woodGrain * fibers + .1 * n + .04 * fine + .14 * options.woodGrain * knot + hash(board,0,1+seed)*.1;
        rgb = [164*value,108*value,60*value]; height = joint ? .05 : .6 + fibers * .036 * options.woodGrain + fine * .025; rough = .65 + fine*.25; break;
      }
      case 'stone': {
        const row = Math.floor(v*frequency(4)), a = fract(u*frequency(3) + (row%2)*.5), b = fract(v*frequency(4));
        const joint = Math.min(a,1-a,b,1-b) < .035;
        const value = joint ? .28 : .65 + n*.25 + hash(Math.floor(u*frequency(3)+(row%2)*.5),row,1+seed)*.2;
        rgb = [143*value,143*value,132*value]; height = joint ? .04 : .55+n*.25+fine*.15; break;
      }
      case 'grass': {
        const blade = Math.pow(Math.max(0, Math.sin(u*2*Math.PI*frequency(64) + n*8 + v*2*Math.PI*frequency(16))),8);
        rgb = [35+fine*34+blade*30,65+n*40+blade*45,22+fine*25]; height = .25 + blade*.35 + fine*.3; break;
      }
      case 'metal': {
        const scratches = noise(u,v,frequency(128),5+seed)*.13 + Math.sin(v*Math.PI*2*frequency(128))*.045;
        const spot = Math.max(0,n-.62)*2 * options.metalWear/.15;
        rgb = [125+fine*26+spot*38,131+fine*26-spot*48,133+fine*26-spot*78]; height = .45+scratches; rough = .35+fine*.4+spot*.2;
        if (options.metalPattern==='smooth') { height=.45+fine*.015; rough=.15+fine*.1+spot*.2; }
        if (options.metalPattern==='diamond') {
          const x=u*frequency(8), y=v*frequency(8), a=fract(x)-.5,b=fract(y)-.5;
          const direction=(Math.floor(x)+Math.floor(y))%2 ? 1 : -1;
          const ridge=Math.max(0,1-Math.hypot((a+b*direction)*1.3,(a-b*direction)*9));
          height=.4+ridge*.45+fine*.02; rgb=rgb.map(c=>c*(.85+ridge*.3)); rough=.4+fine*.2+spot*.2;
        }
        if (options.metalPattern==='corrugated') { const ridge=Math.sin(u*Math.PI*2*frequency(12)); height=.5+ridge*.4; rgb=rgb.map(c=>c*(.9+ridge*.08)); }
        if (options.metalPattern==='rusted') {
          const rust=Math.min(1,Math.max(0,(n+options.metalWear-.45)*2));
          rgb=rgb.map((c,i)=>THREE.MathUtils.lerp(c,[135+fine*35,53+fine*24,22+fine*15][i],rust)); height=.4+rust*.25+fine*.1; rough=.35+rust*.55; metal=1-rust*.9;
        }
        break;
      }
      case 'sand': {
        const ripple = Math.sin(v*2*Math.PI*frequency(10) + Math.sin(u*2*Math.PI)*1.5)*.12;
        const value = .75 + n*.12 + grain*.12 + ripple;
        rgb = [214*value,186*value,130*value]; height = .35+grain*.15+ripple+n*.15; break;
      }
      case 'brick': {
        const row = Math.floor(v*frequency(8)), a = fract(u*frequency(4)+(row%2)*.5), b = fract(v*frequency(8)), joint = Math.min(a,1-a,b*.5,(1-b)*.5)<.025;
        const value = .72 + fine*.25 + hash(Math.floor(u*frequency(4)+(row%2)*.5),row,1+seed)*.12;
        rgb = joint ? [112+fine*12,106+fine*12,92+fine*12] : [173*value,77*value,48*value]; height = joint ? .08 : .7+fine*.15; break;
      }
      case 'concrete': rgb = [121+n*24+fine*15,119+n*24+fine*15,111+n*24+fine*15]; height = .45+n*.08+(grain>.97?-.22:fine*.08); break;
      case 'mud': {
        const crack = Math.max(0,.1-Math.abs(noise(u,v,frequency(16),9+seed)-.5))*3;
        rgb = [65+n*32+fine*10,43+n*22+fine*6,25+n*17]; height = .35+n*.4+fine*.2-crack; rough = .3+n*.55; break;
      }
      case 'rock': {
        const broad=noise(u,v,frequency(3),73+seed), medium=noise(u,v,frequency(16),19+seed);
        let crack=fracture(u+n*.025,v+n*.025,frequency(5),31+seed)*options.rockCracks;
        let structure=broad*.32+medium*.18;
        if(options.rockPattern==='strata') {
          const band=Math.sin((v*frequency(9)+n*.6)*Math.PI*2);
          crack=Math.pow(Math.max(0,-band),12)*options.rockCracks;
          structure+=band*.12;
        }
        if(options.rockPattern==='granite') {crack*=.15;structure=medium*.08+grain*.24;}
        let value=.63+broad*.28+fine*.14-crack*.28;
        if(options.rockPattern==='organic') {
          const warpX=noise(u,v,frequency(4),181+seed),warpY=noise(u,v,frequency(4),193+seed);
          const a=u+(warpX-.5)*.15,b=v+(warpY-.5)*.15;
          const mass=noise(a,b,frequency(3),211+seed),weathering=noise(a,b,frequency(11),223+seed),mineral=noise(a,b,frequency(43),227+seed);
          // Sparse fissures cut a continuous mineral surface, without closed cell outlines.
          const joint=Math.abs(noise(a,b,frequency(7),239+seed)-.5);
          crack=Math.max(0,1-joint/.025)*options.rockCracks*THREE.MathUtils.smoothstep(weathering,.42,.7);
          structure=mass*.24+weathering*.2+mineral*.075;
          value=.38+mass*.26+weathering*.15+mineral*.08-crack*.16;
        }
        rgb=[143*value+grain*10,146*value+grain*9,148*value+grain*8];
        height=.26+structure+fine*(options.rockPattern==='organic'?.04:.15)-crack*.25; rough=.75+fine*.23; break;
      }
      case 'snow': {
        const drift=noise(u,v,frequency(3),83+seed), powder=noise(u,v,frequency(32),15+seed);
        const value=.87+drift*.08+powder*.035+grain*.015;
        rgb=[242*value,248*value,255*value];
        height=.42+drift*.2+powder*.07+grain*.025; rough=.78+fine*.2; break;
      }
    }
    const index = (y*SIZE+x)*4;
    for(let c=0;c<3;c++) albedo[index+c]=Math.max(0,Math.min(255,Math.round(rgb[c])));
    albedo[index+3]=255; details[index]=Math.max(0,Math.min(255,height*255)); details[index+1]=Math.max(0,Math.min(255,rough*255)); details[index+2]=Math.max(0,Math.min(255,metal*255)); details[index+3]=255;
  }
  return { albedo, details, width: SIZE, height: SIZE };
}

/** Only parameters that change pixels participate; color/orientation are shader uniforms. */
export function surfaceStyleKey(settings) {
  const o=textureOptions(settings), key=[settings.texture,o.textureSeed,o.patternDensity];
  if(settings.texture==='wood') key.push(o.woodPattern,o.woodBoards,o.woodGap,o.woodGrain);
  if(settings.texture==='metal') key.push(o.metalPattern,o.metalWear);
  if(settings.texture==='rock') key.push(o.rockPattern,o.rockCracks);
  return JSON.stringify(key);
}
const tiles=new Map();
function cachedTile(settings) {
  const key=surfaceStyleKey(settings);
  const tile=tiles.get(key) ?? generateSurfaceTile(settings);
  tiles.delete(key); tiles.set(key,tile);
  if(tiles.size>32) tiles.delete(tiles.keys().next().value);
  return tile;
}
export function packSurfaceTiles(settings, columns=1) {
  const rows=Math.ceil(settings.length/columns), width=SIZE*columns, height=SIZE*rows;
  const albedo=new Uint8Array(width*height*4), details=new Uint8Array(albedo.length);
  settings.forEach((s,i)=>{
    const tile=cachedTile(s), tx=i%columns, ty=Math.floor(i/columns);
    for(let y=0;y<SIZE;y++) {
      const offset=((ty*SIZE+y)*width+tx*SIZE)*4, start=y*SIZE*4;
      albedo.set(tile.albedo.subarray(start,start+SIZE*4),offset);
      details.set(tile.details.subarray(start,start+SIZE*4),offset);
    }
  });
  return {albedo,details,width,height,columns,rows};
}
export function generateSurfaceAtlas() { return packSurfaceTiles(SURFACE_MATERIALS.map(p=>({texture:p.id}))); }

export function surfaceReferenceLuma(settings) {
  const tile=cachedTile(settings);
  if(tile.luma===undefined) {
    let sum=0;
    const linear=c=>(c/255<=.04045 ? c/255/12.92 : Math.pow((c/255+.055)/1.055,2.4));
    for(let i=0;i<tile.albedo.length;i+=4) {
      sum+=.2126*linear(tile.albedo[i])+.7152*linear(tile.albedo[i+1])+.0722*linear(tile.albedo[i+2]);
    }
    tile.luma=Math.max(.001,sum/(SIZE*SIZE));
  }
  return tile.luma;
}
