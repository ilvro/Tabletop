import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateDocument } from '../src/domain/documents.js';
import { buildFrozenTempleScene } from './frozen-temple-scene.js';

/** The example scene "Templo gelado": the scene of scripts/frozen-temple-scene.js, written down with its six cameras. */
export async function createFrozenTempleExample(catalog) {
  const { store } = await buildFrozenTempleScene(catalog);
  store.execute('scene.rename', { name: 'Templo gelado · caverna e grade levadiça' });
  return validateDocument(JSON.parse(JSON.stringify(store.document)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { assets } = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url), 'utf8'));
  const scene = await createFrozenTempleExample(assets);
  await mkdir(new URL('../public/scenes/', import.meta.url), { recursive: true });
  await writeFile(new URL('../public/scenes/templo-gelado.json', import.meta.url), JSON.stringify(scene, null, 2) + '\n');
  console.log(`Templo gelado: ${Object.keys(scene.layout.entities).length} elementos, ${Object.keys(scene.cameraPresets).length} câmeras.`);
}
