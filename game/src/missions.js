import * as THREE from 'three';
import { LANDMARKS, getRunway } from './world.js';
import { createSupplyRun } from './supply.js';
import { TRAFFIC_ROUTES } from './traffic.js';
const RING_RADIUS = 15;
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
function photoCourse() {
 return [
  [-2930, -300, 255],
  [-3120, -580, 326],
  [-2900, -800, 45],
 ];
}
function bannerCourse() {
 return [
  [-2150, 105, -60], [-1500, 92, 330], [-820, 100, 130], [-620, 118, -480],
  [-1150, 98, -1180], [-1980, 110, -720],
 ];
}
function ashCourse() {
 const c = LANDMARKS.cindera;
 const ringAt = (deg, radius, y) => {
  const a = (deg * Math.PI) / 180;
  return [c.x + Math.cos(a) * radius, y, c.z + Math.sin(a) * radius];
 };
 return [
  ringAt(200, 520, 215), ringAt(262, 500, 245), ringAt(322, 490, 285),
  ringAt(20, 500, 262), ringAt(80, 520, 228), [c.x, 505, c.z],
 ];
}
function regattaCourse() {
 return [
  [-2750, 350, 130],
  [-2450, 620, 115],
  [-2150, 420, 56],
 ];
}
export const STAGE_NAMES = ['FIRST SOLOS', 'WORKING SKIES', 'HARD WEATHER', 'MASTER COURIER'];
export const RESCUE_BOAT = { x: -300, z: 700 };
export const WATER_STRIP = { x: -3300, z: 100 };
export const FARREL_ZONE = { x: 2050, z: 1330 };
const PHOTO_ALT_MIN = 14;
const PHOTO_ALT_MAX = 44;
const PHOTO_HALF_WIDTH = 23;
export const MISSIONS = [
 { id: 1, stage: 1, name: 'Ring Run', goal: 'RINGS THREADED — RING RUN', brief: 'Thread all 8 rings around Palma', fuel: 100, kind: 'rings', course: ringRunCourse, parSeconds: 210 },
 { id: 2, stage: 1, name: 'Island Delivery', goal: 'MAIL LANDED — FARREL ISLE', brief: 'Land the mail at Farrel Isle', fuel: 85, kind: 'delivery', course: null, parSeconds: 330 },
 { id: 3, stage: 1, name: 'Volcano Circuit', goal: 'VOLCANO RINGS FLOWN', brief: 'Fly all 6 rings around Mount Cindera', fuel: 90, kind: 'rings', course: volcanoCourse, parSeconds: 240 },
 { id: 4, stage: 2, name: 'Harbor Photo Run', goal: 'HARBOUR PHOTOS 3/3', brief: 'Snap 3 harbour frames, low over Port Aurelia', fuel: 80, kind: 'photo', course: photoCourse, parSeconds: 240 },
 { id: 5, stage: 2, name: 'Lighthouse Supply Drop', goal: 'SUPPLY DROPPED — LIGHTHOUSE', brief: 'Drop 3 crates into the ring beside the lighthouse — B lets one go', fuel: 85, kind: 'supply', course: null, parSeconds: 300 },
 { id: 6, stage: 2, name: 'Banner Tow', goal: 'BANNER TOW CIRCUIT', brief: 'Tow the banner through 6 low rings around Palma bay', fuel: 85, kind: 'banner', course: bannerCourse, parSeconds: 300 },
 { id: 7, stage: 2, name: 'Formation Flight', goal: 'FORMATION HELD 40 S', brief: 'Hold station on the Palma circuit plane for 40 s', fuel: 80, kind: 'formation', course: null, parSeconds: 330 },
 { id: 8, stage: 3, name: 'Storm Rescue', goal: 'BOAT FOUND — WORD HOME', brief: 'STORM — find the stranded boat, loiter low, bring word home', fuel: 90, kind: 'rescue', course: null, parSeconds: 420, weather: 'STORM' },
 { id: 9, stage: 3, name: 'Volcano Ash Run', goal: 'ASH RINGS SURVIVED', brief: 'STORM — tight rings in the ash plume; the ash eats props', fuel: 90, kind: 'ash', course: ashCourse, parSeconds: 300, weather: 'STORM' },
 { id: 10, stage: 3, name: 'Regatta Photo Finish', goal: 'REGATTA PHOTOS 3/3', brief: 'Snap 3 frames along the regatta line, low and quick', fuel: 75, kind: 'photo', course: regattaCourse, parSeconds: 200 },
 { id: 11, stage: 4, name: 'Splashdown', goal: 'SPLASHDOWN ON THE STRIP', brief: 'Alight on the buoyed water strip west of the harbour — slow and gentle', fuel: 80, kind: 'water', course: null, parSeconds: 300 },
 { id: 12, stage: 4, name: 'Engine-Out Glide', goal: 'DEAD-STICK DELIVERY', brief: 'The engine quits 500 FT over the field — glide the mail to Farrel', fuel: 85, kind: 'glide', course: null, parSeconds: 420 },
 { id: 13, stage: 4, name: 'Farrel Supply Drop', goal: 'SUPPLY DROPPED — FARREL', brief: 'Drop 3 crates on the Farrel pad — B lets one go', fuel: 95, kind: 'supply', course: null, parSeconds: 420, zone: FARREL_ZONE, dropLabel: 'the Farrel ring', place: 'Farrel pad' },
];
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
function buildBoat(x, z) {
 const group = new THREE.Group();
 const hullMat = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.7 });
 const deckMat = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.7 });
 const hull = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 11), hullMat);
 hull.position.y = 0.5;
 group.add(hull);
 const cabin = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 3.4), deckMat);
 cabin.position.set(0, 1.9, -1);
 group.add(cabin);
 const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), deckMat);
 mast.position.set(0, 4.6, 1.8);
 group.add(mast);
 const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffc95e }));
 lamp.position.set(0, 8.2, 1.8);
 group.add(lamp);
 const pillar = new THREE.Mesh(
  new THREE.CylinderGeometry(2.2, 3.2, 130, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xffb35e, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false }),
 );
 pillar.position.y = 65;
 group.add(pillar);
 group.position.set(x, 0, z);
 group.rotation.y = 0.7;
 return group;
}
function buildWaterStrip(strip) {
 const group = new THREE.Group();
 const orange = new THREE.MeshStandardMaterial({ color: 0xff7a1e, roughness: 0.6 });
 const white = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.6 });
 for (let i = 0; i < 6; i += 1) {
  for (const side of [-1, 1]) {
   const buoy = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), i % 2 ? white : orange);
   buoy.position.set(strip.x + side * 42, 0.4, strip.z - 150 + i * 60);
   group.add(buoy);
  }
 }
 const pillar = new THREE.Mesh(
  new THREE.CylinderGeometry(2.2, 3.2, 130, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false }),
 );
 pillar.position.set(strip.x, 65, strip.z);
 group.add(pillar);
 return group;
}
function buildBanner() {
 const group = new THREE.Group();
 const line = new THREE.Mesh(
  new THREE.CylinderGeometry(0.05, 0.05, 15, 4),
  new THREE.MeshBasicMaterial({ color: 0x2c3138 }),
 );
 line.rotation.x = Math.PI / 2 - 0.32;
 line.position.set(0, -2.6, 7.2);
 group.add(line);
 const orange = new THREE.MeshBasicMaterial({ color: 0xff8a1e, side: THREE.DoubleSide });
 const cream = new THREE.MeshBasicMaterial({ color: 0xfff3da, side: THREE.DoubleSide });
 for (let i = 0; i < 6; i += 1) {
  const seg = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.2), i % 2 ? cream : orange);
  seg.position.set(0, -5.4, 14.8 + i * 3.6);
  seg.rotation.y = Math.PI / 2;
  group.add(seg);
 }
 return group;
}
export function startMission(def, scene) {
 const rings = [];
 if (def.kind === 'rings' || def.kind === 'banner' || def.kind === 'ash') {
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
 const supply = def.kind === 'supply' ? createSupplyRun(scene, def.zone) : null;
 const boat = def.kind === 'rescue' ? buildBoat(RESCUE_BOAT.x, RESCUE_BOAT.z) : null;
 if (boat) scene.add(boat);
 const strip = def.kind === 'water' ? buildWaterStrip(WATER_STRIP) : null;
 if (strip) scene.add(strip);
 const banner = def.kind === 'banner' ? buildBanner() : null;
 if (banner) scene.add(banner);
 const farrel = getRunway('farrel');
 const palma = getRunway('palma');
 return {
  def,
  rings,
  gates,
  supply,
  ringIndex: 0,
  gateIndex: 0,
  photos: 0,
  score: 0,
  time: 0,
  done: false,
  leftGround: false,
  loiter: 0,
  rescuePhase: 0,
  formTime: 0,
  leaderPos: null,
  engineCut: false,
  diverted: false,
  divert() {
   this.diverted = true;
  },
  target() {
   if (this.done) return null;
   if (this.diverted) return new THREE.Vector3(palma.x, palma.elev + 12, palma.z);
   if (def.kind === 'rings' || def.kind === 'banner' || def.kind === 'ash') {
    const ring = rings[this.ringIndex];
    return ring ? ring.position : null;
   }
   if (def.kind === 'photo') {
    const gate = gates[this.gateIndex];
    return gate ? new THREE.Vector3(gate.position.x, 24, gate.position.z) : null;
   }
   if (def.kind === 'supply') {
    return supply ? supply.centre.clone().add(new THREE.Vector3(0, 12, 0)) : null;
   }
   if (def.kind === 'rescue') {
    return this.rescuePhase === 0
     ? new THREE.Vector3(RESCUE_BOAT.x, 26, RESCUE_BOAT.z)
     : new THREE.Vector3(palma.x, palma.elev + 12, palma.z);
   }
   if (def.kind === 'formation') return this.leaderPos;
   if (def.kind === 'water') return new THREE.Vector3(WATER_STRIP.x, 14, WATER_STRIP.z);
   return new THREE.Vector3(farrel.x, farrel.elev + 12, farrel.z);
  },
  advisory(state) {
   const t = this.target();
   if (!t || this.done || state.verticalSpeed > 0.2) return '';
   const rwy = [palma, farrel].find((r) => Math.hypot(t.x - r.x, t.z - r.z) < 60);
   if (!rwy) return '';
   const dist = state.pos.distanceTo(t);
   const dx = t.x - state.pos.x;
   const dz = t.z - state.pos.z;
   const along = (dx * Math.sin(state.heading) - dz * Math.cos(state.heading)) / (Math.hypot(dx, dz) || 1);
   return dist <= 700 && Math.abs(t.y - state.pos.y) <= 8 + dist * 0.12 && along > 0.985 ? `${rwy.id.toUpperCase()} RWY — ON GLIDESLOPE` : '';
  },
  objectives(state) {
   const par = `${Math.floor(def.parSeconds / 60)}:${String(def.parSeconds % 60).padStart(2, '0')}`;
   const fuelLine = { text: `FUEL ${Math.round(state.fuel)}% IN THE TANK`, done: state.fuel <= 0 };
   const tookOff = { text: 'TAKE OFF FROM PALMA FIELD', done: this.leftGround };
   if (this.diverted) {
    return [
     tookOff,
     { text: 'DIVERT — LAND AT PALMA FIELD', done: this.done },
     { text: 'TOUCH DOWN GENTLY — SINK < 3.5', done: false },
     fuelLine,
    ];
   }
   if (def.kind === 'rings' || def.kind === 'banner' || def.kind === 'ash') {
    const ring = rings[this.ringIndex];
    const next = ring
     ? { text: `NEXT RING — ${Math.round(state.pos.distanceTo(ring.position))} M`, done: false }
     : { text: 'COURSE COMPLETE', done: true };
    const third = def.kind === 'ash'
     ? { text: 'ASH CHEWS THE PROP — KEEP IT BRIEF', done: false }
     : { text: `TIME BONUS INSIDE ${par}`, done: this.time > def.parSeconds };
    return [
     tookOff,
     { text: `RINGS ${this.ringIndex}/${rings.length} THREADED`, done: this.ringIndex >= rings.length },
     next,
     third,
    ];
   }
   if (def.kind === 'photo') {
    const gate = gates[this.gateIndex];
    const next = gate
     ? { text: `NEXT GATE — ${Math.round(state.pos.distanceTo(new THREE.Vector3(gate.position.x, 24, gate.position.z)))} M`, done: false }
     : { text: 'ALL FRAMES IN THE POUCH', done: true };
    return [
     tookOff,
     { text: `FRAMES ${this.photos}/${gates.length} SNAPPED`, done: this.photos >= gates.length },
     next,
     { text: 'FLY LOW — 45–145 FT, CENTRED', done: false },
    ];
   }
   if (def.kind === 'supply') {
    return [
     tookOff,
     { text: `CRATES AWAY ${supply ? supply.dropped : 0}/3 · ${supply ? supply.cratesLeft : 3} ABOARD`, done: !!supply && supply.dropped >= 3 },
     { text: 'DROP IN THE RING — MIND THE WIND', done: false },
     fuelLine,
    ];
   }
   if (def.kind === 'rescue') {
    const dist = Math.round(Math.hypot(state.pos.x - RESCUE_BOAT.x, state.pos.z - RESCUE_BOAT.z));
    return [
     tookOff,
     this.rescuePhase === 0
      ? { text: `FIND THE BOAT — ${dist} M`, done: false }
      : { text: 'SURVIVORS SPOTTED — WORD ABOARD', done: true },
     this.rescuePhase === 0
      ? { text: `LOITER LOW BY HER — ${Math.floor(this.loiter)}/20 S`, done: this.loiter >= 20 }
      : { text: 'LAND BACK AT PALMA FIELD', done: this.done },
     fuelLine,
    ];
   }
   if (def.kind === 'formation') {
    const range = this.leaderPos ? Math.round(state.pos.distanceTo(this.leaderPos)) : 0;
    return [
     tookOff,
     { text: `FORMATION TIME ${Math.floor(this.formTime)}/40 S`, done: this.formTime >= 40 },
     { text: `RANGE TO LEADER — ${range} M (STAY < 150)`, done: false },
     fuelLine,
    ];
   }
   if (def.kind === 'water') {
    return [
     tookOff,
     { text: 'ALIGHT ON THE BUOYED WATER STRIP', done: this.done },
     { text: 'SLOW — UNDER 70 KT, SINK < 3.5', done: false },
     fuelLine,
    ];
   }
   if (def.kind === 'glide') {
    return [
     tookOff,
     this.engineCut
      ? { text: 'ENGINE OUT — GLIDE, BEST SPEED ~60 KT', done: true }
      : { text: 'CLIMB 500 FT OVER THE FIELD — SHE WILL QUIT', done: false },
     { text: 'LAND ON THE FARREL STRIP', done: this.done },
     fuelLine,
    ];
   }
   return [
    tookOff,
    { text: 'LAND ON THE FARREL STRIP', done: this.done },
    { text: 'TOUCH DOWN GENTLY — SINK < 3.5', done: false },
    fuelLine,
   ];
  },
  goalText() {
   if (this.diverted) return 'Bingo fuel — diverting to Palma Field, land her safe';
   if (def.kind === 'rings') return `Fly the glowing rings — ${this.ringIndex}/${rings.length} threaded`;
   if (def.kind === 'banner') return `Tow the banner through the rings — ${this.ringIndex}/${rings.length} threaded, keep her low`;
   if (def.kind === 'ash') return `Ride the ash rings — ${this.ringIndex}/${rings.length} threaded · the plume eats props`;
   if (def.kind === 'photo') return `Snap the frames — ${this.photos}/${gates.length} taken · fly them low, 45–145 FT`;
   if (def.kind === 'supply') {
    if (!this.leftGround) return 'Take off from Palma Field — three crates aboard';
    if (supply && supply.cratesLeft > 0) return `Drop a crate in ${def.dropLabel ?? 'the lighthouse ring'} — ${supply.dropped}/3 away · press B`;
    return 'All crates away — bring her home';
   }
   if (def.kind === 'rescue') {
    if (this.rescuePhase === 0) return `Find the stranded boat and loiter low by her — ${Math.floor(this.loiter)}/20 s`;
    return 'Survivors spotted — land back at Palma Field with the word';
   }
   if (def.kind === 'formation') return `Fly formation on the circuit plane — ${Math.floor(this.formTime)}/40 s in station`;
   if (def.kind === 'water') return 'Alight on the buoyed water strip — slow, gentle, between the buoys';
   if (def.kind === 'glide') {
    if (!this.leftGround) return 'Take off from Palma Field, mail aboard — and climb';
    return this.engineCut ? 'Engine out — glide for the Farrel strip' : 'Climb 500 FT over the field — the engine is living on borrowed time';
   }
   return this.leftGround ? 'Land gently on the Farrel strip' : 'Take off from Palma Field, mail aboard';
  },
  drop(state, windVector) {
   if (def.kind !== 'supply' || !supply || this.done) return [];
   return supply.dropCrate(state, windVector) ? [{ kind: 'away' }] : [];
  },
  update(dt, state, t) {
   const happenings = [];
   if (this.done) return happenings;
   this.time += dt;
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
   if (banner) {
    banner.position.copy(state.pos);
    banner.rotation.set(Math.sin(t * 1.4) * 0.05, -state.heading, -state.bank * 0.6);
   }
   if (def.kind === 'ash') {
    const dAsh = Math.hypot(state.pos.x - LANDMARKS.cindera.x, state.pos.z - LANDMARKS.cindera.z);
    state.ashExposure = dAsh < 780 && !state.onGround ? 1 : 0;
   }
   if (def.kind === 'formation') {
    const route = TRAFFIC_ROUTES[0];
    const a = route.phase + route.dir * t * (Math.PI * 2 / route.period);
    this.leaderPos = new THREE.Vector3(
     route.centre.x + Math.cos(a) * route.rx,
     route.alt + Math.sin(t * 0.45 + route.phase) * 3,
     route.centre.z + Math.sin(a) * route.rz,
    );
    if (!state.onGround && state.pos.distanceTo(this.leaderPos) <= 150) {
     this.formTime += dt;
     if (this.formTime >= 40) {
      const bonus = Math.max(0, Math.round((def.parSeconds - this.time) * 5));
      this.score += 800 + bonus;
      this.done = true;
      happenings.push({ kind: 'complete', title: 'FORMATION COMPLETE', detail: `Forty seconds in station on the circuit plane. Time bonus +${bonus}.`, score: this.score, time: this.time });
     }
    }
   }
   if (def.kind === 'rescue' && this.rescuePhase === 0 && !state.onGround) {
    const near = Math.hypot(state.pos.x - RESCUE_BOAT.x, state.pos.z - RESCUE_BOAT.z) < 160 && state.pos.y < 55;
    if (near) {
     this.loiter += dt;
     if (this.loiter >= 20) {
      this.rescuePhase = 1;
      happenings.push({ kind: 'note', text: 'SURVIVORS SPOTTED — LAND BACK AT PALMA', seconds: 2.6 });
     }
    }
   }
   if (def.kind === 'water') {
    state.waterZone = { x: WATER_STRIP.x, z: WATER_STRIP.z, r: 175 };
   }
   if (def.kind === 'glide' && !this.engineCut && this.leftGround && state.pos.y >= palma.elev + 153) {
    this.engineCut = true;
    state.engineOut = true;
    happenings.push({ kind: 'note', text: 'ENGINE OUT — GLIDE FOR FARREL', seconds: 2.6 });
   }
   const td = state.lastTouchdown;
   if (this.diverted && td && state.onGround && td.runwayId === 'palma') {
    let points = 300;
    if (td.sink > -2) points += 200;
    else if (td.sink > -3.5) points += 100;
    this.score += points + Math.round(state.fuel * 2);
    this.done = true;
    happenings.push({ kind: 'complete', title: 'DIVERTED — DOWN SAFE', detail: 'Bingo fuel called, home field chosen, aeroplane and mail in one piece.', score: this.score, time: this.time });
   }
   if (def.kind === 'rescue' && !this.done && this.rescuePhase === 1 && td && state.onGround && td.runwayId === 'palma') {
    let points = 900;
    if (td.sink > -2) points += 300;
    else if (td.sink > -3.5) points += 150;
    this.score += points + Math.round(state.fuel * 4);
    this.done = true;
    happenings.push({ kind: 'complete', title: 'RESCUE REPORTED', detail: 'The word is ashore: the boat is found, her crew counted, help on its way.', score: this.score, time: this.time });
   }
   if (def.kind === 'water' && !this.done && td && state.onGround && td.runwayId === 'water') {
    let points = 750;
    let verdict = 'A wet arrival — she floats, barely.';
    if (td.sink > -2) { points += 300; verdict = 'Feathered her in — not a ripple wasted.'; }
    else if (td.sink > -3.5) { points += 150; verdict = 'A smooth alighting on the strip.'; }
    this.score += points + Math.round(state.fuel * 4);
    this.done = true;
    happenings.push({ kind: 'complete', title: 'SPLASHDOWN', detail: verdict, score: this.score, time: this.time });
   }
   if (def.kind === 'glide' && !this.done && this.engineCut && td && state.onGround) {
    const home = td.runwayId === 'farrel';
    let points = home ? 900 : td.runwayId === 'palma' ? 350 : 200;
    if (td.sink > -2) points += 250;
    else if (td.sink > -3.5) points += 120;
    this.score += points + Math.round(state.fuel * 2);
    this.done = true;
    happenings.push({
     kind: 'complete', title: home ? 'DEAD-STICK DELIVERY' : 'PUT HER DOWN',
     detail: home ? 'No engine, no drama: the mail walked in on the wind.' : 'Down safe on a dead engine — the mail is late, not lost.',
     score: this.score, time: this.time,
    });
   }
   if (def.kind === 'supply' && supply) {
    for (const landing of supply.update(dt, state, t)) {
     this.score += landing.points;
     happenings.push({
      kind: 'drop', grade: landing.grade, points: landing.points,
      dist: landing.dist, splash: landing.splash,
     });
    }
    if (supply.dropped >= 3 && !supply.hasFalling()) {
     const bonus = Math.max(0, Math.round((def.parSeconds - this.time) * 5));
     this.score += bonus;
     this.done = true;
     happenings.push({
      kind: 'complete', title: 'SUPPLY DROP COMPLETE',
      detail: `All three crates are down at the ${def.place ?? 'lighthouse rock'}. Best drop: ${supply.bestGrade}. Time bonus +${bonus}.`,
      score: this.score, time: this.time,
     });
    }
   }
   if (def.kind === 'photo' && this.gateIndex < gates.length) {
    const gate = gates[this.gateIndex];
    const rad = (gate.userData.headingDeg * Math.PI) / 180;
    const relX = state.pos.x - gate.position.x;
    const relZ = state.pos.z - gate.position.z;
    const along = relX * Math.sin(rad) + relZ * -Math.cos(rad);
    const lateral = relX * Math.cos(rad) + relZ * Math.sin(rad);
    const prev = gate.userData.prevAlong;
    if (prev !== null && prev !== 0 && Math.sign(along) !== Math.sign(prev)) {
     const alt = state.pos.y;
     if (Math.abs(lateral) <= PHOTO_HALF_WIDTH && alt >= PHOTO_ALT_MIN && alt <= PHOTO_ALT_MAX) {
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
   if ((def.kind === 'rings' || def.kind === 'banner' || def.kind === 'ash') && this.ringIndex < rings.length) {
    const ring = rings[this.ringIndex];
    const toRing = new THREE.Vector3().subVectors(state.pos, ring.position);
    const dist = toRing.length();
    const prev = ring.userData.prevDist;
    if (prev !== null && prev > RING_RADIUS * 1.7 && dist <= RING_RADIUS * 1.7) {
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
   if (def.kind === 'delivery' && !this.done && state.lastTouchdown && state.onGround) {
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
  dispose(sceneToClean) {
   for (const ring of rings) sceneToClean.remove(ring);
   for (const gate of gates) sceneToClean.remove(gate);
   if (supply) supply.dispose(sceneToClean);
   if (boat) sceneToClean.remove(boat);
   if (strip) sceneToClean.remove(strip);
   if (banner) sceneToClean.remove(banner);
  },
 };
}
