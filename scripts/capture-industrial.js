import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import * as THREE from 'three';
import { createApp } from '../server/app.js';
import { createScene, createEntity, id } from '../src/domain/documents.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { DECAL_ASSET, decalDefaults, decalPlacement } from '../src/domain/decals.js';
import { reveal } from '../tests/e2e/controls.js';
import { buildIndustrialScene, rotate, wallMid } from './industrial-scene.js';

// A derelict plant built by scripts/industrial-scene.js, rendered in the real editor (built app, this machine's GPU):
// from outside and from eye height, the monitor from 2 m, the floor wet without reflections, and a flicker probe for decals.
//   npm run build && node scripts/capture-industrial.js <out-dir> [cable amount 0–1] [environment]
// CAPTURE_SOFTWARE=1 draws with the software rasteriser on machines without a GPU.
const [out, amount = .8, environment = 'ritual'] = process.argv.slice(2);
const catalog = JSON.parse(await readFile('public/assets/catalog.json')).assets;
const { store, cameras, W, L, H } = await buildIndustrialScene(catalog, { amount: Number(amount), environment });
const { eye, close } = cameras;
// A room with nothing in it but opaque magenta panels: any other colour inside one is a decal losing the depth test to its wall.
const probeDocument = (() => {
  const probe = createSceneStore(createScene('Sonda de decalques'));
  probe.execute('proposal.accept', { proposal: proposeRoom({ width: W, length: L, height: H, lighting: false, door: false, name: 'Sonda' }, probe.editVersion) });
  probe.execute('environment.apply', { presetId: 'warm' });
  const hosts = Object.values(probe.document.layout.entities), pick = test => hosts.filter(e => e.kind === 'wall').sort(test)[0], panels = [];
  const back = pick((a, b) => wallMid(a).z - wallMid(b).z), right = pick((a, b) => wallMid(b).x - wallMid(a).x), ground = hosts.find(e => e.kind === 'floor');
  const add = (host, point, normal, size) => {
    const decal = decalDefaults({ text: '', size, background: '#ff00ff', opacity: 1, wear: { faded: 0, scratched: 0, seed: 1 } }), { position, rotation, anchor } = decalPlacement(probe.document.layout.entities[host.id], point, normal);
    const entity = createEntity('prop', { name: 'Sonda', assetRef: { id: DECAL_ASSET, revision: 1 }, footprint: [size[0], .02], position, rotation, anchor, decal });
    probe.execute('entity.add', { entity, snap: false }); panels.push({ size, position, rotation });
  };
  for (const [wall, u] of [[back, 4], [right, 3]]) { const mid = wallMid(wall), toRoom = mid.clone().negate(), normal = rotate(wall.transform.rotation, [0, 0, 1]); if (normal.dot(toRoom) < 0) normal.negate(); const point = rotate(wall.transform.rotation, [u, 1.8, 0]).add(new THREE.Vector3(...wall.transform.position)).addScaledVector(normal, wall.thickness / 2); add(wall, point.toArray(), normal.toArray(), [3, 1.6]); }
  add(ground, [-2, ground.transform.position[1] + ground.thickness * 0 + 0, -1], [0, 1, 0], [3, 2]);
  const a = { id: id(), name: 'Sonda A', projection: 'perspective', position: [-6.6, 1.7, 5], target: [3, 1.5, -6], fov: 62, orthographicHeight: 18 };
  // The same view turned half a degree about the vertical.
  const turned = new THREE.Vector3(...a.target).sub(new THREE.Vector3(...a.position)).applyAxisAngle(new THREE.Vector3(0, 1, 0), .5 * Math.PI / 180).add(new THREE.Vector3(...a.position));
  const b = { ...a, id: id(), name: 'Sonda B', target: turned.toArray() };
  probe.execute('camera.save', { camera: a }); probe.execute('camera.save', { camera: b });
  return { document: probe.document, panels, cameras: [a, b] };
})();
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-industrial-')), server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening'); let browser;
try {
  await mkdir(out, { recursive: true });
  const base = `http://127.0.0.1:${server.address().port}`, saved = await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) });
  if (saved.status !== 201) throw new Error(`Cena não gravada: ${saved.status} ${await saved.text()}`);
  const probeSaved = await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: probeDocument.document }) });
  if (probeSaved.status !== 201) throw new Error(`Sonda não gravada: ${probeSaved.status} ${await probeSaved.text()}`);
  const software = Boolean(process.env.CAPTURE_SOFTWARE);
  browser = await chromium.launch({ headless: true, args: software ? ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--no-sandbox', '--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: software ? { width: 1200, height: 740 } : { width: 1700, height: 1050 } }), errors = []; page.setDefaultTimeout(software ? 150000 : 30000); page.on('dialog', dialog => dialog.accept()); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?diagnostics${software ? '&hardware' : ''}`); await page.waitForFunction(() => !!window.__tabletop);
  await page.locator('[data-action="open"]').first().click(); await page.waitForTimeout(900);
  await page.locator(`[data-open="${store.document.id}"]`).click(); await page.waitForFunction(key => window.__tabletop.snapshot().id === key, store.document.id);
  await page.evaluate(() => document.querySelector('[data-action="roofs"]')?.click()); // the roof is lifted for the picture from outside
  await page.evaluate(() => document.querySelector('[data-action="frame"]').click()); await page.waitForTimeout(4000); await page.screenshot({ path: path.join(out, 'outside.png') }); { const { screens, decals, surfaceMaterials } = await page.evaluate(() => window.__tabletop.stats()); console.log('outside', { screens, decals, hazard: surfaceMaterials.filter(m => m.texture === 'hazard').length }); }
  if (await page.locator('.app-shell.sidebar-collapsed').count()) await page.locator('[data-action=sidebar-toggle]').click();
  await page.evaluate(() => document.querySelector('[data-action="roofs"]')?.click()); // roof back on for the views from inside
  await page.locator('.tabs [data-tab="scene"]').click(); await (await reveal(page.locator(`[data-camera-cut="${eye.id}"]`))).click();
  await page.locator('[data-action="cutaway"]').click(); await page.locator('[data-action=sidebar-toggle]').click(); await page.locator('[data-action=inspector-toggle]').click();
  await page.waitForTimeout(4000); await page.screenshot({ path: path.join(out, 'eye.png') }); console.log('eye', errors);
  // The sidebar is closed for the pictures; open it only to cut to a camera.
  const cut = async key => {
    if (await page.locator('.app-shell.sidebar-collapsed').count()) await page.locator('[data-action=sidebar-toggle]').click();
    await page.locator('.tabs [data-tab="scene"]').click(); await (await reveal(page.locator(`[data-camera-cut="${key}"]`))).click(); await page.locator('[data-action=sidebar-toggle]').click(); await page.waitForTimeout(3500);
  };
  await cut(close.id); await page.screenshot({ path: path.join(out, 'screen-2m.png') });
  // The other cameras of the scene.
  for (const [name, camera] of [['gate', cameras.gate], ['entrance', cameras.entrance]]) { await cut(camera.id); await page.screenshot({ path: path.join(out, `${name}.png`) }); }
  // The wet floor alone: the same view with the reflections of the frame off.
  await cut(eye.id);
  const reflections = async value => { if (await page.locator('.app-shell.sidebar-collapsed').count()) await page.locator('[data-action=sidebar-toggle]').click(); await page.locator('.tabs [data-tab="scene"]').click(); await (await reveal(page.locator('[data-field="rendering-surfaceReflections"]'))).setChecked(value); await page.locator('[data-action=sidebar-toggle]').click(); await page.waitForTimeout(3500); };
  await reflections(false); await page.screenshot({ path: path.join(out, 'wet-only.png') }); await reflections(true); await page.screenshot({ path: path.join(out, 'eye-reflections.png') });
  console.log('effects', (await page.evaluate(() => window.__tabletop.stats())).effects);
  { const { screens } = await page.evaluate(() => window.__tabletop.stats()); console.log('screen', screens); }
  // Decals against their walls from two views half a degree apart: inside an opaque panel nothing but its own colour may show.
  await page.locator('[data-action="open"]').first().click(); await page.waitForTimeout(900);
  await page.locator(`[data-open="${probeDocument.document.id}"]`).click(); await page.waitForFunction(key => window.__tabletop.snapshot().id === key, probeDocument.document.id);
  const corners = probeDocument.panels.map(({ size, position, rotation }) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => rotate(rotation, [x * size[0] * .46, y * size[1] * .46, .002]).add(new THREE.Vector3(...position)).toArray()));
  const flicker = async name => {
    await page.waitForTimeout(500); const shot = await page.screenshot({ path: path.join(out, `${name}.png`) });
    return page.evaluate(async ({ b64, corners }) => {
      const image = new Image(); image.src = `data:image/png;base64,${b64}`; await image.decode();
      const canvas = Object.assign(document.createElement('canvas'), { width: image.width, height: image.height }), context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const { data, width } = context.getImageData(0, 0, image.width, image.height), result = [];
      for (const panel of corners) {
        const quad = panel.map(point => window.__tabletop.project(point)); let inside = 0, wrong = 0;
        const [minX, maxX, minY, maxY] = [Math.min(...quad.map(q => q.x)), Math.max(...quad.map(q => q.x)), Math.min(...quad.map(q => q.y)), Math.max(...quad.map(q => q.y))];
        const within = (x, y) => { let sign = 0; for (let i = 0; i < 4; i++) { const a = quad[i], b = quad[(i + 1) % 4], cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x); if (cross !== 0) { if (sign && Math.sign(cross) !== sign) return false; sign = Math.sign(cross); } } return true; };
        for (let y = Math.max(0, Math.floor(minY)); y < Math.min(image.height, Math.ceil(maxY)); y++) for (let x = Math.max(0, Math.floor(minX)); x < Math.min(width, Math.ceil(maxX)); x++) {
          if (!within(x + .5, y + .5)) continue; inside++; const i = (y * width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
          if (!(r > g * 1.5 && b > g * 1.5 && r > 8)) wrong++;
        }
        result.push({ inside, wrong, visible: quad.every(q => q.visible) });
      }
      return result;
    }, { b64: shot.toString('base64'), corners });
  };
  await cut(probeDocument.cameras[0].id); const a = await flicker('jitter-a'); await cut(probeDocument.cameras[1].id); const b = await flicker('jitter-b');
  console.log('jitter', { a, b, wrongPixels: [...a, ...b].reduce((sum, panel) => sum + panel.wrong, 0), checkedPixels: [...a, ...b].reduce((sum, panel) => sum + panel.inside, 0) }); console.log('errors', errors);
  // The reference and the same view of the scene, side by side.
  const picture = async file => `data:image/png;base64,${(await readFile(file)).toString('base64')}`;
  await page.setViewportSize({ width: 1920, height: 560 });
  await page.setContent(`<body style="margin:0;background:#111;display:flex;gap:8px;font:14px system-ui;color:#ddd"><figure style="margin:0;flex:1"><img style="width:100%" src="${await picture('docs/references/scenes/galpao-industrial.png')}"><figcaption>Referência</figcaption></figure><figure style="margin:0;flex:1"><img style="width:100%" src="${await picture(path.join(out, 'eye.png'))}"><figcaption>Tabletop · câmera Olhos</figcaption></figure></body>`);
  await page.waitForTimeout(800); await page.screenshot({ path: path.join(out, 'comparacao.png'), fullPage: true });
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
