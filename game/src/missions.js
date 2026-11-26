// The four sorties of the Golden Isles Courier, and the rules that judge them. A mission owns
// its glowing rings (built as torus meshes facing along the course) or its harbour photo gates
// (post-and-beam frames standing in the anchorage), watches the flight state for ring passes,
// photo passes and arrivals, and turns what happens into score, messages and an ending:
// threading a ring pays, a low centred photo pays by the quality of the shot, landing the mail
// at Farrel pays more, and bending the aeroplane is priced by the flight model's own report.
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

/**
 * The harbour photo gates as [x, z, headingDeg] triples over Port Aurelia's anchorage: a loose
 * triangle down the outer harbour, back up the far shore and home past the town. The heading is
 * the direction of travel the frame expects; the posts stand in open water throughout.
 */
function photoCourse() {
  return [
    [-2930, -300, 255],
    [-3120, -580, 326],
    [-2900, -800, 45],
  ];
}

const PHOTO_ALT_MIN = 14; // metres above the sea: the bottom of a gate's window
const PHOTO_ALT_MAX = 44; // and its top — fly the frame low or the shot is wasted
const PHOTO_HALF_WIDTH = 23; // metres either side of a gate's centre line

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
  {
    id: 4,
    name: 'Harbor Photo Run',
    brief: 'Snap 3 harbour frames, low over Port Aurelia',
    fuel: 80,
    kind: 'photo',
    course: photoCourse,
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
 * Build one photo gate: two striped posts on harbour pontoons, a glowing beam across the top
 * and a shutter plane between them that flashes when a frame is taken. The frame stands in the
 * sea and faces along its heading, so the pilot flies through the rectangle it draws.
 */
function buildPhotoGate(x, z, headingDeg) {
  const group = new THREE.Group();
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.65 });
  const bandMaterial = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.65 });
  const beamMaterial = new THREE.MeshStandardMaterial({ color: 0xff9a2e, emissive: 0xff8a1e, emissiveIntensity: 1.1, roughness: 0.4 });
  const pontoonMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.85 });
  const top = PHOTO_ALT_MAX + 2;
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, top, 10), postMaterial);
    post.position.set(side * PHOTO_HALF_WIDTH, top / 2, 0);
    group.add(post);
    for (const bandY of [10, 24, 38]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.82, 2.2, 10), bandMaterial);
      band.position.set(side * PHOTO_HALF_WIDTH, bandY, 0);
      group.add(band);
    }
    const pontoon = new THREE.Mesh(new THREE.BoxGeometry(7, 1.3, 3.4), pontoonMaterial);
    pontoon.position.set(side * PHOTO_HALF_WIDTH, 0.45, 0);
    group.add(pontoon);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc95e }),
    );
    lamp.position.set(side * PHOTO_HALF_WIDTH, top + 1.6, 0);
    group.add(lamp);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(PHOTO_HALF_WIDTH * 2 + 2, 1.7, 1.7), beamMaterial);
  beam.position.set(0, top, 0);
  group.add(beam);
  const shutter = new THREE.Mesh(
    new THREE.PlaneGeometry(PHOTO_HALF_WIDTH * 2 - 1, top - 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  shutter.position.set(0, top / 2, 0);
  group.add(shutter);
  group.position.set(x, 0, z);
  group.rotation.y = (-headingDeg * Math.PI) / 180;
  group.userData = { beamMaterial, shutter, headingDeg, prevAlong: null, flash: 0 };
  return group;
}

/**
 * Start a mission: build its rings or photo gates into the scene and return its runtime. The
 * runtime's update(dt, state, t) returns happening objects for the caller to present:
 * { kind: 'ring'|'photo'|'photo-miss', ... } and the terminal { kind: 'complete', ... }.
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
  const gates = [];
  if (def.kind === 'photo') {
    for (const [x, z, headingDeg] of def.course()) {
      const gate = buildPhotoGate(x, z, headingDeg);
      scene.add(gate);
      gates.push(gate);
    }
  }
  const farrel = getRunway('farrel');

  return {
    def,
    rings,
    gates,
    ringIndex: 0,
    gateIndex: 0,
    photos: 0,
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
      if (def.kind === 'photo') {
        const gate = gates[this.gateIndex];
        return gate ? new THREE.Vector3(gate.position.x, 24, gate.position.z) : null;
      }
      return new THREE.Vector3(farrel.x, farrel.elev + 12, farrel.z);
    },

    /** The goal line for the HUD banner. */
    goalText() {
      if (def.kind === 'rings') return `Fly the glowing rings — ${this.ringIndex}/${rings.length} threaded`;
      if (def.kind === 'photo') return `Snap the harbour frames — ${this.photos}/${gates.length} taken · fly them low, 45–145 FT`;
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

      // Photo gates breathe the same way: the live frame's beam burns bright, taken frames
      // settle to a grey smoulder, and a shutter flash fades off the plane that was snapped.
      for (let i = 0; i < gates.length; i += 1) {
        const { beamMaterial, shutter } = gates[i].userData;
        if (i < this.gateIndex) {
          beamMaterial.emissiveIntensity = 0.12;
          beamMaterial.color.set(0x8a8a8a);
        } else if (i === this.gateIndex) {
          beamMaterial.emissiveIntensity = 2.1 + Math.sin(t * 5) * 0.5;
          beamMaterial.color.set(0xffc93e);
        }
        if (gates[i].userData.flash > 0) {
          gates[i].userData.flash = Math.max(0, gates[i].userData.flash - dt * 2.6);
          shutter.material.opacity = gates[i].userData.flash * 0.55;
        }
      }

      if (!state.onGround) this.leftGround = true;

      if (def.kind === 'photo' && this.gateIndex < gates.length) {
        const gate = gates[this.gateIndex];
        const rad = (gate.userData.headingDeg * Math.PI) / 180;
        // Along: distance ahead of the gate's plane along its heading. Lateral: offset from
        // its centre line. A sign change in Along is the moment the nose crosses the frame.
        const relX = state.pos.x - gate.position.x;
        const relZ = state.pos.z - gate.position.z;
        const along = relX * Math.sin(rad) + relZ * -Math.cos(rad);
        const lateral = relX * Math.cos(rad) + relZ * Math.sin(rad);
        const prev = gate.userData.prevAlong;
        if (prev !== null && prev !== 0 && Math.sign(along) !== Math.sign(prev)) {
          const alt = state.pos.y;
          if (Math.abs(lateral) <= PHOTO_HALF_WIDTH && alt >= PHOTO_ALT_MIN && alt <= PHOTO_ALT_MAX) {
            // In the frame: centred pays most, low pays the rest — a postcard, not a survey.
            const centred = 1 - Math.abs(lateral) / PHOTO_HALF_WIDTH;
            const low = 1 - (alt - PHOTO_ALT_MIN) / (PHOTO_ALT_MAX - PHOTO_ALT_MIN);
            const points = Math.round(120 + centred * 230 + low * 150);
            this.score += points;
            this.photos += 1;
            this.gateIndex += 1;
            gate.userData.flash = 1;
            happenings.push({ kind: 'photo', index: this.photos, total: gates.length, points });
            if (this.gateIndex >= gates.length) {
              const bonus = Math.max(0, Math.round((def.parSeconds - this.time) * 5));
              this.score += bonus;
              this.done = true;
              happenings.push({ kind: 'complete', title: 'PHOTO RUN COMPLETE', detail: `Every harbour frame is in the pouch. Time bonus +${bonus}.`, score: this.score, time: this.time });
            }
          } else if (Math.abs(lateral) < PHOTO_HALF_WIDTH * 2.2) {
            // Close enough to have tried: say why the frame was wasted, and leave it live.
            const reason = alt > PHOTO_ALT_MAX
              ? 'TOO HIGH — THE FRAME WANTS YOU BELOW 145 FT'
              : alt < PHOTO_ALT_MIN
                ? 'TOO LOW — CLIMB A TOUCH FOR THE FRAME'
                : 'WIDE OF THE FRAME — LINE UP BETWEEN THE POSTS';
            happenings.push({ kind: 'photo-miss', reason });
          }
        }
        gate.userData.prevAlong = along;
      }

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

    /** Remove the mission's rings and photo gates from the scene. */
    dispose(sceneToClean) {
      for (const ring of rings) sceneToClean.remove(ring);
      for (const gate of gates) sceneToClean.remove(gate);
    },
  };
}
