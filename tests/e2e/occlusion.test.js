import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { createScene, createEntity, createToken } from '../../src/domain/documents.js';
import { createSceneStore } from '../../src/state/scene-store.js';

// A character behind a wall: hidden as before, then shown through it as a silhouette, then with the wall opened around it.
test('scenery opens around a character behind it, and a silhouette shows through, only when switched on', { timeout: 300_000 }, async t => {
  const store = createSceneStore(createScene('Oclusão'));
  store.execute('environment.apply', { presetId: 'neutral' });
  store.execute('entity.add', { entity: createEntity('floor', { name: 'Chão', width: 12, length: 12, position: [0, 0, 0] }), snap: false });
  // A tall wall between the camera (at +Z) and the character (at -2).
  const wall = createEntity('wall', { name: 'Parede', length: 6, height: 3, thickness: .2, position: [-3, 0, 0] });
  wall.material = { ...wall.material, color: '#2f6b2f' };
  store.execute('entity.add', { entity: wall, snap: false });
  const { token, actor } = createToken({ name: 'Lia', color: '#ff2a2a', position: [0, 0, -2] });
  store.execute('token.add', { token, actor, snap: false });
  store.execute('camera.save', { camera: { id: 'view', name: 'Vista', projection: 'perspective', position: [0, 1.6, 6], target: [0, .8, -2], fov: 40, orthographicHeight: 18 } });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-occlusion-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/tabletop/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: store.document }) })).status, 201);
  const page = await browser.newPage({ viewport: { width: 1300, height: 850 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/?diagnostics&scene=${store.document.id}&shot=view`);
  await page.waitForFunction(id => window.__tabletop?.snapshot().id === id, store.document.id);
  await page.evaluate(() => window.__tabletop.ready());
  await mkdir('test-results', { recursive: true });
  // "Ver interior" already lifts walls that face the camera in the editor: off, the wall stands in the way.
  await page.locator('[data-action="cutaway"]').click();
  // The colour at the token's base, seen through the wall.
  const sample = async name => {
    await page.waitForTimeout(1200); await page.evaluate(() => window.__tabletop.ready());
    const point = await page.evaluate(p => window.__tabletop.project(p), [0, .035, -1.57]);
    const shot = await page.screenshot({ path: `test-results/occlusion-${name}.png` });
    return page.evaluate(async ([data, x, y]) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob()), canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext('2d');
      context.drawImage(image, 0, 0); return [...context.getImageData(Math.round(x), Math.round(y), 1, 1).data.slice(0, 3)];
    }, [shot.toString('base64'), point.x, point.y]);
  };
  await page.locator('.tabs [data-tab="scene"]').click();
  const toggle = async field => { const box = page.locator(`[data-field="${field}"]`); await box.evaluate(node => { for (let p = node.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS' && !p.open) p.open = true; }); await box.click(); };
  const hidden = await sample('hidden');
  assert.ok(hidden[1] > hidden[0], `the wall hides the character (${hidden})`);
  await toggle('rendering-silhouettes');
  await page.waitForFunction(() => window.__tabletop.snapshot().look.rendering?.silhouettes === true);
  const through = await sample('silhouette');
  assert.ok(through[0] > hidden[0] + 25, `a red silhouette shows through the wall (${hidden} → ${through})`);
  await toggle('rendering-silhouettes'); await toggle('rendering-occlusion');
  await page.waitForFunction(() => window.__tabletop.snapshot().look.rendering?.occlusion === true && !window.__tabletop.snapshot().look.rendering?.silhouettes);
  const opened = await sample('opened');
  assert.ok(opened[0] > opened[1] + 40, `the wall opens and the red base is seen (${opened})`);
  assert.deepEqual(errors, []);
});
