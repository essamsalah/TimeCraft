import {
  AudioUtils, createSystem, Entity, Grabbed, Mesh, MeshBasicMaterial, Object3D,
  OneHandGrabbable, Quaternion, RayInteractable, Vector3, VisibilityState,
} from '@iwsdk/core';
import { AssemblyPart } from './assembly-part.js';

const ALIGN_RADIUS = 0.049;
const ALIGN_ANGLE = Math.PI / 5;
const SNAP_DURATION = 0.22;
const PULSE_DURATION = 0.48;
const IDLE_COLOR = 0x65b8db;
const READY_COLOR = 0x79f2b1;

export class AssemblySystem extends createSystem({
  held: { required: [AssemblyPart, Grabbed] },
}) {
  private part!: Entity;
  private fixture!: Entity;
  private indicator!: Object3D;
  private light!: MeshBasicMaterial;
  private home = new Vector3();
  private homeRotation = new Quaternion();
  private target = new Vector3();
  private targetRotation = new Quaternion();
  private worldPosition = new Vector3();
  private worldRotation = new Quaternion();
  private start = new Vector3();
  private startRotation = new Quaternion();
  private finish = new Vector3();
  private finishRotation = new Quaternion();
  private wasHeld = false;
  private state: 'idle' | 'returning' | 'snapping' | 'seated' = 'idle';
  private elapsed = 0;

  init(): void {
    this.part = this.world.requireSceneEntity('watch-movement');
    this.fixture = this.world.requireSceneEntity('watch-case');
    this.indicator = this.world.requireSceneObject('alignment-ring');
    const surface = this.indicator.getObjectByName('Indicator Surface') as Mesh;
    const original = surface.material as MeshBasicMaterial;
    this.light = original.clone();
    surface.material = this.light;
    this.cleanupFuncs.push(() => {
      surface.material = original;
      this.light.dispose();
    });

    const part = this.part.object3D!;
    const fixture = this.fixture.object3D!;
    this.home.copy(part.position);
    this.homeRotation.copy(part.quaternion);
    fixture.getWorldPosition(this.target);
    fixture.getWorldQuaternion(this.targetRotation);
    this.light.opacity = 0.35;
  }

  update(delta: number): void {
    const part = this.part.object3D!;
    const held = this.queries.held.entities.has(this.part);
    if (held) {
      this.wasHeld = true;
      this.state = 'idle';
      this.showAlignment(this.isAligned(part));
      return;
    }

    if (this.wasHeld) {
      this.wasHeld = false;
      const visible = this.visibilityState.peek() === VisibilityState.Visible;
      const shouldSnap = visible && this.isAligned(part);
      this.showAlignment(shouldSnap);
      this.start.copy(part.position);
      this.startRotation.copy(part.quaternion);
      this.finish.copy(shouldSnap ? this.target : this.home);
      this.finishRotation.copy(shouldSnap ? this.targetRotation : this.homeRotation);
      if (shouldSnap && part.parent) {
        part.parent.worldToLocal(this.finish);
        part.parent.getWorldQuaternion(this.worldRotation).invert();
        this.finishRotation.premultiply(this.worldRotation);
      }
      this.part.removeComponent(OneHandGrabbable).removeComponent(RayInteractable);
      this.state = shouldSnap ? 'snapping' : 'returning';
      this.elapsed = 0;
    }

    if (this.state === 'snapping' || this.state === 'returning') {
      this.elapsed += delta;
      const progress = Math.min(1, this.elapsed / SNAP_DURATION);
      const eased = 1 - (1 - progress) ** 3;
      part.position.lerpVectors(this.start, this.finish, eased);
      part.quaternion.slerpQuaternions(this.startRotation, this.finishRotation, eased);
      if (progress === 1) {
        if (this.state === 'snapping') {
          this.state = 'seated';
          this.part.setValue(AssemblyPart, 'seated', true);
          this.part.setValue(AssemblyPart, 'aligned', false);
          AudioUtils.play(this.fixture);
        } else {
          this.state = 'idle';
          this.part.addComponent(RayInteractable).addComponent(OneHandGrabbable);
        }
        this.elapsed = 0;
      }
    } else if (this.state === 'seated' && this.elapsed < PULSE_DURATION) {
      this.elapsed = Math.min(PULSE_DURATION, this.elapsed + delta);
      const progress = this.elapsed / PULSE_DURATION;
      this.indicator.scale.setScalar(1 + 0.32 * progress);
      this.light.opacity = 0.9 * (1 - progress);
    }
  }

  private isAligned(part: Object3D): boolean {
    return part.getWorldPosition(this.worldPosition).distanceToSquared(this.target) <= ALIGN_RADIUS ** 2
      && part.getWorldQuaternion(this.worldRotation).angleTo(this.targetRotation) <= ALIGN_ANGLE;
  }

  private showAlignment(aligned: boolean): void {
    if (this.part.getValue(AssemblyPart, 'aligned') === aligned) return;
    this.part.setValue(AssemblyPart, 'aligned', aligned);
    this.light.color.setHex(aligned ? READY_COLOR : IDLE_COLOR);
    this.light.opacity = aligned ? 0.95 : 0.35;
  }
}
