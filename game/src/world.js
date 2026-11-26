// The Aurelia Isles: a seeded, golden-hour archipelago. One analytic height function grows
// the terrain, places every building and tree, and answers the flight model's ground queries.
import * as THREE from 'three';
import { createRandom, randomRange } from './random.js';

/** Island bumps: centre, gaussian height and spread, in metres. */
export const ISLANDS = [
  { name: 'Palma', x: -1500, z: -800, height: 150, spread: 620 },
  { name: 'Cindera', x: 1600, z: -1700, height: 90, spread: 560 },
  { name: 'Farrel Isle', x: 1800, z: 1600, height: 110, spread: 500 },
  { name: 'Kite Islet', x: 300, z: 2300, height: 45, spread: 240 },
  { name: 'Gull Rock', x: -2400, z: 1300, height: 60, spread: 260 },
  { name: 'Ember Islet', x: 500, z: -2600, height: 70, spread: 300 },
  { name: 'Near Islet', x: -350, z: 250, height: 26, spread: 150 },
  { name: 'East Islet', x: 2900, z: 250, height: 40, spread: 220 },
  { name: 'Far West Islet', x: -2900, z: -2200, height: 50, spread: 260 },
];

/** Landmarks the missions and the camera care about. */
export const LANDMARKS = {
  palma: { x: -1500, z: -800 },
  cindera: { x: 1600, z: -1700, peak: 470 },
  farrel: { x: 1800, z: 1600 },
  town: { x: -2550, z: -550 },
  lighthouse: { x: -2680, z: -500 },
  village: { x: -2350, z: 60 },
};

/** Palma's dirt roads as waypoint paths: town to field, town to pier, shore to village. */
export const ROAD_PATHS = [
  [[-2560, -560], [-2450, -600], [-2200, -680], [-1950, -760], [-1750, -880], [-1640, -1020]],
  [[-2620, -520], [-2700, -490], [-2770, -455]],
  [[-2480, -470], [-2430, -260], [-2380, -60], [-2355, 40]],
];

/** Distance from a point to the nearest road path, in metres (for keeping scatters clear). */
function distToRoads(x, z) {
  let best = Infinity;
  for (const path of ROAD_PATHS) {
    for (let i = 0; i < path.length - 1; i += 1) {
      const [ax, az] = path[i];
      const [bx, bz] = path[i + 1];
      const abx = bx - ax;
      const abz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz)));
      best = Math.min(best, Math.hypot(x - (ax + abx * t), z - (az + abz * t)));
    }
  }
  return best;
}

/** The volcano's cone, added on top of its island bump. */
const VOLCANO = { x: 1600, z: -1700, radius: 800, height: 470, crater: 130 };

/** Runway strips: centre, compass heading of the strip direction, size. Elevation is filled in below. */
export const RUNWAYS = [
  { id: 'palma', name: 'Palma Field', x: -1250, z: -1020, headingDeg: 90, length: 780, width: 42, elev: 0 },
  { id: 'farrel', name: 'Farrel Strip', x: 1800, z: 1480, headingDeg: 155, length: 660, width: 38, elev: 0 },
];

const SEA_LEVEL = 0;
const SEA_BED = -14;

/** Height of the land before runway flattening: island bumps, the volcano cone and a breath of noise. */
function rawHeight(x, z) {
  let h = SEA_BED;
  for (const island of ISLANDS) {
    const dx = x - island.x;
    const dz = z - island.z;
    h += island.height * Math.exp(-(dx * dx + dz * dz) / (2 * island.spread * island.spread));
  }
  const dvx = x - VOLCANO.x;
  const dvz = z - VOLCANO.z;
  const dv = Math.hypot(dvx, dvz);
  if (dv < VOLCANO.radius) {
    let cone = VOLCANO.height * Math.pow(1 - dv / VOLCANO.radius, 1.3);
    if (dv < VOLCANO.crater) cone -= (1 - dv / VOLCANO.crater) * 95;
    h += cone;
  }
  if (h > 2) h += (Math.sin(x * 0.004) * Math.cos(z * 0.0035) + Math.sin((x + z) * 0.0016)) * 3.2;
  return h;
}

/** Local strip coordinates of a point: u along the strip, v across it. */
function runwayLocal(runway, x, z) {
  const rad = (runway.headingDeg * Math.PI) / 180;
  const dx = x - runway.x;
  const dz = z - runway.z;
  return { u: dx * Math.sin(rad) - dz * Math.cos(rad), v: dx * Math.cos(rad) + dz * Math.sin(rad) };
}

for (const runway of RUNWAYS) runway.elev = rawHeight(runway.x, runway.z);

/** The one height function: raw land with runway plateaus blended in; everything samples this. */
export function terrainHeight(x, z) {
  let h = rawHeight(x, z);
  for (const runway of RUNWAYS) {
    const { u, v } = runwayLocal(runway, x, z);
    const au = Math.abs(u);
    const av = Math.abs(v);
    const halfLen = runway.length / 2;
    const halfWid = runway.width / 2;
    if (au < halfLen + 170 && av < halfWid + 140) {
      const su = 1 - THREE.MathUtils.smoothstep(au, halfLen - 30, halfLen + 170);
      const sv = 1 - THREE.MathUtils.smoothstep(av, halfWid - 10, halfWid + 140);
      const s = Math.min(su, sv);
      h = h * (1 - s) + runway.elev * s;
    }
  }
  return h;
}

