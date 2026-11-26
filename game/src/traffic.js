import * as THREE from 'three';
export const TRAFFIC_ROUTES = [
  {
    name: 'Palma circuit', centre: { x: -300, z: -700 }, rx: 1300, rz: 700,
    alt: 238, period: 170, dir: 1, phase: 0.445,
    body: 0x7fb2d9, wing: 0xf2ede2,
  },
  {
    name: 'Farrel shuttle', centre: { x: -600, z: 300 }, rx: 2100, rz: 1300,
    alt: 285, period: 260, dir: -1, phase: 3.888,
    body: 0xf2c230, wing: 0x33383f,
  },
];
function buildTrafficPlane(route) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: route.body, roughness: 0.55, metalness: 0.08 });
  const wingMat = new THREE.MeshStandardMaterial({ color: route.wing, roughness: 0.55, metalness: 0.08 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.7 });
  const fuselageGeometry = new THREE.CapsuleGeometry(0.85, 4.2, 6, 10);
  fuselageGeometry.rotateX(Math.PI / 2);
  const fuselage = new THREE.Mesh(fuselageGeometry, bodyMat);
  fuselage.position.z = 0.3;
  group.add(fuselage);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.2, 1.7), wingMat);
  wing.position.set(0, 0.6, -0.35);
  group.add(wing);
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 1.1), wingMat);
  tailplane.position.set(0, 0.28, 3.1);
  group.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.45, 1.1), bodyMat);
  fin.position.set(0, 0.92, 3.1);
  group.add(fin);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 20),
    new THREE.MeshBasicMaterial({ color: 0xe8e2d4, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  disc.position.set(0, 0, -2.95);
  group.add(disc);
  const navLight = (color, x) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), new THREE.MeshBasicMaterial({ color }));
    lamp.position.set(x, 0.6, -0.35);
    return lamp;
  };
  group.add(navLight(0xff2a1e, -5.55));
  group.add(navLight(0x2aff5a, 5.55));
  group.rotation.order = 'YXZ';
  group.scale.setScalar(1.3);
  return { group, disc };
}
export function createTraffic(scene) {
  const group = new THREE.Group();
  const planes = TRAFFIC_ROUTES.map((route) => {
    const built = buildTrafficPlane(route);
    group.add(built.group);
    return { route, ...built };
  });
  scene.add(group);
  function update(t) {
    for (const plane of planes) {
      const { route } = plane;
      const a = route.phase + route.dir * t * (Math.PI * 2 / route.period);
      const x = route.centre.x + Math.cos(a) * route.rx;
      const z = route.centre.z + Math.sin(a) * route.rz;
      const y = route.alt + Math.sin(t * 0.45 + route.phase) * 3;
      const vx = -Math.sin(a) * route.rx * route.dir;
      const vz = Math.cos(a) * route.rz * route.dir;
      plane.group.position.set(x, y, z);
      plane.group.rotation.y = -Math.atan2(vx, -vz);
      plane.group.rotation.z = route.dir * 0.15;
      plane.disc.rotation.z = t * 31 + route.phase;
    }
  }
  update(0);
  return {
    group,
    planes,
    update,
    positions() {
      return planes.map((plane) => plane.group.position.clone());
    },
  };
}
