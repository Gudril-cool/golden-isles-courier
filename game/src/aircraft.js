// The courier planes, built from three.js primitives — no model files. Three wait in the
// hangar: KESTREL trainer, VOYAGER tourer, COMET racer, each with its own roster performance.
// All share a propeller blur disc, tinted canopy, fixed gear, nav lights and the mail pouch.
import * as THREE from 'three';

/** The hangar roster: looks, shape and the performance flight.js flies by, per aeroplane. */
export const AIRCRAFT = {
  kestrel: {
    id: 'kestrel', name: 'KESTREL', role: 'Trainer · forgiving',
    blurb: 'The school plane: a low stall, gentle manners and a sipper of a tank. Learn the isles in her.',
    paint: { body: 0xf0e3c2, accent: 0xc23b2e, glass: 0x5f96b4 },
    stats: { spd: 2, clb: 3, rng: 5 },
    wingSpan: 11.6, sweep: 0, twinFin: false, spinner: 0.8, stretch: 1,
    perf: { airAccel: 10.2, groundAccel: 13.5, dragK: 0.0058, stallSpeed: 20, liftSpeed: 22, burnBase: 0.032, burnPower: 0.105, pitchRate: 1.9, bankRate: 2.3 },
  },
  voyager: {
    id: 'voyager', name: 'VOYAGER', role: 'Tourer · balanced',
    blurb: 'The working tourer: longer wings, twin fins, every dial in the middle. The mail plane proper.',
    paint: { body: 0x2a7f7a, accent: 0xf0e3c2, glass: 0x5f96b4 },
    stats: { spd: 3, clb: 3, rng: 4 },
    wingSpan: 13.4, sweep: 0, twinFin: true, spinner: 0.8, stretch: 1,
    perf: { airAccel: 11.5, groundAccel: 15, dragK: 0.0055, stallSpeed: 24, liftSpeed: 26, burnBase: 0.045, burnPower: 0.16, pitchRate: 2.2, bankRate: 2.6 },
  },
  comet: {
    id: 'comet', name: 'COMET', role: 'Racer · fast & thirsty',
    blurb: 'The racer: short swept wings and a long spinner. Fastest thing on the field — and she drinks, and stalls high.',
    paint: { body: 0x33383f, accent: 0xff7a1e, glass: 0x2c3e46 },
    stats: { spd: 5, clb: 4, rng: 2 },
    wingSpan: 9.8, sweep: 0.3, twinFin: false, spinner: 1.15, stretch: 1.14,
    perf: { airAccel: 15.8, groundAccel: 17.5, dragK: 0.0047, stallSpeed: 29, liftSpeed: 31, burnBase: 0.062, burnPower: 0.27, pitchRate: 2.9, bankRate: 3.4 },
  },
};

/** The hangar's order on the title screen. */
export const AIRCRAFT_ORDER = ['kestrel', 'voyager', 'comet'];

const DARK = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.6, metalness: 0.3 });
const TYRE = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.95 });

