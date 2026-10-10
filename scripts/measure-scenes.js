import {readFile,readdir} from 'node:fs/promises';
import * as THREE from 'three';
import {recipeInstance,disposeObject} from '../src/render/asset-cache.js';

// Static render cost of the bundled scenes: triangles, vertices and draw calls
// summed per placed asset. Terrain, walls and floors are not included.
// `node scripts/measure-scenes.js [models-dir]` measures another set of recipes
// (for example test-results/library-before/models) against the same scenes.
const models=process.argv[2]??'public/assets/models',cache=new Map();
async function cost(id) {
  if(!cache.has(id)) {
    const object=recipeInstance(JSON.parse(await readFile(`${models}/${id.slice(8)}.json`,'utf8')));let triangles=0,vertices=0,draws=0,shadowDraws=0;
    object.traverse(mesh=>{if(!mesh.isMesh)return;draws++;if(mesh.castShadow)shadowDraws++;vertices+=mesh.geometry.attributes.position.count;triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;});
    disposeObject(object);cache.set(id,{triangles,vertices,draws,shadowDraws});
  }
  return cache.get(id);
}
const k=n=>`${Math.round(n/1000)}k`;
for(const file of (await readdir('public/scenes')).filter(f=>f.endsWith('.json'))) {
  const scene=JSON.parse(await readFile(`public/scenes/${file}`,'utf8')),total={triangles:0,vertices:0,draws:0,shadowDraws:0},byAsset=new Map();
  for(const entity of Object.values(scene.layout.entities)) {
    const id=entity.assetRef?.id;if(!id?.startsWith('builtin-'))continue;
    const c=await cost(id),entry=byAsset.get(id)??{count:0,triangles:0};entry.count++;entry.triangles+=c.triangles;byAsset.set(id,entry);
    for(const key of Object.keys(total))total[key]+=c[key];
  }
  const top=[...byAsset].sort((a,b)=>b[1].triangles-a[1].triangles).slice(0,5).map(([id,e])=>`${id.slice(8)}×${e.count}=${k(e.triangles)}`).join(', ');
  console.log(`${file.replace('.json','')}: ${k(total.triangles)} triângulos, ${k(total.vertices)} vértices, ${total.draws} chamadas (${total.shadowDraws} em sombra), ${byAsset.size} assets distintos\n  ${top}`);
}