/** True when the point sits on a runway strip (used for landing judgement). */
export function onRunway(runway, x, z) {
  const { u, v } = runwayLocal(runway, x, z);
  return Math.abs(u) <= runway.length / 2 && Math.abs(v) <= runway.width / 2;
}

/** The runway record for an id, or null. */
export function getRunway(id) {
  return RUNWAYS.find((r) => r.id === id) ?? null;
}

/**
 * A building facade as two canvas textures: the diffuse map and a matching glow map —
 * black but for the lit windows — so lit windows shine at dusk.
 */
function facadeTexture(random, base, litRatio, style) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const glowCtx = glowCanvas.getContext('2d');
  glowCtx.fillStyle = '#000000';
  glowCtx.fillRect(0, 0, 256, 256);
  const litShades = ['#ffd98f', '#ffce6b', '#ffe9b0'];
  const window = (x, y, w, h) => {
    if (random() < litRatio) {
      const shade = litShades[Math.floor(random() * litShades.length)];
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, w, h);
      glowCtx.fillStyle = shade;
      glowCtx.fillRect(x, y, w, h);
    } else {
      ctx.fillStyle = 'rgba(26, 34, 48, 0.88)';
      ctx.fillRect(x, y, w, h);
    }
  };
  if (style === 'strips') {
    for (let row = 0; row < 9; row += 1) window(16, 12 + row * 27, 224, 11);
  } else {
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 6; col += 1) window(13 + col * 40, 9 + row * 30, 17, 19);
    }
  }
  ctx.fillStyle = 'rgba(60, 40, 25, 0.25)';
  ctx.fillRect(0, 240, 256, 16);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.CanvasTexture(glowCanvas);
  glow.colorSpace = THREE.SRGBColorSpace;
  return { map, glow };
}

/** A canvas texture for a runway: dark asphalt, threshold bars, dashes down the centreline. */
function runwayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#33373d';
  ctx.fillRect(0, 0, 1024, 64);
  ctx.fillStyle = '#e8e4da';
  ctx.fillRect(0, 3, 1024, 3);
  ctx.fillRect(0, 58, 1024, 3);
  for (const end of [18, 950]) {
    for (let i = 0; i < 4; i += 1) ctx.fillRect(end, 10 + i * 12, 56, 6);
  }
  for (let x = 130; x < 900; x += 64) ctx.fillRect(x, 29, 34, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** The gradient sky dome, sun baked into the shader, plus the sun's glow sprite. */
function buildSky(scene, sunDir) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(12000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        sunDirection: { value: sunDir.clone() },
        topColor: { value: new THREE.Color(0x2c5a8c) },
        horizonColor: { value: new THREE.Color(0xff9e57) },
        lowColor: { value: new THREE.Color(0xffe3ae) },
        sunColor: { value: new THREE.Color(0xffdca3) },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 sunDirection;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 lowColor;
        uniform vec3 sunColor;
        void main() {
          float h = clamp(vDir.y, -1.0, 1.0);
          vec3 col = h > 0.0
            ? mix(horizonColor, topColor, pow(smoothstep(0.0, 0.65, h), 0.8))
            : mix(horizonColor, lowColor, smoothstep(0.0, -0.2, h));
          float sunAmount = max(dot(normalize(vDir), normalize(sunDirection)), 0.0);
          col += sunColor * (pow(sunAmount, 220.0) * 1.4 + pow(sunAmount, 10.0) * 0.38);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(sky);
}

/** The terrain mesh: the height function on a grid, flat-shaded, coloured by height/slope. */
function buildTerrain(random) {
  const size = 9800;
  const segments = 190;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    position.setY(i, terrainHeight(position.getX(i), position.getZ(i)));
  }
  geometry.computeVertexNormals();
  const normal = geometry.attributes.normal;
  const colors = new Float32Array(position.count * 3);
  const palette = {
    sand: new THREE.Color(0xe3c184),
    grassLow: new THREE.Color(0x74a24b),
    grassHigh: new THREE.Color(0x4c7a38),
    rock: new THREE.Color(0x7d6c57),
    basalt: new THREE.Color(0x4c423a),
    ash: new THREE.Color(0x2f2721),
  };
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const slope = 1 - normal.getY(i);
    if (y < 3) color.copy(palette.sand);
    else if (y < 55) color.lerpColors(palette.grassLow, palette.grassHigh, y / 55);
    else color.lerpColors(palette.grassHigh, palette.rock, Math.min(1, (y - 55) / 130));
    if (slope > 0.16) color.lerp(palette.rock, Math.min(1, (slope - 0.16) * 3.2));
    const dVolcano = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
    if (dVolcano < 860) {
      const t = 1 - THREE.MathUtils.smoothstep(dVolcano, 420, 860);
      color.lerp(palette.basalt, t * 0.9);
      if (dVolcano < VOLCANO.crater + 60) color.lerp(palette.ash, 0.75);
    }
    const jitter = 0.94 + random() * 0.12;
    colors[i * 3] = color.r * jitter;
    colors[i * 3 + 1] = color.g * jitter;
    colors[i * 3 + 2] = color.b * jitter;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const terrain = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }),
  );
  return terrain;
}

