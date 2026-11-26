// The isles chart: a small north-up map in the HUD's corner, drawn on a 2D canvas from the
// world's own geography — every island, the volcano, both strips to scale, Port Aurelia, the
// shore village and the lighthouse as marks, the courier as a white arrow on her heading,
// and the mission's current target ringed in gold.
import { ISLANDS, LANDMARKS } from './world.js';

const EXTENT = 4900; // metres from the chart's centre to its edge, matching the world

/**
 * Create the chart on its canvas. draw(flight, target) repaints it: cheap 2D work at this
 * size, called once a frame in play and once for a staged frame.
 */
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
    // The isles: a sand rim and a green heart for every bump in the height function.
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
    // Mount Cindera: a dark cone with its ember heart.
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
    // The strips, drawn along their true headings.
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
    // The settlements and the light: gold for the town, paler marks for the rest.
    ctx.fillStyle = '#ffd98f';
    ctx.fillRect(px(LANDMARKS.town.x) - 2.5, py(LANDMARKS.town.z) - 2.5, 5, 5);
    ctx.beginPath();
    ctx.arc(px(LANDMARKS.village.x), py(LANDMARKS.village.z), 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px(LANDMARKS.lighthouse.x), py(LANDMARKS.lighthouse.z), 2, 0, Math.PI * 2);
    ctx.fill();
    // The mission's target, ringed.
    if (target) {
      ctx.strokeStyle = '#ffd23e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(px(target.x), py(target.z), 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The courier: a white arrow on her heading.
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
