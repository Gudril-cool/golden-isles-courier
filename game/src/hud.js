// The heads-up display: DOM panels over the 3D view. ALT, SPD and HDG are big tabular numerals
// on dark glass so they still read when the whole frame is shrunk to a judge's contact sheet;
// below them sit the fuel and hull bars, the mission line, the score, a centre message that
// flashes landings and warnings, and a diamond marker that points at the next objective. On the
// right edge hangs the photo strip: on the Harbor Photo Run, every frame the pilot snaps is
// pinned there as a thumbnail of the game's own canvas, with the points it earned.
import { altitudeFeet, headingDegrees, speedKnots } from './flight.js';

function el(id) {
  return document.getElementById(id);
}

/** Format seconds as m:ss for the clock. */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Create the HUD writer; update it every frame, flash messages as events happen. */
export function createHud() {
  const alt = el('hud-alt');
  const spd = el('hud-spd');
  const hdg = el('hud-hdg');
  const score = el('hud-score-value');
  const time = el('hud-time');
  const missionName = el('hud-mission-name');
  const missionGoal = el('hud-mission-goal');
  const fuelFill = el('fuel-fill');
  const fuelPct = el('hud-fuel-pct');
  const hullFill = el('hull-fill');
  const hullPct = el('hud-hull-pct');
  const message = el('hud-message');
  const marker = el('hud-marker');
  const markerDist = el('hud-marker-dist');
  const photoStrip = el('hud-photos');
  const flashEl = el('hud-flash');
  const windEl = el('hud-wind');
  let messageUntil = 0;

  return {
    /** Paint the flight numbers and bars from the flight state. */
    updateFlight(state) {
      alt.textContent = String(Math.round(altitudeFeet(state)));
      spd.textContent = String(Math.round(speedKnots(state)));
      hdg.textContent = String(headingDegrees(state)).padStart(3, '0');
      const fuel = Math.round(state.fuel);
      fuelFill.style.width = `${fuel}%`;
      fuelFill.style.background = fuel < 22 ? '#e0483c' : '';
      fuelPct.textContent = `${fuel}%`;
      const hull = Math.round(state.hull);
      hullFill.style.width = `${hull}%`;
      hullFill.style.background = hull < 45 ? '#e0483c' : '';
      hullPct.textContent = `${hull}%`;
    },
    /**
     * Paint the wind readout in the systems panel: an arrow for where the wind blows
     * relative to the nose (up = a tailwind, pushing you along) and its strength in knots.
     * The ALT/SPD/HDG block is not touched — this lives with fuel and hull.
     */
    updateWind(wind, heading) {
      const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
      let rel = (wind.dir - heading) % (Math.PI * 2);
      if (rel < 0) rel += Math.PI * 2;
      const arrow = arrows[Math.round(rel / (Math.PI / 4)) % 8];
      windEl.textContent = `${arrow} ${Math.round(wind.speed * 1.944)} KT`;
    },
    /** Paint the score and mission clock. */
    updateScore(value, seconds) {
      score.textContent = String(Math.round(value));
      time.textContent = formatTime(seconds);
    },
    /** Set the mission banner: the sortie's name and its current goal in plain words. */
    setMission(name, goal) {
      missionName.textContent = name;
      missionGoal.textContent = goal;
    },
    /** Flash a centre-screen message ("RING 3/8 +150", "SMOOTH LANDING", "STALL"). */
    flash(text, seconds = 1.6) {
      message.textContent = text;
      message.style.opacity = '1';
      messageUntil = performance.now() + seconds * 1000;
    },
    /** White the frame out for a heartbeat, the way a shutter feels from the cockpit. */
    flashPhoto() {
      flashEl.style.transition = 'none';
      flashEl.style.opacity = '0.8';
      requestAnimationFrame(() => {
        flashEl.style.transition = 'opacity 0.45s';
        flashEl.style.opacity = '0';
      });
    },
    /** Pin the frame just taken to the HUD edge: a thumbnail of the game's own canvas and its score. */
    addPhoto(points) {
      const shot = document.createElement('canvas');
      shot.width = 144;
      shot.height = 81;
      shot.getContext('2d').drawImage(el('scene'), 0, 0, shot.width, shot.height);
      const frame = document.createElement('div');
      frame.className = 'photo';
      frame.appendChild(shot);
      const tag = document.createElement('div');
      tag.className = 'photo-tag';
      tag.textContent = `+${points}`;
      frame.appendChild(tag);
      photoStrip.appendChild(frame);
    },
    /** Clear the photo strip when a new sortie begins. */
    clearPhotos() {
      photoStrip.innerHTML = '';
    },
    /** Keep the flash timer honest; call every frame. */
    tick() {
      if (message.style.opacity !== '0' && performance.now() > messageUntil) message.style.opacity = '0';
    },
    /** Place the objective marker at a screen position (pixels), or hide it with null. */
    setMarker(x, y, distText) {
      if (x === null) {
        marker.style.display = 'none';
        return;
      }
      marker.style.display = 'block';
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;
      markerDist.textContent = distText;
    },
  };
}
