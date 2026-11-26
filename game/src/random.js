// A small seeded random number generator (mulberry32): the same seed always grows the same
// archipelago, so every pilot — and every screenshot — sees the same Aurelia Isles.

/** Create a deterministic random source from a 32-bit seed. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max) from a createRandom source. */
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}
