import {
  BoxGeometry, CylinderGeometry, DataTexture, ExtrudeGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D,
  RepeatWrapping, RingGeometry, Shape, SphereGeometry, TorusGeometry,
} from '@iwsdk/core';

const brass = new MeshStandardMaterial({ color: 0xb99054, metalness: 0.72, roughness: 0.31 });
const steel = new MeshStandardMaterial({ color: 0xa6b4bc, metalness: 0.78, roughness: 0.34 });
const brushPixels = new Uint8Array(32 * 32 * 4);
for (let y = 0; y < 32; y++) {
  const rough = 126 + ((y * 37) % 47);
  for (let x = 0; x < 32; x++) brushPixels.set([255, rough, 255, 255], (y * 32 + x) * 4);
}
const brush = new DataTexture(brushPixels, 32, 32);
brush.wrapS = brush.wrapT = RepeatWrapping;
brush.repeat.set(1, 5);
brush.needsUpdate = true;
steel.roughnessMap = brush;
steel.roughness = 0.66;
const polished = new MeshStandardMaterial({ color: 0xc4cdd2, metalness: 0.88, roughness: 0.19 });
const jewel = new MeshStandardMaterial({ color: 0x96224b, metalness: 0.34, roughness: 0.23 });
const navy = new MeshStandardMaterial({ color: 0x182c38, roughness: 0.48 });
const dark = new MeshStandardMaterial({ color: 0x363e40, roughness: 0.73 });
const ivory = new MeshBasicMaterial({ color: 0xffe9bf });
const red = new MeshStandardMaterial({ color: 0xc73f34, roughness: 0.4 });
const gripMaterial = new MeshStandardMaterial({ color: 0xd3b079, roughness: 0.64, transparent: true, opacity: 0.55 });
const crystal = new MeshStandardMaterial({ color: 0x8faeb8, transparent: true, opacity: 0.16, depthWrite: false, metalness: 0.15, roughness: 0.24 });
const blue = new MeshBasicMaterial({ color: 0x76c8fa });

function disk(radius: number, height: number, y: number, material: MeshStandardMaterial) {
  const mesh = new Mesh(new CylinderGeometry(radius, radius, height, 48), material);
  mesh.position.y = y;
  return mesh;
}

