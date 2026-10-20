import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import { reveal } from '../tests/e2e/controls.js';
import { buildFrozenTempleScene } from './frozen-temple-scene.js';

// The frozen temple of scripts/frozen-temple-scene.js, rendered in the real editor (built app, this machine's GPU):
// every camera of the scene, and the eye camera next to the reference.
//   npm run build && node scripts/capture-frozen-temple.js <out-dir> [camera names…]
// CAPTURE_SOFTWARE=1 draws with the software rasteriser on machines without a GPU.
const [out, ...only] = process.argv.slice(2);
const catalog = JSON.parse(await readFile('public/assets/catalog.json')).assets;
const { store, cameras } = await buildFrozenTempleScene(catalog);
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-temple-')), server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening'); let browser;
try {
  await mkdir(out, { recursive: true });
  const base = `http://127.0.0.1:${server.address().port}`, saved = await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) });
  if (saved.status !== 201) throw new Error(`Cena não gravada: ${saved.status} ${await saved.text()}`);
  const software = Boolean(process.env.CAPTURE_SOFTWARE);
  browser = await chromium.launch({ headless: true, args: software ? ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--no-sandbox', '--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: software ? { width: 1200, height: 740 } : { width: 1700, height: 1050 } }), errors = []; page.setDefaultTimeout(software ? 150000 : 90000); page.on('dialog', dialog => dialog.accept()); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?diagnostics${software ? '&hardware' : ''}`); await page.waitForFunction(() => !!window.__tabletop);
  await page.locator('[data-action="open"]').first().click(); await page.waitForTimeout(900);
  await page.locator(`[data-open="${store.document.id}"]`).click(); await page.waitForFunction(key => window.__tabletop.snapshot().id === key, store.document.id);
  await page.waitForTimeout(3000);
  if (await page.locator('.app-shell.inspector-collapsed').count() === 0) await page.locator('[data-action=inspector-toggle]').click();
  const cut = async camera => {
    if (await page.locator('.app-shell.sidebar-collapsed').count()) await page.locator('[data-action=sidebar-toggle]').click();
    await page.locator('.tabs [data-tab="shots"]').click(); await (await reveal(page.locator(`[data-camera-cut="${camera.id}"]`))).click(); await page.locator('[data-action=sidebar-toggle]').click(); await page.waitForTimeout(4000);
  };
  for (const [name, camera] of Object.entries(cameras)) { if (only.length && !only.includes(name)) continue; await cut(camera); await page.screenshot({ path: path.join(out, `${name}.png`) }); console.log(name); }
  console.log('stats', JSON.stringify((await page.evaluate(() => window.__tabletop.stats())).effects ?? {}), 'errors', errors);
  // The plan of the complex: the same scene with the mountain over it hidden (its folder), seen from the top camera.
  if (!only.length || only.includes('plan')) {
    const { store: planStore, cameras: planCameras } = await buildFrozenTempleScene(catalog);
    const mountain = Object.values(planStore.document.layout.groups).find(g => g.name.startsWith('08'));
    planStore.execute('group.update', { id: mountain.id, patch: { visible: false } });
    const savedPlan = await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: planStore.document }) });
    if (savedPlan.status !== 201) throw new Error(`Planta não gravada: ${savedPlan.status}`);
    if (await page.locator('.app-shell.sidebar-collapsed').count()) await page.locator('[data-action=sidebar-toggle]').click();
    await page.locator('[data-action="open"]').first().click(); await page.waitForTimeout(900);
    await page.locator(`[data-open="${planStore.document.id}"]`).click(); await page.waitForFunction(key => window.__tabletop.snapshot().id === key, planStore.document.id); await page.waitForTimeout(2500);
    await cut(planCameras.top); await page.screenshot({ path: path.join(out, 'plan.png') }); console.log('plan');
  }
  if (!only.length || only.includes('eye')) {
    const picture = async file => `data:image/png;base64,${(await readFile(file)).toString('base64')}`;
    await page.setViewportSize({ width: 1920, height: 560 });
    await page.setContent(`<body style="margin:0;background:#111;display:flex;gap:8px;font:14px system-ui;color:#ddd"><figure style="margin:0;flex:1"><img style="width:100%" src="${await picture('docs/references/scenes/templo-gelado.png')}"><figcaption>Referência</figcaption></figure><figure style="margin:0;flex:1"><img style="width:100%" src="${await picture(path.join(out, 'eye.png'))}"><figcaption>Tabletop · Salão · olhos</figcaption></figure></body>`);
    await page.waitForTimeout(800); await page.screenshot({ path: path.join(out, 'comparacao.png'), fullPage: true });
  }
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
