export const STAGED_SHOTS = {
  cover: {
    mission: 1, ringIndex: 7, score: 1050, time: 186, flown: [2, 4, 5, 6, 7, 8, 9, 10, 11],
    fuel: 19, hull: 84, camera: 'chase', decision: true, flash: 'RING 7/8  +150',
    wearEngine: 68, wearProp: 62,
    radio: 'PALMA TOWER — BINGO STATE, SAY INTENTIONS',
    pos: [-1308, 200, -1034], headingDeg: 103, pitchDeg: -1, bankDeg: 5, speed: 58, throttle: 0.75,
  },
  approach: {
    mission: 2, ringIndex: 0, score: 0, time: 192,
    fuel: 57, hull: 100, camera: 'cockpit',
    radio: 'FARREL TOWER — STRIP IN SIGHT, LAND WHEN READY',
    pos: [1496, 232, 827], headingDeg: 155, pitchDeg: -8, bankDeg: 0, speed: 30, throttle: 0.28,
  },
  town: {
    mission: 1, ringIndex: 6, score: 900, time: 164,
    fuel: 74, hull: 100, camera: 'chase', plane: 'comet',
    wearEngine: 72, wearProp: 64,
    radio: 'CENTRE — NOTE YOUR ENGINE, SHE SOUNDS TIRED',
    pos: [-3050, 300, -150], headingDeg: 72, pitchDeg: 1, bankDeg: 24, speed: 63, throttle: 0.8,
  },
  photorun: {
    mission: 4, ringIndex: 0, gateIndex: 2, score: 800, time: 150,
    fuel: 46, hull: 100, camera: 'chase',
    radio: 'PALMA TOWER — PHOTO RUN, GATES LIVE',
    photoAlt: 30, photoScores: [380, 420],
    pos: [-2937, 26, -763], headingDeg: 49.5, pitchDeg: -3, bankDeg: -6, speed: 44, throttle: 0.5,
  },
};
export function describeShot(name) {
  return Object.prototype.hasOwnProperty.call(STAGED_SHOTS, name) ? STAGED_SHOTS[name] : null;
}
