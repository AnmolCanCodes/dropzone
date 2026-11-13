import Phaser from 'phaser';
import { PLAYER_RADIUS } from '../config';

export default class RemotePlayer {
  constructor(scene, id, x, y, aimAngle = 0) {
    this.id = id;
    this.body = scene.add.circle(x, y, PLAYER_RADIUS, 0xff6b4d).setStrokeStyle(3, 0xffffff);
    this.gun = scene.add.rectangle(x, y, 30, 6, 0xffffff).setOrigin(0, 0.5);
    this.targetX = x;
    this.targetY = y;
    this.gun.rotation = aimAngle;
  }

  setTarget(x, y, aimAngle) {
    this.targetX = x;
    this.targetY = y;
    this.gun.rotation = aimAngle;
  }

  // Smoothly glide toward the last received position (updates arrive only ~20x/sec)
  update(dt) {
    const t = 1 - Math.exp(-15 * dt);
    this.body.x = Phaser.Math.Linear(this.body.x, this.targetX, t);
    this.body.y = Phaser.Math.Linear(this.body.y, this.targetY, t);
    this.gun.setPosition(this.body.x, this.body.y);
  }

  destroy() {
    this.body.destroy();
    this.gun.destroy();
  }
}