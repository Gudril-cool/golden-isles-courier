// The lighthouse supply drop: a prepared pad beside Port Aurelia's lighthouse, marked with
// two glowing rings and a pillar of light, and the crates the courier lets go from the air.
// A released crate keeps the aeroplane's velocity, falls under gravity, drifts on the wind,
// and is judged where it rests — inner ring, outer ring, the rocks, or the drink.
import * as THREE from 'three';
import { LANDMARKS, terrainHeight } from './world.js';

/** The pad sits on the flat shoulder north-east of the lighthouse, above the town shore. */
export const DROP_ZONE = { x: LANDMARKS.lighthouse.x + 60, z: LANDMARKS.lighthouse.z + 70 };
export const DROP_INNER_RADIUS = 10;
export const DROP_OUTER_RADIUS = 26;
const PAD_RADIUS = 28;
const GRAVITY = 12; // m/s^2, a touch heavy so a drop reads as a drop, not a float

/** The pad's centre in world space, standing on the terrain height function. */
export function dropZoneCentre() {
  return new THREE.Vector3(DROP_ZONE.x, terrainHeight(DROP_ZONE.x, DROP_ZONE.z), DROP_ZONE.z);
}

/** The grade a finished drop earns: distance from the pad's centre, and whether it stayed dry. */
export function scoreDrop(dist, onLand) {
  if (!onLand) return { grade: 'IN THE DRINK', points: 40 };
  if (dist <= DROP_INNER_RADIUS) return { grade: 'BULLSEYE DROP', points: 500 };
  if (dist <= DROP_OUTER_RADIUS) return { grade: 'ON THE MARK', points: 300 };
  return { grade: 'ON THE ROCKS', points: 120 };
}

/**
 * Build the drop pad into the scene: a gravel disc, the two glowing rings, marker lamps, a
 * beacon pole, and a translucent pillar of light over the centre. Returns the pieces the
 * run animates (the rings' materials, to pulse).
 */
export function buildSupplyDrop(scene) {
  const centre = dropZoneCentre();
  const group = new THREE.Group();
  group.position.copy(centre);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(PAD_RADIUS, PAD_RADIUS + 2.5, 2.4, 36),
    new THREE.MeshStandardMaterial({ color: 0x8d8578, roughness: 1 }),
  );
  pad.position.y = 0.1;
  group.add(pad);
  const padTop = 1.3;

  const ringMaterial = (emissiveIntensity) => new THREE.MeshStandardMaterial({
    color: 0xff9a2e, emissive: 0xff8a1e, emissiveIntensity, roughness: 0.4,
  });
  const outerMat = ringMaterial(1.5);
  const innerMat = ringMaterial(2.1);
  const outer = new THREE.Mesh(new THREE.TorusGeometry(DROP_OUTER_RADIUS, 0.75, 10, 64), outerMat);
  outer.rotation.x = Math.PI / 2;
  outer.position.y = padTop + 0.15;
  group.add(outer);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(DROP_INNER_RADIUS, 0.75, 10, 40), innerMat);
  inner.rotation.x = Math.PI / 2;
  inner.position.y = padTop + 0.15;
  group.add(inner);
  const bullseye = new THREE.Mesh(
    new THREE.CircleGeometry(DROP_INNER_RADIUS - 1, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc95e, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  bullseye.rotation.x = -Math.PI / 2;
  bullseye.position.y = padTop + 0.06;
  group.add(bullseye);

  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffc95e });
  for (const [lx, lz] of [[DROP_OUTER_RADIUS, 0], [-DROP_OUTER_RADIUS, 0], [0, DROP_OUTER_RADIUS], [0, -DROP_OUTER_RADIUS]]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), lampMaterial);
    lamp.position.set(lx, padTop + 0.9, lz);
    group.add(lamp);
  }

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.8, 150, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffb35e, transparent: true, opacity: 0.09,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false,
    }),
  );
  pillar.position.y = 75;
  group.add(pillar);

  const beacon = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 9, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.8 }),
  );
  pole.position.y = 4.5;
  const beaconLamp = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), lampMaterial);
  beaconLamp.position.y = 9.4;
  beacon.add(pole, beaconLamp);
  beacon.position.set(PAD_RADIUS + 7, terrainHeight(DROP_ZONE.x + PAD_RADIUS + 7, DROP_ZONE.z - 22) - centre.y, -22);
  group.add(beacon);

  scene.add(group);
  return { group, centre, padTop, outerMat, innerMat };
}

/** One supply crate: a stencilled wooden box with a canvas sling, built from primitives. */
export function buildCrate() {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a743f, roughness: 0.9 });
  const strap = new THREE.MeshStandardMaterial({ color: 0x54432a, roughness: 0.9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.5), wood);
  group.add(box);
  for (const s of [-0.45, 0.45]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.94, 0.22), strap);
    band.position.z = s;
    group.add(band);
  }
  const sling = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), strap);
  sling.position.y = 0.65;
  group.add(sling);
  return group;
}

