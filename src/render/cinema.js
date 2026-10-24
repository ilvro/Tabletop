import * as THREE from 'three';
import { FOCUS_DEFAULTS, MOTION_DEFAULTS, FOLLOW_HEIGHT, approach, smootherstep } from '../domain/cinematics.js';

const up = new THREE.Vector3(0, 1, 0);

/**
 * Cinematography of one viewport: focus, following a token, slow camera moves, a smoothed live camera,
 * tokens that glide to where they were moved and the flashlights tokens carry. None of it is document state:
 * the camera preset (or the projector message) says what to do; this module does it frame by frame.
 */
export function createCinema({ effects, objects, records, reducedMotion }) {
  let focus = { ...FOCUS_DEFAULTS }, follow = null, motion = { ...MOTION_DEFAULTS }, goal = null, smoothing = .5;
  let focusDistance = null, aperture = 0, handheld = null;
  const glides = new Map(), flashlights = new Map(), scratch = new THREE.Vector3(), box = new THREE.Box3();

  /** Where to look at or focus on: a token's chest, or the middle of an object. */
  function pointOf(id, out = new THREE.Vector3()) {
    const object = objects.get(id), record = records.get(id);
    if (!object || !object.visible) return null;
    object.updateWorldMatrix(true, false);
    if (record?.actorId) return out.setFromMatrixPosition(object.matrixWorld).addScaledVector(up, (object.userData.focusHeight ?? FOLLOW_HEIGHT) * object.getWorldScale(scratch).y);
    box.setFromObject(object); return box.isEmpty() ? null : box.getCenter(out);
  }
  function setExtras(camera = {}) {
    focus = { ...FOCUS_DEFAULTS, ...camera.focus };
    follow = camera.follow?.targetId ? { targetId: camera.follow.targetId } : null;
    motion = { ...MOTION_DEFAULTS, ...camera.motion };
    if (!focus.enabled) { focusDistance = null; aperture = 0; effects.setFocus({ enabled: false }); }
  }
  // Only what differs from a plain camera, so presets and comparisons stay as they were.
  const extras = () => ({ ...(focus.enabled ? { focus: { ...focus } } : {}), ...(follow ? { follow: { ...follow } } : {}), ...(motion.type !== 'none' ? { motion: { ...motion } } : {}) });

  /** Advance the camera one frame. Returns whether it is still moving. */
  function step(camera, controls, seconds, { transition = false } = {}) {
    let moving = false;
    if (goal && !transition) {
      const k = 1 - Math.exp(-3 * seconds / Math.max(.05, smoothing)), target = new THREE.Vector3().fromArray(goal.target), position = new THREE.Vector3().fromArray(goal.position);
      const remaining = camera.position.distanceTo(position) + controls.target.distanceTo(target) + (camera.isPerspectiveCamera ? Math.abs(camera.fov - goal.fov) * .05 : 0);
      if (remaining > 1e-4) {
        camera.position.lerp(position, k); controls.target.lerp(target, k);
        if (camera.isPerspectiveCamera && Math.abs(camera.fov - goal.fov) > 1e-3) { camera.fov += (goal.fov - camera.fov) * k; camera.updateProjectionMatrix(); }
        moving = true;
      }
    }
    if (follow && !transition) {
      const point = pointOf(follow.targetId);
      if (point) {
        const delta = point.sub(controls.target);
        if (delta.lengthSq() > 4e-6) { delta.multiplyScalar(1 - Math.exp(-3 * seconds / .7)); camera.position.add(delta); controls.target.add(delta); moving = true; }
      }
    }
    if (motion.type !== 'none' && motion.speed > 0 && !reducedMotion.matches && seconds > 0) {
      if (motion.type === 'orbit') { camera.position.sub(controls.target).applyAxisAngle(up, THREE.MathUtils.degToRad(motion.speed * 6) * seconds).add(controls.target); moving = true; }
      else if (motion.type === 'push') {
        const toward = controls.target.clone().sub(camera.position), distance = toward.length();
        if (distance > 1.6) { camera.position.addScaledVector(toward.normalize(), Math.min(motion.speed * .3 * seconds, distance - 1.6)); moving = true; }
      } else if (motion.type === 'handheld') moving = true;
    }
    if (focus.enabled) {
      const point = focus.targetId ? pointOf(focus.targetId) : null;
      const wanted = point ? Math.max(.2, point.distanceTo(camera.position)) : focus.distance;
      // Racking focus takes a moment, like a focus puller turning the ring.
      const before = focusDistance, beforeAperture = aperture;
      focusDistance = focusDistance === null ? wanted : approach(focusDistance, wanted, seconds, .35);
      aperture = approach(aperture, focus.aperture, seconds, .3);
      if (before === null || Math.abs(before - focusDistance) > 1e-4 || Math.abs(beforeAperture - aperture) > 1e-4) moving = true;
      effects.setFocus({ enabled: true, distance: focusDistance, aperture });
    }
    return moving;
  }

  // A handheld camera breathes around where it is: an offset added for the frame and taken away after it.
  function beforeRender(camera, time) {
    if (motion.type !== 'handheld' || reducedMotion.matches || !motion.speed) return;
    const a = motion.speed, wave = (f, p) => Math.sin(time * f + p) * .6 + Math.sin(time * f * 2.31 + p * 1.7) * .3 + Math.sin(time * f * 4.73 + p * .4) * .1;
    handheld = { position: camera.position.clone(), quaternion: camera.quaternion.clone() };
    camera.position.add(new THREE.Vector3(wave(.9, 1), wave(.7, 2), wave(.8, 3)).multiplyScalar(.012 * a));
    camera.rotateY(wave(.45, 4) * .004 * a); camera.rotateX(wave(.55, 5) * .003 * a); camera.rotateZ(wave(.35, 6) * .002 * a);
    camera.updateMatrixWorld();
  }
  function afterRender(camera) { if (!handheld) return; camera.position.copy(handheld.position); camera.quaternion.copy(handheld.quaternion); camera.updateMatrixWorld(); handheld = null; }

  /** A token moved on the projector walks there in a short hop instead of teleporting. Positions are the object's local ones. */
  function glide(id, object, from, to) {
    const distance = from.distanceTo(to);
    if (reducedMotion.matches || distance < .05 || distance > 40) return;
    glides.set(id, { object, from, to: to.clone(), start: performance.now(), duration: Math.min(1.2, Math.max(.35, distance * .22)) * 1000, hop: Math.min(.12, distance * .05) });
    object.position.copy(from);
  }
  function stepGlides(now) {
    for (const [id, item] of glides) {
      const t = Math.min(1, (now - item.start) / item.duration), e = smootherstep(t);
      item.object.position.lerpVectors(item.from, item.to, e).y += Math.sin(Math.PI * t) * item.hop;
      if (t === 1 || objects.get(id) !== item.object) { item.object.position.copy(item.to); glides.delete(id); }
    }
    return glides.size > 0;
  }

  /** The spot a token carries, pointing along the token's +Z with its pitch. Registered with the light budget like any authored spot. */
  function attachFlashlight(id, object, settings) {
    const scale = object.scale.y || 1, wrapper = new THREE.Object3D();
    // Held in the right hand, in front of the figure: the beam leaves from beside the body, not from the face.
    wrapper.position.set(-.14, settings.height / scale, .16);
    // The budget aims a spot along the wrapper's -Y: turn -Y to +Z, then tilt down by the pitch.
    wrapper.rotation.x = THREE.MathUtils.degToRad(settings.pitch) - Math.PI / 2;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(.014, 12), new THREE.MeshBasicMaterial({ color: settings.color }));
    lens.position.y = -.01; lens.rotation.x = Math.PI / 2; lens.userData.decorative = true; wrapper.add(lens);
    object.add(wrapper);
    const source = new THREE.SpotLight(settings.color, settings.enabled ? settings.intensity : 0, settings.distance, settings.angle, settings.penumbra, 2);
    lens.visible = settings.enabled;
    flashlights.set(id, { object, wrapper, source, record: { type: 'spot', distance: settings.distance, angle: settings.angle, penumbra: settings.penumbra, priority: 30, shadowEnabled: settings.shadow, shadowPolicy: settings.shadow ? 'priority' : 'off' } });
  }
  function flashlightDescriptors() {
    const list = [];
    for (const [id, item] of flashlights) {
      if (objects.get(id) !== item.object) { flashlights.delete(id); continue; }
      if (item.source.intensity > 0) list.push({ id: `${id}:flashlight`, wrapper: item.wrapper, source: item.source, record: item.record });
    }
    return list;
  }

  // Names over tokens are for the table view: in a close-up they would cover the face, so they fade near the lens.
  function fadeLabels(camera) {
    for (const [id, record] of records) {
      if (!record?.actorId) continue;
      const object = objects.get(id), labels = object?.children.filter(child => child.isSprite) ?? [];
      if (!labels.length) continue;
      const opacity = Math.min(1, Math.max(0, (camera.position.distanceTo(object.getWorldPosition(scratch)) - 3) / 3));
      for (const label of labels) { label.material.opacity = opacity; label.visible = opacity > .01; }
    }
  }
  return {
    setExtras, extras, step, fadeLabels, beforeRender, afterRender, glide, stepGlides, attachFlashlight, flashlightDescriptors, pointOf,
    setFocus(next) { setExtras({ ...extras(), focus: { ...focus, ...next } }); },
    setFollow(targetId) { follow = targetId ? { targetId } : null; },
    setMotion(next) { motion = { ...MOTION_DEFAULTS, ...next }; },
    /** The projector's live camera: approach this framing with a time constant of `seconds`. */
    setGoal(camera, seconds) { goal = camera ? { position: [...camera.position], target: [...camera.target], fov: camera.fov } : null; smoothing = seconds ?? smoothing; },
    /** Manual navigation in the editor takes over from automatic moves; keyboard travel also leaves the token. */
    interrupt(byKeyboard) { motion = { ...MOTION_DEFAULTS }; goal = null; if (byKeyboard) follow = null; },
    get following() { return follow?.targetId ?? null; },
    info() { return { focus: focus.enabled ? { ...focus, current: focusDistance, aperture } : null, follow: follow?.targetId ?? null, motion: motion.type, goal: Boolean(goal), glides: glides.size, flashlights: [...flashlights].map(([id, item]) => ({ id, on: item.source.intensity > 0 })) }; },
    clear() { glides.clear(); flashlights.clear(); goal = null; },
  };
}
