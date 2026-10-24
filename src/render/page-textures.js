import * as THREE from 'three';
import { PAGE_SLOT, pageSide, sideKey, layoutPageText } from '../domain/inspectables.js';
import { screenMeshes, screenSlotFrame } from './screens.js';

/**
 * Pages of inspectable documents, drawn on canvases: the paper (plain, aged, photo,
 * newspaper, ruled notebook), the text in the type of that paper and the imported image.
 * The first page shows on the model's `page` slot on the table; the inspection asks
 * for the page and side being read, at reading resolution.
 */
const INK = { plain: '#1d1f26', aged: '#3a2716', photo: '#efe9dc', newspaper: '#16171a', notebook: '#1f3c8c' };
const PAPER = { plain: '#f3f0e6', aged: '#e2cd9f', photo: '#2a2927', newspaper: '#e6dfcb', notebook: '#fbfaf3' };
const HAND = '"Segoe Print", "Bradley Hand", "Comic Neue", "Comic Sans MS", "URW Chancery L", cursive';
const FONT = {
  plain: px => `${px}px Georgia, "DejaVu Serif", "Liberation Serif", serif`,
  aged: px => `italic ${px}px "Palatino Linotype", Palatino, "URW Palladio L", "Book Antiqua", Georgia, serif`,
  photo: px => `${px}px ${HAND}`,
  newspaper: px => `${px}px "Times New Roman", "Liberation Serif", "Nimbus Roman", serif`,
  notebook: px => `${px}px ${HAND}`,
};
const HEADLINE = px => `bold ${px}px "Playfair Display", "Times New Roman", "Liberation Serif", serif`;
/** Clippings and old letters have torn edges, cut by transparency. */
export const TORN = new Set(['aged', 'newspaper']);
export const A4 = .2100 / .2970;

const hash = text => { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0; };
function random(seed) { let s = seed || 1; return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; }; }

