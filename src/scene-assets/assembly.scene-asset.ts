import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, RingGeometry, TorusGeometry,
} from '@iwsdk/core';

const slate = new MeshStandardMaterial({ color: 0x243044, roughness: 0.78 });
const rubber = new MeshStandardMaterial({ color: 0x101923, roughness: 0.94 });
const steel = new MeshStandardMaterial({ color: 0x9fbdcb, metalness: 0.68, roughness: 0.33 });
const brass = new MeshStandardMaterial({ color: 0xe8ac57, metalness: 0.55, roughness: 0.35 });
const accent = new MeshBasicMaterial({ color: 0x65b8db });

function block(width: number, height: number, depth: number, material: MeshStandardMaterial) {
  return new Mesh(new BoxGeometry(width, height, depth), material);
}

function disc(radius: number, thickness: number, material: MeshStandardMaterial) {
  return new Mesh(new CylinderGeometry(radius, radius, thickness, 40), material);
}

// Workbench origin is the working surface; the other assets sit on local +Y.
export const workbench = new Group();
const top = block(0.76, 0.042, 0.36, slate);
top.position.y = -0.021;
const mat = block(0.71, 0.006, 0.32, rubber);
mat.position.y = -0.002;
workbench.add(top, mat);
for (const x of [-0.31, 0.31]) {
  const leg = block(0.055, 1.11, 0.25, slate);
  leg.position.set(x, -0.597, 0);
  workbench.add(leg);
}

export const partsTray = new Group();
const tray = block(0.205, 0.012, 0.20, slate);
tray.position.y = 0.006;
partsTray.add(tray);
for (const z of [-0.096, 0.096]) {
  const lip = block(0.205, 0.010, 0.008, steel);
  lip.position.set(0, 0.017, z);
  partsTray.add(lip);
}
for (const x of [-0.0985, 0.0985]) {
  const lip = block(0.008, 0.010, 0.184, steel);
  lip.position.set(x, 0.017, 0);
  partsTray.add(lip);
}

export const watchCase = new Group();
const pad = disc(0.101, 0.014, slate);
pad.position.y = -0.012;
const floor = disc(0.081, 0.010, rubber);
floor.position.y = -0.005;
const rim = new Mesh(new TorusGeometry(0.077, 0.010, 12, 48), steel);
rim.rotation.x = -Math.PI / 2;
rim.position.y = 0.009;
const crown = disc(0.013, 0.020, steel);
crown.rotation.z = Math.PI / 2;
crown.position.set(0.089, 0.01, 0);
const index = new Mesh(new BoxGeometry(0.018, 0.002, 0.008), accent);
index.position.set(0, 0.020, -0.079);
watchCase.add(pad, floor, rim, crown, index);

export const movement = new Group();
const plate = disc(0.063, 0.024, brass);
plate.position.y = 0.012;
const bridge = disc(0.047, 0.006, steel);
bridge.position.y = 0.027;
movement.add(plate, bridge);
for (const [x, z, radius] of [[-0.021, 0.007, 0.016], [0.020, 0.011, 0.013], [0.008, -0.024, 0.011]]) {
  const wheel = disc(radius, 0.005, brass);
  wheel.position.set(x, 0.032, z);
  movement.add(wheel);
}
const key = new Mesh(new BoxGeometry(0.017, 0.003, 0.012), accent);
key.position.set(0, 0.025, -0.054);
movement.add(key);

export const alignmentRing = new Group();
const ring = new Mesh(
  new RingGeometry(0.092, 0.098, 56),
  new MeshBasicMaterial({ color: 0x65b8db, transparent: true, opacity: 0.65, depthWrite: false }),
);
ring.rotation.x = -Math.PI / 2;
ring.name = 'Indicator Surface';
alignmentRing.add(ring);
