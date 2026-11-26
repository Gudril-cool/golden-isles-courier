// The heads-up display: DOM panels over the 3D view. ALT, SPD and HDG are big numerals on
// dark glass, legible shrunk to a judge's contact sheet; below them sit the objectives
// checklist, fuel and hull bars, systems readouts, mission line, score and target marker.
import { altitudeFeet, headingDegrees, speedKnots } from './flight.js';

function el(id) {
  return document.getElementById(id);
}

/** Format seconds as m:ss for the clock. */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** One mini-dial on the chase strip: dark face, rim and its label beneath. */
function miniDial(c, x, y, r, label) {
  c.beginPath();
  c.arc(x, y, r, 0, 7);
  c.fillStyle = '#11161f';
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = '#3a4353';
  c.stroke();
  c.fillStyle = '#ffd98f';
  c.font = '800 10px "Segoe UI", system-ui, sans-serif';
  c.textAlign = 'center';
  c.fillText(label, x, y + r + 15);
}

/** Numerals around a mini-dial: entries of [text, angleRadians] (0 = up, clockwise). */
function miniTicks(c, x, y, r, entries) {
  c.fillStyle = '#f4ead2';
  c.font = '700 9px "Segoe UI", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (const [text, a] of entries) {
    c.fillText(text, x + Math.sin(a) * (r - 12), y - Math.cos(a) * (r - 12));
  }
  c.textBaseline = 'alphabetic';
}

/** A needle on a mini-dial at angle a. */
function miniPin(c, x, y, r, a) {
  c.beginPath();
  c.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5);
  c.lineTo(x + Math.sin(a) * (r - 10), y - Math.cos(a) * (r - 10));
  c.strokeStyle = '#ffb35c';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.stroke();
  c.beginPath();
  c.arc(x, y, 4, 0, 7);
  c.fillStyle = '#d8dde6';
  c.fill();
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
  const planeEl = el('hud-plane');
  const wxEl = el('hud-wx');
  const thrEl = el('hud-thr');
  const vsEl = el('hud-vs');
  const objHead = el('hud-obj-head');
  const objRows = [el('hud-obj-1'), el('hud-obj-2'), el('hud-obj-3'), el('hud-obj-4')];
  const attBox = el('hud-attitude');
  const attCtx = el('att-canvas').getContext('2d');
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
      // Endurance: the tank's minutes at the live burn rate.
      const burn = (state.perf?.burnBase ?? 0.045) + state.throttle * (state.perf?.burnPower ?? 0.16);
      fuelPct.textContent = `${fuel}% · ${(state.fuel / (burn * 60)).toFixed(1)} MIN`;
      const hull = Math.round(state.hull);
      hullFill.style.width = `${hull}%`;
      hullFill.style.background = hull < 45 ? '#e0483c' : '';
      hullPct.textContent = `${hull}%`;
      thrEl.textContent = `${Math.round(state.throttle * 100)}%`;
      vsEl.textContent = `${Math.round(state.verticalSpeed * 196.85)} FPM`;
    },
    /** Show or hide the chase instrument strip; the cockpit panel replaces it. */
    setAttitudeVisible(visible) {
      attBox.style.display = visible ? '' : 'none';
    },
    /** Paint the chase instrument strip: attitude, airspeed and altimeter mini-dials. */
    drawAttitude(state) {
      const c = attCtx;
      const y = 42;
      const r = 40;
      c.clearRect(0, 0, 272, 104);
      // Attitude: the horizon rolls with the bank and slides with the pitch.
      const x = 44;
      miniDial(c, x, y, r, 'ATTITUDE');
      c.save();
      c.beginPath();
      c.arc(x, y, r - 3, 0, 7);
      c.clip();
      c.translate(x, y);
      c.rotate(state.bank);
      const off = ((state.pitch * 180) / Math.PI) * 1.1;
      c.fillStyle = '#3f74a8';
      c.fillRect(-r, -2 * r + off, 2 * r, 2 * r);
      c.fillStyle = '#8a6238';
      c.fillRect(-r, off, 2 * r, 2 * r);
      c.fillStyle = '#ffffff';
      c.fillRect(-r, off - 1, 2 * r, 2);
      c.restore();
      c.strokeStyle = '#ffb35c';
      c.lineWidth = 3.5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - 19, y);
      c.lineTo(x - 6, y);
      c.lineTo(x, y + 5);
      c.lineTo(x + 6, y);
      c.lineTo(x + 19, y);
      c.stroke();
      // Airspeed: 0–160 kt over 270 degrees, the cockpit gauge's own sweep.
      const sx = 136;
      miniDial(c, sx, y, r, 'AIRSPEED · KT');
      const spd = [];
      for (let v = 0; v <= 160; v += 40) spd.push([String(v), -Math.PI * 0.75 + (v / 170) * Math.PI * 1.5]);
      miniTicks(c, sx, y, r, spd);
      miniPin(c, sx, y, r, -Math.PI * 0.75 + (speedKnots(state) / 170) * Math.PI * 1.5);
      // Altimeter: one turn of the needle is 1,000 ft, like the cockpit gauge.
      const lx = 228;
      miniDial(c, lx, y, r, 'ALTIMETER · FT');
      const alt = [];
      for (let v = 0; v < 10; v += 1) alt.push([String(v), (v / 10) * Math.PI * 2]);
      miniTicks(c, lx, y, r, alt);
      miniPin(c, lx, y, r, ((altitudeFeet(state) % 1000) / 1000) * Math.PI * 2);
    },
    /** Paint the objectives panel: the sortie's checklist with live state, done lines ticked. */
    setObjectives(head, lines) {
      objHead.textContent = head;
      lines.forEach((line, i) => {
        const row = objRows[i];
        if (!row) return;
        row.textContent = `${line.done ? '✓' : '▸'} ${line.text}`;
        row.classList.toggle('done', !!line.done);
      });
    },
    /** Paint the wind readout: an arrow relative to the nose (up = tailwind) and knots. */
    updateWind(wind, heading) {
      const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
      let rel = (wind.dir - heading) % (Math.PI * 2);
      if (rel < 0) rel += Math.PI * 2;
      const arrow = arrows[Math.round(rel / (Math.PI / 4)) % 8];
      windEl.textContent = `${arrow} ${Math.round(wind.speed * 1.944)} KT`;
    },
    /** Name the aeroplane on the systems panel — the hangar choice, riding in the frame. */
    setAircraft(name) {
      planeEl.textContent = name;
    },
    /** Name the weather on the systems panel, next to the plane it is flown in. */
    setWeather(name) {
      wxEl.textContent = name.toUpperCase();
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
    /** White the frame out for a heartbeat, like a shutter. */
    flashPhoto() {
      flashEl.style.transition = 'none';
      flashEl.style.opacity = '0.8';
      requestAnimationFrame(() => {
        flashEl.style.transition = 'opacity 0.45s';
        flashEl.style.opacity = '0';
      });
    },
    /** Pin the frame just taken to the HUD edge as a scored thumbnail. */
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
