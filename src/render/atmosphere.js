import * as THREE from 'three';
import { environmentBindingActive, NIGHT_WINDOWS_DEFAULTS, skySettings } from '../domain/lighting.js';

export function applyEnvironmentMaterials(object, entity, look) {
  let binding = look.environmentBindings?.[entity.id];
  if (!binding && entity.kind === 'window' && entity.style === 'glass' && look.daylight?.phase === 'night') {
    binding = { ...NIGHT_WINDOWS_DEFAULTS, ...look.nightWindows, phase: 'night', slot: 'base' };
  }
  if (!binding || !environmentBindingActive(look, binding)) return 0;
  let matches = 0;
  object.traverse(child => {
    if (!child.isMesh || child.userData.decorative) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      const slot = material?.name || child.userData.materialSlot || 'base';
      if (!material?.isMeshStandardMaterial || (binding.slot !== 'base' && slot !== binding.slot)) continue;
      // Glass-pane defaults do not recolor the frame or metal bars.
      if (entity.kind === 'window' && child.userData.materialSlot !== 'base') continue;
      material.emissive.set(binding.color); material.emissiveIntensity = binding.intensity;
      if (entity.kind === 'window') material.opacity = Math.max(material.opacity, .85);
      matches++;
    }
  });
  return matches;
}

export function materialSlots(object) {
  const slots = new Set();
  object?.traverse(child => {
    if (!child.isMesh || child.userData.decorative) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) if (material?.isMeshStandardMaterial) slots.add(material.name || child.userData.materialSlot || 'base');
  });
  return [...slots].sort();
}

