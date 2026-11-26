// The flight model: an honest little arcade simulation. Throttle makes speed, speed makes
// lift, bank makes turn, and slow flight stops flying — a stall drops the nose and the sink
// builds until the pilot trades height for speed again. Ground contact is judged here: gentle
// arrivals roll out, hard ones bend the hull, and fast ones into terrain end the sortie.
import * as THREE from 'three';
import { getRunway, onRunway } from './world.js';

export const EVENT_TOOK_OFF = 1;
export const EVENT_TOUCHDOWN = 2;
export const EVENT_CRASHED = 4;
export const EVENT_DITCHED = 8;

export const MAX_SPEED = 80; // m/s at full throttle, level
export const STALL_SPEED = 24; // m/s: below this the wing gives up
const GEAR_HEIGHT = 1.2; // metres from the aircraft origin to the wheels
const WORLD_EDGE = 4700;

/** A fresh flight state, parked at the start of the Palma strip. */
export function createFlight() {
  return {
    pos: new THREE.Vector3(),
    heading: 0,
    pitch: 0,
    bank: 0,
    speed: 0,
    throttle: 0,
    fuel: 100,
    hull: 100,
    onGround: true,
    verticalSpeed: 0,
    stalled: false,
    lastTouchdown: null,
  };
}

/** Park the aircraft at the threshold of a runway, facing along it, tanks and hull as given. */
export function resetFlight(state, runway, fuel) {
  const rad = (runway.headingDeg * Math.PI) / 180;
  const u = -runway.length / 2 + 70;
  state.pos.set(runway.x + u * Math.sin(rad), runway.elev + GEAR_HEIGHT, runway.z - u * Math.cos(rad));
  state.heading = rad;
  state.pitch = 0;
  state.bank = 0;
  state.speed = 0;
  state.throttle = 0;
  state.fuel = fuel;
  state.hull = 100;
  state.onGround = true;
  state.verticalSpeed = 0;
  state.stalled = false;
  state.lastTouchdown = null;
}

/** Compass heading in degrees, 0–359, from the state's radian heading. */
export function headingDegrees(state) {
  return ((Math.round((state.heading * 180) / Math.PI) % 360) + 360) % 360;
}

/** Airspeed in knots for the HUD. */
export function speedKnots(state) {
  return state.speed * 1.944;
}

/** Altitude above the sea in feet for the HUD. */
export function altitudeFeet(state) {
  return Math.max(0, (state.pos.y - GEAR_HEIGHT) * 3.281);
}

/**
 * Advance the flight by dt seconds against the pilot's input
 * ({ pitch: -1..1 climb-positive, bank: -1..1 right-positive, throttle: -1..1, brake: bool })
 * and the world's ground. Returns an EVENT_* bitmask; a touchdown's details land on
 * state.lastTouchdown ({ sink, speed, bankDeg, runwayId|null, grass }).
 */