/** One runway: textured strip, glowing threshold markers and, at Palma, a hangar and tower. */
function buildRunway(runway, withBuildings) {
  const group = new THREE.Group();
  const rad = (runway.headingDeg * Math.PI) / 180;
  const stripGeometry = new THREE.PlaneGeometry(runway.length, runway.width);
  stripGeometry.rotateX(-Math.PI / 2);
  const strip = new THREE.Mesh(
    stripGeometry,
    new THREE.MeshStandardMaterial({ map: runwayTexture(), roughness: 0.94 }),
  );
  strip.rotation.y = Math.PI / 2 - rad;
  strip.position.set(runway.x, runway.elev + 0.35, runway.z);
  group.add(strip);
  const markerMaterial = new THREE.MeshStandardMaterial({ color: 0x39ff7a, emissive: 0x1fd655, emissiveIntensity: 2.2 });
  for (const su of [-1, 1]) {
    for (const sv of [-1, 1]) {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 2.4), markerMaterial);
      const u = (su * runway.length) / 2;
      const v = (sv * (runway.width / 2 + 2.5));
      marker.position.set(
        runway.x + u * Math.sin(rad) + v * Math.cos(rad),
        runway.elev + 0.9,
        runway.z - u * Math.cos(rad) + v * Math.sin(rad),
      );
      group.add(marker);
    }
  }
  if (withBuildings) {
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xb9a888, roughness: 0.9 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8a4a34, roughness: 0.85 });
    const hangar = new THREE.Group();
    const hangarBody = new THREE.Mesh(new THREE.BoxGeometry(46, 13, 30), wallMaterial);
    hangarBody.position.y = 6.5;
    const hangarRoof = new THREE.Mesh(new THREE.CylinderGeometry(15.6, 15.6, 46, 12, 1, false, 0, Math.PI), roofMaterial);
    hangarRoof.rotation.z = Math.PI / 2;
    hangarRoof.rotation.y = Math.PI / 2;
    hangarRoof.position.y = 13;
    hangar.add(hangarBody, hangarRoof);
    hangar.position.set(runway.x - 130, runway.elev, runway.z + 95);
    group.add(hangar);
    const tower = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(8, 22, 8), wallMaterial);
    shaft.position.y = 11;
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(11, 5, 11),
      new THREE.MeshStandardMaterial({ color: 0xbfd9e2, emissive: 0xffc37a, emissiveIntensity: 0.55, roughness: 0.3 }),
    );
    cab.position.y = 24.5;
    tower.add(shaft, cab);
    tower.position.set(runway.x - 210, runway.elev, runway.z + 80);
    group.add(tower);
  }
  return group;
}

/**
 * Render a settlement's placements: one instanced mesh per facade variant, plus roof slabs.
 */
function renderBuildings(facades, placements, random) {
  const group = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let variant = 0; variant < facades.length; variant += 1) {
    const own = placements.filter((p) => p.variant === variant);
    if (own.length === 0) continue;
    const mesh = new THREE.InstancedMesh(
      box,
      new THREE.MeshStandardMaterial({
        map: facades[variant].map,
        emissiveMap: facades[variant].glow,
        emissive: 0xffc37a,
        emissiveIntensity: 1.15,
        roughness: 0.9,
      }),
      own.length,
    );
    own.forEach((p, i) => {
      dummy.position.set(p.x, p.ground - 0.5, p.z);
      dummy.scale.set(p.w, p.height, p.d);
      dummy.rotation.set(0, p.rot, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tint.setScalar(p.shade));
    });
    group.add(mesh);
  }
  const roofColours = [0xb5654a, 0xa8563c, 0xc07a52, 0x7c4a38, 0x8d8578, 0x9a917f];
  const roofs = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.95 }), placements.length);
  placements.forEach((p, i) => {
    dummy.position.set(p.x, p.ground - 0.5 + p.height - 0.7, p.z);
    dummy.scale.set(p.w * 1.1, 1.5, p.d * 1.1);
    dummy.rotation.set(0, p.rot, 0);
    dummy.updateMatrix();
    roofs.setMatrixAt(i, dummy.matrix);
    roofs.setColorAt(i, tint.set(roofColours[Math.floor(random() * roofColours.length)]));
  });
  group.add(roofs);
  return group;
}

