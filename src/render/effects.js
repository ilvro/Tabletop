import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Integrate a homogeneous height slab along the view ray, stopping at scene depth.
// One analytical sample per pixel; no light shafts, shadow scattering or simulation.
const volumeShader = {
  name: 'TabletopHeightFog',
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null },
    inverseProjection: { value: new THREE.Matrix4() }, cameraWorld: { value: new THREE.Matrix4() },
    fogColor: { value: new THREE.Color() }, density: { value: .06 },
    baseHeight: { value: 0 }, height: { value: 3 }, maxDistance: { value: 80 },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vUv;
    uniform sampler2D tDiffuse, tDepth;
    uniform mat4 inverseProjection, cameraWorld;
    uniform vec3 fogColor;
    uniform float density, baseHeight, height, maxDistance;
    vec3 viewPoint(float depth) {
      vec4 p = inverseProjection * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      return p.xyz / p.w;
    }
    void main() {
      vec4 original = texture2D(tDiffuse, vUv);
      vec3 start = (cameraWorld * vec4(viewPoint(0.0), 1.0)).xyz;
      vec3 end = (cameraWorld * vec4(viewPoint(texture2D(tDepth, vUv).x), 1.0)).xyz;
      vec3 ray = end - start;
      float distanceToSurface = length(ray);
      vec3 direction = ray / max(distanceToSurface, 0.00001);
      float limit = min(distanceToSurface, maxDistance);
      float entry = 0.0, exit = limit;
      if (abs(direction.y) < 0.00001) {
        if (start.y < baseHeight || start.y > baseHeight + height) exit = 0.0;
      } else {
        float a = (baseHeight - start.y) / direction.y;
        float b = (baseHeight + height - start.y) / direction.y;
        entry = max(0.0, min(a, b)); exit = min(limit, max(a, b));
      }
      float opacity = 1.0 - exp(-density * max(0.0, exit - entry));
      gl_FragColor = vec4(mix(original.rgb, fogColor, opacity), original.a);
    }`,
};

class HeightFogPass extends ShaderPass {
  constructor() { super(volumeShader); }
  render(renderer, writeBuffer, readBuffer, ...rest) {
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    super.render(renderer, writeBuffer, readBuffer, ...rest);
  }
}

/** Lazy optional GPU pipeline. Each viewport owns and can suppress its effects. */
export function createEffectsPipeline(renderer, scene) {
  let composer, renderPass, volumePass, bloomPass, outputPass;
  let currentLook = {}, enabled = true, width = 1, height = 1;
  function dispose() {
    if (!composer) return;
    for (const pass of composer.passes) pass.dispose();
    composer.dispose(); composer = null; bloomPass = null;
  }
  function configure(look = currentLook) {
    currentLook = look;
    if (!enabled || !(look.volumetricFog?.enabled || look.bloom?.enabled)) { dispose(); return; }
    if (!composer) {
      const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1) });
      composer = new EffectComposer(renderer, target);
      // Cap effects at one physical pixel per CSS pixel; bloom uses half-size mips.
      composer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1));
      renderPass = new RenderPass(scene, null);
      volumePass = new HeightFogPass();
      outputPass = new OutputPass();
      composer.addPass(renderPass); composer.addPass(volumePass); composer.addPass(outputPass);
      composer.setSize(width, height);
    }
    volumePass.enabled = Boolean(look.volumetricFog?.enabled);
    if (volumePass.enabled) {
      const f = look.volumetricFog;
      volumePass.uniforms.fogColor.value.set(f.color);
      for (const field of ['density', 'baseHeight', 'height', 'maxDistance']) volumePass.uniforms[field].value = f[field];
    }
    if (look.bloom?.enabled && !bloomPass) {
      bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height));
      composer.insertPass(bloomPass, composer.passes.length - 1);
    } else if (!look.bloom?.enabled && bloomPass) {
      composer.removePass(bloomPass); bloomPass.dispose(); bloomPass = null;
    }
    if (bloomPass) Object.assign(bloomPass, { strength: look.bloom.strength, radius: look.bloom.radius, threshold: look.bloom.threshold });
  }
  return {
    configure,
    setEnabled(value) { enabled = value; configure(); },
    resize(w, h) { if (width === w && height === h) return; width = w; height = h; composer?.setSize(w, h); },
    render(camera, seconds) {
      if (!composer) { renderer.render(scene, camera); return; }
      camera.updateMatrixWorld();
      renderPass.camera = camera;
      volumePass.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
      volumePass.uniforms.cameraWorld.value.copy(camera.matrixWorld);
      composer.render(seconds);
    },
    info() { return { enabled, bloom: Boolean(composer && bloomPass), volumetricFog: Boolean(composer && volumePass.enabled), pixelRatio: Math.min(renderer.getPixelRatio(), 1) }; },
    dispose,
  };
}
