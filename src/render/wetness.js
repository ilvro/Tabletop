import * as THREE from 'three';

/** The one place wetness is computed, for the surface itself and for the mask the reflections read. */
const WET_FUNCTIONS = `
float wetHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wetNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wetHash(i), wetHash(i + vec2(1.0, 0.0)), f.x), mix(wetHash(i + vec2(0.0, 1.0)), wetHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// params: amount, puddles, puddle size (m), seed. Walls only darken, in runs; faces that look up also gather puddles.
void wetEval(vec3 position, vec3 normal, vec4 params, out float wetness, out float puddle) {
  float up = smoothstep(.6, .9, normalize(normal).y);
  puddle = up * smoothstep(1.0 - params.y, 1.0 - params.y + .06, wetNoise(position.xz / params.z + params.w));
  float damp = up > 0.0 ? .6 + .4 * wetNoise(position.xz * 1.7) : .35 + .3 * smoothstep(.2, .8, wetNoise(vec2(position.x + position.z, position.y * .25)));
  wetness = clamp(params.x * damp + puddle, 0.0, 1.0);
}`;

export const wetParams = wet => new THREE.Vector4(wet.amount, wet.puddles, wet.puddleSize, wet.seed);

/** Darkens the surface, takes the roughness down and flattens puddles. Chained after whatever the material already does. */
export function applyWetness(material, wet) {
  if (!wet?.enabled || wet.amount <= 0) return;
  const prior = material.onBeforeCompile, priorKey = material.customProgramCacheKey();
  material.userData.wet = { ...wet };
  material.onBeforeCompile = (shader, renderer) => {
    prior.call(material, shader, renderer);
    shader.uniforms.wetParams = { value: wetParams(wet) };
    shader.vertexShader = 'varying vec3 wetPosition, wetNormal;\n' + shader.vertexShader
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nwetNormal = normalize(mat3(modelMatrix) * objectNormal);')
      .replace('#include <project_vertex>', '#include <project_vertex>\nwetPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = 'uniform vec4 wetParams; varying vec3 wetPosition, wetNormal;\n' + WET_FUNCTIONS + '\n' + shader.fragmentShader
      .replace('#include <alphamap_fragment>', `float wetness, wetPuddle; wetEval(wetPosition, wetNormal, wetParams, wetness, wetPuddle);
        diffuseColor.rgb *= mix(1.0, .55, wetness) * mix(1.0, .9, wetPuddle);
        #include <alphamap_fragment>`)
      .replace('#include <metalnessmap_fragment>', `roughnessFactor = mix(roughnessFactor, .08, wetness); roughnessFactor = mix(roughnessFactor, .02, wetPuddle);
        #include <metalnessmap_fragment>`)
      // Inside a puddle the relief is gone: the normal goes back to the face's own.
      .replace('#include <emissivemap_fragment>', `#ifndef FLAT_SHADED
          normal = normalize(mix(normal, normalize(vNormal) * faceDirection, wetPuddle));
        #endif
        #include <emissivemap_fragment>`);
  };
  material.customProgramCacheKey = () => `wet-v1:${priorKey}`;
  material.needsUpdate = true;
}

/**
 * What the reflections need of a wet mesh: the normal in view space and how much of it mirrors,
 * written where the mesh is not hidden by something nearer in the frame's own depth.
 */
export function createWetMask(wet) {
  return new THREE.ShaderMaterial({
    uniforms: { wetParams: { value: wetParams(wet) }, tDepth: { value: null }, maskSize: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `varying vec3 wetPosition, wetNormal, viewNormal;
      void main() { vec4 world = modelMatrix * vec4(position, 1.0); wetPosition = world.xyz; wetNormal = normalize(mat3(modelMatrix) * normal);
        viewNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * viewMatrix * world; }`,
    fragmentShader: `precision highp float; uniform vec4 wetParams; uniform sampler2D tDepth; uniform vec2 maskSize;
      varying vec3 wetPosition, wetNormal, viewNormal; ${WET_FUNCTIONS}
      void main() {
        if (gl_FragCoord.z > texture2D(tDepth, gl_FragCoord.xy / maskSize).x + 1e-4) discard;
        float wetness, puddle; wetEval(wetPosition, wetNormal, wetParams, wetness, puddle);
        vec3 n = normalize(viewNormal) * (gl_FrontFacing ? 1.0 : -1.0);
        gl_FragColor = vec4(n * .5 + .5, puddle + .35 * wetness * (1.0 - puddle));
      }`,
    side: THREE.DoubleSide,
  });
}
