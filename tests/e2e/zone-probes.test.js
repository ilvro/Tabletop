import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Reflected light per zone: captured once per zone, visible in the frame, stable
// when nothing changes, and refreshed after an edit to what the room reflects.
// Software rendering is slow enough to trip the automatic switch-off, so the test lifts it.
test('zone probes capture reflected light, do not feed back, and follow edits', { timeout: 900000 }, async t => {
  const app = express();
  app.get('/', (_req, res) => res.type('html').send('<link rel="icon" href="data:,"><style>html,body,#viewport{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="viewport"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/src', express.static(path.resolve('src'))); app.use('/three', express.static(path.resolve('node_modules/three'))); app.use(express.static(path.resolve('public')));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const document = JSON.parse(await readFile('public/scenes/backrooms.json', 'utf8')); document.look = { ...document.look, effectsPaused: true };
  const zoneCount = Object.values(document.layout.entities).filter(e => e.lightingZone?.enabled).length;
  const flat = structuredClone(document); for (const e of Object.values(flat.layout.entities)) if (e.lightingZone) e.lightingZone.indirect = 0;
  const page = await browser.newPage({ viewport: { width: 480, height: 300 }, reducedMotion: 'reduce' }); page.setDefaultTimeout(600000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const show = async (doc, wait = 0) => page.evaluate(async ({ doc, wait }) => {
    const { createViewport } = await import('/src/render/renderer.js');
    const v = window.tabletopView ??= (() => { const v = createViewport(document.getElementById('viewport')); v.setPresentation(true); v.setCutaway(false); v.setReflectedLightLimit(Infinity); return v; })();
    if (!window.assets) { window.assets = await (await fetch('/assets/catalog.json')).json(); v.setAssets(window.assets); }
    v.setDocument(doc); v.setCamera(Object.values(doc.cameraPresets)[0]); await v.ready();
    // Captures wait for a still scene, one zone per frame, and only for zones in view.
    const before = window.probeCaptures ?? 0;
    // Replacement meshes and textures can arrive after the edit: wait until captures have happened and stopped.
    if (wait) for (let i = 0, quiet = 0, last = -1; i < 200 && quiet < 4; i++) { await new Promise(r => setTimeout(r, 400)); const info = v.getInfo().zoneProbes; quiet = info.captures > before && !info.pending && info.captures === last ? quiet + 1 : 0; last = info.captures; }
    for (let i = 0; i < 12; i++) await new Promise(r => requestAnimationFrame(r));
    window.probeCaptures = v.getInfo().zoneProbes.captures;
    return v.getInfo().zoneProbes;
  }, { doc, wait });
  let shot = 0;
  const mean = async () => page.evaluate(async data => { const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: 'image/png' })), canvas = new OffscreenCanvas(bitmap.width, bitmap.height), context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0); const p = context.getImageData(0, 0, bitmap.width, bitmap.height / 3 | 0).data, sum = [0, 0, 0]; for (let i = 0; i < p.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += p[i + c]; return sum.map(v => v / (p.length / 4)); }, (await page.screenshot({ path: `test-results/zone-probes-${++shot}.png` })).toString('base64'));

  const without = await show(flat); assert.equal(without.captures, 0, 'zones without the field capture nothing'); const flatCeiling = await mean();
  const first = await show(document, 600); assert.ok(first.zones >= 1 && first.zones <= zoneCount, 'zones in view are captured'); assert.equal(first.pending, 0); const litCeiling = await mean();
  // The ceiling takes the colour of the yellow carpet below: warmer, with about the authored brightness.
  assert.ok(litCeiling[0] - litCeiling[2] > flatCeiling[0] - flatCeiling[2] + 4, `ceiling warms: ${flatCeiling.map(Math.round)} -> ${litCeiling.map(Math.round)}`);
  const brightness = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; assert.ok(Math.abs(brightness(litCeiling) - brightness(flatCeiling)) < brightness(flatCeiling) * .35, 'brightness stays near the authored fill');
  // Still scene: no further captures. The capture ignores its own result, so a forced recapture converges to the same frame.
  const idle = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 800)); for (let i = 0; i < 6; i++) await new Promise(r => requestAnimationFrame(r)); return window.tabletopView.getInfo().zoneProbes.captures; });
  assert.equal(idle, first.captures);
  const edited = structuredClone(document); for (const floor of Object.values(edited.layout.entities)) if (floor.kind === 'floor' && floor.lightingZone) floor.material = { ...floor.material, color: '#2040c0', texture: 'none' };
  const second = await show(edited, 1200); assert.ok(second.captures > first.captures, 'an edit refreshes the probes'); const blueCeiling = await mean();
  assert.ok(blueCeiling[2] - blueCeiling[0] > litCeiling[2] - litCeiling[0] + 4, `ceiling follows the new floor: ${litCeiling.map(Math.round)} -> ${blueCeiling.map(Math.round)}`);
  const back = await show(document, 1200), again = await mean();
  assert.ok(back.captures > second.captures); for (let c = 0; c < 3; c++) assert.ok(Math.abs(again[c] - litCeiling[c]) < 3, 'no feedback between captures');
  assert.deepEqual(errors, []); await page.evaluate(() => window.tabletopView.destroy());
});
