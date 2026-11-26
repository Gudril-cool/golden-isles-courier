// The courier plane, built entirely from three.js primitives: a cream-and-red high-wing
// taildragger with a spinning propeller, glazed canopy, fixed gear and the mail pouch strapped
// to its flank. No model files — every surface is geometry the code describes.
import * as THREE from 'three';

const PAINT = {
  cream: new THREE.MeshStandardMaterial({ color: 0xf0e3c2, roughness: 0.5, metalness: 0.08 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.5, metalness: 0.08 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.6, metalness: 0.3 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.12, metalness: 0.4, emissive: 0x3a2c14, emissiveIntensity: 0.35 }),
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

  // Propeller: spinner cone, two blades and a faint blur disc that fades in with the throttle.
  const propeller = new THREE.Group();
  const bladeGeometry = new THREE.BoxGeometry(0.26, 2.9, 0.07);
  const bladeA = part(bladeGeometry, PAINT.dark, 0, 0, 0);
  const bladeB = part(bladeGeometry, PAINT.dark, 0, 0, 0, 0, 0, Math.PI / 2);
  propeller.add(bladeA, bladeB);
  const spinnerGeometry = new THREE.ConeGeometry(0.3, 0.8, 12);
  spinnerGeometry.rotateX(-Math.PI / 2);
  const spinner = part(spinnerGeometry, PAINT.red, 0, 0, -0.3);
  propeller.add(spinner);
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  propeller.add(blur);
  propeller.position.set(0, 0, -3.1);
  group.add(propeller);

  let cockpitView = false;
  return {
    group,
    /** Spin the propeller for this frame; the blur disc takes over as the revs climb. */
    spinPropeller(dt, throttle) {
      propeller.rotation.z += dt * (4 + throttle * 55);
      const spun = THREE.MathUtils.clamp((throttle - 0.25) * 0.35, 0, 0.16);
      blur.material.opacity = cockpitView ? Math.max(spun, 0.13) : spun;
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