function ring(radius: number, width: number, y: number, material: MeshStandardMaterial, arc = Math.PI * 2) {
  const mesh = new Mesh(new TorusGeometry(radius, width, 10, 52, arc), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

export const movementHolder = disk(0.086, 0.014, 0.007, dark);

export const automaticMovement = new Group();
automaticMovement.add(
  disk(0.065, 0.021, 0.0105, brass),
  disk(0.059, 0.005, 0.023, steel),
  ring(0.045, 0.008, 0.027, brass, Math.PI * 0.96),
  disk(0.009, 0.010, 0.029, steel),
);
let gearIndex = 0;
for (const [x, z, radius, teeth] of [[-0.026, -0.015, 0.015, 14], [0.023, -0.021, 0.014, 12], [0.025, 0.014, 0.01, 10]]) {
  const gear = new Group();
  gear.name = `Watch Gear ${++gearIndex}`;
  gear.position.set(x, 0, z);
  gear.add(disk(radius, 0.004, 0.028, brass), disk(radius * 0.22, 0.003, 0.031, dark));
  const tooth = new InstancedMesh(new BoxGeometry(0.004, 0.004, 0.004), brass, teeth);
  const transform = new Object3D();
  for (let i = 0; i < teeth; i++) {
    const angle = (i * Math.PI * 2) / teeth;
    transform.position.set(Math.sin(angle) * radius, 0.028, Math.cos(angle) * radius);
    transform.rotation.y = angle;
    transform.updateMatrix();
    tooth.setMatrixAt(i, transform.matrix);
  }
  gear.add(tooth);
  automaticMovement.add(gear);
}

const faceGrip = disk(0.023, 0.021, 0.038, gripMaterial);
faceGrip.position.x = 0.048;
faceGrip.name = 'Face Pickup Collar';
faceGrip.visible = false;
automaticMovement.add(faceGrip);

export const watchDial = new Group();
watchDial.add(disk(0.065, 0.005, 0.0025, navy), ring(0.061, 0.001, 0.005, steel), disk(0.004, 0.004, 0.007, steel));
for (let i = 0; i < 12; i++) {
  const angle = (i * Math.PI) / 6;
  const marker = new Mesh(new BoxGeometry(i === 0 ? 0.009 : 0.004, 0.0015, 0.008), i === 0 ? blue : ivory);
  marker.position.set(Math.sin(angle) * 0.053, 0.0055, -Math.cos(angle) * 0.053);
  marker.rotation.y = -angle;
  watchDial.add(marker);
}

function makeHand(length: number, width: number, hub: number, material: MeshStandardMaterial, tail: number) {
  const hand = new Group();
  const blade = new Mesh(new BoxGeometry(width, 0.002, length + tail), material);
  const inlay = new Mesh(new BoxGeometry(width * 0.35, 0.0006, length * 0.72), ivory);
  inlay.position.set(0, 0.0031, -length * 0.43);
  blade.position.set(0, 0.002, (tail - length) / 2);
  const grip = disk(0.018, 0.018, 0.009, gripMaterial);
  grip.name = 'Pickup Collar';
  hand.add(disk(hub, 0.004, 0.002, material), blade, inlay, grip);
  return hand;
}

export const hourHand = makeHand(0.032, 0.007, 0.010, brass, 0.007);
export const minuteHand = makeHand(0.046, 0.005, 0.009, steel, 0.008);
export const secondsHand = makeHand(0.054, 0.0028, 0.0075, red, 0.013);

export const faceCase = new Group();
faceCase.add(disk(0.093, 0.014, -0.012, dark), disk(0.076, 0.010, -0.005, steel));
faceCase.add(ring(0.076, 0.009, 0.018, steel), ring(0.078, 0.007, 0.009, brass));
for (const z of [-0.076, 0.076]) {
  for (const x of [-0.045, 0.045]) {
    const lug = new Mesh(new BoxGeometry(0.016, 0.018, 0.028), steel);
    lug.position.set(x, 0.012, z);
    faceCase.add(lug);
  }
}

export const activePartHalo = new Group();
const halo = new Mesh(
  new RingGeometry(0.085, 0.089, 48),
  new MeshBasicMaterial({ color: 0xe8bb69, transparent: true, opacity: 0.8, depthWrite: false }),
);
halo.rotation.x = -Math.PI / 2;
activePartHalo.add(halo);

export const openMovement = automaticMovement.clone();
const balance = new Group();
balance.name = 'Balance Wheel';
balance.position.set(-0.024, 0.034, 0.022);
balance.add(ring(0.013, 0.002, 0, brass));
const spoke = new Mesh(new BoxGeometry(0.024, 0.002, 0.002), brass);
balance.add(spoke, disk(0.003, 0.003, 0, red));
openMovement.add(balance, ring(0.0605, 0.0012, 0.024, polished));
for (const [x, z] of [[-0.041, 0.033], [0.042, 0.027], [0.028, -0.046]]) {
  const bearing = disk(0.0045, 0.002, 0.026, jewel);
  bearing.position.x = x;
  bearing.position.z = z;
  openMovement.add(bearing);
}

const movementDetail = new Group();
movementDetail.name = 'Quality Detail Bridge Fasteners';
const screwHeads = new InstancedMesh(new CylinderGeometry(0.0032, 0.0032, 0.0021, 12), polished, 6);
const slots = new InstancedMesh(new BoxGeometry(0.0048, 0.0005, 0.00065), dark, 6);
const screwPose = new Object3D();
for (let i = 0; i < 6; i++) {
  const a = i * Math.PI / 3 + 0.25;
  screwPose.position.set(Math.cos(a) * 0.055, 0.027, Math.sin(a) * 0.055);
  screwPose.rotation.y = a;
  screwPose.updateMatrix();
  screwHeads.setMatrixAt(i, screwPose.matrix);
  screwPose.position.y += 0.0013;
  screwPose.updateMatrix();
  slots.setMatrixAt(i, screwPose.matrix);
}
movementDetail.add(screwHeads, slots, ring(0.042, 0.0011, 0.024, steel, Math.PI * 1.18));
openMovement.add(movementDetail);

export const openDial = watchDial.clone();
openDial.remove(openDial.children[0]);
openDial.add(disk(0.065, 0.004, 0.002, crystal));
openDial.add(ring(0.056, 0.007, 0.002, navy), ring(0.048, 0.0008, 0.006, brass));
const minuteTrack = new InstancedMesh(new BoxGeometry(0.0008, 0.001, 0.0028), ivory, 48);
const tickPose = new Object3D();
for (let mark = 0, index = 0; mark < 60; mark++) {
  if (mark % 5 === 0) continue;
  const angle = mark * Math.PI / 30;
  tickPose.position.set(Math.sin(angle) * 0.061, 0.0061, -Math.cos(angle) * 0.061);
  tickPose.rotation.y = -angle;
  tickPose.updateMatrix();
  minuteTrack.setMatrixAt(index++, tickPose.matrix);
}
openDial.add(minuteTrack);
const numerals = new Group();
numerals.name = 'Quality Detail Roman Indices';
const numeralBars = new InstancedMesh(new BoxGeometry(0.0009, 0.00055, 0.0065), ivory, 7);
const numeralPose = new Object3D();
const strokes = [
  [-0.005, -0.043, 0.48], [-0.005, -0.043, -0.48], [-0.0003, -0.043, 0],
  [0.0025, -0.043, 0], [-0.002, 0.043, 0.35], [0, 0.043, -0.35], [0.004, 0.043, 0],
];
strokes.forEach(([x, z, yaw], index) => {
  numeralPose.position.set(x, 0.007, z);
  numeralPose.rotation.y = yaw;
  numeralPose.updateMatrix();
  numeralBars.setMatrixAt(index, numeralPose.matrix);
});
numerals.add(numeralBars);
openDial.add(numerals);

export const openCase = new Group();
openCase.add(...faceCase.children.slice(2).map((child) => child.clone()));
openCase.add(
  ring(0.075, 0.006, -0.004, steel),
  ring(0.075, 0.0025, 0.026, polished),
  new Mesh(new CylinderGeometry(0.079, 0.079, 0.018, 48, 1, true), steel),
);
const port = ring(0.008, 0.0025, 0, dark);
port.rotation.set(0, Math.PI / 2, 0);
port.position.set(0.085, 0.016, 0);
openCase.add(port);
const caseDetail = new Group();
caseDetail.name = 'Quality Detail Case Shoulders';
caseDetail.add(ring(0.079, 0.001, 0.009, polished), ring(0.074, 0.0014, -0.010, brass));
openCase.add(caseDetail);
const inspectionGrip = new Mesh(
  new SphereGeometry(0.091, 16, 10),
  new MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
);
inspectionGrip.name = 'Inspection Grip';
inspectionGrip.position.y = 0.024;
inspectionGrip.visible = false;
openCase.add(inspectionGrip);

function pickupCollar(radius: number, y: number) {
  const collar = disk(radius, 0.018, y, gripMaterial);
  collar.name = 'Pickup Collar';
  return collar;
}

export const windingCrown = new Group();
const stem = disk(0.004, 0.037, 0, steel);
stem.rotation.z = -Math.PI / 2;
stem.position.x = -0.024;
const knob = disk(0.023, 0.018, 0, brass);
knob.rotation.z = -Math.PI / 2;
windingCrown.add(stem, knob, pickupCollar(0.048, 0.004));
const knurl = new InstancedMesh(new BoxGeometry(0.016, 0.004, 0.003), steel, 16);
const flutePose = new Object3D();
for (let i = 0; i < 16; i++) {
  const angle = i * Math.PI / 8;
  flutePose.position.set(0, Math.cos(angle) * 0.023, Math.sin(angle) * 0.023);
  flutePose.rotation.x = angle;
  flutePose.updateMatrix();
  knurl.setMatrixAt(i, flutePose.matrix);
}

windingCrown.add(knurl);

export const exhibitionBack = new Group();
exhibitionBack.add(pickupCollar(0.026, 0.011), ring(0.065, 0.009, 0, steel), disk(0.059, 0.004, 0, crystal), ring(0.067, 0.001, -0.0085, brass));
for (let i = 0; i < 6; i++) {
  const angle = i * Math.PI / 3;
  const notch = disk(0.003, 0.003, -0.009, brass);
  notch.position.x = Math.cos(angle) * 0.066;
  notch.position.z = Math.sin(angle) * 0.066;
  exhibitionBack.add(notch);
}

// The pivot is the first link's center. Local +Z extends away from the lugs.
export const braceletSection = new Group();
braceletSection.add(pickupCollar(0.028, 0.012));
function linkGeometry(width: number, height: number, depth: number) {
  const inset = 0.0018;
  const x = width / 2 - inset;
  const y = height / 2 - inset;
  const profile = new Shape();
  profile.moveTo(-x, -y);
  profile.lineTo(x, -y);
  profile.lineTo(x, y);
  profile.lineTo(-x, y);
  profile.closePath();
  return new ExtrudeGeometry(profile, {
    depth: depth - 2 * inset, bevelEnabled: true, bevelSize: inset,
    bevelThickness: inset, bevelSegments: 2, steps: 1, curveSegments: 1,
  }).translate(0, 0, -depth / 2 + inset);
}
const sideLinks = new InstancedMesh(linkGeometry(0.094, 0.018, 0.022), steel, 5);
const centerLinks = new InstancedMesh(linkGeometry(0.043, 0.019, 0.021), polished, 5);
const linkPose = new Object3D();
for (let i = 0; i < 5; i++) {
  linkPose.position.set(0, -0.0015 * i ** 2, i * 0.024);
  linkPose.scale.x = 1 - i * 0.043;
  linkPose.rotation.x = 0.11 * i;
  linkPose.updateMatrix();
  sideLinks.setMatrixAt(i, linkPose.matrix);
  linkPose.position.y += 0.001;
  linkPose.updateMatrix();
  centerLinks.setMatrixAt(i, linkPose.matrix);
}
braceletSection.add(sideLinks, centerLinks);
