// The three sorties of the Golden Isles Courier, and the rules that judge them. A mission owns
// its glowing rings (built as torus meshes facing along the course), watches the flight state
// for ring passes and arrivals, and turns what happens into score, messages and an ending:
// threading a ring pays, landing the mail at Farrel pays more, and bending the aeroplane is
// priced by the flight model's own touchdown report.
import * as THREE from 'three';
import { LANDMARKS, getRunway } from './world.js';

const RING_RADIUS = 15;

/** Ring courses as [x, y, z] triples; heights are metres above the sea. */
function ringRunCourse() {
  return [
    [-500, 195, -1020], [200, 215, -760], [750, 200, -250], [350, 175, 330],
    [-450, 190, 420], [-1500, 220, 250], [-2350, 240, -350], [-1250, 200, -1020],
  ];
}

function volcanoCourse() {
  const c = LANDMARKS.cindera;
  const ringAt = (deg, radius, y) => {
    const a = (deg * Math.PI) / 180;
    return [c.x + Math.cos(a) * radius, y, c.z + Math.sin(a) * radius];
  };
  return [
    ringAt(195, 700, 235), ringAt(255, 660, 265), ringAt(315, 640, 305),
    ringAt(15, 660, 275), ringAt(75, 700, 240), [c.x, 525, c.z],
  ];
}

export const MISSIONS = [
  {
    id: 1,
    name: 'Ring Run',
    brief: 'Thread all 8 rings around Palma',
    fuel: 100,
    kind: 'rings',
    course: ringRunCourse,
    parSeconds: 210,
  },
  {
    id: 2,
    name: 'Island Delivery',
    brief: 'Land the mail at Farrel Isle',
    fuel: 85,
    kind: 'delivery',
    course: null,
    parSeconds: 330,
  },
  {
    id: 3,
    name: 'Volcano Circuit',
    brief: 'Fly all 6 rings around Mount Cindera',
    fuel: 90,
    kind: 'rings',
    course: volcanoCourse,
    parSeconds: 240,
  },
];

/** Build one ring: a glowing torus facing along the course, with a faint disc to aim at. */
function buildRing(position, normal) {
  const group = new THREE.Group();
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(RING_RADIUS, 0.9, 10, 40),
    new THREE.MeshStandardMaterial({ color: 0xff9a2e, emissive: 0xff8a1e, emissiveIntensity: 1.1, roughness: 0.4 }),
  );
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(RING_RADIUS - 1, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc95e, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  group.add(torus, disc);
  group.position.set(position[0], position[1], position[2]);
  group.lookAt(position[0] + normal.x, position[1] + normal.y, position[2] + normal.z);
  group.userData = { torus, disc };
  return group;
}

/**
 * Start a mission: build its rings into the scene and return its runtime. The runtime's
 * update(dt, state, flightEvents) returns happening objects for the caller to present:
 * { kind: 'ring', index, total, points } and the terminal { kind: 'complete'|'fail', ... }.
 */
export function startMission(def, scene) {
  const rings = [];
  if (def.kind === 'rings') {
    const course = def.course();
    for (let i = 0; i < course.length; i += 1) {
      const prev = course[Math.max(0, i - 1)];
      const next = course[Math.min(course.length - 1, i + 1)];
      const normal = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]).normalize();
      const ring = buildRing(course[i], normal);
      ring.userData.prevDist = null;
      scene.add(ring);
      rings.push(ring);
    }
  }
  const farrel = getRunway('farrel');

  return {
    def,
    rings,
    ringIndex: 0,
    score: 0,
    time: 0,
    done: false,
    leftGround: false,

    /** The point the HUD marker should point at right now, or null. */
    target() {
      if (this.done) return null;
      if (def.kind === 'rings') {
        const ring = rings[this.ringIndex];
        return ring ? ring.position : null;
      }
      return new THREE.Vector3(farrel.x, farrel.elev + 12, farrel.z);
    },

    /** The goal line for the HUD banner. */
    goalText() {
      if (def.kind === 'rings') return `Fly the glowing rings — ${this.ringIndex}/${rings.length} threaded`;
      return this.leftGround ? 'Land gently on the Farrel strip' : 'Take off from Palma Field, mail aboard';
    },

    update(dt, state, t) {
      const happenings = [];
      if (this.done) return happenings;
      this.time += dt;

      // Keep the course alive: the next ring burns bright and breathes, the rest smoulder.
      for (let i = 0; i < rings.length; i += 1) {
        const { torus, disc } = rings[i].userData;
        if (i < this.ringIndex) {
          torus.material.emissiveIntensity = 0.12;
          torus.material.color.set(0x8a8a8a);
          disc.material.opacity = 0.02;
        } else if (i === this.ringIndex) {
          const pulse = 2.1 + Math.sin(t * 5) * 0.5;
          torus.material.emissiveIntensity = pulse;
          torus.material.color.set(0xffc93e);
          disc.material.opacity = 0.16 + Math.sin(t * 5) * 0.04;
        }
      }

      if (!state.onGround) this.leftGround = true;

      if (def.kind === 'rings' && this.ringIndex < rings.length) {
        const ring = rings[this.ringIndex];
        const toRing = new THREE.Vector3().subVectors(state.pos, ring.position);
        const dist = toRing.length();
        const prev = ring.userData.prevDist;
        if (prev !== null && prev > RING_RADIUS * 1.7 && dist <= RING_RADIUS * 1.7) {
          // Crossing the ring's disc: inside the hoop counts, a near miss just whooshes past.
          const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(ring.quaternion);
          const along = Math.abs(toRing.dot(normal));
          const radial = Math.sqrt(Math.max(0, dist * dist - along * along));
          if (along < 9 && radial < RING_RADIUS) {
            const points = 150;
            this.score += points;
            this.ringIndex += 1;
            happenings.push({ kind: 'ring', index: this.ringIndex, total: rings.length, points });
            if (this.ringIndex >= rings.length) {
              const bonus = Math.max(0, Math.round((def.parSeconds - this.time) * 5));
              this.score += bonus;
              this.done = true;
              happenings.push({ kind: 'complete', title: 'COURSE COMPLETE', detail: `Every ring threaded. Time bonus +${bonus}.`, score: this.score, time: this.time });
            }
          }
        }
        ring.userData.prevDist = dist;
      }

      if (def.kind === 'delivery' && state.lastTouchdown && state.onGround) {
        const td = state.lastTouchdown;
        if (td.runwayId === 'farrel') {
          let points = 800;
          let verdict = 'Delivered — a firm arrival.';
          if (td.sink > -2) { points += 300; verdict = 'Greased it! The Farrel postmaster applauds.'; }
          else if (td.sink > -3.5) { points += 150; verdict = 'A smooth arrival — mail intact.'; }
          points += Math.round(state.fuel * 4);
          this.score += points;
          this.done = true;
          happenings.push({ kind: 'complete', title: 'MAIL DELIVERED', detail: verdict, score: this.score, time: this.time });
        }
      }
      return happenings;
    },

    /** Remove the mission's rings from the scene. */
    dispose(sceneToClean) {
      for (const ring of rings) sceneToClean.remove(ring);
    },
  };
}
