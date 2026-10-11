import * as THREE from 'three';
import { SURFACE_MATERIALS, TEXTURE_PATTERN_FIELDS, surfacePreset, textureOptions } from '../domain/materials.js';

export const TILE_SIZE = 256;
const SIZE = TILE_SIZE;
const fract = x => x - Math.floor(x);
const hash = (x, y, seed = 1) => fract(Math.sin(x * 127.1 + y * 311.7 + seed * 71.3) * 43758.5453);
const smooth = x => x * x * (3 - 2 * x);
function noise(u, v, frequency, seed) {
  // Called several times per texel of every tile: no closures or helper calls in here.
  const x = u * frequency, y = v * frequency, ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  const x0 = ((ix % frequency) + frequency) % frequency, x1 = (x0 + 1) % frequency, y0 = ((iy % frequency) + frequency) % frequency, y1 = (y0 + 1) % frequency;
  const top = (1 - fx) * hash(x0, y0, seed) + fx * hash(x1, y0, seed), bottom = (1 - fx) * hash(x0, y1, seed) + fx * hash(x1, y1, seed);
  return (1 - fy) * top + fy * bottom;
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
export function generateSurfaceTile(settings, size = SIZE) {
  const preset = surfacePreset(settings.texture), layer = SURFACE_MATERIALS.indexOf(preset), options = textureOptions(settings);
  if (!preset) throw new Error("Material de superfície inválido.");
  const albedo = new Uint8Array(size * size * 4), details = new Uint8Array(albedo.length);
  const seed=options.textureSeed, density=options.patternDensity, frequency=n=>Math.max(1,Math.round(n*density));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, n = noise(u,v,frequency(8),layer+1+seed), fine = noise(u,v,frequency(64),layer+11+seed), grain = hash(x,y,layer+23+seed);
    // `tintable`: how much of the user's colour a pixel takes when recolouring (grout, chips and substrate keep their own).
    let rgb, height = n * .65 + fine * .35, rough = .7 + .3 * fine, metal = 1, tintable = 1;
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
        rgb = [164*value,108*value,60*value]; height = joint ? .05 : .6 + fibers * .036 * options.woodGrain + fine * .025; rough = .65 + fine*.25;
        if (options.woodAge > 0 && !joint) {
          // Weathering: checks along the grain, grey sun-bleached patches and a drier surface.
          const check = Math.max(0, 1 - Math.abs(noise(a * .35, b, frequency(48), 301 + seed) - .5) / .02) * THREE.MathUtils.smoothstep(noise(a, b, frequency(5), 307 + seed), .45, .7);
          const bleach = THREE.MathUtils.smoothstep(noise(u, v, frequency(4), 311 + seed), .3, .8) * options.woodAge, gray = (rgb[0] + rgb[1] + rgb[2]) / 3 * 1.05;
          rgb = rgb.map((c, i) => THREE.MathUtils.lerp(c, gray * [1.06, 1, .9][i], bleach * .7) * (1 - check * options.woodAge * .55)); height -= check * options.woodAge * .3; rough = Math.min(1, rough + options.woodAge * .25);
        }
        break;
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
      case 'fabric': {
        // Warp and weft cross over each other; the weave decides which thread is on top.
        const threads = frequency(48), cx = Math.floor(u * threads), cy = Math.floor(v * threads), a = fract(u * threads), b = fract(v * threads);
        let over = (cx + cy) % 2 === 0;
        if (options.fabricWeave === 'twill') over = (cx + cy) % 4 < 2;
        if (options.fabricWeave === 'herringbone') over = ((Math.floor(cx / 8) % 2 ? cx : threads - cx) + cy) % 4 < 2;
        if (options.fabricWeave === 'velvet') {
          const nap = noise(u, v, frequency(6), 401 + seed), value = .7 + nap * .22 + grain * .1 * options.fabricThread;
          rgb = [150 * value, 138 * value, 120 * value]; height = .5 + grain * .25 * options.fabricThread + nap * .1; rough = .9 + fine * .1; break;
        }
        const thread = Math.sin(Math.PI * (over ? a : b)), across = Math.sin(Math.PI * (over ? b : a)), lift = thread * (.55 + .45 * across);
        const value = .8 + (lift - .5) * .3 * options.fabricThread + (over ? .03 : -.03) * options.fabricThread + fine * .05 + hash(over ? cx : cy, over ? 0 : 1, 409 + seed) * .06;
        rgb = [156 * value, 146 * value, 126 * value]; height = .5 + (lift - .5) * .7 * options.fabricThread + fine * .04; rough = .85 + fine * .15; break;
      }
      case 'leather': {
        // Short use creases: contour lines of one field, kept only where a second field allows.
        const crease = Math.max(0, 1 - Math.abs(noise(u, v, frequency(9), 421 + seed) - .5) / .012) * THREE.MathUtils.smoothstep(noise(u, v, frequency(5), 423 + seed), .5, .75) * options.leatherCreases;
        let cell = fracture(u + fine * .01, v + fine * .01, frequency(28), 431 + seed) * options.leatherGrain, bulge = 0, button = 0;
        if (options.leatherPattern === 'smooth') cell *= .15;
        if (options.leatherPattern === 'tufted') {
          // Diamond tufting: pillows between buttons set on a diagonal lattice.
          const x = u * frequency(4), y = v * frequency(4), p = Math.sin(Math.PI * (x + y)), q = Math.sin(Math.PI * (x - y));
          bulge = Math.abs(p) * Math.abs(q); button = Math.max(0, 1 - Math.hypot(p, q) * 5); cell *= .5;
        }
        const value = .72 + n * .14 + fine * .06 - cell * .22 - crease * .3 + bulge * .16 - button * .35;
        rgb = [128 * value, 78 * value, 52 * value]; height = .45 - cell * .22 - crease * .35 + bulge * .5 - button * .3 + fine * .03; rough = .45 + cell * .3 + fine * .15 - bulge * .08; break;
      }
      case 'plaster': {
        const crack = fracture(u + n * .03, v + n * .03, frequency(4), 441 + seed) * THREE.MathUtils.smoothstep(noise(u, v, frequency(3), 443 + seed), .55 - options.plasterDamage * .4, .9) * options.plasterDamage;
        const stain = THREE.MathUtils.smoothstep(noise(u, v, frequency(3), 449 + seed) + (1 - v) * .0, .5, .95) * options.plasterDamage;
        let value = .9 + n * .05 + fine * .03 - stain * .16 - crack * .4; height = .5 + fine * .05 - crack * .35; rough = .8 + fine * .2;
        if (options.plasterFinish === 'stucco') { const bump = noise(u, v, frequency(24), 457 + seed) * .6 + noise(u, v, frequency(72), 459 + seed) * .4; height = .35 + bump * .4 + fine * .2 - crack * .3; value += (bump - .5) * .12; }
        if (options.plasterFinish === 'troweled') { const sweep = Math.sin(Math.PI * 2 * (v * frequency(5) + noise(u, v, frequency(3), 461 + seed) * 1.6)); height = .5 + sweep * .12 + fine * .04 - crack * .3; value += sweep * .035; }
        rgb = [214 * value, 207 * value, 192 * value];
        if (options.plasterFinish === 'peeling') {
          // Paint lifts in patches and shows the render underneath, which keeps its own colour.
          const patch = THREE.MathUtils.smoothstep(noise(u, v, frequency(5), 463 + seed) * .7 + noise(u, v, frequency(22), 467 + seed) * .3, .78 - options.plasterDamage * .5, .8 - options.plasterDamage * .5);
          const under = .62 + fine * .12 + grain * .08; rgb = rgb.map((c, i) => THREE.MathUtils.lerp(c, [176, 168, 150][i] * under, patch)); height -= patch * .25; rough = Math.min(1, rough + patch * .1); tintable = 1 - patch;
        }
        break;
      }
      case 'tile': {
        const count = options.tileCount; let edge, id;
        if (options.tilePattern === 'hex') {
          // Nearest centre on a staggered lattice; rows are spaced so that the cells are near regular.
          const rows = Math.max(2, Math.round(count / .866 / 2) * 2), x = u * count, y = v * rows, spacing = count / rows; let best = Infinity, second = Infinity;
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
            const row = Math.floor(y) + j, col = Math.floor(x) + i, dx = Math.abs(x - (col + .5 + (((row % 2) + 2) % 2) * .5)), dy = Math.abs(y - (row + .5)) * spacing, distance = Math.max(dx, dx * .5 + dy * .866);
            if (distance < best) { second = best; best = distance; id = [((col % count) + count) % count, ((row % rows) + rows) % rows]; } else if (distance < second) second = distance;
          }
          edge = (second - best) * .5;
        } else {
          const rows = options.tilePattern === 'offset' && count % 2 ? count + 1 : count, row = Math.floor(v * rows), shift = options.tilePattern === 'offset' ? (row % 2) * .5 : 0;
          const a = fract(u * count + shift), b = fract(v * rows); edge = Math.min(a, 1 - a, b, 1 - b); id = [Math.floor(u * count + shift) % count, row];
        }
        const joint = edge < options.tileGrout / 2, pillow = Math.min(1, (edge - options.tileGrout / 2) / .06);
        const dark = options.tilePattern === 'checker' && (id[0] + id[1]) % 2, value = (dark ? .42 : .92) + (hash(id[0], id[1], 471 + seed) - .5) * .3 * options.tileVariation + fine * .02;
        rgb = joint ? [142 + fine * 20, 139 + fine * 20, 130 + fine * 20] : [228 * value, 226 * value, 216 * value];
        height = joint ? .25 + fine * .08 : .55 + pillow * .25 + fine * .01; rough = joint ? .95 : .22 + fine * .1 + (hash(id[0], id[1], 479 + seed) - .5) * .1 * options.tileVariation; tintable = joint || dark ? 0 : 1; break;
      }
      case 'carpet': {
        const pile = options.carpetPile; let tone = 1, lift = grain * .5 + fine * .3;
        if (options.carpetPattern === 'loop') { const loops = frequency(36), bump = Math.abs(Math.sin(Math.PI * u * loops) * Math.sin(Math.PI * (v * loops + (Math.floor(u * loops) % 2) * .5))); lift = bump * .7 + grain * .15; }
        if (options.carpetPattern === 'striped') tone = Math.floor(u * frequency(8)) % 2 ? .72 : 1;
        if (options.carpetPattern === 'diamonds') { const d = Math.abs(fract(u * frequency(4)) - .5) + Math.abs(fract(v * frequency(4)) - .5); tone = d < .16 ? .6 : d < .22 ? 1.12 : Math.abs(d - .42) < .03 ? .7 : 1; }
        const value = (.66 + lift * .3 * pile + n * .1) * tone;
        rgb = [160 * value, 136 * value, 112 * value]; height = .3 + lift * .6 * pile + n * .1; rough = .95 + fine * .05; break;
      }
      case 'paint': {
        // Chips follow broad wear with a ragged edge; the exposed substrate keeps its own colour and finish.
        const wear = noise(u, v, frequency(5), 487 + seed) * .62 + noise(u, v, frequency(21), 491 + seed) * .28 + fine * .1, limit = 1 - options.paintChips * .75;
        const chip = THREE.MathUtils.smoothstep(wear, limit - .015, limit + .015), rim = Math.max(0, 1 - Math.abs(wear - limit) / .03) * (1 - chip);
        let value = .9 + n * .03 + fine * .02; height = .55 + fine * .02; rough = .45 + fine * .12;
        if (options.paintFinish === 'brushstrokes') { const stroke = Math.sin(Math.PI * 2 * (v * frequency(70) + noise(u, v, frequency(4), 499 + seed) * 2)); height += stroke * .1; value += stroke * .02; rough += .1; }
        if (options.paintFinish === 'hammered') { const dimple = noise(u, v, frequency(18), 503 + seed) * .65 + noise(u, v, frequency(44), 505 + seed) * .35; height += (dimple - .5) * .35; value += (dimple - .5) * .08; rough -= .12; }
        const base = { metal: [128 + fine * 22, 130 + fine * 22, 132 + fine * 22], rust: [128 + fine * 34, 58 + fine * 22, 26 + fine * 14], wood: [150 + fine * 24, 104 + fine * 18, 62 + fine * 12], primer: [186 + fine * 14, 184 + fine * 14, 178 + fine * 14] }[options.paintBase];
        rgb = [226 * value, 222 * value, 212 * value].map((c, i) => THREE.MathUtils.lerp(c * (1 - rim * .12), base[i], chip));
        height = height + rim * .08 - chip * .22; rough = THREE.MathUtils.lerp(rough, options.paintBase === 'metal' ? .38 : .9, chip); metal = options.paintBase === 'metal' ? chip : 0; tintable = 1 - chip; break;
      }
      case 'snow': {
        const drift=noise(u,v,frequency(3),83+seed), powder=noise(u,v,frequency(32),15+seed);
        const value=.87+drift*.08+powder*.035+grain*.015;
        rgb=[242*value,248*value,255*value];
        height=.42+drift*.2+powder*.07+grain*.025; rough=.78+fine*.2; break;
      }
    }
    const index = (y*size+x)*4;
    for(let c=0;c<3;c++) albedo[index+c]=Math.max(0,Math.min(255,Math.round(rgb[c])));
    albedo[index+3]=Math.round(Math.max(0,Math.min(1,tintable))*255); details[index]=Math.max(0,Math.min(255,height*255)); details[index+1]=Math.max(0,Math.min(255,rough*255)); details[index+2]=Math.max(0,Math.min(255,metal*255)); details[index+3]=255;
  }
  return { albedo, details, width: size, height: size };
}

