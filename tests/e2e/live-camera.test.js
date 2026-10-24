import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';

const distance = camera => Math.hypot(...camera.position.map((v, i) => v - camera.target[i]));
const yaw = camera => Math.atan2(camera.position[0] - camera.target[0], camera.position[2] - camera.target[2]);

// The camera as a live instrument: L, momentum zoom, Z/C orbit and double-click to look, without stealing Ctrl+Z.
test('live camera controls: L toggles, the wheel and Z/C glide, double-click looks at a point, Ctrl+Z still undoes', { timeout: 240_000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-live-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  const camera = () => page.evaluate(() => window.__tabletop.camera()), still = () => page.waitForFunction(() => !window.__tabletop.stats().cameraMoving);
  await page.locator('[data-action="floor-add"]').first().evaluate(node => node.click());
  await page.waitForFunction(() => Object.keys(window.__tabletop.snapshot().layout.entities).length === 1);
  const canvas = page.locator('#viewport [data-testid="viewport-canvas"]'), box = await canvas.boundingBox();
  await canvas.focus();

  // L: on, the button lights, and the strip says so; L again: off.
  await page.keyboard.press('l');
  assert.equal(await page.locator('.camera-strip [data-action="live-camera"]').getAttribute('aria-pressed'), 'true');
  await canvas.focus(); await page.keyboard.press('l');
  assert.equal(await page.locator('.camera-strip [data-action="live-camera"]').getAttribute('aria-pressed'), 'false');

  // The wheel pushes the camera in and it keeps gliding after the last notch.
  await still(); const before = await camera();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.wheel(0, -300);
  await page.waitForFunction(() => window.__tabletop.stats().cameraMoving);
  await still(); const zoomed = await camera();
  assert.ok(distance(zoomed) < distance(before) * .8, 'closer after the glide');
  assert.deepEqual(zoomed.target.map(v => +v.toFixed(3)), before.target.map(v => +v.toFixed(3)), 'zoom keeps the point looked at');

  // Z orbits around that point: the angle changes, the distance and the target do not.
  await canvas.focus(); await page.keyboard.down('z'); await page.waitForTimeout(600); await page.keyboard.up('z'); await still();
  const orbited = await camera();
  assert.ok(Math.abs(yaw(orbited) - yaw(zoomed)) > .05, 'turned around the target');
  assert.ok(Math.abs(distance(orbited) - distance(zoomed)) < .05);

  // Double-click on the floor: the camera glides to look at that point.
  await page.mouse.dblclick(box.x + box.width * .3, box.y + box.height * .6); await still();
  const looked = await camera();
  assert.ok(Math.hypot(looked.target[0] - orbited.target[0], looked.target[2] - orbited.target[2]) > .2, 'looks at the clicked point');
  assert.ok(Math.abs(distance(looked) - distance(orbited)) < .1, 'from the same distance');

  // Z and C are camera keys alone; with Ctrl they stay the editing shortcuts.
  await canvas.focus(); await page.keyboard.press('Control+z');
  await page.waitForFunction(() => Object.keys(window.__tabletop.snapshot().layout.entities).length === 0);
  assert.deepEqual(errors, []);
});

// A real mouse drag, not synthetic events: the browser releases the pointer before the slider reports its change.
test('a slider of the live atmosphere dragged with the mouse stays where it was left and is committed', { timeout: 180_000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-amb-drag-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  await page.locator('[data-action="floor-add"]').first().evaluate(node => node.click());
  await page.locator('.rail [data-action="ambience"]').click();
  const range = page.locator('[data-ambience="exposure"]'), box = await range.boundingBox();
  await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(box.x + box.width * (.2 + i * .1), box.y + box.height / 2); await page.waitForTimeout(40); }
  await page.mouse.up(); await page.waitForTimeout(500);
  const shown = Number(await page.locator('[data-ambience="exposure"]').inputValue()), saved = await page.evaluate(() => window.__tabletop.snapshot().look.daylight.exposure);
  assert.ok(shown > 2, `the slider stays where it was left (${shown})`);
  assert.equal(shown, saved);
  assert.deepEqual(errors, []);
});