/** Port Aurelia and its lighthouse, scattered by the seeded random source. */
function buildTown(random) {
  const group = new THREE.Group();
  const facades = [
    facadeTexture(random, '#d9c6a5', 0.55, 'grid'),
    facadeTexture(random, '#c9d4d8', 0.45, 'strips'),
    facadeTexture(random, '#e0b49a', 0.62, 'grid'),
  ];
  // Scatter placements packed tight; the square stays clear, no house on a road.
  const PLAZA = { x: -2516, z: -514 };
  const placements = [];
  let guard = 0;
  while (placements.length < 196 && guard < 6000) {
    guard += 1;
    const angle = random() * Math.PI * 2;
    const dist = Math.sqrt(random()) * 330;
    const x = LANDMARKS.town.x + Math.cos(angle) * dist;
    const z = LANDMARKS.town.z + Math.sin(angle) * dist * 0.82;
    const h = terrainHeight(x, z);
    if (h < 3 || h > 55) continue;
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < 27) continue;
    if (distToRoads(x, z) < 8) continue;
    placements.push({
      x,
      z,
      ground: h,
      w: randomRange(random, 12, 26),
      d: randomRange(random, 12, 26),
      height: randomRange(random, 10, 34) * (1 - dist / 900),
      rot: randomRange(random, 0, Math.PI),
      variant: Math.floor(random() * facades.length),
      shade: randomRange(random, 0.8, 1.05),
    });
  }
  // The waterfront row: larger houses along the shore — the town's harbour face.
  const shoreLine = [[-2715, -250], [-2745, -330], [-2770, -410], [-2790, -490], [-2800, -570], [-2810, -650]];
  for (const [sx, sz] of shoreLine) {
    const x = sx + randomRange(random, -7, 7);
    const z = sz + randomRange(random, -9, 9);
    placements.push({
      x,
      z,
      ground: Math.max(terrainHeight(x, z), 0.4),
      w: randomRange(random, 19, 27),
      d: randomRange(random, 14, 20),
      height: randomRange(random, 14, 24),
      rot: Math.PI / 2 + randomRange(random, -0.16, 0.16),
      variant: Math.floor(random() * facades.length),
      shade: randomRange(random, 0.85, 1.05),
    });
  }
  group.add(renderBuildings(facades, placements, random));

  // The market square: stone disc, church and spire, market stalls.
  const plazaGround = terrainHeight(PLAZA.x, PLAZA.z);
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(15, 24),
    new THREE.MeshStandardMaterial({ color: 0x9a917f, roughness: 1 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(PLAZA.x, plazaGround + 0.3, PLAZA.z);
  group.add(plaza);
  const church = new THREE.Group();
  const churchWall = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.85 });
  const churchRoof = new THREE.MeshStandardMaterial({ color: 0x8a4a34, roughness: 0.85 });
  const nave = new THREE.Mesh(new THREE.BoxGeometry(11, 14, 22), churchWall);
  nave.position.y = 7;
  const towerBlock = new THREE.Mesh(new THREE.BoxGeometry(5.5, 29, 5.5), churchWall);
  towerBlock.position.set(0, 14.5, -9);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(4.4, 9, 4), churchRoof);
  spire.position.set(0, 33.5, -9);
  spire.rotation.y = Math.PI / 4;
  church.add(nave, towerBlock, spire);
  const churchSpot = { x: -2544, z: -534 };
  church.position.set(churchSpot.x, terrainHeight(churchSpot.x, churchSpot.z) - 0.4, churchSpot.z);
  church.rotation.y = 0.5;
  group.add(church);
  const stallWood = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.95 });
  const awningColours = [0xc23b2e, 0xf0e3c2, 0x2e7c6e];
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const sx = PLAZA.x + Math.cos(a) * 11.5;
    const sz = PLAZA.z + Math.sin(a) * 11.5;
    const stall = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.9, 2.4), stallWood);
    base.position.y = 0.95;
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(3.9, 0.22, 3.1),
      new THREE.MeshStandardMaterial({ color: awningColours[i % awningColours.length], roughness: 0.9 }),
    );
    awning.position.y = 2.35;
    awning.rotation.z = 0.1;
    stall.add(base, awning);
    stall.position.set(sx, terrainHeight(sx, sz), sz);
    stall.rotation.y = random() * Math.PI;
    group.add(stall);
  }

  const lighthouse = new THREE.Group();
  const baseY = terrainHeight(LANDMARKS.lighthouse.x, LANDMARKS.lighthouse.z);
  const white = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.7 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.7 });
  for (let i = 0; i < 4; i += 1) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(4.6 - i * 0.35, 4.9 - i * 0.35, 5.4, 14), i % 2 ? red : white);
    band.position.y = 2.7 + i * 5.4;
    lighthouse.add(band);
  }
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc95e, emissiveIntensity: 3.2 }),
  );
  lamp.position.y = 23.6;
  lighthouse.add(lamp);
  lighthouse.position.set(LANDMARKS.lighthouse.x, baseY, LANDMARKS.lighthouse.z);
  group.add(lighthouse);

  // The rotating beam: two additive translucent cones at the lamp.
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd9a0, transparent: true, opacity: 0.15,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false,
  });
  const beamPivot = new THREE.Group();
  const coneGeometry = new THREE.ConeGeometry(30, 240, 20, 1, true);
  coneGeometry.translate(0, -120, 0); // apex at the pivot, skirt 240 m out along -Y
  for (const rz of [Math.PI / 2, -Math.PI / 2]) {
    const cone = new THREE.Mesh(coneGeometry, beamMaterial);
    cone.rotation.z = rz; // lay the cone horizontal, one each way
    beamPivot.add(cone);
  }
  beamPivot.position.set(LANDMARKS.lighthouse.x, baseY + 23.6, LANDMARKS.lighthouse.z);
  group.add(beamPivot);
  return { group, lamp, beam: beamPivot, beamMaterial };
}

