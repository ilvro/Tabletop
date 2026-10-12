import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import { createScene, createEntity } from '../src/domain/documents.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { proposeBuilding, proposeAddRoom } from '../src/authoring/building.js';

// Renders generated buildings in the real editor (built app, this machine's GPU).
//   npm run build && node scripts/capture-building.js <out-dir> <type,type,…> [width length seed roof environment]
const [out, list, width = 15, length = 9, seed = 1, roof = 'no', environment] = process.argv.slice(2);
const catalog = JSON.parse(await readFile('public/assets/catalog.json')).assets, store = createSceneStore(createScene('Prédios'));
// `old:house` furnishes for an older era; `started:house` first builds a shell by hand (walls, a door, a few pieces) and completes it; `house+garage` adds a room afterwards.
list.split(',').forEach((entry, i) => {
  const [spec, ...extra] = entry.split('+'), started = spec.startsWith('started:'), era = spec.includes('old:') ? 'old' : 'modern', type = spec.replace('started:', '').replace('old:', ''), center = [0, 0, i * (Number(length) + 8)];
  let floorId = null;
  if (started) {
    store.execute('proposal.accept', { proposal: proposeRoom({ width: Number(width), length: Number(length), center, lighting: false, name: 'Casca' }, store.editVersion) });
    const floor = Object.values(store.document.layout.entities).filter(e => e.kind === 'floor').at(-1); floorId = floor.id;
    for (const [name, x, z] of [['stove', .4, -.38], ['single-bed', .38, .3], ['sofa', -.33, -.36], ['dining-table', -.3, .1]]) { const a = catalog.find(asset => asset.id === `builtin-${name}`); store.execute('entity.add', { entity: createEntity('prop', { name: a.name, assetRef: { id: a.id, revision: a.revision }, footprint: a.footprint, position: [center[0] + x * Number(width), 0, center[2] + z * Number(length)], surfaceId: floor.id, material: { color: '#c46a4a' }, ...(a.supportHeight ? { supportHeight: a.supportHeight } : {}) }) }); }
  }
  store.execute('proposal.accept', { proposal: proposeBuilding(store.document, { type, era, floorId, width: Number(width), length: Number(length), center, seed: Number(seed), roof: roof === 'roof' }, store.editVersion, catalog) });
  for (const template of extra) store.execute('proposal.accept', { proposal: proposeAddRoom(store.document, { floorId: Object.values(store.document.layout.entities).filter(e => e.kind === 'floor').at(-1).id, template, seed: Number(seed) }, store.editVersion, catalog) });
});
if (environment) store.execute('environment.apply', { presetId: environment });
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-building-')), server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening'); let browser;
try {
  await mkdir(out, { recursive: true });
  const base = `http://127.0.0.1:${server.address().port}`, saved = await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) });
  if (saved.status !== 201) throw new Error(`Cena não gravada: ${saved.status} ${await saved.text()}`);
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 }, deviceScaleFactor: 2 }); page.setDefaultTimeout(30000); page.on('dialog', dialog => dialog.accept());
  await page.goto(`${base}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  await page.locator('[data-action="open"]').first().click(); await page.waitForTimeout(900);
  await page.locator(`[data-open="${store.document.id}"]`).click(); await page.waitForFunction(id => window.__tabletop.snapshot().id === id, store.document.id);
  await page.locator('[data-action=sidebar-toggle]').click(); await page.locator('[data-action=inspector-toggle]').click();
  for (const view of ['perspective', 'top']) { await page.locator(`[data-action="${view}"]`).first().click(); await page.locator('[data-action="frame"]').first().click(); await page.waitForTimeout(4000); await page.screenshot({ path: path.join(out, `${view}.png`) }); console.log(view); }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
