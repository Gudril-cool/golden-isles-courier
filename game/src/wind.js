// The evening wind over the Aurelia Isles: a gentle breeze that veers and breathes over
// minutes, never gusts. It pushes a flying aeroplane a little sideways — enough to feel on a
// long leg and to matter on a supply drop — and the HUD carries its arrow and strength so the
// pilot can allow for it. The sample is a pure function of the clock, so a staged screenshot
// and a test run read the same wind as play does.
import * as THREE from 'three';

/**
 * Create the wind. sample(t) returns { dir, speed, vector }: dir is the heading-style angle
 * (radians) the wind blows TOWARD, speed is metres per second, and vector is that push as a
 * THREE.Vector3 in world space (reused between calls — copy it if you keep it).
 */
export function createWind() {
  const vector = new THREE.Vector3();
  return {
    sample(t) {
      const dir = 0.9 + Math.sin(t * 0.021) * 0.55 + Math.sin(t * 0.0083 + 1.7) * 0.35;
      const speed = THREE.MathUtils.clamp(
        4.4 + Math.sin(t * 0.05 + 0.5) * 1.7 + Math.sin(t * 0.013) * 1.3,
        1.5,
        7.5,
      );
      vector.set(Math.sin(dir) * speed, 0, -Math.cos(dir) * speed);
      return { dir, speed, vector };
    },
  };
}
