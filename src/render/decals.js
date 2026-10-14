import * as THREE from 'three';

/** How far a decal floats off its face, in metres of its own plane: the polygon offset covers what depth precision cannot at a distance. */
export const DECAL_LIFT = .002;
const FONTS = {
  stencil: { family: '"Stencil Std", Impact, "Arial Black", sans-serif', spacing: '.08em' },
  sans: { family: 'Arial, sans-serif', spacing: '0em' },
  mono: { family: '"Courier New", monospace', spacing: '0em' },
};
const TEXT_WIDTH = 1024, MAX_TEXTURES = 64;

/**
 * Lettering on a transparent canvas, one texture per distinct text. A texture the pool lets go
 * of is only freed on the GPU: a decal still using it uploads it again the next time it is drawn.
 */
export function createDecalTextures({ loadImage = async () => null, anisotropy = 4, createCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height }) } = {}) {
  const texts = new Map();
  function paint(decal) {
    const [w, h] = decal.size, width = TEXT_WIDTH, height = Math.max(64, Math.min(1024, Math.round(width * h / w)));
    const canvas = createCanvas(width, height), ctx = canvas.getContext('2d'), font = FONTS[decal.font] ?? FONTS.sans;
    if (decal.background) { ctx.fillStyle = decal.background; ctx.fillRect(0, 0, width, height); } else ctx.clearRect(0, 0, width, height);
    const text = decal.text; if (!text) return canvas;
    if ('letterSpacing' in ctx) ctx.letterSpacing = font.spacing;
    // The largest letters that fit in 88% of the width and 80% of the height.
    let low = 4, high = height;
    while (high - low > 1) {
      const middle = (low + high) >> 1; ctx.font = `bold ${middle}px ${font.family}`;
      const fits = ctx.measureText(text).width <= width * .88 && middle <= height * .8;
      if (fits) low = middle; else high = middle;
    }
    ctx.font = `bold ${low}px ${font.family}`; ctx.fillStyle = decal.textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + low * .04);
    return canvas;
  }
  return {
    text(decal) {
      const key = JSON.stringify([decal.text, decal.font, decal.textColor, decal.background, decal.size]);
      let texture = texts.get(key);
      if (texture) { texts.delete(key); texts.set(key, texture); return texture; }
      texture = new THREE.CanvasTexture(paint(decal));
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = anisotropy; texture.generateMipmaps = true; texture.userData.tabletopShared = true;
      texts.set(key, texture);
      while (texts.size > MAX_TEXTURES) { const oldest = texts.keys().next().value; texts.get(oldest).dispose(); texts.delete(oldest); }
      return texture;
    },
    image: loadImage,
    get size() { return texts.size; },
    dispose() { for (const texture of texts.values()) texture.dispose(); texts.clear(); },
  };
}

/** Faded patches and fine scratches over the picture, in metres of the decal so they do not stretch with its size. */
function installDecalWear(material, decal) {
  const prior = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prior.call(material, shader, renderer);
    Object.assign(shader.uniforms, { decalWear: { value: new THREE.Vector3(decal.wear.faded, decal.wear.scratched, decal.wear.seed) }, decalAspect: { value: new THREE.Vector2(decal.size[0], decal.size[1]) } });
    shader.vertexShader = 'varying vec2 vDecalUv;\n' + shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvDecalUv = uv;');
    shader.fragmentShader = 'uniform vec3 decalWear; uniform vec2 decalAspect; varying vec2 vDecalUv;\n' +
      'float dh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float dn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(dh(i),dh(i+vec2(1,0)),f.x),mix(dh(i+vec2(0,1)),dh(i+vec2(1,1)),f.x),f.y);}\n' +
      shader.fragmentShader.replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
      { vec2 p = vDecalUv * decalAspect + decalWear.z * 7.13;
        float n = dn(p * 3.0) * .6 + dn(p * 11.0) * .4;
        float fade = smoothstep(1.0 - decalWear.x, 1.0 - decalWear.x + .25, n);
        diffuseColor.a *= 1.0 - fade * .95;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(.3333))), decalWear.x * .5);
        float a = dh(floor(p * 2.0)) * 3.1416; vec2 r = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
        float streak = step(1.0 - decalWear.y * .3, dh(floor(vec2(r.x * 1.5, r.y * 90.0))));
        diffuseColor.a *= 1.0 - streak; }`);
  };
  const priorKey = material.customProgramCacheKey();
  material.customProgramCacheKey = () => `${priorKey}|decal-v1`;
}

/** The plane of a decal, in its own axes: +Z out of the face, +Y up. The entity's group is what moves and turns. */
export async function createDecalInstance(entity, textures) {
  const d = entity.decal, group = new THREE.Group();
  let map = null;
  if (d.kind === 'text') map = textures.text(d);
  else if (d.kind === 'image') {
    const image = await textures.image(d.imageRef);
    if (!image) throw new Error('A imagem do decalque não está disponível.');
    map = image;
  }
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff', map, roughness: .82, metalness: 0, transparent: true, opacity: d.opacity,
    depthWrite: false, depthTest: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, side: THREE.FrontSide,
  });
  // Wear is a uniform: it must tell materials apart for the sharing that swaps equal ones during a frame.
  material.userData.decal = JSON.stringify([d.kind, d.size, d.wear, d.opacity, d.imageRef, d.kind === 'text' ? [d.text, d.font, d.textColor, d.background] : null]);
  installDecalWear(material, d);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.size[0], d.size[1]), material);
  mesh.position.z = DECAL_LIFT; mesh.renderOrder = 2; mesh.castShadow = false; mesh.receiveShadow = true;
  mesh.userData.materialSlot = 'base'; mesh.userData.decal = true;
  group.add(mesh);
  return group;
}
