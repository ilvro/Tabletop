/**
 * The time of sparks and drops, as functions of the clock alone: the same instant is always
 * the same picture, so a pause freezes them and the light of a burst with them.
 */
export const LOCAL_EFFECT_TYPES = [['fire', 'Fogo'], ['smoke', 'Fumaça'], ['sparks', 'Faíscas'], ['drip', 'Gotejamento']];
export const BURST_LENGTH = .6;
const GRAVITY = 9.8;

/** The particle seeds of an effect: four numbers in [0, 1) each, the same on every machine. */
export function effectSeeds(seed, count) {
  let state = seed >>> 0; const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  return Float32Array.from({ length: count * 4 }, random);
}
const hash = (seed, n) => { let h = ((seed >>> 0) * 2654435761 + n * 40503) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; };

/**
 * Bursts at irregular intervals: time is cut into windows of about a second and a half, and
 * most windows hold a burst that starts at a drawn moment of the first half of the window.
 */
export function sparkBurst(seed, speed, t) {
  const length = 1.6 / Math.max(.05, speed), index = Math.floor(t / length), drawn = hash(seed, index * 2), start = hash(seed, index * 2 + 1);
  const age = t - index * length - start * length * .5;
  return { index, active: drawn < .7 && age >= 0 && age < BURST_LENGTH, age };
}
/** How bright the flash of a burst is, from 1 as it starts to nothing as it dies. */
export const burstLight = burst => burst.active ? Math.exp(-burst.age * 12) : 0;

/** Where drop `i` is: swelling where it hangs, then falling under gravity and gone as it meets the floor, `height` below. */
export function dropState(seeds, i, speed, height, t) {
  const period = (.8 + seeds[i * 4 + 1] * 1.6) / Math.max(.05, speed), phase = seeds[i * 4 + 3] * period, local = (t + phase) % period;
  const fall = Math.sqrt(2 * height / GRAVITY), hang = Math.max(.01, period - fall);
  return local < hang ? { y: 0, scale: local / hang, falling: false } : { y: Math.max(-height, -.5 * GRAVITY * (local - hang) ** 2), scale: 1, falling: true };
}