/** The page's own paper: colour, grain, and for old paper the stains and darker edges. */
function drawPaper(ctx, W, H, paper, rand) {
  ctx.fillStyle = PAPER[paper]; ctx.fillRect(0, 0, W, H);
  const grain = ctx.createImageData(Math.ceil(W / 4), Math.ceil(H / 4)), strength = paper === 'photo' ? 26 : paper === 'aged' ? 22 : 12;
  for (let i = 0; i < grain.data.length; i += 4) { const v = 128 + (rand() - .5) * strength * 2; grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = v; grain.data[i + 3] = 40; }
  const tile = Object.assign(document.createElement('canvas'), { width: grain.width, height: grain.height }); tile.getContext('2d').putImageData(grain, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.imageSmoothingEnabled = true; ctx.drawImage(tile, 0, 0, W, H); ctx.restore();
  if (paper === 'aged') {
    for (let i = 0; i < 7; i++) {
      // Coffee and damp: soft rings and blotches, darker at the rim.
      const x = rand() * W, y = rand() * H, r = (.05 + rand() * .16) * Math.min(W, H), g = ctx.createRadialGradient(x, y, r * .2, x, y, r);
      g.addColorStop(0, 'rgba(120,78,30,0.05)'); g.addColorStop(.82, `rgba(110,70,26,${.06 + rand() * .08})`); g.addColorStop(1, 'rgba(110,70,26,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(122,74,30,${.08 + rand() * .2})`; ctx.beginPath(); ctx.arc(rand() * W, rand() * H, (.6 + rand() * 2.5) * W / 1024, 0, Math.PI * 2); ctx.fill(); }
    const edge = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .32, W / 2, H / 2, Math.hypot(W, H) * .56);
    edge.addColorStop(0, 'rgba(90,55,20,0)'); edge.addColorStop(1, 'rgba(90,55,20,0.42)'); ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);
  }
  if (paper === 'plain') {
    // A letter that came in an envelope: folded in three.
    for (const k of [1 / 3, 2 / 3]) { const g = ctx.createLinearGradient(0, H * k - 6, 0, H * k + 6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,0.07)'); g.addColorStop(.52, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, H * k - 6, W, 12); }
  }
  if (paper === 'newspaper') { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(160,130,60,0.10)'); g.addColorStop(1, 'rgba(120,100,50,0.18)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}

function ruledLines(ctx, W, H, top, step) {
  top -= Math.ceil(top / step) * step;
  ctx.strokeStyle = 'rgba(70,120,190,0.42)'; ctx.lineWidth = Math.max(1, W / 900);
  for (let y = top; y < H - step * .3; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(205,60,60,0.55)'; ctx.lineWidth = Math.max(1.5, W / 600); ctx.beginPath(); ctx.moveTo(W * .13, 0); ctx.lineTo(W * .13, H); ctx.stroke();
}

/** An image laid in a box: covering it for a photograph, inside it for a print on paper. */
function drawImage(ctx, image, x, y, w, h, cover, paper) {
  const k = (cover ? Math.max : Math.min)(w / image.width, h / image.height), iw = image.width * k, ih = image.height * k;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (paper === 'newspaper') ctx.filter = 'grayscale(1) contrast(1.25) brightness(1.05)';
  else if (paper === 'aged') ctx.filter = 'sepia(.55) contrast(.92)';
  else if (paper === 'photo') ctx.filter = 'saturate(.86) contrast(1.04)';
  ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.filter = 'none';
  if (paper === 'newspaper') { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(230,220,195,0.35)'; ctx.fillRect(x, y, w, h); }
  if (paper === 'photo') { const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * .35, x + w / 2, y + h / 2, Math.hypot(w, h) * .62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.38)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  ctx.restore();
}

function drawText(ctx, text, paper, box, H) {
  const ink = INK[paper], font = FONT[paper];
  let { x, y, w, h } = box;
  if (paper === 'newspaper') {
    // The first line is the headline; the rest runs in two columns.
    const [headline, ...rest] = String(text).split('\n'), hp = H * .052;
    if (headline.trim()) {
      ctx.font = HEADLINE(hp); ctx.fillStyle = ink; ctx.textBaseline = 'top';
      const head = layoutPageText(headline.toUpperCase(), { measureAt: (t, px) => { ctx.font = HEADLINE(px); return ctx.measureText(t).width; }, width: w, height: hp * 3.2, size: hp, lineHeight: 1.08 });
      ctx.font = HEADLINE(head.size); head.lines.forEach((line, i) => ctx.fillText(line, x + (w - ctx.measureText(line).width) / 2, y + i * head.lineHeight));
      y += head.lines.length * head.lineHeight + H * .012; ctx.fillRect(x, y, w, Math.max(2, H * .002)); y += H * .02; h = box.y + box.h - y;
    }
    const gap = w * .05, column = (w - gap) / 2, size = H * .024;
    const body = layoutPageText(rest.join('\n'), { measureAt: (t, px) => { ctx.font = font(px); return ctx.measureText(t).width; }, width: column, height: h * 2, size, minSize: size * .6, lineHeight: 1.3 });
    const perColumn = Math.max(1, Math.floor(h / body.lineHeight));
    ctx.font = font(body.size); ctx.fillStyle = ink; ctx.textBaseline = 'top';
    body.lines.forEach((line, i) => { const c = Math.floor(i / perColumn); if (c < 2) ctx.fillText(line, x + c * (column + gap), y + (i % perColumn) * body.lineHeight); });
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + column + gap / 2, y, Math.max(1, H * .001), h);
    return;
  }
  const size = paper === 'photo' ? H * .06 : paper === 'notebook' ? H * .034 : H * .03;
  const lineHeight = paper === 'notebook' ? 1.6 : 1.42;
  const layout = layoutPageText(text, { measureAt: (t, px) => { ctx.font = font(px); return ctx.measureText(t).width; }, width: w, height: h, size, lineHeight });
  // Handwriting sits on the ruling: the lines follow the size the text settled on.
  if (paper === 'notebook') ruledLines(ctx, ctx.canvas.width, H, y + layout.lineHeight * .82, layout.lineHeight);
  ctx.font = font(layout.size); ctx.fillStyle = ink; ctx.textBaseline = paper === 'notebook' ? 'alphabetic' : 'top';
  if (paper === 'photo') {
    // A caption written on the photograph: centred, low on the frame.
    const top = y + h - layout.lines.length * layout.lineHeight;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = layout.size * .25;
    layout.lines.forEach((line, i) => ctx.fillText(line, x + (w - ctx.measureText(line).width) / 2, top + i * layout.lineHeight));
    ctx.shadowBlur = 0; return;
  }
  layout.lines.forEach((line, i) => ctx.fillText(line, x, y + (paper === 'notebook' ? (i + 1) * layout.lineHeight - layout.lineHeight * .22 : i * layout.lineHeight)));
  return layout;
}

/** Paper torn by hand: everything outside a ragged outline turns transparent. */
function tearEdges(ctx, W, H, rand) {
  const inset = Math.min(W, H) * .012, points = [], step = Math.min(W, H) / 70;
  const jag = () => inset * (.25 + rand() * 1.5);
  for (let x = 0; x <= W; x += step) points.push([x, jag()]);
  for (let y = 0; y <= H; y += step) points.push([W - jag(), y]);
  for (let x = W; x >= 0; x -= step) points.push([x, H - jag()]);
  for (let y = H; y >= 0; y -= step) points.push([jag(), y]);
  ctx.save(); ctx.globalCompositeOperation = 'destination-in'; ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.restore();
}

/**
 * Draws one side of a page on `canvas` (already sized). `image` is the loaded imageRef, or null
 * while it loads or when the side has none. Returns whether the canvas has transparent edges.
 */
export function drawPageSide(canvas, side, paper, image = null) {
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, rand = random(hash(sideKey(side, paper)));
  ctx.clearRect(0, 0, W, H);
  drawPaper(ctx, W, H, paper, rand);
  const margin = paper === 'photo' ? 0 : Math.min(W, H) * .085;
  let box = { x: margin + (paper === 'notebook' ? W * .07 : 0), y: margin, w: W - margin * 2 - (paper === 'notebook' ? W * .07 : 0), h: H - margin * 2 };
  const text = side?.text?.trim() ? side.text : '';
  if (paper === 'notebook' && !text) ruledLines(ctx, W, H, margin + H * .034 * 1.6 * .82, H * .034 * 1.6);
  if (image) {
    if (paper === 'photo') drawImage(ctx, image, 0, 0, W, H, true, paper);
    else {
      const share = text ? .5 : 1, h = box.h * share - (text ? H * .02 : 0);
      drawImage(ctx, image, box.x, box.y, box.w, h, false, paper);
      box = { ...box, y: box.y + h + H * .03, h: box.h - h - H * .03 };
    }
  }
  if (text) drawText(ctx, text, paper, paper === 'photo' ? { x: W * .06, y: H * .06, w: W * .88, h: H * .88 } : box, H);
  const torn = TORN.has(paper);
  if (torn) tearEdges(ctx, W, H, rand);
  return torn;
}

/** Canvas size for a page `aspect` (width / height) with `long` pixels on the longer side. */
export const pageSize = (aspect, long) => aspect >= 1 ? { width: long, height: Math.max(8, Math.round(long / aspect)) } : { width: Math.max(8, Math.round(long * aspect)), height: long };

/** Page axes of a model: the normal of the page slot, the direction of the top of the page and its right. */
export function pageAxes(frame) {
  const normal = new THREE.Vector3().fromArray(frame?.normal ?? [0, 1, 0]);
  const up = Math.abs(normal.y) > .7 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, normal).normalize();
  const size = new THREE.Vector3().fromArray(frame?.size ?? [A4, 0, 1]);
  const extent = axis => Math.abs(axis.x) * size.x + Math.abs(axis.y) * size.y + Math.abs(axis.z) * size.z;
  return { normal, up, right, width: extent(right), height: extent(up), center: new THREE.Vector3().fromArray(frame?.center ?? [0, 0, 0]) };
}

/**
 * The page slot's texture coordinates, projected flat over the page: the top of the image at the top
 * of the page, and the back faces mirrored so that a sheet turned over reads the right way.
 */
export function preparePageUv(object, axes) {
  object.updateWorldMatrix(true, true);
  const inverse = object.matrixWorld.clone().invert(), p = new THREE.Vector3(), n = new THREE.Vector3();
  for (const [mesh] of screenMeshes(object, PAGE_SLOT)) {
    const geometry = mesh.geometry, key = `${axes.right.toArray()}|${axes.width}|${axes.height}`;
    if (geometry.userData.pageUv === key) continue;
    const local = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld), normalMatrix = new THREE.Matrix3().getNormalMatrix(local);
    const position = geometry.attributes.position, normals = geometry.attributes.normal, data = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i).applyMatrix4(local).sub(axes.center);
      const u = p.dot(axes.right) / (axes.width || 1) + .5, v = p.dot(axes.up) / (axes.height || 1) + .5;
      const back = normals && n.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).dot(axes.normal) < -.2;
      data[i * 2] = u; data[i * 2 + 1] = back ? 1 - v : v;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(data, 2)); geometry.userData.pageUv = key;
  }
}

