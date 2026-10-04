import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';

const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
function sameCamera(a, b) {
  assert.equal(a.projection, b.projection);
  assert.ok(distance(a.position, b.position) < 1e-6, 'camera position is preserved');
  assert.ok(distance(a.target, b.target) < 1e-6, 'camera target is preserved');
  assert.ok(Math.abs(a.fov - b.fov) < 1e-6);
}
test('WASD, focus safety, lenses, interruptible shots and independent projector motion', { timeout: 180_000 }, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'tabletop-camera-'));
  const server = (await createApp({ dataDir })).listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  t.after(async () => { await browser?.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); });
  browser = await chromium.launch({ executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(), headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`);
  await page.waitForFunction(() => !!window.__tabletop);
  const canvas = page.locator('#viewport canvas');
  const camera = (target = page) => target.evaluate(() => window.__tabletop.camera());
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  const settle = (target = page) => target.waitForFunction(() => !window.__tabletop.stats().cameraMoving);
  const action = async name => (await reveal(page.locator(`[data-action="${name}"]`).first())).click();
  const field = async (name, value) => { const input = await reveal(page.locator(`[data-field="${name}"]`)); await input.fill(String(value)); await input.press('Tab'); };
  async function move(key = 'w') {
    await canvas.focus(); const before = await camera();
    await page.keyboard.down(key);
    await page.waitForFunction(target => Math.hypot(...window.__tabletop.camera().target.map((v, i) => v - target[i])) > 1, before.target);
    await page.keyboard.up(key); await settle(); return before;
  }
  await action('floor-add'); await action('top'); await settle();
  const original = await snapshot(), version = await page.evaluate(() => window.__tabletop.editVersion());
  const topBefore = await move(), topAfter = await camera();
  assert.ok(topAfter.target[2] < topBefore.target[2] - 1); assert.ok(Math.abs(topAfter.target[1] - topBefore.target[1]) < 1e-6);
  assert.deepEqual(await snapshot(), original); assert.equal(await page.evaluate(() => window.__tabletop.editVersion()), version);
  assert.ok(await page.locator('[data-action="tool-move"]').evaluate(node => node.classList.contains('active')), 'W does not replace the transform tool');

  // Mouse navigation must preserve a held W, including after release of the mouse.
  const bounds = await canvas.boundingBox(), mouseX = bounds.x + bounds.width / 2, mouseY = bounds.y + bounds.height / 2;
  await page.mouse.move(mouseX, mouseY); await canvas.focus(); await page.keyboard.down('w');
  const travelForward = async before => page.waitForFunction(target => window.__tabletop.camera().target[2] < target[2] - .4, before.target);
  await travelForward(await camera());
  const beforeZoom = await camera(); await page.mouse.wheel(0, -180); await travelForward(beforeZoom);
  assert.ok((await camera()).orthographicHeight < beforeZoom.orthographicHeight);
  for (const button of ['middle', 'right']) {
    const beforePress = await camera(); await page.mouse.down({ button }); await travelForward(beforePress);
    await page.mouse.move(mouseX + 30, mouseY, { steps: 4 });
    await travelForward(await camera());
    await page.mouse.up({ button }); await travelForward(await camera());
    assert.equal(await page.locator('#context-menu').isVisible(), false, 'camera drag does not select or open a menu');
    await page.mouse.move(mouseX, mouseY);
  }
  await page.keyboard.up('w'); await settle();
  assert.deepEqual(await snapshot(), original); assert.equal(await page.evaluate(() => window.__tabletop.editVersion()), version);

  // Right selection is deferred until release; dragging away and back is still a drag.
  await action('frame'); await settle(); await page.keyboard.press('q'); await page.locator('[data-tab="scene"]').click();
  const floor = Object.values(original.layout.entities).find(entity => entity.kind === 'floor');
  const floorEntry = page.locator(`[data-select="${floor.id}"]`);
  const floorPoint = await page.evaluate(position => window.__tabletop.project(position), floor.transform.position);
  await page.mouse.click(bounds.x + 30, mouseY); // Empty ground, away from the toolbar overlay.
  assert.equal(await floorEntry.evaluate(node => node.classList.contains('selected')), false);
  await page.mouse.move(floorPoint.x, floorPoint.y); await page.mouse.down({ button: 'right' });
  // Cover platforms that fire the native contextmenu immediately on press.
  await canvas.dispatchEvent('contextmenu', { button: 2, clientX: floorPoint.x, clientY: floorPoint.y });
  assert.equal(await floorEntry.evaluate(node => node.classList.contains('selected')), false);
  assert.equal(await page.locator('#context-menu').isVisible(), false);
  await page.mouse.up({ button: 'right' });
  assert.equal(await floorEntry.evaluate(node => node.classList.contains('selected')), true);
  assert.equal(await page.locator('#context-menu').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.mouse.click(bounds.x + 30, mouseY);
  await page.mouse.move(floorPoint.x, floorPoint.y); await page.mouse.down({ button: 'right' });
  await page.mouse.move(floorPoint.x + 40, floorPoint.y, { steps: 4 });
  await page.mouse.move(floorPoint.x, floorPoint.y, { steps: 4 }); await page.mouse.up({ button: 'right' }); await settle();
  assert.equal(await floorEntry.evaluate(node => node.classList.contains('selected')), false);
  assert.equal(await page.locator('#context-menu').isVisible(), false);
  await action('tool-move');

  // Typing, modifiers, and focus loss must never leave the camera drifting.
  await page.locator('#scene-name').focus(); const beforeTyping = await camera();
  await page.keyboard.type('wasd'); await page.keyboard.press('Tab');
  sameCamera(await camera(), beforeTyping);
  await canvas.focus(); await page.keyboard.down('w');
  await page.waitForFunction(target => Math.hypot(...window.__tabletop.camera().target.map((v, i) => v - target[i])) > .2, beforeTyping.target);
  // Release outside the canvas, then regain focus: no stale pressed key survives.
  await page.locator('#scene-name').focus(); await page.keyboard.up('w'); await settle();
  const afterBlur = await camera(); await canvas.focus(); await page.waitForTimeout(250);
  sameCamera(await camera(), afterBlur);
  await page.keyboard.press('Control+d'); await settle(); sameCamera(await camera(), afterBlur);
  await page.keyboard.press('g'); assert.ok(await page.locator('[data-action="tool-move"]').evaluate(node => node.classList.contains('active')));
  await page.keyboard.press('v'); assert.ok(await page.locator('[data-action="tool-scale"]').evaluate(node => node.classList.contains('active')));
  await page.keyboard.press('q');
  await move('PageUp'); assert.ok((await camera()).target[1] > afterBlur.target[1] + 1);

  await action('perspective'); await action('frame'); await settle();
  const beforeHeight = await camera();
  await move('Space'); const afterUp = await camera(); assert.ok(afterUp.target[1] > beforeHeight.target[1] + 1);
  await move('ControlLeft'); const afterDown = await camera(); assert.ok(afterDown.target[1] < afterUp.target[1] - 1);
  await move('ControlRight'); assert.ok((await camera()).target[1] < afterDown.target[1] - 1);
  // Ctrl+WASD belongs to camera navigation while the perspective canvas has focus.
  const beforeCtrlTravel = await snapshot(), ctrlVersion = await page.evaluate(() => window.__tabletop.editVersion());
  await page.evaluate(() => {
    window.__cameraKeyDefaults = [];
    window.__recordCameraKey = event => { if (event.ctrlKey && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) window.__cameraKeyDefaults.push({ code: event.code, prevented: event.defaultPrevented }); };
    window.addEventListener('keydown', window.__recordCameraKey);
  });
  await page.keyboard.down('ControlLeft');
  for (const key of ['a', 'd', 's', 'w']) {
    const before = await camera(); await page.keyboard.down(key);
    await page.waitForFunction(target => {
      const next = window.__tabletop.camera().target;
      return Math.hypot(next[0] - target[0], next[2] - target[2]) > .5 && next[1] < target[1] - .5;
    }, before.target);
    await page.keyboard.down(key); // Key repeat also stays in navigation.
    await page.keyboard.up(key);
  }
  await page.keyboard.down('w'); await page.keyboard.up('ControlLeft');
  const beforeResume = await camera();
  await page.waitForFunction(target => Math.hypot(window.__tabletop.camera().target[0] - target[0], window.__tabletop.camera().target[2] - target[2]) > .5, beforeResume.target);
  await page.keyboard.down('ControlRight'); await page.keyboard.down('Shift');
  const beforeShift = await camera();
  await page.waitForFunction(target => window.__tabletop.camera().target[1] < target[1] - 1, beforeShift.target);
  await page.keyboard.up('Shift'); await page.keyboard.up('ControlRight'); await page.keyboard.up('w'); await settle();
  assert.deepEqual(await snapshot(), beforeCtrlTravel, 'Ctrl+S/D navigation does not save or duplicate objects');
  assert.equal(await page.evaluate(() => window.__tabletop.editVersion()), ctrlVersion);
  assert.equal(await page.evaluate(() => String(window.getSelection())), '', 'Ctrl+A navigation does not select page text');
  const defaults = await page.evaluate(() => { window.removeEventListener('keydown', window.__recordCameraKey); return window.__cameraKeyDefaults; });
  assert.equal(defaults.length, 9); assert.ok(defaults.every(event => event.prevented), 'Ctrl+WASD cancels browser defaults');
  // Text fields retain native Ctrl+A; editing shortcuts remain available off the canvas.
  const beforeShortcut = await camera(); await page.locator('#scene-name').focus();
  await page.keyboard.press('Control+a'); assert.equal(await page.locator('#scene-name').evaluate(node => node.selectionEnd - node.selectionStart), (await snapshot()).name.length);
  await page.locator('[data-tab="scene"]').focus(); await page.keyboard.press('Control+s');
  await page.waitForFunction(() => window.__tabletop.snapshot().revision > 0); await settle(); sameCamera(await camera(), beforeShortcut);
  await page.locator('[data-tab="scene"]').click(); await field('camera-fov', 30);
  assert.equal((await camera()).fov, 30);
  await action('camera-save'); const shotA = Object.values((await snapshot()).cameraPresets)[0];
  await move('d'); await field('camera-fov', 70); await action('camera-save');
  const shotB = Object.values((await snapshot()).cameraPresets)[1];
  await action('publish-camera');
  const popupPromise = page.waitForEvent('popup'); await action('presentation-window'); const popup = await popupPromise;
  popup.on('pageerror', error => errors.push(error.message));
  await popup.waitForFunction(() => document.getElementById('presentation-message')?.hidden === true);
  const publicBefore = await camera(popup);
  await move('w'); sameCamera(await camera(popup), publicBefore);
  await popup.locator('canvas').focus(); await popup.keyboard.press('w'); sameCamera(await camera(popup), publicBefore);

  // First cut to a known starting shot, then test a real gradual transition on both screens.
  await page.locator(`[data-camera-cut="${shotA.id}"]`).click(); await settle(); await settle(popup);
  await page.locator('[data-field="camera-duration"]').selectOption('4');
  await page.locator(`[data-camera="${shotB.id}"]`).click();
  await popup.waitForFunction(() => window.__tabletop.stats().cameraTransition);
  await page.waitForFunction(() => window.__tabletop.stats().cameraTransition);
  const inFlight = await camera(); assert.ok(distance(inFlight.position, shotB.position) > .1);
  // A document update during travel must preserve the transition and camera publication.
  await page.locator('#scene-name').fill('Câmera em teste'); await page.locator('#scene-name').press('Tab');
  assert.equal(await popup.evaluate(() => window.__tabletop.stats().cameraTransition), true);
  await action('camera-cut'); await settle(); await settle(popup);
  assert.ok(distance((await camera()).position, shotB.position) < 1e-6);
  assert.ok(distance((await camera(popup)).position, shotB.position) < 1e-6);
  assert.equal((await camera()).fov, 70);
  await page.locator(`[data-camera="${shotA.id}"]`).click();
  await page.waitForFunction(() => window.__tabletop.stats().cameraTransition);
  await action('camera-stop'); await settle(); await settle(popup);
  const stopped = await camera(); assert.ok(distance(stopped.position, shotA.position) > .1);
  await page.waitForTimeout(200); sameCamera(await camera(), stopped);
  assert.ok(distance((await camera(popup)).position, stopped.position) < 1e-6);

  await page.locator(`[data-camera="${shotA.id}"]`).click(); await canvas.focus(); await page.keyboard.down('a');
  await page.waitForFunction(() => !window.__tabletop.stats().cameraTransition); await page.keyboard.up('a'); await settle();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator(`[data-camera="${shotB.id}"]`).click();
  assert.equal(await page.evaluate(() => window.__tabletop.stats().cameraTransition), false);
  assert.ok(distance((await camera()).position, shotB.position) < 1e-6);
  await action('top'); await action('camera-save'); const topShot = Object.values((await snapshot()).cameraPresets).at(-1);
  await page.locator(`[data-camera-cut="${shotA.id}"]`).click();
  await page.locator(`[data-camera="${topShot.id}"]`).click(); assert.equal((await camera()).projection, 'orthographic');
  const working = await camera(); await action('present'); await move('d');
  const presented = await camera(); await page.keyboard.press('Escape'); await settle();
  sameCamera(await camera(), working);
  await popup.waitForFunction(target => Math.hypot(...window.__tabletop.camera().target.map((v, i) => v - target[i])) < 1e-6, presented.target);
  // Returning from presentation changes the viewport size; allow ResizeObserver and its render to finish.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/camera-controls.png' });
  const revisionBeforeSave = (await snapshot()).revision;
  await action('save'); await page.waitForFunction(revision => window.__tabletop.snapshot().revision > revision, revisionBeforeSave);
  const saved = await snapshot(); await page.reload(); await page.waitForFunction(() => !!window.__tabletop);
  assert.deepEqual((await snapshot()).cameraPresets, saved.cameraPresets); assert.deepEqual(errors, []);
});
