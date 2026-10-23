import * as THREE from 'three';
import { FIGURE_DEFAULTS, LYING_STATES, ANIMATED_STATES, stateLook, opaqueBounds } from '../domain/figures.js';

const bounds = new WeakMap(), up = new THREE.Vector3(), euler = new THREE.Euler(0, 0, 0, 'YXZ'), quaternion = new THREE.Quaternion();
/** Where the opaque part of an image is, read once per image from a small copy of its alpha. */
function imageBounds(image) {
  if (!image) return { x0: 0, x1: 1, y0: 0, y1: 1 };
  if (bounds.has(image)) return bounds.get(image);
  let result = { x0: 0, x1: 1, y0: 0, y1: 1 };
  try {
    const scale = Math.min(1, 160 / Math.max(image.width, image.height)), width = Math.max(1, Math.round(image.width * scale)), height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data, alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
    result = opaqueBounds(alpha, width, height);
    // A margin of one sample keeps soft edges and the outline from being cut.
    const pad = 1 / Math.max(width, height);
    result = { x0: Math.max(0, result.x0 - pad), x1: Math.min(1, result.x1 + pad), y0: Math.max(0, result.y0 - pad), y1: Math.min(1, result.y1 + pad) };
  } catch { /* a tainted or unreadable image keeps its full frame */ }
  bounds.set(image, result);
  return result;
}

/** A plane standing on its bottom edge, mapped to a part of the texture (`b`), `margin` metres larger on every side. */
function standingPlane(width, height, b, margin = 0) {
  const geometry = new THREE.PlaneGeometry(width + margin * 2, height + margin * 2);
  geometry.translate(0, height / 2, 0);
  const uv = geometry.attributes.uv, mx = margin / width, my = margin / height;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i) * (1 + 2 * mx) - mx, v = uv.getY(i) * (1 + 2 * my) - my;
    uv.setXY(i, b.x0 + u * (b.x1 - b.x0), b.y0 + v * (b.y1 - b.y0));
  }
  return geometry;
}

