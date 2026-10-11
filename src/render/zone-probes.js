import * as THREE from 'three';

const SIZE = 16, IDLE_MS = 350, DIRECTIONAL_LIMIT = .45, SLOW_MS = 1500;

/** Reflected light per lighting zone. A small cube capture at the zone centre is
 * reduced to four spherical-harmonic coefficients: the average light arriving
 * there and its direction. Surfaces inside the zone then receive ambient light
 * that carries the colour of the floor, walls and lit areas around them, instead
 * of one flat colour, at the brightness authored for the zone.
 *
 * The capture sees direct light plus the authored flat fill, never its own
 * result, so repeated captures do not feed back. A zone is captured once the
 * scene has been still for a moment (models stop arriving, an edit ends), or at
 * once when the caller asks for a finished frame.
 */
export function createZoneProbes(renderer, scene, zones, { slow = false } = {}) {
  const target = new THREE.WebGLCubeRenderTarget(SIZE, { type: THREE.HalfFloatType, generateMipmaps: false });
  const camera = new THREE.CubeCamera(.1, 200, target), pixels = new Uint16Array(SIZE * SIZE * 4), captured = new Map();
  let version = 0, changedAt = -Infinity, captures = 0, pendingCount = 0; const durations = [];
  // Without a GPU a capture takes seconds and would stall editing after every change:
  // a known software renderer starts switched off, and one capture that slow turns
  // reflected light off for the session anywhere else.
  let limit = SLOW_MS, tooSlow = slow;

  // Radiance to L0/L1 coefficients, with the cube-face layout of WebGL render targets.
  function project() {
    const sh = new Float32Array(12), direction = new THREE.Vector3(), step = 2 / SIZE; let total = 0;
    for (let face = 0; face < 6; face++) {
      renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels, face);
      for (let i = 0; i < SIZE * SIZE; i++) {
        const col = -(1 - (i % SIZE + .5) * step), row = 1 - (Math.floor(i / SIZE) + .5) * step;
        switch (face) {
          case 0: direction.set(1, row, -col); break;
          case 1: direction.set(-1, row, col); break;
          case 2: direction.set(col, 1, -row); break;
          case 3: direction.set(col, -1, row); break;
          case 4: direction.set(col, row, 1); break;
          default: direction.set(-col, row, -1);
        }
        const lengthSq = direction.lengthSq(), weight = 4 / (Math.sqrt(lengthSq) * lengthSq); direction.normalize(); total += weight;
        const basis = [.282095, .488603 * direction.y, .488603 * direction.z, .488603 * direction.x];
        for (let c = 0; c < 3; c++) {
          // A lamp filling a few texels must not decide the colour of a whole room.
          const value = Math.min(THREE.DataUtils.fromHalfFloat(pixels[i * 4 + c]), 8) * weight;
          for (let b = 0; b < 4; b++) sh[b * 3 + c] += basis[b] * value;
        }
      }
    }
    for (let i = 0; i < 12; i++) sh[i] *= 4 * Math.PI / total;
    return sh;
  }

  // A single probe is a poor photometer: beside a candle it reads far brighter than
  // the room, in a dim room it reads black. The zone keeps the brightness its author
  // set; the probe contributes colour and direction, scaled to that brightness and
  // with the directional part limited so no surface loses its ambient light.
  const luminance = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;
  function shape(source, fill, n, out) {
    const wanted = luminance(fill[n * 4], fill[n * 4 + 1], fill[n * 4 + 2]) * fill[n * 4 + 3] * Math.PI, average = luminance(source[0], source[1], source[2]) * .886227;
    if (!(average > 1e-4)) { for (let c = 0; c < 3; c++) { out[n * 12 + c] = fill[n * 4 + c] * fill[n * 4 + 3] * Math.PI / .886227; out[n * 12 + 3 + c] = out[n * 12 + 6 + c] = out[n * 12 + 9 + c] = 0; } return; }
    const scale = wanted / average; let strongest = 0;
    for (let b = 1; b < 4; b++) strongest = Math.max(strongest, Math.abs(luminance(source[b * 3], source[b * 3 + 1], source[b * 3 + 2])) * 1.023328);
    const directional = scale * Math.min(1, DIRECTIONAL_LIMIT * average / Math.max(strongest, 1e-6));
    for (let i = 0; i < 12; i++) out[n * 12 + i] = source[i] * (i < 3 ? scale : directional);
  }

  function capture(region, draw) {
    const hidden = [], indirect = zones.uniforms.zoneIndirect.value;
    // Helpers, labels and outlines are not part of the room.
    scene.traverse(o => { if (o.visible && (o.userData.editHelper || o.isSprite || o.isLine || o.isTransformControlsGizmo)) { hidden.push(o); o.visible = false; } });
    indirect.fill(0);
    // Nothing far outside the zone lights it enough to matter; shorter views cull most of a large map.
    const far = Math.max(25, region.radius * 3); for (const face of camera.children) if (face.far !== far) { face.far = far; face.updateProjectionMatrix(); }
    camera.position.copy(region.probe); camera.updateMatrixWorld(true);
    try { draw(() => camera.update(renderer, scene)); } finally { for (const o of hidden) o.visible = true; }
    captured.set(region.id, { key: region.key, version, sh: project(), lights: new Set() }); captures++;
  }

  return {
    /** Geometry, materials or lights changed. */
    invalidate(now = performance.now()) { version++; changedAt = now; },
    /** Writes the coefficients of the active zones and captures at most one zone.
     * `draw(render)` wraps the capture; `urgent` skips the wait for a still scene;
     * `sources(region)` lists the lit lights that reach a zone, so that it is captured
     * again when one lights up for the first time; `visible(region)` limits captures
     * to zones in view, so a large map is not drawn from every room on load;
     * `enabled: false` (economy quality) leaves every zone on its flat fill.
     * Returns whether a capture happened and whether any zone still waits for one. */
    update(now, draw, { urgent = false, enabled = true, sources = null, visible = null } = {}) {
      const regions = zones.regions(), indirect = zones.uniforms.zoneIndirect.value, sh = zones.uniforms.zoneSH.value;
      if (!enabled || tooSlow) { indirect.fill(0); return { captured: false, waiting: false }; }
      const stale = region => {
        const data = captured.get(region.id); if (!data || data.key !== region.key || data.version !== version) return true;
        return Boolean(sources) && sources(region).some(id => !data.lights.has(id));
      };
      let pending = null;
      const wanted = region => region.indirect > 0 && (!visible || visible(region)) && stale(region);
      if (urgent || now - changedAt >= IDLE_MS) pending = regions.find(wanted) ?? null;
      if (pending) {
        const started = performance.now(), lights = new Set([...(captured.get(pending.id)?.version === version ? captured.get(pending.id).lights : []), ...(sources?.(pending) ?? [])]);
        capture(pending, draw); captured.get(pending.id).lights = lights;
        durations.push(Math.round(performance.now() - started)); if (durations.length > 32) durations.shift();
        if (durations.at(-1) > limit) { tooSlow = true; indirect.fill(0); return { captured: false, waiting: false }; }
      }
      let waiting = false; pendingCount = 0;
      regions.forEach((region, n) => {
        const data = region.indirect > 0 ? captured.get(region.id) : null;
        indirect[n] = data ? region.indirect : 0; if (data) shape(data.sh, zones.uniforms.zoneFill.value, n, sh);
        if (wanted(region)) { waiting = true; pendingCount++; }
      });
      for (const id of captured.keys()) if (!regions.some(region => region.id === id)) captured.delete(id);
      return { captured: Boolean(pending), waiting };
    },
    /** Longest capture tolerated before reflected light is switched off; Infinity keeps it on. */
    setLimit(ms) { limit = ms; if (ms === Infinity) tooSlow = false; },
    info() { return { disabled: tooSlow, captures, zones: captured.size, pending: pendingCount, version, captureMs: [...durations], average: Object.fromEntries([...captured].map(([id, data]) => [id, [...data.sh.slice(0, 3)].map(v => Math.round(v * 1e3) / 1e3)])) }; },
    dispose() { target.dispose(); captured.clear(); },
  };
}
