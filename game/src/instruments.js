import { altitudeFeet, headingDegrees, speedKnots } from './flight.js';
const FACE = '#11161f';
const RIM = '#3a4353';
const LIT = '#ffd98f';
const NEEDLE = '#ffb35c';
const INK = '#f4ead2';
function gaugeFace(ctx, x, y, r, label) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = FACE;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = RIM;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r - 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 201, 95, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = LIT;
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + r + 20);
}
function needle(ctx, x, y, r, a, color = NEEDLE) {
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7);
  ctx.lineTo(x + Math.sin(a) * (r - 12), y - Math.cos(a) * (r - 12));
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#d8dde6';
  ctx.fill();
}
function ticks(ctx, x, y, r, entries, fontSize = 15) {
  ctx.fillStyle = INK;
  ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [text, a] of entries) {
    ctx.fillText(text, x + Math.sin(a) * (r - 24), y - Math.cos(a) * (r - 24));
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * (r - 9), y - Math.cos(a) * (r - 9));
    ctx.lineTo(x + Math.sin(a) * (r - 3), y - Math.cos(a) * (r - 3));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.textBaseline = 'alphabetic';
}
export function createInstruments(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  return {
    setVisible(visible) {
      canvas.style.display = visible ? 'block' : 'none';
    },
    draw(state) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#171c26';
      ctx.beginPath();
      ctx.roundRect(6, 26, W - 12, H - 26, 18);
      ctx.fill();
      ctx.fillStyle = '#0b0e14';
      ctx.beginPath();
      ctx.roundRect(6, 26, W - 12, 34, 16);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 179, 92, 0.5)';
      ctx.fillRect(24, 58, W - 48, 2);
      const y = 148;
      const r = 76;
      const ax = 128;
      gaugeFace(ctx, ax, y, r, 'ATTITUDE');
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax, y, r - 6, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(ax, y);
      ctx.rotate(state.bank);
      const offset = (state.pitch * 180) / Math.PI * 1.6;
      ctx.fillStyle = '#3f74a8';
      ctx.fillRect(-r, -r * 2 + offset, r * 2, r * 2);
      ctx.fillStyle = '#8a6238';
      ctx.fillRect(-r, offset, r * 2, r * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-r, offset - 1.5, r * 2, 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      for (const deg of [-20, -10, 10, 20]) {
        const ly = offset + deg * 1.6;
        ctx.beginPath();
        ctx.moveTo(deg % 20 === 0 ? -22 : -14, ly);
        ctx.lineTo(deg % 20 === 0 ? 22 : 14, ly);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = NEEDLE;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ax - 30, y);
      ctx.lineTo(ax - 8, y);
      ctx.lineTo(ax, y + 7);
      ctx.lineTo(ax + 8, y);
      ctx.lineTo(ax + 30, y);
      ctx.stroke();
      const sx = 322;
      gaugeFace(ctx, sx, y, r, 'AIRSPEED · KT');
      const spdEntries = [];
      for (let v = 0; v <= 160; v += 20) spdEntries.push([String(v), -Math.PI * 0.75 + (v / 170) * Math.PI * 1.5]);
      ticks(ctx, sx, y, r, spdEntries, 14);
      needle(ctx, sx, y, r, -Math.PI * 0.75 + (speedKnots(state) / 170) * Math.PI * 1.5);
      const lx = 516;
      gaugeFace(ctx, lx, y, r, 'ALTIMETER · FT');
      const altEntries = [];
      for (let v = 0; v < 10; v += 1) altEntries.push([String(v), (v / 10) * Math.PI * 2]);
      ticks(ctx, lx, y, r, altEntries, 16);
      needle(ctx, lx, y, r, ((altitudeFeet(state) % 1000) / 1000) * Math.PI * 2);
      ctx.fillStyle = '#05070a';
      ctx.fillRect(lx - 34, y + 22, 68, 24);
      ctx.fillStyle = LIT;
      ctx.font = '800 17px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(Math.round(altitudeFeet(state))), lx, y + 40);
      const cx = 710;
      gaugeFace(ctx, cx, y, r, 'HEADING');
      const hdg = headingDegrees(state);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, y, r - 6, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = INK;
      ctx.font = '800 17px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let deg = 0; deg < 360; deg += 30) {
        const a = ((deg - hdg) * Math.PI) / 180;
        const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg / 10);
        ctx.fillStyle = deg % 90 === 0 ? LIT : INK;
        ctx.fillText(label, cx + Math.sin(a) * (r - 26), y - Math.cos(a) * (r - 26));
      }
      ctx.restore();
      ctx.textBaseline = 'alphabetic';
      ctx.strokeStyle = NEEDLE;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, y - r + 4);
      ctx.lineTo(cx, y - r + 20);
      ctx.stroke();
      const tx = 806;
      ctx.fillStyle = LIT;
      ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('THR', tx, y - 52);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(tx, y - 44, 52, 12);
      ctx.fillStyle = '#ffb35c';
      ctx.fillRect(tx, y - 44, 52 * state.throttle, 12);
      ctx.fillStyle = LIT;
      ctx.fillText('VS FPM', tx - 6, y + 6);
      ctx.fillStyle = INK;
      ctx.font = '800 19px "Segoe UI", system-ui, sans-serif';
      const fpm = Math.round(state.verticalSpeed * 196.85);
      ctx.fillText(`${fpm > 0 ? '+' : ''}${fpm}`, tx - 6, y + 30);
      ctx.fillStyle = state.stalled ? '#ff5a4c' : LIT;
      ctx.font = '800 16px "Segoe UI", system-ui, sans-serif';
      if (state.stalled) ctx.fillText('STALL', tx - 6, y + 58);
      ctx.fillStyle = LIT;
      ctx.font = '700 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('FUEL', tx, y + 62);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(tx, y + 70, 52, 12);
      ctx.fillStyle = state.fuel < 22 ? '#e0483c' : '#ffb35c';
      ctx.fillRect(tx, y + 70, 52 * (state.fuel / 100), 12);
    },
  };
}
