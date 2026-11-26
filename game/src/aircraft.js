// The courier plane, built entirely from three.js primitives: a cream-and-red high-wing
// taildragger with a spinning propeller that dissolves into a blur disc as the revs climb, a
// tinted canopy, fixed gear, navigation lights with a double-blink tail strobe, and the mail
// pouch strapped to its flank. No model files — every surface is geometry the code describes.
import * as THREE from 'three';

const PAINT = {
  cream: new THREE.MeshStandardMaterial({ color: 0xf0e3c2, roughness: 0.5, metalness: 0.08 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.5, metalness: 0.08 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.6, metalness: 0.3 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x5f96b4, roughness: 0.08, metalness: 0.55, emissive: 0x3a2c14, emissiveIntensity: 0.25 }),
  tyre: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.95 }),
};

/** A rounded box-ish part placed in the airframe; the airframe's nose points down local -Z. */
function part(geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

/**
 * Build the aircraft. Returns the group to pose each frame, the propeller to spin, and a
 * function to hide the canopy glass for the cockpit camera.
 */
export function createAircraft() {
  const group = new THREE.Group();

  const fuselageGeometry = new THREE.CapsuleGeometry(0.88, 4.4, 6, 12);
  fuselageGeometry.rotateX(Math.PI / 2);
  group.add(part(fuselageGeometry, PAINT.cream, 0, 0, 0.3));

  const cowlGeometry = new THREE.CylinderGeometry(0.92, 0.86, 1.3, 14);
  cowlGeometry.rotateX(Math.PI / 2);
  group.add(part(cowlGeometry, PAINT.red, 0, 0, -2.35));

  const canopy = part(new THREE.SphereGeometry(0.8, 14, 10), PAINT.glass, 0, 0.72, -0.55);
  canopy.scale.set(0.78, 0.62, 1.5);
  group.add(canopy);

  group.add(part(new THREE.BoxGeometry(11.6, 0.2, 1.75), PAINT.red, 0, 0.62, -0.35));
  group.add(part(new THREE.BoxGeometry(11.6, 0.2, 0.5), PAINT.cream, 0, 0.62, 0.62));
  for (const side of [-1, 1]) {
    group.add(part(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), PAINT.dark, side * 2.2, 0.05, -0.3, 0, 0, side * 0.5));
  }
  group.add(part(new THREE.BoxGeometry(4.3, 0.16, 1.15), PAINT.red, 0, 0.28, 3.15));
  group.add(part(new THREE.BoxGeometry(0.16, 1.5, 1.15), PAINT.red, 0, 0.95, 3.15));

  // The mail pouch: a scuffed brown box lashed to the right flank, the whole point of the job.
  group.add(part(new THREE.BoxGeometry(0.5, 0.7, 1.5), new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 }), 0.95, -0.15, 0.7));

  // Fixed taildragger gear: two mains and a tail wheel, with simple legs.
  const wheelGeometry = new THREE.CylinderGeometry(0.44, 0.44, 0.3, 12);
  wheelGeometry.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    group.add(part(new THREE.CylinderGeometry(0.07, 0.07, 1.15, 6), PAINT.dark, side * 1.05, -0.6, -0.85, 0, 0, side * 0.35));
    group.add(part(wheelGeometry, PAINT.tyre, side * 1.28, -1.12, -0.85));
  }
  const tailWheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10);
  tailWheelGeometry.rotateZ(Math.PI / 2);
  group.add(part(tailWheelGeometry, PAINT.tyre, 0, -0.72, 3.3));

  // Navigation lights: port red, starboard green, and a white strobe on the fin that
  // double-blinks. Small basic-material beads — they read as lamps at any distance.
  const navLight = (color, x) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color }));
    lamp.position.set(x, 0.62, -0.35);
    return lamp;
  };
  group.add(navLight(0xff2a1e, -5.72));
  group.add(navLight(0x2aff5a, 5.72));
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshBasicMaterial({ color: 0x555a60 }));
  strobe.position.set(0, 1.78, 3.15);
  group.add(strobe);

  // Propeller: spinner cone, two blades and a translucent blur disc with a brighter blade-tip
  // rim. The disc fades in with the throttle while the solid blades ghost away, the way a real
  // prop dissolves into its arc as the revs climb. The blades get their own material so the
  // fade never touches the gear legs that share the airframe's dark paint.
  const propeller = new THREE.Group();
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.6, metalness: 0.3, transparent: true });
  const bladeGeometry = new THREE.BoxGeometry(0.26, 2.9, 0.07);
  const bladeA = part(bladeGeometry, bladeMaterial, 0, 0, 0);
  const bladeB = part(bladeGeometry, bladeMaterial, 0, 0, 0, 0, 0, Math.PI / 2);
  propeller.add(bladeA, bladeB);
  const spinnerGeometry = new THREE.ConeGeometry(0.3, 0.8, 12);
  spinnerGeometry.rotateX(-Math.PI / 2);
  const spinner = part(spinnerGeometry, PAINT.red, 0, 0, -0.3);
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
    /**
     * Switch between the outside and the pilot's seat: from inside, the canopy glass and the
     * propeller blades vanish (a real pilot sees a blur disc, not a frozen blade).
     */
    setCockpitView(on) {
      cockpitView = on;
      canopy.visible = !on;
      bladeA.visible = !on;
      bladeB.visible = !on;
      spinner.visible = !on;
    },
  };
}
