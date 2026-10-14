import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import { createScene, createEntity, id } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { proposeRoomCables } from '../src/authoring/room-ambience.js';
import { illuminationDefaults } from '../src/domain/dynamic-lighting.js';
import { reveal } from '../tests/e2e/controls.js';

// A derelict plant dressed with the industrial kit and hung cables, rendered in the real editor (built app, this machine's GPU):
// from outside and from eye height.   npm run build && node scripts/capture-industrial.js <out-dir> [cable amount 0–1] [environment]
const [out, amount = .8, environment = 'ritual'] = process.argv.slice(2), W = 16, L = 12, H = 4.6;
const catalog = JSON.parse(await readFile('public/assets/catalog.json')).assets, store = createSceneStore(createScene('Galpão'));
store.execute('proposal.accept', { proposal: proposeRoom({ width: W, length: L, height: H, lighting: false, door: false, name: 'Galpão' }, store.editVersion) });
const floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
const put = (name, x, y, z, turn = 0, extra = {}) => { const asset = catalog.find(a => a.id === `builtin-${name}`); if (!asset) throw new Error(`Sem modelo: ${name}`); const entity = createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint, position: [x, y, z], rotation: quaternionFromYaw(turn), surfaceId: y < .01 ? floor.id : null, ...extra }); store.execute('entity.add', { entity, snap: false }); return entity; };
const lit = (entity, patch) => store.execute('entity.update', { id: entity.id, patch: { illumination: { ...illuminationDefaults('lamp', entity), ...patch } } });
// Ceiling: a duct, two pipe runs, trays and the lamps.
for (const x of [-4.5, -1.5, 1.5, 4.5]) put('industrial-duct', x, H - .97, -3.2);
for (const x of [-4.5, -1.5, 1.5, 4.5]) put('industrial-pipe-bundle', x, H - .57, 3.6);
for (const z of [-4, -2, 0, 2, 4]) put('industrial-cable-tray', 5.6, H - .52, z, 90);
lit(put('industrial-tube-light', -4.5, H - .72, 2.2, 20), { color: '#bfe6ff', intensity: 55, distance: 11, position: [0, -.1, 0], flicker: { enabled: true, pattern: 'fluorescent', amplitude: .25, frequency: 6, seed: 3 } });
// Back wall: the gate with its sign and the red lamp over it; bands along the walls.
put('industrial-blast-door', 2.5, 0, -L / 2 + .2); lit(put('industrial-warning-light', 2.5, 3.5, -L / 2 + .08), { color: '#ff2a1a', intensity: 70, distance: 14, position: [0, 0, .4] });
for (const x of [-7, -5, -3, -1]) put('industrial-hazard-band', x, 2.1, -L / 2 + .06); for (const z of [-5, -3, -1, 1, 3, 5]) put('industrial-hazard-band', W / 2 - .06, 2.1, z, -90);
for (const z of [-4.5, 4.5]) for (const x of [-2.5, 6]) put('industrial-column', x, 0, z); for (const z of [-2, 1.5]) put('industrial-pipe-riser', -W / 2 + .02, 0, z, 90);
// Floor: where somebody worked, and what the years left.
put('industrial-metal-table', -5, 0, 3.2, 15); put('crt-tv', -5, .78, 3.2, 20); put('industrial-metal-table', 4.6, 0, 1.2, -70); put('industrial-metal-shelf', -7.4, 0, -4, 90); put('barrel', -1.4, 0, -4.9); put('barrel', -.6, 0, -5.1, 40);
put('industrial-rubble-concrete', 1.5, 0, 0, 30); put('industrial-rubble-tiles', -1.5, 0, 2.2, 70); put('industrial-rubble-tiles', 3.4, 0, -2.6); put('industrial-scattered-papers', -3.6, 0, 3.6, 20);
put('industrial-floor-weeds', 4.4, 0, -.6); put('industrial-floor-weeds', -2.4, 0, -1.2, 80); put('industrial-floor-weeds', 0, 0, 4.4, 200); put('industrial-hanging-vines', -1, H - 2, -1); put('industrial-hanging-vines', -6.6, H - 2, 1.4, 120);
store.execute('proposal.accept', { proposal: proposeRoomCables(store.document, { floorId: floor.id, amount: Number(amount), seed: 3 }, store.editVersion, catalog) });
if (environment) store.execute('environment.apply', { presetId: environment });
const eye = { id: id(), name: 'Olhos', projection: 'perspective', position: [-6.6, 1.5, 5], target: [3, 1.9, -6], fov: 62, orthographicHeight: 18 };
store.execute('camera.save', { camera: eye });
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-industrial-')), server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening'); let browser;
try {
  await mkdir(out, { recursive: true });
  const base = `http://127.0.0.1:${server.address().port}`, saved = await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) });
  if (saved.status !== 201) throw new Error(`Cena não gravada: ${saved.status} ${await saved.text()}`);
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } }), errors = []; page.setDefaultTimeout(30000); page.on('dialog', dialog => dialog.accept()); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  await page.locator('[data-action="open"]').first().click(); await page.waitForTimeout(900);
  await page.locator(`[data-open="${store.document.id}"]`).click(); await page.waitForFunction(key => window.__tabletop.snapshot().id === key, store.document.id);
  await page.locator('[data-action="frame"]').first().click(); await page.waitForTimeout(4000); await page.screenshot({ path: path.join(out, 'outside.png') }); console.log('outside', (await page.evaluate(() => window.__tabletop.stats())));
  await page.locator('.tabs [data-tab="scene"]').click(); await (await reveal(page.locator(`[data-camera-cut="${eye.id}"]`))).click();
  await page.locator('[data-action="cutaway"]').click(); await page.locator('[data-action=sidebar-toggle]').click(); await page.locator('[data-action=inspector-toggle]').click();
  await page.waitForTimeout(4000); await page.screenshot({ path: path.join(out, 'eye.png') }); console.log('eye', errors);
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