/** The fishing village on Palma's south-eastern shore: a smaller scatter of lit-window houses. */
function buildVillage(random) {
  const facades = [
    facadeTexture(random, '#d9c6a5', 0.5, 'grid'),
    facadeTexture(random, '#e0b49a', 0.58, 'grid'),
  ];
  const placements = [];
  let guard = 0;
  while (placements.length < 30 && guard < 2000) {
    guard += 1;
    const angle = random() * Math.PI * 2;
    const dist = Math.sqrt(random()) * 125;
    const x = LANDMARKS.village.x + Math.cos(angle) * dist;
    const z = LANDMARKS.village.z + Math.sin(angle) * dist * 0.85;
    const h = terrainHeight(x, z);
    if (h < 2.5 || h > 30) continue;
    if (distToRoads(x, z) < 8) continue;
    placements.push({
      x,
      z,
      ground: h,
      w: randomRange(random, 10, 20),
      d: randomRange(random, 10, 20),
      height: randomRange(random, 8, 19),
      rot: randomRange(random, 0, Math.PI),
      variant: Math.floor(random() * facades.length),
      shade: randomRange(random, 0.8, 1.05),
    });
  }
  return renderBuildings(facades, placements, random);
}

/** The dirt roads as ribbons riding the height function, smoothed through their waypoints. */
function buildRoads() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x9c8a66, roughness: 1, side: THREE.DoubleSide });
  for (const path of ROAD_PATHS) {
    const curve = new THREE.CatmullRomCurve3(path.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const count = Math.max(10, Math.ceil(curve.getLength() / 14));
    const points = curve.getSpacedPoints(count);
    const positions = [];
    const indices = [];
    points.forEach((p, i) => {
      const next = points[Math.min(i + 1, points.length - 1)];
      const prev = points[Math.max(i - 1, 0)];
      const tx = next.x - prev.x;
      const tz = next.z - prev.z;
      const tl = Math.hypot(tx, tz) || 1;
      const px = (tz / tl) * 3.6;
      const pz = (-tx / tl) * 3.6;
      const y = Math.max(
        terrainHeight(p.x, p.z),
        terrainHeight(p.x + px, p.z + pz),
        terrainHeight(p.x - px, p.z - pz),
      ) + 0.22;
      positions.push(p.x - px, y, p.z - pz, p.x + px, y, p.z + pz);
      if (i > 0) {
        const a = (i - 1) * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry, material));
  }
  return group;
}

/** The harbour pier: timber deck on posts, crates and barrels, a lamp, the coaster alongside. */
function buildPier(random) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5c38, roughness: 0.95 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x5f4527, roughness: 0.95 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(112, 1.1, 11), wood);
  deck.position.set(-2840, 1.85, -450);
  group.add(deck);
  for (let x = -2792; x >= -2888; x -= 12) {
    for (const dz of [-4.6, 4.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5.5, 7), woodDark);
      post.position.set(x, 0, -450 + dz);
      group.add(post);
    }
  }
  for (let i = 0; i < 5; i += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), i % 2 ? wood : woodDark);
    crate.position.set(-2812 - i * 7 + randomRange(random, -1.5, 1.5), 3.25, -452 + randomRange(random, -2.4, 2.4));
    crate.rotation.y = random() * Math.PI;
    group.add(crate);
  }
  const barrelGeometry = new THREE.CylinderGeometry(0.65, 0.65, 1.5, 9);
  for (let i = 0; i < 6; i += 1) {
    const barrel = new THREE.Mesh(barrelGeometry, i % 2 ? woodDark : wood);
    barrel.position.set(-2872 + (i % 3) * 2.2, 3.15, -447 + Math.floor(i / 3) * 2.4);
    group.add(barrel);
  }
  const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 5, 6), woodDark);
  lampPost.position.set(-2892, 4.9, -450);
  group.add(lampPost);
  const lampBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc95e, emissiveIntensity: 2.6 }),
  );
  lampBall.position.set(-2892, 7.6, -450);
  group.add(lampBall);
  const coaster = buildBoat(0xd9c6a5, 0x2e5a7c, 8);
  coaster.scale.setScalar(2.6);
  coaster.position.set(-2852, 0, -439);
  group.add(coaster);
  return group;
}

