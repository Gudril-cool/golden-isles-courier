// The weather over the Aurelia Isles, chosen on the title screen: three presets that dress
// the same golden hour three ways. CLEAR is the calm postcard. BREEZY is the evening the
// courier knows — wind.js's breeze, unscaled. STORM is the front coming in: the wind doubled
// and gusting, rain streaks, dimmed light, drawn-in haze, far-off lightning. wind.js reads
// the live preset through current(); main.js reads it for light and fog; the HUD shows its
// name on the WX chip.
import * as THREE from 'three';

export const WEATHER_PRESETS = {
  CLEAR: {
    id: 'CLEAR', name: 'Clear',
    windScale: 0.45, gustAmp: 0, gustFreq: 0,
    exposure: 1.14, fogNear: 1900, fogFar: 10200, rain: false,
  },
  BREEZY: {
    id: 'BREEZY', name: 'Breezy',
    windScale: 1, gustAmp: 0, gustFreq: 0,
    exposure: 1.12, fogNear: 1600, fogFar: 9800, rain: false,
  },
  STORM: {
    id: 'STORM', name: 'Storm',
    windScale: 2.1, gustAmp: 5.5, gustFreq: 0.55,
    exposure: 0.94, fogNear: 900, fogFar: 6200, rain: true,
  },
};

/** The preset order the title screen cycles through. */
export const WEATHER_ORDER = ['CLEAR', 'BREEZY', 'STORM'];

const RAIN_STREAKS = 420;
const RAIN_BOX = { x: 110, y: 64, z: 110 };

/**
 * Rain as line streaks in a box that rides with the aeroplane: the whole box sinks and
 * wraps, so the fall never visibly loops. Shown only while the live preset asks for rain.
 */
function buildRain() {
  const positions = new Float32Array(RAIN_STREAKS * 2 * 3);
  for (let i = 0; i < RAIN_STREAKS; i += 1) {
    const x = (Math.random() - 0.5) * RAIN_BOX.x;
    const y = (Math.random() - 0.5) * RAIN_BOX.y;
    const z = (Math.random() - 0.5) * RAIN_BOX.z;
    const len = 1.3 + Math.random() * 0.9;
    positions.set([x, y, z, x + 0.35, y - len, z], i * 6);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xcfe0ea, transparent: true, opacity: 0.5 }),
  );
  rain.visible = false;
  rain.frustumCulled = false;
  return rain;
}

/**
 * Create the weather: the live preset (BREEZY until the pilot says otherwise), the rain
 * rig and the lightning light — a pale ambient light that spikes twice in quick succession
 * on a slow, deterministic cycle. set(id) changes the preset; current() hands wind.js and
 * main.js the live record; update(dt, t, anchor) steps rain and lightning.
 */
export function createWeather(scene) {
  let preset = WEATHER_PRESETS.BREEZY;
  const rain = buildRain();
  scene.add(rain);
  const flash = new THREE.AmbientLight(0xbccfec, 0);
  scene.add(flash);
  let fallOffset = 0;

  return {
    rain,
    flash,
    get presetId() { return preset.id; },
    /** The live preset record: wind scale and gusts, exposure, fog, the rain flag. */
    current() { return preset; },
    /** Choose a preset by id ('CLEAR' | 'BREEZY' | 'STORM'); unknown ids are ignored. */
    set(id) {
      if (WEATHER_PRESETS[id]) preset = WEATHER_PRESETS[id];
      rain.visible = preset.rain;
    },
    /** The next preset in the title screen's cycle. */
    cycle() {
      const next = WEATHER_ORDER[(WEATHER_ORDER.indexOf(preset.id) + 1) % WEATHER_ORDER.length];
      this.set(next);
      return preset;
    },
    /** Step the weather's moving parts: rain rides at the anchor; lightning breathes on its cycle. */
    update(dt, t, anchor) {
      if (preset.rain && anchor) {
        fallOffset = (fallOffset + dt * 52) % 8;
        rain.position.set(anchor.x, anchor.y + 6 - fallOffset, anchor.z);
      }
      if (preset.id === 'STORM') {
        const cycle = t % 17;
        const strike = (cycle < 0.1 || (cycle > 0.28 && cycle < 0.4)) ? 1 : 0;
        flash.intensity += ((strike ? 0.85 : 0) - flash.intensity) * Math.min(1, dt * 26);
      } else {
        flash.intensity = 0;
      }
    },
  };
}
