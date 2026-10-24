import * as THREE from 'three';
import { areaOutline, areaTouches } from '../domain/areas.js';

/**
 * Areas of effect on the floor: a translucent fill with a bright rim, plus a ring under every token that the area
 * touches. Built from the scene's session state (and a draft while one is being drawn); a view overlay, never document.
 */
export function createAreaLayer(scene) {
  const group = new THREE.Group(); group.name = 'effect-areas'; scene.add(group);
  const built = new Map(), rings = [];
  let draft = null;
  function build(area, opacity = .24) {
    const points = areaOutline(area), s = Math.sin(area.yaw), c = Math.cos(area.yaw);
    const world = ([along, across]) => new THREE.Vector3(area.origin[0] + s * along + c * across, area.origin[1] + .03, area.origin[2] + c * along - s * across);
    const triangles = THREE.ShapeUtils.triangulateShape(points.map(([a, b]) => new THREE.Vector2(b, a)), []);
    const position = points.flatMap(p => world(p).toArray()), geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); geometry.setIndex(triangles.flat());
    const fill = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: area.color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points.map(p => world(p).add(new THREE.Vector3(0, .005, 0)))), new THREE.LineBasicMaterial({ color: area.color, transparent: true, opacity: .95, toneMapped: false }));
    const holder = new THREE.Group(); holder.add(fill, rim); fill.renderOrder = rim.renderOrder = 7;
    holder.traverse(child => { child.userData.decorative = true; });
    return holder;
  }
  const dispose = holder => holder.traverse(child => { child.geometry?.dispose(); child.material?.dispose(); });
  /** Shows these areas; tokens are `[{ position, radius }]`, for the rings of the ones inside. */
  function sync(areas = [], tokens = []) {
    const wanted = new Map(areas.map(area => [JSON.stringify(area), area]));
    for (const [key, holder] of built) if (!wanted.has(key)) { holder.removeFromParent(); dispose(holder); built.delete(key); }
    for (const [key, area] of wanted) if (!built.has(key)) { const holder = build(area); group.add(holder); built.set(key, holder); }
    let used = 0;
    for (const area of areas) for (const token of tokens) {
      if (!areaTouches(area, token.position, token.radius)) continue;
      const ring = rings[used] ?? (rings[used] = (() => { const mesh = new THREE.Mesh(new THREE.RingGeometry(.48, .58, 40), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 8; mesh.userData.decorative = true; group.add(mesh); return mesh; })());
      ring.material.color.set(area.color); ring.material.opacity = .9; ring.position.set(token.position[0], token.position[1] + .035, token.position[2]); ring.scale.setScalar(token.radius * 2); ring.visible = true; used++;
    }
    for (let i = used; i < rings.length; i++) rings[i].visible = false;
    return used;
  }
  /** The area being drawn, lighter, or null. */
  function setDraft(area) {
    if (draft) { draft.removeFromParent(); dispose(draft); draft = null; }
    if (area) { draft = build(area, .14); group.add(draft); }
  }
  return { sync, setDraft, setVisible(value) { group.visible = value; }, info: () => ({ areas: built.size, touched: rings.filter(ring => ring.visible).length }),
    dispose() { for (const holder of built.values()) dispose(holder); built.clear(); setDraft(null); for (const ring of rings) { ring.geometry.dispose(); ring.material.dispose(); } group.removeFromParent(); } };
}
