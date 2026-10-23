import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

// Gather depth of field on the frame's own depth: no second scene draw. Each pixel's blur
// circle grows with how far it is from the focal plane; a sample counts when its own circle
// reaches this pixel, and a sharp foreground never smears into the blurred background behind it.
const shader = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null }, resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: .03 }, cameraFar: { value: 1200 }, perspective: { value: 1 },
    focusDistance: { value: 6 }, maxBlur: { value: 12 }, depthScale: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `#include <packing>
    varying vec2 vUv;
    uniform sampler2D tDiffuse, tDepth;
    uniform vec2 resolution;
    uniform float cameraNear, cameraFar, perspective, focusDistance, maxBlur, depthScale;
    #ifndef SAMPLES
    #define SAMPLES 32
    #endif
    float viewDistance(vec2 uv) {
      float depth = texture2D(tDepth, uv).x;
      return perspective > .5 ? -perspectiveDepthToViewZ(depth, cameraNear, cameraFar) : -orthographicDepthToViewZ(depth, cameraNear, cameraFar);
    }
    // Circle of confusion in pixels: thin lens, relative to the focal plane.
    float blurRadius(float z) { return maxBlur * clamp(abs(z - focusDistance) / max(z, .001) * depthScale, 0.0, 1.0); }
    void main() {
      float z = viewDistance(vUv), radius = blurRadius(z);
      vec4 center = texture2D(tDiffuse, vUv);
      if (maxBlur < .5) { gl_FragColor = center; return; }
      vec3 sum = center.rgb; float weight = 1.0;
      const float golden = 2.39996323;
      for (int i = 1; i < SAMPLES; i++) {
        float r = sqrt(float(i) / float(SAMPLES)) * maxBlur;
        vec2 offset = vec2(cos(float(i) * golden), sin(float(i) * golden)) * r;
        vec2 uv = vUv + offset / resolution;
        float sz = viewDistance(uv), sr = blurRadius(sz);
        // In front of this pixel: its own blur decides. Behind it: never more than this pixel's blur.
        float reach = sz < z ? sr : min(sr, radius);
        float w = clamp(reach - r + 1.0, 0.0, 1.0);
        sum += texture2D(tDiffuse, uv).rgb * w; weight += w;
      }
      gl_FragColor = vec4(sum / weight, center.a);
    }`,
};

export class DepthOfFieldPass extends Pass {
  constructor(samples = 32) {
    super();
    this.material = new THREE.ShaderMaterial({ ...shader, uniforms: THREE.UniformsUtils.clone(shader.uniforms), defines: { SAMPLES: samples } });
    this.quad = new FullScreenQuad(this.material);
    // The blur samples the depth of the frame, which is attached to one of the composer's two targets. Drawing into
    // that target while sampling it is a feedback loop WebGL refuses (a black frame): blur into a target of our own, then copy.
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({ ...CopyShader, uniforms: THREE.UniformsUtils.clone(CopyShader.uniforms), depthTest: false, depthWrite: false }));
    this.depth = () => null; this.camera = null;
    this.focusDistance = 6; this.aperture = .45;
  }
  setSamples(samples) { if (this.material.defines.SAMPLES !== samples) { this.material.defines.SAMPLES = samples; this.material.needsUpdate = true; } }
  setSize(width, height) { this.material.uniforms.resolution.value.set(width, height); this.target.setSize(width, height); }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms, camera = this.camera;
    u.tDiffuse.value = readBuffer.texture; u.tDepth.value = this.depth();
    u.cameraNear.value = camera.near; u.cameraFar.value = camera.far; u.perspective.value = camera.isPerspectiveCamera ? 1 : 0;
    u.focusDistance.value = this.focusDistance;
    // Aperture reads as how much the background melts: in pixels of a 1080-line frame.
    u.maxBlur.value = this.aperture * 22 * u.resolution.value.y / 1080;
    u.depthScale.value = 2.5;
    renderer.setRenderTarget(this.target); this.quad.render(renderer);
    this.copy.material.uniforms.tDiffuse.value = this.target.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.copy.render(renderer);
  }
  dispose() { this.material.dispose(); this.quad.dispose(); this.target.dispose(); this.copy.material.dispose(); this.copy.dispose(); }
}
