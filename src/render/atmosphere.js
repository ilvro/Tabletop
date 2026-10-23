import * as THREE from 'three';
import { environmentBindingActive, NIGHT_WINDOWS_DEFAULTS } from '../domain/lighting.js';

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
  uniform vec3 topColor, horizonColor, cloudColor, sunDirection, discColor;
  uniform float time, coverage, opacity, speed, scale, seed, night, discSize, celestial, stars;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)) + seed) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(vec3(i, 0.0)), hash(vec3(i + vec2(1.0, 0.0), 0.0)), f.x),
      mix(hash(vec3(i + vec2(0.0, 1.0), 0.0)), hash(vec3(i + 1.0, 0.0)), f.x), f.y);
  }
  void main() {
    vec3 d = normalize(vDirection);
    vec3 color = mix(horizonColor, topColor, pow(max(d.y, 0.0), .45));
    float alignment = dot(d, normalize(sunDirection));
    float disc = smoothstep(cos(discSize * 1.15), cos(discSize), alignment) * celestial;
    float moonTexture = .7 + .3 * noise(d.xz * 400.0);
    color += discColor * disc * mix(2.0, moonTexture * 1.6, night);
    color += discColor * pow(max(alignment, 0.0), 180.0) * .12 * celestial;
    float star = step(.997, hash(floor(d * 210.0))) * stars * night * smoothstep(0.0, .25, d.y);
    color += vec3(star * .8);
    vec2 p = d.xz / max(d.y, .08) * scale + vec2(time * speed, time * speed * .3);
    float cloud = .55 * noise(p) + .3 * noise(p * 2.1) + .15 * noise(p * 4.3);
    float mask = smoothstep(1.0 - coverage - .12, 1.0 - coverage + .12, cloud) * opacity * step(.00001, coverage) * smoothstep(0.0, .12, d.y);
    color = mix(color, cloudColor, mask);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

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
      const color = value => ({ value: new THREE.Color(value) });
      const material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: skyVertex, fragmentShader: skyFragment,
        uniforms: { topColor: color(s.topColor), horizonColor: color(s.horizonColor), cloudColor: color(s.cloudColor),
          sunDirection: { value: new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(...(light?.rotation ?? [0, 0, 0, 1]))) },
          discColor: color(look.daylight?.phase === 'night' ? '#dce8ff' : light?.color ?? '#ffe9ae'), time: { value: 0 }, coverage: { value: s.cloudCoverage },
          opacity: { value: localEnabled && s.clouds ? s.cloudOpacity : 0 }, speed: { value: s.cloudSpeed }, scale: { value: s.cloudScale }, seed: { value: s.seed },
          night: { value: look.daylight?.phase === 'night' ? 1 : 0 }, discSize: { value: s.discSize }, celestial: { value: s.celestialEnabled ? 1 : 0 }, stars: { value: s.stars ? 1 : 0 } } });
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
    if (sky) {
      const u = sky.material.uniforms, night = next.daylight?.phase === 'night';
      u.topColor.value.set(s.topColor); u.horizonColor.value.set(s.horizonColor); u.cloudColor.value.set(s.cloudColor);
      u.sunDirection.value.set(0, 1, 0).applyQuaternion(new THREE.Quaternion(...(light?.rotation ?? [0, 0, 0, 1])));
      u.discColor.value.set(night ? '#dce8ff' : light?.color ?? '#ffe9ae'); u.coverage.value = s.cloudCoverage;
      u.opacity.value = localEnabled && s.clouds ? s.cloudOpacity : 0; u.speed.value = s.cloudSpeed; u.scale.value = s.cloudScale; u.seed.value = s.seed;
      u.night.value = night ? 1 : 0; u.discSize.value = s.discSize; u.celestial.value = s.celestialEnabled ? 1 : 0; u.stars.value = s.stars ? 1 : 0;
    }
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
      return !paused && localEnabled && Boolean(sky && look.sky.clouds && look.sky.cloudOpacity > 0 && look.sky.cloudCoverage > 0 && look.sky.cloudSpeed > 0 || particles && look.weather.opacity > 0 && (look.weather.speed > 0 || look.weather.wind.some(v => v !== 0)));
    },
    setEnabled(value) { localEnabled = value; if (particles) particles.visible = value; if (sky) sky.material.uniforms.opacity.value = value && look.sky.clouds ? look.sky.cloudOpacity : 0; },
    info() { return { sky: Boolean(sky), phase: look.daylight?.phase ?? 'day', particles: particles?.visible ? look.weather.count : 0, weather: look.weather?.type ?? 'none', clouds: Boolean(sky && localEnabled && look.sky.clouds) }; },
    dispose() { clear(sky); clear(particles); sky = null; particles = null; },
  };
}
