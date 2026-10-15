import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { createScene, createEntity } from '../src/domain/documents.js';
import { createSceneStore } from '../src/state/scene-store.js';
import { validateDocument } from '../src/domain/validation.js';
import { quaternionFromYaw } from '../src/domain/coords.js';
import { transformMatrix } from '../src/domain/assemblies.js';
import { surfacePatch } from '../src/domain/materials.js';
import { DECAL_ASSET, decalDefaults, validateDecal, decalFrame, decalPlacement, decalAnchorFromWorld, decalSpin, decalSpinAngle, decalFieldPatch } from '../src/domain/decals.js';
import { projectPresentation, presentationAssets } from '../src/app/presentation.js';
import { createDecalInstance, createDecalTextures, DECAL_LIFT } from '../src/render/decals.js';

const catalog = JSON.parse(await readFile(new URL('../public/assets/catalog.json', import.meta.url))).assets;
const ref = id => { const a = catalog.find(item => item.id === id); assert.ok(a, id); return { id: a.id, revision: a.revision }; };
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≉ ${b}`);
const nearAll = (a, b, tolerance = 1e-6) => a.forEach((v, i) => near(v, b[i], tolerance));
const worldOf = (host, offset) => new Vector3(...offset).applyMatrix4(transformMatrix(host.transform)).toArray();

function sceneWith(...hosts) {
  const store = createSceneStore(createScene());
  for (const host of hosts) store.execute('entity.add', { entity: host, snap: false });
  return store;
}
function glue(store, host, point, normal, patch = {}) {
  const { position, rotation, anchor } = decalPlacement(store.document.layout.entities[host.id], point, normal), decal = decalDefaults(patch);
  const entity = createEntity('prop', { name: 'Decalque', assetRef: ref(DECAL_ASSET), footprint: [decal.size[0], .02], position, rotation, anchor, decal });
  store.execute('entity.add', { entity, snap: false }); validateDocument(store.document); return entity;
}
const entityOf = (store, entity) => store.document.layout.entities[entity.id];

test('a decal glued to a wall turned 90° faces the way the wall does and sits on the point that was clicked', () => {
  const wall = createEntity('wall', { position: [2, 0, 1], rotation: quaternionFromYaw(90), length: 4, height: 3 }), store = sceneWith(wall), host = store.document.layout.entities[wall.id];
  const normal = new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...host.transform.rotation)).toArray(), point = worldOf(host, [1.5, 1.6, host.thickness / 2]);
  const { position, rotation, anchor } = decalPlacement(host, point, normal);
  nearAll(new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...rotation)).toArray(), normal); nearAll(position, point); nearAll(worldOf(host, anchor.offset), point); assert.equal(anchor.socket, 'surface'); assert.equal(anchor.hostId, wall.id);
  nearAll(new Vector3(0, 1, 0).applyQuaternion(new Quaternion(...rotation)).toArray(), [0, 1, 0], 1e-9);
  const decal = glue(store, wall, point, normal); nearAll(entityOf(store, decal).transform.position, point); assert.deepEqual(entityOf(store, decal).transform.scale, [1, 1, 1]);
});

test('lettering on a floor or a ceiling reads along the room, whatever way the floor is turned', () => {
  const floor = createEntity('floor', { position: [0, 0, 0], rotation: quaternionFromYaw(30), width: 6, length: 4 }), store = sceneWith(floor), host = store.document.layout.entities[floor.id];
  const q = new Quaternion(...decalFrame([0, 1, 0], host.transform.rotation)), hostQ = new Quaternion(...host.transform.rotation);
  nearAll(new Vector3(0, 1, 0).applyQuaternion(q).toArray(), new Vector3(0, 0, -1).applyQuaternion(hostQ).toArray(), 1e-9);
  nearAll(new Vector3(0, 0, 1).applyQuaternion(q).toArray(), [0, 1, 0], 1e-9);
  const ceiling = new Quaternion(...decalFrame([0, -1, 0], host.transform.rotation)); nearAll(new Vector3(0, 0, 1).applyQuaternion(ceiling).toArray(), [0, -1, 0], 1e-9);
});

test('a decal follows its wall when the wall moves and turns, with the same anchor', () => {
  const wall = createEntity('wall', { position: [0, 0, 0], length: 6, height: 3 }), store = sceneWith(wall);
  const decal = glue(store, wall, [2, 1.4, .09], [0, 0, 1]), anchor = structuredClone(entityOf(store, decal).anchor);
  store.execute('entity.update', { id: wall.id, patch: { transform: { position: [3, 0, 2], rotation: quaternionFromYaw(45) } }, snap: false });
  const host = store.document.layout.entities[wall.id], moved = entityOf(store, decal);
  nearAll(moved.transform.position, worldOf(host, anchor.offset)); assert.deepEqual(moved.anchor, anchor);
  nearAll(new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...moved.transform.rotation)).toArray(), new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...host.transform.rotation)).toArray());
  store.undo(); nearAll(entityOf(store, decal).transform.position, [2, 1.4, .09]);
});

test('a decal on a model follows it through its rotation and its uneven scale', () => {
  const tv = createEntity('prop', { assetRef: ref('builtin-crt-tv'), footprint: [.7, .5], position: [1, .8, 1], rotation: quaternionFromYaw(30), scale: [1.2, 1, .8] }), store = sceneWith(tv);
  const host = store.document.layout.entities[tv.id], normal = new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...host.transform.rotation)).toArray();
  const point = worldOf(host, [.2, .1, .23]), decal = glue(store, tv, point, normal, { size: [.2, .1] });
  nearAll(entityOf(store, decal).transform.position, point); nearAll(worldOf(host, entityOf(store, decal).anchor.offset), point);
  store.execute('entity.update', { id: tv.id, patch: { transform: { position: [-2, .8, 3], rotation: quaternionFromYaw(-70), scale: [1, 1.5, 2] } }, snap: false });
  const next = store.document.layout.entities[tv.id], moved = entityOf(store, decal);
  nearAll(moved.transform.position, worldOf(next, moved.anchor.offset)); nearAll(new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...moved.transform.rotation)).toArray(), new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...next.transform.rotation)).toArray());
});

test('removing the wall removes its decal, and duplicating it duplicates the decal on the copy', () => {
  const wall = createEntity('wall', { position: [0, 0, 0], length: 6, height: 3 }), store = sceneWith(wall), decal = glue(store, wall, [2, 1.4, .09], [0, 0, 1]);
  store.execute('entity.duplicate', { id: wall.id, offset: [0, 0, 4], snap: false });
  const copies = Object.values(store.document.layout.entities), copyWall = copies.find(e => e.kind === 'wall' && e.id !== wall.id), copyDecal = copies.find(e => e.decal && e.id !== decal.id);
  assert.ok(copyWall && copyDecal); assert.equal(copyDecal.anchor.hostId, copyWall.id); nearAll(copyDecal.transform.position, worldOf(copyWall, copyDecal.anchor.offset));
  store.execute('entity.remove', { id: wall.id }); assert.equal(store.document.layout.entities[decal.id], undefined); assert.ok(store.document.layout.entities[copyDecal.id]); validateDocument(store.document);
});

test('what is not a decal glued to a face is refused', () => {
  const wall = createEntity('wall', { position: [0, 0, 0], length: 6, height: 3 }), store = sceneWith(wall), decal = glue(store, wall, [2, 1.4, .09], [0, 0, 1]), valid = structuredClone(entityOf(store, decal));
  const add = patch => store.execute('entity.add', { entity: { ...structuredClone(valid), id: crypto.randomUUID(), ...patch }, snap: false });
  const noAnchor = structuredClone(valid); delete noAnchor.anchor;
  assert.throws(() => add({ anchor: undefined }), /colado/); assert.throws(() => add({ anchor: { ...valid.anchor, hostId: decal.id } }), /decalque/i);
  assert.throws(() => add({ transform: { ...valid.transform, scale: [2, 1, 1] } }), /decal\.size|tamanho/i); assert.throws(() => add({ decal: { ...valid.decal, kind: 'image' } }), /imagem/i);
  assert.throws(() => add({ assetRef: ref('builtin-crate') }), /Decalque/); assert.throws(() => add({ decal: { ...valid.decal, extra: 1 } }));
  const plain = createEntity('prop', { assetRef: ref('builtin-crate'), footprint: [1, 1], anchor: { ...valid.anchor, hostId: wall.id } });
  assert.throws(() => store.execute('entity.add', { entity: plain, snap: false }), /decalques|socket/i);
  for (const bad of [{ size: [0, 1] }, { size: [31, 1] }, { text: 'x'.repeat(81) }, { font: 'gothic' }, { textColor: 'red' }, { background: '#12' }, { opacity: 1.5 }, { wear: { faded: 2, scratched: 0, seed: 1 } }, { wear: { faded: 0, scratched: 0, seed: 1.5 } }, { wear: { faded: 0, scratched: 0 } }, { kind: 'neon' }]) assert.throws(() => validateDecal(decalDefaults(bad)), undefined, JSON.stringify(bad));
  validateDecal(decalDefaults({ background: '#101010', text: '' })); validateDecal(decalDefaults({ kind: 'image', imageRef: { id: 'retrato', revision: 1 } })); validateDecal(decalDefaults({ kind: 'surface' }));
});

test('hidden walls leave no sign behind in the presentation, and a decal carries the image it shows', () => {
  const wall = createEntity('wall', { position: [0, 0, 0], length: 6, height: 3, audience: 'gm' }), store = sceneWith(wall), decal = glue(store, wall, [2, 1.4, .09], [0, 0, 1], { kind: 'image', imageRef: { id: 'retrato', revision: 1 } });
  assert.equal(projectPresentation(store.document).layout.entities[decal.id], undefined);
  store.execute('entity.update', { id: wall.id, patch: { audience: 'all' } });
  const shown = presentationAssets(projectPresentation(store.document), [...catalog, { id: 'retrato', revision: 1, type: 'image', name: 'Retrato', url: '/r.png' }]);
  assert.ok(shown.some(a => a.id === 'retrato') && shown.some(a => a.id === DECAL_ASSET));
});

test('dragging a decal keeps it on its plane and only lets it spin about its normal', () => {
  const wall = createEntity('wall', { position: [1, 0, 1], rotation: quaternionFromYaw(20), length: 6, height: 3 }), store = sceneWith(wall), host = store.document.layout.entities[wall.id];
  const normal = new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...host.transform.rotation)).toArray(), decal = glue(store, wall, worldOf(host, [2, 1.4, .09]), normal), anchor = entityOf(store, decal).anchor;
  const dragged = new Vector3(...entityOf(store, decal).transform.position).addScaledVector(new Vector3(...normal), .7).add(new Vector3(0, .5, 0).applyQuaternion(new Quaternion(...host.transform.rotation))).toArray();
  const next = decalAnchorFromWorld(host, anchor, { position: dragged, rotation: entityOf(store, decal).transform.rotation });
  near(next.offset[2], anchor.offset[2]); near(next.offset[1], anchor.offset[1] + .5); nearAll(next.rotation, anchor.rotation, 1e-9);
  store.execute('entity.update', { id: decal.id, patch: { anchor: next }, snap: false }); validateDocument(store.document);
  const spun = decalAnchorFromWorld(host, anchor, { position: entityOf(store, decal).transform.position, rotation: new Quaternion(...entityOf(store, decal).transform.rotation).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .6).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 6))).toArray() });
  nearAll(new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...spun.rotation)).toArray(), new Vector3(0, 0, 1).applyQuaternion(new Quaternion(...anchor.rotation)).toArray(), 1e-9);
  near(decalSpinAngle(host, spun), 30, 1e-6); near(decalSpinAngle(host, anchor), 0, 1e-6); near(decalSpinAngle(host, decalSpin(host, anchor, -75)), -75, 1e-6);
});

test('the fields of a decal make whole, valid patches', () => {
  const wall = createEntity('wall', { position: [0, 0, 0], length: 6, height: 3 }), store = sceneWith(wall), decal = glue(store, wall, [2, 1.4, .09], [0, 0, 1]), record = entityOf(store, decal);
  const apply = (field, value, options) => { store.execute('entity.update', { id: decal.id, patch: decalFieldPatch(entityOf(store, decal), field, value, { host: store.document.layout.entities[wall.id], ...options }), snap: false }); validateDocument(store.document); return entityOf(store, decal); };
  assert.equal(apply('text', 'SAÍDA').decal.text, 'SAÍDA'); assert.equal(apply('opacity', 60).decal.opacity, .6); assert.equal(apply('wear-faded', 40).decal.wear.faded, .4);
  const wide = apply('size-0', 3); assert.equal(wide.decal.size[0], 3); assert.equal(wide.footprint[0], 3); assert.equal(apply('background-on', true).decal.background, '#1d1d1b'); assert.equal(apply('background-on', false).decal.background, null);
  assert.throws(() => decalFieldPatch(record, 'kind', 'image', { imageAssets: [] }), /imagem/i); assert.equal(decalFieldPatch(record, 'kind', 'image', { imageAssets: [{ id: 'retrato', revision: 2 }] }).decal.imageRef.revision, 2);
  const strip = decalFieldPatch(record, 'kind', 'surface'); assert.equal(strip.material.texture, 'hazard'); assert.equal(decalFieldPatch({ ...record, material: surfacePatch('metal') }, 'kind', 'surface').material, undefined);
  near(decalSpinAngle(store.document.layout.entities[wall.id], apply('spin', 90).anchor), 90, 1e-6);
});

test('a decal is drawn as a plane that floats a hair off its face, without writing depth, and with its own lettering', async () => {
  const canvases = []; const textures = createDecalTextures({ createCanvas: (w, h) => { const canvas = { width: w, height: h, getContext: () => ({ clearRect() {}, fillRect() {}, fillText() {}, measureText: text => ({ width: text.length * 30 }), set font(v) {}, set fillStyle(v) {}, set textAlign(v) {}, set textBaseline(v) {} }) }; canvases.push(canvas); return canvas; } });
  const entity = createEntity('prop', { assetRef: ref(DECAL_ASSET), decal: decalDefaults({ text: 'SETOR 7', size: [2, .5] }) }), instance = await createDecalInstance(entity, textures);
  const mesh = instance.children[0], material = mesh.material;
  assert.equal(mesh.position.z, DECAL_LIFT); assert.ok(DECAL_LIFT >= .001 && DECAL_LIFT <= .005); assert.equal(material.depthWrite, false); assert.equal(material.polygonOffset, true); assert.equal(material.polygonOffsetFactor, -1); assert.equal(material.polygonOffsetUnits, -4);
  assert.equal(material.transparent, true); assert.equal(mesh.receiveShadow, true); assert.equal(mesh.castShadow, false); assert.equal(mesh.userData.decal, true); assert.equal(mesh.userData.materialSlot, 'base');
  assert.deepEqual([canvases[0].width, canvases[0].height], [1024, 256]); assert.equal(textures.text(entity.decal), textures.text(entity.decal), 'equal lettering shares a texture'); assert.equal(textures.size, 1);
  assert.notEqual(textures.text({ ...entity.decal, text: 'OUTRO' }), textures.text(entity.decal));
  const other = await createDecalInstance({ ...entity, decal: { ...entity.decal, wear: { ...entity.decal.wear, faded: .9 } } }, textures); assert.notEqual(other.children[0].material.userData.decal, material.userData.decal);
  await assert.rejects(createDecalInstance({ ...entity, decal: decalDefaults({ kind: 'image', imageRef: { id: 'x', revision: 1 } }) }, textures), /imagem/i);
  const stripe = await createDecalInstance({ ...entity, decal: decalDefaults({ kind: 'surface' }) }, textures); assert.equal(stripe.children[0].material.map, null);
});

test('changing the key light of a scene with glued decals keeps them where they are', () => {
  const wall = createEntity('wall', { position: [0, 0, 0], length: 6, height: 3 }), store = sceneWith(wall), decal = glue(store, wall, [2, 1.4, .09], [0, 0, 1]);
  store.execute('environment.key.update', { patch: { intensity: .1 } }); validateDocument(store.document);
  nearAll(entityOf(store, decal).transform.position, [2, 1.4, .09]);
});
