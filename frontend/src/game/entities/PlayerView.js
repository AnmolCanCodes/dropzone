import { PLAYER_RADIUS, PLAYER_MAX_HEALTH } from '../config';

const BAR_WIDTH = 44;
const BAR_OFFSET_Y = PLAYER_RADIUS + 14;

/** Pure visuals. It holds no game rules and only draws what the server says. */
export default class PlayerView {
  constructor(scene, isLocal) {
    const color = isLocal ? 0x4da3ff : 0xff6b4d;
    this.body = scene.add.circle(0, 0, PLAYER_RADIUS, color).setStrokeStyle(3, 0xffffff);
    this.gun = scene.add.rectangle(0, 0, 30, 6, 0xffffff).setOrigin(0, 0.5);
    this.barBack = scene.add.rectangle(0, 0, BAR_WIDTH, 6, 0x000000, 0.6);
    this.barFill = scene.add.rectangle(0, 0, BAR_WIDTH, 6, 0x6bd66b).setOrigin(0, 0.5);
  }

  get x() { return this.body.x; }
  get y() { return this.body.y; }

  setState(x, y, aimAngle) {
    this.body.setPosition(x, y);
    this.gun.setPosition(x, y);
    this.gun.rotation = aimAngle;
    this.barBack.setPosition(x, y - BAR_OFFSET_Y);
    this.barFill.setPosition(x - BAR_WIDTH / 2, y - BAR_OFFSET_Y);
  }

  setStatus({ alive, health }) {
    this.body.setAlpha(alive ? 1 : 0.3);
    this.gun.setVisible(alive);
    this.barBack.setVisible(alive);
    this.barFill.setVisible(alive);
    this.barFill.setScale(Math.max(0.001, health / PLAYER_MAX_HEALTH), 1);
  }

  destroy() {
    this.body.destroy();
    this.gun.destroy();
    this.barBack.destroy();
    this.barFill.destroy();
  }
}