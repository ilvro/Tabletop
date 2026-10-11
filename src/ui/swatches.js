import { generateSurfaceTile } from '../render/surface-pixels.js';

/** Previews of the procedural textures, generated while idle and kept between sessions. */
const SIZE = 96, STORE = 'tabletop-swatches-v1', cache = new Map(), queue = [];
let loaded = false, scheduled = false, saving = 0;
function load() {
  if (loaded) return;
  loaded = true;
  try { for (const [key, url] of Object.entries(JSON.parse(localStorage.getItem(STORE) ?? '{}'))) cache.set(key, url); } catch { /* private window or no storage */ }
}
const keyOf = settings => Object.entries(settings).map(([key, value]) => `${key}=${value}`).join(';');
const settingsOf = key => Object.fromEntries(key.split(';').map(pair => pair.split('=')));
const style = url => `background-image:url(${url})`;
/** Inline preview for a texture and, optionally, one of its pattern choices. */
export function swatchMarkup(settings) {
  if (!settings.texture || settings.texture === 'none') return '<i class="swatch-image empty"></i>';
  load();
  const key = keyOf(settings), url = cache.get(key);
  return `<i class="swatch-image" data-swatch="${key}"${url ? ` style="${style(url)}"` : ''}></i>`;
}
function draw(key) {
  const tile = generateSurfaceTile(settingsOf(key), SIZE), canvas = document.createElement('canvas'), pixels = new Uint8ClampedArray(tile.albedo);
  // The alpha channel of a tile is its recolour mask, not transparency.
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  canvas.width = canvas.height = SIZE;
  canvas.getContext('2d').putImageData(new ImageData(pixels, SIZE, SIZE), 0, 0);
  return canvas.toDataURL('image/jpeg', .82);
}
function work(deadline) {
  scheduled = false;
  do {
    const key = queue.shift();
    if (!key) break;
    if (!cache.has(key)) { try { cache.set(key, draw(key)); } catch { cache.set(key, ''); } }
    const url = cache.get(key);
    if (url) for (const node of document.querySelectorAll('[data-swatch]')) if (node.dataset.swatch === key) node.setAttribute('style', style(url));
  } while (deadline?.timeRemaining?.() > 12);
  if (queue.length) schedule();
  clearTimeout(saving);
  saving = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries([...cache].filter(([, url]) => url)))); } catch { /* quota */ } }, 800);
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  (window.requestIdleCallback ?? (callback => setTimeout(callback, 30)))(work);
}
/** Fills the previews that were rendered before their image existed. */
export function paintSwatches(root) {
  for (const node of root.querySelectorAll('[data-swatch]:not([style])')) {
    const key = node.dataset.swatch, url = cache.get(key);
    if (url) node.setAttribute('style', style(url));
    else if (url === undefined && !queue.includes(key)) queue.push(key);
  }
  if (queue.length) schedule();
}
