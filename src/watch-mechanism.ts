import { AudioUtils, Entity, Object3D, Quaternion, Vector3 } from '@iwsdk/core';

const GEAR_RATES = [1.4, -1.52, 2.08];
const HAND_PERIODS = [43200, 3600, 60];
const SPINDLE_AXIS = new Vector3(0, 1, 0);

export class WatchMechanism {
  private readonly gears: Object3D[];
  private readonly balance: Object3D;
  private readonly hands: Object3D[];
  private readonly handSeats = [new Quaternion(), new Quaternion(), new Quaternion()];
  private readonly handTurn = new Quaternion();
  private gearTime = 0;
  private runningTime = 0;
  private nextTick = 1;

  constructor(movement: Object3D, hands: Object3D[], private readonly tick: Entity) {
    this.gears = [1, 2, 3].map((index) => movement.getObjectByName(`Watch Gear ${index}`)!);
    this.balance = movement.getObjectByName('Balance Wheel')!;
    this.hands = hands;
  }

  start(): void {
    this.hands.forEach((hand, index) => { this.handSeats[index].copy(hand.quaternion); });
    AudioUtils.play(this.tick);
  }

  update(delta: number, winding: number, running: boolean): void {
    this.gearTime += delta * winding;
    this.gears.forEach((gear, index) => {
      gear.rotation.y = this.gearTime * GEAR_RATES[index];
    });
    this.balance.rotation.y = Math.sin(this.gearTime * 13) * 0.66 * winding;
    if (!running) return;
    this.runningTime += delta;
    this.hands.forEach((hand, index) => {
      const angle = -this.runningTime * Math.PI * 2 / HAND_PERIODS[index];
      hand.quaternion.copy(this.handSeats[index]).multiply(this.handTurn.setFromAxisAngle(SPINDLE_AXIS, angle));
    });
    if (this.runningTime >= this.nextTick) {
      this.nextTick = Math.floor(this.runningTime) + 1;
      AudioUtils.play(this.tick);
    }
  }

  reset(): void {
    this.gearTime = 0;
    this.runningTime = 0;
    this.nextTick = 1;
    this.gears.forEach((gear) => { gear.rotation.y = 0; });
    this.balance.rotation.y = 0;
    AudioUtils.stop(this.tick);
  }
}
