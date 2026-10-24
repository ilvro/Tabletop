import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { reveal } from './controls.js';

// E, as at a table: the door under the pointer swings open or shut, the selected light goes out and comes back.
test('E opens the door under the pointer with a swing, switches the selected light and picks up a document to read', { timeout: 240_000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tabletop-interact-')), server = (await createApp({ dataDir: directory })).listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
  page.setDefaultTimeout(60_000); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?diagnostics`); await page.waitForFunction(() => !!window.__tabletop);
  const snapshot = () => page.evaluate(() => window.__tabletop.snapshot());
  await page.locator('.tabs [data-tab="build"]').click(); await page.locator('#quick-form button[type="submit"]').click(); await page.locator('[data-action="accept-proposal"]').click(); await page.keyboard.press('Escape');
  const room = await snapshot(), door = Object.values(room.layout.entities).find(entity => entity.kind === 'door'), wall = room.layout.entities[door.wallId];
  const q = wall.transform.rotation, yaw = 2 * Math.atan2(q[1], q[3]);
  const middle = [wall.transform.position[0] + Math.cos(yaw) * door.offset, 1, wall.transform.position[2] - Math.sin(yaw) * door.offset];
  const before = room.sessionState.doors?.[door.id] ?? door.initialAngle ?? 0;
  // Nothing selected: pointing at the door and pressing E is enough.
  await page.locator('#viewport').click({ position: { x: 5, y: 5 } }).catch(() => {}); await page.keyboard.press('Escape');
  const point = await page.evaluate(p => window.__tabletop.project(p), middle); await page.mouse.move(point.x, point.y);
  await page.keyboard.press('e');
  await page.waitForFunction(([id, angle]) => { const now = window.__tabletop.snapshot().sessionState.doors?.[id]; return now !== undefined && Math.abs(now - angle) > 1; }, [door.id, before]);
  const after = (await snapshot()).sessionState.doors[door.id];
  // An open door closes; a closed one opens a quarter turn.
  assert.equal(after, Math.abs(before) < .1 ? Math.PI / 2 : 0);
  await page.keyboard.press('e');
  await page.waitForFunction(([id, angle]) => Math.abs(window.__tabletop.snapshot().sessionState.doors[id] - angle) < 1e-6, [door.id, after === 0 ? Math.PI / 2 : 0]);
  // A light: placed, selected, and E with the pointer off the scene.
  await (await reveal(page.locator('[data-action="light-place"]').first())).click();
  const spot = await page.evaluate(() => window.__tabletop.project([1, 0, 0])); await page.mouse.click(spot.x, spot.y); await page.keyboard.press('Escape');
  const light = Object.values((await snapshot()).look.lights).find(entry => entry.role !== 'key');
  assert.ok(light, 'a light was placed');
  await page.locator('.tabs [data-tab="elements"]').click(); await page.locator('#tree-search').fill(light.name); await page.locator(`#scene-tree [data-select="${light.id}"]`).click();
  await page.mouse.move(5, 890); await page.keyboard.press('e');
  await page.waitForFunction(id => window.__tabletop.snapshot().look.lights[id].enabled === false, light.id);
  await page.locator('#undo').click();
  await page.waitForFunction(id => window.__tabletop.snapshot().look.lights[id].enabled !== false, light.id);
  // A document marked as a clue: E with the pointer on it picks it up to read, Esc puts it back.
  await page.locator('[data-tab="assets"]').click(); await page.locator('#asset-search').fill('envelope');
  await page.locator('[data-asset="builtin-document-envelope"]').click();
  const table = await page.evaluate(() => window.__tabletop.project([-1.5, 0, -1])); await page.mouse.click(table.x, table.y); await page.keyboard.press('Escape');
  await (await reveal(page.locator('[data-field="inspect-enabled"]'))).check();
  const paper = Object.values((await snapshot()).layout.entities).find(entity => entity.inspectable);
  assert.ok(paper, 'the envelope is a clue');
  await page.keyboard.press('Escape');
  const over = await page.evaluate(p => window.__tabletop.project(p), [paper.transform.position[0], paper.transform.position[1] + .02, paper.transform.position[2]]);
  // The checkbox just ticked keeps the keyboard; a person would have moved on to the scene.
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(over.x, over.y); await page.keyboard.press('e');
  await page.waitForFunction(id => window.__tabletop.stats().inspection?.entityId === id, paper.id);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__tabletop.stats().inspection?.phase !== 'open');
  assert.deepEqual(errors, []);
});