/** A rounded box-ish part placed in the airframe; the airframe's nose points down local -Z. */
function part(geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

/**
 * Build one of the hangar's aeroplanes. Returns the group to pose each frame, the
 * propeller to spin, a function to hide the canopy glass for the cockpit camera, and the
 * roster entry it was built from.
 */
export function createAircraft(variantId = 'kestrel') {
  const variant = AIRCRAFT[variantId] ?? AIRCRAFT.kestrel;
  const paint = {
    body: new THREE.MeshStandardMaterial({ color: variant.paint.body, roughness: 0.5, metalness: 0.08 }),
    accent: new THREE.MeshStandardMaterial({ color: variant.paint.accent, roughness: 0.5, metalness: 0.08 }),
    glass: new THREE.MeshStandardMaterial({ color: variant.paint.glass, roughness: 0.08, metalness: 0.55, emissive: 0x3a2c14, emissiveIntensity: 0.25 }),
  };
  const group = new THREE.Group();

  const fuselageGeometry = new THREE.CapsuleGeometry(0.88, 4.4, 6, 12);
  fuselageGeometry.rotateX(Math.PI / 2);
  const fuselage = part(fuselageGeometry, paint.body, 0, 0, 0.3);
  fuselage.scale.set(1, 1, variant.stretch);
  group.add(fuselage);

  const cowlGeometry = new THREE.CylinderGeometry(0.92, 0.86, 1.3, 14);
  cowlGeometry.rotateX(Math.PI / 2);
  group.add(part(cowlGeometry, paint.accent, 0, 0, -2.35));

  const canopy = part(new THREE.SphereGeometry(0.8, 14, 10), paint.glass, 0, 0.72, -0.55);
  canopy.scale.set(0.78, 0.62, 1.5);
  group.add(canopy);

  // The wing: one straight span, or for the racer two halves raked back. Span and sweep are
  // roster data, read from the variant.
  if (variant.sweep > 0) {
    for (const side of [-1, 1]) {
      const half = new THREE.Group();
      const main = part(new THREE.BoxGeometry(variant.wingSpan / 2, 0.2, 1.75), paint.accent, side * variant.wingSpan / 4, 0.62, -0.35);
      const band = part(new THREE.BoxGeometry(variant.wingSpan / 2, 0.2, 0.5), paint.body, side * variant.wingSpan / 4, 0.62, 0.62);
      half.add(main, band);
      half.rotation.y = -side * variant.sweep;
      group.add(half);
    }
  } else {
    group.add(part(new THREE.BoxGeometry(variant.wingSpan, 0.2, 1.75), paint.accent, 0, 0.62, -0.35));
    group.add(part(new THREE.BoxGeometry(variant.wingSpan, 0.2, 0.5), paint.body, 0, 0.62, 0.62));
  }
  for (const side of [-1, 1]) {
    group.add(part(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), DARK, side * variant.wingSpan * 0.19, 0.05, -0.3, 0, 0, side * 0.5));
  }
  group.add(part(new THREE.BoxGeometry(4.3, 0.16, 1.15), paint.accent, 0, 0.28, 3.15));
  if (variant.twinFin) {
    for (const side of [-1, 1]) {
      group.add(part(new THREE.BoxGeometry(0.16, 1.3, 1.05), paint.accent, side * 0.85, 0.88, 3.15));
    }
  } else {
    group.add(part(new THREE.BoxGeometry(0.16, 1.5, 1.15), paint.accent, 0, 0.95, 3.15));
  }

  // The mail pouch: a scuffed brown box lashed to the right flank, the whole point of the job.
  group.add(part(new THREE.BoxGeometry(0.5, 0.7, 1.5), new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 }), 0.95, -0.15, 0.7));

  // Fixed taildragger gear: two mains and a tail wheel, with simple legs.
  const wheelGeometry = new THREE.CylinderGeometry(0.44, 0.44, 0.3, 12);
  wheelGeometry.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    group.add(part(new THREE.CylinderGeometry(0.07, 0.07, 1.15, 6), DARK, side * 1.05, -0.6, -0.85, 0, 0, side * 0.35));
    group.add(part(wheelGeometry, TYRE, side * 1.28, -1.12, -0.85));
  }
  const tailWheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10);
  tailWheelGeometry.rotateZ(Math.PI / 2);
  group.add(part(tailWheelGeometry, TYRE, 0, -0.72, 3.3));

  // Navigation lights: port red, starboard green, and a double-blink white strobe on the fin.
  const navLight = (color, x) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color }));
    lamp.position.set(x, 0.62, -0.35);
    return lamp;
  };
  group.add(navLight(0xff2a1e, -(variant.wingSpan / 2 - 0.08)));
  group.add(navLight(0x2aff5a, variant.wingSpan / 2 - 0.08));
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshBasicMaterial({ color: 0x555a60 }));
  strobe.position.set(0, 1.78, 3.15);
  group.add(strobe);

  // Propeller: spinner cone, two blades and a translucent blur disc with a brighter rim. The
  // disc fades in with the throttle while the solid blades ghost away. The blades get their
  // own material so the fade never touches the gear legs sharing the dark paint.
  const propeller = new THREE.Group();
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.6, metalness: 0.3, transparent: true });
  const bladeGeometry = new THREE.BoxGeometry(0.26, 2.9, 0.07);
  const bladeA = part(bladeGeometry, bladeMaterial, 0, 0, 0);
  const bladeB = part(bladeGeometry, bladeMaterial, 0, 0, 0, 0, 0, Math.PI / 2);
  propeller.add(bladeA, bladeB);
  const spinnerGeometry = new THREE.ConeGeometry(0.3, variant.spinner, 12);
  spinnerGeometry.rotateX(-Math.PI / 2);
  const spinner = part(spinnerGeometry, paint.accent, 0, 0, -0.3);
  propeller.add(spinner);
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xe8e2d4, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  const blurRim = new THREE.Mesh(
    new THREE.RingGeometry(1.33, 1.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xf4efe2, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  propeller.add(blur, blurRim);
  propeller.position.set(0, 0, -3.1);
  group.add(propeller);

  let cockpitView = false;
  let lightTime = 0;
  return {
    group,
    variant,
    /** Spin the propeller for this frame; the blur disc takes over as the revs climb. */
    spinPropeller(dt, throttle) {
      propeller.rotation.z += dt * (4 + throttle * 55);
      const spun = THREE.MathUtils.clamp((throttle - 0.18) * 1.6, 0, 1);
      blur.material.opacity = spun * (cockpitView ? 0.3 : 0.22);
      if (cockpitView && spun === 0) blur.material.opacity = 0.13;
      blurRim.material.opacity = spun * 0.38;
      bladeMaterial.opacity = 1 - spun * 0.8;
      // The tail strobe double-blinks on a 1.4 s cycle, lit or idle.
      lightTime += dt;
      const phase = lightTime % 1.4;
      const strobeOn = phase < 0.07 || (phase > 0.18 && phase < 0.25);
      strobe.material.color.set(strobeOn ? 0xffffff : 0x555a60);
      const pulse = strobeOn ? 1.5 : 1;
      strobe.scale.set(pulse, pulse, pulse);
    },
    /** Switch to the pilot's seat: from inside, the canopy glass and the blades vanish. */
    setCockpitView(on) {
      cockpitView = on;
      canopy.visible = !on;
      bladeA.visible = !on;
      bladeB.visible = !on;
      spinner.visible = !on;
    },
  };
}