/** Only parameters that change pixels participate; color/orientation are shader uniforms. */
export function surfaceStyleKey(settings) {
  const o=textureOptions(settings), key=[settings.texture,o.textureSeed,o.patternDensity];
  for(const field of TEXTURE_PATTERN_FIELDS[settings.texture]??[]) key.push(o[field]);
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
/** The default atlas, one tile per preset, filled as presets are first used: generating
 * all of them up front blocks the page for a couple of seconds. */
export function createLazySurfaceAtlas() {
  const rows=SURFACE_MATERIALS.length,albedo=new Uint8Array(SIZE*SIZE*rows*4),details=new Uint8Array(albedo.length),filled=new Set();
  return {albedo,details,width:SIZE,height:SIZE*rows,columns:1,rows,filled,
    /** Returns true when a tile had to be generated, so textures need uploading again. */
    ensure(index) {
      if(filled.has(index)||index<0)return false;
      const tile=cachedTile({texture:SURFACE_MATERIALS[index].id}),offset=index*SIZE*SIZE*4;
      albedo.set(tile.albedo,offset);details.set(tile.details,offset);filled.add(index);return true;
    }};
}

export function surfaceReferenceLuma(settings) {
  const tile=cachedTile(settings);
  if(tile.luma===undefined) {
    let sum=0;
    const linear=c=>(c/255<=.04045 ? c/255/12.92 : Math.pow((c/255+.055)/1.055,2.4));
    // Only the pixels that take the user's colour define its reference brightness.
    let weight=0;
    for(let i=0;i<tile.albedo.length;i+=4) {
      const share=tile.albedo[i+3]/255; weight+=share;
      sum+=share*(.2126*linear(tile.albedo[i])+.7152*linear(tile.albedo[i+1])+.0722*linear(tile.albedo[i+2]));
    }
    tile.luma=Math.max(.001,sum/Math.max(1,weight));
  }
  return tile.luma;
}
