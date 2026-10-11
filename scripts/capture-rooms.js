import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import { createScene } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { proposeFurnishing } from '../src/authoring/furnishing.js';
import { proposeRoomState } from '../src/authoring/room-state.js';
import { proposeRoomLighting, proposeRoomDetails } from '../src/authoring/room-ambience.js';

// Renders furnished rooms in the real editor (built app, this machine's GPU).
//   npm run build && node scripts/capture-rooms.js <out-dir> <recipe[:state[:mood]],…> [density seed width length environment]
const [out, list, density = 'dense', seed = 1, width = 7, length = 6, environment] = process.argv.slice(2), recipes = list.split(',');
const catalog = JSON.parse(await readFile('public/assets/catalog.json')).assets, store = createSceneStore(createScene('Cômodos'));
recipes.forEach((entry, i) => {
  const [template, state, mood] = entry.split(':');
  store.execute('proposal.accept', { proposal: proposeRoom({ width: Number(width), length: Number(length), name: template, center: [(i % 3) * (Number(width) + 1.5), 0, Math.floor(i / 3) * (Number(length) + 1.5)], lighting: false }, store.editVersion) });
  const floor = Object.values(store.document.layout.entities).filter(e => e.kind === 'floor').at(-1);
  store.execute('proposal.accept', { proposal: proposeFurnishing(store.document, { floorId: floor.id, template, density, seed: Number(seed) }, store.editVersion, catalog) });
  if (state) store.execute('proposal.accept', { proposal: proposeRoomState(store.document, { floorId: floor.id, state, intensity: .85, seed: Number(seed) }, store.editVersion, catalog) });
  if (mood) { try { store.execute('proposal.accept', { proposal: proposeRoomDetails(store.document, { floorId: floor.id, amount: .8, seed: Number(seed) }, store.editVersion, catalog) }); } catch { /* nothing to add */ }
    store.execute('proposal.accept', { proposal: proposeRoomLighting(store.document, { floorId: floor.id, mood }, store.editVersion, catalog) }); }
});
if (environment) store.execute('environment.apply', { presetId: environment });
[].forEach(() => {
});
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-rooms-')), server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening'); let browser;
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
  for (const view of ['perspective', 'top']) { await page.locator(`[data-action="${view}"]`).first().click(); await page.locator('[data-action="frame"]').first().click(); await page.waitForTimeout(3500); await page.screenshot({ path: path.join(out, `${view}.png`) }); console.log(view); }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
