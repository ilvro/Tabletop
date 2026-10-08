/** Generate the bundled mountain scene. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMountainExample} from './mountain-example.js';
export {createMountainExample,mountainTrailX,MOUNTAIN_POOL} from './mountain-example.js';
const root=fileURLToPath(new URL('../',import.meta.url));

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {assets}=JSON.parse(await readFile(path.join(root,'public/assets/catalog.json'),'utf8'));
  const scene=createMountainExample(assets),directory=path.join(root,'public/scenes');
  await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'snowy-mountain-pass.json'),JSON.stringify(scene,null,2)+'\n');
  console.log(`Cena de exemplo gerada: ${Object.keys(scene.layout.entities).length} elementos, ${Object.keys(scene.cameraPresets).length} câmeras.`);
}
