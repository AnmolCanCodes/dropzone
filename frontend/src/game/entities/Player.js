import Phaser from "phaser";
import { PLAYER_RADIUS, PLAYER_SPEED, WORLD_WIDTH, WORLD_HEIGHT } from "../config";

export default class Player {
  constructor(scene, x, y) {
    this.body = scene.add.circle(x, y, PLAYER_RADIUS, 0x4da3ff).setStrokeStyle(3, 0xffffff);
    this.gun = scene.add.rectangle(x, y, 30, 6, 0xffffff).setOrigin(0, 0.5);
    this.health = 100;
  }

  get x() { return this.body.x; }
  get y() { return this.body.y; }

  applyInput(input, dt) {
    let dx = (input.movement.right ? 1 : 0) - (input.movement.left ? 1 : 0);
    let dy = (input.movement.down ? 1 : 0) - (input.movement.up ? 1 : 0);

    // Normalize so diagonal movement isn't faster
    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    this.body.x = Phaser.Math.Clamp(this.body.x + dx * PLAYER_SPEED * dt, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    this.body.y = Phaser.Math.Clamp(this.body.y + dy * PLAYER_SPEED * dt, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);

    this.gun.setPosition(this.body.x, this.body.y);
    this.gun.rotation = input.aimAngle;
  }
}