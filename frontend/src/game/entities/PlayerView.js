import { PLAYER_RADIUS } from '../config';

/** Pure visuals. It holds no game rules and only draws what the server says. */
export default class PlayerView {
  constructor(scene, isLocal) {
    const color = isLocal ? 0x4da3ff : 0xff6b4d;
    this.body = scene.add.circle(0, 0, PLAYER_RADIUS, color).setStrokeStyle(3, 0xffffff);
    this.gun = scene.add.rectangle(0, 0, 30, 6, 0xffffff).setOrigin(0, 0.5);
  }

  get x() { return this.body.x; }
  get y() { return this.body.y; }

  setState(x, y, aimAngle) {
    this.body.setPosition(x, y);
    this.gun.setPosition(x, y);
    this.gun.rotation = aimAngle;
  }

  destroy() {
    this.body.destroy();
    this.gun.destroy();
  }
}