/**
 * Run one supply sortie's hardware: the pad, the crate slung under the aeroplane, and any
 * crate in the air or at rest. dropCrate lets the carried crate go; update steps what is
 * falling and returns the landings it settles, each { grade, points, dist, splash }.
 */
export function createSupplyRun(scene) {
  const pad = buildSupplyDrop(scene);
  const centre = pad.centre;
  const padSurfaceY = centre.y + pad.padTop;
  let carried = buildCrate();
  scene.add(carried);
  let falling = null;
  const rested = [];
  const splashes = [];

  const run = {
    centre,
    cratesLeft: 3,
    dropped: 0,
    bestGrade: null,
    bestPoints: -1,
    lastDrop: null,

    /** True while a crate is in the air — one at a time keeps the judging honest. */
    hasFalling() {
      return falling !== null;
    },

    /** Let the carried crate go from the aeroplane's belly, with its speed and the wind. */
    dropCrate(state, windVector) {
      if (this.cratesLeft <= 0 || falling || state.onGround) return false;
      this.cratesLeft -= 1;
      // Snap the crate to the belly it leaves from — its mesh may lag a frame behind.
      carried.position.set(state.pos.x, state.pos.y - 1.9, state.pos.z);
      carried.rotation.set(0, -state.heading, 0);
      const cosPitch = Math.cos(state.pitch);
      const vel = new THREE.Vector3(
        Math.sin(state.heading) * cosPitch * state.speed,
        Math.sin(state.pitch) * state.speed,
        -Math.cos(state.heading) * cosPitch * state.speed,
      );
      falling = { mesh: carried, vel, wind: windVector ? windVector.clone() : new THREE.Vector3() };
      carried = null;
      if (this.cratesLeft > 0) {
        carried = buildCrate();
        scene.add(carried);
      }
      return true;
    },

    update(dt, state, t) {
      const landings = [];
      pad.outerMat.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.45;
      pad.innerMat.emissiveIntensity = 2.1 + Math.sin(t * 4) * 0.6;

      if (carried && state) {
        // Slung under the belly in the air; resting on the ground beside the gear when parked.
        const slungY = Math.max(
          state.pos.y - 1.9,
          terrainHeight(state.pos.x, state.pos.z) + 0.5,
        );
        carried.position.set(state.pos.x, slungY, state.pos.z);
        carried.rotation.set(0, -state.heading, 0);
      }

      if (falling) {
        const { mesh, vel, wind } = falling;
        vel.y -= GRAVITY * dt;
        vel.x += wind.x * dt * 0.4;
        vel.z += wind.z * dt * 0.4;
        mesh.position.addScaledVector(vel, dt);
        mesh.rotation.x += dt * 0.7;
        mesh.rotation.z += dt * 0.45;
        const ground = terrainHeight(mesh.position.x, mesh.position.z);
        const onPad = Math.hypot(mesh.position.x - centre.x, mesh.position.z - centre.z) <= PAD_RADIUS;
        const floor = Math.max(ground, 0, onPad ? padSurfaceY : -Infinity) + 0.5;
        if (mesh.position.y <= floor) {
          mesh.position.y = floor;
          mesh.rotation.set(0, mesh.rotation.y, 0);
          const splash = ground < -0.5 && !onPad;
          const dist = Math.hypot(mesh.position.x - centre.x, mesh.position.z - centre.z);
          const { grade, points } = scoreDrop(dist, !splash);
          this.dropped += 1;
          this.lastDrop = { grade, points, dist: Math.round(dist), splash };
          if (points > this.bestPoints) {
            this.bestPoints = points;
            this.bestGrade = grade;
          }
          landings.push(this.lastDrop);
          if (splash) {
            const ring = new THREE.Mesh(
              new THREE.RingGeometry(0.8, 1.6, 24),
              new THREE.MeshBasicMaterial({ color: 0xeaf6f6, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(mesh.position.x, 0.25, mesh.position.z);
            scene.add(ring);
            splashes.push({ mesh: ring, age: 0, crate: mesh });
            falling = null;
          } else {
            rested.push(mesh);
            falling = null;
          }
        }
      }

      for (let i = splashes.length - 1; i >= 0; i -= 1) {
        const s = splashes[i];
        s.age += dt;
        const k = s.age / 1.5;
        s.mesh.scale.setScalar(1 + k * 13);
        s.mesh.material.opacity = 0.55 * (1 - k);
        s.crate.position.y -= dt * 0.35;
        if (k >= 1) {
          scene.remove(s.mesh);
          scene.remove(s.crate);
          splashes.splice(i, 1);
        }
      }
      return landings;
    },

    /** Remove the pad, the crates and any splash still on the water. */
    dispose(sceneToClean) {
      sceneToClean.remove(pad.group);
      if (carried) sceneToClean.remove(carried);
      if (falling) sceneToClean.remove(falling.mesh);
      for (const mesh of rested) sceneToClean.remove(mesh);
      for (const s of splashes) {
        sceneToClean.remove(s.mesh);
        sceneToClean.remove(s.crate);
      }
    },
  };
  return run;
}
