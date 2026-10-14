import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import * as THREE from 'three';
import { createScene, createEntity, duplicateDocument, id } from '../src/domain/documents.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { proposeRoomCables } from '../src/authoring/room-ambience.js';
import { illuminationDefaults } from '../src/domain/dynamic-lighting.js';
import { screenDefaults } from '../src/domain/screens.js';
import { DECAL_ASSET, decalDefaults, decalPlacement } from '../src/domain/decals.js';
import { surfacePatch } from '../src/domain/materials.js';
import { recipeInstance } from '../src/render/asset-cache.js';
import { screenSlotFrame } from '../src/render/screens.js';
import { reveal } from '../tests/e2e/controls.js';

// A derelict plant dressed with the industrial kit and hung cables, rendered in the real editor (built app, this machine's GPU):
// from outside and from eye height, the monitor from 2 m, and a flicker probe for decals.   npm run build && node scripts/capture-industrial.js <out-dir> [cable amount 0–1] [environment]
// CAPTURE_SOFTWARE=1 draws with the software rasteriser on machines without a GPU.
const [out, amount = .8, environment = 'ritual'] = process.argv.slice(2), W = 16, L = 12, H = 4.6;
const catalog = JSON.parse(await readFile('public/assets/catalog.json')).assets, store = createSceneStore(createScene('Galpão'));
store.execute('proposal.accept', { proposal: proposeRoom({ width: W, length: L, height: H, lighting: false, door: false, name: 'Galpão' }, store.editVersion) });
const floor = Object.values(store.document.layout.entities).find(e => e.kind === 'floor');
const put = (name, x, y, z, turn = 0, extra = {}) => { const asset = catalog.find(a => a.id === `builtin-${name}`); if (!asset) throw new Error(`Sem modelo: ${name}`); const entity = createEntity('prop', { name: asset.name, assetRef: { id: asset.id, revision: asset.revision }, footprint: asset.footprint, position: [x, y, z], rotation: quaternionFromYaw(turn), surfaceId: y < .01 ? floor.id : null, ...extra }); store.execute('entity.add', { entity, snap: false }); return entity; };
const lit = (entity, patch) => store.execute('entity.update', { id: entity.id, patch: { illumination: { ...illuminationDefaults('lamp', entity), ...patch } } });
const walls = () => Object.values(store.document.layout.entities).filter(e => e.kind === 'wall');
const rotate = (q, v) => new THREE.Vector3(...v).applyQuaternion(new THREE.Quaternion(...q));
const wallMid = wall => rotate(wall.transform.rotation, [wall.length / 2, 0, 0]).add(new THREE.Vector3(...wall.transform.position));
/** A point on the room-facing side of a wall, `along` metres of the way from its start and `up` metres high, with that side's normal. */
function onWall(wall, along, up) {
  const mid = wallMid(wall), toRoom = mid.clone().negate(), normal = rotate(wall.transform.rotation, [0, 0, 1]); if (normal.dot(toRoom) < 0) normal.negate();
  const point = rotate(wall.transform.rotation, [along, up, 0]).add(new THREE.Vector3(...wall.transform.position)).addScaledVector(normal, wall.thickness / 2);
  return { point: point.toArray(), normal: normal.toArray() };
}
const along = (wall, world, axis) => rotate(wall.transform.rotation, [1, 0, 0]).dot(new THREE.Vector3(...world).sub(new THREE.Vector3(...wall.transform.position))) * 1;
const backWall = walls().sort((a, b) => wallMid(a).z - wallMid(b).z)[0], rightWall = walls().sort((a, b) => wallMid(b).x - wallMid(a).x)[0];
/** Glues a decal to the face of `host` at `point`. */
function glue(host, point, normal, patch, extra = {}) {
  const decal = decalDefaults(patch), { position, rotation, anchor } = decalPlacement(store.document.layout.entities[host.id], point, normal);
  const entity = createEntity('prop', { name: extra.name ?? 'Decalque', assetRef: { id: DECAL_ASSET, revision: 1 }, footprint: [decal.size[0], .02], position, rotation, anchor, decal, ...extra });
  store.execute('entity.add', { entity, snap: false }); return entity;
}
// Ceiling: a duct, two pipe runs, trays and the lamps.
for (const x of [-4.5, -1.5, 1.5, 4.5]) put('industrial-duct', x, H - .97, -3.2);
for (const x of [-4.5, -1.5, 1.5, 4.5]) put('industrial-pipe-bundle', x, H - .57, 3.6);
for (const z of [-4, -2, 0, 2, 4]) put('industrial-cable-tray', 5.6, H - .52, z, 90);
lit(put('industrial-tube-light', -4.5, H - .72, 2.2, 20), { color: '#bfe6ff', intensity: 55, distance: 11, position: [0, -.1, 0], flicker: { enabled: true, pattern: 'fluorescent', amplitude: .25, frequency: 6, seed: 3 } });
// Back wall: the gate with its sign and the red lamp over it; bands along the walls.
put('industrial-blast-door', 2.5, 0, -L / 2 + .2); lit(put('industrial-warning-light', 2.5, 3.5, -L / 2 + .08), { color: '#ff2a1a', intensity: 70, distance: 14, position: [0, 0, .4] });
// Stripes of alert paint along two walls: a decal as long as the wall, in the hazard material.
for (const wall of [backWall, rightWall]) { const at = onWall(wall, wall.length / 2, 2.25); glue(wall, at.point, at.normal, { kind: 'surface', size: [wall.length, .3], wear: { faded: 0, scratched: 0, seed: 1 } }, { name: 'Faixa de alerta', material: surfacePatch('hazard') }); }
// The sign over the gate's neighbour.
{ const at = onWall(backWall, along(backWall, [-3.5, 0, -L / 2]), 3.1); glue(backWall, at.point, at.normal, { text: 'SETOR 7 · CARGA', size: [2.8, .5], textColor: '#e9e2cf', background: '#2a2a28', wear: { faded: .35, scratched: .25, seed: 7 } }, { name: 'Letreiro' }); }
for (const z of [-4.5, 4.5]) for (const x of [-2.5, 6]) put('industrial-column', x, 0, z); for (const z of [-2, 1.5]) put('industrial-pipe-riser', -W / 2 + .02, 0, z, 90);
// Floor: where somebody worked, and what the years left.
put('industrial-metal-table', -5, 0, 3.2, 15); const tv = put('crt-tv', -5, .78, 3.2, 20); put('industrial-metal-table', 4.6, 0, 1.2, -70); put('industrial-metal-shelf', -7.4, 0, -4, 90); put('barrel', -1.4, 0, -4.9); put('barrel', -.6, 0, -5.1, 40);
put('industrial-rubble-concrete', 1.5, 0, 0, 30); put('industrial-rubble-tiles', -1.5, 0, 2.2, 70); put('industrial-rubble-tiles', 3.4, 0, -2.6); put('industrial-scattered-papers', -3.6, 0, 3.6, 20);
put('industrial-floor-weeds', 4.4, 0, -.6); put('industrial-floor-weeds', -2.4, 0, -1.2, 80); put('industrial-floor-weeds', 0, 0, 4.4, 200); put('industrial-hanging-vines', -1, H - 2, -1); put('industrial-hanging-vines', -6.6, H - 2, 1.4, 120);
store.execute('proposal.accept', { proposal: proposeRoomCables(store.document, { floorId: floor.id, amount: Number(amount), seed: 3 }, store.editVersion, catalog) });
// The monitor: its slot is measured on the model itself, as the editor does, so the light hangs in front of the glass.
const tvAsset = catalog.find(a => a.id === 'builtin-crt-tv'), holder = new THREE.Group();
holder.add(recipeInstance(JSON.parse(await readFile(`public${tvAsset.url}`)), null, tvAsset.bounds)); const slot = screenSlotFrame(holder);
store.execute('entity.update', { id: tv.id, patch: {
  screen: screenDefaults({ lines: [{ text: 'BOOTING', size: .2, align: 'left', anim: 'dots' }, { text: 'SYS 4.2', size: .12, align: 'left', anim: 'none' }] }),
  illumination: { ...illuminationDefaults('screen', tv), position: slot.lightPosition, shadowPolicy: 'off', emissionSlot: 'none' } }, snap: false });
