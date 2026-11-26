import * as THREE from 'three';
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