// The outline is the silhouette grown by a few millimetres: alpha sampled around each point, drawn just behind the portrait.
const outlineShader = {
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform vec2 reach; uniform vec4 window; varying vec2 vUv;
    float alphaAt(vec2 uv) { return (uv.x < window.x || uv.x > window.z || uv.y < window.y || uv.y > window.w) ? 0.0 : texture2D(map, uv).a; }
    void main() {
      // Only the ring around the silhouette: the figure itself is never covered, from either side.
      if (alphaAt(vUv) > 0.5) discard;
      float a = 0.0;
      for (int i = 0; i < 16; i++) { float angle = float(i) * 0.3926991; a = max(a, alphaAt(vUv + vec2(cos(angle), sin(angle)) * reach)); a = max(a, alphaAt(vUv + vec2(cos(angle), sin(angle)) * reach * 0.5)); }
      if (a < 0.5) discard;
      gl_FragColor = vec4(color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

/**
 * The portrait of a character as a cut-out figure: cropped to its opaque part, standing on the base, lit by the scene,
 * with an outline and a rim of light on its edges, turning to face whichever camera draws it, and showing its state.
 * Returns the pivot to add to the token and `tick(time)`, which animates the states that move.
 */
export function createFigure(texture, settings, { baseTop = .11 } = {}) {
  const figure = { ...FIGURE_DEFAULTS, ...settings }, b = imageBounds(texture.image);
  const pixelAspect = ((texture.image?.width ?? 1) * (b.x1 - b.x0)) / ((texture.image?.height ?? 1) * (b.y1 - b.y0));
  const height = figure.height, width = height * pixelAspect, look = stateLook(figure.state);
  const pivot = new THREE.Group(); pivot.rotation.order = 'YXZ'; pivot.position.y = baseTop;
  const uniforms = { figureTime: { value: 0 }, figureTint: { value: look.tint }, figureDesaturate: { value: look.desaturate }, figureDarken: { value: look.darken },
    figurePulse: { value: look.pulse }, figureWobble: { value: look.wobble }, figureRim: { value: figure.rim }, figureRimColor: { value: new THREE.Color(figure.rimColor) },
    figureReach: { value: new THREE.Vector2(.006 * (b.x1 - b.x0) / Math.max(.05, width), .006 * (b.y1 - b.y0) / height) } };
  // Lit like everything else, never darker than a fifth of its own colours, so it still reads in a dark room.
  const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: .22, roughness: .85, metalness: 0, alphaTest: .5, alphaToCoverage: true, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float figureTime, figureTint, figureDesaturate, figureDarken, figurePulse, figureWobble, figureRim; uniform vec3 figureRimColor; uniform vec2 figureReach;
        vec3 figureGrade(vec3 c) {
          float grey = dot(c, vec3(.299, .587, .114)); c = mix(c, vec3(grey), figureDesaturate);
          float beat = 1.0 - figurePulse * .5 + figurePulse * .5 * sin(figureTime * 2.4);
          c = mix(c, c * vec3(1.0, .35, .3) + vec3(.22, 0.0, 0.0) * grey, figureTint * beat);
          return c * (1.0 - figureDarken);
        }`)
      .replace('#include <map_fragment>', `vec2 figureUv = vMapUv + figureWobble * vec2(sin(vMapUv.y * 38.0 + figureTime * 4.0), cos(vMapUv.x * 29.0 + figureTime * 3.1)) * .004;
        vec4 sampledDiffuseColor = texture2D(map, figureUv);
        diffuseColor *= sampledDiffuseColor; diffuseColor.rgb = figureGrade(diffuseColor.rgb);`)
      .replace('#include <emissivemap_fragment>', `totalEmissiveRadiance *= figureGrade(texture2D(emissiveMap, figureUv).rgb);
        // A rim where the silhouette ends: alpha missing nearby means an edge.
        float figureEdge = 0.0;
        for (int i = 0; i < 8; i++) { float angle = float(i) * .7853982; figureEdge = max(figureEdge, 1.0 - texture2D(map, figureUv + vec2(cos(angle), sin(angle)) * figureReach).a); }
        totalEmissiveRadiance += figureRimColor * figureRim * figureEdge * 1.4;`);
  };
  material.customProgramCacheKey = () => 'tabletop-figure';
  // Its own state uniforms: frame-time material sharing must never merge two figures of the same portrait.
  material.userData.figure = THREE.MathUtils.generateUUID();
  const portrait = new THREE.Mesh(standingPlane(width, height, b), material);
  portrait.castShadow = true; portrait.userData.figure = true;
  portrait.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: .5 });
  portrait.customDistanceMaterial = new THREE.MeshDistanceMaterial({ map: texture, alphaTest: .5 });
  pivot.add(portrait);
  const meshes = [portrait];
  if (figure.outline) {
    const margin = figure.outlineWidth;
    const outline = new THREE.Mesh(standingPlane(width, height, b, margin), new THREE.ShaderMaterial({ ...outlineShader, side: THREE.DoubleSide,
      uniforms: { map: { value: texture }, color: { value: new THREE.Color(figure.outlineColor) }, window: { value: new THREE.Vector4(b.x0, b.y0, b.x1, b.y1) },
        reach: { value: new THREE.Vector2(margin / width * (b.x1 - b.x0), margin / height * (b.y1 - b.y0)) } } }));
    // A hair behind the portrait, so the ring never fights the figure's own edge in depth.
    outline.position.z = -.003; outline.userData.decorative = true;
    pivot.add(outline); meshes.push(outline);
  }
  if (LYING_STATES.has(figure.state)) pivot.rotation.x = -Math.PI / 2 * .94;
  // Facing the camera that draws it: each window turns the figure to its own camera, and the document never changes.
  if (figure.facing === 'camera') {
    const face = (renderer, scene, camera) => {
      if (camera.isOrthographicCamera && !LYING_STATES.has(figure.state)) camera.getWorldDirection(up).negate(); else up.setFromMatrixPosition(camera.matrixWorld).sub(pivot.getWorldPosition(new THREE.Vector3()));
      if (up.x * up.x + up.z * up.z < 1e-8) return;
      pivot.parent?.getWorldQuaternion(quaternion); euler.setFromQuaternion(quaternion);
      const yaw = Math.atan2(up.x, up.z) - euler.y;
      if (Math.abs(yaw - pivot.rotation.y) < 1e-5) return;
      pivot.rotation.y = yaw; pivot.updateMatrixWorld(true);
      for (const mesh of meshes) mesh.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld), mesh.normalMatrix.getNormalMatrix(mesh.modelViewMatrix);
    };
    for (const mesh of meshes) mesh.onBeforeRender = face;
  }
  const animated = ANIMATED_STATES.has(figure.state);
  // Where a close-up looks and focus lands: the face of a standing figure, the body of one lying down.
  const focusHeight = LYING_STATES.has(figure.state) ? baseTop + .15 : baseTop + height * .82;
  return { pivot, height, focusHeight, animated, tick(time) { uniforms.figureTime.value = time; return animated; } };
}