export function stepFlight(state, input, dt, world) {
  let events = 0;
  const power = state.fuel > 0 ? state.throttle : 0;

  state.throttle = THREE.MathUtils.clamp(state.throttle + input.throttle * dt * 0.5, 0, 1);
  state.fuel = Math.max(0, state.fuel - dt * (0.045 + power * 0.16));

  if (state.onGround) {
    const accel = power * 15 - state.speed * 0.22 - (input.brake ? 9 : 0);
    state.speed = Math.max(0, state.speed + accel * dt);
    state.heading += input.bank * dt * 0.45 * Math.min(1, state.speed / 30);
    state.bank = THREE.MathUtils.lerp(state.bank, input.bank * 0.12, 1 - Math.exp(-dt * 6));
    state.pitch = THREE.MathUtils.lerp(state.pitch, 0, 1 - Math.exp(-dt * 4));
    state.pos.x += Math.sin(state.heading) * state.speed * dt;
    state.pos.z += -Math.cos(state.heading) * state.speed * dt;
    if (world.groundHeight(state.pos.x, state.pos.z) < -0.6) {
      state.pos.y = GEAR_HEIGHT * 0.4;
      return events | EVENT_DITCHED;
    }
    state.pos.y = Math.max(world.groundHeight(state.pos.x, state.pos.z), 0) + GEAR_HEIGHT;
    state.verticalSpeed = 0;
    if (state.speed > 26 && input.pitch > 0.2 && state.fuel >= 0) {
      state.onGround = false;
      state.pitch = 0.12;
      events |= EVENT_TOOK_OFF;
    }
    return events;
  }

  // In the air: bank toward the pilot's ask, turn with the bank, pitch toward the ask.
  const bankTarget = input.bank * 1.02;
  state.bank += (bankTarget - state.bank) * (1 - Math.exp(-dt * 2.6));
  const turnRate = (9.8 * Math.tan(state.bank)) / Math.max(state.speed, 20);
  state.heading += turnRate * dt * 0.9;

  let pitchTarget = input.pitch * 0.5;
  const stalled = state.speed < STALL_SPEED;
  if (stalled) pitchTarget -= (STALL_SPEED - state.speed) * 0.022;
  state.stalled = stalled;
  state.pitch += (pitchTarget - state.pitch) * (1 - Math.exp(-dt * 2.2));

  const accel = power * 11.5 - 0.0055 * state.speed * state.speed - Math.sin(state.pitch) * 5.4;
  state.speed = THREE.MathUtils.clamp(state.speed + accel * dt, 0, 96);

  let vy = Math.sin(state.pitch) * state.speed;
  if (stalled) vy -= (STALL_SPEED - state.speed) * 0.6;
  vy -= (1 - Math.cos(state.bank)) * state.speed * 0.1;
  state.verticalSpeed = vy;

  const forward = Math.cos(state.pitch) * state.speed;
  state.pos.x += Math.sin(state.heading) * forward * dt;
  state.pos.z += -Math.cos(state.heading) * forward * dt;
  state.pos.y += vy * dt;
  state.pos.x = THREE.MathUtils.clamp(state.pos.x, -WORLD_EDGE, WORLD_EDGE);
  state.pos.z = THREE.MathUtils.clamp(state.pos.z, -WORLD_EDGE, WORLD_EDGE);

  // Ground contact.
  const landY = world.groundHeight(state.pos.x, state.pos.z);
  const floorY = Math.max(landY, 0);
  if (state.pos.y <= floorY + GEAR_HEIGHT) {
    if (landY < -0.6) {
      events |= EVENT_DITCHED;
      state.pos.y = GEAR_HEIGHT * 0.4;
      return events;
    }
    const palma = getRunway('palma');
    const farrel = getRunway('farrel');
    const runwayId = onRunway(palma, state.pos.x, state.pos.z) ? 'palma' : onRunway(farrel, state.pos.x, state.pos.z) ? 'farrel' : null;
    const bankDeg = Math.abs((state.bank * 180) / Math.PI);
    state.lastTouchdown = {
      sink: state.verticalSpeed,
      speed: state.speed,
      bankDeg,
      runwayId,
      grass: runwayId === null,
    };
    const tooFastForGround = state.speed > 36 && runwayId === null;
    const smashed = state.verticalSpeed < -10.5 || bankDeg > 46;
    if (tooFastForGround || smashed) {
      events |= EVENT_CRASHED;
      return events;
    }
    let damage = 0;
    if (state.verticalSpeed < -3.2) damage += (-state.verticalSpeed - 3.2) * 8;
    if (bankDeg > 22) damage += (bankDeg - 22) * 0.9;
    if (runwayId === null) damage += 7;
    if (state.speed > 44 && runwayId !== null) damage += (state.speed - 44) * 0.5;
    state.hull = Math.max(0, state.hull - damage);
    state.lastTouchdown.damage = damage;
    if (state.hull <= 0) {
      events |= EVENT_CRASHED;
      return events;
    }
    events |= EVENT_TOUCHDOWN;
    state.onGround = true;
    state.pos.y = floorY + GEAR_HEIGHT;
    state.pitch = 0;
  }
  return events;
}

/** Pose the aircraft object from the flight state (YXZ: heading, then pitch, then bank). */
export function poseAircraft(state, object) {
  object.position.copy(state.pos);
  object.rotation.order = 'YXZ';
  object.rotation.y = -state.heading;
  object.rotation.x = state.pitch;
  object.rotation.z = -state.bank;
}