/** Low-poly pines scattered on the grass, kept clear of the strips and the town. */
function buildTrees(random) {
  const cone = new THREE.ConeGeometry(3.4, 10, 6);
  cone.translate(0, 7, 0);
  const trees = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ color: 0x2e5c2a, flatShading: true, roughness: 1 }), 420);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < 400 && guard < 6000) {
    guard += 1;
    const x = randomRange(random, -3600, 3600);
    const z = randomRange(random, -3600, 3600);
    const h = terrainHeight(x, z);
    if (h < 5 || h > 100) continue;
    if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < 900) continue;
    if (Math.hypot(x - LANDMARKS.town.x, z - LANDMARKS.town.z) < 345) continue;
    if (Math.hypot(x - LANDMARKS.village.x, z - LANDMARKS.village.z) < 150) continue;
    if (distToRoads(x, z) < 7) continue;
    let nearStrip = false;
    for (const runway of RUNWAYS) {
      const { u, v } = runwayLocal(runway, x, z);
      if (Math.abs(u) < runway.length / 2 + 60 && Math.abs(v) < 90) nearStrip = true;
    }
    if (nearStrip) continue;
    const slope = Math.abs(terrainHeight(x + 6, z) - h) + Math.abs(terrainHeight(x, z + 6) - h);
    if (slope > 7) continue;
    const s = randomRange(random, 0.8, 1.7);
    dummy.position.set(x, h - 0.4, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.updateMatrix();
    trees.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  trees.count = placed;
  return trees;
}

/** Drifting low-poly clouds, warm-lit from the sun side. */
function buildClouds(random) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xfff4e0, flatShading: true, roughness: 1, transparent: true, opacity: 0.88, emissive: 0xffb37a, emissiveIntensity: 0.14 });
  for (let i = 0; i < 16; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(random() * 4);
    for (let p = 0; p < puffs; p += 1) {
      const r = randomRange(random, 26, 62);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), material);
      puff.position.set(randomRange(random, -70, 70), randomRange(random, -8, 10), randomRange(random, -34, 34));
      puff.scale.y = 0.42;
      cloud.add(puff);
    }
    cloud.position.set(randomRange(random, -4600, 4600), randomRange(random, 480, 860), randomRange(random, -4600, 4600));
    group.add(cloud);
  }
  return group;
}

/** The sun's glitter path: an additive sparkle sheet along the sun's azimuth. */
function buildGlitter(sunDir) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const across = ctx.createLinearGradient(0, 0, 0, 128);
  across.addColorStop(0, 'rgba(255, 190, 110, 0)');
  across.addColorStop(0.5, 'rgba(255, 205, 130, 0.5)');
  across.addColorStop(1, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, 512, 128);
  const sparkle = createRandom(1234567);
  for (let i = 0; i < 300; i += 1) {
    const x = sparkle() * 512;
    const y = 12 + sparkle() * 104;
    const centre = 1 - Math.abs(y - 64) / 64;
    const alpha = 0.1 + sparkle() * 0.5 * centre;
    ctx.fillStyle = `rgba(255, 232, 185, ${alpha.toFixed(2)})`;
    ctx.fillRect(x, y, 4 + sparkle() * 22, 1.6);
  }
  ctx.globalCompositeOperation = 'destination-in';
  const along = ctx.createLinearGradient(0, 0, 512, 0);
  along.addColorStop(0, 'rgba(0, 0, 0, 0)');
  along.addColorStop(0.22, 'rgba(0, 0, 0, 1)');
  along.addColorStop(0.8, 'rgba(0, 0, 0, 1)');
  along.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, 512, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  const geometry = new THREE.PlaneGeometry(6800, 950);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  const flat = Math.hypot(sunDir.x, sunDir.z);
  const dirX = sunDir.x / flat;
  const dirZ = sunDir.z / flat;
  mesh.rotation.y = Math.atan2(-dirZ, dirX);
  mesh.position.set(dirX * 2500, 0.3, dirZ * 2500);
  return { mesh, material };
}

/**
 * One harbour boat at anchor: hull, cabin, mast, and the foam wash it sits in.
 */
function buildBoat(hullColour, trimColour, headingDeg) {
  const group = new THREE.Group();
  const hullMaterial = new THREE.MeshStandardMaterial({ color: hullColour, roughness: 0.7 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: trimColour, roughness: 0.6 });
  const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.8 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.85 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.5, 2.8), hullMaterial);
  hull.position.y = 0.55;
  group.add(hull);
  const bowGeometry = new THREE.CylinderGeometry(0.02, 1.42, 3.4, 4);
  bowGeometry.rotateY(Math.PI / 4);
  bowGeometry.rotateZ(-Math.PI / 2);
  const bow = new THREE.Mesh(bowGeometry, hullMaterial);
  bow.position.set(5.8, 0.55, 0);
  bow.scale.set(1, 1, 1.45);
  group.add(bow);
  const gunwale = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.28, 3.0), trimMaterial);
  gunwale.position.y = 1.38;
  group.add(gunwale);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 1.9), whiteMaterial);
  cabin.position.set(-0.6, 2.1, 0);
  group.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6), darkMaterial);
  mast.position.set(1.6, 3.4, 0);
  group.add(mast);

  const washMaterial = new THREE.MeshBasicMaterial({ color: 0xdff2f2, transparent: true, opacity: 0.26, depthWrite: false });
  const foam = new THREE.Mesh(new THREE.CircleGeometry(5.6, 20), washMaterial);
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = 0.14;
  foam.scale.set(1.25, 0.62, 1);
  group.add(foam);
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(17, 4.6), new THREE.MeshBasicMaterial({
    color: 0xdff2f2, transparent: true, opacity: 0.17, depthWrite: false,
  }));
  wake.rotation.x = -Math.PI / 2;
  wake.rotation.z = Math.PI;
  wake.position.set(-12.4, 0.13, 0);
  group.add(wake);

  group.rotation.y = (-headingDeg * Math.PI) / 180;
  return group;
}

