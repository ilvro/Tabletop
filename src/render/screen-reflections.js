import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { createWetMask } from './wetness.js';

export const WET_LAYER = 30;
const quadVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const viewPoint = `uniform mat4 projection, inverseProjection;
  vec3 viewPoint(vec2 uv, float depth) { vec4 p = inverseProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0); return p.xyz / p.w; }`;

const marchShader = {
  uniforms: { tColor: { value: null }, tDepth: { value: null }, tMask: { value: null }, projection: { value: new THREE.Matrix4() }, inverseProjection: { value: new THREE.Matrix4() }, intensity: { value: 1 } },
  vertexShader: quadVertex,
  fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tColor, tDepth, tMask; uniform float intensity; ${viewPoint}
    void main() {
      vec4 m = texture2D(tMask, vUv);
      if (m.a <= 0.001) { gl_FragColor = vec4(0.0); return; }
      vec3 P = viewPoint(vUv, texture2D(tDepth, vUv).x);
      vec3 N = normalize(m.xyz * 2.0 - 1.0), V = normalize(P), R = normalize(reflect(V, N));
      if (R.z > 0.2) { gl_FragColor = vec4(0.0); return; }
      float stepLen = .08; vec3 Q = P; vec2 hitUv = vec2(-1.0);
      for (int i = 0; i < 32; i++) {
        Q += R * stepLen; stepLen *= 1.12;
        vec4 c = projection * vec4(Q, 1.0); vec2 uv = c.xy / c.w * .5 + .5;
        if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) break;
        float sceneZ = viewPoint(uv, texture2D(tDepth, uv).x).z, diff = sceneZ - Q.z;
        if (diff > 0.0 && diff < .25 + stepLen) {
          vec3 lo = Q - R * stepLen, hi = Q;
          for (int j = 0; j < 5; j++) {
            vec3 mid = (lo + hi) * .5; vec4 cm = projection * vec4(mid, 1.0); vec2 um = cm.xy / cm.w * .5 + .5;
            if (viewPoint(um, texture2D(tDepth, um).x).z > mid.z) hi = mid; else lo = mid;
          }
          vec4 ch = projection * vec4(hi, 1.0); hitUv = ch.xy / ch.w * .5 + .5; break;
        }
      }
      if (hitUv.x < 0.0) { gl_FragColor = vec4(0.0); return; }
      float edge = smoothstep(0.0, .12, min(min(hitUv.x, 1.0 - hitUv.x), min(hitUv.y, 1.0 - hitUv.y)));
      float facing = 1.0 - smoothstep(-.2, .2, R.z);
      float fresnel = .02 + .98 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
      // Water is a mirror at a low angle and a window at a high one; keep a floor so a puddle still shows what is above it.
      gl_FragColor = vec4(texture2D(tColor, hitUv).rgb, m.a * edge * facing * max(fresnel, .25) * intensity);
    }`,
};
// Wet and not quite puddle: blurred; a puddle (mask alpha near one) stays sharp.
const blurShader = {
  uniforms: { tSource: { value: null }, tMask: { value: null }, direction: { value: new THREE.Vector2(1, 0) }, texel: { value: new THREE.Vector2(1, 1) } },
  vertexShader: quadVertex,
  fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tSource, tMask; uniform vec2 direction, texel;
    void main() {
      float radius = mix(5.0, 0.0, smoothstep(.35, .9, texture2D(tMask, vUv).a));
      vec4 sum = vec4(0.0); float weight = 0.0;
      for (int i = -4; i <= 4; i++) { float k = exp(-float(i * i) / 8.0); vec4 s = texture2D(tSource, vUv + direction * texel * float(i) * radius * .25); sum += s * k; weight += k; }
      gl_FragColor = sum / weight;
    }`,
};
const addShader = {
  uniforms: { tReflection: { value: null } }, vertexShader: quadVertex,
  fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tReflection;
    void main() { vec4 r = texture2D(tReflection, vUv); gl_FragColor = vec4(r.rgb * r.a, 1.0); }`,
};
const shaderMaterial = (shader, extra = {}) => new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(shader.uniforms), vertexShader: shader.vertexShader, fragmentShader: shader.fragmentShader, depthTest: false, depthWrite: false, ...extra });

/**
 * Reflections of what is in the frame on wet surfaces. It reads the frame's colour and depth,
 * finds where a ray from each wet pixel meets the picture, and adds that colour back, in place,
 * so the depth the fog needs next is still the frame's own.
 */
export class ScreenReflectionPass extends Pass {
  constructor(scene) {
    super();
    this.scene = scene; this.needsSwap = false; this.intensity = 1; this.wetMeshes = () => []; this.camera = null; this.drawn = 0;
    const half = { type: THREE.HalfFloatType, depthBuffer: false };
    this.mask = new THREE.WebGLRenderTarget(1, 1, { ...half, depthBuffer: true });
    this.reflection = new THREE.WebGLRenderTarget(1, 1, half); this.blurred = new THREE.WebGLRenderTarget(1, 1, half);
    this.march = new FullScreenQuad(shaderMaterial(marchShader)); this.blur = new FullScreenQuad(shaderMaterial(blurShader));
    this.add = new FullScreenQuad(shaderMaterial(addShader, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, transparent: true }));
  }
  setSize(width, height) { const w = Math.max(1, width >> 1), h = Math.max(1, height >> 1); for (const target of [this.mask, this.reflection, this.blurred]) target.setSize(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    this.drawn = 0;
    const meshes = this.wetMeshes().filter(mesh => mesh.visible);
    if (!meshes.length || !this.camera || !readBuffer.depthTexture) return;
    const { camera } = this, previousTarget = renderer.getRenderTarget(), previousLayers = camera.layers.mask, clear = renderer.getClearColor(new THREE.Color()), clearAlpha = renderer.getClearAlpha(), autoClear = renderer.autoClear;
    const swapped = [];
    for (const mesh of meshes) {
      mesh.userData.wetMask ??= createWetMask(mesh.userData.wet);
      const mask = mesh.userData.wetMask; mask.uniforms.tDepth.value = readBuffer.depthTexture; mask.uniforms.maskSize.value.set(this.mask.width, this.mask.height);
      swapped.push([mesh, mesh.material]); mesh.material = mask; mesh.layers.enable(WET_LAYER);
    }
    // 1. Normal and mirror strength of the wet surfaces, hidden ones left out by the frame's own depth.
    renderer.autoClear = true; renderer.setClearColor(0x000000, 0); camera.layers.set(WET_LAYER);
    const background = this.scene.background, fog = this.scene.fog; this.scene.background = null; this.scene.fog = null;
    renderer.setRenderTarget(this.mask); renderer.clear(); renderer.render(this.scene, camera);
    this.scene.background = background; this.scene.fog = fog;
    camera.layers.mask = previousLayers; for (const [mesh, material] of swapped) mesh.material = material;
    // 2. March, 3. blur (two passes), 4. add.
    const march = this.march.material.uniforms;
    march.tColor.value = readBuffer.texture; march.tDepth.value = readBuffer.depthTexture; march.tMask.value = this.mask.texture;
    march.projection.value.copy(camera.projectionMatrix); march.inverseProjection.value.copy(camera.projectionMatrixInverse); march.intensity.value = this.intensity;
    renderer.setRenderTarget(this.reflection); renderer.clear(); this.march.render(renderer);
    const blur = this.blur.material.uniforms; blur.tMask.value = this.mask.texture; blur.texel.value.set(1 / this.reflection.width, 1 / this.reflection.height);
    blur.tSource.value = this.reflection.texture; blur.direction.value.set(1, 0); renderer.setRenderTarget(this.blurred); renderer.clear(); this.blur.render(renderer);
    blur.tSource.value = this.blurred.texture; blur.direction.value.set(0, 1); renderer.setRenderTarget(this.reflection); renderer.clear(); this.blur.render(renderer);
    this.add.material.uniforms.tReflection.value = this.reflection.texture;
    // Added onto the frame itself: nothing may be cleared, or the colour and the depth the fog needs next would go.
    renderer.autoClear = false; renderer.setRenderTarget(readBuffer); this.add.render(renderer);
    renderer.setRenderTarget(previousTarget); renderer.setClearColor(clear, clearAlpha); renderer.autoClear = autoClear; this.drawn = meshes.length;
  }
  dispose() { for (const target of [this.mask, this.reflection, this.blurred]) target.dispose(); for (const quad of [this.march, this.blur, this.add]) { quad.material.dispose(); quad.dispose(); } }
}
