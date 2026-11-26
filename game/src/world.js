// The Aurelia Isles: a seeded, golden-hour archipelago built with three.js — Palma with its
// hilltop field and coastal town, the volcano Mount Cindera, Farrel Isle across the water, and
// a scatter of islets. One analytic height function grows the terrain mesh, places every
// building and tree, and answers the flight model's ground queries, so what you see is exactly
// what you can hit.
import * as THREE from 'three';
import { createRandom, randomRange } from './random.js';

/** Island bumps: centre, gaussian height and spread, in metres. */
const ISLANDS = [
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
};

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

/**
 * The one height function: raw land with each runway's plateau blended in. The terrain mesh,
 * the building scatter and the flight model all sample this, never rawHeight.
 */
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
 * A canvas texture of a building facade: warm walls and many small windows in a regular grid
 * (or, for the strip style, one ribbon window per floor), some lit for the evening. The windows
 * stay small against the wall — a few big panes read as dice pips from the air, a fine grid of
 * little ones reads as a building.
 */
function facadeTexture(random, base, litRatio, style) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const litShades = ['#ffd98f', '#ffce6b', '#ffe9b0'];
  const window = () => {
    if (random() < litRatio) return litShades[Math.floor(random() * litShades.length)];
    return 'rgba(26, 34, 48, 0.88)';
  };
  if (style === 'strips') {
    for (let row = 0; row < 9; row += 1) {
      ctx.fillStyle = window();
      ctx.fillRect(16, 12 + row * 27, 224, 11);
    }
  } else {
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        ctx.fillStyle = window();
        ctx.fillRect(13 + col * 40, 9 + row * 30, 17, 19);
      }
    }
  }
  ctx.fillStyle = 'rgba(60, 40, 25, 0.25)';
  ctx.fillRect(0, 240, 256, 16);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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

/** The gradient sky dome with a low sun baked into the shader, plus the sun's glow sprite. */
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

/** The terrain mesh: the height function sampled on a grid, flat-shaded, coloured by height and slope. */
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

/** The coastal town of Port Aurelia and its lighthouse, scattered by the seeded random source. */
function buildTown(random) {
  const group = new THREE.Group();
  const facades = [
    facadeTexture(random, '#d9c6a5', 0.42, 'grid'),
    facadeTexture(random, '#c9d4d8', 0.34, 'strips'),
    facadeTexture(random, '#e0b49a', 0.5, 'grid'),
  ];
  // Scatter the placements first, so the town can be built as one instanced mesh per facade
  // variant — the buildings genuinely differ — plus one instanced mesh of roof slabs whose
  // terracotta and flat colours cap the walls (and hide the facade the box maps onto its top).
  const placements = [];
  let guard = 0;
  while (placements.length < 118 && guard < 3000) {
    guard += 1;
    const angle = random() * Math.PI * 2;
    const dist = Math.sqrt(random()) * 300;
    const x = LANDMARKS.town.x + Math.cos(angle) * dist;
    const z = LANDMARKS.town.z + Math.sin(angle) * dist * 0.8;
    const h = terrainHeight(x, z);
    if (h < 3 || h > 55) continue;
    placements.push({
      x,
      z,
      ground: h,
      w: randomRange(random, 12, 26),
      d: randomRange(random, 12, 26),
      height: randomRange(random, 10, 34) * (1 - dist / 800),
      rot: randomRange(random, 0, Math.PI),
      variant: Math.floor(random() * facades.length),
      shade: randomRange(random, 0.8, 1.05),
    });
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let variant = 0; variant < facades.length; variant += 1) {
    const own = placements.filter((p) => p.variant === variant);
    if (own.length === 0) continue;
    const mesh = new THREE.InstancedMesh(
      box,
      new THREE.MeshStandardMaterial({ map: facades[variant], roughness: 0.9 }),
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
  return { group, lamp };
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
    if (Math.hypot(x - LANDMARKS.town.x, z - LANDMARKS.town.z) < 330) continue;
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

/**
 * Build the whole world into the scene. Returns the pieces the game loop animates plus the
 * ground query the flight model flies against.
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
  scene.add(buildTrees(random));
  const clouds = buildClouds(random);
  scene.add(clouds);

  return {
    groundHeight: (x, z) => terrainHeight(x, z),
    runways: RUNWAYS,
    landmarks: LANDMARKS,
    update(dt, t) {
      clouds.position.x = Math.sin(t * 0.004) * 60 + ((t * 3.2) % 240) - 120;
      lavaLight.intensity = 2600 + Math.sin(t * 7.3) * 500 + Math.sin(t * 13.7) * 280;
      town.lamp.material.emissiveIntensity = 2.6 + Math.sin(t * 2.2) * 1.1;
    },
  };
}
