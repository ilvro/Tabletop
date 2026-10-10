import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Effects render into an offscreen target. It must keep antialiasing and, by
// tier, the renderer's resolution: turning AO on may not soften the image.
test('the effects target is multisampled and follows the quality tier on a dense display', { timeout: 600000 }, async t => {
  const app = express();
  app.get('/', (_req, res) => res.type('html').send('<link rel="icon" href="data:,"><style>html,body,#viewport{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="viewport"></div><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>'));
  app.use('/src', express.static(path.resolve('src'))); app.use('/three', express.static(path.resolve('node_modules/three'))); app.use(express.static(path.resolve('public')));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  const document = JSON.parse(await readFile('public/scenes/casa-de-bairro.json', 'utf8'));
  const page = await browser.newPage({ viewport: { width: 480, height: 300 }, deviceScaleFactor: 2, reducedMotion: 'reduce' }); page.setDefaultTimeout(300000);
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async doc => {
    const { createViewport } = await import('/src/render/renderer.js'); const v = window.viewport = createViewport(document.getElementById('viewport'));
    v.setAssets(await (await fetch('/assets/catalog.json')).json()); v.setPresentation(true); v.setCutaway(false);
    v.setDocument({ ...doc, look: { ...doc.look, effectsPaused: true } }); v.setCamera(Object.values(doc.cameraPresets)[1]); await v.ready();
  }, document);
  const measure = async tier => page.evaluate(async tier => {
    const v = window.viewport; v.setLightingQuality(tier); await v.ready(); for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(r));
    return v.getInfo().effects;
  }, tier);
  const economy = await measure('economy'), economyShot = await page.screenshot();
  const balanced = await measure('balanced'), balancedShot = await page.screenshot();
  const high = await measure('high');
  assert.equal(economy.ao, false, 'economy keeps AO off');
  assert.deepEqual([balanced.ao, balanced.samples, balanced.pixelRatio], [true, 4, 1.25]);
  assert.deepEqual([high.ao, high.samples, high.pixelRatio], [true, 4, 1.6]);
  assert.ok(Buffer.compare(economyShot, balancedShot) !== 0, 'tiers render differently');
  assert.deepEqual(errors, []);
  await page.evaluate(() => window.viewport.destroy());
});
