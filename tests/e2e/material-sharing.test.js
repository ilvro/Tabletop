import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Sharing one material among identical meshes is a draw-time optimisation: the
// frame must not change.
test('shared materials render the same frame as one material per instance', { timeout: 900000 }, async t => {
  const app = express();
  app.get('/', (_req, res) => res.type('html').send('<link rel="icon" href="data:,"><style>html,body,#viewport{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="viewport"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/src', express.static(path.resolve('src'))); app.use('/three', express.static(path.resolve('node_modules/three'))); app.use(express.static(path.resolve('public')));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  for (const [name, cameras] of [['backrooms', [0, 3]], ['igreja-antiga', [3]]]) {
    const document = JSON.parse(await readFile(`public/scenes/${name}.json`, 'utf8'));
    const page = await browser.newPage({ viewport: { width: 640, height: 400 }, reducedMotion: 'reduce' }); page.setDefaultTimeout(600000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);
    await page.evaluate(async doc => {
      const { createViewport } = await import('/src/render/renderer.js'); const v = window.viewport = createViewport(document.getElementById('viewport'));
      v.setAssets(await (await fetch('/assets/catalog.json')).json()); v.setPresentation(true); v.setCutaway(false);
      // Static frame: no flicker, particles or clouds between the two captures.
      v.setDocument({ ...doc, look: { ...doc.look, effectsPaused: true } }); await v.ready();
    }, document);
    for (const index of cameras) {
      const shot = async sharing => {
        await page.evaluate(async ({ preset, sharing }) => { const v = window.viewport; v.setMaterialSharing(sharing); v.setCamera(preset); await v.ready(); for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(r)); }, { preset: Object.values(document.cameraPresets)[index], sharing });
        return page.screenshot();
      };
      const separate = await shot(false), shared = await shot(true), info = await page.evaluate(() => window.viewport.getInfo().materialSharing);
      assert.ok(info.shared > info.meshes * .3, `${name}: ${info.shared} of ${info.meshes} meshes share a material`);
      const differing = await page.evaluate(async ([a, b]) => {
        const pixels = async data => { const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: 'image/png' })), canvas = new OffscreenCanvas(bitmap.width, bitmap.height), context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0); return context.getImageData(0, 0, bitmap.width, bitmap.height).data; };
        const [p, q] = [await pixels(a), await pixels(b)], width = 640, height = p.length / 4 / width, differs = new Uint8Array(width * height); let count = 0;
        for (let i = 0; i < differs.length; i++) differs[i] = Math.abs(p[i * 4] - q[i * 4]) > 3 || Math.abs(p[i * 4 + 1] - q[i * 4 + 1]) > 3 || Math.abs(p[i * 4 + 2] - q[i * 4 + 2]) > 3 ? 1 : 0;
        // Draw order changes with the material, so coplanar seams may resolve to the
        // other surface along a one-pixel line. A wrong material changes an area:
        // count only pixels whose whole 3x3 neighbourhood differs.
        for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) { let all = 1; for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1 && all; dx++) all = differs[(y + dy) * width + x + dx]; count += all; }
        return count / differs.length;
      }, [separate.toString('base64'), shared.toString('base64')]);
      assert.ok(differing < .0002, `${name} camera ${index + 1}: ${(differing * 100).toFixed(3)}% of the frame differs in area`);
    }
    assert.deepEqual((await page.evaluate(() => window.viewport.getInfo().assetDiagnostics)), []); assert.deepEqual(errors, []);
    await page.evaluate(() => window.viewport.destroy()); await page.close();
  }
});
