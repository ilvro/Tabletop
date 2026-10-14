import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateDocument } from '../src/domain/documents.js';
import { buildIndustrialScene } from './industrial-scene.js';

/** The example scene "Galpão industrial": the scene of scripts/industrial-scene.js, written down with its five cameras. */
export async function createIndustrialExample(catalog) {
  const { store } = await buildIndustrialScene(catalog, { amount: .8, environment: 'ritual' });
  store.execute('scene.rename', { name: 'Galpão industrial · abandonado' });
  return validateDocument(JSON.parse(JSON.stringify(store.document)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { assets } = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url), 'utf8'));
  const scene = await createIndustrialExample(assets);
  await mkdir(new URL('../public/scenes/', import.meta.url), { recursive: true });
  await writeFile(new URL('../public/scenes/galpao-industrial.json', import.meta.url), JSON.stringify(scene, null, 2) + '\n');
  console.log(`Galpão industrial: ${Object.keys(scene.layout.entities).length} elementos, ${Object.keys(scene.cameraPresets).length} câmeras.`);
}
