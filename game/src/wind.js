// The evening wind over the Aurelia Isles: a gentle breeze that veers and breathes over
// minutes. It pushes a flying aeroplane a little sideways — enough to feel on a long leg and
// to matter on a supply drop — and the HUD carries its arrow and strength. The live weather
// preset (weather.js) scales it: CLEAR calms it, BREEZY is the wind as it has always blown
// here, STORM doubles it and sets it gusting. The sample is a pure function of the clock.
import * as THREE from 'three';

/**
 * Create the wind, reading the weather for its live preset when one is given.
 * sample(t) returns { dir, speed, vector }: dir is the heading-style angle (radians) the
 * wind blows TOWARD, speed is metres per second, and vector is that push as a
 * THREE.Vector3 in world space (reused between calls — copy it if you keep it).
 */
export function createWind(weather = null) {
  const vector = new THREE.Vector3();
  return {
    sample(t) {
      const preset = weather ? weather.current() : null;
      const scale = preset ? preset.windScale : 1;
      const dir = 0.9 + Math.sin(t * 0.021) * 0.55 + Math.sin(t * 0.0083 + 1.7) * 0.35
        + (preset ? preset.gustAmp * 0.03 * Math.sin(t * 1.31) : 0);
      let speed = THREE.MathUtils.clamp(
        4.4 + Math.sin(t * 0.05 + 0.5) * 1.7 + Math.sin(t * 0.013) * 1.3,
        1.5,
        7.5,
      ) * scale;
      if (preset && preset.gustAmp > 0) {
        // The storm's gusts: two slow swells beating against each other, never negative.
        const gust = preset.gustAmp
          * (0.55 + 0.45 * Math.sin(t * preset.gustFreq * 2.4 + 0.8))
          * (0.6 + 0.4 * Math.sin(t * preset.gustFreq * 5.9));
        speed += Math.max(0, gust);
      }
      speed = Math.max(0.4, speed);
      vector.set(Math.sin(dir) * speed, 0, -Math.cos(dir) * speed);
      return { dir, speed, vector };
    },
  };
}
