import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const quadVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const horizontal = new THREE.ShaderMaterial({
  uniforms: { tSource: { value: null }, spacing: { value: 1 }, width: { value: 1 } }, vertexShader: quadVertex,
  fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tSource; uniform float spacing, width;
    void main() { vec3 sum = vec3(0.0); float w = 0.0;
      for (int i = -4; i <= 4; i++) { float k = exp(-float(i * i) / 8.0); sum += texture2D(tSource, vUv + vec2(float(i) * spacing / width, 0.0)).rgb * k; w += k; }
      gl_FragColor = vec4(sum / w, 1.0); }`,
  depthTest: false, depthWrite: false,
});
const compose = new THREE.ShaderMaterial({
  uniforms: { tStreak: { value: null }, amount: { value: 0 } }, vertexShader: quadVertex,
  fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tStreak; uniform float amount;
    void main() { vec3 s = texture2D(tStreak, vUv).rgb; vec3 tint = vec3(.9, .95, 1.1);
      gl_FragColor = vec4(amount * tint * mix(s, vec3(dot(s, vec3(.333))), .3), 1.0); }`,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, transparent: true, depthTest: false, depthWrite: false,
});

/**
 * A horizontal smear of the brightest parts of the frame, the streak a cinema lens draws from a strong light.
 * It reads the bloom's own high-pass, so only what already glows is smeared, and adds it back in place.
 */
export class AnamorphicStreakPass extends Pass {
  constructor(bloom) {
    super(); this.bloom = bloom; this.needsSwap = false; this.amount = .5; this.length = .5;
    const options = { type: THREE.HalfFloatType, depthBuffer: false };
    this.a = new THREE.WebGLRenderTarget(1, 1, options); this.b = new THREE.WebGLRenderTarget(1, 1, options);
    this.blur = new FullScreenQuad(horizontal.clone()); this.add = new FullScreenQuad(compose.clone());
  }
  setSize(width, height) { const w = Math.max(1, Math.ceil(width / 4)), h = Math.max(1, Math.ceil(height / 8)); this.a.setSize(w, h); this.b.setSize(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    if (this.amount <= 0) return;
    const previous = renderer.getRenderTarget(), u = this.blur.material.uniforms, scale = 1 + 3 * this.length;
    u.width.value = this.a.width;
    let source = this.bloom.renderTargetBright.texture;
    for (const [target, spacing] of [[this.a, 1], [this.b, 4], [this.a, 16]]) { u.tSource.value = source; u.spacing.value = spacing * scale; renderer.setRenderTarget(target); renderer.clear(); this.blur.render(renderer); source = target.texture; }
    this.add.material.uniforms.tStreak.value = this.a.texture; this.add.material.uniforms.amount.value = this.amount;
    const autoClear = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(readBuffer); this.add.render(renderer); renderer.autoClear = autoClear; renderer.setRenderTarget(previous);
  }
  dispose() { this.a.dispose(); this.b.dispose(); for (const quad of [this.blur, this.add]) { quad.material.dispose(); quad.dispose(); } }
}