const RESOLUTION = { scene: 1024, reading: 2048, small: 512 };

/** Draws pages and lays them over the `page` slot of the documents in the scene. */
export function createPageRuntime({ loadImage = async () => null, small = false, anisotropy = 1, onChange = () => {}, onError = () => {} } = {}) {
  const pool = new Map(), bound = new Map(), images = new Map(), failedChildren = new WeakMap();
  let destroyed = false, lastEntities = null, documents = [];
  const reading = new Map();

  function image(reference) {
    if (!reference) return Promise.resolve(null);
    const key = `${reference.id}@${reference.revision}`;
    if (!images.has(key)) images.set(key, Promise.resolve(loadImage(reference)).catch(error => { if (!destroyed) onError(error); return null; }));
    return images.get(key);
  }
  function acquire(side, paper, aspect, resolution) {
    const key = `${sideKey(side, paper)}|${aspect.toFixed(3)}|${resolution}`;
    let entry = pool.get(key);
    if (entry) { entry.refs++; return entry; }
    const canvas = Object.assign(document.createElement('canvas'), pageSize(aspect, resolution)), texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = anisotropy; texture.userData.tabletopShared = true;
    entry = { key, canvas, texture, refs: 1, torn: drawPageSide(canvas, side, paper), ready: !side.imageRef };
    pool.set(key, entry);
    if (side.imageRef) image(side.imageRef).then(loaded => {
      if (destroyed || pool.get(key) !== entry) return;
      entry.torn = drawPageSide(canvas, side, paper, loaded); entry.ready = true; texture.needsUpdate = true; onChange();
    });
    return entry;
  }
  function release(entry) { if (entry && --entry.refs <= 0) { entry.texture.dispose(); pool.delete(entry.key); } }

  function style(item, entry, paper) {
    const { material } = item;
    material.map = entry.texture; material.color.set('#ffffff'); material.metalness = 0;
    material.roughness = paper === 'photo' ? .38 : paper === 'newspaper' ? .95 : .9;
    material.alphaTest = entry.torn ? .5 : item.saved.alphaTest; material.needsUpdate = true;
    item.entry = entry;
  }
  function restore(item) {
    const { material, saved } = item;
    Object.assign(material, { map: saved.map, roughness: saved.roughness, metalness: saved.metalness, alphaTest: saved.alphaTest }); material.color.copy(saved.color); material.needsUpdate = true;
  }
  /** What one model shows: page `page`, side `side`, at `resolution`. */
  function show(id, object, record, page, side, resolution) {
    let binding = bound.get(id);
    if (!binding || binding.object !== object || binding.children !== object.children.length) {
      if (binding) unbind(id);
      if (failedChildren.get(object) === object.children.length) return false;
      const frame = screenSlotFrame(object, PAGE_SLOT);
      if (!frame) { failedChildren.set(object, object.children.length); return false; }
      failedChildren.delete(object);
      const axes = pageAxes(frame); preparePageUv(object, axes);
      const items = screenMeshes(object, PAGE_SLOT).map(([mesh, material]) => ({ mesh, material, saved: { map: material.map, color: material.color.clone(), roughness: material.roughness, metalness: material.metalness, alphaTest: material.alphaTest } }));
      binding = { object, axes, items, aspect: axes.width / (axes.height || 1), entry: null, signature: null, children: object.children.length };
      bound.set(id, binding);
    }
    const inspectable = record.inspectable, content = pageSide(inspectable, page, side), signature = `${sideKey(content, inspectable.paper)}|${resolution}`;
    if (binding.signature !== signature) {
      const entry = acquire(content, inspectable.paper, binding.aspect, resolution);
      release(binding.entry); binding.entry = entry; binding.signature = signature;
      for (const item of binding.items) style(item, entry, inspectable.paper);
      onChange();
    } else for (const item of binding.items) if (item.material.map !== binding.entry.texture) style(item, binding.entry, inspectable.paper);
    return true;
  }
  function unbind(id) {
    const binding = bound.get(id); if (!binding) return;
    for (const item of binding.items) restore(item);
    release(binding.entry); bound.delete(id); onChange();
  }

  /** Keeps the first page of every document on its model, and the page being read on the one in the hands. */
  function sync(sceneDocument, objects) {
    const entities = sceneDocument?.layout?.entities;
    if (entities !== lastEntities || !Object.isFrozen(entities ?? {})) { lastEntities = entities; documents = entities ? Object.values(entities).filter(record => record.inspectable?.kind === 'document') : []; }
    if (!documents.length && !bound.size) return;
    if (bound.size) {
      for (const [id, binding] of bound) {
        if (binding.object !== objects.get(id) || !documents.some(record => record.id === id)) unbind(id);
      }
    }
    for (let i = 0; i < documents.length; i++) {
      const record = documents[i], object = objects.get(record.id);
      if (!object) continue;
      const view = reading.get(record.id), pages = record.inspectable.pages.length;
      show(record.id, object, record, view ? Math.min(view.page, pages - 1) : 0, view?.side ?? 'front', view ? (small ? RESOLUTION.scene : RESOLUTION.reading) : small ? RESOLUTION.small : RESOLUTION.scene);
    }
  }

  return {
    sync,
    /** The page and side being read on `id`, or null to go back to the first page. */
    read(id, view) { if (view) reading.set(id, { page: view.page, side: view.side }); else reading.delete(id); },
    /** The page axes of a model's `page` slot (null without one), for holding the sheet square to the camera. */
    axes(id) { return bound.get(id)?.axes ?? null; },
    /** A side drawn at reading resolution, for the full-screen reader. Resolves once its image has loaded. */
    async canvas(record, page, side, id) {
      const inspectable = record.inspectable, content = pageSide(inspectable, page, side);
      const aspect = bound.get(id)?.aspect ?? A4, canvas = Object.assign(document.createElement('canvas'), pageSize(aspect, small ? RESOLUTION.scene : RESOLUTION.reading));
      drawPageSide(canvas, content, inspectable.paper, await image(content.imageRef));
      return canvas;
    },
    info: () => [...bound].map(([id, binding]) => ({ id, key: binding.entry?.key ?? null, ready: binding.entry?.ready ?? false, materials: binding.items.length, aspect: binding.aspect, size: binding.entry ? [binding.entry.canvas.width, binding.entry.canvas.height] : null })),
    dispose() { destroyed = true; for (const id of [...bound.keys()]) unbind(id); for (const entry of pool.values()) entry.texture.dispose(); pool.clear(); },
  };
}