/**
 * A fading wake trail: a flat sheet astern, alpha running from churn to nothing.
 */
function buildWakeTrail() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, 'rgba(223, 242, 242, 0)');
  gradient.addColorStop(0.75, 'rgba(223, 242, 242, 0.13)');
  gradient.addColorStop(1, 'rgba(223, 242, 242, 0.4)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 32);
  const across = ctx.createLinearGradient(0, 0, 0, 32);
  across.addColorStop(0, 'rgba(0, 0, 0, 0)');
  across.addColorStop(0.3, 'rgba(0, 0, 0, 1)');
  across.addColorStop(0.7, 'rgba(0, 0, 0, 1)');
  across.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, 256, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const trail = new THREE.Mesh(
    new THREE.PlaneGeometry(58, 7.5),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(-33, 0.12, 0); // astern: the boat's bow is its local +X
  return trail;
}

/**
 * The harbour's boats: four at anchor, a coaster, and the ferry on its clock-driven loop.
 */
function buildHarbour() {
  const group = new THREE.Group();
  const moorings = [
    { x: -2800, z: -200, headingDeg: 40, hull: 0xf2ede2, trim: 0xc23b2e },
    { x: -3000, z: -450, headingDeg: 130, hull: 0xe8dcc0, trim: 0x2e5a7c },
    { x: -3050, z: -700, headingDeg: 75, hull: 0xf2ede2, trim: 0x2e7c6e },
    { x: -2950, z: -850, headingDeg: 300, hull: 0xd9c6a5, trim: 0xc23b2e },
    { x: -2903, z: -868, headingDeg: 130, hull: 0xf2ede2, trim: 0xc23b2e, scale: 2.3 },
  ];
  const boats = moorings.map((mooring, i) => {
    const boat = buildBoat(mooring.hull, mooring.trim, mooring.headingDeg);
    boat.position.set(mooring.x, 0, mooring.z);
    if (mooring.scale) boat.scale.setScalar(mooring.scale);
    group.add(boat);
    return { boat, phase: i * 1.7 };
  });
  const ferry = buildBoat(0xe8dcc0, 0x2e5a7c, 0);
  ferry.scale.setScalar(1.6);
  ferry.add(buildWakeTrail());
  group.add(ferry);
  return { group, boats, ferry };
}

/** The ferry's loop around the anchorage: centre, radii and the angle it makes at time t. */
const FERRY_LOOP = { x: -3020, z: -540, rx: 130, rz: 240, period: 300, phase: 0.6 };

/** One bird: a slim body cone and two wings that flap about the body's axis. */
function buildBird(material) {
  const bird = new THREE.Group();
  const bodyGeometry = new THREE.ConeGeometry(0.22, 1.7, 5);
  bodyGeometry.rotateZ(-Math.PI / 2); // nose along local +X
  bird.add(new THREE.Mesh(bodyGeometry, material));
  const wingGeometryR = new THREE.PlaneGeometry(0.7, 2.1);
  wingGeometryR.translate(0, -1.05, 0);
  wingGeometryR.rotateX(-Math.PI / 2); // span out along +Z
  const wingR = new THREE.Mesh(wingGeometryR, material);
  const wingGeometryL = new THREE.PlaneGeometry(0.7, 2.1);
  wingGeometryL.translate(0, 1.05, 0);
  wingGeometryL.rotateX(-Math.PI / 2); // span out along -Z
  const wingL = new THREE.Mesh(wingGeometryL, material);
  bird.add(wingL, wingR);
  bird.scale.setScalar(2.4);
  return { bird, wingL, wingR };
}

/** A flock of gulls: each bird circles on its own phase, a pure function of the clock. */
function buildFlock(centre, radius, count, phaseBase) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0x2e2a26, side: THREE.DoubleSide });
  const birds = [];
  for (let i = 0; i < count; i += 1) {
    const { bird, wingL, wingR } = buildBird(material);
    group.add(bird);
    birds.push({
      bird, wingL, wingR,
      a0: phaseBase + (i / count) * Math.PI * 2,
      r: radius * (0.75 + (i % 3) * 0.22),
      speed: 0.055 + (i % 3) * 0.008,
      phase: i * 1.31,
      lift: (i % 3 - 1) * 7,
    });
  }
  return { group, birds, centre };
}

/**
 * Build the whole world into the scene; returns the animated pieces plus the ground query.
 */
