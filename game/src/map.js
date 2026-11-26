import { ISLANDS, LANDMARKS } from './world.js';
const EXTENT = 4900;
export function createMap(canvas, world) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const px = (x) => ((x + EXTENT) / (EXTENT * 2)) * W;
  const py = (z) => ((z + EXTENT) / (EXTENT * 2)) * H;
  const scale = W / (EXTENT * 2);
  function draw(flight, target) {
    ctx.fillStyle = '#123c4e';
    ctx.fillRect(0, 0, W, H);
    for (const island of ISLANDS) {
      const r = island.spread * 1.72 * scale;
      ctx.fillStyle = '#d9b878';
      ctx.beginPath();
      ctx.arc(px(island.x), py(island.z), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5d8a44';
      ctx.beginPath();
      ctx.arc(px(island.x), py(island.z), r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    const c = LANDMARKS.cindera;
    ctx.fillStyle = '#4c423a';
    ctx.beginPath();
    ctx.moveTo(px(c.x) - 9, py(c.z) + 6);
    ctx.lineTo(px(c.x), py(c.z) - 9);
    ctx.lineTo(px(c.x) + 9, py(c.z) + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff7a2e';
    ctx.beginPath();
    ctx.arc(px(c.x), py(c.z) - 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2ede2';
    ctx.lineWidth = 1.6;
    for (const runway of world.runways) {
      const rad = (runway.headingDeg * Math.PI) / 180;
      const dx = Math.sin(rad) * (runway.length / 2);
      const dz = -Math.cos(rad) * (runway.length / 2);
      ctx.beginPath();
      ctx.moveTo(px(runway.x - dx), py(runway.z - dz));
      ctx.lineTo(px(runway.x + dx), py(runway.z + dz));
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd98f';
    ctx.fillRect(px(LANDMARKS.town.x) - 2.5, py(LANDMARKS.town.z) - 2.5, 5, 5);
    ctx.beginPath();
    ctx.arc(px(LANDMARKS.village.x), py(LANDMARKS.village.z), 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px(LANDMARKS.lighthouse.x), py(LANDMARKS.lighthouse.z), 2, 0, Math.PI * 2);
    ctx.fill();
    if (target) {
      ctx.strokeStyle = '#ffd23e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(px(target.x), py(target.z), 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(px(flight.pos.x), py(flight.pos.z));
    ctx.rotate(flight.heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 2.4);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  return { draw };
}
