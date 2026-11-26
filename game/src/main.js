// Golden Isles Courier — boot and the one loop. The world, the aeroplane and the mission are
// stepped in fixed 1/60 s slices; the camera (chase or cockpit) and the HUD follow the flight
// state; screens (mission board, pause, results) are DOM over the canvas. A ?shot=name URL
// stages one frozen moment of play instead, paints it and sets window.__shotReady.
import * as THREE from 'three';
import { createWorld, getRunway } from './world.js';
import { createAircraft } from './aircraft.js';
import {
  createFlight, resetFlight, stepFlight, poseAircraft,
  EVENT_TOOK_OFF, EVENT_TOUCHDOWN, EVENT_CRASHED, EVENT_DITCHED,
} from './flight.js';
import { MISSIONS, startMission } from './missions.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_CAMERA, ACTION_MUTE, ACTION_MISSION_1, ACTION_MISSION_2, ACTION_MISSION_3, ACTION_MISSION_4, ACTION_MENU } from './input.js';
import { createHud, formatTime } from './hud.js';
import { createInstruments } from './instruments.js';
import { createAudio } from './audio.js';
import { describeShot } from './shots.js';

const STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const shotName = params.get('shot');

const canvas = document.getElementById('scene');
const status = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 24000);
const world = createWorld(scene, seed);
const aircraft = createAircraft();
scene.add(aircraft.group);
const flight = createFlight();
resetFlight(flight, getRunway('palma'), 100);
poseAircraft(flight, aircraft.group);

const input = createInput();
const hud = createHud();
const instruments = createInstruments(document.getElementById('panel'));
const audio = createAudio();

const titleScreen = document.getElementById('screen-title');
const endScreen = document.getElementById('screen-end');
const pauseScreen = document.getElementById('screen-pause');

let screen = 'title'; // title | flying | paused | over
let mission = null;
let cameraMode = 'chase';
let wasStalled = false;
let titleOrbit = 0;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function announce(text) {
  status.textContent = text;
}

function showScreen(which) {
  titleScreen.classList.toggle('hidden', which !== 'title');
  endScreen.classList.toggle('hidden', which !== 'over');
  pauseScreen.classList.toggle('hidden', which !== 'paused');
}

function beginMission(id) {
  if (mission) mission.dispose(scene);
  const def = MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
  mission = startMission(def, scene);
  resetFlight(flight, getRunway('palma'), def.fuel);
  cameraMode = 'chase';
  wasStalled = false;
  screen = 'flying';
  showScreen('flying');
  audio.start();
  hud.clearPhotos();
  hud.setMission(def.name, def.brief);
  hud.flash('THROTTLE UP — W', 1.8);
  announce(`Flying ${def.name}. ${def.brief}.`);
}

function endMission(outcome) {
  screen = 'over';
  document.getElementById('end-title').textContent = outcome.title;
  document.getElementById('end-detail').textContent = outcome.detail;
  document.getElementById('end-stats').innerHTML =
    `Score <b>${Math.round(mission ? mission.score : 0)}</b> · Time <b>${formatTime(mission ? mission.time : 0)}</b><br>` +
    `Fuel left <b>${Math.round(flight.fuel)}%</b> · Hull <b>${Math.round(flight.hull)}%</b>`;
  showScreen('over');
  if (outcome.success) audio.fanfare();
  else audio.fail();
  announce(`${outcome.title}. ${outcome.detail}`);
}

function failMission(title, detail) {
  endMission({ title, detail, success: false });
}

/** Present one frame of flight events: sounds, flashes and endings. */
function presentEvents(events, happenings) {
  if (events & EVENT_TOOK_OFF) {
    if (mission && mission.def.kind === 'delivery') hud.flash('AIRBORNE — FARREL ISLE LIES SOUTH-EAST', 2.2);
    else hud.flash('AIRBORNE', 1.2);
  }
  if (events & EVENT_TOUCHDOWN) {
    const td = flight.lastTouchdown;
    audio.thud(Math.min(1, Math.max(0, (-td.sink - 2) / 9) + (td.damage > 12 ? 0.3 : 0)));
    if (mission && mission.def.kind === 'delivery' && td.runwayId === 'palma') {
      hud.flash('WRONG FIELD — THE MAIL IS FOR FARREL!', 2.4);
    } else if (td.grass) {
      hud.flash('ROUGH FIELD LANDING', 1.8);
    } else if (td.sink > -1.8) hud.flash('GREASED IT!', 1.8);
    else if (td.sink > -3.2) hud.flash('SMOOTH LANDING', 1.8);
    else if (td.sink > -5.5) hud.flash('FIRM ARRIVAL', 1.8);
    else hud.flash(`HARD LANDING — HULL ${Math.round(flight.hull)}%`, 2.2);
  }
  if (events & EVENT_CRASHED) {
    audio.thud(1);
    failMission('CRASHED', 'The courier came down in the scenery. The mail, sadly, is confetti.');
    return;
  }
  if (events & EVENT_DITCHED) {
    audio.thud(0.8);
    failMission('DITCHED', 'Down in the Aurelia sea. The pouch floats; the aeroplane does not.');
    return;
  }
  for (const happening of happenings) {
    if (happening.kind === 'ring') {
      audio.chime();
      hud.flash(`RING ${happening.index}/${happening.total}  +${happening.points}`, 1.5);
    } else if (happening.kind === 'photo') {
      audio.shutter();
      hud.flashPhoto();
      hud.addPhoto(happening.points);
      hud.flash(`PHOTO ${happening.index}/${happening.total}  +${happening.points}`, 1.5);
    } else if (happening.kind === 'photo-miss') {
      hud.flash(happening.reason, 1.6);
    } else if (happening.kind === 'complete') {
      mission.score = happening.score;
      endMission({ title: happening.title, detail: happening.detail, success: true });
      return;
    }
  }
  if (flight.stalled && !wasStalled && screen === 'flying') hud.flash('STALL — NOSE DOWN, BUILD SPEED', 1.1);
  wasStalled = flight.stalled;
  if (screen === 'flying' && flight.fuel <= 0 && flight.onGround && flight.speed < 0.5) {
    failMission('OUT OF FUEL', 'Bone dry on the ground. The isles are lovely this time of year; you may be here a while.');
  }
}