const skyVertex = `varying vec3 vDirection;
  void main() { vDirection = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const skyFragment = `varying vec3 vDirection;
  uniform vec3 topColor, horizonColor, cloudColor, sunDirection, discColor, auroraColor, auroraTopColor;
  uniform float time, coverage, opacity, speed, scale, seed, night, darkness, discSize, celestial, stars;
  uniform float starDensity, starBrightness, twinkle, milkyWay, milkyWayAngle, airglow, moonPhase, meteors;
  uniform float aurora, auroraSpeed, auroraDirection, auroraHeight;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)) + seed) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(vec3(i, 0.0)), hash(vec3(i + vec2(1.0, 0.0), 0.0)), f.x),
      mix(hash(vec3(i + vec2(0.0, 1.0), 0.0)), hash(vec3(i + 1.0, 0.0)), f.x), f.y);
  }
  // Sine-free hashes stay stable for large cell indices; the seed only shifts the lattice.
  vec3 hash33(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
  float hash13(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float noise3(vec3 p) {
    vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + 1.0), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) { float v = 0.0, a = .5; for (int i = 0; i < 5; i++) { v += a * noise3(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
  float noise1(float x) { float i = floor(x), f = fract(x); return mix(hash13(vec3(i, seed * .001, 7.0)), hash13(vec3(i + 1.0, seed * .001, 7.0)), f * f * (3.0 - 2.0 * f)); }
  vec3 seedShift() { return vec3(fract(seed * .1234) * 512.0, fract(seed * .5678) * 512.0, fract(seed * .9123) * 512.0); }
  // Black-body-ish tint from a random temperature: most stars white, some blue, a few orange.
  vec3 starTint(float t) {
    return t < .12 ? mix(vec3(1.0, .62, .38), vec3(1.0, .82, .6), t / .12)
      : t < .45 ? mix(vec3(1.0, .82, .6), vec3(1.0, .97, .92), (t - .12) / .33)
      : t < .85 ? mix(vec3(1.0, .97, .92), vec3(.86, .92, 1.0), (t - .45) / .4) : vec3(.72, .82, 1.0);
  }
  // Cube-face grid: d on its dominant face, so cells are nearly square everywhere and a 3x3 search finds every star near d.
  vec3 starField(vec3 d, float cells, float chance, float pixel, float gain, vec3 face, float twinkleAmount) {
    vec3 a = abs(d); vec2 uv; float axis; vec3 e0, e1, e2;
    if (a.x >= a.y && a.x >= a.z) { uv = d.yz / a.x; axis = sign(d.x); e0 = vec3(sign(d.x), 0, 0); e1 = vec3(0, 1, 0); e2 = vec3(0, 0, 1); }
    else if (a.y >= a.z) { uv = d.xz / a.y; axis = 2.0 + sign(d.y); e0 = vec3(0, sign(d.y), 0); e1 = vec3(1, 0, 0); e2 = vec3(0, 0, 1); }
    else { uv = d.xy / a.z; axis = 4.0 + sign(d.z); e0 = vec3(0, 0, sign(d.z)); e1 = vec3(1, 0, 0); e2 = vec3(0, 1, 0); }
    vec2 p = uv * cells; vec2 base = floor(p); vec3 sum = vec3(0.0);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 cell = base + vec2(x, y); vec3 h = hash33(vec3(cell, axis * 37.0) + face);
      if (h.z > chance) continue;
      vec2 center = (cell + .25 + .5 * h.xy) / cells; float m = hash13(vec3(cell, axis) + face.zxy);
      // Counts grow ~3x per magnitude: a power law gives many faint points and a handful of bright ones.
      float flux = gain * min(.018 * pow(1.0001 - m, -.8), 6.0);
      float shimmer = 1.0 + twinkleAmount * (sin(time * (3.0 + 5.0 * h.x) + h.y * 40.0) * .6 + sin(time * (7.0 + 9.0 * h.y) + h.x * 31.0) * .4);
      // Angular distance on the sphere keeps every star round, whatever the face.
      vec3 star = normalize(e0 + e1 * center.x + e2 * center.y);
      float r2 = dot(d - star, d - star) / (pixel * pixel);
      // A pixel-sized core; only the brightest grow a small soft halo.
      float core = exp(-r2 / (.45 + .2 * min(flux, 3.0))), halo = exp(-sqrt(r2) / 1.4) * .025 * max(flux - .6, 0.0);
      sum += starTint(fract(h.x * 7.31 + h.y * 3.17)) * flux * max(shimmer, 0.0) * (core + halo);
    }
    return sum;
  }
  vec3 rotateY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
  vec3 milkyWayGlow(vec3 d, out float band) {
    // Galactic pole tilted 62 degrees from the zenith; the angle turns the band around the sky.
    vec3 pole = rotateY(normalize(vec3(sin(1.08), cos(1.08), 0.0)), milkyWayAngle);
    vec3 top = normalize(vec3(0.0, 1.0, 0.0) - pole * pole.y), side = cross(pole, top);
    vec3 core = normalize(top * cos(.75) + side * sin(.75));
    float latitude = dot(d, pole), longitude = atan(dot(d, side), dot(d, top)) - .75;
    float bulge = exp(-longitude * longitude / .35);
    float width = .08 + .08 * bulge;
    band = exp(-latitude * latitude / (width * width));
    if (band < .01) return vec3(0.0);
    vec3 q = d * 6.0 + seedShift() * .01;
    float clouds = fbm3(q), detail = fbm3(q * 3.1 + 5.0);
    float mottled = smoothstep(.3, .75, clouds);
    float glow = band * (.3 + 1.1 * mottled * mottled) * (.5 + .6 * detail) + bulge * exp(-latitude * latitude / .01) * .6 * (.6 + .6 * clouds);
    // Dust lanes: a dark rift slightly off the plane, broken up by noise.
    float rift = exp(-pow((latitude - .015) / (.035 + .03 * bulge), 2.0)) * smoothstep(.35, .7, fbm3(q * 1.7 + 11.0)) * smoothstep(-2.4, -.5, longitude + 2.0 * bulge);
    glow *= 1.0 - .8 * rift;
    vec3 tint = mix(vec3(.62, .7, 1.0), vec3(1.0, .82, .62), bulge * .8);
    return tint * glow * .26;
  }
  vec3 auroraLight(vec3 d) {
    if (d.y < .01) return vec3(0.0);
    vec3 r = rotateY(d, -auroraDirection);
    float t = time * auroraSpeed, distance = mix(5.0, 1.2, auroraHeight), jitter = hash13(vec3(gl_FragCoord.xy, fract(time)));
    vec3 sum = vec3(0.0);
    // March up through the emitting layer; every sample sits on the curtain plane seen along this direction.
    for (int i = 0; i < 28; i++) {
      float h = (float(i) + jitter) / 28.0, height = 1.0 + h * 2.2, along = height / r.y;
      vec2 ground = r.xz * along;
      float x = ground.x + seed * .013;
      float fold = distance + 3.2 * (noise1(x * .16 + t * .12) - .5) + 1.1 * sin(x * .35 + t * .3) + .35 * sin(x * 1.1 - t * .7);
      float sheet = 0.0;
      for (int k = 0; k < 2; k++) {
        float offset = float(k) * (.9 + .6 * noise1(x * .15 + 3.0 + t * .05));
        float dz = -ground.y - fold - offset;
        sheet += exp(-dz * dz / (.045 + .02 * float(k))) * (1.0 - .45 * float(k));
      }
      // Vertical rays: brightness varies along the curtain but not up it.
      float rays = .25 + .75 * pow(noise1(x * 9.0 + t * 1.6 + 4.0 * noise1(x * .9 - t * .2)), 2.5);
      float profile = smoothstep(0.0, .06, h) * exp(-h * 2.6);
      float far = exp(-along * .05);
      vec3 tint = mix(auroraColor, auroraTopColor, smoothstep(.25, .85, h));
      sum += tint * sheet * rays * profile * far;
    }
    return sum * aurora * .13 * smoothstep(.01, .08, d.y);
  }
  vec3 meteorLight(vec3 d, float pixel) {
    vec3 sum = vec3(0.0);
    float period = mix(40.0, 3.0, meteors);
    for (int k = 0; k < 2; k++) {
      float slot = floor(time / period + float(k) * .5), local = time - (slot - float(k) * .5) * period;
      vec3 h = hash33(vec3(slot, float(k), 91.0) + seedShift());
      if (h.z > .75 || local > .9) continue;
      vec3 start = normalize(vec3(h.x * 2.0 - 1.0, .45 + .5 * h.y, hash13(vec3(slot, 3.0, float(k))) * 2.0 - 1.0));
      vec3 drift = normalize(cross(start, normalize(vec3(h.y - .5, -.6, h.x - .5))));
      float run = .35 * local, tail = max(0.0, run - .12);
      vec3 head = normalize(start + drift * run), back = normalize(start + drift * tail), seg = head - back;
      float along = clamp(dot(d - back, seg) / max(dot(seg, seg), 1e-6), 0.0, 1.0);
      float dist = length(d - back - seg * along) / pixel;
      float life = smoothstep(0.0, .1, local) * (1.0 - smoothstep(.55, .9, local));
      sum += vec3(.85, .92, 1.0) * exp(-dist * dist / .8) * along * along * life * 3.0;
    }
    return sum * smoothstep(0.0, .2, d.y);
  }
  void main() {
    vec3 d = normalize(vDirection);
    float pixel = max(length(fwidth(d)) * .7, 1e-5), up = max(d.y, 0.0);
    vec3 color = mix(horizonColor, topColor, pow(up, .45));
    float alignment = dot(d, normalize(sunDirection));
    // Sunlight scattered forward brightens the sky around the sun and along the horizon.
    color += horizonColor * (1.0 - night) * (.18 * pow(max(alignment, 0.0), 6.0) + .1 * pow(max(alignment, 0.0), 40.0)) * celestial;
    // Faint lights only show against a dark sky: a bright painted sky hides them, as daylight does.
    float skyLight = dot(color, vec3(.2126, .7152, .0722)), contrast = 1.0 - smoothstep(.08, .3, skyLight);
    float starsVisible = stars * darkness * contrast;
    float airmass = 1.0 / max(d.y + .03, .03), extinction = exp(-.12 * (airmass - 1.0)) * smoothstep(-.01, .06, d.y);
    if (starsVisible > 0.0) {
      vec3 shift = seedShift();
      float scintillation = twinkle * mix(.12, .55, 1.0 - smoothstep(0.0, .6, d.y));
      float band = 0.0; vec3 galaxy = milkyWay > 0.0 ? milkyWayGlow(d, band) * milkyWay : vec3(0.0);
      vec3 field = starField(d, 34.0, .2 + .75 * starDensity, pixel, 1.0, shift, scintillation);
      // A denser, fainter population resolves the band into stars.
      field += starField(d, 110.0, (.1 + .5 * starDensity) * (.25 + .75 * band * step(.001, milkyWay)), pixel, .35, shift + 71.0, scintillation * .6);
      // A bright moon washes out the faint stars and the Milky Way, most of all around it.
      float moonlight = night * celestial * (1.0 - abs(moonPhase * 2.0 - 1.0)), wash = moonlight * (.45 + .5 * pow(max(alignment, 0.0), 6.0));
      color += (field * starBrightness * 1.6 * (1.0 - .6 * wash) + galaxy * (1.0 - .8 * wash)) * starsVisible * extinction;
      // Airglow: a faint green-to-amber band a few degrees above the horizon.
      float glowBand = exp(-pow((d.y - .07) / .09, 2.0));
      color += mix(vec3(.05, .11, .06), vec3(.09, .07, .03), smoothstep(.0, .12, d.y)) * glowBand * airglow * starsVisible;
      if (meteors > 0.0) color += meteorLight(d, pixel) * starsVisible;
    }
    if (aurora > 0.0) color += auroraLight(d) * darkness * mix(.35, 1.0, contrast);
    // Moon: limb darkening, maria and the phase terminator; the sun keeps a bright disc.
    float radius = discSize, angle = acos(clamp(alignment, -1.0, 1.0));
    float disc = (1.0 - smoothstep(radius * .92, radius * 1.04, angle)) * celestial;
    float lit = 1.0;
    if (disc > 0.0) {
      vec3 sun = normalize(sunDirection), east = normalize(cross(abs(sun.y) > .99 ? vec3(1, 0, 0) : vec3(0, 1, 0), sun)), north = cross(sun, east);
      vec2 uv = vec2(dot(d, east), dot(d, north)) / sin(radius);
      vec3 n = vec3(uv, sqrt(max(0.0, 1.0 - dot(uv, uv))));
      float phase = moonPhase * 6.2831853;
      lit = mix(1.0, smoothstep(-.04, .08, dot(n, vec3(sin(phase), 0.0, -cos(phase)))), night);
      float maria = smoothstep(.42, .62, fbm3(vec3(uv * 1.6 + 4.0, 3.0))) * .45 + noise3(vec3(uv * 22.0, 9.0)) * .08;
      float limb = .55 + .45 * pow(n.z, .5);
      float moonFace = (1.0 - maria) * limb * mix(.04, 1.0, lit);
      color = mix(color, discColor * mix(2.0, moonFace * 1.05, night), disc);
    }
    float halo = night > .5 ? (moonPhase < .5 ? moonPhase : 1.0 - moonPhase) * 2.0 : 1.0;
    color += discColor * (pow(max(alignment, 0.0), 180.0) * .12 + pow(max(alignment, 0.0), 1200.0) * .25 * night) * celestial * halo * (1.0 - disc * night);
    // Cloud layer seen in perspective; the finer octaves fade where they would shimmer, near the horizon.
    vec2 p = d.xz / (up + .1) * scale + vec2(time * speed, time * speed * .3);
    float footprint = length(fwidth(p));
    float cloud = .55 * noise(p) + .3 * mix(noise(p * 2.1), .5, smoothstep(.2, .6, footprint * 2.1)) + .15 * mix(noise(p * 4.3), .5, smoothstep(.2, .6, footprint * 4.3));
    float mask = smoothstep(1.0 - coverage - .12, 1.0 - coverage + .12, cloud) * opacity * step(.00001, coverage) * smoothstep(0.0, .12, d.y);
    color = mix(color, cloudColor, mask);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const rad = Math.PI / 180;
/** The sky's uniforms from the look; one place for configure and tune. */
function setSkyUniforms(u, look, light, cloudsShown) {
  const s = skySettings(look.sky), phase = look.daylight?.phase ?? 'day', night = phase === 'night';
  u.topColor.value.set(s.topColor); u.horizonColor.value.set(s.horizonColor); u.cloudColor.value.set(s.cloudColor);
  u.sunDirection.value.set(0, 1, 0).applyQuaternion(new THREE.Quaternion(...(light?.rotation ?? [0, 0, 0, 1])));
  u.discColor.value.set(night ? '#dce8ff' : light?.color ?? '#ffe9ae'); u.coverage.value = s.cloudCoverage;
  u.opacity.value = cloudsShown && s.clouds ? s.cloudOpacity : 0; u.speed.value = s.cloudSpeed; u.scale.value = s.cloudScale; u.seed.value = s.seed;
  u.night.value = night ? 1 : 0; u.darkness.value = night ? 1 : phase === 'sunset' ? .18 : 0;
  u.discSize.value = s.discSize; u.celestial.value = s.celestialEnabled ? 1 : 0; u.stars.value = s.stars ? 1 : 0;
  u.starDensity.value = s.starDensity; u.starBrightness.value = s.starBrightness; u.twinkle.value = s.twinkle; u.milkyWay.value = s.milkyWay;
  u.milkyWayAngle.value = s.milkyWayAngle * rad; u.airglow.value = s.airglow; u.moonPhase.value = s.moonPhase; u.meteors.value = s.meteors;
  u.aurora.value = s.aurora ? s.auroraIntensity : 0; u.auroraColor.value.set(s.auroraColor); u.auroraTopColor.value.set(s.auroraTopColor);
  u.auroraSpeed.value = s.auroraSpeed; u.auroraDirection.value = s.auroraDirection * rad; u.auroraHeight.value = s.auroraHeight;
}
function skyUniforms() {
  const color = () => ({ value: new THREE.Color() }), scalar = () => ({ value: 0 });
  const u = { sunDirection: { value: new THREE.Vector3() } };
  for (const name of ['topColor', 'horizonColor', 'cloudColor', 'discColor', 'auroraColor', 'auroraTopColor']) u[name] = color();
  for (const name of ['time', 'coverage', 'opacity', 'speed', 'scale', 'seed', 'night', 'darkness', 'discSize', 'celestial', 'stars', 'starDensity', 'starBrightness', 'twinkle', 'milkyWay', 'milkyWayAngle', 'airglow', 'moonPhase', 'meteors', 'aurora', 'auroraSpeed', 'auroraDirection', 'auroraHeight']) u[name] = scalar();
  return u;
}
/** Whether the sky changes by itself: drifting clouds, twinkling stars, a moving aurora or meteors. */
export function skyAnimates(look, cloudsShown = true) {
  const s = skySettings(look?.sky), phase = look?.daylight?.phase ?? 'day', dark = phase !== 'day';
  if (!s.enabled) return false;
  const clouds = cloudsShown && s.clouds && s.cloudOpacity > 0 && s.cloudCoverage > 0 && s.cloudSpeed > 0;
  const stars = dark && s.stars && (s.twinkle > 0 || s.meteors > 0);
  return clouds || stars || dark && s.aurora && s.auroraIntensity > 0 && s.auroraSpeed > 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}

export function createWeatherGeometry(config) {
  const rain = config.type === 'rain', vertices = config.count * (rain ? 2 : 1);
  const position = new Float32Array(vertices * 3), along = new Float32Array(vertices), random = seededRandom(config.seed);
  for (let i = 0; i < config.count; i++) {
    const p = [random(), random(), random()];
    for (let end = 0; end < (rain ? 2 : 1); end++) { const index = i * (rain ? 2 : 1) + end; position.set(p, index * 3); along[index] = end; }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('along', new THREE.BufferAttribute(along, 1));
  return geometry;
}
/**
 * Rain as ribbons: four corners per drop, all carrying the drop's seed, plus a third as many
 * splash quads on the floor of the region. `along` runs tail (0) to head (1), `side` across.
 */
export function createRainGeometry(config) {
  const splashes = Math.round(config.count * .35), quads = config.count + splashes, random = seededRandom(config.seed);
  const position = new Float32Array(quads * 12), along = new Float32Array(quads * 4), side = new Float32Array(quads * 4), splash = new Float32Array(quads * 4), index = new Uint32Array(quads * 6);
  for (let q = 0; q < quads; q++) {
    const p = [random(), random(), random()];
    for (let corner = 0; corner < 4; corner++) { const v = q * 4 + corner; position.set(p, v * 3); along[v] = corner >> 1; side[v] = corner & 1 ? 1 : -1; splash[v] = q >= config.count ? 1 : 0; }
    index.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4 + 2, q * 4 + 1, q * 4 + 3], q * 6);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  for (const [name, values] of [['along', along], ['side', side], ['splash', splash]]) geometry.setAttribute(name, new THREE.BufferAttribute(values, 1));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  return geometry;
}
const rainVertex = `attribute float along, side, splash;
  uniform float time, speed, particleSize, viewportHeight, perspective;
  uniform vec3 regionSize, regionCenter;
  uniform vec2 wind;
  varying float life, across, lengthwise, ring, thin;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    across = side; lengthwise = along; thin = 1.0;
    float fall = max(.01, speed) * (.85 + position.x * .3);
    if (splash > .5) {
      // A ring that widens and fades where a drop lands; each slot lands once per fall of the region, somewhere new.
      float period = regionSize.y / fall, cycle = time / period + position.y, local = fract(cycle) * period;
      float n = floor(cycle) + position.z * 97.0;
      vec3 center = regionCenter + vec3((hash(n) - .5) * regionSize.x, .012, (hash(n + 17.0) - .5) * regionSize.z);
      float radius = .025 + local * .45;
      ring = 1.0; life = 1.0 - smoothstep(.0, .26, local);
      if (local > .26) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      gl_Position = projectionMatrix * modelViewMatrix * vec4(center + vec3(side * radius, 0.0, (along * 2.0 - 1.0) * radius), 1.0);
      return;
    }
    ring = 0.0;
    float age = fract(position.y - time * fall / regionSize.y);
    vec2 displacement = time * wind;
    vec3 head = vec3((fract(position.x + displacement.x / regionSize.x) - .5) * regionSize.x, age * regionSize.y, (fract(position.z + displacement.y / regionSize.z) - .5) * regionSize.z) + regionCenter;
    // The streak is the path of the last few hundredths of a second: it leans with the wind.
    vec3 velocity = vec3(wind.x, -fall, wind.y);
    float streak = clamp(length(velocity) * .04, .12, 1.1) * (.7 + .6 * position.z) * (.6 + particleSize * 16.0);
    vec3 tail = head - normalize(velocity) * streak;
    tail.y = max(tail.y, regionCenter.y); head.y = max(head.y, regionCenter.y);
    life = sin(age * 3.14159265);
    vec4 mvHead = modelViewMatrix * vec4(head, 1.0), mvTail = modelViewMatrix * vec4(tail, 1.0), mv = mix(mvTail, mvHead, along);
    vec2 direction = mvHead.xy - mvTail.xy; direction = length(direction) > 1e-5 ? normalize(direction) : vec2(0.0, 1.0);
    // At least a pixel wide; past that, distant drops get fainter instead of thicker.
    float pixel = 2.0 * mix(1.0, max(.05, -mv.z), perspective) / (projectionMatrix[1][1] * max(1.0, viewportHeight));
    float width = max(particleSize * .25, pixel * 1.2);
    thin = clamp(particleSize * .25 / width, .55, 1.0);
    mv.xy += vec2(-direction.y, direction.x) * side * width * .5;
    gl_Position = projectionMatrix * mv;
  }`;
const rainFragment = `uniform vec3 particleColor;
  uniform float opacity;
  varying float life, across, lengthwise, ring, thin;
  void main() {
    float alpha;
    if (ring > .5) {
      float d = length(vec2(across, lengthwise * 2.0 - 1.0));
      alpha = opacity * .7 * life * smoothstep(.55, .85, d) * (1.0 - smoothstep(.85, 1.0, d));
    } else alpha = min(1.0, opacity * 1.5 * (.35 + .65 * life) * (1.0 - across * across * .7) * mix(.3, 1.0, lengthwise) * thin);
    if (alpha < .004) discard;
    gl_FragColor = vec4(particleColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const particleVertex = `attribute float along;
  uniform float time, speed, particleSize, viewportHeight, perspective, rain, snow, falling;
  uniform vec3 regionSize, regionCenter;
  uniform vec2 wind, pointClamp;
  varying float life;
  void main() {
    float fallSpeed = mix(1.0, .75 + position.x * .5, snow);
    float age = fract(position.y + time * speed * fallSpeed / regionSize.y * mix(1.0, -1.0, falling));
    float drift = sin(time * speed * .2 + position.z * 20.0) * (1.0 - rain) * .2;
    float eddyPhase = time * (speed * .6 + length(wind) * .08);
    vec2 eddy = snow * (.25 + min(length(wind) * .12, 1.5)) * vec2(sin(eddyPhase + position.z * 37.0), cos(eddyPhase * .76 + position.x * 29.0));
    vec2 gust = snow * wind * .35 * sin(time * .45);
    vec2 displacement = time * wind + eddy + gust;
    vec3 p = vec3((fract(position.x + (displacement.x + drift) / regionSize.x) - .5) * regionSize.x,
      max(0.0, age * regionSize.y - along * (.25 + particleSize * 8.0)),
      (fract(position.z + displacement.y / regionSize.z) - .5) * regionSize.z) + regionCenter;
    life = sin(age * 3.14159265);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float flakeSize = mix(1.0, .55 + position.z * 1.15, snow);
    gl_PointSize = clamp(particleSize * flakeSize * viewportHeight * projectionMatrix[1][1] / (2.0 * mix(1.0, max(.1, -mv.z), perspective)), pointClamp.x, pointClamp.y);
  }`;
const particleFragment = `uniform vec3 particleColor;
  uniform float opacity, rain, smoke;
  varying float life;
  void main() {
    float alpha = opacity * (.3 + .7 * life);
    float radius = length(gl_PointCoord - .5) * 2.0;
    if (radius > 1.0) discard;
    alpha *= pow(1.0 - radius, mix(.6, 1.8, smoke));
    gl_FragColor = vec4(particleColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** One sky draw and one batched emitter. All resources belong to this viewport. */
export function createAtmosphere(scene) {
  let sky, particles, look = {}, localEnabled = true;
  function clear(object) { if (!object) return; object.geometry.dispose(); object.material.dispose(); object.removeFromParent(); }
  function configure(next, light) {
    look = next; clear(sky); clear(particles); sky = null; particles = null;
    const s = look.sky;
    if (s?.enabled) {
      const material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: skyVertex, fragmentShader: skyFragment, uniforms: skyUniforms() });
      setSkyUniforms(material.uniforms, look, light, localEnabled);
      sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), material); sky.frustumCulled = false; sky.renderOrder = -1000; scene.add(sky);
    }
    const w = look.weather;
    if (w && w.type !== 'none' && w.count > 0) {
      const rain = w.type === 'rain';
      const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: rain ? rainVertex : particleVertex, fragmentShader: rain ? rainFragment : particleFragment, side: THREE.DoubleSide,
        blending: w.type === 'embers' ? THREE.AdditiveBlending : THREE.NormalBlending,
        uniforms: { time: { value: 0 }, speed: { value: w.speed }, particleSize: { value: w.particleSize }, viewportHeight: { value: 1 }, perspective: { value: 1 },
          rain: { value: rain ? 1 : 0 }, snow:{value:w.type==='snow'?1:0},falling:{value:rain||w.type==='snow'?1:0}, smoke: { value: w.type === 'smoke' ? 1 : 0 }, regionSize: { value: new THREE.Vector3(...w.size) }, regionCenter: { value: new THREE.Vector3(...w.center) },
          wind: { value: new THREE.Vector2(...w.wind) }, pointClamp:{value:new THREE.Vector2(1,64)}, particleColor: { value: new THREE.Color(w.color) }, opacity: { value: w.opacity } } });
      const geometry = rain ? createRainGeometry(w) : createWeatherGeometry(w);
      particles = rain ? new THREE.Mesh(geometry, material) : new THREE.Points(geometry, material);
      particles.frustumCulled = false; particles.visible = localEnabled; scene.add(particles);
    }
  }
  // Same sky and the same emitter with other numbers: change uniforms, not resources. Live sliders call this every frame.
  function tune(next, light) {
    const s = next.sky, w = next.weather, emitter = value => value && value.type !== 'none' && value.count > 0 ? [value.type, value.count, value.seed].join() : null;
    if (Boolean(sky) !== Boolean(s?.enabled) || emitter(look.weather) !== emitter(w)) { configure(next, light); return; }
    look = next;
    if (sky) setSkyUniforms(sky.material.uniforms, next, light, localEnabled);
    if (particles) {
      const u = particles.material.uniforms;
      u.speed.value = w.speed; u.particleSize.value = w.particleSize; u.regionSize.value.set(...w.size); u.regionCenter.value.set(...w.center);
      u.wind.value.set(...w.wind); u.particleColor.value.set(w.color); u.opacity.value = w.opacity;
    }
  }
  return {
    configure, tune,
    update(camera, seconds, paused, viewportHeight, pixelScale=1) {
      if (sky) { sky.position.copy(camera.position); sky.material.uniforms.time.value = seconds; }
      if (particles) { particles.material.uniforms.time.value = seconds; particles.material.uniforms.viewportHeight.value = viewportHeight; particles.material.uniforms.perspective.value = camera.isPerspectiveCamera ? 1 : 0;particles.material.uniforms.pointClamp.value.set(pixelScale,64*pixelScale); }
      return !paused && localEnabled && Boolean(sky && skyAnimates(look) || particles && look.weather.opacity > 0 && (look.weather.speed > 0 || look.weather.wind.some(v => v !== 0)));
    },
    setEnabled(value) { localEnabled = value; if (particles) particles.visible = value; if (sky) sky.material.uniforms.opacity.value = value && look.sky.clouds ? look.sky.cloudOpacity : 0; },
    info() { return { sky: Boolean(sky), phase: look.daylight?.phase ?? 'day', particles: particles?.visible ? look.weather.count : 0, weather: look.weather?.type ?? 'none', clouds: Boolean(sky && localEnabled && look.sky.clouds) }; },
    dispose() { clear(sky); clear(particles); sky = null; particles = null; },
  };
}
