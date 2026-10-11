import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { createScene } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { worldFootprint } from '../src/domain/geometry.js';
import { rotateXZ, yawFromQuaternion } from '../src/domain/coords.js';
import { proposeRoom } from '../src/authoring/quick-build.js';
import { proposeFurnishing } from '../src/authoring/furnishing.js';
import { ROOM_RECIPES } from '../src/domain/room-recipes.js';

// Floor plans of every room recipe, to review arrangement without opening the editor.
//   node scripts/review-rooms.js <out-dir> [width length density seed]
const [out, width = 6, length = 5, density = 'normal', seed = 1] = process.argv.slice(2);
const catalog = JSON.parse(await readFile('public/assets/catalog.json')).assets, scale = 46, pad = 30;
const plans = ROOM_RECIPES.map(recipe => {
  const store = createSceneStore(createScene());
  store.execute('proposal.accept', { proposal: proposeRoom({ width: Number(width), length: Number(length) }, store.editVersion) });
  const entities = Object.values(store.document.layout.entities), floor = entities.find(e => e.kind === 'floor'), door = entities.find(e => e.kind === 'door'), wall = store.document.layout.entities[door.wallId];
  const proposal = proposeFurnishing(store.document, { floorId: floor.id, template: recipe.id, density, seed: Number(seed) }, store.editVersion, catalog);
  const W = floor.width * scale + pad * 2, H = floor.length * scale + pad * 2 + 22, point = ([x, z]) => `${(x + floor.width / 2) * scale + pad},${(z + floor.length / 2) * scale + pad + 22}`;
  const shapes = proposal.entities.map(entity => {
    const asset = catalog.find(a => a.id === entity.assetRef.id), [x, , z] = entity.transform.position, front = rotateXZ([0, 0, Math.min(.35, asset.footprint[1] / 2)], yawFromQuaternion(entity.transform.rotation));
    const kind = entity.surfaceId !== floor.id ? 'on' : entity.transform.position[1] > 0 ? 'hung' : asset.bounds[1] <= .05 ? 'flat' : 'solid';
    return `<polygon class="${kind}" points="${worldFootprint(entity).map(point).join(' ')}"/><line x1="${point([x, z]).split(',')[0]}" y1="${point([x, z]).split(',')[1]}" x2="${point([x + front[0], z + front[2]]).split(',')[0]}" y2="${point([x + front[0], z + front[2]]).split(',')[1]}"/><text x="${point([x, z]).split(',')[0]}" y="${Number(point([x, z]).split(',')[1]) - 3}">${asset.id.replace('builtin-', '').slice(0, 13)}</text>`;
  }).join('');
  const doorAt = point([wall.transform.position[0] + door.offset, wall.transform.position[2]]).split(',');
  return `<svg width="${W}" height="${H}"><text class="title" x="${pad}" y="16">${recipe.name} · ${proposal.entities.length} peças${proposal.report.omissions.length ? ` · faltou: ${proposal.report.omissions.map(o => o.split(':')[0]).join(', ').slice(0, 60)}` : ''}</text><rect class="room" x="${pad}" y="${pad + 22}" width="${floor.width * scale}" height="${floor.length * scale}"/><rect class="door" x="${doorAt[0] - door.width * scale / 2}" y="${doorAt[1] - 5}" width="${door.width * scale}" height="10"/>${shapes}</svg>`;
});
const html = `<style>body{margin:0;background:#1d2327;font:11px sans-serif;display:flex;flex-wrap:wrap}svg{margin:4px;background:#252d32}.room{fill:#30393f;stroke:#7d8a91;stroke-width:3}.door{fill:#e3b878}polygon{stroke:#11161a;stroke-width:1}.solid{fill:#8fa7b3}.on{fill:#e3b878}.hung{fill:#c06c84}.flat{fill:#4d6a58;opacity:.6}line{stroke:#11161a;stroke-width:2}text{fill:#f3efe6;font-size:8px;text-anchor:middle}.title{font-size:12px;text-anchor:start;fill:#e3b878}</style>${plans.join('')}`;
await mkdir(out, { recursive: true }); await writeFile(path.join(out, 'rooms.html'), html);
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.setContent(html); await page.screenshot({ path: path.join(out, 'rooms.png'), fullPage: true }); await browser.close();
console.log(path.join(out, 'rooms.png'));