export function createWorld(scene, seed) {
  const random = createRandom(seed ^ 0x9e3779b9);
  const sunDir = new THREE.Vector3(0.88, 0.2, -0.18).normalize();

  const sun = new THREE.DirectionalLight(0xffc37a, 2.9);
  sun.position.copy(sunDir).multiplyScalar(6000);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x2e4a5a, 0.95));
  const fill = new THREE.DirectionalLight(0x8fb6d9, 0.65);
  fill.position.set(-3000, 1800, 3000);
  scene.add(fill);
  scene.fog = new THREE.Fog(0xf2a35e, 1600, 9800);

  buildSky(scene, sunDir);
  scene.add(buildTerrain(random));

  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(9500, 48),
    new THREE.MeshPhongMaterial({ color: 0x14607c, specular: 0xcc8a4a, shininess: 70, transparent: true, opacity: 0.96 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_LEVEL;
  scene.add(sea);
  const glitter = buildGlitter(sunDir);
  scene.add(glitter.mesh);
  const harbour = buildHarbour();
  scene.add(harbour.group);

  for (const runway of RUNWAYS) scene.add(buildRunway(runway, runway.id === 'palma'));

  const lava = new THREE.Mesh(
    new THREE.CircleGeometry(50, 40),
    new THREE.MeshStandardMaterial({ color: 0xb22e06, emissive: 0xe83e00, emissiveIntensity: 1.25, roughness: 0.7 }),
  );
  lava.rotation.x = -Math.PI / 2;
  const lavaY = terrainHeight(VOLCANO.x, VOLCANO.z);
  lava.position.set(VOLCANO.x, lavaY + 4, VOLCANO.z);
  scene.add(lava);
  const lavaLight = new THREE.PointLight(0xff6a22, 2600, 800, 1.8);
  lavaLight.position.set(VOLCANO.x, lavaY + 60, VOLCANO.z);
  scene.add(lavaLight);

  const town = buildTown(random);
  scene.add(town.group);
  scene.add(buildVillage(random));
  scene.add(buildRoads());
  scene.add(buildPier(random));
  scene.add(buildTrees(random));
  const clouds = buildClouds(random);
  scene.add(clouds);
  const flocks = [
    buildFlock({ x: -2650, y: 165, z: -350 }, 95, 7, 0.4),
    buildFlock({ x: 1560, y: 214, z: 1060 }, 80, 7, 2.1),
  ];
  for (const flock of flocks) scene.add(flock.group);

  return {
    groundHeight: (x, z) => terrainHeight(x, z),
    runways: RUNWAYS,
    landmarks: LANDMARKS,
    update(dt, t) {
      clouds.position.x = Math.sin(t * 0.004) * 60 + ((t * 3.2) % 240) - 120;
      lavaLight.intensity = 2600 + Math.sin(t * 7.3) * 500 + Math.sin(t * 13.7) * 280;
      town.lamp.material.emissiveIntensity = 2.6 + Math.sin(t * 2.2) * 1.1;
      town.beam.rotation.y = t * 0.35;
      town.beamMaterial.opacity = 0.14 + Math.sin(t * 0.9) * 0.02;
      glitter.material.opacity = 0.46 + Math.sin(t * 1.7) * 0.05 + Math.sin(t * 4.3) * 0.03;
      for (const { boat, phase } of harbour.boats) {
        boat.position.y = Math.sin(t * 0.8 + phase) * 0.12;
        boat.rotation.z = Math.sin(t * 0.6 + phase) * 0.02;
        boat.rotation.x = Math.cos(t * 0.5 + phase) * 0.015;
      }
      // The ferry works its loop from the clock, a gentle roll on top.
      const fa = FERRY_LOOP.phase + (t * Math.PI * 2) / FERRY_LOOP.period;
      const fx = FERRY_LOOP.x + Math.cos(fa) * FERRY_LOOP.rx;
      const fz = FERRY_LOOP.z + Math.sin(fa) * FERRY_LOOP.rz;
      const fvx = -Math.sin(fa) * FERRY_LOOP.rx;
      const fvz = Math.cos(fa) * FERRY_LOOP.rz;
      harbour.ferry.position.set(fx, Math.sin(t * 0.8 + 2.2) * 0.1, fz);
      harbour.ferry.rotation.set(Math.cos(t * 0.5 + 2.2) * 0.012, Math.atan2(-fvz, fvx), Math.sin(t * 0.6 + 2.2) * 0.018);
      // The flocks circle their thermals, wings beating.
      for (const flock of flocks) {
        for (const b of flock.birds) {
          const a = b.a0 + t * b.speed;
          b.bird.position.set(
            flock.centre.x + Math.cos(a) * b.r,
            flock.centre.y + b.lift + Math.sin(t * 0.7 + b.phase) * 4,
            flock.centre.z + Math.sin(a) * b.r,
          );
          b.bird.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
          const flap = Math.sin(t * 8 + b.phase) * 0.5 + 0.08;
          b.wingL.rotation.x = -flap;
          b.wingR.rotation.x = flap;
        }
      }
    },
  };
}
