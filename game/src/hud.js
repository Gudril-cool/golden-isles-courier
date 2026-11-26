import { altitudeFeet, headingDegrees, speedKnots, thrustLoss, dragGain } from './flight.js';
function el(id) {
  return document.getElementById(id);
}
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
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
  const objRows = Array.from({ length: 8 }, (_, i) => el(`hud-obj-${i + 1}`));
  const attBox = el('hud-attitude');
  const attCtx = el('att-canvas').getContext('2d');
  const engEl = el('hud-wear-eng');
  const propEl = el('hud-wear-prop');
  const airEl = el('hud-airframe');
  const radioEl = el('hud-radio');
  const decisionEl = el('hud-decision');
  const advisoryEl = el('hud-advisory');
  const tapeBoxes = [el('hud-tape-hdg'), el('hud-tape-spd'), el('hud-tape-alt')];
  const tapeHdg = el('tape-hdg').getContext('2d');
  const tapeSpd = el('tape-spd').getContext('2d');
  const tapeAlt = el('tape-alt').getContext('2d');
  let messageUntil = 0;
  let lastRadio = '';
  return {
    updateFlight(state) {
      alt.textContent = String(Math.round(altitudeFeet(state)));
      spd.textContent = String(Math.round(speedKnots(state)));
      hdg.textContent = String(headingDegrees(state)).padStart(3, '0');
      const fuel = Math.round(state.fuel);
      fuelFill.style.width = `${fuel}%`;
      fuelFill.style.background = fuel < 22 ? '#e0483c' : '';
      const burn = (state.perf?.burnBase ?? 0.045) + state.throttle * (state.perf?.burnPower ?? 0.16);
      fuelPct.textContent = `${fuel}% · ${(state.fuel / (burn * 60)).toFixed(1)} MIN`;
      const hull = Math.round(state.hull);
      hullFill.style.width = `${hull}%`;
      hullFill.style.background = hull < 45 ? '#e0483c' : '';
      hullPct.textContent = `${hull}%`;
      thrEl.textContent = `${Math.round(state.throttle * 100)}%`;
      vsEl.textContent = `${Math.round(state.verticalSpeed * 196.85)} FPM`;
      const engC = 100 - Math.round(state.wearEngine);
      const propC = 100 - Math.round(state.wearProp);
      engEl.textContent = `${engC}%${state.wearEngine >= 60 ? ' WORN' : ''} · THRUST −${thrustLoss(state)}%`;
      engEl.style.color = state.wearEngine >= 60 ? '#ff9a8a' : '';
      propEl.textContent = `${propC}%${state.wearProp >= 60 ? ' WORN' : ''} · DRAG +${dragGain(state)}%`;
      propEl.style.color = state.wearProp >= 60 ? '#ff9a8a' : '';
      airEl.textContent = `${Math.round(0.5 * hull + 0.25 * engC + 0.25 * propC)}%`;
    },
    setAttitudeVisible(visible) {
      attBox.style.display = visible ? '' : 'none';
      for (const box of tapeBoxes) box.style.display = visible ? '' : 'none';
    },
    setRadio(text) {
      if (text === lastRadio) return;
      lastRadio = text;
      radioEl.textContent = text;
    },
    setDecision(visible) {
      decisionEl.style.display = visible ? '' : 'none';
    },
    setAdvisory(text) {
      advisoryEl.style.display = text ? '' : 'none';
      advisoryEl.textContent = text;
    },
    drawTapes(state) {
      const cream = '#f4ead2';
      const amber = '#ffb35c';
      let c = tapeHdg;
      c.clearRect(0, 0, 360, 36);
      const hdg = headingDegrees(state);
      c.fillStyle = cream;
      c.font = '700 11px "Segoe UI", system-ui, sans-serif';
      c.textAlign = 'center';
      for (let off = -60; off <= 60; off += 10) {
        const deg = ((hdg + off) % 360 + 360) % 360;
        const x = 180 + off * 3;
        c.fillRect(x - 0.5, off % 30 === 0 ? 2 : 7, 1, off % 30 === 0 ? 9 : 5);
        if (off % 30 === 0 && off !== 0) {
          const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg / 10);
          c.fillText(label, x, 24);
        }
      }
      c.fillStyle = amber;
      c.beginPath();
      c.moveTo(174, 30);
      c.lineTo(186, 30);
      c.lineTo(180, 36);
      c.fill();
      c.font = '800 12px "Segoe UI", system-ui, sans-serif';
      c.fillText(String(hdg).padStart(3, '0'), 180, 13);
      const tape = (ctx, value, pxPer, step, labelEvery, fmt) => {
        ctx.clearRect(0, 0, 56, 220);
        ctx.fillStyle = cream;
        ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'left';
        const first = Math.ceil((value - 100 / pxPer) / step) * step;
        for (let v = first; v <= value + 100 / pxPer; v += step) {
          const y = 110 - (v - value) * pxPer;
          if (y < 4 || y > 216 || v < 0) continue;
          ctx.fillRect(0, y - 0.5, v % labelEvery === 0 ? 10 : 6, 1);
          if (v % labelEvery === 0 && Math.abs(v - value) >= labelEvery / 2) ctx.fillText(fmt(v), 13, y + 3);
        }
        ctx.fillStyle = amber;
        ctx.fillRect(0, 109, 14, 2);
        ctx.font = '800 12px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(fmt(Math.round(value)), 16, 114);
      };
      tape(tapeSpd, speedKnots(state), 2.2, 10, 20, (v) => String(Math.max(0, v)));
      tape(tapeAlt, altitudeFeet(state), 0.55, 50, 100, (v) => String(Math.max(0, v)));
    },
    drawAttitude(state) {
      const c = attCtx;
      const y = 46;
      const r = 36;
      c.clearRect(0, 0, 660, 112);
      const sweep = (v, max) => -Math.PI * 0.75 + (v / max) * Math.PI * 1.5;
      let x = 48;
      miniDial(c, x, y, r, 'AIRSPEED · KT');
      const spd = [];
      for (let v = 0; v <= 160; v += 40) spd.push([String(v), sweep(v, 170)]);
      miniTicks(c, x, y, r, spd);
      miniPin(c, x, y, r, sweep(speedKnots(state), 170));
      x = 144;
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
      x = 240;
      miniDial(c, x, y, r, 'ALTIMETER · FT');
      const alt = [];
      for (let v = 0; v < 10; v += 1) alt.push([String(v), (v / 10) * Math.PI * 2]);
      miniTicks(c, x, y, r, alt);
      miniPin(c, x, y, r, ((altitudeFeet(state) % 1000) / 1000) * Math.PI * 2);
      x = 336;
      miniDial(c, x, y, r, 'TURN');
      c.save();
      c.translate(x, y);
      c.rotate(state.bank * 0.8);
      c.strokeStyle = '#f4ead2';
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-17, -2);
      c.lineTo(17, -2);
      c.moveTo(0, -2);
      c.lineTo(0, 7);
      c.stroke();
      c.restore();
      c.fillStyle = '#f4ead2';
      for (const bx of [-20, 20]) c.fillRect(x + bx - 1, y - 24, 2, 7);
      const ballX = x + Math.max(-17, Math.min(17, -state.bank * 26));
      c.beginPath();
      c.arc(ballX, y + 19, 5.5, 0, 7);
      c.fillStyle = '#ffb35c';
      c.fill();
      x = 432;
      miniDial(c, x, y, r, 'HEADING');
      const hdg = headingDegrees(state);
      const rose = [];
      for (let d = 0; d < 360; d += 30) {
        const rel = ((d - hdg + 540) % 360) - 180;
        if (Math.abs(rel) > 105) continue;
        const label = d === 0 ? 'N' : d === 90 ? 'E' : d === 180 ? 'S' : d === 270 ? 'W' : String(d / 10);
        rose.push([label, (rel * Math.PI) / 180]);
      }
      miniTicks(c, x, y, r, rose);
      c.fillStyle = '#ffb35c';
      c.beginPath();
      c.moveTo(x - 5, y - r + 4);
      c.lineTo(x + 5, y - r + 4);
      c.lineTo(x, y - r + 12);
      c.fill();
      x = 528;
      miniDial(c, x, y, r, 'VERT SPEED');
      const vsTicks = [];
      for (let v = -2000; v <= 2000; v += 1000) vsTicks.push([v === 0 ? '0' : String(v / 1000), -Math.PI * 0.75 + ((v + 2000) / 4000) * Math.PI * 1.5]);
      miniTicks(c, x, y, r, vsTicks);
      const fpm = Math.max(-2000, Math.min(2000, state.verticalSpeed * 196.85));
      miniPin(c, x, y, r, -Math.PI * 0.75 + ((fpm + 2000) / 4000) * Math.PI * 1.5);
      const fx = 588;
      c.fillStyle = '#ffd98f';
      c.font = '800 10px "Segoe UI", system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('FUEL', fx + 26, 14);
      c.strokeStyle = '#3a4353';
      c.lineWidth = 2.5;
      c.strokeRect(fx, 20, 52, 62);
      const fh = (Math.max(0, state.fuel) / 100) * 58;
      c.fillStyle = state.fuel < 22 ? '#e0483c' : '#ffb35c';
      c.fillRect(fx + 3, 23 + (58 - fh), 46, fh);
      c.fillStyle = '#f4ead2';
      c.font = '800 13px "Segoe UI", system-ui, sans-serif';
      c.fillText(`${Math.round(state.fuel)}%`, fx + 26, 99);
    },
    setObjectives(head, lines) {
      objHead.textContent = head;
      objRows.forEach((row, i) => {
        if (!row) return;
        const line = lines[i];
        row.style.display = line ? '' : 'none';
        if (!line) return;
        row.textContent = `${line.done ? '✓' : '▸'} ${line.text}`;
        row.classList.toggle('done', !!line.done);
      });
    },
    updateWind(wind, heading) {
      const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
      let rel = (wind.dir - heading) % (Math.PI * 2);
      if (rel < 0) rel += Math.PI * 2;
      const arrow = arrows[Math.round(rel / (Math.PI / 4)) % 8];
      windEl.textContent = `${arrow} ${Math.round(wind.speed * 1.944)} KT`;
    },
    setAircraft(name) {
      planeEl.textContent = name;
    },
    setWeather(name) {
      wxEl.textContent = name.toUpperCase();
    },
    updateScore(value, seconds) {
      score.textContent = String(Math.round(value));
      time.textContent = formatTime(seconds);
    },
    setMission(name, goal) {
      missionName.textContent = name;
      missionGoal.textContent = goal;
    },
    flash(text, seconds = 1.6) {
      message.textContent = text;
      message.style.opacity = '1';
      messageUntil = performance.now() + seconds * 1000;
    },
    flashPhoto() {
      flashEl.style.transition = 'none';
      flashEl.style.opacity = '0.8';
      requestAnimationFrame(() => {
        flashEl.style.transition = 'opacity 0.45s';
        flashEl.style.opacity = '0';
      });
    },
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
    clearPhotos() {
      photoStrip.innerHTML = '';
    },
    tick() {
      if (message.style.opacity !== '0' && performance.now() > messageUntil) message.style.opacity = '0';
    },
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