function handleActions() {
  const actions = input.takeActions();
  if (screen === 'title') {
    if (actions & ACTION_MISSION_1) beginMission(1);
    else if (actions & ACTION_MISSION_2) beginMission(2);
    else if (actions & ACTION_MISSION_3) beginMission(3);
    else if (actions & ACTION_MISSION_4) beginMission(4);
    else if (actions & ACTION_CONFIRM) beginMission(1);
    return;
  }
  if (screen === 'over') {
    if (actions & ACTION_CONFIRM) beginMission(mission ? mission.def.id : 1);
    else if (actions & ACTION_MENU) {
      screen = 'title';
      showScreen('title');
    }
    return;
  }
  if (actions & ACTION_MUTE) announce(audio.toggleMute() ? 'Sound off.' : 'Sound on.');
  if (actions & ACTION_CAMERA && (screen === 'flying' || screen === 'paused')) {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
  }
  if (actions & ACTION_PAUSE) {
    if (screen === 'flying') {
      screen = 'paused';
      showScreen('paused');
    } else if (screen === 'paused') {
      screen = 'flying';
      showScreen('flying');
    }
  }
}

for (const id of [1, 2, 3, 4]) {
  document.getElementById(`btn-mission-${id}`).addEventListener('click', () => beginMission(id));
}

const _fwd = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();
const _planeQuat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

/** Aim the camera for this frame: a lazy chase rig, the pilot's eyes, or the title orbit. */
function updateCamera(dt, snap = false) {
  _euler.set(flight.pitch, -flight.heading, -flight.bank, 'YXZ');
  _planeQuat.setFromEuler(_euler);
  _fwd.set(0, 0, -1).applyQuaternion(_planeQuat);

  if (screen === 'title') {
    aircraft.setCockpitView(false);
    instruments.setVisible(false);
    document.getElementById('hud-systems').style.display = '';
    titleOrbit += dt * 0.07;
    _desired.set(
      flight.pos.x + Math.cos(titleOrbit) * 30,
      flight.pos.y + 9,
      flight.pos.z + Math.sin(titleOrbit) * 30,
    );
    camera.position.lerp(_desired, snap ? 1 : 1 - Math.exp(-dt * 2));
    camera.up.set(0, 1, 0);
    camera.lookAt(flight.pos.x, flight.pos.y + 1, flight.pos.z);
    return;
  }

  if (cameraMode === 'cockpit') {
    _desired.set(0, 1.52, -0.35).applyQuaternion(_planeQuat).add(flight.pos);
    camera.position.copy(_desired);
    camera.quaternion.copy(_planeQuat);
    aircraft.setCockpitView(true);
    instruments.setVisible(true);
    document.getElementById('hud-systems').style.display = 'none';
    return;
  }

  aircraft.setCockpitView(false);
  instruments.setVisible(false);
  document.getElementById('hud-systems').style.display = '';
  _desired.copy(flight.pos).addScaledVector(_fwd, -13.5);
  _desired.y += 3.6;
  const groundClear = Math.max(world.groundHeight(_desired.x, _desired.z), 0) + 2.2;
  if (_desired.y < groundClear) _desired.y = groundClear;
  camera.position.lerp(_desired, snap ? 1 : 1 - Math.exp(-dt * 5.5));
  camera.up.set(Math.sin(-flight.bank) * 0.38, 1, 0).normalize();
  _look.copy(flight.pos).addScaledVector(_fwd, 26);
  _look.y += 1.4;
  camera.lookAt(_look);
}

