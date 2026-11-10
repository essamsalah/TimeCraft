import {
  AudioUtils, createSystem, Entity, Euler, Grabbed, GrabSystem, Mesh, MeshBasicMaterial,
  Object3D, OneHandGrabbable, PointLight, Quaternion, RayInteractable, UIKit, UIKitMLAsset, Vector3,
  VisibilityState,
} from '@iwsdk/core';
import { AssemblyPart } from './assembly-part.js';
import { WatchProgress } from './watch-progress.js';
import { WatchMechanism } from './watch-mechanism.js';

type Step = {
  id: string;
  title: string;
  height: number;
  yaw: number;
  radius: number;
  press: boolean;
  ring: number;
  fixtureOffset?: [number, number, number];
};

const FACE_STEPS: Step[] = [
  { id: 'watch-dial', title: 'Install the dial', height: 0.036, yaw: 0, radius: 0.050, press: false, ring: 0.76 },
  { id: 'hour-hand', title: 'Fit the hour hand', height: 0.044, yaw: Math.PI / 3, radius: 0.038, press: true, ring: 0.31 },
  { id: 'minute-hand', title: 'Fit the minute hand', height: 0.050, yaw: -Math.PI / 3, radius: 0.038, press: true, ring: 0.31 },
  { id: 'seconds-hand', title: 'Fit the seconds hand', height: 0.056, yaw: -Math.PI * 0.82, radius: 0.042, press: false, ring: 0.38 },
  { id: 'watch-movement', title: 'Seat the watch face', height: 0, yaw: 0, radius: 0.050, press: false, ring: 1 },
];
const FINISH_STEPS: Step[] = [
  { id: 'crown', title: 'Install the crown', height: 0, yaw: 0, radius: 0.042, press: false, ring: 0.29, fixtureOffset: [0.103, 0.016, 0] },
  { id: 'case-back', title: 'Close the case back', height: 0, yaw: 0, radius: 0.048, press: false, ring: 0.83, fixtureOffset: [0, -0.009, 0] },
  { id: 'bracelet-front', title: 'Fit the front bracelet', height: 0, yaw: 0, radius: 0.048, press: false, ring: 0.46, fixtureOffset: [0, 0.012, 0.092] },
  { id: 'bracelet-rear', title: 'Fit the rear bracelet', height: 0, yaw: Math.PI, radius: 0.048, press: false, ring: 0.46, fixtureOffset: [0, 0.012, -0.092] },
];
const PHASE = { assembly: 0, winding: 1, activated: 2, reveal: 3, complete: 4 } as const;
const WIND_RADIANS = Math.PI * 1.65;
const GOLD = 0xe8bb69;
const GREEN = 0x79f2b1;
const PRESS_DEPTH = 0.018;
const TILT_LIMIT = Math.cos(Math.PI / 5);

type Part = {
  entity: Entity;
  object: Object3D;
  home: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  grip?: Object3D;
  parent: Object3D | null;
};