const tvWorld = local => rotate(tv.transform.rotation, local).add(new THREE.Vector3(...tv.transform.position));
{ // A mark on the casing, beside the glass.
  const point = tvWorld([slot.center[0] + slot.size[0] / 2 + .05, slot.center[1] - slot.size[1] / 2 - .03, slot.center[2] - .01]), normal = rotate(tv.transform.rotation, slot.normal).toArray();
  glue(tv, point.toArray(), normal, { text: 'NS-04', size: [.14, .05], textColor: '#e9e2cf', background: null, wear: { faded: .3, scratched: .2, seed: 3 } }, { name: 'Marca no monitor' });
}
if (environment) store.execute('environment.apply', { presetId: environment });
const eye = { id: id(), name: 'Olhos', projection: 'perspective', position: [-6.6, 1.5, 5], target: [3, 1.9, -6], fov: 62, orthographicHeight: 18 };
store.execute('camera.save', { camera: eye });
// The monitor from 2 m, to read it.
const glass = tvWorld(slot.center), glassNormal = rotate(tv.transform.rotation, slot.normal);
const close = { id: id(), name: 'Tela a 2 m', projection: 'perspective', position: glass.clone().addScaledVector(glassNormal, 2).add(new THREE.Vector3(0, .04, 0)).toArray(), target: glass.toArray(), fov: 50, orthographicHeight: 18 };
store.execute('camera.save', { camera: close });
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
  await page.evaluate(() => document.querySelector('[data-action="frame"]').click()); await page.waitForTimeout(4000); await page.screenshot({ path: path.join(out, 'outside.png') }); { const { screens, decals, surfaceMaterials } = await page.evaluate(() => window.__tabletop.stats()); console.log('outside', { screens, decals, hazard: surfaceMaterials.filter(m => m.texture === 'hazard').length }); }
  if (await page.locator('.app-shell.sidebar-collapsed').count()) await page.locator('[data-action=sidebar-toggle]').click();
  await page.locator('.tabs [data-tab="scene"]').click(); await (await reveal(page.locator(`[data-camera-cut="${eye.id}"]`))).click();
  await page.locator('[data-action="cutaway"]').click(); await page.locator('[data-action=sidebar-toggle]').click(); await page.locator('[data-action=inspector-toggle]').click();
  await page.waitForTimeout(4000); await page.screenshot({ path: path.join(out, 'eye.png') }); console.log('eye', errors);
  // The sidebar is closed for the pictures; open it only to cut to a camera.
  const cut = async key => {
    if (await page.locator('.app-shell.sidebar-collapsed').count()) await page.locator('[data-action=sidebar-toggle]').click();
    await page.locator('.tabs [data-tab="scene"]').click(); await (await reveal(page.locator(`[data-camera-cut="${key}"]`))).click(); await page.locator('[data-action=sidebar-toggle]').click(); await page.waitForTimeout(3500);
  };
  await cut(close.id); await page.screenshot({ path: path.join(out, 'screen-2m.png') });
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
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
