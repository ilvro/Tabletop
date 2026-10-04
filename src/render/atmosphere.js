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
const particleVertex = `attribute float along;
  uniform float time, speed, particleSize, viewportHeight, perspective, rain;
  uniform vec3 regionSize, regionCenter;
  uniform vec2 wind;
  varying float life;
  void main() {
    float age = fract(position.y + time * speed / regionSize.y * mix(1.0, -1.0, rain));
    float drift = sin(time * speed * .2 + position.z * 20.0) * (1.0 - rain) * .2;
    vec3 p = vec3((fract(position.x + (time * wind.x + drift) / regionSize.x) - .5) * regionSize.x,
      max(0.0, age * regionSize.y - along * (.25 + particleSize * 8.0)),
      (fract(position.z + time * wind.y / regionSize.z) - .5) * regionSize.z) + regionCenter;
    life = sin(age * 3.14159265);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(particleSize * viewportHeight * projectionMatrix[1][1] / (2.0 * mix(1.0, max(.1, -mv.z), perspective)), 1.0, 64.0);
  }`;
const particleFragment = `uniform vec3 particleColor;
  uniform float opacity, rain, smoke;
  varying float life;
  void main() {
    float alpha = opacity * (.3 + .7 * life);
    #ifndef RAIN
      float radius = length(gl_PointCoord - .5) * 2.0;
      if (radius > 1.0) discard;
      alpha *= pow(1.0 - radius, mix(.6, 1.8, smoke));
    #endif
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
      const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: particleVertex, fragmentShader: particleFragment, defines: rain ? { RAIN: '' } : {},
        blending: w.type === 'embers' ? THREE.AdditiveBlending : THREE.NormalBlending,
        uniforms: { time: { value: 0 }, speed: { value: w.speed }, particleSize: { value: w.particleSize }, viewportHeight: { value: 1 }, perspective: { value: 1 },
          rain: { value: rain ? 1 : 0 }, smoke: { value: w.type === 'smoke' ? 1 : 0 }, regionSize: { value: new THREE.Vector3(...w.size) }, regionCenter: { value: new THREE.Vector3(...w.center) },
          wind: { value: new THREE.Vector2(...w.wind) }, particleColor: { value: new THREE.Color(w.color) }, opacity: { value: w.opacity } } });
      const geometry = createWeatherGeometry(w);
      particles = rain ? new THREE.LineSegments(geometry, material) : new THREE.Points(geometry, material);
      particles.frustumCulled = false; particles.visible = localEnabled; scene.add(particles);
    }
  }
  return {
    configure,
    update(camera, seconds, paused, viewportHeight) {
      if (sky) { sky.position.copy(camera.position); sky.material.uniforms.time.value = seconds; }
      if (particles) { particles.material.uniforms.time.value = seconds; particles.material.uniforms.viewportHeight.value = viewportHeight; particles.material.uniforms.perspective.value = camera.isPerspectiveCamera ? 1 : 0; }
      return !paused && localEnabled && Boolean(sky && look.sky.clouds && look.sky.cloudOpacity > 0 && look.sky.cloudCoverage > 0 && look.sky.cloudSpeed > 0 || particles && look.weather.opacity > 0 && (look.weather.speed > 0 || look.weather.wind.some(v => v !== 0)));
    },
    setEnabled(value) { localEnabled = value; if (particles) particles.visible = value; if (sky) sky.material.uniforms.opacity.value = value && look.sky.clouds ? look.sky.cloudOpacity : 0; },
    info() { return { sky: Boolean(sky), phase: look.daylight?.phase ?? 'day', particles: particles?.visible ? look.weather.count : 0, weather: look.weather?.type ?? 'none', clouds: Boolean(sky && localEnabled && look.sky.clouds) }; },
    dispose() { clear(sky); clear(particles); sky = null; particles = null; },
  };
}