/** Point the HUD diamond at the mission's current target, clamped to the frame's edge. */
function updateMarker() {
  if (!mission || screen !== 'flying') {
    hud.setMarker(null);
    return;
  }
  const target = mission.target();
  if (!target) {
    hud.setMarker(null);
    return;
  }
  camera.updateMatrixWorld();
  const projected = target.clone().project(camera);
  const dist = Math.round(flight.pos.distanceTo(target));
  if (projected.z > 1) {
    hud.setMarker(null);
    return;
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const x = THREE.MathUtils.clamp(((projected.x * 0.5 + 0.5) * w), 46, w - 46);
  const y = THREE.MathUtils.clamp(((-projected.y * 0.5 + 0.5) * h), 90, h - 60);
  hud.setMarker(x, y, `${dist} m`);
}

/** One render of the current state with every overlay painted. */
function drawFrame(dt, t) {
  world.update(dt, t);
  aircraft.spinPropeller(dt, screen === 'flying' || screen === 'paused' ? flight.throttle : 0.25);
  poseAircraft(flight, aircraft.group);
  updateCamera(dt);
  hud.updateFlight(flight);
  if (mission) {
    hud.updateScore(mission.score, mission.time);
    hud.setMission(mission.def.name, mission.goalText());
  }
  hud.tick();
  updateMarker();
  if (cameraMode === 'cockpit' && screen !== 'title') instruments.draw(flight);
  renderer.render(scene, camera);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    handleActions();
    if (screen === 'flying') {
      accumulator += dt;
      let guard = 0;
      while (accumulator >= STEP && screen === 'flying' && guard < 8) {
        const events = stepFlight(flight, input.flightInput(), STEP, world);
        const happenings = mission ? mission.update(STEP, flight, now / 1000) : [];
        presentEvents(events, happenings);
        accumulator -= STEP;
        guard += 1;
      }
      audio.update(flight.throttle, flight.speed, true);
    } else {
      accumulator = 0;
      audio.update(0, 0, false);
    }
    drawFrame(dt, now / 1000);
  }
  announce('Golden Isles Courier. Choose a mission: 1, 2, 3 or 4.');
  requestAnimationFrame(frame);
}

/** Stage one frozen moment of play for its screenshot, then signal readiness. */
function runShot(name) {
  const desc = describeShot(name) ?? describeShot('cover');
  showScreen('none');
  const def = MISSIONS.find((m) => m.id === desc.mission);
  mission = startMission(def, scene);
  mission.ringIndex = desc.ringIndex;
  mission.score = desc.score;
  mission.time = desc.time;
  mission.leftGround = true;
  if (desc.gateIndex) {
    // A harbour frame is already in the pouch. Pin its thumbnail the way play does —
    // hud.addPhoto copies the game's own canvas — so first pose the crossing at the gate
    // that was snapped and render that moment; the final pose below then overwrites the
    // flight state, and the mission update there settles the taken gate's beam to grey.
    const taken = mission.gates[desc.gateIndex - 1];
    mission.gateIndex = desc.gateIndex;
    mission.photos = desc.gateIndex;
    flight.pos.set(taken.position.x, desc.photoAlt, taken.position.z);
    flight.heading = (taken.userData.headingDeg * Math.PI) / 180;
    flight.pitch = 0;
    flight.bank = 0;
    flight.speed = desc.speed;
    flight.throttle = desc.throttle;
    flight.onGround = false;
    cameraMode = desc.camera;
    screen = 'flying';
    poseAircraft(flight, aircraft.group);
    world.update(0, 1.4);
    updateCamera(0.016, true);
    renderer.render(scene, camera);
    hud.addPhoto(desc.photoPoints);
  }
  flight.pos.set(desc.pos[0], desc.pos[1], desc.pos[2]);
  flight.heading = (desc.headingDeg * Math.PI) / 180;
  flight.pitch = (desc.pitchDeg * Math.PI) / 180;
  flight.bank = (desc.bankDeg * Math.PI) / 180;
  flight.speed = desc.speed;
  flight.throttle = desc.throttle;
  flight.fuel = desc.fuel;
  flight.hull = desc.hull;
  flight.onGround = false;
  flight.verticalSpeed = Math.sin(flight.pitch) * flight.speed;
  cameraMode = desc.camera;
  screen = 'flying';
  mission.update(0.016, flight, 1.4);
  poseAircraft(flight, aircraft.group);
  world.update(0, 1.4);
  updateCamera(0.016, true);
  hud.updateFlight(flight);
  hud.updateScore(mission.score, mission.time);
  hud.setMission(def.name, mission.goalText());
  updateMarker();
  if (cameraMode === 'cockpit') {
    instruments.setVisible(true);
    instruments.draw(flight);
  }
  let painted = 0;
  function paint() {
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shotName) runShot(shotName);
else runGame();

// A handle for automated play-testing: the live scene, camera and flight state, so a test
// harness can watch the aeroplane move and read the ground it flies over.
window.__game = {
  scene, camera, renderer, flight, world, aircraft,
  get mission() { return mission; },
};
