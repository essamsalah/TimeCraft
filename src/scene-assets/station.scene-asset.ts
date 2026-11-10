import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry } from '@iwsdk/core';

const charcoal = new MeshStandardMaterial({ color: 0x252a2c, roughness: 0.82 });
const suede = new MeshStandardMaterial({ color: 0x23332f, roughness: 0.97 });
const edge = new MeshStandardMaterial({ color: 0x9a7847, metalness: 0.55, roughness: 0.53 });

function block(width: number, height: number, depth: number, material: MeshStandardMaterial | MeshBasicMaterial, x: number, y: number, z: number) {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

export const watchStation = new Group();
watchStation.add(block(0.76, 0.036, 0.36, charcoal, 0, -0.018, 0));
watchStation.add(block(0.73, 0.004, 0.336, suede, 0, 0, 0));
for (const z of [-0.17, 0.17]) watchStation.add(block(0.737, 0.003, 0.002, edge, 0, 0.001, z));
for (const x of [-0.369, 0.369]) watchStation.add(block(0.002, 0.003, 0.34, edge, x, 0.001, 0));
watchStation.add(block(0.044, 0.005, 0.346, edge, 0, -0.028, 0));

export const stationTray = new Group();
stationTray.add(block(0.205, 0.012, 0.20, charcoal, 0, 0.006, 0));
for (const x of [-0.0985, 0.0985]) stationTray.add(block(0.008, 0.010, 0.20, edge, x, 0.017, 0));
for (const z of [-0.096, 0.096]) stationTray.add(block(0.193, 0.010, 0.008, edge, 0, 0.017, z));
stationTray.add(block(0.186, 0.001, 0.002, edge, 0, 0.0125, 0.026));

export const gestureDemo = new Group();
const sample = new Mesh(new BoxGeometry(0.054, 0.009, 0.043), edge);
sample.name = 'Gesture Sample';
gestureDemo.add(sample);
const arrow = new Mesh(new PlaneGeometry(0.075, 0.003), new MeshBasicMaterial({ color: 0xe8bb69, transparent: true, opacity: 0.65 }));
arrow.rotation.x = -Math.PI / 2;
arrow.position.x = -0.045;
gestureDemo.add(arrow);

export const immersiveWorkshop = new Group();
const wall = new MeshStandardMaterial({ color: 0x303632, roughness: 0.94 });
const panel = new MeshStandardMaterial({ color: 0x252a27, roughness: 0.85 });
const wood = new MeshStandardMaterial({ color: 0x594637, roughness: 0.79 });
const strip = new MeshBasicMaterial({ color: 0xddb680 });
immersiveWorkshop.add(
  block(7, 0.08, 7, wood, 0, -0.06, -0.9),
  block(7, 3.2, 0.08, wall, 0, 1.56, -2.35),
  block(0.08, 3.2, 7, panel, -2.9, 1.56, -0.9),
  block(0.08, 3.2, 7, panel, 2.9, 1.56, -0.9),
  block(7, 3.2, 0.08, wall, 0, 1.56, 2.6),
  block(7, 0.08, 7, panel, 0, 3.15, -0.9),
  block(3.4, 0.015, 0.025, strip, 0, 2.35, -2.28),
  block(3.4, 0.04, 0.15, wood, 0, 0.85, -2.22),
);
for (const x of [-1.28, 0, 1.28]) {
  immersiveWorkshop.add(block(1.15, 0.85, 0.06, panel, x, 1.67, -2.27));
}

export const studioDetail = new Group();
const toolSteel = new MeshStandardMaterial({ color: 0xb1b8bc, metalness: 0.83, roughness: 0.28 });
const recess = block(0.09, 0.006, 0.145, charcoal, 0, 0.003, 0);
const screwdriver = block(0.016, 0.016, 0.065, edge, -0.017, 0.014, 0.012);
const shaft = block(0.004, 0.004, 0.055, toolSteel, -0.017, 0.013, -0.046);
const tweezers = block(0.008, 0.004, 0.10, toolSteel, 0.019, 0.011, 0);
studioDetail.add(recess, screwdriver, shaft, tweezers);
