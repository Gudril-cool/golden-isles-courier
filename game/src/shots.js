// The staged scenes behind ?shot=cover|approach|town|photorun. Each descriptor is a real moment of
// play frozen for the camera — a mission in progress, the flight state set by hand, the HUD
// showing that moment's numbers — and main.js poses the aircraft, aims the camera and renders
// the game's own frame. Nothing is drawn here that the game does not draw in play.

export const STAGED_SHOTS = {
  // Cover: chase view on the second Ring Run ring's own axis, sixty metres out, so the glowing
  // torus fills the frame ahead of the nose; Palma's east coast fills the left of the frame,
  // the sun low over the sea and East Islet on the horizon.
  cover: {
    mission: 1, ringIndex: 1, score: 150, time: 41,
    fuel: 88, hull: 100, camera: 'chase',
    pos: [149, 215, -791], headingDeg: 121, pitchDeg: -1, bankDeg: 5, speed: 58, throttle: 0.75,
  },
  // Cockpit on short final to Farrel Isle: the strip dead ahead over the water, panel lit.
  approach: {
    mission: 2, ringIndex: 0, score: 0, time: 192,
    fuel: 57, hull: 100, camera: 'cockpit',
    pos: [1496, 232, 827], headingDeg: 155, pitchDeg: -8, bankDeg: 0, speed: 30, throttle: 0.28,
  },
  // Banking over Port Aurelia with the next ring ahead and Cindera on the horizon.
  town: {
    mission: 1, ringIndex: 6, score: 900, time: 164,
    fuel: 74, hull: 100, camera: 'chase',
    pos: [-3050, 300, -150], headingDeg: 72, pitchDeg: 1, bankDeg: 24, speed: 63, throttle: 0.8,
  },
  // Harbor Photo Run, lining up on the last frame: two harbour photos are already in the
  // pouch — photoScores are what the game's own scoring pays for the crossings of the first
  // two gates at photoAlt metres (120 base + up to 230 centred + up to 150 low), and main.js
  // pins both thumbnails from real renders of those crossings — while the aeroplane sits low
  // on the third gate's own axis, fifty-two metres out, looking north-east into the sun so
  // the sea shines, the post-and-beam frame large ahead and the big coaster at anchor
  // filling the right of the frame.
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
