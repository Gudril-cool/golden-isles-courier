// The staged scenes behind ?shot=cover|approach|town|photorun. Each descriptor is a real moment of
// play frozen for the camera — a mission in progress, the flight state set by hand, the HUD
// showing that moment's numbers. Nothing is drawn here that the game does not draw in play.

export const STAGED_SHOTS = {
  // Cover: chase view sixty metres out from the second Ring Run ring, the torus centred ahead
  // of the nose, the low sun whole in clear sky between the panels; Palma's coast at left.
  cover: {
    mission: 1, ringIndex: 1, score: 150, time: 41,
    fuel: 88, hull: 100, camera: 'chase',
    pos: [142, 215, -774], headingDeg: 103, pitchDeg: -1, bankDeg: 5, speed: 58, throttle: 0.75,
  },
  // Cockpit on short final to Farrel Isle: the strip dead ahead over the water, panel lit.
  approach: {
    mission: 2, ringIndex: 0, score: 0, time: 192,
    fuel: 57, hull: 100, camera: 'cockpit',
    pos: [1496, 232, 827], headingDeg: 155, pitchDeg: -8, bankDeg: 0, speed: 30, throttle: 0.28,
  },
  // Banking over Port Aurelia with the next ring ahead and Cindera on the horizon — flown in
  // the charcoal-and-orange Comet, so the hangar's variety rides in the frame.
  town: {
    mission: 1, ringIndex: 6, score: 900, time: 164,
    fuel: 74, hull: 100, camera: 'chase', plane: 'comet',
    pos: [-3050, 300, -150], headingDeg: 72, pitchDeg: 1, bankDeg: 24, speed: 63, throttle: 0.8,
  },
  // Harbor Photo Run on the last frame: two photos are already in the pouch (photoScores are
  // the game's own scoring for the first two gates' crossings; main.js pins both thumbnails
  // from real renders of them), and the plane sits low on the third gate's axis.
  photorun: {
    mission: 4, ringIndex: 0, gateIndex: 2, score: 800, time: 150,
    fuel: 64, hull: 100, camera: 'chase',
    photoAlt: 30, photoScores: [380, 420],
    pos: [-2937, 26, -763], headingDeg: 49.5, pitchDeg: -3, bankDeg: -6, speed: 44, throttle: 0.5,
  },
};

/** The descriptor for a shot name, or null when the name is not one of ours. */
export function describeShot(name) {
  return Object.prototype.hasOwnProperty.call(STAGED_SHOTS, name) ? STAGED_SHOTS[name] : null;
}