export class WatchAssemblySystem extends createSystem({
  held: { required: [AssemblyPart, Grabbed] },
  grabbed: { required: [Grabbed] },
}) {
  private station?: Object3D;
  private demo?: Object3D;
  private inspectionGrip?: Object3D;
  private brand?: UIKit.Text;
  private demoElapsed = 0;
  private started = true;
  private beginButton?: ReturnType<UIKitMLAsset['requireElementById']>;
  private resetButton?: ReturnType<UIKitMLAsset['requireElementById']>;
  private placeButton?: ReturnType<UIKitMLAsset['requireElementById']>;
  private progressBar?: ReturnType<UIKitMLAsset['requireElementById']>;
  private placeRequested = false;
  private beginRequested = false;
  private inspecting = false;
  private pickup?: Entity;
  private ratchet?: Entity;
  private lastRatchet = 0;
  private direction = new Vector3();
  private crownAxis = new Vector3();
  private steps = FACE_STEPS;
  private parts!: Part[];
  private movement!: Entity;
  private fixture!: Entity;
  private indicator!: Object3D;
  private halo!: Object3D;
  private light!: MeshBasicMaterial;
  private panel!: UIKitMLAsset;
  private panelY = 0;
  private panelScale = 1;
  private title!: UIKit.Text;
  private guidance!: UIKit.Text;
  private stage = 0;
  private motion: 'ready' | 'returning' | 'seating' | 'feedback' | 'presenting' | 'complete' = 'ready';
  private phase: number = PHASE.assembly;
  private mechanism?: WatchMechanism;
  private click?: Entity;
  private windButton?: ReturnType<UIKitMLAsset['requireElementById']>;
  private pendingTurns = 0;
  private winding = 0;
  private lastTwist: number | undefined;
  private crownAngle = 0;
  private crownSeatRotation = new Quaternion();
  private crownSeatPosition = new Vector3();
  private fixtureHome = new Vector3();
  private fixtureHomeRotation = new Quaternion();
  private revealLight?: PointLight;
  private revealElapsed = 0;
  private skipRequested = false;
  private skipButton?: ReturnType<UIKitMLAsset['requireElementById']>;
  private pose = new Euler();
  private fixtureRotation = new Quaternion();
  private seatOffset = new Vector3();
  private seatWorldRotation = new Quaternion();
  private elapsed = 0;
  private wasHeld = false;
  private grabSource?: XRInputSource;
  private pressArmed = false;
  private restartRequested = false;
  private target = new Vector3();
  private targetRotation = new Quaternion();
  private targetWorld = new Vector3();
  private parentRotation = new Quaternion();
  private worldPosition = new Vector3();
  private worldRotation = new Quaternion();
  private up = new Vector3();
  private start = new Vector3();
  private startRotation = new Quaternion();
  private startScale = new Vector3();
  private installedScale = new Vector3(1, 1, 1);

  init(): void {
    this.station = this.world.getSceneObject('station-root');
    this.demo = this.world.getSceneObject('gesture-demo');
    this.pickup = this.world.getSceneEntity('pickup-audio');
    this.ratchet = this.world.getSceneEntity('wind-audio');
    const crown = this.world.getSceneEntity('crown');
    if (crown) this.steps = [...FACE_STEPS, ...FINISH_STEPS];
    this.parts = this.steps.map(({ id }) => {
      const entity = this.world.requireSceneEntity(id);
      const object = entity.object3D!;
      return {
        entity, object, home: object.position.clone(), rotation: object.quaternion.clone(),
        scale: object.scale.clone(), parent: object.parent, grip: object.getObjectByName(id === 'watch-movement' ? 'Face Pickup Collar' : 'Pickup Collar'),
      };
    });
    this.movement = this.world.requireSceneEntity('watch-movement');
    this.fixture = this.world.requireSceneEntity('watch-case');
    const fixtureObject = this.fixture.object3D!;
    this.inspectionGrip = fixtureObject.getObjectByName('Inspection Grip');
    this.fixtureHome.copy(fixtureObject.position);
    this.fixtureHomeRotation.copy(fixtureObject.quaternion);
    if (crown) {
      const tick = this.world.requireSceneEntity('watch-tick');
      this.click = this.world.requireSceneEntity('metal-click');
      const hands = this.parts.slice(1, 4).map((part) => part.object);
      this.mechanism = new WatchMechanism(this.movement.object3D!, hands, tick);
      this.revealLight = new PointLight(0xffdfae, 0, 1.5);
      this.revealLight.position.set(0.15, 1.61, -0.37);
      const lightEntity = this.world.createTransformEntity(this.revealLight, this.world.getSceneEntity('station-root'));
      this.cleanupFuncs.push(() => lightEntity.destroy());
    }
    this.indicator = this.world.requireSceneObject('alignment-ring');
    this.halo = this.world.requireSceneObject('active-part-halo');
    const surface = this.indicator.getObjectByName('Indicator Surface') as Mesh;
    const original = surface.material as MeshBasicMaterial;
    this.light = original.clone();
    surface.material = this.light;

    const panel = this.world.requireSceneObject<UIKitMLAsset>('watch-steps');
    this.panel = panel;
    this.panelY = panel.position.y;
    this.panelScale = panel.scale.x;
    this.title = panel.requireElementById<UIKit.Text>('step');
    this.brand = panel.getElementById<UIKit.Text>('brand') ?? undefined;
    this.guidance = panel.requireElementById<UIKit.Text>('guidance');
    const restart = panel.requireElementById('restart');
    const skip = panel.getElementById('skip');
    const exit = panel.getElementById('exit');
    const requestSkip = () => { if (this.phase === PHASE.reveal) this.skipRequested = true; };
    const exitXR = () => this.world.exitXR();
    this.skipButton = skip ?? undefined;
    skip?.addEventListener('click', requestSkip);
    exit?.addEventListener('click', exitXR);
    this.cleanupFuncs.push(() => {
      skip?.removeEventListener('click', requestSkip);
      exit?.removeEventListener('click', exitXR);
    });
    this.resetButton = restart;
    this.beginButton = panel.getElementById('start') ?? undefined;
    this.placeButton = panel.getElementById('place') ?? undefined;
    this.progressBar = panel.getElementById('progress') ?? undefined;
    const requestBegin = () => { this.beginRequested = true; };
    const requestPlace = () => { this.placeRequested = true; };
    this.beginButton?.addEventListener('click', requestBegin);
    this.placeButton?.addEventListener('click', requestPlace);
    this.cleanupFuncs.push(() => {
      this.beginButton?.removeEventListener('click', requestBegin);
      this.placeButton?.removeEventListener('click', requestPlace);
    });
    const wind = panel.getElementById('wind');
    const requestWind = () => { if (this.phase === PHASE.winding) this.pendingTurns++; };
    if (wind) {
      this.windButton = wind;
      wind.addEventListener('click', requestWind);
      this.cleanupFuncs.push(() => wind.removeEventListener('click', requestWind));
    }
    const requestRestart = () => { this.restartRequested = true; };
    restart.addEventListener('click', requestRestart);
    this.cleanupFuncs.push(() => {
      restart.removeEventListener('click', requestRestart);
      surface.material = original;
      this.light.dispose();
    });
    if (this.station) this.showIntro();
    else this.prepareStep();
  }

  update(delta: number): void {
    if (this.restartRequested) {
      this.restartRequested = false;
      this.restart();
      return;
    }
    if (this.placeRequested) {
      this.placeRequested = false;
      if (this.phase === PHASE.assembly && this.motion === 'ready' && !this.wasHeld &&
          this.queries.grabbed.entities.size === 0) this.recenter();
    }
    if (!this.started) {
      if (this.beginRequested) {
        this.beginRequested = false;
        this.started = true;
        this.movement.setValue(WatchProgress, 'started', true);
        if (this.demo) this.demo.visible = false;
        this.beginButton?.setProperties({ display: 'none' });
        this.resetButton?.setProperties({ display: 'flex' });
        this.prepareStep();
      } else {
        this.animateDemo(delta);
      }
      return;
    }
    if (this.phase !== PHASE.assembly) {
      this.updateFirstTick(delta);
      return;
    }
    if (this.motion === 'complete') return;
    if (this.motion === 'presenting') {
      this.updatePresentation(delta);
      return;
    }

    const part = this.parts[this.stage];
    const step = this.steps[this.stage];
    if (this.motion === 'ready') {
      if (this.queries.held.entities.has(part.entity)) {
        this.updateHeld(part, step);
      } else if (this.wasHeld) {
        const visible = this.visibilityState.peek() === VisibilityState.Visible;
        const aligned = this.measureAlignment(part, step);
        this.beginMotion(part, visible && !step.press && aligned && this.grabSourceConnected());
      }
      return;
    }

    this.elapsed += delta;
    if (this.motion === 'feedback') {
      const duration = step.id === 'watch-movement' ? 0.75 : 0.44;
      const progress = Math.min(1, this.elapsed / duration);
      this.indicator.scale.setScalar(step.ring * (1 + 0.36 * progress));
      this.light.opacity = 0.95 * (1 - progress);
      if (progress === 1) this.advance();
      return;
    }

    const seating = this.motion === 'seating';
    const progress = Math.min(1, this.elapsed / (seating ? 0.24 : 0.30));
    const eased = 1 - (1 - progress) ** 3;
    part.object.position.lerpVectors(this.start, seating ? this.target : part.home, eased);
    part.object.quaternion.slerpQuaternions(this.startRotation, seating ? this.targetRotation : part.rotation, eased);
    part.object.scale.lerpVectors(this.startScale, seating ? this.installedScale : part.scale, eased);
    if (progress < 1) return;

    if (seating) {
      if (step.fixtureOffset) this.fixture.object3D!.attach(part.object);
      part.entity.setValue(AssemblyPart, 'seated', true);
      part.entity.setValue(AssemblyPart, 'aligned', false);
      this.movement.setValue(WatchProgress, 'installed', this.stage + 1);
      this.progressBar?.setProperties({ width: 320 * (this.stage + 1) / this.steps.length });
      this.motion = 'feedback';
      this.elapsed = 0;
      AudioUtils.play(this.click ?? this.fixture);
      this.guidance.setProperties({ text: step.id === 'watch-movement' ? 'The face is seated in the case.' : 'Seated securely.' });
    } else {
      this.motion = 'ready';
      this.enable(part);
      this.halo.visible = true;
    }
  }

  private updateHeld(part: Part, step: Step): void {
    if (!this.wasHeld) {
      this.wasHeld = true;
      const hand = this.world.getSystem(GrabSystem)?.getHolderHand(part.entity);
      this.grabSource = undefined;
      for (const source of this.world.xrSession?.inputSources ?? []) {
        if (source.handedness !== hand) continue;
        this.grabSource = source;
        if (source.hand) break;
      }
      if (this.pickup) AudioUtils.play(this.pickup);
      this.halo.visible = false;
      this.guidance.setProperties({ text: step.press ? 'Hover the hub over the spindle.' : 'Bring the part over the circular guide.' });
    }
    if (!this.grabSourceConnected()) {
      this.beginMotion(part, false);
      return;
    }
    const aligned = this.measureAlignment(part, step);
    const height = this.worldPosition.y - this.targetWorld.y;
    if (step.press && aligned && height >= PRESS_DEPTH) this.pressArmed = true;
    if (!aligned) this.pressArmed = false;
    const ready = aligned && (!step.press || this.pressArmed);
    if (ready !== part.entity.getValue(AssemblyPart, 'aligned')) {
      part.entity.setValue(AssemblyPart, 'aligned', ready);
      this.paintGuide(ready);
      this.guidance.setProperties({ text: ready
        ? step.press ? 'Lower the hub while holding the pinch.' : 'Aligned. Release to seat.'
        : step.press ? 'Hover the hub over the spindle.' : 'Move over the guide and keep the part flat.' });
    }
    if (step.press && ready && height < PRESS_DEPTH &&
        this.visibilityState.peek() === VisibilityState.Visible) {
      this.beginMotion(part, true);
    }
  }

  private grabSourceConnected(): boolean {
    const source = this.grabSource;
    if (!source) return false;
    for (const connected of this.world.xrSession?.inputSources ?? []) {
      if (connected === source) return true;
    }
    return false;
  }

  private measureAlignment(part: Part, step: Step): boolean {
    part.object.getWorldPosition(this.worldPosition);
    part.object.getWorldQuaternion(this.worldRotation);
    const x = this.worldPosition.x - this.targetWorld.x;
    const y = this.worldPosition.y - this.targetWorld.y;
    const z = this.worldPosition.z - this.targetWorld.z;
    const angleOK = step.id === 'watch-movement'
      ? this.worldRotation.angleTo(this.seatWorldRotation) <= Math.PI / 5
      : step.id === 'crown'
        ? this.up.set(1, 0, 0).applyQuaternion(this.worldRotation).dot(this.crownAxis.set(1, 0, 0).applyQuaternion(this.seatWorldRotation)) >= TILT_LIMIT
        : this.up.set(0, 1, 0).applyQuaternion(this.worldRotation).y >= TILT_LIMIT;
    return angleOK && x * x + z * z <= (step.radius * (this.station ? 1.12 : 1)) ** 2 && y >= -0.016 && y <= 0.065;
  }

  private beginMotion(part: Part, seat: boolean): void {
    this.motion = seat ? 'seating' : 'returning';
    this.wasHeld = false;
    this.grabSource = undefined;
    this.pressArmed = false;
    this.elapsed = 0;
    this.start.copy(part.object.position);
    this.startRotation.copy(part.object.quaternion);
    this.startScale.copy(part.object.scale);
    this.disable(part);
    if (seat && part.grip) part.grip.visible = false;
    part.entity.setValue(AssemblyPart, 'aligned', seat);
    this.paintGuide(seat);
    const hint = this.steps[this.stage].press ? 'Hover, then lower while pinching.' : 'Release when the guide turns green.';
    this.guidance.setProperties({ text: seat ? 'Seating...' : 'Back in the tray position. ' + hint });
    if (!seat && this.steps[this.stage].id === 'watch-movement') {
      this.guidance.setProperties({ text: 'Back on the holder. Release over the case when green.' });
    }
  }

  private advance(): void {
    const seated = this.steps[this.stage].id;
    this.stage++;
    if (seated === 'crown' || seated === 'case-back') {
      this.motion = 'presenting';
      this.elapsed = 0;
      this.indicator.visible = false;
      this.guidance.setProperties({ text: seated === 'crown' ? 'Turning the watch over.' : 'Securing the back, then turning face up.' });
      return;
    }
    if (this.stage < this.steps.length) {
      this.prepareStep();
      return;
    }
    if (this.mechanism) {
      this.beginWinding();
      return;
    }
    this.motion = 'complete';
    this.title.setProperties({ text: '5 / 5   Watch face complete' });
    this.guidance.setProperties({ text: 'Movement, dial and three hands are in the case.' });
  }

  private prepareStep(): void {
    const step = this.steps[this.stage];
    const part = this.parts[this.stage];
    this.motion = 'ready';
    this.wasHeld = false;
    this.grabSource = undefined;
    this.pressArmed = false;
    this.target.set(0, step.height, 0);
    this.targetRotation.setFromEuler(this.pose.set(0, step.yaw, 0, 'XYZ'));
    if (step.id === 'watch-movement' || step.fixtureOffset) {
      const fixture = this.fixture.object3D!;
      this.seatOffset.set(...(step.fixtureOffset ?? [0, 0, 0]));
      this.targetWorld.copy(this.seatOffset);
      fixture.localToWorld(this.targetWorld);
      this.target.copy(this.targetWorld);
      fixture.getWorldQuaternion(this.seatWorldRotation).multiply(this.targetRotation);
      this.targetRotation.copy(this.seatWorldRotation);
      if (part.object.parent) {
        part.object.parent.worldToLocal(this.target);
        this.targetRotation.premultiply(part.object.parent.getWorldQuaternion(this.parentRotation).invert());
      }
    } else {
      this.targetWorld.copy(this.target);
      this.movement.object3D!.localToWorld(this.targetWorld);
    }
    this.indicator.visible = true;
    this.indicator.position.copy(this.targetWorld);
    this.indicator.parent?.worldToLocal(this.indicator.position);
    this.indicator.position.y += 0.005;
    this.indicator.rotation.z = step.id === 'crown' ? Math.PI / 2 : 0;
    this.indicator.scale.setScalar(step.ring);
    this.paintGuide(false);
    if (step.id === 'watch-movement' && part.grip) part.grip.visible = true;
    this.parts.slice(FACE_STEPS.length).forEach((entry, index) => {
      const partStage = index + FACE_STEPS.length;
      entry.object.visible = partStage <= this.stage ||
        (step.id === 'bracelet-front' && partStage === this.stage + 1);
    });
    this.placeHalo(part.grip ?? part.object);
    this.halo.position.y += 0.001;
    this.halo.scale.setScalar(part.grip ? 0.53 : 0.88);
    this.halo.visible = true;
    this.title.setProperties({ text: `${this.stage + 1} / ${this.steps.length}   ${step.title}` });
    this.guidance.setProperties({ text: step.id === 'watch-movement'
      ? 'Pinch the gold tab and lift the face into the case.'
      : step.press ? 'Pinch the highlighted hand by its hub.'
      : step.id === 'crown' ? 'Point the stem into the side opening.'
      : step.id === 'case-back' ? 'Pinch the back and release over the opening.'
      : step.fixtureOffset ? 'Pinch the first link and align it with the lugs.'
      : step.id === 'watch-dial' ? 'Pick up the dial. Release over the green guide.' : 'Pinch the highlighted part.' });
    if (!part.entity.hasComponent(OneHandGrabbable)) this.enable(part);
  }

  private updatePresentation(delta: number): void {
    const fixture = this.fixture.object3D!;
    const exposingBack = this.steps[this.stage].id === 'case-back';
    this.elapsed += delta;
    const lockTime = exposingBack ? 0 : 0.42;
    if (this.elapsed < lockTime) {
      const back = this.parts[this.stage - 1].object;
      back.rotation.y = Math.PI / 6 * (1 - (1 - this.elapsed / lockTime) ** 2);
      return;
    }
    const progress = Math.min(1, (this.elapsed - lockTime) / 0.78);
    const eased = progress ** 2 * (3 - 2 * progress);
    const flip = exposingBack ? eased : 1 - eased;
    fixture.position.copy(this.fixtureHome).y += 0.128 * flip + Math.sin(progress * Math.PI) * 0.06;
    fixture.quaternion.copy(this.fixtureHomeRotation).multiply(
      this.fixtureRotation.setFromEuler(this.pose.set(0, 0, Math.PI * flip, 'XYZ')),
    );
    if (progress === 1) this.prepareStep();
  }

  private beginWinding(): void {
    const crown = this.parts[FACE_STEPS.length];
    this.crownSeatPosition.copy(crown.object.position);
    this.crownSeatRotation.copy(crown.object.quaternion);
    this.crownAngle = 0;
    if (crown.grip) crown.grip.visible = true;
    this.setPhase(PHASE.winding);
    crown.entity.addComponent(RayInteractable).addComponent(OneHandGrabbable, { translate: false });
    this.windButton?.setProperties({ display: 'flex' });
    this.placeButton?.setProperties({ display: 'none' });
    this.progressBar?.setProperties({ width: 0 });
    this.lastRatchet = 0;
    this.title.setProperties({ text: 'Winding   0%' });
    this.guidance.setProperties({ text: 'Wind your watch to bring it to life.' });
    this.placeHalo(crown.object);
    this.halo.scale.setScalar(0.41);
    this.halo.visible = true;
    this.indicator.visible = false;
  }

  private updateFirstTick(delta: number): void {
    if (this.phase === PHASE.winding) {
      this.updateWinding();
      this.mechanism?.update(delta, this.winding, false);
      return;
    }
    this.mechanism?.update(delta, 1, true);
    if (this.phase === PHASE.complete && this.queries.grabbed.entities.has(this.fixture)) this.inspecting = true;
    if (this.inspecting) return;
    this.revealElapsed += delta;
    if (this.phase === PHASE.activated) {
      if (this.revealElapsed < 0.45) return;
      this.revealElapsed = 0;
      this.setPhase(PHASE.reveal);
      this.skipButton?.setProperties({ display: 'flex' });
    }
    const fixture = this.fixture.object3D!;
    const lift = Math.min(1, this.revealElapsed / 1.6);
    const eased = lift ** 2 * (3 - 2 * lift);
    const turn = Math.max(0, this.revealElapsed - 0.65) * 0.94;
    fixture.position.copy(this.fixtureHome);
    fixture.position.x += 0.18 * eased;
    fixture.position.y += 0.185 * eased;
    fixture.position.z -= 0.085 * eased;
    fixture.quaternion.setFromEuler(this.pose.set(
      (0.72 + 0.45 * Math.sin(turn)) * eased, turn, 0.12 * Math.sin(turn), 'YXZ',
    ));
    this.panel.position.y = this.panelY + 0.19 * eased;
    this.panel.scale.setScalar(this.panelScale * (1 - 0.07 * eased));
    if (this.revealLight) this.revealLight.intensity = 0.42 * eased;
    if (this.phase === PHASE.reveal && (turn >= Math.PI * 2 || (this.skipRequested && lift === 1))) {
      this.setPhase(PHASE.complete);
      this.skipButton?.setProperties({ display: 'none' });
      if (this.skipRequested) this.inspecting = true;
      if (this.station) {
        if (this.inspectionGrip) this.inspectionGrip.visible = true;
        this.fixture.addComponent(RayInteractable).addComponent(OneHandGrabbable, { translate: false });
      }
      this.guidance.setProperties({ text: this.station ? 'Pinch the case to turn it. Restart to build again.' : 'Inspect the turning watch. Restart to build again.' });
    }
  }

  private updateWinding(): void {
    const crown = this.parts[FACE_STEPS.length];
    const held = this.queries.held.entities.has(crown.entity);
    let turn = 0;
    if (held) {
      const relative = this.worldRotation.copy(this.crownSeatRotation).invert().multiply(crown.object.quaternion);
      const twist = 2 * Math.atan2(relative.x, relative.w);
      if (this.lastTwist !== undefined) {
        const difference = twist - this.lastTwist;
        turn = Math.min(0.32, Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference))));
      }
      this.lastTwist = twist;
    } else {
      this.lastTwist = undefined;
    }
    const fallback = this.pendingTurns;
    this.pendingTurns = 0;
    turn += fallback * WIND_RADIANS / 5;
    this.crownAngle += turn;
    if (!held) {
      crown.object.position.copy(this.crownSeatPosition);
      crown.object.quaternion.copy(this.crownSeatRotation).multiply(
        this.worldRotation.setFromEuler(this.pose.set(this.crownAngle, 0, 0, 'XYZ')),
      );
    }
    if (turn < 0.0001) return;
    this.winding = Math.min(1, this.winding + turn / WIND_RADIANS);
    this.movement.setValue(WatchProgress, 'winding', this.winding);
    this.progressBar?.setProperties({ width: 320 * this.winding });
    this.title.setProperties({ text: `Winding   ${Math.round(this.winding * 100)}%` });
    const ratchetMark = Math.floor(this.winding * 10);
    if (ratchetMark > this.lastRatchet && this.ratchet) AudioUtils.play(this.ratchet);
    this.lastRatchet = ratchetMark;
    if (this.winding < 0.9999) return;

    this.winding = 1;
    this.movement.setValue(WatchProgress, 'winding', 1);
    this.disable(crown);
    if (crown.grip) crown.grip.visible = false;
    crown.object.position.copy(this.crownSeatPosition);
    crown.object.quaternion.copy(this.crownSeatRotation);
    this.halo.visible = false;
    this.windButton?.setProperties({ display: 'none' });
    this.mechanism?.start();
    AudioUtils.play(this.fixture);
    this.setPhase(PHASE.activated);
    this.revealElapsed = 0;
    this.brand?.setProperties({ text: 'TIMECRAFT MR / THE FIRST TICK' });
    this.title.setProperties({ text: 'Your Watch Is Alive!' });
    this.guidance.setProperties({ text: 'The first tick. Enjoy the finished watch.' });
  }

  private setPhase(phase: number): void {
    this.phase = phase;
    this.movement.setValue(WatchProgress, 'phase', phase);
  }

  private restart(): void {
    this.mechanism?.reset();
    if (this.queries.grabbed.entities.has(this.fixture)) this.world.getSystem(GrabSystem)?.forceRelease(this.fixture);
    if (this.station) this.fixture.removeComponent(OneHandGrabbable).removeComponent(RayInteractable);
    this.inspecting = false;
    if (this.inspectionGrip) this.inspectionGrip.visible = false;
    if (this.pickup) AudioUtils.stop(this.pickup);
    if (this.ratchet) AudioUtils.stop(this.ratchet);
    if (this.click) AudioUtils.stop(this.click);
    if (this.revealLight) this.revealLight.intensity = 0;
    this.windButton?.setProperties({ display: 'none' });
    this.panel.position.y = this.panelY;
    this.panel.scale.setScalar(this.panelScale);
    this.pendingTurns = 0;
    this.winding = 0;
    this.lastTwist = undefined;
    this.revealElapsed = 0;
    this.skipRequested = false;
    this.skipButton?.setProperties({ display: 'none' });
    this.movement.setValue(WatchProgress, 'winding', 0);
    this.setPhase(PHASE.assembly);
    this.fixture.object3D!.position.copy(this.fixtureHome);
    this.fixture.object3D!.quaternion.copy(this.fixtureHomeRotation);
    for (const part of this.parts) {
      this.disable(part);
      if (part.object.parent !== part.parent) part.parent?.add(part.object);
      part.object.position.copy(part.home);
      part.object.quaternion.copy(part.rotation);
      part.object.scale.copy(part.scale);
      if (part.grip) part.grip.visible = part.entity !== this.movement;
      part.entity.setValue(AssemblyPart, 'aligned', false);
      part.entity.setValue(AssemblyPart, 'seated', false);
    }
    AudioUtils.stop(this.fixture);
    this.movement.setValue(WatchProgress, 'installed', 0);
    this.stage = 0;
    if (this.station) this.showIntro();
    else this.prepareStep();
  }

  private showIntro(): void {
    this.started = false;
    this.movement.setValue(WatchProgress, 'started', false);
    this.motion = 'ready';
    this.wasHeld = false;
    this.demoElapsed = 0;
    this.parts.slice(FACE_STEPS.length).forEach((part) => { part.object.visible = false; });
    this.indicator.visible = false;
    this.halo.visible = false;
    if (this.demo) this.demo.visible = true;
    this.beginButton?.setProperties({ display: 'flex' });
    this.placeButton?.setProperties({ display: 'flex' });
    this.resetButton?.setProperties({ display: 'none' });
    this.progressBar?.setProperties({ width: 0 });
    this.brand?.setProperties({ text: 'TIMECRAFT MR' });
    this.title.setProperties({ text: 'Build a mechanical watch' });
    this.guidance.setProperties({ text: 'Pinch a part, move it to the guide, then release on green.' });
  }

  private animateDemo(delta: number): void {
    if (!this.demo) return;
    this.demoElapsed = (this.demoElapsed + delta) % 3.5;
    const travel = Math.min(1, Math.max(0, (this.demoElapsed - 0.40) / 1.7));
    const eased = travel ** 2 * (3 - 2 * travel);
    this.demo.position.set(0.11 - 0.17 * eased, 1.168 + 0.075 * Math.sin(Math.PI * travel), -0.50);
    this.demo.scale.setScalar(this.demoElapsed > 3.05 ? Math.max(0.01, (3.5 - this.demoElapsed) / 0.45) : 1);
  }

  private recenter(): void {
    if (!this.station || this.visibilityState.peek() !== VisibilityState.Visible) return;
    const head = this.player.head;
    head.getWorldPosition(this.worldPosition);
    head.getWorldQuaternion(this.worldRotation);
    this.direction.set(0, 0, -1).applyQuaternion(this.worldRotation);
    const horizontal = Math.hypot(this.direction.x, this.direction.z);
    if (horizontal > 0.25) this.station.rotation.y = Math.atan2(-this.direction.x, -this.direction.z);
    this.station.position.set(this.worldPosition.x, this.worldPosition.y - 1.60, this.worldPosition.z);
    this.station.updateWorldMatrix(true, true);
    if (this.started) this.prepareStep();
  }

  private placeHalo(object: Object3D): void {
    object.getWorldPosition(this.halo.position);
    this.halo.parent?.worldToLocal(this.halo.position);
  }

  private enable(part: Part): void {
    part.entity.addComponent(RayInteractable).addComponent(OneHandGrabbable);
  }

  private disable(part: Part): void {
    if (this.queries.held.entities.has(part.entity)) {
      this.world.getSystem(GrabSystem)?.forceRelease(part.entity);
    }
    part.entity.removeComponent(OneHandGrabbable).removeComponent(RayInteractable);
  }

  private paintGuide(ready: boolean): void {
    this.light.color.setHex(ready ? GREEN : GOLD);
    this.light.opacity = ready ? 0.95 : 0.46;
  }
}
